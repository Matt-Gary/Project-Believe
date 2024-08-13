const express = require("express")
const cors = require("cors")
const db = require('./models') //connect database

const app = express()
app.use(express.json()) ////allow to access the body being parse (send in json)
app.use(cors())

db.sequelize.sync().then(() => {
    app.listen(4000, () => console.log("Server on localhost:4000"))
})