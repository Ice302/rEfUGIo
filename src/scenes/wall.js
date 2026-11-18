// Reference: tilted browser pages over a wall of heavy type. The wall breathes through
// the width axis of a variable font as you scroll, and the pages drift over it.
import { sites, units } from '../content.js';
import { lerp, seg } from '../vector/lines.js';

const host = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

export const mocks = {
  // A real project: its own screenshot in a plain browser frame.
  shot: (s) => `
    <div class="mock mock--shot">
      <nav><i></i><i></i><i></i><span>${host(s.url)}</span></nav>
      <div class="mock__img" style="background-image:url('${s.image}')"></div>
    </div>`,
  tidewater: (s) => `
    <div class="mock mock--tide">
      <div class="mock__img" style="background-image:url('${s.image}')"></div>
      <div class="mock__panel">
        <p class="mock__tag">Who we carry for</p>
        <ul><li>Bulk operators</li><li>Port authorities</li><li>Research vessels</li><li>Charter fleets</li><li class="on">Offshore energy</li></ul>
      </div>
    </div>`,
  'kilo-fifty': (s) => `
    <div class="mock mock--kilo">
      <nav><b>Kilo Fifty&deg;</b><span>Aero</span><span>Brakes</span><span>Wheels</span><span>Telemetry</span><em>Cart (2)</em></nav>
      <div class="mock__row">
        <div class="mock__img" style="background-image:url('${s.image}')"></div>
        <div class="mock__quote">
          <h5>&ldquo;Turn the part over before you buy it. Every part, every angle, in the browser.&rdquo;</h5>
          <div class="mock__stats"><p><b>+84%</b>Add to cart</p><p><b>-42%</b>Returns</p></div>
          <span class="mock__cta">Shop the catalogue</span>
        </div>
      </div>
    </div>`,
  altitude: (s) => `
    <div class="mock mock--alt">
      <nav><b>Altitude Archive</b><span>Routes</span><span>Journal</span><span>Maps</span></nav>
      <div class="mock__row">
        <div class="mock__img" style="background-image:url('${s.image}')"><h5>Routes worth<br>keeping</h5></div>
        <ul><li>Lisbon to Reykjavik</li><li>Dakar to Recife</li><li>Tokyo to Anchorage</li><li>Perth to Johannesburg</li><li>Santiago to Auckland</li></ul>
      </div>
    </div>`,
};

export const mockFor = (s) => (mocks[s.layout] ?? mocks.shot)(s);

export function wall(ctx) {
  const el = document.getElementById('wall');
  const words = Array.from({ length: innerWidth < 820 ? 14 : 7 }, (_, i) => (i % 2 ? 'WEBSITES' : 'SELECTED'));
  const u = units[2];
  el.innerHTML = `
    <div class="wall-type" aria-hidden="true">${words.map((w) => `<div class="wall-row"><span>${w}</span></div>`).join('')}</div>
    <h2 class="sr">Selected websites</h2>
    <p class="wall-tl mono">${u.code} / Sea unit</p>
    <p class="wall-tr mono">${sites.length} builds on deck</p>
    <div class="screens">
      ${sites
        .slice(0, 3)
        .map(
          (s, i) => `<button class="screen screen--${i}" data-case-site="${i}" data-cursor="Open" aria-label="Open ${s.name}, ${s.kind}">
            ${mockFor(s)}
            <span class="screen__tag mono">${s.name} / ${s.status}</span>
          </button>`,
        )
        .join('')}
    </div>`;
  const rows = [...el.querySelectorAll('.wall-row span')];
  const screens = [...el.querySelectorAll('.screen')];

  function fit() {
    rows.forEach((r) => {
      r.style.fontSize = '100px';
      r.style.fontVariationSettings = "'wdth' 68, 'wght' 900";
    });
    const w = rows[0].getBoundingClientRect().width || 1;
    const size = (100 * innerWidth * 0.965) / w;
    rows.forEach((r) => (r.style.fontSize = `${size}px`));
  }
  fit();
  addEventListener('resize', fit);
  document.fonts?.ready.then(fit);

  return {
    id: 'wall',
    el,
    dur: 190,
    stops: [0.1, 0.5, 0.9],
    hold: 0.4,
    wipe: 'iris',
    staticAt: 0.5,
    hud: 'diff',
    enter: fit,
    pure: true,
    update(p) {
      rows.forEach((r, i) => {
        const dir = i % 2 ? 1 : -1;
        const phase = Math.sin(p * Math.PI * 3 + i * 0.9);
        r.style.transform = `translate3d(${dir * lerp(-2.4, 2.4, p)}vw,0,0)`;
        r.style.fontVariationSettings = `'wdth' ${(65 + phase * 3).toFixed(1)}, 'wght' 900`;
      });
      const offs = [
        [lerp(6, -74, p), lerp(-5, 3, p), 15 - p * 8],
        [lerp(44, -38, p), lerp(5, -3, p), 12 + p * 3],
        [lerp(84, -2, p), lerp(-3, 5, p), 16 - p * 9],
      ];
      screens.forEach((s, i) => {
        const [y, x, r] = offs[i];
        s.style.setProperty('--y', `${y}vh`);
        s.style.setProperty('--x', `${x}vw`);
        s.style.setProperty('--r', `${r}deg`);
      });
    },
  };
}
