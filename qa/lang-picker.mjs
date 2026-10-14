// Language picker: globe button in the corner opens a panel; picking a language reloads into it.
// Run with the game server on :8097:  node qa/lang-picker.mjs  → qa/out/lang-*.png
import { chromium, devices } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const browser = await chromium.launch({ channel: 'chromium' });
const results = [];
for (const [name, opts] of [['phone', devices['Pixel 7']], ['desktop', { viewport: { width: 1280, height: 720 } }]]) {
  const ctx = await browser.newContext({ ...opts, locale: 'es-MX' });
  await ctx.addInitScript(() => localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8097/?noftue');
  await page.waitForFunction(() => window.slamBooted === true);
  const detected = await page.evaluate(() => document.documentElement.lang);
  await page.click('#lang');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `lang-${name}-panel.png`) });
  await Promise.all([page.waitForEvent('load'), page.click('[data-lang="th"]')]);
  await page.waitForFunction(() => window.slamBooted === true);
  const after = await page.evaluate(() => ({ lang: document.documentElement.lang, saved: localStorage.getItem('slam-lang'), btn: document.getElementById('lang').textContent, create: document.getElementById('create')?.textContent }));
  await page.screenshot({ path: path.join(OUT, `lang-${name}-thai.png`) });
  results.push({ name, detected, after, errors });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
