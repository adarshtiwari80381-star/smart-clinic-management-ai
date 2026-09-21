// backend/test_ai_role_visibility.js
// Verification Suite for Strict Role-Based Visibility of AI Health Assistant

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const aiController = require('./controllers/aiController');
const User = require('./models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_clinic_jwt_key_2026';

console.log('================================================================');
console.log('🧪 TESTING STRICT ROLE-BASED VISIBILITY & ACCESS OF AI ASSISTANT');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

// -------------------------------------------------------------
// 1. STATIC HTML AUDIT
// -------------------------------------------------------------
console.log('--- 1. Static HTML Audit ---');
const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');

// Ensure default display: none on static elements so they don't flash before JS initializes
assert(
  indexHtml.includes('id="btnDashAiAssistant" style="display: none;"'),
  'Dashboard "Consult AI Assistant" button is hidden by default in static HTML'
);

assert(
  indexHtml.includes('id="navItemAiAssistant" style="display: none;"'),
  'Static sidebar AI Assistant navigation item is hidden by default in static HTML'
);

// -------------------------------------------------------------
// 2. FRONTEND JAVASCRIPT LOGIC AUDIT
// -------------------------------------------------------------
console.log('\n--- 2. Frontend JavaScript RBAC Logic Audit ---');
const scriptJs = fs.readFileSync(path.join(__dirname, '../frontend/script.js'), 'utf8');

// A. Check updateNavForRole()
// Admin items must not have ai-assistant
const adminNavMatch = scriptJs.match(/if\s*\(\s*role\s*===\s*'Admin'\s*\)\s*\{[\s\S]*?items\s*=\s*\[([\s\S]*?)\];/);
assert(adminNavMatch && !adminNavMatch[1].includes('ai-assistant'), 'Admin navigation items EXCLUDE ai-assistant');

// Doctor items must not have ai-assistant
const docNavMatch = scriptJs.match(/else\s*if\s*\(\s*role\s*===\s*'Doctor'\s*\)\s*\{[\s\S]*?items\s*=\s*\[([\s\S]*?)\];/);
assert(docNavMatch && !docNavMatch[1].includes('ai-assistant'), 'Doctor navigation items EXCLUDE ai-assistant');

// Patient items MUST have ai-assistant
const patNavMatch = scriptJs.match(/else\s*if\s*\(\s*role\s*===\s*'Patient'\s*\)\s*\{[\s\S]*?items\s*=\s*\[([\s\S]*?)\];/);
assert(patNavMatch && patNavMatch[1].includes('ai-assistant'), 'Patient navigation items INCLUDE ai-assistant');

// Guest items must not have ai-assistant
const guestNavMatch = scriptJs.match(/else\s*\{[\s\S]*?items\s*=\s*\[([\s\S]*?)\];/);
assert(guestNavMatch && !guestNavMatch[1].includes('ai-assistant'), 'Guest navigation items EXCLUDE ai-assistant');

// B. Check updateAuthUI()
assert(
  scriptJs.includes("btnDashAiAssistant.style.display = user.role === 'Patient' ? 'inline-flex' : 'none'"),
  'updateAuthUI strictly displays btnDashAiAssistant only for Patient role'
);

assert(
  scriptJs.includes("if (secAiAssistant && user.role !== 'Patient')"),
  'updateAuthUI strictly forces view-ai-assistant section to display: none for non-patient roles'
);

// C. Check switchView() Route Guards
assert(
  scriptJs.includes("if (viewId === 'settings' || viewId === 'reports' || viewId === 'ai-assistant')") &&
  scriptJs.includes("Doctors use the Consultation Workspace"),
  'switchView blocks Doctor from accessing ai-assistant view'
);

assert(
  scriptJs.includes("if (viewId === 'consultation' || viewId === 'ai-assistant')") &&
  scriptJs.includes("AI Health Assistant is reserved for patients"),
  'switchView blocks Admin from accessing ai-assistant view'
);

// -------------------------------------------------------------
// 3. BACKEND API AUTHORIZATION AUDIT (HTTP 403)
// -------------------------------------------------------------
console.log('\n--- 3. Backend API Authorization Audit ---');

// Mock User.findById
const originalFindById = User.findById;
User.findById = async function (id) {
  if (id === 'doc_rbac_test') return { _id: id, role: 'Doctor', name: 'Dr. Test' };
  if (id === 'admin_rbac_test') return { _id: id, role: 'Admin', name: 'Admin Test' };
  if (id === 'pat_rbac_test') return { _id: id, role: 'Patient', name: 'Patient Test' };
  return null;
};

const doctorToken = jwt.sign({ id: 'doc_rbac_test', role: 'Doctor' }, JWT_SECRET);
const adminToken = jwt.sign({ id: 'admin_rbac_test', role: 'Admin' }, JWT_SECRET);
const patientToken = jwt.sign({ id: 'pat_rbac_test', role: 'Patient' }, JWT_SECRET);

async function testBackendAuth(token, expectedStatus, label) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: { question: "I have a headache" }
  };
  let code = null;
  let json = null;
  const res = {
    status: (s) => {
      code = s;
      return { json: (d) => { json = d; } };
    }
  };

  await aiController.askHealthAssistant(req, res, () => {});
  assert(
    code === expectedStatus,
    `${label} -> Status ${code} (Expected: ${expectedStatus})`
  );
  if (expectedStatus === 403) {
    assert(json && json.success === false && json.message.includes('Access denied'), `${label} returns proper 403 denial message`);
  } else if (expectedStatus === 200) {
    assert(json && json.success === true, `${label} returns successful health guidance`);
  }
}

(async () => {
  try {
    await testBackendAuth(adminToken, 403, "Admin invoking POST /api/ai/ask");
    await testBackendAuth(doctorToken, 403, "Doctor invoking POST /api/ai/ask");
    await testBackendAuth(patientToken, 200, "Patient invoking POST /api/ai/ask");
    await testBackendAuth(null, 200, "Public prospective patient invoking POST /api/ai/ask");

    // Restore User.findById
    User.findById = originalFindById;

    console.log('\n================================================================');
    console.log(`TOTAL RESULTS: ${passed} / ${total} tests passed (${Math.round(passed / total * 100)}%)`);
    console.log('================================================================\n');

    if (passed === total) {
      console.log('🎉 ALL ROLE-BASED VISIBILITY & SECURITY TESTS PASSED PERFECTLY!\n');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED!\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
})();
