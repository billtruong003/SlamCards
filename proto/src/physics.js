// The table's physics on its own, with no drawing: the cards as Rapier bodies, a slam's push and
// spin, wind, and when the cards have settled. The browser draws from it (world.js); the server runs
// it to try a computer player's slams before choosing one (server/sim.js, bots.js). One copy of the
// rules of motion for both, so what a bot expects is what the table does.
import { TUNE } from './config.js';
import { CARD_HALF_W, CARD_HALF_T, CARD_HALF_D, tableFor } from './rules.js';

const round4 = (n) => Math.round(n * 10000) / 10000;
const PARKED_BELOW = -10; // eliminated cards are parked far below the table, with their bodies off

// v turned by the inverse of the unit quaternion (its conjugate). The arithmetic is three.js's
// (Vector3.applyQuaternion), operation for operation: a slam's result hangs on these numbers, and it
// must come out the same as when world.js did this with three.js objects.
function unrotate([qx, qy, qz, qw], [vx, vy, vz]) {
  const x = -qx;
  const y = -qy;
  const z = -qz;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + qw * tx + y * tz - z * ty, vy + qw * ty + z * tx - x * tz, vz + qw * tz + x * ty - y * tx];
}

// RAPIER: the initialised module (loading the .wasm differs between the browser and Node).
export function createPhysics(RAPIER) {
  const world = new RAPIER.World({ x: 0, y: TUNE.gravity, z: 0 });
  world.timestep = TUNE.fixedDt / TUNE.substeps;
  const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -3.5, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 40), floorBody);

  let seats = [];
  let bodies = {};
  let tableBody = null;
  let table = null;

  function buildCard() {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setCcdEnabled(true)
        .setSoftCcdPrediction(TUNE.softCcd)
        .setLinearDamping(TUNE.card.linearDamping)
        .setAngularDamping(TUNE.card.angularDamping),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(CARD_HALF_W, CARD_HALF_T, CARD_HALF_D)
        .setDensity(TUNE.card.density)
        .setFriction(TUNE.card.friction)
        .setRestitution(TUNE.card.restitution),
      body,
    );
    return body;
  }

  const position = (seat) => bodies[seat].translation();
  const quaternion = (seat) => { const r = bodies[seat].rotation(); return [r.x, r.y, r.z, r.w]; };
  // a point in a card's own frame, flattened onto the table
  const toCardLocal = (seat, point) => {
    const t = position(seat);
    return unrotate(quaternion(seat), [point.x - t.x, 0, point.z - t.z]);
  };

  const physics = {
    world,
    get seats() { return seats; },
    get table() { return table; },
    body: (seat) => bodies[seat],

    // The table and one card per seat; rebuilt only when the seat list changes.
    setup(next) {
      if (next.join() === seats.join() && tableBody) return false;
      if (tableBody) world.removeRigidBody(tableBody);
      for (const body of Object.values(bodies)) world.removeRigidBody(body);
      table = tableFor(next.length);
      tableBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(table.hx, 0.25, table.hz)
          .setFriction(TUNE.table.friction)
          .setRestitution(TUNE.table.restitution),
        tableBody,
      );
      seats = [...next];
      bodies = Object.fromEntries(seats.map((seat) => [seat, buildCard()]));
      return true;
    },

    // Seats still on the table (eliminated cards are parked far below and disabled).
    get activeSeats() {
      return seats.filter((seat) => bodies[seat].isEnabled());
    },

    setCards(cards) {
      for (const seat of seats) {
        const body = bodies[seat];
        const { p, q } = cards[seat];
        const parked = p[1] < PARKED_BELOW;
        body.setEnabled(!parked);
        body.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
        body.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        if (!parked) body.sleep();
      }
    },

    readCards() {
      const out = {};
      for (const seat of seats) {
        const t = position(seat);
        out[seat] = { p: [t.x, t.y, t.z].map(round4), q: quaternion(seat).map(round4) };
      }
      return out;
    },

    // every card's position and rotation, 7 numbers per seat, rounded as they go over the network
    recordFrame() {
      const frame = [];
      for (const seat of seats) {
        const t = position(seat);
        frame.push(t.x, t.y, t.z, ...quaternion(seat));
      }
      return frame.map(round4);
    },

    cardAt(point, margin = TUNE.cardMargin) {
      return physics.activeSeats.find((seat) => {
        const [x, , z] = toCardLocal(seat, point);
        return Math.abs(x) < CARD_HALF_W + margin && Math.abs(z) < CARD_HALF_D + margin;
      });
    },

    distanceToCardEdge(seat, point) {
      const [x, , z] = toCardLocal(seat, point);
      return Math.hypot(Math.max(Math.abs(x) - CARD_HALF_W, 0), Math.max(Math.abs(z) - CARD_HALF_D, 0));
    },

    // A card lying under another one is sheltered from the gust, so a slam on a stack
    // lifts the top card off instead of moving the pair together.
    isCovered(seat) {
      const y = position(seat).y;
      return physics.activeSeats.some((other) => {
        if (other === seat) return false;
        const above = position(other);
        if (above.y <= y + 0.004) return false;
        const [x, , z] = toCardLocal(seat, above);
        return Math.abs(x) < CARD_HALF_W * 2 * TUNE.cover.overlap && Math.abs(z) < CARD_HALF_D * 2 * TUNE.cover.overlap;
      });
    },

    slamEffects(point, type) {
      return physics.activeSeats.map((seat) => {
        const distance = physics.distanceToCardEdge(seat, point);
        const raw = 1 - distance / TUNE.windRadius;
        let strength = raw > 0 ? raw ** TUNE.slam.strengthCurve : 0;
        if (physics.isCovered(seat)) strength *= TUNE.cover.strength;
        return { color: seat, strength, type };
      }).filter((effect) => effect.strength > 0);
    },

    applySlam(point, type, random = Math.random) {
      const params = TUNE.slam[type];
      for (const { color: seat, strength } of physics.slamEffects(point, type)) {
        const body = bodies[seat];
        const t = position(seat);
        // normalised the way three.js does it (Vector3.normalize), for the same numbers as before
        const dx = t.x - point.x;
        const dz = t.z - point.z;
        const inv = 1 / (Math.sqrt(dx * dx + 0 * 0 + dz * dz) || 1);
        const dir = { x: dx * inv, z: dz * inv };
        const mass = body.mass();
        body.wakeUp();
        body.applyImpulse({
          x: dir.x * params.horizontal * strength * mass,
          y: params.vertical * strength * mass,
          z: dir.z * params.horizontal * strength * mass,
        }, true);
        // Flip count grows faster than distance and varies per slam, so a close slam
        // can tumble 2-3 times while a light one barely turns over. Spin axis: up × dir.
        const flipAxis = { x: dir.z, z: -dir.x };
        const luck = 1 + (random() * 2 - 1) * TUNE.slam.spinRandom;
        const spin = params.spin * strength ** TUNE.slam.spinCurve * luck;
        const roll = (random() * 2 - 1) * params.spin * TUNE.slam.rollNoise * strength;
        const yaw = (random() - 0.5) * TUNE.slam.yawNoise * strength;
        body.setAngvel({
          x: flipAxis.x * spin + dir.x * roll,
          y: yaw,
          z: flipAxis.z * spin + dir.z * roll,
        }, true);
      }
    },

    step(wind) {
      for (const seat of physics.activeSeats) {
        const body = bodies[seat];
        body.resetForces(false);
        if (body.translation().y > TUNE.airborneHeight) {
          const accel = TUNE.windAccelPerUnit * wind.strength;
          const mass = body.mass();
          body.addForce({ x: Math.cos(wind.angle) * accel * mass, y: 0, z: Math.sin(wind.angle) * accel * mass }, true);
        }
      }
      for (let i = 0; i < TUNE.substeps; i++) world.step();
    },

    isSettled() {
      return physics.activeSeats.every((seat) => {
        const body = bodies[seat];
        if (body.isSleeping()) return true;
        const v = body.linvel();
        const w = body.angvel();
        return Math.hypot(v.x, v.y, v.z) < TUNE.settle.linear && Math.hypot(w.x, w.y, w.z) < TUNE.settle.angular;
      });
    },

    isSomethingFalling() {
      return physics.activeSeats.some((seat) => {
        const y = position(seat).y;
        return y < -0.05 && y > -2.4;
      });
    },
  };
  return physics;
}

// When a slam's motion is over, by the same rule the browser uses (main.js stepSim): calm for a few
// steps, or past the soft cap with nothing falling, or past the hard cap whatever happens.
export function slamDone({ steps, calm, falling }) {
  const seconds = steps * TUNE.fixedDt;
  return (calm >= TUNE.settle.steps && steps > 15 && !falling)
    || (seconds > TUNE.settle.softCapSeconds && !falling)
    || seconds > TUNE.settle.hardCapSeconds;
}

// A whole slam at once (no drawing, no clock): from `cards`, a slam at `impact` of `type` with the
// spin luck of `random` (seededRandom(seed) to match a real slam) and the turn's `wind`; returns where
// the cards end and how many steps it took.
export function runSlam(physics, { seats, cards, impact, type, wind, random }) {
  physics.setup(seats);
  physics.setCards(cards);
  physics.applySlam(impact, type, random);
  let steps = 0;
  let calm = 0;
  for (;;) {
    physics.step(wind);
    steps += 1;
    calm = physics.isSettled() ? calm + 1 : 0;
    if (slamDone({ steps, calm, falling: physics.isSomethingFalling() })) break;
  }
  return { final: physics.readCards(), steps };
}
