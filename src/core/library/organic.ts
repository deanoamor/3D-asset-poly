import type { AssetPart } from '../assets';
import { boundsOf, cloneMesh, polyMeshFor, signedVolume, triangulate, type PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { aim } from './kit';

/**
 * Seamless, organic building blocks. Everything is authored in world coordinates as a closed polygon mesh and then
 * wrapped as an editable part, so limbs are one continuous bent tube (no gaps at the joints) and small details are
 * placed on the real surface of the body they sit on (nothing floats).
 */

type V = Vec3;
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V): V => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export interface Ring {
  p: V;
  /** One radius, or [across, deep]: "across" runs sideways, "deep" runs front to back (for a path along y) or up and down (for a path along z). */
  r: number | [number, number];
}

type Cap = 'flat' | 'dome' | 'none';

/** A closed tube along a path. Round limbs, bodies, rings, belts, brows: anything that bends or tapers. */
export function sweep(path: Ring[], o: { sides?: number; start?: Cap; end?: Cap; phase?: number } = {}): PolyMesh {
  const S = o.sides ?? 7;
  const n = path.length;
  const v: number[] = [];
  const f: number[][] = [];
  const radii = path.map((q) => (typeof q.r === 'number' ? ([q.r, q.r] as [number, number]) : q.r));
  const tangents: V[] = path.map((_, i) => {
    const a = path[Math.max(0, i - 1)].p;
    const b = path[Math.min(n - 1, i + 1)].p;
    return norm(sub(b, a));
  });
  path.forEach((q, i) => {
    const t = tangents[i];
    const ref: V = Math.abs(t[1]) > 0.92 ? [0, 0, 1] : [0, 1, 0];
    const u = norm(cross(ref, t));
    const w = cross(t, u);
    for (let k = 0; k < S; k++) {
      const th = (o.phase ?? 0) + (k / S) * Math.PI * 2;
      const c = Math.cos(th) * radii[i][0];
      const s = Math.sin(th) * radii[i][1];
      v.push(q.p[0] + u[0] * c + w[0] * s, q.p[1] + u[1] * c + w[1] * s, q.p[2] + u[2] * c + w[2] * s);
    }
  });
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < S; k++) f.push([i * S + k, i * S + ((k + 1) % S), (i + 1) * S + ((k + 1) % S), (i + 1) * S + k]);
  const startCap = o.start ?? 'flat';
  const endCap = o.end ?? 'flat';
  const first = 0;
  const last = (n - 1) * S;
  if (startCap === 'flat') f.push(Array.from({ length: S }, (_, k) => first + S - 1 - k));
  if (startCap === 'dome') {
    const apex = v.length / 3;
    const r = Math.max(...radii[0]);
    v.push(...sub(path[0].p, mul(tangents[0], r * 0.7)));
    for (let k = 0; k < S; k++) f.push([first + ((k + 1) % S), first + k, apex]);
  }
  if (endCap === 'flat') f.push(Array.from({ length: S }, (_, k) => last + k));
  if (endCap === 'dome') {
    const apex = v.length / 3;
    const r = Math.max(...radii[n - 1]);
    v.push(...add(path[n - 1].p, mul(tangents[n - 1], r * 0.7)));
    for (let k = 0; k < S; k++) f.push([last + k, last + ((k + 1) % S), apex]);
  }
  const m: PolyMesh = { v, f };
  if (signedVolume(m) < 0) m.f = m.f.map((face) => [...face].reverse());
  return m;
}

/** A low-poly ellipsoid: heads, joints, hair masses, hands, eyes. */
export function blob(center: V, radii: V, segments = 6): PolyMesh {
  const m = polyMeshFor('sphere', { segments, taper: 1 });
  for (let i = 0; i < m.v.length / 3; i++) {
    m.v[i * 3] = center[0] + m.v[i * 3] * 2 * radii[0];
    m.v[i * 3 + 1] = center[1] + m.v[i * 3 + 1] * 2 * radii[1];
    m.v[i * 3 + 2] = center[2] + m.v[i * 3 + 2] * 2 * radii[2];
  }
  return m;
}

/** A head: an ellipsoid with a narrower jaw and a slightly flat face. */
export function headBlob(center: V, radii: V, segments = 8): PolyMesh {
  const m = blob(center, radii, segments);
  for (let i = 0; i < m.v.length / 3; i++) {
    const dy = (m.v[i * 3 + 1] - center[1]) / radii[1]; // -1 chin ... +1 crown
    if (dy < 0.15) {
      const k = 1 + dy * 0.2;
      m.v[i * 3] = center[0] + (m.v[i * 3] - center[0]) * k;
      m.v[i * 3 + 2] = center[2] + (m.v[i * 3 + 2] - center[2]) * (1 + dy * 0.06);
    }
  }
  return m;
}

/** Wrap a world-space mesh as an editable asset part (the part stores unit-sized points plus a size). */
export function toPart(step: number, name: string, m: PolyMesh, color: string, extra: Partial<AssetPart> = {}): AssetPart {
  const b = boundsOf(m);
  const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
  const c: V = [0, 1, 2].map((k) => r4((b.min[k] + b.max[k]) / 2)) as V;
  const e: V = [0, 1, 2].map((k) => Math.max(1e-3, r4(b.max[k] - b.min[k]))) as V;
  const unit = cloneMesh(m);
  for (let i = 0; i < unit.v.length / 3; i++) for (let k = 0; k < 3; k++) unit.v[i * 3 + k] = (unit.v[i * 3 + k] - c[k]) / e[k];
  return { step, name, shape: 'box', pos: c, size: e, color, mesh: () => cloneMesh(unit), ...extra };
}

export interface Hit {
  p: V;
  /** Outward surface direction at the hit. */
  n: V;
}

/** Where a ray from `origin` (inside or outside) first meets the mesh. */
export function hitMesh(m: PolyMesh, origin: V, dir: V): Hit | null {
  const d = norm(dir);
  const { positions } = triangulate(m);
  let best = Infinity;
  let bn: V = [0, 1, 0];
  for (let i = 0; i < positions.length; i += 9) {
    const a: V = [positions[i], positions[i + 1], positions[i + 2]];
    const b: V = [positions[i + 3], positions[i + 4], positions[i + 5]];
    const c: V = [positions[i + 6], positions[i + 7], positions[i + 8]];
    const e1 = sub(b, a);
    const e2 = sub(c, a);
    const pv = cross(d, e2);
    const det = dot(e1, pv);
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const tv = sub(origin, a);
    const u = dot(tv, pv) * inv;
    if (u < -1e-6 || u > 1 + 1e-6) continue;
    const qv = cross(tv, e1);
    const w = dot(d, qv) * inv;
    if (w < -1e-6 || u + w > 1 + 1e-6) continue;
    const t = dot(e2, qv) * inv;
    if (t > 1e-6 && t < best) {
      best = t;
      bn = norm(cross(e1, e2));
    }
  }
  if (!isFinite(best)) return null;
  const p = add(origin, mul(d, best));
  // face normals from the triangulation point outward for our closed, outward-wound meshes
  const outward = dot(bn, d) > 0 ? bn : mul(bn, -1);
  return { p, n: outward };
}

/** Point on the mesh seen from `from` along `dir`, pushed out along the surface by `lift` (negative = sunk in). */
export function onSurface(m: PolyMesh, from: V, dir: V, lift = 0): Hit {
  const h = hitMesh(m, from, dir);
  if (!h) throw new Error(`nothing to attach to at ${from} ${dir}`);
  return { p: add(h.p, mul(h.n, lift)), n: h.n };
}

/**
 * A flat plate lying on a surface: pockets, badges, buckles, plates, patches.
 * Width runs sideways, height runs up the surface, thick sticks out from it.
 */
export function plate(step: number, name: string, m: PolyMesh, from: V, dir: V, w: number, h: number, thick: number, color: string, lift = 0): AssetPart {
  const hit = onSurface(m, from, dir, thick / 2 + lift - thick * 0.25);
  const { rot } = aim([0, 0, 0], hit.n);
  return { step, name, shape: 'box', pos: round3(hit.p), size: [w, thick, h], color, rot };
}

/** A thin ribbon that follows a surface through several points: mouths, brows, mustaches, hems, straps, ties. */
export function ribbon(m: PolyMesh, points: { from: V; dir: V }[], radius: number | [number, number], lift: number, o: { sides?: number; taper?: number; ends?: Cap } = {}): PolyMesh {
  const path: Ring[] = points.map((pt, i) => {
    const h = onSurface(m, pt.from, pt.dir, lift);
    const t = points.length > 1 ? i / (points.length - 1) : 0;
    const k = 1 - (o.taper ?? 0) * t;
    const r = typeof radius === 'number' ? radius * k : ([radius[0] * k, radius[1] * k] as [number, number]);
    return { p: h.p, r };
  });
  return sweep(path, { sides: o.sides ?? 5, start: o.ends ?? 'dome', end: o.ends ?? 'dome' });
}

const round3 = (v: V): V => [Math.round(v[0] * 1e3) / 1e3, Math.round(v[1] * 1e3) / 1e3, Math.round(v[2] * 1e3) / 1e3];

/** Turn a point relative to an ankle (or any pivot) by `deg` about X, then place it: poses a foot or a hand. */
export const pivotX = (pivot: V, deg: number) => (local: V): V => {
  const a = (deg * Math.PI) / 180;
  const y = local[1] * Math.cos(a) - local[2] * Math.sin(a);
  const z = local[1] * Math.sin(a) + local[2] * Math.cos(a);
  return [pivot[0] + local[0], pivot[1] + y, pivot[2] + z];
};

export { add as vadd, sub as vsub, mul as vmul, norm as vnorm, len as vlen, cross as vcross };

/**
 * The face, in the soft stylised way of illustrated characters: big eyes built in layers (white, iris, pupil and a
 * glint of light), thick brows, a rounded nose, a smile and rosy cheeks, all sitting on the real head surface.
 */
export function faceOn(step: number, head: PolyMesh, c: V, o: { skin: string; skinDark: string; brow: string; lip?: string; pupil?: string; iris?: string; blush?: string; eye?: number; sep?: number; eyeY?: number; browTilt?: number; smile?: number; frown?: number }): AssetPart[] {
  const eye = o.eye ?? 1;
  const sep = o.sep ?? 0.43;
  const ey = o.eyeY ?? 0.1;
  const parts: AssetPart[] = [];
  for (const s of [1, -1] as const) {
    const side = s === 1 ? 'Left' : 'Right';
    const dirE: V = [s * sep, ey, 1];
    const w = onSurface(head, c, dirE, -0.014);
    parts.push(toPart(step, `Eye White ${side}`, blob(w.p, [0.04 * eye, 0.038 * eye, 0.026 * eye], 8), '#fafafa'));
    const ir = onSurface(head, c, [s * sep * 0.97, ey - 0.004, 1], 0.004);
    parts.push(toPart(step, `Iris ${side}`, blob(ir.p, [0.023 * eye, 0.026 * eye, 0.016 * eye], 8), o.iris ?? '#6b4326'));
    const pu = onSurface(head, c, [s * sep * 0.96, ey - 0.006, 1], 0.014);
    parts.push(toPart(step, `Pupil ${side}`, blob(pu.p, [0.014 * eye, 0.016 * eye, 0.01 * eye], 6), o.pupil ?? '#1a1a1d'));
    const gl = onSurface(head, c, [s * sep * 0.9, ey + 0.03, 1], 0.016);
    parts.push(toPart(step, `Eye Highlight ${side}`, blob(gl.p, [0.011 * eye, 0.011 * eye, 0.008 * eye], 5), '#ffffff'));
    const tilt = (o.browTilt ?? 0.05) * s;
    const brow = ribbon(
      head,
      [
        { from: c, dir: [s * (sep + 0.22), ey + 0.3 - tilt * 0.6, 1] },
        { from: c, dir: [s * (sep + 0.02), ey + 0.355, 1] },
        { from: c, dir: [s * (sep - 0.2), ey + 0.31 + tilt * 0.6, 1] },
      ],
      [0.02, 0.012],
      0.004,
      { sides: 5, taper: 0.25 },
    );
    parts.push(toPart(step, `Eyebrow ${side}`, brow, o.brow));
    const ear = onSurface(head, c, [s, 0.02, -0.05], -0.02);
    parts.push(toPart(step, `Ear ${side}`, blob(ear.p, [0.032, 0.058, 0.042], 6), o.skin));
    const cheek = onSurface(head, c, [s * 0.62, -0.12, 1], -0.012);
    parts.push(toPart(step, `Cheek ${side}`, blob(cheek.p, [0.036 * eye, 0.024 * eye, 0.012], 6), o.blush ?? '#e59a86'));
  }
  const nose = onSurface(head, c, [0, ey - 0.12, 1], -0.01);
  parts.push(toPart(step, 'Nose', blob(add(nose.p, mul(nose.n, 0.012 * eye)), [0.024 * eye, 0.026 * eye, 0.024 * eye], 6), o.skinDark));
  const sm = o.smile ?? 0.02;
  const mouth = ribbon(
    head,
    [-0.15, -0.075, 0, 0.075, 0.15].map((x) => ({ from: c, dir: [x, -0.42 + sm * (Math.abs(x) * 6 - 0.5) - (o.frown ?? 0) * (1 - Math.abs(x) * 6), 1] as V })),
    [0.009, 0.006],
    0.003,
    { sides: 4, taper: 0 },
  );
  parts.push(toPart(step, 'Mouth', mouth, o.lip ?? '#8a4a3a'));
  return parts;
}

/**
 * A football as a truncated icosahedron: 12 black pentagons and 20 white hexagons, like the classic ball.
 * Returns the white solid plus 12 slightly raised black pentagon caps.
 */
export function soccerBall(center: V, r: number): { body: PolyMesh; caps: PolyMesh[] } {
  const phi = (1 + Math.sqrt(5)) / 2;
  const ico: V[] = [];
  for (const a of [-1, 1]) for (const b of [-phi, phi]) ico.push([0, a, b], [a, b, 0], [b, 0, a]);
  const ivs = ico.map((p) => norm(p));
  // neighbours: the 5 closest vertices of each icosahedron vertex
  const nb = ivs.map((p, i) =>
    ivs.map((q, j) => ({ j, d: len(sub(p, q)) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 5).map((o) => o.j),
  );
  const verts: V[] = [];
  const idx = new Map<string, number>();
  const pt = (a: number, b: number): number => {
    const key = `${a}>${b}`;
    let i = idx.get(key);
    if (i === undefined) {
      const p = add(mul(ivs[a], 2 / 3), mul(ivs[b], 1 / 3));
      i = verts.length;
      verts.push(p);
      idx.set(key, i);
    }
    return i;
  };
  const faces: number[][] = [];
  const pents: number[][] = [];
  // pentagons: around each vertex, ordered by angle around its axis
  ivs.forEach((p, i) => {
    const u = norm(cross(p, Math.abs(p[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    const w = cross(p, u);
    const ring = [...nb[i]].sort((a, b) => Math.atan2(dot(sub(ivs[a], p), w), dot(sub(ivs[a], p), u)) - Math.atan2(dot(sub(ivs[b], p), w), dot(sub(ivs[b], p), u)));
    const f = ring.map((j) => pt(i, j));
    pents.push(f);
    faces.push(f);
  });
  // hexagons: one per icosahedron face (triangle of mutual neighbours)
  const seen = new Set<string>();
  ivs.forEach((_, a) => {
    for (const b of nb[a]) for (const c of nb[a]) {
      if (b >= c || !nb[b].includes(c)) continue;
      const key = [a, b, c].sort((x, y) => x - y).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      faces.push([pt(a, b), pt(b, a), pt(b, c), pt(c, b), pt(c, a), pt(a, c)]);
    }
  });
  const R = r / len(verts[0]);
  const place = (p: V, k = 1): V => [center[0] + p[0] * R * k, center[1] + p[1] * R * k, center[2] + p[2] * R * k];
  const orient = (f: number[], pts: V[]): number[] => {
    const c = pts.reduce<V>((s, p) => add(s, p), [0, 0, 0]).map((x) => x / pts.length) as V;
    const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    return dot(n, c) >= 0 ? f : [...f].reverse();
  };
  const body: PolyMesh = { v: verts.flatMap((p) => place(p)), f: faces.map((f) => orient(f, f.map((i) => verts[i]))) };
  const caps = pents.map((f) => {
    const v: number[] = [];
    f.forEach((i) => v.push(...place(verts[i], 0.985)));
    f.forEach((i) => v.push(...place(verts[i], 1.012)));
    const n = f.length;
    const faces2: number[][] = [Array.from({ length: n }, (_, k) => n + k), Array.from({ length: n }, (_, k) => n - 1 - k)];
    for (let k = 0; k < n; k++) faces2.push([k, (k + 1) % n, n + ((k + 1) % n), n + k]);
    const pts = f.map((i) => verts[i]);
    const flip = dot(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])), pts[0]) < 0;
    return { v, f: flip ? faces2.map((q) => [...q].reverse()) : faces2 };
  });
  return { body, caps };
}
