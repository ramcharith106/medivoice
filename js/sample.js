/**
 * sample.js
 * ------------------------------------------------------------------
 * Draws a made-up medicine label on a canvas so the whole flow
 * (preprocess -> OCR -> extraction -> speech) can be tried
 * without a camera. The label is fictional and for demo only.
 */

export function drawSampleLabel() {
  const W = 1200;
  const H = 860;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const font = (size, weight = 'normal') => `${weight} ${size}px Arial, Helvetica, sans-serif`;

  // Card background and border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1b4f8a';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  // Small "Rx" mark in the corner
  ctx.fillStyle = '#b3261e';
  ctx.font = font(44, 'bold');
  ctx.textBaseline = 'top';
  ctx.fillText('Rx', W - 120, 50);

  let y = 56;
  const line = (text, size, { weight = 'normal', color = '#111111', gap = 22 } = {}) => {
    ctx.font = font(size, weight);
    ctx.fillStyle = color;
    ctx.fillText(text, 60, y);
    y += size + gap;
  };

  line('PARACETAMOL', 86, { weight: 'bold', color: '#12406e', gap: 14 });
  line('Tablets IP 500 mg', 48, { weight: 'bold', gap: 30 });
  line('Each uncoated tablet contains:', 30, { gap: 8 });
  line('Paracetamol IP 500 mg', 30, { gap: 34 });
  line('Dosage: Take 1 tablet twice daily after food', 34, { weight: 'bold', gap: 12 });
  line('with a glass of water.', 34, { weight: 'bold', gap: 34 });
  line('WARNING: Do not exceed 8 tablets in 24 hours.', 32, { color: '#8a1c13', gap: 12 });
  line('Keep out of reach of children.', 32, { color: '#8a1c13', gap: 34 });
  line('Store below 25 C. Protect from light.', 28, { gap: 30 });

  // Divider and the batch / dates row
  ctx.fillStyle = '#1b4f8a';
  ctx.fillRect(60, y - 10, W - 120, 4);
  y += 16;
  line('B.No: PCM2417    Mfg: 01/2025    Exp: 12/2027', 32, { weight: 'bold', gap: 20 });
  line('10 x 10 Tablets', 26, { color: '#333333' });

  return c;
}
