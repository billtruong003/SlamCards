// Where this player came from, for the server's per-source counts (server/refs.js): ?ref=tt|fb|yt|ig|dc|web
// on marketing links, 'invite' for a room link without one, else 'direct'. Read once when the page loads,
// because joining a room rewrites the address to ?room=CODE; a marketing ref is kept for the tab's session.
export const MARKETING_REFS = ['tt', 'fb', 'yt', 'ig', 'dc', 'web'];

export function refFrom(search, saved = null) {
  const query = new URLSearchParams(search);
  const asked = (query.get('ref') || '').toLowerCase();
  if (MARKETING_REFS.includes(asked)) return asked;
  if (MARKETING_REFS.includes(saved)) return saved;
  return query.has('room') ? 'invite' : 'direct';
}

const REF_KEY = 'slam-ref';
const VISIT_KEY = 'slam-visit';
const FIRST_DAY_KEY = 'slam-first-day';
const LAST_DAY_KEY = 'slam-last-day';

function session(fn) {
  try { return fn(sessionStorage); } catch { return null; } // private mode, storage blocked
}
function device(fn) {
  try { return fn(localStorage); } catch { return null; }
}

// Vietnam days, like the server's counts (server/daily.js).
export const vnDay = (now = Date.now()) => new Date(now + 7 * 3600e3).toISOString().slice(0, 10);

// Days since this browser's first visit, on its first hello of a day (else null), so the server can
// count how many players come back on day 2, day 3...: a number, no id (server/metrics.js active).
export function returningAge(store, now = Date.now()) {
  const today = vnDay(now);
  if (!store || store.getItem(LAST_DAY_KEY) === today) return null;
  const first = store.getItem(FIRST_DAY_KEY) || today;
  store.setItem(FIRST_DAY_KEY, first);
  store.setItem(LAST_DAY_KEY, today);
  return Math.max(0, Math.round((Date.parse(today) - Date.parse(first)) / 86400e3));
}

const ref = typeof location === 'undefined' ? 'direct' : refFrom(location.search, session((s) => s.getItem(REF_KEY)));
if (MARKETING_REFS.includes(ref)) session((s) => s.setItem(REF_KEY, ref));
let visitSent = false;

import { deviceToken } from './device.js';

// The first message on every new socket. `visit` is true once per tab (a reload is not a new visit).
export function helloMessage() {
  const visit = !visitSent && !session((s) => s.getItem(VISIT_KEY));
  visitSent = true;
  if (visit) session((s) => s.setItem(VISIT_KEY, '1'));
  const age = device((s) => returningAge(s));
  const hello = { t: 'hello', ref, visit, device: deviceToken() };
  return age === null ? hello : { ...hello, age };
}
