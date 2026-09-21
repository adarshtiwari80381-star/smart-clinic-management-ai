/**
 * Automated Verification: Production Authentication & Session Isolation
 * Tests against Render Backend: https://smart-clinic-ai-backend.onrender.com
 */

const RENDER_BASE = 'https://smart-clinic-ai-backend.onrender.com';

async function testAuthSuite() {
  console.log('========================================================');
  console.log('🧪 TESTING AUTHENTICATION & ROLE ISOLATION ON LIVE RENDER');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // 1. Healthcheck
  const healthRes = await fetch(`${RENDER_BASE}/api/health`);
  const health = await healthRes.json();
  assert(healthRes.ok && health.status === 'online', '1. Backend Healthcheck', `status: ${health.status}`);

  // 2. Unauthenticated Protected Route Access Must Return 401
  const unauthRes = await fetch(`${RENDER_BASE}/api/patients`);
  assert(unauthRes.status === 401, '2. Unauthenticated request to /api/patients returns 401', `HTTP ${unauthRes.status}`);

  const unauthApptRes = await fetch(`${RENDER_BASE}/api/appointments`);
  assert(unauthApptRes.status === 401, '3. Unauthenticated request to /api/appointments returns 401', `HTTP ${unauthApptRes.status}`);

  const unauthRecordsRes = await fetch(`${RENDER_BASE}/api/medical-records`);
  assert(unauthRecordsRes.status === 401, '4. Unauthenticated request to /api/medical-records returns 401', `HTTP ${unauthRecordsRes.status}`);

  // 3. Admin Authentication
  const adminRes = await fetch(`${RENDER_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@smartclinic.com', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  assert(adminRes.ok && adminData.success && adminData.user.role === 'Admin', '5. Admin Login', `Role: ${adminData.user?.role}, Name: ${adminData.user?.name}`);
  const adminToken = adminData.token;

  // Verify Admin sees all patients
  const adminPatientsRes = await fetch(`${RENDER_BASE}/api/patients`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminPatientsData = await adminPatientsRes.json();
  assert(adminPatientsRes.ok && adminPatientsData.count >= 2, '6. Admin access to full patient roster', `Patients count: ${adminPatientsData.count}`);

  // 4. Doctor Authentication
  const docRes = await fetch(`${RENDER_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doctor@smartclinic.com', password: 'doctor123' })
  });
  const docData = await docRes.json();
  assert(docRes.ok && docData.success && docData.user.role === 'Doctor', '7. Doctor Login', `Role: ${docData.user?.role}, Name: ${docData.user?.name}`);

  // 5. Patient Authentication
  const patRes = await fetch(`${RENDER_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'patient@smartclinic.com', password: 'patient123' })
  });
  const patData = await patRes.json();
  assert(patRes.ok && patData.success && patData.user.role === 'Patient', '8. Patient Login', `Role: ${patData.user?.role}, Name: ${patData.user?.name}`);
  assert(!!patData.user.patientId, '9. Patient object contains valid patientId', `patientId: ${patData.user?.patientId}`);
  const patToken = patData.token;

  // Verify Patient data scoping (Patient only sees their own profile, not all patients)
  const patPatientsRes = await fetch(`${RENDER_BASE}/api/patients`, {
    headers: { Authorization: `Bearer ${patToken}` }
  });
  const patPatientsData = await patPatientsRes.json();
  assert(patPatientsRes.ok && patPatientsData.count === 1, '10. Patient data scoping: /api/patients returns ONLY own profile', `Count: ${patPatientsData.count} (expected 1)`);
  assert(patPatientsData.data[0]._id === patData.user.patientId, '11. Returned profile matches user.patientId', `ID: ${patPatientsData.data[0]?._id}`);

  // Verify Patient appointments scoping
  const patApptsRes = await fetch(`${RENDER_BASE}/api/appointments`, {
    headers: { Authorization: `Bearer ${patToken}` }
  });
  const patApptsData = await patApptsRes.json();
  assert(patApptsRes.ok && Array.isArray(patApptsData.data), '12. Patient appointments retrieval', `Appointments count: ${patApptsData.count}`);
  const allOwn = patApptsData.data.every(a => (a.patient?._id || a.patient) === patData.user.patientId);
  assert(allOwn, '13. All returned appointments belong strictly to logged-in patient');

  // Verify Patient medical records scoping
  const patRecsRes = await fetch(`${RENDER_BASE}/api/medical-records`, {
    headers: { Authorization: `Bearer ${patToken}` }
  });
  const patRecsData = await patRecsRes.json();
  assert(patRecsRes.ok && Array.isArray(patRecsData.data), '14. Patient medical records retrieval', `Records count: ${patRecsData.count}`);
  const allOwnRecs = patRecsData.data.every(r => (r.patient?._id || r.patient) === patData.user.patientId);
  assert(allOwnRecs, '15. All returned medical records belong strictly to logged-in patient');

  // 6. Test Invalid Credentials
  const badLoginRes = await fetch(`${RENDER_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fake@smartclinic.com', password: 'wrong' })
  });
  assert(badLoginRes.status === 401, '16. Invalid credentials rejected with HTTP 401', `HTTP ${badLoginRes.status}`);

  console.log('\n========================================================');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');
}

testAuthSuite().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
