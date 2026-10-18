import type { AssetDef, AssetPart } from '../assets';
import { signedVolume, type PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { applyStyle } from './kit';
import { blob, headBlob, onSurface, plate, ribbon, sweep, toPart, vadd, type Ring } from './organic';
import { humanSpec, type BodyJoints } from './rigs';
import { decal, oval } from './decal';

/**
 * A stylised school girl in a sailor uniform, T-pose: a big round head with large amber eyes, auburn hair with two
 * buns wrapped in blue bands and a long tail down the back, a white sailor top with a blue collar and a red tie, a
 * pleated blue skirt, white-topped blue knee socks and dark loafers. Smooth, soft shapes.
 * Left is +X, Right is -X, and she faces +Z.
 */

const SKIN = '#f8d9c4';
const SKIN_D = '#e9b298';
const BLUSH = '#f6c3b6';
const HAIR = '#b4573c';
const HAIR_L = '#d77b52';
const HAIR_D = '#8a3c2a';
const HAIR_DD = '#6e2e22';
const WHITE = '#f6f6f8';
const WHITE_D = '#dfe0e8';
const NAVY = '#3a55b8';
const NAVY_D = '#2c418f';
const SKIRT = '#4a66cc';
const SKIRT_D = '#3a52ad';
const RED = '#d9474b';
const RED_D = '#b2353a';
const SOCK = '#3d56b6';
const SHOE = '#2a2e45';
const IRIS = '#e8922b';
const IRIS_D = '#a8541a';
const IRIS_L = '#ffc867';
const PUPIL = '#2b140c';
const LASH_C = '#24150f';

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sides = [1, -1] as const;
const nameOf = (s: 1 | -1) => (s === 1 ? 'Left' : 'Right');

/** A pleated skirt: two rings of alternating outer and inner points (the folds), closed with a centre point at each end. */
function pleatedSkirt(top: Vec3, bottom: Vec3, rTop: [number, number], rBot: [number, number], folds: number, depthTop: number, depthBot: number): PolyMesh {
  const n = folds * 2;
  const ring = (c: Vec3, r: [number, number], d: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = i % 2 ? 1 - d : 1;
      out.push(c[0] + Math.sin(a) * r[0] * k, c[1], c[2] + Math.cos(a) * r[1] * k);
    }
    return out;
  };
  const v = [...ring(top, rTop, depthTop), ...ring(bottom, rBot, depthBot), ...top, ...bottom];
  const ct = 2 * n;
  const cb = 2 * n + 1;
  const f: number[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    f.push([i, j, n + j, n + i]);
    f.push([ct, j, i]);
    f.push([cb, n + i, n + j]);
  }
  const m: PolyMesh = { v, f };
  if (signedVolume(m) < 0) m.f = m.f.map((q) => [...q].reverse());
  return m;
}

// ---- the skeleton (T-pose), in metres ----
const J: BodyJoints = {
  hips: [0, 0.74, 0],
  spine: [0, 0.86, 0],
  chest: [0, 0.97, 0],
  neck: [0, 1.09, 0],
  head: [0, 1.15, 0.0],
  headTop: [0, 1.52, 0],
  shoulder: [0.118, 1.05, 0],
  elbow: [0.32, 1.055, -0.005],
  wrist: [0.49, 1.05, 0.0],
  fingers: [0.575, 1.045, 0.005],
  hip: [0.068, 0.72, 0],
  knee: [0.078, 0.37, 0.008],
  ankle: [0.085, 0.085, -0.005],
  toe: [0.085, 0.02, 0.1],
};
const M = (s: 1 | -1, p: Vec3): Vec3 => [s * p[0], p[1], p[2]];

// ---- body shapes first, so details can sit on them ----
const torso = sweep([R([0, 0.8, 0], [0.08, 0.062]), R([0, 0.86, 0.002], [0.1, 0.077]), R([0, 0.95, 0.006], [0.112, 0.085]), R([0, 1.01, 0.006], [0.112, 0.082]), R([0, 1.06, 0.004], [0.106, 0.072]), R([0, 1.09, 0.004], [0.06, 0.05])], { sides: 12 });
const HC: Vec3 = [0, 1.29, 0.01];
const head = headBlob(HC, [0.152, 0.158, 0.148], 16);
// a rounder, chubbier lower face with a small chin
for (let i = 0; i < head.v.length / 3; i++) {
  const dy = (head.v[i * 3 + 1] - HC[1]) / 0.158;
  if (dy < -0.35) {
    const k = 1 + (dy + 0.35) * 0.45;
    head.v[i * 3] = HC[0] + (head.v[i * 3] - HC[0]) * k;
  }
}

// ---- 0 legs, socks and shoes ----
for (const s of sides) {
  const n = nameOf(s);
  const hip = M(s, J.hip);
  const knee = M(s, J.knee);
  const ankle = M(s, J.ankle);
  const calf: Vec3 = [s * 0.082, 0.25, -0.004];
  add(toPart(0, `Leg ${n}`, sweep([R(vadd(hip, [0, 0.04, 0]), 0.05), R(hip, 0.048), R(lerp(hip, knee, 0.5), 0.042), R(knee, 0.034), R(calf, 0.036), R(lerp(calf, ankle, 0.6), 0.026), R(ankle, 0.024)], { sides: 10 }), SKIN));
  add(toPart(0, `Sock ${n}`, sweep([R([s * 0.079, 0.325, 0.004], 0.04), R(calf, 0.04), R(lerp(calf, ankle, 0.6), 0.03), R(ankle, 0.028), R([ankle[0], 0.05, ankle[2]], 0.03)], { sides: 10 }), SOCK));
  add(toPart(0, `Sock Fold ${n}`, sweep([R([s * 0.079, 0.318, 0.004], 0.043), R([s * 0.079, 0.352, 0.006], 0.042)], { sides: 10 }), WHITE));
  const x = ankle[0];
  add(toPart(0, `Shoe ${n}`, sweep([R([x, 0.032, -0.05], [0.031, 0.03]), R([x, 0.036, 0.0], [0.034, 0.035]), R([x, 0.03, 0.05], [0.034, 0.028]), R([x, 0.023, 0.095], [0.027, 0.02])], { sides: 10, start: 'dome', end: 'dome' }), SHOE));
  add(toPart(0, `Sole ${n}`, sweep([R([x, 0.008, -0.055], [0.031, 0.008]), R([x, 0.008, 0.0], [0.035, 0.008]), R([x, 0.008, 0.1], [0.027, 0.008])], { sides: 8, start: 'dome', end: 'dome' }), '#1b1d2b'));
  add(toPart(0, `Shoe Strap ${n}`, sweep([R([x, 0.052, 0.018], [0.036, 0.007]), R([x, 0.052, 0.036], [0.036, 0.007])], { sides: 8 }), '#3a3f5c'));
}

// ---- 1 skirt, sailor top, collar and tie ----
add(toPart(1, 'Skirt', pleatedSkirt([0, 0.845, 0], [0, 0.6, 0.01], [0.1, 0.08], [0.178, 0.152], 14, 0.04, 0.1), SKIRT));
add(toPart(1, 'Skirt Lining', pleatedSkirt([0, 0.825, 0], [0, 0.615, 0.008], [0.092, 0.074], [0.165, 0.14], 14, 0.03, 0.08), SKIRT_D));
add(toPart(1, 'Waistband', sweep([R([0, 0.83, 0], [0.104, 0.083]), R([0, 0.855, 0], [0.102, 0.081])], { sides: 14 }), SKIRT_D));
add(toPart(1, 'Hips', blob([0, 0.74, 0], [0.105, 0.09, 0.08], 10), SKIN));
add(toPart(1, 'Sailor Top', torso, WHITE));
add(toPart(1, 'Top Hem', sweep([R([0, 0.85, 0.002], [0.108, 0.084]), R([0, 0.872, 0.002], [0.104, 0.08])], { sides: 12 }), WHITE_D));
for (const s of sides) {
  const n = nameOf(s);
  // the front of the sailor collar: a blue band from the shoulder to the V at the chest, with a white stripe
  const pts = [{ from: [s * 0.058, 1.07, 0] as Vec3, dir: [s * 0.4, 0.3, 1] as Vec3 }, { from: [s * 0.045, 1.02, 0] as Vec3, dir: [s * 0.2, 0, 1] as Vec3 }, { from: [s * 0.012, 0.955, 0] as Vec3, dir: [0, 0, 1] as Vec3 }];
  add(toPart(1, `Collar ${n}`, ribbon(torso, pts, [0.05, 0.007], 0.004, { sides: 4 }), NAVY));
  add(toPart(1, `Collar Stripe ${n}`, ribbon(torso, pts.map((p) => ({ from: [p.from[0] + s * 0.014, p.from[1], 0] as Vec3, dir: p.dir })), [0.005, 0.004], 0.011, { sides: 4 }), WHITE));
}
add(plate(1, 'Collar Back', torso, [0, 1.0, 0], [0, 0.15, -1], 0.2, 0.12, 0.012, NAVY));
add(plate(1, 'Collar Back Stripe', torso, [0, 0.95, 0], [0, 0.1, -1], 0.18, 0.012, 0.008, WHITE, 0.012));
add(plate(1, 'Chest Badge', torso, [0.05, 0.99, 0], [0.25, 0, 1], 0.03, 0.012, 0.006, NAVY_D));
// the red tie: a knot and two tails
const knot = onSurface(torso, [0, 0.965, 0], [0, 0, 1], 0.012).p;
add(toPart(1, 'Tie Knot', blob(knot, [0.022, 0.018, 0.014], 7), RED_D));
add(toPart(1, 'Tie Tail Left', sweep([R(vadd(knot, [0.004, -0.01, 0.002]), [0.02, 0.006]), R(vadd(knot, [0.012, -0.08, 0.008]), [0.022, 0.006]), R(vadd(knot, [0.018, -0.15, 0.006]), [0.012, 0.005])], { sides: 4, end: 'dome' }), RED));
add(toPart(1, 'Tie Tail Right', sweep([R(vadd(knot, [-0.004, -0.01, 0.002]), [0.02, 0.006]), R(vadd(knot, [-0.008, -0.075, 0.01]), [0.02, 0.006]), R(vadd(knot, [-0.01, -0.135, 0.009]), [0.011, 0.005])], { sides: 4, end: 'dome' }), RED_D));

// ---- 2 arms and sleeves (T-pose) ----
for (const s of sides) {
  const n = nameOf(s);
  const sh = M(s, J.shoulder);
  const el = M(s, J.elbow);
  const wr = M(s, J.wrist);
  const fi = M(s, J.fingers);
  add(toPart(2, `Shoulder ${n}`, blob(sh, [0.045, 0.045, 0.045], 8), WHITE));
  add(toPart(2, `Sleeve ${n}`, sweep([R(vadd(sh, [-s * 0.02, 0, 0]), 0.05), R(vadd(sh, [s * 0.05, 0, 0]), 0.052), R(vadd(sh, [s * 0.1, -0.002, 0]), 0.05)], { sides: 10 }), WHITE));
  add(toPart(2, `Sleeve Cuff ${n}`, sweep([R(vadd(sh, [s * 0.098, -0.002, 0]), 0.052), R(vadd(sh, [s * 0.118, -0.002, 0]), 0.051)], { sides: 10 }), NAVY));
  add(toPart(2, `Sleeve Cuff Stripe ${n}`, sweep([R(vadd(sh, [s * 0.103, -0.002, 0]), 0.0535), R(vadd(sh, [s * 0.108, -0.002, 0]), 0.0535)], { sides: 10 }), WHITE));
  add(toPart(2, `Arm ${n}`, sweep([R(vadd(sh, [s * 0.09, 0, 0]), 0.034), R(el, 0.028), R(lerp(el, wr, 0.4), 0.029), R(wr, 0.022)], { sides: 10 }), SKIN));
  add(toPart(2, `Hand ${n}`, sweep([R(wr, [0.024, 0.016]), R(lerp(wr, fi, 0.45), [0.03, 0.013]), R(fi, [0.024, 0.01])], { sides: 8, end: 'dome' }), SKIN));
  add(toPart(2, `Thumb ${n}`, sweep([R(lerp(wr, fi, 0.15), 0.01), R(vadd(lerp(wr, fi, 0.4), [0, 0.004, 0.026]), 0.007)], { sides: 6, end: 'dome' }), SKIN_D));
}
add(toPart(2, 'Neck', sweep([R([0, 1.06, 0.002], 0.034), R([0, 1.16, 0.006], 0.032)], { sides: 10 }), SKIN));

// ---- 3 head and face ----
add(toPart(3, 'Head', head, SKIN));
// anime face: flat shapes pressed onto the head like stickers, layered from the skin outward
type P2 = [number, number];
const EYE_WHITE: P2[] = [[-0.2, -0.02], [-0.15, 0.17], [0, 0.235], [0.15, 0.2], [0.22, 0.05], [0.17, -0.17], [0, -0.235], [-0.14, -0.18]];
const LASH: P2[] = [[-0.215, -0.005], [-0.17, 0.215], [0, 0.295], [0.17, 0.26], [0.27, 0.13], [0.345, 0.175], [0.25, 0.035], [0.15, 0.2], [0, 0.235], [-0.15, 0.17]];
const LOWER_LASH: P2[] = [[0.03, -0.24], [0.16, -0.18], [0.215, -0.09], [0.195, -0.09], [0.145, -0.165], [0.025, -0.215]];
const BROW: P2[] = [[-0.17, 0.53], [0, 0.59], [0.19, 0.55], [0.19, 0.572], [0, 0.612], [-0.17, 0.552]];
const IRIS_C: P2 = [-0.025, -0.02];
const E = 1.22; // eye scale
const sc = (pts: P2[]): P2[] => pts.map(([x, y]) => [x * E, y * E]);
const half = (pts: P2[], above: boolean, cut: number): P2[] => {
  const keep = pts.filter(([, y]) => (above ? y >= cut : y <= cut));
  return keep.length >= 3 ? keep : pts;
};
for (const s of sides) {
  const n = nameOf(s);
  const c: P2 = [s * 0.58, -0.25];
  const d = (name: string, pts: P2[], lift: number, color: string) => add(toPart(3, `${name} ${n}`, decal(head, HC, c, pts, lift, 0.002, s), color));
  d('Eye White', sc(EYE_WHITE), 0.001, '#ffffff');
  const iris = sc(oval(IRIS_C[0], IRIS_C[1], 0.135, 0.2, 18));
  d('Iris', iris, 0.0032, IRIS);
  d('Iris Dark', half(iris, true, 0.05 * E), 0.0054, IRIS_D);
  d('Iris Glow', half(sc(oval(IRIS_C[0], IRIS_C[1] - 0.02, 0.1, 0.16, 16)), false, -0.1 * E), 0.0054, IRIS_L);
  d('Pupil', sc(oval(IRIS_C[0], IRIS_C[1] + 0.01, 0.055, 0.1, 12)), 0.0076, PUPIL);
  d('Eye Highlight', sc(oval(IRIS_C[0] + 0.05, IRIS_C[1] + 0.09, 0.045, 0.05, 10)), 0.0098, '#ffffff');
  d('Eye Sparkle', sc(oval(IRIS_C[0] - 0.06, IRIS_C[1] - 0.11, 0.022, 0.022, 8)), 0.0098, '#ffffff');
  d('Upper Lash', sc(LASH), 0.0098, LASH_C);
  d('Lower Lash', sc(LOWER_LASH), 0.004, '#7a4638');
  d('Eyebrow', BROW, 0.003, HAIR);
  add(toPart(3, `Blush ${n}`, decal(head, HC, [s * 0.64, -0.64], oval(0, 0, 0.14, 0.06, 14), 0.0012, 0.0015, s), BLUSH));
  for (let k = 0; k < 3; k++) {
    const x = -0.06 + k * 0.06;
    add(toPart(3, `Blush Line ${n} ${k + 1}`, decal(head, HC, [s * 0.64, -0.64], [[x - 0.012, -0.03], [x + 0.008, 0.03], [x + 0.022, 0.03], [x + 0.002, -0.03]], 0.0028, 0.0012, s), '#e98a86'));
  }
  add(toPart(3, `Ear ${n}`, blob(onSurface(head, HC, [s, -0.1, -0.1], -0.012).p, [0.02, 0.034, 0.026], 8), SKIN));
}
add(toPart(3, 'Nose', decal(head, HC, [0.03, -0.42], [[-0.018, 0.02], [0.022, -0.035], [-0.02, -0.025]], 0.002, 0.002), SKIN_D));
add(toPart(3, 'Mouth', decal(head, HC, [0, -0.66], [[-0.1, 0.01], [-0.05, -0.03], [0, -0.04], [0.05, -0.03], [0.1, 0.01], [0.095, 0.025], [0.05, -0.008], [0, -0.016], [-0.05, -0.008], [-0.095, 0.025]], 0.002, 0.002), '#b6514c'));
add(toPart(3, 'Mouth Inside', decal(head, HC, [0, -0.68], oval(0, 0, 0.04, 0.022, 10), 0.0012, 0.0016), '#e57c76'));

// ---- 4 hair, buns and the long tail ----
const H = (v: Vec3): Vec3 => [HC[0] + v[0], HC[1] + v[1], HC[2] + v[2]];
const crown = blob(H([0, 0.06, -0.015]), [0.168, 0.135, 0.168], 18);
add(toPart(4, 'Hair Crown', crown, HAIR));
add(toPart(4, 'Hair Back', blob(H([0, -0.04, -0.085]), [0.158, 0.15, 0.12], 16), HAIR_D));
add(toPart(4, 'Hair Nape', blob(H([0, -0.15, -0.08]), [0.11, 0.07, 0.07], 10), HAIR_DD));
// straight bangs: smooth strands laid just in front of the forehead, following the head's curve
const front = (x: number, y: number, lift: number): Vec3 => {
  const rx = 0.152;
  const ry = 0.158;
  const rz = 0.148;
  const q = 1 - (x / rx) ** 2 - ((y - HC[1]) / ry) ** 2;
  return [x, y, HC[2] + rz * Math.sqrt(Math.max(0.02, q)) + lift];
};
const BANGS: [number, number, string][] = [[-0.128, 0.0, HAIR], [-0.096, 0.014, HAIR], [-0.062, 0.02, HAIR_L], [-0.026, 0.016, HAIR], [0.01, 0.018, HAIR], [0.046, 0.022, HAIR_L], [0.082, 0.016, HAIR], [0.116, 0.002, HAIR_D]];
BANGS.forEach(([x, tip, c], i) => {
  const path = [R(front(x * 0.75, HC[1] + 0.14, 0.016), [0.03, 0.01]), R(front(x * 0.9, HC[1] + 0.1, 0.015), [0.03, 0.01]), R(front(x * 0.97, HC[1] + (0.1 + tip) / 2, 0.013), [0.022, 0.009]), R(front(x, HC[1] + tip, 0.012), [0.008, 0.005])];
  add(toPart(4, `Bang ${i + 1}`, sweep(path, { sides: 8, end: 'dome' }), c));
});
for (const s of sides) {
  const n = nameOf(s);
  add(toPart(4, `Side Lock ${n}`, sweep([R(H([s * 0.135, 0.05, 0.06]), [0.035, 0.028]), R(H([s * 0.148, -0.03, 0.07]), [0.03, 0.02]), R(H([s * 0.145, -0.1, 0.07]), [0.016, 0.012]), R(H([s * 0.138, -0.13, 0.066]), [0.005, 0.004])], { sides: 10, end: 'dome' }), HAIR));
  add(toPart(4, `Side Lock Back ${n}`, sweep([R(H([s * 0.145, 0.03, -0.04]), [0.036, 0.03]), R(H([s * 0.15, -0.05, -0.05]), [0.03, 0.022]), R(H([s * 0.135, -0.12, -0.055]), [0.006, 0.005])], { sides: 10, end: 'dome' }), HAIR));
  // a bun on each side of the top, with a tilted blue cuff around its lower half
  const bun = H([s * 0.118, 0.142, -0.03]);
  const ax: Vec3 = [s * 0.7, 1, 0.15];
  const al = Math.hypot(ax[0], ax[1]);
  const along = (t: number): Vec3 => vadd(bun, [(ax[0] / al) * t, (ax[1] / al) * t, 0]);
  add(toPart(4, `Bun ${n}`, blob(along(0.02), [0.06, 0.058, 0.06], 14), HAIR));
  add(toPart(4, `Bun Band ${n}`, sweep([R(along(-0.04), 0.06), R(along(-0.005), 0.068), R(along(0.03), 0.066)], { sides: 16 }), NAVY));
  add(toPart(4, `Bun Band Rim ${n}`, sweep([R(along(-0.034), 0.064), R(along(-0.024), 0.066)], { sides: 16 }), NAVY_D));
}
// shine on top of the hair
[-0.25, 0.2].forEach((dx, i) => add(toPart(4, `Hair Shine ${i + 1}`, ribbon(crown, [0, 1, 2].map((k) => ({ from: H([0, 0.035, -0.012]), dir: [dx, 1 - k * 0.15, 0.4 + k * 0.4] as Vec3 })), [0.012, 0.004], 0.003, { sides: 4, taper: 0.6 }), '#d98559')));
// the braid behind the left ear turns into a long flat tail down the back
const braidPath: Vec3[] = [H([0.11, -0.07, -0.1]), H([0.13, -0.13, -0.12]), H([0.14, -0.19, -0.13]), H([0.145, -0.25, -0.14]), H([0.15, -0.31, -0.15])];
braidPath.forEach((p, i) => add(toPart(4, `Braid ${i + 1}`, blob(p, [0.024, 0.032, 0.022], 8), i % 2 ? HAIR_D : HAIR)));
add(toPart(4, 'Tail', sweep([R(braidPath[4], [0.02, 0.016]), R([0.17, 0.88, -0.19], [0.032, 0.014]), R([0.21, 0.7, -0.23], [0.058, 0.014]), R([0.245, 0.54, -0.25], [0.06, 0.013]), R([0.265, 0.42, -0.25], [0.008, 0.006])], { sides: 10, end: 'dome' }), HAIR_D));

/** Turn a finished part around a vertical axis through `pivot` (degrees; negative turns toward her right). */
function turned(p: AssetPart, pivot: Vec3, deg: number): AssetPart {
  const m = p.mesh!();
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const v: number[] = [];
  for (let i = 0; i < m.v.length / 3; i++) {
    const x = p.pos[0] + m.v[i * 3] * p.size[0] - pivot[0];
    const y = p.pos[1] + m.v[i * 3 + 1] * p.size[1];
    const z = p.pos[2] + m.v[i * 3 + 2] * p.size[2] - pivot[2];
    v.push(pivot[0] + x * c + z * sn, y, pivot[2] - x * sn + z * c);
  }
  return toPart(p.step, p.name, { v, f: m.f }, p.color);
}
const HEAD_TURN = 0;
for (let i = 0; i < parts.length; i++) {
  const p = parts[i];
  if ((p.step === 3 || p.step === 4) && p.name !== 'Tail' && p.mesh) parts[i] = turned(p, [0, 1.13, 0], HEAD_TURN);
}

applyStyle(parts, [
  [/^(Skirt|Skirt Lining)$/, { paint: 0.25 }],
  [/^(Eye White|Iris|Pupil|Eye Highlight|Eye Sparkle|Upper Lash|Lower Lash|Eyebrow|Mouth|Nose|Blush)/, { smooth: true }],
  [/^(Head|Neck|Ear|Leg|Arm|Hand|Thumb|Hips)/, { smooth: true, paint: 0.2 }],
  [/^(Hair|Bang|Side Lock|Bun|Braid|Tail)/, { smooth: true, paint: 0.35 }],
  [/^(Sailor Top|Top Hem|Shoulder|Sleeve|Sock|Shoe|Sole|Waistband|Tie|Collar)/, { smooth: true, paint: 0.15 }],
]);

export const SCHOOL: AssetDef = {
  id: 'school',
  rig: () => humanSpec(J),
  name: 'School Girl',
  tagline: 'A stylised school girl in a sailor uniform: big amber eyes, buns in blue bands and a long tail',
  level: 'Detailed',
  thumb: { dir: [0.6, 0.15, 1], zoom: 0.8 },
  learn: ['Shape a big round head with large layered eyes', 'Make a pleated skirt from two rings of folds', 'Dress a figure in a sailor collar, tie and cuffs', 'Wrap hair buns in bands and let a braid turn into a long tail'],
  steps: [
    { title: 'Legs, socks and shoes', text: 'Each leg is one smooth tube with a small calf. Blue knee socks are a slightly wider tube with a white folded top. The loafers are rounded shapes with a dark sole and a strap across the top. Build one side and duplicate it.', tools: ['Shape: Cylinder', 'Edit shape: move points', 'Duplicate Ctrl+D'] },
    { title: 'Skirt, top, collar and tie', text: 'The pleated skirt is two rings of points, every other point pushed inward so the cloth folds. The white sailor top narrows at the waist; a blue collar with a white stripe runs from the shoulders to a V on the chest and covers the back. A red tie hangs from the V.', tools: ['Edit shape: move points', 'Thin strips', 'Color palette'] },
    { title: 'Arms and sleeves', text: 'The arms stretch out to the sides in a T-pose. Short white sleeves end in a blue cuff with a white stripe. Slim forearms finish in small rounded hands with a thumb.', tools: ['Shape: Cylinder', 'Rotate (E)', 'Mirror ideas: duplicate and move'] },
    { title: 'Head and face', text: 'The head is a big round sphere with a small chin. Each eye is a stack of layers: a white base, an amber iris, a darker top, a bright lower glow, a dark pupil and two highlights, under a thick dark lash. A tiny nose, a small mouth, soft blush and ears finish the face.', tools: ['Shape: Sphere', 'Thin strips for lashes', 'Color palette'] },
    { title: 'Hair, buns and tail', text: 'The auburn hair is a crown over the head with straight bangs across the forehead and locks beside the cheeks. Two buns sit on top, each wrapped in a blue band. Behind the left ear a braid of small balls turns into a long flat tail that hangs down to the knees.', tools: ['Thin tapered strips', 'Shape: Sphere', 'Shape: Cylinder'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: she bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Make a summer version: turn the skirt red, the collar and bands white with red stripes, swap the knee socks for short white ones and give her a straw hat made of two Cylinders.',
  parts,
};
