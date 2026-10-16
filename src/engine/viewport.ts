import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { Store } from '../core/store';
import { effectivelyVisible, isLockedChain } from '../core/docmath';
import type { SceneObject, ShapeType, Vec3 } from '../core/types';
import { GeometryCache, MaterialCache, applyTransform, buildExportScene } from './sceneBuild';
import { applyPose } from './rigExport';
import { EditController } from './editMode';
import { meshSignature } from '../core/mesh';
import { RigOverlay } from './rigOverlay';
import { lookOf, needsDoubleSide, usesVertexColors } from '../core/shapes';

const R2D = 180 / Math.PI;
const round = (n: number, d = 1e4) => Math.round(n * d) / d;

export type ViewName = 'front' | 'side' | 'top' | 'persp';

/** Size and vertical placement for a freshly drawn shape given its footprint. */
export function shapeDefaults(shape: ShapeType, w: number, d: number): { size: Vec3; lift: number } {
  if (shape === 'sphere') {
    const m = Math.max(w, d);
    return { size: [m, m, m], lift: m / 2 };
  }
  if (shape === 'cylinder' || shape === 'cone') {
    const m = Math.max(w, d);
    return { size: [m, 1, m], lift: 0.5 };
  }
  if (shape === 'plane') return { size: [w, 1, d], lift: 0 };
  return { size: [w, 1, d], lift: 0.5 };
}

interface Pick {
  id: string;
  point: THREE.Vector3;
  normalY: number;
}

export class Viewport {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.05, 500);
  readonly controls: OrbitControls;
  readonly tc: TransformControls;
  private model = new THREE.Group();
  private rig: RigOverlay;
  private pivotMarker = new THREE.Group();
  private pivotId: string | null = null;
  private spinOn = false;
  private poseRoot: THREE.Group | null = null;
  private poseBones = new Map<string, THREE.Bone>();
  private poseSig = '';
  private poseActive = false;
  private grid: THREE.Object3D;
  readonly nodes = new Map<string, THREE.Object3D>();
  readonly edit: EditController;
  private sig = new Map<string, string>();
  private geos = new GeometryCache();
  readonly mats = new MaterialCache();
  private outlines: THREE.LineSegments[] = [];
  private outlineMat = new THREE.LineBasicMaterial({ color: 0x0d99ff });
  private ghost: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private dirty = true;
  private raf = 0;
  spaceDown = false;
  private tween: { t0: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3 } | null = null;
  private disposers: (() => void)[] = [];
  private otherBoxes: THREE.Box3[] = [];
  private gizmoDragging = false;
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private shadowGround!: THREE.Mesh;

  constructor(readonly container: HTMLElement, private store: Store) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'gl';
    this.renderer.domElement.style.touchAction = 'none';
    container.prepend(this.renderer.domElement);

    this.scene.background = new THREE.Color(0xebebe8);
    this.scene.add(this.model);
    this.rig = new RigOverlay(store);
    this.scene.add(this.rig.group);
    this.buildPivotMarker();
    this.scene.add(this.pivotMarker);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa0a8, 1.6);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(5, 9, 4);
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6);
    fill.position.set(-6, 3, -5);
    this.scene.add(hemi, sun, sun.target, fill);
    this.sun = sun;
    this.hemi = hemi;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // invisible floor that only shows the shadows (Preview)
    this.shadowGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.28 }));
    this.shadowGround.receiveShadow = true;
    this.shadowGround.visible = false;
    this.shadowGround.raycast = () => {};
    this.scene.add(this.shadowGround);

    this.grid = this.makeGrid();
    this.scene.add(this.grid);

    this.camera.position.set(4.6, 3.8, 5.4);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.target.set(0, 0.5, 0);
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 120;
    this.controls.maxPolarAngle = Math.PI * 0.499;
    this.controls.autoRotateSpeed = 2.2;
    this.controls.addEventListener('change', () => this.requestRender());
    this.controls.update();

    this.tc = new TransformControls(this.camera, this.renderer.domElement);
    this.tc.size = 0.85;
    const helper = this.tc.getHelper();
    this.scene.add(helper);
    this.edit = new EditController(this, store);
    this.tc.addEventListener('change', () => this.requestRender());
    this.tc.addEventListener('dragging-changed', (e) => {
      const dragging = (e as unknown as { value: boolean }).value;
      this.controls.enabled = !dragging;
      if (dragging) {
        this.gizmoDragging = true;
        if (this.store.edit) this.edit.beginDrag();
        else this.cacheOtherBoxes();
      } else if (this.gizmoDragging) {
        this.gizmoDragging = false;
        if (this.store.edit) this.edit.endDrag();
        else this.store.commit();
      }
    });
    this.tc.addEventListener('objectChange', () => this.onGizmoChange());

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(container);
    this.disposers.push(() => ro.disconnect());

    const el = container;
    const down = (e: PointerEvent) => this.onPointerDown(e);
    el.addEventListener('pointerdown', down);
    el.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e)) this.spaceDown = true;
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') this.spaceDown = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    this.disposers.push(() => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    });

    store.subscribe((e) => {
      if (e === 'doc' || e === 'reset' || e === 'learn') this.sync();
      if (e === 'rig' || e === 'doc' || e === 'reset' || e === 'tool' || e === 'history') this.syncRig();
      if (e === 'doc' || e === 'selection' || e === 'reset' || e === 'tool' || e === 'edit' || e === 'history') this.syncPivot();
      if (e === 'selection' || e === 'reset') this.onSelection();
      if (e === 'tool') this.onToolChange();
      if (e === 'edit') {
        this.edit.rebuild();
        this.onToolChange();
      }
    });
    this.resize();
    this.sync();
    this.onSelection();
    this.onToolChange();
    this.loop();
  }

  // ----- pivot marker and spin -----

  private buildPivotMarker(): void {
    const mat = (c: number) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });
    const ball = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), mat(0xff8a1f));
    ball.renderOrder = 1004;
    ball.userData.pivot = true;
    this.pivotMarker.add(ball);
    for (const [axis, color] of [[0, 0xe5484d], [1, 0x3fb950], [2, 0x3b82f6]] as const) {
      const len = 0.28;
      const g = new THREE.CylinderGeometry(0.012, 0.012, len, 6);
      g.translate(0, len / 2 + 0.05, 0);
      const m = new THREE.Mesh(g, mat(color));
      m.renderOrder = 1003;
      m.raycast = () => {};
      if (axis === 0) m.rotation.z = -Math.PI / 2;
      if (axis === 2) m.rotation.x = Math.PI / 2;
      this.pivotMarker.add(m);
    }
    this.pivotMarker.visible = false;
  }

  /** Show the pivot of the selected group as an orange diamond with axis lines. */
  private syncPivot(): void {
    const sel = this.store.selection;
    const ui = this.store.ui;
    const id = sel.length === 1 && this.store.get(sel[0])?.kind === 'group' && !ui.preview && !this.store.edit && !this.poseActive ? sel[0] : null;
    this.pivotId = id;
    const p = id ? this.store.pivotOf(id) : null;
    this.pivotMarker.visible = !!p;
    if (p && id) {
      this.pivotMarker.position.set(...p);
      // the axis lines follow the group's own turn
      const m = this.store.worldMatrixOf(id);
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(m));
      this.pivotMarker.quaternion.copy(q);
    }
    this.requestRender();
  }

  /** Drag the pivot of the selected group; what is inside stays where it is. */
  private beginPivotDrag(e: PointerEvent, id: string): void {
    const from = this.store.pivotOf(id);
    if (!from) return;
    const normal = this.camera.getWorldDirection(new THREE.Vector3());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(...from));
    const start = new THREE.Vector3();
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    if (!this.raycaster.ray.intersectPlane(plane, start)) return;
    this.controls.enabled = false;
    let moved = false;
    const step = this.store.ui.snapGrid ? this.store.ui.gridStep / 5 : 0.001;
    const snap = (v: number) => Math.round(v / step) * step;
    const move = (m: PointerEvent) => {
      if (!moved && Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) < 3) return;
      moved = true;
      this.raycaster.setFromCamera(this.ndc(m), this.camera);
      const p = new THREE.Vector3();
      if (!this.raycaster.ray.intersectPlane(plane, p)) return;
      const to = new THREE.Vector3(...from).add(p.sub(start));
      const r = (v: number) => Math.round(snap(v) * 1000) / 1000;
      this.store.setPivot(id, [r(to.x), r(to.y), r(to.z)], false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this.controls.enabled = true;
      if (moved) this.store.commit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** Preview: objects with Spin turn around their pivot. Returns true while something is spinning. */
  private spinTick(): boolean {
    const doc = this.store.doc;
    const spins = this.store.ui.preview && !this.poseActive ? doc.objects.filter((o) => o.spin) : [];
    if (spins.length) {
      const t = performance.now() / 1000;
      const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
      const q = new THREE.Quaternion();
      for (const o of spins) {
        const node = this.nodes.get(o.id);
        if (!node) continue;
        applyTransform(node, o);
        node.quaternion.multiply(q.setFromAxisAngle(axes[o.spin!.axis], Math.PI * 2 * o.spin!.speed * t));
      }
      this.spinOn = true;
      return true;
    }
    if (this.spinOn) {
      this.spinOn = false;
      for (const o of doc.objects) if (o.spin) {
        const node = this.nodes.get(o.id);
        if (node) applyTransform(node, o);
      }
      this.dirty = true;
    }
    return false;
  }

  // ----- skeleton overlay -----

  private syncRig(): void {
    this.syncPose();
    let posed: Map<string, [number, number, number]> | undefined;
    if (this.poseActive) {
      posed = new Map();
      const v = new THREE.Vector3();
      for (const [id, b] of this.poseBones) {
        b.getWorldPosition(v);
        posed.set(id, [v.x, v.y, v.z]);
      }
    }
    if (this.rig.sync(posed)) this.requestRender();
    if (this.poseActive || this.tc.object?.userData.jointId) this.refreshGizmoTarget();
  }

  /** Only while Pose mode is on (also in its Preview) the model is drawn bent by the skeleton; otherwise it is shown at rest. */
  private poseView(): boolean {
    if (!this.store.doc.rig?.length || this.store.edit) return false;
    return this.store.ui.pose;
  }

  private disposePose(): void {
    if (!this.poseRoot) return;
    if (this.tc.object && this.tc.object.userData.jointId) this.tc.detach();
    this.poseRoot.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.poseRoot.removeFromParent();
    this.poseRoot = null;
    this.poseBones.clear();
    this.poseSig = '';
  }

  private syncPose(): void {
    const on = this.poseView();
    this.poseActive = on;
    this.model.visible = !on;
    if (!on) {
      this.disposePose();
      this.requestRender();
      return;
    }
    const doc = this.store.doc;
    const sig = JSON.stringify([doc.objects, doc.rig, this.store.ui.preview]);
    if (!this.poseRoot || sig !== this.poseSig) {
      this.disposePose();
      this.poseSig = sig;
      const root = buildExportScene(doc, 'pose', { bakePose: false });
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          m.frustumCulled = false;
        }
        if ((o as THREE.Bone).isBone && o.userData.jointId) this.poseBones.set(o.userData.jointId as string, o as THREE.Bone);
      });
      this.scene.add(root);
      this.poseRoot = root;
    }
    applyPose(this.poseBones, doc);
    this.poseRoot!.updateMatrixWorld(true);
    this.requestRender();
  }

  /** Drag a joint on the plane facing the camera. Shift moves everything below it too. */
  private beginJointDrag(e: PointerEvent, id: string): void {
    const j = this.store.joint(id);
    if (!j) return;
    this.store.selectJoint(id);
    const normal = this.camera.getWorldDirection(new THREE.Vector3());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(...j.pos));
    const start = new THREE.Vector3();
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    if (!this.raycaster.ray.intersectPlane(plane, start)) return;
    const from = new THREE.Vector3(...j.pos);
    this.controls.enabled = false;
    let moved = false;
    const withChildren = e.shiftKey;
    const move = (m: PointerEvent) => {
      if (!moved && Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) < 3) return;
      moved = true;
      this.raycaster.setFromCamera(this.ndc(m), this.camera);
      const p = new THREE.Vector3();
      if (!this.raycaster.ray.intersectPlane(plane, p)) return;
      const to = from.clone().add(p.sub(start));
      const r = (v: number) => Math.round(v * 1000) / 1000;
      this.store.moveJoint(id, [r(to.x), r(to.y), r(to.z)], { withChildren, commit: false });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this.controls.enabled = true;
      if (moved) this.store.commit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ----- scene sync -----

  private makeGrid(): THREE.Object3D {
    const g = new THREE.Group();
    const size = 40;
    const minor = new THREE.GridHelper(size, size * 2, 0xc4c4c0, 0xd4d4d0);
    (minor.material as THREE.Material).depthWrite = false;
    const major = new THREE.GridHelper(size, size / 5, 0xb0b0ab, 0xb0b0ab);
    major.position.y = 0.0005;
    (major.material as THREE.Material).depthWrite = false;
    const axisX = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-size / 2, 0.001, 0), new THREE.Vector3(size / 2, 0.001, 0)]),
      new THREE.LineBasicMaterial({ color: 0xe5736a }),
    );
    const axisZ = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.001, -size / 2), new THREE.Vector3(0, 0.001, size / 2)]),
      new THREE.LineBasicMaterial({ color: 0x5b8def }),
    );
    g.add(minor, major, axisX, axisZ);
    return g;
  }

  requestRender(): void {
    this.dirty = true;
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private nodeSignature(o: SceneObject): string {
    if (o.kind !== 'shape') return 'group';
    const look = lookOf(o);
    const l = `${look.smooth ? 's' : 'f'}${look.paint}`;
    if (o.mesh) return `mesh:${meshSignature(o.mesh)}:${o.color}:${needsDoubleSide(o)}:${l}`;
    return `${o.shape}:${o.params.segments}:${o.params.taper}:${o.color}:${l}`;
  }

  sync(): void {
    const doc = this.store.doc;
    const alive = new Set<string>();
    for (const o of doc.objects) {
      alive.add(o.id);
      let node = this.nodes.get(o.id);
      const sig = this.nodeSignature(o);
      if (!node) {
        node = o.kind === 'shape' ? new THREE.Mesh(this.geos.get(o), this.mats.get(o.color, needsDoubleSide(o), usesVertexColors(o))) : new THREE.Group();
        node.userData.id = o.id;
        node.castShadow = true;
        node.receiveShadow = true;
        this.nodes.set(o.id, node);
        this.sig.set(o.id, sig);
      } else if (this.sig.get(o.id) !== sig && node instanceof THREE.Mesh) {
        const old = node.geometry;
        node.geometry = this.geos.get(o);
        if (old.userData.faceOfTri) old.dispose(); // edited meshes own their geometry
        node.material = this.mats.get(o.color, needsDoubleSide(o), usesVertexColors(o));
        this.sig.set(o.id, sig);
        this.refreshOutlines();
      }
      node.name = o.name;
      applyTransform(node, o);
      // three.js hides children of hidden parents on its own
      node.visible = o.visible && !this.store.learnHidden?.has(o.id);
      const parentNode = o.parent ? this.nodes.get(o.parent) ?? this.model : this.model;
      if (node.parent !== parentNode) parentNode.add(node);
    }
    for (const [id, node] of [...this.nodes]) {
      if (!alive.has(id)) {
        node.removeFromParent();
        this.nodes.delete(id);
        this.sig.delete(id);
      }
    }
    if (this.store.edit) this.edit.rebuildSoon();
    this.refreshGizmoTarget();
    this.requestRender();
  }

  /** Back to the normal material after leaving Edit Shape. */
  resetNodeLook(id: string): void {
    const o = this.store.get(id);
    const node = this.nodes.get(id);
    if (o && node instanceof THREE.Mesh) node.material = this.mats.get(o.color, needsDoubleSide(o), usesVertexColors(o));
    this.requestRender();
  }

  private selectedMeshes(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const id of this.store.selection) {
      this.nodes.get(id)?.traverse((n) => {
        if (n instanceof THREE.Mesh && n.userData.id) out.push(n);
      });
    }
    return out;
  }

  private refreshOutlines(): void {
    for (const l of this.outlines) {
      l.removeFromParent();
      l.geometry.dispose();
    }
    this.outlines = [];
    if (this.store.ui.preview || this.store.edit) return;
    for (const m of this.selectedMeshes()) {
      const edges = new THREE.EdgesGeometry(m.geometry, 12);
      const line = new THREE.LineSegments(edges, this.outlineMat);
      line.raycast = () => {};
      line.renderOrder = 2;
      m.add(line);
      this.outlines.push(line);
    }
    this.requestRender();
  }

  private onSelection(): void {
    this.refreshOutlines();
    this.refreshGizmoTarget();
  }

  private onToolChange(): void {
    const ui = this.store.ui;
    this.grid.visible = !ui.preview;
    this.controls.autoRotate = ui.preview;
    this.applyPreviewLook(ui.preview);
    const mode = ui.tool === 'rotate' ? 'rotate' : ui.tool === 'scale' ? 'scale' : 'translate';
    this.tc.setMode(mode);
    this.tc.setSpace(mode === 'translate' ? 'world' : 'local');
    const step = ui.snapGrid ? ui.gridStep : null;
    const ed = this.store.edit;
    // while editing points, snapping is opt-in and relative (the edit bar's Snap), so drags stay smooth
    this.tc.setTranslationSnap(ed ? null : step);
    this.tc.setRotationSnap((ed ? ed.snap : ui.snapGrid) ? THREE.MathUtils.degToRad(15) : null);
    this.tc.setScaleSnap(ed ? (ed.snap ? 0.1 : null) : step);
    this.renderer.domElement.style.cursor = ui.tool === 'shape' ? 'crosshair' : ui.tool === 'color' ? 'copy' : '';
    this.refreshOutlines();
    this.refreshGizmoTarget();
    this.requestRender();
  }

  /** Preview shows the model like a finished asset: warm backdrop, soft light and a real shadow on the floor. */
  private applyPreviewLook(on: boolean): void {
    if (this.renderer.shadowMap.enabled === on) return;
    this.renderer.shadowMap.enabled = on;
    this.sun.castShadow = on;
    this.shadowGround.visible = on;
    this.scene.background = new THREE.Color(on ? 0xe8ddcd : 0xebebe8);
    this.hemi.groundColor.set(on ? 0xb9a58f : 0x9aa0a8);
    if (on) {
      const box = this.store.worldBounds();
      if (!box.isEmpty()) {
        const c = box.getCenter(new THREE.Vector3());
        const r = Math.max(1, box.getSize(new THREE.Vector3()).length() / 2);
        this.sun.target.position.copy(c);
        this.sun.position.copy(c).add(new THREE.Vector3(0.5, 1.15, 0.6).normalize().multiplyScalar(r * 3));
        const cam = this.sun.shadow.camera;
        cam.left = cam.bottom = -r * 1.5;
        cam.right = cam.top = r * 1.5;
        cam.near = 0.1;
        cam.far = r * 8;
        cam.updateProjectionMatrix();
      }
    }
    this.mats.refresh(); // materials must be rebuilt when shadows switch on or off
  }

  refreshGizmoTarget(): void {
    const { tool, preview } = this.store.ui;
    if (this.poseActive) {
      // Pose mode: the gizmo turns the picked joint
      const bone = !preview && this.store.selectedJoint ? this.poseBones.get(this.store.selectedJoint) : undefined;
      const helper = this.tc.getHelper();
      if (bone) {
        this.tc.setMode('rotate');
        this.tc.setSpace('local');
        if (this.tc.object !== bone) this.tc.attach(bone);
        helper.visible = true;
      } else {
        if (this.tc.object) this.tc.detach();
        helper.visible = false;
      }
      this.requestRender();
      return;
    }
    const sel = this.store.selection;
    let attach: THREE.Object3D | null = null;
    if (this.store.edit) {
      const e = this.store.edit;
      if (!preview && e.sel.length && (tool === 'move' || tool === 'rotate' || tool === 'scale')) attach = this.edit.proxy;
      const helper = this.tc.getHelper();
      if (attach) {
        if (this.tc.object !== attach) this.tc.attach(attach);
        helper.visible = true;
      } else {
        if (this.tc.object) this.tc.detach();
        helper.visible = false;
      }
      this.requestRender();
      return;
    }
    if (!preview && (tool === 'move' || tool === 'rotate' || tool === 'scale') && sel.length === 1) {
      const o = this.store.get(sel[0]);
      const map = this.store.map;
      if (o && effectivelyVisible(map, o) && !isLockedChain(map, o)) attach = this.nodes.get(o.id) ?? null;
    }
    const helper = this.tc.getHelper();
    if (attach) {
      if (this.tc.object !== attach) this.tc.attach(attach);
      helper.visible = true;
    } else {
      if (this.tc.object) this.tc.detach();
      helper.visible = false;
    }
    this.requestRender();
  }

  // ----- gizmo -----

  private onGizmoChange(): void {
    const node = this.tc.object;
    if (!node) return;
    if (this.poseActive && node.userData.jointId) {
      const D = THREE.MathUtils.radToDeg;
      this.store.setJointPose(node.userData.jointId as string, [D(node.rotation.x), D(node.rotation.y), D(node.rotation.z)], false);
      return;
    }
    if (this.store.edit) {
      this.edit.applyDrag();
      return;
    }
    const id = node.userData.id as string;
    if (this.tc.getMode() === 'translate' && this.store.ui.snapObjects) this.snapNodeToObjects(node, id);
    const s = node.scale;
    const size: Vec3 = [Math.max(0.01, Math.abs(s.x)), Math.max(0.01, Math.abs(s.y)), Math.max(0.01, Math.abs(s.z))];
    this.store.update(
      id,
      {
        position: [round(node.position.x), round(node.position.y), round(node.position.z)],
        rotation: [round(node.rotation.x * R2D, 100), round(node.rotation.y * R2D, 100), round(node.rotation.z * R2D, 100)],
        size: [round(size[0]), round(size[1]), round(size[2])],
      },
      false,
    );
  }

  // ----- snapping to other objects -----

  private cacheOtherBoxes(ids?: string[]): void {
    const exclude = new Set<string>();
    const sel = ids ?? this.store.selection;
    for (const id of sel) {
      exclude.add(id);
      const n = this.nodes.get(id);
      n?.traverse((c) => c.userData.id && exclude.add(c.userData.id as string));
    }
    this.otherBoxes = [];
    for (const o of this.store.doc.objects) {
      if (o.kind !== 'shape' || exclude.has(o.id)) continue;
      if (!effectivelyVisible(this.store.map, o)) continue;
      this.otherBoxes.push(this.store.worldBounds([o.id]));
    }
  }

  private snapNodeToObjects(node: THREE.Object3D, id: string): void {
    if (!this.otherBoxes.length) return;
    node.updateMatrixWorld(true);
    const box = this.store.worldBounds([id]);
    // reflect the live node position (the store still holds the previous frame)
    const o = this.store.get(id);
    if (!o) return;
    const live = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
    const prev = new THREE.Vector3().setFromMatrixPosition(this.store.worldMatrixOf(id));
    box.translate(live.clone().sub(prev));
    const thr = Math.max(0.08, this.camera.position.distanceTo(this.controls.target) * 0.02);
    const shift = new THREE.Vector3();
    const axes = ['x', 'y', 'z'] as const;
    for (const a of axes) {
      let best = Infinity;
      for (const ob of this.otherBoxes) {
        const others = axes.filter((x) => x !== a);
        const near = others.every((x) => box.max[x] > ob.min[x] - thr && box.min[x] < ob.max[x] + thr);
        if (!near) continue;
        for (const [d, t] of [
          [box.min[a], ob.max[a]],
          [box.max[a], ob.min[a]],
          [box.min[a], ob.min[a]],
          [box.max[a], ob.max[a]],
        ] as const) {
          const diff = t - d;
          if (Math.abs(diff) < Math.abs(best) && Math.abs(diff) < thr) best = diff;
        }
      }
      if (best !== Infinity) {
        shift[a] = best;
        box.min[a] += best;
        box.max[a] += best;
      }
    }
    if (shift.lengthSq() > 0) {
      const world = live.add(shift);
      if (node.parent) node.parent.worldToLocal(world);
      node.position.copy(world);
    }
  }

  // ----- picking & pointer tools -----

  private ndc(e: { clientX: number; clientY: number }): THREE.Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private pickAt(e: { clientX: number; clientY: number }): Pick | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const map = this.store.map;
    const hits = this.raycaster.intersectObject(this.model, true);
    for (const h of hits) {
      const id = h.object.userData.id as string | undefined;
      if (!id || !h.object.visible || this.store.learnHidden?.has(id)) continue;
      const o = map.get(id);
      if (!o || !effectivelyVisible(map, o)) continue;
      if (isLockedChain(map, o)) continue;
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      return { id, point: h.point.clone(), normalY: n.y };
    }
    return null;
  }

  private topAncestor(id: string): string {
    const map = this.store.map;
    let cur = map.get(id)!;
    while (cur.parent) cur = map.get(cur.parent)!;
    return cur.id;
  }

  private rayOnPlane(e: { clientX: number; clientY: number }, y: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, p);
  }

  private snapV(v: number): number {
    const s = this.store.ui.gridStep;
    return this.store.ui.snapGrid ? Math.round(v / s) * s : v;
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 || this.store.ui.preview || this.tc.dragging || this.spaceDown) return;
    if ((e.target as HTMLElement).closest('.overlay')) return;
    if (!this.store.edit && this.rig.group.visible) {
      this.raycaster.setFromCamera(this.ndc(e), this.camera);
      const joint = this.rig.pick(this.raycaster);
      if (joint) {
        if (this.poseActive) this.store.selectJoint(joint); // in Pose mode a click only picks the joint; the gizmo turns it
        else this.beginJointDrag(e, joint);
        return;
      }
    }
    if (!this.store.edit && this.pivotMarker.visible && this.pivotId) {
      this.raycaster.setFromCamera(this.ndc(e), this.camera);
      const c = this.pivotMarker.position;
      if (this.raycaster.ray.distanceToPoint(c) <= 0.07 + this.raycaster.ray.origin.distanceTo(c) * 0.006) return this.beginPivotDrag(e, this.pivotId);
    }
    if (this.store.edit) return this.edit.pointerDown(e);
    const tool = this.store.ui.tool;

    if (tool === 'shape') return this.beginDraw(e);

    const pick = this.pickAt(e);
    if (tool === 'color') {
      if (pick) this.paint(this.topAncestor(pick.id), e.shiftKey ? pick.id : undefined);
      return;
    }
    if (tool === 'move' || tool === 'rotate' || tool === 'scale') {
      // gizmo handles drags; clicks select / deselect
      this.clickSelect(e, pick);
      return;
    }
    // Select tool: click selects, dragging a selected/clicked object slides it on the ground plane
    if (!pick) return this.clickSelect(e, null);
    const id = this.topAncestor(pick.id);
    if (e.shiftKey) {
      this.clickSelect(e, pick);
      return;
    }
    if (!this.store.selection.includes(id)) this.store.select([id]);
    this.beginSlide(e, id, pick);
  }

  private clickSelect(e: PointerEvent, pick: Pick | null): void {
    const sx = e.clientX;
    const sy = e.clientY;
    const up = (u: PointerEvent) => {
      window.removeEventListener('pointerup', up);
      if (Math.hypot(u.clientX - sx, u.clientY - sy) > 4) return; // it was an orbit/pan
      if (!pick) {
        if (!e.shiftKey) this.store.select([]);
        return;
      }
      const id = this.topAncestor(pick.id);
      if (e.shiftKey) {
        const cur = this.store.selection;
        this.store.select(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
      } else this.store.select([id]);
    };
    window.addEventListener('pointerup', up);
  }

  private onDoubleClick(e: MouseEvent): void {
    const ui = this.store.ui;
    if (ui.preview || ui.tool === 'shape' || ui.tool === 'color' || this.store.edit) return;
    const pick = this.pickAt(e);
    if (!pick) return;
    const already = this.store.selection.length === 1 && this.store.selection[0] === pick.id;
    this.store.select([pick.id]);
    if (already && this.store.get(pick.id)?.kind === 'shape') this.store.enterEdit(pick.id); // double-click again = Edit Shape
  }

  private paint(id: string, only?: string): void {
    const color = this.store.ui.paintColor;
    const ids = only ? [only] : [id, ...this.store.doc.objects.filter((o) => this.isDescendant(o.id, id)).map((o) => o.id)];
    this.store.mutate((d) => {
      for (const o of d.objects) if (ids.includes(o.id) && o.kind === 'shape') o.color = color;
    });
  }

  private isDescendant(id: string, ancestor: string): boolean {
    const map = this.store.map;
    let cur = map.get(id)?.parent ?? null;
    while (cur) {
      if (cur === ancestor) return true;
      cur = map.get(cur)?.parent ?? null;
    }
    return false;
  }

  private beginSlide(e: PointerEvent, id: string, pick: Pick): void {
    const o = this.store.get(id);
    if (!o) return;
    const targets = this.store.selection.length > 1 && this.store.selection.includes(id) ? this.store.topLevelSelection() : [id];
    const start = this.rayOnPlane(e, pick.point.y);
    if (!start) return;
    const startPos = new Map<string, Vec3>(targets.map((t) => [t, [...this.store.get(t)!.position] as Vec3]));
    // parents are only translated/rotated by group ops; convert world delta into the parent's local space
    const parentInv = (tid: string) => {
      const p = this.store.get(tid)!.parent;
      return p ? this.store.worldMatrixOf(p).invert() : new THREE.Matrix4();
    };
    this.cacheOtherBoxes(targets);
    this.controls.enabled = false;
    let moved = false;
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (m: PointerEvent) => {
      if (!moved && Math.hypot(m.clientX - sx, m.clientY - sy) < 4) return;
      moved = true;
      const p = this.rayOnPlane(m, pick.point.y);
      if (!p) return;
      const delta = p.clone().sub(start);
      for (const t of targets) {
        const sp = startPos.get(t)!;
        const local = delta.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(parentInv(t)));
        let nx = sp[0] + local.x;
        let nz = sp[2] + local.z;
        if (this.store.ui.snapGrid) {
          nx = this.snapV(nx);
          nz = this.snapV(nz);
        }
        this.store.update(t, { position: [round(nx), sp[1], round(nz)] }, false);
      }
      if (this.store.ui.snapObjects && targets.length === 1) {
        const node = this.nodes.get(targets[0]);
        if (node) {
          this.snapNodeToObjects(node, targets[0]);
          const pos = node.position;
          this.store.update(targets[0], { position: [round(pos.x), round(pos.y), round(pos.z)] }, false);
        }
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this.controls.enabled = true;
      if (moved) this.store.commit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ----- drawing shapes -----

  private beginDraw(e: PointerEvent): void {
    const pick = this.pickAt(e);
    const baseY = pick && pick.normalY > 0.7 ? round(pick.point.y, 1000) : 0;
    const p0 = this.rayOnPlane(e, baseY);
    if (!p0) return;
    const shape = this.store.ui.shape;
    p0.x = this.snapV(p0.x);
    p0.z = this.snapV(p0.z);
    this.controls.enabled = false;
    const sx = e.clientX;
    const sy = e.clientY;
    let dragged = false;
    let rect = { cx: p0.x, cz: p0.z, w: 1, d: 1 };

    const updateGhost = () => {
      const { size, lift } = shapeDefaults(shape, rect.w, rect.d);
      if (!this.ghost) {
        const params = { segments: 12, taper: 1 };
        const fake = { shape, params } as SceneObject;
        this.ghost = new THREE.Mesh(
          this.geos.get(fake),
          new THREE.MeshStandardMaterial({ color: 0x0d99ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
        );
        this.scene.add(this.ghost);
      }
      this.ghost.scale.set(...size);
      this.ghost.position.set(rect.cx, baseY + lift, rect.cz);
      this.requestRender();
    };
    const move = (m: PointerEvent) => {
      if (!dragged && Math.hypot(m.clientX - sx, m.clientY - sy) < 4) return;
      dragged = true;
      const p1 = this.rayOnPlane(m, baseY);
      if (!p1) return;
      const x1 = this.snapV(p1.x);
      const z1 = this.snapV(p1.z);
      const min = this.store.ui.snapGrid ? this.store.ui.gridStep : 0.1;
      rect = {
        cx: (p0.x + x1) / 2,
        cz: (p0.z + z1) / 2,
        w: Math.max(min, Math.abs(x1 - p0.x)),
        d: Math.max(min, Math.abs(z1 - p0.z)),
      };
      updateGhost();
    };
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key);
      this.controls.enabled = true;
      if (this.ghost) {
        this.ghost.removeFromParent();
        (this.ghost.material as THREE.Material).dispose();
        this.ghost = null;
      }
      this.requestRender();
      if (commit) this.placeShape(shape, rect.cx, rect.cz, dragged ? rect.w : 1, dragged ? rect.d : 1, baseY);
    };
    const up = () => finish(true);
    const key = (k: KeyboardEvent) => {
      if (k.key === 'Escape') finish(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key);
  }

  placeShape(shape: ShapeType, cx: number, cz: number, w: number, d: number, baseY: number): string {
    const { size, lift } = shapeDefaults(shape, w, d);
    const o = this.store.addShape(shape, { position: [round(cx), round(baseY + lift), round(cz)], size });
    this.store.select([o.id]);
    this.store.setUi({ tool: 'select' });
    return o.id;
  }

  // ----- camera -----

  setView(view: ViewName): void {
    const dir = {
      front: new THREE.Vector3(0, 0.0001, 1),
      side: new THREE.Vector3(1, 0.0001, 0),
      top: new THREE.Vector3(0.0001, 1, 0.0001),
      persp: new THREE.Vector3(1, 0.8, 1.15),
    }[view].normalize();
    const dist = this.camera.position.distanceTo(this.controls.target);
    this.flyTo(this.controls.target.clone(), dir.multiplyScalar(dist).add(this.controls.target));
  }

  focus(): void {
    const sel = this.store.selection;
    const box = this.store.worldBounds(sel.length ? sel : undefined);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(0.5, box.getSize(new THREE.Vector3()).length() / 2);
    const dist = (r / Math.sin(THREE.MathUtils.degToRad(this.camera.fov) / 2)) * 1.15;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.flyTo(c, c.clone().add(dir.multiplyScalar(dist)));
  }

  private flyTo(target: THREE.Vector3, pos: THREE.Vector3): void {
    this.tween = {
      t0: performance.now(),
      dur: 260,
      from: this.camera.position.clone(),
      to: pos,
      tFrom: this.controls.target.clone(),
      tTo: target,
    };
    this.requestRender();
  }

  setPreview(on: boolean): void {
    this.store.setUi({ preview: on });
  }

  /** PNG of the current frame (used by tests and for thumbnails). */
  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  // ----- loop -----

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    let animating = false;
    if (this.tween) {
      const k = Math.min(1, (performance.now() - this.tween.t0) / this.tween.dur);
      const e = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(this.tween.from, this.tween.to, e);
      this.controls.target.lerpVectors(this.tween.tFrom, this.tween.tTo, e);
      this.camera.lookAt(this.controls.target);
      if (k >= 1) this.tween = null;
      animating = true;
    }
    if (this.store.ui.preview) {
      this.controls.update();
      animating = true;
    }
    if (this.spinTick()) animating = true;
    if (animating || this.dirty) {
      this.dirty = false;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  };

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.disposers.forEach((d) => d());
    this.edit.dispose();
    this.geos.dispose();
    this.mats.dispose();
    this.renderer.dispose();
  }
}

export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
