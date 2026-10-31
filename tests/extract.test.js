/**
 * Unit tests for the rule-based extraction and narration.
 * Run with:  npm test   (Node 18+; no dependencies)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  levenshtein, similarity, extractFields, findMedicineMatches,
  parseLabelDate, normaliseStrength, isEmptyResult, statusFor,
} from '../js/extract.js';
import { buildNarration, speakable, fieldSentences } from '../js/narration.js';
import { MEDICINES } from '../js/medicines.js';
import { usesFor, PURPOSES, DESCRIBED_NAMES } from '../js/uses.js';

/** Build a fake OCR line. `conf` may be a number or an array (one per word). */
function L(text, conf = 92, height = 30) {
  const words = text.split(/\s+/).filter(Boolean).map((t, i) => ({
    text: t,
    confidence: Array.isArray(conf) ? conf[i] ?? 90 : conf,
  }));
  return { text, confidence: Array.isArray(conf) ? 80 : conf, height, words };
}

const NOW = new Date(2026, 9, 31); // 31 Oct 2026

const SAMPLE = [
  L('PARACETAMOL', 93, 80),
  L('Tablets IP 500 mg', 91, 45),
  L('Each uncoated tablet contains:', 90, 28),
  L('Paracetamol IP 500 mg', 90, 28),
  L('Dosage: Take 1 tablet twice daily after food', 89, 32),
  L('with a glass of water.', 90, 32),
  L('WARNING: Do not exceed 8 tablets in 24 hours.', 88, 30),
  L('Keep out of reach of children.', 90, 30),
  L('Store below 25 C. Protect from light.', 88, 26),
  L('B.No: PCM2417 Mfg: 01/2025 Exp: 12/2027', 90, 30),
  L('10 x 10 Tablets', 85, 24),
];

test('medicine list has 100+ entries', () => {
  assert.ok(MEDICINES.length >= 100, `only ${MEDICINES.length}`);
});

test('levenshtein and similarity', () => {
  assert.equal(levenshtein('kitten', 'sitting'), 3);
  assert.equal(levenshtein('', 'abc'), 3);
  assert.equal(similarity('ABC', 'ABC'), 1);
});

test('extracts all fields from a clean label', () => {
  const f = extractFields(SAMPLE, NOW);
  assert.equal(f.name.value, 'Paracetamol');
  assert.equal(f.name.matched, true);
  assert.equal(f.name.status, 'clear');
  assert.equal(f.strength.value, '500 mg');
  assert.match(f.instructions.value, /Take 1 tablet twice daily after food/);
  assert.match(f.instructions.value, /glass of water/);
  assert.doesNotMatch(f.instructions.value, /exceed|10 x 10|contains|Tablets IP/);
  assert.equal(f.expiry.value, '12/2027');
  assert.deepEqual(f.expiry.parsed, { month: 12, year: 2027 });
  assert.ok(!f.expiry.expired);
  assert.equal(f.batch.value, 'PCM2417');
  assert.match(f.warnings.value, /Do not exceed 8 tablets/);
  assert.match(f.warnings.value, /Keep out of reach/);
});

test('fuzzy matches OCR mistakes, including digit look-alikes', () => {
  const m = findMedicineMatches([L('PARACETAM0L 650', 80), L('Pantopraz0le', 80)]);
  const names = m.map((x) => x.name);
  assert.ok(names.includes('Paracetamol'));
  assert.ok(names.includes('Pantoprazole'));
  assert.equal(findMedicineMatches([L('Amlodipne 5mg')])[0].name, 'Amlodipine');
});

test('matches two-word brand names like Dolo 650', () => {
  const f = extractFields([L('DOLO 650', 90, 70), L('Paracetamol Tablets IP 650 mg', 88, 30)], NOW);
  assert.equal(f.name.value, 'Dolo 650');
  assert.ok(f.name.alternatives.includes('Paracetamol'));
  assert.equal(f.strength.value, '650 mg');
});

test('short brand names need an exact match (no false hits)', () => {
  const m = findMedicineMatches([L('MAX MIX BOX')]);
  assert.equal(m.length, 0);
});

test('unknown medicine falls back to the largest line and is Unsure', () => {
  const f = extractFields([L('ZYXOPRIL', 95, 90), L('Take 1 tablet daily', 90, 30)], NOW);
  assert.equal(f.name.value, 'ZYXOPRIL');
  assert.equal(f.name.matched, false);
  assert.equal(f.name.status, 'unsure');
  const speech = buildNarration(f).join(' ');
  assert.match(speech, /could not find this medicine in my list/);
});

test('strength formats', () => {
  assert.equal(normaliseStrength('2,5', 'mg'), '2.5 mg');
  assert.equal(normaliseStrength('500', 'mq'), '500 mg');
  assert.equal(normaliseStrength('1000', 'iu'), '1000 IU');
  assert.equal(normaliseStrength('1', '%'), '1%');
  const f = extractFields([L('Amlodipine 2.5mg'), L('Vitamin D3 60000 IU')], NOW);
  assert.equal(f.strength.value, '2.5 mg');
  const syrup = extractFields([L('Paracetamol Oral Suspension'), L('Each 5 ml contains Paracetamol 125 mg/5 ml')], NOW);
  assert.equal(syrup.strength.value, '125 mg/5 ml');
  const combo = extractFields([L('Paracetamol 325 mg + Ibuprofen 400 mg')], NOW);
  assert.equal(combo.strength.value, '325 mg + 400 mg');
});

test('date parsing and expired detection', () => {
  assert.deepEqual(parseLabelDate('DEC 2027'), { month: 12, year: 2027 });
  assert.deepEqual(parseLabelDate('03/26'), { month: 3, year: 2026 });
  assert.deepEqual(parseLabelDate('15/08/2028'), { month: 8, year: 2028 });
  assert.equal(parseLabelDate('99/2027'), null);
  const f = extractFields([L('Metformin 500 mg'), L('Use before: 03/2026')], NOW);
  assert.equal(f.expiry.value, '03/2026');
  assert.equal(f.expiry.expired, true);
  // Expiry month itself is still usable
  const g = extractFields([L('Metformin 500 mg'), L('EXP 10/2026')], NOW);
  assert.ok(!g.expiry.expired);
});

test('low confidence lowers the badge', () => {
  assert.equal(statusFor(90, [{ confidence: 95 }]), 'clear');
  assert.equal(statusFor(90, [{ confidence: 40 }, { confidence: 99 }]), 'check');
  assert.equal(statusFor(65), 'check');
  assert.equal(statusFor(40), 'unsure');
  const f = extractFields([L('Paracetamol', 95, 60), L('Tablets 500 mg', [90, 45, 52])], NOW);
  assert.notEqual(f.strength.status, 'clear');
  const speech = fieldSentences(f, 'strength').join(' ');
  assert.equal(speech, 'I am not sure about the strength. It may be 500 milligrams. Please check.');
});

test('empty OCR result detection', () => {
  assert.ok(isEmptyResult([]));
  assert.ok(isEmptyResult([L('~ .', 20)]));
  assert.ok(!isEmptyResult(SAMPLE));
});

test('speakable expands units and short forms', () => {
  assert.equal(speakable('500 mg'), '500 milligrams');
  assert.equal(speakable('1 ml'), '1 millilitre');
  assert.equal(speakable('125 mg/5 ml'), '125 milligrams per 5 millilitres');
  assert.equal(speakable('1 tab BD after food'), '1 tablet twice a day after food');
  assert.equal(speakable('1-0-1'), '1 in the morning, none in the afternoon, 1 at night');
  assert.equal(speakable('500 mg', 'hi'), '500 मिलीग्राम');
  assert.equal(speakable('after food |'), 'after food');
});

test('narration order and pharmacist reminder', () => {
  const s = buildNarration(extractFields(SAMPLE, NOW));
  assert.equal(s[0], 'Medicine name: Paracetamol.');
  assert.equal(s[1], 'Strength: 500 milligrams.');
  assert.ok(s.some((x) => x === 'Expiry date: December 2027.'));
  assert.equal(s.at(-1), 'Please confirm these details with your pharmacist before taking this medicine.');
  const hi = buildNarration(extractFields(SAMPLE, NOW), 'hi');
  assert.match(hi.at(-1), /फार्मासिस्ट/);
  assert.match(hi.join(' '), /दिसंबर 2027/);
});

test('every medicine in the list has a description in all three languages', () => {
  const missing = MEDICINES.filter((m) => !usesFor(m));
  assert.deepEqual(missing, []);
  const extra = DESCRIBED_NAMES.filter((n) => !MEDICINES.includes(n));
  assert.deepEqual(extra, [], 'descriptions for names that are not in the medicine list');
  for (const [key, p] of Object.entries(PURPOSES)) {
    assert.ok(p.en && p.hi && p.te, `purpose ${key} is missing a language`);
  }
});

test('description lookup tolerates spelling of the name', () => {
  assert.equal(usesFor('dolo 650'), 'pain and fever');
  assert.equal(usesFor('Pan-40'), usesFor('Pantoprazole'));
  assert.equal(usesFor('ZYXOPRIL'), '');
});

test('narration says what the medicine is for, after the strength', () => {
  const s = buildNarration(extractFields(SAMPLE, NOW));
  assert.equal(s[2], 'This medicine is usually used for pain and fever.');
  assert.equal(s[3], 'Your doctor may have given it for a different reason.');
  const unknown = buildNarration(extractFields([L('ZYXOPRIL', 95, 90)], NOW)).join(' ');
  assert.match(unknown, /do not know what this medicine is used for/);
  const noName = buildNarration(extractFields([L('Take 1 tablet daily')], NOW)).join(' ');
  assert.doesNotMatch(noName, /used for/);
});

test('Telugu narration: name, description, expiry date and pharmacist reminder', () => {
  const te = buildNarration(extractFields(SAMPLE, NOW), 'te');
  assert.equal(te[0], 'మందు పేరు: Paracetamol.');
  assert.equal(te[1], 'మోతాదు: 500 మిల్లీగ్రాములు.');
  assert.equal(te[2], 'ఈ మందును సాధారణంగా నొప్పి మరియు జ్వరం కోసం వాడతారు.');
  assert.ok(te.includes('గడువు తేదీ: డిసెంబర్ 2027.'));
  assert.match(te.at(-1), /ఫార్మసిస్ట్/);
  const expired = buildNarration(extractFields([L('Metformin 500 mg'), L('EXP 03/2026')], NOW), 'te').join(' ');
  assert.match(expired, /గడువు తేదీ దాటిపోయి/);
});

test('Telugu speakable: units, doses and tablets', () => {
  assert.equal(speakable('1 mg', 'te'), '1 మిల్లీగ్రాము');
  assert.equal(speakable('1-0-1', 'te'), 'ఉదయం 1, మధ్యాహ్నం వద్దు, రాత్రి 1');
  assert.equal(speakable('1/2-0-0', 'te'), 'ఉదయం సగం, మధ్యాహ్నం వద్దు, రాత్రి వద్దు');
  assert.equal(speakable('10 mg/tab', 'te'), '10 మిల్లీగ్రాములు ప్రతి టాబ్లెట్');
  // Existing languages keep their wording.
  assert.equal(speakable('1/2-0-1'), 'half in the morning, none in the afternoon, 1 at night');
  assert.equal(speakable('1/2-0-1', 'hi'), 'आधी सुबह, कुछ नहीं दोपहर, 1 रात');
});
