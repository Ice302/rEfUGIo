// One thing to do in each room, on top of looking around. Frieren's grimoire casts small
// spells into the room, Emma's switchboard takes calls, and Mitsuki's listening booth plays
// a short loop that the room keeps time to.
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const panel = (f, body) => `
  <div class="rf-head"><b>${esc(f.title)}</b><span class="mono" data-feature-state></span></div>
  <p class="rf-note">${esc(f.note)}</p>
  ${body}`;

/* ---------- Frieren: a grimoire of three spells ---------- */
export function grimoire(f, room) {
  const icons = [
    '<svg viewBox="0 0 24 24"><path d="M12 4c2 3 2 5 0 8-2-3-2-5 0-8Zm0 8c3-2 5-2 8 0-3 2-5 2-8 0Zm0 0c-3-2-5-2-8 0 3 2 5 2 8 0Zm0 0c2 3 2 5 0 8-2-3-2-5 0-8Z"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M12 2v20M5 6l14 12M19 6 5 18"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 3"/></svg>',
  ];
  const flowers = [];
  let light = 0;
  let decade = 0;
  let years = 0;
  let stateEl;
  let roomEl;
  let reel;
  return {
    html: panel(f, `<div class="rf-spells">${f.items.map((s, i) => `<button class="rf-spell" data-spell="${i}"><i>${icons[i % 3]}</i><span>${esc(s)}</span></button>`).join('')}</div>`),
    mount(box, el, carousel) {
      roomEl = el;
      reel = carousel;
      stateEl = box.querySelector('[data-feature-state]');
      stateEl.textContent = 'Ready';
      box.querySelectorAll('[data-spell]').forEach((b) =>
        b.addEventListener('click', () => {
          const i = +b.dataset.spell;
          b.classList.remove('is-cast');
          void b.offsetWidth;
          b.classList.add('is-cast');
          if (i === 0) {
            for (let n = 0; n < 90; n++) flowers.push({ x: Math.random(), y: 0.7 + Math.random() * 0.28, born: -Math.random() * 1.6, s: 5 + Math.random() * 9, hue: Math.random() });
            stateEl.textContent = 'Flowers in bloom';
          } else if (i === 1) {
            light = 1;
            stateEl.textContent = 'Path lit';
          } else {
            decade = 4;
            years = 0;
          }
        }),
      );
    },
    // How fast time runs in the room: a decade passes in four seconds.
    get speed() {
      return decade > 0 ? 7 : 1;
    },
    tick(dt) {
      for (const fl of flowers) fl.born += dt;
      light = Math.max(0, light - dt * 0.22);
      roomEl.style.setProperty('--moon', (light * 1.4).toFixed(3));
      if (decade > 0) {
        decade -= dt;
        const y = Math.min(10, Math.floor((4 - decade) * 2.6) + 1);
        if (y !== years) {
          years = y;
          stateEl.textContent = `${years} year${years > 1 ? 's' : ''} later`;
          reel?.step(1);
        }
        if (decade <= 0) stateEl.textContent = 'A short walk';
      }
    },
    draw(c, W, H) {
      if (light > 0) {
        const g = c.createLinearGradient(W * 0.5, 0, W * 0.5, H);
        g.addColorStop(0, `rgba(255,236,190,${0.42 * light})`);
        g.addColorStop(1, 'rgba(255,236,190,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(W * 0.46, 0);
        c.lineTo(W * 0.54, 0);
        c.lineTo(W * (0.66 + (1 - light) * 0.2), H);
        c.lineTo(W * (0.34 - (1 - light) * 0.2), H);
        c.fill();
      }
      for (let i = flowers.length - 1; i >= 0; i--) {
        const fl = flowers[i];
        if (fl.born < 0) continue;
        const grow = Math.min(1, fl.born / 0.9);
        const k = 1 - Math.pow(1 - grow, 3);
        const fade = fl.born > 9 ? Math.max(0, 1 - (fl.born - 9) / 2) : 1;
        if (fade <= 0) {
          flowers.splice(i, 1);
          continue;
        }
        const x = fl.x * W;
        const y = fl.y * H;
        const r = fl.s * k * (0.6 + fl.y * 0.6);
        c.globalAlpha = fade;
        c.fillStyle = fl.hue < 0.55 ? '#e8e2ff' : fl.hue < 0.85 ? '#b79cf0' : '#ffe9a8';
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2 + fl.hue * 6;
          c.beginPath();
          c.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.32, r * 0.5, r * 0.26, a, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#ffd86a';
        c.fillRect(x - 1.5, y - 1, 3, 2);
      }
      c.globalAlpha = 1;
    },
    stop() {},
  };
}

/* ---------- Emma: a switchboard that takes calls ---------- */
const JACKS = [18, 37, 52, 75, 100, 133, 146, 61];
const jackXY = (i) => [60 + (i % 16) * 80, 60 + Math.floor(i / 16) * 62];

export function switchboard(f, room) {
  const lines = f.items.slice(0, 8);
  const st = lines.map(() => ({ s: 'idle', t: 0 }));
  let connected = 0;
  let wait = 1.2;
  let box;
  let board;
  let stateEl;
  const lamp = (i) => box.querySelector(`[data-line="${i}"]`);
  const jack = (i) => board?.querySelectorAll('.em-jacks circle')[JACKS[i % JACKS.length]];
  function setLine(i, s) {
    st[i].s = s;
    st[i].t = 0;
    lamp(i).dataset.s = s;
    jack(i)?.setAttribute('class', s === 'idle' ? '' : `is-${s}`);
    if (s === 'live') {
      const [x, y] = jackXY(JACKS[i % JACKS.length]);
      const cord = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      cord.setAttribute('d', `M660 700 C${660 + (x - 660) * 0.2} ${520 - i * 12} ${x} ${y + 260} ${x} ${y}`);
      cord.setAttribute('pathLength', '1');
      cord.dataset.cord = i;
      board.querySelector('.em-live').appendChild(cord);
    }
    if (s === 'idle') board.querySelector(`[data-cord="${i}"]`)?.remove();
  }
  const status = () => {
    const waiting = st.filter((x) => x.s === 'ring').length;
    stateEl.textContent = `${waiting} waiting / ${connected} put through`;
  };
  return {
    html: panel(f, `<div class="rf-lines">${lines.map((l, i) => `<button class="rf-line" data-line="${i}" data-s="idle"><i></i><span>${esc(l)}</span></button>`).join('')}</div>`),
    mount(b, roomEl) {
      box = b;
      board = roomEl.querySelector('.em-board');
      stateEl = box.querySelector('[data-feature-state]');
      box.querySelectorAll('[data-line]').forEach((el) =>
        el.addEventListener('click', () => {
          const i = +el.dataset.line;
          if (st[i].s !== 'ring') return;
          connected += 1;
          setLine(i, 'live');
          status();
        }),
      );
      status();
    },
    speed: 1,
    tick(dt) {
      wait -= dt;
      if (wait <= 0) {
        wait = 2.2 + Math.random() * 2.4;
        const free = st.map((x, i) => (x.s === 'idle' ? i : -1)).filter((i) => i >= 0);
        if (free.length && st.filter((x) => x.s === 'ring').length < 3) {
          setLine(free[(Math.random() * free.length) | 0], 'ring');
          status();
        }
      }
      st.forEach((x, i) => {
        x.t += dt;
        if (x.s === 'live' && x.t > 7) {
          setLine(i, 'idle');
          status();
        }
        if (x.s === 'ring' && x.t > 12) {
          setLine(i, 'idle');
          status();
        }
      });
    },
    stop() {},
  };
}

/* ---------- Mitsuki: a listening booth with a short synthesised loop ---------- */
const TRACKS = [
  { bpm: 94, roots: [57, 53, 48, 55], minor: [1, 0, 0, 0] },
  { bpm: 102, roots: [50, 46, 53, 48], minor: [1, 0, 0, 0] },
  { bpm: 86, roots: [52, 48, 55, 50], minor: [1, 0, 0, 0] },
];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function booth(f, room) {
  let ac = null;
  let master;
  let analyser;
  let bins;
  let timer = 0;
  let playing = false;
  let track = 0;
  let next = 0;
  let stepN = 0;
  let noise;
  let box;
  let stateEl;
  let level = 0;

  function setup() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.16;
    analyser = ac.createAnalyser();
    analyser.fftSize = 128;
    bins = new Uint8Array(analyser.frequencyBinCount);
    master.connect(analyser);
    analyser.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const env = (node, t, a, peak, dec) => {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  };
  function voice(type, freq, t, dur, peak, filter) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    let out = o;
    if (filter) {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = filter;
      o.connect(lp);
      out = lp;
    }
    out.connect(g);
    g.connect(master);
    env(g, t, 0.01, peak, dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function hit(t, freq, dur, peak, type = 'highpass') {
    const s = ac.createBufferSource();
    s.buffer = noise;
    const flt = ac.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = freq;
    const g = ac.createGain();
    s.connect(flt);
    flt.connect(g);
    g.connect(master);
    env(g, t, 0.002, peak, dur);
    s.start(t);
    s.stop(t + dur + 0.02);
  }
  function kick(t) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    o.connect(g);
    g.connect(master);
    env(g, t, 0.004, 1, 0.32);
    o.start(t);
    o.stop(t + 0.4);
  }
  function schedule() {
    const tr = TRACKS[track];
    const sixteenth = 60 / tr.bpm / 4;
    while (next < ac.currentTime + 0.12) {
      const s = stepN % 64;
      const bar = Math.floor(s / 16);
      const beat = s % 16;
      const root = tr.roots[bar];
      if (beat % 8 === 0 || (track === 1 && beat === 10)) kick(next);
      if (beat === 4 || beat === 12) hit(next, 1800, 0.18, 0.5, 'bandpass');
      if (beat % 2 === 0) hit(next, 7000, beat % 4 === 2 ? 0.08 : 0.04, 0.22);
      if (beat === 0 || beat === 6 || beat === 10) voice('triangle', hz(root - 12), next, sixteenth * 3.2, 0.5);
      if (beat === 0) {
        const third = tr.minor[bar] ? 3 : 4;
        [0, third, 7, 12].forEach((iv) => voice('sawtooth', hz(root + iv), next, sixteenth * 15, 0.05, 1400));
      }
      next += sixteenth;
      stepN += 1;
    }
  }
  function play(i = track) {
    if (!ac) setup();
    ac.resume();
    if (i !== track || !playing) {
      track = i;
      next = ac.currentTime + 0.06;
      stepN = 0;
    }
    playing = true;
    clearInterval(timer);
    timer = setInterval(schedule, 25);
    schedule();
    show();
  }
  function pause() {
    playing = false;
    clearInterval(timer);
    ac?.suspend();
    show();
  }
  function show() {
    if (!box) return;
    box.querySelector('[data-play]').classList.toggle('is-on', playing);
    box.querySelector('[data-play]').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    box.querySelectorAll('[data-track]').forEach((b) => b.classList.toggle('is-on', +b.dataset.track === track));
    stateEl.textContent = playing ? `Now playing / ${f.items[track] ?? ''}` : 'Paused';
  }
  return {
    html: panel(
      f,
      `<div class="rf-booth"><button class="rf-play" data-play aria-label="Play"><i></i></button>
        <ol class="rf-tracks">${f.items.slice(0, 3).map((t, i) => `<li><button data-track="${i}">${esc(t)}</button></li>`).join('')}</ol></div>`,
    ),
    mount(b) {
      box = b;
      stateEl = box.querySelector('[data-feature-state]');
      box.querySelector('[data-play]').addEventListener('click', () => (playing ? pause() : play()));
      box.querySelectorAll('[data-track]').forEach((el) => el.addEventListener('click', () => play(+el.dataset.track)));
      show();
    },
    speed: 1,
    // 0 to 1, how loud the music is right now, for the equalizer and the beat.
    get level() {
      return level;
    },
    get bins() {
      return playing ? bins : null;
    },
    tick() {
      if (!playing || !analyser) {
        level *= 0.9;
        return;
      }
      analyser.getByteFrequencyData(bins);
      let sum = 0;
      for (let i = 0; i < 8; i++) sum += bins[i];
      level = sum / (8 * 255);
    },
    stop: pause,
  };
}

export const features = { frieren: grimoire, emma: switchboard, mitsuki: booth };
