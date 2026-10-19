// Shared helpers for end-to-end tests: a real server process plus simulated WebSocket players.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

export const SERVER = process.env.SLAM_SERVER || fileURLToPath(new URL('../server/server.js', import.meta.url));
export const FAST = { roundIntro: 50, rps: 3000, rpsReveal: 50, choose: 3000, order: 50, turn: 3000, forcedGrace: 500, slamMaxMs: 1500, watchMaxMs: 300, roundEnd: 1500, disconnect: 300, lobbyDisconnect: 200, lobbyHostDisconnect: 200 };
// Test files run in parallel processes, so each picks its own port range.
let nextPort = 20000 + Math.floor(Math.random() * 30000);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startServer(timing = {}, env = {}) {
  const port = nextPort++;
  // counts (refs.json, metrics.json) go to a folder of the test's own, never to proto/data
  const data = env.SLAM_DATA ?? process.env.SLAM_DATA ?? fs.mkdtempSync(path.join(os.tmpdir(), 'slam-test-'));
  const proc = spawn(process.execPath, [SERVER], { env: { ...process.env, ...env, SLAM_DATA: data, PORT: String(port), SLAM_TIMING: JSON.stringify({ ...FAST, ...timing }) } });
  let output = '';
  proc.stdout.on('data', (d) => { output += d; });
  proc.stderr.on('data', (d) => { output += d; });
  let exitCode = null;
  proc.on('exit', (code) => { exitCode = code; });
  for (let i = 0; i < 200 && !output.includes('Slam Cards server on'); i++) await sleep(50);
  return { port, proc, log: () => output, exited: () => exitCode !== null, stop: () => proc.kill() };
}

export class Client {
  constructor(port) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    this.inbox = [];
    this.waiters = [];
    this.closed = false;
    this.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.t === 'state') this.state = msg;
      if (msg.t === 'joined') { this.seat = msg.color; this.code = msg.code; this.token = msg.token; }
      const waiter = this.waiters.find((w) => w.pred(msg));
      if (waiter) {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        waiter.resolve(msg);
      } else {
        this.inbox.push(msg);
      }
    });
    this.ws.on('close', () => { this.closed = true; });
  }

  open() { return new Promise((resolve, reject) => { this.ws.once('open', resolve); this.ws.once('error', reject); }); }
  send(msg) { this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); }
  close() { this.ws.close(); }

  // Resolves with the first message (already received or upcoming) matching pred.
  next(pred, ms = 3000) {
    const seen = this.inbox.find(pred);
    if (seen) { this.inbox.splice(this.inbox.indexOf(seen), 1); return Promise.resolve(seen); }
    return new Promise((resolve, reject) => {
      const waiter = { pred, resolve };
      this.waiters.push(waiter);
      setTimeout(() => {
        if (this.waiters.includes(waiter)) { this.waiters.splice(this.waiters.indexOf(waiter), 1); reject(new Error(`timeout; last state phase=${this.state?.phase}`)); }
      }, ms);
    });
  }

  // Only the latest state or a newer one counts; older queued states are stale.
  waitState(pred, ms) {
    this.inbox = this.inbox.filter((m) => m.t !== 'state');
    if (this.state && pred(this.state)) return Promise.resolve(this.state);
    return this.next((m) => m.t === 'state' && pred(m), ms);
  }
}

export async function connect(port) {
  const c = new Client(port);
  await c.open();
  return c;
}

export async function lobby(port, count) {
  const host = await connect(port);
  host.send({ t: 'create', name: 'P0' });
  await host.next((m) => m.t === 'joined');
  const all = [host];
  for (let i = 1; i < count; i++) {
    const c = await connect(port);
    c.send({ t: 'join', code: host.code, name: `P${i}` });
    await c.next((m) => m.t === 'joined');
    all.push(c);
  }
  return all;
}

// Every guest presses Ready, then the host (the first player) starts.
export async function startFrom(players) {
  const [host, ...guests] = players;
  for (const g of guests) g.send({ t: 'ready', ready: true });
  await host.waitState((s) => Object.keys(s.ready ?? {}).length === guests.length);
  host.send({ t: 'start' });
}

// Two players at their first turn; black won rock-paper-scissors and slams first.
export async function twoPlayerGame(port) {
  const [a, b] = await lobby(port, 2);
  await startFrom([a, b]);
  await a.waitState((s) => s.phase === 'rps');
  a.send({ t: 'rps', choice: 'bua' });
  b.send({ t: 'rps', choice: 'keo' });
  await a.waitState((s) => s.phase === 'choose');
  a.send({ t: 'choose', first: true });
  await a.waitState((s) => s.phase === 'turn' && s.turn === 'black');
  return [a, b];
}

export async function threePlayerGame(port) {
  const players = await lobby(port, 3);
  await startFrom(players);
  await players[0].waitState((s) => s.phase === 'turn');
  return players;
}

export const faceDown = (x, z, y = 0.008) => ({ p: [x, y, z], q: [0, 0, 1, 0] });
export const faceUp = (x, z, y = 0.008) => ({ p: [x, y, z], q: [0, 0, 0, 1] });
export const near = (card, dx = 1.2) => ({ x: card.p[0] + dx, z: card.p[2] });
export const bySeat = (players, seat) => players.find((p) => p.seat === seat);

export function httpGet(port, rawPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, method: 'GET', headers }, (res) => {
      const chunks = [];
      res.on('data', (d) => { chunks.push(d); });
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        resolve({ status: res.statusCode, body: raw.toString('utf8'), bytes: raw.length, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ---------- slams the server's check accepts (server/slam-check.js) ----------

const round4 = (v) => Math.round(v * 1e4) / 1e4;
function slerp(a, b, t) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const to = dot < 0 ? b.map((v) => -v) : b;
  dot = Math.abs(dot);
  if (dot > 0.9995) return a.map((v, i) => v + (to[i] - v) * t);
  const theta = Math.acos(dot);
  const s = Math.sin(theta);
  return a.map((v, i) => (Math.sin((1 - t) * theta) * v + Math.sin(t * theta) * to[i]) / s);
}
const qAngle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));
const same = (a, b) => a.p.every((v, i) => Math.abs(v - b.p[i]) < 1e-4) && qAngle(a.q, b.q) < 1e-3;

// Frames from `start` to `final` a real slam could have made: the slammer's card (the slipper reached it)
// visits and nudges every other card that ends somewhere new, then each moving card glides to its final
// spot, sideways first and then down (a card leaving the table drops only once it is past the edge).
export function slamFrames(seats, start, final, slammer) {
  const now = Object.fromEntries(seats.map((s) => [s, { p: [...start[s].p], q: [...start[s].q] }]));
  const frames = [];
  const push = () => frames.push(seats.flatMap((s) => [...now[s].p, ...now[s].q].map(round4)));
  const glide = (seat, p, q = now[seat].q) => {
    const from = now[seat];
    const n = Math.max(1, Math.ceil(Math.max(Math.hypot(p[0] - from.p[0], p[1] - from.p[1], p[2] - from.p[2]) / 0.3, qAngle(from.q, q) / 0.8)));
    const p0 = [...from.p];
    const q0 = [...from.q];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      now[seat] = { p: p0.map((v, k) => v + (p[k] - v) * t), q: slerp(q0, q, t) };
      push();
    }
  };
  push();
  const movers = seats.filter((s) => start[s].p[1] > -10 && !same(start[s], final[s]));
  for (const m of movers.filter((s) => s !== slammer)) {
    const target = now[m].p;
    const lead = now[slammer].p;
    const d = Math.hypot(target[0] - lead[0], target[2] - lead[2]) || 1;
    glide(slammer, [target[0] + ((lead[0] - target[0]) / d) * 1.2, lead[1], target[2] + ((lead[2] - target[2]) / d) * 1.2]);
    glide(m, [target[0] + 0.03, target[1], target[2]]);
  }
  for (const m of movers.length && !movers.includes(slammer) ? [slammer, ...movers] : movers) {
    const f = final[m];
    glide(m, [f.p[0], Math.max(now[m].p[1], f.p[1]), f.p[2]], f.q);
    glide(m, f.p, f.q);
  }
  return frames;
}

// The slammer slams near its own card, gets the server's answer, streams frames to `final`
// (seats missing from it stay put) and ends the slam. Watchers still send their own playbackDone.
export async function slamTo(slammer, final, { type = 'flat', during } = {}) {
  const { seats, cards } = slammer.state;
  slammer.send({ t: 'slamStart', aim: near(cards[slammer.seat]), type });
  const go = await slammer.next((m) => m.t === 'slamGo' || m.t === 'slamRefused');
  if (go.t !== 'slamGo') throw new Error('slam refused');
  await during?.();
  const full = Object.fromEntries(seats.map((s) => [s, final[s] ?? cards[s]]));
  const frames = slamFrames(seats, cards, full, slammer.seat);
  for (let i = 0; i < frames.length; i += 6) slammer.send({ t: 'slamChunk', frames: frames.slice(i, i + 6) });
  const last = frames[frames.length - 1];
  slammer.send({ t: 'slamEnd', final: Object.fromEntries(seats.map((s, i) => [s, { p: last.slice(i * 7, i * 7 + 3), q: last.slice(i * 7 + 3, i * 7 + 7) }])) });
  return go;
}
