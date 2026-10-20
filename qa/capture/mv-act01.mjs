// MV mockup frames, acts 0–1 (song 0:02–0:32): three frames per shot (start, middle, end of its camera move).
// → qa/out/mv-act01/<shot>-<a|b|c>.png      (game server on :8097; the ident's frames come from the Remotion trailer)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn, LOOKS } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'mv-act01');
fs.mkdirSync(OUT, { recursive: true });
LOOKS.h1 = { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h2 = { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
LOOKS.h3 = { pet: 'chick', dep: 'dep_to_ong', depColors: ['#ffc93c'], cardColor: 'vang' };
LOOKS.h4 = { pet: 'fox', dep: 'dep_lao', depColors: ['#2a1418', '#3ccf6e'], cardColor: 'la' };
const NAMES = { h1: 'Hổ', h2: 'Gấu', h3: 'Gà', h4: 'Cáo' };
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const browser = await launch();
const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const yaw = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const DOWN = [0, 0, 1, 0];
const downYaw = (a) => [Math.sin(a / 2) * 0, 0, Math.cos(a / 2), Math.sin(a / 2) * 1].map((v, i) => [0, -Math.sin(a / 2), Math.cos(a / 2), 0][i]);

async function room() {
  const ids = ['h1', 'h2', 'h3', 'h4'];
  const host = await player(browser, ids[0], { viewport: { width: 1920, height: 1080 } }, { name: NAMES[ids[0]] });
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
  await host.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  await host.evaluate(() => slamDebug.film().then((f) => f.outlinePx(12)));
  for (const g of guests) await g.close();
  return host;
}
const pose = (p, cards) => p.evaluate((cs) => {
  const now = slamDebug.cards(); const me = slamDebug.me;
  const seats = [me, ...Object.keys(now).filter((k) => k !== me)];
  const out = {};
  seats.forEach((s, i) => { out[s] = cs[i] ?? { p: [0, -20, 0], q: [0, 0, 0, 1] }; });
  slamDebug.place(out);
}, cards);
const cam = (p, c) => p.evaluate((x) => __film.camSet(x), c);
const shot = async (p, name) => {
  if (ONLY && !ONLY.some((o) => name.startsWith(o))) return;
  await sleep(450);
  await p.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('  ', name);
};
// three frames along a camera move from A to B (and an optional per-frame setup)
async function threeFrames(p, name, A, B, each) {
  for (const [i, k] of [0, 0.5, 1].entries()) {
    if (each) await each(k, i);
    await cam(p, { look: lerp(A.look, B.look, k), from: lerp(A.from, B.from, k), fov: (A.fov ?? 34) + ((B.fov ?? A.fov ?? 34) - (A.fov ?? 34)) * k });
    await shot(p, `${name}-${'abc'[i]}`);
  }
}

try {
  const host = await room();
  // ---- act 0: the table in the dark, one warm beam from the window, four cards face down
  await host.evaluate(() => __film.light({ hemi: 0.22, sun: 0.08, bg: '#1a1315', spot: { from: [-3.5, 7, 2.5], at: [0.2, 0, 0.4], intensity: 110, angle: 0.3, penumbra: 0.75 } }));
  const ring = [[0, 0.9, 0.15], [-1.25, -0.2, 0.9], [0.05, -1.25, -0.4], [1.3, -0.1, 2.0]];
  await pose(host, ring.map(([x, z, a]) => ({ p: [x, 0.008, z], q: [0, Math.sin(a / 2), 0, Math.cos(a / 2)].map((v, i, q) => i === 0 ? 0 : v) })).map((c) => ({ ...c, q: DOWN })));
  await threeFrames(host, '0.2-dolly', { look: [-1.6, 0, 0], from: [-3.2, 0.32, 1.7], fov: 36 }, { look: [1.6, 0, 0], from: [3.2, 0.32, 1.7], fov: 36 });
  await threeFrames(host, '0.3-crane', { look: [0, 0, 0], from: [0, 0.35, 2.8], fov: 36 }, { look: [0, 0, 0], from: [0, 6.8, 2.2], fov: 36 });
  await threeFrames(host, '0.4-push', { look: [0, 0, 0.9], from: [0, 2.0, 3.4], fov: 34 }, { look: [0, 0, 0.9], from: [0, 0.7, 1.75], fov: 34 });
  // ---- act 1: inside the cards, grey (graded in the edit): each pet alone
  await host.evaluate(() => __film.world({ cardColor: 'hong', floor: 9, pets: [{ id: 'tiger', x: 0, z: 0 }] }));
  await threeFrames(host, '1.1-walk', { look: [-2.2, 0.55, 0], from: [-2.2, 0.6, 4.2], fov: 34 }, { look: [2.2, 0.55, 0], from: [2.2, 0.6, 4.2], fov: 34 },
    (k) => host.evaluate((kk) => __film.actor(0, { x: -2.2 + 4.4 * kk, z: 0, ry: 1.0, clip: 'walk', at: kk * 0.6 }), k));
  await host.evaluate(() => __film.world({ cardColor: 'xanh', floor: 9, pets: [{ id: 'panda', x: 1.4, z: -0.5, ry: -0.5 }] }));
  await threeFrames(host, '1.2-eat', { look: [0.5, 0.45, -0.5], from: [-0.9, 0.75, 4.0], fov: 34 }, { look: [0.7, 0.45, -0.5], from: [-0.6, 0.7, 3.5], fov: 34 },
    (k) => host.evaluate((kk) => __film.actor(0, { clip: 'eat', at: kk * 1.4 }), k));
  await host.evaluate(() => __film.world({ cardColor: 'hong', floor: 9, pets: [{ id: 'tiger', x: 0, z: 0, ry: 0.2 }] }));
  await threeFrames(host, '1.3-lookup', { look: [0, 0.7, 0], from: [0.3, 0.25, 2.3], fov: 38 }, { look: [0, 5.5, -6], from: [0.3, 0.3, 2.6], fov: 38 },
    (k) => host.evaluate((kk) => __film.actor(0, { clip: 'idle', at: kk }), k));
  await threeFrames(host, '1.4-resolve', { look: [0, 0.62, 0], from: [0.35, 0.75, 2.6], fov: 34 }, { look: [0, 0.68, 0], from: [0.06, 0.66, 1.15], fov: 34 },
    (k) => host.evaluate((kk) => __film.actor(0, { clip: 'gesture-positive', at: kk * 0.9 }), k));
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
