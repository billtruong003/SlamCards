// UX research (temporary): how often a slam knocks a card off the table, by player count.
// Local physics only (slamDebug.localSlam), the server is never told. Each episode starts from a fresh deal
// (the game's own seat spots + jitter) and plays up to 8 slams, rotating the slammer, until a fall or a capture.
// Aim model: half the slams push the own card toward the nearest opponent (the point behind the card, 0.9-1.8 away),
// half are anywhere in the reach circle (3.0) off the card. 75% flat, 25% tilted.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8099;
const BASE = `http://localhost:${PORT}`;
const EPISODES = Number(process.env.EPISODES || 60);
const RIM = process.env.RIM; // table rim height to try (?rim=)
const Q = RIM !== undefined ? `&rim=${RIM}` : '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ['server/server.js'], { cwd: path.join(ROOT, 'proto'), env: { ...process.env, PORT: String(PORT), SLAM_TIMING: JSON.stringify({ turn: 900000, rps: 3000, choose: 3000 }) }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });

async function player(url) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  await ctx.addInitScript(() => { localStorage.setItem('slam-volume', JSON.stringify({ music: 0, meme: 0, sfx: 0 })); localStorage.setItem('slam-ftue', 'seen'); localStorage.setItem('slam-ftue-matches', '3'); localStorage.setItem('slam-name', 'P' + Math.floor(Math.random() * 99)); localStorage.setItem('slam-memes', '0'); });
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}

async function room(n) {
  const host = await player(`${BASE}/?debug&noftue${Q}`);
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#link');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const guests = [];
  for (let i = 1; i < n; i++) {
    const g = await player(`${link}&debug&noftue`);
    await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
    await g.waitForSelector('#ready'); await g.click('#ready');
    guests.push(g);
  }
  await host.waitForFunction((k) => Object.values(slamDebug.state.ready ?? {}).filter(Boolean).length === k, n - 1);
  await host.click('#start');
  const all = [host, ...guests];
  for (let i = 0; i < 120; i++) {
    if (await host.evaluate(() => slamDebug.state.phase === 'turn')) break;
    for (const p of all) {
      if (await p.$('[data-rps]')) await p.click('[data-rps="bua"]').catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
    }
    await sleep(300);
  }
  return all;
}

const SPOTS = { 2: [[-4.5, 0], [4.5, 0]], 3: [[-3.6, -2.6], [3.6, -2.6], [0, 3.6]], 4: [[-5.8, 0], [0, -3.6], [5.8, 0], [0, 3.6]] };
if (process.env.SPOTS3) SPOTS[3] = JSON.parse(process.env.SPOTS3);
const SIZES = (process.env.SIZES || '2,3,4').split(',').map(Number);
const report = {};
for (const n of SIZES) {
  const pages = await room(n);
  const host = pages[0];
  const stats = await host.evaluate(async ({ spots, episodes, scale }) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    slamDebug.timeScale = 6;
    for (const type of ['flat', 'tilt']) for (const k of ['horizontal', 'vertical']) slamDebug.tune.slam[type][k] *= scale;
    const rot = (q, v) => { const [x, y, z, w] = q; const [vx, vy, vz] = v; const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx); return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)]; };
    const up = (c) => rot(c.q, [0, 1, 0])[1] > 0;
    const onTop = (a, b) => { if (a.p[1] <= b.p[1]) return false; const r = rot([-b.q[0], -b.q[1], -b.q[2], b.q[3]], [a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]]); return Math.abs(r[0]) < 0.5 && Math.abs(r[2]) < 0.739; };
    const quat = (yaw) => { const a = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], b = [0, 0, 1, 0]; return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; };
    const seats = Object.keys(slamDebug.cards());
    const out = { slams: 0, falls: 0, fallOwn: 0, fallOther: 0, captures: 0, selfCapture: 0, quiet: 0, episodes: 0, slamsToEnd: [] };
    for (let e = 0; e < episodes; e++) {
      const deal = Object.fromEntries(seats.map((s, i) => [s, { p: [spots[i][0] + (Math.random() - 0.5) * 0.6, 0.008, spots[i][1] + (Math.random() - 0.5) * 0.6], q: quat((Math.random() - 0.5) * 0.6) }]));
      slamDebug.place(deal);
      await sleep(60);
      let ended = false;
      for (let k = 0; k < 8 && !ended; k++) {
        const cards = slamDebug.cards();
        const me = seats[k % seats.length];
        const c = cards[me].p;
        let x, z;
        if (Math.random() < 0.5) {
          // push toward the nearest opponent: aim behind my card
          let best = null;
          for (const s of seats) if (s !== me) { const o = cards[s].p; const d = Math.hypot(o[0] - c[0], o[2] - c[2]); if (!best || d < best.d) best = { d, o }; }
          const ang = Math.atan2(best.o[2] - c[2], best.o[0] - c[0]) + Math.PI + (Math.random() - 0.5) * 0.6;
          const r = 0.9 + Math.random() * 0.9;
          x = c[0] + Math.cos(ang) * r; z = c[2] + Math.sin(ang) * r;
        } else {
          const ang = Math.random() * Math.PI * 2; const r = 0.85 + Math.random() * 2.15;
          x = c[0] + Math.cos(ang) * r; z = c[2] + Math.sin(ang) * r;
        }
        slamDebug.localSlam(x, z, Math.random() < 0.75 ? 'flat' : 'tilt');
        await sleep(50);
        for (let t = 0; t < 400 && slamDebug.simulating; t++) await sleep(25);
        const after = slamDebug.cards();
        out.slams++;
        const fallen = seats.filter((s) => after[s].p[1] < -0.3);
        if (fallen.length) {
          out.falls++;
          if (fallen.includes(me)) out.fallOwn++;
          if (fallen.some((s) => s !== me)) out.fallOther++;
          ended = true;
        } else {
          const caps = [];
          for (const a of seats) for (const b of seats) if (a !== b && onTop(after[a], after[b]) && up(after[a]) && !up(after[b])) caps.push([a, b]);
          if (caps.length) { out.captures++; if (caps.some(([, b]) => b === me)) out.selfCapture++; ended = true; } else out.quiet++;
        }
        if (ended) out.slamsToEnd.push(k + 1);
      }
      out.episodes++;
    }
    return out;
  }, { spots: SPOTS[n], episodes: EPISODES, scale: Number(process.env.SLAM_SCALE || 1) });
  report[n] = stats;
  const pct = (a) => `${(100 * a / stats.slams).toFixed(1)}%`;
  console.log(`${n} players: ${stats.slams} slams | fall ${stats.falls} (${pct(stats.falls)}): own ${stats.fallOwn}, others' ${stats.fallOther} | capture ${stats.captures} (${pct(stats.captures)}), slammer's own card captured ${stats.selfCapture} | nothing ${stats.quiet} | episodes ending in 8 slams ${stats.slamsToEnd.length}/${stats.episodes}`);
  for (const p of pages) await p.context().close();
}
console.log(JSON.stringify(report));
await browser.close();
server.kill();
