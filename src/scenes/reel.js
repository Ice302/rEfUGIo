// Reference: the VHS sleeve tournament cover. Three finalists, one per discipline.
// Keys 1, 2 and 3 switch tapes, and PLAY rolls the tape inside the sleeve.
import gsap from 'gsap';
import { reel as tapes, site } from '../content.js';
import { barcodeSVG } from '../vector/lines.js';

const TAPE = [['#e5121e', '#f4f3ee'], ['#0a3fdb', '#f4f3ee'], ['#ffc60a', '#111110']];

export function reel(ctx) {
  const el = document.getElementById('reel');
  const sleeve = (t, i) => `
    <div class="sleeve" data-sleeve="${i}">
      <div class="sleeve__spine"><span>${site.name} / ${t.title}</span></div>
      <div class="sleeve__face">
        <div class="sleeve__head"><div><b>${t.title}</b><span>${t.discipline}</span></div><strong>0${i + 1}</strong></div>
        <div class="sleeve__cover">
          <span class="sleeve__v1">Hi-Fi / Stereo / Original edit</span>
          <div class="sleeve__img"><img data-src="${t.image}" alt="" draggable="false" decoding="async"><i class="sleeve__scan"></i><i class="sleeve__track"></i><em class="sleeve__tc mono">00:00:00</em></div>
          <span class="sleeve__v2">${site.name} video club</span>
        </div>
        <div class="sleeve__foot">
          <div class="sleeve__bars"><i></i><i></i><i></i></div>
          <div class="sleeve__row">
            <span class="vhs">VHS</span>
            <div class="sleeve__meta"><b>Finalist series</b><span>${site.name} ${site.year}</span></div>
            <div class="sleeve__code">${barcodeSVG(`RF-0${i + 1}`)}<span class="mono">RF - 0${i + 1} / ${t.side.toUpperCase()}</span></div>
          </div>
        </div>
      </div>
    </div>`;

  el.innerHTML = `
    <div class="ticks" aria-hidden="true"></div>
    <div class="reel-head">
      <p class="reel-now"><span>Now playing</span> / <span>Finalist <b data-n>01</b></span></p>
      <h2 class="reel-title" data-title><span class="ln"><span>${tapes[0].title}</span></span></h2>
      <p class="reel-disc mono" data-disc>${tapes[0].discipline}</p>
      <p class="reel-text" data-text>${tapes[0].text}</p>
      <div class="reel-square"><span data-sq>01</span></div>
    </div>
    <i class="reel-mark" aria-hidden="true"></i>
    <p class="reel-v1">${site.name} video club</p>
    <div class="shelf">${tapes.map(sleeve).join('')}</div>
    <div class="reel-controls">
      <button class="reel-play" data-play aria-pressed="false"><span>Play</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3 21 12 5 21Z" fill="none" stroke="currentColor" stroke-width="2.6"/></svg></button>
      <p class="reel-v2 mono"><span data-side>Original edit / ${tapes[0].side}</span><br><span data-len>${tapes[0].length}</span></p>
    </div>
    <div class="reel-stripes" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="reel-bar">
      <b data-bar-n>1</b>
      <span class="type" data-bar-text>PRESS "1" TO PLAY</span>
      <span class="reel-bar__picks">
        ${tapes.map((t, i) => `<button class="type" data-tape="${i}" aria-label="Tape ${i + 1}: ${t.title}">${i + 1}</button>`).join('')}
      </span>
      <span class="type reel-bar__pick">YOUR PICK &mdash;</span>
    </div>`;

  const q = (s) => el.querySelector(s);
  const sleeves = [...el.querySelectorAll('.sleeve')];
  let active = -1;
  let playing = false;

  function layoutShelf(i, animate = true) {
    sleeves.forEach((s, n) => {
      const d = n - i;
      const props = {
        xPercent: d < 0 ? d * 13 : d * 26,
        yPercent: Math.abs(d) * 3,
        rotation: d * 5,
        scale: 1 - Math.abs(d) * 0.1,
        zIndex: 10 - Math.abs(d),
      };
      s.classList.toggle('is-front', d === 0);
      if (animate) gsap.to(s, { ...props, duration: 0.85, ease: 'power3.inOut' });
      else gsap.set(s, props);
    });
  }

  function setTape(i, animate = true) {
    if (i === active) return;
    const first = active === -1;
    active = i;
    const t = tapes[i];
    el.style.setProperty('--tape', TAPE[i % 3][0]);
    el.style.setProperty('--tape-ink', TAPE[i % 3][1]);
    q('[data-n]').textContent = `0${i + 1}`;
    q('[data-sq]').textContent = `0${i + 1}`;
    q('[data-title]').innerHTML = `<span class="ln"><span>${t.title}</span></span>`;
    q('[data-disc]').textContent = t.discipline;
    q('[data-text]').textContent = t.text;
    q('[data-side]').textContent = `Original edit / ${t.side}`;
    q('[data-len]').textContent = t.length;
    q('[data-bar-n]').textContent = String(i + 1);
    q('[data-bar-text]').textContent = `PRESS "${i + 1}" TO PLAY`;
    el.querySelectorAll('[data-tape]').forEach((b, n) => b.classList.toggle('is-on', n === i));
    setPlaying(false);
    layoutShelf(i, animate && !first);
    if (!first && animate && !ctx.reduced) {
      gsap.from(q('[data-title] .ln > span'), { yPercent: 105, duration: 0.7, ease: 'power4.out' });
      gsap.fromTo(q('.reel-square'), { rotation: -90, scale: 0.4 }, { rotation: 0, scale: 1, duration: 0.6, ease: 'back.out(2)' });
    }
  }

  function setPlaying(on) {
    playing = on;
    const btn = q('[data-play]');
    btn.setAttribute('aria-pressed', on);
    btn.querySelector('span').textContent = on ? 'Stop' : 'Play';
    el.classList.toggle('is-playing', on);
    clock = 0;
  }
  q('[data-play]').addEventListener('click', () => setPlaying(!playing));

  let clock = 0;
  setTape(0, false);

  const scene = {
    id: 'reel',
    el,
    dur: 200,
    stops: [1 / 6, 0.5, 5 / 6],
    hold: 0.5,
    wipe: 'barcode',
    wipeLen: 100,
    hud: 'ink',
    update(p) {
      setTape(Math.min(tapes.length - 1, Math.floor(p * tapes.length)));
    },
    tick(dt) {
      if (!playing) return;
      clock += dt;
      const front = sleeves[active].querySelector('.sleeve__tc');
      const s = Math.floor(clock);
      front.textContent = `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    },
  };

  el.querySelectorAll('[data-tape]').forEach((b, i) => b.addEventListener('click', () => ctx.jump(scene, (i + 0.5) / tapes.length)));
  addEventListener('keydown', (e) => {
    if (ctx.current() !== scene || e.target.matches('input,textarea')) return;
    const n = +e.key;
    if (n >= 1 && n <= tapes.length) {
      if (n - 1 === active) setPlaying(!playing);
      else ctx.jump(scene, (n - 0.5) / tapes.length);
    }
  });
  return scene;
}
