"""Tiny pixel-art toolkit with no dependencies. Draws into RGBA grids and writes PNGs.

Used by build_art.py to author every sprite, tile, icon and UI frame in assets/.
"""
import math, os, struct, zlib, random

def rgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
def bayer(x, y):
    return (BAYER[y % 4][x % 4] + 0.5) / 16.0

class Img:
    def __init__(s, w, h, fill=None):
        s.w, s.h = w, h
        s.p = [[fill] * w for _ in range(h)]

    def inb(s, x, y):
        return 0 <= x < s.w and 0 <= y < s.h

    def set(s, x, y, c):
        x, y = int(round(x)), int(round(y))
        if s.inb(x, y):
            s.p[y][x] = c

    def get(s, x, y):
        return s.p[y][x] if s.inb(x, y) else None

    def mix(s, x, y, c, a):
        """Blend colour c over the pixel with opacity a (0..1)."""
        x, y = int(x), int(y)
        if not s.inb(x, y) or a <= 0:
            return
        d = s.p[y][x]
        if d is None:
            s.p[y][x] = (c[0], c[1], c[2], int(255 * min(1, a)))
            return
        a = min(1, a)
        s.p[y][x] = (int(d[0] + (c[0] - d[0]) * a), int(d[1] + (c[1] - d[1]) * a),
                     int(d[2] + (c[2] - d[2]) * a), max(d[3], int(255 * a)))

    def copy(s):
        n = Img(s.w, s.h)
        n.p = [row[:] for row in s.p]
        return n

    def blit(s, o, dx, dy, flip=False):
        for y in range(o.h):
            for x in range(o.w):
                c = o.p[y][o.w - 1 - x if flip else x]
                if c is not None and c[3] > 0:
                    if c[3] >= 255:
                        s.set(dx + x, dy + y, c)
                    else:
                        s.mix(dx + x, dy + y, c, c[3] / 255)

    def grid(s, rows, pal, dx=0, dy=0, flip=False):
        w = max(len(r) for r in rows)
        for y, row in enumerate(rows):
            row = row.ljust(w, '.')
            for x, ch in enumerate(row):
                if ch == '.' or ch == ' ':
                    continue
                xx = dx + (w - 1 - x if flip else x)
                s.set(xx, dy + y, pal[ch])

    def outline(s, c, diag=False):
        add = []
        for y in range(s.h):
            for x in range(s.w):
                if s.p[y][x] is not None:
                    continue
                nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
                if diag:
                    nb += [(1, 1), (-1, -1), (1, -1), (-1, 1)]
                for ox, oy in nb:
                    q = s.get(x + ox, y + oy)
                    if q is not None and q[3] > 200 and q != c:
                        add.append((x, y))
                        break
        for x, y in add:
            s.p[y][x] = c
        return s

    def recolor(s, fn):
        for y in range(s.h):
            for x in range(s.w):
                c = s.p[y][x]
                if c is not None:
                    s.p[y][x] = fn(c, x, y)
        return s

    def tint(s, col, a):
        return s.recolor(lambda c, x, y: (int(c[0] + (col[0] - c[0]) * a), int(c[1] + (col[1] - c[1]) * a),
                                          int(c[2] + (col[2] - c[2]) * a), c[3]))

    def rot_cw(s):
        n = Img(s.h, s.w)
        for y in range(s.h):
            for x in range(s.w):
                n.p[x][s.h - 1 - y] = s.p[y][x]
        return n

    def shift(s, dx, dy):
        n = Img(s.w, s.h)
        n.blit(s, dx, dy)
        return n

    def scaled(s, k):
        n = Img(s.w * k, s.h * k)
        for y in range(s.h):
            for x in range(s.w):
                c = s.p[y][x]
                if c is not None:
                    for yy in range(k):
                        for xx in range(k):
                            n.p[y * k + yy][x * k + xx] = c
        return n

    def opaque(s):
        return [(x, y) for y in range(s.h) for x in range(s.w) if s.p[y][x] is not None]

    def save(s, path):
        save_png(path, s)


def save_png(path, img):
    raw = bytearray()
    for row in img.p:
        raw.append(0)
        for c in row:
            if c is None:
                raw += b'\0\0\0\0'
            else:
                raw += bytes((c[0], c[1], c[2], c[3] if len(c) > 3 else 255))

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)

    png = (b'\x89PNG\r\n\x1a\n' +
           chunk(b'IHDR', struct.pack('>IIBBBBB', img.w, img.h, 8, 6, 0, 0, 0)) +
           chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)


# ---------- shaded primitives (banded, dithered lighting like hand-shaded pixel art) ----------
LIGHT = (-0.5, -0.62, 0.6)
_l = math.sqrt(sum(v * v for v in LIGHT))
LIGHT = tuple(v / _l for v in LIGHT)

def ramp_pick(ramp, v, x, y, dither=True):
    """v in 0..1 -> colour from ramp (dark..light), Bayer-dithered between bands."""
    v = max(0.0, min(0.999, v))
    f = v * (len(ramp) - 1)
    i = int(f)
    if dither and i < len(ramp) - 1 and (f - i) > bayer(x, y):
        i += 1
    return ramp[i]

def lit(nx, ny, nz, amb=0.18):
    d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]
    return amb + (1 - amb) * max(0, d)

def ellipse(img, cx, cy, rx, ry, ramp, dither=True, bias=0.0):
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d2 = dx * dx + dy * dy
            if d2 <= 1:
                nz = math.sqrt(1 - d2)
                img.set(x, y, ramp_pick(ramp, lit(dx, dy, nz) + bias, x, y, dither))

def capsule(img, x0, y0, x1, y1, r0, r1, ramp, dither=True, bias=0.0):
    minx, maxx = int(min(x0, x1) - max(r0, r1) - 1), int(max(x0, x1) + max(r0, r1) + 2)
    miny, maxy = int(min(y0, y1) - max(r0, r1) - 1), int(max(y0, y1) + max(r0, r1) + 2)
    vx, vy = x1 - x0, y1 - y0
    L2 = vx * vx + vy * vy or 1e-6
    for y in range(miny, maxy):
        for x in range(minx, maxx):
            px, py = x + 0.5, y + 0.5
            t = max(0, min(1, ((px - x0) * vx + (py - y0) * vy) / L2))
            cx, cy = x0 + vx * t, y0 + vy * t
            r = r0 + (r1 - r0) * t
            dx, dy = (px - cx) / r, (py - cy) / r
            d2 = dx * dx + dy * dy
            if d2 <= 1:
                nz = math.sqrt(1 - d2)
                img.set(x, y, ramp_pick(ramp, lit(dx, dy, nz) + bias, x, y, dither))

def line(img, x0, y0, x1, y1, c):
    x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        img.set(x0, y0, c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy; x0 += sx
        if e2 <= dx:
            err += dx; y0 += sy

def poly(img, pts, c, fn=None):
    """Scanline polygon fill. fn(x,y) may return a colour per pixel."""
    ys = [p[1] for p in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        yc = y + 0.5
        xs = []
        n = len(pts)
        for i in range(n):
            (ax, ay), (bx, by) = pts[i], pts[(i + 1) % n]
            if (ay <= yc < by) or (by <= yc < ay):
                xs.append(ax + (yc - ay) * (bx - ax) / (by - ay))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            for x in range(int(math.ceil(xs[i] - 0.5)), int(math.floor(xs[i + 1] - 0.5)) + 1):
                img.set(x, y, fn(x, y) if fn else c)

def tile_noise(seed, size=32, cell=8):
    """Tileable value noise, returns f(x,y) in 0..1."""
    r = random.Random(seed)
    n = size // cell
    g = [[r.random() for _ in range(n)] for _ in range(n)]
    def f(x, y):
        gx, gy = (x % size) / cell, (y % size) / cell
        x0, y0 = int(gx) % n, int(gy) % n
        x1, y1 = (x0 + 1) % n, (y0 + 1) % n
        tx, ty = gx - int(gx), gy - int(gy)
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        a = g[y0][x0] + (g[y0][x1] - g[y0][x0]) * tx
        b = g[y1][x0] + (g[y1][x1] - g[y1][x0]) * tx
        return a + (b - a) * ty
    return f
