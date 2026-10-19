import type { PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { decalBy } from './decal';
import { hull, ringPts, tubeHull } from './lowpoly';
import { blob, onSurface, ribbon, sweep, type Ring } from './organic';
import type { BodyJoints } from './rigs';

/**
 * The shared base of the chunky game characters (Casual Girl, Nurse): the same proportions, skeleton, round head and
 * anime face. A character brings its own clothes and hair, and its own face colours.
 * Left is +X, Right is -X, and the character faces +Z.
 */

export type Add = (step: number, name: string, m: PolyMesh, color: string) => void;

export const sides = [1, -1] as const;
export const nameOf = (s: 1 | -1) => (s === 1 ? 'Left' : 'Right');
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** The Left (+X) point, or its mirror image for the Right side. */
export const M = (s: 1 | -1, p: Vec3): Vec3 => [s * p[0], p[1], p[2]];

/** Turn a mesh around a vertical axis through `p` (degrees; positive turns +Z toward +X). */
export function rotY(m: PolyMesh, p: Vec3, deg: number): PolyMesh {
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
export function cbox(c: Vec3, size: Vec3, ch: number): PolyMesh {
  const [hx, hy, hz] = [size[0] / 2, size[1] / 2, size[2] / 2];
  const pts: Vec3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    pts.push([c[0] + sx * (hx - ch), c[1] + sy * hy, c[2] + sz * (hz - ch)], [c[0] + sx * hx, c[1] + sy * (hy - ch), c[2] + sz * (hz - ch)], [c[0] + sx * (hx - ch), c[1] + sy * (hy - ch), c[2] + sz * hz]);
  }
  return hull(pts);
}

/** A box that is `bot` wide/deep at height y0 and `top` wide/deep at y1, with bevelled vertical edges. */
export function tbox(cx: number, cz: number, y0: number, y1: number, bot: [number, number], top: [number, number], ch: number): PolyMesh {
  const ring = (y: number, [w, d]: [number, number]): Vec3[] => {
    const hx = w / 2;
    const hz = d / 2;
    return [[cx - hx + ch, y, cz - hz], [cx + hx - ch, y, cz - hz], [cx + hx, y, cz - hz + ch], [cx + hx, y, cz + hz - ch], [cx + hx - ch, y, cz + hz], [cx - hx + ch, y, cz + hz], [cx - hx, y, cz + hz - ch], [cx - hx, y, cz - hz + ch]];
  };
  return hull([...ring(y0, bot), ...ring(y1, top)]);
}

/** The skeleton of the chunky characters, in metres. */
export const J: BodyJoints = {
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

export const HC: Vec3 = [0, 1.2, 0];
export const ringH = (y: number, rx: number, rz: number, cz = 0): Vec3[] => ringPts([0, y, cz], [0, 1, 0], rx, rz, 12, Math.PI / 12);

/** The colours of the face. */
export interface FacePalette {
  skin: string;
  neck: string;
  ear: string;
  eyeWhite: string;
  iris: string;
  irisGlow: string;
  pupil: string;
  lid: string;
  brow: string;
  blush: string;
  nose: string;
  mouth: string;
}

type P2 = [number, number];
// outlines for the left eye (x > 0), in ray units around the head centre; the right eye is the mirror image
const EYE: P2[] = [[0.2, -0.04], [0.235, 0.0], [0.3, 0.04], [0.36, 0.0], [0.4, -0.08], [0.38, -0.2], [0.33, -0.27], [0.27, -0.29], [0.21, -0.25], [0.19, -0.15]];
const IRIS: P2[] = [[0.22, -0.045], [0.285, -0.02], [0.345, -0.03], [0.375, -0.1], [0.37, -0.2], [0.33, -0.265], [0.275, -0.275], [0.225, -0.24], [0.205, -0.15]];
const GLOW: P2[] = [[0.23, -0.2], [0.275, -0.17], [0.33, -0.18], [0.368, -0.2], [0.33, -0.265], [0.275, -0.275], [0.235, -0.245]];
const LID: P2[] = [[0.185, -0.05], [0.225, 0.02], [0.3, 0.06], [0.375, 0.01], [0.42, -0.08], [0.395, -0.07], [0.355, -0.03], [0.3, 0.03], [0.24, -0.01], [0.205, -0.07]];
const BROW: P2[] = [[0.19, 0.06], [0.28, 0.1], [0.38, 0.08], [0.4, 0.115], [0.28, 0.145], [0.19, 0.105]];
const PUPIL: P2[] = [[0.275, -0.1], [0.315, -0.1], [0.325, -0.19], [0.295, -0.215], [0.268, -0.19]];
const SPARK: P2[] = [[0.318, -0.045], [0.348, -0.05], [0.352, -0.085], [0.32, -0.085]];
// a man's upper lid: thicker and without the lash wing at the outer corner
const LID_M: P2[] = [[0.19, -0.05], [0.23, 0.015], [0.3, 0.05], [0.37, 0.015], [0.4, -0.055], [0.385, -0.06], [0.35, -0.02], [0.3, 0.02], [0.24, -0.015], [0.205, -0.065]];
// the eyes and brows are drawn small; blow them up around the middle of the eye
const BIG = 2.5;
const BIGX = 2.9;
const plain = (pts: P2[], s: 1 | -1): P2[] => pts.map(([x, y]) => [s * x, y] as P2);

/** How the face is drawn; the defaults give the girls' face, other values make a man's. */
export interface FaceStyle {
  /** Size of the eyes (1 = the girls' big eyes). */
  eye?: number;
  /** Thickness of the brows (1 = thin). */
  browThick?: number;
  /** How far the inner end of each brow is pulled down toward the nose. */
  browSlant?: number;
  /** The wing of the upper lid (the girls' lash); off for a man. */
  lash?: boolean;
  /** Soft blush on the cheeks. */
  blush?: boolean;
  /** Width of the jaw and chin (1 = soft and small). */
  jaw?: number;
  /** Width of the neck. */
  neck?: number;
  /** A larger nose and a flat, wide mouth. */
  man?: boolean;
  /** A colour for a light shadow of stubble over the jaw and chin (off when not set). */
  stubble?: string;
}

/**
 * The round head, the neck, the face and the ears. The face is a set of flat stickers shot onto the head from the front,
 * so it reads the same from every side. Returns the head mesh, which the hair lies on.
 */
export function chibiHead(add: Add, step: number, c: FacePalette, style: FaceStyle = {}): PolyMesh {
  const o = { eye: 1, browThick: 1, browSlant: 0, lash: true, blush: true, jaw: 1, neck: 1, man: false, ...style };
  const big = BIG * o.eye;
  const bigx = BIGX * o.eye;
  const mirrorX = (pts: P2[], s: 1 | -1): P2[] => pts.map(([x, y]) => [s * (0.57 + (x - 0.29) * bigx), -0.06 + (y + 0.15) * big] as P2);
  const brow = (s: 1 | -1): P2[] => mirrorX(BROW.map(([x, y]) => [x, 0.1 + (y - 0.1) * o.browThick - (o.browSlant * (0.4 - x)) / 0.21] as P2), s);
  const j = o.jaw;
  const head = hull([...ringH(1.075, 0.07 * j, 0.06, 0.02), ...ringH(1.105, 0.112 * j, 0.092, 0.012), ...ringH(1.15, 0.134 * (1 + (j - 1) * 0.6), 0.115, 0.005), ...ringH(1.21, 0.142, 0.125), ...ringH(1.28, 0.132, 0.118), ...ringH(1.33, 0.1, 0.092), ...ringH(1.358, 0.06, 0.06)]);
  add(step, 'Head', head, c.skin);
  add(step, 'Neck', tubeHull([0, 1.0, 0], [0, 1.13, 0.005], 0.052 * o.neck, 0.048 * o.neck, 8, 0), c.neck);
  const hit = (px: number, py: number) => onSurface(head, HC, [px, py, 1], 0);
  const sticker = (name: string, color: string, pts: P2[], lift: number, thick = 0.0016) => add(step, name, decalBy(head, pts, ([u, w]) => hit(u, w), lift, thick, 0.03), color);
  for (const s of sides) {
    const n = nameOf(s);
    sticker(`Eye White ${n}`, c.eyeWhite, mirrorX(EYE, s), 0.001);
    sticker(`Iris ${n}`, c.iris, mirrorX(IRIS, s), 0.0026);
    sticker(`Iris Glow ${n}`, c.irisGlow, mirrorX(GLOW, s), 0.0042);
    sticker(`Pupil ${n}`, c.pupil, mirrorX(PUPIL, s), 0.0058);
    sticker(`Eye Highlight ${n}`, '#ffffff', mirrorX(SPARK, s), 0.0074);
    sticker(`Eye Lid ${n}`, c.lid, mirrorX(o.lash ? LID : LID_M, s), 0.0074);
    sticker(`Eyebrow ${n}`, c.brow, brow(s), 0.0022);
    if (o.blush) sticker(`Blush ${n}`, c.blush, plain([[0.5, -0.62], [0.72, -0.6], [0.78, -0.67], [0.64, -0.72], [0.5, -0.69]], s), 0.0012);
  }
  sticker('Nose', c.nose, o.man ? [[-0.05, -0.5], [0.06, -0.5], [0.0, -0.62]] : [[-0.03, -0.54], [0.04, -0.54], [0.0, -0.6]], 0.002);
  if (o.stubble) sticker('Stubble', o.stubble, [[-0.42, -0.66], [-0.2, -0.72], [0, -0.73], [0.2, -0.72], [0.42, -0.66], [0.44, -0.86], [0.3, -0.99], [0, -1.04], [-0.3, -0.99], [-0.44, -0.86]], 0.0004, 0.0006);
  sticker('Mouth', c.mouth, o.man ? [[-0.14, -0.79], [0.14, -0.79], [0.135, -0.825], [0, -0.835], [-0.135, -0.825]] : [[-0.12, -0.78], [0.12, -0.78], [0.1, -0.83], [0, -0.855], [-0.1, -0.83]], 0.0022);
  for (const s of sides) add(step, `Ear ${nameOf(s)}`, cbox([s * 0.147, 1.15, -0.008], [0.028, 0.058, 0.05], 0.01), c.ear);
  return head;
}

/** The colours of the bob. */
export interface HairPalette {
  a: string;
  b: string;
  c: string;
  d: string;
  shine: string;
}

/**
 * The layered bob: a round crown and a full back, two layers of bang strands fanning from a side parting, two locks on
 * each side of the face, curled bob ends and soft shine streaks. Returns the crown, which hats and bands lie on.
 */
export function chibiHair(add: Add, step: number, c: HairPalette): PolyMesh {
  const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
  const HAIR_A = c.a;
  const HAIR_B = c.b;
  const HAIR_C = c.c;
  const HAIR_D = c.d;
  const HAIR_SHINE = c.shine;
  /** A thin tapered strand through points [x, y, z, across, deep]. */
  const strand = (name: string, pts: [number, number, number, number, number][], color: string) =>
    add(step, name, sweep(pts.map(([x, y, z, a, d]) => R([x, y, z], [a, d])), { sides: 6, end: 'dome' }), color);
  const crownMesh = blob([0, 1.285, -0.03], [0.168, 0.14, 0.158], 16);
  add(step, 'Hair Crown', crownMesh, HAIR_A);
  add(step, 'Hair Crown Light', blob([0.01, 1.33, -0.02], [0.12, 0.09, 0.115], 12), HAIR_C);
  add(step, 'Hair Back', blob([0, 1.15, -0.07], [0.168, 0.15, 0.128], 14), HAIR_B);
  // two soft shine streaks across the crown
  for (const [i, d] of [[0.5, 0.95], [-0.15, 0.7]].entries()) {
    add(step, `Hair Shine ${i + 1}`, ribbon(crownMesh, [{ from: [0, 1.285, -0.03], dir: [d[0], 0.7, 0.9] }, { from: [0, 1.285, -0.03], dir: [d[0] * 0.8, 1.0, 0.45] }, { from: [0, 1.285, -0.03], dir: [d[0] * 0.7, 1.0, -0.05] }, { from: [0, 1.285, -0.03], dir: [d[0] * 0.7, 0.8, -0.6] }], [0.02, 0.007], 0.002, { sides: 5, taper: 0.5 }), HAIR_SHINE);
  }
  // the side parting is at x = 0.07; strands to the left of it sweep long, to the right they fall short
  const fan = (name: string, x0: number, xt: number, yt: number, color: string, long: boolean) =>
    strand(name, [[x0 * 0.7 + 0.03, 1.415, 0.0, 0.03, 0.02], [x0 * 0.95 + 0.02, 1.375, 0.085, 0.032, 0.015], [(x0 + xt) / 2, (1.375 + yt) / 2 + 0.004, 0.125 + (long ? 0.004 : 0), 0.027, 0.012], [xt, yt, 0.133, 0.006, 0.005]], color);
  // back layer: two longer, darker strands under the fringe
  [[-0.1, -0.125, 1.262], [0.07, 0.06, 1.265]].forEach(([x0, xt, yt], i) => fan(`Bang Back ${i + 1}`, x0, xt, yt, HAIR_D, true));
  // front layer: four broad strands that sweep to the left
  [[-0.09, -0.115, 1.288], [-0.035, -0.06, 1.278], [0.02, -0.005, 1.274], [0.075, 0.065, 1.284]].forEach(([x0, xt, yt], i) => fan(`Bang ${i + 1}`, x0, xt, yt, i % 2 ? HAIR_A : HAIR_C, false));
  for (const s of sides) {
    const n = nameOf(s);
    // the long lock in front of the ear: from the crown, down the cheek, curling in at the jaw
    strand(`Face Lock ${n}`, [[s * 0.125, 1.32, 0.05, 0.04, 0.025], [s * 0.15, 1.24, 0.1, 0.036, 0.02], [s * 0.152, 1.17, 0.113, 0.03, 0.017], [s * 0.14, 1.12, 0.12, 0.02, 0.012], [s * 0.115, 1.085, 0.118, 0.006, 0.006]], HAIR_C);
    // a thinner wisp beside it
    strand(`Face Wisp ${n}`, [[s * 0.108, 1.3, 0.085, 0.022, 0.012], [s * 0.128, 1.24, 0.118, 0.02, 0.01], [s * 0.126, 1.17, 0.128, 0.015, 0.008], [s * 0.112, 1.12, 0.128, 0.005, 0.005]], HAIR_A);
    // layered back strands that curl outward at the ends
    strand(`Bob End ${n}`, [[s * 0.125, 1.11, -0.06, 0.05, 0.03], [s * 0.14, 1.04, -0.085, 0.045, 0.026], [s * 0.162, 0.98, -0.085, 0.022, 0.014], [s * 0.185, 0.95, -0.07, 0.006, 0.006]], HAIR_B);
  }
  return crownMesh;
}
