import * as THREE from 'three';
import type { Doc, Morph } from '../core/types';

/** The document with one expression fully applied (every part it lists takes that position / turn / size). */
export function docWithMorph(doc: Doc, m: Morph): Doc {
  return {
    ...doc,
    morphs: undefined,
    objects: doc.objects.map((o) => {
      const t = m.parts[o.id];
      return t ? { ...o, position: t.position ?? o.position, rotation: t.rotation ?? o.rotation, size: t.size ?? o.size } : o;
    }),
  };
}

const meshesOf = (root: THREE.Object3D, skip: (m: THREE.Mesh) => boolean): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !skip(m)) out.push(m);
  });
  return out;
};

/**
 * Turn the project's expressions into glTF morph targets. Each expression is built as its own model (same pipeline, same
 * placement); the difference of every point against the base model, measured in the base mesh's own space, is the target.
 * Returns the names that could be exported.
 */
export function addMorphTargets(base: THREE.Group, doc: Doc, buildVariant: (d: Doc) => THREE.Group, skip: (m: THREE.Mesh) => boolean = () => false): string[] {
  const morphs = doc.morphs ?? [];
  if (!morphs.length) return [];
  base.updateMatrixWorld(true);
  const baseMeshes = meshesOf(base, skip);
  const deltas: { name: string; perMesh: (Float32Array | null)[] }[] = [];
  const p = new THREE.Vector3();
  const inv = baseMeshes.map((m) => m.matrixWorld.clone().invert());
  for (const morph of morphs) {
    const variant = buildVariant(docWithMorph(doc, morph));
    variant.updateMatrixWorld(true);
    const vm = meshesOf(variant, skip);
    if (vm.length !== baseMeshes.length) continue;
    const perMesh: (Float32Array | null)[] = [];
    let any = false;
    baseMeshes.forEach((bm, i) => {
      const bp = bm.geometry.getAttribute('position');
      const vp = vm[i].geometry.getAttribute('position');
      if (bp.count !== vp.count) {
        perMesh.push(null);
        return;
      }
      const d = new Float32Array(bp.count * 3);
      let moved = false;
      for (let k = 0; k < bp.count; k++) {
        p.fromBufferAttribute(vp, k).applyMatrix4(vm[i].matrixWorld).applyMatrix4(inv[i]);
        const dx = p.x - bp.getX(k);
        const dy = p.y - bp.getY(k);
        const dz = p.z - bp.getZ(k);
        d[k * 3] = dx;
        d[k * 3 + 1] = dy;
        d[k * 3 + 2] = dz;
        if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6 || Math.abs(dz) > 1e-6) moved = true;
      }
      perMesh.push(moved ? d : null);
      any ||= moved;
    });
    if (any) deltas.push({ name: morph.name, perMesh });
  }
  // a mesh gets every target that moves it (and a zero target for the others, so all of its targets line up by name)
  const used: string[] = [];
  baseMeshes.forEach((m, i) => {
    const mine = deltas.filter((d) => d.perMesh[i]);
    if (!mine.length) return;
    m.geometry = m.geometry.clone(); // geometry is shared between shapes of the same kind
    const names: string[] = [];
    const dict: Record<string, number> = {};
    m.geometry.morphAttributes.position = mine.map((d, j) => {
      let name = d.name;
      for (let n = 2; name in dict; n++) name = `${d.name} ${n}`;
      dict[name] = j;
      names.push(name);
      return new THREE.BufferAttribute(d.perMesh[i]!, 3);
    });
    m.geometry.morphTargetsRelative = true;
    m.morphTargetDictionary = dict;
    m.morphTargetInfluences = names.map(() => 0);
    used.push(...names);
  });
  return [...new Set(used)];
}
