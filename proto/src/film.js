import * as THREE from 'three';
import { loadPet, preparePet, spaceMaterial, outline, bakeSmoothNormals, spaceTime, filmOutline } from './stencil-card.js';
import { toonGradient } from './toon.js';
import { CARD_COLORS } from './catalog.js';

// Film-only tricks for the launch videos (qa/capture), never used in a match: loaded by slamDebug.film().
//   world(...)  the space behind a card window built big, as its own scene: the "fake zoom" lands here
//               on a match cut when a window fills the frame (the real pet never leaves its card)
//   popOut(...) a card's pet drawn outside the window's stencil and walked out over its frame
// Everything runs on performance.now, so the recorder's SLOW clock slows it with the rest of the game.

const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: toonGradient(), ...opts });
// a pet built for a stencil window, drawn everywhere instead
function ungate(obj) {
  obj.traverse((o) => {
    for (const m of [].concat(o.material ?? [])) { m.stencilWrite = false; m.stencilFunc = THREE.AlwaysStencilFunc; m.needsUpdate = true; }
  });
}

export function createFilm(world) {
  const tickers = new Set();
  let last = performance.now();
  (function loop() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (tickers.size) { for (const f of tickers) f(dt); world.needsRender = true; }
    requestAnimationFrame(loop);
  })();

  let table = null; // the match scene while the world is on screen
  let stage = null;

  // key: a flat colour instead of the space and the stage (cut-outs: keyed out in the edit)
  async function enterWorld({ cardColor = 'hong', pets = [], floor = 6, key = null } = {}) {
    exitWorld();
    const c = CARD_COLORS[cardColor];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(key ?? c.room);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c3a0, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-4, 12, 6);
    scene.add(sun);
    // the window's space, scaled up: same shader, same colours, the pattern grows with it
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 1.0), spaceMaterial(c));
    back.scale.setScalar(26);
    back.position.set(0, 6, -6);
    if (!key) scene.add(back);
    // the round stage the pet stands on in its card, stretched into a runway
    const geo = bakeSmoothNormals(new THREE.CylinderGeometry(1, 0.96, 0.14, 64));
    const floorMesh = new THREE.Mesh(geo, toon({ color: c.floor }));
    floorMesh.add(new THREE.Mesh(geo, outline(0.02)));
    floorMesh.scale.set(floor * 0.7, 1, floor);
    floorMesh.position.y = -0.07;
    if (!key) scene.add(floorMesh);
    const actors = [];
    for (const p of pets) {
      const gltf = await loadPet(p.id);
      const a = preparePet(p.id, gltf, 0, p.height ?? 1.1);
      ungate(a.root);
      a.root.position.set(p.x ?? 0, 0, p.z ?? 0);
      a.root.rotation.y = p.ry ?? 0;
      scene.add(a.root);
      actors.push({ ...a, speed: 0, spec: p });
      if (p.clip) play(a, p.clip);
    }
    const tick = (dt) => {
      for (const a of actors) {
        a.mixer.update(dt);
        a.root.position.z += a.speed * dt;
        // a little bob off the beat so a row of runners never moves as one block
        if (a.speed) a.root.position.y = Math.abs(Math.sin((performance.now() / 1000) * 9 + (a.spec.x ?? 0) * 3)) * 0.05;
      }
      spaceTime.value += dt;
    };
    tickers.add(tick);
    table = world.scene;
    world.scene = scene;
    world.needsRender = true;
    stage = { scene, actors, tick };
    return actors.length;
  }

  function play(a, name) {
    const clip = a.clips.find((x) => x.name === name) ?? a.clips.find((x) => x.name === 'idle');
    if (!clip) return;
    const next = a.mixer.clipAction(clip);
    next.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    if (a.action && a.action !== next) next.crossFadeFrom(a.action, 0.15, false);
    a.action = next;
  }

  // every actor (or the listed ones) starts running toward +z at `speed` per second
  function run(speed = 1.6, which = null) {
    stage?.actors.forEach((a, i) => { if (which && !which.includes(i)) return; a.speed = speed; play(a, 'run'); });
  }
  function clip(name, which = null) {
    stage?.actors.forEach((a, i) => { if (which && !which.includes(i)) return; a.speed = 0; play(a, name); });
  }

  function exitWorld() {
    if (!stage) return;
    tickers.delete(stage.tick);
    world.scene = table;
    stage = null;
    world.needsRender = true;
  }

  // The pet of `seat`'s card leaves the window's stencil and steps out toward the camera over `ms`.
  function popOut(seat, { forward = 0.55, up = 0.12, grow = 1.25, ms = 900, clip: name = 'dance' } = {}) {
    const card = world.cards[seat]?.stencil;
    const pet = card?.pet;
    if (!pet) return false;
    ungate(pet.root);
    const from = pet.root.position.clone();
    const s0 = pet.root.scale.x;
    const t0 = performance.now();
    card.react(name);
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      const e = 1 - (1 - k) ** 3;
      pet.root.position.set(from.x, from.y + up * Math.sin(k * Math.PI) + up * 0.4 * e, from.z + forward * e);
      pet.root.scale.setScalar(s0 * (1 + (grow - 1) * e));
      if (k >= 1) tickers.delete(tick);
    };
    tickers.add(tick);
    return true;
  }

  // A camera move from where it is now to { look, from, fov } over `ms`; ease 'inOut' | 'in' | 'out' | 'linear'.
  function camTo({ look, from, fov }, ms = 1000, ease = 'inOut') {
    const cam = world.camera;
    const l0 = world.lookTarget.clone(); const f0 = world.cameraBase.clone(); const v0 = cam.fov;
    const l1 = new THREE.Vector3(...(look ?? l0.toArray())); const f1 = new THREE.Vector3(...(from ?? f0.toArray())); const v1 = fov ?? v0;
    const curve = { linear: (k) => k, in: (k) => k * k * k, out: (k) => 1 - (1 - k) ** 3, inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2) }[ease];
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      const e = curve(k);
      world.lookTarget.lerpVectors(l0, l1, e); world.cameraBase.lerpVectors(f0, f1, e);
      cam.fov = v0 + (v1 - v0) * e; cam.clearViewOffset(); cam.updateProjectionMatrix();
      if (k >= 1) tickers.delete(tick);
    };
    tickers.add(tick);
  }
  function camSet({ look, from, fov }) {
    if (look) world.lookTarget.set(...look);
    if (from) world.cameraBase.set(...from);
    if (fov) world.camera.fov = fov;
    world.camera.clearViewOffset(); world.camera.updateProjectionMatrix(); world.needsRender = true;
  }

  // one actor of the world, placed by hand (stills): { x, z, ry, y, clip, at } (at: the clip's time in seconds)
  function actor(i, { x, z, y, ry, clip: name, at } = {}) {
    const a = stage?.actors[i];
    if (!a) return false;
    if (x !== undefined) a.root.position.x = x;
    if (z !== undefined) a.root.position.z = z;
    if (y !== undefined) a.root.position.y = y;
    if (ry !== undefined) a.root.rotation.y = ry;
    a.speed = 0;
    // a still: the clip alone at its full weight (no cross-fade from the last one)
    if (name) { a.mixer.stopAllAction(); a.action = a.mixer.clipAction(a.clips.find((c) => c.name === name) ?? a.clips[0]).reset().play(); }
    if (at !== undefined && a.action) { a.action.time = at; a.mixer.update(0); }
    world.needsRender = true;
    return true;
  }

  // a clip's length in seconds (to sample a loop evenly)
  function clipLength(i, name) {
    const a = stage?.actors[i];
    return a?.clips.find((c) => c.name === name)?.duration ?? 0;
  }

  // the inverted-hull outlines on or off (cut-outs get a clean silhouette line in the edit instead)
  function hulls(on) {
    for (const sc of [world.scene, table].filter(Boolean)) sc.traverse((o) => { if (o.material?.userData?.outline) o.visible = on; });
    world.needsRender = true;
  }

  // every outline a fixed `px` wide on screen (0: the game's own hull)
  function outlinePx(px = 2.5) {
    filmOutline.px.value = px;
    filmOutline.res.value.set(innerWidth, innerHeight);
    world.needsRender = true;
  }

  // the table's light for a mood: the sky and sun turned down, a warm spot like sun through a classroom window
  let spot = null;
  function light({ hemi = 1.6, sun = 1.6, bg = '#f6eedb', spot: s = null } = {}) {
    const scene = table ?? world.scene;
    scene.traverse((o) => { if (o.isHemisphereLight) o.intensity = hemi; });
    world.sun.intensity = sun;
    scene.background = new THREE.Color(bg);
    if (spot) { scene.remove(spot, spot.target); spot = null; }
    if (s) {
      spot = new THREE.SpotLight(s.color ?? 0xffd9a0, s.intensity ?? 40, 0, s.angle ?? 0.35, s.penumbra ?? 0.6, 1.2);
      spot.position.set(...(s.from ?? [-3, 6, 2]));
      spot.target.position.set(...(s.at ?? [0, 0, 0]));
      scene.add(spot, spot.target);
    }
    world.needsRender = true;
  }

  return { world: enterWorld, run, clip, exitWorld, popOut, camTo, camSet, outlinePx, light, actor, clipLength, hulls };
}
