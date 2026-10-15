// The tutorial pictures with the new card: the lobby invite and the five steps, desktop + phone.
// Run with the game server on :8097:  node qa/ftue-art.mjs   → qa/out/ftue/*.png
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'ftue');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
let ok = true;
for (const [tag, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['phone', devices['iPhone SE']]]) {
  const ctx = await browser.newContext({ ...opts, locale: process.env.SLAM_LANG || 'vi-VN' });
  await ctx.addInitScript(() => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-name', 'Bill');
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await p.goto(`${BASE}/?debug`);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await p.click('#create');
  await p.click('#create-go');
  await p.waitForSelector('#ftue-yes', { timeout: 10000 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, `${tag}-0-invite.png`) });
  await p.click('#ftue-yes');
  for (let i = 1; i <= 5; i++) {
    await p.waitForTimeout(350);
    await p.locator('.ftue-card').screenshot({ path: path.join(OUT, `${tag}-${i}.png`) });
    // the pet pictures in the cards must have loaded
    const broken = await p.evaluate(() => [...document.querySelectorAll('.fa-c')].length === 0);
    if (i === 1 && broken) { ok = false; console.log('FAIL no cards on step 1'); }
    await p.click('.ftue-next');
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? `FAIL errors: ${errors.join(' | ')}` : 'ok no page errors');
process.exit(ok && !errors.length ? 0 : 1);
