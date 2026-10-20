// Staged frames for the video mockups: the "ăn hình" moment (own card face up, resting on the friend's face-down one)
// and the moment before it, posed with slamDebug.place on a real match (nothing is slammed, nothing is sent).
//   MODE=phone (1080 x 1920) | MODE=desktop (1920 x 1080), game server on :8097  → qa/out/story/{p|d}-stage-*.png
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const MODE = process.env.MODE || 'phone';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'story');
fs.mkdirSync(OUT, { recursive: true });
const P = MODE === 'phone' ? 'p' : 'd';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function player(name, look, opts, url = `${BASE}/?debug&noftue&clean`) {
  const ctx = await browser.newContext({ ...opts, locale: 'vi-VN' });
  await ctx.addInitScript(([n, l]) => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
    localStorage.setItem('slam-look', JSON.stringify(l));
  }, [name, look]);
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}
const CAMERA = MODE === 'phone'
  ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1920, height: 1080 } };

try {
  const host = await player('Bill', { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' }, CAMERA);
  await host.click('#create'); await host.click('#create-go');
  await host.waitForSelector('#invite');
  const link = await host.inputValue('#link');
  const guest = await player('Tèo', { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' },
    { viewport: { width: 640, height: 480 } }, `${link}&debug&noftue&clean`);
  await guest.waitForSelector('#ready, #go'); if (await guest.$('#go')) await guest.click('#go');
  await guest.waitForSelector('#ready'); await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await host.click('#start');
  for (let i = 0; i < 120; i++) {
    if (await host.evaluate(() => slamDebug.state.phase === 'turn')) break;
    for (const [j, p] of [host, guest].entries()) {
      if (await p.$('[data-rps]')) await p.click(`[data-rps="${['bua', 'keo'][j]}"]`).catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
    }
    await sleep(300);
  }
  await sleep(1500);
  // the two cards close together, both face down: the moment before
  const pose = (up) => host.evaluate((up) => {
    const cards = slamDebug.cards();
    const me = slamDebug.me;
    const other = Object.keys(cards).find((k) => k !== me && cards[k].p[1] > -10);
    cards[other] = { p: [0.55, 0.008, 0.2], q: [0, 0, 1, 0] };
    cards[me] = up ? { p: [0.2, 0.025, 0.05], q: [0, Math.sin(0.12), 0, Math.cos(0.12)] } : { p: [-0.9, 0.008, 0.1], q: [0, 0, 1, 0] };
    slamDebug.place(cards);
  }, up);
  await pose(false); await sleep(250);
  await host.screenshot({ path: path.join(OUT, `${P}-stage-pre.png`) });
  await pose(true); await sleep(250);
  await host.screenshot({ path: path.join(OUT, `${P}-stage-capture.png`) });
  // film close-ups: no HUD, the camera low and close on the two cards
  await host.addStyleTag({ content: 'body *:not(canvas){visibility:hidden!important} canvas{visibility:visible!important}' });
  const close = (dist, height) => host.evaluate(([d, h]) => {
    const w = slamDebug.world;
    w.camera.clearViewOffset(); w.camera.updateProjectionMatrix();
    w.lookTarget.set(0.4, 0, 0.15);
    w.cameraBase.set(0.4 + d * 0.15, h, 0.15 + d);
    w.needsRender = true;
  }, [dist, height]);
  for (const [name, up, d, h] of [['close-pre', false, 2.6, 2.4], ['close-capture', true, 2.6, 2.4], ['macro-capture', true, 1.5, 1.2]]) {
    await pose(up); await close(d, h); await sleep(300);
    await host.screenshot({ path: path.join(OUT, `${P}-stage-${name}.png`) });
  }
  // a real slam seen from the close camera: a burst of frames as the slipper lands (host's turn only)
  if (await host.evaluate(() => slamDebug.state.turn === slamDebug.me)) {
    await pose(false); await close(3.4, 3.0); await sleep(300);
    const ok = await host.evaluate(() => slamDebug.slamAt(-0.2, 0.15));
    for (let i = 0; ok && i < 8; i++) {
      await host.screenshot({ path: path.join(OUT, `${P}-stage-slam-${i}.png`) });
      await sleep(40);
    }
    console.log('slam burst', ok);
  }
  console.log('ok', P);
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
