// Hidden-line rendering for any geometry: flat paper fill, hatched shadow side,
// an inverted-hull silhouette, and drawn crease lines. Placeholders and final GLB
// models both go through this, so a swap does not change the look.
import './nocm.js';
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const shared = {
  uFill: { value: new THREE.Color('#f4f3ee') },
  uInk: { value: new THREE.Color('#111110') },
  uHatch: { value: 0.75 },
  uSpacing: { value: 7 },
  uLivery: { value: 0 },
  uTintMix: { value: 1 },
  uStyle: { value: 1 },
  uC1: { value: new THREE.Color('#e5121e') },
  uC2: { value: new THREE.Color('#ffc60a') },
  uC3: { value: new THREE.Color('#0a3fdb') },
};

const fillVS = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec3 vON;
  void main(){
    vN = normalize(normalMatrix * normal);
    vON = normal; vP = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const fillFS = /* glsl */ `
  uniform vec3 uFill, uInk, uTint, uC1, uC2, uC3;
  uniform float uTintMix, uHatch, uSpacing, uLivery, uBody, uHasTint, uStyle;
  varying vec3 vN; varying vec3 vP; varying vec3 vON;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  void main(){
    vec3 c = mix(uFill, uTint, uHasTint * uTintMix);
    if (uLivery > 0.5 && uBody > 0.5) {
      float z = abs(vP.z);
      if (vON.y > 0.3) {
        if (z < 0.09) c = uC1; else if (z < 0.155) c = uC2; else if (z < 0.25) c = uC3;
      } else if (abs(vON.z) > 0.55 && vP.y > 0.3 && vP.y < 0.56) {
        float s = vP.x * 0.2 + vP.y;
        if (s > 0.3 && s < 0.37) c = uC3; else if (s >= 0.37 && s < 0.415) c = uC2; else if (s >= 0.415 && s < 0.48) c = uC1;
      }
    }
    vec3 n = normalize(vN);
    float l = dot(n, normalize(vec3(-0.35, 0.75, 0.55)));
    // Three printed tones: paper, a screened midtone, and a heavier shadow
    float tone = floor(smoothstep(0.42, -0.62, l) * 3.0 + 0.5) / 3.0;
    vec2 fc = gl_FragCoord.xy;
    float mark;
    if (uStyle < 0.5) {
      float d = (fc.x - fc.y) / uSpacing;
      float tri = abs(fract(d) - 0.5) * 2.0;
      float w = tone * 0.46;
      float aa = max(fwidth(d) * 2.0, 0.02);
      mark = (1.0 - smoothstep(w - aa, w + aa, tri)) * step(0.05, tone);
    } else {
      vec2 q = mat2(0.707, -0.707, 0.707, 0.707) * fc / uSpacing;
      float r = sqrt(tone) * 0.56;
      float dist = length(fract(q) - 0.5);
      float aa = max(fwidth(q.x) * 1.5, 0.03);
      mark = (1.0 - smoothstep(r - aa, r + aa, dist)) * step(0.05, tone);
    }
    // Paper fleck: tiny specks where the ink did not quite take
    float fleck = step(0.985, hash(floor(fc / 2.0))) * 0.5;
    vec3 inked = mix(c, uInk, mark * uHatch);
    gl_FragColor = vec4(mix(inked, uFill, fleck * (1.0 - uHasTint * 0.4) * step(0.5, dot(c, vec3(0.33)))), 1.0);
  }`;

const hullMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    uInk: shared.uInk,
    uThick: { value: 1.6 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    uniform float uThick; uniform vec2 uRes;
    void main(){
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalMatrix * normal;
      vec2 dir = normalize((projectionMatrix * vec4(n, 0.0)).xy + 1e-5);
      clip.xy += dir * uThick * clip.w * 2.0 / uRes;
      gl_Position = clip;
    }`,
  fragmentShader: /* glsl */ `uniform vec3 uInk; void main(){ gl_FragColor = vec4(uInk, 1.0); }`,
});

const lineMat = new LineMaterial({ color: 0x111110, linewidth: 1.05 });
const detailMat = new LineMaterial({ color: 0x111110, linewidth: 0.6 });
const envMat = new LineMaterial({ color: 0x111110, linewidth: 0.8, transparent: true, opacity: 0.5 });

export function applyLook(view, w, h, dpr, lineScale = 1) {
  shared.uFill.value.set(view.fill);
  shared.uInk.value.set(view.ink);
  shared.uHatch.value = view.hatch;
  shared.uLivery.value = view.livery;
  shared.uTintMix.value = view.tintMix;
  shared.uSpacing.value = view.hatchPx * dpr;
  shared.uStyle.value = view.shade === 'hatch' ? 0 : 1;
  hullMat.uniforms.uThick.value = view.outline * lineScale;
  hullMat.uniforms.uRes.value.set(w, h);
  lineMat.color.set(view.ink);
  lineMat.linewidth = view.line * lineScale;
  lineMat.resolution.set(w, h);
  detailMat.color.set(view.ink);
  detailMat.linewidth = view.line * lineScale * 0.58;
  detailMat.resolution.set(w, h);
  envMat.color.set(view.ink);
  envMat.opacity = view.envOpacity;
  envMat.resolution.set(w, h);
}

function fillMaterial(tint, body) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1.2,
    polygonOffsetUnits: 1.2,
    uniforms: {
      ...shared,
      uTint: { value: new THREE.Color(tint || '#ffffff') },
      uHasTint: { value: tint ? 1 : 0 },
      uBody: { value: body ? 1 : 0 },
    },
    vertexShader: fillVS,
    fragmentShader: fillFS,
  });
}

function hullGeometry(geo) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.attributes.position.clone());
  if (geo.index) g.setIndex(geo.index.clone());
  const merged = mergeVertices(g, 1e-3);
  merged.computeVertexNormals();
  return merged;
}

// Segments sorted along the length of the vehicle, so "plotting" sweeps nose to tail.
function makeLines(arr, material) {
  const n = arr.length / 6;
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => arr[b * 6] + arr[b * 6 + 3] - (arr[a * 6] + arr[a * 6 + 3]),
  );
  const sorted = new Float32Array(arr.length);
  order.forEach((src, i) => {
    for (let k = 0; k < 6; k++) sorted[i * 6 + k] = arr[src * 6 + k];
  });
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(sorted);
  const line = new LineSegments2(geometry, material);
  line.frustumCulled = false;
  line.userData.count = n;
  return line;
}

// Moving surroundings, in normalised model space: road markings, air streaks or water lines.
// Each pattern repeats every `period` units, so sliding it forever is seamless.
function buildEnv(kind, floorY) {
  const lines = [];
  let period = 1.2;
  const rng = (() => {
    let n = 7;
    return () => {
      n = (n * 16807) % 2147483647;
      return n / 2147483647;
    };
  })();
  if (kind === 'road') {
    period = 1.2;
    for (let i = -6; i <= 6; i++) {
      const x = i * period;
      [-1.28, 1.28].forEach((z) => lines.push(x, floorY, z, x + 0.62, floorY, z));
      [-2.1, 2.1].forEach((z) => lines.push(x, floorY, z - 0.14, x, floorY, z + 0.14));
    }
  } else if (kind === 'air') {
    period = 7;
    for (let i = 0; i < 22; i++) {
      const x = rng() * period;
      const y = (rng() - 0.5) * 2.6;
      const z = (rng() - 0.5) * 5;
      const len = 0.25 + rng() * 0.9;
      for (let k = -2; k <= 2; k++) lines.push(x + k * period, y, z, x + k * period + len, y, z);
    }
  } else if (kind === 'sea') {
    period = (Math.PI * 2) / 3.4;
    for (let row = 0; row < 6; row++) {
      const side = row % 2 ? 1 : -1;
      const z0 = side * (0.34 + Math.floor(row / 2) * 0.3);
      const amp = 0.018 + (row % 3) * 0.008;
      const phase = row * 1.3;
      for (let x = -5; x < 5; x += 0.1) {
        const a = z0 + Math.sin(x * 3.4 + phase) * amp;
        const b = z0 + Math.sin((x + 0.1) * 3.4 + phase) * amp;
        if (Math.sin(x * 3.4 * 0.5 + phase) > -0.25) lines.push(x, floorY, a, x + 0.1, floorY, b);
      }
    }
  }
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(new Float32Array(lines));
  const seg = new LineSegments2(geometry, envMat);
  seg.frustumCulled = false;
  seg.userData.period = period;
  return seg;
}

// An assembly drawing: the part with the most geometry stays put, and every other part moves
// away from it along the axes it sits on. Wheels slide out sideways and fore and aft, glass
// and upper decks lift in layers, wings and engines spread. Offsets are in model units.
function explodeDirs(parts, center, half) {
  const weight = parts.map((p) => (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count));
  const anchor = weight.indexOf(Math.max(...weight));
  const centers = parts.map((p) => p.geo.boundingBox.getCenter(new THREE.Vector3()));
  const above = centers.map((c, i) => ({ i, y: c.y })).filter((x) => x.i !== anchor && x.y > center.y - half.y * 0.2).sort((a, b) => a.y - b.y);
  const rank = new Map(above.map((x, n) => [x.i, (n + 1) / above.length]));
  const amp = (v) => Math.sign(v) * Math.pow(Math.min(1, Math.abs(v) * 1.5), 0.6);
  return centers.map((c, i) => {
    if (i === anchor || parts[i].noBounds) return new THREE.Vector3();
    const r = c.clone().sub(center);
    const nx = r.x / (half.x || 1);
    const ny = r.y / (half.y || 1);
    const nz = r.z / (half.z || 1);
    return new THREE.Vector3(amp(nx) * half.x * 0.42, amp(ny) * half.y * 0.7 + (rank.get(i) ?? 0) * half.y * 0.55, amp(nz) * half.z * 1.25);
  });
}

export class LineModel {
  // parts: [{ name, geo, tint, edge, lines, dir, body, pivot, rig, retract, noBounds }]
  // rig is one of wheelF, wheelR, fan, gear. Those parts turn around their pivot.
  constructor(parts, { spin = 0, env = null, floor = null } = {}) {
    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.root.rotation.y = spin;
    this.att = new THREE.Group();
    this.att.rotation.order = 'YZX';
    this.scene.add(this.root);
    this.root.add(this.att);
    this.parts = new Map();
    this.lines = [];
    this.rigs = { wheelF: [], wheelR: [], fan: [], gear: [] };
    const box = new THREE.Box3();
    parts.forEach((p) => {
      p.geo.computeBoundingBox();
      if (!p.noBounds) box.union(p.geo.boundingBox);
    });
    this.center = box.getCenter(new THREE.Vector3());
    this.half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    this.unit = 1 / Math.max(this.half.x, this.half.y, this.half.z);
    this.inner = new THREE.Group();
    this.inner.scale.setScalar(this.unit);
    this.inner.position.copy(this.center).multiplyScalar(-this.unit);
    this.att.add(this.inner);
    this.chassis = new THREE.Group();
    this.inner.add(this.chassis);
    const dirs = explodeDirs(parts, this.center, this.half);

    parts.forEach((p, idx) => {
      const holder = new THREE.Group();
      let host = holder;
      let piv = null;
      if (p.pivot) {
        piv = new THREE.Group();
        piv.rotation.order = 'YZX';
        piv.position.copy(p.pivot);
        const shift = new THREE.Group();
        shift.position.copy(p.pivot).negate();
        holder.add(piv);
        piv.add(shift);
        host = shift;
      }
      const mesh = new THREE.Mesh(p.geo, fillMaterial(p.tint, p.body));
      mesh.frustumCulled = false;
      const hull = new THREE.Mesh(p.welded ? p.geo : hullGeometry(p.geo), hullMat);
      hull.frustumCulled = false;
      host.add(hull, mesh);
      const edges = p.edges ?? new THREE.EdgesGeometry(p.geo, p.edge ?? 30).attributes.position.array;
      if (edges.length) {
        const l = makeLines(edges, lineMat);
        host.add(l);
        this.lines.push({ line: l, order: idx / parts.length });
      }
      if (p.lines?.length) {
        const l = makeLines(new Float32Array(p.lines), detailMat);
        host.add(l);
        this.lines.push({ line: l, order: idx / parts.length });
      }
      const unsprung = p.rig === 'wheelF' || p.rig === 'wheelR';
      (unsprung ? this.inner : this.chassis).add(holder);
      if (p.rig) this.rigs[p.rig].push({ piv, pivot: p.pivot, retract: p.retract ?? 0 });
      this.parts.set(p.name, { group: holder, dir: dirs[idx], k: p.k ?? 1, center: p.geo.boundingBox.getCenter(new THREE.Vector3()) });
    });

    if (env) {
      const floorRaw = floor ?? box.min.y;
      this.env = buildEnv(env, (floorRaw - this.center.y) * this.unit);
      this.root.add(this.env);
    }
    this._plot = -1;
    this._explode = -1;
  }

  setExplode(f) {
    if (f === this._explode) return;
    this._explode = f;
    this.parts.forEach((p) => p.group.position.copy(p.dir).multiplyScalar(f * p.k));
  }

  setPlot(t) {
    if (t === this._plot) return;
    this._plot = t;
    this.lines.forEach(({ line, order }) => {
      const local = Math.min(1, Math.max(0, t * 1.5 - order * 0.5));
      line.geometry.instanceCount = Math.floor(line.userData.count * local);
    });
  }

  // Applies a view's motion state: rolling wheels, steering, suspension, fans, gear and attitude.
  setRig(v) {
    this.att.rotation.set(v.attRoll, 0, v.attPitch);
    this.chassis.rotation.set(v.bodyRoll, 0, v.bodyPitch);
    this.chassis.position.y = v.heave;
    this.root.position.y = v.bob ?? 0;
    this.rigs.wheelF.forEach((w) => w.piv.rotation.set(0, v.steer, -v.wheel));
    this.rigs.wheelR.forEach((w) => w.piv.rotation.set(0, 0, -v.wheel));
    this.rigs.fan.forEach((f) => (f.piv.rotation.x = v.fan));
    this.rigs.gear.forEach((g) => (g.piv.position.y = g.pivot.y + (1 - v.gear) * g.retract));
    if (this.env) {
      this.env.visible = v.envOpacity > 0.01;
      this.env.position.x = -(v.travel % this.env.userData.period);
    }
  }

  // `at` is relative to the vehicle's bounding box, from -1 to 1 on each axis, or 'center' for
  // the middle of the named part.
  worldAnchor(at, partName, out = new THREE.Vector3()) {
    const part = partName && this.parts.get(partName);
    if (at === 'center') out.copy(part?.center ?? this.center);
    else {
      out.set(
        this.center.x + at[0] * this.half.x,
        this.center.y + at[1] * this.half.y,
        this.center.z + at[2] * this.half.z,
      );
    }
    if (part) out.addScaledVector(part.dir, this._explode * part.k);
    return this.inner.localToWorld(out);
  }
}
