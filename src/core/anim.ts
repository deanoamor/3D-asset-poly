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

/**
 * The pose of every joint at time `t`. Between two keys each joint turns smoothly (slerp); before the first key and after the
 * last it holds. A looping clip blends from its last key back to its first.
 */
export function samplePose(clip: AnimClip, t: number, jointIds: string[]): Record<string, Vec3> {
  const keys = clipKeys(clip);
  const out: Record<string, Vec3> = {};
  if (!keys.length) return out;
  const d = Math.max(0.001, clip.duration);
  const time = clip.loop ? ((t % d) + d) % d : Math.max(0, Math.min(d, t));
  let a = keys[0];
  let b = keys[0];
  let k = 0;
  if (time >= keys[0].t) {
    for (k = 0; k < keys.length && keys[k].t <= time; k++);
    a = keys[k - 1];
    b = keys[k] ?? (clip.loop && keys.length > 1 ? { t: keys[0].t + d, pose: keys[0].pose } : keys[k - 1]);
  } else if (clip.loop && keys.length > 1) {
    a = { t: keys[keys.length - 1].t - d, pose: keys[keys.length - 1].pose };
    b = keys[0];
  }
  const span = b.t - a.t;
  const f = span > 1e-6 ? Math.max(0, Math.min(1, (time - a.t) / span)) : 0;
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

// ---------- ready-made clips for a person ----------

export type Preset = 'walk' | 'run' | 'idle' | 'wave';

export const PRESETS: { id: Preset; label: string; seconds: number; hint: string }[] = [
  { id: 'walk', label: 'Walk', seconds: 1, hint: 'Legs and arms swing in turn' },
  { id: 'run', label: 'Run', seconds: 0.6, hint: 'Bigger, faster strides, leaning forward' },
  { id: 'idle', label: 'Idle', seconds: 3, hint: 'Standing and breathing' },
  { id: 'wave', label: 'Wave', seconds: 1.6, hint: 'Raises an arm and waves' },
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

/** A ready-made loop for a person skeleton. Joints are found by name, so any figure with the person skeleton works. */
export function presetClip(kind: Preset, joints: Joint[], id: string): AnimClip {
  const info = PRESETS.find((p) => p.id === kind)!;
  const byName = new Map(joints.map((j) => [j.name, j.id]));
  const N = kind === 'idle' ? 8 : 8;
  const keys: AnimKey[] = [];
  for (let k = 0; k < N; k++) {
    const pose: Pose = {};
    for (const [name, rot] of Object.entries(poseAt(kind, k / N))) {
      const jid = byName.get(name);
      if (jid && (Math.abs(rot[0]) > 1e-3 || Math.abs(rot[1]) > 1e-3 || Math.abs(rot[2]) > 1e-3)) pose[jid] = rot.map((v) => Math.round(v * 100) / 100) as Vec3;
    }
    keys.push({ t: Math.round((k / N) * info.seconds * 1000) / 1000, pose });
  }
  const owner = joints.find((j) => j.owner)?.owner;
  return { id, name: info.label, duration: info.seconds, loop: true, ...(owner ? { owner } : {}), keys };
}
