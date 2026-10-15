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
  visible: boolean;
  locked: boolean;
  parent: string | null;
}

export interface Doc {
  version: 1;
  name: string;
  enginePreset: EnginePreset;
  /** Flat list; sibling order is the order of appearance. */
  objects: SceneObject[];
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
