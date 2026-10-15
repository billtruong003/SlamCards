// Menu screens on phones (portrait and landscape): the top of every screen can be reached (no
// centring that pushes it above the scroll origin), the bottom can be scrolled to, and on the home
// screen the wardrobe row is in sight without scrolling.
// Run with the game server on :8097:  node qa/phone-scroll.mjs   → qa/out/phone-scroll/*.png
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'phone-scroll');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
const browser = await chromium.launch({ channel: 'chromium' });
const PHONES = [
  ['iPhone-SE', devices['iPhone SE'].viewport],
  ['Galaxy-S9', { width: 320, height: 658 }],
  ['iPhone-13', devices['iPhone 13'].viewport],
  ['SE-landscape', { width: 568, height: 320 }],
  ['13-landscape', { width: 844, height: 390 }],
];
// the screen's own card(s), not the decorative background
const measure = (p) => p.evaluate(() => {
  const bg = document.querySelector('#overlay .menu-bg');
  const cards = [...bg.children].filter((el) => !el.classList.contains('menu-anim') && el.offsetParent !== null);
  bg.scrollTop = 0;
  const top = Math.min(...cards.map((el) => el.getBoundingClientRect().top));
  bg.scrollTop = bg.scrollHeight;
  const bottom = Math.max(...cards.map((el) => el.getBoundingClientRect().bottom));
  const gap = innerHeight - bottom;
  bg.scrollTop = 0;
  const row = document.querySelector('.gear-row');
  const r = row && row.offsetParent !== null ? row.getBoundingClientRect() : null;
  return { top: Math.round(top), gap: Math.round(gap), row: r && { top: Math.round(r.top), bottom: Math.round(r.bottom) }, vh: innerHeight };
});
for (const [name, viewport] of PHONES) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  await ctx.addInitScript(() => { localStorage.setItem('slam-ftue', 'seen'); localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}'); });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/?noftue`);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await p.waitForSelector('#play');
  await p.waitForTimeout(300);
  const home = await measure(p);
  await p.screenshot({ path: path.join(OUT, `${name}-home.png`) });
  check(`${name} home: top reachable`, home.top >= 0, JSON.stringify(home));
  check(`${name} home: bottom reachable`, home.gap >= 0, `gap ${home.gap}`);
  check(`${name} home: wardrobe row in sight`, Boolean(home.row) && home.row.bottom <= home.vh, JSON.stringify(home.row));
  for (const [screen, open] of [['create', '#create'], ['rooms', '#rooms'], ['wardrobe', '.gear-row']]) {
    await p.click(open);
    await p.waitForTimeout(500);
    const m = await measure(p);
    await p.screenshot({ path: path.join(OUT, `${name}-${screen}.png`) });
    check(`${name} ${screen}: top reachable`, m.top >= 0, `top ${m.top}`);
    await p.goto(`${BASE}/?noftue`);
    await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
    await p.evaluate(() => document.getElementById('intro')?.remove());
    await p.waitForSelector('#play');
  }
  await ctx.close();
}
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
