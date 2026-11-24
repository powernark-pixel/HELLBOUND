"""Imports licensed third-party art into assets/ (see CREDITS.md).

  py tools/art/import_thirdparty.py "<folder with the downloaded files>"

- Blood FX by jasontomlee (https://jasontomlee.itch.io/blood-fx), Batch 1:
  'VFX Blood Batch 1_SpriteSheetRows.png' -> assets/fx/blood_fx.png (+ prints the frame table for index.html)
- Blood Flask (from Momentary Unicorn's Potion 1) and wall torches (Dungeon Tileset II Extended by Niji, CC0)
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

# ---- Momentary Unicorn's item art (credit "Momentary Unicorn"): 32x32 swords, axes, armour, shields, potions ----
# -> assets/items/mu_items.png, one row of 32x32 cells: Sword 1-7, Axe 1-8, Armor 1-4, Shield 1-5, Potion 1-4
MU = [('Sword', 7), ('Axe', 8), ('Armor', 4), ('Shield', 5), ('Potion', 4)]
if os.path.exists(os.path.join(SRC, 'Sword 1.png')):
    cells = [read_png(os.path.join(SRC, f'{n} {i}.png')) for n, c in MU for i in range(1, c + 1)]
    sheet = Img(32 * len(cells), 32)
    for i, c in enumerate(cells):
        sheet.blit(c, i * 32, 0)
    sheet.save(os.path.join(ROOT, 'assets', 'items', 'mu_items.png'))
    print('MU items:', len(cells), 'cells')

# ---- Blood Flask: Momentary Unicorn's grey 'Potion 1' recoloured to blood -> assets/items/blood_flask.png ----
if os.path.exists(os.path.join(SRC, 'Potion 1.png')):
    pot = read_png(os.path.join(SRC, 'Potion 1.png'))
    RED = [(40, 4, 10), (92, 10, 22), (150, 20, 32), (204, 44, 48), (240, 110, 96), (255, 214, 190)]
    out = Img(32, 32)
    for y in range(32):
        for x in range(32):
            c = pot.p[y][x]
            if not c or c[3] == 0:
                continue
            r, g, b, a = c
            v = (r + g + b) / 765
            # the glass neck and cork (top third) stay grey-brown; the body turns to blood
            if y < 13 and x < 21:
                out.p[y][x] = (int(r * 0.75), int(g * 0.62), int(b * 0.55), a)
            else:
                out.p[y][x] = RED[min(5, int(v * 6))] + (a,)
    out.save(os.path.join(ROOT, 'assets', 'items', 'blood_flask.png'))
    print('blood flask done')

# ---- Wall torch from Dungeon Tileset II Extended by Niji (CC0; based on 0x72's Dungeon Tileset II) ----
# 8 animation frames of 16x24 -> assets/props/wall_torch.png (128x24)
DT = os.path.join(SRC, 'dungeontiles-extended v1.1', 'dungeontileset-extended.png')
if os.path.exists(DT):
    dts = read_png(DT)
    torch = Img(16 * 8, 24)
    for f in range(8):
        for y in range(24):
            for x in range(16):
                torch.p[y][f * 16 + x] = dts.p[352 + y][128 + f * 16 + x]
    torch.save(os.path.join(ROOT, 'assets', 'props', 'wall_torch.png'))
    print('wall torch done')
