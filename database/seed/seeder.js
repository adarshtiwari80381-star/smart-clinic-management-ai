/**
 * Database Seeder for Clinic Management System AI
 * Seeds collections: users, doctors, patients, appointments, medicalrecords
 * Run via: node database/seed/seeder.js OR npm run seed (from backend)
 */

const path = require('path');
const fs = require('fs');

// Ensure modules installed in backend/node_modules can be required from database/seed/
const backendNodeModules = path.join(__dirname, '..', '..', 'backend', 'node_modules');
if (fs.existsSync(backendNodeModules)) {
  module.paths.unshift(backendNodeModules);
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Read raw seed data
const seedDataPath = path.join(__dirname, 'demo-data', 'seedData.json');
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

// Mongo URI (reads from env or defaults to local)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_management_db';
const maskedUri = MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB at:', maskedUri);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    // Import models
    const User = require('../../backend/models/User');
    const Doctor = require('../../backend/models/Doctor');
    const Patient = require('../../backend/models/Patient');
    const Appointment = require('../../backend/models/Appointment');
    const MedicalRecord = require('../../backend/models/MedicalRecord');

    console.log('🧹 Purging existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Doctor.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      MedicalRecord.deleteMany({})
    ]);
    console.log('✅ Collections purged.');

    // 1. Seed Doctors
    console.log('🌱 Seeding Doctors...');
    await Doctor.insertMany(seedData.doctors);
    console.log(`✅ Inserted ${seedData.doctors.length} doctors.`);

    // 2. Seed Patients
    console.log('🌱 Seeding Patients...');
    await Patient.insertMany(seedData.patients);
    console.log(`✅ Inserted ${seedData.patients.length} patients.`);

    // 3. Seed Users with hashed passwords
    console.log('🌱 Seeding Users...');
    const hashedUsers = await Promise.all(
      seedData.users.map(async (u) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(u.passwordPlain, salt);
        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          phone: u.phone,
          doctorId: u.doctorId || null,
          patientId: u.patientId || null
        };
      })
    );
    await User.insertMany(hashedUsers);
    console.log(`✅ Inserted ${hashedUsers.length} users with secured bcrypt hashes.`);

    // 4. Seed Appointments
    console.log('🌱 Seeding Appointments...');
    await Appointment.insertMany(seedData.appointments);
    console.log(`✅ Inserted ${seedData.appointments.length} appointments.`);

    // 5. Seed Medical Records
    console.log('🌱 Seeding Medical Records...');
    await MedicalRecord.insertMany(seedData.medicalRecords);
    console.log(`✅ Inserted ${seedData.medicalRecords.length} medical records.`);

    // Backup to database/data/backup_seed.json
    const backupDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(backupDir, 'latest_seed_backup.json'),
      JSON.stringify(seedData, null, 2)
    );
    console.log('💾 Backup snapshot written to database/data/latest_seed_backup.json');

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
