import type { Store } from '../core/store';
import type { Viewport } from '../engine/viewport';
import { BAG_EXT, decodeBag, mergeSaves, type SaveEntry } from '../core/bag';
import { listSaves, putSaves } from '../core/persist';
import { hasEvent } from '../core/analytics';
import { add, clear, h, icon, modal, toast } from './dom';
import { startProject } from './dialogs';
import { adoptSave, unsavedWork, whenText } from './saves';

const SEEN_KEY = 'polystudio.welcomed';
const uid = () => `s${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;

/** Show the welcome screen once per visit, or whenever there is no work to go back to. */
export function shouldWelcome(store: Store): boolean {
  if (!store.doc.objects.length) return true;
  try {
    return !sessionStorage.getItem(SEEN_KEY);
  } catch {
    return false;
  }
}

const markSeen = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
};

/**
 * The start screen, like Blender's: start something new on the left, pick up an existing save on the right.
 * In a fresh browser (or after the browser data was cleared) the list is empty and offers to import a bag.
 */
export function openWelcome(store: Store, _vp: Viewport): void {
  let close: () => void = () => {};
  let saves: SaveEntry[] = [];
  let loaded = false;
  let ask: string | null = null;
  const hasWork = store.doc.objects.length > 0;

  const name = h('input', { type: 'text', value: 'My prop', maxlength: '60', 'aria-label': 'Project name', id: 'proj-name' }) as HTMLInputElement;
  const guide = h('input', { type: 'checkbox', checked: !hasEvent('first_export'), id: 'proj-guide' }) as HTMLInputElement;
  const root = h('div', { class: 'dlg welcome' });

  const finish = () => {
    markSeen();
    close();
  };
  const create = (openAssets: boolean) => {
    startProject(store, name.value, guide.checked && !openAssets, openAssets);
    finish();
  };
  const open = (s: SaveEntry) => {
    adoptSave(store, s);
    finish();
  };

  const importBag = () => {
    const input = h('input', { type: 'file', accept: `${BAG_EXT},.zip,application/zip,application/octet-stream`, id: 'welcome-import' }) as HTMLInputElement;
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const incoming = await decodeBag(new Uint8Array(await f.arrayBuffer()));
        const res = mergeSaves(saves, incoming, uid);
        const changed = res.saves.filter((s) => !saves.includes(s));
        if (changed.length && !(await putSaves(changed))) throw new Error('The browser would not save these.');
        toast(`Imported ${incoming.length} ${incoming.length === 1 ? 'project' : 'projects'} from the bag.`);
        saves = await listSaves();
        render();
      } catch (e) {
        toast((e as Error).message || 'That file could not be imported.');
      }
    });
    input.click();
  };

  const saveCard = (s: SaveEntry) => {
    const shapes = s.doc.objects.filter((o) => o.kind === 'shape').length;
    const asking = ask === s.id;
    return h('li', { class: 'scard', 'data-save': s.id },
      s.thumb ? h('img', { class: 'sthumb', src: s.thumb, alt: '' }) : h('div', { class: 'sthumb empty' }, icon('folder', 20)),
      h('div', { class: 'sinfo' },
        h('strong', {}, s.name),
        h('span', { class: 'smeta' }, `${whenText(s.savedAt)} · ${shapes} ${shapes === 1 ? 'shape' : 'shapes'}`),
        asking
          ? h('div', { class: 'sask' }, `“${store.doc.name}” is not in your saves and will be replaced. `,
              h('button', { class: 'btn sm primary', 'data-act': 'confirm-open', onclick: () => open(s) }, 'Open anyway'),
              h('button', { class: 'btn sm', onclick: () => { ask = null; render(); } }, 'Cancel'))
          : h('div', { class: 'sactions' },
              h('button', { class: 'btn sm primary', 'data-act': 'open', onclick: () => { if (unsavedWork(store, saves)) { ask = s.id; render(); } else open(s); } }, 'Open')),
      ),
    );
  };

  const render = () => {
    clear(root);
    const right = h('div', { class: 'wright' }, h('h3', {}, 'Your saves'));
    if (hasWork) {
      right.append(h('div', { class: 'wcontinue' },
        h('div', {}, h('strong', {}, store.doc.name), h('span', { class: 'smeta' }, 'Where you left off in this browser')),
        h('button', { class: 'btn primary', id: 'btn-continue', onclick: finish }, 'Continue'),
      ));
    }
    if (!loaded) right.append(h('p', { class: 'fnote' }, 'Looking for your saves…'));
    else if (saves.length) right.append(h('ul', { class: 'slist', id: 'welcome-saves' }, ...saves.map(saveCard)));
    else {
      right.append(
        h('div', { class: 'wempty', id: 'welcome-empty' },
          h('strong', {}, 'No saves in this browser yet'),
          h('p', {}, 'First time here, or the browser data was cleared? If you made a backup, import your ', h('b', {}, BAG_EXT), ' bag to get your projects back.'),
        ),
      );
    }
    right.append(
      h('div', { class: 'wfoot' },
        h('button', { class: 'btn', id: 'btn-welcome-import', onclick: importBag }, icon('folder', 14), `Import bag (${BAG_EXT})…`),
        h('p', { class: 'fnote' }, 'Saves are stored in this browser. Clearing browser data removes them, so keep a bag as a backup (Saves > Download all).'),
      ),
    );

    const left = h('div', { class: 'wleft' },
      h('h3', {}, 'Start'),
      h('label', { class: 'field' }, h('span', {}, 'Project name'), name),
      h('label', { class: 'check' }, guide, h('span', {}, 'Guide me through my first prop (a wooden chest, about 10 minutes)')),
      h('div', { class: 'wbuttons' },
        h('button', { class: 'btn primary', id: 'btn-create', onclick: () => create(false) }, icon('plus', 14), 'New project'),
        h('button', { class: 'btn', id: 'btn-create-assets', title: 'Start a project and open the library of ready-made characters and props', onclick: () => create(true) }, icon('library', 14), 'Browse ready-made assets'),
      ),
    );

    add(
      root,
      h('div', { class: 'whead' },
        h('span', { class: 'logo big' }, h('i'), h('i'), h('i')),
        h('div', {}, h('h2', {}, 'Welcome to Poly Studio'), h('p', { class: 'lead' }, 'Make low-poly props and characters in the browser, then export them to your game engine or 3D software.')),
        hasWork ? h('button', { class: 'tbtn', 'aria-label': 'Close', onclick: finish }, icon('close', 16)) : null,
      ),
      h('div', { class: 'wcols' }, left, right),
    );
  };

  close = modal(root, { wide: true, dismissable: hasWork, onClose: markSeen });
  render();
  void listSaves().then((l) => {
    saves = l;
    loaded = true;
    render();
  });
}
