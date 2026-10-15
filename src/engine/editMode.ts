import * as THREE from 'three';
import type { Store } from '../core/store';
import { needsDoubleSide } from '../core/shapes';
import { edgeMap, faceCenter, mirrorPairs, triangulate, vert, vertCount, verticesOfSelection, centroidOf, type EdgeInfo, type PolyMesh, type Sel, type V3 } from '../core/mesh';
import type { Viewport } from './viewport';

const ORANGE = 0xff8a00;
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

function dotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(16, 16, 14, 0, Math.PI * 2);
  g.fillStyle = '#fff';
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface DragState {
  W: THREE.Matrix4;
  Winv: THREE.Matrix4;
  proxyInv: THREE.Matrix4;
  start: Map<number, V3>;
  selected: Set<number>;
  pairs: Map<number, number> | null;
}

/** Draws the points / edges / faces of the shape being edited and turns clicks and drags into selection and movement. */
export class EditController {
  private overlays: THREE.Object3D[] = [];
  readonly proxy = new THREE.Object3D();
  private ray = new THREE.Raycaster();
  private dot = dotTexture();
  private editMats = new Map<string, THREE.MeshStandardMaterial>();
  private drag: DragState | null = null;
  private activeId: string | null = null;
  private edges: EdgeInfo[] = [];

  constructor(private vp: Viewport, private store: Store) {
    vp.scene.add(this.proxy);
  }

  get dragging(): boolean {
    return !!this.drag;
  }

  private node(): THREE.Mesh | null {
    const e = this.store.edit;
    return e ? ((this.vp.nodes.get(e.id) as THREE.Mesh | undefined) ?? null) : null;
  }

  private mesh(): PolyMesh | null {
    const e = this.store.edit;
    return (e && this.store.get(e.id)?.mesh) || null;
  }

  // ----- drawing -----

  private clearOverlays(): void {
    for (const o of this.overlays) {
      o.removeFromParent();
      (o as THREE.Mesh).geometry?.dispose();
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      m?.dispose();
    }
    this.overlays = [];
  }

  private editMaterial(id: string, xray: boolean): THREE.MeshStandardMaterial {
    const o = this.store.get(id)!;
    const key = `${o.color}:${xray}:${needsDoubleSide(o)}`;
    let m = this.editMats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(o.color),
        roughness: 0.85,
        metalness: 0,
        side: needsDoubleSide(o) || xray ? THREE.DoubleSide : THREE.FrontSide,
        transparent: xray,
        opacity: xray ? 0.4 : 1,
        depthWrite: !xray,
        // push the surface back a hair so the points and lines drawn on it never z-fight
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      this.editMats.set(key, m);
    }
    return m;
  }

  rebuild(): void {
    this.clearOverlays();
    const e = this.store.edit;
    const mesh = this.mesh();
    const node = this.node();
    if (this.activeId && (!e || e.id !== this.activeId)) {
      this.vp.resetNodeLook(this.activeId);
      this.activeId = null;
    }
    if (!e || !mesh || !node) {
      this.proxy.visible = false;
      this.vp.refreshGizmoTarget();
      return;
    }
    this.activeId = e.id;
    node.material = this.editMaterial(e.id, e.xray);
    this.edges = [...edgeMap(mesh).values()];

    const depth = !e.xray;
    const add = (o: THREE.Object3D) => {
      o.raycast = () => {};
      o.frustumCulled = false;
      o.renderOrder = 3;
      node.add(o);
      this.overlays.push(o);
    };
    const lines = (pairs: [number, number][], color: number, order = 3) => {
      const pos = new Float32Array(pairs.length * 6);
      pairs.forEach(([a, b], i) => {
        pos.set(vert(mesh, a), i * 6);
        pos.set(vert(mesh, b), i * 6 + 3);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, depthTest: depth, transparent: true, opacity: color === ORANGE ? 1 : 0.85 }));
      add(l);
      l.renderOrder = order;
    };
    const points = (coords: number[], color: number, size: number, order: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
      const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, map: this.dot, alphaTest: 0.5, depthTest: depth }));
      add(p);
      p.renderOrder = order;
    };

    lines(this.edges.map((x) => [x.a, x.b]), 0x2a2d33);
    const all: number[] = [];
    if (e.mode === 'vertex') for (let i = 0; i < vertCount(mesh); i++) all.push(...vert(mesh, i));
    else if (e.mode === 'face') mesh.f.forEach((_, fi) => all.push(...faceCenter(mesh, fi)));
    else for (const x of this.edges) all.push(...(vert(mesh, x.a).map((c, k) => (c + vert(mesh, x.b)[k]) / 2) as V3));
    if (all.length) points(all, 0x1c1c1a, e.mode === 'vertex' ? 7 : 5, 4);

    if (e.sel.length) {
      if (e.mode === 'face') {
        const fm = new THREE.Mesh(
          new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(triangulate({ v: mesh.v, f: (e.sel as number[]).map((i) => mesh.f[i]).filter(Boolean) }).positions, 3)),
          new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthTest: depth, depthWrite: false }),
        );
        add(fm);
        fm.renderOrder = 2;
      }
      if (e.mode === 'edge') {
        const keys = new Set(e.sel as string[]);
        lines(this.edges.filter((x) => keys.has(x.key)).map((x) => [x.a, x.b]), ORANGE, 5);
      }
      const sv = verticesOfSelection(mesh, e.mode, e.sel);
      const coords: number[] = [];
      sv.forEach((i) => coords.push(...vert(mesh, i)));
      points(coords, ORANGE, 10, 6);
    }
    this.updateProxy();
    this.vp.refreshGizmoTarget();
    this.vp.requestRender();
  }

  /** Put the move/rotate/size handle at the middle of whatever is selected. */
  updateProxy(): void {
    const e = this.store.edit;
    const mesh = this.mesh();
    const node = this.node();
    if (this.drag || !e || !mesh || !node || !e.sel.length) {
      this.proxy.visible = !!(this.drag && e);
      return;
    }
    const c = centroidOf(mesh, verticesOfSelection(mesh, e.mode, e.sel));
    node.updateWorldMatrix(true, false);
    this.proxy.position.set(...c).applyMatrix4(node.matrixWorld);
    this.proxy.rotation.set(0, 0, 0);
    this.proxy.scale.set(1, 1, 1);
    this.proxy.visible = true;
    this.proxy.updateMatrixWorld(true);
  }

  // ----- dragging the handle -----

  beginDrag(): void {
    const e = this.store.edit;
    const mesh = this.mesh();
    const node = this.node();
    if (!e || !mesh || !node) return;
    node.updateWorldMatrix(true, false);
    const W = node.matrixWorld.clone();
    const selected = verticesOfSelection(mesh, e.mode, e.sel);
    const start = new Map<number, V3>();
    selected.forEach((i) => start.set(i, vert(mesh, i)));
    this.proxy.updateMatrixWorld(true);
    this.drag = { W, Winv: W.clone().invert(), proxyInv: this.proxy.matrixWorld.clone().invert(), start, selected, pairs: e.symmetry ? mirrorPairs(mesh) : null };
  }

  applyDrag(): void {
    const d = this.drag;
    if (!d) return;
    this.proxy.updateMatrixWorld(true);
    const T = this.proxy.matrixWorld.clone().multiply(d.proxyInv);
    const out = new Map<number, V3>();
    const v = new THREE.Vector3();
    for (const [i, p] of d.start) {
      v.set(...p).applyMatrix4(d.W).applyMatrix4(T).applyMatrix4(d.Winv);
      let x = v.x;
      if (d.pairs) {
        const partner = d.pairs.get(i);
        if (partner === i) x = 0; // points on the middle plane stay on it
        else if (partner !== undefined && !d.selected.has(partner)) out.set(partner, [round5(-v.x), round5(v.y), round5(v.z)]);
      }
      out.set(i, [round5(x), round5(v.y), round5(v.z)]);
    }
    this.store.setMeshVerts(out, false);
  }

  endDrag(): void {
    this.drag = null;
    this.store.commit();
    this.updateProxy();
    this.vp.refreshGizmoTarget();
  }

  // ----- picking -----

  private toScreen(world: THREE.Vector3): { x: number; y: number } {
    const r = this.vp.renderer.domElement.getBoundingClientRect();
    const p = world.clone().project(this.vp.camera);
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }

  private visible(world: THREE.Vector3, node: THREE.Mesh): boolean {
    if (this.store.edit?.xray) return true;
    const cam = this.vp.camera.position;
    const dist = cam.distanceTo(world);
    this.ray.set(cam, world.clone().sub(cam).normalize());
    this.ray.far = dist;
    const hit = this.ray.intersectObject(node, false)[0];
    return !hit || hit.distance > dist - (0.015 + 0.003 * dist);
  }

  private worldVerts(mesh: PolyMesh, node: THREE.Mesh): THREE.Vector3[] {
    node.updateWorldMatrix(true, false);
    return Array.from({ length: vertCount(mesh) }, (_, i) => new THREE.Vector3(...vert(mesh, i)).applyMatrix4(node.matrixWorld));
  }

  /** Element under the pointer for the current mode, or null. */
  pickAt(cx: number, cy: number): number | string | null {
    const e = this.store.edit;
    const mesh = this.mesh();
    const node = this.node();
    if (!e || !mesh || !node) return null;
    if (e.mode === 'face') {
      const r = this.vp.renderer.domElement.getBoundingClientRect();
      this.ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), this.vp.camera);
      this.ray.far = Infinity;
      const hit = this.ray.intersectObject(node, false)[0];
      const map = node.geometry.userData.faceOfTri as Uint32Array | undefined;
      const tri = hit?.faceIndex;
      return map && tri !== undefined && tri !== null ? map[tri] : null;
    }
    const wv = this.worldVerts(mesh, node);
    const sv = wv.map((w) => this.toScreen(w));
    if (e.mode === 'vertex') {
      const cands = sv.map((s, i) => ({ i, d: Math.hypot(s.x - cx, s.y - cy) })).filter((c) => c.d < 14).sort((a, b) => a.d - b.d);
      for (const c of cands) if (this.visible(wv[c.i], node)) return c.i;
      return null;
    }
    const cands: { key: string; d: number; a: number; b: number }[] = [];
    for (const x of this.edges) {
      const A = sv[x.a];
      const B = sv[x.b];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((cx - A.x) * dx + (cy - A.y) * dy) / len2));
      const d = Math.hypot(A.x + dx * t - cx, A.y + dy * t - cy);
      if (d < 9) cands.push({ key: x.key, d, a: x.a, b: x.b });
    }
    cands.sort((p, q) => p.d - q.d);
    for (const c of cands) if (this.visible(wv[c.a].clone().add(wv[c.b]).multiplyScalar(0.5), node)) return c.key;
    return null;
  }

  private inRect(mesh: PolyMesh, node: THREE.Mesh, x0: number, y0: number, x1: number, y1: number): Sel {
    const e = this.store.edit!;
    const lo = { x: Math.min(x0, x1), y: Math.min(y0, y1) };
    const hi = { x: Math.max(x0, x1), y: Math.max(y0, y1) };
    const inside = (p: { x: number; y: number }) => p.x >= lo.x && p.x <= hi.x && p.y >= lo.y && p.y <= hi.y;
    const wv = this.worldVerts(mesh, node);
    const sv = wv.map((w) => this.toScreen(w));
    if (e.mode === 'vertex') return wv.map((_, i) => i).filter((i) => inside(sv[i]) && this.visible(wv[i], node));
    if (e.mode === 'edge') {
      return this.edges.filter((x) => inside(sv[x.a]) && inside(sv[x.b]) && this.visible(wv[x.a].clone().add(wv[x.b]).multiplyScalar(0.5), node)).map((x) => x.key);
    }
    const out: number[] = [];
    mesh.f.forEach((f, fi) => {
      const c = new THREE.Vector3(...faceCenter(mesh, fi)).applyMatrix4(node.matrixWorld);
      if (f.length && inside(this.toScreen(c)) && this.visible(c, node)) out.push(fi);
    });
    return out;
  }

  pointerDown(ev: PointerEvent): void {
    const e = this.store.edit;
    const mesh = this.mesh();
    const node = this.node();
    if (!e || !mesh || !node) return;
    const sx = ev.clientX;
    const sy = ev.clientY;
    const shift = ev.shiftKey;
    const wasOrbit = this.vp.controls.enabled;
    if (shift) this.vp.controls.enabled = false; // Shift-drag draws a selection box instead of orbiting
    let moved = false;
    let box: HTMLDivElement | null = null;
    const move = (m: PointerEvent) => {
      if (!moved && Math.hypot(m.clientX - sx, m.clientY - sy) < 4) return;
      moved = true;
      if (!shift) return;
      if (!box) {
        box = document.createElement('div');
        box.className = 'selbox';
        this.vp.container.append(box);
      }
      const r = this.vp.container.getBoundingClientRect();
      box.style.left = `${Math.min(sx, m.clientX) - r.left}px`;
      box.style.top = `${Math.min(sy, m.clientY) - r.top}px`;
      box.style.width = `${Math.abs(m.clientX - sx)}px`;
      box.style.height = `${Math.abs(m.clientY - sy)}px`;
    };
    const up = (u: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (shift) this.vp.controls.enabled = wasOrbit;
      box?.remove();
      const cur = this.store.edit;
      if (!cur || cur.id !== e.id) return;
      if (moved && shift) {
        const hits = this.inRect(mesh, node, sx, sy, u.clientX, u.clientY);
        const merged = [...new Set([...cur.sel, ...hits])] as Sel;
        this.store.editSelect(merged);
      } else if (!moved) {
        const hit = this.pickAt(u.clientX, u.clientY);
        if (hit === null) {
          if (!shift) this.store.editSelect([]);
        } else if (shift) {
          this.store.editSelect(cur.sel.includes(hit) ? cur.sel.filter((x) => x !== hit) : [...cur.sel, hit]);
        } else this.store.editSelect([hit]);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  dispose(): void {
    this.clearOverlays();
    for (const m of this.editMats.values()) m.dispose();
    this.dot.dispose();
  }
}
