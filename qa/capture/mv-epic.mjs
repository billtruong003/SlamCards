// Key frames of the MV's epic 15 s (chorus 1, 0:47–1:02): the pet steps out of its card, the fake zoom into
// the window, the four heroes running in the space behind it, the pull back to the table. → qa/out/mv-epic/*.png
//   SLAM_TIMING='{"turn":600000}' node proto/server/server.js
//   node qa/capture/mv-epic.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn, LOOKS } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'mv-epic');
fs.mkdirSync(OUT, { recursive: true });
const WIDE = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 };
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (name) => !ONLY || ONLY.some((o) => name.startsWith(o));

LOOKS.h1 = { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h2 = { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
LOOKS.h3 = { pet: 'chick', dep: 'dep_to_ong', depColors: ['#ffc93c'], cardColor: 'vang' };
LOOKS.h4 = { pet: 'fox', dep: 'dep_lao', depColors: ['#2a1418', '#3ccf6e'], cardColor: 'la' };
const NAMES = { h1: 'Hổ', h2: 'Gấu', h3: 'Gà', h4: 'Cáo' };

const browser = await launch();
const shot = (p, name) => (want(name) ? p.screenshot({ path: path.join(OUT, name + '.png') }).then(() => console.log('  ', name)) : null);
const clean = (p) => p.addStyleTag({ content: 'body *{visibility:hidden!important} canvas, #labels .pop{visibility:visible!important}' });
const cam = (p, look, from, fov = 34) => p.evaluate(([l, f, fv]) => {
  const w = slamDebug.world;
  w.camera.clearViewOffset(); w.camera.fov = fv; w.camera.updateProjectionMatrix();
  w.lookTarget.set(...l); w.cameraBase.set(...f); w.needsRender = true;
}, [look, from, fov]);
const pose = (p, cards) => p.evaluate((cs) => {
  const now = slamDebug.cards(); const me = slamDebug.me;
  const seats = [me, ...Object.keys(now).filter((k) => k !== me)];
  const out = {};
  seats.forEach((s, i) => { out[s] = cs[i] ?? { p: [0, -20, 0], q: [0, 0, 0, 1] }; });
  slamDebug.place(out);
  return seats;
}, cards);
const yaw = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

async function room(ids) {
  const host = await player(browser, ids[0], WIDE, { name: NAMES[ids[0]] });
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  for (const id of ids.slice(1)) {
    const g = await player(browser, id, { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean`, name: NAMES[id] });
    await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
    await g.waitForSelector('#ready'); await g.click('#ready');
  }
  await host.waitForFunction((k) => Object.values(slamDebug.state.ready || {}).filter(Boolean).length >= k, ids.length - 1);
  await host.click('#start');
  await toFirstTurn(host, [host], ['bua']);
  await sleep(1500);
  await clean(host);
  await host.evaluate(() => slamDebug.film());
  return host;
}

try {
  const host = await room(['h1', 'h2', 'h3', 'h4']);
  // ---- A. "I'm a superhero": Hổ steps out of its card (slow: 8 s so the stills catch the move)
  await pose(host, [{ p: [0, 0.008, 0], q: yaw(0.1) }]);
  await cam(host, [0, 0.28, -0.05], [0.25, 1.25, 2.5], 32); await sleep(900);
  await shot(host, 'A0-card');
  await host.evaluate(() => __film.popOut(slamDebug.me, { forward: 0.6, up: 0.14, grow: 1.3, ms: 8000 }));
  for (let i = 1; i <= 4; i++) { await sleep(2000); await shot(host, `A${i}-popout`); }
  // ---- C. the fake zoom: back to a calm card, the camera dives into the window until it fills the frame
  const host2 = await room(['h1', 'h2', 'h3', 'h4']);
  await pose(host2, [{ p: [0, 0.008, 0], q: yaw(0) }]);
  const far = { look: [0, 0, -0.05], from: [0, 1.5, 1.6] };
  const near = { look: [0, 0, -0.127], from: [0, 0.42, 0.05] };
  for (const [i, k] of [0, 0.45, 0.75, 1].entries()) {
    await cam(host2, lerp(far.look, near.look, k), lerp(far.from, near.from, k), 34); await sleep(500);
    await shot(host2, `C${i}-zoom`);
  }
  // ---- D. inside: the window's space built big, the four heroes in a row, then running at the camera
  await host2.evaluate(() => __film.world({ cardColor: 'hong', floor: 7, pets: [
    { id: 'tiger', x: -1.9, z: -1 }, { id: 'panda', x: -0.65, z: -1.3 }, { id: 'chick', x: 0.65, z: -1.3 }, { id: 'fox', x: 1.9, z: -1 },
  ] }));
  await cam(host2, [0, 0.7, -1], [0, 2.2, 6.5], 34); await sleep(1200); await shot(host2, 'D0-world');
  await cam(host2, [0, 0.6, -1], [0.5, 0.4, 4.6], 38); await sleep(500); await shot(host2, 'D1-lineup-low');
  await host2.evaluate(() => __film.run(0.45));
  for (let i = 2; i <= 4; i++) { await sleep(250); await shot(host2, `D${i}-run`); }
  // ---- E. the pull back: out of the world onto the table, four cards side by side (no two touching)
  await host2.evaluate(() => __film.exitWorld());
  await pose(host2, [-1.65, -0.55, 0.55, 1.65].map((x, i) => ({ p: [x, 0.008, 0], q: yaw((i - 1.5) * -0.06) })));
  await host2.evaluate(() => { const w = slamDebug.world; for (const s of w.seats) w.react(s, 'dance'); });
  await cam(host2, [0, 0, -0.05], [0, 2.6, 3.4], 36); await sleep(900); await shot(host2, 'E0-table');
  await cam(host2, [0, 0, 0], [0, 6.5, 6.0], 36); await sleep(600); await shot(host2, 'E1-crane');
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
