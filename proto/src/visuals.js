import * as THREE from 'three';
import { TUNE } from './config.js';
import { depModel, depModelFor } from './deps.js';
import { WindFX, HitFX, CardTrails } from './fx.js';

const tmpDir = new THREE.Vector3();

function ring(radius, color, opacity, width = 0.04) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(radius - width, radius, 96).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  mesh.renderOrder = 2;
  return mesh;
}

function disc(radius, color, opacity) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 96).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  mesh.renderOrder = 1;
  return mesh;
}

function slipper() {
  const group = new THREE.Group();
  const sole = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 1.1, 6, 16).rotateZ(Math.PI / 2).scale(1, 0.18, 1),
    new THREE.MeshStandardMaterial({ color: '#f5f7ff', roughness: 0.8 }),
  );
  sole.castShadow = true;
  group.add(sole);
  const strap = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.07, 8, 24, Math.PI).rotateY(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#5b8def' }),
  );
  strap.position.set(-0.25, 0.05, 0);
  group.add(strap);
  return group;
}

export class Visuals {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.threats = [0, 1, 2].map(() => [disc(TUNE.threatRange, '#ff6f9c', 0.07), ring(TUNE.threatRange, '#ff6f9c', 0.45, 0.03)]);
    this.reach = disc(TUNE.reachRadius, '#ffffff', 0.18);
    this.reachEdge = ring(TUNE.reachRadius, '#2a1418', 0.7, 0.04);
    this.forced = disc(TUNE.forcedRadius, '#ff6f9c', 0.22);
    this.forcedEdge = ring(TUNE.forcedRadius, '#d63c6e', 0.95, 0.05);
    this.wind = disc(TUNE.windRadius, '#5b8def', 0.12);
    this.windEdge = ring(TUNE.windRadius, '#5b8def', 0.55, 0.03);
    this.shake = ring(TUNE.handShake, '#2a1418', 0.9, 0.025);
    for (const m of [...this.threats.flat(), this.reach, this.reachEdge, this.forced, this.forcedEdge, this.wind, this.windEdge, this.shake]) {
      m.position.y = 0.004;
      this.group.add(m);
    }

    this.arrows = [0, 1, 2, 3].map(() => {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x2a1418, 0.35, 0.25);
      arrow.line.material.linewidth = 2;
      this.group.add(arrow);
      return arrow;
    });

    this.windFx = new WindFX(scene);
    this.hit = new HitFX(scene);
    this.trails = new CardTrails(scene);

    // dep (position + spin) > depTilt (slap angle) > the seat's slipper model
    this.dep = new THREE.Group();
    this.depTilt = new THREE.Group();
    this.dep.add(this.depTilt);
    this.fallbackDep = slipper();
    this.fallbackDep.position.y = 0.08;
    this.dep.visible = false;
    scene.add(this.dep);

    this.hideAim();
  }

  setWind(wind, table, shown) {
    this.windFx.set(wind, table, shown);
  }

  // Returns true while wind trails are moving, so the caller keeps rendering.
  updateWind(dt, camera) {
    return this.windFx.update(dt, camera);
  }

  hideAim() {
    for (const child of this.group.children) child.visible = false;
  }

  showStandoff(myCardPos, enemyPositions, forced) {
    this.threats.forEach((pair, i) => {
      const enemy = enemyPositions[i];
      for (const m of pair) {
        m.visible = Boolean(enemy);
        if (enemy) {
          m.position.x = enemy.x;
          m.position.z = enemy.z;
        }
      }
    });

    this.reach.visible = this.reachEdge.visible = !forced;
    this.forced.visible = this.forcedEdge.visible = forced;
    for (const m of [this.reach, this.reachEdge, this.forced, this.forcedEdge]) {
      m.position.x = myCardPos.x;
      m.position.z = myCardPos.z;
    }
  }

  showCursor(point, valid, effects, cardPositions) {
    for (const m of [this.wind, this.windEdge, this.shake]) {
      m.visible = true;
      m.position.x = point.x;
      m.position.z = point.z;
    }
    const tint = valid ? '#5b8def' : '#e03b3b';
    this.wind.material.color.set(tint);
    this.windEdge.material.color.set(tint);

    this.arrows.forEach((arrow, i) => {
      const effect = valid && effects[i];
      arrow.visible = Boolean(effect);
      if (!effect) return;
      const target = cardPositions[effect.color];
      tmpDir.set(target.x - point.x, 0, target.z - point.z).normalize();
      arrow.position.set(target.x, 0.06, target.z);
      arrow.setDirection(tmpDir);
      arrow.setLength(0.5 + effect.strength * 2.2, 0.35, 0.25);
    });
  }

  hideCursor() {
    for (const m of [this.wind, this.windEdge, this.shake, ...this.arrows]) m.visible = false;
  }

  lastFrameAt = performance.now();

  get busy() {
    return this.dep.visible;
  }

  dropDep(point, onImpact, kind, colors) {
    const model = depModelFor(kind, colors) ?? depModel(kind) ?? this.fallbackDep;
    if (model.parent !== this.depTilt) {
      this.depTilt.clear();
      this.depTilt.add(model);
      // drawn after the cards: a card's stencil window resets depth and would hide a slipper drawn before it
      model.traverse((o) => { o.renderOrder = 900; });
    }
    if (document.hidden || performance.now() - this.lastFrameAt > 500) {
      onImpact();
      return;
    }
    const start = performance.now();
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      onImpact();
      setTimeout(() => { this.dep.visible = false; }, 450);
    };
    // If animation frames stop mid-drop, land anyway so the slam is never lost.
    setTimeout(land, TUNE.depDropMs + 250);
    this.dep.visible = true;
    this.dep.rotation.y = Math.random() * Math.PI;
    const tick = () => {
      if (landed) return;
      const t = Math.min((performance.now() - start) / TUNE.depDropMs, 1);
      this.dep.position.set(point.x, (1 - t * t) * 2.5, point.z);
      this.depTilt.rotation.x = -(1 - t) * 0.7;
      if (t < 1) requestAnimationFrame(tick);
      else land();
    };
    tick();
  }
}
