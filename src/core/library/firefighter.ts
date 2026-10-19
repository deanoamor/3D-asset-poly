import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { hull, ringPts, tubeHull } from './lowpoly';
import { blob, sweep, toPart, type Ring } from './organic';
import { humanSpec } from './rigs';

/**
 * The firefighter of the game: the same chunky base as the Casual Girl (proportions, skeleton, round head), but a man:
 * a square jaw, smaller eyes, thick brows, short messy hair, a tilted red helmet with a gold shield, a bulky orange
 * turnout coat and navy trousers with silver reflective bands, dark gloves and tall black boots.
 * Left is +X, Right is -X, and he faces +Z.
 */

const COAT = '#e2902f';
const COAT_D = '#c47422';
const COAT_L = '#f0a94a';
const NAVY = '#2c3550';
const NAVY_D = '#20283d';
const SILVER = '#d9dde0';
const SILVER_D = '#aeb4ba';
const BLACK = '#26272d';
const BLACK_L = '#3c3e47';
const RED = '#c9362f';
const RED_D = '#9f2824';
const GOLD = '#e8bd4e';
const CREAM = '#f3e7c8';
const SKIN = '#f6d2ae';
const SKIN_D = '#e2a883';
const HAIR_A = '#3c2b22';
const HAIR_B = '#2a1d17';
const HAIR_C = '#54402f';
const SOLE = '#1b1c21';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
const ring = (y: number, rx: number, rz: number, cz = 0): Vec3[] => ringPts([0, y, cz], [0, 1, 0], rx, rz, 12, Math.PI / 12);
/** A ring whose height is `yFront` at the face and `yBack` at the back of the head, so a helmet sits tilted back. */
const tilted = (yFront: number, yBack: number, rx: number, rz: number, cz: number): Vec3[] =>
  Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const front = (Math.cos(a) + 1) / 2;
    return [Math.sin(a) * rx, yBack + (yFront - yBack) * front, cz + Math.cos(a) * rz] as Vec3;
  });

// ---- 0 trousers with reflective bands, and tall boots ----
for (const s of sides) {
  const n = nameOf(s);
  const ankle = M(s, J.ankle);
  const x = ankle[0];
  add(0, `Trouser ${n}`, tubeHull(M(s, [0.066, 0.6, 0]), M(s, [0.09, 0.2, 0]), 0.078, 0.066, 6, 0), NAVY);
  add(0, `Trouser Knee ${n}`, tubeHull(M(s, [0.078, 0.4, 0.004]), M(s, [0.081, 0.34, 0.004]), 0.0745, 0.073, 6, 0), NAVY_D);
  add(0, `Trouser Band ${n} 1`, tubeHull(M(s, [0.0855, 0.3, 0]), M(s, [0.0865, 0.278, 0]), 0.0712, 0.0705, 6, 0), SILVER);
  add(0, `Trouser Band ${n} 2`, tubeHull(M(s, [0.0885, 0.256, 0]), M(s, [0.0895, 0.234, 0]), 0.0688, 0.0682, 6, 0), SILVER);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 16);
  add(0, `Boot ${n}`, out(tbox(x, 0.03, 0.02, 0.2, [0.108, 0.228], [0.098, 0.165], 0.024)), BLACK);
  add(0, `Boot Toe ${n}`, out(cbox([x, 0.05, 0.112], [0.104, 0.066, 0.074], 0.018)), BLACK_L);
  add(0, `Boot Top ${n}`, out(tbox(x, -0.004, 0.176, 0.205, [0.102, 0.166], [0.1, 0.164], 0.024)), RED);
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.03], [0.116, 0.024, 0.242], 0.008)), SOLE);
}

// ---- 1 the turnout coat: body, collar, zip, reflective bands, radio and belt ----
add(1, 'Coat', tbox(0, 0, 0.56, 1.04, [0.27, 0.165], [0.312, 0.165], 0.032), COAT);
add(1, 'Coat Shade', tbox(0, 0, 0.56, 0.64, [0.272, 0.167], [0.28, 0.169], 0.032), COAT_D);
add(1, 'Coat Chest', tbox(0, 0, 0.9, 1.0, [0.304, 0.168], [0.31, 0.168], 0.032), COAT_L);
add(1, 'Coat Band Chest', tbox(0, 0, 0.8, 0.838, [0.2955, 0.1685], [0.2985, 0.1685], 0.032), SILVER);
add(1, 'Coat Band Hem', tbox(0, 0, 0.6, 0.638, [0.2775, 0.1685], [0.2805, 0.1685], 0.032), SILVER);
add(1, 'Coat Zip', cbox([0, 0.8, 0.0865], [0.014, 0.46, 0.008], 0.003), BLACK);
add(1, 'Coat Flap', cbox([0.036, 0.8, 0.088], [0.05, 0.46, 0.006], 0.002), COAT_D);
add(1, 'Collar', tubeHull([0, 1.02, 0], [0, 1.075, 0.004], [0.088, 0.066], [0.074, 0.058], 8, 0), NAVY_D);
add(1, 'Collar Trim', tubeHull([0, 1.016, 0], [0, 1.03, 0], [0.093, 0.07], [0.092, 0.069], 8, 0), SILVER_D);
add(1, 'Radio', cbox([-0.095, 0.93, 0.09], [0.052, 0.08, 0.026], 0.006), BLACK);
add(1, 'Radio Screen', cbox([-0.095, 0.945, 0.1035], [0.03, 0.026, 0.004], 0.0012), '#7fd4d0');
add(1, 'Radio Antenna', tubeHull([-0.108, 0.968, 0.09], [-0.114, 1.03, 0.09], 0.007, 0.005, 5, 0), BLACK);
add(1, 'Name Patch', cbox([0.085, 0.93, 0.0875], [0.06, 0.03, 0.006], 0.002), CREAM);
add(1, 'Name Patch Line', cbox([0.085, 0.93, 0.0915], [0.04, 0.007, 0.003], 0.001), RED_D);
add(1, 'Belt', tbox(0, 0, 0.545, 0.585, [0.274, 0.169], [0.272, 0.168], 0.032), BLACK);
add(1, 'Belt Buckle', cbox([0, 0.565, 0.0885], [0.05, 0.034, 0.012], 0.004), GOLD);
add(1, 'Carabiner', cbox([0.128, 0.55, 0.075], [0.026, 0.05, 0.014], 0.004), SILVER_D);
add(1, 'Seat', tbox(0, 0, 0.5, 0.57, [0.262, 0.168], [0.272, 0.168], 0.03), NAVY);

// ---- 2 long sleeves with reflective bands, and dark gloves ----
for (const s of sides) {
  const n = nameOf(s);
  const sh = M(s, J.shoulder);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.115, 1.008, 0], el, 0.066, 0.058, 6, 0), COAT);
  add(2, `Sleeve Lower ${n}`, tubeHull(el, lerp(el, wr, 0.92), 0.056, 0.05, 6, 0), COAT);
  add(2, `Sleeve Band ${n} 1`, tubeHull(lerp(sh, el, 0.62), lerp(sh, el, 0.7), 0.0625, 0.0615, 6, 0), SILVER);
  add(2, `Sleeve Band ${n} 2`, tubeHull(lerp(el, wr, 0.56), lerp(el, wr, 0.64), 0.0545, 0.0535, 6, 0), SILVER);
  add(2, `Cuff ${n}`, tubeHull(lerp(el, wr, 0.9), lerp(el, wr, 1.02), 0.052, 0.05, 6, 0), NAVY_D);
  add(2, `Glove ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.02, wr[1], [0.044, 0.064], [0.04, 0.058], 0.012), BLACK);
  add(2, `Glove Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.03], [wr[0] - s * 0.006, wr[1] - 0.064, wr[2] + 0.046], 0.014, 0.011, 5, 0), BLACK_L);
  add(2, `Glove Knuckles ${n}`, cbox([wr[0], wr[1] - 0.045, wr[2] + 0.04], [0.04, 0.014, 0.01], 0.003), RED_D);
}

// ---- 3 head and face: the shared head, as a man ----
chibiHead(add, 3, {
  skin: SKIN, neck: SKIN_D, ear: '#eebb95', eyeWhite: '#efdcc2', iris: '#4a2f1d', irisGlow: '#8a5a30', pupil: '#1c110a',
  lid: '#241812', brow: '#2b1f19', blush: '#f1b9a0', nose: '#e2a583', mouth: '#bf6a5d',
}, { eye: 0.8, browThick: 1.9, browSlant: 0.02, lash: false, blush: false, jaw: 1.2, neck: 1.3, man: true, stubble: '#e2b48f' });

// ---- 4 short messy hair, and the helmet ----
add(4, 'Hair Crown', blob([0, 1.265, -0.03], [0.15, 0.12, 0.14], 14), HAIR_A);
add(4, 'Hair Back', blob([0, 1.19, -0.07], [0.128, 0.085, 0.092], 12), HAIR_B);
// a short messy fringe peeking out under the helmet's rim
const FRINGE: [number, number, number][] = [[-0.105, -0.115, 1.262], [-0.055, -0.06, 1.252], [-0.005, -0.008, 1.258], [0.045, 0.05, 1.25], [0.095, 0.108, 1.262]];
FRINGE.forEach(([x0, xt, yt], i) => {
  const path: Ring[] = [R([x0 * 0.9, 1.34, 0.07], [0.034, 0.02]), R([x0 * 1.0, 1.3, 0.118], [0.032, 0.014]), R([(x0 + xt) / 2, (1.3 + yt) / 2, 0.128], [0.026, 0.011]), R([xt, yt, 0.132], [0.006, 0.005])];
  add(4, `Fringe ${i + 1}`, sweep(path, { sides: 6, end: 'dome' }), i % 2 ? HAIR_A : HAIR_C);
});
for (const s of sides) {
  const n = nameOf(s);
  add(4, `Sideburn ${n}`, blob([s * 0.139, 1.215, 0.025], [0.011, 0.04, 0.022], 8), HAIR_B);
  add(4, `Nape Tuft ${n}`, sweep([R(M(s, [0.07, 1.12, -0.1]), [0.04, 0.025]), R(M(s, [0.08, 1.09, -0.105]), [0.03, 0.018]), R(M(s, [0.088, 1.07, -0.1]), [0.006, 0.006])], { sides: 6, end: 'dome' }), HAIR_B);
}
// the helmet: a tall dome tilted back, a wide brim that sweeps out behind, a band, a crest and a shield
add(4, 'Helmet', hull([...tilted(1.335, 1.27, 0.168, 0.152, -0.015), ...ring(1.4, 0.152, 0.138, -0.013), ...ring(1.46, 0.108, 0.098, -0.012), ...ring(1.495, 0.05, 0.05, -0.012)]), RED);
add(4, 'Helmet Brim', hull([...tilted(1.338, 1.272, 0.171, 0.155, -0.015), ...tilted(1.322, 1.215, 0.19, 0.205, -0.045)]), RED_D);
add(4, 'Helmet Band', hull([...ring(1.378, 0.1575, 0.1425, -0.013), ...ring(1.396, 0.1535, 0.139, -0.013)]), SILVER);
add(4, 'Helmet Crest', cbox([0, 1.484, -0.012], [0.026, 0.028, 0.1], 0.007), RED_D);
const shield = (w: number, h: number, y: number, z0: number, z1: number): Vec3[] => {
  const pts: [number, number][] = [[-w, 0], [w, 0], [w, -h * 0.6], [0, -h], [-w, -h * 0.6]];
  return pts.flatMap(([x, dy]) => [[x, y + h * 0.5 + dy, z0], [x, y + h * 0.5 + dy, z1]] as Vec3[]);
};
add(4, 'Helmet Shield', hull(shield(0.046, 0.095, 1.397, 0.124, 0.14)), GOLD);
add(4, 'Helmet Shield Inner', hull(shield(0.03, 0.06, 1.397, 0.138, 0.146)), RED);
add(4, 'Helmet Shield Flame', hull(shield(0.012, 0.028, 1.4, 0.144, 0.15)), CREAM);
add(4, 'Helmet Strap', tubeHull([0.1, 1.28, -0.04], [0.1, 1.17, 0.035], 0.012, 0.01, 4, 0), BLACK);

applyStyle(parts, [
  [/^(Head|Neck|Ear)/, { smooth: true }],
  [/^(Hair|Fringe|Sideburn|Nape)/, { smooth: true, paint: 0.35 }],
  [/^(Coat|Collar|Sleeve|Cuff|Trouser|Seat|Belt|Boot|Sole|Glove|Helmet)/, { paint: 0.25 }],
]);

export const FIREFIGHTER: AssetDef = {
  id: 'firefighter',
  rig: () => humanSpec(J),
  name: 'Firefighter',
  tagline: 'The game firefighter: the same chunky base as the girls, as a man in a red helmet and an orange turnout coat',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Turn the shared head into a man: a square jaw, smaller eyes and thick brows', 'Build a helmet from a tilted dome, a brim and a few flat plates', 'Fake reflective tape with thin silver rings around tubes', 'Dress a figure in bulky layers: coat, belt, trousers, boots'],
  steps: [
    { title: 'Trousers and boots', text: 'The trousers are two wide six-sided tubes in navy with a darker knee patch and two thin silver rings above the ankle, which reads as reflective tape. The boots are tall black bevelled boxes with a lighter toe cap, a red top and a dark sole, and they point a little outward.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box', 'Duplicate Ctrl+D'] },
    { title: 'Turnout coat', text: 'The coat is one orange box that is wider at the shoulders than at the hips, with a lighter chest panel and a darker band at the hem. Two silver bands, a black zip, a navy collar, a radio with a small screen and a name patch make it a uniform. A black belt with a gold buckle and a carabiner closes it at the waist.', tools: ['Shape: Box', 'Edit shape: scale a face (R)', 'Thin boxes for tape'] },
    { title: 'Sleeves and gloves', text: 'The sleeves are long tubes that run from the shoulder to the wrist, each with two silver rings and a navy cuff. The gloves are dark boxes with a thumb and a red mark on the knuckles.', tools: ['Shape: Cylinder, 6 sides', 'Rotate (E)', 'Mirror ideas: duplicate and move'] },
    { title: 'Head and face', text: 'The head is the shared round head, with a wider jaw and a thicker neck. The face is drawn with smaller dark-brown eyes, no lash wing, no blush, thick brows slanting toward the nose, a bigger nose and a flat wide mouth.', tools: ['Shape: Sphere', 'Thin plates', 'Color palette'] },
    { title: 'Hair and helmet', text: 'Short dark hair has a messy fringe of five short strands that peek out under the helmet, with sideburns and tufts at the nape. The helmet is a red dome tilted back, with a darker brim that sweeps out behind, a silver band, a crest on top and a gold shield with a red centre on the front.', tools: ['Shape: Sphere', 'Edit shape: move points', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: he bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Make a rescue captain: recolor the helmet white, add a second silver band on the coat and give him a short beard with two flat boxes.',
  parts,
};
