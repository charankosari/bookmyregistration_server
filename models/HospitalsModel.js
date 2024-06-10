const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { type } = require("os");
const HospitalSchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    required: [true, "Please Enter Username"],
    maxlength: [40, "Username should not exceed 40 characters"],
    minlength: [4, "Username should not be less than 4 characters"],
  },
  doctors: [
    {
      doctorid: {
        type: mongoose.Schema.ObjectId,
        ref: "Doctors",
      },
      _id: false
    }
  ],
  email: {
    type: String,
    required: [true, "Please Enter User Email"],
    unique: true,
    validate: [validator.isEmail, "Please enter a valid email"],
  },
  number: {
    type: Number,
    unique: true,
    validate: {
      validator: function (v) {
        return /^\d{10}$/.test(v.toString());
      },
      message: (props) => `${props.value} is not a valid 10-digit number!`,
    },
    required: true,
  },
  category: [
    {
      types: {
        type: String,
      },
      _id: false
    }
  ],
  address: [
    {
      hospitalAddress: {
        type: String,
        required: [true, "Please Enter Hospital Address"],
        select: false,
      },
      pincode: {
        type: Number,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      _id: false
    }
  ],
  role: {
    type: String,
    default: "hospital",
  },
  image: {
    type: [String],
    _id: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});
// pre hook to check weather password is modified
HospitalSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// generate Jwttoken
HospitalSchema.methods.jwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.jwt_secret, {
    expiresIn: process.env.jwt_epire,
  });
};

// password compare
HospitalSchema.methods.comparePassword = async function (password) {
  console.log(password, this.password);
  return await bcrypt.compare(password, this.password);
};

HospitalSchema.methods.resetToken = function () {
  const token = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  this.resetPasswordToken = hashedToken;
  this.resetPasswordExpire = Date.now() + 1000 * 60 * 60 * 24 * 15;
  return token;
};
HospitalSchema.methods.pushToMorning = async function (session) {
  if (!this.activeSession || this.activeSession.length === 0) {
    this.activeSession = { sessions: [{ morning: [], evening: [] }] };
  }
  const morningSessions = this.activeSession.sessions[0].morning;
  console.log(morningSessions);
  if (morningSessions.length >= 10) {
    throw new Error("Exceeded 10 sessions for morning on this date");
  }
  morningSessions.push(session);
  await this.save();
};

HospitalSchema.methods.pushToEvening = async function (session) {
  if (!this.activeSession || this.activeSession.length === 0) {
    this.activeSession = { sessions: [{ morning: [], evening: [] }] };
  }
  const eveningSessions = this.activeSession.sessions[0].evening;
  if (eveningSessions.length >= 10) {
    const error = new Error("Exceeded 10 sessions for evening");
    error.statusCode = 400;
    throw error;
  }
  eveningSessions.push(session);
  await this.save();
};

module.exports = mongoose.model("Hospital", HospitalSchema);
