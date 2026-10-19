// Computer players (server/bots.js): where they aim, and a whole quick match with one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseAim, botLook, botName } from '../server/bots.js';
import { initialCards, pointOnCard, seededRandom } from '../src/rules.js';
import { TUNE } from '../src/config.js';
import { startServer, connect, slamFrames, sleep } from './harness.js';

test('a bot aims in reach and never on a card, normal and forced turns, any table', () => {
  const random = seededRandom(7);
  for (const seats of [['black', 'pink'], ['black', 'pink', 'blue'], ['black', 'pink', 'blue', 'green']]) {
    for (let deal = 0; deal < 200; deal++) {
      const cards = initialCards(seats, random);
      for (const seat of seats) {
        for (const forced of [false, true]) {
          const pick = chooseAim({ cards, alive: seats, seat, forced, skill: random() }, random);
          assert.ok(pick, 'found a spot');
          const mine = cards[seat].p;
          const reach = forced ? TUNE.forcedRadius : TUNE.reachRadius;
          assert.ok(Math.hypot(pick.aim.x - mine[0], pick.aim.z - mine[2]) <= reach + 1e-9, 'in reach');
          assert.ok(!seats.some((s) => pointOnCard(cards[s], pick.aim.x, pick.aim.z)), 'not on a card');
          assert.ok(['flat', 'tilt'].includes(pick.type));
        }
      }
    }
  }
  const look = botLook(random);
  assert.ok(look.pet && look.dep && look.depColors.length);
  assert.ok(botName(random).length > 1);
});

test('alone in the queue: a computer player fills the table, plays its turns through a person, and the room goes when the person does', async () => {
  const srv = await startServer({ botAfter: 300, queueTick: 50, quickStart: 100, rps: 3000, choose: 3000, turn: 20000 });
  try {
    const me = await connect(srv.port);
    me.send({ t: 'queue', size: 2, name: 'Bill' });
    const joined = await me.next((m) => m.t === 'joined', 3000);
    const lobbyState = await me.waitState((s) => Object.keys(s.players).length === 2, 2000);
    const botSeat = Object.keys(lobbyState.players).find((s) => s !== joined.color);
    assert.notEqual(lobbyState.players[botSeat].name, 'Bill');
    assert.equal(lobbyState.players[botSeat].connected, true);
    assert.equal(lobbyState.players[botSeat].bot, undefined, 'a quick-match bot does not say it is one');

    // rock-paper-scissors: the bot picks by itself
    await me.waitState((s) => s.phase === 'rps', 3000);
    me.send({ t: 'rps', choice: 'bua' });
    const after = await me.waitState((s) => ['rpsReveal', 'choose', 'turn', 'order'].includes(s.phase), 6000);
    assert.ok(after.rpsChosen[botSeat] || after.phase !== 'rps');

    // play on: my turns pass, the bot's slams arrive here to run (no-op physics is a valid slam)
    let simulated = 0;
    for (let i = 0; i < 40 && simulated < 2; i++) {
      const s = await me.waitState((st) => ['rps', 'choose', 'turn', 'roundEnd', 'matchEnd', 'anim'].includes(st.phase), 15000);
      if (s.phase === 'rps' && !s.rpsChosen[joined.color]) me.send({ t: 'rps', choice: 'keo' });
      else if (s.phase === 'choose' && s.rpsWinner === joined.color) me.send({ t: 'choose', first: false });
      else if (s.phase === 'turn' && s.turn === joined.color) me.send({ t: 'pass', impact: { x: s.cards[joined.color].p[0] + 2.9, z: s.cards[joined.color].p[2] } });
      else if (s.phase === 'turn' || s.phase === 'anim') {
        const go = await me.next((m) => m.t === 'simSlam', 15000);
        assert.equal(go.by, botSeat);
        assert.ok(Number.isInteger(go.seed));
        const frames = slamFrames(s.seats, s.cards, s.cards, botSeat);
        me.send({ t: 'slamChunk', frames });
        const last = frames.at(-1);
        me.send({ t: 'slamEnd', final: Object.fromEntries(s.seats.map((seat, k) => [seat, { p: last.slice(k * 7, k * 7 + 3), q: last.slice(k * 7 + 3, k * 7 + 7) }])) });
        await me.waitState((st) => st.phase === 'turn' && st.turn === joined.color, 5000);
        simulated += 1;
        continue;
      }
      await me.waitState((st) => st !== s, 15000).catch(() => {});
    }
    assert.equal(simulated, 2, 'the bot took two turns, each run here');
    assert.doesNotMatch(srv.log(), /refused/);

    // the person leaves: nobody to play for, the room is gone
    const code = joined.code;
    me.send({ t: 'leave' });
    await sleep(200);
    const peek = await connect(srv.port);
    peek.send({ t: 'peek', code });
    assert.equal((await peek.next((m) => m.t === 'peek')).exists, false);
  } finally { srv.stop(); }
});
