import { describe, expect, it } from 'vitest';
import { decodeBag, encodeBag, mergeSaves, type SaveEntry } from '../src/core/bag';
import { Store, emptyDoc } from '../src/core/store';
import { zipSingle } from '../src/core/zip';

const make = (id: string, name: string, savedAt: number, shapes = 1): SaveEntry => {
  const st = new Store(emptyDoc(name));
  for (let i = 0; i < shapes; i++) st.addShape('box', { name: `Box ${i}`, position: [i, 0.5, 0] });
  return { id, name, savedAt, doc: JSON.parse(JSON.stringify(st.doc)) };
};

describe('bag (.3pi)', () => {
  it('round-trips every save, compressed', async () => {
    const saves = [make('a', 'Chest', 100, 3), make('b', 'Tower', 200, 2)];
    const bytes = await encodeBag(saves);
    expect(bytes[0]).toBe(0x1f); // gzip
    expect(bytes.length).toBeLessThan(JSON.stringify(saves).length);
    const back = await decodeBag(bytes);
    expect(back.map((s) => s.name)).toEqual(['Chest', 'Tower']);
    expect(back[0].doc.objects).toHaveLength(3);
  });

  it('opens a bag a download host wrapped in a zip, and a plain JSON one', async () => {
    const bytes = await encodeBag([make('a', 'Chest', 1)]);
    const zipped = zipSingle('poly-studio-saves.3pi', bytes);
    expect((await decodeBag(zipped))[0].name).toBe('Chest');
    const plain = new TextEncoder().encode(JSON.stringify({ format: '3pi', version: 1, app: 'Poly Studio', createdAt: 0, saves: [make('a', 'Plain', 1)] }));
    expect((await decodeBag(plain))[0].name).toBe('Plain');
  });

  it('refuses files that are not bags', async () => {
    await expect(decodeBag(new TextEncoder().encode('hello'))).rejects.toThrow(/not a .3pi/);
    await expect(decodeBag(new TextEncoder().encode(JSON.stringify({ format: 'x' })))).rejects.toThrow(/not a .3pi/);
    await expect(decodeBag(new TextEncoder().encode(JSON.stringify({ format: '3pi', saves: [{ id: 1 }] })))).rejects.toThrow(/no saves/);
  });

  it('merges without ever losing work', () => {
    const chest = make('a', 'Chest', 100, 1);
    const lib = [chest, make('b', 'Tower', 300, 2)];
    let n = 0;
    const id = () => `new${n++}`;
    // new one, identical one, newer one, and an older one that differs
    const incoming = [make('c', 'Fresh', 50), JSON.parse(JSON.stringify(chest)), make('b', 'Tower', 400, 5), make('a', 'Chest old', 10, 4)];
    const r = mergeSaves(lib, incoming, id);
    expect(r).toMatchObject({ added: 1, kept: 1, updated: 1, copied: 1 });
    expect(r.saves.find((s) => s.id === 'b')!.doc.objects).toHaveLength(5);
    expect(r.saves.map((s) => s.name)).toContain('Chest old (imported)');
    expect(r.saves).toHaveLength(4);
    expect(r.saves[0].savedAt).toBeGreaterThanOrEqual(r.saves[1].savedAt); // newest first
  });
});
