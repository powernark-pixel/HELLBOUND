# HELLBOUND

A gothic dark-fantasy dungeon crawler for the browser. Play it at https://powernark-pixel.github.io/HELLBOUND/

## Files

- `index.html` is the page: the HUD and menus. GitHub Pages publishes the `main` branch.
- `css/hellbound.css` is the look of the HUD and menus.
- `js/` is the game code, split by job. The files load in this order and share one global scope
  (no build step: each file may use anything from an earlier one):

  | File | What's in it |
  |---|---|
  | `core.js` | canvas, scaling to the window, small helpers |
  | `style.js` | the game's colours by name (`COL.blood`, `COL.gold`...) |
  | `assets.js` | loading PNG art, sprite sheets, drawing sprites |
  | `data.js` | item bases, affixes, traits, enemy types |
  | `state.js` | the player, stats, starting a new game |
  | `world.js` | building levels, random floors, the shack, the blood vat |
  | `ui.js` | overlays, menus, announcements, the message log |
  | `items.js` | drops, equipping, salvage, inventory and stash, chests, the bed |
  | `combat.js` | dealing and taking damage, kills, the sword swing |
  | `skills.js` | Fire Line, Blood Flask, Cleave |
  | `perks.js` | perks offered by the reward chest |
  | `engine.js` | the Stardust Engine: stardust → +1% weapon stats |
  | `liquids.js` | lava and blood pools |
  | `blood.js` | blood drops from kills, and the vat vessel on the right edge |
  | `enemies.js` | hound lunge, demon slam, the Warden's fight, ground warnings |
  | `eye.js` | the Oculus, an eye monster drawn live (tentacles move every frame); press O to spawn one |
  | `update.js` | one step of game logic per frame |
  | `render.js` | drawing the world in isometric view |
  | `ambience.js` | fog, dust motes, blood drips |
  | `title.js`, `hud.js`, `input.js`, `main.js` | title screen, HUD, keyboard and mouse, the main loop |
- `assets/` holds the pixel art PNGs: sprite sheets, dungeon tiles, item icons, effects and UI frames.
  If a file is missing, the game falls back to simple placeholder art so it still runs.
- `tools/art/` is the Python script that draws every PNG in `assets/` pixel by pixel.
  Rebuild all art with `py tools/art/build_art.py` (no extra libraries needed).
- `levels/blood_altar.js` is **The Blood Altar**, the handcrafted first circle: one long path through seven
  areas that get harder as you go, ending at the altar and its Warden. The map is plain text (one character
  per tile) with a legend at the top, so it can be edited by hand. Deeper circles are still random.
- `assets/fx/blood_fx.png` and `assets/sprites/enemies/rat_sheet.png` are licensed third-party art; see `CREDITS.md`.
- `audio/sfx.js` makes every sound live (no audio files needed). To swap in your own sounds, see `audio/README.md`.
- `levels/shack.js` is **The Shack**, the hideout where every run starts and where you return after each level:
  rest, sort loot, and keep items in the stash (saved in your browser, survives death).
- The game is drawn **isometric** (diagonal, like Path of Exile).
- `V1`.txt` is an older copy, kept for reference.
- `docs/STYLE_GUIDE.md` lists the colours, pixel sizes, fonts and art rules, and how to add a monster, level, sound or perk.
- `tests/smoke.mjs` and `.github/workflows/check.yml` are the automatic game check.

### Replacing art with an artist's work

Any PNG in `assets/` can be swapped for hand-made art of the same size and layout:

| File | Frame size | Layout |
|---|---|---|
| `sprites/player/knight_sheet.png` | 32×32 | rows: idle 4, walk 6, attack 4, hurt 2, death 4 |
| `sprites/enemies/imp_sheet.png` | 24×24 | rows: idle 4, walk 4, attack 3, hurt 2, death 4 |
| `sprites/enemies/hound_sheet.png`, `archer_sheet.png` | 32×32 | same rows as the imp |
| `sprites/enemies/demon_sheet.png` | 40×40 | same rows as the imp |
| `sprites/enemies/warden_sheet.png` (boss) | 56×56 | same rows as the imp |
| `tiles/dungeon_tiles.png` | 32×32 | one row, order = `TILE_NAMES` in `js/assets.js` |
| `items/item_icons.png` | 16×16 | one row: helm, weapon, chest, gloves, legs, boots, ring, amulet |
| `effects/effects.png` | 16×16 | glow, spark, 4 blood splats, ember, ash |
| `ui/*.png` | varies | 9-slice frames used by the CSS |

Sprites face right; the game mirrors them for left.

## How updates are published

1. Claude works on a separate branch, tests the game locally, and opens a pull request.
2. You look at the pull request on GitHub. Nothing changes on the live site yet.
3. When you click **Merge pull request**, `main` updates and the live site changes within 1 to 2 minutes.
4. The **Actions** tab runs "Game check" on every pull request and push. A green tick means the game
   loaded, every asset was found and the controls worked. A red X means something broke.

To undo an update, use **Revert** on the merged pull request on GitHub, or ask Claude to revert it.
