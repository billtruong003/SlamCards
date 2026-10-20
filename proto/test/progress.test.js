// Devices and the progress store's client (2.01): signed device ids, the keys file, the queue that
// keeps coins until the store has them, and the hello that gives a browser its device.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newDevice, deviceId } from '../server/devices.js';
import { loadKeys } from '../server/keys.js';
import { createProgress } from '../server/progress.js';
import { sign } from '../src/api-sign.js';
import { startServer, connect, sleep } from './harness.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'slam-progress-'));

// A stand-in for the Worker: checks each signature, answers with `answer(route, body)`.
async function fakeStore(key, answer) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let text = '';
    req.on('data', (d) => { text += d; });
    req.on('end', async () => {
      const good = await sign(key, req.headers['x-slam-time'], text) === req.headers['x-slam-sig'];
      const body = JSON.parse(text);
      calls.push({ route: req.url, body, good });
      const [status, reply] = good ? answer(req.url, body) : [401, { error: 'signature' }];
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(reply));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, calls, close: () => server.close() };
}

test('device ids: only this server\'s signature is believed', () => {
  const { id, token } = newDevice('k1');
  assert.match(id, /^[A-Za-z0-9_-]{16}$/);
  assert.equal(deviceId('k1', token), id);
  assert.equal(deviceId('k2', token), null, 'another key');
  assert.equal(deviceId('k1', `${'A'.repeat(16)}${token.slice(16)}`), null, 'another id, same signature');
  assert.equal(deviceId('k1', ''), null);
  assert.equal(deviceId('k1', { toString: () => token }), null);
});

test('keys: a device key is made once and kept', () => {
  const file = path.join(tmp(), 'keys.json');
  const first = loadKeys({}, file);
  assert.match(first.deviceKey, /^[0-9a-f]{64}$/);
  assert.equal(loadKeys({}, file).deviceKey, first.deviceKey);
  assert.equal(first.apiUrl, '', 'the store is off until set');
  assert.equal(loadKeys({ SLAM_API_URL: 'u', SLAM_API_KEY: 'k' }, file).apiKey, 'k');
});

test('progress: coins wait on disk until the store takes them, each sent until answered', async () => {
  let up = false;
  const store = await fakeStore('sk', (route, body) => (!up ? [503, {}] : body.ref === 'bad' ? [409, { error: 'funds' }] : [200, { applied: true }]));
  const file = path.join(tmp(), 'queue.json');
  const logs = [];
  try {
    assert.equal(createProgress({ url: '', key: 'sk', file }), null, 'off without a url');
    const p = createProgress({ url: store.url, key: 'sk', file, log: (l) => logs.push(l) });
    p.add({ device: 'AAAAAAAAAAAAAAAA', coins: 100, xp: 100, reason: 'match', ref: 'm1' });
    p.add({ device: 'AAAAAAAAAAAAAAAA', coins: -500, reason: 'pet', ref: 'bad' });
    await sleep(100);
    assert.equal(p.pending(), 2, 'store down: kept');
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).length, 2, 'and on disk');
    p.stop();

    up = true;
    const again = createProgress({ url: store.url, key: 'sk', file, log: (l) => logs.push(l) }); // a restart
    await sleep(200);
    assert.equal(again.pending(), 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), []);
    assert.ok(store.calls.every((c) => c.good), 'every request signed');
    assert.ok(logs.some((l) => l.includes('bad dropped: 409 funds')));
    again.stop();
  } finally { store.close(); }
});

test('hello: a new browser gets a signed device, a known one keeps it, the store sees both', async () => {
  const store = await fakeStore('sk', (route) => (route === '/v1/seen' ? [200, { coins: 7, xp: 30 }] : [404, {}]));
  const srv = await startServer({}, { SLAM_DATA: tmp(), SLAM_API_URL: store.url, SLAM_API_KEY: 'sk' });
  try {
    const a = await connect(srv.port);
    a.send({ t: 'hello', ref: 'direct', visit: true });
    const { token } = await a.next((m) => m.t === 'device');
    assert.deepEqual(await a.next((m) => m.t === 'profile'), { t: 'profile', coins: 7, xp: 30 });
    a.close();

    const b = await connect(srv.port);
    b.send({ t: 'hello', ref: 'direct', visit: false, device: token });
    await b.next((m) => m.t === 'profile');
    assert.ok(!b.inbox.some((m) => m.t === 'device'), 'kept its device');
    const seen = store.calls.filter((c) => c.route === '/v1/seen').map((c) => c.body.device);
    assert.equal(seen.length, 2);
    assert.equal(seen[0], seen[1]);
    assert.equal(seen[0], token.split('.')[0]);

    const c = await connect(srv.port);
    c.send({ t: 'hello', ref: 'direct', visit: false, device: `${'A'.repeat(16)}.${'0'.repeat(32)}` });
    assert.notEqual((await c.next((m) => m.t === 'device')).token, token, 'a made-up token gets a new device');
  } finally { srv.stop(); store.close(); }
});
