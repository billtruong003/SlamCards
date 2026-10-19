// The server's slam check (server/slam-check.js): real slams pass, made-up ones do not.
// fixtures/slams.json: real slams recorded from the client's physics (qa/slam-record.mjs runs ~750).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSlamCheck } from '../server/slam-check.js';
import { slamFrames, slamTo, startServer, twoPlayerGame, near, sleep } from './harness.js';

const REAL = JSON.parse(fs.readFileSync(new URL('./fixtures/slams.json', import.meta.url)));

function run({ seats, start, impact, frames, final }) {
  const check = createSlamCheck({ seats, start, impact });
  for (const f of frames) {
    const why = check.frame(f);
    if (why) return why;
  }
  return check.end(final);
}
const toCards = (seats, frame) => Object.fromEntries(seats.map((s, i) => [s, { p: frame.slice(i * 7, i * 7 + 3), q: frame.slice(i * 7 + 3, i * 7 + 7) }]));
const faceDown = (x, z) => ({ p: [x, 0.008, z], q: [0, 0, 1, 0] });
const faceUp = (x, z, y = 0.024) => ({ p: [x, y, z], q: [0, 0, 0, 1] });

// two players as dealt; black slams just left of its card
const seats = ['black', 'pink'];
const start = { black: faceDown(-4.5, 0), pink: faceDown(4.5, 0) };
const impact = { x: -5.7, z: 0 };

test('real slams from the game pass, falls and chain reactions included', () => {
  assert.ok(REAL.length >= 4);
  for (const slam of REAL) assert.equal(run(slam), null, `${slam.seats.length} players, ${slam.type}`);
});

test('a path with plausible speeds and a bump before every move passes (the test helper)', () => {
  const final = { black: faceUp(4.5, 0), pink: faceDown(4.5, 0.01) };
  const frames = slamFrames(seats, start, final, 'black');
  assert.equal(run({ seats, start, impact, frames, final: toCards(seats, frames.at(-1)) }), null);
});

test('a result that is not the last frame everyone watched is refused', () => {
  const frames = slamFrames(seats, start, start, 'black');
  const why = run({ seats, start, impact, frames, final: { black: faceUp(4.5, 0), pink: faceDown(4.5, 0) } });
  assert.match(why, /final differs/);
});

test('a card jumping across the table in one frame is refused', () => {
  const frames = [[4.4, 0.03, 0, 0, 0, 0, 1, 4.5, 0.008, 0, 0, 0, 1, 0]];
  assert.match(run({ seats, start, impact, frames, final: toCards(seats, frames[0]) }), /black moved .* in one frame/);
});

test('a card far from the slipper moving with nothing touching it is refused', () => {
  const frames = slamFrames(seats, start, { black: start.black, pink: faceDown(4.2, 0) }, 'black')
    .filter((f) => Math.abs(f[0] - -4.5) < 1e-3); // the slammer's card never goes near pink
  assert.match(run({ seats, start, impact, frames, final: toCards(seats, frames.at(-1)) }), /pink moved with nothing touching it/);
});

test('a card passing through the table top is refused, one falling past the edge is not', () => {
  const sink = slamFrames(seats, start, { black: { p: [-4.5, -1, 0], q: [0, 0, 1, 0] }, pink: start.pink }, 'black');
  assert.match(run({ seats, start, impact, frames: sink, final: toCards(seats, sink.at(-1)) }), /through the table/);
  const fall = slamFrames(seats, start, { black: { p: [-6.6, -2, 0], q: [0, 0, 1, 0] }, pink: start.pink }, 'black');
  assert.equal(run({ seats, start, impact, frames: fall, final: toCards(seats, fall.at(-1)) }), null);
});

test('flying into the sky, spinning too fast, too many frames, a parked card moving, bad frames', () => {
  const up = slamFrames(seats, start, { black: { p: [-4.5, 5, 0], q: [0, 0, 1, 0] }, pink: start.pink }, 'black');
  assert.match(run({ seats, start, impact, frames: up, final: toCards(seats, up.at(-1)) }), /flew to/);

  const spin = [[-4.5, 0.008, 0, 0, 0, 0, 1, 4.5, 0.008, 0, 0, 0, 1, 0]]; // face down to face up in one frame
  assert.match(run({ seats, start, impact, frames: spin, final: toCards(seats, spin[0]) }), /turned/);

  const still = slamFrames(seats, start, start, 'black')[0];
  const long = Array.from({ length: 500 }, () => still);
  assert.match(run({ seats, start, impact, frames: long, final: start }), /more than \d+ frames/);

  const three = ['black', 'pink', 'blue'];
  const withParked = { ...start, blue: { p: [0, -50, 0], q: [0, 0, 0, 1] } };
  const back = [[...still, 0, 0.008, 0, 0, 0, 1, 0]];
  assert.match(run({ seats: three, start: withParked, impact, frames: back, final: toCards(three, back[0]) }), /blue left its parking spot/);

  assert.equal(run({ seats, start, impact, frames: [[1, 2, 3]], final: start }), 'bad frame');
  assert.equal(run({ seats, start, impact, frames: [still.map((v, i) => (i ? v : NaN))], final: start }), 'bad frame');
  assert.equal(run({ seats, start, impact, frames: [], final: start }), 'no frames');
});

// ---------- through the server ----------

test('server: the aim gets a shaken landing point and a luck seed; an aim on a card is refused', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    const card = a.state.cards.black;
    a.send({ t: 'slamStart', aim: { x: card.p[0], z: card.p[2] }, type: 'flat' });
    assert.equal((await a.next((m) => m.t === 'slamRefused' || m.t === 'slamGo')).t, 'slamRefused');
    const aim = near(card);
    a.send({ t: 'slamStart', aim, type: 'tilt' });
    const go = await a.next((m) => m.t === 'slamGo');
    assert.ok(Number.isInteger(go.seed) && go.seed >= 0);
    assert.equal(go.type, 'tilt');
    assert.ok(Math.hypot(go.impact.x - aim.x, go.impact.z - aim.z) <= 0.18 + 1e-9, 'within the hand shake');
    const seen = await b.next((m) => m.t === 'playStart');
    assert.deepEqual(seen.impact, go.impact, 'everyone sees the same landing point');
    b.send({ t: 'slamStart', aim: near(b.state.cards.pink), type: 'flat' });
    assert.equal((await b.next((m) => m.t === 'slamRefused')).t, 'slamRefused', 'not your turn: refused out loud');
  } finally { srv.stop(); }
});

test('server: a made-up slam is thrown out, the table goes back and the turn moves on', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    const before = a.state.cards;
    const go = await slamTo(a, { black: { p: [4.5, 0.024, 0], q: [0, 0, 0, 1] } }, {
      during: async () => {
        // the cheat: black's card appears face up on pink's in one frame
        a.send({ t: 'slamChunk', frames: [[before.pink.p[0], 0.024, before.pink.p[2], 0, 0, 0, 1, ...before.pink.p, ...before.pink.q]] });
      },
    });
    assert.ok(go.seed >= 0);
    await a.next((m) => m.t === 'playAbort');
    await b.next((m) => m.t === 'playAbort');
    const after = await b.waitState((s) => s.phase === 'turn' && s.turn === 'pink');
    assert.deepEqual(after.cards, before);
    for (let i = 0; i < 40 && !/refused: black moved/.test(srv.log()); i++) await sleep(25);
    assert.match(srv.log(), /refused: black moved/);
  } finally { srv.stop(); }
});
