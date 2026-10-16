import * as THREE from 'three';

/** Turns that fit exactly in one loop of the clip. */
interface Spinner {
  node: THREE.Object3D;
  axis: 0 | 1 | 2;
  speed: number;
}

export function findSpinners(root: THREE.Object3D): Spinner[] {
  const out: Spinner[] = [];
  root.traverse((n) => {
    const sp = n.userData.spin as { axis: 0 | 1 | 2; speed: number } | undefined;
    if (sp && sp.speed) out.push({ node: n, axis: sp.axis, speed: sp.speed });
  });
  return out;
}

/**
 * One looping animation, "Spin", that turns every spinning object around its own pivot. The slowest object takes one second per
 * turn / its speed to go round once; faster ones go round a whole number of times in that loop, so the loop is seamless.
 */
export function spinClip(root: THREE.Object3D): THREE.AnimationClip | null {
  const spinners = findSpinners(root);
  if (!spinners.length) return null;
  const slowest = Math.min(...spinners.map((s) => Math.abs(s.speed)));
  const duration = 1 / slowest;
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const tracks: THREE.KeyframeTrack[] = [];
  for (const s of spinners) {
    const turns = Math.max(1, Math.round(Math.abs(s.speed) * duration)) * Math.sign(s.speed);
    const steps = Math.max(4, Math.abs(turns) * 8); // at most a quarter turn between keys, so the turn never takes the short way round
    const times: number[] = [];
    const values: number[] = [];
    const base = s.node.quaternion.clone();
    const q = new THREE.Quaternion();
    for (let k = 0; k <= steps; k++) {
      times.push((k / steps) * duration);
      q.copy(base).multiply(new THREE.Quaternion().setFromAxisAngle(axes[s.axis], (k / steps) * Math.PI * 2 * turns));
      values.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${s.node.uuid}.quaternion`, times, values));
  }
  return new THREE.AnimationClip('Spin', duration, tracks);
}
