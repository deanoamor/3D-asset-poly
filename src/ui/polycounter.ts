import type { Store } from '../core/store';
import { polyStats } from '../core/store';
import { clear, fmt, h } from './dom';

/** Shows how many triangles the model has. There is no limit: it is only information. */
export function mountPolyCounter(root: HTMLElement, store: Store): void {
  const pill = h('button', { class: 'polypill', id: 'polypill', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', title: 'Triangles in your model' });
  const pop = h('div', { class: 'polypop hidden', role: 'dialog', 'aria-label': 'Triangles by part' });
  const wrap = h('div', { class: 'polywrap overlay' }, pill, pop);
  root.append(wrap);
  let popOpen = false;

  pill.addEventListener('click', () => {
    popOpen = !popOpen;
    renderPop();
  });
  document.addEventListener('pointerdown', (e) => {
    if (popOpen && !(e.target as HTMLElement).closest('.polywrap')) {
      popOpen = false;
      renderPop();
    }
  });

  function renderPill(): void {
    const s = polyStats(store.doc);
    clear(pill);
    pill.append(h('span', { class: 'pnum' }, h('strong', {}, fmt(s.total)), ' triangles'));
    pill.dataset.total = String(s.total);
    pill.setAttribute('aria-label', `${fmt(s.total)} triangles`);
    pill.setAttribute('aria-expanded', String(popOpen));
  }

  function renderPop(): void {
    pop.classList.toggle('hidden', !popOpen);
    pill.setAttribute('aria-expanded', String(popOpen));
    if (!popOpen) return;
    const s = polyStats(store.doc);
    clear(pop);
    pop.append(
      h('div', { class: 'fhead' }, 'Triangles by part'),
      ...(s.perObject.length
        ? s.perObject.slice(0, 8).map((p) => h('button', { class: 'heavyrow', onclick: () => store.select([p.id]) }, h('span', {}, p.name), h('span', { class: 'n' }, fmt(p.tris))))
        : [h('div', { class: 'fnote' }, 'Nothing here yet.')]),
      h('div', { class: 'fnote' }, 'Shown for information. There is no limit.'),
    );
  }

  const refresh = () => {
    renderPill();
    if (popOpen) renderPop();
  };
  store.subscribe((e) => {
    if (e === 'doc' || e === 'reset') refresh();
  });
  refresh();
}
