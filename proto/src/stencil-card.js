import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CARD_HALF_W, CARD_HALF_D, CARD_HALF_T } from './rules.js';
import { toonGradient } from './toon.js';
import { depModelFor } from './deps.js';
import { CARD_COLORS, SEAT_DEFAULTS, defaultDepColors } from './catalog.js';
import { t } from './i18n.js';

// The card (milestone 4; `?classic` brings back the old joker cards): a card whose face-up side is a window into a little 3D
// space with the player's pet, drawn with the stencil buffer so it shows through the card even
// though that space sits "under" the table.
//
// Per card, in this order (renderOrder, cards sorted low to high every frame):
//   1. the card itself (frame with a hole, back, edge) writes depth as usual
//   2. MASK   the window, colour off: writes this card's stencil code where it is visible
//   3. RESET  the window again where stencil == code: pushes depth to the far plane, so the
//             table no longer hides what lies behind the window
//   4. ROOM   the space, stage, pet and slipper, only where stencil == code
//   5. RESTORE the window where stencil == code: writes the card surface's depth back, so
//             cards and slippers drawn later sort against the card, not the room behind it
// The window mask is front-face only, so a face-down card never opens its window.
//
// Geometry is built in "card space" (the mockup's): x across, y along the card, z out of the
// face. A child group turns that onto the physics body, whose face points up along +y.

const W = CARD_HALF_W * 2;
const H = CARD_HALF_D * 2;
const CORNER = 0.085;
// The window: 0.1 from the top and the sides; below it the name plate (see frontTexture).
const WIN = { cx: 0, cy: 0.1267, hw: 0.4, hh: 0.5123, r: 0.07 };
const STAGE_Y = -0.2; // floor of the stage, in the stage's own (camera-facing) space
const STAGE_TILT = 0.25; // how far the stage tips its top toward the camera (a three-quarter view)
const BASE_ORDER = 100;

// ---------- shared helpers ----------

const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: toonGradient(), ...opts });
const gate = (material, ref) => Object.assign(material, {
  stencilWrite: true, stencilRef: ref, stencilFunc: THREE.EqualStencilFunc,
  stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
});

// Outline hull along normals averaged per position, so flat-shaded cube pets keep one closed line.
function bakeSmoothNormals(geo) {
  if (geo.attributes.smoothNormal) return geo;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const n = new THREE.Vector3();
  // positions/normals quantised to 1/1000 and packed in a number: much cheaper than strings
  const key = (a, i) => (Math.round(a.getX(i) * 1000) * 4194304 + Math.round(a.getY(i) * 1000)) * 4194304 + Math.round(a.getZ(i) * 1000);
  const sums = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = key(pos, i);
    const nk = key(nor, i);
    let e = sums.get(k);
    if (!e) sums.set(k, e = { v: new THREE.Vector3(), seen: new Set() });
    if (!e.seen.has(nk)) { e.seen.add(nk); e.v.add(n.fromBufferAttribute(nor, i)); }
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = sums.get(key(pos, i)).v;
    n.copy(v.lengthSq() > 1e-8 ? v : n.fromBufferAttribute(nor, i)).normalize().toArray(out, i * 3);
  }
  geo.setAttribute('smoothNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}
function outline(width) {
  const m = new THREE.MeshBasicMaterial({ color: 0x2a1418, side: THREE.BackSide });
  const uniform = { value: width };
  m.onBeforeCompile = (s) => {
    s.uniforms.outlineWidth = uniform;
    s.vertexShader = `attribute vec3 smoothNormal;\nuniform float outlineWidth;\n${s.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(smoothNormal) * outlineWidth;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n gl_Position.z += 0.0006 * gl_Position.w;');
  };
  return m;
}

function roundRect(path, cx, cy, hw, hh, r) {
  path.moveTo(cx - hw + r, cy - hh);
  path.lineTo(cx + hw - r, cy - hh); path.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + r);
  path.lineTo(cx + hw, cy + hh - r); path.quadraticCurveTo(cx + hw, cy + hh, cx + hw - r, cy + hh);
  path.lineTo(cx - hw + r, cy + hh); path.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - r);
  path.lineTo(cx - hw, cy - hh + r); path.quadraticCurveTo(cx - hw, cy - hh, cx - hw + r, cy - hh);
  return path;
}
function planarUV(geo) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / W + 0.5; uv[i * 2 + 1] = pos.getY(i) / H + 0.5; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
const outerShape = () => roundRect(new THREE.Shape(), 0, 0, W / 2, H / 2, CORNER);
const windowShape = () => roundRect(new THREE.Shape(), WIN.cx, WIN.cy, WIN.hw, WIN.hh, WIN.r);

// ---------- card faces, drawn on canvases (same art as mockup/customize) ----------

const INK = '#2a1418';
const CREAM = '#fffbf0';
const FONT = '"Baloo 2", system-ui, sans-serif';
const S = 512;
const SH = Math.round(S * H);
const K = S / 512;
const BH = SH / K;
const bx = (x) => (x / W + 0.5) * 512;
const by = (y) => (0.5 - y / H) * BH;
const marks = {};
const loadImg = (src) => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = src; });
const marksReady = Promise.all([loadImg('brand/bill-the-dev-mark.svg'), loadImg('brand/bill-the-dev-mark-white.svg')])
  .then(([color, white]) => Object.assign(marks, { color, white }));

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function cardCanvas(fill) {
  const c = document.createElement('canvas');
  c.width = S; c.height = SH;
  const g = c.getContext('2d');
  g.scale(K, K);
  g.fillStyle = INK; g.fillRect(0, 0, 512, BH);
  g.save(); rr(g, 10, 10, 492, BH - 20, CORNER * 512 - 10); g.clip();
  g.fillStyle = fill; g.fillRect(0, 0, 512, BH);
  return { c, g };
}
function toTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// Face: the colour frame, a cream panel, the window's ink rim and a name plate. Every line is laid
// out from the window hole itself, so the rim hugs the hole and the plate lines up with the rim.
const PANEL = 24;          // cream panel inset from the card edge (px of the 512-wide canvas)
const RIM = 9;             // window rim, drawn just outside the hole
const GAP = 18;            // cream between panel edge, rim and plate, the same everywhere
function frontTexture(look) {
  const { c, g } = cardCanvas(look.color);
  const hx0 = bx(WIN.cx - WIN.hw); const hx1 = bx(WIN.cx + WIN.hw);
  const hy0 = by(WIN.cy + WIN.hh); const hy1 = by(WIN.cy - WIN.hh);
  const hr = WIN.r * 512;
  g.fillStyle = CREAM; rr(g, PANEL, PANEL, 512 - 2 * PANEL, BH - 2 * PANEL, CORNER * 512 - PANEL); g.fill();
  g.strokeStyle = INK;
  g.lineWidth = RIM; rr(g, hx0 - RIM / 2, hy0 - RIM / 2, hx1 - hx0 + RIM, hy1 - hy0 + RIM, hr + RIM / 2); g.stroke();
  // plate: as wide as the rim, from the rim + GAP down to the panel edge - GAP
  const px0 = hx0 - RIM; const pw = hx1 - hx0 + 2 * RIM;
  const py0 = hy1 + RIM + GAP; const ph = BH - PANEL - GAP - py0;
  g.fillStyle = look.deep;
  rr(g, px0, py0, pw, ph, hr + RIM); g.fill();
  g.lineWidth = 6; rr(g, px0 + 3, py0 + 3, pw - 6, ph - 6, hr + RIM - 3); g.stroke();
  // the pet's name, white only, shrunk to fit the plate
  let size = Math.min(70, ph * 0.62);
  const maxW = pw - 56;
  do { g.font = `800 ${size}px ${FONT}`; size -= 2; } while (g.measureText(look.petName).width > maxW && size > 20);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const m = g.measureText(look.petName);
  // centre on the glyphs' real box, not the font's line box (accents and Thai marks differ)
  g.fillText(look.petName, 256, py0 + ph / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2, maxW);
  g.restore();
  return toTex(c);
}
// Back: the colour, fine diagonal pinstripes, a cream line on the same inset as the face's panel and
// one white mark.
function backTexture(look) {
  const { c, g } = cardCanvas(look.color);
  g.save();
  g.strokeStyle = 'rgba(255,251,240,0.16)'; g.lineWidth = 4;
  for (let x = -BH; x < 512 + BH; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + BH, BH); g.stroke(); }
  g.restore();
  g.strokeStyle = 'rgba(255,251,240,0.8)'; g.lineWidth = 6;
  rr(g, PANEL + 3, PANEL + 3, 512 - 2 * PANEL - 6, BH - 2 * PANEL - 6, CORNER * 512 - PANEL - 3); g.stroke();
  const ms = 230;
  if (marks.white) g.drawImage(marks.white, 256 - ms / 2, BH / 2 - ms / 2, ms, ms);
  g.restore();
  return toTex(c);
}

// ---------- the space behind the window (three layers, after Minions Art's UI background) ----------

export const spaceTime = { value: 0 };
function spaceMaterial(look) {
  const c = (h) => new THREE.Color(h);
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uTime: spaceTime,
      uBgA: { value: c(look.room) }, uBgB: { value: c(look.room).lerp(c(CREAM), 0.6) },
      uDot: { value: c(look.color).lerp(c(CREAM), 0.35) },
      uC0: { value: c(look.color).lerp(c(CREAM), 0.55) }, uC1: { value: c(CREAM) },
      uC2: { value: c('#ffe2b8') }, uC3: { value: c(look.room).lerp(c(look.color), 0.25) },
    },
    vertexShader: `
      varying vec3 vPos; varying vec3 vCam;
      void main() {
        vPos = position;
        vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uBgA, uBgB, uDot, uC0, uC1, uC2, uC3;
      varying vec3 vPos; varying vec3 vCam;
      mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
      void main() {
        vec3 d = normalize(vPos - vCam);
        vec2 uv = (vCam + d * ((-1.0 - vCam.z) / min(d.z, -0.05))).xy;
        vec2 bu = rot(0.4 + uTime * 0.02) * (uv * 5.0) + vec2(uTime * 0.12, uTime * 0.05);
        float checker = smoothstep(-0.06, 0.06, sin(bu.x * 3.14159) * sin(bu.y * 3.14159));
        vec3 col = mix(uBgA, uBgB, checker * 0.55 + 0.2);
        vec2 mu = rot(-0.5) * (uv * 3.4) + vec2(-uTime * 0.08, uTime * 0.1);
        float dots = 1.0 - smoothstep(0.2, 0.26, length(fract(mu) - 0.5));
        float fade = clamp((rot(0.6 + uTime * 0.15) * uv).y * 0.9 + 0.55, 0.0, 1.0);
        float mask = smoothstep(0.3, 0.45, dots * fade * mix(1.0, checker, 0.25));
        col = mix(col, uDot, mask * 0.85);
        vec2 t = clamp(rot(0.3) * (uv - vec2(0.0, 0.15)) * 1.1 + 0.5, 0.0, 1.0);
        vec3 grad = mix(mix(uC2, uC3, t.x), mix(uC0, uC1, t.x), t.y);
        col = mix(col, max(col, grad), 0.55);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ---------- window passes ----------

const maskMaterial = (ref) => new THREE.MeshBasicMaterial({
  colorWrite: false, depthWrite: false,
  stencilWrite: true, stencilRef: ref, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
});
// Depth-only pass over the window where stencil == ref: `far` pushes depth to the back of the
// view (so the room behind the window can draw), otherwise it writes the card surface back.
function depthMaterial(ref, far) {
  return gate(new THREE.ShaderMaterial({
    colorWrite: false,
    depthWrite: true,
    depthFunc: THREE.AlwaysDepth,
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: far
      ? 'void main() { gl_FragColor = vec4(0.0); gl_FragDepth = 0.99999; }'
      : 'void main() { gl_FragColor = vec4(0.0); gl_FragDepth = gl_FragCoord.z; }',
  }), ref);
}

// ---------- pets ----------

const petCache = {};
const loader = new GLTFLoader();
export const loadPet = (id) => (petCache[id] ??= loader.loadAsync(`pets/animal-${id}.json`));

// Kenney's cube pets animate each part as its own node: 7 parts = 7 draw calls, 14 with outlines.
// Rebuilt once per pet kind as ONE skinned mesh: every node becomes a bone and each part's vertices
// ride their node's bone, so the clips (which target node names) still play, in 2 draw calls.
const mergedPets = {};
function mergePet(id, gltf) {
  if (mergedPets[id]) return mergedPets[id];
  const src = gltf.scene;
  src.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(src.matrixWorld).invert();
  const bones = [];
  const boneIndex = new Map();
  const mirror = (obj) => {
    const bone = new THREE.Bone();
    bone.name = obj.name;
    bone.position.copy(obj.position);
    bone.quaternion.copy(obj.quaternion);
    bone.scale.copy(obj.scale);
    boneIndex.set(obj, bones.length);
    bones.push(bone);
    for (const child of obj.children) bone.add(mirror(child));
    return bone;
  };
  const tops = src.children.map(mirror);
  const geos = [];
  let map = null;
  const m = new THREE.Matrix4();
  src.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(m.multiplyMatrices(rootInv, o.matrixWorld));
    const n = g.attributes.position.count;
    const idx = new Uint16Array(n * 4);
    const wgt = new Float32Array(n * 4);
    const b = boneIndex.get(o);
    for (let i = 0; i < n; i++) { idx[i * 4] = b; wgt[i * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wgt, 4));
    map ??= o.material.map;
    geos.push(g);
  });
  const geometry = bakeSmoothNormals(mergeGeometries(geos));
  const box = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
  mergedPets[id] = { geometry, tops, map, box, clips: gltf.animations };
  return mergedPets[id];
}

export function preparePet(id, gltf, ref, height) {
  const merged = mergePet(id, gltf);
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const tops = merged.tops.map((t) => t.clone(true));
  rig.add(...tops);
  rig.updateMatrixWorld(true);
  const bones = [];
  rig.traverse((o) => { if (o.isBone) bones.push(o); });
  const skeleton = new THREE.Skeleton(bones);
  const body = new THREE.SkinnedMesh(merged.geometry, gate(toon({ map: merged.map }), ref));
  const s = height / merged.box.getSize(new THREE.Vector3()).y;
  const line = new THREE.SkinnedMesh(merged.geometry, gate(outline(0.015 / s), ref));
  rig.add(body, line);
  body.bind(skeleton);
  line.bind(skeleton);
  body.frustumCulled = line.frustumCulled = false; // the bind-pose bounds don't follow the bones
  rig.scale.setScalar(s);
  rig.position.y = -merged.box.min.y * s;
  const mixer = new THREE.AnimationMixer(rig);
  const idle = merged.clips.find((a) => a.name === 'idle') ?? merged.clips[0];
  const action = idle ? mixer.clipAction(idle).play() : null;
  return { root, mixer, clips: merged.clips, action };
}

// ---------- the card ----------

// A seat's card. setLook({ pet, dep, depColors, cardColor }) dresses it (and re-dresses it when the
// player changes gear); react(name) plays one of the pet's clips.
export function createStencilCard(seat, ref) {
  const mesh = new THREE.Group();          // follows the physics body (face = +y)
  const face = new THREE.Group();          // card space: face = +z
  face.rotation.x = -Math.PI / 2;
  mesh.add(face);
  const parts = { card: [], mask: [], reset: [], room: [], restore: [] };
  const add = (pass, obj, parent = face) => { parent.add(obj); parts[pass].push(obj); return obj; };

  const frontMat = new THREE.MeshBasicMaterial({ color: 0xfffbf0 });
  const backMat = new THREE.MeshBasicMaterial({ color: 0xfffbf0 });
  const frontShape = outerShape();
  frontShape.holes.push(roundRect(new THREE.Path(), WIN.cx, WIN.cy, WIN.hw, WIN.hh, WIN.r));
  const front = add('card', new THREE.Mesh(planarUV(new THREE.ShapeGeometry(frontShape, 16)), frontMat));
  front.position.z = CARD_HALF_T;
  const back = add('card', new THREE.Mesh(planarUV(new THREE.ShapeGeometry(outerShape(), 16)), backMat));
  back.rotation.y = Math.PI;
  back.position.z = -CARD_HALF_T;
  const edgeGeo = new THREE.ExtrudeGeometry(outerShape(), { depth: CARD_HALF_T * 2, bevelEnabled: false, curveSegments: 16 });
  edgeGeo.translate(0, 0, -CARD_HALF_T);
  add('card', new THREE.Mesh(edgeGeo, [new THREE.MeshBasicMaterial({ visible: false }), new THREE.MeshBasicMaterial({ color: 0x2a1418 })]));

  const winGeo = new THREE.ShapeGeometry(windowShape(), 16);
  add('mask', new THREE.Mesh(winGeo, maskMaterial(ref))).position.z = CARD_HALF_T;
  add('reset', new THREE.Mesh(winGeo, depthMaterial(ref, true))).position.z = CARD_HALF_T;
  add('restore', new THREE.Mesh(winGeo, depthMaterial(ref, false))).position.z = CARD_HALF_T;

  const room = add('room', new THREE.Group());
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 1.0));
  box.position.set(0, WIN.cy + 0.15, -0.5 - CARD_HALF_T);
  room.add(box);
  // The stage (pet, slipper, round floor) turns to face the camera every frame: the card lies flat
  // and in any direction on the table, but the pet should always stand upright and look at the
  // player, like a little diorama seen through a magic window.
  const stageRoot = new THREE.Group();
  stageRoot.position.set(WIN.cx, WIN.cy + 0.06, -0.24);
  room.add(stageRoot);
  const stageGeo = bakeSmoothNormals(new THREE.CylinderGeometry(0.38, 0.35, 0.05, 32));
  const stageMat = gate(toon({ color: 0xffffff }), ref);
  const stage = new THREE.Mesh(stageGeo, stageMat);
  stage.add(new THREE.Mesh(stageGeo, gate(outline(0.012), ref)));
  stage.position.set(0, STAGE_Y - 0.025, 0);
  stageRoot.add(stage);

  let rank = -1;
  // Walking the card's objects is not free on a slow phone: only when the rank changes (or new
  // objects came in, `force`).
  function setRank(r, force = false) {
    if (r === rank && !force) return;
    rank = r;
    const base = BASE_ORDER + r * 10;
    const order = { card: 0, mask: 1, reset: 2, room: 3, restore: 4 };
    for (const [pass, objs] of Object.entries(parts)) {
      // meshes only: three.js sorts by a parent Group's renderOrder first (groupOrder), so a
      // numbered group would pull the whole room after the restore pass
      for (const obj of objs) obj.traverse((o) => { if (!o.isGroup) o.renderOrder = base + order[pass]; });
    }
  }

  // ---------- dressing ----------
  let look = null;
  let pet = null;      // { root, mixer, clips, action }
  let prop = null;
  let petWanted = null;
  let propKey = '';
  const painted = { front: '', back: '' };

  function setLook(next) {
    const d = SEAT_DEFAULTS[seat];
    const n = {
      pet: next?.pet ?? d.pet,
      dep: next?.dep ?? 'dep_lao',
      depColors: next?.depColors ?? defaultDepColors(next?.dep ?? 'dep_lao'),
      cardColor: next?.cardColor ?? d.cardColor,
    };
    const key = JSON.stringify(n);
    if (look && key === JSON.stringify(look)) return;
    const old = look;
    look = n;
    const c = CARD_COLORS[n.cardColor];
    const art = { ...c, petName: t(`pet.${n.pet}`).toUpperCase() };
    // Faces are drawn once the brand marks load; a newer look may arrive first, so compare with
    // what is actually painted, not with the previous look (that one may never have been painted).
    marksReady.then(() => {
      if (look !== n) return;
      const frontKey = `${n.cardColor}|${n.pet}`;
      if (painted.front !== frontKey) {
        frontMat.map?.dispose();
        frontMat.map = frontTexture(art);
        frontMat.needsUpdate = true;
        painted.front = frontKey;
      }
      if (painted.back !== n.cardColor) {
        backMat.map?.dispose();
        backMat.map = backTexture(art);
        backMat.needsUpdate = true;
        painted.back = n.cardColor;
      }
    });
    if (!old || old.cardColor !== n.cardColor) {
      box.material?.dispose?.();
      box.material = gate(spaceMaterial(art), ref);
      stageMat.color.set(c.floor);
    }
    if (!old || old.pet !== n.pet) loadPetFor(n.pet);
    propKey = ''; // the slipper is rebuilt on the next update (its models may still be loading)
    setRank(Math.max(rank, 0), true);
  }

  function loadPetFor(id) {
    petWanted = id;
    loadPet(id).then((gltf) => {
      if (petWanted !== id) return;
      if (pet) stageRoot.remove(pet.root);
      pet = preparePet(id, gltf, ref, 0.48);
      pet.root.position.set(-0.07, STAGE_Y, -0.05);
      pet.root.rotation.y = 0.3;
      stageRoot.add(pet.root);
      setRank(Math.max(rank, 0), true);
    }).catch((err) => console.warn('pet failed to load', err));
  }

  function updateProp() {
    const key = look ? `${look.dep}|${look.depColors}` : '';
    if (!look || key === propKey) return;
    const model = depModelFor(look.dep, look.depColors);
    if (!model) return;
    propKey = key;
    if (prop) stageRoot.remove(prop);
    prop = model.clone();
    prop.traverse((o) => { if (o.material) o.material = gate(o.material.clone(), ref); });
    prop.scale.multiplyScalar(0.32 / 1.3);
    prop.position.set(0.17, STAGE_Y + 0.01, 0.1);
    prop.rotation.set(0, -0.9, 0);
    stageRoot.add(prop);
    setRank(Math.max(rank, 0), true);
  }

  // One-shot clips return to idle; 'run' and 'dance' loop until the next call.
  function react(name) {
    if (!pet) return;
    const clip = pet.clips.find((c) => c.name === name) ?? pet.clips.find((c) => c.name === 'idle');
    if (!clip) return;
    const next = pet.mixer.clipAction(clip);
    if (pet.action === next && next.isRunning()) return;
    const once = !['idle', 'run', 'walk', 'dance'].includes(name);
    next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    if (pet.action) next.crossFadeFrom(pet.action, 0.2, false);
    next.play();
    pet.action = next;
    if (once) {
      const back = () => {
        pet?.mixer.removeEventListener('finished', back);
        if (pet?.action === next) react('idle');
      };
      pet.mixer.addEventListener('finished', back);
    }
  }

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_HALF_W * 2.1, CARD_HALF_D * 2.1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x2a1418, transparent: true, opacity: 0.22, depthWrite: false }),
  );

  // pets only animate while their window faces up; a face-down card costs nothing extra
  const up = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const upv = new THREE.Vector3();
  const side = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const faceInv = new THREE.Matrix4();
  // Only the side facing the camera draws: a face-down card is 2 draw calls (back + edge), the
  // window passes and the room cost nothing until the card shows its face.
  const toCam = new THREE.Vector3();
  function update(dt, camera) {
    updateProp();
    up.set(0, 1, 0).applyQuaternion(mesh.quaternion);
    const facing = camera ? up.dot(toCam.copy(camera.position).sub(mesh.position)) : up.y;
    const open = facing > 0 && mesh.visible;
    const edgeOn = Math.abs(facing) < 0.05;
    for (const o of [front, ...parts.mask, ...parts.reset, ...parts.restore, room]) o.visible = open || edgeOn;
    back.visible = !open || edgeOn;
    if (!open) return false;
    pet?.mixer.update(dt);
    if (camera) {
      // basis in card space: +z toward the camera, +y = the screen's up, then tip the top toward us
      face.updateWorldMatrix(true, false);
      faceInv.copy(face.matrixWorld).invert();
      fwd.copy(camera.getWorldPosition(camPos)).applyMatrix4(faceInv).sub(stageRoot.position).normalize();
      upv.set(0, 1, 0).applyQuaternion(camera.quaternion).transformDirection(faceInv);
      side.crossVectors(upv, fwd).normalize();
      upv.crossVectors(fwd, side);
      basis.makeBasis(side, upv, fwd);
      stageRoot.quaternion.setFromRotationMatrix(basis);
      stageRoot.rotateX(STAGE_TILT);
    }
    return Boolean(pet);
  }

  setLook(null);
  return { mesh, shadow, setRank, update, setLook, react, stencilRef: ref };
}

// Lowest card first, so a card lying on another draws its window after the one below.
export function orderStencilCards(cards) {
  [...cards].sort((a, b) => a.mesh.position.y - b.mesh.position.y).forEach((c, i) => c.setRank(i));
}
