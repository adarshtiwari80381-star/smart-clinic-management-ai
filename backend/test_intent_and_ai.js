// backend/test_intent_and_ai.js
// Test Suite for Intent Classification, Casual UX, Emergency Triage (112), and Patient-Only RBAC

const jwt = require('jsonwebtoken');
const intentClassifier = require('./services/intentClassifier');
const aiController = require('./controllers/aiController');
const User = require('./models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_clinic_jwt_key_2026';

console.log('================================================================');
console.log('TESTING AI INTENT CLASSIFICATION, CASUAL UX, 112 TRIAGE & RBAC');
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
// 1. CASUAL & GREETING INTENT TESTS
// -------------------------------------------------------------
console.log('--- 1. Testing Casual & Greeting Messages ---');

const GREETING_QUERIES = [
  { q: "hii", expectedIntent: "greeting" },
  { q: "hi", expectedIntent: "greeting" },
  { q: "hello", expectedIntent: "greeting" },
  { q: "hey", expectedIntent: "greeting" },
  { q: "good morning", expectedIntent: "greeting" },
  { q: "good afternoon", expectedIntent: "greeting" },
  { q: "how are you", expectedIntent: "casual" },
  { q: "thanks", expectedIntent: "casual" },
  { q: "thank you", expectedIntent: "casual" },
  { q: "okay", expectedIntent: "casual" },
  { q: "ok", expectedIntent: "casual" },
  { q: "bye", expectedIntent: "casual" },
  { q: "goodbye", expectedIntent: "casual" }
];

for (const g of GREETING_QUERIES) {
  const res = intentClassifier.routeAndProcess(g.q);
  assert(res.intent === g.expectedIntent, `"${g.q}" classified as ${g.expectedIntent}`);
  assert(res.isEmergency === false, `"${g.q}" isEmergency is false`);
  assert(res.disclaimer === null, `"${g.q}" has no disclaimer spam`);
  assert(res.showAppointmentCta === false, `"${g.q}" has no appointment CTA`);
  assert(!res.answer.includes('General Clinical Assessment'), `"${g.q}" does not generate clinical assessment`);
  assert(!res.answer.includes('Safe Self-Care'), `"${g.q}" does not show self-care instructions`);
  assert(res.answer.length < 200, `"${g.q}" response is short and conversational (${res.answer.length} chars)`);
}

// -------------------------------------------------------------
// 2. MIXED INTENT PRIORITY TESTS
// -------------------------------------------------------------
console.log('\n--- 2. Testing Intent Priority Routing ---');

// Health overrides Greeting
const healthMixed1 = intentClassifier.routeAndProcess("Hi, I have a headache");
assert(healthMixed1.intent === "health", `"Hi, I have a headache" routes to health (not greeting)`);
assert(healthMixed1.showAppointmentCta === true, `Health query includes appointment CTA`);
assert(healthMixed1.disclaimer !== null, `Health query includes medical disclaimer`);

const healthMixed2 = intentClassifier.routeAndProcess("Good morning, my stomach hurts");
assert(healthMixed2.intent === "health", `"Good morning, my stomach hurts" routes to health`);

// Emergency overrides Greeting & Health
const emergencyMixed1 = intentClassifier.routeAndProcess("Hey, I have severe chest pain");
assert(emergencyMixed1.intent === "emergency", `"Hey, I have severe chest pain" routes to emergency`);
assert(emergencyMixed1.isEmergency === true, `Emergency flag is true`);
assert(emergencyMixed1.showAppointmentCta === false, `Routine appointment CTA suppressed`);
assert(emergencyMixed1.answer.includes('112'), `Emergency response uses Indian emergency number 112`);

const emergencyMixed2 = intentClassifier.routeAndProcess("Hi, I cannot breathe");
assert(emergencyMixed2.intent === "emergency", `"Hi, I cannot breathe" routes to emergency`);
assert(emergencyMixed2.answer.includes('112'), `Emergency respiratory distress cites 112`);

// -------------------------------------------------------------
// 3. UNCLEAR / VAGUE MESSAGE TESTS
// -------------------------------------------------------------
console.log('\n--- 3. Testing Unclear Messages ---');

const UNCLEAR_QUERIES = [
  "Something is wrong",
  "I feel weird",
  "I need help",
  "Can you help me?"
];

for (const u of UNCLEAR_QUERIES) {
  const res = intentClassifier.routeAndProcess(u);
  assert(res.intent === "unclear", `"${u}" classified as unclear`);
  assert(res.isEmergency === false, `"${u}" isEmergency is false`);
  assert(res.disclaimer === null, `"${u}" has no disclaimer`);
  assert(res.showAppointmentCta === false, `"${u}" has no CTA`);
  assert(res.answer.includes('?') || res.answer.toLowerCase().includes('tell me'), `"${u}" asks clarification question`);
  assert(res.answer.length < 200, `"${u}" response is short (${res.answer.length} chars)`);
}

// -------------------------------------------------------------
// 4. HEALTH QUERIES TEST
// -------------------------------------------------------------
console.log('\n--- 4. Testing General Health Queries ---');

const HEALTH_QUERIES = [
  "I have piles",
  "I have constipation",
  "My tooth is hurting",
  "I have acidity",
  "I sprained my ankle",
  "What medicine can help my headache?"
];

for (const h of HEALTH_QUERIES) {
  const res = intentClassifier.routeAndProcess(h);
  assert(res.intent === "health", `"${h}" classified as health`);
  assert(res.isEmergency === false, `"${h}" isEmergency is false`);
  assert(res.showAppointmentCta === true, `"${h}" has appointment CTA`);
  assert(res.disclaimer !== null, `"${h}" has medical disclaimer`);
  assert(!res.answer.includes('You will be completely fine in one day'), `"${h}" does not promise 1-day cure`);
}

// -------------------------------------------------------------
// 5. PATIENT-ONLY RBAC TESTS ON CONTROLLER
// -------------------------------------------------------------
console.log('\n--- 5. Testing Patient-Only RBAC on Controller ---');

// Mock User.findById
const originalFindById = User.findById;
User.findById = async function (id) {
  if (id === 'doc123') return { _id: id, role: 'Doctor', name: 'Dr. Jenkins' };
  if (id === 'admin123') return { _id: id, role: 'Admin', name: 'Admin Boss' };
  if (id === 'pat123') return { _id: id, role: 'Patient', name: 'Alice Patient' };
  return null;
};

// Generate test tokens
const doctorToken = jwt.sign({ id: 'doc123', role: 'Doctor' }, JWT_SECRET);
const adminToken = jwt.sign({ id: 'admin123', role: 'Admin' }, JWT_SECRET);
const patientToken = jwt.sign({ id: 'pat123', role: 'Patient' }, JWT_SECRET);

async function testControllerAuth(token, expectedStatus, testLabel) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: { question: "Hello" }
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { responseData = data; }
      };
    }
  };

  await aiController.askHealthAssistant(req, res, () => {});
  assert(statusCode === expectedStatus, `${testLabel} -> HTTP ${statusCode} (Expected: ${expectedStatus})`);
}

(async () => {
  try {
    await testControllerAuth(doctorToken, 403, "Doctor accessing AI endpoint");
    await testControllerAuth(adminToken, 403, "Admin accessing AI endpoint");
    await testControllerAuth(patientToken, 200, "Patient accessing AI endpoint");
    await testControllerAuth(null, 200, "Unauthenticated visitor accessing AI endpoint");

    // Restore original User.findById
    User.findById = originalFindById;

    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passed} / ${total} assertions passed (${Math.round(passed / total * 100)}%)`);
    console.log('================================================================\n');

    if (passed === total) {
      console.log('🎉 ALL INTENT, CASUAL, 112 & RBAC TESTS PASSED!\n');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED!\n');
      process.exit(1);
    }
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
