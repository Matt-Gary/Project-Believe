const express = require('express');
const router = express.Router();
const { Users, sequelize } = require('../models');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")


// Register a new user
router.post("/register", async (req, res) => {
    // Extracting username, password, email, and matricula from the request body
    const { username, password, email, matricula } = req.body;

    try {
        //Check if a user with the same email already exists
        const existingUser = await Users.findOne({ where: { email: email } });
        // Check if a user with the same matricula already exists
        const existingMatricula = await Users.findOne({ where: { matricula: matricula } });
        if (existingMatricula) {
            return res.status(400).json({error: "Matricula is already used"})
        }
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
    console.log(req.body)
    try {
        // Extracting email, password, and matricula from the request body
        const {email, password, matricula} = req.body
        // Find the user in the database by their email
        const user = await Users.findOne({where: {email}})
        if(!user) {
            return res.status(400).json({message: "Invalid Credenstials"})    
        }
        // Compare the provided password with the stored hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password)
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
