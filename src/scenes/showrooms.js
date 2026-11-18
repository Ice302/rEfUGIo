// Six showrooms for graphic work, each staged after one of the reference pieces. Everything
// in them is sample work, standing in for real projects until those are added.
import gsap from 'gsap';
import { wheelCards, sleeves, wagons, sheets, site } from '../content.js';
import { word } from '../vector/glyphs.js';
import { barcodeSVG, lerp } from '../vector/lines.js';

/* ---------- Card wheel: a pinwheel of business cards that turns to present each one ---------- */
const scribble = `<svg viewBox="0 0 200 130" aria-hidden="true"><g fill="none" stroke="#c8ff4e" stroke-width="2.4" stroke-linecap="round"><path d="M14 80C30 30 44 24 50 52S36 110 62 84 88 22 96 54 84 114 110 86 138 24 146 56 134 112 160 82 180 50 188 62"/><path d="M26 104C54 92 110 96 172 104"/><path d="M40 28C70 12 124 12 164 30"/></g></svg>`;

const cardFace = (c) => {
  if (c.image) return `<img data-src="${c.image}" alt="" draggable="false">`;
  switch (c.style) {
    case 'black':
      return `<b>Width&mdash;Black</b><span class="mono">Type system</span>`;
    case 'red':
      return `<b>I WANT<br>TO &mdash;</b><span class="cw-rings"><i></i><i></i></span>`;
    case 'lime':
      return `<b>//easy</b>`;
    case 'green':
      return scribble;
    case 'white':
      return `<em>&rarr;</em><b>OPEN<br>REFERENCE</b><span class="mono">2026 &nbsp; AI ERA</span>`;
    case 'blue':
      return `<b>MERIDIAN.</b>`;
    case 'photo':
      return `<img data-src="photos/ph-04.jpg" alt="" draggable="false">`;
    default:
      return `<svg viewBox="0 0 100 20" class="cw-wave" aria-hidden="true"><path d="M2 12C10 2 16 2 24 12S38 22 46 12 60 2 68 12 82 22 96 10" fill="none" stroke="#e5121e" stroke-width="4"/></svg><b>Letter</b>`;
  }
};

export function wheel(ctx) {
  const el = document.getElementById('wheel');
  el.innerHTML = `
    <p class="cw-tr mono">Card <span data-n>01</span></p>
    <h2 class="sr">Business card showroom</h2>
    <div class="cw-disc">
      ${wheelCards
        .map(
          (c, i) => `<button class="cw-card cw-card--${c.image ? 'image' : c.style}" data-case-card="${i}" data-cursor="Open" aria-label="Open ${c.label}, ${c.note}"><span class="cw-face">${cardFace(c)}</span></button>`,
        )
        .join('')}
    </div>
    <p class="cw-cap"><b data-label>${wheelCards[0].label}</b><span class="mono" data-note>${wheelCards[0].note}${wheelCards[0].sample ? ' / sample' : ''}</span></p>
    <footer class="cw-foot mono"><span>Graphic</span><span>Motion</span><span>Template</span></footer>`;
  const cards = [...el.querySelectorAll('.cw-card')];
  const f = { n: el.querySelector('[data-n]'), label: el.querySelector('[data-label]'), note: el.querySelector('[data-note]') };
  const n = cards.length;
  const step = 360 / n;
  const smooth = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };
  let target = 0;
  let spin = 0;
  let front = 0;
  const caption = (i) => {
    const c = wheelCards[i];
    const write = () => {
      f.n.textContent = String(i + 1).padStart(2, '0');
      f.label.textContent = c.label;
      f.note.textContent = `${c.note}${c.sample ? ' / sample' : ''}`;
    };
    if (ctx.reduced) return write();
    // The caption slides out and the next slides in, rather than swapping in place
    gsap.killTweensOf([f.label, f.note]);
    gsap.to([f.label, f.note], {
      y: -10,
      autoAlpha: 0,
      duration: 0.16,
      ease: 'power2.in',
      onComplete() {
        write();
        gsap.fromTo([f.label, f.note], { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.42, ease: 'power3.out', stagger: 0.04 });
      },
    });
  };
  // Every card has a "frontness" that rises and falls continuously with its angle, so size,
  // reach and tilt all blend from one card to the next. Depth does the overlapping, so no
  // card ever jumps above another.
  const place = (sway = 0) => {
    const u = Math.min(innerWidth / 100, innerHeight / 56.25);
    const R = innerWidth < 820 ? u * 17 : u * 11.5;
    let best = 0;
    let bestA = 999;
    cards.forEach((card, i) => {
      const deg = i * step + spin + sway;
      const a = Math.abs(((deg % 360) + 540) % 360 - 180);
      if (a < bestA) {
        bestA = a;
        best = i;
      }
      const k = smooth(1 - a / (step * 1.15));
      const tilt = 13 * (1 - k);
      card.style.transform = `translate(-50%,-50%) rotate(${deg.toFixed(3)}deg) translateX(${(R * (1 + k * 0.34)).toFixed(2)}px) rotateX(${tilt.toFixed(3)}deg) translateZ(${(k * 110).toFixed(2)}px) scale(${(1 + k * 0.12).toFixed(4)})`;
    });
    if (best !== front) {
      front = best;
      caption(best);
    }
  };
  addEventListener('resize', () => place());
  place();
  return {
    id: 'wheel',
    el,
    dur: 270,
    stops: cards.map((_, i) => i / (n - 1)),
    hold: 0.42,
    wipe: 'pinwheel',
    hud: 'ink',
    update(p) {
      // One card's step per stop, so all eight come to the front in turn
      target = -p * step * (n - 1);
      if (ctx.reduced) {
        spin = target;
        place();
      }
    },
    tick(dt) {
      if (ctx.reduced) return;
      // The wheel chases its target with some weight, so it glides in and out of each stop
      spin += (target - spin) * (1 - Math.exp(-dt * 6.5));
      place(Math.sin(performance.now() * 0.00028) * 1.2);
    },
    enter() {
      spin = target;
    },
  };
}

/* ---------- Sleeve: tickets in glossy plastic, with a sheen that follows the pointer ---------- */
export function sleeve(ctx) {
  const el = document.getElementById('sleeve');
  const piece = (s, i) => `
    <article class="slv" data-i="${i}" style="--c0:${s.c[0]};--c1:${s.c[1]};--c2:${s.c[2]}">
      <div class="slv__stub"><b class="mono">PKNA${i + 15}</b><i></i></div>
      <div class="slv__main">
        <h3>${s.title.join('<br>')}</h3>
        <p class="slv__wave">${s.wave}<i></i></p>
        <div class="slv__route">
          <span class="slv__pill mono"><b>${s.code}</b><b>${s.mm}</b></span>
          <svg viewBox="0 0 40 20" aria-hidden="true"><path d="M2 10H34M24 2 36 10 24 18" fill="none" stroke="currentColor" stroke-width="4"/></svg>
          <span class="slv__star"></span>
        </div>
        <div class="slv__by"><b>${s.artist.join('<br>')}</b><span class="mono">${s.list}</span></div>
        <div class="slv__blocks"><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="slv__p1"><p>${s.blurb}</p><svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="20" cy="20" r="16"/><ellipse cx="20" cy="20" rx="7" ry="16"/><path d="M4 20H36M7 12H33M7 28H33"/></g></svg></div>
      <div class="slv__p2"><span class="mono">${s.year}</span><span class="mono">&times; &times; &times; &times;</span></div>
      <div class="slv__p3">
        <span class="mono slv__fr">0${i + 1}<br>03</span>
        <span class="slv__plus">${'+'.repeat(12)}</span>
        <i class="slv__dot"></i>
        <span class="slv__mk">${word('RF', { w: 1.4, track: 1 })}</span>
      </div>
    </article>`;
  el.innerHTML = `
    <h2 class="sr">Printed sleeve showroom</h2>
    <p class="slv-tl mono">Sleeves / Print and packaging</p>
    <div class="slv-stack">${sleeves.map(piece).join('')}<div class="slv-plastic" aria-hidden="true"></div></div>
    <p class="slv-br mono">Sample sleeve <span data-n>01</span> of 0${sleeves.length}</p>`;
  const stack = el.querySelector('.slv-stack');
  const pieces = [...el.querySelectorAll('.slv')];
  const n = el.querySelector('[data-n]');
  const plastic = el.querySelector('.slv-plastic');
  const t = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    t.x = (e.clientX / innerWidth - 0.5) * 2;
    t.y = (e.clientY / innerHeight - 0.5) * 2;
  });
  let shown = -1;
  return {
    id: 'sleeve',
    el,
    dur: 150,
    stops: [0, 0.5, 1],
    hold: 0.55,
    wipe: 'ticket',
    pure: true,
    hud: 'bone',
    update(p) {
      const cur = p * (sleeves.length - 1);
      pieces.forEach((piece2, i) => {
        const d = i - cur;
        piece2.style.transform = `translate3d(${d * 108}%, ${Math.abs(d) * 4}%, 0) rotate(${d * 7}deg)`;
        piece2.style.opacity = Math.abs(d) > 1.2 ? 0 : 1;
      });
      const near = Math.round(cur);
      if (near !== shown) {
        shown = near;
        n.textContent = `0${near + 1}`;
      }
    },
    tick() {
      if (ctx.reduced) return;
      t.sx += (t.x - t.sx) * 0.07;
      t.sy += (t.y - t.sy) * 0.07;
      stack.style.transform = `perspective(1400px) rotateY(${(t.sx * 7).toFixed(2)}deg) rotateX(${(t.sy * -5).toFixed(2)}deg)`;
      plastic.style.setProperty('--sx', `${50 + t.sx * 34}%`);
      plastic.style.setProperty('--sy', `${50 + t.sy * 34}%`);
    },
  };
}

/* ---------- Freight: stacked wagons that roll past each other, liveried in type ---------- */
export function freight(ctx) {
  const el = document.getElementById('freight');
  const bogie = () => `<svg class="fw-bogie" viewBox="0 0 220 46" aria-hidden="true"><path d="M6 8H214" stroke="currentColor" stroke-width="3" fill="none"/><g class="fw-wheel" style="transform-origin:56px 28px"><circle cx="56" cy="28" r="17"/><path d="M56 12V44M40 28H72"/></g><g class="fw-wheel" style="transform-origin:164px 28px"><circle cx="164" cy="28" r="17"/><path d="M164 12V44M148 28H180"/></g><rect x="92" y="12" width="36" height="16" fill="none" stroke="#e5121e" stroke-width="3"/></svg>`;
  const wagon = (w, i) => `
    <div class="fw fw--${w.color}" data-i="${i}">
      <div class="fw-body">
        <div class="fw-panel fw-id"><b class="fw-sign">${word('RFG', { w: 1.6, track: 1.2 })}</b><span class="fw-tag"><span>${i + 12}</span><b>/ ${w.tag}</b></span><span class="fw-no mono">${w.no[0]}</span></div>
        <div class="fw-panel fw-door fw-door--${i}"><i></i><span class="fw-no mono">${w.no[1]}</span></div>
        <div class="fw-panel fw-tech"><span class="fw-word">${w.word}</span><b class="fw-mark">${w.mark}</b><b class="fw-mid">${w.mid}</b><span class="fw-chip">${w.chip}</span><span class="fw-no mono">${w.no[2]}</span></div>
        <div class="fw-panel fw-big"><b>${w.big}</b><span class="mono">${w.sub} / sample livery</span><span class="fw-no mono">${w.no[3]}</span><span class="fw-no fw-no2 mono">${w.no[4]}</span></div>
      </div>
      <div class="fw-under">${bogie()}${bogie()}</div>
    </div>`;
  el.innerHTML = `<h2 class="sr">Typographic freight wagons</h2><div class="fw-yard">${wagons.map(wagon).join('')}</div>`;
  const rows = [...el.querySelectorAll('.fw')];
  return {
    id: 'freight',
    el,
    dur: 170,
    stops: [0.1, 0.9],
    hold: 0.3,
    wipe: 'train',
    wipeSec: 2,
    pure: true,
    hud: 'bone',
    update(p, raw) {
      rows.forEach((row, i) => {
        const dir = i % 2 ? 1 : -1;
        row.style.transform = `translate3d(${dir * lerp(16, -16, raw)}vw,0,0)`;
      });
      el.style.setProperty('--roll', `${(raw * 1600).toFixed(1)}deg`);
    },
  };
}

/* ---------- Margin: four tall strips on concrete, with construction lines that draw on ---------- */
export function margin(ctx) {
  const el = document.getElementById('margin');
  el.innerHTML = `
    <div class="mg-frame">
      <p class="mg-side mg-side--l mono">Poster / Category: Structural Brutalism &nbsp;&nbsp; Series no: [002-056]</p>
      <p class="mg-side mg-side--r mono">Core theme: Information Architecture</p>
      <div class="mg-wall" style="background-image:url('photos/concrete.jpg')">
        <article class="mg-strip mg-a" style="--d:0"><span class="mg-word">margin</span><i class="mg-a__tab"></i><i class="mg-a__foot"></i></article>
        <article class="mg-strip mg-b" style="--d:1"><img data-src="photos/ph-09.jpg" alt="" draggable="false"><i class="mg-b__circle"></i><p class="mono">Editorial. A sample series on how much a page can say by leaving room.</p></article>
        <article class="mg-strip mg-c" style="--d:2">
          <svg viewBox="0 0 120 700" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#e5121e" stroke-width=".7" class="mg-guides"><path pathLength="1" d="M14 14V686"/><path pathLength="1" d="M106 14V686"/><path pathLength="1" d="M60 14V686"/><path pathLength="1" d="M14 14H106"/><path pathLength="1" d="M14 136H106"/><path pathLength="1" d="M14 250H106"/><path pathLength="1" d="M14 320H106"/><path pathLength="1" d="M14 440H106"/><path pathLength="1" d="M14 686H106"/></g></svg>
          <h3 style="top:21%">Margins</h3><p style="top:25%">The space around the work decides how loud the work is. Start here, then set everything else.</p>
          <i class="mg-c__dot"></i>
          <h3 style="top:65%">Typography</h3><p style="top:69%">One family, two weights and a strict grid. The rest is deciding what to leave out.</p>
          <span class="mg-c__bars"><i></i><i></i></span>
        </article>
        <article class="mg-strip mg-d" style="--d:3">
          <p class="mg-d__text">The strip is a poster that refuses to behave like one. It reads top to bottom, turns its copy on its side, and asks you to walk past it slowly.</p>
          <span class="mg-d__meta mono"><b>Refugio</b><b>2026</b><b>SL2026</b><b>Polymer</b></span>
          <i class="mg-d__a"></i><i class="mg-d__b"></i><i class="mg-d__c"></i>
          <div class="mg-d__code">${barcodeSVG('MARGIN-04')}</div>
          <b class="mg-d__no">04</b>
        </article>
      </div>
    </div>`;
  const guides = [...el.querySelectorAll('.mg-guides path')];
  guides.forEach((g) => (g.style.strokeDasharray = '1 1'));
  return {
    id: 'margin',
    el,
    dur: 140,
    stops: [0.15, 0.85],
    hold: 0.4,
    wipe: 'strips',
    pure: true,
    hud: 'bone',
    update(p, raw) {
      el.style.setProperty('--rise', raw.toFixed(4));
      guides.forEach((g, i) => (g.style.strokeDashoffset = Math.max(0, 1 - raw * 2.4 + i * 0.05)));
    },
  };
}

/* ---------- Planner: twelve stationery sheets, doubling as how a project actually runs ---------- */
const sheetBody = (s) => {
  switch (s.kind) {
    case 'review':
      return `<span class="sh-stars">&#9734; &#9734; &#9734; &#9734; &#9734;</span><span class="sh-checks">${['Brand', 'Print', 'Motion', 'Web', 'Photo', 'Type', 'Pack', 'Etc'].map((t) => `<i>${t}</i>`).join('')}</span><span class="sh-rule">Title:</span><span class="sh-fill"></span>`;
    case 'lines':
      return `<span class="sh-rule">Goal:</span><span class="sh-rule sh-gap">Key point:</span><span class="sh-fill sh-lines"></span>`;
    case 'grid':
      return `<span class="sh-days">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<i>${d}</i>`).join('')}</span><span class="sh-fill sh-graph"></span>`;
    case 'check':
      return `<span class="sh-fill sh-checklist"></span>`;
    case 'table':
      return `<span class="sh-fill sh-table"></span>`;
    case 'route':
      return `<svg class="sh-route" viewBox="0 0 100 42" aria-hidden="true"><path d="M6 8H82C96 8 96 24 82 24H20C6 24 6 38 20 38H92" fill="none" stroke="currentColor" stroke-width=".7"/><path d="M4 5 9 8 4 11ZM90 35 95 38 90 41Z" fill="currentColor"/></svg><span class="sh-fill sh-graph"></span>`;
    case 'month':
      return `<span class="sh-fill sh-month"></span>`;
    case 'week':
      return `<span class="sh-fill sh-table sh-table--w"></span>`;
    case 'day':
      return `<span class="sh-fill sh-day"></span>`;
    case 'memo':
      return `<span class="sh-fill sh-memo"><i></i><i></i><i></i><i></i></span>`;
    default:
      return `<span class="sh-fill sh-record"><i></i><i></i><i></i></span>`;
  }
};

export function planner(ctx) {
  const el = document.getElementById('planner');
  el.innerHTML = `
    <header class="pl-head"><h2>How a project runs</h2><p class="mono">Twelve working sheets, in order. Sample stationery system.</p></header>
    <div class="pl-grid">
      ${sheets
        .map(
          (s, i) => `<figure class="pl-item" style="--i:${i}">
            <div class="pl-sheet" style="--tint:${s.tint};--sink:${s.ink}"><h3>MY <span>${s.name.toLowerCase()}</span></h3>${sheetBody(s)}</div>
            <figcaption>${s.n}. ${s.name}</figcaption>
          </figure>`,
        )
        .join('')}
    </div>`;
  const items = [...el.querySelectorAll('.pl-item')];
  return {
    id: 'planner',
    el,
    dur: 130,
    stops: [0.12, 0.88],
    hold: 0.4,
    wipe: 'sheets',
    pure: true,
    hud: 'bone',
    update(p) {
      // A ripple of attention moves across the sheets, one after another
      items.forEach((item, i) => {
        const pos = p * (items.length - 1);
        const k = Math.max(0, 1 - Math.abs(i - pos) / 2.2);
        item.style.setProperty('--lift', k.toFixed(3));
      });
    },
  };
}
