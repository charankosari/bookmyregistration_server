const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Hospital = require("../models/HospitalsModel");
const Doctor = require("../models/DoctorsModel");
const Product=require("../models/productModels")
const sendJwt = require("../utils/jwttokenSend");
const sendEmail=require("../utils/sendEmail")
const crypto=require("crypto")
const fs=require("fs");


// hospital register
exports.register = asyncHandler(async (req, res, next) => {  
  const { hospitalName, address, email, password, number } = req.body;  
  let hosp = await Hospital.findOne({ email });
  let hosp2 = await Hospital.findOne({ hospitalName });
  if (hosp || hosp2) {
    return next(new errorHandler("Hospital already exists", 401));
  }
  
  hosp = await Hospital.create({
    hospitalName,
    address,
    email,
    password,
    number,
  });
  
  sendJwt(hosp, 201, "Registered successfully", res);  
});


//hosppital login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, number, password } = req.body;

  if ((email === "" && number === "") || password === "") {
    return next(new errorHandler("Enter Email/Number and Password", 403));
  }

  const hosp = await Hospital.findOne({
    $or: [{ email }, { number }]
  }).select("+password");

  if (!hosp) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  const passwordMatch = await hosp.comparePassword(password);
  if (!passwordMatch) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  sendJwt(hosp, 200, "Login successful", res);
});

// forgot password
exports.forgotPassword=asyncHandler(async(req,res,next)=>{
  const email=req.body.email
  const hosp=await Hospital.findOne({email})
  if(!hosp){
    next(new errorHandler("Hospital dosent exit",401))
  }
  const token=hosp.resetToken()
  const resetUrl=`http://localhost:5173/resetpassword/${token}`
  const message=`your reset url is ${resetUrl} leave it if you didnt requested for it`
  await hosp.save({validateBeforeSave:false})
  try{
   const mailMessage= await sendEmail({
    email:hosp.email,
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

// reset password____________________
exports.resetPassword=asyncHandler(async(req,res,next)=>{
  const token=req.params.id
  const hashedToken=crypto.createHash("sha256").update(token).digest("hex")
  const hosp=await Hospital.findOne({resetPasswordToken:hashedToken,resetPasswordExpire:{$gt:Date.now()}})
  if(!hosp){
    return next(new errorHandler("Reset password is invalid or expired",400))
  }
  hosp.password=req.body.password
  hosp.resetPasswordExpire=undefined
  hosp.resetPasswordToken=undefined
  await hosp.save()
  sendJwt(hosp,201,"reset password successfully",res)
})



// update password_____________________
exports.updatePassword=asyncHandler(async(req,res,next)=>{
  const {password,oldPassword}=req.body
  const hosp=await Hospital.findById(req.hosp.id).select("+password")
  const passwordCheck=await hosp.comparePassword(oldPassword)
  if(!passwordCheck){
    return next(new errorHandler("Wrong password",400))
  }
  hosp.password=password;
  await hosp.save()
  sendJwt(hosp,201,"password updated successfully",res)

})

//random words generator________________
function getRandomLetters(name, count) {
  const letters = name.replace(/[^a-zA-Z]/g, '');
  let result = '';
  const nameLength = letters.length;

  if (nameLength < count) {
    throw new Error('Name does not contain enough letters to generate the code');
  }

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * nameLength);
    result += letters[randomIndex];
  }
  return result.toUpperCase();
}

//add doctor_____________________________________________________________-
exports.addDoctor = async (req, res, next) => {
  try {
    const { name, experience, study, specialist, timings } = req.body;
    const hospitalid=await Hospital.findById(req.hosp.id)
    const hospital = await Hospital.findById(hospitalid);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    const hospitalCode = hospital.hospitalName.slice(0, 2).toUpperCase();
    const doctorCodePart = getRandomLetters(name, 4);
    const doctorCode = hospitalCode + doctorCodePart;
    const doctor = new Doctor({
      name,
      experience,
      study,
      specialist,
      hospitalid,
      timings,
      code: doctorCode
    });
    // Save the doctor to the database
    const savedDoctor = await doctor.save();
    // Add the doctor to the hospital's doctor list
    hospital.doctors.push({ doctorid: savedDoctor._id });
    await hospital.save();
    res.status(201).json(savedDoctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


///deleting a doctor
exports.deleteDoctorById = asyncHandler(async (req, res, next) => {
  const doctorId = req.params.id;
  const hospitalId = req.hosp.id;
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ success: false, message: "Hospital not found" });
  }
  hospital.doctors = hospital.doctors.filter(doctor => doctor.doctorid.toString() !== doctorId);
  await hospital.save();
  const deletedDoctor = await Doctor.findByIdAndDelete(doctorId);
  if (!deletedDoctor) {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }
  res.status(200).json({ success: true, message: "Doctor deleted successfully" });
});



//add session
exports.addSession = async (req, res, next) => {
  try {
    const { hospitalName, doctorName, userName, time,date, amountPaid, sessionType, mode, number } = req.body;
    
    const hospital = await Hospital.findOne({ hospitalName });
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
   

    const newSession = {
      username: userName,
      doctorName,
      time,
      hospitalName,
      date,
      amountPaid,
      sessionType,
      mode,
      number
    };

    if (sessionType === 'morning') {
      await hospital.pushToMorning(newSession);
    } else if (sessionType === 'evening') {
      await hospital.pushToEvening(newSession);
    } else {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    return res.status(201).json({ message: 'Session added successfully', session: newSession });
  }  catch (error) {
    console.error('Error occurred while adding session:', error);
    return res.status(500).json({ error: 'An error occurred while adding session', error: error.message });
  }
};


// my details
exports.HospitalDetails=asyncHandler(async(req,res,next)=>{
  const hosp=await Hospital.findById(req.hosp.id)
  if(!hosp){
    return next(new errorHandler("Login to access this resource",400))
  }
  res.status(200).send({success:true,hosp})
})

//profile update
exports.profileUpdate = asyncHandler(async (req, res, next) => {
  const { name, email, number } = req.body;
  const hosp = await Hospital.findById(req.hosp.id);
  hosp.name = name || hosp.name;
  hosp.email = email || hosp.email;
  hosp.number = number || hosp.number;

  try {
    await hosp.save();
    res.status(200).json({ success: true, hosp });
  } catch (err) {
    return next(new errorHandler("Failed to update profile.", 500));
  }
});

// get all doctors---admin
exports.getAllDoctors=asyncHandler(async(req,res,next)=>{
  const doctors=await Doctor.find()
  res.status(200).json({success:true,doctors})
})

// get single doctors---admin
exports.getSingleDoctorByCode = asyncHandler(async (req, res, next) => {
  const doctorCode = req.body.code;
  const hospitalId = req.hosp.id;
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ success: false, message: "Hospital not found" });
  }
  const doctor = await Doctor.findOne({ code: doctorCode });
  if (!doctor) {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }
  res.status(200).json({ success: true, data: doctor });
});

// get all hospitals---admin
exports.getAllHospitals=asyncHandler(async(req,res,next)=>{
   const hospitals=await Hospital.find()
   res.status(200).json({success:true,hospitals})
})

// get single hospital---admin  
exports.getUser=asyncHandler(async(req,res,next)=>{
  const user=await Hospital.findById(req.params.id)
  res.status(200).json({success:true,user})
})


