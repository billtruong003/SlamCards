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

function session(fn) {
  try { return fn(sessionStorage); } catch { return null; } // private mode, storage blocked
}

const ref = typeof location === 'undefined' ? 'direct' : refFrom(location.search, session((s) => s.getItem(REF_KEY)));
if (MARKETING_REFS.includes(ref)) session((s) => s.setItem(REF_KEY, ref));
let visitSent = false;

// The first message on every new socket. `visit` is true once per tab (a reload is not a new visit).
export function helloMessage() {
  const visit = !visitSent && !session((s) => s.getItem(VISIT_KEY));
  visitSent = true;
  if (visit) session((s) => s.setItem(VISIT_KEY, '1'));
  return { t: 'hello', ref, visit };
}
