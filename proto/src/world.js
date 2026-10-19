import * as THREE from 'three';
import { TUNE } from './config.js';
import { createCardMesh, tintCardMesh } from './cards.js';
import { createStencilCard, orderStencilCards, spaceTime } from './stencil-card.js';
// Cards with a stencil window and the player's pet inside (stencil-card.js). `?classic` brings
// back the old joker cards (a fallback if a device can't do the stencil passes).
const STENCIL = !new URLSearchParams(location.search).has('classic');
import { toonizeTree, toonize } from './toon.js';
import { CARD_HALF_W, CARD_HALF_T, CARD_HALF_D, tableFor } from './rules.js';

let RAPIER;

const round4 = (n) => Math.round(n * 10000) / 10000;
const PARKED_BELOW = -10;

const tmpQuat = new THREE.Quaternion();
const tmpLocal = new THREE.Vector3();
const tmpProject = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const tmpNdc = new THREE.Vector2();

function woodTexture(hx, hz) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const planks = ['#e9c48c', '#e3bb7f'];
  for (let y = 0, row = 0; y < 512; y += 64, row++) {
    ctx.fillStyle = planks[row % 2];
    ctx.fillRect(0, y, 512, 64);
    // grain: a few soft strokes with round caps, one tone darker
    ctx.strokeStyle = 'rgba(176,122,64,0.35)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * 420;
      const gy = y + 14 + Math.random() * 36;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.quadraticCurveTo(x + 40, gy - 5 + Math.random() * 10, x + 70 + Math.random() * 90, gy);
      ctx.stroke();
    }
    // inked seam between planks, and one butt joint per plank
    ctx.fillStyle = 'rgba(122,78,40,0.55)';
    ctx.fillRect(0, y, 512, 3);
    ctx.fillRect(((row * 197) % 448) + 32, y, 3, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(hx / 3, hz / 2.9);
  texture.anisotropy = 4;
  return texture;
}

// Ink outline for a box: the same box a little larger, back faces only.
// The hull rises `pad` above the table top, so it would hide cards lying near the rim. It writes no
// depth and draws after the room (renderOrder 1) but before the cards (renderOrder 2): the table
// itself still hides a card behind it, the outline never does, and the two never z-fight.
function boxOutline(geometry, pad = 0.045) {
  geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const outline = new THREE.Mesh(
    new THREE.BoxGeometry(size.x + pad * 2, size.y + pad * 2, size.z + pad * 2),
    new THREE.MeshBasicMaterial({ color: 0x2a1418, side: THREE.BackSide, depthWrite: false }),
  );
  outline.renderOrder = 1;
  return outline;
}

function tileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3e6cf';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#ecdcbf';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillRect(64, 64, 64, 64);
  ctx.fillStyle = '#e2cfae';
  for (const [x, y] of [[64, 64], [0, 0], [128, 0], [0, 128], [128, 128]]) {
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  return texture;
}

export class World {
  // The .wasm is a separate file: streamed and compiled while it downloads.
  static async create(container) {
    const bindings = await import('@dimforge/rapier3d/rapier_wasm3d_bg.js');
    const { default: wasmUrl } = await import('@dimforge/rapier3d/rapier_wasm3d_bg.wasm?url');
    const imports = { './rapier_wasm3d_bg.js': bindings };
    const { instance } = await WebAssembly.instantiateStreaming(fetch(wasmUrl), imports)
      .catch(async () => WebAssembly.instantiate(await (await fetch(wasmUrl)).arrayBuffer(), imports));
    bindings.__wbg_set_wasm(instance.exports);
    RAPIER = await import('@dimforge/rapier3d/rapier.js');
    return new World(container);
  }

  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: STENCIL });
    // Resolution steps down on its own when frames run slow (see adaptQuality).
    this.pixelRatio = Math.min(devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Only the static table casts shadows, so the shadow map is drawn once, not every frame.
    this.renderer.shadowMap.autoUpdate = false;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f6eedb');
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.cameraBase = new THREE.Vector3(0, 13.5, 8.5);
    this.lookTarget = new THREE.Vector3(0, 0, 0.6);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c3a0, 1.6));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.position.set(-4, 12, 6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10 });
    this.scene.add(this.sun);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 1 }),
    );
    floor.position.y = -3;
    floor.receiveShadow = true;
    floor.material = toonize(floor.material);
    this.scene.add(floor);

    this.physics = new RAPIER.World({ x: 0, y: TUNE.gravity, z: 0 });
    this.physics.timestep = TUNE.fixedDt / TUNE.substeps;
    const floorBody = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -3.5, 0));
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 40), floorBody);

    this.seats = [];
    this.cards = {};
    this.tableKey = '';
    this.tableParts = [];

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.trauma = 0;
    this.lastRenderAt = performance.now();
    this.slowFrames = 0;
    this.needsRender = true;

    addEventListener('resize', () => this.resize());
    this.setup(['black', 'pink']);
  }

  // Builds the table and one card per seat; rebuilt only when the seat list changes.
  setup(seats) {
    const key = seats.join(',');
    if (key === this.tableKey) return;
    this.tableKey = key;

    for (const part of this.tableParts) this.scene.remove(part);
    if (this.tableBody) this.physics.removeRigidBody(this.tableBody);
    for (const card of Object.values(this.cards)) {
      this.scene.remove(card.mesh, card.shadow);
      this.physics.removeRigidBody(card.body);
    }

    this.table = tableFor(seats.length);
    this.buildTable(this.table);
    this.seats = [...seats];
    this.cards = Object.fromEntries(seats.map((seat, i) => [seat, this.buildCard(seat, i + 1)]));
    this.resize();
  }

  buildTable({ hx, hz }) {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(hx * 2, 0.5, hz * 2),
      [
        new THREE.MeshStandardMaterial({ color: '#c99a5c' }),
        new THREE.MeshStandardMaterial({ color: '#c99a5c' }),
        new THREE.MeshStandardMaterial({ map: woodTexture(hx, hz), roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: '#b5864c' }),
        new THREE.MeshStandardMaterial({ color: '#b5864c' }),
        new THREE.MeshStandardMaterial({ color: '#b5864c' }),
      ],
    );
    top.position.y = -0.25 - TUNE.tableVisualDrop;
    top.receiveShadow = true;
    top.castShadow = true;
    top.add(boxOutline(top.geometry));
    this.tableParts = [top];

    const legMaterial = new THREE.MeshStandardMaterial({ color: '#9c7040' });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), legMaterial);
      leg.position.set(x * (hx - 0.6), -1.75, z * (hz - 0.5));
      leg.castShadow = true;
      leg.add(boxOutline(leg.geometry, 0.035));
      this.tableParts.push(leg);
    }
    for (const part of this.tableParts) {
      toonizeTree(part);
      this.scene.add(part);
    }

    this.tableBody = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
    this.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, 0.25, hz)
        .setFriction(TUNE.table.friction)
        .setRestitution(TUNE.table.restitution),
      this.tableBody,
    );
  }

  buildCard(seat, stencilRef) {
    const made = STENCIL ? createStencilCard(seat, stencilRef) : createCardMesh(seat);
    if (STENCIL) {
      made.setLook(this.looks?.[seat]);
      made.setGlow(this.glows?.[seat] ?? null);
    }
    const { mesh, shadow } = made;
    this.scene.add(mesh);
    this.scene.add(shadow);
    const body = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setCcdEnabled(true)
        .setSoftCcdPrediction(TUNE.softCcd)
        .setLinearDamping(TUNE.card.linearDamping)
        .setAngularDamping(TUNE.card.angularDamping),
    );
    this.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(CARD_HALF_W, CARD_HALF_T, CARD_HALF_D)
        .setDensity(TUNE.card.density)
        .setFriction(TUNE.card.friction)
        .setRestitution(TUNE.card.restitution),
      body,
    );
    return { mesh, shadow, body, stencil: STENCIL ? made : null };
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.renderer.domElement.parentElement;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.fitCamera();
    this.rect = this.renderer.domElement.getBoundingClientRect();
    this.renderer.shadowMap.needsUpdate = true;
    this.needsRender = true;
  }

  // Frames the whole table for any screen. On portrait screens the camera looks along X,
  // so the table's long side runs up the screen instead of being squeezed sideways.
  // The HUD bands at the top and bottom of the screen (px): the table is framed in the space
  // between them, so no card ever sits under the names, the wind, the banner or the slam buttons.
  setSafeArea(top, bottom) {
    if (Math.abs(top - (this.safe?.top ?? 0)) < 4 && Math.abs(bottom - (this.safe?.bottom ?? 0)) < 4) return;
    this.safe = { top, bottom };
    this.fitCamera();
    this.needsRender = true;
  }

  fitCamera() {
    if (!this.table) return;
    const { hx, hz } = this.table;
    const { clientWidth: w, clientHeight: h } = this.renderer.domElement.parentElement;
    const top = this.safe?.top ?? 0; const bottom = this.safe?.bottom ?? 0;
    // the free band must keep at least half the screen, whatever the HUD says
    const free = Math.max(h * 0.5, h - top - bottom);
    const aspect = this.camera.aspect;
    const fit = free / h; // the table is fitted as if the screen were only the free band tall
    this.portrait = aspect < 0.95;
    const margin = 1.0;
    const halfAcross = (this.portrait ? hz : hx) + margin;
    const halfDeep = (this.portrait ? hx : hz) + margin;
    this.camera.fov = 42;
    const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const vFree = Math.atan(Math.tan(vHalf) * fit);
    const distance = Math.max(halfAcross / Math.tan(hHalf), (halfDeep * 0.9) / Math.tan(vFree)) * 1.22;
    const dir = this.portrait ? new THREE.Vector3(8.5, 13.5, 0) : new THREE.Vector3(0, 13.5, 8.5);
    this.cameraBase.copy(dir.normalize().multiplyScalar(distance));
    this.lookTarget.set(this.portrait ? 0.6 : 0, 0, this.portrait ? 0 : 0.6);
    // centre the picture on the free band instead of the whole screen
    const shift = (top - bottom) / 2;
    if (Math.abs(shift) > 1 && w > 0 && h > 0) this.camera.setViewOffset(w, h, 0, -shift, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // Seats still on the table (eliminated cards are parked far below and disabled).
  get activeSeats() {
    return this.seats.filter((seat) => this.cards[seat].body.isEnabled());
  }

  // ----- state -----

  readCards() {
    const out = {};
    for (const seat of this.seats) {
      const t = this.cards[seat].body.translation();
      const r = this.cards[seat].body.rotation();
      out[seat] = { p: [t.x, t.y, t.z].map(round4), q: [r.x, r.y, r.z, r.w].map(round4) };
    }
    return out;
  }

  // Card colour per seat (hex, the dark shade): tints the old joker cards (`?classic`).
  setCardColors(colors) {
    this.cardColors = colors;
    for (const seat of this.seats) if (!STENCIL && colors[seat]) tintCardMesh(this.cards[seat].mesh, colors[seat]);
    this.needsRender = true;
  }

  // What each seat's player wears ({ pet, dep, depColors, cardColor }); kept for cards built later.
  // Card edge glows by seat ({ black: '#3ad16b', ... }, missing = none), kept for cards built later.
  setGlows(glows) {
    this.glows = glows;
    for (const [seat, card] of Object.entries(this.cards)) card.stencil?.setGlow(glows[seat] ?? null);
    this.needsRender = true;
  }

  setLooks(looks) {
    this.looks = looks;
    if (STENCIL) for (const seat of this.seats) this.cards[seat]?.stencil?.setLook(looks[seat]);
    this.needsRender = true;
  }

  // PERF-01: compile every shader the match will need before it starts, instead of mid-slam
  // (the first slam used to drop frames while the slipper, hit effects and card windows compiled).
  // Everything in the scene is made visible for one compile, plus any extra objects (each
  // player's recoloured slipper), then put back as it was.
  warmUp(extra = []) {
    const holder = new THREE.Group();
    holder.position.set(0, -50, 0);
    extra.filter(Boolean).forEach((o) => holder.add(o.clone()));
    this.scene.add(holder);
    const hidden = [];
    this.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    try {
      this.renderer.compile(this.scene, this.camera);
      // and upload every texture now (the card faces would otherwise go up on the first flip)
      this.scene.traverse((o) => {
        for (const m of [].concat(o.material ?? [])) if (m?.map) this.renderer.initTexture(m.map);
      });
    } finally {
      for (const o of hidden) o.visible = false;
      this.scene.remove(holder);
    }
    this.needsRender = true;
  }

  // A pet clip on a seat's card (stencil cards only): 'dance', 'gesture-negative', 'run'…
  react(seat, name) {
    this.cards[seat]?.stencil?.react(name);
    this.needsRender = true;
  }

  setCards(cards) {
    for (const seat of this.seats) {
      const { body, mesh } = this.cards[seat];
      const { p, q } = cards[seat];
      const parked = p[1] < PARKED_BELOW;
      body.setEnabled(!parked);
      mesh.visible = !parked;
      body.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
      body.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      if (!parked) body.sleep();
    }
    this.syncMeshes();
  }

  applyFrame(frame) {
    this.seats.forEach((seat, i) => {
      const { mesh } = this.cards[seat];
      const o = i * 7;
      mesh.position.set(frame[o], frame[o + 1], frame[o + 2]);
      mesh.quaternion.set(frame[o + 3], frame[o + 4], frame[o + 5], frame[o + 6]);
    });
    this.syncShadows();
    this.needsRender = true;
  }

  recordFrame() {
    const frame = [];
    for (const seat of this.seats) {
      const t = this.cards[seat].body.translation();
      const r = this.cards[seat].body.rotation();
      frame.push(t.x, t.y, t.z, r.x, r.y, r.z, r.w);
    }
    return frame.map(round4);
  }

  syncMeshes() {
    for (const seat of this.seats) {
      const { mesh, body } = this.cards[seat];
      const t = body.translation();
      const r = body.rotation();
      mesh.position.set(t.x, t.y, t.z);
      mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
    this.syncShadows();
    this.needsRender = true;
  }

  syncShadows() {
    const { hx, hz } = this.table;
    for (const seat of this.seats) {
      const { mesh, shadow } = this.cards[seat];
      const onTable = Math.abs(mesh.position.x) < hx && Math.abs(mesh.position.z) < hz;
      const height = mesh.position.y;
      shadow.visible = mesh.visible && onTable && height > 0.03 && height < 6;
      shadow.position.set(mesh.position.x + height * 0.25, 0.002, mesh.position.z + height * 0.12);
      shadow.rotation.y = tmpEuler.setFromQuaternion(mesh.quaternion, 'YXZ').y;
      shadow.material.opacity = Math.max(0.05, 0.28 - height * 0.05);
    }
  }

  // ----- slam -----

  cardAt(point, margin = TUNE.cardMargin) {
    return this.activeSeats.find((seat) => {
      const local = this.toCardLocal(seat, point);
      return Math.abs(local.x) < CARD_HALF_W + margin && Math.abs(local.z) < CARD_HALF_D + margin;
    });
  }

  // Returns a shared vector: read it before the next call.
  toCardLocal(seat, point) {
    const { mesh } = this.cards[seat];
    tmpQuat.copy(mesh.quaternion).invert();
    return tmpLocal.set(point.x - mesh.position.x, 0, point.z - mesh.position.z).applyQuaternion(tmpQuat);
  }

  distanceToCardEdge(seat, point) {
    const local = this.toCardLocal(seat, point);
    const dx = Math.max(Math.abs(local.x) - CARD_HALF_W, 0);
    const dz = Math.max(Math.abs(local.z) - CARD_HALF_D, 0);
    return Math.hypot(dx, dz);
  }

  // A card lying under another one is sheltered from the gust, so a slam on a stack
  // lifts the top card off instead of moving the pair together.
  isCovered(seat) {
    const { mesh } = this.cards[seat];
    return this.activeSeats.some((otherSeat) => {
      if (otherSeat === seat) return false;
      const above = this.cards[otherSeat].mesh.position;
      if (above.y <= mesh.position.y + 0.004) return false;
      const local = this.toCardLocal(seat, above);
      return Math.abs(local.x) < CARD_HALF_W * 2 * TUNE.cover.overlap
        && Math.abs(local.z) < CARD_HALF_D * 2 * TUNE.cover.overlap;
    });
  }

  slamEffects(point, type) {
    return this.activeSeats.map((seat) => {
      const distance = this.distanceToCardEdge(seat, point);
      const raw = 1 - distance / TUNE.windRadius;
      let strength = raw > 0 ? raw ** TUNE.slam.strengthCurve : 0;
      if (this.isCovered(seat)) strength *= TUNE.cover.strength;
      return { color: seat, strength, type };
    }).filter((effect) => effect.strength > 0);
  }

  applySlam(point, type, random = Math.random) {
    const params = TUNE.slam[type];
    for (const { color: seat, strength } of this.slamEffects(point, type)) {
      const { body, mesh } = this.cards[seat];
      const dir = new THREE.Vector3(mesh.position.x - point.x, 0, mesh.position.z - point.z).normalize();
      const mass = body.mass();
      body.wakeUp();
      body.applyImpulse({
        x: dir.x * params.horizontal * strength * mass,
        y: params.vertical * strength * mass,
        z: dir.z * params.horizontal * strength * mass,
      }, true);
      // Flip count grows faster than distance and varies per slam, so a close slam
      // can tumble 2-3 times while a light one barely turns over.
      const flipAxis = new THREE.Vector3(0, 1, 0).cross(dir);
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
  }

  stepPhysics(wind) {
    for (const seat of this.activeSeats) {
      const { body } = this.cards[seat];
      body.resetForces(false);
      if (body.translation().y > TUNE.airborneHeight) {
        const accel = TUNE.windAccelPerUnit * wind.strength;
        const mass = body.mass();
        body.addForce({ x: Math.cos(wind.angle) * accel * mass, y: 0, z: Math.sin(wind.angle) * accel * mass }, true);
      }
    }
    for (let i = 0; i < TUNE.substeps; i++) this.physics.step();
  }

  isSettled() {
    return this.activeSeats.every((seat) => {
      const { body } = this.cards[seat];
      if (body.isSleeping()) return true;
      const v = body.linvel();
      const w = body.angvel();
      return Math.hypot(v.x, v.y, v.z) < TUNE.settle.linear && Math.hypot(w.x, w.y, w.z) < TUNE.settle.angular;
    });
  }

  isSomethingFalling() {
    return this.activeSeats.some((seat) => {
      const y = this.cards[seat].body.translation().y;
      return y < -0.05 && y > -2.4;
    });
  }

  // ----- view helpers -----

  pointerToGround(clientX, clientY) {
    const { rect } = this;
    tmpNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(tmpNdc, this.camera);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, hit) ? hit : null;
  }

  toScreen(x, y, z, out = {}) {
    const v = tmpProject.set(x, y, z).project(this.camera);
    out.x = this.rect.left + ((v.x + 1) / 2) * this.rect.width;
    out.y = this.rect.top + ((1 - v.y) / 2) * this.rect.height;
    return out;
  }

  // Trauma-based shake: hits add trauma, the shake is trauma squared (small hits barely move,
  // big ones kick hard) and it decays smoothly instead of stopping dead.
  shake(amount = 0.6) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  // Called with the gap between two frames that both drew. Sustained slow frames
  // (under ~45 fps) step the resolution down, never below 1x.
  adaptQuality(frameMs) {
    if (frameMs > 100 || document.hidden) return; // a stall or a throttled tab, not a slow GPU
    this.slowFrames = frameMs > 22 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2);
    if (this.slowFrames < 45 || this.pixelRatio <= 1) return;
    this.slowFrames = 0;
    this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.resize();
  }

  // Draws only when something changed; returns whether a frame was drawn.
  render() {
    const now = performance.now();
    const gap = now - this.lastRenderAt;
    const dt = Math.min(gap / 1000, 0.1);
    const shaking = this.trauma > 0;
    if (STENCIL && this.seats?.length) {
      // pets breathe and the space behind the window drifts, so keep drawing while a window is open
      const stencilCards = this.seats.map((s) => this.cards[s].stencil);
      spaceTime.value += dt;
      if (stencilCards.map((c) => c.update(dt, this.camera)).some(Boolean)) this.needsRender = true;
      orderStencilCards(stencilCards);
    }
    if (!this.needsRender && !shaking) {
      this.lastRenderAt = now;
      this.drewLast = false;
      return false;
    }
    // high-refresh screens: draw at most ~60 fps, the extra frames only cost GPU time
    if (this.drewLast && gap < 15) return false;
    if (this.drewLast) this.adaptQuality(gap);
    this.drewLast = true;
    this.lastRenderAt = now;
    this.needsRender = false;
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(this.lookTarget);
    if (shaking) {
      const s = this.trauma * this.trauma;
      const t = now / 1000;
      const n = (f, o) => Math.sin(t * f + o) * 0.6 + Math.sin(t * f * 2.3 + o * 1.7) * 0.4;
      const amp = TUNE.shakeAmount * 6;
      this.camera.position.x += n(47, 0) * amp * s;
      this.camera.position.y += n(41, 3) * amp * 0.5 * s;
      this.camera.position.z += n(53, 7) * amp * s;
      this.camera.lookAt(this.lookTarget);
      this.camera.rotateZ(n(37, 11) * 0.035 * s);
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
    }
    this.renderer.render(this.scene, this.camera);
    return true;
  }
}
