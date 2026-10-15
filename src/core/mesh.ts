import type { ShapeParams, ShapeType } from './types';
import { MAX_SEGMENTS } from './types';

/** Editable polygon mesh: flat xyz vertex list plus faces as vertex-index loops (counter-clockwise from outside). */
export interface PolyMesh {
  v: number[];
  f: number[][];
}

export type V3 = [number, number, number];
export type EditMode = 'vertex' | 'edge' | 'face';
/** Vertices and faces are indices, edges are `edgeKey` strings. */
export type Sel = (number | string)[];

export const vert = (m: PolyMesh, i: number): V3 => [m.v[i * 3], m.v[i * 3 + 1], m.v[i * 3 + 2]];
export const vertCount = (m: PolyMesh) => m.v.length / 3;
export const cloneMesh = (m: PolyMesh): PolyMesh => ({ v: [...m.v], f: m.f.map((f) => [...f]) });
export const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
export const parseEdge = (k: string): [number, number] => {
  const [a, b] = k.split('_');
  return [+a, +b];
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const avg = (pts: V3[]): V3 => mul(pts.reduce(add, [0, 0, 0] as V3), 1 / pts.length);
const lerp = (a: V3, b: V3, t: number): V3 => add(mul(a, 1 - t), mul(b, t));

export function faceCenter(m: PolyMesh, fi: number): V3 {
  return avg(m.f[fi].map((i) => vert(m, i)));
}

/** Newell normal (not normalised length-wise beyond unit). */
export function faceNormal(m: PolyMesh, fi: number): V3 {
  const f = m.f[fi];
  let n: V3 = [0, 0, 0];
  for (let i = 0; i < f.length; i++) {
    const a = vert(m, f[i]);
    const b = vert(m, f[(i + 1) % f.length]);
    n = add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
  }
  const l = Math.hypot(...n) || 1;
  return mul(n, 1 / l);
}

// ---------- primitives ----------

function orientOutward(m: PolyMesh): PolyMesh {
  const c = avg(Array.from({ length: vertCount(m) }, (_, i) => vert(m, i)));
  m.f = m.f.map((f, fi) => {
    const n = faceNormal({ v: m.v, f: [f] }, 0);
    void fi;
    const fc = avg(f.map((i) => vert(m, i)));
    return dot(n, sub(fc, c)) < 0 ? [...f].reverse() : f;
  });
  return m;
}

/** Same shapes as the parametric ones, but as editable polygons (unit size, centred on the origin). */
export function polyMeshFor(shape: ShapeType, p: ShapeParams): PolyMesh {
  const seg = Math.max(3, Math.min(MAX_SEGMENTS, Math.round(p.segments)));
  switch (shape) {
    case 'box': {
      const v: number[] = [];
      for (let i = 0; i < 8; i++) v.push(i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5);
      return orientOutward({ v, f: [[1, 3, 7, 5], [0, 2, 6, 4], [2, 3, 7, 6], [0, 1, 5, 4], [4, 5, 7, 6], [0, 1, 3, 2]] });
    }
    case 'plane':
      return { v: [-0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5], f: [[0, 1, 2, 3]] };
    case 'pyramid':
      return orientOutward({ v: [-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0, 0.5, 0], f: [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [0, 1, 2, 3]] });
    case 'cone':
    case 'cylinder': {
      const topR = shape === 'cone' ? 0 : Math.max(0, Math.min(1, p.taper)) * 0.5;
      const v: number[] = [];
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        v.push(0.5 * Math.cos(a), -0.5, 0.5 * Math.sin(a));
      }
      const f: number[][] = [];
      if (topR <= 1e-4) {
        v.push(0, 0.5, 0);
        for (let i = 0; i < seg; i++) f.push([i, (i + 1) % seg, seg]);
      } else {
        for (let i = 0; i < seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          v.push(topR * Math.cos(a), 0.5, topR * Math.sin(a));
        }
        for (let i = 0; i < seg; i++) f.push([i, (i + 1) % seg, seg + ((i + 1) % seg), seg + i]);
        f.push(Array.from({ length: seg }, (_, i) => seg + i));
      }
      f.push(Array.from({ length: seg }, (_, i) => i));
      return orientOutward({ v, f });
    }
    case 'sphere': {
      const rings = Math.max(2, Math.round(seg / 2));
      const v: number[] = [0, 0.5, 0];
      for (let r = 1; r < rings; r++) {
        const t = (Math.PI * r) / rings;
        for (let i = 0; i < seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          v.push(0.5 * Math.sin(t) * Math.cos(a), 0.5 * Math.cos(t), 0.5 * Math.sin(t) * Math.sin(a));
        }
      }
      const bottom = v.length / 3;
      v.push(0, -0.5, 0);
      const ring = (r: number, i: number) => 1 + (r - 1) * seg + (i % seg);
      const f: number[][] = [];
      for (let i = 0; i < seg; i++) f.push([0, ring(1, i + 1), ring(1, i)]);
      for (let r = 1; r < rings - 1; r++) for (let i = 0; i < seg; i++) f.push([ring(r, i), ring(r, i + 1), ring(r + 1, i + 1), ring(r + 1, i)]);
      for (let i = 0; i < seg; i++) f.push([bottom, ring(rings - 1, i), ring(rings - 1, i + 1)]);
      return orientOutward({ v, f });
    }
  }
}

// ---------- queries ----------

export function meshTriangles(m: PolyMesh): number {
  return m.f.reduce((a, f) => a + Math.max(0, f.length - 2), 0);
}

export interface EdgeInfo {
  key: string;
  a: number;
  b: number;
  faces: number[];
}

export function edgeMap(m: PolyMesh): Map<string, EdgeInfo> {
  const map = new Map<string, EdgeInfo>();
  m.f.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      const key = edgeKey(a, b);
      const e = map.get(key);
      if (e) e.faces.push(fi);
      else map.set(key, { key, a: Math.min(a, b), b: Math.max(a, b), faces: [fi] });
    }
  });
  return map;
}

/** A mesh with no open edges can be drawn single-sided. */
export function isClosed(m: PolyMesh): boolean {
  if (!m.f.length) return false;
  for (const e of edgeMap(m).values()) if (e.faces.length !== 2) return false;
  return true;
}

/** True when no directed edge is used twice, i.e. all faces agree on which way is "out". */
export function consistentWinding(m: PolyMesh): boolean {
  const seen = new Set<string>();
  for (const f of m.f) {
    for (let i = 0; i < f.length; i++) {
      const k = `${f[i]}>${f[(i + 1) % f.length]}`;
      if (seen.has(k)) return false;
      seen.add(k);
    }
  }
  return true;
}

/** Signed volume: positive when faces point outward. */
export function signedVolume(m: PolyMesh): number {
  let vol = 0;
  for (let fi = 0; fi < m.f.length; fi++) {
    const f = m.f[fi];
    const a = vert(m, f[0]);
    for (let k = 1; k + 1 < f.length; k++) vol += dot(a, cross(vert(m, f[k]), vert(m, f[k + 1]))) / 6;
  }
  return vol;
}

export function boundsOf(m: PolyMesh, only?: Iterable<number>): { min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  const ids = only ? [...only] : Array.from({ length: vertCount(m) }, (_, i) => i);
  for (const i of ids) {
    const p = vert(m, i);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k]);
      max[k] = Math.max(max[k], p[k]);
    }
  }
  return { min, max };
}

export function centroidOf(m: PolyMesh, ids: Iterable<number>): V3 {
  const pts = [...ids].map((i) => vert(m, i));
  return pts.length ? avg(pts) : [0, 0, 0];
}

/** Fan triangulation; quads pick the shorter diagonal so bent quads still look right. */
export function triangulate(m: PolyMesh): { positions: Float32Array; faceOfTri: Uint32Array } {
  const tris: number[] = [];
  const owner: number[] = [];
  m.f.forEach((f, fi) => {
    if (f.length < 3) return;
    if (f.length === 4) {
      const d02 = Math.hypot(...sub(vert(m, f[0]), vert(m, f[2])));
      const d13 = Math.hypot(...sub(vert(m, f[1]), vert(m, f[3])));
      const q = d13 < d02 ? [f[1], f[2], f[3], f[0]] : f;
      tris.push(q[0], q[1], q[2], q[0], q[2], q[3]);
      owner.push(fi, fi);
      return;
    }
    for (let k = 1; k + 1 < f.length; k++) {
      tris.push(f[0], f[k], f[k + 1]);
      owner.push(fi);
    }
  });
  const positions = new Float32Array(tris.length * 3);
  tris.forEach((vi, i) => {
    positions[i * 3] = m.v[vi * 3];
    positions[i * 3 + 1] = m.v[vi * 3 + 1];
    positions[i * 3 + 2] = m.v[vi * 3 + 2];
  });
  return { positions, faceOfTri: Uint32Array.from(owner) };
}

/** Cheap fingerprint so the viewport can tell when a mesh changed. */
export function meshSignature(m: PolyMesh): string {
  let h = 0;
  for (let i = 0; i < m.v.length; i++) h = (h * 31 + Math.round(m.v[i] * 10000)) | 0;
  let g = 0;
  for (const f of m.f) for (const i of f) g = (g * 17 + i + 1) | 0;
  return `${m.v.length}:${m.f.length}:${h}:${g}`;
}

// ---------- selection helpers ----------

export function verticesOfSelection(m: PolyMesh, mode: EditMode, sel: Sel): Set<number> {
  const out = new Set<number>();
  if (mode === 'vertex') for (const s of sel) out.add(s as number);
  else if (mode === 'edge') for (const s of sel) parseEdge(s as string).forEach((v) => out.add(v));
  else for (const s of sel) m.f[s as number]?.forEach((v) => out.add(v));
  return out;
}

/** Keep as much of the selection as makes sense when the user switches between Points / Edges / Faces. */
export function convertSelection(m: PolyMesh, from: EditMode, to: EditMode, sel: Sel): Sel {
  if (from === to) return sel;
  const verts = verticesOfSelection(m, from, sel);
  if (to === 'vertex') return [...verts];
  if (to === 'edge') {
    const out: string[] = [];
    for (const e of edgeMap(m).values()) if (verts.has(e.a) && verts.has(e.b)) out.push(e.key);
    return out;
  }
  const out: number[] = [];
  m.f.forEach((f, fi) => {
    if (f.every((v) => verts.has(v))) out.push(fi);
  });
  return out;
}

export function mirrorPairs(m: PolyMesh, eps = 1e-4): Map<number, number> {
  const key = (x: number, y: number, z: number) => `${Math.round(x / eps)}|${Math.round(y / eps)}|${Math.round(z / eps)}`;
  const at = new Map<string, number>();
  for (let i = 0; i < vertCount(m); i++) at.set(key(m.v[i * 3], m.v[i * 3 + 1], m.v[i * 3 + 2]), i);
  const out = new Map<number, number>();
  for (let i = 0; i < vertCount(m); i++) {
    const j = at.get(key(-m.v[i * 3], m.v[i * 3 + 1], m.v[i * 3 + 2]));
    if (j !== undefined) out.set(i, j);
  }
  return out;
}

export function faceArea(m: PolyMesh, fi: number): number {
  const f = m.f[fi];
  const a = vert(m, f[0]);
  let area = 0;
  for (let k = 1; k + 1 < f.length; k++) area += Math.hypot(...cross(sub(vert(m, f[k]), a), sub(vert(m, f[k + 1]), a))) / 2;
  return area;
}

/** Average outward direction of some faces (unit length). */
export function averageNormal(m: PolyMesh, faces: number[]): V3 {
  const n = faces.reduce((acc, fi) => add(acc, faceNormal(m, fi)), [0, 0, 0] as V3);
  const l = Math.hypot(...n);
  return l < 1e-6 ? [0, 1, 0] : mul(n, 1 / l);
}

/** How far "Pull out" grows a part when it is first made: scales with the face so it is always visible, never huge. */
export function pullDistance(m: PolyMesh, faces: number[]): number {
  const size = Math.sqrt(faces.reduce((a, fi) => a + faceArea(m, fi), 0));
  return Math.max(0.15, Math.min(1, Math.round(size * 0.6 * 20) / 20));
}

export function moveVerts(m: PolyMesh, ids: Iterable<number>, delta: V3): void {
  for (const i of ids) {
    m.v[i * 3] += delta[0];
    m.v[i * 3 + 1] += delta[1];
    m.v[i * 3 + 2] += delta[2];
  }
}

// ---------- operations (all mutate the mesh in place) ----------

/** Drop unused vertices and degenerate faces. Returns old index -> new index (-1 when removed). */
export function compact(m: PolyMesh): number[] {
  m.f = m.f.filter((f) => f.length >= 3);
  const used = new Set<number>();
  for (const f of m.f) for (const i of f) used.add(i);
  const map = new Array<number>(vertCount(m)).fill(-1);
  const v: number[] = [];
  let n = 0;
  for (let i = 0; i < vertCount(m); i++) {
    if (!used.has(i)) continue;
    map[i] = n++;
    v.push(m.v[i * 3], m.v[i * 3 + 1], m.v[i * 3 + 2]);
  }
  m.v = v;
  m.f = m.f.map((f) => f.map((i) => map[i]));
  return map;
}

/** Pull selected faces out as a new layer. The selected face ids stay valid and now point at the new layer. */
export function extrudeFaces(m: PolyMesh, faces: number[]): void {
  const sel = new Set(faces);
  const count = new Map<string, number>();
  for (const fi of sel) {
    const f = m.f[fi];
    for (let i = 0; i < f.length; i++) {
      const k = edgeKey(f[i], f[(i + 1) % f.length]);
      count.set(k, (count.get(k) ?? 0) + 1);
    }
  }
  const dup = new Map<number, number>();
  const dupOf = (v: number) => {
    let d = dup.get(v);
    if (d === undefined) {
      d = vertCount(m);
      m.v.push(m.v[v * 3], m.v[v * 3 + 1], m.v[v * 3 + 2]);
      dup.set(v, d);
    }
    return d;
  };
  const walls: number[][] = [];
  for (const fi of sel) {
    const f = m.f[fi];
    for (let i = 0; i < f.length; i++) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      if (count.get(edgeKey(a, b)) === 1) walls.push([a, b, dupOf(b), dupOf(a)]);
    }
  }
  for (const fi of sel) m.f[fi] = m.f[fi].map(dupOf);
  m.f.push(...walls);
}

/** Pull selected edges out into a flap. Returns the new edges. */
export function extrudeEdges(m: PolyMesh, keys: string[]): string[] {
  const edges = edgeMap(m);
  const dup = new Map<number, number>();
  const dupOf = (v: number) => {
    let d = dup.get(v);
    if (d === undefined) {
      d = vertCount(m);
      m.v.push(m.v[v * 3], m.v[v * 3 + 1], m.v[v * 3 + 2]);
      dup.set(v, d);
    }
    return d;
  };
  const out: string[] = [];
  const newFaces: number[][] = [];
  for (const k of keys) {
    const e = edges.get(k);
    if (!e) continue;
    let x = e.a;
    let y = e.b;
    const adj = e.faces.length ? m.f[e.faces[0]] : undefined;
    if (adj) {
      // (x, y) as the adjacent face walks it; the wall must walk it the other way round
      if (adj[(adj.indexOf(x) + 1) % adj.length] !== y) [x, y] = [y, x];
      newFaces.push([y, x, dupOf(x), dupOf(y)]);
    } else newFaces.push([x, y, dupOf(y), dupOf(x)]);
    out.push(edgeKey(dupOf(x), dupOf(y)));
  }
  m.f.push(...newFaces);
  return out;
}

/** Shrink each selected face into a smaller one framed by a ring of new faces. Selected ids now point at the inner faces. */
export function insetFaces(m: PolyMesh, faces: number[], amount = 0.3): void {
  for (const fi of faces) {
    const f = m.f[fi];
    const c = faceCenter(m, fi);
    const inner = f.map((vi) => {
      const p = lerp(vert(m, vi), c, amount);
      const id = vertCount(m);
      m.v.push(...p);
      return id;
    });
    for (let i = 0; i < f.length; i++) m.f.push([f[i], f[(i + 1) % f.length], inner[(i + 1) % f.length], inner[i]]);
    m.f[fi] = inner;
  }
}

/** Cut a loop through the given edge (halfway along it). Returns the new edges of the cut. */
export function loopCut(m: PolyMesh, key: string, t = 0.5): string[] {
  const edges = edgeMap(m);
  const start = edges.get(key);
  if (!start) return [];
  const ringEdges = new Set<string>([key]);
  const ringFaces = new Map<number, string>(); // face -> edge it is entered through
  const walk = (fi0: number, enter: string) => {
    let fi: number | undefined = fi0;
    let inKey = enter;
    while (fi !== undefined && !ringFaces.has(fi)) {
      const f = m.f[fi];
      if (f.length !== 4) return;
      const i = f.findIndex((_, k) => edgeKey(f[k], f[(k + 1) % 4]) === inKey);
      if (i < 0) return;
      ringFaces.set(fi, inKey);
      const out = edgeKey(f[(i + 2) % 4], f[(i + 3) % 4]);
      ringEdges.add(out);
      fi = edges.get(out)?.faces.find((x) => x !== fi);
      inKey = out;
    }
  };
  for (const fi of start.faces) walk(fi, key);
  if (!ringFaces.size) return [];

  const mid = new Map<string, number>();
  for (const k of ringEdges) {
    const [a, b] = parseEdge(k);
    const id = vertCount(m);
    m.v.push(...lerp(vert(m, a), vert(m, b), t));
    mid.set(k, id);
  }
  const next: number[][] = [];
  const cuts: string[] = [];
  m.f.forEach((f, fi) => {
    const entered = ringFaces.get(fi);
    if (entered !== undefined) {
      const i = f.findIndex((_, k) => edgeKey(f[k], f[(k + 1) % 4]) === entered);
      const out = edgeKey(f[(i + 2) % 4], f[(i + 3) % 4]);
      const mi = mid.get(entered)!;
      const mo = mid.get(out)!;
      next.push([f[i], mi, mo, f[(i + 3) % 4]], [mi, f[(i + 1) % 4], f[(i + 2) % 4], mo]);
      cuts.push(edgeKey(mi, mo));
      return;
    }
    // neighbours that touch the ring get the extra vertex so no crack opens
    const loop: number[] = [];
    for (let i = 0; i < f.length; i++) {
      loop.push(f[i]);
      const m2 = mid.get(edgeKey(f[i], f[(i + 1) % f.length]));
      if (m2 !== undefined) loop.push(m2);
    }
    next.push(loop);
  });
  m.f = next;
  return cuts;
}

/** Collapse the given vertices into one point at their centre. Returns that vertex's new index. */
export function mergeVerts(m: PolyMesh, verts: Set<number>): number {
  if (verts.size < 2) return -1;
  const ids = [...verts].sort((a, b) => a - b);
  const target = ids[0];
  const c = centroidOf(m, ids);
  m.v[target * 3] = c[0];
  m.v[target * 3 + 1] = c[1];
  m.v[target * 3 + 2] = c[2];
  m.f = m.f
    .map((f) => f.map((i) => (verts.has(i) ? target : i)))
    .map((f) => f.filter((i, k) => i !== f[(k + 1) % f.length]));
  const map = compact(m);
  return map[target];
}

export function deleteFaces(m: PolyMesh, faces: number[]): void {
  const kill = new Set(faces);
  m.f = m.f.filter((_, i) => !kill.has(i));
  compact(m);
}

export function deleteVerts(m: PolyMesh, verts: Set<number>): void {
  m.f = m.f.filter((f) => !f.some((i) => verts.has(i)));
  compact(m);
}

export function deleteEdges(m: PolyMesh, keys: string[]): void {
  const edges = edgeMap(m);
  const kill = new Set<number>();
  for (const k of keys) edges.get(k)?.faces.forEach((f) => kill.add(f));
  deleteFaces(m, [...kill]);
}

/** One round of Catmull-Clark subdivision: every face becomes quads and the surface rounds off. */
export function subdivide(m: PolyMesh): void {
  const nV = vertCount(m);
  const edges = edgeMap(m);
  const fp = m.f.map((_, fi) => faceCenter(m, fi));
  const out: number[] = [];
  const P = (i: number) => vert(m, i);
  const vertFaces: number[][] = Array.from({ length: nV }, () => []);
  const vertEdges: EdgeInfo[][] = Array.from({ length: nV }, () => []);
  m.f.forEach((f, fi) => f.forEach((v) => vertFaces[v].push(fi)));
  for (const e of edges.values()) {
    vertEdges[e.a].push(e);
    vertEdges[e.b].push(e);
  }
  // new positions of the original vertices
  for (let i = 0; i < nV; i++) {
    const p = P(i);
    const es = vertEdges[i];
    const open = es.filter((e) => e.faces.length === 1);
    const manifold = es.every((e) => e.faces.length <= 2) && vertFaces[i].length > 0;
    let q: V3 = p;
    if (!manifold) q = p;
    else if (open.length === 2) {
      const o = open.map((e) => P(e.a === i ? e.b : e.a));
      q = add(mul(p, 0.75), mul(add(o[0], o[1]), 0.125));
    } else if (open.length === 0) {
      const n = es.length;
      const F = avg(vertFaces[i].map((fi) => fp[fi]));
      const R = avg(es.map((e) => mul(add(P(e.a), P(e.b)), 0.5)));
      q = mul(add(add(F, mul(R, 2)), mul(p, n - 3)), 1 / n);
    }
    out.push(...q);
  }
  // face points then edge points
  const facePt = m.f.map((_, fi) => {
    const id = out.length / 3;
    out.push(...fp[fi]);
    return id;
  });
  const edgePt = new Map<string, number>();
  for (const e of edges.values()) {
    const mid = mul(add(P(e.a), P(e.b)), 0.5);
    const pos = e.faces.length === 2 ? avg([mid, mid, fp[e.faces[0]], fp[e.faces[1]]]) : mid;
    edgePt.set(e.key, out.length / 3);
    out.push(...pos);
  }
  const faces: number[][] = [];
  m.f.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const prev = f[(i + f.length - 1) % f.length];
      const next = f[(i + 1) % f.length];
      faces.push([f[i], edgePt.get(edgeKey(f[i], next))!, facePt[fi], edgePt.get(edgeKey(prev, f[i]))!]);
    }
  });
  m.v = out;
  m.f = faces;
}

// ---------- size handling ----------

/** Fold the object's size into the points so they are in real units while editing. */
export function bakeScale(m: PolyMesh, size: V3): void {
  for (let i = 0; i < m.v.length; i++) m.v[i] *= size[i % 3];
}

/** After editing: make the points unit-sized again and return the size they imply. */
export function normalizeMesh(m: PolyMesh): V3 {
  if (!vertCount(m)) return [1, 1, 1];
  const { min, max } = boundsOf(m);
  const ext: V3 = [0, 1, 2].map((k) => {
    const e = max[k] - min[k];
    return e < 1e-4 ? 1 : e;
  }) as V3;
  for (let i = 0; i < m.v.length; i++) m.v[i] /= ext[i % 3];
  return ext.map((n) => Math.round(n * 1e4) / 1e4) as V3;
}
