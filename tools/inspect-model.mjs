// Prints a model's size, world-space bounds, materials and credit fields.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  const asset = root.getAsset();
  console.log(`\n== ${file}`);
  console.log('credit fields:', JSON.stringify(asset.extras ?? {}), 'generator:', asset.generator);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const byMat = new Map();
  let drawn = 0;
  const sizes = [];
  for (const scene of root.listScenes()) {
    scene.traverse((node) => {
      const mesh = node.getMesh();
      if (!mesh) return;
      const m = node.getWorldMatrix();
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (!pos) continue;
        const idx = prim.getIndices();
        const tris = (idx ? idx.getCount() : pos.getCount()) / 3;
        drawn += tris;
        const name = prim.getMaterial()?.getName() ?? 'none';
        const bm = byMat.get(name) ?? { tris: 0, nodes: 0, color: prim.getMaterial()?.getBaseColorFactor() };
        bm.tris += tris;
        bm.nodes += 1;
        byMat.set(name, bm);
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        const v = [0, 0, 0];
        const step = Math.max(1, Math.floor(pos.getCount() / 400));
        for (let i = 0; i < pos.getCount(); i += step) {
          pos.getElement(i, v);
          const w = [0, 1, 2].map((k) => m[k] * v[0] + m[k + 4] * v[1] + m[k + 8] * v[2] + m[k + 12]);
          w.forEach((c, k) => {
            lo[k] = Math.min(lo[k], c);
            hi[k] = Math.max(hi[k], c);
            min[k] = Math.min(min[k], c);
            max[k] = Math.max(max[k], c);
          });
        }
        sizes.push({ d: Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), tris });
      }
    });
  }
  console.log('world bounds min', min.map((n) => +n.toFixed(2)), 'max', max.map((n) => +n.toFixed(2)), 'size', max.map((n, i) => +(n - min[i]).toFixed(2)));
  console.log('triangles drawn', Math.round(drawn));
  const longest = Math.max(...max.map((n, i) => n - min[i]));
  for (const f of [0.002, 0.005, 0.01, 0.02, 0.05]) {
    const small = sizes.filter((s) => s.d < longest * f);
    console.log(`  parts under ${f * 100}% of length: ${small.length} of ${sizes.length}, holding ${Math.round(small.reduce((a, s) => a + s.tris, 0))} triangles`);
  }
  console.log('materials:');
  [...byMat.entries()].sort((a, b) => b[1].tris - a[1].tris).forEach(([k, v]) => console.log(`  ${k.padEnd(34)} ${String(Math.round(v.tris)).padStart(9)} tris  ${String(v.nodes).padStart(5)} draws  colour ${(v.color || []).map((c) => c.toFixed(2)).join(',')}`));
}
