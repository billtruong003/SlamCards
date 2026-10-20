// The table's physics on the server (src/physics.js, the browser's own code), for trying a computer
// player's slams before it picks one (bots.js). Node takes Rapier's "compat" package (the engine
// inlined, loadable without a bundler); package.json pins it to the browser's exact version, and
// test/physics.test.js checks that slams recorded in a browser come out the same here.
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysics } from '../src/physics.js';

let loading = null;

// One physics world, made on first use (compiling the engine takes a moment), reused for every try.
export function loadPhysics() {
  loading ??= RAPIER.init().then(() => createPhysics(RAPIER));
  return loading;
}
