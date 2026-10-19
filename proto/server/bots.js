// Computer players for quick matches when nobody else is around: they look and play like people
// (a name a kid would pick, their own gear, a few seconds to think, an aim that is sometimes off),
// so a lone player gets a match at once instead of an empty queue. The server decides what a bot
// does; the physics of its slam runs in a human player's browser, like every slam (server.js
// startSlam), and goes through the same check (slam-check.js).
import { pointOnCard } from '../src/rules.js';
import { TUNE } from '../src/config.js';
import { PETS, DEP_IDS, defaultDepColors } from '../src/catalog.js';

// Nicknames in the style players give themselves (two never share a room: uniqueName adds a number).
const NAMES = [
  'Tí Sún', 'Cu Tèo', 'Bé Na', 'Su Hào', 'Bống', 'Mít Ướt', 'Bin Bin', 'Gấu Mập', 'Cò Hương', 'Bơ',
  'Khoai Lang', 'Na Na', 'Tôm Tít', 'Bắp', 'Đậu Nhỏ', 'Long 2k12', 'Minh Béo', 'Hà My', 'Tuấn Kiệt', 'Ken',
  'Chuột Nhắt', 'Xoài', 'Mèo Ú', 'Bé Bi', 'Nhím', 'Sóc Nâu', 'Cún Con', 'Kẹo Dẻo', 'Bông', 'Phở Bò',
];

export const botName = (random = Math.random) => NAMES[Math.floor(random() * NAMES.length)];

// A bot's gear: any pet and slipper (card colour from the seat, like a player who never chose).
export function botLook(random = Math.random) {
  const dep = DEP_IDS[Math.floor(random() * DEP_IDS.length)];
  return { pet: PETS[Math.floor(random() * PETS.length)], dep, depColors: defaultDepColors(dep), cardColor: null };
}

// How long a bot "thinks" on its turn, kept well inside the turn's time.
export const thinkMs = (turnMs, random = Math.random) => Math.min(3000 + random() * 9000, turnMs * 0.6);
// Rock-paper-scissors and "go first?" answers come quicker.
export const quickMs = (random = Math.random) => 900 + random() * 2100;

// Where a bot slaps. Like a player who knows the trick: behind its own card, on the side away from the
// nearest enemy, so the card flips toward it; sometimes anywhere in reach. `skill` (0..1) is how often
// it uses the trick and how steady its hand is. Never on a card, always in reach (the server's own
// cleanImpact and hand shake apply after this, as for a person).
export function chooseAim({ cards, alive, seat, forced, skill }, random = Math.random) {
  const mine = cards[seat].p;
  const reach = forced ? TUNE.forcedRadius : TUNE.reachRadius;
  const enemies = alive.filter((s) => s !== seat).map((s) => cards[s].p);
  const nearest = enemies.sort((a, b) => Math.hypot(a[0] - mine[0], a[2] - mine[2]) - Math.hypot(b[0] - mine[0], b[2] - mine[2]))[0];
  const onACard = (x, z) => alive.some((s) => pointOnCard(cards[s], x, z, TUNE.cardMargin));
  for (let tries = 0; tries < 30; tries++) {
    let angle;
    let radius;
    if (nearest && random() < 0.35 + skill * 0.55) {
      const wobble = (random() - 0.5) * (1.2 - skill);
      angle = Math.atan2(nearest[2] - mine[2], nearest[0] - mine[0]) + Math.PI + wobble;
      radius = Math.min(reach, 0.85 + random() * 0.9);
    } else {
      angle = random() * Math.PI * 2;
      radius = Math.min(reach, 0.75 + random() * (reach - 0.75));
    }
    const x = mine[0] + Math.cos(angle) * radius;
    const z = mine[2] + Math.sin(angle) * radius;
    if (!onACard(x, z)) return { aim: { x, z }, type: random() < 0.75 ? 'flat' : 'tilt' };
  }
  return null; // boxed in: the caller passes the turn
}
