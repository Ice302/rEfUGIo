// Keeps a vehicle on a curve drawn in screen space. Positions are in normalised device
// coordinates: x from -1 (left) to 1 (right), y from -1 (bottom) to 1 (top). The yaw is
// solved so the vehicle's nose lines up with its direction of travel as seen on screen.
const clamp = (v) => Math.min(1, Math.max(0, v));

export function chainAt(chain, u) {
  const n = (chain.length - 1) / 3;
  const f = clamp(u) * n;
  const i = Math.min(Math.floor(f), n - 1);
  const t = f - i;
  const [a, b, c, d] = [chain[i * 3], chain[i * 3 + 1], chain[i * 3 + 2], chain[i * 3 + 3]];
  const m = 1 - t;
  return [
    m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0],
    m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1],
  ];
}

export function yawFor(tx, ty, pitch) {
  return Math.atan2(-ty / Math.sin(pitch), tx);
}

// Returns a pose for view.path, plus `turn`: how hard the curve is bending here.
export function pathPose(chain, u, aspect, { pitch = 0.3, zoom = 1, slip = 0, blend = 0 } = {}) {
  const d = 0.014;
  const [x, y] = chainAt(chain, u);
  const [x0, y0] = chainAt(chain, u - d);
  const [x1, y1] = chainAt(chain, u + d);
  const ax = (x - x0) * aspect;
  const ay = y - y0;
  const bx = (x1 - x) * aspect;
  const by = y1 - y;
  const tx = (x1 - x0) * aspect;
  const ty = y1 - y0;
  const la = Math.hypot(ax, ay) || 1e-5;
  const lb = Math.hypot(bx, by) || 1e-5;
  const turn = Math.max(-1, Math.min(1, ((ax * by - ay * bx) / (la * lb)) * 5));
  return { x, y, zoom, pitch, blend, turn, yaw: yawFor(tx, ty, pitch) + slip * turn };
}
