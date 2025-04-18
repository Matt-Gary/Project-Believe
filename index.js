const express = require("express");
const cors = require("cors");
const db = require('./models');
const cookieParser = require("cookie-parser")
const path = require('path')
require('dotenv').config()

const app = express();
const allowedOrigins = [
    'https://www.believecalistenia.com.br',
    'https://believecalistenia.com.br'
  ];
  
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
  
      // Block unauthorized origins
      const msg = `CORS policy: ${origin} not allowed`;
      return callback(new Error(msg), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE"], // Only allow necessary HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Only enable if you need cookies/auth headers
    maxAge: 86400 // Cache CORS preflight requests for 24 hours
  }));
app.use(express.json());
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

const calendarRouter = require('./routes/Calendar');
app.use('/calendar', calendarRouter);

// Uploading photos
app.use('../uploads/ProfileImages', express.static(path.join(__dirname, 'ProfileImages')))

db.sequelize.sync().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

module.exports = app