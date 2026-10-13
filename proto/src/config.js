// Every tunable number of the prototype lives here.
export const TUNE = {
  gravity: -20,
  fixedDt: 1 / 60,
  // Thin cards spinning fast dig into the table; substeps + soft CCD keep them on top.
  substeps: 4,
  softCcd: 0.3,
  tableVisualDrop: 0.01,

  reachRadius: 3.0,
  windRadius: 2.0,
  forcedRadius: 1.4,
  handShake: 0.18,
  cardMargin: 0.08,

  slam: {
    flat: { horizontal: 6.0, vertical: 10.0, spin: 17.0 },
    tilt: { horizontal: 9.5, vertical: 4.5, spin: 24.0 },
    strengthCurve: 1.15,
    spinCurve: 1.3,
    spinRandom: 0.4,
    rollNoise: 0.3,
    yawNoise: 2.0,
  },

  windAccelPerUnit: 0.6,
  airborneHeight: 0.05,

  card: { density: 40, friction: 0.7, restitution: 0.05, linearDamping: 0.35, angularDamping: 0.6 },
  cover: { overlap: 0.9, strength: 0.2 },
  table: { friction: 0.7, restitution: 0.05 },

  settle: { linear: 0.08, angular: 0.2, steps: 10, softCapSeconds: 3.5, hardCapSeconds: 7 },

  net: { chunkSteps: 6, startBuffer: 6, maxBuffer: 24, pingMs: 3000, slowPingMs: 6000 },

  hitstopMs: 70,
  shakeMs: 220,
  shakeAmount: 0.12,
  depDropMs: 140,

  threatRange: 4.6,
};
