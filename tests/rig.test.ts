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

import { PRESETS as ANIM_PRESETS, clipKeys, quatOf, samplePose } from '../src/core/anim';
import type { AnimClip } from '../src/core/types';

describe('animation clips', () => {
  const person = () => {
    const st = new Store(emptyDoc());
    const g = st.addShape('box', { name: 'Hero' });
    st.mutate((d) => { const o = d.objects.find((x) => x.id === g.id)!; o.kind = 'group'; o.position = [0, 0, 0]; });
    st.addJoints(jointsFromSpec(humanSpec(), g.id));
    return { st, g };
  };

  it('ready-made clips use the joints of the person, by name', () => {
    const { st } = person();
    for (const p of ANIM_PRESETS) {
      const id = st.addPresetClip(p.id)!;
      const c = st.clip(id)!;
      expect(c.name.startsWith(p.label)).toBe(true);
      expect(c.loop).toBe(['jump', 'attack', 'hit', 'death', 'crouch'].includes(p.id) ? false : true);
      expect(c.keys.length).toBeGreaterThanOrEqual(3);
      expect(c.keys.every((k) => Object.keys(k.pose).every((j) => st.joint(j)))).toBe(true);
    }
    expect(st.doc.anims).toHaveLength(ANIM_PRESETS.length);
    st.addPresetClip('walk');
    expect(st.doc.anims!.map((c) => c.name)).toContain('Walk 2'); // names stay unique
  });

  it('a walk swings opposite arms and legs, and bends the knee of the leg that passes', () => {
    const { st } = person();
    const c = st.clip(st.addPresetClip('walk')!)!;
    const id = (n: string) => st.doc.rig!.find((j) => j.name === n)!.id;
    const at = (t: number) => samplePose(c, t, st.doc.rig!.map((j) => j.id));
    const quarter = at(0.25);
    expect(quarter[id('Hip Left')][0]).toBeLessThan(-20); // left leg forward (negative X)
    expect(quarter[id('Hip Right')][0]).toBeGreaterThan(20); // right leg back
    expect(quarter[id('Shoulder Left')][0]).toBeGreaterThan(10); // the left arm goes back while the left leg goes forward
    expect(Math.max(...[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((t) => at(t)[id('Knee Left')]?.[0] ?? 0))).toBeGreaterThan(25);
  });

  it('sampling turns smoothly between keys and loops back to the first', () => {
    const clip: AnimClip = { id: 'c', name: 'x', duration: 2, loop: true, keys: [{ t: 0, pose: { a: [0, 0, 0] } }, { t: 1, pose: { a: [0, 0, 90] } }] };
    const mid = samplePose(clip, 0.5, ['a']).a;
    expect(mid[2]).toBeCloseTo(45, 2);
    expect(samplePose(clip, 1, ['a']).a[2]).toBeCloseTo(90, 3);
    expect(samplePose(clip, 1.5, ['a']).a[2]).toBeCloseTo(45, 2); // back toward the start
    expect(samplePose(clip, 2, ['a']).a).toBeUndefined(); // the loop is complete
    const once = { ...clip, loop: false };
    expect(samplePose(once, 5, ['a']).a[2]).toBeCloseTo(90, 3); // holds the last pose
    expect(clipKeys({ ...clip, keys: [clip.keys[1], clip.keys[0]] }).map((k) => k.t)).toEqual([0, 1]);
    expect(quatOf([0, 0, 90]).z).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it('keys are stored, replaced near the same time, sorted and removed', () => {
    const { st } = person();
    const id = st.addClip('Mine')!;
    const j = st.doc.rig!.find((q) => q.name === 'Elbow Left')!.id;
    st.setJointPose(j, [-60, 0, 0]);
    st.setKey(id, 0.5);
    st.setKey(id, 0.51); // within a frame of the last: replaces it
    st.setJointPose(j, [0, 0, 0]);
    st.setKey(id, 0.25);
    const c = st.clip(id)!;
    expect(c.keys.map((k) => k.t)).toEqual([0, 0.25, 0.5]);
    expect(c.keys[2].pose[j]).toEqual([-60, 0, 0]);
    st.setClip(id, { duration: 0.3 });
    expect(st.clip(id)!.keys.map((k) => k.t)).toEqual([0, 0.25, 0.3]); // keys beyond the end come in
    st.removeKey(id, 2);
    st.removeKey(id, 1);
    st.removeKey(id, 0); // the last key stays
    expect(st.clip(id)!.keys).toHaveLength(1);
    st.removeClip(id);
    expect(st.doc.anims).toBeUndefined();
  });

  it('the editable pose can be loaded from a clip, and turning a joint leaves the clip view', () => {
    const { st } = person();
    const c = st.clip(st.addPresetClip('wave')!)!;
    st.setAnimTime(0.4);
    expect(st.animView).toBe(true);
    st.loadPoseFromClip(c.id, 0.4);
    expect(st.animView).toBe(false);
    expect(Object.keys(st.doc.pose!).length).toBeGreaterThan(3);
    st.setAnimTime(0.2);
    st.setJointPose(st.doc.rig![0].id, [5, 0, 0]);
    expect(st.animView).toBe(false);
  });

  it('a deleted character takes its animations along, and a copy gets its own', () => {
    const { st, g } = person();
    st.addPresetClip('walk');
    st.select([g.id]);
    const [copy] = st.duplicateSelected([4, 0, 0]);
    expect(st.doc.anims).toHaveLength(2);
    const mine = st.doc.anims!.find((c) => c.owner === copy)!;
    const ids = new Set(st.doc.rig!.filter((j) => j.owner === copy).map((j) => j.id));
    expect(Object.keys(mine.keys[2].pose).every((k) => ids.has(k))).toBe(true); // the copy's clip turns the copy's joints
    st.select([g.id]);
    st.deleteSelected();
    expect(st.doc.anims).toHaveLength(1);
    expect(st.doc.anims![0].owner).toBe(copy);
  });
});

describe('animation in the exported file', () => {
  it('every clip becomes a glTF animation turning the 22 bones, looping back to its first pose', async () => {
    const { prepareExport } = await import('../src/engine/exporter');
    const { animationClips } = await import('../src/engine/rigExport');
    const st = new Store(emptyDoc('Hero'));
    const g = st.addShape('box', { name: 'Hero' });
    st.mutate((d) => { const o = d.objects.find((x) => x.id === g.id)!; o.kind = 'group'; o.position = [0, 0, 0]; });
    const body = st.addShape('cylinder', { name: 'Body', position: [0, 1, 0], size: [0.4, 1.8, 0.4] });
    st.update(body.id, { parent: g.id });
    st.addJoints(jointsFromSpec(humanSpec(), g.id));
    st.addPresetClip('walk');
    st.addPresetClip('idle');
    const { root } = prepareExport(st.doc);
    const clips = animationClips(root, st.doc);
    expect(clips.map((c) => c.name)).toEqual(['Walk', 'Idle']);
    const walk = clips[0];
    expect(walk.tracks.filter((t) => t.name.endsWith('.quaternion'))).toHaveLength(22);
    expect(walk.duration).toBeCloseTo(1, 5);
    const t = walk.tracks[0];
    expect(t.name.endsWith('.quaternion')).toBe(true);
    expect(t.times[0]).toBe(0);
    expect(t.times[t.times.length - 1]).toBeCloseTo(1, 5); // a looping clip ends where it began
    const v = t.values;
    const first = [v[0], v[1], v[2], v[3]];
    const last = [v[v.length - 4], v[v.length - 3], v[v.length - 2], v[v.length - 1]];
    expect(first.every((x, i) => Math.abs(x - last[i]) < 1e-5) || first.every((x, i) => Math.abs(x + last[i]) < 1e-5)).toBe(true);
    // consecutive quaternions are on the same side, so a turn never takes the long way round
    for (const tr of walk.tracks.filter((x) => x.name.endsWith('.quaternion'))) for (let i = 4; i < tr.values.length; i += 4) {
      const dot = tr.values[i] * tr.values[i - 4] + tr.values[i + 1] * tr.values[i - 3] + tr.values[i + 2] * tr.values[i - 2] + tr.values[i + 3] * tr.values[i - 1];
      expect(dot).toBeGreaterThanOrEqual(0);
    }
    // the knee really moves during the walk
    const knee = walk.tracks.find((tr) => root.getObjectByProperty('uuid', tr.name.split('.')[0])?.name === 'Knee Left')!;
    const xs: number[] = [];
    for (let i = 0; i < knee.values.length; i += 4) xs.push(knee.values[i]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.2);
  });

  it('a turned character animates in its own frame (forward is its forward)', async () => {
    const { prepareExport } = await import('../src/engine/exporter');
    const st = new Store(emptyDoc('Hero'));
    const g = st.addShape('box', { name: 'Hero' });
    st.mutate((d) => { const o = d.objects.find((x) => x.id === g.id)!; o.kind = 'group'; o.position = [0, 0, 0]; o.rotation = [0, 90, 0]; });
    const body2 = st.addShape('cylinder', { name: 'Body', position: [0, 1, 0] });
    st.update(body2.id, { parent: g.id });
    st.addJoints(jointsFromSpec(humanSpec(), g.id));
    const { root } = prepareExport(st.doc);
    const hips = root.getObjectByName('Hips')!;
    const q = hips.quaternion;
    expect(Math.abs(q.y)).toBeCloseTo(Math.SQRT1_2, 3); // the root bone stands turned 90 degrees, like the character
  });
});

describe('more animations, easing, root motion, materials', () => {
  const hero = () => {
    const st = new Store(emptyDoc('Hero'));
    const g = st.addShape('box', { name: 'Hero' });
    st.mutate((d) => { const o = d.objects.find((x) => x.id === g.id)!; o.kind = 'group'; o.position = [0, 0, 0]; });
    const body = st.addShape('cylinder', { name: 'Body', position: [0, 1, 0], size: [0.4, 1.8, 0.4] });
    st.update(body.id, { parent: g.id });
    st.addJoints(jointsFromSpec(humanSpec(), g.id));
    return st;
  };

  it('has Jump, Attack, Hit, Death, Crouch and Strafe with consistent names', () => {
    const names = ANIM_PRESETS.map((p) => p.label);
    for (const n of ['Walk', 'Run', 'Idle', 'Wave', 'Jump', 'Attack', 'Hit', 'Death', 'Crouch', 'Strafe']) expect(names).toContain(n);
    const st = hero();
    for (const p of ANIM_PRESETS) expect(st.addPresetClip(p.id)).toBeTruthy();
    const clips = st.doc.anims!;
    expect(clips.map((c) => c.name)).toEqual(ANIM_PRESETS.map((p) => p.label));
    expect(clips.find((c) => c.name === 'Jump')!.loop).toBe(false);
    expect(clips.find((c) => c.name === 'Walk')!.loop).toBe(true);
  });

  it('Jump lifts the hips (root motion) and Death lays the character down', async () => {
    const { sampleRoot } = await import('../src/core/anim');
    const st = hero();
    st.addPresetClip('jump');
    st.addPresetClip('death');
    const jump = st.doc.anims!.find((c) => c.name === 'Jump')!;
    const ys = jump.keys.map((k) => k.root?.[1] ?? 0);
    expect(Math.max(...ys)).toBeGreaterThan(0.2);
    expect(Math.min(...ys)).toBeLessThan(-0.05);
    const death = st.doc.anims!.find((c) => c.name === 'Death')!;
    expect(sampleRoot(death, death.duration)![1]).toBeLessThan(-0.5);
  });

  it('easing changes how a turn is spread over time; linear stays the default', () => {
    const clip: AnimClip = { id: 'c', name: 'c', duration: 1, loop: false, keys: [{ t: 0, pose: {} }, { t: 1, pose: { j: [100, 0, 0] } }] };
    const lin = samplePose(clip, 0.25, ['j']).j[0];
    const inn = samplePose({ ...clip, ease: 'in' }, 0.25, ['j']).j[0];
    const out = samplePose({ ...clip, ease: 'out' }, 0.25, ['j']).j[0];
    expect(lin).toBeCloseTo(25, 0);
    expect(inn).toBeLessThan(lin);
    expect(out).toBeGreaterThan(lin);
  });

  it('root motion is edited per key and exported as a position track on the hips', async () => {
    const { prepareExport } = await import('../src/engine/exporter');
    const { animationClips } = await import('../src/engine/rigExport');
    const st = hero();
    st.addClip();
    const id = st.doc.anims![0].id;
    st.setKey(id, 0.5);
    st.setKeyRoot(id, 1, [0, 0, 2]);
    expect(st.doc.anims![0].keys[1].root).toEqual([0, 0, 2]);
    st.setKey(id, 0.5); // storing a pose again keeps the move
    expect(st.doc.anims![0].keys[1].root).toEqual([0, 0, 2]);
    st.setClip(id, { ease: 'smooth' });
    expect(st.doc.anims![0].ease).toBe('smooth');
    const { root } = prepareExport(st.doc);
    const clip = animationClips(root, st.doc)[0];
    const pos = clip.tracks.filter((t) => t.name.endsWith('.position'));
    expect(pos).toHaveLength(1);
    const z = pos[0].values;
    const zs = z.filter((_: number, i: number) => i % 3 === 2);
    expect(Math.max(...zs) - zs[0]).toBeCloseTo(2, 3);
  });

  it('roughness, metal and glow reach the exported material', async () => {
    const { prepareExport } = await import('../src/engine/exporter');
    const st = new Store(emptyDoc('Lamp'));
    const a = st.addShape('sphere', { name: 'Bulb' });
    st.setMaterial([a.id], { rough: 0.2, metal: 0.9, glow: 0.7 });
    expect(st.get(a.id)!.mat).toEqual({ rough: 0.2, metal: 0.9, glow: 0.7 });
    const { root } = prepareExport(st.doc);
    let m: any;
    root.traverse((o: any) => { if (o.isMesh) m = o.material; });
    expect(m.roughness).toBeCloseTo(0.2);
    expect(m.metalness).toBeCloseTo(0.9);
    expect(m.emissiveIntensity).toBeCloseTo(0.7);
    st.setMaterial([a.id], { rough: 0.85, metal: 0, glow: 0 });
    expect(st.get(a.id)!.mat).toBeUndefined();
  });
});
