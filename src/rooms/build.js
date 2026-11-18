// The three rooms, built in CSS perspective: walls, floor, ceiling, a wall of posters and the
// figure in front of them. Each room has its own furniture, its own way of hanging posters,
// its own effects layer and its own feature. The camera moves through three stages: wide,
// mid and close, following the plaque in the corner.
import { word } from '../vector/glyphs.js';
import { lerp } from '../vector/lines.js';
import { posterHTML, carousel, hangs } from './posters.js';
import { features } from './features.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tile = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
const STAGE_P = [0.06, 0.5, 0.94];

// Long violet streaks that stream past the figure, in a layer of their own behind it.
function makeStreaks() {
  const list = Array.from({ length: 96 }, (_, i) => {
    const left = i % 3 === 0;
    return {
      left,
      y0: left ? 0.2 + Math.random() * 0.2 : 0.3 + Math.random() * 0.42,
      x0: left ? 0.5 : 0.52,
      len: 0.28 + Math.random() * 0.34,
      drop: left ? -0.04 + Math.random() * 0.08 : 0.08 + Math.random() * 0.4,
      w: 0.6 + Math.random() * 3.4,
      ph: Math.random() * 6.28,
      tone: Math.random(),
    };
  });
  return (c, W, H, t, gust) => {
    c.lineCap = 'round';
    list.forEach((s) => {
      const dir = s.left ? -1 : 1;
      const x0 = W * s.x0;
      const y0 = H * s.y0;
      const wave = Math.sin(t * 0.9 + s.ph) * H * (0.012 + gust * 0.02);
      const x1 = x0 + dir * W * s.len * 0.5;
      const x2 = x0 + dir * W * s.len;
      c.strokeStyle = `rgba(${(62 + s.tone * 58) | 0},${(26 + s.tone * 30) | 0},${(120 + s.tone * 70) | 0},${0.2 + s.tone * 0.36})`;
      c.lineWidth = s.w;
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo(x1, y0 + H * s.drop * 0.3 + wave, x2, y0 + H * s.drop + wave * 2.2);
      c.stroke();
    });
  };
}

export const DEFS = {
  frieren: () => {
    const streaks = makeStreaks();
    return {
      hang: 'arc',
      wipe: 'streaks',
      closeUp: 24,
      sway: 0.35,
      back: () => `<div class="fr-moon"></div>`,
      floor: () => `<div class="fr-grid"></div>`,
      animate(el, c, W, H, t, p) {
        streaks(c, W, H, t, p * 0.5);
        for (let i = 0; i < 46; i++) {
          const s = i * 12.9898;
          const x = (Math.sin(s) * 0.5 + 0.5) * W;
          const rise = ((t * (0.02 + (i % 5) * 0.006) + (Math.sin(s * 3.1) + 1)) % 1) * H;
          c.globalAlpha = 0.25 + (i % 4) * 0.14;
          c.fillStyle = i % 3 ? '#e6dcff' : '#ffe9a8';
          c.fillRect(x + Math.sin(t + i) * 12, H - rise, 2.4, 2.4);
        }
        c.globalAlpha = 1;
      },
    };
  },
  emma: () => ({
    hang: 'wire',
    wipe: 'hatch',
    sway: 0.12,
    back() {
      // A telephone exchange: rows of jacks, and patch cords that plot on with the stages
      const jacks = tile(160, (i) => `<circle cx="${60 + (i % 16) * 80}" cy="${60 + Math.floor(i / 16) * 62}" r="${i % 7 === 2 ? 11 : 7}"/>`);
      const cords = ['M140 122 C260 460 460 460 620 246', 'M380 60 C520 360 760 480 1100 308', 'M860 122 C900 420 660 520 300 432', 'M1180 184 C1100 520 820 560 540 556', 'M220 494 C420 660 760 660 1020 494'];
      return `<svg class="em-board" viewBox="0 0 1320 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g class="em-jacks">${jacks}</g>
        <g class="em-cords">${cords.map((d) => `<path d="${d}" pathLength="1"/>`).join('')}</g>
        <g class="em-live"></g>
      </svg>`;
    },
    left: () => '<div class="em-hatch"></div>',
    right: () => '<div class="em-hatch em-hatch--r"></div>',
    floor: () => '<div class="em-floor"></div>',
    animate(el, c, W, H, t, p) {
      el.querySelectorAll('.em-cords path').forEach((path, i) => {
        path.style.strokeDashoffset = 1 - Math.min(1, Math.max(0, p * 1.8 - i * 0.12));
      });
      c.fillStyle = 'rgba(21,16,11,.5)';
      for (let i = 0; i < 40; i++) {
        const s = i * 7.13;
        const fall = ((t * (0.012 + (i % 4) * 0.005) + (Math.sin(s) + 1) * 0.5) % 1) * H;
        c.fillRect((Math.sin(s * 2.3) * 0.5 + 0.5) * W + Math.sin(t * 0.5 + i) * 10, fall, 1.6, 7);
      }
    },
  }),
  mitsuki: () => ({
    hang: 'rack',
    wipe: 'equalizer',
    closeUp: 24,
    sway: 0.2,
    back() {
      const hues = ['#141414', '#f6f4ec', '#e5121e', '#0a3fdb', '#ffc60a', '#2e5a12', '#f6f4ec', '#141414'];
      return `<div class="mk-rack">${tile(88, (i) => `<i style="background:${hues[(i * 5 + (i % 4)) % hues.length]}"></i>`)}</div><div class="mk-disc"><span></span></div>`;
    },
    left: () => `<div class="mk-side">${tile(40, () => '<i></i>')}</div>`,
    right: () => `<div class="mk-side">${tile(40, () => '<i></i>')}</div>`,
    floor: () => '<div class="mk-floor"></div>',
    near: () => `<div class="mk-counter"><div class="mk-crate">${tile(26, (i) => `<i style="background:${['#141414', '#f6f4ec', '#e5121e', '#0a3fdb', '#ffc60a'][(i * 3 + (i % 2)) % 5]}"></i>`)}</div></div>`,
    animate(el, c, W, H, t, p, feature) {
      const bins = feature?.bins;
      const beat = bins ? Math.min(1, feature.level * 1.6) : Math.abs(Math.sin(t * 3.3)) * 0.5;
      el.style.setProperty('--beat', beat.toFixed(3));
      el.style.setProperty('--spin', bins ? '0.8s' : '2.6s');
      const n = 42;
      const bw = W / n;
      c.fillStyle = bins ? 'rgba(20,20,20,.3)' : 'rgba(20,20,20,.14)';
      for (let i = 0; i < n; i++) {
        const amp = bins ? bins[Math.min(bins.length - 1, (i * 1.3) | 0)] / 255 : Math.abs(Math.sin(t * 2.4 + i * 0.7) * Math.cos(t * 1.3 + i * 0.31)) * 0.6;
        const h = H * (0.04 + amp * 0.26);
        for (let b = 0; b * 12 < h; b++) c.fillRect(i * bw + 3, H * 0.76 - b * 12, bw - 6, 8);
      }
    },
  }),
};

export function buildRoom(key, d, { onPoster } = {}) {
  const def = DEFS[key]();
  const el = document.createElement('section');
  el.className = `room room--${key}`;
  el.dataset.room = key;
  el.setAttribute('aria-label', `${d.name}'s room`);
  const posters = d.posters ?? [];
  const feature = features[key](d.feature ?? { title: '', note: '', items: [] }, d);
  el.innerHTML = `
    <div class="room__view">
      <div class="room__rig">
        <div class="room__face room__ceil"></div>
        <div class="room__face room__left">${def.left?.() ?? ''}</div>
        <div class="room__face room__right">${def.right?.() ?? ''}</div>
        <div class="room__face room__back">${def.back()}<div class="room__name">${word(d.wall, { w: 0.9, track: 1.5 })}</div></div>
        <div class="room__face room__floor">${def.floor?.() ?? ''}</div>
        <canvas class="room__fx"></canvas>
        <div class="room__posters" data-hang="${def.hang}">
          ${posters.map((p, i) => `<button class="pst-slot" aria-label="Poster ${i + 1}: ${esc(p.title)}">${posterHTML(p, d, i, posters.length)}</button>`).join('')}
          ${def.hang === 'rack' ? '<div class="pst-shelf" aria-hidden="true"></div>' : ''}
          ${def.hang === 'wire' ? '<div class="pst-wire" aria-hidden="true"></div>' : ''}
        </div>
        <div class="room__figure"><div class="room__shadow"></div><img class="room__art" src="${esc(d.image)}" alt="${esc(d.alt)}" draggable="false" decoding="async"></div>
        ${def.near?.() ?? ''}
      </div>
    </div>
    <div class="room__label">
      <p class="mono room__code">${esc(d.code)} <span lang="ja">${esc(d.kana)}</span></p>
      <h2>${esc(d.name)}</h2>
      <p class="room__series"><i>${esc(d.series)}</i><br>${esc(d.creator)}</p>
    </div>
    <div class="room__deck">
      <div class="room__shelf glass">
        <button class="rs-arrow" data-step="-1" aria-label="Previous poster">&lsaquo;</button>
        <div class="rs-mid"><span class="mono">Posters</span><b data-poster-title>${esc(posters[0]?.title ?? '')}</b></div>
        <span class="rs-count mono" data-live><span data-poster-n>01</span> / ${String(posters.length).padStart(2, '0')}</span>
        <button class="rs-arrow" data-step="1" aria-label="Next poster">&rsaquo;</button>
      </div>
      <div class="room__feature glass">${feature.html}</div>
    </div>
    <div class="room__plaque glass">
      <div class="rp-tabs" role="tablist" aria-label="Stages">${(d.stages ?? []).map((_, i) => `<button role="tab" data-stage="${i}" class="${i === 0 ? 'is-on' : ''}">0${i + 1}</button>`).join('')}</div>
      <div class="rp-text">${(d.stages ?? []).map((s, i) => `<p class="${i === 0 ? 'is-on' : ''}">${esc(s)}</p>`).join('')}</div>
    </div>
    <p class="room__credit mono">${esc(d.credit)}</p>`;

  const q = (s) => el.querySelector(s);
  const rig = q('.room__rig');
  const fx = q('.room__fx');
  const fig = q('.room__figure');
  const tabs = [...el.querySelectorAll('[data-stage]')];
  const texts = [...el.querySelectorAll('.rp-text p')];
  const name = q('.room__name path');
  name?.setAttribute('pathLength', '1');
  if (name) name.style.strokeDasharray = '1 1';
  const nEl = q('[data-poster-n]');
  const tEl = q('[data-poster-title]');
  const reel = carousel(q('.room__posters'), hangs[def.hang], {
    onFront(i) {
      nEl.textContent = String(i + 1).padStart(2, '0');
      tEl.textContent = posters[i]?.title ?? '';
    },
    onOpen: (i) => onPoster?.(key, i),
  });
  el.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => reel.step(+b.dataset.step)));
  feature.mount(q('.room__feature'), el, reel);

  const state = { px: 0, py: 0, tx: 0, ty: 0, p: STAGE_P[0], pT: STAGE_P[0], t: 0, stage: 0, auto: 0, enter: 1, name: 0 };
  const setStage = (i, user) => {
    state.stage = i;
    state.pT = STAGE_P[i];
    if (user) state.auto = -20;
    tabs.forEach((b, n) => b.classList.toggle('is-on', n === i));
    texts.forEach((p, n) => p.classList.toggle('is-on', n === i));
  };
  tabs.forEach((b, i) => b.addEventListener('click', () => setStage(i, true)));
  const onMove = (e) => {
    state.tx = (e.clientX / innerWidth - 0.5) * 2;
    state.ty = (e.clientY / innerHeight - 0.5) * 2;
  };
  let wheelAcc = 0;
  const onWheel = (e) => {
    if (e.target.closest('.room__feature, .room__plaque')) return;
    e.preventDefault();
    wheelAcc += e.deltaY + e.deltaX;
    if (Math.abs(wheelAcc) > 90) {
      reel.step(Math.sign(wheelAcc));
      wheelAcc = 0;
    }
  };
  const size = () => {
    const r = Math.min(devicePixelRatio || 1, 1.5);
    fx.width = Math.round(innerWidth * 1.4 * r);
    fx.height = Math.round(innerHeight * 1.2 * r);
  };
  addEventListener('resize', () => el.isConnected && size());

  return {
    key,
    el,
    def,
    reel,
    feature,
    get card() {
      return { title: d.wall, code: `${d.code} / ${d.name}` };
    },
    enter() {
      size();
      addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('wheel', onWheel, { passive: false });
      setStage(0);
      state.p = STAGE_P[0];
      state.enter = 1;
      state.auto = 0;
    },
    leave() {
      removeEventListener('pointermove', onMove);
      el.removeEventListener('wheel', onWheel);
      feature.stop();
    },
    // 1 at the start of the entrance, 0 once the room has settled.
    set entrance(v) {
      state.enter = v;
    },
    tick(dt, calm) {
      const speed = feature.speed ?? 1;
      state.t += dt * speed;
      state.auto += dt;
      if (!calm && state.auto > 9) {
        state.auto = 0;
        setStage((state.stage + 1) % 3);
      }
      const k = 1 - Math.exp(-dt * 4);
      state.px += (state.tx - state.px) * k;
      state.py += (state.ty - state.py) * k;
      state.p += (state.pT - state.p) * (1 - Math.exp(-dt * 1.4));
      state.name = Math.min(1, state.name + dt * 0.5);
      const p = state.p;
      const e = state.enter;
      // Dolly in and arc slightly around the figure, with the pointer adding a small lean.
      // On the way in the camera starts further back and higher, and settles.
      const z = lerp(-12, def.closeUp ?? 40, p) - e * 46;
      const arc = lerp(5, -5, p) + state.px * 3.2 + e * 9;
      rig.style.transform = `translateZ(${z.toFixed(2)}vh) translateY(${(lerp(0, 3, p) - e * 6).toFixed(2)}vh) rotateY(${arc.toFixed(3)}deg) rotateX(${(state.py * -1.6 - e * 4).toFixed(3)}deg)`;
      fig.style.setProperty('--sway', (Math.sin(state.t * 0.8) * def.sway).toFixed(3));
      fig.style.setProperty('--rise', e.toFixed(3));
      if (name) name.style.strokeDashoffset = 1 - state.name;
      reel.tick(dt * Math.min(speed, 2), !calm);
      feature.tick(dt);
      const c = fx.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, fx.width, fx.height);
      def.animate(el, c, fx.width, fx.height, state.t, p, feature);
      feature.draw?.(c, fx.width, fx.height);
    },
  };
}
