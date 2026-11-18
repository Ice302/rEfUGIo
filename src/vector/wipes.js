// Section transitions, drawn as vector paths on one full-screen canvas underneath the
// vehicles, so a car or plane can tear through the middle of a wipe. Each is built from
// the visual vocabulary of the section it opens. Each fully covers the screen at q = 0.5,
// when the scene behind it changes and the next section's title card plots on.
import { seg, lerp, easeOut, easeIn, easeIO, sampleChain, offsetLine, code39Bars } from './lines.js';
import { glyphD } from './glyphs.js';

const C = {
  ink: '#111110',
  paper: '#e7e3d7',
  cool: '#d9d9d4',
  white: '#f4f3ee',
  red: '#e5121e',
  yellow: '#ffc60a',
  blue: '#0a3fdb',
  racing: '#0a4a3f',
  deep: '#18242a',
};

const rand = (i) => {
  const x = Math.sin(i * 127.1 + 11.7) * 43758.5453;
  return x - Math.floor(x);
};
const backOut = (t) => {
  const c = 1.55;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

/* ---------- Title card: the next section's name, plotted stroke by stroke ---------- */
const pathCache = new Map();
const glyphPath = (c, dx) => {
  const k = `${c}${dx}`;
  if (!pathCache.has(k)) pathCache.set(k, new Path2D(glyphD(c, 6, dx)));
  return pathCache.get(k);
};

function titleCard(ctx, W, H, q, card, color) {
  if (!card) return;
  const a = seg(q, 0.3, 0.45);
  const z = seg(q, 0.55, 0.7);
  if (a <= 0 || z >= 1) return;
  const chars = [...card.title];
  const adv = 5.75;
  const unitW = chars.length * adv - 1.75;
  const s = Math.min(W * 0.78, H * 1.5) / unitW;
  const s2 = Math.min(s, (H * 0.34) / 6);
  ctx.save();
  ctx.translate((W - unitW * s2) / 2, H / 2 - 3 * s2);
  ctx.scale(s2, s2);
  ctx.strokeStyle = color;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;
  ctx.lineWidth = lerp(0.14, 1.3, easeOut(a)) * (1 - z * 0.86);
  chars.forEach((c, i) => {
    if (c === ' ') return;
    const st = (i / chars.length) * 0.55;
    const t = easeIO(seg(a, st, st + 0.45));
    const e = easeIO(seg(z, st, st + 0.45));
    if (t <= 0 || e >= 1) return;
    ctx.setLineDash([36 * t, 400]);
    ctx.lineDashOffset = -36 * e;
    ctx.stroke(glyphPath(c, i * adv));
  });
  ctx.restore();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  // Registration rule and code line, drawn outward from the centre
  const reveal = easeOut(a) * (1 - easeIn(z));
  const y = H / 2 + 3 * s2 + s2 * 2.2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - (W / 2) * 0.82 * reveal, y);
  ctx.lineTo(W / 2 + (W / 2) * 0.82 * reveal, y);
  ctx.stroke();
  ctx.globalAlpha = reveal;
  ctx.fillStyle = color;
  ctx.font = `500 ${Math.max(10, W * 0.0085)}px "IBM Plex Mono", monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(card.code.toUpperCase(), W * 0.09 + 2, y + 8);
  ctx.textAlign = 'right';
  ctx.fillText('NEXT STOP', W * 0.91 - 2, y + 8);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/* ---------- Hero to Manifest: score lines cut the paper before the panels split ---------- */
function score(ctx, W, H, q, o) {
  const n = o.seams || 7;
  const grow = easeOut(seg(q, 0, 0.22));
  const fade = 1 - seg(q, 0.42, 0.66);
  if (fade <= 0) return;
  ctx.globalAlpha = fade;
  for (let i = 1; i < n; i++) {
    const x = (W * i) / n;
    const d = Math.abs(i - n / 2) / n;
    const g = easeOut(seg(grow, d * 0.7, d * 0.7 + 0.5));
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([9, 6]);
    ctx.lineDashOffset = -q * 90;
    ctx.beginPath();
    ctx.moveTo(x, H / 2 - (H / 2) * g);
    ctx.lineTo(x, H / 2 + (H / 2) * g);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.ink;
    [H / 2 - (H / 2) * g, H / 2 + (H / 2) * g].forEach((y) => {
      ctx.beginPath();
      ctx.arc(x, y, 3.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
}

/* ---------- Stepped skyline: two tones rise, then retract row by row onto the Fleet sidebar ---------- */
function skyline(ctx, W, H, q, o) {
  const N = W < 820 ? 10 : 18;
  const bw = W / N;
  if (q < 0.5) {
    const t = q / 0.5;
    const heights = [];
    [
      { c: C.yellow, lag: 0 },
      { c: C.blue, lag: 0.07 },
      { c: C.red, lag: 0.14 },
    ].forEach(({ c, lag }) => {
      ctx.fillStyle = c;
      for (let i = 0; i < N; i++) {
        const d = rand(i) * 0.4 + lag;
        const h = backOut(seg(t, d, d + 0.46)) * H * 1.02;
        if (c === C.red) heights[i] = h;
        ctx.fillRect(Math.floor(i * bw), H - h, Math.ceil(bw) + 1, h);
      }
    });
    // Tick and readout on the head of every bar
    ctx.fillStyle = C.ink;
    ctx.font = `500 ${Math.max(9, W * 0.0072)}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = 'bottom';
    heights.forEach((h, i) => {
      if (h <= 2 || h >= H) return;
      ctx.fillRect(Math.floor(i * bw), H - h, Math.ceil(bw) + 1, 1.4);
      if (i % 2 === 0) ctx.fillText(String(Math.round((h / H) * 100)).padStart(3, '0'), i * bw + 5, H - h - 3);
    });
  } else {
    const t = (q - 0.5) / 0.5;
    const rows = 14;
    const rh = H / rows;
    const target = o.sidebar?.() ?? 0;
    for (let r = 0; r < rows; r++) {
      const d = rand(r + 40) * 0.4;
      const w = lerp(W, target, easeIO(seg(t, d, d + 0.6)));
      ctx.fillStyle = r % 3 ? C.yellow : C.blue;
      ctx.fillRect(0, Math.floor(r * rh), w + Math.min(26, (W - w) * 0.1) * (1 - seg(t, 0.85, 1)), Math.ceil(rh) + 1);
      ctx.fillStyle = C.red;
      ctx.fillRect(0, Math.floor(r * rh), w, Math.ceil(rh) + 1);
      // Rule that shoots off the end of each row as it pulls back
      if (r % 2 === 0 && w > target + 2) {
        ctx.fillStyle = C.ink;
        ctx.fillRect(w, Math.floor(r * rh), Math.min((W - w) * 0.6, W), 1);
      }
    }
  }
  titleCard(ctx, W, H, q, o.card, C.ink);
}

/* ---------- Racing stripes: three bands dragged across the screen behind the car ---------- */
let stripeCache = null;
function stripeBase(W, H) {
  if (stripeCache && stripeCache.W === W && stripeCache.H === H) return stripeCache;
  const chain = [
    [-0.22 * W, 1.22 * H],
    [0.04 * W, 1.22 * H],
    [0.2 * W, 1.02 * H],
    [0.42 * W, 0.62 * H],
    [0.6 * W, 0.2 * H],
    [0.76 * W, -0.05 * H],
    [1.5 * W, -0.45 * H],
  ];
  const base = sampleChain(chain, 48);
  const S = 0.72 * Math.max(W, H);
  const lines = [-1, 0, 1].map((k) => {
    const pts = offsetLine(base, k * S);
    const len = [0];
    for (let j = 1; j < pts.length; j++) len[j] = len[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
    return { pts, len, total: len[len.length - 1] };
  });
  stripeCache = { W, H, base, S, lines };
  return stripeCache;
}
const stripeS = (q) => {
  const k = seg(q, 0, 0.46);
  return k * k * (2.2 - 1.2 * k);
};

// Where the head of the stripes is, so the car can lead them.
export function stripeHead(W, H, q) {
  const { base } = stripeBase(W, H);
  const f = stripeS(q) * (base.length - 1);
  const i = Math.min(Math.floor(f), base.length - 2);
  const t = f - i;
  const a = base[i];
  const b = base[i + 1];
  return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), tx: b[0] - a[0], ty: b[1] - a[1] };
}

function stripes(ctx, W, H, q, o) {
  const { base, S, lines } = stripeBase(W, H);
  const colors = [C.red, C.yellow, C.blue];
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  lines.forEach(({ pts, len, total }, i) => {
    const lead = [0.03, 0, 0.03][i];
    const s1 = q >= 0.48 ? 1 : stripeS(q - lead);
    const s0 = easeIO(seg(q, 0.5 + (2 - i) * 0.05, 1));
    const a = s0 * total;
    const b = s1 * total;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = S * 1.02;
    ctx.beginPath();
    let open = false;
    for (let j = 0; j < pts.length; j++) {
      if (len[j] < a || len[j] > b) continue;
      open ? ctx.lineTo(pts[j][0], pts[j][1]) : ctx.moveTo(pts[j][0], pts[j][1]);
      open = true;
    }
    ctx.stroke();
  });
  // Pin-stripes and speed rules running with the bands
  const head = Math.floor(stripeS(q) * (base.length - 1));
  const tail = Math.floor(easeIO(seg(q, 0.04, 0.5)) * (base.length - 1));
  ctx.strokeStyle = C.ink;
  [-0.34, -0.17, 0.17, 0.34].forEach((k, n) => {
    const line = offsetLine(base, k * S);
    ctx.lineWidth = n % 2 ? 1 : 2;
    ctx.beginPath();
    for (let j = tail; j < head; j++) {
      j === tail ? ctx.moveTo(line[j][0], line[j][1]) : ctx.lineTo(line[j][0], line[j][1]);
    }
    ctx.stroke();
  });
  // Chevrons pulse along the middle band
  if (q < 0.5) {
    ctx.fillStyle = C.ink;
    for (let n = 0; n < 7; n++) {
      const idx = Math.floor(tail + (head - tail) * ((n + (q * 20) % 1) / 7));
      const p = base[Math.min(idx, base.length - 2)];
      const r = base[Math.min(idx + 1, base.length - 1)];
      if (!p || !r || idx <= 0) continue;
      const ang = Math.atan2(r[1] - p[1], r[0] - p[0]);
      const sz = Math.min(W, H) * 0.026;
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-sz, -sz);
      ctx.lineTo(0, 0);
      ctx.lineTo(-sz, sz);
      ctx.lineTo(-sz * 0.5, sz);
      ctx.lineTo(sz * 0.5, 0);
      ctx.lineTo(-sz * 0.5, -sz);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  titleCard(ctx, W, H, q, o.card, C.ink);
}

/* ---------- Perforation: a wave of holes bursts out from the car's exit, then punches through ---------- */
function perforate(ctx, W, H, q, o) {
  const g = Math.max(W, H) / 17;
  const cols = Math.ceil(W / g) + 1;
  const rows = Math.ceil(H / g) + 1;
  const maxR = g * 0.78;
  const far = Math.hypot(W, H);
  const dots = (t, ox, oy) => {
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const d = (Math.hypot(c * g - ox, r * g - oy) / far) * 0.55;
        const rad = backOut(seg(t, d, d + 0.45)) * maxR;
        if (rad <= 0) continue;
        ctx.moveTo(c * g + rad, r * g);
        ctx.arc(c * g, r * g, rad, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  };
  ctx.fillStyle = C.ink;
  if (q < 0.5) {
    dots(q / 0.5, W * 0.95, H * 0.85);
    // Cancellation waves crossing ahead of the holes
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 2;
    const t = q / 0.5;
    for (let i = 0; i < 5; i++) {
      const x = lerp(W * 1.1, -W * 0.1, easeIO(seg(t, i * 0.03, 0.8 + i * 0.03)));
      ctx.beginPath();
      for (let y = -10; y <= H + 10; y += 14) {
        const px = x + Math.sin(y * 0.02 + i) * 16 + i * 18;
        y === -10 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();
    }
  } else {
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    dots((q - 0.5) / 0.5, W * 0.05, H * 0.15);
    ctx.globalCompositeOperation = 'source-over';
  }
  titleCard(ctx, W, H, q, o.card, C.white);
}

/* ---------- Crop grid: cells unfold in the plane's wake, with crop marks popping at each corner ---------- */
function crop(ctx, W, H, q, o) {
  const cols = Math.max(6, Math.round(W / 120));
  const rows = Math.max(5, Math.round(H / 120));
  const cw = W / cols;
  const ch = H / rows;
  // Delay runs along the plane's diagonal, plus a little for distance from its track
  const delay = (c, r, flip) => {
    let u = (c + 0.5) / cols;
    let v = 1 - (r + 0.5) / rows;
    if (flip) {
      u = 1 - u;
      v = 1 - v;
    }
    return ((u + v) / 2) * 0.6 + Math.abs(u - v) * 0.16;
  };
  const inPhase = q < 0.5;
  const t = inPhase ? q / 0.5 : (q - 0.5) / 0.5;
  ctx.fillStyle = C.cool;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const d = delay(c, r, !inPhase);
      const k = easeIO(seg(t, d, d + 0.24));
      if (inPhase) {
        if (k > 0) ctx.fillRect(c * cw, r * ch, cw * k + 1, ch * k + 1);
      } else if (k < 1) {
        ctx.fillRect(c * cw + cw * k, r * ch + ch * k, cw * (1 - k) + 1, ch * (1 - k) + 1);
      }
    }
  }
  const a = Math.min(seg(q, 0, 0.1), 1 - seg(q, 0.88, 1));
  ctx.globalAlpha = a;
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 1;
  ctx.setLineDash([7, 6]);
  ctx.lineDashOffset = q * -120;
  const grow = easeOut(seg(q, 0, 0.42));
  ctx.beginPath();
  for (let c = 1; c < cols; c++) {
    const f = Math.abs(c / cols - 0.5);
    ctx.moveTo(c * cw, H - H * grow * (1 + f));
    ctx.lineTo(c * cw, H);
  }
  for (let r = 1; r < rows; r++) {
    ctx.moveTo(0, r * ch);
    ctx.lineTo(W * grow * 1.3, r * ch);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.fillStyle = q < 0.28 ? C.white : C.ink;
  for (let c = 1; c < cols; c++) {
    for (let r = 1; r < rows; r++) {
      const d = delay(c, r, !inPhase);
      const pop = backOut(seg(t, d, d + 0.16));
      const rad = Math.max(0, 3 * (inPhase ? pop : 1 - easeIn(seg(t, d + 0.1, d + 0.3))));
      if (rad <= 0) continue;
      ctx.beginPath();
      ctx.arc(c * cw, r * ch, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  titleCard(ctx, W, H, q, o.card, C.ink);
}

/* ---------- Aperture: seven real blades close like a lens, then open on the next section ---------- */
function iris(ctx, W, H, q, o) {
  const N = 7;
  const cx = W / 2;
  const cy = H / 2;
  const Rmax = Math.hypot(W, H) * 0.57;
  const closing = q < 0.5;
  const t = closing ? q / 0.5 : (q - 0.5) / 0.5;
  const R = closing ? lerp(Rmax, 0, easeIO(t)) : lerp(0, Rmax, easeIO(t));
  const rot = 0.5 + q * 3.1;
  const verts = [];
  for (let i = 0; i < N; i++) {
    const a = rot + (i / N) * Math.PI * 2;
    verts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  const big = Rmax * 3;
  for (let i = 0; i < N; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % N];
    const prev = verts[(i - 1 + N) % N];
    const da = [a[0] - prev[0], a[1] - prev[1]];
    const db = [b[0] - a[0], b[1] - a[1]];
    const la = Math.hypot(da[0], da[1]) || 1;
    const lb = Math.hypot(db[0], db[1]) || 1;
    const ax = a[0] + (da[0] / la) * big;
    const ay = a[1] + (da[1] / la) * big;
    const bx = b[0] + (db[0] / lb) * big;
    const by = b[1] + (db[1] / lb) * big;
    ctx.fillStyle = i % 2 ? C.white : '#e6e6e1';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(bx, by);
    ctx.lineTo(ax, ay);
    ctx.closePath();
    ctx.fill();
  }
  if (R < 2) {
    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < N; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % N];
      const db = [b[0] - a[0], b[1] - a[1]];
      const lb = Math.hypot(db[0], db[1]) || 1;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0] + (db[0] / lb) * big, b[1] + (db[1] / lb) * big);
      ctx.stroke();
    }
  }
  // Dashed focus rings counter-rotate over the blades
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 6; i++) {
    const r = (R + 34 + i * 34) * (1 + i * 0.03);
    ctx.strokeStyle = i % 2 ? C.red : C.ink;
    ctx.globalAlpha = Math.max(0, (1 - i / 6) * Math.min(seg(q, 0, 0.08), 1 - seg(q, 0.92, 1)));
    ctx.setLineDash(i % 2 ? [6, 7] : [2, 8]);
    ctx.lineDashOffset = q * (i % 2 ? 900 : -900);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  titleCard(ctx, W, H, q, o.card, C.ink);
}

/* ---------- Tide: swell layers at different speeds, foam lines, and a trailing edge the ship rides ---------- */
const swell = (x, amp, freq, phase) => Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 0.43 + phase * 1.7) * amp * 0.6;

function waveEdge(ctx, W, level, amp, freq, phase) {
  ctx.moveTo(-2, level + swell(-2, amp, freq, phase));
  for (let x = 0; x <= W + 12; x += 10) ctx.lineTo(x, level + swell(x, amp, freq, phase));
}

export function tideLevel(H, q) {
  const amp = H * 0.04;
  return lerp(H + amp * 3, -amp * 3, easeIO(seg(q, 0.5, 1)));
}

function tide(ctx, W, H, q, o) {
  const amp = H * (0.034 + Math.min(Math.abs(o.vel || 0) * 0.0009, 0.03));
  const rise = (t) => lerp(H + amp * 3, -amp * 3, t);
  const inT = easeIO(seg(q, 0, 0.5));
  const outT = easeIO(seg(q, 0.5, 1));
  const phase = q * 15;
  [
    { c: '#6d93f5', lead: 1.22, f: 0.0048 },
    { c: C.blue, lead: 1.1, f: 0.0062 },
    { c: '#0a2a9c', lead: 1.04, f: 0.0074 },
    { c: '#0b0c30', lead: 1, f: 0.0094 },
  ].forEach((l, i) => {
    const lv = rise(Math.min(1, inT * l.lead));
    ctx.fillStyle = l.c;
    ctx.beginPath();
    waveEdge(ctx, W, lv, amp, l.f, phase * (1 + i * 0.22) + i * 1.9);
    ctx.lineTo(W + 12, H + 4);
    ctx.lineTo(-2, H + 4);
    ctx.closePath();
    ctx.fill();
    if (inT > 0 && inT < 1) {
      ctx.strokeStyle = 'rgba(244,243,238,.75)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      waveEdge(ctx, W, lv, amp, l.f, phase * (1 + i * 0.22) + i * 1.9);
      ctx.stroke();
    }
  });
  if (q > 0.5) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    waveEdge(ctx, W, rise(outT), amp, 0.0062, phase);
    ctx.lineTo(W + 12, H + 4);
    ctx.lineTo(-2, H + 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Foam along the trailing edge
    ctx.strokeStyle = C.white;
    for (let i = 0; i < 5; i++) {
      ctx.lineWidth = 1.6 - i * 0.26;
      ctx.globalAlpha = (1 - i / 5) * (1 - seg(q, 0.94, 1));
      ctx.beginPath();
      waveEdge(ctx, W, rise(outT) + i * 9, amp, 0.0062, phase + i * 0.2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  titleCard(ctx, W, H, q, o.card, C.white);
}

/* ---------- Barcode: bars slam in from both edges under a laser, then retract the same way ---------- */
const BARS = code39Bars('REFUGIO');
function barcode(ctx, W, H, q, o) {
  const m = W / BARS.width;
  const s = 7;
  const inPhase = q < 0.5;
  const t = inPhase ? q / 0.5 : (q - 0.5) / 0.5;
  const bars = (dest) => {
    ctx.fillStyle = C.ink;
    if (dest) ctx.globalCompositeOperation = 'destination-out';
    BARS.bars.forEach((b, i) => {
      const d = (b.x / BARS.width) * 0.42;
      const reach = easeOut(seg(t, d, d + 0.26));
      const fat = easeIO(seg(t, d + 0.2, d + 0.58));
      const w = b.w * m * (1 + fat * (s - 1));
      const h = reach * H;
      const x = (b.x + b.w / 2) * m - w / 2;
      if (h > 0) ctx.fillRect(x, i % 2 ? H - h : 0, w, h);
    });
    ctx.globalCompositeOperation = 'source-over';
  };
  if (inPhase) {
    bars(false);
    if (t >= 0.995) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    bars(true);
  }
  // Scanner beam reading across the code
  const beam = lerp(-20, W + 20, easeIO(t));
  if (t > 0 && t < 1) {
    ctx.fillStyle = C.red;
    ctx.fillRect(beam - 1.5, 0, 3, H);
    ctx.globalAlpha = 0.16;
    ctx.fillRect(beam - 40, 0, 80, H);
    ctx.globalAlpha = 1;
  }
  titleCard(ctx, W, H, q, o.card, C.white);
}

/* ---------- Gate arrow: nested chevrons chase the plane, then a chamfered window opens ---------- */
function chamfer(ctx, cx, cy, w, h, c) {
  ctx.beginPath();
  ctx.moveTo(cx - w + c, cy - h);
  ctx.lineTo(cx + w - c, cy - h);
  ctx.lineTo(cx + w, cy - h + c);
  ctx.lineTo(cx + w, cy + h - c);
  ctx.lineTo(cx + w - c, cy + h);
  ctx.lineTo(cx - w + c, cy + h);
  ctx.lineTo(cx - w, cy + h - c);
  ctx.lineTo(cx - w, cy - h + c);
  ctx.closePath();
}

function arrowShape(ctx, x, y, size) {
  const a = size;
  const b = size * 0.34;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-a * 0.5, -a * 0.5);
  ctx.lineTo(a * 0.5, -a * 0.5);
  ctx.lineTo(a * 0.5, a * 0.5);
  ctx.lineTo(a * 0.5 - b, a * 0.5);
  ctx.lineTo(a * 0.5 - b, -a * 0.5 + b * 1.7);
  ctx.lineTo(-a * 0.5 + b * 0.72, a * 0.5 + b * 0.1);
  ctx.lineTo(-a * 0.5 - b * 0.05, a * 0.5 - b * 0.67);
  ctx.lineTo(a * 0.5 - b * 1.7, -a * 0.5 + b);
  ctx.lineTo(-a * 0.5, -a * 0.5 + b);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function arrow(ctx, W, H, q, o) {
  const M = Math.max(W, H);
  if (q < 0.5) {
    const t = q / 0.5;
    [
      { c: C.yellow, lag: 0 },
      { c: C.blue, lag: 0.09 },
      { c: C.red, lag: 0.18 },
    ].forEach(({ c, lag }) => {
      const k = seg(t, lag, 1);
      if (k <= 0) return;
      const size = lerp(0.08, 10, easeIn(k)) * M;
      ctx.fillStyle = c;
      arrowShape(ctx, lerp(W * 0.08, W * 0.5, easeOut(k)), lerp(H * 0.92, H * 0.5, easeOut(k)), size);
    });
    if (t > 0.86) {
      ctx.fillStyle = C.red;
      ctx.globalAlpha = seg(t, 0.86, 1);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  } else {
    const t = (q - 0.5) / 0.5;
    const e = easeIO(t);
    const w = e * W * 0.6;
    const h = e * H * 0.6;
    ctx.fillStyle = C.red;
    ctx.fillRect(0, 0, W, H);
    if (w > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      chamfer(ctx, W / 2, H / 2, w, h, Math.min(w, h) * 0.34);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // Nested outlines expanding just outside the window
      ctx.strokeStyle = C.ink;
      for (let i = 1; i <= 3; i++) {
        ctx.lineWidth = 1.6 - i * 0.3;
        ctx.globalAlpha = 1 - t;
        const g = 1 + i * 0.06;
        chamfer(ctx, W / 2, H / 2, w * g, h * g, Math.min(w, h) * 0.34 * g);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  titleCard(ctx, W, H, q, o.card, C.ink);
}

/* ---------- Horizon: a line crosses the screen, then sky and sea part along it ---------- */
function horizon(ctx, W, H, q, o) {
  const y0 = H * 0.5;
  if (q < 0.5) {
    const t = q / 0.5;
    const reach = easeIO(seg(t, 0, 0.35));
    const open = easeIO(seg(t, 0.25, 1));
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, y0 - open * H * 0.52, W, open * H * 0.52);
    ctx.fillStyle = C.blue;
    ctx.fillRect(0, y0, W, open * H * 0.52);
    // Sun rising out of the line
    const r = H * 0.22 * easeOut(seg(t, 0.2, 0.9));
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(W * 0.5, y0, r, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.fillRect(W / 2 - (W / 2) * reach, y0 - 1, W * reach, 2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 6; i++) {
      const y = y0 + (H * 0.5 * i * i) / 40;
      if (y > y0 + open * H * 0.5) break;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else {
    const t = easeIO((q - 0.5) / 0.5);
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, -t * H * 0.56, W, H * 0.5 + 1);
    ctx.fillStyle = C.blue;
    ctx.fillRect(0, y0 + t * H * 0.56, W, H * 0.5 + 1);
    ctx.fillStyle = C.red;
    const r = H * 0.22;
    ctx.beginPath();
    ctx.arc(W * 0.5, y0 - t * H * 0.56, r, Math.PI, 0);
    ctx.fill();
  }
  titleCard(ctx, W, H, q, o.card, C.ink);
}

/* ---------- Pinwheel: cards fan out from the centre, spin up to cover, then fly apart ---------- */
function pinwheel(ctx, W, H, q, o) {
  const M = Math.max(W, H);
  const cols = ['#111110', '#e5121e', '#c8ff4e', '#14360a', '#f4f3ee', '#0a3fdb', '#8d8d88', '#d9d9d4'];
  const closing = q < 0.5;
  const t = closing ? q / 0.5 : (q - 0.5) / 0.5;
  cols.forEach((c, i) => {
    const a = (i / cols.length) * Math.PI * 2;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    if (closing) {
      const k = easeIO(seg(t, i * 0.05, 0.6 + i * 0.05));
      ctx.rotate(a + (1 - k) * 2.6);
      ctx.scale(k, k);
      ctx.fillStyle = c;
      ctx.fillRect(-M * 0.8, -M * 0.8, M * 1.6, M * 1.6);
    } else {
      const k = easeIn(seg(t, (cols.length - 1 - i) * 0.05, 0.62 + (cols.length - 1 - i) * 0.05));
      ctx.rotate(a + k * 1.6);
      ctx.translate(k * M * 1.75, 0);
      ctx.fillStyle = c;
      ctx.fillRect(-M * 0.8, -M * 0.8, M * 1.6, M * 1.6);
    }
    ctx.restore();
  });
  titleCard(ctx, W, H, q, o.card, C.ink);
}

/* ---------- Ticket: bands with a torn, scalloped edge pull across the screen ---------- */
function scallopBand(ctx, W, H, x0, x1, r) {
  const n = Math.ceil(H / (r * 2.6));
  const step = H / n;
  ctx.beginPath();
  ctx.moveTo(x0, 0);
  ctx.lineTo(x1, 0);
  for (let i = 0; i < n; i++) ctx.arc(x1, step * (i + 0.5), r, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(x1, H);
  ctx.lineTo(x0, H);
  ctx.closePath();
  ctx.fill();
}

function ticket(ctx, W, H, q, o) {
  const r = Math.max(W, H) * 0.016;
  const span = W + r * 4;
  [
    { c: C.yellow, lag: 0 },
    { c: C.blue, lag: 0.09 },
    { c: C.ink, lag: 0.18 },
  ].forEach(({ c, lag }) => {
    const front = easeIO(seg(q, lag * 0.5, 0.5)) * span;
    const back = easeIO(seg(q, 0.5 + lag * 0.5, 1)) * span;
    if (front <= back) return;
    ctx.fillStyle = c;
    scallopBand(ctx, W, H, back, front, r);
  });
  titleCard(ctx, W, H, q, o.card, C.white);
}

/* ---------- Train: four rows of wagons roll in from alternating sides, then keep rolling ---------- */
function train(ctx, W, H, q, o) {
  const rows = 4;
  const rh = H / rows;
  const cols = [C.red, C.ink, C.white, C.white];
  for (let r = 0; r < rows; r++) {
    const dir = r % 2 ? 1 : -1;
    const lag = r * 0.03;
    const inK = easeIO(seg(q, lag, 0.47 + lag * 0.5));
    const outK = easeIO(seg(q, 0.53 + (3 - r) * 0.02, 1));
    const x = dir * ((1 - inK) * W * 1.08 - outK * W * 1.08);
    ctx.save();
    ctx.translate(x, r * rh);
    ctx.fillStyle = cols[r];
    ctx.fillRect(0, 0, W + 1, rh + 1);
    // Panel seams, a red sill, and wheels along the bottom of each wagon
    const pale = cols[r] === C.white;
    ctx.fillStyle = pale ? C.ink : C.white;
    ctx.globalAlpha = 0.5;
    const seams = Math.max(4, Math.round(W / 240));
    for (let s = 0; s <= seams; s++) ctx.fillRect((s / seams) * W, rh * 0.06, 1.4, rh * 0.74);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pale ? C.red : C.yellow;
    ctx.fillRect(0, rh * 0.78, W, rh * 0.05);
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, rh * 0.83, W, rh * 0.17);
    ctx.fillStyle = '#3a3a38';
    const axles = Math.max(4, Math.round(W / 180));
    for (let a = 0; a < axles; a++) {
      ctx.beginPath();
      ctx.arc(((a + 0.5) / axles) * W, rh * 0.91, rh * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  titleCard(ctx, W, H, q, o.card, C.yellow);
}

/* ---------- Strips: tall strips drop from above and below, with crop crosses at their ends ---------- */
function strips(ctx, W, H, q, o) {
  const n = W < 820 ? 5 : 9;
  const sw = W / n;
  const cols = [C.red, C.white, C.ink, C.white, C.red, C.ink, C.white, C.red, C.ink];
  for (let i = 0; i < n; i++) {
    const fromTop = i % 2 === 0;
    const d = ((i * 37) % n) / n;
    const inK = easeIO(seg(q, d * 0.2, 0.3 + d * 0.2));
    const outK = easeIO(seg(q, 0.5 + d * 0.2, 0.8 + d * 0.2));
    const y = fromTop ? (inK - 1 + outK) * H : (1 - inK - outK) * H;
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(Math.floor(i * sw), y, Math.ceil(sw) + 1, H);
  }
  titleCard(ctx, W, H, q, o.card, C.yellow);
}

/* ---------- Sheets: pastel pages flip down in a cascade, then flip away ---------- */
function sheetsWipe(ctx, W, H, q, o) {
  const cols = W < 820 ? 4 : 7;
  const rows = W < 820 ? 7 : 4;
  const cw = W / cols;
  const ch = H / rows;
  const tints = ['#efe8d8', '#d5dadb', '#e6dade', '#f3deae', '#f2d6d3', '#cfe3da', '#f4c9b7', '#ebeae6', '#c9d3c0', '#f5efdf', '#dde0ea', '#f8f2ea'];
  const closing = q < 0.5;
  const t = closing ? q / 0.5 : (q - 0.5) / 0.5;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const d = ((c + r) / (cols + rows)) * 0.6;
      const k = easeIO(seg(t, d, d + 0.4));
      const scale = closing ? k : 1 - k;
      if (scale <= 0) continue;
      ctx.fillStyle = tints[(c * 5 + r * 3) % tints.length];
      const h = ch * scale + 1;
      ctx.fillRect(c * cw, r * ch + (ch - h) / 2, cw + 1, h);
      if (scale > 0.8) {
        ctx.strokeStyle = 'rgba(17,17,16,.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * cw + 0.5, r * ch + 0.5, cw, ch);
      }
    }
  }
  titleCard(ctx, W, H, q, o.card, C.ink);
}

/* ---------- Pixels: a block mosaic resolves out of nothing, like a signal being lost ---------- */
function pixels(ctx, W, H, q, o) {
  const g = Math.max(18, Math.max(W, H) / 40);
  const cols = Math.ceil(W / g);
  const rows = Math.ceil(H / g);
  const closing = q < 0.5;
  const t = closing ? q / 0.5 : (q - 0.5) / 0.5;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      // Blocks clump together rather than appearing as pure noise
      const big = rand(Math.floor(c / 4) * 13 + Math.floor(r / 4) * 97);
      const small = rand(c * 31 + r * 7);
      const v = big * 0.6 + small * 0.4;
      const on = closing ? v < t * 1.02 : v >= t * 1.02;
      if (!on) continue;
      ctx.fillStyle = small > 0.9 ? C.yellow : small > 0.76 ? C.blue : C.ink;
      ctx.fillRect(c * g, r * g, g + 0.5, g + 0.5);
    }
  }
  titleCard(ctx, W, H, q, o.card, C.white);
}

/* ---------- Streaks: long violet strokes sweep in from both sides, like wind through the room ---------- */
function streaks(ctx, W, H, q, o) {
  const n = 64;
  const closing = q < 0.5;
  const t = closing ? q / 0.5 : (q - 0.5) / 0.5;
  const dark = '#0d0a10';
  const brush = (i) => {
    const y = ((i + 0.5) / n) * H;
    const left = i % 2 === 0;
    const d = rand(i + 7) * 0.5;
    return { y, left, d, wob: rand(i + 3) * H * 0.05 };
  };
  ctx.lineCap = 'butt';
  const stroke = (b, k, width) => {
    const x0 = b.left ? -20 : W + 20;
    const x1 = x0 + (b.left ? 1 : -1) * (W + 40) * k;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, b.y);
    ctx.quadraticCurveTo((x0 + x1) / 2, b.y + b.wob * Math.sin(q * 9 + b.y), x1, b.y);
    ctx.stroke();
  };
  if (closing) {
    for (let i = 0; i < n; i++) {
      const b = brush(i);
      const k = easeIO(seg(t, b.d, b.d + 0.5));
      if (k <= 0) continue;
      ctx.strokeStyle = dark;
      stroke(b, k, (H / n) * 2.6);
      ctx.strokeStyle = i % 3 === 0 ? '#7a3cc0' : i % 3 === 1 ? '#4e2488' : '#a06ad8';
      stroke(b, Math.min(1, k * 1.12), 1 + rand(i) * 3);
    }
  } else {
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000';
    for (let i = 0; i < n; i++) {
      const b = brush(i);
      const k = easeIO(seg(t, b.d, b.d + 0.5));
      if (k > 0) stroke(b, k, (H / n) * 2.6);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i += 2) {
      const b = brush(i);
      const k = easeIO(seg(t, b.d, b.d + 0.5));
      ctx.strokeStyle = '#a06ad8';
      ctx.globalAlpha = 1 - t;
      if (k > 0) stroke(b, k, 1);
    }
    ctx.globalAlpha = 1;
  }
  titleCard(ctx, W, H, q, o.card, C.white);
}

/* ---------- Hatch: ink lines thicken until the page is black, then cross-hatch back to paper ---------- */
function hatch(ctx, W, H, q, o) {
  const g = Math.max(W, H) / 46;
  const span = W + H;
  const closing = q < 0.5;
  const t = closing ? q / 0.5 : (q - 0.5) / 0.5;
  const draw = (sign, width, reach) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = -2; i * g < span; i++) {
      const c = i * g;
      if (sign > 0) {
        ctx.moveTo(c, 0);
        ctx.lineTo(c - H * reach, H * reach);
      } else {
        ctx.moveTo(W - c, 0);
        ctx.lineTo(W - c + H * reach, H * reach);
      }
    }
    ctx.stroke();
  };
  ctx.lineCap = 'butt';
  if (closing) {
    ctx.strokeStyle = '#15100b';
    draw(1, 1 + easeIn(t) * g * 1.6, easeOut(seg(t, 0, 0.4)) * 1.02);
  } else {
    ctx.fillStyle = '#15100b';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000';
    draw(-1, 0.5 + easeIn(t) * g * 1.6, 1.02);
    ctx.globalCompositeOperation = 'source-over';
  }
  titleCard(ctx, W, H, q, o.card, '#f2e7d0');
}

/* ---------- Equalizer: lime bars jump to the beat until they fill the screen, then drop ---------- */
function equalizer(ctx, W, H, q, o) {
  const n = W < 820 ? 14 : 28;
  const bw = W / n;
  const lime = '#c8ff4e';
  const closing = q < 0.5;
  const t = closing ? q / 0.5 : (q - 0.5) / 0.5;
  for (let i = 0; i < n; i++) {
    const beat = Math.abs(Math.sin(q * 24 + i * 0.7)) * 0.3 + Math.abs(Math.sin(q * 11 + i * 1.3)) * 0.2;
    if (closing) {
      const h = Math.min(H * 1.02, H * (easeIO(t) * 1.04 + beat * (1 - t)));
      ctx.fillStyle = lime;
      ctx.fillRect(Math.floor(i * bw), H - h, Math.ceil(bw) + 1, h);
      ctx.fillStyle = '#141414';
      if (h < H) ctx.fillRect(Math.floor(i * bw), H - h, Math.ceil(bw) + 1, 5);
    } else {
      const h = Math.max(0, H * (1 - easeIO(t) * 1.04 - beat * t));
      ctx.fillStyle = lime;
      ctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw) + 1, h);
      ctx.fillStyle = '#141414';
      if (h > 0 && h < H) ctx.fillRect(Math.floor(i * bw), h - 5, Math.ceil(bw) + 1, 5);
    }
  }
  titleCard(ctx, W, H, q, o.card, '#141414');
}

export const wipes = { score, skyline, stripes, perforate, crop, iris, tide, barcode, arrow, horizon, pinwheel, ticket, train, strips, sheets: sheetsWipe, pixels, streaks, hatch, equalizer };

export class WipeLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dirty = false;
    this.opts = {};
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.W = innerWidth;
    this.H = innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
  }

  // Start of a frame: wipe the canvas only if something was drawn on it last time.
  begin() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.dirty) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.dirty = false;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  touch() {
    this.dirty = true;
  }

  draw(name, q, extra) {
    const fn = wipes[name];
    if (!fn) return;
    this.dirty = true;
    fn(this.ctx, this.W, this.H, q, { ...this.opts, ...extra });
  }
}
