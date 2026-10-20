// Style frames for the "Super Hero" MV: real game frames (film look, no HUD) posed with slamDebug, 16:9 at 2x.
// → qa/out/mv-stills/*.png
//   SLAM_TIMING='{"turn":600000}' node proto/server/server.js
//   node qa/capture/mv-stills.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn, LOOKS } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'mv-stills');
fs.mkdirSync(OUT, { recursive: true });
const WIDE = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 };
const TALL = { viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1.5 };
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (name) => !ONLY || ONLY.some((o) => name.startsWith(o));

// the hero roster: two rooms of four, every pet in its own card colour
LOOKS.h1 = { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h2 = { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
LOOKS.h3 = { pet: 'chick', dep: 'dep_to_ong', depColors: ['#ffc93c'], cardColor: 'vang' };
LOOKS.h4 = { pet: 'fox', dep: 'dep_lao', depColors: ['#2a1418', '#3ccf6e'], cardColor: 'la' };
LOOKS.h5 = { pet: 'cat', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h6 = { pet: 'dog', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
LOOKS.h7 = { pet: 'penguin', dep: 'dep_to_ong', depColors: ['#ffc93c'], cardColor: 'vang' };
LOOKS.h8 = { pet: 'pig', dep: 'dep_lao', depColors: ['#2a1418', '#3ccf6e'], cardColor: 'la' };
const NAMES = { h1: 'Hổ', h2: 'Gấu', h3: 'Gà', h4: 'Cáo', h5: 'Mèo', h6: 'Cún', h7: 'Cánh Cụt', h8: 'Heo' };

const browser = await launch();
const shot = (p, name) => (want(name) ? p.screenshot({ path: path.join(OUT, name + '.png') }).then(() => console.log('  ', name)) : null);
const clean = (p) => p.addStyleTag({ content: 'body *{visibility:hidden!important} canvas, #labels .pop{visibility:visible!important}' });
const cam = (p, look, from, fov = 40) => p.evaluate(([l, f, fv]) => {
  const w = slamDebug.world;
  w.camera.clearViewOffset(); w.camera.fov = fv; w.camera.updateProjectionMatrix();
  w.lookTarget.set(...l); w.cameraBase.set(...f); w.needsRender = true;
}, [look, from, fov]);
// cards by seat order (me first); every card not listed goes under the table
const pose = (p, cards) => p.evaluate((cs) => {
  const now = slamDebug.cards(); const me = slamDebug.me;
  const seats = [me, ...Object.keys(now).filter((k) => k !== me)];
  const out = {};
  seats.forEach((s, i) => { out[s] = cs[i] ?? { p: [0, -20, 0], q: [0, 0, 0, 1] }; });
  slamDebug.place(out);
  return seats;
}, cards);
const react = (p, i, clip) => p.evaluate(([k, c]) => {
  const now = slamDebug.cards(); const me = slamDebug.me;
  const seats = [me, ...Object.keys(now).filter((s) => s !== me)];
  slamDebug.world.react(seats[k], c);
}, [i, clip]);
const UP = [0, 0, 0, 1]; const DOWN = [0, 0, 1, 0];
const yaw = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];

async function room(ids, size = WIDE) {
  const host = await player(browser, ids[0], size, { name: NAMES[ids[0]] });
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const guests = [];
  for (const id of ids.slice(1)) {
    const g = await player(browser, id, { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean`, name: NAMES[id] });
    await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
    await g.waitForSelector('#ready'); await g.click('#ready'); guests.push(g);
  }
  await host.waitForFunction((k) => Object.values(slamDebug.state.ready || {}).filter(Boolean).length >= k, ids.length - 1);
  await host.click('#start');
  await toFirstTurn(host, [host, ...guests], ['bua', 'keo', 'keo', 'keo']);
  await sleep(1500);
  await clean(host);
  return { host, guests };
}

try {
  for (const [r, ids] of [['a', ['h1', 'h2', 'h3', 'h4']], ['b', ['h5', 'h6', 'h7', 'h8']]]) {
    const { host } = await room(ids);
    // ---- the roll call: each hero's card face up alone, camera low and close, the pet dancing
    for (let i = 0; i < 4; i++) {
      const cards = []; cards[i] = { p: [0, 0.008, 0], q: yaw(0.12) };
      await pose(host, cards);
      await react(host, i, 'dance');
      await cam(host, [0, 0, 0.12], [0.3, 1.3, 1.9], 30); await sleep(900);
      await shot(host, `hero-${r}${i}-${ids[i]}`);
    }
    if (r === 'a') {
      // ---- the line-up: four cards face up in a row, low hero angle
      await pose(host, [-1.5, -0.5, 0.5, 1.5].map((x, i) => ({ p: [x, 0.008, 0], q: yaw((i - 1.5) * -0.08) })));
      for (let i = 0; i < 4; i++) await react(host, i, 'dance');
      await cam(host, [0, 0, 0.35], [0, 1.7, 3.4], 36); await sleep(900); await shot(host, 'lineup-low');
      await cam(host, [0, 0, 0.1], [0, 3.6, 1.6], 38); await sleep(700); await shot(host, 'lineup-top');
      // ---- the weapons: the three slippers on the table
      await pose(host, []);
      await host.evaluate(() => slamDebug.previewDeps(['black', 'pink', 'blue']));
      await cam(host, [0, 0.1, 1.2], [0.3, 1.7, 4.9], 40); await sleep(900); await shot(host, 'weapons');
    }
  }
  // ---- the duel: the slam frame by frame, the capture after, the four-way table (a fresh room: no stray slippers)
  {
    const { host } = await room(['h1', 'h2', 'h3', 'h4']);
    await pose(host, [{ p: [-0.45, 0.008, 0.2], q: DOWN }, { p: [1.0, 0.008, 0.2], q: DOWN }]);
    await cam(host, [0.1, 0, 0.2], [0.5, 2.5, 2.6], 40); await sleep(700);
    await host.evaluate(() => { slamDebug.timeScale = 0.25; slamDebug.filmSlam(-1.78, 0.2); });
    for (let i = 0; i < 24; i++) { await shot(host, `slam-${String(i).padStart(2, '0')}`); await sleep(40); }
    await host.waitForFunction(() => !slamDebug.simulating, null, { timeout: 30000 });
    await host.evaluate(() => { slamDebug.timeScale = 1; });
    await sleep(600); await shot(host, 'slam-after');
    await pose(host, [{ p: [0.18, 0.026, 0.08], q: yaw(0.28) }, { p: [0.55, 0.008, 0.2], q: DOWN }]);
    await react(host, 0, 'dance');
    await cam(host, [0.4, 0, 0.18], [0.75, 1.5, 1.9], 34); await sleep(700); await shot(host, 'capture-hero');
    await pose(host, [-1.2, -0.4, 0.4, 1.2].map((x, i) => ({ p: [x, 0.008, (i % 2) * 0.5 - 0.25], q: i % 2 ? DOWN : yaw(i * 0.3) })));
    await cam(host, [0, 0, 0.2], [0, 3.8, 3.4], 40); await sleep(700); await shot(host, 'table-wide');
  }
  // ---- vertical: one hero card for the 9:16 cut
  {
    const { host } = await room(['h1', 'h2'], TALL);
    await pose(host, [{ p: [0, 0.008, 0], q: yaw(0.1) }]);
    await react(host, 0, 'dance');
    await cam(host, [0, 0.05, 0], [0.15, 1.5, 1.4], 40); await sleep(900); await shot(host, 'tall-hero');
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
