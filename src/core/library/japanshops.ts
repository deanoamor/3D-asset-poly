import type { AssetDef, AssetPart } from '../assets';
import { LR, applyStyle, ball, box, gable, part, tube } from './kit';

/**
 * A Japanese shopping street (shotengai): a street with an entrance arch, sidewalks, road markings and a zebra
 * crossing, and eight small shops in two rows (a convenience store, a ramen shop, a bakery, a flower shop, a pharmacy, a
 * tavern, a bookshop and a sushi bar) with awnings, signs, noren curtains and lanterns, plus utility poles with wires,
 * banner poles, vending machines, bicycles and a post box.
 * The street runs along Z, the right row faces -X and the left row faces +X.
 */

const GRASS = '#98b36a';
const ROAD = '#4d5157';
const WALK = '#cbc6ba';
const CURB = '#a9a498';
const LINE = '#f4f1e8';
const GLASS = '#a9d3e4';
const GLASS_D = '#82b8d0';
const DARK = '#2b2d30';
const WOOD = '#6e4b32';
const WOOD_D = '#4a3223';
const RED = '#c9382f';
const INDIGO = '#2c3f6e';
const PAPER = '#fbf8ee';
const IRON = '#3a4048';
const POLE = '#8e8a80';

interface Shop {
  name: string;
  side: 1 | -1;
  z: number;
  floors: number;
  wall: string;
  trim: string;
  band: string;
  awn: [string, string];
  upper: string;
  kind: 'konbini' | 'ramen' | 'bakery' | 'flower' | 'pharmacy' | 'izakaya' | 'books' | 'sushi';
}

const SHOPS: Shop[] = [
  { name: 'Convenience Store', side: 1, z: -7.5, floors: 2, wall: '#f2f0ea', trim: '#2aa15a', band: '#2aa15a', awn: ['#2aa15a', '#f4f1e8'], upper: '#dcd8cc', kind: 'konbini' },
  { name: 'Ramen Shop', side: 1, z: -2.5, floors: 2, wall: '#8b6a4d', trim: '#4a3223', band: '#b3322a', awn: ['#b3322a', '#3b2a22'], upper: '#c9b79c', kind: 'ramen' },
  { name: 'Bakery', side: 1, z: 2.5, floors: 3, wall: '#f4e3c6', trim: '#d6a05a', band: '#d9778c', awn: ['#e98fa4', '#fbf3e6'], upper: '#ead3ab', kind: 'bakery' },
  { name: 'Flower Shop', side: 1, z: 7.5, floors: 2, wall: '#e3efd9', trim: '#6d9c58', band: '#6d9c58', awn: ['#7fb36a', '#f6f3e6'], upper: '#cfe0c2', kind: 'flower' },
  { name: 'Pharmacy', side: -1, z: -7.5, floors: 3, wall: '#eef1f2', trim: '#3a9a6a', band: '#3a9a6a', awn: ['#3a9a6a', '#ffffff'], upper: '#d6dcde', kind: 'pharmacy' },
  { name: 'Tavern', side: -1, z: -2.5, floors: 2, wall: '#6f4f3a', trim: '#2f2018', band: '#2f2018', awn: ['#2c3f6e', '#d9d2c0'], upper: '#a5876d', kind: 'izakaya' },
  { name: 'Bookshop', side: -1, z: 2.5, floors: 3, wall: '#e8d9c0', trim: '#7a5a3c', band: '#7a5a3c', awn: ['#8a3f3a', '#e8d9c0'], upper: '#d6c3a3', kind: 'books' },
  { name: 'Sushi Bar', side: -1, z: 7.5, floors: 2, wall: '#d9d4c7', trim: '#3a3f46', band: '#3a3f46', awn: ['#c9382f', '#f4f1e8'], upper: '#b9b3a4', kind: 'sushi' },
];

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);

// 0 street: ground, road, sidewalks, markings and the entrance arch
add(
  box(0, 'Ground', [0, 0.02, 0], [34, 0.04, 40], GRASS),
  box(0, 'Road', [0, 0.04, 0], [7, 0.08, 38], ROAD),
  ...LR('Sidewalk', (s, n) => box(0, n, [s * 4.35, 0.07, 0], [1.7, 0.14, 38], WALK)),
  ...LR('Curb', (s, n) => box(0, n, [s * 3.6, 0.09, 0], [0.16, 0.18, 38], CURB)),
  ...Array.from({ length: 9 }, (_, i) => box(0, `Center Dash ${i + 1}`, [0, 0.086, -16 + i * 4], [0.14, 0.012, 1.8], LINE)),
  ...Array.from({ length: 7 }, (_, i) => box(0, `Zebra Stripe ${i + 1}`, [-2.7 + i * 0.9, 0.086, 12.5], [0.55, 0.012, 3.0], LINE)),
  ...LR('Sidewalk Tile Line', (s, n) => box(0, n, [s * 4.35, 0.145, 0], [0.05, 0.01, 38], CURB)),
  ...LR('Arch Pillar', (s, n) => box(0, n, [s * 3.8, 2.9, -17.5], [0.5, 5.8, 0.5], RED)),
  box(0, 'Arch Board', [0, 5.5, -17.5], [8.6, 1.0, 0.4], RED),
  ...[-2.7, -1.35, 0, 1.35, 2.7].map((x, i) => box(0, `Arch Mark ${i + 1}`, [x, 5.5, -17.27], [0.8, 0.5, 0.06], PAPER)),
  box(0, 'Arch Top', [0, 6.15, -17.5], [9.0, 0.3, 0.7], WOOD_D),
  part(0, 'Arch Roof', 'box', [0, 6.75, -17.5], [9.4, 0.9, 1.3], '#4f5a66', { mesh: gable }),
  ...LR('Arch Base', (s, n) => box(0, n, [s * 3.8, 0.2, -17.5], [0.8, 0.4, 0.8], CURB)),
);

/** One shop of the row: body, front, awning, upper floors and a projecting sign. Left: x = -5.2, right: x = 5.2. */
function shop(c: Shop) {
  const s = c.side;
  const fx = s * 5.2;
  const px = (d: number) => fx - s * d; // d metres out into the street
  const H = 3.2 * c.floors + 0.3;
  const n = `${c.name}`;
  // body
  add(
    box(1, `${n} Body`, [s * 8.2, H / 2, c.z], [6.0, H, 4.8], c.wall),
    box(1, `${n} Roof Cap`, [s * 8.2, H + 0.12, c.z], [6.2, 0.24, 5.0], c.trim),
    box(1, `${n} Ground Trim`, [px(0.02), 0.2, c.z], [0.1, 0.4, 4.8], c.trim),
    box(1, `${n} Pipe`, [px(0.07), H / 2, c.z + 2.3], [0.12, H, 0.12], POLE),
  );
  // front: shop window, door, sign band and its marks
  add(
    box(2, `${n} Window Frame`, [px(0.05), 1.5, c.z], [0.1, 2.3, 4.1], DARK),
    box(2, `${n} Window Glass`, [px(0.1), 1.5, c.z - 0.3], [0.06, 2.1, 2.9], GLASS),
    box(2, `${n} Door Glass`, [px(0.1), 1.45, c.z + 1.5], [0.06, 2.0, 0.9], GLASS_D),
    box(2, `${n} Door Bar`, [px(0.14), 1.45, c.z + 1.5], [0.04, 2.0, 0.05], DARK),
    box(2, `${n} Window Bar`, [px(0.14), 1.5, c.z - 0.3], [0.04, 2.1, 0.05], DARK),
    box(2, `${n} Sign Band`, [px(0.14), 3.0, c.z], [0.28, 0.7, 4.6], c.band),
    ...[-1.4, -0.45, 0.5, 1.45].map((dz, i) => box(2, `${n} Sign Mark ${i + 1}`, [px(0.3), 3.0, c.z + dz], [0.05, 0.42, 0.55], PAPER)),
  );
  // awning: striped slanted boxes
  add(
    ...[-2, -1, 0, 1, 2].map((i) => box(2, `${n} Awning ${i + 3}`, [px(0.5), 2.62, c.z + i * 0.9], [1.0, 0.08, 0.9], c.awn[(i + 2) % 2], { rot: [0, 0, s * 14] })),
  );
  // upper floors: two windows each, an air conditioner and a projecting sign
  for (let f = 1; f < c.floors; f++) {
    const y = 3.2 * f + 1.95;
    add(
      ...[-1.2, 1.2].flatMap((dz, i) => [
        box(3, `${n} Upper Frame ${f}-${i + 1}`, [px(0.05), y, c.z + dz], [0.1, 1.4, 1.5], c.trim),
        box(3, `${n} Upper Glass ${f}-${i + 1}`, [px(0.1), y, c.z + dz], [0.06, 1.2, 1.3], i ? GLASS_D : GLASS),
        box(3, `${n} Upper Sill ${f}-${i + 1}`, [px(0.2), y - 0.72, c.z + dz], [0.34, 0.08, 1.7], '#bdb8aa'),
      ]),
      box(3, `${n} Air Conditioner ${f}`, [px(0.27), y - 1.0, c.z + 2.0], [0.5, 0.4, 0.55], '#d9dcde'),
      box(3, `${n} Upper Band ${f}`, [px(0.02), 3.2 * f + 0.2, c.z], [0.08, 0.14, 4.8], c.upper),
    );
  }
  add(
    box(3, `${n} Hanging Sign`, [px(0.55), 3.2 + 1.3, c.z - 2.0], [1.0, 2.0, 0.14], c.band),
    box(3, `${n} Hanging Sign Mark`, [px(0.55), 4.8, c.z - 1.92], [0.7, 0.9, 0.04], PAPER),
  );

  // what makes each shop different
  const sw = (d: number) => px(d);
  switch (c.kind) {
    case 'konbini':
      add(
        box(4, 'Konbini Stripe Top', [sw(0.16), 3.55, c.z], [0.2, 0.1, 4.8], '#2a6fbf'),
        box(4, 'Konbini Stripe Low', [sw(0.16), 3.7, c.z], [0.2, 0.1, 4.8], '#f08a2e'),
        tube(4, 'Konbini Pole', [s * 4.0, 2.8, c.z - 2.6], [0.2, 5.6, 0.2], IRON, 6),
        box(4, 'Konbini Pole Sign', [s * 4.0, 5.9, c.z - 2.6], [0.3, 1.1, 1.5], '#2aa15a'),
        box(4, 'Konbini Pole Sign Mark', [s * 3.84, 5.9, c.z - 2.6], [0.04, 0.5, 1.0], PAPER),
        box(4, 'Konbini Basket Stand', [sw(0.6), 0.5, c.z - 2.0], [0.5, 0.7, 0.6], '#e8e4d8'),
        ...[0, 1, 2].map((i) => box(4, `Konbini Crate ${i + 1}`, [sw(0.6), 0.95 + i * 0.2, c.z - 2.0], [0.3, 0.2, 0.26], ['#e04b4b', '#f0c24a', '#4b8be0'][i])),
      );
      break;
    case 'ramen':
      add(
        ...[-0.2, 0.0, 0.2].map((_, i) => box(4, `Ramen Noren ${i + 1}`, [sw(0.22), 2.2, c.z + 1.5 + (i - 1) * 0.3], [0.04, 0.8, 0.28], INDIGO)),
        tube(4, 'Ramen Noren Rod', [sw(0.22), 2.62, c.z + 1.5], [0.04, 1.0, 0.04], WOOD_D, 4, { rot: [90, 0, 0] }),
        ball(4, 'Ramen Lantern', [sw(0.5), 2.0, c.z - 1.6], [0.4, 0.55, 0.4], RED, 6),
        tube(4, 'Ramen Lantern Cord', [sw(0.5), 2.45, c.z - 1.6], [0.03, 0.5, 0.03], DARK, 4),
        box(4, 'Ramen Menu Stand', [sw(0.9), 0.65, c.z + 0.5], [0.35, 1.0, 0.5], '#2f2018'),
        box(4, 'Ramen Menu Board', [sw(1.06), 0.85, c.z + 0.5], [0.04, 0.6, 0.38], PAPER),
        box(4, 'Ramen Banner', [sw(0.06), 1.2, c.z - 2.4], [0.2, 1.6, 0.5], RED),
      );
      break;
    case 'bakery':
      add(
        box(4, 'Bakery Display Shelf', [sw(0.35), 0.62, c.z - 1.0], [0.5, 0.9, 1.6], '#d9b88a'),
        ...[0, 1, 2, 3].map((i) => ball(4, `Bakery Bread ${i + 1}`, [sw(0.35), 1.12, c.z - 1.6 + i * 0.4], [0.28, 0.2, 0.34], ['#c98a3c', '#e0a85a', '#b8742c', '#e8c27a'][i], 5)),
        ball(4, 'Bakery Bread Sign', [sw(0.3), 3.55, c.z + 1.8], [0.5, 0.36, 0.5], '#d9a35a', 6),
        box(4, 'Bakery Chalkboard', [sw(0.2), 0.7, c.z + 1.6], [0.3, 1.0, 0.7], '#2b3a35'),
      );
      break;
    case 'flower':
      add(
        ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
          box(4, `Flower Pot ${i + 1}`, [sw(0.7 + (i % 2) * 0.5), 0.3, c.z - 2.0 + i * 0.75], [0.36, 0.32, 0.36], '#b9704a'),
          ball(4, `Flower Bloom ${i + 1}`, [sw(0.7 + (i % 2) * 0.5), 0.62, c.z - 2.0 + i * 0.75], [0.42, 0.32, 0.42], ['#e86a8f', '#f4d24a', '#e8803a', '#b06ad8', '#f06a6a', '#f4f0e0'][i], 5),
        ]),
        box(4, 'Flower Shelf', [sw(0.3), 0.9, c.z + 1.2], [0.4, 0.1, 1.2], WOOD),
      );
      break;
    case 'pharmacy':
      add(
        box(4, 'Pharmacy Cross Upright', [sw(0.45), 4.2, c.z + 1.6], [0.12, 1.2, 0.36], '#2aa15a'),
        box(4, 'Pharmacy Cross Bar', [sw(0.45), 4.2, c.z + 1.6], [0.12, 0.36, 1.2], '#2aa15a'),
        box(4, 'Pharmacy Banner', [sw(0.06), 1.5, c.z + 2.3], [0.2, 2.0, 0.3], '#2aa15a'),
        ball(4, 'Pharmacy Mascot Body', [sw(0.6), 0.45, c.z - 2.0], [0.5, 0.7, 0.4], '#9bd07a', 6),
        ball(4, 'Pharmacy Mascot Head', [sw(0.6), 0.95, c.z - 2.0], [0.5, 0.4, 0.4], '#a8da88', 6),
      );
      break;
    case 'izakaya':
      add(
        ...[-1.8, -0.9, 0, 0.9, 1.8].map((dz, i) => ball(4, `Tavern Lantern ${i + 1}`, [sw(0.6), 2.2, c.z + dz], [0.34, 0.46, 0.34], RED, 6)),
        ...[-1.8, -0.9, 0, 0.9, 1.8].map((dz, i) => tube(4, `Tavern Lantern Cord ${i + 1}`, [sw(0.6), 2.5, c.z + dz], [0.03, 0.3, 0.03], DARK, 4)),
        ...[-0.2, 0.0, 0.2].map((_, i) => box(4, `Tavern Noren ${i + 1}`, [sw(0.22), 2.1, c.z + 1.5 + (i - 1) * 0.3], [0.04, 0.9, 0.28], '#e8dfc6')),
        ball(4, 'Tavern Cedar Ball', [sw(0.5), 3.5, c.z - 1.9], [0.7, 0.7, 0.7], '#5c8a4a', 6),
        box(4, 'Tavern Barrel', [sw(0.7), 0.45, c.z - 1.8], [0.6, 0.6, 0.6], WOOD),
      );
      break;
    case 'books':
      add(
        box(4, 'Bookshop Shelf', [sw(0.4), 0.8, c.z - 1.0], [0.4, 1.4, 1.8], WOOD),
        ...[0, 1, 2, 3, 4, 5].map((i) => box(4, `Bookshop Book ${i + 1}`, [sw(0.62), 0.9 + (i % 2) * 0.55, c.z - 1.7 + (i >> 1) * 0.7], [0.1, 0.4, 0.5], ['#d94f4f', '#4f7fd9', '#4fb06e', '#e0b341', '#8a5fc9', '#ee8a3c'][i])),
        box(4, 'Bookshop Banner', [sw(0.06), 1.4, c.z + 2.3], [0.2, 1.8, 0.3], '#8a3f3a'),
      );
      break;
    case 'sushi':
      add(
        ...[-0.25, 0.0, 0.25].map((d, i) => box(4, `Sushi Noren ${i + 1}`, [sw(0.22), 2.1, c.z + 1.5 + d * 1.2], [0.04, 0.9, 0.28], PAPER)),
        ...[-0.25, 0.0, 0.25].map((d, i) => box(4, `Sushi Noren Mark ${i + 1}`, [sw(0.23), 2.1, c.z + 1.5 + d * 1.2], [0.02, 0.3, 0.14], RED)),
        ball(4, 'Sushi Lantern', [sw(0.5), 2.0, c.z - 1.5], [0.4, 0.55, 0.4], PAPER, 6),
        tube(4, 'Sushi Lantern Cord', [sw(0.5), 2.45, c.z - 1.5], [0.03, 0.5, 0.03], DARK, 4),
        box(4, 'Sushi Planter', [sw(0.3), 0.4, c.z + 2.1], [0.5, 0.5, 0.5], '#6f6a5f'),
        ball(4, 'Sushi Shrub', [sw(0.3), 0.95, c.z + 2.1], [0.6, 0.6, 0.6], '#4a7a46', 6),
      );
      break;
  }
}
SHOPS.forEach(shop);

// 5 street furniture: utility poles with wires, banner poles, vending machines, bicycles, post box
add(
  ...LR('Utility Pole', (s, n) => tube(5, n, [s * 3.5, 4.2, 14], [0.3, 8.4, 0.3], POLE, 6)),
  ...LR('Utility Crossarm', (s, n) => box(5, n, [s * 3.5, 7.7, 14], [0.12, 0.14, 1.6], WOOD_D)),
  ...LR('Utility Pole Far', (s, n) => tube(5, n, [s * 3.5, 4.2, -14], [0.3, 8.4, 0.3], POLE, 6)),
  ...LR('Utility Crossarm Far', (s, n) => box(5, n, [s * 3.5, 7.7, -14], [0.12, 0.14, 1.6], WOOD_D)),
  ...LR('Utility Wire', (s, n) => box(5, n, [s * 3.5, 7.75, 0], [0.04, 0.04, 28.5], DARK)),
  ...LR('Utility Wire Low', (s, n) => box(5, n, [s * 3.5, 7.45, 0.3], [0.04, 0.04, 28.5], DARK)),
  box(5, 'Transformer', [3.5, 7.1, 14], [0.5, 0.7, 0.5], '#8a9099'),
  ...[-12.5, -5, 0, 5, 10].flatMap((z, i) =>
    ([-1, 1] as const).flatMap((s) => {
      const k = `${i + 1}${s > 0 ? 'R' : 'L'}`;
      return [
        tube(5, `Banner Pole ${k}`, [s * 3.5, 2.2, z], [0.1, 4.4, 0.1], IRON, 5),
        box(5, `Banner ${k}`, [s * 3.5, 3.4, z + 0.3], [0.03, 1.5, 0.6], i % 2 ? '#f4a6bd' : '#f0c24a'),
        box(5, `Banner Arm ${k}`, [s * 3.5, 4.2, z + 0.2], [0.05, 0.05, 0.5], IRON),
      ];
    }),
  ),
  ...[0, 1, 2].map((i) => box(5, `Vending Machine ${i + 1}`, [-4.3, 0.95, 12 + i * 0.95], [0.75, 1.8, 0.8], ['#d94f4f', '#4f7fd9', '#f4f1e8'][i])),
  part(5, 'Vending Canopy', 'box', [-4.3, 2.15, 12.95], [3.2, 0.6, 1.2], '#6f7780', { mesh: gable, rot: [0, 90, 0] }),
  ...[0, 1, 2].map((i) => box(5, `Vending Window ${i + 1}`, [-3.93, 1.3, 12 + i * 0.95], [0.04, 0.9, 0.6], '#cfe6f0')),
  ...[0, 1, 2, 3].map((i) => box(5, `Bike ${i + 1}`, [4.35, 0.55, 11.2 + i * 0.6], [0.5, 0.8, 0.12], ['#d94f4f', '#4f7fd9', '#4fb06e', '#e0b341'][i], { rot: [0, 0, 0] })),
  ...[0, 1, 2, 3].map((i) => box(5, `Bike Seat ${i + 1}`, [4.35, 0.98, 11.2 + i * 0.6], [0.28, 0.06, 0.12], IRON)),
  tube(5, 'Post Box', [4.7, 0.65, 10.2], [0.5, 1.1, 0.5], RED, 8),
  box(5, 'Post Box Slot', [4.7, 1.0, 10.2], [0.44, 0.06, 0.1], DARK),
  ...[-6.2, 6.2].map((z, i) => tube(5, `Street Tree Trunk ${i + 1}`, [3.9, 1.0, z], [0.28, 2.0, 0.28], WOOD, 6)),
  ...[-6.2, 6.2].map((z, i) => ball(5, `Street Tree ${i + 1}`, [3.9, 2.8, z], [1.6, 1.8, 1.6], ['#f4b5c8', '#8cc06a'][i], 6)),
);

applyStyle(parts, [
  [/^(Ground)/, { paint: 0.4 }],
  [/ Body$/, { paint: 0.3 }],
  [/^(Street Tree \d|Tavern Cedar|Sushi Shrub|Flower Bloom|Bakery Bread \d)/, { smooth: true, paint: 0.5 }],
]);

export const JAPANSHOPS: AssetDef = {
  id: 'japanshops',
  name: 'Japanese Shopping Street',
  tagline: 'A shotengai with eight shops, awnings, signs and lanterns, an entrance arch, utility poles, vending machines and a zebra crossing',
  level: 'Detailed',
  thumb: { dir: [0.9, 0.55, 1], zoom: 0.62 },
  learn: ['Build one shop front, then duplicate it along a street and change its colours', 'Make a slanted striped awning from thin rotated boxes', 'Stack a sign band, projecting sign and upper windows on a building', 'Dress a street with poles, wires, banners and vending machines'],
  steps: [
    { title: 'Street, sidewalks and arch', text: 'A green Box is the ground and a long dark Box is the road, with two lighter sidewalks and thin curbs beside it. Thin white boxes make the dashed centre line and the zebra crossing. At the far end, two red pillars carry a red board with white marks and a dark top beam: the entrance arch.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Color palette'] },
    { title: 'Shop bodies', text: 'Each shop is one tall Box, two or three floors high, with a thin coloured roof cap on top, a trim along the bottom and a grey drain pipe at the corner. Make one and duplicate it along each side of the street, changing the height and the colour.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Color palette'] },
    { title: 'Shop fronts and awnings', text: 'The ground floor has a dark window frame with blue glass in front, a glass door and a coloured sign band with four white boxes for the letters. Over it, five thin boxes tilted about 14 degrees in two colours make the striped awning.', tools: ['Thin boxes', 'Rotate (E): 14°', 'Duplicate Ctrl+D'] },
    { title: 'Upper floors and signs', text: 'Each upper floor has two windows (a frame, glass in front and a sill), an air conditioner and a thin band at the floor line. A tall hanging sign sticks out from the wall, a thin box with a white mark on it.', tools: ['Thin boxes', 'Duplicate Ctrl+D', 'Move (G)'] },
    { title: 'What makes each shop different', text: 'The convenience store has a green, blue and orange band and a tall pole sign. The ramen shop has indigo noren curtains, a red lantern and a menu board. The bakery has bread made of small spheres on a shelf, the flower shop has pots with coloured blooms, the pharmacy a green cross and a mascot, the tavern a row of red lanterns and a cedar ball, the bookshop a shelf of coloured books and the sushi bar white noren with red marks.', tools: ['Shape: Sphere, 5 sides', 'Shape: Cylinder', 'Thin boxes'] },
    { title: 'Poles, banners and street furniture', text: 'Tall utility poles with crossarms carry thin dark wires along both sides. Banner poles with pink and yellow flags line the sidewalks, three vending machines stand at the end of the left side, and four bicycles, a red post box and two street trees fill the right side. Group everything as Japanese Shopping Street.', tools: ['Shape: Cylinder, 6 sides', 'Thin boxes', 'Group Ctrl+G'] },
  ],
  challenge: 'Make it night: turn the sky dark, make the lantern and sign colours brighter, and give every window a warm yellow glass.',
  parts,
};
