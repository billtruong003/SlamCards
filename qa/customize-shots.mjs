// Screenshots of the customise mockup (mockup/customize) on a real GPU.
// Serve the folder first:  python -m http.server 8123 --directory mockup/customize
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'customize');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:8123/');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.waitForTimeout(800);
const stage = page.locator('.bench');
await stage.screenshot({ path: path.join(OUT, '1-front.png') });
await page.click('#flip');
await page.waitForTimeout(1800);
await stage.screenshot({ path: path.join(OUT, '2-back.png') });
await page.click('#flip');
await page.click('[data-tab="dep"]');
await page.click('[data-dep="dep_le"]');
await page.waitForTimeout(600);
await page.click('[data-slot="0"][data-c="#ffc93c"]');
await page.click('[data-slot="1"][data-c="#2fa8ff"]');
await page.click('[data-slot="2"][data-c="#ff5c9d"]');
await page.click('[data-tab="pet"]');
await page.click('[data-pet="panda"]');
await page.click('#win');
await page.waitForTimeout(1500);
await stage.screenshot({ path: path.join(OUT, '3-dep-le-recolour-panda.png') });
for (const way of ['xanh', 'vang', 'la']) {
  await page.click('[data-tab="way"]');
  await page.click(`[data-way="${way}"]`);
  await page.waitForTimeout(700);
  await page.locator('#stage').screenshot({ path: path.join(OUT, `4-way-${way}.png`) });
}
await page.locator('#lobbies').screenshot({ path: path.join(OUT, '5-lobbies.png') });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(OUT, '6-phone.png'), fullPage: false });
console.log(JSON.stringify({ errors, overflowX: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) }));
await browser.close();
