import { describe, expect, it } from 'vitest';
import { ASSETS, assetStats, instantiateAsset } from '../src/core/assets';
import { Store, emptyDoc, polyStats } from '../src/core/store';
import { consistentWinding, isClosed, signedVolume } from '../src/core/mesh';
import { worldMatrix } from '../src/core/docmath';

describe('asset library', () => {
  it('has the four assets', () => {
    expect(ASSETS.map((a) => a.id)).toEqual(['police', 'car', 'house', 'footballer']);
  });

  for (const def of ASSETS) {
    describe(def.name, () => {
      it('every part belongs to a real step and every step adds something', () => {
        for (const p of def.parts) expect(p.step).toBeGreaterThanOrEqual(0), expect(p.step).toBeLessThan(def.steps.length);
        def.steps.forEach((_, i) => expect(def.parts.some((p) => p.step === i)).toBe(true));
        expect(def.steps.every((s) => s.title && s.text.length > 40 && s.tools.length > 0)).toBe(true);
        expect(def.learn.length).toBeGreaterThanOrEqual(3);
        expect(def.challenge.length).toBeGreaterThan(20);
      });

      it('has unique, readable part names and sensible sizes', () => {
        const names = def.parts.map((p) => p.name);
        expect(new Set(names).size).toBe(names.length);
        for (const p of def.parts) expect(p.size.every((n) => n > 0)).toBe(true);
      });

      it('stands on the ground and is a believable size', () => {
        const { parts } = instantiateAsset(def);
        const st = new Store(emptyDoc());
        const { group } = instantiateAsset(def);
        st.mutate((d) => d.objects.push(group, ...parts.map((o) => ({ ...o, parent: group.id }))));
        const b = st.worldBounds();
        expect(b.min.y).toBeGreaterThanOrEqual(-0.001);
        expect(b.min.y).toBeLessThan(0.05);
        const s = assetStats(def);
        if (def.id === 'car') expect(s.depth).toBeGreaterThan(3.5);
        if (def.id === 'house') expect(s.width).toBeGreaterThan(7);
        if (def.id === 'police' || def.id === 'footballer') expect(s.height).toBeGreaterThan(1.6), expect(s.height).toBeLessThan(2.1);
      });

      it('fits the mobile triangle budget with room to spare', () => {
        const { group, parts } = instantiateAsset(def);
        const st = new Store(emptyDoc('t', 'mobile'));
        st.mutate((d) => d.objects.push(group, ...parts));
        const stats = polyStats(st.doc);
        expect(stats.total).toBe(assetStats(def).triangles);
        expect(stats.total).toBeLessThan(1500);
        expect(stats.status).toBe('green');
      });

      it('edited parts are solid, closed shapes', () => {
        for (const p of instantiateAsset(def).parts) {
          if (!p.mesh) continue;
          expect(isClosed(p.mesh)).toBe(true);
          expect(consistentWinding(p.mesh)).toBe(true);
          expect(signedVolume(p.mesh)).toBeGreaterThan(0.1);
        }
      });
    });
  }

  it('inserting twice gives unique ids and names', () => {
    const names = new Set<string>();
    const a = instantiateAsset(ASSETS[1], [0, 0, 0], names);
    const b = instantiateAsset(ASSETS[1], [6, 0, 0], names);
    expect(a.group.name).toBe('Car');
    expect(b.group.name).toBe('Car 2');
    const ids = [a.group, ...a.parts, b.group, ...b.parts].map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('parts follow the group when it moves', () => {
    const { group, parts } = instantiateAsset(ASSETS[0], [10, 0, 0]);
    const st = new Store(emptyDoc());
    st.mutate((d) => d.objects.push(group, ...parts));
    const torso = parts.find((p) => p.name === 'Torso')!;
    expect(worldMatrix(st.doc, torso.id).elements[12]).toBeCloseTo(10, 5);
  });

  it('the roof is a gable (8 triangles) and the cabin is a narrower-topped box', () => {
    const roof = instantiateAsset(ASSETS[2]).parts.find((p) => p.name === 'Roof')!;
    expect(roof.mesh!.f.reduce((a, f) => a + f.length - 2, 0)).toBe(8);
    const cabin = instantiateAsset(ASSETS[1]).parts.find((p) => p.name === 'Cabin')!;
    const topX = Math.max(...cabin.mesh!.v.filter((_, i) => i % 3 === 0 && cabin.mesh!.v[i + 1] > 0));
    expect(topX).toBeCloseTo(0.4, 5);
  });
});
