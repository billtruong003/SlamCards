import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { SEATS, MAX_PLAYERS, ROUNDS_TO_WIN, PARKED, judge, initialCards } from '../src/rules.js';
import { TUNE } from '../src/config.js';
import { cleanName as cleanNameText, cleanChat } from './names.js';
import { withMeta } from './meta.js';
import { adsConfig, adsFileClient, withAds, adsTxt } from './ads.js';
import * as refs from './refs.js';
import { cleanLook, CARD_COLOR_IDS, SEAT_DEFAULTS, defaultDepColors, REACTIONS, CHAT_MAX } from '../src/catalog.js';

const PORT = Number(process.env.PORT) || 8097;
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const TUTORIAL_STEPS = 5;

const TIMING = {
  roundIntro: 2000,
  rps: 6000,
  rpsReveal: 1600,
  choose: 12000,
  order: 2600,
  turn: 30000,
  awayTurn: 8000,
  forcedGrace: 10000,
  slamMaxMs: 15000,
  watchMaxMs: 4000,
  roundEnd: 3200,
  disconnect: 60000,
  // Lobby seats wait a long time: on a phone, switching to a chat app to send the invite link
  // drops the connection at once, and the room must still be there when the player comes back.
  lobbyDisconnect: 60000,
  lobbyHostDisconnect: 180000,
  quickStart: 1200,      // quick match: room made, then the first round starts
  anyCountdown: 5000,    // quick match "any": 2 found, then wait this long for more
  queueTick: 400,
};
// Tests shorten the clock: SLAM_TIMING='{"turn":500}'.
Object.assign(TIMING, JSON.parse(process.env.SLAM_TIMING || '{}'));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.ico': 'image/x-icon',
};

// Where players come from (refs.js), read with the key from SLAM_STATS_KEY; without one the page does not exist.
const STATS_KEY = process.env.SLAM_STATS_KEY || '';
// Ads: off unless SLAM_ADSENSE_CLIENT is set, either in the environment or in data/ads.json ({"client": "ca-pub-…"},
// kept on the VPS next to refs.json so deploys and pm2 restarts never drop it); the environment wins (server/ads.js).
const ADS = adsConfig({ SLAM_ADSENSE_CLIENT: adsFileClient(path.join(path.dirname(refs.REFS_FILE), 'ads.json')), ...process.env });
if (ADS) console.log(`[ads] on: ${ADS.client}${ADS.test ? ' (test mode)' : ''}`);

const server = http.createServer((req, res) => {
  let urlPath;
  let query;
  try {
    const url = new URL(req.url, 'http://x');
    urlPath = decodeURIComponent(url.pathname);
    query = url.searchParams;
  } catch {
    res.writeHead(400);
    res.end('bad request');
    return;
  }
  if (urlPath === '/__refs' && STATS_KEY && query.get('key') === STATS_KEY) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(refs.snapshot(), null, 1));
    return;
  }
  if (urlPath === '/ads.txt') {
    const body = adsTxt(ADS);
    res.writeHead(body ? 200 : 404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    res.end(body ?? 'not found');
    return;
  }
  let file = path.join(DIST, urlPath);
  if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    // the page itself carries the link preview tags for this address (meta.js)
    if (file.endsWith(`${path.sep}index.html`)) data = withAds(withMeta(data.toString('utf8'), query), ADS);
    const immutable = urlPath.startsWith('/assets/');
    const media = urlPath.startsWith('/audio/') || urlPath.startsWith('/memes/') || urlPath.endsWith('.png');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : media ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2 * 1024 * 1024 });
const rooms = new Map();

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

const DEPS = ['dep_lao', 'dep_to_ong', 'dep_le'];
const DEFAULT_DEP = { black: 'dep_lao', pink: 'dep_le', blue: 'dep_to_ong', green: 'dep_lao' };
const cleanDep = (dep, seat) => (DEPS.includes(dep) ? dep : DEFAULT_DEP[seat]);

// Control characters and angle brackets out, 16 characters, and no swear words (names.js):
// strangers see each other's names in quick matches.
const cleanName = (name) => cleanNameText(name) || `Dép #${crypto.randomInt(10, 100)}`;

// A new player's look: their pick, with the card colour moved to a free one if it is taken
// (seat order first) and a default pet for the seat when they have none yet.
function makePlayer(room, seat, msg) {
  const look = cleanLook(msg.look ?? { dep: msg.dep }, cleanDep(msg.dep, seat));
  const taken = new Set(Object.values(room.players).map((p) => p.cardColor));
  const wanted = look.cardColor && !taken.has(look.cardColor) ? look.cardColor : null;
  const cardColor = wanted ?? [SEAT_DEFAULTS[seat].cardColor, ...CARD_COLOR_IDS].find((c) => !taken.has(c));
  return { token: crypto.randomUUID(), name: uniqueName(room, cleanName(msg.name)), ...look, pet: look.pet ?? SEAT_DEFAULTS[seat].pet, cardColor };
}

// Two players with the same name get a number: "Tí vô danh", "Tí vô danh 2".
function uniqueName(room, name) {
  const taken = new Set(Object.values(room.players).map((p) => p.name));
  let candidate = name;
  for (let n = 2; taken.has(candidate); n++) candidate = `${name.slice(0, 13)} ${n}`;
  return candidate;
}

function log(room, text) {
  console.log(`[${room.code}] ${text}`);
}

// kind: 'friends' (made with Create room: a lobby, a host, an invite link) or 'quick' (made by
// the matchmaker: starts at once, never listed). visibility: 'private' (link only) or 'public'
// (in the room list). cap: most players allowed, 2-4.
function newRoom({ kind = 'friends', visibility = 'private', cap = MAX_PLAYERS } = {}) {
  const room = {
    code: newCode(),
    kind,
    visibility: kind === 'quick' ? 'private' : visibility,
    cap,
    host: null,
    joinOrder: [],
    ready: {},
    timeouts: {},
    players: {},
    seats: [],
    alive: [],
    phase: 'lobby',
    round: 0,
    scores: {},
    turn: null,
    wind: { angle: 0, strength: 0 },
    passStreak: {},
    cards: {},
    rps: {},
    rpsWinner: null,
    order: [],
    nextFirst: null,
    firstOut: null,
    result: null,
    event: null,
    rematch: {},
    deadline: 0,
    timer: null,
    slam: null,
  };
  rooms.set(room.code, room);
  return room;
}

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

const connectedSeats = (room) => room.seats.filter((s) => room.players[s]?.connected);

function publicState(room, you) {
  return {
    t: 'state',
    you,
    code: room.code,
    phase: room.phase,
    round: room.round,
    seats: room.seats,
    alive: room.alive,
    scores: room.scores,
    turn: room.turn,
    wind: room.wind,
    forced: room.turn ? room.passStreak[room.turn] >= 1 : false,
    cards: room.cards,
    players: Object.fromEntries(Object.entries(room.players).map(([seat, p]) => [seat, {
      connected: p.connected, name: p.name, left: Boolean(p.left), tutorial: p.tutorial || 0,
      dep: p.dep, depColors: p.depColors, pet: p.pet, cardColor: p.cardColor,
    }])),
    rpsChosen: Object.fromEntries(room.seats.map((s) => [s, Boolean(room.rps[s])])),
    rpsShow: room.phase === 'rpsReveal' ? room.rps : null,
    rpsWinner: room.rpsWinner,
    order: room.order,
    result: room.result,
    event: room.event,
    rematch: room.rematch,
    kind: room.kind,
    visibility: room.visibility,
    cap: room.cap,
    host: room.host,
    ready: room.ready,
    remainingMs: room.deadline ? Math.max(0, room.deadline - Date.now()) : 0,
  };
}

function broadcast(room) {
  for (const [seat, player] of Object.entries(room.players)) send(player.ws, publicState(room, seat));
}

function sendAll(room, msg) {
  for (const player of Object.values(room.players)) send(player.ws, msg);
}

// Reactions and chat lines: at most 3 of each in 5 s per player, whatever the client says.
const SPAM_WINDOW = 5000;
const SPAM_MAX = 3;
function allowed(player, kind) {
  const now = Date.now();
  player.recent ??= {};
  const recent = (player.recent[kind] ?? []).filter((at) => now - at < SPAM_WINDOW);
  if (recent.length >= SPAM_MAX) {
    player.recent[kind] = recent;
    return false;
  }
  recent.push(now);
  player.recent[kind] = recent;
  return true;
}
const CHAT_KEEP = 30;

function others(room, seat) {
  return Object.entries(room.players).filter(([s]) => s !== seat).map(([, p]) => p);
}

function schedule(room, ms, fn) {
  clearTimeout(room.timer);
  room.deadline = Date.now() + ms;
  room.timer = setTimeout(() => {
    room.deadline = 0;
    try {
      fn();
    } catch (err) {
      console.error(`[${room.code}] timer failed`, err);
    }
  }, ms);
}

// Cards of players who are out of the round always stay parked, whatever a slammer reports.
function parkInactive(room, cards) {
  for (const seat of room.seats) if (!room.alive.includes(seat)) cards[seat] = PARKED;
  return cards;
}

// A slam point the client sent: finite numbers inside the slammer's reach, or null.
function cleanImpact(room, seat, impact) {
  const x = Number(impact?.x);
  const z = Number(impact?.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const card = room.cards[seat]?.p;
  if (!card) return null;
  const reach = (room.passStreak[seat] >= 1 ? TUNE.forcedRadius : TUNE.reachRadius) + TUNE.handShake + 0.3;
  return Math.hypot(x - card[0], z - card[2]) <= reach ? { x, z } : null;
}

// ---------- match flow ----------

function startMatch(room) {
  room.seats = SEATS.filter((s) => room.players[s]);
  room.round = 0;
  room.scores = Object.fromEntries(room.seats.map((s) => [s, 0]));
  room.rematch = {};
  room.ready = {};
  room.timeouts = Object.fromEntries(room.seats.map((s) => [s, 0]));
  room.nextFirst = null;
  log(room, `match start with ${room.seats.length} players (${room.kind})`);
  startRound(room);
}

function startRound(room) {
  room.slam = null;
  room.round += 1;
  room.alive = room.seats.filter((s) => !room.players[s].left);
  room.cards = { ...Object.fromEntries(room.seats.map((s) => [s, PARKED])), ...initialCards(room.alive) };
  room.passStreak = Object.fromEntries(room.seats.map((s) => [s, 0]));
  room.turn = null;
  room.result = null;
  room.event = null;
  room.firstOut = null;
  room.phase = 'roundIntro';
  schedule(room, TIMING.roundIntro, () => (room.alive.length === 2 ? startRps(room) : startOrder(room)));
  broadcast(room);
}

// Two players: rock-paper-scissors, the winner picks who slams first.
function startRps(room) {
  room.rps = {};
  room.rpsWinner = null;
  room.phase = 'rps';
  schedule(room, TIMING.rps, () => {
    for (const s of room.alive) room.rps[s] ??= ['bua', 'keo', 'bao'][crypto.randomInt(3)];
    revealRps(room);
  });
  broadcast(room);
}

const BEATS = { bua: 'keo', keo: 'bao', bao: 'bua' };

function revealRps(room) {
  const [a, b] = room.alive;
  room.phase = 'rpsReveal';
  room.rpsWinner = room.rps[a] === room.rps[b] ? null : BEATS[room.rps[a]] === room.rps[b] ? a : b;
  schedule(room, TIMING.rpsReveal, () => {
    if (!room.rpsWinner) {
      startRps(room);
      return;
    }
    room.phase = 'choose';
    schedule(room, TIMING.choose, () => beginTurns(room, room.rpsWinner));
    broadcast(room);
  });
  broadcast(room);
}

// Three or more: random first player (or whoever went out first last round), then clockwise.
function startOrder(room) {
  const first = room.alive.includes(room.nextFirst) ? room.nextFirst : room.alive[crypto.randomInt(room.alive.length)];
  const i = room.alive.indexOf(first);
  room.order = [...room.alive.slice(i), ...room.alive.slice(0, i)];
  room.phase = 'order';
  schedule(room, TIMING.order, () => beginTurns(room, first));
  broadcast(room);
}

function beginTurns(room, first) {
  room.turn = first;
  startTurn(room);
}

function nextAlive(room, seat) {
  const i = room.seats.indexOf(seat);
  for (let k = 1; k <= room.seats.length; k++) {
    const s = room.seats[(i + k) % room.seats.length];
    if (room.alive.includes(s)) return s;
  }
  return null;
}

function newWind() {
  return { angle: Math.random() * Math.PI * 2, strength: crypto.randomInt(5) };
}

function startTurn(room) {
  const forced = room.passStreak[room.turn] >= 1;
  log(room, `turn ${room.turn} forced=${forced}`);
  room.phase = 'turn';
  room.wind = newWind();
  scheduleTurnEnd(room, TIMING.turn);
  broadcast(room);
}

// A player who is offline gets a short turn, so the table doesn't wait 30 s (40 s when forced)
// for someone who is gone (QA-06). If they come back in time they play out what is left.
const awayMs = (room) => (room.players[room.turn]?.connected ? Infinity : TIMING.awayTurn);
function scheduleTurnEnd(room, ms) {
  const forced = room.passStreak[room.turn] >= 1;
  schedule(room, Math.min(ms, awayMs(room)), () => {
    const player = room.players[room.turn];
    if (!forced || !player?.connected) {
      registerPass(room, null);
      return;
    }
    send(player.ws, { t: 'autoSlam' });
    schedule(room, TIMING.forcedGrace, () => registerPass(room, null));
  });
}

function registerPass(room, impact) {
  const by = room.turn;
  log(room, `pass by ${by}${impact ? '' : ' (timeout)'}`);
  room.timeouts[by] = impact ? 0 : (room.timeouts[by] ?? 0) + 1;
  // With strangers, two timeouts in a row means nobody is there: out of this round, so the
  // others aren't held up 30 s a turn (friends' rooms keep waiting for each other).
  if (!impact && room.kind === 'quick' && room.timeouts[by] >= 2) {
    eliminateAfk(room, by);
    return;
  }
  room.passStreak[by] += 1;
  for (const p of others(room, by)) send(p.ws, { t: 'passed', by, impact, timeout: !impact });
  room.event = { type: impact ? 'pass' : 'timeout', by };
  room.turn = nextAlive(room, by);
  startTurn(room);
}

function eliminateAfk(room, seat) {
  log(room, `${seat} out for idling`);
  room.timeouts[seat] = 0;
  room.alive = room.alive.filter((s) => s !== seat);
  room.cards = { ...room.cards, [seat]: PARKED };
  room.event = { type: 'afk', by: seat, eliminated: [seat] };
  if (room.alive.length <= 1) {
    endRound(room, { winner: room.alive[0], reason: 'afk', by: seat, eliminated: [seat] });
    return;
  }
  room.turn = nextAlive(room, seat);
  startTurn(room);
}

// A slam is streamed: start, frame chunks while the slammer simulates, then the final
// resting state. Everyone else replays it live; the result applies once they have watched it.
function startSlam(room, impact, type) {
  const by = room.turn;
  log(room, `slam start by ${by}`);
  room.passStreak[by] = 0;
  room.timeouts[by] = 0;
  const watchers = Object.entries(room.players).filter(([s, p]) => s !== by && p.connected).map(([s]) => s);
  room.slam = { by, frames: 0, ended: false, result: null, previous: room.cards, waiting: new Set(watchers) };
  room.phase = 'anim';
  room.event = null;
  for (const p of others(room, by)) send(p.ws, { t: 'playStart', by, impact, type: type === 'tilt' ? 'tilt' : 'flat' });
  schedule(room, TIMING.slamMaxMs, () => abortSlam(room));
  broadcast(room);
}

function relayChunk(room, frames) {
  room.slam.frames += frames.length;
  const text = JSON.stringify({ t: 'playChunk', frames });
  // an offline seat has ws === null; `undefined === undefined` used to let it through and throw,
  // which also cut the relay for every player after it
  for (const p of others(room, room.slam.by)) if (p.ws && p.ws.readyState === p.ws.OPEN) p.ws.send(text);
}

function endSlam(room, final) {
  const { slam } = room;
  slam.ended = true;
  slam.result = judge(final, slam.by, room.alive);
  const cards = { ...final };
  for (const seat of slam.result?.restore ?? []) cards[seat] = slam.previous[seat];
  for (const seat of slam.result?.eliminated ?? []) cards[seat] = PARKED;
  room.cards = parkInactive(room, cards);
  log(room, `slam end by ${slam.by}, ${slam.frames} frames, result=${slam.result ? `${slam.result.reason}:${slam.result.eliminated}` : 'none'}`);
  for (const p of others(room, slam.by)) send(p.ws, { t: 'playEnd', final });
  for (const s of [...slam.waiting]) if (!room.players[s]?.connected) slam.waiting.delete(s);
  if (!slam.waiting.size) finishSlam(room);
  else schedule(room, TIMING.watchMaxMs, () => finishSlam(room));
}

function finishSlam(room) {
  const { slam } = room;
  if (!slam) return;
  room.slam = null;
  const result = slam.result;
  if (result) {
    room.alive = room.alive.filter((s) => !result.eliminated.includes(s));
    room.firstOut ??= result.eliminated[0];
    room.event = { type: result.reason, by: slam.by, eliminated: result.eliminated };
  }
  if (room.alive.length <= 1) {
    endRound(room, {
      winner: room.alive[0] ?? slam.by,
      reason: result?.reason ?? 'capture',
      by: slam.by,
      eliminated: result?.eliminated ?? [],
    });
    return;
  }
  room.turn = nextAlive(room, slam.by);
  startTurn(room);
}

function abortSlam(room) {
  const { slam } = room;
  log(room, `slam by ${slam.by} never finished, reverting`);
  room.cards = parkInactive(room, { ...slam.previous });
  room.slam = null;
  for (const p of others(room, slam.by)) send(p.ws, { t: 'playAbort' });
  room.turn = nextAlive(room, slam.by);
  startTurn(room);
}

function endRound(room, result) {
  room.slam = null;
  room.scores[result.winner] += 1;
  room.result = result;
  room.nextFirst = room.firstOut;
  room.phase = 'roundEnd';
  log(room, `round ${room.round} won by ${result.winner}`);
  schedule(room, TIMING.roundEnd, () => {
    if (room.scores[result.winner] >= ROUNDS_TO_WIN) endMatch(room, result.winner);
    else startRound(room);
  });
  broadcast(room);
}

function endMatch(room, winner, reason = 'score') {
  clearTimeout(room.timer);
  room.slam = null;
  room.phase = 'matchEnd';
  room.deadline = 0;
  room.result = { ...room.result, matchWinner: winner, matchReason: reason };
  broadcast(room);
}

// A player gone for too long is out of the match; the others keep playing.
function dropPlayer(room, seat) {
  const player = room.players[seat];
  if (room.phase === 'lobby') {
    delete room.players[seat];
    delete room.ready[seat];
    room.joinOrder = room.joinOrder.filter((s) => s !== seat);
    if (!Object.keys(room.players).length) closeRoom(room);
    else {
      passHost(room);
      broadcast(room);
    }
    return;
  }
  player.left = true;
  if (room.phase === 'matchEnd') {
    if (!connectedSeats(room).length) closeRoom(room);
    return;
  }
  const stillIn = room.seats.filter((s) => !room.players[s].left);
  if (stillIn.length <= 1) {
    endMatch(room, stillIn[0] ?? seat, 'disconnect');
    return;
  }
  // The round is already decided; startRound leaves this seat out of the next one.
  if (room.phase === 'roundEnd' || !room.alive.includes(seat)) {
    broadcast(room);
    return;
  }
  room.alive = room.alive.filter((s) => s !== seat);
  room.cards = { ...room.cards, [seat]: PARKED };
  room.event = { type: 'left', by: seat, eliminated: [seat] };
  if (room.alive.length <= 1) {
    endRound(room, { winner: room.alive[0], reason: 'left', by: seat, eliminated: [seat] });
  } else if (['rps', 'rpsReveal', 'choose', 'order'].includes(room.phase)) {
    room.round -= 1;
    startRound(room);
  } else if (room.turn === seat && room.phase === 'turn') {
    room.turn = nextAlive(room, seat);
    startTurn(room);
  } else {
    broadcast(room);
  }
}

// The host left: the player who came in earliest (and is still here) takes over.
function passHost(room) {
  if (room.kind !== 'friends' || (room.host && room.players[room.host] && !room.players[room.host].left)) return;
  room.host = room.joinOrder.find((s) => room.players[s] && !room.players[s].left) ?? null;
  if (room.host) delete room.ready[room.host];
}

// Every guest in the lobby is ready (the host starts, so never needs to be).
// A guest who lost the connection does not hold the start back (they are dropped when it starts).
function allReady(room) {
  const guests = Object.keys(room.players).filter((s) => s !== room.host && room.players[s].connected);
  return guests.length >= 1 && guests.every((s) => room.ready[s]);
}

function closeRoom(room) {
  clearTimeout(room.timer);
  rooms.delete(room.code);
}

function validCards(room, cards) {
  return cards && room.seats.every((s) => Array.isArray(cards[s]?.p) && cards[s].p.length === 3
    && Array.isArray(cards[s]?.q) && cards[s].q.length === 4
    && [...cards[s].p, ...cards[s].q].every(Number.isFinite));
}

// ---------- messages ----------

// A second tab (or a duplicated one) taking over a seat closes the older connection.
function attach(ws, room, seat, player) {
  if (player.ws && player.ws !== ws) {
    const old = player.ws;
    old.ctx = null;
    send(old, { t: 'replaced' });
    old.close(4000, 'replaced');
  }
  player.ws = ws;
  player.connected = true;
  clearTimeout(player.discTimer);
  ws.ctx = { room, seat };
  send(ws, { t: 'joined', code: room.code, color: seat, token: player.token });
  if (room.chat?.length) send(ws, { t: 'chatLog', lines: room.chat });
  broadcast(room);
}

// Connection lost, or the same socket moving to another room. A lobby seat left on purpose
// frees up at once; otherwise the player gets a grace period to come back.
function detach(ws, { leaving = false } = {}) {
  const ctx = ws.ctx;
  ws.ctx = null;
  if (!ctx) return;
  const { room, seat } = ctx;
  const player = room.players[seat];
  if (!player || player.ws !== ws || !rooms.has(room.code)) return;
  player.connected = false;
  player.ws = null;
  player.tutorial = 0;
  if (room.slam?.waiting.delete(seat) && room.slam.ended && !room.slam.waiting.size) finishSlam(room);
  // dropped during their own turn: cut what is left of it down to the short away turn
  if (room.phase === 'turn' && room.turn === seat && room.deadline - Date.now() > TIMING.awayTurn) {
    scheduleTurnEnd(room, TIMING.awayTurn);
    broadcast(room);
  }
  if (leaving && room.phase === 'lobby') {
    dropPlayer(room, seat);
    return;
  }
  broadcast(room);
  const grace = room.phase !== 'lobby' ? TIMING.disconnect : seat === room.host ? TIMING.lobbyHostDisconnect : TIMING.lobbyDisconnect;
  clearTimeout(player.discTimer);
  player.discTimer = setTimeout(() => {
    if (!player.connected && rooms.has(room.code)) dropPlayer(room, seat);
  }, grace);
}

function handle(ws, msg) {
  if (msg.t === 'ping') {
    send(ws, { t: 'pong', at: msg.at });
    return;
  }

  if (msg.t === 'hello') {
    refs.hello(ws, msg);
    return;
  }

  // Lets a client opening an invite link know whether the room is still there before asking for a name.
  if (msg.t === 'peek') {
    const code = String(msg.code || '').toUpperCase();
    const room = rooms.get(code);
    const mine = Boolean(room && msg.token && Object.values(room.players).some((p) => p.token === msg.token && !p.left));
    send(ws, {
      t: 'peek',
      code,
      exists: Boolean(room),
      phase: room?.phase ?? null,
      full: room ? Object.keys(room.players).length >= Math.min(MAX_PLAYERS, room.cap) : false,
      quick: room?.kind === 'quick',
      mine,
    });
    return;
  }

  if (msg.t === 'create' || msg.t === 'join') {
    const ctx = ws.ctx;
    const rejoin = msg.t === 'join' && ctx && ctx.room.code === String(msg.code || '').toUpperCase()
      && ctx.room.players[ctx.seat]?.token === msg.token;
    if (!rejoin) detach(ws, { leaving: true });
  }

  if (msg.t === 'create') {
    leaveQueue(ws);
    const room = newRoom({
      visibility: msg.visibility === 'public' ? 'public' : 'private',
      cap: [2, 3, 4].includes(msg.cap) ? msg.cap : MAX_PLAYERS,
    });
    const player = makePlayer(room, 'black', msg);
    refs.joined(ws);
    room.players.black = player;
    room.host = 'black';
    room.joinOrder = ['black'];
    attach(ws, room, 'black', player);
    return;
  }

  if (msg.t === 'listRooms') {
    send(ws, { t: 'rooms', rooms: publicRooms() });
    return;
  }

  if (msg.t === 'queue') {
    detach(ws, { leaving: true });
    joinQueue(ws, msg);
    return;
  }

  if (msg.t === 'unqueue') {
    leaveQueue(ws);
    send(ws, { t: 'queue', state: 'left' });
    return;
  }

  // Errors carry a `code` the client turns into its own language (error.<code>); `message` is for old clients.
  if (msg.t === 'join') {
    const room = rooms.get(String(msg.code || '').toUpperCase());
    if (!room) {
      send(ws, { t: 'error', code: 'notFound', message: 'Không thấy phòng này đâu!' });
      return;
    }
    const existing = Object.keys(room.players).find((s) => msg.token && room.players[s].token === msg.token);
    if (existing && !room.players[existing].left) {
      attach(ws, room, existing, room.players[existing]);
      return;
    }
    if (room.phase !== 'lobby') {
      send(ws, { t: 'error', code: 'inMatch', message: 'Phòng đang đánh dở, tạo phòng mới đi!' });
      return;
    }
    const seat = SEATS.find((s) => !room.players[s]);
    if (!seat || Object.keys(room.players).length >= Math.min(MAX_PLAYERS, room.cap)) {
      send(ws, { t: 'error', code: 'full', message: 'Phòng đủ 4 đứa rồi, vào không được!' });
      return;
    }
    const player = makePlayer(room, seat, msg);
    refs.joined(ws);
    leaveQueue(ws);
    room.players[seat] = player;
    room.joinOrder.push(seat);
    attach(ws, room, seat, player);
    return;
  }

  const ctx = ws.ctx;
  if (!ctx) return;
  const { room, seat } = ctx;
  if (room.players[seat]?.ws !== ws || rooms.get(room.code) !== room) return;

  // A sticker or quick phrase (ids from catalog.js), shown over the sender's card. Any room, any phase.
  if (msg.t === 'react') {
    if (REACTIONS.has(msg.id) && allowed(room.players[seat], 'react')) sendAll(room, { t: 'react', seat, id: msg.id });
    return;
  }

  // Typed chat: friends rooms only (strangers get stickers and quick phrases), filtered, kept for late joiners.
  if (msg.t === 'chat') {
    const text = room.kind === 'friends' ? cleanChat(msg.text, CHAT_MAX) : '';
    if (text && allowed(room.players[seat], 'chat')) {
      const line = { seat, name: room.players[seat].name, text, at: Date.now() };
      room.chat = [...(room.chat ?? []).slice(-(CHAT_KEEP - 1)), line];
      sendAll(room, { t: 'chat', ...line });
    }
    return;
  }

  if (msg.t === 'ftue') {
    const step = Math.trunc(Number(msg.step));
    const next = step >= 1 && step <= TUTORIAL_STEPS ? step : 0;
    if (room.players[seat].tutorial !== next) {
      room.players[seat].tutorial = next;
      broadcast(room);
    }
    return;
  }

  if (msg.t === 'pickDep' && ['lobby', 'matchEnd'].includes(room.phase) && DEPS.includes(msg.dep)) {
    room.players[seat].dep = msg.dep;
    room.players[seat].depColors = defaultDepColors(msg.dep);
    delete room.ready[seat]; // changing your gear takes back your "ready"
    broadcast(room);
    return;
  }

  // Pet, slipper + its colours, card colour. A colour someone else already has is refused.
  if (msg.t === 'pickLook' && ['lobby', 'matchEnd'].includes(room.phase)) {
    const player = room.players[seat];
    const look = cleanLook(msg.look, player.dep);
    const clash = look.cardColor && Object.entries(room.players).some(([s, p]) => s !== seat && p.cardColor === look.cardColor);
    if (clash) send(ws, { t: 'lookRefused', reason: 'colorTaken' });
    Object.assign(player, {
      pet: look.pet ?? player.pet,
      dep: look.dep,
      depColors: look.depColors,
      cardColor: !clash && look.cardColor ? look.cardColor : player.cardColor,
    });
    delete room.ready[seat];
    broadcast(room);
    return;
  }

  if (msg.t === 'ready' && room.phase === 'lobby' && seat !== room.host) {
    if (msg.ready) room.ready[seat] = true;
    else delete room.ready[seat];
    broadcast(room);
    return;
  }

  if (msg.t === 'roomSettings' && room.phase === 'lobby' && seat === room.host) {
    if (msg.visibility === 'public' || msg.visibility === 'private') room.visibility = msg.visibility;
    // the cap can't drop below the players already in
    if ([2, 3, 4].includes(msg.cap) && msg.cap >= Object.keys(room.players).length) room.cap = msg.cap;
    broadcast(room);
    return;
  }

  // Only the host starts, with 2+ players and every guest ready.
  if (msg.t === 'start' && room.phase === 'lobby' && seat === room.host && allReady(room)) {
    for (const s of Object.keys(room.players)) if (!room.players[s].connected) dropPlayer(room, s);
    startMatch(room);
    return;
  }

  if (msg.t === 'rps' && room.phase === 'rps' && room.alive.includes(seat)
    && ['bua', 'keo', 'bao'].includes(msg.choice) && !room.rps[seat]) {
    room.rps[seat] = msg.choice;
    if (room.alive.every((s) => room.rps[s])) revealRps(room);
    else broadcast(room);
    return;
  }

  if (msg.t === 'choose' && room.phase === 'choose' && seat === room.rpsWinner) {
    beginTurns(room, msg.first ? seat : room.alive.find((s) => s !== seat));
    return;
  }

  // After a pass the next turn must be a real slam, so a second pass in a row is refused.
  if (msg.t === 'pass' && room.phase === 'turn' && seat === room.turn && !(room.passStreak[seat] >= 1)) {
    const impact = cleanImpact(room, seat, msg.impact);
    if (impact) registerPass(room, impact);
    return;
  }

  if (msg.t === 'slamStart' && room.phase === 'turn' && seat === room.turn) {
    const impact = cleanImpact(room, seat, msg.impact);
    if (impact) startSlam(room, impact, msg.type);
    return;
  }

  const slamming = room.phase === 'anim' && room.slam && !room.slam.ended && room.slam.by === seat;
  if (msg.t === 'slamChunk' && slamming && Array.isArray(msg.frames)
    && room.slam.frames + msg.frames.length <= 1200) {
    relayChunk(room, msg.frames);
    return;
  }

  if (msg.t === 'slamEnd' && slamming && validCards(room, msg.final)) {
    endSlam(room, msg.final);
    return;
  }

  if (msg.t === 'playbackDone' && room.phase === 'anim' && room.slam?.ended) {
    room.slam.waiting.delete(seat);
    if (!room.slam.waiting.size) finishSlam(room);
    return;
  }

  if (msg.t === 'rematch' && room.phase === 'matchEnd') {
    room.rematch[seat] = true;
    const ready = connectedSeats(room);
    if (ready.length >= 2 && ready.every((s) => room.rematch[s])) {
      for (const s of Object.keys(room.players)) if (!room.players[s].connected || room.players[s].left) delete room.players[s];
      startMatch(room);
    } else {
      broadcast(room);
    }
  }
}

// ---------- public room list ----------

// Waiting rooms first, then by how full they are. Only pet + code + counts go out: no names.
function publicRooms() {
  return [...rooms.values()]
    .filter((r) => r.kind === 'friends' && r.visibility === 'public' && Object.keys(r.players).length)
    .map((r) => ({
      code: r.code,
      n: Object.keys(r.players).length,
      cap: r.cap,
      phase: r.phase === 'lobby' ? 'lobby' : 'playing',
      pet: r.players[r.host]?.pet ?? null,
      color: r.players[r.host]?.cardColor ?? null,
      dep: r.players[r.host]?.dep ?? null,
    }))
    .sort((a, b) => (a.phase === 'lobby' ? 0 : 1) - (b.phase === 'lobby' ? 0 : 1) || b.n - a.n)
    .slice(0, 50);
}

// ---------- quick match ----------
// A waiting player asks for 'any' (2-4) or an exact size. Exact sizes fill first, topped up with
// 'any' players; 'any' players on their own start once 2 are found and a short countdown runs
// out (or 4 are found). Everyone in the queue hears who would come with them.

const queue = []; // { ws, name, dep, size: 'any' | 2 | 3 | 4, at }
let anyCountdownAt = 0;

function joinQueue(ws, msg) {
  leaveQueue(ws);
  const size = [2, 3, 4].includes(msg.size) ? msg.size : 'any';
  const look = cleanLook(msg.look ?? { dep: msg.dep });
  queue.push({ ws, name: cleanName(msg.name), dep: look.dep, look, size, at: Date.now() });
  matchQueue();
}

function leaveQueue(ws) {
  const i = queue.findIndex((e) => e.ws === ws);
  if (i >= 0) queue.splice(i, 1);
}

function startQuickRoom(entries) {
  const room = newRoom({ kind: 'quick', cap: entries.length });
  entries.forEach((e, i) => {
    leaveQueue(e.ws);
    const seat = SEATS[i];
    const player = makePlayer(room, seat, { name: e.name, look: e.look });
    refs.joined(e.ws);
    room.players[seat] = player;
    room.joinOrder.push(seat);
    attach(e.ws, room, seat, player);
  });
  log(room, `quick match for ${entries.length}`);
  schedule(room, TIMING.quickStart, () => startMatch(room));
}

function matchQueue() {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].ws.readyState !== queue[i].ws.OPEN) queue.splice(i, 1);
  const any = queue.filter((e) => e.size === 'any');
  // exact sizes, biggest first, topped up with 'any'
  for (const n of [4, 3, 2]) {
    const exact = queue.filter((e) => e.size === n);
    if (exact.length && exact.length + any.length >= n) {
      startQuickRoom([...exact, ...any].slice(0, n));
      matchQueue();
      return;
    }
  }
  if (any.length >= 4) {
    anyCountdownAt = 0;
    startQuickRoom(any.slice(0, 4));
    matchQueue();
    return;
  }
  if (any.length >= 2) {
    anyCountdownAt ||= Date.now() + TIMING.anyCountdown;
    if (Date.now() >= anyCountdownAt) {
      anyCountdownAt = 0;
      startQuickRoom(any.slice(0, 4));
      matchQueue();
      return;
    }
  } else {
    anyCountdownAt = 0;
  }
  // tell each waiting player who would come with them
  for (const e of queue) {
    const group = e.size === 'any' ? any : [...queue.filter((o) => o.size === e.size), ...any].slice(0, e.size);
    send(e.ws, {
      t: 'queue',
      state: 'waiting',
      size: e.size,
      waitedMs: Date.now() - e.at,
      peers: group.filter((o) => o !== e).map((o) => ({ name: o.name, dep: o.dep, pet: o.look.pet })),
      startsInMs: e.size === 'any' && anyCountdownAt ? Math.max(0, anyCountdownAt - Date.now()) : 0,
    });
  }
}
setInterval(matchQueue, TIMING.queueTick);

// Without these, `ws` throws its socket errors (e.g. "Max payload size exceeded" for a message over
// maxPayload, or a broken frame) as uncaught exceptions and the whole server goes down (QA-01).
// The library already closes the offending socket, so logging is all that's left to do.
wss.on('error', (err) => console.error('websocket server error', err));

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('error', (err) => console.error('socket error', err.message));
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
    try {
      handle(ws, msg);
    } catch (err) {
      console.error(`message ${String(msg.t).slice(0, 20)} failed`, err);
    }
  });

  ws.on('close', () => {
    try {
      leaveQueue(ws);
      detach(ws);
    } catch (err) {
      console.error('disconnect failed', err);
    }
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 20000);

// Ref counts: one line an hour in the pm2 log, and saved before a restart (pm2 sends SIGINT).
let lastRefLine = '';
setInterval(() => {
  const line = refs.summary();
  if (line !== lastRefLine) console.log(`[refs] ${line}`);
  lastRefLine = line;
}, 3600e3).unref();
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    refs.save();
    process.exit(0);
  });
}

server.listen(PORT, '127.0.0.1', () => console.log(`Slam Cards server on http://127.0.0.1:${PORT}`));
