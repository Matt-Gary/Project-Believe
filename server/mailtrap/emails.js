const { sender, mailtrapClient } = require("./mailtrap.js");


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

module.exports = {sendWelcomeEmail}