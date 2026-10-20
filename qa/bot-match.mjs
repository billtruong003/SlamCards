// A lone player in quick match gets a computer opponent (task 1.31) and plays a whole match in a real
// browser: the bot's slams run on this page with real physics and must pass the server's check.
// Its talk (B.05) is counted from the socket, and every bubble must show words, never a raw key.
//   node qa/bot-match.mjs        (local server on 8098; presses "Chơi với máy luôn" after 2 s)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8098';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'bot-match');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'vi-VN' });
await ctx.addInitScript(() => {
  localStorage.setItem('slam-lang', 'vi');
  localStorage.setItem('slam-name', 'Bill');
  localStorage.setItem('slam-ftue', 'seen');
  localStorage.setItem('slam-ftue-matches', '3');
  localStorage.setItem('slam-ftue-slammed', '1');
});
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
const talk = []; // the bot's reactions, as the server sent them
p.on('websocket', (ws) => ws.on('framereceived', ({ payload }) => {
  try { const m = JSON.parse(payload); if (m.t === 'react') talk.push(m.id); } catch { /* binary */ }
}));
// a bubble showing an untranslated key ("bot.ate.yum", "phrase.ga") is a bug
await p.addInitScript(() => {
  window.__rawKeys = [];
  new MutationObserver(() => {
    for (const el of document.querySelectorAll('.phrase')) if (/^(bot|phrase)\./.test(el.textContent)) window.__rawKeys.push(el.textContent);
  }).observe(document, { subtree: true, childList: true });
});
await p.goto(`${BASE}/?debug`);
await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
await p.evaluate(() => document.getElementById('intro')?.remove());
await sleep(400);
await p.evaluate(() => { document.querySelector('#size [data-size="2"]').click(); document.getElementById('play').click(); });
const t0 = Date.now();
await sleep(2000);
await p.evaluate(() => document.getElementById('queue-bots')?.click()); // B.01: no need to wait
await p.waitForFunction(() => slamDebug.state && Object.keys(slamDebug.state.players).length === 2, null, { timeout: 40000 });
const waited = Math.round((Date.now() - t0) / 1000);
const opponent = await p.evaluate(() => Object.entries(slamDebug.state.players).find(([s]) => s !== slamDebug.me)[1].name);
console.log(`matched after ${waited}s with "${opponent}"`);

let mySlams = 0;
let botTurns = 0;
const end = Date.now() + 6 * 60000;
while (Date.now() < end) {
  const s = await p.evaluate(() => { const st = slamDebug.state; return { phase: st.phase, turn: st.turn, me: slamDebug.me, sim: slamDebug.simulating }; });
  if (s.phase === 'matchEnd') break;
  if (s.phase === 'rps') await p.evaluate(() => document.querySelector('[data-rps="bua"]')?.click()).catch(() => {});
  if (s.phase === 'choose') await p.evaluate(() => document.getElementById('first')?.click()).catch(() => {});
  if (s.phase === 'turn' && s.turn === s.me && !s.sim) {
    // aim behind my card toward the bot, as a person would
    const ok = await p.evaluate(() => {
      const cards = slamDebug.cards();
      const mine = cards[slamDebug.me].p;
      const other = Object.entries(cards).find(([seat, c]) => seat !== slamDebug.me && c.p[1] > -10)?.[1].p ?? [0, 0, 0];
      const dx = other[0] - mine[0]; const dz = other[2] - mine[2]; const len = Math.hypot(dx, dz) || 1;
      const wob = (Math.random() - 0.5) * 0.8;
      return slamDebug.slamAt(mine[0] - (dx / len) * 1.2 - (dz / len) * wob, mine[2] - (dz / len) * 1.2 + (dx / len) * wob);
    });
    if (ok) mySlams++;
    await sleep(2500);
    continue;
  }
  if (s.phase === 'anim' && s.turn !== s.me) {
    botTurns++;
    await p.waitForFunction(() => slamDebug.state.phase !== 'anim', null, { timeout: 20000 }).catch(() => {});
    continue;
  }
  await sleep(300);
}
const result = await p.evaluate(() => ({ phase: slamDebug.state.phase, scores: slamDebug.state.scores, story: document.querySelector('.match-story')?.innerText ?? '' }));
await p.screenshot({ path: path.join(OUT, 'end.png') });
const rawKeys = await p.evaluate(() => window.__rawKeys);
console.log(JSON.stringify({ ...result, mySlams, botTurns, talk, rawKeys, errors }));
await browser.close();
process.exit(result.phase === 'matchEnd' && botTurns > 0 && waited <= 5 && !rawKeys.length && !errors.length ? 0 : 1);
