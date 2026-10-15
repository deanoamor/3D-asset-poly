import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, emptyDoc } from '../src/core/store';
import { prepareExport } from '../src/engine/exporter';
import { writeObj } from '../src/engine/objExport';
import { zipFiles } from '../src/core/zip';
import { PRESETS, defaultFormat, importGuide } from '../src/core/presets';

function chest(): Store {
  const st = new Store(emptyDoc('Test Chest'));
  st.addShape('box', { name: 'Body', position: [3, 0.5, 2], size: [2, 1, 1.2], color: '#8b5a2b' });
  st.addShape('cylinder', { name: 'Barrel', position: [5, 1.5, 2], size: [1, 1, 1], color: '#ff0000' });
  return st;
}

describe('export', () => {
  it('puts the pivot at the bottom center', () => {
    const { root, size } = prepareExport(chest().doc);
    root.updateMatrixWorld(true);
    // size is what the editor shows
    expect(size.x).toBeGreaterThan(2);
    expect(size.y).toBeCloseTo(2, 3);
  });

  it('carries normals and painted vertex colors for smooth shapes', () => {
    const st = chest();
    st.setSurface(st.doc.objects.map((o) => o.id), { smooth: true, paint: 0.5 }, true);
    let attrs: string[] = [];
    prepareExport(st.doc).root.traverse((o) => {
      const m = o as { geometry?: { attributes: Record<string, unknown> } };
      if (m.geometry && !attrs.length) attrs = Object.keys(m.geometry.attributes);
    });
    expect(attrs).toContain('normal');
    expect(attrs).toContain('color');
    // the material itself carries the color, so apps that ignore vertex colors do not show grey
    let mat: { color: { r: number; g: number; b: number } } | undefined;
    prepareExport(st.doc).root.traverse((o) => {
      const m = o as { material?: typeof mat };
      if (m.material && !mat) mat = m.material;
    });
    expect(mat!.color.r + mat!.color.g + mat!.color.b).toBeLessThan(2.9);
    expect(Math.max(mat!.color.r, mat!.color.g, mat!.color.b)).toBeGreaterThan(0.15);
  });

  it('adds a Godot collision box only when asked', () => {
    const st = chest();
    st.setPreset('godot');
    const names = (c: boolean) => {
      const out: string[] = [];
      prepareExport(st.doc, c).root.traverse((o) => out.push(o.name));
      return out;
    };
    expect(names(false).some((n) => n.endsWith('-convcolonly'))).toBe(false);
    expect(names(true).some((n) => n === 'test_chest-convcolonly')).toBe(true);
    st.setPreset('unity');
    expect(names(true).some((n) => n.endsWith('-convcolonly'))).toBe(false); // Unity has no such convention
  });

  it('writes a valid OBJ with one face per triangle and sRGB colors', () => {
    const st = chest();
    const { root } = prepareExport(st.doc);
    const { obj, mtl, triangles } = writeObj(root, 'Test Chest');
    expect(triangles).toBe(12 + 64);
    expect(obj.split('\n').filter((l) => l.startsWith('f ')).length).toBe(triangles);
    expect(mtl).toContain('Kd 1 0 0');
    expect(mtl).toMatch(/Kd 0\.5451 0\.3529 0\.1686/);
    const ys = obj.split('\n').filter((l) => l.startsWith('v ')).map((l) => +l.split(' ')[2]);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
  });

  it('zips several files that unzip can read', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zip-'));
    writeFileSync(join(dir, 'm.zip'), zipFiles([
      { name: 'a.obj', data: 'v 0 0 0\n' },
      { name: 'obj/b.mtl', data: new Uint8Array([1, 2, 3, 250]) },
      { name: 'IMPORT_UNITY.txt', data: 'hello ✓' },
    ]));
    const out = execFileSync('python3', ['-I', '-c', "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip());print(sorted(z.namelist()));print(z.read('IMPORT_UNITY.txt').decode())", join(dir, 'm.zip')]).toString();
    expect(out).toContain('None');
    expect(out).toContain("'obj/b.mtl'");
    expect(out).toContain('hello ✓');
  });

  it('offers only formats an engine can open', () => {
    expect(PRESETS.unity.formats.map((f) => f.id)).toContain('obj');
    expect(PRESETS.unreal.formats.map((f) => f.id)).not.toContain('obj');
    expect(defaultFormat('godot')).toBe('glb');
    for (const e of ['blender', 'c4d', 'maya'] as const) {
      expect(PRESETS[e].formats.map((f) => f.id)).toEqual(expect.arrayContaining(['glb', 'obj', 'package']));
      expect(importGuide(e, { modelName: 'x', hasObj: true, collision: false, sizeText: '1 x 1 x 1 m', tris: 12 })).toContain('.obj');
    }
    expect(defaultFormat('c4d')).toBe('obj');
    expect(PRESETS.construct.formats.map((f) => f.id)).toEqual(['glb', 'gltf', 'package']);
    expect(PRESETS.construct.group).toBe('engine');
    expect(importGuide('construct', { modelName: 'x', hasObj: false, collision: false, sizeText: '1 x 1 x 1 m', tris: 12 })).toContain('3D Models');
    expect(importGuide('unity', { modelName: 'x', hasObj: true, collision: false, sizeText: '1 x 1 x 1 m', tris: 12 })).toContain('com.unity.cloud.gltfast');
  });
});
