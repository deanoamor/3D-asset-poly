import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { tubeHull } from './lowpoly';
import { blob, sweep, toPart, type Ring } from './organic';
import { humanSpec } from './rigs';

/**
 * An old woman for the streets: the chunky base, a soft round face with small eyes and lines, grey hair in a bun,
 * a long cardigan over a blouse, a long skirt, a scarf and comfortable shoes. Left is +X, Right is -X, and she faces +Z.
 */

const CARD = '#6d8a62';
const CARD_D = '#566f4e';
const CARD_L = '#86a07a';
const BLOUSE = '#efe8da';
const SKIRT = '#8a7a6a';
const SKIRT_D = '#6e5f50';
const SCARF = '#c46f6a';
const SHOE = '#5a4638';
const SOLE = '#2c2420';
const SKIN = '#f2cfae';
const SKIN_D = '#d9a888';
const HAIR_A = '#b8b6b4';
const HAIR_B = '#9a9896';
const HAIR_C = '#d2d0cc';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });

// ---- 0 legs and walking shoes ----
for (const s of sides) {
  const n = nameOf(s);
  const x = M(s, J.ankle)[0];
  add(0, `Shin ${n}`, tubeHull(M(s, [0.09, 0.3, 0]), M(s, [0.092, 0.1, 0]), 0.04, 0.034, 6, 0), SKIN_D);
  add(0, `Sock ${n}`, tubeHull([x, 0.14, 0], [x, 0.09, 0], 0.044, 0.042, 6, 0), BLOUSE);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 10);
  add(0, `Shoe ${n}`, out(tbox(x, 0.035, 0.02, 0.095, [0.114, 0.24], [0.1, 0.19], 0.022)), SHOE);
  add(0, `Shoe Toe ${n}`, out(cbox([x, 0.046, 0.12], [0.108, 0.054, 0.078], 0.016)), SHOE);
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.035], [0.12, 0.024, 0.25], 0.008)), SOLE);
}

// ---- 1 long skirt, blouse, long cardigan, scarf ----
add(1, 'Skirt', tbox(0, 0, 0.26, 0.62, [0.32, 0.22], [0.26, 0.17], 0.03), SKIRT);
add(1, 'Skirt Hem', tbox(0, 0, 0.26, 0.285, [0.324, 0.224], [0.322, 0.222], 0.03), SKIRT_D);
add(1, 'Blouse', tbox(0, 0, 0.6, 1.03, [0.232, 0.15], [0.262, 0.15], 0.025), BLOUSE);
add(1, 'Cardigan', tbox(0, 0, 0.42, 1.04, [0.29, 0.172], [0.318, 0.172], 0.034), CARD);
add(1, 'Cardigan Shade', tbox(0, 0, 0.42, 0.52, [0.292, 0.174], [0.3, 0.176], 0.034), CARD_D);
add(1, 'Cardigan Opening', cbox([0, 0.78, 0.0895], [0.07, 0.52, 0.006], 0.002), BLOUSE);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Cardigan Edge ${n}`, cbox([s * 0.04, 0.78, 0.09], [0.018, 0.54, 0.008], 0.003), CARD_L);
  add(1, `Cardigan Pocket ${n}`, cbox([s * 0.14, 0.58, 0.0885], [0.08, 0.1, 0.008], 0.003), CARD_D);
  add(1, `Cardigan Button ${n}`, cbox([s * 0.026, 0.86 - (s > 0 ? 0 : 0.0), 0.0925], [0.012, 0.012, 0.005], 0.002), CARD_L);
}
add(1, 'Scarf', tubeHull([0, 1.0, 0], [0, 1.07, 0.003], [0.1, 0.08], [0.086, 0.07], 8, 0), SCARF);
add(1, 'Scarf Tail', cbox([0.04, 0.95, 0.092], [0.05, 0.14, 0.012], 0.004), SCARF);

// ---- 2 cardigan sleeves, hands ----
for (const s of sides) {
  const n = nameOf(s);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.115, 1.008, 0], el, 0.064, 0.056, 6, 0), CARD);
  add(2, `Sleeve Lower ${n}`, tubeHull(el, lerp(el, wr, 0.9), 0.054, 0.046, 6, 0), CARD);
  add(2, `Cuff ${n}`, tubeHull(lerp(el, wr, 0.88), lerp(el, wr, 1.0), 0.047, 0.045, 6, 0), CARD_D);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.015, wr[1], [0.038, 0.058], [0.034, 0.052], 0.011), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.025], [wr[0] - s * 0.006, wr[1] - 0.06, wr[2] + 0.04], 0.012, 0.01, 5, 0), SKIN_D);
}

// ---- 3 head and face: small kind eyes, soft brows ----
chibiHead(add, 3, {
  skin: SKIN, neck: SKIN_D, ear: '#e8bf9e', eyeWhite: '#eee4d2', iris: '#4a3a2a', irisGlow: '#7a6040', pupil: '#1c140c',
  lid: '#4a3a30', brow: '#9a9896', blush: '#eab8a0', nose: '#d9a888', mouth: '#b86a62',
}, { eye: 0.72, browThick: 1.5, browSlant: -0.01, lash: false, blush: true, jaw: 1.0, neck: 1.1 });

// ---- 4 grey hair, short at the sides, tied up in a bun ----
add(4, 'Hair Crown', blob([0, 1.272, -0.03], [0.152, 0.12, 0.142], 14), HAIR_A);
add(4, 'Hair Back', blob([0, 1.19, -0.07], [0.14, 0.1, 0.1], 12), HAIR_B);
add(4, 'Hair Top', blob([0.01, 1.335, -0.01], [0.115, 0.05, 0.11], 10), HAIR_C);
add(4, 'Hair Bun', blob([0, 1.31, -0.17], [0.07, 0.06, 0.06], 10), HAIR_C);
add(4, 'Hair Pin', cbox([0.03, 1.31, -0.215], [0.05, 0.012, 0.01], 0.003), '#c8a04a');
const FRINGE: [number, number, number][] = [[-0.1, -0.11, 1.28], [-0.045, -0.05, 1.272], [0.01, 0.005, 1.276], [0.065, 0.07, 1.272], [0.105, 0.11, 1.28]];
FRINGE.forEach(([x0, xt, yt], i) => {
  const path: Ring[] = [R([x0 * 0.9, 1.35, 0.07], [0.034, 0.02]), R([x0, 1.31, 0.118], [0.032, 0.014]), R([(x0 + xt) / 2, (1.31 + yt) / 2, 0.128], [0.026, 0.011]), R([xt, yt, 0.132], [0.006, 0.005])];
  add(4, `Fringe ${i + 1}`, sweep(path, { sides: 6, end: 'dome' }), i % 2 ? HAIR_A : HAIR_C);
});
for (const s of sides) add(4, `Side Hair ${nameOf(s)}`, blob([s * 0.138, 1.2, 0.0], [0.014, 0.065, 0.045], 8), HAIR_B);

applyStyle(parts, [
  [/^(Head|Neck|Ear|Hand|Thumb|Shin)/, { smooth: true }],
  [/^(Hair|Fringe|Side)/, { smooth: true, paint: 0.35 }],
  [/^(Skirt|Blouse|Cardigan|Sleeve|Cuff|Scarf|Shoe|Sole|Sock)/, { paint: 0.25 }],
]);

export const ELDER: AssetDef = {
  id: 'elder',
  rig: () => humanSpec(J),
  name: 'Grandmother',
  tagline: 'An old woman for the streets: grey hair in a bun, a long green cardigan, a long skirt and a scarf',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Age a character with colour, a smaller eye and grey hair', 'Layer a long cardigan over a blouse and skirt', 'Tie hair up in a bun with a blob and a pin', 'Wrap a scarf from a short tube'],
  steps: [
    { title: 'Legs and shoes', text: 'A long skirt hides most of the legs; only the shins show above flat, comfortable shoes with white socks.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box'] },
    { title: 'Skirt, blouse, cardigan and scarf', text: 'The skirt is a wide box down to the shins. The cardigan is a long box with an open front that shows the blouse, two pockets and buttons, and a scarf sits round the neck.', tools: ['Shape: Box', 'Thin boxes'] },
    { title: 'Sleeves and hands', text: 'Long cardigan sleeves with darker cuffs and small hands.', tools: ['Shape: Cylinder, 6 sides'] },
    { title: 'Head and face', text: 'The shared face with smaller eyes, grey brows and a soft blush.', tools: ['Thin plates', 'Color palette'] },
    { title: 'Hair', text: 'Grey hair short at the sides and tied up in a bun at the back with a gold pin.', tools: ['Shape: Sphere', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'The skeleton is the shared one; when you export to GLB every part is skinned to these joints automatically.', tools: ['Skeleton panel (under Layers)'], rig: true },
  ],
  challenge: 'Give her a walking stick and a shopping bag.',
  parts,
};
