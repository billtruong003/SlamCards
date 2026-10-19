// Knocked out mid-round (task 1.32): the card says how many are still in and that the next round
// brings the player back; "Xem tiếp" puts it away. Its own server with 3 s turns: the first player to
// move idles twice and is out for idling, the other two play on.
//   node qa/out-card.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'qa', 'out', 'out-card');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8102;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ['server/server.js'], {
  cwd: path.join(ROOT, 'proto'),
  env: { ...process.env, PORT: String(PORT), SLAM_ADMIN_PORT: String(PORT + 100), SLAM_DATA: fs.mkdtempSync(path.join(ROOT, 'qa', 'out', 'tmp-')), SLAM_TIMING: JSON.stringify({ turn: 3000, order: 800, roundIntro: 500 }) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
async function player(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'vi-VN' });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-lang', 'vi');
    localStorage.setItem('slam-name', n);
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-ftue-matches', '3');
    localStorage.setItem('slam-ftue-slammed', '1');
  }, name);
  const p = await ctx.newPage();
  return p;
}
const boot = async (p, url) => {
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await sleep(300);
};
let ok = false;
try {
  const host = await player('Bill');
  await boot(host, `${BASE}/?debug`);
  await host.evaluate(() => document.getElementById('create').click());
  await sleep(300);
  await host.evaluate(() => document.getElementById('create-go').click());
  await host.waitForSelector('#link', { state: 'attached' });
  const link = await host.evaluate(() => document.getElementById('link').value);
  const guests = [];
  for (const n of ['Tèo', 'Tí']) {
    const g = await player(n);
    await boot(g, `${link}&debug`);
    await g.waitForSelector('#ready');
    await g.evaluate(() => document.getElementById('ready').click());
    guests.push(g);
  }
  await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).filter(Boolean).length === 2);
  await host.evaluate(() => document.getElementById('start').click());
  const all = [host, ...guests];
  // nobody plays: the first to move times out twice and is out for idling; find whose screen shows the card
  let outPage = null;
  for (let i = 0; i < 120 && !outPage; i++) {
    for (const p of all) if (await p.evaluate(() => !document.getElementById('out-card').hidden)) outPage = p;
    await sleep(250);
  }
  if (!outPage) throw new Error('nobody got the out card');
  const text = await outPage.evaluate(() => document.getElementById('out-text').textContent);
  await outPage.screenshot({ path: path.join(OUT, 'out-card.png') });
  await outPage.evaluate(() => document.getElementById('out-watch').click());
  await sleep(300);
  const away = await outPage.evaluate(() => document.getElementById('out-card').hidden);
  ok = /Còn 2 người/.test(text) && away;
  console.log(ok ? 'ok' : 'FAIL', JSON.stringify({ text, putAway: away }));
} catch (err) {
  console.log('FAIL', err.message);
} finally {
  await browser.close();
  server.kill();
}
process.exit(ok ? 0 : 1);
