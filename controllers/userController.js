const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const Doctor=require("../models/DoctorsModel")
const sendJwt = require("../utils/jwttokenSend");
const sendEmail=require("../utils/sendEmail")
const crypto=require("crypto")
const fs=require("fs");


// user register
exports.register = asyncHandler(async (req, res, next) => {  
  const { name, email, password, number} = req.body;  
 
  // checking user existance
  let user = await User.findOne({ email });
  if (user) {
    return next(new errorHandler("user already exist", 401));
  }
  user = await User.create({
    name,
    email,
    password,
    number,
  });
  //sending response
  sendJwt(user, 201,"registerd successfully", res);  
});

//user login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, number, password } = req.body;
  if ((email === "" && number === "") || password === "") {
    return next(new errorHandler("Enter Email/Number and Password", 403));
  }
  const user = await User.findOne({
    $or: [{ email }, { number }]
  }).select("+password");
  if (!user) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  sendJwt(user, 200, "Login successful", res);
});

// forgot password
exports.forgotPassword=asyncHandler(async(req,res,next)=>{
  const email=req.body.email
  const user=await User.findOne({email})
  if(!user){
    next(new errorHandler("user dosent exit",401))
  }
  const token=user.resetToken()
  const resetUrl=`http://localhost:5173/resetpassword/${token}`
  const message=`your reset url is ${resetUrl} leave it if you didnt requested for it`
  await user.save({validateBeforeSave:false})
  try{
   const mailMessage= await sendEmail({
    email:user.email,
    subject:"password reset mail",
    message:message
   })
   res.status(201).json({success:true,message:"mail sent successfully",mailMessage:mailMessage})
  }
  catch(e){
    user.resetPasswordExpire=undefined;
    user.resetPasswordToken=undefined;
    await user.save({validateBeforeSave:false})
    next(new errorHandler(e.message,401))
  }
})
// reset password
exports.resetPassword=asyncHandler(async(req,res,next)=>{
  const token=req.params.id
  const hashedToken=crypto.createHash("sha256").update(token).digest("hex")
  const user=await User.findOne({resetPasswordToken:hashedToken,resetPasswordExpire:{$gt:Date.now()}})
  if(!user){
    return next(new errorHandler("Reset password is invalid or expired",400))
  }
  user.password=req.body.password
  user.resetPasswordExpire=undefined
  user.resetPasswordToken=undefined
  await user.save()
  sendJwt(user,201,"reset password successfully",res)
})

// update password
exports.updatePassword=asyncHandler(async(req,res,next)=>{
  const {password,oldPassword}=req.body
  const user=await User.findById(req.user.id).select("+password")
  const passwordCheck=await user.comparePassword(oldPassword)
  if(!passwordCheck){
    return next(new errorHandler("Wrong password",400))
  }
  user.password=password;
  await user.save()
  sendJwt(user,201,"password updated successfully",res)

})

// my details
exports.userDetails=asyncHandler(async(req,res,next)=>{
  const user=await User.findById(req.user.id)
  if(!user){
    return next(new errorHandler("Login to access this resource",400))
  }
  res.status(200).send({success:true,user})
})

//profile update
exports.profileUpdate = asyncHandler(async (req, res, next) => {
  const { name, email, number } = req.body;
  const user = await User.findById(req.user.id);
  user.name = name || user.name;
  user.email = email || user.email;
  user.number = number || user.number;
  try {
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (err) {
    return next(new errorHandler("Failed to update profile.", 500));
  }
});



// get all users---admin
exports.getAllUsers=asyncHandler(async(req,res,next)=>{
   const users=await User.find()
   res.status(200).json({success:true,users})
})

// get single user---admin
exports.getUser=asyncHandler(async(req,res,next)=>{
  const user=await User.findById(req.params.id)
  res.status(200).json({success:true,user})
})

// update user role ---admin 
exports.updateUserRole=asyncHandler(async(req,res,next)=>{
  const id=req.params.id;
  let user=await User.findById(id)
  if(!user){
    return next(new errorHandler(`user dosent exist with id ${id}`),400)
  }
  const updatedUserData={
    role:req.body.role
  }
   user=await User.findByIdAndUpdate(id,updatedUserData,{new:true,runValidators:true,useFindAndModify:false})
  res.status(201).json({success:true,user})
})

// delete user --admin
exports.deleteUser=asyncHandler(async(req,res,next)=>{
  const id=req.params.id
  const user=await User.findById(id)
  if(!user){
    return next(new errorHandler(`user dosent exist with id ${id}`),400)
  }
  const message=await User.findByIdAndDelete(id);

  res.status(200).json({success:true,message:"user deleted successfully"})
})

//add and remove whishlist doctor________________________________________________________________________
exports.wishListDoctor = asyncHandler(async (req, res, next) => {
  const DoctorId = req.params.id;
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  let wishList = user.wishList || [];
  const itemExist = wishList.find((item) => item.Doctor.toString() === DoctorId);
  if (itemExist) {
    wishList = wishList.filter((item) => item.Doctor.toString() !== DoctorId);
    user.wishList = wishList;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json({ success: true, message: "Doctor removed from Wishlist successfully" });
  }
  wishList.push({ Doctor: DoctorId });
  user.wishList = wishList;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json({ success: true, message: "Doctor wishlisted successfully" });
});




// get all Wishlist details__________________
exports.getWishlist = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId).select('wishList').lean();
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  const doctorIds = user.wishList.map(item => item.Doctor);
  
  // Find doctors with specific fields
  const wishlistData = await Doctor.find({ _id: { $in: doctorIds } })
    .select('name experience study specialist hospitalid')
    .lean();

  res.status(200).json({ message: "Wishlist Data", success: true, data: wishlistData });
});


// empty the wishlist_______________________________________
exports.deleteWishlist=asyncHandler(async(req,res,next)=>{
  const userId=req.user.id
  const user=await User.findById(userId)
  user.wishList=[]
  user.save({validateBeforeSave:false})
  res.status(200).json({success:true,message:"Wishlist is empty successfully"})
})


