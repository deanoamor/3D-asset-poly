/**
 * Measuring "how much does this look like the reference": a silhouette overlap, a width-per-height profile (where the
 * body is wide: shoulders, head, legs) and a palette distance. Pure functions on RGBA pixels, so they run in a browser
 * page (the studio) and in unit tests.
 */
export interface Img {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

export interface Mask {
  width: number;
  height: number;
  /** 1 = the subject, 0 = the background. */
  bits: Uint8Array;
}

export type RGB = [number, number, number];

const at = (im: Img, x: number, y: number): RGB => {
  const i = (y * im.width + x) * 4;
  return [im.data[i], im.data[i + 1], im.data[i + 2]];
};
const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** sRGB -> CIE Lab, for colour differences that match what the eye sees. */
export function lab([r, g, b]: RGB): RGB {
  const f = (c: number) => {
    c /= 255;
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  };
  const R = f(r), G = f(g), B = f(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const t = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
}
export const deltaE = (a: RGB, b: RGB) => dist(lab(a), lab(b));

/** The background colours of a picture: the colours that fill most of its border. */
export function borderColors(im: Img, ring = 0.03): RGB[] {
  const t = Math.max(2, Math.round(Math.min(im.width, im.height) * ring));
  const buckets = new Map<number, { n: number; sum: RGB }>();
  let total = 0;
  const add = (x: number, y: number) => {
    const c = at(im, x, y);
    const key = (c[0] >> 5) * 64 + (c[1] >> 5) * 8 + (c[2] >> 5);
    const b = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] as RGB };
    b.n++;
    b.sum = [b.sum[0] + c[0], b.sum[1] + c[1], b.sum[2] + c[2]];
    buckets.set(key, b);
    total++;
  };
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) if (x < t || y < t || x >= im.width - t || y >= im.height - t) add(x, y);
  return [...buckets.values()].filter((b) => b.n / total > 0.2).sort((a, b) => b.n - a.n).slice(0, 3).map((b) => [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n] as RGB);
}

/**
 * The background as a function of the position: for each row, the colours at the left and right edge, blended across.
 * It follows a vertical gradient, a vignette, or a floor that changes colour, which a few fixed colours cannot.
 */
export function bgModel(im: Img): (x: number, y: number) => RGB {
  // sample a band just inside the very edge (a picture often has a thin white or black margin) and take the median per row
  const x0 = Math.max(1, Math.round(im.width * 0.045)), x1 = Math.max(x0 + 2, Math.round(im.width * 0.09));
  const median = (vals: number[]) => vals.sort((a, b) => a - b)[vals.length >> 1];
  const left: RGB[] = [], right: RGB[] = [];
  for (let y = 0; y < im.height; y++) {
    const ls: RGB[] = [], rs: RGB[] = [];
    for (let x = x0; x < x1; x++) (ls.push(at(im, x, y)), rs.push(at(im, im.width - 1 - x, y)));
    left.push([0, 1, 2].map((k) => median(ls.map((c) => c[k]))) as RGB);
    right.push([0, 1, 2].map((k) => median(rs.map((c) => c[k]))) as RGB);
  }
  // smooth down the rows (a few pixels of noise or an object at the edge should not move the model)
  const smooth = (rows: RGB[]) => rows.map((_, y) => {
    const s: RGB = [0, 0, 0];
    let n = 0;
    for (let k = Math.max(0, y - 3); k <= Math.min(rows.length - 1, y + 3); k++) {
      for (let c = 0; c < 3; c++) s[c] += rows[k][c];
      n++;
    }
    return [s[0] / n, s[1] / n, s[2] / n] as RGB;
  });
  const L = smooth(left), R = smooth(right);
  return (x, y) => {
    const u = im.width > 1 ? x / (im.width - 1) : 0;
    const a = L[y], b = R[y];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  };
}

/**
 * The subject of a picture: everything that is not close to a background colour, cleaned up (the biggest blob only, holes
 * filled). `bg` forces the background colours; `tol` is how far a pixel must be from them (RGB distance).
 */
export function maskFromBackground(im: Img, opts: { bg?: RGB[]; tol?: number; shadows?: boolean } = {}): Mask {
  const model = opts.bg?.length ? null : bgModel(im);
  const bg = opts.bg?.length ? opts.bg : borderColors(im);
  const tol = opts.tol ?? 42;
  const { width: W, height: H } = im;
  const bits = new Uint8Array(W * H);
  // a smooth background (a vignette, a gradient) drifts, so each pixel is also compared with the border pixel in its own row/column
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(im, x, y);
    let d = Infinity;
    if (model) d = dist(c, model(x, y));
    else for (const b of bg) d = Math.min(d, dist(c, b));
    bits[y * W + x] = d > tol ? 1 : 0;
  }
  // a soft shadow on the floor is not part of the subject: it keeps the background's hue, only darker, and is smooth.
  // Judged per region (a shadow's outline pixels are not smooth, its inside is): remove whole smooth regions of "darkened background".
  if (opts.shadows !== false) {
    const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] + 1e-6;
    const sum = (c: RGB) => c[0] + c[1] + c[2] + 1e-6;
    const cand = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!bits[y * W + x]) continue;
      const c = at(im, x, y);
      for (const b of model ? [model(x, y)] : bg) {
        const chroma = Math.hypot(c[0] / sum(c) - b[0] / sum(b), c[1] / sum(c) - b[1] / sum(b), c[2] / sum(c) - b[2] / sum(b));
        const ratio = lum(c) / lum(b);
        if (chroma < 0.025 && ratio > 0.3 && ratio < 0.98) cand[y * W + x] = 1;
      }
    }
    const seen = new Uint8Array(W * H);
    for (let s0 = 0; s0 < W * H; s0++) {
      if (!cand[s0] || seen[s0]) continue;
      const comp: number[] = [s0];
      seen[s0] = 1;
      let smooth = 0;
      let sy = 0;
      for (let k = 0; k < comp.length; k++) {
        const p = comp[k];
        const px = p % W, py = (p / W) | 0;
        sy += py;
        const c = at(im, px, py);
        let step = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          step = Math.max(step, dist(c, at(im, nx, ny)));
          const q = ny * W + nx;
          if (cand[q] && !seen[q]) (seen[q] = 1), comp.push(q);
        }
        if (step < 16) smooth++;
      }
      // shadows lie on the floor: in the lower half. (A grey sleeve is as smooth and as colourless, but it is up in the picture.)
      if (comp.length >= 30 && smooth / comp.length > 0.6 && sy / comp.length > H * 0.5) for (const p of comp) bits[p] = 0;
    }
  }
  return cleanMask({ width: W, height: H, bits });
}

/** Shrink a mask by `r` pixels (to leave out the blurred edge pixels when sampling colours). */
export function erode(m: Mask, r = 2): Mask {
  const { width: W, height: H } = m;
  let cur = m.bits;
  for (let k = 0; k < r; k++) {
    const next = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!cur[y * W + x]) continue;
      if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && cur[y * W + x - 1] && cur[y * W + x + 1] && cur[(y - 1) * W + x] && cur[(y + 1) * W + x]) next[y * W + x] = 1;
    }
    cur = next;
  }
  return { width: W, height: H, bits: cur };
}

/** Keep the largest 8-connected blob and fill the holes inside it. */
export function cleanMask(m: Mask): Mask {
  const { width: W, height: H } = m;
  const label = new Int32Array(W * H).fill(-1);
  let best = -1, bestN = 0, id = 0;
  const stack: number[] = [];
  for (let s = 0; s < W * H; s++) {
    if (!m.bits[s] || label[s] >= 0) continue;
    let n = 0;
    stack.push(s);
    label[s] = id;
    while (stack.length) {
      const p = stack.pop()!;
      n++;
      const px = p % W, py = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (m.bits[q] && label[q] < 0) {
          label[q] = id;
          stack.push(q);
        }
      }
    }
    if (n > bestN) (bestN = n), (best = id);
    id++;
  }
  const bits = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) bits[i] = label[i] === best ? 1 : 0;
  // fill holes: flood the outside from the border, whatever is not outside and not subject is a hole
  const outside = new Uint8Array(W * H);
  const q: number[] = [];
  const push = (x: number, y: number) => {
    const p = y * W + x;
    if (!bits[p] && !outside[p]) (outside[p] = 1), q.push(p);
  };
  for (let x = 0; x < W; x++) (push(x, 0), push(x, H - 1));
  for (let y = 0; y < H; y++) (push(0, y), push(W - 1, y));
  while (q.length) {
    const p = q.pop()!;
    const px = p % W, py = (p / W) | 0;
    if (px > 0) push(px - 1, py);
    if (px < W - 1) push(px + 1, py);
    if (py > 0) push(px, py - 1);
    if (py < H - 1) push(px, py + 1);
  }
  for (let i = 0; i < W * H; i++) if (!outside[i]) bits[i] = 1;
  return { width: W, height: H, bits };
}

export function bounds(m: Mask): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = m.width, y0 = m.height, x1 = -1, y1 = -1;
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (m.bits[y * m.width + x]) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/**
 * Put the subject in a fixed `size` x `size` grid: scaled so its height is 90 % of the grid, centred sideways.
 * Two masks normalised this way can be laid over each other whatever their original size and framing.
 */
export function normalize(m: Mask, size = 128): Mask {
  const b = bounds(m);
  const out = new Uint8Array(size * size);
  if (!b) return { width: size, height: size, bits: out };
  const h = b.y1 - b.y0 + 1;
  const w = b.x1 - b.x0 + 1;
  const k = (size * 0.9) / h;
  const ox = (size - w * k) / 2;
  const oy = (size - h * k) / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = Math.floor((x - ox) / k) + b.x0;
    const sy = Math.floor((y - oy) / k) + b.y0;
    if (sx >= b.x0 && sx <= b.x1 && sy >= b.y0 && sy <= b.y1 && m.bits[sy * m.width + sx]) out[y * size + x] = 1;
  }
  return { width: size, height: size, bits: out };
}

/** Intersection over union of two normalised masks (1 = identical outline). */
export function iou(a: Mask, b: Mask): number {
  let i = 0, u = 0;
  for (let k = 0; k < a.bits.length; k++) {
    const x = a.bits[k], y = b.bits[k];
    if (x && y) i++;
    if (x || y) u++;
  }
  return u ? i / u : 0;
}

/** Width of the subject on `rows` evenly spaced rows, as a fraction of its height: where the body is wide. */
export function widthProfile(m: Mask, rows = 48): number[] {
  const b = bounds(m);
  if (!b) return new Array(rows).fill(0);
  const h = b.y1 - b.y0 + 1;
  const out: number[] = [];
  for (let r = 0; r < rows; r++) {
    const y = Math.min(b.y1, b.y0 + Math.floor(((r + 0.5) / rows) * h));
    let x0 = m.width, x1 = -1;
    for (let x = 0; x < m.width; x++) if (m.bits[y * m.width + x]) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x));
    out.push(x1 < 0 ? 0 : (x1 - x0 + 1) / h);
  }
  return out;
}

/** Mean absolute difference between two width profiles (0 = same shape), in fractions of the height. */
export function profileError(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

/** The main colours of the subject: the most common colours, skipping near-duplicates. Returns weights that sum to 1. */
export function dominantColors(im: Img, m: Mask, k = 8, skip?: (x: number, y: number, c: RGB) => boolean): { color: RGB; weight: number }[] {
  const buckets = new Map<number, { n: number; sum: RGB }>();
  let total = 0;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    if (!m.bits[y * im.width + x]) continue;
    const c = at(im, x, y);
    if (skip && skip(x, y, c)) continue; // background seen through a gap, or the flat colour behind the render
    const key = (c[0] >> 4) * 256 + (c[1] >> 4) * 16 + (c[2] >> 4);
    const b = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] as RGB };
    b.n++;
    b.sum = [b.sum[0] + c[0], b.sum[1] + c[1], b.sum[2] + c[2]];
    buckets.set(key, b);
    total++;
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => ({ n: b.n, color: [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n] as RGB }));
  const picked: { color: RGB; n: number }[] = [];
  for (const s of sorted) {
    const near = picked.find((p) => deltaE(p.color, s.color) < 14);
    if (near) near.n += s.n;
    else if (picked.length < k * 3) picked.push({ ...s });
  }
  picked.sort((a, b) => b.n - a.n);
  const top = picked.slice(0, k);
  const sum = top.reduce((a, p) => a + p.n, 0) || 1;
  return top.map((p) => ({ color: p.color.map(Math.round) as RGB, weight: total ? p.n / sum : 0 }));
}

/**
 * How close the palettes are: for every reference colour (weighted by how much of the subject it covers) the distance to
 * the nearest colour of the candidate. Also lists the reference colours the candidate lacks.
 */
export function paletteScore(ref: { color: RGB; weight: number }[], mine: { color: RGB; weight: number }[]): { score: number; meanDeltaE: number; missing: { color: RGB; weight: number; deltaE: number }[] } {
  let mean = 0;
  const missing: { color: RGB; weight: number; deltaE: number }[] = [];
  for (const r of ref) {
    let best = Infinity;
    for (const m of mine) best = Math.min(best, deltaE(r.color, m.color));
    mean += best * r.weight;
    if (best > 18 && r.weight > 0.02) missing.push({ color: r.color, weight: r.weight, deltaE: best });
  }
  return { score: Math.max(0, 1 - mean / 40), meanDeltaE: mean, missing: missing.sort((a, b) => b.weight - a.weight) };
}

export interface Similarity {
  /** 0..1 overall. */
  total: number;
  iou: number;
  /** 0..1, from the width profile. */
  shape: number;
  /** 0..1 from the palette. */
  palette: number;
}

/** One number, with the parts it comes from: 50 % outline, 25 % proportions (width profile), 25 % colours. */
export function similarity(iouV: number, profErr: number, paletteV: number): Similarity {
  const shape = Math.max(0, 1 - profErr / 0.18);
  return { total: 0.5 * iouV + 0.25 * shape + 0.25 * paletteV, iou: iouV, shape, palette: paletteV };
}

/** Paint two normalised masks over each other: ref only = red, mine only = blue, both = light grey. */
export function overlay(ref: Mask, mine: Mask): Uint8ClampedArray {
  const out = new Uint8ClampedArray(ref.width * ref.height * 4);
  for (let i = 0; i < ref.bits.length; i++) {
    const a = ref.bits[i], b = mine.bits[i];
    const c: RGB = a && b ? [225, 225, 225] : a ? [226, 70, 70] : b ? [70, 110, 226] : [255, 255, 255];
    out[i * 4] = c[0];
    out[i * 4 + 1] = c[1];
    out[i * 4 + 2] = c[2];
    out[i * 4 + 3] = 255;
  }
  return out;
}

export const flipMask = (m: Mask): Mask => {
  const bits = new Uint8Array(m.bits.length);
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) bits[y * m.width + x] = m.bits[y * m.width + (m.width - 1 - x)];
  return { ...m, bits };
};
