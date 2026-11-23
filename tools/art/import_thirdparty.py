"""Imports licensed third-party art into assets/ (see CREDITS.md).

  py tools/art/import_thirdparty.py "<folder with the downloaded files>"

- Blood FX by jasontomlee (https://jasontomlee.itch.io/blood-fx), Batch 1:
  'VFX Blood Batch 1_SpriteSheetRows.png' -> assets/fx/blood_fx.png (+ prints the frame table for index.html)
- Rat from Dark Enemies Pack by WilliamQM (https://williamqm.itch.io/dark-enemies-pack):
  OutlinedRat/*.png -> assets/sprites/enemies/rat_sheet.png (rows idle, walk, attack, hurt, death)
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pix import Img
from pngread import read_png

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'

# ---- Blood FX: 9 effects, one per row, in 110x93 cells ----
CW, CH, ROWS = 110, 93, 9
sheet = read_png(os.path.join(SRC, 'VFX Blood Batch 1_SpriteSheetRows.png'))
# tint the flat red towards HELLBOUND's darker blood: opaque parts deep crimson, soft parts darker
def tint(c):
    if c is None:
        return None
    r, g, b, a = c
    if a > 200:
        return (178, 14, 30, 255)
    return (110, 6, 18, max(a, 90))
fx = Img(sheet.w, sheet.h)
for y in range(sheet.h):
    for x in range(sheet.w):
        fx.p[y][x] = tint(sheet.p[y][x])
# highlight: a lighter pixel on the top edge of each opaque blob
for y in range(1, fx.h):
    for x in range(fx.w):
        c = fx.p[y][x]
        if c and c[3] == 255 and fx.p[y - 1][x] is None:
            fx.p[y][x] = (226, 52, 52, 255)
fx.save(os.path.join(ROOT, 'assets', 'fx', 'blood_fx.png'))

table = []
for r in range(ROWS):
    frames = []
    for f in range(sheet.w // CW):
        pts = [(x - f * CW, y - r * CH) for y in range(r * CH, (r + 1) * CH) for x in range(f * CW, (f + 1) * CW) if sheet.p[y][x]]
        if pts:
            frames.append((f, pts))
    first_f, pts = frames[0]
    # origin = where the blood starts: centre of the first frame's blob
    ox = round(sum(p[0] for p in pts) / len(pts))
    oy = round(sum(p[1] for p in pts) / len(pts))
    allpts = [p for _, ps in frames for p in ps]
    w = max(p[0] for p in allpts) - min(p[0] for p in allpts) + 1
    h = max(p[1] for p in allpts) - min(p[1] for p in allpts) + 1
    table.append({'row': r, 'from': first_f, 'n': len(frames), 'ox': ox, 'oy': oy, 'w': w, 'h': h})
print('BLOOD_FX =', json.dumps(table))

# ---- Rat: 32x32 frames; strips of 6 (hurt has 1) ----
rows = [('idle', 'rat-idle-outline.png'), ('walk', 'rat-run-outline.png'), ('attack', 'rat-attack-outline.png'),
        ('hurt', 'rat-hurt-outline.png'), ('death', 'rat-death-outline.png')]
rat = Img(32 * 6, 32 * len(rows))
for ri, (_, fn) in enumerate(rows):
    strip = read_png(os.path.join(SRC, 'OutlinedRat', fn))
    rat.blit(strip, 0, ri * 32)
rat.save(os.path.join(ROOT, 'assets', 'sprites', 'enemies', 'rat_sheet.png'))
idle = read_png(os.path.join(SRC, 'OutlinedRat', 'rat-idle-outline.png'))
pts = [(x, y) for y in range(32) for x in range(32) if idle.p[y][x]]
print('RAT idle frame0 bbox x', min(p[0] for p in pts), max(p[0] for p in pts), 'y', min(p[1] for p in pts), max(p[1] for p in pts))
print('done')
