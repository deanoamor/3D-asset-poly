# Generates examples/cipher-machine.json: a desk encryption machine seen from above (used by the deanoamor/encrypt app).
#   python3 examples/cipher-machine.gen.py
#   node scripts/studio.mjs make examples/cipher-machine.json --out out/cipher --views top,3q,front,angle:0:70
# Faces +Z (the keyboard is at the front). Parts the app animates have fixed names:
#   Key <A-Z>, Key Space, Key Enter          pressed down while typing
#   Rotor 1 Wheel .. Rotor 4 Wheel (groups)  step rotors, turn around X
#   Object Dial (group)                      step 2, turns around Y to one of 50 notches
#   Color Lamp, Color Ring <n>               step 3, the lamp takes the chosen colour
#   Joystick (group)                         step 4, tilts toward the chosen direction
#   Step Lamp 1..4, Lamp Ok, Lamp Error      indicator lamps (the app makes them glow)
#   Crank (group)                            turns while the machine works
#   Paper Spool (group), Paper Tape          output (the group turns around Z, the roll's own axis)
import json, math

parts, groups = [], []
def P(**k): parts.append(k)
def G(name, pivot, spin=None):
    g = dict(name=name, pivot=[round(v, 4) for v in pivot])
    if spin: g['spin'] = spin
    groups.append(g)

WOOD, WOOD2, WOOD3 = '#6b3f22', '#7d4a28', '#4e2c17'
PLATE, PLATE2 = '#2a2e35', '#353a43'
BRASS, BRASS2 = '#c9a24a', '#a8842f'
STEEL, STEEL2 = '#9aa3ad', '#6f7882'
KEYCAP, KEYRIM = '#ece4d0', '#2b2b2b'
BLACK = '#1d1f23'
METAL = dict(rough=0.35, metal=0.8)
SHINY = dict(rough=0.25, metal=0.9)

W, D, H = 0.66, 0.50, 0.11       # case width (x), depth (z), height (y)
TOP = H + 0.012                  # top of the face plate

# ---- case
P(name='Case', kind='box', pos=[0, H / 2, 0], size=[W, H, D], color=WOOD, paint=0.25)
P(name='Case Base', kind='box', pos=[0, 0.008, 0], size=[W + 0.02, 0.016, D + 0.02], color=WOOD3)
P(name='Case Rim Front', kind='box', pos=[0, H + 0.004, D / 2 - 0.01], size=[W, 0.012, 0.02], color=WOOD2)
P(name='Case Rim Back', kind='box', pos=[0, H + 0.004, -D / 2 + 0.01], size=[W, 0.012, 0.02], color=WOOD2)
P(name='Case Rim Left', kind='box', pos=[W / 2 - 0.01, H + 0.004, 0], size=[0.02, 0.012, D], color=WOOD2, mirror=True)
for sx in (1, -1):
    for sz in (1, -1):
        P(name=f'Corner {"L" if sx > 0 else "R"}{"F" if sz > 0 else "B"}', kind='box', pos=[sx * (W / 2 - 0.004), H / 2, sz * (D / 2 - 0.004)], size=[0.03, H + 0.004, 0.03], color=BRASS2, mat=METAL)
P(name='Face Plate', kind='box', pos=[0, H + 0.006, 0], size=[W - 0.04, 0.012, D - 0.04], color=PLATE, mat=dict(rough=0.6, metal=0.3))
# plate screws
for i, (x, z) in enumerate([(-0.298, -0.22), (0.298, -0.22), (-0.298, 0.22), (0.298, 0.22)]):
    P(name=f'Screw {i+1}', kind='cylinder', pos=[x, TOP + 0.002, z], size=[0.012, 0.005, 0.012], segments=8, color=BRASS, mat=METAL)

# ---- keyboard (front): three staggered QWERTY rows of round typewriter keys, space bar
KZ0 = 0.035
PITCH = 0.037
rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
P(name='Key Bed', kind='box', pos=[0, TOP + 0.002, 0.11], size=[0.42, 0.004, 0.2], color=PLATE2)
for r, row in enumerate(rows):
    z = KZ0 + r * 0.047
    x0 = -(len(row) - 1) * PITCH / 2 + r * 0.012
    for i, ch in enumerate(row):
        x = x0 + i * PITCH
        P(name=f'Key {ch} Stem', kind='cylinder', pos=[x, TOP + 0.01, z], size=[0.008, 0.02, 0.008], segments=6, color=STEEL2, mat=METAL)
        P(name=f'Key {ch} Rim', kind='cylinder', pos=[x, TOP + 0.022, z], size=[0.033, 0.008, 0.033], segments=14, color=STEEL, mat=SHINY)
        P(name=f'Key {ch}', kind='cylinder', pos=[x, TOP + 0.026, z], size=[0.028, 0.006, 0.028], segments=14, color=KEYCAP, smooth=True)
# space bar and enter
P(name='Key Space Stem', kind='box', pos=[0, TOP + 0.01, 0.185], size=[0.2, 0.02, 0.01], color=STEEL2, mat=METAL)
P(name='Key Space Rim', kind='box', pos=[0, TOP + 0.02, 0.185], size=[0.25, 0.008, 0.03], color=STEEL, mat=SHINY)
P(name='Key Space', kind='box', pos=[0, TOP + 0.025, 0.185], size=[0.24, 0.006, 0.022], color=KEYCAP)
P(name='Key Enter Stem', kind='cylinder', pos=[0.205, TOP + 0.01, 0.155], size=[0.012, 0.02, 0.012], segments=6, color=STEEL2, mat=METAL)
P(name='Key Enter Rim', kind='cylinder', pos=[0.205, TOP + 0.022, 0.155], size=[0.05, 0.008, 0.05], segments=16, color=BRASS, mat=SHINY)
P(name='Key Enter', kind='cylinder', pos=[0.205, TOP + 0.026, 0.155], size=[0.042, 0.007, 0.042], segments=16, color='#b8322a', smooth=True)

# ---- the four step rotors (back left): wheels turning around X, seen through a window
RZ = -0.135
RX = [-0.235, -0.175, -0.115, -0.055]
P(name='Rotor Window', kind='box', pos=[-0.145, TOP + 0.001, RZ], size=[0.25, 0.004, 0.105], color=BLACK)
P(name='Rotor Frame Front', kind='box', pos=[-0.145, TOP + 0.006, RZ + 0.056], size=[0.26, 0.01, 0.01], color=BRASS, mat=METAL)
P(name='Rotor Frame Back', kind='box', pos=[-0.145, TOP + 0.006, RZ - 0.056], size=[0.26, 0.01, 0.01], color=BRASS, mat=METAL)
P(name='Rotor Axle', kind='cylinder', pos=[-0.145, TOP + 0.01, RZ], size=[0.008, 0.26, 0.008], rot=[0, 0, 90], segments=6, color=STEEL, mat=METAL)
for i, x in enumerate(RX):
    n = i + 1
    G(f'Rotor {n} Wheel', [x, TOP + 0.01, RZ])
    P(name=f'Rotor {n} Drum', kind='cylinder', pos=[x, TOP + 0.01, RZ], size=[0.085, 0.04, 0.085], rot=[0, 0, 90], segments=26, color='#d9cfb4', group=f'Rotor {n} Wheel')
    for k in range(6):
        a = k / 6 * 2 * math.pi
        P(name=f'Rotor {n} Rib {k+1}', kind='box', pos=[x, TOP + 0.01 + math.sin(a) * 0.043, RZ + math.cos(a) * 0.043], size=[0.042, 0.005, 0.012], rot=[-math.degrees(a), 0, 0], color='#3b3427', group=f'Rotor {n} Wheel')
    P(name=f'Rotor {n} Ring A', kind='cylinder', pos=[x + 0.023, TOP + 0.01, RZ], size=[0.092, 0.006, 0.092], rot=[0, 0, 90], segments=20, color=BRASS, mat=METAL, group=f'Rotor {n} Wheel')
    P(name=f'Rotor {n} Ring B', kind='cylinder', pos=[x - 0.023, TOP + 0.01, RZ], size=[0.092, 0.006, 0.092], rot=[0, 0, 90], segments=20, color=BRASS, mat=METAL, group=f'Rotor {n} Wheel')
    # step lamp in front of each rotor
    P(name=f'Step Lamp {n} Bezel', kind='cylinder', pos=[x, TOP + 0.004, RZ + 0.078], size=[0.024, 0.006, 0.024], segments=12, color=BRASS, mat=METAL)
    P(name=f'Step Lamp {n}', kind='sphere', pos=[x, TOP + 0.008, RZ + 0.078], size=[0.016, 0.012, 0.016], segments=10, color='#5a4a1a', smooth=True)
    # roman numeral plates behind
    P(name=f'Rotor {n} Plate', kind='box', pos=[x, TOP + 0.003, RZ - 0.075], size=[0.04, 0.004, 0.018], color=BRASS, mat=METAL)

# ---- step 2: the object dial (back right): a turntable with 50 notches and a pointer
DX, DZ = 0.165, -0.12
G('Object Dial', [DX, TOP, DZ])
P(name='Object Dial Base', kind='cylinder', pos=[DX, TOP + 0.003, DZ], size=[0.19, 0.006, 0.19], segments=32, color=BRASS2, mat=METAL)
P(name='Object Dial Disc', kind='cylinder', pos=[DX, TOP + 0.01, DZ], size=[0.17, 0.01, 0.17], segments=50, color='#e9e2cf', group='Object Dial')
for k in range(50):
    a = k / 50 * 2 * math.pi
    big = k % 5 == 0
    r = 0.072 if big else 0.076
    P(name=f'Object Notch {k+1}', kind='box', pos=[DX + math.sin(a) * r, TOP + 0.016, DZ - math.cos(a) * r], size=[0.003, 0.003, 0.016 if big else 0.008], rot=[0, -math.degrees(a), 0], color='#2b2b2b', group='Object Dial')
P(name='Object Dial Hub', kind='cylinder', pos=[DX, TOP + 0.02, DZ], size=[0.05, 0.012, 0.05], segments=16, color=BRASS, mat=SHINY, group='Object Dial')
P(name='Object Dial Grip', kind='box', pos=[DX, TOP + 0.03, DZ], size=[0.012, 0.012, 0.05], color=BLACK, group='Object Dial')
P(name='Object Dial Mark', kind='cylinder', pos=[DX, TOP + 0.017, DZ - 0.058], size=[0.012, 0.004, 0.012], segments=8, color='#b8322a', group='Object Dial')
P(name='Object Pointer', kind='pyramid', pos=[DX, TOP + 0.016, DZ - 0.098], size=[0.018, 0.012, 0.018], rot=[180, 0, 0], color='#b8322a')

# ---- step 3: the colour lamp, a glass dome inside a ring of 24 hues (right middle)
CX, CZ = 0.25, 0.035
P(name='Color Ring Base', kind='cylinder', pos=[CX, TOP + 0.003, CZ], size=[0.1, 0.006, 0.1], segments=24, color=BLACK)
for k in range(24):
    a = k / 24 * 2 * math.pi
    h = k / 24
    # hsv -> rgb, s = 0.85, v = 0.95
    i6 = int(h * 6); f = h * 6 - i6; v = 0.95; s = 0.85
    p_, q_, t_ = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    rgb = [(v, t_, p_), (q_, v, p_), (p_, v, t_), (p_, q_, v), (t_, p_, v), (v, p_, q_)][i6 % 6]
    col = '#%02x%02x%02x' % tuple(int(c * 255) for c in rgb)
    P(name=f'Color Ring {k+1}', kind='box', pos=[CX + math.sin(a) * 0.041, TOP + 0.008, CZ - math.cos(a) * 0.041], size=[0.009, 0.005, 0.014], rot=[0, -math.degrees(a), 0], color=col)
P(name='Color Lamp Bezel', kind='cylinder', pos=[CX, TOP + 0.008, CZ], size=[0.056, 0.01, 0.056], segments=20, color=BRASS, mat=SHINY)
P(name='Color Lamp', kind='sphere', pos=[CX, TOP + 0.014, CZ], size=[0.046, 0.036, 0.046], segments=14, color='#f2efe6', smooth=True, mat=dict(rough=0.15, metal=0.0))

# ---- step 4: direction joystick with four arrow buttons (left middle)
JX, JZ = -0.25, 0.02
P(name='Joystick Base', kind='cylinder', pos=[JX, TOP + 0.006, JZ], size=[0.075, 0.012, 0.075], segments=20, color=BLACK)
P(name='Joystick Boot', kind='cylinder', pos=[JX, TOP + 0.016, JZ], size=[0.04, 0.014, 0.04], segments=12, taper=0.6, color='#2f3238')
G('Joystick', [JX, TOP + 0.012, JZ])
P(name='Joystick Shaft', kind='cylinder', pos=[JX, TOP + 0.04, JZ], size=[0.009, 0.05, 0.009], segments=8, color=STEEL, mat=SHINY, group='Joystick')
P(name='Joystick Knob', kind='sphere', pos=[JX, TOP + 0.068, JZ], size=[0.028, 0.026, 0.028], segments=12, color='#b8322a', smooth=True, group='Joystick')
for nm, dx, dz, ry in [('Up', 0, -1, 0), ('Down', 0, 1, 180), ('West', -1, 0, 90), ('East', 1, 0, -90)]:
    P(name=f'Arrow {nm}', kind='pyramid', pos=[JX + dx * 0.05, TOP + 0.006, JZ + dz * 0.05], size=[0.016, 0.008, 0.016], rot=[90 if dz == 0 else 0, ry, 0], color=BRASS, mat=METAL)

# ---- status lamps and the crank (right front)
for nm, x, col in [('Ok', -0.245, '#1e5a2a'), ('Error', -0.195, '#5a1e1e')]:
    P(name=f'Lamp {nm} Bezel', kind='cylinder', pos=[x, TOP + 0.004, 0.2], size=[0.03, 0.008, 0.03], segments=14, color=BRASS, mat=METAL)
    P(name=f'Lamp {nm}', kind='sphere', pos=[x, TOP + 0.01, 0.2], size=[0.022, 0.016, 0.022], segments=10, color=col, smooth=True)
# crank on the right side of the case, turning around X
G('Crank', [W / 2 + 0.012, H * 0.62, 0.08])
P(name='Crank Hub', kind='cylinder', pos=[W / 2 + 0.012, H * 0.62, 0.08], size=[0.04, 0.024, 0.04], rot=[0, 0, 90], segments=14, color=BRASS, mat=SHINY, group='Crank')
P(name='Crank Arm', kind='box', pos=[W / 2 + 0.028, H * 0.62, 0.115], size=[0.012, 0.016, 0.08], color=STEEL, mat=SHINY, group='Crank')
P(name='Crank Handle', kind='cylinder', pos=[W / 2 + 0.05, H * 0.62, 0.15], size=[0.018, 0.04, 0.018], rot=[0, 0, 90], segments=10, color=WOOD3, smooth=True, group='Crank')

# ---- output: a paper roll on the left side and the tape running out of a slot at the back
G('Paper Spool', [-W / 2 - 0.035, H * 0.7, -0.12])
P(name='Paper Roll Arm', kind='box', pos=[-W / 2 - 0.012, H * 0.6, -0.12], size=[0.026, 0.02, 0.02], color=STEEL2, mat=METAL)
P(name='Paper Roll', kind='cylinder', pos=[-W / 2 - 0.035, H * 0.7, -0.12], size=[0.06, 0.12, 0.06], rot=[90, 0, 0], segments=18, color='#f4efe2', smooth=True, group='Paper Spool')
P(name='Paper Roll Core', kind='cylinder', pos=[-W / 2 - 0.035, H * 0.7, -0.12], size=[0.022, 0.124, 0.022], rot=[90, 0, 0], segments=10, color=BRASS2, group='Paper Spool')
P(name='Paper Slot', kind='box', pos=[-0.02, TOP + 0.004, -0.232], size=[0.2, 0.008, 0.01], color=BLACK)
P(name='Paper Tape', kind='box', pos=[-0.02, TOP + 0.002, -0.265], size=[0.18, 0.002, 0.075], color='#f4efe2')
P(name='Name Plate', kind='box', pos=[0.02, TOP + 0.003, 0.215], size=[0.2, 0.004, 0.022], color=BRASS, mat=SHINY)

spec = dict(name='Cipher Machine', rig='none', groups=groups, parts=parts)
for p in spec['parts']:
    for k in ('pos', 'size', 'rot'):
        if k in p: p[k] = [round(v, 4) for v in p[k]]
with open(__file__.replace('.gen.py', '.json'), 'w') as f:
    json.dump(spec, f, indent=1)
print(f'{len(parts)} parts, {len(groups)} groups')
