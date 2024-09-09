const express = require("express");
const cors = require("cors");
const db = require('./models');
const cookieParser = require("cookie-parser")

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser())
//Creating path for our registration
const usersRouter = require('./routes/Users');
app.use('/auth', usersRouter);

db.sequelize.sync().then(() => {
    app.listen(4000, () => {
        console.log("Server on localhost:4000");
    });
});