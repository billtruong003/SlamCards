// Product stills for the studio site, the stores and the thumbnails: clean frames (the film look of rec.mjs, no HUD),
// rendered at 2x, posed with slamDebug.place and the film camera. → qa/out/stills/*.png
//   node qa/capture/stills.mjs   (game server on :8097)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, state, toFirstTurn } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'stills');
fs.mkdirSync(OUT, { recursive: true });
const BIG = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 };
const TALL = { viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1.5 };
const browser = await launch();
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') }).then(() => console.log('  ', name));
const clean = (p) => p.addStyleTag({ content: 'body *{visibility:hidden!important} canvas, #labels .pop{visibility:visible!important}' });
const cam = (p, look, from, fov) => p.evaluate(([l, f, fv]) => {
  const w = slamDebug.world;
  w.camera.clearViewOffset(); if (fv) w.camera.fov = fv; w.camera.updateProjectionMatrix();
  w.lookTarget.set(...l); w.cameraBase.set(...f); w.needsRender = true;
}, [look, from, fov]);
const pose = (p, cards) => p.evaluate((cs) => {
  const now = slamDebug.cards(); const me = slamDebug.me;
  const others = Object.keys(now).filter((k) => k !== me && now[k].p[1] > -10);
  const out = { ...now };
  cs.forEach((c, i) => { const seat = i === 0 ? me : others[i - 1]; if (seat) out[seat] = c; });
  slamDebug.place(out);
}, cards);
const UP = [0, 0, 0, 1]; const DOWN = [0, 0, 1, 0];
const yaw = (a, flip) => { const q = [0, Math.sin(a / 2), 0, Math.cos(a / 2)]; return flip ? [Math.cos(a / 2) * 0, 0, Math.cos(a / 2), -Math.sin(a / 2) * 0 + 0] : q; };

async function room(look, n, size = BIG) {
  const ids = ['bill', 'teo', 'ti', 'bu'].slice(0, n);
  const host = await player(browser, ids[0], size);
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const guests = [];
  for (const id of ids.slice(1)) {
    const g = await player(browser, id, { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean` });
    await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
    await g.waitForSelector('#ready'); await g.click('#ready'); guests.push(g);
  }
  await host.waitForFunction((k) => Object.values(slamDebug.state.ready || {}).filter(Boolean).length >= k, n - 1);
  await host.click('#start');
  await toFirstTurn(host, [host, ...guests], ['bua', 'keo', 'keo', 'keo']);
  await sleep(1500);
  return { host, guests };
}

try {
  // ---- two players: the capture, close; the slam in the air; a top view of the two cards
  {
    const { host } = await room(null, 2);
    await clean(host);
    await pose(host, [{ p: [0.18, 0.026, 0.08], q: [0, Math.sin(0.14), 0, Math.cos(0.14)] }, { p: [0.55, 0.008, 0.2], q: DOWN }]);
    await cam(host, [0.4, 0, 0.18], [0.75, 2.2, 2.3]); await sleep(500); await shot(host, 'capture-close');
    await cam(host, [0.38, 0, 0.15], [0.42, 3.6, 0.55], 32); await sleep(500); await shot(host, 'capture-top');
    await cam(host, [0.4, 0, 0.15], [1.6, 1.25, 2.1], 34); await sleep(500); await shot(host, 'capture-low');
    // the slam: the slipper comes down between the two cards, frames as it lands
    await pose(host, [{ p: [-0.45, 0.008, 0.2], q: DOWN }, { p: [1.0, 0.008, 0.2], q: DOWN }]);
    await cam(host, [0.1, 0, 0.2], [0.5, 2.5, 2.6], 40); await sleep(700);
    await host.evaluate(() => slamDebug.filmSlam(-1.78, 0.2));
    for (let i = 0; i < 14; i++) { await shot(host, `slam-${String(i).padStart(2, '0')}`); await sleep(25); }
    await host.waitForFunction(() => !slamDebug.simulating, null, { timeout: 15000 }); await sleep(600);
    await shot(host, 'slam-after');
  }
  // ---- four players: the whole table from the game's own camera, and closer
  {
    const { host } = await room(null, 4);
    await clean(host);
    await shot(host, 'table4-game');
    await cam(host, [0, 0, 0.4], [0, 9.5, 7.5], 38); await sleep(500); await shot(host, 'table4-high');
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
