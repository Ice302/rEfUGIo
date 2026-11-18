// The heads-up layer that stays on top of every section, the telemetry readout, the
// motion switch, the loader and the project viewer.
import gsap from 'gsap';
import { site, graphics, photos, sites, wheelCards } from './content.js';
import { word } from './vector/glyphs.js';
import { mockFor } from './scenes/wall.js';
import { fleet } from './fleet.config.js';

export function buildHud(ctx) {
  const hud = document.getElementById('hud');
  hud.innerHTML = `
    <button class="hud__mark" data-go="departure" aria-label="${site.name}, back to the top">${word(site.name, { w: 1.5, track: 1.8 })}</button>
    <p class="hud__where mono"><span data-where>Departure</span> <span class="hud__stage" data-stage></span></p>
    <nav class="hud__nav mono" aria-label="Main">
      <button data-go="road">Graphics</button>
      <button data-go="air">Photography</button>
      <button data-go="wall">Websites</button>
      <button data-go="rooms">Rooms</button>
      <button data-go="reel">Reel</button>
      <button data-go="boarding">Contact</button>
    </nav>
    <button class="hud__route mono" data-route-open aria-haspopup="dialog">Route</button>
    <button class="hud__motion mono" data-motion aria-pressed="${!ctx.reduced}">${ctx.reduced ? 'Motion off' : 'Motion on'}</button>`;

  const ruler = document.getElementById('ruler');
  ruler.innerHTML = `<i data-marker></i><span class="mono" data-code>S.00</span>`;
  const marker = ruler.querySelector('[data-marker]');
  const code = ruler.querySelector('[data-code]');
  const where = hud.querySelector('[data-where]');
  const stageEl = hud.querySelector('[data-stage]');

  const cross = document.getElementById('cross');
  if (matchMedia('(pointer: fine)').matches && !ctx.reduced) {
    const read = cross.querySelector('span');
    const label = cross.querySelector('b');
    let idle = 0;
    addEventListener('pointermove', (e) => {
      cross.style.opacity = 1;
      // The crosshair leaves the screen when the pointer rests, so no marks linger.
      clearTimeout(idle);
      idle = setTimeout(() => (cross.style.opacity = 0), 1400);
      cross.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      read.textContent = `X${String(Math.round(e.clientX)).padStart(4, '0')} Y${String(Math.round(e.clientY)).padStart(4, '0')}`;
      const hit = e.target.closest?.('[data-cursor]');
      label.textContent = hit ? hit.dataset.cursor : '';
    });
    document.addEventListener('pointerleave', () => (cross.style.opacity = 0));
  } else {
    cross.remove();
  }

  return {
    setProgress(p) {
      marker.style.top = `${(p * 100).toFixed(2)}%`;
    },
    setStage(text) {
      stageEl.textContent = text;
    },
    setScene(scene, index) {
      where.textContent = scene.title;
      code.textContent = `S.${String(index).padStart(2, '0')} / ${scene.title}`;
    },
  };
}

// A live readout for whichever vehicle is on screen. Speed follows how fast you scroll.
export function buildTelemetry(stage) {
  const box = document.getElementById('telemetry');
  box.innerHTML = `<span class="tm__big" data-big>0</span><span class="tm__col"><span data-unit></span><span data-sub></span><span class="tm__bar">${'<i></i>'.repeat(18)}</span></span>`;
  const big = box.querySelector('[data-big]');
  const unit = box.querySelector('[data-unit]');
  const sub = box.querySelector('[data-sub]');
  const ticks = [...box.querySelectorAll('.tm__bar i')];
  return (view) => {
    if (!view) return;
    const kind = fleet[view.pending || view.to || view.model].kind;
    const s = Math.max(0, view.speed);
    let value;
    let u;
    let line;
    let level;
    if (kind === 'car') {
      const kmh = Math.min(350, Math.round(s * 10));
      const gear = kmh < 8 ? 'N' : Math.min(4, 1 + Math.floor(kmh / 88));
      value = kmh;
      u = 'km/h';
      line = `Gear ${gear}`;
      level = kmh < 8 ? 0.06 : ((kmh % 88) / 88) * 0.75 + 0.25;
    } else if (kind === 'plane') {
      const mach = Math.min(0.92, 0.62 + s * 0.012);
      value = mach.toFixed(2).slice(1);
      u = 'Mach';
      const bank = Math.round((view.attRoll * 180) / Math.PI);
      line = `FL390 Bank ${bank > 0 ? '+' : ''}${bank}`;
      level = (mach - 0.6) / 0.32;
    } else {
      const kn = Math.min(32, Math.round(4 + s * 0.9));
      value = kn;
      u = 'Knots';
      line = `Hdg ${String((94 + Math.round(view.travel * 3)) % 360).padStart(3, '0')}`;
      level = kn / 32;
    }
    big.textContent = value;
    unit.textContent = u;
    sub.textContent = line;
    const lit = Math.round(level * ticks.length);
    ticks.forEach((t, i) => {
      t.classList.toggle('on', i < lit);
      t.classList.toggle('hot', i < lit && i >= ticks.length - 4);
    });
  };
}

// A transit map of the whole site, with one coloured line per part of the work.
export function buildRoute(ctx, scenes) {
  const box = document.getElementById('route');
  const lines = [['Start', '#111110'], ['Road', '#e5121e'], ['Air', '#0a3fdb'], ['Sea', '#ffc60a'], ['Rooms', '#6b35b0'], ['Terminal', '#111110']];
  box.innerHTML = `
    <div class="rt-sheet">
      <header class="rt-head mono"><span>Route map / ${scenes.length} stops</span><button data-route-close>Close <em>&times;</em></button></header>
      <div class="rt-lines">
        ${lines
          .map(
            ([name, color]) => `<section class="rt-line" style="--c:${color}">
              <h3>${name}</h3>
              <ol>${scenes
                .filter((s) => s.line === name)
                .map((s) => `<li><button data-route-go="${s.id}"><i></i><span>${s.title}</span></button></li>`)
                .join('')}</ol>
            </section>`,
          )
          .join('')}
      </div>
      <p class="rt-keys mono">Keys: Left and Right change section. Alt with Up or Down moves between stages. M opens this map.</p>
    </div>`;
  let last = null;
  const sheet = box.querySelector('.rt-sheet');
  const close = () => {
    if (box.hidden) return;
    box.hidden = true;
    ctx.lenis?.start();
    last?.focus?.({ preventScroll: true });
  };
  const open = () => {
    last = document.activeElement;
    box.hidden = false;
    ctx.lenis?.stop();
    box.querySelector('[data-route-close]').focus();
    if (ctx.reduced) return;
    gsap.fromTo(sheet, { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }, { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', duration: 0.6, ease: 'power4.inOut' });
    gsap.from(box.querySelectorAll('.rt-line li'), { autoAlpha: 0, x: -14, duration: 0.35, stagger: 0.018, delay: 0.2, ease: 'power2.out' });
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-route-open]')) open();
    else if (e.target.closest('[data-route-close]') || e.target === box) close();
    else {
      const go = e.target.closest('[data-route-go]');
      if (go) {
        close();
        if (ctx.reduced) document.getElementById(go.dataset.routeGo)?.scrollIntoView();
        else ctx.go(go.dataset.routeGo);
      }
    }
  });
  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const items = [...box.querySelectorAll('button')];
      const first = items[0];
      const end = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  return {
    isOpen: () => !box.hidden,
    toggle: () => (box.hidden ? open() : close()),
    setCurrent(scene) {
      box.querySelectorAll('[data-route-go]').forEach((b) => b.classList.toggle('is-on', b.dataset.routeGo === scene.id));
    },
  };
}

// Film grain and scanlines laid over the whole page, as one small tile.
export function buildGrain(reduced) {
  const box = document.getElementById('retro');
  if (reduced) {
    box.remove();
    return;
  }
  const c = document.createElement('canvas');
  c.width = 180;
  c.height = 180;
  const g = c.getContext('2d');
  const img = g.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * 26;
  }
  g.putImageData(img, 0, 0);
  box.style.setProperty('--grain', `url(${c.toDataURL()})`);
}

// Plots the name while fonts settle, then lifts away. Returning visitors skip it.
export function runLoader(ctx) {
  const box = document.getElementById('loader');
  if (ctx.reduced) {
    box.remove();
    return Promise.resolve();
  }
  let seen = false;
  try {
    seen = sessionStorage.getItem('refugio-seen') === '1';
    sessionStorage.setItem('refugio-seen', '1');
  } catch {
    /* Storage can be blocked. The loader simply plays again. */
  }
  box.innerHTML = `<div><div class="loader__word">${word(site.name, { w: 1.5, track: 1.8 })}</div><div class="loader__bar"><i></i></div></div>`;
  const bar = box.querySelector('.loader__bar i');
  let running = true;
  const tick = () => {
    bar.style.transform = `scaleX(${Math.max(0.04, ctx.stage.loaded)})`;
    if (running) requestAnimationFrame(tick);
  };
  tick();
  const ready = Promise.all([document.fonts?.ready, ctx.stage.ready]);
  // A slow connection never holds the site hostage: after a while it opens regardless,
  // and each vehicle appears as soon as its file arrives.
  const timeout = new Promise((r) => setTimeout(r, 9000));
  const minimum = new Promise((r) => setTimeout(r, seen ? 0 : 1250));
  return Promise.all([Promise.race([ready, timeout]), minimum]).then(() => {
    running = false;
    bar.style.transform = 'scaleX(1)';
    box.classList.add('is-done');
    setTimeout(() => box.remove(), 800);
  });
}

export function buildCase(ctx) {
  const box = document.getElementById('case');
  box.innerHTML = `
    <div class="case__sheet" role="document">
      <header class="case__head mono"><span data-kicker></span><span class="case__nav"><button data-prev>&larr; Prev</button><button data-next-item>Next &rarr;</button><button data-close>Close <em>&times;</em></button></span></header>
      <div class="case__body">
        <div class="case__media" data-media></div>
        <div class="case__text">
          <h3 data-title id="case-title"></h3>
          <p class="mono" data-meta></p>
          <p data-desc></p>
        </div>
      </div>
    </div>`;
  box.setAttribute('aria-labelledby', 'case-title');
  box.removeAttribute('aria-label');
  const sheet = box.querySelector('.case__sheet');
  const f = {
    kicker: box.querySelector('[data-kicker]'),
    title: box.querySelector('[data-title]'),
    meta: box.querySelector('[data-meta]'),
    desc: box.querySelector('[data-desc]'),
    media: box.querySelector('[data-media]'),
  };
  let lastFocus = null;
  let collection = null;
  let index = 0;

  const collections = {
    graphic: {
      items: graphics,
      read(i, trigger) {
        const item = graphics[i];
        let media = `<img src="${item.image}" alt="${item.title}">`;
        if (!item.image) {
          const svg = (trigger?.querySelector('svg') ?? document.querySelector(`[data-case-graphic="${i}"] svg`)).cloneNode(true);
          svg.classList.add('case__stamp');
          media = svg.outerHTML;
        }
        return { kicker: `Graphic design / No.0${i + 1}`, title: item.title, meta: `${item.type}, ${item.year}`, desc: item.text, media };
      },
    },
    photo: {
      items: photos,
      read(i) {
        const item = photos[i];
        return {
          kicker: `Photography / Frame 0${i + 1}`,
          title: item.title,
          meta: `${item.place}. ${item.exif}`,
          desc: item.text ?? (item.sample ? 'Placeholder frame, generated for this proof of concept. Replace it in src/content.js with your own photograph.' : ''),
          media: `<img src="${item.src}" alt="${item.title}">`,
        };
      },
    },
    card: {
      items: wheelCards,
      read(i) {
        const item = wheelCards[i];
        const src = document.querySelector(`[data-case-card="${i}"] .cw-face`);
        return {
          kicker: `Graphic design / Card 0${i + 1}`,
          title: item.label,
          meta: `${item.note}${item.sample ? ', sample' : ''}`,
          desc: item.text ?? (item.sample ? 'Sample card, standing in for a real piece of identity work. Replace it in src/content.js.' : ''),
          media: item.image ? `<img src="${item.image}" alt="${item.label}">` : `<div class="case__card cw-card--${item.style}"><span class="cw-face">${src?.innerHTML ?? ''}</span></div>`,
        };
      },
    },
    site: {
      items: sites,
      read(i) {
        const item = sites[i];
        return { kicker: `Website / ${item.status}`, title: item.name, meta: `${item.kind}. ${item.date}. ${item.stack.join(', ')}`, desc: item.text, media: `<div class="case__mock">${mockFor(item)}</div>` };
      },
    },
  };

  function fill(c) {
    f.kicker.textContent = c.kicker;
    f.title.textContent = c.title;
    f.meta.textContent = c.meta;
    f.desc.textContent = c.desc;
    f.media.innerHTML = c.media;
  }

  function open(name, i, trigger) {
    lastFocus = document.activeElement;
    collection = collections[name];
    index = i;
    fill(collection.read(i, trigger));
    box.hidden = false;
    ctx.lenis?.stop();
    box.querySelector('[data-close]').focus();
    if (ctx.reduced) return;
    gsap.fromTo(sheet, { clipPath: 'polygon(0 50%, 100% 50%, 100% 50%, 0 50%)' }, { clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0 100%)', duration: 0.65, ease: 'power4.inOut' });
    gsap.from(box.querySelectorAll('.case__text > *, .case__media'), { autoAlpha: 0, y: 18, duration: 0.5, stagger: 0.05, delay: 0.35, ease: 'power2.out' });
  }

  function step(delta) {
    const n = collection.items.length;
    index = (index + delta + n) % n;
    fill(collection.read(index));
    if (ctx.reduced) return;
    gsap.fromTo(f.media, { xPercent: delta * 8, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' });
    gsap.fromTo(box.querySelectorAll('.case__text > *'), { x: delta * 22, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, stagger: 0.04, ease: 'power3.out' });
  }

  function close() {
    if (box.hidden) return;
    const done = () => {
      box.hidden = true;
      ctx.lenis?.start();
      lastFocus?.focus?.({ preventScroll: true });
    };
    if (ctx.reduced) return done();
    gsap.to(sheet, { clipPath: 'polygon(0 50%, 100% 50%, 100% 50%, 0 50%)', duration: 0.45, ease: 'power3.in', onComplete: done });
  }

  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.closest('[data-close]')) close();
    else if (e.target.closest('[data-prev]')) step(-1);
    else if (e.target.closest('[data-next-item]')) step(1);
  });

  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Tab') {
      // Keep keyboard focus inside the viewer while it is open
      const items = [...box.querySelectorAll('button, a[href]')];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-case-graphic]');
    const ph = e.target.closest('[data-case-photo]');
    const si = e.target.closest('[data-case-site]');
    const cd = e.target.closest('[data-case-card]');
    if (cd) open('card', +cd.dataset.caseCard);
    else if (g) open('graphic', +g.dataset.caseGraphic, g);
    else if (ph) open('photo', +ph.dataset.casePhoto);
    else if (si) open('site', +si.dataset.caseSite);
  });
  return { isOpen: () => !box.hidden };
}
