import * as THREE from 'three';
import type { Doc, Joint } from '../core/types';
import { descendantIds } from '../core/docmath';
import { skinWeights } from '../core/skin';
import { quatOf, samplePose, sampleRoot, clipKeys } from '../core/anim';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeVertexColors } from './bakeColor';

/** Pieces smaller than this (metres, longest side) follow a single joint; bigger ones bend with the skeleton. */
const RIGID_SIZE = 0.3;

/**
 * Turn the project's joints into a real skeleton for the export. Every shape that belongs to a rigged character becomes
 * a skinned mesh with automatic weights; the joints become Bone nodes under an "Armature" node. Meshes are baked into
 * world space (the glTF rule for skinned meshes), so they sit at the root of the file.
 */
export function attachSkeletons(doc: Doc, root: THREE.Group, nodes: Map<string, THREE.Object3D>, opts: { bakePose?: boolean } = {}): void {
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
      b.userData.jointId = j.id;
      bones.set(j.id, b);
    }
    const armature = new THREE.Group();
    armature.name = ownerObj ? `${ownerObj.name} Armature` : 'Armature';
    const at = new Map(joints.map((j) => [j.id, j]));
    // the skeleton stands the way the character stands: its rest orientation is the group's own, so "forward" is the character's forward
    const q0 = new THREE.Quaternion();
    if (owner) nodes.get(owner)?.getWorldQuaternion(q0);
    const q0inv = q0.clone().invert();
    for (const j of joints) {
      const b = bones.get(j.id)!;
      const parent = j.parent ? at.get(j.parent) : undefined;
      if (parent) {
        b.position.set(j.pos[0] - parent.pos[0], j.pos[1] - parent.pos[1], j.pos[2] - parent.pos[2]).applyQuaternion(q0inv);
        b.userData.rest = new THREE.Quaternion();
        bones.get(parent.id)!.add(b);
      } else {
        b.position.set(...j.pos);
        b.userData.rest = q0.clone();
        b.quaternion.copy(q0);
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
      // the pose is baked into the file: the mesh is bent, and the bones are left in that pose
      if (opts.bakePose !== false && doc.pose) {
        applyPose(bones, doc);
        root.updateMatrixWorld(true);
        bakeSkin(sm);
      }
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

/** Turn the bones to the project's pose (degrees, relative to rest). Joints with no entry go back to rest. */
export function applyPose(bones: Map<string, THREE.Bone>, doc: Doc, pose: Record<string, [number, number, number]> | undefined = doc.pose, root?: [number, number, number]): void {
  const q = new THREE.Quaternion();
  const off = new THREE.Vector3();
  for (const [id, b] of bones) {
    const rest = (b.userData.rest as THREE.Quaternion | undefined) ?? new THREE.Quaternion();
    b.quaternion.copy(rest).multiply(quatOf(pose?.[id] ?? [0, 0, 0], q));
    // root motion: the top bone of each skeleton moves by the offset (given in the character's own axes)
    if (!(b.parent as THREE.Bone | null)?.isBone) {
      const base = (b.userData.restPos ??= b.position.clone()) as THREE.Vector3;
      b.position.copy(base);
      if (root) b.position.add(off.fromArray(root).applyQuaternion(rest));
    }
  }
}

/** The project's animation clips as three.js clips (turning bones), ready for the glTF exporter. */
export function animationClips(root: THREE.Object3D, doc: Doc): THREE.AnimationClip[] {
  if (!doc.anims?.length || !doc.rig?.length) return [];
  const bones = new Map<string, THREE.Bone>();
  root.traverse((o) => (o as THREE.Bone).isBone && o.userData.jointId && bones.set(o.userData.jointId as string, o as THREE.Bone));
  const out: THREE.AnimationClip[] = [];
  const names = new Set<string>();
  for (const clip of doc.anims) {
    const ids = doc.rig.filter((j) => (!clip.owner || j.owner === clip.owner) && bones.has(j.id)).map((j) => j.id);
    if (!ids.length || !clip.keys.length) continue;
    const keys = clipKeys(clip);
    const times = [...new Set([0, ...keys.map((k) => k.t), ...(clip.loop ? [clip.duration] : [])])].sort((a, b) => a - b);
    const poses = times.map((t) => samplePose(clip, t >= clip.duration && clip.loop ? 0 : t, ids));
    const tracks: THREE.KeyframeTrack[] = [];
    for (const id of ids) {
      const bone = bones.get(id)!;
      const rest = (bone.userData.rest as THREE.Quaternion | undefined) ?? new THREE.Quaternion();
      const values: number[] = [];
      let prev: THREE.Quaternion | null = null;
      for (let ti = 0; ti < times.length; ti++) {
        const q = rest.clone().multiply(quatOf(poses[ti][id] ?? [0, 0, 0]));
        if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); // stay on the same side so it turns the short way
        values.push(q.x, q.y, q.z, q.w);
        prev = q;
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values));
      if (!(bone.parent as THREE.Bone | null)?.isBone && keys.some((k) => k.root)) {
        const pv: number[] = [];
        const o = new THREE.Vector3();
        for (const t of times) {
          const rt = sampleRoot(clip, t >= clip.duration && clip.loop ? 0 : t) ?? [0, 0, 0];
          o.fromArray(rt).applyQuaternion(rest).add(bone.position);
          pv.push(o.x, o.y, o.z);
        }
        tracks.push(new THREE.VectorKeyframeTrack(`${bone.uuid}.position`, times, pv));
      }
    }
    let name = clip.name || 'Animation';
    for (let i = 2; names.has(name); i++) name = `${clip.name} ${i}`;
    names.add(name);
    out.push(new THREE.AnimationClip(name, Math.max(...times), tracks));
  }
  return out;
}

/** Move the points of a skinned mesh to where the current bone pose puts them (linear blend skinning on the CPU). */
export function bakeSkin(sm: THREE.SkinnedMesh): void {
  const bones = sm.skeleton.bones;
  const m = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, sm.skeleton.boneInverses[i]));
  const pos = sm.geometry.getAttribute('position');
  const nor = sm.geometry.getAttribute('normal');
  const idx = sm.geometry.getAttribute('skinIndex');
  const wgt = sm.geometry.getAttribute('skinWeight');
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const op = new THREE.Vector3();
  const on = new THREE.Vector3();
  const rot = new THREE.Matrix3();
  for (let v = 0; v < pos.count; v++) {
    op.fromBufferAttribute(pos, v);
    p.set(0, 0, 0);
    if (nor) {
      on.fromBufferAttribute(nor, v);
      n.set(0, 0, 0);
    }
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(v, k);
      if (!w) continue;
      const mat = m[idx.getComponent(v, k)];
      p.addScaledVector(op.clone().applyMatrix4(mat), w);
      if (nor) n.addScaledVector(on.clone().applyMatrix3(rot.setFromMatrix4(mat)), w);
    }
    pos.setXYZ(v, p.x, p.y, p.z);
    if (nor) {
      n.normalize();
      nor.setXYZ(v, n.x, n.y, n.z);
    }
  }
  pos.needsUpdate = true;
  if (nor) nor.needsUpdate = true;
  sm.geometry.computeBoundingBox();
  sm.geometry.computeBoundingSphere();
}
