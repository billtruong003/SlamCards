// Server stability: a seat that is removed must take its pending timers with it (V-01).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, lobby, startFrom, sleep, faceDown, faceUp, near } from './harness.js';

// The grace timer of a guest who dropped in the lobby must not fire after Start removed that seat.
test('start with a disconnected guest: their grace timer does not crash the server later', async () => {
  const srv = await startServer({ lobbyDisconnect: 500 });
  try {
    const players = await lobby(srv.port, 3);
    const [a, b, c] = players;
    b.send({ t: 'ready', ready: true });
    c.send({ t: 'ready', ready: true });
    await a.waitState((s) => Object.keys(s.ready).length === 2);
    c.close();
    await a.waitState((s) => s.players[c.seat]?.connected === false);
    a.send({ t: 'start' });
    const started = await a.waitState((s) => s.phase !== 'lobby');
    assert.deepEqual(started.seats, ['black', 'pink']);
    await sleep(800); // past the lobby grace period of the removed guest
    assert.equal(srv.exited(), false, srv.log());
    a.send({ t: 'ping', at: 1 });
    await a.next((m) => m.t === 'pong');
  } finally { srv.stop(); }
});

// Same for a player who dropped at the end of a match and was left out of the rematch.
test('rematch without a disconnected player: their grace timer does not crash the server later', async () => {
  const srv = await startServer({ disconnect: 600, roundEnd: 50 });
  try {
    const players = await lobby(srv.port, 3);
    const [a, b, c] = players;
    await startFrom(players);
    for (let round = 0; round < 6; round++) {
      const s = await a.waitState((st) => st.phase === 'turn' || st.phase === 'matchEnd', 5000);
      if (s.phase === 'matchEnd') break;
      const slammer = players.find((p) => p.seat === s.turn);
      const final = { [s.turn]: faceUp(0, 0, 0.04) };
      players.filter((p) => p !== slammer).forEach((p, i) => { final[p.seat] = faceDown(0, 0, 0.008 + i * 0.016); });
      slammer.send({ t: 'slamStart', impact: near(s.cards[s.turn]), type: 'flat' });
      await sleep(50);
      slammer.send({ t: 'slamEnd', final });
      players.forEach((p) => p !== slammer && p.send({ t: 'playbackDone' }));
      await a.waitState((st) => st.phase === 'roundEnd' || st.phase === 'matchEnd', 3000);
    }
    await a.waitState((st) => st.phase === 'matchEnd', 3000);
    c.close();
    await a.waitState((st) => st.players[c.seat]?.connected === false);
    a.send({ t: 'rematch' });
    b.send({ t: 'rematch' });
    const again = await a.waitState((st) => st.phase !== 'matchEnd', 3000);
    assert.equal(again.seats.length, 2);
    await sleep(900); // past the match grace period of the removed player
    assert.equal(srv.exited(), false, srv.log());
    a.send({ t: 'ping', at: 1 });
    await a.next((m) => m.t === 'pong');
  } finally { srv.stop(); }
});
