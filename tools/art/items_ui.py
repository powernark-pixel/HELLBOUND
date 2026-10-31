"""Item icons (16x16, order = SLOTS in index.html), combat effects (16x16), and UI frames."""
import math, random
from pix import Img, rgb, ramp_pick, bayer, line, ellipse, tile_noise
from palette import PAL, C, RAMP

def sym(half):
    return [r.ljust(8, '.') + r.ljust(8, '.')[::-1] for r in half]

HELM = sym(["........", "....y..y", "...KYKKY", "..K34556", "..K34567", "..K34566", "..KKKKKK", "..K34Kee",
            "..K34KKK", "..K3455K", "..K345KK", "..K3455K", "...K3455", "....KK22", "......KK", "........"])
SWORD = ["..............KW", ".............KWw", "............KWwb", "...........KWwbK", "..........KWwbK.",
         ".........KWwbK..", "........KWwbK...", ".......KWwbK....", "..KK..KWcbK.....", "..KYKKWwbK......",
         "...KYYwbK.......", "....KYYK........", "...KYrKYK.......", "..KYrK.KYK......", ".KyrK...KK......",
         ".KKK............"]
PLATE = sym(["........", ".KKKK...", "K5665KKK", "K4556655", ".K455665", ".K34556Y", ".K3455Yy", ".K34556Y",
             ".K34556Y", ".KgGYYYY", ".K234455", "..K23445", "..K12334", "...KKKKK", "........", "........"])
GLOVES = ["................", ".....KK.KK......", "....K56K56KK....", "....K45K45K5K...", "...KK45K45K45K..",
          "..K5K45545545K..", "..K4545555554K..", "..K4455555554K..", "...K345555543K..", "....K3455543K...",
          "....KYGYYGYK....", "....K345543K....", "....K234432K....", "....K233332K....", "....KKKKKKKK....",
          "................"]
GREAVES = sym(["........", "..KKKK..", ".K5665K.", ".K4556K.", ".KYGGYK.", ".K4556K.", ".K3455K.", ".K5YY5K.",
               ".K3455K.", ".K3445K.", ".K2344K.", ".K2334K.", ".K1223K.", ".KKKKKK.", "........", "........"])
BOOTS = sym(["........", "........", "........", "........", "..KKKK..", ".K5665K.", ".K4556K.", ".KGYYGK.",
             ".K4556K.", ".K3455KK", ".K34556K", ".K23455K", ".KKKKKKK", "........", "........", "........"])
RING = sym(["........", "........", "........", "......KK", ".....KpC", "....KYcR", "...KYYKK", "..KYGK..",
            "..KYK...", ".KYGK...", ".KYGK...", "..KYK...", "..KYGK..", "...KGGKK", "....KKKK", "........"])
AMULET = sym(["..K.....", "...K....", "....K...", ".....K..", "......KK", ".....KYy", "....KYGY", "...KYGKp",
              "...KYGKC", "...KYGGK", "....KYGY", ".....KYG", "......KY", ".......K", "........", "........"])
ICONS = [HELM, SWORD, PLATE, GLOVES, GREAVES, BOOTS, RING, AMULET]  # helm blade plate gloves greaves boots ring sigil

def item_icons():
    sheet = Img(16 * len(ICONS), 16)
    for i, g in enumerate(ICONS):
        im = Img(16, 16)
        im.grid(g, PAL)
        sheet.blit(im, i * 16, 0)
    return sheet

def effects():
    """cell 0 glow orb, 1 spark, 2-5 blood splats, 6 ember, 7 ash."""
    sh = Img(16 * 8, 16)
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 7.5) / 8
            if d < 1:
                a = (1 - d) ** 1.6
                a = round(a * 5) / 5
                if a > 0:
                    sh.set(x, y, (255, 255, 255, int(255 * a)))
    for k in range(-5, 6):
        a = 255 if abs(k) < 2 else 150
        sh.set(16 + 7 + k, 7, (255, 255, 255, a)); sh.set(16 + 7, 7 + k, (255, 255, 255, a))
    for i in range(4):
        r = random.Random(40 + i)
        ox = 32 + i * 16
        for _ in range(9 + i * 2):
            a = r.uniform(0, math.tau)
            d = r.uniform(0, 6)
            x, y = 7.5 + math.cos(a) * d, 7.5 + math.sin(a) * d * 0.7
            sz = r.choice((1, 1, 2))
            for yy in range(sz):
                for xx in range(sz):
                    sh.set(ox + x + xx, y + yy, C['C'] if d < 3 else C['R'])
        sh.set(ox + 7, 7, C['c']); sh.set(ox + 8, 7, C['C']); sh.set(ox + 7, 8, C['R'])
    for (x, y, c) in ((7, 7, 'f'), (8, 7, 'E'), (7, 8, 'E'), (8, 8, 'e'), (6, 7, 'e'), (7, 6, 'e')):
        sh.set(96 + x, y, C[c])
    for (x, y) in ((7, 7), (8, 7), (8, 8)):
        sh.set(112 + x, y, rgb('#6b5f62'))
    return sh

# ------------------------------------------------------------------ UI frames (used as CSS border-image)
IRON = RAMP['iron']

def bevel_frame(w, h, border, fill_fn, gold=True, corners=True):
    im = Img(w, h)
    for y in range(h):
        for x in range(w):
            e = min(x, y, w - 1 - x, h - 1 - y)
            if e == 0:
                c = C['K']
            elif e < border - 2:
                lightside = (x < y and x < w - 1 - x) or (y <= x and y < h - 1 - y)
                lvl = 3 - (e - 1) * 0.5
                c = IRON[max(1, min(5, int(lvl + (1.2 if (y < h / 2 and e == y) or (x < w / 2 and e == x) else -0.6))))]
            elif e == border - 2:
                c = (C['Y'] if (x + y) % 6 else C['y']) if gold else IRON[2]
            elif e == border - 1:
                c = C['K']
            else:
                c = fill_fn(x, y)
            im.set(x, y, c)
    if corners:
        for (cx, cy) in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
            sx = 1 if cx == 0 else -1
            sy = 1 if cy == 0 else -1
            for k in range(border - 1):
                im.set(cx + sx * k, cy + sy * 1, C['G'] if k else C['Y'])
                im.set(cx + sx * 1, cy + sy * k, C['G'] if k else C['Y'])
            im.set(cx + sx * 2, cy + sy * 2, C['y'])
            im.set(cx + sx * 3, cy + sy * 3, C['Y'])
    return im

def stone_fill(seed, base='#120b0f'):
    nz = tile_noise(seed, 32, 8)
    b = rgb(base)
    def f(x, y):
        v = nz(x, y)
        k = 6 if v > 0.62 and bayer(x, y) > 0.4 else 0
        return (b[0] + k, b[1] + k // 2, b[2] + k // 2, 252)
    return f

def ui_images():
    out = {}
    out['panel'] = bevel_frame(30, 30, 10, stone_fill(1))
    for (mx, my) in ((15, 1), (15, 28), (1, 15), (28, 15)):
        out['panel'].set(mx, my, C['y'])
    out['slot'] = bevel_frame(14, 14, 5, lambda x, y: rgb('#0a0709'), gold=False, corners=False)
    out['btn'] = bevel_frame(18, 14, 5, lambda x, y: rgb('#2a1416') if y < 7 else rgb('#1d0d10'), corners=False)
    out['btnHot'] = bevel_frame(18, 14, 5, lambda x, y: rgb('#6b1218') if y < 7 else rgb('#4a0b10'), corners=False)
    out['tip'] = bevel_frame(12, 12, 4, lambda x, y: rgb('#0c0709', 246), corners=False)
    out['barFrame'] = bevel_frame(16, 10, 4, lambda x, y: rgb('#07040a'), corners=False)
    def strip(cols):
        im = Img(2, len(cols))
        for y, c in enumerate(cols):
            im.set(0, y, rgb(c)); im.set(1, y, rgb(c))
        return im
    out['fillHp'] = strip(['#ff6a5a', '#d8302b', '#b01e22', '#8f1a1f', '#6a0e14', '#4a080d'])
    out['fillWard'] = strip(['#ffe9a8', '#e0bf68', '#c79a3a', '#a77a24', '#7a5a1c', '#5a4014'])
    out['fillXp'] = strip(['#d9b3ff', '#a46be0', '#7d45b8', '#5f308f', '#46226b', '#32174e'])
    out['fillBoss'] = strip(['#ff8a5a', '#e0402b', '#b0201e', '#7d1218', '#560a10', '#3a060a'])
    # passive-tree node frames
    def node(r, ring, fill, glow=None):
        s = r * 2 + 2
        im = Img(s, s)
        for y in range(s):
            for x in range(s):
                d = math.hypot(x + 0.5 - s / 2, y + 0.5 - s / 2)
                if d <= r - 2:
                    im.set(x, y, ramp_pick(fill, 1 - d / r + (0.25 if y < s / 2 else 0), x, y))
                elif d <= r - 1:
                    im.set(x, y, C['K'])
                elif d <= r:
                    im.set(x, y, ring[0] if (x + y) % 2 else ring[1])
                elif d <= r + 1:
                    im.set(x, y, C['K'])
        return im
    out['nodeLocked'] = node(10, (IRON[3], IRON[2]), [rgb('#0c080b'), rgb('#18121a')])
    out['nodeAvail'] = node(10, (C['Y'], C['y']), [rgb('#1c1108'), rgb('#3a2510')])
    out['nodeOn'] = node(10, (C['y'], C['Y']), [C['r'], C['R'], C['C']])
    out['nodeRoot'] = node(14, (C['y'], C['Y']), [C['r'], C['R'], C['C'], C['c']])
    # ornamental divider
    dv = Img(64, 7)
    for x in range(64):
        dv.set(x, 3, C['Y'] if 4 < x < 59 else C['G'])
        dv.set(x, 4, C['g'] if 4 < x < 59 else None)
    for (cx) in (32,):
        for k in range(4):
            dv.set(cx - k, 3 - k, C['y']); dv.set(cx + k, 3 - k, C['y'])
            dv.set(cx - k, 3 + k, C['Y']); dv.set(cx + k, 3 + k, C['Y'])
        dv.set(cx, 3, C['c'])
    out['divider'] = dv
    return out
