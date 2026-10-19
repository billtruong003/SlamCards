import * as THREE from 'three';
import { PETS, DEP_IDS, DEP_PARTS, DEP_COLORS, CARD_COLORS, CARD_COLOR_IDS, defaultDepColors } from './catalog.js';
import { depModel, recolourMaterial, setSlotColors } from './deps.js';
import { toonGradient } from './toon.js';
import { t } from './i18n.js';

// The wardrobe: three tabs (pet, slipper + part colours, card colour) over the menu background.
// `look` is { pet, dep, depColors, cardColor }; every pick calls onChange(newLook, picked), picked
// being only the fields that pick changed.
// `taken` lists card colours other players in the room already have.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function petThumb(pet) {
  return `pets/thumbs/${pet}.png`;
}

let preview = null; // the slipper's live 3D preview while the slipper tab is open

function startPreview(canvas, look) {
  stopPreview();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c3a0, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(1.5, 2.5, 3);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.05, 50);
  camera.position.set(0, 1.6, 3.1);
  camera.lookAt(0, 0.05, 0);
  const holder = new THREE.Group();
  scene.add(holder);
  preview = { renderer, scene, camera, holder, mats: [], raf: 0, kind: null };
  showPreviewDep(look);
  const loop = (now) => {
    if (!preview) return;
    preview.raf = requestAnimationFrame(loop);
    holder.rotation.y = 0.6 + Math.sin(now / 1400) * 0.6;
    renderer.render(scene, camera);
  };
  preview.raf = requestAnimationFrame(loop);
}

function showPreviewDep(look) {
  if (!preview) return;
  if (preview.kind !== look.dep) {
    preview.holder.clear();
    preview.mats = [];
    const base = depModel(look.dep);
    if (!base) return;
    const model = base.clone(true);
    model.scale.setScalar(1.25);
    model.traverse((o) => {
      if (o.isMesh && o.material?.isMeshToonMaterial && o.material.map) {
        o.material = recolourMaterial(o.material, DEP_PARTS[look.dep], look.depColors);
        o.material.gradientMap = toonGradient();
        preview.mats.push(o.material);
      }
    });
    preview.holder.add(model);
    preview.kind = look.dep;
  }
  preview.mats.forEach((m) => setSlotColors(m, look.depColors));
}

export function stopPreview() {
  if (!preview) return;
  cancelAnimationFrame(preview.raf);
  preview.renderer.dispose();
  preview = null;
}

export function renderWardrobe(root, { look, taken = [], tab = 'pet', onChange, onDone }) {
  let current = { ...look, depColors: [...look.depColors] };
  let active = tab;

  const tabs = [['pet', 'wardrobe.pet'], ['dep', 'wardrobe.dep'], ['card', 'wardrobe.card']];
  root.innerHTML = `
    <div class="panel menu-card wardrobe">
      <h1 class="stamp" style="font-size:38px">${t('wardrobe.title')}</h1>
      <div class="seg three" id="ward-tabs" role="tablist">
        ${tabs.map(([id, key]) => `<button type="button" role="tab" data-tab="${id}" class="${id === active ? 'on' : ''}" aria-selected="${id === active}"><span class="seg-word">${t(key)}</span></button>`).join('')}
      </div>
      <div class="ward-body" id="ward-body"></div>
      <button class="btn pri wide" id="ward-done">${t('wardrobe.done')}</button>
    </div>`;
  const body = root.querySelector('#ward-body');

  const pick = (patch) => {
    current = { ...current, ...patch };
    onChange({ ...current, depColors: [...current.depColors] }, patch);
    draw();
  };

  function draw() {
    if (active !== 'dep') stopPreview();
    if (active === 'pet') {
      body.innerHTML = `<div class="pet-grid">${PETS.map((p) => `
        <button type="button" class="pet-tile${p === current.pet ? ' on' : ''}" data-pet="${p}" aria-pressed="${p === current.pet}">
          <img src="${petThumb(p)}" alt="" loading="lazy"><span>${esc(t(`pet.${p}`))}</span></button>`).join('')}</div>`;
      body.querySelectorAll('[data-pet]').forEach((b) => { b.onclick = () => pick({ pet: b.dataset.pet }); });
    } else if (active === 'dep') {
      // the 3D preview canvas stays put; only the controls under it are redrawn on each pick
      if (!body.querySelector('#ward-dep-canvas')) {
        body.innerHTML = '<div class="dep-preview"><canvas id="ward-dep-canvas" aria-hidden="true"></canvas></div><div id="ward-dep-controls"></div>';
        startPreview(body.querySelector('#ward-dep-canvas'), current);
      } else {
        showPreviewDep(current);
      }
      const parts = DEP_PARTS[current.dep];
      const controls = body.querySelector('#ward-dep-controls');
      controls.innerHTML = `
        <p class="group-label">${t('wardrobe.pickType')}</p>
        <div class="seg three">${DEP_IDS.map((d) => `<button type="button" data-dep="${d}" class="${d === current.dep ? 'on' : ''}" aria-pressed="${d === current.dep}"><span class="seg-word">${esc(t(`dep.${d}`))}</span></button>`).join('')}</div>
        ${parts.map((part, i) => `
          <p class="group-label">${esc(t(`depPart.${current.dep}.${part.id}`))}</p>
          <div class="swatches">${DEP_COLORS.map((c) => `<button type="button" class="sw${current.depColors[i] === c ? ' on' : ''}" style="background:${c}" data-part="${i}" data-color="${c}" aria-label="${esc(t(`depPart.${current.dep}.${part.id}`))} ${c}" aria-pressed="${current.depColors[i] === c}"></button>`).join('')}</div>`).join('')}`;
      controls.querySelectorAll('[data-dep]').forEach((b) => {
        b.onclick = () => pick({ dep: b.dataset.dep, depColors: defaultDepColors(b.dataset.dep) });
      });
      controls.querySelectorAll('[data-part]').forEach((b) => {
        b.onclick = () => {
          const colors = [...current.depColors];
          colors[Number(b.dataset.part)] = b.dataset.color;
          pick({ depColors: colors });
        };
      });
    } else {
      body.innerHTML = `<div class="color-grid">${CARD_COLOR_IDS.map((c) => {
        const used = taken.includes(c) && c !== current.cardColor;
        return `<button type="button" class="color-tile${c === current.cardColor ? ' on' : ''}" data-color="${c}" ${used ? 'disabled' : ''} style="--c:${CARD_COLORS[c].color}" aria-pressed="${c === current.cardColor}">
          <i>${CARD_COLORS[c].suit}</i><span>${esc(t(`color.${c}`))}</span>${used ? `<small>${t('wardrobe.taken')}</small>` : ''}</button>`;
      }).join('')}</div>`;
      body.querySelectorAll('[data-color]').forEach((b) => { b.onclick = () => pick({ cardColor: b.dataset.color }); });
    }
  }

  root.querySelectorAll('[data-tab]').forEach((b) => {
    b.onclick = () => {
      active = b.dataset.tab;
      root.querySelectorAll('[data-tab]').forEach((x) => {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-selected', String(x === b));
      });
      draw();
    };
  });
  root.querySelector('#ward-done').onclick = () => {
    stopPreview();
    onDone();
  };
  draw();
}

// Three small tiles (pet, slipper with its colours, card colour) that open the wardrobe.
export function gearTiles(look) {
  const dots = look.depColors.map((c) => `<i style="background:${c}"></i>`).join('');
  return `<div class="gear-tiles">
    <button type="button" class="gear-tile" data-ward="pet"><img src="${petThumb(look.pet)}" alt="">${esc(t(`pet.${look.pet}`))}<small>${t('wardrobe.pet')}</small></button>
    <button type="button" class="gear-tile" data-ward="dep"><img src="deps/${look.dep}.png" alt=""><span class="dep-dots">${dots}</span>${esc(t(`dep.${look.dep}`))}<small>${t('wardrobe.dep')}</small></button>
    <button type="button" class="gear-tile" data-ward="card"><span class="card-chip" style="--c:${CARD_COLORS[look.cardColor].color}">${CARD_COLORS[look.cardColor].suit}</span>${esc(t(`color.${look.cardColor}`))}<small>${t('wardrobe.card')}</small></button>
  </div>`;
}
