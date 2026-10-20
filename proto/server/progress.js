// The progress store's client (2.01): the game server's only way to the Worker (worker/), every
// request signed (src/api-sign.js). Coins and xp are queued and written to <SLAM_DATA>/progress-queue.json
// before they are sent, then sent again every RETRY_MS until the store answers, so a store that is slow
// or down never loses a payment and never holds up a match; a ref makes a second send harmless.
import fs from 'node:fs';
import { sign } from '../src/api-sign.js';

const TIMEOUT_MS = 5000;
const RETRY_MS = 30000;
const QUEUE_MAX = 50000;

// { url, key, file, fetch, log } -> null when the store is off (no url or key)
export function createProgress({ url, key, file, fetch = globalThis.fetch, log = console.log }) {
  if (!url || !key) return null;
  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* none waiting */ }
  let sending = false;

  const saveQueue = () => {
    try { fs.writeFileSync(file, JSON.stringify(queue)); } catch (err) { log(`[progress] queue not saved: ${err.message}`); }
  };

  async function post(route, body) {
    const text = JSON.stringify(body);
    const time = Date.now();
    const res = await fetch(`${url}${route}`, {
      method: 'POST',
      body: text,
      headers: { 'content-type': 'application/json', 'x-slam-time': String(time), 'x-slam-sig': await sign(key, time, text) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }

  // Sends the queue in order; stops at the first answer worth trying again (no answer, 401, 5xx).
  async function flush() {
    if (sending) return;
    sending = true;
    try {
      while (queue.length) {
        let res;
        try { res = await post('/v1/ledger', queue[0]); } catch (err) { log(`[progress] store unreachable: ${err.message}`); break; }
        if (res.status === 401 || res.status >= 500) { log(`[progress] store answered ${res.status}, will retry`); break; }
        if (res.status !== 200) log(`[progress] ${queue[0].ref} dropped: ${res.status} ${res.body.error ?? ''}`);
        queue.shift();
        saveQueue();
      }
    } finally { sending = false; }
  }
  const timer = setInterval(flush, RETRY_MS);
  timer.unref();
  if (queue.length) flush();

  return {
    // the device's coins and xp, adding it if new; null when the store does not answer
    async seen(device) {
      try {
        const res = await post('/v1/seen', { device });
        return res.status === 200 ? res.body : null;
      } catch (err) {
        log(`[progress] seen failed: ${err.message}`);
        return null;
      }
    },
    // { device, coins, xp, reason, ref }: queued, saved, sent
    add(entry) {
      if (queue.length >= QUEUE_MAX) { log(`[progress] queue full, ${entry.ref} dropped`); return; }
      queue.push(entry);
      saveQueue();
      flush();
    },
    pending: () => queue.length,
    flush,
    stop: () => clearInterval(timer),
  };
}
