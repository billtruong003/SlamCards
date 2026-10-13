import * as THREE from 'three';

// ---------- ribbon trail (shared by wind and card trails) ----------

const ribbonMaterial = () => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: { color: { value: new THREE.Color('#ffffff') } },
  vertexShader: /* glsl */ `
    attribute float alpha;
    varying float vAlpha;
    void main() {
      vAlpha = alpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    varying float vAlpha;
    void main() { gl_FragColor = vec4(color, vAlpha); }`,
});

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpSide = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Several ribbons sharing one mesh, so all wind trails (or all card trails) are a single
 * draw call. Each ribbon is a strip of quads through its points; width and opacity follow a
 * profile over the strip's length (t = 0 at the oldest point, 1 at the newest). `flat`
 * ribbons lie in the table plane (wind); the others turn to face the camera (card trails).
 */
export class RibbonSet {
  constructor(scene, count, maxPoints, { width = 0.05, opacity = 0.8, profile = (t) => Math.sin(Math.PI * t), flat = false } = {}) {
    this.max = maxPoints;
    this.width = width;
    this.opacity = opacity;
    this.profile = profile;
    this.flat = flat;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * maxPoints * 2 * 3), 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(count * maxPoints * 2), 1));
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geometry.attributes.alpha.setUsage(THREE.DynamicDrawUsage);
    const index = [];
    for (let r = 0; r < count; r++) {
      for (let i = 0; i < maxPoints - 1; i++) {
        const a = (r * maxPoints + i) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(geometry, ribbonMaterial());
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.ribbons = Array.from({ length: count }, (_, r) => new Ribbon(this, r * maxPoints));
  }

  // Rewrites every ribbon into the shared buffers; call once per drawn frame.
  update(camera) {
    let any = false;
    for (const ribbon of this.ribbons) any = ribbon.write(camera) || any;
    this.mesh.visible = any;
    if (!any) return;
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.alpha.needsUpdate = true;
  }
}

class Ribbon {
  constructor(set, base) {
    this.set = set;
    this.base = base;
    this.points = [];
    this.spare = [];
    this.fade = 1;
    this.written = true;
  }

  push(p) {
    const v = (this.spare.pop() ?? new THREE.Vector3()).copy(p);
    this.points.push(v);
    if (this.points.length > this.set.max) this.spare.push(this.points.shift());
  }

  shrink(count = 1) {
    for (let i = 0; i < count && this.points.length; i++) this.spare.push(this.points.shift());
  }

  clear() {
    this.spare.push(...this.points);
    this.points.length = 0;
  }

  // Returns whether the ribbon is visible.
  write(camera) {
    const { max, flat, profile, width, opacity } = this.set;
    const pos = this.set.mesh.geometry.attributes.position.array;
    const alpha = this.set.mesh.geometry.attributes.alpha.array;
    const n = this.points.length;
    if (n < 2) {
      // collapse once, then leave the zeroed slice alone
      if (!this.written) return false;
      this.written = false;
      alpha.fill(0, this.base * 2, (this.base + max) * 2);
      return false;
    }
    this.written = true;
    for (let i = 0; i < max; i++) {
      const k = Math.min(i, n - 1);
      const p = this.points[k];
      const prev = this.points[Math.max(0, k - 1)];
      const next = this.points[Math.min(n - 1, k + 1)];
      tmpA.subVectors(next, prev);
      if (flat) {
        tmpSide.set(-tmpA.z, 0, tmpA.x);
      } else {
        tmpB.subVectors(camera.position, p);
        tmpSide.crossVectors(tmpA, tmpB);
      }
      if (tmpSide.lengthSq() < 1e-10) tmpSide.copy(UP);
      tmpSide.normalize();
      const t = k / (n - 1);
      const f = i < n ? profile(t) : 0;
      const w = f * width;
      const o = (this.base + i) * 6;
      pos[o] = p.x + tmpSide.x * w;
      pos[o + 1] = p.y + tmpSide.y * w;
      pos[o + 2] = p.z + tmpSide.z * w;
      pos[o + 3] = p.x - tmpSide.x * w;
      pos[o + 4] = p.y - tmpSide.y * w;
      pos[o + 5] = p.z - tmpSide.z * w;
      const a = f * opacity * this.fade;
      alpha[(this.base + i) * 2] = a;
      alpha[(this.base + i) * 2 + 1] = a;
    }
    return true;
  }
}

// ---------- wind: invisible particles that leave looping trails ----------

const POOL = 8;

/**
 * Each particle drifts with the wind and wobbles sideways; some also turn one full loop
 * mid-flight. Only their trails are drawn, thin at both ends and fading out.
 */
export class WindFX {
  constructor(scene) {
    this.strips = new RibbonSet(scene, POOL, 26, { width: 0.026, opacity: 0.85, flat: true });
    this.particles = this.strips.ribbons.map((ribbon) => ({ ribbon, alive: false }));
    this.wind = { angle: 0, strength: 0 };
    this.table = { hx: 6, hz: 3.5 };
    this.shown = false;
    this.spawnClock = 0;
  }

  set(wind, table, shown) {
    this.wind = wind;
    this.table = table;
    this.shown = shown && wind.strength > 0;
    if (!this.shown) {
      for (const p of this.particles) {
        p.alive = false;
        p.ribbon.clear();
      }
      this.strips.update();
    }
  }

  spawn(p) {
    const { hx, hz } = this.table;
    const { angle } = this.wind;
    const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
    // start upwind of a random point so the trail crosses the table
    const x = (Math.random() * 2 - 1) * hx;
    const z = (Math.random() * 2 - 1) * hz;
    p.origin = new THREE.Vector3(x - dir.x * 2.5, 0.06 + Math.random() * 0.12, z - dir.y * 2.5);
    p.dir = dir;
    p.age = 0;
    p.life = 1.8 + Math.random() * 1.2;
    p.loop = Math.random() < 0.45;
    p.loopAt = 0.35 + Math.random() * 0.25;
    p.wobble = 0.15 + Math.random() * 0.25;
    p.phase = Math.random() * Math.PI * 2;
    p.alive = true;
    p.ribbon.clear();
  }

  position(p, out) {
    const speed = 1.6 + this.wind.strength * 0.9;
    const t = p.age;
    let forward = speed * t;
    let side = Math.sin(t * 3 + p.phase) * p.wobble;
    let lift = 0;
    if (p.loop) {
      // one loop-the-loop: a circle traced while the drift continues
      const start = p.loopAt * p.life;
      const dur = 0.55;
      const k = Math.min(Math.max((t - start) / dur, 0), 1);
      if (k > 0) {
        const a = k * Math.PI * 2;
        const r = 0.28;
        forward += r * Math.sin(a) - speed * (k * dur) * 0.75;
        side += r * (1 - Math.cos(a));
        lift = 0.05 * Math.sin(a);
      }
    }
    out.set(
      p.origin.x + p.dir.x * forward - p.dir.y * side,
      p.origin.y + lift,
      p.origin.z + p.dir.y * forward + p.dir.x * side,
    );
    return out;
  }

  // Returns true while anything is moving, so the caller keeps rendering.
  update(dt, camera) {
    if (!this.shown) return false;
    const strength = this.wind.strength;
    const target = Math.round(POOL * (0.35 + 0.65 * strength / 4));
    const alive = this.particles.filter((p) => p.alive).length;
    this.spawnClock -= dt;
    if (alive < target && this.spawnClock <= 0) {
      const free = this.particles.find((p) => !p.alive);
      if (free) this.spawn(free);
      this.spawnClock = 0.25;
    }
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age < p.life) {
        p.ribbon.push(this.position(p, tmpA));
        p.ribbon.fade = Math.min(1, p.age * 3, (p.life - p.age) * 2);
      } else {
        p.ribbon.shrink(2);
        if (!p.ribbon.points.length) p.alive = false;
      }
    }
    this.strips.update(camera);
    return true;
  }
}

// ---------- hit impact: spikes bursting out, a shockwave ring, sparks ----------

const spikeGeometry = new THREE.ConeGeometry(0.14, 1, 4, 1).translate(0, 0.5, 0);
const flashGeometry = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
const ringGeometry = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
const sparkGeometry = new THREE.PlaneGeometry(0.13, 0.13);

export class HitFX {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
  }

  play(point, strength = 1) {
    const group = new THREE.Group();
    group.position.copy(point);
    group.position.y = 0.03;
    this.scene.add(group);
    const white = (opacity) => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity, depthWrite: false });

    const count = 7 + Math.round(strength * 5);
    const spikeMaterial = white(0.95);
    const spikes = Array.from({ length: count }, (_, i) => {
      const mesh = new THREE.Mesh(spikeGeometry, spikeMaterial);
      const yaw = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const tilt = Math.PI / 2 - (0.15 + Math.random() * 0.45);
      mesh.rotation.set(0, yaw, 0, 'YXZ');
      mesh.rotateX(tilt);
      mesh.userData.length = 1.3 + Math.random() * 1.6 * (0.6 + strength);
      mesh.renderOrder = 5;
      group.add(mesh);
      return mesh;
    });

    const flash = new THREE.Mesh(flashGeometry, white(0.9));
    flash.renderOrder = 4;
    group.add(flash);

    const ring = new THREE.Mesh(ringGeometry, white(0.8));
    ring.renderOrder = 5;
    group.add(ring);

    const sparkMaterial = white(1);
    const sparks = Array.from({ length: 10 }, () => {
      const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial);
      mesh.renderOrder = 6;
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3 * (0.5 + strength);
      mesh.userData.v = new THREE.Vector3(Math.cos(a) * speed, 2 + Math.random() * 3, Math.sin(a) * speed);
      group.add(mesh);
      return mesh;
    });

    this.bursts.push({ group, spikes, ring, flash, sparks, spikeMaterial, sparkMaterial, age: 0, strength });
  }

  update(dt, camera) {
    if (!this.bursts.length) return false;
    for (const b of this.bursts) {
      b.age += dt;
      // spikes: shoot out over 0.12 s, thin away by 0.28 s
      const k = Math.min(b.age / 0.28, 1);
      const grow = Math.min(b.age / 0.12, 1);
      for (const s of b.spikes) {
        const len = s.userData.length * (1 - (1 - grow) ** 3);
        s.scale.set(1 - k, len, 1 - k);
        s.visible = k < 1;
      }
      b.spikeMaterial.opacity = 0.95 * (1 - k);
      // flash: a bright disc for the first 0.1 s
      const f = Math.min(b.age / 0.1, 1);
      b.flash.scale.setScalar(0.4 + 0.5 * b.strength + f * 0.4);
      b.flash.material.opacity = 0.9 * (1 - f);
      // shockwave ring
      const r = Math.min(b.age / 0.35, 1);
      const radius = 0.2 + (1.4 + b.strength) * (1 - (1 - r) ** 2);
      b.ring.scale.setScalar(radius);
      b.ring.material.opacity = 0.8 * (1 - r);
      // sparks: fly out, fall, face the camera
      const life = Math.min(b.age / 0.6, 1);
      for (const s of b.sparks) {
        s.userData.v.y -= 14 * dt;
        s.position.addScaledVector(s.userData.v, dt);
        s.quaternion.copy(camera.quaternion);
        s.scale.setScalar(1 - life);
      }
      b.sparkMaterial.opacity = 1 - life;
      b.done = b.age > 0.6;
      if (b.done) {
        this.scene.remove(b.group);
        for (const m of [b.spikeMaterial, b.sparkMaterial, b.flash.material, b.ring.material]) m.dispose();
      }
    }
    this.bursts = this.bursts.filter((b) => !b.done);
    return true;
  }
}

// ---------- white trails behind flying cards ----------

export class CardTrails {
  constructor(scene) {
    this.strips = new RibbonSet(scene, 4, 30, { width: 0.2, opacity: 1, profile: (t) => t ** 1.1 });
    this.trails = {};
  }

  trailFor(seat) {
    this.trails[seat] ??= this.strips.ribbons[Object.keys(this.trails).length];
    return this.trails[seat];
  }

  // Called every frame with the card meshes; a card leaves a trail while it is in the air.
  update(cards, camera) {
    let active = false;
    for (const [seat, { mesh }] of Object.entries(cards)) {
      const trail = this.trailFor(seat);
      const flying = mesh.visible && mesh.position.y > 0.08;
      if (flying) trail.push(mesh.position);
      else trail.shrink(2);
      if (trail.points.length) active = true;
    }
    if (active || this.strips.mesh.visible) this.strips.update(camera);
    return active;
  }

  clear() {
    for (const trail of Object.values(this.trails)) trail.clear();
    this.strips.update();
  }
}
