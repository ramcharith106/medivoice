/**
 * preprocess.js
 * ------------------------------------------------------------------
 * Canvas image clean-up before OCR. Tesseract reads best with large,
 * sharp, black-on-white text, so we:
 *   1. Rotate (labels are often photographed sideways)
 *   2. Upscale small images to about 2000 px wide (and shrink huge ones)
 *   3. Convert to grayscale
 *   4. Stretch contrast
 *   5. Invert if the label is light text on a dark background
 *   6. Threshold to pure black and white (adaptive, so shadows and
 *      glare from phone photos do not wipe out text)
 */

export const TARGET_WIDTH = 2000;
const MAX_WIDTH = 2600;

/** Load a File/Blob into an HTMLImageElement. */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file could not be opened as a picture.'));
    };
    img.src = url;
  });
}

/** Draw any image source onto a new canvas, rotated by 0/90/180/270 degrees. */
export function drawRotated(source, degrees = 0) {
  const w = source.naturalWidth || source.width;
  const h = source.naturalHeight || source.height;
  const turn = ((degrees % 360) + 360) % 360;
  const sideways = turn === 90 || turn === 270;
  const canvas = document.createElement('canvas');
  canvas.width = sideways ? h : w;
  canvas.height = sideways ? w : h;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turn * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2);
  return canvas;
}

/** Scale a canvas so it is about TARGET_WIDTH wide (never above MAX_WIDTH). */
function resize(canvas) {
  let scale = 1;
  if (canvas.width < TARGET_WIDTH) scale = TARGET_WIDTH / canvas.width;
  else if (canvas.width > MAX_WIDTH) scale = MAX_WIDTH / canvas.width;
  // Do not let very tall images become enormous.
  const maxPixels = 9_000_000;
  if (canvas.width * scale * canvas.height * scale > maxPixels) {
    scale = Math.sqrt(maxPixels / (canvas.width * canvas.height));
  }
  if (Math.abs(scale - 1) < 0.01) return canvas;
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

/** Otsu's method: the gray level that best separates dark and light pixels. */
export function otsuThreshold(histogram, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Full clean-up pipeline.
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {object} options { rotation: degrees, enhance: boolean }
 * @returns {HTMLCanvasElement} canvas ready for OCR
 */
export function preprocess(source, { rotation = 0, enhance = true } = {}) {
  const canvas = resize(drawRotated(source, rotation));
  if (!enhance) return canvas;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  const total = canvas.width * canvas.height;

  // 1. Grayscale (luma) + find the 2nd and 98th percentile for contrast stretch
  const gray = new Uint8ClampedArray(total);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; p < total; i += 4, p++) {
    const g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
    gray[p] = g;
    hist[g]++;
  }
  let lo = 0;
  let hi = 255;
  for (let acc = 0, i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= total * 0.02) { lo = i; break; }
  }
  for (let acc = 0, i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc >= total * 0.02) { hi = i; break; }
  }
  const range = Math.max(1, hi - lo);

  // 2. Contrast stretch, building a new histogram for the threshold
  const stretched = new Uint32Array(256);
  for (let p = 0; p < total; p++) {
    const v = Math.max(0, Math.min(255, ((gray[p] - lo) * 255) / range)) | 0;
    gray[p] = v;
    stretched[v]++;
  }

  // 3. Threshold. Phone photos often have uneven light (shadows, glare),
  //    so compare each pixel with the average of its neighbourhood
  //    (Bradley adaptive threshold). Flat areas fall back to Otsu's global level.
  let globalT = otsuThreshold(stretched, total);

  // Light text on a dark background? Flip it first so text is always dark.
  let below = 0;
  for (let v = 0; v < globalT; v++) below += stretched[v];
  if (below > total * 0.6) {
    for (let p = 0; p < total; p++) gray[p] = 255 - gray[p];
    globalT = 255 - globalT;
  }
  const w = canvas.width;
  const h = canvas.height;
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  const half = Math.max(8, Math.round(w / 32));
  const sensitivity = 0.15; // pixel must be 15% darker than its surroundings
  const out = new Uint8ClampedArray(total);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(w - 1, x + half);
      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (w + 1) + (x1 + 1)] - integral[y0 * (w + 1) + (x1 + 1)] -
        integral[(y1 + 1) * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      const mean = sum / count;
      const g = gray[y * w + x];
      // Low local variation (plain background or solid block): use the global level.
      const isDark = mean > 40 && mean < 230 ? g < mean * (1 - sensitivity) : g < globalT;
      out[y * w + x] = isDark ? 0 : 255;
    }
  }
  for (let i = 0, p = 0; p < total; i += 4, p++) {
    d[i] = d[i + 1] = d[i + 2] = out[p];
    d[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Small JPEG thumbnail (for the history list). */
export function thumbnail(source, maxSide = 160) {
  const w = source.width;
  const h = source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  try {
    return c.toDataURL('image/jpeg', 0.6);
  } catch {
    return '';
  }
}
