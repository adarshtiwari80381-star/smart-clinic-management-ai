// backend/test_ai_assistant_comprehensive.js
// Comprehensive Automated Test Suite for General-Purpose AI Health Assistant

const healthEngine = require('./services/healthKnowledgeEngine');
const aiController = require('./controllers/aiController');

console.log('================================================================');
console.log('MEDIFLOW AI CLINIC - COMPREHENSIVE AI HEALTH ASSISTANT TESTS');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

// 1. Mandatory 12 Prompt Test Queries
const TEST_CASES = [
  {
    query: "I have piles",
    expectEmergency: false,
    expectedKeywords: ["hemorrhoid", "fiber", "sitz bath", "fluid", "straining"],
    topic: "Piles / Hemorrhoids"
  },
  {
    query: "I have hemorrhoids and pain",
    expectEmergency: false,
    expectedKeywords: ["hemorrhoid", "warm sitz bath", "fiber", "temporary relief"],
    topic: "Hemorrhoids & Pain"
  },
  {
    query: "I have constipation",
    expectEmergency: false,
    expectedKeywords: ["fiber", "water", "stool", "peristalsis"],
    topic: "Constipation"
  },
  {
    query: "I have headache",
    expectEmergency: false,
    expectedKeywords: ["tension", "hydrate", "dark", "rest", "paracetamol"],
    topic: "Headache Care"
  },
  {
    query: "I have acidity",
    expectEmergency: false,
    expectedKeywords: ["reflux", "meals", "upright", "antacid"],
    topic: "Acidity & GERD"
  },
  {
    query: "I have stomach pain",
    expectEmergency: false,
    expectedKeywords: ["bland", "hydration", "warmth", "cramps"],
    topic: "Stomach Pain"
  },
  {
    query: "I have cold and cough",
    expectEmergency: false,
    expectedKeywords: ["fluids", "steam", "gargle", "rest"],
    topic: "Cold & Cough"
  },
  {
    query: "I have mild fever",
    expectEmergency: false,
    expectedKeywords: ["hydration", "temperature", "rest", "paracetamol"],
    topic: "Mild Fever"
  },
  {
    query: "My tooth is hurting",
    expectEmergency: false,
    expectedKeywords: ["salt water", "floss", "cold compress", "dental"],
    topic: "Toothache"
  },
  {
    query: "I have skin itching",
    expectEmergency: false,
    expectedKeywords: ["scratch", "moisturiz", "cool compress", "dermatol"],
    topic: "Skin Itching"
  },
  {
    query: "I have severe chest pain",
    expectEmergency: true,
    expectedKeywords: ["cardiac emergency", "911", "emergency", "immediate"],
    topic: "Emergency Severe Chest Pain"
  },
  {
    query: "I am having difficulty breathing",
    expectEmergency: true,
    expectedKeywords: ["emergency", "respiratory", "immediate", "services"],
    topic: "Emergency Respiratory Distress"
  },
  // Unseen / Novel Dynamic Symptom Cases (Tier 3)
  {
    query: "I have severe menstrual cramps",
    expectEmergency: false,
    expectedKeywords: ["cramps", "uterine", "warmth", "temporary relief"],
    topic: "Novel Query: Menstrual Cramps"
  },
  {
    query: "I sprained my ankle playing basketball and it is swollen",
    expectEmergency: false,
    expectedKeywords: ["r.i.c.e.", "rest", "ice", "elevat"],
    topic: "Novel Query: Sprained Ankle (Dynamic Analyzer)"
  },
  {
    query: "I cut my finger with a knife while chopping vegetables",
    expectEmergency: false,
    expectedKeywords: ["bleeding", "clean", "water", "dressing", "bandage"],
    topic: "Novel Query: Minor Cut First Aid"
  },
  {
    query: "I am feeling extremely fatigued and weak",
    expectEmergency: false,
    expectedKeywords: ["sleep", "hydration", "nutrition", "fatigue"],
    topic: "Novel Query: Fatigue & Weakness"
  }
];

console.log(`Running evaluation across ${TEST_CASES.length} diverse queries...\n`);

for (const testCase of TEST_CASES) {
  console.log(`--- Testing Query: "${testCase.query}" [${testCase.topic}] ---`);
  const result = healthEngine.analyzeHealthQuery(testCase.query);

  assert(result.success === true, `Response returned success: true`);
  assert(typeof result.answer === 'string' && result.answer.length > 80, `Answer is rich and informative (${result.answer.length} chars)`);

  // Verify Mandatory Disclaimer
  assert(
    result.disclaimer.includes("AI Health Assistant provides general health information and does not replace a qualified medical professional"),
    `Contains mandatory medical disclaimer`
  );

  if (testCase.expectEmergency) {
    // Emergency checks
    assert(result.isEmergency === true, `Emergency triage correctly triggered (isEmergency: true)`);
    assert(result.showAppointmentCta === false, `Routine appointment CTA suppressed during critical emergency`);
    assert(/emergency services|911|112|999|emergency room/i.test(result.answer), `Directs immediately to call emergency services`);
  } else {
    // Non-emergency checks
    assert(result.isEmergency === false, `Non-emergency query flagged as isEmergency: false`);
    assert(result.showAppointmentCta === true, `Includes appointment CTA flag (showAppointmentCta: true)`);

    // Must NOT claim definitive diagnosis
    assert(!/you definitely have|i diagnose you with|this is definitely/i.test(result.answer), `No definitive diagnosis claimed`);

    // Must NOT promise a 1-day cure
    assert(!/cured in one day|cured in 1 day|you will be completely fine tomorrow/i.test(result.answer), `No 1-day recovery promise made`);

    // Must contain safe relief caution
    assert(
      result.answer.includes("These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day") ||
      result.answer.includes("temporary relief"),
      `Contains safe temporary relief disclaimer`
    );

    // Must contain structured sections A, B, C, D
    assert(result.answer.includes("A. What this symptom/condition may commonly be") || result.answer.includes("General Clinical Assessment"), `Contains section A (cautious cause)`);
    assert(result.answer.includes("B. What you can do now") || result.answer.includes("Safe Self-Care"), `Contains section B (safe self-care)`);
    assert(result.answer.includes("C. Medication & OTC Guidance") || result.answer.includes("Medication"), `Contains section C (OTC advice, pharmacist review)`);
    assert(result.answer.includes("D. Warning Signs"), `Contains section D (red-flag warnings)`);

    // Must recommend booking appointment
    assert(
      result.answer.includes("Need a proper evaluation? Book an appointment with a doctor from the Appointments section") ||
      result.answer.includes("Book Appointment"),
      `Contains clear doctor appointment CTA`
    );

    // Check expected domain keywords
    const answerLower = result.answer.toLowerCase();
    const foundKeywords = testCase.expectedKeywords.filter(k => answerLower.includes(k.toLowerCase()));
    assert(foundKeywords.length > 0, `Matched expected domain terms: [${foundKeywords.join(', ')}]`);
  }
  console.log('');
}

// Test Express Controller wrapper
console.log('--- Testing AI Controller Express Interface ---');
const fakeReq = { body: { question: "I have piles and constipation" } };
let fakeResJson = null;
let fakeResStatus = null;
const fakeRes = {
  status: (code) => {
    fakeResStatus = code;
    return {
      json: (data) => { fakeResJson = data; }
    };
  }
};

aiController.askHealthAssistant(fakeReq, fakeRes, (err) => {
  if (err) console.error(err);
});

assert(fakeResStatus === 200, `Controller returns HTTP status 200`);
assert(fakeResJson && fakeResJson.success === true, `Controller returns valid JSON payload with success: true`);
assert(fakeResJson.category.includes("Hemorrhoid") || fakeResJson.category.includes("Constipation"), `Controller matched appropriate category`);

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} assertions passed (${Math.round(passedTests / totalTests * 100)}%)`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL AI HEALTH ASSISTANT TESTS PASSED PERFECTLY!\n');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
