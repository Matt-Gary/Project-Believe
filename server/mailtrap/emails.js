const { sender, mailtrapClient } = require("./mailtrap.js");
const { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_CODE_TEMPLATE} = require("./email.Templates.js");


const sendWelcomeEmail = async (email, username) => {
    const recipient = [{ email }]

    try {
        const response = await mailtrapClient.send ({
            from:sender,
            to: recipient,
            template_uuid: "76119ec9-4925-415f-9de3-03207bf04c90",
            template_variables: {
                "company_info_name": "Believe",
                "name": username,
                "company_info_address": "R. Vicente Leite, 1536 - Aldeota",
                "company_info_city": "Fortaleza-CE",
                "company_info_zip_code":"60150-165",
                "company_info_country": "Brasil"
            }
        })
        console.log("Email sent sussessfully", response)
    } catch (error) {
        console.error(`Error sending welcome email`, error)

        throw new Error(`Error sending welcome email: ${error}`)
    }

}
const sendPasswordResetEmail = async (email, resetURL, username) => {
    const recepient = [{email}]

    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recepient,
            subject: "Reset password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE
            .replace("{resetURL}", resetURL)
            .replace("{name}", username)
        })
    } catch (error) {
        console.error(`Error sending password reset email`, error)

        throw new Error (`Error sending password reset email: ${error}`)
    }
}
const sendResetSuccessEmail = async (email, username) => {
    const recepient = [{email}]

    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recepient,
            subject: "Password reset successfully",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE.replace("{name}", username),
            category: "Password Reset"
        })
        console.log ("Password reset email sent successfully", response)
    } catch (error) {
        console.error(`Error sending password reset success email`, error)

        throw new Error (`Error sending password reset success email: ${error}`)
    }
}
const sendVerificationCode = async (userEmail, companyEmail, verificationCode, userName, companyName) => {
    const recipients = [{ email: userEmail }, { email: companyEmail }];

    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recipients,
            subject: "Código de Verificação para Reivindicação de Benefício",
            html: VERIFICATION_CODE_TEMPLATE
                .replace("{verificationCode}", verificationCode)
                .replace("{userName}", userName)
                .replace("{companyName}", companyName)
        });

        console.log("Verification code emails sent successfully", response);
        return response;
    } catch (error) {
        console.error(`Error sending verification code emails`, error);
        throw new Error(`Error sending verification code emails: ${error}`);
    }
};
module.exports = {sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationCode}