// Where players come from: marketing links carry ?ref=<code> (tt TikTok, fb Facebook, yt YouTube, ig Instagram,
// dc Discord, web studio site). The client sends the code in a 'hello' when its socket opens; it also says
// 'invite' for a room link without a ref, and 'direct' for everything else. Per day and code the server counts
// visits (pages opened, once per browser tab) and joined (players who took a seat in a room or a quick match,
// at most once per connection). Kept in <SLAM_DATA or proto/data>/refs.json, 120 days. No IP, no names.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dailyStore, vnDay } from './daily.js';

export const REF_CODES = ['tt', 'fb', 'yt', 'ig', 'dc', 'web', 'invite', 'direct'];

export const DATA_DIR = process.env.SLAM_DATA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
export const REFS_FILE = path.join(DATA_DIR, 'refs.json');

// { day: { ref: { visits, joined } } }
const store = dailyStore(REFS_FILE, { saveEveryMs: Number(process.env.SLAM_REFS_SAVE_MS) || 10000, label: 'refs' });
const bump = (ref, field) => store.bump([ref, field]);
export const { save, snapshot, recent } = store;

// msg: { t: 'hello', ref, visit }. One visit per connection at most; a bad code counts as 'direct'.
export function hello(ws, msg) {
  if (ws.ref) return;
  ws.ref = REF_CODES.includes(msg.ref) ? msg.ref : 'direct';
  if (msg.visit === true) bump(ws.ref, 'visits');
}

// A player from this connection took a new seat.
export function joined(ws) {
  if (!ws?.ref || ws.refJoined) return;
  ws.refJoined = true;
  bump(ws.ref, 'joined');
}

// One line per day for the server log, e.g. "2026-10-17 tt 120/41 fb 30/12 direct 8/3" (visits/joined).
export function summary(day = vnDay()) {
  const entries = Object.entries(snapshot()[day] ?? {});
  return `${day} ${entries.length ? entries.map(([ref, c]) => `${ref} ${c.visits ?? 0}/${c.joined ?? 0}`).join(' ') : '(none)'}`;
}
