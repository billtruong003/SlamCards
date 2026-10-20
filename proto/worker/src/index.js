// The progress store (Phase 2, 2.01): a Cloudflare Worker over D1 (schema in migrations/). Only the
// game server talks to it, every request signed (../../src/api-sign.js); players never reach it.
//   POST /v1/seen   { device }                          -> { coins, xp }  (adds the device if new)
//   POST /v1/ledger { device, coins, xp, reason, ref }  -> { applied, coins, xp }
//        a ref already in the ledger changes nothing (applied: false); 409 'funds' when the device
//        cannot pay, 404 'unknown' for a device never seen
//   GET  /health                                        -> { ok: true }  (no signature)
// Once a day (cron in wrangler.jsonc) devices not seen for KEEP_DAYS go, unless linked to an account.
import { MAX_SKEW_MS, sign, sameText } from '../../src/api-sign.js';

export const KEEP_DAYS = 30;
const DAY_MS = 86400000;
const BODY_MAX = 4096;
const DEVICE = /^[A-Za-z0-9_-]{16}$/;
const REASON = /^[a-z]{2,16}$/;
const REF = /^[A-Za-z0-9_:.-]{1,80}$/;
const AMOUNT_MAX = 1000000;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const isAmount = (n) => Number.isInteger(n) && Math.abs(n) <= AMOUNT_MAX;

async function signedBody(request, env) {
  const body = await request.text();
  if (body.length > BODY_MAX || !env.API_KEY) return null;
  const time = Number(request.headers.get('x-slam-time'));
  if (!Number.isFinite(time) || Math.abs(Date.now() - time) > MAX_SKEW_MS) return null;
  if (!sameText(await sign(env.API_KEY, time, body), request.headers.get('x-slam-sig'))) return null;
  try { return JSON.parse(body); } catch { return null; }
}

async function seen(db, { device }, now) {
  if (!DEVICE.test(device ?? '')) return json(400, { error: 'device' });
  const row = await db.prepare(`INSERT INTO devices (id, created, last_seen) VALUES (?1, ?2, ?2)
    ON CONFLICT (id) DO UPDATE SET last_seen = excluded.last_seen RETURNING coins, xp`).bind(device, now).first();
  return json(200, row);
}

async function ledger(db, { device, coins = 0, xp = 0, reason, ref }, now) {
  if (!DEVICE.test(device ?? '') || !isAmount(coins) || !isAmount(xp) || xp < 0 || !REASON.test(reason ?? '') || !REF.test(ref ?? '')) {
    return json(400, { error: 'bad' });
  }
  let applied;
  try {
    const result = await db.prepare(`INSERT INTO ledger (ref, device, coins, xp, reason, at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (ref) DO NOTHING`).bind(ref, device, coins, xp, reason, now).run();
    applied = result.meta.changes > 0;
  } catch (err) {
    if (/CHECK constraint/i.test(err.message)) return json(409, { error: 'funds' });
    if (/FOREIGN KEY/i.test(err.message)) return json(404, { error: 'unknown' });
    throw err;
  }
  const row = await db.prepare('SELECT coins, xp FROM devices WHERE id = ?').bind(device).first();
  return row ? json(200, { applied, ...row }) : json(404, { error: 'unknown' });
}

// Devices not seen for KEEP_DAYS and not linked to an account, with their ledger rows.
export async function prune(db, now) {
  const before = now - KEEP_DAYS * DAY_MS;
  const [, gone] = await db.batch([
    db.prepare('DELETE FROM ledger WHERE device IN (SELECT id FROM devices WHERE account IS NULL AND last_seen < ?)').bind(before),
    db.prepare('DELETE FROM devices WHERE account IS NULL AND last_seen < ?').bind(before),
  ]);
  return gone.meta.changes;
}

const ROUTES = { '/v1/seen': seen, '/v1/ledger': ledger };

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/health') return json(200, { ok: true });
    const route = ROUTES[pathname];
    if (!route) return json(404, { error: 'route' });
    if (request.method !== 'POST') return json(405, { error: 'method' });
    const body = await signedBody(request, env);
    if (!body) return json(401, { error: 'signature' });
    return route(env.DB, body, Date.now());
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(prune(env.DB, Date.now()).then((n) => console.log(`[prune] ${n} device(s) gone`)));
  },
};
