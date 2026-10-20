// Computer players for quick matches when nobody else is around: they look and play like people
// (a name a kid would pick, their own gear, a moment to think, a hand that is not perfect), so a
// lone player gets a match at once instead of an empty queue. The server decides what a bot does;
// the physics of its slam runs in a human player's browser, like every slam (server.js startSlam),
// and goes through the same check (slam-check.js).
//
// A bot plays with its head (task B.04): before slapping it tries a couple of dozen slams on the
// server's copy of the table (sim.js, the browser's own physics), with the wind of the turn and a
// hand as unsteady as the real one, scores where the cards end, and picks one. How good it is comes
// from its persona: how far down the list of good slams it may pick, how much it fears knocking a
// card off the table, how long it thinks.
import { pointOnCard, judge, isFaceUp } from '../src/rules.js';
import { TUNE } from '../src/config.js';
import { PETS, DEP_IDS, defaultDepColors } from '../src/catalog.js';
import { runSlam } from '../src/physics.js';

// think: ms before slapping (min, max). pick: share of the ranked slams it may choose from (0: always
// the best). fallFear: weight of a card leaving the table (the slammer is out). aimError: extra wobble
// of its own on top of everyone's hand shake, in table units. tilt: how often it considers a tilted slam.
export const PERSONAS = {
  quick: { think: [900, 2000], pick: 0.2, fallFear: 1, aimError: 0.12, tilt: 0.4 }, // Nhanh tay
  fox: { think: [1800, 3500], pick: 0, fallFear: 1.5, aimError: 0.04, tilt: 0.6 }, // Cáo già
  wild: { think: [800, 1800], pick: 0.12, fallFear: 0.3, aimError: 0.15, tilt: 0.25 }, // Liều
  rookie: { think: [1500, 3500], pick: 0.55, fallFear: 0.8, aimError: 0.3, tilt: 0.3 }, // Gà mới
};

// Nicknames in the style players give themselves, each with the way that "kid" plays, so a name
// met again plays the same (two never share a room: uniqueName adds a number).
const NAMES = {
  quick: ['Tí Sún', 'Cu Tèo', 'Bin Bin', 'Long 2k12', 'Tôm Tít', 'Ken', 'Xoài', 'Sóc Nâu'],
  fox: ['Su Hào', 'Gấu Mập', 'Minh Béo', 'Tuấn Kiệt', 'Cò Hương', 'Nhím', 'Phở Bò'],
  wild: ['Bống', 'Bắp', 'Đậu Nhỏ', 'Chuột Nhắt', 'Mèo Ú', 'Kẹo Dẻo', 'Khoai Lang'],
  rookie: ['Bé Na', 'Mít Ướt', 'Bơ', 'Na Na', 'Hà My', 'Bé Bi', 'Cún Con', 'Bông'],
};

const pickOne = (list, random) => list[Math.floor(random() * list.length)];

// Who a player meets, by how many matches they have played (their browser says): a newcomer meets
// mostly beatable bots and wins most of the time; someone who keeps playing meets harder ones.
const MIX = [
  { upTo: 2, weights: { rookie: 0.45, wild: 0.3, quick: 0.25, fox: 0 } },
  { upTo: 9, weights: { rookie: 0.25, wild: 0.25, quick: 0.3, fox: 0.2 } },
  { upTo: Infinity, weights: { rookie: 0.1, wild: 0.2, quick: 0.35, fox: 0.35 } },
];
export function pickPersona(played = 0, random = Math.random) {
  const { weights } = MIX.find((m) => played <= m.upTo);
  let roll = random();
  for (const [persona, w] of Object.entries(weights)) {
    roll -= w;
    if (roll < 0) return persona;
  }
  return 'quick';
}

export const botName = (persona, random = Math.random) => pickOne(NAMES[persona], random);

// A bot's gear: any pet and slipper (card colour from the seat, like a player who never chose).
export function botLook(random = Math.random) {
  const dep = pickOne(DEP_IDS, random);
  return { pet: pickOne(PETS, random), dep, depColors: defaultDepColors(dep), cardColor: null };
}

// How long a bot "thinks" on its turn (B.01: 1-3.5 s, people played 3-12 s with the old bots).
export function thinkMs(persona, turnMs, random = Math.random) {
  const [min, max] = PERSONAS[persona].think;
  return Math.min(min + random() * (max - min), turnMs * 0.5);
}
// Rock-paper-scissors and "go first?" answers come quicker.
export const quickMs = (random = Math.random) => 700 + random() * 1300;

const TRIES = 24; // aims tried per turn, once each
const FINALISTS = 6; // the best of them, tried again
const MORE = 3; // more hand shakes and spin luck for each finalist
const EDGE_SAFE = 1.2; // a card closer than this to the table's edge is in danger
const PASS = -15; // a slap that moves nothing: the next turn is forced into the small ring
const APPROACH = 20; // worth of closing in on an enemy, whatever the faces (a capture needs it)
const STRIKING = 2.5; // close enough to capture: no more worth in coming closer
const RESTLESS = 24; // slams into a round after which a bot plays as boldly as it ever will

// Where the cards ended, from the slammer's side: a capture is the goal, a card off the table the
// worst (the slammer is out), and in between a card face up near a face-down enemy is good, a face-up
// enemy near its own face-down card is a threat, and a card near the edge is at risk. table: the table
// in play ({ hx, hz }, by the seats at it: it does not shrink when players are out). urge (0..1): how
// long the round has dragged on; like a kid getting restless, the bot then pushes in and fears less.
export function scoreOutcome(cards, seat, alive, persona, table, urge = 0) {
  const result = judge(cards, seat, alive);
  if (result?.reason === 'fall') return -100 * PERSONAS[persona].fallFear * (1 - 0.5 * urge);
  let score = 0;
  for (const c of result?.captures ?? []) score += c.by === seat ? 100 : c.victim === seat ? -120 : 10;
  if (result?.eliminated.includes(seat)) return score;
  const mine = cards[seat];
  const up = isFaceUp(mine);
  if (up) score += 10;
  for (const other of alive) {
    if (other === seat || result?.eliminated.includes(other)) continue;
    const near = Math.max(0, 1 - Math.hypot(cards[other].p[0] - mine.p[0], cards[other].p[2] - mine.p[2]) / TUNE.threatRange);
    const otherUp = isFaceUp(cards[other]);
    // a face-down enemy is prey for a face-up card, wherever it lies (closer is better): with every
    // card face up nobody can capture, and bots used to wait there for dozens of slams
    if (up && !otherUp) score += 15 + 25 * near;
    if (!up && otherUp) score -= 30 * (1 - 0.6 * urge) * near;
    // closing in counts until striking distance; past it, sitting close is worth nothing by itself
    // (bots used to huddle there, every card face up, and nobody could capture)
    const d = Math.hypot(cards[other].p[0] - mine.p[0], cards[other].p[2] - mine.p[2]);
    score += APPROACH * (1 + 2 * urge) * Math.min(1, Math.max(0, (TUNE.threatRange - d) / (TUNE.threatRange - STRIKING)));
  }
  const { hx, hz } = table;
  const margin = Math.min(hx - Math.abs(mine.p[0]), hz - Math.abs(mine.p[2]));
  if (margin < EDGE_SAFE) score -= (EDGE_SAFE - margin) * 15;
  return score;
}

// The aims worth a try. A third aimed with intent, the trick people learn: behind the bot's card,
// away from an enemy, so the card flies toward it (a capture needs that). A third beside an enemy's
// card in reach, to flip it face down (prey for a face-up card). The rest all around the bot's card,
// close (a strong push) and farther (a softer one). All in reach, never on a card.
function candidates({ cards, alive, seat, forced, persona }, random) {
  const mine = cards[seat].p;
  const fullReach = forced ? TUNE.forcedRadius : TUNE.reachRadius;
  const reach = Math.min(fullReach, 2.4);
  const onACard = (x, z) => alive.some((s) => pointOnCard(cards[s], x, z, TUNE.cardMargin));
  const enemies = alive.filter((s) => s !== seat)
    .map((s) => cards[s].p)
    .sort((a, b) => Math.hypot(a[0] - mine[0], a[2] - mine[2]) - Math.hypot(b[0] - mine[0], b[2] - mine[2]))
    .slice(0, 2);
  const out = [];
  const add = (angle, radius) => {
    const x = mine[0] + Math.cos(angle) * radius;
    const z = mine[2] + Math.sin(angle) * radius;
    if (!onACard(x, z)) out.push({ aim: { x, z }, type: random() < PERSONAS[persona].tilt ? 'tilt' : 'flat' });
  };
  for (let i = 0; enemies.length && out.length < TRIES / 3 && i < TRIES * 2; i++) {
    const [ex, , ez] = enemies[i % enemies.length];
    add(Math.atan2(ez - mine[2], ex - mine[0]) + Math.PI + (random() - 0.5) * 1.1, 0.7 + random() * (reach - 0.7));
  }
  for (let i = 0; enemies.length && out.length < (TRIES * 2) / 3 && i < TRIES * 2; i++) {
    const [ex, , ez] = enemies[i % enemies.length];
    const angle = random() * Math.PI * 2;
    const x = ex + Math.cos(angle) * (0.8 + random() * 0.6);
    const z = ez + Math.sin(angle) * (0.8 + random() * 0.6);
    const d = Math.hypot(x - mine[0], z - mine[2]);
    if (d <= fullReach) add(Math.atan2(z - mine[2], x - mine[0]), d);
  }
  for (let i = 0; out.length < TRIES && i < TRIES * 4; i++) add(((i + random()) / TRIES) * Math.PI * 2, 0.7 + random() * (reach - 0.7));
  return out;
}

// The same landing spread as the server's shakeHand, for trying an aim the way it will really land.
function shaken(aim, random) {
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * TUNE.handShake;
  return { x: aim.x + Math.cos(angle) * radius, z: aim.z + Math.sin(angle) * radius };
}

const breathe = () => new Promise((resolve) => setImmediate(resolve));

// The bot's slam for this turn: { aim, type }, or null when it is boxed in (the caller passes).
// physics: server/sim.js loadPhysics(). roundSlams: slams so far this round (a long round makes it
// bolder). Each aim is tried once, the best few again with more luck (a fair estimate where it
// matters); yields between tries so other rooms keep moving.
export async function planSlam({ physics, seats, cards, alive, seat, forced, wind, persona, roundSlams = 0 }, random = Math.random) {
  const urge = Math.min(1, roundSlams / RESTLESS);
  const tries = candidates({ cards, alive, seat, forced, persona }, random);
  if (!tries.length) return null;
  const attempt = (t) => {
    const impact = shaken(t.aim, random);
    physics.setup(seats);
    physics.setCards(cards);
    if (!physics.slamEffects(impact, t.type).length) return PASS;
    const { final } = runSlam(physics, { seats, cards, impact, type: t.type, wind, random });
    return scoreOutcome(final, seat, alive, persona, physics.table, urge);
  };
  for (const t of tries) {
    t.total = attempt(t);
    t.runs = 1;
    await breathe();
  }
  const rank = () => tries.sort((a, b) => b.total / b.runs - a.total / a.runs);
  for (const t of rank().slice(0, FINALISTS)) {
    for (let k = 0; k < MORE; k++) t.total += attempt(t);
    t.runs += MORE;
    await breathe();
  }
  rank();
  // a good player takes the best; a weaker one one of the top few, the better ones more often
  const pool = Math.max(1, Math.ceil(tries.length * PERSONAS[persona].pick));
  const chosen = tries[Math.floor(random() ** 2 * pool)];
  // and its hand is not quite where its head is (a wobble onto a card stays where it aimed)
  const err = PERSONAS[persona].aimError;
  const off = { x: chosen.aim.x + (random() - 0.5) * 2 * err, z: chosen.aim.z + (random() - 0.5) * 2 * err };
  const aim = alive.some((s) => pointOnCard(cards[s], off.x, off.z, TUNE.cardMargin)) ? chosen.aim : off;
  return { aim, type: chosen.type, expected: chosen.total / chosen.runs };
}
