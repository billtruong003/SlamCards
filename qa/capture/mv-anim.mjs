// The MV's living cut-outs: each cast pet's loops (idle, walk, run, dance, yes, no, eat) sampled at 12 frames a second
// on a green key → qa/out/mv-anim/<pet>-<pose>/NN.png, keyed by video/mv/key_anim.py  (game server on :8097)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn, LOOKS } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', process.env.OUTDIR || 'mv-anim2');
const CAST = (process.env.CAST || 'tiger,panda,chick,fox,lion,crab,hog,elephant').split(',');
const POSES = {
  front: [0, 'idle'], tq: [0.6, 'idle'], back: [Math.PI + 0.3, 'idle'],
  walk: [1.0, 'walk'], run: [0.7, 'run'], runfront: [0.05, 'run'],
  dance: [0.2, 'dance'], dance2: [-0.3, 'dance'], yes: [0.3, 'gesture-positive'], no: [0.3, 'gesture-negative'], eat: [0.6, 'eat'],
};
const FPS = 12;
LOOKS.h1 = { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h2 = { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
const browser = await launch();
try {
  const host = await player(browser, 'h1', { viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 }, { name: 'Hổ' });
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const g = await player(browser, 'h2', { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean`, name: 'Gấu' });
  await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
  await g.waitForSelector('#ready'); await g.click('#ready');
  await host.waitForFunction(() => Object.values(slamDebug.state.ready || {}).filter(Boolean).length >= 1);
  await host.click('#start');
  await toFirstTurn(host, [host, g], ['bua', 'keo']);
  await sleep(1200);
  await g.close();
  await host.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  await host.evaluate(() => slamDebug.film());
  for (const pet of CAST) {
    for (const [pose, [ry, clip]] of Object.entries(POSES)) {
      // a fresh stage per pose, the camera at the pet's eye level, no hull: the edit draws the silhouette line
      await host.evaluate((id) => __film.world({ key: '#00ff00', pets: [{ id, x: 0, z: 0 }] }).then(() => __film.hulls(false)), pet);
      await host.evaluate(() => __film.camSet({ look: [0, 0.58, 0], from: [0, 0.62, 3.1], fov: 30 }));
      await sleep(250);
      const dur = await host.evaluate((c) => __film.clipLength(0, c), clip);
      const n = Math.max(6, Math.min(24, Math.round((dur || 1) * FPS)));
      const dir = path.join(OUT, `${pet}-${pose}`);
      fs.mkdirSync(dir, { recursive: true });
      for (let k = 0; k < n; k++) {
        await host.evaluate(([r, c, at]) => __film.actor(0, { ry: r, clip: c, at, x: 0, z: 0, y: 0 }), [ry, clip, (k / n) * dur]);
        await sleep(60);
        await host.screenshot({ path: path.join(dir, `${String(k).padStart(2, '0')}.png`) });
      }
    }
    console.log('  ', pet);
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
