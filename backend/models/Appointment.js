const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Please assign a patient to this appointment']
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Please assign a doctor to this appointment']
    },
    appointmentDate: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Please provide an appointment date (YYYY-MM-DD)']
    },
    appointmentTime: {
      type: String, // Format: HH:MM
      required: [true, 'Please provide an appointment time slot (HH:MM)']
    },
    reason: {
      type: String,
      required: [true, 'Please provide reason for consultation'],
      trim: true
    },
    type: {
      type: String,
      enum: ['Routine Checkup', 'Consultation', 'Follow-up', 'Emergency'],
      default: 'Consultation'
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee uniqueness for a doctor at a given date and time (for active appointments)
appointmentSchema.index(
  { doctor: 1, appointmentDate: 1, appointmentTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'Cancelled' } }
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
