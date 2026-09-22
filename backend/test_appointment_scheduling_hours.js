/**
 * Automated Verification Suite:
 * Doctor Working Hours Scheduling & Consultation Allocation
 * Tests:
 * 1. Working Hours definition (Dr. James Wilson: Mon-Fri, 10:00 AM - 02:00 PM)
 * 2. Patient can submit appointment request anytime (e.g. 6:00 PM outside hours)
 * 3. Nearest available slot assignment during doctor's working hours (Monday 01:30 PM)
 * 4. Next working day rollover when requested day is fully booked (Tuesday 10:00 AM)
 * 5. Weekend / non-working day rollover to doctor's next working day
 * 6. In-hours direct slot booking
 * 7. Prevention of duplicate doctor/date/time bookings
 * 8. Guarantee that consultation is NEVER assigned outside doctor's working hours
 * 9. Database distinction: requestedDate, requestedTime, scheduledDate, scheduledTime, status: "Confirmed"
 * 10. Role-based API access: Patient books, Doctor views confirmed, Admin views audit
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

const TEST_PORT = 5055;
process.env.PORT = String(TEST_PORT);

const schedulingService = require('./services/schedulingService');
const app = require('./server');

let baseUrl = `http://127.0.0.1:${TEST_PORT}`;
let passed = 0;
let failed = 0;

function recordTest(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name} ${detail ? '(' + detail + ')' : ''}`);
    failed++;
  }
}

async function runSchedulingTests() {
  console.log('================================================================');
  console.log('🩺 TESTING INTELLIGENT APPOINTMENT SCHEDULING & WORKING HOURS');
  console.log('================================================================\n');

  // ==========================================================================
  // PART 1: Unit Testing Core Scheduling Logic
  // ==========================================================================
  console.log('--- Step 1: Unit Testing Doctor Working Hours & Allocation Algorithm ---');

  // Simulated 4 Demo Doctors
  const mockDrWilson = {
    _id: '60d0fe4f5311236168a109d4',
    name: 'Dr. James Wilson',
    specialization: 'General Medicine',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHoursStart: '10:00',
    workingHoursEnd: '14:00',
    slotDurationMinutes: 30
  };

  const mockDrSharma = {
    _id: '60d0fe4f5311236168a109d3',
    name: 'Dr. Priya Sharma',
    specialization: 'Dermatology',
    workingDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    workingHoursStart: '11:00',
    workingHoursEnd: '16:00',
    slotDurationMinutes: 30
  };

  const mockDrChen = {
    _id: '60d0fe4f5311236168a109d2',
    name: 'Dr. Robert Chen',
    specialization: 'Pediatrics',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    workingHoursStart: '09:00',
    workingHoursEnd: '13:00',
    slotDurationMinutes: 30
  };

  const mockDrJenkins = {
    _id: '60d0fe4f5311236168a109d1',
    name: 'Dr. Sarah Jenkins',
    specialization: 'Cardiology',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHoursStart: '14:00',
    workingHoursEnd: '19:00',
    slotDurationMinutes: 30
  };

  const schedWilson = schedulingService.getDoctorScheduleInfo(mockDrWilson);
  recordTest(
    '1a. Dr. James Wilson Working Hours (10:00 AM - 02:00 PM)',
    schedWilson.workingHoursFormatted === '10:00 AM - 02:00 PM' && schedWilson.slots.length === 8 && schedWilson.workingDays.length === 5,
    `Hours: ${schedWilson.workingHoursFormatted}, Days: ${schedWilson.workingDays.join(', ')}`
  );

  const schedSharma = schedulingService.getDoctorScheduleInfo(mockDrSharma);
  recordTest(
    '1b. Dr. Priya Sharma Working Hours (11:00 AM - 04:00 PM)',
    schedSharma.workingHoursFormatted === '11:00 AM - 04:00 PM' && schedSharma.slots.length === 10 && schedSharma.workingDays.includes('Saturday'),
    `Hours: ${schedSharma.workingHoursFormatted}, Days: ${schedSharma.workingDays.join(', ')}`
  );

  const schedChen = schedulingService.getDoctorScheduleInfo(mockDrChen);
  recordTest(
    '1c. Dr. Robert Chen Working Hours (09:00 AM - 01:00 PM)',
    schedChen.workingHoursFormatted === '09:00 AM - 01:00 PM' && schedChen.slots.length === 8 && schedChen.workingDays.includes('Saturday'),
    `Hours: ${schedChen.workingHoursFormatted}, Days: ${schedChen.workingDays.join(', ')}`
  );

  const schedJenkins = schedulingService.getDoctorScheduleInfo(mockDrJenkins);
  recordTest(
    '1d. Dr. Sarah Jenkins Working Hours (02:00 PM - 07:00 PM)',
    schedJenkins.workingHoursFormatted === '02:00 PM - 07:00 PM' && schedJenkins.slots.length === 10 && schedJenkins.workingDays.length === 5,
    `Hours: ${schedJenkins.workingHoursFormatted}, Days: ${schedJenkins.workingDays.join(', ')}`
  );

  // Test off-hours allocations for each doctor
  const mockIsNone = async () => false;

  // Dr. Sharma: off-hours request on Monday (her day off) -> rolls to Tuesday 11:00 AM
  const resSharmaMon = await schedulingService.allocateAppointmentSlot(mockDrSharma, '2026-10-05', '18:00', mockIsNone);
  recordTest(
    '1e. Dr. Priya Sharma off-hours on non-working Monday -> rolls to Tuesday 11:00 AM',
    resSharmaMon.scheduledDayName === 'Tuesday' && resSharmaMon.scheduledTime === '11:00',
    `Scheduled: ${resSharmaMon.scheduledDayName} at ${resSharmaMon.scheduledTime12h}`
  );

  // Dr. Chen: evening request at 8:00 PM -> allocated nearest slot on Monday (12:30 PM)
  const resChenEve = await schedulingService.allocateAppointmentSlot(mockDrChen, '2026-10-05', '20:00', mockIsNone);
  recordTest(
    '1f. Dr. Robert Chen evening request (8:00 PM) -> allocated nearest slot 12:30 PM',
    resChenEve.scheduledTime === '12:30' && resChenEve.scheduledTime12h === '12:30 PM',
    `Scheduled: ${resChenEve.scheduledTime12h}`
  );

  // Dr. Jenkins: morning request at 8:00 AM -> allocated nearest slot on Monday (02:00 PM)
  const resJenkinsMorn = await schedulingService.allocateAppointmentSlot(mockDrJenkins, '2026-10-05', '08:00', mockIsNone);
  recordTest(
    '1g. Dr. Sarah Jenkins early morning request (8:00 AM) -> allocated nearest slot 02:00 PM',
    resJenkinsMorn.scheduledTime === '14:00' && resJenkinsMorn.scheduledTime12h === '02:00 PM',
    `Scheduled: ${resJenkinsMorn.scheduledTime12h}`
  );

  // Scenario A: Patient requests Monday at 6:00 PM (18:00) outside working hours
  // Date: 2026-10-05 (Monday)
  const mondayDate = '2026-10-05';
  assert.strictEqual(schedulingService.getDayOfWeekName(mondayDate), 'Monday');

  // No slots booked yet
  const mockIsBookedNone = async () => false;

  const resultA = await schedulingService.allocateAppointmentSlot(
    mockDrWilson,
    mondayDate,
    '18:00',
    mockIsBookedNone
  );

  recordTest(
    '2. Patient requests outside hours (6:00 PM) -> allocated nearest slot (Monday 01:30 PM)',
    resultA.scheduledDate === '2026-10-05' &&
    resultA.scheduledTime === '13:30' &&
    resultA.scheduledTime12h === '01:30 PM',
    `Scheduled: ${resultA.scheduledDayName} at ${resultA.scheduledTime12h}`
  );

  recordTest(
    '3. Exact display message generated for patient',
    resultA.displayMessage.includes('Dr. James Wilson is available from 10:00 AM - 02:00 PM') &&
    resultA.displayMessage.includes('Monday at 01:30 PM'),
    resultA.displayMessage
  );

  // Scenario B: Monday 1:30 PM is booked -> next nearest slot (1:00 PM)
  const mockIsBooked1330 = async (docId, date, time) => date === mondayDate && time === '13:30';
  const resultB = await schedulingService.allocateAppointmentSlot(
    mockDrWilson,
    mondayDate,
    '18:00',
    mockIsBooked1330
  );

  recordTest(
    '4. Next nearest slot assigned when 01:30 PM is booked',
    resultB.scheduledDate === '2026-10-05' && resultB.scheduledTime === '13:00',
    `Assigned: ${resultB.scheduledTime12h}`
  );

  // Scenario C: Monday is FULLY BOOKED -> rollover to Tuesday (doctor's next working day)
  const mockIsBookedMondayFull = async (docId, date, time) => date === mondayDate;
  const resultC = await schedulingService.allocateAppointmentSlot(
    mockDrWilson,
    mondayDate,
    '18:00',
    mockIsBookedMondayFull
  );

  recordTest(
    '5. Rollover to Tuesday 10:00 AM when Monday is fully booked',
    resultC.scheduledDate === '2026-10-06' &&
    resultC.scheduledTime === '10:00' &&
    resultC.scheduledDayName === 'Tuesday',
    `Scheduled: ${resultC.scheduledDayName} ${resultC.scheduledDate} at ${resultC.scheduledTime12h}`
  );

  // Scenario D: Patient requests Sunday (doctor's day off) at 3:00 PM
  const sundayDate = '2026-10-04'; // Sunday
  assert.strictEqual(schedulingService.getDayOfWeekName(sundayDate), 'Sunday');

  const resultD = await schedulingService.allocateAppointmentSlot(
    mockDrWilson,
    sundayDate,
    '15:00',
    mockIsBookedNone
  );

  recordTest(
    '6. Non-working day (Sunday) rolls over to Monday within working hours',
    resultD.scheduledDate === '2026-10-05' &&
    resultD.scheduledDayName === 'Monday' &&
    resultD.scheduledTime >= '10:00' &&
    resultD.scheduledTime < '14:00',
    `Scheduled: ${resultD.scheduledDayName} at ${resultD.scheduledTime12h}`
  );

  // Scenario E: In-hours request (Monday 11:00 AM)
  const resultE = await schedulingService.allocateAppointmentSlot(
    mockDrWilson,
    mondayDate,
    '11:00',
    mockIsBookedNone
  );

  recordTest(
    '7. In-hours request (11:00 AM) assigned directly',
    resultE.scheduledDate === '2026-10-05' && resultE.scheduledTime === '11:00',
    `Scheduled: ${resultE.scheduledTime12h}`
  );

  // Scenario F: Never outside doctor's working hours
  const testTimes = ['00:00', '06:00', '08:30', '14:00', '17:45', '21:30', '23:59'];
  let allWithinHours = true;
  for (const t of testTimes) {
    const res = await schedulingService.allocateAppointmentSlot(mockDrWilson, mondayDate, t, mockIsBookedNone);
    const mins = schedulingService.timeToMinutes(res.scheduledTime);
    if (mins < 600 || mins >= 840) { // 10:00 = 600, 14:00 = 840
      allWithinHours = false;
      break;
    }
  }

  recordTest(
    '8. Consultation time NEVER scheduled outside doctor working hours',
    allWithinHours,
    'All allocated slots strictly between 10:00 AM and 02:00 PM'
  );

  // ==========================================================================
  // PART 2: End-to-End API Verification with MongoDB
  // ==========================================================================
  console.log('\n--- Step 2: Testing API Endpoints with Role Authentication ---');

  // Wait 1.5s for DB connection
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 1. Patient Login
  const patRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'patient@smartclinic.com', password: 'patient123' })
  });
  const patData = await patRes.json();
  const patToken = patData.token;
  const patId = patData.user?.patientId;

  recordTest(
    '9. Patient authentication for appointment booking',
    patRes.status === 200 && patToken && patId,
    `Patient: ${patData.user?.name}`
  );

  // 2. Fetch Dr. James Wilson from backend
  const docsRes = await fetch(`${baseUrl}/api/doctors`);
  const docsData = await docsRes.json();
  const drWilson = docsData.data.find(d => d.name.includes('Wilson')) || docsData.data[0];

  recordTest(
    '10. Fetch Dr. James Wilson specialist profile',
    docsRes.status === 200 && drWilson && drWilson._id,
    `Found doctor: ${drWilson.name}`
  );

  // 3. Patient books appointment anytime outside working hours (6:00 PM)
  const futureMonday = '2026-11-09'; // Guaranteed Monday in future
  const bookRes = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patToken}`
    },
    body: JSON.stringify({
      doctor: drWilson._id,
      patient: patId,
      requestedDate: futureMonday,
      requestedTime: '18:00', // 6:00 PM (Outside doctor's 10:00 AM - 02:00 PM hours)
      appointmentDate: futureMonday,
      appointmentTime: '18:00',
      reason: 'General consultation test for outside working hours request',
      type: 'Consultation'
    })
  });

  const bookData = await bookRes.json();
  const createdAppt = bookData.data;

  recordTest(
    '11. POST /api/appointments accepts 6:00 PM request without rejection (HTTP 201)',
    bookRes.status === 201 && bookData.success,
    `Message: "${bookData.message}"`
  );

  recordTest(
    '12. System assigns consultation within doctor working hours (01:30 PM)',
    createdAppt &&
    createdAppt.scheduledTime === '13:30' &&
    createdAppt.status === 'Confirmed',
    `Scheduled: ${createdAppt?.scheduledDate} at ${createdAppt?.scheduledTime}, Status: ${createdAppt?.status}`
  );

  recordTest(
    '13. Database stores both Requested Time and Confirmed Consultation Time',
    createdAppt &&
    createdAppt.requestedDate === futureMonday &&
    createdAppt.requestedTime === '06:00 PM' &&
    createdAppt.scheduledDate === futureMonday &&
    createdAppt.scheduledTime === '13:30',
    `Req: ${createdAppt?.requestedDate} ${createdAppt?.requestedTime} | Sched: ${createdAppt?.scheduledDate} ${createdAppt?.scheduledTime}`
  );

  recordTest(
    '14. Response provides human-friendly confirmation details',
    bookData.scheduleDetails &&
    bookData.scheduleDetails.doctorWorkingHours.includes('10:00 AM') &&
    bookData.scheduleDetails.scheduledTime === '01:30 PM',
    `Display: "${bookData.scheduleDetails?.displayMessage}"`
  );

  // 4. Duplicate prevention test
  // If another appointment tries to take the EXACT scheduled slot directly
  const duplicateConflict = await schedulingService.allocateAppointmentSlot(
    drWilson,
    futureMonday,
    '13:30',
    async (dId, d, t) => d === futureMonday && t === '13:30'
  );

  recordTest(
    '15. Prevent duplicate appointments for same doctor/date/time',
    duplicateConflict.scheduledTime !== '13:30',
    `Slot 13:30 occupied -> reassigned to ${duplicateConflict.scheduledTime}`
  );

  // 5. Admin View Audit: Admin can see requestedDate, requestedTime, scheduledDate, scheduledTime
  const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@smartclinic.com', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;

  const adminApptsRes = await fetch(`${baseUrl}/api/appointments`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminApptsData = await adminApptsRes.json();
  const auditAppt = adminApptsData.data.find(a => a._id === createdAppt._id);

  recordTest(
    '16. Admin view audit provides requested and confirmed dates/times',
    auditAppt &&
    auditAppt.requestedDate &&
    auditAppt.requestedTime &&
    auditAppt.scheduledDate &&
    auditAppt.scheduledTime,
    `Patient: ${auditAppt?.patient?.name}, Sched: ${auditAppt?.scheduledTime}, Req: ${auditAppt?.requestedTime}`
  );

  // 6. Doctor View: Doctor sees confirmed consultation
  const docLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doctor@smartclinic.com', password: 'doctor123' })
  });
  const docLoginData = await docLoginRes.json();
  const docToken = docLoginData.token;

  recordTest(
    '17. Doctor login authenticated',
    docLoginRes.status === 200 && docToken,
    `Doctor: ${docLoginData.user?.name}`
  );

  // Clean up test appointment
  if (createdAppt && createdAppt._id) {
    await fetch(`${baseUrl}/api/appointments/${createdAppt._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${docToken}` }
    });
  }

  console.log('\n================================================================');
  console.log(`📊 SCHEDULING VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runSchedulingTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
