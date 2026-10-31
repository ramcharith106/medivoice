/**
 * app.js
 * ------------------------------------------------------------------
 * Main controller for MediVoice. Wires the page together:
 *   Step 1  capture / upload / drag-drop / sample  -> preview + rotate
 *   Step 2  preprocess (canvas) -> OCR (Tesseract.js) with progress
 *   Step 3  extract fields -> editable result cards with confidence badges
 *   Speech  read aloud with Play / Pause / Stop / Repeat, speed, language
 *   History recent scans in localStorage
 */

import { preprocess, loadImage, drawRotated, thumbnail } from './preprocess.js';
import { recognise } from './ocr.js';
import {
  extractFields, isEmptyResult, parseLabelDate, WORD_LOW, WORD_BAD, FIELD_LABELS,
} from './extract.js';
import { buildNarration, fieldSentences, PHRASES } from './narration.js';
import { usesFor } from './uses.js';
import { Speaker } from './speech.js';
import { drawSampleLabel } from './sample.js';
import {
  loadHistory, upsertScan, getScan, clearHistory, loadSettings, saveSettings,
} from './history.js';

/* ------------------------------------------------------------------ */
/* DOM references                                                     */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);
const els = {
  live: $('live'),
  cameraBtn: $('camera-btn'), uploadBtn: $('upload-btn'), sampleBtn: $('sample-btn'),
  cameraInput: $('camera-input'), uploadInput: $('upload-input'), dropzone: $('dropzone'),
  previewArea: $('preview-area'), previewCanvas: $('preview-canvas'),
  rotateLeft: $('rotate-left'), rotateRight: $('rotate-right'),
  enhanceCheck: $('enhance-check'), readBtn: $('read-btn'),
  stepProgress: $('step-progress'), hProgress: $('h-progress'),
  progressBar: $('progress-bar'), progressPct: $('progress-pct'), progressLabel: $('progress-label'),
  stepResults: $('step-results'), hResults: $('h-results'),
  errorBox: $('error-box'), errorText: $('error-text'), retryBtn: $('retry-btn'),
  resultBody: $('result-body'), summary: $('summary'), cards: $('cards'),
  confirmCheck: $('confirm-check'),
  rateSlider: $('rate-slider'), rateOut: $('rate-out'), langSelect: $('lang-select'),
  voiceNote: $('voice-note'), noSpeech: $('no-speech'), speechSettings: $('speech-settings'),
  rawText: $('raw-text'), processedFigure: $('processed-figure'), processedHolder: $('processed-holder'),
  newScanBtn: $('new-scan-btn'),
  speechBar: $('speech-bar'), playBtn: $('play-btn'), playLabel: $('play-label'),
  pauseBtn: $('pause-btn'), stopBtn: $('stop-btn'), repeatBtn: $('repeat-btn'),
  historyList: $('history-list'), historyEmpty: $('history-empty'), clearHistoryBtn: $('clear-history-btn'),
  themeBtn: $('theme-btn'),
};

const FIELD_ORDER = ['name', 'strength', 'instructions', 'expiry', 'batch', 'warnings'];
const BADGE = {
  clear: { text: 'Clear', icon: '✔' },
  check: { text: 'Check', icon: '!' },
  unsure: { text: 'Unsure', icon: '?' },
};

/* ------------------------------------------------------------------ */
/* State                                                              */
/* ------------------------------------------------------------------ */

const state = {
  source: null,      // HTMLImageElement or canvas of the chosen picture
  rotation: 0,       // degrees, multiple of 90
  scan: null,        // current result: { id, date, fields, lines, thumb, confirmed }
  busy: false,
};

const settings = { size: '1', theme: document.documentElement.dataset.theme || 'light', rate: 0.9, lang: 'en', ...loadSettings() };
const speaker = new Speaker();

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Announce a message to screen readers via the aria-live region. */
function announce(msg) {
  // Clear first so the same text is announced again if repeated.
  els.live.textContent = '';
  window.setTimeout(() => { els.live.textContent = msg; }, 50);
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

/** A word span, highlighted when OCR was not confident about it. */
function wordSpan(word) {
  const c = word.confidence;
  if (c >= WORD_LOW) return document.createTextNode(word.text);
  const cls = c < WORD_BAD ? 'w-bad' : 'w-low';
  const span = el('span', { class: cls, title: `I am ${c}% sure of this word` }, word.text);
  // Tell screen-reader users too, without being too wordy.
  span.append(el('span', { class: 'sr-only', text: c < WORD_BAD ? ' (very unclear)' : ' (unclear)' }));
  return span;
}

function wordsFragment(words) {
  const frag = document.createDocumentFragment();
  words.forEach((w, i) => {
    if (i) frag.append(' ');
    frag.append(wordSpan(w));
  });
  return frag;
}

const normalise = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function persistSettings() {
  saveSettings({ size: settings.size, theme: settings.theme, rate: settings.rate, lang: settings.lang });
}

/* ------------------------------------------------------------------ */
/* Display settings: text size and theme                              */
/* ------------------------------------------------------------------ */

function applyDisplaySettings() {
  document.documentElement.dataset.size = settings.size;
  document.documentElement.dataset.theme = settings.theme;
  document.querySelectorAll('.size-btn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.size === settings.size));
  });
  els.themeBtn.setAttribute('aria-pressed', String(settings.theme === 'dark'));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'dark' ? '#000000' : '#0b3d6e');
}

document.querySelectorAll('.size-btn').forEach((b) => {
  b.addEventListener('click', () => {
    settings.size = b.dataset.size;
    applyDisplaySettings();
    persistSettings();
    announce(`Text size ${b.textContent.trim()}`);
  });
});

els.themeBtn.addEventListener('click', () => {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  applyDisplaySettings();
  persistSettings();
  announce(settings.theme === 'dark' ? 'Dark mode on' : 'Dark mode off');
});

/* ------------------------------------------------------------------ */
/* Step 1: choosing a picture                                         */
/* ------------------------------------------------------------------ */

els.cameraBtn.addEventListener('click', () => els.cameraInput.click());
els.uploadBtn.addEventListener('click', () => els.uploadInput.click());
els.dropzone.addEventListener('click', () => els.uploadInput.click());
els.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.uploadInput.click();
  }
});

for (const input of [els.cameraInput, els.uploadInput]) {
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.value = ''; // allow choosing the same file again
    if (file) handleFile(file);
  });
}

// Drag and drop (also stop the browser opening files dropped elsewhere)
['dragenter', 'dragover'].forEach((type) =>
  els.dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    els.dropzone.classList.add('is-over');
  }));
['dragleave', 'drop'].forEach((type) =>
  els.dropzone.addEventListener(type, () => els.dropzone.classList.remove('is-over')));
els.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'));
  if (file) handleFile(file);
  else announce('Please drop a picture file.');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// Paste a picture (Ctrl+V) – handy on laptops
window.addEventListener('paste', (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
  if (item) handleFile(item.getAsFile());
});

async function handleFile(file) {
  if (state.busy) return;
  if (file.type && !file.type.startsWith('image/')) {
    showPreviewError('That file is not a picture. Please choose a photo of the label.');
    return;
  }
  try {
    const img = await loadImage(file);
    setSource(img);
    announce('Picture ready. Check it is the right way up, then press Read Label.');
    els.readBtn.focus();
  } catch (err) {
    showPreviewError('I could not open that picture. Please try a different photo (JPG or PNG).');
  }
}

function showPreviewError(msg) {
  announce(msg);
  window.alert(msg);
}

function setSource(source) {
  state.source = source;
  state.rotation = 0;
  drawPreview();
  els.previewArea.hidden = false;
}

/** Draw the (rotated) picture into the preview canvas, scaled down for display. */
function drawPreview() {
  if (!state.source) return;
  const rotated = drawRotated(state.source, state.rotation);
  const maxSide = 1000;
  const scale = Math.min(1, maxSide / Math.max(rotated.width, rotated.height));
  const c = els.previewCanvas;
  c.width = Math.round(rotated.width * scale);
  c.height = Math.round(rotated.height * scale);
  c.getContext('2d').drawImage(rotated, 0, 0, c.width, c.height);
}

function rotate(by) {
  state.rotation = (state.rotation + by + 360) % 360;
  drawPreview();
  announce(`Picture turned ${by > 0 ? 'right' : 'left'}.`);
}
els.rotateLeft.addEventListener('click', () => rotate(-90));
els.rotateRight.addEventListener('click', () => rotate(90));

els.readBtn.addEventListener('click', () => runScan());

els.sampleBtn.addEventListener('click', () => {
  if (state.busy) return;
  setSource(drawSampleLabel());
  announce('Sample label loaded. Reading it now.');
  runScan();
});

/* ------------------------------------------------------------------ */
/* Step 2: preprocessing + OCR                                        */
/* ------------------------------------------------------------------ */

let lastAnnounced = -1;
function setProgress(pct, label) {
  els.progressBar.value = pct;
  els.progressPct.textContent = `${pct}%`;
  els.progressLabel.textContent = `${label}… ${pct}%`;
  // Announce in 20% steps so screen readers are not flooded.
  const step = Math.floor(pct / 20) * 20;
  if (step !== lastAnnounced && pct < 100) {
    lastAnnounced = step;
    announce(`${label}… ${pct}%`);
  }
}

/** Rough quality score for comparing two OCR attempts. */
function ocrScore(result) {
  return result.lines.flatMap((l) => l.words).filter((w) => w.confidence >= 40 && /[A-Za-z0-9]{2,}/.test(w.text))
    .reduce((s, w) => s + w.confidence, 0);
}

async function runScan() {
  if (!state.source || state.busy) return;
  state.busy = true;
  speaker.stop();
  setBusyUi(true);
  lastAnnounced = -1;

  els.stepResults.hidden = true;
  els.speechBar.hidden = true;
  document.body.classList.remove('has-speech-bar');
  els.stepProgress.hidden = false;
  setProgress(0, 'Getting the reader ready');
  els.hProgress.focus();

  try {
    // Let the browser paint the progress section before heavy canvas work.
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
    const enhance = els.enhanceCheck.checked;
    let processed = preprocess(state.source, { rotation: state.rotation, enhance });
    let result = await recognise(processed, setProgress);

    // If the cleaned-up picture read badly, try once more with the original picture.
    if (enhance && (isEmptyResult(result.lines) || result.confidence < 55)) {
      setProgress(0, 'Trying again with the original picture');
      const plain = preprocess(state.source, { rotation: state.rotation, enhance: false });
      const second = await recognise(plain, (p, l) => setProgress(p, l === 'Reading label' ? 'Trying again' : l));
      if (ocrScore(second) > ocrScore(result)) {
        result = second;
        processed = plain;
      }
    }

    const rotated = drawRotated(state.source, state.rotation);
    showResult({
      id: Date.now().toString(36),
      date: new Date().toISOString(),
      lines: result.lines,
      fields: isEmptyResult(result.lines) ? null : extractFields(result.lines),
      thumb: thumbnail(rotated),
      confirmed: false,
    }, processed);
  } catch (err) {
    console.error(err);
    els.stepProgress.hidden = true;
    const msg = err && err.message ? err.message : 'Something went wrong while reading.';
    showNoText(`Sorry, the reader stopped. ${msg}`);
  } finally {
    state.busy = false;
    setBusyUi(false);
  }
}

function setBusyUi(busy) {
  [els.readBtn, els.sampleBtn, els.cameraBtn, els.uploadBtn, els.rotateLeft, els.rotateRight].forEach((b) => {
    b.disabled = busy;
  });
  els.readBtn.setAttribute('aria-busy', String(busy));
}

/* ------------------------------------------------------------------ */
/* Step 3: results                                                    */
/* ------------------------------------------------------------------ */

function showResult(scan, processedCanvas = null) {
  state.scan = scan;
  els.stepProgress.hidden = true;
  els.stepResults.hidden = false;

  renderRawText(scan.lines || []);
  els.processedHolder.replaceChildren();
  els.processedFigure.hidden = !processedCanvas;
  if (processedCanvas) els.processedHolder.append(scaledCopy(processedCanvas, 900));

  if (!scan.fields) {
    showNoText(PHRASES.en.noText, true);
    return;
  }

  els.errorBox.hidden = true;
  els.resultBody.hidden = false;
  els.confirmCheck.checked = !!scan.confirmed;
  renderCards();
  showSpeechBar(true);
  upsertScan(toHistoryEntry(scan));
  renderHistory();

  els.hResults.focus();
  const f = scan.fields;
  const bits = [f.name.value || 'medicine name not found', f.strength.value].filter(Boolean).join(', ');
  announce(`Done. ${bits}. ${els.summary.textContent} Press Read Aloud to hear everything.`);
}

/** "No text found" state, shown and spoken. */
function showNoText(message, speak = true) {
  els.stepResults.hidden = false;
  els.resultBody.hidden = true;
  els.errorBox.hidden = false;
  els.errorText.textContent = message;
  showSpeechBar(false);
  els.hResults.focus();
  announce(message);
  if (speak && speaker.supported) {
    const lang = settings.lang;
    speaker.setLang(lang);
    speaker.speak([message === PHRASES.en.noText ? PHRASES[lang].noText : message]);
  }
}

function scaledCopy(canvas, maxWidth) {
  const scale = Math.min(1, maxWidth / canvas.width);
  const c = document.createElement('canvas');
  c.width = Math.round(canvas.width * scale);
  c.height = Math.round(canvas.height * scale);
  c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', 'Black and white version of the label used for reading');
  return c;
}

function renderRawText(lines) {
  els.rawText.replaceChildren();
  if (!lines.length) {
    els.rawText.append(el('p', { class: 'small-note', text: 'No text was found.' }));
    return;
  }
  for (const line of lines) els.rawText.append(el('p', { class: 'raw-line' }, wordsFragment(line.words)));
}

function renderSummary() {
  const fields = state.scan.fields;
  const shown = FIELD_ORDER.filter((k) => fields[k].value);
  const clear = shown.filter((k) => fields[k].status === 'clear').length;
  const toCheck = shown.length - clear;
  els.summary.textContent = toCheck
    ? `I found ${shown.length} details. ${toCheck} need checking.`
    : `I found ${shown.length} details. They look clear, but please still check with your pharmacist.`;
}

function renderCards() {
  // The "What it is for" card goes right after the strength.
  els.cards.replaceChildren(...FIELD_ORDER.flatMap((key) =>
    (key === 'strength' ? [renderCard(key), renderUsesCard()] : [renderCard(key)])));
  renderSummary();
}

/**
 * "What it is for" card. Worked out from the medicine name (see uses.js),
 * not read from the label, so it has no badge and cannot be edited:
 * correcting the name updates it.
 */
function renderUsesCard() {
  const name = state.scan.fields.name.value;
  const text = name ? usesFor(name, 'en') : '';
  const card = el('article', { class: 'card', 'data-key': 'uses', 'aria-labelledby': 'card-uses-title' });
  card.append(el('div', { class: 'card-head' }, el('h3', { id: 'card-uses-title', text: 'What it is for' })));

  if (!text) {
    card.append(el('div', {
      class: 'card-value is-empty',
      text: name ? 'I do not know what this medicine is for. Please ask your pharmacist.' : 'Medicine name not found',
    }));
    return card;
  }
  card.append(el('div', { class: 'card-value', text: `Usually used for ${text}.` }));
  // Also show it in the reading language, so Hindi and Telugu readers can follow.
  if (settings.lang !== 'en') {
    card.append(el('p', { class: 'card-uses-local', lang: settings.lang, text: PHRASES[settings.lang].uses(usesFor(name, settings.lang)) }));
  }
  card.append(el('p', { class: 'card-note', text: 'General information only. Your doctor may have given it for a different reason.' }));

  const readBtn = el('button', {
    type: 'button', class: 'btn btn-secondary', 'aria-label': 'Read what it is for aloud', hidden: !speaker.supported,
  }, el('span', { 'aria-hidden': 'true', text: '🔈' }), ' Read');
  readBtn.addEventListener('click', () => speakSentences(fieldSentences(state.scan.fields, 'uses', settings.lang)));
  card.append(el('div', { class: 'card-actions' }, readBtn));
  return card;
}

/** One result card with badge, highlighted label text, notes and edit form. */
function renderCard(key) {
  const f = state.scan.fields[key];
  const id = `card-${key}`;
  const badge = BADGE[f.status] || BADGE.unsure;
  const card = el('article', { class: `card status-${f.status}`, 'data-key': key, 'aria-labelledby': `${id}-title` });

  card.append(el('div', { class: 'card-head' },
    el('h3', { id: `${id}-title`, text: f.label || FIELD_LABELS[key] }),
    el('span', { class: `badge badge-${f.status}` },
      el('span', { 'aria-hidden': 'true', text: badge.icon }), ` ${badge.text}`,
      el('span', { class: 'sr-only', text: f.value && !f.edited ? `, ${f.confidence}% sure` : '' }))));

  // Value. If it is exactly the OCR words, show them with highlighting.
  const value = el('div', { class: 'card-value', id: `${id}-value` });
  const sameAsWords = f.words?.length && normalise(f.words.map((w) => w.text).join('')) === normalise(f.value);
  if (!f.value) {
    value.classList.add('is-empty');
    value.textContent = key === 'warnings' ? 'No warnings found. Still read the leaflet.' : 'Not found on the label';
  } else if (key === 'name') {
    value.textContent = f.value; // always show the proper spelling
  } else if (sameAsWords && key !== 'instructions' && key !== 'warnings') {
    value.append(wordsFragment(f.words));
  } else if (sameAsWords) {
    // Multi-line fields: keep the line breaks, highlight words in order.
    const counts = f.lineWordCounts || [f.words.length];
    let i = 0;
    counts.forEach((count, li) => {
      if (li) value.append('\n');
      value.append(wordsFragment(f.words.slice(i, i + count)));
      i += count;
    });
  } else {
    value.textContent = f.value;
  }
  card.append(value);

  // What the label actually said, when it differs (e.g. fuzzy-matched name).
  const hasUnclear = f.words?.some((w) => w.confidence < WORD_LOW);
  if (f.value && f.words?.length && !f.edited && (!sameAsWords || (key === 'name' && hasUnclear))) {
    card.append(el('p', { class: 'card-seen' }, 'Label text: ', wordsFragment(f.words)));
  }
  if (f.note) card.append(el('p', { class: `card-note${f.expired ? ' is-warning' : ''}`, text: f.note }));
  if (key === 'name' && f.alternatives?.length) {
    card.append(el('p', { class: 'card-alt', text: `Also seen on the label: ${f.alternatives.join(', ')}` }));
  }

  // Actions
  const editBtn = el('button', {
    type: 'button', class: 'btn btn-secondary', 'aria-label': `Edit ${f.label.toLowerCase()}`,
    'aria-expanded': 'false', 'aria-controls': `${id}-form`,
  }, el('span', { 'aria-hidden': 'true', text: '✏️' }), ' Edit');
  const readBtn = el('button', {
    type: 'button', class: 'btn btn-secondary', 'aria-label': `Read ${f.label.toLowerCase()} aloud`,
    hidden: !speaker.supported,
  }, el('span', { 'aria-hidden': 'true', text: '🔈' }), ' Read');
  readBtn.addEventListener('click', () => speakSentences(fieldSentences(state.scan.fields, key, settings.lang)));
  card.append(el('div', { class: 'card-actions' }, editBtn, readBtn));

  // Edit form (hidden until "Edit" is pressed)
  const textarea = el('textarea', { id: `${id}-input`, rows: key === 'instructions' || key === 'warnings' ? 4 : 2 });
  textarea.value = f.value;
  const form = el('form', { class: 'card-edit', id: `${id}-form`, hidden: true },
    el('label', { for: `${id}-input`, text: `Correct the ${f.label.toLowerCase()}` }),
    textarea,
    el('div', { class: 'card-actions' },
      el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save' }),
      el('button', { type: 'button', class: 'btn btn-secondary', text: 'Cancel', onclick: () => closeEdit(false) })));

  function closeEdit(focusValue) {
    form.hidden = true;
    editBtn.hidden = false;
    editBtn.setAttribute('aria-expanded', 'false');
    (focusValue ? value : editBtn).focus?.();
  }
  editBtn.addEventListener('click', () => {
    form.hidden = false;
    editBtn.hidden = true;
    editBtn.setAttribute('aria-expanded', 'true');
    textarea.focus();
    textarea.select();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEdit(key, textarea.value);
  });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEdit(false);
  });
  card.append(form);
  return card;
}

/** Save a user correction. Corrected fields are treated as clear. */
function saveEdit(key, newValue) {
  const f = state.scan.fields[key];
  const v = newValue.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  f.value = v;
  f.edited = true;
  f.words = [];
  f.lineWordCounts = undefined;
  f.confidence = v ? 100 : 0;
  f.status = v ? 'clear' : 'unsure';
  f.note = v ? 'You changed this.' : '';
  if (key === 'name') f.matched = true;
  if (key === 'expiry') {
    f.parsed = parseLabelDate(v) || undefined;
    f.expired = false;
    if (f.parsed && new Date(f.parsed.year, f.parsed.month, 1) <= new Date()) {
      f.expired = true;
      f.note = 'This date has passed. Do not use this medicine until a pharmacist checks it.';
    }
  }
  renderCards();
  upsertScan(toHistoryEntry(state.scan));
  renderHistory();
  announce(`${f.label} saved.`);
  // Return focus to the card that was edited.
  els.cards.querySelector(`[data-key="${key}"] .card-actions .btn`)?.focus();
}

els.confirmCheck.addEventListener('change', () => {
  if (!state.scan) return;
  state.scan.confirmed = els.confirmCheck.checked;
  upsertScan(toHistoryEntry(state.scan));
  renderHistory();
  announce(els.confirmCheck.checked ? 'Marked as confirmed by pharmacist.' : 'Not confirmed yet.');
});

function resetToCapture() {
  speaker.stop();
  els.stepResults.hidden = true;
  showSpeechBar(false);
  els.previewArea.hidden = !state.source;
  document.getElementById('step-capture').scrollIntoView({ behavior: 'smooth', block: 'start' });
  els.cameraBtn.focus({ preventScroll: true });
}
els.newScanBtn.addEventListener('click', resetToCapture);
els.retryBtn.addEventListener('click', resetToCapture);

/* ------------------------------------------------------------------ */
/* Speech                                                             */
/* ------------------------------------------------------------------ */

function showSpeechBar(show) {
  els.speechBar.hidden = !show;
  document.body.classList.toggle('has-speech-bar', show);
}

function speakSentences(sentences) {
  if (!speaker.supported) return;
  speaker.setLang(settings.lang);
  speaker.setRate(settings.rate);
  speaker.speak(sentences);
}

function speakAll() {
  if (!state.scan?.fields) return;
  speakSentences(buildNarration(state.scan.fields, settings.lang));
}

function updateSpeechButtons(s) {
  els.pauseBtn.disabled = s !== 'speaking';
  els.stopBtn.disabled = s === 'idle';
  els.playLabel.textContent = s === 'paused' ? 'Continue' : 'Read Aloud';
  els.playBtn.setAttribute('aria-label', s === 'paused' ? 'Continue reading' : 'Read aloud');
}

speaker.onstatechange = updateSpeechButtons;

els.playBtn.addEventListener('click', () => {
  if (!speaker.supported) {
    announce('Your browser cannot read aloud.');
    return;
  }
  if (speaker.state === 'paused') speaker.resume();
  else speakAll();
});
els.pauseBtn.addEventListener('click', () => speaker.pause());
els.stopBtn.addEventListener('click', () => {
  speaker.stop();
  announce('Stopped.');
});
els.repeatBtn.addEventListener('click', () => speakAll());

els.rateSlider.addEventListener('input', () => {
  settings.rate = Number(els.rateSlider.value);
  els.rateOut.textContent = `${settings.rate.toFixed(1)}×`;
  speaker.setRate(settings.rate); // takes effect from the next sentence
  persistSettings();
});

els.langSelect.addEventListener('change', () => {
  settings.lang = els.langSelect.value;
  speaker.setLang(settings.lang);
  persistSettings();
  updateVoiceNote();
  // Show the "What it is for" line in the new language.
  if (state.scan?.fields) els.cards.querySelector('[data-key="uses"]')?.replaceWith(renderUsesCard());
  // Restart in the new language if it was speaking.
  if (speaker.state !== 'idle') speakAll();
});

/** Indian-language options in the language menu, as shown when a voice exists. */
const LANG_OPTIONS = { hi: { label: 'हिन्दी (Hindi)', name: 'Hindi' }, te: { label: 'తెలుగు (Telugu)', name: 'Telugu' } };

/** Tell the user if their device has no voice for the chosen language. */
function updateVoiceNote() {
  if (!speaker.supported) return;
  const hasVoice = speaker.hasVoiceFor(settings.lang);
  const loaded = speaker.voices.length > 0;
  els.voiceNote.hidden = !loaded || hasVoice;
  const option = LANG_OPTIONS[settings.lang];
  els.voiceNote.textContent = option
    ? `No ${option.name} voice was found on this device. It may be read with a different voice. You can add a ${option.name} voice in your phone or computer settings.`
    : 'No English voice was found. The default voice will be used.';
  // Mark the options so users know before choosing them.
  if (!loaded) return;
  for (const [code, { label }] of Object.entries(LANG_OPTIONS)) {
    const node = els.langSelect.querySelector(`option[value="${code}"]`);
    if (node) node.textContent = speaker.hasVoiceFor(code) ? label : `${label} – no voice on this device`;
  }
}
speaker.onvoiceschange = updateVoiceNote;

function initSpeechUi() {
  els.rateSlider.value = String(settings.rate);
  els.rateOut.textContent = `${Number(settings.rate).toFixed(1)}×`;
  if (!PHRASES[settings.lang]) settings.lang = 'en';
  els.langSelect.value = settings.lang;
  speaker.setRate(Number(settings.rate));
  speaker.setLang(settings.lang);
  if (!speaker.supported) {
    els.noSpeech.hidden = false;
    els.speechSettings.hidden = true;
    [els.playBtn, els.pauseBtn, els.stopBtn, els.repeatBtn].forEach((b) => { b.disabled = true; });
    els.playLabel.textContent = 'Reading aloud not available';
  } else {
    updateSpeechButtons('idle');
    updateVoiceNote();
  }
}

// Stop talking when the page is hidden or closed.
window.addEventListener('pagehide', () => speaker.stop());

// Keyboard shortcut: Escape stops speech (when not editing a field).
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && speaker.state !== 'idle' && !e.target.closest('form')) speaker.stop();
});

/* ------------------------------------------------------------------ */
/* History                                                            */
/* ------------------------------------------------------------------ */

/** Strip a scan down to what we store (no OCR word lists, to save space). */
function toHistoryEntry(scan) {
  const fields = {};
  for (const k of FIELD_ORDER) {
    const f = scan.fields[k];
    fields[k] = {
      key: k, label: f.label, value: f.value, confidence: f.confidence, status: f.status,
      note: f.note, matched: f.matched, edited: f.edited, alternatives: f.alternatives,
      parsed: f.parsed, expired: f.expired, words: f.words, lineWordCounts: f.lineWordCounts,
    };
  }
  return {
    id: scan.id, date: scan.date, thumb: scan.thumb, confirmed: !!scan.confirmed,
    fields, lines: (scan.lines || []).slice(0, 60),
  };
}

function renderHistory() {
  const list = loadHistory();
  els.historyList.replaceChildren();
  els.historyEmpty.hidden = list.length > 0;
  els.clearHistoryBtn.hidden = list.length === 0;
  for (const item of list) {
    const name = item.fields?.name?.value || 'Unknown medicine';
    const strength = item.fields?.strength?.value || '';
    const when = new Date(item.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const btn = el('button', {
      type: 'button', class: 'history-item',
      'aria-label': `Open ${name} ${strength}, read on ${when}${item.confirmed ? ', confirmed by pharmacist' : ''}`,
      onclick: () => openHistory(item.id),
    },
    item.thumb ? el('img', { src: item.thumb, alt: '' }) : null,
    el('span', { class: 'history-main' },
      el('span', { class: 'history-name', text: [name, strength].filter(Boolean).join(' – ') }),
      el('span', { class: 'history-meta', text: when }),
      item.confirmed ? el('span', { class: 'history-confirmed', text: '✔ Confirmed by pharmacist' }) : null));
    els.historyList.append(el('li', {}, btn));
  }
}

function openHistory(id) {
  const scan = getScan(id);
  if (!scan) return;
  speaker.stop();
  showResult(scan, null);
  els.stepResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

els.clearHistoryBtn.addEventListener('click', () => {
  if (!window.confirm('Delete all recent labels from this device?')) return;
  clearHistory();
  renderHistory();
  announce('Recent labels cleared.');
});

/* ------------------------------------------------------------------ */
/* Start                                                              */
/* ------------------------------------------------------------------ */

applyDisplaySettings();
initSpeechUi();
renderHistory();
