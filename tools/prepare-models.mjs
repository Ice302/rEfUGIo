// Turns the source models in models-source/ into light, web-ready files in public/models/.
// Run with: npm run models
//
// For each model this flattens and reorients the geometry (nose along +X, up along +Y, sized
// to fit the site's stage), groups meshes into a small number of parts, simplifies them,
// and bakes the crease lines the line-art style draws. Textures are dropped, because the
// site draws these models as ink on paper.
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptSimplifier } from 'meshoptimizer';

const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
// Turns a material's colour into one of the site's print inks. Pale colours stay as paper.
function inkFromColor(c) {
  if (!c) return null;
  const l = lum(c);
  if (c[0] > 0.2 && c[0] > c[1] * 2.4 && c[0] > c[2] * 2.4) return c[1] < 0.2 && c[0] < 0.5 ? '#111110' : '#e5121e';
  if (l < 0.16) return '#111110';
  if (c[0] > c[2] * 2 && l < 0.62) return '#e3d7b8';
  return null;
}

const MODELS = [
  {
    key: 'car',
    file: 'porsche_kremer_racing_935_k3_midpoly.glb',
    nose: '+z',
    length: 4.6,
    budget: 62000,
    crease: 34,
    minEdge: 0.012,
    maxLines: 15000,
    group: (node) => node.getName().replace(/_0$/, ''),
    rules: [
      [/TIRE|Grid|Void|Glass|Bolts/i, { tint: '#111110' }],
      [/RIM|Lights/i, { tint: '#ffc60a' }],
      [/Body/i, { body: true }],
    ],
    // All four wheels arrive as one mesh, so split them by quadrant to let each one turn.
    wheels: /^Wheels_/,
  },
  {
    key: 'plane',
    file: 'boeing_787-9.glb',
    nose: '+z',
    length: 6.3,
    budget: 12000,
    crease: 38,
    minEdge: 0.008,
    maxLines: 9000,
    group: (node) => node.getName().replace(/_0$/, ''),
    rules: [
      [/^Object_(5|7|9|11)_/, { tint: '#0a3fdb', fan: true }],
      [/^Object_(13|19|21|49)_/, {}],
    ],
  },
  {
    key: 'ship',
    file: 'rms_queen_marry.glb',
    nose: '-z',
    length: 7,
    budget: 240000,
    sloppyError: 0.006,
    crease: 52,
    minEdge: 0.045,
    maxLines: 9000,
    dropBelow: 0.009, // parts under this share of the length are window frames and fittings
    bands: 4, // split each material into height bands, so decks can lift apart
    group: (node, prim) => prim.getMaterial()?.getName() ?? 'none',
    color: true,
    ignoreBelow: 0.2, // hull under the waterline, in output units, is never seen
  },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;

function orient(nose, x, y, z) {
  // Rotate about Y so the nose points along +X, with the sides along Z
  return nose === '+z' ? [z, y, -x] : [-z, y, x];
}

async function collect(conf) {
  const doc = await io.read(`models-source/${conf.file}`);
  const scene = doc.getRoot().listScenes()[0];
  const meshes = [];
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  scene.traverse((node) => {
    const mesh = node.getMesh();
    if (!mesh) return;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue;
      const attr = prim.getAttribute('POSITION');
      if (!attr) continue;
      const count = attr.getCount();
      const pos = new Float64Array(count * 3);
      const v = [0, 0, 0];
      const mlo = [Infinity, Infinity, Infinity];
      const mhi = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < count; i++) {
        attr.getElement(i, v);
        const w = orient(
          conf.nose,
          m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
          m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
          m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
        );
        for (let k = 0; k < 3; k++) {
          pos[i * 3 + k] = w[k];
          mlo[k] = Math.min(mlo[k], w[k]);
          mhi[k] = Math.max(mhi[k], w[k]);
          lo[k] = Math.min(lo[k], w[k]);
          hi[k] = Math.max(hi[k], w[k]);
        }
      }
      const idxAcc = prim.getIndices();
      const index = idxAcc ? Uint32Array.from(idxAcc.getArray()) : Uint32Array.from({ length: count }, (_, i) => i);
      meshes.push({ node, prim, pos, index, lo: mlo, hi: mhi });
    }
  });
  return { meshes, lo, hi, asset: doc.getRoot().getAsset().extras ?? {} };
}

function weld(positions, index, grid) {
  const map = new Map();
  const out = [];
  const remap = new Int32Array(positions.length / 3);
  for (let i = 0; i < remap.length; i++) {
    const key = `${Math.round(positions[i * 3] / grid)},${Math.round(positions[i * 3 + 1] / grid)},${Math.round(positions[i * 3 + 2] / grid)}`;
    let id = map.get(key);
    if (id === undefined) {
      id = out.length / 3;
      map.set(key, id);
      out.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    }
    remap[i] = id;
  }
  const tris = [];
  for (let t = 0; t < index.length; t += 3) {
    const a = remap[index[t]];
    const b = remap[index[t + 1]];
    const c = remap[index[t + 2]];
    if (a !== b && b !== c && a !== c) tris.push(a, b, c);
  }
  return { positions: Float32Array.from(out), index: Uint32Array.from(tris) };
}

function compact(positions, index) {
  const map = new Map();
  const out = [];
  const idx = new Uint32Array(index.length);
  index.forEach((v, i) => {
    let id = map.get(v);
    if (id === undefined) {
      id = out.length / 3;
      map.set(v, id);
      out.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
    }
    idx[i] = id;
  });
  return { positions: Float32Array.from(out), index: idx };
}

// Crease lines: edges where two faces meet at a sharp angle, plus open borders.
function creaseEdges(positions, index, degrees, minLen) {
  const cos = Math.cos((degrees * Math.PI) / 180);
  const N = positions.length / 3;
  const edges = new Map();
  const tri = [0, 0, 0];
  for (let t = 0; t < index.length; t += 3) {
    tri[0] = index[t];
    tri[1] = index[t + 1];
    tri[2] = index[t + 2];
    const [a, b, c] = tri;
    const ux = positions[b * 3] - positions[a * 3];
    const uy = positions[b * 3 + 1] - positions[a * 3 + 1];
    const uz = positions[b * 3 + 2] - positions[a * 3 + 2];
    const vx = positions[c * 3] - positions[a * 3];
    const vy = positions[c * 3 + 1] - positions[a * 3 + 1];
    const vz = positions[c * 3 + 2] - positions[a * 3 + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    for (let e = 0; e < 3; e++) {
      const p = tri[e];
      const q = tri[(e + 1) % 3];
      const key = p < q ? p * N + q : q * N + p;
      const hit = edges.get(key);
      if (!hit) edges.set(key, { p, q, nx, ny, nz, count: 1, sharp: false });
      else {
        hit.count++;
        if (hit.nx * nx + hit.ny * ny + hit.nz * nz < cos) hit.sharp = true;
      }
    }
  }
  const out = [];
  for (const e of edges.values()) {
    if (!e.sharp && e.count > 1) continue;
    const len = Math.hypot(positions[e.p * 3] - positions[e.q * 3], positions[e.p * 3 + 1] - positions[e.q * 3 + 1], positions[e.p * 3 + 2] - positions[e.q * 3 + 2]);
    if (len >= minLen) out.push({ p: e.p, q: e.q, len });
  }
  return out;
}

const summary = [];
for (const conf of MODELS) {
  const { meshes, lo, hi, asset } = await collect(conf);
  const longest = hi[0] - lo[0];
  const scale = conf.length / longest;
  const cx = (lo[0] + hi[0]) / 2;
  const cz = (lo[2] + hi[2]) / 2;
  const floor = lo[1];
  const mapY = (y) => (y - floor) * scale;

  // Sort triangles into groups
  const groups = new Map();
  const add = (key, positions, index, meta) => {
    let g = groups.get(key);
    if (!g) {
      g = { key, positions: [], index: [], count: 0, meta };
      groups.set(key, g);
    }
    for (let i = 0; i < index.length; i++) g.index.push(index[i] + g.count);
    for (let i = 0; i < positions.length; i++) g.positions.push(positions[i]);
    g.count += positions.length / 3;
  };
  let dropped = 0;
  for (const m of meshes) {
    const size = Math.hypot(m.hi[0] - m.lo[0], m.hi[1] - m.lo[1], m.hi[2] - m.lo[2]) * scale;
    if (conf.dropBelow && size < conf.dropBelow * conf.length) {
      dropped += m.index.length / 3;
      continue;
    }
    if (conf.ignoreBelow && mapY(m.hi[1]) < conf.ignoreBelow) {
      dropped += m.index.length / 3;
      continue;
    }
    // To output units, centred on the middle of the vehicle and standing on y = 0
    const pos = new Float64Array(m.pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = (m.pos[i] - cx) * scale;
      pos[i + 1] = (m.pos[i + 1] - floor) * scale;
      pos[i + 2] = (m.pos[i + 2] - cz) * scale;
    }
    const base = conf.group(m.node, m.prim);
    const color = conf.color ? m.prim.getMaterial()?.getBaseColorFactor() : null;
    if (conf.wheels?.test(m.node.getName())) {
      // Split by quadrant of each triangle's centre
      const buckets = { fl: [], fr: [], rl: [], rr: [] };
      for (let t = 0; t < m.index.length; t += 3) {
        const [a, b, c] = [m.index[t], m.index[t + 1], m.index[t + 2]];
        const x = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3;
        const z = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
        const midX = conf.axleMid ?? 0;
        buckets[`${x > midX ? 'f' : 'r'}${z > 0 ? 'l' : 'r'}`].push(a, b, c);
      }
      Object.entries(buckets).forEach(([q, tris]) => add(`${base}_${q}`, pos, Uint32Array.from(tris), { base, wheel: q }));
    } else if (conf.bands) {
      const midY = (mapY(m.lo[1]) + mapY(m.hi[1])) / 2;
      const top = mapY(hi[1]);
      const band = Math.min(conf.bands - 1, Math.floor((midY / top) * conf.bands * 1.6));
      add(`${base}_${band}`, pos, m.index, { base, color });
    } else {
      add(base, pos, m.index, { base, color });
    }
  }

  // Share the triangle budget among parts, favouring the bigger ones
  const parts = [...groups.values()];
  const total = parts.reduce((a, g) => a + g.index.length / 3, 0);
  const built = [];
  let lineTotal = 0;
  for (const g of parts) {
    const welded = weld(Float64Array.from(g.positions), Uint32Array.from(g.index), conf.length * 2e-5);
    const count = welded.index.length / 3;
    const target = Math.max(60, Math.round((conf.budget * count) / total));
    let tris = welded.index;
    if (count > target) {
      const [simple] = MeshoptSimplifier.simplify(welded.index, welded.positions, 3, target * 3, 0.05, []);
      tris = simple;
      // Heavily fragmented meshes cannot collapse far along their edges, so cluster them instead
      if (tris.length > target * 3 * 1.25) {
        const [sloppy] = MeshoptSimplifier.simplifySloppy(tris, welded.positions, 3, null, target * 3, conf.sloppyError ?? 0.03);
        tris = sloppy;
      }
    }
    const final = compact(welded.positions, tris);
    if (!final.index.length) continue;
    const edges = creaseEdges(final.positions, final.index, conf.crease, conf.minEdge);
    built.push({ ...g, final, edges });
    lineTotal += edges.length;
  }
  // Too many lines reads as scribble, so keep the longest ones across the whole model
  if (lineTotal > conf.maxLines) {
    const all = built.flatMap((b) => b.edges.map((e) => e.len)).sort((a, b) => b - a);
    const cut = all[conf.maxLines];
    built.forEach((b) => (b.edges = b.edges.filter((e) => e.len >= cut)));
  }

  // Each wheel turns about one shared centre, taken from its tyre and rim together
  const wheelCentres = {};
  for (const b of built) {
    if (!b.meta.wheel) continue;
    const c = (wheelCentres[b.meta.wheel] ??= { lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9] });
    for (let i = 0; i < b.final.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        c.lo[k] = Math.min(c.lo[k], b.final.positions[i + k]);
        c.hi[k] = Math.max(c.hi[k], b.final.positions[i + k]);
      }
    }
  }

  // Write a minimal GLB
  const chunks = [];
  let offset = 0;
  const views = [];
  const accessors = [];
  const pushView = (typed) => {
    const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const pad = (4 - (buf.length % 4)) % 4;
    chunks.push(buf, Buffer.alloc(pad));
    views.push({ buffer: 0, byteOffset: offset, byteLength: buf.length });
    offset += buf.length + pad;
    return views.length - 1;
  };
  const nodes = [];
  const gltfMeshes = [];
  let keptTris = 0;
  let keptLines = 0;
  for (const b of built) {
    const { positions, index } = b.final;
    const vcount = positions.length / 3;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], positions[i + k]);
        max[k] = Math.max(max[k], positions[i + k]);
      }
    }
    const small = vcount < 65535;
    const posAcc = accessors.push({ bufferView: pushView(positions), componentType: 5126, count: vcount, type: 'VEC3', min, max }) - 1;
    const triAcc = accessors.push({ bufferView: pushView(small ? Uint16Array.from(index) : index), componentType: small ? 5123 : 5125, count: index.length, type: 'SCALAR' }) - 1;
    keptTris += index.length / 3;
    // Extras: how this part looks and moves
    const extras = {};
    const name = b.key.replace(/[^A-Za-z0-9_]/g, '_');
    (conf.rules ?? []).forEach(([re, val]) => {
      if (re.test(b.key)) Object.assign(extras, val);
    });
    if (b.meta.color) {
      const ink = inkFromColor(b.meta.color);
      if (ink) extras.tint = ink;
    }
    if (b.meta.wheel) {
      const c = wheelCentres[b.meta.wheel];
      extras.rig = b.meta.wheel[0] === 'f' ? 'wheelF' : 'wheelR';
      extras.pivot = [0, 1, 2].map((k) => +((c.lo[k] + c.hi[k]) / 2).toFixed(4));
    }
    if (extras.fan) {
      extras.rig = 'fan';
      extras.pivot = [0, 1, 2].map((k) => +((min[k] + max[k]) / 2).toFixed(4));
      delete extras.fan;
    }
    gltfMeshes.push({ name, primitives: [{ attributes: { POSITION: posAcc }, indices: triAcc, mode: 4 }] });
    nodes.push({ name, mesh: gltfMeshes.length - 1, extras });
    if (b.edges.length) {
      const seg = new Uint32Array(b.edges.length * 2);
      b.edges.forEach((e, i) => {
        seg[i * 2] = e.p;
        seg[i * 2 + 1] = e.q;
      });
      const lineAcc = accessors.push({ bufferView: pushView(small ? Uint16Array.from(seg) : seg), componentType: small ? 5123 : 5125, count: seg.length, type: 'SCALAR' }) - 1;
      gltfMeshes.push({ name: `${name}__lines`, primitives: [{ attributes: { POSITION: posAcc }, indices: lineAcc, mode: 1 }] });
      nodes.push({ name: `${name}__lines`, mesh: gltfMeshes.length - 1 });
      keptLines += b.edges.length;
    }
  }
  const bin = Buffer.concat(chunks);
  const json = {
    asset: { version: '2.0', generator: 'tools/prepare-models.mjs', extras: asset },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: gltfMeshes,
    buffers: [{ byteLength: bin.length }],
    bufferViews: views,
    accessors,
  };
  let head = Buffer.from(JSON.stringify(json));
  head = Buffer.concat([head, Buffer.alloc((4 - (head.length % 4)) % 4, 0x20)]);
  const h = Buffer.alloc(12);
  h.writeUInt32LE(0x46546c67, 0);
  h.writeUInt32LE(2, 4);
  h.writeUInt32LE(12 + 8 + head.length + 8 + bin.length, 8);
  const c1 = Buffer.alloc(8);
  c1.writeUInt32LE(head.length, 0);
  c1.writeUInt32LE(0x4e4f534a, 4);
  const c2 = Buffer.alloc(8);
  c2.writeUInt32LE(bin.length, 0);
  c2.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(`public/models/${conf.key}.glb`, Buffer.concat([h, c1, head, c2, bin]));
  const mb = (fs.statSync(`public/models/${conf.key}.glb`).size / 1048576).toFixed(2);
  summary.push(`${conf.key}: ${Math.round(total + dropped)} tris in ${meshes.length} meshes -> ${keptTris} tris in ${built.length} parts, ${keptLines} lines, ${mb} MB (dropped ${Math.round(dropped)} tris of tiny fittings)`);
  if (Object.keys(wheelCentres).length) {
    summary.push(`  wheel centres: ${Object.entries(wheelCentres).map(([q, c]) => `${q} ${[0, 1, 2].map((k) => ((c.lo[k] + c.hi[k]) / 2).toFixed(2))}`).join(' | ')}`);
  }
}
console.log(summary.join('\n'));
