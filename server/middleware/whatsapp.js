const axios = require('axios');
require('dotenv').config();

async function sendWhatsappMessageToUser(phoneNumber, verificationCode) {
    try {
        const response = await axios({
            url: 'https://graph.facebook.com/v20.0/409047158966434/messages', // Ensure this URL and phone number ID is correct
            method: 'post',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            data: {
                messaging_product: 'whatsapp',
                to: phoneNumber, // Replace with recipient phone number in the correct format
                type: 'template',
                template: {
                    name: 'template_codigo', // Ensure template name is correctly set
                    language: {
                        code: 'pt_PT' // Language code for the template
                    },
                    components: [
                        {
                         type: 'button',
                         sub_type: 'url',
                         index: '0',
                         parameters: [{
                            type: 'text',
                            text: verificationCode
                        }]
                        },
                        {
                        type: 'body',
                        parameters: [
                            {
                                type: 'text', // This should be 'text' to match your example
                                text: verificationCode // The verification code or parameter to send
                            }
                        ]
                    }]
                },

            }
        });

        console.log('WhatsApp message sent:', response.data);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function sendWhatsappMessageToCompany(phoneNumber, verificationCode) {
    try {
        const response = await axios({
            url: 'https://graph.facebook.com/v20.0/409047158966434/messages', // Ensure this URL and phone number ID is correct
            method: 'post',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            data: {
                messaging_product: 'whatsapp',
                to: phoneNumber, // Replace with recipient phone number in the correct format
                type: 'template',
                template: {
                    name: 'template_codigo', // Ensure template name is correctly set
                    language: {
                        code: 'pt_PT' // Language code for the template
                    },
                    components: [
                        {
                         type: 'button',
                         sub_type: 'url',
                         index: '0',
                         parameters: [{
                            type: 'text',
                            text: verificationCode
                        }]
                        },
                        {
                        type: 'body',
                        parameters: [
                            {
                                type: 'text', // This should be 'text' to match your example
                                text: verificationCode // The verification code or parameter to send
                            }
                        ]
                    }]
                },

            }
        });

        console.log('WhatsApp message sent:', response.data);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { sendWhatsappMessageToCompany, sendWhatsappMessageToUser };

