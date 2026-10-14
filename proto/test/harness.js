// Shared helpers for end-to-end tests: a real server process plus simulated WebSocket players.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

export const SERVER = process.env.SLAM_SERVER || fileURLToPath(new URL('../server/server.js', import.meta.url));
export const FAST = { roundIntro: 50, rps: 3000, rpsReveal: 50, choose: 3000, order: 50, turn: 3000, forcedGrace: 500, slamMaxMs: 1500, watchMaxMs: 300, roundEnd: 1500, disconnect: 300, lobbyDisconnect: 200 };
// Test files run in parallel processes, so each picks its own port range.
let nextPort = 20000 + Math.floor(Math.random() * 30000);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startServer(timing = {}) {
  const port = nextPort++;
  const proc = spawn(process.execPath, [SERVER], { env: { ...process.env, PORT: String(port), SLAM_TIMING: JSON.stringify({ ...FAST, ...timing }) } });
  let output = '';
  proc.stdout.on('data', (d) => { output += d; });
  proc.stderr.on('data', (d) => { output += d; });
  let exitCode = null;
  proc.on('exit', (code) => { exitCode = code; });
  for (let i = 0; i < 50 && !output.includes('Slam Cards server on'); i++) await sleep(50);
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

// Two players at their first turn; black won rock-paper-scissors and slams first.
export async function twoPlayerGame(port) {
  const [a, b] = await lobby(port, 2);
  a.send({ t: 'start' });
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
  players[0].send({ t: 'start' });
  await players[0].waitState((s) => s.phase === 'turn');
  return players;
}

export const faceDown = (x, z, y = 0.008) => ({ p: [x, y, z], q: [0, 0, 1, 0] });
export const faceUp = (x, z, y = 0.008) => ({ p: [x, y, z], q: [0, 0, 0, 1] });
export const near = (card, dx = 1.2) => ({ x: card.p[0] + dx, z: card.p[2] });
export const bySeat = (players, seat) => players.find((p) => p.seat === seat);

export function httpGet(port, rawPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
