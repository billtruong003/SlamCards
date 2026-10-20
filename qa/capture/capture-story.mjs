// Frames for the gameplay video storyboard (docs: "Kế hoạch PR + kịch bản video gameplay"):
// plays real matches on the local server and screenshots the moments the scripts need.
//   MODE=phone   (default) 1080 x 1920 frames for the vertical video
//   MODE=desktop 1920 x 1080 frames for the horizontal video
//   MODE=quick   a 4-player quick match, 1920 x 1080
// Run with the game server on :8097:  node qa/capture/capture-story.mjs   → qa/out/story/*.png
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const MODE = process.env.MODE || 'phone';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'story');
fs.mkdirSync(OUT, { recursive: true });
const STAGE = process.env.STAGE === '1';
const P = MODE === 'phone' ? 'p' : 'd';
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const got = new Set();
async function shot(p, name) {
  if (STAGE && name !== 'end-capture') { got.add(name); return; }
  await p.screenshot({ path: path.join(OUT, `${P}-${name}.png`) });
  got.add(name);
  console.log('  shot', name);
}
async function player(name, look, opts, url = `${BASE}/?debug&noftue&clean`) {
  const ctx = await browser.newContext({ ...opts, locale: 'vi-VN' });
  await ctx.addInitScript(([n, l]) => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
    localStorage.setItem('slam-look', JSON.stringify(l));
  }, [name, look]);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  pageerror', name, e.message.slice(0, 160)));
  p.on('crash', () => console.log('  crash', name));
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}
const LOOKS = [
  { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' },
  { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' },
  { pet: 'chick', dep: 'dep_to_ong', depColors: ['#ffc93c'], cardColor: 'vang' },
  { pet: 'fox', dep: 'dep_lao', depColors: ['#2a1418', '#3ccf6e'], cardColor: 'la' },
];
const CAMERA = MODE === 'phone'
  ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1920, height: 1080 } };
const SIDE = { viewport: { width: 900, height: 640 } };

// one slam from whoever's turn it is, somewhere valid: next to the own card, or out towards the edge
const slamOnce = (p) => p.evaluate(() => {
  const s = slamDebug.state;
  if (s.phase !== 'turn' || s.turn !== slamDebug.me) return false;
  const c = slamDebug.cards()[slamDebug.me];
  const tries = [[c.p[0] + 1.1, c.p[2]], [c.p[0] - 1.1, c.p[2]], [c.p[0], c.p[2] + 1.1], [c.p[0] + 0.6, c.p[2] + 0.6], [0, 0.6]];
  if (Math.random() < 0.5) tries.reverse();
  return tries.some(([x, z]) => slamDebug.slamAt(x, z));
});
const rpsAndFirst = async (pages) => {
  for (const [i, p] of pages.entries()) {
    if (await p.$('[data-rps]')) await p.click(`[data-rps="${['bua', 'keo', 'bao', 'keo'][i]}"]`).catch(() => {});
    if (await p.$('#first')) await p.click('#first').catch(() => {});
  }
};
// After a slam: the "BỐP!" pop, then the result screen if the round ended.
async function watchSlam(cam, n) {
  const t0 = Date.now();
  let bop = false;
  while (Date.now() - t0 < 2500) {
    if (!bop && await cam.$('#labels .pop')) {
      await sleep(60);
      if (!got.has(`bop-${n % 3}`)) await shot(cam, `bop-${n % 3}`);
      bop = true;
    }
    await sleep(50);
  }
  for (let i = 0; i < 40; i++) {
    const s = await cam.evaluate(() => ({ phase: slamDebug.state.phase, reason: slamDebug.state.result?.reason, ev: slamDebug.state.event?.type }));
    if (s.phase === 'roundEnd' || s.phase === 'matchEnd') {
      await sleep(500);
      const why = s.reason ?? s.ev ?? 'end';
      if (!got.has(`end-${why}`)) await shot(cam, `end-${why}`);
      return s.phase;
    }
    if (s.phase === 'turn') return s.phase;
    await sleep(200);
  }
  return null;
}

try {
  if (MODE === 'quick') {
    const pages = [await player('Bill', LOOKS[0], CAMERA)];
    for (const [i, n] of ['Tèo', 'Tí', 'Bé Bự'].entries()) pages.push(await player(n, LOOKS[i + 1], { viewport: { width: 640, height: 480 } }));
    for (const p of pages) { await p.click('#size [data-size="any"]').catch(() => {}); await p.click('#play'); }
    await sleep(1500);
    await shot(pages[0], 'quick-searching');
    await pages[0].waitForFunction(() => slamDebug.state && slamDebug.state.phase !== 'lobby', null, { timeout: 30000 });
    for (let i = 0; i < 80 && !(await pages[0].evaluate(() => slamDebug.state.phase === 'turn')); i++) { await rpsAndFirst(pages); await sleep(300); }
    await sleep(1200);
    await shot(pages[0], 'quick-4players');
  } else {
    const host = await player('Bill', LOOKS[0], CAMERA);
    // wardrobe
    if (STAGE) { /* only the capture frame */ } else if (MODE === 'phone') await host.click('.gear-row'); else await host.click('.gear-card [data-ward="pet"]');
    if (!STAGE) {
      await host.waitForSelector('[data-pet]');
      await host.click('[data-pet="tiger"]'); await sleep(400);
      await shot(host, 'ward-pet');
      await host.click('[data-tab="dep"]'); await sleep(900);
      await shot(host, 'ward-dep');
      await host.click('[data-tab="card"]'); await sleep(300);
      await shot(host, 'ward-card');
      await host.click('#ward-done');
    }
    // lobby: invite, then the friend arrives and says something
    await host.click('#create'); await host.click('#create-go');
    await host.waitForSelector('#invite');
    await sleep(600);
    await shot(host, 'lobby-invite');
    const link = await host.inputValue('#link');
    const guest = await player('Tèo', LOOKS[1], SIDE, `${link}&debug&noftue&clean`);
    await guest.waitForSelector('#ready, #go'); if (await guest.$('#go')) await guest.click('#go');
    await guest.waitForSelector('#ready');
    // the side window is narrower than the dock breakpoint: open the chat bar first
    if (!(await guest.isVisible('#cp-input'))) await guest.click('#chat-bar');
    await guest.fill('#cp-input', 'vô lẹ đi đập cho'); await guest.press('#cp-input', 'Enter');
    if (await guest.isVisible('#chat-close')) await guest.click('#chat-close').catch(() => {});
    await guest.click('#ready');
    await host.waitForFunction(() => slamDebug.state.ready.pink === true);
    await sleep(700);
    await shot(host, 'lobby-joined');
    await host.click('#start');
    // the match: RPS and "go first" frames, then turns until the frames are in
    const pages = [host, guest];
    const t0 = Date.now();
    let slams = 0;
    while (Date.now() - t0 < 7 * 60 * 1000) {
      if (!got.has('rps') && await host.$('[data-rps]')) { await sleep(300); await shot(host, 'rps'); }
      if (!got.has('choose') && await host.$('#first')) { await sleep(300); await shot(host, 'choose'); }
      await rpsAndFirst(pages);
      const s = await host.evaluate(() => ({ phase: slamDebug.state.phase, turn: slamDebug.state.turn, me: slamDebug.me }));
      if (s.phase === 'matchEnd') {
        if (!got.has('match-end')) {
          await guest.evaluate(() => {}); await sleep(600); await shot(host, 'match-end');
        }
        await host.click('#rematch').catch(() => {}); await guest.click('#rematch').catch(() => {});
        await sleep(1500);
        continue;
      }
      if (s.phase === 'turn') {
        const mine = s.turn === s.me;
        if (mine && !got.has('aim')) {
          // the aim ring under the pointer, next to the own card
          const at = await host.evaluate(() => { const c = slamDebug.cards()[slamDebug.me]; const o = {}; slamDebug.world.toScreen(c.p[0] + 1.0, 0, c.p[2] + 0.3, o); return o; });
          await host.mouse.move(at.x, at.y); await sleep(400);
          await shot(host, 'aim');
        }
        if (!mine && !got.has('stickers')) {
          await guest.evaluate(() => {});
          await guest.click('#react-fab').catch(() => {});
          await guest.click('#react-panel [data-rtab="cat"]').catch(() => {});
          await guest.click('#react-grid [data-react="redcard"]').catch(() => {});
          await sleep(500);
          await host.click('#react-fab').catch(() => {});
          await host.click('#react-panel [data-rtab="phrase"]').catch(() => {});
          await host.click('#react-grid [data-react="p:scared"]').catch(() => {});
          await sleep(600);
          await shot(host, 'stickers');
        }
        const mover = mine ? host : guest;
        // STAGE=1: set up a capture (own card face up, resting on the other face-down one) and tap away from it
        if (STAGE && mine) { console.log('  staging');
          await host.evaluate(() => {
            const cards = slamDebug.cards();
            const other = Object.keys(cards).find((k) => k !== slamDebug.me && cards[k].p[1] > -10);
            const o = cards[other].p;
            cards[other] = { p: [o[0], 0.008, o[2]], q: [0, 0, 1, 0] };
            cards[slamDebug.me] = { p: [o[0] + 0.15, 0.03, o[2] + 0.1], q: [0, 0, 0, 1] };
            slamDebug.place(cards);
          });
          await sleep(200);
        }
        const ok = STAGE && mine
          ? await host.evaluate(() => { const c = slamDebug.cards()[slamDebug.me]; return [[1.2, 0], [-1.2, 0], [0, 1.4], [0, -1.4], [0.9, 0.9], [-0.9, -0.9]].some(([dx, dz]) => slamDebug.slamAt(c.p[0] + dx, c.p[2] + dz)); })
          : await slamOnce(mover);
        if (STAGE && mine) console.log('  slam ok', ok);
        if (ok) {
          slams += 1;
          await watchSlam(host, slams);
        }
      }
      if (STAGE && got.has('end-capture')) break;
      const need = ['bop-0', 'bop-1', 'end-capture', 'end-fall', 'aim', 'stickers', 'rps', 'choose', 'match-end'];
      if (need.every((n) => got.has(n))) break;
      await sleep(300);
    }
    console.log('slams', slams, 'got', [...got].join(' '));
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
