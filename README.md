# HELLBOUND

A gothic dark-fantasy dungeon crawler for the browser. Play it at https://powernark-pixel.github.io/HELLBOUND/

## Files

- `index.html` is the whole game. GitHub Pages publishes it from the `main` branch.
- `assets/` holds the pixel art PNGs: sprite sheets, dungeon tiles, item icons, effects and UI frames.
  If a file is missing, the game falls back to simple placeholder art so it still runs.
- `tools/art/` is the Python script that draws every PNG in `assets/` pixel by pixel.
  Rebuild all art with `py tools/art/build_art.py` (no extra libraries needed).
- `V1`.txt` is an older copy, kept for reference.
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
| `tiles/dungeon_tiles.png` | 32×32 | one row, order = `TILE_NAMES` in `index.html` |
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
