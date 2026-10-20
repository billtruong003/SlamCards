// Renders every artboard of a board page in video/media (default keyart.html) to video/media/out/<id>.png. node qa/capture/media-render.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MEDIA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'video', 'media');
const OUT = path.join(MEDIA, 'out');
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: 'chromium' });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto('file:///' + path.join(MEDIA, process.argv[2] || 'keyart.html').split(path.sep).join('/'));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
for (const id of await p.$$eval('.ab', (els) => els.map((e) => e.id))) {
  await (await p.$('#' + id)).screenshot({ path: path.join(OUT, id + '.png') });
}
await p.screenshot({ path: path.join(OUT, '_all.png'), fullPage: true });
await b.close();
console.log('ok');
