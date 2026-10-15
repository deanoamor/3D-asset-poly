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

describe('export option', () => {
  it('can leave the skeleton out, keeping parts separate and named', async () => {
    const { docForExport, prepareExport } = await import('../src/engine/exporter');
    const st = new Store(emptyDoc('Opt'));
    st.addShape('box', { name: 'Torso' });
    st.addJoints(arm());
    const names = (skeleton: boolean) => {
      const out: string[] = [];
      let skinned = 0;
      prepareExport(docForExport(st.doc, skeleton)).root.traverse((o) => {
        out.push(o.name);
        if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinned++;
      });
      return { out, skinned };
    };
    expect(names(true).skinned).toBe(1);
    const off = names(false);
    expect(off.skinned).toBe(0);
    expect(off.out).toContain('Torso');
    expect(off.out).not.toContain('Shoulder');
  });
});

describe('pose', () => {
  it('turns a joint, forgets zero and unknown joints, and undoes', () => {
    const st = new Store(emptyDoc());
    st.addJoints(arm());
    st.setJointPose('b', [0, 0, 90]);
    expect(st.doc.pose).toEqual({ b: [0, 0, 90] });
    st.setJointPose('b', [0, 0, 0]);
    expect(st.doc.pose).toBeUndefined(); // zero = rest
    st.setJointPose('b', [10, 0, 0]);
    st.setJointPose('c', [0, 20, 0]);
    st.resetPose('b');
    expect(Object.keys(st.doc.pose!)).toEqual(['c']);
    st.deleteJoint('c');
    expect(st.doc.pose).toBeUndefined(); // the joint is gone, so is its pose
    st.undo();
    expect(st.doc.pose).toEqual({ c: [0, 20, 0] });
    st.resetPose();
    expect(st.doc.pose).toBeUndefined();
  });

  it('the pose is baked into the exported mesh: the forearm swings out sideways', async () => {
    const { prepareExport } = await import('../src/engine/exporter');
    const st = new Store(emptyDoc('Posed'));
    st.addShape('cylinder', { name: 'Arm', position: [0, 1, 0], size: [0.3, 2, 0.3] });
    st.addJoints(arm());
    const width = (doc: typeof st.doc) => {
      const { root } = prepareExport(doc);
      const sm = root.getObjectByName('Skinned Model') as unknown as { geometry: { boundingBox: { min: { x: number }; max: { x: number } } | null; computeBoundingBox: () => void } };
      sm.geometry.computeBoundingBox();
      return sm.geometry.boundingBox!.max.x - sm.geometry.boundingBox!.min.x;
    };
    const rest = width(st.doc);
    expect(rest).toBeLessThan(0.5);
    st.setJointPose('b', [0, 0, 90]);
    expect(width(st.doc)).toBeGreaterThan(0.9); // the lower half now points sideways
  });
});

describe('a skeleton follows its character', () => {
  it('moving, turning and resizing the group carries the joints along', () => {
    const st = new Store(emptyDoc());
    const g = st.addShape('box', { name: 'Body' });
    st.mutate((d) => { const o = d.objects.find((x) => x.id === g.id)!; o.kind = 'group'; o.position = [0, 0, 0]; });
    st.addJoints(arm().map((j) => ({ ...j, owner: g.id })));
    st.update(g.id, { position: [3, 0, 2] });
    expect(st.joint('a')!.pos).toEqual([3, 2, 2]);
    expect(st.joint('c')!.pos).toEqual([3, 0, 2]);
    st.update(g.id, { position: [0, 0, 0] });
    st.update(g.id, { size: [2, 2, 2] });
    expect(st.joint('a')!.pos[1]).toBeCloseTo(4, 4);
    st.update(g.id, { size: [1, 1, 1] });
    st.update(g.id, { rotation: [0, 0, 90] }); // lying down: the arm now points along X
    expect(st.joint('a')!.pos[0]).toBeCloseTo(-2, 4);
    expect(st.joint('a')!.pos[1]).toBeCloseTo(0, 4);
    st.undo();
    st.undo();
    expect(st.joint('a')!.pos[1]).toBeCloseTo(4, 3); // back to the doubled size: undo keeps joints and group in step
  });

  it('moving a joint on its own does not move the character', () => {
    const st = new Store(emptyDoc());
    const g = st.addShape('box', { name: 'Body' });
    st.mutate((d) => { const o = d.objects.find((x) => x.id === g.id)!; o.kind = 'group'; o.position = [0, 0, 0]; });
    st.addJoints(arm().map((j) => ({ ...j, owner: g.id })));
    st.moveJoint('b', [1, 1, 0]);
    expect(st.get(g.id)!.position).toEqual([0, 0, 0]);
    expect(st.joint('a')!.pos).toEqual([0, 2, 0]);
  });
});

describe('duplicating a character', () => {
  it('copies the skeleton and the pose, standing where the copy stands', () => {
    const st = new Store(emptyDoc());
    const g = st.addShape('box', { name: 'Hero' });
    st.mutate((d) => { const o = d.objects.find((x) => x.id === g.id)!; o.kind = 'group'; o.position = [0, 0, 0]; });
    st.addJoints(arm().map((j) => ({ ...j, owner: g.id })));
    st.setJointPose('b', [0, 0, 40]);
    st.select([g.id]);
    const [copy] = st.duplicateSelected([5, 0, 0]);
    const rig = st.doc.rig!;
    expect(rig).toHaveLength(6);
    const mine = rig.filter((j) => j.owner === copy);
    expect(mine).toHaveLength(3);
    expect(new Set(rig.map((j) => j.id)).size).toBe(6); // every joint has its own id
    expect(mine.find((j) => j.name === 'Shoulder')!.pos).toEqual([5, 2, 0]);
    expect(mine.find((j) => j.name === 'Wrist')!.parent).toBe(mine.find((j) => j.name === 'Elbow')!.id); // the tree is rebuilt on the copy
    expect(rig.filter((j) => j.owner === g.id).map((j) => j.pos)).toEqual([[0, 2, 0], [0, 1, 0], [0, 0, 0]]); // the original stays put
    expect(Object.keys(st.doc.pose!)).toHaveLength(2);
    // moving the copy leaves the original's skeleton alone
    st.update(copy, { position: [8, 0, 0] });
    expect(st.doc.rig!.find((j) => j.owner === g.id && j.name === 'Shoulder')!.pos).toEqual([0, 2, 0]);
    expect(st.doc.rig!.find((j) => j.owner === copy && j.name === 'Shoulder')!.pos).toEqual([8, 2, 0]);
    st.undo();
    st.undo();
    expect(st.doc.rig).toHaveLength(3); // undo removes the copy and its skeleton together
  });

  it('a character without a skeleton duplicates as before', () => {
    const st = new Store(emptyDoc());
    const o = st.addShape('box', { name: 'Crate' });
    st.select([o.id]);
    st.duplicateSelected();
    expect(st.doc.rig).toBeUndefined();
    expect(st.doc.objects).toHaveLength(2);
  });
});
