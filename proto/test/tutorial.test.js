// The tutorial (task 1.11) on the server: round 1 waits for new players reading the rules, until
// they close them, at most TIMING.reading, never for someone who left; the clips are served in parts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer, lobby, startFrom, sleep, httpGet } from './harness.js';
import { STEPS } from '../src/tutorial.js';

const startedWithLearner = async (srv) => {
  const [host, guest] = await lobby(srv.port, 2);
  guest.send({ t: 'ftue', step: 0, learner: true });
  await startFrom([host, guest]);
  return [host, guest];
};

test('round 1 holds while a learner reads, and goes on as soon as they close the steps', async () => {
  const srv = await startServer({ roundIntro: 100, reading: 20000 });
  try {
    const [host, guest] = await startedWithLearner(srv);
    guest.send({ t: 'ftue', step: 1, learner: true });
    const held = await host.waitState((s) => s.phase === 'roundIntro' && s.remainingMs > 5000, 2000);
    assert.deepEqual(held.reading, [guest.seat], 'the others see who they wait for');
    await sleep(300);
    assert.equal(host.state.phase, 'roundIntro', 'still waiting past the round title');
    guest.send({ t: 'ftue', step: STEPS.length, learner: true });
    await host.waitState((s) => s.players[guest.seat].tutorial === STEPS.length, 1000);
    guest.send({ t: 'ftue', step: 0, learner: false });
    const on = await host.waitState((s) => s.phase === 'rps', 1000);
    assert.deepEqual(on.reading, []);
    assert.match(srv.log(), /reading the rules/);
  } finally { srv.stop(); }
});

test('a learner who never closes the steps holds round 1 for TIMING.reading at most', async () => {
  const srv = await startServer({ roundIntro: 100, reading: 600 });
  try {
    const [host, guest] = await startedWithLearner(srv);
    guest.send({ t: 'ftue', step: 2, learner: true });
    const t0 = Date.now();
    await host.waitState((s) => s.phase === 'rps', 3000);
    assert.ok(Date.now() - t0 >= 500, 'waited for the reader');
  } finally { srv.stop(); }
});

test('nobody to wait for: no learner, or the learner went', async () => {
  const srv = await startServer({ roundIntro: 100, reading: 20000 });
  try {
    const [a, b] = await lobby(srv.port, 2);
    await startFrom([a, b]);
    const t0 = Date.now();
    await a.waitState((s) => s.phase === 'rps', 1500);
    assert.ok(Date.now() - t0 < 1500, 'an ordinary start does not wait');

    const [host, guest] = await startedWithLearner(srv);
    await host.waitState((s) => s.reading?.length === 1, 2000);
    guest.send({ t: 'leave' });
    await host.waitState((s) => s.phase !== 'roundIntro', 1500);
  } finally { srv.stop(); }
});

// Safari plays a video only from a server that answers byte ranges (206); the clips are in dist.
test('the clips are served in parts, with their video type', async () => {
  const clip = new URL('../dist/tutorial/7-forced.mp4', import.meta.url);
  const size = fs.statSync(clip).size;
  const srv = await startServer();
  try {
    const whole = await httpGet(srv.port, '/tutorial/7-forced.mp4');
    assert.equal(whole.status, 200);
    assert.equal(whole.bytes, size);
    assert.equal(whole.headers['content-type'], 'video/mp4');
    assert.equal(whole.headers['accept-ranges'], 'bytes');
    const head = await httpGet(srv.port, '/tutorial/7-forced.mp4', { Range: 'bytes=0-99' });
    assert.equal(head.status, 206);
    assert.equal(head.bytes, 100);
    assert.equal(head.headers['content-range'], `bytes 0-99/${size}`);
    const tail = await httpGet(srv.port, '/tutorial/7-forced.webm', { Range: 'bytes=-10' });
    assert.equal(tail.status, 206);
    assert.equal(tail.bytes, 10);
    assert.equal(tail.headers['content-type'], 'video/webm');
    assert.equal((await httpGet(srv.port, '/tutorial/7-forced.mp4', { Range: `bytes=${size}-` })).status, 416);
  } finally { srv.stop(); }
});
