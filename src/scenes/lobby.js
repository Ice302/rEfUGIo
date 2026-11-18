// The way into the character rooms. Three tiles, one per room, and a large one for whichever
// is picked. A tile is a button: the room opens over the page, so the scroll itself never
// walks through a room. Hovering a tile, or waiting, changes the large one.
import gsap from 'gsap';
import { lobby, rooms } from '../content.js';
import { ORDER, COVER } from '../rooms/index.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SHAPE = {
  frieren: '<svg viewBox="0 0 40 40"><path d="M20 3 37 20 20 37 3 20Z"/></svg>',
  emma: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16"/></svg>',
  mitsuki: '<svg viewBox="0 0 40 40"><path d="M8 5 35 20 8 35Z"/></svg>',
};
const arrow = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 34 33 7M12 7H33V28" fill="none" stroke="currentColor" stroke-width="5"/></svg>';
const INK = { frieren: '#f1ecde', emma: '#f2e7d0', mitsuki: '#141414' };
const TONE = { frieren: '#2a1d4a', emma: '#15100b', mitsuki: '#c8ff4e' };

export function lobbyScene(ctx) {
  const el = document.getElementById('rooms');
  const total = ORDER.reduce((n, k) => n + (rooms[k].posters?.length ?? 0), 0);
  el.innerHTML = `
    <div class="lb">
      <header class="lb-top mono"><span>${esc(lobby.kicker)}</span><span class="lb-chip">${String(ORDER.length).padStart(2, '0')} rooms / ${total} posters</span></header>
      <h2 class="lb-title"><span>${esc(lobby.title[0])}</span><span>${esc(lobby.title[1])}</span></h2>
      <p class="lb-intro">${esc(lobby.intro)}</p>
      <button class="lb-hero" data-room-open="${ORDER[0]}" data-cursor="Enter">
        <span class="lb-hero__art" aria-hidden="true"></span>
        <span class="lb-hero__name" data-live></span>
        <span class="lb-hero__sub mono" data-live></span>
        <span class="lb-hero__no" data-live></span>
        <span class="lb-hero__go">${arrow}</span>
      </button>
      <dl class="lb-facts">
        <div><dt class="mono">Series</dt><dd data-fact="series" data-live></dd></div>
        <div><dt class="mono">Creator</dt><dd data-fact="creator" data-live></dd></div>
        <div><dt class="mono">Posters</dt><dd data-fact="posters" data-live></dd></div>
      </dl>
      <div class="lb-tiles">
        ${ORDER.map(
          (k, i) => `<button class="lb-tile" data-room-open="${k}" data-key="${k}" style="--tone:${TONE[k]};--ink:${INK[k]}" data-cursor="Enter">
            <b>0${i + 1}</b><span>${esc(rooms[k].name)}</span><i>${SHAPE[k]}</i>
          </button>`,
        ).join('')}
      </div>
      <div class="lb-status">
        <span class="mono">${esc(lobby.hint)}</span>
        <b>${esc(lobby.status)}</b>
        <span class="lb-status__cells mono"><span>Rooms <b>${String(ORDER.length).padStart(2, '0')}</b></span><span>Posters <b>${total}</b></span><span>Credits <b>On every wall</b></span></span>
      </div>
    </div>`;

  const hero = el.querySelector('.lb-hero');
  const tiles = [...el.querySelectorAll('.lb-tile')];
  const f = {
    name: el.querySelector('.lb-hero__name'),
    sub: el.querySelector('.lb-hero__sub'),
    no: el.querySelector('.lb-hero__no'),
    art: el.querySelector('.lb-hero__art'),
    series: el.querySelector('[data-fact="series"]'),
    creator: el.querySelector('[data-fact="creator"]'),
    posters: el.querySelector('[data-fact="posters"]'),
  };
  let active = -1;
  let idle = 0;
  let held = false;
  function pick(i, animate = true) {
    if (i === active) return;
    active = i;
    const k = ORDER[i];
    const r = rooms[k];
    hero.dataset.roomOpen = k;
    hero.style.setProperty('--tone', TONE[k]);
    hero.style.setProperty('--ink', INK[k]);
    hero.style.setProperty('--cover', COVER[k]);
    hero.setAttribute('aria-label', `Enter ${r.name}'s room`);
    f.name.textContent = r.name;
    f.sub.textContent = `${r.code} / Active room`;
    f.no.textContent = `0${i + 1}`;
    f.art.style.backgroundImage = `url('${r.image}')`;
    f.series.textContent = r.series;
    f.creator.textContent = r.creator;
    f.posters.textContent = String(r.posters?.length ?? 0).padStart(2, '0');
    tiles.forEach((t, n) => t.classList.toggle('is-on', n === i));
    if (!animate || ctx.reduced) return;
    gsap.fromTo(f.name, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'power4.out' });
    gsap.fromTo(f.art, { xPercent: 12, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' });
  }
  tiles.forEach((t, i) => {
    t.addEventListener('pointerenter', () => {
      held = true;
      pick(i);
    });
    t.addEventListener('focus', () => pick(i));
    t.addEventListener('pointerleave', () => (held = false));
  });
  hero.addEventListener('pointerenter', () => (held = true));
  hero.addEventListener('pointerleave', () => (held = false));
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-room-open]');
    if (b) ctx.rooms?.open(b.dataset.roomOpen, b);
  });
  pick(0, false);

  return {
    id: 'rooms',
    el,
    dur: 150,
    stops: [0.5],
    hold: 0.3,
    wipe: 'pixels',
    wipeSec: 1.5,
    hud: 'ink',
    staticAt: 0.5,
    update(p) {
      el.style.setProperty('--lp', p.toFixed(4));
    },
    tick(dt) {
      if (held || ctx.rooms?.isOpen()) return;
      idle += dt;
      if (idle > 3.6) {
        idle = 0;
        pick((active + 1) % ORDER.length);
      }
    },
  };
}
