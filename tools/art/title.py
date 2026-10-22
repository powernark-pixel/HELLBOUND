"""Title-screen painting, 640x360 at the game's native pixel size:
a blood moon behind a ruined cathedral, a field of crosses, a kneeling knight."""
import math, random
from pix import Img, rgb, ramp_pick, bayer, tile_noise, poly, line, ellipse
from palette import C

W, H = 640, 360
SIL = rgb('#0b0508')
RIM = rgb('#3a0d12')
RIM2 = rgb('#6b1a18')

def cathedral_mask():
    m = Img(W, H)
    def P(pts):
        poly(m, pts, SIL)
    # nave + roof
    P([(222, 178), (320, 102), (418, 178), (418, 300), (222, 300)])
    # left tower with a complete spire
    P([(166, 76), (224, 76), (224, 300), (166, 300)])
    P([(166, 78), (195, 14), (224, 78)])
    for x in (166, 222):
        P([(x - 4, 80), (x + 1, 50), (x + 6, 80)])
    # right tower, spire snapped off in a jagged break
    P([(416, 92), (474, 92), (474, 300), (416, 300)])
    P([(416, 94), (430, 64), (437, 70), (444, 52), (451, 66), (459, 60), (474, 94)])
    # side aisles
    P([(112, 222), (166, 200), (166, 300), (112, 300)])
    P([(474, 200), (528, 222), (528, 300), (474, 300)])
    # flying buttresses + pinnacles
    for (x0, x1, s) in ((130, 166, 1), (510, 474, -1)):
        for t in range(0, 37):
            a = t / 36
            x = x0 + (x1 - x0) * a
            y = 214 - math.sin(a * math.pi * 0.5) * 36
            for k in range(4):
                m.set(x, y + k, SIL)
        P([(x0 - 6, 214), (x0, 168), (x0 + 6, 214)])
        P([(x0 - 6, 300), (x0 - 6, 214), (x0 + 6, 214), (x0 + 6, 300)])
    # broken wall at the far left, ruin on the right
    P([(60, 300), (60, 250), (70, 238), (78, 252), (88, 240), (96, 262), (112, 262), (112, 300)])
    P([(528, 300), (528, 246), (542, 258), (556, 236), (566, 256), (584, 270), (584, 300)])
    return m

def in_mask(m, x, y):
    c = m.get(x, y)
    return c is not None

def title_bg():
    im = Img(W, H)
    r = random.Random(13)
    sky = [rgb(h) for h in ('#060208', '#0f040a', '#1c060c', '#2e080e', '#470c12', '#5e1215')]
    for y in range(H):
        v = min(1, (y / 290) ** 1.3)
        for x in range(W):
            im.set(x, y, ramp_pick(sky, v, x, y))
    # blood moon
    mx, my, mr = 320, 132, 80
    moon = [rgb(h) for h in ('#4a0c10', '#6e1416', '#93201c', '#b8352a', '#d65a3a')]
    nz = tile_noise(5, 64, 8)
    for y in range(my - mr - 30, my + mr + 30):
        for x in range(mx - mr - 30, mx + mr + 30):
            d = math.hypot(x - mx, y - my)
            if d <= mr:
                v = 0.85 - (d / mr) ** 2 * 0.45 - (nz(x, y) > 0.68) * 0.25 + (x - mx) * -0.0015
                im.set(x, y, ramp_pick(moon, v, x, y))
            elif d <= mr + 28:
                a = (1 - (d - mr) / 28) ** 2
                if bayer(x, y) < a * 0.6:
                    im.set(x, y, moon[1] if a > 0.5 else moon[0])
    # cloud streaks across the moon
    cn = tile_noise(8, 128, 16)
    for y in range(40, 230):
        band = math.sin(y * 0.11) * 0.5 + 0.5
        for x in range(W):
            if cn(x * 0.5, y * 2) * band > 0.55 and bayer(x, y) < 0.7:
                im.set(x, y, rgb('#16050a'))
    # cathedral silhouette with moon-side rim light
    m = cathedral_mask()
    for y in range(H):
        for x in range(W):
            if in_mask(m, x, y):
                towards = (1 if x < mx else -1, -1)
                rim = not in_mask(m, x + towards[0], y + towards[1])
                im.set(x, y, RIM if rim else SIL)
    # rose window
    cx, cy, rr = 320, 196, 22
    fire = [C['R'], C['C'], C['c'], C['e'], C['E']]
    for y in range(cy - rr - 2, cy + rr + 3):
        for x in range(cx - rr - 2, cx + rr + 3):
            d = math.hypot(x - cx, y - cy)
            a = math.atan2(y - cy, x - cx)
            if d <= rr + 2 and d > rr:
                im.set(x, y, RIM2)
            elif d <= rr:
                spoke = abs(math.sin(a * 6)) < 0.12 and d > 4
                ring = abs(d - 12) < 0.8 or d < 3
                petal = abs(math.sin(a * 12)) < 0.1 and d > 12
                if spoke or ring or petal:
                    im.set(x, y, SIL)
                else:
                    im.set(x, y, ramp_pick(fire, 0.9 - d / rr * 0.6, x, y))
    # lancet windows and the great door
    def lancet(x0, x1, y0, y1, lvl):
        w = (x1 - x0) / 2
        for y in range(y0, y1):
            for x in range(x0, x1):
                if y - y0 < w * 1.4:
                    if math.hypot(x - (x0 if x >= (x0 + x1) / 2 else x1), y - (y0 + w * 1.4)) > w * 2:
                        continue
                if (x + y) % 7 == 0:
                    continue
                im.set(x, y, ramp_pick(fire, lvl - (y - y0) / (y1 - y0) * 0.3, x, y))
    for (x0, y0, y1) in ((186, 110, 150), (436, 120, 158), (246, 220, 262), (382, 220, 262), (130, 240, 270), (500, 240, 270)):
        lancet(x0, x0 + 10, y0, y1, 0.55)
    lancet(300, 341, 246, 300, 0.75)
    # foreground: rubble field and crosses
    gn = tile_noise(21, 640, 16)
    for x in range(W):
        top = 302 + int(gn(x, 7) * 14)
        for y in range(top, H):
            im.set(x, y, SIL if y > top else RIM)
    def cross(x, y, h, lean):
        for k in range(h):
            xx = x + lean * k / h
            for t in range(3):
                im.set(xx + t, y - k, SIL)
            im.set(xx + 3, y - k, RIM)
        bx = x + lean * 0.7
        by = y - int(h * 0.7)
        for t in range(-h // 3, h // 3 + 3):
            im.set(bx + t, by, SIL); im.set(bx + t, by + 1, SIL); im.set(bx + t, by - 1, RIM)
    for (x, y, h, l) in ((40, 330, 46, -6), (96, 322, 34, 4), (170, 334, 54, 3), (236, 326, 30, -5),
                         (420, 328, 32, 6), (488, 336, 58, -4), (560, 324, 38, 5), (612, 332, 44, -3)):
        cross(x, y, h, l)
    # the kneeling knight seen from behind, head bowed before the burning door, sword planted
    kn = Img(W, H)
    cx, top, bot = 318, 279, 340
    ellipse(kn, cx, top + 8, 5, 6, [SIL])                                   # bowed great helm
    for i, dx in enumerate((-4, -1, 2, 5)):                                 # crown of iron tines
        line(kn, cx + dx - 1, top + 2, cx + dx - 1, top - 1 - (i % 2), C['G'])
    ellipse(kn, cx, top + 17, 13, 5, [SIL])                                 # pauldrons
    r = random.Random(4)
    cape = [(cx - 12, top + 17), (cx + 12, top + 17), (cx + 17, bot)]
    for x in range(cx + 17, cx - 18, -3):                                   # tattered hem
        cape.append((x, bot - r.randint(0, 4)))
    cape.append((cx - 17, bot))
    poly(kn, cape, SIL)
    for y in range(top - 6, bot + 1):                                       # planted sword
        kn.set(cx + 20, y, rgb('#8a8494') if y < top + 8 else SIL)
        kn.set(cx + 21, y, SIL)
    for t in range(-4, 5):
        kn.set(cx + 20 + t, top + 1, C['Y'])
    kn.set(cx + 20, top - 7, C['y'])
    ellipse(kn, cx + 18, top + 4, 2.5, 2, [SIL])                            # hands on the hilt
    line(kn, cx + 9, top + 16, cx + 17, top + 5, SIL)
    line(kn, cx + 10, top + 17, cx + 18, top + 6, SIL)
    # rim light from the door glow, worked out from a snapshot so it never spreads
    snap = kn.copy()
    for y in range(H):
        for x in range(cx - 22, cx + 26):
            if snap.get(x, y) == SIL and snap.get(x, y - 1) is None and y < bot - 3:
                kn.set(x, y, RIM2)
            if snap.get(x, y) == SIL and (snap.get(x - 1, y) is None or snap.get(x + 1, y) is None) and y < top + 24:
                kn.set(x, y, RIM)
    knight_layer = kn
    # low fog and embers
    for y in range(282, 322):
        a = 1 - abs(y - 302) / 20
        for x in range(W):
            if bayer(x, y) < a * 0.22 * (0.6 + 0.4 * math.sin(x * 0.03 + y * 0.2)):
                im.set(x, y, rgb('#3a0c12'))
    im.blit(knight_layer, 0, 0)   # the knight stands in front of the fog
    r = random.Random(13)
    for _ in range(140):
        x, y = r.randint(0, W - 1), r.randint(150, H - 1)
        im.set(x, y, r.choice((C['e'], C['E'], C['a'])))
    return im
