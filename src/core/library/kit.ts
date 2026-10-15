import * as THREE from 'three';
import type { AssetPart } from '../assets';
import { mergeVerts, polyMeshFor, type PolyMesh } from '../mesh';
import type { ShapeType, Vec3 } from '../types';

/**
 * Building blocks for the library assets. Everything here only uses what the editor itself offers: shapes with few
 * sides, the cylinder's Top size, flattened spheres, and shapes reshaped with Edit shape.
 * Left is +x, Right is -x; things face +z.
 */

export const FLIP = 180;
export const D2R = Math.PI / 180;

// ---------- shapes made with Edit shape (unit-sized, then scaled by `size`) ----------

/** A box with its own bottom and top size, the top optionally shifted in z or x. */
export function frustum(bx: number, bz: number, tx: number, tz: number, dz = 0, dx = 0): PolyMesh {
  const m = polyMeshFor('box', { segments: 1, taper: 1 });
  for (let i = 0; i < m.v.length / 3; i++) {
    const top = m.v[i * 3 + 1] > 0;
    m.v[i * 3] = m.v[i * 3] * (top ? tx : bx) + (top ? dx : 0);
    m.v[i * 3 + 2] = m.v[i * 3 + 2] * (top ? tz : bz) + (top ? dz : 0);
  }
  return m;
}

/** A boot foot: a box whose toe slopes down. */
export function wedge(drop = 0.12): PolyMesh {
  const m = polyMeshFor('box', { segments: 1, taper: 1 });
  for (let i = 0; i < m.v.length / 3; i++) if (m.v[i * 3 + 1] > 0 && m.v[i * 3 + 2] > 0) m.v[i * 3 + 1] = -drop;
  return m;
}

/** A head: a low-poly sphere with a narrower, slightly pointed jaw. */
export function headMesh(): PolyMesh {
  const m = polyMeshFor('sphere', { segments: 8, taper: 1 });
  for (let i = 0; i < m.v.length / 3; i++) {
    const y = m.v[i * 3 + 1];
    if (y < 0.08) {
      m.v[i * 3] *= 1 + y * 0.75;
      m.v[i * 3 + 2] *= 0.96 + y * 0.12;
    }
  }
  return m;
}

/** A roof: a box whose top collapses into a ridge along X (made with Merge points). */
export function gable(): PolyMesh {
  const m = polyMeshFor('box', { segments: 1, taper: 1 });
  for (const side of [-1, 1]) {
    const ids = new Set<number>();
    for (let i = 0; i < m.v.length / 3; i++) if (m.v[i * 3 + 1] > 0 && Math.sign(m.v[i * 3]) === side) ids.add(i);
    mergeVerts(m, ids);
  }
  return m;
}

// ---------- part helpers ----------

type Opt = Partial<AssetPart>;
export const part = (step: number, name: string, shape: ShapeType, pos: Vec3, size: Vec3, color: string, o: Opt = {}): AssetPart => ({ step, name, shape, pos, size, color, ...o });
export const box = (step: number, name: string, pos: Vec3, size: Vec3, color: string, o: Opt = {}) => part(step, name, 'box', pos, size, color, o);
export const ball = (step: number, name: string, pos: Vec3, size: Vec3, color: string, segments = 6, o: Opt = {}) => part(step, name, 'sphere', pos, size, color, { segments, ...o });
export const tube = (step: number, name: string, pos: Vec3, size: Vec3, color: string, segments = 6, o: Opt = {}) => part(step, name, 'cylinder', pos, size, color, { segments, ...o });

/** Left (+x) and right (-x) versions of a part. The builder gets the side (+1 / -1) and the finished name. */
export const LR = (base: string, build: (s: 1 | -1, name: string) => AssetPart): AssetPart[] => [build(1, `${base} Left`), build(-1, `${base} Right`)];

/** Rotation [x, y, z] in degrees, mirrored for the right side. */
export const mirrorRot = (s: 1 | -1, r: Vec3): Vec3 => [r[0], s * r[1], s * r[2]];

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

/** Euler angles (degrees) that turn the y axis toward the direction from a to b. */
export function aim(a: Vec3, b: Vec3): { rot: Vec3; length: number; mid: Vec3 } {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const length = d.length();
  _q.setFromUnitVectors(UP, d.normalize());
  _e.setFromQuaternion(_q, 'XYZ');
  const r = (n: number) => Math.round(n * 100) / 100;
  return { rot: [r(_e.x / D2R), r(_e.y / D2R), r(_e.z / D2R)], length, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] };
}

/** A tapered cylinder running from point a (width wa) to point b (width wb): arms, legs, handles, antennas. */
export function limb(step: number, name: string, a: Vec3, b: Vec3, wa: number, wb: number, color: string, segments = 6): AssetPart {
  if (wb > wa) return limb(step, name, b, a, wb, wa, color, segments);
  const { rot, length, mid } = aim(a, b);
  return tube(step, name, mid, [wa, length, wa], color, segments, { taper: Math.round((wb / wa) * 1000) / 1000, rot });
}

/** A thin ring around a limb: cuffs, socks stripes, bracers. `t` is how far along a→b it sits. */
export function band(step: number, name: string, a: Vec3, b: Vec3, t: number, thick: number, width: number, color: string, segments = 6): AssetPart {
  const { rot } = aim(a, b);
  const p: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  return tube(step, name, p, [width, thick, width], color, segments, { rot });
}

/** Point `t` of the way from a to b. */
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/**
 * A face: eyes with whites and pupils, brows, nose and mouth. `c` is the head centre, `r` the head radius (z) so the
 * features sit on the surface.
 */
export function face(step: number, c: Vec3, scale: number, skinDark: string, brow: string, opts: { mouth?: string; eyeY?: number; pupil?: string } = {}): AssetPart[] {
  const k = scale;
  const eyeY = c[1] + (opts.eyeY ?? 0.03) * k;
  const z = c[2] + 0.158 * k;
  return [
    ...LR('Eye White', (s, n) => ball(step, n, [c[0] + s * 0.078 * k, eyeY, z - 0.012 * k], [0.085 * k, 0.075 * k, 0.05 * k], '#fafafa', 6)),
    ...LR('Pupil', (s, n) => ball(step, n, [c[0] + s * 0.078 * k, eyeY - 0.002 * k, z + 0.014 * k], [0.05 * k, 0.05 * k, 0.03 * k], opts.pupil ?? '#1e2125', 5)),
    ...LR('Eyebrow', (s, n) => box(step, n, [c[0] + s * 0.08 * k, eyeY + 0.062 * k, z - 0.004 * k], [0.092 * k, 0.016 * k, 0.026 * k], brow, { rot: [0, 0, s * 9] })),
    part(step, 'Nose', 'pyramid', [c[0], c[1] - 0.025 * k, z + 0.03 * k], [0.075 * k, 0.1 * k, 0.075 * k], skinDark, { rot: [90, 0, 0] }),
    box(step, 'Mouth', [c[0], c[1] - 0.105 * k, z - 0.005 * k], [0.075 * k, 0.014 * k, 0.014 * k], opts.mouth ?? '#8a4a3a'),
  ];
}

export type StyleRule = [RegExp, { smooth?: boolean; paint?: number }];

/** Give parts their surface look by name: the first matching rule wins. */
export function applyStyle(parts: AssetPart[], rules: StyleRule[]): AssetPart[] {
  for (const p of parts) {
    const hit = rules.find(([re]) => re.test(p.name));
    if (hit) Object.assign(p, hit[1]);
  }
  return parts;
}
