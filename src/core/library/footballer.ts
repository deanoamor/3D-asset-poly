import type { AssetDef, AssetPart } from '../assets';
import { bootParts } from './body';
import { blob, faceOn, headBlob, onSurface, plate, ribbon, sweep, toPart, vadd, vcross, vmul, vnorm, vsub, type Ring } from './organic';
import type { Vec3 } from '../types';

const RED = '#d64545';
const RED_D = '#b53434';
const WHITE = '#fafafa';
const SKIN = '#c98e64';
const SKIN_D = '#a8693f';
const HAIR = '#2a2420';
const BLACK = '#1e2125';
const GRAY = '#3b3f46';
const GOLD = '#f2c14e';

const PH = Math.PI / 8; // turn the facets so the front of the body is flat
const parts: AssetPart[] = [];
const add = (...p: AssetPart[]) => parts.push(...p);
const R = (p: Vec3, r: number | [number, number]): Ring => ({ p, r });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lean = (y: number) => Math.max(0, y - 0.9) * 0.12; // the body leans forward as it goes up
const L = (y: number, x = 0, z = 0): Vec3 => [x, y, z + lean(y)];

// joints
const HIP_L: Vec3 = [0.105, 0.88, 0.0];
const KNEE_L: Vec3 = [0.115, 0.52, 0.07];
const ANKLE_L: Vec3 = [0.115, 0.235, -0.02];
const HIP_R: Vec3 = [-0.105, 0.88, 0.0];
const KNEE_R: Vec3 = [-0.15, 0.6, 0.36];
const ANKLE_R: Vec3 = [-0.17, 0.33, 0.72];
const SH_L: Vec3 = L(1.37, 0.31);
const EL_L: Vec3 = [0.47, 1.2, 0.2];
const WR_L: Vec3 = [0.43, 1.34, 0.42];
const SH_R: Vec3 = L(1.37, -0.31);
const EL_R: Vec3 = [-0.43, 1.2, -0.1];
const WR_R: Vec3 = [-0.37, 0.99, -0.27];
const BALL: Vec3 = [-0.17, 0.14, 0.97];

// body shells
const torso = sweep([R(L(0.88), [0.2, 0.135]), R(L(0.98), [0.212, 0.14]), R(L(1.14), [0.24, 0.15]), R(L(1.3), [0.275, 0.155]), R(L(1.42), [0.265, 0.14])], { sides: 8, phase: PH });
const pelvis = blob(L(0.88, 0, 0.01), [0.228, 0.12, 0.152], 8);
const K = 1.22;
const HC: Vec3 = [0, 1.72, 0.105];
const H = (v: Vec3): Vec3 => [HC[0] + v[0] * K, HC[1] + v[1] * K, HC[2] + v[2] * K];
const head = headBlob(HC, [0.18 * K, 0.2 * K, 0.19 * K], 8);

// ---- 0 boots ----
add(...bootParts(0, 1, ANKLE_L, 0, { boot: BLACK, sole: WHITE, cuff: GRAY, laces: WHITE, studs: GRAY }, { shaft: false }));
add(...bootParts(0, -1, ANKLE_R, 30, { boot: BLACK, sole: WHITE, cuff: GRAY, laces: WHITE, studs: GRAY }, { shaft: false }));

// ---- 1 socks, legs and shorts ----
const legL = [R(HIP_L, 0.12), R(lerp(HIP_L, KNEE_L, 0.5), 0.108), R(KNEE_L, 0.09), R(lerp(KNEE_L, ANKLE_L, 0.5), 0.08), R(ANKLE_L, 0.071), R(vadd(ANKLE_L, [0, -0.1, -0.005]), 0.071)];
const dirR = vnorm(vsub(ANKLE_R, KNEE_R));
const legR = [R(HIP_R, 0.12), R(lerp(HIP_R, KNEE_R, 0.5), 0.108), R(KNEE_R, 0.09), R(lerp(KNEE_R, ANKLE_R, 0.5), 0.08), R(ANKLE_R, 0.071), R(vadd(ANKLE_R, vmul(dirR, 0.1)), 0.071)];
for (const [side, leg, hip, knee, ankle] of [['Left', legL, HIP_L, KNEE_L, ANKLE_L], ['Right', legR, HIP_R, KNEE_R, ANKLE_R]] as const) {
  add(toPart(1, `Leg ${side}`, sweep(leg.map((q) => q), { sides: 8 }), SKIN));
  const sockTop = lerp(knee, ankle, 0.16);
  const sockPath = [R(sockTop, 0.094), R(lerp(knee, ankle, 0.5), 0.087), R(ankle, 0.079), R(vadd(ankle, vmul(vnorm(vsub(ankle, knee)), 0.1)), 0.079)];
  add(toPart(1, `Sock ${side}`, sweep(sockPath, { sides: 8 }), RED));
  for (const [i, t] of [0.2, 0.34].entries()) {
    const c = lerp(knee, ankle, t);
    const d = vmul(vnorm(vsub(ankle, knee)), 0.018 + i * 0.004);
    add(toPart(1, `Sock Band ${side} ${i + 1}`, sweep([R(vsub(c, d), 0.098 - i * 0.004), R(vadd(c, d), 0.098 - i * 0.004)], { sides: 8 }), WHITE));
  }
  const hemAt = lerp(hip, knee, 0.58);
  add(toPart(1, `Shorts Leg ${side}`, sweep([R(vadd(hip, [0, 0.02, 0]), 0.14), R(lerp(hip, knee, 0.3), 0.134), R(hemAt, 0.128)], { sides: 8 }), WHITE));
  const dh = vmul(vnorm(vsub(knee, hip)), 0.012);
  add(toPart(1, `Shorts Hem ${side}`, sweep([R(vsub(hemAt, dh), 0.131), R(vadd(hemAt, dh), 0.131)], { sides: 8 }), RED));
  add(toPart(1, `Knee ${side}`, blob(knee, [0.085, 0.085, 0.085], 6), SKIN));
}
add(toPart(1, 'Shorts', pelvis, WHITE));
add(toPart(1, 'Waistband', sweep([R(L(0.97), [0.226, 0.158]), R(L(1.02), [0.226, 0.158])], { sides: 8, phase: PH }), RED_D));

// ---- 2 jersey ----
add(toPart(2, 'Jersey', torso, RED));
add(toPart(2, 'Jersey Hem', sweep([R(L(1.0), [0.222, 0.152]), R(L(1.03), [0.222, 0.152])], { sides: 8, phase: PH }), RED_D));
add(toPart(2, 'Chest Band', sweep([R(L(1.255), [0.286, 0.163]), R(L(1.3), [0.288, 0.164])], { sides: 8, phase: PH }), WHITE));
add(toPart(2, 'Collar', ribbon(torso, [-0.1, -0.05, 0, 0.05, 0.1].map((x, i) => ({ from: L(1.405 - (2 - Math.abs(i - 2)) * 0.035, x, 0), dir: [x * 2, 0.0, 1] as Vec3 })), [0.017, 0.009], 0.006, { sides: 4 }), WHITE));
add(plate(2, 'Crest', torso, L(1.36, 0.15), [0, 0, 1], 0.07, 0.08, 0.016, GOLD));
add(plate(2, 'Number 1', torso, L(1.15, -0.05), [0, 0, 1], 0.03, 0.15, 0.014, WHITE));
add(plate(2, 'Number 0 Top', torso, L(1.225, 0.045), [0, 0, 1], 0.08, 0.028, 0.014, WHITE));
add(plate(2, 'Number 0 Bottom', torso, L(1.075, 0.045), [0, 0, 1], 0.08, 0.028, 0.014, WHITE));
add(plate(2, 'Number 0 Left', torso, L(1.15, 0.01), [0, 0, 1], 0.028, 0.15, 0.014, WHITE));
add(plate(2, 'Number 0 Right', torso, L(1.15, 0.08), [0, 0, 1], 0.028, 0.15, 0.014, WHITE));

// ---- 3 arms ----
function arm(side: 'Left' | 'Right', S: Vec3, E: Vec3, W: Vec3, captain: boolean): void {
  const M = lerp(S, E, 0.5);
  add(toPart(3, `Shoulder ${side}`, blob(S, [0.105, 0.1, 0.105], 6), RED));
  add(toPart(3, `Arm ${side}`, sweep([R(S, 0.078), R(M, 0.073), R(E, 0.066), R(lerp(E, W, 0.5), 0.059), R(W, 0.052)], { sides: 7 }), SKIN));
  add(toPart(3, `Elbow ${side}`, blob(E, [0.07, 0.07, 0.07], 6), SKIN));
  const hem = lerp(S, E, 0.62);
  add(toPart(3, `Sleeve ${side}`, sweep([R(S, 0.094), R(M, 0.09), R(hem, 0.085)], { sides: 7 }), RED));
  const dd = vmul(vnorm(vsub(E, S)), 0.02);
  add(toPart(3, `Sleeve Hem ${side}`, sweep([R(vsub(hem, dd), 0.088), R(vadd(hem, dd), 0.088)], { sides: 7 }), WHITE));
  if (captain) {
    const c = lerp(S, E, 0.8);
    const d = vmul(vnorm(vsub(E, S)), 0.022);
    add(toPart(3, 'Captain Armband', sweep([R(vsub(c, d), 0.077), R(vadd(c, d), 0.077)], { sides: 7 }), GOLD));
  }
  const d = vnorm(vsub(W, E));
  const perp = vnorm(vcross(d, [0, 1, 0]));
  add(toPart(3, `Hand ${side}`, sweep([R(vsub(W, vmul(d, 0.01)), [0.052, 0.036]), R(vadd(W, vmul(d, 0.05)), [0.06, 0.04]), R(vadd(W, vmul(d, 0.105)), [0.05, 0.03])], { sides: 6, end: 'dome' }), SKIN));
  add(toPart(3, `Thumb ${side}`, sweep([R(vadd(vadd(W, vmul(d, 0.025)), vmul(perp, 0.03)), 0.02), R(vadd(vadd(W, vmul(d, 0.062)), vmul(perp, 0.045)), 0.016), R(vadd(vadd(W, vmul(d, 0.09)), vmul(perp, 0.042)), 0.012)], { sides: 5, end: 'dome' }), SKIN));
}
arm('Left', SH_L, EL_L, WR_L, true);
arm('Right', SH_R, EL_R, WR_R, false);

// ---- 4 head and face ----
add(toPart(4, 'Neck', sweep([R(L(1.38), [0.07, 0.064]), R(L(1.52), [0.066, 0.06])], { sides: 6 }), SKIN));
add(toPart(4, 'Head', head, SKIN));
add(...faceOn(4, head, HC, { skin: SKIN, skinDark: SKIN_D, brow: HAIR, eye: 1.55, browTilt: 0.03, smile: 0.07, lip: '#7a3a30' }));

// ---- 5 hair and headband ----
add(toPart(5, 'Hair Top', blob(H([0, 0.09, -0.03]), vmul([0.19, 0.13, 0.2], K), 7), HAIR));
add(toPart(5, 'Hair Back', blob(H([0, -0.04, -0.1]), vmul([0.17, 0.16, 0.1], K), 7), HAIR));
for (const s of [1, -1] as const) {
  const side = s === 1 ? 'Left' : 'Right';
  add(toPart(5, `Sideburn ${side}`, ribbon(head, [{ from: HC, dir: [s, 0.14, 0.3] }, { from: HC, dir: [s, -0.06, 0.34] }], [0.028, 0.015], 0.012, { sides: 5 }), HAIR));
}
const spikes: [number, number, number][] = [[-0.5, 1, 0.5], [0, 1, 0.7], [0.5, 1, 0.5], [-0.8, 1, -0.2], [0.8, 1, -0.2], [0, 1, -0.7], [-0.3, 1, 0], [0.3, 1, 0.1]];
spikes.forEach((d, i) => {
  const dir = vnorm(d);
  const base = onSurface(head, HC, dir, -0.035);
  const tip = vadd(base.p, vmul(vnorm(vadd(dir, [0, 0.9, 0])), 0.14 + (i % 3) * 0.03));
  add(toPart(5, `Hair Spike ${i + 1}`, sweep([R(base.p, 0.05), R(lerp(base.p, tip, 0.55), 0.034), R(tip, 0.004)], { sides: 4, end: 'dome' }), HAIR));
});
add(toPart(5, 'Headband', sweep([R(H([0, 0.1, -0.005]), [0.19 * K * 0.86 + 0.012, 0.2 * K * 0.86 + 0.012]), R(H([0, 0.155, -0.005]), [0.19 * K * 0.8 + 0.012, 0.2 * K * 0.8 + 0.012])], { sides: 10 }), RED));

// ---- 6 the ball ----
const ball = blob(BALL, [0.14, 0.14, 0.14], 10);
add(toPart(6, 'Ball', ball, WHITE));
[[0, 1, 0], [0.9, 0.45, 0], [-0.9, 0.45, 0], [0, 0.45, 0.9], [0, 0.45, -0.9], [0.65, -0.5, 0.6], [-0.65, -0.5, -0.6]].forEach((d, i) => {
  add(plate(6, `Ball Patch ${i + 1}`, ball, BALL, d as Vec3, 0.085, 0.085, 0.02, BLACK));
});

export const FOOTBALLER: AssetDef = {
  id: 'footballer',
  name: 'Football Player',
  tagline: 'A player mid-kick: posed one-piece limbs, a kit with details, a ball',
  level: 'Detailed',
  thumb: { dir: [0.9, 0.3, 1], zoom: 0.8 },
  learn: ['Pose a character with bent, one-piece limbs', 'Tilt a boot to match a kick', 'Build a kit from shells, bands and plates', 'Make spiky hair from tapered tubes'],
  steps: [
    { title: 'Boots', text: 'A football boot is one low shape with a white sole and small studs under it. The kicking boot is tilted so the toe points down at the ball. Build the boot first, then tilt it with Rotate (E).', tools: ['Shape: Cylinder or Sphere', 'Edit shape: Pull out (P)', 'Rotate (E)'] },
    { title: 'Socks, legs and shorts', text: 'A pose is about where the joints are. Each leg is one tube from the hip, through the knee, to the ankle, and it runs into the boot. The standing leg is almost straight and the kicking leg bends forward. The red sock and the white shorts are slightly thicker tubes over the same leg.', tools: ['Cylinder: Top size', 'Edit shape: Pull out, Move (W)', 'Duplicate Ctrl+D'] },
    { title: 'Jersey', text: 'The jersey is one shape that is wider at the shoulders than at the waist, leaning forward a little. A white chest band and hem are thin rings around it, the V collar is a curved strip, and the crest and the number 10 are thin plates lying on the front.', tools: ['Edit shape: scale a face (R)', 'Thin boxes for numbers', 'Rotate (E)'] },
    { title: 'Arms', text: 'Arms swing against the legs: the left arm up in front for balance and the right arm back. Each arm is one tube bent at the elbow, with a thicker red sleeve over its upper half and a white hem. A gold band marks the captain. Hands are rounded with a thumb on the side.', tools: ['Edit shape: Pull out + Move', 'Cylinder: Top size', 'Shape: Sphere'] },
    { title: 'Head and face', text: 'The head is a Sphere with 8 sides and a narrower jaw. Eyes, eyebrows, the nose and the smile are placed on the surface of the head so they never float. Big eyes give it a friendly, cartoon feel.', tools: ['Edit shape: narrow the jaw', 'Mirror for symmetry', 'Shape: Pyramid + Rotate'] },
    { title: 'Hair and headband', text: 'Hair is two flattened spheres plus eight spikes. Each spike is a short tube that starts inside the head and tapers to a point, tilted a different way so they do not look copied. A red headband is a thin ring around the forehead.', tools: ['Cylinder: Top size near 0', 'Rotate (E)', 'Duplicate Ctrl+D'] },
    { title: 'The ball', text: 'A white Sphere with 10 sides and seven black patches pressed onto its surface. Each patch is turned to face outward, then moved until it sits flat on the ball. The kicking toe touches the ball, and nothing floats. Name every part and group them as Football Player.', tools: ['Shape: Sphere, 10 sides', 'Rotate (E)', 'Group Ctrl+G'] },
  ],
  challenge: 'Make the goalkeeper: change the kit colors, add gloves by making the hands bigger, and move both arms out to the sides.',
  parts,
};
