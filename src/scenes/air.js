// Reference: the studio reel with crop lines. Frames run through a centre-weighted strip:
// the middle one opens to full colour, and the rest close down into red duotone. The plane
// flies S-turns along the upper crop line, and the crop lines double as flight instruments.
import { photos } from '../content.js';
import { lerp, seg, clamp, launch, landing, cruise } from '../vector/lines.js';
import { pathPose } from '../stage/paths.js';

const smooth = (t) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

// Crossing the wipe: climbing out from the lower left, banking hard, away past the top right.
const CROSS = [[-1.3, -1.08], [-0.82, -0.72], [-0.46, -0.06], [-0.05, 0.05], [0.36, 0.16], [0.72, 0.64], [1.32, 1.08]];

export function air(ctx) {
  const el = document.getElementById('air');
  el.innerHTML = `
    <svg class="croplines" aria-hidden="true"></svg>
    <p class="air-tl mono">FL 390<br>Air unit / Photography<br>Frame <span data-frame>01</span> of ${String(photos.length).padStart(2, '0')}</p>
    <h2 class="air-title">The<br>Long<br>View</h2>
    <div class="strip" data-strip>
      ${photos
        .map(
          (ph, i) => `<button class="frame" style="--duo-c:${['#e5121e', '#0a3fdb', '#ffc60a'][i % 3]}" data-case-photo="${i}" data-cursor="Open" aria-label="Open photograph: ${ph.title}">
            <img data-src="${ph.src}" alt="${ph.title}, ${ph.place}" draggable="false" decoding="async"${ph.focus ? ` style="object-position:${ph.focus}"` : ''}><span class="frame__duo"></span>
          </button>`,
        )
        .join('')}
    </div>
    <div class="air-bl"><svg viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1C5.9 1 1 5.9 1 12c0 7.7 11 17 11 17s11-9.3 11-17C23 5.9 18.1 1 12 1Zm0 15a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/></svg><span data-place>${photos[0].place}</span></div>
    <p class="air-br mono"><span data-title>${photos[0].title}</span><br><span data-exif>${photos[0].exif}</span><br><span data-note>${photos[0].sample ? 'Placeholder frame' : ''}</span></p>
    <div class="view" data-view="air"></div>`;

  const frames = [...el.querySelectorAll('.frame')];
  const strip = el.querySelector('[data-strip]');
  const lines = el.querySelector('.croplines');
  const f = {
    n: el.querySelector('[data-frame]'),
    t: el.querySelector('[data-title]'),
    e: el.querySelector('[data-exif]'),
    p: el.querySelector('[data-place]'),
    s: el.querySelector('[data-note]'),
  };
  const view = ctx.stage.addView({
    el: el.querySelector('.view'),
    model: 'plane',
    fill: '#ecece8',
    hatch: 0.5,
    yaw: -0.6,
    pitch: -0.18,
    parallax: 0.05,
    pointerGain: 0.6,
    cruise: 3,
    velGain: 0.5,
    trail: { skid: 0, contrail: 0.9, wake: 0 },
  });
  const frameView = () => {
    const phone = innerWidth < 820;
    view.zoom = phone ? 0.46 : 0.42;
    view.panY = phone ? 0.5 : 0.66;
  };
  frameView();
  addEventListener('resize', frameView);

  function drawLines() {
    const W = innerWidth;
    const H = innerHeight;
    lines.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const xs = [W * 0.116, W * 0.764];
    const ys = [H * 0.13, H * 0.858];
    const dots = [];
    xs.forEach((x) => ys.forEach((y) => dots.push([x, y])));
    lines.innerHTML = `${xs.map((x) => `<line x1="${x}" x2="${x}" y1="0" y2="${H}"/>`).join('')}${ys.map((y) => `<line x1="0" x2="${W}" y1="${y}" y2="${y}"/>`).join('')}
      ${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6"/>`).join('')}`;
  }
  drawLines();
  addEventListener('resize', drawLines);

  let shown = -1;
  const layout = (p) => {
    const cur = p * (photos.length - 1);
    const sh = strip.clientHeight;
    const sw = strip.clientWidth;
    const narrow = innerWidth < 800;
    const hMax = sh;
    const widths = [];
    const heights = [];
    photos.forEach((_, i) => {
      const ad = Math.abs(i - cur);
      const k = smooth(ad / 3.2);
      const h = hMax * lerp(1, 0.52, k);
      const w = hMax * lerp(narrow ? 0.86 : 1.16, 0.16, smooth(ad / 3.6)) * (ad < 1 ? lerp(1, 0.8, ad) : 0.8);
      widths.push(w);
      heights.push(h);
    });
    let x = 0;
    const centers = widths.map((w) => {
      const c = x + w / 2;
      x += w;
      return c;
    });
    const a = Math.floor(cur);
    const b = Math.min(a + 1, photos.length - 1);
    const anchor = lerp(centers[a], centers[b], cur - a);
    frames.forEach((frame, i) => {
      const ad = Math.abs(i - cur);
      const w = widths[i];
      const h = heights[i];
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;
      frame.style.transform = `translate3d(${sw / 2 + centers[i] - anchor - w / 2}px, ${(sh - h) / 2}px, 0)`;
      frame.style.zIndex = String(100 - Math.round(ad * 10));
      frame.style.setProperty('--duo', smooth((ad - 0.12) / 0.62).toFixed(3));
      frame.style.visibility = ad > 5 ? 'hidden' : '';
    });
    const near = Math.round(cur);
    if (near !== shown) {
      shown = near;
      const ph = photos[near];
      f.n.textContent = String(near + 1).padStart(2, '0');
      f.t.textContent = ph.title;
      f.e.textContent = ph.exif;
      f.p.textContent = ph.place;
      f.s.textContent = ph.sample ? 'Placeholder frame' : '';
    }
  };

  let last = 0;
  let laid = false;
  addEventListener('resize', () => layout(last));

  // The plane flies the band above the photos, left to right, and stops short of the title.
  // It follows the scroll itself rather than the photo stops, so it never halts in mid-air,
  // and it eases after the scroll so a flick still reads as flight.
  const startX = -0.6;
  const endX = 0.38;
  const fly = { target: 0, now: 0, t: 0, seen: false };
  const place = () => {
    const r = fly.now;
    const weave = Math.sin(r * Math.PI * 3);
    view.panX = lerp(startX, endX, r);
    view.fxY = weave * 0.03 + Math.sin(fly.t * 0.9) * 0.008;
    view.yaw = -0.6 + weave * 0.16;
    view.bankT = Math.cos(r * Math.PI * 3) * 0.3;
  };
  return {
    id: 'air',
    el,
    dur: 300,
    stops: photos.map((_, i) => i / (photos.length - 1)),
    hold: 0.42,
    wipe: 'crop',
    wipeSec: 2,
    staticAt: 0.5,
    hud: 'ink',
    views: [view],
    enter() {
      layout(last);
    },
    update(p, raw) {
      if (p !== last || !laid) {
        last = p;
        laid = true;
        layout(p);
      }
      fly.target = raw;
      if (ctx.reduced || !fly.seen) fly.now = raw;
      fly.seen = true;
      place();
    },
    tick(dt) {
      fly.t += dt;
      fly.now += (fly.target - fly.now) * (1 - Math.exp(-dt * 2.6));
      place();
    },
    // Instruments: a heading tape on the top crop line, an altitude tape on the left, and
    // a horizon bar that tilts with the plane.
    fx(layer) {
      if (innerWidth < 820 || !view.rect) return;
      const { ctx: c, W, H } = layer;
      layer.touch();
      c.strokeStyle = '#111110';
      c.fillStyle = '#111110';
      c.font = `500 ${Math.max(9, W * 0.0066)}px "IBM Plex Mono", monospace`;
      c.lineWidth = 1;
      c.globalAlpha = 0.72;
      const y0 = H * 0.13;
      const step = W * 0.024;
      const off = (last * W * 1.5) % (step * 5);
      c.textBaseline = 'bottom';
      c.textAlign = 'center';
      const startI = W * 0.116;
      for (let i = 0; i < 40; i++) {
        const x = startI + i * step - off + step * 5;
        if (x < startI + 6 || x > W * 0.764 - 6) continue;
        const major = i % 5 === 0;
        c.beginPath();
        c.moveTo(x, y0 - (major ? 10 : 5));
        c.lineTo(x, y0);
        c.stroke();
        if (major) {
          const hdg = (270 + Math.round(last * 90) + i * 2) % 360;
          c.fillText(String(hdg).padStart(3, '0'), x, y0 - 12);
        }
      }
      const x0 = W * 0.116;
      const stepY = H * 0.042;
      const offY = (last * H * 1.1) % (stepY * 5);
      c.textBaseline = 'middle';
      c.textAlign = 'right';
      for (let i = 0; i < 22; i++) {
        const y = H * 0.16 + i * stepY - offY + stepY * 5;
        if (y < H * 0.16 || y > H * 0.84) continue;
        const major = i % 5 === 0;
        c.beginPath();
        c.moveTo(x0 - (major ? 10 : 5), y);
        c.lineTo(x0, y);
        c.stroke();
        if (major) c.fillText(`${37 + Math.round(last * 4) + (21 - i)}0`, x0 - 13, y);
      }
      c.textAlign = 'left';
      const pos = ctx.stage.project(view, [0, 0, 0]);
      if (pos) {
        const roll = view.attRoll;
        const dx = Math.cos(roll) * W * 0.15;
        const dy = Math.sin(roll) * W * 0.15;
        const gapX = Math.cos(roll) * W * 0.095;
        const gapY = Math.sin(roll) * W * 0.095;
        c.strokeStyle = '#0a3fdb';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(pos.x - dx, pos.y - dy);
        c.lineTo(pos.x - gapX, pos.y - gapY);
        c.moveTo(pos.x + gapX, pos.y + gapY);
        c.lineTo(pos.x + dx, pos.y + dy);
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    // Phase one: the plane crosses the wipe and the crop grid unfolds behind it.
    transit(q, tv) {
      if (q >= 0.5) return;
      const u = seg(q, 0.02, 0.48);
      const k = u * 0.55 + cruise(u) * 0.45;
      const pose = pathPose(CROSS, k, innerWidth / innerHeight, { pitch: 0.34, zoom: lerp(1.45, 0.55, landing(u)) });
      tv.model = 'plane';
      tv.active = q > 0.02 && k < 1;
      tv.path = pose;
      tv.fxBoost = 24;
      tv.fxBank = -pose.turn * 1.3 - 0.2;
      tv.fxClimb = 0.16;
      tv.contrail = 1;
      tv.gear = 0;
    },
    // Phase two: in from the left at the height of the band, levelling off onto it.
    wipeIn(t) {
      const k = landing(t);
      const y = view.panY;
      fly.now = 0;
      place();
      const route = [[-1.45, y - 0.2], [-1.22, y - 0.15], [-1.02, y - 0.08], [-0.86, y - 0.03], [startX - 0.14, y], [startX - 0.06, y], [startX, y]];
      const pose = pathPose(route, k, innerWidth / innerHeight, { pitch: 0.24, zoom: lerp(0.8, view.zoom, k), blend: seg(t, 0.55, 1) });
      view.path = pose;
      view.fxBank = -pose.turn * 1.2 * (1 - t);
      view.fxBoost = (1 - t) * 16;
      view.fxClimb = (1 - t) * 0.08;
      view.contrail = 1;
    },
    // Exit: pulls up and climbs out through the top of the sheet.
    wipeOut(t) {
      const k = launch(t);
      const yNow = view.panY;
      const x = view.panX;
      const route = [[x, yNow], [x + 0.09, yNow + 0.04], [x + 0.15, yNow + 0.1], [x + 0.2, yNow + 0.2], [x + 0.22, yNow + 0.4], [x + 0.2, yNow + 0.75], [x + 0.16, 1.5]];
      const pose = pathPose(route, k, innerWidth / innerHeight, { pitch: 0.22, zoom: lerp(view.zoom, view.zoom * 0.5, k), blend: 1 - seg(t, 0, 0.14) });
      view.path = pose;
      view.fxBank = -0.4 * seg(t, 0, 0.5);
      view.fxBoost = t * 20;
      view.fxClimb = 0.3 * t;
      view.contrail = 1;
      view.hidden = t >= 0.98;
    },
  };
}
