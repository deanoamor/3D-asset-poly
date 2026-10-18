import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { decal, oval } from './decal';
import { applyStyle } from './kit';
import { hull, ringPts, slab, tubeHull } from './lowpoly';
import { onSurface, toPart } from './organic';
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
const HAIR_M = '#6c666f';
const HAIR_L = '#a29aa0';
const BAND = '#dcd8d0';
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
  shoulder: [0.132, 0.95, 0],
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
add(1, 'Shirt', tbox(0, 0, 0.84, 0.975, [0.226, 0.140], [0.262, 0.140], 0.025), WHITE);
add(1, 'Collar', tubeHull([0, 0.965, 0.0], [0, 0.985, 0.0], [0.07, 0.055], [0.064, 0.05], 8, 0), WHITE_D);
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
  add(2, `Sleeve ${n}`, tubeHull([s * 0.112, 0.958, 0], lerp(sh, el, 0.35), 0.06, 0.056, 6, 0), WHITE);
  add(2, `Sleeve Hem ${n}`, tubeHull(lerp(sh, el, 0.33), lerp(sh, el, 0.38), 0.057, 0.056, 6, 0), WHITE_D);
  add(2, `Upper Arm ${n}`, tubeHull(lerp(sh, el, 0.3), el, 0.033, 0.029, 6, 0), SKIN);
  add(2, `Forearm ${n}`, tubeHull(el, wr, 0.029, 0.025, 6, 0), SKIN);
  add(2, `Hand ${n}`, tbox(wr[0], wr[2] + 0.005, fi[1] - 0.015, wr[1], [0.036, 0.058], [0.032, 0.05], 0.01), SKIN);
  add(2, `Thumb ${n}`, tubeHull([wr[0] - s * 0.004, wr[1] - 0.02, wr[2] + 0.025], [wr[0] - s * 0.006, wr[1] - 0.06, wr[2] + 0.04], 0.011, 0.009, 5, 0), SKIN_D);
}
add(2, 'Neck', tubeHull([0, 0.96, 0], [0, 1.06, 0.005], 0.046, 0.044, 6, 0), SKIN);

// ---- 3 head and face ----
const HC: Vec3 = [0, 1.18, 0.0];
const head = hull([
  ...ringPts([0, 1.055, 0.035], [0, 1, 0], 0.08, 0.06, 8, Math.PI / 8),
  ...ringPts([0, 1.09, 0.02], [0, 1, 0], 0.13, 0.105, 8, Math.PI / 8),
  ...ringPts([0, 1.15, 0.005], [0, 1, 0], 0.158, 0.13, 8, Math.PI / 8),
  ...ringPts([0, 1.23, 0.0], [0, 1, 0], 0.162, 0.135, 8, Math.PI / 8),
  ...ringPts([0, 1.31, 0.0], [0, 1, 0], 0.13, 0.115, 8, Math.PI / 8),
]);
add(3, 'Head', head, SKIN);
type P2 = [number, number];
const EYE: P2[] = [[-0.18, 0.02], [-0.13, 0.18], [0, 0.22], [0.14, 0.19], [0.2, 0.04], [0.16, -0.15], [0.04, -0.23], [-0.1, -0.2], [-0.17, -0.1]];
const LID: P2[] = [[-0.19, 0.04], [-0.135, 0.205], [0, 0.255], [0.155, 0.22], [0.24, 0.07], [0.205, 0.05], [0.14, 0.18], [0, 0.21], [-0.13, 0.17], [-0.175, 0.03]];
const BROW: P2[] = [[-0.15, 0.3], [0.03, 0.335], [0.18, 0.37], [0.17, 0.44], [0.02, 0.41], [-0.14, 0.375]];
for (const s of sides) {
  const n = nameOf(s);
  const c: P2 = [s * 0.46, -0.08];
  const K = 1.75;
  const d = (name: string, pts: P2[], lift: number, color: string) => add(3, `${name} ${n}`, decal(head, HC, c, pts.map(([x, y]) => [x * K, y * K] as P2), lift, 0.002, s), color);
  d('Eye White', EYE, 0.001, '#fbfaf6');
  d('Iris', oval(-0.0, -0.01, 0.15, 0.215, 18), 0.0032, '#b86f37');
  d('Iris Dark', oval(0.0, 0.06, 0.145, 0.14, 16).filter(([, y]) => y >= 0.05), 0.0054, '#5a2e1a');
  d('Pupil', oval(0.0, 0.01, 0.06, 0.1, 12), 0.0076, '#2a140c');
  d('Iris Glow', oval(0.0, -0.13, 0.09, 0.05, 12), 0.0076, '#e3a35c');
  d('Eye Highlight', oval(0.06, 0.05, 0.035, 0.04, 10), 0.0098, '#ffffff');
  d('Eye Lid', LID, 0.0098, '#2b2228');
  // brows slope down toward the nose
  d('Eyebrow', BROW, 0.003, '#2f2a2e');
  add(3, `Blush ${n}`, decal(head, HC, [s * 0.55, -0.42], oval(0, 0, 0.13, 0.06, 12), 0.0012, 0.0015, s), '#f2b9a2');
  add(3, `Ear ${n}`, cbox([s * 0.152, 1.16, -0.01], [0.03, 0.06, 0.045], 0.01), SKIN_D);
}
add(3, 'Nose', decal(head, HC, [0.02, -0.36], [[-0.02, 0.03], [0.025, -0.04], [-0.02, -0.03]], 0.002, 0.002), SKIN_D);
add(3, 'Mouth', decal(head, HC, [0.01, -0.58], [[-0.06, 0.0], [0.06, 0.0], [0.055, 0.02], [-0.055, 0.02]], 0.002, 0.002), '#c47766');

// ---- 4 blocky hair and the hairband ----
/** A ring of the hair cap whose height drops from `yFront` at the face to `yBack` at the back of the head. */
const capRing = (yFront: number, yBack: number, rx: number, rz: number, cz: number): Vec3[] =>
  Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const front = (Math.cos(a) + 1) / 2; // 1 at +z, 0 at -z
    return [Math.sin(a) * rx, yBack + (yFront - yBack) * front, cz + Math.cos(a) * rz] as Vec3;
  });
const capMesh = hull([
  ...ringPts([0, 1.42, -0.03], [0, 1, 0], 0.14, 0.13, 8, Math.PI / 8),
  ...ringPts([0, 1.38, -0.02], [0, 1, 0], 0.225, 0.2, 8, Math.PI / 8),
  ...capRing(1.33, 1.3, 0.25, 0.212, -0.03),
  ...capRing(1.295, 1.17, 0.245, 0.2, -0.04),
]);
add(4, 'Hair Top', capMesh, HAIR_M);
add(4, 'Hair Crown Light', hull([...ringPts([0, 1.428, -0.03], [0, 1, 0], 0.146, 0.136, 8, Math.PI / 8), ...ringPts([0, 1.4, -0.025], [0, 1, 0], 0.215, 0.193, 8, Math.PI / 8)]), HAIR_L);
add(4, 'Hair Back', hull([[-0.235, 1.26, -0.02], [0.235, 1.26, -0.02], [0, 1.26, -0.24], [-0.2, 1.0, -0.06], [0.2, 1.0, -0.06], [0, 0.99, -0.18], [-0.17, 1.12, -0.18], [0.17, 1.12, -0.18]]), HAIR);
for (const s of sides) {
  const n = nameOf(s);
  // on her left the hair falls behind the ear, so the ear shows; on her right it covers the side of the face
  const zf = s === 1 ? -0.03 : 0.1;
  add(4, `Side Hair ${n}`, hull([M(s, [0.2, 1.26, zf]), M(s, [0.245, 1.26, -0.02]), M(s, [0.2, 1.26, -0.12]), M(s, [0.17, 1.08, zf - 0.01]), M(s, [0.23, 1.1, -0.04]), M(s, [0.19, 1.05, -0.1])]), HAIR);
  add(4, `Side Spike Upper ${n}`, hull([M(s, [0.2, 1.16, 0.07]), M(s, [0.235, 1.16, -0.03]), M(s, [0.215, 1.1, 0.06]), M(s, [0.29, 1.06, 0.02])]), HAIR);
  add(4, `Side Spike Lower ${n}`, hull([M(s, [0.15, 1.08, 0.1]), M(s, [0.2, 1.08, 0.04]), M(s, [0.17, 1.03, 0.09]), M(s, [0.19, 0.96, 0.08])]), HAIR);
}
// the swept fringe: one big lock from the crown down across the left of the forehead, and a small one on the right
add(4, 'Fringe Sweep', hull([[0.02, 1.39, 0.12], [0.13, 1.37, 0.12], [0.0, 1.37, 0.17], [0.12, 1.35, 0.16], [-0.08, 1.31, 0.17], [-0.165, 1.24, 0.13], [-0.17, 1.3, 0.11], [-0.03, 1.335, 0.176]]), HAIR_M);
add(4, 'Fringe Right', hull([[0.08, 1.36, 0.16], [0.17, 1.34, 0.13], [0.1, 1.32, 0.165], [0.17, 1.28, 0.13], [0.145, 1.245, 0.14]]), HAIR);
// the hairband arches over the top, from one ear to the other, lying on the hair
const bandPts: Vec3[] = [];
for (let k = 0; k <= 10; k++) {
  const a = -1.45 + (2.9 * k) / 10;
  bandPts.push(onSurface(capMesh, [0, 1.32, -0.02], [Math.sin(a), Math.cos(a) * 0.9, 0.12], 0.008).p);
}
bandPts.slice(0, -1).forEach((p, i) => add(4, `Hairband ${i + 1}`, tubeHull(p, bandPts[i + 1], [0.026, 0.01], [0.026, 0.01], 4, Math.PI / 4), BAND));

applyStyle(parts, [
  [/^(Eye|Iris|Pupil|Eyebrow|Nose|Mouth)/, {}],
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
