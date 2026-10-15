import { DEFAULT_SEGMENTS, type SceneObject, type ShapeParams, type ShapeType, type Vec3 } from './types';
import { cloneMesh, type PolyMesh } from './mesh';
import { objectTriangles } from './shapes';
import { Store, emptyDoc } from './store';
import { Vector3 } from 'three';
import { POLICE } from './library/police';
import { CAR } from './library/car';
import { HOUSE } from './library/house';
import { FOOTBALLER } from './library/footballer';
import { SOLDIER } from './library/soldier';

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
}

export interface AssetStep {
  title: string;
  text: string;
  /** Tools and ideas used in this step, shown as small tags. */
  tools: string[];
}

export interface AssetDef {
  id: 'police' | 'car' | 'house' | 'footballer' | 'soldier';
  name: string;
  tagline: string;
  level: 'Easy' | 'Medium' | 'Detailed';
  /** What a learner picks up. */
  learn: string[];
  steps: AssetStep[];
  challenge: string;
  /** Camera hint for the library picture: direction and how tightly to frame. */
  thumb?: { dir: Vec3; zoom: number };
  parts: AssetPart[];
}

export const ASSETS: AssetDef[] = [POLICE, CAR, HOUSE, FOOTBALLER, SOLDIER];

export function assetById(id: string): AssetDef | undefined {
  return ASSETS.find((a) => a.id === id);
}

let counter = 0;
const uid = () => `a${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Fresh objects for a project: a group plus one shape per part (parent first). */
export function instantiateAsset(def: AssetDef, at: Vec3 = [0, 0, 0], existingNames: Set<string> = new Set()): { group: SceneObject; parts: SceneObject[]; partStep: Map<string, number> } {
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
  const parts = def.parts.map((p) => {
    const params: ShapeParams = { segments: p.segments ?? DEFAULT_SEGMENTS[p.shape], taper: p.taper ?? 1 };
    const o: SceneObject = {
      id: uid(),
      name: p.name,
      kind: 'shape',
      shape: p.shape,
      params,
      position: [...p.pos],
      rotation: p.rot ? [...p.rot] : [0, 0, 0],
      size: [...p.size],
      color: p.color,
      visible: true,
      locked: false,
      parent: group.id,
    };
    if (p.mesh) o.mesh = cloneMesh(p.mesh());
    if (p.smooth) o.smooth = true;
    if (p.paint) o.paint = p.paint;
    partStep.set(o.id, p.step);
    return o;
  });
  return { group, parts, partStep };
}

export function assetStats(def: AssetDef): { triangles: number; parts: number; height: number; width: number; depth: number } {
  const { group, parts } = instantiateAsset(def);
  const st = new Store(emptyDoc('stats'));
  st.mutate((d) => d.objects.push(group, ...parts), false);
  const size = st.worldBounds().getSize(new Vector3());
  return { triangles: parts.reduce((a, o) => a + objectTriangles(o), 0), parts: parts.length, width: size.x, height: size.y, depth: size.z };
}
