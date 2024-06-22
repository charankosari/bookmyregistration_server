const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
});

const SlotSchema = new mongoose.Schema({
  time: {
    type: String,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    default: null
  },
  _id: false
});
const PriceSchema = new mongoose.Schema({
  consultancyfee: {
    type: Number,
    required: true
  },
  servicefee: {
    type: Number,
    required: true
  },
  _id: false
});

const BookingSchema = new mongoose.Schema({
  morning: {
    type: [SlotSchema],
    validate: [arrayLimit, 'Exceeds the limit of 20 bookings for morning']
  },
  evening: {
    type: [SlotSchema],
    validate: [arrayLimit, 'Exceeds the limit of 20 bookings for evening']
  }
}, { _id: false });

function arrayLimit(val) {
  return val.length <= 20;
}

const testSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    unique: true,
    minlength: [6, "Code should be exactly 6 characters"],
    maxlength: [6, "Code should be exactly 6 characters"]
  },
  timings: {
    morning: {
      type: [SessionSchema],
      _id: false
    },
    evening: {
      type: [SessionSchema],
      _id: false
    }
  },
  slotTimings: {
    type: Number,
    required: true
  },
  price: {
    type: PriceSchema,
    required: true
  },
  noOfDays: {
    type: Number,
    required: true
  },
  hospitalid: {
    type: mongoose.Schema.ObjectId,
    ref: "Hospital",
    required: true
  },
  bookingsids: {
    type: Map,
    of: BookingSchema,
    default: {}
  }
}, {
  toJSON: { virtuals: true, transform: (doc, ret) => transformBookingIds(ret) },
  toObject: { virtuals: true, transform: (doc, ret) => transformBookingIds(ret) }
});
function transformBookingIds(ret) {
  const now = new Date();
  const filteredBookings = {};

  Object.entries(ret.bookingsids).forEach(([key, value]) => {
    const bookingDate = new Date(key);

    if (bookingDate > now) {
      const formattedDate = bookingDate.toISOString().slice(0, 10).split('-').reverse().join('-');
      filteredBookings[formattedDate] = value;
    } else if (bookingDate.toDateString() === now.toDateString()) {
      const nowTime = now.getHours() * 60 + now.getMinutes();
      const filteredMorningSlots = value.morning.filter(slot => {
        const slotTime = new Date(`1970-01-01T${slot.time}:00Z`);
        return slotTime.getUTCHours() * 60 + slotTime.getUTCMinutes() >= nowTime;
      });
      const filteredEveningSlots = value.evening.filter(slot => {
        const slotTime = new Date(`1970-01-01T${slot.time}:00Z`);
        return slotTime.getUTCHours() * 60 + slotTime.getUTCMinutes() >= nowTime;
      });

      if (filteredMorningSlots.length > 0 || filteredEveningSlots.length > 0) {
        const formattedDate = bookingDate.toISOString().slice(0, 10).split('-').reverse().join('-');
        filteredBookings[formattedDate] = {
          morning: filteredMorningSlots,
          evening: filteredEveningSlots
        };
      }
    }
  });

  ret.bookingsids = filteredBookings;
  return ret;
}

module.exports = mongoose.model("test", testSchema);
