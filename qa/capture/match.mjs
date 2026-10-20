// The story match, filmed: Bill makes a room and invites Tèo, they trade chat lines in the lobby, rock-paper-scissors,
// then three rounds: Bill takes Tèo's card, Bill gloats "Run chưa?" and slams his own card off the table, Tèo takes Bill's
// card and the match; Tèo teases him in chat, Bill hits rematch. The two story slams (the capture, the fall) are posed
// with slamDebug.place and then slammed for real (the server judges them); every other slam is plain play.
//   MODE=phone   Bill on a phone (touch aiming)                         → qa/out/film/phone-match/
//   MODE=desktop Bill on a 1920x1080 screen (mouse), Tèo's phone filmed too → qa/out/film/desktop-match/{host,guest}
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, PHONE, DESKTOP, sleep, SLOW, LANG, SUFFIX, state, record, touchDrag, tap, screenOf, roomLink, where } from './rec.mjs';

const MODE = process.env.MODE || 'phone';
const PH = MODE === 'phone';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'film', `${MODE}-match${SUFFIX}`);
// the chat lines, in the language filmed
const LINES = LANG === 'vi'
  ? ['ê còn nhớ vụ t ăn hình m hông =))', 'nhớ chớ. vô đây t trả thù', 'y chang hồi xưa =))']
  : ['remember when i took your card lol', 'oh i remember. get in, revenge time', 'just like old times lol'];
const browser = await launch();
let rec, grec;
try {
  const host = await player(browser, 'bill', PH ? PHONE : DESKTOP);
  rec = await record(host, PH ? ROOT : path.join(ROOT, 'host'));
  // every mark carries where the cards are on Bill's screen (0..1), for the edit to frame the action
  const mark = async (label, extra = {}) => rec.mark(label, { ...extra, pos: await where(host).catch(() => null) });
  await sleep(1800); await mark('home');
  await tap(host, '#create', PH); await sleep(700); await tap(host, '#create-go', PH);
  await host.waitForSelector('#invite'); await sleep(1400);
  await mark('invite'); await tap(host, '#invite', PH); await sleep(1600);
  const link = await roomLink(host);
  const guest = await player(browser, 'teo', PH ? { viewport: { width: 480, height: 360 } } : PHONE, { url: `${link}&debug&noftue&clean` });
  if (!PH) grec = await record(guest, path.join(ROOT, 'guest'));
  await guest.waitForSelector('#ready, #go'); if (await guest.$('#go')) await tap(guest, '#go', !PH);
  await guest.waitForSelector('#ready'); await mark('join'); await sleep(1800);

  const say = async (p, touch, text, label) => {
    if (!(await p.isVisible('#cp-input'))) await tap(p, '#chat-bar', touch);
    await p.waitForSelector('#cp-input', { state: 'visible' });
    await p.focus('#cp-input'); await p.keyboard.type(text, { delay: 55 });
    await p.keyboard.press('Enter'); await mark(label); await (grec?.mark(label));
  };
  const close = async (p, touch) => { if (await p.isVisible('#chat-close')) await tap(p, '#chat-close', touch).catch(() => {}); };
  // Bill has the chat open when Tèo's line comes in, so it arrives big in the real chat
  if (PH) { await tap(host, '#chat-bar', PH); await mark('chat-open'); await sleep(1300); }
  await say(guest, !PH, LINES[0], 'chat-teo'); await sleep(1800);
  await say(host, PH, LINES[1], 'chat-bill'); await sleep(1500);
  await close(host, PH); await close(guest, !PH);
  await tap(guest, '#ready', !PH); await mark('ready'); await sleep(1500);
  await tap(host, '#start', PH); await mark('start');
  for (const p of [host, guest]) await p.evaluate(() => document.body.classList.add('film-match'));

  // --- helpers for the match
  const seatOf = (p) => p.evaluate(() => slamDebug.me);
  const bill = await seatOf(host); const teo = await seatOf(guest);
  const until = async (cond, ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms / SLOW) {
      const s = await state(host);
      if (await cond(s)) return s;
      if (await host.$('[data-rps]')) { await sleep(900); await tap(host, '[data-rps="bua"]', PH).catch(() => {}); await mark('rps'); }
      if (await guest.$('[data-rps]')) await guest.click('[data-rps="keo"]').catch(() => {});
      if (await host.$('#first')) { await sleep(1000); await tap(host, '#first', PH).catch(() => {}); await mark('first'); }
      if (await guest.$('#first')) await guest.click('#first').catch(() => {});
      await sleep(250);
    }
    throw new Error('waited too long');
  };
  const turnOf = (seat) => until((s) => s.phase === 'turn' && s.turn === seat);
  const settled = (seat) => until((s) => !(s.phase === 'turn' && s.turn === seat) && s.phase !== 'anim');
  const myCard = (p) => p.evaluate(() => slamDebug.cards()[slamDebug.me].p);
  // Bill aims like a player: a finger dragged to the spot (phone) or the mouse gliding there and clicking (desktop)
  const billSlam = async (x, z, label) => {
    const to = await screenOf(host, x, z);
    const vp = host.viewportSize();
    const from = await screenOf(host, x + 0.7, z - 0.5);
    await mark(label, { aim: [+(to.x / vp.width).toFixed(3), +(to.y / vp.height).toFixed(3)] });
    if (PH) await touchDrag(host, rec.cdp, from, to, 750);
    else {
      await host.mouse.move(from.x, from.y); const n = 30;
      for (let i = 1; i <= n; i++) { const k = 1 - (1 - i / n) ** 2; await host.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k); await sleep(22); }
      await sleep(350); await host.mouse.click(to.x, to.y);
    }
  };
  const billPlain = async () => {
    await turnOf(bill); await sleep(1200);
    const c = await myCard(host); const dir = c[0] > 0 ? -1 : 1;
    await billSlam(c[0] + dir * 1.75, c[2] + 0.45, 'slam-bill');
    await settled(bill);
  };
  const teoPlain = async (before) => {
    await turnOf(teo); await sleep(900);
    if (before) await before();
    await guest.evaluate(() => { const c = slamDebug.cards()[slamDebug.me].p; const d = c[0] > 0 ? -1 : 1; return [[d * 1.75, 0.4], [d * 1.7, -0.4], [0, 1.8]].some(([dx, dz]) => slamDebug.slamAt(c[0] + dx, c[2] + dz)); });
    await mark('slam-teo'); await settled(teo);
  };
  // Posed slams keep the slammer's card where the server has it (the server checks the reach from there) and only
  // move the other card: for a capture it waits 1.45 further in, for a fall it is out of the way. d points inwards.
  const pose = (p, kind) => p.evaluate((kind) => {
    const cards = slamDebug.cards(); const me = slamDebug.me;
    const them = Object.keys(cards).find((k) => k !== me && cards[k].p[1] > -10);
    const a = cards[me].p; const d = a[0] > 0 ? -1 : 1;
    cards[me] = { p: [a[0], 0.008, a[2]], q: [0, 0, 1, 0] };
    cards[them] = { p: kind === 'capture' ? [a[0] + d * 1.45, 0.008, a[2]] : [a[0] + d * 3.2, 0.008, a[2] - 1.2], q: [0, 0, 1, 0] };
    slamDebug.place(cards);
    return kind === 'capture' ? [a[0] - d * 1.33, a[2]] : [a[0] + d * 0.9, a[2]];
  }, kind);
  const react = async (p, touch, tab, id, label) => {
    await tap(p, '#react-fab', touch).catch(() => {}); await sleep(500);
    await tap(p, `#react-panel [data-rtab="${tab}"]`, touch).catch(() => {}); await sleep(400);
    await tap(p, `#react-grid [data-react="${id}"]`, touch).catch(() => {}); await mark(label);
  };

  // --- round 1: a plain exchange, Tèo's red card, Bill takes Tèo's card
  await until((s) => s.phase === 'turn');
  if ((await state(host)).turn === teo) await teoPlain();
  await billPlain();
  await teoPlain(() => react(guest, !PH, 'phrase', 'p:comeon', 'phrase-teo'));
  // a posed slam until it lands (the game's hand shake makes it miss now and then); the friend plays in between
  const story = async (who, kind, label) => {
    for (let n = 0; n < 5; n++) {
      await turnOf(who === 'bill' ? bill : teo); await sleep(700);
      const at = await pose(who === 'bill' ? host : guest, kind); await sleep(1300);
      if (who === 'bill') await billSlam(at[0], at[1], label);
      else { await guest.evaluate((a) => slamDebug.slamAt(a[0], a[1]), at); await mark(label); }
      const s = await until((s) => s.phase === 'roundEnd' || s.phase === 'matchEnd' || (s.phase === 'turn' && s.turn !== (who === 'bill' ? bill : teo)));
      if (s.phase !== 'turn') return s;
      await mark(label + '-missed');
      if (who === 'bill') await teoPlain(); else await billPlain();
    }
    throw new Error(kind + ' never landed');
  };
  await story('bill', 'capture', 'slam-capture'); await mark('round1-end', { reason: (await state(host)).reason });
  // --- round 2: Bill gloats, then slams his own card off the table
  await until((s) => s.phase === 'turn');
  if ((await state(host)).turn === teo) await teoPlain(() => react(host, PH, 'phrase', 'p:scared', 'run-chua'));
  await billPlain();
  await teoPlain(() => react(host, PH, 'phrase', 'p:scared', 'run-chua'));
  await story('bill', 'fall', 'slam-fall'); await mark('round2-end', { reason: (await state(host)).reason });
  // --- round 3: Tèo takes Bill's card and the match
  await until((s) => s.phase === 'turn');
  if ((await state(host)).turn === bill) await billPlain();
  await story('teo', 'capture', 'teo-capture');
  await until((s) => s.phase === 'matchEnd'); await mark('match-end', { phase: (await state(host)).phase, reason: (await state(host)).reason });
  await sleep(2500);
  await say(guest, !PH, LINES[2], 'chat-teo-2').catch((e) => console.log('   chat at the end:', e.message.split('\n')[0]));
  await sleep(2000);
  await tap(host, '#rematch', PH).catch(() => {}); await mark('rematch'); await sleep(2500);
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  if (rec) await rec.stop();
  if (grec) await grec.stop();
  await browser.close();
}
