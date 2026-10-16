import { describe, expect, it } from 'vitest';
import { Store, emptyDoc } from '../src/core/store';

function wheel() {
  const st = new Store(emptyDoc());
  const a = st.addShape('cylinder', { name: 'Tire', position: [2, 0.4, 3], size: [0.8, 0.3, 0.8] });
  const b = st.addShape('cylinder', { name: 'Rim', position: [2.05, 0.4, 3], size: [0.5, 0.3, 0.5] });
  st.select([a.id, b.id]);
  const g = st.groupSelected('Wheel')!;
  return { st, g, a, b };
}

describe('pivot', () => {
  it('a new group has its pivot at the bottom middle of what is inside', () => {
    const { st, g } = wheel();
    const p = st.pivotOf(g)!;
    expect(p[0]).toBeCloseTo(2.025, 4);
    expect(p[2]).toBeCloseTo(3, 4);
    expect(p[1]).toBeCloseTo(0.25, 4); // the bottom of the shapes (centre 0.4 minus half of its height 0.3... )
  });

  it('moving the pivot leaves everything inside exactly where it was', () => {
    const { st, g } = wheel();
    const before = st.worldBounds([g]);
    st.setPivot(g, [2.0, 0.4, 3.0]);
    expect(st.pivotOf(g)).toEqual([2, 0.4, 3]);
    const after = st.worldBounds([g]);
    for (const k of ['x', 'y', 'z'] as const) {
      expect(after.min[k]).toBeCloseTo(before.min[k], 4);
      expect(after.max[k]).toBeCloseTo(before.max[k], 4);
    }
  });

  it('works for a turned and resized group, and for nested groups', () => {
    const { st, g } = wheel();
    st.update(g, { rotation: [0, 0, 90], size: [1, 1, 1] });
    const before = st.worldBounds([g]);
    st.setPivot(g, [2.5, 1.0, 3.5]);
    const after = st.worldBounds([g]);
    for (const k of ['x', 'y', 'z'] as const) {
      expect(after.min[k]).toBeCloseTo(before.min[k], 4);
      expect(after.max[k]).toBeCloseTo(before.max[k], 4);
    }
    // wrap it in another group and move the inner pivot again
    const body = st.addShape('box', { name: 'Body', position: [4, 0.8, 3] });
    st.select([g, body.id]);
    const outer = st.groupSelected('Car')!;
    st.update(outer, { position: [st.get(outer)!.position[0] + 1, 0, 0] });
    const b2 = st.worldBounds([outer]);
    st.setPivot(g, [3.5, 0.4, 3.0]);
    const a2 = st.worldBounds([outer]);
    for (const k of ['x', 'y', 'z'] as const) {
      expect(a2.min[k]).toBeCloseTo(b2.min[k], 4);
      expect(a2.max[k]).toBeCloseTo(b2.max[k], 4);
    }
  });

  it('turning the group afterwards spins it around the new pivot', () => {
    const { st, g, a } = wheel();
    st.setPivot(g, [2.0, 0.4, 3.0]); // the axle
    st.update(g, { rotation: [90, 0, 0] });
    // the tire's centre is ON the axle, so it stays put while everything turns around it
    const c = st.worldBounds([a.id]).getCenter(st.worldBounds([a.id]).min.clone());
    expect(c.x).toBeCloseTo(2, 3);
    expect(c.y).toBeCloseTo(0.4, 3);
    expect(c.z).toBeCloseTo(3, 3);
  });

  it('presets: middle, bottom and top', () => {
    const { st, g } = wheel();
    st.setPivotPreset(g, 'center');
    expect(st.pivotOf(g)![1]).toBeCloseTo(0.4, 3);
    st.setPivotPreset(g, 'top');
    expect(st.pivotOf(g)![1]).toBeCloseTo(0.55, 3);
    st.setPivotPreset(g, 'bottom');
    expect(st.pivotOf(g)![1]).toBeCloseTo(0.25, 3);
  });

  it('only groups have a pivot to move, and undo puts it back', () => {
    const { st, g, a } = wheel();
    expect(st.pivotOf(a.id)).toBeNull();
    const p0 = st.pivotOf(g)!;
    st.setPivot(g, [9, 9, 9]);
    st.undo();
    expect(st.pivotOf(g)).toEqual(p0);
  });

  it('moving a pivot does not move a character’s skeleton', () => {
    const { st, g } = wheel();
    st.addJoints([{ id: 'j1', name: 'Root', parent: null, pos: [2, 0.4, 3], owner: g }]);
    st.setPivot(g, [5, 5, 5]);
    expect(st.joint('j1')!.pos).toEqual([2, 0.4, 3]);
  });

  it('spin can be set and cleared on several objects', () => {
    const { st, g, a } = wheel();
    st.setSpin([g, a.id], { axis: 0, speed: 1.5 });
    expect(st.get(g)!.spin).toEqual({ axis: 0, speed: 1.5 });
    st.setSpin([g], null);
    expect(st.get(g)!.spin).toBeUndefined();
    expect(st.get(a.id)!.spin).toEqual({ axis: 0, speed: 1.5 });
  });
});

describe('wheels that spin', () => {
  it('the car has four wheel groups, each with its pivot on the axle and a spin', async () => {
    const { ASSETS, instantiateAsset } = await import('../src/core/assets');
    const car = ASSETS.find((a) => a.id === 'car')!;
    const { group, groups, parts } = instantiateAsset(car);
    expect(groups.map((g) => g.name).sort()).toEqual(['Wheel Front Left', 'Wheel Front Right', 'Wheel Rear Left', 'Wheel Rear Right']);
    expect(groups.every((g) => g.spin?.axis === 0 && g.spin.speed === 1)).toBe(true);
    const st = new Store(emptyDoc());
    st.mutate((d) => d.objects.push(group, ...groups, ...parts), false);
    for (const g of groups) {
      const kids = parts.filter((p) => p.parent === g.id);
      expect(kids.map((k) => k.name.replace(/(Front|Rear) /, '').replace(/ (Left|Right)$/, '')).sort()).toEqual(['Hubcap', 'Rim', 'Rim Dark', 'Tire']);
      // the pivot is the middle of the wheel: height and length (z) match the tire centre
      const tire = kids.find((k) => k.name.includes('Tire'))!;
      const c = st.worldBounds([tire.id]).getCenter(st.worldBounds([tire.id]).min.clone());
      const p = st.pivotOf(g.id)!;
      expect(p[1]).toBeCloseTo(c.y, 2);
      expect(p[2]).toBeCloseTo(c.z, 2);
    }
  });

  it('turning a wheel group around X keeps the tire on its axle and rolls the rim', async () => {
    const { ASSETS, instantiateAsset } = await import('../src/core/assets');
    const { group, groups, parts } = instantiateAsset(ASSETS.find((a) => a.id === 'car')!);
    const st = new Store(emptyDoc());
    st.mutate((d) => d.objects.push(group, ...groups, ...parts), false);
    const g = groups.find((x) => x.name === 'Wheel Front Left')!;
    const tire = parts.find((p) => p.parent === g.id && p.name.includes('Tire'))!;
    const rim = parts.find((p) => p.parent === g.id && p.name.includes('Hubcap'))!;
    const centre = (id: string) => st.worldBounds([id]).getCenter(st.worldBounds([id]).min.clone());
    const before = centre(tire.id);
    st.update(g.id, { rotation: [90, 0, 0] });
    const after = centre(tire.id);
    for (const k of ['x', 'y', 'z'] as const) expect(after[k]).toBeCloseTo(before[k], 3);
    expect(centre(rim.id).y).toBeCloseTo(before.y, 2);
  });

  it('exports one looping "Spin" animation that turns every spinning wheel a whole number of times', async () => {
    const { ASSETS, instantiateAsset } = await import('../src/core/assets');
    const { buildExportScene } = await import('../src/engine/sceneBuild');
    const { spinClip } = await import('../src/engine/spinExport');
    const { group, groups, parts } = instantiateAsset(ASSETS.find((a) => a.id === 'car')!);
    const doc = emptyDoc('Car');
    doc.objects.push(group, ...groups, ...parts);
    doc.objects.find((o) => o.id === groups[0].id)!.spin = { axis: 0, speed: 2 }; // one wheel twice as fast
    const clip = spinClip(buildExportScene(doc, 'Car'))!;
    expect(clip.name).toBe('Spin');
    expect(clip.tracks).toHaveLength(4);
    expect(clip.duration).toBeCloseTo(1, 5); // set by the slowest wheel (1 turn per second)
    const fast = clip.tracks.find((t) => t.times.length === 17)!; // 2 turns: 8 keys per turn + 1
    const slow = clip.tracks.find((t) => t.times.length === 9)!;
    expect(fast).toBeTruthy();
    expect(slow).toBeTruthy();
    // after the loop the wheel is where it started (a quaternion and its negative are the same turn)
    const v = slow.values;
    const a = [v[0], v[1], v[2], v[3]];
    const b = [v[v.length - 4], v[v.length - 3], v[v.length - 2], v[v.length - 1]];
    const same = a.every((x, i) => Math.abs(x - b[i]) < 1e-6) || a.every((x, i) => Math.abs(x + b[i]) < 1e-6);
    expect(same).toBe(true);
  });

  it('nothing is exported when nothing spins', async () => {
    const { buildExportScene } = await import('../src/engine/sceneBuild');
    const { spinClip } = await import('../src/engine/spinExport');
    const st = new Store(emptyDoc());
    st.addShape('box', { name: 'Crate' });
    expect(spinClip(buildExportScene(st.doc, 'x'))).toBeNull();
  });
});
