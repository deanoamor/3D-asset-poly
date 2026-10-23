import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHair, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { slab, tubeHull } from './lowpoly';
import { blob, toPart } from './organic';
import { humanSpec } from './rigs';

/**
 * A young woman in a summer dress: the chunky base and the girls' face, a layered bob, a red dress with a flared skirt,
 * a white collar and belt with a bow, bare legs and sandals. The game recolours her into others.
 * Left is +X, Right is -X, and she faces +Z.
 */

const DRESS = '#d4504f';
const DRESS_D = '#b03c3c';
const DRESS_L = '#e87570';
const WHITE = '#f6f4ee';
const WHITE_D = '#d8d4c8';
const BELT = '#f2f0e8';
const SANDAL = '#a8704a';
const SANDAL_D = '#7a4a30';
const SKIN = '#fbe0c0';
const SKIN_D = '#eeb994';
const FLOWER = '#f6e08a';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));

// ---- 0 bare legs and sandals ----
for (const s of sides) {
  const n = nameOf(s);
  const knee = M(s, J.knee);
  const x = M(s, J.ankle)[0];
  add(0, `Thigh ${n}`, tubeHull(M(s, [0.066, 0.5, 0]), knee, 0.054, 0.044, 6, 0), SKIN);
  add(0, `Shin ${n}`, tubeHull(knee, M(s, [0.092, 0.1, 0]), 0.044, 0.034, 6, 0), SKIN);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 14);
  add(0, `Sandal ${n}`, out(cbox([x, 0.03, 0.05], [0.112, 0.036, 0.24], 0.01)), SANDAL);
  add(0, `Sandal Strap ${n}`, out(cbox([x, 0.07, 0.06], [0.118, 0.026, 0.05], 0.006)), SANDAL_D);
  add(0, `Sandal Heel ${n}`, out(cbox([x, 0.07, -0.02], [0.1, 0.034, 0.03], 0.006)), SANDAL_D);
}

// ---- 1 the dress: a fitted top, a belt, a flared skirt with a hem band ----
add(1, 'Skirt', tbox(0, 0, 0.4, 0.68, [0.34, 0.24], [0.24, 0.158], 0.03), DRESS);
add(1, 'Skirt Hem', tbox(0, 0, 0.4, 0.43, [0.344, 0.244], [0.34, 0.24], 0.03), DRESS_D);
add(1, 'Bodice', tbox(0, 0, 0.66, 1.03, [0.228, 0.143], [0.262, 0.143], 0.025), DRESS);
add(1, 'Bodice Shade', tbox(0, 0, 0.66, 0.72, [0.23, 0.145], [0.236, 0.147], 0.025), DRESS_D);
add(1, 'Belt', tbox(0, 0, 0.64, 0.685, [0.236, 0.15], [0.234, 0.15], 0.028), BELT);
add(1, 'Collar', tubeHull([0, 1.02, 0], [0, 1.05, 0], [0.074, 0.058], [0.066, 0.052], 8, 0), WHITE);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Collar Flap ${n}`, slab([M(s, [0.012, 1.03, 0.072]), M(s, [0.08, 1.02, 0.072]), M(s, [0.05, 0.94, 0.0745]), M(s, [0.008, 0.9, 0.0745])], 0.006), WHITE);
  add(1, `Belt Bow ${n}`, slab([M(s, [0.012, 0.662, 0.0805]), M(s, [0.07, 0.69, 0.0805]), M(s, [0.07, 0.634, 0.0805])], 0.01), BELT);
}
add(1, 'Belt Knot', cbox([0, 0.662, 0.082], [0.03, 0.03, 0.014], 0.005), WHITE_D);
for (const [i, [x, y, z]] of ([[-0.12, 0.55, 0.15], [0.1, 0.5, 0.17], [0.0, 0.58, 0.11], [-0.2, 0.46, 0.1], [0.2, 0.55, 0.08]] as [number, number, number][]).entries()) add(1, `Flower ${i + 1}`, cbox([x, y, z], [0.034, 0.034, 0.008], 0.003), FLOWER);

// ---- 2 short puff sleeves, bare arms ----
for (const s of sides) {
  const n = nameOf(s);
  const sh = M(s, J.shoulder);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.112, 1.012, 0], lerp(sh, el, 0.3), 0.064, 0.058, 6, 0), DRESS);
  add(2, `Sleeve Hem ${n}`, tubeHull(lerp(sh, el, 0.27), lerp(sh, el, 0.33), 0.059, 0.058, 6, 0), DRESS_L);
  add(2, `Upper Arm ${n}`, tubeHull(lerp(sh, el, 0.28), el, 0.033, 0.029, 6, 0), SKIN);
  add(2, `Forearm ${n}`, tubeHull(el, wr, 0.029, 0.025, 6, 0), SKIN);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.015, wr[1], [0.036, 0.058], [0.032, 0.05], 0.01), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.025], [wr[0] - s * 0.006, wr[1] - 0.06, wr[2] + 0.04], 0.011, 0.009, 5, 0), SKIN_D);
}

// ---- 3 head and face ----
chibiHead(add, 3, {
  skin: '#fde3c3', neck: '#f2c4a0', ear: '#f6cdb0', eyeWhite: '#f7efe4', iris: '#3a6a5a', irisGlow: '#8ac0a8', pupil: '#102018',
  lid: '#2b1a17', brow: '#4a3024', blush: '#f7bdb0', nose: '#efb89c', mouth: '#d6606a',
});

// ---- 4 the layered bob in light brown, and a flower clip ----
chibiHair(add, 4, { a: '#8a5a38', b: '#6a4228', c: '#a8744a', d: '#7a4e30', shine: '#e0b890' });
const clip: Vec3 = [-0.095, 1.372, 0.09];
add(4, 'Hair Flower', blob(clip, [0.024, 0.014, 0.014], 6), FLOWER);

applyStyle(parts, [
  [/^(Head|Neck|Ear)/, { smooth: true }],
  [/^(Thigh|Shin|Upper Arm|Forearm|Hand|Thumb)/, { paint: 0.12 }],
  [/^(Hair|Bang|Face |Bob )/, { smooth: true, paint: 0.4 }],
  [/^(Skirt|Bodice|Belt|Collar|Sleeve|Sandal|Flower)/, { paint: 0.25 }],
]);

export const DRESSGIRL: AssetDef = {
  id: 'dress',
  rig: () => humanSpec(J),
  name: 'Woman in a Dress',
  tagline: 'A young woman for the streets: a red summer dress with a flared skirt and a bow, a bob and sandals',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Flare a skirt from a box that is wider at the hem', 'Tie a bow from a knot and two plates', 'Puff a sleeve with a wide short tube', 'Sprinkle a pattern with tiny flat boxes'],
  steps: [
    { title: 'Legs and sandals', text: 'Bare legs and flat brown sandals with a strap over the foot.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box'] },
    { title: 'The dress', text: 'A fitted bodice, a white belt with a bow, a flared skirt with a darker hem and yellow flowers, and a white collar.', tools: ['Shape: Box', 'Thin plates', 'Edit shape: scale a face (R)'] },
    { title: 'Sleeves and arms', text: 'Short puff sleeves and bare arms.', tools: ['Shape: Cylinder, 6 sides'] },
    { title: 'Head and face', text: 'The shared girls\' face with green eyes.', tools: ['Thin plates', 'Color palette'] },
    { title: 'Hair', text: 'The layered bob in light brown with a flower clip.', tools: ['Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'The skeleton is the shared one; when you export to GLB every part is skinned to these joints automatically.', tools: ['Skeleton panel (under Layers)'], rig: true },
  ],
  challenge: 'Add a wide straw hat with a ribbon.',
  parts,
};
