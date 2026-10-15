import type { Joint, Vec3 } from './types';

/**
 * Automatic skin weights: which joints pull on which points of the model, and how much.
 * A bone is the stretch from a joint to a child joint, and it is moved by the joint it starts from. A point near the
 * middle of a bone follows that joint alone; near a joint it follows both neighbours, so elbows and knees bend smoothly.
 */
export interface Skin {
  /** Four joint indexes per point. */
  index: Uint16Array;
  /** Four weights per point (they add up to 1). */
  weight: Float32Array;
}

function segDist(p: Vec3, a: Vec3, b: Vec3): number {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const l2 = abx * abx + aby * aby + abz * abz;
  const t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby + (p[2] - a[2]) * abz) / l2));
  return Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t, p[2] - a[2] - abz * t);
}

/** The distance from a point to the nearest bone that joint `i` moves. */
function boneReach(joints: Joint[], kids: number[][], i: number, p: Vec3): number {
  if (!kids[i].length) return Math.hypot(p[0] - joints[i].pos[0], p[1] - joints[i].pos[1], p[2] - joints[i].pos[2]); // a tip: just the joint
  let d = Infinity;
  for (const c of kids[i]) d = Math.min(d, segDist(p, joints[i].pos, joints[c].pos));
  return d;
}

export function childIndexes(joints: Joint[]): number[][] {
  const at = new Map(joints.map((j, i) => [j.id, i]));
  const kids: number[][] = joints.map(() => []);
  joints.forEach((j, i) => {
    const pi = j.parent ? at.get(j.parent) : undefined;
    if (pi !== undefined) kids[pi].push(i);
  });
  return kids;
}

/**
 * @param points world-space xyz triples
 * @param rigid  true: the whole piece follows ONE joint (a helmet, a pouch). false: it bends with the skeleton (a limb).
 */
export function skinWeights(points: ArrayLike<number>, joints: Joint[], rigid: boolean, sharpness = 4): Skin {
  const n = points.length / 3;
  const index = new Uint16Array(n * 4);
  const weight = new Float32Array(n * 4);
  if (!joints.length) return { index, weight };
  const kids = childIndexes(joints);
  const scratch = joints.map(() => 0);
  const score = (p: Vec3) => {
    for (let i = 0; i < joints.length; i++) scratch[i] = boneReach(joints, kids, i, p);
  };
  if (rigid) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += points[i * 3];
      cy += points[i * 3 + 1];
      cz += points[i * 3 + 2];
    }
    score([cx / n, cy / n, cz / n]);
    let best = 0;
    for (let i = 1; i < joints.length; i++) if (scratch[i] < scratch[best]) best = i;
    for (let i = 0; i < n; i++) {
      index[i * 4] = best;
      weight[i * 4] = 1;
    }
    return { index, weight };
  }
  const order = joints.map((_, i) => i);
  for (let v = 0; v < n; v++) {
    score([points[v * 3], points[v * 3 + 1], points[v * 3 + 2]]);
    order.sort((a, b) => scratch[a] - scratch[b]);
    let sum = 0;
    const w: number[] = [];
    const take = Math.min(4, joints.length);
    for (let k = 0; k < take; k++) {
      const x = 1 / (Math.pow(scratch[order[k]], sharpness) + 1e-7);
      w.push(x);
      sum += x;
    }
    for (let k = 0; k < take; k++) {
      index[v * 4 + k] = order[k];
      weight[v * 4 + k] = w[k] / sum;
    }
  }
  return { index, weight };
}
