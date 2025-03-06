const express = require('express');
const router = express.Router();
const { Tutorials, sequelize } = require('../models/index.js');
const { Op } = require('sequelize');
const verifyToken = require('../middleware/verifyToken.js');
const authorize = require('../middleware/authorize.js');
require('dotenv').config();


module.exports = router;