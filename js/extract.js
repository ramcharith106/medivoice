/**
 * extract.js
 * ------------------------------------------------------------------
 * Rule-based extraction of label fields from OCR output.
 *
 * Input: an array of OCR lines, each shaped like
 *   { text, confidence, height, words: [{ text, confidence }] }
 * (see ocr.js -> normaliseOcrData)
 *
 * Output: an object of fields:
 *   name, strength, instructions, expiry, batch, warnings
 * Each field:
 *   {
 *     key, label,
 *     value:       string shown to the user ('' if not found),
 *     confidence:  0-100 average OCR confidence of the source words,
 *     status:      'clear' | 'check' | 'unsure',
 *     words:       [{ text, confidence }] source words (for highlighting),
 *     note:        optional plain-language note for the user,
 *     matched:     (name only) true if found in the medicine list,
 *     alternatives:(name only) other medicine names seen on the label,
 *     expired:     (expiry only) true if the date is in the past,
 *   }
 *
 * This file has no DOM code so it can be unit tested with Node.
 */

import { MEDICINE_KEYS, normaliseKey } from './medicines.js';

/* ------------------------------------------------------------------ */
/* Confidence thresholds                                              */
/* ------------------------------------------------------------------ */

/** Word highlighting: below LOW = yellow, below BAD = red. */
export const WORD_LOW = 70;
export const WORD_BAD = 50;

/** Field badge: average >= CLEAR -> "Clear", >= CHECK -> "Check", else "Unsure". */
export const FIELD_CLEAR = 80;
export const FIELD_CHECK = 60;

export const FIELD_LABELS = {
  name: 'Medicine name',
  strength: 'Strength',
  instructions: 'How to take',
  expiry: 'Expiry date',
  batch: 'Batch number',
  warnings: 'Warnings',
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */

/** Classic Levenshtein edit distance (insert / delete / substitute). */
export function levenshtein(a, b) {
  a = String(a);
  b = String(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Similarity between 0 and 1 (1 = identical). */
export function similarity(a, b) {
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - levenshtein(a, b) / max;
}

/**
 * OCR often confuses digits and letters inside words.
 * For matching words that are mostly letters, map common look-alikes.
 *   "PARACETAM0L" -> "PARACETAMOL", "AML0DIP1NE" -> "AMLODIPINE"
 */
function fixLookalikes(key) {
  const letters = key.replace(/[^A-Z]/g, '').length;
  if (letters < key.length / 2) return key; // mostly digits, leave it
  return key.replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B');
}

const average = (nums) => (nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0);

/** Average confidence of a list of words, rounded. */
export function avgConfidence(words) {
  return Math.round(average(words.map((w) => Number(w.confidence) || 0)));
}

/**
 * Decide the badge for a field from its source words.
 * A single very unclear word in a short field (like "500 mg") also
 * lowers a "Clear" to "Check", because averages can hide one bad digit.
 */
export function statusFor(confidence, words = []) {
  let status = confidence >= FIELD_CLEAR ? 'clear' : confidence >= FIELD_CHECK ? 'check' : 'unsure';
  if (status === 'clear' && words.some((w) => w.confidence < WORD_BAD)) status = 'check';
  return status;
}

function makeField(key, value, words, extra = {}) {
  const confidence = value ? avgConfidence(words) : 0;
  return {
    key,
    label: FIELD_LABELS[key],
    value: value || '',
    confidence,
    status: value ? statusFor(confidence, words) : 'unsure',
    words: words.map((w) => ({ text: w.text, confidence: Math.round(w.confidence) })),
    note: '',
    ...extra,
  };
}

/** Clean a word for comparing against matched text. */
const cleanToken = (t) => String(t).toLowerCase().replace(/[^a-z0-9.%/\-]/g, '');

/** Words in `line` whose text is part of `fragment` (used to score a regex match). */
function wordsInFragment(line, fragment) {
  const frag = cleanToken(fragment).replace(/\s+/g, '');
  const found = line.words.filter((w) => {
    const c = cleanToken(w.text);
    return c.length > 0 && frag.includes(c);
  });
  return found.length ? found : line.words;
}

/* ------------------------------------------------------------------ */
/* Keyword patterns                                                   */
/* ------------------------------------------------------------------ */

const EXPIRY_RE = /\b(?:exp(?:iry|\.|\b)(?:\s*date)?|expires?|use\s*(?:before|by)|best\s*before)\s*[:.\-]?\s*/i;
const BATCH_RE = /\b(?:b\.?\s*no|batch(?:\s*no)?|lot(?:\s*no)?)\b\.?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/i;
const MFG_RE = /\b(?:mfg|mfd|manufactured|mfg\.?\s*date)\b/i;

const WARNING_RE = /\b(warning|warnings|caution|keep\s+out\s+of\s+(?:the\s+)?reach|do\s+not\s+exceed|not\s+for\s+children|overdose|harmful|avoid\s+alcohol|do\s+not\s+use|consult\s+(?:your\s+)?doctor|pregnan)/i;

/**
 * Instruction words. "Strong" words alone make a line an instruction.
 * Words like "tablet" also appear in the product name ("Paracetamol Tablets IP"),
 * so they only count when they follow a number ("1 tablet", "2 capsules").
 */
const INSTRUCTION_RE = /\b(take|taken|daily|once|twice|thrice|times|morning|night|bedtime|before\s+(?:food|meals?|breakfast|sleep)|after\s+(?:food|meals?|breakfast)|with\s+(?:water|food|milk)|water|dose|dosage|directions?|swallow|chew|dissolve|as\s+directed|every|hourly|apply|teaspoons?|\d\s*-\s*\d\s*-\s*\d)\b|\b\d+(?:\/\d+)?\s*(?:tablets?|tabs?|capsules?|caps?|drops?|spoons?|ml)\b/i;

/** Lines that describe what is inside, or the pack size, are not instructions. */
const NOT_INSTRUCTION_RE = /\b(contains|composition|each\s+(?:uncoated\s+|film[\s-]*coated\s+)?(?:tablet|capsule|ml)|excipients?|colou?r|q\.?s\.?|\d+\s*x\s*\d+|strip|store|storage|schedule\s+h|rx\s+only|manufactured|marketed|mfg|lic\.?\s*no|m\.?r\.?p)/i;

/** Number + unit, tolerant of a missing space and of OCR reading "g" as "q" or "9". */
const STRENGTH_RE = /(\d+(?:[.,]\d+)?)\s*(mcg|µg|ug|mg|m[q9]|gm|g|ml|iu|i\.u\.|%)(?![a-z])(\s*\/\s*(?:\d+(?:\.\d+)?\s*)?(?:ml|g|tab|tablet|dose))?/gi;

/* ------------------------------------------------------------------ */
/* Medicine name                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fuzzy-match words (and pairs of adjacent words, for names like
 * "Dolo 650") against the built-in medicine list.
 * Returns matches sorted best first.
 */
export function findMedicineMatches(lines) {
  const matches = [];
  lines.forEach((line, lineIndex) => {
    const words = line.words;
    for (let i = 0; i < words.length; i++) {
      // Single word and two-word candidates
      const candidates = [[words[i]]];
      if (i + 1 < words.length) candidates.push([words[i], words[i + 1]]);

      for (const cand of candidates) {
        const raw = normaliseKey(cand.map((w) => w.text).join(''));
        if (raw.length < 3) continue;
        const key = fixLookalikes(raw);

        for (const med of MEDICINE_KEYS) {
          // Short names (Mox, ORS, Azee...) must match exactly to avoid false hits.
          if (med.key.length <= 4) {
            if (raw !== med.key && key !== med.key) continue;
          } else if (Math.abs(med.key.length - key.length) > 2) {
            continue;
          }
          const sim = Math.max(similarity(key, med.key), similarity(raw, med.key));
          const needed = med.key.length <= 6 ? 0.8 : 0.75;
          if (sim < needed) continue;

          const ocrConf = avgConfidence(cand);
          matches.push({
            name: med.name,
            similarity: sim,
            words: cand,
            lineIndex,
            height: line.height || 0,
            // Final score: how close the spelling is, how sure OCR was,
            // and a small bonus for bigger text (brand names are large).
            score: sim * 100 + ocrConf * 0.2 + Math.min(line.height || 0, 200) * 0.05 + (cand.length > 1 ? 2 : 0),
          });
        }
      }
    }
  });
  matches.sort((a, b) => b.score - a.score || a.lineIndex - b.lineIndex);
  return matches;
}

function extractName(lines, usedLines) {
  const matches = findMedicineMatches(lines);

  if (matches.length) {
    const best = matches[0];
    // Confidence blends OCR certainty with how close the spelling was.
    const ocrConf = avgConfidence(best.words);
    const field = makeField('name', best.name, best.words, { matched: true, lineIndex: best.lineIndex });
    field.confidence = Math.round(ocrConf * best.similarity);
    field.status = statusFor(field.confidence, best.words);
    const seen = best.words.map((w) => w.text).join(' ');
    if (normaliseKey(seen) !== normaliseKey(best.name)) {
      field.note = `The label text looked like "${seen}". I matched it to ${best.name}.`;
    }
    // Other different medicine names found (e.g. brand + generic).
    field.alternatives = [...new Set(matches.map((m) => m.name))].filter((n) => n !== best.name).slice(0, 3);
    return field;
  }

  // No match: fall back to the largest line of mostly-letter text
  // (on packs the brand name is usually the biggest print).
  const candidates = lines
    .map((line, i) => ({ line, i }))
    .filter(({ line, i }) => !usedLines.has(i) && (line.text.match(/[A-Za-z]/g) || []).length >= 3)
    .filter(({ line }) => !INSTRUCTION_RE.test(line.text) && !WARNING_RE.test(line.text));
  if (!candidates.length) {
    return makeField('name', '', [], {
      matched: false,
      alternatives: [],
      note: 'I could not find the medicine name.',
    });
  }
  candidates.sort((a, b) => (b.line.height || 0) - (a.line.height || 0) || a.i - b.i);
  const { line, i } = candidates[0];
  const field = makeField('name', line.text.trim(), line.words, { matched: false, alternatives: [], lineIndex: i });
  field.status = 'unsure'; // never trust an unmatched name
  field.note = 'This name is not in my medicine list. Please check it carefully.';
  return field;
}

/* ------------------------------------------------------------------ */
/* Strength                                                           */
/* ------------------------------------------------------------------ */

/** Tidy one strength match: "500mq" -> "500 mg", "2,5mg" -> "2.5 mg". */
export function normaliseStrength(num, unit, per = '') {
  let u = unit.toLowerCase();
  if (u === 'mq' || u === 'm9') u = 'mg';
  if (u === 'ug' || u === 'µg') u = 'mcg';
  if (u === 'gm') u = 'g';
  if (u === 'i.u.' || u === 'iu') u = 'IU';
  const n = num.replace(',', '.');
  // "125 mg / 5 ml" -> "125 mg/5 ml"
  const tail = per ? per.replace(/\s*\/\s*/, '/').replace(/\s+/g, ' ').trimEnd() : '';
  return u === '%' ? `${n}%${tail}` : `${n} ${u}${tail}`;
}

function extractStrength(lines, usedLines, nameLineIndex) {
  // Collect lines that contain at least one strength.
  const found = [];
  lines.forEach((line, i) => {
    if (usedLines.has(i)) return; // skip expiry / batch lines
    const all = [...line.text.matchAll(STRENGTH_RE)];
    if (all.length) found.push({ line, i, all });
  });
  if (!found.length) return makeField('strength', '', []);

  // Prefer: the name line, then a "contains" line, then the first one.
  const pick =
    found.find((f) => f.i === nameLineIndex) ||
    found.find((f) => /contains|composition|each/i.test(f.line.text)) ||
    found[0];

  // A bare volume ("Each 5 ml contains...") is not the strength when a
  // weight is on the same line, so drop plain ml values in that case.
  let chosen = pick.all;
  const hasWeight = chosen.some((m) => !/^ml$/i.test(m[2]));
  if (hasWeight) chosen = chosen.filter((m) => !/^ml$/i.test(m[2]));
  const values = [...new Set(chosen.map((m) => normaliseStrength(m[1], m[2], m[3] || '')))];
  const value = values.join(' + ');
  const words = chosen.flatMap((m) => wordsInFragment(pick.line, m[0]));
  return makeField('strength', value, [...new Set(words)]);
}

/* ------------------------------------------------------------------ */
/* Expiry and batch                                                   */
/* ------------------------------------------------------------------ */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const DATE_RE = /(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}\s*[\/.\-]\s*\d{2,4}|[A-Za-z]{3,9}\.?\s*[\/\-'.]?\s*\d{2,4})/;

/**
 * Parse a label date like "12/2027", "12-27", "DEC 2027", "Dec.27", "31/12/2027".
 * Returns { month (1-12), year } or null.
 */
export function parseLabelDate(s) {
  if (!s) return null;
  const t = s.trim().toUpperCase();
  let m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/); // DD/MM/YYYY
  if (m) return fixYear(+m[2], m[3]);
  m = t.match(/^(\d{1,2})\s*[\/.\-]\s*(\d{2,4})$/); // MM/YYYY
  if (m) return fixYear(+m[1], m[2]);
  m = t.match(/^([A-Z]{3,9})\.?\s*[\/\-'.]?\s*(\d{2,4})$/); // MON YYYY
  if (m) {
    const idx = MONTHS.indexOf(m[1].slice(0, 3));
    if (idx >= 0) return fixYear(idx + 1, m[2]);
  }
  return null;
}

function fixYear(month, yearStr) {
  if (month < 1 || month > 12) return null;
  let year = +yearStr;
  if (yearStr.length === 2) year += 2000;
  if (year < 2000 || year > 2100) return null;
  return { month, year };
}

function extractExpiry(lines, now) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = EXPIRY_RE.exec(line.text);
    if (!m) continue;
    const rest = line.text.slice(m.index + m[0].length);
    const dm = rest.match(DATE_RE);
    const value = dm ? dm[1].trim() : rest.split(/\s{2,}|\b(?:mfg|b\.?\s*no|batch|mrp)\b/i)[0].trim();
    if (!value) continue;
    const words = wordsInFragment(line, value);
    const field = makeField('expiry', value, words, { lineIndex: i });
    const parsed = parseLabelDate(value);
    if (parsed) {
      field.parsed = parsed;
      // Medicines expire at the END of the printed month.
      const endOfMonth = new Date(parsed.year, parsed.month, 1);
      if (endOfMonth <= now) {
        field.expired = true;
        field.note = 'This date looks like it has already passed. Do not use this medicine until a pharmacist checks it.';
      }
    } else {
      field.note = 'I could not understand this date. Please check it.';
      if (field.status === 'clear') field.status = 'check';
    }
    return field;
  }
  return makeField('expiry', '', []);
}

function extractBatch(lines) {
  for (let i = 0; i < lines.length; i++) {
    const m = BATCH_RE.exec(lines[i].text);
    if (!m) continue;
    return makeField('batch', m[1], wordsInFragment(lines[i], m[1]), { lineIndex: i });
  }
  return makeField('batch', '', []);
}

/* ------------------------------------------------------------------ */
/* Instructions and warnings                                          */
/* ------------------------------------------------------------------ */

function linesField(key, chosen) {
  const value = chosen.map((l) => l.text.trim()).join('\n');
  const words = chosen.flatMap((l) => l.words);
  // Remember how many words each line has, so the UI can keep line breaks
  // while highlighting unclear words.
  return makeField(key, value, words, { lineWordCounts: chosen.map((l) => l.words.length) });
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Extract all fields from OCR lines.
 * @param {Array} lines  normalised OCR lines
 * @param {Date}  now    current date (injectable for tests)
 */
export function extractFields(lines, now = new Date()) {
  lines = (lines || []).filter((l) => l && l.text && l.text.trim());

  // Lines used for expiry / batch / manufacture date are excluded from other fields.
  const dateLines = new Set();
  lines.forEach((l, i) => {
    if (EXPIRY_RE.test(l.text) || BATCH_RE.test(l.text) || MFG_RE.test(l.text)) dateLines.add(i);
  });

  const expiry = extractExpiry(lines, now);
  const batch = extractBatch(lines);

  // Warnings take priority over instructions ("Do not exceed 8 tablets" is a warning).
  const warningLines = [];
  const instructionLines = [];
  lines.forEach((l, i) => {
    if (dateLines.has(i)) return;
    if (WARNING_RE.test(l.text)) warningLines.push(l);
    else if (INSTRUCTION_RE.test(l.text) && !NOT_INSTRUCTION_RE.test(l.text)) instructionLines.push(l);
  });

  const name = extractName(lines, dateLines);
  const strength = extractStrength(lines, dateLines, name.lineIndex ?? -1);

  return {
    name,
    strength,
    instructions: linesField('instructions', instructionLines),
    expiry,
    batch,
    warnings: linesField('warnings', warningLines),
  };
}

/** True if OCR found nothing usable. */
export function isEmptyResult(lines) {
  const letters = (lines || []).map((l) => l.text).join(' ').replace(/[^A-Za-z0-9]/g, '');
  const goodWords = (lines || []).flatMap((l) => l.words).filter((w) => w.confidence >= 30 && /[A-Za-z0-9]{2,}/.test(w.text));
  return letters.length < 4 || goodWords.length < 2;
}
