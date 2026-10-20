// Cut-outs for the MV's motion graphics: every pet of the cast in its poses, on a green key (film.world({ key })).
// → qa/out/mv-cutouts/<pet>-<pose>.png, keyed to alpha by video/mv/key.py      (game server on :8097)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn, LOOKS } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'mv-cutouts');
fs.mkdirSync(OUT, { recursive: true });
const CAST = (process.env.CAST || 'tiger,panda,chick,fox,lion,crab,hog,elephant,cat,dog,pig,penguin,bunny,cow,monkey,parrot').split(',');
// pose: [turn, clip, time in the clip]
const POSES = {
  front: [0, 'idle', 0.3], tq: [0.6, 'idle', 0.3], back: [Math.PI + 0.3, 'idle', 0.3],
  walk: [1.0, 'walk', 0.25], run: [0.7, 'run', 0.15], runfront: [0.05, 'run', 0.15],
  dance: [0.2, 'dance', 0.45], dance2: [-0.3, 'dance', 0.9], yes: [0.3, 'gesture-positive', 0.5], no: [0.3, 'gesture-negative', 0.5], eat: [0.6, 'eat', 0.6],
};
LOOKS.h1 = { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h2 = { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
const browser = await launch();
try {
  const host = await player(browser, 'h1', { viewport: { width: 1600, height: 1600 } }, { name: 'Hổ' });
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
  await host.evaluate(() => slamDebug.film().then((f) => f.outlinePx(10)));
  for (const pet of CAST) {
    await host.evaluate((id) => __film.world({ key: '#00ff00', pets: [{ id, x: 0, z: 0 }] }), pet);
    await host.evaluate(() => __film.camSet({ look: [0, 0.55, 0], from: [0, 0.75, 3.3], fov: 30 }));
    for (const [name, [ry, clip, at]] of Object.entries(POSES)) {
      await host.evaluate(([r, c, t]) => __film.actor(0, { ry: r, clip: c, at: t, x: 0, z: 0, y: 0 }), [ry, clip, at]);
      await sleep(250);
      await host.screenshot({ path: path.join(OUT, `${pet}-${name}.png`) });
    }
    console.log('  ', pet);
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
