const express = require("express");
const cors = require("cors");
const db = require('./models');
const cookieParser = require("cookie-parser")
const path = require('path')

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser())
//Creating path for our registration
const usersRouter = require('./routes/Users');
app.use('/auth', usersRouter);

const eventRoutes = require('./routes/Gallery');
app.use('/gallery', eventRoutes);

const benefitsRoutes = require('./routes/Benefits');
app.use('/benefits', benefitsRoutes);

// Uploading photos
app.use('/uploades/ProfileImages', express.static(path.join(__dirname, 'ProfileImages')))

db.sequelize.sync().then(() => {
    app.listen(4000, () => {
        console.log("Server on localhost:4000");
    });
});