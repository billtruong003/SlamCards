// Rooms and matchmaking: host + ready, room options, the public list, quick match, idle players,
// and the name filter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, lobby, startFrom, sleep } from './harness.js';
import { isBadName } from '../server/names.js';

const quiet = async (c, ms = 250) => { await sleep(ms); return c.state; };

test('host and ready: only the host starts, guests must be ready, gear changes undo ready', async () => {
  const srv = await startServer();
  try {
    const [a, b, c] = await lobby(srv.port, 3);
    const s0 = await a.waitState((s) => Object.keys(s.players).length === 3);
    assert.equal(s0.host, 'black');
    b.send({ t: 'ready', ready: true });
    await a.waitState((s) => s.ready.pink === true);
    a.send({ t: 'start' });
    assert.equal((await quiet(a)).phase, 'lobby', 'one guest still not ready');
    c.send({ t: 'ready', ready: true });
    await a.waitState((s) => s.ready.blue === true);
    b.send({ t: 'pickDep', dep: 'dep_le' });
    await a.waitState((s) => !s.ready.pink && s.players.pink.dep === 'dep_le');
    a.send({ t: 'start' });
    assert.equal((await quiet(a)).phase, 'lobby', 'changing gear took back ready');
    b.send({ t: 'ready', ready: true });
    await a.waitState((s) => s.ready.pink === true);
    a.send({ t: 'ready', ready: true });
    assert.equal((await quiet(a)).ready.black, undefined, 'the host has no ready flag');
    a.send({ t: 'start' });
    await a.waitState((s) => s.phase !== 'lobby');
  } finally { srv.stop(); }
});

test('host leaves the lobby: the earliest guest takes over', async () => {
  const srv = await startServer({ lobbyDisconnect: 100 });
  try {
    const [a, b, c] = await lobby(srv.port, 3);
    c.send({ t: 'ready', ready: true });
    await b.waitState((s) => s.ready.blue === true);
    a.close();
    const s = await b.waitState((st) => !st.players.black, 3000);
    assert.equal(s.host, 'pink');
    assert.equal(s.ready.pink, undefined);
    b.send({ t: 'start' });
    await b.waitState((st) => st.phase !== 'lobby');
  } finally { srv.stop(); }
});

test('room options: cap and visibility at creation, host can change them, cap is enforced', async () => {
  const srv = await startServer();
  try {
    const host = await connect(srv.port);
    host.send({ t: 'create', name: 'H', visibility: 'public', cap: 2 });
    await host.next((m) => m.t === 'joined');
    const s = await host.waitState(() => true);
    assert.equal(s.visibility, 'public');
    assert.equal(s.cap, 2);
    assert.equal(s.kind, 'friends');
    const g = await connect(srv.port);
    g.send({ t: 'join', code: host.code, name: 'G' });
    await g.next((m) => m.t === 'joined');
    const third = await connect(srv.port);
    third.send({ t: 'join', code: host.code, name: 'T' });
    assert.equal((await third.next((m) => m.t === 'error')).code, 'full');
    host.send({ t: 'roomSettings', cap: 3, visibility: 'private' });
    await host.waitState((st) => st.cap === 3 && st.visibility === 'private');
    g.send({ t: 'roomSettings', cap: 4 });
    assert.equal((await quiet(host)).cap, 3, 'only the host changes settings');
    third.send({ t: 'join', code: host.code, name: 'T' });
    await third.next((m) => m.t === 'joined');
    host.send({ t: 'roomSettings', cap: 2 });
    assert.equal((await quiet(host)).cap, 3, 'cap cannot drop under the players already in');
  } finally { srv.stop(); }
});

test('public list: only public friends rooms, waiting ones first, no names', async () => {
  const srv = await startServer();
  try {
    const pub = await connect(srv.port);
    pub.send({ t: 'create', name: 'SecretName', visibility: 'public', cap: 3 });
    await pub.next((m) => m.t === 'joined');
    const priv = await connect(srv.port);
    priv.send({ t: 'create', name: 'P', cap: 4 });
    await priv.next((m) => m.t === 'joined');
    const playing = await lobby(srv.port, 2);
    playing[0].send({ t: 'roomSettings', visibility: 'public' });
    await playing[0].waitState((s) => s.visibility === 'public');
    await startFrom(playing);
    await playing[0].waitState((s) => s.phase !== 'lobby');
    const viewer = await connect(srv.port);
    viewer.send({ t: 'listRooms' });
    const { rooms } = await viewer.next((m) => m.t === 'rooms');
    assert.deepEqual(rooms.map((r) => r.code), [pub.code, playing[0].code]);
    assert.deepEqual(rooms.map((r) => r.phase), ['lobby', 'playing']);
    assert.equal(rooms[0].n, 1);
    assert.equal(rooms[0].cap, 3);
    assert.doesNotMatch(JSON.stringify(rooms), /SecretName/);
  } finally { srv.stop(); }
});

test('quick match "any": 2 found, short countdown, then a quick room starts by itself', async () => {
  const srv = await startServer({ anyCountdown: 400, quickStart: 100, queueTick: 50 });
  try {
    const a = await connect(srv.port);
    const b = await connect(srv.port);
    a.send({ t: 'queue', size: 'any', name: 'A' });
    const w = await a.next((m) => m.t === 'queue' && m.state === 'waiting');
    assert.equal(w.peers.length, 0);
    b.send({ t: 'queue', name: 'B' });
    const counting = await a.next((m) => m.t === 'queue' && m.peers.length === 1 && m.startsInMs > 0);
    assert.equal(counting.peers[0].name, 'B');
    await a.next((m) => m.t === 'joined', 3000);
    const s = await a.waitState((st) => st.phase !== 'lobby', 3000);
    assert.equal(s.kind, 'quick');
    assert.equal(s.host, null);
    assert.equal(s.seats.length, 2);
    const viewer = await connect(srv.port);
    viewer.send({ t: 'listRooms' });
    assert.equal((await viewer.next((m) => m.t === 'rooms')).rooms.length, 0, 'quick rooms are never listed');
  } finally { srv.stop(); }
});

test('quick match exact size waits for that many, "any" players top it up; unqueue and closing leave', async () => {
  const srv = await startServer({ anyCountdown: 60000, quickStart: 100, queueTick: 50 });
  try {
    const [p1, p2, p3, gone, quitter] = await Promise.all([1, 2, 3, 4, 5].map(() => connect(srv.port)));
    p1.send({ t: 'queue', size: 3, name: 'One' });
    p2.send({ t: 'queue', size: 3, name: 'Two' });
    quitter.send({ t: 'queue', size: 4, name: 'Quit' });
    gone.send({ t: 'queue', size: 4, name: 'Gone' });
    await p1.next((m) => m.t === 'queue' && m.peers.length === 1);
    quitter.send({ t: 'unqueue' });
    await quitter.next((m) => m.t === 'queue' && m.state === 'left');
    gone.close();
    await sleep(200);
    assert.ok(!p1.state, 'still waiting: only 2 for a 3-player match');
    p3.send({ t: 'queue', size: 'any', name: 'Three' });
    await p1.next((m) => m.t === 'joined', 3000);
    const s = await p1.waitState((st) => st.phase !== 'lobby', 3000);
    assert.equal(s.seats.length, 3);
    assert.deepEqual(Object.values(s.players).map((p) => p.name).sort(), ['One', 'Three', 'Two']);
  } finally { srv.stop(); }
});

test('quick match: two timeouts in a row put an idle player out of the round', async () => {
  const srv = await startServer({ anyCountdown: 100, quickStart: 50, queueTick: 50, turn: 300, rps: 300, choose: 200, roundIntro: 50, order: 50 });
  try {
    const [a, b, c] = await Promise.all([1, 2, 3].map(() => connect(srv.port)));
    a.send({ t: 'queue', size: 3, name: 'A' });
    b.send({ t: 'queue', size: 3, name: 'B' });
    c.send({ t: 'queue', size: 3, name: 'C' });
    // nobody plays: every turn times out, so each seat gets its two strikes in turn
    const s = await a.waitState((st) => st.event?.type === 'afk' || st.phase === 'roundEnd', 8000);
    const afk = s.event?.type === 'afk' ? s.event : s.result;
    assert.ok(afk, 'someone went out for idling');
    const after = await a.waitState((st) => st.phase === 'roundEnd' || st.alive.length < 3, 8000);
    assert.ok(after.alive.length < 3 || after.result?.reason === 'afk');
  } finally { srv.stop(); }
});

test('friends rooms never drop idle players', async () => {
  const srv = await startServer({ turn: 200, forcedGrace: 100 });
  try {
    const players = await lobby(srv.port, 3);
    await startFrom(players);
    await sleep(2500);
    assert.equal(players[0].state.alive.length, 3);
  } finally { srv.stop(); }
});

test('names: swear words are blocked in several languages, ordinary names pass', () => {
  for (const bad of ['fuck you', 'Đ.ị.t', 'con cặc', 'puta', 'Kontol', '傻逼', 'ไอ้สัตว์', '씨발', 'F U C K', 'sh1t']) {
    assert.ok(isBadName(bad), `should block: ${bad}`);
  }
  for (const ok of ['Tí sún', 'Edith', 'Long', 'Cò hương', 'Gấu Mập', 'Hitomi', 'Mít ướt', 'Bin lém', 'Cassandra', 'Lucas']) {
    assert.ok(!isBadName(ok), `should allow: ${ok}`);
  }
});

test('looks: seat defaults, a taken card colour moves to a free one, bad picks fall back', async () => {
  const srv = await startServer();
  try {
    const a = await connect(srv.port);
    a.send({ t: 'create', name: 'A', look: { pet: 'tiger', dep: 'dep_le', depColors: ['#2a1418', '#ffc93c', '#2fa8ff'], cardColor: 'vang' } });
    await a.next((m) => m.t === 'joined');
    const b = await connect(srv.port);
    b.send({ t: 'join', code: a.code, name: 'B', look: { pet: 'dragon', dep: 'dep_lao', depColors: ['#123456'], cardColor: 'vang' } });
    await b.next((m) => m.t === 'joined');
    const s = await a.waitState((st) => Object.keys(st.players).length === 2);
    assert.deepEqual([s.players.black.pet, s.players.black.dep, s.players.black.cardColor], ['tiger', 'dep_le', 'vang']);
    assert.deepEqual(s.players.black.depColors, ['#2a1418', '#ffc93c', '#2fa8ff']);
    assert.equal(s.players.pink.pet, 'panda', 'unknown pet: seat default');
    assert.deepEqual(s.players.pink.depColors, ['#fffaf0', '#4f8ff0'], 'bad colours: slipper defaults');
    assert.equal(s.players.pink.cardColor, 'xanh', 'vang was taken: next free colour in seat order');
  } finally { srv.stop(); }
});

test('pickLook: changes gear, takes back ready, refuses a colour someone has', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await lobby(srv.port, 2);
    b.send({ t: 'ready', ready: true });
    await a.waitState((s) => s.ready.pink === true);
    b.send({ t: 'pickLook', look: { pet: 'koala', dep: 'dep_to_ong', depColors: ['#3ccf6e'], cardColor: 'la' } });
    const s = await a.waitState((st) => st.players.pink.pet === 'koala');
    assert.deepEqual([s.players.pink.dep, s.players.pink.depColors[0], s.players.pink.cardColor], ['dep_to_ong', '#3ccf6e', 'la']);
    assert.equal(s.ready.pink, undefined);
    b.send({ t: 'pickLook', look: { pet: 'koala', dep: 'dep_to_ong', depColors: ['#3ccf6e'], cardColor: 'hong' } });
    assert.equal((await b.next((m) => m.t === 'lookRefused')).reason, 'colorTaken');
    assert.equal((await quiet(a)).players.pink.cardColor, 'la');
  } finally { srv.stop(); }
});

test('quick rooms give everyone a different card colour', async () => {
  const srv = await startServer({ anyCountdown: 100, quickStart: 2000, queueTick: 50 });
  try {
    const [a, b, c] = await Promise.all([1, 2, 3].map(() => connect(srv.port)));
    for (const [cl, n] of [[a, 'A'], [b, 'B'], [c, 'C']]) cl.send({ t: 'queue', size: 3, name: n, look: { cardColor: 'hong', pet: 'cat' } });
    const s = await a.waitState((st) => Object.keys(st.players).length === 3, 4000);
    const colors = Object.values(s.players).map((p) => p.cardColor);
    assert.equal(new Set(colors).size, 3, colors.join());
  } finally { srv.stop(); }
});
