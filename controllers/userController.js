const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const Doctor = require("../models/DoctorsModel");
const Hospital = require("../models/HospitalsModel");
const Booking = require("../models/BookingModel");
const sendJwt = require("../utils/jwttokenSend");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const axios = require("axios");
const sendEmail = require("../utils/sendEmail");
const { config } = require("dotenv");
const crypto = require("crypto");
const fs = require("fs");
const aws = require('aws-sdk');
const Labs = require('../models/labModel')
const multer = require('multer');
const path = require('path');
const otpStore = new Map();
const renflair_url =
  "https://sms.renflair.in/V1.php?API=c850371fda6892fbfd1c5a5b457e5777";

config({ path: "config/config.env" });
// user register___________________________
exports.register = asyncHandler(async (req, res, next) => {
  const generateOtp = () => Math.floor(1000 + Math.random() * 9000);
  try {
    const { name, email, number } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return next(new errorHandler("User already exists", 401));
    }
    const otp = generateOtp();
    const ttl = 10 * 60 * 1000; // OTP valid for 10 minutes
    otpStore.set(number, { otp, name, email });
    setTimeout(() => {
      otpStore.delete(number);
    }, ttl);
    const url = `${renflair_url}&PHONE=${number}&OTP=${otp}`;
    await axios.post(url);
    res.status(200).json({ message: "OTP sent successfully", number });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//verify register otp__________________________
exports.verifyRegisterOtp = asyncHandler(async (req, res, next) => {
  try {
    const { otp, number } = req.body;
    console.log(`Received - OTP: ${otp}, number: ${number}`);
    if (!otp || !number) {
      return next(new errorHandler("OTP and number are required", 400));
    }
    const storedData = otpStore.get(number);
    if (!storedData) {
      return next(
        new errorHandler("OTP expired or phone number not found", 400)
      );
    }
    const { otp: storedOtp, name, email } = storedData;

    if (otp !== storedOtp) {
      return next(new errorHandler("Invalid OTP", 400));
    }
    let user = await User.create({
      name,
      email,
      number,
    });

    otpStore.delete(number);
    sendJwt(user, 201, "Registered successfully", res);
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ message: "Internal server error" });
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

    const user = await User.findOne({ number });
    if (!user) {
      return next(new errorHandler("Please check your number  or Create an account", 404));
    }

    const otp = generateOtp();
    const ttl = 10 * 60 * 1000; // OTP valid for 10 minutes

    otpStore.set(user._id.toString(), otp);

    setTimeout(() => otpStore.delete(user._id.toString()), ttl);

    const url = `${renflair_url}&PHONE=${number}&OTP=${otp}`;
    await axios.post(url);

    res
      .status(200)
      .json({ message: "OTP sent successfully", userid: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


exports.sendOtpVerify = asyncHandler(async (req, res, next) => {
  const userid=req.user.id;
  const generateOtp = () => Math.floor(1000 + Math.random() * 9000);
  try {
    const { number } = req.body;
   

    const user = await User.findById( userid);
    if (!user) {
      return next(new errorHandler("Please check your number  or Create an account", 404));
    }
    const otp = generateOtp();
    const ttl = 10 * 60 * 1000; // OTP valid for 10 minutes
    otpStore.set(user._id.toString(), otp);

    setTimeout(() => otpStore.delete(user._id.toString()), ttl);

    const url = `${renflair_url}&PHONE=${number}&OTP=${otp}`;
    await axios.post(url);
    res
      .status(200)
      .json({ message: "OTP sent successfully", userid: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
exports.verifyOtp = asyncHandler(async (req, res, next) => {
  try {
    const { otp, userid } = req.body;

    if (!otp || !userid) {
      return next(new errorHandler("OTP and UserID are required", 400));
    }

    const storedOtp = otpStore.get(userid);

    if (!storedOtp) {
      return next(new errorHandler("OTP expired or user ID not found", 400));
    }

    if (otp !== storedOtp) {
      return next(new errorHandler("Invalid OTP", 400));
    }

    otpStore.delete(userid);

    const user = await User.findById(userid);
    if (!user) {
      return next(new errorHandler("User not found", 404));
    }

    sendJwt(user, 200, "Login successful", res);
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// my details
exports.userDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to access this resource", 400));
  }
  res.status(200).send({ success: true, user });
});

//profile update
exports.profileUpdate = asyncHandler(async (req, res, next) => {
  const { name, email } = req.body;
  const user = await User.findById(req.user.id);
  user.name = name || user.name;
  user.email = email || user.email;
  try {
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (err) {
    return next(new errorHandler("Failed to update profile.", 500));
  }
});
// number update 
exports.numberUpdate = asyncHandler(async (req, res, next) => {
  try {
    const { otp, userid, number } = req.body;
    if (!otp || !userid) {
      return next(new errorHandler("OTP and UserID are required", 400));
    }
    const storedOtp = otpStore.get(userid);
    if (!storedOtp) {
      return next(new errorHandler("OTP expired or user ID not found", 400));
    }
    if (otp !== storedOtp) {
      return next(new errorHandler("Invalid OTP", 400));
    }
    otpStore.delete(userid);
    const user = await User.findById(userid);
    if (!user) {
      return next(new errorHandler("User not found", 404));
    }
    user.number = number || user.number;
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error during number update:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// get all users---admin
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({ success: true, users });
});

// get single user---admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.status(200).json({ success: true, user });
});
///get single doctor by id
exports.getDoctor = asyncHandler(async (req, res, next) => {
  const doc = await Doctor.findById(req.params.id).select("_id name experience study specialist hospitalid bookingsids timings");
  if (!doc) {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }
  res.status(200).json({ success: true, doctor: doc });
});
exports.getTests = asyncHandler(async (req, res, next) => {
  const test = await Labs.findById(req.params.id).select("_id name experience study  hospitalid bookingsids timings");
  if (!test) {
    return res.status(404).json({ success: false, message: "Test not found" });
  }
  res.status(200).json({ success: true, test: test });
});

// update user role ---admin
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  let user = await User.findById(id);
  if (!user) {
    return next(new errorHandler(`user dosent exist with id ${id}`), 400);
  }
  const updatedUserData = {
    role: req.body.role,
  };
  user = await User.findByIdAndUpdate(id, updatedUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(201).json({ success: true, user });
});

// delete user --admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user) {
    return next(new errorHandler(`user dosent exist with id ${id}`), 400);
  }
  const message = await User.findByIdAndDelete(id);

  res.status(200).json({ success: true, message: "user deleted successfully" });
});

//find available slots 
const findAvailableSlot = async (doctorId, date, session, time) => {
  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    throw new Error("Doctor not found");
  }

  const dateString = date.toISOString().split("T")[0];
  const slots = doctor.bookingsids.get(dateString)[session];

  // Find the next available slot if the requested slot is not free
  const slotIndex = slots.findIndex((slot) => slot.time === time);
  for (let i = slotIndex; i < slots.length; i++) {
    if (slots[i].bookingId === null) {
      return slots[i];
    }
  }

  return null;
};

//booking id generator
const generateBookingId = (phonenumber) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(2);
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");

  const datePart = year + month + day;
  const mobilePart = phonenumber.toString().slice(-4);
  const combined = (datePart + mobilePart).slice(-6);
  return combined;
};
// Controller function to handle booking
exports.bookAppointment = asyncHandler(async (req, res, next) => {
  try {
    const {
      doctorId,
      hospitalId,
      date,
      session,
      time,
      name,
      phonenumber,
      email,
      amountpaid,
    } = req.body;
    const userId = req.user.id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    const bookingId = generateBookingId(phonenumber);
    const booking = new Booking({
      name,
      userid: userId,
      phonenumber,
      email,
      amountpaid,
      doctorid: doctorId,
      hospitalid: hospitalId,
      date: new Date(date),
      session,
      time,
      bookingId,
    });

    console.log("New Booking:", booking);

    const availableSlot = await findAvailableSlot(
      doctorId,
      new Date(date),
      session,
      time
    );

    console.log("Available Slot:", availableSlot);

    if (!availableSlot) {
      return res.status(400).json({ message: "All slots are booked" });
    }

    booking.time = availableSlot.time; // Update booking time with the available slot

    await booking.save();

    const dateString = new Date(date).toISOString().split("T")[0];
    const doctorSlot = doctor.bookingsids
      .get(dateString)
      [session].find((slot) => slot.time === booking.time);
    doctorSlot.bookingId = booking._id;

    await doctor.save();
    const user = await User.findById(userId);
    user.bookings.push({ bookingid: booking._id });
    await user.save();
    res.status(201).json({ message: "Booking successful", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//booking for lab test
const findAvailableSlots = async (testId, date, session, time) => {
  const test = await Labs.findById(testId);

  if (!test) {
    throw new Error("Doctor not found");
  }

  const dateString = date.toISOString().split("T")[0];
  const slots = test.bookingsids.get(dateString)[session];

  // Find the next available slot if the requested slot is not free
  const slotIndex = slots.findIndex((slot) => slot.time === time);
  for (let i = slotIndex; i < slots.length; i++) {
    if (slots[i].bookingId === null) {
      return slots[i];
    }
  }

  return null;
};
exports.bookAppointmentLab = asyncHandler(async (req, res, next) => {
  try {
    const {
      testId,
      hospitalId,
      date,
      session,
      time,
      name,
      phonenumber,
      email,
      amountpaid,
    } = req.body;
    const userId = req.user.id;

    const test = await Labs.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    const bookingId = generateBookingId(phonenumber);
    const booking = new Booking({
      name,
      userid: userId,
      phonenumber,
      email,
      amountpaid,
      testid:testId,
      hospitalid: hospitalId,
      date: new Date(date),
      session,
      time,
      bookingId,
    });

    console.log("New Booking:", booking);

    const availableSlot = await findAvailableSlots(
      testId,
      new Date(date),
      session,
      time
    );

    console.log("Available Slot:", availableSlot);

    if (!availableSlot) {
      return res.status(400).json({ message: "All slots are booked" });
    }

    booking.time = availableSlot.time; // Update booking time with the available slot

    await booking.save();

    const dateString = new Date(date).toISOString().split("T")[0];
    const testSlot = test.bookingsids
      .get(dateString)
      [session].find((slot) => slot.time === booking.time);
      testSlot.bookingId = booking._id;

    await test.save();
    const user = await User.findById(userId);
    user.bookings.push({ bookingid: booking._id });
    await user.save();
    res.status(201).json({ message: "Booking successful", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//user controller for getting booking details

exports.getBookingDetails = asyncHandler(async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const doctor = await Doctor.findById(booking.doctorid);
    const hospital = await Hospital.findById(booking.hospitalid);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    const bookingDetails = {
      booking: {
        _id: booking._id,
        name: booking.name,
        id:booking.bookingId,
        userid: booking.userid,
        phonenumber: booking.phonenumber,
        email: booking.email,
        amountpaid: booking.amountpaid,
        date: booking.date,
        session: booking.session,
        time: booking.time,
      },
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        experience: doctor.experience,
        study: doctor.study,
        specialist: doctor.specialist,
      },
      hospital: {
        _id: hospital._id,
        hospitalName: hospital.hospitalName,
        location: hospital.address,
        contact: hospital.number,
      },
    };

    res.status(200).json(bookingDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//get labs details all

exports.getLabDetails = asyncHandler(async (req, res, next) => {
  try {
    const hospitalId = req.params.id;
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    const testIds = hospital.tests.map(test => test.testid);
    const fieldsToReturn = "_id name  timings slotTimings bookingsids  ";
    const tests = await Labs.find({ _id: { $in: testIds } }).select(fieldsToReturn);

    res.status(200).json({
      success: true,
      hospital: {
        ...hospital._doc,
        tests: tests
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


//get doctor details all
exports.getDoctorDetails = asyncHandler(async (req, res, next) => {
  try {
    const hospitalId = req.params.id;

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const doctorIds = hospital.doctors.map(doc => doc.doctorid);

    const fieldsToReturn = "_id name experience study specialist hospitalid bookingsids timings";

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

//user booking details all_________________________________________
exports.getUserBookingDetails = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bookingIds = user.bookings.map((booking) => booking.bookingid);

    const bookings = await Booking.find({ _id: { $in: bookingIds } });

    const bookingDetails = [];

    for (const booking of bookings) {
      const hospital = await Hospital.findById(booking.hospitalid);
      if (!hospital) {
        continue;
      }

      const detail = {
        booking: {
          _id: booking._id,
          name: booking.name,
          id: booking.bookingId,
          userid: booking.userid,
          phonenumber: booking.phonenumber,
          email: booking.email,
          amountpaid: booking.amountpaid,
          date: booking.date,
          session: booking.session,
          time: booking.time,
        },
        hospital: {
          _id: hospital._id,
          hospitalName: hospital.hospitalName,
          location: hospital.address,
          contact: hospital.number,
        },
      };

      if (booking.doctorid) {
        const doctor = await Doctor.findById(booking.doctorid);
        if (doctor) {
          detail.doctor = {
            _id: doctor._id,
            name: doctor.name,
            experience: doctor.experience,
            study: doctor.study,
            specialist: doctor.specialist,
          };
        }
      } else if (booking.testid) {
        const test = await Labs.findById(booking.testid);
        if (test) {
          detail.test = {
            _id: test._id,
            name: test.name,
          };
        }
      }

      bookingDetails.push(detail);
    }

    res.status(200).json({
      success: true,
      bookingDetails: bookingDetails.reverse(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


//uploading,getting,deletingfile,downloading a file to s3 bucket
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

aws.config.update({
    secretAccessKey: process.env.ACCESS_SECRET,
    accessKeyId: process.env.ACCESS_KEY,
    region: process.env.REGION,
});

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
              ACL: 'public-read'
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
                  const user = await User.findById(req.user.id);
                  if (!user) {
                      return res.status(404).send('User not found');
                  }
                  user.addFile(req.file.filename, data.Location);
                  await user.save();
                  res.status(200).json({message:"File uploaded and saved Successfully",
                    success: true,
                    location: data.Location,
                  });
              } catch (dbErr) {
                  console.error('Database error:', dbErr);
                  res.status(500).json({
                    success: false,
                    message:'Exceeded the limit to upload files,please delete earlier files to upload.'
                  });
              }
          });
      });
  });
};

exports.deleteFile = async (req, res, next) => {
  const filename = req.params.filename;
  const userId = req.user.id; 
  try {
      await s3.deleteObject({ Bucket: BUCKET, Key: filename }).promise();
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).send('User not found');
      }
      user.files = user.files.filter(file => file.name !== filename);
      await user.save();
      res.status(200).json({message:"File deleted successfully",
        success: true,
      });
  } catch (err) {
      res.status(500).json({
        success: false,
        message:"Failed to delete files"
      });
  }
};
exports.getFiles = async (req, res, next) => {
  const userId = req.user.id;
  try {
      const user = await User.findById(userId).select('files'); 
      if (!user) {
          return res.status(404).send('User not found');
      }
      res.status(200).json({
        success: true,
        files:user ,
      });
  } catch (err) {
      console.error('Get files error:', err);
      res.status(500).json({
        success: false,
        message:"Failed to get files"
      });
  }
};



//wishlist labs tests 

exports.toggleWishlistItem = asyncHandler(async (req, res, next) => {
  const { type } = req.body; // `type` should be 'Doctor' or 'Test'
  const userId = req.user.id;
  const id =req.params.id;

  console.log('ItemType:', type);
  console.log('ItemId:', id);
  console.log('userId:', userId);

  if (!['doctor', 'test'].includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid type" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  let wishList = user.wishList || [];
  console.log('Initial wishlist:', wishList);

  const itemExist = wishList.find(
    (item) => item[type] && item[type].toString() === id
  );

  console.log('itemExist:', itemExist);

  if (itemExist) {
    wishList = wishList.filter((item) => !(item[type] && item[type].toString() === id));
    user.wishList = wishList;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
      success: true,
      message: `${type} removed from Wishlist successfully`,
    });
  }

  let newItem = {};
  newItem[type] = id;
  wishList.push(newItem);
  user.wishList = wishList;
  await user.save({ validateBeforeSave: false });

  console.log('Updated wishlist:', wishList);

  return res.status(200).json({ success: true, message: `${type} wishlisted successfully` });
});

// Get all wishlist details
exports.getWishlist = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId).select("wishList").lean();
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const doctorIds = user.wishList.filter(item => item.doctor).map(item => item.doctor);
  const testIds = user.wishList.filter(item => item.test).map(item => item.test);

  // Find doctors with specific fields
  const doctorWishlistData = await Doctor.find({ _id: { $in: doctorIds } })
    .select("name experience study specialist timings hospitalid bookingsids")
    .lean();

  // Find tests with specific fields
  const testWishlistData = await Labs.find({ _id: { $in: testIds } })
    .select("name timings hospitalid bookingsids ")
    .lean();

  res.status(200).json({ 
    message: "Wishlist Data", 
    success: true, 
    data: {
      doctors: doctorWishlistData,
      tests: testWishlistData
    }
  });
});

// Empty the wishlist
exports.deleteWishlist = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  user.wishList = [];
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: "Wishlist is empty successfully" });
});


exports.downloadFile = asyncHandler(async (req, res, next) => {
  const filename = req.params.filename;
  console.log(`Downloading file: ${filename}`); // Logging filename
  try {
      let fileInfo = await s3.getObject({ Bucket: BUCKET, Key: filename }).promise();
      console.log('File info retrieved:', fileInfo); 

      const fileLocation = s3.getSignedUrl('getObject', {
          Bucket: BUCKET,
          Key: filename,
          Expires: 10000
      });
      console.log('Generated signed URL:', fileLocation); 

      res.json({
          Location: fileLocation
      });
  } catch (err) {
      console.error('Download error:', err);
      res.status(500).send('Failed to download file');
  }
});


exports.getFilesBinary = asyncHandler(async (req, res, next) => {
  const url = req.body.url;
  const response = await axios.get(url);
  res.json(response.data);
});