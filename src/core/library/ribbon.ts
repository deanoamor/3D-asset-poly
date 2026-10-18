import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { hull, ringPts, slab, strip, tubeHull } from './lowpoly';
import { toPart } from './organic';
import { HUMAN, humanSpec } from './rigs';

/**
 * A hard-edged low-poly girl: blond bob with a pointed fringe, two big red ribbon triangles, a dark top with cyan
 * lines, a faceted red skirt with long side panels, dark stockings and pointed red boots. Every shape is the hull of
 * a few points, so the faces are big and flat. Left is +X, Right is -X, and she faces +Z.
 */

const SKIN = '#dccdbf';
const SKIN_L = '#e9ddd0';
const SKIN_D = '#c8b7a7';
const HAIR_T = '#f1cc55';
const HAIR_L = '#f8dd78';
const HAIR_S = '#dcae3a';
const HAIR_B = '#c8962c';
const TOP = '#4b4b51';
const TOP_D = '#36363b';
const CYAN = '#3fd5e6';
const RED = '#cf3c32';
const RED_D = '#a92b25';
const RED_L = '#e0584a';
const LEG = '#59595f';
const BOOT = '#cc2b27';
const BOOT_D = '#9c1d1b';
const EYE = '#8b1a1c';
const LID = '#1b1b1d';
const LIP = '#a85f58';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const P = (x: number, y: number, z: number): Vec3 => [x, y, z];
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sides = [1, -1] as const;
const nameOf = (s: 1 | -1) => (s === 1 ? 'Left' : 'Right');

// ---- 0 legs and boots ----
add(0, 'Hips', hull([P(-0.11, 0.96, -0.07), P(0.11, 0.96, -0.07), P(-0.11, 0.96, 0.07), P(0.11, 0.96, 0.07), P(-0.1, 0.84, -0.07), P(0.1, 0.84, -0.07), P(-0.1, 0.84, 0.07), P(0.1, 0.84, 0.07)]), TOP_D);
for (const s of sides) {
  const n = nameOf(s);
  const hip = P(s * 0.085, 0.92, 0);
  const knee = P(s * 0.1, 0.4, 0.012);
  const ankle = P(s * 0.135, 0.12, 0);
  add(0, `Thigh ${n}`, tubeHull(hip, knee, 0.065, 0.045, 5), LEG);
  add(0, `Knee Guard ${n}`, tubeHull(P(knee[0], 0.44, 0.012), P(knee[0], 0.36, 0.014), 0.056, 0.056, 5), SKIN_L);
  add(0, `Shin ${n}`, tubeHull(P(knee[0], 0.37, 0.012), ankle, 0.046, 0.034, 5), LEG);
  add(0, `Ankle ${n}`, tubeHull(P(ankle[0], 0.24, 0), P(ankle[0] + s * 0.004, 0.13, 0), 0.036, 0.038, 5), SKIN_L);
  const x = ankle[0];
  add(0, `Boot ${n}`, hull([P(x - 0.038, 0.1, -0.04), P(x + 0.038, 0.1, -0.04), P(x - 0.038, 0.1, 0.04), P(x + 0.038, 0.1, 0.04), P(x - 0.04, 0, -0.065), P(x + 0.04, 0, -0.065), P(x - 0.04, 0, 0.03), P(x + 0.04, 0, 0.03), P(x - 0.025, 0, 0.2), P(x + 0.025, 0, 0.2)]), BOOT);
  add(0, `Boot Cuff ${n}`, tubeHull(P(x, 0.13, 0), P(x, 0.1, 0), 0.046, 0.046, 5), BOOT_D);
  add(0, `Boot Toe ${n}`, hull([P(x - 0.025, 0.012, 0.05), P(x + 0.025, 0.012, 0.05), P(x - 0.025, 0.0, 0.2), P(x + 0.025, 0.0, 0.2), P(x, 0.05, 0.1)]), BOOT_D);
}

// ---- 1 body: top, collar and chest lines ----
add(1, 'Torso', hull([P(-0.14, 1.09, -0.08), P(0.14, 1.09, -0.08), P(-0.14, 1.09, 0.08), P(0.14, 1.09, 0.08), P(-0.105, 0.94, -0.07), P(0.105, 0.94, -0.07), P(-0.105, 0.94, 0.07), P(0.105, 0.94, 0.07)]), TOP);
add(1, 'Chest Plate', hull([P(-0.1, 1.07, 0.082), P(0.1, 1.07, 0.082), P(-0.075, 0.96, 0.07), P(0.075, 0.96, 0.07), P(-0.1, 1.07, 0.094), P(0.1, 1.07, 0.094), P(-0.075, 0.96, 0.08), P(0.075, 0.96, 0.08)]), TOP_D);
add(1, 'Collar', tubeHull(P(0, 1.11, 0), P(0, 1.16, 0), [0.085, 0.07], [0.058, 0.052], 6), TOP_D);
add(1, 'Belt', tubeHull(P(0, 0.935, 0), P(0, 0.965, 0), [0.112, 0.082], [0.112, 0.082], 6), TOP_D);
add(1, 'Belt Buckle', slab([P(-0.025, 0.98, 0.09), P(0.025, 0.98, 0.09), P(0.025, 0.925, 0.09), P(-0.025, 0.925, 0.09)], 0.016), '#26262a');
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Chest Line ${n}`, strip([s * 0.064, 1.14], [s * 0.064, 1.01], 0.013, 0.096), CYAN);
  add(1, `Chest Diagonal ${n}`, strip([s * 0.064, 1.01], [s * 0.02, 0.965], 0.013, 0.096), CYAN);
}

// ---- 2 arms: the Left one is raised a little, as in the picture ----
const ARMS: Record<1 | -1, { S: Vec3; E: Vec3; W: Vec3; F: Vec3 }> = {
  1: { S: P(0.14, 1.04, 0), E: P(0.265, 0.9, 0.015), W: P(0.38, 0.83, 0.03), F: P(0.45, 0.8, 0.04) },
  [-1]: { S: P(-0.14, 1.04, 0), E: P(-0.25, 0.86, 0.01), W: P(-0.35, 0.72, 0.03), F: P(-0.41, 0.68, 0.04) },
};
for (const s of sides) {
  const n = nameOf(s);
  const { S, E, W, F } = ARMS[s];
  const cut = lerp(S, E, 0.5);
  add(2, `Sleeve ${n}`, tubeHull(P(S[0] - s * 0.01, S[1] + 0.01, 0), cut, 0.066, 0.058, 5), TOP);
  add(2, `Sleeve Cuff ${n}`, tubeHull(lerp(S, E, 0.46), lerp(S, E, 0.55), 0.06, 0.06, 5), TOP_D);
  add(2, `Upper Arm ${n}`, tubeHull(lerp(S, E, 0.5), E, 0.044, 0.04, 5), SKIN);
  add(2, `Forearm ${n}`, tubeHull(E, W, 0.04, 0.032, 5), SKIN);
  add(2, `Hand ${n}`, tubeHull(W, F, [0.034, 0.02], [0.02, 0.012], 4), SKIN_L);
  add(2, `Thumb ${n}`, tubeHull(lerp(W, F, 0.15) , P(lerp(W, F, 0.5)[0], lerp(W, F, 0.5)[1] + 0.03, lerp(W, F, 0.5)[2] + 0.025), 0.014, 0.008, 4), SKIN_L);
}
add(2, 'Neck', tubeHull(P(0, 1.2, 0), P(0, 1.1, 0), 0.042, 0.05, 6), SKIN);

// ---- 3 head and face ----
const HC = 0.01;
const skull = [
  ...ringPts(P(0, 1.27, 0.06), [0, 1, 0], 0.05, 0.05, 8, 0),
  ...ringPts(P(0, 1.34, HC), [0, 1, 0], 0.12, 0.115, 8, 0),
  ...ringPts(P(0, 1.44, HC), [0, 1, 0], 0.14, 0.14, 8, 0),
  ...ringPts(P(0, 1.55, HC), [0, 1, 0], 0.13, 0.13, 8, 0),
];
add(3, 'Head', hull(skull), SKIN);
for (const s of sides) {
  const n = nameOf(s);
  add(3, `Eye ${n}`, slab([P(s * 0.07, 1.385, 0.13), P(s * 0.035, 1.385, 0.135), P(s * 0.035, 1.345, 0.135), P(s * 0.07, 1.345, 0.13)], 0.012), EYE);
  add(3, `Eye Lid ${n}`, strip([s * 0.08, 1.395], [s * 0.03, 1.4], 0.012, 0.138), LID);
  add(3, `Ear ${n}`, hull([P(s * 0.135, 1.42, -0.01), P(s * 0.15, 1.38, 0.0), P(s * 0.135, 1.34, -0.01), P(s * 0.125, 1.4, 0.03)]), SKIN_D);
}
add(3, 'Nose', hull([P(-0.012, 1.34, 0.136), P(0.012, 1.34, 0.136), P(0, 1.31, 0.15), P(0, 1.35, 0.14)]), SKIN_D);
add(3, 'Mouth', strip([-0.03, 1.285], [0.03, 1.292], 0.012, 0.126), LIP);

// ---- 4 hair and ribbons ----
add(4, 'Hair Top', hull([...ringPts(P(0, 1.66, 0), [0, 1, 0], 0.085, 0.085, 8, 0), ...ringPts(P(0, 1.6, -0.005), [0, 1, 0], 0.16, 0.16, 8, 0), ...ringPts(P(0, 1.55, -0.01), [0, 1, 0], 0.19, 0.185, 8, 0), ...ringPts(P(0, 1.47, -0.015), [0, 1, 0], 0.185, 0.18, 8, 0)]), HAIR_T);
add(4, 'Hair Back', hull([P(-0.17, 1.5, -0.05), P(0.17, 1.5, -0.05), P(0, 1.5, -0.19), P(-0.15, 1.2, -0.04), P(0.15, 1.2, -0.04), P(0, 1.12, -0.12), P(0, 1.26, -0.17)]), HAIR_B);
add(4, 'Hair Nape', hull([P(-0.12, 1.3, -0.1), P(0.12, 1.3, -0.1), P(0, 1.3, -0.16), P(-0.06, 1.14, -0.1), P(0.06, 1.14, -0.1)]), HAIR_B);
for (const s of sides) {
  const n = nameOf(s);
  const tip = s === 1 ? P(0.205, 1.15, 0.06) : P(-0.25, 1.1, 0.05);
  add(4, `Side Hair ${n}`, hull([P(s * 0.14, 1.49, 0.12), P(s * 0.2, 1.49, 0.0), P(s * 0.17, 1.49, -0.1), P(s * 0.17, 1.22, 0.1), P(s * 0.22, 1.24, -0.02), tip]), HAIR_S);
  add(4, `Side Strand ${n}`, hull([P(s * 0.15, 1.46, 0.14), P(s * 0.195, 1.44, 0.1), P(s * 0.17, 1.24, 0.13), P(tip[0] * 0.94, tip[1] + 0.04, 0.12)]), HAIR_L);
  add(4, `Back Strand ${n}`, hull([P(s * 0.12, 1.3, -0.13), P(s * 0.17, 1.28, -0.06), P(s * 0.15, 1.12, -0.1), P(s * 0.12, 1.06, -0.1)]), HAIR_B);
}
[-0.12, -0.06, 0, 0.06, 0.12].forEach((x, i) => {
  const tipY = 1.43 + Math.abs(x) * 0.25;
  add(4, `Bang ${i + 1}`, hull([P(x - 0.036, 1.53, 0.14), P(x + 0.036, 1.53, 0.14), P(x - 0.034, 1.5, 0.18), P(x + 0.034, 1.5, 0.18), P(x, tipY, 0.178)]), i % 2 ? HAIR_T : HAIR_L);
});
add(4, 'Ribbon Left', slab([P(0.245, 1.88, -0.02), P(0.285, 1.8, -0.02), P(0.15, 1.62, -0.02)], 0.014), RED_D);
add(4, 'Ribbon Right', slab([P(-0.49, 1.71, -0.02), P(-0.25, 1.87, -0.02), P(-0.14, 1.62, -0.02)], 0.016), RED);
add(4, 'Ribbon Knot Left', hull([P(0.12, 1.64, -0.04), P(0.19, 1.62, -0.04), P(0.12, 1.58, 0.0), P(0.19, 1.58, 0.0), P(0.155, 1.67, -0.01)]), RED_D);
add(4, 'Ribbon Knot Right', hull([P(-0.12, 1.64, -0.04), P(-0.19, 1.62, -0.04), P(-0.12, 1.58, 0.0), P(-0.19, 1.58, 0.0), P(-0.155, 1.67, -0.01)]), RED_D);

// ---- 5 skirt ----
add(5, 'Skirt Front', hull([...ringPts(P(0, 0.95, 0), [0, 1, 0], 0.115, 0.085, 6, 0), ...ringPts(P(0, 0.83, 0), [0, 1, 0], 0.215, 0.15, 6, 0), P(0, 0.62, 0.17), P(0, 0.66, -0.12), P(0.12, 0.68, 0), P(-0.12, 0.68, 0)]), RED);
add(5, 'Skirt Under', hull([...ringPts(P(0, 0.86, 0), [0, 1, 0], 0.15, 0.11, 6, 0), ...ringPts(P(0, 0.78, 0), [0, 1, 0], 0.23, 0.17, 6, 0), P(0, 0.56, 0.1), P(0.17, 0.63, 0), P(-0.17, 0.63, 0), P(0, 0.6, -0.14)]), RED_D);
add(5, 'Skirt Waist', tubeHull(P(0, 0.945, 0), P(0, 0.985, 0), [0.118, 0.088], [0.116, 0.086], 6, 0), RED_L);
add(5, 'Panel Right', slab([P(-0.12, 0.88, 0.03), P(-0.22, 0.82, 0.03), P(-0.32, 0.28, 0.03), P(-0.18, 0.5, 0.03)], 0.016), RED_D);
add(5, 'Panel Right Shade', slab([P(-0.1, 0.86, -0.02), P(-0.2, 0.8, -0.02), P(-0.28, 0.3, -0.02), P(-0.16, 0.5, -0.02)], 0.014), '#8a231e');
add(5, 'Panel Left', slab([P(0.12, 0.88, 0.03), P(0.2, 0.83, 0.03), P(0.27, 0.5, 0.03), P(0.15, 0.66, 0.03)], 0.016), RED_D);
add(5, 'Panel Left Shade', slab([P(0.1, 0.86, -0.02), P(0.18, 0.8, -0.02), P(0.24, 0.52, -0.02), P(0.14, 0.64, -0.02)], 0.014), '#8a231e');
add(5, 'Panel Back', slab([P(-0.1, 0.88, -0.1), P(0.1, 0.88, -0.1), P(0.07, 0.45, -0.1), P(-0.07, 0.42, -0.1)], 0.016), RED_D);

// ---- 6 skeleton ----
const JOINTS = {
  ...HUMAN,
  hips: P(0, 0.93, 0),
  spine: P(0, 1.0, 0),
  chest: P(0, 1.08, 0),
  neck: P(0, 1.17, 0),
  head: P(0, 1.27, 0.01),
  headTop: P(0, 1.66, 0),
  shoulder: ARMS[1].S,
  elbow: ARMS[1].E,
  wrist: ARMS[1].W,
  fingers: ARMS[1].F,
  hip: P(0.085, 0.92, 0),
  knee: P(0.1, 0.4, 0.012),
  ankle: P(0.135, 0.17, 0),
  toe: P(0.135, 0.02, 0.17),
};

export const RIBBON: AssetDef = {
  id: 'ribbon',
  rig: () => humanSpec(JOINTS, { shoulder: ARMS[-1].S, elbow: ARMS[-1].E, wrist: ARMS[-1].W, fingers: ARMS[-1].F }),
  name: 'Red Ribbon Girl',
  tagline: 'A hard-edged low-poly girl: blond bob, big red ribbons, cyan-lined top and a faceted red skirt',
  level: 'Medium',
  thumb: { dir: [0.25, 0.25, 1], zoom: 0.78 },
  learn: ['Make flat-faced shapes by moving a few corner points', 'Place a head, hair and big ribbons with simple wedges', 'Stack a faceted skirt from a diamond and long side panels', 'Keep a character readable with very few triangles'],
  steps: [
    { title: 'Legs and boots', text: 'Each leg is a five-sided tube: wide dark thigh, a pale knee guard, a narrower shin and a short pale ankle. The boot is a wedge with a flat sole and a long pointed toe, with a darker cuff around the top. Build one side and duplicate it.', tools: ['Shape: Cylinder, 5 sides', 'Edit shape: move points', 'Duplicate Ctrl+D'] },
    { title: 'Top and chest lines', text: 'The torso is a box that is wider at the shoulders than at the waist. A darker chest plate sits on the front and a round collar surrounds the neck. The glowing cyan lines are thin flat boxes laid on the chest: two straight ones and two short diagonals meeting near the belt.', tools: ['Shape: Box', 'Edit shape: scale a face (R)', 'Thin boxes for lines'] },
    { title: 'Arms and hands', text: 'Short dark sleeves end in a darker cuff, then pale upper arm, forearm and a flat hand with a small thumb. One arm is raised slightly more than the other so the pose feels relaxed. Use Rotate to change either arm.', tools: ['Shape: Cylinder, 5 sides', 'Rotate (E)', 'Mirror ideas: duplicate and move'] },
    { title: 'Head and face', text: 'The head is a faceted sphere: four rings of eight corners, narrowest at the chin. The face is almost bare: two red eyes with a thin black lid on top, a tiny nose and a small mouth, all flat plates pressed onto the surface.', tools: ['Shape: Sphere, 8 sides', 'Edit shape: narrow the jaw', 'Thin boxes for features'] },
    { title: 'Hair and ribbons', text: 'The hair is a rounded cap, a back mass, two side panels that end in sharp points and five pointed bangs across the forehead, in three shades of yellow. The two red ribbons are big flat triangles on top of the head, each with a small knot.', tools: ['Edit shape: Merge points', 'Shape: Pyramid', 'Color palette'] },
    { title: 'Skirt', text: 'The skirt is a diamond built from two six-sided rings and four points, with a darker layer underneath and a thin trim at the waist. Long, thin red panels hang from the hips on both sides and end in sharp points.', tools: ['Shape: Cylinder, 6 sides', 'Edit shape: Merge points', 'Thin boxes for panels'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: the girl bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Give her a new outfit: recolor the skirt blue, change the cyan lines to pink, and make the ribbons twice as big by scaling them.',
  parts,
};
