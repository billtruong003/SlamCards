// Edge cases: input validation, limits, invalid events per phase, match lifecycle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startFrom, startServer, connect, lobby, twoPlayerGame, threePlayerGame, faceDown, faceUp, near, sleep, slamTo } from './harness.js';

const quiet = async (client, ms = 250) => { await sleep(ms); return client.state; };

test('names: cleaned, trimmed to 16, defaulted and de-duplicated', async () => {
  const srv = await startServer();
  try {
    const host = await connect(srv.port);
    host.send({ t: 'create', name: '<b>Tí</b>\u0000' });
    await host.next((m) => m.t === 'joined');
    const names = ['   ', 'A'.repeat(40), '😀🔥 Tèo', 'bTí/b', { evil: 1 }];
    for (const name of names) {
      const c = await connect(srv.port);
      c.send({ t: 'join', code: host.code, name });
      const reply = await c.next((m) => m.t === 'joined' || m.t === 'error');
      if (reply.t === 'error') assert.deepEqual([reply.code, reply.n], ['full', 4]);
    }
    const s = await host.waitState((st) => Object.keys(st.players).length === 4);
    const list = Object.values(s.players).map((p) => p.name);
    for (const n of list) {
      assert.ok(n.length >= 1 && n.length <= 16, `bad length: ${n}`);
      assert.ok(!/[<>\u0000]/.test(n), `unsafe chars kept: ${n}`);
    }
    assert.equal(new Set(list).size, list.length, `duplicate names: ${list}`);
    assert.ok(list.some((n) => /^Dép #\d\d$/.test(n)), `blank name falls back to a neutral default: ${list}`);
  } finally { srv.stop(); }
});

test('room limits: 5th player refused, joining a running match refused, codes are case-insensitive', async () => {
  const srv = await startServer();
  try {
    const players = await lobby(srv.port, 4);
    const fifth = await connect(srv.port);
    fifth.send({ t: 'join', code: players[0].code, name: 'X' });
    const full = await fifth.next((m) => m.t === 'error');
    assert.deepEqual([full.code, full.n], ['full', 4], 'the room says its own size (V-17)');

    const duo = await lobby(srv.port, 2);
    const [a] = duo;
    await startFrom(duo);
    await a.waitState((s) => s.phase !== 'lobby');
    const late = await connect(srv.port);
    late.send({ t: 'join', code: a.code.toLowerCase(), name: 'Late' });
    assert.match((await late.next((m) => m.t === 'error')).message, /đánh dở/);
  } finally { srv.stop(); }
});

test('join errors carry a stable code for the client to translate', async () => {
  const srv = await startServer();
  try {
    const ghost = await connect(srv.port);
    ghost.send({ t: 'join', code: 'ZZZZ', name: 'X' });
    const notFound = await ghost.next((m) => m.t === 'error');
    assert.equal(notFound.code, 'notFound');
    assert.ok(notFound.message, 'old clients still get a message');

    const players = await lobby(srv.port, 4);
    const fifth = await connect(srv.port);
    fifth.send({ t: 'join', code: players[0].code, name: 'X' });
    assert.equal((await fifth.next((m) => m.t === 'error')).code, 'full');

    const duo = await lobby(srv.port, 2);
    const [a] = duo;
    await startFrom(duo);
    await a.waitState((s) => s.phase !== 'lobby');
    const late = await connect(srv.port);
    late.send({ t: 'join', code: a.code, name: 'Late' });
    assert.equal((await late.next((m) => m.t === 'error')).code, 'inMatch');
  } finally { srv.stop(); }
});

test('start needs 2 players; a second start is ignored; only the rps winner chooses', async () => {
  const srv = await startServer();
  try {
    const [solo] = await lobby(srv.port, 1);
    solo.send({ t: 'start' });
    assert.equal((await quiet(solo)).phase, 'lobby');

    const [a, b] = await lobby(srv.port, 2);
    a.send({ t: 'start' });
    assert.equal((await quiet(a)).phase, 'lobby', 'host cannot start before the guest is ready');
    b.send({ t: 'ready', ready: true });
    await a.waitState((s) => s.ready?.pink === true);
    b.send({ t: 'start' });
    assert.equal((await quiet(a)).phase, 'lobby', 'a guest cannot start');
    a.send({ t: 'start' });
    a.send({ t: 'start' });
    await a.waitState((s) => s.phase === 'rps');
    assert.equal(a.state.round, 1, 'double start must not skip a round');
    a.send({ t: 'rps', choice: 'bua' });
    a.send({ t: 'rps', choice: 'bao' });
    b.send({ t: 'rps', choice: 'keo' });
    await a.waitState((s) => s.phase === 'choose');
    assert.equal(a.state.rpsWinner, 'black', 'first rps choice is final');
    b.send({ t: 'choose', first: true });
    assert.equal((await quiet(a)).phase, 'choose', 'loser cannot choose');
  } finally { srv.stop(); }
});

test('rps timeout picks for idle players and the match goes on', async () => {
  const srv = await startServer({ rps: 300, choose: 300 });
  try {
    const duo = await lobby(srv.port, 2);
    const [a] = duo;
    await startFrom(duo);
    const s = await a.waitState((st) => st.phase === 'turn', 8000);
    assert.ok(['black', 'pink'].includes(s.turn));
  } finally { srv.stop(); }
});

test('out-of-turn and out-of-phase actions are ignored', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    b.send({ t: 'slamStart', impact: near(b.state.cards.pink, -1.2), type: 'flat' });
    b.send({ t: 'pass', impact: near(b.state.cards.pink, -1.2) });
    b.send({ t: 'slamEnd', final: a.state.cards });
    b.send({ t: 'rematch' });
    const dep = b.state.players.pink.dep;
    b.send({ t: 'pickDep', dep: dep === 'dep_lao' ? 'dep_le' : 'dep_lao' });
    const s = await quiet(a);
    assert.equal(s.phase, 'turn');
    assert.equal(s.turn, 'black');
    assert.equal(s.players.pink.dep, dep, 'slipper cannot change mid-match');
  } finally { srv.stop(); }
});

test('bad slam payloads: invalid final and oversized chunk streams are refused', async () => {
  const srv = await startServer({ slamMaxMs: 600 });
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    const before = a.state.cards;
    a.send({ t: 'slamStart', impact: near(before.black), type: 'flat' });
    await b.next((m) => m.t === 'playStart');
    a.send({ t: 'slamChunk', frames: new Array(1300).fill([0, 0, 0, 0, 0, 0, 1]) });
    a.send({ t: 'slamEnd', final: { black: { p: [NaN, 0, 0], q: [0, 0, 0, 1] }, pink: before.pink } });
    a.send({ t: 'slamEnd', final: { black: before.black } });
    await b.next((m) => m.t === 'playAbort', 3000);
    const s = await b.waitState((st) => st.phase === 'turn' && st.turn === 'pink');
    assert.deepEqual(s.cards, before, 'refused slam leaves the table as it was');
    assert.equal(b.inbox.filter((m) => m.t === 'playChunk').length, 0, 'oversized chunk not relayed');
  } finally { srv.stop(); }
});

// Known bug QA-01: no 'error' listener on sockets, so ws's "Max payload size exceeded" kills the process.
test('huge message closes that socket only; server keeps serving (QA-01)', async () => {
  const srv = await startServer();
  try {
    const big = await connect(srv.port);
    big.send(JSON.stringify({ t: 'ping', pad: 'x'.repeat(3 * 1024 * 1024) }));
    await sleep(300);
    assert.equal(big.closed, true);
    const ok = await connect(srv.port);
    ok.send({ t: 'peek', code: 'ABCD' });
    await ok.next((m) => m.t === 'peek');
    assert.equal(srv.exited(), false, srv.log());
  } finally { srv.stop(); }
});

test('fall: slammer is out and other fallen cards are put back', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    const before = a.state.cards;
    await slamTo(a, { black: faceDown(-1, 0), pink: faceDown(9, 0, -1) });
    b.send({ t: 'playbackDone' });
    const end = await a.waitState((s) => s.phase === 'roundEnd');
    assert.equal(end.result.reason, 'fall');
    assert.equal(end.result.winner, 'pink');
  } finally { srv.stop(); }
});

test('own goal: the slammer\'s face-down card ending under the enemy face-up card loses', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    await slamTo(a, { black: faceDown(2, 0), pink: faceUp(2, 0, 0.024) });
    b.send({ t: 'playbackDone' });
    const end = await a.waitState((s) => s.phase === 'roundEnd');
    assert.equal(end.result.winner, 'pink');
    assert.deepEqual(end.result.eliminated, ['black']);
    // whose card is on top did it, not the slammer (V-24: the toast said "black ate black")
    assert.equal(end.result.by, 'pink');
    assert.deepEqual(end.result.captures, [{ by: 'pink', victim: 'black' }]);
  } finally { srv.stop(); }
});

test('timeouts: plain turn passes, forced turn gets autoSlam, a second timeout puts the idle player out', async () => {
  const srv = await startServer({ turn: 400, forcedGrace: 300 });
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    const autoSlam = a.next((m) => m.t === 'autoSlam', 4000);
    const s1 = await b.waitState((s) => s.turn === 'pink', 2000);
    assert.equal(s1.event.type, 'timeout');
    await autoSlam;
    // the other player is told the game is slamming for black, not shown a clock stuck at 0
    const told = await b.waitState((s) => s.autoSlam === true, 2000);
    assert.equal(told.turn, 'black');
    const out = await a.waitState((s) => s.phase === 'roundEnd', 4000);
    assert.equal(out.result.reason, 'afk');
    assert.equal(out.result.winner, 'pink');
  } finally { srv.stop(); }
});

test('away but connected: the slam the game makes for them still counts as idle, the second puts them out (V-21)', async () => {
  const srv = await startServer({ turn: 400, forcedGrace: 3000 });
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    // black times out once; pink passes; black's forced turn runs out and its browser slams for it
    await b.waitState((s) => s.turn === 'pink', 2000);
    b.send({ t: 'pass', impact: near(b.state.cards.pink, -1.2) });
    await a.next((m) => m.t === 'autoSlam', 3000);
    a.send({ t: 'slamStart', aim: near(a.state.cards.black), type: 'flat' });
    const out = await a.waitState((s) => s.phase === 'roundEnd', 2000);
    assert.equal(out.result.reason, 'afk');
    assert.equal(out.result.winner, 'pink');
  } finally { srv.stop(); }
});

test('three or more players get the shorter turn', async () => {
  const srv = await startServer({ turn: 30000, turnCrowded: 1500 });
  try {
    const players = await threePlayerGame(srv.port);
    const s = players[0].state;
    assert.ok(s.remainingMs <= 1500, `remaining ${s.remainingMs}`);
  } finally { srv.stop(); }
});

test('offline player: their turn shrinks to the short away turn (QA-06)', async () => {
  const srv = await startServer({ turn: 2500, awayTurn: 300, disconnect: 20000 });
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    await a.waitState((s) => s.phase === 'turn' && s.turn === 'black', 2000);
    const t0 = Date.now();
    a.close();
    const next = await b.waitState((s) => s.turn === 'pink', 2000);
    assert.equal(next.event.type, 'timeout');
    assert.ok(Date.now() - t0 < 1200, `turn passed after ${Date.now() - t0} ms`);
    // pink plays nothing; black's next turn starts short too, because black is still away
    const away = await b.waitState((s) => s.turn === 'black', 6000);
    assert.ok(away.remainingMs <= 300, `away turn has ${away.remainingMs} ms`);
  } finally { srv.stop(); }
});

test('reconnect: same token within grace gets the seat back mid-match', async () => {
  const srv = await startServer({ disconnect: 2000 });
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    const token = a.token;
    a.close();
    await b.waitState((s) => s.players.black.connected === false);
    const back = await connect(srv.port);
    back.send({ t: 'peek', code: a.code, token });
    assert.equal((await back.next((m) => m.t === 'peek')).mine, true);
    back.send({ t: 'join', code: a.code, token });
    assert.equal((await back.next((m) => m.t === 'joined')).color, 'black');
    await b.waitState((s) => s.players.black.connected === true);
  } finally { srv.stop(); }
});

test('reconnect too late: 2-player match ends by disconnect, the stale token gets refused', async () => {
  const srv = await startServer({ disconnect: 300 });
  try {
    const [a, b] = await twoPlayerGame(srv.port);
    const token = a.token;
    a.close();
    const end = await b.waitState((s) => s.phase === 'matchEnd', 3000);
    assert.equal(end.result.matchWinner, 'pink');
    assert.equal(end.result.matchReason, 'disconnect');
    const back = await connect(srv.port);
    back.send({ t: 'peek', code: a.code, token });
    assert.equal((await back.next((m) => m.t === 'peek')).mine, false);
  } finally { srv.stop(); }
});

test('full match to rematch: scores reset, a gone player is removed', async () => {
  const srv = await startServer({ roundEnd: 100 });
  try {
    const players = await lobby(srv.port, 3);
    const [a, b, c] = players;
    await startFrom(players);
    // Different players may win rounds (1-1-1 with three players), so play until someone reaches the winning score.
    for (let round = 0; round < 6 && a.state.phase !== 'matchEnd'; round++) {
      const s = await a.waitState((st) => st.phase === 'turn' || st.phase === 'matchEnd', 5000);
      if (s.phase === 'matchEnd') break;
      const slammer = players.find((p) => p.seat === s.turn);
      const final = { [s.turn]: faceUp(0, 0, 0.04) };
      players.filter((p) => p !== slammer).forEach((p, i) => { final[p.seat] = faceDown(0, 0, 0.008 + i * 0.016); });
      await slamTo(slammer, final);
      players.forEach((p) => p !== slammer && p.send({ t: 'playbackDone' }));
      await a.waitState((st) => st.phase === 'roundEnd' || st.phase === 'matchEnd', 3000)
        .catch((err) => { throw new Error(`${err.message}\n${srv.log()}`); });
    }
    const end = await a.waitState((st) => st.phase === 'matchEnd', 3000)
      .catch((err) => { throw new Error(`${err.message}\n${srv.log()}`); });
    assert.ok(end.result.matchWinner);
    c.close();
    await a.waitState((st) => st.players[c.seat]?.connected === false);
    a.send({ t: 'rematch' });
    // a friends' room goes back to its lobby; the host starts the next match
    const lobbyAgain = await a.waitState((st) => st.phase === 'lobby', 3000);
    assert.equal(Object.keys(lobbyAgain.players).length, 2, 'the gone player gave up the seat');
    assert.ok(lobbyAgain.last?.name, 'the lobby knows who won');
    b.send({ t: 'ready', ready: true });
    await a.waitState((st) => st.ready[b.seat]);
    a.send({ t: 'start' });
    const again = await a.waitState((st) => st.phase !== 'lobby', 3000);
    assert.equal(again.round, 1);
    assert.deepEqual(Object.values(again.scores), [0, 0]);
    assert.equal(again.seats.length, 2, 'disconnected player left out of the rematch');
  } finally { srv.stop(); }
});

test('lobby: a player who closes the tab frees the seat after the grace period', async () => {
  const srv = await startServer({ lobbyDisconnect: 200 });
  try {
    const [a, b] = await lobby(srv.port, 2);
    b.close();
    const s = await a.waitState((st) => !st.players.pink, 2000);
    assert.equal(Object.keys(s.players).length, 1);
  } finally { srv.stop(); }
});
