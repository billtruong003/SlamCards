// Shared by client and server: pure math, no three.js.

export const CARD_HALF_W = 0.5;
export const CARD_HALF_T = 0.008;
export const CARD_HALF_D = 0.739; // art is 92 x 136 px
export const FALL_Y = -0.3;
export const ROUNDS_TO_WIN = 2;
export const MAX_PLAYERS = 4;

// Seats in clockwise order. Each seat owns one card style.
export const SEATS = ['black', 'pink', 'blue', 'green'];

// Bigger table for 3-4 players so nobody starts within one slam of a neighbour.
export function tableFor(count) {
  return count <= 2 ? { hx: 6, hz: 3.5 } : { hx: 7.5, hz: 5 };
}

const SPOTS = {
  2: [[-4.5, 0], [4.5, 0]],
  3: [[-5.8, -2.6], [5.8, -2.6], [0, 3.6]],
  4: [[-5.8, 0], [0, -3.6], [5.8, 0], [0, 3.6]],
};

export function quatMul(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function rotate(q, v) {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

const conjugate = ([x, y, z, w]) => [-x, -y, -z, w];

// A point on the table, in a card's own frame (height ignored): the client's aim check and the
// server's hand shake use the same test.
export function pointOnCard(card, x, z, margin = 0) {
  const local = rotate(conjugate(card.q), [x - card.p[0], 0, z - card.p[2]]);
  return Math.abs(local[0]) < CARD_HALF_W + margin && Math.abs(local[2]) < CARD_HALF_D + margin;
}

// The same numbers on every machine for one seed (mulberry32). The server picks a slam's seed only
// after the aim is in, so the slammer cannot re-roll the spin luck until a capture comes up.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isFaceUp = (card) => rotate(card.q, [0, 1, 0])[1] > 0;
export const hasFallen = (card) => card.p[1] < FALL_Y;

export function isOnTop(top, bottom) {
  if (top.p[1] <= bottom.p[1]) return false;
  const rel = [top.p[0] - bottom.p[0], top.p[1] - bottom.p[1], top.p[2] - bottom.p[2]];
  const local = rotate(conjugate(bottom.q), rel);
  return Math.abs(local[0]) < CARD_HALF_W && Math.abs(local[2]) < CARD_HALF_D;
}

// Result of one slam among the cards still alive this round:
// - any card knocked off the table eliminates the slammer, and the other fallen cards go back;
// - otherwise every face-down card under a face-up one is eliminated.
export function judge(cards, slammer, alive) {
  const fallen = alive.filter((seat) => hasFallen(cards[seat]));
  if (fallen.length) {
    return { reason: 'fall', eliminated: [slammer], restore: fallen.filter((seat) => seat !== slammer) };
  }
  const captures = [];
  for (const a of alive) {
    for (const b of alive) {
      if (a !== b && isOnTop(cards[a], cards[b]) && isFaceUp(cards[a]) && !isFaceUp(cards[b])) {
        captures.push({ by: a, victim: b });
      }
    }
  }
  if (!captures.length) return null;
  return { reason: 'capture', eliminated: [...new Set(captures.map((c) => c.victim))], captures };
}

export const PARKED = { p: [0, -50, 0], q: [0, 0, 0, 1] };

export function initialCards(seats, random = Math.random) {
  const faceDown = (yaw) => quatMul([0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], [0, 0, 1, 0]);
  const jitter = () => (random() - 0.5) * 0.6;
  const spots = SPOTS[seats.length];
  return Object.fromEntries(seats.map((seat, i) => [seat, {
    p: [spots[i][0] + jitter(), CARD_HALF_T, spots[i][1] + jitter()],
    q: faceDown(jitter()),
  }]));
}
