// Cards lying on the table rim: the table's ink outline must not cover them (see boxOutline in world.js).
// Run with the game server on :8097:  node qa/table-rim.mjs   → qa/out/table-rim.png
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'table-rim.png');
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
  localStorage.setItem('slam-ftue', 'seen');
});
await page.goto('http://localhost:8097/?debug&noftue');
await page.waitForFunction(() => window.slamBooted === true);
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('intro')?.remove();
  const w = slamDebug.world;
  const seats = w.seats ?? Object.keys(w.cards ?? {});
  const { hx, hz } = w.table;
  // one card hanging over each rim, one on the far edge, all flat on the top (y = 0.25 + half thickness)
  const spots = [[0, -(hz - 0.35)], [hx - 0.3, 0], [-(hx - 0.3), 0.6], [0.6, hz - 0.35]];
  const cards = {};
  seats.forEach((s, i) => { const [x, z] = spots[i % spots.length]; cards[s] = { p: [x, 0.27, z], q: [0, 0, 0, 1] }; });
  w.setCards(cards);
  w.needsRender = true;
  return { seats, hx, hz };
});
await page.waitForTimeout(600);
await page.screenshot({ path: OUT });
console.log(JSON.stringify(info), 'saved', OUT);
await browser.close();
