const express = require("express");
const cors = require("cors");
const db = require('./models');
const cookieParser = require("cookie-parser")
const path = require('path')
require('dotenv').config()

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser())
//Creating path for our registration
app.use(cors({
    origin: 'http://localhost:5173', // Or your deployed front-end URL
    credentials: true // This is important if you’re using cookies for authentication
}));

const usersRouter = require('./routes/Users');
app.use('/auth', usersRouter);

const eventRoutes = require('./routes/Gallery');
app.use('/gallery', eventRoutes);

const benefitsRoutes = require('./routes/Benefits');
app.use('/benefits', benefitsRoutes);

const tutorialsRouter = require('./routes/Tutorials');
app.use('/tutorial', tutorialsRouter);

// Uploading photos
app.use('../uploades/ProfileImages', express.static(path.join(__dirname, 'ProfileImages')))

db.sequelize.sync().then(() => {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

module.exports = app