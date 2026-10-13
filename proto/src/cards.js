import * as THREE from 'three';
import { CARD_HALF_W, CARD_HALF_D } from './rules.js';

// Sprite sheet: 15 x 4 cells of 100 x 144 px; the card art fills x 4..96, y 4..140 of a cell.
// Joker in column 13, card back in column 14.
const SHEET_W = 1500;
const SHEET_H = 576;
const CELL_W = 100;
const CELL_H = 144;
const ART_PAD = 4;
// Seats 3 and 4 reuse the black card with its ink recoloured.
const STYLE = {
  black: { row: 2, tint: null },
  pink: { row: 3, tint: null },
  blue: { row: 2, tint: '#2f6fdb' },
  green: { row: 2, tint: '#23955a' },
};
const JOKER_COL = 13;
const BACK_COL = 14;
const CORNER_RADIUS = 0.15;

function cellRect(col, row) {
  return new THREE.Vector4(
    (col * CELL_W + ART_PAD) / SHEET_W,
    1 - ((row + 1) * CELL_H - ART_PAD) / SHEET_H,
    (CELL_W - ART_PAD * 2) / SHEET_W,
    (CELL_H - ART_PAD * 2) / SHEET_H,
  );
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// One plane, two faces: gl_FrontFacing picks the joker or the card back.
// The outline comes from a rounded-rect SDF instead of the sprite's alpha, so the edge
// stays clean at any distance (alpha-to-coverage smooths it with MSAA).
const fragmentShader = /* glsl */ `
  uniform sampler2D sheet;
  uniform vec4 frontRect;
  uniform vec4 backRect;
  uniform vec2 halfSize;
  uniform float radius;
  uniform float highlight;
  uniform vec3 inkTint;
  uniform float useTint;
  varying vec2 vUv;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    float d = roundedBox((vUv - 0.5) * halfSize * 2.0, halfSize, radius);
    float aa = fwidth(d);
    float coverage = 1.0 - smoothstep(-aa, aa, d);
    if (coverage <= 0.0) discard;

    vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec4 rect = gl_FrontFacing ? frontRect : backRect;
    vec4 color = texture2D(sheet, rect.xy + uv * rect.zw);
    vec3 outline = vec3(0.0075, 0.0, 0.0);
    vec3 rgb = mix(outline, color.rgb, color.a);
    float ink = 1.0 - smoothstep(0.02, 0.45, dot(rgb, vec3(0.299, 0.587, 0.114)));
    rgb = mix(rgb, inkTint, ink * useTint);
    rgb = mix(rgb, vec3(1.0, 0.95, 0.6), highlight * 0.35);
    gl_FragColor = vec4(rgb, coverage);
    #include <colorspace_fragment>
  }
`;

let sheetTexture;

function loadSheet() {
  if (!sheetTexture) {
    sheetTexture = new THREE.TextureLoader().load('cards.png');
    sheetTexture.colorSpace = THREE.SRGBColorSpace;
    sheetTexture.generateMipmaps = false;
    sheetTexture.minFilter = THREE.LinearFilter;
    sheetTexture.magFilter = THREE.LinearFilter;
    sheetTexture.anisotropy = 4;
  }
  return sheetTexture;
}

export function createCardMesh(seat) {
  const style = STYLE[seat];
  const geometry = new THREE.PlaneGeometry(CARD_HALF_W * 2, CARD_HALF_D * 2);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
    uniforms: {
      sheet: { value: loadSheet() },
      frontRect: { value: cellRect(JOKER_COL, style.row) },
      backRect: { value: cellRect(BACK_COL, style.row) },
      inkTint: { value: new THREE.Color(style.tint ?? '#000000') },
      useTint: { value: style.tint ? 1 : 0 },
      halfSize: { value: new THREE.Vector2(CARD_HALF_W, CARD_HALF_D) },
      radius: { value: CORNER_RADIUS },
      highlight: { value: 0 },
    },
  });
  // No shadow-map casting: the depth pass would ignore the rounded SDF edge and draw square
  // corners. The flat `shadow` quad below stands in while the card is airborne.
  const mesh = new THREE.Mesh(geometry, material);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_HALF_W * 2.1, CARD_HALF_D * 2.1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x2a1418, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  return { mesh, shadow };
}
