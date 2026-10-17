import { ensureImages } from './textures';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Doc } from '../core/types';
import { bakeVertexColors } from './bakeColor';
import { spinClip } from './spinExport';
import { animationClips, settleSkins } from './rigExport';
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
  /** Include the skeleton (default). Off: parts stay separate and named, with no joints. */
  skeleton?: boolean;
  /** Bake the pose into the file (default). Off: the character is exported at rest. */
  pose?: boolean;
  /** Include the animation clips (default). The character is then exported at rest, with the clips turning its bones. */
  animations?: boolean;
  /** Pack the GLB with meshopt for smaller downloads (GLB and package only). */
  compress?: boolean;
  /** Put every colour and picture into one texture, so the model needs a single material. */
  atlas?: boolean;
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
  /** Meshes (≈ draw calls) and distinct materials in the exported model. */
  drawCalls: number;
  materials: number;
}

function bakeBaseColors(content: THREE.Object3D): void {
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  content.traverse((o) => {
    const m = o as THREE.Mesh;
    const mat = m.material as THREE.MeshStandardMaterial | undefined;
    if (!m.isMesh || !mat || Array.isArray(mat)) return;
    const r = bakeVertexColors(m.geometry, mat, mats);
    m.geometry = r.geometry;
    m.material = r.material;
  });
}

/** Wrap everything in a root whose origin is the bottom center of the model, scaled for the preset. */
export function prepareExport(doc: Doc, collision = false, atlas = false): { root: THREE.Group; size: THREE.Vector3 } {
  const preset = PRESETS[doc.enginePreset];
  const content = buildExportScene(doc, doc.name, { atlas });
  bakeBaseColors(content);
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
  settleSkins(root);
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

/** The project as it goes into the file: without its skeleton when the option is off. */
export function docForExport(doc: Doc, skeleton = true, pose = true): Doc {
  if (skeleton === false && doc.rig) return { ...doc, rig: undefined, pose: undefined };
  return pose === false && doc.pose ? { ...doc, pose: undefined } : doc;
}

export async function exportFiles(doc: Doc, opts: ExportOptions): Promise<ExportResult> {
  const name = slug(doc.name);
  const preset = PRESETS[doc.enginePreset];
  const collision = opts.collision && !!preset.collision;
  const withAnims = opts.animations !== false && opts.skeleton !== false && !!doc.anims?.length && !!doc.rig?.length;
  const exportDoc = docForExport(doc, opts.skeleton, withAnims ? false : opts.pose);
  await ensureImages(exportDoc); // pictures must be decoded before they can go into the file
  const { root, size } = prepareExport(exportDoc, collision, !!opts.atlas && opts.format !== 'obj');
  const triangles = triangleTotal(root, (o) => collision && !!preset.collision && o.name.endsWith(preset.collision.nodeSuffix));
  let drawCalls = 0;
  const matSet = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && o.visible) {
      drawCalls++;
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => matSet.add(x));
    }
  });
  const materials = matSet.size;
  const sizeText = `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} m`;
  const exporter = new GLTFExporter();

  // glTF wants a skinned mesh at the top level of the scene, so for the file it sits beside the root, not inside it
  const parse = async (binary: boolean) => {
    const skins: THREE.Object3D[] = [];
    root.traverse((o) => (o as THREE.SkinnedMesh).isSkinnedMesh && skins.push(o));
    skins.forEach((o) => o.removeFromParent());
    try {
      const spin = spinClip(root);
      const clips = [...(withAnims ? animationClips(root, exportDoc) : []), ...(spin ? [spin] : [])];
      // animated nodes must carry position / rotation / scale, not a matrix
      return await exporter.parseAsync(skins.length ? [root, ...skins] : root, { binary, onlyVisible: true, trs: clips.length > 0, ...(clips.length ? { animations: skins.length ? [clips, ...skins.map(() => [])] : clips } : {}) });
    } finally {
      skins.forEach((o) => root.add(o));
    }
  };
  const glb = async () => {
    const raw = (await parse(true)) as ArrayBuffer;
    if (!opts.compress) return raw;
    const { compressGlb } = await import('./compress');
    return compressGlb(raw);
  };

  if (opts.format === 'glb') {
    const data = await glb();
    return { blob: new Blob([data], { type: 'model/gltf-binary' }), filename: `${name}.glb`, size, triangles, drawCalls, materials, model: { kind: 'glb', data }, contents: [`${name}.glb`] };
  }
  if (opts.format === 'gltf') {
    const json = JSON.stringify(await parse(false));
    return { blob: new Blob([json], { type: 'model/gltf+json' }), filename: `${name}.gltf`, size, triangles, drawCalls, materials, model: { kind: 'gltf', data: json }, contents: [`${name}.gltf`] };
  }
  if (opts.format === 'obj') {
    const { obj, mtl } = writeObj(root, doc.name);
    const entries = [{ name: `${name}.obj`, data: obj }, { name: `${name}.mtl`, data: mtl }];
    return { blob: new Blob([zipFiles(entries)], { type: 'application/zip' }), filename: `${name}_obj.zip`, size, triangles, drawCalls, materials, model: { kind: 'obj', data: obj }, contents: entries.map((e) => e.name) };
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
    drawCalls,
    materials,
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
