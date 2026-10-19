import type { AssetDef, AssetPart } from '../assets';
import { LR, applyStyle, ball, box, gable, part, tube } from './kit';

/**
 * A Japanese housing complex (danchi): two long five-storey concrete apartment blocks facing each other across a lawn.
 * Every flat has a balcony with a slab, an orange underside, a solid base and a railing of thin bars, a sliding door and
 * a small window; the ends are plain with a dark logo and the backs have stair cores. The courtyard has a concrete
 * path, round low-poly bushes and trees, green street lamps, a no-entry sign, benches, a bicycle shelter and a bin hut,
 * and a third block stands far away.
 * The blocks run along Z; the left block faces +X and the right block faces -X.
 */

const GRASS = '#7cb342';
const GRASS_D = '#6aa236';
const PATH = '#c3beb2';
const PLINTH = '#5b4a40';
const CONC = '#dedbd0';
const CONC_B = '#e4ddcd';
const CONC_D = '#c9c5ba';
const SLAB = '#d3cfc5';
const ORANGE = '#d98b3c';
const PANEL = '#ebe6d8';
const RAIL = '#59606a';
const FRAME = '#4a4d55';
const GLASS = '#7fa3bd';
const GLASS_L = '#a9c4d6';
const PIPE = '#ecebe6';
const GREEN = '#4caf50';
const GREEN_D = '#2e7d32';
const BUSH = ['#3f8f3f', '#4a9d45', '#357a37', '#58a84c'];
const TRUNK = '#6b4a32';
const FUTON = ['#f4b6c2', '#a9d1f0', '#f5e08a'];
const RED = '#cc2a2e';
const WHITE = '#f6f3ea';
const WOOD = '#a87a4e';
const IRON = '#3a4048';

const UNITS = 8; // flats per floor
const UNIT_W = 3.0;
const FLOORS = 5;
const FH = 2.9;
const Y0 = 0.8; // floor level of the ground floor
const TOP = Y0 + FH * FLOORS; // 15.3
const LEN = UNITS * UNIT_W; // 24

const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);

// 0 ground, lawn, path
add(
  box(0, 'Ground', [0, 0.02, -3], [44, 0.04, 54], GRASS),
  box(0, 'Lawn Patch Left', [-1.3, 0.045, 6], [2.2, 0.012, 8], GRASS_D),
  box(0, 'Lawn Patch Right', [1.5, 0.045, -4], [2.0, 0.012, 9], GRASS_D),
  box(0, 'Center Path', [0, 0.06, 0], [1.7, 0.1, 30], PATH),
  ...LR('Facade Walk', (s, n) => box(0, n, [s * 3.6, 0.06, 0], [0.9, 0.1, 25], PATH)),
  box(0, 'Cross Path', [0, 0.06, 14.5], [8.6, 0.1, 1.6], PATH),
);

/** One long block. s = -1 is the left block (faces +X), s = +1 the right block (faces -X). */
function block(s: 1 | -1, detailed: boolean) {
  const n = s < 0 ? 'Left' : 'Right';
  const fx = s * 4; // the facade
  const px = (d: number) => fx - s * d; // d metres out into the courtyard
  const yb = (f: number) => Y0 + FH * f; // floor level of floor f
  const body = CONC;
  add(
    box(1, `${n} Block Plinth`, [s * 8.2, 0.3, 0], [8.4, 0.6, LEN + 0.4], PLINTH),
    box(1, `${n} Block Body`, [s * 8, (0.6 + TOP) / 2, 0], [8, TOP - 0.6, LEN], s < 0 ? body : CONC_B),
    box(1, `${n} Block Roof Cap`, [s * 8, TOP + 0.15, 0], [8.4, 0.3, LEN + 0.4], CONC_D),
    box(1, `${n} Block Roof Edge`, [px(0.05), TOP + 0.05, 0], [0.5, 0.25, LEN + 0.4], ORANGE),
    box(1, `${n} Block Hatch`, [s * 10, TOP + 0.75, 3], [1.6, 1.0, 1.6], CONC_D),
    // the plain end walls with a dark logo
    ...[-1, 1].map((e, i) => box(1, `${n} Block End Mark ${i + 1}`, [s * 5.4, TOP - 1.6, e * (LEN / 2 + 0.01)], [0.9, 0.7, 0.04], '#2a2d33')),
    ...[-1, 1].map((e, i) => box(1, `${n} Block End Mark Wing ${i + 1}`, [s * 5.0, TOP - 1.3, e * (LEN / 2 + 0.01)], [0.4, 0.4, 0.04], '#2a2d33', { rot: [0, 0, 30] })),
    // pipes and meter boxes on the facade
    ...[-1, 1].map((e, i) => tube(1, `${n} Block Pipe ${i + 1}`, [px(0.05), TOP / 2, e * (LEN / 2 - 0.25)], [0.14, TOP, 0.14], PIPE, 6)),
    ...[0, 1, 2].map((i) => box(1, `${n} Block Meter ${i + 1}`, [px(0.1), 1.4, -LEN / 2 + 0.8 + i * 0.5], [0.25, 0.5, 0.3], '#d6d9dc')),
  );
  // stair cores on the back with slit windows
  for (const [i, z] of [-6, 6].entries()) {
    add(
      box(1, `${n} Stair Core ${i + 1}`, [s * 12.8, (0.6 + TOP) / 2 + 0.3, z], [1.6, TOP - 0.3, 3.4], CONC_D),
      ...[0, 1, 2, 3].map((k) => box(1, `${n} Stair Slit ${i + 1}-${k + 1}`, [s * 13.63, 3.3 + k * 3.4, z], [0.06, 1.6, 0.6], GLASS)),
    );
  }

  // flats: balcony, sliding door, window
  for (let f = 0; f < FLOORS; f++) {
    const y = yb(f);
    for (let u = 0; u < UNITS; u++) {
      const z = -LEN / 2 + UNIT_W / 2 + u * UNIT_W;
      const k = `${n} ${f + 1}-${u + 1}`;
      add(
        box(2, `${k} Balcony`, [px(0.64), y + 0.09, z], [1.32, 0.18, 2.6], SLAB),
        box(2, `${k} Balcony Underside`, [px(0.64), y - 0.02, z], [1.34, 0.1, 2.64], ORANGE),
        box(2, `${k} Balcony Panel`, [px(1.3), y + 0.45, z], [0.08, 0.55, 2.6], PANEL),
        box(2, `${k} Balcony Rail`, [px(1.3), y + 1.15, z], [0.06, 0.05, 2.6], RAIL),
        box(2, `${k} Door Frame`, [px(-0.03), y + 1.18, z - 0.5], [0.12, 2.0, 1.1], FRAME),
        box(2, `${k} Door Glass`, [px(-0.07), y + 1.18, z - 0.5], [0.06, 1.8, 0.9], (u + f) % 3 ? GLASS : GLASS_L),
        box(2, `${k} Window Frame`, [px(-0.03), y + 1.45, z + 0.85], [0.12, 1.0, 0.8], FRAME),
      );
      if (!detailed) add(box(2, `${k} Rail Fill`, [px(1.3), y + 0.93, z], [0.03, 0.42, 2.5], '#8a9098'));
      if (detailed) {
        add(
          ...[-0.8, -0.27, 0.27, 0.8].map((dz, j) => box(2, `${k} Bar ${j + 1}`, [px(1.3), y + 0.93, z + dz], [0.04, 0.45, 0.04], RAIL)),
          ...[-1, 1].map((e, j) => box(2, `${k} Side Panel ${j + 1}`, [px(0.64), y + 0.45, z + e * 1.26], [1.32, 0.55, 0.08], PANEL)),
          box(2, `${k} Window Glass`, [px(-0.07), y + 1.45, z + 0.85], [0.06, 0.8, 0.6], GLASS_L),
        );
        if ((u + f) % 4 === 0) add(box(2, `${k} Air Conditioner`, [px(0.5), y + 0.35, z + 0.7], [0.4, 0.35, 0.5], '#e4e6e8'));
        if ((u * 3 + f) % 7 === 0) add(box(2, `${k} Futon`, [px(1.36), y + 0.95, z - 0.2], [0.08, 0.55, 0.9], FUTON[(u + f) % 3]));
      }
    }
  }
}
block(-1, true);
block(1, false);

// 3 the courtyard: bushes, trees, lamps, signs, benches, shelters and the far block
const bush = (k: string, x: number, z: number, r: number, c: number) => ball(3, `Bush ${k}`, [x, r * 0.65, z], [r * 2, r * 1.3, r * 2], BUSH[c % 4], 6);
add(
  ...Array.from({ length: 8 }, (_, i) => bush(`L${i + 1}`, -3.0, -10 + i * 2.8, 0.55 + (i % 3) * 0.12, i)),
  ...Array.from({ length: 8 }, (_, i) => bush(`R${i + 1}`, 3.0, -9 + i * 2.8, 0.5 + ((i + 1) % 3) * 0.12, i + 1)),
  bush('C1', 1.4, 7.5, 0.8, 2),
  bush('C2', -1.5, -2, 0.7, 0),
  bush('C3', 1.6, -8, 0.75, 3),
  ...[[-2.0, 15.5], [2.2, 17.5], [-5.5, 18], [6.0, 14.5]].flatMap(([x, z], i) => [
    tube(3, `Tree Trunk ${i + 1}`, [x, 1.0, z], [0.36, 2.0, 0.36], TRUNK, 6, { taper: 0.75 }),
    ball(3, `Tree Canopy ${i + 1}`, [x, 3.2, z], [3.0 + (i % 2) * 0.5, 2.6, 3.0 + (i % 2) * 0.5], BUSH[(i + 1) % 4], 6),
    ball(3, `Tree Canopy Top ${i + 1}`, [x + 0.3, 4.3, z - 0.2], [1.8, 1.4, 1.8], BUSH[(i + 3) % 4], 5),
  ]),
  // green street lamps
  ...[[-1.7, -8], [-1.7, 0], [-1.7, 8], [1.7, -4], [1.7, 4]].flatMap(([x, z], i) => [
    tube(3, `Lamp Pole ${i + 1}`, [x, 2.0, z], [0.12, 4.0, 0.12], GREEN, 6),
    tube(3, `Lamp Base ${i + 1}`, [x, 0.25, z], [0.24, 0.5, 0.24], GREEN_D, 6),
    tube(3, `Lamp Head ${i + 1}`, [x, 4.15, z], [0.32, 0.3, 0.32], '#eef0ee', 8),
    tube(3, `Lamp Cap ${i + 1}`, [x, 4.32, z], [0.4, 0.06, 0.4], GREEN_D, 8),
  ]),
  // no-entry sign
  tube(3, 'Sign Pole', [1.5, 1.1, 11], [0.08, 2.2, 0.08], '#9aa0a6', 5),
  part(3, 'Sign Disc', 'cylinder', [1.5, 2.2, 11.04], [0.62, 0.05, 0.62], RED, { segments: 12, rot: [90, 0, 0] }),
  box(3, 'Sign Bar', [1.5, 2.2, 11.08], [0.46, 0.1, 0.03], WHITE),
  // benches
  ...[-1, 1].flatMap((e, i) => [
    box(3, `Bench Seat ${i + 1}`, [e * 1.5, 0.5, -3.5 + i * 0.0], [0.5, 0.06, 1.5], WOOD),
    box(3, `Bench Back ${i + 1}`, [e * 1.5 + e * 0.22, 0.77, -3.5], [0.06, 0.5, 1.5], WOOD),
    ...[-0.6, 0.6].map((dz, j) => box(3, `Bench Leg ${i + 1}-${j + 1}`, [e * 1.5, 0.25, -3.5 + dz], [0.4, 0.5, 0.08], IRON)),
  ]),
  // bicycle shelter with a gabled roof
  ...[[-1.4, 13.2], [1.4, 13.2], [-1.4, 14.8], [1.4, 14.8]].map(([x, z], i) => box(3, `Shelter Post ${i + 1}`, [x, 1.1, z], [0.1, 2.2, 0.1], IRON)),
  part(3, 'Shelter Roof', 'box', [0, 2.55, 14], [3.4, 0.7, 2.2], '#7c8791', { mesh: gable }),
  ...[0, 1, 2, 3].map((i) => box(3, `Shelter Bike ${i + 1}`, [-1.0 + i * 0.65, 0.5, 14], [0.12, 0.8, 1.5], ['#d94f4f', '#4f7fd9', '#4fb06e', '#e0b341'][i])),
  // bin hut
  box(3, 'Bin Hut', [-5.2, 0.9, 12.5], [1.8, 1.8, 1.4], '#8f9aa4'),
  part(3, 'Bin Hut Roof', 'box', [-5.2, 2.2, 12.5], [2.2, 0.7, 1.7], '#6c7782', { mesh: gable }),
  box(3, 'Bin Hut Door', [-5.2, 0.8, 13.22], [1.0, 1.4, 0.06], '#6c7782'),
  // the far block
  box(3, 'Far Block', [0, 6.5, -27], [26, 13, 7], CONC),
  box(3, 'Far Block Roof Cap', [0, 13.15, -27], [26.4, 0.3, 7.4], CONC_D),
  ...Array.from({ length: 5 }, (_, i) => box(3, `Far Balcony Line ${i + 1}`, [0, 1.6 + i * 2.5, -23.45], [26.2, 0.18, 0.7], ORANGE)),
  ...Array.from({ length: 5 }, (_, i) => box(3, `Far Window Band ${i + 1}`, [0, 2.6 + i * 2.5, -23.52], [25.6, 1.0, 0.06], GLASS)),
);

applyStyle(parts, [
  [/^(Ground|Lawn)/, { paint: 0.4 }],
  [/ Block Body$|^Far Block$/, { paint: 0.3 }],
  [/^(Bush|Tree Canopy)/, { smooth: false, paint: 0.5 }],
  [/^Tree Trunk/, { smooth: true, paint: 0.4 }],
]);

export const DANCHI: AssetDef = {
  id: 'danchi',
  name: 'Japanese Housing Complex',
  tagline: 'Two long five-storey apartment blocks with balconies facing each other across a lawn with bushes, trees and green lamps',
  level: 'Detailed',
  thumb: { dir: [0.9, 0.35, 1], zoom: 0.6 },
  learn: ['Build one flat with its balcony, then duplicate it along a floor and up the building', 'Make a balcony from a slab, an orange underside, a solid base and a railing', 'Round off a bush from a flattened low-poly sphere', 'Fill a courtyard with paths, lamps, benches and signs'],
  steps: [
    { title: 'Ground, lawn and paths', text: 'A big bright green Box is the lawn, with two slightly darker patches. Light grey thin Boxes make the centre path, the walks along both facades and the cross path at the end.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Color palette'] },
    { title: 'The long blocks', text: 'Each block is a dark brown plinth under one long cream Box, topped with a light roof cap and an orange edge along the courtyard side. Two white pipes run up the facade, a few grey meter boxes stand at the bottom, a dark logo sits on each plain end wall and two stair cores with slit windows stick out of the back.', tools: ['Shape: Box', 'Shape: Cylinder, 6 sides', 'Rotate (E): 30°'] },
    { title: 'Flats and balconies', text: 'One flat is a grey balcony slab with a thin orange Box under it, a cream solid base, a top rail and four thin bars, two side panels, a sliding door with glass in front and a small window. Build one, then duplicate it along the floor and up the five floors. Some balconies get an air conditioner or a pastel futon over the rail.', tools: ['Thin boxes', 'Duplicate Ctrl+D', 'Move (G)'] },
    { title: 'Courtyard and far block', text: 'Round bushes are flattened low-poly spheres in four greens along both facades. Trees at the open end are a short trunk with two stacked spheres. Green lamps with white heads line the path, a red no-entry sign stands on a pole, two wooden benches face each other, and a bicycle shelter with a gabled roof and a small bin hut stand near the end. A third block stands far away with orange balcony lines and window bands. Group everything as Japanese Housing Complex.', tools: ['Shape: Sphere, 6 sides', 'Shape: Cylinder', 'Edit shape (Tab)', 'Merge points'] },
  ],
  challenge: 'Make it autumn: turn the lawn a dry yellow-green, turn the bushes and tree canopies orange and red, and add a thin box of fallen leaves under each tree.',
  parts,
};
