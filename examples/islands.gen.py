# Generates the four seasonal islands: examples/island-spring.json, -summer, -autumn, -winter (and island.json = summer).
#   python3 examples/islands.gen.py            # all four
#   python3 examples/islands.gen.py winter     # one
# Same island, cabin, deck and stairs; the season changes the palette, the trees, the ground and the props.
import json, math, random, sys
SEASONS = ['spring', 'summer', 'autumn', 'winter']
PAL = {
 'spring': dict(water='#63c6e6', water2='#82d4ee', cliff='#7d3b2a', rim='#a85538', sand='#efe0a0', grass='#a9d46b', patch='#9bcb5e', trunk='#b4613b', roof='#c9703a', pine1='#5bb35f', pine2='#79c56d', pine3='#a6d27a', pond='#6ccdec', rock1='#8a929a', rock2='#a0a7ae', window=0.4),
 'summer': dict(water='#33b3e8', water2='#56c8f0', cliff='#7d3b2a', rim='#a85538', sand='#f4dc8a', grass='#69bd46', patch='#5cb03e', trunk='#b4613b', roof='#c9703a', pine1='#2f8f45', pine2='#46a653', pine3='#7cbf5a', pond='#4fc3ee', rock1='#7e8790', rock2='#8f979f', window=0.3),
 'autumn': dict(water='#5ba7c6', water2='#79bad4', cliff='#6e3626', rim='#9a4a30', sand='#e8c27a', grass='#d2b04c', patch='#c49a3e', trunk='#a95a36', roof='#b9602f', pine1='#4f7f3f', pine2='#6b8f3d', pine3='#a89a3a', pond='#6aaecb', rock1='#7a7468', rock2='#8e877a', window=0.7),
 'winter': dict(water='#8cc4dc', water2='#a9d6e8', cliff='#6d4a3a', rim='#8a6a5a', sand='#dfe9f1', grass='#f3f7fb', patch='#e4eef6', trunk='#9a5a3a', roof='#c9703a', pine1='#2f6f55', pine2='#3f8265', pine3='#4f9475', pond='#cfeaf6', rock1='#7d8790', rock2='#929ba3', window=1.0),
}
def build(SEASON):
    C = PAL[SEASON]
    random.seed(11)
    parts = []
    def P(**k): parts.append(k)
    def r3(v): return [round(x, 4) for x in v]
    G = 0.30  # top of the grass
    # ---- water, cliff, sand, grass
    P(name='Water', kind='cylinder', pos=[0, -0.1, 0], size=[9.4, 0.2, 9.0], segments=28, color=C['water'])
    P(name='Water Inner', kind='cylinder', pos=[0, -0.085, 0], size=[7.2, 0.2, 6.8], segments=24, color=C['water2'])
    P(name='Cliff', kind='cylinder', pos=[0, 0.04, 0], size=[5.9, 0.46, 5.3], segments=18, taper=0.86, color=C['cliff'])
    P(name='Cliff Rim', kind='cylinder', pos=[0, 0.2, 0], size=[6.1, 0.14, 5.5], segments=18, color=C['rim'])
    P(name='Sand', kind='cylinder', pos=[0, 0.24, 0], size=[5.9, 0.12, 5.3], segments=18, color=C['sand'])
    P(name='Grass', kind='cylinder', pos=[0, 0.27, 0], size=[5.4, 0.1, 4.8], segments=18, color=C['grass'])
    P(name='Grass Patch', kind='cylinder', pos=[0.5, 0.31, 0.2], size=[3.2, 0.06, 2.4], segments=14, color=C['patch'])

    # ---- pond and stepping slabs
    P(name='Pond Edge', kind='cylinder', pos=[-1.25, 0.31, 1.3], size=[1.45, 0.05, 1.15], segments=8, color='#dccb82')
    P(name='Pond', kind='cylinder', pos=[-1.25, 0.335, 1.3], size=[1.25, 0.05, 0.98], segments=8, color=C['pond'])
    for i, (x, z, w, d) in enumerate([(0.9, 1.6, 0.4, 0.3), (1.3, 1.5, 0.34, 0.34), (1.05, 1.95, 0.4, 0.28), (1.5, 1.9, 0.36, 0.28), (0.75, 2.3, 0.34, 0.26), (1.3, 2.3, 0.3, 0.26)]):
        P(name=f'Slab {i+1}', kind='box', pos=[x, G + 0.015, z], size=[w, 0.04, d], rot=[0, random.uniform(-14, 14), 0], color='#dcd2b4')

    # ---- the big trunk behind the cabin
    P(name='Big Trunk', kind='cylinder', pos=[0.1, 2.0, -1.55], size=[1.5, 3.6, 1.5], segments=8, taper=0.9, color=C['trunk'])
    P(name='Trunk Roots', kind='cylinder', pos=[0.1, G + 0.12, -1.55], size=[1.9, 0.26, 1.9], segments=8, taper=0.78, color='#9a4a2a')

    # ---- deck on stilts
    DECK_Y = 1.0
    DX0, DX1, DZ0, DZ1 = -1.75, 1.3, -1.25, 1.2
    nb = 13
    for i in range(nb):
        z = DZ0 + (DZ1 - DZ0) * (i + 0.5) / nb
        P(name=f'Deck Plank {i+1}', kind='box', pos=[(DX0 + DX1) / 2, DECK_Y, z], size=[DX1 - DX0, 0.08, (DZ1 - DZ0) / nb - 0.01], color='#d2975a' if i % 2 else '#c88c50')
    for i, (x, z) in enumerate([(DX0 + 0.1, DZ0 + 0.1), (DX1 - 0.1, DZ0 + 0.1), (DX0 + 0.1, DZ1 - 0.1), (DX1 - 0.1, DZ1 - 0.1), (-0.2, DZ1 - 0.1), (-0.2, DZ0 + 0.1), (DX0 + 0.1, -0.05), (DX1 - 0.1, -0.05)]):
        P(name=f'Stilt {i+1}', kind='cylinder', pos=[x, (DECK_Y + G) / 2, z], size=[0.11, DECK_Y - G, 0.11], segments=6, color='#8a5a30')
    P(name='Deck Beam', kind='box', pos=[(DX0 + DX1) / 2, DECK_Y - 0.075, -0.05], size=[DX1 - DX0, 0.07, 0.12], color='#8a5a30')
    def rail(name, x0, z0, x1, z1, n=6):
        for i in range(n + 1):
            t = i / n
            P(name=f'{name} Post {i+1}', kind='box', pos=[x0 + (x1 - x0) * t, DECK_Y + 0.24, z0 + (z1 - z0) * t], size=[0.055, 0.44, 0.055], color='#b7773f')
        mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        ln = math.hypot(x1 - x0, z1 - z0)
        rot = math.degrees(math.atan2(-(z1 - z0), (x1 - x0)))
        P(name=f'{name} Rail', kind='box', pos=[mx, DECK_Y + 0.44, mz], size=[ln, 0.05, 0.05], rot=[0, round(rot, 1), 0], color='#c88848')
    rail('Front Rail A', DX0 + 0.03, DZ1 - 0.03, -0.5, DZ1 - 0.03, 5)
    rail('Front Rail B', 0.3, DZ1 - 0.03, DX1 - 0.03, DZ1 - 0.03, 3)
    rail('West Rail', DX0 + 0.03, DZ0 + 0.03, DX0 + 0.03, DZ1 - 0.03, 9)
    rail('East Rail', DX1 - 0.03, DZ0 + 0.03, DX1 - 0.03, -0.25, 4)

    CX, CZ = -0.55, -0.6
    # ---- stairs: they start flush at the deck edge, steps touch each other and the ground, with side boards and a handrail
    def stairs(name, x, z, dx, dz, n, w):
        """(x, z) is the point on the deck edge where the stairs start; (dx, dz) is the unit direction they run in."""
        L = 0.3                       # length of one step
        rise = (DECK_Y - G) / (n + 1)
        for i in range(n):
            top = DECK_Y - (i + 1) * rise
            hgt = top - G
            cx, cz = x + dx * (0.15 + L * i), z + dz * (0.15 + L * i)
            P(name=f'{name} Step {i+1}', kind='box', pos=[cx, G + hgt / 2, cz], size=[L if dx else w, round(hgt, 3), w if dx else L], color='#cf9356' if i % 2 else '#c4874b')
        run = L * n
        drop = DECK_Y - G - rise
        ln = math.hypot(run, drop)
        ang = math.degrees(math.atan2(drop, run))
        mx, mz = x + dx * run / 2, z + dz * run / 2
        my = DECK_Y - drop / 2 - rise * 0.2
        for sgn in (-1, 1):  # side boards on both edges
            off = sgn * (w / 2 + 0.02)
            px, pz = (mx, mz + off) if dx else (mx + off, mz)
            P(name=f'{name} Board {"A" if sgn < 0 else "B"}', kind='box', pos=[px, my, pz], size=[ln, 0.16, 0.05] if dx else [0.05, 0.16, ln], rot=[0, 0, round(-ang * dx, 1)] if dx else [round(ang * dz, 1), 0, 0], color='#8a5a30')
        # handrail on one side: posts at the top and bottom and a sloped rail
        for t, nm in ((0.0, 'Top'), (1.0, 'Bottom')):
            px = x + dx * run * t
            pz = z + dz * run * t
            py = DECK_Y - drop * t
            off = w / 2 + 0.02
            P(name=f'{name} Post {nm}', kind='box', pos=[px if dx else px + off, py + 0.2, pz + off if dx else pz], size=[0.05, 0.4, 0.05], color='#b7773f')
        P(name=f'{name} Handrail', kind='box', pos=[mx if dx else mx + w / 2 + 0.02, my + 0.4 - 0.2 * 0 + 0.0, mz + w / 2 + 0.02 if dx else mz], size=[ln, 0.05, 0.05] if dx else [0.05, 0.05, ln], rot=[0, 0, round(-ang * dx, 1)] if dx else [round(ang * dz, 1), 0, 0], color='#c88848')
    stairs('Stairs East', DX1, 0.5, 1, 0, 5, 0.6)
    stairs('Stairs Front', CX + 0.45, DZ1, 0, 1, 4, 0.6)  # straight in front of the door

    # ---- cabin (two storeys of windows)
    CX, CZ = -0.55, -0.6
    WALL_Y = DECK_Y + 0.04
    CW, CH, CD = 1.75, 1.15, 1.3
    P(name='Cabin', kind='box', pos=[CX, WALL_Y + CH / 2, CZ], size=[CW, CH, CD], color='#dba166')
    nbat = 15
    for i in range(nbat):
        P(name=f'Batten {i+1}', kind='box', pos=[CX - CW / 2 + 0.07 + (CW - 0.14) * i / (nbat - 1), WALL_Y + CH / 2, CZ + CD / 2 + 0.005], size=[0.04, CH, 0.02], color='#c48549')
    P(name='Door', kind='box', pos=[CX + 0.45, WALL_Y + 0.36, CZ + CD / 2 + 0.015], size=[0.34, 0.68, 0.03], color='#7a4a25')
    for i, (wx, wy) in enumerate([(CX - 0.55, WALL_Y + 0.42), (CX - 0.05, WALL_Y + 0.42), (CX - 0.55, WALL_Y + 0.88), (CX - 0.05, WALL_Y + 0.88), (CX + 0.45, WALL_Y + 0.9)]):
        P(name=f'Window Frame {i+1}', kind='box', pos=[wx, wy, CZ + CD / 2 + 0.02], size=[0.3, 0.3, 0.03], color='#f3ead4')
        P(name=f'Window {i+1}', kind='box', pos=[wx, wy, CZ + CD / 2 + 0.036], size=[0.23, 0.23, 0.02], color='#d6b25a', mat={'glow': C['window']})
        P(name=f'Window Bar {i+1}', kind='box', pos=[wx, wy, CZ + CD / 2 + 0.05], size=[0.03, 0.23, 0.02], color='#f3ead4')
    def gable(name, cx, cz, length, span, rise, y0, color):
        r0 = span / 1.732
        r1 = rise / 1.5
        yc = y0 + 0.5 * r1
        P(name=name, kind='sweep', rings=[{'p': r3([cx - length / 2, yc, cz]), 'r': [round(r0, 3), round(r1, 3)]}, {'p': r3([cx + length / 2, yc, cz]), 'r': [round(r0, 3), round(r1, 3)]}], sides=3, phase=90, start='flat', end='flat', color=color)
    RISE = 0.95
    gable('Roof', CX, CZ, CW + 0.2, CD + 0.35, RISE, WALL_Y + CH - 0.02, C['roof'])
    APEX = WALL_Y + CH - 0.02 + RISE
    P(name='Roof Ridge', kind='box', pos=[CX, APEX + 0.005, CZ], size=[CW + 0.24, 0.06, 0.08], color='#8a4a22')
    for i in range(5):
        t = (i + 1) / 6
        for sgn in (1, -1):
            P(name=f'Shingle Line {i+1}{" Back" if sgn < 0 else ""}', kind='box', pos=[CX, APEX - RISE * t - 0.012, CZ + sgn * (CD + 0.35) / 2 * t], size=[CW + 0.22, 0.03, 0.05], rot=[sgn * 54, 0, 0], color='#a35527')
    # wing
    WX = CX + CW / 2 + 0.38
    P(name='Wing', kind='box', pos=[WX, WALL_Y + 0.4, CZ + 0.15], size=[0.8, 0.8, 0.9], color='#d49a5e')
    gable('Wing Roof', WX, CZ + 0.15, 0.95, 1.2, 0.6, WALL_Y + 0.78, C['roof'])
    P(name='Chimney', kind='box', pos=[CX - 0.5, APEX - 0.1, CZ - 0.25], size=[0.16, 0.5, 0.16], color='#9a6a48')

    # ---- trees: the season decides their kind, colours and cover
    SNOW = '#f6f9fc'
    def pine(name, x, z, h, w, c1, c2, snow=False):
        tr = h * 0.18
        P(name=f'{name} Trunk', kind='cylinder', pos=[x, G + tr / 2, z], size=[0.12, tr, 0.12], segments=5, color='#7a4a28')
        layers = 4
        for i in range(layers):
            lh = (h - tr) / layers * 1.55
            y = G + tr + (h - tr) * (i / layers) + lh / 2 - 0.02
            wd = w * (1 - i * 0.2)
            P(name=f'{name} Layer {i+1}', kind='cone', pos=[x, y, z], size=[round(wd, 3), round(lh, 3), round(wd, 3)], segments=7, color=c1 if i % 2 == 0 else c2)
            if snow:
                P(name=f'{name} Snow {i+1}', kind='cone', pos=[x, y + lh * 0.2, z], size=[round(wd * 0.82, 3), round(lh * 0.62, 3), round(wd * 0.82, 3)], segments=7, color=SNOW)
    def round_tree(name, x, z, h, w, leaves):
        tr = h * 0.5
        P(name=f'{name} Trunk', kind='cylinder', pos=[x, G + tr / 2, z], size=[0.14 * w, tr, 0.14 * w], segments=6, color='#7a4a28')
        r = w * 0.5
        top = G + tr
        for i, (dx, dy, dz, k) in enumerate([(0, 0.42, 0, 1.0), (-0.42, 0.18, 0.18, 0.72), (0.4, 0.2, -0.1, 0.74), (0.05, 0.62, 0.05, 0.68)]):
            P(name=f'{name} Leaves {i+1}', kind='blob', center=[round(x + dx * r, 3), round(top + dy * h * 0.55, 3), round(z + dz * r, 3)], radii=[round(r * k, 3)] * 3, segments=6, color=leaves[i % len(leaves)])
    def bare_tree(name, x, z, h, w):
        P(name=f'{name} Trunk', kind='cylinder', pos=[x, G + h * 0.3, z], size=[0.16 * w, h * 0.6, 0.16 * w], segments=6, color='#6a4a38')
        for i, (dx, dy, rz_, ln) in enumerate([(-0.18, 0.62, 38, 0.5), (0.2, 0.7, -42, 0.55), (0.0, 0.82, 12, 0.4)]):
            P(name=f'{name} Branch {i+1}', kind='box', pos=[round(x + dx * w, 3), round(G + h * dy, 3), z], size=[0.07 * w, round(ln * h * 0.6, 3), 0.07 * w], rot=[0, 0, rz_], color='#6a4a38')
            P(name=f'{name} Branch Snow {i+1}', kind='blob', center=[round(x + dx * w * 1.6, 3), round(G + h * dy + ln * h * 0.28, 3), z], radii=[0.1 * w, 0.05 * w, 0.08 * w], segments=5, color=SNOW)
    G1, G2, L1 = C['pine1'], C['pine2'], C['pine3']
    spots = [('A', -2.0, -0.35, 2.3, 1.2), ('B', -1.7, 0.55, 1.9, 1.05), ('C', -1.15, -1.5, 2.1, 1.1), ('D', 1.95, -1.05, 2.3, 1.1), ('E', 2.2, -0.2, 1.95, 1.0), ('F', 1.55, -1.75, 1.9, 1.0), ('G', -0.4, 1.95, 0.8, 0.5), ('H', 1.9, 1.15, 0.9, 0.52)]
    kinds = {
        'spring': {'A': 'blossom', 'B': 'pine', 'C': 'blossom', 'D': 'pine', 'E': 'blossom', 'F': 'pine', 'G': 'blossom', 'H': 'blossom'},
        'summer': {'A': 'leaf', 'B': 'pine', 'C': 'pine', 'D': 'leaf', 'E': 'pine', 'F': 'leaf', 'G': 'leaf', 'H': 'pine'},
        'autumn': {'A': 'maple1', 'B': 'maple2', 'C': 'pine', 'D': 'maple3', 'E': 'maple1', 'F': 'pine', 'G': 'maple2', 'H': 'maple3'},
        'winter': {'A': 'snowpine', 'B': 'snowpine', 'C': 'bare', 'D': 'snowpine', 'E': 'snowpine', 'F': 'bare', 'G': 'snowpine', 'H': 'snowpine'},
    }[SEASON]
    LEAVES = {'blossom': ['#f7b8d2', '#fbd0e2', '#f09cc0'], 'leaf': ['#4fae48', '#63c056', '#3d9a44'], 'maple1': ['#e8742a', '#f08a34', '#d85f22'], 'maple2': ['#d9452c', '#e8602f', '#c43a28'], 'maple3': ['#f0b22e', '#f6c844', '#e29a24']}
    for tag, x, z, h, w in spots:
        k = kinds[tag]
        if k == 'pine': pine(f'Pine {tag}', x, z, h, w, G1, G2 if tag != 'C' else L1)
        elif k == 'snowpine': pine(f'Pine {tag}', x, z, h, w, G1, G2, snow=True)
        elif k == 'bare': bare_tree(f'Tree {tag}', x, z, h * 0.95, w)
        else: round_tree(f'Tree {tag}', x, z, h * (0.85 if k == 'blossom' else 0.9), w * 1.15, LEAVES[k])

    # ---- rocks (on the island and in the water)
    def rock(name, x, y, z, r, col):
        P(name=name, kind='blob', center=[x, y, z], radii=[round(r, 3), round(r * 0.75, 3), round(r * 0.9, 3)], segments=5, color=col)
    rock('Rock 1', -0.95, G + 0.1, 0.5, 0.22, '#7e8790')
    rock('Rock 2', -0.55, G + 0.16, 0.75, 0.3, '#8f979f')
    rock('Rock 3', 1.7, G + 0.08, 1.7, 0.2, '#7e8790')
    rock('Rock 4', 2.0, G + 0.12, 0.5, 0.26, '#8f979f')
    rock('Rock 5', -0.2, G + 0.08, 0.8, 0.2, '#7e8790')
    rock('Rock Water 1', -0.5, 0.18, 2.95, 0.5, '#b7aea6')
    rock('Rock Water 2', 0.45, 0.12, 3.0, 0.36, '#c7beb4')
    rock('Rock Water 3', 3.2, 0.1, 1.0, 0.36, '#b7aea6')
    rock('Rock Water 4', -3.1, 0.1, -0.3, 0.32, '#b7aea6')
    # barrel and lantern
    P(name='Barrel', kind='cylinder', pos=[2.1, G + 0.14, 1.0], size=[0.26, 0.28, 0.26], segments=8, color='#4a3a30')
    P(name='Barrel Band', kind='cylinder', pos=[2.1, G + 0.14, 1.0], size=[0.275, 0.04, 0.275], segments=8, color='#2e2622')
    P(name='Bush', kind='blob', center=[-2.1, G + 0.12, 1.35], radii=[0.25, 0.18, 0.22], segments=5, color='#6fb04f')

    # ---- the crown of the big tree: each season dresses it differently
    TOPY = 3.95
    crown = {'spring': ['#f7b8d2', '#fbd0e2', '#f09cc0'], 'summer': ['#4fae48', '#63c056', '#3d9a44'], 'autumn': ['#e8742a', '#f0b22e', '#d9452c']}.get(SEASON)
    if crown:
        for i, (dx, dy, dz, r) in enumerate([(0, 0.55, 0, 1.25), (-1.0, 0.2, 0.3, 0.85), (1.0, 0.25, 0.1, 0.9), (0.2, 1.25, -0.2, 0.85), (-0.3, 0.3, -0.9, 0.8), (0.4, 0.3, 0.9, 0.7)]):
            P(name=f'Crown {i+1}', kind='blob', center=[round(0.1 + dx, 3), round(TOPY + dy - 0.3, 3), round(-1.55 + dz, 3)], radii=[round(r * 0.88, 3), round(r * 0.72, 3), round(r * 0.88, 3)], segments=7, color=crown[i % 3])
    else:  # winter: bare branches with snow on them
        for i, (dx, rz_, ln) in enumerate([(-0.5, 35, 1.3), (0.55, -38, 1.4), (0.0, 8, 1.0)]):
            P(name=f'Crown Branch {i+1}', kind='box', pos=[round(0.1 + dx, 3), TOPY - 0.2 + 0.4, -1.55], size=[0.16, ln, 0.16], rot=[0, 0, rz_], color='#7a4a30')
            ang = math.radians(rz_)
            tip = [0.1 + dx - math.sin(ang) * ln * 0.5, TOPY + 0.2 + math.cos(ang) * ln * 0.5]
            P(name=f'Crown Snow {i+1}', kind='blob', center=[round(tip[0], 3), round(tip[1], 3), -1.55], radii=[0.24, 0.1, 0.2], segments=5, color=SNOW)
        P(name='Trunk Snow', kind='blob', center=[0.1, TOPY - 0.1, -1.55], radii=[0.6, 0.12, 0.6], segments=7, color=SNOW)

    # ---- season props
    def free_spot(rng, tries=200):
        for _ in range(tries):
            x, z = rng.uniform(-2.5, 2.5), rng.uniform(-2.1, 2.3)
            if (x / 2.55) ** 2 + (z / 2.25) ** 2 > 1: continue          # on the grass
            if -2.0 < x < 1.45 and -1.45 < z < 1.35: continue            # under the deck and cabin
            if math.hypot(x + 1.25, (z - 1.3) * 1.2) < 0.95: continue    # the pond
            if -0.5 < x < 0.3 and z > 1.0: continue                      # the front stairs
            if 1.3 < x < 2.2 and 0.1 < z < 0.9: continue                 # the east stairs
            if any(math.hypot(x - sx, z - sz) < 0.5 for _, sx, sz, _, _ in spots): continue
            return x, z
        return 2.0, 2.0
    rng = random.Random(5)
    def smoke(n=3):
        y = APEX + 0.15           # top of the chimney
        prev = 0.0
        for i in range(n):
            r = 0.1 + 0.035 * i
            y += prev * 0.7 + r * 0.7
            P(name=f'Smoke {i+1}', kind='blob', center=[round(CX - 0.5 + 0.05 * i, 3), round(y, 3), round(CZ - 0.25 + 0.04 * i, 3)], radii=[round(r, 3)] * 3, segments=5, color='#eef0f3' if SEASON == 'winter' else '#d9dce0')
            prev = r
    if SEASON == 'spring':
        for i in range(18):
            x, z = free_spot(rng)
            col = ['#f48fb8', '#ffffff', '#ffe066', '#c9a2f0'][i % 4]
            P(name=f'Flower Stem {i+1}', kind='cylinder', pos=[round(x, 3), G + 0.07, round(z, 3)], size=[0.02, 0.14, 0.02], segments=4, color='#4e9a3a')
            P(name=f'Flower {i+1}', kind='blob', center=[round(x, 3), G + 0.16, round(z, 3)], radii=[0.06, 0.04, 0.06], segments=5, color=col)
        for i, (dx, dz) in enumerate([(-0.25, 0.1), (0.2, -0.2), (0.05, 0.25)]):
            P(name=f'Lily Pad {i+1}', kind='cylinder', pos=[-1.25 + dx, G + 0.07, 1.3 + dz], size=[0.22, 0.02, 0.2], segments=7, color='#4fa84a')
        P(name='Lily Flower', kind='blob', center=[-1.05, G + 0.12, 1.1], radii=[0.06, 0.05, 0.06], segments=5, color='#f7a8c8')
        for i in range(10):  # petals on the ground
            x, z = free_spot(rng)
            P(name=f'Petal {i+1}', kind='box', pos=[round(x, 3), G + 0.012, round(z, 3)], size=[0.07, 0.012, 0.045], rot=[0, rng.uniform(0, 180), 0], color='#f9c6dc')
    if SEASON == 'summer':
        for i in range(5):
            x, z = free_spot(rng)
            P(name=f'Sunflower Stem {i+1}', kind='cylinder', pos=[round(x, 3), G + 0.2, round(z, 3)], size=[0.03, 0.4, 0.03], segments=4, color='#3f8f35')
            P(name=f'Sunflower {i+1}', kind='cylinder', pos=[round(x, 3), G + 0.42, round(z + 0.03, 3)], size=[0.2, 0.03, 0.2], rot=[75, 0, 0], segments=8, color='#ffd23a')
            P(name=f'Sunflower Heart {i+1}', kind='cylinder', pos=[round(x, 3), G + 0.42, round(z + 0.05, 3)], size=[0.1, 0.035, 0.1], rot=[75, 0, 0], segments=7, color='#6a3f1c')
        ux, uz = -2.45, 0.55   # beach umbrella and towel on the sand
        P(name='Umbrella Pole', kind='cylinder', pos=[ux, G + 0.4, uz], size=[0.04, 0.8, 0.04], segments=5, color='#e6e0d0')
        P(name='Umbrella', kind='cone', pos=[ux, G + 0.88, uz], size=[0.95, 0.3, 0.95], segments=8, color='#e8473a')
        P(name='Umbrella Stripe', kind='cone', pos=[ux, G + 0.9, uz], size=[0.62, 0.3, 0.62], segments=8, color='#fafafa')
        P(name='Towel', kind='box', pos=[ux + 0.15, G + 0.015, uz + 0.45], size=[0.7, 0.025, 0.36], rot=[0, 20, 0], color='#3ea6e8')
        P(name='Towel Stripe', kind='box', pos=[ux + 0.15, G + 0.03, uz + 0.45], size=[0.7, 0.01, 0.1], rot=[0, 20, 0], color='#ffffff')
        P(name='Beach Ball', kind='sphere', pos=[2.9, 0.12, 2.2], size=[0.28, 0.28, 0.28], segments=8, color='#f26a4a')
        P(name='Beach Ball Band', kind='cylinder', pos=[2.9, 0.12, 2.2], size=[0.285, 0.05, 0.285], segments=8, color='#ffffff')
    if SEASON == 'autumn':
        for i, (x, z) in enumerate([(1.2, 1.45), (1.55, 1.2), (-0.65, 0.95), (1.0, 2.0), (-0.9, -1.0)]):
            P(name=f'Pumpkin {i+1}', kind='sphere', pos=[x, G + 0.1, z], size=[0.3 - 0.02 * (i % 2), 0.21, 0.3 - 0.02 * (i % 2)], segments=7, color='#ee7b22')
            P(name=f'Pumpkin Stem {i+1}', kind='cylinder', pos=[x, G + 0.22, z], size=[0.04, 0.07, 0.04], segments=4, color='#5a7a2a')
        for i in range(9):
            x, z = free_spot(rng)
            P(name=f'Leaf Pile {i+1}', kind='blob', center=[round(x, 3), G + 0.06, round(z, 3)], radii=[0.2, 0.08, 0.17], segments=5, color=['#d9622b', '#e8a02a', '#b8402a'][i % 3])
        for i in range(14):
            x, z = free_spot(rng)
            P(name=f'Fallen Leaf {i+1}', kind='box', pos=[round(x, 3), G + 0.012, round(z, 3)], size=[0.08, 0.012, 0.06], rot=[0, rng.uniform(0, 180), 0], color=['#e8742a', '#d9452c', '#f0b22e'][i % 3])
        smoke(3)
    if SEASON == 'winter':
        for i in range(7):  # snow drifts on the ground
            x, z = free_spot(rng)
            P(name=f'Snow Drift {i+1}', kind='blob', center=[round(x, 3), G + 0.05, round(z, 3)], radii=[0.28, 0.09, 0.2], segments=5, color=SNOW)
        sx, sz = -0.75, 2.05   # snowman
        P(name='Snowman Base', kind='blob', center=[sx, G + 0.22, sz], radii=[0.26, 0.24, 0.26], segments=7, color=SNOW)
        P(name='Snowman Body', kind='blob', center=[sx, G + 0.55, sz], radii=[0.19, 0.18, 0.19], segments=7, color=SNOW)
        P(name='Snowman Head', kind='blob', center=[sx, G + 0.84, sz], radii=[0.14, 0.14, 0.14], segments=7, color=SNOW)
        P(name='Snowman Nose', kind='cone', pos=[sx, G + 0.84, sz + 0.17], size=[0.05, 0.14, 0.05], rot=[90, 0, 0], segments=5, color='#f07a22')
        for sg, sd in ((1, 'Left'), (-1, 'Right')):
            P(name=f'Snowman Eye {sd}', kind='sphere', pos=[sx + sg * 0.05, G + 0.89, sz + 0.12], size=[0.03, 0.03, 0.03], segments=4, color='#1d1d20')
            P(name=f'Snowman Arm {sd}', kind='box', pos=[sx + sg * 0.3, G + 0.6, sz], size=[0.34, 0.025, 0.025], rot=[0, 0, -28 * sg], color='#6a4a2a')
        P(name='Snowman Scarf', kind='cylinder', pos=[sx, G + 0.71, sz], size=[0.3, 0.06, 0.3], segments=8, color='#d83a3a')
        P(name='Snowman Hat', kind='cylinder', pos=[sx, G + 1.02, sz], size=[0.17, 0.14, 0.17], segments=7, color='#2a2a30')
        P(name='Snowman Hat Brim', kind='cylinder', pos=[sx, G + 0.96, sz], size=[0.3, 0.02, 0.3], segments=8, color='#2a2a30')
        for i in range(5):  # ice cracks on the pond
            P(name=f'Ice Crack {i+1}', kind='box', pos=[-1.25 + (i - 2) * 0.12, 0.366, 1.3 + ((i * 7) % 5 - 2) * 0.07], size=[0.22, 0.01, 0.015], rot=[0, 20 + i * 37, 0], color='#ffffff')
        for i, (x, z, r) in enumerate([(3.4, -1.8, 0.45), (-3.3, 1.8, 0.4), (2.6, 3.0, 0.33), (-2.2, -3.2, 0.36)]):  # ice floes
            P(name=f'Ice Floe {i+1}', kind='blob', center=[x, 0.04, z], radii=[r, 0.07, r * 0.8], segments=6, color='#f0f7fb')
        # snow on the roofs
        gable('Roof Snow', CX, CZ, CW + 0.3, CD + 0.5, RISE * 1.07, WALL_Y + CH - 0.0, SNOW)
        gable('Wing Roof Snow', WX, CZ + 0.15, 1.05, 1.3, 0.66, WALL_Y + 0.8, SNOW)
        for i, x in enumerate([-1.15, -0.75, -0.35, 0.05]):  # icicles under the eave
            P(name=f'Icicle {i+1}', kind='cone', pos=[x, WALL_Y + CH - 0.02 - 0.02, CZ + (CD + 0.5) / 2 * 0.98], size=[0.035, 0.14, 0.035], rot=[180, 0, 0], segments=4, color='#d6eefa')
        smoke(3)
        for p in list(parts):  # snow caps on the rocks
            if p['name'].startswith('Rock') and 'Water' not in p['name']:
                c = p['center']; rr = p['radii']
                parts.append(dict(name=p['name'] + ' Snow', kind='blob', center=[c[0], round(c[1] + rr[1] * 0.55, 3), c[2]], radii=[round(rr[0] * 0.8, 3), round(rr[1] * 0.5, 3), round(rr[2] * 0.8, 3)], segments=5, color=SNOW))

    LIFT = 0.2
    for p in parts:
        if 'pos' in p: p['pos'][1] = round(p['pos'][1] + LIFT, 4)
        if 'center' in p: p['center'][1] = round(p['center'][1] + LIFT, 4)
        if 'rings' in p:
            for r in p['rings']: r['p'][1] = round(r['p'][1] + LIFT, 4)

    return parts

def save(parts, season, also=None):
    spec = {"name": f"Island {season.title()}", "rig": "none", "engine": "unity", "parts": parts}
    for fn in [f'examples/island-{season}.json'] + ([also] if also else []):
        json.dump(spec, open(fn, 'w'), indent=1)

if __name__ == '__main__':
    todo = sys.argv[1:] or SEASONS
    for s in todo:
        p = build(s)
        save(p, s, 'examples/island.json' if s == 'summer' else None)
        print(s, len(p), 'parts')
