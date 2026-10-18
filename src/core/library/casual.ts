import type { AssetDef, AssetPart } from '../assets';
import { signedVolume, type PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { earClip } from './decal';
import { HAIR_BASE, HAIR_PATCHES } from './casualHair';
import { applyStyle } from './kit';
import { hull, ringPts, slab, tubeHull } from './lowpoly';
import { toPart, vadd, vcross, vmul, vnorm, vsub } from './organic';

const vdot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
import { humanSpec, type BodyJoints } from './rigs';

/**
 * A chunky low-poly girl in casual clothes: a big head with blocky dark hair and a light hairband, brown eyes with
 * strong brows, a white T-shirt under a yellow tube top, a belt, checked shorts, checked socks and light-blue
 * sneakers. Every piece is a bevelled box or a six-sided tube with big flat faces and a soft painted gradient.
 * Left is +X, Right is -X, and she faces +Z.
 */

const SKIN = '#f7d3b0';
const SKIN_D = '#e6a986';
const HAIR = '#3a3640';
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
const sides = [1, -1] as const;
const nameOf = (s: 1 | -1) => (s === 1 ? 'Left' : 'Right');
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const M = (s: 1 | -1, p: Vec3): Vec3 => [s * p[0], p[1], p[2]];

/** Turn a mesh around a vertical axis through `p` (degrees; positive turns +Z toward +X). */
function rotY(m: PolyMesh, p: Vec3, deg: number): PolyMesh {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const v = [...m.v];
  for (let i = 0; i < v.length; i += 3) {
    const x = v[i] - p[0];
    const z = v[i + 2] - p[2];
    v[i] = p[0] + x * c + z * sn;
    v[i + 2] = p[2] - x * sn + z * c;
  }
  return { v, f: m.f };
}

/** A box with bevelled edges. */
function cbox(c: Vec3, size: Vec3, ch: number): PolyMesh {
  const [hx, hy, hz] = [size[0] / 2, size[1] / 2, size[2] / 2];
  const pts: Vec3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    pts.push([c[0] + sx * (hx - ch), c[1] + sy * hy, c[2] + sz * (hz - ch)], [c[0] + sx * hx, c[1] + sy * (hy - ch), c[2] + sz * (hz - ch)], [c[0] + sx * (hx - ch), c[1] + sy * (hy - ch), c[2] + sz * hz]);
  }
  return hull(pts);
}

/** A box that is `bot` wide/deep at height y0 and `top` wide/deep at y1, with bevelled vertical edges. */
function tbox(cx: number, cz: number, y0: number, y1: number, bot: [number, number], top: [number, number], ch: number): PolyMesh {
  const ring = (y: number, [w, d]: [number, number]): Vec3[] => {
    const hx = w / 2;
    const hz = d / 2;
    return [[cx - hx + ch, y, cz - hz], [cx + hx - ch, y, cz - hz], [cx + hx, y, cz - hz + ch], [cx + hx, y, cz + hz - ch], [cx + hx - ch, y, cz + hz], [cx - hx + ch, y, cz + hz], [cx - hx, y, cz + hz - ch], [cx - hx, y, cz - hz + ch]];
  };
  return hull([...ring(y0, bot), ...ring(y1, top)]);
}

// ---- the skeleton, in metres ----
const J: BodyJoints = {
  hips: [0, 0.6, 0],
  spine: [0, 0.72, 0],
  chest: [0, 0.85, 0],
  neck: [0, 0.98, 0],
  head: [0, 1.03, 0],
  headTop: [0, 1.42, 0],
  shoulder: [0.132, 1.0, 0],
  elbow: [0.18, 0.73, -0.005],
  wrist: [0.205, 0.55, 0.012],
  fingers: [0.215, 0.46, 0.022],
  hip: [0.06, 0.56, 0],
  knee: [0.078, 0.36, 0.008],
  ankle: [0.095, 0.13, 0],
  toe: [0.12, 0.03, 0.12],
};

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
// The head is a thick plate in the plane facing the reference camera, and every plane of the face, eye, brow, nose and
// mouth is a thin plate just in front of it, all traced from the reference picture (pixel coordinates).
const REF = { az: 36, el: 15, fov: 24, vis: 1.6, tx: -0.13, ty: 0.77, w: 453, h: 544 };
function refRay(px: number, py: number): { o: Vec3; d: Vec3; fwd: Vec3 } {
  const a = (REF.az * Math.PI) / 180;
  const e = (REF.el * Math.PI) / 180;
  const dist = REF.vis / (2 * Math.tan((REF.fov * Math.PI) / 360));
  const target: Vec3 = [REF.tx, REF.ty, 0];
  const o: Vec3 = [target[0] + dist * Math.cos(e) * Math.sin(a), target[1] + dist * Math.sin(e), target[2] + dist * Math.cos(e) * Math.cos(a)];
  const fwd = vnorm(vsub(target, o));
  const right = vnorm(vcross(fwd, [0, 1, 0]));
  const up = vcross(right, fwd);
  const th = Math.tan((REF.fov * Math.PI) / 360);
  const nx = (px / REF.w) * 2 - 1;
  const ny = 1 - (py / REF.h) * 2;
  return { o, d: vnorm(vadd(vadd(fwd, vmul(right, nx * th * (REF.w / REF.h))), vmul(up, ny * th))), fwd };
}
const HEAD_C: Vec3 = [0, 1.2, 0];
/** A plate over an outline in reference pixels, between two depths measured along the camera's view direction. */
function rayPlate(flat: number[], front: number, back: number): PolyMesh {
  const outline: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) {
    const q: [number, number] = [flat[i], flat[i + 1]];
    const last = outline[outline.length - 1];
    if (!last || Math.hypot(last[0] - q[0], last[1] - q[1]) > 0.05) outline.push(q);
  }
  if (outline.length > 1 && Math.hypot(outline[0][0] - outline[outline.length - 1][0], outline[0][1] - outline[outline.length - 1][1]) <= 0.05) outline.pop();
  const { tris, order } = earClip(outline);
  const n = outline.length;
  const cam = refRay(250, 130);
  const depthC = vdot(vsub(HEAD_C, cam.o), cam.fwd);
  const v: number[] = [];
  const at = (q: [number, number], depth: number): Vec3 => {
    const r = refRay(q[0], q[1]);
    return vadd(r.o, vmul(r.d, (depthC + depth) / vdot(r.d, r.fwd)));
  };
  for (const q of outline) v.push(...at(q, front));
  for (const q of outline) v.push(...at(q, back));
  const f: number[][] = tris.map((t) => [...t]);
  for (const t of tris) f.push([t[2] + n, t[1] + n, t[0] + n]);
  for (let i = 0; i < n; i++) {
    const a = order[i];
    const b = order[(i + 1) % n];
    f.push([b, a, a + n, b + n]);
  }
  const m: PolyMesh = { v, f };
  if (signedVolume(m) < 0) m.f = m.f.map((q) => [...q].reverse());
  return m;
}
const FACE_OUTLINE = [218.0, 86.0, 219.8, 118.5, 221.5, 119.5, 220.7, 127.5, 222.3, 141.3, 224.5, 141.5, 223.7, 145.7, 225.8, 145.8, 225.0, 150.0, 228.3, 153.7, 228.0, 157.8, 232.2, 167.2, 246.0, 175.0, 263.2, 175.0, 278.3, 169.8, 293.2, 159.8, 298.8, 149.3, 296.3, 144.5, 294.8, 136.8, 292.8, 135.3, 293.0, 131.0, 284.3, 108.7, 280.2, 104.2, 276.8, 103.7, 277.3, 101.8, 279.2, 101.7, 279.0, 100.0, 275.0, 98.5, 273.0, 99.8, 273.7, 103.8, 267.8, 103.2, 267.3, 100.2, 264.7, 97.3, 260.7, 97.7, 256.7, 93.8, 251.5, 94.3, 247.2, 89.2, 243.7, 90.3, 236.0, 86.0];
add(3, 'Head', rayPlate(FACE_OUTLINE, -0.12, 0.1), '#f6d9ab');
add(3, 'Neck', rayPlate([252, 160, 270, 166, 286, 160, 291, 176, 293, 194, 250, 194], -0.03, 0.1), '#cb8672');
const FACE: [string, string, number[]][] = [
  ['Right Plane', '#f4cf9f', [262, 104, 283, 108, 286, 125, 288, 142, 282, 158, 272, 168, 262, 172, 262, 140]],
  ['Dark Plane', '#b06d64', [283, 108, 291, 125, 299, 150, 293, 160, 284, 152, 286, 138, 286, 122]],
  ['Darker Plane', '#9a5a58', [284, 152, 293, 160, 285, 166, 278, 170, 280, 158]],
  ['Chin Left', '#eaba97', [226, 158, 246, 162, 262, 165, 263, 175, 246, 175, 232, 167]],
  ['Chin Right', '#ebab88', [262, 160, 278, 168, 263, 175]],
  ['Rose Plane', '#c5836b', [243, 90, 262, 96, 277, 103, 270, 106, 255, 102]],
  ['Brow Shade Left', '#db8e75', [224, 108, 238, 110, 240, 114, 226, 116]],
  ['Brow Shade Right', '#c68169', [258, 107, 282, 108, 285, 113, 262, 112]],
  ['Eye White Left', '#f1d9c1', [222, 121, 228, 114, 238, 113, 241, 122, 241, 133, 235, 136, 227, 135, 222, 128]],
  ['Eye White Right', '#e4d3c0', [258, 124, 262, 117, 270, 114, 280, 115, 285, 121, 285, 129, 279, 134.5, 270, 136, 262, 133]],
  ['Iris Left', '#4b2119', [224, 123, 229, 115, 237, 115, 240, 123, 240, 131, 235, 133.5, 228, 133, 225, 129]],
  ['Iris Right', '#3d1f14', [259, 121, 265, 115, 275, 114.5, 283, 120, 284, 127, 280, 131, 272, 132.5, 264, 131, 261, 127.5]],
  ['Iris Glow Left', '#e8963c', [227, 130.5, 233, 128.5, 239.5, 130, 238, 133.5, 233, 135.2, 229, 134]],
  ['Iris Glow Right', '#dc8532', [265, 129.5, 272, 127.8, 280, 129, 278.5, 132.5, 272, 134.6, 266.5, 133]],
  ['Lid Left', '#2b1a17', [222, 122, 225.5, 115.5, 232, 113, 239, 114.2, 241, 119.5, 238.5, 116.5, 232, 115, 227, 117.5, 224, 123]],
  ['Lid Right', '#2b1a17', [258, 124, 262, 117, 271, 113.5, 281, 114.2, 286, 119.5, 283.5, 118, 279.5, 115.8, 271, 115.5, 264, 119.5, 260.5, 125]],
  ['Brow Left', '#3f241c', [220, 101, 226, 102, 232, 105, 236, 108, 235, 110, 229, 107, 223, 105, 220, 104]],
  ['Brow Right', '#43291f', [252, 108, 258, 105, 266, 103, 275, 103, 281, 106, 275, 106, 266, 107, 258, 109, 253, 110.5]],
  ['Nose', '#f0bc92', [240, 145, 246, 145, 244, 148, 240, 147]],
  ['Mouth', '#e9b98b', [246, 154, 259, 154, 259, 156, 246, 156]],
];
FACE.forEach(([name, color, pts], i) => add(3, `Face ${name}`, rayPlate(pts, -0.12 - 0.0012 * (i + 1) - 0.002, -0.12 - 0.0012 * i), color));

// ---- 4 hair, built from the reference picture ----
// Every flat colour patch of the hair is a thick plate in the plane facing the reference camera, so from that view
// each patch sits on the same pixel as in the picture; the plates run back through the head to give the hair depth.
// real volume for the other views: a skull inside the face plates, hair behind and around it, and a grey top
const ring = (y: number, rx: number, rz: number, cz = 0): Vec3[] => ringPts([0, y, cz], [0, 1, 0], rx, rz, 12, Math.PI / 12);
// the back volume sits behind the face plates as seen from the reference camera: slide it away along that view
const BACK: Vec3 = [-0.05, 0, -0.08];
const backRing = (y: number, rx: number, rz: number, cz = 0): Vec3[] => ring(y, rx, rz, cz).map((p) => [p[0] + BACK[0], p[1], p[2] + BACK[2]] as Vec3);
add(3, 'Skull', hull([...ring(1.1, 0.06, 0.05, 0.03), ...ring(1.16, 0.1, 0.085, 0.01), ...ring(1.24, 0.11, 0.1), ...ring(1.3, 0.1, 0.09)]), '#f6d9ab');
add(4, 'Hair Back Mass', hull([...backRing(1.0, 0.09, 0.06, -0.06), ...backRing(1.12, 0.17, 0.14, -0.03), ...backRing(1.24, 0.2, 0.16, -0.01), ...backRing(1.33, 0.19, 0.15, 0), ...backRing(1.39, 0.12, 0.1, 0)]), '#37333d');
add(4, 'Hair Base', rayPlate(HAIR_BASE, -0.02, 0.13), HAIR);
HAIR_PATCHES.forEach((h, i) => add(4, `Hair Patch ${i + 1}`, rayPlate(h.pts, -0.045 - i * 0.0006, 0.13), h.color));

applyStyle(parts, [
  [/^(Head|Neck|Ear|Thigh|Shin|Upper Arm|Forearm|Hand|Thumb)/, { paint: 0.35 }],
  [/^(Hair|Side|Fringe)/, { paint: 0.3 }],
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
