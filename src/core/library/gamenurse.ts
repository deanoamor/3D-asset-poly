import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import { J, M, cbox, chibiHair, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { slab, tubeHull } from './lowpoly';
import { toPart } from './organic';
import { humanSpec } from './rigs';

/**
 * The nurse of the game: the same chunky base as the Casual Girl (proportions, skeleton, round head, sticker face and
 * layered bob) in a short white nurse dress with red trims, a red cross, white knee socks and white sneakers, with a
 * chestnut bob, teal eyes and a small nurse cap that carries a red cross.
 * Left is +X, Right is -X, and she faces +Z.
 */

const WHITE = '#f6f5f0';
const WHITE_D = '#dedcd3';
const WHITE_S = '#cfcdc4';
const RED = '#d9504d';
const RED_L = '#ea7470';
const SKIN = '#fbe0c0';
const SKIN_D = '#eeb994';
const BLUE_L = '#bfe0ee';
const GOLD = '#e8c872';
const SOLE = '#4a5060';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));

// ---- 0 legs, white knee socks and white sneakers ----
for (const s of sides) {
  const n = nameOf(s);
  const knee = M(s, J.knee);
  const ankle = M(s, J.ankle);
  add(0, `Thigh ${n}`, tubeHull(M(s, [0.066, 0.5, 0]), knee, 0.052, 0.042, 6, 0), SKIN);
  add(0, `Shin ${n}`, tubeHull(knee, M(s, [0.092, 0.24, 0]), 0.042, 0.036, 6, 0), SKIN);
  const x = ankle[0];
  add(0, `Sock ${n}`, tubeHull([x, 0.3, 0], [x, 0.1, 0], 0.045, 0.043, 6, 0), WHITE);
  add(0, `Sock Shade ${n}`, tubeHull([x, 0.2, 0], [x, 0.1, 0], 0.0462, 0.0442, 6, 0), WHITE_D);
  add(0, `Sock Stripe ${n} 1`, tubeHull([x, 0.28, 0], [x, 0.295, 0], 0.0462, 0.0462, 6, 0), RED);
  add(0, `Sock Stripe ${n} 2`, tubeHull([x, 0.252, 0], [x, 0.264, 0], 0.0462, 0.0462, 6, 0), RED);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 16);
  add(0, `Sneaker ${n}`, out(tbox(x, 0.035, 0.02, 0.09, [0.116, 0.25], [0.102, 0.195], 0.022)), WHITE);
  add(0, `Sneaker Toe ${n}`, out(cbox([x, 0.047, 0.12], [0.11, 0.056, 0.078], 0.016)), RED_L);
  add(0, `Sneaker Collar ${n}`, out(tbox(x, -0.01, 0.085, 0.115, [0.098, 0.112], [0.094, 0.1], 0.016)), WHITE_D);
  add(0, `Sneaker Strap ${n}`, out(cbox([x, 0.075, 0.03], [0.112, 0.018, 0.05], 0.006)), RED);
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.035], [0.122, 0.024, 0.258], 0.008)), SOLE);
}

// ---- 1 the dress: bodice, collar, red cross, belt and flared skirt ----
add(1, 'Skirt', tbox(0, 0, 0.47, 0.68, [0.35, 0.245], [0.238, 0.158], 0.035), WHITE);
add(1, 'Skirt Shade', tbox(0, 0, 0.47, 0.54, [0.352, 0.247], [0.318, 0.222], 0.035), WHITE_D);
add(1, 'Skirt Hem', tbox(0, 0, 0.47, 0.495, [0.356, 0.251], [0.345, 0.24], 0.035), RED);
add(1, 'Bodice', tbox(0, 0, 0.66, 1.03, [0.222, 0.14], [0.262, 0.14], 0.025), WHITE);
add(1, 'Bodice Shade', tbox(0, 0, 0.66, 0.72, [0.225, 0.143], [0.231, 0.145], 0.025), WHITE_D);
add(1, 'Belt', tbox(0, 0, 0.65, 0.695, [0.236, 0.156], [0.232, 0.153], 0.028), RED);
add(1, 'Belt Buckle', cbox([0.0, 0.672, 0.081], [0.046, 0.034, 0.012], 0.004), GOLD);
add(1, 'Collar', tubeHull([0, 1.02, 0.0], [0, 1.045, 0.0], [0.07, 0.055], [0.064, 0.05], 8, 0), WHITE_D);
add(1, 'Collar Trim', tubeHull([0, 1.016, 0.0], [0, 1.026, 0.0], [0.074, 0.059], [0.073, 0.058], 8, 0), RED);
// a short V of red piping below the collar
for (const s of sides) add(1, `Piping ${nameOf(s)}`, slab([M(s, [0.016, 1.0, 0.0705]), M(s, [0.026, 1.0, 0.0705]), M(s, [0.006, 0.968, 0.0705]), M(s, [0.0, 0.968, 0.0705])], 0.006), RED);
// the red cross on the chest and a name badge
add(1, 'Cross Upright', cbox([0.075, 0.895, 0.0735], [0.016, 0.072, 0.012], 0.003), RED);
add(1, 'Cross Bar', cbox([0.075, 0.895, 0.0735], [0.072, 0.016, 0.012], 0.003), RED);
add(1, 'Name Badge', cbox([-0.078, 0.9, 0.0735], [0.056, 0.03, 0.01], 0.003), BLUE_L);
add(1, 'Name Badge Line', cbox([-0.078, 0.9, 0.0785], [0.036, 0.006, 0.004], 0.0015), '#7aa7bb');

// ---- 2 arms: short puffed sleeves with red hems ----
for (const s of sides) {
  const n = nameOf(s);
  const sh = M(s, J.shoulder);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.112, 1.012, 0], lerp(sh, el, 0.35), 0.06, 0.056, 6, 0), WHITE);
  add(2, `Sleeve Hem ${n}`, tubeHull(lerp(sh, el, 0.33), lerp(sh, el, 0.38), 0.057, 0.056, 6, 0), RED);
  add(2, `Upper Arm ${n}`, tubeHull(lerp(sh, el, 0.3), el, 0.033, 0.029, 6, 0), SKIN);
  add(2, `Forearm ${n}`, tubeHull(el, wr, 0.029, 0.025, 6, 0), SKIN);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.015, wr[1], [0.036, 0.058], [0.032, 0.05], 0.01), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.025], [wr[0] - s * 0.006, wr[1] - 0.06, wr[2] + 0.04], 0.011, 0.009, 5, 0), SKIN_D);
}

// ---- 3 head and face: the shared round head, with teal eyes ----
chibiHead(add, 3, {
  skin: '#fde3c3', neck: '#f2c4a0', ear: '#f6cdb0', eyeWhite: '#f7efe4', iris: '#2f6f6c', irisGlow: '#79cbb4', pupil: '#0f2d2b',
  lid: '#3a2418', brow: '#6a4630', blush: '#f7c0b0', nose: '#efb89c', mouth: '#d9737a',
});

// ---- 4 the chestnut bob and the nurse cap ----
chibiHair(add, 4, { a: '#7c4d33', b: '#5a3624', c: '#a06a47', d: '#6a402b', shine: '#d9ab82' });
const CAP_Y = 1.388;
add(4, 'Cap', tbox(0, 0.02, CAP_Y, CAP_Y + 0.07, [0.17, 0.13], [0.15, 0.115], 0.028), WHITE);
add(4, 'Cap Band', tbox(0, 0.02, CAP_Y - 0.004, CAP_Y + 0.02, [0.174, 0.134], [0.17, 0.13], 0.028), RED);
add(4, 'Cap Top', tbox(0, 0.02, CAP_Y + 0.062, CAP_Y + 0.078, [0.152, 0.117], [0.132, 0.1], 0.026), WHITE_S);
add(4, 'Cap Cross Upright', cbox([0, CAP_Y + 0.045, 0.0865], [0.012, 0.034, 0.008], 0.002), RED);
add(4, 'Cap Cross Bar', cbox([0, CAP_Y + 0.045, 0.0865], [0.034, 0.012, 0.008], 0.002), RED);
// a hairpin that holds the cap on each side
for (const s of sides) add(4, `Cap Pin ${nameOf(s)}`, cbox([s * 0.086, CAP_Y + 0.01, 0.034], [0.018, 0.012, 0.026], 0.003), GOLD);

applyStyle(parts, [
  [/^(Head|Neck|Ear)/, { smooth: true }],
  [/^(Thigh|Shin|Upper Arm|Forearm|Hand|Thumb)/, { paint: 0.12 }],
  [/^(Hair|Bang|Face |Bob )/, { smooth: true, paint: 0.4 }],
  [/^(Bodice|Skirt|Collar|Sleeve|Belt|Piping|Sock|Sneaker|Sole|Cap)/, { paint: 0.25 }],
]);

export const GAMENURSE: AssetDef = {
  id: 'gamenurse',
  rig: () => humanSpec(J),
  name: 'Game Nurse',
  tagline: 'The game nurse: the same chunky base as the Casual Girl, in a white dress with red trims, a cross cap and a chestnut bob',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Reuse one body, head and face for a whole cast of characters', 'Dress the base in a new outfit with bevelled boxes and tubes', 'Flare a skirt from a box that is wider at the bottom', 'Add a cap and a red cross as simple flat shapes'],
  steps: [
    { title: 'Legs, socks and sneakers', text: 'The legs are the same slim six-sided tubes as the base. The knee socks are white with two thin red stripes at the top and a grey shade near the ankle. The sneakers are white bevelled boxes with a pink toe, a red strap and a dark sole.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box', 'Duplicate Ctrl+D'] },
    { title: 'Dress, belt and red cross', text: 'The bodice is a white box a little wider at the shoulders. A red belt with a gold buckle sits at the waist, and the skirt is a box that is much wider at the bottom, which makes it flare, with a red hem. A red cross on the chest and a small blue name badge finish the uniform.', tools: ['Shape: Box', 'Edit shape: scale a face (R)', 'Thin boxes for the cross'] },
    { title: 'Arms and hands', text: 'Short white puffed sleeves with a red hem sit on the shoulders. The arms and hands are the same as the base.', tools: ['Shape: Cylinder, 6 sides', 'Rotate (E)', 'Mirror ideas: duplicate and move'] },
    { title: 'Head and face', text: 'The head and face are exactly the base ones. Only the colours change: teal eyes instead of brown, softer brown brows and a pinker mouth.', tools: ['Color palette', 'Thin plates'] },
    { title: 'Hair and cap', text: 'The chestnut bob is the base bob in warm browns. The nurse cap is a small white box with a red band at its base, a grey top and a red cross on the front, held on with two gold hairpins.', tools: ['Shape: Box', 'Color palette', 'Thin boxes for the cross'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: she bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Make a night-shift nurse: recolor the dress navy, turn the red trims white, swap the cap for a hairband and give her a clipboard in one hand.',
  parts,
};
