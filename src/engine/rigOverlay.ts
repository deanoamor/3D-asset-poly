import * as THREE from 'three';
import type { Store } from '../core/store';

const BONE = 0x2bb3a6;
const JOINT = 0xffffff;
const PICKED = 0xff8a1f;

/**
 * The skeleton drawn over the model: a ball at every joint and a pointed bone between a joint and its parent.
 * It is drawn on top of everything (so it can be seen inside a character) and can be picked and dragged.
 */
export class RigOverlay {
  readonly group = new THREE.Group();
  private balls: THREE.Mesh[] = [];
  private key = '';
  private posed: Map<string, [number, number, number]> | null = null;

  constructor(private store: Store) {
    this.group.name = 'rig-overlay';
    this.group.renderOrder = 1000;
  }

  /** Rebuild when the joints (or which one is picked) changed. Returns true if anything was redrawn. */
  sync(posed?: Map<string, [number, number, number]>): boolean {
    this.posed = posed ?? null;
    const rig = this.store.doc.rig ?? [];
    const at3 = (j: { id: string; pos: [number, number, number] }) => this.posed?.get(j.id) ?? j.pos;
    const show = this.store.ui.showRig && !this.store.ui.preview && rig.length > 0;
    const key = show ? `${this.store.selectedJoint}|${rig.map((j) => `${j.id}:${j.parent}:${at3(j).map((v) => v.toFixed(4)).join(',')}`).join(';')}` : 'off';
    if (key === this.key) return false;
    this.key = key;
    this.clear();
    this.group.visible = show;
    if (!show) return true;
    this.draw();
    return true;
  }

  private draw(): void {
    const rig = this.store.doc.rig ?? [];
    const at = new Map(rig.map((j) => [j.id, { ...j, pos: this.posed?.get(j.id) ?? j.pos }]));
    const mat = (c: number, o = 0.95) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, depthWrite: false, transparent: true, opacity: o });
    for (const j of rig) {
      const picked = j.id === this.store.selectedJoint;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(picked ? 0.045 : 0.032, 12, 8), mat(picked ? PICKED : JOINT));
      ball.position.set(...(this.posed?.get(j.id) ?? j.pos));
      ball.renderOrder = 1002;
      ball.userData.jointId = j.id;
      this.group.add(ball);
      this.balls.push(ball);
      const p = j.parent ? at.get(j.parent) : undefined;
      if (!p) continue;
      const a = new THREE.Vector3(...p.pos);
      const b = new THREE.Vector3(...(this.posed?.get(j.id) ?? j.pos));
      const len = a.distanceTo(b);
      if (len < 1e-4) continue;
      // a bone is a stretched diamond: wide near the parent joint, a point at the child
      const w = Math.min(0.045, len * 0.18);
      const g = new THREE.ConeGeometry(w, len, 4, 1, false);
      g.rotateX(Math.PI); // point down
      g.translate(0, len / 2, 0); // tip at the origin, base at +y (toward the parent)
      const bone = new THREE.Mesh(g, mat(BONE, 0.55));
      bone.position.copy(b);
      bone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(b).normalize());
      bone.renderOrder = 1001;
      bone.raycast = () => {};
      this.group.add(bone);
    }
  }

  private clear(): void {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      const m = c as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material)?.dispose();
    }
    this.balls = [];
  }

  /** The joint under the pointer, if any. A slightly bigger target than the ball makes it easy to grab. */
  pick(raycaster: THREE.Raycaster): string | null {
    if (!this.group.visible) return null;
    let best: { id: string; d: number } | null = null;
    for (const b of this.balls) {
      const c = b.position;
      const d = raycaster.ray.distanceToPoint(c);
      const tol = 0.05 + raycaster.ray.origin.distanceTo(c) * 0.006;
      if (d <= tol && (!best || d < best.d)) best = { id: b.userData.jointId as string, d };
    }
    return best?.id ?? null;
  }
}
