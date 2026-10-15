import * as THREE from 'three';

/**
 * Painted shapes keep their colors in vertex colors on a white material. Apps that ignore vertex colors
 * (Blender by default, OBJ importers) would show them white/grey. So the material gets the shape's average
 * color and the vertex colors become a 0..1 tint on top of it: right everywhere, richer where COLOR_0 is used.
 */
export function bakeVertexColors(geometry: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial, cache: Map<string, THREE.MeshStandardMaterial>): { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } {
  if (!geometry.getAttribute('color') || !mat.vertexColors) return { geometry, material: mat };
  const g = geometry.clone();
  const c = g.getAttribute('color');
  const mean = [0, 0, 0];
  for (let i = 0; i < c.count; i++) for (let k = 0; k < 3; k++) mean[k] += c.getComponent(i, k) / c.count;
  // steps of 1/50 keep near-identical colors on one material (a character stays at a handful of materials)
  const base = mean.map((v) => Math.min(1, Math.max(0.02, Math.round(v * 1.12 * 50) / 50)));
  for (let i = 0; i < c.count; i++) for (let k = 0; k < 3; k++) c.setComponent(i, k, Math.min(1, c.getComponent(i, k) / base[k]));
  const key = base.map((v) => v.toFixed(4)).join(',') + (mat.side === THREE.DoubleSide ? 'd' : '');
  let nm = cache.get(key);
  if (!nm) {
    nm = mat.clone();
    nm.color.setRGB(base[0], base[1], base[2]);
    nm.name = `Color #${new THREE.Color().setRGB(base[0], base[1], base[2]).getHexString()}`;
    cache.set(key, nm);
  }
  return { geometry: g, material: nm };
}
