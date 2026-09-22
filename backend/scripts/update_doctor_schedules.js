/**
 * Migration Script: Update Doctor Working Schedules & Consultation Hours in MongoDB
 */
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_management_db';

const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

const DOCTOR_SCHEDULES = [
  {
    nameMatch: 'Wilson',
    fullName: 'Dr. James Wilson',
    specialization: 'General Medicine',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHoursStart: '10:00',
    workingHoursEnd: '14:00',
    slotDurationMinutes: 30,
    availableTimeSlots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30']
  },
  {
    nameMatch: 'Sharma',
    fullName: 'Dr. Priya Sharma',
    specialization: 'Dermatology',
    workingDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    workingHoursStart: '11:00',
    workingHoursEnd: '16:00',
    slotDurationMinutes: 30,
    availableTimeSlots: ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30']
  },
  {
    nameMatch: 'Chen',
    fullName: 'Dr. Robert Chen',
    specialization: 'Pediatrics',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    workingHoursStart: '09:00',
    workingHoursEnd: '13:00',
    slotDurationMinutes: 30,
    availableTimeSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']
  },
  {
    nameMatch: 'Jenkins',
    fullName: 'Dr. Sarah Jenkins',
    specialization: 'Cardiology',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHoursStart: '14:00',
    workingHoursEnd: '19:00',
    slotDurationMinutes: 30,
    availableTimeSlots: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']
  }
];

async function updateDoctorSchedules() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    for (const sched of DOCTOR_SCHEDULES) {
      const filter = { name: new RegExp(sched.nameMatch, 'i') };
      const updateData = {
        workingDays: sched.workingDays,
        availableDays: sched.workingDays,
        workingHoursStart: sched.workingHoursStart,
        workingHoursEnd: sched.workingHoursEnd,
        slotDurationMinutes: sched.slotDurationMinutes,
        availableTimeSlots: sched.availableTimeSlots
      };

      const result = await Doctor.updateMany(filter, { $set: updateData });
      console.log(`✅ Updated ${sched.fullName}: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    }

    // Update any appointments for Dr. Sarah Jenkins that might have old 10:00 time
    const sarahDoctor = await Doctor.findOne({ name: /Jenkins/i });
    if (sarahDoctor) {
      const apptResult = await Appointment.updateMany(
        { doctor: sarahDoctor._id, scheduledTime: '10:00' },
        {
          $set: {
            scheduledTime: '15:00',
            appointmentTime: '15:00',
            requestedTime: '15:00'
          }
        }
      );
      if (apptResult.modifiedCount > 0) {
        console.log(`✅ Adjusted ${apptResult.modifiedCount} old Sarah Jenkins appointments to 15:00`);
      }
    }

    console.log('🎉 Doctor schedules migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  updateDoctorSchedules();
}

module.exports = updateDoctorSchedules;
