// Reference: the sliced specimen panels. The name runs across paper panels in the stroke
// alphabet, and its weight changes with each vehicle: heavy for road, hairline for air.
// Vehicles leave along their own nose and the next arrives from behind, so the hero plays
// like a road: car, then plane, then ship.
import gsap from 'gsap';
import { site, units } from '../content.js';
import { glyphD } from '../vector/glyphs.js';
import { stripePaths, blendChains, clamp, easeIO, launch, seg, lerp } from '../vector/lines.js';

// Stripe routes per unit: three cubic segments each, in a 1600 x 900 space.
const ROUTES = [
  [[-60, 655], [300, 655], [560, 655], [780, 655], [925, 655], [962, 600], [962, 460], [962, 300], [962, 120], [962, -70]],
  [[-60, 890], [250, 860], [500, 780], [760, 640], [980, 520], [1180, 370], [1360, 220], [1450, 145], [1530, 70], [1660, -50]],
  [[-60, 690], [140, 600], [330, 600], [530, 690], [730, 780], [930, 780], [1130, 690], [1300, 610], [1480, 610], [1660, 680]],
];

export function hero(ctx) {
  const el = document.getElementById('departure');
  const letters = [...site.name];
  el.innerHTML = `
    <div class="panels" style="--n:${letters.length}">
      ${letters
        .map(
          (c, i) => `<div class="panel" style="z-index:${i + 1}">
            <span class="panel__tiny">${c}</span>
            <svg class="panel__glyph" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linejoin="miter" stroke-miterlimit="2" pathLength="1"/></svg>
          </div>`,
        )
        .join('')}
    </div>
    <h1 class="sr">${site.name}: ${site.line}</h1>
    <svg class="hero-stripes" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path class="s1" pathLength="1"/><path class="s2" pathLength="1"/><path class="s3" pathLength="1"/>
    </svg>
    <div class="hero-side mono">
      <span>&rarr; PORTFOLIO ${site.year}</span><span>&rarr; ${units.map((u) => u.discipline.toUpperCase()).join(' / ')}</span>
    </div>
    <div class="view" data-view="hero"></div>
    <div class="hero-foot">
      <p class="hero-line">${site.line}</p>
    </div>
    <nav class="hero-bar" aria-label="Portfolio sections">
      ${units
        .map(
          (u, i) => `<button class="hero-bar__item ${i === 0 ? 'is-on' : ''}" style="--c:${u.color};--ci:${u.colorInk}" data-i="${i}" data-go="${u.scene}">
            <b>${i + 1}</b><span>${u.discipline}</span><i>${u.label}</i>
          </button>`,
        )
        .join('')}
      <span class="hero-bar__hint">Scroll to depart <em>&darr;</em></span>
    </nav>`;

  const panels = [...el.querySelectorAll('.panel')];
  const svgs = [...el.querySelectorAll('.panel__glyph')];
  const paths = svgs.map((s) => s.firstElementChild);
  const stripes = [...el.querySelectorAll('.hero-stripes path')];
  const bar = [...el.querySelectorAll('.hero-bar__item')];
  const view = ctx.stage.addView({
    el: el.querySelector('.view'),
    model: units[0].model,
    panY: -0.02,
    zoom: 1.12,
    parallax: 0.1,
    cruise: 3.4,
    velGain: 0.55,
    pointerGain: 1,
    envOpacity: 0.3,
    trail: { skid: 0, contrail: 0.75, wake: 0.7 },
  });

  // On a phone, recentre the artwork so the vertical stripe does not cover the last letter.
  const stripeArt = el.querySelector('.hero-stripes');
  const frameStripes = () => stripeArt.setAttribute('viewBox', innerWidth < 820 ? '115 0 1600 900' : '0 0 1600 900');
  frameStripes();
  addEventListener('resize', frameStripes);

  const route = { a: 0, b: 0, t: 0 };
  function drawStripes() {
    const d = stripePaths(blendChains(ROUTES[route.a], ROUTES[route.b], route.t), 25);
    stripes.forEach((s, i) => s.setAttribute('d', d[i]));
  }

  const weight = { v: units[0].weight };
  const setWeight = () => paths.forEach((p) => p.setAttribute('stroke-width', weight.v));

  function layout() {
    const pw = innerWidth / letters.length;
    const gw = pw * 1.14;
    const target = innerHeight * (innerWidth < 800 ? 0.46 : 0.5);
    const H = clamp((target / gw) * 5.6 - 1.6, 6, 30);
    svgs.forEach((s, i) => {
      s.setAttribute('viewBox', `-.8 -.8 5.6 ${H + 1.6}`);
      s.style.width = `${gw}px`;
      s.style.height = `${(gw * (H + 1.6)) / 5.6}px`;
      paths[i].setAttribute('d', glyphD(letters[i], H));
    });
  }
  layout();
  addEventListener('resize', layout);
  setWeight();
  drawStripes();

  let unit = 0;
  let hover = null;
  let scrollUnit = 0;
  function setUnit(i) {
    if (i === unit) return;
    unit = i;
    const u = units[i];
    if (ctx.reduced) view.model = u.model;
    else ctx.stage.swap(view, u.model);
    gsap.to(weight, { v: u.weight, duration: 0.9, ease: 'power3.inOut', onUpdate: setWeight });
    route.a = route.t > 0.5 ? route.b : route.a;
    route.b = i;
    route.t = 0;
    gsap.killTweensOf(route, 't');
    gsap.to(route, { t: 1, duration: 1.1, ease: 'power3.inOut', onUpdate: drawStripes });
    // The panels ripple outward as the vehicle changes, with no two moving alike
    gsap.fromTo(panels, { y: 0 }, { y: (n) => (n % 2 ? 22 : -22), duration: 0.42, ease: 'power2.out', yoyo: true, repeat: 1, stagger: { each: 0.03, from: 'center' } });
    bar.forEach((b, n) => b.classList.toggle('is-on', n === i));
  }
  bar.forEach((b, i) => {
    b.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      hover = i;
      setUnit(i);
    });
    b.addEventListener('pointerleave', () => {
      hover = null;
      setUnit(scrollUnit);
    });
  });

  // Each panel thins toward a hairline under the pointer
  panels.forEach((panel, i) => {
    panel.addEventListener('pointerenter', () => gsap.to(paths[i], { attr: { 'stroke-width': Math.max(0.16, weight.v * 0.2) }, duration: 0.4, ease: 'power2.out' }));
    panel.addEventListener('pointerleave', () => gsap.to(paths[i], { attr: { 'stroke-width': weight.v }, duration: 0.6, ease: 'power2.out' }));
  });

  let played = false;
  function intro() {
    if (played) return;
    played = true;
    if (ctx.reduced) return;
    view.plot = 0;
    view.slide = -2.6;
    view.kick = 0.7;
    view.boost = 30;
    gsap.set(paths, { attr: { 'stroke-width': 0.12 }, strokeDasharray: '1 1', strokeDashoffset: 1 });
    gsap.set(stripes, { strokeDasharray: '1 1', strokeDashoffset: 1 });
    const tl = gsap.timeline({
      paused: true,
      onComplete() {
        gsap.set(paths, { clearProps: 'strokeDasharray,strokeDashoffset' });
        gsap.set(stripes, { clearProps: 'strokeDasharray,strokeDashoffset' });
      },
    });
    tl.from(panels, { yPercent: (i) => (i % 2 ? -100 : 100), duration: 1.1, ease: 'power4.inOut', stagger: 0.05 })
      .to(paths, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: 0.06 }, 0.35)
      .to(paths, { attr: { 'stroke-width': weight.v }, duration: 0.8, ease: 'power3.inOut', stagger: 0.04 }, 1.25)
      .to(stripes, { strokeDashoffset: 0, duration: 1.3, ease: 'power3.inOut', stagger: 0.08 }, 0.9)
      .to(view, { plot: 1, duration: 1.2, ease: 'power1.inOut' }, 1.0)
      .to(view, { slide: 0, duration: 1.5, ease: 'expo.out' }, 1.0)
      .to(view, { boost: 0, duration: 1.6, ease: 'power3.out' }, 1.0)
      .to(view, { kick: 0, duration: 1.7, ease: 'elastic.out(1, 0.55)' }, 1.1)
      .from('.hero-bar', { yPercent: 160, duration: 0.8, ease: 'power3.out' }, 1.3)
      .from('.hero-foot > *, .hero-side', { autoAlpha: 0, y: 12, duration: 0.6, stagger: 0.08 }, 1.5);
    (ctx.ready || Promise.resolve()).then(() => tl.play());
  }

  const chrome = [...el.querySelectorAll('.hero-foot, .hero-bar, .hero-side')];
  let shut = false;
  return {
    id: 'departure',
    el,
    dur: 240,
    stops: [0, 0.5, 1],
    hold: 0.62,
    hud: 'ink',
    seams: letters.length,
    views: [view],
    enter: intro,
    update(p, raw) {
      scrollUnit = p < 0.34 ? 0 : p < 0.68 ? 1 : 2;
      if (hover === null) setUnit(scrollUnit);
      const local = (raw * 3) % 1;
      view.yaw = -0.22 + local * 0.44;
      // A slow weave as you scroll: the car steers through it, the plane banks through it
      view.steerT = Math.sin(p * Math.PI * 6) * 0.3;
      view.bankT = view.swapTl?.isActive() ? view.bankT : Math.sin(p * Math.PI * 6) * 0.28;
      view.skid = clamp((view.speed - 9) / 14, 0, 1);
      if (shut) {
        shut = false;
        panels.forEach((panel) => {
          panel.style.translate = '';
          panel.style.rotate = '';
        });
        chrome.forEach((n) => (n.style.opacity = ''));
        stripes.forEach((s) => {
          s.style.strokeDasharray = '';
          s.style.strokeDashoffset = '';
        });
        setWeight();
      }
    },
    // Score lines cut the paper first. Letters thin out, then the panels part in
    // alternating directions as the vehicle powers away.
    shutter(q) {
      shut = true;
      const hair = lerp(weight.v, 0.14, seg(q, 0, 0.3));
      paths.forEach((p) => p.setAttribute('stroke-width', hair));
      panels.forEach((panel, i) => {
        const d = (Math.abs(i - (panels.length - 1) / 2) / panels.length) * 0.5;
        const t = easeIO(seg(q, 0.12 + d, 0.62 + d));
        const dir = i % 2 ? -1 : 1;
        panel.style.translate = `0 ${dir * t * 112}%`;
        panel.style.rotate = `${dir * t * 2.4}deg`;
      });
      chrome.forEach((n) => (n.style.opacity = 1 - seg(q, 0, 0.22)));
      stripes.forEach((s, i) => {
        s.style.strokeDasharray = '1 1';
        s.style.strokeDashoffset = `${-easeIO(seg(q, i * 0.04, 0.44 + i * 0.04))}`;
      });
      view.fxSlide = launch(seg(q, 0, 0.62)) * 2.6;
      view.fxBoost = 40 * seg(q, 0, 0.5);
      view.skid = 1;
    },
  };
}
