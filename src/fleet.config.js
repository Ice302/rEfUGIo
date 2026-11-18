// The vehicles. Source files live in models-source/, and `npm run models` turns them into the
// light files in public/models/. To change a vehicle, edit tools/prepare-models.mjs, run that
// command, and adjust the settings here.
//
// src:       the web-ready file. Set to null to fall back to the code-built placeholder.
// pose:      resting camera. yaw 0 looks at the side, positive turns toward the nose.
// floor:     height of the road or waterline, in the file's units.
// kind:      which motion the vehicle gets: car, plane or ship.
//
// Credits for each model are in src/content.js, and they must stay on the page.

export const fleet = {
  car: {
    name: 'Porsche 935 K3',
    kind: 'car',
    env: 'road',
    src: 'models/car.glb',
    edgeAngle: 30,
    spin: 0,
    pose: { yaw: 0.78, pitch: 0.24, zoom: 1.0 },
  },
  plane: {
    name: 'Boeing 787-9',
    kind: 'plane',
    env: 'air',
    src: 'models/plane.glb',
    edgeAngle: 30,
    spin: 0,
    pose: { yaw: 0.88, pitch: 0.42, zoom: 0.92 },
  },
  ship: {
    name: 'RMS Queen Mary',
    kind: 'ship',
    env: 'sea',
    floor: 0.287,
    lineScale: 0.55,
    explodeScale: 0.8,
    src: 'models/ship.glb',
    edgeAngle: 30,
    spin: 0,
    pose: { yaw: 0.56, pitch: 0.2, zoom: 1.02 },
  },
};
