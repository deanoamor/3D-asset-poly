import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Doc } from '../core/types';
import { PRESETS } from '../core/presets';
import { buildExportScene } from './sceneBuild';

export type ExportFormat = 'glb' | 'gltf';

export interface ExportResult {
  blob: Blob;
  filename: string;
  size: THREE.Vector3;
}

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'prop'
  );
}

/** Wrap everything in a root whose origin is the bottom center of the model, scaled for the preset. */
export function prepareExport(doc: Doc): { root: THREE.Group; size: THREE.Vector3 } {
  const preset = PRESETS[doc.enginePreset];
  const content = buildExportScene(doc, doc.name);
  content.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(content);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const root = new THREE.Group();
  root.name = doc.name;
  // pivot: bottom-center
  content.position.set(-center.x, -box.min.y, -center.z);
  content.name = 'Model';
  root.add(content);
  root.scale.setScalar(preset.scale);
  root.updateMatrixWorld(true);
  return { root, size: size.multiplyScalar(preset.scale) };
}

export async function exportGltf(doc: Doc, format: ExportFormat): Promise<ExportResult> {
  const { root, size } = prepareExport(doc);
  const exporter = new GLTFExporter();
  const out = await exporter.parseAsync(root, { binary: format === 'glb', onlyVisible: true, trs: false });
  const blob =
    out instanceof ArrayBuffer
      ? new Blob([out], { type: 'model/gltf-binary' })
      : new Blob([JSON.stringify(out)], { type: 'model/gltf+json' });
  return { blob, filename: `${slug(doc.name)}.${format}`, size };
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
