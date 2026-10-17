import * as THREE from 'three';

/**
 * Planar (box) mapping for shapes that have no UV of their own: every point is projected along the axis its normal
 * points to most, and stretched over that side's extent, so a picture covers each side once and stands upright.
 * `onImage` tells which points belong to a side that wears the picture (all of them, or only the +Z "front").
 */
export function planarUV(g: THREE.BufferGeometry, mode: 'all' | 'front' = 'all'): { uv: Float32Array; onImage: Uint8Array } {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const n = pos.count;
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const min = b.min;
  const d = b.max.clone().sub(b.min);
  const nx = (v: number, a: 'x' | 'y' | 'z') => (d[a] < 1e-9 ? 0.5 : (v - min[a]) / d[a]);
  const uv = new Float32Array(n * 2);
  const onImage = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = nx(pos.getX(i), 'x');
    const y = nx(pos.getY(i), 'y');
    const z = nx(pos.getZ(i), 'z');
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    let face: string;
    if (az >= ax && az >= ay) {
      const pz = nor.getZ(i) >= 0;
      u = pz ? x : 1 - x;
      v = y;
      face = pz ? 'front' : 'back';
    } else if (ax >= ay) {
      const px = nor.getX(i) >= 0;
      u = px ? 1 - z : z;
      v = y;
      face = px ? 'right' : 'left';
    } else {
      const py = nor.getY(i) >= 0;
      u = x;
      v = py ? 1 - z : z;
      face = py ? 'top' : 'bottom';
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
    onImage[i] = mode === 'all' || face === 'front' ? 1 : 0;
  }
  return { uv, onImage };
}

export interface Slot {
  key: string;
  w: number;
  h: number;
}
export interface Placed {
  x: number;
  y: number;
  w: number;
  h: number;
}

const pot = (n: number) => {
  let p = 4;
  while (p < n) p *= 2;
  return p;
};

/**
 * Pack rectangles (a `pad` of edge pixels around each, so filtering never mixes neighbours) into a power-of-two atlas.
 * Returns the pixel rectangle of every item's own content.
 */
export function layoutAtlas(items: Slot[], pad = 2): { width: number; height: number; placed: Map<string, Placed> } {
  const sorted = [...items].sort((a, b) => b.h - a.h || b.w - a.w);
  const area = sorted.reduce((s, i) => s + (i.w + 2 * pad) * (i.h + 2 * pad), 0);
  const widest = sorted.reduce((m, i) => Math.max(m, i.w + 2 * pad), 4);
  const width = pot(Math.max(widest, Math.ceil(Math.sqrt(area * 1.25))));
  const placed = new Map<string, Placed>();
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const it of sorted) {
    const w = it.w + 2 * pad;
    const h = it.h + 2 * pad;
    if (x + w > width) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    placed.set(it.key, { x: x + pad, y: y + pad, w: it.w, h: it.h });
    x += w;
    rowH = Math.max(rowH, h);
  }
  return { width, height: pot(y + rowH), placed };
}
