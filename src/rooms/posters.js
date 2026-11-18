// Posters for the character rooms. A poster with an `image` shows that file. Without one it
// is set from a template, using the room's own artwork, so every wall has something on it
// until real posters are added in the admin panel.
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Light or dark ink, whichever reads on the poster's colour.
export function inkFor(hex = '#111') {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? '#141414' : '#f4f3ee';
}

export const LAYOUTS = ['portrait', 'type', 'bloom', 'moon', 'split'];

export function posterHTML(p, room, i, total) {
  const ink = inkFor(p.tone);
  const no = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const style = `--tone:${esc(p.tone)};--ink:${ink};--art:url('${esc(room.image)}')`;
  if (p.image) {
    return `<figure class="pst pst--image" style="${style}"><img src="${esc(p.image)}" alt="${esc(p.title)}" draggable="false" decoding="async" loading="lazy"><figcaption class="sr">${esc(p.title)}</figcaption></figure>`;
  }
  const layout = LAYOUTS.includes(p.layout) ? p.layout : 'portrait';
  const words = esc(p.title).split(' ');
  return `<figure class="pst pst--${layout}" style="${style}">
    <i class="pst__art" aria-hidden="true"></i>
    <span class="pst__no">${room.code} &middot; ${no}</span>
    <b class="pst__title">${layout === 'type' ? words.join('<br>') : esc(p.title)}</b>
    <span class="pst__line">${esc(p.line)}</span>
    <span class="pst__mark">${esc(room.kana)}</span>
  </figure>`;
}

// Where a poster sits for an offset `o` from the current one. Each room hangs its posters
// its own way: an arc that turns slowly around Frieren, a wire with clips across Emma's
// exchange, and a shop rack that flips like record sleeves for Mitsuki.
export const hangs = {
  arc(o, w, v) {
    const a = o * 0.36;
    const r = w * 2.9;
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r + r * 0.82;
    const fade = Math.max(0, 1 - Math.max(0, Math.abs(o) - 2.2) / 1.2);
    return { t: `translate3d(${x.toFixed(1)}px, ${(Math.abs(o) * w * 0.06 - w * 0.12).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${((-a * 180) / Math.PI).toFixed(2)}deg)`, o: fade, z: 100 - Math.round(Math.abs(o) * 10) };
  },
  wire(o, w, v) {
    const x = o * w * 1.12;
    const swing = Math.max(-14, Math.min(14, -v * 9 + Math.sin(o * 1.7) * 1.5));
    const fade = Math.max(0, 1 - Math.max(0, Math.abs(o) - 2.6) / 1);
    return { t: `translate3d(${x.toFixed(1)}px, ${(-w * 0.2).toFixed(1)}px, 0) rotateZ(${swing.toFixed(2)}deg)`, o: fade, z: 100 - Math.round(Math.abs(o) * 10) };
  },
  rack(o, w, v) {
    const s = Math.sign(o);
    const a = Math.min(1, Math.abs(o));
    const x = s * (a * w * 0.78 + Math.max(0, Math.abs(o) - 1) * w * 0.34);
    const ry = -s * a * 62;
    const z = -a * w * 0.7;
    const fade = Math.max(0, 1 - Math.max(0, Math.abs(o) - 3.4));
    return { t: `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`, o: fade, z: 100 - Math.round(Math.abs(o) * 10) };
  },
};

// A looping carousel. `pos` eases toward `target`, the posters are placed from it every
// frame, and the counter follows the poster nearest the front.
export function carousel(track, hang, { onFront, onOpen } = {}) {
  const items = [...track.querySelectorAll('.pst-slot')];
  const n = items.length;
  const state = { pos: 0, target: 0, vel: 0, idle: 0, drag: null, front: -1 };
  const wrap = (o) => {
    let d = o % n;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };
  const go = (i) => {
    state.target = Math.round(i);
    state.idle = 0;
  };
  const step = (d) => go(state.target + d);

  track.addEventListener('pointerdown', (e) => {
    state.drag = { x: e.clientX, start: state.target, moved: 0 };
  });
  addEventListener('pointermove', (e) => {
    if (!state.drag) return;
    const dx = e.clientX - state.drag.x;
    state.drag.moved = Math.max(state.drag.moved, Math.abs(dx));
    state.target = state.drag.start - dx / (items[0]?.offsetWidth || 200);
    state.idle = 0;
  });
  addEventListener('pointerup', () => {
    if (!state.drag) return;
    state.target = Math.round(state.target);
    state.drag = state.drag.moved > 6 ? { done: true } : null;
    setTimeout(() => (state.drag = null), 0);
  });
  items.forEach((el, i) =>
    el.addEventListener('click', (e) => {
      if (state.drag?.done) return;
      e.preventDefault();
      const o = wrap(i - state.pos);
      if (Math.abs(o) > 0.5) go(state.target + Math.round(o));
      else onOpen?.(i);
    }),
  );

  return {
    go,
    step,
    get front() {
      return state.front;
    },
    tick(dt, auto = true) {
      state.idle += dt;
      if (auto && state.idle > 5.5 && !state.drag) {
        state.idle = 0;
        state.target += 1;
      }
      const prev = state.pos;
      state.pos += (state.target - state.pos) * (1 - Math.exp(-dt * 5.5));
      state.vel += ((state.pos - prev) / Math.max(dt, 1e-3) - state.vel) * 0.2;
      const w = items[0]?.offsetWidth || 200;
      items.forEach((el, i) => {
        const p = hang(wrap(i - state.pos), w, state.vel);
        el.style.transform = p.t;
        el.style.opacity = p.o.toFixed(3);
        el.style.zIndex = p.z;
        el.style.visibility = p.o < 0.01 ? 'hidden' : '';
      });
      const f = ((Math.round(state.pos) % n) + n) % n;
      if (f !== state.front) {
        items[state.front]?.classList.remove('is-front');
        items[f].classList.add('is-front');
        state.front = f;
        onFront?.(f);
      }
    },
  };
}
