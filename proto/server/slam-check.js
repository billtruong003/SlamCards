// Is a slam the slammer streams one the game's physics could have produced? The slammer's browser
// runs the physics and the server relays it, so without this a client could send any result
// ("my card face up on every other card"). Each frame is checked as it arrives, then the final
// state against the last frame. Cheap on purpose: a few subtractions per card per frame.
//
// What it guarantees: cards move at speeds the slam and gravity allow, only cards the slipper hit
// (or a moving card bumped) move at all, nothing passes through the table or flies off into the sky,
// the slam is no longer than the client's own time cap, and the result is what everyone watched.
// What it does not: a path a client computes with real physics but a fake impulse. The spin luck
// comes from the server's seed (rules.js seededRandom); a full replay check is a later step.
import { CARD_HALF_W, CARD_HALF_D, tableFor } from '../src/rules.js';
import { TUNE } from '../src/config.js';

const FLOATS = 7; // px py pz qx qy qz qw per seat, in room.seats order (world.recordFrame)
const HALF_DIAGONAL = Math.hypot(CARD_HALF_W, CARD_HALF_D);

// Limits, with room above what real slams reach (measured on recorded slams, qa/slam-record.mjs).
export const LIMITS = {
  frames: Math.ceil(TUNE.settle.hardCapSeconds / TUNE.fixedDt) + 6,
  step: 0.45, // farthest a card centre moves in one 1/60 s frame
  turn: 0.8, // largest rotation in one frame, radians (spin tops out near 0.55)
  ceiling: 3.5, // highest a card centre goes
  top: -0.03, // a card centre this low is under the table top
  moved: 0.02, // a card counts as moving once it is this far from where it started...
  movedTurn: 0.05, // ...or turned this much
  reach: TUNE.windRadius + HALF_DIAGONAL + 0.4, // centre distance from the impact a slam can push
  contact: 2 * HALF_DIAGONAL + 0.25, // centre distance at which a moving card can bump another
  match: 0.002, // final against the last frame (both rounded to 4 decimals)
};

const PARKED_BELOW = -10;
// rotation between two quaternions; frames round them to 4 decimals, so they are normalised first
const norm = (q) => Math.hypot(q[0], q[1], q[2], q[3]) || 1;
const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]) / (norm(a) * norm(b))));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const flat = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

// seats: room.seats (frame order); start: room.cards before the slam; impact: {x, z}.
export function createSlamCheck({ seats, start, impact }) {
  const live = seats.filter((s) => start[s].p[1] > PARKED_BELOW);
  const table = tableFor(live.length);
  const overTable = (p) => Math.abs(p[0]) < table.hx - 0.05 && Math.abs(p[2]) < table.hz - 0.05;
  const hit = [impact.x, 0, impact.z];
  // cards the slipper reached are moving from the first frame; the others start still
  const moving = new Set(live.filter((s) => flat(start[s].p, hit) <= LIMITS.reach));
  let previous = Object.fromEntries(seats.map((s) => [s, start[s]]));
  let frames = 0;
  const peak = { step: 0, turn: 0, height: 0 };

  function frame(f) {
    frames += 1;
    if (frames > LIMITS.frames) return `more than ${LIMITS.frames} frames`;
    if (!Array.isArray(f) || f.length !== seats.length * FLOATS || !f.every(Number.isFinite)) return 'bad frame';
    const now = {};
    seats.forEach((s, i) => { now[s] = { p: f.slice(i * FLOATS, i * FLOATS + 3), q: f.slice(i * FLOATS + 3, i * FLOATS + 7) }; });
    for (const s of seats) {
      const card = now[s];
      if (!live.includes(s)) {
        if (card.p[1] > PARKED_BELOW) return `${s} left its parking spot`;
        continue;
      }
      const step = dist(card.p, previous[s].p);
      const turn = angle(card.q, previous[s].q);
      peak.step = Math.max(peak.step, step);
      peak.turn = Math.max(peak.turn, turn);
      peak.height = Math.max(peak.height, card.p[1]);
      if (step > LIMITS.step) return `${s} moved ${step.toFixed(3)} in one frame`;
      if (turn > LIMITS.turn) return `${s} turned ${turn.toFixed(3)} rad in one frame`;
      if (card.p[1] > LIMITS.ceiling) return `${s} flew to y=${card.p[1].toFixed(2)}`;
      // under the table only by falling past an edge: a card can slide back under it on the floor
      // below, but never cross the top inside the table's outline
      const crossed = (card.p[1] < LIMITS.top) !== (previous[s].p[1] < LIMITS.top);
      if (crossed && overTable(card.p) && overTable(previous[s].p)) return `${s} went through the table`;
    }
    // a still card may only start moving when a moving card is close enough to have bumped it
    for (const s of live) {
      if (moving.has(s)) continue;
      const stirred = dist(now[s].p, start[s].p) > LIMITS.moved || angle(now[s].q, start[s].q) > LIMITS.movedTurn;
      if (!stirred) continue;
      const bumped = [...moving].some((m) => flat(now[m].p, now[s].p) <= LIMITS.contact || flat(previous[m].p, now[s].p) <= LIMITS.contact);
      if (!bumped) return `${s} moved with nothing touching it`;
      moving.add(s);
    }
    previous = now;
    return null;
  }

  // The result has to be the last frame everyone watched.
  function end(final) {
    if (!frames) return 'no frames';
    for (const s of seats) {
      const a = final[s];
      const b = previous[s];
      if (dist(a.p, b.p) > LIMITS.match || angle(a.q, b.q) > LIMITS.match * 10) return `${s} final differs from the last frame`;
    }
    return null;
  }

  return { frame, end, stats: () => ({ frames, ...peak }) };
}
