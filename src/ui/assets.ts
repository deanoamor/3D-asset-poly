import type { Store } from '../core/store';
import { ASSETS, assetStats, instantiateAsset, type AssetDef } from '../core/assets';
import { logEvent } from '../core/analytics';
import type { Viewport } from '../engine/viewport';
import { assetThumbnails } from './assetThumbs';
import { clear, fmt, h, icon, modal, toast } from './dom';
import { openExportDialog } from './dialogs';
import type { Tour } from './onboarding';

/** Put an asset into the current project, to the right of whatever is already there. */
export function addAsset(store: Store, vp: Viewport, def: AssetDef): { groupId: string; partStep: Map<string, number>; partIds: string[] } {
  store.exitEdit();
  const names = new Set(store.doc.objects.map((o) => o.name));
  const stats = assetStats(def);
  const box = store.worldBounds();
  const x = box.isEmpty() ? 0 : box.max.x + 1.5 + stats.width / 2;
  const { group, parts, partStep } = instantiateAsset(def, [x, 0, 0], names);
  store.mutate((d) => d.objects.push(group, ...parts));
  store.select([group.id]);
  vp.focus();
  logEvent('asset_added', { asset: def.id });
  return { groupId: group.id, partStep, partIds: parts.map((p) => p.id) };
}

export function mountLearn(root: HTMLElement, store: Store, vp: Viewport, others: () => Tour[] = () => []): { start: (def: AssetDef) => void; stop: () => void; active: () => boolean } {
  const card = h('div', { class: 'coach learn overlay hidden', role: 'region', 'aria-label': 'Learn how it is made', id: 'coach-learn' });
  root.append(card);
  let def: AssetDef | null = null;
  let step = 0;
  let groupId = '';
  let partStep = new Map<string, number>();

  const idsAt = (pred: (s: number) => boolean) => [...partStep].filter(([, s]) => pred(s)).map(([id]) => id);

  function show(): void {
    if (!def) return;
    store.setLearnHidden(new Set(idsAt((s) => s > step)));
    const fresh = idsAt((s) => s === step);
    if (step < def.steps.length) store.select(fresh);
    render();
  }

  function render(): void {
    clear(card);
    if (!def) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    const d = def;
    const total = d.steps.length;
    const dots = h('div', { class: 'ldots', 'aria-hidden': 'true' }, ...d.steps.map((_, i) => h('span', { class: i < step ? 'done' : i === step ? 'now' : '' })));
    if (step >= total) {
      const st = assetStats(d);
      card.append(
        h('div', { class: 'coach-head' }, h('span', { class: 'coach-count' }, `Learn · ${d.name}`), h('button', { class: 'tbtn xs', 'aria-label': 'Close', onclick: stop }, icon('close', 14))),
        h('strong', {}, `You have built a ${d.name.toLowerCase()}`),
        h('p', {}, `${st.parts} parts and ${fmt(st.triangles)} triangles. That is a small fraction of a mobile budget, which is how game props are made: simple shapes, used well.`),
        h('div', { class: 'lchallenge' }, h('b', {}, 'Challenge'), h('span', {}, d.challenge)),
        h('div', { class: 'coach-actions' },
          h('button', { class: 'btn primary sm', id: 'learn-export', onclick: () => { stop(); openExportDialog(store); } }, icon('export', 14), 'Export it'),
          h('button', { class: 'btn sm', id: 'learn-close', onclick: stop }, 'Keep editing'),
          h('button', { class: 'link', onclick: () => { step = 0; show(); } }, 'Replay'),
        ),
      );
      return;
    }
    const s = d.steps[step];
    const names = d.parts.filter((p) => p.step === step).map((p) => p.name);
    card.append(
      h('div', { class: 'coach-head' }, h('span', { class: 'coach-count' }, `Learn · ${d.name} · Step ${step + 1} of ${total}`), h('button', { class: 'tbtn xs', 'aria-label': 'Close lesson', title: 'Close lesson (the whole asset stays)', onclick: stop }, icon('close', 14))),
      dots,
      h('strong', {}, s.title),
      h('p', {}, s.text),
      h('div', { class: 'lgroup' }, h('span', { class: 'lhead' }, 'New in this step'), h('div', { class: 'chips' }, ...names.map((n) => h('span', { class: 'chip part' }, n)))),
      h('div', { class: 'lgroup' }, h('span', { class: 'lhead' }, 'Tools and ideas'), h('div', { class: 'chips' }, ...s.tools.map((t) => h('span', { class: 'chip' }, t)))),
      h('div', { class: 'coach-actions' },
        h('button', { class: 'btn sm', id: 'learn-back', disabled: step === 0, onclick: () => { step -= 1; show(); } }, 'Back'),
        h('button', { class: 'btn primary sm', id: 'learn-next', onclick: () => { step += 1; show(); } }, step === total - 1 ? 'Finish' : 'Next'),
      ),
    );
  }

  function start(asset: AssetDef): void {
    others().forEach((t) => t.stop());
    const added = addAsset(store, vp, asset);
    def = asset;
    step = 0;
    groupId = added.groupId;
    partStep = new Map(added.partIds.map((id) => [id, added.partStep.get(id) ?? 0]));
    logEvent('learn_start', { asset: asset.id });
    show();
  }

  function stop(): void {
    const had = def;
    def = null;
    store.setLearnHidden(null);
    if (had && store.get(groupId)) store.select([groupId]);
    render();
  }

  store.subscribe((e) => {
    if (def && e === 'doc' && !store.get(groupId)) stop(); // the asset was deleted
  });
  return { start, stop, active: () => !!def };
}

export function openAssetLibrary(store: Store, vp: Viewport, learn: { start: (d: AssetDef) => void }): void {
  let close: () => void = () => {};
  const thumbs = assetThumbnails();
  const cards = ASSETS.map((def) => {
    const st = assetStats(def);
    const src = thumbs.get(def.id);
    return h('article', { class: 'acard', 'data-asset': def.id },
      src ? h('img', { class: 'athumb', src, alt: `${def.name}, 3D preview`, width: 560, height: 420 }) : h('div', { class: 'athumb none' }, def.name),
      h('div', { class: 'abody' },
        h('div', { class: 'atitle' }, h('strong', {}, def.name), h('span', { class: `level ${def.level.toLowerCase()}` }, def.level)),
        h('p', { class: 'atag' }, def.tagline),
        h('div', { class: 'astats' }, h('span', {}, `${st.parts} parts`), h('span', {}, `${fmt(st.triangles)} triangles`), h('span', {}, `${st.height.toFixed(1)} m tall`)),
        h('ul', { class: 'alearn' }, ...def.learn.slice(0, 3).map((t) => h('li', {}, t))),
        h('div', { class: 'aactions' },
          h('button', {
            class: 'btn primary sm',
            'data-act': 'add',
            title: 'Put this asset into your project as a group. Every part has a clear name.',
            onclick: () => {
              close();
              addAsset(store, vp, def);
              toast(`${def.name} added. Edit any part, or export it as it is.`);
            },
          }, icon('plus', 14), 'Add to project'),
          h('button', {
            class: 'btn sm',
            'data-act': 'learn',
            title: 'Watch it being built, step by step, with the tools used',
            onclick: () => {
              close();
              learn.start(def);
            },
          }, icon('library', 14), 'Learn how it is made'),
        ),
      ),
    );
  });
  const body = h('div', { class: 'dlg library' },
    h('div', { class: 'dlg-head' }, h('h2', {}, 'Asset library'), h('button', { class: 'tbtn', 'aria-label': 'Close', onclick: () => close() }, icon('close', 16))),
    h('p', { class: 'lead' }, 'Ready-made props you can use right away. Add one to your project, or follow along to see how it is built, one step at a time.'),
    h('div', { class: 'agrid' }, ...cards),
    h('p', { class: 'fnote' }, 'Assets are added as a group, to the right of what you already have. Nothing in your project is replaced.'),
  );
  close = modal(body, { wide: true });
}
