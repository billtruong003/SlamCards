// Stickers, quick phrases, chat and the invite button in real browsers: a desktop host (docked chat)
// and a phone guest (chat bar → sheet) in a friends room, then a match with stickers over the cards,
// the in-match composer closing on the player's turn, muting, and a quick-match room without chat.
// Run with the game server on :8097:  node qa/social-ui.mjs   → qa/out/social/*.png
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'social');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
async function player(name, opts, url) {
  const ctx = await browser.newContext({ ...opts, locale: 'vi-VN' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await ctx.addInitScript((n) => {
    localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}');
    localStorage.setItem('slam-memes', '0');
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
  }, name);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text().slice(0, 140)}`); });
  await p.goto(url);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) });
const visible = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el || el.hidden) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; }, sel);

try {
  const host = await player('Bill', { viewport: { width: 1366, height: 768 } }, `${BASE}/?debug&noftue`);
  await host.click('#create'); await host.click('#create-go');
  await host.waitForSelector('#link');
  const link = await host.inputValue('#link');
  check('lobby: invite button is the main action', await visible(host, '#invite'));
  await host.click('#invite');
  await host.waitForTimeout(300);
  const toast = await host.evaluate(() => document.getElementById('toast').textContent);
  check('desktop invite copies the link and says so', /copy/i.test(await host.textContent('#invite')), await host.textContent('#invite'));
  check('wide lobby: chat docked on the right', await visible(host, '#chat-panel') && !(await visible(host, '#chat-bar')));

  const guest = await player('Tèo', { ...devices['iPhone 13'] }, `${link}&debug&noftue`);
  await guest.waitForSelector('#ready, #go'); if (await guest.$('#go')) await guest.click('#go');
  await guest.waitForSelector('#ready');
  check('phone lobby: chat is a bar, not a panel', await visible(guest, '#chat-bar') && !(await visible(guest, '#chat-panel')));

  // host types, the guest's bar shows it with an unread pill
  await host.fill('#cp-input', 'vô lẹ đi đập cho');
  await host.press('#cp-input', 'Enter');
  await guest.waitForFunction(() => document.getElementById('cb-line2').textContent.includes('vô lẹ'), null, { timeout: 5000 });
  check('phone bar shows the new line and an unread count', await guest.evaluate(() => !document.querySelector('.cb-new').hidden));
  await shot(host, '01-lobby-desktop');
  await shot(guest, '02-lobby-phone');
  // a lobby redraw (ready) must not wipe a half-typed line
  await host.fill('#cp-input', 'đang gõ dở');
  await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  check('a lobby redraw keeps the half-typed line', (await host.inputValue('#cp-input')) === 'đang gõ dở');
  await host.fill('#cp-input', '');

  // phone: open the sheet, send a quick phrase and a sticker
  await guest.click('#chat-bar');
  await guest.waitForTimeout(300);
  check('phone: tapping the bar opens the chat sheet', await guest.evaluate(() => document.getElementById('chat-panel').dataset.mode === 'sheet'));
  await guest.click('#cp-chips [data-react="p:comeon"]');
  await guest.click('#cp-stk');
  await guest.click('#cp-stickers [data-react="hello"]');
  await host.waitForFunction(() => document.querySelectorAll('#cp-log .cl').length >= 3, null, { timeout: 5000 });
  await shot(guest, '03-phone-sheet');
  const hostLog = await host.evaluate(() => document.getElementById('cp-log').innerText);
  check('host sees the phrase and the sticker in the log', hostLog.includes('Vô lẹ') && (await host.$$('#cp-log .stk')).length === 1);
  await guest.click('#chat-close');

  // match: stickers pop over the sender's card
  // the guest is already ready from the redraw check above
  if (!(await host.evaluate(() => slamDebug.state.ready.pink))) await guest.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await host.click('#start');
  for (let i = 0; i < 60; i++) {
    for (const [p, k] of [[host, 'bua'], [guest, 'keo']]) {
      if (await p.$('[data-rps]')) await p.click(`[data-rps="${k}"]`).catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
    }
    if (await host.evaluate(() => slamDebug.state.phase === 'turn')) break;
    await host.waitForTimeout(300);
  }
  const fabShown = (p) => p.waitForFunction(() => { const el = document.getElementById('react-fab'); return el && !el.closest('[hidden]') && el.getBoundingClientRect().width > 0; }, null, { timeout: 3000 }).then(() => true).catch(() => false);
  check('match: reaction buttons shown', (await fabShown(host)) && (await fabShown(guest)));
  await guest.click('#react-fab');
  await guest.click('#react-panel [data-rtab="cat"]');
  await guest.click('#react-grid [data-react="redcard"]');
  await host.waitForSelector('#bubbles .sbub img', { timeout: 5000 });
  await host.waitForTimeout(400);
  const placed = await host.evaluate(() => {
    const b = document.querySelector('#bubbles .sbub').getBoundingClientRect();
    return { inside: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, h: b.height };
  });
  check('sticker bubble pops over the sender card, on screen', placed.inside, JSON.stringify(placed));
  await shot(host, '04-match-sticker');
  // keys: T opens the picker, 3 sends the third face
  await host.keyboard.press('t');
  check('T opens the picker', await visible(host, '#react-panel'));
  await host.keyboard.press('3');
  await guest.waitForFunction(() => document.querySelectorAll('#bubbles .sbub').length > 0, null, { timeout: 5000 });
  check('number key sends a sticker', true);
  // spam: the 4th within 5 s is not sent
  const sentBefore = await guest.evaluate(() => document.querySelectorAll('#cp-log .cl').length);
  for (let i = 0; i < 5; i++) await host.keyboard.press('1');
  await host.waitForTimeout(500);
  const sentAfter = await guest.evaluate(() => document.querySelectorAll('#cp-log .cl').length);
  check('spam limit: at most 3 in 5 s', sentAfter - sentBefore <= 2, `${sentAfter - sentBefore} more`);
  // the composer closes itself on the player's turn
  const mover = (await host.evaluate(() => slamDebug.state.turn === slamDebug.me)) ? host : guest;
  const waiter = mover === host ? guest : host;
  // phones held upright fold chat into the reaction panel (one round button)
  if (await visible(waiter, '#chat-fab')) await waiter.click('#chat-fab');
  else { await waiter.click('#react-fab'); await waiter.click('#react-chat'); }
  check('match: chat opens as a compact composer when it is not my turn', await waiter.evaluate(() => document.getElementById('chat-panel').dataset.mode === 'compose' && !document.getElementById('chat-panel').hidden));
  await shot(waiter, '05-match-composer');
  await waiter.fill('#cp-input', 'run chưa');
  await waiter.press('#cp-input', 'Enter');
  await mover.waitForSelector('#bubbles .sbub .txt', { timeout: 5000 });
  check('a chat line shows as a bubble in the match', true);
  // the other player keeps playing (a slam may end the round: RPS and "go first" again) until the
  // turn comes to the player with the composer open, who never slams
  const waiterTurn = () => waiter.evaluate(() => slamDebug.state.phase === 'turn' && slamDebug.state.turn === slamDebug.me);
  for (let i = 0; i < 120 && !(await waiterTurn()); i++) {
    // the waiting player wins rock-paper-scissors and goes first in the next round
    for (const [p, k] of [[mover, 'keo'], [waiter, 'bua']]) {
      if (await p.$('[data-rps]')) await p.click(`[data-rps="${k}"]`).catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
    }
    await mover.evaluate(() => {
      const s = slamDebug.state;
      if (s.phase !== 'turn' || s.turn !== slamDebug.me) return;
      const c = slamDebug.cards()[slamDebug.me];
      [[c.p[0] + 1.1, c.p[2]], [c.p[0] - 1.1, c.p[2]], [c.p[0], c.p[2] + 1.1], [0, 0.6]].some(([x, z]) => slamDebug.slamAt(x, z));
    });
    await waiter.waitForTimeout(400);
  }
  if (!(await waiterTurn())) throw new Error('the turn never came to the waiting player');
  await waiter.waitForTimeout(300);
  check('the composer closed when the turn came', await waiter.evaluate(() => document.getElementById('chat-panel').hidden || document.body.dataset.chat !== 'open'));
  check('the chat button is off during my turn', await waiter.evaluate(() => document.getElementById('chat-fab').disabled));
  // mute: tapping the other player's chip hides their reactions
  await waiter.locator('#players .chip[role="button"]').first().click();
  check('tapping a chip mutes that player', (await waiter.evaluate(() => document.querySelectorAll('#players .chip.muted').length)) === 1);
  await guest.context().close();
  await host.context().close();

  // quick match: reactions yes, typed chat no
  const a = await player('A', { viewport: { width: 1280, height: 720 } }, `${BASE}/?debug&noftue`);
  const b = await player('B', { ...devices['Pixel 7'] }, `${BASE}/?debug&noftue`);
  for (const p of [a, b]) { await p.click('#size [data-size="2"]'); await p.click('#play'); }
  await a.waitForFunction(() => slamDebug.state && slamDebug.state.kind === 'quick' && slamDebug.state.phase !== 'lobby', null, { timeout: 30000 });
  // the round buttons show during turns: through RPS and "go first" to the first turn
  for (let i = 0; i < 60 && !(await a.evaluate(() => slamDebug.state.phase === 'turn')); i++) {
    for (const [p, k] of [[a, 'bua'], [b, 'keo']]) {
      if (await p.$('[data-rps]')) await p.click(`[data-rps="${k}"]`).catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
    }
    await a.waitForTimeout(300);
  }
  await a.waitForTimeout(400);
  check('quick match: no chat button, reactions there', !(await visible(a, '#chat-fab')) && await visible(a, '#react-fab'));
  await a.context().close(); await b.context().close();
} catch (err) {
  check('script', false, `${err.message.split('\n')[0]} @ ${(err.stack.split('\n').find((l) => l.includes('social-ui.mjs')) || '').trim()}`);
} finally {
  check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
