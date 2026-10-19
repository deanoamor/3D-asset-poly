import type { AssetDef, AssetPart } from '../assets';
import { LR, applyStyle, ball, box, gable, part, tube } from './kit';

/**
 * A Japanese back alley (yokocho): a narrow tiled lane between tall, narrow plaster shophouses that press against each
 * other. They have balconies with railings, glowing yellow windows, air conditioners, drain pipes, green and red vertical
 * signs, sliding wooden doors, a roller shutter, a small tavern with a red banner and stools, a corner shop with a
 * red-white-yellow sign, orange lanterns, parked bicycles, stacked tyres, boxes, and a utility pole with wires and a lamp.
 * The lane runs along Z (open at +Z), the right row faces -X and the left row faces +X.
 */

const GROUND = '#6f7378';
const TILE = '#8d9096';
const TILE_D = '#6b6e74';
const DARK = '#2b2d30';
const WOOD = '#6a4a32';
const WOOD_D = '#47311f';
const WOOD_L = '#b58c5c';
const PAPER = '#d9c7a0';
const GLOW = '#ffe39a';
const GLASS_OFF = '#3b414d';
const ROOF = '#4a4038';
const PIPE = '#b99a7a';
const GREY = '#8a8d91';
const GREY_L = '#c9cbce';
const RAIL = '#4d5157';
const RED = '#d9453f';
const GREEN = '#2f9d6a';
const ORANGE = '#f08a2a';
const WHITE = '#f6f3ea';
const YELLOW = '#f2c230';

type Floor = 'G' | 'D' | 'S' | 'N'; // glowing window + balcony, dark window + balcony, small window + air conditioner, plain
interface Sign { c: string; y: number; dz: number; len: number; w?: number }
interface Bld {
  name: string;
  side: 1 | -1;
  z: number;
  w: number;
  floors: Floor[]; // the upper floors
  wall: string;
  ground: 'sliding' | 'shutter' | 'izakaya' | 'shop';
  signs: Sign[];
  lamps?: boolean;
}

const LANE = 3.3; // half width of the lane: the front walls stand at x = ±3.3
const GF = 3.2; // ground floor height
const FH = 3.0; // upper floor height

const BLDS: Bld[] = [
  { name: 'Left 1', side: -1, z: -6.8, w: 4.4, floors: ['D', 'S'], wall: '#e9cdb9', ground: 'sliding', signs: [{ c: GREEN, y: 8.2, dz: -1.85, len: 0.9 }, { c: GREEN, y: 7.7, dz: -1.85, len: 0.9, w: 0.4 }], lamps: true },
  { name: 'Left 2', side: -1, z: -2.6, w: 4.0, floors: ['G'], wall: '#ecd5c2', ground: 'shutter', signs: [{ c: GREEN, y: 4.4, dz: -1.75, len: 2.0 }] },
  { name: 'Left 3', side: -1, z: 1.7, w: 4.6, floors: ['D', 'G'], wall: '#e6c4ae', ground: 'sliding', signs: [{ c: RED, y: 7.2, dz: 1.95, len: 1.6 }] },
  { name: 'Left 4', side: -1, z: 6.1, w: 4.2, floors: ['S'], wall: '#efdcca', ground: 'shop', signs: [] },
  { name: 'Right 1', side: 1, z: -6.7, w: 4.6, floors: ['D', 'S'], wall: '#e8cdb8', ground: 'izakaya', signs: [{ c: RED, y: 7.9, dz: 1.95, len: 1.7 }, { c: RED, y: 7.9, dz: -1.95, len: 1.5 }] },
  { name: 'Right 2', side: 1, z: -2.2, w: 4.4, floors: ['G', 'G'], wall: '#e6c4ae', ground: 'shop', signs: [{ c: GREEN, y: 5.0, dz: -2.0, len: 1.7 }] },
  { name: 'Right 3', side: 1, z: 2.0, w: 4.0, floors: ['G'], wall: '#ecd8c6', ground: 'sliding', signs: [] },
  { name: 'Right 4', side: 1, z: 6.1, w: 4.2, floors: ['S', 'D'], wall: '#e3c1ab', ground: 'shutter', signs: [{ c: RED, y: 4.4, dz: 1.85, len: 1.6 }] },
];

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);

// 0 the lane: ground, tiles and drain
add(
  box(0, 'Ground', [0, 0.02, 0], [22, 0.04, 26], GROUND),
  box(0, 'Lane Tiles', [0, 0.07, 1], [6.6, 0.06, 24], TILE),
  ...Array.from({ length: 7 }, (_, i) => box(0, `Tile Line Long ${i + 1}`, [-2.7 + i * 0.9, 0.105, 1], [0.04, 0.012, 24], TILE_D)),
  ...Array.from({ length: 19 }, (_, i) => box(0, `Tile Line Cross ${i + 1}`, [0, 0.105, -10 + i * 1.2], [6.6, 0.012, 0.04], TILE_D)),
  tube(0, 'Manhole', [0.4, 0.1, 3.0], [0.8, 0.05, 0.8], '#55585d', 10),
  box(0, 'Drain Grate', [-1.4, 0.1, -4.5], [0.4, 0.04, 1.2], DARK),
);

/** One shophouse of a row. The front wall stands at x = ±3.3; `d` is how far out into the lane a thing sticks. */
function building(c: Bld) {
  const s = c.side;
  const fx = s * LANE;
  const px = (d: number) => fx - s * d;
  const n = c.name;
  const w = c.w;
  const H = 0.15 + GF + FH * c.floors.length;
  const yb = (f: number) => 0.15 + GF + FH * (f - 1); // base of upper floor f
  add(
    box(1, `${n} Body`, [s * (LANE + 3.5), H / 2, c.z], [7.0, H, w], c.wall),
    box(1, `${n} Roof Cap`, [s * (LANE + 3.5), H + 0.13, c.z], [7.3, 0.26, w + 0.08], ROOF),
    box(1, `${n} Roof Edge`, [px(0.15), H - 0.04, c.z], [0.36, 0.14, w + 0.08], ROOF),
    box(1, `${n} Plinth`, [px(0.04), 0.3, c.z], [0.1, 0.3, w], '#bda08c'),
    tube(1, `${n} Drain Pipe`, [px(0.06), H / 2, c.z + w / 2 - 0.2], [0.12, H, 0.12], PIPE, 6),
    box(1, `${n} Meter Box`, [px(0.06), 1.6, c.z + w / 2 - 0.55], [0.14, 0.34, 0.26], GREY_L),
    ...c.floors.map((_, i) => box(1, `${n} Floor Line ${i + 1}`, [px(0.02), yb(i + 1), c.z], [0.06, 0.1, w], '#c9a691')),
  );

  // ground floor
  const gw = w * 0.82;
  if (c.ground === 'sliding' || c.ground === 'shop') {
    add(
      box(2, `${n} Door Frame`, [px(0.05), 1.7, c.z], [0.1, 2.7, gw], WOOD_D),
      ...[-1, 1].map((k, i) => box(2, `${n} Door Panel ${i + 1}`, [px(0.1), 1.65, c.z + k * gw * 0.245], [0.06, 2.45, gw * 0.46], PAPER)),
      ...[-1, 1].flatMap((k, i) => [
        ...[-0.5, 0, 0.5].map((f, j) => box(2, `${n} Door Bar ${i + 1}-${j + 1}`, [px(0.14), 1.65, c.z + k * gw * 0.245 + f * gw * 0.3], [0.04, 2.45, 0.04], WOOD)),
        ...[0, 1, 2, 3].map((j) => box(2, `${n} Door Rail ${i + 1}-${j + 1}`, [px(0.14), 0.7 + j * 0.7, c.z + k * gw * 0.245], [0.04, 0.05, gw * 0.46], WOOD)),
      ]),
      box(2, `${n} Door Step`, [px(0.2), 0.12, c.z], [0.4, 0.16, gw], '#a99d8f'),
    );
  }
  if (c.ground === 'shop') {
    const sw = gw * 0.95;
    add(
      box(2, `${n} Shop Sign Red`, [px(0.13), 3.2, c.z - sw * 0.34], [0.26, 0.5, sw * 0.3], RED),
      box(2, `${n} Shop Sign White`, [px(0.13), 3.2, c.z], [0.26, 0.5, sw * 0.42], WHITE),
      box(2, `${n} Shop Sign Yellow`, [px(0.13), 3.2, c.z + sw * 0.34], [0.26, 0.5, sw * 0.3], YELLOW),
      ...[-0.15, 0.15].map((f, i) => box(2, `${n} Shop Sign Mark ${i + 1}`, [px(0.27), 3.2, c.z + f * sw], [0.03, 0.3, 0.14], RED)),
    );
  }
  if (c.ground === 'shutter') {
    add(
      box(2, `${n} Shutter Frame`, [px(0.05), 1.65, c.z], [0.1, 2.6, gw * 0.9], DARK),
      box(2, `${n} Shutter`, [px(0.1), 1.6, c.z], [0.08, 2.4, gw * 0.84], GREY),
      ...Array.from({ length: 7 }, (_, i) => box(2, `${n} Shutter Groove ${i + 1}`, [px(0.15), 0.55 + i * 0.32, c.z], [0.03, 0.03, gw * 0.84], '#6d7075')),
      box(2, `${n} Shutter Box`, [px(0.17), 3.0, c.z], [0.34, 0.3, gw * 0.92], GREY_L),
      box(2, `${n} Vent`, [px(0.1), 1.2, c.z - w / 2 + 0.55], [0.2, 0.7, 0.55], GREY_L),
      ...[0, 1, 2, 3, 4].map((i) => box(2, `${n} Vent Slat ${i + 1}`, [px(0.21), 0.95 + i * 0.12, c.z - w / 2 + 0.55], [0.03, 0.05, 0.5], GREY)),
    );
  }
  if (c.ground === 'izakaya') {
    add(
      box(2, `${n} Banner`, [px(0.08), 2.0, c.z], [0.06, 2.6, gw * 0.96], RED),
      ...[-0.3, 0, 0.3].map((f, i) => box(2, `${n} Banner Mark ${i + 1}`, [px(0.12), 2.0 + (i % 2) * 0.3, c.z + f * gw], [0.03, 0.7, 0.4], WHITE)),
      box(2, `${n} Banner Rod`, [px(0.08), 3.35, c.z], [0.08, 0.08, gw], WOOD_D),
      box(2, `${n} Counter`, [px(0.5), 0.55, c.z], [0.8, 0.9, gw * 0.8], WOOD),
      box(2, `${n} Counter Top`, [px(0.5), 1.03, c.z], [0.95, 0.06, gw * 0.84], WOOD_L),
      ...[0, 1, 2, 3].map((i) => box(2, `${n} Bottle ${i + 1}`, [px(0.6), 1.2, c.z - gw * 0.3 + i * 0.4], [0.08, 0.3, 0.08], ['#3b7d4f', '#7a4a2a', '#c9d6dc', '#3b7d4f'][i])),
      part(2, `${n} Tavern Roof`, 'box', [px(0.55), 3.5, c.z], [1.3, 0.4, gw * 0.94], ROOF, { mesh: gable, rot: [0, 90, 0] }),
      ...[0, 1, 2, 3].map((i) => tube(2, `${n} Stool ${i + 1}`, [px(1.4), 0.3, c.z - 1.5 + i], [0.38, 0.5, 0.38], '#a5442f', 6)),
      box(2, `${n} Table`, [px(2.3), 0.75, c.z - 0.5], [0.8, 0.06, 1.4], WOOD_L),
      tube(2, `${n} Table Leg`, [px(2.3), 0.37, c.z - 0.5], [0.12, 0.74, 0.12], WOOD_D, 5),
    );
  }

  // upper floors
  c.floors.forEach((t, i) => {
    const f = i + 1;
    const y0 = yb(f);
    const k = `${n} F${f}`;
    if (t === 'G' || t === 'D') {
      const ww = w * 0.72;
      add(
        box(3, `${k} Window Frame`, [px(0.04), y0 + 1.5, c.z], [0.12, 1.5, ww], WOOD_D),
        box(3, `${k} Window Glass`, [px(0.09), y0 + 1.5, c.z], [0.06, 1.3, ww - 0.18], t === 'G' ? GLOW : GLASS_OFF),
        ...[-1, 1].map((m, j) => box(3, `${k} Window Bar ${j + 1}`, [px(0.12), y0 + 1.5, c.z + m * ww * 0.17], [0.04, 1.3, 0.05], WOOD_D)),
        box(3, `${k} Window Rail`, [px(0.12), y0 + 1.5, c.z], [0.04, 0.05, ww - 0.18], WOOD_D),
        // balcony: a slab with a railing of thin bars
        box(3, `${k} Balcony`, [px(0.35), y0 + 0.06, c.z], [0.7, 0.12, ww + 0.3], '#c7b09c'),
        box(3, `${k} Balcony Rail Top`, [px(0.66), y0 + 0.98, c.z], [0.05, 0.05, ww + 0.3], RAIL),
        box(3, `${k} Balcony Rail Low`, [px(0.66), y0 + 0.3, c.z], [0.04, 0.04, ww + 0.3], RAIL),
        ...Array.from({ length: 9 }, (_, j) => box(3, `${k} Balcony Bar ${j + 1}`, [px(0.66), y0 + 0.62, c.z - ww / 2 - 0.15 + (j * (ww + 0.3)) / 8], [0.04, 0.68, 0.04], RAIL)),
        ...[-1, 1].map((m, j) => box(3, `${k} Balcony Post ${j + 1}`, [px(0.66), y0 + 0.55, c.z + m * (ww / 2 + 0.15)], [0.06, 0.86, 0.06], RAIL)),
      );
    } else if (t === 'S') {
      add(
        box(3, `${k} Small Frame`, [px(0.04), y0 + 1.6, c.z - w * 0.12], [0.12, 1.1, w * 0.4], WOOD_D),
        box(3, `${k} Small Glass`, [px(0.09), y0 + 1.6, c.z - w * 0.12], [0.06, 0.9, w * 0.4 - 0.16], GLOW),
        box(3, `${k} Small Sill`, [px(0.2), y0 + 1.0, c.z - w * 0.12], [0.4, 0.07, w * 0.4 + 0.1], '#c7b09c'),
        box(3, `${k} Air Conditioner`, [px(0.2), y0 + 1.1, c.z + w * 0.27], [0.45, 0.42, 0.74], GREY_L),
        part(3, `${k} Air Conditioner Fan`, 'cylinder', [px(0.44), y0 + 1.1, c.z + w * 0.27], [0.3, 0.04, 0.3], '#575b61', { segments: 8, rot: [0, 0, 90] }),
        box(3, `${k} Air Conditioner Pipe`, [px(0.02), y0 + 0.7, c.z + w * 0.27], [0.08, 0.5, 0.08], PIPE),
      );
    }
  });
  for (const [i, g] of c.signs.entries()) {
    const sw = g.w ?? 0.5;
    add(
      box(4, `${n} Sign ${i + 1}`, [px(0.1), g.y, c.z + g.dz], [0.36, g.len, sw], g.c),
      box(4, `${n} Sign Mark ${i + 1}`, [px(0.27), g.y, c.z + g.dz], [0.04, g.len * 0.55, sw * 0.5], WHITE),
    );
  }
  if (c.ground !== 'izakaya') {
    add(
      ball(4, `${n} Lantern A`, [px(0.2), 2.55, c.z - w * 0.3], [0.36, 0.46, 0.36], ORANGE, 6),
      tube(4, `${n} Lantern A Cord`, [px(0.12), 2.9, c.z - w * 0.3], [0.03, 0.4, 0.03], DARK, 4),
    );
  }
}
BLDS.forEach(building);

// 4 the alley's end, props and the utility pole
const bike = (k: string, x: number, z: number, color: string) => [
  ...[-0.5, 0.5].map((dz, i) => part(5, `Bike ${k} Wheel ${i + 1}`, 'cylinder', [x, 0.36, z + dz], [0.7, 0.06, 0.7], '#2a2a2a', { segments: 10, rot: [0, 0, 90] })),
  box(5, `Bike ${k} Frame`, [x, 0.62, z], [0.08, 0.06, 1.0], color),
  box(5, `Bike ${k} Post`, [x, 0.8, z - 0.12], [0.06, 0.5, 0.06], color),
  box(5, `Bike ${k} Steer`, [x, 0.85, z + 0.45], [0.06, 0.5, 0.06], color),
  box(5, `Bike ${k} Seat`, [x, 1.06, z - 0.1], [0.14, 0.06, 0.28], DARK),
  box(5, `Bike ${k} Handle`, [x, 1.08, z + 0.48], [0.5, 0.05, 0.05], DARK),
  box(5, `Bike ${k} Basket`, [x, 0.9, z + 0.58], [0.3, 0.2, 0.28], GREY),
];
add(
  box(5, 'End Building', [0, 5.2, -12.4], [21, 10.4, 2.4], '#d9b8a3'),
  part(5, 'End Roof', 'box', [0, 11.0, -12.4], [21.6, 1.4, 2.6], ROOF, { mesh: gable }),
  ...[-6, -2, 2, 6].map((x, i) => box(5, `End Window ${i + 1}`, [x, 5.0, -11.15], [1.6, 1.4, 0.1], i % 2 ? GLOW : GLASS_OFF)),
  ...bike('Red', -2.55, -5.2, '#c0392b'),
  ...bike('Teal', 2.2, 0.5, '#7fb8b0'),
  // stacked tyres, boxes, buckets
  ...[0, 1, 2].map((i) => part(5, `Tyre ${i + 1}`, 'cylinder', [-2.5, 0.2 + i * 0.22, -3.6], [0.72, 0.22, 0.72], '#222', { segments: 10 })),
  box(5, 'Box 1', [-2.4, 0.3, -1.0], [0.6, 0.5, 0.5], '#c9a574'),
  box(5, 'Box 2', [-2.6, 0.2, -0.3], [0.5, 0.3, 0.4], '#d6b684'),
  box(5, 'Box 3', [2.6, 0.25, -0.4], [0.5, 0.4, 0.5], '#c9a574'),
  box(5, 'Box 4', [2.5, 0.2, 2.8], [0.5, 0.3, 0.45], '#d6b684'),
  tube(5, 'Bucket 1', [-2.6, 0.2, 3.5], [0.3, 0.3, 0.3], '#3b7dd9', 7),
  tube(5, 'Bucket 2', [-2.4, 0.2, 3.9], [0.3, 0.3, 0.3], '#d94f4f', 7),
  box(5, 'Crate', [2.6, 0.2, 4.6], [0.55, 0.32, 0.4], '#b8402e'),
  ball(5, 'Trash Bag 1', [-2.7, 0.25, 7.2], [0.55, 0.5, 0.5], '#22252a', 6),
  ball(5, 'Trash Bag 2', [-2.5, 0.22, 7.7], [0.45, 0.42, 0.45], '#2d3036', 6),
  // utility pole with wires and a lamp
  ...LR('Pole', (s, n) => tube(5, n, [s * 2.45, 4.7, -1.6], [0.3, 9.4, 0.3], '#8e8a80', 6)),
  ...LR('Pole Far', (s, n) => tube(5, n, [s * 2.45, 4.7, 7.5], [0.3, 9.4, 0.3], '#8e8a80', 6)),
  box(5, 'Wire Across 1', [0, 8.6, -1.6], [4.9, 0.04, 0.04], DARK),
  box(5, 'Wire Across 2', [0, 8.25, -1.6], [4.9, 0.04, 0.04], DARK),
  box(5, 'Wire Across 3', [0, 8.6, 7.5], [4.9, 0.04, 0.04], DARK),
  ...[-1, 1].map((s, i) => box(5, `Wire Long ${i + 1}`, [s * 2.45, 8.6, 3.0], [0.04, 0.04, 20], DARK)),
  ...[-1, 1].map((s, i) => box(5, `Wire Long Low ${i + 1}`, [s * 2.45, 8.25, 3.0], [0.04, 0.04, 20], DARK)),
  box(5, 'Lamp Arm', [-2.1, 6.2, -1.6], [0.9, 0.08, 0.08], '#8e8a80'),
  box(5, 'Lamp Head', [-1.65, 6.15, -1.6], [0.5, 0.14, 0.34], '#e8e4d8'),
  box(5, 'Lamp Glow', [-1.65, 6.06, -1.6], [0.4, 0.04, 0.26], GLOW),
  box(5, 'Pole Transformer', [2.45, 7.2, -1.6], [0.5, 0.7, 0.5], GREY),
);

applyStyle(parts, [
  [/^(Ground|Lane Tiles)/, { paint: 0.4 }],
  [/ Body$|^End Building/, { paint: 0.35 }],
  [/^(Trash Bag)/, { smooth: true, paint: 0.4 }],
]);

export const JAPANALLEY: AssetDef = {
  id: 'japanalley',
  name: 'Japanese Alley',
  tagline: 'A narrow tiled back alley between tall plaster shophouses with balconies, glowing windows, signs, lanterns, bikes and a utility pole with wires',
  level: 'Detailed',
  thumb: { dir: [0.6, 0.35, 1], zoom: 0.55 },
  learn: ['Build one narrow shophouse from boxes, then duplicate and vary it along a lane', 'Make a balcony from a slab, a top rail, a low rail and thin bars', 'Give a facade depth with window frames, glass in front, signs and pipes', 'Build a bicycle from two discs, a frame and a few thin boxes'],
  steps: [
    { title: 'The lane', text: 'A dark Box is the ground and a lighter Box is the tiled lane, with thin darker boxes along and across it for the tile lines. A flat cylinder is the manhole and a dark thin Box the drain grate.', tools: ['Shape: Box', 'Shape: Cylinder', 'Duplicate Ctrl+D'] },
    { title: 'Shophouse bodies', text: 'Each house is one tall Box in a slightly different pink-beige plaster, two or three floors high. A dark roof cap on top, an overhanging roof edge at the front, a plinth at the bottom, a thin line at every floor, a drain pipe and a meter box on the front make it look lived in. Build one and duplicate it along both sides of the lane.', tools: ['Shape: Box', 'Shape: Cylinder, 6 sides', 'Duplicate Ctrl+D'] },
    { title: 'Ground floors', text: 'The sliding doors are a dark frame with two paper panels and thin bars and rails for the lattice. The grey roller shutter is one Box with thin grooves and a box on top for the shutter case. The tavern has a big red banner with white marks, a wooden counter with bottles, a small gabled roof, stools and a table. The corner shops have a sign in three boxes: red, white and yellow.', tools: ['Thin boxes', 'Shape: Cylinder', 'Edit shape (Tab)', 'Merge points'] },
    { title: 'Windows, balconies and air conditioners', text: 'A window is a dark frame, glass in front of it (glowing yellow or dark) and a thin bar in the middle. A balcony is a slab that sticks out, with a top rail, a low rail and nine thin bars. Floors without a balcony get a small window with a sill and an air conditioner: a light box with a flat dark cylinder as the fan.', tools: ['Thin boxes', 'Shape: Cylinder, rotate 90°', 'Duplicate Ctrl+D'] },
    { title: 'Signs and lanterns', text: 'Tall green and red signs stick out from the walls with a white mark on each, and orange lanterns hang beside the doors on a thin cord.', tools: ['Thin boxes', 'Shape: Sphere, 6 sides', 'Move (G)'] },
    { title: 'Props, pole and wires', text: 'Two bicycles are built from two flat cylinders for wheels, a frame, a post, a seat, handles and a basket. Stacked tyres, cardboard boxes, buckets, a crate and trash bags fill the corners. A utility pole on each side has thin dark wires across and along the lane, and a lamp on a short arm. A tall building closes the end of the alley. Group everything as Japanese Alley.', tools: ['Shape: Cylinder, 10 sides', 'Thin boxes', 'Group Ctrl+G'] },
  ],
  challenge: 'Make it a rainy night: darken every wall, make the glowing windows and lanterns brighter, and turn the lane tiles a wet dark grey.',
  parts,
};
