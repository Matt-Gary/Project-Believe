const express = require("express");
const cors = require("cors");
const db = require('./models');

const app = express();
app.use(express.json());
app.use(cors());

const usersRouter = require('./routes/Users');
app.use('/auth', usersRouter);

db.sequelize.sync().then(() => {
    app.listen(4000, () => {
        console.log("Server on localhost:4000");
    });
});