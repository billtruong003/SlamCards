// Big cut-outs for key art: the pets and the slippers rendered by the game's asset studio (transparent, ink sticker
// line) at 1024 px, and one card face up / face down shot on a flat green background for keying.
//   node qa/capture/media-assets.mjs (game server on :8097) → video/media/src/cut-*.png
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'video', 'media', 'src');
const b = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
await p.goto('http://localhost:8097/?debug&noftue');
await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
await p.waitForTimeout(2000);
const shots = await p.evaluate(async () => {
  const { defaultDepColors } = await import('/slam-cards/src/catalog.js').catch(() => ({}));
  return slamDebug.renderAssets({
    pets: ['tiger', 'panda', 'chick', 'fox', 'cat', 'dog'],
    deps: [['dep_lao', ['#fffaf0', '#ff5c9d']], ['dep_le', ['#fffaf0', '#2fa8ff', '#7a3d1a']], ['dep_to_ong', ['#ffc93c']]],
    size: 1024,
  });
});
for (const [key, url] of Object.entries(shots)) {
  fs.writeFileSync(path.join(OUT, `cut-${key.replace(':', '-')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log('  ', key);
}
await b.close();
