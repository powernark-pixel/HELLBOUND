// THE CROSSING — the one starting district.
// Top-down layout (north = -z, the camera looks north):
//
//   z=-20  ┌─ north block (KINGS tag wall) ──────────────┬─ Pawn shop ─┐
//          │  CORNER PLAZA: couch, stash, burning barrel │  (buyer)    │
//   z=-12  ├─ barricade ──── [ choke gap ] ─────────────┐│             │
//          │ ALLEY │  block B1  │ road │ storage B3     │└─ neon ──────┤
//   z=-6   │ junk  │            │      ├─ LAB UNIT ─────┤  buyer yard  │
//          │ piles │            │      │  (shutter door)│  van         │
//   z=3    │       └────────────┘      └────────────────┘              │
//          │            ======= STREET (east–west) =======             │
//   z=12   │ HOVEL │                 vacant lot                        │
//   z=18   └───────┴───────────────────────────────────────────────────┘
//         x=-22   -16          -6  -1  0.5            11            24
import * as THREE from 'three';
import { rng } from './textures.js';

export const BOUNDS = { minX: -21.6, maxX: 23.6, minZ: -19.5, maxZ: 17.2 };

export function buildLevel(scene, T) {
  const L = {
    colliders: [], occluders: [], emitters: [], junk: [], flickers: [], spinners: [], tickers: [],
    lights: {}, groups: {}, spots: {},
  };
  const R = rng(1337);
  const root = new THREE.Group(); scene.add(root);

  // ------------------------------------------------------------ materials
  const std = (o, den = 0.5) => { const m = new THREE.MeshStandardMaterial(o); m.userData.den = den; return m; };
  const M = {
    asphalt: std({ map: T.asphalt, roughnessMap: T.asphaltR, bumpMap: T.asphalt, bumpScale: 1.2, envMapIntensity: 0.9 }, 0.18),
    concrete: std({ map: T.concrete, bumpMap: T.concrete, bumpScale: 0.8, roughness: 0.92, envMapIntensity: 0.3 }, 0.25),
    concWall: std({ map: T.concreteWall, roughness: 0.95, envMapIntensity: 0.2 }, 0.22),
    brick: std({ map: T.brick, bumpMap: T.brick, bumpScale: 1.5, roughness: 0.95, envMapIntensity: 0.2 }, 0.3),
    wallTeal: std({ map: T.wallTeal, roughness: 0.9, envMapIntensity: 0.2 }, 0.2),
    wallRed: std({ map: T.wallRed, roughness: 0.9, envMapIntensity: 0.2 }, 0.2),
    wallCream: std({ map: T.wallCream, roughness: 0.9, envMapIntensity: 0.2 }, 0.2),
    rust: std({ map: T.rust, roughnessMap: T.rustR, metalness: 0.55, envMapIntensity: 0.6 }, 0.6),
    corrTeal: std({ map: T.corrTeal, roughness: 0.7, metalness: 0.45, side: THREE.DoubleSide, envMapIntensity: 0.5 }, 0.3),
    corrRed: std({ map: T.corrRed, roughness: 0.7, metalness: 0.45, side: THREE.DoubleSide, envMapIntensity: 0.5 }, 0.3),
    corrGrey: std({ map: T.corrGrey, roughness: 0.65, metalness: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.5 }, 0.3),
    tile: std({ map: T.tile, color: 0x9a978c, roughness: 0.45, envMapIntensity: 0.6 }, 0.5),
    wood: std({ map: T.wood, roughness: 0.92 }, 0.6),
    plywood: std({ map: T.plywood, roughness: 0.9 }, 0.5),
    hazard: std({ map: T.hazard, roughness: 0.8 }, 1.2),
    metalDark: std({ color: 0x2a2c2f, metalness: 0.75, roughness: 0.42, envMapIntensity: 0.9 }),
    metalOily: std({ color: 0x1a1b1d, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.2 }),
    steel: std({ color: 0x5d6369, metalness: 0.85, roughness: 0.42, envMapIntensity: 0.8 }),
    rubber: std({ color: 0x141414, roughness: 0.92 }),
    bagBlack: std({ color: 0x111215, roughness: 0.32, envMapIntensity: 0.8 }),
    bagGreen: std({ color: 0x1e2a1c, roughness: 0.35, envMapIntensity: 0.7 }),
    cardboard: std({ color: 0x7a5f3e, map: T.cloth, roughness: 0.95 }, 1),
    plasBlue: std({ color: 0x2c5878, map: T.plastic, roughness: 0.6 }, 1),
    plasRed: std({ color: 0x86352a, map: T.plastic, roughness: 0.6 }, 1),
    plasYellow: std({ color: 0x9a8a2a, map: T.plastic, roughness: 0.6 }, 1),
    white: std({ color: 0xb8b4a8, map: T.concreteWall, roughness: 0.55, metalness: 0.1 }, 0.6),
    roof: std({ map: T.gravel, roughness: 1 }, 0.4),
    dirt: std({ map: T.dirt, roughness: 1 }, 0.4),
    mattress: std({ color: 0x8a7f66, map: T.cloth, roughness: 0.95 }, 0.8),
    tarpBlue: std({ color: 0x2c4c6a, map: T.cloth, roughness: 0.8, side: THREE.DoubleSide }, 0.6),
    clothRed: std({ color: 0x6a1a16, map: T.cloth, roughness: 0.9, side: THREE.DoubleSide }, 1),
    glass: std({ color: 0x9fc7d0, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.28, envMapIntensity: 1.5, depthWrite: false }),
    darkGlass: std({ color: 0x0b0e12, roughness: 0.1, metalness: 0.6, envMapIntensity: 1.4 }),
    chain: std({ map: T.chain, alphaTest: 0.5, metalness: 0.65, roughness: 0.45, side: THREE.DoubleSide, envMapIntensity: 0.8 }, 0.8),
    puddle: std({ color: 0x161c22, roughness: 0.1, metalness: 0.45, envMapIntensity: 1.1, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2 }),
    lineWhite: std({ color: 0x9d9a8c, roughness: 0.8 }),
    lineYellow: std({ color: 0x9a7a2a, roughness: 0.8 }),
    carPaint: std({ color: 0x8c8e88, map: T.concreteWall, metalness: 0.35, roughness: 0.55, envMapIntensity: 0.8 }, 0.4),
    greenMetal: std({ color: 0x3a5a40, map: T.rust, metalness: 0.4, roughness: 0.7 }, 0.5),
    weed: std({ color: 0x3a4a22, roughness: 0.9, side: THREE.DoubleSide }),
    couch: std({ color: 0x5a2420, map: T.cloth, roughness: 0.95 }, 1),
  };
  const emis = (hex, k = 3) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(hex), emissiveIntensity: k, roughness: 0.6 });
  const basicGlow = (hex, k = 2.5, map = null) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  L.M = M;

  // ------------------------------------------------------------ geometry helpers
  function boxGeo(w, h, d, den, fitV = false) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k, side = f !== 2 && f !== 3;
      uv.setXY(i, uv.getX(i) * dims[f][0] * den, uv.getY(i) * (fitV && side ? 1 : dims[f][1] * den));
    }
    return g;
  }
  function box(parent, w, h, d, mat, x, y, z, o = {}) {
    const m = new THREE.Mesh(boxGeo(w, h, d, o.den ?? mat.userData.den ?? 0.5, o.fitV), mat);
    m.position.set(x, y, z);
    if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.cast !== false; m.receiveShadow = true;
    parent.add(m); return m;
  }
  function cyl(parent, rt, rb, h, mat, x, y, z, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 14, 1, o.open ?? false), mat);
    m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; if (o.ry) m.rotation.y = o.ry;
    m.castShadow = o.cast !== false; m.receiveShadow = true; parent.add(m); return m;
  }
  function decal(tex, x, z, w, h, o = {}) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, envMapIntensity: o.env ?? 0.8, polygonOffset: true, polygonOffsetFactor: -3 - (o.layer ?? 0), opacity: o.opacity ?? 1 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = o.rot ?? 0; m.position.set(x, o.y ?? 0.015, z); m.receiveShadow = true;
    (o.parent ?? root).add(m); return m;
  }
  function wallDecal(tex, x, y, z, w, h, ry = 0, o = {}) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, opacity: o.opacity ?? 1 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; (o.parent ?? root).add(m); return m;
  }
  function corrGeo(w, h, den = 0.3, waves = null, vertical = true) {
    const nW = waves ?? Math.round(w * 5);
    const g = new THREE.PlaneGeometry(w, h, vertical ? nW * 4 : 1, vertical ? 1 : nW * 4), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const t = vertical ? p.getX(i) / w : p.getY(i) / h;
      p.setZ(i, Math.sin(t * nW * Math.PI * 2) * 0.035);
      uv.setXY(i, uv.getX(i) * w * den, uv.getY(i) * h * den);
    }
    g.computeVertexNormals(); return g;
  }
  function sheet(parent, w, h, mat, x, y, z, o = {}) {
    const m = new THREE.Mesh(corrGeo(w, h, mat.userData.den, null, o.vertical !== false), mat);
    m.position.set(x, y, z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'YXZ');
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const collide = (minX, maxX, minZ, maxZ) => { const c = { minX, maxX, minZ, maxZ, on: true }; L.colliders.push(c); return c; };
  // Things between the camera and the player fade out. Materials are cloned so only this object fades.
  function occluder(obj, test) {
    const mats = [];
    obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    mats.forEach(m => { m.userData.baseOpacity = m.opacity; });
    L.occluders.push({ mats, test, k: 1 });
  }
  const behindWall = (minX, maxX, minZ, h) => { const reach = h / 1.45 + 0.9; return p => p.z < minZ && minZ - p.z < reach && p.x > minX - 1.2 && p.x < maxX + 1.2; };

  // ------------------------------------------------------------ ground
  const groundGeo = new THREE.PlaneGeometry(120, 100);
  { const uv = groundGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 120 * 0.18, uv.getY(i) * 100 * 0.18); }
  const ground = new THREE.Mesh(groundGeo, M.asphalt); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -2); ground.receiveShadow = true; root.add(ground);
  const slab = (x0, x1, z0, z1, mat = M.concrete, h = 0.07) => box(root, x1 - x0, h, z1 - z0, mat, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, { cast: false });
  slab(-16, -6.2, 3, 4.5); slab(-0.8, 24, 3, 4.5); slab(-22, 24, 10.5, 12);
  slab(11, 24, -8, 3, M.concrete, 0.05);
  slab(-22, 11, -20, -12.1, M.concrete, 0.04);
  // curbs
  box(root, 46, 0.14, 0.18, M.concWall, 1, 0.07, 4.5, { cast: false }); box(root, 46, 0.14, 0.18, M.concWall, 1, 0.07, 10.5, { cast: false });
  // road markings
  for (let x = -14; x < 24; x += 3.2) box(root, 1.7, 0.012, 0.14, M.lineYellow, x, 0.006, 7.5, { cast: false });
  for (let x = -5.6; x <= -1.4; x += 0.75) box(root, 0.42, 0.012, 1.3, M.lineWhite, x, 0.006, 5.35, { cast: false });
  box(root, 4.8, 0.012, 0.25, M.lineWhite, -3.5, 0.006, 6.25, { cast: false });
  // grime & clutter decals
  const scatter = [[-19, -6], [-18.5, 6], [-3, 8.2], [6, 9.5], [14, 6], [-10, 7], [2, -15], [-12, -16], [17, -2], [-19.5, 12.8], [9, 13.5]];
  scatter.forEach(([x, z], i) => decal(T.oil[i % 2], x, z, 1.8 + R() * 1.6, 1.8 + R() * 1.6, { rot: R() * 6, rough: 0.9, metal: 0, env: 0.1, opacity: 0.75 }));
  [[-4, 3.8], [10, 6.5], [-18, -9], [18, 8], [-10, -15], [4, 11]].forEach(([x, z], i) => decal(T.crack[i % 2], x, z, 4, 4, { rot: R() * 6, layer: 1 }));
  [[-20, -1], [-17.5, -9.5], [-19, 9], [12.5, -5], [-8, -17], [6, 15], [-14, 15], [19, 15]].forEach(([x, z], i) => decal(T.trash[i % 2], x, z, 2.6, 2.6, { rot: R() * 6, layer: 2, rough: 0.9 }));
  // puddles
  [[-3.2, 7.4, 2.2, 1.3], [1.5, 9.4, 1.6, 0.9], [-19.2, -4.5, 1.4, 2.4], [16.5, -1.5, 2.0, 1.1], [-6, -14.5, 1.8, 1.2], [8, 6, 1.2, 0.8], [-11, 13.5, 1.5, 0.9]].forEach(([x, z, sx, sz]) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1, 28), M.puddle); p.rotation.x = -Math.PI / 2; p.scale.set(sx, sz, 1); p.position.set(x, 0.012, z); p.receiveShadow = true; root.add(p);
  });
  // manhole + steam vents
  cyl(root, 0.5, 0.5, 0.02, M.metalOily, 6, 0.012, 8.2, { cast: false, seg: 24 });
  [[-3, 9.6], [-18.2, -7.4], [14.2, -7.2]].forEach(([x, z]) => { box(root, 0.8, 0.03, 0.5, M.metalOily, x, 0.016, z, { cast: false }); L.emitters.push({ kind: 'steam', pos: new THREE.Vector3(x, 0.05, z), rate: 4, acc: 0 }); });

  // ------------------------------------------------------------ buildings
  function building(x0, x1, z0, z1, h, mat, o = {}) {
    const g = new THREE.Group(); root.add(g);
    const b = box(g, x1 - x0, h, z1 - z0, mat, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, { fitV: true });
    // roof with parapet
    box(g, x1 - x0 - 0.3, 0.02, z1 - z0 - 0.3, M.roof, (x0 + x1) / 2, h + 0.01, (z0 + z1) / 2, { cast: false });
    const pw = 0.18, ph = 0.45;
    box(g, x1 - x0, ph, pw, M.concWall, (x0 + x1) / 2, h + ph / 2, z0 + pw / 2); box(g, x1 - x0, ph, pw, M.concWall, (x0 + x1) / 2, h + ph / 2, z1 - pw / 2);
    box(g, pw, ph, z1 - z0, M.concWall, x0 + pw / 2, h + ph / 2, (z0 + z1) / 2); box(g, pw, ph, z1 - z0, M.concWall, x1 - pw / 2, h + ph / 2, (z0 + z1) / 2);
    // roof clutter
    const rr = rng(Math.round(x0 * 31 + z0 * 7));
    const n = Math.max(1, Math.round(((x1 - x0) * (z1 - z0)) / 40));
    for (let i = 0; i < n; i++) {
      const x = x0 + 1 + rr() * (x1 - x0 - 2), z = z0 + 1 + rr() * (z1 - z0 - 2);
      if (rr() < 0.6) { box(g, 1.1, 0.7, 0.9, M.steel, x, h + 0.35, z); cyl(g, 0.3, 0.3, 0.05, M.metalOily, x, h + 0.72, z, { cast: false }); }
      else { cyl(g, 0.12, 0.12, 1.2, M.rust, x, h + 0.6, z); cyl(g, 0.2, 0.2, 0.15, M.rust, x, h + 1.2, z); L.emitters.push({ kind: 'steam', pos: new THREE.Vector3(x, h + 1.3, z), rate: 3, acc: 0 }); }
    }
    // windows on the south (camera-facing) face
    if (o.windows) {
      const { y = 2.6, every = 2.6, litChance = 0.35 } = o.windows;
      for (let x = x0 + 1.3; x < x1 - 0.8; x += every) {
        const lit = rr() < litChance;
        const wm = lit ? new THREE.MeshStandardMaterial({ map: T.winLit[(rr() * 2) | 0], emissive: 0xffffff, emissiveMap: T.winLit[(rr() * 2) | 0], emissiveIntensity: 1.6, roughness: 0.3 })
                       : new THREE.MeshStandardMaterial({ map: T.winDark[(rr() * 2) | 0], roughness: 0.15, metalness: 0.4, envMapIntensity: 1.2 });
        for (const yy of Array.isArray(y) ? y : [y]) {
          const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.25), wm); w.position.set(x, yy, z1 + 0.02); g.add(w);
          box(g, 1.2, 0.08, 0.14, M.concWall, x, yy - 0.68, z1 + 0.06);
        }
      }
    }
    collide(x0, x1, z0, z1);
    if (o.occlude !== false) occluder(g, behindWall(x0, x1, z0, h));
    return g;
  }
  building(-28, -22, -26, 20, 6.5, M.brick);
  const north = building(-22, 11, -27, -20, 7, M.wallCream, { windows: { y: [4.2, 6.0], every: 3.1, litChance: 0.3 } });
  const pawn = building(11, 28, -26, -8, 5.2, M.wallRed, { windows: { y: 4.0, every: 2.8, litChance: 0.5 } });
  const b1 = building(-16, -6, -11, 3, 4.6, M.brick, { windows: { y: 2.7, every: 2.4, litChance: 0.25 } });
  building(0.5, 11, -12, -6, 4.3, M.concWall);
  // pipes and junction boxes on walls
  cyl(root, 0.07, 0.07, 4.4, M.rust, -15.9, 2.2, -8.5, { seg: 8 }); cyl(root, 0.07, 0.07, 6, M.rust, -21.9, 3, 6, { seg: 8 });
  box(root, 0.5, 0.7, 0.18, M.metalDark, -15.95, 1.6, -6.2, { ry: Math.PI / 2 });
  wallDecal(T.tagMisc[0], -11, 1.6, 3.03, 3.2, 1.6); wallDecal(T.tagMisc[1], -21.97, 1.5, -5, 3, 1.5, Math.PI / 2); wallDecal(T.tagMisc[2], 20, 1.3, -7.97, 2.6, 1.3);

  // ------------------------------------------------------------ props
  function tire(parent, x, y, z, o = {}) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.13, 10, 18), M.rubber);
    m.position.set(x, y, z); m.rotation.set(o.rx ?? Math.PI / 2, o.ry ?? 0, o.rz ?? 0); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function barrel(parent, x, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    const mat = o.mat ?? M.rust;
    cyl(g, 0.3, 0.3, 0.9, mat, 0, 0.45, 0, { seg: 18, open: !!o.open });
    [0.18, 0.72].forEach(y => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.022, 6, 22), M.metalDark); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); });
    if (!o.open) cyl(g, 0.29, 0.29, 0.02, M.metalOily, 0, 0.9, 0, { cast: false });
    if (o.tilt) { g.rotation.z = o.tilt; g.position.y = 0.3; }
    return g;
  }
  function crate(parent, x, z, o = {}) {
    const mat = o.mat ?? [M.plasBlue, M.plasRed, M.plasYellow][(R() * 3) | 0];
    return box(parent, o.w ?? 0.6, o.h ?? 0.4, o.d ?? 0.45, mat, x, o.y ?? (o.h ?? 0.4) / 2, z, { ry: o.ry ?? R() * 0.6 - 0.3 });
  }
  function bag(parent, x, z, s = 1, mat = M.bagBlack) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36 * s, 1), mat);
    const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + R() * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); }
    m.geometry.computeVertexNormals(); m.position.set(x, 0.24 * s, z); m.rotation.y = R() * 6; m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function cardboard(parent, x, z, o = {}) {
    const g = box(parent, o.w ?? 0.55, o.h ?? 0.42, o.d ?? 0.45, M.cardboard, x, o.y ?? (o.h ?? 0.42) / 2, z, { ry: o.ry ?? R() });
    box(parent, (o.w ?? 0.55) * 0.12, 0.005, (o.d ?? 0.45) * 1.01, M.plasYellow, x, (o.y ?? (o.h ?? 0.42) / 2) + (o.h ?? 0.42) / 2 + 0.003, z, { ry: o.ry ?? 0, cast: false });
    return g;
  }
  function pallet(parent, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); parent.add(g);
    for (let i = -2; i <= 2; i++) box(g, 1.2, 0.03, 0.14, M.wood, 0, 0.13, i * 0.2);
    for (const zz of [-0.4, 0, 0.4]) box(g, 1.2, 0.1, 0.1, M.wood, 0, 0.06, zz);
    return g;
  }
  function fridge(parent, x, z, ry, lying = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
    if (lying) { g.rotation.z = Math.PI / 2; g.position.y = 0.35; }
    box(g, 0.7, 1.6, 0.65, M.white, 0, 0.8, 0);
    const door = box(g, 0.68, 1.0, 0.06, M.white, 0.2, 0.95, 0.38, { ry: -0.6 });
    box(g, 0.03, 0.3, 0.04, M.steel, 0.42, 0.95, 0.5, { ry: -0.6 });
    return g;
  }
  function washer(parent, x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
    box(g, 0.62, 0.82, 0.6, M.white, 0, 0.41, 0);
    const d = cyl(g, 0.2, 0.2, 0.04, M.darkGlass, 0, 0.45, 0.31, { rx: Math.PI / 2, seg: 20 });
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.03, 6, 20), M.steel); r.position.set(0, 0.45, 0.32); g.add(r);
    return g;
  }
  function tv(parent, x, y, z, ry) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
    box(g, 0.62, 0.48, 0.5, M.metalDark, 0, 0.24, 0);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.36), M.darkGlass); s.position.set(0, 0.25, 0.252); g.add(s);
    return g;
  }
  function plank(parent, x, y, z, len, o = {}) { return box(parent, len, 0.04, 0.22, o.mat ?? M.wood, x, y, z, { ry: o.ry ?? 0, rz: o.rz ?? 0, rx: o.rx ?? 0 }); }
  function weeds(x, z, n = 6) {
    for (let i = 0; i < n; i++) {
      const h = 0.25 + R() * 0.4, m = new THREE.Mesh(new THREE.ConeGeometry(0.03 + R() * 0.03, h, 4), M.weed);
      m.position.set(x + (R() - 0.5) * 0.8, h / 2, z + (R() - 0.5) * 0.8); m.rotation.set((R() - 0.5) * 0.5, R() * 6, (R() - 0.5) * 0.5); m.castShadow = true; root.add(m);
    }
  }
  function fence(x1, z1, x2, z2, h = 2.3, o = {}) {
    const g = new THREE.Group(); root.add(g);
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), ang = Math.atan2(-dz, dx);
    const geo = new THREE.PlaneGeometry(len, h); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 0.8, uv.getY(i) * h * 0.8);
    const p = new THREE.Mesh(geo, M.chain); p.position.set((x1 + x2) / 2, h / 2 + 0.05, (z1 + z2) / 2); p.rotation.y = ang; p.castShadow = true; g.add(p);
    const posts = Math.ceil(len / 2.5);
    for (let i = 0; i <= posts; i++) { const t = i / posts; cyl(g, 0.045, 0.045, h + 0.1, M.metalDark, x1 + dx * t, (h + 0.1) / 2, z1 + dz * t, { seg: 8 }); }
    const rail = cyl(g, 0.03, 0.03, len, M.metalDark, (x1 + x2) / 2, h + 0.05, (z1 + z2) / 2, { seg: 6, rz: Math.PI / 2 }); rail.rotation.set(0, ang, Math.PI / 2, 'YXZ');
    if (o.collide !== false) collide(Math.min(x1, x2) - 0.12, Math.max(x1, x2) + 0.12, Math.min(z1, z2) - 0.12, Math.max(z1, z2) + 0.12);
    return g;
  }
  function pole(x, z, h = 8) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    cyl(g, 0.11, 0.15, h, M.wood, 0, h / 2, 0, { seg: 8 });
    box(g, 1.8, 0.12, 0.12, M.wood, 0, h - 0.6, 0);
    [-0.75, 0, 0.75].forEach(xx => cyl(g, 0.04, 0.05, 0.16, M.white, xx, h - 0.46, 0, { seg: 6 }));
    box(g, 0.45, 0.6, 0.45, M.metalDark, 0.25, h - 1.6, 0);
    collide(x - 0.2, x + 0.2, z - 0.2, z + 0.2);
    return new THREE.Vector3(x, h - 0.4, z);
  }
  function cable(a, b, sag = 0.9, r = 0.018) {
    const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, r, 4), M.rubber); m.castShadow = true; root.add(m);
  }

  // street lamp: pole + arm + sodium head + shadow-casting spotlight
  function streetLamp(px, pz, hx, hz, tx, tz, { h = 6.2, color = 0xffa65a, intensity = 260, wall = false, name } = {}) {
    const g = new THREE.Group(); root.add(g);
    if (!wall) { cyl(g, 0.08, 0.12, h, M.metalDark, px, h / 2, pz, { seg: 10 }); collide(px - 0.2, px + 0.2, pz - 0.2, pz + 0.2); }
    const arm = new THREE.Vector3(hx - px, 0, hz - pz), len = arm.length();
    if (len > 0.1) { const a = box(g, 0.08, 0.08, len, M.metalDark, (px + hx) / 2, h - 0.05, (pz + hz) / 2); a.lookAt(hx, h - 0.05, hz); }
    const head = box(g, 0.5, 0.16, 0.7, M.metalDark, hx, h - 0.12, hz); head.lookAt(tx, h - 0.12, tz);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.52), emis(color, 6)); lens.rotation.x = Math.PI / 2; lens.position.set(hx, h - 0.205, hz); lens.rotation.z = -Math.atan2(tx - hx, tz - hz); g.add(lens);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: new THREE.Color(color).multiplyScalar(1.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
    glow.scale.set(2.4, 2.4, 1); glow.position.set(hx, h - 0.35, hz); g.add(glow);
    const s = new THREE.SpotLight(color, intensity, 22, 0.82, 0.55, 1.6);
    s.position.set(hx, h - 0.25, hz); s.target.position.set(tx, 0, tz);
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.03; s.shadow.camera.near = 0.5; s.shadow.camera.far = 22;
    root.add(s); root.add(s.target);
    L.flickers.push({ light: s, base: intensity, mats: [lens.material], glow, kind: 'sodium', seed: R() * 100 });
    if (name) L.spots[name] = s;
    return s;
  }

  // ------------------------------------------------------------ 1. HOVEL (south-west)
  {
    const g = new THREE.Group(); root.add(g); L.groups.hovel = g;
    // sloped corrugated roof leaning on the west building
    const roofO = new THREE.Group(); roofO.position.set(-20.9, 2.2, 14.8); roofO.rotation.z = -0.2; g.add(roofO);
    const roofI = new THREE.Group(); roofI.rotation.y = Math.PI / 2; roofO.add(roofI);
    sheet(roofI, 4.6, 2.4, M.corrRed, 0, 0, 0, { rx: -Math.PI / 2 });
    cyl(g, 0.05, 0.05, 1.95, M.wood, -19.75, 0.97, 12.7, { seg: 6 }); cyl(g, 0.05, 0.05, 1.95, M.wood, -19.75, 0.97, 16.9, { seg: 6 });
    // tarp hanging off the roof edge
    const tarp = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.1, 8, 4), M.tarpBlue);
    { const p = tarp.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 3) * 0.06 + Math.sin(p.getY(i) * 5) * 0.04); tarp.geometry.computeVertexNormals(); }
    tarp.position.set(-19.72, 1.45, 13.4); tarp.rotation.y = Math.PI / 2; tarp.castShadow = true; g.add(tarp);
    // mattress, pillow, blanket
    box(g, 0.95, 0.16, 2.0, M.mattress, -19.15, 0.08, 14.9);
    box(g, 0.55, 0.1, 0.32, M.mattress, -19.15, 0.21, 14.1);
    const blanket = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.1, 6, 6), M.tarpBlue.clone()); blanket.material.color.set(0x4a4436);
    { const p = blanket.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(Math.sin(p.getX(i) * 6 + p.getY(i) * 4)) * 0.07); blanket.geometry.computeVertexNormals(); }
    blanket.rotation.x = -Math.PI / 2; blanket.position.set(-19.15, 0.17, 15.35); blanket.castShadow = true; g.add(blanket);
    // crates, candle, cardboard wall
    crate(g, -18.1, 13.3, { mat: M.plasBlue, ry: 0.2 }); crate(g, -18.1, 13.3, { mat: M.plasBlue, ry: 0.35, y: 0.6 });
    cardboard(g, -21.3, 16.6); cardboard(g, -21.4, 16.4, { y: 0.63, ry: 0.4 }); cardboard(g, -18.4, 16.7, { w: 0.8, h: 0.5 });
    const jar = cyl(g, 0.05, 0.05, 0.1, M.glass, -18.1, 0.86, 13.3, { cast: false });
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: new THREE.Color(0xffa040).multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.scale.set(0.35, 0.5, 1); flame.position.set(-18.1, 0.95, 13.3); g.add(flame);
    const candle = new THREE.PointLight(0xff9a40, 9, 7, 1.7); candle.position.set(-18.1, 1.15, 13.4); root.add(candle);
    L.flickers.push({ light: candle, base: 9, glow: flame, kind: 'candle', seed: 3 });
    // bottles, can stove
    for (let i = 0; i < 5; i++) cyl(g, 0.035, 0.035, 0.24, M.glass, -21.6 + R() * 0.4, 0.12, 13.0 + R() * 1.2, { seg: 8 });
    barrel(g, -21.4, 12.9, { mat: M.rust });
    L.bed = new THREE.Vector3(-19.15, 0, 14.9);
    L.spawn = new THREE.Vector3(-19.15, 0, 14.0); // feet end of the mattress; you sleep with your head to the south
    collide(-22, -21.0, 12.5, 17.2);
  }

  // ------------------------------------------------------------ 2. SCAVENGING ALLEY
  function junkPile(x, z, seed, big = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    const r = rng(seed), s = big ? 1.25 : 1;
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.dirt);
    mound.scale.set(1.3 * s, 0.32 * s, 1.05 * s); mound.receiveShadow = true; mound.castShadow = true; g.add(mound);
    const n = big ? 12 : 9;
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = r() * 0.9 * s, px = Math.cos(a) * d, pz = Math.sin(a) * d, py = 0.18 + (1 - d / s) * 0.22;
      const k = r();
      if (k < 0.18) tire(g, px, py, pz, { rx: Math.PI / 2 + (r() - 0.5) * 0.9, rz: r() });
      else if (k < 0.36) { const b = bag(g, px, pz, 0.75 + r() * 0.4, r() < 0.5 ? M.bagBlack : M.bagGreen); b.position.y = py; }
      else if (k < 0.5) plank(g, px, py + 0.1, pz, 0.8 + r() * 0.8, { ry: r() * 6, rz: (r() - 0.5) * 0.7, mat: r() < 0.5 ? M.wood : M.plywood });
      else if (k < 0.62) { const c = cyl(g, 0.05, 0.05, 0.9 + r(), M.rust, px, py + 0.08, pz, { seg: 8 }); c.rotation.set(Math.PI / 2, r() * 6, 0.2, 'YXZ'); }
      else if (k < 0.74) { const m = sheet(g, 0.9, 0.7, [M.corrTeal, M.corrGrey, M.corrRed][(r() * 3) | 0], px, py + 0.15, pz, { rx: -1.1 + r() * 0.6, ry: r() * 6 }); }
      else if (k < 0.86) crate(g, px, pz, { y: py + 0.1, ry: r() * 6, h: 0.35 });
      else { const c = cyl(g, 0.045, 0.045, 0.12, [M.plasRed, M.steel, M.plasYellow][(r() * 3) | 0], px, py + 0.04, pz, { seg: 8 }); c.rotation.z = Math.PI / 2; }
    }
    if (big || r() < 0.5) { const t = tv(g, (r() - 0.5) * 0.8, 0.25, (r() - 0.5) * 0.5, r() * 6); t.rotation.z = 0.25; }
    collide(x - 0.85 * s, x + 0.85 * s, z - 0.7 * s, z + 0.7 * s);
    // clone mats so this pile can glow when highlighted
    const mats = [];
    g.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); mats.push(o.material); } });
    const j = { group: g, pos: new THREE.Vector3(x, 0, z), mats, left: big ? 3 : 2, max: big ? 3 : 2, respawn: 0, seed };
    L.junk.push(j); return j;
  }
  {
    junkPile(-19.6, -8.4, 11, true); junkPile(-17.4, -4.6, 12); junkPile(-20.4, -1.4, 13); junkPile(-17.6, 2.2, 14, true);
    junkPile(-20.5, 6.4, 15); junkPile(-11.5, 14.6, 16, true); junkPile(13.4, 1.6, 17);
    // appliances and alley clutter
    fridge(root, -21.2, -5.6, 1.4); washer(root, -16.7, -9.8, 0.4); fridge(root, -16.9, 6.2, 0.6, true);
    barrel(root, -21.4, -10.6); barrel(root, -20.7, -10.8, { mat: M.greenMetal }); barrel(root, -16.6, -0.9, { tilt: Math.PI / 2 });
    pallet(root, -21.85, 0.9, 2.4, { rz: Math.PI / 2 - 0.15, ry: Math.PI / 2 }); pallet(root, -21.8, 0.9, 3.7, { rz: Math.PI / 2 - 0.2, ry: Math.PI / 2 });
    for (let i = 0; i < 6; i++) bag(root, -16.5 - R() * 0.4, -6.8 + R() * 1.4, 0.8 + R() * 0.4);
    // dumpster
    const d = new THREE.Group(); d.position.set(-21.1, 0, 9.2); d.rotation.y = Math.PI / 2; root.add(d);
    box(d, 1.9, 1.15, 1.1, M.greenMetal, 0, 0.62, 0); box(d, 1.95, 0.06, 1.15, M.greenMetal, 0, 1.3, -0.2, { rx: -0.5 });
    collide(-21.7, -20.5, 8.2, 10.2);
    // overhead cables across the alley
    for (const zz of [-7, -2.5, 1.5]) cable(new THREE.Vector3(-22, 5.6, zz), new THREE.Vector3(-16, 4.4, zz + 0.6), 0.6, 0.012);
    // alley lamp on the B1 wall
    streetLamp(-16, -2, -16.65, -2, -19.4, -2.5, { h: 4.4, wall: true, intensity: 170, name: 'alley' });
    weeds(-21.5, -3.2, 7); weeds(-16.4, 4.6, 5); weeds(-21.6, 7.8, 6);
  }

  // ------------------------------------------------------------ 3. LAB UNIT
  {
    const x0 = 0.5, x1 = 11, z0 = -6, z1 = 3, h = 3.2, t = 0.3;
    const walls = new THREE.Group(); root.add(walls);
    box(walls, t, h, z1 - z0, M.wallTeal, x0 + t / 2, h / 2, (z0 + z1) / 2, { fitV: true });
    box(walls, t, h, z1 - z0, M.wallTeal, x1 - t / 2, h / 2, (z0 + z1) / 2, { fitV: true });
    box(walls, x1 - x0, h, t, M.wallTeal, (x0 + x1) / 2, h / 2, z0 + t / 2, { fitV: true });
    collide(x0, x0 + t, z0, z1); collide(x1 - t, x1, z0, z1);
    // south wall with door gap 3.5..7 (separate group so it fades when you're inside)
    const south = new THREE.Group(); root.add(south);
    box(south, 3.5 - x0, h, t, M.corrTeal, (x0 + 3.5) / 2, h / 2, z1 - t / 2, { fitV: true });
    box(south, x1 - 7, h, t, M.corrTeal, (7 + x1) / 2, h / 2, z1 - t / 2, { fitV: true });
    box(south, 3.5, 0.32, t, M.concWall, 5.25, h - 0.16, z1 - t / 2);
    box(south, 3.8, 0.38, 0.45, M.metalDark, 5.25, h - 0.16, z1 + 0.15);
    // stencilled sign above the door
    const signC = document.createElement('canvas'); signC.width = 256; signC.height = 64; const sx = signC.getContext('2d');
    sx.fillStyle = '#c9c4b0'; sx.fillRect(0, 0, 256, 64); sx.fillStyle = '#1b1b1b'; sx.font = '700 40px "Barlow Condensed", Impact'; sx.textAlign = 'center'; sx.fillText('UNIT 7 · NO ENTRY', 128, 46);
    const signT = new THREE.CanvasTexture(signC); signT.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.8 })); sign.position.set(1.95, 2.3, z1 + 0.02); south.add(sign);
    collide(x0, 3.5, z1 - t, z1); collide(7, x1, z1 - t, z1);
    L.doorCollider = collide(3.5, 7, z1 - t, z1);
    // roll-up shutter
    const sh = new THREE.Group(); sh.position.set(5.25, h - 0.32, z1 - 0.05); south.add(sh);
    const shm = new THREE.Mesh(corrGeo(3.5, h - 0.32, 0.3, 26, false), M.corrGrey); shm.position.y = -(h - 0.32) / 2; shm.castShadow = true; shm.receiveShadow = true; sh.add(shm);
    L.shutter = sh; L.shutterOpen = 0;
    occluder(south, p => p.z < z1 && p.z > z0 && p.x > x0 - 0.5 && p.x < x1 + 0.5 && z1 - p.z < 3.4);
    // stained tile floor
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.6, z1 - z0 - 0.6), M.tile);
    { const uv = fl.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) * 0.5, uv.getY(i) * (z1 - z0) * 0.5); }
    fl.rotation.x = -Math.PI / 2; fl.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); fl.receiveShadow = true; root.add(fl);
    decal(T.oil[0], 3, -3, 2.5, 2.5, { y: 0.03, rough: 0.3, opacity: 0.8 }); decal(T.crack[1], 8, 0, 3, 3, { y: 0.03 });
    [[2.4, 0.5, 4], [8.4, -3.6, 5], [6, 1.6, 3.5], [9.4, 1.4, 3]].forEach(([x, z, s], i) => decal(T.oil[i % 2], x, z, s, s, { y: 0.028, rot: i * 1.7, rough: 0.8, opacity: 0.45, layer: 1 }));
    decal(T.trash[1], 2.2, -4.6, 2.2, 2.2, { y: 0.031, rot: 0.4, layer: 2, rough: 0.9 });
    // shelves on the north wall
    const shelf = new THREE.Group(); shelf.position.set(3.2, 0, z0 + 0.6); root.add(shelf);
    for (const xx of [-1.2, 1.2]) for (const zz of [-0.25, 0.25]) box(shelf, 0.05, 2.2, 0.05, M.metalDark, xx, 1.1, zz);
    for (const yy of [0.35, 1.05, 1.75]) box(shelf, 2.45, 0.04, 0.55, M.metalDark, 0, yy, 0);
    const bottleCols = [0x6fae3a, 0x3ec6e0, 0xc04a8a, 0xd08a2a, 0x9aa0a6, 0x5a3a2a];
    for (const yy of [0.37, 1.07, 1.77]) for (let i = 0; i < 7; i++) {
      if (R() < 0.25) continue;
      const xx = -1.05 + i * 0.35 + (R() - 0.5) * 0.08;
      if (R() < 0.7) { const hh = 0.18 + R() * 0.16; const bm = M.glass.clone(); bm.color.set(bottleCols[(R() * 6) | 0]); bm.opacity = 0.6; cyl(shelf, 0.05, 0.05, hh, bm, xx, yy + hh / 2, (R() - 0.5) * 0.2, { seg: 8, cast: false }); }
      else cardboard(shelf, xx, (R() - 0.5) * 0.15, { w: 0.28, h: 0.22, d: 0.3, y: yy + 0.11, ry: 0 });
    }
    collide(1.9, 4.5, z0, z0 + 1);
    // chemical drums (one with a glowing hazard band)
    const drumG = new THREE.Group(); root.add(drumG);
    [[10.2, -5.3, M.plasBlue], [9.55, -5.35, M.rust], [10.25, -4.6, M.greenMetal], [1.3, 2.2, M.plasBlue]].forEach(([x, z, m]) => barrel(drumG, x, z, { mat: m }));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.08, 18, 1, true), emis(0x3ee6ff, 2.2)); band.position.set(10.25, 0.5, -4.6); drumG.add(band);
    L.drumBand = band;
    collide(9.2, 10.7, -5.8, -4.2); collide(0.9, 1.7, 1.8, 2.6);
    // extractor fan in the east wall
    const fan = new THREE.Group(); fan.position.set(x1 - 0.18, 2.2, -2.8); root.add(fan);
    box(fan, 0.3, 0.95, 0.95, M.metalDark, 0, 0, 0);
    const blades = new THREE.Group(); blades.position.x = -0.17; fan.add(blades);
    for (let i = 0; i < 4; i++) { const b = box(blades, 0.02, 0.38, 0.12, M.steel, 0, 0.2, 0, { cast: false }); b.position.set(0, Math.cos(i * Math.PI / 2) * 0.2, Math.sin(i * Math.PI / 2) * 0.2); b.rotation.x = i * Math.PI / 2; }
    L.fan = { blades, speed: 0 };
    L.emitters.push({ kind: 'labVent', pos: new THREE.Vector3(x1 + 0.2, 2.2, -2.8), rate: 0, acc: 0 });

    // tier 0: debris where the lab will go
    const debris = new THREE.Group(); root.add(debris); L.groups.debris = debris;
    box(debris, 2.2, 0.06, 1.1, M.plywood, 5.4, 0.4, -1.4, { rz: 0.35, ry: 0.2 });
    for (let i = 0; i < 6; i++) cardboard(debris, 3.5 + R() * 4, -3 + R() * 3.5, { ry: R() * 3 });
    for (let i = 0; i < 5; i++) bag(debris, 3 + R() * 5, -4 + R() * 5, 0.9);
    pallet(debris, 7.8, 0, 0.6, { ry: 0.6 }); tire(debris, 4.2, 0.13, 1.4, { rx: Math.PI / 2 }); tire(debris, 4.3, 0.39, 1.35, { rx: Math.PI / 2 });

    // tier 1: crude bench chemistry
    const lab1 = new THREE.Group(); root.add(lab1); lab1.visible = false; L.groups.lab1 = lab1;
    crate(lab1, 4.5, -1.5, { mat: M.plasBlue, w: 0.5, h: 0.8, d: 0.9, ry: 0 }); crate(lab1, 6.5, -1.5, { mat: M.plasRed, w: 0.5, h: 0.8, d: 0.9, ry: 0 });
    box(lab1, 2.6, 0.06, 1.2, M.plywood, 5.5, 0.83, -1.5);
    cyl(lab1, 0.13, 0.15, 0.09, M.metalDark, 5.4, 0.9, -1.5, { seg: 12 });
    const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 10, 1, true), basicGlow(0x3a7aff, 2.2)); flame1.position.set(5.4, 1.0, -1.5); lab1.add(flame1);
    cyl(lab1, 0.19, 0.17, 0.22, M.steel, 5.4, 1.15, -1.5, { seg: 16 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16), emis(0xb6ff3a, 1.6)); pot.position.set(5.4, 1.25, -1.5); lab1.add(pot);
    for (let i = 0; i < 5; i++) {
      const xx = 4.5 + i * 0.22 + (i > 1 ? 1.4 : 0), hh = 0.16 + R() * 0.08;
      cyl(lab1, 0.065, 0.065, hh, M.glass, xx, 0.86 + hh / 2, -1.85, { seg: 10, cast: false });
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, hh * 0.6, 10), emis(bottleCols[i], 0.6)); c.position.set(xx, 0.86 + hh * 0.3, -1.85); lab1.add(c);
    }
    box(lab1, 0.26, 0.34, 0.16, M.plasYellow, 6.6, 1.03, -1.2, { ry: 0.3 }); box(lab1, 0.26, 0.34, 0.16, M.plasBlue, 6.95, 1.03, -1.3, { ry: -0.2 });
    // bare bulb on a cable
    cable(new THREE.Vector3(5.5, 3.6, -1.6), new THREE.Vector3(5.5, 2.55, -1.55), 0.05, 0.01);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), emis(0xffd08a, 6)); bulb.position.set(5.5, 2.5, -1.55); lab1.add(bulb);
    L.potMat = pot.material;

    // tier 2: steel bench, glassware rig, fluorescent tube
    const lab2 = new THREE.Group(); root.add(lab2); lab2.visible = false; L.groups.lab2 = lab2;
    box(lab2, 2.9, 0.05, 1.3, M.steel, 5.5, 0.9, -1.5);
    for (const [xx, zz] of [[4.15, -2.05], [6.85, -2.05], [4.15, -0.95], [6.85, -0.95]]) box(lab2, 0.05, 0.9, 0.05, M.metalDark, xx, 0.45, zz);
    box(lab2, 2.7, 0.03, 1.1, M.metalDark, 5.5, 0.3, -1.5);
    cyl(lab2, 0.012, 0.012, 1.0, M.steel, 4.7, 1.42, -1.75, { seg: 6 }); box(lab2, 0.3, 0.02, 0.2, M.metalDark, 4.7, 0.93, -1.75);
    const rbf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), M.glass); rbf.position.set(4.7, 1.18, -1.6); lab2.add(rbf);
    const rbl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), emis(0x3ee6ff, 2)); rbl.position.copy(rbf.position); lab2.add(rbl);
    const cond = cyl(lab2, 0.035, 0.035, 1.1, M.glass, 5.3, 1.38, -1.6, { seg: 10, cast: false }); cond.rotation.z = -1.2;
    const coil = cyl(lab2, 0.012, 0.012, 1.0, emis(0x3ee6ff, 1.2), 5.3, 1.38, -1.6, { seg: 6, cast: false }); coil.rotation.z = -1.2;
    const recv = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.26, 14, 1, true), M.glass); recv.position.set(5.95, 1.06, -1.6); lab2.add(recv);
    for (let i = 0; i < 4; i++) {
      const xx = 6.2 + i * 0.17, hh = 0.14 + i * 0.03;
      cyl(lab2, 0.06, 0.06, hh, M.glass, xx, 0.92 + hh / 2, -1.15, { seg: 12, cast: false });
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, hh * 0.55, 12), emis(bottleCols[(i + 1) % 6], 1.0)); c.position.set(xx, 0.92 + hh * 0.28, -1.15); lab2.add(c);
    }
    const tube = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.1), emis(0xcff4ff, 7)); tube.position.set(5.5, 2.9, -1.5); lab2.add(tube);
    box(lab2, 1.6, 0.04, 0.16, M.metalDark, 5.5, 2.95, -1.5, { cast: false });
    L.rigMats = [rbl.material, coil.material];
    L.tubeMat = tube.material;

    // lab lights
    const bulbL = new THREE.PointLight(0xffc27a, 0, 9, 1.6); bulbL.position.set(5.5, 2.4, -1.55); root.add(bulbL);
    const chemL = new THREE.PointLight(0xb6ff3a, 0, 6, 1.8); chemL.position.set(5.4, 1.5, -1.2); root.add(chemL);
    const tubeL = new THREE.PointLight(0xbfe9ff, 0, 12, 1.4); tubeL.position.set(5.5, 2.75, -1.5); root.add(tubeL);
    L.lights.bulb = bulbL; L.lights.chem = chemL; L.lights.tube = tubeL;
    L.flickers.push({ light: tubeL, base: 0, kind: 'tube', seed: 7, mats: [tube.material] });
    L.labDoor = new THREE.Vector3(5.25, 0, 4.2);
    L.labTable = new THREE.Vector3(5.5, 0, -0.35);
    collide(4.1, 6.9, -2.15, -0.85);
  }

  // ------------------------------------------------------------ STREET
  {
    const p1 = pole(-12.5, 12.2), p2 = pole(2, 12.2), p3 = pole(15.5, 12.2), p4 = pole(23, 12.2);
    cable(p1, p2, 1.1); cable(p2, p3, 1.1); cable(p3, p4, 0.8);
    cable(p1.clone().add(new THREE.Vector3(0.75, -0.06, 0)), p2.clone().add(new THREE.Vector3(-0.75, -0.06, 0)), 1.3, 0.012);
    cable(p2, new THREE.Vector3(3, 3.4, 3), 0.5, 0.015); cable(p1, new THREE.Vector3(-12, 4.6, 3), 0.6, 0.015);
    cable(p3, new THREE.Vector3(15, 5.2, -8), 1.2, 0.015);
    streetLamp(-8.2, 11.3, -6.4, 9.7, -3.6, 7.0, { name: 'street', intensity: 300 });
    // vacant lot south of the street
    const car = new THREE.Group(); car.position.set(7.5, 0, 14.7); car.rotation.y = 1.35; root.add(car);
    box(car, 1.8, 0.75, 4.2, M.rust, 0, 0.62, 0); box(car, 1.6, 0.62, 2.1, M.rust, 0, 1.3, -0.2);
    box(car, 1.62, 0.42, 1.6, M.darkGlass, 0, 1.33, -0.2, { cast: false });
    [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]].forEach(([x, z]) => cyl(car, 0.3, 0.3, 0.2, M.metalDark, x, 0.24, z, { rz: Math.PI / 2, seg: 12 }));
    collide(5.3, 9.7, 13.6, 15.8);
    fence(-16, 17.6, 24, 17.6, 2.0);
    weeds(-6, 14, 9); weeds(3, 16, 7); weeds(18, 16.5, 8); weeds(-14, 16.8, 6);
    crate(root, 20.5, 13.6, { mat: M.plasRed }); crate(root, 21.1, 13.4, { mat: M.plasBlue });
    barrel(root, -8.3, 13.2); barrel(root, -7.7, 13.6, { mat: M.plasBlue }); collide(-8.8, -7.2, 12.7, 14.1);
  }

  // ------------------------------------------------------------ 4. BUYER / PAWN FRONT
  {
    const zf = -8;
    // shop window (warm) and steel door
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), new THREE.MeshStandardMaterial({ map: T.winLit[0], emissive: 0xffffff, emissiveMap: T.winLit[0], emissiveIntensity: 1.8, roughness: 0.25 }));
    win.position.set(20.6, 1.5, zf + 0.03); root.add(win);
    box(root, 3.6, 0.1, 0.25, M.metalDark, 20.6, 0.65, zf + 0.1); box(root, 3.6, 0.1, 0.12, M.metalDark, 20.6, 2.35, zf + 0.05);
    for (let x = 19.1; x <= 22.1; x += 0.3) box(root, 0.03, 1.6, 0.03, M.metalDark, x, 1.5, zf + 0.12, { cast: false }); // security bars
    box(root, 1.3, 2.3, 0.1, M.metalOily, 16.5, 1.15, zf + 0.05);
    box(root, 2.6, 2.2, 0.12, M.corrGrey, 13.2, 1.1, zf + 0.06);
    // neon sign
    box(root, 4.7, 0.8, 0.12, M.metalDark, 16.5, 3.45, zf + 0.08);
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.72), new THREE.MeshBasicMaterial({ map: T.neon, color: new THREE.Color(2.4, 2.4, 2.4), transparent: true, depthWrite: false, toneMapped: false }));
    neon.position.set(16.5, 3.45, zf + 0.16); root.add(neon);
    const nl = new THREE.PointLight(0xff3ea5, 22, 11, 1.6); nl.position.set(16.5, 3.0, zf + 1.2); root.add(nl);
    L.flickers.push({ light: nl, base: 22, mats: [neon.material], kind: 'neon', seed: 11 });
    const wl = new THREE.PointLight(0xffb060, 10, 8, 1.7); wl.position.set(20.6, 1.6, zf + 1.4); root.add(wl);
    // van with its side door open
    const van = new THREE.Group(); van.position.set(20.6, 0, -1.6); van.rotation.y = -0.18; root.add(van);
    box(van, 2.0, 1.75, 4.8, M.carPaint, 0, 1.25, 0);
    box(van, 1.9, 0.75, 1.0, M.darkGlass, 0, 1.65, -2.0, { cast: false });
    box(van, 0.04, 0.6, 1.4, M.darkGlass, 1.01, 1.7, -0.3, { cast: false });
    box(van, 0.05, 1.5, 1.2, M.metalDark, -1.0, 1.1, 0.3); // open door gap
    [[-0.95, 1.6], [0.95, 1.6], [-0.95, -1.6], [0.95, -1.6]].forEach(([x, z]) => cyl(van, 0.36, 0.36, 0.26, M.rubber, x, 0.36, z, { rz: Math.PI / 2, seg: 16 }));
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), emis(0xffe2b0, 1.2)); hl.position.set(-0.65, 1.0, -2.41); hl.rotation.y = Math.PI; van.add(hl);
    const hl2 = hl.clone(); hl2.position.x = 0.65; van.add(hl2);
    const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.3), emis(0xff2a1a, 2.5)); tl.position.set(-0.75, 1.05, 2.41); van.add(tl);
    const tl2 = tl.clone(); tl2.position.x = 0.75; van.add(tl2);
    collide(19.2, 22.0, -4.2, 1.0);
    // clutter + fence on the east edge
    crate(root, 12.4, -6.6, { mat: M.plasBlue }); crate(root, 12.4, -6.6, { mat: M.plasBlue, y: 0.6 }); crate(root, 13.0, -6.9, { mat: M.plasYellow });
    collide(11.8, 13.4, -7.4, -6.1);
    barrel(root, 23.2, -7.2, { mat: M.greenMetal }); barrel(root, 22.6, -7.4);
    fence(24, -8, 24, 17.6, 2.3);
    L.buyerSpot = new THREE.Vector3(16.5, 0, -7.0);
  }

  // ------------------------------------------------------------ 5. RIVAL CHOKE + CORNER PLAZA
  {
    const zb = -11.7;
    const bar = new THREE.Group(); root.add(bar); L.groups.barricade = bar;
    // jersey barriers + pallets + tyres + plywood, gap at x -6..-1.2
    const jersey = (x, z, len, ry = 0) => {
      const g = new THREE.BoxGeometry(0.6, 0.85, len); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 0.35);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.concWall); m.position.set(x, 0.425, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; bar.add(m);
      box(bar, 0.02, 0.18, len * 0.96, M.hazard, x - 0.26 * Math.cos(ry), 0.25, z + 0.26 * Math.sin(ry), { ry, cast: false, den: 1 });
    };
    jersey(-19.8, zb, 4, Math.PI / 2); jersey(-15.6, zb, 4, Math.PI / 2); jersey(-9.2, zb, 3.6, Math.PI / 2);
    for (let x = -21.6; x < -6.4; x += 2.3) {
      const k = R();
      if (k < 0.35) { const p = pallet(bar, x, 0.85, zb - 0.1, { rx: Math.PI / 2 - 0.12 }); }
      else if (k < 0.6) box(bar, 1.2, 1.2, 0.04, M.plywood, x, 1.45, zb - 0.05, { rz: (R() - 0.5) * 0.3 });
      else if (k < 0.8) { tire(bar, x, 0.98, zb, { rx: Math.PI / 2 }); tire(bar, x + 0.1, 1.24, zb, { rx: Math.PI / 2 }); }
      else sheet(bar, 1.4, 1.1, M.corrRed, x, 1.3, zb - 0.1, { ry: 0.05 });
    }
    box(bar, 1.2, 1.1, 0.06, M.hazard, -12.6, 0.55, zb + 0.35, { rz: 0.04 });
    jersey(-0.4, zb, 1.6, Math.PI / 2);
    collide(-22, -6.1, zb - 0.4, zb + 0.4); collide(-1.2, 0.5, zb - 0.4, zb + 0.4);
    // red rags tied to the barricade (they turn lime when the corner is yours)
    const flagMat = M.clothRed.clone(); L.flagMat = flagMat;
    const flags = [];
    [[-7.0, 1.6], [-13.8, 1.9], [-0.6, 1.4]].forEach(([x, y]) => {
      cyl(bar, 0.025, 0.025, 2.4, M.metalDark, x, 1.2, zb + 0.1, { seg: 6 });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5, 6, 2), flagMat); f.position.set(x + 0.42, 2.1, zb + 0.1); f.castShadow = true; bar.add(f); flags.push(f);
    });
    L.flags = flags;
    // plaza dressing
    const couch = new THREE.Group(); couch.position.set(-3.5, 0, -18.4); root.add(couch);
    box(couch, 2.2, 0.45, 0.9, M.couch, 0, 0.3, 0); box(couch, 2.2, 0.6, 0.25, M.couch, 0, 0.75, -0.35); box(couch, 0.25, 0.35, 0.9, M.couch, -1.0, 0.65, 0); box(couch, 0.25, 0.35, 0.9, M.couch, 1.0, 0.65, 0);
    collide(-4.7, -2.3, -18.9, -17.9);
    const stash = new THREE.Group(); stash.position.set(3.2, 0, -16.2); root.add(stash);
    crate(stash, -0.35, 0, { mat: M.plasRed, h: 0.7, ry: 0 }); crate(stash, 0.35, 0, { mat: M.plasRed, h: 0.7, ry: 0 }); box(stash, 1.4, 0.05, 0.7, M.plywood, 0, 0.73, 0);
    for (let i = 0; i < 4; i++) cyl(stash, 0.035, 0.035, 0.24, M.glass, -0.5 + i * 0.25, 0.88, (R() - 0.5) * 0.3, { seg: 8 });
    collide(2.4, 4.0, -16.6, -15.8);
    const wreck = new THREE.Group(); wreck.position.set(-15.6, 0, -16.2); wreck.rotation.y = 0.25; root.add(wreck);
    box(wreck, 4.2, 0.8, 1.8, M.rust, 0, 0.6, 0); box(wreck, 2.2, 0.6, 1.6, M.rust, 0.2, 1.3, 0); box(wreck, 1.7, 0.42, 1.62, M.darkGlass, 0.2, 1.33, 0, { cast: false });
    collide(-18, -13.2, -17.6, -14.8);
    barrel(root, -19.8, -13.2); barrel(root, -20.4, -13.8, { mat: M.greenMetal }); collide(-21, -19.3, -14.3, -12.7);
    for (let i = 0; i < 6; i++) bag(root, 8.5 + R() * 2, -19.3 + R() * 1.5, 0.9);
    // burning barrel
    const bb = barrel(root, -7.4, -13.6, { open: true, mat: M.rust });
    collide(-7.75, -7.05, -13.95, -13.25);
    const fl = new THREE.PointLight(0xff7a2a, 26, 10, 1.6); fl.position.set(-7.4, 1.5, -13.6); root.add(fl);
    L.flickers.push({ light: fl, base: 26, kind: 'fire', seed: 5 });
    L.emitters.push({ kind: 'fire', pos: new THREE.Vector3(-7.4, 0.95, -13.6), rate: 26, acc: 0 });
    streetLamp(-10.2, -15.6, -8.4, -15.4, -4.6, -14.8, { name: 'plaza', intensity: 230, color: 0xff9a4a });
    // KINGS tag on the north wall; our ZERO tag waits underneath
    L.tagKings = wallDecal(T.tagKings, -3.5, 2.3, -19.95, 6, 3);
    L.tagZero = wallDecal(T.tagZero, -3.5, 2.3, -19.94, 6, 3, 0, { opacity: 0 });
    L.tagZero.visible = false;
    const tagL = new THREE.PointLight(0xb6ff3a, 0, 8, 1.6); tagL.position.set(-3.5, 2.2, -18.2); root.add(tagL); L.lights.tag = tagL;
    L.tagSpot = new THREE.Vector3(-3.5, 0, -18.9);
    L.rivalPosts = [new THREE.Vector3(-4.7, 0, -12.6), new THREE.Vector3(-2.4, 0, -12.9), new THREE.Vector3(-3.5, 0, -15.2)];
  }

  // ------------------------------------------------------------ world lights
  const hemi = new THREE.HemisphereLight(0x52627a, 0x1c1610, 1.25); root.add(hemi);
  const moon = new THREE.DirectionalLight(0x8aa2d0, 1.1);
  moon.position.set(-14, 30, -20); moon.target.position.set(0, 0, 0);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -34, right: 34, top: 30, bottom: -30, near: 1, far: 80 });
  moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.04;
  root.add(moon); root.add(moon.target);
  L.lights.hemi = hemi; L.lights.moon = moon;

  // ------------------------------------------------------------ state changers
  L.setLab = tier => {
    L.groups.debris.visible = tier === 0;
    L.groups.lab1.visible = tier === 1;
    L.groups.lab2.visible = tier >= 2;
    L.doorCollider.on = tier === 0;
    L.labTier = tier;
  };
  L.setLabColor = hex => {
    const c = new THREE.Color(hex);
    L.potMat.emissive.copy(c); L.rigMats.forEach(m => m.emissive.copy(c)); L.lights.chem.color.copy(c);
  };
  L.setCapture = k => {
    L.tagKings.material.opacity = 1 - k; L.tagZero.visible = k > 0; L.tagZero.material.opacity = k;
    L.lights.tag.intensity = k * 14;
    L.flagMat.color.set(0x6a1a16).lerp(new THREE.Color(0x58801a), k);
    L.spots.plaza.color.set(0xff9a4a).lerp(new THREE.Color(0xd6ff8a), k * 0.35);
  };
  L.setLab(0);

  // ------------------------------------------------------------ per-frame
  L.update = (dt, t) => {
    for (const f of L.flickers) {
      let k = 1;
      if (f.kind === 'sodium') k = 0.94 + 0.06 * Math.sin(t * 2.1 + f.seed) * Math.sin(t * 0.7 + f.seed);
      if (f.kind === 'candle') k = 0.8 + 0.2 * Math.sin(t * 13 + Math.sin(t * 7) * 2) * Math.sin(t * 3.3);
      if (f.kind === 'fire') k = 0.75 + 0.25 * Math.sin(t * 17 + Math.sin(t * 5) * 3) * Math.sin(t * 2.7 + 1);
      if (f.kind === 'neon') { const glitch = Math.sin(t * 0.9) > 0.97 && Math.sin(t * 40) > 0; k = glitch ? 0.25 : 1; }
      if (f.kind === 'tube') { k = f.on ? (f.warm > 0 ? (Math.sin(t * 60) > 0.3 ? 1 : 0.1) : 1) : 0; if (f.warm > 0) f.warm -= dt; }
      if (f.kind === 'tube') f.light.intensity = (f.on ? 26 : 0) * k; else f.light.intensity = f.base * k;
      if (f.mats) f.mats.forEach(m => { if (m.isMeshBasicMaterial) m.color.setScalar(2.4 * k); else m.emissiveIntensity = (f.kind === 'tube' ? 7 : 6) * k; });
      if (f.glow) f.glow.material.opacity = (f.kind === 'candle' ? 1 : 0.55) * k;
    }
    L.fan.blades.rotation.x += dt * L.fan.speed;
    L.shutter.scale.y += ((1 - L.shutterOpen * 0.93) - L.shutter.scale.y) * Math.min(1, dt * 2.2);
    L.flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2 + i) * 0.25; });
    L.drumBand.material.emissiveIntensity = 1.6 + Math.sin(t * 2.4) * 0.6;
  };
  L.tubeFlicker = L.flickers.find(f => f.kind === 'tube');
  return L;
}
