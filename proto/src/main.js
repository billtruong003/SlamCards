import * as THREE from 'three';
import { World } from './world.js';
import { Visuals } from './visuals.js';
import { TUNE } from './config.js';
import { SEATS, ROUNDS_TO_WIN, FALL_Y, MAX_PLAYERS, seededRandom } from './rules.js';
import { thump, chime } from './sound.js';
import { playMusic, refreshMusic } from './music.js';
import { getLevel, setLevel, setMuted } from './audio.js';
import { mountMenuBackground } from './menu-bg.js';
import { playIntro } from './intro.js';
import { loadDeps, depModel, depModelFor, DEFAULT_DEP } from './deps.js';
import { PETS, DEP_IDS, CARD_COLORS, SEAT_DEFAULTS, cleanLook } from './catalog.js';
import { renderWardrobe, gearTiles, petThumb, stopPreview } from './wardrobe.js';
import { showMeme, preloadMemes, setMemesEnabled, memesEnabled } from './memes.js';
import { createFtue } from './ftue.js';
import { createSocial } from './social.js';
import { t, has, detectLang, loadLang, setLang, lang, availableLangs, applyStatic } from './i18n.js';
import { helloMessage } from './ref.js';
import { createAds } from './ads.js';

const $ = (id) => document.getElementById(id);
const els = {
  hud: $('hud'), players: $('players'), banner: $('banner'), hint: $('hint'), toggle: $('toggle'),
  overlay: $('overlay'), labels: $('labels'), toast: $('toast'), windArrow: $('wind-arrow'),
  windText: $('wind-text'), windBars: $('wind-bars'), wind: $('wind'), flat: $('type-flat'), tilt: $('type-tilt'),
  ping: $('ping'), fps: $('fps'), settings: $('settings'), panel: $('sound-panel'),
  info: $('info'), infoPanel: $('info-panel'),
};

async function copyText(text, field) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    field.select();
    return document.execCommand('copy');
  }
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// The game could not start. Without WebGL it is the browser's 3D (in-app browsers and old phones turn
// it off); with WebGL it is a file that did not load (the physics engine), which a reload can fix.
const hasWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch { return false; }
};
function showFatal() {
  const noGl = !hasWebGL();
  els.overlay.className = '';
  els.overlay.innerHTML = `
    <div class="menu-bg"><div class="panel menu-card">
      <h1 class="stamp title fatal-title">${escapeHtml(t('fatal.title'))}</h1>
      <p class="sub">${escapeHtml(t(noGl ? 'fatal.body' : 'fatal.loadBody'))}</p>
      ${noGl ? '' : `<button class="btn pri" id="fatal-reload">${escapeHtml(t('common.reload'))}</button>`}
    </div></div>`;
  if (!noGl) $('fatal-reload').onclick = () => location.reload();
}

// Off (no script, no change) unless the server set an AdSense id; see ads.js for when an ad may show.
const ads = createAds({ doc: document, storage: (() => { try { return localStorage; } catch { return null; } })(), search: location.search, mute: setMuted });
if (ads.enabled) ads.preroll();

await loadLang(detectLang());
document.title = t('menu.title');
applyStatic();
$('info-by').innerHTML = t('info.by', { name: '<b>BillTheDev</b>' });
for (const id of ['credit', 'info-credit']) $(id).textContent = t('info.cardArt', { name: 'Dani Maccari' });
$('info-pets').textContent = t('info.petArt', { name: 'Kenney (CC0)' });
// the game idea came from ThuanBui (David)
$('info-idea').innerHTML = t('info.idea', { name: '<a href="https://www.linkedin.com/in/thuaniub1203/" target="_blank" rel="noopener">ThuanBui (David)</a>' });
els.windText.textContent = t('hud.wind', { n: 0 });

// Language: a small globe button in the corner (short code only, so it fits beside ?/Info/Sound on
// phones) opening a panel of native names. Shown once a second language ships; picking reloads.
const LANG_SHORT = { 'zh-Hans': '简', 'zh-Hant': '繁', 'pt-BR': 'PT' };
const GLOBE = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c2 2 2.8 4.2 2.8 6.5S10 12.5 8 14.5M8 1.5C6 3.5 5.2 5.7 5.2 8S6 12.5 8 14.5"/></svg>';
const CROWN = '<svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M1 10 L2 3 L5 6 L7 1.5 L9 6 L12 3 L13 10 Z"/></svg>';
const LOCK = '<svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="1.5" y="6" width="9" height="7" rx="1.5"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"/></svg>';
const PEOPLE = '<svg width="16" height="13" viewBox="0 0 16 13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="6" cy="4" r="2.5"/><path d="M1.5 12c0-2.6 2-4.3 4.5-4.3s4.5 1.7 4.5 4.3"/><path d="M10.5 1.8a2.4 2.4 0 0 1 0 4.5M12.5 8.2c1.2.6 2 1.9 2 3.8"/></svg>';
const visIcon = (v) => (v === 'public' ? GLOBE : LOCK);
const CHECK = '<svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 5.5 L4.5 8.5 L10.5 1.5"/></svg>';
const langs = availableLangs();
const langPanel = $('lang-panel');
if (langs.length > 1) {
  const btn = $('lang');
  btn.innerHTML = `${GLOBE}<span>${LANG_SHORT[lang()] ?? lang().toUpperCase()}</span>`;
  btn.hidden = false;
  langPanel.innerHTML = `
    <h2>${t('corner.lang')}</h2>
    <div class="lang-list">${langs.map((l) => `<button class="btn" lang="${l.code}" data-lang="${l.code}" aria-pressed="${l.code === lang()}">${escapeHtml(l.name)}</button>`).join('')}</div>
    <button class="btn" id="close-lang">${t('common.close')}</button>`;
  langPanel.querySelectorAll('[data-lang]').forEach((b) => { b.onclick = () => (b.dataset.lang === lang() ? (langPanel.hidden = true) : setLang(b.dataset.lang)); });
  $('close-lang').onclick = () => { langPanel.hidden = true; };
}

playIntro();
let world;
try {
  world = await World.create($('stage'));
} catch (err) {
  console.error('3D setup failed', err);
  window.slamBooted = true;
  showFatal();
  throw err;
}
window.slamBooted = true;
// The GPU can drop the 3D context (a phone short on memory, a driver reset). three.js takes it back
// when the browser restores it; if that has not happened in a few seconds the table would stay
// frozen, so offer a reload, which rejoins the room by its saved token.
{
  let lostTimer = 0;
  const canvas = world.renderer.domElement;
  canvas.addEventListener('webglcontextlost', () => {
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => { $('gl-lost').hidden = false; }, 5000);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    clearTimeout(lostTimer);
    $('gl-lost').hidden = true;
  });
  $('gl-lost-reload').onclick = () => location.reload();
}
// On a slow connection the 20 s "still loading?" card (index.html) can show just before boot
// finishes; it would then sit on top of the menu and block it.
$('boot-fail').hidden = true;
const visuals = new Visuals(world.scene);
const MENU_CARDS = {
  black: { p: [-4.5, 0.008, 0], q: [0, 0, 1, 0] },
  pink: { p: [4.5, 0.008, 0], q: [0, 0, 1, 0] },
};

let ws = null;
let me = null;
let roomCode = new URLSearchParams(location.search).get('room')?.toUpperCase() || null;
// ?clean: for recording videos, no ping/fps line and no small credit in the corner
if (new URLSearchParams(location.search).has('clean')) document.body.classList.add('clean');
let state = null;
let stateAt = 0;
let slamType = 'flat';
let pointer = null;
let sim = null;
let playback = null;
let awaitingServer = false;
let appliedCardsKey = '';
let overlayKey = '';
let hudKey = '';
let lastWindKey = '';
let lastEventKey = '';
let pointerMoved = false;
let lastPong = performance.now();
let pingMs = 0;
let memeEventKey = '';
let memePhaseKey = '';
let flippedRound = 0;
let lastSlamStats = null;
let memesPreloaded = false;
let queueing = null;      // { size, since } while waiting for a quick match
let roomsTimer = 0;
let roomsFilter = 'all';
let roomsList = null;

const TOUCH = matchMedia('(pointer: coarse)').matches;
// the key hint is its own span so narrow screens can drop it (no room next to the reaction button)
els.flat.innerHTML = TOUCH ? t('turn.flat') : `${t('turn.flat')}<span class="keyhint"> · Q</span>`;
els.tilt.innerHTML = TOUCH ? t('turn.tilt') : `${t('turn.tilt')}<span class="keyhint"> · E</span>`;
const ftue = createFtue({
  send,
  track: (name) => send({ t: 'event', name }),
  world,
  touch: TOUCH,
  toastVisible: () => !els.toast.hidden,
  hidePanels: () => {
    els.panel.hidden = true;
    els.infoPanel.hidden = true;
    langPanel.hidden = true;
  },
});
const RPS_ICON = { bua: '✊', keo: '✌️', bao: '✋' };
const seatLabel = (seat) => t(`color.${cardColorOf(seat)}`);
const list = (items) => items.join(t('common.listSep'));

const nameOf = (seat) => state?.players[seat]?.name || seatLabel(seat);
const htmlName = (seat) => `<b class="seat-${seat}">${escapeHtml(nameOf(seat))}</b>`;
const opponentsOf = (seat) => (state?.alive ?? []).filter((s) => s !== seat);

const store = (area) => ({
  get(key) { try { return area().getItem(key); } catch { return null; } },
  set(key, value) { try { area().setItem(key, value); } catch { /* private mode */ } },
  remove(key) { try { area().removeItem(key); } catch { /* private mode */ } },
});
const tabStore = store(() => sessionStorage);
const deviceStore = store(() => localStorage);

// The seat token lives in this tab and on the device, so closing the tab and reopening the link
// gets the seat back. Another tab already playing in that room keeps it: a second tab opened to
// play against yourself joins as a new player instead of kicking the first one out.
const tokenKey = (code) => `slam-token-${code}`;
const tabs = 'BroadcastChannel' in window ? new BroadcastChannel('slam-tabs') : null;
if (tabs) {
  tabs.onmessage = (e) => {
    if (e.data?.ask && e.data.ask === roomCode && me) tabs.postMessage({ have: roomCode });
  };
}
function anotherTabHas(code) {
  if (!tabs) return Promise.resolve(false);
  return new Promise((resolve) => {
    const listener = (e) => { if (e.data?.have === code) done(true); };
    const done = (answer) => {
      tabs.removeEventListener('message', listener);
      clearTimeout(timer);
      resolve(answer);
    };
    const timer = setTimeout(() => done(false), 250);
    tabs.addEventListener('message', listener);
    tabs.postMessage({ ask: code });
  });
}
async function tokenFor(code) {
  const own = tabStore.get(tokenKey(code));
  if (own) return own;
  const shared = deviceStore.get(tokenKey(code));
  if (!shared) return null;
  return (await anotherTabHas(code)) ? null : shared;
}
// Only the last few rooms keep a token on the device; older ones are dead anyway (QA-04).
const KEEP_TOKENS = 5;
function saveToken(code, token) {
  tabStore.set(tokenKey(code), token);
  deviceStore.set(tokenKey(code), token);
  let recent = [];
  try { recent = JSON.parse(deviceStore.get('slam-rooms') || '[]'); } catch { /* bad value */ }
  recent = [code, ...recent.filter((c) => c !== code)];
  for (const old of recent.slice(KEEP_TOKENS)) deviceStore.remove(tokenKey(old));
  deviceStore.set('slam-rooms', JSON.stringify(recent.slice(0, KEEP_TOKENS)));
}
function forgetToken(code) {
  tabStore.remove(tokenKey(code));
  deviceStore.remove(tokenKey(code));
}

const playerName = {
  get: () => { try { return localStorage.getItem('slam-name') || ''; } catch { return ''; } },
  set: (name) => { try { localStorage.setItem('slam-name', name); } catch { /* private mode */ } },
};

// What this player wears (catalog.js): kept on the device, sent with create / join / queue.
// The server fills in what is missing (seat defaults) and keeps card colours unique per room.
const playerLook = {
  get() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('slam-look') || '{}'); } catch { /* bad value */ }
    let dep = saved.dep;
    try { dep ??= localStorage.getItem('slam-dep') || undefined; } catch { /* private mode */ }
    const look = cleanLook({ ...saved, dep });
    return { ...look, pet: look.pet ?? 'cat', cardColor: look.cardColor ?? 'hong' };
  },
  set(look) {
    try { localStorage.setItem('slam-look', JSON.stringify(cleanLook(look))); } catch { /* private mode */ }
  },
};
const playerDep = { get: () => playerLook.get().dep };
const SIZES = ['any', 2, 3, 4];
const playerSize = {
  get: () => { try { const v = localStorage.getItem('slam-size'); return v === 'any' || !v ? 'any' : Number(v); } catch { return 'any'; } },
  set: (size) => { try { localStorage.setItem('slam-size', String(size)); } catch { /* private mode */ } },
};
const depOf = (seat) => state?.players[seat]?.dep ?? DEFAULT_DEP[seat];
const depColorsOf = (seat) => state?.players[seat]?.depColors;
const cardColorOf = (seat) => state?.players[seat]?.cardColor ?? SEAT_DEFAULTS[seat]?.cardColor ?? 'hong';
const petOf = (seat) => state?.players[seat]?.pet ?? SEAT_DEFAULTS[seat]?.pet ?? 'cat';

function joinRoom(code, token) {
  roomCode = code;
  send({ t: 'join', code, token: token ?? undefined, name: playerName.get() || t('menu.defaultName'), look: playerLook.get() });
}

// An invite link (or a reconnect) first asks whether the room is still there and whether this
// device already has a seat in it, so nobody types a name for a room that is gone.
let pendingPeek = null;
async function openRoom(code, typed = false) {
  const token = await tokenFor(code);
  const peek = { code, token, typed };
  pendingPeek = peek;
  send({ t: 'peek', code, token: token ?? undefined });
  // A server from before `peek` never answers (client and server out of step during a deploy):
  // after 5 s go ahead and join; the join itself still reports a missing or full room (QA-03).
  setTimeout(() => {
    if (pendingPeek !== peek) return;
    pendingPeek = null;
    if (token || playerName.get()) joinRoom(code, token);
    else renderNamePrompt(code);
  }, 5000);
}

function onPeek(msg) {
  if (!pendingPeek || msg.code !== pendingPeek.code) return;
  const { code, token, typed } = pendingPeek;
  pendingPeek = null;
  const refuse = (text) => {
    forgetToken(code);
    leaveRoom();
    renderMenu(text);
  };
  // a typed code that matches nothing is most likely a typo, not an expired room (QA-02);
  // right after an update, the update is why the room is gone
  const gone = restartNotice ? 'error.serverRestarted' : typed ? 'error.typedNotFound' : 'error.roomGone';
  restartNotice = false;
  if (!msg.exists) refuse(t(gone, { code }));
  else if (msg.mine) joinRoom(code, token);
  else if (msg.phase !== 'lobby' || msg.quick) refuse(t('error.inMatchWait', { code })); // UX-08: say when to come back
  else if (msg.full) refuse(t('error.full'));
  else if (playerName.get()) joinRoom(code, null);
  else renderNamePrompt(code);
}

// Back to a clean menu: no room, no leftover HUD, labels or toasts from the last match.
function leaveRoom() {
  social.closeAll();
  $('leave').hidden = true;
  disarmLeave();
  state = null;
  me = null;
  roomCode = null;
  pendingPeek = null;
  sim = null;
  pendingSlam = null;
  playback = null;
  awaitingServer = false;
  appliedCardsKey = '';
  overlayKey = '';
  hudKey = '';
  history.replaceState(null, '', location.pathname);
  els.hud.hidden = true;
  els.banner.hidden = true;
  els.hint.hidden = true;
  els.toggle.hidden = true;
  for (const badge of els.labels.children) badge.hidden = true;
  hideToast();
  visuals.hideAim();
  world.setup(['black', 'pink']);
  world.setCards(MENU_CARDS);
  world.needsRender = true;
  ftue.leaveRoom();
}

// ---------- sound settings ----------

const SLIDERS = ['music', 'meme', 'sfx'];
els.panel.innerHTML = `
  <h2>${t('sound.title')}</h2>
  ${SLIDERS.map((key) => `
    <label class="vol">${t(`sound.${key}`)}
      <input type="range" min="0" max="100" step="5" value="${Math.round(getLevel(key) * 100)}" data-vol="${key}">
      <output>${Math.round(getLevel(key) * 100)}</output>
    </label>`).join('')}
  <label class="check"><input type="checkbox" id="memes-on" ${memesEnabled() ? 'checked' : ''}> ${t('sound.memesOn')}</label>
  <button class="btn" id="close-panel">${t('common.close')}</button>`;
els.panel.querySelectorAll('[data-vol]').forEach((input) => {
  input.oninput = () => {
    const value = Number(input.value) / 100;
    setLevel(input.dataset.vol, value);
    input.nextElementSibling.textContent = input.value;
    if (input.dataset.vol === 'music') refreshMusic();
  };
  input.onchange = () => {
    if (input.dataset.vol === 'meme') showMeme('pass');
    if (input.dataset.vol === 'sfx') thump(0.8);
  };
});
$('memes-on').onchange = (e) => setMemesEnabled(e.target.checked);

// ---------- stickers, quick phrases, chat (social.js) ----------
const cardTopPoint = {};
const social = createSocial({
  send,
  getState: () => state,
  getMe: () => me,
  nameOf,
  // a seat's ink for names on cream, or its deep tone for white text
  inkOf: (seat, deep = false) => CARD_COLORS[cardColorOf(seat)]?.[deep ? 'deep' : 'dark'] ?? '#2a1418',
  // the top of a seat's card on screen (null when it is not on the table)
  cardTop: (seat) => {
    const card = world.cards[seat];
    if (!card?.mesh.visible || !card.body.isEnabled()) return null;
    const { x, y, z } = card.mesh.position;
    world.toScreen(x, y, z, cardTopPoint);
    const cx = cardTopPoint.x;
    let top = cardTopPoint.y;
    let bottom = top;
    let left = cx;
    let right = cx;
    for (const [dx, dz] of [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]]) {
      world.toScreen(x + dx, y, z + dz, cardTopPoint);
      top = Math.min(top, cardTopPoint.y);
      bottom = Math.max(bottom, cardTopPoint.y);
      left = Math.min(left, cardTopPoint.x);
      right = Math.max(right, cardTopPoint.x);
    }
    return { x: cx, y: top, bottom, left, right, mid: (top + bottom) / 2 };
  },
  safeTop: () => world.safe?.top ?? 0,
  isMyTurn: () => state?.phase === 'turn' && state.turn === me,
  showToast,
});
els.panel.querySelector('#close-panel').insertAdjacentHTML('beforebegin', `<label class="check"><input type="checkbox" id="reacts-on" ${social.showOthers() ? 'checked' : ''}> ${t('social.showReacts')}</label>`);
$('reacts-on').onchange = (e) => social.setShowOthers(e.target.checked);

// Names over the cards can cover them on a phone: a player may hide them (this device only). The
// cards then glow instead, green for mine and red for the others, so whose is whose stays clear.
const tableNames = {
  get: () => { try { return localStorage.getItem('slam-names') !== '0'; } catch { return true; } },
  set: (on) => { try { localStorage.setItem('slam-names', on ? '1' : '0'); } catch { /* private mode */ } },
};
const GLOW = { mine: '#3ad16b', theirs: '#ff4b4b' };
let namesShown = tableNames.get();
els.panel.querySelector('#close-panel').insertAdjacentHTML('beforebegin', `<label class="check"><input type="checkbox" id="names-on" ${namesShown ? 'checked' : ''}> ${t('settings.showNames')}</label>`);
$('names-on').onchange = (e) => {
  namesShown = e.target.checked;
  tableNames.set(namesShown);
  world.needsRender = true; // labels and glows are refreshed with the next frame drawn
};
let glowKey = '';
function applyGlows() {
  const seats = state?.seats ?? [];
  const key = `${namesShown}|${me}|${seats.join(',')}`;
  if (key === glowKey) return;
  glowKey = key;
  world.setGlows(namesShown || !me ? {} : Object.fromEntries(seats.map((s) => [s, s === me ? GLOW.mine : GLOW.theirs])));
}
// tapping a player's chip mutes (or unmutes) their stickers and chat
els.players.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  const seat = chip && SEATS.find((s) => chip.classList.contains(s));
  if (!seat) return;
  social.toggleMute(seat);
  hudKey = '';
  renderHud();
});
els.settings.onclick = () => {
  els.panel.hidden = !els.panel.hidden;
  els.infoPanel.hidden = true;
  langPanel.hidden = true;
  ftue.closeHelp();
};
els.info.onclick = () => {
  els.infoPanel.hidden = !els.infoPanel.hidden;
  els.panel.hidden = true;
  langPanel.hidden = true;
  ftue.closeHelp();
};
$('lang').onclick = () => {
  langPanel.hidden = !langPanel.hidden;
  els.panel.hidden = true;
  els.infoPanel.hidden = true;
  ftue.closeHelp();
};
$('close-info').onclick = () => { els.infoPanel.hidden = true; };
$('close-panel').onclick = () => { els.panel.hidden = true; };

// ---------- network ----------

// Reconnects with growing pauses (1, 2, 4, 8 s). A page that never reached the server, or lost
// it for longer than the seat is kept, gets a card with a retry button instead of a silent loop.
const RETRY_MS = [1000, 2000, 4000, 8000];
const GIVE_UP_AFTER = 5;
let everConnected = false;
let failures = 0;
let lostAt = 0;
let retryTimer = 0;
let retryAt = 0;
let menuNotice = '';
let quietClose = false;

function connect() {
  clearTimeout(retryTimer);
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${location.pathname.replace(/[^/]*$/, '')}ws`);
  ws.onopen = () => {
    send(helloMessage());
    const downFor = lostAt ? Date.now() - lostAt : 0;
    everConnected = true;
    failures = 0;
    lostAt = 0;
    hideNetFail();
    if (roomCode) openRoom(roomCode);
    else if (queueing && downFor < 10000) sendQueue(queueing.size); // a short blip: back in line
    else {
      if (queueing) menuNotice = t('queue.lost');
      queueing = null;
      renderMenu(menuNotice);
      menuNotice = '';
    }
  };
  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch (err) {
      console.error('message failed', err);
    }
  };
  ws.onclose = () => {
    if (quietClose) {
      quietClose = false;
      connect();
      return;
    }
    failures += 1;
    lostAt ||= Date.now();
    const wait = RETRY_MS[Math.min(failures - 1, RETRY_MS.length - 1)];
    const longGone = Date.now() - lostAt > 60000;
    if ((!everConnected && failures >= GIVE_UP_AFTER) || longGone) showNetFail();
    else if (everConnected) showToast(t('net.lost'));
    retryAt = performance.now() + wait;
    retryTimer = setTimeout(connect, wait);
  };
}

// Back from another app: phones suspend a hidden page and its socket dies or goes silent (a player
// switching to a chat app to send the invite link). Check at once instead of waiting for the next
// retry: a dead socket reconnects now, an open one must answer a ping within 3 s or is replaced.
// Reconnecting rejoins the room by its token (openRoom), so the player is back in their seat.
let wakeProbe = 0;
function wakeUp() {
  if (document.visibilityState !== 'visible') return;
  if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
    failures = 0;
    connect();
    return;
  }
  if (ws.readyState !== WebSocket.OPEN) return;
  const sentAt = performance.now();
  send({ t: 'ping', at: sentAt });
  clearTimeout(wakeProbe);
  wakeProbe = setTimeout(() => {
    if (lastPong >= sentAt || ws?.readyState !== WebSocket.OPEN) return;
    // a silent socket can take long to report its close: drop it and open a new one now
    const dead = ws;
    dead.onclose = null;
    dead.onmessage = null;
    try { dead.close(); } catch { /* already gone */ }
    failures = 0;
    connect();
  }, 3000);
}
document.addEventListener('visibilitychange', wakeUp);
addEventListener('pageshow', wakeUp);
addEventListener('online', wakeUp);
addEventListener('focus', wakeUp);

// Why the game cannot connect, as far as the page can tell: no network at all; the page's own server
// answering plain requests while the game socket never opened (a school or office network, a VPN
// or an ad blocker stopping WebSockets); otherwise the server is down or the network too weak.
async function netFailReason() {
  if (navigator.onLine === false) return 'net.offlineBody';
  if (everConnected) return 'net.failBody';
  try {
    const res = await fetch(`./build.json?t=${Date.now()}`, { cache: 'no-store' });
    return res.ok ? 'net.blockedBody' : 'net.failBody';
  } catch { return 'net.failBody'; }
}

function showNetFail() {
  const card = $('netfail');
  if (!card.hidden) return;
  hideToast();
  card.hidden = false;
  setText($('netfail-body'), t('net.failBody'));
  netFailReason().then((key) => setText($('netfail-body'), t(key)));
  $('netfail-retry').onclick = () => {
    failures = 0;
    connect();
  };
}
function hideNetFail() {
  $('netfail').hidden = true;
}
setInterval(() => {
  if ($('netfail').hidden) return;
  const secs = Math.max(0, Math.ceil((retryAt - performance.now()) / 1000));
  setText($('netfail-wait'), secs ? t('net.retryIn', { secs }) : t('net.retrying'));
}, 250);

function send(msg) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// ---------- server restarts and maintenance ----------

// A deploy changes the client: a page on the old build reloads, once per build (a page that cannot
// remember having tried, in a private window, stays put rather than risk a reload loop).
// After that reload, or after a restart seen on this page, a room that is gone is explained as the update.
let serverBoot = null;
let restartNotice = (() => {
  try {
    const back = sessionStorage.getItem('slam-updated') === '1';
    sessionStorage.removeItem('slam-updated');
    return back;
  } catch { return false; }
})();
function reloadForBuild(build) {
  try {
    if (sessionStorage.getItem('slam-reload-for') === build) return false;
    sessionStorage.setItem('slam-reload-for', build);
    sessionStorage.setItem('slam-updated', '1');
  } catch { return false; }
  location.reload();
  return true;
}
function onServerInfo(msg) {
  if (msg.build && __BUILD__ !== 'dev' && msg.build !== __BUILD__ && reloadForBuild(msg.build)) return;
  if (serverBoot && msg.boot !== serverBoot) restartNotice = true;
  serverBoot = msg.boot;
  if (restartNotice) setMaintenance(false);
}
function setMaintenance(on) {
  $('maint').textContent = on ? t('maintenance.banner') : '';
  $('maint').hidden = !on;
}

function onMessage(msg) {
  if (msg.t === 'server') {
    onServerInfo(msg);
  } else if (msg.t === 'maintenance') {
    setMaintenance(msg.on);
  } else if (msg.t === 'notice') {
    if (has(`error.${msg.code}`)) showToast(t(`error.${msg.code}`), 3000);
  } else if (msg.t === 'joined') {
    restartNotice = false;
    queueing = null;
    stopRoomsPolling();
    me = msg.color;
    roomCode = msg.code;
    saveToken(roomCode, msg.token);
    history.replaceState(null, '', `?room=${roomCode}`);
    lastPong = performance.now();
    hideToast();
    // the server refused the name (swear-word filter): keep its stand-in so the next room gets it too
    if (msg.nameBlocked && msg.name) {
      playerName.set(msg.name);
      showToast(t('toast.nameBlocked', { name: msg.name }), 3500);
    }
  } else if (msg.t === 'peek') {
    onPeek(msg);
  } else if (msg.t === 'replaced') {
    if (roomCode) tabStore.remove(tokenKey(roomCode));
    leaveRoom();
    menuNotice = t('error.otherTab');
    quietClose = true;
  } else if (msg.t === 'error') {
    leaveRoom();
    renderMenu(msg.code && has(`error.${msg.code}`) ? t(`error.${msg.code}`) : msg.message);
  } else if (social.onMessage(msg)) {
    // react / chat / chatLog
  } else if (msg.t === 'state') {
    onState(msg);
  } else if (msg.t === 'playStart') {
    startPlayback(msg);
  } else if (msg.t === 'playChunk') {
    playback?.buffer.push(...msg.frames);
  } else if (msg.t === 'playEnd') {
    if (playback) {
      playback.final = msg.final;
      playback.ended = true;
    }
  } else if (msg.t === 'slamGo') {
    onSlamGo(msg);
  } else if (msg.t === 'slamRefused' || msg.t === 'playAbort') {
    // a slam the server would not start, or threw out (too late, or failed its check): back to its cards
    pendingSlam = null;
    sim = null;
    playback = null;
    awaitingServer = false;
    resyncCards();
  } else if (msg.t === 'pong') {
    lastPong = performance.now();
    pingMs = Math.round(lastPong - msg.at);
  } else if (msg.t === 'passed') {
    if (msg.impact) {
      const at = new THREE.Vector3(msg.impact.x, 0, msg.impact.z);
      visuals.dropDep(at, () => impactFx(at, 0.25, 0.4), depOf(msg.by), depColorsOf(msg.by));
    }
    showToast(t(msg.timeout ? 'toast.timeout' : 'toast.pass', { name: nameOf(msg.by) }), 1500);
  } else if (msg.t === 'autoSlam') {
    autoSlam();
  } else if (msg.t === 'queue') {
    if (msg.state === 'waiting' && queueing && !roomCode) renderQueue(msg);
  } else if (msg.t === 'lookRefused') {
    showToast(t('error.colorTaken'), 2000);
  } else if (msg.t === 'rooms') {
    roomsList = msg.rooms;
    if (overlayKey === 'rooms') fillRoomList();
  }
}

// ---------- leaving on purpose ----------

// The door in the corner, in a lobby or a match: a first tap asks (the label turns into a question
// for 3 s), a second one leaves at once; the others go on without this seat.
let leaveArmed = 0;
$('leave').onclick = () => {
  const button = $('leave');
  if (!button.classList.contains('armed')) {
    button.classList.add('armed');
    setText(button.querySelector('span'), t('corner.leaveConfirm'));
    clearTimeout(leaveArmed);
    leaveArmed = setTimeout(disarmLeave, 3000);
    return;
  }
  disarmLeave();
  const code = roomCode;
  send({ t: 'leave' });
  leaveRoom();
  forgetToken(code);
  history.replaceState(null, '', location.pathname);
  renderMenu();
};
function disarmLeave() {
  clearTimeout(leaveArmed);
  $('leave').classList.remove('armed');
  setText($('leave').querySelector('span'), t('corner.leave'));
}

function onState(next) {
  // a match I played just ended (a reload that lands on the end screen does not count it twice)
  if (next.phase === 'matchEnd' && state && state.phase !== 'matchEnd' && next.seats.includes(me)) ads.matchFinished();
  state = next;
  stateAt = performance.now();
  $('leave').hidden = false;
  if (awaitingServer && !(state.phase === 'turn' && state.turn === me)) awaitingServer = false;

  if (state.seats.length >= 2) world.setup(state.seats);
  applySeatColors();
  applyLooks();
  petReactions();
  applyStateCards();

  const gone = Object.keys(state.players).filter((s) => s !== me && !state.players[s].connected && !state.players[s].left);
  if (gone.length) showToast(t('toast.dropped', { names: list(gone.map(nameOf)) }));
  else if (els.toast.dataset.sticky) hideToast();

  announceEvent();
  chimeReady();
  reactWithMemes();
  playMusic(['lobby', 'matchEnd'].includes(state.phase) ? 'menu' : 'game');
  renderHud();
  renderOverlay();
  ftue.onState(state, me);
  world.needsRender = true;
}

// ---------- wardrobe ----------

// What I wear: the room's copy when I'm in one (the server may have moved my card colour),
// otherwise what this device has saved.
function myLook() {
  const p = state && me ? state.players[me] : null;
  return p ? { pet: p.pet, dep: p.dep, depColors: p.depColors, cardColor: p.cardColor } : playerLook.get();
}

// The wardrobe in one row (phones, inside the home card): pet, slipper and card colour, opens the wardrobe.
function gearRow(look) {
  const c = CARD_COLORS[look.cardColor];
  return `<button type="button" class="gear-row" data-ward="pet">
    <img src="${petThumb(look.pet)}" alt=""><img src="deps/${look.dep}.png" alt="">
    <span class="card-chip" style="--c:${c.color}">${c.suit}</span>
    <span class="gr-label">${t('wardrobe.title')}<small>${escapeHtml(t(`pet.${look.pet}`))} · ${escapeHtml(t(`dep.${look.dep}`))} · ${escapeHtml(t(`color.${look.cardColor}`))}</small></span>
    <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true"><path d="M2 2l8 8-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`;
}

function wireGearTiles() {
  els.overlay.querySelectorAll('[data-ward]').forEach((b) => { b.onclick = () => openWardrobe(b.dataset.ward); });
}

function openWardrobe(tab) {
  const inRoom = Boolean(state && me && ['lobby', 'matchEnd'].includes(state.phase));
  const back = state && me ? 'room' : 'menu';
  overlayKey = 'wardrobe';
  stopRoomsPolling();
  els.overlay.className = '';
  els.overlay.innerHTML = '<div class="menu-bg"><div id="ward-root"></div></div>';
  mountMenuBackground(els.overlay.querySelector('.menu-bg'));
  const taken = state && me ? Object.entries(state.players).filter(([seat]) => seat !== me).map(([, p]) => p.cardColor) : [];
  renderWardrobe($('ward-root'), {
    look: myLook(),
    taken,
    tab,
    onChange: (look) => {
      playerLook.set(look);
      if (inRoom) send({ t: 'pickLook', look });
    },
    onDone: () => {
      overlayKey = '';
      if (back === 'room' && state) renderOverlay();
      else renderMenu();
    },
  });
}

// Each seat's colour (slots, chips, badges, names, the card itself) is its player's card colour.
let seatColorsKey = '';
function applySeatColors() {
  const key = SEATS.map(cardColorOf).join();
  if (key === seatColorsKey) return;
  seatColorsKey = key;
  const root = document.documentElement.style;
  for (const seat of SEATS) {
    const c = CARD_COLORS[cardColorOf(seat)];
    root.setProperty(`--seat-${seat}`, c.color);
    root.setProperty(`--seat-${seat}-ink`, c.dark);
    root.setProperty(`--seat-${seat}-deep`, c.deep);
  }
  world.setCardColors(Object.fromEntries(SEATS.map((seat) => [seat, CARD_COLORS[cardColorOf(seat)].dark])));
}
// The pets act out the match: a nod when their turn comes, running while cards fly (slam(),
// startPlayback()), a dance for whoever takes a card or a round, a head shake for whoever is out.
let petTurnKey = '';
let petEventKey = '';
let warmedMatch = '';
function petReactions() {
  const s = state;
  // once per match, during the round-1 intro: compile everything the slams will use
  const matchKey = `${s.code}-${s.seats.join()}`;
  if (s.phase === 'roundIntro' && s.round === 1 && warmedMatch !== matchKey) {
    warmedMatch = matchKey;
    setTimeout(() => world.warmUp(s.seats.map((seat) => depModelFor(depOf(seat), depColorsOf(seat)))), 50);
  }
  if (s.phase === 'roundIntro') for (const seat of s.seats) world.react(seat, 'idle');
  const turnKey = s.phase === 'turn' ? `${s.round}-${s.turn}-${s.remainingMs > 0}` : '';
  if (turnKey && turnKey !== petTurnKey) {
    for (const seat of s.alive) world.react(seat, seat === s.turn ? 'gesture-positive' : 'idle');
  }
  petTurnKey = turnKey;
  const ev = s.phase === 'roundEnd' ? s.result : s.event;
  const evKey = ev ? `${s.round}-${s.phase}-${ev.type ?? ev.reason}-${ev.by}-${ev.eliminated}` : '';
  if (evKey && evKey !== petEventKey) {
    for (const seat of ev.eliminated ?? []) world.react(seat, 'gesture-negative');
    const kind = ev.type ?? ev.reason;
    if (kind === 'capture') world.react(ev.by, 'dance');
    if (kind === 'fall') world.react(ev.by, 'gesture-negative');
    if (s.phase === 'roundEnd' && ev.winner) world.react(ev.winner, 'dance');
  }
  petEventKey = evKey;
}
const petsRun = () => { for (const seat of state?.alive ?? []) world.react(seat, 'run'); };

function applyLooks() {
  const looks = {};
  for (const seat of SEATS) {
    const p = state?.players[seat];
    if (p) looks[seat] = { pet: p.pet, dep: p.dep, depColors: p.depColors, cardColor: p.cardColor };
  }
  world.setLooks(looks);
}

// The table shows the server's cards whenever no local slam or replay is moving them.
function applyStateCards() {
  if (!state || state.seats.length < 2 || sim || playback || state.phase === 'anim') return;
  const key = JSON.stringify(state.cards);
  if (key === appliedCardsKey) return;
  world.setCards(state.cards);
  appliedCardsKey = key;
}

// After a local slam or replay the table may differ from the server (a slam the server refused,
// an aborted replay), so the server's cards are applied again even if they did not change.
function resyncCards() {
  appliedCardsKey = '';
  applyStateCards();
}

// Mid-round knockouts in 3-4 player games get a short toast.
// A short tone when someone else in the lobby turns Ready (my own tap already has its button).
let readyBefore = {};
function chimeReady() {
  const now = state?.phase === 'lobby' ? state.ready ?? {} : {};
  if (Object.keys(now).some((seat) => seat !== me && now[seat] && readyBefore[seat] === false)) chime('ready');
  readyBefore = Object.fromEntries(SEATS.map((seat) => [seat, Boolean(now[seat])]));
}

function announceEvent() {
  const event = state.event;
  const key = event ? `${state.round}-${event.type}-${event.by}-${event.eliminated}` : '';
  if (key === lastEventKey) return;
  lastEventKey = key;
  if (event?.type === 'fall') social.setContext('fall');
  else if (event?.by === me && event.eliminated?.length) social.setContext('ate');
  else if (event?.eliminated?.includes(me)) social.setContext('eaten');
  if (['roundEnd', 'matchEnd'].includes(state.phase) && state.result?.winner === me) social.setContext('won');
  if (!event?.eliminated?.length || state.phase === 'roundEnd') return;
  const out = list(event.eliminated.map(nameOf));
  const text = event.type === 'fall' ? t('toast.fall', { name: nameOf(event.by) })
    : event.type === 'afk' ? t('toast.afk', { name: nameOf(event.by) })
      : event.type === 'left' ? t('toast.left', { out }) : t('toast.capture', { by: nameOf(event.by), out });
  showToast(text, 2500);
  if (event.type === 'afk') chime('out');
}

// ---------- meme reactions ----------

// How far each card travelled and how many half-turns it made during the last slam.
function slamStats(frames, by) {
  if (!frames?.length) return null;
  const i = world.seats.indexOf(by);
  if (i < 0) return null;
  const o = i * 7;
  const first = frames[0];
  const last = frames[frames.length - 1];
  let halfTurns = 0;
  let prevUp = null;
  for (const f of frames) {
    const up = 1 - 2 * (f[o + 3] ** 2 + f[o + 5] ** 2) > 0;
    if (prevUp !== null && up !== prevUp) halfTurns += 1;
    prevUp = up;
  }
  return { by, travel: Math.hypot(last[o] - first[o], last[o + 2] - first[o + 2]), halfTurns };
}

const isSkillShot = (stats) => stats && (stats.travel >= 3.5 || stats.halfTurns >= 4);

function reactWithMemes() {
  const s = state;
  if (!memesPreloaded && s.phase !== 'lobby') {
    memesPreloaded = true;
    preloadMemes();
  }

  const event = s.event;
  const eventKey = event ? `${s.round}-${event.type}-${event.by}-${event.eliminated ?? ''}` : '';
  if (eventKey && eventKey !== memeEventKey) {
    if (event.type === 'capture') showMeme(isSkillShot(lastSlamStats) && lastSlamStats.by === event.by ? 'skill' : 'capture');
    else if (event.type === 'fall') showMeme('fall');
    else if (event.type === 'pass') showMeme('pass');
    else if (event.type === 'timeout') showMeme('timeout');
  }
  memeEventKey = eventKey;

  const phaseKey = `${s.phase}-${s.round}-${s.turn}`;
  if (phaseKey === memePhaseKey) return;
  memePhaseKey = phaseKey;

  if (s.phase === 'roundEnd' && s.result?.winner === me) showMeme('roundWin');
  if (s.phase === 'matchEnd') showMeme(s.result?.matchWinner === me ? 'matchWin' : 'matchLose');
  if (s.phase === 'turn' && s.alive.includes(me) && flippedRound !== s.round) {
    const q = s.cards[me]?.q;
    if (q && 1 - 2 * (q[0] ** 2 + q[2] ** 2) > 0) {
      flippedRound = s.round;
      showMeme('firstFlip');
    }
  }
}

// ---------- overlays ----------

function setOverlay(key, html, { clear = false } = {}) {
  if (key === overlayKey) return false;
  overlayKey = key;
  els.overlay.className = clear ? 'clear' : '';
  els.overlay.innerHTML = html;
  return true;
}

// First visit: the name box starts with a random silly name, so a friend opening an invite link
// can press one button and play (UX-07). The suggestion stays the same while the page is open and
// is kept once the player types or goes; it is not saved just for being shown, since a saved name
// is what lets an invite link skip the name box.
const randomName = () => {
  const names = t('menu.randomNames').split('|').map((n) => n.trim()).filter(Boolean);
  return names[Math.floor(Math.random() * names.length)] ?? '';
};
let suggestedName = '';
function nameField() {
  const value = playerName.get() || (suggestedName ||= randomName());
  return `<label class="name-field">${t('menu.nameLabel')}
    <input class="input name" id="name" maxlength="16" placeholder="${escapeHtml(t('menu.namePlaceholder'))}" value="${escapeHtml(value)}" autocomplete="nickname">
  </label>`;
}
// Whatever screen shows the name box, the name is kept as it is typed (Telex and other input
// methods included: the last input event carries the finished word). Re-rendering the screen,
// opening the wardrobe or closing the tab never loses it; an emptied box keeps the last name (V-02).
els.overlay.addEventListener('input', (e) => {
  if (e.target.id !== 'name') return;
  const name = e.target.value.trim().slice(0, 16);
  if (name) playerName.set(name);
});

function readName() {
  const name = $('name').value.trim().slice(0, 16);
  if (!name) {
    $('name').focus();
    $('name').classList.add('shake');
    setTimeout(() => $('name')?.classList.remove('shake'), 400);
    return null;
  }
  playerName.set(name);
  return name;
}

// Sends a request from a menu button, or says why it cannot go out yet. The button stays
// locked until the server answers (joined, peek or error re-render the screen).
function sendFromMenu(button, msg) {
  if (ws?.readyState !== WebSocket.OPEN) {
    showMenuError(t('error.reconnecting'));
    return;
  }
  button.disabled = true;
  send(msg);
}

function showMenuError(text) {
  const box = els.overlay.querySelector('.menu-error');
  if (!box) return;
  box.textContent = text;
  box.hidden = !text;
}

// The game's logo, the same drawing as the trailer's (video/edit/src/Shorts5.tsx Logo): the first line
// of the name on an arc, the second big in yellow with a brown block shadow, the other name on a
// ribbon, the tiger card and the flip-flop stuck on the sides. Long names get smaller type.
function logo() {
  const [arc, big = ''] = t('menu.logo').split('\n');
  const arcSize = Math.min(170, Math.round(1190 / Math.max(1, [...arc].length)));
  const bigSize = Math.min(230, Math.round(1840 / Math.max(1, [...big].length)));
  const word = (text, attrs) => `<text ${attrs} stroke="#2a1418" stroke-linejoin="round" paint-order="stroke fill">${escapeHtml(text)}</text>`;
  return `<h1 class="logo" aria-label="${escapeHtml(t('menu.logo').replace('\n', ' '))}">
    <img class="logo-card" src="brand/logo-card.png" alt="">
    <svg viewBox="0 60 1000 620" aria-hidden="true">
      <path id="logo-arc" d="M140 300 Q500 110 860 300" fill="none"/>
      <text font-size="${arcSize}" fill="#F6F3EF" stroke="#2a1418" stroke-width="26" stroke-linejoin="round" paint-order="stroke fill"><textPath href="#logo-arc" startOffset="50%" text-anchor="middle">${escapeHtml(arc)}</textPath></text>
      <g transform="rotate(-3 500 420)">
        ${[5, 4, 3, 2, 1].map((i) => word(big, `x="500" y="${455 + i * 4}" text-anchor="middle" font-size="${bigSize}" fill="#9a5414" stroke-width="22"`)).join('')}
        ${word(big, 'x="500" y="455" text-anchor="middle" font-size="' + bigSize + '" fill="#FFC93C" stroke-width="22"')}
      </g>
      <g transform="rotate(-4 500 600)">
        <path d="M110 565 L890 565 L855 607 L890 649 L110 649 L145 607 Z" fill="#25221F" stroke="#141210" stroke-width="8"/>
        <text x="500" y="623" text-anchor="middle" font-size="50" fill="#FFB84D" letter-spacing="8">${escapeHtml(t('logo.ribbon'))}</text>
      </g>
    </svg>
    <img class="logo-dep" src="brand/logo-dep.png" alt="">
  </h1>`;
}
const menuError = (error) => `<p class="menu-error" ${error ? '' : 'hidden'}>${escapeHtml(error)}</p>`;

// Player-count picker: "any" plus 2/3/4, each with a row of dots (seats).
const sizeButtons = (sel, sizes = SIZES) => sizes.map((n) => {
  const dots = '<b></b>'.repeat(n === 'any' ? 2 : n) + (n === 'any' ? '<em>…</em>' : '');
  return `<button type="button" class="${n === sel ? 'on' : ''}" data-size="${n}" aria-pressed="${n === sel}">
    <span class="${n === 'any' ? 'seg-word' : ''}">${n === 'any' ? t('home.any') : n}</span><i>${dots}</i></button>`;
}).join('');

// Home: name, quick match with strangers (any / 2 / 3 / 4), then the friends options.
function renderMenu(error = '') {
  overlayKey = 'menu';
  stopRoomsPolling();
  playMusic('menu');
  els.overlay.className = '';
  const size = playerSize.get();
  els.overlay.innerHTML = `
    <div class="menu-bg with-gear"><div class="panel menu-card home">
      ${logo()}
      <p class="sub">${t('menu.tagline')}</p>
      ${menuError(error)}
      ${nameField()}
      ${gearRow(playerLook.get())}
      <div class="quick-group">
        <p class="group-label">${t('home.quickTitle')}</p>
        <div class="seg" id="size">${sizeButtons(size)}</div>
        <button class="btn pri wide big" id="play">${t('home.play')}</button>
      </div>
      <div class="or">${t('home.orFriends')}</div>
      <div class="row two">
        <button class="btn" id="create">${t('menu.create')}</button>
        <button class="btn" id="rooms">${t('home.publicRooms')}</button>
      </div>
      <div class="row code-row">
        <label><input class="input" id="code" maxlength="4" placeholder="${escapeHtml(t('menu.codePlaceholder'))}" aria-label="${escapeHtml(t('menu.codePlaceholder'))}"></label>
        <button class="btn" id="join" aria-label="${escapeHtml(t('menu.join'))}">${t('rooms.join')}</button>
      </div>
    </div>
    <div class="panel menu-card gear-card">
      <p class="gear-title">${t('wardrobe.title')}</p>
      <img class="gear-hero" src="${petThumb(playerLook.get().pet)}" alt="">
      ${gearTiles(playerLook.get())}
      <p class="sub">${t('wardrobe.note')}</p>
    </div></div>`;
  wireGearTiles();
  mountMenuBackground(els.overlay.querySelector('.menu-bg'));
  els.overlay.querySelectorAll('#size [data-size]').forEach((b) => {
    b.onclick = () => {
      const v = b.dataset.size === 'any' ? 'any' : Number(b.dataset.size);
      playerSize.set(v);
      els.overlay.querySelectorAll('#size [data-size]').forEach((x) => {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
    };
  });
  $('play').onclick = () => {
    if (!readName()) return;
    if (ws?.readyState !== WebSocket.OPEN) {
      showMenuError(t('error.reconnecting'));
      return;
    }
    sendQueue(playerSize.get());
  };
  $('create').onclick = () => {
    if (readName()) renderCreate();
  };
  $('rooms').onclick = () => {
    if (readName()) renderRooms();
  };
  const join = () => {
    const code = $('code').value.trim().toUpperCase();
    if (code.length !== 4) {
      showMenuError(t('error.codeShort'));
      $('code').focus();
      return;
    }
    if (!readName()) return;
    if (ws?.readyState !== WebSocket.OPEN) {
      showMenuError(t('error.reconnecting'));
      return;
    }
    $('join').disabled = true;
    roomCode = code;
    openRoom(code, true);
  };
  $('join').onclick = join;
  $('code').onkeydown = (e) => { if (e.key === 'Enter') join(); };
}

function renderNamePrompt(code) {
  overlayKey = 'name';
  playMusic('menu');
  els.overlay.className = '';
  els.overlay.innerHTML = `
    <div class="menu-bg"><div class="panel menu-card name-card">
      ${logo()}
      <p class="sub">${t('invite.sub', { code: `<span class="code">${escapeHtml(code)}</span>` })}</p>
      ${menuError('')}
      ${nameField()}
      <button class="btn pri wide" id="go">${t('menu.join')}</button>
    </div></div>`;
  mountMenuBackground(els.overlay.querySelector('.menu-bg'));
  const go = () => {
    if (!readName()) return;
    if (ws?.readyState !== WebSocket.OPEN) {
      showMenuError(t('error.reconnecting'));
      return;
    }
    $('go').disabled = true;
    openRoom(code);
  };
  $('go').onclick = go;
  $('name').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  $('name').focus();
}

// A name for screens that have no name box: the saved one, else a random one (then saved).
function currentName() {
  let name = playerName.get();
  if (!name) {
    name = randomName();
    playerName.set(name);
  }
  return name;
}

// ---------- create room ----------

function renderCreate(preset = {}) {
  overlayKey = 'create';
  stopRoomsPolling();
  let visibility = preset.visibility ?? 'private';
  let cap = preset.cap ?? 4;
  els.overlay.className = '';
  els.overlay.innerHTML = `
    <div class="menu-bg"><div class="panel menu-card">
      <h1 class="stamp" style="font-size:40px">${t('create.title')}</h1>
      ${menuError('')}
      <p class="group-label">${t('create.who')}</p>
      <div class="seg two" id="vis">
        ${['private', 'public'].map((v) => `<button type="button" class="${v === visibility ? 'on' : ''}" data-vis="${v}" aria-pressed="${v === visibility}">
          <span class="seg-big">${visIcon(v)} ${t(`create.${v}`)}</span><small>${t(`create.${v}Sub`)}</small></button>`).join('')}
      </div>
      <p class="group-label">${t('create.cap')}</p>
      <div class="seg three" id="cap">${sizeButtons(cap, [2, 3, 4])}</div>
      <button class="btn pri wide big" id="create-go">${t('create.go')}</button>
      <button class="link-btn" id="create-cancel">${t('create.cancel')}</button>
    </div></div>`;
  mountMenuBackground(els.overlay.querySelector('.menu-bg'));
  const pick = (group, attr, set) => els.overlay.querySelectorAll(`#${group} [data-${attr}]`).forEach((b) => {
    b.onclick = () => {
      set(b.dataset[attr]);
      els.overlay.querySelectorAll(`#${group} [data-${attr}]`).forEach((x) => {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
    };
  });
  pick('vis', 'vis', (v) => { visibility = v; });
  pick('cap', 'size', (v) => { cap = Number(v); });
  $('create-go').onclick = () => sendFromMenu($('create-go'), { t: 'create', name: currentName(), look: playerLook.get(), visibility, cap });
  $('create-cancel').onclick = () => renderMenu();
}

// ---------- public rooms ----------

function stopRoomsPolling() {
  clearInterval(roomsTimer);
  roomsTimer = 0;
}

function renderRooms() {
  overlayKey = 'rooms';
  els.overlay.className = '';
  els.overlay.innerHTML = `
    <div class="menu-bg"><div class="panel menu-card rooms-card">
      <div class="rooms-head">
        <button class="btn small" id="rooms-back">← ${t('common.back')}</button>
        <h1 class="stamp" style="font-size:34px">${t('rooms.title')}</h1>
      </div>
      ${menuError('')}
      <div class="seg four" id="rooms-filter">
        ${['all', 2, 3, 4].map((f) => `<button type="button" class="${f === roomsFilter ? 'on' : ''}" data-filter="${f}">${f === 'all' ? t('rooms.all') : t('common.players', { n: f })}</button>`).join('')}
      </div>
      <div class="room-list" id="room-list"><span class="spin" aria-hidden="true"></span></div>
    </div></div>`;
  mountMenuBackground(els.overlay.querySelector('.menu-bg'));
  $('rooms-back').onclick = () => renderMenu();
  els.overlay.querySelectorAll('[data-filter]').forEach((b) => {
    b.onclick = () => {
      roomsFilter = b.dataset.filter === 'all' ? 'all' : Number(b.dataset.filter);
      els.overlay.querySelectorAll('[data-filter]').forEach((x) => x.classList.toggle('on', x === b));
      fillRoomList();
    };
  });
  roomsList = null;
  send({ t: 'listRooms' });
  stopRoomsPolling();
  roomsTimer = setInterval(() => {
    if (overlayKey !== 'rooms') stopRoomsPolling();
    else send({ t: 'listRooms' });
  }, 3000);
}

function fillRoomList() {
  const box = $('room-list');
  if (!box || !roomsList) return;
  const shown = roomsList.filter((r) => roomsFilter === 'all' || r.cap === roomsFilter);
  if (!shown.length) {
    box.innerHTML = `
      <div class="rooms-empty">
        <p class="rooms-empty-title">${t('rooms.emptyTitle')}</p>
        <p class="sub">${t('rooms.emptySub')}</p>
        <div class="row two">
          <button class="btn" id="rooms-create">${t('rooms.create')}</button>
          <button class="btn pri" id="rooms-play">${t('home.play')}</button>
        </div>
      </div>`;
    $('rooms-play').onclick = () => sendQueue(playerSize.get());
  } else {
    box.innerHTML = `${shown.map((r) => {
      const open = r.phase === 'lobby' && r.n < r.cap;
      const slots = Array.from({ length: r.cap }, (_, i) => `<b class="${i < r.n ? 'full' : ''}"></b>`).join('');
      return `<div class="room-row${open ? '' : ' off'}">
        <img class="room-av" src="${petThumb(r.pet ?? 'cat')}" alt="">
        <span class="room-name">${t('rooms.room', { code: escapeHtml(r.code) })}
          <small>${PEOPLE} ${t('rooms.count', { n: r.n, cap: r.cap })} <span class="tag ${open ? 'ok' : 'busy'}">${t(open ? 'rooms.waiting' : 'rooms.playing')}</span></small></span>
        <span class="room-slots" aria-hidden="true">${slots}</span>
        ${open ? `<button class="btn pri small" data-join="${escapeHtml(r.code)}">${t('rooms.join')}</button>` : '<span></span>'}
      </div>`;
    }).join('')}
      <p class="sub rooms-note">${t('rooms.note')}</p>
      <button class="btn wide" id="rooms-create">${t('rooms.create')}</button>`;
    box.querySelectorAll('[data-join]').forEach((b) => {
      b.onclick = () => {
        currentName();
        b.disabled = true;
        roomCode = b.dataset.join;
        openRoom(roomCode, true);
      };
    });
  }
  $('rooms-create').onclick = () => renderCreate({ visibility: 'public' });
}

// ---------- quick match ----------

function sendQueue(size) {
  queueing = { size, since: Date.now() };
  send({ t: 'queue', size, name: currentName(), look: playerLook.get() });
  renderQueue(null);
}

const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

// While waiting: me, whoever would come along, empty seats still searching. An exact size
// waiting 20 s with at least one other player can settle for fewer.
function renderQueue(msg) {
  const size = queueing.size;
  const peers = msg?.peers ?? [];
  const waited = msg?.waitedMs ?? Date.now() - queueing.since;
  const seatsShown = size === 'any' ? Math.max(4, peers.length + 1) : size;
  const startsIn = msg?.startsInMs ? Math.ceil(msg.startsInMs / 1000) : 0;
  const fewer = size !== 'any' && waited > 20000 && peers.length >= 1 && peers.length + 1 < size ? peers.length + 1 : 0;
  const people = [{ name: currentName(), pet: playerLook.get().pet, you: true }, ...peers];
  const key = `queue-${size}-${Math.floor(waited / 1000)}-${people.map((p) => p.name).join('|')}-${startsIn}-${fewer}`;
  if (!setOverlay(key, `
    <div class="menu-bg"><div class="panel menu-card queue-card">
      <h1 class="stamp" style="font-size:36px">${t('queue.title')}</h1>
      <p class="sub">${size === 'any' ? t('queue.sizeAny') : t('queue.size', { n: size })} · ${t('queue.waited', { time: mmss(waited) })}</p>
      <div class="queue-seats">
        ${Array.from({ length: seatsShown }, (_, i) => {
    const p = people[i];
    if (!p) return `<div class="slot waiting"><span class="spin" aria-hidden="true"></span>${t('queue.slot')}</div>`;
    return `<div class="slot seat ${SEATS[i]}"><img class="slot-dep pet" src="${petThumb(p.pet ?? 'cat')}" alt="">${escapeHtml(p.name)}<small>${p.you ? t('lobby.you') : t('queue.justIn')}</small></div>`;
  }).join('')}
      </div>
      ${startsIn ? `<p class="queue-go">${t('queue.startsIn', { n: people.length, secs: startsIn })}</p><p class="sub">${t('queue.anyNote')}</p>`
    : size === 'any' ? '' : `<p class="sub">${t('queue.fullNote', { n: size })}</p>`}
      ${fewer ? `<button class="btn pri wide" id="queue-fewer">${t('queue.fewer', { n: fewer })}</button>` : ''}
      <button class="btn wide" id="queue-cancel">${t('queue.cancel')}</button>
    </div></div>`)) return;
  mountMenuBackground(els.overlay.querySelector('.menu-bg'));
  $('queue-cancel').onclick = () => {
    send({ t: 'unqueue' });
    queueing = null;
    renderMenu();
  };
  if (fewer) $('queue-fewer').onclick = () => sendQueue(fewer);
}

// One cream chip per player (UX-02/UX-13): seat colours on the dimmed table were close to 1:1
// contrast, and a bare text line got lost against the winning card behind it.
function scoreLine() {
  return `<span class="scores">${state.seats.map((s) => `<span class="score-chip"><i class="dot ${s}"></i>${escapeHtml(nameOf(s))}<b>${state.scores[s] ?? 0}</b></span>`).join('')}</span>`;
}

function renderOverlay() {
  const s = state;
  // the wardrobe stays open over lobby updates; a match starting closes it
  if (overlayKey === 'wardrobe') {
    if (['lobby', 'matchEnd'].includes(s.phase)) return;
    stopPreview();
  }
  const myColor = `<b class="seat-${me}">${seatLabel(me)}</b>`;
  switch (s.phase) {
    case 'lobby': {
      if (s.kind === 'quick') {
        if (setOverlay('quick-found', `<div class="panel"><h1 class="stamp" style="font-size:52px">${t('queue.found')}</h1></div>`)) chime('found');
        break;
      }
      const link = `${location.origin}${location.pathname}?room=${s.code}`;
      const count = Object.keys(s.players).length;
      const isHost = s.host === me;
      const guests = Object.keys(s.players).filter((seat) => seat !== s.host);
      const readyCount = guests.filter((seat) => s.ready[seat]).length;
      const canStart = guests.length >= 1 && readyCount === guests.length;
      const roster = `${s.host}-${s.visibility}-${s.cap}-${JSON.stringify(s.ready)}-${SEATS.map((seat) => { const p = s.players[seat]; return p ? `${p.name}:${p.dep}:${p.depColors}:${p.pet}:${p.cardColor}:${p.tutorial}` : ''; }).join('|')}`;
      const seatTag = (seat) => (seat === s.host ? `<span class="seat-tag">${CROWN}${t('lobby.host')}</span>`
        : `<span class="seat-tag${s.ready[seat] ? ' ok' : ''}">${s.ready[seat] ? `${CHECK}${t('lobby.isReady')}` : t('lobby.notReady')}</span>`);
      const tags = `<div class="room-tags">
          <button class="tag-btn" id="vis-toggle" ${isHost ? '' : 'disabled'}>${visIcon(s.visibility)}${t(`create.${s.visibility}`)}${isHost ? ' ▾' : ''}</button>
          <button class="tag-btn" id="cap-toggle" ${isHost ? '' : 'disabled'}>${PEOPLE}${t('lobby.capTag', { n: s.cap })}${isHost ? ' ▾' : ''}</button>
        </div>`;
      const waitingNames = guests.filter((seat) => !s.ready[seat]).map((seat) => escapeHtml(nameOf(seat)));
      const action = isHost
        ? `<button class="btn pri wide" id="start" ${canStart ? '' : 'disabled'}>${count < 2 ? t('lobby.needMore') : t('lobby.startReady', { ready: readyCount, guests: guests.length })}</button>
           ${count >= 2 && waitingNames.length ? `<p class="sub lobby-note">${t('lobby.waitGuests', { names: list(waitingNames) })}</p>` : ''}`
        : `<button class="btn ${s.ready[me] ? '' : 'pri'} wide" id="ready">${s.ready[me] ? t('lobby.unready') : t('lobby.readyBtn')}</button>
           <p class="sub lobby-note">${t('lobby.waitHost', { name: escapeHtml(nameOf(s.host)) })}</p>`;
      const reading = (seat) => (s.players[seat].tutorial ? `<span class="slot-tag">${t('lobby.reading', { n: s.players[seat].tutorial, total: 5 })}</span>` : '');
      const mine = depOf(me);
      const fresh = setOverlay(`lobby-${roster}`, `
        <div class="menu-bg"><div class="panel menu-card lobby-card">
          <h1 class="stamp" style="font-size:44px">${t('lobby.title', { code: `<span class="code">${s.code}</span>` })}</h1>
          <p class="sub">${t('lobby.sub')}</p>
          ${tags}
          <button class="btn pri wide invite" id="invite"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>${t('social.invite')}</button>
          <div class="row link-row">
            <label><input class="input" style="text-transform:none" id="link" value="${link}" readonly aria-label="${escapeHtml(t('lobby.linkLabel'))}"></label>
            <button class="btn" id="copy">${t('lobby.copy')}</button>
          </div>
          <div class="seats">
            ${SEATS.slice(0, Math.max(s.cap, count)).map((seat) => (s.players[seat] ? `
              <div class="slot seat ${seat}">${seatTag(seat)}<img class="slot-dep pet" src="${petThumb(petOf(seat))}" alt="">${escapeHtml(s.players[seat].name)}<small>${t('lobby.seatCard', { color: seatLabel(seat).toLowerCase() })}${seat === me ? ` · ${t('lobby.you')}` : ''}</small>${reading(seat)}</div>`
    : `<div class="slot waiting">${t('lobby.waiting')}<small>${t('lobby.empty')}</small></div>`)).join('')}
          </div>
          <p class="sub dep-title">${t('lobby.myGear')}</p>
          ${gearTiles(myLook())}
          ${gearRow(myLook())}
          <div class="lobby-actions">${action}</div>
        </div></div>`);
      if (fresh) {
        mountMenuBackground(els.overlay.querySelector('.menu-bg'));
        $('copy').onclick = async () => {
          $('copy').textContent = await copyText(link, $('link')) ? t('lobby.copied') : t('lobby.copyManual');
        };
        $('invite').onclick = async () => {
          // phones: the system share sheet (Zalo, Messenger...); computers: copy and say so
          if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            try { await navigator.share({ title: t('menu.title'), text: t('social.inviteText', { code: s.code }), url: link }); } catch { /* closed */ }
            return;
          }
          // said on the button itself: a toast would sit on the room's tags
          const btn = $('invite');
          const copied = await copyText(link, $('link'));
          btn.lastChild.textContent = copied ? t('lobby.copied') : t('lobby.copyManual');
          setTimeout(() => { if (btn.isConnected) btn.lastChild.textContent = t('social.invite'); }, 2200);
        };
        if (isHost) {
          $('start').onclick = () => {
            const go = () => send({ t: 'start' });
            if (!ftue.confirmStart(go, nameOf)) go();
          };
          $('vis-toggle').onclick = () => send({ t: 'roomSettings', visibility: s.visibility === 'public' ? 'private' : 'public' });
          $('cap-toggle').onclick = () => {
            const caps = [2, 3, 4].filter((c) => c >= count);
            send({ t: 'roomSettings', cap: caps[(caps.indexOf(s.cap) + 1) % caps.length] });
          };
        } else {
          $('ready').onclick = () => send({ t: 'ready', ready: !s.ready[me] });
        }
        wireGearTiles();
      }
      ftue.decorateLobby();
      break;
    }
    case 'roundIntro':
      setOverlay(`intro-${s.round}`, `
        <div class="panel">
          <h1 class="stamp">${t('round.title', { n: s.round })}</h1>
          ${scoreLine()}
          <p class="sub">${t('round.sub', { color: myColor, n: ROUNDS_TO_WIN })}</p>
        </div>`);
      break;
    case 'rps': {
      if (!s.alive.includes(me)) {
        setOverlay(`rps-watch-${s.round}`, `<div class="panel"><h1 class="stamp" style="font-size:44px">${t('rps.watching')}</h1></div>`);
        break;
      }
      const opp = opponentsOf(me)[0];
      const chosen = s.rpsChosen[me];
      setOverlay(`rps-${s.round}-${chosen}-${s.rpsChosen[opp]}`, `
        <div class="panel">
          <h1 class="stamp" style="font-size:52px">${t('rps.title')}</h1>
          ${chosen ? `<p class="sub">${t('rps.locked')}</p>` : `
          <div class="row">
            ${Object.keys(RPS_ICON).map((k) => `<button class="rps" data-rps="${k}"><span class="icon">${RPS_ICON[k]}</span>${t(`rps.${k}`)}</button>`).join('')}
          </div>`}
          <p class="sub">${t(s.rpsChosen[opp] ? 'rps.oppLocked' : 'rps.oppChoosing', { name: htmlName(opp) })} · <span id="rps-timer"></span></p>
        </div>`);
      els.overlay.querySelectorAll('[data-rps]').forEach((b) => {
        b.onclick = () => send({ t: 'rps', choice: b.dataset.rps });
      });
      break;
    }
    case 'rpsReveal': {
      const [a, b] = s.alive;
      const left = s.alive.includes(me) ? me : a;
      const right = left === a ? b : a;
      const title = !s.rpsWinner ? t('rps.draw') : s.rpsWinner === me ? t('rps.youWin') : t('rps.theyWin', { name: escapeHtml(nameOf(s.rpsWinner)).toUpperCase() });
      setOverlay(`reveal-${s.round}-${s.rpsShow[a]}-${s.rpsShow[b]}-${s.rpsWinner}`, `
        <div class="panel">
          <div class="row">
            <div class="rps ${s.rpsWinner === left ? 'sel' : ''}"><span class="icon">${RPS_ICON[s.rpsShow[left]]}</span>${left === me ? t('rps.you') : escapeHtml(nameOf(left))}</div>
            <span class="stamp" style="font-size:36px">VS</span>
            <div class="rps ${s.rpsWinner === right ? 'sel' : ''}"><span class="icon">${RPS_ICON[s.rpsShow[right]]}</span>${escapeHtml(nameOf(right))}</div>
          </div>
          <h1 class="stamp" style="font-size:44px">${title}</h1>
        </div>`);
      break;
    }
    case 'choose':
      if (s.rpsWinner === me) {
        if (setOverlay(`choose-${s.round}`, `
          <div class="panel">
            <h1 class="stamp" style="font-size:44px">${t('choose.title')}</h1>
            <div class="row">
              <button class="btn pri" id="first">${t('choose.first')}</button>
              <button class="btn" id="yield">${t('choose.yield')}</button>
            </div>
            <p class="sub" style="font-weight:500">${t('choose.note')}</p>
          </div>`)) {
          $('first').onclick = () => send({ t: 'choose', first: true });
          $('yield').onclick = () => send({ t: 'choose', first: false });
        }
      } else {
        setOverlay(`choose-wait-${s.round}`, `<div class="panel"><h1 class="stamp" style="font-size:40px">${t('choose.wait', { name: escapeHtml(nameOf(s.rpsWinner)) })}</h1></div>`);
      }
      break;
    case 'order':
      setOverlay(`order-${s.round}`, `
        <div class="panel">
          <h1 class="stamp" style="font-size:48px">${t('order.title')}</h1>
          <div class="row order">${s.order.map((seat, i) => `${i ? '<span class="arrow">→</span>' : ''}<div class="slot seat ${seat}">${escapeHtml(nameOf(seat))}${seat === me ? `<small>${t('lobby.you')}</small>` : ''}</div>`).join('')}</div>
          <p class="sub">${t('order.sub', { color: myColor })}</p>
        </div>`);
      break;
    case 'roundEnd': {
      const { winner, reason, by, eliminated = [] } = s.result;
      const head = t(reason === 'fall' ? 'result.fall' : reason === 'left' ? 'result.left' : reason === 'afk' ? 'result.afk' : 'result.capture');
      const out = list(eliminated.map(htmlName));
      const how = reason === 'fall' ? t('result.fallHow', { name: htmlName(by) })
        : reason === 'afk' ? t('result.afkHow', { name: htmlName(by) })
          : reason === 'left' ? t('result.leftHow', { out }) : t('result.captureHow', { by: htmlName(by), out });
      setOverlay(`end-${s.round}`, `
        <div class="panel">
          <h1 class="stamp ${winner === me ? '' : 'pink'}">${head}</h1>
          <p class="sub note">${how} ${t('result.roundWinner', { name: htmlName(winner) })}</p>
          ${scoreLine()}
        </div>`, { clear: true });
      break;
    }
    case 'matchEnd': {
      const winner = s.result?.matchWinner ?? s.seats.reduce((a, b) => ((s.scores[b] ?? 0) > (s.scores[a] ?? 0) ? b : a));
      const iWon = winner === me;
      const present = s.seats.filter((seat) => s.players[seat]?.connected);
      const waitingFor = present.filter((seat) => !s.rematch[seat]);
      // Alone at the table: a rematch would wait forever, so offer a fresh room instead (UX-03).
      const alone = present.length < 2;
      const quick = s.kind === 'quick';
      const rematchCount = Object.keys(s.rematch).filter((seat) => present.includes(seat)).length;
      if (setOverlay(`match-${JSON.stringify(s.rematch)}-${present.join()}`, `
        <div class="panel">
          <h1 class="stamp ${iWon ? '' : 'pink'}">${iWon ? t('match.youWin') : t('match.theyWin', { name: escapeHtml(nameOf(winner)).toUpperCase() })}</h1>
          ${scoreLine()}
          ${s.result?.matchReason === 'disconnect' ? `<p class="sub">${t('match.allLeft')}</p>` : ''}
          <div class="row">
            ${quick ? `<button class="btn pri" id="find-new">${t('match.findNew')}</button>` : ''}
            ${quick && !alone ? `<button class="btn" id="rematch" ${s.rematch[me] ? 'disabled' : ''}>${t('match.rematchCount', { n: rematchCount, m: present.length })}</button>` : ''}
            ${!quick && alone ? `<button class="btn pri" id="new-room">${t('match.newRoom')}</button>` : ''}
            ${!quick && !alone ? `<button class="btn pri" id="rematch" ${s.rematch[me] ? 'disabled' : ''}>${s.rematch[me] ? t('match.rematchWaiting') : t('match.rematch')}</button>` : ''}
            <button class="btn" id="menu">${t('match.menu')}</button>
          </div>
          ${quick && !alone ? `<p class="sub">${t('match.quickNote')}</p>` : ''}
          ${waitingFor.length && Object.keys(s.rematch).length ? `<p class="sub">${t('match.waitingFor', { names: list(waitingFor.map(htmlName)) })}</p>` : ''}
        </div>`)) {
        if ($('new-room')) $('new-room').onclick = () => send({ t: 'create', name: playerName.get() || t('menu.defaultName'), look: playerLook.get() });
        if ($('rematch')) $('rematch').onclick = () => send({ t: 'rematch' });
        if ($('find-new')) {
          $('find-new').onclick = () => {
            leaveRoom();
            sendQueue(playerSize.get());
          };
        }
        $('menu').onclick = () => { location.href = location.pathname; };
      }
      break;
    }
    default:
      setOverlay('none', '');
  }
}

function renderHud() {
  const inGame = !['lobby', 'matchEnd'].includes(state.phase);
  els.hud.hidden = !inGame;
  const strength = state.wind.strength;
  els.windText.textContent = t('hud.wind', { n: strength });
  els.windBars.innerHTML = Array.from({ length: 4 }, (_, i) => `<i class="${i < strength ? 'on' : ''}"></i>`).join('');
  els.wind.dataset.level = String(strength);
  visuals.setWind(state.wind, world.table, ['turn', 'anim'].includes(state.phase));
  els.toggle.hidden = !(state.phase === 'turn' && state.turn === me);
  const key = JSON.stringify([state.seats, state.scores, state.alive, state.turn, state.players, SEATS.map((s) => social.isMuted(s))]);
  if (key === hudKey) return;
  hudKey = key;
  els.players.innerHTML = state.seats.map((seat) => {
    const out = !state.alive.includes(seat) && ['turn', 'anim'].includes(state.phase);
    const dots = Array.from({ length: ROUNDS_TO_WIN }, (_, i) => `<span class="dot ${i < (state.scores[seat] ?? 0) ? seat : ''}"></span>`).join('');
    return `<div class="chip ${seat}${out ? ' out' : ''}${state.turn === seat ? ' turn' : ''}${social.isMuted(seat) ? ' muted' : ''}" ${seat === me ? '' : `role="button" tabindex="0" aria-label="${escapeHtml(t(social.isMuted(seat) ? 'social.unmuteAria' : 'social.muteAria', { name: nameOf(seat) }))}"`}>
      <span class="swatch ${seat}"></span><span class="name">${escapeHtml(nameOf(seat))}${seat === me ? ` ${t('hud.meTag')}` : ''}</span><span class="dots">${dots}</span>
    </div>`;
  }).join('');
}

function remainingSeconds() {
  return Math.max(0, Math.ceil((state.remainingMs - (performance.now() - stateAt)) / 1000));
}

const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
const setClass = (el, name) => { if (el.className !== name) el.className = name; };
const setHidden = (el, hidden) => { if (el.hidden !== hidden) el.hidden = hidden; };

function updateBannerAndHint() {
  if (!state || !['turn', 'anim'].includes(state.phase)) {
    setHidden(els.banner, true);
    setHidden(els.hint, true);
    const timer = $('rps-timer');
    if (timer && state) setText(timer, t('rps.timer', { secs: remainingSeconds() }));
    return;
  }
  setHidden(els.banner, false);
  setHidden(els.hint, false);
  const mine = state.turn === me;
  if (state.phase === 'anim' || sim) {
    setText(els.banner, mine ? t(sim ? 'turn.flying' : 'turn.waitReplay') : t('turn.otherSlams', { name: nameOf(state.turn).toUpperCase() }));
    setClass(els.banner, mine ? '' : 'pink');
    setText(els.hint, mine ? t('turn.hintSettle') : t('turn.hintWatching', { name: nameOf(state.turn) }));
    return;
  }
  const secs = remainingSeconds();
  if (mine) {
    setText(els.banner, t(state.forced ? 'turn.forced' : 'turn.mine', { secs }));
    setClass(els.banner, state.forced ? 'pink' : '');
    setText(els.hint, t(state.forced ? 'turn.hintForced' : TOUCH ? 'turn.hintTouch' : 'turn.hintMouse'));
  } else {
    setText(els.banner, t('turn.other', { name: nameOf(state.turn).toUpperCase(), secs }));
    setClass(els.banner, 'pink');
    setText(els.hint, state.alive.includes(me) ? t('turn.hintAiming', { name: nameOf(state.turn) }) : t('turn.hintOut'));
  }
}

let toastTimer;
function showToast(text, ms) {
  els.toast.hidden = false;
  els.toast.textContent = text;
  clearTimeout(toastTimer);
  if (ms) {
    delete els.toast.dataset.sticky;
    toastTimer = setTimeout(hideToast, ms);
  } else {
    els.toast.dataset.sticky = '1';
  }
}
function hideToast() {
  els.toast.hidden = true;
  delete els.toast.dataset.sticky;
}

// ---------- labels ----------

const badges = {};
function badgeFor(seat) {
  if (!badges[seat]) {
    const el = document.createElement('div');
    el.className = `badge ${seat}`;
    els.labels.appendChild(el);
    badges[seat] = el;
  }
  return badges[seat];
}

const labelScreen = {};
const LABEL_DROP = 0.9; // a little more than the card's half diagonal (0.89)
function updateLabels() {
  applyGlows();
  const inRound = Boolean(state) && !['lobby', 'matchEnd'].includes(state.phase);
  for (const seat of SEATS) {
    const card = world.cards[seat];
    const el = badgeFor(seat);
    const show = inRound && namesShown && Boolean(card?.mesh.visible);
    if (el.hidden === show) el.hidden = !show;
    if (!show) continue;
    const { x, y, z } = card.mesh.position;
    const q = card.mesh.quaternion;
    const faceUp = 1 - 2 * (q.x * q.x + q.z * q.z) > 0;
    const owner = seat === me ? t('hud.meTag') : t('card.owner', { name: nameOf(seat) });
    const text = `${t(y < FALL_Y ? 'card.fallen' : faceUp ? 'card.up' : 'card.down')} ${owner}`;
    if (el.textContent !== text) el.textContent = text;
    // under the card on screen, clear of its window: below the point a card's half diagonal
    // toward the camera, whichever way the card lies
    world.toScreen(x, y, z, labelScreen);
    const lx = labelScreen.x;
    world.toScreen(x, y, z + LABEL_DROP, labelScreen);
    const transform = `translate(${lx.toFixed(1)}px, ${(labelScreen.y + 4).toFixed(1)}px) translate(-50%, 0)`;
    if (el.dataset.at !== transform) {
      el.dataset.at = transform;
      el.style.transform = transform;
    }
  }
}

function popText(point, text) {
  const el = document.createElement('div');
  el.className = 'pop';
  el.textContent = text;
  const screen = world.toScreen(point.x, point.y + 0.5, point.z);
  el.style.left = `${screen.x}px`;
  el.style.top = `${screen.y}px`;
  els.labels.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function updateWindArrow() {
  const key = `${state?.wind.angle}-${world.tableKey}`;
  if (!state || key === lastWindKey) return;
  lastWindKey = key;
  const a = world.toScreen(0, 0, 0);
  const b = world.toScreen(Math.cos(state.wind.angle), 0, Math.sin(state.wind.angle));
  els.windArrow.style.transform = `rotate(${Math.atan2(b.y - a.y, b.x - a.x)}rad)`;
  els.windArrow.style.opacity = state.wind.strength === 0 ? 0.25 : 1;
}

// ---------- aiming & slamming ----------

// The slipper takes ~0.2 s to land before the slam reaches the server, so the last half second
// of a turn is closed: a slam sent then would arrive after the turn already timed out.
const LATE_SLAM_MS = 600;
const turnMsLeft = () => state.remainingMs - (performance.now() - stateAt);
const myTurnToAim = () => state && state.phase === 'turn' && state.turn === me && state.alive.includes(me)
  && !sim && !playback && !awaitingServer && turnMsLeft() > LATE_SLAM_MS;
// A tap in that closed last half second used to do nothing at all; now it says why (UX-09).
const tooLate = () => state && state.phase === 'turn' && state.turn === me && state.alive.includes(me)
  && !sim && !playback && !awaitingServer && turnMsLeft() <= LATE_SLAM_MS;
const cardPositions = () => Object.fromEntries(world.seats.map((s) => [s, world.cards[s].mesh.position]));

function isValidAim(point) {
  const mine = world.cards[me].mesh.position;
  const limit = state.forced ? TUNE.forcedRadius : TUNE.reachRadius;
  const distance = Math.hypot(point.x - mine.x, point.z - mine.z);
  return distance <= limit && !world.cardAt(point);
}

function setType(type) {
  slamType = type;
  els.flat.classList.toggle('sel', type === 'flat');
  els.tilt.classList.toggle('sel', type === 'tilt');
}
els.flat.onclick = () => setType('flat');
els.tilt.onclick = () => setType('tilt');
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'q' || e.key === 'Q') setType('flat');
  if (e.key === 'e' || e.key === 'E') setType('tilt');
});

const canvas = world.renderer.domElement;
canvas.addEventListener('pointermove', (e) => {
  pointer = world.pointerToGround(e.clientX, e.clientY);
  pointerMoved = true;
});
// Mouse: click to slam. Touch/pen: press and drag to aim, lift the finger to slam.
let touchAiming = false;
canvas.addEventListener('pointerdown', (e) => {
  if (!myTurnToAim()) {
    const late = tooLate() && world.pointerToGround(e.clientX, e.clientY);
    if (late) popText(late, t('turn.tooLate'));
    return;
  }
  const point = world.pointerToGround(e.clientX, e.clientY);
  if (e.pointerType === 'mouse') {
    if (e.button === 0 && point && isValidAim(point)) slam(point);
    return;
  }
  touchAiming = true;
  canvas.setPointerCapture(e.pointerId);
  pointer = point;
  pointerMoved = true;
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse' || !touchAiming) return;
  touchAiming = false;
  const point = world.pointerToGround(e.clientX, e.clientY);
  pointer = null;
  pointerMoved = true;
  if (point && myTurnToAim() && isValidAim(point)) slam(point);
  else if (point && tooLate()) popText(point, t('turn.tooLate'));
});
canvas.addEventListener('pointercancel', () => {
  touchAiming = false;
  pointer = null;
  pointerMoved = true;
});

// The slap landing: hit burst, camera shake and the thump, all scaled by how hard it was.
function impactFx(point, strength, volume) {
  thump(volume);
  visuals.hit.play(point, strength);
  world.shake(0.25 + strength * 0.45);
}

function shakeHand(point) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * TUNE.handShake;
    const actual = new THREE.Vector3(point.x + Math.cos(angle) * radius, 0, point.z + Math.sin(angle) * radius);
    if (!world.cardAt(actual, 0)) return actual;
  }
  return point.clone();
}

// A slam in flight. The aim goes to the server at once and the slipper starts falling toward it;
// the server answers with where the shaking hand actually lands and the seed of the spin luck
// (slamGo), and the slipper slides to that point. Physics starts once it has landed and the answer
// is in: on a normal connection the answer beats the 140 ms fall, so nothing waits.
let pendingSlam = null;

function slam(aim) {
  awaitingServer = true;
  ftue.onSlam();
  visuals.hideAim();
  const type = slamType;

  // a slap that reaches no card is a pass: nothing to simulate, the server only hears where it fell
  if (world.slamEffects(aim, type).length === 0) {
    const impact = shakeHand(aim);
    visuals.dropDep(impact, () => {
      impactFx(impact, 0.25, 0.4);
      send({ t: 'pass', impact: { x: impact.x, z: impact.z } });
    }, depOf(me), depColorsOf(me));
    return;
  }

  const pending = { target: aim.clone(), type, go: null, landed: false };
  pendingSlam = pending;
  send({ t: 'slamStart', aim: { x: aim.x, z: aim.z }, type });
  visuals.dropDep(pending.target, () => {
    pending.landed = true;
    beginSlam(pending);
  }, depOf(me), depColorsOf(me));
}

function onSlamGo(msg) {
  const pending = pendingSlam;
  if (!pending) return;
  pending.go = msg;
  pending.target.set(msg.impact.x, 0, msg.impact.z);
  beginSlam(pending);
}

function beginSlam(pending) {
  if (pendingSlam !== pending || !pending.landed || !pending.go) return;
  pendingSlam = null;
  const { target: impact, type, go } = pending;
  const effects = world.slamEffects(impact, type);
  const strength = effects.length ? Math.max(...effects.map((e) => e.strength)) : 0.25;
  impactFx(impact, strength, 0.5 + strength * 0.5);
  popText(impact, t('card.pop'));
  setTimeout(() => {
    world.applySlam(impact, type, seededRandom(go.seed));
    sim = { frames: [], sent: 0, acc: 0, last: performance.now(), steps: 0, calm: 0, impact: { x: impact.x, z: impact.z }, type };
    petsRun();
  }, TUNE.hitstopMs);
}

function autoSlam() {
  if (!state || state.phase !== 'turn' || state.turn !== me || sim || playback || pendingSlam) return;
  const mine = world.cards[me].mesh.position;
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = TUNE.forcedRadius * (0.6 + Math.random() * 0.4);
    const point = new THREE.Vector3(mine.x + Math.cos(angle) * radius, 0, mine.z + Math.sin(angle) * radius);
    if (isValidAim(point)) {
      slam(point);
      return;
    }
  }
}

function stepSim(now) {
  sim.acc += Math.min((now - sim.last) / 1000, 0.1) * timeScale;
  sim.last = now;
  while (sim.acc >= TUNE.fixedDt) {
    sim.acc -= TUNE.fixedDt;
    world.stepPhysics(state.wind);
    sim.frames.push(world.recordFrame());
    sim.steps += 1;
    sim.calm = world.isSettled() ? sim.calm + 1 : 0;
  }
  world.syncMeshes();
  if (!sim.local && sim.frames.length - sim.sent >= TUNE.net.chunkSteps) flushChunk();

  const seconds = sim.steps * TUNE.fixedDt;
  const falling = world.isSomethingFalling();
  const done = (sim.calm >= TUNE.settle.steps && sim.steps > 15 && !falling)
    || (seconds > TUNE.settle.softCapSeconds && !falling)
    || seconds > TUNE.settle.hardCapSeconds;
  if (!done) return;

  const final = world.readCards();
  const local = sim.local;
  if (local) lastLocalFrames = sim.frames;
  if (!local) {
    flushChunk();
    send({ t: 'slamEnd', final });
    lastSlamStats = slamStats(sim.frames, me);
  }
  for (const seat of state?.alive ?? []) world.react(seat, 'idle');
  sim = null;
  if (!local) resyncCards();
}

function flushChunk() {
  if (sim.frames.length === sim.sent) return;
  send({ t: 'slamChunk', frames: sim.frames.slice(sim.sent) });
  sim.sent = sim.frames.length;
}

// Other players' slams arrive in small chunks while still flying. Frames are played a few
// behind the newest one; if the network stalls, playback holds and the buffer grows.
function startPlayback(msg) {
  petsRun();
  const impact = new THREE.Vector3(msg.impact.x, 0, msg.impact.z);
  const current = {
    by: msg.by, buffer: [], cursor: 0, ended: false, final: null, playing: false, impactDone: false,
    target: TUNE.net.startBuffer, last: performance.now(),
  };
  playback = current;
  visuals.dropDep(impact, () => {
    impactFx(impact, 0.8, 0.8);
    popText(impact, t('card.pop'));
    setTimeout(() => { current.impactDone = true; }, TUNE.hitstopMs);
  }, depOf(msg.by), depColorsOf(msg.by));
}

function finishPlayback() {
  for (const seat of state?.alive ?? []) world.react(seat, 'idle');
  lastSlamStats = slamStats(playback.buffer, playback.by);
  world.setCards(playback.final);
  playback = null;
  send({ t: 'playbackDone' });
  resyncCards();
}

function stepPlayback(now) {
  const p = playback;
  const dt = Math.min((now - p.last) / 1000, 0.1);
  p.last = now;
  if (!p.impactDone) return;
  const available = p.buffer.length;
  if (!p.playing) {
    if (available - p.cursor >= p.target || p.ended) p.playing = true;
    else return;
  }
  const next = p.cursor + dt * 60;
  if (next > available - 1 && !p.ended) {
    p.playing = false;
    p.target = Math.min(p.target + 3, TUNE.net.maxBuffer);
    return;
  }
  p.cursor = Math.max(0, Math.min(next, available - 1));
  if (available) world.applyFrame(p.buffer[Math.floor(p.cursor)]);
  if (p.ended && p.cursor >= available - 1) finishPlayback();
}

function updateAim() {
  if (!myTurnToAim()) {
    if (!sim) visuals.hideAim();
    return;
  }
  const enemies = world.activeSeats.filter((s) => s !== me).map((s) => world.cards[s].mesh.position);
  visuals.showStandoff(world.cards[me].mesh.position, enemies, state.forced);
  if (!pointer) {
    visuals.hideCursor();
    return;
  }
  const valid = isValidAim(pointer);
  visuals.showCursor(pointer, valid, world.slamEffects(pointer, slamType), cardPositions());
  canvas.style.cursor = valid ? 'crosshair' : 'not-allowed';
}

// ---------- loop ----------

let couldAim = false;
let lastFrameAt = performance.now();
let timeScale = 1; // debug only: slow motion to inspect effects
let windClock = 0;
const IDLE_FRAME = 1 / 30;
// The HUD's top and bottom bands, measured from the page itself (they move with the screen size,
// the orientation and the number of players), so the camera frames the table between them.
// Hidden pieces count where they will appear (the turn banner, the hint).
let safeAt = 0;
function updateSafeArea(now) {
  if (now - safeAt < 400) return;
  safeAt = now;
  const hud = document.getElementById('hud');
  if (hud.hidden) { world.setSafeArea(0, 0); return; }
  const h = innerHeight;
  const rect = (id) => { const el = document.getElementById(id); return el && !el.hidden ? el.getBoundingClientRect() : null; };
  const reserve = (id, size) => {
    const cs = getComputedStyle(document.getElementById(id));
    const top = parseFloat(cs.top); const bottom = parseFloat(cs.bottom);
    return Number.isFinite(top) && top < h / 2 ? { top: top + size } : Number.isFinite(bottom) ? { bottom: bottom + size } : {};
  };
  let top = 0; let bottom = 0;
  for (const r of [rect('players'), rect('wind'), rect('corner'), rect('toggle'), rect('social-fabs')]) {
    if (!r || r.height === 0) continue;
    if (r.top < h / 2) top = Math.max(top, r.bottom);
    else bottom = Math.max(bottom, h - r.top);
  }
  const banner = reserve('banner', 34);
  const hint = reserve('hint', 40);
  top = Math.max(top, banner.top ?? 0, hint.top ?? 0);
  bottom = Math.max(bottom, banner.bottom ?? 0, hint.bottom ?? 0);
  world.setSafeArea(top + 6, bottom + 6);
}

function frame(now) {
  // schedule first: an error below must never stop the render loop
  requestAnimationFrame(frame);
  updateSafeArea(now);
  social.update();
  social.frame(now);
  const dt = Math.min((now - lastFrameAt) / 1000, 0.1) * timeScale;
  lastFrameAt = now;
  visuals.lastFrameAt = now;
  if (sim) stepSim(now);
  if (playback) stepPlayback(now);
  if (visuals.hit.update(dt, world.camera)) world.needsRender = true;
  if (visuals.trails.update(world.cards, world.camera)) world.needsRender = true;
  if (state) {
    const canAim = myTurnToAim();
    if (pointerMoved || canAim !== couldAim) {
      updateAim();
      couldAim = canAim;
      pointerMoved = false;
      world.needsRender = true;
    }
    updateBannerAndHint();
    updateWindArrow();
    ftue.frame(now, canAim);
  }
  if (visuals.busy) world.needsRender = true;
  windClock += dt;
  if (windClock >= IDLE_FRAME) {
    if (visuals.updateWind(windClock, world.camera)) world.needsRender = true;
    windClock = 0;
  }
  if (world.render()) {
    updateLabels();
    drawnFrames++;
  }
}

let drawnFrames = 0;
setInterval(() => {
  setText(els.fps, drawnFrames < 5 ? t('net.fpsIdle') : t('net.fps', { n: drawnFrames }));
  els.fps.classList.toggle('bad', drawnFrames >= 5 && drawnFrames < 40);
  drawnFrames = 0;
}, 1000);

setInterval(() => {
  if (!state) return;
  send({ t: 'ping', at: performance.now() });
  const silent = performance.now() - lastPong;
  const slow = silent > TUNE.net.slowPingMs;
  if (slow && !els.toast.dataset.sticky) showToast(t('net.lag'), 2500);
  els.ping.textContent = slow ? t('net.pingUnknown') : t('net.ping', { n: pingMs });
  els.ping.classList.toggle('bad', slow || pingMs > 250);
}, TUNE.net.pingMs);

// Hidden, minimized or occluded tabs get no animation frames: finish the slam or the
// replay right away so the match never waits on a page nobody is looking at.
setInterval(() => {
  if (!document.hidden && performance.now() - lastFrameAt < 500) return;
  while (sim) {
    sim.last -= 100;
    stepSim(performance.now());
  }
  if (playback?.ended) finishPlayback();
}, 250);

let lastLocalFrames = null;
if (new URLSearchParams(location.search).has('debug')) {
  window.slamDebug = {
    get state() { return state; },
    get me() { return me; },
    world,
    renderAssets: (opts) => import('./asset-studio.js').then((m) => m.renderAssets(opts)),
    meme: showMeme,
    visuals,
    set timeScale(v) { timeScale = v; },
    previewDeps: (seats = ['black', 'pink', 'blue']) => {
      seats.forEach((seat, i) => {
        const model = depModel(depOf(seat))?.clone();
        if (!model) return;
        model.position.set((i - 1) * 1.6, 0, 1.2);
        model.rotation.y = 0.4;
        world.scene.add(model);
      });
      world.needsRender = true;
    },
    cards: () => world.readCards(),
    turnMsLeft: () => (state?.phase === 'turn' ? turnMsLeft() : 0),
    place: (cards) => world.setCards(cards),
    effects: (x, z, type = 'flat') => world.slamEffects(new THREE.Vector3(x, 0, z), type),
    // the frames of the last localSlam (qa/slam-record.mjs feeds them to the server's slam check)
    get lastLocalFrames() { return lastLocalFrames; },
    localSlam: (x, z, type = 'flat') => {
      world.applySlam(new THREE.Vector3(x, 0, z), type);
      sim = { frames: [], sent: 0, acc: 0, last: performance.now(), steps: 0, calm: 0, local: true, type };
    },
    // Filming the launch videos (qa/film): a slam that looks and sounds like a real one (slipper drop, hit, pop, shake,
    // the pets running) but only runs here and tells the server nothing, so a posed take can be tried again and again.
    filmSlam: (x, z, type = 'flat') => {
      const impact = new THREE.Vector3(x, 0, z);
      const effects = world.slamEffects(impact, type);
      visuals.dropDep(impact, () => {
        const strength = effects.length ? Math.max(...effects.map((e) => e.strength)) : 0.25;
        impactFx(impact, strength, 0.5 + strength * 0.5);
        if (effects.length) popText(impact, t('card.pop'));
        setTimeout(() => {
          world.applySlam(impact, type);
          sim = { frames: [], sent: 0, acc: 0, last: performance.now(), steps: 0, calm: 0, local: true, type };
          petsRun();
        }, TUNE.hitstopMs);
      }, depOf(me), depColorsOf(me));
    },
    get simulating() { return Boolean(sim); },
    slamAt: (x, z) => {
      const point = new THREE.Vector3(x, 0, z);
      if (!myTurnToAim() || !isValidAim(point)) return false;
      slam(point);
      return true;
    },
  };
}

world.setCards(MENU_CARDS);
loadDeps().catch((err) => console.warn('slipper models unavailable, using fallback', err));
connect();
requestAnimationFrame(frame);
