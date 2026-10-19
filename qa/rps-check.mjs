// Rock-paper-scissors, choosing who goes first, and the queue screen (task 1.15): the buttons are not
// rebuilt while the other player picks (a tap would be lost), the status line says what the player
// waits for, a draw says so, the choose screen has a clock, the queue screen is not rebuilt each second.
//   node qa/rps-check.mjs        (local server on 8098)
import { chromium } from 'playwright';

const BASE = process.env.SLAM_BASE || 'http://localhost:8098';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
async function player(name) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 }, locale: 'vi-VN' });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-lang', 'vi');
    localStorage.setItem('slam-name', n);
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-ftue-matches', '3');
  }, name);
  return ctx.newPage();
}
const boot = async (p, url) => {
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  await sleep(400);
};
const results = [];
const expect = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };

// the queue screen: the same element after a few seconds of waiting
const q = await player('Bin');
await boot(q, `${BASE}/?debug`);
await q.evaluate(() => { document.querySelector('#size [data-size="4"]').click(); document.getElementById('play').click(); });
await q.waitForSelector('#queue-cancel');
await q.evaluate(() => { window.__cancel = document.getElementById('queue-cancel'); });
const before = await q.evaluate(() => document.getElementById('queue-waited').textContent);
await sleep(2600);
const queue = await q.evaluate(() => ({ same: window.__cancel === document.getElementById('queue-cancel'), waited: document.getElementById('queue-waited').textContent }));
expect('queue screen kept, clock moves', queue.same && queue.waited !== before, JSON.stringify({ before, ...queue }));
await q.evaluate(() => document.getElementById('queue-cancel').click());
await q.context().close();

const host = await player('Bill');
await boot(host, `${BASE}/?debug`);
await host.evaluate(() => document.getElementById('create').click());
await sleep(300);
await host.evaluate(() => document.getElementById('create-go').click());
await host.waitForSelector('#link', { state: 'attached' });
const link = await host.evaluate(() => document.getElementById('link').value);
const guest = await player('Tèo');
await boot(guest, `${link}&debug`);
await guest.waitForSelector('#ready');
await guest.evaluate(() => document.getElementById('ready').click());
await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).some(Boolean));
await host.evaluate(() => document.getElementById('start').click());
await host.waitForSelector('[data-rps="bua"]', { timeout: 10000 });
await sleep(300);

const status = await host.evaluate(() => document.getElementById('rps-status').textContent);
expect('status asks me to pick first', /Chọn nhanh/.test(status), status);
await host.evaluate(() => { window.__bua = document.querySelector('[data-rps="bua"]'); });
await guest.evaluate(() => document.querySelector('[data-rps="bua"]').click());
await host.waitForFunction(() => slamDebug.state.rpsChosen[slamDebug.state.seats.find((s) => s !== slamDebug.me)], null, { timeout: 5000 });
await sleep(300);
const kept = await host.evaluate(() => window.__bua === document.querySelector('[data-rps="bua"]'));
expect('my buttons kept while the other picks', kept);
// a draw: both bua
await host.evaluate(() => document.querySelector('[data-rps="bua"]').click());
await host.waitForFunction(() => slamDebug.state.phase === 'rps' && document.querySelector('.rps-again'), null, { timeout: 8000 }).catch(() => {});
const again = await host.evaluate(() => document.querySelector('.rps-again')?.textContent ?? '');
expect('a draw says so', /Hoà/.test(again), again);
await host.evaluate(() => document.querySelector('[data-rps="bua"]').click());
await guest.evaluate(() => document.querySelector('[data-rps="keo"]').click());
await host.waitForSelector('#first', { timeout: 8000 });
await sleep(1200);
const clock = await host.evaluate(() => document.getElementById('rps-timer')?.textContent ?? '');
const otherClock = await guest.evaluate(() => document.getElementById('rps-timer')?.textContent ?? '');
expect('choose screen has a clock, for both', /\d+s/.test(clock) && /\d+s/.test(otherClock), `${clock} / ${otherClock}`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
