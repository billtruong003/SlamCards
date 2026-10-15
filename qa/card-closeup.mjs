// Close-up of the in-game cards (2 players, one face up, one face down) for design review.
// Run with the game server on :8097:  node qa/card-closeup.mjs  → qa/out/card-closeup*.png
import { chromium } from 'playwright';
const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const b = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const mk = async (name) => {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2, locale: 'vi-VN' });
  await ctx.addInitScript((n) => { localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}'); localStorage.setItem('slam-ftue', 'seen'); localStorage.setItem('slam-name', n); }, name);
  return ctx.newPage();
};
const host = await mk('Bill');
await host.goto(`${BASE}/?debug&noftue${process.env.TOP ? '&top' : ''}`);
await host.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
await host.click('#create'); await host.click('#create-go');
await host.waitForSelector('#link');
const link = await host.inputValue('#link');
const guest = await mk('Tèo');
await guest.goto(`${link}&debug&noftue`);
await guest.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
await guest.waitForSelector('#ready, #go'); if (await guest.$('#go')) await guest.click('#go');
await guest.waitForSelector('#ready'); await guest.click('#ready');
await host.waitForFunction(() => slamDebug.state.ready.pink === true);
await host.click('#start');
for (let i = 0; i < 60; i++) {
  for (const [p, k] of [[host, 'bua'], [guest, 'keo']]) {
    if (await p.$('[data-rps]')) await p.click(`[data-rps="${k}"]`).catch(() => {});
    if (await p.$('#first')) await p.click('#first').catch(() => {});
  }
  if (await host.evaluate(() => slamDebug.state.phase === 'turn')) break;
  await host.waitForTimeout(300);
}
// lay the two cards side by side near the camera: black face up, pink face down
await host.evaluate((alt) => {
  const c = slamDebug.cards();
  c.black = { ...c.black, p: [-1.2, c.black.p[1], 1.6], q: [0, 0, 0, 1] };
  c.pink = { ...c.pink, p: [1.2, c.pink.p[1], 1.6], q: alt ? [0, 0, 0, 1] : [0, 0, 1, 0] };
  if (alt) slamDebug.world.setLooks({ black: { pet: 'polar', dep: 'dep_lao', cardColor: 'vang' }, pink: { pet: 'caterpillar', dep: 'dep_le', cardColor: 'la' } });
  slamDebug.place(c);
  const top = new URLSearchParams(location.search).has('top'); const w = slamDebug.world; w.cameraBase.set(0, top ? 5.2 : 4.2, top ? 1.75 : 4.2); w.lookTarget.set(0, 0, 1.6); w.camera.position.copy(w.cameraBase); w.camera.lookAt(w.lookTarget); w.needsRender = true;
}, Boolean(process.env.ALT));
await host.waitForTimeout(1500);
await host.screenshot({ path: `qa/out/card-closeup${process.env.TOP ? '-top' : ''}${process.env.ALT ? '-alt' : ''}.png`, clip: { x: 200, y: 150, width: 800, height: 500 } });
await b.close();
