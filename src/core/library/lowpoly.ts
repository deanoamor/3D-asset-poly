import { compact, signedVolume, type PolyMesh } from '../mesh';
import type { Vec3 } from '../types';

/**
 * Faceted building blocks for hard-edged low-poly characters: every shape is the convex hull of a few points, so it
 * has big flat faces, like a model made by pulling points around in a 3D app.
 */

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

const EPS = 1e-6;

/** The closed solid with these points as its corners. Faces that lie in one plane become one polygon. */
export function hull(input: Vec3[]): PolyMesh {
  const pts: Vec3[] = [];
  for (const p of input) if (!pts.some((q) => len(sub(p, q)) < EPS)) pts.push(p);
  const n = pts.length;
  const seen = new Set<string>();
  const faces: number[][] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        const nrm = cross(sub(pts[j], pts[i]), sub(pts[k], pts[i]));
        const l = len(nrm);
        if (l < 1e-9) continue;
        const N = norm(nrm);
        const d = dot(N, pts[i]);
        let pos = 0;
        let neg = 0;
        const on: number[] = [];
        for (let m = 0; m < n; m++) {
          const s = dot(N, pts[m]) - d;
          if (s > EPS) pos++;
          else if (s < -EPS) neg++;
          else on.push(m);
        }
        if (pos && neg) continue;
        const key = on.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        const out: Vec3 = pos ? [-N[0], -N[1], -N[2]] : N; // all other points lie behind the face
        const c = on.reduce<Vec3>((a, m) => [a[0] + pts[m][0] / on.length, a[1] + pts[m][1] / on.length, a[2] + pts[m][2] / on.length], [0, 0, 0]);
        const u = norm(sub(pts[on[0]], c));
        const w = cross(out, u);
        const ang = (m: number) => Math.atan2(dot(sub(pts[m], c), w), dot(sub(pts[m], c), u));
        faces.push([...on].sort((a, b) => ang(a) - ang(b)));
      }
  const m: PolyMesh = { v: pts.flatMap((p) => p), f: faces };
  if (signedVolume(m) < 0) m.f = m.f.map((q) => [...q].reverse());
  compact(m);
  return m;
}

/** Points of a ring around `center`, in the plane across `axis`. `rx` runs along `u`, `rz` along the other direction. */
export function ringPts(center: Vec3, axis: Vec3, rx: number, rz: number, sides: number, phase = Math.PI / 4): Vec3[] {
  const t = norm(axis);
  const ref: Vec3 = Math.abs(t[1]) > 0.92 ? [0, 0, 1] : [0, 1, 0];
  const u = norm(cross(ref, t));
  const w = cross(t, u);
  return Array.from({ length: sides }, (_, i) => {
    const a = phase + (i / sides) * Math.PI * 2;
    const c = Math.cos(a) * rx;
    const s = Math.sin(a) * rz;
    return [center[0] + u[0] * c + w[0] * s, center[1] + u[1] * c + w[1] * s, center[2] + u[2] * c + w[2] * s] as Vec3;
  });
}

/** A faceted limb: a ring at `a` and a ring at `b`, joined. */
export function tubeHull(a: Vec3, b: Vec3, ra: number | [number, number], rb: number | [number, number], sides = 5, phase = Math.PI / 4): PolyMesh {
  const axis = sub(b, a);
  const r = (x: number | [number, number]): [number, number] => (typeof x === 'number' ? [x, x] : x);
  return hull([...ringPts(a, axis, ...r(ra), sides, phase), ...ringPts(b, axis, ...r(rb), sides, phase)]);
}

/** A thin flat plate over a convex outline (3 or more points in one plane). */
export function slab(poly: Vec3[], thick: number): PolyMesh {
  const n = norm(cross(sub(poly[1], poly[0]), sub(poly[2], poly[0])));
  const h = thick / 2;
  return hull([...poly.map((p) => [p[0] + n[0] * h, p[1] + n[1] * h, p[2] + n[2] * h] as Vec3), ...poly.map((p) => [p[0] - n[0] * h, p[1] - n[1] * h, p[2] - n[2] * h] as Vec3)]);
}

/** A flat strip from `a` to `b`, `w` wide, lying in the plane that faces +z at depth z. */
export function strip(a: [number, number], b: [number, number], w: number, z: number, thick = 0.008): PolyMesh {
  const d = norm([b[0] - a[0], b[1] - a[1], 0]);
  const nx = -d[1] * (w / 2);
  const ny = d[0] * (w / 2);
  return slab([[a[0] + nx, a[1] + ny, z], [b[0] + nx, b[1] + ny, z], [b[0] - nx, b[1] - ny, z], [a[0] - nx, a[1] - ny, z]], thick);
}
