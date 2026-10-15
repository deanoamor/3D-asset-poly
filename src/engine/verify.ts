import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ExportResult } from './exporter';

export interface VerifyResult {
  ok: boolean;
  triangles: number;
  size: [number, number, number];
  minY: number;
  messages: string[];
}

const near = (a: number, b: number, tol = 0.002) => Math.abs(a - b) <= tol;

/**
 * Self-test: open the generated file again the way an engine would and compare it with what the editor promised
 * (triangle count, size, origin at the bottom center).
 */
export async function verifyExport(res: ExportResult, skipSuffix?: string): Promise<VerifyResult> {
  const messages: string[] = [];
  const box = new THREE.Box3();
  let triangles = 0;
  let meshCount = 0;
  const addMesh = (m: THREE.Mesh) => {
    if (skipSuffix && m.name.endsWith(skipSuffix)) return;
    meshCount++;
    const g = m.geometry;
    triangles += g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
    box.union(new THREE.Box3().setFromObject(m));
  };

  try {
    if (res.model.kind === 'obj') {
      const text = res.model.data as string;
      const verts: THREE.Vector3[] = [];
      let faces = 0;
      for (const line of text.split('\n')) {
        if (line.startsWith('v ')) {
          const [, x, y, z] = line.split(' ');
          verts.push(new THREE.Vector3(+x, +y, +z));
        } else if (line.startsWith('f ')) faces++;
      }
      if (!verts.length) throw new Error('The OBJ has no vertices.');
      box.setFromPoints(verts);
      triangles = faces;
      meshCount = 1;
    } else {
      const data = res.model.data;
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) =>
        new GLTFLoader().parse(data, '', (g) => resolve(g as { scene: THREE.Group }), (e) => reject(e)),
      );
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          (o as THREE.Mesh).updateWorldMatrix(true, false);
          addMesh(o as THREE.Mesh);
        }
      });
    }
  } catch (e) {
    return { ok: false, triangles: 0, size: [0, 0, 0], minY: 0, messages: [`The file could not be opened again: ${(e as Error).message}`] };
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  let ok = meshCount > 0;
  if (!meshCount) messages.push('No meshes were found in the file.');
  if (!near(box.min.y, 0)) {
    ok = false;
    messages.push(`The model should stand on y = 0 but its lowest point is at ${box.min.y.toFixed(3)}.`);
  }
  if (!near(center.x, 0) || !near(center.z, 0)) {
    ok = false;
    messages.push('The pivot is not at the bottom center.');
  }
  if (Math.abs(size.x - res.size.x) > 0.005 || Math.abs(size.y - res.size.y) > 0.005 || Math.abs(size.z - res.size.z) > 0.005) {
    ok = false;
    messages.push('The size in the file differs from the size in the editor.');
  }
  if (Math.round(triangles) !== Math.round(res.triangles)) {
    ok = false;
    messages.push(`Triangle count changed: ${res.triangles} in the editor, ${triangles} in the file.`);
  }
  return { ok, triangles, size: [size.x, size.y, size.z], minY: box.min.y, messages };
}
