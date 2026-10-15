import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toonize, outlineMaterial } from './toon.js';
import { DEP_PARTS } from './catalog.js';

// Low-poly slipper models (art/blender/build_slippers_lowpoly.py); each player picks one in the lobby.
// Display names are the locale keys dep.<id>.
export const DEPS = [{ id: 'dep_lao' }, { id: 'dep_to_ong' }, { id: 'dep_le' }];
export const DEFAULT_DEP = { black: 'dep_lao', pink: 'dep_le', blue: 'dep_to_ong', green: 'dep_lao' };
const SCALE = 1.3;

const models = {};

export async function loadDeps() {
  const loader = new GLTFLoader();
  await Promise.all(DEPS.map(async ({ id: name }) => {
    const gltf = await loader.loadAsync(`models/${name}.glb`);
    const root = gltf.scene;
    root.scale.setScalar(SCALE);
    // collect first: the outline meshes added below must not be visited again
    const meshes = [];
    root.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const mesh of meshes) {
      mesh.material = toonize(mesh.material);
      mesh.castShadow = true;
      mesh.add(new THREE.Mesh(mesh.geometry, outlineMaterial()));
    }
    models[name] = root;
  }));
}

export function depModel(kind) {
  return models[kind] ?? null;
}

// ---------- recoloured slippers ----------
// Each slipper's palette texture is a 16 x 4 grid of colour cells; the parts a player can colour
// (catalog.js DEP_PARTS) are whole cells, swapped for a flat colour in the shader. Flat colour is
// what lets the three toon bands show (the palette cells are gradients, which smeared them: ART-01).

const recoloured = new Map(); // `${kind}|${colors}` -> model
const sharedSlots = new WeakMap();

export function recolourMaterial(material, parts, colors) {
  const m = material.clone();
  const slotColor = { value: parts.map((_, i) => new THREE.Color(colors[i])) };
  sharedSlots.set(m, slotColor);
  const cases = parts.map((p, i) => `if (abs(cell.x - ${p.cell[1].toFixed(1)}) < 0.5 && abs(cell.y - ${p.cell[0].toFixed(1)}) < 0.5) c = slotColor[${i}];`).join('\n');
  m.onBeforeCompile = (shader) => {
    shader.uniforms.slotColor = slotColor;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `uniform vec3 slotColor[${parts.length}];\nvoid main() {`)
      .replace('#include <map_fragment>', `
        vec4 tex = texture2D(map, vMapUv);
        vec2 cell = vec2(floor(vMapUv.x * 16.0), floor(vMapUv.y * 4.0));
        vec3 c = tex.rgb;
        ${cases}
        diffuseColor.rgb *= c;`);
  };
  m.customProgramCacheKey = () => `dep-${parts.map((p) => p.cell.join(',')).join('|')}`;
  return m;
}

// Live colour change on a recoloured material (the wardrobe preview).
export function setSlotColors(material, colors) {
  sharedSlots.get(material)?.value.forEach((c, i) => c.set(colors[i]));
}

export function depModelFor(kind, colors) {
  const base = models[kind];
  if (!base || !colors?.length) return base ?? null;
  const key = `${kind}|${colors.join(',')}`;
  if (!recoloured.has(key)) {
    const model = base.clone(true);
    model.traverse((o) => {
      if (o.isMesh && o.material?.isMeshToonMaterial && o.material.map) o.material = recolourMaterial(o.material, DEP_PARTS[kind], colors);
    });
    recoloured.set(key, model);
  }
  return recoloured.get(key);
}
