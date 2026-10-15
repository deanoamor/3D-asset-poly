import * as THREE from 'three';
import { slug } from './slug';

export interface ObjResult {
  obj: string;
  mtl: string;
  triangles: number;
}

const hexKey = (c: THREE.Color) => c.getHexString();

/** Wavefront OBJ + MTL from a three.js hierarchy. Positions are baked into world space (Y up, metres). */
export function writeObj(root: THREE.Object3D, name: string): ObjResult {
  root.updateMatrixWorld(true);
  const lines: string[] = [`# ${name}`, `mtllib ${slug(name)}.mtl`];
  const mats = new Map<string, string>();
  let vBase = 1;
  let nBase = 1;
  let triangles = 0;
  const v = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    const index = geo.index;
    const material = mesh.material as THREE.MeshStandardMaterial;
    const key = hexKey(material.color);
    if (!mats.has(key)) mats.set(key, `color_${key}`);
    lines.push(`o ${o.name.replace(/\s+/g, '_') || 'part'}`, `usemtl ${mats.get(key)}`);
    nm.getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      lines.push(`v ${+v.x.toFixed(6)} ${+v.y.toFixed(6)} ${+v.z.toFixed(6)}`);
    }
    for (let i = 0; i < nor.count; i++) {
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      lines.push(`vn ${+v.x.toFixed(5)} ${+v.y.toFixed(5)} ${+v.z.toFixed(5)}`);
    }
    const count = index ? index.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const f = [0, 1, 2].map((k) => {
        const idx = index ? index.getX(i + k) : i + k;
        return `${vBase + idx}//${nBase + idx}`;
      });
      lines.push(`f ${f.join(' ')}`);
      triangles++;
    }
    vBase += pos.count;
    nBase += nor.count;
  });
  const mtl = [`# ${name}`];
  for (const [key, id] of mats) {
    // OBJ colors are plain numbers: the same sRGB values the editor shows
    const rgb = [0, 2, 4].map((i) => +(parseInt(key.slice(i, i + 2), 16) / 255).toFixed(4)).join(' ');
    mtl.push(`newmtl ${id}`, `Ka 0 0 0`, `Kd ${rgb}`, `Ks 0 0 0`, 'Ns 10', 'd 1', 'illum 1', '');
  }
  return { obj: lines.join('\n') + '\n', mtl: mtl.join('\n') + '\n', triangles };
}
