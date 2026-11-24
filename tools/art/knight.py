"""The Knight: blackened plate, tarnished-gold crown helm, tattered crimson cape.
32x32 frames, facing right (the game mirrors it for left).
Rows: idle(4) walk(6) attack(5) hurt(2) death(4) attack2(6, the heavy combo finisher).
"""
import math
from pix import Img, rgb, line, ellipse
from palette import PAL, C

HELM = [
    "...y.y.y..",
    "..KYgYgYK.",
    ".K2345564K",
    ".K3456654K",
    ".K345K##KK",
    ".K3455K5K.",
    ".K234554K.",
    "..K23344K.",
    "...KKKKK..",
]
TORSO = [
    "..KKKKKKK..",
    ".K3455554K.",
    "K345666543K",
    "K3456Y6543K",
    "K345YyY543K",
    "K3456Y6543K",
    "K2345Y5432K",
    "KgGYYYYYGgK",
    ".KRCCcCCRK.",
    ".KRCCcCRrK.",
]
LEG = [
    "K43K..",
    "K32K..",
    "KYGK..",
    "K32K..",
    "K21K..",
    "K221K.",
    "K2111K",
    "KKKKKK",
]
KNEEL = [
    "..K43333K.",
    ".K3222222K",
    ".K32K..K2K",
    "K321K..K2K",
    "K21K...K1K",
    "KKKK...KKK",
]
CAPE = [
    "....KKK..",
    "...KRCRK.",
    "..KRCCRRK",
    "..KRCcCRK",
    ".KRCCCRRK",
    ".KrRCCCRK",
    ".KrRCcCRK",
    "KrrRCCCRK",
    "KrrRCCRRK",
    "KrrRCCRK.",
    ".KrRRCRK.",
    ".KrRrRK..",
    "..KrK.K..",
    "...K.....",
]
PAULDRON = [
    ".KKKK.",
    "K5666K",
    "K4556K",
    "KgYYgK",
    ".K43K.",
]
DARKER = {'6': '5', '5': '4', '4': '3', '3': '2', '2': '1', '1': 'K', 'Y': 'G', 'G': 'g', 'y': 'Y',
          'C': 'R', 'c': 'C', 'R': 'r'}

def darken(rows):
    return [''.join(DARKER.get(ch, ch) for ch in r) for r in rows]

def sword(im, hx, hy, ang, L=12):
    d = (math.cos(ang), math.sin(ang))
    n = (-d[1], d[0])
    # pommel + grip
    im.set(hx - d[0] * 3, hy - d[1] * 3, C['Y'])
    im.set(hx - d[0] * 2, hy - d[1] * 2, C['r'])
    im.set(hx - d[0], hy - d[1], C['r'])
    # crossguard
    for k in (-2, -1, 1, 2):
        im.set(hx + d[0] + n[0] * k, hy + d[1] + n[1] * k, C['Y'] if abs(k) == 1 else C['G'])
    im.set(hx + d[0], hy + d[1], C['y'])
    # blade: lit core, dark edge, bright tip
    for t in range(2, L + 1):
        bx, by = hx + d[0] * t, hy + d[1] * t
        im.set(bx + n[0], by + n[1], C['b'])
        im.set(bx, by, C['W'] if t > L - 2 or t % 4 == 0 else C['w'])
    # blood on the blade
    im.set(hx + d[0] * (L - 3) + n[0], hy + d[1] * (L - 3) + n[1], C['C'])

def arm(im, sx, sy, hx, hy):
    line(im, sx, sy, hx, hy, C['3'])
    line(im, sx + 1, sy, hx + 1, hy, C['2'])
    im.set(hx, hy, C['4'])

def smear(im, cx, cy, a0, a1, r0=9, r1=13):
    steps = 40
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        fade = i / steps
        for r in range(r0, r1 + 1):
            if r == r1 and fade < 0.5:
                continue
            col = C['f'] if r >= r1 - 1 else (C['E'] if fade > 0.35 else C['e'])
            im.set(cx + math.cos(a) * r, cy + math.sin(a) * r, col)

def compose(bob=0, sway=0, legf=(0, 0, 0, 0), eye='e', hand=(21, 21), ang=1.25, lean=0,
            kneel=False, show_sword=True, smear_args=None):
    im = Img(32, 32)
    cape = CAPE[:]
    if sway:
        cape = cape[:6] + [('.' * max(0, -sway) + r)[:len(r) + 1] if sway < 0 else r[sway:] + '.' * sway for r in cape[6:]]
    im.grid(cape, PAL, 6 + lean, 14 + bob)
    if kneel:
        im.grid(KNEEL, PAL, 11, 25)
    else:
        bx, by, fx, fy = legf
        im.grid(darken(LEG), PAL, 12 + bx, 23 + by)
        im.grid(LEG, PAL, 16 + fx, 23 + fy)
    kb = 3 if kneel else 0
    im.grid(TORSO, PAL, 11 + lean, 14 + bob + kb)
    helm = [r.replace('#', eye) for r in HELM]
    im.grid(helm, PAL, 12 + lean, 6 + bob + kb)
    if show_sword:
        hx, hy = hand
        arm(im, 19 + lean, 17 + bob + kb, hx, hy + kb)
        sword(im, hx, hy + kb, ang)
    im.grid(PAULDRON, PAL, 17 + lean, 14 + bob + kb)
    if smear_args:
        smear(im, *smear_args)
    im.outline(C['K'])
    return im

def frames():
    rows = {}
    rows['idle'] = [compose(bob=[0, 0, 1, 1][f], sway=[0, 0, 1, 1][f], eye='eEEe'[f],
                            hand=(21, 21 + [0, 0, 1, 1][f])) for f in range(4)]
    walk = []
    for f in range(6):
        a = f / 6 * math.tau
        fx = round(2 * math.sin(a))
        lift_f = -1 if math.cos(a) > 0.3 else 0
        lift_b = -1 if math.cos(a) < -0.3 else 0
        bob = 1 if f in (1, 4) else 0
        walk.append(compose(bob=bob, sway=1 if f % 3 else 0, legf=(-fx, lift_b, fx, lift_f),
                            hand=(21, 21 + bob), ang=1.15 + 0.1 * math.sin(a), eye='e'))
    rows['walk'] = walk
    # COMBO HIT 1: a quick diagonal slash. Draw back, cut down across the body, follow through.
    rows['attack'] = [
        compose(hand=(17, 13), ang=-2.4, lean=-1, eye='E', legf=(1, 0, -1, 0)),
        compose(hand=(19, 13), ang=-1.8, lean=0, eye='E'),
        compose(hand=(23, 15), ang=-0.35, lean=1, eye='E', legf=(-1, 0, 1, 0), smear_args=(20, 18, -2.3, -0.35)),
        compose(hand=(24, 20), ang=0.8, lean=2, eye='E', legf=(-1, 0, 2, 0), smear_args=(20, 18, -1.3, 0.8)),
        compose(hand=(22, 21), ang=1.2, lean=1, eye='e', legf=(-1, 0, 1, 0)),
    ]
    # COMBO HIT 2: the heavy finisher. Raise the blade high behind the head, then chop it down
    # with a step forward and hold the impact for a beat.
    rows['attack2'] = [
        compose(hand=(17, 11), ang=-2.1, lean=-2, bob=-1, eye='E', legf=(1, 0, -1, 0)),
        compose(hand=(16, 9), ang=-2.5, lean=-2, bob=-1, eye='E', legf=(1, 0, -1, 0)),
        compose(hand=(24, 14), ang=-0.3, lean=2, eye='E', legf=(-1, 0, 2, 0), smear_args=(20, 17, -2.6, -0.3, 9, 14)),
        compose(hand=(25, 22), ang=1.05, lean=3, bob=1, eye='E', legf=(-2, 0, 3, 0), smear_args=(20, 18, -1.4, 1.05, 9, 14)),
        compose(hand=(25, 22), ang=1.15, lean=3, bob=1, eye='E', legf=(-2, 0, 3, 0)),
        compose(hand=(22, 21), ang=1.25, lean=1, eye='e', legf=(-1, 0, 1, 0)),
    ]
    h0 = compose(eye='E').shift(-1, 0).tint(rgb('#ff3a2a'), 0.6)
    h1 = compose(eye='E').tint(rgb('#ffffff'), 0.18)
    rows['hurt'] = [h0, h1]
    d0 = compose(kneel=True, hand=(23, 23), ang=1.45)
    d1 = compose(kneel=True, bob=1, lean=1, hand=(24, 23), ang=1.5, eye='r')
    lying = compose(eye='r', show_sword=False).rot_cw().shift(1, 3)
    d2 = Img(32, 32)
    d2.blit(lying, 0, 0)
    d3 = Img(32, 32)
    ellipse(d3, 15, 27, 11, 3.5, [C['r'], C['R'], C['C'], C['c']], bias=-0.1)
    d3.blit(lying, 0, 0)
    sword(d3, 26, 29, 0.05, 10)
    rows['death'] = [d0, d1, d2, d3]
    return rows
