import type { Store } from '../core/store';
import { childrenOf, descendantIds } from '../core/docmath';
import type { SceneObject } from '../core/types';
import { clear, h, icon, toast } from './dom';

export function mountLayers(root: HTMLElement, store: Store): void {
  const collapsed = new Set<string>();
  let renaming: string | null = null;
  let dragId: string | null = null;
  let rendering = false;

  const list = h('div', { class: 'layer-list', role: 'tree', 'aria-label': 'Layers' });
  const actions = h('div', { class: 'layer-actions' });
  root.append(h('div', { class: 'panel-head' }, h('span', {}, 'Layers')), list, actions);

  const mkBtn = (ico: string, label: string, title: string, fn: () => void, id?: string) =>
    h('button', { class: 'tbtn sm lab', title, 'aria-label': label, id, onclick: fn }, icon(ico, 15), h('span', {}, label));

  const doGroup = () => {
    const why = store.canGroup();
    if (why) return toast(why);
    store.groupSelected();
  };
  const doUngroup = () => {
    if (!store.selection.some((id) => store.get(id)?.kind === 'group')) return toast('Select a group to ungroup it.');
    store.ungroupSelected();
  };
  const moveSel = (dir: -1 | 1) => store.selection.length === 1 && store.nudgeOrder(store.selection[0], dir);
  actions.append(
    mkBtn('group', 'Group', 'Group selection (Ctrl+G)', doGroup, 'btn-group'),
    mkBtn('ungroup', 'Ungroup', 'Ungroup: release the parts of the selected group (Ctrl+Shift+G)', doUngroup, 'btn-ungroup'),
    mkBtn('duplicate', 'Duplicate', 'Duplicate (Ctrl+D)', () => store.selection.length && store.duplicateSelected(), 'btn-duplicate'),
    mkBtn('up', 'Up', 'Move up in the list', () => moveSel(-1)),
    mkBtn('down', 'Down', 'Move down in the list', () => moveSel(1)),
    mkBtn('trash', 'Delete', 'Delete (Del)', () => store.deleteSelected()),
  );

  function row(o: SceneObject, depth: number): HTMLElement {
    const selected = store.selection.includes(o.id);
    const isGroup = o.kind === 'group';
    const open = !collapsed.has(o.id);
    const caret = isGroup
      ? h('button', { class: 'caret', 'aria-label': open ? 'Collapse' : 'Expand', onclick: (e: Event) => {
          e.stopPropagation();
          if (open) collapsed.add(o.id);
          else collapsed.delete(o.id);
          render();
        } }, icon(open ? 'chevD' : 'chevR', 12))
      : h('span', { class: 'caret ph' });

    const name =
      renaming === o.id
        ? (() => {
            const inp = h('input', { class: 'rename', value: o.name, 'aria-label': 'Layer name' }) as HTMLInputElement;
            const done = (ok: boolean) => {
              if (renaming !== o.id || rendering) return;
              renaming = null;
              if (ok && inp.value.trim() && inp.value.trim() !== o.name) store.update(o.id, { name: inp.value.trim() });
              else render();
            };
            inp.addEventListener('keydown', (e) => {
              e.stopPropagation();
              if (e.key === 'Enter') done(true);
              if (e.key === 'Escape') done(false);
            });
            inp.addEventListener('blur', () => done(true));
            inp.addEventListener('pointerdown', (e) => e.stopPropagation());
            return inp;
          })()
        : h('span', { class: 'lname' }, o.name);

    const el = h(
      'div',
      {
        class: `layer${selected ? ' sel' : ''}${o.visible && !store.learnHidden?.has(o.id) ? '' : ' dim'}`,
        role: 'treeitem',
        'aria-selected': String(selected),
        'aria-level': String(depth + 1),
        draggable: renaming !== o.id,
        dataset: { id: o.id },
        style: `padding-left:${6 + depth * 14}px`,
        onclick: (e: MouseEvent) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            store.select(store.selection.includes(o.id) ? store.selection.filter((x) => x !== o.id) : [...store.selection, o.id]);
          } else store.select([o.id]);
        },
        ondblclick: (e: MouseEvent) => {
          e.stopPropagation();
          renaming = o.id;
          render();
        },
        ondragstart: (e: DragEvent) => {
          dragId = o.id;
          e.dataTransfer?.setData('text/plain', o.id);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        },
        ondragend: () => {
          dragId = null;
          clearDropMarks();
        },
        ondragover: (e: DragEvent) => {
          if (!dragId || dragId === o.id) return;
          e.preventDefault();
          clearDropMarks();
          (e.currentTarget as HTMLElement).classList.add(dropZone(e, isGroup));
        },
        ondrop: (e: DragEvent) => {
          e.preventDefault();
          if (!dragId) return;
          const zone = dropZone(e, isGroup);
          clearDropMarks();
          dropOn(dragId, o, zone);
          dragId = null;
        },
      },
      caret,
      h('span', { class: 'lico' }, icon(isGroup ? 'group' : o.shape!, 15)),
      name,
      o.mesh ? h('span', { class: 'editbadge', title: 'Edited shape' }, icon('edit', 12)) : null,
      h('span', { class: 'lspacer' }),
      h('button', {
        class: `tbtn xs ${o.locked ? 'on' : 'faint'}`,
        title: o.locked ? 'Unlock' : 'Lock',
        'aria-label': o.locked ? `Unlock ${o.name}` : `Lock ${o.name}`,
        'aria-pressed': String(o.locked),
        onclick: (e: Event) => {
          e.stopPropagation();
          store.update(o.id, { locked: !o.locked });
        },
      }, icon(o.locked ? 'lock' : 'unlock', 14)),
      h('button', {
        class: `tbtn xs ${o.visible ? 'faint' : 'on'}`,
        title: o.visible ? 'Hide' : 'Show',
        'aria-label': o.visible ? `Hide ${o.name}` : `Show ${o.name}`,
        'aria-pressed': String(!o.visible),
        onclick: (e: Event) => {
          e.stopPropagation();
          store.update(o.id, { visible: !o.visible });
        },
      }, icon(o.visible ? 'eye' : 'eyeOff', 14)),
    );
    return el;
  }

  function dropZone(e: DragEvent, isGroup: boolean): 'drop-before' | 'drop-after' | 'drop-in' {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const k = (e.clientY - r.top) / r.height;
    if (isGroup && k > 0.28 && k < 0.72) return 'drop-in';
    return k < 0.5 ? 'drop-before' : 'drop-after';
  }
  function clearDropMarks(): void {
    list.querySelectorAll('.drop-before,.drop-after,.drop-in').forEach((n) => n.classList.remove('drop-before', 'drop-after', 'drop-in'));
  }
  function dropOn(id: string, target: SceneObject, zone: string): void {
    if (descendantIds(store.doc, id).includes(target.id)) return toast("A group can't be moved inside itself.");
    if (zone === 'drop-in') {
      const n = childrenOf(store.doc, target.id).filter((c) => c.id !== id).length;
      store.reparent(id, target.id, n);
      return;
    }
    const sibs = childrenOf(store.doc, target.parent).filter((c) => c.id !== id);
    const idx = sibs.findIndex((c) => c.id === target.id);
    store.reparent(id, target.parent, zone === 'drop-before' ? idx : idx + 1);
  }

  function render(): void {
    rendering = true;
    clear(list);
    rendering = false;
    const doc = store.doc;
    if (!doc.objects.length) {
      list.append(
        h('div', { class: 'empty' }, h('strong', {}, 'No objects yet'), h('span', {}, 'Pick Shape in the toolbar, then click or drag on the grid.')),
      );
      return;
    }
    const walk = (parent: string | null, depth: number) => {
      for (const o of childrenOf(doc, parent)) {
        list.append(row(o, depth));
        if (o.kind === 'group' && !collapsed.has(o.id)) walk(o.id, depth + 1);
      }
    };
    walk(null, 0);
    const editing = list.querySelector<HTMLInputElement>('.rename');
    if (editing) {
      editing.focus();
      editing.select();
    }
    // dropping on empty space moves to the end of the top level
    list.append(
      h('div', {
        class: 'layer-tail',
        ondragover: (e: DragEvent) => dragId && e.preventDefault(),
        ondrop: (e: DragEvent) => {
          e.preventDefault();
          if (dragId) store.reparent(dragId, null, 9999);
          dragId = null;
        },
      }),
    );
  }

  store.subscribe((e) => {
    if (renaming && e !== 'selection') return;
    if (e === 'doc' || e === 'selection' || e === 'reset' || e === 'learn') {
      const top = list.scrollTop;
      render();
      list.scrollTop = top;
    }
  });
  // clicking empty list area clears selection
  list.addEventListener('click', (e) => {
    if (e.target === list || (e.target as HTMLElement).classList.contains('layer-tail')) store.select([]);
  });
  render();
}
