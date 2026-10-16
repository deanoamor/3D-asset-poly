import * as THREE from 'three';
import type { SceneObject, ShapeParams, ShapeType } from './types';
import { isClosed, meshTriangles, triangulate, type PolyMesh } from './mesh';
import { MAX_SEGMENTS, MIN_SEGMENTS } from './types';

export function clampSegments(shape: ShapeType, n: number): number {
  return Math.max(MIN_SEGMENTS[shape], Math.min(MAX_SEGMENTS, Math.round(n)));
}

function sphereRings(seg: number): number {
  return Math.max(2, Math.round(seg / 2));
}

/** Triangle count of a shape, computed analytically (matches buildGeometry). */
export function triangleCount(shape: ShapeType, p: ShapeParams): number {
  const s = clampSegments(shape, p.segments);
  switch (shape) {
    case 'box':
      return 12;
    case 'plane':
      return 2;
    case 'pyramid':
      return 6; // 4 sides + 2 base triangles
    case 'cone':
      return s + s; // side + base cap
    case 'cylinder': {
      const tapered = p.taper <= 0.0001;
      // side quads (2 tris each) + bottom cap + top cap (none when it tapers to a point)
      return tapered ? s + s : 2 * s + s + s;
    }
    case 'sphere': {
      const r = sphereRings(s);
      return s * r * 2 - 2 * s;
    }
  }
}

function flat(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng !== g) g.dispose();
  ng.deleteAttribute('uv');
  ng.computeVertexNormals();
  return ng;
}

/** Unit-sized, flat-shaded geometry. Object "size" scales it to W/H/D. */
export function buildGeometry(shape: ShapeType, p: ShapeParams): THREE.BufferGeometry {
  const s = clampSegments(shape, p.segments);
  switch (shape) {
    case 'box':
      return flat(new THREE.BoxGeometry(1, 1, 1));
    case 'plane': {
      const g = new THREE.PlaneGeometry(1, 1);
      g.rotateX(-Math.PI / 2);
      return flat(g);
    }
    case 'cylinder': {
      const top = Math.max(0, Math.min(1, p.taper)) * 0.5;
      return flat(new THREE.CylinderGeometry(top, 0.5, 1, s, 1, false));
    }
    case 'cone':
      return flat(new THREE.ConeGeometry(0.5, 1, s, 1, false));
    case 'pyramid': {
      // Square base aligned to the axes, 1 x 1 footprint: 4 sides + 2 base triangles.
      const a = [0, 0.5, 0], b = [-0.5, -0.5, -0.5], c = [0.5, -0.5, -0.5], d = [0.5, -0.5, 0.5], e = [-0.5, -0.5, 0.5];
      const tris = [a, c, b, a, d, c, a, e, d, a, b, e, b, c, d, b, d, e];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
      g.computeVertexNormals();
      return g;
    }
    case 'sphere':
      return flat(new THREE.SphereGeometry(0.5, s, sphereRings(s)));
  }
}

export function geometryTriangles(g: THREE.BufferGeometry): number {
  return g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
}

export function objectTriangles(o: SceneObject): number {
  if (o.kind !== 'shape' || !o.shape) return 0;
  return o.mesh ? meshTriangles(o.mesh) : triangleCount(o.shape, o.params);
}

/** Flat-shaded geometry for an edited mesh. `faceOfTri` lets the editor map a clicked triangle back to its polygon. */
export function buildMeshGeometry(m: PolyMesh): THREE.BufferGeometry {
  const { positions, faceOfTri } = triangulate(m);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.computeVertexNormals();
  g.userData.faceOfTri = faceOfTri;
  return g;
}

/** Planes and meshes with holes are drawn from both sides. */
export function needsDoubleSide(o: SceneObject): boolean {
  return o.shape === 'plane' || (!!o.mesh && !isClosed(o.mesh));
}

// ---------- surface look: smooth shading and painted color variation ----------

export interface Look {
  smooth: boolean;
  paint: number;
}

export const lookOf = (o: SceneObject): Look => ({ smooth: !!o.smooth, paint: Math.max(0, Math.min(1, o.paint ?? 0)) });
export const matOf = (o: SceneObject): { rough: number; metal: number; glow: number } => ({
  rough: Math.max(0, Math.min(1, o.mat?.rough ?? 0.85)),
  metal: Math.max(0, Math.min(1, o.mat?.metal ?? 0)),
  glow: Math.max(0, Math.min(1, o.mat?.glow ?? 0)),
});
export const usesVertexColors = (o: SceneObject): boolean => lookOf(o).paint > 0.001;

const key3 = (x: number, y: number, z: number) => `${Math.round(x * 1e4)}|${Math.round(y * 1e4)}|${Math.round(z * 1e4)}`;

/**
 * Soft shading for a flat-shaded (non-indexed) geometry: a corner's normal is the average of the neighbouring faces
 * that turn less than `creaseDeg` away, so curved parts look smooth and real edges (a box) stay crisp.
 */
export function smoothNormals(g: THREE.BufferGeometry, creaseDeg = 80): void {
  const pos = g.getAttribute('position');
  const tris = pos.count / 3;
  const fn = new Float32Array(tris * 3); // area-weighted face normals
  const buckets = new Map<string, number[]>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
    fn[t * 3] = n.x;
    fn[t * 3 + 1] = n.y;
    fn[t * 3 + 2] = n.z;
    for (let k = 0; k < 3; k++) {
      const key = key3(pos.getX(t * 3 + k), pos.getY(t * 3 + k), pos.getZ(t * 3 + k));
      const list = buckets.get(key);
      if (list) list.push(t);
      else buckets.set(key, [t]);
    }
  }
  const cos = Math.cos((creaseDeg * Math.PI) / 180);
  const out = new Float32Array(pos.count * 3);
  const mine = new THREE.Vector3();
  const other = new THREE.Vector3();
  const sum = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    mine.set(fn[t * 3], fn[t * 3 + 1], fn[t * 3 + 2]);
    const ml = mine.length();
    for (let k = 0; k < 3; k++) {
      sum.set(0, 0, 0);
      const list = buckets.get(key3(pos.getX(t * 3 + k), pos.getY(t * 3 + k), pos.getZ(t * 3 + k)))!;
      for (const u of list) {
        other.set(fn[u * 3], fn[u * 3 + 1], fn[u * 3 + 2]);
        const ol = other.length();
        if (ml > 1e-12 && ol > 1e-12 && mine.dot(other) / (ml * ol) >= cos) sum.add(other);
      }
      if (sum.lengthSq() < 1e-18) sum.copy(mine);
      sum.normalize();
      out[(t * 3 + k) * 3] = sum.x;
      out[(t * 3 + k) * 3 + 1] = sum.y;
      out[(t * 3 + k) * 3 + 2] = sum.z;
    }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
}

// small deterministic value noise so the same object always gets the same paint
const lat = (x: number, y: number, z: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const fade = (t: number) => t * t * (3 - 2 * t);
function noise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = fade(x - xi);
  const fy = fade(y - yi);
  const fz = fade(z - zi);
  const L = (dx: number, dy: number, dz: number) => lat(xi + dx, yi + dy, zi + dz, seed);
  const x00 = L(0, 0, 0) + (L(1, 0, 0) - L(0, 0, 0)) * fx;
  const x10 = L(0, 1, 0) + (L(1, 1, 0) - L(0, 1, 0)) * fx;
  const x01 = L(0, 0, 1) + (L(1, 0, 1) - L(0, 0, 1)) * fx;
  const x11 = L(0, 1, 1) + (L(1, 1, 1) - L(0, 1, 1)) * fx;
  const y0 = x00 + (x10 - x00) * fy;
  const y1 = x01 + (x11 - x01) * fy;
  return y0 + (y1 - y0) * fz;
}

/**
 * Soft, hand-painted color differences across a surface (vertex colors). On a faceted object every facet gets its own
 * slightly different shade; on a smooth object the shade flows from point to point. Tops are a touch lighter.
 */
export function paintVertexColors(g: THREE.BufferGeometry, hex: string, amount: number, smooth: boolean, seed = 7): void {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const base = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const p = new THREE.Vector3();
  const cen = new THREE.Vector3();
  const tris = pos.count / 3;
  for (let t = 0; t < tris; t++) {
    cen.set(0, 0, 0);
    for (let k = 0; k < 3; k++) cen.add(p.fromBufferAttribute(pos, t * 3 + k));
    cen.multiplyScalar(1 / 3);
    const jitter = lat(Math.round(cen.x * 997), Math.round(cen.y * 991), Math.round(cen.z * 983), seed) - 0.5;
    for (let k = 0; k < 3; k++) {
      p.fromBufferAttribute(pos, t * 3 + k);
      const q = smooth ? p : cen;
      const v1 = noise3(q.x * 3.1 + 11, q.y * 3.1 + 5, q.z * 3.1 + 3, seed) - 0.5;
      const v2 = noise3(q.x * 7.3, q.y * 7.3 + 9, q.z * 7.3 + 1, seed + 3) - 0.5;
      const ny = nor ? nor.getY(t * 3 + k) : 0;
      const facet = smooth ? 0 : jitter * 0.55;
      const l = Math.max(0.02, Math.min(0.97, hsl.l + amount * (0.2 * v1 + 0.08 * v2 + 0.1 * facet + 0.07 * ny)));
      const h = (hsl.h + amount * 0.05 * v2 + 1) % 1;
      const s = Math.max(0, Math.min(1, hsl.s + amount * 0.14 * v1));
      col.setHSL(h, s, l);
      colors[(t * 3 + k) * 3] = col.r;
      colors[(t * 3 + k) * 3 + 1] = col.g;
      colors[(t * 3 + k) * 3 + 2] = col.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** The geometry of a shape as it should look: base form, then soft shading and painted color if asked for. */
export function buildObjectGeometry(o: SceneObject): THREE.BufferGeometry {
  const g = o.mesh ? buildMeshGeometry(o.mesh) : buildGeometry(o.shape!, o.params);
  const look = lookOf(o);
  if (look.smooth) smoothNormals(g);
  if (look.paint > 0.001) paintVertexColors(g, o.color, look.paint, look.smooth);
  return g;
}
