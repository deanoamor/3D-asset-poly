import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { hull, ringPts, slab, strip, tubeHull } from './lowpoly';
import { toPart } from './organic';
import { plate } from './ribbon';
import { FACETS } from './ribbonData';
import { humanSpec, type BodyJoints } from './rigs';

/**
 * A nurse in the same hard-edged low-poly style as the Red Ribbon Girl: slim limbs, a big flat-faced head, big
 * pointed facets and a few long panels. She is built as a real 3D figure that stands on the ground, so she looks right
 * from every side. Her face uses the same flat planes as the Red Ribbon Girl, in other colours.
 * Left is +X, Right is -X, and she faces +Z.
 */

const SKIN = '#dccbbd';
const SKIN_D = '#c6b2a2';
const WHITE = '#f4f6fb';
const WHITE_S = '#dde2ee';
const STOCK = '#f1f2f7';
const RED = '#d63c3c';
const RED_D = '#a82a2c';
const BLUE = '#b7d4f0';
const BLUE_D = '#8fb4de';
const HAIR = '#8e5636';
const HAIR_L = '#b87a4e';
const HAIR_D = '#6e3f27';
const HAIR_DD = '#563020';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const P = (x: number, y: number, z: number): Vec3 => [x, y, z];
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mir = (s: 1 | -1, p: Vec3): Vec3 => [s * p[0], p[1], p[2]];
const sides = [1, -1] as const;
const nameOf = (s: 1 | -1) => (s === 1 ? 'Left' : 'Right');

// the skeleton, in metres (the Left side; the Right side mirrors it)
const J: BodyJoints = {
  hips: P(0, 0.9, 0),
  spine: P(0, 1.02, 0),
  chest: P(0, 1.15, 0),
  neck: P(0, 1.28, 0),
  head: P(0, 1.38, 0.01),
  headTop: P(0, 1.76, 0),
  shoulder: P(0.15, 1.19, 0),
  elbow: P(0.25, 1.02, 0.02),
  wrist: P(0.33, 0.88, 0.04),
  fingers: P(0.39, 0.8, 0.05),
  hip: P(0.07, 0.86, 0),
  knee: P(0.085, 0.46, 0.015),
  ankle: P(0.095, 0.11, 0),
  toe: P(0.1, 0.02, 0.12),
};

// ---- 0 legs and shoes ----
for (const s of sides) {
  const n = nameOf(s);
  const hip = mir(s, J.hip);
  const knee = mir(s, J.knee);
  const ankle = mir(s, J.ankle);
  add(0, `Thigh ${n}`, tubeHull(hip, knee, [0.064, 0.06], [0.044, 0.042], 5), STOCK);
  add(0, `Garter ${n}`, tubeHull(lerp(hip, knee, 0.3), lerp(hip, knee, 0.37), 0.066, 0.065, 5), RED);
  add(0, `Knee ${n}`, tubeHull(lerp(hip, knee, 0.97), lerp(knee, ankle, 0.08), 0.05, 0.047, 5), WHITE_S);
  add(0, `Shin ${n}`, tubeHull(lerp(knee, ankle, 0.08), ankle, 0.046, 0.033, 5), STOCK);
  add(0, `Sock Trim ${n}`, tubeHull(P(ankle[0], ankle[1] + 0.07, ankle[2]), P(ankle[0], ankle[1] + 0.045, ankle[2]), 0.04, 0.038, 5), RED);
  const x = ankle[0];
  add(0, `Shoe ${n}`, hull([P(x - 0.04, 0.12, -0.04), P(x + 0.04, 0.12, -0.04), P(x - 0.04, 0.12, 0.04), P(x + 0.04, 0.12, 0.04), P(x - 0.04, 0, -0.07), P(x + 0.04, 0, -0.07), P(x - 0.042, 0, 0.04), P(x + 0.042, 0, 0.04), P(x - 0.026, 0, 0.19), P(x + 0.026, 0, 0.19)]), WHITE);
  add(0, `Shoe Toe ${n}`, hull([P(x - 0.026, 0.012, 0.1), P(x + 0.026, 0.012, 0.1), P(x - 0.026, 0, 0.19), P(x + 0.026, 0, 0.19), P(x, 0.05, 0.13)]), RED);
  add(0, `Shoe Heel ${n}`, hull([P(x - 0.036, 0.05, -0.04), P(x + 0.036, 0.05, -0.04), P(x - 0.04, 0, -0.07), P(x + 0.04, 0, -0.07), P(x - 0.036, 0.05, -0.06), P(x + 0.036, 0.05, -0.06)]), RED_D);
}

// ---- 1 dress: bodice, belt, collar, cross, skirt and panels ----
add(1, 'Bodice', hull([P(-0.145, 1.2, -0.085), P(0.145, 1.2, -0.085), P(-0.145, 1.2, 0.085), P(0.145, 1.2, 0.085), P(-0.095, 0.93, -0.07), P(0.095, 0.93, -0.07), P(-0.095, 0.93, 0.07), P(0.095, 0.93, 0.07)]), WHITE);
add(1, 'Bodice Shade', hull([P(-0.1, 1.04, 0.07), P(0.1, 1.04, 0.07), P(-0.095, 0.93, 0.07), P(0.095, 0.93, 0.07), P(-0.1, 1.04, 0.079), P(0.1, 1.04, 0.079), P(-0.095, 0.93, 0.074), P(0.095, 0.93, 0.074)]), WHITE_S);
add(1, 'Belt', tubeHull(P(0, 0.925, 0), P(0, 0.965, 0), [0.1, 0.078], [0.1, 0.078], 6), RED);
add(1, 'Belt Buckle', slab([P(-0.022, 0.975, 0.082), P(0.022, 0.975, 0.082), P(0.022, 0.92, 0.082), P(-0.022, 0.92, 0.082)], 0.014), '#f0d27a');
add(1, 'Cross Upright', strip([0, 1.07], [0, 1.15], 0.018, 0.096, 0.008), RED);
add(1, 'Cross Bar', strip([-0.04, 1.11], [0.04, 1.11], 0.018, 0.098, 0.008), RED);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Collar ${n}`, slab([P(s * 0.01, 1.12, 0.09), P(s * 0.115, 1.205, 0.085), P(s * 0.04, 1.225, 0.078)], 0.014), BLUE);
  add(1, `Collar Edge ${n}`, strip([s * 0.012, 1.118], [s * 0.115, 1.203], 0.01, 0.094, 0.006), BLUE_D);
}
add(1, 'Skirt', hull([...ringPts(P(0, 0.95, 0), [0, 1, 0], 0.105, 0.082, 6, 0), ...ringPts(P(0, 0.8, 0), [0, 1, 0], 0.2, 0.16, 6, 0), P(0, 0.6, 0.19), P(0, 0.64, -0.14), P(0.12, 0.64, 0), P(-0.12, 0.64, 0)]), WHITE);
add(1, 'Skirt Under', hull([...ringPts(P(0, 0.88, 0), [0, 1, 0], 0.14, 0.11, 6, 0), ...ringPts(P(0, 0.76, 0), [0, 1, 0], 0.215, 0.175, 6, 0), P(0, 0.56, 0.12), P(0.18, 0.62, 0), P(-0.18, 0.62, 0), P(0, 0.58, -0.17)]), WHITE_S);
add(1, 'Skirt Hem', hull([P(0, 0.605, 0.185), P(0.12, 0.645, 0.0), P(0, 0.64, -0.13), P(-0.12, 0.645, 0.0), P(0, 0.585, 0.19), P(0.121, 0.625, 0.0), P(-0.121, 0.625, 0.0), P(0, 0.62, -0.135)]), RED);
add(1, 'Panel Left', slab([P(0.12, 0.88, 0.04), P(0.22, 0.82, 0.04), P(0.27, 0.4, 0.04), P(0.15, 0.58, 0.04)], 0.016), BLUE);
add(1, 'Panel Left Shade', slab([P(0.1, 0.86, -0.02), P(0.2, 0.8, -0.02), P(0.24, 0.46, -0.02), P(0.14, 0.6, -0.02)], 0.014), BLUE_D);
add(1, 'Panel Right', slab([P(-0.12, 0.88, 0.04), P(-0.2, 0.83, 0.04), P(-0.23, 0.5, 0.04), P(-0.14, 0.64, 0.04)], 0.016), BLUE);
add(1, 'Panel Right Shade', slab([P(-0.1, 0.86, -0.02), P(-0.18, 0.8, -0.02), P(-0.2, 0.54, -0.02), P(-0.13, 0.64, -0.02)], 0.014), BLUE_D);
add(1, 'Panel Back', slab([P(-0.1, 0.88, -0.1), P(0.1, 0.88, -0.1), P(0.07, 0.4, -0.1), P(-0.07, 0.37, -0.1)], 0.016), BLUE_D);

// ---- 2 arms: puff sleeves, slim arms and white gloves ----
for (const s of sides) {
  const n = nameOf(s);
  const sh = mir(s, J.shoulder);
  const el = mir(s, J.elbow);
  const wr = mir(s, J.wrist);
  const fi = mir(s, J.fingers);
  const cut = lerp(sh, el, 0.5);
  add(2, `Sleeve ${n}`, tubeHull(P(sh[0] - s * 0.01, sh[1] + 0.012, sh[2]), cut, 0.07, 0.062, 6), WHITE);
  add(2, `Sleeve Trim ${n}`, tubeHull(lerp(sh, el, 0.46), lerp(sh, el, 0.56), 0.064, 0.064, 6), RED);
  add(2, `Upper Arm ${n}`, tubeHull(lerp(sh, el, 0.55), el, 0.044, 0.04, 5), SKIN);
  add(2, `Forearm ${n}`, tubeHull(el, lerp(el, wr, 0.8), 0.04, 0.033, 5), SKIN);
  add(2, `Glove Cuff ${n}`, tubeHull(lerp(el, wr, 0.78), lerp(el, wr, 1.0), 0.04, 0.038, 5), WHITE);
  add(2, `Glove ${n}`, tubeHull(wr, fi, [0.036, 0.024], [0.022, 0.014], 4), WHITE);
  const th = lerp(wr, fi, 0.5);
  add(2, `Glove Thumb ${n}`, tubeHull(lerp(wr, fi, 0.15), P(th[0] + s * 0.005, th[1] + 0.035, th[2] + 0.03), 0.015, 0.009, 4), WHITE_S);
}
add(2, 'Neck', tubeHull(P(0, 1.4, 0), P(0, 1.26, 0), 0.042, 0.05, 6), SKIN);

// ---- 3 head and face ----
add(3, 'Head', hull([
  ...ringPts(P(0, 1.37, 0.04), [0, 1, 0], 0.04, 0.04, 8, 0),
  ...ringPts(P(0, 1.4, 0.02), [0, 1, 0], 0.07, 0.07, 8, 0),
  ...ringPts(P(0, 1.47, 0.0), [0, 1, 0], 0.088, 0.085, 8, 0),
  ...ringPts(P(0, 1.55, 0.0), [0, 1, 0], 0.092, 0.088, 8, 0),
  ...ringPts(P(0, 1.64, 0.0), [0, 1, 0], 0.086, 0.082, 8, 0),
  ...ringPts(P(0, 1.72, 0.0), [0, 1, 0], 0.055, 0.055, 8, 0),
]), SKIN);
for (const s of sides) add(3, `Ear ${nameOf(s)}`, hull([P(s * 0.088, 1.52, -0.02), P(s * 0.108, 1.49, 0.0), P(s * 0.088, 1.45, -0.02), P(s * 0.082, 1.5, 0.03)]), SKIN_D);

const FACE_SKIP = new Set(['Neck', 'Neck Shadow', 'Face Base', 'Forehead Strand']);
const FACE_COLORS: Record<string, string> = {
  'Iris Left': '#2f9a8a', 'Iris Right': '#2f9a8a',
  'Iris Left Top': '#17514c', 'Iris Right Top': '#17514c',
  'Iris Left Glow': '#7fe0cf', 'Iris Right Glow': '#7fe0cf',
  'Pupil Left': '#0e2527', 'Pupil Right': '#0e2527',
  'Brow Left': '#7a5230', 'Brow Right': '#7a5230',
  Mouth: '#d4687a', 'Mouth Line': '#9d4a58', 'Lip Shine': '#f0a8b4',
};
const SHIFT = 15; // the picture's head sits 15 px to the right of the middle
for (const f of FACETS) {
  if ((f.grp !== 'skin' && f.grp !== 'face') || FACE_SKIP.has(f.name)) continue;
  const pts = f.pts.map((v, i) => (i % 2 === 0 ? v - SHIFT : v));
  parts.push(toPart(3, `Face ${f.name}`, plate(pts, f.z, f.t), FACE_COLORS[f.name] ?? f.color));
}

// ---- 4 hair, twin tails and the nurse cap ----
add(4, 'Hair Cap', hull([...ringPts(P(0, 1.8, 0), [0, 1, 0], 0.07, 0.07, 8, 0), ...ringPts(P(0, 1.75, -0.005), [0, 1, 0], 0.115, 0.115, 8, 0), ...ringPts(P(0, 1.68, -0.01), [0, 1, 0], 0.15, 0.14, 8, 0), ...ringPts(P(0, 1.59, -0.015), [0, 1, 0], 0.152, 0.145, 8, 0)]), HAIR);
add(4, 'Hair Back', hull([P(-0.15, 1.6, -0.04), P(0.15, 1.6, -0.04), P(0, 1.6, -0.17), P(-0.13, 1.3, -0.04), P(0.13, 1.3, -0.04), P(0, 1.24, -0.12), P(0, 1.36, -0.15)]), HAIR_D);
add(4, 'Hair Nape', hull([P(-0.1, 1.4, -0.09), P(0.1, 1.4, -0.09), P(0, 1.4, -0.15), P(-0.05, 1.27, -0.09), P(0.05, 1.27, -0.09)]), HAIR_DD);
[-0.115, -0.058, 0, 0.058, 0.115].forEach((x, i) => {
  const tip = 1.545 + Math.abs(x) * 0.28;
  add(4, `Bang ${i + 1}`, hull([P(x - 0.036, 1.64, 0.13), P(x + 0.036, 1.64, 0.13), P(x - 0.034, 1.61, 0.165), P(x + 0.034, 1.61, 0.165), P(x, tip, 0.162)]), i % 2 ? HAIR : HAIR_L);
});
for (const s of sides) {
  const n = nameOf(s);
  add(4, `Side Hair ${n}`, hull([P(s * 0.14, 1.6, 0.12), P(s * 0.2, 1.6, 0.0), P(s * 0.17, 1.6, -0.1), P(s * 0.16, 1.4, 0.1), P(s * 0.21, 1.42, -0.02), P(s * 0.19, 1.27, 0.06)]), HAIR_D);
  add(4, `Side Strand ${n}`, hull([P(s * 0.15, 1.57, 0.14), P(s * 0.195, 1.55, 0.1), P(s * 0.17, 1.38, 0.13), P(s * 0.18, 1.3, 0.11)]), HAIR_L);
  // twin tail: a tapered tube hanging from a red band
  const root = P(s * 0.15, 1.52, -0.06);
  const mid = P(s * 0.2, 1.33, -0.03);
  const tip = P(s * 0.215, 1.1, 0.0);
  add(4, `Twin Tail ${n}`, tubeHull(root, mid, 0.05, 0.058, 5), HAIR);
  add(4, `Twin Tail Tip ${n}`, hull([...ringPts(mid, [0, -1, 0], 0.058, 0.058, 5), tip]), HAIR_D);
  add(4, `Tail Band ${n}`, tubeHull(lerp(root, mid, 0.06), lerp(root, mid, 0.2), 0.056, 0.058, 5), RED);
}
add(4, 'Nurse Cap', hull([P(-0.09, 1.7, 0.17), P(0.09, 1.7, 0.17), P(-0.1, 1.7, -0.02), P(0.1, 1.7, -0.02), P(-0.075, 1.78, 0.13), P(0.075, 1.78, 0.13), P(-0.08, 1.78, 0.0), P(0.08, 1.78, 0.0)]), WHITE);
add(4, 'Nurse Cap Band', hull([P(-0.092, 1.7, 0.172), P(0.092, 1.7, 0.172), P(-0.1, 1.7, -0.02), P(0.1, 1.7, -0.02), P(-0.09, 1.725, 0.16), P(0.09, 1.725, 0.16), P(-0.098, 1.725, -0.02), P(0.098, 1.725, -0.02)]), WHITE_S);
add(4, 'Cap Cross Upright', strip([0, 1.715], [0, 1.77], 0.016, 0.158, 0.008), RED);
add(4, 'Cap Cross Bar', strip([-0.028, 1.745], [0.028, 1.745], 0.016, 0.16, 0.008), RED);

export const NURSE: AssetDef = {
  id: 'nurse',
  rig: () => humanSpec(J),
  name: 'Nurse',
  tagline: 'A hard-edged low-poly nurse: twin tails, a cap with a cross, a white dress with long blue panels',
  level: 'Medium',
  thumb: { dir: [0.35, 0.3, 1], zoom: 0.75 },
  learn: ['Build slim limbs as five-sided tubes with big flat faces', 'Dress a figure in layers: bodice, skirt, belt and panels', 'Reuse the same flat face planes in new colours', 'Finish with hair, twin tails and a cap that carries a cross'],
  steps: [
    { title: 'Legs and shoes', text: 'Each leg is a five-sided tube: a wide thigh, a short knee, a thin shin and a short ankle sock. A red band marks the top of the stocking. The shoe is a white wedge with a red pointed toe and a red heel. Build one side and duplicate it.', tools: ['Shape: Cylinder, 5 sides', 'Edit shape: move points', 'Duplicate Ctrl+D'] },
    { title: 'Dress, belt and panels', text: 'The bodice is a box that is wider at the shoulders than at the waist. A red belt and a gold buckle sit on the waist, and a red cross goes on the chest. The skirt is a flared hexagon with a red hem, and long pale-blue panels hang from the hips.', tools: ['Shape: Box', 'Edit shape: scale a face (R)', 'Thin boxes for panels'] },
    { title: 'Arms and gloves', text: 'Short puffed sleeves in white end in a red band. The arms are slim tubes in skin color and finish in white gloves with a small thumb. Keep the arms slightly bent forward and away from the body so the pose stays easy to read.', tools: ['Shape: Cylinder, 5 sides', 'Rotate (E)', 'Mirror ideas: duplicate and move'] },
    { title: 'Head and face', text: 'The head is a faceted sphere with a narrow chin. The face is a set of flat planes: two cheeks above and two below, a light line across the cheeks and a small nose. Teal eyes, thin lashes, brown brows, soft blush and a small pink smile sit on top.', tools: ['Shape: Sphere, 8 sides', 'Thin plates', 'Color palette'] },
    { title: 'Hair, tails and cap', text: 'The brown hair is a rounded cap, a darker mass behind it, five pointed bangs and two long side locks. Two twin tails hang from red bands. The white nurse cap sits on top of the head and carries a red cross on the front.', tools: ['Edit shape: Merge points', 'Shape: Cone', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: the nurse bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Change her job: make the dress green, swap the cap for a hair band, turn the red cross into a white one on a green patch, and give her a clipboard in one glove.',
  parts,
};
