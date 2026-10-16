// Responsive audit: every screen at 16 screen sizes, looking for UI that overlaps other UI, sits off
// screen where it cannot be scrolled to, or has its text cut. Starts its own server (port 8099) with
// slow timers so the timed screens (RPS, choose, round end) hold still while it measures.
// Build first (npm --prefix proto run build).  node qa/responsive.mjs  → qa/out/responsive/*.png + report.json
// SHOTS=1 saves a screenshot of every screen × size (otherwise only the ones with problems).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'qa', 'out', process.env.TOUCH ? 'responsive-touch' : 'responsive');
fs.rmSync(OUT, { recursive: true, force: true });

fs.mkdirSync(OUT, { recursive: true });
const PORT = 8099;
const BASE = `http://localhost:${PORT}`;
// TOUCH=1: a phone/tablet browser (touch, coarse pointer), on the sizes such devices have
const TOUCH = Boolean(process.env.TOUCH);
const ALL_SIZES = [
  [320, 568], [360, 640], [375, 667], [390, 844], [414, 896], [430, 932],
  [568, 320], [667, 375], [844, 390], [932, 430],
  [768, 1024], [1024, 768], [1024, 600], [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1080],
];
const SIZES = TOUCH ? ALL_SIZES.filter(([w, h]) => Math.min(w, h) <= 834 && Math.max(w, h) <= 1366) : ALL_SIZES;
const slow = { roundIntro: 1500, rps: 600000, rpsReveal: 60000, choose: 600000, order: 60000, turn: 600000, roundEnd: 60000, forcedGrace: 600000 };
const server = spawn(process.execPath, ['server/server.js'], { cwd: path.join(ROOT, 'proto'), env: { ...process.env, PORT: String(PORT), SLAM_TIMING: JSON.stringify(slow) }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const pageErrors = [];
async function player(name, url = `${BASE}/?debug&noftue`) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'vi-VN', hasTouch: TOUCH, isMobile: TOUCH });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-memes', '0');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
  }, name);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => pageErrors.push(`${name}: ${e.message}`));
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}

// What counts as UI: the things a player reads or taps. Decoration (menu background, 3D canvas) is out.
const AUDIT = () => {
  const ATOMS = 'button, input, a, img, h1, h2, p, label, .chip, .wind, #banner, #hint, .badge, #toast, .tag, .seat-tag, .slot, .gear-tile, .gear-row, .pet-tile, .color-tile, .room-row, .menu-card, .panel, #corner, .ftue-tip, .ftue-bubble, .ftue-point, .stamp, .seg, .score, .meme';
  // the part of an element its scrolling / clipping ancestors actually show
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    let { left, top, right, bottom } = r;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        // content shows inside the padding box only (not under borders)
        const c = e.getBoundingClientRect();
        const cl = c.left + e.clientLeft; const ct = c.top + e.clientTop;
        left = Math.max(left, cl); top = Math.max(top, ct); right = Math.min(right, cl + e.clientWidth); bottom = Math.min(bottom, ct + e.clientHeight);
      }
      if (cs.position === 'fixed') break;
    }
    return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  };
  // pieces under a dialog that covers the screen are not "overlapped", they are behind it
  const MODAL = '.ftue-modal, .ftue-confirm, .netfail';
  const layer = (el) => (el.closest(MODAL) ? 2 : el.closest('#labels') ? 0 : 1);
  const vis = (el) => {
    if (el.closest('.menu-anim, #stage, [hidden]')) return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    }
    const r = clipped(el);
    return r.width > 2 && r.height > 2;
  };
  const W = innerWidth; const H = innerHeight;
  const label = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const txt = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    return `${el.tagName.toLowerCase()}${id}${cls}${txt ? ` "${txt}"` : ''}`;
  };
  const issues = [];
  const scrollers = [...document.querySelectorAll('.menu-bg, .ward-body, .room-list, .ftue-modal, .ftue-card, .wardrobe')].filter((s) => s.scrollHeight > s.clientHeight + 2 && getComputedStyle(s).overflowY !== 'visible');
  const positions = scrollers.length ? ['top', 'bottom'] : ['top'];
  for (const at of positions) {
    for (const s of scrollers) s.scrollTop = at === 'top' ? 0 : s.scrollHeight;
    const els = [...document.querySelectorAll(ATOMS)].filter(vis);
    const rects = els.map(clipped);
    // overlap: two UI pieces cover each other and neither holds the other
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i]; const b = els[j];
        if (a.contains(b) || b.contains(a)) continue;
        const la = layer(a); const lb = layer(b);
        if (la !== lb && (la === 2 || lb === 2)) continue;
        // card labels live under #overlay: a dialog hides them, they never cover it
        if ((la === 0 && b.closest('#overlay')) || (lb === 0 && a.closest('#overlay'))) continue;
        const A = rects[i]; const B = rects[j];
        const w = Math.min(A.right, B.right) - Math.max(A.left, B.left);
        const h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (w <= 2 || h <= 2) continue;
        // inside the viewport only: off-screen parts are a separate finding
        const vw = Math.min(A.right, B.right, W) - Math.max(A.left, B.left, 0);
        const vh = Math.min(A.bottom, B.bottom, H) - Math.max(A.top, B.top, 0);
        if (vw <= 2 || vh <= 2) continue;
        issues.push({ kind: 'overlap', at, a: label(a), b: label(b), px: Math.round(vw * vh) });
      }
    }
    // off screen: fixed pieces must sit inside the viewport; scrolled pieces must be reachable
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const inScroller = scrollers.some((s) => s.contains(el));
      const offX = r.left < -1 || r.right > W + 1;
      const offY = !inScroller && (r.top < -1 || r.bottom > H + 1);
      if (offX || offY) issues.push({ kind: 'offscreen', at, a: label(el), rect: [r.left, r.top, r.right, r.bottom].map(Math.round) });
      // cut text: a piece that hides its own overflow and has more than it shows
      const cs = getComputedStyle(el);
      if ((cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1 && el.innerText) issues.push({ kind: 'cut', at, a: label(el), need: el.scrollWidth, have: el.clientWidth });
    });
  }
  for (const s of scrollers) s.scrollTop = 0;
  // the first thing in a scrolling screen must be reachable at the top
  for (const s of scrollers) {
    const first = [...s.children].find((c) => !c.classList.contains('menu-anim') && vis(c));
    if (first && first.getBoundingClientRect().top < s.getBoundingClientRect().top - 1) issues.push({ kind: 'unreachable-top', a: label(first), top: Math.round(first.getBoundingClientRect().top) });
  }
  // de-duplicate (top and bottom often see the same thing)
  const seen = new Set();
  return issues.filter((x) => { const k = JSON.stringify({ ...x, at: undefined }); if (seen.has(k)) return false; seen.add(k); return true; });
};

const report = {};
let total = 0;
async function audit(p, screen) {
  for (const [w, h] of SIZES) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(220);
    const issues = await p.evaluate(AUDIT);
    const key = `${screen} @ ${w}x${h}`;
    if (issues.length) {
      report[key] = issues;
      total += issues.length;
      await p.screenshot({ path: path.join(OUT, `${screen}-${w}x${h}.png`) });
    } else if (process.env.SHOTS) {
      await p.screenshot({ path: path.join(OUT, `ok-${screen}-${w}x${h}.png`) });
    }
  }
  await p.setViewportSize({ width: 1280, height: 720 });
  console.log(`${screen.padEnd(16)} ${Object.keys(report).filter((k) => k.startsWith(`${screen} @`)).length} sizes with problems`);
}
const home = async (p) => { await p.goto(`${BASE}/?debug&noftue`); await p.waitForFunction(() => window.slamBooted === true); await p.evaluate(() => document.getElementById('intro')?.remove()); await p.waitForSelector('#play'); };

try {
  const host = await player('Bill');
  await host.waitForSelector('#play');
  await audit(host, 'home');
  await host.click('#create'); await host.waitForSelector('#create-go');
  await audit(host, 'create');
  await home(host);
  await host.click('#rooms'); await host.waitForTimeout(800);
  await audit(host, 'rooms');
  await home(host);
  await host.evaluate(() => document.querySelector('[data-ward="pet"]').click());
  await host.waitForSelector('[data-pet]');
  await audit(host, 'wardrobe-pet');
  await host.click('[data-tab="dep"]'); await host.waitForTimeout(500);
  await audit(host, 'wardrobe-dep');
  await host.click('[data-tab="card"]');
  await audit(host, 'wardrobe-card');
  await home(host);
  await host.click('#play'); await host.waitForTimeout(800);
  await audit(host, 'queue');
  await home(host);

  // a room with a guest; an empty lobby first
  await host.click('#create'); await host.click('#create-go');
  await host.waitForSelector('#link');
  await audit(host, 'lobby-alone');
  const link = await host.inputValue('#link');
  const guest = await player('Tèo Long Tên', `${link}&debug&noftue`);
  await guest.waitForSelector('#ready, #go'); if (await guest.$('#go')) await guest.click('#go');
  await guest.waitForSelector('#ready');
  await audit(host, 'lobby-host');
  await audit(guest, 'lobby-guest');
  await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await host.click('#start');
  await host.waitForSelector('[data-rps]', { timeout: 20000 });
  await audit(host, 'rps');
  await host.click('[data-rps="bua"]'); await guest.click('[data-rps="keo"]');
  await host.waitForFunction(() => slamDebug.state.phase !== 'rps');
  await audit(host, 'rps-reveal');
  await host.waitForSelector('#first', { timeout: 90000 });
  await audit(host, 'choose-winner');
  await audit(guest, 'choose-wait');
  await host.click('#first');
  await host.waitForFunction(() => slamDebug.state.phase === 'turn', null, { timeout: 90000 });
  await host.waitForTimeout(800);
  await audit(host, 'turn-mine');
  await audit(guest, 'turn-watch');
  // play until the round ends, then the match
  for (const target of ['roundEnd', 'matchEnd']) {
    for (let i = 0; i < 400; i++) {
      const ph = await host.evaluate(() => slamDebug.state.phase);
      if (ph === target || (target === 'roundEnd' && ph === 'matchEnd')) break;
      for (const [p, k] of [[host, 'bua'], [guest, 'keo']]) {
        if (await p.$('[data-rps]')) await p.click(`[data-rps="${k}"]`).catch(() => {});
        if (await p.$('#first')) await p.click('#first').catch(() => {});
        await p.evaluate(() => {
          const s = slamDebug.state;
          if (s.phase !== 'turn' || s.turn !== slamDebug.me) return;
          const c = slamDebug.cards()[slamDebug.me];
          [[c.p[0] + 1.1, c.p[2]], [c.p[0] - 1.1, c.p[2]], [c.p[0], c.p[2] + 1.1], [0, 0.6]].some(([x, z]) => slamDebug.slamAt(x, z));
        }).catch(() => {});
      }
      await host.waitForTimeout(300);
    }
    const ph = await host.evaluate(() => slamDebug.state.phase);
    if (ph === 'roundEnd' && target === 'roundEnd') await audit(host, 'round-end');
    if (ph === 'matchEnd') { await audit(host, 'match-end'); break; }
  }
  await guest.context().close();
  await host.context().close();

  // the tutorial (fresh player, invite card in the lobby, then the steps)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'vi-VN', hasTouch: TOUCH, isMobile: TOUCH });
  await ctx.addInitScript(() => { localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}'); localStorage.setItem('slam-name', 'Mới'); });
  const fresh = await ctx.newPage();
  await fresh.goto(`${BASE}/?debug`);
  await fresh.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await fresh.evaluate(() => document.getElementById('intro')?.remove());
  await fresh.click('#create'); await fresh.click('#create-go');
  await fresh.waitForSelector('#ftue-yes', { timeout: 10000 });
  await audit(fresh, 'ftue-invite');
  await fresh.click('#ftue-yes');
  await audit(fresh, 'ftue-step1');
  await ctx.close();
} catch (err) {
  console.log('SCRIPT ERROR', err.message.split('\n')[0]);
  report.script = err.message.split('\n')[0];
} finally {
  await browser.close();
  server.kill();
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(`TOTAL ${total} problems in ${Object.keys(report).length} screen×size; page errors: ${pageErrors.length ? pageErrors.join(' | ') : 'none'}`);
process.exit(total || report.script || pageErrors.length ? 1 : 0);
