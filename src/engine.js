// The page is a stack of full-screen scenes on one long scroll. Scroll position maps to
// either "scene N at progress p" or "wipe between N and N+1 at progress q". Only the
// visible scene is shown, which is what lets a transition truly cover the screen before
// the next section appears, rather than two sections sliding past each other.
//
// Three things keep the pacing natural without touching how scrolling itself feels:
//   Playhead  What you see follows the scroll position with a speed that eases up and down,
//             never jumps, and never goes above a limit. A wipe can never play faster than
//             its `wipeSec`, however hard the wheel is flicked.
//   Stops     A scene can list `stops`. Its progress slows right down around each one, so
//             the picture lingers on each stage, but it never freezes while you scroll.
//   Settle    When scrolling ends between stops or inside a wipe, the page eases on to the
//             nearest stage. Any new input cancels that immediately.
//
// Scene hooks, all optional:
//   update(p, raw) staged progress through the scene, plus the raw value
//   wipeOut(t)     0 to 1 while the wipe closes over this scene
//   wipeIn(t)      0 to 1 while the wipe opens onto this scene
//   transit(q, v)  a vehicle crossing the wipe itself, on the full-screen transit view
import gsap from 'gsap';
import { easeIn, easeOut, seg } from './vector/lines.js';

const SCENE_RATE = 3.4; // viewport heights per second, at most
const DEFAULT_WIPE_SEC = 1.7;
const FOLLOW = 0.07; // seconds: how closely the playhead follows the scroll
const ACCEL = 34; // viewport heights per second, per second: how quickly it changes speed
const LEAK = 0.22; // share of scrolling that still moves the picture while it lingers on a stop

const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

// Slow around each stop, with a smooth ramp between them. Part of every scroll still gets
// through (LEAK), so the picture never stops dead under a moving finger.
export function stagedMap(p, stops, hold = 0.5) {
  if (!stops?.length) return p;
  if (p <= stops[0] || p >= stops[stops.length - 1]) return p <= stops[0] ? (stops[0] > 0 ? p : stops[0]) : p;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (p >= a && p <= b) {
      const w = (hold * (b - a)) / 2;
      const staged = a + (b - a) * smooth((p - (a + w)) / (b - a - 2 * w));
      return staged + (p - staged) * LEAK;
    }
  }
  return p;
}

export function createEngine({ scenes, layer, lenis, stage, transitView, onChange, onProgress, onStage }) {
  const segs = [];
  let total = 0;
  const spacer = document.getElementById('spacer');
  let current = null;
  let manual = null;
  let wiping = false;
  let lastRaw = 0;
  let dir = 1;
  let lastInput = 0;
  let holdGlide = false;
  let vy = 0;
  let vv = 0;

  ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'].forEach((type) =>
    addEventListener(type, () => (lastInput = performance.now()), { passive: true }),
  );

  function layout() {
    const ratio = total ? vy / total : 0;
    segs.length = 0;
    const vh = innerHeight;
    let y = 0;
    scenes.forEach((scene, i) => {
      const extra = scene.overflow ? scene.overflow() : 0;
      const dur = (scene.dur / 100) * vh + extra;
      scene.start = y;
      scene.end = y + dur;
      segs.push({ type: 'scene', scene, start: y, end: y + dur });
      y += dur;
      const next = scenes[i + 1];
      if (next) {
        const len = ((next.wipeLen ?? 110) / 100) * vh;
        segs.push({ type: 'wipe', from: scene, to: next, name: next.wipe, dom: next.domWipe, start: y, end: y + len, minSec: next.wipeSec ?? DEFAULT_WIPE_SEC });
        y += len;
      }
    });
    total = y;
    vy = ratio * total;
    spacer.style.height = `${Math.ceil(total + vh)}px`;
  }

  const segAt = (y) => segs.find((g) => y < g.end) || segs[segs.length - 1];

  const shown = new Set();
  function show(list) {
    scenes.forEach((s) => {
      const on = list.includes(s);
      if (on !== shown.has(s)) {
        s.el.classList.toggle('is-on', on);
        on ? shown.add(s) : shown.delete(s);
        s.views?.forEach((v) => (v.active = on));
        if (on) s.enter?.();
        else s.leave?.();
      }
    });
  }

  function setCurrent(scene) {
    if (scene !== current) {
      current = scene;
      document.body.dataset.hud = scene.hud || 'ink';
      onChange?.(scene);
    }
  }

  const drift = (scene, vh) => {
    if (scene.drift !== vh) {
      scene.drift = vh;
      scene.el.style.transform = vh ? `translateY(${vh}vh)` : '';
    }
  };

  // --in and --out let each section's stylesheet choreograph its own entrance and exit.
  const setVars = (scene, inV, outV) => {
    if (scene.vIn !== inV) {
      scene.vIn = inV;
      scene.el.style.setProperty('--in', inV.toFixed(4));
    }
    if (scene.vOut !== outV) {
      scene.vOut = outV;
      scene.el.style.setProperty('--out', outV.toFixed(4));
    }
  };

  const setWiping = (on) => {
    if (on !== wiping) {
      wiping = on;
      document.body.classList.toggle('is-wiping', on);
    }
  };

  // Scenes marked `pure` only write to the page in update(), so an unchanged scroll position
  // can skip them entirely. That leaves the browser nothing to repaint.
  function drawScene(scene, p) {
    if (scene.pure && scene.lastP === p) return;
    scene.lastP = p;
    scene.update?.(stagedMap(p, scene.stopsNow, scene.hold), p);
  }

  function applyWipe(from, to, name, dom, q, fromP) {
    setWiping(true);
    transitView.active = false;
    const extra = { card: to.card, vel: lenis.velocity, accent: to.accent };
    if (dom) {
      show([from, to]);
      from.el.style.zIndex = 3;
      to.el.style.zIndex = 1;
      drawScene(from, fromP);
      drawScene(to, 0);
      dom(q);
      to.wipeIn?.(seg(q, 0.3, 1));
      setVars(to, easeOut(seg(q, 0.3, 1)), 0);
      drift(to, 0);
      setCurrent(q < 0.6 ? from : to);
      layer.draw('score', q, { seams: from.seams });
    } else {
      const closing = q < 0.5;
      const active = closing ? from : to;
      show([active]);
      from.el.style.zIndex = '';
      to.el.style.zIndex = '';
      if (closing) {
        const t = q / 0.5;
        drawScene(from, fromP);
        from.wipeOut?.(t);
        setVars(from, 1, easeIn(t));
        drift(from, -t * 4);
      } else {
        const t = (q - 0.5) / 0.5;
        drawScene(to, 0);
        to.wipeIn?.(t);
        setVars(to, easeOut(seg(t, 0.08, 1)), 0);
        drift(to, (1 - t) * 3);
      }
      setCurrent(active);
      to.transit?.(q, transitView);
      layer.draw(name, q, extra);
    }
  }

  // A flick across several sections plays one transition at full length, then lands.
  function travel(to, landing, follow) {
    const state = { q: 0 };
    manual = { from: current, to, name: to.wipe || 'stripes', state, jumped: false, landing, follow, fromP: current.lastP ?? 0 };
    gsap.to(state, {
      q: 1,
      duration: Math.max(1.5, to.wipeSec ?? DEFAULT_WIPE_SEC),
      ease: 'none',
      onComplete() {
        manual = null;
      },
    });
  }

  function advance(raw, dt) {
    const d = raw - vy;
    if (Math.abs(d) < 0.5 && Math.abs(vv) < 30) {
      vy = raw;
      vv = 0;
      return false;
    }
    const lo = Math.min(raw, vy);
    const hi = Math.max(raw, vy);
    const crossed = segs.filter((g) => g.type === 'wipe' && g.start >= lo && g.end <= hi).length;
    if (crossed >= 2 && current) {
      const s = segAt(raw);
      const to = s.type === 'scene' ? s.scene : s.to;
      if (to !== current) {
        vv = 0;
        travel(to, s.type === 'scene' ? raw : s.end, s.type !== 'scene');
        return true;
      }
    }
    const here = segAt(vy);
    const limit = here.type === 'wipe' ? (here.end - here.start) / here.minSec : SCENE_RATE * innerHeight;
    // Aim for a speed that closes the gap in about FOLLOW seconds, capped at the limit, and
    // change the actual speed toward it gradually. Starts and stops ease instead of snapping.
    const want = Math.max(-limit, Math.min(limit, d / FOLLOW));
    const step = ACCEL * innerHeight * dt;
    vv += Math.max(-step, Math.min(step, want - vv));
    let next = vy + vv * dt;
    // Never run past the scroll position.
    if ((raw - next) * d < 0) {
      next = raw;
      vv = 0;
    }
    // One step never crosses into the next segment, so a slow frame cannot skip a transition.
    if (d > 0) next = Math.min(next, here.end + 0.5);
    else next = Math.max(next, here.start - 0.5);
    vy = next;
    return false;
  }

  function update(raw, dt = 0.016) {
    stage.clearFx();
    if (raw !== lastRaw) dir = raw > lastRaw ? 1 : -1;
    lastRaw = raw;
    if (!manual && advance(raw, dt)) {
      /* travel() just began. It is drawn below. */
    }
    if (manual) {
      applyWipe(manual.from, manual.to, manual.name, null, manual.state.q, manual.fromP);
      if (!manual.jumped && manual.state.q >= 0.5) {
        manual.jumped = true;
        vy = manual.landing;
        vv = 0;
        if (manual.follow) lenis.scrollTo(manual.landing, { immediate: true, force: true });
      }
      return;
    }
    const s = segAt(vy);
    onProgress?.(Math.min(1, vy / (total || 1)));
    if (s.type === 'scene') {
      setWiping(false);
      transitView.active = false;
      show([s.scene]);
      s.scene.el.style.zIndex = '';
      drift(s.scene, 0);
      setVars(s.scene, 1, 0);
      setCurrent(s.scene);
      const p = Math.min(1, Math.max(0, (vy - s.start) / (s.end - s.start)));
      drawScene(s.scene, p);
      reportStop(s.scene, p);
      settle(s, raw);
    } else {
      const q = Math.min(1, Math.max(0, (vy - s.start) / (s.end - s.start)));
      applyWipe(s.from, s.to, s.name, s.dom, q, 1);
      glide(s, q, raw);
    }
    return s;
  }

  const quiet = (ms) => !holdGlide && !lenis.isScrolling && performance.now() - lastInput > ms;
  const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

  // Nobody should get stranded behind a half-closed wipe. If scrolling stops inside one,
  // finish the move in the direction the visitor was heading.
  function glide(s, q, raw) {
    if (!quiet(300) || q <= 0 || q >= 1 || Math.abs(raw - vy) > 1) return;
    const toEnd = dir > 0 ? q > 0.08 : q > 0.92;
    const target = toEnd ? s.end : s.start;
    if (Math.abs(target - raw) < 1) return;
    lenis.scrollTo(target, { duration: 0.5 + (0.9 * Math.abs(target - raw)) / (s.end - s.start), easing: (t) => 1 - Math.pow(1 - t, 3) });
  }

  // Rest on the nearest stage once scrolling has ended.
  function settle(s, raw) {
    const stops = s.scene.stopsNow;
    if (!stops?.length || !quiet(450) || Math.abs(raw - vy) > 1) return;
    const len = s.end - s.start;
    const p = (raw - s.start) / len;
    let best = stops[0];
    for (const c of stops) if (Math.abs(c - p) < Math.abs(best - p)) best = c;
    const target = s.start + best * len;
    if (Math.abs(target - raw) < 4) return;
    lenis.scrollTo(target, { duration: Math.min(1.4, 0.6 + (0.8 * Math.abs(target - raw)) / innerHeight), easing: ease });
  }

  let lastStop = '';
  function reportStop(scene, p) {
    const stops = scene.stopsNow;
    let text = '';
    if (stops?.length > 1) {
      let best = 0;
      stops.forEach((c, i) => {
        if (Math.abs(c - p) < Math.abs(stops[best] - p)) best = i;
      });
      text = `${best + 1}/${stops.length}`;
    }
    if (text !== lastStop) {
      lastStop = text;
      onStage?.(text);
    }
  }

  // Menu jumps play the destination's own wipe, with all of its choreography.
  function go(id, offset = 0) {
    const target = scenes.find((s) => s.id === id);
    if (!target || manual) return;
    if (current === target && !offset) return;
    const stop = target.stopsNow?.[0] ?? 0;
    const landing = offset ? target.start + offset : target.start + stop * (target.end - target.start);
    lenis.scrollTo(landing, { immediate: true, force: true });
    lastRaw = landing;
    travel(target, landing, false);
  }

  return {
    layout,
    update,
    go,
    next(delta) {
      const i = scenes.indexOf(current) + delta;
      if (scenes[i]) go(scenes[i].id);
    },
    // Step to the next stage inside a section, or on to the next section from the last one.
    stepStage(delta) {
      const stops = current?.stopsNow;
      if (stops?.length) {
        const p = current.lastP ?? 0;
        const ordered = delta > 0 ? stops : [...stops].reverse();
        const next = ordered.find((c) => (delta > 0 ? c > p + 0.02 : c < p - 0.02));
        if (next !== undefined) {
          this.scrollToProgress(current, next);
          return;
        }
      }
      this.next(delta);
    },
    scrollToProgress(scene, p) {
      lenis.scrollTo(scene.start + (scene.end - scene.start) * p, { duration: 1 });
    },
    // Debug: place the scroll and playhead together, skipping the rate limiter.
    seek(y) {
      lenis.scrollTo(y, { immediate: true, force: true });
      vy = y;
      vv = 0;
      lastRaw = y;
    },
    jumpTo(id) {
      const target = scenes.find((s) => s.id === id);
      if (!target) return;
      const y = target.start + (target.stopsNow?.[0] ?? 0) * (target.end - target.start);
      lenis.scrollTo(y, { immediate: true, force: true });
      vy = y;
      vv = 0;
      lastRaw = y;
    },
    get current() {
      return current;
    },
    get total() {
      return total;
    },
    get wiping() {
      return wiping;
    },
    get playhead() {
      return vy;
    },
    set holdGlide(v) {
      holdGlide = v;
    },
  };
}
