import { DEFAULT_SEGMENTS, type Doc, type EnginePreset, type Picture, type SceneObject, type ShapeParams, type ShapeType, type Vec3 } from './types';
import { cloneMesh } from './mesh';
import { Store, emptyDoc } from './store';
import type { AssetGroup, AssetPart } from './assets';
import { blob, sweep, toPart, type Ring } from './library/organic';
import { humanSpec, jointsFromSpec, type BodyJoints } from './library/rigs';
import { humanoid, humanJoints, type HumanParams } from './library/humanoid';

/**
 * A character written as data. Coordinates are in metres: the character stands on y = 0 and faces +Z; "Left" is +X and
 * "Right" is -X. Start from `template: { kind: 'human', ... }` (body, face, skeleton, expressions) and add `parts` for
 * everything that makes it unique, or build everything yourself from `parts`.
 */
export interface CharPartSpec {
  name: string;
  /**
   * box | sphere | cylinder | cone | pyramid | plane: a primitive placed with pos / size / rot.
   * sweep: a smooth tube along `rings` (limbs, bodies, belts, tails). blob: a low-poly ellipsoid (hands, hair, eyes, noses).
   */
  kind?: ShapeType | 'sweep' | 'blob';
  pos?: Vec3;
  size?: Vec3;
  rot?: Vec3;
  color: string;
  segments?: number;
  taper?: number;
  rings?: { p: Vec3; r: number | [number, number] }[];
  sides?: number;
  start?: 'flat' | 'dome' | 'none';
  end?: 'flat' | 'dome' | 'none';
  center?: Vec3;
  radii?: Vec3;
  /** Describe the Left (+X) part once and get a Right twin: names end in Left / Right, x and the turns are mirrored. */
  mirror?: boolean;
  smooth?: boolean;
  paint?: number;
  /** Name of a sub-group from `groups` (e.g. a wheel or a hat that can turn on its own). */
  group?: string;
  /** A ready-made picture on the part: face | stripes | checker | star. */
  picture?: { id: string; mode?: 'all' | 'front' };
  mat?: { rough?: number; metal?: number; glow?: number };
  skin?: { mode?: 'auto' | 'bend' | 'joint'; joint?: string; soft?: number };
}

export interface MorphSpec {
  name: string;
  /** Part name -> its new pos / size / rot when this expression is fully on. */
  parts: Record<string, { pos?: Vec3; size?: Vec3; rot?: Vec3 }>;
}

export interface CharSpec {
  name: string;
  engine?: EnginePreset;
  template?: HumanParams;
  /** Parts added after the template. A part with the same name as a template part replaces it. */
  parts?: CharPartSpec[];
  /** Names of template parts to leave out. */
  remove?: string[];
  groups?: AssetGroup[];
  /** 'human' (default with a human template): the person skeleton fitted to the body. 'none': no skeleton. */
  rig?: 'human' | 'none';
  /** Custom joint positions for the person skeleton (overrides the template's). */
  joints?: Partial<BodyJoints>;
  morphs?: MorphSpec[];
}

export interface BuildResult {
  doc: Doc;
  warnings: string[];
}

const mirrorV = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];

function partFromSpec(s: CharPartSpec, warnings: string[]): AssetPart | null {
  const kind = s.kind ?? 'box';
  const common = { smooth: s.smooth, paint: s.paint, group: s.group };
  let part: AssetPart;
  if (kind === 'sweep') {
    if (!s.rings || s.rings.length < 2) {
      warnings.push(`“${s.name}”: a sweep needs at least 2 rings.`);
      return null;
    }
    const rings: Ring[] = s.rings.map((r) => ({ p: r.p, r: r.r }));
    part = toPart(0, s.name, sweep(rings, { sides: s.sides ?? 7, start: s.start, end: s.end }), s.color, common);
  } else if (kind === 'blob') {
    if (!s.center || !s.radii) {
      warnings.push(`“${s.name}”: a blob needs center and radii.`);
      return null;
    }
    part = toPart(0, s.name, blob(s.center, s.radii, s.segments ?? 6), s.color, common);
  } else {
    part = { step: 0, name: s.name, shape: kind, pos: s.pos ?? [0, 0.5, 0], size: s.size ?? [0.2, 0.2, 0.2], color: s.color, ...(s.rot ? { rot: s.rot } : {}), ...(s.segments ? { segments: s.segments } : {}), ...(s.taper !== undefined ? { taper: s.taper } : {}), ...common };
  }
  return part;
}

function mirrorSpec(s: CharPartSpec): CharPartSpec {
  const name = /Left/.test(s.name) ? s.name.replace('Left', 'Right') : `${s.name} Right`;
  return {
    ...s,
    name,
    mirror: false,
    pos: s.pos && mirrorV(s.pos),
    center: s.center && mirrorV(s.center),
    rot: s.rot && ([s.rot[0], -s.rot[1], -s.rot[2]] as Vec3),
    rings: s.rings?.map((r) => ({ p: mirrorV(r.p), r: r.r })),
  };
}

/** The spec's parts, with `mirror` expanded into Left and Right. */
export function expandSpecParts(parts: CharPartSpec[]): CharPartSpec[] {
  const out: CharPartSpec[] = [];
  for (const p of parts) {
    if (!p.mirror) out.push(p);
    else {
      out.push({ ...p, name: /Left/.test(p.name) ? p.name : `${p.name} Left`, mirror: false }, mirrorSpec(/Left/.test(p.name) ? p : { ...p, name: `${p.name} Left` }));
    }
  }
  return out;
}

let counter = 0;
const uid = () => `c${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/**
 * Turn a spec into a project. `pictures` makes a ready-made picture (needs a browser); without it pictures are skipped
 * with a warning.
 */
export function buildCharacter(spec: CharSpec, hooks: { picture?: (id: string, skin?: string) => Picture | null } = {}): BuildResult {
  const warnings: string[] = [];
  let parts: AssetPart[] = [];
  let joints: BodyJoints | undefined;
  let expressions: MorphSpec[] = [];
  const template = spec.template;
  if (template) {
    const built = humanoid(template);
    parts = built.parts;
    joints = built.joints;
    expressions = built.expressions.map((e) => ({ name: e.name, parts: Object.fromEntries(Object.entries(e.parts).map(([k, v]) => [k, { ...(v.pos ? { pos: v.pos } : {}), ...(v.size ? { size: v.size } : {}) }])) }));
    const gone = new Set(spec.remove ?? []);
    parts = parts.filter((p) => !gone.has(p.name));
    for (const n of gone) if (!built.parts.some((p) => p.name === n)) warnings.push(`remove: no template part called “${n}”.`);
  }
  const extra = expandSpecParts(spec.parts ?? []);
  const pictureOf = new Map<string, NonNullable<CharPartSpec['picture']>>();
  const specOf = new Map<string, CharPartSpec>();
  for (const s of extra) {
    const part = partFromSpec(s, warnings);
    if (!part) continue;
    const at = parts.findIndex((p) => p.name === s.name);
    if (at >= 0) parts[at] = part;
    else parts.push(part);
    specOf.set(s.name, s);
    if (s.picture) pictureOf.set(s.name, s.picture);
  }
  const seen = new Set<string>();
  for (const p of parts) {
    if (seen.has(p.name)) warnings.push(`two parts are called “${p.name}”.`);
    seen.add(p.name);
  }

  const group: SceneObject = { id: uid(), name: spec.name, kind: 'group', params: { segments: 1, taper: 1 }, position: [0, 0, 0], rotation: [0, 0, 0], size: [1, 1, 1], color: '#c9ced6', visible: true, locked: false, parent: null };
  const subs = new Map<string, SceneObject>();
  const groupObjs = (spec.groups ?? []).map((gd) => {
    const sg: SceneObject = { id: uid(), name: gd.name, kind: 'group', params: { segments: 1, taper: 1 }, position: [...gd.pivot], rotation: [0, 0, 0], size: [1, 1, 1], color: '#c9ced6', visible: true, locked: false, parent: group.id, ...(gd.spin ? { spin: { ...gd.spin } } : {}) };
    subs.set(gd.name, sg);
    return sg;
  });
  const byName = new Map<string, SceneObject>();
  const objs = parts.map((p) => {
    const params: ShapeParams = { segments: p.segments ?? DEFAULT_SEGMENTS[p.shape], taper: p.taper ?? 1 };
    const sub = p.group ? subs.get(p.group) : undefined;
    if (p.group && !sub) warnings.push(`“${p.name}” is in the group “${p.group}”, which does not exist.`);
    const o: SceneObject = {
      id: uid(),
      name: p.name,
      kind: 'shape',
      shape: p.shape,
      params,
      position: sub ? ([p.pos[0] - sub.position[0], p.pos[1] - sub.position[1], p.pos[2] - sub.position[2]] as Vec3) : ([...p.pos] as Vec3),
      rotation: p.rot ? ([...p.rot] as Vec3) : [0, 0, 0],
      size: [...p.size],
      color: p.color,
      visible: true,
      locked: false,
      parent: sub ? sub.id : group.id,
    };
    if (p.mesh) o.mesh = cloneMesh(p.mesh());
    if (p.smooth) o.smooth = true;
    if (p.paint) o.paint = p.paint;
    const s = specOf.get(p.name);
    if (s?.mat) o.mat = { ...s.mat };
    if (s?.skin) o.skin = { ...s.skin };
    byName.set(p.name, o);
    return o;
  });

  const doc = emptyDoc(spec.name);
  if (spec.engine) doc.enginePreset = spec.engine;
  const st = new Store(doc);
  st.mutate((d) => d.objects.push(group, ...groupObjs, ...objs), false);

  const rigKind = spec.rig ?? (template ? 'human' : 'none');
  if (rigKind === 'human') {
    const j = { ...(joints ?? humanJoints()), ...(spec.joints ?? {}) } as BodyJoints;
    st.addJoints(jointsFromSpec(humanSpec(j), group.id));
  }

  // pictures on parts
  for (const [name, pic] of pictureOf) {
    const o = byName.get(name);
    if (!o) continue;
    const made = hooks.picture?.(pic.id, o.color);
    if (!made) {
      warnings.push(`picture “${pic.id}” on “${name}” was skipped (pictures need the browser).`);
      continue;
    }
    st.addPicture(made);
    st.setPicture([o.id], { id: made.id, mode: pic.mode ?? 'all' }, false);
  }

  // expressions (morph targets)
  const allMorphs = [...expressions.filter((e) => !(spec.morphs ?? []).some((m) => m.name === e.name)), ...(spec.morphs ?? [])];
  if (allMorphs.length) {
    st.mutate((d) => {
      d.morphs = [];
      for (const m of allMorphs) {
        const targets: NonNullable<Doc['morphs']>[number]['parts'] = {};
        for (const [name, t] of Object.entries(m.parts)) {
          const o = byName.get(name);
          if (!o) {
            warnings.push(`expression “${m.name}”: no part called “${name}”.`);
            continue;
          }
          const sub = o.parent !== group.id ? [...subs.values()].find((g) => g.id === o.parent) : undefined;
          const loc = (v: Vec3): Vec3 => (sub ? ([v[0] - sub.position[0], v[1] - sub.position[1], v[2] - sub.position[2]] as Vec3) : v);
          targets[o.id] = { ...(t.pos ? { position: loc(t.pos) } : {}), ...(t.size ? { size: t.size } : {}), ...(t.rot ? { rotation: t.rot } : {}) };
        }
        if (Object.keys(targets).length) d.morphs.push({ id: uid(), name: m.name, parts: targets });
      }
      if (!d.morphs.length) delete d.morphs;
    }, false);
  }
  st.commit();
  return { doc: st.doc, warnings };
}
