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

// 5. passive tree
await page.evaluate(() => { P.points = 2; });
await page.keyboard.press('t');
(await page.isVisible('#treePanel')) ? ok('T opens the passive tree') : fail('T did not open the tree');
await page.click('.tn[data-id="Fury0"]');
(await page.evaluate(() => !!P.alloc.Fury0 && P.points === 1)) ? ok('taking a node spends a point') : fail('could not take a passive node');
await page.keyboard.press('Escape');

// 6. pause menu
await page.keyboard.press('Escape');
(await page.isVisible('#pausePanel')) ? ok('Escape opens the pause menu') : fail('Escape did not open the pause menu');
await page.click('#btnResume');

// 7. play for a few seconds to catch errors inside the game loop
await page.mouse.move(800, 360);
await page.mouse.down(); await page.waitForTimeout(3000); await page.mouse.up();

for (const e of errors) fail(e);
await browser.close();
if (!process.exitCode) console.log('PASS: HELLBOUND loads and runs without errors');
