"""Builds an enlarged contact sheet of a sprite sheet for checking art by eye."""
import sys
from pix import Img, rgb

def contact(rows, fw, fh, k=6, bg='#3a3a44'):
    names = list(rows)
    n = max(len(rows[r]) for r in names)
    out = Img((fw + 2) * n * k, (fh + 2) * len(names) * k, rgb(bg))
    for ri, name in enumerate(names):
        for fi, fr in enumerate(rows[name]):
            out.blit(fr.scaled(k), (fi * (fw + 2) + 1) * k, (ri * (fh + 2) + 1) * k)
    return out
