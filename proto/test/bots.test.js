// Computer players (server/bots.js): where they aim, how well they play (with the server's copy of
// the physics), and whole quick matches with them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSlam, botLook, botName, pickPersona, PERSONAS, thinkMs } from '../server/bots.js';
import { loadPhysics } from '../server/sim.js';
import { runSlam } from '../src/physics.js';
import { initialCards, pointOnCard, seededRandom, judge, SEATS, tableFor, CARD_HALF_T, quatMul } from '../src/rules.js';
import { TUNE } from '../src/config.js';
import { startServer, connect, slamFrames, sleep } from './harness.js';

test('a bot aims in reach and never on a card, normal and forced turns, any table', async () => {
  const physics = await loadPhysics();
  const random = seededRandom(7);
  for (const seats of [['black', 'pink'], ['black', 'pink', 'blue'], ['black', 'pink', 'blue', 'green']]) {
    for (let deal = 0; deal < 6; deal++) {
      const cards = initialCards(seats, random);
      for (const seat of seats) {
        for (const forced of [false, true]) {
          const persona = Object.keys(PERSONAS)[deal % 4];
          const pick = await planSlam({ physics, seats, cards, alive: seats, seat, forced, wind: { angle: 0, strength: 2 }, persona }, random);
          assert.ok(pick, 'found a spot');
          const mine = cards[seat].p;
          const reach = (forced ? TUNE.forcedRadius : TUNE.reachRadius) + PERSONAS[persona].aimError * Math.SQRT2;
          assert.ok(Math.hypot(pick.aim.x - mine[0], pick.aim.z - mine[2]) <= reach + 1e-9, 'in reach');
          assert.ok(!seats.some((s) => pointOnCard(cards[s], pick.aim.x, pick.aim.z)), 'not on a card');
          assert.ok(['flat', 'tilt'].includes(pick.type));
        }
      }
    }
  }
  const look = botLook(random);
  assert.ok(look.pet && look.dep && look.depColors.length);
  for (const persona of Object.keys(PERSONAS)) {
    assert.ok(botName(persona, random).length > 1);
    const ms = thinkMs(persona, 30000, random);
    assert.ok(ms >= 800 && ms <= 3500, `${persona} thinks ${ms} ms`);
  }
  // newcomers never meet the strongest bots; old hands meet them often
  const meet = (played) => Array.from({ length: 400 }, () => pickPersona(played, random));
  assert.equal(meet(0).filter((p) => p === 'fox').length, 0);
  assert.ok(meet(50).filter((p) => p === 'fox').length > 80);
});

// A table in the middle of a match: cards anywhere, about a third face up, none touching.
function midMatch(n, random) {
  const seats = SEATS.slice(0, n);
  const { hx, hz } = tableFor(n);
  const cards = {};
  for (const s of seats) {
    let p;
    do p = [(random() * 2 - 1) * (hx - 0.6), CARD_HALF_T, (random() * 2 - 1) * (hz - 0.8)];
    while (Object.values(cards).some((c) => Math.hypot(c.p[0] - p[0], c.p[2] - p[2]) < 1.8));
    const yaw = random() * Math.PI * 2;
    const turn = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
    cards[s] = { p, q: random() < 0.35 ? turn : quatMul(turn, [0, 0, 1, 0]) };
  }
  return { seats, cards };
}

// Bill 20/10: the bots knocked their own card off and slapped without a goal. Their real slams
// (the hand shake and spin luck the server adds) from 150 mid-match tables: the old bots lost the
// round to a fall 4.3% of slams and captured 3.0%.
test('bots rarely knock a card off, and the strong ones capture more than the old bots', async () => {
  const physics = await loadPhysics();
  const rates = {};
  for (const persona of ['fox', 'rookie']) {
    const random = seededRandom(11);
    let falls = 0;
    let captures = 0;
    const N = 150;
    for (let i = 0; i < N; i++) {
      const { seats, cards } = midMatch(2 + (i % 3), random);
      const seat = seats[0];
      const wind = { angle: random() * Math.PI * 2, strength: Math.floor(random() * 5) };
      const pick = await planSlam({ physics, seats, cards, alive: seats, seat, forced: false, wind, persona }, random);
      const angle = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * TUNE.handShake;
      const impact = { x: pick.aim.x + Math.cos(angle) * r, z: pick.aim.z + Math.sin(angle) * r };
      const { final } = runSlam(physics, { seats, cards, impact, type: pick.type, wind, random });
      const result = judge(final, seat, seats);
      if (result?.reason === 'fall') falls += 1;
      if (result?.captures?.some((c) => c.by === seat)) captures += 1;
    }
    rates[persona] = { falls: falls / N, captures: captures / N };
  }
  assert.ok(rates.fox.falls <= 0.02, `fox falls ${rates.fox.falls}`);
  assert.ok(rates.rookie.falls <= 0.03, `rookie falls ${rates.rookie.falls}`);
  assert.ok(rates.fox.captures >= 0.04, `fox captures ${rates.fox.captures}`);
  assert.ok(rates.fox.captures > rates.rookie.captures, 'the strong bot beats the weak one');
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

test('someone leaving a quick match mid-way: a computer player takes the seat and the others play on', async () => {
  const srv = await startServer({ queueTick: 50, quickStart: 100, anyCountdown: 60000, turn: 20000 });
  try {
    const players = await Promise.all([1, 2, 3].map(() => connect(srv.port)));
    players.forEach((p, i) => p.send({ t: 'queue', size: 3, name: `P${i}` }));
    await Promise.all(players.map((p) => p.next((m) => m.t === 'joined', 3000)));
    const [a, b, c] = players;
    await a.waitState((s) => s.phase !== 'lobby', 3000);
    const before = a.state;
    c.send({ t: 'leave' });
    const s = await a.waitState((st) => st.players[c.seat].name !== before.players[c.seat].name, 2000);
    assert.equal(Object.keys(s.players).length, 3, 'still three at the table');
    assert.equal(s.players[c.seat].connected, true);
    assert.ok(!s.players[c.seat].left);
    assert.match(srv.log(), /a computer player takes the seat/);
    // the leaver's link no longer opens the seat
    const back = await connect(srv.port);
    back.send({ t: 'join', code: c.code, token: c.token, name: 'P2' });
    assert.equal((await back.next((m) => m.t === 'error' || m.t === 'joined')).t, 'error');
    void b;
  } finally { srv.stop(); }
});

test('"Chơi với máy luôn": alone in the queue, computer players come at once; not while someone waits too', async () => {
  const srv = await startServer({ botAfter: 60000, queueTick: 50, quickStart: 100 });
  try {
    const me = await connect(srv.port);
    me.send({ t: 'queue', size: 3, name: 'Bill', played: 0 });
    await me.next((m) => m.t === 'queue' && m.state === 'waiting', 2000);
    me.send({ t: 'botsNow' });
    const joined = await me.next((m) => m.t === 'joined', 1500);
    const s = await me.waitState((st) => Object.keys(st.players).length === 3, 2000);
    assert.equal(Object.values(s.players).filter((p) => p.name === 'Bill').length, 1, 'two computer players with me');
    assert.equal(joined.color, 'black');

    // two people in the queue (different sizes): asking for bots does not drop the other person
    const a = await connect(srv.port);
    const b = await connect(srv.port);
    a.send({ t: 'queue', size: 4, name: 'A' });
    b.send({ t: 'queue', size: 3, name: 'B' });
    await a.next((m) => m.t === 'queue' && m.state === 'waiting', 2000);
    a.send({ t: 'botsNow' });
    await sleep(400);
    assert.ok(!a.inbox.some((m) => m.t === 'joined'), 'still waiting with B');
  } finally { srv.stop(); }
});
