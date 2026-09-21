/**
 * Test Patient Registration & Authentication against Live Render Production Backend
 */

const RENDER_BASE = 'https://smart-clinic-ai-backend.onrender.com';

async function testLiveRender() {
  console.log('Testing live Render backend at:', RENDER_BASE);

  // 1. Health
  const healthRes = await fetch(`${RENDER_BASE}/api/health`);
  const health = await healthRes.json();
  console.log('Live Render Health:', health);

  // 2. Register new patient
  const regEmail = `live_patient_${Date.now()}@example.com`;
  const regRes = await fetch(`${RENDER_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Render Live Patient',
      email: regEmail,
      password: 'password123',
      phone: '+1 555-8888',
      age: 26,
      gender: 'Female',
      bloodGroup: 'A+',
      address: '100 Medical Center Way'
    })
  });
  const regData = await regRes.json();
  console.log('Live Register HTTP Status:', regRes.status);
  console.log('Live Register Success:', regData.success);
  console.log('Live User Role:', regData.user?.role);
  console.log('Live Linked PatientId:', regData.user?.patientId);

  if (regRes.status !== 201 || !regData.success || regData.user?.role !== 'Patient') {
    throw new Error('Registration against live Render failed');
  }

  // 3. Login with registered patient
  const loginRes = await fetch(`${RENDER_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail, password: 'password123' })
  });
  const loginData = await loginRes.json();
  console.log('Live Login HTTP Status:', loginRes.status);
  console.log('Live Login Role:', loginData.user?.role);

  if (loginRes.status !== 200 || !loginData.token || loginData.user?.role !== 'Patient') {
    throw new Error('Login against live Render failed');
  }

  console.log('✅ LIVE RENDER BACKEND REGISTRATION & LOGIN TEST PASSED!');
}

testLiveRender().catch(err => {
  console.error('Render test failed:', err);
  process.exit(1);
});
