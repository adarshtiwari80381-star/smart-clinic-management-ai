// AI Health Assistant Controller
// Provides general health information, emergency triage flags, and clinic specialist recommendations.
// Works 100% offline with zero external API dependencies.

const MANDATORY_DISCLAIMER = "AI Health Assistant provides general health information and does not replace a qualified medical professional.";

// Red-flag emergency triggers
const EMERGENCY_PATTERNS = [
  {
    regex: /(chest pain|chest pressure|crushing pain|radiating to arm|heart attack)/i,
    category: 'Cardiac Emergency',
    advice: 'Sudden or severe chest pain can be a sign of a medical emergency such as an acute coronary syndrome. Please call your local emergency number (e.g., 911 / 112 / 999) or visit the nearest emergency room immediately.'
  },
  {
    regex: /(stroke|slurred speech|facial droop|arm weakness|sudden numbness|loss of balance)/i,
    category: 'Neurological Emergency (FAST)',
    advice: 'These symptoms resemble acute stroke indicators (Face drooping, Arm weakness, Speech difficulty, Time to call emergency). Seek immediate emergency medical care without delay.'
  },
  {
    regex: /(cannot breathe|severe shortness of breath|gasping for air|blue lips|choking)/i,
    category: 'Respiratory Distress',
    advice: 'Severe breathing difficulty is a medical emergency. Sit upright in a well-ventilated area and seek immediate emergency medical care or call emergency services.'
  },
  {
    regex: /(unconscious|passed out|fainted and not waking|seizure|convulsions)/i,
    category: 'Critical Neurological Event',
    advice: 'Loss of consciousness or seizures require urgent medical evaluation. Place the person in a recovery position if safe and dial emergency services immediately.'
  },
  {
    regex: /(severe bleeding|hemorrhage|uncontrolled bleeding|deep puncture)/i,
    category: 'Severe Bleeding',
    advice: 'Apply firm, continuous pressure with a clean cloth over the wound. Elevate the injured area if possible and seek emergency medical assistance right away.'
  },
  {
    regex: /(anaphylaxis|swollen tongue|swollen throat|severe allergic reaction)/i,
    category: 'Severe Allergic Reaction',
    advice: 'Anaphylaxis requires immediate epinephrine (EpiPen) if prescribed, followed by emergency medical room evaluation immediately.'
  }
];

// Topic-based intelligent response engine
const KNOWLEDGE_BASE = [
  {
    keywords: ['fever', 'temperature', 'chills', 'cold', 'flu', 'cough', 'sore throat'],
    specialist: 'General Medicine / Pediatrics',
    title: 'Fever & Common Cold/Flu Guidance',
    content: `**General Care & Home Measures:**
• **Hydration:** Drink plenty of fluids (warm water, broths, herbal teas, or electrolyte solutions) to prevent dehydration.
• **Rest:** Give your body ample physical rest to support immune function.
• **Temperature Monitoring:** Track body temperature with an oral or infrared thermometer every 4-6 hours.
• **Comfort:** Dress in lightweight clothing and maintain a comfortable room temperature (avoid bundling up in heavy blankets if shivering has passed).

**When to consult a doctor:**
- A fever exceeding 102°F (38.9°C) or lasting longer than 3 days.
- Presence of shortness of breath, persistent vomiting, or stiff neck.
- In infants or young children under 6 months old with any significant fever.

💡 *You can book an appointment with our General Physician (Dr. James Wilson) or Pediatrician (Dr. Robert Chen) in the Appointments section.*`
  },
  {
    keywords: ['headache', 'migraine', 'head ache', 'throbbing head', 'tension headache'],
    specialist: 'General Medicine / Neurology',
    title: 'Headache Care & Management',
    content: `**General Understanding:**
Headaches are frequently caused by tension, dehydration, eye strain, lack of sleep, or caffeine withdrawal. Migraines may include light sensitivity or nausea.

**Helpful General Measures:**
• **Hydrate:** Sip a large glass of water immediately; dehydration is a frequent underlying trigger.
• **Rest in a Quiet, Dark Room:** Dim lights and reduce screen exposure (smartphones/monitors).
• **Cold/Warm Compress:** Apply a cool compress to your forehead or a warm washcloth to the back of your neck.
• **Gentle Neck Stretches:** Relieve tension from shoulder and neck muscles.

**Red Flags (Consult a physician immediately):**
- A sudden "thunderclap" headache reaching severe intensity within seconds.
- Headache accompanied by fever, neck stiffness, confusion, or speech disturbance.`
  },
  {
    keywords: ['blood pressure', 'hypertension', 'high bp', 'low bp', 'systolic', 'diastolic'],
    specialist: 'Cardiology (Dr. Sarah Jenkins)',
    title: 'Blood Pressure Wellness Information',
    content: `**Understanding Blood Pressure:**
• **Normal:** Less than 120/80 mmHg.
• **Elevated:** 120-129 / <80 mmHg.
• **Hypertension Stage 1:** 130-139 / 80-89 mmHg.
• **Hypertension Stage 2:** 140 or higher / 90 or higher mmHg.

**Lifestyle Recommendations:**
• **DASH Diet Principles:** Emphasize whole grains, leafy vegetables, fruits, and lean proteins while minimizing sodium (<2,300 mg/day).
• **Regular Aerobic Activity:** Aim for at least 150 minutes of moderate aerobic activity weekly (e.g. brisk walking, swimming).
• **Stress Management:** Incorporate daily mindfulness, deep diaphragmatic breathing, and 7-8 hours of restful sleep.
• **Routine Monitoring:** Keep a log of your morning and evening readings to share with your cardiologist.

💡 *Schedule a consultation with our Cardiologist, Dr. Sarah Jenkins, for personalized cardiovascular management.*`
  },
  {
    keywords: ['diabetes', 'blood sugar', 'glucose', 'insulin', 'hba1c', 'sugar level'],
    specialist: 'General Medicine / Endocrinology',
    title: 'Blood Sugar & Metabolic Health',
    content: `**General Guidelines for Blood Sugar Management:**
• **Balanced Nutrition:** Focus on complex carbohydrates with low glycemic index (brown rice, oats, legumes) combined with healthy fibers and proteins.
• **Consistent Meal Timing:** Avoid skipping meals to prevent erratic blood glucose spikes and dips.
• **Physical Activity:** Regular walking after meals helps improve cellular insulin sensitivity.
• **Foot & Skin Care:** Inspect feet daily for cuts, blisters, or signs of infection, as peripheral sensation may be reduced in chronic hyperglycemia.

**Recommended Lab Monitoring:**
- HbA1c screening every 3 to 6 months to evaluate average 90-day glucose control.
- Fasting and post-prandial blood sugar tracking.`
  },
  {
    keywords: ['skin', 'rash', 'itching', 'eczema', 'acne', 'allergy', 'dermatitis'],
    specialist: 'Dermatology (Dr. Priya Sharma)',
    title: 'Skin Care & Dermatological Advice',
    content: `**General Skin Health Recommendations:**
• **Gentle Cleansing:** Use mild, fragrance-free, soap-free cleansers. Avoid harsh scrubbing that disrupts the epidermal barrier.
• **Moisturization:** Apply a ceramide or hyaluronic acid moisturizer within 3 minutes of bathing to seal in skin hydration.
• **Sun Protection:** Use broad-spectrum sunscreen (SPF 30+) daily, even on overcast days.
• **Avoid Scratching:** Scratching inflamed skin can introduce bacterial pathogens leading to secondary infections.

**When to consult our Dermatologist:**
- Rashes that spread rapidly, cause blister formation, or are accompanied by fever.
- Persistent acne or eczema that does not respond to gentle over-the-counter care.

💡 *Dr. Priya Sharma is available for dermatology consultations in Room 305.*`
  },
  {
    keywords: ['stress', 'anxiety', 'sleep', 'insomnia', 'tired', 'fatigue', 'mental health'],
    specialist: 'General Wellness',
    title: 'Stress Relief & Sleep Hygiene',
    content: `**Strategies for Stress & Rest:**
• **Sleep Hygiene:** Maintain a consistent sleep schedule. Avoid blue light and digital screens 1 hour before bed.
• **Box Breathing (4-4-4-4):** Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, hold for 4 seconds. Repeat for 3-5 cycles to activate the parasympathetic nervous system.
• **Limit Stimulants:** Cut down on caffeine, energy drinks, and heavy evening meals after 4:00 PM.
• **Daily Movement:** Even a 20-minute walk in natural sunlight helps regulate circadian rhythm and cortisol levels.`
  },
  {
    keywords: ['diet', 'nutrition', 'weight loss', 'water', 'hydration', 'vitamins'],
    specialist: 'Preventive Health',
    title: 'Nutrition & Daily Wellness',
    content: `**Core Nutritional Foundations:**
• **Adequate Hydration:** Target approximately 2 to 2.5 liters of clean water daily (adjusting for physical activity and climate).
• **Plate Composition:** Fill half your plate with colorful vegetables/greens, one quarter with lean protein, and one quarter with complex fiber-rich grains.
• **Limit Ultra-Processed Foods:** Reduce added refined sugars, trans-fats, and high-fructose corn syrups.
• **Mindful Eating:** Chew thoroughly and listen to satiety cues rather than eating while distracted by screens.`
  }
];

// @desc    Ask AI Health Assistant
// @route   POST /api/ai/ask
// @access  Public / Authenticated
exports.askHealthAssistant = async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a health-related question.'
      });
    }

    const cleanQuestion = question.trim();

    // 1. Check for Critical Emergency Symptoms
    for (const emergency of EMERGENCY_PATTERNS) {
      if (emergency.regex.test(cleanQuestion)) {
        return res.status(200).json({
          success: true,
          isEmergency: true,
          category: emergency.category,
          disclaimer: MANDATORY_DISCLAIMER,
          answer: `🚨 **POTENTIAL MEDICAL EMERGENCY DETECTED (${emergency.category.toUpperCase()})**

${emergency.advice}

**Immediate Actions:**
1. Call your emergency services hotline (e.g. 911, 112, or local ambulance).
2. Do not attempt to drive yourself if you are feeling dizzy, faint, or experiencing severe symptoms.
3. If with someone, notify them immediately so they can assist you.

*${MANDATORY_DISCLAIMER}*`
        });
      }
    }

    // 2. Check if user is asking for direct diagnostic confirmation
    const diagnosisTrigger = /(diagnose me|do i have|what disease is this|confirm my diagnosis|am i dying)/i;
    let diagnosisNotice = '';
    if (diagnosisTrigger.test(cleanQuestion)) {
      diagnosisNotice = `> ⚠️ **Diagnostic Notice:** As an AI Health Assistant, I cannot provide a clinical diagnosis or review lab tests directly. A definitive diagnosis requires physical examination, medical history review, and laboratory/imaging tests by a licensed physician.\n\n`;
    }

    // 3. Match with Knowledge Base
    const matchedTopics = [];
    const questionLower = cleanQuestion.toLowerCase();

    for (const item of KNOWLEDGE_BASE) {
      const matchCount = item.keywords.filter(kw => questionLower.includes(kw)).length;
      if (matchCount > 0) {
        matchedTopics.push({ ...item, matchCount });
      }
    }

    // Sort by relevance
    matchedTopics.sort((a, b) => b.matchCount - a.matchCount);

    let answerBody = '';

    if (matchedTopics.length > 0) {
      const topMatch = matchedTopics[0];
      answerBody = `${diagnosisNotice}### ${topMatch.title}

${topMatch.content}

---
**Next Steps at Our Clinic:**
If your symptoms persist, worsen, or cause significant discomfort, please navigate to the **Appointments** tab to schedule an in-person or follow-up consultation with our medical staff.`;
    } else {
      // General wellness default response
      answerBody = `${diagnosisNotice}Thank you for your question regarding: *"${cleanQuestion}"*.

**General Health Recommendation:**
Health conditions and bodily symptoms can have diverse underlying causes ranging from everyday lifestyle factors (sleep, hydration, nutrition, ergonomics) to medical conditions requiring clinical evaluation.

**General Care Steps:**
• Monitor the onset, duration, severity, and triggers of your symptoms.
• Ensure adequate hydration with clean water and rest.
• Avoid taking prescription medications or modifying dosage without consulting your physician.
• If your symptoms are persistent, unusual, or worsening, we recommend scheduling a visit with our clinic doctors.

**Clinic Specialists Available:**
• **Dr. Sarah Jenkins** - Cardiology & Cardiovascular Health
• **Dr. Robert Chen** - Pediatrics & Child Healthcare
• **Dr. Priya Sharma** - Dermatology & Skin Conditions
• **Dr. James Wilson** - General Medicine & Outpatient Care

You can book an appointment directly through the **Appointments** tab.`;
    }

    res.status(200).json({
      success: true,
      isEmergency: false,
      disclaimer: MANDATORY_DISCLAIMER,
      answer: answerBody
    });
  } catch (err) {
    next(err);
  }
};
