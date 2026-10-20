// Records seeded slams in a real browser, for test/physics.test.js: each one starts from known cards,
// with a known impact, slam type, spin seed and wind, and the browser's physics plays it to the end.
// The test plays the same slams with the server's copy of the physics and expects the very same
// numbers, so what a computer player tries in its head is what the table will do.
// Record again after changing the physics or its tunables (src/config.js TUNE).
//   node qa/physics-record.mjs                 → proto/test/fixtures/slams-seeded.json
//   PROTO=../other-checkout/proto node qa/physics-record.mjs   (record another build, built first)
//   OUT=elsewhere.json node qa/physics-record.mjs                (compare a build without replacing the file)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialCards, seededRandom, SEATS } from '../proto/src/rules.js';
import { TUNE } from '../proto/src/config.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTO = path.resolve(process.env.PROTO || path.join(ROOT, 'proto'));
const OUT = path.resolve(process.env.OUT || path.join(ROOT, 'proto', 'test', 'fixtures', 'slams-seeded.json'));
const PORT = 8104;
const PER_TABLE = Number(process.env.PER_TABLE || 20);

// The slams: from the same seeded dice every time, so a new recording is comparable to the last.
const dice = seededRandom(20261020);
const slams = [];
for (const n of [2, 3, 4]) {
  for (let i = 0; i < PER_TABLE; i++) {
    const seats = SEATS.slice(0, n);
    const cards = initialCards(seats, dice);
    const by = seats[Math.floor(dice() * n)];
    const [x, , z] = cards[by].p;
    // near and far, all around the card, some at a tilt, some in the wind
    const angle = dice() * Math.PI * 2;
    const radius = 0.75 + dice() * (TUNE.reachRadius - 0.75);
    slams.push({
      seats, cards, by,
      impact: { x: x + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius },
      type: dice() < 0.5 ? 'flat' : 'tilt',
      seed: Math.floor(dice() * 2 ** 31),
      wind: { angle: dice() * Math.PI * 2, strength: Math.floor(dice() * 5) },
    });
  }
}

const server = spawn(process.execPath, ['server/server.js'], {
  cwd: PROTO,
  env: { ...process.env, PORT: String(PORT), SLAM_ADMIN_PORT: String(PORT + 100), SLAM_DATA: fs.mkdtempSync(path.join(os.tmpdir(), 'slam-rec-')) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve) => server.stdout.on('data', (d) => { if (/server on/.test(String(d))) resolve(); }));
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/?debug&noftue`);
  await page.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
  // the browser's own loop, step for step (main.js stepSim), with full-precision results
  const results = await page.evaluate(({ slams, settle, fixedDt }) => {
    const world = slamDebug.world;
    const mulberry = (seed) => {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    return slams.map((s) => {
      world.setup(s.seats);
      world.setCards(s.cards);
      world.applySlam(s.impact, s.type, mulberry(s.seed));
      let steps = 0;
      let calm = 0;
      for (;;) {
        world.stepPhysics(s.wind);
        steps += 1;
        calm = world.isSettled() ? calm + 1 : 0;
        const falling = world.isSomethingFalling();
        const seconds = steps * fixedDt;
        if ((calm >= settle.steps && steps > 15 && !falling) || (seconds > settle.softCapSeconds && !falling) || seconds > settle.hardCapSeconds) break;
      }
      const final = {};
      for (const seat of s.seats) {
        const t = world.cards[seat].body.translation();
        const r = world.cards[seat].body.rotation();
        final[seat] = { p: [t.x, t.y, t.z], q: [r.x, r.y, r.z, r.w] };
      }
      return { steps, final };
    });
  }, { slams, settle: TUNE.settle, fixedDt: TUNE.fixedDt });
  const out = slams.map((s, i) => ({ ...s, ...results[i] }));
  fs.writeFileSync(OUT, `${JSON.stringify(out)}\n`);
  console.log(`${out.length} slams recorded → ${path.relative(ROOT, OUT)}`);
} finally {
  await browser.close();
  server.kill();
}
