import type { AssetDef, AssetPart } from '../assets';
import { signedVolume, type PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { toPart } from './organic';
import { FACETS, GROUND, SCALE, TILT } from './ribbonData';
import type { JointSpec } from './rigs';

/**
 * A hard-edged low-poly girl modelled from a reference picture. Each flat colour patch of the picture is one thick
 * plate, so seen from the picture's own viewpoint (a front view from a bit above) it matches it point by point.
 * Left is +X, Right is -X, and she faces +Z.
 */

const SIN = Math.sin((TILT * Math.PI) / 180);
const COS = Math.cos((TILT * Math.PI) / 180);

/** From a pixel of the reference picture (x right, y down) and a depth z to a point in metres. */
export const W = (px: number, py: number, z = 0): Vec3 => [(px - 185) / SCALE, ((GROUND - py) / SCALE + z * SIN) / COS, z];

function triangulate(pts: [number, number][]): { ring: number[]; tris: number[][] } {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const ring = Array.from({ length: n }, (_, i) => i);
  if (area < 0) ring.reverse();
  const idx = [...ring];
  const cr = (a: number, b: number, c: number) => (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
  const inTri = (p: number, a: number, b: number, c: number) => cr(a, b, p) >= -1e-9 && cr(b, c, p) >= -1e-9 && cr(c, a, p) >= -1e-9;
  const tris: number[][] = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 2000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const a = idx[(i + idx.length - 1) % idx.length];
      const b = idx[i];
      const c = idx[(i + 1) % idx.length];
      if (cr(a, b, c) <= 1e-9) continue;
      if (idx.some((p) => p !== a && p !== b && p !== c && inTri(p, a, b, c))) continue;
      tris.push([a, b, c]);
      idx.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) {
      // a degenerate corner: drop the flattest vertex and carry on
      let k = 0;
      let best = Infinity;
      for (let i = 0; i < idx.length; i++) {
        const v = Math.abs(cr(idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]));
        if (v < best) (best = v), (k = i);
      }
      idx.splice(k, 1);
    }
  }
  if (idx.length === 3) tris.push([...idx]);
  return { ring, tris };
}

/** A flat plate over a (possibly concave) outline in picture pixels, standing between depths z - t and z. */
function plate(pts: number[], z: number, t: number): PolyMesh {
  const p2: [number, number][] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const q: [number, number] = [pts[i], pts[i + 1]];
    const last = p2[p2.length - 1];
    if (!last || Math.hypot(last[0] - q[0], last[1] - q[1]) > 0.05) p2.push(q);
  }
  if (p2.length > 1 && Math.hypot(p2[0][0] - p2[p2.length - 1][0], p2[0][1] - p2[p2.length - 1][1]) <= 0.05) p2.pop();
  const n = p2.length;
  const { ring, tris } = triangulate(p2);
  const v: number[] = [];
  for (const [x, y] of p2) v.push(...W(x, y, z));
  for (const [x, y] of p2) v.push(...W(x, y, z - t));
  const f: number[][] = tris.map((tr) => [...tr]);
  for (const tr of tris) f.push([tr[2] + n, tr[1] + n, tr[0] + n]);
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    f.push([b, a, a + n, b + n]);
  }
  const m: PolyMesh = { v, f };
  if (signedVolume(m) < 0) m.f = m.f.map((q) => [...q].reverse());
  return m;
}

const parts: AssetPart[] = FACETS.map((f) => toPart(f.step, f.name, plate(f.pts, f.z, f.t), f.color));

// ---- the skeleton, placed on the picture ----
const joint = (key: string, name: string, parent: string | null, px: number, py: number): JointSpec => ({ key, name, parent, pos: W(px, py, 0.03) });
const SPEC: JointSpec[] = [
  joint('hips', 'Hips', null, 186, 268),
  joint('spine', 'Spine', 'hips', 187, 240),
  joint('chest', 'Chest', 'spine', 190, 208),
  joint('neck', 'Neck', 'chest', 193, 174),
  joint('head', 'Head', 'neck', 196, 150),
  joint('headTop', 'Head Top', 'head', 190, 52),
  joint('shoulderL', 'Shoulder Left', 'chest', 226, 202),
  joint('elbowL', 'Elbow Left', 'shoulderL', 252, 228),
  joint('wristL', 'Wrist Left', 'elbowL', 274, 256),
  joint('fingersL', 'Fingers Left', 'wristL', 290, 266),
  joint('hipL', 'Hip Left', 'hips', 205, 292),
  joint('kneeL', 'Knee Left', 'hipL', 217, 382),
  joint('ankleL', 'Ankle Left', 'kneeL', 221, 430),
  joint('toeL', 'Toe Left', 'ankleL', 230, 466),
  joint('shoulderR', 'Shoulder Right', 'chest', 149, 204),
  joint('elbowR', 'Elbow Right', 'shoulderR', 123, 238),
  joint('wristR', 'Wrist Right', 'elbowR', 98, 275),
  joint('fingersR', 'Fingers Right', 'wristR', 82, 298),
  joint('hipR', 'Hip Right', 'hips', 170, 298),
  joint('kneeR', 'Knee Right', 'hipR', 166, 388),
  joint('ankleR', 'Ankle Right', 'kneeR', 148, 444),
  joint('toeR', 'Toe Right', 'ankleR', 152, 484),
];

export const RIBBON: AssetDef = {
  id: 'ribbon',
  rig: () => SPEC,
  name: 'Red Ribbon Girl',
  tagline: 'A hard-edged low-poly girl: blond bob, big red ribbons, cyan-lined top and a faceted red skirt',
  level: 'Medium',
  thumb: { dir: [0, 0.53, 0.85], zoom: 0.7 },
  learn: ['Turn a reference picture into flat colour patches', 'Stack plates in depth so the front ones cover the back ones', 'Keep a character readable with very few triangles', 'Give the pieces a skeleton and pose them'],
  steps: [
    { title: 'Legs and boots', text: 'Look at the reference and find the flat patches: the dark thighs, the pale calves and the pointed red boots. Each patch becomes one thick plate that follows its outline. Build the legs first, because everything else stands on them.', tools: ['Shape: Box', 'Edit shape: move points', 'Duplicate Ctrl+D'] },
    { title: 'Top and glowing lines', text: 'The dark top is three plates: a light upper part, a shadow below it and a darker band at the waist. The two cyan lines are thin plates laid on top. Put the thin ones in front, so nothing is hidden by the shirt.', tools: ['Shape: Box', 'Edit shape: move points', 'Color palette'] },
    { title: 'Arms and hands', text: 'Each arm is a long plate split in a light and a darker strip, with a flat mitten hand. Keep the arms slightly behind the shirt so the sleeves cover the shoulders. One arm is raised a little more than the other.', tools: ['Edit shape: move points', 'Rotate (E)', 'Duplicate Ctrl+D'] },
    { title: 'Head and face', text: 'The face is one light plate with a darker cheek on one side. Two red eyes with a thin black lash line, a small nose shadow and a tiny smile sit on top of it, each a little closer to the camera than the face.', tools: ['Thin plates', 'Color palette', 'Move (W)'] },
    { title: 'Hair and ribbons', text: 'The blond bob is a group of big flat planes in different yellows: the top, the fringe and two long locks that end in points. The two red ribbons are plain triangles standing behind the hair, a large one on the left and a smaller, darker one on the right.', tools: ['Edit shape: Merge points', 'Color palette', 'Layers: order'] },
    { title: 'Skirt and drapes', text: 'The skirt is a five-sided plate in bright red with a lighter facet on the left. Two darker drapes hang from the hips: a long one on the left that ends in a point and a thin one on the right. They sit behind the skirt, so the skirt covers their top.', tools: ['Edit shape: move points', 'Layers: order', 'Color palette'] },
    { title: 'Skeleton: joints and bones', text: 'A skeleton lets a 3D app bend the character. The white balls are joints (hips, knees, shoulders, elbows, wrists, neck, head) and the lines between them are bones. When you export to GLB, every part is skinned to these joints automatically. Press Pose, pick a joint and turn it with the rings: the girl bends right in the editor.', tools: ['Skeleton panel (under Layers)', 'Drag a joint', 'Pose mode: turn a joint'], rig: true },
  ],
  challenge: 'Give her a new outfit: recolor the skirt blue, change the cyan lines to pink, and make the ribbons twice as big by scaling them.',
  parts,
};
