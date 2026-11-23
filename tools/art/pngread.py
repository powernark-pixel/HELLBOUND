"""Minimal PNG reader (8-bit RGB / RGBA, non-interlaced) so third-party art can be imported
without installing anything. Returns a pix.Img."""
import struct, zlib
from pix import Img

def read_png(path):
    with open(path, 'rb') as f:
        data = f.read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('not a PNG: ' + path)
    pos, idat = 8, b''
    w = h = bd = ct = il = None
    while pos < len(data):
        ln, typ = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', body)
        elif typ == b'IDAT':
            idat += body
        elif typ == b'IEND':
            break
        pos += 12 + ln
    if bd != 8 or ct not in (2, 6) or il:
        raise ValueError(f'unsupported PNG format (bit depth {bd}, colour type {ct}, interlace {il}): {path}')
    bpp = 4 if ct == 6 else 3
    raw = zlib.decompress(idat)
    stride = w * bpp
    out = Img(w, h)
    prev = bytearray(stride)
    i = 0
    for y in range(h):
        ft = raw[i]; i += 1
        line = bytearray(raw[i:i + stride]); i += stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if ft == 1:
                line[x] = (line[x] + a) & 255
            elif ft == 2:
                line[x] = (line[x] + b) & 255
            elif ft == 3:
                line[x] = (line[x] + ((a + b) >> 1)) & 255
            elif ft == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        for x in range(w):
            px = line[x * bpp:x * bpp + bpp]
            alpha = px[3] if bpp == 4 else 255
            if alpha:
                out.p[y][x] = (px[0], px[1], px[2], alpha)
        prev = line
    return out
