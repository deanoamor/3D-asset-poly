import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { hull, ringPts, tubeHull } from './lowpoly';
import { blob, sweep, toPart, type Ring } from './organic';
import { humanSpec } from './rigs';

/**
 * A ramen cook for the streets: the chunky base and the man's face, a white double-breasted jacket with rolled sleeves,
 * a long dark apron, a white headband (tenugui), dark trousers and black clogs. The game recolours him into others.
 * Left is +X, Right is -X, and he faces +Z.
 */

const WHITE = '#f4f2ea';
const WHITE_D = '#d8d4c8';
const APRON = '#26303a';
const APRON_L = '#3a4654';
const TROUSER = '#2c2d33';
const CLOG = '#2a2320';
const BAND = '#f6f4ee';
const BAND_RED = '#c8402f';
const SKIN = '#f3cba3';
const SKIN_D = '#dca37c';
const HAIR_A = '#25201d';
const HAIR_B = '#181513';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
const ring = (y: number, rx: number, rz: number, cz = 0): Vec3[] => ringPts([0, y, cz], [0, 1, 0], rx, rz, 12, Math.PI / 12);

// ---- 0 trousers and clogs ----
for (const s of sides) {
  const n = nameOf(s);
  const x = M(s, J.ankle)[0];
  add(0, `Trouser ${n}`, tubeHull(M(s, [0.066, 0.6, 0]), M(s, [0.09, 0.12, 0]), 0.076, 0.06, 6, 0), TROUSER);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 10);
  add(0, `Clog ${n}`, out(tbox(x, 0.03, 0.02, 0.09, [0.108, 0.23], [0.094, 0.17], 0.024)), CLOG);
  add(0, `Clog Sole ${n}`, out(cbox([x, 0.02, 0.03], [0.114, 0.04, 0.24], 0.008)), '#6a4a30');
}

// ---- 1 the jacket, the apron, a towel ----
add(1, 'Jacket', tbox(0, 0, 0.52, 1.04, [0.272, 0.168], [0.312, 0.168], 0.032), WHITE);
add(1, 'Jacket Shade', tbox(0, 0, 0.52, 0.6, [0.274, 0.17], [0.282, 0.172], 0.032), WHITE_D);
add(1, 'Collar', tubeHull([0, 1.02, 0], [0, 1.065, 0.003], [0.09, 0.068], [0.078, 0.06], 8, 0), WHITE);
for (const [i, y] of [0.93, 0.83, 0.73].entries()) for (const s of sides) add(1, `Button ${i + 1}${nameOf(s)}`, cbox([s * 0.04, y, 0.0895], [0.014, 0.014, 0.006], 0.002), WHITE_D);
add(1, 'Jacket Fold', tubeHull([-0.1, 1.0, 0.087], [0.1, 0.62, 0.087], 0.006, 0.006, 4, 0), WHITE_D);
add(1, 'Apron', tbox(0, 0, 0.3, 0.74, [0.222, 0.178], [0.215, 0.17], 0.026), APRON);
add(1, 'Apron Pocket', cbox([0, 0.5, 0.1], [0.17, 0.12, 0.01], 0.003), APRON_L);
add(1, 'Apron String', cbox([0, 0.72, 0.0], [0.28, 0.014, 0.34], 0.004), APRON_L);
add(1, 'Towel', cbox([0.12, 0.7, 0.101], [0.07, 0.2, 0.01], 0.003), BAND);
add(1, 'Towel Stripe', cbox([0.12, 0.66, 0.1075], [0.07, 0.03, 0.004], 0.001), BAND_RED);

// ---- 2 rolled sleeves: white to the elbow, bare forearms ----
for (const s of sides) {
  const n = nameOf(s);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.115, 1.008, 0], lerp([s * 0.115, 1.008, 0], el, 0.95), 0.066, 0.058, 6, 0), WHITE);
  add(2, `Sleeve Roll ${n}`, tubeHull(lerp([s * 0.115, 1.008, 0], el, 0.88), lerp([s * 0.115, 1.008, 0], el, 1.0), 0.062, 0.061, 6, 0), WHITE_D);
  add(2, `Forearm ${n}`, tubeHull(el, lerp(el, wr, 0.96), 0.047, 0.04, 6, 0), SKIN);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.02, wr[1], [0.042, 0.06], [0.036, 0.054], 0.012), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.03], [wr[0] - s * 0.006, wr[1] - 0.064, wr[2] + 0.046], 0.014, 0.011, 5, 0), SKIN_D);
}

// ---- 3 head and face ----
chibiHead(add, 3, {
  skin: SKIN, neck: SKIN_D, ear: '#e8b48d', eyeWhite: '#f1e3cd', iris: '#3a2a1e', irisGlow: '#7a5230', pupil: '#17100b',
  lid: '#241812', brow: '#1f1815', blush: '#f1b9a0', nose: '#dca07e', mouth: '#bf6a5d',
}, { eye: 0.82, browThick: 1.9, browSlant: 0.03, lash: false, blush: false, jaw: 1.2, neck: 1.3, man: true });

// ---- 4 close-cropped hair under a white headband tied at the front ----
add(4, 'Hair Crown', blob([0, 1.272, -0.03], [0.15, 0.118, 0.14], 14), HAIR_A);
add(4, 'Hair Back', blob([0, 1.19, -0.07], [0.128, 0.088, 0.092], 12), HAIR_B);
add(4, 'Headband', hull([...ring(1.27, 0.158, 0.147, -0.015), ...ring(1.325, 0.157, 0.146, -0.015)]), BAND);
add(4, 'Headband Stripe', hull([...ring(1.3, 0.1585, 0.1475, -0.015), ...ring(1.312, 0.1582, 0.1472, -0.015)]), BAND_RED);
add(4, 'Headband Knot', cbox([0, 1.3, 0.138], [0.05, 0.04, 0.02], 0.006), BAND);
for (const s of sides) add(4, `Headband Tail ${nameOf(s)}`, sweep([R([s * 0.02, 1.3, 0.14], [0.016, 0.01]), R([s * 0.05, 1.27, 0.15], [0.016, 0.008]), R([s * 0.07, 1.23, 0.15], [0.006, 0.005])], { sides: 5, end: 'dome' }), BAND);

applyStyle(parts, [
  [/^(Head|Neck|Ear|Forearm|Hand|Thumb)/, { smooth: true }],
  [/^(Hair)/, { smooth: true, paint: 0.35 }],
  [/^(Jacket|Collar|Button|Sleeve|Apron|Towel|Trouser|Clog|Headband)/, { paint: 0.25 }],
]);

export const CHEF: AssetDef = {
  id: 'chef',
  rig: () => humanSpec(J),
  name: 'Ramen Cook',
  tagline: 'A cook for the streets: a white jacket with rolled sleeves, a long dark apron, a white headband and clogs',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Roll a sleeve with a tube and a short ring', 'Tie a headband round the head with a ring hull', 'Hang an apron from a belt string', 'Fold a towel from a box with a stripe'],
  steps: [
    { title: 'Trousers and clogs', text: 'Dark tapered trousers and black wooden clogs with a brown sole.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box'] },
    { title: 'Jacket, apron and towel', text: 'A white jacket with a stand collar, two rows of buttons and a fold across the chest, a long dark apron with a pocket, and a towel at the hip.', tools: ['Shape: Box', 'Thin boxes'] },
    { title: 'Rolled sleeves', text: 'White sleeves that stop at the elbow with a rolled cuff, and bare forearms.', tools: ['Shape: Cylinder, 6 sides'] },
    { title: 'Head and face', text: 'The shared man\'s face, with strong brows.', tools: ['Thin plates'] },
    { title: 'Hair and headband', text: 'Close-cropped hair under a white headband with a red stripe, tied in a knot at the front with two tails.', tools: ['Shape: Sphere', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'The skeleton is the shared one; when you export to GLB every part is skinned to these joints automatically.', tools: ['Skeleton panel (under Layers)'], rig: true },
  ],
  challenge: 'Make a sushi chef: a white hat instead of the headband and no apron.',
  parts,
};
