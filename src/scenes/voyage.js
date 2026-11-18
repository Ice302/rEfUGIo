// The cruise ship on its own: floating, under way, filmed on a dolly from stern to bow.
import { units } from '../content.js';
import { Voyage } from '../stage/voyage.js';
import { easeOut, seg } from '../vector/lines.js';

const STAGES = [
  ['Stern', 'Where a build leaves its wake: launch, hand-over and the steady work after.'],
  ['Midships', 'Twelve decks, one vessel. Every level simple on its own, stable as a whole.'],
  ['Bow', 'The first thing anyone sees. It has to hold its line through every first load.'],
];

export function voyage(ctx) {
  const el = document.getElementById('voyage');
  const u = units[2];
  el.innerHTML = `
    <canvas class="voyage__canvas" aria-hidden="true"></canvas>
    <p class="voyage__tl mono">${u.code} / Sea unit / Dolly shot</p>
    <div class="voyage__head">
      <h2>Under<br>Way</h2>
      <p class="voyage__stage">
        <b class="mono" data-stage-name>${STAGES[0][0]}</b>
        <span data-stage-text>${STAGES[0][1]}</span>
      </p>
    </div>`;
  const canvas = el.querySelector('canvas');
  const name = el.querySelector('[data-stage-name]');
  const text = el.querySelector('[data-stage-text]');
  const head = el.querySelector('.voyage__head');
  let film = null;
  let p = 0;
  let current = 0;
  const tm = { model: 'ship', speed: 4, attRoll: 0, travel: 0 };

  return {
    id: 'voyage',
    el,
    dur: 210,
    stops: [0.04, 0.5, 0.96],
    hold: 0.5,
    wipe: 'tide',
    wipeLen: 120,
    wipeSec: 2,
    hud: 'ink',
    tm,
    pure: true,
    // Runs while the section before this one is at rest. A new canvas takes a moment, and
    // that pause would otherwise land in the middle of the tide transition.
    prepare() {
      if (film) return;
      film = new Voyage(canvas, ctx.stage);
      ctx.stage.ready.then(() => film.render(0, 0, 0));
    },
    enter() {
      if (!film && !ctx.reduced) film = new Voyage(canvas, ctx.stage);
      if (ctx.reduced && !film) {
        film = new Voyage(canvas, ctx.stage);
        // The ship may still be on its way, so this waits for it.
        ctx.stage.ready.then(() => film.render(0.016, 0.5, 0));
      }
    },
    update(staged) {
      p = staged;
      const i = staged < 0.27 ? 0 : staged < 0.73 ? 1 : 2;
      if (i !== current) {
        current = i;
        name.textContent = STAGES[i][0];
        text.textContent = STAGES[i][1];
      }
    },
    wipeIn(t) {
      head.style.translate = `0 ${(1 - easeOut(seg(t, 0.3, 1))) * 30}vh`;
    },
    tick(dt) {
      head.style.translate = this.el.classList.contains('is-on') && ctx.current() === this && document.body.classList.contains('is-wiping') ? head.style.translate : '';
      film?.render(dt, p, ctx.stage.vel);
      if (film) {
        tm.speed = film.view.speed;
        tm.attRoll = film.view.attRoll;
        tm.travel = film.travel * 40;
      }
    },
  };
}
