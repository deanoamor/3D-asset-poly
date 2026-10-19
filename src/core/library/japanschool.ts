import type { AssetDef, AssetPart } from '../assets';
import { LR, applyStyle, ball, box, gable, part, tube } from './kit';

/**
 * A Japanese school: a three-storey concrete school building with ribbon windows, a clock tower, a covered entrance
 * and a roof with a water tank, a gymnasium joined by a covered walkway, a sandy schoolyard with a running track and a
 * goal, a flagpole with the Japanese flag, a bicycle shelter, a gate with an iron fence and cherry trees.
 * The front faces +Z and the main block is 24 m wide.
 */

const GRASS = '#8cab5a';
const SAND = '#d9c9a2';
const LINE = '#f6f3ea';
const CONCRETE = '#ece7da';
const CONCRETE_D = '#cfc9bb';
const BAND = '#b9b4a6';
const FRAME = '#7f8b94';
const GLASS = '#8fc7e0';
const GLASS_D = '#6fb0cf';
const ROOF = '#7c8791';
const GREEN = '#3f7a63';
const NAVY = '#27406b';
const STONE = ['#9d9c96', '#8a8983', '#aaa9a2'];
const IRON = '#3a4048';
const RED = '#cc2a2e';
const PINK = ['#f4b5c8', '#f8c8d6', '#eea0b8'];
const WOOD = '#6e4b32';
const BIKE = ['#d94f4f', '#4f7fd9', '#4fb06e', '#e0b341', '#8a5fc9', '#ee8a3c'];

const FLOOR_Y = [2.0, 5.45, 8.9]; // centres of the three floors
const PARTS: AssetPart[] = [];
const parts = PARTS;
const add = (...p: AssetPart[]) => parts.push(...p);
const BAYS = Array.from({ length: 8 }, (_, i) => -10.5 + i * 3);

// 0 ground, schoolyard and foundation
add(
  box(0, 'Ground', [3, 0.02, 6], [50, 0.04, 34], GRASS),
  box(0, 'Schoolyard', [0, 0.045, 12], [30, 0.03, 13], SAND),
  ...[0, 1, 2, 3, 4].map((i) => box(0, `Track Line ${i + 1}`, [0, 0.067, 13 + i], [26, 0.015, 0.1], LINE)),
  box(0, 'Foundation', [0, 0.2, 0], [24.4, 0.4, 9.4], STONE[0]),
  ...Array.from({ length: 8 }, (_, i) => box(0, `Foundation Stone ${i + 1}`, [-10.5 + i * 3, 0.2, 4.72], [2.7, 0.3, 0.04], STONE[(i + 1) % 3])),
);

// 1 the three floors
add(
  ...FLOOR_Y.map((y, i) => box(1, `Floor ${i + 1} Wall`, [0, y, 0], [24, 3.2, 9], i % 2 ? CONCRETE_D : CONCRETE)),
  box(1, 'Ledge 1', [0, 3.725, 0], [24.5, 0.25, 9.5], BAND),
  box(1, 'Ledge 2', [0, 7.175, 0], [24.5, 0.25, 9.5], BAND),
  ...[[-12, 4.5], [12, 4.5], [-12, -4.5], [12, -4.5]].map(([x, z], i) => box(1, `Corner Pier ${i + 1}`, [x, 5.55, z], [0.6, 10.3, 0.6], BAND)),
  box(1, 'Roof Slab', [0, 10.6, 0], [24.4, 0.2, 9.4], ROOF),
  box(1, 'Parapet Front', [0, 10.95, 4.6], [24.4, 0.5, 0.2], CONCRETE),
  box(1, 'Parapet Back', [0, 10.95, -4.6], [24.4, 0.5, 0.2], CONCRETE),
  ...LR('Parapet Side', (s, n) => box(1, n, [s * 12.1, 10.95, 0], [0.2, 0.5, 9.0], CONCRETE)),
);

// 2 windows: eight bays on each floor at the front, ribbons at the back
add(
  ...FLOOR_Y.flatMap((y, f) =>
    BAYS.flatMap((x, b) => {
      if (f === 0 && (b === 3 || b === 4)) return [];
      const k = `${f + 1}-${b + 1}`;
      return [
        box(2, `Window Frame ${k}`, [x, y + 0.1, 4.55], [2.2, 1.5, 0.1], FRAME),
        box(2, `Window Glass ${k}`, [x, y + 0.1, 4.6], [2.0, 1.3, 0.08], b % 2 ? GLASS : GLASS_D),
        box(2, `Window Bar ${k}`, [x, y + 0.1, 4.65], [0.05, 1.3, 0.04], FRAME),
      ];
    }),
  ),
  ...FLOOR_Y.flatMap((y, f) => [
    box(2, `Back Window Frame ${f + 1}`, [0, y + 0.1, -4.55], [22, 1.5, 0.1], FRAME),
    box(2, `Back Window Glass ${f + 1}`, [0, y + 0.1, -4.6], [21.6, 1.3, 0.08], GLASS),
  ]),
  ...FLOOR_Y.flatMap((y, f) => LR(`End Window ${f + 1}`, (s, n) => box(2, n, [s * 12.05, y + 0.1, 0], [0.1, 1.4, 4.0], GLASS_D))),
);

// 3 entrance, clock tower and rooftop
add(
  box(3, 'Entrance Canopy', [0, 3.45, 5.6], [7.0, 0.25, 2.6], CONCRETE),
  ...LR('Canopy Pillar', (s, n) => box(3, n, [s * 3.2, 1.9, 6.6], [0.4, 3.0, 0.4], CONCRETE)),
  box(3, 'School Sign', [0, 3.45, 6.93], [4.4, 0.5, 0.1], NAVY),
  ...[-1.5, -0.5, 0.5, 1.5].map((x, i) => box(3, `Sign Mark ${i + 1}`, [x, 3.45, 6.98], [0.55, 0.28, 0.03], LINE)),
  box(3, 'Entrance Step Upper', [0, 0.2, 5.0], [5.0, 0.4, 0.6], STONE[2]),
  box(3, 'Entrance Step Lower', [0, 0.1, 5.55], [5.6, 0.2, 0.6], STONE[0]),
  ...[-0.7, 0.7].map((x, i) => box(3, `Door Frame ${i + 1}`, [x, 1.6, 4.55], [1.3, 2.4, 0.1], FRAME)),
  ...[-0.7, 0.7].map((x, i) => box(3, `Door Glass ${i + 1}`, [x, 1.6, 4.6], [1.1, 2.2, 0.08], GLASS)),
  ...[-0.7, 0.7].map((x, i) => box(3, `Door Handle ${i + 1}`, [x + (i ? -0.4 : 0.4), 1.5, 4.66], [0.05, 0.5, 0.04], IRON)),
  box(3, 'Shoe Box Row', [-2.9, 1.0, 4.62], [1.6, 1.2, 0.2], WOOD),
  // clock tower
  box(3, 'Clock Tower', [0, 12.95, 0], [4.0, 4.5, 4.0], CONCRETE),
  box(3, 'Clock Tower Band', [0, 10.9, 0], [4.3, 0.25, 4.3], BAND),
  part(3, 'Clock Face', 'cylinder', [0, 13.3, 2.06], [1.9, 0.12, 1.9], LINE, { segments: 10, rot: [90, 0, 0] }),
  box(3, 'Clock Hand Hour', [0.22, 13.45, 2.13], [0.1, 0.5, 0.04], IRON, { rot: [0, 0, -50] }),
  box(3, 'Clock Hand Minute', [0, 13.65, 2.13], [0.07, 0.8, 0.04], IRON),
  ...[0, 1, 2, 3].map((i) => box(3, `Tower Window ${i + 1}`, [-1.2 + i * 0.8, 11.7, 2.03], [0.5, 0.9, 0.06], i % 2 ? GLASS : GLASS_D)),
  part(3, 'Tower Roof', 'box', [0, 16.1, 0], [4.8, 1.8, 4.8], GREEN, { mesh: gable }),
  tube(3, 'Tower Spire', [0, 17.4, 0], [0.12, 1.4, 0.12], IRON, 5),
  // rooftop
  tube(3, 'Water Tank', [-8, 11.6, -1], [1.7, 1.8, 1.7], '#9fb3c4', 8),
  tube(3, 'Water Tank Band', [-8, 11.6, -1], [1.76, 0.1, 1.76], FRAME, 8),
  box(3, 'Stair Hut', [8, 11.9, 0], [3.0, 2.4, 2.6], CONCRETE),
  box(3, 'Stair Hut Roof', [8, 13.15, 0], [3.3, 0.16, 2.9], ROOF),
  box(3, 'Stair Hut Door', [8, 11.5, 1.33], [0.9, 1.6, 0.06], FRAME),
  tube(3, 'Antenna', [8, 14.3, 0], [0.08, 2.4, 0.08], IRON, 4),
);

// 4 gymnasium, walkway, flagpole, bicycle shelter and gate
add(
  box(4, 'Gym', [17.5, 2.75, 0], [9, 5.5, 11], CONCRETE_D),
  part(4, 'Gym Roof', 'box', [17.5, 6.6, 0], [9.8, 2.2, 11.6], ROOF, { mesh: gable }),
  box(4, 'Gym Band', [17.5, 1.0, 5.55], [9.1, 0.3, 0.12], GREEN),
  box(4, 'Gym Window Frame', [17.5, 4.2, 5.55], [7.5, 0.9, 0.1], FRAME),
  box(4, 'Gym Window Glass', [17.5, 4.2, 5.6], [7.3, 0.7, 0.08], GLASS),
  box(4, 'Gym Door Frame', [17.5, 1.7, 5.55], [1.9, 2.6, 0.1], FRAME),
  box(4, 'Gym Door', [17.5, 1.6, 5.6], [1.6, 2.4, 0.08], NAVY),
  box(4, 'Walkway Roof', [12.6, 3.3, 1.0], [2.2, 0.2, 2.4], ROOF),
  ...LR('Walkway Post', (s, n) => box(4, n, [12.6, 1.65, 1.0 + s * 1.1], [0.14, 3.3, 0.14], FRAME)),
  tube(4, 'Flag Pole', [-6, 4.0, 10], [0.14, 8.0, 0.14], '#c9ccd0', 6),
  ball(4, 'Flag Pole Top', [-6, 8.1, 10], [0.24, 0.24, 0.24], '#e6c75a', 5),
  box(4, 'Flag', [-6.85, 7.1, 10], [1.6, 1.1, 0.03], LINE),
  part(4, 'Flag Sun', 'cylinder', [-6.85, 7.1, 10.035], [0.5, 0.04, 0.5], RED, { segments: 10, rot: [90, 0, 0] }),
  box(4, 'Bike Shelter Roof', [9.4, 2.5, 10.5], [6.2, 0.15, 2.8], ROOF),
  ...[[6.5, 9.3], [12.3, 9.3], [6.5, 11.7], [12.3, 11.7]].map(([x, z], i) => box(4, `Shelter Post ${i + 1}`, [x, 1.25, z], [0.12, 2.5, 0.12], FRAME)),
  ...BIKE.map((c, i) => box(4, `Bike ${i + 1}`, [6.9 + i * 0.9, 0.45, 10.5], [0.14, 0.8, 1.6], c)),
  ...BIKE.map((_, i) => box(4, `Bike Seat ${i + 1}`, [6.9 + i * 0.9, 0.85, 10.2], [0.18, 0.08, 0.3], IRON)),
  // the gate and the iron fence along the road
  ...LR('Gate Pillar', (s, n) => box(4, n, [s * 2.6, 1.2, 19.2], [0.6, 2.4, 0.6], STONE[2])),
  ...LR('Gate Plate', (s, n) => box(4, n, [s * 2.6, 1.7, 19.51], [0.8, 0.4, 0.05], NAVY)),
  box(4, 'Gate Leaf', [-2.3, 0.75, 18.3], [0.08, 1.3, 2.0], IRON),
  ...[...Array.from({ length: 15 }, (_, i) => -17 + i), ...Array.from({ length: 15 }, (_, i) => 3 + i)].map((x, i) => box(4, `Fence Bar ${i + 1}`, [x, 0.7, 19.2], [0.06, 1.4, 0.06], IRON)),
  box(4, 'Fence Rail Left Top', [-10, 1.3, 19.2], [14.2, 0.07, 0.07], IRON),
  box(4, 'Fence Rail Left Low', [-10, 0.4, 19.2], [14.2, 0.07, 0.07], IRON),
  box(4, 'Fence Rail Right Top', [10, 1.3, 19.2], [14.2, 0.07, 0.07], IRON),
  box(4, 'Fence Rail Right Low', [10, 0.4, 19.2], [14.2, 0.07, 0.07], IRON),
);

// 5 the schoolyard: goal and cherry trees
add(
  ...[10.0, 13.0].map((z, i) => box(5, `Goal Post ${i + 1}`, [-13, 1.1, z], [0.1, 2.2, 0.1], LINE)),
  box(5, 'Goal Crossbar', [-13, 2.2, 11.5], [0.1, 0.1, 3.1], LINE),
  ...[10.0, 13.0].map((z, i) => box(5, `Goal Top Bar ${i + 1}`, [-13.5, 2.15, z], [1.0, 0.05, 0.05], LINE)),
  box(5, 'Goal Net', [-14, 1.1, 11.5], [0.03, 2.1, 3.0], '#d5d8da'),
  ...[[-14.8, 6.5], [-14.8, 15.5], [-9.5, 7.2], [15, 13.5], [20.5, 14.5]].flatMap(([x, z], i) => {
    const k = i + 1;
    return [
      box(5, `Petals ${k}`, [x, 0.07, z], [4.2, 0.012, 4.2], PINK[1]),
      tube(5, `Cherry Trunk ${k}`, [x, 1.2, z], [0.42, 2.4, 0.42], WOOD, 6, { taper: 0.7 }),
      ball(5, `Cherry Blossom Low ${k}`, [x - 0.9, 2.9, z], [2.3, 1.5, 2.3], PINK[2], 6),
      ball(5, `Cherry Blossom Main ${k}`, [x, 3.5, z], [3.2, 1.9, 3.2], PINK[0], 6),
      ball(5, `Cherry Blossom Top ${k}`, [x + 0.5, 4.4, z], [2.0, 1.3, 2.0], PINK[1], 6),
    ];
  }),
);

applyStyle(parts, [
  [/^(Ground|Schoolyard|Petals)/, { paint: 0.4 }],
  [/^(Floor \d Wall|Clock Tower$|Gym$)/, { paint: 0.3 }],
  [/^(Tower Roof|Gym Roof)/, { paint: 0.45 }],
  [/^(Cherry Blossom)/, { smooth: true, paint: 0.5 }],
  [/^Cherry Trunk/, { smooth: true, paint: 0.4 }],
  [/Stone|^Foundation$|Step/, { paint: 0.35 }],
]);

export const JAPANSCHOOL: AssetDef = {
  id: 'japanschool',
  name: 'Japanese School',
  tagline: 'A three-storey school with a clock tower, a gymnasium, a sandy schoolyard, a gate and cherry trees',
  level: 'Detailed',
  thumb: { dir: [0.7, 0.5, 1], zoom: 0.55 },
  learn: ['Stack floors, ledges and piers into a big building from a few boxes', 'Repeat a window bay across a facade by duplicating it', 'Build a clock face from a flat cylinder and two hands', 'Lay out a schoolyard: track lines, goal, flagpole, fence and trees'],
  steps: [
    { title: 'Ground, schoolyard and foundation', text: 'A large green Box is the ground and a flatter sand-coloured Box is the schoolyard, with thin white boxes as the running track lines. A grey Box is the stone foundation, with thin stone boxes along the front.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Color palette'] },
    { title: 'Floors, ledges and roof', text: 'Each floor is one wide Box, in two slightly different creams. Thin grey ledges mark the floor lines, tall piers stand on the corners, and a dark roof slab with a low parapet closes the top.', tools: ['Shape: Box', 'Thin boxes', 'Duplicate Ctrl+D'] },
    { title: 'Windows', text: 'One window bay is a grey frame, a blue glass box in front of it and a thin bar down the middle. Build one, then duplicate it along the front, and repeat on each floor. At the back the windows are long ribbons, and the two ends have wide side windows.', tools: ['Thin boxes', 'Duplicate Ctrl+D', 'Move (G)'] },
    { title: 'Entrance, clock tower and rooftop', text: 'A concrete canopy on two pillars covers the glass doors, with a navy sign and steps below. The clock tower is a tall box with a flat cylinder turned on its side for the clock face, two hands and a green roof made like the house roof: a Box with Merge points. On the roof sit a water tank, a stair hut and an antenna.', tools: ['Shape: Cylinder, 10 sides', 'Rotate (E): 90°', 'Edit shape (Tab)', 'Merge points'] },
    { title: 'Gym, flagpole, bicycles and gate', text: 'The gymnasium is a big box with a grey gable roof and a ribbon window, joined to the school by a covered walkway. A flagpole carries a white flag with a red disc, six coloured bicycles stand under a shelter, and the gate has two stone pillars, an open leaf and an iron fence made from thin bars and rails.', tools: ['Shape: Box', 'Shape: Cylinder', 'Duplicate Ctrl+D'] },
    { title: 'Goal and cherry trees', text: 'A goal is four thin white boxes and a net. Each cherry tree is a trunk with three pink flattened spheres in slightly different pinks, and a pale pink thin box of petals on the ground below it. Group everything as Japanese School.', tools: ['Shape: Sphere, 6 sides', 'Color palette', 'Group Ctrl+G'] },
  ],
  challenge: 'Make it a snowy school day: turn the ground, schoolyard and petals white, put a thin white box on the gym roof, and turn the cherry blossoms a pale grey-pink.',
  parts: PARTS,
};
