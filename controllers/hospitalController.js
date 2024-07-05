const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Hospital = require("../models/HospitalsModel");
const Doctor = require("../models/DoctorsModel");
const Test = require("../models/labModel");
const Booking=require("../models/BookingModel")
const User=require("../models/userModel")
const sendJwt = require("../utils/jwttokensendHosp");
const sendEmail=require("../utils/sendEmail")
const crypto=require("crypto")
const { config } = require("dotenv");
const fs=require("fs");
const axios=require("axios")
const Labs = require('../models/labModel')
const aws = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const otpStore = new Map();
const renflair_url='https://sms.renflair.in/V1.php?API=c850371fda6892fbfd1c5a5b457e5777'

config({ path: "config/config.env" });
// user register___________________________
const generateOtp = () => Math.floor(1000 + Math.random() * 9000);
exports.register = asyncHandler(async (req, res, next) => {
  try {
    const { hospitalName, address, image, email, number, role } = req.body;

    let hosp = await Hospital.findOne({ email });
    let hosp2 = await Hospital.findOne({ hospitalName });
    let hosp3 = await Hospital.findOne({ number });

    if (hosp || hosp2 || hosp3) {
      return next(new errorHandler("Hospital already exists", 401));
    }
    const otp = generateOtp();
    const ttl = 10 * 60 * 1000; // OTP valid for 10 minutes
    otpStore.set(number, { otp, hospitalName, address, email, image, role });
    setTimeout(() => {
      otpStore.delete(number);
    }, ttl);
    const url = `${renflair_url}&PHONE=${number}&OTP=${otp}`;
    await axios.post(url);
    res.status(200).json({ message: 'OTP sent successfully', number });
  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify Register OTP
exports.verifyRegisterOtp = asyncHandler(async (req, res, next) => {
  try {
    const { otp, number, hospitalName, address, email, image, role } = req.body;
    if (!otp || !number) {
      return next(new errorHandler("OTP and number are required", 400));
    }
    const storedData = otpStore.get(number);
    if (!storedData) {
      return next(new errorHandler("OTP expired or phone number not found", 400));
    }
    const { otp: storedOtp } = storedData;
    if (otp !== storedOtp) {
      return next(new errorHandler("Invalid OTP", 400));
    }
    let hosp = await Hospital.create({
      hospitalName, address, email, number, image, role
    });
    otpStore.delete(number);
    sendJwt(hosp, 201, "Registered successfully", res);
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//login with otp
exports.sendOtp = asyncHandler(async (req, res, next) => {
  const generateOtp = () => Math.floor(1000 + Math.random() * 9000);
  try {
    const { number } = req.body;
    if (!number) {
      return next(new errorHandler("Enter a valid 10 digit phone number", 400));
    }
    const hosp = await Hospital.findOne({ number });
    if (!hosp) {
      return next(new errorHandler("Invalid Email/Number or Password", 403));
    }
    const otp = generateOtp();
    const ttl = 10 * 60 * 1000; // OTP valid for 10 minutes
    otpStore.set(hosp._id.toString(), otp);
    setTimeout(() => otpStore.delete(hosp._id.toString()), ttl);
    const url = `${renflair_url}&PHONE=${number}&OTP=${otp}`;
    await axios.post(url);
    res.status(200).json({ message: 'OTP sent successfully', hospid: hosp._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
exports.verifyOtp = asyncHandler(async (req, res, next) => {
  try {
    const { otp, hospid } = req.body;
    if (!otp || !hospid) {
      return next(new errorHandler("OTP and UserID are required", 400));
    }
    const storedOtp = otpStore.get(hospid);
    if (!storedOtp) {
      return next(new errorHandler("OTP expired or user ID not found", 400));
    }
    if (otp !== storedOtp) {
      return next(new errorHandler("Invalid OTP", 400));
    }
    otpStore.delete(hospid);
    const hosp = await Hospital.findById(hospid);
    if (!hosp) {
      return next(new errorHandler("Hospital not found", 404));
    }
    sendJwt(hosp, 200, "Login successful", res);
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Random words generator 
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
function generateTimeSlots(timings, slotDuration) {
  if (!timings) return [];

  const slots = [];

  timings.forEach(session => {
    let startTime = new Date(`1970-01-01T${session.startTime}:00Z`);
    const endTime = new Date(`1970-01-01T${session.endTime}:00Z`);

    while (startTime < endTime) {
      const timeStr = startTime.toISOString().substring(11, 16); // Format as HH:MM
      slots.push({ time: timeStr, bookingId: null });
      startTime.setMinutes(startTime.getMinutes() + slotDuration);
    }
  });

  return slots;
}


// Add doctor
exports.addDoctor = asyncHandler(async (req, res, next) => {
  try {
    const { name, experience, study, specialist, timings, slotTimings, noOfDays,price,image } = req.body;
    const hospitalid = req.hosp.id;
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
      image,
      study,
      specialist,
      hospitalid,
      timings,
      slotTimings,
      noOfDays,
      price,
      code: doctorCode
    });
   
    const startDate = new Date();
    for (let i = 0; i < noOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

   
      const morningSlots = generateTimeSlots(timings.morning, slotTimings);
      const eveningSlots = generateTimeSlots(timings.evening, slotTimings);
      doctor.bookingsids.set(dateStr, { morning: morningSlots, evening: eveningSlots });
    }  
    if (!hospital.category.find(cat => cat.types === specialist)) {
      hospital.category.push({ types: specialist });

    }
    await hospital.save();
    const savedDoctor = await doctor.save();
    hospital.doctors.push({ doctorid: savedDoctor._id });
    await hospital.save();

    res.status(201).json(savedDoctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
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




// my details
exports.HospitalDetails=asyncHandler(async(req,res,next)=>{
  const hosp=await Hospital.findById(req.hosp.id)
  if(!hosp){
    return next(new errorHandler("Login to access this resource",400))
  }
  res.status(200).send({success:true,hosp})
})
//profile update

const BUCKET = process.env.BUCKET;
const s3 = new aws.S3();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

exports.profileUpdate = asyncHandler(async (req, res, next) => {
  const { hospitalName, email,  image } = req.body;
  const hosp = await Hospital.findById(req.hosp.id);
  hosp.hospitalName = hospitalName || hosp.hospitalName;
  hosp.email = email || hosp.email;
  hosp.image = image || hosp.image;
  await hosp.save();
    res.status(200).json({ success: true, hosp });

});
exports.sendOtpVerifyHosp = asyncHandler(async (req, res, next) => {
  const hospid=req.hosp.id;
  const generateOtp = () => Math.floor(1000 + Math.random() * 9000);
  try {
    const { number } = req.body;
    const hosp = await Hospital.findById( hospid);
    if (!hosp) {
      return next(new errorHandler("Please check your number  or Create an account", 404));
    }
    const otp = generateOtp();
    const ttl = 10 * 60 * 1000; // OTP valid for 10 minutes
    otpStore.set(hosp._id.toString(), otp);

    setTimeout(() => otpStore.delete(hosp._id.toString()), ttl);

    const url = `${renflair_url}&PHONE=${number}&OTP=${otp}`;
    await axios.post(url);
    res
      .status(200)
      .json({ message: "OTP sent successfully", hospid: hosp._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
exports.numberUpdateHosp = asyncHandler(async (req, res, next) => {
  try {
    const { otp, hospid, number } = req.body;
    if (!otp || !hospid) {
      return next(new errorHandler("OTP and UserID are required", 400));
    }
    const storedOtp = otpStore.get(hospid);
    if (!storedOtp || otp !== storedOtp) {
      return next(new errorHandler("Invalid OTP", 400));
    }
    const hosp = await Hospital.findById(hospid);
    if (!hosp) {
      return next(new errorHandler("Hospital not found", 404));
    }
    hosp.number = number || hosp.number;
    await hosp.save();
    res.status(200).json({ success: true, hosp });
  } catch (error) {
    console.error("Error during number update:", error);
    res.status(500).json({ message: "Internal server error" });
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
exports.getHosptial=asyncHandler(async(req,res,next)=>{
  const hosp=await Hospital.findById(req.params.id)
  res.status(200).json({success:true,hosp})
})


//add more sessions_____________________


const generateTimeSlotss = (startTime, endTime, slotDuration) => {
  const slots = [];
  let current = new Date(`1970-01-01T${startTime}:00Z`);
  const end = new Date(`1970-01-01T${endTime}:00Z`);

  while (current < end) {
    slots.push({ time: current.toISOString().substr(11, 5), bookingId: null });
    current.setMinutes(current.getMinutes() + slotDuration);
  }

  return slots;
};


exports.addMoreSessions = async (req, res, next) => {
  try {
    const { doctorId,date, noOfDays, slotTimings, morning, evening } = req.body;
    

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const startDate = new Date(date);
    for (let i = 0; i < noOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const morningSlots = generateTimeSlotss(morning.startTime, morning.endTime, slotTimings);
      const eveningSlots = generateTimeSlotss(evening.startTime, evening.endTime, slotTimings);

      if (!doctor.bookingsids.has(dateStr)) {
        doctor.bookingsids.set(dateStr, { morning: [], evening: [] });
      }

      const daySchedule = doctor.bookingsids.get(dateStr);

      morningSlots.forEach(slot => {
        if (!daySchedule.morning.some(existingSlot => existingSlot.time === slot.time)) {
          daySchedule.morning.push(slot);
        }
      });

      eveningSlots.forEach(slot => {
        if (!daySchedule.evening.some(existingSlot => existingSlot.time === slot.time)) {
          daySchedule.evening.push(slot);
        }
      });
    }

    await doctor.save();

    res.status(201).json({ message: 'Sessions added successfully', doctor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
//for tests
exports.addMoreSessionsLabs = async (req, res, next) => {
  try {
    const { testId,date, noOfDays, slotTimings, morning, evening } = req.body;
    

    const test = await Labs.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const startDate = new Date(date);
    for (let i = 0; i < noOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const morningSlots = generateTimeSlotss(morning.startTime, morning.endTime, slotTimings);
      const eveningSlots = generateTimeSlotss(evening.startTime, evening.endTime, slotTimings);

      if (!test.bookingsids.has(dateStr)) {
        test.bookingsids.set(dateStr, { morning: [], evening: [] });
      }

      const daySchedule = test.bookingsids.get(dateStr);

      morningSlots.forEach(slot => {
        if (!daySchedule.morning.some(existingSlot => existingSlot.time === slot.time)) {
          daySchedule.morning.push(slot);
        }
      });

      eveningSlots.forEach(slot => {
        if (!daySchedule.evening.some(existingSlot => existingSlot.time === slot.time)) {
          daySchedule.evening.push(slot);
        }
      });
    }

    await test.save();

    res.status(201).json({ message: 'Sessions added successfully', test });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
// doctors detailssss
exports.getHospitalWithDoctors = asyncHandler(async (req, res, next) => {
  try {
    const hospitalId = req.hosp.id;
    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const doctorIds = hospital.doctors.map(doc => doc.doctorid);

    const fieldsToReturn = "_id name experience study specialist hospitalid bookingsids timings price image";

    const doctors = await Doctor.find({ _id: { $in: doctorIds } }).select(fieldsToReturn);

    res.status(200).json({
      success: true,
      hospital: {
        ...hospital._doc,
        doctors: doctors
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//doctor controller for getting booking details
exports.getUserDetailsByBookingId = asyncHandler(async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    const user = await User.findById(booking.userid);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    console.log(booking);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const bookingDetails = {
      booking: {
        _id: booking._id,
        name: booking.name,
        phonenumber: booking.phonenumber,
        email: booking.email,
        amountpaid: booking.amountpaid,
        date: booking.date,
        session: booking.session,
        time: booking.time,
      },
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        number: user.number,
      },
    };

    res.status(200).json(bookingDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//adding a test

exports.addTest = asyncHandler(async (req, res, next) => {
  try {
    const { name, timings, slotTimings, noOfDays,price } = req.body;
    const hospitalid = req.hosp.id;
    const hospital = await Hospital.findById(hospitalid);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const hospitalCode = hospital.hospitalName.slice(0, 2).toUpperCase();
    const testCodePart = getRandomLetters(name, 4);
    const testCode = hospitalCode + testCodePart;

    const test = new Test({
      name,
      hospitalid,
      timings,
      price,
      slotTimings,
      noOfDays,
      code: testCode
    });
   
    const startDate = new Date();
    for (let i = 0; i < noOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const morningSlots = generateTimeSlots(timings.morning, slotTimings);
      const eveningSlots = generateTimeSlots(timings.evening, slotTimings);
      test.bookingsids.set(dateStr, { morning: morningSlots, evening: eveningSlots });
    }  
    if (!hospital.category.find(cat => cat.types === name)) {
      hospital.category.push({ types: name });
    }
    await hospital.save();
    const savedTest = await test.save();
    hospital.tests.push({ testid: savedTest._id });
    await hospital.save();

    res.status(201).json(savedTest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//add slots for test


exports.addMoreTestSessions = async (req, res, next) => {
  try {
    const { testId,date, noOfDays, slotTimings, morning, evening } = req.body;
    

    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'test not found' });
    }

    const startDate = new Date(date);
    for (let i = 0; i < noOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const morningSlots = generateTimeSlotss(morning.startTime, morning.endTime, slotTimings);
      const eveningSlots = generateTimeSlotss(evening.startTime, evening.endTime, slotTimings);

      if (!test.bookingsids.has(dateStr)) {
        test.bookingsids.set(dateStr, { morning: [], evening: [] });
      }

      const daySchedule = test.bookingsids.get(dateStr);

      morningSlots.forEach(slot => {
        if (!daySchedule.morning.some(existingSlot => existingSlot.time === slot.time)) {
          daySchedule.morning.push(slot);
        }
      });

      eveningSlots.forEach(slot => {
        if (!daySchedule.evening.some(existingSlot => existingSlot.time === slot.time)) {
          daySchedule.evening.push(slot);
        }
      });
    }

    await test.save();

    res.status(201).json({ message: 'Sessions added successfully', test });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

//delete test by id

exports.deleteTestById = asyncHandler(async (req, res, next) => {
  const testId = req.params.id;
  const hospitalId = req.hosp.id;
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ success: false, message: "Hospital not found" });
  }
  hospital.tests = hospital.tests.filter(test => test.testid.toString() !== testId);
  await hospital.save();
  const deletedTest = await Test.findByIdAndDelete(testId);
  if (!deletedTest) {
    return res.status(404).json({ success: false, message: "Test not found" });
  }
  res.status(200).json({ success: true, message: "Test deleted successfully" });
});

//image upload
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

aws.config.update({
    secretAccessKey: process.env.ACCESS_SECRET,
    accessKeyId: process.env.ACCESS_KEY,
    region: process.env.REGION,
});

// const BUCKET = process.env.BUCKET;
// const s3 = new aws.S3();

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, uploadDir);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });
// const upload = multer({ storage: storage });
exports.addFile = async (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(500).send('File upload failed');
    }
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const filePath = path.join(uploadDir, req.file.filename);
    fs.readFile(filePath, async (err, fileContent) => {
      if (err) {
        console.error('Read file error:', err);
        return res.status(500).send('Failed to read file');
      }

      const params = {
        Bucket: BUCKET,
        Key: req.file.filename,
        Body: fileContent,
        ACL: 'public-read',
      };

      s3.upload(params, async (err, data) => {
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Cleanup error:', unlinkErr);
          }
        });

        if (err) {
          console.error('Upload error:', err);
          return res.status(500).send('Failed to upload file');
        }

        try {
          const fileDetails = {
            fileName: req.file.filename,
            url: data.Location,
            bucket: data.Bucket,
            key: data.Key,
            eTag: data.ETag,
          };

          return res.status(200).json(fileDetails);
        } catch (dbErr) {
          console.error('Database error:', dbErr);
          return res.status(500).send('Failed to save file details');
        }
      });
    });
  });
};



exports.updateProfile = async (req, res, next) => {
  const { hospitalId } = req.hosp.id;
  if (!hospitalId) {
    return res.status(400).send('Hospital ID is required');
  }
  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).send('Hospital not found');
    }
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(500).send('File upload failed');
      }
      if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }
      const filePath = path.join(uploadDir, req.file.filename);
      fs.readFile(filePath, async (err, fileContent) => {
        if (err) {
          console.error('Read file error:', err);
          return res.status(500).send('Failed to read file');
        }
        const params = {
          Bucket: BUCKET,
          Key: req.file.filename,
          Body: fileContent,
          ACL: 'public-read',
        };
        s3.upload(params, async (err, data) => {
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('Cleanup error:', unlinkErr);
            }
          });
          if (err) {
            console.error('S3 upload error:', err);
            return res.status(500).send('Failed to upload file');
          }
          const imageUrl = data.Location;
          try {
            const oldImageUrl = hospital.image;
            const oldImageFilename = oldImageUrl ? oldImageUrl.split('/').pop() : null;
            hospital.image = imageUrl;
            await hospital.save();
            if (oldImageFilename) {
              await s3.deleteObject({ Bucket: BUCKET, Key: oldImageFilename }).promise();
            }
            return res.status(200).json(hospital);
          } catch (dbErr) {
            console.error('Database error:', dbErr);
            return res.status(500).send('Failed to update hospital image');
          }
        });
      });
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).send('Failed to fetch hospital');
  }
};
