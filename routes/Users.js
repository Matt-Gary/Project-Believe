const express = require('express');
const router = express.Router();
const { Users, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const crypto = require('crypto')
const verifyToken = require('../middleware/verifyToken'); // Import the middleware
const { sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail} = require("../mailtrap/emails.js")
const multer = require("multer")
const path = require('path')
const fs = require('fs') // To handle file system operations
const stream = require('stream')
const { google } = require('googleapis'); //google DRIVE API
const sharp = require('sharp') //resizing photos
const authorize = require('../middleware/authorize');
const { sendWhatsappMessage } = require('../middleware/whatsapp');
const axios = require('axios'); 
require('dotenv').config();


// Multer configuration
//<form action="/users/update-photo" method="POST" enctype="multipart/form-data">
//<input type="file" name="profilePhoto" accept="image/*">
//<button type="submit">Upload Profile Photo</button>
//</form>
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/ProfileImages') //where we want to store this images
//     },

//     filename: (req, file, cb) => { //we need to specify the name, adding the date of adding file and the file name
//         console.log(file) 
//         cb(null, Date.now() + path.extname(file.originalname)) //cb= call back - the name is replace with current date + original name
//     }

//     })

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URL = process.env.REDIRECT_URL

const REFRESH_TOKEN = process.env.REFRESH_TOKEN

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL
)

oauth2Client.setCredentials({refresh_token: REFRESH_TOKEN})

const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
})

const upload = multer({storage: multer.memoryStorage()}) //upload middleware that had object storage determining where we want to store the image, This ensures files are stored as buffer

// Regular expression for email format validation
const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

// Register a new user
router.post("/register", async (req, res) => {
    // Extracting username, password, email, and matricula from the request body
    const { username, password, email, matricula, role, phoneNumber } = req.body;

    // Validate email format before proceeding
    if (!emailRegex.test(email)) {
        return res.status(400).json({error: "Formato de e-mail inválido"})
    }

    // Validate phone number format (must be 11 digits)
    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ error: "Número de telefone inválido. Deve conter 11 dígitos." });
    }

    // Format the phone number to include +55 country code
    const formattedPhoneNumber = `55${phoneNumber}`;

    try {
        //Check if a user with the same email already exists
        const existingUser = await Users.findOne({ where: { email: email } });
        // Check if a user with the same matricula already exists
        const existingMatricula = await Users.findOne({ where: { matricula: matricula } });
        // Validation: Check if matricula is already in use
        if (existingMatricula) {
            return res.status(400).json({error: "Matrícula já é usada"})
        }
        // Validation: Check if the email is already registered
        if (existingUser) {
            return res.status(400).json({ error: "O usuário já existe" });
        }

        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user in the Users table with the provided data
        const user = await Users.create({
            username: username,
            password: hashedPassword, // Storing the hashed password, not the plain text
            matricula: matricula,
            email: email,
            createdAt: Date.now(),
            role: role,
            phoneNumber: formattedPhoneNumber 
        });
        // await sendWelcomeEmail(user.email, user.username)
        
        // Respond with success message
        return res.json("User registered successfully");

    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({ error: "An error occurred while registering the user.", error });
    }
});

// Route to log in an existing user
router.post("/login", async (req, res) => {
    // Extracting email, password, and matricula from the request body
    const { email, password, matricula } = req.body;

    try {
        // Find the user in the database by their email
        const user = await Users.findOne({where: {email}})
        // Validation: Check if the user exists
        if(!user) {
            return res.status(400).json({message: "Credenciais inválidas"})    
        }
        // Compare the provided password with the stored hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password)
        // Validation: Check if the password matches
        if(!isPasswordMatch) {
            return res.status(400).json({message: "Credenciais inválidas"})    
        }
        // Create a JSON Web Token (JWT) for the user
        const token = jwt.sign({
            matricula: user.matricula, 
            email: user.email,
            username: user.username,
            role: user.role, 
            phoneNumber: user.phoneNumber
        },
        process.env.SECRET_KEY, {
            expiresIn: "1h" // Token will expire in 1 hour
        })
        //Set the token in a cookie
        res.cookie("accessToken", token, {
            httpOnly: true, //Prevents JavaScripts access
            secure: true, // Use HTTPS in production
            sameSite: "None", // Prevents CSRF attacks
            maxAge: 3600000 // 1hour
        })
        res.json({token, message: "Login succesfully"})

    } catch (error) {
        console.error("Error logging in:", error)
        res.status(500).json({message: "Server Error"})
    }
})
// Route to log out
router.post("/logout", async (req, res) => {
    //deleting cookie
    res.clearCookie("accessToken")
    res.status(200).json({success: true, message: "Logged out succesfully"})

})
// Route to forgot passworddd
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body
    try {
        const user = await Users.findOne({where: {email}})

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found"})
        }
        //creating token to reset a password
        const resetToken = crypto.randomBytes(20).toString("hex")
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 69 * 1000 //1 hour

        user.resetPasswordCode = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt

        await user.save()
        //send email with a link to reset a password 
        await sendPasswordResetEmail(user.email, `http://localhost:5173/reset-password/${resetToken}`, user.username)

        res.status(200).json({success: true, message: "Password reset link sent to your email"})

    } catch (error) {
        console.log("Error in forgotPassword", error)
        res.status(400).json({success: false, message: error.message})
    }
})
// Reset password route
router.post("/reset-password/", async (req, res) => {
    const { token, password } = req.body;

    try {
      const user = await Users.findOne({
        where: {
          resetPasswordCode: token,
          resetPasswordExpiresAt: { [Op.gt]: Date.now() } // Token must be valid and not expired
        }
      });
        if(!user) {
            return res.status(400).json({success: false, message: "Invalid or expired reset code"})
        }
        //update password
        const hashedPassword = await bcrypt.hash(password, 10)

        user.password = hashedPassword
        user.resetPasswordCode = null 
        user.resetPasswordExpiresAt = null

        await user.save()

        await sendResetSuccessEmail(user.email, user.username)

        res.status(200).json({success: true, message:" Password reset sucessful"})
    } catch (error) {
        console.log("Error in resetPassword", error)
        res.status(400).json({success: false, message: error.message})
    }
})
// New route to get all registered users
router.get("/all-users", verifyToken, authorize(['ADMIN']), async (req, res) => {
    try {
        // Check if the requesting user is an admin
        const requestingUser = await Users.findByPk(req.user.matricula);

        // Fetch all users, excluding sensitive information
        const users = await Users.findAll({
            attributes: ['username', 'email', 'matricula', 'role', 'createdAt', 'updatedAt'],
            where: {
                matricula: {
                    [Op.ne]: req.user.matricula // Exclude the requesting user
                }
            }
        });

        res.json({ users });
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ message: "Server Error" });
    }
});
// Route to get an existing user
router.get("/userByMatricula", verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {
    // Extracting matricula from the request body
    const {matricula} = req.body;
    try {
        // Find the user in the database by their email
        const user = await Users.findOne({where: {matricula}})
        // Validation: Check if the user exists
        if(!user) {
            return res.status(404).json({message: "User not found!"})    
        }
        const user_response = JSON.parse(JSON.stringify(user));
        // Remove o campo indesejado, por exemplo, 'password'
        delete user_response.password;
        return res.status(200).json({user_response})
    } catch (error) {
        console.error("Get User Error in:", error)
        res.status(500).json({message: "Server Error"})
    }
})

// Route to delete an existing user
router.delete("/userByMatricula", verifyToken, authorize(['ADMIN']), async (req, res) => {
    // Extracting matricula from the request body
    const {matricula} = req.body;
    try {
        // Find the user in the database by their email
        const user = await Users.findOne({where: {matricula}})
        // Validation: Check if the user exists
        if(!user) {
            return res.status(404).json({message: "User not found!"})    
        }
        const response = await Users.destroy({where: {matricula: matricula}
        });
        return res.status(200).json({message: "User deleted sucessfully!"})
    } catch (error) {
        console.error("Get User Error in:", error)
        res.status(500).json({message: "Server Error"})
    }
})

// Edit a existent user
router.put("/userUpdateByMatricula", verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {

    const { username, email, matricula } = req.body;

    try {

        if(!(username == null || username.trim().length === 0) && !(email == null || email.trim().length === 0)){
            return res.status(400).json("Field username and email is null or empty!");
        }else if(matricula == null || matricula.trim().length === 0){
            return res.status(400).json("The matricula can't be null or empty!");
        }

        //Get user by matricula
        var userUpdated = await Users.findOne({ where: { matricula: matricula } });
        if(!userUpdated){
            return res.status(400).json("The matricula don't have a user registered!");
        }

        if (!(username == null || username.trim().length === 0)) {
            const existingUsername = await Users.findOne({ where: { username: username } });
            if(existingUsername) {
                console.log("Username already exist!")    
            }else{
                //Update usermame
                userUpdated.username = username
            }
        }

        if (!(email == null || email.trim().length === 0)) {
            const existingEmail = await Users.findOne({ where: { email: email } });
            if(existingEmail) {
                console.log("Email already exist!")    
            }else{
                //Update email
                userUpdated.email = email
            }
        }

        const [response] = await Users.update(
            {
                username: userUpdated.username,
                email: userUpdated.email,
                updatedAt: Date.now()
            },
            {
                where: {
                    matricula: matricula
                }
            }
        );

        return res.status(200).json("User updated successfully!");
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ error: "An error occurred while updating the user." });
    }
});

// Accessible only with a valid JWT token
router.post("/userChangePassword", verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {
    try {
        // Get user body
        const {oldPassword,newPassword} = req.body;

        // Find the user by their matricula from the decoded JWT data
        const user = await Users.findByPk(req.user.matricula)

        // Compare the old password with the stored hashed password
        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password)

        // Verify old and new password!
        if(oldPassword == newPassword){
            return res.status(400).json({message: "The passwords can't be same!"})
        }
        else if(!isPasswordMatch) {
            return res.status(400).json({message: "Old password is wrong!"})    
        }

        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Flow to update password
        const [response] = await Users.update(
            {
                password: hashedPassword,
                updatedAt: Date.now()
            },
            {
                where: {
                    matricula: req.user.matricula
                }
            }
        );

        return res.status(200).json({message: "Update password completed!"})

    } catch (error) {
        console.error("Error fetching user change password:", error)
        res.status(500).json({message: "Server Error"})
    }
})
module.exports = router;

// Protected route to get user info, accessible only with a valid JWT token
router.get("/userinfo", verifyToken, authorize(['ADMIN']), async (req, res) => {
    try {
        // Find the user by their matricula from the decoded JWT data
        const user = await Users.findByPk(req.user.matricula)
        if (!user) {
            return res.status(404).json({message: "User not found"})
        }
        res.json({user})
    } catch (error) {
        console.error("Error fetching user info:", error)
        res.status(500).json({message: "Server Error"})
    }
})

router.post('/update-photo', verifyToken, authorize(['ADMIN', 'USER']), upload.single('image'), async (req, res) => {
    const userMatricula = req.user.matricula;

    // Ensure an image is uploaded
    if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
    }

    try {
        // Find the user by matricula and check for an existing profile photo
        const user = await Users.findOne({ where: { matricula: userMatricula } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // If the user already has a profile photo, attempt to delete it from Google Drive
        if (user.profilePhoto) {
            try {
                await drive.files.delete({ fileId: user.profilePhoto });
                console.log("Old profile photo deleted successfully from Google Drive:", user.profilePhoto);
            } catch (deleteError) {
                if (deleteError.code === 404) {
                    console.warn("File not found in Google Drive, might have been deleted already:", user.profilePhoto);
                } else {
                    console.error("Error deleting old photo from Google Drive:", deleteError);
                    // Return here if the error is something other than not found
                    return res.status(500).json({ message: "An error occurred while deleting the old profile photo." });
                }
            }
        }

        // Resize the uploaded image to 200x200 pixels using sharp
        const resizedImageBuffer = await sharp(req.file.buffer)
            .resize(200, 200)
            .png() // Convert the image to PNG format if needed
            .toBuffer();
        
        // Convert buffer to readable stream
        const bufferStream = new stream.PassThrough();
        bufferStream.end(resizedImageBuffer);

        // Upload the resized image to Google Drive
        const driveResponse = await drive.files.create({
            requestBody: {
                name: `profile_${userMatricula}_${Date.now()}.png`, // Give the file a unique name
                mimeType: 'image/png',
            },
            media: {
                mimeType: 'image/png',
                body: bufferStream
            }
        });

        // Set file permissions to be publicly accessible if required
        await drive.permissions.create({
            fileId: driveResponse.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Generate the publicly accessible URL
        const fileUrl = `https://drive.google.com/uc?id=${driveResponse.data.id}`;

 
        // Update the user's profilePhoto field with the new Google Drive file ID
        user.profilePhoto = driveResponse.data.id;

        // Save the updated user with the new profile photo
        await user.save();

        // Send success response back to the client
        res.status(200).json({ message: "Profile photo updated successfully", profilePhotoUrl: fileUrl });

    } catch (error) {
        console.error("Error updating profile photo:", error);
        res.status(500).json({ message: "An error occurred while updating the profile photo." });
    }
});
// Route to delete profile photo
router.delete('/delete-profilephoto', verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {
    const userMatricula = req.user.matricula;

    try {
        // Find the user by matricula
        const user = await Users.findOne({ where: { matricula: userMatricula } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user has a profile photo
        if (!user.profilePhoto) {
            return res.status(400).json({ message: "No profile photo to delete" });
        }

        const photoId = user.profilePhoto;

        // Delete the profile photo from Google Drive
        try {
            await drive.files.delete({ fileId: photoId });
            console.log("Profile photo deleted successfully from Google Drive:", photoId);
        } catch (deleteError) {
            if (deleteError.response && deleteError.response.status === 404) {
                console.warn("File not found in Google Drive, might have been deleted already:", photoId);
            } else {
                console.error("Error deleting photo from Google Drive:", deleteError);
                return res.status(500).json({ message: "An error occurred while deleting the profile photo." });
            }
        }

        // Remove the profile photo field from the user record
        user.profilePhoto = null;
        await user.save();

        // Send success response back to the client
        res.status(200).json({ message: "Profile photo deleted successfully" });

    } catch (error) {
        console.error("Error deleting profile photo:", error);
        res.status(500).json({ message: "An error occurred while deleting the profile photo." });
    }
});
router.get('/profilephoto', verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {
    const userMatricula = req.user.matricula;
  
    try {
      // Find the user by matricula
      const user = await Users.findOne({ where: { matricula: userMatricula } });
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Check if the user has a profile photo
      if (!user.profilePhoto) {
        return res.status(400).json({ message: "No profile photo found" });
      }
  
      const fileId = user.profilePhoto;
  
      // Fetch the image data from Google Drive
      const response = await axios.get(`https://drive.google.com/uc?export=download&id=${fileId}`, {
        responseType: 'stream',
      });
  
      // Set appropriate headers
      res.set('Content-Type', response.headers['content-type']);
  
      // Stream the image data directly to the client
      response.data.pipe(res);
  
    } catch (error) {
      console.error("Error fetching profile photo:", error);
  
      if (error.response && error.response.status === 404) {
        // Handle Google Drive file not found error
        return res.status(404).json({ message: "Profile photo not found in Google Drive." });
      }
  
      res.status(500).json({ message: "An error occurred while fetching the profile photo." });
    }
  });
  

module.exports = router;