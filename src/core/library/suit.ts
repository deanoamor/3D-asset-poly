import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { slab, tubeHull } from './lowpoly';
import { blob, sweep, toPart, type Ring } from './organic';
import { humanSpec } from './rigs';

/**
 * A man in a suit for the streets of the game: the chunky base with the man's face, a dark jacket over a white shirt
 * and a tie, matching trousers, black dress shoes, a belt and short neat hair. The game recolours him into other men
 * (a grey suit, a brown jacket for a grandfather). Left is +X, Right is -X, and he faces +Z.
 */

const SUIT = '#2f3a58';
const SUIT_D = '#242d46';
const SUIT_L = '#3d4a6c';
const SHIRT = '#f4f4f0';
const SHIRT_D = '#d8d8d2';
const TIE = '#c8403f';
const TIE_D = '#a23030';
const BELT = '#26272d';
const BUCKLE = '#c9b47a';
const SHOE = '#25262c';
const SHOE_L = '#3d3f48';
const SOLE = '#16171b';
const SKIN = '#f3cba3';
const SKIN_D = '#dca37c';
const HAIR_A = '#25201d';
const HAIR_B = '#181513';
const HAIR_C = '#3a312b';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });

// ---- 0 trousers and dress shoes ----
for (const s of sides) {
  const n = nameOf(s);
  const x = M(s, J.ankle)[0];
  add(0, `Trouser ${n}`, tubeHull(M(s, [0.066, 0.6, 0]), M(s, [0.088, 0.1, 0]), 0.076, 0.058, 6, 0), SUIT);
  add(0, `Trouser Crease ${n}`, cbox(M(s, [0.066, 0.36, 0.0755]), [0.008, 0.5, 0.005], 0.002), SUIT_D);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 12);
  add(0, `Shoe ${n}`, out(tbox(x, 0.03, 0.02, 0.1, [0.1, 0.23], [0.09, 0.17], 0.026)), SHOE);
  add(0, `Shoe Toe ${n}`, out(cbox([x, 0.05, 0.115], [0.094, 0.05, 0.07], 0.018)), SHOE_L);
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.03], [0.108, 0.024, 0.238], 0.008)), SOLE);
}

// ---- 1 jacket, shirt, tie, belt ----
add(1, 'Jacket', tbox(0, 0, 0.5, 1.04, [0.27, 0.165], [0.31, 0.165], 0.032), SUIT);
add(1, 'Jacket Shade', tbox(0, 0, 0.5, 0.62, [0.272, 0.167], [0.28, 0.169], 0.032), SUIT_D);
add(1, 'Shirt Front', cbox([0, 0.92, 0.0868], [0.16, 0.2, 0.008], 0.002), SHIRT);
add(1, 'Collar Band', tubeHull([0, 1.02, 0], [0, 1.062, 0.002], [0.088, 0.066], [0.076, 0.058], 8, 0), SHIRT);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Collar Point ${n}`, slab([M(s, [0.006, 1.03, 0.07]), M(s, [0.06, 1.035, 0.07]), M(s, [0.04, 0.95, 0.0884]), M(s, [0.006, 0.97, 0.0884])], 0.006), SHIRT_D);
  add(1, `Lapel ${n}`, slab([M(s, [0.03, 1.0, 0.0875]), M(s, [0.105, 0.99, 0.0875]), M(s, [0.07, 0.8, 0.0885]), M(s, [0.03, 0.74, 0.0885])], 0.006), SUIT_L);
  add(1, `Jacket Button ${n}`, cbox(M(s, [0.02, 0.7, 0.0884]), [0.014, 0.014, 0.006], 0.002), SUIT_D);
}
add(1, 'Tie Knot', cbox([0, 0.945, 0.0905], [0.034, 0.032, 0.012], 0.004), TIE_D);
add(1, 'Tie', slab([[-0.022, 0.93, 0.0925], [0.022, 0.93, 0.0925], [0.032, 0.74, 0.0925], [0, 0.7, 0.0925], [-0.032, 0.74, 0.0925]], 0.006), TIE);
add(1, 'Pocket Square', cbox([0.1, 0.9, 0.0885], [0.04, 0.026, 0.006], 0.002), SHIRT);
add(1, 'Belt', tbox(0, 0, 0.5, 0.535, [0.272, 0.169], [0.27, 0.168], 0.03), BELT);
add(1, 'Belt Buckle', cbox([0, 0.518, 0.0895], [0.04, 0.026, 0.01], 0.004), BUCKLE);
add(1, 'Seat', tbox(0, 0, 0.5, 0.57, [0.262, 0.168], [0.272, 0.168], 0.03), SUIT);

// ---- 2 long sleeves with white cuffs, bare hands ----
for (const s of sides) {
  const n = nameOf(s);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.115, 1.008, 0], el, 0.066, 0.058, 6, 0), SUIT);
  add(2, `Sleeve Lower ${n}`, tubeHull(el, lerp(el, wr, 0.9), 0.056, 0.05, 6, 0), SUIT);
  add(2, `Cuff ${n}`, tubeHull(lerp(el, wr, 0.88), lerp(el, wr, 1.0), 0.0455, 0.044, 6, 0), SHIRT);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.02, wr[1], [0.042, 0.06], [0.036, 0.054], 0.012), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.03], [wr[0] - s * 0.006, wr[1] - 0.064, wr[2] + 0.046], 0.014, 0.011, 5, 0), SKIN_D);
}

// ---- 3 head and face: the shared head, as a man ----
chibiHead(add, 3, {
  skin: SKIN, neck: SKIN_D, ear: '#e8b48d', eyeWhite: '#f1e3cd', iris: '#3a2a1e', irisGlow: '#7a5230', pupil: '#17100b',
  lid: '#241812', brow: '#1f1815', blush: '#f1b9a0', nose: '#dca07e', mouth: '#bf6a5d',
}, { eye: 0.85, browThick: 1.7, browSlant: 0.02, lash: false, blush: false, jaw: 1.1, neck: 1.2, man: true });

// ---- 4 short neat hair with a side parting ----
add(4, 'Hair Crown', blob([0, 1.27, -0.03], [0.15, 0.118, 0.14], 14), HAIR_A);
add(4, 'Hair Back', blob([0, 1.19, -0.07], [0.128, 0.088, 0.092], 12), HAIR_B);
add(4, 'Hair Top', blob([0.02, 1.335, -0.01], [0.115, 0.05, 0.11], 10), HAIR_C);
const FRINGE: [number, number, number][] = [[-0.105, -0.11, 1.282], [-0.055, -0.06, 1.272], [-0.005, -0.01, 1.278], [0.045, 0.05, 1.27], [0.095, 0.1, 1.282]];
FRINGE.forEach(([x0, xt, yt], i) => {
  const path: Ring[] = [R([x0 * 0.9, 1.35, 0.07], [0.034, 0.02]), R([x0, 1.31, 0.118], [0.032, 0.014]), R([(x0 + xt) / 2, (1.31 + yt) / 2, 0.128], [0.026, 0.011]), R([xt, yt, 0.132], [0.006, 0.005])];
  add(4, `Fringe ${i + 1}`, sweep(path, { sides: 6, end: 'dome' }), i % 2 ? HAIR_A : HAIR_C);
});
for (const s of sides) {
  const n = nameOf(s);
  add(4, `Sideburn ${n}`, blob([s * 0.139, 1.215, 0.025], [0.011, 0.04, 0.022], 8), HAIR_B);
  add(4, `Nape Tuft ${n}`, sweep([R(M(s, [0.07, 1.12, -0.1]), [0.04, 0.025]), R(M(s, [0.08, 1.09, -0.105]), [0.03, 0.018]), R(M(s, [0.088, 1.07, -0.1]), [0.006, 0.006])], { sides: 6, end: 'dome' }), HAIR_B);
}

applyStyle(parts, [
  [/^(Head|Neck|Ear|Hand|Thumb)/, { smooth: true }],
  [/^(Hair|Fringe|Sideburn|Nape)/, { smooth: true, paint: 0.35 }],
  [/^(Jacket|Lapel|Sleeve|Trouser|Seat|Belt|Shoe|Sole|Collar|Cuff|Shirt|Tie)/, { paint: 0.25 }],
]);

export const SUITMAN: AssetDef = {
  id: 'suit',
  rig: () => humanSpec(J),
  name: 'Man in a Suit',
  tagline: 'A man for the streets: a navy suit, white shirt and red tie, black shoes and short neat hair',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Dress the shared man in a jacket, shirt and tie', 'Cut lapels and collar points from flat plates', 'Make a necktie from a knot and a pointed plate', 'Part short hair with a fringe of strands'],
  steps: [
    { title: 'Trousers and shoes', text: 'Two tapered six-sided tubes in the suit colour, each with a thin crease, and black bevelled dress shoes with a lighter toe and a dark sole.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box', 'Duplicate Ctrl+D'] },
    { title: 'Jacket, shirt and tie', text: 'The jacket is one box, wider at the shoulders. A white strip of shirt shows at the chest, framed by two lighter lapels and the white collar points. The tie is a knot and a long pointed plate. A belt with a small buckle shows under the jacket.', tools: ['Shape: Box', 'Thin plates', 'Color palette'] },
    { title: 'Sleeves and hands', text: 'Long sleeves in the suit colour end in short white cuffs. The hands are boxes with a thumb.', tools: ['Shape: Cylinder, 6 sides', 'Rotate (E)'] },
    { title: 'Head and face', text: 'The shared head as a man: a firm jaw, small dark eyes, straight brows, a bigger nose and a flat mouth.', tools: ['Shape: Sphere', 'Thin plates'] },
    { title: 'Hair', text: 'Short black hair: a crown, a lighter top, five strands for the fringe and small sideburns and tufts at the nape.', tools: ['Shape: Sphere', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'The skeleton is the shared one; when you export to GLB every part is skinned to these joints automatically.', tools: ['Skeleton panel (under Layers)', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Make him a waiter: a black waistcoat over the shirt, a bow tie and a white apron.',
  parts,
};
