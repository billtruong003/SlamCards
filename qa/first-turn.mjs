// A brand-new player's first turn (task 1.12): the pointer bubble must not cover their own card, and
// the first match shows no wind readout and no slam-type buttons. Phone and laptop, each seat side.
//   node qa/first-turn.mjs        (local server on 8098)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8098';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'first-turn');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SIZES = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, laptop: { width: 1366, height: 657 } };
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
let failed = 0;

async function player(size, name, newbie) {
  const { width, height, ...opts } = SIZES[size];
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'vi-VN', ...opts });
  await ctx.addInitScript(({ name, newbie }) => {
    localStorage.setItem('slam-lang', 'vi');
    localStorage.setItem('slam-name', name);
    localStorage.setItem('slam-ftue', 'seen');
    if (!newbie) { localStorage.setItem('slam-ftue-matches', '3'); localStorage.setItem('slam-ftue-slammed', '1'); }
  }, { name, newbie });
  const p = await ctx.newPage();
  return p;
}
const boot = async (p, url) => {
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await sleep(500);
};

for (const size of Object.keys(SIZES)) {
  for (const newbieHosts of [true, false]) {
    const host = await player(size, 'Mới', newbieHosts);
    await boot(host, `${BASE}/?debug`);
    await host.evaluate(() => document.getElementById('create').click());
    await sleep(300);
    await host.evaluate(() => document.getElementById('create-go').click());
    await host.waitForSelector('#link', { state: 'attached' });
    const link = await host.evaluate(() => document.getElementById('link').value);
    const guest = await player(size, 'Cũ', !newbieHosts);
    await boot(guest, `${link}&debug`);
    await guest.waitForSelector('#ready');
    await guest.evaluate(() => document.getElementById('ready').click());
    await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).some(Boolean));
    await host.evaluate(() => document.getElementById('start').click());
    await sleep(300);
    await host.evaluate(() => document.getElementById('ftue-go')?.click());
    const newbie = newbieHosts ? host : guest;
    const other = newbieHosts ? guest : host;
    // rock-paper-scissors: the newbie wins and goes first
    for (let i = 0; i < 60; i++) {
      const phase = await newbie.evaluate(() => slamDebug.state?.phase);
      if (phase === 'turn') break;
      await newbie.evaluate(() => document.querySelector('[data-rps="bua"]')?.click()).catch(() => {});
      await other.evaluate(() => document.querySelector('[data-rps="keo"]')?.click()).catch(() => {});
      await newbie.evaluate(() => document.getElementById('first')?.click()).catch(() => {});
      await sleep(300);
    }
    await newbie.waitForFunction(() => slamDebug.state.phase === 'turn' && slamDebug.state.turn === slamDebug.me, null, { timeout: 10000 });
    await sleep(1200);
    const r = await newbie.evaluate(() => {
      const w = slamDebug.world;
      const c = w.cards[slamDebug.me].mesh.position;
      const pts = [[-0.6, -0.8], [0.6, -0.8], [-0.6, 0.8], [0.6, 0.8]].map(([dx, dz]) => w.toScreen(c.x + dx, 0, c.z + dz));
      const card = { l: Math.min(...pts.map((p) => p.x)), r: Math.max(...pts.map((p) => p.x)), t: Math.min(...pts.map((p) => p.y)), b: Math.max(...pts.map((p) => p.y)) };
      const say = document.querySelector('#ftue-point:not([hidden]) .ftue-say')?.getBoundingClientRect();
      const overlap = say ? Math.max(0, Math.min(card.r, say.right) - Math.max(card.l, say.left)) * Math.max(0, Math.min(card.b, say.bottom) - Math.max(card.t, say.top)) : null;
      return {
        bubble: Boolean(say),
        overlapPx: overlap === null ? null : Math.round(overlap),
        windHidden: document.getElementById('wind').hidden,
        typesHidden: document.getElementById('toggle').hidden,
        goal: document.querySelector('.ftue-say small')?.textContent,
      };
    });
    const ok = r.bubble && r.overlapPx === 0 && r.windHidden && r.typesHidden;
    if (!ok) failed++;
    console.log(`${size.padEnd(6)} newbie is ${newbieHosts ? 'host ' : 'guest'} ${ok ? 'ok' : 'FAIL'} ${JSON.stringify(r)}`);
    await newbie.screenshot({ path: path.join(OUT, `${size}-${newbieHosts ? 'host' : 'guest'}.png`) });
    // the old hand sees wind and both slam types on their turn
    await host.context().close();
    await guest.context().close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
