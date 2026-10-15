import type { AssetDef, AssetPart } from '../assets';
import { LR, ball, box, gable, part, tube } from './kit';
import type { Vec3 } from '../types';

const LAWN = '#7fb04f';
const LAWN_D = '#6c9c42';
const STONE = ['#9aa3ab', '#868e97', '#aeb5bb', '#939ba3'];
const WALL = '#efe4cf';
const TIMBER = '#6b4423';
const TIMBER_L = '#8a5a30';
const ROOF = '#b04a32';
const ROOF_D = '#8f3a26';
const ROOF_L = '#c85d42';
const WHITE = '#faf7f0';
const GLASS = '#79c4e6';
const DOOR = '#7a4a2a';
const GOLD = '#e6b422';
const SHUTTER = '#4d7a3a';
const WOOD = '#b07d45';
const GREEN = ['#4f7a3a', '#5f8f45', '#6fa04f'];
const SMOKE = '#e9ecee';

// roof geometry: half width 3.7 (z), rises 2.0 over it
const EAVE_Y = 3.05;
const RIDGE_Y = 5.05;
const HALF = 3.7;
const SLOPE = (Math.atan2(RIDGE_Y - EAVE_Y, HALF) * 180) / Math.PI; // ~28.4 degrees

/** A point on the roof surface: t = 0 at the eave, 1 at the ridge; side +1 = front (+z), -1 = back. */
const roofPoint = (side: 1 | -1, t: number, lift = 0.05): Vec3 => {
  const z = side * (HALF - HALF * t);
  const y = EAVE_Y + (RIDGE_Y - EAVE_Y) * t;
  const nz = side * Math.sin((SLOPE * Math.PI) / 180);
  const ny = Math.cos((SLOPE * Math.PI) / 180);
  return [0, y + ny * lift, z + nz * lift];
};

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);

// 0 ground and foundation
add(
  box(0, 'Lawn', [0, 0.02, 2.0], [14, 0.04, 13.5], LAWN),
  box(0, 'Lawn Patch', [-4.2, 0.045, 6.0], [3.2, 0.012, 2.4], LAWN_D),
  box(0, 'Foundation', [0, 0.2, 0], [8.5, 0.36, 6.5], STONE[0]),
  ...Array.from({ length: 8 }, (_, i) => box(0, `Foundation Stone ${i + 1}`, [-3.5 + i * 1.0, 0.18, 3.27], [0.88, 0.28, 0.06], STONE[(i + 1) % 4])),
  ...Array.from({ length: 6 }, (_, i) => box(0, `Side Stone ${i + 1}`, [4.27, 0.18, -2.5 + i * 1.0], [0.06, 0.28, 0.88], STONE[i % 4])),
);

// 1 walls and timber frame
add(
  box(1, 'Walls', [0, 1.7, 0], [8, 2.7, 6], WALL),
  ...[[3.98, 2.98], [-3.98, 2.98], [3.98, -2.98], [-3.98, -2.98]].map(([x, z], i) => box(1, `Corner Post ${i + 1}`, [x, 1.7, z], [0.26, 2.7, 0.26], TIMBER)),
  box(1, 'Front Top Beam', [0, 2.95, 3.02], [8.1, 0.22, 0.2], TIMBER),
  box(1, 'Front Bottom Beam', [0, 0.52, 3.02], [8.1, 0.18, 0.2], TIMBER),
  box(1, 'Side Top Beam Left', [4.02, 2.95, 0], [0.2, 0.22, 6.1], TIMBER),
  box(1, 'Side Top Beam Right', [-4.02, 2.95, 0], [0.2, 0.22, 6.1], TIMBER),
  ...LR('Front Brace', (s, n) => box(1, n, [s * 3.4, 1.75, 3.03], [0.14, 2.0, 0.1], TIMBER_L, { rot: [0, 0, s * 18] })),
  ...LR('Front Post', (s, n) => box(1, n, [s * 1.05, 1.7, 3.03], [0.14, 2.3, 0.1], TIMBER_L)),
);

// 2 roof
add(
  part(2, 'Roof', 'box', [0, 4.05, 0], [9.2, 2.0, 7.4], ROOF, { mesh: gable }),
  box(2, 'Ridge Cap', [0, 5.07, 0], [9.4, 0.16, 0.42], ROOF_D),
  box(2, 'Front Fascia', [0, 3.0, 3.72], [9.3, 0.14, 0.1], TIMBER),
  box(2, 'Back Fascia', [0, 3.0, -3.72], [9.3, 0.14, 0.1], TIMBER),
  ...[0.18, 0.36, 0.54, 0.72, 0.9].flatMap((t, i) => [
    box(2, `Front Tile Row ${i + 1}`, roofPoint(1, t), [9.2, 0.03, 0.12], i % 2 ? ROOF_L : ROOF_D, { rot: [SLOPE, 0, 0] }),
    box(2, `Back Tile Row ${i + 1}`, roofPoint(-1, t), [9.2, 0.03, 0.12], i % 2 ? ROOF_L : ROOF_D, { rot: [-SLOPE, 0, 0] }),
  ]),
  // dormer
  box(2, 'Dormer', [0, 4.0, 2.45], [1.7, 1.0, 0.9], WALL),
  part(2, 'Dormer Roof', 'box', [0, 4.8, 2.4], [2.1, 0.75, 1.5], ROOF, { mesh: () => gable(), rot: [0, 90, 0] }),
  box(2, 'Dormer Frame', [0, 4.0, 2.92], [1.0, 0.74, 0.05], WHITE),
  box(2, 'Dormer Glass', [0, 4.0, 2.95], [0.84, 0.6, 0.04], GLASS),
  box(2, 'Dormer Bar', [0, 4.0, 2.97], [0.04, 0.6, 0.04], WHITE),
);

// 3 door, windows, shutters
add(
  box(3, 'Door Frame', [0, 1.62, 3.06], [1.4, 2.4, 0.1], WHITE),
  box(3, 'Door', [0, 1.57, 3.12], [1.1, 2.2, 0.1], DOOR),
  ...[0, 1].flatMap((c) => [0, 1].map((r) => box(3, `Door Panel ${c * 2 + r + 1}`, [-0.25 + c * 0.5, 1.05 + r * 1.05, 3.18], [0.38, 0.8, 0.03], TIMBER_L))),
  ball(3, 'Door Knob', [0.38, 1.55, 3.2], [0.1, 0.1, 0.08], GOLD, 5),
  box(3, 'Door Lintel', [0, 2.92, 3.1], [1.7, 0.14, 0.2], TIMBER),
  box(3, 'Door Step', [0, 0.28, 3.5], [1.8, 0.2, 0.6], STONE[2]),
  ...LR('Window Frame', (s, n) => box(3, n, [s * 2.45, 2.0, 3.04], [1.6, 1.35, 0.1], WHITE)),
  ...LR('Window Glass', (s, n) => box(3, n, [s * 2.45, 2.0, 3.08], [1.38, 1.13, 0.08], GLASS)),
  ...LR('Window Bar Vertical', (s, n) => box(3, n, [s * 2.45, 2.0, 3.13], [0.06, 1.13, 0.06], WHITE)),
  ...LR('Window Bar Horizontal', (s, n) => box(3, n, [s * 2.45, 2.0, 3.14], [1.38, 0.06, 0.06], WHITE)),
  ...LR('Window Sill', (s, n) => box(3, n, [s * 2.45, 1.28, 3.16], [1.8, 0.1, 0.28], STONE[2])),
  ...LR('Shutter Outer', (s, n) => box(3, n, [s * 3.5, 2.0, 3.1], [0.4, 1.3, 0.06], SHUTTER)),
  ...LR('Shutter Inner', (s, n) => box(3, n, [s * 1.4, 2.0, 3.1], [0.4, 1.3, 0.06], SHUTTER)),
  ...LR('Side Window Frame', (s, n) => box(3, n, [s * 4.04, 2.0, 0], [0.1, 1.3, 1.6], WHITE)),
  ...LR('Side Window Glass', (s, n) => box(3, n, [s * 4.08, 2.0, 0], [0.08, 1.08, 1.38], GLASS)),
);

// 4 chimney and porch
add(
  box(4, 'Chimney', [2.8, 4.7, -1.4], [0.95, 2.2, 0.95], STONE[0]),
  ...[0, 1, 2, 3].map((i) => box(4, `Chimney Stone ${i + 1}`, [2.8, 3.95 + i * 0.5, -0.9], [0.8, 0.22, 0.04], STONE[(i + 2) % 4])),
  box(4, 'Chimney Cap', [2.8, 5.85, -1.4], [1.15, 0.16, 1.15], '#2f3437'),
  ball(4, 'Smoke 1', [2.8, 6.3, -1.4], [0.5, 0.42, 0.5], SMOKE, 6),
  ball(4, 'Smoke 2', [2.95, 6.85, -1.35], [0.62, 0.5, 0.6], SMOKE, 6),
  ball(4, 'Smoke 3', [3.15, 7.5, -1.3], [0.74, 0.58, 0.7], '#f5f6f7', 6),
  box(4, 'Porch Deck', [0, 0.42, 4.1], [3.4, 0.16, 1.8], WOOD),
  ...Array.from({ length: 5 }, (_, i) => box(4, `Deck Board ${i + 1}`, [-1.4 + i * 0.7, 0.505, 4.1], [0.02, 0.01, 1.8], TIMBER_L)),
  ...LR('Porch Post', (s, n) => box(4, n, [s * 1.55, 1.8, 4.85], [0.18, 2.7, 0.18], WHITE)),
  box(4, 'Porch Roof', [0, 3.2, 4.2], [3.9, 0.16, 2.2], ROOF, { rot: [8, 0, 0] }),
  box(4, 'Porch Beam', [0, 3.0, 4.85], [3.5, 0.2, 0.18], TIMBER),
  ...LR('Porch Rail', (s, n) => box(4, n, [s * 1.55, 0.95, 4.1], [0.07, 0.07, 1.5], WHITE)),
  box(4, 'Lantern', [1.15, 2.5, 3.2], [0.14, 0.2, 0.14], '#2f3437'),
  ball(4, 'Lantern Glow', [1.15, 2.5, 3.2], [0.16, 0.18, 0.16], '#ffe58a', 5),
);

// 5 garden
add(
  ...Array.from({ length: 6 }, (_, i) => box(5, `Path Stone ${i + 1}`, [(i % 2 ? 0.18 : -0.18), 0.05, 5.55 + i * 0.75], [0.95, 0.05, 0.6], STONE[(i + 2) % 4])),
  ...Array.from({ length: 9 }, (_, i) => {
    const x = -6.4 + i * 1.6;
    return Math.abs(x) < 1.0 ? [] : [box(5, `Fence Post ${i + 1}`, [x, 0.55, 8.5], [0.14, 1.1, 0.14], WHITE), box(5, `Fence Cap ${i + 1}`, [x, 1.13, 8.5], [0.2, 0.06, 0.2], WHITE)];
  }).flat(),
  box(5, 'Fence Rail Left', [-3.8, 0.85, 8.5], [5.4, 0.1, 0.06], WHITE),
  box(5, 'Fence Rail Left Low', [-3.8, 0.45, 8.5], [5.4, 0.1, 0.06], WHITE),
  box(5, 'Fence Rail Right', [3.8, 0.85, 8.5], [5.4, 0.1, 0.06], WHITE),
  box(5, 'Fence Rail Right Low', [3.8, 0.45, 8.5], [5.4, 0.1, 0.06], WHITE),
  tube(5, 'Tree Trunk', [-6.0, 1.2, -1.5], [0.55, 2.4, 0.55], TIMBER, 6, { taper: 0.75 }),
  part(5, 'Tree Foliage Low', 'cone', [-6.0, 3.3, -1.5], [3.3, 2.0, 3.3], GREEN[0], { segments: 7 }),
  part(5, 'Tree Foliage Mid', 'cone', [-6.0, 4.4, -1.5], [2.6, 1.8, 2.6], GREEN[1], { segments: 7 }),
  part(5, 'Tree Foliage Top', 'cone', [-6.0, 5.4, -1.5], [1.8, 1.6, 1.8], GREEN[2], { segments: 7 }),
  ball(5, 'Bush Left', [-3.4, 0.6, 3.9], [1.3, 1.0, 1.1], GREEN[1], 6),
  ball(5, 'Bush Right', [3.4, 0.6, 3.9], [1.3, 1.0, 1.1], GREEN[0], 6),
  ball(5, 'Bush Small', [-2.5, 0.35, 3.7], [0.7, 0.6, 0.7], GREEN[2], 5),
  ...[['Flower 1', -2.9, '#e58bb4'], ['Flower 2', -2.45, '#f6d04a'], ['Flower 3', -2.0, '#e5736a'], ['Flower 4', 2.0, '#f6d04a'], ['Flower 5', 2.45, '#e58bb4'], ['Flower 6', 2.9, '#e5736a']].map(([n, x, c]) => ball(5, n as string, [x as number, 1.25, 3.3], [0.16, 0.16, 0.16], c as string, 5)),
  ...LR('Flower Box', (s, n) => box(5, n, [s * 2.45, 1.12, 3.3], [1.5, 0.2, 0.3], TIMBER_L)),
  tube(5, 'Mailbox Post', [1.7, 0.55, 8.1], [0.12, 1.1, 0.12], TIMBER, 5),
  box(5, 'Mailbox', [1.7, 1.2, 8.1], [0.32, 0.26, 0.5], '#3a5a9a'),
  box(5, 'Mailbox Flag', [1.9, 1.3, 8.0], [0.04, 0.2, 0.04], '#d64545'),
);

export const HOUSE: AssetDef = {
  id: 'house',
  name: 'House',
  tagline: 'A cottage with a half-timber frame, tiled roof, porch and garden',
  level: 'Detailed',
  thumb: { dir: [0.75, 0.55, 1], zoom: 0.62 },
  learn: ['Make a roof with Merge points and lay tile rows on its slope', 'Layer frames, glass, shutters and flower boxes', 'Place parts along a slope with Rotate', 'Dress the scene: trees, fence, path, mailbox'],
  steps: [
    { title: 'Ground and foundation', text: 'A flat green Box is the lawn, and a slightly larger gray Box is the foundation. A row of thin stone boxes in different grays along the front and side makes it look like real stonework.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Color palette'] },
    { title: 'Walls and timber frame', text: 'The walls are one cream Box. Dark brown thin Boxes on the corners, along the top and bottom, and diagonally as braces turn it into a half-timber house. Use Rotate to tilt the braces.', tools: ['Thin boxes', 'Rotate (E)', 'Mirror ideas: duplicate and move'] },
    { title: 'Roof', text: 'The roof is a Box. In Edit shape, select the two top points at each end and use Merge points to collapse the top into a ridge. Then lay thin darker and lighter boxes along each slope as tile rows: rotate them by the roof angle, about 28 degrees. Add a ridge cap, fascia boards and a small dormer with its own mini roof.', tools: ['Edit shape (Tab)', 'Merge points', 'Rotate (E): 28°', 'Duplicate Ctrl+D'] },
    { title: 'Door and windows', text: 'The door sits in a white frame with four raised panels and a gold knob. Each window is a white frame, blue glass, two thin bars for the cross, a stone sill and two green shutters. Build one window, then duplicate it to the other side.', tools: ['Thin boxes', 'Duplicate Ctrl+D', 'Shape: Sphere, 5 sides for the knob'] },
    { title: 'Chimney and porch', text: 'The chimney is a tall box with thin stone lines on its side, a dark cap and three puffs of smoke made from 6-sided spheres that grow as they rise. The porch has a wooden deck, two posts, a slightly tilted roof, rails and a lantern.', tools: ['Shape: Sphere', 'Size handles (R)', 'Rotate (E)'] },
    { title: 'Garden', text: 'Stepping stones lead to the door, a picket fence frames the front, and a tree is a trunk with three Cones stacked in different greens. Bushes are flattened spheres, flower boxes hold tiny colored spheres, and a mailbox finishes the scene. Group everything as House.', tools: ['Shape: Cone', 'Shape: Sphere, 6 sides', 'Group Ctrl+G'] },
  ],
  challenge: 'Make it winter: change the lawn to white, put a thin white box on each roof slope, and turn the tree foliage a darker green.',
  parts,
};
