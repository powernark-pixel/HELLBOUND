// Effects: pooled GPU particles, swing arcs, attack telegraphs, ground decals, rain.
import * as THREE from 'three';

const VERT = `
attribute float psize; attribute float palpha; attribute vec3 pcolor;
varying vec3 vC; varying float vA;
uniform float uScale;
void main(){
  vC = pcolor; vA = palpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = psize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform sampler2D map; varying vec3 vC; varying float vA;
void main(){
  vec4 t = texture2D(map, gl_PointCoord);
  float a = t.a * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vC * t.rgb, a);
}`;

export class Particles {
  constructor(scene, map, { max = 2000, additive = false } = {}) {
    this.max = max; this.cur = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('palpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, uScale: { value: 400 } }, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = additive ? 12 : 11;
    scene.add(this.points);
    // per particle sim state
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max);
    this.c0 = new Float32Array(max * 3); this.c1 = new Float32Array(max * 3);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.fadeIn = new Float32Array(max);
  }
  emit(o) {
    const i = this.cur; this.cur = (this.cur + 1) % this.max;
    const p = o.pos, v = o.vel ?? [0, 0, 0];
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.vel[i * 3] = v[0] ?? v.x; this.vel[i * 3 + 1] = v[1] ?? v.y; this.vel[i * 3 + 2] = v[2] ?? v.z;
    this.life[i] = this.maxLife[i] = o.life ?? 1;
    this.s0[i] = o.size ?? 0.3; this.s1[i] = o.sizeEnd ?? this.s0[i];
    this.a0[i] = o.alpha ?? 1;
    const c = o.color ?? [1, 1, 1], ce = o.colorEnd ?? c;
    this.c0.set(c, i * 3); this.c1.set(ce, i * 3);
    this.grav[i] = o.gravity ?? 0; this.drag[i] = o.drag ?? 0; this.fadeIn[i] = o.fadeIn ?? 0;
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const k = 1 - Math.max(0, this.life[i]) / this.maxLife[i]; // 0 -> 1 over life
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02 && this.grav[i] > 0) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; }
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      const fi = this.fadeIn[i] > 0 ? Math.min(1, k / this.fadeIn[i]) : 1;
      this.alpha[i] = this.a0[i] * (1 - k) * fi;
      for (let c = 0; c < 3; c++) this.col[i * 3 + c] = this.c0[i * 3 + c] + (this.c1[i * 3 + c] - this.c0[i * 3 + c]) * k;
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.pcolor.needsUpdate = a.psize.needsUpdate = a.palpha.needsUpdate = true;
  }
}

// flat sector mesh (for swing arcs and attack telegraphs), alpha baked into vertex colours
function sectorGeo(r0, r1, arc, segs = 24, leadBright = true) {
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, a = -arc / 2 + arc * t;
    const fa = leadBright ? Math.pow(t, 1.6) : 1;
    pos.push(Math.sin(a) * r0, 0, Math.cos(a) * r0, Math.sin(a) * r1, 0, Math.cos(a) * r1);
    col.push(1, 1, 1, fa * 0.25, 1, 1, 1, fa);
    if (i < segs) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
}

export class FX {
  constructor(scene, T) {
    this.scene = scene; this.T = T;
    this.add = new Particles(scene, T.spark, { max: 1800, additive: true });
    this.glow = new Particles(scene, T.soft, { max: 900, additive: true });
    this.smoke = new Particles(scene, T.smoke, { max: 1400 });
    this.arcs = []; this.teles = []; this.decals = []; this.loot = [];
    // pooled flash light for hits
    this.flash = new THREE.PointLight(0xffd7a0, 0, 7, 1.8); this.flash.position.set(0, -10, 0); scene.add(this.flash);
    this.flashK = 0;
    // rain
    const N = 900, rp = new Float32Array(N * 6);
    this.rain = { N, rp, base: [], vel: 26 };
    for (let i = 0; i < N; i++) this.rain.base.push([Math.random() * 40 - 20, Math.random() * 14, Math.random() * 34 - 17]);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3).setUsage(THREE.DynamicDrawUsage));
    this.rainMesh = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x8aa0b8, transparent: true, opacity: 0.22, depthWrite: false }));
    this.rainMesh.frustumCulled = false; scene.add(this.rainMesh);
    // interaction highlight ring
    this.hl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.ring, color: new THREE.Color(0xffb03a).multiplyScalar(1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.hl.rotation.x = -Math.PI / 2; this.hl.visible = false; scene.add(this.hl);
  }
  setScale(s) { for (const p of [this.add, this.glow, this.smoke]) p.mat.uniforms.uScale.value = s; }

  // ---------- one-shot effects
  dust(pos, n = 6, k = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = (0.6 + Math.random() * 1.2) * k;
      this.smoke.emit({ pos: pos.clone().add(new THREE.Vector3(Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2)), vel: [Math.cos(a) * s, 0.25 + Math.random() * 0.4, Math.sin(a) * s], life: 0.6 + Math.random() * 0.5, size: 0.35 * k, sizeEnd: 1.1 * k, color: [0.42, 0.39, 0.34], alpha: 0.35, drag: 3 });
    }
  }
  sparks(pos, dir, n = 14, k = 1, color = [1.6, 1.1, 0.5]) {
    for (let i = 0; i < n; i++) {
      const s = (3 + Math.random() * 6) * k;
      const v = new THREE.Vector3(dir.x + (Math.random() - 0.5) * 1.4, 0.3 + Math.random() * 1.1, dir.z + (Math.random() - 0.5) * 1.4).normalize().multiplyScalar(s);
      this.add.emit({ pos, vel: v, life: 0.25 + Math.random() * 0.35, size: 0.09 * k + Math.random() * 0.05, sizeEnd: 0.02, color: [color[0] * 2, color[1] * 2, color[2] * 2], colorEnd: [1.2, 0.3, 0.05], gravity: 9, drag: 1.5 });
    }
    this.glow.emit({ pos, life: 0.12, size: 1.6 * k, sizeEnd: 2.4 * k, color: [1.5, 1.1, 0.7], alpha: 0.9 });
    this.flash.position.copy(pos); this.flashK = 18 * k;
  }
  blood(pos, dir, n = 6) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(dir.x * 2 + (Math.random() - 0.5) * 2, 1 + Math.random() * 2, dir.z * 2 + (Math.random() - 0.5) * 2);
      this.smoke.emit({ pos, vel: v, life: 0.5, size: 0.08, sizeEnd: 0.05, color: [0.28, 0.02, 0.02], alpha: 0.95, gravity: 12 });
    }
    if (Math.random() < 0.7) this.splat(pos.clone().addScaledVector(dir, 0.6 + Math.random() * 0.6), 0.5 + Math.random() * 0.5);
  }
  splat(pos, s) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: this.T.splat[(Math.random() * 3) | 0], transparent: true, depthWrite: false, roughness: 0.2, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -6 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6; m.position.set(pos.x, 0.03, pos.z); this.scene.add(m);
    this.decals.push({ m, life: 40 });
    if (this.decals.length > 30) { const d = this.decals.shift(); this.scene.remove(d.m); d.m.geometry.dispose(); d.m.material.dispose(); }
  }
  lootPop(pos, color = [1.4, 1.1, 0.4], n = 18) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = 1 + Math.random() * 2.5;
      this.add.emit({ pos: pos.clone().add(new THREE.Vector3(0, 0.6, 0)), vel: [Math.cos(a) * s, 2.5 + Math.random() * 3, Math.sin(a) * s], life: 0.6 + Math.random() * 0.4, size: 0.1, sizeEnd: 0.02, color, gravity: 9, drag: 1 });
    }
    this.glow.emit({ pos: pos.clone().add(new THREE.Vector3(0, 0.6, 0)), life: 0.35, size: 1.5, sizeEnd: 3.5, color: color.map(c => c * 0.8), alpha: 0.8 });
  }
  // little glowing chunk that arcs from a junk pile into the player
  lootFly(from, to, color) { this.loot.push({ p: from.clone().add(new THREE.Vector3(0, 0.6, 0)), from: from.clone(), to, t: 0, color, delay: this.loot.length * 0.07 }); }
  spray(from, dir, color) {
    for (let i = 0; i < 4; i++) {
      const v = dir.clone().multiplyScalar(5 + Math.random() * 2).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.3) * 0.8, (Math.random() - 0.5) * 0.8));
      this.smoke.emit({ pos: from, vel: v, life: 0.5, size: 0.12, sizeEnd: 0.5, color, alpha: 0.6, drag: 4 });
    }
  }
  burst(pos, color, n = 30) { // capture / level up
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28;
      this.add.emit({ pos: pos.clone().add(new THREE.Vector3(0, 0.1, 0)), vel: [Math.cos(a) * 6, 0.5, Math.sin(a) * 6], life: 0.7, size: 0.16, sizeEnd: 0.02, color, drag: 2.5 });
    }
    this.glow.emit({ pos: pos.clone().add(new THREE.Vector3(0, 1, 0)), life: 0.6, size: 4, sizeEnd: 9, color: color.map(c => c * 0.6), alpha: 0.8 });
  }
  arc(origin, facing, { r0 = 0.3, r1 = 1.6, arc = 2, color = 0xffffff, life = 0.16, y = 1.0 } = {}) {
    const m = new THREE.Mesh(sectorGeo(r0, r1, arc), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(origin.x, y, origin.z); m.rotation.y = facing; this.scene.add(m);
    this.arcs.push({ m, life, max: life });
  }
  // red danger sector that fills over an enemy wind-up. Returns a handle you update and kill.
  telegraph(range, arc) {
    const outline = new THREE.Mesh(sectorGeo(0.2, range, arc, 24, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3020).multiplyScalar(0.7), vertexColors: true, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const fill = new THREE.Mesh(sectorGeo(0.2, 1, arc, 24, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a10).multiplyScalar(1.2), vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const g = new THREE.Group(); g.add(outline, fill); g.position.y = 0.05; this.scene.add(g);
    const h = { g, fill, range, set: (pos, facing, k) => { g.position.x = pos.x; g.position.z = pos.z; g.rotation.y = facing; fill.scale.set(range * k, 1, range * k); fill.material.opacity = 0.3 + 0.4 * k; }, kill: () => { this.scene.remove(g); outline.geometry.dispose(); fill.geometry.dispose(); } };
    return h;
  }
  highlight(pos, r, color, t) {
    if (!pos) { this.hl.visible = false; return; }
    this.hl.visible = true; this.hl.position.set(pos.x, 0.06, pos.z);
    const s = r * 2 * (1 + Math.sin(t * 4) * 0.04); this.hl.scale.set(s, s, 1);
    this.hl.material.color.set(color).multiplyScalar(1.1 + Math.sin(t * 4) * 0.3);
  }

  update(dt, camTarget, t) {
    this.add.update(dt); this.glow.update(dt); this.smoke.update(dt);
    this.flashK *= Math.pow(0.0005, dt); this.flash.intensity = this.flashK;
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i]; a.life -= dt; a.m.material.opacity = Math.max(0, a.life / a.max);
      a.m.scale.setScalar(1 + (1 - a.life / a.max) * 0.15);
      if (a.life <= 0) { this.scene.remove(a.m); a.m.geometry.dispose(); a.m.material.dispose(); this.arcs.splice(i, 1); }
    }
    for (const d of this.decals) { d.life -= dt; if (d.life < 5) d.m.material.opacity = Math.max(0, d.life / 5); }
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i];
      if (l.delay > 0) { l.delay -= dt; continue; }
      l.t += dt * 1.8; const k = Math.min(1, l.t);
      const to = l.to.clone().add(new THREE.Vector3(0, 1.0, 0));
      l.p.lerpVectors(l.from.clone().add(new THREE.Vector3(0, 0.5, 0)), to, k); l.p.y += Math.sin(k * Math.PI) * 1.4;
      this.add.emit({ pos: l.p, life: 0.25, size: 0.22, sizeEnd: 0.02, color: l.color });
      if (k >= 1) { this.glow.emit({ pos: to, life: 0.25, size: 0.6, sizeEnd: 1.4, color: l.color, alpha: 0.7 }); this.loot.splice(i, 1); }
    }
    // rain falls around the camera target
    const R = this.rain, rp = R.rp;
    for (let i = 0; i < R.N; i++) {
      const b = R.base[i];
      b[1] -= R.vel * dt; if (b[1] < 0) { b[1] += 14; b[0] = Math.random() * 40 - 20; b[2] = Math.random() * 34 - 17; if (Math.random() < 0.15) this.smoke.emit({ pos: new THREE.Vector3(camTarget.x + b[0], 0.03, camTarget.z + b[2]), life: 0.2, size: 0.12, sizeEnd: 0.25, color: [0.5, 0.55, 0.6], alpha: 0.25 }); }
      const x = camTarget.x + b[0], y = b[1], z = camTarget.z + b[2];
      rp[i * 6] = x; rp[i * 6 + 1] = y; rp[i * 6 + 2] = z; rp[i * 6 + 3] = x + 0.05; rp[i * 6 + 4] = y + 0.45; rp[i * 6 + 5] = z + 0.02;
    }
    this.rainMesh.geometry.attributes.position.needsUpdate = true;
  }
}
