// Reference: the floating app card over an illustrated scene. A working project browser
// where the ship takes the place of the oversized object and breaks out of the card.
import gsap from 'gsap';
import { sites, site } from '../content.js';
import { word } from '../vector/glyphs.js';
import { easeOut, lerp, launch } from '../vector/lines.js';

const scribble = `<svg class="scribble" viewBox="0 0 160 90" aria-hidden="true"><path pathLength="1" d="M10 62C22 34 34 12 42 14 50 16 30 62 36 66 44 70 58 26 66 28 72 30 62 62 70 62 80 62 92 30 100 34 106 38 88 76 96 78 108 80 124 44 150 40M24 76C60 66 100 62 146 66" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

export function harbor(ctx) {
  const el = document.getElementById('harbor');
  el.innerHTML = `
    <div class="harbor-bg" style="background-image:url('photos/harbor.jpg')"></div>
    <div class="card">
      <div class="card__left">
        <div class="thumb">
          <img data-img alt="" decoding="async">
          <span class="chips"><b data-status></b><b data-kind></b></span>
        </div>
        <p class="thumb__name" data-name></p>
        <p class="thumb__date mono" data-date></p>
        <hr>
        <p class="mono thumb__head">Built with</p>
        <p class="techs" data-stack></p>
        <hr>
        <p class="thumb__text" data-text></p>
        <button class="btn btn--ghost" data-case>Read the case</button>
        <a class="btn" data-visit href="#">Visit the site</a>
      </div>
      <div class="card__right">
        <div class="card__tabs">
          <div class="seg" role="group" aria-label="Choose a build">
            ${sites.map((s, i) => `<button data-build="${i}" class="${i === 0 ? 'is-on' : ''}">${s.name}</button>`).join('')}
          </div>
          <button class="btn-mini" data-go="boarding">Start a project</button>
        </div>
        <p class="mono card__eye">Board a build</p>
        <h2 class="card__head" data-head></h2>
        <div class="card__mark">${word(site.name.slice(0, 3), { w: 1.3 })}<sup>${String(site.year).slice(-2)}</sup></div>
        ${scribble}
      </div>
    </div>
    <div class="view" data-view="harbor"></div>`;

  const q = (s) => el.querySelector(s);
  const view = ctx.stage.addView({
    el: q('.view'),
    model: 'ship',
    fill: '#f4f3ee',
    hatch: 0.45,
    yaw: 0.32,
    pitch: 0.02,
    zoom: 0.84,
    panX: 0.1,
    panY: -0.4,
    parallax: 0.08,
    pointerGain: 0.6,
    cruise: 1.6,
    velGain: 0.4,
    envOpacity: 0,
    trail: { skid: 0, contrail: 0, wake: 0.55 },
  });

  // On a phone the ship sits between the heading and the project details.
  const frameShip = () => {
    const phone = innerWidth < 820;
    view.panX = phone ? 0 : 0.1;
    view.panY = phone ? -0.02 : -0.4;
    view.zoom = phone ? 0.9 : 0.84;
  };
  frameShip();
  addEventListener('resize', frameShip);

  let active = -1;
  function pick(i) {
    if (i === active) return;
    const first = active === -1;
    active = i;
    const s = sites[i];
    q('[data-img]').src = s.image;
    q('[data-img]').alt = `${s.name} preview`;
    q('[data-status]').textContent = s.status;
    q('[data-kind]').textContent = s.kind;
    q('[data-name]').textContent = s.name;
    q('[data-date]').textContent = s.date;
    q('[data-stack]').innerHTML = s.stack.map((t) => `<span>${t}</span>`).join('');
    q('[data-text]').textContent = s.text;
    q('[data-case]').dataset.caseSite = i;
    q('[data-visit]').href = s.url;
    if (s.url !== '#') {
      q('[data-visit]').target = '_blank';
      q('[data-visit]').rel = 'noopener noreferrer';
    }
    q('[data-head]').innerHTML = s.head.map((l) => `<span class="ln"><span>${l}</span></span>`).join('');
    el.querySelectorAll('[data-build]').forEach((b, n) => b.classList.toggle('is-on', n === i));
    if (first || ctx.reduced) return;
    gsap.from(el.querySelectorAll('.card__head .ln > span'), { yPercent: 105, duration: 0.7, ease: 'power4.out', stagger: 0.07 });
    gsap.from('.thumb img', { scale: 1.2, duration: 0.8, ease: 'power3.out' });
    gsap.fromTo(view, { yaw: view.yaw + 0.7 }, { yaw: view.yaw, duration: 1.1, ease: 'power3.out' });
  }
  pick(0);
  el.querySelectorAll('[data-build]').forEach((b, i) => b.addEventListener('click', () => pick(i)));
  q('[data-visit]').addEventListener('click', (e) => {
    if (q('[data-visit]').getAttribute('href') === '#') e.preventDefault();
  });

  let played = false;
  return {
    id: 'harbor',
    el,
    dur: 110,
    stops: [0.2],
    wipe: 'horizon',
    wipeLen: 130,
    hud: 'ink',
    views: [view],
    enter() {
      if (played || ctx.reduced) return;
      played = true;
      view.plot = 0;
      gsap.to(view, { plot: 1, duration: 1.8, ease: 'power1.inOut' });
      gsap.fromTo('.scribble path', { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, delay: 0.5, ease: 'power1.inOut' });
    },
    pure: true,
    update(p) {
      view.pitch = 0.02 + p * 0.1;
      el.style.setProperty('--bg-y', `${p * -3}%`);
    },
    // The ship sails in from the left as the horizon opens, slowing onto its mark.
    wipeIn(t) {
      view.fxX = lerp(-1.9, 0, easeOut(t));
      view.fxY = (1 - easeOut(t)) * -0.22;
      view.fxBoost = (1 - t) * 24;
      view.fxBank = Math.sin(t * Math.PI * 3) * 0.05 * (1 - t);
      view.wake = 1;
    },
    // Departure: power up and sail out as the scanner crosses.
    wipeOut(t) {
      view.fxSlide = launch(t) * 2.6;
      view.fxBoost = t * 30;
      view.wake = 1;
    },
  };
}
