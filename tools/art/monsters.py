"""Enemy sprite sheets. Every sheet has rows idle(4) walk(4) attack(3) hurt(2) death(4), facing right."""
import math, random
from pix import Img, rgb, line, ellipse, capsule, poly
from palette import PAL, C, RAMP

def dissolve(im, amount, seed):
    """Death-to-ash: remove a share of pixels and grey the rest."""
    r = random.Random(seed)
    n = im.copy()
    for y in range(n.h):
        for x in range(n.w):
            c = n.p[y][x]
            if c is None:
                continue
            if r.random() < amount:
                n.p[y][x] = None
            elif r.random() < amount:
                g = (c[0] + c[1] + c[2]) // 3
                n.p[y][x] = (g // 2 + 20, g // 2 + 12, g // 2 + 12, 255)
    return n

def flash(im, col='#ffffff', a=0.7):
    return im.copy().tint(rgb(col), a)

def std_rows(idle, walk, attack, base_for_death, seed):
    """Builds hurt and death rows from a base pose."""
    hurt = [flash(base_for_death.shift(-1, 0), '#ffffff', 0.75), flash(base_for_death, '#ff4030', 0.35)]
    sq = base_for_death.shift(0, 2)
    death = [flash(base_for_death, '#ff6a1a', 0.4), dissolve(sq, 0.15, seed), dissolve(sq.shift(0, 1), 0.45, seed + 1),
             dissolve(sq.shift(0, 2), 0.75, seed + 2)]
    return {'idle': idle, 'walk': walk, 'attack': attack, 'hurt': hurt, 'death': death}

# ---------------------------------------------------------------- IMP (24x24)
IMP = [
    "..o........o..",
    "..Bo......oB..",
    "...BsSSSSsB...",
    "...sDDDDDDs...",
    "..sDhDDDDhDs..",
    "..sDxXDDXxDs..",
    "..sdDDDDDDds..",
    "...sdKooKds...",
    "....sdKKds....",
    "..SsdDDDDdsS..",
    ".Ss.dDhhDd.sS.",
    ".h..dDDDDd..h.",
    "....sdDDds....",
]
IMP_LEGS = [
    ["....sS..Ss....", "...sS....Ss...", "...KK....KK..."],
    ["....sS..Ss....", "....sS...Ss...", "....KK...KK..."],
    ["....sS..Ss....", "...sS...sS....", "...KK...KK...."],
]
IMP_ARMS_UP = [
    "h.SsdDDDDdsS.h",
    "Ss..dDhhDd..sS",
    "....dDDDDd....",
]

def imp_wings(im, up):
    tip = 4 if up else 13
    for side in (-1, 1):
        sx = 12 + side * 3 if side > 0 else 11 - 3
        bx = 12 + side * 11
        pts = [(12 + side * 2, 14), (bx, tip), (12 + side * 10, tip + 6), (12 + side * 7, 17), (12 + side * 3, 17)]
        poly(im, pts, C['R'])
        line(im, 12 + side * 2, 14, bx, tip, C['s'])
        line(im, 12 + side * 4, 16, 12 + side * 9, tip + 5, C['r'])

def imp_frame(wing_up=False, legs=0, attack=False, bob=0):
    im = Img(24, 24)
    imp_wings(im, wing_up)
    # tail with spade tip
    line(im, 14, 19, 19, 21, C['S'])
    line(im, 19, 21, 21, 18, C['S'])
    im.set(21, 17, C['d']); im.set(22, 17, C['d']); im.set(21, 16, C['d'])
    body = IMP[:]
    if attack:
        body = body[:7] + ["...sKKKKKKs...", "...sKoooooK..."] + IMP_ARMS_UP + body[12:]
    im.grid(body, PAL, 5, 6 + bob)
    im.grid(IMP_LEGS[legs], PAL, 5, 19)
    im.outline(C['K'])
    return im

def imp_rows():
    idle = [imp_frame(wing_up=f % 2 == 0, bob=[0, 0, 1, 1][f]) for f in range(4)]
    walk = [imp_frame(wing_up=f % 2 == 0, legs=[1, 0, 2, 0][f], bob=f % 2) for f in range(4)]
    attack = [imp_frame(wing_up=True, attack=True, bob=-1), imp_frame(wing_up=False, attack=True),
              imp_frame(wing_up=False)]
    return std_rows(idle, walk, attack, imp_frame(), 11)

# ---------------------------------------------------------------- HELLHOUND (32x32)
def hound_frame(t=0.0, mode='idle', lunge=0, seed=0):
    im = Img(32, 32)
    fur = RAMP['fur']
    gait = math.sin(t * math.tau)
    gait2 = math.sin(t * math.tau + math.pi)
    sp = 3 if mode == 'walk' else 0.6
    ox = lunge
    # far legs (darker)
    for hx, ph in ((10, gait2), (21, gait)):
        fx = hx + ox + ph * sp
        capsule(im, hx + ox, 19, fx, 28, 1.6, 1.2, fur[:3], bias=-0.15)
    # tail up with flame tip
    capsule(im, 6 + ox, 17, 2 + ox, 11 + gait * 0.5, 1.4, 1.0, fur)
    # body
    capsule(im, 8 + ox, 19, 21 + ox, 18, 5.2, 4.6, fur, bias=0.05)
    # neck and head, carried low and forward
    capsule(im, 20 + ox, 17, 24 + ox, 16, 3.6, 3.0, fur)
    ellipse(im, 25 + ox, 15.5, 3.6, 3.0, fur, bias=0.05)
    capsule(im, 26 + ox, 16.5, 30.5 + ox, 17.5, 2.0, 1.5, fur)
    # swept-back ears
    poly(im, [(22 + ox, 13), (19 + ox, 10), (24 + ox, 12.5)], C['v'])
    poly(im, [(23 + ox, 13), (21 + ox, 9), (25 + ox, 12.5)], C['U'])
    # near legs
    for hx, ph in ((11, gait), (22, gait2)):
        fx = hx + ox + ph * sp
        capsule(im, hx + ox, 19, fx, 28, 1.9, 1.4, fur)
        im.set(fx + 1, 29, C['o']); im.set(fx, 29, C['B'])
    # jaw / fangs
    if mode == 'attack':
        for x in range(26, 32):
            im.set(x + ox, 18, C['K'])
        im.set(27 + ox, 19, C['o']); im.set(29 + ox, 19, C['o']); im.set(28 + ox, 17, C['o'])
        im.set(30 + ox, 19, C['c'])
    else:
        im.set(28 + ox, 18, C['o'])
    # burning eye
    im.set(26 + ox, 14, C['x']); im.set(27 + ox, 14, C['e'])
    # ember fissures along the flank
    r = random.Random(7)
    for i in range(5):
        x, y = 9 + i * 2.6 + ox, 16 + r.random() * 4
        im.set(x, y, C['e']); im.set(x + 1, y + 1, C['a'])
    # flame mane along the spine (animated)
    r = random.Random(seed)
    for x in range(9, 23):
        h = 1 + int(1.6 * (1 + math.sin(x * 1.3 + t * math.tau * 2))) + r.randint(0, 1)
        base = 13 if x < 19 else 13 + (x - 19) // 2
        for k in range(h):
            col = C['a'] if k == 0 else (C['e'] if k < h - 1 else C['E'])
            im.set(x + ox, base - k, col)
    flame = [(2 + ox, 10), (1 + ox, 9), (2 + ox, 8)]
    for i, (x, y) in enumerate(flame):
        im.set(x, y + (seed % 2), [C['e'], C['E'], C['f']][i])
    im.outline(C['K'])
    return im

def hound_rows():
    idle = [hound_frame(f / 4, 'idle', seed=f) for f in range(4)]
    walk = [hound_frame(f / 4, 'walk', seed=f + 4) for f in range(4)]
    attack = [hound_frame(0.1, 'idle', -1, 9), hound_frame(0.25, 'attack', 2, 10), hound_frame(0.4, 'attack', 1, 11)]
    return std_rows(idle, walk, attack, hound_frame(0, 'idle', seed=1), 21)

# ---------------------------------------------------------------- SKELETON ARCHER (32x32)
SKULL = [
    ".KKKKK.",
    "KOooOOK",
    "KoOOOBK",
    "KKxKxKK",
    "KOBOBOK",
    ".KoKoK.",
    "..KKK..",
]
RIBS = [
    ".KBK.",
    "KoBoK",
    "KBnBK",
    "KoBoK",
    ".KBK.",
]

def archer_frame(t=0.0, mode='idle', draw=0.0):
    im = Img(32, 32)
    bone = RAMP['bone']
    walk = math.sin(t * math.tau) * (2.5 if mode == 'walk' else 0)
    # tattered hood and cloak behind
    poly(im, [(11, 8), (19, 8), (20, 22), (17, 25), (14, 23), (10, 26), (9, 15)], C['r'])
    poly(im, [(12, 8), (18, 8), (17, 14), (13, 14)], C['R'])
    for x in (10, 13, 16, 19):
        im.set(x, 25 + (x % 2), C['r'])
    # legs (bones)
    capsule(im, 14, 21, 13 - walk, 29, 1.1, 0.9, bone)
    capsule(im, 16, 21, 17 + walk, 29, 1.1, 0.9, bone)
    im.set(12 - walk, 30, C['B']); im.set(18 + walk, 30, C['B'])
    # pelvis + spine + ribs
    capsule(im, 13, 21, 17, 21, 1.4, 1.4, bone)
    line(im, 15, 13, 15, 20, C['B'])
    im.grid(RIBS, PAL, 13, 14)
    # skull under the hood
    im.grid(SKULL, PAL, 12, 7)
    poly(im, [(11, 6), (19, 6), (20, 9), (18, 8), (12, 8), (10, 9)], C['R'])
    # bow arm forward, string hand back
    bx = 23
    capsule(im, 16, 15, bx - 1, 16, 0.9, 0.8, bone)
    pull = 17 - draw * 5
    capsule(im, 15, 16, pull, 17, 0.9, 0.8, bone)
    # bow (wood arc) and string
    for i in range(-7, 8):
        a = i / 7
        x = bx + int(round(2.2 * (1 - a * a)))
        im.set(x, 16 + i, C['q'] if abs(i) < 6 else C['Q'])
    sx = bx - draw * 6
    line(im, bx, 9, sx, 16, C['B'])
    line(im, sx, 16, bx, 23, C['B'])
    if draw > 0.2:
        line(im, sx, 16, bx + 4, 16, C['T'])
        im.set(bx + 5, 16, C['W']); im.set(sx - 1, 15, C['C']); im.set(sx - 1, 17, C['C'])
    im.outline(C['K'])
    return im

def archer_rows():
    idle = [archer_frame(0, 'idle').shift(0, [0, 0, 1, 1][f]) for f in range(4)]
    walk = [archer_frame(f / 4, 'walk') for f in range(4)]
    attack = [archer_frame(0, 'idle', 0.5), archer_frame(0, 'idle', 1.0), archer_frame(0, 'idle', 0.0)]
    return std_rows(idle, walk, attack, archer_frame(), 31)

# ---------------------------------------------------------------- DEMON BRUTE (40x40)
def horn(im, x0, y0, side):
    pts = [(x0, y0), (x0 + side * 3, y0 - 4), (x0 + side * 4, y0 - 9), (x0 + side * 2, y0 - 12)]
    for i in range(len(pts) - 1):
        r0 = 2.2 - i * 0.6
        capsule(im, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0, r0 - 0.6, RAMP['bone'])

def demon_frame(t=0.0, mode='idle', raise_arm=0.0):
    im = Img(40, 40)
    skin = RAMP['skin']
    walk = math.sin(t * math.tau) * (2.5 if mode == 'walk' else 0)
    bob = 1 if (mode == 'idle' and t >= 0.5) else 0
    # legs (digitigrade)
    for hx, ph in ((15, -walk), (24, walk)):
        capsule(im, hx, 27, hx + ph - 1, 32, 3.4, 2.6, skin, bias=-0.05)
        capsule(im, hx + ph - 1, 32, hx + ph + 1, 37, 2.4, 1.8, skin)
        for k in range(3):
            im.set(hx + ph + k, 38, C['B'])
    # loincloth of rags
    poly(im, [(14, 26), (26, 26), (25, 32), (20, 30), (15, 33)], C['r'])
    # torso: hunched, dark, with chest and belly lines
    ellipse(im, 20, 20 + bob, 9.5, 8.5, skin, bias=-0.2)
    line(im, 20, 14 + bob, 20, 26 + bob, C['s'])
    line(im, 14, 19 + bob, 19, 20 + bob, C['s'])
    line(im, 21, 20 + bob, 26, 19 + bob, C['s'])
    for y in (22, 24):
        line(im, 17, y + bob, 23, y + bob, C['S'])
    # glowing brand burned into the chest
    line(im, 15, 16 + bob, 18, 18 + bob, C['e'])
    line(im, 25, 16 + bob, 22, 18 + bob, C['a'])
    # long arms
    ay = 14 - raise_arm * 8
    capsule(im, 11, 14 + bob, 5, 27 + bob, 3.4, 2.6, skin, bias=-0.15)
    capsule(im, 29, 14 + bob, 35, ay + 12 + bob, 3.4, 2.6, skin, bias=-0.15)
    for side_x, hy in ((5, 27 + bob), (35, ay + 12 + bob)):
        for k in (-2, 0, 2):
            im.set(side_x + k, hy + 2, C['o'])
        # iron shackle
        for k in range(-3, 4):
            im.set(side_x + k, hy - 3, C['4'] if k % 2 else C['5'])
    # chain dangling from left wrist
    for k in range(6):
        im.set(4 + (k % 2), 31 + bob + k, C['5'] if k % 2 else C['3'])
    # head sunk between the shoulders
    ellipse(im, 20, 9 + bob, 5.5, 5, skin, bias=-0.1)
    horn(im, 16, 7 + bob, -1)
    horn(im, 24, 7 + bob, 1)
    for x in (17, 18, 22, 23):
        im.set(x, 9 + bob, C['x'])
    im.set(18, 9 + bob, C['X']); im.set(22, 9 + bob, C['X'])
    for x in range(17, 24):
        im.set(x, 12 + bob, C['K'])
    im.set(18, 13 + bob, C['o']); im.set(22, 13 + bob, C['o'])
    im.outline(C['K'])
    return im

def demon_rows():
    idle = [demon_frame(f / 4, 'idle') for f in range(4)]
    walk = [demon_frame(f / 4, 'walk') for f in range(4)]
    attack = [demon_frame(0, 'idle', 1.0), demon_frame(0, 'idle', 0.3), demon_frame(0, 'idle', -0.4)]
    return std_rows(idle, walk, attack, demon_frame(), 41)

# ---------------------------------------------------------------- THE WARDEN, BOSS (56x56)
def warden_frame(t=0.0, mode='idle', axe=0.0):
    im = Img(56, 56)
    armour = RAMP['armour']
    walk = math.sin(t * math.tau) * (2 if mode == 'walk' else 0)
    bob = 1 if (mode == 'idle' and t >= 0.5) else 0
    # crimson cardinal robe (folds shaded in vertical bands)
    def robe(x, y):
        fold = math.sin((x - 28) * 0.9) * 0.5 + 0.5
        v = 0.25 + fold * 0.45 - (y - 30) * 0.01
        from pix import ramp_pick
        return ramp_pick(RAMP['crimson'][:4], v, x, y)
    poly(im, [(19, 26 + bob), (37, 26 + bob), (44 + walk * 0.5, 53), (12 - walk * 0.5, 53)], None, robe)
    # gold hem
    for x in range(12, 45):
        im.set(x, 53, C['Y'] if x % 3 else C['y'])
        im.set(x, 52, C['G'])
    # armoured chest + pauldrons
    ellipse(im, 28, 24 + bob, 10, 8, armour, bias=0.05)
    ellipse(im, 17, 20 + bob, 5.5, 4.5, armour, bias=0.1)
    ellipse(im, 39, 20 + bob, 5.5, 4.5, armour, bias=0.1)
    for x in range(22, 35):
        im.set(x, 30 + bob, C['Y'])
    # gold cross on chest
    for y in range(18, 29):
        im.set(28, y + bob, C['y' if y < 21 else 'Y'])
    for x in range(25, 32):
        im.set(x, 21 + bob, C['Y'])
    # hood + shadowed face + ember eyes
    ellipse(im, 28, 12 + bob, 6.5, 7, RAMP['crimson'][:3])
    ellipse(im, 28, 14 + bob, 4, 4, [C['K'], C['k']], dither=False)
    im.set(26, 14 + bob, C['e']); im.set(30, 14 + bob, C['e'])
    im.set(26, 13 + bob, C['E']); im.set(30, 13 + bob, C['E'])
    # crown of iron spikes
    for i, x in enumerate(range(22, 35, 3)):
        h = 5 if i == 2 else 3
        line(im, x, 6 + bob, x, 6 + bob - h, C['Y'])
        im.set(x, 6 + bob - h - 1, C['y'])
    for x in range(21, 36):
        im.set(x, 6 + bob, C['G'])
    # executioner's axe
    ang = -1.9 + axe * 2.6
    hx, hy = 38, 30 + bob
    dx, dy = math.cos(ang), math.sin(ang)
    for k in range(-5, 16):
        im.set(hx + dx * k, hy + dy * k, C['T'] if k % 5 else C['G'])
        im.set(hx + dx * k + 1, hy + dy * k, C['t'])
    ex, ey = hx + dx * 14, hy + dy * 14
    nx, ny = -dy, dx
    blade = [(ex - dx * 2, ey - dy * 2), (ex + dx * 4, ey + dy * 4),
             (ex + dx * 6 + nx * 9, ey + dy * 6 + ny * 9), (ex - dx * 5 + nx * 8, ey - dy * 5 + ny * 8)]
    poly(im, blade, None, lambda x, y: C['w'] if (x + y) % 5 else C['W'])
    line(im, blade[2][0], blade[2][1], blade[3][0], blade[3][1], C['W'])
    im.set(blade[2][0] - nx, blade[2][1] - ny, C['C'])
    im.set(blade[3][0] - nx * 2, blade[3][1] - ny * 2, C['C'])
    # gauntlets on the haft
    ellipse(im, hx, hy, 2.5, 2.5, armour)
    ellipse(im, hx + dx * 6, hy + dy * 6, 2.5, 2.5, armour)
    im.outline(C['K'])
    return im

def warden_rows():
    idle = [warden_frame(f / 4, 'idle') for f in range(4)]
    walk = [warden_frame(f / 4, 'walk') for f in range(4)]
    attack = [warden_frame(0, 'idle', 0.0), warden_frame(0, 'idle', 0.55), warden_frame(0, 'idle', 1.0)]
    return std_rows(idle, walk, attack, warden_frame(), 51)
