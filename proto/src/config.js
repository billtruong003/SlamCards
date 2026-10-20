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

// Ads (src/ads.js). Off unless the server is started with SLAM_ADSENSE_CLIENT=ca-pub-<16 digits>;
// the id is not kept here so the same build runs with and without ads. Two placements (Bill, Q3,
// 20/10): the page load, and a banner beside a friends' room lobby on wide screens; both only for a
// player who has finished `minMatches` matches, never with ?room= in the first address (an invite
// link, or a reload back into a seat), so a live turn is never interrupted.
export const ADS = {
  lobbySlot: '1312678633', // the AdSense display unit "DepLao lobby banner" (responsive)
  minMatches: 2,           // a new player's first matches (an invited friend's first session) stay ad-free
  matchesPerAd: 3,         // an ad is due after this many finished matches...
  minutesPerAd: 5,         // ...or this long since the last one
  floorMinutes: 2,         // and never sooner than this after the last one, whatever the count
  frequencyHint: '120s',   // Google's own cap (data-ad-frequency-hint); 120s is its default
  safetyMs: 60000,         // sound comes back after this even if the ad script never answers
};
