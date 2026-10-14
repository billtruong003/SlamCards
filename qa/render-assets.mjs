// Renders transparent PNGs (pets, cards, slippers) from mockup/customize for the design canvas.
// Serve the folder first:  python -m http.server 8123 --directory mockup/customize
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'assets');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:8123/');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

// Pet avatars come straight from the page's thumbnail renderer.
const thumbs = await page.evaluate(() => window.__mock.thumbs);
for (const [id, url] of Object.entries(thumbs)) fs.writeFileSync(path.join(OUT, `pet-${id}.png`), Buffer.from(url.split(',')[1], 'base64'));

// A clean stage: no page chrome, transparent background, camera on the object.
await page.evaluate(() => {
  document.querySelectorAll('.wrap > *:not(.bench), .actions, .panel, .side, .hint').forEach((el) => { el.style.display = 'none'; });
  const stage = document.getElementById('stage');
  Object.assign(stage.style, { position: 'fixed', inset: '0', width: '900px', height: '900px', aspectRatio: 'auto', background: 'transparent', zIndex: 9 });
  Object.assign(document.body.style, { background: 'transparent' });
  document.documentElement.style.background = 'transparent';
  document.querySelector('.bench').style.display = 'block';
  document.querySelector('.bench > .sticker').style.cssText = 'border:0;box-shadow:none;background:transparent';
  window.dispatchEvent(new Event('resize'));
});
await page.waitForTimeout(500);
const shoot = async (name) => { await page.waitForTimeout(700); await page.locator('#stage canvas').screenshot({ path: path.join(OUT, `${name}.png`), omitBackground: true }); };

const CARDS = [['hong', 'cat'], ['xanh', 'panda'], ['vang', 'chick'], ['la', 'fox']];
await page.evaluate(() => { const m = window.__mock; m.freeze(true); m.showOnly('card'); m.camera.position.set(0, 0, 3.2); m.camera.lookAt(0, 0, 0); m.card.position.set(0, 0, 0); });
for (const [way, pet] of CARDS) {
  await page.evaluate(async ([way, pet]) => { await window.__mock.set({ way, pet, faceUp: true }); window.__mock.card.rotation.set(-0.05, 0.3, 0); }, [way, pet]);
  await shoot(`card-front-${way}`);
  await page.evaluate(async () => { await window.__mock.set({ faceUp: false }); });
  await shoot(`card-back-${way}`);
}

const SLIPPERS = [
  ['dep_lao', null, 'dep-lao'],
  ['dep_lao', ['#ffc93c', '#ff5c9d'], 'dep-lao-alt'],
  ['dep_le', null, 'dep-le'],
  ['dep_le', ['#fffaf0', '#2fa8ff', '#ff5c9d'], 'dep-le-alt'],
  ['dep_to_ong', null, 'dep-to-ong'],
  ['dep_to_ong', ['#3ccf6e'], 'dep-to-ong-alt'],
];
await page.evaluate(() => { const m = window.__mock; m.showOnly('slipper'); m.camera.position.set(1.0, 0.05, 2.0); m.camera.lookAt(0.95, -0.45, 0.2); });
for (const [dep, colors, name] of SLIPPERS) {
  await page.evaluate(async ([dep, colors]) => {
    const m = window.__mock;
    await m.set({ dep, colors: colors ?? undefined });
    if (!colors) await m.set({ colors: { dep_lao: ['#fffaf0', '#4f8ff0'], dep_le: ['#fffaf0', '#d93a3a', '#7a3d1a'], dep_to_ong: ['#6cc3e8'] }[dep] });
    m.showOnly('slipper');
  }, [dep, colors]);
  await shoot(name);
}
await browser.close();
console.log(fs.readdirSync(OUT).length, 'files in', OUT);
