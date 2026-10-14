// Performance pass on a real GPU (installed Edge/Chrome via Playwright) + close-up of the slipper look.
// Setup: see devices.mjs (plus: cd qa && npx playwright install chromium). Run with the game server on :8097:  node qa/perf.mjs
// Output: qa/out/perf/*.png and qa/out/perf/report.json
import { chromium, devices } from 'playwright';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../proto/package.json', import.meta.url));
const WebSocket = require('ws');
const BASE = 'http://localhost:8097';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'perf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (pred, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await pred()) return true; await sleep(100); } return false; };

const PROFILES = [
  { name: 'desktop-1280x720', context: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }, cpu: 1 },
  { name: 'desktop-1920x1080-dpr1.5', context: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 }, cpu: 1 },
  { name: 'phone-mid (Pixel 7, CPU 4x slower)', context: devices['Pixel 7'], cpu: 4 },
  { name: 'phone-low (Galaxy S9+, CPU 6x slower)', context: devices['Galaxy S9+'], cpu: 6 },
];

function hostBot() {
  const b = { state: null };
  b.ws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
  b.send = (m) => b.ws.send(JSON.stringify(m));
  b.ws.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.t === 'state') b.state = m;
    if (m.t === 'joined') b.code = m.code;
    if (m.t === 'playEnd') b.send({ t: 'playbackDone' });
  });
  b.ready = new Promise((r) => b.ws.on('open', r));
  return b;
}

// Records rAF frame gaps and how many frames the game actually drew, for `ms` milliseconds.
const SAMPLE = (ms) => new Promise((resolve) => {
  const gaps = [];
  const world = window.slamDebug.world;
  const render = world.render.bind(world);
  let drawn = 0;
  world.render = () => { const did = render(); if (did) drawn++; return did; };
  let last = performance.now();
  const start = last;
  const tick = (now) => {
    gaps.push(now - last);
    last = now;
    if (now - start < ms) requestAnimationFrame(tick);
    else {
      world.render = render;
      gaps.sort((a, b) => a - b);
      const q = (p) => +gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))].toFixed(1);
      const info = world.renderer.info;
      resolve({
        rafFps: Math.round(gaps.length / (ms / 1000)),
        drawnFps: Math.round(drawn / (ms / 1000)),
        frameMs: { p50: q(0.5), p95: q(0.95), max: +gaps[gaps.length - 1].toFixed(1) },
        janky: gaps.filter((g) => g > 33).length,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        programs: info.programs?.length,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
        pixelRatio: world.renderer.getPixelRatio(),
        canvas: `${world.renderer.domElement.width}x${world.renderer.domElement.height}`,
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      });
    }
  };
  requestAnimationFrame(tick);
});

async function run(browser, p) {
  const report = { profile: p.name, cpuThrottle: p.cpu, phases: {}, longTasks: 0, errors: [] };
  const context = await browser.newContext({ ...p.context });
  await context.addInitScript(() => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-memes', '0');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-ftue-matches', '9');
    window.__longTasks = 0;
    try { new PerformanceObserver((l) => { window.__longTasks += l.getEntries().length; }).observe({ entryTypes: ['longtask'] }); } catch { /* unsupported */ }
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });

  const host = hostBot();
  await host.ready;
  host.send({ t: 'create', name: 'Bill' });
  await until(() => host.code);

  const t0 = Date.now();
  await page.goto(`${BASE}/?room=${host.code}&debug&noftue`);
  await until(() => page.evaluate(() => window.slamBooted === true), 30000);
  report.bootMs = Date.now() - t0;
  report.gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  report.transferKB = await page.evaluate(() => Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024));

  await page.locator('#name').fill('Perf');
  await page.locator('#go').click();
  await until(() => page.locator('#start').isVisible());
  report.phases.lobby = await page.evaluate(SAMPLE, 3000);

  host.send({ t: 'start' });
  await until(() => host.state?.phase === 'rps');
  await page.locator('[data-rps="bua"]').click();
  host.send({ t: 'rps', choice: 'keo' });
  await until(() => page.locator('#first').isVisible());
  await page.locator('#first').click();
  await until(() => page.evaluate(() => slamDebug.state?.phase === 'turn' && slamDebug.state.turn === 'pink'));
  await sleep(1200);

  report.phases.turnIdle = await page.evaluate(SAMPLE, 3000);

  // Aiming: move the pointer every frame like a player hunting for a spot.
  const box = await page.locator('canvas').boundingBox();
  const aim = page.evaluate(SAMPLE, 3000);
  for (let i = 0; i < 90; i++) await page.mouse.move(box.x + box.width * (0.55 + 0.3 * Math.sin(i / 9)), box.y + box.height * (0.45 + 0.2 * Math.cos(i / 7)));
  report.phases.aiming = await aim;

  // My slam: local physics + streaming to the server.
  const me = await page.evaluate(() => slamDebug.state.cards.pink.p);
  const slam = page.evaluate(SAMPLE, 4000);
  await page.evaluate(([x, z]) => slamDebug.slamAt(x, z), [me[0] - 1.3, me[2]]);
  report.phases.mySlam = await slam;

  // Watching the other player's slam (replay of streamed frames).
  await until(() => host.state?.phase === 'turn' && host.state.turn === 'black', 10000);
  const s = host.state;
  const watch = page.evaluate(SAMPLE, 3000);
  host.send({ t: 'slamStart', impact: { x: s.cards.black.p[0] + 1.3, z: s.cards.black.p[2] }, type: 'flat' });
  const frames = [];
  for (let i = 0; i < 90; i++) {
    const k = i / 90;
    frames.push([s.cards.black.p[0] + k * 2, 0.008 + Math.sin(k * Math.PI) * 1.2, s.cards.black.p[2], Math.sin(k * 3), 0, 0, Math.cos(k * 3), ...s.cards.pink.p, ...s.cards.pink.q]);
  }
  for (let i = 0; i < frames.length; i += 6) { host.send({ t: 'slamChunk', frames: frames.slice(i, i + 6) }); await sleep(100); }
  host.send({ t: 'slamEnd', final: { black: { p: [s.cards.black.p[0] + 2, 0.008, s.cards.black.p[2]], q: [0, 0, 0, 1] }, pink: s.cards.pink } });
  report.phases.watching = await watch;

  report.longTasks = await page.evaluate(() => window.__longTasks);
  report.heapMB = await page.evaluate(() => (performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null));

  if (p.cpu === 1 && p.context.deviceScaleFactor === 1) {
    // Close-up of the three slipper models on the table to judge the shading.
    await page.evaluate(() => {
      slamDebug.previewDeps();
      const w = slamDebug.world;
      w.cameraBase.set(0, 2.2, 3.4);
      w.lookTarget.set(0, 0, 1.2);
      w.needsRender = true;
    });
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'slippers-closeup.png') });
  }

  await context.close();
  host.ws.close();
  return report;
}

fs.mkdirSync(OUT, { recursive: true });
// Real GPU: the full Chromium build in new headless mode (the default headless shell renders with SwiftShader on the CPU).
// The report prints the GPU string so a CPU fallback is obvious.
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info'],
});
const results = [];
for (const p of PROFILES) {
  process.stdout.write(`${p.name}… `);
  results.push(await run(browser, p));
  console.log('done');
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`\n== ${r.profile}  gpu=${r.gpu}  boot=${r.bootMs}ms  transfer=${r.transferKB}KB  longTasks=${r.longTasks}  heap=${r.heapMB}MB  errors=${r.errors.length}`);
  for (const [k, v] of Object.entries(r.phases)) console.log(`  ${k.padEnd(9)} raf=${v.rafFps} drawn=${v.drawnFps} p50=${v.frameMs.p50} p95=${v.frameMs.p95} max=${v.frameMs.max} jank=${v.janky} calls=${v.drawCalls} tris=${v.triangles} programs=${v.programs} canvas=${v.canvas}@${v.pixelRatio}`);
}
