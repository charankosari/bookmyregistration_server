const mongoose = require("mongoose");
const moment = require("moment");

const SessionSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
});

const SlotSchema = new mongoose.Schema({
  time: {
    type: String,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    default: null,
  },
  _id: false,
});
const PriceSchema = new mongoose.Schema({
  consultancyfee: {
    type: Number,
    required: true,
  },
  servicefee: {
    type: Number,
    required: true,
  },
  _id: false,
});

const BookingSchema = new mongoose.Schema(
  {
    morning: {
      type: [SlotSchema],
      validate: [arrayLimit, "Exceeds the limit of 20 bookings for morning"],
    },
    evening: {
      type: [SlotSchema],
      validate: [arrayLimit, "Exceeds the limit of 20 bookings for evening"],
    },
  },
  { _id: false }
);

function arrayLimit(val) {
  return val.length <= 20;
}

const testSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      unique: true,
      minlength: [6, "Code should be exactly 6 characters"],
      maxlength: [6, "Code should be exactly 6 characters"],
    },
    timings: {
      morning: {
        type: [SessionSchema],
        _id: false,
      },
      evening: {
        type: [SessionSchema],
        _id: false,
      },
    },
    slotTimings: {
      type: Number,
      required: true,
    },
    price: {
      type: PriceSchema,
      required: true,
    },
    noOfDays: {
      type: Number,
      required: true,
    },
    hospitalid: {
      type: mongoose.Schema.ObjectId,
      ref: "Hospital",
      required: true,
    },
    bookingsids: {
      type: Map,
      of: BookingSchema,
      default: {},
    },
    ids: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Booking",
      default: [],
    },
    image: {
      type: [String],
      _id: false,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => transformBookingIds(ret),
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => transformBookingIds(ret),
    },
  }
);

function transformBookingIds(ret) {
  const today = moment().startOf("day");
  const filteredBookings = {};

  Object.entries(ret.bookingsids).forEach(([key, value]) => {
    const bookingDate = moment(key, "YYYY-MM-DD");
    if (bookingDate.isSameOrAfter(today)) {
      const formattedDate = bookingDate.format("DD-MM-YYYY");
      filteredBookings[formattedDate] = value;
    }
  });

  ret.bookingsids = filteredBookings;
  return ret;
}

module.exports = mongoose.model("test", testSchema);
