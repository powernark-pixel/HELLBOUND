// Smoke test for HELLBOUND. Runs on GitHub (see .github/workflows/check.yml).
// Opens the game in a headless browser under /HELLBOUND/ (the same path GitHub Pages uses)
// and fails if the game crashes, an asset is missing, or a main feature stops working.
import { chromium } from 'playwright-core';

const URL = process.env.GAME_URL || 'http://127.0.0.1:8000/HELLBOUND/';
const errors = [];
const fail = msg => { console.error('FAIL: ' + msg); process.exitCode = 1; };
const ok = msg => console.log('ok   ' + msg);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on('pageerror', e => errors.push('Script error: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('Console error: ' + m.text()); });
page.on('response', r => {
  if (r.url().startsWith(new globalThis.URL(URL).origin) && r.status() >= 400) errors.push(`Missing file ${r.status()}: ${r.url()}`);
});

await page.goto(URL);
await page.waitForFunction(() => typeof ready !== 'undefined' && ready === true, null, { timeout: 15000 })
  .catch(() => fail('game never finished loading (ready flag not set)'));

// 1. every sprite sheet / tile / icon PNG loaded (no code fallbacks)
const art = await page.evaluate(() => Object.entries(IMG).filter(([k, v]) => !(v instanceof HTMLImageElement)).map(([k]) => k));
art.length ? fail('art fell back to placeholders for: ' + art.join(', ')) : ok('all PNG art loaded');

// 2. title screen -> Controls -> back -> New Game
const t = await page.evaluate(() => ({ scene, open: document.getElementById('title').classList.contains('open') }));
t.scene === 'title' && t.open ? ok('title screen shows') : fail('title screen not showing');
await page.click('#btnControls');
(await page.isVisible('#controlsPanel')) ? ok('controls panel opens') : fail('controls panel did not open');
await page.keyboard.press('Escape');
(await page.isVisible('#controlsPanel')) ? fail('Escape did not close controls') : ok('Escape closes controls');
await page.click('#btnNew');
await page.waitForTimeout(300);
(await page.evaluate(() => scene === 'game' && !!P)) ? ok('New Game starts a run') : fail('New Game did not start');

const errBoxShown = await page.evaluate(() => getComputedStyle(document.getElementById('err')).display !== 'none');
if (errBoxShown) fail('error box is showing: ' + await page.textContent('#err'));

// 2b. the Blood Altar: handcrafted first level is loaded and every part of it can be reached
const lv = await page.evaluate(() => {
  const reach = (tx, ty) => level && level.steps[ty * MW + tx] >= 0;
  return {
    loaded: !!level && circleName() === 'The Blood Altar',
    areas: level ? level.areas.map(a => a.n).sort().join('') : '',
    stairs: reach(stairsT.x, stairsT.y),
    allAreas: level && level.areas.every(a => reach(a.tx, a.ty)),
    allEnemies: enemies.every(e => reach(Math.floor(e.x / T), Math.floor(e.y / T))),
    allChests: chests.every(c => reach(Math.floor(c.x / T), Math.floor(c.y / T))),
    wardenWaits: !!boss && boss.dormant === true,
    harderLater: (() => { const imps = enemies.filter(e => e.type === 'imp' && !e.elite); return Math.max(...imps.map(e => e.max)) > Math.min(...imps.map(e => e.max)); })()
  };
});
lv.loaded ? ok('New Game starts in Circle 1, The Blood Altar') : fail('the Blood Altar level did not load');
lv.areas === '234567' ? ok('all six area entrances are in the map') : fail('area entrances missing: got ' + lv.areas);
lv.stairs && lv.allAreas && lv.allEnemies && lv.allChests ? ok('stairs, areas, enemies and chests are all reachable from the start') : fail('part of the Blood Altar cannot be reached: ' + JSON.stringify(lv));
lv.wardenWaits ? ok('the Warden waits at the altar until you arrive') : fail('the Warden is not waiting at the altar');
lv.harderLater ? ok('enemies get tougher further along the path') : fail('enemy toughness does not rise along the path');

// 2c. sound engine is loaded and has every sound
const snd = await page.evaluate(() => typeof SFX === 'object' ? SFX.names.length : 0);
snd >= 20 ? ok(`sound engine loaded (${snd} sounds)`) : fail('sound engine missing');

// 3. movement
const x0 = await page.evaluate(() => P.x);
await page.keyboard.down('d'); await page.waitForTimeout(600); await page.keyboard.up('d');
const x1 = await page.evaluate(() => P.x);
x1 > x0 ? ok(`holding D moves the knight (${x0.toFixed(0)} -> ${x1.toFixed(0)})`) : fail('holding D did not move the knight');

// 4. inventory: sorting/filtering must never make Equip or Salvage act on the wrong item
await page.evaluate(() => { for (let i = 0; i < 12; i++) { const it = makeItem(SLOTS[i % 8], 1 + i, i % 5); it.got = ++pickupSeq; inv.push(it); } stardust = 50; });
await page.keyboard.press('i');
(await page.isVisible('#invPanel')) ? ok('I opens the reliquary') : fail('I did not open the inventory');
for (const sort of ['rarity', 'level', 'type', 'new']) {
  await page.click(`[data-sort=${sort}]`);
  const res = await page.evaluate(() => {
    const c = document.querySelector('#grid .card'); const id = +c.dataset.id; const it = inv.find(i => i.id === id);
    c.querySelector('[data-equip]').click();
    return eq[it.slot] && eq[it.slot].id === id;
  });
  res ? ok(`equip after sorting by ${sort} equips the clicked item`) : fail(`equip after sorting by ${sort} picked the wrong item`);
}
await page.click('[data-group=jewel]');
const jewel = await page.evaluate(() => [...document.querySelectorAll('#grid .card')].every(c => ['ring', 'sigil'].includes(inv.find(i => i.id === +c.dataset.id).slot)));
jewel ? ok('jewellery filter shows only rings and amulets') : fail('jewellery filter shows other items');
await page.click('[data-group=all]');
const salv = await page.evaluate(() => {
  const c = document.querySelector('#grid .card'); const id = +c.dataset.id; const s0 = stardust;
  c.querySelector('[data-salvage]').click(); return !inv.some(i => i.id === id) && stardust > s0;
});
salv ? ok('salvage removes the clicked item and pays stardust') : fail('salvage failed');
await page.hover('#grid .card');
(await page.isVisible('#tip')) ? ok('hover shows the comparison tooltip') : fail('no comparison tooltip');
await page.click('#invPanel [data-close=inv]');
(await page.isVisible('#invPanel')) ? fail('close button did not close the inventory') : ok('close button closes the inventory');

// 5. finishing the level: the stairs lead to the shack, which gives +10 max health and has a stash and reward chest
const before = await page.evaluate(() => Math.round(P.maxHp));
// the blood vat: with only the Warden dead the stairs stay sealed; killing enough fills the vat and opens them
await page.evaluate(() => { killEnemy(boss); P.x = (stairsT.x + .5) * T; P.y = (stairsT.y + .5) * T; });
await page.waitForTimeout(400);
(await page.evaluate(() => !!level && circleName() === 'The Blood Altar' && !vatFull())) ? ok('the stairs stay sealed until the blood vat is full') : fail('the stairs opened without filling the blood vat');
// kills spill blood drops; the vat only fills as you collect them (js/blood.js)
const spill = await page.evaluate(() => { for (const e of enemies.slice()) killEnemy(e); P.x = (stairsT.x - 1.5) * T; P.y = (stairsT.y + .5) * T;
  return { drops: bloodDrops.length, fullBefore: vatFull() }; });
spill.drops > 0 && !spill.fullBefore ? ok('kills spill blood drops that must be collected') : fail('blood drops did not spill: ' + JSON.stringify(spill));
await page.evaluate(() => { for (const d of bloodDrops.slice()) collectDrop(d); });
await page.waitForTimeout(200);
(await page.evaluate(() => vatFull())) ? ok('collecting the blood fills the vat') : fail('the blood vat did not fill');
// blood past a full vat fills the syringe; V injects it for a surge (js/blood.js)
const surge = await page.evaluate(() => { const d0 = S.damage; addBlood(INJECT_NEED); const filled = P.ichor >= INJECT_NEED; injectBlood();
  const r = { filled, surging: P.surgeT > 0, stronger: S.damage > d0 }; P.surgeT = 0.001; return r; });
surge.filled && surge.surging && surge.stronger ? ok('overflow blood fills the syringe and V injects a surge') : fail('blood injection failed: ' + JSON.stringify(surge));
await page.evaluate(() => { P.x = (stairsT.x + .5) * T; P.y = (stairsT.y + .5) * T; });
await page.waitForTimeout(500);
const shack = await page.evaluate(() => ({
  inShack: !!level && level.safe === true && circleName() === 'The Shack',
  noEnemies: enemies.length === 0,
  pieces: !!level.stash && !!level.bed && !!stairsT && chests.some(c => c.reward && !c.open),
  maxHp: Math.round(P.maxHp), next: floor,
}));
shack.inShack ? ok('finishing the Blood Altar leads to the shack') : fail('the stairs did not lead to the shack');
shack.maxHp === before + 10 ? ok('completing a level gives +10 max health') : fail(`max health went ${before} -> ${shack.maxHp}, expected +10`);
shack.noEnemies && shack.pieces ? ok('the shack is safe and has a stash, bed, reward chest and trapdoor') : fail('shack is missing pieces: ' + JSON.stringify(shack));
const stashOk = await page.evaluate(() => {
  const it = makeItem('ring', 1, 0); inv.push(it); storeId(it.id);
  const stored = stash.some(i => i.id === it.id) && !inv.some(i => i.id === it.id);
  takeId(it.id); return stored && inv.some(i => i.id === it.id);
});
stashOk ? ok('items can be stored in and taken from the stash') : fail('the stash did not store/take an item');
// the reward chest after the first level offers a perk; the Stardust Engine empowers the weapon
const perk = await page.evaluate(async () => {
  const c = chests.find(c => c.reward); P.x = c.x; P.y = c.y + 20; openChest();
  await new Promise(r => setTimeout(r, 600));
  const offered = perkOpen && document.querySelectorAll('#perkCards [data-perk]').length === 3;
  document.querySelector('#perkCards [data-perk]').click();
  return { offered, chosen: P.perks.length === 1 && !perkOpen };
});
perk.offered && perk.chosen ? ok('the reward chest offers 3 perks and one can be chosen') : fail('perk choice failed: ' + JSON.stringify(perk));
const forge = await page.evaluate(() => {
  if (!eq.blade) { const b = makeItem('blade', 1, 0); eq.blade = b; calc(); }
  const before = S.damage; stardust = 100; openEngine(); feedEngine(false); closeEngine();
  return { emp: eq.blade.emp, dust: stardust, stronger: S.damage > before, engine: !!level.engine };
});
forge.engine && forge.emp === 1 && forge.dust === 90 && forge.stronger ? ok('the Stardust Engine turns 10 stardust into +1% weapon stats') : fail('Stardust Engine failed: ' + JSON.stringify(forge));
await page.evaluate(() => { P.x = (stairsT.x + .5) * T; P.y = (stairsT.y + .5) * T; });
await page.waitForTimeout(400);
(await page.evaluate(() => floor === 2 && !level)) ? ok('the trapdoor leads down to Circle 2') : fail('the trapdoor did not lead to Circle 2');

// 5b. skills: Q = Fire Line, E = Cleave, R = Blood Flask
await page.evaluate(() => { enemies.length = 0; P.hp = P.maxHp * 0.3; P.fireCD = 0; P.spinCD = 0; P.flasks = 3; });
await page.keyboard.press('q'); await page.keyboard.press('e'); await page.keyboard.press('r');
await page.waitForTimeout(1300);
const sk = await page.evaluate(() => ({ fire: P.fireCD > 0, spin: P.spinCD > 0, flasks: P.flasks, healed: P.hp > P.maxHp * 0.6 }));
sk.fire ? ok('Q casts Fire Line') : fail('Q did not cast Fire Line');
sk.flasks === 2 && sk.healed ? ok('R drinks a Blood Flask and heals') : fail('the Blood Flask did not work: ' + JSON.stringify(sk));
sk.spin ? ok('E spins a Cleave') : fail('E did not Cleave');

// 5c. every button has a reason: Cleave staggers a crowd, Fire Line spoils an archer's shot,
//     the roll dodges, and the skill bar shows seconds left / shakes when a skill isn't ready
const why = await page.evaluate(async () => {
  const r = {};
  r.secs = document.getElementById('skFireS').textContent !== '' && parseFloat(document.getElementById('skFireCd').style.height) > 0;
  castFireLine(); r.deny = document.getElementById('skFire').classList.contains('deny');
  P.flasks = 1; P.hp = P.maxHp * 0.2; P.healT = 0; updateHUD(); r.urge = document.getElementById('skFlask').classList.contains('urge');
  enemies.length = 0; P.spinCD = 0; P.fireCD = 0;
  const hound = spawnEnemy('hound', { x: P.x + 16, y: P.y, hpMul: 50 }); hound.act = 'wind'; hound.actT = 0.4;
  castSpin(); r.stagger = hound.act === null && hound.touch >= 0.7 && hound.kbT > 0.2;
  enemies.length = 0;
  const archer = spawnEnemy('archer', { x: P.x + 60, y: P.y, hpMul: 50 }); archer.act = 'wind'; archer.actT = 0.6; archer.windMax = 0.6;
  P.aim = Math.atan2(archer.y - P.y, archer.x - P.x); castFireLine();
  await new Promise(res => setTimeout(res, 250));
  r.spoiled = archer.act !== 'wind' && archer.fire > 0.5;
  enemies.length = 0;
  const hp = P.hp; P.rollIF = 0.3; P.inv = 0.3; hurt(10); r.dodge = P.hp === hp;
  P.rollIF = 0; P.inv = 0; P.hp = P.maxHp;
  return r;
});
why.secs ? ok('the skill bar shows a cooldown sweep and seconds left') : fail('no cooldown seconds on the skill bar');
why.deny ? ok('pressing a skill on cooldown shakes its slot') : fail('no "not ready" feedback');
why.urge ? ok('the flask slot pulses when health is low') : fail('flask slot did not pulse at low health');
why.stagger ? ok('Cleave shoves, staggers and cancels a hound\'s lunge') : fail('Cleave did not stagger');
why.spoiled ? ok('Fire Line spoils an archer\'s shot') : fail('Fire Line did not spoil the archer: ' + JSON.stringify(why));
why.dodge ? ok('a hit during a roll is dodged') : fail('the roll did not dodge');

// 6. pause menu
await page.keyboard.press('Escape');
(await page.isVisible('#pausePanel')) ? ok('Escape opens the pause menu') : fail('Escape did not open the pause menu');
await page.click('#btnResume');

// 7. play for a few seconds to catch errors inside the game loop
await page.mouse.move(800, 360);
await page.mouse.down(); await page.waitForTimeout(3000); await page.mouse.up();

// 8. the core loop: telegraphs, the Warden's fight, dying and rising again
await page.evaluate(() => { if (paused) togglePause(); });
const loop = await page.evaluate(() => {
  newGame();
  const r = {};
  // an archer aims (wind-up with a warning line) before it shoots
  enemies = []; ebullets = [];
  const a = spawnEnemy('archer', { x: P.x + 200, y: P.y }); a.fire = 0;
  update(0.05); r.aims = a.act === 'wind' && ebullets.length === 0;
  for (let i = 0; i < 14; i++) update(0.05);
  r.shoots = ebullets.length === 1;
  // a rat flashes red before its bite lands; the knight shows through an enemy in front of him
  enemies = []; ebullets = []; P.inv = 0; P.sh = 0;
  const rat = spawnEnemy('rat', { x: P.x + 6, y: P.y + 6 }), hp0 = P.hp;
  P.sinceHit = 9; update(0.016); r.biteTell = rat.bite > 0 && P.hp === hp0 && P.sinceHit > 1;
  for (let i = 0; i < 15; i++) update(0.016);
  r.bites = P.sinceHit < 0.5;   // hurt() was called
  enemies = []; spawnEnemy('demon', { x: P.x + 10, y: P.y + 10 }); draw(); r.xray = knightHidden;
  enemies = []; draw(); r.noXray = !knightHidden;
  enemies = []; P.hp = P.maxHp; P.inv = 0;
  // the Warden's bar shows as soon as he wakes; he announces his second phase
  enemies = []; ebullets = [];
  boss = spawnEnemy('demon', { x: P.x + 300, y: P.y, boss: true }); boss.dormant = false;
  updateHUD && updateHUD(); r.bar = getComputedStyle(document.getElementById('bossbar')).display !== 'none';
  boss.hp = boss.max * 0.4; update(0.016);
  r.enraged = !!boss.enraged && /ENRAGED/.test(document.getElementById('banner').textContent);
  // his death draws every blood drop left on the floor into the vat
  bloodDrops.push({ x: P.x + 900, y: P.y, vx: 0, vy: 0, z: 0, vz: 0, v: 5, ph: 0, age: 9 });
  killEnemy(boss); r.swept = bloodDrops.every(d => d.got);
  // dying: Space after a short beat starts a new run
  P.inv = 0; hurt(99999); r.dead = dead;
  return r;
});
loop.aims ? ok('archers aim with a warning before shooting') : fail('archer did not wind up: ' + JSON.stringify(loop));
loop.shoots ? ok('archers shoot after aiming') : fail('archer never shot');
loop.biteTell && loop.bites ? ok('rats flash red before a bite, then bite') : fail('bite tell broken: ' + JSON.stringify(loop));
loop.xray && loop.noXray ? ok('the knight shows through an enemy standing in front of him') : fail('knight outline broken: ' + JSON.stringify(loop));
loop.bar ? ok('the Warden\'s bar shows as soon as he wakes') : fail('no Warden bar on waking');
loop.enraged ? ok('the Warden announces his second phase') : fail('no enrage announcement');
loop.swept ? ok('the Warden\'s death collects all spilled blood') : fail('blood left on the floor after the Warden');
await page.keyboard.press(' ');
const early = await page.evaluate(() => dead);
await page.waitForTimeout(700);
await page.keyboard.press(' ');
const risen = await page.evaluate(() => !dead && P.hp > 0);
loop.dead && early && risen ? ok('Space rises again after a short beat') : fail(`rise again failed (dead ${loop.dead}, held ${early}, risen ${risen})`);

for (const e of errors) fail(e);
await browser.close();
if (!process.exitCode) console.log('PASS: HELLBOUND loads and runs without errors');
