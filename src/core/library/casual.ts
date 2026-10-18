import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHair, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { slab, tubeHull } from './lowpoly';
import { blob, onSurface, sweep, toPart, type Ring } from './organic';
import { humanSpec } from './rigs';

/**
 * A chunky low-poly girl in casual clothes: a big head with blocky dark hair and a light hairband, brown eyes with
 * strong brows, a white T-shirt under a yellow tube top, a belt, checked shorts, checked socks and light-blue
 * sneakers. Every piece is a bevelled box or a six-sided tube with big flat faces and a soft painted gradient.
 * Left is +X, Right is -X, and she faces +Z.
 */

const SKIN = '#fbe0c0';
const SKIN_D = '#eeb994';
const WHITE = '#f2f1ea';
const WHITE_D = '#d8d6cb';
const YELLOW = '#f0cc68';
const YELLOW_D = '#dba753';
const YELLOW_L = '#f6dc8c';
const BELT = '#3a2d2e';
const SHORTS = '#81736b';
const SHORTS_D = '#544945';
const SHORTS_L = '#a79a92';
const SOCK = '#7b706b';
const SOCK_D = '#3e3738';
const SOCK_L = '#a59c96';
const SHOE = '#b6dbea';
const SHOE_D = '#8db4c7';
const SOLE = '#414657';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));


// ---- 0 legs, checked socks and sneakers ----
for (const s of sides) {
  const n = nameOf(s);
  const knee = M(s, J.knee);
  const ankle = M(s, J.ankle);
  add(0, `Thigh ${n}`, tubeHull(M(s, [0.066, 0.5, 0]), knee, 0.052, 0.042, 6, 0), SKIN);
  add(0, `Shin ${n}`, tubeHull(knee, M(s, [0.092, 0.24, 0]), 0.042, 0.036, 6, 0), SKIN);
  const x = ankle[0];
  add(0, `Sock ${n}`, tubeHull([x, 0.27, 0], [x, 0.1, 0], 0.045, 0.043, 6, 0), SOCK);
  ([[0.24, 0.258, SOCK_D], [0.214, 0.226, SOCK_L], [0.18, 0.198, SOCK_D], [0.135, 0.15, SOCK_D]] as [number, number, string][]).forEach(([y0, y1, c], i) => add(0, `Sock Check ${n} ${i + 1}`, tubeHull([x, y0, 0], [x, y1, 0], 0.0462, 0.0462, 6, 0), c));
  add(0, `Sock Fold ${n}`, tubeHull([x, 0.262, 0], [x, 0.285, 0], 0.049, 0.048, 6, 0), SOCK_D);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 16);
  add(0, `Sneaker ${n}`, out(tbox(x, 0.035, 0.02, 0.09, [0.116, 0.25], [0.102, 0.195], 0.022)), SHOE);
  add(0, `Sneaker Toe ${n}`, out(cbox([x, 0.047, 0.12], [0.11, 0.056, 0.078], 0.016)), SHOE_D);
  add(0, `Sneaker Collar ${n}`, out(tbox(x, -0.01, 0.085, 0.115, [0.098, 0.112], [0.094, 0.1], 0.016)), WHITE);
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.035], [0.122, 0.024, 0.258], 0.008)), SOLE);
}

// ---- 1 T-shirt, tube top, belt and checked shorts ----
add(1, 'Shirt', tbox(0, 0, 0.84, 1.03, [0.226, 0.140], [0.262, 0.140], 0.025), WHITE);
add(1, 'Collar', tubeHull([0, 1.02, 0.0], [0, 1.045, 0.0], [0.07, 0.055], [0.064, 0.05], 8, 0), WHITE_D);
add(1, 'Tube Top', tbox(0, 0.002, 0.66, 0.895, [0.215, 0.140], [0.242, 0.153], 0.028), YELLOW);
add(1, 'Tube Top Band', tbox(0, 0.002, 0.845, 0.9, [0.246, 0.158], [0.249, 0.160], 0.028), YELLOW_L);
add(1, 'Tube Top Shade', tbox(0, 0.002, 0.66, 0.72, [0.218, 0.144], [0.221, 0.146], 0.028), YELLOW_D);
add(1, 'Belt', tbox(0, 0.0, 0.62, 0.665, [0.228, 0.153], [0.224, 0.149], 0.028), BELT);
for (const [i, x] of [-0.07, 0.07].entries()) add(1, `Belt Loop ${i + 1}`, cbox([x, 0.642, 0.079], [0.016, 0.05, 0.012], 0.003), '#55453f');
add(1, 'Belt Buckle', cbox([0.0, 0.642, 0.08], [0.04, 0.034, 0.012], 0.004), '#9b8f86');
add(1, 'Shorts', tbox(0, 0, 0.5, 0.625, [0.237, 0.157], [0.226, 0.151], 0.03), SHORTS);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Shorts Leg ${n}`, tubeHull(M(s, [0.06, 0.56, 0]), M(s, [0.075, 0.43, 0.005]), 0.072, 0.07, 6, 0), SHORTS);
  add(1, `Shorts Check ${n} 1`, tubeHull(M(s, [0.071, 0.475, 0.004]), M(s, [0.072, 0.455, 0.004]), 0.0715, 0.0712, 6, 0), SHORTS_D);
  add(1, `Shorts Check ${n} 2`, tubeHull(M(s, [0.073, 0.445, 0.005]), M(s, [0.074, 0.432, 0.005]), 0.071, 0.0708, 6, 0), SHORTS_L);
  add(1, `Shorts Stripe ${n}`, slab([M(s, [0.04, 0.6, 0.082]), M(s, [0.066, 0.6, 0.082]), M(s, [0.076, 0.44, 0.068]), M(s, [0.05, 0.44, 0.068])], 0.006), SHORTS_D);
}
add(1, 'Shorts Band', tbox(0, 0, 0.56, 0.585, [0.240, 0.159], [0.238, 0.158], 0.03), SHORTS_D);

// ---- 2 arms, sleeves and hands ----
for (const s of sides) {
  const n = nameOf(s);
  const sh = M(s, J.shoulder);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.112, 1.012, 0], lerp(sh, el, 0.35), 0.06, 0.056, 6, 0), WHITE);
  add(2, `Sleeve Hem ${n}`, tubeHull(lerp(sh, el, 0.33), lerp(sh, el, 0.38), 0.057, 0.056, 6, 0), WHITE_D);
  add(2, `Upper Arm ${n}`, tubeHull(lerp(sh, el, 0.3), el, 0.033, 0.029, 6, 0), SKIN);
  add(2, `Forearm ${n}`, tubeHull(el, wr, 0.029, 0.025, 6, 0), SKIN);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.015, wr[1], [0.036, 0.058], [0.032, 0.05], 0.01), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.025], [wr[0] - s * 0.006, wr[1] - 0.06, wr[2] + 0.04], 0.011, 0.009, 5, 0), SKIN_D);
}

// ---- 3 head and face ----
// The shared round head with its sticker face (see chibi.ts), in brown eyes.
const head = chibiHead(add, 3, {
  skin: '#fde3c3', neck: '#f2c4a0', ear: '#f6cdb0', eyeWhite: '#f7efe4', iris: '#7a3d1e', irisGlow: '#e2923c', pupil: '#2a140c',
  lid: '#2b1a17', brow: '#3b2218', blush: '#f7c4b0', nose: '#efb89c', mouth: '#d98378',
});
void head;

// ---- 4 soft, voluminous hair and the hairband ----
// A layered bob: a round crown and a full back, two layers of bang strands fanning from a side parting, two locks on
// each side of the face, layered back strands that curl at the ends, soft shine streaks, a hairband and a small bow.
const crownMesh = chibiHair(add, 4, { a: '#4a4249', b: '#332d33', c: '#665d64', d: '#3c363c', shine: '#b8ada3' });
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
// a small bow clip lying on the hair, to her right of the parting
const bowAt: Vec3 = [-0.095, 1.372, 0.092];
add(4, 'Hair Bow Knot', blob(bowAt, [0.014, 0.014, 0.012], 6), '#c8504f');
add(4, 'Hair Bow Loop Out', sweep([R(bowAt, [0.012, 0.008]), R([bowAt[0] - 0.026, bowAt[1] + 0.012, bowAt[2] - 0.004], [0.028, 0.01]), R([bowAt[0] - 0.05, bowAt[1] + 0.022, bowAt[2] - 0.012], [0.006, 0.005])], { sides: 5, end: 'dome' }), '#d9605e');
add(4, 'Hair Bow Loop In', sweep([R(bowAt, [0.012, 0.008]), R([bowAt[0] + 0.026, bowAt[1] + 0.012, bowAt[2] - 0.004], [0.028, 0.01]), R([bowAt[0] + 0.05, bowAt[1] + 0.022, bowAt[2] - 0.012], [0.006, 0.005])], { sides: 5, end: 'dome' }), '#b8403f');
// the hairband arches over the top from one ear to the other, lying on the cap
const bandPts: Vec3[] = [];
for (let k = 0; k <= 12; k++) {
  const a = -1.22 + (2.44 * k) / 12;
  bandPts.push(onSurface(crownMesh, [0, 1.285, -0.03], [Math.sin(a), Math.cos(a) * 0.95, 0.1], 0.004).p);
}
bandPts.slice(0, -1).forEach((p, i) => add(4, `Hairband ${i + 1}`, tubeHull(p, bandPts[i + 1], [0.04, 0.012], [0.04, 0.012], 4, Math.PI / 4), '#ece6d8'));

applyStyle(parts, [
  [/^(Head|Neck|Ear)/, { smooth: true }],
  [/^(Thigh|Shin|Upper Arm|Forearm|Hand|Thumb)/, { paint: 0.12 }],
  [/^(Hair|Bang|Face |Bob )/, { smooth: true, paint: 0.4 }],
  [/^(Shirt|Collar|Sleeve|Tube|Belt|Shorts|Sock|Sneaker|Sole)/, { paint: 0.3 }],
]);

export const CASUAL: AssetDef = {
  id: 'casual',
  rig: () => humanSpec(J),
  name: 'Casual Girl',
  tagline: 'A chunky low-poly girl: blocky dark hair with a hairband, yellow top, checked shorts and blue sneakers',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Build a whole figure from bevelled boxes and six-sided tubes', 'Cut chunky hair into big pointed shards', 'Fake a check pattern with thin coloured bands', 'Press a simple anime face onto a faceted head'],
  steps: [
    { title: 'Legs, socks and sneakers', text: 'The legs are slim six-sided tubes. The socks are slightly wider tubes with thin dark and light bands around them, which reads as a check pattern. The sneakers are bevelled boxes in light blue with a darker toe, a white collar and a dark sole.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box', 'Duplicate Ctrl+D'] },
    { title: 'T-shirt, top, belt and shorts', text: 'A white box is the T-shirt, with a yellow tube top over it that has a lighter band at the top and a darker one at the bottom. A dark belt with loops and a buckle holds up checked shorts: a box at the hips and two wide tubes with dark and light bands.', tools: ['Shape: Box', 'Edit shape: scale a face (R)', 'Thin boxes for bands'] },
    { title: 'Arms and hands', text: 'Short white sleeves sit on the shoulders. The arms hang down a little away from the body: an upper arm, a forearm and a small boxy hand with a thumb.', tools: ['Shape: Cylinder, 6 sides', 'Rotate (E)', 'Mirror ideas: duplicate and move'] },
    { title: 'Head and face', text: 'The head is a faceted ball with eight sides and a narrow chin. The face is pressed onto it: brown eyes with a dark lid on top and a highlight, strong brows that slope toward the nose, a small nose and a short mouth.', tools: ['Shape: Sphere, 8 sides', 'Thin plates', 'Color palette'] },
    { title: 'Hair and hairband', text: 'The dark hair is a wide faceted cap with a lighter crown, a mass at the back, two side flaps with pointed spikes and a fringe of five big shards that sweep across the forehead. A light hairband arches over the top from ear to ear.', tools: ['Edit shape: Merge points', 'Shape: Pyramid', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: she bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Make a winter version: long blue trousers instead of shorts, a red scarf made of two boxes around the neck, and a white bobble hat over the hairband.',
  parts,
};
