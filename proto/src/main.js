import * as THREE from 'three';
import { World } from './world.js';
import { Visuals } from './visuals.js';
import { TUNE } from './config.js';
import { SEATS, ROUNDS_TO_WIN, FALL_Y, MAX_PLAYERS } from './rules.js';
import { thump } from './sound.js';
import { playMusic, refreshMusic } from './music.js';
import { getLevel, setLevel } from './audio.js';
import { mountMenuBackground } from './menu-bg.js';
import { playIntro } from './intro.js';
import { loadDeps, depModel, depModelFor, DEFAULT_DEP } from './deps.js';
import { PETS, DEP_IDS, CARD_COLORS, SEAT_DEFAULTS, cleanLook } from './catalog.js';
import { renderWardrobe, gearTiles, petThumb, stopPreview } from './wardrobe.js';
import { showMeme, preloadMemes, setMemesEnabled, memesEnabled } from './memes.js';
import { createFtue } from './ftue.js';
import { t, has, detectLang, loadLang, setLang, lang, availableLangs, applyStatic } from './i18n.js';

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

function showFatal() {
  els.overlay.className = '';
  els.overlay.innerHTML = `
    <div class="menu-bg"><div class="panel menu-card">
      <h1 class="stamp title fatal-title">${escapeHtml(t('fatal.title'))}</h1>
      <p class="sub">${escapeHtml(t('fatal.body'))}</p>
    </div></div>`;
}

await loadLang(detectLang());
document.title = t('menu.title');
applyStatic();
$('info-by').innerHTML = t('info.by', { name: '<b>BillTheDev</b>' });
for (const id of ['credit', 'info-credit']) $(id).textContent = t('info.cardArt', { name: 'Dani Maccari' });
els.windText.textContent = t('hud.wind', { n: 0 });

// Language: a small globe button in the corner (short code only, so it fits beside ?/Info/Sound on
// phones) opening a panel of native names. Shown once a second language ships; picking reloads.
const LANG_SHORT = { 'zh-Hans': '简', 'zh-Hant': '繁', 'pt-BR': 'PT' };
const GLOBE = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c2 2 2.8 4.2 2.8 6.5S10 12.5 8 14.5M8 1.5C6 3.5 5.2 5.7 5.2 8S6 12.5 8 14.5"/></svg>';
const CROWN = '<svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M1 10 L2 3 L5 6 L7 1.5 L9 6 L12 3 L13 10 Z"/></svg>';
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
els.flat.textContent = TOUCH ? t('turn.flat') : `${t('turn.flat')} · Q`;
els.tilt.textContent = TOUCH ? t('turn.tilt') : `${t('turn.tilt')} · E`;
const ftue = createFtue({
  send,
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
  // a typed code that matches nothing is most likely a typo, not an expired room (QA-02)
  if (!msg.exists) refuse(t(typed ? 'error.typedNotFound' : 'error.roomGone', { code }));
  else if (msg.mine) joinRoom(code, token);
  else if (msg.phase !== 'lobby' || msg.quick) refuse(t('error.inMatchWait', { code })); // UX-08: say when to come back
  else if (msg.full) refuse(t('error.full'));
  else if (playerName.get()) joinRoom(code, null);
  else renderNamePrompt(code);
}

// Back to a clean menu: no room, no leftover HUD, labels or toasts from the last match.
function leaveRoom() {
  state = null;
  me = null;
  roomCode = null;
  pendingPeek = null;
  sim = null;
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

function showNetFail() {
  const card = $('netfail');
  if (!card.hidden) return;
  hideToast();
  card.hidden = false;
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

function onMessage(msg) {
  if (msg.t === 'joined') {
    queueing = null;
    stopRoomsPolling();
    me = msg.color;
    roomCode = msg.code;
    saveToken(roomCode, msg.token);
    history.replaceState(null, '', `?room=${roomCode}`);
    lastPong = performance.now();
    hideToast();
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
  } else if (msg.t === 'playAbort') {
    playback = null;
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

function onState(next) {
  state = next;
  stateAt = performance.now();
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
function announceEvent() {
  const event = state.event;
  const key = event ? `${state.round}-${event.type}-${event.by}-${event.eliminated}` : '';
  if (key === lastEventKey) return;
  lastEventKey = key;
  if (!event?.eliminated?.length || state.phase === 'roundEnd') return;
  const out = list(event.eliminated.map(nameOf));
  const text = event.type === 'fall' ? t('toast.fall', { name: nameOf(event.by) })
    : event.type === 'afk' ? t('toast.afk', { name: nameOf(event.by) })
      : event.type === 'left' ? t('toast.left', { out }) : t('toast.capture', { by: nameOf(event.by), out });
  showToast(text, 2500);
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

  if (s.phase === 'turn' && s.turn === me && s.forced) showMeme('forced');
  if (s.phase === 'roundEnd' && s.result?.winner === me) showMeme('roundWin');
  if (s.phase === 'matchEnd') showMeme(s.result?.matchWinner === me ? 'matchWin' : 'matchLose');
  if (s.phase === 'roundIntro') {
    const onMatchPoint = s.seats.filter((seat) => (s.scores[seat] ?? 0) === ROUNDS_TO_WIN - 1).length;
    if (onMatchPoint >= 2) showMeme('tie');
  }
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
// can press one button and play (UX-07). It is only saved once they actually go.
const randomName = () => {
  const names = t('menu.randomNames').split('|').map((n) => n.trim()).filter(Boolean);
  return names[Math.floor(Math.random() * names.length)] ?? '';
};
function nameField() {
  return `<label class="name-field">${t('menu.nameLabel')}
    <input class="input name" id="name" maxlength="16" placeholder="${escapeHtml(t('menu.namePlaceholder'))}" value="${escapeHtml(playerName.get() || randomName())}" autocomplete="nickname">
  </label>`;
}

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

const logo = () => `<h1 class="stamp title">${escapeHtml(t('menu.logo')).replace(/\n/g, '<br>')}</h1>`;
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
    <div class="menu-bg"><div class="panel menu-card">
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
          <span class="seg-big">${t(`create.${v}`)}</span><small>${t(`create.${v}Sub`)}</small></button>`).join('')}
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
        <img class="room-av" src="deps/${r.dep ?? 'dep_lao'}.jpg" alt="">
        <span class="room-name">${t('rooms.room', { code: escapeHtml(r.code) })}
          <small>${t('rooms.count', { n: r.n, cap: r.cap })} <span class="tag ${open ? 'ok' : 'busy'}">${t(open ? 'rooms.waiting' : 'rooms.playing')}</span></small></span>
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
        setOverlay('quick-found', `<div class="panel"><h1 class="stamp" style="font-size:52px">${t('queue.found')}</h1></div>`);
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
          <button class="tag-btn" id="vis-toggle" ${isHost ? '' : 'disabled'}>${t(`create.${s.visibility}`)}${isHost ? ' ▾' : ''}</button>
          <button class="tag-btn" id="cap-toggle" ${isHost ? '' : 'disabled'}>${t('lobby.capTag', { n: s.cap })}${isHost ? ' ▾' : ''}</button>
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
        <div class="menu-bg"><div class="panel menu-card">
          <h1 class="stamp" style="font-size:44px">${t('lobby.title', { code: `<span class="code">${s.code}</span>` })}</h1>
          <p class="sub">${t('lobby.sub')}</p>
          ${tags}
          <div class="row">
            <label><input class="input" style="width:min(340px,70vw);text-transform:none" id="link" value="${link}" readonly aria-label="${escapeHtml(t('lobby.linkLabel'))}"></label>
            <button class="btn" id="copy">${t('lobby.copy')}</button>
          </div>
          <div class="seats">
            ${SEATS.slice(0, Math.max(s.cap, count)).map((seat) => (s.players[seat] ? `
              <div class="slot seat ${seat}">${seatTag(seat)}<img class="slot-dep pet" src="${petThumb(petOf(seat))}" alt="">${escapeHtml(s.players[seat].name)}<small>${t('lobby.seatCard', { color: seatLabel(seat).toLowerCase() })}${seat === me ? ` · ${t('lobby.you')}` : ''}</small>${reading(seat)}</div>`
    : `<div class="slot waiting">${t('lobby.waiting')}<small>${t('lobby.empty')}</small></div>`)).join('')}
          </div>
          <p class="sub dep-title">${t('lobby.myGear')}</p>
          ${gearTiles(myLook())}
          ${action}
        </div></div>`);
      if (fresh) {
        mountMenuBackground(els.overlay.querySelector('.menu-bg'));
        $('copy').onclick = async () => {
          $('copy').textContent = await copyText(link, $('link')) ? t('lobby.copied') : t('lobby.copyManual');
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
  const key = JSON.stringify([state.seats, state.scores, state.alive, state.turn, state.players]);
  if (key === hudKey) return;
  hudKey = key;
  els.players.innerHTML = state.seats.map((seat) => {
    const out = !state.alive.includes(seat) && ['turn', 'anim'].includes(state.phase);
    const dots = Array.from({ length: ROUNDS_TO_WIN }, (_, i) => `<span class="dot ${i < (state.scores[seat] ?? 0) ? seat : ''}"></span>`).join('');
    return `<div class="chip ${seat}${out ? ' out' : ''}${state.turn === seat ? ' turn' : ''}">
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
function updateLabels() {
  const inRound = Boolean(state) && !['lobby', 'matchEnd'].includes(state.phase);
  for (const seat of SEATS) {
    const card = world.cards[seat];
    const el = badgeFor(seat);
    const show = inRound && Boolean(card?.mesh.visible);
    if (el.hidden === show) el.hidden = !show;
    if (!show) continue;
    const { x, y, z } = card.mesh.position;
    const q = card.mesh.quaternion;
    const faceUp = 1 - 2 * (q.x * q.x + q.z * q.z) > 0;
    const owner = seat === me ? t('hud.meTag') : t('card.owner', { name: nameOf(seat) });
    const text = `${t(y < FALL_Y ? 'card.fallen' : faceUp ? 'card.up' : 'card.down')} ${owner}`;
    if (el.textContent !== text) el.textContent = text;
    // just under the card on screen, whichever way the camera faces the table
    world.toScreen(x, y, z, labelScreen);
    const transform = `translate(${labelScreen.x.toFixed(1)}px, ${(labelScreen.y + 30).toFixed(1)}px) translate(-50%, 0)`;
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

function slam(aim) {
  awaitingServer = true;
  ftue.onSlam();
  visuals.hideAim();
  const impact = shakeHand(aim);
  const type = slamType;
  const effects = world.slamEffects(impact, type);
  const impactMsg = { x: impact.x, z: impact.z };

  if (effects.length === 0) {
    visuals.dropDep(impact, () => {
      impactFx(impact, 0.25, 0.4);
      send({ t: 'pass', impact: impactMsg });
    }, depOf(me), depColorsOf(me));
    return;
  }

  visuals.dropDep(impact, () => {
    const strength = Math.max(...effects.map((e) => e.strength));
    impactFx(impact, strength, 0.5 + strength * 0.5);
    popText(impact, t('card.pop'));
    send({ t: 'slamStart', impact: impactMsg, type });
    setTimeout(() => {
      world.applySlam(impact, type);
      sim = { frames: [], sent: 0, acc: 0, last: performance.now(), steps: 0, calm: 0, impact: impactMsg, type };
      petsRun();
    }, TUNE.hitstopMs);
  }, depOf(me), depColorsOf(me));
}

function autoSlam() {
  if (!state || state.phase !== 'turn' || state.turn !== me || sim || playback) return;
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
function frame(now) {
  // schedule first: an error below must never stop the render loop
  requestAnimationFrame(frame);
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

if (new URLSearchParams(location.search).has('debug')) {
  window.slamDebug = {
    get state() { return state; },
    world,
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
    localSlam: (x, z, type = 'flat') => {
      world.applySlam(new THREE.Vector3(x, 0, z), type);
      sim = { frames: [], sent: 0, acc: 0, last: performance.now(), steps: 0, calm: 0, local: true, type };
    },
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
