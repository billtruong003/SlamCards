// Reactions (stickers, quick phrases) and chat: who may send what, the spam limit, filtering,
// and the chat log a late joiner gets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, lobby, sleep } from './harness.js';

const collect = (client, type) => {
  const got = [];
  client.ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.t === type) got.push(m); });
  return got;
};

test('react: known stickers and phrases go to everyone, unknown ids are dropped', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await lobby(srv.port, 2);
    const seen = collect(b, 'react');
    a.send({ t: 'react', id: 'redcard' });
    a.send({ t: 'react', id: 'p:gg' });
    a.send({ t: 'react', id: '<img src=x>' });
    a.send({ t: 'react', id: 'p:nope-not-a-phrase' });
    await sleep(300);
    assert.deepEqual(seen.map((m) => [m.seat, m.id]), [['black', 'redcard'], ['black', 'p:gg']]);
  } finally { srv.stop(); }
});

test('react and chat: 3 per 5 s per player, the server enforces it', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await lobby(srv.port, 2);
    const reacts = collect(b, 'react');
    const chats = collect(b, 'chat');
    for (let i = 0; i < 6; i++) a.send({ t: 'react', id: 'haha' });
    for (let i = 0; i < 6; i++) a.send({ t: 'chat', text: `tin ${i}` });
    b.send({ t: 'react', id: 'sad' }); // another player has their own allowance
    await sleep(300);
    assert.equal(reacts.filter((m) => m.seat === 'black').length, 3);
    assert.equal(reacts.filter((m) => m.seat === 'pink').length, 1);
    assert.deepEqual(chats.map((m) => m.text), ['tin 0', 'tin 1', 'tin 2']);
  } finally { srv.stop(); }
});

test('chat: friends rooms only, filtered, trimmed, and a late joiner gets the log', async () => {
  const srv = await startServer();
  try {
    const [a, b] = await lobby(srv.port, 2);
    const chats = collect(b, 'chat');
    a.send({ t: 'chat', text: '  vô lẹ   đi <b>đập</b>  ' });
    a.send({ t: 'chat', text: 'fuck thằng này' });
    a.send({ t: 'chat', text: 'x'.repeat(200) });
    await sleep(300);
    assert.equal(chats[0].text, 'vô lẹ đi bđập/b');
    assert.equal(chats[0].name, 'P0');
    assert.equal(chats[1].text, '**** thằng này');
    assert.equal(chats[2].text.length, 80);
    const late = await connect(srv.port);
    const log = collect(late, 'chatLog');
    late.send({ t: 'join', code: a.code, name: 'Late' });
    await late.next((m) => m.t === 'joined');
    await sleep(200);
    assert.equal(log[0]?.lines.length, 3);
  } finally { srv.stop(); }
});

test('chat: quick-match rooms (strangers) get no typed chat', async () => {
  const srv = await startServer({ quickStart: 100, anyCountdown: 100, queueTick: 50 });
  try {
    const a = await connect(srv.port);
    const b = await connect(srv.port);
    a.send({ t: 'queue', size: 2, name: 'A' });
    b.send({ t: 'queue', size: 2, name: 'B' });
    await a.next((m) => m.t === 'joined');
    await b.next((m) => m.t === 'joined');
    const chats = collect(b, 'chat');
    const reacts = collect(b, 'react');
    a.send({ t: 'chat', text: 'hello' });
    a.send({ t: 'react', id: 'p:hurry' });
    await sleep(300);
    assert.equal(chats.length, 0);
    assert.equal(reacts.length, 1);
  } finally { srv.stop(); }
});
