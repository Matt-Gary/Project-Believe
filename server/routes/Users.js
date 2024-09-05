const express = require('express');
const router = express.Router();
const { Users, sequelize } = require('../models');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")

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
        await Users.create({
            username: username,
            password: hashedPassword, // Storing the hashed password, not the plain text
            matricula: matricula,
            email: email,
            createdAt: Date.now()
        });

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
        // Send the token as a response
        res.json({token})
    } catch (error) {
        console.error("Error logging in:", error)
        res.status(500).json({message: "Server Error"})
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
    const token = req.header("Authorization")
    if (!token) {
        return res.status(401).json({ message: "Access Denied" })
    }
    try {
        // Verify the token and extract the user data
        const decoded = jwt.verify(
            token.split(" ")[1],
            "secretkey"
        )
        // Attach the decoded user data to the request object
        req.user = decoded
        next()
    } catch (error) {
        console.error("Error verifying token:", error)
        res.status(401).json({message: "Invalid Token"})
    }
}
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
module.exports = router;
