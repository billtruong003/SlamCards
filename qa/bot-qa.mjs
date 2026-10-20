// B.07: whole quick matches against the new bots in a real browser, on a phone and a laptop, 2 and 3
// at the table, as a newcomer and as an old hand (they meet different bots). Measures how long a
// match takes and how each bot's slams came out (the server's own counts), checks that no slam was
// refused by the anti-cheat check (1.07), that the bots talked, and that no bubble showed a raw key.
// Its own server (port 8105, admin 8205). Screenshots in qa/out/bot-qa/.
//   node qa/bot-qa.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'qa', 'out', 'bot-qa');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8105;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ['server/server.js'], {
  cwd: path.join(ROOT, 'proto'),
  env: { ...process.env, PORT: String(PORT), SLAM_ADMIN_PORT: String(PORT + 100), SLAM_DATA: fs.mkdtempSync(path.join(ROOT, 'qa', 'out', 'tmp-')) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => { log += d; });
await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));
const metrics = () => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port: PORT + 100, path: '/metrics?days=1' }, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => resolve(Object.values(JSON.parse(body).play).at(-1) ?? {}));
  }).on('error', reject);
});

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  laptop: { viewport: { width: 1366, height: 768 } },
};

async function match(device, size, played) {
  const ctx = await browser.newContext({ ...DEVICES[device], locale: 'vi-VN' });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-lang', 'vi');
    localStorage.setItem('slam-name', 'Bill');
    localStorage.setItem('slam-tut-seen', '1234567');
    localStorage.setItem('slam-ftue-matches', String(n));
    localStorage.setItem('slam-ftue-slammed', '1');
    window.__rawKeys = [];
    new MutationObserver(() => {
      for (const el of document.querySelectorAll('.phrase')) if (/^(bot|phrase)\./.test(el.textContent)) window.__rawKeys.push(el.textContent);
    }).observe(document, { subtree: true, childList: true });
  }, played);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const talk = [];
  p.on('websocket', (ws) => ws.on('framereceived', ({ payload }) => {
    try { const m = JSON.parse(payload); if (m.t === 'react') talk.push(m.id); } catch { /* binary */ }
  }));
  await p.goto(`${BASE}/?debug`);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await p.waitForSelector(`#size [data-size="${size}"]`, { timeout: 10000 }).catch(async (err) => {
    await p.screenshot({ path: path.join(OUT, `${device}-${size}p-home.png`) });
    throw err;
  });
  await p.evaluate((n) => { document.querySelector(`#size [data-size="${n}"]`).click(); document.getElementById('play').click(); }, size);
  await p.waitForSelector('#queue-bots');
  await p.evaluate(() => document.getElementById('queue-bots').click());
  await p.waitForFunction(() => slamDebug.state?.phase && slamDebug.state.phase !== 'lobby', null, { timeout: 15000 });
  const bots = await p.evaluate(() => Object.entries(slamDebug.state.players).filter(([s]) => s !== slamDebug.me).map(([, pl]) => pl.name));
  const t0 = Date.now();
  let shot = false;
  while (Date.now() - t0 < 12 * 60000) {
    const s = await p.evaluate(() => { const st = slamDebug.state; return { phase: st.phase, turn: st.turn, me: slamDebug.me, sim: slamDebug.simulating, alive: st.alive }; });
    if (s.phase === 'matchEnd') break;
    if (s.phase === 'rps') await p.evaluate(() => document.querySelector('[data-rps="bua"]')?.click()).catch(() => {});
    if (s.phase === 'choose') await p.evaluate(() => document.getElementById('first')?.click()).catch(() => {});
    if (s.phase === 'turn' && s.turn === s.me && !s.sim) {
      await sleep(1500); // a person looks before slapping
      // the trick: behind my card, away from the nearest enemy; a wobble like a real hand
      await p.evaluate(() => {
        const cards = slamDebug.cards();
        const mine = cards[slamDebug.me].p;
        const enemies = slamDebug.state.alive.filter((x) => x !== slamDebug.me).map((x) => cards[x].p);
        const other = enemies.sort((a, b) => Math.hypot(a[0] - mine[0], a[2] - mine[2]) - Math.hypot(b[0] - mine[0], b[2] - mine[2]))[0] ?? [0, 0, 0];
        const dx = other[0] - mine[0]; const dz = other[2] - mine[2]; const len = Math.hypot(dx, dz) || 1;
        const reach = slamDebug.state.forced ? 1.0 : 1.2;
        for (let i = 0; i < 8; i++) {
          const wob = (Math.random() - 0.5) * 0.9;
          if (slamDebug.slamAt(mine[0] - (dx / len) * reach - (dz / len) * wob, mine[2] - (dz / len) * reach + (dx / len) * wob)) return;
        }
      });
      await sleep(2000);
      continue;
    }
    if (!shot && talk.length) {
      await sleep(400);
      await p.screenshot({ path: path.join(OUT, `${device}-${size}p-talk.png`) });
      shot = true;
    }
    await sleep(300);
  }
  const end = await p.evaluate(() => ({ phase: slamDebug.state.phase, scores: slamDebug.state.scores, rawKeys: window.__rawKeys }));
  await p.screenshot({ path: path.join(OUT, `${device}-${size}p-end.png`) });
  await ctx.close();
  return { device, size, played, bots, minutes: +((Date.now() - t0) / 60000).toFixed(1), ...end, talk, errors };
}

const results = [];
try {
  for (const [device, size, played] of [['phone', 2, 0], ['laptop', 2, 30], ['phone', 3, 30], ['laptop', 3, 0]]) {
    const r = await match(device, size, played);
    results.push(r);
    console.log(JSON.stringify(r));
  }
} finally {
  await browser.close();
}
const m = await metrics();
server.kill();
const refused = (log.match(/refused/g) ?? []).length;
console.log('server counts:', JSON.stringify({ bots: m.bots, slams: m.slams, matches: m.matches }));
const ok = results.length === 4 && results.every((r) => r.phase === 'matchEnd' && !r.rawKeys.length && !r.errors.length)
  && refused === 0 && results.some((r) => r.talk.length);
console.log(ok ? 'ok' : 'FAILED', `refused slams: ${refused}`);
process.exit(ok ? 0 : 1);
