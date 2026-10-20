// Footage recorder for the launch videos: real matches played by scripted players, filmed frame by frame.
// record() streams the page through the DevTools screencast (JPEG, every frame the compositor makes, wall-clock
// timestamps); the init script logs every sound the game starts (the thump, chimes, memes, music), so the edit can
// put the mixed SFX on the exact frame the game made them. assemble.py turns a take into a 60 fps MP4 + events.json.
// SLOW=0.25 runs the game at a quarter speed while filming (its clock, timers, frames and CSS animations): the
// screencast only manages ~25 frames a second, so slowed down it catches every frame; times are kept in game time.
// The browser runs muted (--mute-audio): the game plays its sounds normally, nobody hears them.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
export const SLOW = Number(process.env.SLOW || 1);
// LANG=en films the game in English (the global cut); takes go to <name>-en folders
export const LANG = process.env.LANG_UI || 'vi';
export const SUFFIX = LANG === 'vi' ? '' : `-${LANG}`;
// waits are in game time: a script paces itself the same at any SLOW
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SLOW));

export const LOOKS = {
  bill: { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' },
  teo: { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' },
  ti: { pet: 'chick', dep: 'dep_to_ong', depColors: ['#ffc93c'], cardColor: 'vang' },
  bu: { pet: 'fox', dep: 'dep_lao', depColors: ['#2a1418', '#3ccf6e'], cardColor: 'la' },
};
export const PHONE = { viewport: { width: 360, height: 640 }, deviceScaleFactor: Number(process.env.DPR || 4), isMobile: true, hasTouch: true };
export const DESKTOP = { viewport: { width: 1920, height: 1080 } };

export function launch() {
  return chromium.launch({
    channel: 'chromium',
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  });
}

// Runs in the page before anything else: the game's clock at SLOW speed (performance.now, Date.now, the frame
// timestamps, timers), so physics, tweens and waits all run slowed together.
function slowClock(k) {
  if (k === 1) return;
  const rNow = performance.now.bind(performance); const base = rNow();
  const dNow = Date.now; const dBase = dNow();
  window.__slow = { k, base };
  performance.now = () => base + (rNow() - base) * k;
  Date.now = () => dBase + (dNow() - dBase) * k;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()));
  const st = window.setTimeout.bind(window); const si = window.setInterval.bind(window);
  window.setTimeout = (fn, ms = 0, ...a) => st(fn, ms / k, ...a);
  window.setInterval = (fn, ms = 0, ...a) => si(fn, ms / k, ...a);
}

// CSS animations and transitions at the same speed (DevTools: the document timeline's playback rate)
async function slowCss(page) {
  if (SLOW === 1) return;
  const s = await page.context().newCDPSession(page);
  await s.send('Animation.enable');
  await s.send('Animation.setPlaybackRate', { playbackRate: SLOW });
}

// Runs in the page before the game: remembers which URL each decoded buffer came from, and logs every start().
function soundLog() {
  const ev = (window.__ev = []);
  const now = () => performance.timeOrigin + performance.now();
  const urlOf = new WeakMap();
  const fetch0 = window.fetch;
  window.fetch = async (...a) => {
    const r = await fetch0(...a);
    const url = String(a[0]);
    const ab = r.arrayBuffer.bind(r);
    r.arrayBuffer = async () => { const b = await ab(); urlOf.set(b, url); return b; };
    return r;
  };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const dec = AC.prototype.decodeAudioData;
    AC.prototype.decodeAudioData = function (data, ...rest) {
      const url = urlOf.get(data);
      return dec.call(this, data, ...rest).then((buf) => { if (url) urlOf.set(buf, url); return buf; });
    };
  }
  const bs = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    const url = this.buffer && urlOf.get(this.buffer);
    ev.push({ t: now(), kind: url ? 'clip' : 'thump', url: url || null, dur: this.buffer ? this.buffer.duration : 0 });
    return bs.apply(this, a);
  };
  const os = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (...a) {
    ev.push({ t: now(), kind: 'tone', hz: this.frequency.value, at: a[0] || 0 });
    return os.apply(this, a);
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    ev.push({ t: now(), kind: 'music', url: this.src });
    return play.call(this);
  };
}

export async function player(browser, who, opts, { url = `${BASE}/?debug&noftue&clean`, name } = {}) {
  const ctx = await browser.newContext({ ...opts, locale: LANG === 'vi' ? 'vi-VN' : 'en-US' });
  await ctx.addInitScript(slowClock, SLOW);
  await ctx.addInitScript(([n, l, vol, lang]) => {
    localStorage.setItem('slam-lang', lang);
    localStorage.setItem('slam-volume', vol);
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
    localStorage.setItem('slam-look', JSON.stringify(l));
    // filmed without the meme pictures (other people's art); the edit adds the sounds back
    localStorage.setItem('slam-memes', '0');
    // the film look: no corner buttons and no status line; the sticker panel and the round buttons are there to
    // press but not seen; in a match (body.film-match) the folded chat bar goes too, so nothing gets cut at the frame edge
    const css = document.createElement('style');
    css.textContent = '#corner,#hint{visibility:hidden!important}#react-panel,#social-fabs{opacity:0!important}'
      + 'body.film-match #chat-bar,body.film-match #toggle,body.film-match #hud{opacity:0!important}';
    const addCss = () => (document.head || document.documentElement).appendChild(css);
    if (document.documentElement) addCss(); else document.addEventListener('DOMContentLoaded', addCss);
    // the room link shows the live address, as players see it (the real one is kept for the friend to join)
    setInterval(() => {
      const el = document.getElementById('link');
      if (el && el.value && !el.value.startsWith('https://billthedevstudio')) {
        el.dataset.real = el.value;
        el.value = el.value.replace(/^https?:\/\/[^/]+\/(\?|$)/, 'https://billthedevstudio.io.vn/slam-cards/$1');
      }
    }, 50);
    localStorage.setItem('slam-ftue', 'seen');
    localStorage.setItem('slam-name', n);
    localStorage.setItem('slam-look', JSON.stringify(l));
  }, [name || (LANG === 'vi' ? { bill: 'Bill', teo: 'Tèo', ti: 'Tí', bu: 'Bé Bự' } : { bill: 'Bill', teo: 'Teo', ti: 'Tee', bu: 'Bu' })[who], LOOKS[who], process.env.VOL || '{"music":0.8,"meme":1,"sfx":1}', LANG]);
  await ctx.addInitScript(soundLog);
  const p = await ctx.newPage();
  await slowCss(p);
  await p.goto(url);
  await slowCss(p);
  await p.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  await p.evaluate(() => document.getElementById('intro')?.remove());
  return p;
}

// Starts filming a page into dir/frames; returns stop(), which writes dir/take.json (frames, sounds, marks).
export async function record(page, dir) {
  fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const marks = [];
  let n = 0;
  // frame times are wall clock: turned into the page's (slowed) game time, like the sounds and marks
  const clock = await page.evaluate(() => ({ origin: performance.timeOrigin, base: window.__slow ? window.__slow.base : 0, k: window.__slow ? window.__slow.k : 1 }));
  const gameTime = (wall) => clock.origin + clock.base + (wall - clock.origin - clock.base) * clock.k;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = `f${String(n++).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, 'frames', file), Buffer.from(data, 'base64'));
    frames.push({ t: gameTime(metadata.timestamp * 1000), file });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const vp = page.viewportSize();
  const dpr = await page.evaluate(() => devicePixelRatio);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: Math.round(vp.width * dpr), maxHeight: Math.round(vp.height * dpr), everyNthFrame: 1 });
  const t0 = await page.evaluate(() => performance.timeOrigin + performance.now());
  await page.evaluate(() => { window.__ev.length = 0; });
  return {
    cdp,
    mark: async (label, extra = {}) => {
      const t = await page.evaluate(() => performance.timeOrigin + performance.now());
      marks.push({ t, label, ...extra });
      console.log('   mark', label);
    },
    stop: async () => {
      await cdp.send('Page.stopScreencast').catch(() => {});
      await sleep(300);
      const sounds = await page.evaluate(() => window.__ev);
      fs.writeFileSync(path.join(dir, 'take.json'), JSON.stringify({ t0, size: [Math.round(vp.width * dpr), Math.round(vp.height * dpr)], frames, sounds, marks }, null, 1));
      console.log(`  ${dir}: ${frames.length} frames, ${sounds.length} sounds, ${marks.length} marks`);
    },
  };
}

// A finger on a touch screen: press, drag along the way, lift (the game aims while the finger is down).
export async function touchDrag(page, cdp, from, to, ms = 700) {
  const steps = Math.max(2, Math.round(ms / 16));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  for (let i = 1; i <= steps; i++) {
    const k = i / steps; const e = 1 - (1 - k) ** 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }] });
    await sleep(ms / steps);
  }
  await sleep(250);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

export async function tap(page, sel, touch) {
  await page.waitForSelector(sel, { state: 'visible' });
  if (touch) await page.tap(sel); else await page.click(sel);
}

// The room link to join with (the field shows the live address).
export const roomLink = (page) => page.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });

// Where the cards are on the filmed screen, 0..1 (for the edit to frame the action).
export const where = (page) => page.evaluate(() => {
  const out = {}; const vw = innerWidth; const vh = innerHeight;
  for (const [seat, c] of Object.entries(slamDebug.cards())) {
    if (c.p[1] < -10) continue; const o = {}; slamDebug.world.toScreen(c.p[0], 0, c.p[2], o);
    out[seat === slamDebug.me ? 'me' : seat] = [+(o.x / vw).toFixed(3), +(o.y / vh).toFixed(3)];
  }
  return out;
});

// Screen point of a spot on the table, in CSS pixels.
export const screenOf = (page, x, z) => page.evaluate(([x, z]) => { const o = {}; slamDebug.world.toScreen(x, 0, z, o); return o; }, [x, z]);
export const state = (page) => page.evaluate(() => ({ phase: slamDebug.state.phase, turn: slamDebug.state.turn, me: slamDebug.me, reason: slamDebug.state.result?.reason, ev: slamDebug.state.event?.type }));

// Rock-paper-scissors and "go first" for everyone, until the first turn starts.
export async function toFirstTurn(host, pages, picks = ['bua', 'keo', 'bao', 'keo']) {
  for (let i = 0; i < 200; i++) {
    const s = await state(host);
    if (s.phase === 'turn') return;
    for (const [j, p] of pages.entries()) {
      if (await p.$('[data-rps]')) await p.click(`[data-rps="${picks[j]}"]`).catch(() => {});
      if (await p.$('#first')) await p.click('#first').catch(() => {});
    }
    await sleep(300);
  }
}
