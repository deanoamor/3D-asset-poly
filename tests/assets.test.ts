import { describe, expect, it } from 'vitest';
import { ASSETS, assetStats, instantiateAsset } from '../src/core/assets';
import { Store, emptyDoc, polyStats } from '../src/core/store';
import { consistentWinding, isClosed, signedVolume } from '../src/core/mesh';
import { worldMatrix } from '../src/core/docmath';

describe('asset library', () => {
  it('has the sixteen assets', () => {
    expect(ASSETS.map((a) => a.id)).toEqual(['police', 'car', 'house', 'footballer', 'soldier', 'island', 'anime', 'ribbon', 'nurse', 'school', 'casual', 'gamenurse', 'firefighter', 'seifuku', 'japanhouse', 'japanschool']);
  });

  for (const def of ASSETS) {
    describe(def.name, () => {
      it('every part belongs to a real step and every step adds something', () => {
        for (const p of def.parts) expect(p.step).toBeGreaterThanOrEqual(0), expect(p.step).toBeLessThan(def.steps.length);
        def.steps.forEach((st, i) => expect(st.rig || def.parts.some((p) => p.step === i)).toBe(true));
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
        const { group, groups, parts } = instantiateAsset(def);
        const st = new Store(emptyDoc());
        st.mutate((d) => d.objects.push(group, ...groups, ...parts));
        const b = st.worldBounds();
        expect(b.min.y).toBeGreaterThanOrEqual(-0.001);
        expect(b.min.y).toBeLessThan(0.02);
        const s = assetStats(def);
        if (def.id === 'car') expect(s.depth).toBeGreaterThan(3.5);
        if (def.id === 'house' || def.id === 'japanhouse' || def.id === 'japanschool') expect(s.width).toBeGreaterThan(7);
        if (def.id === 'police' || def.id === 'footballer' || def.id === 'soldier') expect(s.height).toBeGreaterThan(1.6), expect(s.height).toBeLessThan(2.1);
        if (def.id === 'police') expect(b.min.y).toBeLessThan(0.01);
      });

      it('counts its triangles', () => {
        const { group, groups, parts } = instantiateAsset(def);
        const st = new Store(emptyDoc('t'));
        st.mutate((d) => d.objects.push(group, ...groups, ...parts));
        expect(polyStats(st.doc).total).toBe(assetStats(def).triangles);
      });

      it('edited parts are solid, closed shapes', () => {
        for (const p of instantiateAsset(def).parts) {
          if (!p.mesh) continue;
          expect(isClosed(p.mesh)).toBe(true);
          expect(consistentWinding(p.mesh)).toBe(true);
          // outline shells are turned inside out on purpose, so only their rim shows
          if (/Outline$/.test(p.name)) expect(signedVolume(p.mesh)).toBeLessThan(0);
          else expect(signedVolume(p.mesh)).toBeGreaterThan(0);
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
    expect(topX).toBeCloseTo(0.41, 5);
  });

  it('assets are richly detailed, not blocky: dozens of parts with faces, tapers and edited shapes', () => {
    for (const def of ASSETS) {
      const parts = instantiateAsset(def).parts;
      // a hard-edged low-poly character is made of a few big flat shapes on purpose
      expect(parts.length).toBeGreaterThanOrEqual(def.id === 'ribbon' || def.id === 'nurse' ? 40 : 75);
      expect(parts.filter((p) => p.mesh).length).toBeGreaterThanOrEqual(2); // reshaped with Edit shape
    }
    const soldier = instantiateAsset(ASSETS.find((a) => a.id === 'soldier')!).parts.map((p) => p.name);
    for (const n of ['Head', 'Helmet', 'Visor Lens', 'Face Mask', 'Belt', 'Vest', 'Backpack', 'Glove Right', 'Chest Chevron 1', 'Sleeve Chevron Left 1', 'Rank Patch']) expect(soldier).toContain(n);
    for (const id of ['police', 'footballer']) {
      const names = instantiateAsset(ASSETS.find((a) => a.id === id)!).parts.map((p) => p.name);
      for (const n of ['Head', 'Eye White Left', 'Pupil Right', 'Eyebrow Left', 'Nose', 'Mouth', 'Ear Left', 'Hand Right']) expect(names).toContain(n);
    }
    const car = instantiateAsset(ASSETS.find((a) => a.id === 'car')!).parts;
    expect(car.filter((p) => /Tire/.test(p.name))).toHaveLength(4);
    expect(car.filter((p) => p.params.taper < 1).length).toBeGreaterThanOrEqual(1);
  });

  it('the ball arm is one bent piece that reaches forward from the shoulder', () => {
    const leg = instantiateAsset(ASSETS.find((a) => a.id === 'footballer')!).parts.find((p) => p.name === 'Arm Right')!;
    const st = new Store(emptyDoc());
    st.mutate((d) => d.objects.push(leg), false);
    const b = st.worldBounds();
    expect(b.max.y - b.min.y).toBeGreaterThan(0.3);
    expect(b.max.z - b.min.z).toBeGreaterThan(0.3);
  });
});

describe('character skeletons', () => {
  it('every person has 22 joints, a single root at the hips, and joints inside the body', () => {
    for (const id of ['police', 'soldier', 'footballer']) {
      const def = ASSETS.find((a) => a.id === id)!;
      expect(def.steps.at(-1)!.rig).toBe(true);
      const { group, joints } = instantiateAsset(def, [3, 0, 0]);
      expect(joints).toHaveLength(22);
      expect(joints.every((j) => j.owner === group.id)).toBe(true);
      expect(joints.filter((j) => j.parent === null).map((j) => j.name)).toEqual(['Hips']);
      const head = joints.find((j) => j.name === 'Head Top')!;
      const toe = joints.find((j) => j.name === 'Toe Left')!;
      expect(head.pos[1]).toBeGreaterThan(1.8);
      expect(head.pos[1]).toBeLessThan(2.1);
      expect(toe.pos[1]).toBeLessThan(0.25);
      expect(joints.find((j) => j.name === 'Hips')!.pos[0]).toBeCloseTo(3, 5); // moved with the asset
    }
  });

  it('props have no skeleton', () => {
    for (const id of ['car', 'house', 'japanhouse', 'japanschool']) expect(instantiateAsset(ASSETS.find((a) => a.id === id)!).joints).toHaveLength(0);
  });
});
