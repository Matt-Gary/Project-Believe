const express = require('express');
const router = express.Router();
const { Users } = require('../models');
const bcrypt = require("bcrypt");

// Register a new user
router.post("/register", async (req, res) => {
    const { username, password, email, matricula } = req.body;

    try {
        // Check if the email is already registered
        const existingUser = await Users.findOne({ where: { email: email } });
        
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new user
        await Users.create({
            username: username,
            password: hashedPassword,
            matricula: matricula,
            email: email,
        });

        // Respond with success message
        return res.json("success");

    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({ error: "An error occurred while registering the user." });
    }
});

module.exports = router;
