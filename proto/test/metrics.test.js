// Play counts (server/metrics.js, server/daily.js) and the client's returning-day age (src/ref.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServer, connect, twoPlayerGame, faceDown, faceUp, slamTo, sleep } from './harness.js';
import { bucket, vnDay } from '../server/daily.js';
import { returningAge } from '../src/ref.js';

const getJson = (port, path) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path }, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => resolve(JSON.parse(body)));
  }).on('error', reject);
});

async function withAdmin(timing = {}) {
  const adminPort = 40000 + Math.floor(Math.random() * 20000);
  const srv = await startServer(timing, { SLAM_ADMIN_PORT: String(adminPort) });
  for (let i = 0; i < 40 && !srv.log().includes('[ops] admin on'); i++) await sleep(25);
  const today = async () => Object.values((await getJson(adminPort, '/metrics?days=1')).play).at(-1) ?? {};
  return { srv, today };
}

test('buckets and Vietnam days', () => {
  assert.equal(bucket(3, [5, 15, 30]), '<5');
  assert.equal(bucket(5, [5, 15, 30]), '5-15');
  assert.equal(bucket(29.9, [5, 15, 30]), '15-30');
  assert.equal(bucket(300, [5, 15, 30]), '30+');
  assert.equal(vnDay(Date.parse('2026-10-19T16:59:00Z')), '2026-10-19');
  assert.equal(vnDay(Date.parse('2026-10-19T17:00:00Z')), '2026-10-20', 'midnight in Vietnam is 17:00 UTC');
});

test('returning age: the first hello of each day says how many days since the first visit', () => {
  const box = new Map();
  const store = { getItem: (k) => box.get(k) ?? null, setItem: (k, v) => box.set(k, String(v)) };
  const day = (d) => Date.parse(`2026-10-${d}T03:00:00Z`);
  assert.equal(returningAge(store, day(19)), 0, 'first visit');
  assert.equal(returningAge(store, day(19) + 3600e3), null, 'same day: not again');
  assert.equal(returningAge(store, day(20)), 1, 'next day');
  assert.equal(returningAge(store, day(26)), 7);
  assert.equal(returningAge(null, day(27)), null, 'no storage: nothing sent');
});

test('client events: whitelisted, once per connection; the hello age is counted once', async () => {
  const { srv, today } = await withAdmin();
  try {
    const a = await connect(srv.port);
    a.send({ t: 'hello', ref: 'fb', visit: true, age: 1 });
    a.send({ t: 'hello', ref: 'fb', visit: true, age: 1 });
    for (const name of ['firstSlam', 'firstSlam', 'rulesOpened', 'hack', '__proto__']) a.send({ t: 'event', name });
    const b = await connect(srv.port);
    b.send({ t: 'hello', ref: 'direct', visit: true, age: 45 });
    b.send({ t: 'event', name: 'firstSlam' });
    await sleep(150);
    const m = await today();
    assert.deepEqual(m.events, { firstSlam: 2, rulesOpened: 1 });
    assert.deepEqual(m.active, { 1: 1, '30+': 1 });
  } finally { srv.stop(); }
});

test('queue waits: matched and left, the wait kept when the size changes', async () => {
  const { srv, today } = await withAdmin();
  try {
    const a = await connect(srv.port);
    const b = await connect(srv.port);
    const c = await connect(srv.port);
    c.send({ t: 'queue', size: 4, name: 'C' });
    await c.next((m) => m.t === 'queue');
    c.send({ t: 'unqueue' });
    a.send({ t: 'queue', size: 3, name: 'A' });
    await a.next((m) => m.t === 'queue');
    a.send({ t: 'queue', size: 2, name: 'A' }); // changing the size is not leaving
    b.send({ t: 'queue', size: 2, name: 'B' });
    await Promise.all([a.next((m) => m.t === 'joined'), b.next((m) => m.t === 'joined')]);
    await sleep(100);
    const m = await today();
    assert.deepEqual(m.queue, { matched: { '<5': 2 }, left: { '<5': 1 } });
  } finally { srv.stop(); }
});

test('a played match: length, rounds, slams, how it ended, and each slam outcome', async () => {
  const { srv, today } = await withAdmin({ roundEnd: 50 });
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    // whatever comes next: rock-paper-scissors, choosing, or a turn; each slam captures
    for (let step = 0; step < 12 && a.state.phase !== 'matchEnd'; step++) {
      const s = await a.waitState((st) => ['rps', 'choose', 'turn', 'matchEnd'].includes(st.phase), 5000);
      if (s.phase === 'rps' && !s.rpsChosen.black) {
        a.send({ t: 'rps', choice: 'bua' });
        b.send({ t: 'rps', choice: 'keo' });
      } else if (s.phase === 'choose') {
        a.send({ t: 'choose', first: true });
      } else if (s.phase === 'turn') {
        const slammer = s.turn === 'black' ? a : b;
        const other = slammer === a ? b : a;
        await slamTo(slammer, { [slammer.seat]: faceUp(0, 0, 0.024), [other.seat]: faceDown(0, 0) });
        other.send({ t: 'playbackDone' });
        await a.waitState((st) => st.phase === 'roundEnd' || st.phase === 'matchEnd', 3000);
      }
      await a.waitState((st) => st !== s, 5000).catch(() => {});
    }
    const end = await a.waitState((st) => st.phase === 'matchEnd', 5000);
    // the results screen gets the story of the match
    assert.deepEqual(end.result.history.map((r) => [r.round, r.reason]), [[1, 'capture'], [2, 'capture']]);
    assert.ok(end.result.history.every((r) => r.winner && r.eliminated.length === 1));
    assert.equal(end.result.slams, 2);
    assert.ok(end.result.ms > 0);
    const m = await today();
    assert.equal(m.matches['2p'].n, 1);
    assert.equal(m.matches['2p'].slams, 2);
    assert.deepEqual(m.matches['2p'].rounds, { 2: 1 });
    assert.deepEqual(m.matches['2p'].ends, { score: 1 });
    assert.deepEqual(m.matches['2p'].minutes, { '<1': 1 });
    assert.deepEqual(m.slams, { capture: 2 });
  } finally { srv.stop(); }
});

test('bots (B.06): a match with a computer player is counted, and the person who walks out of it', async () => {
  const { srv, today } = await withAdmin({ queueTick: 50, quickStart: 100, roundIntro: 100, rps: 20000 });
  try {
    const me = await connect(srv.port);
    me.send({ t: 'queue', size: 2, name: 'Bill', played: 0 });
    await me.next((m) => m.t === 'queue' && m.state === 'waiting', 2000);
    me.send({ t: 'botsNow' });
    await me.waitState((s) => s.phase === 'rps', 3000);
    me.send({ t: 'leave' });
    await sleep(200);
    const day = await today();
    assert.equal(day.bots?.started, 1);
    assert.equal(day.bots?.left, 1);
  } finally { srv.stop(); }
});
