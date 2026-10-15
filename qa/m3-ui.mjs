// Milestone 3: the wardrobe. Pick a pet, a slipper with its colours and a card colour at home,
// carry them into a room, see a taken colour greyed out for the guest, change gear in the lobby
// (takes back Ready), and the falling slipper wears its owner's colours.
// Run with the game server on :8097:  node qa/m3-ui.mjs   → qa/out/m3/*.png
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'm3');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
// loads still in flight when a context is closed fail with console errors: not the game's
let closing = false;
async function player(name, opts = { viewport: { width: 1280, height: 800 } }, look = null, url = `${BASE}/?debug&noftue`) {
  const ctx = await browser.newContext({ ...opts, locale: 'vi-VN' });
  await ctx.addInitScript(([n, l]) => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-memes', '0');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
    if (l) localStorage.setItem('slam-look', JSON.stringify(l));
  }, [name, look]);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !closing) errors.push(`${name} console: ${m.text().slice(0, 150)}`); });
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  if (url.includes('room=')) return p; // straight into the room, like a friend tapping the invite
  await p.waitForSelector('#play', { timeout: 15000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) });

try {
  const host = await player('Bill');
  await host.waitForTimeout(500);
  await shot(host, '01-home-gear');
  check('home shows the wardrobe tiles', await host.isVisible('.gear-card [data-ward="pet"]'));

  await host.click('.gear-card [data-ward="pet"]');
  await host.waitForSelector('[data-pet="tiger"]');
  await shot(host, '02-ward-pet');
  await host.click('[data-pet="tiger"]');
  await host.click('[data-tab="dep"]');
  await host.waitForSelector('#ward-dep-canvas');
  await host.click('[data-dep="dep_le"]');
  await host.click('[data-part="1"][data-color="#ffc93c"]');
  await host.waitForTimeout(700);
  await shot(host, '03-ward-dep');
  await host.click('[data-tab="card"]');
  await host.click('.color-tile[data-color="vang"]');
  await shot(host, '04-ward-card');
  await host.click('#ward-done');
  await host.waitForSelector('#play');
  const saved = await host.evaluate(() => JSON.parse(localStorage.getItem('slam-look')));
  check('look saved on the device', saved.pet === 'tiger' && saved.dep === 'dep_le' && saved.depColors[1] === '#ffc93c' && saved.cardColor === 'vang', JSON.stringify(saved));

  await host.click('#create');
  await host.click('#create-go');
  await host.waitForSelector('#vis-toggle', { timeout: 10000 });
  const hs = await host.evaluate(() => slamDebug.state.players.black);
  check('room got my look', hs.pet === 'tiger' && hs.dep === 'dep_le' && hs.cardColor === 'vang', JSON.stringify(hs));
  const link = await host.inputValue('#link');

  // a guest who also wants yellow gets another colour, and sees yellow as taken
  const guest = await player('Tèo', { viewport: { width: 1280, height: 800 } }, { pet: 'penguin', dep: 'dep_lao', depColors: ['#2a1418', '#ff5c9d'], cardColor: 'vang' }, `${link}&debug&noftue`);
  // a saved name skips the name prompt and joins straight away
  await guest.waitForSelector('#ready, #go', { timeout: 10000 });
  if (await guest.$('#go')) await guest.click('#go');
  await guest.waitForSelector('#ready', { timeout: 10000 });
  const gs = await guest.evaluate(() => slamDebug.state.players.pink);
  check('guest asked for a taken colour and got another', gs.cardColor !== 'vang' && gs.pet === 'penguin', JSON.stringify(gs));
  await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await guest.waitForTimeout(400);
  await shot(guest, '05-lobby-guest');
  await guest.click('.gear-tiles [data-ward="card"]');
  await guest.waitForSelector('.color-tile');
  check('taken colour is greyed out for the guest', await guest.isDisabled('.color-tile[data-color="vang"]'));
  await shot(guest, '06-guest-colors');
  await guest.click('.color-tile[data-color="la"]');
  await host.waitForFunction(() => slamDebug.state.players.pink.cardColor === 'la' && !slamDebug.state.ready.pink);
  check('changing gear in the lobby takes back ready', true);
  await guest.click('#ward-done');
  await guest.waitForSelector('#ready');
  await host.waitForTimeout(300);
  await shot(host, '07-lobby-host');
  const seatVar = await host.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--seat-pink').trim());
  check('seat colour follows the card colour', seatVar.toLowerCase() === '#3ccf6e', seatVar);

  // start and slam once: the falling slipper uses the host's colours
  await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await host.click('#start');
  for (let i = 0; i < 40; i++) {
    for (const [p, pick] of [[host, 'bua'], [guest, 'keo']]) {
      if (await p.$('[data-rps]')) await p.click(`[data-rps="${pick}"]`).catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
    }
    if (await host.evaluate(() => slamDebug.state.phase === 'turn' && slamDebug.state.turn === 'black')) break;
    await host.waitForTimeout(300);
  }
  const slipper = await host.evaluate(async () => {
    const c = slamDebug.cards().black;
    slamDebug.slamAt(c.p[0] + 1.1, c.p[2]);
    await new Promise((r) => setTimeout(r, 120));
    let colors = null;
    slamDebug.visuals.depTilt.traverse((o) => { if (o.material?.onBeforeCompile && !colors) colors = o.material.customProgramCacheKey?.(); });
    return colors;
  });
  await host.waitForTimeout(150);
  await shot(host, '08-slam-yellow-sole');
  check('the falling slipper is the recoloured one', Boolean(slipper), String(slipper));
  closing = true;
  await guest.context().close();
  await host.context().close();
  closing = false;

  const phone = await player('Tí', { ...devices['iPhone SE'] });
  await phone.click('.gear-card [data-ward="dep"]').catch(async () => { await phone.locator('.gear-card [data-ward="dep"]').scrollIntoViewIfNeeded(); await phone.click('.gear-card [data-ward="dep"]'); });
  await phone.waitForSelector('#ward-dep-canvas');
  await phone.waitForTimeout(600);
  await shot(phone, '09-phone-ward-dep');
  const fits = await phone.evaluate(() => document.querySelector('#ward-done').getBoundingClientRect().bottom <= innerHeight);
  check('wardrobe Done button on screen (iPhone SE)', fits);
} catch (err) {
  check('script', false, err.message.split('\n')[0]);
} finally {
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
