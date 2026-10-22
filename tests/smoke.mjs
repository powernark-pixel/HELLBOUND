// Smoke test for HELLBOUND. Runs on GitHub (see .github/workflows/check.yml).
// Opens index.html in a headless browser and fails if the game crashes or
// the main controls stop working.
import { chromium } from 'playwright-core';

const URL = process.env.GAME_URL || 'http://127.0.0.1:8000/index.html';
const errors = [];
const fail = msg => { console.error('FAIL: ' + msg); process.exitCode = 1; };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on('pageerror', e => errors.push('Script error: ' + e.message));
page.on('console', m => {
  if (m.type() !== 'error') return;
  // Missing optional art in assets/ is expected: the game draws placeholders.
  if (/Failed to load resource/.test(m.text())) return;
  errors.push('Console error: ' + m.text());
});

await page.goto(URL);
// Wait for the game to finish loading (assets time out after 2.5s at most).
await page.waitForFunction(() => typeof ready !== 'undefined' && ready === true, null, { timeout: 10000 })
  .catch(() => fail('game never finished loading (ready flag not set)'));

// Some versions start on a title screen. Press Enter/click to get into the game.
await page.keyboard.press('Enter');
await page.mouse.click(640, 360);
await page.waitForTimeout(500);

const errBoxShown = await page.evaluate(() => {
  const d = document.getElementById('err');
  return !!d && getComputedStyle(d).display !== 'none';
});
if (errBoxShown) fail('error box is showing: ' + await page.textContent('#err'));

// Movement: hold D and the knight should move right.
const x0 = await page.evaluate(() => P && P.x);
await page.keyboard.down('d');
await page.waitForTimeout(600);
await page.keyboard.up('d');
const x1 = await page.evaluate(() => P && P.x);
console.log(`move: x ${x0} -> ${x1}`);
if (!(x1 > x0)) fail('holding D did not move the knight');

// Inventory (I) and passive tree (T) open and close.
for (const [key, id] of [['i', 'inv'], ['t', 'tree']]) {
  await page.keyboard.press(key);
  await page.waitForTimeout(200);
  const open = await page.evaluate(id => document.getElementById(id)?.classList.contains('open'), id);
  if (!open) fail(`pressing ${key.toUpperCase()} did not open #${id}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

// Let it run a few seconds to catch errors inside the game loop.
await page.mouse.move(800, 360);
await page.mouse.down();
await page.waitForTimeout(3000);
await page.mouse.up();

for (const e of errors) fail(e);
await browser.close();
if (!process.exitCode) console.log('PASS: HELLBOUND loads and runs without errors');
