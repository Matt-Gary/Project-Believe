const express = require('express');
const router = express.Router();
const { Users, sequelize } = require('../models');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const crypto = require('crypto')
const { sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail} = require("../mailtrap/emails.js")
const multer = require("multer")
const path = require('path')
const fs = require('fs') // To handle file system operations

// Multer configuration
//<form action="/users/update-photo" method="POST" enctype="multipart/form-data">
//<input type="file" name="profilePhoto" accept="image/*">
//<button type="submit">Upload Profile Photo</button>
//</form>
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'ProfileImages') //where we want to store this images
    },

    filename: (req, file, cb) => { //we need to specify the name, adding the date of adding file and the file name
        console.log(file) 
        cb(null, Date.now() + path.extname(file.originalname)) //cb= call back - the name is replace with current date + original name
    }

    })

const upload = multer({storage: storage}) //upload middleware that had object storage determining where we want to store the image

// Regular expression for email format validation
const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

// Register a new user
router.post("/register", async (req, res) => {
    // Extracting username, password, email, and matricula from the request body
    const { username, password, email, matricula } = req.body;

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
            createdAt: Date.now()
        });
        await sendWelcomeEmail(user.email, user.username)
        // Respond with success message
        return res.json("User registered successfully");

    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({ error: "An error occurred while registering the user." });
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
        const token = jwt.sign({matricula: user.matricula}, "secretkey", {
            expiresIn: "1h" // Token will expire in 1 hour
        })
        //Set the token in a cookie
        res.cookie("accessToken", token, {
            httpOnly: true, //Prevents JavaScripts access
            secure: process.env.NODE_ENV === "production", // Use HTTPS in production
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
// Route to forgot password
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
        await sendPasswordResetEmail(user.email, `http://localhost:4000/reset-password/${resetToken}`, user.username)

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
// Route to get an existing user
router.get("/userByMatricula", async (req, res) => {
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
router.delete("/userByMatricula", async (req, res) => {
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
router.put("/userUpdateByMatricula", async (req, res) => {

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

// Middleware function to verify JWT token
function verifyToken(req, res, next) {
    // Get the token from the request header
    const token = req.cookies.accessToken //Access token from cookies
    if (!token) {
        return res.status(401).json({ message: "Access Denied" })
    }
    try {
        // Verify the token and extract the user data
        const decoded = jwt.verify(
            token, "secretkey"
        )
        // Attach the decoded user data to the request object
        req.user = decoded
        next()
    } catch (error) {
        console.error("Error verifying token:", error)
        res.status(401).json({message: "Invalid Token"})
    }
}

// Accessible only with a valid JWT token
router.post("/userChangePassword", verifyToken, async (req, res) => {
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
router.get("/userinfo", verifyToken, async (req, res) => {
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

router.post("/update-photo", verifyToken, upload.single('image'), async (req, res) => {
    const userMatricula = req.user.matricula
    const profilePhotoPath = req.file ? req.file.path : null // Get the uploaded image path

    if (!profilePhotoPath) {
        return res.status(400).json({ message: "No image uploaded"})
    }
    try {
        // Find the user by matricula and update their profile photo path
        const user = await Users.findOne({where: {matricula:userMatricula}})

        if (!user) {
            return res.status(404).json({message: "User not found"})
        }
        // Check if the user already has a profile photo
        if (user.profilePhoto) {
            const oldPhotoPath = user.profilePhoto
            // Delete the old profile photo from the file system
            fs.unlink(oldPhotoPath, (err) => {
                console.error("Error deleting old photo", err)
            })

        }
        user.profilePhoto = profilePhotoPath; // Update the profile photo path
        await user.save() 
        res.status(200).json({ message: "Profile photo updates successfully", profilePhoto: profilePhotoPath })
    } catch (error) {
        console.error("Error updating profile photo", error)
        res.status(500).json({message: "An error occured while updating the profile photo."})
    }
})
module.exports = router;
