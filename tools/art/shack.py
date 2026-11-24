"""The Shack: the knight's first hideout. Worn plank floors, timber walls, a stone hearth,
a straw bed, an iron-bound stash, a rug and a trapdoor down. Tiles are 32x32; the hearth is 64x64."""
import math, random
from pix import Img, rgb, ramp_pick, bayer, tile_noise, line, ellipse, poly
from palette import C, RAMP

WOOD = [rgb(h) for h in ('#1a0f09', '#2a180d', '#3d2413', '#52321a', '#6b4423', '#86582e')]
ST = RAMP['stone']

def planks(seed, horizontal=True):
    """Worn floorboards with gaps, grain, knots and nails."""
    im = Img(32, 32)
    r = random.Random(seed)
    nz = tile_noise(seed, 32, 8)
    for b in range(4):                      # four boards, 8px each
        base = r.uniform(2.0, 3.3)
        joint = r.randint(4, 27)            # where this board meets the next one along
        for a in range(b * 8, b * 8 + 8):
            for l in range(32):
                x, y = (l, a) if horizontal else (a, l)
                if a == b * 8 + 7:
                    c = WOOD[0]                                   # gap between boards
                elif l == joint:
                    c = WOOD[0] if a % 2 else WOOD[1]             # end joint
                else:
                    grain = math.sin(l * 0.55 + b * 2 + (a - b * 8) * 1.7) * 0.35
                    v = base + grain + (nz(x, y) - 0.5) * 0.9 + (0.6 if a == b * 8 else 0) - (0.5 if a == b * 8 + 6 else 0)
                    c = ramp_pick(WOOD, max(0, min(5.4, v)) / 5.5, x, y)
                im.set(x, y, c)
        for nl in (joint - 2, joint + 2):     # nails either side of the joint
            if 0 < nl < 31:
                x, y = (nl, b * 8 + 3) if horizontal else (b * 8 + 3, nl)
                im.set(x, y, rgb('#8a8494'))
        kx, ky = r.randint(3, 28), b * 8 + r.randint(2, 5)
        if horizontal:
            im.set(kx, ky, WOOD[1]); im.set(kx + 1, ky, WOOD[0])
    return im

def wood_wall_face(window=False):
    """Vertical timber planks under a heavy beam, darker towards the floor."""
    im = Img(32, 32)
    nz = tile_noise(77, 32, 8)
    for y in range(32):
        for x in range(32):
            if y < 5:                                             # top beam
                v = 4.6 if y == 0 else (3.8 if y < 3 else 2.2)
                if y == 4:
                    v = 0.6
                c = ramp_pick(WOOD, v / 5.5, x, y)
            else:
                b = x // 6
                if x % 6 == 5:
                    c = WOOD[0]
                else:
                    v = 2.3 + ((b * 37) % 5) * 0.18 + (nz(x, y) - 0.5) * 0.8 + math.sin(y * 0.7 + b) * 0.2 - (y - 5) * 0.03
                    if x % 6 == 0:
                        v += 0.6
                    c = ramp_pick(WOOD, max(0, v) / 5.5, x, y)
            im.set(x, y, c)
    for x in range(32):                       # grime at the foot of the wall
        for y in range(28, 32):
            if bayer(x, y) < (y - 27) / 5:
                im.set(x, y, WOOD[0])
    for x in (2, 14, 26):
        im.set(x, 2, rgb('#8a8494'))
    if window:                                # a small window with cold moonlight
        for y in range(9, 22):
            for x in range(10, 22):
                edge = x in (10, 21) or y in (9, 21)
                if edge:
                    im.set(x, y, WOOD[1])
                elif x == 15 or x == 16 or y == 15:
                    im.set(x, y, WOOD[0])
                else:
                    v = 0.65 - (y - 10) * 0.035 + (0.15 if x < 15 else 0)
                    im.set(x, y, ramp_pick([rgb('#1a2238'), rgb('#2c3a5c'), rgb('#4f6a94'), rgb('#9fb6d6')], v, x, y))
        for x in range(9, 23):
            im.set(x, 22, WOOD[4]); im.set(x, 23, WOOD[1])
    return im

def wood_wall_top():
    """Roof beams and shadow above the walls."""
    im = Img(32, 32)
    for y in range(32):
        for x in range(32):
            v = 0.5 + (0.8 if x % 16 in (6, 7, 8) else 0) + (tile_noise(78, 32, 8)(x, y) - 0.5) * 0.6
            im.set(x, y, ramp_pick(WOOD[:4], max(0, v) / 3.5, x, y))
    return im

def trapdoor():
    """A heavy wooden hatch set into the floor, iron bands and a ring pull, a red glow at the seams."""
    im = planks(91)
    for y in range(4, 28):
        for x in range(5, 27):
            if x in (5, 26) or y in (4, 27):
                im.set(x, y, WOOD[0])
            else:
                v = 3.2 - (0.6 if (x - 5) % 7 == 6 else 0) + (0.4 if y < 8 else 0)
                im.set(x, y, ramp_pick(WOOD, v / 5.5, x, y))
    for y in (9, 22):                          # iron bands with rivets
        for x in range(6, 26):
            im.set(x, y, C['3']); im.set(x, y + 1, C['2'])
        for x in (8, 15, 23):
            im.set(x, y, C['5'])
    ellipse(im, 16, 16, 3.5, 3, [C['2'], C['4'], C['5']], dither=False)   # ring pull
    ellipse(im, 16, 16, 2, 1.6, [WOOD[1]], dither=False)
    for x in range(6, 26, 2):                  # hellish light leaking through the gap
        im.set(x, 27, C['C'] if x % 4 else C['e'])
    return im

def stash():
    """An iron-bound strongbox with a gold lock: your stash."""
    im = Img(32, 32)
    for y in range(10, 28):
        for x in range(4, 28):
            v = 0.55 - (y - 10) * 0.015 + (0.15 if y < 14 else 0)
            im.set(x, y, ramp_pick(RAMP['iron'], v, x, y))
    for y in range(10, 28):
        for x in (4, 5, 26, 27, 15, 16):
            im.set(x, y, C['2'])
    for x in range(4, 28):
        im.set(x, 14, C['K']); im.set(x, 10, C['5'])
    for (x, y) in ((6, 12), (25, 12), (6, 25), (25, 25), (6, 18), (25, 18)):
        im.set(x, y, C['Y'])
    for y in range(15, 21):                     # gold lock plate
        for x in range(13, 19):
            im.set(x, y, C['Y'] if (x + y) % 3 else C['y'])
    im.set(15, 17, C['K']); im.set(16, 17, C['K']); im.set(15, 18, C['K'])
    im.outline(C['K'])
    return im

def bed():
    """A straw bed with a grey wool blanket and a pillow."""
    im = Img(32, 32)
    for y in range(4, 30):                      # frame
        for x in range(6, 26):
            im.set(x, y, WOOD[2] if x in (6, 25) or y in (4, 29) else WOOD[3])
    for y in range(6, 28):                      # straw mattress
        for x in range(8, 24):
            im.set(x, y, ramp_pick([rgb('#6a5428'), rgb('#8c7038'), rgb('#b0904a')], 0.5 + math.sin(x * 1.3 + y * 0.7) * 0.25, x, y))
    for y in range(7, 12):                      # pillow
        for x in range(10, 22):
            im.set(x, y, ramp_pick([rgb('#8a8478'), rgb('#b8b0a0'), rgb('#d8d0c0')], 0.6 - (y - 7) * 0.08, x, y))
    for y in range(14, 28):                     # wool blanket
        for x in range(8, 24):
            v = 0.45 + (0.15 if y == 14 else 0) - (0.1 if x > 20 else 0) + (0.08 if (x + y) % 4 == 0 else 0)
            im.set(x, y, ramp_pick([rgb('#2a2630'), rgb('#3e3846'), rgb('#56505e'), rgb('#6e6876')], v, x, y))
    for x in range(8, 24):
        im.set(x, 20, C['R'])                   # a red stripe
    im.outline(C['K'])
    return im

def rug():
    """A threadbare crimson rug with a gold border."""
    im = Img(32, 32)
    nz = tile_noise(81, 32, 8)
    for y in range(2, 30):
        for x in range(1, 31):
            e = min(x - 1, 30 - x, y - 2, 29 - y)
            if e == 0:
                c = C['G'] if (x + y) % 3 else None
            elif e == 2:
                c = C['Y']
            else:
                v = 0.4 + (nz(x, y) - 0.5) * 0.4 + (0.2 if (x // 4 + y // 4) % 2 else 0)
                c = ramp_pick([C['r'], C['R'], C['C']], v, x, y)
            if c:
                im.set(x, y, c)
    for (x, y) in ((15, 15), (16, 15), (15, 16), (16, 16)):
        im.set(x, y, C['Y'])
    return im

def hearth():
    """A stone hearth, 64x64. The fire itself is drawn live in the game (animated)."""
    im = Img(64, 64)
    for y in range(6, 60):                      # chimney and stone surround
        for x in range(6, 58):
            inner = 16 <= x <= 47 and 26 <= y <= 55
            if inner:
                continue
            brick = ((x + (4 if (y // 6) % 2 else 0)) // 8, y // 6)
            mortar = (y % 6 == 5) or ((x + (4 if (y // 6) % 2 else 0)) % 8 == 7)
            v = 0.15 if mortar else 0.45 + ((brick[0] * 7 + brick[1] * 3) % 5) * 0.06 - (0.15 if x > 50 else 0) + (0.12 if x < 12 else 0)
            im.set(x, y, ramp_pick(ST, v, x, y))
    for y in range(26, 56):                     # sooty firebox
        for x in range(16, 48):
            v = 0.08 + (y - 26) * 0.004
            im.set(x, y, ramp_pick([rgb('#050304'), rgb('#120a08'), rgb('#241008')], v * 4, x, y))
    for x in range(4, 60):                      # mantel shelf
        for y in range(20, 25):
            im.set(x, y, ramp_pick(WOOD, (4.4 if y == 20 else 3.0 - (y - 20) * 0.3) / 5.5, x, y))
    for y in range(54, 60):                     # hearth stone
        for x in range(10, 54):
            im.set(x, y, ramp_pick(ST, 0.75 if y == 54 else 0.5, x, y))
    for (x0, h) in ((12, 9), (48, 7)):           # candles and a skull on the mantel
        for y in range(19 - h, 19):
            im.set(x0, y, C['O']); im.set(x0 + 1, y, C['B'])
    sk = ["..KKK..", ".KOooK.", "KOOoOBK", "KKnKnKK", ".KBoBK.", "..KKK.."]
    from palette import PAL
    im.grid(sk, PAL, 28, 13)
    for x in range(22, 42, 3):                  # logs in the firebox
        line(im, x, 52, x + 4, 49, WOOD[3]); line(im, x, 53, x + 4, 50, WOOD[1])
    im.outline(C['K'])
    return im

def engine():
    """The Stardust Engine, 48x64: a brass-and-iron machine on a stone plinth. Stardust goes in the
    funnel on top, swirls in the glass chamber (the glow and motes are animated in the game) and
    empowers the knight's weapon. The front gauge shows how hard it's working."""
    im = Img(48, 64)
    BR = [rgb(h) for h in ('#2a1a08', '#5a3a10', '#8a5e1c', '#b8862e', '#e0bf68', '#fff1c2')]   # brass
    IR = [rgb(h) for h in ('#0c0a10', '#1c1820', '#2e2934', '#443e4a', '#5d5662')]               # iron
    GL = [rgb(h) for h in ('#06081a', '#0e1430', '#1a2450', '#2c3c78')]                          # dark glass
    CU = [rgb(h) for h in ('#3a160a', '#6e2e12', '#a8501e', '#d87a3a')]                          # copper
    # stone plinth with a lit top edge
    for y in range(48, 64):
        for x in range(4, 44):
            v = 0.85 if y == 48 else 0.55 - (y - 48) * 0.02 - (0.15 if x > 38 else 0) + (0.1 if x < 8 else 0)
            if y in (55, 56) and 6 < x < 42:
                v -= 0.25                                   # a carved groove
            im.set(x, y, ramp_pick(ST, max(0.05, v), x, y))
    # iron legs of the frame
    for x0 in (8, 36):
        for y in range(16, 49):
            for x in range(x0, x0 + 4):
                im.set(x, y, IR[3 if x == x0 else 4 if x == x0 + 1 else 2])
        for y in (22, 34, 44):                              # rivets
            im.set(x0 + 1, y, BR[4])
    # the glass chamber: a cylinder with a curved highlight
    for y in range(18, 47):
        for x in range(12, 36):
            u = (x - 12) / 23
            v = 0.25 + 0.5 * math.sin(u * math.pi) - (y - 18) * 0.004
            im.set(x, y, ramp_pick(GL, max(0, min(0.99, v)), x, y))
        im.set(15, y, GL[3]); im.set(16, y, rgb('#8fa8ff') if y % 3 else GL[3])   # glass glint
        im.set(33, y, GL[0])
    for y0 in (18, 31, 46):                                  # brass bands around the glass
        for x in range(11, 37):
            im.set(x, y0, BR[4] if y0 != 46 else BR[3]); im.set(x, y0 + 1, BR[2])
    # brass dome cap and the funnel (hopper) on top
    for y in range(8, 18):
        half = int(13 * math.sqrt(max(0, 1 - ((y - 18) / 10) ** 2)))
        for x in range(24 - half, 24 + half):
            u = (x - (24 - half)) / max(1, 2 * half - 1)
            im.set(x, y, ramp_pick(BR, 0.3 + 0.55 * math.sin(u * math.pi) - (0.15 if y > 15 else 0), x, y))
    for y in range(0, 9):                                    # funnel: wide at the top, narrow at the dome
        half = 10 - y
        for x in range(24 - half, 24 + half):
            im.set(x, y, IR[3] if y == 0 else IR[2] if x < 24 else IR[1])
        im.set(24 - half, y, IR[4])
    for x in range(14, 34):
        im.set(x, 0, BR[4])                                   # brass lip of the funnel
    # copper pipe: from the dome's side, down, into the plinth
    for y in range(12, 50):
        x = 41 if y > 16 else 37 + (y - 12)
        for dx in range(3):
            im.set(x + dx, y, CU[3 - dx] if dx < 3 else CU[0])
    for y in (24, 40):
        for dx in range(-1, 4):
            im.set(41 + dx, y, BR[3])                         # pipe collars
    # the gauge on the plinth: brass ring, pale face, red needle
    for a in range(0, 360, 6):
        r = math.radians(a)
        im.set(24 + 5 * math.cos(r), 57 + 4 * math.sin(r), BR[4] if a < 180 else BR[2])
    for y in range(54, 61):
        for x in range(20, 29):
            if (x - 24) ** 2 / 16 + (y - 57) ** 2 / 9 < 1:
                im.set(x, y, rgb('#e8dcc0'))
    line(im, 24, 57, 27, 55, rgb('#c4302c'))
    im.set(24, 57, IR[0])
    # a lever on the left
    line(im, 5, 30, 8, 40, IR[4]); im.set(4, 29, rgb('#c4302c')); im.set(5, 29, rgb('#c4302c')); im.set(4, 30, rgb('#8f1a1f'))
    im.outline(C['K'])
    return im
