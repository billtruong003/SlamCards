import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toonize, outlineMaterial } from './toon.js';

// Low-poly slipper models (art/blender/build_slippers_lowpoly.py); each player picks one in the lobby.
export const DEPS = [
  { id: 'dep_lao', label: 'Dép lào' },
  { id: 'dep_to_ong', label: 'Tổ ong' },
  { id: 'dep_le', label: 'Dép lê' },
];
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
