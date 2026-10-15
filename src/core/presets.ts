import type { EnginePreset } from './types';

export interface PresetInfo {
  id: EnginePreset;
  label: string;
  /** Multiply model by this when exporting (glTF is metres; all supported importers read metres). */
  scale: number;
  pivot: 'bottom-center';
  note: string;
}

/**
 * glTF 2.0 is Y-up, right-handed, 1 unit = 1 metre. Unity, Godot and Unreal all convert on import,
 * so the presets share the same geometry and differ in the guidance we show.
 */
export const PRESETS: Record<EnginePreset, PresetInfo> = {
  unity: {
    id: 'unity',
    label: 'Unity',
    scale: 1,
    pivot: 'bottom-center',
    note: 'Drop the .glb into Assets. Needs the glTFast package (com.unity.cloud.gltfast). 1 unit = 1 m.',
  },
  godot: {
    id: 'godot',
    label: 'Godot',
    scale: 1,
    pivot: 'bottom-center',
    note: 'Drop the .glb into your project; Godot 4 imports glTF natively. 1 unit = 1 m.',
  },
  unreal: {
    id: 'unreal',
    label: 'Unreal',
    scale: 1,
    pivot: 'bottom-center',
    note: 'Import with the glTF Importer / Interchange plugin; Unreal converts metres to centimetres for you.',
  },
  web: {
    id: 'web',
    label: 'Web',
    scale: 1,
    pivot: 'bottom-center',
    note: 'Works with three.js, Babylon.js, model-viewer and PlayCanvas via GLTFLoader. 1 unit = 1 m.',
  },
};
