const express = require("express");
const cors = require("cors");
const db = require('./models');
const cookieParser = require("cookie-parser")
const path = require('path')
require('dotenv').config()

const app = express();
app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    res.header(
    "Access-Control-Allow-Origin",
    "https://localhost:5173"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", true);
    
    console.log("Request received:", req.method, req.url);
    
    next();
    });

app.use(cookieParser())
//Creating path for our registration


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