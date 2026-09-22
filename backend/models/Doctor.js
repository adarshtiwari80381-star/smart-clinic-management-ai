const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    name: {
      type: String,
      required: [true, 'Please provide doctor name'],
      trim: true
    },
    specialization: {
      type: String,
      required: [true, 'Please provide doctor specialization'],
      trim: true
    },
    qualifications: {
      type: String,
      default: 'MBBS'
    },
    experienceYears: {
      type: Number,
      default: 0
    },
    email: {
      type: String,
      required: [true, 'Please provide doctor email'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide contact phone']
    },
    consultationFee: {
      type: Number,
      default: 50
    },
    roomNumber: {
      type: String,
      default: 'Room 101'
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    workingHoursStart: {
      type: String,
      default: '10:00'
    },
    workingHoursEnd: {
      type: String,
      default: '14:00'
    },
    slotDurationMinutes: {
      type: Number,
      default: 30
    },
    availableTimeSlots: {
      type: [String],
      default: [
        '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'
      ]
    },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Inactive'],
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save synchronization hook: keep workingDays and availableDays in sync,
// and compute availableTimeSlots matching workingHoursStart, workingHoursEnd, and slotDurationMinutes
doctorSchema.pre('save', function (next) {
  if (Array.isArray(this.workingDays) && this.workingDays.length > 0 && (!this.availableDays || this.availableDays.length === 0)) {
    this.availableDays = this.workingDays;
  } else if (Array.isArray(this.availableDays) && this.availableDays.length > 0 && (!this.workingDays || this.workingDays.length === 0)) {
    this.workingDays = this.availableDays;
  }

  if (this.workingHoursStart && this.workingHoursEnd) {
    const parseMins = (str) => {
      const parts = String(str).split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
    };
    const formatTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const startM = parseMins(this.workingHoursStart);
    const endM = parseMins(this.workingHoursEnd);
    const step = this.slotDurationMinutes || 30;

    if (endM > startM && step > 0) {
      const slots = [];
      for (let m = startM; m < endM; m += step) {
        slots.push(formatTime(m));
      }
      this.availableTimeSlots = slots;
    }
  }

  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);
