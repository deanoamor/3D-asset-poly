import type { AssetDef, AssetPart } from '../assets';
import type { Vec3 } from '../types';
import { LR, applyStyle, ball, box, gable, part, tube } from './kit';

/**
 * A Japanese Shinto shrine: a vermilion torii gate at the end of a gravel approach (sando) lined with stone lanterns,
 * a pair of guardian lion-dogs (komainu), a roofed purification fountain (temizuya), an ema rack, and the main hall
 * (haiden) on a stone base with a veranda, lattice doors, a shimenawa rope with paper streamers, an offering box, a
 * bell and a cypress-bark roof with crossed finials (chigi) and ridge billets (katsuogi). A small side shrine, a sacred
 * camphor tree with a rope and cedars surround it.
 * The front faces +Z, the hall is at the origin and the torii stands 26 m in front of it.
 */

const GRASS = '#7fa457';
const GRAVEL = '#dcd3bd';
const GRAVEL_D = '#c2b89f';
const STONE = ['#a9a8a0', '#95948c', '#bab8af', '#8a8982'];
const WALL = '#f3eee2';
const RED = '#c93a2b';
const RED_D = '#a42c21';
const BLACK = '#1f1d1b';
const WOOD = '#8a6a47';
const WOOD_D = '#5a4030';
const WOOD_L = '#b08a5e';
const BARK = ['#8c7653', '#a58e66', '#6c5a3c'];
const GOLD = '#e6c15a';
const ROPE = '#e9e0c4';
const PAPER = '#fbf8ee';
const WATER = '#6aa8bd';
const GREEN = ['#2f5d3a', '#3a6e44', '#467f4f'];
const CEDAR = ['#2d5a3a', '#376a44', '#2a523a'];
const MAPLE = ['#d1472f', '#e2692f'];

// roof geometry: half depth 4.5 (z), rises 3.0 over it
const EAVE_Y = 4.0;
const RIDGE_Y = 7.0;
const HALF = 4.5;
const SLOPE = (Math.atan2(RIDGE_Y - EAVE_Y, HALF) * 180) / Math.PI; // ~33.7 degrees

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

/** A tall stone lantern at (x, z): base, post, firebox with a glow, roof and top. */
const stoneLantern = (step: number, k: string, x: number, z: number): AssetPart[] => [
  box(step, `Stone Lantern Base ${k}`, [x, 0.15, z], [0.7, 0.3, 0.7], STONE[0]),
  tube(step, `Stone Lantern Post ${k}`, [x, 0.95, z], [0.28, 1.3, 0.28], STONE[2], 6),
  box(step, `Stone Lantern Seat ${k}`, [x, 1.65, z], [0.7, 0.12, 0.7], STONE[0]),
  box(step, `Stone Lantern Light Box ${k}`, [x, 1.95, z], [0.46, 0.5, 0.46], STONE[3]),
  ball(step, `Stone Lantern Glow ${k}`, [x, 1.95, z], [0.4, 0.28, 0.4], '#ffe58a', 5),
  part(step, `Stone Lantern Roof ${k}`, 'cone', [x, 2.38, z], [1.1, 0.42, 1.1], STONE[1], { segments: 4 }),
  ball(step, `Stone Lantern Top ${k}`, [x, 2.68, z], [0.22, 0.22, 0.22], STONE[2], 5),
];

// 0 ground, approach and hall base
add(
  box(0, 'Ground', [0, 0.02, 12], [44, 0.04, 54], GRASS),
  box(0, 'Approach Gravel', [0, 0.05, 17.3], [4.6, 0.06, 25.2], GRAVEL),
  ...Array.from({ length: 6 }, (_, i) => box(0, `Gravel Line ${i + 1}`, [-1.5 + i * 0.6, 0.085, 17.3], [0.05, 0.015, 24.6], GRAVEL_D)),
  ...LR('Approach Curb', (s, n) => box(0, n, [s * 2.4, 0.1, 17.3], [0.22, 0.2, 25.2], STONE[1])),
  ...Array.from({ length: 6 }, (_, i) => box(0, `Path Stone ${i + 1}`, [0, 0.11, 6.0 + i * 0.9], [3.4, 0.04, 0.5], STONE[(i + 1) % 4])),
  box(0, 'Hall Base', [0, 0.4, 0], [11, 0.8, 9.4], STONE[0]),
  box(0, 'Hall Base Cap', [0, 0.78, 0], [11.3, 0.1, 9.7], STONE[2]),
  ...Array.from({ length: 7 }, (_, i) => box(0, `Base Panel ${i + 1}`, [-4.5 + i * 1.5, 0.4, 4.72], [1.3, 0.55, 0.05], STONE[(i + 2) % 4])),
  ...Array.from({ length: 6 }, (_, i) => box(0, `Base Side Panel ${i + 1}`, [5.52, 0.4, -3.6 + i * 1.45], [0.05, 0.55, 1.25], STONE[(i + 1) % 4])),
);

// 1 the hall: veranda, pillars, walls, steps
add(
  box(1, 'Veranda Deck', [0, 0.9, 3.75], [9.6, 0.2, 2.1], WOOD_L),
  ...Array.from({ length: 6 }, (_, i) => box(1, `Deck Board ${i + 1}`, [0, 1.005, 2.9 + i * 0.35], [9.6, 0.02, 0.03], WOOD)),
  box(1, 'Hall Floor', [0, 0.9, -0.5], [8.4, 0.2, 6.0], WOOD_L),
  box(1, 'Hall Walls', [0, 2.5, 0], [8, 3.0, 5.4], WALL),
  ...[[4.0, 2.7], [-4.0, 2.7], [4.0, -2.7], [-4.0, -2.7]].map(([x, z], i) => box(1, `Hall Pillar ${i + 1}`, [x, 2.5, z], [0.4, 3.0, 0.4], RED)),
  box(1, 'Hall Band Top', [0, 3.72, 0], [8.15, 0.26, 5.55], RED),
  box(1, 'Hall Band Foot', [0, 1.2, 0], [8.15, 0.3, 5.55], WOOD_D),
  box(1, 'Hall Band Mid', [0, 3.0, 0], [8.1, 0.12, 5.5], RED_D),
  ...[-4.0, -2.5, -1.0, 1.0, 2.5, 4.0].map((x, i) => box(1, `Veranda Post ${i + 1}`, [x, 2.5, 4.4], [0.34, 3.0, 0.34], RED)),
  box(1, 'Veranda Beam', [0, 3.85, 4.4], [9.4, 0.3, 0.4], RED),
  box(1, 'Veranda Rail', [0, 1.55, 4.55], [9.4, 0.1, 0.1], RED_D),
  ...[0.6, 0.4, 0.2].map((h, i) => box(1, `Hall Step ${i + 1}`, [0, h / 2, 5.05 + i * 0.7], [3.8 - i * 0.2, h, 0.7], STONE[(i + 2) % 4])),
);

// 2 roof
add(
  part(2, 'Roof', 'box', [0, 5.5, 0], [11.4, 3.0, 9.0], BARK[0], { mesh: gable }),
  box(2, 'Ridge Cap', [0, 7.03, 0], [11.8, 0.22, 0.5], BARK[2]),
  ...[0.14, 0.28, 0.42, 0.56, 0.7, 0.84].flatMap((t, i) => [
    box(2, `Front Bark Row ${i + 1}`, roofPoint(1, t), [11.4, 0.03, 0.16], i % 2 ? BARK[1] : BARK[2], { rot: [SLOPE, 0, 0] }),
    box(2, `Back Bark Row ${i + 1}`, roofPoint(-1, t), [11.4, 0.03, 0.16], i % 2 ? BARK[1] : BARK[2], { rot: [-SLOPE, 0, 0] }),
  ]),
  box(2, 'Front Eave Edge', [0, 4.05, 4.45], [11.4, 0.2, 0.14], BARK[2]),
  box(2, 'Back Eave Edge', [0, 4.05, -4.45], [11.4, 0.2, 0.14], BARK[2]),
  ...LR('Barge Board Front', (s, n) => box(2, n, roofPoint(1, 0.5, 0.06, s * 5.72), [0.18, 0.16, 5.4], WOOD_D, { rot: [SLOPE, 0, 0] })),
  ...LR('Barge Board Back', (s, n) => box(2, n, roofPoint(-1, 0.5, 0.06, s * 5.72), [0.18, 0.16, 5.4], WOOD_D, { rot: [-SLOPE, 0, 0] })),
  // crossed finials (chigi) at both ends and round billets (katsuogi) along the ridge
  ...LR('Chigi A', (s, n) => box(2, n, [s * 5.5, 7.5, 0], [0.12, 1.7, 0.1], WOOD_L, { rot: [0, 0, 28] })),
  ...LR('Chigi B', (s, n) => box(2, n, [s * 5.5, 7.5, 0], [0.12, 1.7, 0.1], WOOD_L, { rot: [0, 0, -28] })),
  ...LR('Ridge Gold', (s, n) => box(2, n, [s * 5.88, 7.03, 0], [0.22, 0.3, 0.56], GOLD)),
  ...[-3, -2, -1, 0, 1, 2, 3].map((x, i) => tube(2, `Katsuogi ${i + 1}`, [x, 7.2, 0], [0.2, 0.7, 0.2], WOOD_L, 6, { rot: [0, 0, 90] })),
  ...Array.from({ length: 11 }, (_, i) => box(2, `Front Rafter ${i + 1}`, [-4.5 + i * 0.9, 3.95, 4.0], [0.12, 0.12, 1.0], WOOD_D)),
);

// 3 doors, shimenawa, offering box and bell
add(
  box(3, 'Door Frame', [0, 2.2, 2.75], [2.7, 2.5, 0.1], WOOD_D),
  ...[-0.6, 0.6].map((x, i) => box(3, `Door Panel ${i + 1}`, [x, 2.2, 2.8], [1.15, 2.3, 0.06], WOOD)),
  ...[-0.6, 0.6].flatMap((x, i) => [
    ...[-0.25, 0.25].map((dx, j) => box(3, `Door Bar ${i + 1}-${j + 1}`, [x + dx, 2.2, 2.845], [0.04, 2.3, 0.03], WOOD_D)),
    ...[0, 1, 2, 3].map((j) => box(3, `Door Rail ${i + 1}-${j + 1}`, [x, 1.5 + j * 0.5, 2.845], [1.15, 0.04, 0.03], WOOD_D)),
  ]),
  ...LR('Side Lattice Frame', (s, n) => box(3, n, [s * 2.9, 2.5, 2.75], [1.5, 1.4, 0.1], WOOD_D)),
  ...LR('Side Lattice Panel', (s, n) => box(3, n, [s * 2.9, 2.5, 2.8], [1.3, 1.2, 0.06], '#d7c9a6')),
  ...LR('Side Lattice Bar', (s, n) => box(3, n, [s * 2.9, 2.5, 2.845], [0.04, 1.2, 0.03], WOOD_D)),
  ...LR('Side Lattice Rail', (s, n) => box(3, n, [s * 2.9, 2.5, 2.845], [1.3, 0.04, 0.03], WOOD_D)),
  tube(3, 'Shimenawa', [0, 3.55, 2.78], [0.18, 3.0, 0.18], ROPE, 6, { rot: [0, 0, 90] }),
  ...LR('Shimenawa Tassel', (s, n) => ball(3, n, [s * 1.55, 3.5, 2.78], [0.26, 0.24, 0.26], ROPE, 5)),
  ...[-1.0, -0.5, 0, 0.5, 1.0].map((x, i) => box(3, `Shide ${i + 1}`, [x, 3.25, 2.78], [0.16, 0.45, 0.02], PAPER)),
  box(3, 'Offering Box', [0, 1.35, 3.9], [1.8, 0.7, 0.7], WOOD_D),
  ...Array.from({ length: 6 }, (_, i) => box(3, `Offering Grille ${i + 1}`, [-0.7 + i * 0.28, 1.72, 3.9], [0.04, 0.04, 0.6], WOOD_L)),
  ball(3, 'Bell', [0, 3.45, 4.4], [0.6, 0.5, 0.6], GOLD, 6),
  tube(3, 'Bell Rope Red', [0, 2.5, 4.4], [0.14, 1.5, 0.14], RED, 5),
  tube(3, 'Bell Rope White', [0.1, 2.5, 4.4], [0.1, 1.5, 0.1], PAPER, 5),
  ...LR('Hall Lantern', (s, n) => ball(3, n, [s * 3.3, 3.1, 4.5], [0.38, 0.5, 0.38], RED, 6)),
  ...LR('Hall Lantern Cord', (s, n) => tube(3, n, [s * 3.3, 3.55, 4.4], [0.03, 0.6, 0.03], BLACK, 4)),
);

// 4 the approach: torii, komainu, lanterns and the purification fountain
add(
  ...LR('Torii Pillar', (s, n) => tube(4, n, [s * 2.4, 3.2, 26], [0.62, 6.0, 0.62], RED, 8, { taper: 0.88 })),
  ...LR('Torii Base', (s, n) => tube(4, n, [s * 2.4, 0.4, 26], [0.78, 0.8, 0.78], BLACK, 8)),
  box(4, 'Torii Tie Beam', [0, 4.5, 26], [6.6, 0.36, 0.42], RED),
  box(4, 'Torii Lintel', [0, 5.55, 26], [7.6, 0.36, 0.5], RED),
  box(4, 'Torii Top Beam', [0, 5.92, 26], [8.6, 0.42, 0.6], BLACK),
  box(4, 'Torii Tablet', [0, 5.05, 26], [0.7, 0.9, 0.14], BLACK),
  box(4, 'Torii Tablet Plate', [0, 5.05, 26.08], [0.5, 0.7, 0.02], GOLD),
  ...([1, -1] as const).flatMap((s) => {
    const n = s > 0 ? 'Komainu Left' : 'Komainu Right';
    return [
      box(4, `${n} Pedestal`, [s * 3.3, 0.45, 21], [1.1, 0.9, 1.1], STONE[0]),
      ball(4, `${n} Body`, [s * 3.3, 1.25, 20.95], [0.72, 0.78, 0.95], STONE[2], 6),
      ball(4, `${n} Chest`, [s * 3.3, 1.45, 21.25], [0.55, 0.65, 0.5], STONE[2], 6),
      ball(4, `${n} Head`, [s * 3.3, 1.95, 21.3], [0.48, 0.48, 0.48], STONE[2], 6),
      ball(4, `${n} Mane`, [s * 3.3, 1.9, 21.05], [0.62, 0.55, 0.4], STONE[3], 6),
      ball(4, `${n} Tail`, [s * 3.3, 1.3, 20.4], [0.4, 0.5, 0.4], STONE[3], 5),
    ];
  }),
  ...stoneLantern(4, '1', -3.1, 12),
  ...stoneLantern(4, '2', 3.1, 12),
  ...stoneLantern(4, '3', -3.1, 17),
  ...stoneLantern(4, '4', 3.1, 17),
  // purification fountain with a small roof
  box(4, 'Fountain Base', [7.5, 0.35, 12], [2.2, 0.7, 1.3], STONE[0]),
  box(4, 'Fountain Basin', [7.5, 0.75, 12], [1.9, 0.18, 1.0], STONE[2]),
  box(4, 'Fountain Water', [7.5, 0.86, 12], [1.6, 0.06, 0.7], WATER),
  ...[[6.5, 11.4], [8.5, 11.4], [6.5, 12.6], [8.5, 12.6]].map(([x, z], i) => box(4, `Fountain Post ${i + 1}`, [x, 1.8, z], [0.16, 2.2, 0.16], WOOD)),
  part(4, 'Fountain Roof', 'box', [7.5, 3.15, 12], [3.0, 0.9, 2.2], BARK[0], { mesh: gable, rot: [0, 90, 0] }),
  box(4, 'Fountain Rack', [7.5, 1.6, 11.45], [2.0, 0.07, 0.07], WOOD_D),
  ...[-0.6, 0, 0.6].map((x, i) => tube(4, `Ladle ${i + 1}`, [7.5 + x, 1.35, 11.45], [0.06, 0.55, 0.06], WOOD_L, 4)),
  tube(4, 'Bamboo Spout', [7.5, 0.98, 12.25], [0.12, 0.6, 0.12], '#c9b96c', 5, { rot: [60, 0, 0] }),
);

// 5 ema rack, side shrine and trees
const ema = Array.from({ length: 8 }, (_, i) => box(5, `Ema ${i + 1}`, [-7.6 + (i % 4) * 0.5, 1.95 - Math.floor(i / 4) * 0.4, 8.07], [0.38, 0.32, 0.03], WOOD_L));
add(
  ...[-8.9, -6.3].map((x, i) => box(5, `Ema Post ${i + 1}`, [x, 1.3, 8.0], [0.16, 2.6, 0.16], WOOD)),
  box(5, 'Ema Beam', [-7.6, 2.5, 8.0], [2.9, 0.12, 0.14], WOOD_D),
  box(5, 'Ema Roof', [-7.6, 2.7, 8.0], [3.2, 0.1, 0.9], BARK[0], { rot: [8, 0, 0] }),
  box(5, 'Ema Rail', [-7.6, 1.6, 8.06], [2.7, 0.07, 0.07], WOOD_D),
  ...ema,
  ...[0, 1, 2, 3].map((i) => box(5, `Ema Hook ${i + 1}`, [-7.6 + i * 0.5, 2.3, 8.05], [0.03, 0.4, 0.03], WOOD_D)),
  // the small side shrine
  box(5, 'Side Shrine Base', [-9.5, 0.3, -1.5], [2.0, 0.6, 1.8], STONE[0]),
  box(5, 'Side Shrine Walls', [-9.5, 1.3, -1.5], [1.4, 1.4, 1.2], WALL),
  box(5, 'Side Shrine Door', [-9.5, 1.2, -0.88], [0.7, 0.9, 0.04], WOOD),
  ...LR('Side Shrine Pillar', (s, n) => box(5, n, [-9.5 + s * 0.7, 1.3, -0.9], [0.14, 1.4, 0.14], RED)),
  part(5, 'Side Shrine Roof', 'box', [-9.5, 2.45, -1.5], [2.2, 0.95, 1.9], BARK[0], { mesh: gable, rot: [0, 90, 0] }),
  box(5, 'Side Shrine Offering', [-9.5, 0.75, -0.45], [0.6, 0.3, 0.3], WOOD_D),
  // the sacred camphor tree with its rope
  tube(5, 'Sacred Trunk', [9.5, 2.75, -2.5], [1.7, 5.5, 1.7], WOOD_D, 8, { taper: 0.75 }),
  ball(5, 'Sacred Canopy Low', [9.5, 6.0, -2.5], [6.0, 3.0, 6.0], GREEN[0], 7),
  ball(5, 'Sacred Canopy Mid', [10.2, 7.4, -2.8], [5.0, 2.6, 5.0], GREEN[1], 7),
  ball(5, 'Sacred Canopy Top', [9.2, 8.6, -2.2], [3.4, 2.0, 3.4], GREEN[2], 7),
  tube(5, 'Sacred Rope', [9.5, 2.0, -2.5], [1.62, 0.2, 1.62], ROPE, 8),
  ...[0, 1, 2, 3].map((i) => {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    return box(5, `Sacred Shide ${i + 1}`, [9.5 + Math.cos(a) * 0.82, 1.7, -2.5 + Math.sin(a) * 0.82], [0.16, 0.42, 0.02], PAPER, { rot: [0, (-a * 180) / Math.PI + 90, 0] });
  }),
  // cedars and maples
  ...[[-12, -5], [-12, 5], [-12.5, 15], [12, 6], [12.5, 16], [-11, 24], [11, 24]].flatMap(([x, z], i) => {
    const k = i + 1;
    return [
      tube(5, `Cedar Trunk ${k}`, [x, 1.0, z], [0.5, 2.0, 0.5], WOOD_D, 6),
      part(5, `Cedar Low ${k}`, 'cone', [x, 3.0, z], [3.0, 2.6, 3.0], CEDAR[i % 3], { segments: 7 }),
      part(5, `Cedar Mid ${k}`, 'cone', [x, 4.6, z], [2.4, 2.4, 2.4], CEDAR[(i + 1) % 3], { segments: 7 }),
      part(5, `Cedar Top ${k}`, 'cone', [x, 6.1, z], [1.7, 2.2, 1.7], CEDAR[(i + 2) % 3], { segments: 7 }),
    ];
  }),
  ...[[-8, 20], [8, 21]].flatMap(([x, z], i) => [
    tube(5, `Maple Trunk ${i + 1}`, [x, 1.0, z], [0.34, 2.0, 0.34], WOOD_D, 6, { taper: 0.7 }),
    ball(5, `Maple Foliage ${i + 1}`, [x, 2.6, z], [2.4, 1.5, 2.4], MAPLE[i], 6),
    ball(5, `Maple Foliage Top ${i + 1}`, [x + 0.2, 3.7, z], [1.5, 1.0, 1.5], MAPLE[1 - i], 6),
  ]),
);

applyStyle(parts, [
  [/^(Ground|Approach Gravel)/, { paint: 0.4 }],
  [/^(Hall Walls)/, { paint: 0.3 }],
  [/^(Roof$|Fountain Roof|Side Shrine Roof|Ema Roof)/, { paint: 0.45 }],
  [/^(Sacred Canopy|Cedar|Maple Foliage)/, { smooth: true, paint: 0.5 }],
  [/^(Sacred Trunk|Cedar Trunk|Maple Trunk)/, { smooth: true, paint: 0.4 }],
  [/Stone|^Hall Base|Step|Komainu|Pedestal|Path/, { paint: 0.35 }],
]);

export const JAPANSHRINE: AssetDef = {
  id: 'japanshrine',
  name: 'Japanese Shrine',
  tagline: 'A Shinto shrine with a vermilion torii, stone lanterns, guardian lion-dogs, a purification fountain and a main hall with a bark roof',
  level: 'Detailed',
  thumb: { dir: [0.7, 0.45, 1], zoom: 0.5 },
  learn: ['Build a torii gate from two tapered pillars and three beams', 'Make a roof with Merge points and lay bark rows on its slope', 'Repeat stone lanterns by building one and duplicating it', 'Hang a shimenawa rope with paper streamers from a few thin shapes'],
  steps: [
    { title: 'Ground, approach and hall base', text: 'A large green Box is the ground and a long pale Box is the gravel approach, with thin darker lines for the raking and two stone curbs along its sides. The stone base of the hall is a grey Box with a slightly wider cap and thin stone panels along its front and sides.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Color palette'] },
    { title: 'Hall walls, pillars and steps', text: 'The hall is a white Box on a wooden floor with four red corner pillars and red bands at the top and middle. A veranda deck sticks out in front, carried by six red posts and a red beam, and three stone steps lead up to it.', tools: ['Shape: Box', 'Thin boxes', 'Duplicate Ctrl+D'] },
    { title: 'Roof', text: 'The roof is a wide Box. In Edit shape, select the top points at each end and use Merge points to collapse the top into a ridge. Lay thin darker and lighter boxes along each slope as bark rows, rotated by the roof angle (about 34 degrees). Add a ridge cap, dark barge boards, crossed finials at both ends, seven round billets along the ridge and a row of rafter ends over the veranda.', tools: ['Edit shape (Tab)', 'Merge points', 'Rotate (E): 34°', 'Shape: Cylinder, 6 sides'] },
    { title: 'Doors, rope, offering box and bell', text: 'The double door is two wooden panels in a dark frame with thin bars for the lattice, and a smaller lattice window on each side. A thick cream rope (shimenawa) with two tassels hangs above it, with five white paper streamers. On the veranda stand a dark offering box with a grille, and a gold bell with a red and white rope hangs from the beam.', tools: ['Thin boxes', 'Shape: Cylinder, rotate 90°', 'Shape: Sphere, 5 sides'] },
    { title: 'Torii, komainu, lanterns and fountain', text: 'The torii is two red tapered cylinders on black bases, a tie beam, a lintel and a black top beam with a small tablet in the middle. A pair of guardian lion-dogs sit on stone pedestals, built from flattened spheres. Four stone lanterns line the approach: build one from a base, a post, a seat, a light box and a cone roof, then duplicate it. The fountain is a stone basin with blue water under a small gabled roof, with ladles on a rack.', tools: ['Shape: Cylinder, 8 sides', 'Shape: Sphere', 'Shape: Cone, 4 sides', 'Duplicate Ctrl+D'] },
    { title: 'Ema rack, side shrine and trees', text: 'An ema rack holds eight small wooden plaques under a thin roof. A tiny side shrine has a stone base, white walls, red pillars and its own gable roof. The sacred camphor tree is a thick trunk with three flattened green spheres and a rope with streamers around it, and cedars made of three stacked Cones in different greens stand along the sides, with two red maples near the gate. Group everything as Japanese Shrine.', tools: ['Shape: Cone, 7 sides', 'Shape: Sphere, 7 sides', 'Group Ctrl+G'] },
  ],
  challenge: 'Make it winter: turn the ground and the gravel white, put a thin white box on the hall roof and on the fountain roof, and turn the maple foliage a pale orange.',
  parts,
};
