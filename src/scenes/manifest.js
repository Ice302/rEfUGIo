// Reference: the high-contrast serif deck with the stepped red block. Two sheets on one
// track, joined by a skyline that runs low under the contents page.
import gsap from 'gsap';
import { units } from '../content.js';
import { easeIO, seg, lerp } from '../vector/lines.js';

const SHEET_A = [0.44, 0.44, 0.44, 0.47, 0.47, 0.47, 0.5, 0.5, 0.48, 0.48, 0.6, 0.6, 0.44, 0.66, 0.38, 0.94];
const SHEET_B = [0.34, 0.2, 0.14, 0.14, 0.09, 0.09, 0.12, 0.12, 0.07, 0.07, 0.13, 0.13, 0.08, 0.08, 0.11, 0.05];
const NOTCH_A = { 1: 0.15, 2: 0.15, 9: 0.08, 12: 0.11 };

export function manifest(ctx) {
  const el = document.getElementById('manifest');
  const rows = [
    ['01', 'Graphic Design', 'Road unit, stamps and posters', 'road'],
    ['02', 'Photography', 'Air unit, frames from altitude', 'air'],
    ['03', 'Websites', 'Sea unit, builds and live sites', 'wall'],
  ];
  const rows2 = [
    ['04', 'Character Rooms', 'Three showpiece rooms', 'rooms'],
    ['05', 'Reel', 'Three finalists on tape', 'reel'],
    ['06', 'Boarding', 'Start a project', 'boarding'],
  ];
  const row = ([n, name, note, go]) => `<li><button data-go="${go}"><span class="mono">${note}</span><b class="mono">${n}</b><em>${name}</em></button></li>`;

  el.innerHTML = `
    <div class="track">
      <svg class="skyline" aria-hidden="true"><path class="c-r"/><path class="c-b"/><path class="c-y"/></svg>
      <article class="sheet-a">
        <div class="title-stack">
          <h2 class="didone"><span class="r1">Always</span><span class="kanji" lang="ja">移動中</span><span class="r2">In Transit</span></h2>
          <p class="vert mono">Three units<br>one line<br>no timetable</p>
        </div>
        <p class="statement">
          <span>I design for things that move:</span>
          <span>eyes across a poster,</span>
          <span>light across a sensor,</span>
          <span>people across a screen.</span>
        </p>
        <svg class="ellipses" viewBox="0 0 400 190" aria-hidden="true">
          <ellipse class="e0" cx="200" cy="30" rx="194" ry="26"/>
          <ellipse class="e1" cx="200" cy="72" rx="194" ry="26"/>
          <ellipse class="e1" cx="200" cy="114" rx="194" ry="26"/>
          <ellipse class="e1" cx="200" cy="156" rx="194" ry="26"/>
          <text x="200" y="35" class="t0">THREE VEHICLES, ONE PORTFOLIO</text>
          ${units.map((u, i) => `<text x="200" y="${77 + i * 42}" class="t1">${u.label.toUpperCase()} / ${u.discipline.toUpperCase()}</text>`).join('')}
        </svg>
        <p class="sheet-a__foot"><span class="mono">( Studio introduction ) handbook</span></p>
        <p class="sheet-a__foot2"><span class="mono">Introduction</span> <i class="didone-i">Handbook</i></p>
      </article>
      <article class="sheet-b" aria-label="Contents">
        <div class="contents-title">
          <h2 class="didone">Contents</h2>
          <p class="mono">Scroll on for the full line,<br>or board at any stop.</p>
        </div>
        <div class="contents-list">
          <div class="contents-group"><p class="mono contents-head">The work <i class="didone-i">Portfolio</i></p><ol>${rows.map(row).join('')}</ol></div>
          <div class="contents-group"><p class="mono contents-head">After the work <i class="didone-i">Terminal</i></p><ol>${rows2.map(row).join('')}</ol></div>
        </div>
      </article>
    </div>`;

  const track = el.querySelector('.track');
  const sky = el.querySelector('.skyline');
  const skyPath = sky.firstElementChild;
  const ell = el.querySelector('.ellipses');
  const state = { rise: 0, p: 0 };

  const skyPaths = [...sky.querySelectorAll('path')];
  // Red carries most of the skyline, with blue and yellow blocks set into it.
  const colorOf = (i) => (i % 7 === 3 || i % 11 === 8 ? 1 : i % 9 === 6 || i % 13 === 11 ? 2 : 0);
  function drawSky() {
    const W = innerWidth * 2;
    const H = innerHeight;
    sky.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const heights = [...SHEET_A, ...SHEET_B];
    const bw = W / heights.length;
    const d = ['', '', ''];
    heights.forEach((h, i) => {
      const lift = state.rise * (0.84 + 0.16 * seg(state.p, 0, 0.3)) * (innerWidth < 820 ? 0.56 : 1);
      const y = H - h * H * lift;
      const x = i * bw;
      const notch = NOTCH_A[i] ? H - NOTCH_A[i] * H * state.rise : H;
      d[colorOf(i)] += `M${x} ${notch}L${x} ${y}L${x + bw + 0.5} ${y}L${x + bw + 0.5} ${notch}Z`;
    });
    skyPaths.forEach((path, i) => path.setAttribute('d', d[i] || 'M0 0'));
  }
  addEventListener('resize', drawSky);

  let played = false;
  return {
    id: 'manifest',
    el,
    dur: 180,
    stops: [0.1, 0.92],
    hold: 0.4,
    hud: 'ink',
    domWipe: null,
    enter() {
      if (played) return;
      played = true;
      if (ctx.reduced) {
        state.rise = 1;
        drawSky();
        return;
      }
      gsap.to(state, { rise: 1, duration: 1.5, ease: 'power3.out', onUpdate: drawSky });
      gsap.from(el.querySelectorAll('.statement span'), { xPercent: -8, autoAlpha: 0, duration: 0.8, stagger: 0.09, delay: 0.25, ease: 'power3.out' });
      gsap.from(el.querySelectorAll('.didone > *'), { yPercent: 40, autoAlpha: 0, duration: 1, stagger: 0.12, ease: 'power3.out' });
      gsap.from(el.querySelectorAll('.ellipses ellipse'), { scale: 0.7, transformOrigin: 'center', autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.2 });
    },
    pure: true,
    update(p) {
      state.p = p;
      drawSky();
      const slide = easeIO(seg(p, 0.34, 0.72));
      track.style.transform = `translate3d(${-slide * 50}%,0,0)`;
      const k = el.querySelector('.kanji');
      k.style.transform = `translateX(${lerp(0, 6, seg(p, 0, 0.34))}%)`;
      ell.style.setProperty('--dash', p * -200);
    },
  };
}
