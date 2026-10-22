// Two real browsers play a whole match: create → invite link → start → RPS → slams until someone wins
// → rematch → back to menu. Then a dead invite link and a mistyped code.
// Local:  node qa/live-match.mjs      Live:  SLAM_BASE=https://play.billthedevstudio.com/slam-cards node qa/live-match.mjs
// Output: qa/out/match/*.png and a JSON summary on stdout.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
// SLAM_STENCIL=1 plays with the stencil-window card prototype
const Q = process.env.SLAM_STENCIL ? 'stencil&' : '';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'match');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const summary = { base: BASE, steps: [], errors: [], findings: [] };
const step = (name, ok, extra = {}) => { summary.steps.push({ name, ok, ...extra }); if (!ok) summary.findings.push(`step failed: ${name}`); };

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
async function player(name) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 }, locale: 'vi-VN' });
  await ctx.addInitScript(() => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-memes', '0');
    localStorage.setItem('slam-ftue', 'seen');
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => summary.errors.push(`${name} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') summary.errors.push(`${name} console: ${m.text().slice(0, 160)}`); });
  return page;
}
const state = (p) => p.evaluate(() => { const s = slamDebug.state; return s && { phase: s.phase, round: s.round, turn: s.turn, scores: s.scores, winner: s.result?.winner ?? null }; });
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) });

const host = await player('host');
const guest = await player('guest');
try {
  await host.goto(`${BASE}/?${Q}debug&noftue`);
  await host.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await host.fill('#name', 'Bill');
  await host.click('#create');
  await host.click('#create-go');
  await host.waitForSelector('#link', { timeout: 15000 });
  const link = await host.inputValue('#link');
  step('host creates room', /room=/.test(link), { link });

  await guest.goto(`${link}${link.includes('?') ? '&' : '?'}${Q}debug&noftue`);
  await guest.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await guest.fill('#name', 'Tèo');
  await guest.click('#go');
  await host.waitForFunction(() => slamDebug.state && Object.keys(slamDebug.state.players).length === 2, null, { timeout: 15000 });
  step('guest joins by link', true);
  await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready?.pink === true, null, { timeout: 5000 });
  await shot(host, '01-lobby');

  await host.click('#start');
  const t0 = Date.now();
  let slams = 0;
  let rematched = false;
  let lastPhase = '';
  while (Date.now() - t0 < 8 * 60 * 1000) {
    const [hs, gs] = await Promise.all([state(host), state(guest)]);
    if (hs.phase !== lastPhase) { summary.steps.push({ name: `phase ${hs.phase}`, ok: true, round: hs.round, scores: hs.scores }); lastPhase = hs.phase; }
    if (hs.phase === 'matchEnd') {
      await shot(host, '05-match-end');
      if (rematched) break;
      // a friends' room goes back to its lobby (1.35): the guest is ready again, the host starts
      await host.click('#rematch');
      rematched = true;
      const lobby = await host.waitForFunction(() => slamDebug.state.phase === 'lobby', null, { timeout: 15000 }).then(() => true).catch(() => false);
      step('back to the room after the match', lobby);
      await guest.waitForSelector('#ready', { timeout: 15000 });
      await guest.click('#ready');
      await host.waitForFunction(() => slamDebug.state.ready?.pink === true, null, { timeout: 5000 });
      await host.click('#start');
      const back = await host.waitForFunction(() => slamDebug.state.phase !== 'lobby', null, { timeout: 15000 }).then(() => true).catch(() => false);
      step('rematch starts a new match', back);
      // play the rematch only up to its first turn, then leave via the menu
      await host.waitForFunction(() => ['rps', 'choose', 'turn'].includes(slamDebug.state.phase), null, { timeout: 20000 }).catch(() => {});
      break;
    }
    for (const [p, pick] of [[host, 'bua'], [guest, 'keo']]) {
      if (await p.$('[data-rps]')) { await p.click(`[data-rps="${pick}"]`).catch(() => {}); }
      if (await p.$('#first')) { await p.click('#first').catch(() => {}); }
    }
    if (hs.phase === 'turn') {
      for (const [p, s] of [[host, hs], [guest, gs]]) {
        // aim behind my own card, away from the enemy, like the first-turn pointer
        const ok = await p.evaluate(() => {
          const s = slamDebug.state;
          const cards = slamDebug.cards();
          const mine = cards[s.turn];
          const enemy = Object.entries(cards).find(([seat]) => seat !== s.turn)?.[1];
          if (!mine || !enemy) return false;
          const dx = enemy.p[0] - mine.p[0], dz = enemy.p[2] - mine.p[2], len = Math.hypot(dx, dz) || 1;
          const d = 1.0 + Math.random() * 0.6, wob = (Math.random() - 0.5) * 0.6;
          return slamDebug.slamAt(mine.p[0] - (dx / len) * d - (dz / len) * wob, mine.p[2] - (dz / len) * d + (dx / len) * wob);
        }).catch(() => false);
        if (ok) { slams += 1; if (slams === 1) await shot(p, '03-first-slam'); }
      }
    }
    if (hs.phase === 'roundEnd' && hs.round === 1) await shot(host, '04-round-end').catch(() => {});
    await sleep(700);
  }
  step('match reached the end', lastPhase !== '' && rematched, { slams, seconds: Math.round((Date.now() - t0) / 1000) });

  await host.click('#overlay .btn:not(.pri)').catch(() => {});
  await guest.goto(`${BASE}/?${Q}debug&noftue`);
  await guest.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });

  // dead invite link
  await guest.goto(`${BASE}/?room=ZZZZ&debug&noftue`);
  await guest.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await sleep(1500);
  const dead = await guest.evaluate(() => document.querySelector('#overlay')?.innerText ?? '');
  await shot(guest, '06-dead-link');
  step('dead invite link explains itself', /ZZZZ/.test(dead), { text: dead.slice(0, 160) });

  // mistyped code from the menu
  await guest.goto(`${BASE}/?${Q}debug&noftue`);
  await guest.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await guest.fill('#code', 'QQQQ');
  await guest.click('#join');
  await sleep(1500);
  const typed = await guest.evaluate(() => document.querySelector('#overlay')?.innerText ?? '');
  await shot(guest, '07-typed-code');
  step('typed wrong code shows an error', /QQQQ|phòng/i.test(typed), { text: typed.slice(0, 160) });
} catch (err) {
  summary.errors.push(`script: ${err.message.split('\n')[0]}`);
  await shot(host, 'zz-host').catch(() => {});
  await shot(guest, 'zz-guest').catch(() => {});
} finally {
  await browser.close();
}
console.log(JSON.stringify(summary, null, 1));
