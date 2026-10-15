// Milestone 2 in real browsers: home, create a public room, a guest joins from the public list,
// ready + host start, then two strangers find each other with "Play now".
// Run with the game server on :8097:  node qa/m2-ui.mjs   → qa/out/m2/*.png
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'm2');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
async function player(name, opts = { viewport: { width: 1280, height: 760 } }) {
  const ctx = await browser.newContext({ ...opts, locale: 'vi-VN' });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-memes', '0');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
  }, name);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await p.goto(`${BASE}/?debug&noftue`);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.waitForSelector('#play', { timeout: 15000 });
  return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) });
const st = (p) => p.evaluate(() => slamDebug.state && { phase: slamDebug.state.phase, kind: slamDebug.state.kind, host: slamDebug.state.host, ready: slamDebug.state.ready, cap: slamDebug.state.cap, visibility: slamDebug.state.visibility, n: Object.keys(slamDebug.state.players).length });

try {
  const host = await player('Bill');
  await shot(host, '01-home');
  const phone = await player('Tí', { ...devices['iPhone 13'] });
  await shot(phone, '02-home-phone');
  await phone.context().close();

  // create a public room for 3
  await host.click('#create');
  await host.waitForSelector('#create-go');
  await host.click('[data-vis="public"]');
  await host.click('#cap [data-size="3"]');
  await shot(host, '03-create');
  await host.click('#create-go');
  await host.waitForSelector('#vis-toggle', { timeout: 10000 });
  const s1 = await st(host);
  check('create: public room for 3 with me as host', s1.visibility === 'public' && s1.cap === 3 && s1.host === 'black', JSON.stringify(s1));
  check('host start locked alone', await host.isDisabled('#start'));

  // a guest finds it in the public list
  const guest = await player('Tèo');
  await guest.click('#rooms');
  await guest.waitForSelector('[data-join]', { timeout: 10000 });
  await shot(guest, '04-rooms');
  const listed = await guest.evaluate(() => document.getElementById('room-list').innerText);
  check('public list shows the room without the host name', !/Bill/.test(listed), listed.split('\n').slice(0, 2).join(' | '));
  await guest.click('[data-join]');
  await guest.waitForSelector('#ready', { timeout: 10000 });
  await host.waitForFunction(() => Object.keys(slamDebug.state.players).length === 2);
  await shot(host, '05-lobby-host-waiting');
  check('host start locked until the guest is ready', await host.isDisabled('#start'));
  await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await host.waitForTimeout(300);
  await shot(guest, '06-lobby-guest-ready');
  await shot(host, '07-lobby-host-ready');
  check('host start unlocked once the guest is ready', !(await host.isDisabled('#start')));
  // host toggles visibility back to private
  await host.click('#vis-toggle');
  await host.waitForFunction(() => slamDebug.state.visibility === 'private');
  check('host can switch the room to private', true);
  await host.click('#start');
  await host.waitForFunction(() => slamDebug.state.phase !== 'lobby', null, { timeout: 10000 });
  check('host started the match', true);
  await guest.context().close();
  await host.context().close();

  // two strangers, "any"
  const a = await player('Mít ướt');
  const b = await player('Bin lém');
  await a.click('#play');
  await a.waitForSelector('#queue-cancel', { timeout: 5000 });
  await a.waitForTimeout(600);
  await shot(a, '08-queue-alone');
  await b.click('#play');
  await a.waitForFunction(() => document.querySelector('.queue-go'), null, { timeout: 5000 });
  await shot(a, '09-queue-countdown');
  check('any: countdown shows once 2 are found', true);
  await a.waitForFunction(() => slamDebug.state?.kind === 'quick', null, { timeout: 15000 });
  await a.waitForTimeout(400);
  await shot(a, '10-quick-found');
  await a.waitForFunction(() => !['lobby'].includes(slamDebug.state.phase), null, { timeout: 10000 });
  const q = await st(a);
  check('quick room started by itself, no host', q.kind === 'quick' && q.host === null, JSON.stringify(q));
} catch (err) {
  check('script', false, err.message.split('\n')[0]);
} finally {
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
