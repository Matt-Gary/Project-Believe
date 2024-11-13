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
const sharp = require('sharp') //resizing photos
const authorize = require('../middleware/authorize');
const { sendWhatsappMessage } = require('../middleware/whatsapp');
require('dotenv').config();


// Multer configuration
//<form action="/users/update-photo" method="POST" enctype="multipart/form-data">
//<input type="file" name="profilePhoto" accept="image/*">
//<button type="submit">Upload Profile Photo</button>
//</form>
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/ProfileImages') //where we want to store this images
    },

    filename: (req, file, cb) => { //we need to specify the name, adding the date of adding file and the file name
        console.log(file) 
        cb(null, Date.now() + path.extname(file.originalname)) //cb= call back - the name is replace with current date + original name
    }

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
        return res.status(400).json({error: "Invalid email format"})
    }

    try {
        //Check if a user with the same email already exists
        const existingUser = await Users.findOne({ where: { email: email } });
        // Check if a user with the same matricula already exists
        const existingMatricula = await Users.findOne({ where: { matricula: matricula } });
        // Validation: Check if matricula is already in use
        if (existingMatricula) {
            return res.status(400).json({error: "Matricula is already used"})
        }
        // Validation: Check if the email is already registered
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
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
            phoneNumber: phoneNumber
        });
        await sendWelcomeEmail(user.email, user.username)
        
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
    // Validate email format before proceeding
    if (!emailRegex.test(email)) {
        return res.status(400).json({error: "Invalid email format"})
    }
    try {
        // Find the user in the database by their email
        const user = await Users.findOne({where: {email}})
        // Validation: Check if the user exists
        if(!user) {
            return res.status(400).json({message: "Invalid Credenstials"})    
        }
        // Compare the provided password with the stored hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password)
        // Validation: Check if the password matches
        if(!isPasswordMatch) {
            return res.status(400).json({message: "Invalid Credenstials"})    
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
            sameSite: "Strict", // Prevents CSRF attacks
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
        await sendPasswordResetEmail(user.email, process.env.URL/resetToken, user.username)

        res.status(200).json({success: true, message: "Password reset link sent to your email"})

    } catch (error) {
        console.log("Error in forgotPassword", error)
        res.status(400).json({success: false, message: error.message})

    }
})
// Reset password route
router.post("/reset-password/:token", async (req, res) => {
    try{ 
        const {token} = req.params
        const {password} = req.body

        const user = await Users.findOne ({
            resetPasswordCode: token,
            resetPasswordExpiresAt: {$gt: Date.now()}
        })
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

router.post("/update-photo", verifyToken, authorize(['ADMIN', 'USER']), upload.single('image'), async (req, res) => {
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

        // If the user already has a profile photo, attempt to delete it
        if (user.profilePhoto) {
            const oldPhotoPath = user.profilePhoto;
            // Check if the old photo exists before trying to delete it
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlink(oldPhotoPath, (err) => {
                    if (err) {
                        console.error("Error deleting old photo:", err);
                    } else {
                        console.log("Old profile photo deleted successfully:", oldPhotoPath);
                    }
                });
            }
        }

        // Read the uploaded file buffer (from multer)
        const imageBuffer = req.file.buffer;

        // Resize the uploaded image to 200x200 pixels in memory using sharp
        const resizedPhotoPath = path.join('uploads/ProfileImages', `resized-${Date.now()}${path.extname(req.file.originalname)}`);
        await sharp(imageBuffer)
            .resize(200, 200) // Resize to 200x200 pixels
            .toFile(resizedPhotoPath); // Save the resized image to the file system

        // Set the resized image as the user's new profile photo path
        user.profilePhoto = resizedPhotoPath;

        // Save the updated user with the new profile photo
        await user.save();

        // Send success response back to the client
        res.status(200).json({ message: "Profile photo updated successfully", profilePhoto: resizedPhotoPath });

    } catch (error) {
        console.error("Error updating profile photo:", error);
        res.status(500).json({ message: "An error occurred while updating the profile photo." });
    }
});
// Route to delete profile photo
router.delete("/delete-profile-photo", verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {
    const userMatricula = req.user.matricula;

    try {
        // Find the user by matricula
        const user = await Users.findOne({ where: { matricula: userMatricula } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user has a profile photo
        if (user.profilePhoto) {
            const photoPath = user.profilePhoto;

            // Check if the file exists before attempting to delete it
            if (fs.existsSync(photoPath)) {
                // Delete the photo from the file system
                fs.unlink(photoPath, (err) => {
                    if (err) {
                        console.error("Error deleting profile photo:", err);
                        return res.status(500).json({ message: "Failed to delete profile photo" });
                    } else {
                        console.log("Profile photo deleted successfully:", photoPath);
                    }
                });
            } else {
                return res.status(404).json({ message: "Profile photo not found on the server" });
            }

            // Remove the profile photo path from the user's record in the database
            user.profilePhoto = null;
            await user.save();

            // Send success response
            return res.status(200).json({ message: "Profile photo deleted successfully" });
        } else {
            return res.status(400).json({ message: "User has no profile photo to delete" });
        }
    } catch (error) {
        console.error("Error deleting profile photo:", error);
        return res.status(500).json({ message: "An error occurred while deleting the profile photo" });
    }
});

module.exports = router;
