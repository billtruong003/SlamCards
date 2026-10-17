// Sharing the game: the link preview tags in the served page (server/meta.js) and the per-source counts of
// ?ref= marketing links (server/refs.js, client src/ref.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, connect, httpGet, sleep } from './harness.js';
import { pageMeta, withMeta, PUBLIC_URL } from '../server/meta.js';
import { refFrom } from '../src/ref.js';

const INDEX = fileURLToPath(new URL('../index.html', import.meta.url));
const DIST_INDEX = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const tag = (html, attr, key) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)">`))?.[1];
const count = (html, re) => (html.match(re) ?? []).length;

test('meta: Vietnamese by default, English for another ?lang, absolute 1200x630 image', () => {
  const vi = pageMeta(new URLSearchParams(''));
  assert.equal(vi.lang, 'vi');
  assert.equal(vi.url, PUBLIC_URL);
  assert.equal(vi.image, `${PUBLIC_URL}og/og-vi.jpg?v=1`);
  assert.match(vi.image, /^https:\/\//);
  const en = pageMeta(new URLSearchParams('lang=en&ref=tt'));
  assert.equal(en.lang, 'en');
  assert.match(en.image, /og-en\.jpg/);
  assert.equal(en.url, `${PUBLIC_URL}?lang=en`, 'ref is not part of the shared address');
  assert.equal(pageMeta(new URLSearchParams('lang=th')).lang, 'en');
  assert.equal(pageMeta(new URLSearchParams('lang=vi')).lang, 'vi');
  assert.equal(pageMeta(new URLSearchParams('lang="><script>')).lang, 'vi', 'a junk lang is ignored');
});

test('meta: a room invite names the room; a junk room code is ignored', () => {
  const room = pageMeta(new URLSearchParams('room=abcd&ref=fb'));
  assert.match(room.title, /ABCD/);
  assert.match(room.description, /ABCD/);
  assert.equal(room.url, `${PUBLIC_URL}?room=ABCD`);
  const junk = pageMeta(new URLSearchParams('room=<b>x</b>'));
  assert.doesNotMatch(junk.title, /<b>/);
  assert.equal(junk.url, PUBLIC_URL);
});

test('meta: the page gets one full set of tags, replacing the ones in index.html', () => {
  const html = withMeta(fs.readFileSync(INDEX, 'utf8'), new URLSearchParams('room=WXYZ&lang=en'));
  assert.equal(count(html, /<title>/g), 1);
  assert.equal(count(html, /property="og:title"/g), 1);
  assert.equal(count(html, /name="description"/g), 1);
  assert.equal(count(html, /rel="canonical"/g), 1);
  assert.match(tag(html, 'property', 'og:title'), /^Join room WXYZ/);
  assert.equal(tag(html, 'property', 'og:image'), `${PUBLIC_URL}og/og-en.jpg?v=1`);
  assert.equal(tag(html, 'property', 'og:type'), 'website');
  assert.equal(tag(html, 'name', 'twitter:card'), 'summary_large_image');
  assert.equal(tag(html, 'property', 'og:image:width'), '1200');
  assert.ok(html.includes('<div id="stage"></div>'), 'the rest of the page is untouched');
});

test('meta: the server sends the tags for room links and ?ref links (crawlers do not run JS)', { skip: !fs.existsSync(DIST_INDEX) && 'needs npm run build' }, async () => {
  const srv = await startServer();
  try {
    const home = await httpGet(srv.port, '/?ref=tt');
    assert.equal(home.status, 200);
    assert.equal(tag(home.body, 'property', 'og:url'), PUBLIC_URL);
    assert.match(tag(home.body, 'property', 'og:image'), /og-vi\.jpg/);
    const room = await httpGet(srv.port, '/?room=QRST&lang=en&ref=dc');
    assert.match(tag(room.body, 'property', 'og:title'), /QRST/);
    assert.match(tag(room.body, 'property', 'og:image'), /og-en\.jpg/);
    const image = await httpGet(srv.port, '/og/og-vi.jpg');
    assert.equal(image.status, 200);
    assert.ok(image.body.length > 10000, 'the preview image is served');
  } finally { srv.stop(); }
});

test('ref (client): whitelisted codes only, room links count as invites, the tab keeps its marketing ref', () => {
  assert.equal(refFrom('?ref=tt'), 'tt');
  assert.equal(refFrom('?ref=YT&lang=en'), 'yt');
  assert.equal(refFrom('?room=ABCD&ref=fb'), 'fb');
  assert.equal(refFrom('?room=ABCD'), 'invite');
  assert.equal(refFrom('?ref=spam'), 'direct');
  assert.equal(refFrom(''), 'direct');
  assert.equal(refFrom('?room=ABCD', 'ig'), 'ig', 'after joining the address is ?room=, the saved ref still counts');
  assert.equal(refFrom('', 'invite'), 'direct', 'only marketing refs are kept');
});

test('refs (server): daily visits and joined per source, one visit per connection, junk codes are direct', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slam-refs-'));
  Object.assign(process.env, { SLAM_DATA: dir, SLAM_STATS_KEY: 'k3y', SLAM_REFS_SAVE_MS: '200' });
  const srv = await startServer();
  try {
    const a = await connect(srv.port);
    a.send({ t: 'hello', ref: 'tt', visit: true });
    a.send({ t: 'hello', ref: 'fb', visit: true }); // a second hello on the same socket is ignored
    a.send({ t: 'create', name: 'A' });
    await a.next((m) => m.t === 'joined');
    a.send({ t: 'create', name: 'A' }); // a second room from the same connection is not a second player
    await a.next((m) => m.t === 'joined');

    const b = await connect(srv.port);
    b.send({ t: 'hello', ref: 'invite', visit: true });
    b.send({ t: 'join', code: a.code, name: 'B' });
    await b.next((m) => m.t === 'joined');

    const c = await connect(srv.port);
    c.send({ t: 'hello', ref: '../../etc', visit: true }); // not a known code
    const d = await connect(srv.port);
    d.send({ t: 'hello', ref: 'tt', visit: false }); // a reconnect: no new visit
    for (const q of [c, d]) q.send({ t: 'queue', size: 2, name: 'Q' });
    await c.next((m) => m.t === 'joined', 5000);

    const bad = await httpGet(srv.port, '/__refs?key=nope');
    assert.ok(!bad.body.trim().startsWith('{'), 'no counts without the key');
    const res = await httpGet(srv.port, '/__refs?key=k3y');
    const days = JSON.parse(res.body);
    const day = Object.keys(days).at(-1);
    assert.deepEqual(days[day], {
      tt: { visits: 1, joined: 2 },
      invite: { visits: 1, joined: 1 },
      direct: { visits: 1, joined: 1 },
    });
    await sleep(500);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'refs.json'), 'utf8')), days, 'saved next to the server data');
  } finally {
    srv.stop();
    for (const key of ['SLAM_DATA', 'SLAM_STATS_KEY', 'SLAM_REFS_SAVE_MS']) delete process.env[key];
  }
});
