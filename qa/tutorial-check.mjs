// The seven-step tutorial (task 1.11) in real browsers, on its own server (port 8103, short timings):
//   1. a friends' match with two new players, one on a laptop and one on a phone: both get the
//      steps at once (banner, locked skip, a clip playing with its caption), the table waits for
//      the one still reading and says so, and goes on as soon as the last one closes them;
//   2. the quick-match wait, phone and laptop: the steps rotate beside the queue;
//   3. a later match against a computer player: the slam-type reminder, then the pink-ring one.
// Screenshots in qa/out/tutorial/.
//   node qa/tutorial-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'qa', 'out', 'tutorial');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8103;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ['server/server.js'], {
  cwd: path.join(ROOT, 'proto'),
  env: {
    ...process.env, PORT: String(PORT), SLAM_ADMIN_PORT: String(PORT + 100), SLAM_DATA: fs.mkdtempSync(path.join(ROOT, 'qa', 'out', 'tmp-')),
    SLAM_TIMING: JSON.stringify({ botAfter: 12000, quickStart: 300, rps: 1500, choose: 1500, turn: 6000, forcedGrace: 3000 }),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const LAPTOP = { viewport: { width: 1366, height: 768 } };
// store: localStorage to start from; a new player has none of the tutorial keys
async function player(name, device, store = {}) {
  const ctx = await browser.newContext({ ...device, locale: 'vi-VN' });
  await ctx.addInitScript(([n, s]) => {
    if (sessionStorage.getItem('qa-set')) return; // only on the first load: the page writes its own
    sessionStorage.setItem('qa-set', '1');
    localStorage.setItem('slam-lang', 'vi');
    localStorage.setItem('slam-name', n);
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, [name, store]);
  return ctx.newPage();
}
const boot = async (p, url) => {
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await sleep(300);
};
const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}.png`) });
const results = [];
const expect = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
// what the steps card shows, and whether its clip is playing
const modal = (p) => p.evaluate(() => {
  const m = document.getElementById('ftue-modal');
  const v = m.querySelector('video');
  return {
    open: !m.hidden, first: m.classList.contains('first'), step: m.querySelector('.ftue-step').textContent,
    skip: m.querySelector('.ftue-skip').textContent, skipLocked: m.querySelector('.ftue-skip').disabled,
    skipShown: !m.querySelector('.ftue-skip').hidden, next: m.querySelector('.ftue-next').textContent,
    playing: Boolean(v && !v.paused && v.readyState >= 2), caption: m.querySelector('.tut-cap').hidden ? '' : m.querySelector('.tut-cap').textContent,
  };
});
const seen = (p) => p.evaluate(() => localStorage.getItem('slam-tut-seen'));

try {
  // ---------- 1. a friends' match, two new players ----------
  const host = await player('Bill', LAPTOP);
  await boot(host, `${BASE}/?debug`);
  await host.evaluate(() => document.getElementById('create').click());
  await sleep(300);
  await host.evaluate(() => document.getElementById('create-go').click());
  await host.waitForSelector('#link', { state: 'attached' });
  const link = await host.evaluate(() => document.getElementById('link').value);
  const guest = await player('Tèo', PHONE);
  await boot(guest, `${link}&debug`);
  await guest.waitForSelector('#ready');
  await guest.evaluate(() => document.getElementById('ready').click());
  await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).filter(Boolean).length === 1);
  await host.evaluate(() => document.getElementById('start').click());

  await host.waitForFunction(() => !document.getElementById('ftue-modal').hidden, null, { timeout: 8000 });
  const openedAt = Date.now();
  await guest.waitForFunction(() => !document.getElementById('ftue-modal').hidden, null, { timeout: 8000 });
  const h1 = await modal(host);
  expect('both new players get the steps at once, as the first match', h1.open && h1.first && (await modal(guest)).first, JSON.stringify(h1));
  expect('skip is locked at first and says so', h1.skipLocked && /\(\d\)/.test(h1.skip), h1.skip);
  // a clip loads on first show: wait for it to play (at most 8 s), then for its first caption
  const playing = () => { const v = document.querySelector('#ftue-modal video'); return v && !v.paused && v.readyState >= 2; };
  await Promise.all([host, guest].map((p) => p.waitForFunction(playing, null, { timeout: 8000 })));
  const h1b = await modal(host);
  const g1 = await modal(guest);
  expect('the clip plays with its caption (laptop, phone)', h1b.playing && Boolean(h1b.caption) && g1.playing && Boolean(g1.caption), `${h1b.caption} | ${g1.caption}`);
  await shot(host, '1-laptop-step1');
  await shot(guest, '1-phone-step1');
  await host.waitForFunction(() => !document.querySelector('#ftue-modal .ftue-skip').disabled, null, { timeout: 6000 });
  const lockedFor = Date.now() - openedAt;
  expect('skip opens after 3 s', lockedFor > 2500 && lockedFor < 4500, `${lockedFor} ms`);

  // the host skips at step 2: the table keeps waiting for Tèo, and says so
  await host.evaluate(() => document.querySelector('#ftue-modal .ftue-next').click());
  await host.evaluate(() => document.querySelector('#ftue-modal .ftue-skip').click());
  await sleep(500);
  const waiting = await host.evaluate(() => ({ phase: slamDebug.state.phase, line: document.querySelector('.round-reading')?.textContent ?? '', bubble: document.getElementById('ftue-bubble').hidden ? '' : document.getElementById('ftue-bubble').textContent }));
  expect('the host waits for the reader, named, with a clock', waiting.phase === 'roundIntro' && /Tèo/.test(waiting.line) && /\d/.test(waiting.line), waiting.line);
  expect('after the steps: where to find them again', /\?/.test(waiting.bubble), waiting.bubble);
  await shot(host, '1-laptop-waiting');

  // Tèo reads all seven; step 7 has no skip and says "Chiến!"
  for (let i = 0; i < 6; i++) {
    await guest.evaluate(() => document.querySelector('#ftue-modal .ftue-next').click());
    await sleep(i === 2 ? 1200 : 150);
    if (i === 2) await shot(guest, '1-phone-step4');
  }
  await sleep(1000);
  const g7 = await modal(guest);
  expect('the last step: "Chiến!", no skip', /7\/7/.test(g7.step) && g7.next === 'Chiến!' && !g7.skipShown, JSON.stringify(g7));
  await shot(guest, '1-phone-step7');
  const t0 = Date.now();
  await guest.evaluate(() => document.querySelector('#ftue-modal .ftue-next').click());
  await host.waitForFunction(() => slamDebug.state.phase !== 'roundIntro', null, { timeout: 3000 });
  expect('the match goes on as soon as the last reader is done', Date.now() - t0 < 2000, `${Date.now() - t0} ms`);
  expect('read through: all seven kept; the skipper keeps what they saw', (await seen(guest)) === '1234567' && (await seen(host)) === '12', `${await seen(guest)} / ${await seen(host)}`);
  await sleep(300);
  await shot(guest, '1-phone-after');
  await host.context().close();
  await guest.context().close();

  // ---------- 2. the quick-match wait ----------
  for (const [label, device] of [['phone', PHONE], ['laptop', LAPTOP]]) {
    const q = await player('Bin', device);
    await boot(q, `${BASE}/?debug`);
    await q.evaluate(() => { document.querySelector('#size [data-size="4"]').click(); document.getElementById('play').click(); });
    await q.waitForSelector('.tut-queue video');
    await sleep(1500);
    const a = await q.evaluate(() => ({ step: document.querySelector('.tut-queue .ftue-step').textContent, playing: !document.querySelector('.tut-queue video').paused }));
    await shot(q, `2-${label}-queue`);
    await sleep(6000);
    const b = await q.evaluate(() => document.querySelector('.tut-queue .ftue-step').textContent);
    expect(`queue (${label}): a step plays and the next comes by itself`, a.playing && /1\/7/.test(a.step) && /2\/7/.test(b), `${a.step} → ${b}`);
    await q.evaluate(() => document.querySelector('.tut-queue .tut-nxt').click());
    expect(`queue (${label}): › moves on`, /3\/7/.test(await q.evaluate(() => document.querySelector('.tut-queue .ftue-step').textContent)));
    // nothing on the queue screen is covered: its card and the steps do not overlap
    const overlap = await q.evaluate(() => {
      const a = document.querySelector('.queue-card').getBoundingClientRect();
      const b = document.querySelector('.tut-queue').getBoundingClientRect();
      return a.right > b.left && b.right > a.left && a.bottom > b.top && b.bottom > a.top;
    });
    expect(`queue (${label}): the steps sit beside the queue card`, !overlap);
    await q.evaluate(() => document.getElementById('queue-cancel').click());
    await q.context().close();
  }

  // ---------- 3. reminders in a later match ----------
  const vet = await player('Bin', PHONE, { 'slam-tut-seen': '1234567', 'slam-ftue-matches': '1', 'slam-ftue-slammed': '1' });
  await boot(vet, `${BASE}/?debug`);
  await vet.evaluate(() => { document.querySelector('#size [data-size="2"]').click(); document.getElementById('play').click(); });
  // my turn: the slam-type reminder; let it run out, and the next turn of mine brings the pink ring one
  await vet.waitForFunction(() => !document.getElementById('tut-remind').hidden, null, { timeout: 45000 });
  const r1 = await vet.evaluate(() => {
    const box = document.getElementById('toggle').getBoundingClientRect();
    return { kind: document.getElementById('tut-remind').className, pulse: document.getElementById('toggle').classList.contains('tut-pulse'),
      notes: document.querySelector('#type-tilt small')?.textContent, centred: Math.abs(box.left + box.width / 2 - innerWidth / 2) < 2 };
  });
  await sleep(1200);
  await shot(vet, '3-phone-remind-types');
  expect('match 2: the slam-type reminder, the buttons pulse (still centred) and say what they do', /types/.test(r1.kind) && r1.pulse && r1.centred && Boolean(r1.notes), JSON.stringify(r1));
  await vet.waitForFunction(() => /forced/.test(document.getElementById('tut-remind').className) && !document.getElementById('tut-remind').hidden, null, { timeout: 40000 });
  await sleep(1200);
  await shot(vet, '3-phone-remind-forced');
  expect('after a pass: the pink-ring reminder', true);
  await vet.evaluate(() => document.querySelector('#tut-remind .btn').click());
  expect('"Hiểu rồi" puts it away', await vet.evaluate(() => document.getElementById('tut-remind').hidden));
  await vet.context().close();
} catch (err) {
  results.push(false);
  console.log('FAIL', err.message);
} finally {
  await browser.close();
  server.kill();
}
const ok = results.length > 0 && results.every(Boolean);
console.log(ok ? `all ${results.length} ok` : 'FAILED');
process.exit(ok ? 0 : 1);
