const express = require("express")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cors())

app.listen(4000, () => {
    console.log("Server on localhost: 4000")
})