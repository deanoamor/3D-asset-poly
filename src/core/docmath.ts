import * as THREE from 'three';
import type { Doc, SceneObject, Vec3 } from './types';

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const D2R = Math.PI / 180;

export function byId(doc: Doc): Map<string, SceneObject> {
  return new Map(doc.objects.map((o) => [o.id, o]));
}

export function childrenOf(doc: Doc, parent: string | null): SceneObject[] {
  return doc.objects.filter((o) => o.parent === parent);
}

export function descendantIds(doc: Doc, id: string): string[] {
  const out: string[] = [];
  const walk = (pid: string) => {
    for (const c of doc.objects) {
      if (c.parent === pid) {
        out.push(c.id);
        walk(c.id);
      }
    }
  };
  walk(id);
  return out;
}

export function localMatrix(o: SceneObject, out = new THREE.Matrix4()): THREE.Matrix4 {
  _e.set(o.rotation[0] * D2R, o.rotation[1] * D2R, o.rotation[2] * D2R, 'XYZ');
  _q.setFromEuler(_e);
  _p.fromArray(o.position);
  _s.fromArray(o.size);
  return out.compose(_p, _q, _s);
}

export function worldMatrix(doc: Doc, id: string): THREE.Matrix4 {
  const map = byId(doc);
  const chain: SceneObject[] = [];
  let cur = map.get(id);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent ? map.get(cur.parent) : undefined;
  }
  const m = new THREE.Matrix4();
  const l = new THREE.Matrix4();
  for (const o of chain) m.multiply(localMatrix(o, l));
  return m;
}

export function decomposeTo(m: THREE.Matrix4): { position: Vec3; rotation: Vec3; size: Vec3 } {
  m.decompose(_p, _q, _s);
  _e.setFromQuaternion(_q, 'XYZ');
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  return {
    position: [r(_p.x), r(_p.y), r(_p.z)],
    rotation: [r(_e.x / D2R), r(_e.y / D2R), r(_e.z / D2R)],
    size: [r(_s.x), r(_s.y), r(_s.z)],
  };
}

/** True if every ancestor (and the object itself) is visible. */
export function effectivelyVisible(map: Map<string, SceneObject>, o: SceneObject): boolean {
  let cur: SceneObject | undefined = o;
  while (cur) {
    if (!cur.visible) return false;
    cur = cur.parent ? map.get(cur.parent) : undefined;
  }
  return true;
}

export function isLockedChain(map: Map<string, SceneObject>, o: SceneObject): boolean {
  let cur: SceneObject | undefined = o;
  while (cur) {
    if (cur.locked) return true;
    cur = cur.parent ? map.get(cur.parent) : undefined;
  }
  return false;
}
