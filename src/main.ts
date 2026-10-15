import './style.css';
import { Store, emptyDoc } from './core/store';
import { readSavedDoc, readSavedHistory, startAutosave } from './core/persist';
import { Viewport, isTyping } from './engine/viewport';
import { h } from './ui/dom';
import { mountLayers } from './ui/layers';
import { mountProps } from './ui/props';
import { mountToolbar } from './ui/toolbar';
import { mountPolyCounter } from './ui/polycounter';
import { mountTopbar } from './ui/topbar';
import { mountEditTour, mountOnboarding, type Tour } from './ui/onboarding';
import { mountEditBar } from './ui/editbar';
import { mountLearn, openAssetLibrary } from './ui/assets';
import { openExportDialog, openProjectDialog, openShortcuts } from './ui/dialogs';
import { toast } from './ui/dom';

async function boot(): Promise<void> {
  const app = document.getElementById('app')!;
  const saved = readSavedDoc();
  const store = new Store(saved?.doc ?? emptyDoc());
  if (saved) {
    const hist = await readSavedHistory(saved.savedAt);
    if (hist) store.load(saved.doc, hist);
  }

  const topbar = h('header', { class: 'topbar' });
  const layers = h('aside', { class: 'panel left', id: 'layers', 'aria-label': 'Layers' });
  const stage = h('main', { class: 'stage', id: 'stage' });
  const props = h('aside', { class: 'panel right', id: 'props', 'aria-label': 'Properties' });
  app.append(topbar, layers, stage, props);

  const vp = new Viewport(stage, store);
  const tours: Tour[] = [];
  const bar = mountTopbar(topbar, store, vp, { editTour: () => startEditTour(), assets: () => openAssetLibrary(store, vp, learnPlayer) });
  mountLayers(layers, store);
  mountProps(props, store);
  mountToolbar(stage, store, vp);
  mountPolyCounter(stage, store);
  tours.push(mountOnboarding(stage, store, () => tours.filter((t) => t !== tours[0])));
  const editTour = mountEditTour(stage, store, () => tours.filter((t) => t !== editTour));
  tours.push(editTour);
  const learnPlayer = mountLearn(stage, store, vp, () => tours.filter((t) => t !== learnTour));
  const learnTour: Tour = { start: () => {}, stop: () => learnPlayer.stop(), active: learnPlayer.active };
  tours.push(learnTour);
  mountEditBar(stage, store, () => startEditTour());
  function startEditTour(): void {
    if (store.edit || store.selection.length || store.doc.objects.length) editTour.start();
    else {
      store.addShape('box', { name: 'Head', position: [0, 0.5, 0] });
      editTour.start();
    }
  }
  startAutosave(store, bar.setSaved);

  // Debug / test hook
  (window as unknown as { __app: unknown }).__app = { store, vp };

  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    if (document.querySelector('.modal-back')) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (!mod && k === 'tab') {
      e.preventDefault();
      if (store.edit) store.exitEdit();
      else {
        const why = store.whyNotEditable(store.selection.length === 1 ? store.selection[0] : undefined);
        if (why) toast(why);
        else store.enterEdit(store.selection[0]);
      }
      return;
    }
    if (store.edit) {
      const say = (m: string | null) => m && toast(m);
      if (mod) {
        if (k === 'a') {
          e.preventDefault();
          store.editSelectAll();
        } else if (k === 'z') {
          e.preventDefault();
          e.shiftKey ? store.redo() : store.undo();
        } else if (k === 'y') {
          e.preventDefault();
          store.redo();
        }
        return;
      }
      switch (k) {
        case 'v': store.setUi({ tool: 'select' }); break;
        case 'w': store.setUi({ tool: 'move' }); break;
        case 'e': store.setUi({ tool: 'rotate' }); break;
        case 'r': store.setUi({ tool: 'scale' }); break;
        case 'p': say(store.pullOut()); break;
        case 'i': say(store.shrinkFace()); break;
        case 'k': say(store.addCut()); break;
        case 'm': say(store.mergePoints()); break;
        case 'a': store.editSelectAll(); break;
        case 'f': vp.focus(); break;
        case '1': vp.setView('front'); break;
        case '2': vp.setView('side'); break;
        case '3': vp.setView('top'); break;
        case '4': vp.setView('persp'); break;
        case 'delete':
        case 'backspace':
        case 'x':
          e.preventDefault();
          say(store.deleteSelection());
          break;
        case 'escape':
          if (store.edit.sel.length) store.editSelect([]);
          else store.exitEdit();
          break;
      }
      return;
    }
    if (mod) {
      if (k === 'z') {
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
      } else if (k === 'y') {
        e.preventDefault();
        store.redo();
      } else if (k === 'd') {
        e.preventDefault();
        if (store.selection.length) store.duplicateSelected();
      } else if (k === 'g') {
        e.preventDefault();
        if (e.shiftKey) store.ungroupSelected();
        else {
          const why = store.canGroup();
          if (why) toast(why);
          else store.groupSelected();
        }
      } else if (k === 'a') {
        e.preventDefault();
        store.select(store.doc.objects.filter((o) => o.parent === null).map((o) => o.id));
      } else if (k === 'e') {
        e.preventDefault();
        openExportDialog(store);
      }
      return;
    }
    if (e.altKey) return;
    switch (k) {
      case 'v': store.setUi({ tool: 'select' }); break;
      case 's': store.setUi({ tool: 'shape' }); break;
      case 'w': store.setUi({ tool: 'move' }); break;
      case 'e': store.setUi({ tool: 'rotate' }); break;
      case 'r': store.setUi({ tool: 'scale' }); break;
      case 'c': store.setUi({ tool: 'color' }); break;
      case 'f': vp.focus(); break;
      case '1': vp.setView('front'); break;
      case '2': vp.setView('side'); break;
      case '3': vp.setView('top'); break;
      case '4': vp.setView('persp'); break;
      case 'delete':
      case 'backspace':
        e.preventDefault();
        store.deleteSelected();
        break;
      case 'escape':
        if (store.ui.preview) vp.setPreview(false);
        else if (store.ui.tool !== 'select') store.setUi({ tool: 'select' });
        else store.select([]);
        break;
      case '?': openShortcuts(); break;
    }
  });

  if (!saved) openProjectDialog(store, { first: true });
}

void boot();
