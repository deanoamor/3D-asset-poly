import type { Store } from '../core/store';
import { polyStats } from '../core/store';
import { describeSuggestion, reduceDetail } from '../core/suggest';
import { TARGET_BUDGETS, TARGET_LABELS, type TargetId } from '../core/types';
import { add, clear, fmt, h, toast } from './dom';

export function mountPolyCounter(root: HTMLElement, store: Store): void {
  const pill = h('button', { class: 'polypill', id: 'polypill', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', title: 'Polygon budget' });
  const pop = h('div', { class: 'polypop hidden', role: 'dialog', 'aria-label': 'Polygon budget' });
  const banner = h('div', { class: 'polybanner hidden', role: 'alert' });
  const wrap = h('div', { class: 'polywrap overlay' }, pill, pop, banner);
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
    pill.className = `polypill ${s.status}`;
    pill.dataset.status = s.status;
    clear(pill);
    pill.append(
      h('span', { class: 'dot' }),
      h('span', { class: 'pnum' }, h('strong', {}, fmt(s.total)), ` / ${fmt(s.budget)} tris`),
      h('span', { class: 'ptag' }, TARGET_LABELS[store.doc.target]),
    );
    pill.setAttribute('aria-label', `Polygon count ${fmt(s.total)} of ${fmt(s.budget)} triangles, ${s.status === 'green' ? 'within budget' : s.status === 'yellow' ? 'near the limit' : 'over budget'}`);
    pill.setAttribute('aria-expanded', String(popOpen));
  }

  function renderBanner(): void {
    const s = polyStats(store.doc);
    clear(banner);
    if (s.status !== 'red') {
      banner.classList.add('hidden');
      return;
    }
    banner.classList.remove('hidden');
    const heavy = s.perObject[0];
    const sug = describeSuggestion(store);
    add(
      banner,
      h('strong', {}, 'Over budget. '),
      h('span', {}, `"${heavy.name}" is the heaviest part (${fmt(heavy.tris)} triangles). `),
      sug ? h('span', {}, sug + ' ') : h('span', {}, 'Remove or simplify some objects. '),
      h('button', { class: 'link', onclick: () => store.select([heavy.id]) }, 'Show it'),
      sug
        ? h('button', {
            class: 'btn sm',
            id: 'btn-reduce',
            onclick: () => {
              const msg = reduceDetail(store);
              if (msg) toast(msg);
            },
          }, 'Reduce')
        : null,
    );
  }

  function renderPop(): void {
    pop.classList.toggle('hidden', !popOpen);
    pill.setAttribute('aria-expanded', String(popOpen));
    if (!popOpen) return;
    const s = polyStats(store.doc);
    clear(pop);
    const targets: TargetId[] = ['mobile', 'pc', 'custom'];
    const custom = h('input', {
      type: 'number',
      min: '100',
      step: '500',
      value: String(store.doc.customBudget),
      class: 'custom',
      'aria-label': 'Custom triangle budget',
      disabled: store.doc.target !== 'custom',
    }) as HTMLInputElement;
    custom.addEventListener('change', () => store.setCustomBudget(+custom.value));
    custom.addEventListener('keydown', (e) => e.stopPropagation());
    add(
      pop,
      h('div', { class: 'fhead' }, 'Target platform'),
      h('div', { class: 'seg' }, ...targets.map((t) =>
        h('button', {
          class: store.doc.target === t ? 'on' : '',
          'data-target': t,
          onclick: () => {
            store.setTarget(t);
            renderPop();
          },
        }, TARGET_LABELS[t], h('small', {}, t === 'custom' ? 'your number' : fmt(TARGET_BUDGETS[t]))),
      )),
      store.doc.target === 'custom' ? h('label', { class: 'prow' }, h('span', {}, 'Budget'), custom, h('span', { class: 'unit' }, 'tris')) : null,
      h('div', { class: 'bar' }, h('div', { class: `fill ${s.status}`, style: `width:${Math.min(100, s.ratio * 100)}%` })),
      h('div', { class: 'barlabel' }, `${Math.round(s.ratio * 100)}% of the budget used`),
      s.perObject.length ? h('div', { class: 'fhead' }, 'Heaviest parts') : null,
      ...s.perObject.slice(0, 5).map((p) =>
        h('button', { class: 'heavyrow', onclick: () => store.select([p.id]) }, h('span', {}, p.name), h('span', { class: 'n' }, fmt(p.tris))),
      ),
      h('div', { class: 'fnote' }, 'Green is under 70% of the budget, yellow is 70–100%, red is over. Budgets are starting points; check them on your target devices.'),
    );
  }

  const refresh = () => {
    renderPill();
    renderBanner();
    if (popOpen) renderPop();
  };
  store.subscribe((e) => {
    if (e === 'doc' || e === 'reset') refresh();
  });
  refresh();
}
