// UX research (temporary): a 4-player friends room played to the end with real slams (server-judged), to see
// what a knocked-out player sees, how long they wait, the round and match end screens, a friend opening the room
// link after the match, and the host leaving. Players think 2-4 s per turn (faster than real people).
// Seats: P0 host on a laptop (1366x768), P1 on a phone (375x812 touch), P2 and P3 small windows.
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'qa', 'out', 'ux-4p');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8100;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const log = (...a) => console.log(`${((Date.now() - T0) / 1000).toFixed(1).padStart(6)}s`, ...a);
const server = spawn(process.execPath, ['server/server.js'], { cwd: path.join(ROOT, 'proto'), env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });

async function player(name, opts, url) {
  const ctx = await browser.newContext({ ...opts, locale: 'vi-VN' });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-volume', JSON.stringify({ music: 0, meme: 0, sfx: 0 }));
    localStorage.setItem('slam-lang', 'vi'); localStorage.setItem('slam-name', n);
  }, name);
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) });
const st = (p) => p.evaluate(() => { const s = slamDebug.state; return s ? { phase: s.phase, round: s.round, turn: s.turn, me: slamDebug.me, alive: s.alive, scores: s.scores, ev: s.event, code: s.code } : null; });

const LAPTOP = { viewport: { width: 1366, height: 768 } };
const PHONE = { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } };
const SMALL = { viewport: { width: 640, height: 480 } };

const host = await player('Bill', LAPTOP, `${BASE}/?debug&noftue`);
await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#link');
const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
const phone = await player('Tèo', PHONE, `${link}&debug`);
const p2 = await player('Tí', SMALL, `${link}&debug&noftue`);
const p3 = await player('Bự', SMALL, `${link}&debug&noftue`);
const pages = [host, phone, p2, p3];
const names = ['Bill(laptop)', 'Tèo(phone)', 'Tí', 'Bự'];
for (const g of [phone, p2, p3]) {
  await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
  await g.waitForSelector('#ready'); await g.click('#ready');
}
await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).filter(Boolean).length === 3);
await shot(host, '01-lobby-laptop'); await shot(phone, '01-lobby-phone');
const startInfo = await host.evaluate(() => { const b = document.getElementById('start').getBoundingClientRect(); const mb = document.querySelector('.menu-bg'); return { startTop: Math.round(b.top), startBottom: Math.round(b.bottom), viewportH: innerHeight, scrollArea: mb.clientHeight, content: mb.scrollHeight }; });
log('start button on the laptop (4 players):', JSON.stringify(startInfo));
await host.evaluate(() => document.getElementById('start').click());
await sleep(800);
const confirmShown = await host.evaluate(() => { const b = document.getElementById('ftue-go'); return !!b && b.offsetParent !== null; });
log('host had to confirm "start anyway" (someone reading the tutorial):', confirmShown);
if (confirmShown) { await shot(host, '02-host-confirm'); await host.evaluate(() => document.getElementById('ftue-go').click()); }
log('match started');

// --- play to the end
const seatOf = {};
for (const [i, p] of pages.entries()) seatOf[await p.evaluate(() => slamDebug.me)] = i;
const outAt = {};            // seat -> time knocked out this round
const waits = [];            // how long each knocked-out player waited for the round to end
const rounds = [];
let roundStart = Date.now(); let lastRound = 1; let slams = 0; let lastEv = null; let phoneOutShot = false; let hostOutShot = false;
const events = [];
const thinkUntil = {};
for (let loop = 0; loop < 4000; loop++) {
  const s = await st(host);
  if (!s) { await sleep(300); continue; }
  const evKey = s.ev ? JSON.stringify(s.ev) : null;
  if (evKey && evKey !== lastEv) {
    lastEv = evKey;
    const e = s.ev;
    events.push({ t: (Date.now() - T0) / 1000, round: s.round, type: e.type, by: names[seatOf[e.by]], out: (e.eliminated || []).map((x) => names[seatOf[x]]) });
    log('event', e.type, 'by', names[seatOf[e.by]], 'out', (e.eliminated || []).map((x) => names[seatOf[x]]).join(','));
    for (const x of e.eliminated || []) outAt[x] = Date.now();
  }
  // a knocked-out player: what they see
  const phoneSeat = Object.keys(seatOf).find((k) => seatOf[k] === 1);
  const hostSeat = Object.keys(seatOf).find((k) => seatOf[k] === 0);
  if (!phoneOutShot && outAt[phoneSeat] && s.phase === 'turn') { phoneOutShot = true; await sleep(600); await shot(phone, '10-phone-out-1'); setTimeout(() => shot(phone, '11-phone-out-later').catch(() => {}), 9000); }
  if (!hostOutShot && outAt[hostSeat] && s.phase === 'turn') { hostOutShot = true; await sleep(600); await shot(host, '12-laptop-out'); }
  if (s.round !== lastRound || s.phase === 'roundEnd' || s.phase === 'matchEnd') {
    if (s.phase === 'roundEnd' || s.phase === 'matchEnd') {
      if (!rounds[lastRound - 1]) {
        const dur = (Date.now() - roundStart) / 1000;
        for (const [seat, t] of Object.entries(outAt)) waits.push({ round: lastRound, who: names[seatOf[seat]], waited: +((Date.now() - t) / 1000).toFixed(1) });
        rounds[lastRound - 1] = { round: lastRound, seconds: +dur.toFixed(1), slams };
        log(`round ${lastRound} over: ${dur.toFixed(0)} s, ${slams} slams`);
        await shot(host, `20-round${lastRound}-end-laptop`); await shot(phone, `20-round${lastRound}-end-phone`);
        for (const k of Object.keys(outAt)) delete outAt[k];
        slams = 0;
      }
      if (s.phase === 'matchEnd') break;
    } else { lastRound = s.round; roundStart = Date.now(); phoneOutShot = false; hostOutShot = false; }
  }
  for (const [i, p] of pages.entries()) {
    if (await p.$('[data-rps]').catch(() => null)) await p.click(`[data-rps="${['bua', 'keo', 'bao', 'keo'][i]}"]`).catch(() => {});
    if (await p.$('#first').catch(() => null)) await p.click('#first').catch(() => {});
  }
  const turnPage = s.phase === 'turn' ? pages[seatOf[s.turn]] : null;
  if (turnPage) {
    const key = `${s.turn}-${s.round}-${events.length}-${slams}`;
    thinkUntil[key] ??= Date.now() + 2000 + Math.random() * 2000;
    if (Date.now() > thinkUntil[key]) {
      const did = await turnPage.evaluate(() => {
        const s = slamDebug.state; if (!s || s.phase !== 'turn' || s.turn !== slamDebug.me) return false;
        const cards = slamDebug.cards(); const me = cards[slamDebug.me]; if (!me) return false;
        let best = null;
        for (const [k, c] of Object.entries(cards)) if (k !== slamDebug.me && c.p[1] > -10 && s.alive.includes(k)) { const d = Math.hypot(c.p[0] - me.p[0], c.p[2] - me.p[2]); if (!best || d < best.d) best = { d, c }; }
        const tries = [];
        for (let i = 0; i < 12; i++) {
          const ang = (best ? Math.atan2(best.c.p[2] - me.p[2], best.c.p[0] - me.p[0]) + Math.PI : Math.random() * 6.28) + (Math.random() - 0.5) * 0.8;
          const r = 1.0 + Math.random() * 0.8;
          tries.push([me.p[0] + Math.cos(ang) * r, me.p[2] + Math.sin(ang) * r]);
        }
        return tries.some(([x, z]) => slamDebug.slamAt(x, z));
      }).catch(() => false);
      if (did) slams++;
    }
  }
  await sleep(300);
}
const total = (Date.now() - T0) / 1000;
log('match over');
await sleep(1500);
await shot(host, '30-match-end-laptop'); await shot(phone, '30-match-end-phone');

// --- a friend opens the room link after the match
const late = await player('Bạn mới', PHONE, link);
await sleep(2500);
await shot(late, '40-late-friend-opens-link');
const lateText = await late.evaluate(() => document.querySelector('.menu-card')?.innerText.slice(0, 200));
log('late friend sees:', JSON.stringify(lateText));

// --- the host leaves from the end screen (Main menu): what the others see
await host.evaluate(() => document.getElementById('menu')?.click());
await sleep(3000);
await shot(phone, '41-phone-after-host-left');
const toast = await phone.evaluate(() => [...document.querySelectorAll('.toast, #toast, [class*=toast]')].map((e) => e.innerText).filter(Boolean).join(' | '));
log('phone toast after host left:', JSON.stringify(toast));

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ totalSeconds: total, rounds, waits, events }, null, 1));
console.log(JSON.stringify({ totalSeconds: +total.toFixed(0), rounds, waits }, null, 1));
await browser.close();
server.kill();
