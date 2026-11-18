import './fonts.css';
import './style.css';
import './rooms/rooms.css';
import gsap from 'gsap';
import Lenis from 'lenis';
import { Stage } from './stage/stage.js';
import { WipeLayer } from './vector/wipes.js';
import { Trails } from './vector/trails.js';
import { createEngine, stagedMap } from './engine.js';
import { buildHud, buildCase, buildTelemetry, buildRoute, buildGrain, runLoader } from './ui.js';
import { fleet } from './fleet.config.js';
import { hero } from './scenes/hero.js';
import { manifest } from './scenes/manifest.js';
import { fleetSheet } from './scenes/fleet.js';
import { road } from './scenes/road.js';
import { stamps } from './scenes/stamps.js';
import { air } from './scenes/air.js';
import { wall } from './scenes/wall.js';
import { voyage } from './scenes/voyage.js';
import { harbor } from './scenes/harbor.js';
import { wheel, sleeve, freight, margin, planner } from './scenes/showrooms.js';
import { lobbyScene } from './scenes/lobby.js';
import { reel } from './scenes/reel.js';
import { boarding } from './scenes/boarding.js';
import { createRooms } from './rooms/index.js';
import { sections } from './content.js';
import { applyText, inventory, wordsAt } from './text.js';

// Motion can be turned off by the system setting or by the switch in the header.
const readPref = () => {
  try {
    return localStorage.getItem('refugio-motion');
  } catch {
    return null;
  }
};
const writePref = (v) => {
  try {
    localStorage.setItem('refugio-motion', v);
  } catch {
    /* Storage can be blocked. The choice then lasts for this page only. */
  }
};
const pref = readPref();
const reduced = pref ? pref === 'off' : matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add(reduced ? 'static' : 'stack');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const stage = new Stage(document.getElementById('gl'), document.getElementById('scan'));
stage.calm = reduced;
const layer = new WipeLayer(document.getElementById('wipe'));
const lenis = reduced ? null : new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });

let engine;
const ctx = {
  stage,
  reduced,
  lenis,
  go: (id, offset) => engine?.go(id, offset),
  jump: (scene, p) => (engine ? engine.scrollToProgress(scene, p) : scene.update?.(p, p)),
  current: () => engine?.current,
};
ctx.ready = runLoader(ctx);
ctx.rooms = createRooms(ctx);

// The running order. Each section's header title, transition title card, phone browser bar
// colour and route map line are in content.json under `sections`, so the admin can edit them.
const ORDER = [hero, manifest, fleetSheet, road, stamps, wheel, sleeve, freight, margin, planner, air, wall, voyage, harbor, lobbyScene, reel, boarding];
const scenes = ORDER.map((make) => make(ctx));
scenes.forEach((s) => {
  const d = sections[s.id] ?? {};
  s.title = d.title ?? s.id;
  s.card = d.card ?? null;
  s.tone = d.tone ?? '#e7e3d7';
  s.line = d.line ?? 'Start';
});

const heroScene = scenes[0];
scenes[1].wipeLen = 130;
scenes[1].domWipe = (q) => heroScene.shutter(q);

const hud = buildHud(ctx);
const viewer = buildCase(ctx);
const telemetry = buildTelemetry(stage);
const routeMap = buildRoute(ctx, scenes);
const textRoots = () => [...scenes.map((s) => [s.el, s.id]), [document.getElementById('hud'), 'hud'], [document.getElementById('route'), 'route'], [document.getElementById('case'), 'case'], [document.getElementById('room-view'), 'rooms']];
textRoots().forEach(([root, scope]) => scope !== 'rooms' && applyText(root, scope));
buildGrain(reduced);
const trails = new Trails(stage, fleet);
const transitView = stage.addView({ el: document.getElementById('transit'), model: 'car', parallax: 0, trail: { skid: 0, contrail: 0, wake: 0 } });

// Sidebar width of the Fleet sheet, so the orange wipe lands exactly on it.
layer.opts.sidebar = () => {
  const rail = document.querySelector('.sheet-rail');
  const r = rail?.getBoundingClientRect();
  return r && innerWidth > 820 ? r.width : 0;
};

// Images load when their section is next up, so a real photo set stays quick.
const hydrate = (scene) => {
  scene?.el.querySelectorAll('img[data-src]').forEach((img) => {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  });
  scene?.el.querySelectorAll('image[data-href]').forEach((img) => {
    img.setAttribute('href', img.getAttribute('data-href'));
    img.removeAttribute('data-href');
  });
};

document.addEventListener('click', (e) => {
  const motion = e.target.closest('[data-motion]');
  if (motion) {
    writePref(reduced ? 'on' : 'off');
    location.reload();
    return;
  }
  const simple = e.target.closest('[data-simple]');
  if (simple) {
    e.preventDefault();
    writePref('off');
    location.hash = '';
    location.reload();
    return;
  }
  const b = e.target.closest('[data-go]');
  if (!b) return;
  e.preventDefault();
  const id = b.dataset.go;
  if (reduced) {
    document.getElementById(id)?.scrollIntoView();
    return;
  }
  const scene = scenes.find((s) => s.id === id);
  const off = +b.dataset.offset || 0;
  engine.go(id, off && scene ? (scene.end - scene.start) * off : 0);
});

if (reduced) {
  // No scroll-driven staging: every section sits in normal flow, fully visible.
  document.body.dataset.hud = 'diff';
  scenes.forEach((s) => {
    hydrate(s);
    s.el.classList.add('is-on');
    s.views?.forEach((v) => (v.active = true));
    s.enter?.();
    s.update?.(s.staticAt ?? 0, s.staticAt ?? 0);
  });
  document.getElementById('leaders').style.display = 'none';
  const [anchor, room] = location.hash.slice(1).split('/');
  if (anchor) document.getElementById(anchor)?.scrollIntoView();
  if (anchor === 'rooms' && room) ctx.rooms.open(room);
  if (import.meta.env.DEV) window.__refugio = { scenes, stage, rooms: ctx.rooms, texts: () => inventory(textRoots()), wordsAt };
  gsap.ticker.add((_, dt) => stage.render(dt / 1000));
} else {
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  // Read the link before anything can rewrite the address.
  const startHash = location.hash.slice(1);
  let hashLive = false;
  engine = createEngine({
    scenes,
    layer,
    lenis,
    stage,
    transitView,
    onProgress: (p) => hud.setProgress(p),
    onStage: (t) => hud.setStage(t),
    onChange(scene) {
      const index = scenes.indexOf(scene);
      hud.setScene(scene, index);
      document.body.dataset.scene = scene.id;
      document.getElementById('leaders').style.display = scene.id === 'fleet' ? '' : 'none';
      document.getElementById('popups').style.display = scene.id === 'fleet' ? '' : 'none';
      themeMeta?.setAttribute('content', scene.tone);
      routeMap.setCurrent(scene);
      hydrate(scene);
      hydrate(scenes[index + 1]);
      setTimeout(() => scenes[index + 1]?.prepare?.(), 2400);
      // Keep the address shareable without filling the back button with history.
      try {
        if (hashLive) history.replaceState(null, '', index ? `#${scene.id}` : location.pathname + location.search);
      } catch {
        /* Some embedded viewers refuse this. The site works the same without it. */
      }
    },
  });
  const refreshStops = () => scenes.forEach((s) => (s.stopsNow = s.stopsAt ? s.stopsAt() : s.stops));
  refreshStops();
  engine.layout();
  // Phone browsers resize slightly as their address bar hides. Ignore that, or the
  // whole scroll map would shift under the visitor's finger.
  let lastW = innerWidth;
  let lastH = innerHeight;
  addEventListener('resize', () => {
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 140) return;
    lastW = innerWidth;
    lastH = innerHeight;
    refreshStops();
    engine.layout();
    engine.update(window.scrollY);
  });

  // Arrow keys hop between sections, using each section's own transition.
  addEventListener('keydown', (e) => {
    if (viewer.isOpen() || routeMap.isOpen() || ctx.rooms.isOpen() || e.target.matches?.('input, textarea, select')) return;
    if (e.key === 'ArrowRight') engine.next(1);
    if (e.key === 'ArrowLeft') engine.next(-1);
    if (e.key === 'ArrowDown' && e.altKey) engine.stepStage(1);
    if (e.key === 'ArrowUp' && e.altKey) engine.stepStage(-1);
    if (e.key.toLowerCase() === 'm') routeMap.toggle();
  });

  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time, deltaMs) => {
    lenis.raf(time * 1000);
    const dt = Math.min(deltaMs / 1000, 0.05);
    stage.vel = lenis.velocity;
    document.body.classList.toggle('is-scrolling', !!lenis.isScrolling);
    layer.begin();
    // The playhead runs on real time, so a transition takes the same time on a slow device.
    engine.update(window.scrollY, Math.min(deltaMs / 1000, 0.25));
    stage.render(dt);
    trails.update(dt);
    const scene = engine.current;
    if (!engine.wiping) scene?.fx?.(layer, dt);
    trails.draw(layer);
    scene?.tick?.(dt);
    telemetry(scene?.views?.[0] ?? scene?.tm);
  });

  // Deep links such as #air land on that section. #rooms/emma also opens Emma's room.
  const jumpTo = (id) => {
    const [base, room] = id.split('/');
    if (ctx.rooms.isOpen() && !(base === 'rooms' && room)) ctx.rooms.close(true);
    engine.jumpTo(base);
    if (base === 'rooms' && room && ctx.rooms.current !== room) setTimeout(() => ctx.rooms.open(room), 60);
  };
  document.fonts?.ready.then(() => {
    refreshStops();
    engine.layout();
    jumpTo(startHash);
    hashLive = true;
  });
  addEventListener('hashchange', () => jumpTo(location.hash.slice(1)));
  if (import.meta.env.DEV) window.__refugio = { engine, scenes, stage, lenis, transitView, fleet, rooms: ctx.rooms, texts: () => inventory(textRoots()), wordsAt, gsap, stagedMap };
}
