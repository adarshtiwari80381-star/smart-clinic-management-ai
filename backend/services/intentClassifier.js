// backend/services/intentClassifier.js
// First-Stage Intent Detection & Conversational Routing System
// MediFlow Smart Clinic AI

const healthKnowledgeEngine = require('./healthKnowledgeEngine');

// ============================================================================
// 1. GREETING & CASUAL PATTERNS
// ============================================================================
const GREETING_PATTERNS = [
  {
    regex: /^(hi+|hey+|heya|hello+|helo+|hola+|namaste|greetings|howdy)\b/i,
    type: 'greeting',
    reply: "Hello! 👋 How can I help you today? Please feel free to describe any symptoms or health questions you have."
  },
  {
    regex: /^good\s*(morning|day)\b/i,
    type: 'greeting',
    reply: "Good morning! ☀️ How can I help you with your health today?"
  },
  {
    regex: /^good\s*afternoon\b/i,
    type: 'greeting',
    reply: "Good afternoon! 😊 What health concern can I assist you with today?"
  },
  {
    regex: /^good\s*(evening|night)\b/i,
    type: 'greeting',
    reply: "Good evening! 🌙 How can I assist you with your health today?"
  },
  {
    regex: /^(how are you|how r u|how do you do|how's it going|hows it going|what's up|whats up|sup)\b/i,
    type: 'casual',
    reply: "I'm doing well, thank you! 😊 How can I assist your health and wellness today?"
  },
  {
    regex: /^(who are you|what can you do|what are you|tell me about yourself)\b/i,
    type: 'casual',
    reply: "I am your MediFlow Clinic Health Assistant. 🤖 I can answer general health questions, provide safe supportive care tips, and help you connect with our clinic doctors."
  },
  {
    regex: /^(thank\s*you|thanks+|thx|thank\s*u|many thanks|much appreciated)\b/i,
    type: 'casual',
    reply: "You're very welcome! 😊 If you have any health questions, feel free to ask."
  },
  {
    regex: /^(ok+|okay+|alright+|got it|cool|sure|fine|understood|k)\b/i,
    type: 'casual',
    reply: "Understood! Let me know whenever you have a health question or symptom you would like guidance on."
  },
  {
    regex: /^(bye+|goodbye+|see you|cya|take care|have a good day|have a nice day)\b/i,
    type: 'casual',
    reply: "Goodbye! Take good care of your health. 👋"
  }
];

// ============================================================================
// 2. HEALTH SYMPTOM & QUERY VOCABULARY
// ============================================================================
const HEALTH_TERMS = [
  // Common conditions & complaints
  'piles', 'pile', 'hemorrhoid', 'hemorrhoids', 'bawasir',
  'constipation', 'constipated', 'stool', 'bowel', 'diarrhea', 'loose motion', 'loose motions',
  'headache', 'head ache', 'migraine', 'throbbing',
  'acidity', 'acid reflux', 'heartburn', 'gerd', 'burning chest', 'sour burps', 'indigestion',
  'stomach pain', 'stomach ache', 'belly pain', 'tummy ache', 'abdominal', 'cramps', 'cramp', 'gastric',
  'fever', 'temperature', 'chills', 'feverish', 'pyrexia',
  'cold', 'cough', 'coughing', 'sore throat', 'runny nose', 'stuffy nose', 'congestion', 'phlegm', 'sneezing', 'sinus',
  'toothache', 'tooth ache', 'tooth', 'teeth', 'dental', 'gum pain',
  'skin itching', 'itchy skin', 'itching', 'rash', 'hives', 'allergy', 'eczema', 'dermatitis',
  'back pain', 'backache', 'spine', 'lumbago', 'stiff back',
  'vomit', 'vomiting', 'nausea', 'nauseous', 'queasy', 'throwing up',
  'menstrual cramps', 'period pain', 'period cramps', 'dysmenorrhea',
  'cut', 'scrape', 'wound', 'abrasion', 'burn', 'bleeding finger',
  'fatigue', 'tired', 'tiredness', 'weakness', 'exhausted', 'exhaustion', 'low energy',
  'sleep', 'insomnia', 'cannot sleep', 'stress', 'anxiety',
  'blood pressure', 'high bp', 'low bp', 'hypertension',
  'diabetes', 'blood sugar', 'glucose', 'insulin',
  'sprain', 'sprained', 'twisted ankle', 'swollen knee', 'joint pain', 'muscle pain',
  'dizzy', 'dizziness', 'lightheaded'
];

// Health action keywords
const HEALTH_ACTIONS = [
  'pain', 'hurts', 'hurting', 'ache', 'aching', 'sore', 'swelling', 'swollen',
  'stiff', 'stiffness', 'itch', 'itchy', 'burning', 'bleeding', 'medicine',
  'tablet', 'syrup', 'ointment', 'cure', 'relief', 'remedy', 'treatment',
  'diagnose', 'diagnosis', 'doctor', 'clinic', 'symptom', 'symptoms'
];

// ============================================================================
// 3. INTENT CLASSIFICATION FUNCTION
// Priority: EMERGENCY -> HEALTH -> GREETING / CASUAL -> UNCLEAR
// ============================================================================
function classifyMessageIntent(message) {
  if (!message || typeof message !== 'string') {
    return { intent: 'unclear', matchedPattern: null };
  }

  const clean = message.trim();
  const lower = clean.toLowerCase();

  // 1. EMERGENCY (HIGHEST PRIORITY)
  // Check if any critical emergency regex matches
  for (const emergency of healthKnowledgeEngine.EMERGENCY_PATTERNS) {
    if (emergency.regex.test(clean)) {
      return {
        intent: 'emergency',
        matchedEmergency: emergency
      };
    }
  }

  // 2. HEALTH QUERY EVALUATION (SECOND PRIORITY)
  // Check for condition keywords or symptom combinations
  const hasHealthTerm = HEALTH_TERMS.some(term => {
    // Word boundary or substring check
    const regex = new RegExp(`\\b${term.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lower);
  });

  const hasHealthAction = HEALTH_ACTIONS.some(action => {
    const regex = new RegExp(`\\b${action}\\b`, 'i');
    return regex.test(lower);
  });

  // Phrases indicating physical complaint: "i have ...", "my ... hurts", "pain in ..."
  const hasComplaintPhrase = /(i have|i am having|i feel|my\s+[a-z]+\s+(hurts|is hurting|is aching|is swollen)|pain in|problem with|what to do for|medicine for)/i.test(lower);

  if (hasHealthTerm || (hasHealthAction && hasComplaintPhrase)) {
    return {
      intent: 'health'
    };
  }

  // 3. GREETING & CASUAL CONVERSATION (THIRD PRIORITY)
  // Only matched if no health symptoms or emergency present
  for (const item of GREETING_PATTERNS) {
    if (item.regex.test(lower)) {
      return {
        intent: item.type,
        reply: item.reply
      };
    }
  }

  // 4. UNCLEAR / VAGUE MESSAGE (FOURTH PRIORITY)
  return {
    intent: 'unclear'
  };
}

// ============================================================================
// 4. ROUTE AND PROCESS MESSAGE
// Executes the appropriate response based on intent.
// ============================================================================
function routeAndProcess(rawQuestion) {
  if (!rawQuestion || typeof rawQuestion !== 'string' || !rawQuestion.trim()) {
    return {
      success: false,
      intent: 'unclear',
      message: 'Please provide a message or question.'
    };
  }

  const cleanQuestion = rawQuestion.trim();
  const classification = classifyMessageIntent(cleanQuestion);

  switch (classification.intent) {
    // ---------------------------------------------------------
    // A. EMERGENCY (Immediate short urgent instructions)
    // ---------------------------------------------------------
    case 'emergency': {
      const emergency = classification.matchedEmergency;
      return {
        success: true,
        intent: 'emergency',
        isEmergency: true,
        category: emergency ? emergency.category : 'Medical Emergency',
        disclaimer: healthKnowledgeEngine.MANDATORY_DISCLAIMER,
        showAppointmentCta: false,
        answer: `🚨 **POTENTIAL MEDICAL EMERGENCY DETECTED (${(emergency ? emergency.category : 'EMERGENCY').toUpperCase()})**

${emergency ? emergency.advice : 'This symptom requires immediate urgent clinical evaluation.'}

**Immediate Actions:**
1. **Call 112 or go to the nearest emergency department immediately.**
2. **Do Not Drive Yourself:** If feeling dizzy, weak, or having severe pain, do not operate a vehicle.
3. **Notify Someone Nearby:** Alert someone with you so they can stay by your side until medical help arrives.
4. **Remain Calm & Rest:** Sit or lie down in a safe, well-ventilated position while emergency help is on the way.

*${healthKnowledgeEngine.MANDATORY_DISCLAIMER}*`
      };
    }

    // ---------------------------------------------------------
    // B. HEALTH QUERY (Route to Health Knowledge Engine)
    // ---------------------------------------------------------
    case 'health': {
      const healthResult = healthKnowledgeEngine.analyzeHealthQuery(cleanQuestion);
      return {
        ...healthResult,
        intent: 'health'
      };
    }

    // ---------------------------------------------------------
    // C. GREETING & CASUAL CONVERSATION (1-2 Short Sentences)
    // ---------------------------------------------------------
    case 'greeting':
    case 'casual': {
      return {
        success: true,
        intent: classification.intent,
        isEmergency: false,
        category: 'Conversational',
        disclaimer: null,
        showAppointmentCta: false,
        answer: classification.reply
      };
    }

    // ---------------------------------------------------------
    // D. UNCLEAR / VAGUE MESSAGE (Short Clarification Question)
    // ---------------------------------------------------------
    case 'unclear':
    default: {
      const lower = cleanQuestion.toLowerCase();
      let clarification = "I'm here to help. Could you tell me what symptoms you're experiencing?";

      if (lower.includes('weird') || lower.includes('wrong') || lower.includes('strange')) {
        clarification = "Sure. Tell me what you're feeling and which part of your body is bothering you.";
      } else if (lower.includes('help') || lower.includes('assist')) {
        clarification = "Of course. Tell me what health concern you're having, and I'll try to guide you.";
      } else if (lower.includes('sick') || lower.includes('ill') || lower.includes('unwell')) {
        clarification = "I'm sorry to hear that you're unwell. Could you tell me what symptoms you're experiencing?";
      }

      return {
        success: true,
        intent: 'unclear',
        isEmergency: false,
        category: 'Clarification',
        disclaimer: null,
        showAppointmentCta: false,
        answer: clarification
      };
    }
  }
}

module.exports = {
  classifyMessageIntent,
  routeAndProcess,
  GREETING_PATTERNS,
  HEALTH_TERMS
};
