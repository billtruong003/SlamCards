// End-to-end tests against a real server process: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, lobby, twoPlayerGame, threePlayerGame, faceDown, faceUp, near, bySeat, httpGet, sleep, slamTo, slamFrames } from './harness.js';

test('S1: malformed websocket messages do not crash the server', async () => {
  const srv = await startServer();
  try {
    const c = await connect(srv.port);
    for (const raw of ['null', '1', '"x"', '[]', '{}', 'true', '{"t":"slamEnd","final":null}', '{"t":"join","code":{"a":1}}', 'not json']) c.send(raw);
    c.send({ t: 'peek', code: 'ZZZZ' });
    const reply = await c.next((m) => m.t === 'peek');
    assert.equal(reply.exists, false);
    assert.equal(srv.exited(), false, srv.log());
  } finally { srv.stop(); }
});

test('S2: bad percent-encoding gets 400 and the server keeps running', async () => {
  const srv = await startServer();
  try {
    const bad = await httpGet(srv.port, '/%E0%A4%A');
    assert.equal(bad.status, 400);
    const traversal = await httpGet(srv.port, '/%2e%2e/package.json');
    assert.ok(!traversal.body.includes('"slam-cards-proto"'), 'must not serve files outside dist');
    const c = await connect(srv.port);
    c.send({ t: 'peek', code: 'ABCD' });
    await c.next((m) => m.t === 'peek');
    assert.equal(srv.exited(), false, srv.log());
  } finally { srv.stop(); }
});

test('C1: peek tells whether an invite link still points at a room', async () => {
  const srv = await startServer();
  try {
    const [host] = await lobby(srv.port, 1);
    const c = await connect(srv.port);
    c.send({ t: 'peek', code: 'ZZZZ' });
    assert.deepEqual((await c.next((m) => m.t === 'peek')).exists, false);
    c.send({ t: 'peek', code: host.code.toLowerCase() });
    const found = await c.next((m) => m.t === 'peek');
    assert.equal(found.exists, true);
    assert.equal(found.phase, 'lobby');
    assert.equal(found.mine, false);
    c.send({ t: 'peek', code: host.code, token: host.token });
    assert.equal((await c.next((m) => m.t === 'peek')).mine, true);
  } finally { srv.stop(); }
});

test('C6: a second tab with the same token takes over the seat and the old tab is closed', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await lobby(srv.port, 2);
    const copy = await connect(srv.port);
    copy.send({ t: 'join', code: a.code, token: a.token });
    assert.equal((await copy.next((m) => m.t === 'joined')).color, 'black');
    await a.next((m) => m.t === 'replaced');
    await sleep(100);
    assert.equal(a.closed, true);
    const s = await b.waitState((st) => st.players.black?.connected === true);
    assert.equal(Object.keys(s.players).length, 2);
  } finally { srv.stop(); }
});

test('C7: creating a second room frees the seat in the first one', async () => {
  const srv = await startServer();
  try {
    const a = await connect(srv.port);
    a.send({ t: 'create', name: 'A' });
    const first = (await a.next((m) => m.t === 'joined')).code;
    a.send({ t: 'create', name: 'A' });
    const second = (await a.next((m) => m.t === 'joined')).code;
    assert.notEqual(first, second);
    const probe = await connect(srv.port);
    probe.send({ t: 'peek', code: first });
    assert.equal((await probe.next((m) => m.t === 'peek')).exists, false, 'empty old room is closed');
  } finally { srv.stop(); }
});

test('L3: a pass right after a pass is refused, and slams outside reach are ignored', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    a.send({ t: 'slamStart', impact: { x: 4.5, z: 0 }, type: 'flat' });
    await sleep(200);
    assert.equal(a.state.phase, 'turn', 'slam on the far side of the table is ignored');

    a.send({ t: 'pass', impact: near(a.state.cards.black) });
    await a.waitState((s) => s.turn === 'pink');
    b.send({ t: 'pass', impact: near(b.state.cards.pink, -1.2) });
    const forced = await a.waitState((s) => s.turn === 'black' && s.phase === 'turn');
    assert.equal(forced.forced, true);

    a.send({ t: 'pass', impact: near(forced.cards.black, 1.0) });
    await sleep(200);
    assert.equal(a.state.turn, 'black', 'second pass in a row is refused');

    a.send({ t: 'slamStart', impact: near(forced.cards.black, 3.0), type: 'flat' });
    await sleep(200);
    assert.equal(a.state.phase, 'turn', 'forced slam must stay inside the pink ring');

    a.send({ t: 'slamStart', impact: near(forced.cards.black, 1.0), type: 'flat' });
    await a.waitState((s) => s.phase === 'anim');
  } finally { srv.stop(); }
});

test('capture: face-up card on a face-down card ends the round', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    await slamTo(a, { black: faceUp(1, 0, 0.024), pink: faceDown(1, 0) });
    await b.next((m) => m.t === 'playEnd');
    b.send({ t: 'playbackDone' });
    const end = await a.waitState((s) => s.phase === 'roundEnd');
    assert.equal(end.result.winner, 'black');
    assert.deepEqual(end.result.eliminated, ['pink']);
    assert.equal(end.scores.black, 1);
  } finally { srv.stop(); }
});

test('D2: a player dropped mid-slam keeps a parked card, even if the slammer reports it on the table', async () => {
  const srv = await startServer({ watchMaxMs: 2000 });
  try {
    const players = await threePlayerGame(srv.port);
    const turn = players[0].state.turn;
    const slammer = bySeat(players, turn);
    const leaver = players.find((p) => p.seat !== turn);
    const stayer = players.find((p) => p !== slammer && p !== leaver);
    const cards = slammer.state.cards;
    await slamTo(slammer, { ...cards }, {
      during: async () => {
        await stayer.next((m) => m.t === 'playStart');
        leaver.close();
        await stayer.waitState((s) => !s.alive.includes(leaver.seat));
      },
    });
    stayer.send({ t: 'playbackDone' });
    const after = await stayer.waitState((s) => s.phase === 'turn');
    assert.equal(after.cards[leaver.seat].p[1], -50, `left player card stays parked\n${srv.log()}${JSON.stringify(after.alive)} ${after.phase}`);
  } finally { srv.stop(); }
});

test('slam frames still reach the others when an earlier seat is offline', async () => {
  const srv = await startServer({ disconnect: 5000, watchMaxMs: 2000 });
  try {
    const players = await threePlayerGame(srv.port);
    const turn = players[0].state.turn;
    const slammer = bySeat(players, turn);
    const order = ['black', 'pink', 'blue'].filter((s) => s !== turn);
    const leaver = bySeat(players, order[0]);
    const stayer = bySeat(players, order[1]);
    leaver.close();
    await stayer.waitState((s) => s.players[leaver.seat].connected === false);
    slammer.send({ t: 'slamStart', impact: near(slammer.state.cards[turn]), type: 'flat' });
    await stayer.next((m) => m.t === 'playStart');
    const { seats, cards } = slammer.state;
    slammer.send({ t: 'slamChunk', frames: slamFrames(seats, cards, cards, turn).slice(0, 1) });
    const chunk = await stayer.next((m) => m.t === 'playChunk', 2000);
    assert.equal(chunk.frames.length, 1);
    assert.doesNotMatch(srv.log(), /slamChunk failed/);
  } finally { srv.stop(); }
});

test('D2: an aborted slam does not bring back a dropped player card', async () => {
  const srv = await startServer({ slamMaxMs: 800 });
  try {
    const players = await threePlayerGame(srv.port);
    const turn = players[0].state.turn;
    const slammer = bySeat(players, turn);
    const watcher = players.find((p) => p.seat !== turn);
    slammer.send({ t: 'slamStart', impact: near(slammer.state.cards[turn]), type: 'flat' });
    await watcher.next((m) => m.t === 'playStart');
    slammer.close();
    await watcher.next((m) => m.t === 'playAbort', 4000);
    const after = await watcher.waitState((s) => s.phase === 'turn' && s.turn !== turn);
    assert.ok(!after.alive.includes(turn));
    assert.equal(after.cards[turn].p[1], -50);
  } finally { srv.stop(); }
});

test('L1: the round winner leaving during the round-end screen does not corrupt scores', async () => {
  const srv = await startServer({ roundEnd: 1500 });
  try {
    const players = await threePlayerGame(srv.port);
    const turn = players[0].state.turn;
    const winner = bySeat(players, turn);
    const rest = players.filter((p) => p !== winner);
    const final = { [turn]: faceUp(0, 0, 0.04) };
    rest.forEach((p, i) => { final[p.seat] = faceDown(0, 0, 0.008 + i * 0.016); });
    await slamTo(winner, final);
    rest.forEach((p) => p.send({ t: 'playbackDone' }));
    await rest[0].waitState((s) => s.phase === 'roundEnd');
    winner.close();
    const s = await rest[0].waitState((st) => st.players[turn]?.left === true);
    assert.equal(s.phase, 'roundEnd');
    assert.equal(s.result.winner, turn);
    assert.equal(s.scores[turn], 1);
    for (const v of Object.values(s.scores)) assert.ok(Number.isFinite(v));
    const next = await rest[0].waitState((st) => st.phase === 'roundIntro' || st.phase === 'rps' || st.phase === 'order', 4000);
    assert.ok(!next.alive.includes(turn), srv.log() + JSON.stringify(next.alive) + next.phase);
  } finally { srv.stop(); }
});

test('FTUE: tutorial step is shared with the room and cleared on disconnect', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await lobby(srv.port, 2);
    b.send({ t: 'ftue', step: 2 });
    await a.waitState((s) => s.players.pink?.tutorial === 2);
    b.send({ t: 'ftue', step: 99 });
    await a.waitState((s) => s.players.pink?.tutorial === 0);
    b.send({ t: 'ftue', step: 3 });
    await a.waitState((s) => s.players.pink?.tutorial === 3);
    b.close();
    await a.waitState((s) => !s.players.pink || s.players.pink?.tutorial === 0);
  } finally { srv.stop(); }
});
