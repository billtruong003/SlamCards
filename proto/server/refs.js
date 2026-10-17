// Where players come from: marketing links carry ?ref=<code> (tt TikTok, fb Facebook, yt YouTube, ig Instagram,
// dc Discord, web studio site). The client sends the code in a 'hello' when its socket opens; it also says
// 'invite' for a room link without a ref, and 'direct' for everything else. Per day and code the server counts
// visits (pages opened, once per browser tab) and joined (players who took a seat in a room or a quick match,
// at most once per connection). Kept in <SLAM_DATA or proto/data>/refs.json, 120 days. No IP, no names.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REF_CODES = ['tt', 'fb', 'yt', 'ig', 'dc', 'web', 'invite', 'direct'];
const KEEP_DAYS = 120;
const SAVE_EVERY_MS = Number(process.env.SLAM_REFS_SAVE_MS) || 10000;

const DATA_DIR = process.env.SLAM_DATA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
export const REFS_FILE = path.join(DATA_DIR, 'refs.json');

// Days are Vietnam days (UTC+7), so a TikTok post at 20:00 lands on the day it was posted.
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

let counts = {};
try {
  counts = JSON.parse(fs.readFileSync(REFS_FILE, 'utf8'));
} catch (err) {
  if (err.code !== 'ENOENT') console.error('refs: could not read', REFS_FILE, err.message);
}
let dirty = false;

function bump(ref, field) {
  const day = today();
  const entry = ((counts[day] ??= {})[ref] ??= { visits: 0, joined: 0 });
  entry[field] += 1;
  dirty = true;
}

export function save() {
  if (!dirty) return;
  dirty = false;
  const days = Object.keys(counts).sort();
  for (const day of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete counts[day];
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(`${REFS_FILE}.tmp`, JSON.stringify(counts, null, 1));
    fs.renameSync(`${REFS_FILE}.tmp`, REFS_FILE);
  } catch (err) {
    console.error('refs: could not save', err.message);
  }
}
setInterval(save, SAVE_EVERY_MS).unref();

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

export const snapshot = () => counts;

// One line per day for the server log, e.g. "2026-10-17 tt 120/41 fb 30/12 direct 8/3" (visits/joined).
export function summary(day = today()) {
  const entries = Object.entries(counts[day] ?? {});
  return `${day} ${entries.length ? entries.map(([ref, c]) => `${ref} ${c.visits}/${c.joined}`).join(' ') : '(none)'}`;
}
