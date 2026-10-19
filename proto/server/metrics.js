// How the game is played, counted per Vietnam day in <SLAM_DATA>/metrics.json (daily.js): counts and
// time buckets only, nothing about who. Read on the admin port (ops.js: GET /metrics?days=7).
//
// Measured here, so exact:
//   queue    { matched | left: { '<5': n, '5-15': n, ... } }   seconds in the quick-match queue
//   matches  { '2p': { n, withBots, minutes: {...}, rounds: {...}, slams: n, ends: { score | disconnect } } }
//   slams    { none | capture | fall | refused | aborted }
//   outWait  { '<15': n, ... }   seconds a knocked-out player waited for the next round or the end
// Reported by clients (a whitelist, each at most once per connection):
//   events   { firstSlam, firstMatch, rulesOpened, tutorialOpened, tutorialDone, tutorialSkipped, tutorialDeclined }
//   active   { '0': n, '1': n, '2': n, '3-7': n, ... }   players on their first visit of the day, by days since
//            their very first visit: day-2 return is active['1'] against active['0'] the day before
import path from 'node:path';
import { dailyStore, bucket } from './daily.js';
import { DATA_DIR } from './refs.js';

const store = dailyStore(path.join(DATA_DIR, 'metrics.json'), { saveEveryMs: Number(process.env.SLAM_REFS_SAVE_MS) || 10000, label: 'metrics' });
export const { save, recent } = store;

export const CLIENT_EVENTS = new Set(['firstSlam', 'firstMatch', 'rulesOpened', 'tutorialOpened', 'tutorialDone', 'tutorialSkipped', 'tutorialDeclined']);
const WAIT_EDGES = [5, 15, 30, 60, 120];
const MINUTE_EDGES = [1, 2, 4, 6, 10, 15];
const OUT_EDGES = [15, 30, 60, 120, 180];
const AGE_EDGES = [3, 7, 14, 30]; // days 0, 1 and 2 are counted one by one

export function queueLeft(waitedMs, matched) {
  store.bump(['queue', matched ? 'matched' : 'left', bucket(waitedMs / 1000, WAIT_EDGES)]);
}

export function slam(outcome) {
  store.bump(['slams', outcome]);
}

export function outWait(ms) {
  store.bump(['outWait', bucket(ms / 1000, OUT_EDGES)]);
}

// A match that reached its end screen: table size, length, rounds played, slams, why it ended.
export function matchEnd({ players, bots = 0, ms, rounds, slams, reason }) {
  const size = `${players}p`;
  store.bump(['matches', size, 'n']);
  if (bots) store.bump(['matches', size, 'withBots']);
  store.bump(['matches', size, 'minutes', bucket(ms / 60000, MINUTE_EDGES)]);
  store.bump(['matches', size, 'rounds', String(rounds)]);
  store.bump(['matches', size, 'slams'], slams);
  store.bump(['matches', size, 'ends', reason]);
}

// msg: { t: 'event', name }. Unknown names and repeats on the same connection are ignored.
export function clientEvent(ws, name) {
  if (!CLIENT_EVENTS.has(name)) return;
  ws.events ??= new Set();
  if (ws.events.has(name)) return;
  ws.events.add(name);
  store.bump(['events', name]);
}

// From the hello: `age` is days since this browser's first visit, sent on its first hello of a day.
export function active(ws, age) {
  if (ws.activeCounted || !Number.isInteger(age) || age < 0 || age > 3650) return;
  ws.activeCounted = true;
  store.bump(['active', age <= 2 ? String(age) : bucket(age, AGE_EDGES)]);
}
