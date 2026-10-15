// Device pass: each emulated phone/tablet opens an invite link as a brand-new player and plays a first turn.
// Setup once (inside qa/, nothing ships with the game):  cd qa && npm i --no-save playwright@1.48.2 && npx playwright install webkit chromium
// Run (game server on :8097, client built):  node qa/devices.mjs [profile-name]
// Another language: SLAM_LANG=en node qa/devices.mjs  (adds ?lang=, writes to qa/out/<lang>/)
// Output: qa/out/<device>/*.png and qa/out/report.json
import { webkit, chromium, devices } from 'playwright';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(new URL('../proto/package.json', import.meta.url));
const WebSocket = require('ws');
// SLAM_BASE=https://billthedevstudio.io.vn/slam-cards to test the live server.
const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const LANG = process.env.SLAM_LANG || '';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'out', LANG);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROFILES = [
  { name: 'iPhone-13-Safari', engine: webkit, device: devices['iPhone 13'] },
  { name: 'iPhone-SE-Safari', engine: webkit, device: devices['iPhone SE'] },
  { name: 'iPad-Mini-Safari', engine: webkit, device: devices['iPad Mini'] },
  { name: 'Pixel-7-Chrome', engine: chromium, device: devices['Pixel 7'] },
  { name: 'Galaxy-S9-Chrome', engine: chromium, device: devices['Galaxy S9+'] },
];

function hostBot() {
  const b = { state: null };
  b.ws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
  b.send = (m) => b.ws.send(JSON.stringify(m));
  b.ws.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.t === 'state') b.state = m;
    if (m.t === 'joined') { b.code = m.code; b.seat = m.color; }
    if (m.t === 'playEnd') b.send({ t: 'playbackDone' });
  });
  b.ready = new Promise((r) => b.ws.on('open', r));
  return b;
}
const until = async (pred, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await pred()) return true; await sleep(150); } return false; };

// Overlaps between fixed UI pieces and whether anything sticks out of the screen.
const LAYOUT = () => {
  const ids = ['corner', 'toggle', 'banner', 'hint', 'toast', 'ftue-tip', 'ftue-point', 'players', 'wind'];
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const shown = ids.map((id) => [id, document.getElementById(id)]).filter(([, el]) => el && !el.hidden && el.offsetParent !== null).map(([id, el]) => [id, box(el)]);
  const overlaps = [];
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
    const [a, A] = shown[i]; const [b, B] = shown[j];
    if (A.l < B.r && B.l < A.r && A.t < B.b && B.t < A.b && A.w && B.w) overlaps.push(`${a}×${b}`);
  }
  const offscreen = shown.filter(([, r]) => r.l < -1 || r.r > innerWidth + 1 || r.t < -1 || r.b > innerHeight + 1).map(([id]) => id);
  const small = [...document.querySelectorAll('button')].filter((el) => el.offsetParent !== null).map((el) => [el.textContent.trim().slice(0, 18) || el.id, box(el)]).filter(([, r]) => r.h > 0 && (r.h < 44 || r.w < 44)).map(([t, r]) => `${t} ${Math.round(r.w)}×${Math.round(r.h)}`);
  return { vw: innerWidth, vh: innerHeight, overlaps, offscreen, smallTargets: small, hScroll: document.documentElement.scrollWidth > innerWidth };
};

async function runProfile(p) {
  const dir = path.join(OUT, p.name);
  fs.mkdirSync(dir, { recursive: true });
  const report = { device: p.name, engine: p.engine.name(), steps: [], errors: [], findings: [] };
  // Text that no longer fits its box (long translations): clipped horizontally, or spilling out of a button.
  const CLIPPED = () => [...document.querySelectorAll('button, h1, h2, .stamp, .sub, .slot, #banner, #hint, #toast, .chip, label, small, .ftue-tip, .rule')]
    .filter((el) => el.offsetParent !== null && el.textContent.trim())
    .filter((el) => el.scrollWidth > el.clientWidth + 2 || (el.tagName === 'BUTTON' && el.scrollHeight > el.clientHeight + 4))
    .map((el) => `${el.id || el.className || el.tagName}: "${el.textContent.trim().slice(0, 40)}"`);
  const shot = async (page, name) => {
    await page.screenshot({ path: path.join(dir, `${name}.png`) });
    for (const c of await page.evaluate(CLIPPED).catch(() => [])) {
      const f = `Text does not fit (${name}): ${c}`;
      if (!report.findings.includes(f)) report.findings.push(f);
    }
  };
  const step = (name, ok, data = {}) => report.steps.push({ name, ok, ...data });

  const host = hostBot();
  await host.ready;
  host.send({ t: 'create', name: 'Bill' });
  await until(() => host.code);

  const browser = await p.engine.launch();
  const context = await browser.newContext({ ...p.device });
  await context.addInitScript(() => {
    // Playwright's Windows WebKit build ships without Web Audio (real iOS Safari has it).
    // A silent stand-in lets the rest of the game be tested; the report says when it was used.
    if (!window.AudioContext && !window.webkitAudioContext) {
      const stub = () => new Proxy(function () {}, {
        get: (_, key) => (key === 'state' ? 'running' : key === 'sampleRate' ? 44100 : key === 'currentTime' ? 0
          : key === 'then' ? undefined : key === 'getChannelData' ? () => new Float32Array(8000) : stub()),
        apply: () => stub(),
        set: () => true,
      });
      window.AudioContext = function () { return stub(); };
      window.__audioStubbed = true;
    }
    try {
      localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
      localStorage.setItem('slam-memes', '0');
    } catch { /* storage blocked */ }
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket connection/.test(m.text())) report.errors.push(`console: ${m.text().slice(0, 200)}`); });

  try {
    const t0 = Date.now();
    await page.goto(`${BASE}/?room=${host.code}&debug${LANG ? `&lang=${LANG}` : ''}`);
    const booted = await until(() => page.evaluate(() => window.slamBooted === true), 25000);
    const webgl = await page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); return g ? g.getParameter(g.VERSION) : null; });
    const audio = await page.evaluate(() => (window.__audioStubbed ? 'missing (stubbed for test)' : 'available'));
    step('boot', booted, { ms: Date.now() - t0, webgl, audio, ua: (await page.evaluate(() => navigator.userAgent)).slice(0, 90) });
    if (!booted) { await shot(page, '00-boot-failed'); report.findings.push('Game did not boot (slamBooted never true)'); return report; }

    const namePrompt = await until(() => page.locator('#name').isVisible(), 15000);
    await shot(page, '01-name');
    const nameFont = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('name')).fontSize));
    step('invite link shows name prompt', namePrompt, { nameInputFontPx: nameFont, layout: await page.evaluate(LAYOUT) });
    if (nameFont < 16) report.findings.push(`Name input font ${nameFont}px < 16px: iOS Safari zooms the page when it is focused`);

    await page.locator('#name').tap();
    await page.locator('#name').fill('Tí');
    await page.locator('#go').tap();
    const inLobby = await until(() => page.locator('#ready').isVisible());
    await page.evaluate(() => { const bg = document.querySelector('.menu-bg'); if (bg) bg.scrollTop = 0; });
    await sleep(300);
    await shot(page, '02-lobby-top');
    const lobby = await page.evaluate(() => {
      const card = document.querySelector('.menu-card:not(.ftue-invite)').getBoundingClientRect();
      const inv = document.querySelector('.ftue-invite')?.getBoundingClientRect();
      const corner = document.getElementById('corner').getBoundingClientRect();
      const hit = (a, b) => b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const no = document.getElementById('ftue-no')?.getBoundingClientRect();
      const yes = document.getElementById('ftue-yes')?.getBoundingClientRect();
      return { cardTopAtScroll0: Math.round(card.top), invite: Boolean(inv), inviteTop: inv && Math.round(inv.top), vh: innerHeight, cornerHitsNo: hit(corner, no), cornerHitsYes: hit(corner, yes) };
    });
    step('lobby', inLobby, lobby);
    if (lobby.cardTopAtScroll0 < 0) report.findings.push(`Lobby title off-screen and unreachable (card top ${lobby.cardTopAtScroll0}px) — UX-01`);

    if (lobby.invite) {
      await page.locator('#ftue-yes').scrollIntoViewIfNeeded();
      await shot(page, '03-lobby-invite');
      await page.locator('#ftue-yes').tap();
      await sleep(300);
      await shot(page, '04-tutorial-1');
      const fit = await page.evaluate(() => { const r = document.querySelector('.ftue-card').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, nextVisible: document.querySelector('.ftue-next').getBoundingClientRect().bottom <= innerHeight }; });
      step('tutorial modal', true, fit);
      if (!fit.nextVisible) report.findings.push('Tutorial "Next" button below the fold');
      for (let i = 0; i < 4; i++) { await page.locator('.ftue-next').tap(); await sleep(150); }
      await shot(page, '05-tutorial-5');
      await page.locator('.ftue-next').tap();
    }

    // guests ready up, then the host (the bot) starts
    await page.locator('#ready').tap();
    await until(() => host.state?.ready?.pink === true);
    host.send({ t: 'start' });
    await until(() => host.state?.phase === 'rps');
    await page.locator('[data-rps="bua"]').tap();
    host.send({ t: 'rps', choice: 'keo' });
    const choose = await until(() => page.locator('#first').isVisible());
    await shot(page, '06-choose');
    await page.locator('#first').tap();
    const myTurn = await until(() => page.evaluate(() => slamDebug.state?.phase === 'turn' && slamDebug.state.turn === 'pink'), 10000);
    await sleep(600);
    await shot(page, '07-my-turn');
    const turnInfo = await page.evaluate(() => ({ pointer: !document.getElementById('ftue-point').hidden, pointerAt: document.getElementById('ftue-point').style.transform, toggleText: document.getElementById('type-flat').textContent, hint: document.getElementById('hint').textContent }));
    step('first turn', choose && myTurn, { ...turnInfo, layout: await page.evaluate(LAYOUT) });
    if (!turnInfo.pointer) report.findings.push('First-turn pointer not shown');

    // Tap the pulse: touch aiming slams where the finger lifts.
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(turnInfo.pointerAt || '');
    if (m) {
      await page.touchscreen.tap(Number(m[1]), Number(m[2]));
      const settled = await until(() => page.evaluate(() => slamDebug.state?.phase === 'turn' && slamDebug.state.turn !== 'pink'), 15000);
      await sleep(800);
      await shot(page, '08-after-slam');
      const sync = await page.evaluate(() => JSON.stringify(slamDebug.cards()));
      const local = JSON.parse(sync);
      const server = host.state.cards;
      const drift = Math.max(...Object.keys(server).map((s) => Math.hypot(local[s].p[0] - server[s].p[0], local[s].p[2] - server[s].p[2])));
      const result = await page.evaluate(() => ({ phase: slamDebug.state.phase, event: slamDebug.state.event, tip: document.getElementById('ftue-tip').hidden ? null : document.getElementById('ftue-tip').innerText.replace(/\n/g, ' ') }));
      step('tap slam at pointer', settled, { drift: Number(drift.toFixed(4)), ...result, myCardY: server.pink.p[1] });
      if (drift > 0.01) report.findings.push(`Table out of sync with server after slam (max drift ${drift.toFixed(3)})`);
      if (server.pink.p[1] < -0.3 || result.phase === 'roundEnd') report.findings.push(`First slam at pointer ended badly: ${JSON.stringify(result.event)}`);
    } else {
      report.findings.push('Could not read pointer position to tap');
    }

    // Rotate the device mid-match.
    const v = p.device.viewport;
    await page.setViewportSize({ width: v.height, height: v.width });
    await sleep(700);
    await shot(page, '09-landscape');
    step('landscape', true, { layout: await page.evaluate(LAYOUT) });
    await page.setViewportSize(v);
    await sleep(400);
    step('back to portrait', true, { layout: await page.evaluate(LAYOUT) });
  } catch (err) {
    report.errors.push(`script: ${err.message.split('\n')[0]}`);
    await shot(page, 'zz-error').catch(() => {});
  } finally {
    await browser.close();
    host.ws.close();
  }
  return report;
}

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
const results = [];
for (const p of PROFILES.filter((x) => !only || x.name === only)) {
  process.stdout.write(`${p.name}… `);
  const r = await runProfile(p);
  results.push(r);
  console.log(`${r.findings.length} findings, ${r.errors.length} errors`);
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
console.log('report:', path.join(OUT, 'report.json'));
