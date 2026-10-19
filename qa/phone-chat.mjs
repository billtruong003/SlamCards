// Chat on a phone in a match (task 1.14): open on the player's own turn and staying open, the last
// lines readable, no text box (quick phrases + stickers instead), and a phrase sent reaches the other.
//   node qa/phone-chat.mjs        (local server on 8098)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8098';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'phone-chat');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
async function player(view, name) {
  const ctx = await browser.newContext({ ...view, locale: 'vi-VN' });
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
  await sleep(400);
};

const host = await player({ viewport: { width: 1280, height: 720 } }, 'Bill');
await boot(host, `${BASE}/?debug`);
await host.evaluate(() => document.getElementById('create').click());
await sleep(300);
await host.evaluate(() => document.getElementById('create-go').click());
await host.waitForSelector('#link', { state: 'attached' });
const link = await host.evaluate(() => document.getElementById('link').value);
const phone = await player({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'Tèo');
await boot(phone, `${link}&debug`);
await phone.waitForSelector('#ready');
await phone.evaluate(() => document.getElementById('ready').click());
await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).some(Boolean));
await host.evaluate(() => document.getElementById('start').click());
// the phone wins rock-paper-scissors and goes first
for (let i = 0; i < 60; i++) {
  if (await phone.evaluate(() => slamDebug.state?.phase === 'turn')) break;
  await phone.evaluate(() => document.querySelector('[data-rps="bua"]')?.click()).catch(() => {});
  await host.evaluate(() => document.querySelector('[data-rps="keo"]')?.click()).catch(() => {});
  await phone.evaluate(() => document.getElementById('first')?.click()).catch(() => {});
  await sleep(300);
}
// the laptop player types a line
await host.evaluate(() => { document.getElementById('chat-fab').click(); });
await sleep(300);
await host.fill('#cp-input', 'đập đi Tèo ơi');
await host.press('#cp-input', 'Enter');
await sleep(500);
await phone.waitForFunction(() => slamDebug.state.turn === slamDebug.me, null, { timeout: 10000 });
await phone.evaluate(() => document.getElementById('chat-fab').click());
await sleep(1500); // the turn goes on: the panel must stay open
const r = await phone.evaluate(() => {
  const panel = document.getElementById('chat-panel');
  const vis = (el) => Boolean(el) && getComputedStyle(el).display !== 'none' && !el.hidden && el.getBoundingClientRect().height > 0;
  return {
    myTurn: slamDebug.state.turn === slamDebug.me,
    open: vis(panel),
    fabEnabled: !document.getElementById('chat-fab').disabled,
    log: document.getElementById('cp-log').innerText.replace(/\s+/g, ' ').trim(),
    textBox: vis(document.getElementById('cp-input')),
    phrases: document.querySelectorAll('#cp-chips [data-react]').length,
    stickers: vis(document.getElementById('cp-stickers')),
  };
});
await phone.screenshot({ path: path.join(OUT, 'phone-turn-chat.png') });
await phone.evaluate(() => document.querySelector('#cp-chips [data-react="p:gg"]').click());
const heard = await host.waitForFunction(() => document.getElementById('cp-log').innerText.includes('GG'), null, { timeout: 5000 }).then(() => true).catch(() => false);
const ok = r.myTurn && r.open && r.fabEnabled && r.log.includes('đập đi Tèo ơi') && !r.textBox && r.phrases === 8 && r.stickers && heard;
console.log(ok ? 'ok' : 'FAIL', JSON.stringify({ ...r, phraseReachedLaptop: heard }));
await browser.close();
process.exit(ok ? 0 : 1);
