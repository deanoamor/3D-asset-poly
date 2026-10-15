import type { Store } from '../core/store';
import { meshTriangles, edgeMap, vertCount, type EditMode } from '../core/mesh';
import type { Tool } from '../core/store';
import { clear, fmt, h, icon, toast } from './dom';

const INTRO_KEY = 'polystudio.editintro.v1';

interface Action {
  id: string;
  label: string;
  key: string;
  ico: string;
  tip: string;
  run: () => string | null;
  /** Reason it can't run right now, or null. */
  blocked: () => string | null;
}

export function mountEditBar(root: HTMLElement, store: Store, startTour: () => void): void {
  const banner = h('div', { class: 'editbanner overlay hidden', role: 'status' });
  const hint = h('div', { class: 'hint', role: 'status', id: 'edit-hint' });
  const modes = h('div', { class: 'toolbar seg-group', role: 'group', 'aria-label': 'What to select' });
  const rowTools = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Edit tools' });
  const rowActions = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Shape actions' });
  const dock = h('div', { class: 'dock editdock overlay hidden' }, hint, h('div', { class: 'editrows' }, h('div', { class: 'editrow' }, modes, rowTools), rowActions));
  root.append(banner, dock);

  const modeDefs: { id: EditMode; label: string; ico: string; tip: string }[] = [
    { id: 'vertex', label: 'Points', ico: 'pointsMode', tip: 'Select corner points' },
    { id: 'edge', label: 'Edges', ico: 'edgesMode', tip: 'Select the lines between points' },
    { id: 'face', label: 'Faces', ico: 'facesMode', tip: 'Select flat surfaces' },
  ];
  const modeBtns = modeDefs.map((m) =>
    h('button', { class: 'tool', 'data-mode': m.id, title: m.tip, onclick: () => store.setEditMode(m.id) }, icon(m.ico, 18), h('span', { class: 'tl' }, m.label)),
  );
  modes.append(...modeBtns);

  const toolDefs: { id: Tool; label: string; key: string; ico: string; tip: string }[] = [
    { id: 'select', label: 'Select', key: 'V', ico: 'select', tip: 'Only select, no handle' },
    { id: 'move', label: 'Move', key: 'W', ico: 'move', tip: 'Drag the arrows to move the selection' },
    { id: 'rotate', label: 'Rotate', key: 'E', ico: 'rotate', tip: 'Rotate the selection' },
    { id: 'scale', label: 'Size', key: 'R', ico: 'scale', tip: 'Make the selection bigger or smaller' },
  ];
  const toolBtns = toolDefs.map((t) =>
    h('button', { class: 'tool', 'data-etool': t.id, title: `${t.tip} (${t.key})`, onclick: () => store.setUi({ tool: t.id }) }, icon(t.ico, 18), h('span', { class: 'tl' }, t.label), h('kbd', {}, t.key)),
  );
  const mirror = h('button', { class: 'tool', id: 'edit-mirror', 'aria-pressed': 'false', title: 'Mirror: whatever you do on the left also happens on the right. Great for faces and characters.', onclick: () => store.setEditOption({ symmetry: !store.edit?.symmetry }) }, icon('mirror', 18), h('span', { class: 'tl' }, 'Mirror'));
  const xray = h('button', { class: 'tool', id: 'edit-xray', 'aria-pressed': 'false', title: 'See through the shape so you can pick points on the far side', onclick: () => store.setEditOption({ xray: !store.edit?.xray }) }, icon('xray', 18), h('span', { class: 'tl' }, 'See-through'));
  rowTools.append(h('span', { class: 'vsep' }), ...toolBtns, h('span', { class: 'vsep' }), mirror, xray);

  const need = (what: string, ok: () => boolean) => () => (ok() ? null : what);
  const e = () => store.edit;
  const actions: Action[] = [
    { id: 'edit-pullout', label: 'Pull out', key: 'P', ico: 'pullout', tip: 'Pull the selected face or edge out to make a new part, like a nose or an arm. Then drag the arrows.', run: () => store.pullOut(),
      blocked: () => (e()?.mode === 'vertex' ? 'Switch to Faces or Edges' : e()?.sel.length ? null : 'Select a face or an edge first') },
    { id: 'edit-shrink', label: 'Shrink face', key: 'I', ico: 'shrink', tip: 'Make a smaller face inside the selected one. Useful for windows, eyes and buttons.', run: () => store.shrinkFace(),
      blocked: () => (e()?.mode !== 'face' ? 'Switch to Faces' : e()?.sel.length ? null : 'Select a face first') },
    { id: 'edit-cut', label: 'Add cut', key: 'K', ico: 'cut', tip: 'Add a new ring of points around the shape at the selected edge, so you have more to shape.', run: () => store.addCut(),
      blocked: () => (e()?.mode !== 'edge' ? 'Switch to Edges and click an edge' : e()?.sel.length ? null : 'Click an edge first') },
    { id: 'edit-merge', label: 'Merge points', key: 'M', ico: 'merge', tip: 'Squeeze the selected points into one. Merge the four top points of a box to get a pyramid.', run: () => store.mergePoints(),
      blocked: need('Select two or more points', () => !!e() && e()!.sel.length > 0) },
    { id: 'edit-roundoff', label: 'Round off', key: '', ico: 'roundoff', tip: 'Smooth the whole shape. Corners become round, and it uses more triangles (about 4 times as many).', run: () => store.roundOff(), blocked: () => null },
    { id: 'edit-delete', label: 'Delete', key: 'Del', ico: 'trash', tip: 'Delete the selected faces, edges or points.', run: () => store.deleteSelection(), blocked: need('Select something first', () => !!e()?.sel.length) },
  ];
  const actionBtns = actions.map((a) =>
    h('button', {
      class: 'tool action',
      id: a.id,
      title: a.tip,
      onclick: () => {
        const why = a.blocked();
        if (why) return toast(why + '.');
        const msg = a.run();
        if (msg) toast(msg);
      },
    }, icon(a.ico, 18), h('span', { class: 'tl' }, a.label), a.key ? h('kbd', {}, a.key) : null),
  );
  rowActions.append(...actionBtns);

  const noun = { vertex: ['point', 'points'], edge: ['edge', 'edges'], face: ['face', 'faces'] } as const;

  const refresh = () => {
    const ed = store.edit;
    document.body.classList.toggle('is-editing', !!ed);
    banner.classList.toggle('hidden', !ed);
    dock.classList.toggle('hidden', !ed);
    if (!ed) return;
    const o = store.get(ed.id);
    const mesh = o?.mesh;
    if (!o || !mesh) return;
    const n = ed.sel.length;
    clear(banner);
    banner.append(
      h('span', { class: 'bn' }, icon('edit', 15), h('span', {}, 'Editing '), h('strong', {}, o.name)),
      h('span', { class: 'bsub' }, n ? `${n} ${noun[ed.mode][n === 1 ? 0 : 1]} selected` : 'Nothing selected'),
      h('button', { class: 'link', id: 'edit-howto', onclick: startTour }, 'Show me how'),
      h('button', { class: 'btn primary sm', id: 'edit-done', title: 'Finish editing (Tab)', onclick: () => store.exitEdit() }, icon('check', 14), 'Done'),
    );
    modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === ed.mode));
    toolBtns.forEach((b) => b.classList.toggle('active', b.dataset.etool === store.ui.tool));
    mirror.classList.toggle('active', ed.symmetry);
    mirror.setAttribute('aria-pressed', String(ed.symmetry));
    xray.classList.toggle('active', ed.xray);
    xray.setAttribute('aria-pressed', String(ed.xray));
    actions.forEach((a, i) => {
      const why = a.blocked();
      actionBtns[i].classList.toggle('dim', !!why);
      actionBtns[i].setAttribute('aria-disabled', String(!!why));
    });
    clear(hint);
    const what = noun[ed.mode][1];
    if (!n) {
      hint.append(`Click ${ed.mode === 'face' ? 'a face' : ed.mode === 'edge' ? 'an edge' : 'a point'} to select it · Shift-click adds more · Shift-drag selects an area · drag empty space to look around`);
    } else if (store.ui.tool === 'select') {
      hint.append(`Switch to Move to drag the selected ${what}, or use an action below`);
    } else {
      hint.append(`Drag the arrows to change the selected ${what} · try Pull out to grow a new part`);
    }
    hint.append(h('span', { class: 'hstat' }, `${fmt(vertCount(mesh))} points · ${fmt(edgeMap(mesh).size)} edges · ${fmt(mesh.f.length)} faces · ${fmt(meshTriangles(mesh))} triangles`));
  };

  let lastEdit = '';
  store.subscribe((ev) => {
    if (ev === 'edit' || ev === 'tool' || ev === 'doc' || ev === 'selection') {
      const cur = store.edit?.id ?? '';
      if (cur && cur !== lastEdit) {
        let seen = false;
        try {
          seen = !!localStorage.getItem(INTRO_KEY);
          localStorage.setItem(INTRO_KEY, '1');
        } catch {
          /* ignore */
        }
        if (!seen) toast('First time here? Press "Show me how" at the top for a one-minute walkthrough.', 6000);
      }
      lastEdit = cur;
      refresh();
    }
  });
  refresh();
}
