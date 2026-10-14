// Milestone 1: stencil-window cards on the real table (`?stencil`). Puts the 4 cards in the hard
// cases (side by side, one lying on another, face down, mid-air and tilted, at the rim) and
// screenshots each, with draw calls and frame times.
// Run with the game server on :8097:  node qa/stencil-proto.mjs [chromium|webkit]  → qa/out/stencil/*.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const engineName = process.argv[2] || 'chromium';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'stencil', engineName + (process.env.STENCIL_OFF ? '-off' : ''));
fs.mkdirSync(OUT, { recursive: true });

const engine = engineName === 'webkit' ? webkit : chromium;
const browser = await engine.launch(engineName === 'webkit' ? {} : { channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(engineName === 'webkit' ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => {
  if (!window.AudioContext && !window.webkitAudioContext) window.AudioContext = undefined;
  localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
  localStorage.setItem('slam-ftue', 'seen');
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
await page.goto(`${BASE}/?${process.env.STENCIL_OFF ? '' : 'stencil&'}debug&noftue`);
await page.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('intro')?.remove();
  document.querySelectorAll('.menu-bg').forEach((e) => { e.style.display = 'none'; });
  slamDebug.world.setup(['black', 'pink', 'blue', 'green']); // the 4-player table
});

const Q = {
  up: [0, 0, 0, 1],
  upTurned: [0, Math.sin(0.35), 0, Math.cos(0.35)],          // face up, turned 40° on the table
  down: [0, 0, 1, 0],                                        // face down
  tilt: [Math.sin(-0.5), 0, 0, Math.cos(-0.5)],              // face up, tipped 57° toward the camera
};
const SCENES = {
  '1-side-by-side': { black: [[-3, 0.008, 0.5], Q.up], pink: [[-1, 0.008, 0.5], Q.upTurned], blue: [[1.2, 0.008, 0.5], Q.up], green: [[3.2, 0.008, 0.5], Q.down] },
  '2-stacked': { black: [[-0.3, 0.008, 0.6], Q.up], pink: [[0.25, 0.024, 0.3], Q.upTurned], blue: [[2.5, 0.008, 1], Q.down], green: [[-2.8, 0.008, 1], Q.up] },
  '3-up-on-down': { black: [[0, 0.008, 0.6], Q.down], pink: [[0.3, 0.024, 0.4], Q.up], blue: [[-2.6, 0.008, 0.8], Q.up], green: [[2.6, 0.008, 0.8], Q.up] },
  '4-airborne': { black: [[-1.5, 1.6, 0.8], Q.tilt], pink: [[1.2, 0.9, 0.5], [0.3, 0.2, 0.1, 0.93]], blue: [[0, 0.008, 1.2], Q.up], green: [[3, 0.008, 0.8], Q.down] },
  '5-rim': { black: [[5.6, 0.008, 0], Q.up], pink: [[-5.5, 0.008, 2.8], Q.upTurned], blue: [[0, 0.008, -3.1], Q.up], green: [[0, 0.008, 1], Q.up] },
};

const results = [];
for (const [name, layout] of Object.entries(SCENES)) {
  const stats = await page.evaluate(async (layout) => {
    const w = slamDebug.world;
    const cards = {};
    for (const seat of w.seats) {
      const [p, q] = layout[seat] ?? [[0, -50, 0], [0, 0, 0, 1]];
      const n = Math.hypot(...q);
      cards[seat] = { p, q: q.map((v) => v / n) };
    }
    w.setCards(cards);
    w.needsRender = true;
    await new Promise((r) => setTimeout(r, 900));
    // frame times over 2 s while pets animate
    const times = [];
    let last = performance.now();
    await new Promise((done) => {
      const end = last + 2000;
      const tick = (now) => { times.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else done(); };
      requestAnimationFrame(tick);
    });
    const info = w.renderer.info.render;
    times.sort((a, b) => a - b);
    return { seats: w.seats, calls: info.calls, triangles: info.triangles, fps: Math.round(1000 / (times.reduce((a, b) => a + b, 0) / times.length)), p95: Math.round(times[Math.floor(times.length * 0.95)]) };
  }, layout);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  results.push({ name, ...stats });
  console.log(name, JSON.stringify(stats));
}
// close-up of the stacked pair
await page.evaluate(() => {
  const w = slamDebug.world;
  w.setCards({ black: { p: [-0.3, 0.008, 0.6], q: [0, 0, 0, 1] }, pink: { p: [0.25, 0.024, 0.3], q: [0, Math.sin(0.35), 0, Math.cos(0.35)] }, blue: { p: [1.6, 0.008, 0.9], q: [0, Math.sin(-0.4), 0, Math.cos(-0.4)] }, green: { p: [-1.9, 0.008, 0.9], q: [0, 0, 1, 0] } });
  w.cameraBase.set(0.6, 3.2, 4.2);
  w.lookTarget.set(0, 0, 0.5);
  w.needsRender = true;
});
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, '6-closeup.png') });
console.log('errors', JSON.stringify(errors));
await browser.close();
