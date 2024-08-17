const express=require("express")
const app=express()
const user=require("./routes/userRouter")
const hospital=require("./routes/hospitalRoutes")
const errorMiddleware=require("./middleware/error")
const cookieParser=require("cookie-parser")
const logger = require("morgan")
const cors=require("cors")

app.use(cors({credentials:true, origin:true}));
app.use(cookieParser())
app.use(logger("tiny"))
app.use(express.json())
app.use("/api/bma",user)
app.use("/api/bma/hospital",hospital)
app.use(errorMiddleware)
// app.get("/payment/getKey",(req,res,next)=>res.status(200).json({key:process.env.RAZORPAY_ID}))

module.exports=app