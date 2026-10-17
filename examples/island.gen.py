# Generates examples/island.json: a small low-poly island with a cabin on a deck, stairs, pines, rocks and a pond.
import json, math, random
random.seed(11)
parts = []
def P(**k): parts.append(k)
def r3(v): return [round(x, 4) for x in v]
G = 0.30  # top of the grass

# ---- water, cliff, sand, grass
P(name='Water', kind='cylinder', pos=[0, -0.1, 0], size=[9.4, 0.2, 9.0], segments=28, color='#5cbfe2')
P(name='Water Inner', kind='cylinder', pos=[0, -0.085, 0], size=[7.2, 0.2, 6.8], segments=24, color='#78cdea')
P(name='Cliff', kind='cylinder', pos=[0, 0.04, 0], size=[5.9, 0.46, 5.3], segments=18, taper=0.86, color='#7d3b2a')
P(name='Cliff Rim', kind='cylinder', pos=[0, 0.2, 0], size=[6.1, 0.14, 5.5], segments=18, color='#a85538')
P(name='Sand', kind='cylinder', pos=[0, 0.24, 0], size=[5.9, 0.12, 5.3], segments=18, color='#e9da8e')
P(name='Grass', kind='cylinder', pos=[0, 0.27, 0], size=[5.4, 0.1, 4.8], segments=18, color='#cdca68')
P(name='Grass Patch', kind='cylinder', pos=[0.5, 0.31, 0.2], size=[3.2, 0.06, 2.4], segments=14, color='#bec95c')

# ---- pond and stepping slabs
P(name='Pond Edge', kind='cylinder', pos=[-1.25, 0.31, 1.3], size=[1.45, 0.05, 1.15], segments=8, color='#dccb82')
P(name='Pond', kind='cylinder', pos=[-1.25, 0.335, 1.3], size=[1.25, 0.05, 0.98], segments=8, color='#62c9ea')
for i, (x, z, w, d) in enumerate([(-0.3, 1.55, 0.4, 0.3), (0.1, 1.38, 0.34, 0.34), (0.42, 1.72, 0.4, 0.28), (0.0, 1.9, 0.36, 0.28), (0.5, 1.45, 0.3, 0.26), (0.3, 2.0, 0.34, 0.26)]):
    P(name=f'Slab {i+1}', kind='box', pos=[x, G + 0.015, z], size=[w, 0.04, d], rot=[0, random.uniform(-14, 14), 0], color='#dcd2b4')

# ---- the big trunk behind the cabin
P(name='Big Trunk', kind='cylinder', pos=[0.1, 2.0, -1.55], size=[1.5, 3.6, 1.5], segments=8, taper=0.9, color='#b4613b')
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
rail('Front Rail', DX0 + 0.03, DZ1 - 0.03, 0.2, DZ1 - 0.03, 6)
rail('West Rail', DX0 + 0.03, DZ0 + 0.03, DX0 + 0.03, DZ1 - 0.03, 9)
rail('East Rail', DX1 - 0.03, DZ0 + 0.03, DX1 - 0.03, -0.25, 4)

# ---- stairs: one down to the right, one down to the front
def stairs(name, x, z, dx, dz, n, w):
    for i in range(n):
        top = DECK_Y - (i + 1) * ((DECK_Y - G) / (n + 0.4))
        hgt = top - G
        P(name=f'{name} Step {i+1}', kind='box', pos=[x + dx * (i + 1), G + hgt / 2, z + dz * (i + 1)], size=[0.3 if dx else w, round(hgt, 3), w if dx else 0.3], color='#cf9356' if i % 2 else '#c4874b')
stairs('Stairs East', DX1 + 0.1, 0.5, 0.27, 0, 7, 0.55)
stairs('Stairs Front', 0.8, DZ1 + 0.1, 0, 0.27, 6, 0.5)

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
    P(name=f'Window {i+1}', kind='box', pos=[wx, wy, CZ + CD / 2 + 0.036], size=[0.23, 0.23, 0.02], color='#d6b25a', mat={'glow': 0.5})
    P(name=f'Window Bar {i+1}', kind='box', pos=[wx, wy, CZ + CD / 2 + 0.05], size=[0.03, 0.23, 0.02], color='#f3ead4')
def gable(name, cx, cz, length, span, rise, y0, color):
    r0 = span / 1.732
    r1 = rise / 1.5
    yc = y0 + 0.5 * r1
    P(name=name, kind='sweep', rings=[{'p': r3([cx - length / 2, yc, cz]), 'r': [round(r0, 3), round(r1, 3)]}, {'p': r3([cx + length / 2, yc, cz]), 'r': [round(r0, 3), round(r1, 3)]}], sides=3, phase=90, start='flat', end='flat', color=color)
RISE = 0.95
gable('Roof', CX, CZ, CW + 0.2, CD + 0.35, RISE, WALL_Y + CH - 0.02, '#c9703a')
APEX = WALL_Y + CH - 0.02 + RISE
P(name='Roof Ridge', kind='box', pos=[CX, APEX + 0.005, CZ], size=[CW + 0.24, 0.06, 0.08], color='#8a4a22')
for i in range(5):
    t = (i + 1) / 6
    for sgn in (1, -1):
        P(name=f'Shingle Line {i+1}{" Back" if sgn < 0 else ""}', kind='box', pos=[CX, APEX - RISE * t - 0.012, CZ + sgn * (CD + 0.35) / 2 * t], size=[CW + 0.22, 0.03, 0.05], rot=[sgn * 54, 0, 0], color='#a35527')
# wing
WX = CX + CW / 2 + 0.38
P(name='Wing', kind='box', pos=[WX, WALL_Y + 0.4, CZ + 0.15], size=[0.8, 0.8, 0.9], color='#d49a5e')
gable('Wing Roof', WX, CZ + 0.15, 0.95, 1.2, 0.6, WALL_Y + 0.78, '#c9703a')
P(name='Chimney', kind='box', pos=[CX - 0.5, APEX - 0.1, CZ - 0.25], size=[0.16, 0.5, 0.16], color='#9a6a48')

# ---- pines (taller, four tiers)
def pine(name, x, z, h, w, c1, c2):
    tr = h * 0.18
    P(name=f'{name} Trunk', kind='cylinder', pos=[x, G + tr / 2, z], size=[0.12, tr, 0.12], segments=5, color='#7a4a28')
    layers = 4
    for i in range(layers):
        lh = (h - tr) / layers * 1.55
        y = G + tr + (h - tr) * (i / layers) + lh / 2 - 0.02
        wd = w * (1 - i * 0.2)
        P(name=f'{name} Layer {i+1}', kind='cone', pos=[x, y, z], size=[round(wd, 3), round(lh, 3), round(wd, 3)], segments=7, color=c1 if i % 2 == 0 else c2)
G1, G2, L1 = '#4a9a4c', '#62b256', '#9cbd5c'
pine('Pine A', -2.0, -0.35, 2.3, 1.2, G1, G2)
pine('Pine B', -1.7, 0.55, 1.9, 1.05, G2, G1)
pine('Pine C', -1.15, -1.5, 2.1, 1.1, L1, G2)
pine('Pine D', 1.95, -1.05, 2.3, 1.1, G1, G2)
pine('Pine E', 2.2, -0.2, 1.95, 1.0, G2, G1)
pine('Pine F', 1.55, -1.75, 1.9, 1.0, G1, G2)
pine('Pine G', -0.4, 1.95, 0.8, 0.5, G2, G1)
pine('Pine H', 1.9, 1.15, 0.9, 0.52, G1, G2)

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

LIFT = 0.2
for p in parts:
    if 'pos' in p: p['pos'][1] = round(p['pos'][1] + LIFT, 4)
    if 'center' in p: p['center'][1] = round(p['center'][1] + LIFT, 4)
    if 'rings' in p:
        for r in p['rings']: r['p'][1] = round(r['p'][1] + LIFT, 4)
spec = {"name": "Island", "rig": "none", "engine": "unity", "parts": parts}
json.dump(spec, open('examples/island.json', 'w'), indent=1)
print(len(parts), 'parts')
