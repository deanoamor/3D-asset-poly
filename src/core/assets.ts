import { DEFAULT_SEGMENTS, type Joint, type SceneObject, type ShapeParams, type ShapeType, type Vec3 } from './types';
import { cloneMesh, type PolyMesh } from './mesh';
import { objectTriangles } from './shapes';
import { Store, emptyDoc } from './store';
import { Vector3 } from 'three';
import { jointsFromSpec, type JointSpec } from './library/rigs';
import { POLICE } from './library/police';
import { CAR } from './library/car';
import { HOUSE } from './library/house';
import { FOOTBALLER } from './library/footballer';
import { SOLDIER } from './library/soldier';
import { ISLAND } from './library/island';
import { ANIME } from './library/anime';
import { RIBBON } from './library/ribbon';
import { NURSE } from './library/nurse';
import { SCHOOL } from './library/school';
import { CASUAL } from './library/casual';
import { GAMENURSE } from './library/gamenurse';
import { SEIFUKU } from './library/seifuku';
import { JAPANHOUSE } from './library/japanhouse';
import { JAPANSCHOOL } from './library/japanschool';
import { FIREFIGHTER } from './library/firefighter';

/**
 * Ready-made props that double as lessons. Every part belongs to a build step, so the Learn view can add them one
 * by one. Units are metres, +Y is up and the asset faces +Z. "Left" is +X, "Right" is -X (the character's own sides).
 */
export interface AssetPart {
  step: number;
  name: string;
  shape: ShapeType;
  pos: Vec3;
  size: Vec3;
  color: string;
  rot?: Vec3;
  segments?: number;
  taper?: number;
  /** Surface look: soft shading and painted color variation (0..1). */
  smooth?: boolean;
  paint?: number;
  /** An edited shape: unit-sized points, scaled by `size`. */
  mesh?: () => PolyMesh;
  /** Put this part inside the named sub-group (see `AssetDef.groups`), e.g. a wheel. */
  group?: string;
}

/** A group inside the asset with its own pivot, so it can turn on its own (a wheel on its axle). */
export interface AssetGroup {
  name: string;
  /** The pivot, in the asset's own coordinates. */
  pivot: Vec3;
  spin?: { axis: 0 | 1 | 2; speed: number };
}

export interface AssetStep {
  title: string;
  text: string;
  /** Tools and ideas used in this step, shown as small tags. */
  tools: string[];
  /** The skeleton appears at this step. */
  rig?: boolean;
}

export interface AssetDef {
  id: 'police' | 'car' | 'house' | 'footballer' | 'soldier' | 'island' | 'anime' | 'ribbon' | 'nurse' | 'school' | 'casual' | 'gamenurse' | 'firefighter' | 'seifuku' | 'japanhouse' | 'japanschool';
  name: string;
  tagline: string;
  level: 'Easy' | 'Medium' | 'Detailed';
  /** What a learner picks up. */
  learn: string[];
  steps: AssetStep[];
  challenge: string;
  /** The character's skeleton, in the asset's own coordinates. Characters have one. */
  rig?: () => JointSpec[];
  /** Sub-groups with their own pivot (and optional spin). Parts join one by name. */
  groups?: AssetGroup[];
  /** Camera hint for the library picture: direction and how tightly to frame. */
  thumb?: { dir: Vec3; zoom: number };
  parts: AssetPart[];
}

export const ASSETS: AssetDef[] = [POLICE, CAR, HOUSE, FOOTBALLER, SOLDIER, ISLAND, ANIME, RIBBON, NURSE, SCHOOL, CASUAL, GAMENURSE, FIREFIGHTER, SEIFUKU, JAPANHOUSE, JAPANSCHOOL];

export function assetById(id: string): AssetDef | undefined {
  return ASSETS.find((a) => a.id === id);
}

let counter = 0;
const uid = () => `a${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Fresh objects for a project: a group plus one shape per part (parent first). */
export function instantiateAsset(def: AssetDef, at: Vec3 = [0, 0, 0], existingNames: Set<string> = new Set()): { group: SceneObject; groups: SceneObject[]; parts: SceneObject[]; partStep: Map<string, number>; joints: Joint[] } {
  const unique = (base: string) => {
    let n = base;
    let i = 2;
    while (existingNames.has(n)) n = `${base} ${i++}`;
    existingNames.add(n);
    return n;
  };
  const group: SceneObject = {
    id: uid(),
    name: unique(def.name),
    kind: 'group',
    params: { segments: 1, taper: 1 },
    position: [...at],
    rotation: [0, 0, 0],
    size: [1, 1, 1],
    color: '#c9ced6',
    visible: true,
    locked: false,
    parent: null,
  };
  const partStep = new Map<string, number>();
  const subs = new Map<string, SceneObject>();
  const groups = (def.groups ?? []).map((gd) => {
    const sg: SceneObject = {
      id: uid(),
      name: unique(gd.name),
      kind: 'group',
      params: { segments: 1, taper: 1 },
      position: [...gd.pivot],
      rotation: [0, 0, 0],
      size: [1, 1, 1],
      color: '#c9ced6',
      visible: true,
      locked: false,
      parent: group.id,
      ...(gd.spin ? { spin: { ...gd.spin } } : {}),
    };
    subs.set(gd.name, sg);
    return sg;
  });
  const parts = def.parts.map((p) => {
    const params: ShapeParams = { segments: p.segments ?? DEFAULT_SEGMENTS[p.shape], taper: p.taper ?? 1 };
    const sub = p.group ? subs.get(p.group) : undefined;
    const o: SceneObject = {
      id: uid(),
      name: p.name,
      kind: 'shape',
      shape: p.shape,
      params,
      position: sub ? [p.pos[0] - sub.position[0], p.pos[1] - sub.position[1], p.pos[2] - sub.position[2]] : [...p.pos],
      rotation: p.rot ? [...p.rot] : [0, 0, 0],
      size: [...p.size],
      color: p.color,
      visible: true,
      locked: false,
      parent: sub ? sub.id : group.id,
    };
    if (p.mesh) o.mesh = cloneMesh(p.mesh());
    if (p.smooth) o.smooth = true;
    if (p.paint) o.paint = p.paint;
    partStep.set(o.id, p.step);
    return o;
  });
  const joints = def.rig ? jointsFromSpec(def.rig(), group.id, at) : [];
  return { group, groups, parts, partStep, joints };
}

export function assetStats(def: AssetDef): { triangles: number; parts: number; height: number; width: number; depth: number } {
  const { group, groups, parts } = instantiateAsset(def);
  const st = new Store(emptyDoc('stats'));
  st.mutate((d) => d.objects.push(group, ...groups, ...parts), false);
  const size = st.worldBounds().getSize(new Vector3());
  return { triangles: parts.reduce((a, o) => a + objectTriangles(o), 0), parts: parts.length, width: size.x, height: size.y, depth: size.z };
}
