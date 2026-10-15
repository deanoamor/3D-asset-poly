import type { EnginePreset } from './types';

export type ExportFormat = 'glb' | 'gltf' | 'obj' | 'package';

export interface FormatInfo {
  id: ExportFormat;
  label: string;
  hint: string;
}

export type TargetGroup = 'engine' | 'software';

export const GROUPS: { id: TargetGroup; label: string }[] = [
  { id: 'engine', label: 'Game engine' },
  { id: 'software', label: '3D software' },
];

export interface PresetInfo {
  id: EnginePreset;
  group: TargetGroup;
  label: string;
  /** Multiply the model by this when exporting. glTF and OBJ here are both in metres. */
  scale: number;
  formats: FormatInfo[];
  /** Short note under the engine cards. */
  note: string;
  /** Collision shortcut this engine understands in a file, if any. */
  collision?: { label: string; hint: string; nodeSuffix: string };
}

const GLB: FormatInfo = { id: 'glb', label: 'glTF Binary (.glb)', hint: 'One file, colors included.' };
const GLTF: FormatInfo = { id: 'gltf', label: 'glTF (.gltf, JSON)', hint: 'Readable JSON with the data embedded.' };
const OBJ: FormatInfo = { id: 'obj', label: 'OBJ + MTL (.zip)', hint: 'Plain mesh and colors. Needs no plugin in Unity.' };
const PACKAGE: FormatInfo = { id: 'package', label: 'Package (.zip with import guide)', hint: 'Model file plus step-by-step import instructions for this engine.' };

/**
 * glTF 2.0 and the OBJ we write are Y-up and 1 unit = 1 metre. Engines convert axes on import.
 * What differs per engine is which formats import without extra setup and the collision conventions.
 */
export const PRESETS: Record<EnginePreset, PresetInfo> = {
  unity: {
    id: 'unity',
    group: 'engine',
    label: 'Unity',
    scale: 1,
    formats: [GLB, OBJ, PACKAGE],
    note: 'Unity reads .glb through the glTFast package. If you would rather not install it, use OBJ + MTL, which Unity imports natively.',
  },
  godot: {
    id: 'godot',
    group: 'engine',
    label: 'Godot',
    scale: 1,
    formats: [GLB, PACKAGE],
    note: 'Godot 4 imports .glb natively. Drop it into your project and it becomes a scene.',
    collision: {
      label: 'Add a collision box',
      hint: 'Adds a hidden box named "…-convcolonly". Godot turns it into a convex collision shape and removes it from the visible mesh.',
      nodeSuffix: '-convcolonly',
    },
  },
  unreal: {
    id: 'unreal',
    group: 'engine',
    label: 'Unreal',
    scale: 1,
    formats: [GLB, PACKAGE],
    note: 'Unreal imports .glb with its glTF importer (enable the glTF Importer or Interchange plugin). Add collision in the Static Mesh Editor.',
  },
  blender: {
    id: 'blender',
    group: 'software',
    label: 'Blender',
    scale: 1,
    formats: [GLB, OBJ, PACKAGE],
    note: 'Blender imports .glb natively and keeps colors, names and vertex colors. OBJ works too but only carries the base colors.',
  },
  c4d: {
    id: 'c4d',
    group: 'software',
    label: 'Cinema 4D',
    scale: 1,
    formats: [OBJ, GLB, PACKAGE],
    note: 'OBJ opens in every Cinema 4D version. Recent versions (2023 and later) also open .glb. Cinema 4D works in centimetres, so the guide shows how to scale.',
  },
  maya: {
    id: 'maya',
    group: 'software',
    label: 'Maya / 3ds Max',
    scale: 1,
    formats: [OBJ, GLB, PACKAGE],
    note: 'OBJ imports in Maya, 3ds Max, ZBrush, Modo and most other 3D software. Newer versions also read .glb.',
  },
  construct: {
    id: 'construct',
    group: 'engine',
    label: 'Construct 3',
    scale: 1,
    formats: [GLB, GLTF, PACKAGE],
    note: 'Construct 3 has an official 3D Model object that loads glTF. Use .glb (everything in one file): drag it into the Layout or import it into the 3D Models folder.',
  },
  web: {
    id: 'web',
    group: 'engine',
    label: 'Web',
    scale: 1,
    formats: [GLB, GLTF, PACKAGE],
    note: 'Works with three.js, Babylon.js, model-viewer and PlayCanvas through their glTF loaders.',
  },
};

/** Packages for these apps also carry an OBJ so the model opens without any plugin. */
export function packsObj(engine: EnginePreset): boolean {
  return PRESETS[engine].formats.some((f) => f.id === 'obj');
}

export function defaultFormat(engine: EnginePreset): ExportFormat {
  return PRESETS[engine].formats[0].id;
}

/** Plain-text import steps written into the package. Kept short and factual. */
export function importGuide(engine: EnginePreset, o: { modelName: string; hasObj: boolean; collision: boolean; sizeText: string; tris: number }): string {
  const head = `${PRESETS[engine].label} import guide\n${'='.repeat(24)}\n\nModel: ${o.modelName}\nSize: ${o.sizeText}\nTriangles: ${o.tris}\nUnits: 1 unit = 1 metre. Pivot: bottom center (the model stands on y = 0).\n\n`;
  const steps: Record<EnginePreset, string> = {
    unity: `Option A: glTF (.glb)
1. Open Window > Package Manager > "+" > Add package by name.
2. Enter: com.unity.cloud.gltfast
3. Drag ${o.modelName}.glb into your Assets folder.
4. Drag the imported asset into a scene.
${o.hasObj ? `\nOption B: OBJ (no package needed)
1. Unzip the "obj" folder.
2. Drag the .obj and the .mtl together into your Assets folder.
3. If the colors look wrong, select the model, open the Materials tab and click Extract Materials.
` : ''}
Collision: add a Box Collider or Mesh Collider component to the object.
`,
    godot: `1. Drag ${o.modelName}.glb into the FileSystem dock of a Godot 4 project.
2. Double-click it to open it as an inherited scene, or drag it into your scene.
${o.collision ? `3. A collision shape is created from the node ending in "-convcolonly" when Godot imports the file.\n   It is a box that wraps the whole model. Open the imported scene to check it.\n` : '3. For collision, open the Advanced Import Settings and use Physics > Generate, or add a CollisionShape3D yourself.\n'}`,
    unreal: `1. Enable the glTF Importer plugin (or Interchange) in Edit > Plugins and restart.
2. In the Content Browser choose Import and pick ${o.modelName}.glb.
3. Open the new Static Mesh and compare its size with the numbers above.
4. Collision: in the Static Mesh Editor use Collision > Add Box Simplified Collision.
`,
    blender: `Option A: glTF (recommended)
1. File > Import > glTF 2.0 (.glb/.gltf) and pick ${o.modelName}.glb.
2. Switch the viewport to Material Preview (press Z, then pick it, or click the second-to-last sphere icon at the top right of the viewport). The default Solid mode shows every imported material in grey; it is a Blender display setting, not a problem with the file.
   In Solid mode you can also set Shading > Color to Material or Attribute.
3. Smooth/painted colors are stored as vertex colors (COLOR_0). In the material, add a Color Attribute node into Base Color to see them.
${o.hasObj ? `\nOption B: OBJ\n1. File > Import > Wavefront (.obj) and pick the .obj in the "obj" folder (keep the .mtl next to it).\n2. Only base colors are carried, not the painted variation.\n` : ''}
Scale: 1 unit = 1 metre, Y up. Blender converts to Z up on import.
`,
    c4d: `Option A: OBJ (every version)
1. File > Merge (or Open) and pick the .obj in the "obj" folder. Keep the .mtl next to it.
2. In the import dialog set the scale to Meters, or scale the model 100x if it looks tiny (Cinema 4D defaults to centimetres).
3. Each part is a separate object with its own material.
${o.hasObj ? '' : ''}
Option B: glTF (Cinema 4D 2023 and later)
1. File > Merge and pick ${o.modelName}.glb.
2. Vertex colors may need a Vertex Color tag/shader to be visible.

Pivot: bottom center. Y up, same as Cinema 4D.
`,
    maya: `Maya:
1. File > Import and pick the .obj in the "obj" folder (keep the .mtl beside it). Set Units to metres in Preferences if the size is off.
2. Newer Maya versions can import .glb through the glTF plugin.

3ds Max:
1. File > Import and pick the .obj. In the import dialog keep "Convert units" on, and set the model unit to metres.
2. Max uses Z up: rotate 90 degrees on X if the model lies on its back.

ZBrush / Modo / others: import the .obj. Colors come from the .mtl as materials.
`,
    construct: `Construct 3 (3D Model object):
1. In the Project Bar, right-click the "3D Models" folder and choose Import > From file, then pick ${o.modelName}.glb.
   (You can also drag the .glb into the Layout View.) A .glb holds everything in one file, so "From file" is the right choice.
2. Add a 3D Model object to your layout and choose this model in its properties.
3. Size: the model is in metres (1 unit = 1 metre), but Construct measures in pixels. Use the Scale property (or the object's width/height/depth) until it looks right, for example 100 for 1 m.
4. Pivot: the origin is at the bottom center, so Y = 0 is the floor.
5. Collision: a 3D Model object has no collision of its own. Add a Solid behavior or use a simple 2D/3D Shape object for the hitbox.
Requires a Construct version that has the 3D Model object (recent releases). If your version does not show it, use the 3D Object add-on with the .glb.
`,
    web: `three.js:
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  new GLTFLoader().load('${o.modelName}.glb', (gltf) => scene.add(gltf.scene));

<model-viewer> (Google):
  <model-viewer src="${o.modelName}.glb" camera-controls></model-viewer>
`,
  };
  return head + steps[engine] + '\nIf something does not import as described, check the engine version and its glTF/OBJ importer settings.\n';
}
