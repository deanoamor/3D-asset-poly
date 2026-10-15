import type { Joint, Vec3 } from '../types';

/** The joints of a person, by name. Left is +X, Right is -X, and the person faces +Z. */
export interface BodyJoints {
  hips: Vec3;
  spine: Vec3;
  chest: Vec3;
  neck: Vec3;
  head: Vec3;
  headTop: Vec3;
  shoulder: Vec3;
  elbow: Vec3;
  wrist: Vec3;
  fingers: Vec3;
  hip: Vec3;
  knee: Vec3;
  ankle: Vec3;
  toe: Vec3;
}

const mirror = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];

/** The standard person skeleton used by the ready-made characters: 24 joints, from the hips out to fingers and toes. */
export const HUMAN: BodyJoints = {
  hips: [0, 0.92, 0],
  spine: [0, 1.08, 0.004],
  chest: [0, 1.26, 0.01],
  neck: [0, 1.42, 0.012],
  head: [0, 1.52, 0.014],
  headTop: [0, 1.94, 0.014],
  shoulder: [0.3, 1.32, 0.01],
  elbow: [0.385, 1.08, 0.05],
  wrist: [0.4, 0.88, 0.155],
  fingers: [0.405, 0.8, 0.19],
  hip: [0.105, 0.9, 0],
  knee: [0.118, 0.52, 0.035],
  ankle: [0.115, 0.215, 0],
  toe: [0.115, 0.1, 0.18],
};

export interface JointSpec {
  key: string;
  name: string;
  parent: string | null;
  pos: Vec3;
}

/** A person's joints as a tree. `right` lets one arm be posed differently (the other arm mirrors the default). */
export function humanSpec(j: BodyJoints = HUMAN, right: Partial<Pick<BodyJoints, 'shoulder' | 'elbow' | 'wrist' | 'fingers'>> = {}): JointSpec[] {
  const out: JointSpec[] = [
    { key: 'hips', name: 'Hips', parent: null, pos: j.hips },
    { key: 'spine', name: 'Spine', parent: 'hips', pos: j.spine },
    { key: 'chest', name: 'Chest', parent: 'spine', pos: j.chest },
    { key: 'neck', name: 'Neck', parent: 'chest', pos: j.neck },
    { key: 'head', name: 'Head', parent: 'neck', pos: j.head },
    { key: 'headTop', name: 'Head Top', parent: 'head', pos: j.headTop },
  ];
  for (const s of ['L', 'R'] as const) {
    const side = s === 'L' ? 'Left' : 'Right';
    const m = (p: Vec3): Vec3 => (s === 'L' ? p : mirror(p));
    const arm = s === 'R' ? { shoulder: right.shoulder ?? mirror(j.shoulder), elbow: right.elbow ?? mirror(j.elbow), wrist: right.wrist ?? mirror(j.wrist), fingers: right.fingers ?? mirror(j.fingers) } : { shoulder: j.shoulder, elbow: j.elbow, wrist: j.wrist, fingers: j.fingers };
    out.push(
      { key: `shoulder${s}`, name: `Shoulder ${side}`, parent: 'chest', pos: arm.shoulder },
      { key: `elbow${s}`, name: `Elbow ${side}`, parent: `shoulder${s}`, pos: arm.elbow },
      { key: `wrist${s}`, name: `Wrist ${side}`, parent: `elbow${s}`, pos: arm.wrist },
      { key: `fingers${s}`, name: `Fingers ${side}`, parent: `wrist${s}`, pos: arm.fingers },
      { key: `hip${s}`, name: `Hip ${side}`, parent: 'hips', pos: m(j.hip) },
      { key: `knee${s}`, name: `Knee ${side}`, parent: `hip${s}`, pos: m(j.knee) },
      { key: `ankle${s}`, name: `Ankle ${side}`, parent: `knee${s}`, pos: m(j.ankle) },
      { key: `toe${s}`, name: `Toe ${side}`, parent: `ankle${s}`, pos: m(j.toe) },
    );
  }
  return out;
}

/** Turn a spec into real joints for a group: new ids, positions moved by `at`. */
export function jointsFromSpec(spec: JointSpec[], owner: string | undefined, at: Vec3 = [0, 0, 0], scale = 1): Joint[] {
  const ids = new Map(spec.map((s, i) => [s.key, `j${Date.now().toString(36)}${i.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`]));
  return spec.map((s) => ({
    id: ids.get(s.key)!,
    name: s.name,
    parent: s.parent ? ids.get(s.parent)! : null,
    pos: [at[0] + s.pos[0] * scale, at[1] + s.pos[1] * scale, at[2] + s.pos[2] * scale] as Vec3,
    ...(owner ? { owner } : {}),
  }));
}
