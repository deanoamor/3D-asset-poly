import { Vector3 } from 'three';
import type { Store } from './core/store';
import type { Viewport } from './engine/viewport';
import { buildCharacter, type CharSpec } from './core/charspec';
import { checkCharacter, type CheckOptions } from './core/charcheck';
import type { Doc } from './core/types';
import { builtinPicture, ensureImages } from './engine/textures';
import { exportFiles, type ExportOptions } from './engine/exporter';

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
