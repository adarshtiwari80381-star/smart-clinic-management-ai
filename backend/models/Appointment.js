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
    // Preferred requested date & time submitted by the patient
    requestedDate: {
      type: String, // Format: YYYY-MM-DD
      default: ''
    },
    requestedTime: {
      type: String, // Format: HH:MM or 12-hr format
      default: ''
    },
    // Final confirmed consultation date & time scheduled within doctor's working hours
    scheduledDate: {
      type: String, // Format: YYYY-MM-DD
      default: ''
    },
    scheduledTime: {
      type: String, // Format: HH:MM
      default: ''
    },
    // Backward compatibility fields (synchronized with scheduledDate and scheduledTime)
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
      default: 'Confirmed'
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

// Keep requested/scheduled and backward-compatible fields in sync
appointmentSchema.pre('validate', function (next) {
  if (this.scheduledDate) {
    this.appointmentDate = this.scheduledDate;
  } else if (this.appointmentDate) {
    this.scheduledDate = this.appointmentDate;
  }

  if (this.scheduledTime) {
    this.appointmentTime = this.scheduledTime;
  } else if (this.appointmentTime) {
    this.scheduledTime = this.appointmentTime;
  }

  if (!this.requestedDate && this.appointmentDate) {
    this.requestedDate = this.appointmentDate;
  }
  if (!this.requestedTime && this.appointmentTime) {
    this.requestedTime = this.appointmentTime;
  }

  next();
});

// Compound indexes to guarantee uniqueness for a doctor at a given date and time (for active appointments)
appointmentSchema.index(
  { doctor: 1, scheduledDate: 1, scheduledTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'Cancelled' } }
  }
);

appointmentSchema.index(
  { doctor: 1, appointmentDate: 1, appointmentTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'Cancelled' } }
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
