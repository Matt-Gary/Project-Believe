const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_PASS  // Your Gmail app password
    }
});

const sender = {
    email: process.env.GMAIL_USER, // Your Gmail address
    name: "Believe",
};

module.exports = { transporter, sender };