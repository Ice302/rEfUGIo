// Shared drawing helpers: racing stripes, Code 39 barcodes, and small math.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
export const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Vehicle moves. A launch picks up speed but never more than about 1.6 times its average, so
// a vehicle leaving the frame does not cover a third of the screen in one frame. A landing is
// the same move played backwards. A cruise starts and ends gently.
export const launch = (t) => 1 - Math.cos((clamp(t) * Math.PI) / 2);
export const landing = (t) => Math.sin((clamp(t) * Math.PI) / 2);
export const cruise = (t) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

// A chain is [p0, c1, c2, p1, c3, c4, p2, ...] of cubic Bezier points as [x, y].
export function sampleChain(chain, perSeg = 24) {
  const pts = [];
  for (let i = 0; i + 3 < chain.length; i += 3) {
    const [a, b, c, d] = [chain[i], chain[i + 1], chain[i + 2], chain[i + 3]];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      const u = 1 - t;
      pts.push([
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ]);
    }
  }
  pts.push(chain[chain.length - 1]);
  return pts;
}

export function offsetLine(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(i + 1, pts.length - 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / len) * d, p[1] + (dx / len) * d];
  });
}

export const toD = (pts) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

export function blendChains(a, b, t) {
  return a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]);
}

// Three parallel stripes along a chain. Returns SVG path data, one per colour.
export function stripePaths(chain, gap) {
  const pts = sampleChain(chain);
  return [-1, 0, 1].map((k) => toD(offsetLine(pts, k * gap)));
}

const CODE39 = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw', 5: 'wnnwwnnnn',
  6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn', A: 'wnnnnwnnw', B: 'nnwnnwnnw',
  C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn',
  I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww',
  O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn',
};

// Real Code 39 bars for the text, so the barcodes on the site actually scan.
export function code39Bars(text) {
  const clean = String(text).toUpperCase().replace(/[^0-9A-Z\-. /+]/g, '').slice(0, 24);
  const bars = [];
  let x = 0;
  [...`*${clean}*`].forEach((ch) => {
    [...CODE39[ch]].forEach((e, i) => {
      const w = e === 'w' ? 2.6 : 1;
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    });
    x += 1;
  });
  return { bars, width: x - 1 };
}

export function barcodeSVG(text, cls = '') {
  const { bars, width } = code39Bars(text);
  const rects = bars.map((b) => `<rect x="${b.x}" y="0" width="${b.w}" height="30"/>`).join('');
  return `<svg class="barcode ${cls}" viewBox="0 0 ${width} 30" preserveAspectRatio="none" role="img" aria-label="Barcode reading ${text}" fill="currentColor">${rects}</svg>`;
}
