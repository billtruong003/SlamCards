import * as THREE from 'three';

// Shared cel-shading look: three light bands instead of smooth shading.
let gradient;
export function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

export function toonize(material) {
  if (Array.isArray(material)) return material.map(toonize);
  if (!material?.isMeshStandardMaterial) return material;
  const toon = new THREE.MeshToonMaterial({
    color: material.color,
    map: material.map,
    gradientMap: toonGradient(),
  });
  material.dispose();
  return toon;
}

export function toonizeTree(root) {
  root.traverse((o) => {
    if (o.isMesh) o.material = toonize(o.material);
  });
}

// Inverted-hull outline: the back faces pushed out along the normals, drawn in ink colour.
export function outlineMaterial(thickness = 0.008) {
  const material = new THREE.MeshBasicMaterial({ color: 0x2a1418, side: THREE.BackSide });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n  transformed += normalize(normal) * ${thickness.toFixed(4)};`,
    );
  };
  return material;
}
