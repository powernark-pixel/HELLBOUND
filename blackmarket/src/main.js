// BLACK MARKET: ZERO — vertical slice. One district, one arc: street rat -> local threat.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeTextures, clamp, lerp } from './textures.js';
import { buildLevel, BOUNDS } from './level.js';
import { makePlayer, makeRival, makeFence } from './characters.js';
import { FX } from './fx.js';
import { Lab } from './lab.js';
import { UI, icon } from './ui.js';
import { SFX } from './audio.js';
import { ING, ING_KEYS, SHOP, LAB_COST, FENCE_LINES, rollJunk, GRADE_COL } from './data.js';

const $ = id => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
const angDiff = (a, b) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };
const rand = (a, b) => a + Math.random() * (b - a);
const hexArr = (h, k = 1) => { const c = new THREE.Color(h); return [c.r * k, c.g * k, c.b * k]; };

// ---------------------------------------------------------------- renderer + post
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0e);
scene.fog = new THREE.FogExp2(0x090b0e, 0.012);
const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 140);

const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uDesat: { value: 0.1 }, uDamage: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uDesat, uDamage; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r2 = dot(c, c);
      float ca = 0.0035 * r2;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c*ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c*ca).b);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, col * vec3(0.9, 1.03, 1.06) + vec3(0.0, 0.01, 0.016), 1.0 - smoothstep(0.0, 0.45, l));   // teal-green shadows
      col = mix(col, col * vec3(1.06, 1.0, 0.92), smoothstep(0.45, 1.0, l));                                 // warm highlights
      col = mix(col, vec3(l), uDesat);
      col = (col - 0.5) * 1.07 + 0.5;
      float v = smoothstep(0.95, 0.25, length(c * vec2(1.0, 1.1)) * 1.3);
      col *= mix(0.55, 1.0, v);
      col = mix(col, vec3(0.45, 0.02, 0.02), uDamage * smoothstep(0.08, 0.35, r2));
      col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.04;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(grade);

// a dim, coloured environment so wet and oily surfaces pick up reflections
function makeEnv() {
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  es.background = new THREE.Color(0x040507);
  const add = (c, k, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  add(0xffa050, 3, 0, 8, -6, 10, 3); add(0xffa050, 2, -8, 6, 4, 6, 2); add(0x3ee6ff, 2, 8, 3, 2, 4, 2); add(0xff3ea5, 2.5, 6, 4, -8, 5, 1.5); add(0x2a3446, 1, 0, 12, 0, 30, 30);
  const env = pm.fromScene(es, 0.04).texture; pm.dispose(); return env;
}

// ---------------------------------------------------------------- state
const G = {
  scene: 'loading', modal: null, cash: 0, scrap: 0, ing: {}, products: [],
  gear: { weapon: 'fists', body: 'rags' }, labTier: 0, territory: false, searched: 0, notebook: {}, objDone: [],
  stats: { mixes: 0, sold: 0, earned: 0, best: null, fails: 0, kos: 0, downs: 0 }, time: 0, playTime: 0, lastCookColor: '#b6ff3a',
};
ING_KEYS.forEach(k => (G.ing[k] = 0));
const WEAP = {
  fists: { dmg: [3, 5], range: 1.2, arc: 1.4, dur: 0.52, hit: 0.46, act: 'punch', kb: 1.4, stagger: 0.12, shake: 0.1, stop: 0.03, color: 0xd8d0c0, interrupt: false, spark: 0.45 },
  pipe: { dmg: [11, 15], range: 1.85, arc: 2.2, dur: 0.6, hit: 0.48, act: 'swing', kb: 6, stagger: 0.5, shake: 0.38, stop: 0.085, color: 0xb6ff3a, interrupt: true, spark: 1.25 },
};
const RIVAL_DEF = [
  { kind: 'a', name: 'KINGS RUNNER', hp: 30, dmg: 7, range: 1.35, arc: 1.4, windup: 0.6, cd: 1.6, speed: 3.0, act: 'punch', dur: 0.5 },
  { kind: 'b', name: 'KINGS RUNNER', hp: 30, dmg: 9, range: 1.4, arc: 1.1, windup: 0.55, cd: 1.7, speed: 3.15, act: 'stab', dur: 0.5 },
  { kind: 'boss', name: 'BIG DEX · KINGS', hp: 85, dmg: 15, range: 2.0, arc: 1.9, windup: 0.9, cd: 2.0, speed: 2.7, act: 'swing', dur: 0.62, boss: true },
];

let T, L, fx, ui, lab, sfx, P, fence, enemies = [], inter = [], drops = [];
const keys = {}; const mouse = { x: 0, y: 0, ndc: new THREE.Vector2(), world: V3(), down: false };
const cam = { target: V3(), zoom: 1, zoomT: 1, shake: 0, off: V3(0, 14.2, 8.9) };
let hitstop = 0, hurtK = 0, desatT = 0.1;
const raycaster = new THREE.Raycaster(), groundPlane = new THREE.Plane(V3(0, 1, 0), 0);

// ---------------------------------------------------------------- boot
async function boot() {
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fonts optional */ }
  T = makeTextures(renderer);
  scene.environment = makeEnv();
  L = buildLevel(scene, T);
  fx = new FX(scene, T); ui = new UI(); sfx = new SFX();
  // player
  const rig = makePlayer(T); rig.setBody('rags'); rig.setWeapon('fists'); scene.add(rig.root);
  P = { rig, pos: L.spawn.clone(), face: Math.PI / 2, faceT: Math.PI / 2, hp: 40, maxHp: 40, act: 'sleep', actT: 0, actDur: 1, hitDone: true, cd: 0, dodgeT: 0, dodgeCd: 0, dodgeDir: V3(), iframe: 0, chan: null, downed: false, posture: 0, aimLock: 0, kb: V3(), stepT: 0 };
  // a dim fill light that follows the player so they always read against the dark
  P.fill = new THREE.PointLight(0xc4ccd6, 16, 9, 1.5); scene.add(P.fill);
  // the Fence
  fence = { rig: makeFence(T), pos: L.buyerSpot.clone() }; fence.rig.root.position.copy(fence.pos); scene.add(fence.rig.root);
  spawnRivals();
  buildInteractables();
  lab = new Lab(game);
  bindInput(); bindPanels(); resize();
  updateHUD(true);
  G.scene = 'title';
  $('loading').textContent = '';
  window.ready = true;
  requestAnimationFrame(loop);
}

function spawnRivals() {
  enemies.forEach(e => scene.remove(e.rig.root)); enemies.forEach(e => e.tele && e.tele.kill());
  enemies = RIVAL_DEF.map((d, i) => {
    const rig = makeRival(T, d.kind); scene.add(rig.root);
    const post = L.rivalPosts[i].clone();
    return { id: 'r' + i, d, rig, pos: post.clone(), post, face: 0, hp: d.hp, state: 'idle', t: 0, atkCd: rand(0, 0.8), act: null, actT: 0, kb: V3(), downT: 0, slot: i, moving: 0, tele: null };
  });
}
const bossDown = () => enemies.some(e => e.d.boss && e.state === 'down');
const enemiesAlive = () => enemies.some(e => e.state !== 'down');

// ---------------------------------------------------------------- interactables
function buildInteractables() {
  inter = [];
  for (const j of L.junk) {
    j.mats.forEach(m => (m.userData.c0 = m.color.clone()));
    inter.push({ kind: 'junk', j, pos: j.pos, r: 2.1, acc: '#ffb03a', mats: j.mats,
      label: () => (j.left > 0 ? ['Search junk pile', true] : ['Picked clean', false]),
      use: () => channel(1.2, 'use', () => searchJunk(j), { sound: 'rummage' }) });
  }
  inter.push({ kind: 'labDoor', pos: L.labDoor, r: 2.5, acc: '#b6ff3a', when: () => G.labTier === 0,
    label: () => (G.scrap >= LAB_COST ? [`Pry the shutter · set up a lab (${LAB_COST} scrap)`, true] : [`Unit 7 · need ${LAB_COST} scrap to set up a lab (${G.scrap}/${LAB_COST})`, false]),
    use: () => channel(1.4, 'use', buildLab, { sound: 'rummage' }) });
  inter.push({ kind: 'lab', pos: L.labTable, r: 2.1, acc: '#b6ff3a', when: () => G.labTier > 0, label: () => ['Mix chemicals', true], use: () => openModal('lab') });
  inter.push({ kind: 'buyer', pos: L.buyerSpot, r: 2.7, acc: '#ff3ea5', label: () => ['Talk to the Fence', true], use: () => openModal('market') });
  inter.push({ kind: 'bed', pos: L.bed, r: 1.8, acc: '#ffb03a', label: () => (P.hp < P.maxHp ? ['Sleep it off · heal', true] : ['Your mattress', false]), use: rest });
  inter.push({ kind: 'tag', pos: L.tagSpot, r: 2.6, acc: '#b6ff3a', when: () => bossDown() && !G.territory,
    label: () => (enemiesAlive() ? ['Drop the rest of the Kings first', false] : ['Tag over the Kings · claim the corner', true]),
    use: () => channel(2.4, 'spray', capture, { spray: true }) });
}
let focus = null;
function findFocus() {
  if (P.downed || P.chan || G.modal || G.scene !== 'play' || P.act === 'sleep' || P.act === 'wake') return null;
  let best = null, bd = 1e9;
  for (const it of inter) {
    if (it.when && !it.when()) continue;
    const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z);
    if (d < it.r && d < bd) { bd = d; best = it; }
  }
  return best;
}
function interact() {
  if (!focus || P.act || P.downed) return;
  const [, ok] = focus.label();
  if (!ok) { sfx.play('click'); return; }
  focus.use();
}
function channel(dur, anim, done, o = {}) {
  P.chan = { t: 0, dur, anim, done, o, target: focus };
  P.face = P.faceT = Math.atan2(focus.pos.x - P.pos.x, focus.pos.z - P.pos.z);
  if (o.sound) sfx.play(o.sound);
}

function searchJunk(j) {
  const loot = rollJunk();
  j.left--; G.searched++;
  G.scrap += loot.scrap;
  fx.lootPop(j.pos, [1.6, 1.15, 0.4], 14); fx.dust(j.pos, 10, 1.2);
  fx.lootFly(j.pos, P.pos, [1.4, 1.4, 1.4]);
  ui.toast(`+${loot.scrap} Scrap`, icon('scrap'), 'var(--amber)'); popSlot('scrap');
  for (const k in loot.ing) {
    G.ing[k] += loot.ing[k];
    const d = ING[k];
    fx.lootFly(j.pos, P.pos, hexArr(d.col, 2));
    ui.toast(`+${loot.ing[k]} ${d.name} <small style="color:var(--muted)">${d.form}</small>`, icon(d.form, d.col), d.col);
    popSlot(k);
    if (k === 'glow') ui.banner('GLOWDUST', 'Rare find. This stuff is worth real money.', 'var(--lime)', 2200);
  }
  if (!Object.keys(loot.ing).length) ui.toast('Nothing useful but scrap', '', 'var(--dim)');
  sfx.play('pickup');
  if (j.left <= 0) { j.respawn = 80; j.mats.forEach(m => m.color.copy(m.userData.c0).multiplyScalar(0.5)); }
}
function buildLab() {
  if (G.scrap < LAB_COST) return;
  G.scrap -= LAB_COST; G.labTier = 1; L.setLab(1); L.shutterOpen = 1;
  L.lights.bulb.intensity = 16; L.lights.chem.intensity = 5; L.fan.speed = 5;
  L.emitters.find(e => e.kind === 'labVent').rate = 6;
  fx.dust(V3(5.25, 0, 3.4), 24, 1.8); fx.dust(V3(5.4, 0, -1.5), 18, 1.5);
  sfx.play('shutter'); setTimeout(() => sfx.play('done'), 700);
  ui.banner('LAB ONLINE', 'Unit 7 · bucket chemistry', 'var(--lime)');
  ui.toast(`−${LAB_COST} Scrap · lab built`, icon('bucket'), 'var(--lime)');
}
function rest() {
  G.modal = 'rest'; $('fade').classList.add('on');
  setTimeout(() => { P.hp = P.maxHp; P.act = 'sleep'; updateHUD(true); }, 700);
  setTimeout(() => { $('fade').classList.remove('on'); P.act = 'wake'; P.actT = 0; P.actDur = 1.2; G.modal = null; ui.toast('You sleep it off. Health restored.', '', 'var(--amber)'); }, 1700);
}

// ---------------------------------------------------------------- lab + market callbacks
const game = {
  G, get ui() { return ui; }, get sfx() { return sfx; },
  onCookStart(res) { L.setLabColor(res.pure); L.lights.chem.intensity = 10; },
  onCookDone(res, ev) {
    G.stats.mixes++;
    if (!res) { G.stats.fails++; fx.sparks(V3(5.4, 1.3, -1.5), V3(0, 1, 0), 30, 1.4, [1.6, 0.6, 0.2]); shake(0.3); return; }
    sfx.play('done');
    G.lastCookColor = res.pure; L.setLabColor(res.pure);
    const key = res.name + '|' + res.grade;
    let p = G.products.find(q => q.key === key);
    if (!p) { p = { key, name: res.name, grade: res.grade, value: res.value, form: res.form, color: res.color, pure: res.pure, count: 0 }; G.products.push(p); }
    p.count += res.yieldN; p.value = Math.max(p.value, res.value);
    if (!G.stats.best || 'SABCDF'.indexOf(res.grade) < 'SABCDF'.indexOf(G.stats.best)) G.stats.best = res.grade;
    popSlot('prod');
    fx.lootPop(V3(5.4, 0.7, -1.5), hexArr(res.pure, 2), 20);
  },
};

function openModal(kind) {
  if (G.modal) return;
  G.modal = kind; focus = null; $('prompt').style.display = 'none'; document.body.classList.add('modal-open');
  if (kind === 'lab') { $('labPanel').classList.add('open'); lab.show(); }
  if (kind === 'market') { $('fenceLine').textContent = '“' + FENCE_LINES[(Math.random() * FENCE_LINES.length) | 0] + '”'; renderMarket(); $('marketPanel').classList.add('open'); }
  if (kind === 'end') $('endPanel').classList.add('open');
  sfx.play('click');
}
function closeModal() {
  if (!G.modal || G.modal === 'rest') return;
  if (G.modal === 'lab' && lab.cook) return; // let the cook finish
  ['labPanel', 'marketPanel', 'endPanel'].forEach(id => $(id).classList.remove('open'));
  lab.open = false; G.modal = null; ui.tip(null); document.body.classList.remove('modal-open');
}
function renderMarket() {
  const sell = $('sellList');
  sell.innerHTML = G.products.length ? '' : '<div class="empty-note">Nothing to sell. Cook something in the lab.</div>';
  for (const p of G.products) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `${icon(p.form, p.color, 40)}<div class="info"><strong>${p.name}</strong><small>×${p.count} ${p.form}${p.count > 1 ? 's' : ''}</small></div><span class="grade" style="color:${GRADE_COL[p.grade]}">${p.grade}</span><span class="price">$${p.value}</span><button class="btn small">Sell 1</button><button class="btn small hot" style="--acc:var(--magenta)">All</button>`;
    const [b1, b2] = row.querySelectorAll('button');
    b1.onclick = () => sellProduct(p, 1); b2.onclick = () => sellProduct(p, p.count);
    sell.appendChild(row);
  }
  $('sellAll').disabled = !G.products.length;
  const buy = $('buyList'); buy.innerHTML = '';
  for (const s of SHOP) {
    const owned = (s.slot === 'weapon' && G.gear.weapon === s.id) || (s.slot === 'body' && G.gear.body === s.id) || (s.slot === 'lab' && G.labTier >= 2);
    const needLab = s.slot === 'lab' && G.labTier === 0;
    const row = document.createElement('div'); row.className = 'row' + (owned ? ' owned' : '');
    const ic = s.id === 'pipe' ? 'pipe' : s.id === 'jacket' ? 'jacket' : 'glass';
    row.innerHTML = `${icon(ic, '#3ee6ff', 40)}<div class="info"><strong>${s.name}</strong><small>${s.desc}</small><small style="color:#b8c8a0">${s.stats.join(' · ')}</small></div><span class="price">$${s.price}</span><button class="btn small hot" style="--acc:var(--amber)">${owned ? 'Owned' : needLab ? 'Need lab' : 'Buy'}</button>`;
    const b = row.querySelector('button'); b.disabled = owned || needLab || G.cash < s.price;
    b.onclick = () => buyItem(s);
    buy.appendChild(row);
  }
}
function sellProduct(p, n) {
  n = Math.min(n, p.count); if (n <= 0) return;
  const gain = p.value * n;
  G.cash += gain; G.stats.earned += gain; p.count -= n;
  const first = G.stats.sold === 0; G.stats.sold += n;
  if (p.count <= 0) G.products.splice(G.products.indexOf(p), 1);
  sfx.play('cash'); popSlot('cash');
  ui.float(`+$${gain}`, 'cash', fence.pos.clone().add(V3(0, 2.2, 0)));
  fx.lootPop(fence.pos, [0.8, 1.6, 0.4], 12);
  if (first) setTimeout(() => ui.banner('FIRST SALE', 'Now you\'re a hustler', 'var(--magenta)'), 200);
  renderMarket(); updateHUD(true);
}
function buyItem(s) {
  if (G.cash < s.price) return;
  G.cash -= s.price; sfx.play('cash');
  if (s.slot === 'weapon') { G.gear.weapon = s.id; P.rig.setWeapon(s.id); ui.banner('BENT PIPE', 'Now you look like a problem', 'var(--lime)'); }
  if (s.slot === 'body') { G.gear.body = s.id; P.rig.setBody('jacket'); P.maxHp = 70; P.hp = Math.min(70, P.hp + 30); ui.banner('PADDED JACKET', 'Harder to put down', 'var(--lime)'); }
  if (s.slot === 'lab') { G.labTier = 2; L.setLab(2); L.tubeFlicker.on = true; L.tubeFlicker.warm = 1.2; L.lights.chem.intensity = 9; L.fan.speed = 9; L.emitters.find(e => e.kind === 'labVent').rate = 12; ui.banner('GLASSWARE KIT', 'Proper chemistry now', 'var(--cyan)'); }
  fx.burst(P.pos, [0.9, 1.8, 0.35], 36); sfx.play('done');
  renderMarket(); updateHUD(true);
}

// ---------------------------------------------------------------- combat
function playerAttack() {
  if (G.scene !== 'play' || G.modal || P.downed || P.act || P.cd > 0 || P.dodgeT > 0) return;
  const w = WEAP[G.gear.weapon];
  P.chan = null;
  P.act = w.act; P.actT = 0; P.actDur = w.dur; P.hitDone = false; P.cd = w.dur * 0.95; P.aimLock = 0.45;
  P.face = P.faceT = Math.atan2(mouse.world.x - P.pos.x, mouse.world.z - P.pos.z);
  sfx.play('whoosh', G.gear.weapon === 'fists' ? 0.6 : 1.2);
}
function resolvePlayerHit() {
  const w = WEAP[G.gear.weapon];
  fx.arc(P.pos, P.face, { r0: 0.35, r1: w.range + 0.25, arc: w.arc, color: w.color, y: G.gear.weapon === 'fists' ? 1.15 : 0.95, life: G.gear.weapon === 'fists' ? 0.1 : 0.16 });
  let hit = false;
  for (const e of enemies) {
    if (e.state === 'down') continue;
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > w.range + 0.45) continue;
    if (angDiff(P.face, Math.atan2(dx, dz)) > w.arc / 2 + 0.25) continue;
    hit = true; damageEnemy(e, w, V3(dx / d, 0, dz / d));
  }
  if (!hit) fx.dust(P.pos.clone().add(V3(Math.sin(P.face) * 0.8, 0, Math.cos(P.face) * 0.8)), 3, 0.5);
}
function damageEnemy(e, w, dir) {
  let dmg = Math.round(rand(w.dmg[0], w.dmg[1] + 0.99));
  const crit = G.gear.weapon !== 'fists' && Math.random() < 0.15; if (crit) dmg = Math.round(dmg * 1.6);
  if (e.state === 'idle' || e.state === 'return') alertRivals();
  e.hp -= dmg; e.rig.flash(0xffffff, 0.12);
  const boss = e.d.boss;
  e.kb.copy(dir).multiplyScalar(w.kb * (boss ? 0.5 : 1));
  const armored = boss && e.state === 'windup' && !crit;
  if (!armored && (w.interrupt || e.state !== 'windup')) {
    e.state = 'stagger'; e.t = boss ? (crit ? 0.4 : 0.12) : w.stagger;
    if (e.tele) { e.tele.kill(); e.tele = null; }
  }
  if (armored) ui.float('ARMOR', 'weak', e.pos.clone().add(V3(0, 2.3, 0)), null, 0.5);
  const at = e.pos.clone().add(V3(0, 1.25, 0)).addScaledVector(dir, -0.25);
  fx.sparks(at, dir, Math.round(10 * w.spark), w.spark, G.gear.weapon === 'fists' ? [1, 0.9, 0.8] : [1.6, 1.2, 0.5]);
  if (G.gear.weapon !== 'fists') fx.blood(at, dir, 5);
  ui.float(crit ? dmg + '!' : '' + dmg, crit ? 'big' : G.gear.weapon === 'fists' ? 'weak' : '', at);
  hitstop = Math.max(hitstop, crit ? w.stop * 1.6 : w.stop); shake(w.shake * (crit ? 1.5 : 1));
  sfx.play(G.gear.weapon === 'fists' ? 'punch' : 'clang');
  if (e.hp <= 0) killEnemy(e, dir);
}
function killEnemy(e, dir) {
  e.state = 'down'; e.downT = 0; e.hp = 0; e.kb.copy(dir).multiplyScalar(4);
  e.face = Math.atan2(-dir.x, -dir.z); // falls away from the hit
  if (e.tele) { e.tele.kill(); e.tele = null; }
  G.stats.kos++;
  fx.dust(e.pos, 12, 1.4); fx.blood(e.pos.clone().add(V3(0, 1, 0)), dir, 8);
  sfx.play('down'); shake(0.4); hitstop = 0.12;
  ui.float('DOWN', 'big', e.pos.clone().add(V3(0, 2, 0)), null, 1.2);
  if (e.d.boss) {
    dropLoot(e.pos.clone());
    ui.banner('BIG DEX IS DOWN', enemiesAlive() ? 'Finish the corner' : 'Tag their wall. Make it yours.', 'var(--red)');
  } else if (!enemiesAlive()) ui.banner('CORNER CLEARED', 'Tag their wall. Make it yours.', 'var(--red)');
}
function dropLoot(pos) {
  const g = new THREE.Group(); g.position.set(pos.x, 0, pos.z); scene.add(g);
  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.36, 4, 10), new THREE.MeshStandardMaterial({ color: 0x1d2a1a, roughness: 0.5, emissive: 0x2a3a10, emissiveIntensity: 0.4 }));
  bag.rotation.z = Math.PI / 2; bag.position.y = 0.3; bag.castShadow = true; g.add(bag);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 4, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb6ff3a).multiplyScalar(1.2), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.position.y = 2; g.add(beam);
  fx.lootPop(pos, [0.9, 1.8, 0.35], 26);
  drops.push({ g, bag, pos: g.position, t: 0 });
}
function pickupDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]; d.t += dt; d.bag.position.y = 0.35 + Math.sin(d.t * 3) * 0.08; d.bag.rotation.y += dt;
    if (P.downed || Math.hypot(P.pos.x - d.pos.x, P.pos.z - d.pos.z) > 1.3 || d.t < 0.6) continue;
    scene.remove(d.g); drops.splice(i, 1);
    G.cash += 40; G.stats.earned += 40; G.ing.glow += 1; G.ing.vitr += 1; G.ing.spore += 1;
    ui.toast('+$40 · Kings stash', icon('cash'), 'var(--lime)'); ui.toast('+1 Glowdust', icon('particulate', ING.glow.col), ING.glow.col);
    ui.toast('+1 Vitrite · +1 Rustcap Spores', icon('crystal', ING.vitr.col), ING.vitr.col);
    fx.lootPop(d.pos, [0.9, 1.8, 0.35], 30); sfx.play('cash'); popSlot('cash'); popSlot('glow');
  }
}
function alertRivals() {
  for (const e of enemies) if (e.state === 'idle' || e.state === 'return') {
    e.state = 'chase'; e.atkCd = rand(0.3, 1.0);
    ui.float('!', 'alert', e.pos.clone().add(V3(0, 2.3, 0)), null, 0.8);
  }
  sfx.play('alert');
}
function hurtPlayer(dmg, dir) {
  if (P.iframe > 0 || P.downed) return;
  if (G.gear.body === 'jacket') dmg = Math.round(dmg * 0.7);
  P.hp -= dmg; P.iframe = 0.4; P.chan = null;
  P.rig.flash(0xff2a1a, 0.18);
  if (G.gear.weapon === 'fists' || !P.act) { P.act = 'hit'; P.actT = 0; P.actDur = 0.35; }
  P.kb.copy(dir).multiplyScalar(4);
  hurtK = 1; shake(0.4); hitstop = Math.max(hitstop, 0.05);
  const at = P.pos.clone().add(V3(0, 1.3, 0));
  fx.blood(at, dir, 6); fx.sparks(at, dir, 6, 0.6, [1.2, 0.3, 0.2]);
  ui.float('-' + dmg, 'hurt', at);
  sfx.play('hurt');
  if (P.hp <= 0) playerDown();
  updateHUD(true);
}
function playerDown() {
  P.hp = 0; P.downed = true; P.act = 'downed'; P.actT = 0; P.actDur = 0.9; P.chan = null;
  G.stats.downs++; sfx.play('down'); desatT = 0.85;
  enemies.forEach(e => { if (e.tele) { e.tele.kill(); e.tele = null; } if (e.state !== 'down') { e.state = 'return'; } });
  ui.banner('DROPPED', 'The Kings go through your pockets', 'var(--red)', 2400);
  setTimeout(() => $('fade').classList.add('on'), 2200);
  setTimeout(() => {
    const lost = Math.floor(G.cash * 0.25); G.cash -= lost;
    P.downed = false; P.hp = P.maxHp; P.pos.copy(L.spawn); P.act = 'sleep'; P.actT = 0; desatT = 0.1;
    // the corner resets unless you already took down Big Dex
    const resetAll = !bossDown();
    enemies.forEach(e => { if (e.state !== 'down' || resetAll) { e.pos.copy(e.post); e.hp = e.d.hp; e.state = 'idle'; e.face = 0; e.kb.set(0, 0, 0); } });
    cam.target.copy(P.pos);
    $('fade').classList.remove('on');
    setTimeout(() => { P.act = 'wake'; P.actT = 0; P.actDur = 1.3; }, 600);
    ui.toast(lost ? `You wake up in the hovel. Lost $${lost}.` : 'You wake up in the hovel.', '', 'var(--red)');
    if (G.gear.weapon === 'fists') setTimeout(() => ui.toast('Bare hands won\'t cut it. Get a weapon from the Fence.', icon('fists'), 'var(--amber)'), 1600);
    updateHUD(true);
  }, 3100);
}
function shake(k) { cam.shake = Math.min(1.2, cam.shake + k); }

function capture() {
  G.territory = true; G.captureT = 0;
  P.act = 'cheer'; P.actT = 0; P.actDur = 1.6;
  sfx.play('capture'); shake(0.3);
  fx.burst(V3(L.tagSpot.x, 0, L.tagSpot.z + 0.6), [0.9, 1.8, 0.35], 48);
  ui.banner('THE CROSSING', 'IS YOURS', 'var(--lime)', 3200);
  G.tributeT = 20;
  setTimeout(() => { updateEnd(); openModal('end'); }, 3600);
}
function updateEnd() {
  const m = Math.floor(G.playTime / 60), s = Math.floor(G.playTime % 60);
  $('endStats').innerHTML = [['Time', `${m}:${String(s).padStart(2, '0')}`], ['Mixes cooked', G.stats.mixes], ['Best grade', G.stats.best ?? '—'], ['Cash earned', '$' + G.stats.earned], ['Kings dropped', G.stats.kos], ['Times dropped', G.stats.downs]]
    .map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
}

// ---------------------------------------------------------------- progression look
function progressTarget() {
  let p = 0;
  if (G.labTier) p += 0.08; if (G.stats.sold) p += 0.12;
  if (G.gear.weapon !== 'fists') p += 0.32; if (G.gear.body === 'jacket') p += 0.23; if (G.territory) p += 0.25;
  return Math.min(1, p);
}
function rankName() { return G.territory ? 'LOCAL THREAT' : G.gear.weapon !== 'fists' || G.gear.body !== 'rags' ? 'OPERATOR' : G.stats.sold ? 'HUSTLER' : 'STREET RAT'; }

// ---------------------------------------------------------------- objectives
const nearestJunk = () => { let b = null, bd = 1e9; for (const j of L.junk) if (j.left > 0) { const d = j.pos.distanceTo(P.pos); if (d < bd) { bd = d; b = j.pos; } } return b; };
const OBJ = [
  { text: 'Search the junk piles in the alley', done: () => G.searched >= 3, prog: () => `${Math.min(3, G.searched)}/3`, at: nearestJunk },
  { text: 'Set up a lab in Unit 7', done: () => G.labTier >= 1, prog: () => `${Math.min(G.scrap, LAB_COST)}/${LAB_COST} scrap`, at: () => (G.scrap >= LAB_COST ? L.labDoor : nearestJunk()) },
  { text: 'Cook your first mixture', done: () => G.stats.mixes >= 1 && G.products.length + G.stats.sold > 0, at: () => L.labTable },
  { text: 'Sell product to the Fence', done: () => G.stats.sold >= 1, at: () => (G.products.length ? L.buyerSpot : L.labTable) },
  { text: 'Buy a weapon from the Fence', done: () => G.gear.weapon !== 'fists', prog: () => `$${G.cash} / $${SHOP[0].price}`, at: () => (G.cash >= SHOP[0].price ? L.buyerSpot : G.products.length ? L.buyerSpot : L.labTable) },
  { text: 'Take the corner from the Kings', done: () => bossDown() && !enemiesAlive(), at: () => { const e = enemies.find(q => q.state !== 'down'); return e ? e.pos : null; } },
  { text: 'Tag their wall · claim The Crossing', done: () => G.territory, at: () => L.tagSpot },
];
function objIndex() {
  for (let i = 0; i < OBJ.length; i++) if (!G.objDone[i] && OBJ[i].done()) G.objDone[i] = true;
  for (let i = 0; i < OBJ.length; i++) if (!G.objDone[i]) return i;
  return OBJ.length;
}

// ---------------------------------------------------------------- HUD
const prev = {};
function popSlot(id) { const el = document.querySelector(`[data-slot="${id}"]`); if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } if (id === 'cash') { const c = $('cash'); c.style.transform = 'scale(1.2)'; setTimeout(() => (c.style.transform = ''), 180); } }
function updateHUD(force) {
  const hpk = P.hp / P.maxHp;
  $('hpFill').style.width = hpk * 100 + '%'; $('hpGhost').style.width = hpk * 100 + '%';
  $('hpText').textContent = `${Math.max(0, Math.ceil(P.hp))} / ${P.maxHp}`;
  $('cash').textContent = '$' + G.cash;
  $('rank').textContent = rankName();
  document.querySelector('.st-name strong').textContent = G.territory ? 'ZERO' : 'NOBODY';
  const wk = G.gear.weapon, bk = G.gear.body;
  const sig = [wk, bk, G.labTier].join();
  if (force || prev.gear !== sig) {
    prev.gear = sig;
    $('slotWeapon').innerHTML = icon(wk === 'pipe' ? 'pipe' : 'fists'); $('slotWeapon').classList.toggle('on', wk !== 'fists');
    $('slotBody').innerHTML = icon(bk === 'jacket' ? 'jacket' : 'rags'); $('slotBody').classList.toggle('on', bk !== 'rags');
    $('slotLab').innerHTML = icon(G.labTier >= 2 ? 'glass' : G.labTier ? 'bucket' : 'none'); $('slotLab').classList.toggle('on', G.labTier > 0);
    $('gearText').textContent = `${wk === 'pipe' ? 'Bent pipe' : 'Bare hands'} · ${bk === 'jacket' ? 'Padded jacket' : 'Rags'}`;
    $('labText').textContent = G.labTier >= 2 ? 'Lab · glassware' : G.labTier ? 'Lab · bucket chemistry' : 'No lab';
  }
  // belt
  const beltSig = JSON.stringify([G.scrap, G.ing, G.products.map(p => p.count)]);
  if (force || prev.belt !== beltSig) {
    prev.belt = beltSig;
    $('beltIng').innerHTML = `<div class="bslot${G.scrap ? '' : ' empty'}" data-slot="scrap" title="Scrap">${icon('scrap')}<b>${G.scrap}</b></div>` +
      ING_KEYS.map(k => `<div class="bslot${G.ing[k] ? '' : ' empty'}" data-slot="${k}" title="${ING[k].name}">${icon(ING[k].form, ING[k].col)}<b>${G.ing[k] || ''}</b></div>`).join('');
    const ps = G.products.slice(0, 4);
    $('beltProd').innerHTML = (ps.length ? ps.map(p => `<div class="bslot" data-slot="prod" title="${p.name} · grade ${p.grade} · $${p.value}">${icon(p.form, p.color)}<b>${p.count}</b></div>`).join('') : `<div class="bslot empty" data-slot="prod">${icon('vial', '#666')}</div>`);
  }
  // objectives
  const oi = objIndex();
  const objSig = oi + '|' + (OBJ[oi]?.prog?.() ?? '');
  if (force || prev.obj !== objSig) {
    prev.obj = objSig;
    $('objCount').textContent = `${Math.min(oi, OBJ.length)}/${OBJ.length}`;
    $('objNow').innerHTML = oi < OBJ.length ? `${OBJ[oi].text}${OBJ[oi].prog ? ` <b>${OBJ[oi].prog()}</b>` : ''}` : 'The corner pays tribute. Keep cooking.';
    $('objList').innerHTML = OBJ.map((o, i) => `<li class="${G.objDone[i] ? 'done' : i === oi ? 'now' : ''}">${o.text}</li>`).join('');
  }
}

// ---------------------------------------------------------------- input
function bindInput() {
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (k === 'escape') closeModal();
    if (G.scene !== 'play') return;
    if (k === 'e' && !e.repeat) { if (!G.modal) interact(); }
    if (k === ' ' && !G.modal) { e.preventDefault(); playerAttack(); }
    if (k === 'shift' && !G.modal) dodge();
    if (k === 'm') { const m = sfx.toggle(); ui.toast(m ? 'Sound off' : 'Sound on', '', 'var(--dim)'); }
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
  canvas.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('pointerdown', e => { if (e.button === 0) { mouse.down = true; sfx.init(); playerAttack(); } });
  addEventListener('pointerup', () => (mouse.down = false));
  addEventListener('resize', resize);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}
function bindPanels() {
  $('btnStart').onclick = startGame;
  document.querySelectorAll('[data-close]').forEach(b => (b.onclick = closeModal));
  $('sellAll').onclick = () => { [...G.products].forEach(p => sellProduct(p, p.count)); };
  $('endContinue').onclick = closeModal;
}
function startGame() {
  sfx.init(); sfx.play('click');
  $('title').classList.add('gone'); document.body.classList.remove('title');
  G.scene = 'play'; cam.zoom = 0.7; cam.zoomT = 1;
  cam.target.copy(P.pos);
  setTimeout(() => { P.act = 'wake'; P.actT = 0; P.actDur = 1.4; }, 900);
  setTimeout(() => ui.banner('THE CROSSING', 'You have nothing. Not even a name.', 'var(--amber)', 3400), 400);
  setTimeout(() => ui.toast('Dig through the junk in the alley. Scrap and weird substances.', icon('scrap'), 'var(--amber)'), 3200);
}
function dodge() {
  if (P.downed || P.dodgeCd > 0 || P.chan || (P.act && P.act !== 'hit')) return;
  const mv = moveInput();
  P.dodgeDir.copy(mv.lengthSq() > 0 ? mv : V3(Math.sin(P.face), 0, Math.cos(P.face))).normalize();
  P.dodgeT = 0.3; P.iframe = Math.max(P.iframe, 0.3); P.dodgeCd = 0.85; P.act = 'dodge'; P.actT = 0; P.actDur = 0.3;
  fx.dust(P.pos, 8, 1); sfx.play('dodge');
}
function moveInput() {
  const v = V3((keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), 0, (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0));
  return v.lengthSq() ? v.normalize() : v;
}

// ---------------------------------------------------------------- physics
function collide(pos, r) {
  for (const c of L.colliders) {
    if (!c.on) continue;
    const cx = clamp(pos.x, c.minX, c.maxX), cz = clamp(pos.z, c.minZ, c.maxZ), dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + (dx / d) * r; pos.z = cz + (dz / d) * r; }
    else { const o = [pos.x - c.minX, c.maxX - pos.x, pos.z - c.minZ, c.maxZ - pos.z], m = Math.min(...o); if (m === o[0]) pos.x = c.minX - r; else if (m === o[1]) pos.x = c.maxX + r; else if (m === o[2]) pos.z = c.minZ - r; else pos.z = c.maxZ + r; }
  }
  pos.x = clamp(pos.x, BOUNDS.minX, BOUNDS.maxX); pos.z = clamp(pos.z, BOUNDS.minZ, BOUNDS.maxZ);
}

// ---------------------------------------------------------------- update: player
function updatePlayer(dt) {
  P.cd -= dt; P.iframe -= dt; P.dodgeCd -= dt; P.aimLock -= dt;
  P.kb.multiplyScalar(Math.pow(0.002, dt)); P.pos.addScaledVector(P.kb, dt);
  const canAct = G.scene === 'play' && !G.modal && !P.downed;
  let mv = canAct ? moveInput() : V3();
  if (P.act === 'sleep' || P.act === 'wake' || P.act === 'cheer') mv.set(0, 0, 0);
  // channel (search / build / tag)
  if (P.chan) {
    if (mv.lengthSq() > 0) { P.chan = null; }
    else {
      P.chan.t += dt;
      if (P.chan.o.spray) { const from = P.rig.handWorld(V3()); fx.spray(from, V3(0, 0.15, -1).normalize(), [0.55, 1.1, 0.2]); if (Math.random() < 0.3) sfx.play('spray'); }
      else if (Math.random() < dt * 6) fx.dust(P.chan.target.pos, 1, 0.6);
      if (P.chan.t >= P.chan.dur) { const c = P.chan; P.chan = null; c.done(); }
    }
  }
  // move
  let speed = 3.35 + P.posture * 1.25;
  if (P.act === 'punch' || P.act === 'swing') speed *= 0.4;
  if (P.act === 'hit') speed *= 0.5;
  if (P.dodgeT > 0) { P.dodgeT -= dt; P.pos.addScaledVector(P.dodgeDir, 10.5 * dt); if (Math.random() < 0.5) fx.dust(P.pos, 1, 0.5); }
  else if (!P.chan) P.pos.addScaledVector(mv, speed * dt);
  collide(P.pos, 0.36);
  for (const e of enemies) { if (e.state === 'down') continue; const d = V3(P.pos.x - e.pos.x, 0, P.pos.z - e.pos.z), l = d.length(); if (l < 0.75 && l > 0.001) P.pos.addScaledVector(d, (0.75 - l) / l * 0.5); }
  // facing: aim while attacking, otherwise face where you walk
  if (mouse.down && canAct && !P.act) playerAttack();
  if (P.aimLock > 0) P.faceT = Math.atan2(mouse.world.x - P.pos.x, mouse.world.z - P.pos.z);
  else if (mv.lengthSq() > 0 && P.dodgeT <= 0) P.faceT = Math.atan2(mv.x, mv.z);
  P.face = angLerp(P.face, P.faceT, 1 - Math.pow(0.0001, dt));
  // action timeline
  if (P.act) {
    P.actT += dt;
    const k = P.actT / P.actDur;
    if ((P.act === 'punch' || P.act === 'swing') && !P.hitDone && k >= WEAP[G.gear.weapon].hit) { P.hitDone = true; resolvePlayerHit(); }
    if (k >= 1 && P.act !== 'downed' && P.act !== 'sleep') P.act = null;
  }
  // footsteps
  if (mv.lengthSq() > 0 && !P.act) { P.stepT -= dt * (1 + P.posture * 0.3); if (P.stepT <= 0) { P.stepT = 0.34; sfx.play('step'); fx.smoke.emit({ pos: P.pos.clone().add(V3(0, 0.05, 0)), life: 0.35, size: 0.2, sizeEnd: 0.5, color: [0.5, 0.55, 0.6], alpha: 0.18 }); } }
  // posture follows progression
  P.posture = lerp(P.posture, progressTarget(), 1 - Math.pow(0.4, dt));
  // rig
  const anim = P.chan ? P.chan.anim : P.act;
  const tk = P.act === 'downed' ? P.actT / P.actDur : P.act ? clamp(P.actT / P.actDur) : 0;
  P.rig.root.position.copy(P.pos);
  const inBed = (P.act === 'sleep' || P.act === 'wake') && P.pos.distanceTo(L.spawn) < 0.3;
  if (inBed) {
    // lying on the mattress (head to the south), then sitting up facing the alley
    P.rig.root.position.y = 0.17 * (P.act === 'sleep' ? 1 : 1 - clamp(P.actT / P.actDur));
    P.rig.root.rotation.y = Math.PI; P.face = P.faceT = Math.PI;
  } else P.rig.root.rotation.y = P.face;
  P.rig.update(dt, { move: P.chan ? 0 : clamp(mv.length() * (P.act ? 0.5 : 1)), action: anim, t: tk, posture: P.posture });
  P.fill.position.set(P.pos.x, 2.6, P.pos.z + 0.9);
  P.rig.ring.material.opacity = 0.35 + P.posture * 0.5;
}

// ---------------------------------------------------------------- update: enemies
function updateEnemies(dt) {
  let windups = enemies.filter(e => e.state === 'windup').length;
  for (const e of enemies) {
    const d = e.d, toP = V3(P.pos.x - e.pos.x, 0, P.pos.z - e.pos.z), dist = toP.length();
    e.atkCd -= dt;
    e.kb.multiplyScalar(Math.pow(0.003, dt)); e.pos.addScaledVector(e.kb, dt);
    let move = 0, action = null, at = 0;
    if (e.state === 'down') {
      e.downT += dt;
      collide(e.pos, 0.3);
      e.rig.root.position.copy(e.pos); e.rig.root.rotation.y = e.face;
      e.rig.update(dt, { action: 'downed', t: Math.min(1, e.downT * 1.5), posture: 0.5 });
      if (e.rig.ring) e.rig.ring.visible = false;
      continue;
    }
    if (e.rig.ring) e.rig.ring.visible = true;
    const faceP = Math.atan2(toP.x, toP.z);
    switch (e.state) {
      case 'idle': {
        e.face = angLerp(e.face, d.boss ? 0 : Math.sin(G.time * 0.3 + e.slot) * 0.6, dt * 2);
        action = d.boss ? null : 'talk';
        if (G.scene === 'play' && !P.downed && dist < (d.boss ? 7 : 6.2)) alertRivals();
        break;
      }
      case 'chase': {
        if (P.downed) { e.state = 'return'; break; }
        if (e.pos.distanceTo(e.post) > 14) { e.state = 'return'; break; }
        // each rival takes a slot around the player so they don't stack
        const slotA = faceP + Math.PI + (e.slot - 1) * 0.9;
        const want = V3(P.pos.x + Math.sin(slotA) * d.range * 0.85, 0, P.pos.z + Math.cos(slotA) * d.range * 0.85);
        const go = V3(want.x - e.pos.x, 0, want.z - e.pos.z), gl = go.length();
        if (gl > 0.15) { e.pos.addScaledVector(go.normalize(), Math.min(gl, d.speed * dt)); move = clamp(gl, 0, 1); }
        e.face = angLerp(e.face, faceP, 1 - Math.pow(0.001, dt));
        if (dist < d.range + 0.25 && e.atkCd <= 0 && windups < 2) { e.state = 'windup'; e.t = 0; windups++; e.tele = fx.telegraph(d.range + 0.2, d.arc); }
        break;
      }
      case 'windup': {
        e.t += dt; const k = e.t / d.windup;
        if (k < 0.6) e.face = angLerp(e.face, faceP, 1 - Math.pow(0.02, dt));
        e.tele && e.tele.set(e.pos, e.face, clamp(k));
        action = d.act; at = 0.36 * clamp(k); // hold the wind-up pose
        if (k >= 1) {
          e.state = 'strike'; e.t = 0; e.act = d.act; e.actT = 0.36;
          if (e.tele) { e.tele.kill(); e.tele = null; }
          if (dist < d.range + 0.45 && angDiff(e.face, faceP) < d.arc / 2 + 0.2 && P.iframe <= 0) hurtPlayer(d.dmg, toP.clone().normalize());
          else if (P.iframe > 0 && dist < d.range + 0.6) ui.float('DODGED', 'weak', P.pos.clone().add(V3(0, 2, 0)));
          sfx.play('whoosh', d.boss ? 1.3 : 0.8);
          if (d.boss) { fx.arc(e.pos, e.face, { r0: 0.3, r1: d.range + 0.3, arc: d.arc, color: 0xff3a20, life: 0.18 }); fx.dust(e.pos.clone().add(V3(Math.sin(e.face) * 1.5, 0, Math.cos(e.face) * 1.5)), 8, 1.2); shake(0.15); }
          e.atkCd = d.cd * rand(0.85, 1.25);
        }
        break;
      }
      case 'strike': {
        e.t += dt; e.actT += dt / d.dur; action = d.act; at = clamp(e.actT);
        if (e.actT >= 1) { e.state = 'chase'; }
        break;
      }
      case 'stagger': {
        e.t -= dt; action = 'hit'; at = 1 - clamp(e.t / 0.5);
        if (e.t <= 0) e.state = 'chase';
        break;
      }
      case 'return': {
        const go = V3(e.post.x - e.pos.x, 0, e.post.z - e.pos.z), gl = go.length();
        if (gl > 0.25) { e.pos.addScaledVector(go.normalize(), Math.min(gl, d.speed * 0.75 * dt)); move = 0.7; e.face = angLerp(e.face, Math.atan2(go.x, go.z), dt * 6); }
        else e.state = 'idle';
        e.hp = Math.min(d.hp, e.hp + dt * 12);
        if (!P.downed && dist < 4.5 && G.scene === 'play') e.state = 'chase';
        break;
      }
    }
    collide(e.pos, 0.38);
    for (const o of enemies) { if (o === e || o.state === 'down') continue; const s = V3(e.pos.x - o.pos.x, 0, e.pos.z - o.pos.z), l = s.length(); if (l < 0.8 && l > 0.001) e.pos.addScaledVector(s, (0.8 - l) / l * 0.5); }
    e.rig.root.position.copy(e.pos); e.rig.root.rotation.y = e.face;
    e.rig.update(dt, { move, action, t: at, posture: d.boss ? 0.85 : 0.6 });
  }
}

// ---------------------------------------------------------------- update: world bits
function updateWorld(dt) {
  // junk respawn
  for (const j of L.junk) if (j.left <= 0) { j.respawn -= dt; if (j.respawn <= 0) { j.left = j.max; j.mats.forEach(m => m.color.copy(m.userData.c0)); } }
  // emitters
  for (const em of L.emitters) {
    if (!em.rate) continue;
    if (Math.abs(em.pos.x - cam.target.x) > 24 || Math.abs(em.pos.z - cam.target.z) > 20) continue;
    em.acc += em.rate * dt;
    while (em.acc > 1) {
      em.acc--;
      const p = em.pos;
      if (em.kind === 'steam') fx.smoke.emit({ pos: p.clone().add(V3(rand(-0.25, 0.25), 0, rand(-0.15, 0.15))), vel: [rand(-0.15, 0.25), rand(0.6, 1.1), rand(-0.15, 0.1)], life: rand(2, 3), size: 0.35, sizeEnd: 2.0, color: [0.42, 0.45, 0.5], alpha: 0.07, fadeIn: 0.25, drag: 0.3 });
      else if (em.kind === 'fire') {
        fx.add.emit({ pos: p.clone().add(V3(rand(-0.2, 0.2), 0, rand(-0.2, 0.2))), vel: [rand(-0.2, 0.2), rand(1.2, 2.4), rand(-0.2, 0.2)], life: rand(0.35, 0.6), size: rand(0.35, 0.55), sizeEnd: 0.08, color: [2.2, 1.0, 0.25], colorEnd: [1.2, 0.2, 0.02], drag: 1 });
        if (Math.random() < 0.18) fx.smoke.emit({ pos: p.clone().add(V3(0, 0.6, 0)), vel: [rand(-0.2, 0.2), rand(0.9, 1.4), 0], life: 2.0, size: 0.4, sizeEnd: 1.5, color: [0.07, 0.06, 0.06], alpha: 0.22, fadeIn: 0.2 });
        if (Math.random() < 0.2) fx.add.emit({ pos: p.clone(), vel: [rand(-0.6, 0.6), rand(2, 3.5), rand(-0.6, 0.6)], life: rand(0.8, 1.6), size: 0.05, color: [2, 0.8, 0.2], gravity: -0.3, drag: 0.5 });
      } else if (em.kind === 'labVent') {
        const c = hexArr(G.lastCookColor, 1);
        fx.smoke.emit({ pos: p.clone(), vel: [rand(0.6, 1), rand(0.3, 0.7), rand(-0.2, 0.2)], life: 2.2, size: 0.3, sizeEnd: 1.8, color: [c[0] * 0.6 + 0.3, c[1] * 0.6 + 0.3, c[2] * 0.6 + 0.3], alpha: 0.2, fadeIn: 0.1, drag: 0.6 });
        if (Math.random() < 0.3) fx.add.emit({ pos: p.clone(), vel: [rand(0.4, 1), rand(0.3, 0.8), rand(-0.3, 0.3)], life: 1.2, size: 0.06, color: c.map(v => v * 2), drag: 0.4 });
      }
    }
  }
  // the Fence: leans, smokes, turns to talk when you come close
  const fd = Math.hypot(P.pos.x - fence.pos.x, P.pos.z - fence.pos.z);
  const fAct = G.modal === 'market' || fd < 3.2 ? 'talk' : 'lean';
  fence.face = angLerp(fence.face ?? 0, fAct === 'talk' ? Math.atan2(P.pos.x - fence.pos.x, P.pos.z - fence.pos.z) : 0, dt * 4);
  fence.rig.root.rotation.y = fence.face;
  fence.rig.update(dt, { action: fAct, posture: 0.7 });
  if (fence.rig.smoking && fAct === 'lean' && Math.random() < dt * 3) fx.smoke.emit({ pos: fence.rig.headWorld(V3()), vel: [rand(-0.1, 0.1), 0.5, 0.15], life: 2, size: 0.12, sizeEnd: 0.8, color: [0.7, 0.72, 0.75], alpha: 0.25 });
  // capture animation + tribute
  if (G.territory && G.captureT < 1) { G.captureT = Math.min(1, G.captureT + dt / 1.6); L.setCapture(G.captureT); }
  if (G.territory) {
    G.tributeT -= dt;
    if (G.tributeT <= 0) { G.tributeT = 20; G.cash += 6; G.stats.earned += 6; ui.float('+$6 tribute', 'cash', L.tagSpot.clone().add(V3(0, 2.5, 1))); popSlot('cash'); }
  }
  // lab light breathing while a cook runs
  if (G.labTier) L.lights.chem.intensity = lerp(L.lights.chem.intensity, (lab.cook ? 14 + Math.sin(G.time * 12) * 4 : G.labTier >= 2 ? 8 : 5), dt * 3);
}

// ---------------------------------------------------------------- camera, occlusion, world UI
function project(v) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, z: p.z }; }
function updateCamera(dt, rdt) {
  if (G.scene === 'title') {
    const a = G.time * 0.05;
    camera.position.set(Math.sin(a) * 20 - 2, 17, Math.cos(a) * 14 + 2);
    camera.lookAt(-4, 0, -2);
    cam.target.set(-4, 0, -2);
    return;
  }
  const lead = V3(mouse.world.x - P.pos.x, 0, mouse.world.z - P.pos.z);
  if (lead.length() > 9) lead.setLength(9);
  const want = P.pos.clone().addScaledVector(lead, G.modal ? 0 : 0.14);
  cam.target.lerp(want, 1 - Math.pow(0.004, rdt));
  cam.zoom = lerp(cam.zoom, cam.zoomT, 1 - Math.pow(0.3, rdt));
  cam.shake *= Math.pow(0.004, rdt);
  const s = cam.shake * cam.shake * 0.35, tt = performance.now() / 1000;
  camera.position.copy(cam.target).addScaledVector(cam.off, cam.zoom).add(V3(Math.sin(tt * 61) * s, Math.sin(tt * 47) * s, Math.cos(tt * 53) * s));
  camera.lookAt(cam.target.x, 0.7, cam.target.z);
}
function updateOcclusion(dt) {
  const p = G.scene === 'title' ? V3(0, 0, 50) : P.pos;
  for (const o of L.occluders) {
    const want = o.test(p) ? 0.22 : 1;
    o.k = lerp(o.k, want, 1 - Math.pow(0.0005, dt));
    for (const m of o.mats) { m.opacity = m.userData.baseOpacity * o.k; m.depthWrite = o.k > 0.95; }
  }
}
function updateWorldUI(dt) {
  // aim point on the ground
  mouse.ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse.ndc, camera);
  raycaster.ray.intersectPlane(groundPlane, mouse.world);
  // interaction prompt + highlight
  const nf = findFocus();
  if (focus !== nf) {
    if (focus?.mats) focus.mats.forEach(m => m.emissiveIntensity = 0);
    focus = nf;
  }
  const pr = $('prompt');
  const target = P.chan ? P.chan.target : focus;
  if (target && G.scene === 'play' && !G.modal) {
    const [text, ok] = target.label();
    const s = project(target.pos.clone().add(V3(0, target.kind === 'buyer' ? 2.6 : 1.7, 0)));
    pr.style.display = 'flex'; pr.style.left = s.x + 'px'; pr.style.top = s.y + 'px';
    pr.style.setProperty('--acc', target.acc);
    pr.querySelector('.ptext').textContent = P.chan ? (P.chan.anim === 'spray' ? 'Tagging…' : target.kind === 'labDoor' ? 'Prying the shutter…' : 'Searching…') : text;
    pr.classList.toggle('no', !ok && !P.chan); pr.classList.toggle('chan', !!P.chan);
    if (P.chan) pr.querySelector('.pbar b').style.width = (P.chan.t / P.chan.dur) * 100 + '%';
    fx.highlight(target.pos, target.kind === 'junk' ? 1.5 : 1.1, ok ? target.acc : '#555555', G.time);
    if (target.mats) target.mats.forEach(m => { m.emissive.set(target.acc); m.emissiveIntensity = ok ? 0.12 + Math.sin(G.time * 5) * 0.06 : 0; });
  } else { pr.style.display = 'none'; fx.highlight(null); }
  // enemy health bars
  for (const e of enemies) {
    const show = G.scene === 'play' && e.state !== 'down' && (e.state !== 'idle' || e.hp < e.d.hp);
    const s = project(e.pos.clone().add(V3(0, e.d.boss ? 2.45 : 2.2, 0)));
    ui.bar(e.id, e.d.name, e.hp / e.d.hp, s.x, s.y, show, e.d.boss);
  }
  ui.updateFloats(dt, project);
  // waypoint to the current objective
  const wp = $('waypoint'), oi = objIndex();
  const at = G.scene === 'play' && !G.modal && oi < OBJ.length ? OBJ[oi].at() : null;
  if (at && Math.hypot(at.x - P.pos.x, at.z - P.pos.z) > 3.2) {
    const s = project(at.clone().add(V3(0, 2.4, 0))), m = 40;
    wp.style.display = 'block'; wp.style.left = clamp(s.x, m, innerWidth - m) + 'px'; wp.style.top = clamp(s.y, m + 140, innerHeight - m - 90) + 'px';
  } else wp.style.display = 'none';
}

// ---------------------------------------------------------------- loop
let last = performance.now(), hudT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const rdt = Math.min(0.05, (now - last) / 1000); last = now;
  tick(rdt);
}
function tick(rdt, render = true) {
  let dt = rdt;
  if (hitstop > 0) { hitstop -= rdt; dt = rdt * 0.06; }
  G.time += rdt; if (G.scene === 'play') G.playTime += rdt;
  if (G.scene !== 'loading') {
    updatePlayer(dt); updateEnemies(dt); pickupDrops(dt); updateWorld(dt);
    L.update(dt, G.time);
    updateCamera(dt, rdt); updateOcclusion(rdt);
    fx.update(dt, cam.target, G.time);
    updateWorldUI(rdt);
    lab.frame(rdt);
    hudT -= rdt; if (hudT <= 0) { hudT = 0.1; updateHUD(false); }
  }
  hurtK = Math.max(0, hurtK - rdt * 2.2);
  grade.uniforms.uDamage.value = hurtK * 0.6 + (P && P.hp / P.maxHp < 0.3 && !P.downed ? 0.18 + Math.sin(G.time * 5) * 0.08 : 0);
  grade.uniforms.uDesat.value = lerp(grade.uniforms.uDesat.value, desatT, 1 - Math.pow(0.05, rdt));
  grade.uniforms.uTime.value = G.time;
  if (render) composer.render();
}
// test hook: advance the simulation without waiting for real frames
function step(seconds = 1, fps = 30) { const n = Math.round(seconds * fps); for (let i = 0; i < n; i++) tick(1 / fps, i === n - 1); }
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h;
  // keep the view tighter on narrow screens
  camera.fov = w / h < 1 ? 50 : 36; camera.updateProjectionMatrix();
  const pr = renderer.getPixelRatio();
  grade.uniforms.uRes.value.set(w * pr, h * pr);
  bloom.resolution.set(w / 2, h / 2);
  if (fx) fx.setScale((h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
}

window.BM = { G, camera, scene, cam, get fx() { return fx; }, get P() { return P; }, get enemies() { return enemies; }, get L() { return L; }, OBJ, startGame, openModal, closeModal, step, keys, mouse, interact: () => interact(), get focus() { return focus; }, get lab() { return lab; }, playerAttack: () => playerAttack() };
boot().catch(err => { const d = $('err'); d.style.display = 'block'; d.textContent = 'Black Market: Zero failed to start:\n' + (err.stack || err); console.error(err); });
