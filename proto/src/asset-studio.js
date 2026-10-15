import * as THREE from 'three';
import { loadPet, preparePet } from './stencil-card.js';
import { depModelFor } from './deps.js';

// Debug-only (?debug): renders the wardrobe pictures with the game's own materials, lights and
// outlines, on a transparent background. qa/render-assets.mjs saves them to public/.
export async function renderAssets({ pets = [], deps = [], size = 128 } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const PAD = Math.round(size * 0.06); // room for the ink sticker line around the shape
  const inner = size - PAD * 2;
  renderer.setSize(inner * 3, inner * 3, false); // drawn at 3x, scaled down below for clean edges
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
  // Flat ambient + one strong key light: the toon ramp then shows as 3 clean bands. (A hemisphere
  // light adds a smooth gradient by normal that hides them, which reads as plain lit shading.)
  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  scene.add(sun);
  scene.add(camera);
  camera.add(sun);
  sun.position.set(-1.2, 1.6, 1.0); // camera space: from the upper left, in front
  sun.target.position.set(0, 0, -1);
  camera.add(sun.target);
  const holder = new THREE.Group();
  scene.add(holder);
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const g = out.getContext('2d');
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = size;
  const tg = tmp.getContext('2d');
  const INK = '#2a1418';
  const LINE = Math.max(2, Math.round(size / 40)); // 3 px at 128
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
    // ink silhouette: the shape filled with ink, stamped around a circle, then the picture on top
    tg.clearRect(0, 0, size, size);
    tg.globalCompositeOperation = 'source-over';
    tg.drawImage(canvas, PAD, PAD, inner, inner);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = INK;
    tg.fillRect(0, 0, size, size);
    g.clearRect(0, 0, size, size);
    for (let a = 0; a < 16; a++) {
      g.drawImage(tmp, Math.cos(a / 8 * Math.PI) * LINE, Math.sin(a / 8 * Math.PI) * LINE);
    }
    g.drawImage(tmp, 0, 0); // fill pinholes inside the line
    g.drawImage(canvas, PAD, PAD, inner, inner);
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
