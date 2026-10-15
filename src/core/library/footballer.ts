import type { AssetDef, AssetPart } from '../assets';
import { D2R, LR, add3, aim, ball, band, box, face, frustum, headMesh, lerp3, limb, part, tube, wedge } from './kit';
import type { Vec3 } from '../types';

const RED = '#d64545';
const RED_D = '#b53434';
const WHITE = '#fafafa';
const SKIN = '#c98e64';
const SKIN_D = '#b57a52';
const HAIR = '#2a2420';
const BLACK = '#1e2125';
const GRAY = '#3b3f46';
const GOLD = '#f2c14e';
const NAVY = '#22304f';

const lean = (y: number) => Math.max(0, y - 0.9) * 0.12; // the body leans forward as it goes up
const L = (y: number, x = 0, z = 0): Vec3 => [x, y, z + lean(y)];

/** Offset (dy, dz) turned by `deg` about X, so boot parts follow a tilted foot. */
const turn = (dy: number, dz: number, deg: number): [number, number] => {
  const a = deg * D2R;
  return [dy * Math.cos(a) - dz * Math.sin(a), dy * Math.sin(a) + dz * Math.cos(a)];
};

function boot(s: 1 | -1, ankle: Vec3, tilt: number): AssetPart[] {
  const name = s === 1 ? 'Left' : 'Right';
  const at = (dy: number, dz: number, dx = 0): Vec3 => {
    const [y, z] = turn(dy, dz, tilt);
    return [ankle[0] + dx, ankle[1] + y, ankle[2] + z];
  };
  return [
    box(0, `Boot ${name}`, at(-0.09, 0.07), [0.17, 0.15, 0.36], BLACK, { mesh: () => wedge(0.16), rot: [tilt, 0, 0] }),
    box(0, `Boot Sole ${name}`, at(-0.17, 0.07), [0.18, 0.035, 0.38], WHITE, { rot: [tilt, 0, 0] }),
    box(0, `Boot Stripe ${name}`, at(-0.09, 0.05, s * 0.088), [0.012, 0.06, 0.2], WHITE, { rot: [tilt, 0, 0] }),
    box(0, `Boot Tongue ${name}`, at(-0.03, 0.1), [0.1, 0.09, 0.03], GRAY, { rot: [tilt - 22, 0, 0] }),
    ...[-0.1, 0.0, 0.1].map((dz, i) => box(0, `Stud ${name} ${i + 1}`, at(-0.2, 0.07 + dz * 1.4), [0.05, 0.03, 0.05], GRAY, { rot: [tilt, 0, 0] })),
  ];
}

// joints
const HIP_L: Vec3 = [0.1, 0.86, 0.0];
const KNEE_L: Vec3 = [0.115, 0.52, 0.07];
const ANKLE_L: Vec3 = [0.115, 0.215, -0.03];
const HIP_R: Vec3 = [-0.1, 0.86, 0.0];
const KNEE_R: Vec3 = [-0.15, 0.6, 0.36];
const ANKLE_R: Vec3 = [-0.17, 0.33, 0.72];
const SH_L: Vec3 = L(1.37, 0.31);
const EL_L: Vec3 = [0.47, 1.2, 0.2];
const WR_L: Vec3 = [0.43, 1.34, 0.42];
const SH_R: Vec3 = L(1.37, -0.31);
const EL_R: Vec3 = [-0.43, 1.2, -0.1];
const WR_R: Vec3 = [-0.37, 0.99, -0.27];
const HEAD: Vec3 = L(1.68);
const BALL: Vec3 = [-0.17, 0.14, 1.02];

const sockStripe = (knee: Vec3, ankle: Vec3, name: string): AssetPart[] => [
  band(1, `Sock Band ${name}`, knee, ankle, 0.12, 0.05, 0.19, WHITE, 7),
  band(1, `Sock Band 2 ${name}`, knee, ankle, 0.27, 0.035, 0.18, WHITE, 7),
];

const parts: AssetPart[] = [
  // 0 boots
  ...boot(1, add3(ANKLE_L, [0, 0.0, 0]), 0),
  ...boot(-1, ANKLE_R, 30),
  // 1 socks, legs and shorts
  limb(1, 'Sock Left', KNEE_L, ANKLE_L, 0.18, 0.15, RED, 7),
  limb(1, 'Sock Right', KNEE_R, ANKLE_R, 0.18, 0.15, RED, 7),
  ...sockStripe(KNEE_L, ANKLE_L, 'Left'),
  ...sockStripe(KNEE_R, ANKLE_R, 'Right'),
  ball(1, 'Knee Left', KNEE_L, [0.18, 0.17, 0.18], SKIN, 5),
  ball(1, 'Knee Right', KNEE_R, [0.18, 0.17, 0.18], SKIN, 5),
  limb(1, 'Thigh Left', HIP_L, KNEE_L, 0.22, 0.17, SKIN, 7),
  limb(1, 'Thigh Right', HIP_R, KNEE_R, 0.22, 0.17, SKIN, 7),
  limb(1, 'Shorts Leg Left', HIP_L, lerp3(HIP_L, KNEE_L, 0.6), 0.27, 0.25, WHITE, 7),
  limb(1, 'Shorts Leg Right', HIP_R, lerp3(HIP_R, KNEE_R, 0.6), 0.27, 0.25, WHITE, 7),
  part(1, 'Shorts', 'box', [0, 0.9, 0.012], [0.47, 0.25, 0.3], WHITE, { mesh: () => frustum(0.96, 0.96, 1.02, 1) }),
  box(1, 'Waistband', [0, 1.0, 0.022], [0.485, 0.055, 0.31], RED_D),
  ...LR('Shorts Stripe', (s, n) => box(1, n, [s * 0.238, 0.88, 0.01], [0.014, 0.22, 0.12], RED)),
  // 2 jersey
  part(2, 'Jersey', 'box', L(1.22), [0.55, 0.5, 0.31], RED, { mesh: () => frustum(0.86, 0.9, 1, 1), rot: [6, 0, 0] }),
  box(2, 'Jersey Hem', L(1.0, 0, 0.0), [0.5, 0.045, 0.285], RED_D, { rot: [6, 0, 0] }),
  ...LR('Collar', (s, n) => box(2, n, L(1.455, s * 0.05, 0.14), [0.12, 0.04, 0.04], WHITE, { rot: [10, 0, s * -35] })),
  box(2, 'Collar Back', L(1.46, 0, -0.1), [0.18, 0.05, 0.05], WHITE),
  box(2, 'Chest Band', L(1.28, 0, 0.0), [0.558, 0.05, 0.318], WHITE, { rot: [6, 0, 0] }),
  box(2, 'Crest', L(1.35, 0.15, 0.162), [0.065, 0.075, 0.014], GOLD),
  // number 10 on the chest
  box(2, 'Number 1', L(1.14, -0.045, 0.158), [0.028, 0.14, 0.014], WHITE),
  box(2, 'Number 0 Top', L(1.2, 0.05, 0.158), [0.075, 0.026, 0.014], WHITE),
  box(2, 'Number 0 Bottom', L(1.08, 0.05, 0.158), [0.075, 0.026, 0.014], WHITE),
  box(2, 'Number 0 Left', L(1.14, 0.015, 0.158), [0.026, 0.14, 0.014], WHITE),
  box(2, 'Number 0 Right', L(1.14, 0.085, 0.158), [0.026, 0.14, 0.014], WHITE),
  // 3 arms
  limb(3, 'Sleeve Left', SH_L, lerp3(SH_L, EL_L, 0.62), 0.2, 0.17, RED, 7),
  limb(3, 'Sleeve Right', SH_R, lerp3(SH_R, EL_R, 0.62), 0.2, 0.17, RED, 7),
  band(3, 'Sleeve Cuff Left', SH_L, EL_L, 0.62, 0.035, 0.175, WHITE, 7),
  band(3, 'Sleeve Cuff Right', SH_R, EL_R, 0.62, 0.035, 0.175, WHITE, 7),
  limb(3, 'Upper Arm Left', lerp3(SH_L, EL_L, 0.62), EL_L, 0.15, 0.13, SKIN, 7),
  limb(3, 'Upper Arm Right', lerp3(SH_R, EL_R, 0.62), EL_R, 0.15, 0.13, SKIN, 7),
  ball(3, 'Elbow Left', EL_L, [0.14, 0.14, 0.14], SKIN, 5),
  ball(3, 'Elbow Right', EL_R, [0.14, 0.14, 0.14], SKIN, 5),
  limb(3, 'Forearm Left', EL_L, WR_L, 0.135, 0.11, SKIN, 7),
  limb(3, 'Forearm Right', EL_R, WR_R, 0.135, 0.11, SKIN, 7),
  band(3, 'Captain Band', lerp3(SH_L, EL_L, 0.62), EL_L, 0.55, 0.05, 0.16, GOLD, 7),
  ball(3, 'Hand Left', add3(WR_L, [0, 0.06, 0.02]), [0.12, 0.13, 0.11], SKIN, 5),
  ball(3, 'Hand Right', add3(WR_R, [0, -0.06, -0.02]), [0.12, 0.13, 0.11], SKIN, 5),
  box(3, 'Thumb Left', add3(WR_L, [-0.05, 0.08, 0.06]), [0.04, 0.075, 0.045], SKIN, { rot: [-20, 0, 12] }),
  box(3, 'Thumb Right', add3(WR_R, [0.05, -0.02, 0.0]), [0.04, 0.075, 0.045], SKIN, { rot: [-20, 0, -12] }),
  // 4 head and face
  tube(4, 'Neck', L(1.5), [0.135, 0.11, 0.135], SKIN, 6),
  part(4, 'Head', 'sphere', HEAD, [0.36, 0.4, 0.37], SKIN, { mesh: headMesh }),
  ...LR('Ear', (s, n) => ball(4, n, add3(HEAD, [s * 0.18, -0.01, -0.005]), [0.06, 0.1, 0.065], SKIN, 5)),
  ...face(4, HEAD, 1.1, SKIN_D, HAIR, { eyeY: 0.02, mouth: '#7a3a30' }),
  box(4, 'Smile', add3(HEAD, [0, -0.118, 0.17]), [0.1, 0.018, 0.014], '#7a3a30'),
  // 5 hair and headband
  ball(5, 'Hair', add3(HEAD, [0, 0.1, -0.02]), [0.385, 0.22, 0.395], HAIR, 7),
  ball(5, 'Hair Back', add3(HEAD, [0, 0.0, -0.08]), [0.36, 0.3, 0.3], HAIR, 7),
  ...[[-0.1, 0.0], [0, 0.03], [0.1, 0.0], [-0.05, -0.05], [0.06, -0.06]].map(([x, z], i) => part(5, `Hair Spike ${i + 1}`, 'pyramid', add3(HEAD, [x, 0.215, z + 0.05]), [0.09, 0.12, 0.09], HAIR, { rot: [i * 9 - 18, i * 20, (i % 2 ? 1 : -1) * 12] })),
  tube(5, 'Headband', add3(HEAD, [0, 0.085, 0]), [0.39, 0.05, 0.385], RED, 8),
  // 6 ball
  ball(6, 'Ball', BALL, [0.28, 0.28, 0.28], WHITE, 10),
  ...[[0, 1, 0], [0.9, 0.45, 0], [-0.9, 0.45, 0], [0, 0.45, 0.9], [0, 0.45, -0.9], [0.65, -0.5, 0.6], [-0.65, -0.5, -0.6]].map((d, i) => {
    const n = Math.hypot(d[0], d[1], d[2]);
    const dir: Vec3 = [d[0] / n, d[1] / n, d[2] / n];
    const { rot } = aim([0, 0, 0], dir);
    return box(6, `Ball Patch ${i + 1}`, add3(BALL, [dir[0] * 0.128, dir[1] * 0.128, dir[2] * 0.128]), [0.08, 0.022, 0.08], BLACK, { rot });
  }),
];
void NAVY;

export const FOOTBALLER: AssetDef = {
  id: 'footballer',
  name: 'Football Player',
  tagline: 'A player mid-kick: posed limbs, a kit with details and a ball',
  level: 'Detailed',
  thumb: { dir: [0.9, 0.3, 1], zoom: 0.8 },
  learn: ['Pose a character by aiming limbs between joints', 'Tilt a boot with Rotate to match a kick', 'Build a kit from layered thin boxes', 'Make hair from a flattened sphere and spikes'],
  steps: [
    { title: 'Boots', text: 'Each boot is a Box reshaped so the toe slopes down, plus a white sole, a side stripe, a tongue and three small studs. The kicking foot is tilted with Rotate (E) so the toe points down toward the ball. Put the parts on the foot first, then tilt them together.', tools: ['Edit shape: lower the toe points', 'Rotate (E)', 'Thin boxes'] },
    { title: 'Socks, legs and shorts', text: 'A pose is about where the joints are. Each leg has a hip, a knee and an ankle, and every part is a tapered Cylinder aimed from one joint to the next. The standing leg is nearly straight; the kicking leg bends forward. White bands wrap the socks, and the shorts are a Box with two short leg tubes.', tools: ['Cylinder: Top size slider', 'Rotate (E) to aim', 'Shape: Sphere, 5 sides for knees'] },
    { title: 'Jersey', text: 'The jersey is a Box reshaped to be narrower at the waist, leaning forward a little. A white chest band, a V collar made from two tilted boxes, a gold crest, and the number 10 drawn with six thin white boxes finish the front.', tools: ['Edit shape: scale the bottom face', 'Thin boxes for numbers', 'Rotate (E)'] },
    { title: 'Arms', text: 'The arms swing in opposition to the legs: the left arm up in front for balance, the right arm back. Each arm is a red sleeve, a skin-colored upper arm, an elbow sphere and a forearm, with a small sphere hand and a box thumb. A gold armband marks the captain.', tools: ['Cylinder: Top size', 'Bend with two parts', 'Shape: Sphere'] },
    { title: 'Head and face', text: 'The head is an 8-sided Sphere with a narrower jaw made in Edit shape. The face is white eye spheres with dark pupils, eyebrows, a Pyramid nose pointing forward, and a smile made from thin boxes. Ears are small spheres on each side.', tools: ['Edit shape: move points', 'Mirror for symmetrical edits', 'Shape: Pyramid + Rotate'] },
    { title: 'Hair and headband', text: 'Hair is a flattened sphere on top of a second one behind the head, with five small Pyramids rotated in different directions for spikes. A red headband is a thin 8-sided Cylinder around the head. Different rotations are what stop the spikes from looking copied.', tools: ['Squash with Size (R)', 'Shape: Pyramid', 'Rotate (E)', 'Duplicate Ctrl+D'] },
    { title: 'The ball', text: 'The ball is a white Sphere with 10 sides. Seven thin black Boxes sit on its surface as patches, each turned to face outward. Rotate each patch so it lies flat on the sphere. Name every part in Layers and group them as Football Player.', tools: ['Shape: Sphere, 10 sides', 'Rotate (E)', 'Group Ctrl+G'] },
  ],
  challenge: 'Make the goalkeeper: change the kit colors, add two gloves with bigger spheres at the hands, and move both arms out to the sides.',
  parts,
};
