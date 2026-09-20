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
    availableTimeSlots: {
      type: [String],
      default: [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
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

module.exports = mongoose.model('Doctor', doctorSchema);
