import type { AssetDef, AssetPart } from '../assets';
import { band2, bootParts } from './body';
import { applyStyle, box, frustum, part } from './kit';
import { blob, headBlob, onSurface, plate, ribbon, sweep, toPart, vadd, vmul, vnorm, vsub, type Ring } from './organic';
import type { Vec3 } from '../types';

// black and gray uniform, one warm accent for rank
const BLACK = '#1b1d21';
const CHAR = '#555c65'; // charcoal cloth
const CHAR_D = '#353a41';
const GRAY = '#747c86';
const GRAY_L = '#9aa2ab';
const STEEL = '#aab2ba';
const VEST = '#2a2e34';
const VISOR = '#2f5675';
const VISOR_L = '#5aa0cf';
const SKIN = '#d9a77c';
const RANK = '#e0b43a';
const RANK_D = '#b58f22';

const PH = Math.PI / 8;
const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });

// ---- the body, built first so details can sit on its surface ----
const torso = sweep([R([0, 0.87, 0], [0.2, 0.135]), R([0, 0.95, 0], [0.208, 0.14]), R([0, 1.12, 0.004], [0.232, 0.148]), R([0, 1.28, 0.008], [0.27, 0.152]), R([0, 1.4, 0.012], [0.262, 0.14])], { sides: 8, phase: PH });
const pelvis = blob([0, 0.86, 0], [0.215, 0.1, 0.14], 8);
// the vest is a slightly bigger shell over the chest
const vest = sweep([R([0, 0.97, 0.002], [0.222, 0.158]), R([0, 1.12, 0.006], [0.248, 0.166]), R([0, 1.28, 0.01], [0.287, 0.17]), R([0, 1.4, 0.014], [0.272, 0.152])], { sides: 8, phase: PH });
const K = 1.22;
const HC: Vec3 = [0, 1.7, 0.014];
const head = headBlob(HC, [0.18 * K, 0.2 * K, 0.19 * K], 10);
const helmet = sweep(
  [R([0, 1.74, -0.004], [0.262, 0.262]), R([0, 1.8, -0.004], [0.276, 0.276]), R([0, 1.89, -0.004], [0.268, 0.268]), R([0, 1.95, -0.004], [0.22, 0.22]), R([0, 1.985, -0.004], [0.11, 0.11])],
  { sides: 8, phase: PH, end: 'dome' },
);

// ---- 0 boots ----
for (const s of [1, -1] as const) add(...bootParts(0, s, [s * 0.115, 0.215, 0], 0, { boot: BLACK, sole: GRAY, cuff: CHAR_D, laces: GRAY_L }));

// ---- 1 legs, belt and pouches ----
const legPath = (s: 1 | -1): Ring[] => [R([s * 0.105, 0.9, 0], 0.122), R([s * 0.11, 0.72, 0.012], 0.114), R([s * 0.118, 0.52, 0.035], 0.094), R([s * 0.116, 0.36, 0.015], 0.088), R([s * 0.115, 0.22, 0], 0.082), R([s * 0.115, 0.14, 0], 0.082)];
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const leg = sweep(legPath(s), { sides: 8 });
  add(toPart(1, `Leg ${side}`, leg, CHAR));
  const knee = onSurface(leg, [s * 0.118, 0.52, 0.035], [0, 0, 1], -0.01);
  add(toPart(1, `Knee Pad ${side}`, blob(knee.p, [0.085, 0.075, 0.045], 6), BLACK));
  add(plate(1, `Cargo Pocket ${side}`, leg, [s * 0.11, 0.7, 0.012], [s, 0, 0.0], 0.1, 0.17, 0.05, CHAR_D));
  add(plate(1, `Pocket Flap ${side}`, leg, [s * 0.11, 0.77, 0.012], [s, 0, 0.0], 0.105, 0.045, 0.058, GRAY));
  add(toPart(1, `Leg Strap ${side}`, sweep([R([s * 0.116, 0.4, 0.02], 0.094), R([s * 0.116, 0.43, 0.022], 0.094)], { sides: 8 }), BLACK));
}
add(toPart(1, 'Pelvis', pelvis, CHAR));
const belt = sweep([R([0, 0.915, 0], [0.226, 0.158]), R([0, 0.99, 0], [0.226, 0.158])], { sides: 8, phase: PH });
add(toPart(1, 'Belt', belt, BLACK));
add(plate(1, 'Belt Buckle', belt, [0, 0.953, 0], [0, 0, 1], 0.1, 0.07, 0.024, STEEL));
add(plate(1, 'Buckle Inner', belt, [0, 0.953, 0], [0, 0, 1], 0.05, 0.036, 0.012, GRAY, 0.02));
for (const [i, x] of [0.09, 0.16].entries()) add(plate(1, `Mag Pouch Front ${i + 1}`, belt, [-x * (i ? 1.3 : 1) + 0.0, 0.953, 0], [-(0.25 + i * 0.2), 0, 1], 0.07, 0.085, 0.04, CHAR_D));
add(plate(1, 'Mag Pouch Right', belt, [0.17, 0.953, 0], [0.55, 0, 1], 0.07, 0.085, 0.04, CHAR_D));
add(plate(1, 'Holster', leg(-1), [-0.12, 0.74, 0.0], [-1, 0, 0.1], 0.1, 0.22, 0.06, BLACK));
add(plate(1, 'Holster Grip', leg(-1), [-0.12, 0.85, 0.0], [-1, 0.3, 0.1], 0.05, 0.08, 0.055, GRAY));
function leg(s: 1 | -1) {
  return sweep(legPath(s), { sides: 8 });
}

// ---- 2 shirt and vest ----
add(toPart(2, 'Torso', torso, CHAR));
add(toPart(2, 'Vest', vest, VEST));
add(toPart(2, 'Vest Trim', sweep([R([0, 0.975, 0.002], [0.224, 0.16]), R([0, 1.0, 0.003], [0.226, 0.161])], { sides: 8, phase: PH }), GRAY));
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const S: Vec3 = [s * 0.3, 1.32, 0.01];
  const pad = blob(S, [0.108, 0.098, 0.108], 6);
  add(toPart(2, `Shoulder ${side}`, blob(S, [0.1, 0.095, 0.1], 6), CHAR));
  add(toPart(2, `Shoulder Pad ${side}`, pad, VEST));
  // magazine pouches on the chest
  for (const [i, x] of [0.07, 0.17].entries()) add(plate(2, `Chest Pouch ${side} ${i + 1}`, vest, [s * x, 1.08, 0], [0, 0, 1], 0.072, 0.1, 0.034, CHAR_D));
  add(plate(2, `Chest Pouch Flap ${side}`, vest, [s * 0.12, 1.14, 0], [0, 0, 1], 0.17, 0.028, 0.044, GRAY));
}
add(toPart(2, 'Zipper', ribbon(vest, [1.38, 1.24, 1.1, 1.0].map((y) => ({ from: [0, y, 0], dir: [0, 0, 1] as Vec3 })), [0.01, 0.006], 0.004, { sides: 4 }), STEEL));
add(plate(2, 'Radio', vest, [-0.19, 1.3, 0], [-0.3, 0, 1], 0.07, 0.12, 0.05, BLACK));
add(toPart(2, 'Radio Antenna', sweep([R(vadd([-0.2, 1.3, 0.08], [0, 0.04, 0]), 0.012), R([-0.205, 1.46, 0.07], 0.007)], { sides: 5, end: 'dome' }), BLACK));

// ---- 3 arms and gloves ----
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const S: Vec3 = [s * 0.3, 1.32, 0.01];
  const M: Vec3 = [s * 0.345, 1.2, 0.025];
  const E: Vec3 = [s * 0.385, 1.08, 0.05];
  const M2: Vec3 = [s * 0.395, 0.97, 0.105];
  const W: Vec3 = [s * 0.4, 0.865, 0.155];
  const sleeve = sweep([R(S, 0.088), R(M, 0.083), R(E, 0.076), R(M2, 0.07), R(W, 0.062)], { sides: 7 });
  add(toPart(3, `Sleeve ${side}`, sleeve, CHAR));
  add(toPart(3, `Elbow Pad ${side}`, blob(vadd(E, [s * 0.012, -0.005, -0.03]), [0.06, 0.07, 0.05], 6), BLACK));
  const d = vnorm(vsub(W, M2));
  add(toPart(3, `Wrist Strap ${side}`, sweep([R(vsub(W, vmul(d, 0.03)), 0.07), R(vadd(W, vmul(d, 0.012)), 0.07)], { sides: 7 }), GRAY));
  add(toPart(3, `Glove ${side}`, sweep([R(vadd(W, [0, 0.01, 0]), [0.054, 0.036]), R(vadd(W, [0.003, -0.05, 0.02]), [0.06, 0.04]), R(vadd(W, [0.006, -0.105, 0.045]), [0.05, 0.03])], { sides: 6, end: 'dome' }), BLACK));
  add(toPart(3, `Thumb ${side}`, sweep([R(vadd(W, [-s * 0.03, -0.03, 0.02]), 0.022), R(vadd(W, [-s * 0.042, -0.07, 0.058]), 0.017), R(vadd(W, [-s * 0.036, -0.095, 0.082]), 0.013)], { sides: 5, end: 'dome' }), BLACK));
  // rank chevrons on the upper sleeve
  for (const [i, y] of [1.24, 1.2].entries()) {
    add(toPart(3, `Sleeve Chevron ${side} ${i + 1}`, ribbon(sleeve, [{ from: [s * 0.35, y + 0.025, 0.025], dir: [s, 0, 0.55] }, { from: [s * 0.35, y, 0.025], dir: [s, 0, 0.1] }, { from: [s * 0.35, y + 0.025, 0.025], dir: [s, 0, -0.35] }], [0.011, 0.007], 0.004, { sides: 4, ends: 'flat' }), RANK));
  }
}

// ---- 4 head and visor ----
add(toPart(4, 'Neck', sweep([R([0, 1.37, 0], [0.072, 0.066]), R([0, 1.5, 0.012], [0.068, 0.062])], { sides: 6 }), SKIN));
add(toPart(4, 'Head', head, SKIN));
add(toPart(4, 'Neck Guard', sweep([R([0, 1.4, 0], [0.1, 0.092]), R([0, 1.47, 0.008], [0.092, 0.086])], { sides: 8 }), CHAR_D));
const mask = blob(vadd(HC, [0, -0.1, 0.1]), [0.2, 0.115, 0.14], 8);
add(toPart(4, 'Face Mask', mask, GRAY));
add(plate(4, 'Mask Vent', mask, vadd(HC, [0, -0.1, 0.1]), [0, -0.1, 1], 0.1, 0.07, 0.03, BLACK));
add(plate(4, 'Mask Filter', mask, vadd(HC, [0, -0.13, 0.1]), [0, -0.35, 1], 0.07, 0.05, 0.045, CHAR_D));
for (const s of [1, -1] as const) {
  add(plate(4, `Mask Strap ${s === 1 ? 'Left' : 'Right'}`, head, vadd(HC, [0, -0.06, 0]), [s, -0.2, 0.5], 0.09, 0.03, 0.02, BLACK));
}
const visorPts = [-1.1, -0.7, -0.35, 0, 0.35, 0.7, 1.1].map((x) => ({ from: HC, dir: [x, 0.06, 1] as Vec3 }));
add(toPart(4, 'Visor Frame', ribbon(head, visorPts, [0.07, 0.05], 0.03, { sides: 6, ends: 'flat' }), BLACK));
add(toPart(4, 'Visor Lens', ribbon(head, visorPts.slice(1, 6), [0.052, 0.04], 0.052, { sides: 6, ends: 'flat' }), VISOR));
add(toPart(4, 'Visor Glint', ribbon(head, [-0.5, -0.2].map((x) => ({ from: HC, dir: [x, 0.11, 1] as Vec3 })), [0.012, 0.008], 0.064, { sides: 4, ends: 'flat' }), VISOR_L));
add(toPart(4, 'Helmet', helmet, GRAY));
add(toPart(4, 'Helmet Rim', sweep([R([0, 1.745, -0.004], [0.268, 0.268]), R([0, 1.775, -0.004], [0.27, 0.27])], { sides: 8, phase: PH }), BLACK));
add(toPart(4, 'Helmet Nape', blob([0, 1.74, -0.12], [0.255, 0.15, 0.16], 8), GRAY));

// ---- 5 headset and backpack ----
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const cup = onSurface(helmet, [0, 1.79, 0], [s, -0.05, 0.0], 0.03).p;
  add(toPart(5, `Ear Cup ${side}`, blob(cup, [0.052, 0.1, 0.1], 7), BLACK));
  add(toPart(5, `Ear Cup Ring ${side}`, blob(vadd(cup, [s * 0.04, 0, 0]), [0.026, 0.075, 0.075], 7), GRAY_L));
}
add(toPart(5, 'Headset Band', ribbon(helmet, [{ from: [0, 1.76, 0], dir: [1, -0.04, 0] }, { from: [0, 1.84, 0], dir: [0.85, 0.7, 0] }, { from: [0, 1.84, 0], dir: [0.4, 1, 0] }, { from: [0, 1.84, 0], dir: [-0.4, 1, 0] }, { from: [0, 1.84, 0], dir: [-0.85, 0.7, 0] }, { from: [0, 1.76, 0], dir: [-1, -0.04, 0] }], 0.02, 0.012, { sides: 5, ends: 'flat' }), BLACK));
add(toPart(5, 'Mic Boom', sweep([R(vadd(onSurface(helmet, [0, 1.79, 0], [1, -0.05, 0], 0.07).p, [0.0, -0.04, 0.05]), 0.011), R([0.2, 1.66, 0.18], 0.009), R([0.1, 1.6, 0.27], 0.008)], { sides: 5, end: 'dome' }), BLACK));
add(toPart(5, 'Mic Tip', blob([0.09, 1.6, 0.275], [0.022, 0.022, 0.02], 5), GRAY));
// backpack: a boxy pack with pouches and straps
add(box(5, 'Backpack', [0, 1.14, -0.24], [0.42, 0.5, 0.24], VEST, { mesh: () => frustum(1, 1, 0.9, 0.88) }));
add(box(5, 'Backpack Lid', [0, 1.4, -0.24], [0.43, 0.08, 0.25], GRAY));
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  add(box(5, `Backpack Pouch ${side}`, [s * 0.235, 1.06, -0.25], [0.08, 0.26, 0.2], CHAR_D));
  add(toPart(5, `Pack Strap ${side}`, ribbon(torso, [{ from: [s * 0.15, 1.34, 0], dir: [s * 0.3, 0.6, 0.1] }, { from: [s * 0.2, 1.25, 0], dir: [s * 0.6, 0.1, -0.8] }, { from: [s * 0.2, 1.12, 0], dir: [s * 0.8, 0, -1] }], [0.02, 0.012], 0.008, { sides: 4 }), BLACK));
}
add(box(5, 'Backpack Buckle', [0, 1.1, -0.115], [0.08, 0.05, 0.02], STEEL));

// ---- 6 rank and name ----
add(plate(6, 'Rank Patch', vest, [-0.12, 1.25, 0], [0, 0, 1], 0.1, 0.11, 0.02, CHAR_D));
for (const [i, y] of [1.275, 1.245, 1.215].entries()) {
  add(toPart(6, `Chest Chevron ${i + 1}`, ribbon(vest, [{ from: [-0.12, y + 0.02, 0], dir: [-0.3 - 0.12, 0, 1] }, { from: [-0.12, y - 0.005, 0], dir: [-0.3, 0, 1] }, { from: [-0.12, y + 0.02, 0], dir: [-0.3 + 0.12, 0, 1] }], [0.011, 0.007], 0.014, { sides: 4, ends: 'flat' }), i === 0 ? RANK : RANK_D));
}
add(plate(6, 'Name Tape', vest, [0.12, 1.25, 0], [0, 0, 1], 0.11, 0.032, 0.02, GRAY));
add(plate(6, 'Unit Patch', vest, [0.12, 1.19, 0], [0, 0, 1], 0.06, 0.06, 0.02, RANK_D));
add(plate(6, 'Unit Patch Star', vest, [0.12, 1.19, 0], [0, 0, 1], 0.032, 0.032, 0.012, RANK, 0.02));
add(plate(6, 'Dog Tag', vest, [0.0, 1.38, 0], [0, 0, 1], 0.03, 0.045, 0.012, STEEL));
add(toPart(6, 'Combat Knife', sweep([R([0.215, 0.9, 0.04], 0.024), R([0.232, 0.78, 0.055], 0.02), R([0.245, 0.64, 0.07], 0.006)], { sides: 4, end: 'dome', start: 'dome' }), STEEL));
add(toPart(6, 'Knife Handle', sweep([R([0.216, 0.9, 0.04], 0.028), R([0.221, 0.84, 0.044], 0.028)], { sides: 6 }), BLACK));
add(plate(6, 'Utility Pouch', pelvis, [0.1, 0.9, 0], [0.3, 0, -1], 0.12, 0.1, 0.05, CHAR_D));
add(part(6, 'Grenade', 'sphere', [-0.225, 0.95, 0.07], [0.07, 0.09, 0.07], '#4a5058', { segments: 6 }));

applyStyle(parts, [
  [/^(Neck|Head|Thumb|Glove)/, { paint: 0.25 }],
  [/^(Torso|Sleeve|Shoulder$|Shoulder Left|Shoulder Right|Leg |Pelvis|Cargo|Pocket)/, { paint: 0.45 }],
  [/^(Vest|Shoulder Pad|Backpack|Pack|Chest|Radio|Mask|Neck Guard)/, { paint: 0.4 }],
  [/^(Helmet|Ear Cup|Visor)/, { paint: 0.35 }],
  [/^(Boot|Stud)/, { paint: 0.3 }],
  [/^(Belt|Holster|Mag Pouch|Knee Pad|Elbow Pad|Utility)/, { paint: 0.2 }],
]);

export const SOLDIER: AssetDef = {
  id: 'soldier',
  name: 'Soldier',
  tagline: 'A tactical soldier in a black and gray uniform: helmet, visor, vest, pack and rank',
  level: 'Detailed',
  thumb: { dir: [0.55, 0.2, 1], zoom: 1.0 },
  learn: ['Bend a limb from one tapered tube', 'Layer a vest, pouches and straps over a body', 'Build a helmet with a wrap-around visor', 'Show rank with chevrons laid on a surface'],
  steps: [
    { title: 'Boots', text: 'Combat boots are one chunky shape with a gray sole and a darker cuff at the top of the shaft. Build one boot with a Cylinder (8 sides) for the shaft and pull its bottom face forward for the toe, then duplicate and mirror it.', tools: ['Shape: Cylinder', 'Edit shape: Pull out (P)', 'Duplicate Ctrl+D'] },
    { title: 'Legs, belt and pouches', text: 'Each leg is one tube, wider at the hip, with a bend at the knee. Black knee pads, cargo pockets with flaps and a strap below the knee are thin parts laid on the leg. The belt is a black ring with a steel buckle, three magazine pouches in front and a holster on the right thigh.', tools: ['Cylinder: Top size', 'Thin boxes for pockets', 'Mirror for the other leg'] },
    { title: 'Shirt and vest', text: 'The shirt is one shape that is wider at the shoulders. The vest is a slightly bigger shell over the chest, with a gray trim along its bottom edge, shoulder pads, chest pouches with flaps, a zipper and a radio with an antenna.', tools: ['Edit shape: scale a face (R)', 'Duplicate and scale up', 'Shape: Sphere, 6 sides'] },
    { title: 'Arms and gloves', text: 'Each sleeve is one tube bent at the elbow, with an elbow pad and a gray wrist strap. Black gloves have a separate thumb. Two gold chevrons are thin curved strips on the upper sleeve.', tools: ['Edit shape: Pull out + Move', 'Cylinder: Top size', 'Thin boxes'] },
    { title: 'Head, mask and visor', text: 'The head is a Sphere under a helmet: a dome with a darker rim and a ridge along the top. A curved dark visor wraps around the eyes, and a gray face mask with a vent and a filter covers the mouth. Straps hold the mask to the head.', tools: ['Shape: Sphere', 'Edit shape: Pull out', 'Rotate (E)'] },
    { title: 'Headset and backpack', text: 'Black ear cups sit on both sides of the helmet, joined by a band over the top, with a thin microphone boom curving to the mouth. The backpack is a Box slightly narrower at the top, with a lid, two side pouches, a steel buckle and two straps that go over the shoulders.', tools: ['Shape: Sphere + Size (R)', 'Shape: Box', 'Group Ctrl+G'] },
    { title: 'Rank and name', text: 'A dark patch on the chest carries three gold chevrons, the rank. A name tape and a small unit patch with a star sit on the other side, with dog tags at the neck, a combat knife on the belt and a grenade. Name every part and group them as Soldier.', tools: ['Rename in Layers', 'Group Ctrl+G', 'Color palette'] },
  ],
  challenge: 'Make an officer: change the helmet to a flat cap with a color of your choice, add one more chevron to each sleeve, and swap the backpack for a side bag.',
  parts,
};
void band2;
