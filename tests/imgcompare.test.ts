import { describe, expect, it } from 'vitest';
import { borderColors, dominantColors, flipMask, iou, lab, maskFromBackground, normalize, paletteScore, profileError, similarity, widthProfile, type Img, type RGB } from '../src/engine/imgcompare';

/** A synthetic picture: a gradient background and a shape drawn by a callback. */
function pic(w: number, h: number, shape: (x: number, y: number) => RGB | null, bg: (x: number, y: number) => RGB = () => [200, 200, 205]): Img {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = shape(x, y) ?? bg(x, y);
    data.set([...c, 255], (y * w + x) * 4);
  }
  return { data, width: w, height: h };
}
const person = (cx: number, top: number, h: number, shoulders = 1) => (x: number, y: number): RGB | null => {
  const t = (y - top) / h;
  if (t < 0 || t > 1) return null;
  const halfW = t < 0.18 ? h * 0.07 : t < 0.55 ? h * 0.16 * shoulders : h * 0.08; // head, torso, legs
  return Math.abs(x - cx) < halfW ? (t < 0.18 ? [200, 150, 110] : t < 0.55 ? [60, 90, 160] : [40, 40, 50]) : null;
};

describe('image comparison', () => {
  it('finds the background from the border, even a gradient, and the subject from the rest', () => {
    const im = pic(160, 200, person(80, 20, 160), (_x, y) => [120 + (y / 200) * 40, 110 + (y / 200) * 40, 100 + (y / 200) * 30]);
    expect(borderColors(im).length).toBeGreaterThan(0);
    const m = maskFromBackground(im);
    const inside = m.bits[100 * 160 + 80];
    const outside = m.bits[100 * 160 + 5];
    expect(inside).toBe(1);
    expect(outside).toBe(0);
  });

  it('the same figure at another size and place is (almost) identical; a wider one is not', () => {
    const a = maskFromBackground(pic(200, 260, person(100, 30, 200)));
    const b = maskFromBackground(pic(400, 380, person(150, 60, 300)));
    const wide = maskFromBackground(pic(200, 260, person(100, 30, 200, 1.9)));
    const iAB = iou(normalize(a), normalize(b));
    const iAW = iou(normalize(a), normalize(wide));
    expect(iAB).toBeGreaterThan(0.93);
    expect(iAW).toBeLessThan(iAB - 0.1);
    expect(profileError(widthProfile(a), widthProfile(b))).toBeLessThan(0.02);
    expect(profileError(widthProfile(a), widthProfile(wide))).toBeGreaterThan(0.05);
  });

  it('the width profile says where the body is wide (shoulders high, legs narrow)', () => {
    const m = maskFromBackground(pic(200, 260, person(100, 30, 200)));
    const p = widthProfile(m, 20);
    expect(p[6]).toBeGreaterThan(p[1] * 1.5); // chest wider than the head
    expect(p[17]).toBeLessThan(p[6] * 0.6); // legs narrower than the chest
  });

  it('a soft floor shadow is not counted as part of the subject', () => {
    const bg = (_x: number, _y: number): RGB => [220, 220, 220];
    const shadowed = pic(200, 260, (x, y) => {
      const p = person(100, 30, 200)(x, y);
      if (p) return p;
      // a smooth, darker blob of the background colour next to the feet (a soft cast shadow)
      const d = Math.hypot(x - 70, (y - 215) * 1.6);
      const dark = 55 * Math.max(0, 1 - d / 55);
      if (dark > 18) return [220 - dark, 220 - dark, 220 - dark];
      return null;
    }, bg);
    const clean = pic(200, 260, person(100, 30, 200), bg);
    const a = normalize(maskFromBackground(clean));
    const withShadow = maskFromBackground(shadowed);
    expect(iou(a, normalize(withShadow))).toBeGreaterThan(0.95);
    // without the shadow rule the patch is taken for the subject
    expect(iou(a, normalize(maskFromBackground(shadowed, { shadows: false })))).toBeLessThan(0.9);
  });

  it('palettes: same colours score high, different colours score low and are listed as missing', () => {
    const a = pic(120, 160, person(60, 10, 140));
    const ma = maskFromBackground(a);
    const ca = dominantColors(a, ma);
    expect(ca.length).toBeGreaterThanOrEqual(3);
    expect(ca.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 3);
    expect(paletteScore(ca, ca).score).toBeGreaterThan(0.99);
    const other = pic(120, 160, (x, y) => (person(60, 10, 140)(x, y) ? [220, 40, 40] : null));
    const co = dominantColors(other, maskFromBackground(other));
    const s = paletteScore(ca, co);
    expect(s.score).toBeLessThan(0.7);
    expect(s.missing.length).toBeGreaterThan(0);
  });

  it('Lab distance is small for near colours and large for far ones', () => {
    const d = (a: RGB, b: RGB) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
    expect(d([100, 100, 100], [103, 100, 100])).toBeLessThan(3);
    expect(d([255, 0, 0], [0, 0, 255])).toBeGreaterThan(80);
  });

  it('similarity combines outline, proportions and colours; a mirrored figure is found by flipping', () => {
    expect(similarity(1, 0, 1).total).toBeCloseTo(1, 5);
    expect(similarity(0, 0.5, 0).total).toBe(0);
    const lopsided = maskFromBackground(pic(200, 260, (x, y) => (person(100, 30, 200)(x, y) && x < 100 ? [10, 10, 10] : null)));
    const n = normalize(lopsided);
    expect(iou(n, normalize(flipMask(lopsided)))).toBeLessThan(0.4);
    expect(iou(n, flipMask(flipMask(n)))).toBe(1);
  });
});
