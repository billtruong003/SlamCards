// Counters per Vietnam day, kept in one JSON file: { "2026-10-19": { ...nested counts } }.
// Used by refs.js (where players come from) and metrics.js (how the game is played). Counts only:
// no IP, no names, no ids. Saved every few seconds when something changed and on shutdown, through a
// temp file and a rename so a crash never leaves half a file; days past `keepDays` are dropped.
import fs from 'node:fs';
import path from 'node:path';

// Days are Vietnam days (UTC+7), so a post at 20:00 lands on the day it was posted.
export const vnDay = (now = Date.now()) => new Date(now + 7 * 3600e3).toISOString().slice(0, 10);

export function dailyStore(file, { keepDays = 120, saveEveryMs = 10000, label = path.basename(file) } = {}) {
  let counts = {};
  try {
    counts = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`${label}: could not read ${file}: ${err.message}`);
  }
  let dirty = false;

  // bump(['fb', 'visits']) adds 1 to today's counts.fb.visits
  function bump(keys, by = 1) {
    let node = (counts[vnDay()] ??= {});
    for (const key of keys.slice(0, -1)) node = (node[key] ??= {});
    const last = keys[keys.length - 1];
    node[last] = (node[last] ?? 0) + by;
    dirty = true;
  }

  function save() {
    if (!dirty) return;
    dirty = false;
    const days = Object.keys(counts).sort();
    for (const day of days.slice(0, Math.max(0, days.length - keepDays))) delete counts[day];
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(counts, null, 1));
      fs.renameSync(`${file}.tmp`, file);
    } catch (err) {
      console.error(`${label}: could not save ${err.message}`);
    }
  }
  setInterval(save, saveEveryMs).unref();

  // the last `days` days, newest last
  const recent = (days = 7) => Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-days));

  return { bump, save, snapshot: () => counts, recent, today: () => counts[vnDay()] ?? {} };
}

// Which bucket a value falls in: buckets [5, 15, 30] gives '<5', '5-15', '15-30', '30+'.
export function bucket(value, edges) {
  if (value < edges[0]) return `<${edges[0]}`;
  for (let i = 1; i < edges.length; i++) if (value < edges[i]) return `${edges[i - 1]}-${edges[i]}`;
  return `${edges[edges.length - 1]}+`;
}
