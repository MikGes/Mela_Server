const express = require("express");
const mongoose = require('mongoose')
const app = express()
const providerRoute = require("./routes/provider/providerRoute")
const customerRoute = require("./routes/customer/customerRoute")
const servicesRoute = require("./routes/ServiceRoute")
mongoose.connect("mongodb+srv://mikgess:melaServices@cluster0.vmzeqwn.mongodb.net/?retryWrites=true&w=majority").then(()=>{
    console.log("Database connected")
}).catch((err)=>{
    console.log(err)
})
app.use(express.json())
app.use("/provider",providerRoute)
app.use("/customer",customerRoute)
app.use("/services",servicesRoute)
app.use("/payment",require("./routes/debt/Chapa"))
app.use("/sendEmail",require("./routes/EmailRoutes/email"))
app.listen(4000,()=>{
    console.log("Server listening on port 4000")
})
