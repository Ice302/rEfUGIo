// A small chamfered stroke alphabet on a 4 x 6 grid. Because letters are single
// strokes rather than outlines, they can be plotted on, and their weight can animate
// from hairline to ultra bold. `H` stretches the height while keeping 45-degree corners.
const G = {
  A: 'M0 6V1L1 0H3L4 1V6M0 3.4H4',
  B: 'M0 0H3L4 1V2L3 3L4 4V5L3 6H0ZM0 3H3',
  C: 'M4 0H1L0 1V5L1 6H4',
  D: 'M0 0H3L4 1V5L3 6H0Z',
  E: 'M4 0H0V6H4M0 3H3',
  F: 'M4 0H0V6M0 3H3',
  G: 'M4 0H1L0 1V5L1 6H3L4 5V3H2',
  H: 'M0 0V6M4 0V6M0 3H4',
  I: 'M1 0H3M2 0V6M1 6H3',
  J: 'M4 0V5L3 6H1L0 5',
  K: 'M0 0V6M4 0L1 3H0M1 3L4 6',
  L: 'M0 0V6H4',
  M: 'M0 6V0L2 3L4 0V6',
  N: 'M0 6V0L4 6V0',
  O: 'M1 0H3L4 1V5L3 6H1L0 5V1Z',
  P: 'M0 6V0H3L4 1V2L3 3H0',
  Q: 'M1 0H3L4 1V5L3 6H1L0 5V1ZM2.4 4.4L4 6',
  R: 'M0 6V0H3L4 1V2L3 3H0M2.4 3L4 4.6V6',
  S: 'M4 0H1L0 1V2L1 3H3L4 4V5L3 6H0',
  T: 'M0 0H4M2 0V6',
  U: 'M0 0V5L1 6H3L4 5V0',
  V: 'M0 0V4L2 6L4 4V0',
  W: 'M0 0V6L2 3.6L4 6V0',
  X: 'M0 0L4 6M4 0L0 6',
  Y: 'M0 0V2L1 3H3L4 2V0M2 3V6',
  Z: 'M0 0H4L0 6H4',
  0: 'M1 0H3L4 1V5L3 6H1L0 5V1ZM2 2.2V3.8',
  1: 'M0.5 1.2L2 0V6M0.5 6H3.5',
  2: 'M0 1L1 0H3L4 1V2L3 3H1L0 4V6H4',
  3: 'M0 0H3L4 1V2L3 3L4 4V5L3 6H0M1.5 3H3',
  4: 'M3 6V0L0 4V4.6H4',
  5: 'M4 0H0V3H3L4 4V5L3 6H0',
  6: 'M4 0H1L0 1V5L1 6H3L4 5V4L3 3H0',
  7: 'M0 0H4V1.5L1.5 6',
  8: 'M1 0H3L4 1V2L3 3H1L0 2V1ZM1 3L0 4V5L1 6H3L4 5V4L3 3',
  9: 'M0 6H3L4 5V1L3 0H1L0 1V2L1 3H4',
  '.': 'M2 5.5V6',
  '-': 'M0.5 3H3.5',
  '+': 'M0.5 3H3.5M2 1.5V4.5',
  '/': 'M4 0L0 6',
  ':': 'M2 1.5V2M2 4V4.5',
  ' ': '',
};

const tall = (y, H) => {
  if (H === 6) return y;
  if (y <= 1) return y;
  if (y >= 5) return y + H - 6;
  return 1 + ((y - 1) * (H - 2)) / 4;
};

export function glyphD(ch, H = 6, dx = 0) {
  const src = G[ch] ?? G[ch.toUpperCase()] ?? '';
  const tokens = src.match(/[MLHVZ]|-?[\d.]+/g) || [];
  let out = '';
  let x = 0;
  let y = 0;
  let cmd = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/[MLHVZ]/.test(t)) {
      cmd = t;
      if (t === 'Z') out += 'Z';
      continue;
    }
    if (cmd === 'H') {
      x = +t;
      out += `L${x + dx} ${tall(y, H)}`;
    } else if (cmd === 'V') {
      y = +t;
      out += `L${x + dx} ${tall(y, H)}`;
    } else {
      x = +t;
      y = +tokens[++i];
      out += `${cmd}${x + dx} ${tall(y, H)}`;
      if (cmd === 'M') cmd = 'L';
    }
  }
  return out;
}

const PAD = 0.8;

export function glyph(ch, { H = 6, w = 1.3, cls = '' } = {}) {
  return `<svg class="glyph ${cls}" viewBox="${-PAD} ${-PAD} ${4 + PAD * 2} ${H + PAD * 2}" aria-hidden="true"><path d="${glyphD(ch, H)}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linejoin="miter" stroke-miterlimit="2"/></svg>`;
}

export function word(text, { H = 6, w = 1.3, track = 1.75, cls = '', title } = {}) {
  const chars = [...String(text).toUpperCase()];
  const adv = 4 + track;
  const d = chars.map((c, i) => glyphD(c, H, i * adv)).join('');
  const width = chars.length * adv - track;
  const label = title ?? text;
  return `<svg class="glyph ${cls}" viewBox="${-PAD} ${-PAD} ${width + PAD * 2} ${H + PAD * 2}" role="img" aria-label="${label}"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linejoin="miter" stroke-miterlimit="2"/></svg>`;
}
