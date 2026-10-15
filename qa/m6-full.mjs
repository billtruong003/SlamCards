// Milestone 6 QA in real browsers, against its own server (port 8098, so it can be restarted):
//  A. quick match "any" with 4 strangers → one 4-player match, slams until a round ends
//  B. a private 3-player room: create, 2 join by link, ready, start, play to a round end
//  C. lose the network in the lobby and in the match, come back to the same seat
//  D. the same room open in 2 tabs of one browser (the 2nd tab is a new player, the 1st keeps its seat)
//  E. the server restarts under a lobby: the page says so, goes home, and a new room works
// Build first (npm --prefix proto run build).  node qa/m6-full.mjs   → qa/out/m6/*.png
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'qa', 'out', 'm6');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8098;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
const errors = [];

let server = null;
async function startServer() {
  server = spawn(process.execPath, ['server/server.js'], { cwd: path.join(ROOT, 'proto'), env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stderr.on('data', (d) => errors.push(`server: ${String(d).trim().slice(0, 200)}`));
  await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));
}
async function stopServer() {
  if (!server) return;
  const s = server;
  server = null;
  s.kill();
  await new Promise((r) => s.once('exit', r));
}

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
// the network going away on purpose makes a few expected console lines
const expected = /WebSocket|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED|Failed to load resource/;
async function player(name, { ctx = null, url = `${BASE}/?debug&noftue` } = {}) {
  ctx ??= await browser.newContext({ viewport: { width: 900, height: 640 }, locale: 'vi-VN' });
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-memes', '0');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
  }, name);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !expected.test(m.text())) errors.push(`${name} console: ${m.text().slice(0, 150)}`); });
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) });
const st = (p) => p.evaluate(() => { const s = slamDebug.state; return s ? { phase: s.phase, round: s.round, turn: s.turn, me: slamDebug.me, n: Object.keys(s.players).length, code: s.code } : null; });

// Everyone plays until `until(state)` holds: RPS rock/scissors, "go first", and the player whose turn
// it is slams next to their own card (or anywhere valid near the middle).
async function play(pages, until, ms = 4 * 60 * 1000) {
  const t0 = Date.now();
  let slams = 0;
  const picks = ['bua', 'keo', 'bao', 'keo'];
  while (Date.now() - t0 < ms) {
    const s = await st(pages[0]);
    if (s && until(s)) return { ok: true, slams };
    for (const [i, p] of pages.entries()) {
      if (await p.$('[data-rps]')) await p.click(`[data-rps="${picks[i % 4]}"]`).catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
      const did = await p.evaluate(() => {
        const s = slamDebug.state;
        if (!s || s.phase !== 'turn' || s.turn !== slamDebug.me || slamDebug.turnMsLeft() < 1500) return false;
        const c = slamDebug.cards()[slamDebug.me];
        const tries = c ? [[c.p[0] + 1.1, c.p[2]], [c.p[0] - 1.1, c.p[2]], [c.p[0], c.p[2] + 1.1]] : [];
        tries.push([0, 0.6], [0.8, 0], [-0.8, 0]);
        return tries.some(([x, z]) => slamDebug.slamAt(x, z));
      }).catch(() => false);
      if (did) slams++;
    }
    await sleep(350);
  }
  return { ok: false, slams };
}
const closeAll = async (pages) => { for (const p of pages) await p.context().close().catch(() => {}); };

await startServer();
try {
  // ---------- A. quick match "any" with 4 strangers ----------
  {
    const names = ['Ana', 'Bảo', 'Chi', 'Dũng'];
    const pages = [];
    for (const n of names) pages.push(await player(n));
    for (const p of pages) {
      await p.click('#size [data-size="any"]').catch(() => {});
      await p.click('#play');
    }
    await shot(pages[0], 'A1-queue');
    const started = await Promise.all(pages.map((p) => p.waitForFunction(() => slamDebug.state && slamDebug.state.phase !== 'lobby', null, { timeout: 30000 }).then(() => true).catch(() => false)));
    const s = await Promise.all(pages.map(st));
    const sameRoom = s.every((x) => x?.code && x.code === s[0].code);
    check('A quick "any": 4 strangers land in one match', started.every(Boolean) && sameRoom && s[0].n === 4, JSON.stringify(s.map((x) => x?.n)));
    const r = await play(pages, (x) => x.phase === 'roundEnd' || x.phase === 'matchEnd' || x.round > 1);
    await shot(pages[0], 'A2-four-players');
    check('A 4-player round plays to its end', r.ok, `slams=${r.slams}`);
    await closeAll(pages);
  }

  // ---------- B. private 3-player room ----------
  let link = '';
  {
    const host = await player('Bill');
    await host.click('#create');
    await host.click('#create-go');
    await host.waitForSelector('#link', { timeout: 10000 });
    link = await host.inputValue('#link');
    const guests = [];
    for (const n of ['Tèo', 'Tí']) {
      const g = await player(n, { url: `${link}&debug&noftue` });
      await g.waitForSelector('#ready, #go', { timeout: 10000 });
      if (await g.$('#go')) await g.click('#go');
      await g.waitForSelector('#ready', { timeout: 10000 });
      await g.click('#ready');
      guests.push(g);
    }
    await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).filter(Boolean).length === 2, null, { timeout: 10000 });
    await shot(host, 'B1-lobby-3');

    // C1. a guest loses the network in the lobby for 4 s and keeps the seat
    const g0 = guests[0];
    const seatBefore = (await st(g0)).me;
    await g0.context().setOffline(true);
    await sleep(4000);
    await g0.context().setOffline(false);
    const back = await g0.waitForFunction((seat) => slamDebug.state?.phase === 'lobby' && slamDebug.me === seat, seatBefore, { timeout: 20000 }).then(() => true).catch(() => false);
    check('C lobby: network back, same seat', back);
    // reconnecting may have taken back Ready
    if (!(await host.evaluate((seat) => slamDebug.state.ready[seat], seatBefore))) await g0.click('#ready').catch(() => {});
    await host.waitForFunction(() => Object.values(slamDebug.state.ready ?? {}).filter(Boolean).length === 2, null, { timeout: 10000 }).catch(() => {});

    await host.click('#start');
    const pages = [host, ...guests];
    const intoTurn = await play(pages, (x) => x.phase === 'turn', 60000);
    check('B private 3-player room starts', intoTurn.ok);

    // C2. the player whose turn is next drops for 5 s mid-match and comes back into the same match
    const mid = guests[1];
    const before = await st(mid);
    await mid.context().setOffline(true);
    await sleep(5000);
    await mid.context().setOffline(false);
    const rejoined = await mid.waitForFunction((code) => slamDebug.state?.code === code && slamDebug.state.phase !== 'lobby', before.code, { timeout: 20000 }).then(() => true).catch(() => false);
    check('C match: network back, same match', rejoined);
    await shot(mid, 'C2-after-drop');

    const r = await play(pages, (x) => x.phase === 'roundEnd' || x.phase === 'matchEnd' || x.round > 1);
    await shot(host, 'B2-round-end');
    check('B 3-player round plays to its end', r.ok, `slams=${r.slams}`);
    await closeAll(pages);
  }

  // ---------- D. the same room in two tabs ----------
  {
    const host = await player('Hai');
    await host.click('#create');
    await host.click('#create-go');
    await host.waitForSelector('#link', { timeout: 10000 });
    const room = await host.inputValue('#link');
    const tab1 = await player('Tab', { url: `${room}&debug&noftue` });
    await tab1.waitForSelector('#ready, #go', { timeout: 10000 });
    if (await tab1.$('#go')) await tab1.click('#go');
    await tab1.waitForSelector('#ready', { timeout: 10000 });
    const tab2 = await player('Tab', { ctx: tab1.context(), url: `${room}&debug&noftue` });
    await sleep(2500);
    // by design (main.js tokenKey): a second tab joins as a new player and the first keeps its seat
    const [n, s1, s2] = [(await st(host)).n, await st(tab1), await st(tab2)];
    await shot(tab2, 'D-second-tab');
    await shot(tab1, 'D-first-tab');
    check('D second tab joins as a new player, first tab keeps its seat', n === 3 && s1?.me && s2?.me && s1.me !== s2.me, `players=${n} ${s1?.me}/${s2?.me}`);
    await closeAll([host, tab1]);
  }

  // ---------- E. the server restarts under a lobby ----------
  {
    const host = await player('Em');
    await host.click('#create');
    await host.click('#create-go');
    await host.waitForSelector('#link', { timeout: 10000 });
    await stopServer();
    await sleep(1500);
    await shot(host, 'E1-server-down');
    await startServer();
    const home = await host.waitForSelector('#create', { timeout: 30000 }).then(() => true).catch(() => false);
    await shot(host, 'E2-after-restart');
    check('E server restart: page goes back home', home);
    if (home) {
      await host.click('#create');
      await host.click('#create-go');
      check('E a new room works after the restart', await host.waitForSelector('#link', { timeout: 10000 }).then(() => true).catch(() => false));
    }
    await closeAll([host]);
  }
} catch (err) {
  check('script', false, err.message.split('\n')[0]);
} finally {
  check('no page errors', errors.length === 0, errors.slice(0, 8).join(' | '));
  await browser.close();
  await stopServer();
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
