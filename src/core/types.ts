export type ShapeType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'pyramid' | 'plane';
export type Vec3 = [number, number, number];
export type TargetId = 'mobile' | 'pc' | 'custom';
export type EnginePreset = 'unity' | 'godot' | 'unreal' | 'web';

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
  color: string;
  visible: boolean;
  locked: boolean;
  parent: string | null;
}

export interface Doc {
  version: 1;
  name: string;
  target: TargetId;
  customBudget: number;
  enginePreset: EnginePreset;
  /** Flat list; sibling order is the order of appearance. */
  objects: SceneObject[];
}

export const TARGET_BUDGETS: Record<Exclude<TargetId, 'custom'>, number> = {
  mobile: 5000,
  pc: 50000,
};

export const TARGET_LABELS: Record<TargetId, string> = {
  mobile: 'Mobile',
  pc: 'PC',
  custom: 'Custom',
};

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
