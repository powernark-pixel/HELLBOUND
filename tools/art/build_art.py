"""Builds every PNG in assets/ from the hand-authored pixel art in this folder.

Run from the repo root:   py tools/art/build_art.py
Optional preview sheets:  py tools/art/build_art.py --preview <folder>
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pix import Img, rgb
import knight, monsters, environment, items_ui, title
from preview import contact

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = lambda *p: os.path.join(ROOT, 'assets', *p)
ORDER = ['idle', 'walk', 'attack', 'hurt', 'death']

def sheet(rows, fw, fh):
    n = max(len(rows[k]) for k in ORDER)
    im = Img(fw * n, fh * len(ORDER))
    for ri, k in enumerate(ORDER):
        for fi, fr in enumerate(rows[k]):
            im.blit(fr, fi * fw, ri * fh)
    return im

def main():
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    sprites = {
        ('player', 'knight_sheet.png', 32): knight.frames(),
        ('enemies', 'imp_sheet.png', 24): monsters.imp_rows(),
        ('enemies', 'hound_sheet.png', 32): monsters.hound_rows(),
        ('enemies', 'archer_sheet.png', 32): monsters.archer_rows(),
        ('enemies', 'demon_sheet.png', 40): monsters.demon_rows(),
        ('enemies', 'warden_sheet.png', 56): monsters.warden_rows(),
    }
    for (folder, name, s), rows in sprites.items():
        sheet(rows, s, s).save(A('sprites', folder, name))
        if preview:
            contact(rows, s, s, k=4 if s < 50 else 3).save(os.path.join(preview, 'prev_' + name))
    tiles, _ = environment.tiles()
    tiles.save(A('tiles', 'dungeon_tiles.png'))
    items_ui.item_icons().save(A('items', 'item_icons.png'))
    items_ui.effects().save(A('effects', 'effects.png'))
    for k, im in items_ui.ui_images().items():
        im.save(A('ui', k + '.png'))
    title.title_bg().save(A('ui', 'title_bg.png'))
    if preview:
        items_ui.item_icons().scaled(6).save(os.path.join(preview, 'prev_items.png'))
        items_ui.effects().scaled(6).save(os.path.join(preview, 'prev_effects.png'))
        ui = items_ui.ui_images()
        x = 0
        board = Img(400, 40, rgb('#3a3a44'))
        for k in ('panel', 'slot', 'btn', 'btnHot', 'tip', 'barFrame', 'nodeLocked', 'nodeAvail', 'nodeOn', 'nodeRoot'):
            board.blit(ui[k], x + 2, 2)
            x += ui[k].w + 4
        board.scaled(4).save(os.path.join(preview, 'prev_ui.png'))
    print('assets built in', os.path.join(ROOT, 'assets'))

if __name__ == '__main__':
    main()
