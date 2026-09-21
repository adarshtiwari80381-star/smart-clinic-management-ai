/**
 * Comprehensive Verification Suite for All 22 Role & Workflow Requirements
 * Tests the modified backend API running locally on port 5050 with MongoDB
 */

const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

// Set test port
process.env.PORT = '5050';

const app = require('./server');

let server;
let baseUrl;

let passed = 0;
let failed = 0;

function assert(condition, testNum, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] Requirement ${testNum}: ${testName} ${detail ? '(' + detail + ')' : ''}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] Requirement ${testNum}: ${testName} ${detail ? '(' + detail + ')' : ''}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, options);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🏥 RUNNING 22 TEST CASES: ROLE PERMISSIONS & CLINIC WORKFLOW');
  console.log('================================================================\n');

  // Wait 1.5s for DB connection to establish
  await new Promise(resolve => setTimeout(resolve, 1500));

  let adminToken = '';
  let adminUser = null;
  let doctorToken = '';
  let doctorUser = null;
  let doctorRecordId = '';
  let patientToken = '';
  let patientUser = null;
  let testPatientId = '';
  let testDoctorId = '';
  let testAppointmentId = '';
  let testMedicalRecordId = '';

  // -------------------------------------------------------------
  // TEST 1: Admin Login
  // -------------------------------------------------------------
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@smartclinic.com', password: 'admin123' })
  });
  adminToken = adminLogin.data.token;
  adminUser = adminLogin.data.user;
  assert(
    adminLogin.status === 200 && adminUser && adminUser.role === 'Admin',
    1,
    'Admin Login',
    `User: ${adminUser?.name}, Role: ${adminUser?.role}`
  );

  // -------------------------------------------------------------
  // TEST 2: Admin CANNOT book appointment (403 Forbidden)
  // -------------------------------------------------------------
  const adminBook = await request('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      doctor: '665000000000000000000001',
      patient: '665000000000000000000002',
      appointmentDate: '2026-10-15',
      appointmentTime: '10:00 AM',
      reason: 'Admin trying to book'
    })
  });
  assert(
    adminBook.status === 403,
    2,
    'Admin cannot book appointment',
    `HTTP ${adminBook.status}: ${adminBook.data.message}`
  );

  // -------------------------------------------------------------
  // TEST 3: Admin CANNOT add patient (403 Forbidden)
  // -------------------------------------------------------------
  const adminAddPat = await request('/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Admin Added Patient',
      email: 'adminpatient@test.com',
      phone: '1234567890',
      age: 30,
      gender: 'Male'
    })
  });
  assert(
    adminAddPat.status === 403,
    3,
    'Admin cannot add patient',
    `HTTP ${adminAddPat.status}: ${adminAddPat.data.message}`
  );

  // Fetch a patient for testing
  const allPatientsRes = await request('/api/patients', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  testPatientId = allPatientsRes.data?.data?.[0]?._id;

  // -------------------------------------------------------------
  // TEST 4: Admin CANNOT edit patient (403 Forbidden)
  // -------------------------------------------------------------
  const adminEditPat = await request(`/api/patients/${testPatientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ name: 'Admin Trying To Edit Patient' })
  });
  assert(
    adminEditPat.status === 403,
    4,
    'Admin cannot edit patient',
    `HTTP ${adminEditPat.status}: ${adminEditPat.data.message}`
  );

  // -------------------------------------------------------------
  // TEST 5: Admin CANNOT delete patient (403 Forbidden)
  // -------------------------------------------------------------
  const adminDelPat = await request(`/api/patients/${testPatientId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    adminDelPat.status === 403,
    5,
    'Admin cannot delete patient',
    `HTTP ${adminDelPat.status}: ${adminDelPat.data.message}`
  );

  // -------------------------------------------------------------
  // TEST 6: Admin CAN view doctors (200 OK)
  // -------------------------------------------------------------
  const adminDocs = await request('/api/doctors', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  testDoctorId = adminDocs.data?.data?.[0]?._id;
  assert(
    adminDocs.status === 200 && Array.isArray(adminDocs.data.data),
    6,
    'Admin can view doctors',
    `Count: ${adminDocs.data.count}`
  );

  // -------------------------------------------------------------
  // TEST 7: Admin CAN add doctor (201 Created)
  // -------------------------------------------------------------
  const tempDocEmail = `testdoc_${Date.now()}@smartclinic.com`;
  const adminAddDoc = await request('/api/doctors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Dr. Automated Tester',
      specialization: 'Neurology',
      qualifications: 'MBBS, MD',
      experienceYears: 12,
      email: tempDocEmail,
      phone: '+1 555-0199',
      consultationFee: 75,
      roomNumber: 'Room 303'
    })
  });
  const createdDocId = adminAddDoc.data?.data?._id;
  assert(
    adminAddDoc.status === 201 && createdDocId,
    7,
    'Admin can add doctor',
    `Created Doctor ID: ${createdDocId}`
  );

  // -------------------------------------------------------------
  // TEST 8: Admin CAN edit doctor (200 OK)
  // -------------------------------------------------------------
  const adminEditDoc = await request(`/api/doctors/${createdDocId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ consultationFee: 85 })
  });
  assert(
    adminEditDoc.status === 200 && adminEditDoc.data.data?.consultationFee === 85,
    8,
    'Admin can edit doctor',
    `Updated fee: $${adminEditDoc.data.data?.consultationFee}`
  );

  // -------------------------------------------------------------
  // TEST 9: Admin CAN delete doctor (200 OK)
  // -------------------------------------------------------------
  const adminDelDoc = await request(`/api/doctors/${createdDocId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    adminDelDoc.status === 200 && adminDelDoc.data.success === true,
    9,
    'Admin can delete doctor',
    `Deleted: ${adminDelDoc.data.message}`
  );

  // -------------------------------------------------------------
  // TEST 10: Admin CAN view all appointments (200 OK)
  // -------------------------------------------------------------
  const adminAppts = await request('/api/appointments', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    adminAppts.status === 200 && Array.isArray(adminAppts.data.data),
    10,
    'Admin can view all appointments',
    `Total: ${adminAppts.data.count}`
  );

  // -------------------------------------------------------------
  // TEST 11: Admin CAN view all medical records (200 OK)
  // -------------------------------------------------------------
  const adminRecs = await request('/api/medical-records', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    adminRecs.status === 200 && Array.isArray(adminRecs.data.data),
    11,
    'Admin can view all medical records',
    `Total: ${adminRecs.data.count}`
  );

  // -------------------------------------------------------------
  // TEST 12: Admin reports & monitoring capability
  // -------------------------------------------------------------
  // Verify Admin can retrieve dashboard & reports aggregated numbers
  assert(
    typeof adminAppts.data.count === 'number' && typeof adminRecs.data.count === 'number',
    12,
    'Admin reports data aggregation support',
    `Appointments: ${adminAppts.data.count}, Records: ${adminRecs.data.count}`
  );

  // -------------------------------------------------------------
  // TEST 13: Patient Registration (Public)
  // -------------------------------------------------------------
  const regEmail = `testpat_${Date.now()}@example.com`;
  const patReg = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Patient Tester',
      email: regEmail,
      password: 'password123',
      phone: '+1 555-4321',
      age: 29,
      gender: 'Female',
      bloodGroup: 'B+'
    })
  });
  assert(
    patReg.status === 201 && patReg.data.token && patReg.data.user?.role === 'Patient' && patReg.data.user?.patientId,
    13,
    'Patient registration',
    `Role: ${patReg.data.user?.role}, PatientId: ${patReg.data.user?.patientId}`
  );

  // -------------------------------------------------------------
  // TEST 14: Patient Login
  // -------------------------------------------------------------
  const patLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail, password: 'password123' })
  });
  patientToken = patLogin.data.token;
  patientUser = patLogin.data.user;
  assert(
    patLogin.status === 200 && patientUser && patientUser.role === 'Patient',
    14,
    'Patient login',
    `User: ${patientUser.name}, PatientId: ${patientUser.patientId}`
  );

  // -------------------------------------------------------------
  // TEST 15: Patient books appointment
  // -------------------------------------------------------------
  const futureDay = String(10 + Math.floor(Math.random() * 15)).padStart(2, '0');
  const futureDate = `2026-12-${futureDay}`;
  const futureTime = '11:00 AM';
  const patBook = await request('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      doctor: testDoctorId,
      patient: patientUser.patientId,
      appointmentDate: futureDate,
      appointmentTime: futureTime,
      reason: 'Routine Health Checkup',
      type: 'Routine Checkup'
    })
  });
  testAppointmentId = patBook.data?.data?._id;
  assert(
    patBook.status === 201 && testAppointmentId,
    15,
    'Patient books appointment',
    `Appointment ID: ${testAppointmentId}, Status: ${patBook.data?.data?.status}`
  );

  // -------------------------------------------------------------
  // TEST 16: Patient cannot book past date (400 Bad Request)
  // -------------------------------------------------------------
  const pastBook = await request('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      doctor: testDoctorId,
      patient: patientUser.patientId,
      appointmentDate: '2020-01-01',
      appointmentTime: '11:00 AM',
      reason: 'Past Date Test'
    })
  });
  assert(
    pastBook.status === 400 && pastBook.data.message?.includes('past'),
    16,
    'Patient cannot book past date',
    `HTTP ${pastBook.status}: ${pastBook.data.message}`
  );

  // -------------------------------------------------------------
  // TEST 17: Patient cannot book conflicting slot (409 Conflict)
  // -------------------------------------------------------------
  const conflictBook = await request('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      doctor: testDoctorId,
      patient: patientUser.patientId,
      appointmentDate: futureDate,
      appointmentTime: futureTime,
      reason: 'Conflicting Slot Test',
      type: 'Consultation'
    })
  });
  assert(
    conflictBook.status === 409 && conflictBook.data.message?.includes('not available'),
    17,
    'Patient cannot book conflicting slot (409 Conflict)',
    `HTTP ${conflictBook.status}: ${conflictBook.data.message}`
  );

  // -------------------------------------------------------------
  // TEST 18: Patient views own appointments (Scoped)
  // -------------------------------------------------------------
  const patOwnAppts = await request('/api/appointments', {
    headers: { Authorization: `Bearer ${patientToken}` }
  });
  const allBelong = patOwnAppts.data?.data?.every(a => (a.patient?._id || a.patient) === patientUser.patientId);
  assert(
    patOwnAppts.status === 200 && allBelong && patOwnAppts.data?.count >= 1,
    18,
    'Patient views own appointments only',
    `Count: ${patOwnAppts.data?.count}, Scoped to patientId: ${patientUser.patientId}`
  );

  // -------------------------------------------------------------
  // TEST 19: Patient cancels own appointment
  // -------------------------------------------------------------
  const patCancel = await request(`/api/appointments/${testAppointmentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({ status: 'Cancelled' })
  });
  assert(
    patCancel.status === 200 && patCancel.data.data?.status === 'Cancelled',
    19,
    'Patient cancels own appointment',
    `Status: ${patCancel.data.data?.status}`
  );

  // -------------------------------------------------------------
  // TEST 20: Patient asks AI Assistant (Triage & Disclaimer)
  // -------------------------------------------------------------
  const aiAsk = await request('/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'I have severe chest pain and shortness of breath' })
  });
  assert(
    aiAsk.status === 200 &&
    aiAsk.data.isEmergency === true &&
    aiAsk.data.disclaimer?.includes('qualified medical professional'),
    20,
    'Patient asks AI Assistant (Emergency Triage & Mandatory Disclaimer)',
    `Emergency: ${aiAsk.data.isEmergency}, Disclaimer: "${aiAsk.data.disclaimer}"`
  );

  // -------------------------------------------------------------
  // TEST 21: Doctor views assigned appointments
  // -------------------------------------------------------------
  const docLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doctor@smartclinic.com', password: 'doctor123' })
  });
  doctorToken = docLogin.data.token;
  doctorUser = docLogin.data.user;

  const docAppts = await request('/api/appointments', {
    headers: { Authorization: `Bearer ${doctorToken}` }
  });
  assert(
    docLogin.status === 200 && docAppts.status === 200 && Array.isArray(docAppts.data.data),
    21,
    'Doctor views assigned appointments',
    `Doctor: ${doctorUser.name}, Appointments: ${docAppts.data.count}`
  );

  // -------------------------------------------------------------
  // TEST 22: Doctor creates medical record & Unauthorized users blocked
  // -------------------------------------------------------------
  // 22A: Patient CANNOT create medical record (403)
  const patCreateRec = await request('/api/medical-records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      patient: patientUser.patientId,
      doctor: testDoctorId,
      visitDate: '2026-11-20',
      diagnosis: 'Patient Trying To Fake Record'
    })
  });
  const patBlocked = patCreateRec.status === 403;

  // 22B: Admin CANNOT create medical record (403)
  const adminCreateRec = await request('/api/medical-records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      patient: patientUser.patientId,
      doctor: testDoctorId,
      visitDate: '2026-11-20',
      diagnosis: 'Admin Trying To Clinical Record'
    })
  });
  const adminBlocked = adminCreateRec.status === 403;

  // 22C: Doctor CAN create medical record (201)
  const docCreateRec = await request('/api/medical-records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${doctorToken}`
    },
    body: JSON.stringify({
      patient: patientUser.patientId,
      doctor: testDoctorId,
      visitDate: '2026-11-20',
      diagnosis: 'Acute Seasonal Bronchitis',
      symptoms: ['Cough', 'Mild fever', 'Throat congestion'],
      vitals: { bloodPressure: '120/80', heartRate: '74', temperature: '99.1 F', oxygenLevel: '98%' },
      prescriptions: [{ medicineName: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration: '5 days' }],
      doctorNotes: 'Rest and hydrate.'
    })
  });
  const docCreated = docCreateRec.status === 201 && docCreateRec.data.data?._id;
  testMedicalRecordId = docCreateRec.data.data?._id;

  assert(
    patBlocked && adminBlocked && docCreated,
    22,
    'Doctor creates medical record; Patient & Admin blocked (403)',
    `Patient 403: ${patBlocked}, Admin 403: ${adminBlocked}, Doctor 201 ID: ${testMedicalRecordId}`
  );

  // Clean up created test record
  if (testMedicalRecordId) {
    await request(`/api/medical-records/${testMedicalRecordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
  }

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 22)`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

baseUrl = `http://localhost:${process.env.PORT || 5050}`;
runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
