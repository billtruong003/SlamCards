// Hook takes: a low close camera on the table, no HUD, posed slams (slamDebug.filmSlam) until enough of them end with
// the slammer's card face up on the friend's face-down one ("ăn hình"). Run against a server with long turns:
//   SLAM_TIMING='{"turn":600000}' node proto/server/server.js
//   MODE=phone|desktop node qa/capture/hook.mjs   → qa/out/film/<mode>-hook/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, PHONE, DESKTOP, sleep, SLOW, SUFFIX, state, toFirstTurn, record } from './rec.mjs';

const MODE = process.env.MODE || 'phone';
const WANT = Number(process.env.WANT || 3);
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'film', `${MODE}-hook${SUFFIX}`);
const browser = await launch();
try {
  const host = await player(browser, 'bill', MODE === 'phone' ? PHONE : DESKTOP);
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.inputValue('#link');
  const guest = await player(browser, 'teo', { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean` });
  await guest.waitForSelector('#ready, #go'); if (await guest.$('#go')) await guest.click('#go');
  await guest.waitForSelector('#ready'); await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await host.click('#start');
  await toFirstTurn(host, [host, guest], ['bua', 'keo']);
  const s = await state(host);
  if (s.turn !== s.me) throw new Error('the friend went first');
  await sleep(1200);
  // the film look: no HUD (the slam's own "BỐP!" pop stays), the camera low and close on the two cards
  await host.addStyleTag({ content: 'body *{visibility:hidden!important} canvas, #labels .pop{visibility:visible!important}' });
  const cam = (MODE === 'phone') ? { look: [0.4, 0, 0.3], from: [0.75, 3.3, 3.1] } : { look: [0.45, 0, 0.3], from: [0.85, 2.4, 2.7] };
  await host.evaluate((c) => {
    const w = slamDebug.world;
    w.camera.clearViewOffset(); w.camera.updateProjectionMatrix();
    w.lookTarget.set(...c.look); w.cameraBase.set(...c.from); w.needsRender = true;
  }, cam);
  const rec = await record(host, OUT);
  let got = 0;
  for (let take = 0; take < Number(process.env.TAKES || 40) && got < WANT; take++) {
    const cfg = { op: process.env.OTHER || '[0.55,0.008,0.2]',
      own: [-0.45 + (Math.random() - 0.5) * 0.2, 0.2 + (Math.random() - 0.5) * 0.2],
      ang: Math.PI + (Math.random() - 0.5) * Number(process.env.SPREAD || 0.9), dist: Number(process.env.D0 || 0.55) + Math.random() * Number(process.env.DR || 0.3),
    };
    await host.evaluate((c) => {
      const cards = slamDebug.cards(); const me = slamDebug.me;
      const other = Object.keys(cards).find((k) => k !== me && cards[k].p[1] > -10);
      cards[other] = { p: JSON.parse(c.op), q: [0, 0, 1, 0] };
      cards[me] = { p: [c.own[0], 0.008, c.own[1]], q: [0, 0, 1, 0] };
      slamDebug.place(cards);
    }, cfg);
    await sleep(900);
    const pt = [cfg.own[0] + Math.cos(cfg.ang) * cfg.dist, cfg.own[1] + Math.sin(cfg.ang) * cfg.dist];
    await rec.mark('take', { take, pt });
    await host.evaluate((p) => slamDebug.filmSlam(p[0], p[1]), pt);
    await sleep(400);
    await host.waitForFunction(() => !slamDebug.simulating, null, { timeout: 15000 / SLOW });
    await sleep(700);
    const capture = await host.evaluate(() => {
      const rot = (q, v) => { const [x, y, z, w] = q; const [vx, vy, vz] = v; const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx); return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)]; };
      const up = (c) => rot(c.q, [0, 1, 0])[1] > 0;
      const onTop = (a, b) => { if (a.p[1] <= b.p[1]) return false; const r = rot([-b.q[0], -b.q[1], -b.q[2], b.q[3]], [a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]]); return Math.abs(r[0]) < 0.5 && Math.abs(r[2]) < 0.739; };
      const cards = slamDebug.cards(); const me = slamDebug.me;
      const other = Object.keys(cards).find((k) => k !== me && cards[k].p[1] > -10);
      const cap = up(cards[me]) && !up(cards[other]) && onTop(cards[me], cards[other]);
      return { cap, up: up(cards[me]), me: cards[me].p.map((v) => +v.toFixed(2)), other: cards[other].p.map((v) => +v.toFixed(2)) };
    });
    console.log('   ', JSON.stringify({ ...capture, pt: pt.map((v) => +v.toFixed(2)), own: cfg.own.map((v) => +v.toFixed(2)) }));
    const ok = capture.cap;
    if (ok) got++;
    await rec.mark('result', { take, capture: ok });
    console.log('take', take, ok ? 'ĂN HÌNH' : '-');
  }
  await rec.stop();
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
