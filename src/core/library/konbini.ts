import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { hull, ringPts, tubeHull } from './lowpoly';
import { blob, sweep, toPart, type Ring } from './organic';
import { humanSpec } from './rigs';

/**
 * The convenience store clerk of the game: the same chunky base and man's face as the Firefighter, in a Hoshi Mart
 * uniform: a blue polo with a white stripe, a short apron with a name tag, dark trousers, white sneakers and a blue cap.
 * Left is +X, Right is -X, and he faces +Z.
 */

const BLUE = '#2a8fd8';
const BLUE_D = '#1f70ac';
const WHITE = '#f4f6f8';
const GREY = '#d4d9de';
const NAVY = '#2b3447';
const NAVY_D = '#1f2634';
const GREEN = '#37a867';
const ORANGE = '#f08a2c';
const BLACK = '#26272d';
const SKIN = '#f3cba3';
const SKIN_D = '#dca37c';
const HAIR_A = '#25201d';
const HAIR_B = '#181513';
const HAIR_C = '#3a312b';
const SOLE = '#d9dde0';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
const ring = (y: number, rx: number, rz: number, cz = 0): Vec3[] => ringPts([0, y, cz], [0, 1, 0], rx, rz, 12, Math.PI / 12);

// ---- 0 trousers and sneakers ----
for (const s of sides) {
  const n = nameOf(s);
  const ankle = M(s, J.ankle);
  const x = ankle[0];
  add(0, `Trouser ${n}`, tubeHull(M(s, [0.066, 0.6, 0]), M(s, [0.085, 0.12, 0]), 0.074, 0.056, 6, 0), NAVY);
  add(0, `Trouser Crease ${n}`, cbox(M(s, [0.066, 0.36, 0.0735]), [0.01, 0.4, 0.006], 0.002), NAVY_D);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 12);
  add(0, `Shoe ${n}`, out(tbox(x, 0.03, 0.02, 0.12, [0.1, 0.22], [0.09, 0.16], 0.026)), WHITE);
  add(0, `Shoe Toe ${n}`, out(cbox([x, 0.05, 0.11], [0.096, 0.05, 0.07], 0.018)), WHITE);
  add(0, `Shoe Stripe ${n}`, out(cbox([x, 0.065, 0.03], [0.104, 0.02, 0.1], 0.004)), BLUE);
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.03], [0.108, 0.024, 0.236], 0.008)), SOLE);
}

// ---- 1 polo shirt, stripe, collar, apron and name tag ----
add(1, 'Polo', tbox(0, 0, 0.56, 1.04, [0.256, 0.158], [0.3, 0.16], 0.032), BLUE);
add(1, 'Polo Stripe', tbox(0, 0, 0.84, 0.885, [0.2865, 0.1625], [0.2925, 0.1635], 0.032), WHITE);
add(1, 'Polo Stripe Thin', tbox(0, 0, 0.9, 0.915, [0.2935, 0.1635], [0.2975, 0.1638], 0.032), GREEN);
add(1, 'Polo Hem', tbox(0, 0, 0.56, 0.6, [0.258, 0.1595], [0.264, 0.1595], 0.032), BLUE_D);
add(1, 'Collar', tubeHull([0, 1.02, 0], [0, 1.07, 0.004], [0.092, 0.07], [0.078, 0.06], 8, 0), WHITE);
add(1, 'Placket', cbox([0, 0.97, 0.0845], [0.03, 0.08, 0.006], 0.002), BLUE_D);
add(1, 'Button', cbox([0, 0.985, 0.0885], [0.01, 0.01, 0.004], 0.001), WHITE);
add(1, 'Apron', tbox(0, 0, 0.5, 0.82, [0.25, 0.1705], [0.238, 0.1705], 0.03), WHITE);
add(1, 'Apron Bib Edge', cbox([0, 0.815, 0.0865], [0.15, 0.01, 0.01], 0.003), GREY);
add(1, 'Apron Pocket', cbox([0, 0.58, 0.092], [0.15, 0.1, 0.008], 0.003), GREY);
add(1, 'Apron Pocket Top', cbox([0, 0.635, 0.0965], [0.15, 0.008, 0.004], 0.0015), BLUE);
add(1, 'Name Tag', cbox([0.085, 0.77, 0.0905], [0.056, 0.028, 0.006], 0.002), WHITE);
add(1, 'Name Tag Line', cbox([0.085, 0.77, 0.0945], [0.038, 0.007, 0.003], 0.001), ORANGE);
add(1, 'Logo Mark', cbox([-0.085, 0.77, 0.0905], [0.04, 0.04, 0.006], 0.002), ORANGE);
add(1, 'Logo Star', cbox([-0.085, 0.77, 0.0945], [0.016, 0.016, 0.003], 0.001), WHITE);
add(1, 'Belt', tbox(0, 0, 0.525, 0.56, [0.262, 0.161], [0.26, 0.16], 0.03), BLACK);
add(1, 'Seat', tbox(0, 0, 0.5, 0.57, [0.256, 0.16], [0.264, 0.16], 0.03), NAVY);

// ---- 2 short sleeves, bare forearms and hands ----
for (const s of sides) {
  const n = nameOf(s);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  const sh = M(s, J.shoulder);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.115, 1.008, 0], lerp(sh, el, 0.8), 0.066, 0.06, 6, 0), BLUE);
  add(2, `Sleeve Hem ${n}`, tubeHull(lerp(sh, el, 0.72), lerp(sh, el, 0.84), 0.0625, 0.0615, 6, 0), WHITE);
  add(2, `Upper Arm ${n}`, tubeHull(lerp(sh, el, 0.78), el, 0.052, 0.047, 6, 0), SKIN);
  add(2, `Forearm ${n}`, tubeHull(el, lerp(el, wr, 0.96), 0.047, 0.041, 6, 0), SKIN);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.02, wr[1], [0.042, 0.06], [0.036, 0.054], 0.012), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.03], [wr[0] - s * 0.006, wr[1] - 0.064, wr[2] + 0.046], 0.014, 0.011, 5, 0), SKIN_D);
}

// ---- 3 head and face: the shared head, as a man ----
chibiHead(add, 3, {
  skin: SKIN, neck: SKIN_D, ear: '#e8b48d', eyeWhite: '#f1e3cd', iris: '#3a2a1e', irisGlow: '#7a5230', pupil: '#17100b',
  lid: '#241812', brow: '#1f1815', blush: '#f1b9a0', nose: '#dca07e', mouth: '#bf6a5d',
}, { eye: 0.85, browThick: 1.6, browSlant: 0.015, lash: false, blush: false, jaw: 1.05, neck: 1.15, man: true });

// ---- 4 short black hair, and a blue cap ----
add(4, 'Hair Crown', blob([0, 1.265, -0.03], [0.148, 0.115, 0.138], 14), HAIR_A);
add(4, 'Hair Back', blob([0, 1.19, -0.07], [0.126, 0.085, 0.09], 12), HAIR_B);
for (const s of sides) {
  const n = nameOf(s);
  add(4, `Sideburn ${n}`, blob([s * 0.139, 1.215, 0.025], [0.011, 0.04, 0.022], 8), HAIR_B);
  add(4, `Nape Tuft ${n}`, sweep([R(M(s, [0.07, 1.12, -0.1]), [0.04, 0.025]), R(M(s, [0.08, 1.09, -0.105]), [0.03, 0.018]), R(M(s, [0.088, 1.07, -0.1]), [0.006, 0.006])], { sides: 6, end: 'dome' }), HAIR_B);
}
const FRINGE: [number, number, number][] = [[-0.105, -0.11, 1.272], [-0.055, -0.06, 1.262], [-0.005, -0.005, 1.268], [0.045, 0.05, 1.262], [0.095, 0.1, 1.272]];
FRINGE.forEach(([x0, xt, yt], i) => {
  const path: Ring[] = [R([x0 * 0.9, 1.34, 0.07], [0.034, 0.02]), R([x0 * 1.0, 1.3, 0.118], [0.032, 0.014]), R([(x0 + xt) / 2, (1.3 + yt) / 2, 0.128], [0.026, 0.011]), R([xt, yt, 0.132], [0.006, 0.005])];
  add(4, `Fringe ${i + 1}`, sweep(path, { sides: 6, end: 'dome' }), i % 2 ? HAIR_A : HAIR_C);
});
// the cap: a low dome, a short bill pointing forward, and a small badge
add(4, 'Cap', hull([...ring(1.33, 0.158, 0.146, -0.015), ...ring(1.385, 0.152, 0.14, -0.014), ...ring(1.44, 0.11, 0.1, -0.013), ...ring(1.47, 0.05, 0.05, -0.012)]), BLUE);
add(4, 'Cap Band', hull([...ring(1.328, 0.162, 0.15, -0.015), ...ring(1.352, 0.16, 0.148, -0.015)]), BLUE_D);
add(4, 'Cap Bill', hull([...ring(1.34, 0.12, 0.05, 0.13), ...ring(1.325, 0.13, 0.085, 0.19)]), BLUE_D);
add(4, 'Cap Badge', cbox([0, 1.395, 0.136], [0.05, 0.04, 0.008], 0.003), WHITE);
add(4, 'Cap Badge Star', cbox([0, 1.395, 0.141], [0.02, 0.02, 0.004], 0.0015), ORANGE);

applyStyle(parts, [
  [/^(Head|Neck|Ear|Upper Arm|Forearm|Hand|Thumb)/, { smooth: true }],
  [/^(Hair|Fringe|Sideburn|Nape)/, { smooth: true, paint: 0.35 }],
  [/^(Polo|Collar|Sleeve|Trouser|Seat|Belt|Shoe|Sole|Apron|Cap)/, { paint: 0.25 }],
]);

export const KONBINI: AssetDef = {
  id: 'konbini',
  rig: () => humanSpec(J),
  name: 'Konbini Clerk',
  tagline: 'The game convenience store clerk: the same chunky base as the firefighter, as a man in a blue Hoshi Mart uniform',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Dress the shared man in a short-sleeved uniform', 'Layer an apron over a polo with thin flat boxes', 'Build a cap from a low dome and a short bill', 'Use bare skin tubes for forearms and flat boxes for hands'],
  steps: [
    { title: 'Trousers and sneakers', text: 'Dark navy trousers are two tapered six-sided tubes with a slim crease. The sneakers are white bevelled boxes with a round toe, a blue stripe and a light sole, pointing a little outward.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box', 'Duplicate Ctrl+D'] },
    { title: 'Polo and apron', text: 'The polo is one blue box, wider at the shoulders, with a white stripe, a white collar and a small placket. A short white apron with a pocket sits over it, with an orange logo on one side of the chest and a name tag on the other.', tools: ['Shape: Box', 'Edit shape: scale a face (R)', 'Thin boxes for stripes'] },
    { title: 'Arms and hands', text: 'Short blue sleeves with a white hem end above the elbow. Below them, bare skin tubes make the upper and lower arm, and a flat box with a thumb makes each hand.', tools: ['Shape: Cylinder, 6 sides', 'Rotate (E)'] },
    { title: 'Head and face', text: 'The head is the shared round head as a man: a firm jaw, smaller dark eyes, straight brows, a bigger nose and a flat mouth.', tools: ['Shape: Sphere', 'Thin plates', 'Color palette'] },
    { title: 'Hair and cap', text: 'Short black hair with a neat fringe shows under a blue cap with a darker band, a short bill and a white badge with an orange star.', tools: ['Shape: Sphere', 'Edit shape: move points', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. When you export to GLB, every part is skinned to the joints automatically. Press Pose, pick a joint and turn it with the rings.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Make the night shift: recolor the polo dark green, swap the cap for a headband and add a name on the tag.',
  parts,
};
