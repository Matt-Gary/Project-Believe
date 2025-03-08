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
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const multerSharpS3 = require('multer-sharp-s3');

const BUCKET_NAME = process.env.S3_BUCKET_NAME
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS = process.env.AWS_SECRET_ACCESS_KEY
const AWS_REGION = process.env.AWS_REGION


const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_ACCESS,
  region: AWS_REGION,
});


const upload = multer({storage: multer.memoryStorage()}) 

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
        await sendWelcomeEmail(user.email, user.username)
        
        //Respond with success message
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
// Route to forgot password
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        // Find the user by email
        const user = await Users.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        // Generate a reset token and set its expiration time (1 hour from now)
        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

        // Save the reset token and expiration time to the user
        user.resetPasswordCode = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;
        await user.save();

        // Send the password reset email
        const resetLink = `http://localhost:5000/reset-password/${resetToken}`; // Use port 5000
        await sendPasswordResetEmail(user.email, resetLink, user.username);

        // Respond with success
        res.status(200).json({ success: true, message: "Password reset link sent to your email" });
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({ success: false, message: "An error occurred while processing your request" });
    }
});

//reset password with token
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
      // Find the user by the reset token and check if it's still valid
      const user = await Users.findOne({
          where: {
              resetPasswordCode: token,
              resetPasswordExpiresAt: { [Op.gt]: Date.now() }, // Check if the token is not expired
          },
      });

      if (!user) {
          return res.status(400).json({ success: false, message: "Invalid or expired token" });
      }

      // Hash the new password and save it
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetPasswordCode = null; // Clear the reset token
      user.resetPasswordExpiresAt = null; // Clear the expiration time
      await user.save();

      // Respond with success
      res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
      console.error("Error in resetPassword:", error);
      res.status(500).json({ success: false, message: "An error occurred while resetting the password" });
  }
});
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
  const { username, email, matricula, phoneNumber } = req.body;

  try {
      // Input Validation
      if (matricula == null || matricula.trim().length === 0) {
          return res.status(400).json("The matricula can't be null or empty!");
      }

      // Input Sanitization
      const sanitizedMatricula = matricula.trim();
      const sanitizedUsername = username ? username.trim() : null;
      const sanitizedEmail = email ? email.trim() : null;
      const sanitizedPhoneNumber = phoneNumber ? phoneNumber.trim() : null;

      // Declare formattedPhoneNumber outside the if block
      let formattedPhoneNumber = null;

      // Validate Phone Number Format (must be 11 digits)
      if (sanitizedPhoneNumber) {
          const phoneRegex = /^\d{11}$/;
          if (!phoneRegex.test(sanitizedPhoneNumber)) {
              return res.status(400).json({ error: "Número de telefone inválido. Deve conter 11 dígitos." });
          }

          // Format the phone number to include +55 country code
          formattedPhoneNumber = `55${sanitizedPhoneNumber}`;
      }

      // Fetch User by Matricula
      const userUpdated = await Users.findOne({ where: { matricula: sanitizedMatricula } });
      if (!userUpdated) {
          return res.status(400).json("The matricula doesn't have a user registered!");
      }

      // Check for Existing Username, Email, or Phone Number
      if (sanitizedUsername || sanitizedEmail || formattedPhoneNumber) {
        const existingUser = await Users.findOne({
            where: {
                [Op.and]: [
                    { 
                        [Op.or]: [
                            { username: sanitizedUsername },
                            { email: sanitizedEmail },
                            { phoneNumber: formattedPhoneNumber }
                        ]
                    },
                    { matricula: { [Op.ne]: sanitizedMatricula } } // Exclude current user
                ]
            }
        });
    
        if (existingUser) {
            if (existingUser.username === sanitizedUsername) {
                return res.status(400).json("Username already exists!");
            }
            if (existingUser.email === sanitizedEmail) {
                return res.status(400).json("Email already exists!");
            }
            if (existingUser.phoneNumber === formattedPhoneNumber) {
                return res.status(400).json("Phone number already exists!");
            }
        }
    }

      // Prepare Update Object
      const updateData = {};
      if (sanitizedUsername) {
          updateData.username = sanitizedUsername;
      }
      if (sanitizedEmail) {
          updateData.email = sanitizedEmail;
      }
      if (formattedPhoneNumber) { // Use formatted phone number for update
          updateData.phoneNumber = formattedPhoneNumber;
      }
      updateData.updatedAt = Date.now();

      // Update User in Database
      const [response] = await Users.update(updateData, {
          where: { matricula: sanitizedMatricula }
      });

      if (response === 0) {
          return res.status(400).json("No user was updated. Please check the matricula.");
      }

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

// POST route to upload user profile photo
router.post('/update-photo', verifyToken, authorize(['ADMIN', 'USER']), upload.single('image'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userMatricula = req.user.matricula;
    const photoFile = req.file;

    if (!photoFile) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const user = await Users.findOne({ where: { matricula: userMatricula } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old photo if exists
    if (user.profilePhoto) {
      try {
        await s3.deleteObject({
          Bucket: BUCKET_NAME,
          Key: user.profilePhoto
        }).promise();
      } catch (deleteErr) {
        console.error('Error deleting old photo:', deleteErr);
      }
    }

    // Generate unique filename and upload to S3
    const fileName = `users/${userMatricula}/profile_${userMatricula}_${Date.now()}_${photoFile.originalname}`;
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: photoFile.buffer,
      ContentType: photoFile.mimetype,
      ACL: 'public-read' // Remove if bucket policies block ACLs
    };

    const s3Response = await s3.upload(uploadParams).promise();

      // Store ONLY the S3 key in profilePhoto
      user.profilePhoto = fileName; // Store the Key, not the full URL
      await user.save({ 
        transaction,
        fields: ['profilePhoto'] // Explicitly specify field to update
      });
      
    await transaction.commit();

    res.json({ 
      message: 'Profile photo updated successfully', 
      profilePhotoUrl: s3Response.Location 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update photo error:', error);
    res.status(500).json({ 
      error: 'Profile photo update failed',
      details: error.message 
    });
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
  
      const photoKey = user.profilePhoto;
  
      // Delete the profile photo from S3
      try {
        await s3.deleteObject({
          Bucket: BUCKET_NAME,
          Key: photoKey, // user.profilePhoto stores the S3 key
        }).promise();
  
        console.log("Profile photo deleted successfully from S3:", photoKey);
      } catch (deleteError) {
        if (deleteError.code === 'NoSuchKey') {
          console.warn("File not found in S3, might have been deleted already:", photoKey);
        } else {
          console.error("Error deleting photo from S3:", deleteError);
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

// Route to get the user's profile photo from S3
router.get('/profilephoto', verifyToken, authorize(['ADMIN', 'USER']), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userMatricula = req.user.matricula;

    const user = await Users.findOne({ 
      where: { matricula: userMatricula },
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.profilePhoto) {
      await transaction.rollback();
      return res.status(404).json({ error: "No profile photo exists" });
    }

    // Extract S3 key from full URL
    const photoKey = user.profilePhoto.split('/').pop();
    const decodedKey = decodeURIComponent(photoKey)
    
    const s3Object = s3.getObject({
      Bucket: BUCKET_NAME,
      Key: decodedKey
    });

    // Set proper content type for image responses
    res.type('image/*');

    s3Object.on('httpHeaders', (statusCode, headers) => {
      if (statusCode === 404) {
        throw { code: 'NoSuchKey' };
      }
      res.set('Content-Type', headers['content-type']);
    });

    s3Object.on('error', (err) => {
      console.error("S3 stream error:", err);
      if (!res.headersSent) {
        if (err.code === 'NoSuchKey') {
          res.status(404).json({ error: "Photo not found in storage" });
        } else {
          res.status(500).json({ error: "Failed to retrieve photo" });
        }
      }
    });

    await transaction.commit();
    s3Object.createReadStream().pipe(res);

  } catch (error) {
    await transaction.rollback();
    console.error("Profile photo fetch error:", error);
    
    if (error.code === 'NoSuchKey') {
      return res.status(404).json({ error: "Photo file not found" });
    }
    
    res.status(500).json({ 
      error: "Failed to fetch profile photo",
      details: error.message 
    });
  }
});


module.exports = router;