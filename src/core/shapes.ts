import * as THREE from 'three';
import type { ShapeParams, ShapeType } from './types';
import { MAX_SEGMENTS, MIN_SEGMENTS } from './types';

export function clampSegments(shape: ShapeType, n: number): number {
  return Math.max(MIN_SEGMENTS[shape], Math.min(MAX_SEGMENTS, Math.round(n)));
}

function sphereRings(seg: number): number {
  return Math.max(2, Math.round(seg / 2));
}

/** Triangle count of a shape, computed analytically (matches buildGeometry). */
export function triangleCount(shape: ShapeType, p: ShapeParams): number {
  const s = clampSegments(shape, p.segments);
  switch (shape) {
    case 'box':
      return 12;
    case 'plane':
      return 2;
    case 'pyramid':
      return 6; // 4 sides + 2 base triangles
    case 'cone':
      return s + s; // side + base cap
    case 'cylinder': {
      const tapered = p.taper <= 0.0001;
      // side quads (2 tris each) + bottom cap + top cap (none when it tapers to a point)
      return tapered ? s + s : 2 * s + s + s;
    }
    case 'sphere': {
      const r = sphereRings(s);
      return s * r * 2 - 2 * s;
    }
  }
}

function flat(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng !== g) g.dispose();
  ng.deleteAttribute('uv');
  ng.computeVertexNormals();
  return ng;
}

/** Unit-sized, flat-shaded geometry. Object "size" scales it to W/H/D. */
export function buildGeometry(shape: ShapeType, p: ShapeParams): THREE.BufferGeometry {
  const s = clampSegments(shape, p.segments);
  switch (shape) {
    case 'box':
      return flat(new THREE.BoxGeometry(1, 1, 1));
    case 'plane': {
      const g = new THREE.PlaneGeometry(1, 1);
      g.rotateX(-Math.PI / 2);
      return flat(g);
    }
    case 'cylinder': {
      const top = Math.max(0, Math.min(1, p.taper)) * 0.5;
      return flat(new THREE.CylinderGeometry(top, 0.5, 1, s, 1, false));
    }
    case 'cone':
      return flat(new THREE.ConeGeometry(0.5, 1, s, 1, false));
    case 'pyramid': {
      // Square base aligned to the axes, 1 x 1 footprint: 4 sides + 2 base triangles.
      const a = [0, 0.5, 0], b = [-0.5, -0.5, -0.5], c = [0.5, -0.5, -0.5], d = [0.5, -0.5, 0.5], e = [-0.5, -0.5, 0.5];
      const tris = [a, c, b, a, d, c, a, e, d, a, b, e, b, c, d, b, d, e];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
      g.computeVertexNormals();
      return g;
    }
    case 'sphere':
      return flat(new THREE.SphereGeometry(0.5, s, sphereRings(s)));
  }
}

export function geometryTriangles(g: THREE.BufferGeometry): number {
  return g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
}
