import { Vector3 } from 'three';
import type { Store } from './core/store';
import type { Viewport } from './engine/viewport';
import { buildCharacter, type CharSpec } from './core/charspec';
import { checkCharacter, type CheckOptions } from './core/charcheck';
import type { Doc } from './core/types';
import { builtinPicture, ensureImages } from './engine/textures';
import { exportFiles, type ExportOptions } from './engine/exporter';
import { bgModel, borderColors, bounds, cleanMask, dominantColors, erode, flipMask, iou, maskFromBackground, normalize, overlay, paletteScore, profileError, similarity, widthProfile, type Img, type Mask, type RGB } from './engine/imgcompare';

export interface RenderOptions {
  views?: string[];
  size?: number;
  /** Show the character in a clip at a time, e.g. { name: 'Walk', t: 0.25 }. */
  anim?: { name: string; t: number };
  /** Expression weights by name (0..1). */
  expr?: Record<string, number>;
  /** Frame only the parts whose name matches this regular expression (e.g. the island, not the whole sea). */
  focus?: string;
  /** A reference picture (data URL) shown first on the contact sheet, to compare against. */
  ref?: string;
  /** Show the pose that is stored in the project. */
  pose?: boolean;
}

/**
 * The hands of an automated user (and of Claude): build a character from a spec, check it, look at it from several
 * angles and export it. Exposed as window.__studio; scripts/studio.mjs drives it.
 */
export function installStudio(store: Store, vp: Viewport): void {
  const settle = async () => {
    await ensureImages(store.doc);
    vp.sync();
    await new Promise((r) => setTimeout(r, 60));
  };

  const api = {
    build: async (spec: CharSpec) => {
      const { doc, warnings } = buildCharacter(spec, { picture: (id, skin) => builtinPicture(id, skin) });
      store.load(doc);
      await settle();
      return { warnings, report: checkCharacter(store.doc, {}) };
    },
    load: async (doc: Doc) => {
      store.load(doc);
      await settle();
    },
    doc: () => JSON.parse(JSON.stringify(store.doc)) as Doc,
    /** Where things are: every joint and the centre / size of every part, to place gear on the body. */
    anchors: () => {
      const r = (n: number) => Math.round(n * 1000) / 1000;
      const joints = Object.fromEntries((store.doc.rig ?? []).map((j) => [j.name, j.pos.map(r)]));
      const parts: Record<string, { center: number[]; size: number[] }> = {};
      for (const o of store.doc.objects) {
        if (o.kind !== 'shape') continue;
        const b = store.worldBounds([o.id]);
        const c = b.getCenter(new Vector3());
        const s = b.getSize(new Vector3());
        parts[o.name] = { center: [r(c.x), r(c.y), r(c.z)], size: [r(s.x), r(s.y), r(s.z)] };
      }
      const all = store.worldBounds().getSize(new Vector3());
      return { height: r(all.y), joints, parts };
    },
    check: (opts: CheckOptions & { separate?: string } = {}) => checkCharacter(store.doc, { ...opts, separate: opts.separate ? new RegExp(opts.separate) : undefined }),
    render: async (o: RenderOptions = {}) => {
      const size = o.size ?? 520;
      const views = o.views?.length ? o.views : ['front', '3q', 'side', 'back'];
      store.select([]);
      store.setUi({ preview: true, showRig: false, pose: false, weights: false });
      if (o.anim) {
        let clip = store.doc.anims?.find((c) => c.name.toLowerCase() === o.anim!.name.toLowerCase());
        if (!clip) {
          const id = store.addPresetClip(o.anim.name.toLowerCase() as never);
          clip = id ? store.clip(id) : undefined;
        }
        if (clip) {
          store.selectClip(clip.id);
          store.setAnimTime(o.anim.t);
        }
      } else if (o.pose) store.setUi({ pose: true });
      store.morphW = {};
      for (const [name, w] of Object.entries(o.expr ?? {})) {
        const m = store.doc.morphs?.find((x) => x.name.toLowerCase() === name.toLowerCase());
        if (m) store.morphW[m.id] = w;
      }
      store.emit('morph');
      await settle();
      const only = o.focus ? store.doc.objects.filter((x) => x.kind === 'shape' && new RegExp(o.focus!).test(x.name)).map((x) => x.id) : undefined;
      const wide = o.focus ? size : Math.round(size * 0.8);
      const images = views.map((v) => ({ view: v, png: vp.renderView(v, v === 'face' ? size : wide, size, 1.08, only) }));
      // one contact sheet with every view side by side, labelled
      const load = (src: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
      const imgs = await Promise.all(images.map((i) => load(i.png)));
      let refImg: HTMLImageElement | null = null;
      if (o.ref) {
        const r = await load(o.ref);
        const k = size / r.height;
        const c = document.createElement('canvas');
        c.width = Math.round(r.width * k);
        c.height = size;
        c.getContext('2d')!.drawImage(r, 0, 0, c.width, c.height);
        refImg = await load(c.toDataURL('image/png'));
      }
      const sheet = document.createElement('canvas');
      sheet.width = imgs.reduce((a, i) => a + i.width + 6, 6) + (refImg ? refImg.width + 6 : 0);
      sheet.height = size + 30;
      const g = sheet.getContext('2d')!;
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, sheet.width, sheet.height);
      let x = 6;
      if (refImg) {
        g.drawImage(refImg, x, 24);
        g.fillStyle = '#b00';
        g.font = '600 14px sans-serif';
        g.fillText('reference', x + 4, 17);
        x += refImg.width + 6;
      }
      imgs.forEach((img, k) => {
        g.drawImage(img, x, 24);
        g.fillStyle = '#333';
        g.font = '600 14px sans-serif';
        g.fillText(images[k].view, x + 4, 17);
        x += img.width + 6;
      });
      store.setUi({ preview: false, pose: false });
      store.emit('morph');
      return { images, sheet: sheet.toDataURL('image/png') };
    },
    /** Cut the subject out of a picture (to see what `compare` will measure): the picture with the background painted magenta. */
    cutout: async (o: { ref: string; tol?: number; bg?: RGB; shadows?: boolean }) => {
      const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = o.ref; });
      const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height);
      const background = borderColors({ data: d.data, width: c.width, height: c.height }).map((b) => b.map(Math.round));
      const m = maskFromBackground({ data: d.data, width: c.width, height: c.height }, { tol: o.tol, bg: o.bg ? [o.bg] : undefined, shadows: o.shadows });
      for (let i = 0; i < m.bits.length; i++) if (!m.bits[i]) (d.data[i * 4] = 255), (d.data[i * 4 + 1] = 0), (d.data[i * 4 + 2] = 255);
      g.putImageData(d, 0, 0);
      return { url: c.toDataURL('image/png'), background };
    },
    /**
     * Measure how much the character looks like a reference picture: cut the subject out of the reference, render the model
     * from many angles on a flat colour, keep the angle whose outline fits best, and report outline overlap, proportions and
     * palette. Returns the numbers, the best angle and a picture (reference | mask overlay | model).
     */
    compare: async (o: { ref: string; views?: string[]; size?: number; focus?: string; tol?: number; bg?: RGB; fit?: number } = { ref: '' }) => {
      const size = o.size ?? 384;
      const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const pix = (img: HTMLImageElement, maxSide = 640): Img => {
        const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, c.width, c.height);
        const d = g.getImageData(0, 0, c.width, c.height);
        return { data: d.data, width: c.width, height: c.height };
      };
      const refImg = pix(await load(o.ref));
      const refMask = maskFromBackground(refImg, { tol: o.tol, bg: o.bg ? [o.bg] : undefined });
      const refN = normalize(refMask);
      const refProfile = widthProfile(refMask);
      const refBg = o.bg ? () => o.bg! : bgModel(refImg);
      const refColors = dominantColors(refImg, erode(refMask, 2), 8, (x, y, c) => Math.hypot(c[0] - refBg(x, y)[0], c[1] - refBg(x, y)[1], c[2] - refBg(x, y)[2]) < (o.tol ?? 42));
      const refBox = bounds(refMask)!;
      store.select([]);
      store.setUi({ preview: true, showRig: false, pose: false, weights: false });
      store.emit('morph');
      await settle();
      const only = o.focus ? store.doc.objects.filter((x) => x.kind === 'shape' && new RegExp(o.focus!).test(x.name)).map((x) => x.id) : undefined;
      const FLAT = 0xff00ff;
      const shot = async (view: string) => {
        const url = vp.renderView(view, size, size, o.fit ?? 1.08, only, FLAT);
        const img = pix(await load(url), size);
        const bits = new Uint8Array(img.width * img.height);
        for (let i = 0; i < bits.length; i++) {
          const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2];
          bits[i] = Math.hypot(r - 255, g - 0, b - 255) > 40 ? 1 : 0;
        }
        const mask: Mask = cleanMask({ width: img.width, height: img.height, bits });
        return { view, url, img, mask };
      };
      const score = (m: Mask) => iou(refN, normalize(m));
      let candidates: string[];
      if (o.views?.length) candidates = o.views;
      else {
        candidates = [];
        for (const el of [2, 10, 18, 26]) for (let az = -75; az <= 75; az += 15) candidates.push(`angle:${az}:${el}`);
      }
      let best = null as null | Awaited<ReturnType<typeof shot>>;
      let bestScore = -1;
      const tried: { view: string; iou: number }[] = [];
      for (const v of candidates) {
        const s = await shot(v);
        const sc = Math.max(score(s.mask), score(flipMask(s.mask)));
        tried.push({ view: v, iou: Math.round(sc * 1000) / 1000 });
        if (sc > bestScore) (bestScore = sc), (best = s);
      }
      if (!o.views?.length && best) { // refine around the best coarse angle
        const m = /^angle:(-?\d+):(-?\d+)$/.exec(best.view)!;
        const az0 = +m[1], el0 = +m[2];
        for (const [da, de] of [[-7, 0], [7, 0], [0, -7], [0, 7], [-7, -7], [7, 7], [-7, 7], [7, -7]]) {
          const v = `angle:${az0 + da}:${Math.max(0, el0 + de)}`;
          const s = await shot(v);
          const sc = Math.max(score(s.mask), score(flipMask(s.mask)));
          tried.push({ view: v, iou: Math.round(sc * 1000) / 1000 });
          if (sc > bestScore) (bestScore = sc), (best = s);
        }
      }
      const mine = best!;
      const flipped = score(flipMask(mine.mask)) > score(mine.mask);
      const mineMask = flipped ? flipMask(mine.mask) : mine.mask;
      const mineN = normalize(mineMask);
      const myProfile = widthProfile(mineMask);
      const profErr = profileError(refProfile, myProfile);
      const myColors = dominantColors(mine.img, erode(mine.mask, 2), 8, (_x, _y, c) => Math.hypot(c[0] - 255, c[1], c[2] - 255) < 90);
      const pal = paletteScore(refColors, myColors);
      const sim = similarity(iou(refN, mineN), profErr, pal.score);
      // proportions in plain words: the share of the height where the outline is wider/narrower than the reference
      const rows = refProfile.length;
      const notes: string[] = [];
      const band = (name: string, a: number, b: number) => {
        let d = 0;
        for (let i = Math.floor(a * rows); i < Math.ceil(b * rows); i++) d += myProfile[i] - refProfile[i];
        d /= Math.max(1, Math.ceil(b * rows) - Math.floor(a * rows));
        if (Math.abs(d) > 0.035) notes.push(`${name}: ${d > 0 ? 'too wide' : 'too narrow'} by ${Math.round(Math.abs(d) * 100)} % of the height`);
      };
      band('head and neck (top 20 %)', 0, 0.2);
      band('shoulders and chest (20–45 %)', 0.2, 0.45);
      band('waist and hips (45–60 %)', 0.45, 0.6);
      band('legs (60–100 %)', 0.6, 1);
      const refAspect = (refBox.x1 - refBox.x0 + 1) / (refBox.y1 - refBox.y0 + 1);
      const mb = bounds(mineMask)!;
      const myAspect = (mb.x1 - mb.x0 + 1) / (mb.y1 - mb.y0 + 1);
      if (Math.abs(myAspect / refAspect - 1) > 0.12) notes.push(`overall ${myAspect > refAspect ? 'wider' : 'narrower'} than the reference (width/height ${myAspect.toFixed(2)} vs ${refAspect.toFixed(2)})`);
      // a picture: the reference with its cut-out, the overlay, the model
      const tile = 300;
      const sheet = document.createElement('canvas');
      sheet.width = tile * 4 + 30;
      sheet.height = tile + 30;
      const g = sheet.getContext('2d')!;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, sheet.width, sheet.height);
      g.font = '600 13px sans-serif';
      const put = (src: CanvasImageSource, w: number, h: number, x: number, label: string) => {
        const k = Math.min(tile / w, tile / h);
        g.drawImage(src, x + (tile - w * k) / 2, 24 + (tile - h * k) / 2, w * k, h * k);
        g.fillStyle = '#333';
        g.fillText(label, x + 4, 16);
      };
      const refEl = await load(o.ref);
      put(refEl, refEl.naturalWidth, refEl.naturalHeight, 6, 'reference');
      const ov = document.createElement('canvas');
      ov.width = ov.height = 128;
      ov.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(overlay(refN, mineN)), 128, 128), 0, 0);
      put(ov, 128, 128, 6 + tile + 6, 'red = reference only, blue = mine only');
      const mineEl = await load(mine.url);
      const mc = document.createElement('canvas');
      mc.width = mc.height = size;
      const mg = mc.getContext('2d')!;
      mg.fillStyle = '#e8ddcd';
      mg.fillRect(0, 0, size, size);
      mg.drawImage(mineEl, 0, 0);
      const md = mg.getImageData(0, 0, size, size);
      for (let i = 0; i < size * size; i++) if (Math.hypot(md.data[i * 4] - 255, md.data[i * 4 + 1], md.data[i * 4 + 2] - 255) <= 40) (md.data[i * 4] = 232), (md.data[i * 4 + 1] = 221), (md.data[i * 4 + 2] = 205);
      mg.putImageData(md, 0, 0);
      put(mc, size, size, 6 + (tile + 6) * 2, `mine, ${mine.view}${flipped ? ' (mirrored)' : ''}`);
      // palette swatches: reference colours on top, mine under
      const sw = document.createElement('canvas');
      sw.width = 260;
      sw.height = 260;
      const sg = sw.getContext('2d')!;
      sg.fillStyle = '#fff';
      sg.fillRect(0, 0, 260, 260);
      refColors.forEach((c, i) => { sg.fillStyle = `rgb(${c.color})`; sg.fillRect(8 + i * 30, 20, 28, 60); });
      myColors.forEach((c, i) => { sg.fillStyle = `rgb(${c.color})`; sg.fillRect(8 + i * 30, 120, 28, 60); });
      sg.fillStyle = '#333';
      sg.font = '600 12px sans-serif';
      sg.fillText('reference colours', 8, 14);
      sg.fillText('my colours', 8, 114);
      put(sw, 260, 260, 6 + (tile + 6) * 3, 'palette');
      const hex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
      return {
        similarity: Math.round(sim.total * 1000) / 10,
        outline: Math.round(sim.iou * 1000) / 10,
        proportions: Math.round(sim.shape * 1000) / 10,
        palette: Math.round(sim.palette * 1000) / 10,
        bestView: mine.view,
        mirrored: flipped,
        // a mirrored match of a symmetric model equals the opposite azimuth
        effectiveView: flipped ? mine.view.replace(/^angle:(-?\d+(?:\.\d+)?)/, (_m, a) => `angle:${-parseFloat(a)}`) : mine.view,
        notes,
        missingColors: pal.missing.slice(0, 5).map((m) => ({ color: hex(m.color), share: Math.round(m.weight * 100), deltaE: Math.round(m.deltaE) })),
        referenceColors: refColors.map((c) => hex(c.color)),
        myColors: myColors.map((c) => hex(c.color)),
        tried: tried.length,
        sheet: sheet.toDataURL('image/png'),
      };
    },
    export: async (opts: Partial<ExportOptions> = {}) => {
      await settle();
      const res = await exportFiles(store.doc, { format: 'glb', collision: false, ...opts });
      const bytes = new Uint8Array(await res.blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { filename: res.filename, base64: btoa(bin), triangles: res.triangles, drawCalls: res.drawCalls, materials: res.materials, morphs: res.morphs };
    },
  };
  (window as unknown as { __studio: typeof api }).__studio = api;
}
