import * as THREE from 'three';
import { loadPet, preparePet } from './stencil-card.js';
import { depModelFor } from './deps.js';

// Debug-only (?debug): renders the wardrobe pictures with the game's own materials, lights and
// outlines, on a transparent background. qa/render-assets.mjs saves them to public/.
export async function renderAssets({ pets = [], deps = [], size = 128 } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size * 2, size * 2, false); // drawn at 2x, scaled down below for clean lines
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c3a0, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, 12, 6);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
  const holder = new THREE.Group();
  scene.add(holder);
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const g = out.getContext('2d');
  const box = new THREE.Box3();
  const shoot = (obj, from) => {
    holder.clear();
    holder.add(obj);
    holder.updateMatrixWorld(true);
    box.setFromObject(obj, true);
    const c = box.getCenter(new THREE.Vector3());
    const r = box.getSize(new THREE.Vector3()).length() / 2;
    const dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.98;
    camera.position.copy(c).addScaledVector(from.clone().normalize(), dist);
    camera.lookAt(c);
    renderer.render(scene, camera);
    g.clearRect(0, 0, size, size);
    g.drawImage(canvas, 0, 0, size, size);
    return out.toDataURL('image/png');
  };
  const result = {};
  for (const id of pets) {
    const pet = preparePet(id, await loadPet(id), 0, 1);
    pet.root.traverse((o) => { if (o.material) o.material.stencilWrite = false; });
    pet.mixer.update(0.4);
    pet.root.rotation.y = 0.45;
    result[`pet-${id}`] = shoot(pet.root, new THREE.Vector3(0, 0.35, 1));
  }
  for (const [kind, colors] of deps) {
    const model = depModelFor(kind, colors);
    if (!model) continue;
    const m = model.clone();
    m.rotation.set(0, -0.6, 0);
    result[`dep-${kind}`] = shoot(m, new THREE.Vector3(0.2, 1.1, 0.9));
  }
  renderer.dispose();
  return result;
}
