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
      const images = views.map((v) => ({ view: v, png: vp.renderView(v, v === 'face' ? size : Math.round(size * 0.8), size) }));
      // one contact sheet with every view side by side, labelled
      const load = (src: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
      const imgs = await Promise.all(images.map((i) => load(i.png)));
      const sheet = document.createElement('canvas');
      sheet.width = imgs.reduce((a, i) => a + i.width + 6, 6);
      sheet.height = size + 30;
      const g = sheet.getContext('2d')!;
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, sheet.width, sheet.height);
      let x = 6;
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
