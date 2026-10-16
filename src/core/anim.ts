import * as THREE from 'three';
import type { AnimClip, AnimKey, Joint, Vec3 } from './types';

const D2R = Math.PI / 180;
const eul = new THREE.Euler();

/** The turn of a joint (degrees X, Y, Z) as a quaternion. */
export function quatOf(r: Vec3, out = new THREE.Quaternion()): THREE.Quaternion {
  return out.setFromEuler(eul.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ'));
}

export function eulerOf(q: THREE.Quaternion): Vec3 {
  eul.setFromQuaternion(q, 'XYZ');
  return [eul.x / D2R, eul.y / D2R, eul.z / D2R];
}

export const clipKeys = (clip: AnimClip): AnimKey[] => [...clip.keys].sort((a, b) => a.t - b.t);

export const EASES: { id: NonNullable<AnimClip['ease']>; label: string }[] = [
  { id: 'linear', label: 'Linear' },
  { id: 'smooth', label: 'Smooth' },
  { id: 'in', label: 'Ease in' },
  { id: 'out', label: 'Ease out' },
];

const easeF = (e: AnimClip['ease'], f: number): number => (e === 'smooth' ? f * f * (3 - 2 * f) : e === 'in' ? f * f : e === 'out' ? 1 - (1 - f) * (1 - f) : f);

/** The two keys around time `t` and how far (0..1, eased) between them. A looping clip blends from its last key back to its first. */
function segment(clip: AnimClip, t: number): { a: AnimKey; b: AnimKey; f: number } | null {
  const keys = clipKeys(clip);
  if (!keys.length) return null;
  const d = Math.max(0.001, clip.duration);
  const time = clip.loop ? ((t % d) + d) % d : Math.max(0, Math.min(d, t));
  let a = keys[0];
  let b = keys[0];
  let k = 0;
  if (time >= keys[0].t) {
    for (k = 0; k < keys.length && keys[k].t <= time; k++);
    a = keys[k - 1];
    b = keys[k] ?? (clip.loop && keys.length > 1 ? { t: keys[0].t + d, pose: keys[0].pose, root: keys[0].root } : keys[k - 1]);
  } else if (clip.loop && keys.length > 1) {
    a = { t: keys[keys.length - 1].t - d, pose: keys[keys.length - 1].pose, root: keys[keys.length - 1].root };
    b = keys[0];
  }
  const span = b.t - a.t;
  const f = span > 1e-6 ? Math.max(0, Math.min(1, (time - a.t) / span)) : 0;
  return { a, b, f: easeF(clip.ease, f) };
}

/**
 * The pose of every joint at time `t`. Between two keys each joint turns smoothly (slerp, eased by the clip's easing); before the first key and after the
 * last it holds.
 */
export function samplePose(clip: AnimClip, t: number, jointIds: string[]): Record<string, Vec3> {
  const out: Record<string, Vec3> = {};
  const sg = segment(clip, t);
  if (!sg) return out;
  const { a, b, f } = sg;
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  for (const id of jointIds) {
    const ra = a.pose[id] ?? [0, 0, 0];
    const rb = b.pose[id] ?? [0, 0, 0];
    if (f === 0 || (ra[0] === rb[0] && ra[1] === rb[1] && ra[2] === rb[2])) {
      if (ra[0] || ra[1] || ra[2]) out[id] = [...ra] as Vec3;
      continue;
    }
    quatOf(ra, qa);
    quatOf(rb, qb);
    const r = eulerOf(qa.slerp(qb, f));
    if (Math.abs(r[0]) > 1e-4 || Math.abs(r[1]) > 1e-4 || Math.abs(r[2]) > 1e-4) out[id] = r.map((v) => Math.round(v * 1000) / 1000) as Vec3;
  }
  return out;
}

/** Root motion (hips offset in metres) at time `t`, or undefined when the clip has none. */
export function sampleRoot(clip: AnimClip, t: number): Vec3 | undefined {
  if (!clip.keys.some((k) => k.root)) return undefined;
  const sg = segment(clip, t);
  if (!sg) return undefined;
  const ra = sg.a.root ?? [0, 0, 0];
  const rb = sg.b.root ?? [0, 0, 0];
  return [0, 1, 2].map((i) => ra[i] + (rb[i] - ra[i]) * sg.f) as Vec3;
}

// ---------- ready-made clips for a person ----------

export type Preset = 'walk' | 'run' | 'idle' | 'wave' | 'jump' | 'attack' | 'hit' | 'death' | 'crouch' | 'strafe';

export const PRESETS: { id: Preset; label: string; seconds: number; hint: string }[] = [
  { id: 'walk', label: 'Walk', seconds: 1, hint: 'Legs and arms swing in turn' },
  { id: 'run', label: 'Run', seconds: 0.6, hint: 'Bigger, faster strides, leaning forward' },
  { id: 'idle', label: 'Idle', seconds: 3, hint: 'Standing and breathing' },
  { id: 'wave', label: 'Wave', seconds: 1.6, hint: 'Raises an arm and waves' },
  { id: 'jump', label: 'Jump', seconds: 1, hint: 'Crouch, spring up, land (once)' },
  { id: 'attack', label: 'Attack', seconds: 0.7, hint: 'A punch with a step forward (once)' },
  { id: 'hit', label: 'Hit', seconds: 0.6, hint: 'Recoils from a blow (once)' },
  { id: 'death', label: 'Death', seconds: 1.8, hint: 'Staggers and falls on the back (once)' },
  { id: 'crouch', label: 'Crouch', seconds: 1.2, hint: 'Squats down and stays (once)' },
  { id: 'strafe', label: 'Strafe', seconds: 0.8, hint: 'Side steps with guard up' },
];

type Pose = Record<string, Vec3>;
const S = (p: number) => Math.sin(p * Math.PI * 2);
const C = (p: number) => Math.cos(p * Math.PI * 2);

/** A pose of the person's joints (by name) at a point in the cycle (0..1). Positive X turns a hanging limb backward. */
function poseAt(kind: Preset, ph: number): Record<string, Vec3> {
  const P: Record<string, Vec3> = {};
  if (kind === 'walk' || kind === 'run') {
    const run = kind === 'run';
    const hip = run ? 48 : 30;
    const kneeMax = run ? 85 : 38;
    const arm = run ? 55 : 26;
    const lean = run ? -12 : -3;
    for (const [side, sgn] of [['Left', 1], ['Right', -1]] as const) {
      const p = ph + (sgn === 1 ? 0 : 0.5);
      P[`Hip ${side}`] = [-hip * S(p), 0, 0];
      P[`Knee ${side}`] = [(kneeMax / 2) * (1 + C(p + 0.1)) * (run ? 1 : 0.9), 0, 0];
      P[`Ankle ${side}`] = [-(kneeMax / 2) * 0.35 * (1 + C(p + 0.1)) + (run ? 8 : 4) * S(p), 0, 0];
      P[`Shoulder ${side}`] = [arm * S(p), 0, 0];
      P[`Elbow ${side}`] = [-(run ? 70 : 18) - (run ? 15 : 8) * (1 - S(p)) / 2, 0, 0];
    }
    P['Hips'] = [0, (run ? 9 : 6) * S(ph), (run ? 3 : 2) * C(ph * 2)];
    P['Spine'] = [lean, -(run ? 10 : 6) * S(ph), 0];
    P['Chest'] = [0, -(run ? 5 : 3) * S(ph), 0];
    P['Head'] = [-lean * 0.8, (run ? 4 : 2) * S(ph), 0];
  } else if (kind === 'strafe') {
    for (const [side, sgn] of [['Left', 1], ['Right', -1]] as const) {
      const p = ph + (sgn === 1 ? 0 : 0.5);
      P[`Hip ${side}`] = [-12, 0, sgn * 16 * (1 + S(p))];
      P[`Knee ${side}`] = [24 + 10 * C(p), 0, 0];
      P[`Ankle ${side}`] = [-12, 0, 0];
      P[`Shoulder ${side}`] = [-25, 0, sgn * 12];
      P[`Elbow ${side}`] = [-75, 0, 0];
    }
    P['Spine'] = [-6, 0, 0];
    P['Head'] = [6, 0, 0];
  } else if (kind === 'idle') {
    P['Chest'] = [1.6 * S(ph), 0, 0];
    P['Spine'] = [0.8 * S(ph), 1.2 * S(ph * 2), 0];
    P['Head'] = [-1.5 * S(ph), 3 * S(ph * 2 + 0.25), 0];
    P['Shoulder Left'] = [0, 0, 5 + 1.5 * S(ph)];
    P['Shoulder Right'] = [0, 0, -(5 + 1.5 * S(ph))];
    P['Elbow Left'] = [-8 - 2 * S(ph), 0, 0];
    P['Elbow Right'] = [-8 - 2 * S(ph), 0, 0];
  } else {
    P['Shoulder Right'] = [0, 0, -145];
    P['Elbow Right'] = [0, 0, -35 - 28 * S(ph * 2)];
    P['Wrist Right'] = [0, 0, -12 * S(ph * 2 + 0.25)];
    P['Shoulder Left'] = [0, 0, 6];
    P['Elbow Left'] = [-10, 0, 0];
    P['Chest'] = [0, 0, -4 * S(ph)];
    P['Head'] = [0, 0, 6 * S(ph)];
  }
  return P;
}

type KF = { t: number; p: Record<string, Vec3>; root?: Vec3 };

/** A squat that keeps the feet flat: thighs forward by `a` degrees. The hips drop by H(1 - cos a). */
const squat = (a: number): Record<string, Vec3> => ({ 'Hip Left': [-a, 0, 0], 'Hip Right': [-a, 0, 0], 'Knee Left': [2 * a, 0, 0], 'Knee Right': [2 * a, 0, 0], 'Ankle Left': [-a, 0, 0], 'Ankle Right': [-a, 0, 0] });
const arms = (x: number, z = 0, elbow = 0): Record<string, Vec3> => ({ 'Shoulder Left': [x, 0, z], 'Shoulder Right': [x, 0, -z], 'Elbow Left': [elbow, 0, 0], 'Elbow Right': [elbow, 0, 0] });
const drop = (H: number, a: number): Vec3 => [0, -H * (1 - Math.cos(a * D2R)), 0];

/** One-shot clips as hand-made keys. `H` is the height of the hips, so root motion fits the character's size. */
function shots(kind: Preset, H: number): { keys: KF[]; ease: NonNullable<AnimClip['ease']> } | null {
  switch (kind) {
    case 'jump':
      return { ease: 'smooth', keys: [
        { t: 0, p: {} },
        { t: 0.25, p: { ...squat(40), ...arms(35), Spine: [-12, 0, 0] }, root: drop(H, 40) },
        { t: 0.4, p: { ...arms(-150), Spine: [4, 0, 0] }, root: [0, 0.02 * H, 0] },
        { t: 0.55, p: { 'Hip Left': [-45, 0, 0], 'Hip Right': [-30, 0, 0], 'Knee Left': [70, 0, 0], 'Knee Right': [55, 0, 0], ...arms(-140, 15) }, root: [0, 0.45 * H, 0.1 * H] },
        { t: 0.8, p: { ...squat(35), ...arms(-40, 0, -30), Spine: [-10, 0, 0] }, root: drop(H, 35) },
        { t: 1, p: {} },
      ] };
    case 'attack':
      return { ease: 'out', keys: [
        { t: 0, p: { ...arms(-25, 0, -70) } },
        { t: 0.22, p: { 'Shoulder Right': [55, 0, -10], 'Elbow Right': [-100, 0, 0], 'Shoulder Left': [-30, 0, 10], 'Elbow Left': [-80, 0, 0], Spine: [-6, 30, 0], Chest: [0, 12, 0], 'Hip Left': [10, 0, 0], 'Hip Right': [-20, 0, 0], 'Knee Right': [30, 0, 0] }, root: [0, -0.03 * H, -0.05 * H] },
        { t: 0.38, p: { 'Shoulder Right': [-92, 0, -4], 'Elbow Right': [-4, 0, 0], 'Shoulder Left': [-20, 0, 10], 'Elbow Left': [-90, 0, 0], Spine: [-10, -32, 0], Chest: [0, -12, 0], 'Hip Left': [-35, 0, 0], 'Knee Left': [40, 0, 0], 'Hip Right': [22, 0, 0], 'Knee Right': [12, 0, 0] }, root: [0, -0.05 * H, 0.18 * H] },
        { t: 0.7, p: { ...arms(-25, 0, -70) } },
      ] };
    case 'hit':
      return { ease: 'out', keys: [
        { t: 0, p: {} },
        { t: 0.12, p: { Spine: [16, 0, 0], Chest: [8, 0, 0], Head: [24, 0, 0], ...arms(20, 25, -10), 'Knee Left': [14, 0, 0], 'Knee Right': [14, 0, 0], 'Hip Left': [-6, 0, 0], 'Hip Right': [-6, 0, 0] }, root: [0, -0.03 * H, -0.08 * H] },
        { t: 0.6, p: {} },
      ] };
    case 'death':
      return { ease: 'smooth', keys: [
        { t: 0, p: {} },
        { t: 0.25, p: { Spine: [12, 0, 0], Head: [22, 0, 0], ...arms(15, 20, -12) }, root: [0, 0, -0.05 * H] },
        { t: 0.7, p: { ...squat(45), Hips: [-18, 0, 0], Spine: [14, 0, 0], Head: [20, 0, 0], ...arms(25, 35, -10) }, root: [0, -0.45 * H, -0.15 * H] },
        { t: 1.3, p: { Hips: [-90, 0, 0], 'Knee Left': [25, 0, 0], 'Knee Right': [15, 0, 0], Head: [10, 12, 0], ...arms(0, 55, 0) }, root: [0, -0.84 * H, -0.2 * H] },
        { t: 1.8, p: { Hips: [-90, 0, 0], 'Knee Left': [25, 0, 0], 'Knee Right': [15, 0, 0], Head: [10, 12, 0], ...arms(0, 60, 0) }, root: [0, -0.84 * H, -0.2 * H] },
      ] };
    case 'crouch':
      return { ease: 'smooth', keys: [
        { t: 0, p: {} },
        { t: 0.45, p: { ...squat(65), Spine: [-22, 0, 0], Head: [18, 0, 0], ...arms(-30, 0, -60) }, root: drop(H, 65) },
        { t: 1.2, p: { ...squat(65), Spine: [-24, 0, 0], Head: [18, 0, 0], ...arms(-30, 0, -60) }, root: drop(H, 65) },
      ] };
    default:
      return null;
  }
}

/** A ready-made animation for a person skeleton. Joints are found by name, so any figure with the person skeleton works. */
export function presetClip(kind: Preset, joints: Joint[], id: string): AnimClip {
  const info = PRESETS.find((p) => p.id === kind)!;
  const byName = new Map(joints.map((j) => [j.name, j.id]));
  const hips = joints.find((j) => j.name === 'Hips');
  const H = Math.max(0.3, hips?.pos[1] ?? 0.9);
  const owner = joints.find((j) => j.owner)?.owner;
  const toPose = (p: Record<string, Vec3>): Pose => {
    const pose: Pose = {};
    for (const [name, rot] of Object.entries(p)) {
      const jid = byName.get(name);
      if (jid && (Math.abs(rot[0]) > 1e-3 || Math.abs(rot[1]) > 1e-3 || Math.abs(rot[2]) > 1e-3)) pose[jid] = rot.map((v) => Math.round(v * 100) / 100) as Vec3;
    }
    return pose;
  };
  const r3 = (v: Vec3): Vec3 => v.map((x) => Math.round(x * 1000) / 1000) as Vec3;
  const shot = shots(kind, H);
  if (shot) {
    const keys: AnimKey[] = shot.keys.map((k) => ({ t: Math.round(k.t * info.seconds * 1000) / 1000, pose: toPose(k.p), ...(k.root ? { root: r3(k.root) } : {}) }));
    return { id, name: info.label, duration: info.seconds, loop: false, ease: shot.ease, ...(owner ? { owner } : {}), keys };
  }
  const N = 8;
  const keys: AnimKey[] = [];
  for (let k = 0; k < N; k++) {
    const ph = k / N;
    const key: AnimKey = { t: Math.round(ph * info.seconds * 1000) / 1000, pose: toPose(poseAt(kind, ph)) };
    if (kind === 'walk' || kind === 'run') key.root = r3([0, (kind === 'run' ? 0.03 : 0.015) * H * C(ph * 2), 0]);
    else if (kind === 'strafe') key.root = r3([0.02 * H * S(ph), -0.1 * H + 0.01 * H * C(ph * 2), 0]);
    keys.push(key);
  }
  return { id, name: info.label, duration: info.seconds, loop: true, ...(owner ? { owner } : {}), keys };
}
