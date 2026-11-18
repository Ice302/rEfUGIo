// Vector trails behind each vehicle: tyre marks, contrails and wake. Points are emitted at
// a spot on the vehicle, then carried backward along its tail, so a vehicle holding still
// on screen still streams a trail while its surroundings move. A trail belongs to its
// view: when the view leaves the screen the trail goes with it, so no line outlives a scene.
const SPOTS = {
  car: { key: 'skid', life: 0.55, width: 2.2, color: '#111110', anchors: [[-0.365, -0.98, 0.82], [-0.365, -0.98, -0.82]] },
  plane: { key: 'contrail', life: 1.1, width: 1.3, color: '#0a3fdb', dash: [7, 6], anchors: [[-0.39, -0.06, 1], [-0.39, -0.06, -1], [0.13, -0.75, 0.33], [0.13, -0.75, -0.33]] },
  ship: { key: 'wake', life: 1.25, width: 1.1, color: '#111110', anchors: [[-0.98, -0.63, 0.6], [-0.98, -0.63, -0.6], [0.86, -0.63, 0.35], [0.86, -0.63, -0.35]] },
};

export class Trails {
  constructor(stage, fleet) {
    this.stage = stage;
    this.fleet = fleet;
    this.sets = new Map();
  }

  update(dt) {
    if (this.stage.calm || this.stage.low) {
      this.sets.clear();
      return;
    }
    for (const view of this.stage.views) {
      if (!view.active || view.hidden || !view.rect) {
        this.sets.delete(view);
        continue;
      }
      const key = view.to || view.model;
      const spot = SPOTS[this.fleet[key].kind];
      if (!spot) continue;
      let set = this.sets.get(view);
      if (!set || set.key !== key) {
        set = { key, lines: spot.anchors.map(() => []) };
        this.sets.set(view, set);
      }
      const on = view[spot.key] > 0.01;
      spot.anchors.forEach((at, i) => {
        const pts = set.lines[i];
        for (let n = pts.length - 1; n >= 0; n--) pts[n].life -= dt;
        while (pts.length && pts[0].life <= 0) pts.shift();
        const a = this.stage.project(view, at);
        const b = this.stage.project(view, [at[0] - 0.3, at[1], at[2]]);
        if (!a || !b) return;
        const flow = view.speed * dt * 0.42;
        const dx = (b.x - a.x) / 0.3;
        const dy = (b.y - a.y) / 0.3;
        for (const pt of pts) {
          pt.x += dx * flow;
          pt.y += dy * flow;
        }
        if (on) pts.push({ x: a.x, y: a.y, life: spot.life, strength: view[spot.key] });
      });
    }
  }

  draw(layer) {
    const { ctx } = layer;
    let touched = false;
    for (const [view, set] of this.sets) {
      const spot = SPOTS[this.fleet[set.key].kind];
      const color = view.trailColor || spot.color;
      for (const pts of set.lines) {
        if (pts.length < 2) continue;
        if (!touched) {
          layer.touch();
          touched = true;
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = spot.width;
        ctx.lineCap = 'round';
        ctx.setLineDash(spot.dash || []);
        for (let i = 1; i < pts.length; i++) {
          ctx.globalAlpha = Math.max(0, (pts[i].life / spot.life) * pts[i].strength);
          ctx.beginPath();
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
          ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
  }
}
