"""Dungeon tiles (32x32): cathedral flagstones, brick walls with religious decor, lava, stairs, chests, decor.
The order of TILE_NAMES must match TILE_NAMES in js/assets.js.
"""
import math, random
from pix import Img, rgb, ramp_pick, bayer, tile_noise, line, ellipse, capsule, poly
from palette import PAL, C, RAMP

ST = RAMP['stone']
TILE_NAMES = ['floor0', 'floor1', 'floor2', 'floorBlood', 'floorCrack',
              'wallTop', 'wallFace', 'wallCross', 'wallWindow', 'wallSconce', 'wallChains', 'wallOssuary', 'wallBlood',
              'lava0', 'lava1', 'lava2', 'stairs', 'stairsSealed', 'chestShut', 'chestOpen',
              'decoSkulls', 'decoBones', 'decoCandles', 'decoPool', 'decoPillar', 'decoCrucifix',
              'blood0', 'blood1', 'blood2', 'carpetH', 'carpetV', 'floorSigil',
              'woodFloor0', 'woodFloor1', 'woodWallFace', 'woodWallTop', 'woodWindow', 'trapdoor', 'stash', 'decoBed', 'decoRug']

LAYOUTS = [
    [(0, 0, 18, 14), (18, 0, 14, 14), (0, 14, 11, 18), (11, 14, 21, 18)],
    [(0, 0, 12, 17), (12, 0, 20, 9), (12, 9, 20, 8), (0, 17, 20, 15), (20, 17, 12, 15)],
    [(0, 0, 32, 10), (0, 10, 15, 22), (15, 10, 17, 11), (15, 21, 17, 11)],
]

def stone_px(level, x, y):
    return ramp_pick(ST, level / (len(ST) - 1), x, y)

def floor_tile(seed, layout, blood=False, crack=False):
    im = Img(32, 32)
    r = random.Random(seed)
    nz = tile_noise(seed, 32, 8)
    nz2 = tile_noise(seed + 9, 32, 4)
    for (sx, sy, sw, sh) in LAYOUTS[layout]:
        base = r.uniform(2.3, 3.6)
        for y in range(sy, sy + sh):
            for x in range(sx, sx + sw):
                if x == sx + sw - 1 or y == sy + sh - 1:
                    im.set(x, y, ST[0] if (x + y) % 3 else ST[1])
                    continue
                v = base + (nz(x, y) - 0.5) * 1.4 + (nz2(x, y) - 0.5) * 0.6
                if x == sx or y == sy:
                    v += 0.9
                if x == sx + sw - 2 or y == sy + sh - 2:
                    v -= 0.8
                im.set(x, y, stone_px(max(0.6, min(5.6, v)), x, y))
        # worn pits and chips
        for _ in range(r.randint(1, 3)):
            px, py = r.randint(sx + 2, sx + sw - 3), r.randint(sy + 2, sy + sh - 3)
            im.set(px, py, ST[1]); im.set(px + 1, py, ST[4])
    if crack or r.random() < 0.4:
        x, y = r.randint(4, 27), r.randint(4, 27)
        for _ in range(r.randint(6, 14) + (8 if crack else 0)):
            im.set(x, y, ST[0]); im.set(x + 1, y + 1, ST[4])
            x += r.choice((-1, 0, 1)); y += r.choice((0, 1, 1))
            x, y = max(1, min(30, x)), max(1, min(30, y))
    if blood:
        # dried, smeared blood that sinks into the mortar
        cx, cy = r.uniform(11, 20), r.uniform(11, 20)
        for y in range(32):
            for x in range(32):
                d = math.hypot((x - cx) / 7, (y - cy) / 4.5) + (nz2(x, y) - 0.5) * 1.1
                if d < 1:
                    if d > 0.55 and bayer(x, y) > (1 - d) * 1.6:
                        continue
                    col = C['r'] if d > 0.5 else (C['R'] if d > 0.2 else C['C'])
                    if im.get(x, y) in (ST[0], ST[1]):
                        col = C['r']
                    im.set(x, y, col)
        # drag marks and droplets
        for k in range(r.randint(6, 10)):
            im.set(cx + 6 + k, cy + k * 0.3, C['r'])
        for _ in range(7):
            im.set(r.randint(2, 29), r.randint(2, 29), C['R'])
    return im

def wall_bricks(seed):
    im = Img(32, 32)
    r = random.Random(seed)
    nz = tile_noise(seed, 32, 8)
    # ledge / cap
    for x in range(32):
        im.set(x, 0, ST[6] if x % 7 else ST[5])
        im.set(x, 1, ST[5]); im.set(x, 2, ST[4]); im.set(x, 3, ST[1])
    for course, y0 in enumerate((4, 12, 20)):
        off = 0 if course % 2 == 0 else 8
        for bx in range(-16, 32, 16):
            x0 = bx + off
            base = r.uniform(2.4, 3.6)
            for y in range(y0, y0 + 8):
                for x in range(x0, x0 + 16):
                    if not 0 <= x < 32:
                        continue
                    if y == y0 + 7 or (x - x0) == 15:
                        im.set(x, y, ST[0])
                        continue
                    v = base + (nz(x, y) - 0.5) * 1.2 - (y - 4) * 0.03
                    if y == y0:
                        v += 1
                    if y == y0 + 6:
                        v -= 0.8
                    im.set(x, y, stone_px(max(0.5, min(5.5, v)), x, y))
            if r.random() < 0.5:
                cx = x0 + r.randint(1, 13)
                if 0 <= cx < 32:
                    im.set(cx, y0 + 1, ST[1]); im.set(cx + 1, y0 + 2, ST[1])
    # grime at the foot of the wall
    for y in range(28, 32):
        for x in range(32):
            if bayer(x, y) < (y - 27) / 4.5:
                im.set(x, y, ST[0])
            elif y >= 28:
                im.set(x, y, ST[1])
    return im

def arch(im, x0, x1, ytop, ybot, col_fn):
    cx = (x0 + x1) / 2
    w = (x1 - x0) / 2
    for y in range(ytop, ybot + 1):
        for x in range(x0, x1 + 1):
            dy = y - ytop
            spring = w * 1.3
            if dy < spring:
                # pointed gothic arch from two circles
                ok = (math.hypot(x - (x0 + 0.0), y - (ytop + spring)) <= w * 2 and x >= cx) or \
                     (math.hypot(x - (x1 + 0.0), y - (ytop + spring)) <= w * 2 and x <= cx)
                if not ok:
                    continue
            im.set(x, y, col_fn(x, y))

def wall_variant(kind, seed):
    im = wall_bricks(seed)
    r = random.Random(seed)
    if kind == 'cross':
        arch(im, 9, 22, 5, 27, lambda x, y: ST[5])
        arch(im, 10, 21, 6, 27, lambda x, y: ST[0] if (x + y) % 5 else ST[1])
        for y in range(9, 26):
            im.set(15, y, C['Y']); im.set(16, y, C['G'])
        for x in range(12, 20):
            im.set(x, 13, C['Y']); im.set(x, 14, C['G'])
        im.set(15, 9, C['y']); im.set(12, 13, C['y'])
        # red cloth draped on the cross
        for y in range(14, 20):
            im.set(13, y, C['C'] if y < 18 else C['R'])
        im.set(14, 15, C['c'])
        for x in range(13, 19):
            im.set(x, 26, ST[4])
    elif kind == 'window':
        arch(im, 10, 21, 4, 26, lambda x, y: ST[5])
        def glass(x, y):
            if x in (15, 16) or y in (12, 19) or (x + y) % 9 == 0:
                return C['K']
            v = 0.45 + 0.5 * math.sin(x * 0.7 + y * 0.4)
            return ramp_pick([C['R'], C['C'], C['c'], C['e'], C['E']], v, x, y)
        arch(im, 11, 20, 5, 25, glass)
        for x in range(10, 22):
            im.set(x, 26, ST[6]); im.set(x, 27, ST[2])
    elif kind == 'sconce':
        # iron bracket + candle; the flame is animated in-game at (16, 11)
        for x in range(13, 20):
            im.set(x, 18, C['3'])
        im.set(13, 17, C['4']); im.set(19, 17, C['4']); im.set(16, 19, C['2']); im.set(16, 20, C['1'])
        for y in range(12, 18):
            im.set(15, y, C['O']); im.set(16, y, C['o'] if y < 14 else C['O']); im.set(17, y, C['B'])
        im.set(17, 15, C['o']); im.set(18, 17, C['O'])
        # soot above
        for y in range(4, 10):
            for x in range(13, 20):
                if bayer(x, y) < 0.35 * (10 - y) / 6:
                    im.set(x, y, ST[0])
    elif kind == 'chains':
        for cx in (9, 22):
            for y in range(4, 22 + (cx % 3)):
                im.set(cx, y, C['5'] if y % 2 else C['3'])
                im.set(cx + (1 if y % 2 else 0), y, C['4'] if y % 2 else C['2'])
            for k in range(-2, 3):
                im.set(cx + k, 23 + (cx % 3), C['4'])
            im.set(cx - 2, 22 + (cx % 3), C['5']); im.set(cx + 2, 22 + (cx % 3), C['5'])
    elif kind == 'ossuary':
        for x in range(4, 28):
            for y in range(13, 22):
                im.set(x, y, ST[0] if y > 13 else ST[5])
        for sx in (6, 13, 20):
            sk = ["..KKK..", ".KOooK.", "KOOoOBK", "KKnKnKK", ".KBoBK.", "..KKK.."]
            im.grid(sk, PAL, sx, 15 + (sx % 2))
        for x in range(4, 28):
            im.set(x, 22, ST[6])
    elif kind == 'blood':
        for x in range(32):
            if r.random() < 0.55:
                im.set(x, 3, C['R'])
        for _ in range(5):
            x = r.randint(2, 29)
            ln = r.randint(6, 22)
            for y in range(3, 3 + ln):
                im.set(x, y, C['C'] if y < 3 + ln - 2 else C['R'])
            im.set(x, 3 + ln, C['c'])
    return im

def wall_top(seed):
    im = Img(32, 32)
    nz = tile_noise(seed, 32, 8)
    for y in range(32):
        for x in range(32):
            v = 0.6 + nz(x, y) * 1.1
            if x % 16 == 0 or y % 16 == 0:
                v -= 0.5
            im.set(x, y, stone_px(max(0, v), x, y))
    return im

def lava_tile(frame):
    im = Img(32, 32)
    t = frame / 3 * math.tau
    tau = math.tau
    fire = [C['a'], C['e'], C['E'], C['f']]
    for y in range(32):
        for x in range(32):
            v = (math.sin(tau * (x / 32 + 2 * y / 32) + t) +
                 math.sin(tau * (2 * x / 32 - y / 32) + 1.7 - t) +
                 0.6 * math.sin(tau * (3 * x / 32 + y / 32) + 2 * t))
            v = (v + 2.6) / 5.2
            if v < 0.5:
                col = rgb('#1e0906') if v < 0.36 else rgb('#3a1209')
                if 0.45 < v:
                    col = C['a'] if bayer(x, y) > 0.5 else rgb('#3a1209')
            else:
                col = ramp_pick(fire, (v - 0.5) / 0.5 * 0.85, x, y)
            im.set(x, y, col)
    return im

def stairs_tile(sealed=False):
    im = Img(32, 32)
    for y in range(32):
        for x in range(32):
            im.set(x, y, ST[4] if (x + y) % 2 else ST[5])
    for i in range(6):
        y0 = 4 + i * 4
        dark = i / 6
        for y in range(y0, y0 + 4):
            for x in range(4 + i, 28 - i):
                lvl = 4.2 - dark * 4 - (0.8 if y == y0 + 3 else 0) + (0.7 if y == y0 else 0)
                im.set(x, y, stone_px(max(0, lvl), x, y))
    # hell-glow at the bottom
    for y in range(20, 29):
        for x in range(9, 23):
            a = (y - 20) / 9
            if bayer(x, y) < a * 0.8:
                im.set(x, y, C['C'] if a < 0.6 else C['e'])
    # gold-trimmed frame
    for k in range(32):
        for (x, y) in ((k, 0), (k, 31), (0, k), (31, k)):
            im.set(x, y, C['K'])
        for (x, y) in ((k, 1), (k, 30), (1, k), (30, k)):
            im.set(x, y, C['G'] if k % 4 else C['Y'])
    for (x, y) in ((1, 1), (30, 1), (1, 30), (30, 30)):
        im.set(x, y, C['y'])
    if sealed:
        for k in range(4, 28):
            im.set(k, k, C['c']); im.set(k + 1, k, C['C'])
            im.set(31 - k, k, C['c']); im.set(30 - k, k, C['C'])
        ellipse(im, 15.5, 15.5, 4, 4, [C['R'], C['C'], C['c'], C['p']])
    return im

def chest(open_):
    im = Img(32, 32)
    wood = RAMP['wood']
    # body
    for y in range(16, 28):
        for x in range(5, 27):
            v = 0.35 + 0.35 * ((x // 4) % 2) * 0.3 + (0.2 if y == 16 else 0) - (y - 16) * 0.02
            im.set(x, y, ramp_pick(wood, v, x, y))
    for x in range(5, 27):
        im.set(x, 21, C['3']); im.set(x, 27, C['2'])
    for y in range(16, 28):
        for x in (5, 6, 25, 26):
            im.set(x, y, C['4'] if x in (6, 25) else C['3'])
    for (x, y) in ((5, 16), (26, 16), (5, 27), (26, 27)):
        im.set(x, y, C['Y'])
    if not open_:
        # domed lid with a gold cross
        for y in range(9, 16):
            for x in range(5, 27):
                if y < 11 and (x < 7 or x > 24):
                    continue
                v = 0.6 - (y - 9) * 0.05
                im.set(x, y, ramp_pick(wood, v, x, y))
        for x in range(5, 27):
            im.set(x, 15, C['3'])
        for x in range(7, 25):
            im.set(x, 9, C['Q'])
        for y in range(10, 15):
            im.set(15, y, C['Y']); im.set(16, y, C['G'])
        for x in range(13, 19):
            im.set(x, 12, C['Y'])
        # lock
        im.set(15, 17, C['y']); im.set(16, 17, C['Y']); im.set(15, 18, C['Y']); im.set(16, 18, C['G'])
        im.set(15, 19, C['K'])
    else:
        # lid thrown back + glowing interior
        for y in range(5, 11):
            for x in range(6, 26):
                im.set(x, y, ramp_pick(wood, 0.25 + (y - 5) * 0.03, x, y))
        for x in range(6, 26):
            im.set(x, 10, C['3'])
        for y in range(11, 17):
            for x in range(7, 25):
                v = 1 - abs(x - 16) / 10 - (y - 11) * 0.06
                im.set(x, y, ramp_pick([C['T'], C['G'], C['Y'], C['y'], C['E']], v, x, y))
    im.outline(C['K'])
    return im

def decor(kind, seed):
    im = Img(32, 32)
    r = random.Random(seed)
    if kind == 'skulls':
        sk = ["..KKK..", ".KOooK.", "KOOoOBK", "KKnKnKK", ".KBoBK.", "..KKK.."]
        for (x, y) in ((7, 18), (14, 19), (21, 17), (10, 13), (17, 12)):
            im.grid(sk, PAL, x, y)
        for _ in range(4):
            x, y = r.randint(5, 24), r.randint(23, 27)
            line(im, x, y, x + 5, y - 1, C['O']); im.set(x, y, C['o']); im.set(x + 5, y - 1, C['o'])
    elif kind == 'bones':
        for _ in range(5):
            x, y = r.randint(4, 22), r.randint(6, 26)
            dx, dy = r.choice(((6, 1), (5, -2), (4, 3), (6, -1)))
            line(im, x, y, x + dx, y + dy, C['O'])
            for (bx, by) in ((x, y), (x + dx, y + dy)):
                im.set(bx, by - 1, C['o']); im.set(bx, by + 1, C['B'])
        for k in range(4):
            line(im, 18, 14 + k * 2, 24, 13 + k * 2, C['B'])
        line(im, 17, 13, 17, 21, C['O'])
    elif kind == 'candles':
        # flames are animated in-game at the wick positions listed in index.html
        for (x, top, h) in ((9, 18, 8), (15, 14, 12), (21, 19, 7), (12, 21, 5)):
            for y in range(top, top + h):
                im.set(x, y, C['O']); im.set(x + 1, y, C['o'] if y < top + 2 else C['B'])
            im.set(x, top - 1, C['K'])
            im.set(x - 1, top + h - 1, C['O']); im.set(x + 2, top + h - 1, C['B'])
        for x in range(6, 26):
            if r.random() < 0.7:
                im.set(x, 26, C['O'] if x % 2 else C['B'])
    elif kind == 'pool':
        nz = tile_noise(seed, 32, 8)
        for y in range(32):
            for x in range(32):
                d = math.hypot((x - 16) / 11, (y - 17) / 7) + (nz(x, y) - 0.5) * 0.6
                if d < 1:
                    col = C['r'] if d > 0.75 else (C['R'] if d > 0.4 else C['C'])
                    im.set(x, y, col)
        im.set(12, 14, C['p']); im.set(13, 14, C['c']); im.set(20, 18, C['c'])
    elif kind == 'pillar':
        # square plinth
        for y in range(24, 29):
            for x in range(6, 27):
                im.set(x, y, stone_px(4.5 if y == 24 else (2.0 if x > 22 else 3.0), x, y))
        # fluted column shaft, snapped off in a jagged break
        for y in range(8, 24):
            for x in range(9, 24):
                flute = (x - 9) % 3 == 0
                v = 3.4 - (x - 9) * 0.16 - (0.9 if flute else 0)
                im.set(x, y, stone_px(max(0.5, v), x, y))
        for x in range(9, 24):
            h = 8 + int(4 * abs(math.sin(x * 1.3 + 0.4))) + (x % 2)
            for y in range(8, h):
                im.set(x, y, None)
            im.set(x, h, ST[6] if x < 18 else ST[5])
        # rubble beside it
        for (x, y) in ((4, 27), (5, 26), (27, 27), (28, 28), (26, 28)):
            im.set(x, y, ST[4])
        im.outline(C['K'])
    elif kind == 'crucifix':
        for x in range(3, 29):
            im.set(x, 16, C['Q']); im.set(x, 17, C['q']); im.set(x, 18, C['T'])
        for y in range(9, 26):
            im.set(9, y, C['Q']); im.set(10, y, C['q']); im.set(11, y, C['T'])
        for (x, y) in ((3, 17), (28, 17), (10, 9), (10, 25)):
            im.set(x, y, C['Y'])
        for k in range(3):
            im.set(18 + k * 3, 17, C['5'])
        im.outline(C['K'])
    return im

def blood_tile(frame):
    """A slow river of blood: dark, glossy, with drifting clots and pale highlights."""
    im = Img(32, 32)
    t = frame / 3 * math.tau
    tau = math.tau
    deep = [rgb('#1a0205'), C['r'], C['R'], C['C'], C['c']]
    for y in range(32):
        for x in range(32):
            v = (math.sin(tau * (x / 32 + y / 32) + t) * 0.6 +
                 math.sin(tau * (2 * x / 32 - y / 32) - t) * 0.5 +
                 math.sin(tau * (y / 32 * 2) + t * 2) * 0.35)
            v = (v + 1.45) / 2.9
            im.set(x, y, ramp_pick(deep, 0.15 + v * 0.62, x, y))
    # glossy ripples drifting down the river
    for k in range(3):
        y0 = (k * 11 + frame * 4) % 32
        for x in range(32):
            yy = int(y0 + 1.5 * math.sin(x * 0.4 + k))
            if (x + k) % 9 < 4:
                im.set(x, yy % 32, C['p'] if (x + k) % 9 == 1 else C['c'])
    # clots
    r = random.Random(70 + frame)
    for _ in range(4):
        x, y = r.randint(2, 29), r.randint(2, 29)
        im.set(x, y, rgb('#140104')); im.set(x + 1, y, rgb('#140104'))
    return im

def carpet(base, horizontal=True):
    """A worn crimson runner with tarnished-gold borders, laid over the flagstones."""
    im = base.copy()
    nz = tile_noise(31, 32, 8)
    for y in range(32):
        for x in range(32):
            a = y if horizontal else x
            if 6 <= a <= 25:
                if a in (6, 25):
                    c = C['K']
                elif a in (7, 24):
                    c = C['G'] if (x + y) % 4 else C['Y']
                elif a in (9, 22):
                    c = C['g']
                else:
                    v = 0.35 + (nz(x, y) - 0.5) * 0.5 + (0.12 if a < 12 else 0)
                    c = ramp_pick([C['r'], C['R'], C['C']], v, x, y)
                    b = (x if horizontal else y) % 8
                    if a in (15, 16) and b in (3, 4):
                        c = C['G']
                im.set(x, y, c)
    r = random.Random(32 if horizontal else 33)
    for _ in range(5):
        x, y = r.randint(2, 29), r.randint(10, 21)
        if not horizontal:
            x, y = y, x
        im.set(x, y, C['r'])
    return im

def sigil(base):
    """A ritual circle drawn in blood on the flagstones."""
    im = base.copy()
    cx = cy = 15.5
    for y in range(32):
        for x in range(32):
            d = math.hypot(x - cx, y - cy)
            if (12.4 < d < 13.6 or 8.6 < d < 9.4) and bayer(x, y) < 0.85:
                im.set(x, y, C['C'] if d > 11 else C['R'])
    pts = [(cx + 12.5 * math.cos(-math.pi / 2 + i * 2 * math.tau / 5),
            cy + 12.5 * math.sin(-math.pi / 2 + i * 2 * math.tau / 5)) for i in range(6)]
    for i in range(5):
        line(im, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], C['R'])
    for a in range(0, 360, 45):
        im.set(cx + 11 * math.cos(math.radians(a)), cy + 11 * math.sin(math.radians(a)), C['c'])
    im.set(15, 15, C['p']); im.set(16, 16, C['c'])
    return im

def altar():
    """The Blood Altar: a blood-soaked stone slab under a tall tarnished-gold cross. 96x80."""
    im = Img(96, 80)
    st = RAMP['stone']
    # tall gold cross behind the altar
    for y in range(2, 52):
        for x in range(44, 52):
            im.set(x, y, ramp_pick(RAMP['gold'], 0.75 - (x - 44) * 0.07 - y * 0.004, x, y))
    for y in range(12, 20):
        for x in range(28, 68):
            im.set(x, y, ramp_pick(RAMP['gold'], 0.7 - (y - 12) * 0.05, x, y))
    for (x, y) in ((47, 1), (48, 1), (27, 15), (27, 16), (68, 15), (68, 16)):
        im.set(x, y, C['y'])
    # crimson cloth draped over the arms
    poly(im, [(30, 19), (66, 19), (62, 30), (56, 24), (48, 34), (40, 24), (34, 30)], None,
         lambda x, y: ramp_pick([C['r'], C['R'], C['C'], C['c']], 0.55 - (y - 19) * 0.025 + ((x // 3) % 2) * 0.12, x, y))
    # a burning heart where the beams cross
    ellipse(im, 48, 16, 4, 3.5, [C['a'], C['e'], C['E'], C['f']], bias=0.1)
    # stone steps
    for i, (y0, x0, x1) in enumerate(((70, 6, 90), (74, 2, 94))):
        for y in range(y0, min(80, y0 + 4 + i * 2)):
            for x in range(x0, x1):
                lvl = 4.6 if y == y0 else 3.0 - (y - y0) * 0.25
                im.set(x, y, ramp_pick(st, lvl / 6, x, y))
    # the altar block
    for y in range(44, 70):
        for x in range(14, 82):
            if y < 50:
                lvl = 5.2 if y == 44 else 4.3
            else:
                lvl = 2.6 + (0.6 if x < 30 else 0) - (0.7 if x > 70 else 0) - (y - 50) * 0.03
            im.set(x, y, ramp_pick(st, max(0, lvl) / 6, x, y))
    # carved front: gothic arches with gold trim
    for k in range(5):
        ax = 20 + k * 12
        for y in range(54, 67):
            for x in range(ax, ax + 8):
                if y < 57 and abs(x - (ax + 3.5)) > (y - 53) * 1.4:
                    continue
                im.set(x, y, st[0] if (x + y) % 5 else st[1])
        for x in range(ax - 1, ax + 9):
            im.set(x, 67, C['G'])
    for x in range(14, 82):
        im.set(x, 50, C['Y'] if x % 4 else C['y']); im.set(x, 51, C['g'])
    # blood pooled on the slab and running down the front
    for x in range(22, 76):
        if (x * 7) % 11 < 8:
            im.set(x, 45, C['C']); im.set(x, 46, C['R'])
    r = random.Random(9)
    for _ in range(14):
        x = r.randint(16, 79)
        ln = r.randint(4, 20)
        for y in range(46, 46 + ln):
            im.set(x, y, C['C'] if y < 46 + ln - 2 else C['R'])
        im.set(x, 46 + ln, C['c'])
    for x in range(10, 88):
        if r.random() < 0.6:
            im.set(x, 70 + r.randint(0, 1), C['R'])
    # a golden chalice of blood
    for y in range(37, 44):
        w = 3 if y < 41 else 1
        for x in range(40 - w, 41 + w):
            im.set(x, y, C['Y'] if x < 40 else C['G'])
    for x in range(37, 44):
        im.set(x, 37, C['y']); im.set(x, 44, C['G'])
    im.set(39, 38, C['c']); im.set(40, 38, C['C'])
    im.outline(C['K'])
    return im

def tiles():
    out = {}
    out['floor0'] = floor_tile(1, 0)
    out['floor1'] = floor_tile(2, 1)
    out['floor2'] = floor_tile(3, 2)
    out['floorBlood'] = floor_tile(4, 0, blood=True)
    out['floorCrack'] = floor_tile(5, 1, crack=True)
    out['wallTop'] = wall_top(6)
    out['wallFace'] = wall_bricks(7)
    out['wallCross'] = wall_variant('cross', 8)
    out['wallWindow'] = wall_variant('window', 9)
    out['wallSconce'] = wall_variant('sconce', 10)
    out['wallChains'] = wall_variant('chains', 11)
    out['wallOssuary'] = wall_variant('ossuary', 12)
    out['wallBlood'] = wall_variant('blood', 13)
    for f in range(3):
        out[f'lava{f}'] = lava_tile(f)
    out['stairs'] = stairs_tile()
    out['stairsSealed'] = stairs_tile(True)
    out['chestShut'] = chest(False)
    out['chestOpen'] = chest(True)
    for k, s in (('Skulls', 20), ('Bones', 21), ('Candles', 22), ('Pool', 23), ('Pillar', 24), ('Crucifix', 25)):
        out['deco' + k] = decor(k.lower(), s)
    for f in range(3):
        out[f'blood{f}'] = blood_tile(f)
    out['carpetH'] = carpet(floor_tile(1, 0), horizontal=True)
    out['carpetV'] = carpet(floor_tile(2, 1), horizontal=False)
    out['floorSigil'] = sigil(floor_tile(3, 2))
    import shack
    out['woodFloor0'] = shack.planks(61)
    out['woodFloor1'] = shack.planks(62)
    out['woodWallFace'] = shack.wood_wall_face()
    out['woodWallTop'] = shack.wood_wall_top()
    out['woodWindow'] = shack.wood_wall_face(window=True)
    out['trapdoor'] = shack.trapdoor()
    out['stash'] = shack.stash()
    out['decoBed'] = shack.bed()
    out['decoRug'] = shack.rug()
    sheet = Img(32 * len(TILE_NAMES), 32)
    for i, n in enumerate(TILE_NAMES):
        sheet.blit(out[n], i * 32, 0)
    return sheet, out
