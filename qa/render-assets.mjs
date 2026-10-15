// Renders the wardrobe pictures with the game's own shader (asset-studio.js, ?debug):
// pets → proto/public/pets/thumbs/<id>.png, slippers in their default colours → proto/public/deps/<id>.png.
// Run with the game server on :8097:  node qa/render-assets.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PETS, DEP_IDS, defaultDepColors } from '../proto/src/catalog.js';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'proto', 'public');
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}'));
await page.goto(`${BASE}/?debug&noftue`);
await page.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
await page.waitForFunction(() => Boolean(window.slamDebug?.renderAssets));
// slipper models load after boot
await page.waitForTimeout(1500);
const shots = await page.evaluate((o) => window.slamDebug.renderAssets(o), {
  pets: PETS, deps: DEP_IDS.map((d) => [d, defaultDepColors(d)]), size: 256,
});
let n = 0;
for (const [key, url] of Object.entries(shots)) {
  const [kind, id] = [key.slice(0, 3), key.slice(4)];
  const file = kind === 'pet' ? path.join(PUB, 'pets', 'thumbs', `${id}.png`) : path.join(PUB, 'deps', `${id}.png`);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  n++;
}
await browser.close();
console.log(n, 'pictures written', errors.length ? `errors: ${errors.join(' | ')}` : '');
process.exit(n === PETS.length + DEP_IDS.length && !errors.length ? 0 : 1);
