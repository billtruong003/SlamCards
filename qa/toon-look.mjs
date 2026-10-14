// Shading experiment: the same slipper close-up under a few light/gradient setups (in the page only, no code change).
// Run with the game server on :8097:  node qa/toon-look.mjs   → qa/out/toon/*.png
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'toon');
fs.mkdirSync(OUT, { recursive: true });

const VARIANTS = [
  { name: 'a-current', hemi: null, sun: null, bands: null },
  { name: 'b-less-ambient', hemi: 0.6, sun: 2.6, bands: null },
  { name: 'c-less-ambient-darker-bands', hemi: 0.6, sun: 2.6, bands: [70, 160, 255] },
];

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
  localStorage.setItem('slam-ftue', 'seen');
});
await page.goto('http://localhost:8097/?debug&noftue');
await page.waitForFunction(() => window.slamBooted === true);
await page.waitForTimeout(2500);
await page.evaluate(() => {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('intro')?.remove();
  slamDebug.previewDeps();
  const w = slamDebug.world;
  w.cameraBase.set(0, 2.2, 3.4);
  w.lookTarget.set(0, 0, 1.2);
});

for (const v of VARIANTS) {
  await page.evaluate((v) => {
    const w = slamDebug.world;
    const hemi = w.scene.children.find((o) => o.isHemisphereLight);
    window.__base ??= { hemi: hemi.intensity, sun: w.sun.intensity };
    hemi.intensity = v.hemi ?? window.__base.hemi;
    w.sun.intensity = v.sun ?? window.__base.sun;
    w.scene.traverse((o) => {
      const m = o.material;
      if (m?.isMeshToonMaterial && m.gradientMap) {
        window.__grad ??= m.gradientMap.image.data.slice();
        m.gradientMap.image.data.set(v.bands ?? window.__grad);
        m.gradientMap.needsUpdate = true;
      }
    });
    w.renderer.shadowMap.needsUpdate = true;
    w.needsRender = true;
  }, v);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${v.name}.png`), clip: { x: 0, y: 120, width: 1280, height: 560 } });
}
await browser.close();
console.log('saved to', OUT);
