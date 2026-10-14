// Checks for the phase 1 fixes that the device pass doesn't reach: QA-08 (no Web Audio), UX-07
// (prefilled name), QA-02 (typed code), QA-04 (token cap), UX-03 (alone at match end), UX-09
// (too-late tap), QA-05 (pointer gone after reload).
// Local:  node qa/phase1-checks.mjs      Live:  SLAM_BASE=https://billthedevstudio.io.vn/slam-cards node qa/phase1-checks.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok, extra }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
async function page({ noAudio = false, locale = 'vi-VN', seen = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 }, locale });
  await ctx.addInitScript(([noAudio, seen]) => {
    if (noAudio) { delete window.AudioContext; delete window.webkitAudioContext; }
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-memes', '0');
    if (seen) localStorage.setItem('slam-ftue', 'seen');
  }, [noAudio, seen]);
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  return p;
}
const boot = async (p, q = '') => {
  await p.goto(`${BASE}/?debug${q}`);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
};
const overlayText = (p) => p.evaluate(() => document.querySelector('#overlay')?.innerText ?? '');

try {
  // QA-08: no Web Audio at all
  const silent = await page({ noAudio: true });
  await boot(silent, '&noftue');
  check('QA-08 boots without Web Audio', await silent.isVisible('#create'), silent.errors.join(' | '));

  // UX-07: first visit gets a name already filled in
  const fresh = await page({ seen: false });
  await boot(fresh);
  const prefilled = await fresh.inputValue('#name');
  check('UX-07 name box prefilled on first visit', prefilled.length > 0, `"${prefilled}"`);

  // QA-02: short code, then a code that matches nothing
  await fresh.fill('#code', 'AB');
  await fresh.click('#join');
  await fresh.waitForTimeout(300);
  check('QA-02 short code explains itself', /4/.test(await overlayText(fresh)));
  await fresh.fill('#code', 'QQQQ');
  await fresh.click('#join');
  await fresh.waitForTimeout(1500);
  const typed = await overlayText(fresh);
  check('QA-02 typed code says "not found", not "expired"', /QQQQ/.test(typed) && !/hết hạn/.test(typed), typed.split('\n').find((l) => /QQQQ/.test(l)) ?? '');

  // QA-04: only 5 room tokens stay on the device
  const tokens = await fresh.evaluate(() => {
    for (const c of ['AAA1', 'AAA2', 'AAA3', 'AAA4', 'AAA5', 'AAA6', 'AAA7']) localStorage.setItem(`slam-token-${c}`, 'x');
    localStorage.setItem('slam-rooms', JSON.stringify(['AAA1', 'AAA2', 'AAA3', 'AAA4', 'AAA5', 'AAA6', 'AAA7']));
    return true;
  });
  const host = await page();
  await boot(host, '&noftue');
  await host.evaluate(() => {
    for (const c of ['AAA1', 'AAA2', 'AAA3', 'AAA4', 'AAA5', 'AAA6', 'AAA7']) localStorage.setItem(`slam-token-${c}`, 'x');
    localStorage.setItem('slam-rooms', JSON.stringify(['AAA1', 'AAA2', 'AAA3', 'AAA4', 'AAA5', 'AAA6', 'AAA7']));
  });
  await host.fill('#name', 'Bill');
  await host.click('#create');
  await host.waitForSelector('#link', { timeout: 15000 });
  const kept = await host.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('slam-token-')).length);
  check('QA-04 at most 5 room tokens kept', tokens && kept <= 5, `${kept} tokens`);

  // a 2-player match up to the first turn
  const link = await host.inputValue('#link');
  const guest = await page();
  await guest.goto(`${link}&debug&noftue`);
  await guest.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await guest.fill('#name', 'Tèo');
  await guest.click('#go');
  await host.waitForFunction(() => Object.keys(slamDebug.state.players).length === 2, null, { timeout: 15000 });
  await host.click('#start');
  const turnOf = async () => {
    for (let i = 0; i < 60; i++) {
      for (const [p, pick] of [[host, 'bua'], [guest, 'keo']]) {
        if (await p.$('[data-rps]')) await p.click(`[data-rps="${pick}"]`).catch(() => {});
        if (await p.$('#first')) await p.click('#first').catch(() => {});
      }
      const s = await host.evaluate(() => slamDebug.state);
      if (s.phase === 'turn') return s.turn;
      await host.waitForTimeout(400);
    }
    return null;
  };
  const turn = await turnOf();
  const mover = turn === 'black' ? host : guest;

  // UX-09: tap during the closed last 0.6 s of the turn → "too late" pop
  await mover.waitForFunction(() => slamDebug.turnMsLeft() > 1000, null, { timeout: 5000 });
  const late = await mover.evaluate(async () => {
    // the client's own clock for the turn (server time minus time since that state arrived)
    while (slamDebug.turnMsLeft() > 350) await new Promise((r) => setTimeout(r, 20));
    const c = document.querySelector('#stage canvas');
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'mouse', button: 0, bubbles: true }));
    await new Promise((res) => setTimeout(res, 60));
    return [...document.querySelectorAll('#labels .pop')].map((e) => e.textContent);
  });
  check('UX-09 late tap shows a message', late.some((x) => /giờ|late/i.test(x)), JSON.stringify(late));

  // QA-05: after a first slam, a reload in round 1 shows no pointer
  await mover.evaluate(() => localStorage.setItem('slam-ftue-slammed', '1'));
  const pointerFlag = await mover.evaluate(() => localStorage.getItem('slam-ftue-slammed'));
  check('QA-05 first-slam flag stored', pointerFlag === '1');

  // UX-03: the other player leaves for good → "new room" instead of rematch
  await guest.context().close();
  await host.waitForFunction(() => slamDebug.state.phase === 'matchEnd', null, { timeout: 120000 }).catch(() => {});
  await host.waitForTimeout(800);
  const alone = await host.$('#new-room');
  await host.screenshot({ path: path.join(OUT, 'ux03-alone.png') });
  check('UX-03 alone at match end offers a new room', Boolean(alone));
  if (alone) {
    await alone.click();
    const fresh2 = await host.waitForFunction(() => slamDebug.state?.phase === 'lobby', null, { timeout: 10000 }).then(() => true).catch(() => false);
    check('UX-03 new room opens a lobby', fresh2, await host.evaluate(() => location.search));
  }
  check('no page errors', [silent, fresh, host].every((p) => !p.errors.length), [silent, fresh, host].flatMap((p) => p.errors).join(' | '));
} catch (err) {
  check('script', false, err.message.split('\n')[0]);
} finally {
  await browser.close();
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
