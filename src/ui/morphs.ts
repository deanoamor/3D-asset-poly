import type { Store } from '../core/store';
import { clear, h, icon, toast } from './dom';

/**
 * Expressions (morph targets): record how some parts change (a smile: the mouth gets wider; a blink: the eyelids close),
 * preview them with a slider, and export them as glTF morph targets that three.js, Babylon.js, Unity and Godot can drive.
 */
export function mountMorphs(root: HTMLElement, store: Store): void {
  const box = h('section', { class: 'morphs', id: 'morphs', 'aria-label': 'Expressions' });
  root.append(box);
  let open = true;
  let built = '';

  const sig = () => JSON.stringify([open, store.doc.objects.length > 0, (store.doc.morphs ?? []).map((m) => [m.id, m.name]), store.morphDraft && [store.morphDraft.id, store.morphDraft.name, store.morphDraft.isNew]]);

  function render(): void {
    const s = sig();
    if (s === built) return;
    built = s;
    clear(box);
    const morphs = store.doc.morphs ?? [];
    const draft = store.morphDraft;
    box.classList.toggle('hidden', !store.doc.objects.length);
    box.append(
      h('div', { class: 'panel-head skel-head' },
        h('button', { class: 'caret', 'aria-label': open ? 'Collapse expressions' : 'Expand expressions', onclick: () => { open = !open; built = ''; render(); } }, icon(open ? 'chevD' : 'chevR', 12)),
        h('span', { class: 'skel-title' }, 'Expressions'),
        morphs.length ? h('span', { class: 'skel-count' }, String(morphs.length)) : null,
      ),
    );
    if (!open) return;
    if (draft) {
      const name = h('input', { type: 'text', id: 'morph-name', maxlength: '30', value: draft.name, 'aria-label': 'Expression name' }) as HTMLInputElement;
      name.addEventListener('keydown', (e) => e.stopPropagation());
      box.append(
        h('div', { class: 'morph-draft', id: 'morph-draft' },
          h('label', { class: 'field' }, h('span', {}, draft.isNew ? 'New expression' : 'Editing expression'), name),
          h('p', { class: 'fnote' }, 'Select a part and use Move, Rotate or Size to change it (a wider mouth, closed eyelids…). Change as many parts as you like. When it looks right, press Done: the model goes back to normal and the change is saved as this expression.'),
          h('div', { class: 'jactions' },
            h('button', { class: 'btn sm primary', id: 'morph-done', onclick: () => { if (!store.finishMorph(name.value)) toast('Nothing was changed, so no expression was made.'); } }, 'Done'),
            h('button', { class: 'btn sm', id: 'morph-cancel', onclick: () => store.cancelMorph() }, 'Cancel'),
          ),
        ),
      );
      return;
    }
    if (!morphs.length) box.append(h('p', { class: 'fnote' }, 'An expression changes some parts (a smile, a blink). Make one, then drive it with a slider here or from game code. Exported as glTF morph targets.'));
    for (const m of morphs) {
      const w = h('input', { type: 'range', min: '0', max: '100', step: '5', class: 'morph-w', 'aria-label': `${m.name} amount`, value: String(Math.round((store.morphW[m.id] ?? 0) * 100)) }) as HTMLInputElement;
      w.addEventListener('input', () => store.setMorphWeight(m.id, +w.value / 100));
      box.append(
        h('div', { class: 'morph-row', 'data-morph': m.id },
          h('div', { class: 'morph-top' },
            h('strong', {}, m.name),
            h('span', { class: 'skel-spacer' }),
            h('button', { class: 'btn xs morph-edit', title: 'Change this expression', onclick: () => store.editMorph(m.id) }, 'Edit'),
            h('button', { class: 'tbtn sm morph-del', 'aria-label': `Delete ${m.name}`, title: 'Delete this expression', onclick: () => store.removeMorph(m.id) }, icon('trash', 13)),
          ),
          w,
        ),
      );
    }
    box.append(h('div', { class: 'jactions' },
      h('button', { class: 'btn sm', id: 'morph-new', title: 'Make a new expression', onclick: () => {
        const n = (store.doc.morphs?.length ?? 0) + 1;
        store.startMorph(`Expression ${n}`);
      } }, icon('plus', 13), 'New expression'),
    ));
  }

  const sync = () => {
    render();
    box.querySelectorAll<HTMLInputElement>('.morph-row').forEach((row) => {
      const w = row.querySelector<HTMLInputElement>('.morph-w');
      const id = (row as HTMLElement).dataset.morph!;
      if (w && document.activeElement !== w) w.value = String(Math.round((store.morphW[id] ?? 0) * 100));
    });
  };
  store.subscribe((e) => {
    if (e === 'morph' || e === 'doc' || e === 'reset' || e === 'history') sync();
  });
  render();
}
