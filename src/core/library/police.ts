import type { AssetDef, AssetPart } from '../assets';
import { band2, bootParts } from './body';
import { applyStyle } from './kit';
import { blob, faceOn, headBlob, onSurface, plate, ribbon, sweep, toPart, vadd, vmul, vnorm, vsub, type Ring } from './organic';
import type { Vec3 } from '../types';
import { humanSpec } from './rigs';

const NAVY = '#22304f';
const NAVY_L = '#2e4170';
const SHIRT = '#4a6fb5';
const SHIRT_D = '#3a5a9a';
const SHIRT_L = '#6a8fd0';
const BLACK = '#1d2026';
const GRAY = '#3b3f46';
const GRAY_L = '#5a606a';
const GOLD = '#e6b422';
const SKIN = '#e8b58a';
const SKIN_D = '#d29a70';
const HAIR = '#3a2a20';

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });

// ---- the body, built first so details can sit on its surface ----
const torso = sweep([R([0, 0.87, 0], [0.2, 0.135]), R([0, 0.95, 0], [0.208, 0.14]), R([0, 1.12, 0.004], [0.232, 0.148]), R([0, 1.28, 0.008], [0.27, 0.152]), R([0, 1.4, 0.012], [0.262, 0.14])], { sides: 8, phase: Math.PI / 8 });
const pelvis = blob([0, 0.86, 0], [0.215, 0.1, 0.14], 8);
const K = 1.22; // a big head, as in stylised characters
const HC: Vec3 = [0, 1.7, 0.014];
const H = (v: Vec3): Vec3 => [HC[0] + v[0] * K, HC[1] + v[1] * K, HC[2] + v[2] * K];
const head = headBlob(HC, [0.18 * K, 0.2 * K, 0.19 * K], 12);

// ---- 0 boots ----
for (const s of [1, -1] as const) add(...bootParts(0, s, [s * 0.115, 0.215, 0], 0, { boot: BLACK, sole: GRAY, cuff: GRAY_L, laces: GRAY_L }));

// ---- 1 legs and belt ----
const legPath = (s: 1 | -1): Ring[] => [R([s * 0.105, 0.9, 0], 0.118), R([s * 0.11, 0.72, 0.012], 0.11), R([s * 0.118, 0.52, 0.035], 0.09), R([s * 0.116, 0.36, 0.015], 0.082), R([s * 0.115, 0.215, 0], 0.075), R([s * 0.115, 0.14, 0], 0.075)];
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const leg = sweep(legPath(s), { sides: 8 });
  add(toPart(1, `Leg ${side}`, leg, NAVY));
  const knee = onSurface(leg, [s * 0.118, 0.52, 0.035], [0, 0, 1], -0.012);
  add(toPart(1, `Knee Pad ${side}`, blob(knee.p, [0.07, 0.06, 0.038], 5), NAVY_L));
  add(toPart(1, `Leg Stripe ${side}`, ribbon(leg, [0.86, 0.7, 0.58].map((y) => ({ from: [s * 0.1, y, 0.012], dir: [s, 0, 0.0] as Vec3 })), [0.011, 0.008], 0.004, { sides: 4 }), SHIRT_L));
}
add(toPart(1, 'Pelvis', pelvis, NAVY));
const belt = sweep([R([0, 0.915, 0], [0.222, 0.154]), R([0, 0.985, 0], [0.222, 0.154])], { sides: 8, phase: Math.PI / 8 });
add(toPart(1, 'Belt', belt, BLACK));
add(plate(1, 'Buckle', belt, [0, 0.95, 0], [0, 0, 1], 0.085, 0.062, 0.022, GOLD));
add(plate(1, 'Buckle Center', belt, [0, 0.95, 0], [0, 0, 1], 0.042, 0.032, 0.012, GRAY, 0.02));

// ---- 2 shirt ----
add(toPart(2, 'Torso', torso, SHIRT));
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const S: Vec3 = [s * 0.3, 1.32, 0.01];
  add(toPart(2, `Shoulder ${side}`, blob(S, [0.1, 0.095, 0.1], 6), SHIRT));
  add(plate(2, `Pocket ${side}`, torso, [s * 0.115, 1.1, 0], [0, 0, 1], 0.1, 0.105, 0.016, SHIRT_D));
  add(plate(2, `Pocket Flap ${side}`, torso, [s * 0.115, 1.165, 0], [0, 0, 1], 0.105, 0.03, 0.022, NAVY_L));
  add(plate(2, `Collar ${side}`, torso, [s * 0.06, 1.39, 0], [s * 0.45, 0.15, 1], 0.11, 0.065, 0.022, SHIRT_L));
  const ep = onSurface(blob(S, [0.1, 0.095, 0.1], 6), S, [s * 0.15, 1, 0], 0.0);
  add({ ...plate(2, `Epaulette ${side}`, blob(S, [0.1, 0.095, 0.1], 6), S, [s * 0.15, 1, 0], 0.115, 0.14, 0.022, NAVY), pos: vadd(ep.p, vmul(ep.n, 0.006)) as Vec3 });
}
add(toPart(2, 'Placket', ribbon(torso, [1.37, 1.2, 1.03].map((y) => ({ from: [0, y, 0], dir: [0, 0, 1] as Vec3 })), [0.013, 0.006], 0.004, { sides: 4 }), SHIRT_L));
add(toPart(2, 'Tie', ribbon(torso, [1.36, 1.28, 1.2, 1.12].map((y) => ({ from: [0, y, 0], dir: [0, 0, 1] as Vec3 })), [0.028, 0.009], 0.008, { sides: 4, taper: 0 }), NAVY));
for (const [i, y] of [1.3, 1.05, 0.99].entries()) add(toPart(2, `Button ${i + 1}`, blob(onSurface(torso, [0.0, y, 0], [0.12, 0, 1], 0.004).p, [0.014, 0.014, 0.01], 5), SHIRT_L));
add(toPart(2, 'Tie Knot', blob(onSurface(torso, [0, 1.37, 0], [0, 0, 1], 0.004).p, [0.035, 0.03, 0.02], 5), NAVY_L));

// ---- 3 arms and hands ----
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const S: Vec3 = [s * 0.3, 1.32, 0.01];
  const M: Vec3 = [s * 0.345, 1.2, 0.025];
  const E: Vec3 = [s * 0.385, 1.08, 0.05];
  const M2: Vec3 = [s * 0.395, 0.97, 0.105];
  const W: Vec3 = [s * 0.4, 0.865, 0.155];
  add(toPart(3, `Sleeve ${side}`, sweep([R(S, 0.084), R(M, 0.08), R(E, 0.072), R(M2, 0.066), R(W, 0.059)], { sides: 7 }), SHIRT));
  add(toPart(3, `Elbow ${side}`, blob(E, [0.074, 0.074, 0.074], 6), SHIRT));
  const d = vnorm(vsub(W, M2));
  add(toPart(3, `Cuff ${side}`, sweep([R(vsub(W, vmul(d, 0.03)), 0.066), R(vadd(W, vmul(d, 0.012)), 0.066)], { sides: 7 }), NAVY));
  add(toPart(3, `Hand ${side}`, sweep([R(vadd(W, [0, 0.01, 0]), [0.05, 0.033]), R(vadd(W, [0.003, -0.05, 0.02]), [0.057, 0.036]), R(vadd(W, [0.006, -0.105, 0.045]), [0.047, 0.026])], { sides: 6, end: 'dome' }), SKIN));
  add(toPart(3, `Thumb ${side}`, sweep([R(vadd(W, [-s * 0.03, -0.03, 0.02]), 0.02), R(vadd(W, [-s * 0.042, -0.07, 0.058]), 0.016), R(vadd(W, [-s * 0.036, -0.095, 0.082]), 0.012)], { sides: 5, end: 'dome' }), SKIN));
}

// ---- 4 head and face ----
add(toPart(4, 'Neck', sweep([R([0, 1.37, 0], [0.07, 0.064]), R([0, 1.5, 0.012], [0.066, 0.06])], { sides: 6 }), SKIN));
add(toPart(4, 'Head', head, SKIN));
add(...faceOn(4, head, HC, { skin: SKIN, skinDark: SKIN_D, brow: HAIR, eye: 1.3, browTilt: 0.06, smile: 0.03 }));

// ---- 5 hair, mustache and cap ----
add(toPart(5, 'Hair Top', blob(H([0, 0.085, -0.03]), vmul([0.192, 0.14, 0.2], K), 7), HAIR));
add(toPart(5, 'Hair Nape', blob(H([0, -0.07, -0.115]), vmul([0.15, 0.11, 0.085], K), 6), HAIR));
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  add(toPart(5, `Hair Side ${side}`, blob(H([s * 0.15, 0.0, -0.06]), vmul([0.05, 0.1, 0.07], K), 5), HAIR));
  add(toPart(5, `Sideburn ${side}`, ribbon(head, [{ from: HC, dir: [s, 0.12, 0.3] }, { from: HC, dir: [s, -0.05, 0.34] }], [0.03, 0.016], 0.012, { sides: 5 }), HAIR));
  add(toPart(5, `Mustache ${side}`, ribbon(head, [{ from: HC, dir: [s * 0.02, -0.19, 1] }, { from: HC, dir: [s * 0.11, -0.2, 1] }, { from: HC, dir: [s * 0.22, -0.27, 0.95] }], [0.032, 0.019], 0.016, { sides: 5, taper: 0.3 }), HAIR));
}
const CAP_R: [number, number] = [0.205 * K, 0.2 * K];
const capY = (y: number): Vec3 => [0, HC[1] + (y - 1.69) * K, HC[2] - 0.004];
add(toPart(5, 'Cap Band', sweep([R(capY(1.775), CAP_R), R(capY(1.832), CAP_R)], { sides: 10 }), BLACK));
const crown = sweep([R(capY(1.832), [0.206 * K, 0.2 * K]), R(capY(1.895), [0.222 * K, 0.215 * K]), R(capY(1.94), [0.218 * K, 0.212 * K])], { sides: 10 });
add(toPart(5, 'Cap Crown', crown, NAVY));
add(toPart(5, 'Cap Top', sweep([R(capY(1.94), [0.219 * K, 0.213 * K]), R(capY(1.955), [0.219 * K, 0.213 * K])], { sides: 10 }), NAVY_L));
add(toPart(5, 'Cap Peak', sweep([R(vadd(capY(1.8), [0, 0, 0.17 * K]), [0.12 * K, 0.014]), R(vadd(capY(1.79), [0, 0, 0.255 * K]), [0.118 * K, 0.012]), R(vadd(capY(1.775), [0, 0, 0.31 * K]), [0.088 * K, 0.01])], { sides: 6, end: 'dome' }), BLACK));
add(plate(5, 'Cap Badge', crown, capY(1.88), [0, 0, 1], 0.09, 0.1, 0.022, GOLD));
add(plate(5, 'Cap Badge Center', crown, capY(1.88), [0, 0, 1], 0.042, 0.048, 0.012, SHIRT_L, 0.02));

// ---- 6 gear ----
add(plate(6, 'Chest Badge', torso, [0.12, 1.25, 0], [0, 0, 1], 0.085, 0.1, 0.02, GOLD));
add(plate(6, 'Badge Star', torso, [0.12, 1.25, 0], [0, 0, 1], 0.045, 0.055, 0.012, GRAY_L, 0.02));
add(plate(6, 'Name Tag', torso, [-0.12, 1.25, 0], [0, 0, 1], 0.11, 0.032, 0.02, BLACK));
const radio = plate(6, 'Radio', torso, [-0.185, 1.3, 0], [-0.25, 0, 1], 0.08, 0.125, 0.055, BLACK);
add(radio);
add(toPart(6, 'Antenna', sweep([R(vadd(radio.pos, [0, 0.05, 0]), 0.014), R(vadd(radio.pos, [-0.012, 0.13, -0.01]), 0.009)], { sides: 5, end: 'dome' }), BLACK));
add(toPart(6, 'Radio Strap', ribbon(torso, [{ from: [-0.2, 1.38, 0], dir: [-0.2, 0, 1] }, { from: [-0.1, 1.28, 0], dir: [0, 0, 1] }, { from: [0.0, 1.17, 0], dir: [0, 0, 1] }, { from: [0.1, 1.06, 0], dir: [0.15, 0, 1] }], [0.016, 0.008], 0.006, { sides: 4 }), BLACK));
add(plate(6, 'Holster', pelvis, [-0.1, 0.8, 0], [-1, 0, 0.1], 0.1, 0.22, 0.06, BLACK, 0));
add(plate(6, 'Holster Grip', pelvis, [-0.1, 0.9, 0], [-1, 0.3, 0.1], 0.05, 0.09, 0.05, GRAY, 0));
add(toPart(6, 'Baton', sweep([R([0.215, 0.9, 0.04], 0.024), R([0.232, 0.76, 0.055], 0.021), R([0.245, 0.58, 0.07], 0.02)], { sides: 6, end: 'dome', start: 'dome' }), BLACK));
add(toPart(6, 'Baton Grip', sweep([R([0.216, 0.9, 0.04], 0.027), R([0.221, 0.84, 0.044], 0.027)], { sides: 6 }), GRAY_L));
add(plate(6, 'Cuffs Pouch', pelvis, [0.1, 0.9, 0], [0.3, 0, -1], 0.11, 0.1, 0.05, BLACK));
void band2;

applyStyle(parts, [
  [/^(Eye White|Iris|Pupil|Eye Highlight|Mouth)/, { smooth: true }],
  [/^(Head|Neck|Ear |Hand |Thumb |Nose|Cheek)/, { smooth: true, paint: 0.4 }],
  [/^(Hair|Sideburn|Mustache|Eyebrow)/, { smooth: true, paint: 0.55 }],
  [/^(Torso|Sleeve|Shoulder|Elbow|Pocket|Collar|Placket|Tie|Leg |Pelvis|Knee Pad)/, { paint: 0.5 }],
  [/^(Cap)/, { paint: 0.4 }],
  [/^(Boot)/, { paint: 0.35 }],
  [/^(Belt|Holster|Baton|Radio|Cuff|Epaulette)/, { paint: 0.2 }],
]);

export const POLICE: AssetDef = {
  id: 'police',
  rig: () => humanSpec(),
  name: 'Police Officer',
  tagline: 'A friendly officer: one-piece limbs, a real face, uniform and gear',
  level: 'Detailed',
  thumb: { dir: [0.5, 0.2, 1], zoom: 1.0 },
  learn: ['Bend a limb from one tapered tube', 'Shape a head and put a face on it', 'Layer uniform, tie, pockets and badges', 'Add gear that tells the story'],
  steps: [
    { title: 'Boots', text: 'A boot is one shape that flows from the shaft into the foot, with a flat sole under it and a lighter cuff on top. Start with a Cylinder (8 sides) for the shaft, then pull its bottom face out toward the toe with Pull out and shape it. Duplicate it for the other foot.', tools: ['Shape: Cylinder', 'Edit shape: Pull out (P)', 'Duplicate Ctrl+D'] },
    { title: 'Legs and belt', text: 'Each leg is one tube, wide at the hip and narrow at the ankle, with a small bend at the knee. Make it from a Cylinder: lower the Top size, then use Edit shape to pull the points at the knee a little forward. The leg runs into the boot, so there is no gap. The belt is a short, wide ring around the waist with a gold buckle.', tools: ['Cylinder: Top size', 'Edit shape: move points', 'Mirror for the other leg'] },
    { title: 'Shirt', text: 'The torso is one shape that is wider at the shoulders than at the waist: a Box or Cylinder with the top face scaled up in Edit shape. Round blobs (spheres with 6 sides) cap the shoulders. Pockets, flaps, collar, tie and badge are thin parts laid on the surface of the shirt.', tools: ['Edit shape: scale a face (R)', 'Shape: Sphere, 6 sides', 'Thin boxes for layers'] },
    { title: 'Arms and hands', text: 'Each arm is one tube from the shoulder to the wrist, bent at the elbow. Extrude the end of a Cylinder (Pull out) twice and move the new face to bend it. The hand is a flat, rounded shape with a separate thumb. A cuff ring hides where sleeve and hand meet.', tools: ['Edit shape: Pull out, Move (W)', 'Cylinder: Top size', 'Shape: Sphere'] },
    { title: 'Head and face', text: 'The head is a Sphere with 8 sides and a narrower jaw, reshaped in Edit shape. Every facial feature sits on the surface so nothing floats: white eye blobs with smaller pupils, curved eyebrows, a Pyramid nose pointing outward, and a curved mouth.', tools: ['Edit shape: narrow the jaw', 'Shape: Pyramid + Rotate (E)', 'Mirror for symmetry'] },
    { title: 'Hair, mustache and cap', text: 'Hair is a few flattened spheres on and behind the head. The mustache and sideburns are thin curved strips that follow the face. The cap is a band, a crown that widens toward the top, a flat top and a peak that is attached to the band. A gold badge goes on the front.', tools: ['Squash with Size (R)', 'Cylinder: 10 sides + Top size', 'Rotate (E)'] },
    { title: 'Gear', text: 'A chest badge with a star, a name tag, a radio with an antenna, a holster, a baton, and a pouch at the back. Each is a small part pressed onto the surface it hangs from. Name every part in Layers and group them as Police Officer.', tools: ['Rename in Layers', 'Group Ctrl+G', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the teal lines between them are bones. Each bone is moved by the joint it starts from, so turning a shoulder swings the whole arm. When you export to GLB, every part is skinned to these joints automatically: long parts like arms and legs bend smoothly at the joints, small parts like a helmet or a pouch follow one joint. Press Pose, pick a joint and turn it with the rings: the character bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Shift+drag: carry its children', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Make a detective: remove the cap, give the officer a hat with a wide brim, and swap the shirt for a long coat by scaling a copy of the torso larger.',
  parts,
};
void GOLD;
void SHIRT_D;
