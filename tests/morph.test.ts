import { beforeAll, describe, expect, it } from 'vitest';
import { Store, emptyDoc } from '../src/core/store';
import { humanSpec, jointsFromSpec } from '../src/core/library/rigs';

beforeAll(() => {
  // GLTFExporter reads blobs with FileReader, which node does not have
  (globalThis as any).FileReader ??= class {
    result: unknown = null;
    onloadend: null | (() => void) = null;
    readAsArrayBuffer(b: Blob) { void b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); }
    readAsDataURL(b: Blob) { void b.arrayBuffer().then((r) => { this.result = `data:${b.type};base64,${Buffer.from(r).toString('base64')}`; this.onloadend?.(); }); }
  };
});

const jsonOf = (data: ArrayBuffer) => {
  const dv = new DataView(data);
  const len = dv.getUint32(12, true);
  const bin = new Uint8Array(data, 20 + len + 8);
  return { json: JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, len))), bin };
};

const face = () => {
  const st = new Store(emptyDoc('Face'));
  const head = st.addShape('sphere', { name: 'Head', position: [0, 1.5, 0], size: [0.6, 0.6, 0.6] });
  const mouth = st.addShape('box', { name: 'Mouth', position: [0, 1.4, 0.3], size: [0.2, 0.05, 0.05] });
  st.addShape('box', { name: 'Body', position: [0, 0.6, 0], size: [0.6, 1, 0.35] });
  return { st, head, mouth };
};

describe('expressions in the project', () => {
  it('records only what changed, puts the model back, and previews by weight', () => {
    const { st, mouth } = face();
    st.startMorph('Smile');
    st.update(mouth.id, { size: [0.4, 0.05, 0.05], position: [0, 1.38, 0.3] }, false);
    expect(st.finishMorph()).toBe(true);
    expect(st.doc.morphs).toHaveLength(1);
    expect(Object.keys(st.doc.morphs![0].parts)).toEqual([mouth.id]);
    expect(st.get(mouth.id)!.size).toEqual([0.2, 0.05, 0.05]); // the model is as it was
    const id = st.doc.morphs![0].id;
    st.setMorphWeight(id, 0.5);
    expect(st.morphedObject(st.get(mouth.id)!).size[0]).toBeCloseTo(0.3, 5);
    st.setMorphWeight(id, 0);
    expect(st.morphedObject(st.get(mouth.id)!)).toBe(st.get(mouth.id));
  });

  it('nothing changed = no expression; cancel restores; remove forgets', () => {
    const { st, mouth } = face();
    st.startMorph('Nothing');
    expect(st.finishMorph()).toBe(false);
    expect(st.doc.morphs).toBeUndefined();
    st.startMorph('Oops');
    st.update(mouth.id, { position: [1, 1, 1] }, false);
    st.cancelMorph();
    expect(st.get(mouth.id)!.position).toEqual([0, 1.4, 0.3]);
    st.startMorph('A');
    st.update(mouth.id, { size: [0.3, 0.05, 0.05] }, false);
    st.finishMorph();
    st.removeMorph(st.doc.morphs![0].id);
    expect(st.doc.morphs).toBeUndefined();
  });

  it('editing an expression shows it, and saving replaces it', () => {
    const { st, mouth } = face();
    st.startMorph('Smile');
    st.update(mouth.id, { size: [0.4, 0.05, 0.05] }, false);
    st.finishMorph();
    const id = st.doc.morphs![0].id;
    st.editMorph(id);
    expect(st.get(mouth.id)!.size[0]).toBeCloseTo(0.4);
    st.update(mouth.id, { size: [0.5, 0.05, 0.05] }, false);
    st.finishMorph('Big smile');
    expect(st.doc.morphs).toHaveLength(1);
    expect(st.doc.morphs![0].name).toBe('Big smile');
    expect(st.doc.morphs![0].parts[mouth.id].size![0]).toBeCloseTo(0.5);
    expect(st.get(mouth.id)!.size[0]).toBeCloseTo(0.2);
  });

  it('deleting the part forgets its expression', () => {
    const { st, mouth } = face();
    st.startMorph('Smile');
    st.update(mouth.id, { size: [0.4, 0.05, 0.05] }, false);
    st.finishMorph();
    st.select([mouth.id]);
    st.deleteSelected();
    expect(st.doc.morphs).toBeUndefined();
  });
});

describe('morph targets in the exported file', () => {
  it('separate parts: the mouth mesh gets a Smile target that moves its points', async () => {
    const { exportFiles } = await import('../src/engine/exporter');
    const { st, mouth } = face();
    st.startMorph('Smile');
    st.update(mouth.id, { size: [0.5, 0.05, 0.05] }, false);
    st.finishMorph();
    const res = await exportFiles(st.doc, { format: 'glb', collision: false });
    expect(res.morphs).toEqual(['Smile']);
    const { json } = jsonOf(res.model.data as ArrayBuffer);
    const withTargets = json.meshes.filter((m: any) => m.primitives[0].targets);
    expect(withTargets).toHaveLength(1);
    expect(withTargets[0].extras.targetNames).toEqual(['Smile']);
    expect(json.meshes.length).toBe(3);
    const off = await exportFiles(st.doc, { format: 'glb', collision: false, morphs: false });
    expect(jsonOf(off.model.data as ArrayBuffer).json.meshes.every((m: any) => !m.primitives[0].targets)).toBe(true);
  });

  it('a character with a skeleton: ONE skinned mesh carries every target', async () => {
    const { exportFiles } = await import('../src/engine/exporter');
    const st = new Store(emptyDoc('Hero'));
    const g = st.addShape('box', { name: 'Hero' });
    st.mutate((d) => { const o = d.objects.find((x) => x.id === g.id)!; o.kind = 'group'; o.position = [0, 0, 0]; });
    const head = st.addShape('sphere', { name: 'Head', position: [0, 1.6, 0], size: [0.4, 0.4, 0.4] });
    const body = st.addShape('box', { name: 'Body', position: [0, 0.9, 0], size: [0.5, 1, 0.3] });
    st.update(head.id, { parent: g.id });
    st.update(body.id, { parent: g.id });
    st.addJoints(jointsFromSpec(humanSpec(), g.id));
    st.startMorph('Big head');
    st.update(head.id, { size: [0.7, 0.7, 0.7] }, false);
    st.finishMorph();
    st.startMorph('Fat');
    st.update(body.id, { size: [0.9, 1, 0.6] }, false);
    st.finishMorph();
    const res = await exportFiles(st.doc, { format: 'glb', collision: false });
    expect(res.morphs.sort()).toEqual(['Big head', 'Fat']);
    const { json } = jsonOf(res.model.data as ArrayBuffer);
    expect(json.skins).toHaveLength(1);
    expect(json.meshes).toHaveLength(1);
    expect(json.meshes[0].primitives[0].targets).toHaveLength(2);
    expect(json.meshes[0].extras.targetNames.sort()).toEqual(['Big head', 'Fat']);
    // the target really moves points (the accessor has a non-zero range)
    const acc = json.accessors[json.meshes[0].primitives[0].targets[0].POSITION];
    expect(Math.max(...acc.max.map(Math.abs), ...acc.min.map(Math.abs))).toBeGreaterThan(0.05);
  });

  it('still has its targets after meshopt compression', async () => {
    const { exportFiles } = await import('../src/engine/exporter');
    const { st, mouth } = face();
    st.startMorph('Smile');
    st.update(mouth.id, { size: [0.5, 0.05, 0.05] }, false);
    st.finishMorph();
    const res = await exportFiles(st.doc, { format: 'glb', collision: false, compress: true });
    const { json } = jsonOf(res.model.data as ArrayBuffer);
    expect(json.extensionsUsed).toContain('EXT_meshopt_compression');
    expect(json.meshes.some((m: any) => m.primitives[0].targets && m.extras?.targetNames?.[0] === 'Smile')).toBe(true);
  });
});
