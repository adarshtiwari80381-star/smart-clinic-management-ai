/**
 * Verification Suite for All 16 User Registration & Authentication Tests
 * Validates DOM UI Elements, Registration Flow, Validation, Security & Data Scoping
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const htmlPath = path.join(__dirname, '..', 'frontend', 'index.html');
const scriptPath = path.join(__dirname, '..', 'frontend', 'script.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

process.env.PORT = '5051';
const app = require('./server');

let passed = 0;
let failed = 0;

function assert(condition, testNum, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] TEST ${testNum}: ${testName} ${detail ? '(' + detail + ')' : ''}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] TEST ${testNum}: ${testName} ${detail ? '(' + detail + ')' : ''}`);
    failed++;
  }
}

async function request(baseUrl, path, options = {}) {
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

async function runAll16Tests() {
  console.log('================================================================');
  console.log('🧪 TESTING PUBLIC PATIENT REGISTRATION & AUTHENTICATION FLOW (16 TESTS)');
  console.log('================================================================\n');

  const baseUrl = 'http://localhost:5051';

  // Wait 1.5s for DB connection
  await new Promise(resolve => setTimeout(resolve, 1500));

  // -------------------------------------------------------------
  // TEST 1: Fresh website visitor opens -> Login modal is present & triggered
  // -------------------------------------------------------------
  const modalAuthExists = htmlContent.includes('id="modalAuth"');
  const opensOnFresh = scriptContent.includes("openModal('modalAuth')");
  assert(modalAuthExists && opensOnFresh, 1, 'Fresh website opens -> Login modal triggered');

  // -------------------------------------------------------------
  // TEST 2: Check login page -> Admin, Doctor, Patient demo logins & Sign Up visible
  // -------------------------------------------------------------
  const hasAdminDemo = htmlContent.includes("quickLogin('admin@smartclinic.com', 'admin123')");
  const hasDoctorDemo = htmlContent.includes("quickLogin('doctor@smartclinic.com', 'doctor123')");
  const hasPatientDemo = htmlContent.includes("quickLogin('patient@smartclinic.com', 'patient123')");
  const hasSignUpBtn = htmlContent.includes('id="btnGoToRegister"') && htmlContent.includes('Create Patient Account (Sign Up)');
  const hasSignUpTab = htmlContent.includes('id="tabBtnRegister"');

  assert(
    hasAdminDemo && hasDoctorDemo && hasPatientDemo && hasSignUpBtn && hasSignUpTab,
    2,
    'Login modal contains Admin, Doctor, Patient demo logins AND clearly visible Sign Up prompt'
  );

  // -------------------------------------------------------------
  // TEST 3: Click Sign Up -> Patient registration form container exists & wired
  // -------------------------------------------------------------
  const hasRegContainer = htmlContent.includes('id="authRegisterFormContainer"');
  const hasRegForm = htmlContent.includes('id="registerPatientForm"');
  const hasSwitchTabFn = scriptContent.includes('function switchAuthTab(tab)');
  assert(
    hasRegContainer && hasRegForm && hasSwitchTabFn,
    3,
    'Patient registration form container exists and connects to tab switcher'
  );

  // -------------------------------------------------------------
  // TEST 4: Try registering with Admin role -> Impossible through UI
  // -------------------------------------------------------------
  // Verify the registration form does NOT contain any role dropdown or input
  const regFormSlice = htmlContent.substring(
    htmlContent.indexOf('id="registerPatientForm"'),
    htmlContent.indexOf('</form>', htmlContent.indexOf('id="registerPatientForm"'))
  );
  const hasAdminOption = regFormSlice.includes('value="Admin"') || regFormSlice.includes('value="admin"');
  assert(!hasAdminOption, 4, 'Try registering with Admin role -> Impossible through UI (No Admin role option)');

  // -------------------------------------------------------------
  // TEST 5: Try registering with Doctor role -> Impossible through UI & Backend Rejects Spoofing
  // -------------------------------------------------------------
  const hasDoctorOption = regFormSlice.includes('value="Doctor"') || regFormSlice.includes('value="doctor"');
  // Backend spoof test: Send { role: 'Doctor' } to /api/auth/register
  const spoofEmail = `spoof_${Date.now()}@example.com`;
  const spoofRes = await request(baseUrl, '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr Hacker Spoof',
      email: spoofEmail,
      password: 'password123',
      phone: '+1 555-9999',
      role: 'Doctor' // Attacker attempting to gain Doctor role
    })
  });
  const serverForcedPatient = spoofRes.data.user?.role === 'Patient';
  assert(
    !hasDoctorOption && serverForcedPatient,
    5,
    'Try registering with Doctor role -> Impossible through UI; Server forces role = Patient',
    `Resulting Role: ${spoofRes.data.user?.role}`
  );

  // -------------------------------------------------------------
  // TEST 6: Register a new Patient -> Registration succeeds
  // -------------------------------------------------------------
  const testEmail = `newpatient_${Date.now()}@example.com`;
  const regRes = await request(baseUrl, '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Registered Patient',
      email: testEmail,
      password: 'password123',
      phone: '+1 555-7788',
      age: 32,
      gender: 'Male',
      bloodGroup: 'O+',
      address: '742 Evergreen Terrace'
    })
  });
  const newPatientId = regRes.data.user?.patientId;
  assert(
    regRes.status === 201 && regRes.data.success && regRes.data.user?.role === 'Patient' && newPatientId,
    6,
    'Register a new Patient -> Registration succeeds with linked Patient profile',
    `PatientId: ${newPatientId}`
  );

  // -------------------------------------------------------------
  // TEST 7: Try duplicate email -> Registration rejected
  // -------------------------------------------------------------
  const dupRes = await request(baseUrl, '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate John',
      email: testEmail,
      password: 'password123',
      phone: '+1 555-7788'
    })
  });
  assert(
    dupRes.status === 400 && dupRes.data.message?.includes('already exists'),
    7,
    'Try duplicate email -> Registration rejected with 400',
    `Message: "${dupRes.data.message}"`
  );

  // -------------------------------------------------------------
  // TEST 8: Login with newly registered Patient -> Returns token and Patient role
  // -------------------------------------------------------------
  const loginRes = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'password123' })
  });
  const patientToken = loginRes.data.token;
  const loggedPatientUser = loginRes.data.user;
  assert(
    loginRes.status === 200 && loggedPatientUser?.role === 'Patient' && patientToken,
    8,
    'Login with newly registered Patient -> Returns JWT token and Patient role',
    `User: ${loggedPatientUser?.name}, Role: ${loggedPatientUser?.role}`
  );

  // -------------------------------------------------------------
  // TEST 9: New Patient opens appointments -> Can book their own appointment
  // -------------------------------------------------------------
  // Get doctor ID
  const docsRes = await request(baseUrl, '/api/doctors');
  const doctorId = docsRes.data.data?.[0]?._id;
  const apptDate = `2026-12-${String(10 + Math.floor(Math.random() * 15)).padStart(2, '0')}`;
  const apptRes = await request(baseUrl, '/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      doctor: doctorId,
      patient: loggedPatientUser.patientId,
      appointmentDate: apptDate,
      appointmentTime: '02:00 PM',
      reason: 'First Consultation for Registered Patient',
      type: 'Consultation'
    })
  });
  const createdApptId = apptRes.data.data?._id;
  assert(
    apptRes.status === 201 && createdApptId,
    9,
    'New Patient can book their own appointment',
    `Appointment ID: ${createdApptId}`
  );

  // -------------------------------------------------------------
  // TEST 10: New Patient opens medical records -> Only their own records returned
  // -------------------------------------------------------------
  const recsRes = await request(baseUrl, '/api/medical-records', {
    headers: { Authorization: `Bearer ${patientToken}` }
  });
  const allOwnRecs = recsRes.data.data?.every(r => (r.patient?._id || r.patient) === loggedPatientUser.patientId);
  assert(
    recsRes.status === 200 && (recsRes.data.data?.length === 0 || allOwnRecs),
    10,
    'New Patient opens medical records -> Only their own records visible',
    `Count: ${recsRes.data.count}`
  );

  // -------------------------------------------------------------
  // TEST 11: New Patient attempts Admin dashboard/action -> Blocked (403)
  // -------------------------------------------------------------
  const adminAttempt = await request(baseUrl, '/api/doctors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({ name: 'Hacker Doctor' })
  });
  assert(
    adminAttempt.status === 403,
    11,
    'New Patient attempts administrative actions -> Blocked with 403 Forbidden',
    `HTTP ${adminAttempt.status}: ${adminAttempt.data.message}`
  );

  // -------------------------------------------------------------
  // TEST 12: Admin demo login -> Admin Dashboard access
  // -------------------------------------------------------------
  const adminLogin = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@smartclinic.com', password: 'admin123' })
  });
  assert(
    adminLogin.status === 200 && adminLogin.data.user?.role === 'Admin',
    12,
    'Admin demo login -> Succeeded with role: Admin'
  );

  // -------------------------------------------------------------
  // TEST 13: Doctor demo login -> Doctor Dashboard access
  // -------------------------------------------------------------
  const docLogin = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doctor@smartclinic.com', password: 'doctor123' })
  });
  assert(
    docLogin.status === 200 && docLogin.data.user?.role === 'Doctor',
    13,
    'Doctor demo login -> Succeeded with role: Doctor'
  );

  // -------------------------------------------------------------
  // TEST 14: Existing Patient demo login -> Patient Dashboard access
  // -------------------------------------------------------------
  const patLogin = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'patient@smartclinic.com', password: 'patient123' })
  });
  assert(
    patLogin.status === 200 && patLogin.data.user?.role === 'Patient',
    14,
    'Existing Patient demo login -> Succeeded with role: Patient'
  );

  // -------------------------------------------------------------
  // TEST 15: Fresh/incognito browser -> No automatic Admin login
  // -------------------------------------------------------------
  const noAutoAdmin = !scriptContent.includes("quickLogin('admin@smartclinic.com'") &&
                      !scriptContent.includes("handleLogin('admin@smartclinic.com'");
  assert(
    noAutoAdmin,
    15,
    'Fresh/incognito visit -> Strictly unauthenticated, no auto-login as Admin'
  );

  // -------------------------------------------------------------
  // TEST 16: Logout -> Returns to unauthenticated state and opens login modal
  // -------------------------------------------------------------
  const hasLogoutLogic = scriptContent.includes('function logoutUser') &&
                         scriptContent.includes("openModal('modalAuth')") &&
                         scriptContent.includes("localStorage.removeItem('token')");
  assert(
    hasLogoutLogic,
    16,
    'Logout -> Clears session tokens, resets state, and re-prompts login modal'
  );

  console.log('\n================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL 16)`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAll16Tests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
