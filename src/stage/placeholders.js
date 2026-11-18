// Stand-in vehicles, built from code so the proof of concept has something real to
// draw. They exist only until the final models arrive (see fleet.config.js).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const INK = '#111110';
const RED = '#e5121e';
const YELLOW = '#ffc60a';
const BLUE = '#0a3fdb';

function fromTris(tris) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  return g;
}

function flipIfInside(tris) {
  let vol = 0;
  for (let i = 0; i < tris.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = tris.slice(i, i + 9);
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  if (vol < 0) {
    for (let i = 0; i < tris.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = tris[i + 3 + k];
        tris[i + 3 + k] = tris[i + 6 + k];
        tris[i + 6 + k] = t;
      }
    }
  }
  return tris;
}

function loft(rings, { capA = true, capB = true, smooth = false } = {}) {
  const tris = [];
  const n = rings[0].length;
  const push = (a, b, c) => tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      const a = rings[r][i];
      const b = rings[r][(i + 1) % n];
      const c = rings[r + 1][(i + 1) % n];
      const d = rings[r + 1][i];
      push(a, b, c);
      push(a, c, d);
    }
  }
  const cap = (ring, flip) => {
    const c = ring.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / n);
    for (let i = 0; i < n; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      flip ? push(c, b, a) : push(c, a, b);
    }
  };
  if (capA) cap(rings[0], true);
  if (capB) cap(rings[rings.length - 1], false);
  let g = fromTris(flipIfInside(tris));
  if (smooth) {
    g = mergeVertices(g, 1e-4);
  }
  g.computeVertexNormals();
  return g;
}

// An open surface through rows of points. Used for glass and lamps, so they follow the
// curve of the body beneath them.
function patch(rows) {
  const tris = [];
  for (let r = 0; r < rows.length - 1; r++) {
    for (let i = 0; i < rows[r].length - 1; i++) {
      const [a, b, c, d] = [rows[r][i], rows[r][i + 1], rows[r + 1][i + 1], rows[r + 1][i]];
      [a, b, c, a, c, d].forEach((p) => tris.push(p.x, p.y, p.z));
    }
  }
  const g = fromTris(tris);
  g.computeVertexNormals();
  return g;
}

const steps = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

// Flat polygon, nudged off the surface beneath it by the caller.
function poly(points) {
  const tris = [];
  for (let i = 1; i < points.length - 1; i++) {
    [points[0], points[i], points[i + 1]].forEach((p) => tris.push(p.x, p.y, p.z));
  }
  const g = fromTris(tris);
  g.computeVertexNormals();
  return g;
}

function box(x0, x1, y0, y1, z0, z1) {
  const ring = (x) => [V(x, y0, z0), V(x, y0, z1), V(x, y1, z1), V(x, y1, z0)];
  return loft([ring(x0), ring(x1)]);
}

function prism(planXZ, y0, y1) {
  return loft([planXZ.map(([x, z]) => V(x, y0, z)), planXZ.map(([x, z]) => V(x, y1, z))]);
}

function cylZ(r, width, cx, cy, cz, seg = 36) {
  const g = new THREE.CylinderGeometry(r, r, width, seg, 1).toNonIndexed();
  g.rotateX(Math.PI / 2);
  g.translate(cx, cy, cz);
  g.computeVertexNormals();
  return g;
}

function circleLines(out, cx, cy, cz, r, seg = 32) {
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const b = ((i + 1) / seg) * Math.PI * 2;
    out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz, cx + Math.cos(b) * r, cy + Math.sin(b) * r, cz);
  }
}

function catmull(rows, perSeg) {
  const out = [];
  const cr = (a, b, c, d, t) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  for (let i = 0; i < rows.length - 1; i++) {
    const p0 = rows[Math.max(i - 1, 0)];
    const p1 = rows[i];
    const p2 = rows[i + 1];
    const p3 = rows[Math.min(i + 2, rows.length - 1)];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      out.push(p1.map((_, k) => cr(p0[k], p1[k], p2[k], p3[k], t)));
    }
  }
  out.push(rows[rows.length - 1]);
  return out;
}

const interpTable = (rows, x) => {
  // rows sorted by descending x
  for (let i = 0; i < rows.length - 1; i++) {
    if (x <= rows[i][0] && x >= rows[i + 1][0]) {
      const t = (x - rows[i][0]) / (rows[i + 1][0] - rows[i][0]);
      return rows[i].map((v, k) => v + (rows[i + 1][k] - v) * t);
    }
  }
  return x > rows[0][0] ? rows[0] : rows[rows.length - 1];
};

/* ---------------------------------- GT3 --------------------------------- */
function buildGT3() {
  const parts = [];
  // x, half width, bottom, shoulder, top
  const stations = [
    [2.32, 0.6, 0.15, 0.3, 0.36],
    [2.14, 0.84, 0.12, 0.38, 0.47],
    [1.84, 0.97, 0.12, 0.5, 0.59],
    [1.42, 1.03, 0.12, 0.6, 0.7],
    [1.02, 0.98, 0.12, 0.56, 0.72],
    [0.62, 0.92, 0.13, 0.58, 0.77],
    [0.05, 0.93, 0.13, 0.6, 0.79],
    [-0.55, 0.95, 0.13, 0.63, 0.82],
    [-1.05, 1.03, 0.13, 0.69, 0.86],
    [-1.46, 1.05, 0.14, 0.74, 0.89],
    [-1.86, 1.0, 0.17, 0.76, 0.9],
    [-2.2, 0.88, 0.26, 0.78, 0.92],
    [-2.32, 0.78, 0.33, 0.79, 0.91],
  ];
  const profile = ([, w, yb, ys, yt]) => [
    [0, yb],
    [0.7 * w, yb],
    [0.97 * w, yb + 0.03],
    [w, yb + 0.35 * (ys - yb)],
    [w, ys - 0.04],
    [0.94 * w, ys + 0.12 * (yt - ys)],
    [0.74 * w, ys + 0.62 * (yt - ys)],
    [0.38 * w, yt - 0.012],
    [0, yt],
  ];
  const ringAt = (row) => {
    const half = profile(row);
    const x = row[0];
    const r = half.map(([z, y]) => V(x, y, z));
    for (let i = half.length - 2; i >= 1; i--) r.push(V(x, half[i][1], -half[i][0]));
    return r;
  };
  const dense = catmull(stations, 3);
  const surfacePt = (x, i, side = 1) => {
    const h = profile(interpTable(dense, x));
    return V(x, h[i][1], h[i][0] * side);
  };
  const details = [];
  const along = (i, x0, x1, side, step = 0.1) => {
    for (let x = x0; x > x1; x -= step) {
      const a = surfacePt(x, i, side);
      const b = surfacePt(Math.max(x - step, x1), i, side);
      details.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  };
  const around = (x, i0, i1, side) => {
    for (let i = i0; i < i1; i++) {
      const a = surfacePt(x, i, side);
      const b = surfacePt(x, i + 1, side);
      details.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  };
  [1, -1].forEach((s) => {
    // door shuts, sill, hood seam, side vent
    around(0.42, 2, 7, s);
    around(-0.72, 2, 7, s);
    along(2, 0.42, -0.72, s);
    along(7, 1.92, 0.7, s);
    around(1.92, 6, 8, s);
    around(0.92, 2, 5, s);
    around(0.72, 2, 5, s);
    along(3, 0.92, 0.72, s);
    along(4, 0.92, 0.72, s);
  });
  // bonnet vents
  [0.3, 0.42].forEach((z) => {
    [1, -1].forEach((s) => {
      const y = interpTable(dense, 1.45)[4] + 0.002;
      const y2 = interpTable(dense, 1.1)[4] + 0.002;
      details.push(1.45, y, z * s, 1.1, y2, z * s);
    });
  });
  parts.push({
    name: 'body',
    geo: loft(dense.map(ringAt), { smooth: true }),
    edge: 34,
    lines: details,
    body: true,
  });

  // Cabin: x, base half width, base y, top half width, top y
  const cabin = [
    [0.84, 0.78, 0.76, 0.76, 0.77],
    [0.12, 0.8, 0.77, 0.5, 1.15],
    [-0.55, 0.82, 0.8, 0.49, 1.2],
    [-1.25, 0.8, 0.84, 0.44, 1.12],
    [-1.8, 0.66, 0.88, 0.34, 0.97],
    [-2.12, 0.5, 0.9, 0.28, 0.93],
  ];
  const cabRing = ([x, wb, yb, wt, yt]) => [V(x, yb, wb), V(x, yt, wt), V(x, yt + 0.012, 0), V(x, yt, -wt), V(x, yb, -wb)];
  const cabDense = catmull(cabin, 3);
  parts.push({
    name: 'cabin',
    geo: loft(cabDense.map(cabRing), { smooth: false }),
    edge: 30,
    dir: V(0, 0.55, 0),
    body: true,
  });
  const cab = (x) => interpTable(cabDense, x);
  const top = (x, f) => {
    const [, , , wt, yt] = cab(x);
    return V(x, yt + 0.012 * (1 - Math.abs(f)) + 0.014, wt * f);
  };
  const side = (x, f, s) => {
    const [, wb, yb, wt, yt] = cab(x);
    return V(x, yb + (yt - yb) * f, (wb + (wt - wb) * f + 0.014) * s);
  };
  const lerpF = (x, x0, x1, a, b) => a + (b - a) * Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
  const glass = [
    patch(steps(0.68, 0.16, 12).map((x) => [top(x, 0.92), top(x, 0), top(x, -0.92)])),
    patch(steps(-1.04, -1.74, 12).map((x) => [top(x, 0.72), top(x, 0), top(x, -0.72)])),
  ];
  [1, -1].forEach((s) => {
    glass.push(patch(steps(0.46, -0.48, 14).map((x) => [side(x, 0.14, s), side(x, lerpF(x, 0.46, 0.08, 0.14, 0.88), s)])));
    glass.push(patch(steps(-0.56, -1.3, 12).map((x) => [side(x, lerpF(x, -0.56, -1.3, 0.14, 0.24), s), side(x, lerpF(x, -0.56, -1.3, 0.88, 0.26), s)])));
  });
  glass.forEach((g, i) => parts.push({ name: `glass${i}`, geo: g, tint: INK, edge: 10, dir: V(0, 0.55, 0) }));

  // Nose intake and bonnet vents, cut in as dark panels
  const topAt = (x, z) => {
    const h = profile(interpTable(dense, x));
    const az = Math.abs(z);
    const [z7, y7] = h[7];
    const [z6, y6] = h[6];
    const y = az < z7 ? h[8][1] + (y7 - h[8][1]) * (az / z7) : y7 + (y6 - y7) * ((az - z7) / (z6 - z7));
    return V(x, y + 0.01, z);
  };
  [1, -1].forEach((s, i) => {
    parts.push({
      name: `vent${i}`,
      geo: patch(steps(1.52, 1.14, 6).map((x) => [topAt(x, s * 0.31), topAt(x, s * 0.56)])),
      tint: INK,
      edge: 10,
    });
  });
  parts.push({
    name: 'intake',
    geo: patch(steps(-0.6, 0.6, 6).map((f) => [V(2.325, 0.175, f), V(2.33, 0.285, f * 0.9)])),
    tint: INK,
    edge: 10,
  });
  parts.push({ name: 'taillamp', geo: box(-2.335, -2.31, 0.66, 0.72, -0.7, 0.7), tint: RED, edge: 30 });

  // Wheels with arches, tyres, and rims
  [
    [1.42, 1],
    [1.42, -1],
    [-1.46, 1],
    [-1.46, -1],
  ].forEach(([x, s], i) => {
    const lines = [];
    const faceZ = s * 1.105;
    circleLines(lines, x, 0.33, faceZ, 0.215);
    circleLines(lines, x, 0.33, faceZ, 0.055, 16);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const b = a + 0.14;
      lines.push(x + Math.cos(a) * 0.055, 0.33 + Math.sin(a) * 0.055, faceZ, x + Math.cos(b) * 0.205, 0.33 + Math.sin(b) * 0.205, faceZ);
    }
    parts.push({
      name: `arch${i}`,
      geo: cylZ(0.39, 0.012, x, 0.34, s * (x > 0 ? 1.036 : 1.056), 40),
      tint: INK,
      edge: 40,
    });
    parts.push({
      name: `tyre${i}`,
      geo: cylZ(0.33, 0.31, x, 0.33, s * 0.95),
      tint: INK,
      edge: 60,
      dir: V(0, 0, s * 0.85),
      pivot: V(x, 0.33, s * 0.95),
      rig: x > 0 ? 'wheelF' : 'wheelR',
    });
    parts.push({
      name: `rim${i}`,
      geo: cylZ(0.22, 0.012, x, 0.33, s * 1.102, 28),
      tint: YELLOW,
      edge: 60,
      lines,
      dir: V(0, 0, s * 0.85),
      pivot: V(x, 0.33, s * 0.95),
      rig: x > 0 ? 'wheelF' : 'wheelR',
    });
  });

  // Aero
  const wing = [];
  const wingY = 1.32;
  const foil = (z) => [
    V(-1.86, wingY + 0.005, z),
    V(-2.02, wingY + 0.05, z),
    V(-2.2, wingY + 0.075, z),
    V(-2.24, wingY + 0.03, z),
    V(-2.02, wingY - 0.02, z),
  ];
  wing.push({ name: 'wing', geo: loft([foil(-0.98), foil(0.98)]), edge: 24, dir: V(0, 0.75, 0), body: true });
  [1, -1].forEach((s, i) => {
    wing.push({
      name: `plate${i}`,
      geo: box(-2.3, -1.82, wingY - 0.14, wingY + 0.15, s * 0.98, s * 1.0),
      tint: INK,
      edge: 30,
      dir: V(0, 0.75, 0),
    });
    wing.push({
      name: `upright${i}`,
      geo: loft([
        [V(-1.96, 0.9, s * 0.36), V(-2.12, 0.9, s * 0.36), V(-2.12, 0.9, s * 0.385), V(-1.96, 0.9, s * 0.385)],
        [V(-2.06, wingY + 0.02, s * 0.36), V(-2.17, wingY + 0.04, s * 0.36), V(-2.17, wingY + 0.04, s * 0.385), V(-2.06, wingY + 0.02, s * 0.385)],
      ]),
      edge: 30,
      dir: V(0, 0.35, 0),
    });
    wing.push({
      name: `mirror${i}`,
      geo: loft([
        [V(0.56, 0.87, s * 0.82), V(0.56, 0.91, s * 0.82), V(0.44, 0.91, s * 0.82), V(0.44, 0.87, s * 0.82)],
        [V(0.54, 0.86, s * 1.0), V(0.54, 0.93, s * 1.0), V(0.47, 0.93, s * 1.0), V(0.47, 0.86, s * 1.0)],
      ]),
      edge: 30,
    });
    wing.push({
      name: `canardA${i}`,
      geo: loft([
        [V(2.2, 0.36, s * 0.7), V(2.02, 0.38, s * 0.7), V(2.02, 0.39, s * 0.7)],
        [V(1.98, 0.44, s * 1.0), V(1.82, 0.46, s * 1.0), V(1.82, 0.47, s * 1.0)],
      ]),
      tint: INK,
      edge: 20,
      dir: V(0.45, 0.1, s * 0.3),
    });
    wing.push({
      name: `skirt${i}`,
      geo: box(-1.05, 1.0, 0.09, 0.17, s * 0.82, s * 1.04),
      tint: INK,
      edge: 30,
      dir: V(0, -0.2, s * 0.35),
    });
    wing.push({
      name: `lamp${i}`,
      geo: patch(steps(2.08, 1.88, 4).map((x) => [6, 7].map((n) => surfacePt(x, n, s).add(V(0, 0.012, s * 0.008))))),
      tint: YELLOW,
      edge: 10,
    });
  });
  parts.push(...wing);
  parts.push({ name: 'splitter', geo: box(1.82, 2.5, 0.07, 0.115, -0.96, 0.96), tint: INK, edge: 30, dir: V(0.75, -0.08, 0) });
  const fins = [];
  [-0.66, -0.4, -0.13, 0.13, 0.4, 0.66].forEach((z, i) => {
    fins.push({ name: `fin${i}`, geo: box(-2.5, -1.95, 0.1, 0.33, z - 0.012, z + 0.012), tint: INK, edge: 30, dir: V(-0.6, -0.05, 0) });
  });
  parts.push(...fins);
  parts.push({ name: 'diffuser', geo: box(-2.44, -1.9, 0.08, 0.13, -0.86, 0.86), tint: INK, edge: 30, dir: V(-0.6, -0.05, 0) });
  return parts;
}

/* --------------------------------- SHIP --------------------------------- */
function buildShip() {
  const parts = [];
  // x, half beam, keel y, deck y
  const hull = [
    [3.62, 0.02, 0.36, 0.98],
    [3.34, 0.26, 0.18, 0.9],
    [2.92, 0.52, 0.06, 0.8],
    [2.2, 0.72, 0.0, 0.7],
    [1.0, 0.8, 0.0, 0.66],
    [-1.0, 0.8, 0.0, 0.66],
    [-2.6, 0.76, 0.02, 0.68],
    [-3.26, 0.68, 0.14, 0.7],
    [-3.5, 0.6, 0.26, 0.72],
  ];
  const WL = 0.17;
  const dense = catmull(hull, 4);
  const hullRing = ([x, w, yk, yd], y0, y1) => [
    V(x, y0, 0),
    V(x, y0 + 0.02, w * 0.72),
    V(x, y0 + 0.08, w * 0.98),
    V(x, y1, w),
    V(x, y1, -w),
    V(x, y0 + 0.08, -w * 0.98),
    V(x, y0 + 0.02, -w * 0.72),
  ];
  parts.push({
    name: 'hull',
    geo: loft(dense.map((r) => hullRing(r, Math.max(r[2], WL), r[3]))),
    tint: INK,
    edge: 36,
  });
  parts.push({
    name: 'boot',
    geo: loft(dense.filter((r) => r[2] < WL).map((r) => hullRing(r, r[2], WL + 0.005))),
    tint: RED,
    edge: 38,
    dir: V(0, -0.22, 0),
  });

  const deckY = 0.66;
  const deckH = 0.098;
  const plan = (xa, xf, w) => [
    [xa, -w * 0.7],
    [xa + 0.14, -w * 0.94],
    [xa + 0.42, -w],
    [xf - 1.1, -w],
    [xf - 0.42, -w * 0.62],
    [xf, -0.03],
    [xf, 0.03],
    [xf - 0.42, w * 0.62],
    [xf - 1.1, w],
    [xa + 0.42, w],
    [xa + 0.14, w * 0.94],
    [xa, w * 0.7],
  ];
  const DECKS = 11;
  let topY = deckY;
  let topA = 0;
  let topF = 0;
  for (let i = 0; i < DECKS; i++) {
    const xf = 2.68 - (i > 6 ? (i - 6) * 0.3 : i * 0.03);
    const xa = -3.14 + (i > 4 ? (i - 4) * 0.27 : i * 0.02);
    const w = 0.76 - (i > 8 ? (i - 8) * 0.1 : 0);
    const y0 = deckY + i * deckH;
    const y1 = y0 + deckH * 0.98;
    const lines = [];
    // balcony dividers: the detail that says "cruise ship" from any distance
    if (i > 0) {
      for (let x = xa + 0.5; x < xf - 1.18; x += 0.082) {
        lines.push(x, y0 + 0.008, w + 0.002, x, y1 - 0.008, w + 0.002);
        lines.push(x, y0 + 0.008, -w - 0.002, x, y1 - 0.008, -w - 0.002);
      }
      lines.push(xa + 0.42, y0 + deckH * 0.42, w + 0.002, xf - 1.1, y0 + deckH * 0.42, w + 0.002);
      lines.push(xa + 0.42, y0 + deckH * 0.42, -w - 0.002, xf - 1.1, y0 + deckH * 0.42, -w - 0.002);
    }
    parts.push({
      name: `deck${i}`,
      geo: prism(plan(xa, xf, w), y0, y1),
      edge: 22,
      lines,
      dir: V(0, 0.095 * i, 0),
    });
    topY = y1;
    topA = xa;
    topF = xf;
  }
  const lift = 0.095 * (DECKS - 1);

  // Funnel, raked aft
  const funnelRing = (x, y, l, w) => [V(x + l, y, w * 0.55), V(x, y, w), V(x - l * 0.9, y, w * 0.7), V(x - l * 0.9, y, -w * 0.7), V(x, y, -w), V(x + l, y, -w * 0.55)];
  parts.push({
    name: 'funnel',
    geo: loft([funnelRing(-1.32, topY, 0.26, 0.22), funnelRing(-1.5, topY + 0.46, 0.22, 0.17)]),
    tint: RED,
    edge: 28,
    dir: V(0, lift + 0.55, 0),
  });
  parts.push({
    name: 'funnelcap',
    geo: loft([funnelRing(-1.5, topY + 0.46, 0.225, 0.172), funnelRing(-1.52, topY + 0.52, 0.2, 0.15)]),
    tint: INK,
    edge: 28,
    dir: V(0, lift + 0.55, 0),
  });
  // Bridge and wings
  const bridgeY = deckY + deckH * 7;
  parts.push({
    name: 'bridge',
    geo: box(topF + 0.28, topF + 0.62, bridgeY, bridgeY + deckH * 0.96, -0.98, 0.98),
    tint: INK,
    edge: 30,
    dir: V(0.15, 0.095 * 8, 0),
  });
  // Mast and domes
  parts.push({ name: 'mast', geo: box(topF - 0.44, topF - 0.4, topY, topY + 0.42, -0.02, 0.02), edge: 30, dir: V(0, lift + 0.32, 0) });
  parts.push({ name: 'yard', geo: box(topF - 0.44, topF - 0.4, topY + 0.28, topY + 0.31, -0.2, 0.2), edge: 30, dir: V(0, lift + 0.32, 0) });
  const dome = new THREE.SphereGeometry(0.075, 18, 12).toNonIndexed();
  dome.translate(topF - 0.76, topY + 0.09, 0.2);
  dome.computeVertexNormals();
  parts.push({ name: 'dome', geo: dome, edge: 60, dir: V(0, lift + 0.32, 0) });
  const dome2 = dome.clone();
  dome2.translate(0, 0, -0.4);
  parts.push({ name: 'dome2', geo: dome2, edge: 60, dir: V(0, lift + 0.32, 0) });

  // Pool deck
  parts.push({ name: 'pool', geo: box(-0.44, 0.34, topY + 0.002, topY + 0.008, -0.2, 0.2), tint: BLUE, edge: 30, dir: V(0, lift, 0) });
  parts.push({ name: 'pool2', geo: box(-0.92, -0.62, topY + 0.002, topY + 0.008, -0.18, 0.18), tint: BLUE, edge: 30, dir: V(0, lift, 0) });
  // Waterslides
  const slide = new THREE.CatmullRomCurve3([
    V(topA + 0.3, topY + 0.24, 0.32),
    V(topA + 0.1, topY + 0.2, 0.42),
    V(topA + 0.24, topY + 0.12, 0.5),
    V(topA + 0.58, topY + 0.1, 0.42),
    V(topA + 0.46, topY + 0.04, 0.22),
  ]);
  const tube = new THREE.TubeGeometry(slide, 28, 0.02, 7).toNonIndexed();
  tube.computeVertexNormals();
  parts.push({ name: 'slide', geo: tube, tint: YELLOW, edge: 80, dir: V(0, lift + 0.2, 0) });

  // Lifeboats, the second cruise-ship tell
  [1, -1].forEach((s, si) => {
    for (let i = 0; i < 9; i++) {
      const c = new THREE.CapsuleGeometry(0.036, 0.15, 3, 10).toNonIndexed();
      c.rotateZ(Math.PI / 2);
      c.translate(-1.9 + i * 0.42, deckY + deckH * 1.5, s * 0.815);
      c.computeVertexNormals();
      parts.push({
        name: `boat${si}${i}`,
        geo: c,
        tint: YELLOW,
        edge: 70,
        dir: V(0, 0.09, s * 0.55),
      });
    }
  });
  return parts;
}

/* --------------------------------- PLANE -------------------------------- */
function buildPlane() {
  const parts = [];
  const fus = [
    [3.2, 0.012, -0.03],
    [3.1, 0.1, -0.04],
    [2.92, 0.19, -0.025],
    [2.62, 0.27, -0.005],
    [2.2, 0.3, 0],
    [-1.4, 0.3, 0],
    [-2.2, 0.245, 0.06],
    [-2.8, 0.14, 0.14],
    [-3.2, 0.03, 0.21],
  ];
  const ringN = 24;
  const fusRing = ([x, r, cy]) => Array.from({ length: ringN }, (_, i) => {
    const a = (i / ringN) * Math.PI * 2;
    return V(x, cy + Math.sin(a) * r, Math.cos(a) * r);
  });
  const dense = catmull(fus, 4);
  const lines = [];
  // Window line and panel seams
  [1, -1].forEach((s) => {
    for (let x = 2.3; x > -1.75; x -= 0.062) {
      if (Math.abs(x - 0.55) < 0.05) continue;
      const a = 0.32;
      const r = 0.303;
      lines.push(x, Math.sin(a) * r - 0.016, Math.cos(a) * r * s, x, Math.sin(a) * r + 0.016, Math.cos(a) * r * s);
    }
    [2.36, 1.1, -0.2, -1.84].forEach((x) => {
      const a0 = 0.02;
      const a1 = 0.58;
      const r = 0.303;
      const p = (x2, a) => [x2, Math.sin(a) * r, Math.cos(a) * r * s];
      lines.push(...p(x, a0), ...p(x, a1), ...p(x + 0.09, a0), ...p(x + 0.09, a1), ...p(x, a1), ...p(x + 0.09, a1), ...p(x, a0), ...p(x + 0.09, a0));
    });
  });
  [2.5, 1.7, 0.95, 0.15, -0.65, -1.4, -2.05].forEach((x) => {
    const row = interpTable(dense, x);
    const ring = fusRing(row);
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ringN];
      lines.push(p.x, p.y, p.z, q.x, q.y, q.z);
    });
  });
  parts.push({ name: 'fuselage', geo: loft(dense.map(fusRing), { smooth: true }), edge: 60, lines });
  // Cockpit glazing
  const cockpit = (a0, a1, x0, x1, s) => {
    const pt = (x, a) => {
      const [, r, cy] = interpTable(dense, x);
      return V(x, cy + Math.sin(a) * (r + 0.006), Math.cos(a) * (r + 0.006) * s);
    };
    return patch(steps(x0, x1, 5).map((x) => steps(a0, a1, 4).map((a) => pt(x, a))));
  };
  [1, -1].forEach((s, i) => {
    parts.push({ name: `cockpit${i}`, geo: cockpit(0.62, 1.3, 2.86, 2.6, s), tint: INK, edge: 10 });
    parts.push({ name: `cockpitS${i}`, geo: cockpit(0.28, 0.58, 2.76, 2.52, s), tint: INK, edge: 10 });
  });

  const airfoil = (le, c, t, y, z) => [
    [0, 0],
    [0.08, 0.6],
    [0.32, 1],
    [0.7, 0.42],
    [1, 0],
    [0.7, -0.2],
    [0.32, -0.45],
    [0.08, -0.34],
  ].map(([f, h]) => V(le - f * c, y + h * t, z));

  [1, -1].forEach((s, i) => {
    const wing = [
      airfoil(1.02, 1.5, 0.1, -0.16, s * 0.2),
      airfoil(0.56, 1.02, 0.07, -0.08, s * 1.15),
      airfoil(-0.92, 0.3, 0.025, 0.2, s * 3.0),
    ];
    const wl = [];
    // flap and aileron lines
    for (let z = 0.5; z < 2.8; z += 0.46) {
      const f = (z - 0.2) / 2.8;
      const le = 1.02 + (-0.92 - 1.02) * f;
      const c = 1.5 + (0.3 - 1.5) * f;
      const y = -0.16 + (0.2 + 0.16) * f + 0.012;
      wl.push(le - c * 0.72, y, s * z, le - c * 0.97, y - 0.008, s * z);
    }
    parts.push({ name: `wing${i}`, geo: loft(wing), edge: 24, lines: wl, dir: V(0, 0.05, s * 0.6) });
    parts.push({
      name: `winglet${i}`,
      geo: loft([airfoil(-0.92, 0.3, 0.02, 0.2, s * 3.0), airfoil(-1.18, 0.12, 0.012, 0.56, s * 3.06)]),
      tint: BLUE,
      edge: 24,
      dir: V(0, 0.05, s * 0.6),
    });
    // Engine
    const nac = new THREE.LatheGeometry(
      [
        [0.0, -0.46],
        [0.1, -0.48],
        [0.16, -0.25],
        [0.2, 0.1],
        [0.205, 0.36],
        [0.185, 0.47],
        [0.17, 0.48],
        [0.0, 0.47],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      28,
    ).toNonIndexed();
    nac.rotateZ(-Math.PI / 2);
    nac.translate(0.6, -0.42, s * 1.12);
    nac.computeVertexNormals();
    parts.push({ name: `nacelle${i}`, geo: nac, edge: 50, dir: V(0.25, -0.42, s * 0.6) });
    const fan = new THREE.CircleGeometry(0.165, 28).toNonIndexed();
    fan.rotateY(Math.PI / 2);
    fan.translate(1.075, -0.42, s * 1.12);
    fan.computeVertexNormals();
    const fl = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      fl.push(1.08, -0.42 + Math.sin(a) * 0.03, s * 1.12 + Math.cos(a) * 0.03, 1.08, -0.42 + Math.sin(a + 0.3) * 0.155, s * 1.12 + Math.cos(a + 0.3) * 0.155);
    }
    parts.push({ name: `fan${i}`, geo: fan, tint: BLUE, edge: 50, lines: fl, dir: V(0.25, -0.42, s * 0.6), pivot: V(1.08, -0.42, s * 1.12), rig: 'fan' });
    parts.push({
      name: `pylon${i}`,
      geo: loft([
        [V(0.86, -0.25, s * 1.1), V(0.2, -0.25, s * 1.1), V(0.2, -0.25, s * 1.14), V(0.86, -0.25, s * 1.14)],
        [V(0.5, -0.04, s * 1.1), V(-0.05, -0.04, s * 1.1), V(-0.05, -0.04, s * 1.14), V(0.5, -0.04, s * 1.14)],
      ]),
      edge: 30,
      dir: V(0.1, -0.2, s * 0.6),
    });
    // Tailplane
    parts.push({
      name: `stab${i}`,
      geo: loft([airfoil(-2.42, 0.7, 0.03, 0.2, s * 0.08), airfoil(-2.96, 0.24, 0.012, 0.3, s * 1.12)]),
      edge: 24,
      dir: V(-0.55, 0.05, s * 0.3),
    });
  });
  // Fin
  const finRing = (le, c, t, y) => [
    [0, 0],
    [0.3, 1],
    [1, 0],
    [0.3, -1],
  ].map(([f, h]) => V(le - f * c, y, h * t));
  parts.push({
    name: 'fin',
    geo: loft([finRing(-1.98, 0.98, 0.03, 0.22), finRing(-2.86, 0.4, 0.012, 1.2)]),
    tint: BLUE,
    edge: 24,
    dir: V(-0.5, 0.42, 0),
  });
  // Belly fairing
  const belly = catmull([
    [1.3, 0.05, -0.2],
    [0.9, 0.22, -0.23],
    [-0.2, 0.26, -0.25],
    [-0.8, 0.2, -0.22],
    [-1.2, 0.04, -0.2],
  ], 3).map(([x, r, cy]) => Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return V(x, cy + Math.sin(a) * r * 0.42, Math.cos(a) * r);
  }));
  parts.push({ name: 'belly', geo: loft(belly, { smooth: true }), edge: 70, dir: V(0, -0.28, 0) });

  // Landing gear: retracts up inside the fuselage, and is left out of the bounds.
  const gearLeg = (name, x, z, h, r) => {
    const pivot = V(x, -0.28, z);
    const wheels = [-1, 1].map((k) => cylZ(r, 0.05, x, -0.28 - h, z + k * 0.055, 18));
    parts.push({ name: `${name}leg`, geo: box(x - 0.016, x + 0.016, -0.28 - h, -0.28, z - 0.016, z + 0.016), edge: 30, pivot, rig: 'gear', retract: h + 0.08, noBounds: true });
    wheels.forEach((geo, k) => parts.push({ name: `${name}wheel${k}`, geo, tint: INK, edge: 60, pivot, rig: 'gear', retract: h + 0.08, noBounds: true }));
  };
  gearLeg('noseGear', 2.28, 0, 0.3, 0.07);
  gearLeg('mainGearA', 0.1, 0.2, 0.36, 0.1);
  gearLeg('mainGearB', 0.1, -0.2, 0.36, 0.1);
  return parts;
}

/* ------------------------------- SATELLITE ------------------------------ */

export const builders = { car: buildGT3, ship: buildShip, plane: buildPlane };
