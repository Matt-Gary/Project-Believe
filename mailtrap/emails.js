const { sender, transporter } = require("./nodemailer.js");
const { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_CODE_TEMPLATE, WELCOME_TEMPLATE } = require("./email.Templates.js");

const sendWelcomeEmail = async (email, username) => {
    const mailOptions = {
        from: `"${sender.name}" <${sender.email}>`,
        to: email,
        subject: "Bem-vindo ao Nossa Familia!",
        html: WELCOME_TEMPLATE.replace("{name}", username)
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully", info.messageId);
    } catch (error) {
        console.error("Error sending welcome email", error);
        throw new Error(`Error sending welcome email: ${error}`);
    }
};

const sendPasswordResetEmail = async (email, resetURL, username) => {
    const mailOptions = {
        from: `"${sender.name}" <${sender.email}>`,
        to: email,
        subject: "Redefinir senha",
        html: PASSWORD_RESET_REQUEST_TEMPLATE
            .replace("{resetURL}", resetURL)
            .replace("{name}", username)
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Password reset email sent successfully", info.messageId);
    } catch (error) {
        console.error("Error sending password reset email", error);
        throw new Error(`Error sending password reset email: ${error}`);
    }
};

const sendResetSuccessEmail = async (email, username) => {
    const mailOptions = {
        from: `"${sender.name}" <${sender.email}>`,
        to: email,
        subject: "Password Reset Successfully",
        html: PASSWORD_RESET_SUCCESS_TEMPLATE.replace("{name}", username)
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Password reset success email sent successfully", info.messageId);
    } catch (error) {
        console.error("Error sending password reset success email", error);
        throw new Error(`Error sending password reset success email: ${error}`);
    }
};

const sendVerificationCode = async (userEmail, companyEmail, verificationCode, userName, companyName) => {
    const mailOptions = {
        from: `"${sender.name}" <${sender.email}>`,
        to: `${userEmail}, ${companyEmail}`,
        subject: "Verification Code for Benefit Claim",
        html: VERIFICATION_CODE_TEMPLATE
            .replace("{verificationCode}", verificationCode)
            .replace("{userName}", userName)
            .replace("{companyName}", companyName)
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Verification code emails sent successfully", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending verification code emails", error);
        throw new Error(`Error sending verification code emails: ${error}`);
    }
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationCode };