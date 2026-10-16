// The phone invite flow: the host copies the link, leaves for a chat app (the page is hidden and its
// connection drops) for 20 s, a friend opens the link meanwhile, the host comes back: same room,
// still the host, and the match starts. Before the fix the room was gone after 5 s.
// Run with the game server on :8097:  node qa/phone-share.mjs
import { chromium, devices } from 'playwright';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const AWAY_MS = Number(process.env.AWAY_MS || 20000);
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
async function phone(name) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'vi-VN' });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
    // Playwright's offline mode leaves open WebSockets alone, so sockets are tracked here to cut
    // them for real, and while "away" new ones fail at once (a suspended page has no network)
    const Real = window.WebSocket;
    window.__sockets = [];
    window.WebSocket = function (url, ...rest) {
      const s = new Real(window.__away ? 'ws://127.0.0.1:9/' : url, ...rest);
      window.__sockets.push(s);
      return s;
    };
    window.WebSocket.prototype = Real.prototype;
    Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  }, name);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  return p;
}
// what a phone does when the player switches app: the page goes hidden and the network to it stops
async function leaveApp(p) {
  await p.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.__away = true;
    for (const s of window.__sockets) s.close();
  });
}
async function backToApp(p) {
  await p.evaluate(() => {
    window.__away = false;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

try {
  const host = await phone('Bill');
  await host.goto(`${BASE}/?debug&noftue`);
  await host.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await host.evaluate(() => document.getElementById('intro')?.remove());
  await host.click('#create'); await host.click('#create-go');
  await host.waitForSelector('#link');
  const link = await host.inputValue('#link');
  const code = await host.evaluate(() => slamDebug.state.code);

  await leaveApp(host);
  const t0 = Date.now();
  await host.waitForTimeout(AWAY_MS / 2);
  const friend = await phone('Tèo');
  await friend.goto(`${link}&debug&noftue`);
  await friend.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await friend.waitForSelector('#ready, #go', { timeout: 10000 }).catch(() => {});
  if (await friend.$('#go')) await friend.click('#go');
  const friendIn = await friend.waitForSelector('#ready', { timeout: 10000 }).then(() => true).catch(() => false);
  check('friend opens the link while the host is away', friendIn);
  await host.waitForTimeout(Math.max(0, AWAY_MS - (Date.now() - t0)));

  const back = Date.now();
  await backToApp(host);
  // a fresh state from the server: it has the friend who joined while the host was away
  const rejoined = await host.waitForFunction((c) => slamDebug.state?.code === c && slamDebug.me === 'black' && slamDebug.state.players.black?.connected && slamDebug.state.players.pink, code, { timeout: 15000 }).then(() => true).catch(() => false);
  check(`host is back in the same room and seat after ${AWAY_MS / 1000}s away`, rejoined, `${((Date.now() - back) / 1000).toFixed(1)}s to rejoin`);
  const s = await host.evaluate(() => ({ host: slamDebug.state.host, n: Object.keys(slamDebug.state.players).length }));
  check('still the host, friend still in the room', s.host === 'black' && s.n === 2, JSON.stringify(s));
  if (friendIn) {
    await friend.click('#ready');
    await host.waitForFunction(() => slamDebug.state.ready?.pink === true, null, { timeout: 5000 });
    await host.click('#start');
    check('the match starts', await host.waitForFunction(() => slamDebug.state.phase !== 'lobby', null, { timeout: 10000 }).then(() => true).catch(() => false));
  }
} catch (err) {
  check('script', false, err.message.split('\n')[0]);
} finally {
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
