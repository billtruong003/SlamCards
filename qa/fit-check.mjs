// Does every screen fit one screen? (task 1.10) For each viewport, walks the screens a player sees and
// checks that each key control is inside the viewport (no scrolling needed) and not covered by
// something else; saves a screenshot of each screen. Exit code 1 when anything does not fit.
//   node qa/fit-check.mjs                      (local server on 8098)
//   SLAM_BASE=https://... ONLY=phone-360 node qa/fit-check.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8098';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'fit');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phone = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
// a 1366x768 laptop loses ~111 px to the browser bar; at Windows' 125% scaling everything is 1.25x bigger
const VIEWPORTS = {
  'phone-360': { width: 360, height: 640, ...phone },
  'phone-375': { width: 375, height: 667, ...phone },
  'phone-390': { width: 390, height: 844, ...phone },
  'phone-412': { width: 412, height: 915, ...phone },
  'phone-430': { width: 430, height: 932, ...phone },
  'phone-land': { width: 844, height: 390, ...phone },
  'laptop': { width: 1366, height: 657 },
  'laptop-125': { width: 1093, height: 526, deviceScaleFactor: 1.25 },
};
const only = process.env.ONLY?.split(',');
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
const report = [];

async function player(vp, name) {
  const { width, height, ...opts } = VIEWPORTS[vp];
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'vi-VN', ...opts });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-lang', 'vi');
    if (n) localStorage.setItem('slam-name', n);
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-ftue-matches', '3');
    localStorage.setItem('slam-ftue-slammed', '1');
  }, name);
  return ctx.newPage();
}
async function boot(p, url) {
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await sleep(600);
}
const click = (p, sel) => p.evaluate((s) => document.querySelector(s)?.click(), sel);

// Each control: inside the viewport and the thing actually under its centre.
async function check(p, vp, screen, sels) {
  // '~sel': only has to be on screen (a label nobody taps, whatever lies over its middle)
  const res = await p.evaluate((list) => list.map((entry) => {
    const placeOnly = entry.startsWith('~');
    const sel = placeOnly ? entry.slice(1) : entry;
    const el = document.querySelector(sel);
    if (!el) return { sel, why: 'missing' };
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return { sel, why: 'hidden' };
    if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) {
      return { sel, why: `off screen: ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} in ${innerWidth}x${innerHeight}` };
    }
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!placeOnly && top && !el.contains(top) && !top.contains(el)) return { sel, why: `covered by ${top.id ? `#${top.id}` : top.className || top.tagName}` };
    return null;
  }).filter(Boolean), sels);
  await p.screenshot({ path: path.join(OUT, `${vp}-${screen}.png`) });
  report.push({ vp, screen, bad: res });
  console.log(`${vp.padEnd(11)} ${screen.padEnd(10)} ${res.length ? res.map((r) => `${r.sel} ${r.why}`).join(' | ') : 'ok'}`);
}

for (const vp of Object.keys(VIEWPORTS).filter((v) => !only || only.includes(v))) {
  const host = await player(vp, 'Bill');
  await boot(host, `${BASE}/?debug`);
  await check(host, vp, 'menu', ['#name', '#play', '#create', '#rooms', '#code', '#join', '#corner']);

  await click(host, '.gear-row, .gear-tile');
  await sleep(500);
  await check(host, vp, 'wardrobe', ['.wardrobe', '#ward-done']);
  await click(host, '#ward-done');
  await sleep(300);

  await click(host, '#create');
  await sleep(300);
  await check(host, vp, 'create', ['#vis', '#cap', '#create-go', '#create-cancel']);
  await click(host, '#create-go');
  await host.waitForSelector('#link', { state: 'attached' });
  const link = await host.evaluate(() => document.getElementById('link').value);

  // a friend opening the invite link for the first time: the name box
  const fresh = await player(vp, null);
  await boot(fresh, `${link}&debug`);
  await fresh.waitForSelector('#go', { timeout: 10000 }).catch(() => {});
  await check(fresh, vp, 'invite', ['#name', '#go']);
  await click(fresh, '#go');

  const guests = [fresh];
  for (const n of ['Thằng Tèo Dài', 'Tí Sún']) {
    const g = await player(vp, n);
    await boot(g, `${link}&debug`);
    guests.push(g);
  }
  await host.waitForFunction(() => Object.keys(slamDebug.state?.players ?? {}).length === 4, null, { timeout: 15000 });
  await sleep(500);
  await check(guests[1], vp, 'lobby-4', ['#ready', '#invite', '#leave']);
  for (const g of guests) await click(g, '#ready');
  await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).filter(Boolean).length === 3, null, { timeout: 10000 });
  await sleep(300);
  await check(host, vp, 'host-4', ['#start', '#invite']);

  // quick match queue, from a fifth player
  const q = await player(vp, 'Bin');
  await boot(q, `${BASE}/?debug`);
  await click(q, '#size [data-size="4"]');
  await click(q, '#play');
  await q.waitForSelector('#queue-cancel', { timeout: 10000 }).catch(() => {});
  await sleep(300);
  await check(q, vp, 'queue', ['#queue-cancel']);
  await q.context().close();

  // the match: whoever has the turn
  await click(host, '#start');
  await sleep(300);
  await click(host, '#ftue-go');
  const all = [host, ...guests];
  for (let i = 0; i < 60; i++) {
    if (await host.evaluate(() => slamDebug.state.phase === 'turn')) break;
    await sleep(300);
  }
  await sleep(1200);
  const turnSeat = await host.evaluate(() => slamDebug.state.turn);
  let turner = host;
  for (const p of all) if (await p.evaluate((s) => slamDebug.me === s, turnSeat)) turner = p;
  // on a slow machine the turner's own page can still be on the order screen
  await turner.waitForFunction(() => slamDebug.state?.phase === 'turn' && !document.querySelector('#overlay .panel'), null, { timeout: 10000 }).catch(() => {});
  await sleep(500);
  await check(turner, vp, 'turn', ['#type-flat', '#type-tilt', '~#players .chip', '#leave']);
  const cut = await turner.evaluate(() => [...document.querySelectorAll('#players .chip .name')].filter((n) => n.scrollWidth > n.clientWidth + 1).map((n) => n.textContent));
  console.log(`${vp.padEnd(11)} names cut  ${cut.length ? cut.join(', ') : 'none'}`);

  // everyone else leaves: the host is alone, the match ends
  for (const g of guests) {
    await click(g, '#leave');
    await click(g, '#leave');
  }
  await host.waitForFunction(() => slamDebug.state.phase === 'matchEnd', null, { timeout: 10000 }).catch(() => {});
  await sleep(1500);
  await check(host, vp, 'end', ['#menu', '#new-room']);
  for (const p of all) await p.context().close();
}
await browser.close();
const bad = report.filter((r) => r.bad.length);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(`\n${bad.length} of ${report.length} screens do not fit`);
process.exit(bad.length ? 1 : 0);
