
const mongoose = require("mongoose");
const validator = require("validator");

const SessionSchema = new mongoose.Schema({
    startTime: {
        type: String,
    },
    endTime: {
        type: String,
    }
  });
  const DoctorSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    experience: {
        type: Number,
    },
    study: {
        type: String,
    },
    specialist: {
        type: String,
    },
    code:{
        type:String,
        unique: true,
        minlength: [6, "Code should be exactly 6 characters"],
        maxlength: [6, "Code should be exactly 6 characters"]
    },
    timings: {
      morning: {
        type: [SessionSchema],
      },
      evening: {
        type: [SessionSchema],
      }
    },
    hospitalid:
      {
          type:mongoose.Schema.ObjectId,
          ref:"Hospital id",
          required: true
      },
    bookingsids: 
      {
          type: [{
            type: mongoose.Schema.ObjectId,
            ref: "Hospital"
          }]
      }
  });

module.exports = mongoose.model("Doctors", DoctorSchema);
