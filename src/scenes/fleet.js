// Reference: the industrial product sheet. Three spec sheets on one layout. The vehicle
// comes apart into an exploded view as you scroll, and a popup opens beside each named part,
// tied to it by a leader line that follows the part in real time.
import gsap from 'gsap';
import { units, site } from '../content.js';
import { launch, landing, seg } from '../vector/lines.js';

const arrow = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 34 33 7M12 7H33V28" fill="none" stroke="currentColor" stroke-width="4.6"/></svg>`;

export function fleetSheet(ctx) {
  const el = document.getElementById('fleet');
  const leaders = document.getElementById('leaders');
  // The popups live in their own layer above the 3D canvas, so a part never covers its label.
  // With motion off they sit in a plain list on the sheet instead.
  const layer = document.getElementById('popups');
  let pops = layer;
  el.innerHTML = `
    <div class="sheet">
      <aside class="sheet-rail">
        <span></span>
        <h2 class="sheet-rail__title">Fleet Overview</h2>
        <button class="sheet-rail__arrow" data-next aria-label="Next unit">${arrow}</button>
      </aside>
      <div class="sheet-left">
        <header class="sheet-band mono"><span data-b1></span><span data-b2>Units on the line: 03</span></header>
        <div class="sheet-title">
          <h3 data-title></h3>
          <p class="mono" data-intro></p>
        </div>
        <div class="sheet-boxes">
          ${[0, 1].map((i) => `<div class="sheet-box"><p class="mono" data-box-e="${i}"></p><h4 data-box-t="${i}"></h4><p class="sheet-box__body" data-box-b="${i}"></p></div>`).join('')}
        </div>
        <table class="spec">
          <thead><tr><th>Spec</th><th>Value</th><th>In the work</th></tr></thead>
          <tbody data-table></tbody>
        </table>
      </div>
      <div class="sheet-right">
        <header class="sheet-band mono"><span>${site.name} / Systems for image and screen</span><span data-serial></span></header>
        <p class="sheet-sub" data-sub></p>
        <p class="sheet-mono mono" data-mono></p>
        <div class="view" data-view="fleet"></div>
        <div class="callout-zone" data-callouts></div>
        <p class="sheet-foot" data-foot></p>
        <div class="unit-tabs" role="tablist" aria-label="Choose a unit">
          ${units.map((u, i) => `<button class="mono" role="tab" data-unit="${i}">${u.code}<span>${u.label}</span></button>`).join('')}
        </div>
      </div>
    </div>`;

  const q = (s) => el.querySelector(s);
  if (ctx.reduced) pops = q('[data-callouts]');
  const view = ctx.stage.addView({ el: q('.view'), model: units[0].model, zoom: 0.76, parallax: 0.06, hatch: 0.55, shade: 'hatch', hatchPx: 4, panY: -0.02, pointerGain: 0.5, cruise: 0, velGain: 0.32 });
  const tabs = [...el.querySelectorAll('[data-unit]')];
  let unit = -1;
  let paths = [];
  let labels = [];
  let current = units[0];
  let up = false;
  let open = 0;

  function fill(i) {
    const u = units[i];
    current = u;
    q('[data-b1]').textContent = `${u.code} / ${u.label} unit`;
    q('[data-title]').innerHTML = `<span class="ln"><span>${u.title[0]} <sup>&reg;</sup></span></span><span class="ln"><span>${u.title[1]}</span></span>`;
    q('[data-intro]').textContent = u.intro;
    u.boxes.forEach((b, n) => {
      q(`[data-box-e="${n}"]`).textContent = b.eyebrow;
      q(`[data-box-t="${n}"]`).textContent = b.title;
      q(`[data-box-b="${n}"]`).textContent = b.body;
    });
    q('[data-table]').innerHTML = u.table.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    q('[data-sub]').innerHTML = u.sub.join('<br>');
    q('[data-mono]').textContent = u.mono;
    q('[data-foot]').innerHTML = u.foot.join('<br>');
    q('[data-serial]').textContent = `Serial no. 00${i + 1}`;
    el.style.setProperty('--unit', u.color);
    el.style.setProperty('--unit-ink', u.colorInk);
    pops.innerHTML = u.callouts
      .map((c, n) => `<div class="callout" style="--n:${n}"><i class="mono">0${n + 1}</i><b class="mono">${c.label}</b><span class="mono">${c.note}</span></div>`)
      .join('');
    up = false;
    labels = [...pops.querySelectorAll('.callout')];
    leaders.innerHTML = u.callouts
      .map(() => `<g><path pathLength="1" class="lead"/><circle r="3" class="lead-dot"/></g>`)
      .join('');
    paths = [...leaders.querySelectorAll('g')];
    tabs.forEach((t, n) => t.classList.toggle('is-on', n === i));
  }

  function setUnit(i, animate = true) {
    if (i === unit) return;
    const first = unit === -1;
    unit = i;
    fill(i);
    ctx.stage.morph(view, units[i].model, first ? 0.01 : 1.05);
    if (ctx.reduced || !animate) return;
    gsap.from(el.querySelectorAll('.ln > span'), { yPercent: 105, duration: 0.8, ease: 'power4.out', stagger: 0.08 });
    gsap.from(el.querySelectorAll('[data-table] tr'), { autoAlpha: 0, x: -14, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.15 });
    gsap.from(el.querySelectorAll('.sheet-box > *'), { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.04, delay: 0.1 });

  }
  fill(0);
  unit = 0;

  const scene = {
    id: 'fleet',
    el,
    dur: 330,
    stops: [1 / 6, 0.5, 5 / 6],
    hold: 0.45,
    wipe: 'skyline',
    wipeLen: 130,
    hud: 'ink',
    views: [view],
    enter() {
      leaders.style.display = '';
      layer.style.display = '';
    },
    update(p, raw) {
      const i = Math.min(2, Math.floor(p * 3));
      setUnit(i);
      const u = raw * 3 - i;
      // open, hold, close: the exploded view peaks in the middle of each sheet
      open = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.08) / 0.84)));
      view.explode = open * open * 0.62;
      view.yaw = -0.28 + u * 0.56;
      view.zoom = 0.76 - open * 0.1;
      leaders.style.opacity = 1;
      layer.style.opacity = 1;
      // The popups open once the parts have pulled apart, and close before they rejoin.
      const want = ctx.reduced || open > (up ? 0.25 : 0.4);
      if (want !== up) {
        up = want;
        labels.forEach((l) => l.classList.toggle('is-up', up));
        leaders.classList.toggle('is-up', up);
      }
    },
    // Arrival: once the bars pull back, the car rolls in from behind and brakes onto the sheet.
    wipeIn(t) {
      const k = seg(t, 0.3, 1);
      view.hidden = k <= 0;
      view.fxSlide = -(1 - landing(k)) * 4.4;
      view.fxBoost = (1 - k) * 18;
      view.skid = (1 - k) * 0.6;
      leaders.style.opacity = seg(t, 0.8, 1);
      layer.style.opacity = leaders.style.opacity;
    },
    // Departure: away along the nose before the stripes close over the sheet.
    wipeOut(t) {
      view.fxSlide = launch(seg(t, 0, 0.9)) * 2.6;
      view.fxBoost = t * 34;
      view.skid = 1;
      view.wake = 1;
      leaders.style.opacity = 1 - seg(t, 0, 0.3);
      layer.style.opacity = leaders.style.opacity;
    },
    // Each popup sits beside its part, on the side its slot names, and is kept inside the
    // sheet and clear of the popups already placed.
    tick() {
      if (!view.rect || ctx.reduced) return;
      const box = q('[data-callouts]').getBoundingClientRect();
      if (!box.width) return;
      const placed = [];
      const phone = innerWidth < 820;
      const gap = phone ? 18 : Math.max(40, box.width * 0.05);
      labels.forEach((label, i) => {
        const c = current.callouts[i];
        const g = paths[i];
        if (!g) return;
        const a = ctx.stage.project(view, c.at, c.part);
        if (!a) return;
        const w = label.offsetWidth;
        const h = label.offsetHeight;
        const left = c.slot[1] === 'l';
        const lift = { t: -1.1, m: -0.5, b: 0.2 }[c.slot[0]] ?? -0.5;
        let x = left ? a.x - gap - w : a.x + gap;
        let y = a.y + h * lift - (open * 14 * (lift < 0 ? 1 : -1));
        x = Math.min(Math.max(x, box.left + 8), box.right - w - 8);
        y = Math.min(Math.max(y, box.top + 8), box.bottom - h - 8);
        for (const r of placed) {
          if (x < r.x + r.w + 6 && x + w + 6 > r.x && y < r.y + r.h + 6 && y + h + 6 > r.y) y = r.y + r.h + 8;
        }
        y = Math.min(y, box.bottom - h - 8);
        placed.push({ x, y, w, h });
        label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        const sx = x + (a.x < x + w / 2 ? 0 : w);
        const sy = y + Math.min(h - 6, Math.max(6, a.y - y));
        g.firstElementChild.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)}L${a.x.toFixed(1)} ${a.y.toFixed(1)}`);
        g.lastElementChild.setAttribute('cx', a.x.toFixed(1));
        g.lastElementChild.setAttribute('cy', a.y.toFixed(1));
      });
    },
    leave() {
      leaders.style.display = 'none';
      layer.style.display = 'none';
    },
  };

  tabs.forEach((t, i) => t.addEventListener('click', () => ctx.jump(scene, (i + 0.5) / 3)));
  q('[data-next]').addEventListener('click', () => {
    if (unit < 2) ctx.jump(scene, (unit + 1.5) / 3);
    else ctx.go('road');
  });
  return scene;
}
