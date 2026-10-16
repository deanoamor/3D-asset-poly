import type { PolyMesh } from './mesh';

export type ShapeType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'pyramid' | 'plane';
export type Vec3 = [number, number, number];
export type EnginePreset = 'unity' | 'godot' | 'unreal' | 'construct' | 'web' | 'blender' | 'c4d' | 'maya';

export interface ShapeParams {
  /** Sides for cylinder/cone, smoothness for sphere. */
  segments: number;
  /** Cylinder only: top radius relative to bottom radius (0..1). */
  taper: number;
}

export interface SceneObject {
  id: string;
  name: string;
  kind: 'shape' | 'group';
  shape?: ShapeType;
  params: ShapeParams;
  /** Local to parent, metres. */
  position: Vec3;
  /** Euler XYZ, degrees. */
  rotation: Vec3;
  /** Width / height / depth. Scale applied to a unit-sized shape. */
  size: Vec3;
  /** Present once the shape has been edited point by point. Unit-sized; `size` scales it. */
  mesh?: PolyMesh;
  color: string;
  /** Round the facets: soft shading on curved parts while sharp corners (a box edge) stay sharp. */
  smooth?: boolean;
  /** 0..1: soft color differences across the surface (a hand-painted look), stored as vertex colors. */
  paint?: number;
  /**
   * Spin: this object turns by itself around its own pivot (a wheel, a fan, a windmill). `axis` is its local X, Y or Z;
   * `speed` is turns per second (negative = the other way). Shown in Preview and exported as a looping animation.
   */
  spin?: { axis: 0 | 1 | 2; speed: number };
  /** Material: 0..1 roughness (default .85), 0..1 metalness (default 0), glow = how strongly the color lights itself (emissive, default 0). */
  mat?: { rough?: number; metal?: number; glow?: number };
  /** Skin: how this shape follows the skeleton. auto = small parts follow one joint, big ones bend; bend = always blend between joints; joint = follow one joint only. `soft` 0..1 = how wide the blend is. */
  skin?: { mode?: 'auto' | 'bend' | 'joint'; joint?: string; soft?: number };
  visible: boolean;
  locked: boolean;
  parent: string | null;
}

/**
 * A joint of a skeleton. A bone is the stretch between a joint and its parent joint, so a rig is just a tree of points.
 * Moving a parent joint turns everything below it, like an elbow carrying the forearm. `owner` ties a character's
 * joints to its group, so a project can hold several skeletons.
 */
export interface Joint {
  id: string;
  name: string;
  parent: string | null;
  /** World position, metres. */
  pos: Vec3;
  owner?: string;
  /** How far this joint's pull reaches (0.4..2, default 1). Bigger = it moves more of the points around it. */
  reach?: number;
}

/** One moment of an animation: how far each joint is turned (degrees) at time `t`. A joint not listed is at rest. */
export interface AnimKey {
  t: number;
  pose: Record<string, Vec3>;
  /** Root motion: how far the character's hips are moved from rest (metres, in the character's own axes: Y up, Z forward). */
  root?: Vec3;
}

/** A clip of skeleton animation: poses at moments in time, with smooth turning in between. */
export interface AnimClip {
  id: string;
  name: string;
  /** Seconds. */
  duration: number;
  /** Plays again from the start when it ends (in Preview; players decide for the exported file). */
  loop: boolean;
  /** The character (group) it belongs to, if any. */
  owner?: string;
  /** Sorted by time. */
  keys: AnimKey[];
  /** How it eases between keys (default linear). */
  ease?: 'linear' | 'smooth' | 'in' | 'out';
}

export interface Doc {
  version: 1;
  name: string;
  enginePreset: EnginePreset;
  /** Flat list; sibling order is the order of appearance. */
  objects: SceneObject[];
  /** The skeleton, if any. */
  rig?: Joint[];
  /** The pose: how far each joint is turned from rest, in degrees (X, Y, Z), by joint id. */
  pose?: Record<string, Vec3>;
  /** Skeleton animations. */
  anims?: AnimClip[];
}

export const SHAPE_LABELS: Record<ShapeType, string> = {
  box: 'Box',
  cylinder: 'Cylinder',
  sphere: 'Sphere',
  cone: 'Cone',
  pyramid: 'Pyramid',
  plane: 'Plane',
};

export const DEFAULT_SEGMENTS: Record<ShapeType, number> = {
  box: 1,
  cylinder: 16,
  sphere: 12,
  cone: 16,
  pyramid: 4,
  plane: 1,
};

export const MIN_SEGMENTS: Record<ShapeType, number> = {
  box: 1,
  cylinder: 3,
  sphere: 4,
  cone: 3,
  pyramid: 4,
  plane: 1,
};

export const MAX_SEGMENTS = 64;
