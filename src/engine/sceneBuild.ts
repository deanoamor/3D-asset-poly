import * as THREE from 'three';
import type { Doc, SceneObject } from '../core/types';
import { buildObjectGeometry, lookOf, matOf, needsDoubleSide, usesVertexColors } from '../core/shapes';
import { attachSkeletons } from './rigExport';
import { effectivelyVisible } from '../core/docmath';

const D2R = Math.PI / 180;

export class GeometryCache {
  private map = new Map<string, THREE.BufferGeometry>();
  get(o: SceneObject): THREE.BufferGeometry {
    if (o.mesh) return buildObjectGeometry(o); // edited meshes are not shared
    const shape = o.shape!;
    const look = lookOf(o);
    const key = `${shape}:${o.params.segments}:${shape === 'cylinder' ? o.params.taper.toFixed(3) : 0}:${look.smooth ? 's' : 'f'}:${look.paint}:${look.paint > 0 ? o.color : ''}`;
    let g = this.map.get(key);
    if (!g) {
      g = buildObjectGeometry(o);
      this.map.set(key, g);
    }
    return g;
  }
  dispose(): void {
    for (const g of this.map.values()) g.dispose();
    this.map.clear();
  }
}

export class MaterialCache {
  private map = new Map<string, THREE.MeshStandardMaterial>();
  /** Planes have a single face, so they are rendered (and exported) double-sided. */
  get(hex: string, doubleSided = false, vertexColors = false, pbr: { rough: number; metal: number; glow: number } = { rough: 0.85, metal: 0, glow: 0 }): THREE.MeshStandardMaterial {
    // with vertex colors the colors live in the geometry, so one white material serves every color
    const pk = `|${pbr.rough}|${pbr.metal}|${pbr.glow}`;
    const key = (vertexColors ? `vc${doubleSided ? ':2' : ''}` : hex + (doubleSided ? ':2' : '')) + pk;
    let m = this.map.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(vertexColors ? '#ffffff' : hex),
        vertexColors,
        roughness: pbr.rough,
        metalness: pbr.metal,
        side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      });
      if (pbr.glow > 0) {
        m.emissive = new THREE.Color(vertexColors ? '#ffffff' : hex);
        m.emissiveIntensity = pbr.glow;
        m.userData.glow = pbr.glow; // painted shapes: the average colour is baked into the emissive on export
        if (vertexColors) m.emissiveIntensity = 0;
      }
      m.name = vertexColors ? `Painted${doubleSided ? ' (2-sided)' : ''}` : `Color ${hex}${doubleSided ? ' (2-sided)' : ''}`;
      this.map.set(key, m);
    }
    return m;
  }
  /** Ask three.js to rebuild every material (needed when shadows are switched on or off). */
  refresh(): void {
    for (const m of this.map.values()) m.needsUpdate = true;
  }
  dispose(): void {
    for (const m of this.map.values()) m.dispose();
    this.map.clear();
  }
}

export function applyTransform(obj: THREE.Object3D, o: SceneObject): void {
  obj.position.fromArray(o.position);
  obj.rotation.set(o.rotation[0] * D2R, o.rotation[1] * D2R, o.rotation[2] * D2R, 'XYZ');
  obj.scale.fromArray(o.size);
}

/** Build a standalone three.js hierarchy for the export (hidden objects are left out). */
export function buildExportScene(doc: Doc, name: string, opts: { bakePose?: boolean } = {}): THREE.Group {
  const geos = new GeometryCache();
  const mats = new MaterialCache();
  const map = new Map(doc.objects.map((o) => [o.id, o]));
  const root = new THREE.Group();
  root.name = name;
  const nodes = new Map<string, THREE.Object3D>();
  for (const o of doc.objects) {
    if (!effectivelyVisible(map, o)) continue;
    let node: THREE.Object3D;
    if (o.kind === 'shape') {
      const mesh = new THREE.Mesh(geos.get(o), mats.get(o.color, needsDoubleSide(o), usesVertexColors(o), matOf(o)));
      node = mesh;
    } else {
      node = new THREE.Group();
    }
    node.name = o.name;
    applyTransform(node, o);
    if (o.spin) node.userData.spin = { ...o.spin };
    nodes.set(o.id, node);
  }
  for (const o of doc.objects) {
    const node = nodes.get(o.id);
    if (!node) continue;
    (o.parent ? nodes.get(o.parent) ?? root : root).add(node);
  }
  attachSkeletons(doc, root, nodes, opts);
  return root;
}
