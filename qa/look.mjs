// Temporary: screenshots of the menu, the tutorial and a turn in a match, laptop and phone, Vietnamese.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8098';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'look');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });

const SIZES = { pc: { width: 1366, height: 768 }, phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };

async function player(size, name, extra = {}) {
  const { width, height, ...opts } = SIZES[size];
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'vi-VN', ...opts });
  await ctx.addInitScript(({ name, extra }) => {
    localStorage.setItem('slam-lang', 'vi');
    localStorage.setItem('slam-name', name);
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, { name, extra });
  const p = await ctx.newPage();
  return p;
}
const boot = async (p, url) => {
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await sleep(800);
};

for (const size of Object.keys(SIZES)) {
  // menu + tutorial (a first-time player)
  const a = await player(size, 'Bill');
  await boot(a, `${BASE}/?debug`);
  await a.screenshot({ path: path.join(OUT, `${size}-1-menu.png`) });
  await a.evaluate(() => { document.getElementById('help').click(); });
  await sleep(300);
  await a.evaluate(() => document.getElementById('help-replay').click());
  await sleep(600);
  await a.screenshot({ path: path.join(OUT, `${size}-2-tutorial-1.png`) });
  await a.evaluate(() => document.querySelector('.ftue-next').click());
  await a.evaluate(() => document.querySelector('.ftue-next').click());
  await sleep(600);
  await a.screenshot({ path: path.join(OUT, `${size}-3-tutorial-3.png`) });
  await a.evaluate(() => document.querySelector('.ftue-skip').click());

  // a turn in a match, both players seen
  await a.evaluate(() => { document.getElementById('create').click(); });
  await sleep(300);
  await a.evaluate(() => document.getElementById('create-go').click());
  await a.waitForSelector('#link');
  const link = await a.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const b = await player(size, 'Thằng Tèo Dài', { 'slam-ftue': 'seen', 'slam-ftue-matches': '3' });
  await boot(b, `${link}&debug`);
  await b.waitForSelector('#ready, #go');
  if (await b.$('#go')) await b.evaluate(() => document.getElementById('go').click());
  await b.waitForSelector('#ready');
  await b.evaluate(() => document.getElementById('ready').click());
  await a.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).some(Boolean));
  await a.evaluate(() => document.getElementById('start').click());
  await sleep(300);
  await a.evaluate(() => document.getElementById('ftue-go')?.click());
  for (let i = 0; i < 60; i++) {
    if (await a.evaluate(() => slamDebug.state.phase === 'turn')) break;
    for (const [p, pick] of [[a, 'bua'], [b, 'keo']]) {
      await p.evaluate((x) => document.querySelector(`[data-rps="${x}"]`)?.click(), pick).catch(() => {});
      await p.evaluate(() => document.getElementById('first')?.click()).catch(() => {});
    }
    await sleep(300);
  }
  await sleep(1500);
  await a.screenshot({ path: path.join(OUT, `${size}-4-turn-host.png`) });
  // the guest hides names: glows instead
  await b.evaluate(() => { const box = document.getElementById('names-on'); box.checked = false; box.dispatchEvent(new Event('change')); });
  await sleep(800);
  await b.screenshot({ path: path.join(OUT, `${size}-5-turn-guest-nonames.png`) });
  await b.evaluate(() => document.getElementById('leave').click());
  await sleep(200);
  await b.screenshot({ path: path.join(OUT, `${size}-6-leave-armed.png`) });
  await b.evaluate(() => document.getElementById('leave').click());
  await sleep(800);
  const hostAfter = await a.evaluate(() => ({ phase: slamDebug.state.phase, winner: slamDebug.state.result?.matchWinner ?? null }));
  const guestAfter = await b.evaluate(() => ({ menu: Boolean(document.getElementById('play')), url: location.search }));
  console.log(size, 'after leave', JSON.stringify(hostAfter), JSON.stringify(guestAfter));
  await a.context().close();
  await b.context().close();
}
// the tutorial from a sub-path, as on the live site (/slam-cards/): the pet pictures must still load
{
  const p = await player('pc', 'Bill');
  await p.goto(`${process.env.SUB_BASE || 'http://localhost:8101/dist/'}?debug`);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await sleep(500);
  await p.evaluate(() => { document.getElementById('help').click(); document.getElementById('help-replay').click(); });
  await sleep(800);
  const loaded = await p.evaluate(async () => {
    const urls = [...document.querySelectorAll('.fa-c')].map((el) => getComputedStyle(el, '::after').backgroundImage).filter((b) => b.includes('pets'));
    const firstUrl = urls[0]?.match(/url\("?([^")]+)/)?.[1];
    const res = firstUrl ? await fetch(firstUrl) : null;
    return { firstUrl, status: res?.status };
  });
  console.log('sub-path tutorial pet image', JSON.stringify(loaded));
  await p.screenshot({ path: path.join(OUT, 'subpath-tutorial-1.png') });
  await p.context().close();
}
await browser.close();
console.log('saved', fs.readdirSync(OUT).join(' '));
