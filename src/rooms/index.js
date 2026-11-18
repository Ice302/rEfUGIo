// The character rooms open over the page from the lobby's buttons, so the scroll never has
// to pass through them. Opening grows the chosen tile to fill the screen, then the room's own
// transition reveals it. A glass rail on the left moves between rooms or back to the site.
import gsap from 'gsap';
import { rooms as data } from '../content.js';
import { WipeLayer } from '../vector/wipes.js';
import { buildRoom } from './build.js';
import { posterHTML } from './posters.js';
import { applyText } from '../text.js';

export const ORDER = ['frieren', 'emma', 'mitsuki'];
export const COVER = { frieren: '#0d0a10', emma: '#15100b', mitsuki: '#c8ff4e' };

const icon = {
  home: '<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4Z"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
  exit: '<svg viewBox="0 0 24 24"><path d="M14 4h6v16h-6M10 8l-4 4 4 4M6 12h10"/></svg>',
};
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createRooms(ctx) {
  const box = document.getElementById('room-view');
  box.tabIndex = -1;
  box.innerHTML = `
    <div class="rv-stage"></div>
    <nav class="rv-rail glass" aria-label="Rooms">
      <span class="rv-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <button class="rv-item" data-rv-close data-home><i>${icon.home}</i><span>Lobby</span></button>
      <hr>
      ${ORDER.map((k) => `<button class="rv-item" data-rv="${k}"><i class="rv-num">${esc(data[k].code.slice(-2))}</i><span>${esc(data[k].name)}</span></button>`).join('')}
      <hr>
      <button class="rv-item" data-rv-grid><i>${icon.grid}</i><span>Poster view</span></button>
      <button class="rv-item rv-exit" data-rv-close><i>${icon.exit}</i><span>Back to the site</span></button>
    </nav>
    <canvas class="rv-wipe" aria-hidden="true"></canvas>
    <div class="rv-flip" aria-hidden="true"></div>
    <div class="rv-light" role="dialog" aria-modal="true" aria-label="Poster" hidden>
      <div class="rvl-sheet">
        <div class="rvl-poster" data-lb-poster></div>
        <div class="rvl-side">
          <p class="mono" data-lb-no data-live></p>
          <h3 data-lb-title data-live></h3>
          <p data-lb-line data-live></p>
          <div class="rvl-nav"><button class="pill" data-lb="-1">&larr; Previous</button><button class="pill" data-lb="1">Next &rarr;</button></div>
          <button class="rvl-close mono" data-lb-close>Close <em>&times;</em></button>
        </div>
      </div>
    </div>`;
  const stage = box.querySelector('.rv-stage');
  const flip = box.querySelector('.rv-flip');
  const layer = new WipeLayer(box.querySelector('.rv-wipe'));
  const light = box.querySelector('.rv-light');
  const built = {};
  let current = null;
  let open = false;
  let busy = false;
  let lastFocus = null;
  let from = null;
  let lb = 0;

  const room = (key) => {
    if (!built[key]) {
      built[key] = buildRoom(key, data[key], { onPoster: (k, i) => showPoster(i) });
      built[key].el.hidden = true;
      stage.appendChild(built[key].el);
      applyText(built[key].el, 'rooms');
    }
    return built[key];
  };

  function mark(key) {
    box.dataset.room = key;
    box.querySelectorAll('[data-rv]').forEach((b) => {
      const on = b.dataset.rv === key;
      b.classList.toggle('is-on', on);
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  function mount(key) {
    if (current) {
      current.leave();
      current.el.hidden = true;
    }
    current = room(key);
    current.el.hidden = false;
    current.enter();
    // With motion off the room starts settled, with no camera move in.
    if (ctx.reduced) current.entrance = 0;
    mark(key);
    try {
      history.replaceState(null, '', `#rooms/${key}`);
    } catch {
      /* Some embedded viewers refuse this. */
    }
  }

  // The settle after a room appears: camera eases in, the figure rises, panels slide in.
  function arrive() {
    const r = current;
    const s = { e: 1 };
    gsap.to(s, { e: 0, duration: 2, ease: 'power3.out', onUpdate: () => (r.entrance = s.e) });
    gsap.from(r.el.querySelectorAll('.room__label > *'), { x: -40, autoAlpha: 0, duration: 0.8, stagger: 0.07, delay: 0.25, ease: 'power3.out' });
    gsap.from(r.el.querySelectorAll('.room__deck > *, .room__plaque'), { y: 40, autoAlpha: 0, duration: 0.8, stagger: 0.08, delay: 0.4, ease: 'power3.out' });
    gsap.from(r.el.querySelectorAll('.pst-slot .pst'), { y: -60, autoAlpha: 0, duration: 0.9, stagger: 0.06, delay: 0.3, ease: 'back.out(1.4)' });
  }

  function wipe(key, a, b, duration, ease) {
    const s = { q: a };
    const card = room(key).card;
    return gsap.to(s, {
      q: b,
      duration,
      ease,
      onUpdate() {
        layer.begin();
        if (s.q > 0 && s.q < 1) layer.draw(room(key).def.wipe, s.q, { card });
      },
    });
  }

  const tick = (_, ms) => current?.tick(Math.min(ms / 1000, 0.05), ctx.reduced);

  function rectOf(el) {
    const r = el?.getBoundingClientRect();
    if (!r || r.width < 2 || r.bottom < 0 || r.top > innerHeight) return null;
    return r;
  }
  const clip = (r) => (r ? `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 18px)` : 'inset(50% 50% 50% 50% round 18px)');

  function show(key, trigger) {
    if (busy) return;
    if (open) return switchTo(key);
    busy = true;
    open = true;
    lastFocus = document.activeElement;
    from = trigger ?? document.querySelector(`[data-room-open="${key}"]`);
    ctx.lenis?.stop();
    document.body.classList.add('in-room');
    document.getElementById('scenes').inert = true;
    document.getElementById('hud').inert = true;
    box.hidden = false;
    gsap.ticker.add(tick);
    if (ctx.reduced) {
      mount(key);
      busy = false;
      box.focus({ preventScroll: true });
      return;
    }
    flip.style.background = COVER[key];
    flip.style.display = 'block';
    const tl = gsap.timeline({
      onComplete() {
        busy = false;
      },
    });
    tl.fromTo(flip, { clipPath: clip(rectOf(from)) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.55, ease: 'power3.inOut' })
      .add(() => {
        mount(key);
        layer.begin();
        layer.draw(room(key).def.wipe, 0.5, { card: room(key).card });
        flip.style.display = 'none';
        arrive();
        box.focus({ preventScroll: true });
      })
      .add(wipe(key, 0.5, 1, 1.25, 'power1.inOut'))
      .fromTo(box.querySelector('.rv-rail'), { x: -120 }, { x: 0, duration: 0.7, ease: 'power3.out' }, 0.75);
  }

  function switchTo(key) {
    if (busy || !open || current?.key === key) return;
    busy = true;
    if (ctx.reduced) {
      mount(key);
      busy = false;
      return;
    }
    const tl = gsap.timeline({
      onComplete() {
        busy = false;
      },
    });
    tl.add(wipe(key, 0, 0.5, 0.7, 'power2.in'))
      .add(() => {
        mount(key);
        arrive();
      })
      .add(wipe(key, 0.5, 1, 1.05, 'power1.inOut'));
  }

  // `now` skips the animation, for when the visitor has already gone somewhere else.
  function close(now = false) {
    if (!open || (busy && !now)) return;
    if (!light.hidden && !now) return hidePoster();
    light.hidden = true;
    busy = true;
    const done = () => {
      current?.leave();
      if (current) current.el.hidden = true;
      current = null;
      open = false;
      busy = false;
      box.hidden = true;
      flip.style.display = 'none';
      layer.begin();
      gsap.ticker.remove(tick);
      document.body.classList.remove('in-room');
      document.getElementById('scenes').inert = false;
      document.getElementById('hud').inert = false;
      ctx.lenis?.start();
      if (!now) {
        try {
          history.replaceState(null, '', '#rooms');
        } catch {
          /* Some embedded viewers refuse this. */
        }
        lastFocus?.focus?.({ preventScroll: true });
      }
    };
    if (ctx.reduced || now) {
      gsap.killTweensOf(flip);
      return done();
    }
    const key = current.key;
    const target = rectOf(document.querySelector(`[data-room-open="${key}"]`) ?? from);
    gsap
      .timeline({ onComplete: done })
      .add(wipe(key, 0, 0.5, 0.65, 'power2.in'))
      .add(() => {
        current.el.hidden = true;
        layer.begin();
        flip.style.background = COVER[key];
        flip.style.display = 'block';
        flip.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
      })
      .to(flip, { clipPath: clip(target), duration: 0.5, ease: 'power3.inOut' })
      .to(flip, { autoAlpha: 0, duration: 0.2 })
      .set(flip, { autoAlpha: 1 });
  }

  /* ---------- The poster view ---------- */
  function fillPoster() {
    const d = data[current.key];
    const list = d.posters ?? [];
    const p = list[lb];
    if (!p) return;
    light.querySelector('[data-lb-poster]').innerHTML = posterHTML(p, d, lb, list.length);
    light.querySelector('[data-lb-no]').textContent = `${d.code} / Poster ${String(lb + 1).padStart(2, '0')} of ${String(list.length).padStart(2, '0')}`;
    light.querySelector('[data-lb-title]').textContent = p.title;
    light.querySelector('[data-lb-line]').textContent = p.line;
    light.dataset.room = current.key;
  }
  function showPoster(i) {
    if (!current) return;
    lb = i ?? Math.max(0, current.reel.front);
    fillPoster();
    light.hidden = false;
    light.querySelector('[data-lb-close]').focus();
    if (!ctx.reduced) gsap.fromTo(light.querySelector('.rvl-sheet'), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' });
  }
  function hidePoster() {
    light.hidden = true;
    current?.el.querySelector('.rs-arrow')?.focus({ preventScroll: true });
  }
  light.querySelectorAll('[data-lb]').forEach((b) =>
    b.addEventListener('click', () => {
      const n = (data[current.key].posters ?? []).length;
      lb = (lb + +b.dataset.lb + n) % n;
      fillPoster();
      current.reel.go(lb);
      if (!ctx.reduced) gsap.fromTo(light.querySelector('[data-lb-poster]'), { x: +b.dataset.lb * 30, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' });
    }),
  );
  light.querySelector('[data-lb-close]').addEventListener('click', hidePoster);
  light.addEventListener('click', (e) => e.target === light && hidePoster());

  box.addEventListener('click', (e) => {
    const go = e.target.closest('[data-rv]');
    if (go) switchTo(go.dataset.rv);
    if (e.target.closest('[data-rv-close]')) close();
    if (e.target.closest('[data-rv-grid]')) showPoster();
  });
  addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    if (!light.hidden || e.target.matches?.('input, textarea')) return;
    if (e.key === 'ArrowRight') current?.reel.step(1);
    if (e.key === 'ArrowLeft') current?.reel.step(-1);
    if (e.key === 'Tab') {
      const f = [...box.querySelectorAll('button:not([hidden]), [href]')].filter((n) => n.offsetParent !== null && !n.closest('[hidden]'));
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        f[f.length - 1]?.focus();
      } else if (!e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[0]?.focus();
      }
    }
  });
  applyText(box.querySelector('.rv-rail'), 'rooms');
  applyText(light, 'rooms');

  return {
    open: show,
    close,
    isOpen: () => open,
    get current() {
      return current?.key ?? null;
    },
  };
}
