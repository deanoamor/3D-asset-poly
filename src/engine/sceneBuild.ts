import * as THREE from 'three';
import type { Doc, SceneObject } from '../core/types';
import { buildObjectGeometry, lookOf, matOf, needsDoubleSide, usesVertexColors } from '../core/shapes';
import { attachSkeletons } from './rigExport';
import { effectivelyVisible } from '../core/docmath';
import { buildAtlas, remapGeometry, type Atlas } from './atlas';
import { imageOf, pictureOf } from './textures';

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

const hexOf = (c: string) => c.toLowerCase();

/**
 * Picks the geometry and material of every shape. Plain shapes use the shared caches. A shape wearing a picture gets its
 * own small atlas (picture + colour cell). With `atlas`, the colours and pictures of ALL shapes go into one image per
 * material kind, so the whole model needs a single material (one draw call).
 */
export class LookResolver {
  private groups = new Map<string, { atlas: Atlas; material: THREE.MeshStandardMaterial }>();
  private minis = new Map<string, { atlas: Atlas; material: THREE.MeshStandardMaterial }>();
  private prepared = false;
  constructor(private doc: Doc, private geos: GeometryCache, private mats: MaterialCache, private useAtlas = false) {}

  setDoc(doc: Doc): void {
    this.doc = doc;
  }

  private pic(o: SceneObject) {
    const p = pictureOf(this.doc, o.tex?.id);
    return p && imageOf(p) ? p : undefined;
  }

  private kind(o: SceneObject) {
    const p = this.pic(o);
    const vc = !p && !this.useAtlas && usesVertexColors(o); // an atlas keeps flat colours: one material for everything
    const pbr = matOf(o);
    return { p, vc, pbr, double: needsDoubleSide(o), key: `${pbr.rough}|${pbr.metal}|${pbr.glow}|${needsDoubleSide(o)}|${vc}` };
  }

  private material(atlas: Atlas, k: ReturnType<LookResolver['kind']>, name: string): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ map: atlas.texture, color: 0xffffff, vertexColors: k.vc, roughness: k.pbr.rough, metalness: k.pbr.metal, side: k.double ? THREE.DoubleSide : THREE.FrontSide });
    if (k.pbr.glow > 0) {
      m.emissive = new THREE.Color(0xffffff);
      m.emissiveMap = atlas.texture;
      m.emissiveIntensity = k.pbr.glow;
      m.userData.glow = k.pbr.glow;
    }
    m.name = name;
    return m;
  }

  private prepare(): void {
    this.prepared = true;
    const buckets = new Map<string, { colors: Set<string>; pictures: Map<string, import('../core/types').Picture>; k: ReturnType<LookResolver['kind']> }>();
    for (const o of this.doc.objects) {
      if (o.kind !== 'shape') continue;
      const k = this.kind(o);
      let b = buckets.get(k.key);
      if (!b) buckets.set(k.key, (b = { colors: new Set(), pictures: new Map(), k }));
      b.colors.add(k.vc ? '#ffffff' : hexOf(o.color));
      if (k.p) b.pictures.set(k.p.id, k.p);
    }
    let i = 0;
    for (const [key, b] of buckets) {
      const atlas = buildAtlas({ colors: b.colors, pictures: b.pictures });
      this.groups.set(key, { atlas, material: this.material(atlas, b.k, i++ ? `Atlas ${i}` : 'Atlas') });
    }
  }

  resolve(o: SceneObject): { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } {
    const k = this.kind(o);
    if (this.useAtlas) {
      if (!this.prepared) this.prepare();
      const g = this.groups.get(k.key)!;
      const color = k.vc ? '#ffffff' : hexOf(o.color);
      const geometry = remapGeometry(this.geos.get(o), g.atlas, color, k.p, o.tex?.mode);
      geometry.userData.owned = true;
      return { geometry, material: g.material };
    }
    if (!k.p) return { geometry: this.geos.get(o), material: this.mats.get(o.color, k.double, k.vc, k.pbr) };
    const key = `${k.p.id}|${k.p.src.length}|${hexOf(o.color)}|${k.key}`;
    let m = this.minis.get(key);
    if (!m) {
      const atlas = buildAtlas({ colors: new Set([hexOf(o.color)]), pictures: new Map([[k.p.id, k.p]]) });
      m = { atlas, material: this.material(atlas, k, `Picture ${k.p.name}`) };
      this.minis.set(key, m);
    }
    const geometry = remapGeometry(this.geos.get(o), m.atlas, hexOf(o.color), k.p, o.tex?.mode);
    geometry.userData.owned = true;
    return { geometry, material: m.material };
  }

  dispose(): void {
    for (const m of [...this.groups.values(), ...this.minis.values()]) {
      m.material.dispose();
      m.atlas.texture.dispose();
    }
    this.groups.clear();
    this.minis.clear();
  }
}

export function applyTransform(obj: THREE.Object3D, o: SceneObject): void {
  obj.position.fromArray(o.position);
  obj.rotation.set(o.rotation[0] * D2R, o.rotation[1] * D2R, o.rotation[2] * D2R, 'XYZ');
  obj.scale.fromArray(o.size);
}

/** Build a standalone three.js hierarchy for the export (hidden objects are left out). */
export function buildExportScene(doc: Doc, name: string, opts: { bakePose?: boolean; atlas?: boolean } = {}): THREE.Group {
  const geos = new GeometryCache();
  const mats = new MaterialCache();
  const looks = new LookResolver(doc, geos, mats, !!opts.atlas);
  const map = new Map(doc.objects.map((o) => [o.id, o]));
  const root = new THREE.Group();
  root.name = name;
  const nodes = new Map<string, THREE.Object3D>();
  for (const o of doc.objects) {
    if (!effectivelyVisible(map, o)) continue;
    let node: THREE.Object3D;
    if (o.kind === 'shape') {
      const r = looks.resolve(o);
      node = new THREE.Mesh(r.geometry, r.material);
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
