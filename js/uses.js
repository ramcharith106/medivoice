/**
 * uses.js
 * ------------------------------------------------------------------
 * Short, plain-language "what is this medicine usually used for"
 * descriptions, in English, Hindi and Telugu.
 *
 * Each medicine in medicines.js maps to one purpose key, and each
 * purpose has one phrase per language. Phrases are written to fit
 * the sentence templates in narration.js:
 *   en: "This medicine is usually used for <phrase>."
 *   hi: "यह दवा आमतौर पर <phrase> के लिए दी जाती है।"
 *   te: "ఈ మందును సాధారణంగా <phrase> కోసం వాడతారు."
 *
 * This is general information only. A doctor may prescribe a medicine
 * for a different reason, so the app always says so.
 */

import { normaliseKey } from './medicines.js';

export const PURPOSES = {
  pain_fever: {
    en: 'pain and fever',
    hi: 'दर्द और बुखार',
    te: 'నొప్పి మరియు జ్వరం',
  },
  pain_swelling: {
    en: 'pain and swelling, such as joint or muscle pain',
    hi: 'जोड़ों और मांसपेशियों के दर्द और सूजन',
    te: 'కీళ్లు, కండరాల నొప్పి వంటి నొప్పి మరియు వాపు',
  },
  strong_pain: {
    en: 'strong pain',
    hi: 'तेज़ दर्द',
    te: 'తీవ్రమైన నొప్పి',
  },
  aspirin: {
    en: 'pain and fever, and in low doses to prevent blood clots',
    hi: 'दर्द और बुखार, और कम मात्रा में खून के थक्के रोकने',
    te: 'నొప్పి, జ్వరం, మరియు తక్కువ మోతాదులో రక్తం గడ్డకట్టకుండా నివారించడం',
  },
  clots: {
    en: 'preventing blood clots, heart attack and stroke',
    hi: 'खून के थक्के, हार्ट अटैक और लकवे से बचाव',
    te: 'రక్తం గడ్డకట్టడం, గుండెపోటు మరియు పక్షవాతం రాకుండా నివారించడం',
  },
  diabetes: {
    en: 'diabetes (high blood sugar)',
    hi: 'डायबिटीज़ (शुगर)',
    te: 'మధుమేహం (షుగర్ వ్యాధి)',
  },
  bp_heart: {
    en: 'high blood pressure and some heart problems',
    hi: 'हाई ब्लड प्रेशर और कुछ दिल की बीमारियों',
    te: 'అధిక రక్తపోటు (బీపీ) మరియు కొన్ని గుండె సమస్యల',
  },
  water: {
    en: 'swelling caused by extra water in the body, and high blood pressure',
    hi: 'शरीर में जमा अतिरिक्त पानी, सूजन और हाई ब्लड प्रेशर',
    te: 'శరీరంలో అదనపు నీరు చేరడం వల్ల వచ్చే వాపు మరియు అధిక రక్తపోటు',
  },
  heart: {
    en: 'heart problems and chest pain (angina)',
    hi: 'दिल की बीमारी और सीने के दर्द (एंजाइना)',
    te: 'గుండె సమస్యలు మరియు ఛాతీ నొప్పి',
  },
  cholesterol: {
    en: 'high cholesterol',
    hi: 'हाई कोलेस्ट्रॉल',
    te: 'అధిక కొలెస్ట్రాల్',
  },
  acidity: {
    en: 'acidity, heartburn and stomach ulcers',
    hi: 'एसिडिटी, सीने में जलन और पेट के छालों',
    te: 'ఎసిడిటీ, గుండెల్లో మంట మరియు కడుపులో పుండ్ల',
  },
  nausea: {
    en: 'nausea, vomiting and bloating',
    hi: 'जी मिचलाने, उल्टी और पेट फूलने',
    te: 'వికారం, వాంతులు మరియు కడుపు ఉబ్బరం',
  },
  constipation: {
    en: 'constipation',
    hi: 'कब्ज़',
    te: 'మలబద్ధకం',
  },
  diarrhoea: {
    en: 'loose motions (diarrhoea)',
    hi: 'दस्त',
    te: 'విరేచనాల',
  },
  ors: {
    en: 'replacing water and salts lost in loose motions or vomiting',
    hi: 'दस्त या उल्टी में शरीर से निकले पानी और नमक की कमी पूरी करने',
    te: 'విరేచనాలు లేదా వాంతుల వల్ల కోల్పోయిన నీరు మరియు లవణాలను తిరిగి పొందడం',
  },
  cramps: {
    en: 'stomach pain and cramps',
    hi: 'पेट दर्द और मरोड़',
    te: 'కడుపు నొప్పి మరియు మెలిపెట్టడం',
  },
  infection: {
    en: 'infections caused by bacteria',
    hi: 'बैक्टीरिया से होने वाले संक्रमणों',
    te: 'బ్యాక్టీరియా వల్ల వచ్చే ఇన్ఫెక్షన్ల',
  },
  fungal: {
    en: 'fungal infections',
    hi: 'फंगल संक्रमणों',
    te: 'ఫంగల్ ఇన్ఫెక్షన్ల',
  },
  worms: {
    en: 'worm and parasite infections',
    hi: 'पेट के कीड़ों और परजीवी संक्रमणों',
    te: 'నులిపురుగులు మరియు ఇతర పరాన్నజీవుల ఇన్ఫెక్షన్ల',
  },
  virus: {
    en: 'viral infections such as herpes and shingles',
    hi: 'हर्पीज़ जैसे वायरल संक्रमणों',
    te: 'హెర్పిస్ వంటి వైరల్ ఇన్ఫెక్షన్ల',
  },
  flu: {
    en: 'flu (influenza)',
    hi: 'फ्लू (इन्फ्लुएंजा)',
    te: 'ఫ్లూ (ఇన్‌ఫ్లుఎంజా)',
  },
  arthritis: {
    en: 'joint diseases such as rheumatoid arthritis',
    hi: 'रूमेटॉइड आर्थराइटिस जैसी जोड़ों की बीमारियों',
    te: 'రుమటాయిడ్ ఆర్థరైటిస్ వంటి కీళ్ల వ్యాధుల',
  },
  allergy: {
    en: 'allergies, sneezing, runny nose and itching',
    hi: 'एलर्जी, छींक, नाक बहने और खुजली',
    te: 'అలర్జీ, తుమ్ములు, ముక్కు కారడం మరియు దురద',
  },
  cold: {
    en: 'cold symptoms such as a blocked or runny nose',
    hi: 'सर्दी-ज़ुकाम और बंद नाक',
    te: 'జలుబు మరియు ముక్కు దిబ్బడ',
  },
  cough: {
    en: 'cough',
    hi: 'खाँसी',
    te: 'దగ్గు',
  },
  asthma: {
    en: 'asthma and breathing problems',
    hi: 'दमा और साँस की तकलीफ़',
    te: 'ఆస్తమా మరియు ఊపిరి సమస్యల',
  },
  steroid: {
    en: 'swelling, severe allergy and many other conditions',
    hi: 'सूजन, गंभीर एलर्जी और कई दूसरी बीमारियों',
    te: 'వాపు, తీవ్రమైన అలర్జీ మరియు అనేక ఇతర సమస్యల',
  },
  thyroid_low: {
    en: 'low thyroid (hypothyroidism)',
    hi: 'थायराइड कम होने की समस्या (हाइपोथायरायडिज़्म)',
    te: 'థైరాయిడ్ తక్కువగా ఉండే సమస్య (హైపోథైరాయిడిజం)',
  },
  thyroid_high: {
    en: 'overactive thyroid (hyperthyroidism)',
    hi: 'थायराइड ज़्यादा होने की समस्या (हाइपरथायरायडिज़्म)',
    te: 'థైరాయిడ్ ఎక్కువగా ఉండే సమస్య (హైపర్‌థైరాయిడిజం)',
  },
  nerve_pain: {
    en: 'nerve pain',
    hi: 'नसों के दर्द',
    te: 'నరాల నొప్పి',
  },
  mood: {
    en: 'depression and anxiety',
    hi: 'डिप्रेशन और घबराहट',
    te: 'డిప్రెషన్ మరియు ఆందోళన',
  },
  anxiety_sleep: {
    en: 'anxiety and sleep problems',
    hi: 'घबराहट और नींद की समस्या',
    te: 'ఆందోళన మరియు నిద్ర సమస్యల',
  },
  seizures: {
    en: 'fits (epilepsy)',
    hi: 'मिर्गी (दौरे)',
    te: 'మూర్ఛ వ్యాధి (ఫిట్స్)',
  },
  memory: {
    en: 'memory loss (dementia)',
    hi: 'याददाश्त कमज़ोर होने की बीमारी (डिमेंशिया)',
    te: 'మతిమరుపు వ్యాధి (డిమెన్షియా)',
  },
  parkinsons: {
    en: "Parkinson's disease",
    hi: 'पार्किंसन रोग',
    te: 'పార్కిన్సన్స్ వ్యాధి',
  },
  dizziness: {
    en: 'dizziness and vertigo',
    hi: 'चक्कर आने की समस्या',
    te: 'తల తిరగడం సమస్య',
  },
  migraine: {
    en: 'preventing migraine and dizziness',
    hi: 'माइग्रेन और चक्कर से बचाव',
    te: 'మైగ్రేన్ మరియు తల తిరగడం రాకుండా నివారించడం',
  },
  mental: {
    en: 'serious mental health conditions such as schizophrenia and bipolar disorder',
    hi: 'सिज़ोफ्रेनिया और बाइपोलर डिसऑर्डर जैसी मानसिक बीमारियों',
    te: 'స్కిజోఫ్రెనియా, బైపోలార్ డిజార్డర్ వంటి మానసిక వ్యాధుల',
  },
  prostate: {
    en: 'an enlarged prostate and difficulty passing urine',
    hi: 'बढ़े हुए प्रोस्टेट और पेशाब की रुकावट',
    te: 'ప్రోస్టేట్ పెరగడం వల్ల వచ్చే మూత్ర సమస్యల',
  },
  bladder: {
    en: 'an overactive bladder (needing to pass urine often)',
    hi: 'बार-बार पेशाब आने की समस्या',
    te: 'తరచుగా మూత్రం వచ్చే సమస్య',
  },
  calcium: {
    en: 'low calcium or vitamin D, for strong bones',
    hi: 'कैल्शियम और विटामिन डी की कमी',
    te: 'కాల్షియం మరియు విటమిన్ డి లోపం',
  },
  bones: {
    en: 'weak bones (osteoporosis)',
    hi: 'हड्डियों की कमज़ोरी (ऑस्टियोपोरोसिस)',
    te: 'ఎముకల బలహీనత (ఆస్టియోపోరోసిస్)',
  },
  b_vitamin: {
    en: 'low vitamin B12 and other B vitamins',
    hi: 'विटामिन बी12 और बी विटामिन की कमी',
    te: 'విటమిన్ బి12 మరియు బి విటమిన్ల లోపం',
  },
  iron: {
    en: 'low blood (anaemia)',
    hi: 'खून की कमी (एनीमिया)',
    te: 'రక్తహీనత (ఎనీమియా)',
  },
  vitamins: {
    en: 'low vitamins and minerals',
    hi: 'विटामिन और मिनरल की कमी',
    te: 'విటమిన్లు మరియు ఖనిజాల లోపం',
  },
  gout: {
    en: 'gout (high uric acid)',
    hi: 'गाउट यानी यूरिक एसिड बढ़ने',
    te: 'గౌట్ (యూరిక్ యాసిడ్ ఎక్కువగా ఉండే సమస్య)',
  },
  joints: {
    en: 'joint pain and stiffness',
    hi: 'जोड़ों के दर्द',
    te: 'కీళ్ల నొప్పుల',
  },
  muscle: {
    en: 'muscle spasm and pain',
    hi: 'मांसपेशियों की ऐंठन और दर्द',
    te: 'కండరాలు పట్టేయడం మరియు నొప్పి',
  },
  ed: {
    en: 'erection problems',
    hi: 'इरेक्शन की समस्या',
    te: 'అంగస్తంభన సమస్యల',
  },
  wound: {
    en: 'cuts, wounds and skin infections',
    hi: 'चोट, घाव और त्वचा के संक्रमणों',
    te: 'గాయాలు మరియు చర్మ ఇన్ఫెక్షన్ల',
  },
  burns: {
    en: 'preventing infection in burns',
    hi: 'जले हुए घाव में संक्रमण रोकने',
    te: 'కాలిన గాయాల్లో ఇన్ఫెక్షన్ రాకుండా నివారించడం',
  },
};

/** Purpose key for every name in medicines.js (brands map like their generic). */
const PURPOSE_OF = {
  // ---- Pain, fever, inflammation ----
  'Paracetamol': 'pain_fever', 'Acetaminophen': 'pain_fever', 'Dolo 650': 'pain_fever', 'Dolo': 'pain_fever',
  'Crocin': 'pain_fever', 'Calpol': 'pain_fever', 'Ibuprofen': 'pain_fever', 'Brufen': 'pain_fever',
  'Combiflam': 'pain_fever', 'Saridon': 'pain_fever', 'Disprin': 'pain_fever',
  'Diclofenac': 'pain_swelling', 'Voveran': 'pain_swelling', 'Aceclofenac': 'pain_swelling',
  'Zerodol': 'pain_swelling', 'Naproxen': 'pain_swelling', 'Nimesulide': 'pain_swelling',
  'Mefenamic Acid': 'pain_swelling', 'Meftal': 'pain_swelling', 'Etoricoxib': 'pain_swelling',
  'Aspirin': 'aspirin', 'Ecosprin': 'clots', 'Tramadol': 'strong_pain',

  // ---- Diabetes ----
  'Metformin': 'diabetes', 'Glycomet': 'diabetes', 'Glimepiride': 'diabetes', 'Amaryl': 'diabetes',
  'Gliclazide': 'diabetes', 'Glipizide': 'diabetes', 'Sitagliptin': 'diabetes', 'Januvia': 'diabetes',
  'Vildagliptin': 'diabetes', 'Galvus': 'diabetes', 'Teneligliptin': 'diabetes',
  'Dapagliflozin': 'diabetes', 'Empagliflozin': 'diabetes', 'Jardiance': 'diabetes',
  'Pioglitazone': 'diabetes', 'Voglibose': 'diabetes', 'Insulin': 'diabetes', 'Glargine': 'diabetes',

  // ---- Blood pressure and heart ----
  'Amlodipine': 'bp_heart', 'Amlong': 'bp_heart', 'Telmisartan': 'bp_heart', 'Telma': 'bp_heart',
  'Losartan': 'bp_heart', 'Olmesartan': 'bp_heart', 'Valsartan': 'bp_heart', 'Ramipril': 'bp_heart',
  'Enalapril': 'bp_heart', 'Lisinopril': 'bp_heart', 'Atenolol': 'bp_heart', 'Metoprolol': 'bp_heart',
  'Bisoprolol': 'bp_heart', 'Carvedilol': 'bp_heart', 'Nebivolol': 'bp_heart', 'Propranolol': 'bp_heart',
  'Hydrochlorothiazide': 'bp_heart', 'Chlorthalidone': 'bp_heart', 'Cilnidipine': 'bp_heart',
  'Furosemide': 'water', 'Lasix': 'water', 'Torsemide': 'water', 'Spironolactone': 'water',
  'Clopidogrel': 'clots', 'Clopilet': 'clots', 'Warfarin': 'clots', 'Apixaban': 'clots', 'Rivaroxaban': 'clots',
  'Digoxin': 'heart', 'Isosorbide': 'heart', 'Nitroglycerin': 'heart', 'Ranolazine': 'heart',

  // ---- Cholesterol ----
  'Atorvastatin': 'cholesterol', 'Atorva': 'cholesterol', 'Rosuvastatin': 'cholesterol',
  'Rosuvas': 'cholesterol', 'Simvastatin': 'cholesterol', 'Fenofibrate': 'cholesterol', 'Ezetimibe': 'cholesterol',

  // ---- Stomach and acidity ----
  'Pantoprazole': 'acidity', 'Pan 40': 'acidity', 'Pantocid': 'acidity', 'Omeprazole': 'acidity',
  'Omez': 'acidity', 'Rabeprazole': 'acidity', 'Razo': 'acidity', 'Esomeprazole': 'acidity',
  'Nexpro': 'acidity', 'Ranitidine': 'acidity', 'Famotidine': 'acidity', 'Sucralfate': 'acidity',
  'Digene': 'acidity', 'Gelusil': 'acidity',
  'Domperidone': 'nausea', 'Ondansetron': 'nausea', 'Emeset': 'nausea', 'Itopride': 'nausea',
  'Lactulose': 'constipation', 'Bisacodyl': 'constipation',
  'Loperamide': 'diarrhoea', 'Racecadotril': 'diarrhoea',
  'Mebeverine': 'cramps', 'Drotaverine': 'cramps', 'Dicyclomine': 'cramps', 'Cyclopam': 'cramps',

  // ---- Antibiotics and anti-infectives ----
  'Azithromycin': 'infection', 'Azithral': 'infection', 'Azee': 'infection', 'Amoxicillin': 'infection',
  'Mox': 'infection', 'Amoxyclav': 'infection', 'Augmentin': 'infection', 'Clavam': 'infection',
  'Cefixime': 'infection', 'Taxim': 'infection', 'Cefuroxime': 'infection', 'Cefpodoxime': 'infection',
  'Ceftriaxone': 'infection', 'Cephalexin': 'infection', 'Ciprofloxacin': 'infection', 'Ciplox': 'infection',
  'Ofloxacin': 'infection', 'Levofloxacin': 'infection', 'Norfloxacin': 'infection', 'Doxycycline': 'infection',
  'Metronidazole': 'infection', 'Flagyl': 'infection', 'Tinidazole': 'infection',
  'Nitrofurantoin': 'infection', 'Linezolid': 'infection', 'Clarithromycin': 'infection',
  'Fluconazole': 'fungal', 'Itraconazole': 'fungal', 'Terbinafine': 'fungal',
  'Albendazole': 'worms', 'Ivermectin': 'worms',
  'Acyclovir': 'virus', 'Valacyclovir': 'virus', 'Oseltamivir': 'flu',
  'Hydroxychloroquine': 'arthritis',

  // ---- Allergy, cold, cough, asthma ----
  'Cetirizine': 'allergy', 'Cetzine': 'allergy', 'Okacet': 'allergy', 'Levocetirizine': 'allergy',
  'Levocet': 'allergy', 'Fexofenadine': 'allergy', 'Allegra': 'allergy', 'Loratadine': 'allergy',
  'Desloratadine': 'allergy', 'Bilastine': 'allergy', 'Chlorpheniramine': 'allergy',
  'Montelukast': 'asthma', 'Montair': 'asthma', 'Montek': 'asthma',
  'Sinarest': 'cold', 'Vicks': 'cold',
  'Ambroxol': 'cough', 'Bromhexine': 'cough', 'Dextromethorphan': 'cough', 'Benadryl': 'cough', 'Ascoril': 'cough',
  'Salbutamol': 'asthma', 'Asthalin': 'asthma', 'Levosalbutamol': 'asthma', 'Budesonide': 'asthma',
  'Formoterol': 'asthma', 'Deriphyllin': 'asthma', 'Theophylline': 'asthma',
  'Prednisolone': 'steroid', 'Wysolone': 'steroid', 'Dexamethasone': 'steroid',
  'Methylprednisolone': 'steroid', 'Deflazacort': 'steroid',

  // ---- Thyroid ----
  'Levothyroxine': 'thyroid_low', 'Thyronorm': 'thyroid_low', 'Eltroxin': 'thyroid_low',
  'Thyrox': 'thyroid_low', 'Carbimazole': 'thyroid_high',

  // ---- Brain, nerves, sleep, mood ----
  'Gabapentin': 'nerve_pain', 'Pregabalin': 'nerve_pain', 'Pregalin': 'nerve_pain',
  'Amitriptyline': 'mood', 'Nortriptyline': 'mood', 'Duloxetine': 'mood', 'Sertraline': 'mood',
  'Escitalopram': 'mood', 'Fluoxetine': 'mood', 'Paroxetine': 'mood',
  'Alprazolam': 'anxiety_sleep', 'Clonazepam': 'anxiety_sleep', 'Lorazepam': 'anxiety_sleep',
  'Diazepam': 'anxiety_sleep', 'Zolpidem': 'anxiety_sleep',
  'Levetiracetam': 'seizures', 'Phenytoin': 'seizures', 'Valproate': 'seizures', 'Carbamazepine': 'seizures',
  'Donepezil': 'memory', 'Memantine': 'memory', 'Levodopa': 'parkinsons', 'Ropinirole': 'parkinsons',
  'Betahistine': 'dizziness', 'Cinnarizine': 'dizziness', 'Flunarizine': 'migraine',
  'Olanzapine': 'mental', 'Risperidone': 'mental', 'Quetiapine': 'mental',

  // ---- Urinary and prostate ----
  'Tamsulosin': 'prostate', 'Urimax': 'prostate', 'Silodosin': 'prostate', 'Finasteride': 'prostate',
  'Dutasteride': 'prostate', 'Solifenacin': 'bladder', 'Tolterodine': 'bladder',

  // ---- Bones, vitamins, supplements ----
  'Calcium': 'calcium', 'Shelcal': 'calcium', 'Calcitriol': 'calcium', 'Cholecalciferol': 'calcium',
  'Uprise': 'calcium', 'Alendronate': 'bones',
  'Methylcobalamin': 'b_vitamin', 'Neurobion': 'b_vitamin', 'Becosules': 'b_vitamin',
  'Folic Acid': 'iron', 'Ferrous Sulphate': 'iron', 'Livogen': 'iron',
  'Limcee': 'vitamins', 'Zincovit': 'vitamins', 'Supradyn': 'vitamins', 'Multivitamin': 'vitamins',
  'Allopurinol': 'gout', 'Febuxostat': 'gout', 'Colchicine': 'gout',
  'Glucosamine': 'joints', 'Thiocolchicoside': 'muscle', 'Methotrexate': 'arthritis',

  // ---- Others ----
  'Sildenafil': 'ed', 'Tadalafil': 'ed', 'ORS': 'ors', 'Electral': 'ors',
  'Povidone Iodine': 'wound', 'Betadine': 'wound', 'Mupirocin': 'wound',
  'Clotrimazole': 'fungal', 'Candid': 'fungal', 'Silver Sulfadiazine': 'burns',
};

const BY_KEY = new Map(Object.entries(PURPOSE_OF).map(([name, purpose]) => [normaliseKey(name), purpose]));

/** Every medicine name that has a description (used by the tests). */
export const DESCRIBED_NAMES = Object.keys(PURPOSE_OF);

/**
 * What a medicine is usually used for, in one language.
 * Works with the shown name or a user correction ("dolo 650", "Pan-40").
 * Returns '' when the medicine is not in the list.
 */
export function usesFor(name, lang = 'en') {
  const purpose = BY_KEY.get(normaliseKey(name));
  if (!purpose) return '';
  return PURPOSES[purpose][lang] || PURPOSES[purpose].en;
}
