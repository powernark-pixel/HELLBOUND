"""HELLBOUND palette: tarnished gold, dark crimson, iron, stone, bone, fire."""
from pix import rgb

HEX = {
    'K': '#0a0608', 'k': '#1a1014',
    # blackened armour (cold iron)
    '1': '#110f15', '2': '#1b1820', '3': '#27232d', '4': '#38333f', '5': '#524b5c', '6': '#7d758a', '7': '#b2abbd',
    # tarnished gold
    'g': '#4a3110', 'G': '#7a5a1c', 'Y': '#b48a34', 'y': '#e0bf68',
    # crimson / blood
    'r': '#33050a', 'R': '#5e0c13', 'C': '#8f1a1f', 'c': '#c4302c', 'p': '#e8564a',
    # embers / fire
    'e': '#ff6a1a', 'E': '#ffd27a', 'f': '#fff1c2', 'a': '#a12a06',
    # steel blade
    'b': '#5d606c', 'w': '#a7abb8', 'W': '#e4e7ef',
    # bone
    'n': '#3b3329', 'm': '#6f6352', 'B': '#a89a84', 'O': '#d6cab2', 'o': '#f1e9d6',
    # demon skin
    's': '#3e0c0c', 'S': '#6c1813', 'd': '#9e2a1a', 'D': '#c84a26', 'h': '#ea8a4c',
    # hound fur / ash
    'u': '#0d0a0c', 'U': '#1b1519', 'v': '#2b2228', 'V': '#43353d',
    # eyes
    'x': '#ffe14f', 'X': '#fffbe0',
    # wood
    't': '#24140b', 'T': '#43260f', 'q': '#68401d', 'Q': '#8e5d2e',
}
C = {k: rgb(v) for k, v in HEX.items()}
PAL = dict(C)

RAMP = {
    'armour': [C[k] for k in '123456'],
    'gold': [C[k] for k in 'gGYy'],
    'crimson': [C[k] for k in 'rRCcp'],
    'bone': [C[k] for k in 'nmBOo'],
    'skin': [C[k] for k in 'sSdDh'],
    'fur': [C[k] for k in 'uUvV'],
    'wood': [C[k] for k in 'tTqQ'],
    'fire': [C['a'], C['e'], C['E'], C['f']],
    'stone': [rgb(h) for h in ('#0e0b10', '#18141b', '#221c25', '#2d2630', '#3a313b', '#4a3f48', '#5d5059')],
    'iron': [rgb(h) for h in ('#0f0e12', '#1d1b22', '#2e2b35', '#45414e', '#625d6c', '#8a8494')],
}
