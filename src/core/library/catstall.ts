import type { AssetDef, AssetPart } from '../assets';
import type { Vec3 } from '../types';
import { LR, applyStyle, ball, box, gable, part, tube } from './kit';

/**
 * The Cat Sushi Stall: a small diorama of a Japanese street-food cart (yatai) on a round cobblestone plaza. A wooden
 * cart with a steep blue corrugated roof, a seigaiha-wave valance, a red sign board, a counter with a sushi board, a
 * stockpot, a teapot and a charcoal grill, a cat chef in the window, a big blue spoked wheel, a tall red paper lantern
 * and a small hanging one, a menu board and three yellow stools on a wooden deck.
 * The stall faces +Z.
 */

const STONE = ['#a49b93', '#b8aca0', '#c4a9a2', '#8f8780'];
const WOOD = '#a86a3c';
const WOOD_L = '#c58a54';
const WOOD_D = '#6b4129';
const RED = '#c4553a';
const RED_D = '#a8402c';
const CREAM = '#f3e3d0';
const BLUE = '#2f6aa8';
const BLUE_D = '#25588f';
const BLUE_L = '#4a86c6';
const WHEEL = '#5b86bd';
const ORANGE = '#e8903a';
const YELLOW = '#f0b83a';
const FUR = '#4b4b55';
const FUR_L = '#6b6b76';
const PINK = '#e8a0a0';
const LANTERN = '#e0502f';
const GLOW = '#ffb85a';
const IRON = '#2a2a2e';
const BLOCK = '#8c8f94';

const T = 0.4; // top of the plaza tiles

// roof geometry: half depth 1.2 (z), rises 1.4 over it
const EAVE_Y = 2.95;
const RIDGE_Y = 4.35;
const HALF = 1.2;
const SLOPE = (Math.atan2(RIDGE_Y - EAVE_Y, HALF) * 180) / Math.PI;
const roofPoint = (side: 1 | -1, t: number, lift = 0.03): Vec3 => {
  const z = side * (HALF - HALF * t);
  const y = EAVE_Y + (RIDGE_Y - EAVE_Y) * t;
  return [0, y + Math.cos((SLOPE * Math.PI) / 180) * lift, z + side * Math.sin((SLOPE * Math.PI) / 180) * lift];
};

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);

// 0 the plaza and the wooden deck
const ring = (k: string, r: number, n: number, radial: number, tone: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (k === 'B' ? Math.PI / n : 0);
    const tangent = ((2 * Math.PI * r) / n) * 0.9;
    return box(0, `Cobble ${k}${i + 1}`, [Math.cos(a) * r, T - 0.025, Math.sin(a) * r], [tangent, 0.05, radial], STONE[(i + tone) % 4], { rot: [0, -((a * 180) / Math.PI + 90), 0] });
  });
add(
  part(0, 'Plaza Rim', 'cylinder', [0, 0.1, 0], [9.0, 0.2, 9.0], STONE[3], { segments: 24 }),
  part(0, 'Plaza', 'cylinder', [0, 0.28, 0], [8.4, 0.16, 8.4], STONE[0], { segments: 24 }),
  part(0, 'Plaza Inner', 'cylinder', [0, T - 0.03, 0], [4.8, 0.06, 4.8], STONE[1], { segments: 20 }),
  ...ring('A', 4.0, 28, 0.62, 0),
  ...ring('B', 3.35, 24, 0.62, 1),
  ...ring('C', 2.7, 20, 0.62, 2),
  ...Array.from({ length: 7 }, (_, i) => box(0, `Deck Plank ${i + 1}`, [-0.6, T + 0.04, 1.35 + i * 0.4], [3.4, 0.08, 0.36], i % 2 ? WOOD_L : WOOD)),
  ...[0, 1].map((i) => box(0, `Deck Batten ${i + 1}`, [-1.9 + i * 2.6, T + 0.02, 2.65], [0.12, 0.04, 2.8], WOOD_D)),
);

// 1 the cart: chassis, body, posts, counter, wheel and blocks
add(
  box(1, 'Chassis', [0, 0.72, 0], [2.8, 0.12, 1.7], WOOD_D),
  box(1, 'Body', [0, 1.1, 0], [2.6, 0.62, 1.5], WOOD),
  ...Array.from({ length: 8 }, (_, i) => box(1, `Body Plank Line ${i + 1}`, [-1.12 + i * 0.32, 1.1, 0.755], [0.03, 0.6, 0.02], WOOD_D)),
  box(1, 'Body Trim', [0, 0.82, 0.77], [2.7, 0.08, 0.06], WOOD_D),
  ...LR('Post Front', (s, n) => box(1, n, [s * 1.3, 2.2, 0.72], [0.14, 1.6, 0.14], WOOD_D)),
  ...LR('Post Back', (s, n) => box(1, n, [s * 1.3, 2.2, -0.72], [0.14, 1.6, 0.14], WOOD_D)),
  box(1, 'Back Wall', [0, 2.2, -0.7], [2.6, 1.6, 0.08], WOOD),
  ...Array.from({ length: 6 }, (_, i) => box(1, `Back Plank Line ${i + 1}`, [-1.04 + i * 0.416, 2.2, -0.655], [0.03, 1.55, 0.02], WOOD_D)),
  box(1, 'Right Wall', [1.28, 1.65, 0], [0.08, 0.5, 1.5], WOOD),
  box(1, 'Front Header', [0, 2.9, 0.78], [2.8, 0.14, 0.14], WOOD_D),
  box(1, 'Counter', [0, 1.4, 1.06], [3.0, 0.08, 0.76], RED),
  box(1, 'Counter Lip', [0, 1.34, 1.43], [3.0, 0.14, 0.06], RED_D),
  box(1, 'Counter Bracket Left', [-1.1, 1.18, 0.95], [0.08, 0.3, 0.5], WOOD_D),
  box(1, 'Counter Bracket Right', [1.1, 1.18, 0.95], [0.08, 0.3, 0.5], WOOD_D),
  box(1, 'Side Shelf', [1.75, 1.3, 0.1], [0.9, 0.08, 1.4], RED),
  ...[-0.5, 0.6].map((z, i) => box(1, `Side Shelf Leg ${i + 1}`, [1.75, 1.02, z], [0.08, 0.5, 0.08], WOOD_D)),
  // a big blue spoked wheel
  ...Array.from({ length: 12 }, (_, i) => {
    const th = (i / 12) * Math.PI * 2;
    return box(1, `Wheel Rim ${i + 1}`, [-1.36, 1.15 + Math.cos(th) * 0.7, 0.25 + Math.sin(th) * 0.7], [0.16, 0.18, 0.62], WHEEL, { rot: [(th * 180) / Math.PI, 0, 0] });
  }),
  ...[0, 45, 90, 135].map((a, i) => box(1, `Wheel Spoke ${i + 1}`, [-1.36, 1.15, 0.25], [0.08, 1.4, 0.08], '#6f98c8', { rot: [a, 0, 0] })),
  tube(1, 'Wheel Hub', [-1.36, 1.15, 0.25], [0.3, 0.22, 0.3], '#46699c', 8, { rot: [0, 0, 90] }),
  tube(1, 'Axle', [-1.0, 1.15, 0.25], [0.1, 0.8, 0.1], WOOD_D, 5, { rot: [0, 0, 90] }),
  // concrete blocks and an orange crate under the right side
  box(1, 'Block 1', [0.9, 0.55, 0.55], [0.5, 0.3, 0.4], BLOCK),
  box(1, 'Block 2', [1.1, 0.55, -0.5], [0.5, 0.3, 0.4], BLOCK),
  box(1, 'Block 3', [-0.7, 0.55, -0.55], [0.5, 0.3, 0.4], BLOCK),
  box(1, 'Crate', [1.95, T + 0.25, 0.9], [0.7, 0.5, 0.7], ORANGE),
  ...[0, 1, 2].map((i) => box(1, `Slab ${i + 1}`, [1.95, T + 0.55 + i * 0.1, 0.9], [0.8 - i * 0.04, 0.1, 0.62], ['#9fb0c4', '#8fa2b8', '#b0bfd0'][i])),
);

// 2 the blue roof, the wave valance, the chimney and the sign
add(
  part(2, 'Roof', 'box', [0, 3.65, 0], [3.4, 1.4, 2.4], BLUE, { mesh: gable }),
  box(2, 'Ridge Cap', [0, 4.37, 0], [3.5, 0.12, 0.28], BLUE_D),
  ...[0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82].flatMap((t, i) => [
    box(2, `Front Roof Row ${i + 1}`, roofPoint(1, t), [3.4, 0.04, 0.12], i % 2 ? BLUE_L : BLUE_D, { rot: [SLOPE, 0, 0] }),
    box(2, `Back Roof Row ${i + 1}`, roofPoint(-1, t), [3.4, 0.04, 0.12], i % 2 ? BLUE_L : BLUE_D, { rot: [-SLOPE, 0, 0] }),
  ]),
  box(2, 'Front Eave Edge', [0, 2.97, 1.17], [3.4, 0.1, 0.1], BLUE_D),
  // seigaiha wave valance under the front eave and on the right side
  box(2, 'Valance', [0, 2.65, 0.8], [2.8, 0.5, 0.08], CREAM),
  ...[0, 1].flatMap((row) =>
    Array.from({ length: row ? 6 : 7 }, (_, i) => part(2, `Wave ${row + 1}-${i + 1}`, 'cylinder', [-1.2 + i * 0.4 + (row ? 0.2 : 0), 2.77 - row * 0.2, 0.855], [0.42, 0.03, 0.42], (i + row) % 2 ? RED : '#e8a79b', { segments: 10, rot: [90, 0, 0] })),
  ),
  box(2, 'Side Valance', [1.34, 2.65, 0], [0.08, 0.5, 1.5], CREAM),
  ...Array.from({ length: 3 }, (_, i) => part(2, `Side Wave ${i + 1}`, 'cylinder', [1.385, 2.72 - (i % 2) * 0.12, -0.5 + i * 0.5], [0.42, 0.03, 0.42], i % 2 ? RED : '#e8a79b', { segments: 10, rot: [0, 0, 90] })),
  tube(2, 'Chimney', [-0.55, 4.55, -0.45], [0.26, 1.1, 0.26], '#7a5238', 6),
  part(2, 'Chimney Cap', 'box', [-0.55, 5.2, -0.45], [0.46, 0.34, 0.46], '#5a3a28', { mesh: gable }),
  // the sign board with its brackets, frame and "characters"
  ...[-1.0, 0.6].map((x, i) => box(2, `Sign Bracket ${i + 1}`, [x, 2.82, 1.05], [0.1, 0.1, 0.55], WOOD_D)),
  box(2, 'Sign Frame', [-0.2, 3.3, 1.3], [2.3, 0.95, 0.07], RED_D),
  box(2, 'Sign Board', [-0.2, 3.3, 1.345], [2.14, 0.8, 0.05], RED),
  ...Array.from({ length: 4 }, (_, i) => [
    box(2, `Sign Mark ${i + 1}A`, [-0.95 + i * 0.5, 3.48, 1.385], [0.34, 0.05, 0.03], CREAM),
    box(2, `Sign Mark ${i + 1}B`, [-0.95 + i * 0.5, 3.3, 1.385], [0.06, 0.5, 0.03], CREAM),
    box(2, `Sign Mark ${i + 1}C`, [-0.95 + i * 0.5, 3.12, 1.385], [0.24, 0.05, 0.03], CREAM),
  ]).flat(),
);

// 3 the cat chef and the counter
add(
  box(3, 'Cat Body', [0.55, 1.62, 0.0], [0.7, 0.75, 0.45], '#d8d4cc'),
  box(3, 'Cat Robe Collar', [0.55, 1.9, 0.1], [0.5, 0.12, 0.3], FUR_L),
  ball(3, 'Cat Head', [0.55, 2.08, 0.1], [0.66, 0.58, 0.56], FUR, 8),
  ball(3, 'Cat Muzzle', [0.55, 1.98, 0.36], [0.34, 0.22, 0.14], FUR_L, 6),
  ...LR('Cat Ear', (s, n) => part(3, n, 'cone', [0.55 + s * 0.22, 2.44, 0.1], [0.22, 0.3, 0.18], FUR, { segments: 3 })),
  ...LR('Cat Ear Inner', (s, n) => part(3, n, 'cone', [0.55 + s * 0.22, 2.42, 0.17], [0.11, 0.18, 0.06], PINK, { segments: 3 })),
  ...LR('Cat Eye', (s, n) => ball(3, n, [0.55 + s * 0.14, 2.12, 0.37], [0.12, 0.13, 0.04], '#f6f0d0', 5)),
  ...LR('Cat Pupil', (s, n) => ball(3, n, [0.55 + s * 0.14, 2.12, 0.395], [0.05, 0.1, 0.02], IRON, 4)),
  box(3, 'Cat Nose', [0.55, 2.05, 0.43], [0.06, 0.04, 0.03], PINK),
  ...LR('Cat Whisker Top', (s, n) => box(3, n, [0.55 + s * 0.28, 2.02, 0.4], [0.3, 0.012, 0.012], CREAM, { rot: [0, 0, s * 8] })),
  ...LR('Cat Whisker Low', (s, n) => box(3, n, [0.55 + s * 0.28, 1.96, 0.4], [0.3, 0.012, 0.012], CREAM, { rot: [0, 0, -s * 8] })),
  ...LR('Cat Arm', (s, n) => box(3, n, [0.55 + s * 0.4, 1.55, 0.3], [0.16, 0.2, 0.56], '#c9c4bb')),
  ...LR('Cat Paw', (s, n) => ball(3, n, [0.55 + s * 0.4, 1.5, 0.62], [0.17, 0.12, 0.17], FUR, 5)),
  // counter: sushi board, sushi, cups, menu board, jars
  box(3, 'Sushi Board', [-0.35, 1.45, 0.95], [0.6, 0.04, 0.4], WOOD_L),
  ...[0, 1, 2, 3].flatMap((i) => [
    box(3, `Sushi Rice ${i + 1}`, [-0.55 + i * 0.15, 1.5, 0.95], [0.12, 0.07, 0.07], CREAM),
    box(3, `Sushi Topping ${i + 1}`, [-0.55 + i * 0.15, 1.55, 0.95], [0.13, 0.04, 0.08], ['#f08a6a', '#f4a04a', '#e8d8b0', '#f08a6a'][i]),
  ]),
  box(3, 'Cutting Board', [0.15, 1.44, 1.0], [0.4, 0.03, 0.3], '#e8c898'),
  tube(3, 'Cup Left', [1.05, 1.49, 1.1], [0.1, 0.1, 0.1], '#8a6a4a', 6),
  tube(3, 'Cup Right', [1.25, 1.49, 1.05], [0.1, 0.1, 0.1], '#8a6a4a', 6),
  tube(3, 'Chopstick Cup', [0.55, 1.52, 0.95], [0.12, 0.16, 0.12], '#6f8a6a', 6),
  ...[-0.03, 0.0, 0.03].map((x, i) => box(3, `Chopstick ${i + 1}`, [0.55 + x, 1.66, 0.95], [0.012, 0.18, 0.012], WOOD_L, { rot: [0, 0, x * 200] })),
  box(3, 'Menu Board', [-1.0, 1.66, 1.28], [1.0, 0.5, 0.05], RED, { rot: [-30, 0, 0] }),
  ...[0, 1, 2, 3].map((i) => box(3, `Menu Line ${i + 1}`, [-1.0, 1.66 + (1.5 - i) * 0.095 * 0.866, 1.28 + (1.5 - i) * 0.095 * -0.5 + 0.03], [0.8 - (i % 2) * 0.2, 0.025, 0.02], CREAM, { rot: [-30, 0, 0] })),
  box(3, 'Back Shelf', [-0.5, 1.9, -0.52], [1.4, 0.06, 0.3], WOOD_L),
  ...[0, 1, 2].map((i) => tube(3, `Jar ${i + 1}`, [-1.0 + i * 0.45, 2.1, -0.52], [0.24, 0.34, 0.24], ['#9fb0b4', '#c8b48a', '#b79a7a'][i], 6)),
  box(3, 'Jar Lid Rack', [-0.5, 2.27, -0.52], [1.3, 0.04, 0.04], WOOD_D),
);

// 4 lanterns, the stockpot, the grill and the stools
add(
  box(4, 'Lantern Arm', [-1.78, 3.0, 0.72], [1.0, 0.06, 0.06], WOOD_D),
  tube(4, 'Lantern Cord', [-2.1, 2.88, 0.72], [0.03, 0.32, 0.03], IRON, 4),
  tube(4, 'Lantern Cap Top', [-2.1, 2.72, 0.72], [0.32, 0.08, 0.32], IRON, 8),
  ball(4, 'Big Lantern', [-2.1, 2.15, 0.72], [0.62, 1.1, 0.62], LANTERN, 8),
  ball(4, 'Big Lantern Glow', [-2.1, 2.15, 0.72], [0.5, 0.95, 0.5], GLOW, 8),
  tube(4, 'Lantern Cap Bottom', [-2.1, 1.58, 0.72], [0.32, 0.08, 0.32], IRON, 8),
  box(4, 'Lantern Tassel', [-2.1, 1.4, 0.72], [0.06, 0.28, 0.06], RED_D),
  ...[0, 1].map((i) => box(4, `Lantern Mark ${i + 1}`, [-2.1, 2.4 - i * 0.5, 1.04], [0.2, 0.3, 0.03], CREAM)),
  tube(4, 'Small Lantern Cord', [1.3, 2.75, 0.8], [0.03, 0.3, 0.03], IRON, 4),
  ball(4, 'Small Lantern', [1.3, 2.45, 0.8], [0.3, 0.42, 0.3], LANTERN, 6),
  ball(4, 'Small Lantern Glow', [1.3, 2.45, 0.8], [0.22, 0.34, 0.22], GLOW, 6),
  // stockpot, ladle and teapot on the side shelf
  tube(4, 'Stockpot', [1.8, 1.74, -0.2], [0.7, 0.8, 0.7], CREAM, 10),
  tube(4, 'Stockpot Rim', [1.8, 2.12, -0.2], [0.76, 0.1, 0.76], '#8a6a4a', 10),
  tube(4, 'Ladle', [1.95, 2.3, -0.2], [0.04, 0.7, 0.04], WOOD_D, 4, { rot: [0, 0, 20] }),
  ball(4, 'Teapot', [1.7, 1.48, 0.55], [0.34, 0.28, 0.34], IRON, 6),
  tube(4, 'Teapot Spout', [1.55, 1.55, 0.62], [0.05, 0.2, 0.05], IRON, 4, { rot: [0, 0, 50] }),
  tube(4, 'Teapot Lid', [1.7, 1.65, 0.55], [0.12, 0.05, 0.12], '#3a3a40', 6),
  box(4, 'Soup Tray', [-0.0, 1.46, 1.2], [0.5, 0.03, 0.3], '#4f8a52'),
  tube(4, 'Soup Bowl', [0.0, 1.52, 1.2], [0.24, 0.1, 0.24], '#c9d6dc', 8),
  // a charcoal grill
  ball(4, 'Grill', [2.45, T + 0.38, 0.5], [0.8, 0.76, 0.8], IRON, 7),
  box(4, 'Grill Grate', [2.45, T + 0.76, 0.5], [0.5, 0.03, 0.5], '#555a60'),
  // three yellow stools on the deck
  ...[-1.6, -0.6, 0.4].flatMap((x, i) => {
    const z = 2.0;
    const k = i + 1;
    return [
      tube(4, `Stool Seat ${k}`, [x, T + 0.62, z], [0.52, 0.1, 0.52], YELLOW, 8),
      tube(4, `Stool Cushion ${k}`, [x, T + 0.69, z], [0.42, 0.06, 0.42], '#f5c85a', 8),
      ...[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([dx, dz], j) => box(4, `Stool Leg ${k}-${j + 1}`, [x + dx, T + 0.3, z + dz], [0.06, 0.6, 0.06], WOOD)),
      ...[-0.15, 0.15].map((d, j) => box(4, `Stool Brace ${k}-${j + 1}`, [x, T + 0.25, z + d], [0.3, 0.04, 0.04], WOOD_D)),
      ...[-0.15, 0.15].map((d, j) => box(4, `Stool Brace Cross ${k}-${j + 1}`, [x + d, T + 0.25, z], [0.04, 0.04, 0.3], WOOD_D)),
    ];
  }),
);

applyStyle(parts, [
  [/^(Plaza)/, { paint: 0.4 }],
  [/^(Roof)/, { paint: 0.45 }],
  [/^(Cat Head|Cat Muzzle|Big Lantern|Small Lantern$|Grill$|Teapot$)/, { smooth: true, paint: 0.3 }],
  [/^(Body|Back Wall|Chassis)/, { paint: 0.3 }],
]);

export const CATSTALL: AssetDef = {
  id: 'catstall',
  name: 'Cat Sushi Stall',
  tagline: 'A little street-food cart on a round cobblestone plaza: blue wavy roof, red sign, a cat chef, a big wheel, lanterns and three yellow stools',
  level: 'Detailed',
  thumb: { dir: [0.9, 0.7, 1], zoom: 0.7 },
  learn: ['Lay a round plaza from rings of rotated tiles', 'Build a steep roof with Merge points and lay corrugated rows on it', 'Make a spoked wheel from twelve rim pieces and four spokes', 'Give a small prop character a face from a few flattened spheres and cones'],
  steps: [
    { title: 'The round plaza and the deck', text: 'Two flat cylinders are the plaza and its darker rim. Rings of small boxes in four stone tones, each turned to follow the circle, make the cobbles. Wooden planks in two tones make the deck in front of the stall.', tools: ['Shape: Cylinder, 24 sides', 'Rotate (E)', 'Duplicate Ctrl+D'] },
    { title: 'Cart, counter and wheel', text: 'The cart is a dark chassis with a wooden body on top, four posts, a back wall, a front header and a red counter that sticks out in front. A side shelf on the right holds the pots. The wheel is twelve small blue boxes arranged in a circle and turned to follow it, four spokes and a hub. Grey blocks hold up the rest.', tools: ['Shape: Box', 'Rotate (E)', 'Shape: Cylinder, rotate 90°'] },
    { title: 'Roof, waves and sign', text: 'The roof is a Box. In Edit shape, select the top points at each end and use Merge points to collapse the top into a ridge, then lay thin blue boxes along each slope as corrugated rows. Under the front eave, a cream valance carries rows of flat red and pink cylinders: the wave pattern. A red sign board with cream marks sits on two brackets in front of the roof.', tools: ['Edit shape (Tab)', 'Merge points', 'Rotate (E): 49°', 'Thin boxes'] },
    { title: 'The cat chef and the counter', text: 'The cat is a robe made of one box, a flattened sphere for the head, two small cones for ears with pink inner cones, two eyes with pupils, a muzzle, a nose and whiskers, and two arms ending in paws on the counter. On the counter there is a sushi board with four sushi, a cutting board, cups, chopsticks, a bowl of soup and a slanted menu board.', tools: ['Shape: Sphere', 'Shape: Cone, 3 sides', 'Thin boxes'] },
    { title: 'Lanterns, pots, grill and stools', text: 'A tall red paper lantern hangs from an arm on the left, with a bright glowing core, black caps and a tassel, and a small one hangs on the right. A stockpot with a ladle and a teapot sit on the side shelf, a black grill stands beside the crate, and three yellow stools stand on the deck. Group everything as Cat Sushi Stall.', tools: ['Shape: Sphere', 'Shape: Cylinder', 'Group Ctrl+G'] },
  ],
  challenge: 'Make it snow: turn the plaza tiles white, put a thin white box on each roof slope, and make the lantern glow a cooler orange.',
  parts,
};
