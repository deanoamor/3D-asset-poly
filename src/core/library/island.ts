import type { AssetDef, AssetPart } from '../assets';
import { signedVolume, type PolyMesh } from '../mesh';
import type { Vec3 } from '../types';
import { ball, box, gable, limb, part, tube } from './kit';
import { blob, toPart } from './organic';

/**
 * A low-poly diorama: a square island with a river and waterfall, a white rock mountain, a forest, a camp and animals.
 * Everything is laid out in the pixels of the reference picture (`P`), so the layout can be compared one to one.
 * Units are metres. The island is 16 x 16 and its grass sits at `G`. +X runs toward the front-right, +Z toward the
 * front-left, when looking from the default camera.
 */

const G = 3.1;
const SOIL_TOP = 2.7;

// ---------- colours ----------
const GRASS = '#2fae5c';
const GRASS_D = '#27994f';
const SOIL = '#6b4630';
const SOIL_D = '#58382a';
const WATER = '#78c4ee';
const WATER_L = '#a6dcf6';
const FOAM = '#e8f6fd';
const SAND = '#e6b46b';
const PINE = ['#1e9b52', '#2bb25f', '#1a8a49'];
const PINE_L = ['#a9d85c', '#bfe270', '#93c64c'];
const LEAF = ['#9bd25a', '#76c24c', '#4aa83f', '#2f963f'];
const BARK = '#7a4a2a';
const DEAD = '#3a2b26';
const ROCK = ['#fafaf8', '#f1f1f0', '#e6e8ea', '#dbdfe4', '#cfd4db'];
const ORANGE = ['#ffb13f', '#f59a2e', '#ffc45c'];
const CREAM = '#f1d9a6';
const BROWN_BEAR = '#6b4125';
const DEER = '#b9783f';

// ---------- layout in picture pixels ----------

/** A point on the island from a pixel of the reference picture. `y` is the world height (default: on the grass). */
export function P(sx: number, sy: number, y = G): Vec3 {
  const a = (sx - 281) / 13.44; // x - z
  const b = (sy - 345 + 16.1 * y) / 7.12; // x + z
  return [(a + b) / 2, y, (b - a) / 2];
}
const up = (p: Vec3, dy: number): Vec3 => [p[0], p[1] + dy, p[2]];
const off = (p: Vec3, dx: number, dy: number, dz: number): Vec3 => [p[0] + dx, p[1] + dy, p[2] + dz];

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------- mesh helpers ----------

/** A rough, faceted ellipsoid: every point pushed in or out a little, like a chipped stone or a leafy clump. */
function rough(center: Vec3, radii: Vec3, seed: number, segments = 7, jit = 0.2, flatBottom = 0): PolyMesh {
  const m = blob(center, radii, segments);
  const rnd = rng(seed);
  for (let i = 0; i < m.v.length / 3; i++) {
    const k = 1 + (rnd() - 0.5) * 2 * jit;
    for (let a = 0; a < 3; a++) m.v[i * 3 + a] = center[a] + (m.v[i * 3 + a] - center[a]) * k;
    if (flatBottom && m.v[i * 3 + 1] < center[1] - radii[1] * flatBottom) m.v[i * 3 + 1] = center[1] - radii[1] * flatBottom;
  }
  return m;
}

/** An upright solid with a flat top and bottom over a convex outline (x, z points). */
function prism(poly: [number, number][], y0: number, y1: number): PolyMesh {
  const n = poly.length;
  const v: number[] = [];
  poly.forEach(([x, z]) => v.push(x, y0, z));
  poly.forEach(([x, z]) => v.push(x, y1, z));
  const f: number[][] = [Array.from({ length: n }, (_, i) => n + i), Array.from({ length: n }, (_, i) => n - 1 - i)];
  for (let i = 0; i < n; i++) f.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  const m: PolyMesh = { v, f };
  if (signedVolume(m) < 0) m.f = m.f.map((q) => [...q].reverse());
  return m;
}

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);

// =====================================================================================================
// 0  the island: soil, grass banks, river and waterfall
// =====================================================================================================

const RIVER_X = [-8, -6, -4, -2, 0, 2, 4, 6, 8];
const RIVER_Z = [-0.6, -0.1, 0.4, 0.6, 0.3, -0.1, -0.1, 0.2, 0.4];
const HALF_W = [1.2, 1.25, 1.3, 1.35, 1.4, 1.4, 1.35, 1.3, 1.2];
const bankEdge = (i: number, side: 1 | -1) => RIVER_Z[i] + side * HALF_W[i];

add(box(0, 'Soil', [0, SOIL_TOP / 2, 0], [16, SOIL_TOP, 16], SOIL));
// grass on both banks, one convex strip per stretch of river
for (let i = 0; i < RIVER_X.length - 1; i++) {
  const x0 = RIVER_X[i];
  const x1 = RIVER_X[i + 1];
  add(
    toPart(0, `Grass Bank Left ${i + 1}`, prism([[x0, bankEdge(i, 1)], [x1, bankEdge(i + 1, 1)], [x1, 8], [x0, 8]], SOIL_TOP, G), i % 2 ? GRASS_D : GRASS),
    toPart(0, `Grass Bank Right ${i + 1}`, prism([[x0, -8], [x1, -8], [x1, bankEdge(i + 1, -1)], [x0, bankEdge(i, -1)]], SOIL_TOP, G), i % 2 ? GRASS : GRASS_D),
    toPart(0, `River ${i + 1}`, prism([[x0, bankEdge(i, -1)], [x1, bankEdge(i + 1, -1)], [x1, bankEdge(i + 1, 1)], [x0, bankEdge(i, 1)]], SOIL_TOP - 0.1, G - 0.18), WATER),
  );
}
// ripples and foam
add(
  ...[-5.5, -2.5, 1.0, 4.2].map((x, i) => box(0, `Ripple ${i + 1}`, [x, G - 0.17, RIVER_Z[Math.round((x + 8) / 2)] + (i % 2 ? 0.3 : -0.3)], [1.5, 0.02, 0.18], WATER_L)),
  ...[0, 1, 2].map((i) => box(0, `Soil Layer ${i + 1}`, [8.01, 0.7 + i * 0.85, -3.0 + i * 2.6], [0.04, 0.3, 2.2 - i * 0.3], SOIL_D)),
);
// soil stones set into the two visible sides
const stoneRnd = rng(11);
for (let i = 0; i < 7; i++) {
  const onX = i % 2 === 0;
  const t = -6.5 + i * 2.1;
  const y = 0.8 + stoneRnd() * 1.5;
  add(toPart(0, `Soil Stone ${i + 1}`, rough(onX ? [8.0, y, t] : [t, y, 8.0], onX ? [0.18, 0.45, 0.6] : [0.6, 0.45, 0.18], 100 + i, 6, 0.15), i % 3 ? '#6e5240' : '#3f2a1b'));
}
// waterfall
const WF_Z = RIVER_Z[8];
add(
  box(0, 'Waterfall', [8.08, 1.62, WF_Z], [0.2, 2.5, 2.2], WATER),
  box(0, 'Waterfall Core', [8.2, 1.55, WF_Z], [0.1, 2.3, 1.2], WATER_L),
  box(0, 'Waterfall Tip', [8.16, 0.28, WF_Z], [0.16, 0.5, 1.0], WATER),
  box(0, 'Waterfall Lip', [8.0, G - 0.2, WF_Z], [0.45, 0.14, 2.3], WATER_L),
  ball(0, 'Waterfall Foam 1', [8.45, 0.25, WF_Z - 0.4], [0.8, 0.32, 0.7], FOAM, 6),
  ball(0, 'Waterfall Foam 2', [8.5, 0.22, WF_Z + 0.45], [0.7, 0.28, 0.6], FOAM, 6),
);

// =====================================================================================================
// 1  the white rock mountain with a goat on top
// =====================================================================================================

const RC = P(275, 240);
const stones: { d: [number, number]; y: number; r: Vec3; c: string }[] = [
  { d: [-0.2, 0.2], y: 0.9, r: [3.5, 2.2, 3.0], c: ROCK[1] },
  { d: [-1.7, 0.2], y: 2.6, r: [1.5, 3.4, 1.4], c: ROCK[2] },
  { d: [0.4, -0.5], y: 3.2, r: [2.7, 2.7, 2.4], c: ROCK[0] },
  { d: [0.5, -0.3], y: 5.3, r: [2.1, 2.0, 1.9], c: ROCK[0] },
  { d: [0.5, -0.2], y: 7.0, r: [1.45, 1.35, 1.25], c: ROCK[1] },
  { d: [2.0, 0.5], y: 2.0, r: [1.6, 1.9, 1.7], c: ROCK[2] },
  { d: [-0.3, 1.5], y: 0.9, r: [1.7, 1.1, 1.0], c: ROCK[2] },
  { d: [0.1, -2.0], y: 3.0, r: [2.2, 3.0, 1.7], c: ROCK[2] },
  { d: [-2.2, -0.9], y: 1.2, r: [1.1, 1.6, 1.1], c: ROCK[4] },
  { d: [1.4, 1.5], y: 1.0, r: [1.3, 1.0, 1.0], c: ROCK[2] },
];
const RS = 0.88;
stones.forEach((s, i) => add(toPart(1, `Mountain Rock ${i + 1}`, rough([RC[0] + s.d[0], G + s.y * RS, RC[2] + s.d[1]], [s.r[0], s.r[1] * RS, s.r[2]], 200 + i * 7, 6 + (i % 2), 0.2), s.c)));
add(
  ...[0, 1, 2].map((i) => box(1, `Cut Log ${i + 1}`, [RC[0] + 4.1, G + 0.1 + (i === 2 ? 0.26 : 0), RC[2] + 0.2 + (i % 2) * 0.5 - (i === 2 ? 0.25 : 0)], [0.28, 0.28, 1.1], CREAM, { rot: [0, 25 + i * 8, 0] })),
  ball(1, 'River Stone 1', P(262, 283, G - 0.1), [0.9, 0.5, 0.8], ROCK[1], 6),
  ball(1, 'River Stone 2', P(278, 291, G - 0.1), [0.55, 0.35, 0.5], ROCK[3], 5),
  ...[['Bush 1', 244, 252, 1.15], ['Bush 2', 270, 256, 1.4], ['Bush 3', 298, 257, 1.1], ['Bush 4', 322, 254, 0.7]].map(([n, sx, sy, s], i) =>
    toPart(1, n as string, rough(up(P(sx as number, sy as number), 0.35 * (s as number)), [0.8 * (s as number), 0.6 * (s as number), 0.75 * (s as number)], 300 + i, 6, 0.15), i % 2 ? '#2a9a4a' : '#1f8442'),
  ),
);
// the goat on the peak
{
  const t = [RC[0] + 0.5, G + 8.1 * RS + 0.1, RC[2] - 0.2] as Vec3;
  add(
    toPart(1, 'Goat Body', rough(t, [0.38, 0.24, 0.2], 21, 6, 0.08), '#e9ebee'),
    toPart(1, 'Goat Head', rough(off(t, -0.4, 0.2, 0.02), [0.14, 0.14, 0.12], 22, 6, 0.08), '#e9ebee'),
    ...[[-0.2, 0.12], [-0.2, -0.12], [0.22, 0.12], [0.22, -0.12]].map(([dx, dz], i) => box(1, `Goat Leg ${i + 1}`, off(t, dx, -0.28, dz), [0.07, 0.34, 0.07], '#b5b9bf')),
    box(1, 'Goat Horn Left', off(t, -0.4, 0.4, 0.06), [0.04, 0.2, 0.04], '#8a8f96', { rot: [0, 0, -14] }),
    box(1, 'Goat Horn Right', off(t, -0.4, 0.4, -0.06), [0.04, 0.2, 0.04], '#8a8f96', { rot: [0, 0, -14] }),
  );
}

// =====================================================================================================
// 2  the forest: pines, a leafy tree and two dead trees
// =====================================================================================================

function pine(n: number, base: Vec3, h: number, r: number, cols: string[], seed: number): AssetPart[] {
  const rnd = rng(seed);
  const out: AssetPart[] = [tube(2, `Pine ${n} Trunk`, off(base, 0, h * 0.12, 0), [0.32, h * 0.3, 0.32], BARK, 6, { taper: 0.8 })];
  const tiers = h > 5.5 ? 4 : 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const w = r * 2 * (1 - t * 0.62);
    const th = (h * 0.5) / (tiers * 0.78);
    out.push(part(2, `Pine ${n} Tier ${i + 1}`, 'cone', off(base, 0, h * (0.22 + t * 0.62) + th * 0.42, 0), [w, th * 1.45, w], cols[i % cols.length], { segments: 6, rot: [0, rnd() * 60, 0] }));
  }
  return out;
}
add(
  ...pine(1, P(106, 299), 6.6, 1.55, PINE, 1),
  ...pine(2, P(134, 268), 5.4, 1.3, PINE, 2),
  ...pine(3, P(160, 285), 5.1, 1.25, [PINE[1], PINE[0]], 3),
  ...pine(4, P(136, 322), 4.7, 1.35, PINE_L, 4),
  ...pine(5, P(338, 374), 5.2, 1.25, PINE, 5),
);

// the leafy tree at the right corner
{
  const b = P(451, 287);
  add(
    limb(2, 'Tree Trunk', b, up(b, 3.0), 0.5, 0.36, BARK, 6),
    limb(2, 'Tree Branch', up(b, 2.2), off(b, -0.5, 3.2, 0.2), 0.2, 0.12, BARK, 5),
  );
  const clumps: { d: Vec3; r: Vec3; c: number }[] = [
    { d: [0, 3.75, 0], r: [1.7, 1.5, 1.7], c: 1 },
    { d: [-1.4, 3.35, 0.8], r: [1.2, 1.1, 1.2], c: 2 },
    { d: [1.2, 3.25, -0.9], r: [1.3, 1.2, 1.2], c: 2 },
    { d: [-0.2, 5.05, 0.1], r: [1.4, 1.3, 1.4], c: 0 },
    { d: [1.5, 4.65, 0.6], r: [1.0, 1.0, 1.0], c: 0 },
    { d: [-1.3, 4.65, -0.5], r: [1.1, 1.1, 1.1], c: 1 },
    { d: [0.2, 6.05, 0.3], r: [0.9, 0.8, 0.9], c: 0 },
    { d: [0.8, 2.65, 1.3], r: [0.9, 0.8, 0.9], c: 3 },
  ];
  clumps.forEach((c, i) => add(toPart(2, `Tree Leaves ${i + 1}`, rough(off(b, c.d[0], c.d[1], c.d[2]), c.r, 400 + i, 6, 0.16), LEAF[c.c])));
}

// dead trees: a trunk with a few bare branches
function dead(n: number, base: Vec3, h: number): AssetPart[] {
  const top = up(base, h);
  return [
    limb(2, `Dead Tree ${n} Trunk`, base, top, 0.26, 0.09, DEAD, 5),
    limb(2, `Dead Tree ${n} Branch 1`, up(base, h * 0.55), off(base, -0.7, h * 0.78, 0.1), 0.1, 0.04, DEAD, 4),
    limb(2, `Dead Tree ${n} Branch 2`, up(base, h * 0.7), off(base, 0.55, h * 0.9, -0.1), 0.09, 0.035, DEAD, 4),
    limb(2, `Dead Tree ${n} Branch 3`, up(base, h * 0.4), off(base, 0.6, h * 0.55, 0.2), 0.09, 0.035, DEAD, 4),
    limb(2, `Dead Tree ${n} Branch 4`, up(base, h * 0.82), off(base, -0.3, h * 1.02, 0.3), 0.06, 0.03, DEAD, 4),
  ];
}
add(...dead(1, P(224, 198, G + 1.4), 4.6), ...dead(2, P(396, 262), 5.6));

// soft darker patches on the grass, like the low hills in the picture
{
  const shade = (n: number, pts: [number, number][], c: string) =>
    add(toPart(2, `Grass Shade ${n}`, prism(pts.map(([sx, sy]) => { const q = P(sx, sy); return [q[0], q[2]] as [number, number]; }), G - 0.02, G + 0.03), c));
  shade(1, [[372, 312], [446, 296], [424, 336]], '#25a053');
  shade(3, [[300, 258], [348, 262], [318, 276]], '#31b562');
}

// pine and tree stumps
add(
  tube(2, 'Stump 1', P(370, 262, G + 0.15), [0.5, 0.5, 0.5], '#c58f55', 7),
  tube(2, 'Stump 2', P(332, 256, G + 0.15), [0.42, 0.42, 0.42], '#c58f55', 7),
  tube(2, 'Stump Top 1', P(370, 262, G + 0.42), [0.46, 0.05, 0.46], '#e6c48b', 7),
  tube(2, 'Stump Top 2', P(332, 256, G + 0.37), [0.38, 0.05, 0.38], '#e6c48b', 7),
);

// =====================================================================================================
// 3  the camp: a dirt clearing, two tents, a fire and some people
// =====================================================================================================

const CAMP = P(268, 352);
add(
  part(3, 'Clearing', 'cylinder', up(CAMP, 0.01), [6.8, 0.1, 5.4], SAND, { segments: 10 }),
  part(3, 'Clearing Edge', 'cylinder', up(off(CAMP, 1.6, 0, -1.2), 0.01), [3.4, 0.09, 2.6], SAND, { segments: 8 }),
);
function tent(n: number, at: Vec3, s: number, rot: number, cols: string[]): AssetPart[] {
  return [
    part(3, `Tent ${n}`, 'box', up(at, s * 0.95), [2.3 * s, 1.9 * s, 2.0 * s], cols[0], { mesh: gable, rot: [0, rot, 0] }),
    box(3, `Tent ${n} Pole`, up(at, s * 2.0), [0.07, 0.4 * s, 0.07], '#6d4a2b', { rot: [0, rot, 0] }),
  ];
}
add(...tent(1, P(262, 336), 0.68, 18, ORANGE), ...tent(2, P(299, 351), 0.6, -12, [ORANGE[1]]));
// the fire: stones, logs and flames
{
  const f = P(262, 358);
  [0, 1, 2, 3, 4, 5].forEach((i) => {
    const a = (i / 6) * Math.PI * 2;
    add(toPart(3, `Fire Stone ${i + 1}`, rough(off(f, Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5), [0.17, 0.12, 0.15], 500 + i, 5, 0.1), i % 2 ? '#9a9da2' : '#7e8288'));
  });
  add(
    tube(3, 'Fire Log 1', off(f, 0, 0.14, 0), [0.14, 0.55, 0.14], '#6a4326', 5, { rot: [0, 0, 80] }),
    tube(3, 'Fire Log 2', off(f, 0, 0.18, 0), [0.14, 0.55, 0.14], '#5a3820', 5, { rot: [80, 0, 0] }),
    part(3, 'Flame', 'cone', off(f, 0, 0.5, 0), [0.4, 0.75, 0.4], '#f26b21', { segments: 5 }),
    part(3, 'Flame Core', 'cone', off(f, 0, 0.42, 0), [0.24, 0.5, 0.24], '#ffd24a', { segments: 5 }),
  );
  const person = (n: number, at: Vec3, body: string, hat: string) => [
    tube(3, `Camper ${n} Body`, off(at, 0, 0.2, 0), [0.2, 0.36, 0.2], body, 6),
    ball(3, `Camper ${n} Head`, off(at, 0, 0.43, 0), [0.16, 0.16, 0.16], '#f1c9a0', 6),
    ball(3, `Camper ${n} Hat`, off(at, 0, 0.49, 0), [0.18, 0.1, 0.18], hat, 6),
  ];
  add(...person(1, off(f, -0.9, 0, 0.1), '#f1f3f5', '#d9534f'), ...person(2, off(f, 0.15, 0, 0.95), '#cfd3d8', '#3b6fd4'), ...person(3, off(f, 0.85, 0, -0.55), '#e58b3a', '#f1f3f5'));
}
add(
  tube(3, 'Fallen Log', P(373, 352, G + 0.18), [0.4, 1.9, 0.4], BARK, 6, { rot: [0, -50, 90] }),
  tube(3, 'Fallen Log Cut', P(377, 354, G + 0.18), [0.34, 0.08, 0.34], '#e0b57c', 6, { rot: [0, -50, 90] }),
);

// =====================================================================================================
// 4  animals: a bear, a deer
// =====================================================================================================

{
  const b = P(428, 287);
  add(
    toPart(4, 'Bear Body', rough(off(b, 0, 0.82, 0), [1.1, 0.72, 0.62], 41, 6, 0.06), BROWN_BEAR),
    toPart(4, 'Bear Hump', rough(off(b, 0.4, 1.3, 0), [0.6, 0.42, 0.5], 42, 6, 0.06), '#5a3820'),
    toPart(4, 'Bear Head', rough(off(b, -1.2, 1.0, 0), [0.44, 0.38, 0.38], 43, 6, 0.06), BROWN_BEAR),
    toPart(4, 'Bear Snout', rough(off(b, -1.6, 0.88, 0), [0.22, 0.17, 0.19], 44, 5, 0.05), '#a07852'),
    ball(4, 'Bear Nose', off(b, -1.8, 0.94, 0), [0.09, 0.08, 0.09], '#222222', 4),
    ball(4, 'Bear Ear Left', off(b, -1.1, 1.38, 0.28), [0.18, 0.18, 0.13], '#5a3820', 5),
    ball(4, 'Bear Ear Right', off(b, -1.1, 1.38, -0.28), [0.18, 0.18, 0.13], '#5a3820', 5),
    ...[[-0.7, 0.34], [-0.7, -0.34], [0.7, 0.34], [0.7, -0.34]].map(([dx, dz], i) => limb(4, `Bear Leg ${i + 1}`, off(b, dx, 0.6, dz), off(b, dx, 0.0, dz), 0.36, 0.3, i % 2 ? '#5a3820' : BROWN_BEAR, 5)),
  );
}
{
  const d = P(163, 293);
  const k = 1.4;
  const o = (dx: number, dy: number, dz: number): Vec3 => off(d, dx * k, dy * k, dz * k);
  add(
    toPart(4, 'Deer Body', rough(o(0, 0.6, 0), [0.42 * k, 0.26 * k, 0.2 * k], 51, 6, 0.05), DEER),
    limb(4, 'Deer Neck', o(-0.28, 0.72, 0), o(-0.5, 1.12, 0), 0.16 * k, 0.11 * k, DEER, 5),
    toPart(4, 'Deer Head', rough(o(-0.62, 1.2, 0), [0.14 * k, 0.1 * k, 0.09 * k], 52, 5, 0.04), DEER),
    ...[[-0.25, 0.1], [-0.25, -0.1], [0.28, 0.1], [0.28, -0.1]].map(([dx, dz], i) => limb(4, `Deer Leg ${i + 1}`, o(dx, 0.5, dz), o(dx, 0.0, dz), 0.06 * k, 0.045 * k, '#8a5a30', 4)),
    limb(4, 'Deer Antler Left', o(-0.62, 1.28, 0.05), o(-0.55, 1.58, 0.15), 0.035 * k, 0.02 * k, '#e8d7b0', 4),
    limb(4, 'Deer Antler Right', o(-0.62, 1.28, -0.05), o(-0.55, 1.58, -0.15), 0.035 * k, 0.02 * k, '#e8d7b0', 4),
  );
}

// =====================================================================================================
// 5  small details: a signpost, mushrooms, flowers, grass tufts
// =====================================================================================================

{
  const s = P(192, 285);
  add(limb(5, 'Signpost', s, up(s, 2.1), 0.14, 0.12, '#e3b56a', 5), box(5, 'Sign Arm', up(s, 1.7), [0.9, 0.12, 0.1], '#e3b56a', { rot: [0, 30, 0] }), box(5, 'Sign Arm Low', up(s, 1.35), [0.6, 0.1, 0.1], '#d9a35a', { rot: [0, 12, 0] }));
}
[[155, 303], [118, 305], [388, 309]].forEach(([sx, sy], i) => {
  const m = P(sx, sy);
  add(tube(5, `Mushroom ${i + 1} Stem`, up(m, 0.12), [0.1, 0.24, 0.1], '#f1ead9', 5), ball(5, `Mushroom ${i + 1} Cap`, up(m, 0.28), [0.34, 0.2, 0.34], '#d9392b', 6), ball(5, `Mushroom ${i + 1} Dot`, off(m, 0.05, 0.38, 0.04), [0.08, 0.04, 0.08], '#ffffff', 4));
});
[[422, 311, '#f6d242'], [431, 316, '#f6d242'], [281, 394, '#f4f1ec'], [212, 296, '#f4f1ec'], [100, 312, '#f2b7c9']].forEach(([sx, sy, c], i) => {
  add(ball(5, `Flower ${i + 1}`, up(P(sx as number, sy as number), 0.04), [0.17, 0.12, 0.17], c as string, 5));
});
[[272, 272], [276, 398], [356, 304], [120, 270]].forEach(([sx, sy], i) => {
  const g = P(sx, sy);
  add(part(5, `Grass Tuft ${i + 1}`, 'cone', up(g, 0.2), [0.3, 0.45, 0.3], '#1f8a47', { segments: 4 }), part(5, `Grass Tuft ${i + 1} Side`, 'cone', off(g, 0.18, 0.17, 0.1), [0.22, 0.34, 0.22], '#2a9a4f', { segments: 4 }));
});
add(
  ball(5, 'Small Stone 1', P(325, 318, G - 0.12), [0.4, 0.22, 0.35], ROCK[2], 5),
  ball(5, 'Small Stone 2', P(206, 330), [0.28, 0.16, 0.24], ROCK[3], 5),
);

export const ISLAND: AssetDef = {
  id: 'island',
  name: 'Forest Island',
  tagline: 'A floating diorama: river, waterfall, white rock mountain, pines, a camp and animals',
  level: 'Detailed',
  thumb: { dir: [1, 0.78, 1], zoom: 0.62 },
  learn: ['Build a scene from a reference picture by turning pixels into positions', 'Rough up spheres into faceted rocks and leafy clumps with Edit shape', 'Stack cones into pines and tilt thin boxes into logs and tents', 'Cut a river into the ground with convex strips'],
  steps: [
    { title: 'Island, river and waterfall', text: 'Start with a big brown Box for the soil. The grass is a row of flat strips on each side of a winding river, so the water sits lower than the banks. At the front edge the river becomes a thin blue sheet that falls over the side.', tools: ['Shape: Box', 'Edit shape', 'Snap (0.25 m)'] },
    { title: 'White rock mountain', text: 'The mountain is ten rough spheres piled on each other. In Edit shape, push every point in or out a little so each stone gets sharp facets, then color the lit side white and the shadow side light gray. A small goat stands on the peak.', tools: ['Shape: Sphere, 7 sides', 'Edit shape (move points)', 'Color palette'] },
    { title: 'Pines, leafy tree and dead trees', text: 'A pine is a thin trunk with three or four Cones stacked and each turned a little, so the shape feels hand made. The leafy tree is a group of rough green spheres on a brown trunk. Dead trees are thin tapered cylinders with a few branches.', tools: ['Shape: Cone, 6 sides', 'Rotate (E)', 'Duplicate Ctrl+D'] },
    { title: 'Camp', text: 'A tan flat Cylinder is the clearing. Tents are boxes whose top collapsed into a ridge with Merge points, tinted in two oranges. The fire is a ring of small stones, two crossed logs and two Cones for the flame, with tiny campers around it.', tools: ['Merge points', 'Shape: Cone', 'Shape: Cylinder'] },
    { title: 'Bear and deer', text: 'Animals are a few rough spheres for the body, head and snout, plus short tapered legs. The bear is a heavy brown shape with a hump on its back, the deer is slim and has two thin antlers.', tools: ['Shape: Sphere', 'Tapered cylinders', 'Mirror ideas: duplicate and move'] },
    { title: 'Small details', text: 'A signpost, red mushrooms with white dots, flowers and grass tufts make the island feel lived in. Add them last and keep each one tiny, so they never fight with the big shapes. Group everything as Forest Island.', tools: ['Shape: Sphere, 5 sides', 'Group Ctrl+G'] },
  ],
  challenge: 'Make it winter: turn the grass white, the water pale gray, add a white cap on each pine tier, and put snow on the tents.',
  parts,
};
