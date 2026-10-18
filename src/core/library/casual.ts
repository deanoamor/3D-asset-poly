import type { AssetDef, AssetPart } from '../assets';
import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { decalBy } from './decal';
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
// A real, symmetric 3D head. The face is a set of flat stickers shot onto it from the front, so it reads the same from
// every side: only the front shows a face, the back and sides show hair.
const HC: Vec3 = [0, 1.2, 0];
const ringH = (y: number, rx: number, rz: number, cz = 0): Vec3[] => ringPts([0, y, cz], [0, 1, 0], rx, rz, 12, Math.PI / 12);
const head = hull([...ringH(1.07, 0.055, 0.05, 0.03), ...ringH(1.11, 0.1, 0.085, 0.02), ...ringH(1.16, 0.135, 0.115, 0.005), ...ringH(1.23, 0.142, 0.125), ...ringH(1.3, 0.128, 0.115), ...ringH(1.345, 0.09, 0.085)]);
add(3, 'Head', head, '#f6d9ab');
add(3, 'Neck', tubeHull([0, 1.0, 0], [0, 1.12, 0.005], 0.052, 0.048, 8, 0), '#e4ac86');
type P2 = [number, number];
const hit = (px: number, py: number) => {
  const h = onSurface(head, HC, [px, py, 1], 0);
  return h;
};
const sticker = (name: string, color: string, pts: P2[], lift: number, thick = 0.0016) => add(3, name, decalBy(head, pts, ([u, w]) => hit(u, w), lift, thick, 0.03), color);
// the eyes and brows are drawn at a small size; blow them up around the middle of the eye
const BIG = 1.5;
const mirrorX = (pts: P2[], s: 1 | -1): P2[] => pts.map(([x, y]) => [s * (0.29 + (x - 0.29) * BIG), -0.2 + (y + 0.15) * BIG] as P2);
const plain = (pts: P2[], s: 1 | -1): P2[] => pts.map(([x, y]) => [s * x, y] as P2);
// outlines for the left eye (x > 0), in ray units around the head centre; the right eye is the mirror image
const EYE: P2[] = [[0.2, -0.04], [0.235, 0.0], [0.3, 0.04], [0.36, 0.0], [0.4, -0.08], [0.38, -0.2], [0.33, -0.27], [0.27, -0.29], [0.21, -0.25], [0.19, -0.15]];
const IRIS: P2[] = [[0.22, -0.045], [0.285, -0.02], [0.345, -0.03], [0.375, -0.1], [0.37, -0.2], [0.33, -0.265], [0.275, -0.275], [0.225, -0.24], [0.205, -0.15]];
const GLOW: P2[] = [[0.23, -0.2], [0.275, -0.17], [0.33, -0.18], [0.368, -0.2], [0.33, -0.265], [0.275, -0.275], [0.235, -0.245]];
const LID: P2[] = [[0.185, -0.05], [0.225, 0.02], [0.3, 0.06], [0.375, 0.01], [0.42, -0.08], [0.395, -0.07], [0.355, -0.03], [0.3, 0.03], [0.24, -0.01], [0.205, -0.07]];
const BROW: P2[] = [[0.19, 0.06], [0.28, 0.1], [0.38, 0.08], [0.4, 0.115], [0.28, 0.145], [0.19, 0.105]];
for (const s of sides) {
  const n = nameOf(s);
  sticker(`Eye White ${n}`, '#f7efe4', mirrorX(EYE, s), 0.001);
  sticker(`Iris ${n}`, '#7a3d1e', mirrorX(IRIS, s), 0.0026);
  sticker(`Iris Glow ${n}`, '#e2923c', mirrorX(GLOW, s), 0.0042);
  sticker(`Pupil ${n}`, '#2a140c', mirrorX([[0.275, -0.1], [0.315, -0.1], [0.325, -0.19], [0.295, -0.215], [0.268, -0.19]], s), 0.0058);
  sticker(`Eye Highlight ${n}`, '#ffffff', mirrorX([[0.318, -0.045], [0.348, -0.05], [0.352, -0.085], [0.32, -0.085]], s), 0.0074);
  sticker(`Eye Lid ${n}`, '#2b1a17', mirrorX(LID, s), 0.0074);
  sticker(`Eyebrow ${n}`, '#3b2218', mirrorX(BROW, s), 0.0022);
  sticker(`Blush ${n}`, '#f2b49c', plain([[0.26, -0.47], [0.38, -0.45], [0.42, -0.51], [0.34, -0.55], [0.26, -0.52]], s), 0.0012);
}
sticker('Nose', '#e6a98a', [[-0.025, -0.42], [0.035, -0.42], [0.0, -0.47]], 0.002);
sticker('Mouth', '#c46f62', [[-0.09, -0.62], [0.09, -0.62], [0.075, -0.665], [0, -0.685], [-0.075, -0.665]], 0.0022);
for (const s of sides) add(3, `Ear ${nameOf(s)}`, cbox([s * 0.143, 1.2, -0.005], [0.028, 0.06, 0.05], 0.01), '#eab597');

// ---- 4 blocky hair and the hairband ----
/** A ring of the hair cap whose lower edge is high at the front (above the brows) and low at the back. */
const capRing = (yFront: number, yBack: number, rx: number, rz: number, cz: number): Vec3[] =>
  Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const front = (Math.cos(a) + 1) / 2; // 1 at +z, 0 at -z
    return [Math.sin(a) * rx, yBack + (yFront - yBack) * front, cz + Math.cos(a) * rz] as Vec3;
  });
const capMesh = hull([...ringH(1.425, 0.115, 0.105, -0.025), ...ringH(1.39, 0.2, 0.18, -0.02), ...capRing(1.34, 1.3, 0.225, 0.195, -0.02), ...capRing(1.3, 1.16, 0.222, 0.19, -0.03)]);
add(4, 'Hair Cap', capMesh, '#55505a');
add(4, 'Hair Crown Light', hull([...ringH(1.43, 0.12, 0.108, -0.025), ...ringH(1.4, 0.195, 0.176, -0.02), ...ringH(1.37, 0.21, 0.185, -0.02)]), '#8f878c');
add(4, 'Hair Back', hull([...ringH(1.29, 0.222, 0.13, -0.085), ...ringH(1.16, 0.2, 0.125, -0.1), ...ringH(1.04, 0.15, 0.1, -0.11)]), '#36323c');
// big swept fringe shards over the forehead, and the locks beside the face
const SHARDS: [number, number, number, string][] = [[0.11, 0.06, 1.285, '#3a3640'], [0.0, -0.02, 1.27, '#55505a'], [-0.1, -0.12, 1.265, '#3a3640']];
SHARDS.forEach(([x0, xt, yt, c], i) => add(4, `Fringe ${i + 1}`, hull([[x0 - 0.08, 1.37, 0.1], [x0 + 0.08, 1.37, 0.1], [x0 - 0.075, 1.33, 0.14], [x0 + 0.075, 1.33, 0.14], [xt, yt, 0.135]]), c));
for (const s of sides) {
  const n = nameOf(s);
  add(4, `Side Hair ${n}`, hull([M(s, [0.17, 1.3, 0.09]), M(s, [0.225, 1.3, -0.03]), M(s, [0.19, 1.3, -0.14]), M(s, [0.16, 1.12, 0.07]), M(s, [0.215, 1.14, -0.04]), M(s, [0.18, 1.08, -0.12])]), '#36323c');
  add(4, `Side Spike ${n}`, hull([M(s, [0.17, 1.16, 0.09]), M(s, [0.22, 1.16, -0.02]), M(s, [0.19, 1.1, 0.08]), M(s, [0.27, 1.04, 0.03])]), '#2d2a33');
  add(4, `Side Spike Low ${n}`, hull([M(s, [0.13, 1.1, 0.1]), M(s, [0.18, 1.1, 0.04]), M(s, [0.15, 1.05, 0.09]), M(s, [0.17, 0.97, 0.08])]), '#2d2a33');
  add(4, `Back Spike ${n}`, hull([M(s, [0.1, 1.1, -0.14]), M(s, [0.17, 1.1, -0.1]), M(s, [0.12, 1.04, -0.15]), M(s, [0.14, 0.97, -0.13])]), '#2d2a33');
}
// the hairband arches over the top from one ear to the other, lying on the cap
const bandPts: Vec3[] = [];
for (let k = 0; k <= 10; k++) {
  const a = -1.4 + (2.8 * k) / 10;
  bandPts.push(onSurface(capMesh, [0, 1.3, -0.02], [Math.sin(a), Math.cos(a) * 0.95, 0.1], 0.006).p);
}
bandPts.slice(0, -1).forEach((p, i) => add(4, `Hairband ${i + 1}`, tubeHull(p, bandPts[i + 1], [0.028, 0.011], [0.028, 0.011], 4, Math.PI / 4), '#dcd8d0'));

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
