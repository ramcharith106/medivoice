/**
 * narration.js
 * ------------------------------------------------------------------
 * Turns extracted fields into a list of short sentences to be spoken.
 * - Expands units ("mg" -> "milligrams") and common prescription
 *   short forms ("BD" -> "twice a day", "1-0-1" -> "one in the morning ...").
 * - For unclear fields it says "I am not sure about ... Please check."
 * - Always ends with the pharmacist reminder.
 * - Says what the medicine is usually used for (see uses.js).
 * Supports English ('en'), Hindi ('hi') and Telugu ('te') phrasing.
 *
 * No DOM code here, so it can be tested with Node.
 */

import { MONTH_NAMES } from './extract.js';
import { usesFor } from './uses.js';

/* ------------------------------------------------------------------ */
/* Phrases                                                            */
/* ------------------------------------------------------------------ */

export const PHRASES = {
  en: {
    fields: {
      name: 'Medicine name',
      strength: 'Strength',
      instructions: 'How to take it',
      expiry: 'Expiry date',
      batch: 'Batch number',
      warnings: 'Warning',
      uses: 'Used for',
    },
    fieldInSentence: {
      name: 'the medicine name',
      strength: 'the strength',
      instructions: 'the instructions',
      expiry: 'the expiry date',
      batch: 'the batch number',
      warnings: 'the warning',
    },
    unsure: (field, value) => `I am not sure about ${field}. It may be ${value}. Please check.`,
    nameNotInList: (value) => `I could not find this medicine in my list. The name may be ${value}. Please check.`,
    nameMissing: 'I could not find the medicine name on this label. Please check it with your pharmacist.',
    missing: {
      strength: 'I could not find the strength.',
      instructions: 'I could not find instructions on how to take this medicine.',
      expiry: 'I could not find the expiry date.',
    },
    expired: 'Warning. This medicine may be past its expiry date. Do not take it until a pharmacist checks it.',
    uses: (text) => `This medicine is usually used for ${text}.`,
    usesCaveat: 'Your doctor may have given it for a different reason.',
    usesUnknown: 'I do not know what this medicine is used for. Please ask your pharmacist.',
    noText: 'I could not read the label. Try more light, hold the camera steady, and fill the frame with the label.',
    pharmacist: 'Please confirm these details with your pharmacist before taking this medicine.',
    units: {
      mg: 'milligrams', mcg: 'micrograms', g: 'grams', ml: 'millilitres',
      IU: 'international units', '%': 'percent',
    },
    oneUnit: {
      mg: 'milligram', mcg: 'microgram', g: 'gram', ml: 'millilitre',
      IU: 'international unit', '%': 'percent',
    },
    per: 'per',
    plus: 'and',
    tablet: 'tablet',
    tablets: 'tablets',
    half: 'half',
    dose: ['in the morning', 'in the afternoon', 'at night'],
    none: 'none',
    months: MONTH_NAMES,
  },
  hi: {
    fields: {
      name: 'दवा का नाम',
      strength: 'मात्रा',
      instructions: 'कैसे लें',
      expiry: 'समाप्ति तिथि',
      batch: 'बैच नंबर',
      warnings: 'चेतावनी',
      uses: 'किस लिए',
    },
    fieldInSentence: {
      name: 'दवा के नाम',
      strength: 'मात्रा',
      instructions: 'निर्देशों',
      expiry: 'समाप्ति तिथि',
      batch: 'बैच नंबर',
      warnings: 'चेतावनी',
    },
    unsure: (field, value) => `मुझे ${field} के बारे में पक्का नहीं है। यह ${value} हो सकता है। कृपया जाँच लें।`,
    nameNotInList: (value) => `यह दवा मेरी सूची में नहीं मिली। नाम ${value} हो सकता है। कृपया जाँच लें।`,
    nameMissing: 'मुझे इस लेबल पर दवा का नाम नहीं मिला। कृपया अपने फार्मासिस्ट से पूछें।',
    missing: {
      strength: 'मुझे मात्रा नहीं मिली।',
      instructions: 'मुझे दवा लेने के निर्देश नहीं मिले।',
      expiry: 'मुझे समाप्ति तिथि नहीं मिली।',
    },
    expired: 'चेतावनी। इस दवा की समाप्ति तिथि निकल चुकी हो सकती है। फार्मासिस्ट से जाँच कराए बिना इसे न लें।',
    uses: (text) => `यह दवा आमतौर पर ${text} के लिए दी जाती है।`,
    usesCaveat: 'आपके डॉक्टर ने इसे किसी और कारण से भी दिया हो सकता है।',
    usesUnknown: 'मुझे नहीं पता कि यह दवा किस लिए है। कृपया अपने फार्मासिस्ट से पूछें।',
    noText: 'मैं लेबल नहीं पढ़ सका। ज़्यादा रोशनी करें, कैमरा स्थिर रखें, और लेबल को पूरे फ्रेम में रखें।',
    pharmacist: 'यह दवा लेने से पहले कृपया अपने फार्मासिस्ट से इन जानकारियों की पुष्टि करें।',
    units: {
      mg: 'मिलीग्राम', mcg: 'माइक्रोग्राम', g: 'ग्राम', ml: 'मिलीलीटर',
      IU: 'इंटरनेशनल यूनिट', '%': 'प्रतिशत',
    },
    oneUnit: null, // Hindi does not change the unit word for "one"
    per: 'प्रति',
    plus: 'और',
    tablet: 'टैबलेट',
    tablets: 'टैबलेट',
    half: 'आधी',
    dose: ['सुबह', 'दोपहर', 'रात'],
    none: 'कुछ नहीं',
    months: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  },
  te: {
    fields: {
      name: 'మందు పేరు',
      strength: 'మోతాదు',
      instructions: 'ఎలా వేసుకోవాలి',
      expiry: 'గడువు తేదీ',
      batch: 'బ్యాచ్ నంబర్',
      warnings: 'హెచ్చరిక',
      uses: 'దేనికి వాడతారు',
    },
    fieldInSentence: {
      name: 'మందు పేరు',
      strength: 'మోతాదు',
      instructions: 'సూచనల',
      expiry: 'గడువు తేదీ',
      batch: 'బ్యాచ్ నంబర్',
      warnings: 'హెచ్చరిక',
    },
    unsure: (field, value) => `${field} గురించి నాకు ఖచ్చితంగా తెలియదు. అది ${value} కావచ్చు. దయచేసి సరిచూసుకోండి.`,
    nameNotInList: (value) => `ఈ మందు నా జాబితాలో లేదు. పేరు ${value} కావచ్చు. దయచేసి సరిచూసుకోండి.`,
    nameMissing: 'ఈ లేబుల్‌పై మందు పేరు నాకు కనిపించలేదు. దయచేసి మీ ఫార్మసిస్ట్‌ను అడగండి.',
    missing: {
      strength: 'మోతాదు నాకు కనిపించలేదు.',
      instructions: 'ఈ మందు ఎలా వేసుకోవాలో సూచనలు నాకు కనిపించలేదు.',
      expiry: 'గడువు తేదీ నాకు కనిపించలేదు.',
    },
    expired: 'హెచ్చరిక. ఈ మందు గడువు తేదీ దాటిపోయి ఉండవచ్చు. ఫార్మసిస్ట్ చూడకుండా దీన్ని వేసుకోకండి.',
    uses: (text) => `ఈ మందును సాధారణంగా ${text} కోసం వాడతారు.`,
    usesCaveat: 'మీ డాక్టర్ దీన్ని వేరే కారణం కోసం కూడా ఇచ్చి ఉండవచ్చు.',
    usesUnknown: 'ఈ మందు దేనికి వాడతారో నాకు తెలియదు. దయచేసి మీ ఫార్మసిస్ట్‌ను అడగండి.',
    noText: 'నేను లేబుల్ చదవలేకపోయాను. ఎక్కువ వెలుతురులో, కెమెరాను కదలకుండా పట్టుకుని, లేబుల్ మొత్తం ఫోటోలో వచ్చేలా తీయండి.',
    pharmacist: 'ఈ మందు వేసుకునే ముందు దయచేసి ఈ వివరాలను మీ ఫార్మసిస్ట్‌తో సరిచూసుకోండి.',
    units: {
      mg: 'మిల్లీగ్రాములు', mcg: 'మైక్రోగ్రాములు', g: 'గ్రాములు', ml: 'మిల్లీలీటర్లు',
      IU: 'ఇంటర్నేషనల్ యూనిట్లు', '%': 'శాతం',
    },
    oneUnit: {
      mg: 'మిల్లీగ్రాము', mcg: 'మైక్రోగ్రాము', g: 'గ్రాము', ml: 'మిల్లీలీటరు',
      IU: 'ఇంటర్నేషనల్ యూనిట్', '%': 'శాతం',
    },
    per: 'ప్రతి',
    plus: 'మరియు',
    tablet: 'టాబ్లెట్',
    tablets: 'టాబ్లెట్లు',
    half: 'సగం',
    dose: ['ఉదయం', 'మధ్యాహ్నం', 'రాత్రి'],
    none: 'ఏమీ లేదు',
    // Telugu puts the time first: "ఉదయం 1", and "మధ్యాహ్నం వద్దు" for a 0 dose.
    doseItem: (amount, time, zero) => (zero ? `${time} వద్దు` : `${time} ${amount}`),
    months: ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జులై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'],
  },
};

/* ------------------------------------------------------------------ */
/* Making text easy to listen to                                      */
/* ------------------------------------------------------------------ */

/** Prescription short forms read in full (English only; matched as whole upper-case words). */
const SHORT_FORMS = [
  [/\bOD\b/g, 'once a day'],
  [/\b(?:BD|BID)\b/g, 'twice a day'],
  [/\b(?:TDS|TID)\b/g, 'three times a day'],
  [/\bQID\b/g, 'four times a day'],
  [/\bHS\b/g, 'at bedtime'],
  [/\bSOS\b/g, 'only when needed'],
  [/\bPRN\b/g, 'only when needed'],
  [/\bAC\b/g, 'before food'],
  [/\bPC\b/g, 'after food'],
  [/\b[Tt]abs?\b\.?/g, 'tablet'],
  [/\b[Cc]aps?\b\.?/g, 'capsule'],
  [/\b[Hh]rs?\b\.?/g, 'hours'],
  [/\bIP\b|\bBP\b|\bUSP\b/g, ''], // pharmacopoeia marks are noise when spoken
];

/**
 * Make label text easy to listen to:
 *   "500 mg"   -> "500 milligrams"
 *   "1-0-1"    -> "1 in the morning, none in the afternoon, 1 at night"
 *   "BD"       -> "twice a day"
 */
export function speakable(text, lang = 'en') {
  const P = PHRASES[lang] || PHRASES.en;
  // Drop stray OCR symbols that would be read out as noise ("|", "~", "_"...).
  let s = String(text || '').replace(/[|~_^*#<>{}\[\]\\=]+/g, ' ');

  // Dose pattern morning-afternoon-night, e.g. 1-0-1 or 1/2-0-1
  s = s.replace(/\b(\d(?:\/\d)?)\s*-\s*(\d(?:\/\d)?)\s*-\s*(\d(?:\/\d)?)\b/g, (_, a, b, c) =>
    [a, b, c]
      .map((n, i) => {
        const amount = n === '0' ? P.none : n.replace('1/2', P.half);
        return P.doseItem ? P.doseItem(amount, P.dose[i], n === '0') : `${amount} ${P.dose[i]}`;
      })
      .join(', '));

  if (lang === 'en') for (const [re, rep] of SHORT_FORMS) s = s.replace(re, rep);

  // Units after a number. "/ml" style ratios become "per millilitre".
  s = s.replace(/(\d+(?:\.\d+)?)\s*(mcg|mg|ml|IU|iu|gm|g|%)(?![a-zA-Z])(?:\s*\/\s*(\d+(?:\.\d+)?)?\s*(ml|g|tab|tablet))?/g,
    (_, num, unit, perNum, perUnit) => {
      let u = unit === 'iu' ? 'IU' : unit === 'gm' ? 'g' : unit;
      const one = num === '1' && P.oneUnit;
      let out = `${num} ${(one ? P.oneUnit : P.units)[u] || u}`;
      if (perUnit) {
        // "5 mg/ml" -> "5 milligrams per millilitre", "125 mg/5 ml" -> "... per 5 millilitres"
        const many = perNum && perNum !== '1';
        const pu = perUnit.startsWith('tab')
          ? (many ? P.tablets : P.tablet)
          : (many ? P.units : P.oneUnit || P.units)[perUnit] || perUnit;
        out += ` ${P.per} ${perNum ? perNum + ' ' : ''}${pu}`;
      }
      return out;
    });

  // Joiner used between multiple strengths
  s = s.replace(/\s\+\s/g, ` ${P.plus} `);

  // Line breaks become sentence pauses; tidy spaces.
  return s.replace(/\s*\n\s*/g, '. ').replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim();
}

/** "12/2027" -> "December 2027" when the date was understood. */
export function speakableDate(field, lang = 'en') {
  const P = PHRASES[lang] || PHRASES.en;
  if (field.parsed) return `${P.months[field.parsed.month - 1]} ${field.parsed.year}`;
  return speakable(field.value, lang);
}

/* ------------------------------------------------------------------ */
/* Building the full narration                                        */
/* ------------------------------------------------------------------ */

/** Fields read in the full narration, in this order. 'uses' is worked out from the name. */
export const NARRATION_ORDER = ['name', 'strength', 'uses', 'instructions', 'expiry', 'warnings'];

/**
 * "This medicine is usually used for pain and fever." plus a reminder
 * that the doctor may have had another reason. Nothing is said when the
 * name itself was not found (the name sentence already covers that).
 */
export function usesSentences(fields, lang = 'en') {
  const P = PHRASES[lang] || PHRASES.en;
  const name = fields.name;
  if (!name || !name.value) return [];
  const text = usesFor(name.value, lang);
  return text ? [P.uses(text), P.usesCaveat] : [P.usesUnknown];
}

/**
 * Sentences for one field.
 * Clear fields are read plainly; "Check"/"Unsure" fields are read as
 * "I am not sure about the strength. It may be 500 milligrams. Please check."
 */
export function fieldSentences(fields, key, lang = 'en') {
  if (key === 'uses') return usesSentences(fields, lang);
  const P = PHRASES[lang] || PHRASES.en;
  const f = fields[key];
  const out = [];
  const say = (spoken) => {
    if (f.status === 'clear') out.push(`${P.fields[key]}: ${spoken}.`);
    else out.push(P.unsure(P.fieldInSentence[key], spoken));
  };

  if (!f || !f.value) {
    if (key === 'name') out.push(P.nameMissing);
    else if (P.missing[key]) out.push(P.missing[key]);
    return out;
  }

  switch (key) {
    case 'name':
      if (!f.matched && !f.edited) out.push(P.nameNotInList(speakable(f.value, lang)));
      else say(speakable(f.value, lang));
      break;
    case 'instructions':
      if (f.status === 'clear') {
        out.push(`${P.fields.instructions}:`);
        f.value.split('\n').filter(Boolean).forEach((l) => out.push(speakable(l, lang) + '.'));
      } else {
        say(speakable(f.value, lang));
      }
      break;
    case 'expiry':
      say(speakableDate(f, lang));
      if (f.expired) out.push(P.expired);
      break;
    case 'warnings':
      f.value.split('\n').filter(Boolean).forEach((l, i) => {
        const text = speakable(l, lang);
        if (f.status === 'clear') out.push(i === 0 ? `${P.fields.warnings}: ${text}.` : `${text}.`);
        else out.push(P.unsure(P.fieldInSentence.warnings, text));
      });
      break;
    default: // strength, batch
      say(key === 'batch' ? spellOut(f.value) : speakable(f.value, lang));
  }
  return tidy(out);
}

/** Read codes like "PCM2417" letter by letter so they are understandable. */
function spellOut(code) {
  return String(code).split('').join(' ');
}

const tidy = (list) => list.map((s) => s.replace(/\.{2,}/g, '.').replace(/:\./g, ':'));

/**
 * Build the list of sentences to speak for a whole scan result:
 * name, strength, instructions, expiry, warnings, then the pharmacist reminder.
 * Each item is a short string; speaking them one by one avoids
 * browser bugs with very long utterances and lets the user pause.
 */
export function buildNarration(fields, lang = 'en') {
  const P = PHRASES[lang] || PHRASES.en;
  const out = [];
  for (const key of NARRATION_ORDER) out.push(...fieldSentences(fields, key, lang));
  out.push(P.pharmacist); // always end with the pharmacist reminder
  return out;
}
