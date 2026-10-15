import type { Store } from '../core/store';
import type { Joint, Vec3 } from '../core/types';
import { HUMAN, humanSpec, jointsFromSpec } from '../core/library/rigs';
import { clear, h, icon, toast } from './dom';

/** The Skeleton section under Layers: add joints, see the bone tree, move and rename joints. */
export function mountSkeleton(root: HTMLElement, store: Store): void {
  const box = h('section', { class: 'skel', 'aria-label': 'Skeleton', id: 'skeleton' });
  root.append(box);
  let open = true;

  const depthOf = (j: Joint, rig: Joint[]): number => {
    let d = 0;
    let cur: Joint | undefined = j;
    const seen = new Set<string>();
    while (cur?.parent && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = rig.find((q) => q.id === cur!.parent);
      d++;
    }
    return d;
  };

  /** Order joints depth-first so children sit under their parent. */
  const ordered = (rig: Joint[]): Joint[] => {
    const out: Joint[] = [];
    const walk = (p: string | null) => {
      for (const j of rig) if (j.parent === p) {
        out.push(j);
        walk(j.id);
      }
    };
    walk(null);
    for (const j of rig) if (!out.includes(j)) out.push(j); // anything left over (a broken parent link)
    return out;
  };

  const addPerson = () => {
    const sel = store.selection.length ? store.selection : [];
    if (!sel.length) return toast('Select your character first (click it in the list or the scene).');
    const b = store.worldBounds(sel);
    if (b.isEmpty()) return toast('Nothing to fit the skeleton to.');
    const height = b.max.y - b.min.y;
    const k = height / (HUMAN.headTop[1] + 0.06);
    const first = store.get(sel[0]);
    const owner = sel.length === 1 && first?.kind === 'group' ? first.id : undefined;
    store.addJoints(jointsFromSpec(humanSpec(), owner, [(b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2], k));
    store.selectJoint(store.doc.rig![0].id);
    toast('Skeleton added. Drag the white balls to fit it, or use the list.');
  };

  const num = (label: string, value: number, on: (v: number) => void) => {
    const input = h('input', { type: 'number', step: '0.01', value: String(Math.round(value * 1000) / 1000), 'aria-label': label }) as HTMLInputElement;
    input.addEventListener('change', () => {
      const v = parseFloat(input.value);
      if (Number.isFinite(v)) on(v);
    });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') input.blur();
    });
    return h('label', { class: 'jnum' }, h('span', {}, label), input);
  };

  let withChildren = false;

  function editor(j: Joint, rig: Joint[]): HTMLElement {
    const kids = store.jointDescendants(j.id);
    const name = h('input', { type: 'text', value: j.name, maxlength: '40', 'aria-label': 'Joint name', id: 'joint-name' }) as HTMLInputElement;
    name.addEventListener('change', () => store.renameJoint(j.id, name.value));
    name.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') name.blur();
    });
    const parent = h('select', { 'aria-label': 'Parent joint', id: 'joint-parent' },
      h('option', { value: '' }, '(none: this is a root)'),
      ...rig.filter((q) => q.id !== j.id && !kids.has(q.id)).map((q) => h('option', { value: q.id, selected: q.id === j.parent }, q.name)),
    ) as HTMLSelectElement;
    parent.value = j.parent ?? '';
    parent.addEventListener('change', () => {
      const why = store.setJointParent(j.id, parent.value || null);
      if (why) toast(why);
    });
    const at = (axis: 0 | 1 | 2) => (v: number) => {
      const p = [...j.pos] as Vec3;
      p[axis] = v;
      store.moveJoint(j.id, p, { withChildren });
    };
    return h('div', { class: 'jedit', id: 'joint-editor' },
      h('label', { class: 'field' }, h('span', {}, 'Name'), name),
      h('div', { class: 'jrow' }, num('X', j.pos[0], at(0)), num('Y', j.pos[1], at(1)), num('Z', j.pos[2], at(2))),
      h('label', { class: 'field' }, h('span', {}, 'Parent (the bone runs from it to this joint)'), parent),
      kids.size
        ? h('label', { class: 'check' }, (() => {
            const cb = h('input', { type: 'checkbox', checked: withChildren, id: 'joint-children', onchange: () => (withChildren = cb.checked) }) as HTMLInputElement;
            return cb;
          })(), h('span', {}, `Move the ${kids.size} joint${kids.size === 1 ? '' : 's'} below it too (dragging with Shift does the same)`))
        : null,
      h('div', { class: 'jactions' },
        h('button', { class: 'btn sm', id: 'btn-joint-child', onclick: () => store.addJoint({ parent: j.id }) }, icon('plus', 13), 'Add child joint'),
        h('button', { class: 'btn sm danger', id: 'btn-joint-delete', onclick: () => store.deleteJoint(j.id) }, icon('trash', 13), 'Delete joint'),
      ),
    );
  }

  const render = () => {
    const rig = store.doc.rig ?? [];
    const sel = store.joint(store.selectedJoint);
    clear(box);
    const head = h('div', { class: 'panel-head skel-head' },
      h('button', { class: 'caret', 'aria-label': open ? 'Collapse skeleton' : 'Expand skeleton', onclick: () => { open = !open; render(); } }, icon(open ? 'chevD' : 'chevR', 12)),
      h('span', {}, 'Skeleton'),
      h('span', { class: 'skel-count' }, rig.length ? `${rig.length} joints` : ''),
      rig.length
        ? h('button', { class: 'tbtn sm', id: 'btn-rig-show', title: store.ui.showRig ? 'Hide the joints and bones' : 'Show the joints and bones', 'aria-pressed': String(store.ui.showRig), 'aria-label': 'Show skeleton', onclick: () => store.setUi({ showRig: !store.ui.showRig }) }, icon(store.ui.showRig ? 'eye' : 'eyeOff', 15))
        : null,
    );
    box.append(head);
    if (!open) return;
    if (!rig.length) {
      box.append(
        h('p', { class: 'fnote' }, 'A skeleton is a set of joints. The line between a joint and its parent is a bone. It lets a 3D app bend and animate your character.'),
        h('div', { class: 'jactions' },
          h('button', { class: 'btn sm primary', id: 'btn-rig-person', title: 'Fit a ready-made person skeleton to the selected character', onclick: addPerson }, 'Add person skeleton'),
          h('button', { class: 'btn sm', id: 'btn-rig-joint', title: 'Start your own skeleton with one joint', onclick: () => store.addJoint({ parent: null }) }, icon('plus', 13), 'Add joint'),
        ),
      );
      return;
    }
    const list = h('ul', { class: 'jlist', id: 'joint-list', role: 'tree' }, ...ordered(rig).map((j) =>
      h('li', { class: `jrowitem${j.id === store.selectedJoint ? ' on' : ''}`, role: 'treeitem', 'aria-selected': String(j.id === store.selectedJoint), 'data-joint': j.id, style: `padding-left:${8 + depthOf(j, rig) * 12}px`, onclick: () => store.selectJoint(j.id) },
        h('i', { class: 'jdot' }), j.name)));
    box.append(list);
    box.append(h('div', { class: 'jactions' },
      h('button', { class: 'btn sm', id: 'btn-rig-joint', onclick: () => store.addJoint(store.joint(store.selectedJoint) ? {} : { parent: null }) }, icon('plus', 13), sel ? 'Add child joint' : 'Add joint'),
      h('button', { class: 'btn sm', id: 'btn-rig-person', title: 'Add another person skeleton for the selected character', onclick: addPerson }, 'Add person skeleton'),
    ));
    if (sel) box.append(editor(sel, rig));
    else box.append(h('p', { class: 'fnote' }, 'Click a joint (a white ball in the scene, or a name above) to move or rename it. Drag a ball to move it; hold Shift to carry the joints below it.'));
  };

  let last = '';
  const refresh = () => {
    const sig = JSON.stringify([store.doc.rig, store.selectedJoint, store.ui.showRig]);
    if (sig === last) return;
    last = sig;
    render();
  };
  store.subscribe((e) => {
    if (e === 'rig' || e === 'doc' || e === 'reset' || e === 'tool' || e === 'history') refresh();
  });
  refresh();
}
