import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { SEATS, MAX_PLAYERS, ROUNDS_TO_WIN, PARKED, judge, initialCards } from '../src/rules.js';

const PORT = Number(process.env.PORT) || 8097;
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

const TIMING = {
  roundIntro: 2000,
  rps: 6000,
  rpsReveal: 1600,
  choose: 12000,
  order: 2600,
  turn: 30000,
  forcedGrace: 10000,
  slamMaxMs: 15000,
  watchMaxMs: 4000,
  roundEnd: 3200,
  disconnect: 60000,
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, urlPath);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
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

function cleanName(name) {
  const text = String(name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
  return text || 'Tí vô danh';
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

function newRoom() {
  const room = {
    code: newCode(),
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
    players: Object.fromEntries(Object.entries(room.players).map(([seat, p]) => [seat, { connected: p.connected, name: p.name, left: Boolean(p.left), dep: p.dep }])),
    rpsChosen: Object.fromEntries(room.seats.map((s) => [s, Boolean(room.rps[s])])),
    rpsShow: room.phase === 'rpsReveal' ? room.rps : null,
    rpsWinner: room.rpsWinner,
    order: room.order,
    result: room.result,
    event: room.event,
    rematch: room.rematch,
    remainingMs: room.deadline ? Math.max(0, room.deadline - Date.now()) : 0,
  };
}

function broadcast(room) {
  for (const [seat, player] of Object.entries(room.players)) send(player.ws, publicState(room, seat));
}

function others(room, seat) {
  return Object.entries(room.players).filter(([s]) => s !== seat).map(([, p]) => p);
}

function schedule(room, ms, fn) {
  clearTimeout(room.timer);
  room.deadline = Date.now() + ms;
  room.timer = setTimeout(() => {
    room.deadline = 0;
    fn();
  }, ms);
}

// ---------- match flow ----------

function startMatch(room) {
  room.seats = SEATS.filter((s) => room.players[s]);
  room.round = 0;
  room.scores = Object.fromEntries(room.seats.map((s) => [s, 0]));
  room.rematch = {};
  room.nextFirst = null;
  log(room, `match start with ${room.seats.length} players`);
  startRound(room);
}

function startRound(room) {
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
  schedule(room, TIMING.turn, () => {
    if (!forced) {
      registerPass(room, null);
      return;
    }
    send(room.players[room.turn]?.ws, { t: 'autoSlam' });
    schedule(room, TIMING.forcedGrace, () => registerPass(room, null));
  });
  broadcast(room);
}

function registerPass(room, impact) {
  const by = room.turn;
  log(room, `pass by ${by}${impact ? '' : ' (timeout)'}`);
  room.passStreak[by] += 1;
  for (const p of others(room, by)) send(p.ws, { t: 'passed', by, impact, timeout: !impact });
  room.event = { type: impact ? 'pass' : 'timeout', by };
  room.turn = nextAlive(room, by);
  startTurn(room);
}

// A slam is streamed: start, frame chunks while the slammer simulates, then the final
// resting state. Everyone else replays it live; the result applies once they have watched it.
function startSlam(room, msg) {
  const by = room.turn;
  log(room, `slam start by ${by}`);
  room.passStreak[by] = 0;
  const watchers = Object.entries(room.players).filter(([s, p]) => s !== by && p.connected).map(([s]) => s);
  room.slam = { by, frames: 0, ended: false, result: null, previous: room.cards, waiting: new Set(watchers) };
  room.phase = 'anim';
  room.event = null;
  for (const p of others(room, by)) send(p.ws, { t: 'playStart', by, impact: msg.impact, type: msg.type });
  schedule(room, TIMING.slamMaxMs, () => abortSlam(room));
  broadcast(room);
}

function relayChunk(room, frames) {
  room.slam.frames += frames.length;
  const text = JSON.stringify({ t: 'playChunk', frames });
  for (const p of others(room, room.slam.by)) if (p.ws?.readyState === p.ws?.OPEN) p.ws.send(text);
}

function endSlam(room, final) {
  const { slam } = room;
  slam.ended = true;
  slam.result = judge(final, slam.by, room.alive);
  const cards = { ...final };
  for (const seat of slam.result?.restore ?? []) cards[seat] = slam.previous[seat];
  for (const seat of slam.result?.eliminated ?? []) cards[seat] = PARKED;
  room.cards = cards;
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
  room.cards = slam.previous;
  room.slam = null;
  for (const p of others(room, slam.by)) send(p.ws, { t: 'playAbort' });
  room.turn = nextAlive(room, slam.by);
  startTurn(room);
}

function endRound(room, result) {
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
    if (!Object.keys(room.players).length) closeRoom(room);
    else broadcast(room);
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
  if (!room.alive.includes(seat)) return;
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

function attach(ws, room, seat, player) {
  player.ws = ws;
  player.connected = true;
  clearTimeout(player.discTimer);
  ws.ctx = { room, seat };
  send(ws, { t: 'joined', code: room.code, color: seat, token: player.token });
  broadcast(room);
}

function handle(ws, msg) {
  if (msg.t === 'ping') {
    send(ws, { t: 'pong', at: msg.at });
    return;
  }

  if (msg.t === 'create') {
    const room = newRoom();
    const player = { token: crypto.randomUUID(), name: cleanName(msg.name), dep: cleanDep(msg.dep, 'black') };
    room.players.black = player;
    attach(ws, room, 'black', player);
    return;
  }

  if (msg.t === 'join') {
    const room = rooms.get(String(msg.code || '').toUpperCase());
    if (!room) {
      send(ws, { t: 'error', message: 'Không thấy phòng này đâu!' });
      return;
    }
    const existing = Object.keys(room.players).find((s) => msg.token && room.players[s].token === msg.token);
    if (existing && !room.players[existing].left) {
      attach(ws, room, existing, room.players[existing]);
      return;
    }
    if (room.phase !== 'lobby') {
      send(ws, { t: 'error', message: 'Phòng đang đánh dở, tạo phòng mới đi!' });
      return;
    }
    const seat = SEATS.find((s) => !room.players[s]);
    if (!seat || Object.keys(room.players).length >= MAX_PLAYERS) {
      send(ws, { t: 'error', message: 'Phòng đủ 4 đứa rồi, vào không được!' });
      return;
    }
    const player = { token: crypto.randomUUID(), name: uniqueName(room, cleanName(msg.name)), dep: cleanDep(msg.dep, seat) };
    room.players[seat] = player;
    attach(ws, room, seat, player);
    return;
  }

  const ctx = ws.ctx;
  if (!ctx) return;
  const { room, seat } = ctx;

  if (msg.t === 'pickDep' && ['lobby', 'matchEnd'].includes(room.phase) && DEPS.includes(msg.dep)) {
    room.players[seat].dep = msg.dep;
    broadcast(room);
    return;
  }

  if (msg.t === 'start' && room.phase === 'lobby' && Object.keys(room.players).length >= 2) {
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

  if (msg.t === 'pass' && room.phase === 'turn' && seat === room.turn) {
    registerPass(room, msg.impact ?? null);
    return;
  }

  if (msg.t === 'slamStart' && room.phase === 'turn' && seat === room.turn) {
    startSlam(room, msg);
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

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    handle(ws, msg);
  });

  ws.on('close', () => {
    const ctx = ws.ctx;
    if (!ctx) return;
    const { room, seat } = ctx;
    const player = room.players[seat];
    if (!player || player.ws !== ws) return;
    player.connected = false;
    if (room.slam?.waiting.delete(seat) && room.slam.ended && !room.slam.waiting.size) finishSlam(room);
    broadcast(room);
    const grace = room.phase === 'lobby' ? 5000 : TIMING.disconnect;
    player.discTimer = setTimeout(() => {
      if (!player.connected && rooms.has(room.code)) dropPlayer(room, seat);
    }, grace);
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

server.listen(PORT, '127.0.0.1', () => console.log(`Slam Cards server on http://127.0.0.1:${PORT}`));
