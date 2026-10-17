import { describe, expect, it } from 'vitest';
import { buildCharacter, expandSpecParts } from '../src/core/charspec';
import { checkCharacter } from '../src/core/charcheck';
import { Store } from '../src/core/store';

describe('character spec', () => {
  it('a human template builds a body with a face, a skeleton and three expressions', () => {
    const { doc, warnings } = buildCharacter({ name: 'Hero', template: { kind: 'human' } });
    expect(warnings).toEqual([]);
    expect(doc.rig).toHaveLength(22);
    expect(doc.morphs?.map((m) => m.name).sort()).toEqual(['Blink', 'Smile', 'Surprised']);
    for (const n of ['Head', 'Torso', 'Arm Left', 'Arm Right', 'Leg Left', 'Leg Right', 'Shoe Left', 'Shoe Right', 'Mouth', 'Eye White Left']) expect(doc.objects.some((o) => o.name === n)).toBe(true);
    expect(doc.objects.find((o) => o.name === 'Hero')!.kind).toBe('group');
  });

  it('every build is the requested height, stands on the floor and has no errors', () => {
    for (const build of ['stylized', 'realistic', 'heroic', 'chibi', 'kid'] as const) {
      for (const height of [1.0, 1.8, 2.2]) {
        const { doc } = buildCharacter({ name: 'T', template: { kind: 'human', build, height } });
        const r = checkCharacter(doc, { height });
        expect(r.issues.filter((i) => i.level === 'error'), `${build} ${height}`).toEqual([]);
        expect(r.issues.some((i) => i.code === 'height' || i.code === 'joint-hole' || i.code === 'floating'), `${build} ${height}: ${JSON.stringify(r.issues)}`).toBe(false);
        expect(Math.abs(r.stats.size[1] / height - 1)).toBeLessThan(0.06);
      }
    }
  });

  it('mirror makes a Right twin; replace and remove change the template', () => {
    const expanded = expandSpecParts([{ name: 'Pouch', kind: 'box', pos: [0.2, 1, 0.1], size: [0.1, 0.1, 0.1], color: '#fff', mirror: true }]);
    expect(expanded.map((p) => p.name)).toEqual(['Pouch Left', 'Pouch Right']);
    expect(expanded[1].pos).toEqual([-0.2, 1, 0.1]);
    const { doc } = buildCharacter({
      name: 'X',
      template: { kind: 'human' },
      remove: ['Hair', 'Nope'],
      parts: [{ name: 'Hand Left', kind: 'sphere', pos: [0.4, 0.9, 0.05], size: [0.2, 0.2, 0.2], color: '#ff0000' }],
    });
    expect(doc.objects.some((o) => o.name === 'Hair')).toBe(false);
    const hand = doc.objects.filter((o) => o.name === 'Hand Left');
    expect(hand).toHaveLength(1);
    expect(hand[0].color).toBe('#ff0000');
    expect(buildCharacter({ name: 'X', template: { kind: 'human' }, remove: ['Nope'] }).warnings[0]).toMatch(/Nope/);
  });

  it('sweeps, blobs, groups, custom expressions and materials work', () => {
    const { doc, warnings } = buildCharacter({
      name: 'Bot',
      groups: [{ name: 'Wheel', pivot: [0, 0.2, 0], spin: { axis: 0, speed: 1 } }],
      rig: 'none',
      parts: [
        { name: 'Body', kind: 'box', pos: [0, 0.6, 0], size: [0.5, 0.6, 0.4], color: '#aaa', mat: { metal: 0.8, rough: 0.3 } },
        { name: 'Tube', kind: 'sweep', rings: [{ p: [0, 0.2, 0], r: 0.1 }, { p: [0, 0.5, 0], r: [0.1, 0.06] }], color: '#333' },
        { name: 'Eye', kind: 'blob', center: [0, 0.7, 0.2], radii: [0.05, 0.05, 0.03], color: '#0ff' },
        { name: 'Tire', kind: 'cylinder', pos: [0.3, 0.2, 0], size: [0.4, 0.1, 0.4], rot: [0, 0, 90], color: '#111', group: 'Wheel' },
      ],
      morphs: [{ name: 'Look', parts: { Eye: { size: [0.1, 0.1, 0.03] }, Ghost: { size: [1, 1, 1] } } }],
    });
    expect(warnings.some((w) => /Ghost/.test(w))).toBe(true);
    expect(doc.rig).toBeUndefined();
    expect(doc.objects.find((o) => o.name === 'Body')!.mat).toEqual({ metal: 0.8, rough: 0.3 });
    expect(doc.objects.find((o) => o.name === 'Wheel')!.spin).toEqual({ axis: 0, speed: 1 });
    expect(doc.morphs).toHaveLength(1);
    expect(doc.objects.find((o) => o.name === 'Tube')!.mesh).toBeDefined();
  });
});

describe('character check', () => {
  const base = () => buildCharacter({ name: 'T', template: { kind: 'human' } }).doc;
  it('reports a floating part, a sunken body, a wrong height and a blown budget', () => {
    const doc = base();
    const st = new Store(doc);
    st.addShape('box', { name: 'Floater', position: [2, 2, 2], size: [0.1, 0.1, 0.1] });
    const r = checkCharacter(st.doc, { height: 1.0, maxTris: 100 });
    const codes = r.issues.map((i) => i.code);
    expect(codes).toContain('floating');
    expect(codes).toContain('height');
    expect(codes).toContain('budget');
    expect(r.ok).toBe(false);
    const low = base();
    for (const o of low.objects) if (!o.parent) o.position = [0, -0.5, 0];
    expect(checkCharacter(low).issues.map((i) => i.code)).toContain('below-floor');
  });
  it('finds a hole at a joint and a part without its twin', () => {
    const doc = base();
    doc.objects = doc.objects.filter((o) => !/^Leg Left$/.test(o.name));
    const codes = checkCharacter(doc).issues.map((i) => i.code);
    expect(codes).toContain('joint-hole');
    expect(codes).toContain('one-sided');
  });
});
