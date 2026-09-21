// backend/services/healthKnowledgeEngine.js
// Scalable Clinical Intelligence & General-Purpose Health Query Engine
// MediFlow Smart Clinic AI - Zero External API Dependency

const MANDATORY_DISCLAIMER = "AI Health Assistant provides general health information and does not replace a qualified medical professional.";

// ============================================================================
// 1. EMERGENCY TRIAGE CRITICAL PATTERNS
// ============================================================================
const EMERGENCY_PATTERNS = [
  {
    regex: /(severe chest pain|crushing (chest )?pain|chest pressure|radiating to arm|radiating to jaw|heart attack)/i,
    category: 'Cardiac Emergency',
    advice: 'Sudden, crushing, or severe chest pain—especially if radiating to your arm, neck, jaw, or accompanied by sweating and shortness of breath—can signal an acute coronary event or other life-threatening condition. Please call emergency services (e.g. 911 / 112 / 999) or proceed to the nearest emergency department immediately.'
  },
  {
    regex: /(stroke|facial droop|face drooping|arm weakness|slurred speech|sudden numbness|sudden paralysis|loss of balance and vision)/i,
    category: 'Neurological Emergency (FAST)',
    advice: 'These symptoms are classic signs of an acute stroke (Face drooping, Arm weakness, Speech difficulty, Time to call emergency). Every minute counts. Seek emergency medical care or call your local emergency ambulance immediately.'
  },
  {
    regex: /(cannot breathe|difficulty breathing|shortness of breath|trouble breathing|hard to breathe|breathless|gasping for air|struggling to breathe|choking|blue lips|blue face)/i,
    category: 'Acute Respiratory Distress',
    advice: 'Severe breathing difficulty or inability to catch your breath is an acute emergency. Sit upright in an airy space, avoid exertion, and contact emergency services or visit the nearest emergency room immediately.'
  },
  {
    regex: /(passed out|unconscious|fainted and not waking|loss of consciousness|seizure|convulsions|epileptic fit)/i,
    category: 'Critical Neurological Event / Syncope',
    advice: 'Loss of consciousness, unresponsive fainting, or seizures require urgent clinical assessment. Keep the person in a safe recovery position on their side to maintain an open airway, do not put anything in their mouth, and call emergency services right away.'
  },
  {
    regex: /(severe bleeding|uncontrolled bleeding|hemorrhage|vomiting bright red blood|coughing up blood)/i,
    category: 'Severe Hemorrhage',
    advice: 'Uncontrolled bleeding or vomiting/coughing blood is a critical medical emergency. Apply firm, continuous pressure with a clean cloth over external wounds, keep the person calm, and seek emergency room care immediately.'
  },
  {
    regex: /(anaphylaxis|throat swelling|tongue swelling|swelling in throat|severe allergic reaction and wheezing)/i,
    category: 'Anaphylactic Reaction',
    advice: 'Signs of anaphylaxis—such as rapid swelling of the lips, tongue, or throat, accompanied by hives and breathing difficulty—require immediate emergency administration of epinephrine (if prescribed) and immediate emergency room treatment.'
  },
  {
    regex: /(severe abdominal pain|excruciating stomach pain|rigid abdomen|sudden sharp agony in abdomen)/i,
    category: 'Acute Abdomen',
    advice: 'Sudden, severe, or rigid abdominal pain may indicate an acute surgical emergency (such as appendicitis, perforation, or acute pancreatitis). Do not eat, drink, or take pain suppressants, and seek urgent emergency medical evaluation immediately.'
  }
];

// ============================================================================
// 2. CLINICAL SPECIALISTS DIRECTORY AT MEDIFLOW
// ============================================================================
const CLINIC_SPECIALISTS = {
  generalMedicine: { name: 'Dr. James Wilson', dept: 'General Medicine & Family Practice' },
  cardiology: { name: 'Dr. Sarah Jenkins', dept: 'Cardiology & Cardiovascular Care' },
  dermatology: { name: 'Dr. Priya Sharma', dept: 'Dermatology & Skin Health' },
  pediatrics: { name: 'Dr. Robert Chen', dept: 'Pediatrics & Adolescent Care' }
};

// ============================================================================
// 3. BROAD CLINICAL DOMAIN KNOWLEDGE REGISTRY
// Covers common health topics with semantic aliases, safe supportive measures,
// general OTC category guidance, red flags, and appointment recommendations.
// ============================================================================
const TOPIC_REGISTRY = [
  {
    id: 'piles_hemorrhoids',
    title: 'Hemorrhoid & Anorectal Discomfort Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['piles', 'pile', 'hemorrhoid', 'hemorrhoids', 'haemorrhoid', 'haemorrhoids', 'anal pain', 'anal itching', 'bleeding from anus', 'bleeding when passing stool', 'lump near anus', 'bawasir'],
    commonCauses: 'Pain, swelling, itching, or discomfort around the anal region is frequently associated with hemorrhoids (enlarged or inflamed veins in the lower rectum and anus), but may also arise from anal fissures, local skin irritation, or constipation-related strain. A physical clinical examination is required for an accurate diagnosis.',
    selfCareSteps: [
      'Fiber-Rich Diet: Gradually increase dietary fiber (whole grains, vegetables, fruits, legumes) to soften stools.',
      'Generous Hydration: Drink 2 to 2.5 liters of clean water daily to prevent hard stools and reduce bowel friction.',
      'Avoid Straining: Do not push or strain forcefully during bowel movements; try not to sit on the toilet for prolonged periods.',
      'Warm Sitz Bath: Soak the pelvic area in plain warm water for 15 to 20 minutes, 2-3 times daily, to soothe inflamed tissues and ease sphincter spasms.',
      'Gentle Hygiene: Clean the area gently with warm water or unscented moist wipes after bowel movements; pat dry gently without vigorous rubbing.'
    ],
    otcGuidance: 'Over-the-counter soothing topical creams (such as witch hazel pads, zinc oxide barrier ointments, or mild soothing hemorrhoidal formulations) and stool softeners (such as psyllium husk) may provide temporary symptomatic comfort. Always consult a licensed pharmacist or doctor before use, especially if you have existing conditions or are pregnant. Never take prescription remedies without clinical review.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Heavy, continuous, or dark tarry rectal bleeding',
      'Sudden, severe, or throbbing pain that prevents sitting',
      'Presence of high fever, chills, or foul-smelling discharge',
      'Dizziness, weakness, or feeling faint after bowel movements'
    ],
    nextDayRecommendation: 'If your symptoms persist, cause recurring discomfort, or if you notice rectal bleeding, we strongly recommend booking a next-day appointment with our General Physician for an in-person physical evaluation.'
  },
  {
    id: 'constipation',
    title: 'Constipation & Bowel Regularity Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['constipation', 'constipated', 'hard stool', 'difficulty passing stool', 'infrequent bowel movements', 'straining to poop', 'irregular bowels'],
    commonCauses: 'Infrequent, hard, or difficult-to-pass stools typically stem from insufficient dietary fiber, low water intake, sedentary routine, changes in schedule, or certain medications. Occasionally, underlying metabolic or digestive conditions contribute.',
    selfCareSteps: [
      'Hydration: Drink plenty of warm water throughout the day, especially a glass of warm water upon waking.',
      'High-Fiber Intake: Consume fiber-rich foods like oats, flaxseeds, prunes, beans, leafy greens, and fresh apples/pears.',
      'Regular Physical Activity: Daily walking or light aerobic exercise stimulates bowel peristalsis.',
      'Heed Bowel Urges: Do not delay or ignore the natural urge to use the restroom.',
      'Optimized Posture: Elevating your feet slightly on a small footstool while seated on the toilet straightens the anorectal angle.'
    ],
    otcGuidance: 'Mild bulk-forming supplements (e.g. psyllium husk) or gentle osmotic stool softeners may be discussed with a pharmacist. Avoid habitual or unguided use of stimulant laxatives, as they can cause dependency. Consult a healthcare provider before taking any supplements.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Severe abdominal pain, severe bloating, or inability to pass gas',
      'Vomiting accompanying constipation',
      'Blood in the stool or unexplained sudden weight loss',
      'Constipation lasting longer than 1 to 2 weeks despite home measures'
    ],
    nextDayRecommendation: 'If dietary changes and hydration do not relieve your symptoms within 48-72 hours, consider scheduling an appointment with our clinic physician to review underlying factors.'
  },
  {
    id: 'headache',
    title: 'Headache & Tension Relief Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['headache', 'head ache', 'migraine', 'throbbing head', 'tension headache', 'head pain', 'temple pain', 'forehead ache'],
    commonCauses: 'Headaches are commonly triggered by tension, eye strain, dehydration, stress, lack of restful sleep, missed meals, or caffeine withdrawal. Migraines may cause pulsing pain often accompanied by sensitivity to light or sound. An in-person consultation can identify the specific type.',
    selfCareSteps: [
      'Hydrate Promptly: Drink a large glass of water immediately; mild dehydration is one of the most common headache triggers.',
      'Rest in a Dark, Quiet Room: Dim lighting, close your eyes, and take a screen-free break away from monitors and mobile phones.',
      'Temperature Compress: Apply a cool damp washcloth to your forehead or a warm compress to the back of your neck to ease muscle contraction.',
      'Neck & Shoulder Relaxation: Gently stretch the neck and roll your shoulders to release postural tension.'
    ],
    otcGuidance: 'Mild over-the-counter pain relievers (such as paracetamol/acetaminophen) are commonly used for occasional tension headaches. Follow package dosage instructions strictly, check with a pharmacist regarding existing liver/kidney conditions or other medications, and do not overuse analgesics. Prescription migraine drugs require a doctor consultation.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Sudden, explosive "thunderclap" headache reaching maximum severity in seconds',
      'Headache accompanied by high fever, stiff neck, confusion, or rash',
      'Headache following a head injury or accompanied by vision loss or weakness',
      'Headache that worsens progressively over days or awakens you from sleep'
    ],
    nextDayRecommendation: 'If your headaches occur frequently, disrupt your daily activities, or fail to respond to rest, please book a next-day consultation with our General Physician.'
  },
  {
    id: 'acidity_heartburn',
    title: 'Acidity, Heartburn & Acid Reflux Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['acidity', 'acid reflux', 'heartburn', 'gerd', 'burning chest after eating', 'sour burps', 'acid stomach', 'indigestion', 'gastric burning', 'hyperacidity'],
    commonCauses: 'A burning sensation in the upper abdomen or behind the breastbone often occurs when stomach acid travels back up into the esophagus (acid reflux). Common triggers include spicy or oily meals, lying down immediately after eating, caffeine, and stress.',
    selfCareSteps: [
      'Smaller, Frequent Meals: Avoid heavy or oversized meals; eat slowly and chew thoroughly.',
      'Post-Meal Uprightness: Remain sitting or standing for at least 2 to 3 hours after eating; never lie flat immediately after a meal.',
      'Elevate Head During Sleep: Raise the head of your bed by 6 inches or use an elevated pillow wedge.',
      'Limit Dietary Triggers: Temporarily avoid deep-fried foods, citrus, tomatoes, carbonated drinks, excess caffeine, and late-night snacks.',
      'Loose Clothing: Avoid tight belts or restrictive clothing around the waist that compress the stomach.'
    ],
    otcGuidance: 'Over-the-counter antacids or alginates may neutralize excess acid temporarily. For frequent symptoms, H2-blockers or PPIs are sometimes recommended by clinicians, but you should speak to a doctor or pharmacist to confirm the right approach and ensure there is no masking of other conditions.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Chest pain radiating to the jaw, neck, or arm (seek emergency care immediately)',
      'Difficulty or pain when swallowing food or liquids',
      'Vomiting blood or black, tarry stools',
      'Persistent unexplained weight loss or vomiting'
    ],
    nextDayRecommendation: 'If heartburn or acid reflux symptoms recur more than twice a week or require continuous antacids, book a next-day appointment with our General Physician for evaluation.'
  },
  {
    id: 'stomach_pain',
    title: 'Stomach Pain & Abdominal Discomfort Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['stomach pain', 'stomach ache', 'stomachache', 'tummy ache', 'abdominal cramps', 'belly pain', 'gut pain', 'cramping in stomach', 'gastritis'],
    commonCauses: 'Mild to moderate abdominal discomfort can arise from trapped intestinal gas, indigestion, mild food intolerance, stress, or mild viral gastroenteritis. Because the abdomen houses many vital organs, localized or persistent pain requires careful monitoring.',
    selfCareSteps: [
      'Digestive Rest: Eat light, bland foods such as clear broths, crackers, bananas, rice, or applesauce (BRAT diet); avoid rich, greasy, or spicy foods.',
      'Warmth for Comfort: Place a gentle warm water bottle or heating pad on the abdomen to relax abdominal wall muscles.',
      'Sip Fluids Slowly: Drink small sips of warm water or peppermint/chamomile tea.',
      'Avoid Irritants: Refrain from caffeine, alcohol, dairy, and heavy meals until the stomach settles.'
    ],
    otcGuidance: 'Simethicone drops/tablets can help relieve trapped gas bubbles. Oral rehydration solutions are helpful if loose stools accompany the pain. Avoid taking NSAIDs (like ibuprofen or aspirin) on an upset stomach without medical advice as they can irritate the gastric lining.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Severe, sudden, sharp, or progressively worsening pain',
      'Pain localizing intensely in the right lower abdomen (possible appendicitis)',
      'Abdomen that feels rigid, hard, or extremely tender to light touch',
      'Inability to keep fluids down, high fever, or blood in vomit/stool'
    ],
    nextDayRecommendation: 'If your stomach discomfort persists for more than 24 hours, worsens, or is accompanied by other symptoms, please book a next-day appointment with our medical team.'
  },
  {
    id: 'cold_cough',
    title: 'Common Cold, Cough & Upper Respiratory Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['cold', 'common cold', 'cough', 'coughing', 'runny nose', 'stuffy nose', 'nasal congestion', 'sneezing', 'chest congestion', 'phlegm', 'sore throat'],
    commonCauses: 'The common cold and acute coughs are usually caused by self-limiting viral upper respiratory infections. Irritation in the throat and bronchial lining triggers mucus production and coughing reflexes.',
    selfCareSteps: [
      'Generous Warm Fluids: Drink warm water, herbal teas with honey (for adults and children over 1 year), and clear broths to soothe the throat and thin mucus.',
      'Steam Inhalation: Inhale steam from a warm shower or bowl of warm water to open congested nasal airways.',
      'Saline Gargles: Gargle with warm salt water (1/2 tsp salt in 1 cup warm water) 3 times a day to ease throat soreness.',
      'Rest & Humidification: Allow your body adequate physical rest and use a cool mist room humidifier if the air is dry.',
      'Elevate Your Head: Use an extra pillow at night to ease post-nasal drip coughing.'
    ],
    otcGuidance: 'Saline nasal sprays, throat lozenges, and over-the-counter cough syrups may provide symptomatic comfort. Ask your pharmacist which formula suits your cough type (dry vs. productive). Antibiotics do not treat viral colds and must never be taken without a physician prescription.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Difficulty breathing, wheezing, or persistent shortness of breath',
      'Coughing up blood or rust-colored sputum',
      'High fever (above 102°F / 38.9°C) or fever lasting more than 3 days',
      'Chest pain when breathing deeply'
    ],
    nextDayRecommendation: 'If cold and cough symptoms persist beyond 7-10 days or become progressively severe, book a next-day appointment with our General Physician or Pediatrician.'
  },
  {
    id: 'mild_fever',
    title: 'Mild Fever & Temperature Management',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['mild fever', 'fever', 'temperature', 'chills', 'feeling feverish', 'body warmth', 'pyrexia'],
    commonCauses: 'A mild fever is an immune response indicating that your body is fighting off an infection (frequently viral, like a cold or flu). While uncomfortable, a mild fever helps mobilize defense mechanisms.',
    selfCareSteps: [
      'Continuous Hydration: Drink water, oral rehydration salts (ORS), or clear soups to replenish fluids lost through sweating.',
      'Comfortable Clothing: Wear lightweight, breathable clothing; avoid heavy blankets once shivering ceases.',
      'Rest: Minimize physical exertion and take ample bed rest to allow your immune system to recover.',
      'Lukewarm Sponge Bath: If feeling very uncomfortable, a lukewarm (not cold) sponge bath can assist gentle cooling.',
      'Monitor Readings: Check your temperature with a reliable digital thermometer every 4 to 6 hours.'
    ],
    otcGuidance: 'Over-the-counter antipyretics such as paracetamol/acetaminophen may help lower temperature and alleviate body aches. Follow age-appropriate package instructions and consult a pharmacist or doctor. Never give aspirin to children or teenagers due to the risk of Reye\'s syndrome.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Temperature reaching or exceeding 103°F (39.4°C) in adults or 100.4°F in infants under 3 months',
      'Fever lasting longer than 3 continuous days without improvement',
      'Stiff neck, confusion, extreme lethargy, or a new dark red/purple rash',
      'Severe breathing difficulty or persistent inability to keep fluids down'
    ],
    nextDayRecommendation: 'If your fever persists for more than 48 hours or doesn\'t respond to supportive measures, please book a next-day appointment with our clinic doctor.'
  },
  {
    id: 'toothache',
    title: 'Toothache & Dental Discomfort Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['toothache', 'tooth ache', 'tooth is hurting', 'teeth pain', 'hurting tooth', 'dental pain', 'gum pain', 'sensitive tooth', 'swollen gum'],
    commonCauses: 'Dental pain is commonly caused by dental decay (cavities), exposed dentin/sensitivity, gum inflammation (gingivitis), cracked teeth, food impaction, or a developing tooth abscess. A dental inspection is essential to treat the root cause.',
    selfCareSteps: [
      'Warm Salt Water Rinse: Swish gently with warm salt water (1/2 tsp salt in warm water) for 30 seconds to cleanse the area and reduce bacteria.',
      'Gentle Flossing: Carefully floss around the aching tooth to remove any trapped food debris that may be exerting pressure.',
      'Cold Compress: Apply a cold pack wrapped in a cloth to the outside of your cheek for 10-15 minutes to reduce swelling and numb discomfort.',
      'Avoid Extreme Temperatures: Avoid very hot, iced, sweet, or acidic foods and drinks.',
      'Sleep Slightly Elevated: Keeping your head propped up reduces throbbing pressure in the oral tissues.'
    ],
    otcGuidance: 'Over-the-counter pain relievers (like paracetamol or ibuprofen) may provide temporary relief when taken according to package directions and after confirming suitability with a pharmacist. Never apply aspirin directly to the gum or tooth as it causes chemical tissue burns. Clove oil applied very sparingly with a cotton swab is a traditional soothing option.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Visible swelling in the cheek, jaw, or neck',
      'High fever accompanying dental pain',
      'Difficulty swallowing or difficulty opening your mouth',
      'Foul-tasting discharge or pus draining from the gum'
    ],
    nextDayRecommendation: 'Home remedies cannot cure dental cavities or infections. Please book an appointment with a qualified dental specialist or clinic doctor as soon as possible for definitive care.'
  },
  {
    id: 'skin_itching_rash',
    title: 'Skin Itching, Minor Rash & Allergy Guidance',
    specialist: CLINIC_SPECIALISTS.dermatology,
    keywords: ['skin itching', 'itchy skin', 'itching', 'skin rash', 'rash', 'minor allergy', 'hives', 'urticaria', 'eczema', 'dermatitis', 'pruritus'],
    commonCauses: 'Localized skin itching and mild rashes often result from dry skin, contact with irritants (soaps, detergents, plants), mild environmental allergies, heat rash, or mild insect bites. Rashes with blisters or fever require in-person dermatology review.',
    selfCareSteps: [
      'Resist Scratching: Scratching damages the epidermal barrier and introduces bacteria leading to secondary infection. Keep fingernails short.',
      'Cool Compresses: Apply a clean, cool, damp cloth to itchy areas for 10 minutes to soothe sensation.',
      'Gentle Moisturization: Apply a plain, fragrance-free ceramide or petroleum-based moisturizer to damp skin.',
      'Mild Hygiene: Wash with lukewarm water and mild, soap-free cleansers; avoid hot showers and scrubbing.',
      'Loose Cotton Clothing: Wear loose-fitting, soft cotton apparel to minimize friction against the skin.'
    ],
    otcGuidance: 'Over-the-counter calamine lotion or mild 1% hydrocortisone cream (used sparingly for a few days on unbroken skin) can provide temporary relief. Mild non-drowsy oral antihistamines may help if itching is allergy-related. Consult a pharmacist or doctor before use, especially for children or widespread areas.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Rapidly spreading rash accompanied by facial, lip, or throat swelling (Emergency)',
      'Rash with blistering, peeling skin, or open sores',
      'Rash accompanied by high fever or signs of infection (pus, warmth, red streaks)',
      'Rash affecting the eyes, mouth, or genital areas'
    ],
    nextDayRecommendation: 'If your skin irritation does not improve after 48 hours or spreads, book a next-day appointment with our Dermatologist, Dr. Priya Sharma.'
  },
  {
    id: 'back_pain',
    title: 'Back Pain & Musculoskeletal Strain Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['back pain', 'backache', 'lower back pain', 'spine pain', 'lumbago', 'pulled back muscle', 'stiff back', 'back spasm', 'spinal pain'],
    commonCauses: 'Non-specific lower back pain is frequently caused by muscle strain, ligament sprain, poor ergonomics, prolonged sitting, sudden heavy lifting, or poor sleep posture. True nerve compression (sciatica) or disc issues require medical assessment.',
    selfCareSteps: [
      'Gentle Activity: Avoid strict prolonged bed rest; gentle walking prevents muscles from becoming stiff and deconditioned.',
      'Cold & Heat Therapy: Apply an ice pack for 15-20 minutes during the first 48 hours to lessen acute inflammation, then transition to gentle warmth.',
      'Ergonomic Support: Sit in a supportive chair with a small lumbar cushion behind your lower back and keep feet flat on the floor.',
      'Safe Lifting: When picking objects up, bend at your knees and hips rather than bending over your lower back.',
      'Comfortable Sleeping Position: Sleep on your side with a pillow between your knees, or on your back with a pillow beneath your knees.'
    ],
    otcGuidance: 'Over-the-counter topical pain-relief gels (menthol or diclofenac-based) or oral pain relievers (paracetamol/acetaminophen) may offer short-term comfort. Consult a pharmacist to ensure there are no medication interactions or contraindications. Avoid heavy muscle relaxants without prescription.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Back pain accompanied by numbness or weakness in the legs or feet',
      'Loss of bowel or bladder control (seek emergency medical care immediately)',
      'Back pain accompanied by unexplained fever or history of cancer',
      'Severe pain resulting from high-impact trauma or a fall'
    ],
    nextDayRecommendation: 'If back pain limits your movement or lasts longer than 3-5 days, book a next-day appointment with our clinic physician for physical assessment.'
  },
  {
    id: 'diarrhea',
    title: 'Diarrhea & Loose Motions Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['diarrhea', 'loose motions', 'loose stool', 'watery stool', 'frequent motions', 'upset bowels', 'dysentery'],
    commonCauses: 'Acute loose motions commonly result from viral or bacterial gastroenteritis, food intolerance, dietary indiscretions, or side effects of medications. The primary health concern during acute diarrhea is fluid and electrolyte depletion.',
    selfCareSteps: [
      'Oral Rehydration: Drink Oral Rehydration Solution (ORS), coconut water, clear broths, or diluted fruit juices to replace lost electrolytes.',
      'Bland Diet: Eat small portions of easy-to-digest foods (bananas, white rice, applesauce, toast, boiled potatoes).',
      'Avoid Gut Irritants: Steer clear of dairy, fatty/greasy foods, caffeine, alcohol, artificial sweeteners, and extremely spicy foods.',
      'Maintain Hand Hygiene: Wash hands thoroughly with soap and water after using the restroom and before eating to prevent transmission.'
    ],
    otcGuidance: 'Oral Rehydration Salts (ORS) packets are the gold standard for supportive care. Anti-diarrheal agents (like loperamide) should be used with extreme caution and avoided if fever or blood in the stool is present; ask a doctor or pharmacist first. Never start antibiotics without medical prescription.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Signs of severe dehydration (extreme thirst, dry mouth, little to no urine, dizziness upon standing)',
      'Stools containing blood, pus, or resembling black tar',
      'High fever (exceeding 101.5°F / 38.6°C)',
      'Diarrhea continuing beyond 48 hours in adults or 24 hours in young children'
    ],
    nextDayRecommendation: 'If loose stools continue for more than 48 hours or you feel weak and dehydrated, please book a next-day appointment with our clinic doctor.'
  },
  {
    id: 'nausea_vomiting',
    title: 'Nausea & Vomiting Supportive Care',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['vomiting', 'nausea', 'vomit', 'throwing up', 'feeling sick to stomach', 'emesis', 'queasy', 'nauseous'],
    commonCauses: 'Nausea and vomiting can arise from viral stomach bugs (gastroenteritis), food poisoning, motion sickness, migraine, acid reflux, pregnancy, or medication side effects.',
    selfCareSteps: [
      'Pause Solid Foods: Give your stomach a rest for 1-2 hours following an episode of vomiting.',
      'Small Fluid Sips: Take small sips of water, electrolyte solutions, or ice chips every 5-10 minutes. Gulping large volumes triggers reflex vomiting.',
      'Fresh Air & Rest: Rest in a cool, well-ventilated room with your head elevated.',
      'Ginger or Peppermint: Sipping mild ginger tea or sucking on ginger candy can naturally soothe stomach nausea.',
      'Gradual Reintroduction: Once vomiting stops for 6-8 hours, reintroduce bland foods like crackers or plain toast.'
    ],
    otcGuidance: 'Over-the-counter rehydration salts help restore vital minerals. Anti-nausea medications (antiemetics) should only be taken after consulting a physician or pharmacist, particularly if pregnancy or childhood is involved.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Inability to keep any liquids down for more than 12-24 hours',
      'Vomiting blood or dark "coffee-ground" material (Emergency)',
      'Severe abdominal pain, stiff neck, or high fever',
      'Extreme dizziness, confusion, or lack of urination for 8+ hours'
    ],
    nextDayRecommendation: 'If vomiting persists beyond 24 hours or you cannot stay hydrated, book a next-day appointment with our General Physician.'
  },
  {
    id: 'menstrual_cramps',
    title: 'Menstrual Cramps & Dysmenorrhea Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['menstrual cramps', 'period pain', 'period cramps', 'dysmenorrhea', 'menstruation pain', 'painful period', 'uterine cramps'],
    commonCauses: 'Period cramps occur when the uterine muscle contracts to shed its lining, mediated by natural hormone-like compounds called prostaglandins. Severe or worsening cramps may sometimes relate to underlying conditions like endometriosis or fibroids.',
    selfCareSteps: [
      'Warmth Application: Apply a heating pad or hot water bottle to your lower abdomen or lower back to relax uterine muscles.',
      'Gentle Movement: Light stretching, walking, or gentle pelvic tilts increase blood flow and ease tension.',
      'Hydration & Nutrition: Drink warm herbal teas (chamomile or ginger) and reduce salty, fatty foods that cause water retention.',
      'Relaxation Techniques: Deep breathing and warm baths help reduce stress-induced muscle tightening.'
    ],
    otcGuidance: 'Over-the-counter pain relievers such as paracetamol or mild NSAIDs (like ibuprofen, if well-tolerated and approved by a pharmacist) can help reduce prostaglandin production. Always read package instructions and check with a clinician if you have gastric or bleeding conditions.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Cramps so severe that they incapacitate you or prevent walking',
      'Abnormally heavy bleeding (soaking a pad/tampon every hour for consecutive hours)',
      'Pain accompanied by high fever or foul-smelling vaginal discharge',
      'Sudden severe pelvic pain that does not align with your normal cycle'
    ],
    nextDayRecommendation: 'If menstrual cramps are progressively severe, interfere with work/school, or are accompanied by heavy bleeding, book an appointment with our clinic physician.'
  },
  {
    id: 'minor_cuts_wounds',
    title: 'Minor Cuts, Scrapes & First Aid Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['cut', 'minor cut', 'scrape', 'wound', 'abrasion', 'scratched skin', 'bleeding from finger', 'minor burn'],
    commonCauses: 'Everyday minor cuts, scrapes, and superficial abrasions break the skin barrier. Cleanliness and infection prevention are the top priorities in early wound care.',
    selfCareSteps: [
      'Stop Bleeding: Apply gentle, firm pressure with a clean cloth or sterile gauze for 3-5 minutes.',
      'Clean Thoroughly: Rinse the wound gently under running tap water for several minutes to flush out dirt. Wash around the wound with mild soap, avoiding harsh chemicals inside the wound.',
      'Do Not Use Harsh Antiseptics: Avoid hydrogen peroxide or rubbing alcohol directly inside the wound as they damage delicate healing cells.',
      'Protect with a Dressing: Apply a thin layer of petroleum jelly and cover with a sterile adhesive bandage.',
      'Change Daily: Change the bandage daily or whenever it becomes wet or dirty.'
    ],
    otcGuidance: 'Over-the-counter plain petroleum jelly or mild OTC antiseptic ointments can keep the wound moist and reduce scarring. Confirm that your Tetanus vaccination is up to date (recommended every 10 years, or within 5 years for dirty wounds).',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Bleeding that does not stop after 10 minutes of direct firm pressure',
      'Deep wounds, gaping edges, or wounds exposing fat/muscle (requires stitches within hours)',
      'Wounds caused by rusty metal, dirty punctures, or animal/human bites',
      'Signs of infection: spreading redness, swelling, increasing warmth, or pus'
    ],
    nextDayRecommendation: 'If a wound looks deep, won\'t stop oozing, or shows signs of infection, please visit our clinic or book an appointment promptly.'
  },
  {
    id: 'fatigue_weakness',
    title: 'Fatigue & General Weakness Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['fatigue', 'tired', 'tiredness', 'weakness', 'exhausted', 'exhaustion', 'feeling weak', 'low energy', 'lethargy'],
    commonCauses: 'Tiredness and weakness can stem from poor sleep hygiene, stress, inadequate nutrition, dehydration, vitamin deficiencies (such as Vitamin D or B12), anemia, thyroid imbalance, or recovery from an acute illness.',
    selfCareSteps: [
      'Consistent Sleep Routine: Target 7-9 hours of restful sleep daily with a consistent sleep-wake schedule.',
      'Nutritional Balance: Eat nutrient-dense meals with adequate protein, complex carbohydrates, iron, and fresh vegetables.',
      'Stay Hydrated: Drink water regularly throughout the day; even 1-2% dehydration can sap energy levels.',
      'Paced Activity: Engage in gentle daily walking in fresh air; avoid prolonged periods of inactivity.',
      'Limit Caffeine: Avoid reliance on energy drinks and afternoon caffeine that disrupt restorative sleep.'
    ],
    otcGuidance: 'General multivitamin supplements can be considered, but it is best to check specific blood levels (CBC, Ferritin, Thyroid, Vitamin B12/D) before starting high-dose supplements. Speak with a doctor or pharmacist for tailored advice.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Sudden weakness affecting one side of the face or body (Emergency: Stroke warning)',
      'Fatigue accompanied by chest pain, shortness of breath, or irregular heartbeat',
      'Unexplained significant weight loss or persistent fevers/night sweats',
      'Extreme weakness that prevents standing or performing basic daily tasks'
    ],
    nextDayRecommendation: 'Persistent fatigue lasting more than 2 weeks warrants routine blood work. Please schedule a next-day appointment with our General Physician.'
  },
  {
    id: 'sleep_stress',
    title: 'Sleep Hygiene & Stress Management Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['sleep', 'insomnia', 'cannot sleep', 'stress', 'anxiety', 'nervous', 'racing thoughts', 'restless sleep', 'poor sleep'],
    commonCauses: 'Sleep difficulties and everyday stress are deeply connected. Screen time before bed, erratic schedules, work pressures, caffeine consumption, and mental hyperarousal can hinder natural circadian rhythms.',
    selfCareSteps: [
      'Digital Sunset: Turn off smartphones, laptops, and bright screens at least 60 minutes before bedtime.',
      'Consistent Bedtime: Go to bed and wake up at the exact same time every day, including on weekends.',
      'Box Breathing (4-4-4-4): Inhale for 4 seconds, hold for 4, exhale for 4, and hold for 4. Repeat for 4-5 cycles to calm the autonomic nervous system.',
      'Optimize Sleep Sanctuary: Keep your bedroom dark, quiet, and slightly cool (around 65-68°F / 18-20°C).',
      'Morning Sunlight: Expose your eyes to natural daylight within 30 minutes of waking to anchor your body clock.'
    ],
    otcGuidance: 'Calming herbal teas (chamomile, lavender) or magnesium supplements may be discussed with a pharmacist. Do not start over-the-counter sleep aids or sedative medications without consulting a licensed physician.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Severe panic attacks with chest pain or breathing difficulty (Emergency evaluation)',
      'Persistent depression, hopelessness, or thoughts of self-harm',
      'Severe insomnia lasting several weeks affecting mental clarity and physical safety'
    ],
    nextDayRecommendation: 'If stress or insomnia continues to impact your health, please book an appointment with our clinic physician to discuss supportive care.'
  },
  {
    id: 'hypertension_bp',
    title: 'Blood Pressure & Cardiovascular Wellness',
    specialist: CLINIC_SPECIALISTS.cardiology,
    keywords: ['blood pressure', 'high bp', 'hypertension', 'low bp', 'systolic', 'diastolic', 'bp reading'],
    commonCauses: 'Blood pressure fluctuations can be driven by stress, high dietary sodium, lack of physical activity, sleep apnea, excess weight, genetics, or underlying cardiovascular conditions.',
    selfCareSteps: [
      'DASH Diet Principles: Focus on whole grains, leafy green vegetables, potassium-rich fruits, and lean proteins.',
      'Sodium Moderation: Reduce dietary salt intake to less than 2,000 mg per day; avoid packaged, processed snacks.',
      'Regular Aerobic Exercise: Aim for 150 minutes of moderate aerobic activity weekly (e.g. 30 minutes of brisk walking 5 days a week).',
      'Stress Reduction: Practice daily relaxation techniques and ensure 7-8 hours of sleep.',
      'Blood Pressure Log: Keep a regular morning and evening log of your readings to share with your cardiologist.'
    ],
    otcGuidance: 'Blood pressure medications require strict medical prescription and monitoring. Never stop, start, or alter dosages of antihypertensive drugs without consulting your physician.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Blood pressure reading exceeding 180/120 mmHg accompanied by chest pain, shortness of breath, or headache (Hypertensive Crisis - Emergency)',
      'Severe chest pain, palpitations, or fainting',
      'Sudden vision changes or numbness/weakness in limbs'
    ],
    nextDayRecommendation: 'Schedule an appointment with our Cardiologist, Dr. Sarah Jenkins, for personalized blood pressure optimization and cardiovascular risk profiling.'
  },
  {
    id: 'diabetes_bloodsugar',
    title: 'Blood Sugar & Metabolic Wellness Guidance',
    specialist: CLINIC_SPECIALISTS.generalMedicine,
    keywords: ['diabetes', 'blood sugar', 'glucose', 'insulin', 'hba1c', 'sugar level', 'high sugar', 'prediabetes'],
    commonCauses: 'Elevated blood sugar occurs when the body either does not produce enough insulin or cells become resistant to insulin action, frequently influenced by diet, physical activity levels, stress, and genetics.',
    selfCareSteps: [
      'Complex Carbohydrates: Choose whole grains with low glycemic index (oats, brown rice, legumes) and pair with fiber and protein.',
      'Consistent Meal Timings: Avoid prolonged fasting followed by heavy meals to prevent erratic blood sugar fluctuations.',
      'Post-Meal Walks: A 10-15 minute walk after meals significantly assists glucose uptake by muscles.',
      'Foot & Skin Care: Inspect your feet daily for small cuts, blisters, or signs of irritation.',
      'Routine Monitoring: Track fasting and 2-hour post-meal blood sugar levels in a wellness log.'
    ],
    otcGuidance: 'Diabetes treatments must be clinically prescribed and monitored. Do not use unverified herbal or over-the-counter blood sugar supplements without your physician\'s explicit clearance.',
    temporaryReliefCaution: 'These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.',
    redFlags: [
      'Blood glucose reading above 300 mg/dL with ketones or confusion (Emergency: DKA)',
      'Severe hypoglycemia (below 60 mg/dL) with confusion, shaking, or fainting (take quick-acting glucose immediately)',
      'Persistent non-healing ulcers or wounds on feet'
    ],
    nextDayRecommendation: 'Schedule an appointment with our General Physician for HbA1c review, metabolic panel testing, and lifestyle plan alignment.'
  }
];

// ============================================================================
// 4. ANATOMICAL & FUNCTIONAL COMPLAINT PARSER (TIER 3 DYNAMIC ANALYZER)
// Extracts body region and complaint type for queries not matched in registry.
// ============================================================================
const BODY_REGIONS = [
  { name: 'head / cranial', keywords: ['head', 'forehead', 'temple', 'scalp', 'skull'] },
  { name: 'eye / ocular', keywords: ['eye', 'eyes', 'eyelid', 'vision'] },
  { name: 'ear / auditory', keywords: ['ear', 'ears', 'hearing', 'ringing'] },
  { name: 'nose & sinuses', keywords: ['nose', 'nasal', 'sinus', 'sinuses'] },
  { name: 'mouth, jaw & throat', keywords: ['mouth', 'jaw', 'lip', 'tongue', 'throat', 'gum', 'tooth', 'teeth'] },
  { name: 'neck', keywords: ['neck', 'cervical'] },
  { name: 'chest', keywords: ['chest', 'rib', 'ribs', 'breast'] },
  { name: 'upper abdomen / stomach', keywords: ['stomach', 'belly', 'abdomen', 'tummy', 'digestive', 'gut'] },
  { name: 'lower abdomen & pelvic', keywords: ['lower abdomen', 'pelvis', 'pelvic', 'groin', 'bladder'] },
  { name: 'anorectal region', keywords: ['rectum', 'rectal', 'anus', 'anal', 'stool', 'bowel'] },
  { name: 'back & spine', keywords: ['back', 'spine', 'spinal', 'lumbar', 'lower back'] },
  { name: 'shoulder & arm', keywords: ['shoulder', 'arm', 'elbow', 'wrist', 'hand', 'finger'] },
  { name: 'hip, leg & knee', keywords: ['hip', 'thigh', 'knee', 'shin', 'calf'] },
  { name: 'ankle & foot', keywords: ['ankle', 'foot', 'feet', 'heel', 'toe'] },
  { name: 'skin & superficial', keywords: ['skin', 'scalp', 'dermis', 'surface'] },
  { name: 'joints & muscles', keywords: ['joint', 'joints', 'muscle', 'muscles', 'ligament', 'tendon'] }
];

const COMPLAINT_TYPES = [
  { type: 'pain & discomfort', keywords: ['pain', 'hurting', 'hurts', 'ache', 'aching', 'sore', 'soreness', 'tender', 'tenderness'] },
  { type: 'swelling & inflammation', keywords: ['swelling', 'swollen', 'inflamed', 'inflammation', 'puffy', 'edema', 'bump', 'lump'] },
  { type: 'stiffness & reduced mobility', keywords: ['stiff', 'stiffness', 'tight', 'tightness', 'cannot move', 'hard to move', 'cramp', 'spasm'] },
  { type: 'itching & irritation', keywords: ['itch', 'itching', 'itchy', 'scratching', 'prickly', 'irritation', 'burning', 'stinging'] },
  { type: 'sprain, strain or minor injury', keywords: ['sprain', 'sprained', 'twisted', 'strain', 'pulled', 'bruise', 'bruised', 'hit'] },
  { type: 'fatigue, weakness or dizziness', keywords: ['weak', 'weakness', 'dizzy', 'dizziness', 'faint', 'lightheaded', 'tired', 'exhausted'] }
];

// Helper: Tokenize and normalize query
function tokenizeQuery(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Helper: Score topic match with query
function scoreTopic(topic, queryLower, queryTokens) {
  let score = 0;
  for (const kw of topic.keywords) {
    const kwLower = kw.toLowerCase();
    if (queryLower.includes(kwLower)) {
      // Direct substring match gives weight proportional to length
      score += kwLower.split(/\s+/).length * 10;
    } else {
      // Check word token overlap
      const kwTokens = kwLower.split(/\s+/);
      const allPresent = kwTokens.every(t => queryTokens.includes(t));
      if (allPresent) {
        score += kwTokens.length * 8;
      }
    }
  }
  return score;
}

// ============================================================================
// 5. STRUCTURED RESPONSE GENERATOR FOR REGISTERED TOPICS
// ============================================================================
function formatStructuredRegisteredResponse(topic, userQuery) {
  const stepsList = topic.selfCareSteps.map(s => `• **${s.split(':')[0]}:** ${s.split(':').slice(1).join(':').trim()}`).join('\n');
  const redFlagsList = topic.redFlags.map(rf => `• ${rf}`).join('\n');

  return `### ${topic.title}

**A. What this symptom/condition may commonly be:**
${topic.commonCauses}

**B. What you can do now (Safe Self-Care):**
${stepsList}

**C. Medication & OTC Guidance:**
${topic.otcGuidance}
⚠️ *Important:* Do not take prescription medicines without an authorized clinical prescription. ${topic.temporaryReliefCaution}

**D. Warning Signs (Seek prompt medical evaluation if you notice):**
${redFlagsList}

---
**Next Steps at MediFlow Clinic:**
${topic.nextDayRecommendation}

💡 **Need a proper evaluation? Book an appointment with a doctor from the Appointments section.**
*(Recommended Specialist: ${topic.specialist.name}, ${topic.specialist.dept})*`;
}

// ============================================================================
// 6. DYNAMIC GENERALIZED SYMPTOM ANALYZER (TIER 3 FOR UNSEEN QUERIES)
// ============================================================================
function generateDynamicGeneralizedResponse(cleanQuestion) {
  const queryLower = cleanQuestion.toLowerCase();
  const tokens = tokenizeQuery(cleanQuestion);

  // Detect body regions mentioned
  const detectedRegions = [];
  for (const reg of BODY_REGIONS) {
    if (reg.keywords.some(k => queryLower.includes(k))) {
      detectedRegions.push(reg.name);
    }
  }

  // Detect complaint types
  const detectedComplaints = [];
  for (const comp of COMPLAINT_TYPES) {
    if (comp.keywords.some(k => queryLower.includes(k))) {
      detectedComplaints.push(comp.type);
    }
  }

  const regionText = detectedRegions.length > 0 ? detectedRegions.join(' / ') : 'the reported bodily area';
  const complaintText = detectedComplaints.length > 0 ? detectedComplaints.join(' and ') : 'unspecified discomfort';

  // Build targeted dynamic advice
  let specificCare = '';
  if (detectedComplaints.includes('sprain, strain or minor injury') || detectedRegions.includes('ankle & foot') || detectedRegions.includes('shoulder & arm') || detectedRegions.includes('joints & muscles')) {
    specificCare = `
• **R.I.C.E. Principle:** Rest the affected joint or limb, apply an ice pack wrapped in a clean cloth for 15-20 minutes every 2-3 hours, use gentle compression if comfortable, and elevate the area above heart level to limit swelling.
• **Avoid Bearing Heavy Weight:** Avoid testing or putting excessive strain on the injured area until properly evaluated.
• **Gentle Movement:** Do not perform forceful stretches while the area is acutely tender.`;
  } else if (detectedRegions.includes('upper abdomen / stomach') || detectedRegions.includes('lower abdomen & pelvic')) {
    specificCare = `
• **Bland Nutrition:** Stick to light, easy-to-digest items like warm broths, boiled rice, crackers, and toast; avoid spicy, fried, or highly acidic foods.
• **Gentle Warmth:** A warm hot water bottle placed lightly on the abdomen can soothe muscle tension.
• **Stay Hydrated:** Sip warm fluids gradually throughout the day.`;
  } else if (detectedRegions.includes('mouth, jaw & throat')) {
    specificCare = `
• **Warm Salt Water Gargle:** Swish or gargle with warm salt water (1/2 tsp salt in 1 cup warm water) 2-3 times daily to soothe irritated mucosa.
• **Soft Foods:** Consume cool or lukewarm, soft foods that do not require heavy chewing.
• **Avoid Irritants:** Avoid acidic citrus, extreme hot/spicy foods, and carbonated beverages.`;
  } else {
    specificCare = `
• **Rest the Affected Area:** Minimize physical strain and avoid activities that aggravate the sensation.
• **Adequate Hydration:** Drink 2 to 2.5 liters of clean water daily to assist natural metabolic healing and tissue hydration.
• **Gentle Temperature Comfort:** Use a cool compress if there is acute swelling, or gentle warmth if muscle tightness is present.
• **Symptom Monitoring:** Keep track of when symptoms began, their severity, and whether specific positions or foods worsen them.`;
  }

  return `### General Clinical Assessment & Health Guidance

**A. What this symptom/condition may commonly be:**
Discomfort or symptoms involving **${regionText}** with **${complaintText}** commonly arise from everyday factors such as localized muscle strain, minor inflammation, temporary physical irritation, dehydration, or mild functional changes. Because various conditions can produce similar sensations, an accurate diagnosis requires an in-person clinical evaluation by a licensed healthcare provider.

**B. What you can do now (Safe Self-Care):**${specificCare}

**C. Medication & OTC Guidance:**
Do not start prescription medications without a formal clinical assessment. Mild over-the-counter options (such as soothing topical balms, gentle saline rinses, or mild OTC pain relievers) may provide supportive comfort. Always consult a qualified pharmacist or doctor first, especially for children, during pregnancy, or if you take other medications.
⚠️ *Note:* These measures may provide temporary relief, but they do not guarantee that the problem will resolve in one day.

**D. Warning Signs (Seek prompt medical care if you notice):**
• Rapidly worsening or severe unbearable pain
• High fever, chills, or sudden onset of unexplained swelling
• Inability to bear weight, move the limb, or perform basic daily tasks
• Numbness, tingling, color changes (pale/blue), or spreading redness
• Any shortness of breath, dizziness, or confusion

**E. Helpful Questions for Clinical Review:**
1. Did these symptoms begin suddenly following a specific activity or injury, or develop gradually?
2. Has the intensity remained steady, or does it fluctuate with movement, rest, or eating?

---
**Next Steps at MediFlow Clinic:**
If your symptoms continue or you are unsure about the cause, please book an appointment with a qualified doctor. You can use the Book Appointment section for a consultation.

💡 **Need a proper evaluation? Book an appointment with a doctor from the Appointments section.**`;
}

// ============================================================================
// 7. MAIN ENGINE ENTRY POINT
// ============================================================================
exports.analyzeHealthQuery = function (rawQuestion) {
  if (!rawQuestion || typeof rawQuestion !== 'string') {
    return {
      success: false,
      message: 'Please provide a valid health question.'
    };
  }

  const cleanQuestion = rawQuestion.trim();
  const queryLower = cleanQuestion.toLowerCase();
  const queryTokens = tokenizeQuery(cleanQuestion);

  // 1. TIER 1: EMERGENCY TRIAGE EVALUATION (HIGHEST PRIORITY)
  for (const emergency of EMERGENCY_PATTERNS) {
    if (emergency.regex.test(cleanQuestion)) {
      return {
        success: true,
        isEmergency: true,
        category: emergency.category,
        disclaimer: MANDATORY_DISCLAIMER,
        showAppointmentCta: false,
        answer: `🚨 **POTENTIAL MEDICAL EMERGENCY DETECTED (${emergency.category.toUpperCase()})**

${emergency.advice}

**Immediate Life-Saving Steps:**
1. **Call Emergency Services Immediately:** Dial your local emergency number (e.g. 911 / 112 / 999) without delay.
2. **Do Not Drive Yourself:** If feeling dizzy, weak, or having severe pain, do not operate a vehicle.
3. **Alert People Nearby:** Inform someone with you or nearby so they can stay by your side and assist emergency responders.
4. **Remain Calm & Rest:** Sit or lie down in a safe, well-ventilated position while emergency help is on the way.

*${MANDATORY_DISCLAIMER}*`
      };
    }
  }

  // 2. CHECK FOR DIRECT DIAGNOSTIC REQUEST NOTICE
  const diagnosisTrigger = /(diagnose me|do i have|what disease do i have|tell me my disease|confirm my diagnosis|am i dying)/i;
  let diagnosisNotice = '';
  if (diagnosisTrigger.test(cleanQuestion)) {
    diagnosisNotice = `> ⚠️ **Diagnostic Boundary Notice:** As an AI Health Assistant, I cannot clinically diagnose diseases or review medical scans. A definitive diagnosis requires a physical examination and laboratory/diagnostic tests performed by a licensed physician.\n\n`;
  }

  // 3. TIER 2: TOPIC MATCHING AGAINST COMPREHENSIVE CLINICAL REGISTRY
  let bestTopic = null;
  let bestScore = 0;

  for (const topic of TOPIC_REGISTRY) {
    const score = scoreTopic(topic, queryLower, queryTokens);
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  // Threshold score for registered topic match (e.g. at least one full keyword match)
  if (bestTopic && bestScore >= 8) {
    const formattedContent = formatStructuredRegisteredResponse(bestTopic, cleanQuestion);
    return {
      success: true,
      isEmergency: false,
      category: bestTopic.title,
      recommendedSpecialist: `${bestTopic.specialist.name} (${bestTopic.specialist.dept})`,
      disclaimer: MANDATORY_DISCLAIMER,
      showAppointmentCta: true,
      answer: `${diagnosisNotice}${formattedContent}`
    };
  }

  // 4. TIER 3: DYNAMIC GENERALIZED SYMPTOM ANALYSIS FOR UNSEEN / NOVEL QUERIES
  const dynamicContent = generateDynamicGeneralizedResponse(cleanQuestion);
  return {
    success: true,
    isEmergency: false,
    category: 'General Health & Symptom Guidance',
    recommendedSpecialist: `${CLINIC_SPECIALISTS.generalMedicine.name} (${CLINIC_SPECIALISTS.generalMedicine.dept})`,
    disclaimer: MANDATORY_DISCLAIMER,
    showAppointmentCta: true,
    answer: `${diagnosisNotice}${dynamicContent}`
  };
};

exports.MANDATORY_DISCLAIMER = MANDATORY_DISCLAIMER;
exports.EMERGENCY_PATTERNS = EMERGENCY_PATTERNS;
exports.TOPIC_REGISTRY = TOPIC_REGISTRY;
