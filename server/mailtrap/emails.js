const { sender, mailtrapClient } = require("./mailtrap.js");
const { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE} = require("./email.Templates.js");


const sendWelcomeEmail = async (email, username) => {
    const recipient = [{ email }]

    try {
        const response = await mailtrapClient.send ({
            from:sender,
            to: recipient,
            template_uuid: "76119ec9-4925-415f-9de3-03207bf04c90",
            template_variables: {
                "company_info_name": "Believe",
                "name": username
            }
        })
        console.log("Email sent sussessfully", response)
    } catch (error) {
        console.error(`Error sending welcome email`, error)

        throw new Error(`Error sending welcome email: ${error}`)
    }

}
const sendPasswordResetEmail = async (email, resetURL) => {
    const recepient = [{email}]

    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recepient,
            subject: "Reset password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL)
        })
    } catch (error) {
        console.error(`Error sending password reset email`, error)

        throw new Error (`Error sending password reset email: ${error}`)
    }
}
const sendResetSuccessEmail = async (email) => {
    const recepient = [{email}]

    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recepient,
            subject: "Password reset successfully",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE,
            category: "Password Reset"
        })
        console.log ("Password reset email sent successfully", response)
    } catch (error) {
        console.error(`Error sending password reset success email`, error)

        throw new Error (`Error sending password reset success email: ${error}`)
    }
}
module.exports = {sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail}