import type { AssetDef, AssetPart } from '../assets';
import { faceNormal, type PolyMesh } from '../mesh';
import { bootParts } from './body';
import { applyStyle, part } from './kit';
import { blob, headBlob, onSurface, plate, ribbon, sweep, toPart, vadd, type Ring } from './organic';
import type { Vec3 } from '../types';
import { HUMAN, humanSpec } from './rigs';

/**
 * A stylised anime girl in a bust-friendly design: big head, large violet eyes, pink spiky hair with two black bows,
 * bare shoulders, a navy top with a white collar, detached white sleeves with gold trim, red belts, navy mini skirt
 * and white boots. Everything is built from the same pieces as the other characters.
 */

const SKIN = '#fff1f1';
const SKIN_D = '#f6c9d2';
const BLUSH = '#ffc0cf';
const HAIR = '#ff8fc7';
const HAIR_L = '#ffb9dd';
const HAIR_D = '#ec62a8';
const HAIR_DD = '#d44a93';
const IRIS = '#9552ec';
const IRIS_D = '#5d2bb8';
const IRIS_L = '#cd9bff';
const PUPIL = '#24104f';
const LASH = '#3b1a78';
const BROW = '#e86fae';
const LIP = '#d4395f';
const MOUTH = '#6d1530';
const NAVY = '#252a6a';
const WHITE = '#fcfcff';
const WHITE_D = '#e3e5f3';
const GOLD = '#f4b73a';
const RED = '#c2352b';
const BELT = '#a8362a';
const BELT_L = '#c65240';
const BOW = '#1b1634';
const BOW_L = '#5a3aa8';

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const OUTLINE = '#dc2f78';
const OUTLINE_P = '#5b2ec9';

/** The mesh pushed outward by `d` along its point normals and turned inside out: seen from outside only a rim shows. */
function shell(m: PolyMesh, d: number): PolyMesh {
  const n = m.v.length / 3;
  const acc = new Float64Array(n * 3);
  m.f.forEach((f, fi) => {
    const fn = faceNormal(m, fi);
    for (const i of f) for (let k = 0; k < 3; k++) acc[i * 3 + k] += fn[k];
  });
  const v = [...m.v];
  for (let i = 0; i < n; i++) {
    const l = Math.hypot(acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2]) || 1;
    for (let k = 0; k < 3; k++) v[i * 3 + k] += (acc[i * 3 + k] / l) * d;
  }
  return { v, f: m.f.map((q) => [...q].reverse()) };
}

/** A part plus its outline: a slightly bigger inside-out copy that only shows as a coloured rim around the silhouette. */
const lined = (step: number, name: string, m: PolyMesh, color: string, d = 0.011, oc = OUTLINE): AssetPart[] => [toPart(step, name, m, color), toPart(step, `${name} Outline`, shell(m, d), oc)];

// ---- the body shapes first, so details can sit on their surface ----
const torso = sweep([R([0, 0.88, 0], [0.165, 0.115]), R([0, 0.98, 0], [0.152, 0.108]), R([0, 1.1, 0.004], [0.16, 0.112]), R([0, 1.22, 0.008], [0.19, 0.122]), R([0, 1.32, 0.01], [0.235, 0.13]), R([0, 1.4, 0.012], [0.19, 0.11]), R([0, 1.44, 0.012], [0.07, 0.06])], { sides: 8, phase: Math.PI / 8 });
const bandeau = sweep([R([0, 1.2, 0.008], [0.204, 0.134]), R([0, 1.27, 0.01], [0.226, 0.142]), R([0, 1.36, 0.012], [0.246, 0.139])], { sides: 8, phase: Math.PI / 8 });
const K = 1.36; // a big head
const HC: Vec3 = [0, 1.69, 0.014];
const head = headBlob(HC, [0.18 * K, 0.2 * K, 0.19 * K], 12);
const on = (dx: number, dy: number, lift: number): Vec3 => onSurface(head, HC, [dx, dy, 1], lift).p;

// ---- 0 boots and legs ----
for (const s of [1, -1] as const) add(...bootParts(0, s, [s * 0.115, 0.215, 0], 0, { boot: WHITE, sole: NAVY, cuff: GOLD, laces: RED }));
const legPath = (s: 1 | -1): Ring[] => [R([s * 0.105, 0.9, 0], 0.1), R([s * 0.11, 0.72, 0.012], 0.092), R([s * 0.118, 0.52, 0.035], 0.075), R([s * 0.116, 0.36, 0.015], 0.068), R([s * 0.115, 0.215, 0], 0.062), R([s * 0.115, 0.14, 0], 0.062)];
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  add(toPart(0, `Leg ${side}`, sweep(legPath(s), { sides: 8 }), SKIN));
  add(toPart(0, `Thigh Sock ${side}`, sweep([R([s * 0.116, 0.62, 0.018], 0.084), R([s * 0.118, 0.52, 0.035], 0.082), R([s * 0.116, 0.36, 0.015], 0.075), R([s * 0.115, 0.215, 0], 0.07), R([s * 0.115, 0.15, 0], 0.07)], { sides: 8 }), WHITE));
  add(toPart(0, `Sock Trim ${side}`, sweep([R([s * 0.116, 0.625, 0.018], 0.089), R([s * 0.116, 0.65, 0.018], 0.089)], { sides: 8 }), GOLD));
}

// ---- 1 body: midriff, top, belts and skirt ----
add(...lined(1, 'Torso', torso, SKIN, 0.01));
add(toPart(1, 'Navel', blob(onSurface(torso, [0, 1.05, 0], [0, 0, 1], -0.004).p, [0.012, 0.016, 0.01], 5), SKIN_D));
add(...lined(1, 'Bandeau', bandeau, NAVY, 0.01));
add(toPart(1, 'Bandeau Trim', sweep([R([0, 1.198, 0.008], [0.206, 0.136]), R([0, 1.214, 0.008], [0.208, 0.137])], { sides: 8, phase: Math.PI / 8 }), GOLD));
add(toPart(1, 'Bandeau Trim Red', sweep([R([0, 1.19, 0.008], [0.205, 0.135]), R([0, 1.198, 0.008], [0.206, 0.136])], { sides: 8, phase: Math.PI / 8 }), RED));
add(plate(1, 'Bandeau Gem', bandeau, [0, 1.27, 0], [0, 0, 1], 0.05, 0.05, 0.02, GOLD));
add(toPart(1, 'Collar', sweep([R([0, 1.345, 0.012], [0.236, 0.15]), R([0, 1.38, 0.012], [0.2, 0.128]), R([0, 1.405, 0.012], [0.15, 0.1])], { sides: 8, phase: Math.PI / 8 }), WHITE));
add(toPart(1, 'Collar Shade', sweep([R([0, 1.338, 0.012], [0.238, 0.152]), R([0, 1.35, 0.012], [0.234, 0.149])], { sides: 8, phase: Math.PI / 8 }), WHITE_D));
add(toPart(1, 'Pelvis', blob([0, 0.86, 0], [0.205, 0.1, 0.135], 8), NAVY));
// the white points of the collar at the front of the top
for (const s of [1, -1] as const) add(part(1, `Collar Point ${s === 1 ? 'Left' : 'Right'}`, 'pyramid', [s * 0.035, 1.325, 0.155], [0.075, 0.13, 0.05], WHITE, { rot: [180, 0, s * 14] }));
add(toPart(1, 'Skirt', sweep([R([0, 0.91, 0], [0.19, 0.138]), R([0, 0.84, 0], [0.222, 0.165]), R([0, 0.76, 0], [0.262, 0.2])], { sides: 8, phase: Math.PI / 8 }), NAVY));
add(toPart(1, 'Skirt Trim', sweep([R([0, 0.77, 0], [0.26, 0.198]), R([0, 0.755, 0], [0.264, 0.202])], { sides: 8, phase: Math.PI / 8 }), GOLD));
const beltA = sweep([R([0, 0.94, 0], [0.182, 0.128]), R([0, 0.985, 0], [0.18, 0.126])], { sides: 8, phase: Math.PI / 8 });
const beltB = sweep([R([0, 0.885, 0], [0.205, 0.142]), R([0, 0.93, 0], [0.2, 0.14])], { sides: 8, phase: Math.PI / 8 });
add(toPart(1, 'Belt Upper', beltA, BELT), toPart(1, 'Belt Lower', beltB, BELT_L));
add(plate(1, 'Belt Buckle', beltB, [0.04, 0.91, 0], [0.2, 0, 1], 0.07, 0.06, 0.022, GOLD));
add(plate(1, 'Belt Buckle Inner', beltB, [0.04, 0.91, 0], [0.2, 0, 1], 0.035, 0.03, 0.012, BELT, 0.02));
add(plate(1, 'Belt Clasp', beltA, [-0.07, 0.96, 0], [-0.4, 0, 1], 0.05, 0.05, 0.02, GOLD));

// ---- 2 arms and wide white sleeves ----
// the Left arm (right side of the picture) reaches out and down; the Right arm hangs by her side
const ARM_L = { S: [0.29, 1.32, 0.01] as Vec3, E: [0.5, 1.2, 0.12] as Vec3, W: [0.72, 1.1, 0.2] as Vec3, F: [0.8, 1.06, 0.225] as Vec3 };
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const S: Vec3 = s === 1 ? ARM_L.S : [-0.29, 1.32, 0.01];
  const E: Vec3 = s === 1 ? ARM_L.E : [-0.385, 1.08, 0.05];
  const W: Vec3 = s === 1 ? ARM_L.W : [-0.4, 0.88, 0.155];
  add(...lined(2, `Shoulder ${side}`, blob(S, [0.082, 0.08, 0.082], 6), SKIN, 0.009));
  add(toPart(2, `Upper Arm ${side}`, sweep([R(S, 0.058), R(lerp(S, E, 0.5), 0.052), R(E, 0.046)], { sides: 7 }), SKIN));
  const end: Vec3 = s === 1 ? vadd(W, [0.03, 0.0, 0.01]) : vadd(W, [-0.015, 0.02, 0.01]);
  const sleeve = sweep([R(lerp(S, E, 0.3), 0.08), R(E, [0.1, 0.1]), R(lerp(E, W, 0.5), [0.14, 0.14]), R(end, [0.2, 0.2])], { sides: 8 });
  add(...lined(2, `Sleeve ${side}`, sleeve, WHITE, 0.012));
  const dir = s === 1 ? ([1, 0, 0.1] as Vec3) : ([0, 1, 0] as Vec3);
  const ringAt = (back: number): Ring => R(vadd(end, [dir[0] * back, dir[1] * back, dir[2] * back]), [0.203, 0.203]);
  add(toPart(2, `Sleeve Cuff ${side}`, sweep([ringAt(-0.012), ringAt(-0.032)], { sides: 8 }), RED));
  add(toPart(2, `Sleeve Trim ${side}`, sweep([ringAt(-0.034), ringAt(-0.05)], { sides: 8 }), GOLD));
  const hand = s === 1 ? [R(vadd(W, [0.01, 0, 0]), [0.04, 0.03]), R(vadd(W, [0.09, -0.02, 0.02]), [0.046, 0.03]), R(vadd(W, [0.16, -0.04, 0.035]), [0.036, 0.024])] : [R(vadd(W, [0, -0.02, 0]), [0.04, 0.028]), R(vadd(W, [0.002, -0.07, 0.015]), [0.046, 0.03]), R(vadd(W, [0.004, -0.12, 0.034]), [0.038, 0.024])];
  add(toPart(2, `Hand ${side}`, sweep(hand, { sides: 6, end: 'dome' }), SKIN));
}
// a gold triangle on the raised sleeve, as on the picture
add(part(2, 'Sleeve Point', 'pyramid', [0.43, 1.31, 0.13], [0.11, 0.16, 0.09], GOLD, { rot: [0, 0, -62] }));
add(toPart(2, 'Neck', sweep([R([0, 1.37, 0], [0.058, 0.054]), R([0, 1.5, 0.012], [0.054, 0.05])], { sides: 6 }), SKIN));

// ---- 3 head and face ----
add(...lined(3, 'Head', head, SKIN, 0.011));
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  const at = (dx: number, dy: number, lift: number) => on(s * (0.46 + dx), -0.07 + dy, lift);
  const white = blob(at(0, 0, -0.012), [0.06, 0.072, 0.024], 10);
  add(toPart(3, `Eye White ${side}`, white, '#ffffff'));
  add(toPart(3, `Iris ${side}`, blob(at(0, -0.02, 0.004), [0.055, 0.066, 0.02], 10), IRIS));
  add(toPart(3, `Iris Dark ${side}`, blob(at(0, 0.12, 0.012), [0.052, 0.034, 0.015], 8), IRIS_D));
  add(toPart(3, `Iris Glow ${side}`, blob(at(0, -0.24, 0.014), [0.042, 0.028, 0.012], 8), IRIS_L));
  add(toPart(3, `Pupil ${side}`, blob(at(0.0, -0.03, 0.016), [0.018, 0.028, 0.012], 10), PUPIL));
  add(toPart(3, `Eye Highlight ${side}`, blob(at(-0.13, 0.15, 0.024), [0.02, 0.024, 0.008], 8), '#ffffff'));
  add(toPart(3, `Eye Sparkle ${side}`, blob(at(0.12, -0.12, 0.024), [0.011, 0.011, 0.006], 6), '#ffffff'));
  const lash = [[-0.2, 0.08], [-0.14, 0.24], [0.0, 0.33], [0.14, 0.29], [0.26, 0.16], [0.36, 0.04], [0.42, -0.04]].map(([dx, dy]) => ({ from: HC, dir: [s * (0.46 + dx), -0.07 + dy, 1] as Vec3 }));
  add(toPart(3, `Upper Lash ${side}`, ribbon(head, lash, [0.02, 0.011], 0.013, { sides: 4, taper: 0.45 }), LASH));
  const lower = [[-0.14, -0.24], [0, -0.3], [0.16, -0.22]].map(([dx, dy]) => ({ from: HC, dir: [s * (0.46 + dx), -0.07 + dy, 1] as Vec3 }));
  add(toPart(3, `Lower Lash ${side}`, ribbon(head, lower, [0.006, 0.005], 0.006, { sides: 4, taper: 0.5 }), IRIS_D));
  const brow = [[-0.2, 0.62], [-0.02, 0.66], [0.2, 0.6]].map(([dx, dy]) => ({ from: HC, dir: [s * (0.46 + dx), -0.07 + dy, 1] as Vec3 }));
  add(toPart(3, `Eyebrow ${side}`, ribbon(head, brow, [0.012, 0.007], 0.006, { sides: 4, taper: 0.5 }), BROW));
  add(toPart(3, `Cheek ${side}`, blob(on(s * 0.7, -0.33, -0.006), [0.04, 0.02, 0.012], 6), BLUSH));
}
add(toPart(3, 'Nose', blob(on(0, -0.2, 0.004), [0.009, 0.011, 0.01], 5), SKIN_D));
add(toPart(3, 'Mouth', blob(on(0, -0.5, 0.0), [0.022, 0.03, 0.012], 7), LIP));
add(toPart(3, 'Mouth Inside', blob(on(0, -0.5, 0.008), [0.014, 0.02, 0.008], 6), MOUTH));

// ---- 4 hair ----
const H = (v: Vec3): Vec3 => [HC[0] + v[0], HC[1] + v[1], HC[2] + v[2]];
const crown = blob(H([0, 0.065, -0.03]), [0.265, 0.245, 0.275], 9);
add(...lined(4, 'Hair Crown', crown, HAIR, 0.012));
add(...lined(4, 'Hair Back', blob(H([0, -0.04, -0.13]), [0.33, 0.3, 0.2], 8), HAIR_D, 0.012));
add(...lined(4, 'Hair Nape', blob(H([0, -0.22, -0.12]), [0.22, 0.12, 0.14], 7), HAIR_DD, 0.01));
// glossy streaks on the top of the hair
[[-0.3, 1, 0.25], [0.0, 1, 0.5], [0.34, 1, 0.3]].forEach(([dx, dy, dz], i) => {
  const pts = [0, 1, 2].map((k) => ({ from: H([0, 0.06, -0.03]), dir: [dx * (1 - k * 0.25), dy, dz + k * 0.35] as Vec3 }));
  add(toPart(4, `Hair Shine ${i + 1}`, ribbon(crown, pts, [0.024, 0.008], 0.004, { sides: 4, taper: 0.7 }), '#ffd9ec'));
});
const bangs: [number, number, string][] = [[-0.64, -0.02, HAIR_D], [-0.38, 0.12, HAIR], [-0.12, 0.25, HAIR_L], [0.14, 0.25, HAIR_L], [0.4, 0.12, HAIR], [0.66, -0.02, HAIR_D]];
bangs.forEach(([dx, tip, c], i) => {
  const pts = [{ dx: dx * 0.85, dy: 1.1 }, { dx: dx * 0.97, dy: (1.1 + tip) / 2 + 0.1 }, { dx: dx * 1.02, dy: tip }].map((q) => ({ from: HC, dir: [q.dx, q.dy, 1] as Vec3 }));
  add(toPart(4, `Bang ${i + 1}`, ribbon(head, pts, [0.085, 0.024], 0.016, { sides: 5, taper: 0.92 }), c));
});
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  add(...lined(4, `Side Lock ${side}`, sweep([R(H([s * 0.2, 0.1, 0.02]), [0.1, 0.08]), R(H([s * 0.3, -0.02, 0.05]), [0.1, 0.06]), R(H([s * 0.4, -0.13, 0.07]), [0.07, 0.04]), R(H([s * 0.5, -0.24, 0.08]), [0.012, 0.01])], { sides: 5, end: 'dome' }), HAIR, 0.011));
  add(toPart(4, `Side Lock Light ${side}`, sweep([R(H([s * 0.225, 0.06, 0.08]), [0.034, 0.02]), R(H([s * 0.32, -0.04, 0.1]), [0.03, 0.018]), R(H([s * 0.4, -0.12, 0.11]), [0.016, 0.012])], { sides: 4, end: 'dome' }), HAIR_L));
  add(...lined(4, `Back Lock ${side}`, sweep([R(H([s * 0.2, 0.0, -0.17]), [0.1, 0.07]), R(H([s * 0.28, -0.14, -0.16]), [0.085, 0.06]), R(H([s * 0.3, -0.3, -0.14]), [0.012, 0.01])], { sides: 5, end: 'dome' }), HAIR_D, 0.01));
  add(...lined(4, `Hair Tuft ${side}`, sweep([R(H([s * 0.1, 0.2, -0.02]), [0.09, 0.06]), R(H([s * 0.15, 0.3, -0.03]), [0.05, 0.04]), R(H([s * 0.18, 0.37, -0.03]), [0.008, 0.008])], { sides: 4, end: 'dome' }), HAIR, 0.01));
  // black bow
  const b = H([s * 0.25, 0.21, -0.03]);
  add(...lined(4, `Bow Knot ${side}`, blob(b, [0.04, 0.04, 0.035], 6), BOW, 0.008, OUTLINE_P));
  add(...lined(4, `Bow Wing Up ${side}`, sweep([R(b, [0.03, 0.025]), R(vadd(b, [s * 0.04, 0.055, 0]), [0.07, 0.03]), R(vadd(b, [s * 0.08, 0.1, 0.01]), [0.014, 0.012])], { sides: 5, end: 'dome' }), BOW, 0.009, OUTLINE_P));
  add(...lined(4, `Bow Wing Down ${side}`, sweep([R(b, [0.03, 0.025]), R(vadd(b, [s * 0.055, -0.03, 0]), [0.07, 0.03]), R(vadd(b, [s * 0.105, -0.07, 0.01]), [0.014, 0.012])], { sides: 5, end: 'dome' }), BOW_L, 0.009, OUTLINE_P));
}

// ---- 5 skeleton ----
void SKIN_D;

applyStyle(parts, [
  [/Outline$/, {}],
  [/^(Eye White|Iris|Pupil|Eye Highlight|Eye Sparkle|Mouth|Cheek|Nose|Upper Lash|Lower Lash|Eyebrow)/, { smooth: true }],
  [/^(Head|Neck|Hand |Torso|Leg |Shoulder|Upper Arm|Navel)/, { smooth: true, paint: 0.25 }],
  [/^(Bandeau|Skirt|Pelvis|Sleeve |Thigh Sock|Collar|Boot)/, { paint: 0.2 }],
]);

export const ANIME: AssetDef = {
  id: 'anime',
  rig: () => humanSpec({ ...HUMAN, shoulder: ARM_L.S, elbow: ARM_L.E, wrist: ARM_L.W, fingers: ARM_L.F }, { shoulder: [-0.3, 1.32, 0.01], elbow: [-0.385, 1.08, 0.05], wrist: [-0.4, 0.88, 0.155], fingers: [-0.405, 0.8, 0.19] }),
  name: 'Pink Anime Girl',
  tagline: 'A stylised anime character: big violet eyes, spiky pink hair, black bows and wide white sleeves',
  level: 'Detailed',
  thumb: { dir: [0.15, 0.1, 1], zoom: 0.8 },
  learn: ['Layer big stylised eyes from simple blobs', 'Build spiky hair from tapered strips that follow the head', 'Make wide sleeves from one flared tube', 'Add trims and small accessories in gold and red'],
  steps: [
    { title: 'Boots, socks and legs', text: 'The legs are two tapered tubes in a light skin color. White thigh-high socks are slightly wider tubes laid over them, closed with a gold trim ring at the top. Each boot is one shape that flows from the shaft into the foot, with a navy sole under it.', tools: ['Shape: Cylinder', 'Edit shape: Pull out (P)', 'Duplicate Ctrl+D'] },
    { title: 'Body, top and belts', text: 'The torso is one tube that is narrow at the waist and wider at the shoulders. A navy band is the top, with gold and red trim, a gem and two white collar triangles. Two belts in red and orange-red wrap the hips over a navy skirt that flares out and ends in a gold edge.', tools: ['Edit shape: scale a face (R)', 'Thin boxes for layers', 'Duplicate Ctrl+D'] },
    { title: 'Arms and wide sleeves', text: 'Skin-colored arms end in small hands. Each white sleeve is one tube that starts narrow at the upper arm and flares wide near the wrist, then ends with red and gold rings and a gold gem. Use the Size handles to make the flare bigger or smaller.', tools: ['Cylinder: Top size', 'Size handles (R)', 'Mirror ideas: duplicate and move'] },
    { title: 'Head and face', text: 'The head is a wide Sphere with a narrow jaw. Each big eye is built from layers: a white base, a violet iris, a darker top, a bright lower glow, a dark pupil and two white sparkles. A thick dark lash line sits on top, a small open mouth and pink cheeks finish the face.', tools: ['Shape: Sphere', 'Edit shape: narrow the jaw', 'Thin strips for lashes and brows'] },
    { title: 'Hair and bows', text: 'The hair is a crown over the head, a darker mass behind it and seven pointed bangs laid across the forehead, each one a thin strip that tapers to a tip. Long side locks and back locks hang down. Two tufts rise from the top and two black bows with purple highlights sit on both sides.', tools: ['Thin tapered strips', 'Shape: Sphere, 9 sides', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: the girl bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Change her look: recolor the hair to blue, swap the bows for cat ears made from two Cones, and make the sleeves shorter by scaling them down.',
  parts,
};
