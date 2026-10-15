import type { Store } from '../core/store';
import { polyStats } from '../core/store';
import { isLockedChain } from '../core/docmath';
import { PALETTE } from '../core/palette';
import { objectTriangles } from '../core/shapes';
import { edgeMap, vertCount } from '../core/mesh';
import { MIN_SEGMENTS, SHAPE_LABELS, type SceneObject, type Vec3 } from '../core/types';
import { clear, fmt, h, icon } from './dom';

interface Field {
  update: () => void;
}

const AXES = ['X', 'Y', 'Z'] as const;
const SIZE_AXES = ['W', 'H', 'D'] as const;

function numberInput(opts: {
  label: string;
  get: () => number;
  set: (v: number, commit: boolean) => void;
  step: number;
  min?: number;
  unit?: string;
  decimals?: number;
  title?: string;
}): { el: HTMLElement; update: () => void } {
  const dec = opts.decimals ?? 3;
  const input = h('input', { type: 'number', step: String(opts.step), min: opts.min !== undefined ? String(opts.min) : undefined, 'aria-label': opts.title ?? opts.label }) as HTMLInputElement;
  const fmtVal = (v: number) => String(Math.round(v * 10 ** dec) / 10 ** dec);
  const update = () => {
    if (document.activeElement !== input) input.value = fmtVal(opts.get());
  };
  const parse = (): number | null => {
    const v = parseFloat(input.value);
    if (!Number.isFinite(v)) return null;
    return opts.min !== undefined ? Math.max(opts.min, v) : v;
  };
  input.addEventListener('input', () => {
    const v = parse();
    if (v !== null) opts.set(v, false);
  });
  input.addEventListener('change', () => {
    const v = parse();
    if (v !== null) opts.set(v, true);
    input.value = fmtVal(opts.get());
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') input.blur();
  });
  // Figma-style scrubbing: drag the label sideways to change the value
  const label = h('span', { class: 'flabel', title: `${opts.title ?? opts.label} (drag to scrub)` }, opts.label);
  label.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const x0 = e.clientX;
    const v0 = opts.get();
    let moved = false;
    const move = (m: PointerEvent) => {
      moved = true;
      let v = v0 + (m.clientX - x0) * opts.step * (m.shiftKey ? 0.1 : 1) * 0.5;
      if (opts.min !== undefined) v = Math.max(opts.min, v);
      opts.set(Math.round(v * 1000) / 1000, false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) opts.set(opts.get(), true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  const el = h('label', { class: 'nf' }, label, input, opts.unit ? h('span', { class: 'unit' }, opts.unit) : null);
  update();
  return { el, update };
}

export function mountProps(root: HTMLElement, store: Store): void {
  const body = h('div', { class: 'props-body' });
  root.append(h('div', { class: 'panel-head' }, h('span', {}, 'Properties')), body);
  let fields: Field[] = [];
  let sigKey = '';

  const section = (title: string, ...kids: (HTMLElement | null)[]) => h('section', { class: 'psec' }, h('h3', {}, title), ...kids);

  function swatches(apply: (hex: string) => void, current?: string): HTMLElement {
    return h(
      'div',
      { class: 'swatches', role: 'listbox', 'aria-label': 'Color palette' },
      ...PALETTE.map((s) =>
        h('button', {
          class: `sw${current === s.hex ? ' on' : ''}`,
          style: `background:${s.hex}`,
          title: s.name,
          'aria-label': s.name,
          'data-hex': s.hex,
          onclick: () => apply(s.hex),
        }),
      ),
    );
  }

  function vec3Row(o: SceneObject, key: 'position' | 'size' | 'rotation', labels: readonly string[], step: number, min?: number, unit?: string): HTMLElement {
    const row = h('div', { class: 'row3' });
    labels.forEach((lab, i) => {
      const f = numberInput({
        label: lab,
        title: `${key === 'size' ? 'Size' : key === 'position' ? 'Position' : 'Rotation'} ${lab}`,
        step,
        min,
        unit,
        decimals: key === 'rotation' ? 1 : 3,
        get: () => store.get(o.id)?.[key][i] ?? 0,
        set: (v, commit) => {
          const cur = store.get(o.id);
          if (!cur) return;
          const next = [...cur[key]] as Vec3;
          next[i] = v;
          store.update(o.id, { [key]: next }, commit);
        },
      });
      fields.push(f);
      row.append(f.el);
    });
    return row;
  }

  function buildSingle(o: SceneObject): void {
    const locked = isLockedChain(store.map, o);
    const isShape = o.kind === 'shape';
    const head = h(
      'div',
      { class: 'pheader' },
      h('span', { class: 'lico big' }, icon(isShape ? o.shape! : 'group', 18)),
      h('div', { class: 'ptitle' }, h('strong', { class: 'pname' }, o.name), h('span', { class: 'psub' }, isShape ? SHAPE_LABELS[o.shape!] : 'Group')),
    );
    body.append(head);
    if (locked) {
      body.append(
        h('div', { class: 'note' }, icon('lock', 14), h('span', {}, 'Locked. Unlock it in Layers to edit.'), h('button', {
          class: 'link',
          onclick: () => store.update(o.id, { locked: false }),
        }, 'Unlock')),
      );
    }
    if (!isShape) {
      body.append(
        h('div', { class: 'editcard' },
          h('strong', {}, 'This is a group'),
          h('p', {}, 'Its parts move, rotate and resize together. Ungroup to work on them one by one.'),
          h('button', { class: 'btn block', id: 'btn-ungroup-props', onclick: () => store.ungroupSelected() }, icon('ungroup', 14), 'Ungroup'),
        ),
      );
    }
    if (isShape) {
      body.append(
        h('div', { class: 'editcard' },
          h('strong', {}, o.mesh ? 'Custom shape' : 'Change this shape'),
          h('p', {}, o.mesh ? 'You edited its points, so the Sides setting no longer applies.' : 'Turn it into something else: pull faces out, add cuts, round it off.'),
          h('button', { class: 'btn primary block', id: 'btn-edit-shape', disabled: locked, title: 'Edit shape (Tab)', onclick: () => store.enterEdit(o.id) }, icon('edit', 14), 'Edit shape'),
          o.mesh ? h('button', { class: 'link', id: 'btn-reset-shape', disabled: locked, onclick: () => store.resetShape(o.id) }, 'Reset to the original shape') : null,
        ),
      );
    }
    const fs = h('fieldset', { class: 'fs', disabled: locked });
    fs.append(section('Position (m)', vec3Row(o, 'position', AXES, 0.25)));
    fs.append(section('Size (m)', vec3Row(o, 'size', isShape && o.shape === 'plane' ? ['W', '–', 'D'] : SIZE_AXES, 0.25, 0.01)));
    fs.append(section('Rotation', vec3Row(o, 'rotation', AXES, 5, undefined, '°')));
    if (isShape) {
      const shape = o.shape!;
      const colorIn = h('input', { type: 'color', value: o.color, 'aria-label': 'Color', class: 'colorin' }) as HTMLInputElement;
      colorIn.addEventListener('input', () => store.update(o.id, { color: colorIn.value }, false));
      colorIn.addEventListener('change', () => store.update(o.id, { color: colorIn.value }, true));
      const hex = h('span', { class: 'hex' }, o.color.toUpperCase());
      fields.push({
        update: () => {
          const c = store.get(o.id)?.color ?? o.color;
          if (colorIn.value !== c) colorIn.value = c;
          hex.textContent = c.toUpperCase();
          body.querySelectorAll('.sw').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.hex === c));
        },
      });
      fs.append(
        section(
          'Color',
          h('div', { class: 'colorrow' }, colorIn, hex),
          swatches((hx) => store.update(o.id, { color: hx }), o.color),
        ),
      );
      const params: HTMLElement[] = [];
      if (!o.mesh && ['cylinder', 'cone', 'sphere'].includes(shape)) {
        const label = shape === 'sphere' ? 'Smoothness' : 'Sides';
        const range = h('input', { type: 'range', min: String(MIN_SEGMENTS[shape]), max: '48', step: '1', 'aria-label': label }) as HTMLInputElement;
        const val = h('output', { class: 'rval' });
        const sync = () => {
          const cur = store.get(o.id);
          if (!cur) return;
          if (document.activeElement !== range) range.value = String(cur.params.segments);
          val.textContent = String(cur.params.segments);
        };
        range.addEventListener('input', () => store.updateParams(o.id, { segments: +range.value }, false));
        range.addEventListener('change', () => store.commit());
        fields.push({ update: sync });
        sync();
        params.push(h('label', { class: 'prow' }, h('span', {}, label), range, val));
      }
      if (!o.mesh && shape === 'cylinder') {
        const range = h('input', { type: 'range', min: '0', max: '100', step: '5', 'aria-label': 'Top size' }) as HTMLInputElement;
        const val = h('output', { class: 'rval' });
        const sync = () => {
          const cur = store.get(o.id);
          if (!cur) return;
          if (document.activeElement !== range) range.value = String(Math.round(cur.params.taper * 100));
          val.textContent = `${Math.round(cur.params.taper * 100)}%`;
        };
        range.addEventListener('input', () => store.updateParams(o.id, { taper: +range.value / 100 }, false));
        range.addEventListener('change', () => store.commit());
        fields.push({ update: sync });
        sync();
        params.push(h('label', { class: 'prow' }, h('span', {}, 'Top size'), range, val));
      }
      const tris = h('div', { class: 'tris' });
      fields.push({
        update: () => {
          const cur = store.get(o.id);
          if (cur?.shape) tris.textContent = `${fmt(objectTriangles(cur))} triangles in this shape`;
        },
      });
      fs.append(section('Shape', ...params, tris));
    }
    body.append(fs);
    fields.forEach((f) => f.update());
  }

  function buildMulti(ids: string[]): void {
    body.append(h('div', { class: 'pheader' }, h('div', { class: 'ptitle' }, h('strong', {}, `${ids.length} objects selected`), h('span', { class: 'psub' }, 'Shift-click to add or remove'))));
    const why = store.canGroup();
    body.append(
      section(
        'Actions',
        h('div', { class: 'actrow' },
          h('button', { class: 'btn', disabled: !!why, title: why ?? 'Group (Ctrl+G)', onclick: () => store.groupSelected() }, icon('group', 14), 'Group'),
          h('button', { class: 'btn', onclick: () => store.duplicateSelected() }, icon('duplicate', 14), 'Duplicate'),
          h('button', { class: 'btn', onclick: () => store.deleteSelected() }, icon('trash', 14), 'Delete'),
        ),
        why ? h('div', { class: 'tris' }, why) : null,
      ),
    );
    body.append(
      section(
        'Color for all',
        swatches((hx) => {
          store.mutate((d) => {
            for (const o of d.objects) if (ids.includes(o.id) && o.kind === 'shape') o.color = hx;
          });
        }),
      ),
    );
  }

  function buildEdit(): void {
    const ed = store.edit!;
    const o = store.get(ed.id)!;
    body.append(
      h('div', { class: 'pheader' },
        h('span', { class: 'lico big' }, icon('edit', 18)),
        h('div', { class: 'ptitle' }, h('strong', { class: 'pname' }, o.name), h('span', { class: 'psub' }, 'Edit shape')),
      ),
    );
    const counts = h('div', { class: 'tris', id: 'edit-counts' });
    const picked = h('div', { class: 'tris', id: 'edit-picked' });
    fields.push({
      update: () => {
        const cur = store.get(ed.id)?.mesh;
        const e = store.edit;
        if (!cur || !e) return;
        counts.textContent = `${fmt(vertCount(cur))} points · ${fmt(edgeMap(cur).size)} edges · ${fmt(cur.f.length)} faces`;
        const word = e.mode === 'vertex' ? 'point' : e.mode;
        picked.textContent = e.sel.length ? `${e.sel.length} ${word}${e.sel.length === 1 ? '' : 's'} selected` : 'Nothing selected yet';
      },
    });
    body.append(
      section('Shape', counts, picked),
      section('Color', swatches((hx) => store.update(o.id, { color: hx }), o.color)),
      section('How it works',
        h('ol', { class: 'steps-list' },
          h('li', {}, 'Choose Points, Edges or Faces in the bar below the canvas.'),
          h('li', {}, 'Click what you want to change. Shift-click adds more.'),
          h('li', {}, 'Drag the colored arrows, or press Pull out to grow a new part.'),
          h('li', {}, 'Press Done when you are finished.'),
        ),
        h('div', { class: 'actrow' }, h('button', { class: 'btn', onclick: () => store.exitEdit() }, icon('check', 14), 'Done')),
      ),
    );
    fields.forEach((f) => f.update());
  }

  function buildEmpty(): void {
    const stats = polyStats(store.doc);
    body.append(
      h('div', { class: 'pempty' },
        h('strong', {}, 'Nothing selected'),
        h('p', {}, 'Click an object on the canvas or in Layers to edit its size, rotation, color and shape.'),
        h('p', { class: 'faintp' }, `${store.doc.objects.length} object${store.doc.objects.length === 1 ? '' : 's'} · ${fmt(stats.total)} triangles`),
      ),
    );
  }

  function rebuild(): void {
    clear(body);
    fields = [];
    const sel = store.selection;
    if (store.edit && store.get(store.edit.id)?.mesh) buildEdit();
    else if (sel.length === 0) buildEmpty();
    else if (sel.length === 1) {
      const o = store.get(sel[0]);
      if (o) buildSingle(o);
    } else buildMulti(sel);
  }

  function signature(): string {
    if (store.edit) return `edit:${store.edit.id}:${store.get(store.edit.id)?.color}`;
    const sel = store.selection;
    if (sel.length !== 1) return `${sel.length}:${sel.join(',')}:${sel.length === 0 ? store.doc.objects.length : ''}`;
    const o = store.get(sel[0]);
    return o ? `1:${o.id}:${o.kind}:${o.shape}:${o.locked}:${isLockedChain(store.map, o)}:${o.name}:${!!o.mesh}` : 'x';
  }

  store.subscribe((e) => {
    if (e === 'selection' || e === 'doc' || e === 'reset' || e === 'edit') {
      const s = signature();
      if (s !== sigKey) {
        sigKey = s;
        rebuild();
      } else fields.forEach((f) => f.update());
    }
  });
  sigKey = signature();
  rebuild();
}
