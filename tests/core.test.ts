import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Store, emptyDoc, polyStats } from '../src/core/store';
import { buildGeometry, geometryTriangles, triangleCount } from '../src/core/shapes';
import { DEFAULT_SEGMENTS, type ShapeType } from '../src/core/types';
import { worldMatrix } from '../src/core/docmath';

describe('triangle counts', () => {
  const shapes: ShapeType[] = ['box', 'cylinder', 'sphere', 'cone', 'pyramid', 'plane'];
  for (const s of shapes) {
    for (const seg of [DEFAULT_SEGMENTS[s], 6, 24]) {
      for (const taper of [1, 0.5, 0]) {
        it(`${s} seg=${seg} taper=${taper} matches the real geometry`, () => {
          const p = { segments: seg, taper };
          const g = buildGeometry(s, p);
          expect(triangleCount(s, p)).toBe(geometryTriangles(g));
        });
      }
    }
  }
});

describe('store history', () => {
  it('undo/redo restores the document', () => {
    const st = new Store(emptyDoc());
    st.addShape('box');
    st.addShape('sphere');
    expect(st.doc.objects).toHaveLength(2);
    st.undo();
    expect(st.doc.objects).toHaveLength(1);
    st.redo();
    expect(st.doc.objects).toHaveLength(2);
    st.undo();
    st.undo();
    expect(st.doc.objects).toHaveLength(0);
    expect(st.canUndo).toBe(false);
  });

  it('live edits only become one undo step on commit', () => {
    const st = new Store(emptyDoc());
    const o = st.addShape('box');
    for (let i = 1; i <= 10; i++) st.update(o.id, { position: [i, 0.5, 0] }, false);
    st.commit();
    expect(st.get(o.id)!.position[0]).toBe(10);
    st.undo();
    expect(st.get(o.id)!.position[0]).toBe(0);
    expect(st.doc.objects).toHaveLength(1);
  });

  it('undo discards uncommitted live edits first', () => {
    const st = new Store(emptyDoc());
    const o = st.addShape('box');
    st.update(o.id, { position: [5, 0.5, 0] }, false);
    st.undo();
    expect(st.get(o.id)!.position[0]).toBe(0);
  });
});

describe('grouping', () => {
  it('group then ungroup keeps world transforms', () => {
    const st = new Store(emptyDoc());
    const a = st.addShape('box', { position: [2, 0.5, 1] });
    const b = st.addShape('cylinder', { position: [-1, 1, 3], rotation: [0, 30, 0] });
    const before = [a, b].map((o) => worldMatrix(st.doc, o.id).toArray());
    st.select([a.id, b.id]);
    const gid = st.groupSelected('Chest')!;
    expect(st.get(gid)!.name).toBe('Chest');
    expect(st.get(a.id)!.parent).toBe(gid);
    const grouped = [a, b].map((o) => worldMatrix(st.doc, o.id).toArray());
    grouped.forEach((m, i) => m.forEach((v, k) => expect(v).toBeCloseTo(before[i][k], 4)));
    st.select([gid]);
    st.ungroupSelected();
    expect(st.doc.objects.find((o) => o.kind === 'group')).toBeUndefined();
    const after = [a, b].map((o) => worldMatrix(st.doc, o.id).toArray());
    after.forEach((m, i) => m.forEach((v, k) => expect(v).toBeCloseTo(before[i][k], 3)));
  });

  it('reparent keeps world transform and refuses cycles', () => {
    const st = new Store(emptyDoc());
    const a = st.addShape('box', { position: [3, 0.5, 0] });
    const b = st.addShape('box', { position: [0, 0.5, 0] });
    st.select([a.id, b.id]);
    const gid = st.groupSelected()!;
    st.update(gid, { position: [1, 0, 1], rotation: [0, 90, 0] });
    const c = st.addShape('sphere', { position: [5, 0.5, 5] });
    const w0 = worldMatrix(st.doc, c.id).toArray();
    expect(st.reparent(c.id, gid, 0)).toBe(true);
    worldMatrix(st.doc, c.id).toArray().forEach((v, k) => expect(v).toBeCloseTo(w0[k], 3));
    expect(st.reparent(gid, gid, 0)).toBe(false);
    expect(st.reparent(gid, c.id, 0)).toBe(false);
  });

  it('duplicate copies children with fresh ids', () => {
    const st = new Store(emptyDoc());
    const a = st.addShape('box');
    const b = st.addShape('box');
    st.select([a.id, b.id]);
    const gid = st.groupSelected()!;
    st.select([gid]);
    const [copy] = st.duplicateSelected();
    expect(copy).not.toBe(gid);
    expect(st.doc.objects).toHaveLength(6);
    expect(new Set(st.doc.objects.map((o) => o.id)).size).toBe(6);
    expect(new Set(st.doc.objects.map((o) => o.name)).size).toBe(6);
  });
});

describe('triangle count', () => {
  it('adds up the visible shapes, heaviest first', () => {
    const st = new Store(emptyDoc('t'));
    st.addShape('box');
    const s = st.addShape('sphere');
    st.updateParams(s.id, { segments: 64 });
    const stats = polyStats(st.doc);
    expect(stats.total).toBe(12 + triangleCount('sphere', st.get(s.id)!.params));
    expect(stats.perObject[0].name).toBe('Sphere');
  });

  it('ignores hidden objects', () => {
    const st = new Store(emptyDoc());
    const s = st.addShape('sphere');
    st.update(s.id, { visible: false });
    expect(polyStats(st.doc).total).toBe(0);
  });

  it('has no budget or limit any more', () => {
    const st = new Store(emptyDoc());
    expect(Object.keys(st.doc)).not.toContain('target');
    expect(Object.keys(polyStats(st.doc))).toEqual(['total', 'perObject']);
  });
});

describe('bounds', () => {
  it('computes world bounds', () => {
    const st = new Store(emptyDoc());
    st.addShape('box', { position: [1, 1, 0], size: [2, 2, 2] });
    const b = st.worldBounds();
    expect(b.min.toArray()).toEqual([0, 0, -1]);
    expect(b.max.toArray()).toEqual([2, 2, 1]);
    expect(b).toBeInstanceOf(THREE.Box3);
  });
});

import { crc32, zipSingle } from '../src/core/zip';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('zip', () => {
  it('crc32 matches the reference value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('produces an archive that unzip can read back', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zip-'));
    const payload = new Uint8Array(5000).map((_, i) => (i * 7) % 251);
    writeFileSync(join(dir, 'a.zip'), zipSingle('chest.glb', payload));
    const out = execFileSync('python3', ['-I', '-c', "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.namelist()[0]);print(z.testzip());open(sys.argv[2],'wb').write(z.read('chest.glb'))", join(dir, 'a.zip'), join(dir, 'out.bin')]).toString();
    expect(out).toContain('chest.glb');
    expect(out).toContain('None');
    expect(new Uint8Array(readFileSync(join(dir, 'out.bin')))).toEqual(payload);
  });
});
