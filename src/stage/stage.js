// One fixed WebGL canvas above the page. Each `.view` element is a window onto a vehicle:
// the stage reads its rectangle every frame and renders into just that area, so models
// stay locked to the layout. A view also carries motion state, which is integrated here:
// wheels roll, suspension loads and rebounds, planes bank, ships ride the swell.
import './nocm.js';
import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { fleet } from '../fleet.config.js';
import { builders } from './placeholders.js';
import { LineModel, applyLook } from './lineart.js';
import { RetroPass } from './retro.js';

const FOV = 18;
const BASE_DIST = 1 / Math.tan(((FOV / 2) * Math.PI) / 180);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const VIEW_DEFAULTS = {
  model: 'car',
  to: null,
  pending: null,
  morphT: 0,
  active: false,
  yaw: 0,
  pitch: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  explode: 0,
  plot: 1,
  spin: 0,
  angle: 0,
  parallax: 0.1,
  fill: '#f4f3ee',
  ink: '#111110',
  hatch: 0.75,
  hatchPx: 4.6,
  shade: 'halftone',
  livery: 0,
  tintMix: 1,
  line: 1.05,
  outline: 1.5,
  // Motion settings
  cruise: 0, // resting speed
  velGain: 0, // how strongly scroll speed feeds the vehicle
  pointerGain: 0, // how strongly the pointer steers it
  envOpacity: 0, // road markings, air streaks or water lines
  slide: 0, // travel along its own nose direction, for entrances and exits
  kick: 0, // extra yaw during an entrance
  boost: 0,
  bankT: 0,
  steerT: 0,
  gear: 0,
  trail: { skid: 0, contrail: 0, wake: 0 },
  // Written by transition hooks, cleared at the start of every frame
  path: null,
  fxX: 0,
  fxY: 0,
  fxZoom: 1,
  fxYaw: 0,
  fxSlide: 0,
  fxBoost: 0,
  fxSteer: 0,
  fxBank: 0,
  fxClimb: 0,
  hidden: false,
  skid: 0,
  contrail: 0,
  wake: 0,
  // Integrated motion state
  speed: 0,
  travel: 0,
  wheel: 0,
  steer: 0,
  bodyPitch: 0,
  bodyPitchV: 0,
  bodyRoll: 0,
  bodyRollV: 0,
  heave: 0,
  heaveV: 0,
  attRoll: 0,
  attPitch: 0,
  fan: 0,
};

export class Stage {
  constructor(canvas, scanEl) {
    this.canvas = canvas;
    this.scanEl = scanEl;
    this.views = [];
    this.models = {};
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    this.ok = false;
    this.lost = false;
    this.vel = 0;
    this.time = 0;
    this.calm = false;
    this.low = false;
    this.avg = 16;
    this.frames = 0;
    this.anchorV = new THREE.Vector3();
    this.progress = {};
    this.ready = Promise.resolve();
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });
      this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.autoClear = false;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.renderer.setPixelRatio(this.dpr);
      // Everything renders into this target first, slightly oversampled to smooth the lines.
      this.pass = new RetroPass(this.renderer, { chroma: 0.00055, scan: 0.045, grain: 0.035, boil: 1.1 });
      this.ok = true;
    } catch (err) {
      console.warn('WebGL is unavailable, so the vehicles will not be drawn.', err);
      document.documentElement.classList.add('no-webgl');
    }
    if (!this.ok) return;
    // If the graphics driver resets, wait for the browser to restore the context.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
    });
    this._resize();
    new ResizeObserver(() => this._resize()).observe(canvas);
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    });
    // Vehicles with a file load now. Their placeholder is only built if the file fails.
    const jobs = Object.keys(fleet).map((key) => (fleet[key].src ? this._loadFinal(key) : Promise.resolve(this._placeholder(key))));
    this.ready = Promise.all(jobs).then(() => this._warm());
  }

  _placeholder(key) {
    const conf = fleet[key];
    this.models[key] = new LineModel(builders[key](), { env: conf.env, floor: conf.floor });
  }

  // Draws each vehicle once behind the loader, into a corner two pixels wide. That puts it on
  // the GPU now, so its first appearance in the middle of a scroll drops no frames.
  async _warm() {
    const view = { ...VIEW_DEFAULTS, camera: new THREE.PerspectiveCamera(FOV, 1, 0.1, 60) };
    const b = { left: 0, bottom: this.h, width: 2, height: 2 };
    for (const key of Object.keys(this.models)) {
      if (this.lost) return;
      this.pass.begin();
      this._draw(view, key, b, 0, 2);
      this.renderer.setRenderTarget(null);
      await new Promise((r) => setTimeout(r));
    }
  }

  // How far along the model downloads are, from 0 to 1.
  get loaded() {
    const keys = Object.keys(fleet).filter((k) => fleet[k].src);
    if (!this.ok || !keys.length) return 1;
    return keys.reduce((sum, k) => sum + (this.progress[k] ?? 0), 0) / keys.length;
  }

  async _fetchGltf(key, src) {
    const loader = new GLTFLoader();
    // A model embedded in the page as a data address is decoded here, with no network request.
    if (src.startsWith('data:')) {
      const bin = atob(src.slice(src.indexOf(',') + 1));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      this.progress[key] = 1;
      return loader.parseAsync(bytes.buffer, '');
    }
    return loader.loadAsync(src, (e) => {
      if (e.total) this.progress[key] = e.loaded / e.total;
    });
  }

  async _loadFinal(key) {
    const conf = fleet[key];
    try {
      const gltf = await this._fetchGltf(key, conf.src);
      this.progress[key] = 1;
      gltf.scene.updateMatrixWorld(true);
      const center = new THREE.Box3().setFromObject(gltf.scene).getCenter(new THREE.Vector3());
      const baked = new Map();
      gltf.scene.traverse((o) => {
        if (!o.isLineSegments) return;
        const pos = o.geometry.attributes.position;
        const idx = o.geometry.index.array;
        const arr = new Float32Array(idx.length * 3);
        for (let i = 0; i < idx.length; i++) {
          arr[i * 3] = pos.getX(idx[i]);
          arr[i * 3 + 1] = pos.getY(idx[i]);
          arr[i * 3 + 2] = pos.getZ(idx[i]);
        }
        baked.set(o.name.replace(/__lines$/, ''), arr);
      });
      const parts = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const extras = o.userData ?? {};
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', o.geometry.attributes.position);
        if (o.geometry.index) geo.setIndex(o.geometry.index);
        const prepared = baked.size > 0;
        if (!prepared) geo.applyMatrix4(o.matrixWorld);
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        const c = geo.boundingBox.getCenter(new THREE.Vector3());
        const part = {
          name: o.name || `part${parts.length}`,
          geo,
          edge: conf.edgeAngle,
          dir: c.clone().sub(center).multiplyScalar(0.35),
          tint: extras.tint,
          body: extras.body,
          edges: baked.get(o.name) ?? (prepared ? new Float32Array(0) : undefined),
          welded: prepared,
        };
        if (extras.rig) {
          part.rig = extras.rig;
          part.pivot = new THREE.Vector3().fromArray(extras.pivot);
        } else if (!prepared) {
          // A file straight from a modelling tool: go by mesh names
          const label = `${o.name} ${o.parent?.name ?? ''}`;
          if (/wheel|tyre|tire|rim/i.test(label)) {
            part.pivot = c;
            part.rig = c.x > center.x ? 'wheelF' : 'wheelR';
          } else if (/fan|turbine|prop/i.test(label)) {
            part.pivot = c;
            part.rig = 'fan';
          }
        }
        parts.push(part);
      });
      this.models[key] = new LineModel(parts, { spin: conf.spin || 0, env: conf.env, floor: conf.floor });
    } catch (err) {
      console.warn(`Could not load ${conf.src}. Using the placeholder ${key} instead.`, err);
      this.progress[key] = 1;
      this._placeholder(key);
    }
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.pass.setSize(w, h, this.low ? this.dpr : Math.max(this.dpr, 1.6));
  }

  addView(opts) {
    const view = {
      ...VIEW_DEFAULTS,
      ...opts,
      camera: new THREE.PerspectiveCamera(FOV, 1, 0.1, 60),
    };
    this.views.push(view);
    return view;
  }

  clearFx() {
    for (const v of this.views) {
      v.path = null;
      v.fxX = 0;
      v.fxY = 0;
      v.fxZoom = 1;
      v.fxYaw = 0;
      v.fxSlide = 0;
      v.fxBoost = 0;
      v.fxSteer = 0;
      v.fxBank = 0;
      v.fxClimb = 0;
      v.hidden = false;
      v.skid = v.trail.skid;
      v.contrail = v.trail.contrail;
      v.wake = v.trail.wake;
    }
  }

  // Inspection swap: a scan line crosses, the old vehicle comes apart and the new one assembles.
  morph(view, key, duration = 1.05) {
    if ((view.to || view.model) === key) return;
    if (view.to) view.model = view.to;
    view.to = key;
    view.morphT = 0;
    gsap.killTweensOf(view, 'morphT');
    gsap.to(view, {
      morphT: 1,
      duration,
      ease: 'power2.inOut',
      onComplete() {
        view.model = key;
        view.to = null;
        view.morphT = 0;
      },
    });
  }

  // Road swap: the current vehicle accelerates away along its nose, and the next arrives from behind.
  swap(view, key, { out = 0.46, arrive = 1.15 } = {}) {
    if ((view.pending || view.model) === key) return;
    view.pending = key;
    view.swapTl?.kill();
    const kind = fleet[key].kind;
    const tl = gsap.timeline({
      onComplete() {
        view.pending = null;
      },
    });
    tl.to(view, { slide: 2.5, boost: 34, duration: out, ease: 'power2.in' }, 0)
      .add(() => {
        view.model = key;
        view.slide = -2.7;
        view.kick = kind === 'car' ? 0.62 : kind === 'plane' ? -0.34 : 0.1;
        view.bankT = kind === 'plane' ? -0.82 : 0;
      }, out)
      .to(view, { slide: 0, duration: arrive, ease: 'expo.out' }, out)
      .to(view, { boost: 0, duration: arrive, ease: 'power3.out' }, out)
      .to(view, { kick: 0, bankT: 0, duration: arrive * 1.1, ease: 'elastic.out(1, 0.62)' }, out + 0.08);
    view.swapTl = tl;
  }

  _spring(v, key, target, stiff, damp, dt) {
    const vk = `${key}V`;
    v[vk] += ((target - v[key]) * stiff - v[vk] * damp) * dt;
    v[key] += v[vk] * dt;
  }

  // Advances one view's motion. Scroll speed and the pointer feed into every vehicle.
  _integrate(view, dt) {
    const key = view.to || view.model;
    const kind = fleet[key].kind;
    if (this.calm) {
      view.speed = 0;
      return;
    }
    const scroll = Math.abs(this.vel);
    const target = view.cruise + Math.min(scroll * view.velGain, 26) + view.boost + view.fxBoost;
    const prev = view.speed;
    view.speed += (target - prev) * (1 - Math.exp(-dt * 5));
    const accel = (view.speed - prev) / Math.max(dt, 0.004);
    view.travel += view.speed * dt * 0.42;
    const pointerX = this.pointer.sx * view.pointerGain;

    if (kind === 'car') {
      view.wheel += view.speed * dt * 2.6;
      const steerT = clamp(view.steerT + view.fxSteer + pointerX * 0.3, -0.32, 0.32);
      view.steer += (steerT - view.steer) * (1 - Math.exp(-dt * 8));
      // Squat under power, dive under braking, lean into corners, with some rebound.
      this._spring(view, 'bodyPitch', clamp(accel * 0.0026, -0.07, 0.07), 95, 8.5, dt);
      this._spring(view, 'bodyRoll', clamp(view.steer * Math.min(view.speed, 26) * 0.0075, -0.075, 0.075), 80, 7.5, dt);
      const idle = Math.sin(this.time * 41) * 0.0009 * (view.speed < 4 ? 1 : 0.4);
      this._spring(view, 'heave', idle, 240, 18, dt);
    } else if (kind === 'plane') {
      view.fan += (9 + view.speed * 2.6) * dt;
      const t = this.time;
      const turbulence = (Math.sin(t * 0.83) + Math.sin(t * 1.71 + 1.4) * 0.5) * 0.028;
      const bank = view.bankT + view.fxBank + pointerX * 0.42 + turbulence;
      view.attRoll += (bank - view.attRoll) * (1 - Math.exp(-dt * 3.6));
      const climb = clamp(-this.vel * 0.0095, -0.14, 0.14) + view.fxClimb + Math.sin(t * 0.61) * 0.012;
      view.attPitch += (climb - view.attPitch) * (1 - Math.exp(-dt * 3));
    } else if (kind === 'ship') {
      const t = this.time;
      const sea = 1 + Math.min(scroll * 0.03, 1.4);
      view.attRoll = view.fxBank + Math.sin(t * 0.72) * 0.016 * sea;
      view.attPitch = Math.sin(t * 0.53 + 0.8) * 0.012 * sea;
    }
  }

  _camera(view, key, w, h) {
    const pose = fleet[key].pose;
    const p = this.pointer;
    let yaw = pose.yaw + view.yaw + view.angle + view.kick + view.fxYaw + p.sx * view.parallax;
    let pitch = pose.pitch + view.pitch + p.sy * view.parallax * 0.35;
    let zoom = pose.zoom * view.zoom * view.fxZoom;
    const aspect = w / h;
    // Direction of the nose on screen, so a vehicle can travel the way it faces.
    const nx = Math.cos(yaw);
    const ny = -Math.sin(yaw) * Math.sin(pitch);
    const nl = Math.hypot(nx, ny) || 1;
    const slide = view.slide + view.fxSlide;
    let panX = view.panX + view.fxX + (nx / nl) * slide;
    let panY = view.panY + view.fxY + ((ny / nl) * slide * Math.min(aspect, 1.8)) / 1;
    if (view.path) {
      const P = view.path;
      const b = P.blend ?? 0;
      let py = P.yaw;
      while (py - yaw > Math.PI) py -= Math.PI * 2;
      while (py - yaw < -Math.PI) py += Math.PI * 2;
      yaw = py + (yaw - py) * b;
      pitch = (P.pitch ?? pitch) + (pitch - (P.pitch ?? pitch)) * b;
      zoom = (P.zoom ?? zoom) + (zoom - (P.zoom ?? zoom)) * b;
      panX = P.x + (panX - P.x) * b;
      panY = P.y + (panY - P.y) * b;
    }
    const dist = (BASE_DIST / zoom) * (aspect < 1 ? 1 / aspect : 1);
    const cam = view.camera;
    cam.aspect = aspect;
    cam.near = Math.max(0.05, dist - 9);
    cam.far = dist + 26;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    cam.projectionMatrix.elements[8] = -panX;
    cam.projectionMatrix.elements[9] = -panY;
  }

  _draw(view, key, b, sx, sw, extraExplode = 0) {
    const model = this.models[key];
    if (!model || sw <= 0) return;
    const r = this.renderer;
    const y = this.h - b.bottom;
    this.pass.rect(b.left, y, b.width, b.height, sx, sw);
    r.clearDepth();
    this._camera(view, key, b.width, b.height);
    applyLook(view, b.width, b.height, this.pass.px, fleet[key].lineScale ?? 1);
    model.setExplode((view.explode + extraExplode) * (fleet[key].explodeScale ?? 1));
    model.setPlot(view.plot);
    model.setRig(view);
    r.render(model.scene, view.camera);
  }

  _perf(dt) {
    this.avg += (dt * 1000 - this.avg) * 0.03;
    if (++this.frames > 150 && this.avg > 30 && (this.dpr > 1 || !this.low)) {
      // Struggling device: trade sharpness for smoothness rather than dropping frames.
      this.dpr = Math.max(1, this.dpr - 0.5);
      this.low = true;
      this.renderer.setPixelRatio(this.dpr);
      this._resize();
      this.frames = 0;
    }
  }

  render(dt = 0.016) {
    if (!this.ok || this.lost) return;
    this.time += dt;
    this._perf(dt);
    const p = this.pointer;
    p.sx += (p.x - p.sx) * 0.06;
    p.sy += (p.y - p.sy) * 0.06;
    // Nothing on screen: leave the canvas clear and do no GPU work at all.
    if (!this.views.some((v) => v.active && !v.hidden)) {
      if (this.painted) {
        this.pass.begin();
        this.pass.end(this.time);
        this.painted = false;
      }
      if (this.scanEl) this.scanEl.style.display = 'none';
      return;
    }
    this.painted = true;
    this.pass.begin();
    let scan = null;
    let drew = false;
    for (const view of this.views) {
      if (!view.active || view.hidden) continue;
      const b = view.el.getBoundingClientRect();
      if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > this.h) continue;
      drew = true;
      this._integrate(view, dt);
      view.angle += view.spin * dt;
      view.rect = b;
      if (view.to) {
        const split = b.left + b.width * view.morphT;
        const t = view.morphT;
        this._draw(view, view.model, b, split, b.right - split, t * 0.55);
        this._draw(view, view.to, b, b.left, split - b.left, (1 - t) * 0.55);
        scan = { x: split, top: Math.max(0, b.top), h: Math.min(b.height, this.h) };
      } else {
        this._draw(view, view.model, b, b.left, b.width);
      }
    }
    // Hard scrolling tears the picture like a VHS tape being wound on.
    this.pass.set('uTear', this.calm ? 0 : Math.min(1, Math.max(0, Math.abs(this.vel) - 28) / 90));
    this.pass.end(this.time);
    this.idle = !drew;
    if (this.scanEl) {
      this.scanEl.style.display = scan ? 'block' : 'none';
      if (scan) {
        this.scanEl.style.transform = `translateX(${scan.x}px)`;
        this.scanEl.style.top = `${scan.top}px`;
        this.scanEl.style.height = `${scan.h}px`;
      }
    }
  }

  // Screen position of a point on a vehicle, for leader lines and trails.
  project(view, at, part) {
    if (!this.ok || !view.rect) return null;
    const model = this.models[view.to || view.model];
    if (!model) return null;
    const v = model.worldAnchor(at, part, this.anchorV).project(view.camera);
    const b = view.rect;
    return { x: b.left + ((v.x + 1) / 2) * b.width, y: b.top + ((1 - v.y) / 2) * b.height };
  }
}
