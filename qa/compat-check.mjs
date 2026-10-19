// Browser compatibility touches (task 1.20): inside a social app's browser the menus suggest the real
// browser; a dark-mode phone still gets the light game; "reduce motion" stops the camera shake;
// every seat carries its mark (♥ ◆ ★ ♣) on the name chips and card labels.
//   node qa/compat-check.mjs        (local server on 8098)
import { chromium } from 'playwright';

const BASE = process.env.SLAM_BASE || 'http://localhost:8098';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
const results = [];
const expect = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
const ZALO_UA = 'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 Zalo android/23110300 ZaloTheme/light';

async function player(opts, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN', ...opts });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-lang', 'vi');
    localStorage.setItem('slam-name', n);
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-ftue-matches', '3');
    localStorage.setItem('slam-ftue-slammed', '1');
  }, name);
  return ctx.newPage();
}
const boot = async (p, url) => {
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await sleep(500);
};

// Zalo's browser, in dark mode, with reduced motion
const zalo = await player({ userAgent: ZALO_UA, colorScheme: 'dark', reducedMotion: 'reduce' }, 'Bill');
await boot(zalo, `${BASE}/?debug`);
const note = await zalo.evaluate(() => document.getElementById('inapp')?.innerText ?? '');
expect('in-app note names the app', /Zalo/.test(note), note.slice(0, 60));
await zalo.evaluate(() => document.getElementById('inapp-x').click());
const closedNote = await zalo.evaluate(() => !document.getElementById('inapp'));
expect('the note closes', closedNote);
const light = await zalo.evaluate(() => ({ scheme: getComputedStyle(document.documentElement).colorScheme, bg: getComputedStyle(document.querySelector('.menu-card')).backgroundColor }));
expect('dark-mode phone gets the light game', /only light|light/.test(light.scheme) && /255, 251, 240/.test(light.bg), JSON.stringify(light));
const shake = await zalo.evaluate(() => { slamDebug.world.trauma = 0; slamDebug.world.shake(0.9); return slamDebug.world.trauma; });
expect('reduce motion: no camera shake', shake === 0, `trauma ${shake}`);

// an ordinary phone: no note; in a match every seat shows its mark
await zalo.evaluate(() => document.getElementById('create').click());
await sleep(300);
await zalo.evaluate(() => document.getElementById('create-go').click());
await zalo.waitForSelector('#link', { state: 'attached' });
const link = await zalo.evaluate(() => document.getElementById('link').value);
const plain = await player({}, 'Tèo');
await boot(plain, `${link}&debug`);
expect('no note in an ordinary browser', await plain.evaluate(() => !document.getElementById('inapp')));
await plain.waitForSelector('#ready');
await plain.evaluate(() => document.getElementById('ready').click());
await zalo.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).some(Boolean));
await zalo.evaluate(() => document.getElementById('start').click());
await plain.waitForFunction(() => ['rps', 'turn', 'order'].includes(slamDebug.state?.phase), null, { timeout: 10000 });
await sleep(800);
const marks = await plain.evaluate(() => ({
  chips: [...document.querySelectorAll('#players .swatch')].map((s) => s.textContent),
  badges: [...document.querySelectorAll('#labels .badge')].filter((b) => !b.hidden).map((b) => b.textContent.slice(0, 2).trim()),
}));
expect('name chips carry seat marks', marks.chips.length === 2 && marks.chips.every((m) => /[♥◆★♣]/.test(m)), JSON.stringify(marks.chips));
expect('card labels carry seat marks', marks.badges.length >= 1 && marks.badges.every((m) => /[♥◆★♣]/.test(m)), JSON.stringify(marks.badges));
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
