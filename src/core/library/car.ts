import type { AssetDef, AssetPart } from '../assets';
import { LR, ball, box, frustum, part, tube, limb } from './kit';

const BODY = '#d9503a';
const BODY_D = '#b83e2c';
const ROOF = '#f1ece4';
const TRIM = '#2a2d33';
const DARK = '#1d2026';
const CHROME = '#c9ced6';
const GLASS = '#79c4e6';
const GLASS_D = '#5aa6cc';
const LAMP = '#fff1a8';
const ORANGE = '#f0a030';
const TAIL = '#e03030';
const RUBBER = '#22252b';
const RIM = '#d5d9df';
const HUB = '#6b727a';

// cabin geometry (shared by the windows so they line up with its slopes)
const CZ = -0.2; // cabin centre z
const CY = 1.1;
const CABIN_TZ = 0.62;
const CABIN_TX = 0.82;

const FL: [number, number][] = [[0.84, 1.3], [0.84, -1.3]];

const parts: AssetPart[] = [
  // 0 chassis and body
  box(0, 'Underbody', [0, 0.3, 0], [1.7, 0.2, 4.0], DARK),
  part(0, 'Body', 'box', [0, 0.6, 0], [1.86, 0.5, 4.2], BODY, { mesh: () => frustum(1, 1, 0.94, 0.985) }),
  ...LR('Side Skirt', (s, n) => box(0, n, [s * 0.935, 0.4, 0], [0.05, 0.1, 2.3], TRIM)),
  ...LR('Side Trim', (s, n) => box(0, n, [s * 0.93, 0.64, 0], [0.014, 0.035, 3.5], CHROME)),
  // 1 hood and trunk
  part(1, 'Hood', 'box', [0, 0.9, 1.3], [1.7, 0.15, 1.35], BODY, { mesh: () => frustum(1, 1, 0.94, 0.78, -0.05), rot: [4, 0, 0] }),
  box(1, 'Hood Line', [0, 0.985, 1.15], [0.012, 0.012, 1.1], BODY_D, { rot: [4, 0, 0] }),
  part(1, 'Trunk Lid', 'box', [0, 0.9, -1.55], [1.7, 0.15, 0.95], BODY, { mesh: () => frustum(1, 1, 0.94, 0.8, 0.04), rot: [-3, 0, 0] }),
  box(1, 'Fuel Cap', [0.9, 0.78, -1.3], [0.02, 0.14, 0.14], CHROME),
  // 2 cabin and roof
  part(2, 'Cabin', 'box', [0, CY, CZ], [1.6, 0.55, 2.0], BODY, { mesh: () => frustum(1, 1, CABIN_TX, CABIN_TZ) }),
  box(2, 'Roof', [0, 1.395, CZ], [1.26, 0.05, 1.28], ROOF),
  ...LR('Roof Rail', (s, n) => box(2, n, [s * 0.5, 1.45, CZ], [0.045, 0.045, 1.2], TRIM)),
  ...[0.45, -0.45].map((z, i) => box(2, `Roof Bar ${i + 1}`, [0, 1.47, CZ + z], [1.08, 0.04, 0.05], TRIM)),
  // 3 windows and pillars
  part(3, 'Windshield', 'box', [0, 1.116, 0.622], [1.34, 0.6, 0.03], GLASS, { rot: [-34.6, 0, 0] }),
  part(3, 'Rear Window', 'box', [0, 1.116, -1.022], [1.34, 0.6, 0.03], GLASS, { rot: [34.6, 0, 0] }),
  ...LR('Front Window', (s, n) => box(3, n, [s * 0.74, 1.1, 0.25], [0.03, 0.4, 0.78], GLASS, { rot: [0, 0, s * 14.7] })),
  ...LR('Rear Side Window', (s, n) => box(3, n, [s * 0.74, 1.1, -0.66], [0.03, 0.4, 0.62], GLASS_D, { rot: [0, 0, s * 14.7] })),
  ...LR('B Pillar', (s, n) => box(3, n, [s * 0.742, 1.1, -0.2], [0.045, 0.46, 0.06], TRIM, { rot: [0, 0, s * 14.7] })),
  ...LR('Door Line', (s, n) => box(3, n, [s * 0.935, 0.66, 0.5], [0.014, 0.4, 0.02], BODY_D)),
  ...LR('Door Line Rear', (s, n) => box(3, n, [s * 0.935, 0.66, -0.85], [0.014, 0.4, 0.02], BODY_D)),
  // 4 wheels
  ...FL.flatMap(([x, z], i) => {
    const nm = i === 0 ? 'Front' : 'Rear';
    return [1, -1].flatMap((s) => {
      const side = s === 1 ? 'Left' : 'Right';
      const X = s * x;
      return [
        tube(4, `${nm} Wheel Well ${side}`, [s * 0.9, 0.4, z], [0.8, 0.24, 0.8], DARK, 12, { rot: [0, 0, 90] }),
        tube(4, `${nm} Tire ${side}`, [X, 0.36, z], [0.72, 0.26, 0.72], RUBBER, 14, { rot: [0, 0, 90] }),
        tube(4, `${nm} Rim ${side}`, [s * 0.9, 0.36, z], [0.46, 0.27, 0.46], RIM, 10, { rot: [0, 0, 90] }),
        tube(4, `${nm} Rim Dark ${side}`, [s * 0.905, 0.36, z], [0.33, 0.272, 0.33], HUB, 10, { rot: [0, 0, 90] }),
        tube(4, `${nm} Hubcap ${side}`, [s * 0.915, 0.36, z], [0.15, 0.275, 0.15], CHROME, 6, { rot: [0, 0, 90] }),
      ];
    });
  }),
  // 5 front
  box(5, 'Front Bumper', [0, 0.32, 2.08], [1.92, 0.22, 0.2], TRIM, { mesh: () => frustum(1, 1, 1, 0.8) }),
  box(5, 'Grille', [0, 0.58, 2.115], [0.95, 0.22, 0.04], DARK),
  ...[0.51, 0.58, 0.65].map((y, i) => box(5, `Grille Slat ${i + 1}`, [0, y, 2.14], [0.85, 0.022, 0.03], CHROME)),
  ...LR('Headlight Housing', (s, n) => box(5, n, [s * 0.66, 0.68, 2.095], [0.38, 0.22, 0.06], CHROME)),
  ...LR('Headlight', (s, n) => ball(5, n, [s * 0.66, 0.68, 2.12], [0.28, 0.16, 0.08], LAMP, 8)),
  ...LR('Indicator', (s, n) => box(5, n, [s * 0.9, 0.5, 2.09], [0.1, 0.07, 0.04], ORANGE)),
  ...LR('Fog Light', (s, n) => ball(5, n, [s * 0.55, 0.3, 2.19], [0.09, 0.09, 0.05], LAMP, 6)),
  box(5, 'Front Plate', [0, 0.35, 2.185], [0.42, 0.13, 0.02], '#fafafa'),
  box(5, 'Front Plate Strip', [0, 0.35, 2.196], [0.36, 0.05, 0.01], '#3a5a9a'),
  // 6 rear
  box(6, 'Rear Bumper', [0, 0.32, -2.08], [1.92, 0.22, 0.2], TRIM, { mesh: () => frustum(1, 1, 1, 0.8) }),
  ...LR('Taillight', (s, n) => box(6, n, [s * 0.68, 0.72, -2.1], [0.4, 0.17, 0.05], TAIL)),
  ...LR('Reverse Light', (s, n) => box(6, n, [s * 0.46, 0.72, -2.105], [0.08, 0.1, 0.04], '#fafafa')),
  box(6, 'Rear Plate', [0, 0.52, -2.12], [0.42, 0.13, 0.02], '#fafafa'),
  tube(6, 'Exhaust', [-0.55, 0.28, -2.17], [0.09, 0.14, 0.09], CHROME, 8, { rot: [90, 0, 0] }),
  box(6, 'Trunk Handle', [0, 0.82, -2.03], [0.22, 0.03, 0.03], CHROME),
  // 7 details
  ...LR('Mirror', (s, n) => box(7, n, [s * 1.0, 1.02, 0.5], [0.12, 0.1, 0.07], BODY)),
  ...LR('Mirror Arm', (s, n) => box(7, n, [s * 0.9, 0.99, 0.52], [0.12, 0.03, 0.04], TRIM)),
  ...LR('Door Handle', (s, n) => box(7, n, [s * 0.94, 0.74, 0.05], [0.02, 0.03, 0.16], CHROME)),
  ...LR('Rear Door Handle', (s, n) => box(7, n, [s * 0.94, 0.74, -0.6], [0.02, 0.03, 0.16], CHROME)),
  ...LR('Wiper', (s, n) => box(7, n, [s * 0.3, 0.97, 0.71], [0.5, 0.014, 0.025], DARK, { rot: [0, 0, s * 8] })),
  limb(7, 'Antenna', [-0.6, 1.4, -0.85], [-0.62, 1.78, -0.9], 0.03, 0.012, DARK, 5),
  ball(7, 'Antenna Tip', [-0.62, 1.79, -0.9], [0.05, 0.05, 0.05], ORANGE, 5),
];

export const CAR: AssetDef = {
  id: 'car',
  name: 'Car',
  tagline: 'A detailed hatchback: sloped glass, wheel wells, lights and trim',
  level: 'Detailed',
  thumb: { dir: [0.9, 0.4, 1.1], zoom: 0.8 },
  learn: ['Reshape boxes into a sloped hood and cabin', 'Build a wheel from tire, rim and hub', 'Line up glass with the slopes of the cabin', 'Layer small parts so it reads as a real car'],
  steps: [
    { title: 'Chassis and body', text: 'Start with the dark underbody, then the main body. The body is a Box reshaped in Edit shape so its top is a little narrower than the bottom. Side skirts and a thin chrome strip along the side give the lower body its detail.', tools: ['Edit shape: scale the top face (R)', 'Thin boxes for trim', 'Color palette'] },
    { title: 'Hood and trunk', text: 'The hood and the trunk lid are separate thin Boxes on top of the body, each reshaped so the far end is narrower. Tilt them a few degrees with Rotate (E) so they slope. A thin darker line marks the center of the hood.', tools: ['Edit shape: narrow one end', 'Rotate (E)', 'Properties: Rotation'] },
    { title: 'Cabin and roof', text: 'The cabin is a Box where the top is smaller than the bottom, in both width and length. That gives the sloped windshield and sloping sides. A pale roof panel sits on top, with two rails and two crossbars for a roof rack.', tools: ['Edit shape: select the top face, Size (R)', 'Thin boxes', 'Duplicate Ctrl+D'] },
    { title: 'Windows and pillars', text: 'Glass is thin blue Boxes tilted to match the cabin slopes: about 35 degrees for the front and back and about 15 degrees on the sides. Dark pillars separate the side windows, and thin lines mark the doors.', tools: ['Rotate (E)', 'Thin boxes', 'Mirror ideas: duplicate and flip'] },
    { title: 'Wheels', text: 'Each wheel is five parts stacked on one axis. A dark Cylinder is the wheel well and shows as a ring around the tire. Then come the tire (14 sides), a light rim (10 sides), a gray inner disc and a small chrome hubcap. Rotate Z 90 degrees turns each cylinder on its side. Make one wheel, group it, and duplicate it three times.', tools: ['Shape: Cylinder', 'Rotation Z 90°', 'Group Ctrl+G, Duplicate Ctrl+D', 'Sides slider'] },
    { title: 'Front', text: 'Front details: a bumper reshaped to be narrower at the front, a dark grille with three chrome slats, chrome headlight housings with a flattened sphere as the lens, orange indicators, small fog lights and a license plate.', tools: ['Shape: Sphere + Size (R)', 'Thin boxes', 'Color palette'] },
    { title: 'Rear', text: 'The back mirrors the front: a bumper, red taillights, small white reverse lights, a license plate, an exhaust pipe (a Cylinder turned to point backward) and a trunk handle.', tools: ['Rotation X 90°', 'Duplicate Ctrl+D', 'Thin boxes'] },
    { title: 'Final details', text: 'Mirrors, door handles, wipers and an antenna finish the car. They are tiny, but they are what makes a model look finished instead of just built. Name every part in Layers and group them as Car.', tools: ['Rename in Layers', 'Group Ctrl+G', 'Cylinder: Top size for the antenna'] },
  ],
  challenge: 'Turn it into a taxi: change the body to yellow, add a small box sign on the roof, and add a checker stripe with thin boxes along the side.',
  parts,
};
