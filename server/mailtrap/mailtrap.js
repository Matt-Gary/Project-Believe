const { MailtrapClient } = require("mailtrap");
require('dotenv').config();

const TOKEN = process.env.MAILTRAP_TOKEN

const mailtrapClient = new MailtrapClient({
  token: TOKEN,
});

const sender = {
  email: "mailtrap@demomailtrap.com",
  name: "Mateusz Garczynski",
};


module.exports = { mailtrapClient, sender };