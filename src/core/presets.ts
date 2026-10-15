import type { EnginePreset } from './types';

export type ExportFormat = 'glb' | 'gltf' | 'obj' | 'package';

export interface FormatInfo {
  id: ExportFormat;
  label: string;
  hint: string;
}

export interface PresetInfo {
  id: EnginePreset;
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
    label: 'Unity',
    scale: 1,
    formats: [GLB, OBJ, PACKAGE],
    note: 'Unity reads .glb through the glTFast package. If you would rather not install it, use OBJ + MTL, which Unity imports natively.',
  },
  godot: {
    id: 'godot',
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
    label: 'Unreal',
    scale: 1,
    formats: [GLB, PACKAGE],
    note: 'Unreal imports .glb with its glTF importer (enable the glTF Importer or Interchange plugin). Add collision in the Static Mesh Editor.',
  },
  web: {
    id: 'web',
    label: 'Web',
    scale: 1,
    formats: [GLB, GLTF, PACKAGE],
    note: 'Works with three.js, Babylon.js, model-viewer and PlayCanvas through their glTF loaders.',
  },
};

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
    web: `three.js:
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  new GLTFLoader().load('${o.modelName}.glb', (gltf) => scene.add(gltf.scene));

<model-viewer> (Google):
  <model-viewer src="${o.modelName}.glb" camera-controls></model-viewer>
`,
  };
  return head + steps[engine] + '\nIf something does not import as described, check the engine version and its glTF/OBJ importer settings.\n';
}
