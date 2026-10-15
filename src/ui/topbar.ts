import type { Store } from '../core/store';
import { h, icon } from './dom';
import { openExportDialog, openProjectDialog, openProjectFile, openShortcuts, saveProjectFile } from './dialogs';
import type { Viewport } from '../engine/viewport';

export const APP_NAME = 'Poly Studio';

export function mountTopbar(root: HTMLElement, store: Store, vp: Viewport, hooks: { editTour: () => void; assets: () => void; saves: () => void }): { setSaved: (s: 'saved' | 'saving') => void } {
  const name = h('input', { class: 'projname', id: 'projname', value: store.doc.name, maxlength: '60', 'aria-label': 'Project name', spellcheck: false }) as HTMLInputElement;
  name.addEventListener('change', () => store.rename(name.value));
  name.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') name.blur();
  });
  const assetsBtn = h('button', { class: 'btn sm', id: 'btn-assets', title: 'Ready-made assets you can use or learn from', onclick: () => hooks.assets() }, icon('library', 15), 'Assets');
  const savesBtn = h('button', { class: 'btn sm', id: 'btn-saves', title: 'Your saved projects, and backup as a .3pi file', onclick: () => hooks.saves() }, icon('folder', 15), 'Saves');
  const status = h('span', { class: 'savestate', role: 'status' }, 'Saved');
  const undo = h('button', { class: 'tbtn', id: 'btn-undo', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', onclick: () => store.undo() }, icon('undo', 17), h('span', { class: 'lbl' }, 'Undo'));
  const redo = h('button', { class: 'tbtn', id: 'btn-redo', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', onclick: () => store.redo() }, icon('redo', 17), h('span', { class: 'lbl' }, 'Redo'));
  const menuList = h('div', { class: 'menu hidden', role: 'menu' },
    h('button', { role: 'menuitem', onclick: () => { hideMenu(); openProjectDialog(store, { first: false }); } }, 'New project…'),
    h('button', { role: 'menuitem', onclick: () => { hideMenu(); hooks.saves(); } }, 'My saves…'),
    h('button', { role: 'menuitem', onclick: () => { hideMenu(); openProjectFile(store); } }, 'Open project file…'),
    h('button', { role: 'menuitem', onclick: () => { hideMenu(); saveProjectFile(store); } }, 'Save project file'),
    h('hr'),
    h('button', { role: 'menuitem', id: 'menu-edit-tour', onclick: () => { hideMenu(); hooks.editTour(); } }, 'Tour: reshape a box'),
    h('button', { role: 'menuitem', onclick: () => { hideMenu(); openShortcuts(); } }, 'Keyboard shortcuts'),
  );
  const hideMenu = () => menuList.classList.add('hidden');
  const menuBtn = h('button', { class: 'tbtn', id: 'btn-menu', title: 'Project menu', 'aria-label': 'Project menu', 'aria-haspopup': 'menu', onclick: () => menuList.classList.toggle('hidden') }, icon('menu', 17));
  document.addEventListener('pointerdown', (e) => {
    if (!(e.target as HTMLElement).closest('.menuwrap')) hideMenu();
  });
  const preview = h('button', { class: 'btn', id: 'btn-preview', title: 'Preview without editing tools', onclick: () => vp.setPreview(!store.ui.preview) }, icon('preview', 15), 'Preview');
  const exp = h('button', { class: 'btn primary', id: 'btn-export', title: 'Export to your game engine', onclick: () => openExportDialog(store) }, icon('export', 15), 'Export');

  root.append(
    h('div', { class: 'tb-left' },
      h('span', { class: 'logo', title: APP_NAME }, h('i'), h('i'), h('i')),
      h('div', { class: 'menuwrap' }, menuBtn, menuList),
      assetsBtn,
      savesBtn,
      name,
      status,
    ),
    h('div', { class: 'tb-mid' }, undo, redo),
    h('div', { class: 'tb-right' }, preview, exp),
  );

  const refresh = () => {
    if (document.activeElement !== name) name.value = store.doc.name;
    (undo as HTMLButtonElement).disabled = !store.canUndo;
    (redo as HTMLButtonElement).disabled = !store.canRedo;
    preview.classList.toggle('active', store.ui.preview);
    preview.setAttribute('aria-pressed', String(store.ui.preview));
    document.title = `${store.doc.name} · ${APP_NAME}`;
  };
  store.subscribe(refresh);
  refresh();
  return { setSaved: (s) => (status.textContent = s === 'saved' ? 'Saved' : 'Saving…') };
}
