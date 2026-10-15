import type { Store, Tool } from '../core/store';
import { PALETTE } from '../core/palette';
import { SHAPE_LABELS, type ShapeType } from '../core/types';
import type { Viewport, ViewName } from '../engine/viewport';
import { clear, h, icon } from './dom';

const SHAPES: ShapeType[] = ['box', 'cylinder', 'sphere', 'cone', 'pyramid', 'plane'];

const TOOLS: { id: Tool; label: string; key: string; ico: string; tip: string }[] = [
  { id: 'select', label: 'Select', key: 'V', ico: 'select', tip: 'Select and slide objects across the ground' },
  { id: 'shape', label: 'Shape', key: 'S', ico: 'shape', tip: 'Draw a new shape' },
  { id: 'move', label: 'Move', key: 'W', ico: 'move', tip: 'Move with handles' },
  { id: 'rotate', label: 'Rotate', key: 'E', ico: 'rotate', tip: 'Rotate with handles' },
  { id: 'scale', label: 'Size', key: 'R', ico: 'scale', tip: 'Resize with handles' },
  { id: 'color', label: 'Color', key: 'C', ico: 'color', tip: 'Paint objects' },
];

export function mountToolbar(root: HTMLElement, store: Store, vp: Viewport): void {
  const hint = h('div', { class: 'hint', role: 'status' });
  const bar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Tools' });
  const flyout = h('div', { class: 'flyout hidden', role: 'menu' });
  const palette = h('div', { class: 'flyout palette hidden' });
  let open: 'shape' | 'color' | null = null;

  const setOpen = (v: typeof open) => {
    open = v;
    flyout.classList.toggle('hidden', v !== 'shape');
    palette.classList.toggle('hidden', v !== 'color');
  };

  const buttons = new Map<Tool, HTMLButtonElement>();
  for (const t of TOOLS) {
    const btn = h(
      'button',
      {
        class: 'tool',
        'data-tool': t.id,
        title: `${t.tip} (${t.key})`,
        'aria-label': `${t.label} (${t.key})`,
        onclick: () => {
          if (t.id === 'shape' || t.id === 'color') {
            const same = store.ui.tool === t.id;
            store.setUi({ tool: t.id });
            setOpen(same && open === t.id ? null : t.id);
          } else {
            setOpen(null);
            store.setUi({ tool: t.id });
          }
        },
      },
      icon(t.ico, 18),
      h('span', { class: 'tl' }, t.label),
      h('kbd', {}, t.key),
    ) as HTMLButtonElement;
    buttons.set(t.id, btn);
    bar.append(btn);
  }

  flyout.append(
    ...SHAPES.map((s) =>
      h('button', {
        class: 'fitem',
        role: 'menuitem',
        'data-shape': s,
        onclick: () => {
          store.setUi({ shape: s, tool: 'shape' });
          setOpen(null);
        },
      }, icon(s, 18), h('span', {}, SHAPE_LABELS[s])),
    ),
  );

  const renderPalette = () => {
    clear(palette);
    palette.append(
      h('div', { class: 'fhead' }, 'Paint color'),
      h('div', { class: 'swatches' }, ...PALETTE.map((s) =>
        h('button', {
          class: `sw${store.ui.paintColor === s.hex ? ' on' : ''}`,
          style: `background:${s.hex}`,
          title: s.name,
          'aria-label': s.name,
          'data-hex': s.hex,
          onclick: () => {
            store.setUi({ paintColor: s.hex, tool: 'color' });
            if (store.selection.length) {
              store.mutate((d) => {
                const ids = new Set<string>();
                const add = (id: string) => {
                  ids.add(id);
                  d.objects.filter((o) => o.parent === id).forEach((c) => add(c.id));
                };
                store.selection.forEach(add);
                for (const o of d.objects) if (ids.has(o.id) && o.kind === 'shape') o.color = s.hex;
              });
            }
          },
        }),
      )),
      h('div', { class: 'fnote' }, 'Pick a color, then click objects to paint them. Selected objects change right away.'),
    );
  };

  const addCenter = h('button', {
    class: 'link',
    id: 'btn-add-center',
    onclick: () => vp.placeShape(store.ui.shape, 0, 0, 1, 1, 0),
  }, 'Add at center');

  const renderHint = () => {
    clear(hint);
    const ui = store.ui;
    if (ui.preview) {
      hint.append(h('span', {}, 'Preview · drag to look around · scroll to zoom · '), h('button', { class: 'link', onclick: () => vp.setPreview(false) }, 'Back to editing (Esc)'));
    } else if (ui.tool === 'shape') {
      hint.append(h('span', {}, `Click or drag on the grid to place a ${SHAPE_LABELS[ui.shape]} · hold Space to orbit · `), addCenter);
    } else if (ui.tool === 'color') {
      hint.append(h('span', {}, 'Click an object to paint it · Shift-click paints a single part'));
    } else if (ui.tool === 'select') {
      hint.append(h('span', {}, store.selection.length ? 'Drag to slide on the ground · Ctrl+D duplicates · use Move for the up/down handle' : 'Drag to orbit · right-drag to pan · scroll to zoom · click an object to select'));
    } else {
      hint.append(h('span', {}, store.selection.length === 1 ? 'Drag the handles in the canvas, or type exact numbers in Properties' : 'Select one object to see its handles'));
    }
  };

  const refresh = () => {
    for (const [id, b] of buttons) b.classList.toggle('active', store.ui.tool === id && !store.ui.preview);
    const sb = buttons.get('shape')!;
    const old = sb.querySelector('.ico');
    old?.replaceWith(icon(store.ui.shape, 18));
    flyout.querySelectorAll<HTMLElement>('.fitem').forEach((f) => f.classList.toggle('on', f.dataset.shape === store.ui.shape));
    if (store.ui.tool !== 'shape' && open === 'shape') setOpen(null);
    if (store.ui.tool !== 'color' && open === 'color') setOpen(null);
    renderPalette();
    renderHint();
    bar.classList.toggle('hidden', store.ui.preview);
  };

  // view buttons & snap toggles (top-right cluster)
  const views: { id: ViewName; label: string; key: string }[] = [
    { id: 'front', label: 'Front', key: '1' },
    { id: 'side', label: 'Side', key: '2' },
    { id: 'top', label: 'Top', key: '3' },
    { id: 'persp', label: '3D', key: '4' },
  ];
  const viewBar = h('div', { class: 'viewbar overlay', role: 'group', 'aria-label': 'Camera views' },
    ...views.map((v) => h('button', { class: 'vbtn', 'data-view': v.id, title: `${v.label} view (${v.key})`, onclick: () => vp.setView(v.id) }, v.label)),
    h('span', { class: 'vsep' }),
    h('button', { class: 'vbtn icon', id: 'btn-focus', title: 'Focus on selection (F)', 'aria-label': 'Focus on selection (F)', onclick: () => vp.focus() }, icon('focus', 15), h('span', {}, 'Focus')),
  );
  const snapBar = h('div', { class: 'snapbar overlay', role: 'group', 'aria-label': 'Snapping' });
  const snapGrid = h('button', { class: 'vbtn icon', id: 'snap-grid', title: 'Snap to grid (0.25 m)', onclick: () => store.setUi({ snapGrid: !store.ui.snapGrid }) }, icon('grid', 15), h('span', {}, 'Grid snap'));
  const snapObj = h('button', { class: 'vbtn icon', id: 'snap-obj', title: 'Snap to other objects', onclick: () => store.setUi({ snapObjects: !store.ui.snapObjects }) }, icon('magnet', 15), h('span', {}, 'Object snap'));
  snapBar.append(snapGrid, snapObj);
  const refreshSnap = () => {
    snapGrid.classList.toggle('active', store.ui.snapGrid);
    snapGrid.setAttribute('aria-pressed', String(store.ui.snapGrid));
    snapObj.classList.toggle('active', store.ui.snapObjects);
    snapObj.setAttribute('aria-pressed', String(store.ui.snapObjects));
    viewBar.classList.toggle('hidden', store.ui.preview);
    snapBar.classList.toggle('hidden', store.ui.preview);
  };

  const dock = h('div', { class: 'dock overlay' }, hint, h('div', { class: 'toolwrap' }, flyout, palette, bar));
  root.append(dock, viewBar, snapBar);
  store.subscribe((e) => {
    if (e === 'tool' || e === 'selection') {
      refresh();
      refreshSnap();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (open && !(e.target as HTMLElement).closest('.toolwrap')) setOpen(null);
  });
  refresh();
  refreshSnap();
}
