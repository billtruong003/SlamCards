// Footage for the three shorts: a portrait film camera low over two cards set one behind the other, the mouse
// gliding to the aim (the game's own aim ring), a posed local slam (slamDebug.filmSlam), then the outcome logged:
//   cap   own card face up resting on the friend's face-down card ("ăn hình")
//   near  own card face up, beside it (a near miss)          flip  own card still face down
//   off   own card left the table
// Run with long turns:  SLAM_TIMING='{"turn":900000}' node proto/server/server.js
//   TAKES=40 node qa/capture/shorts.mjs  → qa/out/film/short-takes/ (take.json marks: take {d, ang}, result {kind, ...})
// Variations (env): DEP=dep_le|dep_to_ong  Bill's slipper · SHIFT=1.6  the whole set moved toward the near table edge,
//   camera too, so a hard slam sends the card off the table in frame · DMIN/DMAX  slam distance · TYPE=flat|tilt
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, SLOW, state, toFirstTurn, record, screenOf, LOOKS } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'film', process.env.NAME || 'short-takes');
const TAKES = Number(process.env.TAKES || 40);
const PORTRAIT = { viewport: { width: 810, height: 1440 }, deviceScaleFactor: 16 / 9 }; // 1440 x 2560, mouse (no touch)
const DEPS = { dep_le: ['#fffaf0', '#2fa8ff', '#7a3d1a'], dep_to_ong: ['#ffc93c'] }; // the cut-outs' colours (video/edit/public/media)
if (process.env.DEP) LOOKS.bill = { ...LOOKS.bill, dep: process.env.DEP, depColors: DEPS[process.env.DEP] };
const SHIFT = Number(process.env.SHIFT || 0);
const DMIN = Number(process.env.DMIN || 1.08); const DMAX = Number(process.env.DMAX || 1.58);
const TYPE = process.env.TYPE || 'flat';
const browser = await launch();
try {
  const host = await player(browser, 'bill', PORTRAIT);
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const guest = await player(browser, 'teo', { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean` });
  await guest.waitForSelector('#ready, #go'); if (await guest.$('#go')) await guest.click('#go');
  await guest.waitForSelector('#ready'); await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await host.click('#start');
  await toFirstTurn(host, [host, guest], ['bua', 'keo']);
  const s = await state(host);
  if (s.turn !== s.me) throw new Error('the friend went first');
  await sleep(1200);
  await host.addStyleTag({ content: 'body *{visibility:hidden!important} canvas, #labels .pop{visibility:visible!important}' });
  // the camera: low behind Bill's card, looking up the table at Tèo's
  await host.evaluate((sh) => {
    const w = slamDebug.world;
    w.camera.clearViewOffset(); w.camera.fov = 38; w.camera.updateProjectionMatrix();
    w.lookTarget.set(0, 0, sh); w.cameraBase.set(0, 5.2, 4.6 + sh); w.needsRender = true;
  }, SHIFT);
  // the film look: no reach circles (the game's standoff rings), only the aim ring and arrows under the pointer
  await host.evaluate(() => {
    const v = slamDebug.visuals;
    v.showStandoff = function () { for (const m of [this.reach, this.reachEdge, this.forced, this.forcedEdge, ...this.threats.flat()]) m.visible = false; };
  });
  await host.evaluate(() => {
    const v = slamDebug.visuals; const show = v.showCursor.bind(v);
    v.showCursor = (...a) => { show(...a); for (const ar of v.arrows) ar.visible = false; };
  });
  const clearPointer = () => host.evaluate(() => slamDebug.world.renderer.domElement.dispatchEvent(new PointerEvent('pointercancel')));
  const rec = await record(host, OUT);
  const OWN = [0, 0.008, -0.6 + SHIFT]; const OTHER = [0, 0.008, 0.72 + SHIFT];
  for (let take = 0; take < TAKES; take++) {
    // sweet spot found earlier: 1.2–1.45 from the own card, straight out the far side; spread it to get near misses
    const d = DMIN + Math.random() * (DMAX - DMIN); const ang = (Math.random() - 0.5) * 0.7;
    const pt = [OWN[0] + Math.sin(ang) * d, OWN[2] - Math.cos(ang) * d];
    await host.evaluate(([o, t]) => {
      const cards = slamDebug.cards(); const me = slamDebug.me;
      const other = Object.keys(cards).find((k) => k !== me);
      cards[me] = { p: o, q: [0, 0, 1, 0] }; cards[other] = { p: t, q: [0, 0, 1, 0] };
      slamDebug.place(cards);
    }, [OWN, OTHER]);
    await sleep(500);
    // the mouse glides in from the side to the aim point: the game draws its aim ring under it
    const to = await screenOf(host, pt[0], pt[1]);
    const from = { x: to.x + 260, y: to.y + 160 };
    await host.mouse.move(from.x, from.y);
    await rec.mark('aim', { take });
    for (let i = 1; i <= 24; i++) { const k = 1 - (1 - i / 24) ** 3; await host.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k); await sleep(28); }
    await sleep(380);
    await rec.mark('take', { take, d: +d.toFixed(3), ang: +ang.toFixed(3) });
    await host.evaluate(([p, t]) => slamDebug.filmSlam(p[0], p[1], t), [pt, TYPE]);
    await clearPointer();
    await sleep(400);
    await host.waitForFunction(() => !slamDebug.simulating, null, { timeout: 15000 / SLOW });
    await sleep(500);
    const r = await host.evaluate(() => {
      const rot = (q, v) => { const [x, y, z, w] = q; const [vx, vy, vz] = v; const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx); return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)]; };
      const up = (c) => rot(c.q, [0, 1, 0])[1] > 0;
      const onTop = (a, b) => { if (a.p[1] <= b.p[1]) return false; const v = rot([-b.q[0], -b.q[1], -b.q[2], b.q[3]], [a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]]); return Math.abs(v[0]) < 0.5 && Math.abs(v[2]) < 0.739; };
      const cards = slamDebug.cards(); const me = slamDebug.me; const other = Object.keys(cards).find((k) => k !== me);
      const a = cards[me]; const b = cards[other];
      const dist = Math.hypot(a.p[0] - b.p[0], a.p[2] - b.p[2]);
      const kind = a.p[1] < -0.2 ? 'off' : !up(a) ? 'flip' : (onTop(a, b) && !up(b)) ? 'cap' : 'near';
      return { kind, dist: +dist.toFixed(2), me: a.p.map((v) => +v.toFixed(2)) };
    });
    await rec.mark('result', { take, ...r });
    console.log('take', take, r.kind, r.dist);
    await sleep(300);
  }
  await rec.stop();
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
