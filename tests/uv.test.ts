import { describe, expect, it } from 'vitest';
import { layoutAtlas, planarUV } from '../src/core/uvmap';
import { buildGeometry } from '../src/core/shapes';
import { DEFAULT_SEGMENTS } from '../src/core/types';
import { Store, emptyDoc } from '../src/core/store';

describe('planar UV', () => {
  const box = () => buildGeometry('box', { segments: DEFAULT_SEGMENTS.box, taper: 0 } as never);
  it('a box shows the picture once on every side, upright, inside 0..1', () => {
    const g = box();
    const { uv, onImage } = planarUV(g, 'all');
    expect(onImage.every((v) => v === 1)).toBe(true);
    for (const v of uv) expect(v).toBeGreaterThanOrEqual(-1e-6), expect(v).toBeLessThanOrEqual(1 + 1e-6);
    // the front (+Z) face: u grows with x and v with y
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      if (nor.getZ(i) > 0.9) {
        expect(uv[i * 2]).toBeCloseTo(pos.getX(i) + 0.5, 5);
        expect(uv[i * 2 + 1]).toBeCloseTo(pos.getY(i) + 0.5, 5);
      }
    }
  });
  it('"front" puts the picture on the +Z side only', () => {
    const g = box();
    const { onImage } = planarUV(g, 'front');
    const nor = g.getAttribute('normal');
    let front = 0;
    for (let i = 0; i < nor.count; i++) {
      expect(onImage[i]).toBe(nor.getZ(i) > 0.5 ? 1 : 0);
      front += onImage[i];
    }
    expect(front).toBe(nor.count / 6);
  });
});

describe('atlas layout', () => {
  it('packs rectangles without overlap, with padding, in a power-of-two image', () => {
    const items = [{ key: 'a', w: 128, h: 128 }, { key: 'b', w: 64, h: 32 }, ...Array.from({ length: 20 }, (_, i) => ({ key: `c${i}`, w: 8, h: 8 }))];
    const { width, height, placed } = layoutAtlas(items, 2);
    expect(Math.log2(width) % 1).toBe(0);
    expect(Math.log2(height) % 1).toBe(0);
    expect(placed.size).toBe(items.length);
    const list = [...placed.values()];
    for (const r of list) {
      expect(r.x - 2).toBeGreaterThanOrEqual(0);
      expect(r.y - 2).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w + 2).toBeLessThanOrEqual(width);
      expect(r.y + r.h + 2).toBeLessThanOrEqual(height);
    }
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const apart = a.x + a.w + 2 <= b.x - 2 + 0 || b.x + b.w + 2 <= a.x - 2 + 0 || a.y + a.h + 2 <= b.y - 2 + 0 || b.y + b.h + 2 <= a.y - 2 + 0;
      expect(apart).toBe(true);
    }
  });
});

describe('pictures in the project', () => {
  it('a picture is kept while a shape wears it and forgotten after', () => {
    const st = new Store(emptyDoc('P'));
    const s = st.addShape('sphere', { name: 'Head' });
    st.addPicture({ id: 'p1', name: 'Face', src: 'data:image/png;base64,AA==', w: 4, h: 4 });
    st.setPicture([s.id], { id: 'p1' });
    expect(st.get(s.id)!.tex).toEqual({ id: 'p1' });
    st.setPicture([s.id], { mode: 'front' });
    expect(st.get(s.id)!.tex).toEqual({ id: 'p1', mode: 'front' });
    expect(st.doc.pictures).toHaveLength(1);
    st.setPicture([s.id], null);
    expect(st.get(s.id)!.tex).toBeUndefined();
    expect(st.doc.pictures).toBeUndefined();
  });
});
