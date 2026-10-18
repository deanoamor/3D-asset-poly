import { signedVolume, type PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { onSurface } from './organic';

/**
 * Flat shapes pressed onto a curved surface, like stickers: anime eyes, lashes, brows, mouths and blush. The outline
 * is drawn in "ray" units around `center` (x right, y up, as seen from the front), every point is shot from `from`
 * onto the surface, and the shape gets a small thickness so it is a closed, editable part.
 */

type P2 = [number, number];

function earClip(pts: P2[]): { tris: number[][]; order: number[] } {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const idx = Array.from({ length: n }, (_, i) => i);
  if (area < 0) idx.reverse();
  const cr = (a: number, b: number, c: number) => (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
  const inside = (p: number, a: number, b: number, c: number) => cr(a, b, p) >= -1e-12 && cr(b, c, p) >= -1e-12 && cr(c, a, p) >= -1e-12;
  const tris: number[][] = [];
  const ring = [...idx];
  let guard = 0;
  while (ring.length > 3 && guard++ < 4000) {
    let cut = false;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[(i + ring.length - 1) % ring.length];
      const b = ring[i];
      const c = ring[(i + 1) % ring.length];
      if (cr(a, b, c) <= 1e-12) continue;
      if (ring.some((p) => p !== a && p !== b && p !== c && inside(p, a, b, c))) continue;
      tris.push([a, b, c]);
      ring.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) ring.splice(0, 1);
  }
  if (ring.length === 3) tris.push([...ring]);
  return { tris, order: idx };
}

/** Points of an ellipse (for irises, pupils, highlights and blush). */
export const oval = (cx: number, cy: number, rx: number, ry: number, n = 14): P2[] => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry] as P2);

/**
 * A sticker on `m`. `pts` is the outline around `center` in ray units; `mirror` -1 flips it for the other side of the
 * face. `lift` raises it off the surface (stack layers with growing lifts) and `thick` is its thickness.
 */
export function decal(m: PolyMesh, from: Vec3, center: P2, pts: P2[], lift: number, thick = 0.002, mirror: 1 | -1 = 1): PolyMesh {
  const raw: P2[] = pts.map(([u, v]) => [center[0] + mirror * u, center[1] + v]);
  // add points along long edges so the sticker bends with the surface instead of cutting through it
  const outline: P2[] = [];
  raw.forEach((a, i) => {
    const b = raw[(i + 1) % raw.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.03));
    for (let k = 0; k < steps; k++) outline.push([a[0] + ((b[0] - a[0]) * k) / steps, a[1] + ((b[1] - a[1]) * k) / steps]);
  });
  const { tris, order } = earClip(outline);
  const n = outline.length;
  const v: number[] = [];
  const back: number[] = [];
  for (const [u, w] of outline) {
    const h = onSurface(m, from, [u, w, 1], 0);
    v.push(h.p[0] + h.n[0] * (lift + thick), h.p[1] + h.n[1] * (lift + thick), h.p[2] + h.n[2] * (lift + thick));
    back.push(h.p[0] + h.n[0] * lift, h.p[1] + h.n[1] * lift, h.p[2] + h.n[2] * lift);
  }
  v.push(...back);
  const f: number[][] = tris.map((t) => [...t]);
  for (const t of tris) f.push([t[2] + n, t[1] + n, t[0] + n]);
  for (let i = 0; i < n; i++) {
    const a = order[i];
    const b = order[(i + 1) % n];
    f.push([b, a, a + n, b + n]);
  }
  const mesh: PolyMesh = { v, f };
  if (signedVolume(mesh) < 0) mesh.f = mesh.f.map((q) => [...q].reverse());
  return mesh;
}
