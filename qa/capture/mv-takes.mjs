// The MV's epic 15 s, filmed (chorus 1, 0:47–1:02): T1 the pet steps out of its card, T2 the slam, T3 the dive into
// the window + the heroes running in the space behind it, T4 the pull back out to the table.
//   SLAM_TIMING='{"turn":600000}' node proto/server/server.js
//   SLOW=0.25 node qa/capture/mv-takes.mjs      → qa/out/film/mv-T*/ (then assemble.py on each)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn, record, LOOKS } from './rec.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'film');
const WIDE = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 };
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

LOOKS.h1 = { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h2 = { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
LOOKS.h3 = { pet: 'chick', dep: 'dep_to_ong', depColors: ['#ffc93c'], cardColor: 'vang' };
LOOKS.h4 = { pet: 'fox', dep: 'dep_lao', depColors: ['#2a1418', '#3ccf6e'], cardColor: 'la' };
const NAMES = { h1: 'Hổ', h2: 'Gấu', h3: 'Gà', h4: 'Cáo' };

const browser = await launch();
const clean = (p) => p.addStyleTag({ content: 'body *{visibility:hidden!important} canvas, #labels .pop{visibility:visible!important}' });
const pose = (p, cards) => p.evaluate((cs) => {
  const now = slamDebug.cards(); const me = slamDebug.me;
  const seats = [me, ...Object.keys(now).filter((k) => k !== me)];
  const out = {};
  seats.forEach((s, i) => { out[s] = cs[i] ?? { p: [0, -20, 0], q: [0, 0, 0, 1] }; });
  slamDebug.place(out);
}, cards);
const yaw = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const DOWN = [0, 0, 1, 0];
const set = (p, c) => p.evaluate((x) => __film.camSet(x), c);
const move = (p, c, ms, ease) => p.evaluate(([x, m, e]) => __film.camTo(x, m, e), [c, ms, ease]);

async function room() {
  const ids = ['h1', 'h2', 'h3', 'h4'];
  const host = await player(browser, ids[0], WIDE, { name: NAMES[ids[0]] });
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
  await host.evaluate(() => slamDebug.film());
  // the friends' windows are only needed to join: closing them keeps the screencast's frame rate up
  for (const g of guests) await g.close();
  return host;
}

const takes = {
  async T1(host, rec) {
    await pose(host, [{ p: [0, 0.008, 0], q: yaw(0.1) }]);
    await set(host, { look: [0, 0.28, -0.05], from: [0.3, 1.35, 2.7], fov: 32 }); await sleep(800);
    rec = await rec();
    await sleep(300);
    await move(host, { look: [0, 0.32, -0.05], from: [0.18, 0.95, 1.95], fov: 32 }, 3000, 'out');
    await host.evaluate(() => __film.popOut(slamDebug.me, { forward: 0.42, up: 0.42, grow: 1.35, ms: 1500 }));
    await sleep(3300);
    return rec;
  },
  async T2(host, rec) {
    await pose(host, [{ p: [-0.45, 0.008, 0.2], q: DOWN }, { p: [1.0, 0.008, 0.2], q: DOWN }]);
    await set(host, { look: [0.1, 0, 0.2], from: [0.5, 2.5, 2.6], fov: 40 }); await sleep(800);
    rec = await rec();
    await sleep(300);
    await move(host, { look: [0.1, 0, 0.2], from: [0.35, 2.1, 2.2], fov: 40 }, 3500, 'linear');
    await host.evaluate(() => slamDebug.filmSlam(-1.78, 0.2));
    await sleep(3500);
    return rec;
  },
  async T3(host, rec) {
    await pose(host, [{ p: [0, 0.008, 0], q: yaw(0) }]);
    await set(host, { look: [0, 0, -0.05], from: [0, 1.5, 1.6], fov: 34 }); await sleep(800);
    rec = await rec();
    await sleep(300);
    await move(host, { look: [0, 0, -0.127], from: [0, 0.42, 0.05], fov: 34 }, 1300, 'in');
    await sleep(1300);
    // the window fills the frame: cut to its space built big, the camera as close on the tiger
    await host.evaluate(() => __film.world({ cardColor: 'hong', floor: 9, pets: [
      { id: 'panda', x: -1.95, z: -1.3 }, { id: 'tiger', x: -0.65, z: -1 }, { id: 'chick', x: 0.65, z: -1.3 }, { id: 'fox', x: 1.95, z: -1 },
    ] }));
    await set(host, { look: [-0.65, 0.55, -1], from: [-0.65, 0.62, 0.35], fov: 34 });
    await sleep(200);
    await move(host, { look: [0, 0.6, -1], from: [0.3, 0.42, 4.6], fov: 38 }, 1700, 'out');
    await sleep(900);
    await host.evaluate(() => __film.run(0.55));
    await move(host, { look: [0, 0.6, 0.5], from: [0.2, 0.3, 6.4], fov: 38 }, 3500, 'linear');
    await sleep(3200);
    return rec;
  },
  async T4(host, rec) {
    const xs = [-1.65, -0.55, 0.55, 1.65];
    await pose(host, xs.map((x, i) => ({ p: [x, 0.008, 0], q: yaw((i - 1.5) * -0.06) })));
    await host.evaluate(() => { const w = slamDebug.world; for (const s of w.seats) w.react(s, 'dance'); });
    await set(host, { look: [-1.65, 0, -0.127], from: [-1.65, 0.42, 0.05], fov: 34 }); await sleep(800);
    rec = await rec();
    await sleep(200);
    await move(host, { look: [0, 0, -0.05], from: [0, 2.6, 3.4], fov: 36 }, 1900, 'inOut');
    await sleep(2000);
    await move(host, { look: [0, 0, 0], from: [0, 6.5, 6.0], fov: 36 }, 1800, 'inOut');
    await sleep(2000);
    return rec;
  },
};

try {
  for (const [name, take] of Object.entries(takes)) {
    if (ONLY && !ONLY.includes(name)) continue;
    const host = await room();
    const dir = path.join(ROOT, `mv-${name}`);
    const rec = await take(host, () => record(host, dir));
    await rec.stop();
    await host.context().close();
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
