// Records real slams (the client's own physics, slamDebug.localSlam) and runs the server's slam check
// (proto/server/slam-check.js) over every one: no legit slam may be refused, and the peaks show how
// much room the limits leave. Writes qa/out/slams.json (the recordings) and prints a summary.
// Aims: close and far, at the own card's side and behind it toward an opponent, flat and tilted.
//   node qa/slam-record.mjs            (EPISODES=40 per table size by default)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSlamCheck, LIMITS } from '../proto/server/slam-check.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8099);
const BASE = `http://localhost:${PORT}`;
const EPISODES = Number(process.env.EPISODES || 40);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ['server/server.js'], {
  cwd: path.join(ROOT, 'proto'),
  env: { ...process.env, PORT: String(PORT), SLAM_ADMIN_PORT: String(PORT + 100), SLAM_TIMING: JSON.stringify({ turn: 900000, rps: 3000, choose: 3000 }) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });

async function player(url) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('slam-volume', JSON.stringify({ music: 0, meme: 0, sfx: 0 }));
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-ftue-matches', '3');
    localStorage.setItem('slam-name', `P${Math.floor(Math.random() * 99)}`);
  });
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}

// a room with n seats so the client's world has n cards; the match itself is never played
async function room(n) {
  const host = await player(`${BASE}/?debug&noftue`);
  await host.click('#create');
  await host.click('#create-go');
  await host.waitForSelector('#link');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const guests = [];
  for (let i = 1; i < n; i++) {
    const g = await player(`${link}&debug&noftue`);
    await g.waitForSelector('#ready, #go');
    if (await g.$('#go')) await g.click('#go');
    await g.waitForSelector('#ready');
    await g.click('#ready');
    guests.push(g);
  }
  await host.waitForFunction((k) => Object.values(slamDebug.state.ready ?? {}).filter(Boolean).length === k, n - 1);
  await host.evaluate(() => document.getElementById('start').click());
  for (let i = 0; i < 120; i++) {
    if (await host.evaluate(() => slamDebug.state.phase === 'turn')) break;
    for (const p of [host, ...guests]) {
      if (await p.$('[data-rps]')) await p.click('[data-rps="bua"]').catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
    }
    await sleep(300);
  }
  return [host, ...guests];
}

const SPOTS = { 2: [[-4.5, 0], [4.5, 0]], 3: [[-3.6, -2.6], [3.6, -2.6], [0, 3.6]], 4: [[-5.8, 0], [0, -3.6], [5.8, 0], [0, 3.6]] };
const slams = [];
for (const n of [2, 3, 4]) {
  const pages = await room(n);
  const recorded = await pages[0].evaluate(async ({ spots, episodes }) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    slamDebug.timeScale = 6;
    // face down with a little yaw, as rules.js initialCards deals: yaw quaternion times 180 degrees about z
    const quat = (yaw) => [Math.sin(yaw / 2), 0, Math.cos(yaw / 2), 0];
    const seats = Object.keys(slamDebug.cards());
    const out = [];
    for (let e = 0; e < episodes; e++) {
      slamDebug.place(Object.fromEntries(seats.map((s, i) => [s, {
        p: [spots[i][0] + (Math.random() - 0.5) * 0.6, 0.008, spots[i][1] + (Math.random() - 0.5) * 0.6],
        q: quat((Math.random() - 0.5) * 0.6),
      }])));
      await sleep(60);
      for (let k = 0; k < 8; k++) {
        const start = slamDebug.cards();
        if (seats.some((s) => start[s].p[1] < -0.3)) break;
        const me = seats[k % seats.length];
        const c = start[me].p;
        let ang;
        let r;
        if (Math.random() < 0.5) {
          let best = null;
          for (const s of seats) if (s !== me) { const o = start[s].p; const d = Math.hypot(o[0] - c[0], o[2] - c[2]); if (!best || d < best.d) best = { d, o }; }
          ang = Math.atan2(best.o[2] - c[2], best.o[0] - c[0]) + Math.PI + (Math.random() - 0.5) * 0.6;
          r = 0.75 + Math.random() * 1.05;
        } else {
          ang = Math.random() * Math.PI * 2;
          r = 0.75 + Math.random() * 2.25;
        }
        const impact = { x: c[0] + Math.cos(ang) * r, z: c[2] + Math.sin(ang) * r };
        const type = Math.random() < 0.6 ? 'flat' : 'tilt';
        slamDebug.localSlam(impact.x, impact.z, type);
        await sleep(50);
        for (let t = 0; t < 400 && slamDebug.simulating; t++) await sleep(25);
        out.push({ seats, start, impact, type, frames: slamDebug.lastLocalFrames, final: slamDebug.cards() });
      }
    }
    return out;
  }, { spots: SPOTS[n], episodes: EPISODES });
  slams.push(...recorded);
  console.log(`${n} players: ${recorded.length} slams recorded`);
  for (const p of pages) await p.context().close();
}
await browser.close();
server.kill();

fs.mkdirSync(path.join(ROOT, 'qa/out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'qa/out/slams.json'), JSON.stringify(slams));

const refused = [];
const peak = { frames: 0, step: 0, turn: 0, height: 0 };
for (const s of slams) {
  const check = createSlamCheck(s);
  let why = null;
  for (const f of s.frames) if ((why = check.frame(f))) break;
  why ??= check.end(s.final);
  if (why) refused.push({ why, type: s.type, impact: s.impact });
  const st = check.stats();
  for (const k of Object.keys(peak)) peak[k] = Math.max(peak[k], st[k]);
}
console.log(`checked ${slams.length} slams: ${refused.length} refused`);
for (const r of refused.slice(0, 20)) console.log('  refused:', r.why, r.type, JSON.stringify(r.impact));
console.log('peaks', JSON.stringify(peak), 'limits', JSON.stringify({ frames: LIMITS.frames, step: LIMITS.step, turn: LIMITS.turn, ceiling: LIMITS.ceiling }));
process.exit(refused.length ? 1 : 0);
