const express = require('express')
const router = express.Router()
const {Users} = require('../models')
const bcrypt = require("bcrypt") //hash our password in the table

//insert data into our table

router.post("/", async (req,res) => {
    const {username, password, email, matricula} = req.body;
    bcrypt.hash(password, 10).then((hash) => {
        Users.create({
            username: username,
            password: hash,
            matricula: matricula,
            email: email,
        })
        .then(() => res.json("success"))
    }); 
})


module.exports = router