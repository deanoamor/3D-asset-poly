import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { hull, ringPts, tubeHull } from './lowpoly';
import { blob, sweep, toPart, type Ring } from './organic';
import { humanSpec } from './rigs';

/**
 * A young man in a hoodie for the streets: the chunky base and the man's face, an orange hoodie with a hood, a front
 * pocket and drawstrings, blue jeans, white sneakers and short messy hair. The game recolours him into others.
 * Left is +X, Right is -X, and he faces +Z.
 */

const HOODIE = '#e8782f';
const HOODIE_D = '#c45f22';
const HOODIE_L = '#f09450';
const JEANS = '#3f5f8f';
const JEANS_D = '#2f4a72';
const JEANS_L = '#5a7aa8';
const WHITE = '#f4f4f0';
const SOLE = '#d9dde0';
const STRIPE = '#e8402a';
const SKIN = '#f3cba3';
const SKIN_D = '#dca37c';
const HAIR_A = '#3a2a22';
const HAIR_B = '#241a15';
const HAIR_C = '#54402f';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
const ring = (y: number, rx: number, rz: number, cz = 0): Vec3[] => ringPts([0, y, cz], [0, 1, 0], rx, rz, 12, Math.PI / 12);

// ---- 0 jeans and sneakers ----
for (const s of sides) {
  const n = nameOf(s);
  const x = M(s, J.ankle)[0];
  add(0, `Jeans ${n}`, tubeHull(M(s, [0.066, 0.6, 0]), M(s, [0.09, 0.12, 0]), 0.078, 0.062, 6, 0), JEANS);
  add(0, `Jeans Knee ${n}`, tubeHull(M(s, [0.078, 0.4, 0.004]), M(s, [0.081, 0.34, 0.004]), 0.0745, 0.073, 6, 0), JEANS_L);
  add(0, `Jeans Cuff ${n}`, tubeHull(M(s, [0.09, 0.15, 0]), M(s, [0.09, 0.12, 0]), 0.064, 0.063, 6, 0), JEANS_D);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 14);
  add(0, `Sneaker ${n}`, out(tbox(x, 0.035, 0.02, 0.1, [0.114, 0.24], [0.1, 0.18], 0.026)), WHITE);
  add(0, `Sneaker Toe ${n}`, out(cbox([x, 0.05, 0.115], [0.108, 0.056, 0.074], 0.018)), WHITE);
  add(0, `Sneaker Stripe ${n}`, out(cbox([x, 0.07, 0.03], [0.118, 0.022, 0.1], 0.004)), STRIPE);
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.03], [0.12, 0.024, 0.25], 0.008)), SOLE);
}

// ---- 1 the hoodie: body, front pocket, drawstrings, hem, and the hood hanging at the back ----
add(1, 'Hoodie', tbox(0, 0, 0.5, 1.04, [0.282, 0.178], [0.322, 0.178], 0.04), HOODIE);
add(1, 'Hoodie Shade', tbox(0, 0, 0.5, 0.58, [0.284, 0.18], [0.292, 0.182], 0.04), HOODIE_D);
add(1, 'Hoodie Hem', tbox(0, 0, 0.5, 0.54, [0.286, 0.181], [0.288, 0.182], 0.04), HOODIE_D);
add(1, 'Pocket', cbox([0, 0.66, 0.0925], [0.19, 0.12, 0.012], 0.004), HOODIE_L);
add(1, 'Pocket Edge', cbox([0, 0.72, 0.1], [0.2, 0.012, 0.006], 0.002), HOODIE_D);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Cord ${n}`, tubeHull([s * 0.04, 1.0, 0.09], [s * 0.046, 0.84, 0.098], 0.007, 0.007, 5, 0), WHITE);
  add(1, `Cord Tip ${n}`, cbox([s * 0.046, 0.825, 0.098], [0.012, 0.03, 0.012], 0.003), JEANS_D);
}
add(1, 'Hood', hull([...ring(1.05, 0.15, 0.1, -0.1), ...ring(1.0, 0.17, 0.12, -0.12), ...ring(0.94, 0.14, 0.09, -0.12)]), HOODIE);
add(1, 'Hood Rim', tubeHull([0, 1.04, 0.0], [0, 1.07, 0.0], [0.12, 0.09], [0.115, 0.085], 10, 0), HOODIE_D);

// ---- 2 long sleeves with ribbed cuffs ----
for (const s of sides) {
  const n = nameOf(s);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.115, 1.008, 0], el, 0.068, 0.06, 6, 0), HOODIE);
  add(2, `Sleeve Lower ${n}`, tubeHull(el, lerp(el, wr, 0.9), 0.058, 0.05, 6, 0), HOODIE);
  add(2, `Cuff ${n}`, tubeHull(lerp(el, wr, 0.88), lerp(el, wr, 1.0), 0.047, 0.045, 6, 0), HOODIE_D);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.02, wr[1], [0.042, 0.06], [0.036, 0.054], 0.012), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.03], [wr[0] - s * 0.006, wr[1] - 0.064, wr[2] + 0.046], 0.014, 0.011, 5, 0), SKIN_D);
}

// ---- 3 head and face ----
chibiHead(add, 3, {
  skin: SKIN, neck: SKIN_D, ear: '#e8b48d', eyeWhite: '#f1e3cd', iris: '#3a2a1e', irisGlow: '#7a5230', pupil: '#17100b',
  lid: '#241812', brow: '#2a201a', blush: '#f1b9a0', nose: '#dca07e', mouth: '#bf6a5d',
}, { eye: 0.92, browThick: 1.4, browSlant: 0.01, lash: false, blush: false, jaw: 1.0, neck: 1.1, man: true });

// ---- 4 short messy hair with a few spikes ----
add(4, 'Hair Crown', blob([0, 1.272, -0.03], [0.152, 0.12, 0.142], 14), HAIR_A);
add(4, 'Hair Back', blob([0, 1.19, -0.07], [0.13, 0.09, 0.094], 12), HAIR_B);
const SPIKES: [number, number, number][] = [[-0.09, -0.12, 1.4], [-0.04, -0.05, 1.43], [0.02, 0.03, 1.44], [0.075, 0.1, 1.42], [0.115, 0.16, 1.39]];
SPIKES.forEach(([x0, xt, yt], i) => {
  const path: Ring[] = [R([x0, 1.36, -0.01 + i * 0.015], [0.04, 0.04]), R([(x0 + xt) / 2, (1.36 + yt) / 2, 0.01 + i * 0.012], [0.028, 0.026]), R([xt, yt, 0.02 + i * 0.01], [0.006, 0.006])];
  add(4, `Spike ${i + 1}`, sweep(path, { sides: 5, end: 'dome' }), i % 2 ? HAIR_C : HAIR_A);
});
const FRINGE: [number, number, number][] = [[-0.1, -0.11, 1.28], [-0.05, -0.06, 1.268], [0.0, 0.0, 1.274], [0.05, 0.06, 1.266], [0.1, 0.11, 1.28]];
FRINGE.forEach(([x0, xt, yt], i) => {
  const path: Ring[] = [R([x0 * 0.9, 1.35, 0.07], [0.034, 0.02]), R([x0, 1.31, 0.118], [0.032, 0.014]), R([(x0 + xt) / 2, (1.31 + yt) / 2, 0.128], [0.026, 0.011]), R([xt, yt, 0.132], [0.006, 0.005])];
  add(4, `Fringe ${i + 1}`, sweep(path, { sides: 6, end: 'dome' }), i % 2 ? HAIR_A : HAIR_C);
});
for (const s of sides) add(4, `Sideburn ${nameOf(s)}`, blob([s * 0.139, 1.215, 0.025], [0.011, 0.04, 0.022], 8), HAIR_B);

applyStyle(parts, [
  [/^(Head|Neck|Ear|Hand|Thumb)/, { smooth: true }],
  [/^(Hair|Spike|Fringe|Sideburn)/, { smooth: true, paint: 0.35 }],
  [/^(Hoodie|Pocket|Hood|Cord|Sleeve|Cuff|Jeans|Sneaker|Sole)/, { paint: 0.25 }],
]);

export const HOODIE_GUY: AssetDef = {
  id: 'hoodie',
  rig: () => humanSpec(J),
  name: 'Young Man in a Hoodie',
  tagline: 'A young man for the streets: an orange hoodie with a hood and drawstrings, jeans and white sneakers',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Dress the shared man in a baggy hoodie', 'Hang a hood at the back with a rounded hull', 'Fake a front pocket and drawstrings with thin boxes and tubes', 'Spike hair with short tapered sweeps'],
  steps: [
    { title: 'Jeans and sneakers', text: 'Tapered tubes in blue with lighter knees and darker turn-ups, and white sneakers with a red stripe and a light sole.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box'] },
    { title: 'The hoodie', text: 'One wide box with a darker hem, a lighter front pocket, two white drawstrings with tips, and a hood: a soft rounded hull behind the neck with a rim round it.', tools: ['Shape: Box', 'Thin boxes', 'Shape: Cylinder'] },
    { title: 'Sleeves and hands', text: 'Long baggy sleeves with ribbed cuffs, and boxy hands.', tools: ['Shape: Cylinder, 6 sides'] },
    { title: 'Head and face', text: 'The shared man\'s face with a softer jaw and friendly eyes.', tools: ['Thin plates'] },
    { title: 'Hair', text: 'Short messy hair: a crown, a back, five spikes pointing up and five strands for the fringe.', tools: ['Shape: Sphere', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'The skeleton is the shared one; when you export to GLB every part is skinned to these joints automatically.', tools: ['Skeleton panel (under Layers)'], rig: true },
  ],
  challenge: 'Pull the hood up over his head.',
  parts,
};
