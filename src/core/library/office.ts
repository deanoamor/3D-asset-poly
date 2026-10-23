import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHair, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { slab, tubeHull } from './lowpoly';
import { blob, toPart } from './organic';
import { humanSpec } from './rigs';

/**
 * A woman in office clothes: the chunky base and the girls' face, a layered bob, a white blouse with a bow, a blazer,
 * a knee-length skirt, tights and pumps. The game recolours her into others (a grey blazer, black hair).
 * Left is +X, Right is -X, and she faces +Z.
 */

const BLAZER = '#c8b090';
const BLAZER_D = '#a89270';
const BLAZER_L = '#d8c4a6';
const SKIRT = '#2b3552';
const SKIRT_D = '#202840';
const BLOUSE = '#f6f4ee';
const BLOUSE_D = '#d8d4c8';
const BOW = '#c8504f';
const TIGHTS = '#b89a82';
const SHOE = '#3a2a2a';
const SOLE = '#1c1414';
const SKIN = '#fbe0c0';
const SKIN_D = '#eeb994';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));

// ---- 0 legs in tights, and pumps ----
for (const s of sides) {
  const n = nameOf(s);
  const knee = M(s, J.knee);
  const x = M(s, J.ankle)[0];
  add(0, `Thigh ${n}`, tubeHull(M(s, [0.066, 0.5, 0]), knee, 0.056, 0.046, 6, 0), TIGHTS);
  add(0, `Shin ${n}`, tubeHull(knee, M(s, [0.092, 0.1, 0]), 0.046, 0.034, 6, 0), TIGHTS);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 14);
  add(0, `Pump ${n}`, out(tbox(x, 0.03, 0.02, 0.09, [0.1, 0.23], [0.09, 0.17], 0.024)), SHOE);
  add(0, `Pump Toe ${n}`, out(cbox([x, 0.046, 0.115], [0.094, 0.05, 0.07], 0.016)), SHOE);
  add(0, `Heel ${n}`, out(cbox([x, 0.03, -0.075], [0.04, 0.06, 0.04], 0.008)), SOLE);
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.04], [0.104, 0.024, 0.22], 0.008)), SOLE);
}

// ---- 1 skirt, blouse with a bow, blazer ----
add(1, 'Skirt', tbox(0, 0, 0.42, 0.66, [0.3, 0.2], [0.245, 0.162], 0.03), SKIRT);
add(1, 'Skirt Band', tbox(0, 0, 0.64, 0.675, [0.248, 0.165], [0.246, 0.164], 0.03), SKIRT_D);
add(1, 'Skirt Slit', cbox([0, 0.5, -0.2], [0.02, 0.16, 0.006], 0.002), SKIRT_D);
add(1, 'Blouse', tbox(0, 0, 0.62, 1.03, [0.232, 0.145], [0.262, 0.145], 0.025), BLOUSE);
add(1, 'Blouse Shade', tbox(0, 0, 0.62, 0.69, [0.234, 0.147], [0.24, 0.149], 0.025), BLOUSE_D);
add(1, 'Collar', tubeHull([0, 1.02, 0], [0, 1.05, 0], [0.074, 0.058], [0.066, 0.052], 8, 0), BLOUSE_D);
add(1, 'Bow Knot', cbox([0, 0.955, 0.077], [0.03, 0.028, 0.014], 0.005), BOW);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Bow Loop ${n}`, slab([M(s, [0.01, 0.955, 0.0795]), M(s, [0.07, 0.99, 0.0795]), M(s, [0.07, 0.92, 0.0795])], 0.01), BOW);
  // the blazer: a back and two front panels that stop at the chest in a V, with a lapel each
  add(1, `Blazer Front ${n}`, tbox(s * 0.1, 0, 0.58, 1.01, [0.09, 0.15], [0.112, 0.15], 0.022), BLAZER);
  add(1, `Lapel ${n}`, slab([M(s, [0.028, 1.0, 0.0762]), M(s, [0.1, 0.99, 0.0762]), M(s, [0.066, 0.84, 0.0768]), M(s, [0.028, 0.8, 0.0768])], 0.006), BLAZER_L);
  add(1, `Blazer Button ${n}`, cbox(M(s, [0.026, 0.74, 0.0765]), [0.014, 0.014, 0.006], 0.002), BLAZER_D);
}
add(1, 'Blazer Back', tbox(0, 0, 0.58, 1.01, [0.24, 0.06], [0.262, 0.06], 0.022), BLAZER);
add(1, 'Blazer Hem', tbox(0, 0, 0.575, 0.6, [0.246, 0.15], [0.248, 0.15], 0.022), BLAZER_D);

// ---- 2 blazer sleeves, bare hands ----
for (const s of sides) {
  const n = nameOf(s);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.112, 1.012, 0], el, 0.06, 0.05, 6, 0), BLAZER);
  add(2, `Sleeve Lower ${n}`, tubeHull(el, lerp(el, wr, 0.88), 0.05, 0.042, 6, 0), BLAZER);
  add(2, `Cuff ${n}`, tubeHull(lerp(el, wr, 0.86), lerp(el, wr, 1.0), 0.0375, 0.036, 6, 0), BLOUSE);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.015, wr[1], [0.036, 0.058], [0.032, 0.05], 0.01), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.025], [wr[0] - s * 0.006, wr[1] - 0.06, wr[2] + 0.04], 0.011, 0.009, 5, 0), SKIN_D);
}

// ---- 3 head and face ----
chibiHead(add, 3, {
  skin: '#fde3c3', neck: '#f2c4a0', ear: '#f6cdb0', eyeWhite: '#f7efe4', iris: '#5a3a24', irisGlow: '#b8803c', pupil: '#2a140c',
  lid: '#2b1a17', brow: '#4a3024', blush: '#f7c4b0', nose: '#efb89c', mouth: '#d0606a',
});

// ---- 4 a layered bob and a small clip ----
chibiHair(add, 4, { a: '#5a3a2a', b: '#3e281c', c: '#7a5240', d: '#46301f', shine: '#c8a080' });
const clip: Vec3 = [0.095, 1.372, 0.09];
add(4, 'Hair Clip', blob(clip, [0.02, 0.012, 0.012], 6), '#f2f0e8');

applyStyle(parts, [
  [/^(Head|Neck|Ear)/, { smooth: true }],
  [/^(Thigh|Shin|Hand|Thumb)/, { paint: 0.12 }],
  [/^(Hair|Bang|Face |Bob )/, { smooth: true, paint: 0.4 }],
  [/^(Skirt|Blouse|Blazer|Lapel|Sleeve|Collar|Cuff|Bow|Pump|Heel|Sole)/, { paint: 0.25 }],
]);

export const OFFICE: AssetDef = {
  id: 'office',
  rig: () => humanSpec(J),
  name: 'Office Lady',
  tagline: 'A woman for the streets: a layered bob, a white blouse with a bow, a blazer, a skirt, tights and pumps',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Reuse the girls\' head and bob for a grown-up look', 'Build a blazer from a back and two front panels', 'Make a bow from a knot and two flat loops', 'Dress legs in tights with a tube a little wider than skin'],
  steps: [
    { title: 'Legs and pumps', text: 'The legs are slim tubes in the colour of tights. The pumps are dark bevelled boxes with a small heel under each.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box'] },
    { title: 'Skirt, blouse and blazer', text: 'A navy skirt reaches the knees with a slit at the back. The white blouse has a collar and a red bow. The blazer is a back panel and two front panels with lapels and buttons.', tools: ['Shape: Box', 'Thin plates'] },
    { title: 'Sleeves and hands', text: 'Blazer sleeves with white cuffs, and small hands with a thumb.', tools: ['Shape: Cylinder, 6 sides'] },
    { title: 'Head and face', text: 'The shared girls\' face in brown eyes and a deeper lip colour.', tools: ['Thin plates', 'Color palette'] },
    { title: 'Hair', text: 'The layered bob of the base in brown, with a small white clip.', tools: ['Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'The skeleton is the shared one; when you export to GLB every part is skinned to these joints automatically.', tools: ['Skeleton panel (under Layers)'], rig: true },
  ],
  challenge: 'Give her trousers instead of the skirt, and a lanyard with a name card.',
  parts,
};
