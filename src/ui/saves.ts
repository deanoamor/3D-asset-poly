import type { Store } from '../core/store';
import type { Viewport } from '../engine/viewport';
import { BAG_EXT, decodeBag, encodeBag, mergeSaves, type SaveEntry } from '../core/bag';
import { deleteSave, listSaves, putSaves } from '../core/persist';
import { download } from '../engine/exporter';
import { add, clear, h, icon, modal, toast } from './dom';

const LINK_KEY = 'polystudio.saveId';
const uid = () => `s${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;

const getLink = (): string | null => {
  try {
    return localStorage.getItem(LINK_KEY);
  } catch {
    return null;
  }
};
const setLink = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(LINK_KEY, id);
    else localStorage.removeItem(LINK_KEY);
  } catch {
    /* ignore */
  }
};

let loading = false;

/** The "open now" link belongs to one project: any other new or opened project cuts it, so a save is never overwritten by mistake. */
export function watchSaveLink(store: Store): void {
  store.subscribe((e) => {
    if (e === 'reset' && !loading) setLink(null);
  });
}

const when = (t: number) => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const stamp = () => new Date().toISOString().slice(0, 10);

/** A small picture of the current view, for the list. */
function thumbnail(vp: Viewport): string | undefined {
  try {
    vp.snapshot(); // renders a fresh frame, so the canvas can be copied right away
    const live = document.querySelector<HTMLCanvasElement>('.stage canvas');
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 150;
    const g = c.getContext('2d');
    if (!live || !g || !live.width || !live.height) return undefined;
    g.fillStyle = '#f1f1ef';
    g.fillRect(0, 0, 200, 150);
    const k = Math.min(200 / live.width, 150 / live.height);
    g.drawImage(live, (200 - live.width * k) / 2, (150 - live.height * k) / 2, live.width * k, live.height * k);
    return c.toDataURL('image/jpeg', 0.7);
  } catch {
    return undefined;
  }
}

export function openSavesDialog(store: Store, vp: Viewport): void {
  let close: () => void = () => {};
  const root = h('div', { class: 'dlg saves' });
  let saves: SaveEntry[] = [];
  let ask: { id: string; kind: 'open' | 'delete' } | null = null;
  let busy = false;

  const isDirty = (): boolean => {
    if (!store.doc.objects.length) return false;
    const link = saves.find((s) => s.id === getLink());
    return !link || JSON.stringify(link.doc) !== JSON.stringify(store.doc);
  };

  const refresh = async () => {
    saves = await listSaves();
    render();
  };

  const saveNow = async (asCopy: boolean) => {
    if (busy) return;
    busy = true;
    const link = asCopy ? null : getLink();
    const existing = saves.find((s) => s.id === link);
    const entry: SaveEntry = {
      id: existing ? existing.id : uid(),
      name: store.doc.name,
      savedAt: Date.now(),
      doc: JSON.parse(JSON.stringify(store.doc)),
      thumb: thumbnail(vp),
    };
    const ok = await putSaves([entry]);
    busy = false;
    if (!ok) {
      toast('The browser would not save this. Download a .3pi bag instead.');
      return;
    }
    setLink(entry.id);
    toast(existing ? `Updated “${entry.name}”.` : `Saved “${entry.name}”.`);
    await refresh();
  };

  const openSave = (s: SaveEntry) => {
    loading = true;
    store.load(JSON.parse(JSON.stringify(s.doc)));
    loading = false;
    setLink(s.id);
    toast(`Opened “${s.name}”.`);
    close();
  };

  const downloadBag = async () => {
    if (!saves.length) return;
    try {
      const bytes = await encodeBag(saves);
      const name = await download(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }), `poly-studio-saves-${stamp()}${BAG_EXT}`);
      if (name) toast(`Saved ${saves.length} ${saves.length === 1 ? 'project' : 'projects'} to “${name}”.`);
    } catch (e) {
      toast((e as Error).message || 'Could not make the bag.');
    }
  };

  const importBag = () => {
    const input = h('input', { type: 'file', accept: `${BAG_EXT},.zip,application/zip,application/octet-stream`, id: 'saves-import' }) as HTMLInputElement;
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const incoming = await decodeBag(new Uint8Array(await f.arrayBuffer()));
        const res = mergeSaves(saves, incoming, uid);
        const changed = res.saves.filter((s) => !saves.includes(s));
        if (changed.length && !(await putSaves(changed))) throw new Error('The browser would not save these.');
        const bits = [res.added && `${res.added} new`, res.updated && `${res.updated} updated`, res.copied && `${res.copied} kept as copies`, res.kept && `${res.kept} already here`].filter(Boolean);
        toast(`Imported: ${bits.join(', ') || 'nothing new'}.`);
        await refresh();
      } catch (e) {
        toast((e as Error).message || 'That file could not be imported.');
      }
    });
    input.click();
  };

  const card = (s: SaveEntry) => {
    const linked = s.id === getLink();
    const asking = ask?.id === s.id ? ask.kind : null;
    const shapes = s.doc.objects.filter((o) => o.kind === 'shape').length;
    return h('li', { class: `scard${linked ? ' current' : ''}`, 'data-save': s.id },
      s.thumb ? h('img', { class: 'sthumb', src: s.thumb, alt: '' }) : h('div', { class: 'sthumb empty' }, icon('folder', 20)),
      h('div', { class: 'sinfo' },
        h('strong', {}, s.name, linked ? h('span', { class: 'schip' }, 'open now') : null),
        h('span', { class: 'smeta' }, `${when(s.savedAt)} · ${shapes} ${shapes === 1 ? 'shape' : 'shapes'}`),
        asking === 'open'
          ? h('div', { class: 'sask' }, 'Your current project is not saved here and will be replaced. ',
              h('button', { class: 'btn sm primary', 'data-act': 'confirm-open', onclick: () => openSave(s) }, 'Open anyway'),
              h('button', { class: 'btn sm', onclick: () => { ask = null; render(); } }, 'Cancel'))
          : asking === 'delete'
            ? h('div', { class: 'sask' }, 'Delete this save for good? ',
                h('button', { class: 'btn sm danger', 'data-act': 'confirm-delete', onclick: async () => { await deleteSave(s.id); if (getLink() === s.id) setLink(null); ask = null; toast(`Deleted “${s.name}”.`); await refresh(); } }, 'Delete'),
                h('button', { class: 'btn sm', onclick: () => { ask = null; render(); } }, 'Cancel'))
            : h('div', { class: 'sactions' },
                h('button', { class: 'btn sm primary', 'data-act': 'open', onclick: () => { if (isDirty() && !linked) { ask = { id: s.id, kind: 'open' }; render(); } else openSave(s); } }, 'Open'),
                h('button', { class: 'btn sm', 'data-act': 'delete', onclick: () => { ask = { id: s.id, kind: 'delete' }; render(); } }, 'Delete')),
      ),
    );
  };

  const render = () => {
    const linked = saves.find((s) => s.id === getLink());
    clear(root);
    add(
      root,
      h('div', { class: 'dlg-head' }, h('h2', {}, 'My saves'), h('button', { class: 'tbtn', 'aria-label': 'Close', onclick: () => close() }, icon('close', 16))),
      h('div', { class: 'savewarn', id: 'save-warning', role: 'note' }, icon('warn', 16),
        h('p', {}, h('strong', {}, 'These saves live in this browser only. '), 'They are lost if you clear your browser data, use a private window, or switch to another computer. To keep them safe, download all of them as a ', h('b', {}, BAG_EXT), ' bag and import it wherever you need it.')),
      h('div', { class: 'savebar' },
        h('button', { class: 'btn primary', id: 'btn-save-now', disabled: !store.doc.objects.length, onclick: () => void saveNow(false) }, icon('plus', 14), linked ? `Update “${linked.name}”` : `Save “${store.doc.name}”`),
        linked ? h('button', { class: 'btn', id: 'btn-save-copy', onclick: () => void saveNow(true) }, 'Save as a new copy') : null,
      ),
      saves.length
        ? h('ul', { class: 'slist', id: 'saves-list' }, ...saves.map(card))
        : h('p', { class: 'fnote sempty', id: 'saves-empty' }, 'Nothing saved yet. Press “Save” to put the current project in this list.'),
      h('div', { class: 'dlg-actions saves-foot' },
        h('button', { class: 'btn', id: 'btn-import-bag', title: 'Add the saves from a .3pi file', onclick: importBag }, 'Import bag (.3pi)…'),
        h('button', { class: 'btn primary', id: 'btn-download-bag', disabled: !saves.length, title: 'One file with every save in this list', onclick: () => void downloadBag() }, icon('export', 14), `Download all (${BAG_EXT})`),
      ),
    );
  };

  close = modal(root, { wide: true });
  render();
  void refresh();
}
