import * as THREE from 'three';
import type { Doc, Joint } from '../core/types';
import { descendantIds } from '../core/docmath';
import { skinWeights } from '../core/skin';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeVertexColors } from './bakeColor';

/** Pieces smaller than this (metres, longest side) follow a single joint; bigger ones bend with the skeleton. */
const RIGID_SIZE = 0.3;

/**
 * Turn the project's joints into a real skeleton for the export. Every shape that belongs to a rigged character becomes
 * a skinned mesh with automatic weights; the joints become Bone nodes under an "Armature" node. Meshes are baked into
 * world space (the glTF rule for skinned meshes), so they sit at the root of the file.
 */
export function attachSkeletons(doc: Doc, root: THREE.Group, nodes: Map<string, THREE.Object3D>): void {
  if (!doc.rig?.length) return;
  const owners = new Map<string | undefined, Joint[]>();
  for (const j of doc.rig) owners.set(j.owner, [...(owners.get(j.owner) ?? []), j]);
  root.updateMatrixWorld(true);

  const claimed = new Set<string>();
  const named = [...owners.entries()].sort((a, b) => (a[0] === undefined ? 1 : 0) - (b[0] === undefined ? 1 : 0)); // owned rigs first, the shared one takes the rest
  for (const [owner, joints] of named) {
    const ownerObj = owner ? doc.objects.find((o) => o.id === owner) : undefined;
    if (owner && !ownerObj) continue;
    const ids = owner ? new Set([owner, ...descendantIds(doc, owner)]) : new Set(doc.objects.map((o) => o.id));
    const shapes = doc.objects.filter((o) => o.kind === 'shape' && ids.has(o.id) && !claimed.has(o.id) && nodes.has(o.id));
    if (!shapes.length) continue;

    // bones: joints with positions relative to their parent (rest pose = no rotation)
    const bones = new Map<string, THREE.Bone>();
    for (const j of joints) {
      const b = new THREE.Bone();
      b.name = j.name;
      bones.set(j.id, b);
    }
    const armature = new THREE.Group();
    armature.name = ownerObj ? `${ownerObj.name} Armature` : 'Armature';
    const at = new Map(joints.map((j) => [j.id, j]));
    for (const j of joints) {
      const b = bones.get(j.id)!;
      const parent = j.parent ? at.get(j.parent) : undefined;
      if (parent) {
        b.position.set(j.pos[0] - parent.pos[0], j.pos[1] - parent.pos[1], j.pos[2] - parent.pos[2]);
        bones.get(parent.id)!.add(b);
      } else {
        b.position.set(...j.pos);
        armature.add(b);
      }
    }
    root.add(armature);
    armature.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton([...bones.values()]);

    // every part is skinned, then parts of the same material are merged: ONE skinned mesh per character,
    // so the file holds a single skin (what Blender and game engines expect for a character)
    const baked = new Map<string, THREE.MeshStandardMaterial>();
    const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const o of shapes) {
      claimed.add(o.id);
      const node = nodes.get(o.id)!;
      const meshes: THREE.Mesh[] = [];
      node.traverse((c) => (c as THREE.Mesh).isMesh && meshes.push(c as THREE.Mesh));
      for (const m of meshes) {
        let geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        geo.applyMatrix4(m.matrixWorld);
        geo.computeBoundingBox();
        const size = geo.boundingBox!.getSize(new THREE.Vector3());
        const skin = skinWeights(geo.getAttribute('position').array, joints, Math.max(size.x, size.y, size.z) < RIGID_SIZE);
        geo.setAttribute('skinIndex', new THREE.BufferAttribute(skin.index, 4));
        geo.setAttribute('skinWeight', new THREE.BufferAttribute(skin.weight, 4));
        const r = bakeVertexColors(geo, m.material as THREE.MeshStandardMaterial, baked);
        geo = r.geometry;
        for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'color', 'skinIndex', 'skinWeight'].includes(name)) geo.deleteAttribute(name);
        byMaterial.set(r.material, [...(byMaterial.get(r.material) ?? []), geo]);
      }
      node.removeFromParent();
    }
    // parts that share a material must carry the same attributes to be merged, and so must the groups themselves
    const prepared = [...byMaterial.entries()].map(([mat, list]) => {
      const tinted = list.some((g) => g.getAttribute('color'));
      for (const g of list) {
        if (!g.getAttribute('normal')) g.computeVertexNormals();
        if (tinted && !g.getAttribute('color')) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3).fill(1), 3));
        if (!tinted && g.getAttribute('color')) g.deleteAttribute('color');
      }
      return { mat, geo: mergeGeometries(list, false)! };
    });
    if (prepared.some((p) => p.geo.getAttribute('color'))) {
      for (const p of prepared) {
        if (!p.geo.getAttribute('color')) p.geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.geo.getAttribute('position').count * 3).fill(1), 3));
      }
    }
    const materials = prepared.map((p) => p.mat);
    const merged = mergeGeometries(prepared.map((p) => p.geo), true);
    if (merged) {
      const sm = new THREE.SkinnedMesh(merged, materials);
      sm.name = ownerObj ? ownerObj.name : 'Skinned Model';
      root.add(sm);
      sm.bind(skeleton, new THREE.Matrix4());
    }
    // the character's group is now empty: drop it (and any sub-groups) from the file
    if (ownerObj) for (const id of ids) {
      const n = nodes.get(id);
      if (n && !(n as THREE.Mesh).isMesh && !n.children.length) n.removeFromParent();
    }
    if (ownerObj) nodes.get(owner!)?.removeFromParent();
  }
}

/**
 * After the model has been moved so it stands on the floor: bake that move into each skinned mesh (glTF ignores a
 * skinned mesh's own transform), put them at the root, and recompute the bind pose from the final bone positions.
 */
export function settleSkins(root: THREE.Group): void {
  root.updateMatrixWorld(true);
  const skins: THREE.SkinnedMesh[] = [];
  root.traverse((o) => (o as THREE.SkinnedMesh).isSkinnedMesh && skins.push(o as THREE.SkinnedMesh));
  const done = new Set<THREE.Skeleton>();
  for (const sm of skins) {
    sm.geometry.applyMatrix4(sm.matrixWorld);
    sm.geometry.computeBoundingBox();
    sm.geometry.computeBoundingSphere();
    if (sm.parent !== root) root.add(sm);
    sm.position.set(0, 0, 0);
    sm.rotation.set(0, 0, 0);
    sm.scale.set(1, 1, 1);
  }
  root.updateMatrixWorld(true);
  for (const sm of skins) {
    if (!done.has(sm.skeleton)) {
      sm.skeleton.calculateInverses();
      done.add(sm.skeleton);
    }
    sm.bind(sm.skeleton, new THREE.Matrix4());
  }
}
