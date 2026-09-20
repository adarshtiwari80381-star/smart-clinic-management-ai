/**
 * Comprehensive Verification Suite for Live Render Backend
 * Target: https://smart-clinic-ai-backend.onrender.com
 */

const RENDER_BASE = 'https://smart-clinic-ai-backend.onrender.com';

async function verifyProductionRender() {
  console.log('========================================================');
  console.log('🌐 TESTING LIVE PRODUCTION BACKEND ON RENDER');
  console.log(`📡 URL: ${RENDER_BASE}`);
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      failed++;
    }
  }

  try {
    // 1. Health Endpoint
    const healthRes = await fetch(`${RENDER_BASE}/api/health`);
    const health = await healthRes.json();
    assert(health.status === 'online', '1. GET /api/health returns online status', `status: ${health.status}`);

    // 2. Admin Login
    const adminRes = await fetch(`${RENDER_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smartclinic.com', password: 'admin123' })
    });
    const adminData = await adminRes.json();
    assert(adminRes.ok && adminData.user.role === 'Admin', '2. Admin Login (admin@smartclinic.com)', `Role: ${adminData.user?.role}`);
    const adminToken = adminData.token;

    // 3. Doctor Login
    const docRes = await fetch(`${RENDER_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@smartclinic.com', password: 'doctor123' })
    });
    const docData = await docRes.json();
    assert(docRes.ok && docData.user.role === 'Doctor', '3. Doctor Login (doctor@smartclinic.com)', `Role: ${docData.user?.role}`);
    const docToken = docData.token;

    // 4. Patient Login
    const patRes = await fetch(`${RENDER_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@smartclinic.com', password: 'patient123' })
    });
    const patData = await patRes.json();
    assert(patRes.ok && patData.user.role === 'Patient', '4. Patient Login (patient@smartclinic.com)', `Role: ${patData.user?.role}`);
    const patToken = patData.token;

    // 5. Patient Directory & Search
    const searchRes = await fetch(`${RENDER_BASE}/api/patients?search=Ananya`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const searchData = await searchRes.json();
    assert(searchRes.ok && searchData.count >= 1, '5. Patient Search (/api/patients?search=Ananya)', `Found: ${searchData.count}`);

    // 6. Doctor Directory
    const docsRes = await fetch(`${RENDER_BASE}/api/doctors`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const docsData = await docsRes.json();
    assert(docsRes.ok && docsData.count >= 1, '6. Doctor Management (/api/doctors)', `Count: ${docsData.count}`);

    // 7. Appointment Booking (Conflict-Free)
    const testDate = '2026-12-' + String(Math.floor(Math.random() * 15) + 10);
    const bookRes = await fetch(`${RENDER_BASE}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patToken}`
      },
      body: JSON.stringify({
        doctor: '60d0fe4f5311236168a109d1',
        appointmentDate: testDate,
        appointmentTime: '15:30',
        reason: 'Production verification consultation'
      })
    });
    const bookData = await bookRes.json();
    assert(bookRes.ok && bookData.data.appointmentTime === '15:30', '7. Appointment Booking', `Slot: ${bookData.data?.appointmentDate?.substring(0, 10)} at 15:30`);
    const createdApptId = bookData.data?._id;

    // 8. Appointment Conflict Detection (HTTP 409)
    const conflictRes = await fetch(`${RENDER_BASE}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        patient: '60d0fe4f5311236168a109e2',
        doctor: '60d0fe4f5311236168a109d1',
        appointmentDate: testDate,
        appointmentTime: '15:30',
        reason: 'Attempted double-booking'
      })
    });
    const conflictData = await conflictRes.json();
    assert(
      conflictRes.status === 409 && conflictData.message === 'Doctor is not available at this time.',
      '8. Appointment Conflict Detection (HTTP 409)',
      `Returned: ${conflictRes.status} "${conflictData.message}"`
    );

    // 9. Medical Record Access (Authorized)
    const recsRes = await fetch(`${RENDER_BASE}/api/medical-records`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const recsData = await recsRes.json();
    assert(recsRes.ok && recsData.count >= 1, '9. Medical Records Retrieval (/api/medical-records)', `Records: ${recsData.count}`);

    // 10. AI Health Assistant - General Query
    const aiRes = await fetch(`${RENDER_BASE}/api/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'I have mild seasonal allergies and sneezing. What can I do?' })
    });
    const aiData = await aiRes.json();
    assert(
      aiRes.ok &&
      aiData.success &&
      aiData.isEmergency === false &&
      aiData.disclaimer.includes('AI Health Assistant provides general health information'),
      '10. AI Health Assistant General Response & Mandatory Disclaimer'
    );

    // 11. AI Health Assistant - Critical Emergency Detection
    const aiEmgRes = await fetch(`${RENDER_BASE}/api/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'I feel sudden severe crushing chest pain radiating to left jaw' })
    });
    const aiEmgData = await aiEmgRes.json();
    assert(
      aiEmgRes.ok &&
      aiEmgData.isEmergency === true &&
      aiEmgData.category === 'Cardiac Emergency',
      '11. AI Emergency Detection (Cardiac Emergency)',
      `Category: ${aiEmgData.category}`
    );

    // 12. Cleanup test appointment
    if (createdApptId) {
      await fetch(`${RENDER_BASE}/api/appointments/${createdApptId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }

    // 13. Logout
    const logoutRes = await fetch(`${RENDER_BASE}/api/auth/logout`, { method: 'POST' });
    const logoutData = await logoutRes.json();
    assert(logoutRes.ok && logoutData.success, '12. Session Invalidation / Logout');

    console.log('========================================================');
    console.log(`Render Production Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');
  } catch (err) {
    console.error('Render test suite failure:', err);
  }
}

verifyProductionRender();
