import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Doc } from '../core/types';
import { PRESETS, importGuide, packsObj, type ExportFormat } from '../core/presets';
import { writeObj } from './objExport';
import { slug } from './slug';
import { buildExportScene } from './sceneBuild';
import { zipFiles, zipSingle } from '../core/zip';

export type { ExportFormat };
export { slug };

export interface ExportOptions {
  format: ExportFormat;
  collision: boolean;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  size: THREE.Vector3;
  triangles: number;
  /** The model file inside the result, for the self-test. */
  model: { kind: 'glb' | 'gltf' | 'obj'; data: ArrayBuffer | string };
  /** Names of every file in the download (zip contents or the single file). */
  contents: string[];
}

/** Wrap everything in a root whose origin is the bottom center of the model, scaled for the preset. */
export function prepareExport(doc: Doc, collision = false): { root: THREE.Group; size: THREE.Vector3 } {
  const preset = PRESETS[doc.enginePreset];
  const content = buildExportScene(doc, doc.name);
  content.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(content);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const root = new THREE.Group();
  root.name = doc.name;
  // pivot: bottom center
  content.position.set(-center.x, -box.min.y, -center.z);
  content.name = 'Model';
  root.add(content);
  if (collision && preset.collision) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    hull.name = `${slug(doc.name)}${preset.collision.nodeSuffix}`;
    hull.position.set(0, size.y / 2, 0);
    root.add(hull);
  }
  root.scale.setScalar(preset.scale);
  root.updateMatrixWorld(true);
  return { root, size: size.multiplyScalar(preset.scale) };
}

function triangleTotal(root: THREE.Object3D, skip: (n: THREE.Object3D) => boolean): number {
  let t = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || skip(o)) return;
    const g = m.geometry;
    t += g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
  });
  return t;
}

export async function exportFiles(doc: Doc, opts: ExportOptions): Promise<ExportResult> {
  const name = slug(doc.name);
  const preset = PRESETS[doc.enginePreset];
  const collision = opts.collision && !!preset.collision;
  const { root, size } = prepareExport(doc, collision);
  const triangles = triangleTotal(root, (o) => collision && !!preset.collision && o.name.endsWith(preset.collision.nodeSuffix));
  const sizeText = `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} m`;
  const exporter = new GLTFExporter();

  const glb = async () => (await exporter.parseAsync(root, { binary: true, onlyVisible: true, trs: false })) as ArrayBuffer;

  if (opts.format === 'glb') {
    const data = await glb();
    return { blob: new Blob([data], { type: 'model/gltf-binary' }), filename: `${name}.glb`, size, triangles, model: { kind: 'glb', data }, contents: [`${name}.glb`] };
  }
  if (opts.format === 'gltf') {
    const json = JSON.stringify(await exporter.parseAsync(root, { binary: false, onlyVisible: true, trs: false }));
    return { blob: new Blob([json], { type: 'model/gltf+json' }), filename: `${name}.gltf`, size, triangles, model: { kind: 'gltf', data: json }, contents: [`${name}.gltf`] };
  }
  if (opts.format === 'obj') {
    const { obj, mtl } = writeObj(root, doc.name);
    const entries = [{ name: `${name}.obj`, data: obj }, { name: `${name}.mtl`, data: mtl }];
    return { blob: new Blob([zipFiles(entries)], { type: 'application/zip' }), filename: `${name}_obj.zip`, size, triangles, model: { kind: 'obj', data: obj }, contents: entries.map((e) => e.name) };
  }
  // package: model + import guide (Unity also gets OBJ so it works without a plugin)
  const data = await glb();
  const entries: { name: string; data: Uint8Array | string }[] = [{ name: `${name}.glb`, data: new Uint8Array(data) }];
  const hasObj = packsObj(doc.enginePreset);
  if (hasObj) {
    const { obj, mtl } = writeObj(root, doc.name);
    entries.push({ name: `obj/${name}.obj`, data: obj }, { name: `obj/${name}.mtl`, data: mtl });
  }
  entries.push({ name: `IMPORT_${preset.label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}.txt`, data: importGuide(doc.enginePreset, { modelName: name, hasObj, collision, sizeText, tris: triangles }) });
  return {
    blob: new Blob([zipFiles(entries)], { type: 'application/zip' }),
    filename: `${name}_${doc.enginePreset}.zip`,
    size,
    triangles,
    model: { kind: 'glb', data },
    contents: entries.map((e) => e.name),
  };
}

type DownloadsApi = { save(req: { filename: string; data: Blob | string }): Promise<{ status: string }> };

/** Extensions the artifact host will save directly; others (.glb, .gltf) get wrapped in a .zip. */
const HOST_OK = /\.(json|txt|md|csv|zip|png|jpg|jpeg|webp|gif|svg|html|pdf)$/i;

async function hostDownloads(): Promise<DownloadsApi | null> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return null;
  try {
    return ((await c.use('downloads')) as DownloadsApi | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Save a file. Inside a claude.ai artifact the page may not start downloads itself, so it asks the host
 * (the viewer confirms). Returns the saved file name, or null if the viewer declined.
 */
export async function download(blob: Blob, filename: string): Promise<string | null> {
  const host = await hostDownloads();
  if (host) {
    let name = filename;
    let data: Blob = blob;
    if (!HOST_OK.test(filename)) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      data = new Blob([zipSingle(filename, bytes)], { type: 'application/zip' });
      name = filename.replace(/\.[^.]+$/, '') + '.zip';
    }
    try {
      await host.save({ filename: name, data });
      return name;
    } catch (e) {
      if ((e as { code?: string }).code === 'declined') return null;
      throw new Error((e as { message?: string }).message ?? 'The download was blocked.');
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}
