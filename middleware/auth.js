const jwt=require("jsonwebtoken")
const User =require("../models/userModel")
const errorHandler=require("../utils/errorHandler")
const asyncHandler=require("../middleware/asynchandler");
const Hospital = require("../models/HospitalsModel");
const Doctors = require("../models/DoctorsModel");

exports.isAuthorized = asyncHandler(async(req, res, next) => {
    const headers = req.headers['authorization'];
    if (!headers) {
      return next(new errorHandler("No jwtToken provided, unauthorized", 401));
    }
  
    const jwtToken = headers.split(" ")[1];
    if (!jwtToken) {
      return next(new errorHandler("Login to access this resource", 401));
    }
  
    try {
      const { id } = jwt.verify(jwtToken, process.env.jwt_secret);
      const user = await User.findById(id);
      console.log(id)
      if (!user) {
        return next(new errorHandler("User not found", 404));
      }
      req.user = user;
      next();
    } catch (err) {
      return next(new errorHandler("Invalid or expired token", 401));
    }
  });
  
  exports.isAuthorizedHosp = asyncHandler(async(req, res, next) => {
    const headers = req.headers['authorization'];
    if (!headers) {
      return next(new errorHandler("No jwtToken provided, unauthorized", 401));
    }
  
    const jwtToken = headers.split(" ")[1];
    if (!jwtToken) {
      return next(new errorHandler("Login to access this resource", 401));
    }
  
    try {
      const { id } = jwt.verify(jwtToken, process.env.jwt_secret);
      const hosp = await Hospital.findById(id);
      if (!hosp) {
        return next(new errorHandler("User not found", 404));
      }
      req.hosp = hosp;
      next();
    } catch (err) {
      return next(new errorHandler("Invalid or expired token", 401));
    }
  });
 
exports.roleAuthorize=(...role)=>{
    return (req,res,next)=>{
        const user=req.user.role
        if(!role.includes(user)){
        return next(new errorHandler(`the role ${user} is not allow to access this resourece`,401))
        }
        next()
    }  
}