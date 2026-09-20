const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Please associate record with a patient']
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Please associate record with an attending doctor']
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    visitDate: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Please specify visit date'],
      default: () => new Date().toISOString().split('T')[0]
    },
    symptoms: {
      type: [String],
      default: []
    },
    diagnosis: {
      type: String,
      required: [true, 'Please specify a diagnosis'],
      trim: true
    },
    vitals: {
      bloodPressure: { type: String, default: '120/80 mmHg' },
      heartRate: { type: String, default: '72 bpm' },
      temperature: { type: String, default: '98.6 F' },
      weight: { type: String, default: '70 kg' },
      oxygenLevel: { type: String, default: '98%' }
    },
    prescriptions: [
      {
        medicineName: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
        instructions: { type: String, default: '' }
      }
    ],
    labTests: [
      {
        testName: { type: String },
        result: { type: String },
        normalRange: { type: String },
        testDate: { type: String }
      }
    ],
    doctorNotes: {
      type: String,
      default: ''
    },
    followUpDate: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
