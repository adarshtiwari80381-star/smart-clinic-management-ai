async function testAllUserFlows() {
  console.log('========================================================');
  console.log('🚀 TESTING ALL 22 FLOWS FOR SMART CLINIC MANAGEMENT SYSTEM');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('  ✅ [PASS] ' + message);
      passed++;
    } else {
      console.error('  ❌ [FAIL] ' + message);
      failed++;
    }
  }

  try {
    // 1. Healthcheck
    const healthRes = await fetch('http://localhost:5000/api/health');
    const health = await healthRes.json();
    assert(health.status === 'online', '1. Server Healthcheck (http://localhost:5000/api/health)');

    // 2. Admin Login (admin@smartclinic.com / admin123)
    const adminRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smartclinic.com', password: 'admin123' })
    });
    const adminData = await adminRes.json();
    assert(adminData.success && adminData.user.role === 'Admin', '2. Admin Login (admin@smartclinic.com / admin123)');
    const adminToken = adminData.token;

    // 3. Doctor Login (doctor@smartclinic.com / doctor123)
    const docRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@smartclinic.com', password: 'doctor123' })
    });
    const docData = await docRes.json();
    assert(docData.success && docData.user.role === 'Doctor', '3. Doctor Login (doctor@smartclinic.com / doctor123)');
    const docToken = docData.token;

    // 4. Patient Login (patient@smartclinic.com / patient123)
    const patRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@smartclinic.com', password: 'patient123' })
    });
    const patData = await patRes.json();
    assert(patData.success && patData.user.role === 'Patient', '4. Patient Login (patient@smartclinic.com / patient123)');
    const patToken = patData.token;

    // 5. Add Patient
    const newPatRes = await fetch('http://localhost:5000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({
        name: 'Flow Test Patient',
        phone: '+1 (555) 999-1234',
        email: 'flow.patient@test.com',
        age: 29,
        gender: 'Female',
        bloodGroup: 'B+',
        address: '77 Test Way',
        allergies: ['Dust'],
        medicalHistory: ['Mild Gastritis']
      })
    });
    const newPatData = await newPatRes.json();
    assert(newPatData.success && newPatData.data.name === 'Flow Test Patient', '5. Add Patient');
    const createdPatId = newPatData.data._id;

    // 6. Edit Patient
    const editPatRes = await fetch('http://localhost:5000/api/patients/' + createdPatId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ age: 30, address: '88 Updated Test Way' })
    });
    const editPatData = await editPatRes.json();
    assert(editPatData.success && editPatData.data.age === 30, '6. Edit Patient');

    // 7. Search Patient
    const searchPatRes = await fetch('http://localhost:5000/api/patients?search=Flow', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const searchPatData = await searchPatRes.json();
    assert(searchPatData.success && searchPatData.count >= 1, '7. Search Patient');

    // 8. Delete Patient
    const delPatRes = await fetch('http://localhost:5000/api/patients/' + createdPatId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const delPatData = await delPatRes.json();
    assert(delPatData.success, '8. Delete Patient');

    // 9. Add Doctor
    const newDocRes = await fetch('http://localhost:5000/api/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({
        name: 'Dr. Flow Test',
        specialization: 'Neurology',
        qualifications: 'MD, DM Neurology',
        experienceYears: 7,
        email: 'dr.flow@clinic.com',
        phone: '+1 (555) 888-4321',
        consultationFee: 110,
        roomNumber: 'Room 402'
      })
    });
    const newDocData = await newDocRes.json();
    assert(newDocData.success && newDocData.data.specialization === 'Neurology', '9. Add Doctor');
    const createdDocId = newDocData.data._id;

    // 10. Edit Doctor
    const editDocRes = await fetch('http://localhost:5000/api/doctors/' + createdDocId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ consultationFee: 130 })
    });
    const editDocData = await editDocRes.json();
    assert(editDocData.success && editDocData.data.consultationFee === 130, '10. Edit Doctor');

    // 11. Delete Doctor
    const delDocRes = await fetch('http://localhost:5000/api/doctors/' + createdDocId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const delDocData = await delDocRes.json();
    assert(delDocData.success, '11. Delete Doctor');

    // 12. Book Appointment
    const testDate = '2026-11-' + String(Math.floor(Math.random() * 20) + 10);
    const bookRes = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + patToken },
      body: JSON.stringify({
        doctor: '60d0fe4f5311236168a109d1',
        appointmentDate: testDate,
        appointmentTime: '11:00',
        reason: 'General cardiology inquiry'
      })
    });
    const bookData = await bookRes.json();
    assert(bookData.success && bookData.data.appointmentTime === '11:00', '12. Book Appointment');
    const createdApptId = bookData.data._id;

    // 13. Appointment Conflict Check (Double booking same doctor, date & time)
    const conflictRes = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({
        patient: '60d0fe4f5311236168a109e2',
        doctor: '60d0fe4f5311236168a109d1',
        appointmentDate: testDate,
        appointmentTime: '11:00',
        reason: 'Double booking test'
      })
    });
    const conflictData = await conflictRes.json();
    assert(conflictRes.status === 409 && conflictData.message === 'Doctor is not available at this time.', '13. Appointment Conflict Detection (HTTP 409)');

    // 14. Appointment Status Change (Confirmed)
    const statusRes = await fetch('http://localhost:5000/api/appointments/' + createdApptId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + docToken },
      body: JSON.stringify({ status: 'Confirmed' })
    });
    const statusData = await statusRes.json();
    assert(statusData.success && statusData.data.status === 'Confirmed', '14. Appointment Status Update (Confirmed)');

    // 15. Medical Record Creation
    const recRes = await fetch('http://localhost:5000/api/medical-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + docToken },
      body: JSON.stringify({
        patient: '60d0fe4f5311236168a109e1',
        doctor: '60d0fe4f5311236168a109d1',
        appointment: createdApptId,
        visitDate: '2026-10-15',
        diagnosis: 'Normal Cardiac Evaluation',
        vitals: { bloodPressure: '120/80 mmHg', heartRate: '72 bpm' },
        prescriptions: [{ medicineName: 'Vitamin C', dosage: '500mg', frequency: 'Daily', duration: '30 days' }],
        doctorNotes: 'Heart sounds regular and clear.'
      })
    });
    const recData = await recRes.json();
    assert(recData.success && recData.data.diagnosis === 'Normal Cardiac Evaluation', '15. Medical Record Creation');
    const createdRecId = recData.data._id;

    // 16. Medical Record Editing
    const editRecRes = await fetch('http://localhost:5000/api/medical-records/' + createdRecId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + docToken },
      body: JSON.stringify({ diagnosis: 'Normal Cardiac Assessment - Optimal' })
    });
    const editRecData = await editRecRes.json();
    assert(editRecData.success && editRecData.data.diagnosis === 'Normal Cardiac Assessment - Optimal', '16. Medical Record Editing');

    // 17. Medical Record Deletion
    const delRecRes = await fetch('http://localhost:5000/api/medical-records/' + createdRecId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + docToken }
    });
    const delRecData = await delRecRes.json();
    assert(delRecData.success, '17. Medical Record Deletion');

    // Clean up created test appointment
    await fetch('http://localhost:5000/api/appointments/' + createdApptId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });

    // 18. Patient Profile Access
    const patSelfRes = await fetch('http://localhost:5000/api/patients/60d0fe4f5311236168a109e1', {
      headers: { 'Authorization': 'Bearer ' + patToken }
    });
    const patSelfData = await patSelfRes.json();
    assert(patSelfData.success && patSelfData.data.name === 'John Doe', '18. Patient Profile Access');

    // 19. AI Health Assistant - General Query
    const aiGeneralRes = await fetch('http://localhost:5000/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'What diet helps manage hypertension?' })
    });
    const aiGeneralData = await aiGeneralRes.json();
    assert(aiGeneralData.success && aiGeneralData.disclaimer.includes('AI Health Assistant provides general health information'), '19. AI Health Assistant & Mandatory Disclaimer');

    // 20. AI Health Assistant - Emergency Detection
    const aiEmerRes = await fetch('http://localhost:5000/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'I am experiencing severe shortness of breath and blue lips' })
    });
    const aiEmerData = await aiEmerRes.json();
    assert(aiEmerData.success && aiEmerData.isEmergency === true, '20. AI Emergency Symptom Detection');

    // 21. Frontend Delivery
    const htmlRes = await fetch('http://localhost:5000/static/index.html');
    assert(htmlRes.status === 200, '21. Frontend Delivery (http://localhost:5000/static/index.html)');

    // 22. Logout
    const logoutRes = await fetch('http://localhost:5000/api/auth/logout', { method: 'POST' });
    const logoutData = await logoutRes.json();
    assert(logoutData.success, '22. Logout');

    console.log('========================================================');
    console.log(`Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');
  } catch (e) {
    console.error('Test execution error:', e);
  }
}

testAllUserFlows();
