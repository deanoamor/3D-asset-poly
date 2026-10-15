import { describe, expect, it } from 'vitest';
import { Store, emptyDoc } from '../src/core/store';
import { skinWeights } from '../src/core/skin';
import { HUMAN, humanSpec, jointsFromSpec } from '../src/core/library/rigs';
import type { Joint } from '../src/core/types';

const arm = (): Joint[] => [
  { id: 'a', name: 'Shoulder', parent: null, pos: [0, 2, 0] },
  { id: 'b', name: 'Elbow', parent: 'a', pos: [0, 1, 0] },
  { id: 'c', name: 'Wrist', parent: 'b', pos: [0, 0, 0] },
];

describe('skeleton in the project', () => {
  it('adds joints as a tree and selects the new one', () => {
    const st = new Store(emptyDoc());
    const a = st.addJoint({ parent: null, pos: [0, 1, 0], name: 'Hips' });
    const b = st.addJoint({ pos: [0, 1.5, 0] });
    expect(st.selectedJoint).toBe(b);
    expect(st.joint(b)!.parent).toBe(a);
    expect(st.doc.rig).toHaveLength(2);
  });

  it('moves a joint alone, or with everything below it, and undoes', () => {
    const st = new Store(emptyDoc());
    st.addJoints(arm());
    st.moveJoint('b', [1, 1, 0]);
    expect(st.joint('b')!.pos).toEqual([1, 1, 0]);
    expect(st.joint('c')!.pos).toEqual([0, 0, 0]);
    st.moveJoint('a', [0, 3, 0], { withChildren: true });
    expect(st.joint('c')!.pos).toEqual([0, 1, 0]); // moved up by 1 with the parent
    expect(st.joint('b')!.pos).toEqual([1, 2, 0]);
    st.undo();
    expect(st.joint('a')!.pos).toEqual([0, 2, 0]);
  });

  it('deleting a joint keeps the chain whole, and loops are refused', () => {
    const st = new Store(emptyDoc());
    st.addJoints(arm());
    expect(st.setJointParent('a', 'c')).toMatch(/cannot hang/);
    st.deleteJoint('b');
    expect(st.joint('c')!.parent).toBe('a');
    expect(st.doc.rig).toHaveLength(2);
    st.deleteJoint('a');
    st.deleteJoint('c');
    expect(st.doc.rig).toBeUndefined();
  });

  it('a character takes its skeleton with it when deleted', () => {
    const st = new Store(emptyDoc());
    const g = st.addShape('box', { name: 'Body' }).id;
    st.addJoints(arm().map((j) => ({ ...j, owner: g })));
    st.select([g]);
    st.deleteSelected();
    expect(st.doc.rig).toBeUndefined();
  });
});

describe('automatic skin weights', () => {
  it('a point in the middle of a bone follows only that bone’s joint', () => {
    const s = skinWeights([0.02, 1.5, 0], arm(), false);
    expect(s.index[0]).toBe(0); // shoulder moves the upper arm
    expect(s.weight[0]).toBeGreaterThan(0.95);
    const q = skinWeights([0.02, 0.5, 0], arm(), false);
    expect(q.index[0]).toBe(1); // elbow moves the forearm
    expect(q.weight[0]).toBeGreaterThan(0.95);
  });

  it('near an elbow the weight is shared, so it bends smoothly', () => {
    const s = skinWeights([0.05, 1.0, 0], arm(), false);
    const w = new Map([0, 1, 2].map((k) => [s.index[k], s.weight[k]]));
    expect(w.get(0)).toBeGreaterThan(0.2);
    expect(w.get(1)).toBeGreaterThan(0.2);
    expect([...w.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it('a rigid piece follows one joint', () => {
    const pts = [0.1, 1.5, 0, -0.1, 1.55, 0, 0, 1.45, 0.1];
    const s = skinWeights(pts, arm(), true);
    for (let v = 0; v < 3; v++) {
      expect(s.index[v * 4]).toBe(0);
      expect(s.weight[v * 4]).toBe(1);
    }
  });
});

describe('person skeleton', () => {
  it('has the usual joints, a single root, and mirrored sides', () => {
    const spec = humanSpec();
    expect(spec).toHaveLength(22);
    expect(spec.filter((s) => s.parent === null).map((s) => s.key)).toEqual(['hips']);
    const byKey = new Map(spec.map((s) => [s.key, s]));
    expect(byKey.get('kneeL')!.pos[0]).toBeCloseTo(-byKey.get('kneeR')!.pos[0], 6);
    expect(byKey.get('elbowL')!.pos[0]).toBeCloseTo(HUMAN.elbow[0], 6);
    const j = jointsFromSpec(spec, 'g1', [5, 0, 0]);
    expect(j.every((q) => q.owner === 'g1')).toBe(true);
    expect(j.find((q) => q.name === 'Hips')!.pos[0]).toBe(5);
    const ids = new Set(j.map((q) => q.id));
    expect(j.every((q) => q.parent === null || ids.has(q.parent))).toBe(true);
  });
});

describe('skeleton in the exported file', () => {
  it('turns shapes into skinned meshes under an armature, standing on the floor', async () => {
    const { prepareExport } = await import('../src/engine/exporter');
    const st = new Store(emptyDoc('Test Arm'));
    st.addShape('cylinder', { name: 'Arm', position: [0, 1, 0], size: [0.3, 2, 0.3], color: '#d64545' });
    st.addShape('box', { name: 'Cuff', position: [0, 0.1, 0], size: [0.2, 0.15, 0.2] });
    st.addJoints(arm());
    const { root } = prepareExport(st.doc);
    const skinned: string[] = [];
    const bones: string[] = [];
    let armature = '';
    root.traverse((o) => {
      if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinned.push(o.name);
      if ((o as { isBone?: boolean }).isBone) bones.push(o.name);
      if (o.name === 'Armature') armature = o.name;
    });
    expect(skinned).toEqual(['Skinned Model']); // all parts merged into one skinned mesh, so the file has a single skin
    expect(bones.sort()).toEqual(['Elbow', 'Shoulder', 'Wrist']);
    expect(armature).toBe('Armature');
    // the joints moved with the model, so the wrist (y = 0 before) is still at the bottom of the model
    const w = root.getObjectByName('Wrist')!;
    const sh = root.getObjectByName('Shoulder')!;
    const pw = new (w.position.constructor as new () => typeof w.position)();
    w.getWorldPosition(pw);
    const ps = new (w.position.constructor as new () => typeof w.position)();
    sh.getWorldPosition(ps);
    expect(ps.y - pw.y).toBeCloseTo(2, 4);
    const sm = root.getObjectByName('Skinned Model') as unknown as { geometry: { getAttribute: (n: string) => { count: number } }; skeleton: { bones: unknown[]; boneInverses: unknown[] } };
    expect(sm.geometry.getAttribute('skinIndex').count).toBe(sm.geometry.getAttribute('position').count);
    expect(sm.skeleton.bones).toHaveLength(3);
    expect(sm.skeleton.boneInverses).toHaveLength(3);
  });

  it('a project without joints exports exactly as before', async () => {
    const { prepareExport } = await import('../src/engine/exporter');
    const st = new Store(emptyDoc('Plain'));
    st.addShape('box', { name: 'Box' });
    let skinned = 0;
    prepareExport(st.doc).root.traverse((o) => (o as { isSkinnedMesh?: boolean }).isSkinnedMesh && skinned++);
    expect(skinned).toBe(0);
  });
});
