# HELLBOUND

A browser dungeon crawler. Play it at https://powernark-pixel.github.io/HELLBOUND/

## Files

- `index.html` is the whole game. GitHub Pages publishes it from the `main` branch.
- `V1`.txt` is an older copy, kept for reference.
- `assets/` (optional) holds real sprite art. If a file is missing, the game draws placeholder art.
- `tests/smoke.mjs` and `.github/workflows/check.yml` are the automatic game check.

## How updates are published

1. Claude edits the game in `C:\Users\PC\Documents\HELLBOUND` and tests it locally.
2. Claude shows you what changed and asks before pushing.
3. Pushing to `main` updates the live site within 1 to 2 minutes.
4. On GitHub, the **Actions** tab runs "Game check" on every push. A green tick means the game
   loaded and the controls worked. A red X means something broke. Tell Claude and it will fix it.

To undo an update, ask Claude to revert it, or use **Revert** on the commit on GitHub.
