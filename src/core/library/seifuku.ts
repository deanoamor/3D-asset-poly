import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { J, M, cbox, chibiHair, chibiHead, lerp, nameOf, rotY, sides, tbox } from './chibi';
import { applyStyle } from './kit';
import { slab, tubeHull } from './lowpoly';
import { blob, sweep, toPart, type Ring } from './organic';
import { humanSpec } from './rigs';

/**
 * The schoolgirl of the game: the same chunky base as the Casual Girl in a Japanese sailor uniform (seifuku): a white
 * blouse with a navy sailor collar and white stripes, a red neck ribbon, short sleeves with navy bands, a navy pleated
 * skirt, navy knee socks and brown loafers. Black hair in twin tails with red bobbles and a red bow clip and violet-blue eyes.
 * Left is +X, Right is -X, and she faces +Z.
 */

const WHITE = '#f6f5f0';
const WHITE_D = '#dedcd3';
const NAVY = '#2b3a67';
const NAVY_D = '#1f2a4d';
const RED = '#d4413f';
const RED_D = '#b03231';
const SKIN = '#fbe0c0';
const SKIN_D = '#eeb994';
const SHOE = '#6b4331';
const SOLE = '#3b2a22';

const parts: AssetPart[] = [];
const add = (step: number, name: string, m: PolyMesh, color: string) => parts.push(toPart(step, name, m, color));
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });

// ---- 0 legs, navy knee socks and brown loafers ----
for (const s of sides) {
  const n = nameOf(s);
  const knee = M(s, J.knee);
  const ankle = M(s, J.ankle);
  const x = ankle[0];
  add(0, `Thigh ${n}`, tubeHull(M(s, [0.066, 0.5, 0]), knee, 0.052, 0.042, 6, 0), SKIN);
  add(0, `Shin ${n}`, tubeHull(knee, M(s, [0.092, 0.24, 0]), 0.042, 0.036, 6, 0), SKIN);
  add(0, `Sock ${n}`, tubeHull([x, 0.34, 0], [x, 0.1, 0], 0.0455, 0.043, 6, 0), NAVY);
  add(0, `Sock Top ${n}`, tubeHull([x, 0.33, 0], [x, 0.345, 0], 0.0468, 0.0468, 6, 0), WHITE);
  const out = (m: PolyMesh) => rotY(m, [x, 0, 0], s * 16);
  add(0, `Loafer ${n}`, out(tbox(x, 0.035, 0.02, 0.09, [0.116, 0.25], [0.102, 0.195], 0.022)), SHOE);
  add(0, `Loafer Toe ${n}`, out(cbox([x, 0.047, 0.12], [0.11, 0.056, 0.078], 0.016)), '#7d5039');
  add(0, `Loafer Collar ${n}`, out(tbox(x, -0.01, 0.085, 0.115, [0.098, 0.112], [0.094, 0.1], 0.016)), NAVY_D);
  add(0, `Loafer Strap ${n}`, out(cbox([x, 0.075, 0.03], [0.112, 0.018, 0.05], 0.006)), '#4d2e20');
  add(0, `Sole ${n}`, out(cbox([x, 0.012, 0.035], [0.122, 0.024, 0.258], 0.008)), SOLE);
}

// ---- 1 the uniform: blouse, sailor collar, ribbon and the pleated skirt ----
// skirt outline at height y (same numbers as the tbox below)
const skirtW = (y: number) => 0.35 - ((0.35 - 0.238) * (y - 0.47)) / 0.21;
const skirtD = (y: number) => 0.245 - ((0.245 - 0.158) * (y - 0.47)) / 0.21;
add(1, 'Skirt', tbox(0, 0, 0.47, 0.68, [0.35, 0.245], [0.238, 0.158], 0.035), NAVY);
add(1, 'Skirt Band', tbox(0, 0, 0.655, 0.685, [skirtW(0.655) + 0.004, skirtD(0.655) + 0.004], [skirtW(0.685) + 0.004, skirtD(0.685) + 0.004], 0.03), NAVY_D);
add(1, 'Skirt Hem Line', tbox(0, 0, 0.5, 0.512, [skirtW(0.5) + 0.006, skirtD(0.5) + 0.006], [skirtW(0.512) + 0.006, skirtD(0.512) + 0.006], 0.035), WHITE);
// pleat ridges: front and back, and the two sides
const pleat = (name: string, top: Vec3, bot: Vec3) => add(1, name, tubeHull(top, bot, 0.008, 0.01, 4, Math.PI / 4), NAVY_D);
let pl = 0;
for (const z of [1, -1]) {
  const dz = (y: number) => (z * skirtD(y)) / 2 + z * 0.002;
  for (const f of [-0.34, -0.17, 0, 0.17, 0.34]) {
    pleat(`Pleat ${++pl}`, [f * skirtW(0.67), 0.67, dz(0.67)], [f * skirtW(0.476), 0.476, dz(0.476)]);
  }
}
for (const x of [1, -1]) {
  const dx = (y: number) => (x * skirtW(y)) / 2 + x * 0.002;
  for (const f of [-0.22, 0, 0.22]) {
    pleat(`Pleat ${++pl}`, [dx(0.67), 0.67, f * skirtD(0.67)], [dx(0.476), 0.476, f * skirtD(0.476)]);
  }
}
add(1, 'Blouse', tbox(0, 0, 0.66, 1.03, [0.222, 0.14], [0.262, 0.14], 0.025), WHITE);
add(1, 'Blouse Shade', tbox(0, 0, 0.66, 0.72, [0.225, 0.143], [0.231, 0.145], 0.025), WHITE_D);
// sailor collar: a flat back flap and two front flaps that meet in a V, with two white stripes along the edge
add(1, 'Collar Back', slab([[-0.125, 1.012, -0.0712], [0.125, 1.012, -0.0712], [0.092, 0.925, -0.0712], [-0.092, 0.925, -0.0712]], 0.008), NAVY);
add(1, 'Collar Back Stripe', slab([[-0.108, 0.992, -0.0742], [0.108, 0.992, -0.0742], [0.102, 0.978, -0.0742], [-0.102, 0.978, -0.0742]], 0.004), WHITE);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Collar Flap ${n}`, slab([M(s, [0.024, 1.022, 0.0712]), M(s, [0.126, 1.012, 0.0712]), M(s, [0.078, 0.93, 0.0712]), M(s, [0.004, 0.9, 0.0712])], 0.008), NAVY);
  add(1, `Collar Stripe ${n} 1`, slab([M(s, [0.108, 1.0, 0.0742]), M(s, [0.116, 1.0, 0.0742]), M(s, [0.07, 0.932, 0.0742]), M(s, [0.062, 0.932, 0.0742])], 0.004), WHITE);
  add(1, `Collar Stripe ${n} 2`, slab([M(s, [0.09, 0.99, 0.0742]), M(s, [0.098, 0.99, 0.0742]), M(s, [0.056, 0.935, 0.0742]), M(s, [0.048, 0.935, 0.0742])], 0.004), WHITE);
}
add(1, 'Neckline', tubeHull([0, 1.02, 0], [0, 1.04, 0], [0.066, 0.052], [0.062, 0.048], 8, 0), WHITE_D);
// the red neck ribbon: a knot, two loops and two tails
add(1, 'Ribbon Knot', cbox([0, 0.93, 0.074], [0.034, 0.03, 0.016], 0.005), RED_D);
for (const s of sides) {
  const n = nameOf(s);
  add(1, `Ribbon Loop ${n}`, slab([M(s, [0.012, 0.93, 0.0762]), M(s, [0.07, 0.962, 0.0762]), M(s, [0.074, 0.9, 0.0762]), M(s, [0.012, 0.922, 0.0762])], 0.01), RED);
  add(1, `Ribbon Tail ${n}`, slab([M(s, [0.006, 0.918, 0.0752]), M(s, [0.03, 0.918, 0.0752]), M(s, [0.044, 0.84, 0.0752]), M(s, [0.018, 0.84, 0.0752])], 0.008), RED_D);
}

// ---- 2 arms: short sleeves with navy bands ----
for (const s of sides) {
  const n = nameOf(s);
  const sh = M(s, J.shoulder);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(2, `Sleeve ${n}`, tubeHull([s * 0.112, 1.012, 0], lerp(sh, el, 0.38), 0.058, 0.054, 6, 0), WHITE);
  add(2, `Sleeve Band ${n}`, tubeHull(lerp(sh, el, 0.3), lerp(sh, el, 0.345), 0.0572, 0.0562, 6, 0), NAVY);
  add(2, `Upper Arm ${n}`, tubeHull(lerp(sh, el, 0.33), el, 0.033, 0.029, 6, 0), SKIN);
  add(2, `Forearm ${n}`, tubeHull(el, wr, 0.029, 0.025, 6, 0), SKIN);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.015, wr[1], [0.036, 0.058], [0.032, 0.05], 0.01), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.025], [wr[0] - s * 0.006, wr[1] - 0.06, wr[2] + 0.04], 0.011, 0.009, 5, 0), SKIN_D);
}

// ---- 3 head and face: the shared round head ----
chibiHead(add, 3, {
  skin: '#fde3c3', neck: '#f2c4a0', ear: '#f6cdb0', eyeWhite: '#f7efe4', iris: '#4a5ea6', irisGlow: '#93b4e6', pupil: '#14183a',
  lid: '#241a20', brow: '#3a2a2c', blush: '#f7bdb0', nose: '#efb89c', mouth: '#d6737a',
});

// ---- 4 black hair in high twin tails, tied with red bobbles, and the red bow clip ----
const HAIR = { a: '#2a2630', b: '#1c1920', c: '#48414f', d: '#231f29', shine: '#8f89a6' };
chibiHair(add, 4, HAIR, false);
for (const s of sides) {
  const n = nameOf(s);
  const tie: Vec3 = [s * 0.152, 1.335, -0.03];
  const tail = (pts: [number, number, number, number, number][]) => sweep(pts.map(([x, y, z, a, d]) => R([s * x, y, z], [a, d])), { sides: 6, end: 'dome' });
  add(4, `Twin Tail ${n}`, tail([[0.148, 1.33, -0.03, 0.04, 0.04], [0.205, 1.27, -0.05, 0.05, 0.045], [0.24, 1.13, -0.08, 0.054, 0.046], [0.238, 0.98, -0.092, 0.04, 0.034], [0.225, 0.86, -0.085, 0.006, 0.006]]), HAIR.b);
  add(4, `Twin Tail Front ${n}`, tail([[0.158, 1.325, -0.01, 0.022, 0.018], [0.21, 1.265, -0.03, 0.03, 0.022], [0.245, 1.13, -0.056, 0.032, 0.024], [0.244, 0.99, -0.066, 0.022, 0.016], [0.232, 0.89, -0.066, 0.006, 0.006]]), HAIR.c);
  add(4, `Hair Tie ${n}`, blob(tie, [0.026, 0.03, 0.03], 8), RED);
}
const bowAt: Vec3 = [0.095, 1.372, 0.092];
add(4, 'Hair Bow Knot', blob(bowAt, [0.015, 0.015, 0.013], 6), RED_D);
add(4, 'Hair Bow Loop Out', sweep([R(bowAt, [0.012, 0.008]), R([bowAt[0] + 0.026, bowAt[1] + 0.012, bowAt[2] - 0.004], [0.028, 0.01]), R([bowAt[0] + 0.05, bowAt[1] + 0.022, bowAt[2] - 0.012], [0.006, 0.005])], { sides: 5, end: 'dome' }), RED);
add(4, 'Hair Bow Loop In', sweep([R(bowAt, [0.012, 0.008]), R([bowAt[0] - 0.026, bowAt[1] + 0.012, bowAt[2] - 0.004], [0.028, 0.01]), R([bowAt[0] - 0.05, bowAt[1] + 0.022, bowAt[2] - 0.012], [0.006, 0.005])], { sides: 5, end: 'dome' }), RED_D);

applyStyle(parts, [
  [/^(Head|Neck|Ear)/, { smooth: true }],
  [/^(Thigh|Shin|Upper Arm|Forearm|Hand|Thumb)/, { paint: 0.12 }],
  [/^(Hair|Bang|Face |Bob |Twin)/, { smooth: true, paint: 0.4 }],
  [/^(Blouse|Skirt|Pleat|Collar|Sleeve|Sock|Loafer|Sole|Ribbon|Neckline)/, { paint: 0.25 }],
]);

export const SEIFUKU: AssetDef = {
  id: 'seifuku',
  rig: () => humanSpec(J),
  name: 'Game Schoolgirl',
  tagline: 'The game schoolgirl: the chunky base in a Japanese sailor uniform, with a red ribbon, a pleated navy skirt and loafers',
  level: 'Medium',
  thumb: { dir: [0.5, 0.25, 1], zoom: 0.8 },
  learn: ['Reuse one body, head and face for a whole cast of characters', 'Build a sailor collar from flat plates on a box', 'Make pleats from thin tubes on a flared skirt', 'Tie a neck ribbon from a knot, two loops and two tails'],
  steps: [
    { title: 'Legs, socks and loafers', text: 'The legs are the same slim six-sided tubes as the base. The navy knee socks have a white band at the top. The loafers are brown bevelled boxes with a dark strap and sole.', tools: ['Shape: Cylinder, 6 sides', 'Shape: Box', 'Duplicate Ctrl+D'] },
    { title: 'Blouse, collar, ribbon and skirt', text: 'The blouse is a white box a little wider at the shoulders. The navy sailor collar is three flat plates: one flap on the back and two on the front that meet in a V, each with two white stripes. A red ribbon sits at the V. The skirt is a navy box that is much wider at the bottom, with a darker band at the waist, a white line near the hem and thin tubes as pleats.', tools: ['Shape: Box', 'Thin boxes for the plates', 'Shape: Cylinder, 4 sides, for pleats'] },
    { title: 'Arms and hands', text: 'Short white sleeves with a navy band sit on the shoulders. The arms and hands are the same as the base.', tools: ['Shape: Cylinder, 6 sides', 'Rotate (E)', 'Duplicate and move'] },
    { title: 'Head and face', text: 'The head and face are exactly the base ones. Only the colours change: violet-blue eyes, dark brows and a soft pink mouth.', tools: ['Color palette', 'Thin plates'] },
    { title: 'Hair, twin tails and bow clip', text: 'The black hair keeps the base crown, fringe and face locks, but the bob ends are left out. Instead two long tails hang from red bobbles high on each side of the head, each a dark tapered sweep with a lighter strand on top. A small red bow clip sits on her left side of the parting.', tools: ['Color palette', 'Smooth shading'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: she bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Make the winter uniform: a navy jacket with long sleeves, a plain collar and a different ribbon colour, plus black tights.',
  parts,
};
