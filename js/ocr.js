/**
 * ocr.js
 * ------------------------------------------------------------------
 * Thin wrapper around Tesseract.js v5 (loaded from a CDN in index.html,
 * available as the global `Tesseract`). Everything runs in the browser;
 * no image ever leaves the device. The first run downloads the English
 * language data (~10 MB), later runs use the browser cache.
 */

let workerPromise = null;
let progressHandler = () => {};

/** Friendly words for Tesseract's internal status names. */
const STATUS_TEXT = {
  'loading tesseract core': 'Getting the reader ready',
  'initializing tesseract': 'Getting the reader ready',
  'initialized tesseract': 'Getting the reader ready',
  'loading language traineddata': 'Loading English words',
  'loaded language traineddata': 'Loading English words',
  'initializing api': 'Getting the reader ready',
  'initialized api': 'Getting the reader ready',
  'recognizing text': 'Reading label',
};

/** Create the OCR worker once and reuse it for every scan. */
function getWorker() {
  if (!workerPromise) {
    if (typeof Tesseract === 'undefined') {
      return Promise.reject(new Error('The text reader could not load. Please check your internet connection and reload the page.'));
    }
    workerPromise = Tesseract.createWorker('eng', 1, {
      logger: (m) => progressHandler(m),
    })
      .then(async (worker) => {
        await worker.setParameters({
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
        });
        return worker;
      })
      .catch((err) => {
        workerPromise = null; // allow a retry later
        throw err;
      });
  }
  return workerPromise;
}

/**
 * Overall progress 0-100:
 *   0-15  loading the reader and language data
 *   15-100 recognising text
 */
function overallPercent(m) {
  const p = Math.max(0, Math.min(1, m.progress || 0));
  if (m.status === 'recognizing text') return Math.round(15 + p * 85);
  return Math.round(p * 15);
}

/**
 * Convert Tesseract's result into simple line/word objects with confidence.
 * Tesseract v5 returns data.lines with words; we also fall back to
 * walking blocks -> paragraphs -> lines if needed.
 */
export function normaliseOcrData(data) {
  let rawLines = data.lines;
  if (!rawLines || !rawLines.length) {
    rawLines = (data.blocks || []).flatMap((b) => (b.paragraphs || []).flatMap((p) => p.lines || []));
  }
  const lines = (rawLines || [])
    .map((l) => ({
      text: (l.text || '').replace(/\s+/g, ' ').trim(),
      confidence: Math.round(l.confidence || 0),
      height: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0,
      words: (l.words || [])
        .filter((w) => w.text && w.text.trim())
        .map((w) => ({ text: w.text.trim(), confidence: Math.round(w.confidence || 0) })),
    }))
    .filter((l) => l.text && l.words.length);
  return {
    text: data.text || '',
    confidence: Math.round(data.confidence || 0),
    lines,
  };
}

/**
 * Run OCR on a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {(percent:number, label:string) => void} onProgress
 */
export async function recognise(canvas, onProgress = () => {}) {
  progressHandler = (m) => {
    if (!m || !m.status) return;
    onProgress(overallPercent(m), STATUS_TEXT[m.status] || 'Getting the reader ready');
  };
  onProgress(0, 'Getting the reader ready');
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas);
  onProgress(100, 'Done');
  return normaliseOcrData(data);
}
