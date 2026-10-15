import { DEFAULT_SEGMENTS, type SceneObject, type ShapeParams, type ShapeType, type Vec3 } from './types';
import { cloneMesh, mergeVerts, polyMeshFor, type PolyMesh } from './mesh';
import { objectTriangles } from './shapes';

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
  id: 'police' | 'car' | 'house' | 'footballer';
  name: string;
  tagline: string;
  level: 'Beginner' | 'Easy' | 'Medium';
  /** What a learner picks up. */
  learn: string[];
  steps: AssetStep[];
  challenge: string;
  parts: AssetPart[];
}

const part = (step: number, name: string, shape: ShapeType, pos: Vec3, size: Vec3, color: string, o: Partial<AssetPart> = {}): AssetPart => ({ step, name, shape, pos, size, color, ...o });
/** A left/right pair: Left sits at +x, Right at -x. */
const pair = (step: number, base: string, shape: ShapeType, x: number, y: number, z: number, size: Vec3, color: string, o: Partial<AssetPart> & { flipRot?: boolean } = {}): AssetPart[] => {
  const { flipRot, rot, ...rest } = o;
  return [
    part(step, `${base} Left`, shape, [x, y, z], size, color, { ...rest, rot }),
    part(step, `${base} Right`, shape, [-x, y, z], size, color, { ...rest, rot: rot && flipRot ? [rot[0], -rot[1], -rot[2]] : rot }),
  ];
};

// ---------- shapes made with Edit shape ----------

/** A box whose top is narrower than its bottom (a car cabin). */
function taperedBox(topX: number, topZ: number): PolyMesh {
  const m = polyMeshFor('box', { segments: 1, taper: 1 });
  for (let i = 0; i < m.v.length / 3; i++) {
    if (m.v[i * 3 + 1] > 0) {
      m.v[i * 3] *= topX;
      m.v[i * 3 + 2] *= topZ;
    }
  }
  return m;
}

/** A box whose top collapses into a ridge along X: a gable roof. Made with Merge points. */
function gableRoof(): PolyMesh {
  const m = polyMeshFor('box', { segments: 1, taper: 1 });
  for (const side of [-1, 1]) {
    const ids = new Set<number>();
    for (let i = 0; i < m.v.length / 3; i++) if (m.v[i * 3 + 1] > 0 && Math.sign(m.v[i * 3]) === side) ids.add(i);
    mergeVerts(m, ids);
  }
  return m;
}

// ---------- the four assets ----------

const POLICE: AssetDef = {
  id: 'police',
  name: 'Police Officer',
  tagline: 'A friendly character built only from boxes',
  level: 'Beginner',
  learn: ['Build a person from simple boxes', 'Duplicate one side to make the other', 'Group parts and name them', 'Use few sides on round parts'],
  steps: [
    { title: 'Legs and boots', text: 'Start at the ground. Each leg is one Box, and each boot is a flatter Box under it. Make one side, then duplicate it and move the copy to the other side.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Size handles (R)'] },
    { title: 'Body and belt', text: 'The torso is a bigger Box on top of the legs. The belt is a thin dark Box wrapped around its bottom edge, just a little wider than the torso.', tools: ['Shape: Box', 'Color', 'Thin boxes make details'] },
    { title: 'Arms and hands', text: 'Arms are tall thin Boxes beside the torso, with small skin-colored Boxes for hands. Keep both sides the same size so the character looks balanced.', tools: ['Duplicate Ctrl+D', 'Move (W)'] },
    { title: 'Neck and head', text: 'A short neck and a cube head. Two tiny dark boxes become eyes. At this size, big simple shapes read better than fine details.', tools: ['Shape: Box', 'Small parts = personality'] },
    { title: 'The cap', text: 'The cap is a Cylinder with only 10 sides, because round parts cost the most triangles. A flat Box in front makes the brim, and a tiny gold Box is the cap badge.', tools: ['Shape: Cylinder', 'Sides slider in Properties', 'Fewer sides = fewer triangles'] },
    { title: 'Badge and radio', text: 'Last come the details that tell you who this is: a gold chest badge and a radio on the shoulder. Then give each part a clear name in Layers and group everything.', tools: ['Rename in Layers', 'Group Ctrl+G', 'Color palette'] },
  ],
  challenge: 'Change the uniform to a different color, or add a hat band with one more thin Box.',
  parts: [
    ...pair(0, 'Leg', 'box', 0.13, 0.52, 0, [0.22, 0.8, 0.25], '#2b3a67'),
    ...pair(0, 'Boot', 'box', 0.13, 0.06, 0.04, [0.24, 0.12, 0.36], '#1e2125'),
    part(1, 'Torso', 'box', [0, 1.21, 0], [0.56, 0.58, 0.3], '#3e5c9a'),
    part(1, 'Belt', 'box', [0, 0.97, 0], [0.58, 0.07, 0.32], '#1e2125'),
    ...pair(2, 'Arm', 'box', 0.36, 1.24, 0, [0.14, 0.5, 0.16], '#3e5c9a'),
    ...pair(2, 'Hand', 'box', 0.36, 0.93, 0, [0.12, 0.12, 0.13], '#f1c9a0'),
    part(3, 'Neck', 'box', [0, 1.53, 0], [0.12, 0.1, 0.12], '#f1c9a0'),
    part(3, 'Head', 'box', [0, 1.69, 0], [0.26, 0.26, 0.26], '#f1c9a0'),
    ...pair(3, 'Eye', 'box', 0.06, 1.71, 0.135, [0.04, 0.05, 0.02], '#1e2125'),
    part(4, 'Cap', 'cylinder', [0, 1.84, 0], [0.34, 0.1, 0.34], '#2b3a67', { segments: 10 }),
    part(4, 'Cap Brim', 'box', [0, 1.8, 0.17], [0.3, 0.025, 0.13], '#1e2125'),
    part(4, 'Cap Badge', 'box', [0, 1.85, 0.175], [0.06, 0.05, 0.02], '#e6b422'),
    part(5, 'Chest Badge', 'box', [0.14, 1.36, 0.16], [0.09, 0.09, 0.02], '#e6b422'),
    part(5, 'Radio', 'box', [-0.18, 1.38, 0.17], [0.07, 0.1, 0.05], '#1e2125'),
  ],
};

const CAR: AssetDef = {
  id: 'car',
  name: 'Car',
  tagline: 'A small car with an edited cabin and round wheels',
  level: 'Easy',
  learn: ['Rotate a shape (wheels)', 'Reshape a box with Edit shape (cabin)', 'Reuse parts by duplicating', 'Add details with thin boxes'],
  steps: [
    { title: 'Body and bumpers', text: 'The lower body is one long Box. The bumpers are slim dark Boxes at the front and back. Everything stands on the grid, and the wheels will lift the body later.', tools: ['Shape: Box', 'Size handles (R)', 'Grid snap'] },
    { title: 'The cabin', text: 'The cabin starts as a Box. Then Edit shape moves its top points inward so the roof is narrower than the bottom. This is the box-modeling trick: start simple, then pull points.', tools: ['Edit shape (Tab)', 'Move points', 'Box becomes a trapezoid'] },
    { title: 'Windows', text: 'Windows are thin blue Boxes laid on the cabin. The side ones lean slightly and the front and back ones tilt to match the sloped glass. Use Rotate (E) to tilt them.', tools: ['Rotate (E)', 'Thin boxes', 'Properties: Rotation'] },
    { title: 'Wheels', text: 'A wheel is a Cylinder turned on its side: rotate it 90 degrees. Use 12 sides, enough to look round and cheap enough for mobile. Make one, then duplicate it three times.', tools: ['Shape: Cylinder', 'Rotation 90°', 'Duplicate Ctrl+D', 'Sides slider'] },
    { title: 'Hubcaps', text: 'Hubcaps are smaller light Cylinders, only 8 sides, sitting just outside each wheel. Small parts like these make the car look finished without many triangles.', tools: ['Shape: Cylinder', 'Fewer sides = fewer triangles'] },
    { title: 'Lights and grille', text: 'Yellow headlights and red taillights are small flat Boxes. The grille is a dark Box between the headlights. Name each part in Layers and group them into one Car.', tools: ['Color palette', 'Rename in Layers', 'Group Ctrl+G'] },
  ],
  challenge: 'Select the cabin, press Edit shape, and move the top points so the roof slopes more at the back.',
  parts: [
    part(0, 'Body', 'box', [0, 0.5, 0], [1.8, 0.5, 4.2], '#2f8f8a'),
    part(0, 'Front Bumper', 'box', [0, 0.35, 2.1], [1.84, 0.18, 0.14], '#2f3437'),
    part(0, 'Rear Bumper', 'box', [0, 0.35, -2.1], [1.84, 0.18, 0.14], '#2f3437'),
    part(1, 'Cabin', 'box', [0, 1.025, -0.25], [1.5, 0.55, 2.2], '#3aa39e', { mesh: () => taperedBox(0.8, 0.65) }),
    ...pair(2, 'Side Window', 'box', 0.69, 1.03, -0.25, [0.03, 0.34, 1.5], '#6ec1e4', { rot: [0, 0, -15], flipRot: true }),
    part(2, 'Windshield', 'box', [0, 1.03, 0.66], [1.2, 0.54, 0.03], '#6ec1e4', { rot: [-35, 0, 0] }),
    part(2, 'Rear Window', 'box', [0, 1.03, -1.16], [1.2, 0.54, 0.03], '#6ec1e4', { rot: [35, 0, 0] }),
    ...[1.3, -1.3].flatMap((z, i) => pair(3, i === 0 ? 'Front Wheel' : 'Rear Wheel', 'cylinder', 0.82, 0.36, z, [0.72, 0.26, 0.72], '#2a2d33', { rot: [0, 0, 90], segments: 12 })),
    ...[1.3, -1.3].flatMap((z, i) => pair(4, i === 0 ? 'Front Hubcap' : 'Rear Hubcap', 'cylinder', 0.96, 0.36, z, [0.34, 0.06, 0.34], '#c9ced6', { rot: [0, 0, 90], segments: 8 })),
    ...pair(5, 'Headlight', 'box', 0.62, 0.58, 2.1, [0.3, 0.13, 0.05], '#f6e27a'),
    ...pair(5, 'Taillight', 'box', 0.62, 0.58, -2.1, [0.3, 0.13, 0.05], '#d64545'),
    part(5, 'Grille', 'box', [0, 0.45, 2.1], [0.7, 0.12, 0.04], '#2f3437'),
  ],
};

const HOUSE: AssetDef = {
  id: 'house',
  name: 'House',
  tagline: 'A cottage with a gable roof made by merging points',
  level: 'Easy',
  learn: ['Stack simple blocks into a building', 'Make a roof with Merge points', 'Layer thin boxes for doors and windows', 'Plan parts so they do not overlap'],
  steps: [
    { title: 'Foundation and walls', text: 'Two Boxes: a flat gray foundation and a taller cream box for the walls. The foundation is a little bigger, so it frames the house like a base.', tools: ['Shape: Box', 'Size handles (R)', 'Properties: exact size'] },
    { title: 'The roof', text: 'The roof starts as a Box too. In Edit shape, select the two top points at each end and use Merge points. The top collapses into a ridge, and the box becomes a gable roof. It is a bit wider than the walls, which makes the eaves.', tools: ['Edit shape (Tab)', 'Merge points', 'Box becomes a prism'] },
    { title: 'Door and windows', text: 'The door is a tall thin brown Box in front of the wall. Each window is a white frame Box with a smaller blue glass Box in front. Layering thin boxes is the low-poly way to get detail.', tools: ['Thin boxes', 'Duplicate Ctrl+D', 'Move (W)'] },
    { title: 'Chimney', text: 'The chimney is a tall Box that sticks out through the roof, with a thin dark cap on top. Part of it hides inside the roof. That is fine, because nobody can see it.', tools: ['Shape: Box', 'Hidden parts cost nothing visible'] },
    { title: 'Step, path and lawn', text: 'A step block under the door, a light path in front, and a big flat green Box as the lawn. Flat boxes are cheap ground cover. Group everything and name it House.', tools: ['Flat boxes', 'Color palette', 'Group Ctrl+G'] },
  ],
  challenge: 'Add a second chimney or a window on the side wall, then check the triangle counter.',
  parts: [
    part(0, 'Foundation', 'box', [0, 0.15, 0], [8.4, 0.3, 6.4], '#9aa3ab'),
    part(0, 'Walls', 'box', [0, 1.65, 0], [8, 2.7, 6], '#efe9dc'),
    part(1, 'Roof', 'box', [0, 3.9, 0], [9, 1.8, 7], '#a6482f', { mesh: gableRoof }),
    part(2, 'Door', 'box', [0, 1.3, 3.05], [1, 2, 0.1], '#6b4423'),
    part(2, 'Door Knob', 'box', [0.35, 1.3, 3.1], [0.08, 0.08, 0.06], '#e6b422'),
    ...pair(2, 'Window Frame', 'box', 2.4, 1.95, 3.02, [1.5, 1.2, 0.08], '#fafafa'),
    ...pair(2, 'Window Glass', 'box', 2.4, 1.95, 3.04, [1.3, 1, 0.1], '#6ec1e4'),
    part(3, 'Chimney', 'box', [2.6, 4.4, -1.2], [0.8, 1.8, 0.8], '#9aa3ab'),
    part(3, 'Chimney Cap', 'box', [2.6, 5.36, -1.2], [0.95, 0.12, 0.95], '#2f3437'),
    part(4, 'Step', 'box', [0, 0.15, 3.5], [1.6, 0.3, 0.6], '#c9ced6'),
    part(4, 'Path', 'box', [0, 0.02, 5.05], [1.2, 0.04, 2.5], '#e3cf9a'),
    part(4, 'Lawn', 'box', [0, 0.01, 0.8], [14, 0.02, 12], '#7fb04f'),
  ],
};

const FOOTBALLER: AssetDef = {
  id: 'footballer',
  name: 'Football Player',
  tagline: 'A player in a red kit, with a ball',
  level: 'Medium',
  learn: ['Plan a character from the ground up', 'Use spheres for head and ball', 'Squash a sphere to make hair', 'Choose colors that read from far away'],
  steps: [
    { title: 'Boots and socks', text: 'Black boots first, then tall red socks on top of them. Starting at the feet makes it easy to keep every part on the right height.', tools: ['Shape: Box', 'Duplicate Ctrl+D', 'Color palette'] },
    { title: 'Legs and shorts', text: 'The thighs are short skin-colored Boxes above the socks. White shorts are one wide Box covering the hips. One shape instead of two keeps the triangle count low.', tools: ['Shape: Box', 'Size handles (R)'] },
    { title: 'Jersey', text: 'The torso is a red Box. A small white Box on the front stands in for the club crest or number. Strong color blocks are easy to read, even from far away.', tools: ['Color', 'Thin boxes make details'] },
    { title: 'Arms', text: 'Short red sleeves on top and skin-colored forearms below. Splitting an arm in two parts lets you use two colors without any textures.', tools: ['Duplicate Ctrl+D', 'Move (W)'] },
    { title: 'Head and hair', text: 'The head is a Sphere with 10 sides. The hair is another sphere squashed flat with the Size handles and set on top. Two tiny boxes are the eyes.', tools: ['Shape: Sphere', 'Sides slider', 'Squash with Size (R)'] },
    { title: 'The ball', text: 'The ball is a white Sphere resting on the ground next to the player. Keep it separate in Layers so you can move it on its own. Group the player parts and name them.', tools: ['Shape: Sphere', 'Rename in Layers', 'Group Ctrl+G'] },
  ],
  challenge: 'Make a second player for the other team: duplicate the whole group and recolor the jersey and socks.',
  parts: [
    ...pair(0, 'Boot', 'box', 0.12, 0.06, 0.04, [0.24, 0.12, 0.36], '#1e2125'),
    ...pair(0, 'Sock', 'box', 0.12, 0.32, 0, [0.16, 0.4, 0.18], '#d64545'),
    ...pair(1, 'Thigh', 'box', 0.12, 0.66, 0, [0.2, 0.28, 0.22], '#e0ac82'),
    part(1, 'Shorts', 'box', [0, 0.87, 0], [0.5, 0.3, 0.3], '#fafafa'),
    part(2, 'Jersey', 'box', [0, 1.32, 0], [0.54, 0.6, 0.3], '#d64545'),
    part(2, 'Crest', 'box', [0, 1.34, 0.16], [0.2, 0.22, 0.02], '#fafafa'),
    ...pair(3, 'Sleeve', 'box', 0.36, 1.52, 0, [0.15, 0.2, 0.17], '#d64545'),
    ...pair(3, 'Forearm', 'box', 0.36, 1.25, 0, [0.12, 0.34, 0.14], '#e0ac82'),
    part(4, 'Neck', 'box', [0, 1.66, 0], [0.12, 0.1, 0.12], '#e0ac82'),
    part(4, 'Head', 'sphere', [0, 1.8, 0], [0.28, 0.28, 0.28], '#e0ac82', { segments: 10 }),
    part(4, 'Hair', 'sphere', [0, 1.9, -0.01], [0.3, 0.14, 0.3], '#2f2a26', { segments: 10 }),
    ...pair(4, 'Eye', 'box', 0.06, 1.81, 0.135, [0.04, 0.04, 0.02], '#1e2125'),
    part(5, 'Ball', 'sphere', [0.55, 0.12, 0.5], [0.24, 0.24, 0.24], '#fafafa', { segments: 10 }),
  ],
};

export const ASSETS: AssetDef[] = [POLICE, CAR, HOUSE, FOOTBALLER];

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
    partStep.set(o.id, p.step);
    return o;
  });
  return { group, parts, partStep };
}

export function assetStats(def: AssetDef): { triangles: number; parts: number; height: number; width: number; depth: number } {
  const { parts } = instantiateAsset(def);
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  const D2R = Math.PI / 180;
  for (const o of parts) {
    // rotated parts: use the rotated half-extents so wheels count their real size
    const [rx, ry, rz] = o.rotation.map((d) => d * D2R);
    const hx = o.size[0] / 2;
    const hy = o.size[1] / 2;
    const hz = o.size[2] / 2;
    const ex = Math.abs(Math.cos(ry) * Math.cos(rz)) * hx + Math.abs(Math.sin(rz)) * hy + Math.abs(Math.sin(ry)) * hz;
    const ey = Math.abs(Math.sin(rz)) * hx + Math.abs(Math.cos(rx) * Math.cos(rz)) * hy + Math.abs(Math.sin(rx)) * hz;
    const ez = Math.abs(Math.sin(ry)) * hx + Math.abs(Math.sin(rx)) * hy + Math.abs(Math.cos(rx) * Math.cos(ry)) * hz;
    const e = [ex, ey, ez];
    min = min.map((m, i) => Math.min(m, o.position[i] - e[i]));
    max = max.map((m, i) => Math.max(m, o.position[i] + e[i]));
  }
  return {
    triangles: parts.reduce((a, o) => a + objectTriangles(o), 0),
    parts: parts.length,
    width: max[0] - min[0],
    height: max[1] - min[1],
    depth: max[2] - min[2],
  };
}
