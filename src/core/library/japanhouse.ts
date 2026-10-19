import type { AssetDef, AssetPart } from '../assets';
import type { Vec3 } from '../types';
import { LR, applyStyle, ball, box, gable, part, tube } from './kit';

/**
 * A traditional Japanese house (minka): a stone footing, a dark timber frame with plaster walls, sliding shoji doors
 * onto a wooden veranda (engawa), a side entrance with a noren curtain and a paper lantern, a wide grey-tiled roof with
 * ridge ornaments, and a small garden with a gate, bamboo fence, pond, stone lantern and trees.
 * The front faces +Z and the ridge runs along X.
 */

const MOSS = '#86a257';
const MOSS_D = '#738f49';
const GRAVEL = '#d9cfb4';
const GRAVEL_D = '#bfb394';
const STONE = ['#9d9c96', '#8a8983', '#aaa9a2', '#94938c'];
const PLASTER = '#efe9db';
const WOOD = '#4a3223';
const WOOD_M = '#6e4b32';
const WOOD_L = '#a87a4e';
const PAPER = '#fbf8ee';
const TILE = '#4f5a66';
const TILE_L = '#677582';
const TILE_D = '#38424c';
const ORNAMENT = '#8d98a3';
const INDIGO = '#2c3f6e';
const RED = '#c9382f';
const GLASS = '#cfe3e3';
const BAMBOO = '#c9b96c';
const BAMBOO_D = '#a99a4f';
const WATER = '#5b9fb5';
const PINE = ['#2f5d3a', '#3a6e44', '#467f4f'];
const MAPLE = ['#d1472f', '#e2692f', '#c23a3a'];

// roof geometry: half depth 4.4 (z), rises 2.4 over it
const EAVE_Y = 3.05;
const RIDGE_Y = 5.45;
const HALF = 4.4;
const SLOPE = (Math.atan2(RIDGE_Y - EAVE_Y, HALF) * 180) / Math.PI; // ~28.6 degrees

/** A point on the roof surface: t = 0 at the eave, 1 at the ridge; side +1 = front (+z), -1 = back. */
const roofPoint = (side: 1 | -1, t: number, lift = 0.05, x = 0): Vec3 => {
  const z = side * (HALF - HALF * t);
  const y = EAVE_Y + (RIDGE_Y - EAVE_Y) * t;
  const nz = side * Math.sin((SLOPE * Math.PI) / 180);
  const ny = Math.cos((SLOPE * Math.PI) / 180);
  return [x, y + ny * lift, z + nz * lift];
};

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);

// 0 ground and stone footing
add(
  box(0, 'Ground', [0, 0.02, 3.5], [15, 0.04, 18], MOSS),
  box(0, 'Ground Patch', [-5.2, 0.045, 0.5], [3.0, 0.012, 3.4], MOSS_D),
  box(0, 'Foundation', [0, 0.25, 0], [8.6, 0.5, 6.6], STONE[0]),
  ...Array.from({ length: 6 }, (_, i) => box(0, `Foundation Stone ${i + 1}`, [-3.5 + i * 1.4, 0.24, 3.33], [1.2, 0.3, 0.06], STONE[(i + 1) % 4])),
  ...Array.from({ length: 5 }, (_, i) => box(0, `Side Stone ${i + 1}`, [4.33, 0.24, -2.6 + i * 1.3], [0.06, 0.3, 1.1], STONE[i % 4])),
  ...Array.from({ length: 4 }, (_, i) => box(0, `Deck Footing ${i + 1}`, [-4.2 + i * 1.97, 0.25, 4.15], [0.34, 0.5, 0.34], STONE[(i + 2) % 4])),
);

// 1 walls and timber frame
add(
  box(1, 'Walls', [0, 1.75, 0], [8, 2.5, 6], PLASTER),
  box(1, 'Lower Wall', [0, 0.95, 0], [8.06, 0.9, 6.06], WOOD),
  ...[[4.0, 3.0], [-4.0, 3.0], [4.0, -3.0], [-4.0, -3.0]].map(([x, z], i) => box(1, `Corner Post ${i + 1}`, [x, 1.75, z], [0.26, 2.5, 0.26], WOOD)),
  box(1, 'Front Top Beam', [0, 2.93, 3.03], [8.2, 0.22, 0.18], WOOD),
  box(1, 'Back Top Beam', [0, 2.93, -3.03], [8.2, 0.22, 0.18], WOOD),
  ...LR('Side Top Beam', (s, n) => box(1, n, [s * 4.03, 2.93, 0], [0.18, 0.22, 6.2], WOOD)),
  box(1, 'Back Mid Beam', [0, 2.05, -3.03], [8.0, 0.1, 0.1], WOOD_M),
  ...LR('Side Mid Beam', (s, n) => box(1, n, [s * 4.03, 2.05, 0], [0.1, 0.1, 6.0], WOOD_M)),
  ...[-2, 0, 2].map((x, i) => box(1, `Back Post ${i + 1}`, [x, 1.75, -3.03], [0.16, 2.5, 0.12], WOOD_M)),
  ...[-2, 0, 2].map((x, i) => box(1, `Side Post Left ${i + 1}`, [4.03, 1.75, x], [0.12, 2.5, 0.16], WOOD_M)),
  box(1, 'Entrance Divider Post', [1.78, 1.75, 3.04], [0.2, 2.5, 0.16], WOOD),
);

// 2 roof
add(
  part(2, 'Roof', 'box', [0, 4.25, 0], [10.4, 2.4, 8.8], TILE, { mesh: gable }),
  box(2, 'Ridge Cap', [0, 5.47, 0], [10.6, 0.2, 0.5], TILE_D),
  ...[0.14, 0.28, 0.42, 0.56, 0.7, 0.84].flatMap((t, i) => [
    box(2, `Front Tile Row ${i + 1}`, roofPoint(1, t), [10.4, 0.03, 0.14], i % 2 ? TILE_L : TILE_D, { rot: [SLOPE, 0, 0] }),
    box(2, `Back Tile Row ${i + 1}`, roofPoint(-1, t), [10.4, 0.03, 0.14], i % 2 ? TILE_L : TILE_D, { rot: [-SLOPE, 0, 0] }),
  ]),
  box(2, 'Front Eave Edge', [0, 3.08, 4.38], [10.4, 0.18, 0.12], TILE_D),
  box(2, 'Back Eave Edge', [0, 3.08, -4.38], [10.4, 0.18, 0.12], TILE_D),
  ...LR('Barge Board Front', (s, n) => box(2, n, roofPoint(1, 0.5, 0.06, s * 5.2), [0.16, 0.14, 5.1], WOOD, { rot: [SLOPE, 0, 0] })),
  ...LR('Barge Board Back', (s, n) => box(2, n, roofPoint(-1, 0.5, 0.06, s * 5.2), [0.16, 0.14, 5.1], WOOD, { rot: [-SLOPE, 0, 0] })),
  ...LR('Ridge Ornament', (s, n) => box(2, n, [s * 5.1, 5.7, 0], [0.4, 0.4, 0.5], ORNAMENT)),
  ...LR('Ridge Ornament Top', (s, n) => box(2, n, [s * 5.1, 6.0, 0], [0.22, 0.28, 0.3], ORNAMENT, { rot: [0, 0, s * 12] })),
  ...Array.from({ length: 11 }, (_, i) => box(2, `Front Rafter ${i + 1}`, [-4.5 + i * 0.9, 3.0, 3.8], [0.12, 0.12, 1.2], WOOD_M)),
  ...Array.from({ length: 11 }, (_, i) => box(2, `Back Rafter ${i + 1}`, [-4.5 + i * 0.9, 3.0, -3.8], [0.12, 0.12, 1.2], WOOD_M)),
);

// 3 shoji doors onto the veranda
add(
  box(3, 'Veranda Deck', [-1.25, 0.5, 3.75], [6.0, 0.14, 1.5], WOOD_L),
  ...Array.from({ length: 7 }, (_, i) => box(3, `Deck Board ${i + 1}`, [-1.25, 0.58, 3.1 + i * 0.2], [6.0, 0.02, 0.03], WOOD_M)),
  box(3, 'Shoji Sill', [-1.1, 0.62, 3.04], [5.8, 0.1, 0.12], WOOD),
  box(3, 'Shoji Header', [-1.1, 2.83, 3.04], [5.8, 0.1, 0.12], WOOD),
  ...[-3.2, -1.8, -0.4, 1.0].flatMap((x, i) => {
    const k = i + 1;
    return [
      box(3, `Shoji Frame ${k}`, [x, 1.72, 3.07], [1.38, 2.1, 0.07], WOOD_M),
      box(3, `Shoji Paper ${k}`, [x, 1.78, 3.1], [1.24, 1.9, 0.05], PAPER),
      box(3, `Shoji Kick Board ${k}`, [x, 0.92, 3.12], [1.28, 0.5, 0.04], WOOD),
      ...[-0.31, 0.31].map((dx, j) => box(3, `Shoji Bar ${k}-${j + 1}`, [x + dx, 1.78, 3.14], [0.035, 1.9, 0.03], WOOD_M)),
      ...[0, 1, 2, 3].map((j) => box(3, `Shoji Rail ${k}-${j + 1}`, [x, 1.15 + j * 0.5, 3.14], [1.24, 0.035, 0.03], WOOD_M)),
    ];
  }),
  // the entrance: a lattice door with frosted glass, a stone step, a noren curtain and a paper lantern
  box(3, 'Entrance Slab', [3.0, 0.2, 3.8], [2.4, 0.4, 1.6], STONE[2]),
  box(3, 'Entrance Step', [3.0, 0.1, 4.8], [1.8, 0.2, 0.6], STONE[3]),
  box(3, 'Entrance Frame', [2.95, 1.75, 3.06], [1.5, 2.3, 0.08], WOOD),
  box(3, 'Entrance Glass', [2.95, 1.8, 3.11], [1.18, 1.9, 0.04], GLASS),
  ...[-0.39, 0, 0.39].map((dx, i) => box(3, `Entrance Bar ${i + 1}`, [2.95 + dx, 1.8, 3.15], [0.05, 1.9, 0.04], WOOD_M)),
  ...[0, 1, 2, 3].map((i) => box(3, `Entrance Rail ${i + 1}`, [2.95, 1.0 + i * 0.5, 3.15], [1.18, 0.05, 0.04], WOOD_M)),
  box(3, 'Entrance Kick Board', [2.95, 0.72, 3.12], [1.18, 0.3, 0.06], WOOD),
  tube(3, 'Noren Rod', [2.95, 2.6, 3.14], [0.04, 1.3, 0.04], WOOD, 5, { rot: [0, 0, 90] }),
  ...[-0.42, 0, 0.42].map((dx, i) => box(3, `Noren ${i + 1}`, [2.95 + dx, 2.24, 3.15], [0.4, 0.74, 0.03], INDIGO)),
  ...[-0.42, 0, 0.42].map((dx, i) => box(3, `Noren Mark ${i + 1}`, [2.95 + dx, 2.3, 3.175], [0.16, 0.16, 0.02], PAPER)),
  tube(3, 'Lantern Bracket', [3.9, 2.6, 3.04], [0.04, 0.4, 0.04], WOOD, 5, { rot: [0, 0, 90] }),
  ball(3, 'Paper Lantern', [3.74, 2.32, 3.1], [0.3, 0.4, 0.3], RED, 6),
  box(3, 'Paper Lantern Cap', [3.74, 2.55, 3.1], [0.2, 0.05, 0.2], '#2a2a2a'),
  box(3, 'Paper Lantern Base', [3.74, 2.09, 3.1], [0.2, 0.05, 0.2], '#2a2a2a'),
);

// 4 veranda posts, side windows and the small details
add(
  ...[-4.2, -2.23, -0.26, 1.7].map((x, i) => box(4, `Veranda Post ${i + 1}`, [x, 1.78, 4.15], [0.2, 2.5, 0.2], WOOD)),
  box(4, 'Veranda Beam', [-1.25, 2.93, 4.15], [6.1, 0.22, 0.2], WOOD),
  ...LR('Side Window Frame', (s, n) => box(4, n, [s * 4.06, 1.9, 0.5], [0.08, 1.2, 1.6], WOOD_M)),
  ...LR('Side Window Paper', (s, n) => box(4, n, [s * 4.1, 1.9, 0.5], [0.05, 1.0, 1.4], PAPER)),
  ...LR('Side Window Bar', (s, n) => box(4, n, [s * 4.13, 1.9, 0.5], [0.03, 1.0, 0.04], WOOD_M)),
  ...LR('Side Window Rail', (s, n) => box(4, n, [s * 4.13, 1.9, 0.5], [0.03, 0.04, 1.4], WOOD_M)),
  ...[-1.6, 1.6].map((x, i) => box(4, `Back Window Frame ${i + 1}`, [x, 1.9, -3.1], [1.6, 1.2, 0.08], WOOD_M)),
  ...[-1.6, 1.6].map((x, i) => box(4, `Back Window Paper ${i + 1}`, [x, 1.9, -3.14], [1.4, 1.0, 0.05], PAPER)),
  ...[-1.6, 1.6].map((x, i) => box(4, `Back Window Bar ${i + 1}`, [x, 1.9, -3.17], [0.04, 1.0, 0.03], WOOD_M)),
  // a wind chime and a hanging plant pot under the eave
  tube(4, 'Chime String', [-3.3, 2.85, 4.4], [0.012, 0.3, 0.012], '#888', 4),
  tube(4, 'Chime Bell', [-3.3, 2.62, 4.4], [0.16, 0.16, 0.16], '#7fb3c9', 6, { taper: 0.6 }),
  box(4, 'Chime Paper', [-3.3, 2.5, 4.4], [0.06, 0.22, 0.01], '#e9a3b0'),
  box(4, 'Veranda Cushion', [-2.2, 0.64, 3.7], [0.7, 0.1, 0.7], INDIGO),
  box(4, 'Tea Tray', [-1.0, 0.62, 3.75], [0.5, 0.06, 0.36], WOOD),
  tube(4, 'Tea Pot', [-1.0, 0.73, 3.75], [0.18, 0.18, 0.18], '#c9d4c2', 6),
);

// 5 garden: gate, path, bamboo fence, pond, raked gravel, stone lantern and trees
const fenceX = [...Array.from({ length: 11 }, (_, i) => -6.3 + i * 0.46), ...Array.from({ length: 11 }, (_, i) => 1.7 + i * 0.46)];
add(
  ...Array.from({ length: 7 }, (_, i) => box(5, `Path Stone ${i + 1}`, [i % 2 ? 0.2 : -0.2, 0.05, 5.4 + i * 0.55], [0.9, 0.06, 0.45], STONE[(i + 2) % 4])),
  ...fenceX.map((x, i) => tube(5, `Bamboo Pole ${i + 1}`, [x, 0.75, 9.2], [0.11, 1.5, 0.11], i % 2 ? BAMBOO : BAMBOO_D, 5)),
  ...[0.35, 0.95, 1.35].flatMap((y, i) => [
    box(5, `Fence Rail Left ${i + 1}`, [-3.9, y, 9.3], [5.0, 0.07, 0.05], BAMBOO_D),
    box(5, `Fence Rail Right ${i + 1}`, [3.9, y, 9.3], [5.0, 0.07, 0.05], BAMBOO_D),
  ]),
  ...LR('Gate Post', (s, n) => box(5, n, [s * 1.35, 1.35, 9.2], [0.28, 2.7, 0.28], WOOD)),
  box(5, 'Gate Beam', [0, 2.55, 9.2], [3.2, 0.22, 0.3], WOOD),
  part(5, 'Gate Roof', 'box', [0, 3.1, 9.2], [3.6, 0.9, 1.6], TILE, { mesh: gable }),
  box(5, 'Gate Ridge', [0, 3.52, 9.2], [3.7, 0.1, 0.24], TILE_D),
  // pond with a rim of rocks, koi and lily pads
  box(5, 'Pond', [-4.4, 0.06, 6.4], [3.0, 0.1, 2.0], WATER),
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return ball(5, `Pond Rock ${i + 1}`, [-4.4 + Math.cos(a) * 1.65, 0.17, 6.4 + Math.sin(a) * 1.15], [0.6 + (i % 3) * 0.14, 0.34, 0.5 + (i % 2) * 0.16], STONE[i % 4], 5);
  }),
  ball(5, 'Koi 1', [-4.8, 0.14, 6.3], [0.34, 0.1, 0.14], '#f08a3c', 5),
  ball(5, 'Koi 2', [-3.8, 0.14, 6.7], [0.3, 0.1, 0.12], '#f4efe6', 5),
  ball(5, 'Koi 3', [-4.3, 0.14, 6.0], [0.3, 0.1, 0.12], '#e55a3a', 5),
  ...[[-3.9, 6.1], [-5.0, 6.8]].map(([x, z], i) => tube(5, `Lily Pad ${i + 1}`, [x, 0.12, z], [0.34, 0.02, 0.34], '#5e9a4a', 8)),
  // raked gravel garden with two rocks
  box(5, 'Gravel Bed', [4.2, 0.04, 6.4], [3.4, 0.05, 2.6], GRAVEL),
  ...Array.from({ length: 6 }, (_, i) => box(5, `Gravel Line ${i + 1}`, [4.2, 0.07, 5.6 + i * 0.32], [3.2, 0.015, 0.05], GRAVEL_D)),
  ball(5, 'Garden Rock 1', [3.7, 0.3, 6.5], [0.8, 0.55, 0.7], STONE[1], 5),
  ball(5, 'Garden Rock 2', [4.6, 0.22, 6.0], [0.5, 0.4, 0.45], STONE[3], 5),
  // stone lantern
  box(5, 'Stone Lantern Base', [-1.9, 0.12, 5.5], [0.5, 0.24, 0.5], STONE[0]),
  tube(5, 'Stone Lantern Post', [-1.9, 0.62, 5.5], [0.2, 0.76, 0.2], STONE[2], 6),
  box(5, 'Stone Lantern Seat', [-1.9, 1.04, 5.5], [0.5, 0.1, 0.5], STONE[0]),
  box(5, 'Stone Lantern Light Box', [-1.9, 1.27, 5.5], [0.34, 0.36, 0.34], STONE[3]),
  ball(5, 'Stone Lantern Glow', [-1.9, 1.27, 5.5], [0.3, 0.2, 0.3], '#ffe58a', 5),
  part(5, 'Stone Lantern Roof', 'cone', [-1.9, 1.58, 5.5], [0.76, 0.3, 0.76], STONE[1], { segments: 4 }),
  ball(5, 'Stone Lantern Top', [-1.9, 1.8, 5.5], [0.16, 0.16, 0.16], STONE[2], 5),
  // a pine tree with cloud-pruned branches
  tube(5, 'Pine Trunk', [-6.2, 1.4, 2.4], [0.5, 2.8, 0.5], WOOD_M, 6, { taper: 0.7 }),
  tube(5, 'Pine Branch Left', [-6.9, 2.3, 2.4], [0.2, 1.6, 0.2], WOOD_M, 5, { rot: [0, 0, 65] }),
  tube(5, 'Pine Branch Right', [-5.4, 2.7, 2.4], [0.18, 1.4, 0.18], WOOD_M, 5, { rot: [0, 0, -60] }),
  ball(5, 'Pine Cloud Top', [-6.2, 3.55, 2.4], [2.4, 0.9, 2.2], PINE[0], 7),
  ball(5, 'Pine Cloud Left', [-7.6, 2.75, 2.4], [2.0, 0.75, 1.8], PINE[1], 7),
  ball(5, 'Pine Cloud Right', [-4.7, 3.05, 2.4], [1.8, 0.7, 1.7], PINE[2], 7),
  // a red maple
  tube(5, 'Maple Trunk', [6.2, 1.1, 1.6], [0.36, 2.2, 0.36], WOOD, 6, { taper: 0.7 }),
  ball(5, 'Maple Foliage Low', [6.2, 2.5, 1.6], [2.4, 1.3, 2.4], MAPLE[0], 6),
  ball(5, 'Maple Foliage Mid', [6.3, 3.3, 1.6], [1.9, 1.2, 1.9], MAPLE[1], 6),
  ball(5, 'Maple Foliage Top', [6.1, 4.0, 1.6], [1.2, 0.9, 1.2], MAPLE[2], 6),
  // low shrubs along the house
  ball(5, 'Shrub 1', [-4.6, 0.35, 2.9], [0.9, 0.7, 0.9], PINE[1], 6),
  ball(5, 'Shrub 2', [4.7, 0.35, 3.1], [0.9, 0.7, 0.9], PINE[0], 6),
  ball(5, 'Shrub 3', [4.6, 0.3, -1.4], [0.8, 0.6, 0.8], PINE[2], 6),
);

applyStyle(parts, [
  [/^(Ground)/, { paint: 0.4 }],
  [/^(Walls|Lower Wall)/, { paint: 0.3 }],
  [/^(Roof$|Gate Roof)/, { paint: 0.45 }],
  [/^(Pine Cloud|Maple Foliage|Shrub)/, { smooth: true, paint: 0.5 }],
  [/^(Pine Trunk|Maple Trunk)/, { smooth: true, paint: 0.4 }],
  [/Stone|^Foundation$|^Pond Rock|^Garden Rock|Path/, { paint: 0.35 }],
]);

export const JAPANHOUSE: AssetDef = {
  id: 'japanhouse',
  name: 'Japanese House',
  tagline: 'A traditional minka with a grey-tiled roof, shoji doors, a veranda, a noren entrance and a garden with a pond',
  level: 'Detailed',
  thumb: { dir: [0.75, 0.5, 1], zoom: 0.66 },
  learn: ['Make a wide roof with Merge points and lay tile rows on its slope', 'Build sliding shoji doors from a frame, paper and thin lattice bars', 'Layer a veranda, posts and rafters under a deep eave', 'Dress a garden: gate, bamboo fence, pond, stone lantern and trees'],
  steps: [
    { title: 'Ground and stone footing', text: 'A green Box is the ground and a grey Box is the stone footing, with thin stone boxes in different greys along the front and side. Four small stone blocks will hold up the veranda.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Color palette'] },
    { title: 'Walls and timber frame', text: 'The walls are a cream plaster Box with a dark wood Box slightly larger and shorter under it for the lower wall. Dark posts on the corners and beams along the top frame the house, and thinner posts and a mid beam on the back and sides give it the timber look.', tools: ['Thin boxes', 'Duplicate Ctrl+D', 'Mirror ideas: duplicate and move'] },
    { title: 'Roof', text: 'The roof is a wide Box. In Edit shape, select the top points at each end and use Merge points to collapse the top into a ridge. Lay thin darker and lighter boxes along each slope as tile rows, rotated by the roof angle (about 29 degrees). Add a dark ridge cap, ornaments at both ends, wooden barge boards along the gable edges and a row of rafter ends under the eaves.', tools: ['Edit shape (Tab)', 'Merge points', 'Rotate (E): 29°', 'Duplicate Ctrl+D'] },
    { title: 'Shoji doors and entrance', text: 'Each shoji door is a wooden frame with a white paper box in front, a dark kick board at the bottom and thin bars that make the grid. Build one and duplicate it three times along a wooden sill. The entrance is a lattice door with frosted glass, an indigo noren curtain made of three panels on a rod, a stone step and a red paper lantern.', tools: ['Thin boxes', 'Shape: Cylinder for the rod', 'Duplicate Ctrl+D'] },
    { title: 'Veranda and details', text: 'The veranda (engawa) is a wooden deck under the deep eave, held by four dark posts and a beam. Paper windows on the sides and back repeat the shoji look. A wind chime hangs under the eave, and a cushion and tea tray sit on the deck.', tools: ['Shape: Box', 'Shape: Cylinder, 5 sides', 'Rotate (E)'] },
    { title: 'Garden', text: 'Stepping stones lead to a roofed wooden gate, with bamboo poles for the fence. A pond is a flat blue box ringed by flattened rocks with three koi and lily pads. The gravel garden has thin darker lines for the raking, the stone lantern is stacked from boxes, a cylinder and a cone, and the pine and red maple are made of a trunk with flattened spheres for foliage. Group everything as Japanese House.', tools: ['Shape: Sphere, 6 sides', 'Shape: Cone', 'Group Ctrl+G'] },
  ],
  challenge: 'Make it winter: turn the ground and the gravel white, put a thin white box on each roof slope, and turn the maple foliage a pale orange.',
  parts,
};
