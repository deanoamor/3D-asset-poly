import type { AssetDef, AssetPart } from '../assets';
import { FLIP, LR, add3, ball, band, box, face, frustum, headMesh, lerp3, limb, mirrorRot, part, tube, wedge } from './kit';
import type { Vec3 } from '../types';

const NAVY = '#22304f';
const NAVY_L = '#2e4170';
const SHIRT = '#4a6fb5';
const SHIRT_D = '#3a5a9a';
const SHIRT_L = '#6a8fd0';
const BLACK = '#1d2026';
const GRAY = '#3b3f46';
const GRAY_L = '#5a606a';
const GOLD = '#e6b422';
const SKIN = '#e8b58a';
const SKIN_D = '#d29a70';
const HAIR = '#3a2a20';

// joints (left side, +x)
const HIP: Vec3 = [0.1, 0.86, 0];
const KNEE: Vec3 = [0.12, 0.58, 0.03];
const ANKLE: Vec3 = [0.115, 0.37, -0.005];
const SHOULDER: Vec3 = [0.3, 1.34, 0];
const ELBOW: Vec3 = [0.39, 1.08, 0.05];
const WRIST: Vec3 = [0.4, 0.85, 0.17];
const HEAD: Vec3 = [0, 1.66, 0];

const side = (s: 1 | -1, p: Vec3): Vec3 => [p[0] * s, p[1], p[2]];

const parts: AssetPart[] = [
  // 0 boots
  ...LR('Boot Foot', (s, n) => box(0, n, [s * 0.115, 0.075, 0.07], [0.17, 0.15, 0.34], BLACK, { mesh: () => wedge(0.14) })),
  ...LR('Boot Sole', (s, n) => box(0, n, [s * 0.115, 0.018, 0.07], [0.185, 0.036, 0.365], GRAY)),
  ...LR('Boot Shaft', (s, n) => tube(0, n, [s * 0.115, 0.25, -0.01], [0.195, 0.22, 0.195], BLACK, 7, { taper: 0.9 })),
  ...LR('Boot Top', (s, n) => tube(0, n, [s * 0.115, 0.365, -0.01], [0.21, 0.04, 0.21], GRAY_L, 7)),
  ...LR('Boot Laces', (s, n) => box(0, n, [s * 0.115, 0.2, 0.093], [0.095, 0.17, 0.02], GRAY_L, { rot: [-14, 0, 0] })),
  // 1 legs and belt
  ...LR('Thigh', (s, n) => limb(1, n, side(s, HIP), side(s, KNEE), 0.225, 0.175, NAVY, 7)),
  ...LR('Shin', (s, n) => limb(1, n, side(s, KNEE), side(s, ANKLE), 0.175, 0.15, NAVY, 7)),
  ...LR('Knee Pad', (s, n) => ball(1, n, [s * 0.12, 0.58, 0.1], [0.14, 0.13, 0.08], NAVY_L, 5)),
  ...LR('Leg Stripe', (s, n) => box(1, n, [s * 0.215, 0.68, 0.01], [0.014, 0.28, 0.06], SHIRT_L, { rot: [0, 0, s * -4] })),
  part(1, 'Pelvis', 'box', [0, 0.86, 0], [0.42, 0.17, 0.27], NAVY, { mesh: () => frustum(1, 1, 1.04, 1.02) }),
  box(1, 'Belt', [0, 0.95, 0], [0.45, 0.075, 0.295], BLACK),
  box(1, 'Buckle', [0, 0.95, 0.15], [0.08, 0.06, 0.02], GOLD),
  box(1, 'Buckle Center', [0, 0.95, 0.162], [0.04, 0.03, 0.012], GRAY),
  // 2 shirt
  part(2, 'Torso', 'box', [0, 1.19, 0], [0.5, 0.5, 0.29], SHIRT, { mesh: () => frustum(0.82, 0.86, 1, 1) }),
  box(2, 'Placket', [0, 1.18, 0.148], [0.026, 0.46, 0.012], SHIRT_L),
  ...LR('Pocket', (s, n) => box(2, n, [s * 0.125, 1.26, 0.15], [0.105, 0.105, 0.02], SHIRT_D)),
  ...LR('Pocket Flap', (s, n) => box(2, n, [s * 0.125, 1.325, 0.152], [0.11, 0.028, 0.026], NAVY_L)),
  ...LR('Collar', (s, n) => box(2, n, [s * 0.065, 1.445, 0.135], [0.12, 0.07, 0.04], SHIRT_L, { rot: [14, 0, s * -30] })),
  box(2, 'Tie', [0, 1.29, 0.156], [0.055, 0.27, 0.02], NAVY),
  box(2, 'Tie Knot', [0, 1.42, 0.152], [0.06, 0.05, 0.034], NAVY_L),
  ...LR('Epaulette', (s, n) => box(2, n, [s * 0.285, 1.445, 0.0], [0.14, 0.03, 0.13], NAVY, { rot: [0, 0, s * -10] })),
  ...LR('Epaulette Stripe', (s, n) => box(2, n, [s * 0.285, 1.463, 0.0], [0.11, 0.012, 0.03], GOLD, { rot: [0, 0, s * -10] })),
  // 3 arms and hands
  ...LR('Upper Arm', (s, n) => limb(3, n, side(s, SHOULDER), side(s, ELBOW), 0.165, 0.135, SHIRT, 7)),
  ...LR('Elbow', (s, n) => ball(3, n, side(s, ELBOW), [0.14, 0.14, 0.14], SHIRT, 5)),
  ...LR('Forearm', (s, n) => limb(3, n, side(s, ELBOW), side(s, WRIST), 0.135, 0.11, SHIRT, 7)),
  ...LR('Cuff', (s, n) => band(3, n, side(s, ELBOW), side(s, WRIST), 0.9, 0.035, 0.125, NAVY, 7)),
  ...LR('Hand', (s, n) => ball(3, n, add3(side(s, WRIST), [0.005, -0.06, 0.035]), [0.115, 0.125, 0.105], SKIN, 5)),
  ...LR('Thumb', (s, n) => box(3, n, add3(side(s, WRIST), [-s * 0.045, -0.055, 0.075]), [0.04, 0.075, 0.045], SKIN, { rot: [-20, 0, s * 12] })),
  // 4 head and face
  tube(4, 'Neck', [0, 1.49, 0], [0.135, 0.11, 0.135], SKIN, 6),
  part(4, 'Head', 'sphere', HEAD, [0.35, 0.39, 0.36], SKIN, { mesh: headMesh }),
  ...LR('Ear', (s, n) => ball(4, n, [s * 0.178, 1.655, -0.005], [0.06, 0.1, 0.065], SKIN, 5)),
  ...face(4, HEAD, 1.08, SKIN_D, HAIR, { eyeY: 0.02 }),
  box(4, 'Mustache', [0, 1.592, 0.176], [0.15, 0.04, 0.05], HAIR, { mesh: () => frustum(0.8, 1, 1, 1) }),
  // 5 hair and cap
  ball(5, 'Hair', [0, 1.7, -0.025], [0.375, 0.22, 0.385], HAIR, 7),
  tube(5, 'Cap Band', [0, 1.79, 0], [0.395, 0.055, 0.385], BLACK, 8),
  tube(5, 'Cap Crown', [0, 1.875, 0], [0.42, 0.125, 0.405], NAVY, 8, { taper: 0.86, rot: [FLIP, 0, 0] }),
  tube(5, 'Cap Top', [0, 1.945, 0], [0.425, 0.022, 0.41], NAVY_L, 8),
  box(5, 'Cap Peak', [0, 1.775, 0.215], [0.31, 0.024, 0.17], BLACK, { rot: [12, 0, 0], mesh: () => frustum(1, 1, 0.8, 0.9) }),
  box(5, 'Cap Badge', [0, 1.87, 0.212], [0.085, 0.09, 0.02], GOLD, { rot: [-4, 0, 0] }),
  box(5, 'Cap Badge Center', [0, 1.87, 0.224], [0.04, 0.045, 0.012], SHIRT_L),
  // 6 gear
  box(6, 'Holster', [-0.245, 0.8, 0.02], [0.09, 0.22, 0.11], BLACK),
  box(6, 'Holster Grip', [-0.245, 0.935, 0.03], [0.045, 0.085, 0.06], GRAY),
  tube(6, 'Baton', [0.245, 0.75, 0.05], [0.042, 0.36, 0.042], BLACK, 6, { rot: [0, 0, -4] }),
  tube(6, 'Baton Grip', [0.241, 0.9, 0.05], [0.048, 0.08, 0.048], GRAY_L, 6, { rot: [0, 0, -4] }),
  box(6, 'Cuffs Pouch', [0.1, 0.92, -0.16], [0.11, 0.1, 0.06], BLACK),
  box(6, 'Chest Badge', [0.135, 1.2, 0.152], [0.085, 0.1, 0.02], GOLD),
  box(6, 'Badge Star', [0.135, 1.2, 0.163], [0.045, 0.055, 0.012], GRAY_L),
  box(6, 'Name Tag', [-0.125, 1.2, 0.152], [0.11, 0.03, 0.02], BLACK),
  box(6, 'Radio', [-0.185, 1.37, 0.14], [0.075, 0.125, 0.06], BLACK),
  limb(6, 'Antenna', [-0.185, 1.43, 0.14], [-0.2, 1.56, 0.13], 0.016, 0.01, BLACK, 5),
];

export const POLICE: AssetDef = {
  id: 'police',
  name: 'Police Officer',
  tagline: 'A detailed character: tapered limbs, a face, a uniform and gear',
  level: 'Medium',
  thumb: { dir: [0.55, 0.22, 1], zoom: 1.0 },
  learn: ['Build tapered arms and legs between two points', 'Reshape a sphere into a head with a jaw', 'Layer collar, tie, pockets and badges on a shirt', 'Add gear that tells the story (belt, baton, radio)'],
  steps: [
    { title: 'Boots', text: 'Each boot is five parts. The foot is a Box reshaped with Edit shape so the toe slopes down. Under it goes a thin lighter sole, then a Cylinder with 7 sides for the shaft, a lighter ring on top, and a flat plate for the laces. Chunky boots are what give low-poly characters their stance.', tools: ['Shape: Cylinder, 7 sides', 'Edit shape: lower the toe points', 'Thin boxes for soles and laces'] },
    { title: 'Legs and belt', text: 'Legs are tapered Cylinders: wide at the hip, narrower at the ankle. Lower the Top size slider and rotate the cylinder so it points from the hip to the knee. A sphere with 5 sides makes the knee pad. The pelvis is a box a little wider at the top, with a black belt and a gold buckle.', tools: ['Cylinder: Top size slider', 'Rotate (E)', 'Duplicate Ctrl+D', 'Shape: Sphere, 5 sides'] },
    { title: 'Shirt', text: 'The shirt starts as a Box. In Edit shape, select the bottom face and scale it smaller so the shoulders are wider than the waist. Then layer thin boxes: a placket down the middle, two pockets with flaps, tilted collar pieces, a tie with a knot, and shoulder boards with a gold stripe.', tools: ['Edit shape: select a face, Size (R)', 'Thin boxes for layers', 'Rotate (E) for the collar'] },
    { title: 'Arms and hands', text: 'Arms use the same trick as legs, but bent: the upper arm runs from shoulder to elbow and the forearm from elbow to wrist. A small sphere hides the joint. Hands are 5-sided spheres with a small box for the thumb. Rolling a cuff ring around the wrist adds a neat uniform detail.', tools: ['Cylinder: Top size', 'Bend by using two parts', 'Shape: Sphere, 5 sides'] },
    { title: 'Head and face', text: 'The head is a Sphere with 8 sides. In Edit shape the lower points are pulled in to make a jaw. Features sit just on the surface: white eye spheres with smaller dark pupils, angled eyebrows, a Pyramid for the nose turned to point forward, a thin mouth and a mustache. Big eyes give the cartoon feel.', tools: ['Edit shape: move points', 'Mirror for symmetrical edits', 'Shape: Pyramid + Rotate', 'Small parts = expression'] },
    { title: 'Hair and cap', text: 'Hair is a flattened sphere (squash it with the Size handles) peeking out under the cap. The cap has four parts: a dark band, a crown that is wider at the top (an upside-down cylinder with a lowered Top size), a lighter top disc, and a flat peak in front. A gold badge goes on the front.', tools: ['Squash with Size (R)', 'Cylinder: 8 sides + Top size', 'Rotation X 180°'] },
    { title: 'Gear', text: 'Gear tells you who this is: a holster on one side and a baton on the other, a pouch at the back, a gold chest badge with a star, a name tag, and a radio with an antenna on the shoulder. Name every part in Layers, then group them as Police Officer.', tools: ['Rename in Layers', 'Group Ctrl+G', 'Color palette'] },
  ],
  challenge: 'Make a detective: remove the cap, add a hat with a wide brim, and change the uniform to a long coat using a bigger Box around the torso.',
  parts,
};
void mirrorRot;
void lerp3;
