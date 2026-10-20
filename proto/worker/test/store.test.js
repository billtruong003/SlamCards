// The progress store (src/index.js) against a local D1 (wrangler's getPlatformProxy, the schema from
// migrations/ applied first): signatures, devices, the ledger's refs and balances, pruning.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy } from 'wrangler';
import worker, { prune, KEEP_DAYS } from '../src/index.js';
import { sign } from '../../src/api-sign.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'test-key';
const DEVICE = 'AAAAAAAAAAAAAAAA';
let proxy;
let env;

before(async () => {
  const store = fs.mkdtempSync(path.join(os.tmpdir(), 'slam-d1-'));
  execFileSync(process.execPath, [path.join(DIR, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'migrations', 'apply', 'slam-cards', '--local', '--persist-to', store], { cwd: DIR, stdio: 'ignore', env: { ...process.env, CI: '1' } });
  proxy = await getPlatformProxy({ configPath: path.join(DIR, 'wrangler.jsonc'), persist: { path: path.join(store, 'v3') } });
  env = { DB: proxy.env.DB, API_KEY: KEY };
});
after(() => proxy?.dispose());

async function call(route, body, { key = KEY, time = Date.now() } = {}) {
  const text = JSON.stringify(body);
  const res = await worker.fetch(new Request(`https://store.test${route}`, {
    method: 'POST', body: text, headers: { 'x-slam-time': String(time), 'x-slam-sig': await sign(key, time, text) },
  }), env);
  return { status: res.status, body: await res.json() };
}

test('only signed, fresh requests get in', async () => {
  assert.equal((await call('/v1/seen', { device: DEVICE }, { key: 'wrong' })).status, 401);
  assert.equal((await call('/v1/seen', { device: DEVICE }, { time: Date.now() - 120000 })).status, 401, 'too old');
  const res = await worker.fetch(new Request('https://store.test/v1/seen', { method: 'POST', body: '{}' }), env);
  assert.equal(res.status, 401, 'no signature');
  assert.equal((await worker.fetch(new Request('https://store.test/health'), env)).status, 200);
});

test('a device is added once, then seen again', async () => {
  assert.deepEqual((await call('/v1/seen', { device: DEVICE })).body, { coins: 0, xp: 0 });
  assert.equal((await call('/v1/seen', { device: 'short' })).status, 400);
  assert.deepEqual((await call('/v1/seen', { device: DEVICE })).body, { coins: 0, xp: 0 });
});

test('the ledger pays once per ref and never below zero', async () => {
  const pay = { device: DEVICE, coins: 120, xp: 100, reason: 'match', ref: 'm:ABCD:1:black' };
  assert.deepEqual((await call('/v1/ledger', pay)).body, { applied: true, coins: 120, xp: 100 });
  assert.deepEqual((await call('/v1/ledger', pay)).body, { applied: false, coins: 120, xp: 100 }, 'sent twice, paid once');
  const buy = { device: DEVICE, coins: -200, reason: 'pet', ref: 'pet:1' };
  assert.deepEqual(await call('/v1/ledger', buy), { status: 409, body: { error: 'funds' } });
  assert.deepEqual((await call('/v1/ledger', { ...buy, coins: -100 })).body, { applied: true, coins: 20, xp: 100 });
  assert.equal((await call('/v1/ledger', { ...pay, device: 'BBBBBBBBBBBBBBBB', ref: 'x' })).status, 404, 'never seen');
  assert.equal((await call('/v1/ledger', { ...pay, xp: -1, ref: 'y' })).status, 400, 'xp only grows');
  assert.equal((await call('/v1/ledger', { ...pay, reason: 'DROP TABLE', ref: 'z' })).status, 400);
});

test('devices not seen for 30 days go, with their ledger', async () => {
  await call('/v1/seen', { device: 'CCCCCCCCCCCCCCCC' });
  await call('/v1/ledger', { device: 'CCCCCCCCCCCCCCCC', coins: 5, reason: 'gift', ref: 'gift:c' });
  assert.equal(await prune(env.DB, Date.now() + (KEEP_DAYS - 1) * 86400000), 0, 'not yet');
  assert.equal(await prune(env.DB, Date.now() + (KEEP_DAYS + 1) * 86400000), 2);
  const left = await env.DB.prepare('SELECT COUNT(*) AS n FROM ledger').first();
  assert.equal(left.n, 0);
});
