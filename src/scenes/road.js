// Reference: the motorsport poster. The car tears through the wipe dragging the racing
// stripes, comes back in from the top of the sheet painting the poster's stripes as it
// corners, and brakes hard onto the plinth. This poster is the cover for graphic design.
import { units, site } from '../content.js';
import { stripePaths, barcodeSVG, easeIO, seg, lerp, launch, landing, cruise } from '../vector/lines.js';
import { stripeHead } from '../vector/wipes.js';
import { pathPose, yawFor } from '../stage/paths.js';

const A = [[300, -60], [300, 120], [300, 240], [300, 330], [300, 470], [420, 560], [640, 610], [900, 668], [1300, 760], [1680, 830]];

export function road(ctx) {
  const el = document.getElementById('road');
  const u = units[0];
  el.innerHTML = `
    <svg class="poster-stripes" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <polygon class="plinth-b" points="420,700 1140,500 1660,720 1660,1000 900,1000"/>
      <polygon class="plinth" points="440,640 1090,450 1560,650 880,860"/>
      <g class="set-a"><path class="s1" pathLength="1"/><path class="s2" pathLength="1"/><path class="s3" pathLength="1"/></g>
      <g class="vec" fill="none">
        <path pathLength="1" d="M90 300H1510"/>
        <path pathLength="1" d="M1120 420 1500 590"/>
        <path pathLength="1" d="M210 780C210 690 280 650 370 650H620"/>
        <path pathLength="1" d="M1200 880C1320 880 1400 820 1500 720"/>
      </g>
      <g class="vec-dots"><circle cx="1500" cy="590" r="6"/><circle cx="620" cy="650" r="6"/><circle cx="1500" cy="720" r="6"/><circle cx="1510" cy="300" r="6"/></g>
    </svg>
    <header class="poster-head">
      <h2 class="poster-word">Graphic Design</h2>
      <div class="poster-box"><b>Road unit</b><i>sheet#01</i></div>
    </header>
    <div class="poster-num" aria-hidden="true">01</div>
    <p class="poster-sub">graphics</p>
    <div class="view" data-view="road"></div>
    <dl class="poster-spec">
      <dt>Disciplines</dt><dd>Identity systems<br>Poster series<br>Editorial and packaging</dd>
      <dt>Carried by</dt><dd>Group 5 race car</dd>
      <dt>Ink</dt><dd><b>3 spot colours</b></dd>
      <dt>Drive</dt><dd><b>Hand-set grids</b></dd>
    </dl>
    <p class="poster-vert mono">Curb weight &nbsp;<b>${u.table[1][1]}</b> &nbsp;/ &nbsp;2,260 lbs</p>
    <p class="poster-side mono">Motorsport Limited Edition Collection</p>
    <footer class="titleblock">
      <div class="tb-code">${barcodeSVG('REFUGIO-R01')}</div>
      <div><b>Road unit</b><span>935 K3, sheet 01 of 03</span></div>
      <div class="tb-wide"><b>${site.name} portfolio</b><span>Sample work shown until final projects are added</span></div>
      <div><b>${site.year}</b><span>edition</span></div>
    </footer>`;

  const view = ctx.stage.addView({
    el: el.querySelector('.view'),
    model: 'car',
    livery: 1,
    hatch: 0.5,
    parallax: 0.06,
    pointerGain: 1,
    velGain: 0.18,
    trail: { skid: 0, contrail: 0, wake: 0 },
  });
  const frame = () => {
    const phone = innerWidth < 820;
    view.zoom = phone ? 1 : 0.92;
    view.panX = phone ? 0 : 0.12;
    view.panY = phone ? -0.03 : -0.26;
  };
  frame();
  addEventListener('resize', frame);

  // On a phone, crop the 1600 x 900 artwork to the part around the car.
  const art = el.querySelector('.poster-stripes');
  const frameArt = () => art.setAttribute('viewBox', innerWidth < 820 ? '560 120 420 900' : '0 0 1600 900');
  frameArt();
  addEventListener('resize', frameArt);
  const setA = stripePaths(A, 25);
  el.querySelectorAll('.set-a path').forEach((p, i) => p.setAttribute('d', setA[i]));

  const painted = [...el.querySelectorAll('.set-a path')];
  const rules = [...el.querySelectorAll('.vec path')];
  [...painted, ...rules].forEach((p) => {
    p.style.strokeDasharray = '1 1';
  });
  const setDraw = (paint, rule) => {
    painted.forEach((p, i) => (p.style.strokeDashoffset = Math.max(0, 1 - paint * (1 + i * 0.03))));
    rules.forEach((p, i) => (p.style.strokeDashoffset = Math.max(0, 1 - rule * (1 + i * 0.05))));
  };

  let lastDrawn = -1;
  // The route back in: down from the top of the sheet, around the bend, onto the plinth.
  const endX = () => view.panX;
  const endY = () => view.panY;
  const arrive = () => [
    [-1.4, 0.62],
    [-1.08, 0.44],
    [-0.82, 0.24],
    [-0.56, 0.06],
    [-0.3, -0.08],
    [endX() - 0.32, endY() + 0.09],
    [endX(), endY()],
  ];

  return {
    id: 'road',
    el,
    dur: 130,
    stops: [0, 1],
    wipe: 'stripes',
    wipeLen: 140,
    wipeSec: 2.6,
    hud: 'ink',
    views: [view],
    update(p) {
      view.yaw = 0.18 - p * 0.96;
      view.pitch = 0.05 + p * 0.06;
      view.steerT = -p * 0.34;
      if (p === lastDrawn) return;
      lastDrawn = p;
      setDraw(1, 0.3 + easeIO(seg(p, 0, 0.5)) * 0.7);
      el.style.setProperty('--num', p);
    },
    // Phase one: the car leads the stripes across the whole screen, close to the camera.
    transit(q, tv) {
      if (q >= 0.5) return;
      const W = innerWidth;
      const H = innerHeight;
      const head = stripeHead(W, H, q);
      const k = seg(q, 0, 0.46);
      tv.model = 'car';
      tv.active = true;
      tv.livery = 1;
      tv.hatch = 0.5;
      tv.path = {
        x: (head.x / W) * 2 - 1,
        y: 1 - (head.y / H) * 2,
        yaw: yawFor(head.tx, -head.ty, 0.32),
        pitch: 0.32,
        zoom: lerp(1.55, 0.55, landing(k)),
      };
      tv.fxBoost = 38;
      tv.skid = 1;
      tv.fxSteer = Math.sin(k * Math.PI * 2) * 0.32;
      tv.hidden = k >= 1;
    },
    // Phase two: same car, now cornering in along the poster's stripes and braking to a stop.
    wipeIn(t) {
      lastDrawn = -1;
      const aspect = innerWidth / innerHeight;
      const k = cruise(t);
      const pose = pathPose(arrive(), k, aspect, { pitch: 0.3, zoom: lerp(0.55, view.zoom, k), slip: 0.5, blend: seg(t, 0.72, 1) });
      view.path = pose;
      view.fxBoost = (1 - t) * 34;
      view.fxSteer = pose.turn * 0.5;
      view.skid = Math.abs(pose.turn) > 0.08 ? 1 : 0.35 * (1 - t);
      setDraw(k, seg(t, 0.4, 1) * 0.3);
    },
    // Launch: full power off the plinth along the nose.
    wipeOut(t) {
      view.fxSlide = launch(t) * 2.8;
      view.fxBoost = t * 40;
      view.skid = 1;
    },
  };
}
