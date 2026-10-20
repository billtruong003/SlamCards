// The server's copy of the physics (server/sim.js → src/physics.js) against slams a browser played
// (qa/physics-record.mjs): same cards, impact, type, spin seed and wind must end in the very same
// place after the very same number of steps. Then the cost of one slam, for the computer players.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadPhysics } from '../server/sim.js';
import { runSlam } from '../src/physics.js';
import { seededRandom } from '../src/rules.js';

const RECORDED = JSON.parse(fs.readFileSync(new URL('./fixtures/slams-seeded.json', import.meta.url), 'utf8'));

test('slams played on the server end exactly where they did in the browser', async () => {
  const physics = await loadPhysics();
  let falls = 0;
  for (const [i, s] of RECORDED.entries()) {
    const { steps } = runSlam(physics, { ...s, random: seededRandom(s.seed) });
    assert.equal(steps, s.steps, `slam ${i}: steps`);
    for (const seat of s.seats) {
      const t = physics.body(seat).translation();
      const r = physics.body(seat).rotation();
      assert.deepEqual([t.x, t.y, t.z, r.x, r.y, r.z, r.w], [...s.final[seat].p, ...s.final[seat].q], `slam ${i}: ${seat}`);
      if (t.y < -0.3) falls += 1;
    }
  }
  assert.ok(RECORDED.length >= 60 && falls > 0, 'the recordings include cards leaving the table');
});

test('a slam costs a few milliseconds on the server', async () => {
  const physics = await loadPhysics();
  const t0 = performance.now();
  let steps = 0;
  for (const s of RECORDED) steps += runSlam(physics, { ...s, random: seededRandom(s.seed) }).steps;
  const ms = (performance.now() - t0) / RECORDED.length;
  console.log(`${ms.toFixed(2)} ms per slam, ${Math.round(steps / RECORDED.length)} steps on average`);
  assert.ok(ms < 25, `${ms.toFixed(1)} ms per slam`);
});
