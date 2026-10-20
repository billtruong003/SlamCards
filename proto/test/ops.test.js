// Operator controls (server/ops.js): status, drain before a deploy, and what players see meanwhile.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer, connect, lobby, twoPlayerGame, sleep } from './harness.js';

function admin(port, method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function withAdmin(timing = {}) {
  const adminPort = 40000 + Math.floor(Math.random() * 20000);
  const srv = await startServer(timing, { SLAM_ADMIN_PORT: String(adminPort) });
  for (let i = 0; i < 40 && !srv.log().includes('[ops] admin on'); i++) await sleep(25);
  return { srv, adminPort };
}

test('every connection hears which run of the server it reached', async () => {
  const srv = await startServer();
  try {
    const c = await connect(srv.port);
    const hello = await c.next((m) => m.t === 'server');
    assert.match(hello.boot, /^[0-9a-f]{8}$/);
    assert.ok('build' in hello);
  } finally { srv.stop(); }
});

test('status counts rooms in play, lobbies and connected players', async () => {
  const { srv, adminPort } = await withAdmin();
  try {
    const empty = await admin(adminPort, 'GET', '/status');
    assert.equal(empty.status, 200);
    assert.equal(empty.body.playing, 0);
    assert.equal(empty.body.draining, null);
    await lobby(srv.port, 2);
    await twoPlayerGame(srv.port);
    const busy = (await admin(adminPort, 'GET', '/status')).body;
    assert.equal(busy.playing, 1);
    assert.equal(busy.rooms.lobby, 1);
    assert.equal(busy.players, 4);
    assert.equal((await admin(adminPort, 'GET', '/nope')).status, 404);
    assert.equal((await admin(adminPort, 'POST', '/drain?minutes=999')).status, 400);
  } finally { srv.stop(); }
});

test('drain: matches in play go on, nothing new starts, everyone is told; undrain reopens', async () => {
  const { srv, adminPort } = await withAdmin();
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    const [host, guest] = await lobby(srv.port, 2);
    const waiting = await connect(srv.port);
    waiting.send({ t: 'queue', size: 3, name: 'Tèo' });
    await waiting.next((m) => m.t === 'queue');

    const drained = (await admin(adminPort, 'POST', '/drain?minutes=2')).body;
    assert.ok(drained.draining.inMs > 100000);
    assert.equal(drained.queue, 0);
    for (const c of [a, b, host, guest]) {
      const note = await c.next((m) => m.t === 'maintenance');
      assert.equal(note.on, true);
    }
    assert.equal((await waiting.next((m) => m.t === 'error')).code, 'maintenance');

    // the match in play carries on
    a.send({ t: 'slamStart', impact: { x: a.state.cards.black.p[0] + 1, z: a.state.cards.black.p[2] }, type: 'flat' });
    await b.next((m) => m.t === 'playStart');

    // nothing new: create, queue, join a lobby, start
    const late = await connect(srv.port);
    assert.equal((await late.next((m) => m.t === 'maintenance')).on, true, 'a new connection hears it too');
    for (const msg of [{ t: 'create', name: 'X' }, { t: 'queue', name: 'X' }, { t: 'join', code: host.code, name: 'X' }]) {
      late.send(msg);
      assert.equal((await late.next((m) => m.t === 'error')).code, 'maintenance', msg.t);
    }
    guest.send({ t: 'ready', ready: true });
    await host.waitState((s) => s.ready[guest.seat]);
    host.send({ t: 'start' });
    assert.equal((await host.next((m) => m.t === 'notice')).code, 'maintenance');
    assert.equal(host.state.phase, 'lobby', 'the lobby stays, ready for after the update');

    const reopened = (await admin(adminPort, 'POST', '/undrain')).body;
    assert.equal(reopened.draining, null);
    assert.equal((await host.next((m) => m.t === 'maintenance' && !m.on)).on, false);
    host.send({ t: 'start' });
    await host.waitState((s) => s.phase !== 'lobby');
  } finally { srv.stop(); }
});

test('a busy admin port costs the controls, never the game', async () => {
  const blocker = http.createServer().listen(0, '127.0.0.1');
  await new Promise((r) => blocker.once('listening', r));
  const srv = await startServer({}, { SLAM_ADMIN_PORT: String(blocker.address().port) });
  try {
    await sleep(200);
    assert.equal(srv.exited(), false, srv.log());
    const c = await connect(srv.port);
    await c.next((m) => m.t === 'server');
  } finally { srv.stop(); blocker.close(); }
});

// "Báo lỗi" (G6): kept per Vietnam day with the device's own details only; limited per connection.
test('bug reports: saved with clean device details, empty ones refused, a flood limited', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'slam-reports-'));
  const srv = await startServer({}, { SLAM_DATA: data });
  try {
    const c = await connect(srv.port);
    c.send({ t: 'report', text: '   ' });
    assert.equal((await c.next((m) => m.t === 'report')).result, 'empty');
    c.send({ t: 'report', text: 'Bài bay mất\u0000 tiêu', diag: { build: 'abc', room: 'ABCD', ua: 'UA', screen: '390x844@2', lang: 'vi', phase: 'turn', errors: ['x is not defined'], ip: '1.2.3.4', name: 'Bill' } });
    assert.equal((await c.next((m) => m.t === 'report')).result, 'ok');
    c.send({ t: 'report', text: 'lần nữa' });
    assert.equal((await c.next((m) => m.t === 'report')).result, 'limited', 'a minute between two');
    await sleep(200);
    const dir = path.join(data, 'reports');
    const [file] = fs.readdirSync(dir);
    const line = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8').trim());
    assert.equal(line.text, 'Bài bay mất tiêu');
    assert.equal(line.room, 'ABCD');
    assert.deepEqual(line.errors, ['x is not defined']);
    assert.equal(line.ip, undefined, 'nothing about who');
    assert.equal(line.name, undefined);
  } finally { srv.stop(); }
});
