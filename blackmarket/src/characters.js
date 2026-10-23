// Procedural humanoid rig. Characters are built from capsules on a joint hierarchy
// and posed every frame in code, so stance (posture), gear and actions all blend.
// Facing is +Z. The character's right side is -X.
import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const outCubic = t => 1 - Math.pow(1 - t, 3);

export class Rig {
  constructor(T, o = {}) {
    this.o = o;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.root.add(this.body);
    this.mats = [];
    this.time = Math.random() * 10; this.phase = 0; this.flashT = 0; this.flashColor = new THREE.Color(1, 1, 1);
    const M = (hex, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...extra }); this.mats.push(m); return m; };
    const cloth = T.cloth;
    const mSkin = M(o.skin ?? 0x9c7458, { roughness: 0.6 });
    const mTop = M(o.top ?? 0x55585a, { map: cloth });
    const mPants = M(o.pants ?? 0x34373d, { map: cloth });
    const mShoes = M(o.shoes ?? 0x1c1c1e, { roughness: 0.7 });
    const mDark = M(0x0c0c0d, { roughness: 0.5 });
    this.m = { mSkin, mTop, mPants, mShoes };
    const part = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    const G = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
    this.part = part; this.G = G; this.cap = cap; this.M = M;

    // hips + legs
    this.hips = G(this.body, 0, 0.92, 0);
    part(new THREE.SphereGeometry(0.16, 12, 8), mPants, this.hips, 0, 0, 0).scale.set(1.12, 0.72, 0.8);
    this.leg = [];
    for (const side of [1, -1]) {
      const hip = G(this.hips, 0.095 * side, -0.02, 0);
      part(cap(0.074, 0.3), mPants, hip, 0, -0.2, 0);
      const knee = G(hip, 0, -0.42, 0);
      part(cap(0.064, 0.3), mPants, knee, 0, -0.2, 0);
      const ankle = G(knee, 0, -0.42, 0);
      part(new THREE.BoxGeometry(0.12, 0.08, 0.25), mShoes, ankle, 0, -0.04, 0.05);
      this.leg.push({ hip, knee, ankle, side });
    }
    // spine + torso
    this.spine = G(this.hips, 0, 0.04, 0);
    this.torso = part(cap(0.17, 0.24), mTop, this.spine, 0, 0.27, 0); this.torso.scale.set(1, 1, 0.68);
    this.chest = G(this.spine, 0, 0.42, 0);
    // arms
    this.arm = [];
    for (const side of [1, -1]) {
      const sh = G(this.chest, 0.205 * side, 0, 0);
      const upper = part(cap(0.056, 0.2), mTop, sh, 0, -0.15, 0);
      const elbow = G(sh, 0, -0.29, 0);
      const fore = part(cap(0.048, 0.18), o.sleeves === false ? mSkin : mTop, elbow, 0, -0.13, 0);
      const hand = G(elbow, 0, -0.27, 0);
      part(new THREE.SphereGeometry(0.052, 10, 8), mSkin, hand, 0, -0.01, 0).scale.set(1, 1.1, 0.9);
      this.arm.push({ sh, elbow, hand, upper, fore, side });
    }
    // neck + head
    this.neck = G(this.chest, 0, 0.05, 0);
    part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8), mSkin, this.neck, 0, 0.03, 0);
    this.head = G(this.neck, 0, 0.1, 0);
    part(new THREE.SphereGeometry(0.115, 14, 10), mSkin, this.head, 0, 0.1, 0.005).scale.set(0.9, 1.05, 0.96);
    for (const s of [1, -1]) part(new THREE.SphereGeometry(0.014, 6, 4), mDark, this.head, 0.04 * s, 0.12, 0.1);
    part(new THREE.BoxGeometry(0.03, 0.04, 0.03), mSkin, this.head, 0, 0.09, 0.112);
    if (o.hair) { const h = part(new THREE.SphereGeometry(0.122, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), M(o.hair, { roughness: 0.9 }), this.head, 0, 0.11, -0.01); h.scale.set(0.95, 1, 1); }

    // ---------- outfit pieces (toggled by setBody / built per character)
    this.hood = null; this.jacket = [];
    if (o.hood) {
      const mh = mTop;
      this.hood = part(new THREE.SphereGeometry(0.15, 14, 10, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.64), mh, this.head, 0, 0.1, -0.01);
      this.hood.material.side = THREE.DoubleSide;
      this.hoodBack = part(new THREE.SphereGeometry(0.13, 10, 6), mh, this.chest, 0, -0.02, -0.12); this.hoodBack.scale.set(1.2, 0.5, 0.6);
    }
    if (o.jacket) {
      const mj = M(o.jacket, { map: cloth, roughness: 0.75 });
      const mpad = M(0x22261e, { roughness: 0.6 });
      const shell = part(cap(0.188, 0.25), mj, this.spine, 0, 0.28, 0); shell.scale.set(1.05, 1, 0.76);
      const collar = part(new THREE.TorusGeometry(0.1, 0.035, 6, 14), mj, this.chest, 0, 0.03, 0); collar.rotation.x = Math.PI / 2;
      const strap = part(new THREE.BoxGeometry(0.05, 0.5, 0.02), M(0x2a2018, { roughness: 0.6 }), this.spine, 0, 0.27, 0.135); strap.rotation.z = 0.6;
      const strapB = part(new THREE.BoxGeometry(0.05, 0.5, 0.02), strap.material, this.spine, 0, 0.27, -0.135); strapB.rotation.z = -0.6;
      this.jacket.push(shell, collar, strap, strapB);
      for (const a of this.arm) {
        const pad = part(new THREE.SphereGeometry(0.085, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), mpad, a.sh, 0.01 * a.side, 0.02, 0); pad.scale.set(1.1, 0.8, 1.15);
        const sl = part(cap(0.064, 0.18), mj, a.sh, 0, -0.14, 0);
        const wrap = part(new THREE.CylinderGeometry(0.052, 0.052, 0.08, 8), M(0xb8b2a0, { roughness: 0.9 }), a.elbow, 0, -0.22, 0);
        this.jacket.push(pad, sl, wrap);
      }
    }
    if (o.bandana) {
      const mb = M(o.bandana, { map: cloth });
      part(new THREE.BoxGeometry(0.2, 0.08, 0.08), mb, this.head, 0, 0.05, 0.075);
      const tri = part(new THREE.ConeGeometry(0.1, 0.1, 3), mb, this.head, 0, 0.0, 0.08); tri.rotation.x = Math.PI; tri.scale.set(1, 1, 0.4);
    }
    if (o.cap) {
      const mc = M(o.cap, { roughness: 0.7 });
      part(new THREE.SphereGeometry(0.124, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mc, this.head, 0, 0.12, 0);
      const brim = part(new THREE.BoxGeometry(0.18, 0.015, 0.12), mc, this.head, 0, 0.14, o.capBack ? -0.15 : 0.15); brim.rotation.x = o.capBack ? -0.15 : 0.15;
    }
    if (o.beanie) part(new THREE.SphereGeometry(0.126, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), M(o.beanie, { map: cloth }), this.head, 0, 0.12, 0).scale.set(1, 1.1, 1);
    if (o.chain) { const c = part(new THREE.TorusGeometry(0.12, 0.014, 6, 18), M(0xd4a83a, { metalness: 0.9, roughness: 0.25 }), this.chest, 0, -0.04, 0.03); c.rotation.x = Math.PI / 2 - 0.5; }
    if (o.stripes) for (const a of this.arm) part(new THREE.BoxGeometry(0.016, 0.24, 0.02), M(o.stripes, { roughness: 0.6 }), a.sh, 0.055 * a.side, -0.15, 0);
    if (o.stripes) for (const l of this.leg) part(new THREE.BoxGeometry(0.016, 0.36, 0.02), M(o.stripes, { roughness: 0.6 }), l.hip, 0.075 * l.side, -0.2, 0);
    if (o.coat) {
      const mc = M(o.coat, { map: cloth, roughness: 0.8, side: THREE.DoubleSide });
      part(new THREE.CylinderGeometry(0.19, 0.3, 0.72, 14, 1, true), mc, this.hips, 0, -0.3, -0.01);
      const ct = part(cap(0.19, 0.26), mc, this.spine, 0, 0.28, 0); ct.scale.set(1.08, 1, 0.78);
      for (const a of this.arm) part(cap(0.063, 0.2), mc, a.sh, 0, -0.15, 0);
      if (o.scarf) { const s = part(new THREE.TorusGeometry(0.085, 0.04, 6, 14), M(o.scarf, { map: cloth }), this.chest, 0, 0.04, 0); s.rotation.x = Math.PI / 2; }
    }

    // ---------- weapons (held in the right hand, pointing forward)
    const right = this.arm[1].hand;
    this.weapons = {};
    {
      const g = G(right, 0, -0.02, 0); g.rotation.x = Math.PI / 2;
      const mr = M(0x6a4a30, { map: T.rust, metalness: 0.6, roughness: 0.6 });
      part(new THREE.CylinderGeometry(0.026, 0.026, 0.62, 8), mr, g, 0, 0.22, 0);
      const bend = part(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 8), mr, g, 0, 0.58, 0.04); bend.rotation.x = 0.4;
      part(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), M(0x3a3c3f, { metalness: 0.8, roughness: 0.4 }), g, 0, 0.68, 0.085).rotation.x = 0.4;
      part(new THREE.CylinderGeometry(0.031, 0.031, 0.16, 8), M(0x1a1a1a, { roughness: 0.9 }), g, 0, 0.0, 0);
      this.weapons.pipe = g; g.userData.tip = new THREE.Vector3(0, 0.7, 0.09);
    }
    {
      const g = G(right, 0, -0.02, 0); g.rotation.x = Math.PI / 2;
      part(new THREE.CylinderGeometry(0.045, 0.024, 0.82, 10), M(0x7a5a38, { roughness: 0.7 }), g, 0, 0.32, 0);
      for (let i = 0; i < 4; i++) { const n = part(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), M(0x9a9a9a, { metalness: 0.9, roughness: 0.3 }), g, 0, 0.55 + i * 0.05, 0); n.rotation.z = i * 0.8 + 0.5; }
      this.weapons.bat = g; g.userData.tip = new THREE.Vector3(0, 0.72, 0);
    }
    {
      const g = G(right, 0, -0.02, 0); g.rotation.x = Math.PI / 2;
      part(new THREE.BoxGeometry(0.03, 0.1, 0.03), M(0x1a1a1a), g, 0, 0.0, 0);
      part(new THREE.BoxGeometry(0.008, 0.18, 0.035), M(0xb0b4b8, { metalness: 0.9, roughness: 0.25 }), g, 0, 0.14, 0);
      this.weapons.knife = g; g.userData.tip = new THREE.Vector3(0, 0.22, 0);
    }
    this.setWeapon(o.weapon ?? 'fists');
    this.setBody(o.jacket ? 'jacket' : 'rags');

    // ---------- ground readability: blob shadow + team ring
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: T.blob, transparent: true, depthWrite: false, opacity: 0.55 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; this.root.add(blob); this.blob = blob;
    if (o.ring) {
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ map: T.ring, color: new THREE.Color(o.ring).multiplyScalar(o.ringK ?? 1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.035; this.root.add(ring); this.ring = ring;
    }
    const s = o.scale ?? 1, bulk = o.bulk ?? 1;
    this.root.scale.set(s * bulk, s, s * bulk);
  }

  setWeapon(kind) { this.weapon = kind; for (const k in this.weapons) this.weapons[k].visible = k === kind; }
  setBody(kind) {
    this.bodyKind = kind;
    const j = kind === 'jacket';
    this.jacket.forEach(m => (m.visible = j));
    if (this.hood) { this.hood.visible = !j; this.hoodBack.visible = !j; }
  }
  flash(color = 0xffffff, dur = 0.12) { this.flashColor.set(color); this.flashT = dur; this.flashDur = dur; }
  // world position of the weapon tip / hand (for sparks and trails)
  handWorld(out = new THREE.Vector3()) {
    const w = this.weapons[this.weapon];
    if (w && w.visible) return w.localToWorld(out.copy(w.userData.tip));
    return this.arm[1].hand.getWorldPosition(out);
  }
  headWorld(out = new THREE.Vector3()) { return this.head.localToWorld(out.set(0, 0.14, 0.1)); }

  // st: { move 0..1, action, t (0..1 progress), posture 0..1, guard }
  update(dt, st) {
    this.time += dt;
    const P = st.posture ?? 0.5, mv = st.move ?? 0, tm = this.time;
    this.phase += dt * (mv > 0.02 ? 6 + 5 * mv : 0);
    const sw = Math.sin(this.phase), cw = Math.cos(this.phase), br = Math.sin(tm * 1.7);
    const armed = this.weapon !== 'fists';

    // ---- base pose: weak = hunched, head down, arms hanging in; confident = upright, wide, guard up
    let hipsY = 0.92 + Math.abs(sw) * 0.04 * mv - 0.02 * mv - (1 - P) * 0.03;
    let spX = lerp(0.36, 0.05, P) + br * 0.012 + mv * 0.08, spY = sw * 0.06 * mv, spZ = 0;
    let nkX = lerp(0.26, -0.06, P) - mv * 0.05, nkY = 0;
    const L = this.leg[0], R = this.leg[1], AL = this.arm[0], AR = this.arm[1];
    const stance = lerp(0.015, 0.075, P);
    let lx = -sw * 0.6 * mv, rx = sw * 0.6 * mv;
    let lk = 0.06 + Math.max(0, cw) * 0.95 * mv, rk = 0.06 + Math.max(0, -cw) * 0.95 * mv;
    let lz = stance, rz = -stance;
    let alx = sw * 0.5 * mv + lerp(-0.1, 0.02, P), arx = -sw * 0.5 * mv + lerp(-0.1, 0.02, P);
    let aliz = lerp(-0.06, 0.12, P) * -1, ariz = lerp(-0.06, 0.12, P) * -1; // inward rotation (negative = outward)
    let ale = -0.25 - 0.35 * mv, are = -0.25 - 0.35 * mv;
    let handRx = 0, bodyRx = 0, bodyY = 0;
    // guard stance when armed and confident and not walking fast
    if (armed && st.guard !== false) {
      const g = P * (1 - mv * 0.6);
      arx = lerp(arx, -0.45, g); are = lerp(are, -1.25, g); ariz = lerp(ariz, 0.15, g); handRx = lerp(0, -0.5, g);
      alx = lerp(alx, -0.3, g * 0.6); ale = lerp(ale, -0.9, g * 0.6);
    }

    const a = st.action, t = st.t ?? 0;
    if (a === 'punch') {
      if (t < 0.35) { const k = ease(t / 0.35); arx = lerp(arx, 0.45, k); are = lerp(are, -1.7, k); spY = -0.35 * k; }
      else if (t < 0.6) { const k = outCubic((t - 0.35) / 0.25); arx = lerp(0.45, -1.45, k); are = lerp(-1.7, -0.1, k); spY = lerp(-0.35, 0.45, k); ariz = 0.15; spX += 0.12 * k; }
      else { const k = ease((t - 0.6) / 0.4); arx = lerp(-1.45, arx, k); are = lerp(-0.1, are, k); spY = lerp(0.45, 0, k); }
      alx = -0.7; ale = -1.8; aliz = 0.25;
    } else if (a === 'swing') {
      if (t < 0.38) { const k = ease(t / 0.38); arx = lerp(arx, -2.75, k); ariz = lerp(ariz, -0.35, k); are = lerp(are, -1.1, k); spY = -0.5 * k; handRx = lerp(handRx, -0.4, k); hipsY -= 0.04 * k; }
      else if (t < 0.6) { const k = outCubic((t - 0.38) / 0.22); arx = lerp(-2.75, -0.3, k); ariz = lerp(-0.35, 0.35, k); are = lerp(-1.1, -0.1, k); spY = lerp(-0.5, 0.5, k); spX += 0.3 * k; handRx = lerp(-0.4, 0.8, k); hipsY -= 0.08; lx = -0.35; rx = 0.25; lk = 0.35; }
      else { const k = ease((t - 0.6) / 0.4); arx = lerp(-0.3, arx, k); ariz = lerp(0.35, ariz, k); are = lerp(-0.1, are, k); spY = lerp(0.5, 0, k); spX += 0.3 * (1 - k); handRx = lerp(0.8, handRx, k); hipsY -= 0.08 * (1 - k); }
      alx = -0.5; ale = -1.3;
    } else if (a === 'stab') {
      if (t < 0.4) { const k = ease(t / 0.4); arx = lerp(arx, 0.3, k); are = lerp(are, -1.9, k); spY = -0.3 * k; handRx = -1.4 * k; }
      else if (t < 0.6) { const k = outCubic((t - 0.4) / 0.2); arx = lerp(0.3, -1.4, k); are = lerp(-1.9, -0.05, k); spY = lerp(-0.3, 0.35, k); handRx = lerp(-1.4, -1.6, k); spX += 0.2 * k; }
      else { const k = ease((t - 0.6) / 0.4); arx = lerp(-1.4, arx, k); are = lerp(-0.05, are, k); spY = lerp(0.35, 0, k); handRx = lerp(-1.6, handRx, k); }
    } else if (a === 'hit') {
      const f = Math.pow(1 - t, 2);
      spX -= 0.5 * f; nkX -= 0.45 * f; aliz -= 0.5 * f; ariz -= 0.5 * f; alx += 0.5 * f; arx += 0.5 * f; hipsY -= 0.05 * f; spZ = 0.15 * f * Math.sin(tm * 30);
    } else if (a === 'use') {
      hipsY = 0.62; lx = -1.05; rx = -0.75; lk = 1.65; rk = 1.35; spX = 0.62; nkX = 0.2;
      alx = -1.05 + Math.sin(tm * 9) * 0.28; arx = -1.1 + Math.sin(tm * 9 + 1.6) * 0.28; ale = -0.45; are = -0.45; aliz = 0.15; ariz = 0.15;
    } else if (a === 'dodge') {
      const k = Math.sin(t * Math.PI);
      hipsY -= 0.28 * k; spX = lerp(spX, 0.85, k); lx = -0.9 * k; rx = 0.6 * k; lk = 1.2 * k; rk = 0.8 * k; alx = 0.9 * k; arx = 0.9 * k; nkX = 0.1;
    } else if (a === 'spray') {
      arx = -1.45 + Math.sin(tm * 7) * 0.08; are = -0.15; ariz = 0.1 + Math.sin(tm * 3) * 0.15; spX = 0.1; alx = 0.1; ale = -1.6; aliz = -0.5;
    } else if (a === 'lean') {
      spX = -0.06 + br * 0.01; nkX = 0.05; lx = 0.05; rx = -0.2; rk = 0.25; lz = 0.12;
      alx = -0.5; ale = -1.75; aliz = 0.62;
      const smoke = (tm % 6) < 1.3;
      if (smoke) { arx = -0.25; are = -2.35; ariz = 0.38; nkX = -0.05; } else { arx = -0.48; are = -1.7; ariz = 0.6; }
      this.smoking = smoke;
    } else if (a === 'talk') {
      nkY = Math.sin(tm * 2.2) * 0.15; arx = -0.4 + Math.sin(tm * 4) * 0.25; are = -1.2;
    } else if (a === 'cheer') {
      const k = ease(Math.min(1, t * 3));
      arx = lerp(arx, -2.9, k); are = lerp(are, -0.2, k); spX = lerp(spX, -0.1, k); nkX = -0.2 * k; handRx = -0.4;
    }

    // ---- apply
    this.hips.position.y = hipsY;
    this.spine.rotation.set(spX, spY, spZ);
    this.neck.rotation.set(nkX, nkY, 0);
    L.hip.rotation.set(lx, 0, lz); R.hip.rotation.set(rx, 0, rz);
    L.knee.rotation.x = lk; R.knee.rotation.x = rk;
    L.ankle.rotation.x = -(lx + lk) * 0.85; R.ankle.rotation.x = -(rx + rk) * 0.85;
    AL.sh.rotation.set(alx, 0, -AL.side * aliz); AR.sh.rotation.set(arx, 0, -AR.side * ariz);
    AL.elbow.rotation.x = ale; AR.elbow.rotation.x = are;
    AR.hand.rotation.x = handRx;

    // ---- downed / waking: tip the whole body over backwards
    if (a === 'downed' || a === 'sleep') {
      const k = a === 'sleep' ? 1 : outCubic(Math.min(1, t));
      bodyRx = -Math.PI / 2 * k; bodyY = 0.13 * k;
      AL.sh.rotation.set(-0.3, 0, -AL.side * -1.1 * k); AR.sh.rotation.set(-0.2, 0, -AR.side * -0.9 * k);
      L.hip.rotation.set(-0.1, 0, 0.18 * k); R.hip.rotation.set(-0.25, 0, -0.12 * k); R.knee.rotation.x = 0.5 * k;
      this.neck.rotation.x = -0.25 * k; this.spine.rotation.set(0, 0, 0.05);
      if (a === 'sleep') { this.spine.rotation.x = Math.sin(tm * 1.2) * 0.02; L.knee.rotation.x = 0.7; L.hip.rotation.x = -0.6; }
    } else if (a === 'wake') {
      const k = 1 - ease(Math.min(1, t));
      bodyRx = -Math.PI / 2 * k; bodyY = 0.13 * k;
      this.spine.rotation.x += 0.5 * Math.sin(Math.min(1, t) * Math.PI);
    }
    this.body.rotation.x = bodyRx; this.body.position.y = bodyY;
    if (bodyRx) this.body.position.z = 0;

    // ---- hit flash
    if (this.flashT > 0) {
      this.flashT -= dt;
      const k = Math.max(0, this.flashT / this.flashDur);
      for (const m of this.mats) { m.emissive.copy(this.flashColor); m.emissiveIntensity = k * 1.6; }
    } else if (this.flashDur) { for (const m of this.mats) m.emissiveIntensity = 0; this.flashDur = 0; }
  }
}

// ---------------------------------------------------------------- presets
export function makePlayer(T) {
  return new Rig(T, {
    skin: 0x9a7056, top: 0x4e5150, pants: 0x2f3236, shoes: 0x3a3330, hood: true, jacket: 0x3a4030, hair: 0x1c1712,
    ring: 0xb6ff3a, ringK: 1.0,
  });
}
export function makeRival(T, kind) {
  if (kind === 'boss') return new Rig(T, {
    skin: 0x6e4a36, top: 0x5a1612, pants: 0x1a1a1c, shoes: 0xd8d4c8, stripes: 0xd8d4c8, cap: 0x141414, capBack: true, chain: true,
    weapon: 'bat', scale: 1.1, bulk: 1.18, ring: 0xff4a3a, ringK: 1.4,
  });
  return new Rig(T, {
    skin: kind === 'a' ? 0x8a6048 : 0xa47a5c, top: 0x6a1a16, pants: 0x232326, shoes: 0x1b1b1b, stripes: 0xbdb7a8, bandana: 0xb3201a,
    hair: 0x111111, weapon: kind === 'a' ? 'fists' : 'knife', ring: 0xff4a3a, ringK: 1.0,
  });
}
export function makeFence(T) {
  return new Rig(T, { skin: 0x7a5442, top: 0x2a2a2e, pants: 0x1e1e22, shoes: 0x111111, coat: 0x2b2a30, scarf: 0xb02a78, beanie: 0x3a3a40, ring: 0xff3ea5, ringK: 0.8 });
}
