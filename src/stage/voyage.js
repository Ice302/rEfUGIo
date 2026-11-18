// The ship on its own: a floating, cruising vessel filmed with a real dolly move. A camera
// tracks along the hull at low level, the sea and wake run past, and everything goes through
// a low-resolution pass with an ordered dither down to a fixed print palette.
// This has its own canvas inside the scene, so section wipes can pass over it.
import './nocm.js';
import * as THREE from 'three';
import { applyLook } from './lineart.js';
import { RetroPass } from './retro.js';
import { fleet } from '../fleet.config.js';

const lerp = (a, b, t) => a + (b - a) * t;

const skyFS = /* glsl */ `
  uniform vec3 uFwd, uRight, uUp, uSun;
  uniform float uTan, uAspect, uT;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 ndc = vUv * 2. - 1.;
    vec3 ray = normalize(uFwd + uRight * ndc.x * uTan * uAspect + uUp * ndc.y * uTan);
    float h = ray.y;
    vec3 c = mix(vec3(.898, .07, .118), vec3(1., .776, .04), smoothstep(.0, .11, h));
    c = mix(c, vec3(.965, .95, .9), smoothstep(.1, .3, h));
    c = mix(c, vec3(.43, .58, .96), smoothstep(.28, .62, h));
    // Sun with the horizontal slits of an old travel poster
    float d = distance(ray, uSun);
    float disc = 1. - smoothstep(.135, .142, d);
    float slit = step(.42, fract(h * 42.)) + step(uSun.y, h);
    c = mix(c, vec3(.965, .95, .9), disc * min(slit, 1.));
    // Flat bands of cloud
    float az = atan(ray.x, -ray.z);
    float band = noise(vec2(az * 5. + uT * .012, h * 46.));
    float cloud = smoothstep(.68, .74, band) * smoothstep(.03, .08, h) * (1. - smoothstep(.4, .55, h));
    c = mix(c, vec3(.965, .95, .9), cloud * .9);
    gl_FragColor = vec4(c, 1.);
  }`;

const seaVS = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const seaFS = /* glsl */ `
  uniform float uT, uTravel, uSunX, uBeam;
  uniform vec3 uCam;
  varying vec3 vW;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float swell(vec2 p) {
    return sin(p.x * 2.1 + uT * .7) * .5 + sin(p.y * 4.3 - uT * .55 + p.x * 1.1) * .32 + sin((p.x + p.y) * 8.7 + uT * 1.2) * .14;
  }
  void main() {
    vec2 p = vW.xz + vec2(uTravel, 0.);
    float h = swell(p * vec2(1., 1.7)) + .55 * swell(p * vec2(2.9, 5.2) + 3.1);
    float dist = length(vW - uCam);
    float tone = .5 + .3 * h;
    vec3 c = mix(vec3(.04, .165, .612), vec3(.04, .247, .859), smoothstep(.2, .55, tone));
    c = mix(c, vec3(.43, .58, .96), smoothstep(.72, .98, tone) * .75);
    // Contour lines on the swell, fading into the distance
    float contour = 1. - smoothstep(0., .05, abs(fract(h * 2.2) - .5));
    c = mix(c, vec3(.965, .95, .9), contour * .55 * (1. - smoothstep(4., 16., dist)));
    // Long glitter road under the sun
    float glit = smoothstep(.34, .0, abs(vW.x - uCam.x - uSunX * (uCam.z - vW.z)) / (.08 + (uCam.z - vW.z) * .07));
    float sparkle = step(.62, noise(vec2(p.x * 16., p.y * 30. + uT)));
    c = mix(c, vec3(1., .776, .04), glit * sparkle * smoothstep(1.5, 5., dist));
    // Wake: a widening V of churned water behind the stern
    float x = vW.x, z = abs(vW.z);
    if (x < -.9) {
      float back = -.9 - x;
      float edge = abs(z - (.2 + back * .2));
      float n = noise(vec2(p.x * 14., vW.z * 20.));
      float foam = (1. - smoothstep(.0, .07 + back * .05, edge)) * step(.26, n);
      float inner = (1. - smoothstep(.14, .3 + back * .16, z)) * step(.5, noise(vec2(p.x * 9., vW.z * 26.)));
      float fade = 1. - smoothstep(1., 7., back);
      c = mix(c, vec3(.965, .95, .9), max(foam, inner * .85) * fade);
    }
    // Bow wave and hull foam along the waterline
    float beam = uBeam * smoothstep(1.03, .62, x) * smoothstep(-1.1, -.92, x);
    float side = abs(z - beam);
    float crest = (1. - smoothstep(.0, .025 + smoothstep(.45, 1., x) * .05, side)) * step(x, 1.03) * step(-1., x);
    float wash = step(.32, noise(vec2(p.x * 22., vW.z * 34. + uT * 1.4)));
    c = mix(c, vec3(.965, .95, .9), crest * wash);
    // Haze toward the horizon picks up the sky's red
    c = mix(c, vec3(.898, .07, .118), smoothstep(9., 34., dist) * .92);
    gl_FragColor = vec4(c, 1.);
  }`;

export class Voyage {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.ok = false;
    this.t = 0;
    this.travel = 0;
    this.p = 0;
    this.vel = 0;
    this.view = {
      model: 'ship',
      fill: '#f6f2e6',
      ink: '#0b0c14',
      hatch: 0.9,
      hatchPx: 3.2,
      shade: 'halftone',
      livery: 0,
      tintMix: 1,
      line: 0.95,
      outline: 0.7,
      envOpacity: 0,
      travel: 0,
      wheel: 0,
      steer: 0,
      fan: 0,
      gear: 0,
      bodyPitch: 0,
      bodyRoll: 0,
      heave: 0,
      attRoll: 0,
      attPitch: 0,
      bob: 0,
      speed: 6,
    };
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    const r = this.renderer;
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.autoClear = false;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.pass = new RetroPass(r, { nearest: true, quant: true, curve: 0.09, vignette: 0.34, scan: 0.085, chroma: 0, grain: 0, dither: 0.14 });
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.03, 90);

    this.sky = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uFwd: { value: new THREE.Vector3() },
          uRight: { value: new THREE.Vector3() },
          uUp: { value: new THREE.Vector3() },
          uSun: { value: new THREE.Vector3(0.18, 0.11, -0.98).normalize() },
          uTan: { value: 0.3 },
          uAspect: { value: 1 },
          uT: { value: 0 },
        },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
        fragmentShader: skyFS,
      }),
    );
    this.sky.frustumCulled = false;
    this.skyScene = new THREE.Scene();
    this.skyScene.add(this.sky);
    this.skyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.sea = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.ShaderMaterial({
        uniforms: {
          uT: { value: 0 },
          uTravel: { value: 0 },
          uSunX: { value: 0.18 },
          uBeam: { value: 0.12 },
          uCam: { value: new THREE.Vector3() },
        },
        vertexShader: seaVS,
        fragmentShader: seaFS,
      }),
    );
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.frustumCulled = false;
    this.world = new THREE.Scene();
    this.world.add(this.sea);

    // Gulls: two strokes each, wings beating independently
    this.gulls = Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) * 1.1 - 1.2 + i * 0.13,
      y: 0.42 + (i % 4) * 0.09,
      z: -0.4 + (i % 5) * 0.5,
      s: 0.024 + (i % 3) * 0.008,
      ph: i * 1.7,
    }));
    this.gullGeo = new THREE.BufferGeometry();
    this.gullGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.gulls.length * 12), 3));
    const gulls = new THREE.LineSegments(this.gullGeo, new THREE.LineBasicMaterial({ color: 0x0b0c14 }));
    gulls.frustumCulled = false;
    this.world.add(gulls);
    this.ok = true;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.ok) return;
    const w = this.canvas.clientWidth || innerWidth;
    const h = this.canvas.clientHeight || innerHeight;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    // Chunky pixels on purpose, about two CSS pixels each.
    this.pass.setSize(w, h, 0.66);
    this.camera.aspect = w / h;
  }

  render(dt, p, vel) {
    if (!this.ok) return;
    this.t += dt;
    const t = this.t;
    const model = this.stage.models.ship;
    if (!model) return;
    const speed = 0.34 + Math.min(Math.abs(vel) * 0.012, 1.6);
    this.travel += speed * dt;
    this.view.speed = 6 + Math.abs(vel) * 0.1;
    const phone = this.w < this.h;
    // The dolly: a steady track along the hull, stern to bow, close to the water.
    const k = p * p * (3 - 2 * p);
    const camX = lerp(-1.75, 1.55, k) + Math.sin(t * 0.11) * 0.05;
    const reach = phone ? 2.7 : 1.82;
    const camZ = reach + Math.sin(k * Math.PI) * 0.34;
    const camY = lerp(-0.05, 0.0, k) + Math.sin(t * 0.67) * 0.005 + Math.sin(k * Math.PI) * 0.05;
    const cam = this.camera;
    cam.position.set(camX, camY, camZ);
    cam.fov = lerp(35, 29, Math.sin(k * Math.PI));
    cam.lookAt(camX * 0.55, 0.06 + Math.sin(k * Math.PI) * 0.03, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // Floating: slow heave, pitch and roll, all out of step with each other
    const sea = 1 + Math.min(Math.abs(vel) * 0.012, 1.1);
    const v = this.view;
    v.bob = Math.sin(t * 0.83) * 0.011 * sea;
    v.attPitch = Math.sin(t * 0.57 + 0.6) * 0.011 * sea;
    v.attRoll = Math.sin(t * 0.43) * 0.02 * sea;

    const water = ((fleet.ship.floor ?? 0.17) - model.center.y) * model.unit;
    this.sea.position.y = water;
    const su = this.sea.material.uniforms;
    su.uT.value = t;
    su.uBeam.value = model.half.z * model.unit * 1.02;
    su.uTravel.value = this.travel;
    su.uCam.value.copy(cam.position);
    const sk = this.sky.material.uniforms;
    sk.uT.value = t;
    sk.uAspect.value = cam.aspect;
    sk.uTan.value = Math.tan((cam.fov * Math.PI) / 360);
    const e = cam.matrixWorld.elements;
    sk.uRight.value.set(e[0], e[1], e[2]);
    sk.uUp.value.set(e[4], e[5], e[6]);
    sk.uFwd.value.set(-e[8], -e[9], -e[10]);

    const pos = this.gullGeo.attributes.position;
    this.gulls.forEach((g, i) => {
      const gx = ((g.x + t * 0.05 + 3) % 4.4) - 2.2;
      const gy = g.y + Math.sin(t * 0.4 + g.ph) * 0.03;
      const flap = Math.sin(t * 4.2 + g.ph) * g.s * 0.8;
      pos.setXYZ(i * 4, gx - g.s, gy + flap, g.z);
      pos.setXYZ(i * 4 + 1, gx, gy, g.z);
      pos.setXYZ(i * 4 + 2, gx, gy, g.z);
      pos.setXYZ(i * 4 + 3, gx + g.s, gy + flap, g.z);
    });
    pos.needsUpdate = true;

    const r = this.renderer;
    this.pass.begin();
    r.render(this.skyScene, this.skyCam);
    r.clearDepth();
    r.render(this.world, cam);
    applyLook(v, this.pass.rt.width, this.pass.rt.height, 1);
    model.setExplode(0);
    model.setPlot(1);
    model.setRig(v);
    r.render(model.scene, cam);
    model.root.position.y = 0;
    this.pass.end(t);
  }
}
