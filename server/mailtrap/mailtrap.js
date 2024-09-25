const { MailtrapClient } = require("mailtrap");

const TOKEN = "ef95286856cae7fa957de202c0684985";

const mailtrapClient = new MailtrapClient({
  token: TOKEN,
});

const sender = {
  email: "mailtrap@demomailtrap.com",
  name: "Mateusz Garczynski",
};


module.exports = { mailtrapClient, sender };