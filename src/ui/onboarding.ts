import type { Store } from '../core/store';
import { WOOD_HEXES } from '../core/palette';
import { logEvent } from '../core/analytics';
import { clear, h, icon } from './dom';
import { bus, openExportDialog } from './dialogs';

interface Step {
  title: string;
  text: string;
  highlight?: string;
  manual?: boolean;
  done: (s: Store) => boolean;
  auto: (s: Store) => void;
}

const KEY = 'polystudio.onboarding.v1';

const shapes = (s: Store) => s.doc.objects.filter((o) => o.kind === 'shape');

const STEPS: Step[] = [
  {
    title: 'Draw the chest body',
    text: 'Choose Shape in the toolbar, pick Box, then click and drag on the grid. One drag makes a box.',
    highlight: '[data-tool="shape"]',
    done: (s) => shapes(s).some((o) => o.shape === 'box'),
    auto: (s) => {
      s.addShape('box', { name: 'Body', position: [0, 0.5, 0], size: [2, 1, 1.2] });
    },
  },
  {
    title: 'Set its size',
    text: 'Select the box, then type Width 2 and Depth 1.2 in Properties, or drag a Size handle (R). Number fields and handles stay in sync.',
    highlight: '#props',
    done: (s) => shapes(s).some((o) => o.shape === 'box' && o.size[0] >= 1.5),
    auto: (s) => {
      const b = shapes(s).find((o) => o.shape === 'box');
      if (b) {
        s.update(b.id, { size: [2, 1, 1.2], position: [b.position[0], 0.5, b.position[2]] });
        s.select([b.id]);
      }
    },
  },
  {
    title: 'Add a lid and a strap',
    text: 'Select the body and press Ctrl+D (or Duplicate) to copy it. Make the copy a thin board: Height 0.15, then slide it on top. It snaps to the body. Repeat for a strap.',
    highlight: '#btn-duplicate',
    done: (s) => shapes(s).length >= 3 && shapes(s).some((o) => o.size[1] <= 0.3),
    auto: (s) => {
      const body = shapes(s)[0];
      const [bx, , bz] = body ? body.position : [0, 0, 0];
      s.addShape('box', { name: 'Lid', position: [bx, 1.075, bz], size: [2.1, 0.15, 1.3] });
      s.addShape('box', { name: 'Strap', position: [bx, 0.54, bz], size: [0.3, 1.08, 1.36] });
    },
  },
  {
    title: 'Group and name it',
    text: 'Shift-click the three parts in Layers, press Group (Ctrl+G), then double-click the group name and call it “Chest”.',
    highlight: '#btn-group',
    done: (s) => s.doc.objects.some((o) => o.kind === 'group' && !/^Group( \d+)?$/.test(o.name) && s.doc.objects.filter((c) => c.parent === o.id).length >= 2),
    auto: (s) => {
      const top = s.doc.objects.filter((o) => o.kind === 'shape' && o.parent === null).map((o) => o.id);
      s.select(top);
      s.groupSelected('Chest');
    },
  },
  {
    title: 'Paint it wood',
    text: 'Open the Color tool (C) and pick a wood tone from the palette. With the Chest selected, the color is applied right away.',
    highlight: '[data-tool="color"]',
    done: (s) => shapes(s).some((o) => WOOD_HEXES.has(o.color)),
    auto: (s) => {
      for (const o of shapes(s)) {
        const c = /lid/i.test(o.name) ? '#b07d45' : /strap/i.test(o.name) ? '#6b4423' : '#8b5a2b';
        s.update(o.id, { color: c });
      }
    },
  },
  {
    title: 'Check the polygon budget',
    text: 'The counter at the top-left stays green: a chest is only a few dozen triangles. When it turns red, the app shows the heaviest part and how to simplify it.',
    highlight: '#polypill',
    manual: true,
    done: () => false,
    auto: () => {},
  },
  {
    title: 'Export for your engine',
    text: 'Press Export, pick Unity, Godot, Unreal or Web, and download. The origin is placed at the bottom center and the scale is 1 unit = 1 m.',
    highlight: '#btn-export',
    done: () => false, // completed by the 'export' event
    auto: (s) => openExportDialog(s),
  },
];

export function mountOnboarding(root: HTMLElement, store: Store): { start: () => void; stop: () => void } {
  const card = h('div', { class: 'coach overlay hidden', role: 'region', 'aria-label': 'Guided first project' });
  root.append(card);
  let step = -1; // -1 = inactive, STEPS.length = finished screen
  let highlighted: Element | null = null;
  let startedAt = 0;

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ step, startedAt }));
    } catch {
      /* ignore */
    }
  };

  const setHighlight = (sel?: string) => {
    highlighted?.classList.remove('coach-hl');
    highlighted = sel ? document.querySelector(sel) : null;
    highlighted?.classList.add('coach-hl');
  };

  const advance = () => {
    step += 1;
    logEvent('onboarding_step', { step });
    save();
    render();
    evaluate();
  };

  const evaluate = () => {
    if (step < 0 || step >= STEPS.length) return;
    const s = STEPS[step];
    if (!s.manual && s.done(store)) advance();
  };

  function render(): void {
    clear(card);
    if (step < 0) {
      card.classList.add('hidden');
      setHighlight();
      return;
    }
    card.classList.remove('hidden');
    if (step >= STEPS.length) {
      setHighlight();
      logEvent('onboarding_complete', { ms: Date.now() - startedAt });
      card.append(
        h('div', { class: 'coach-head' }, h('strong', {}, 'You made your first prop!'), h('button', { class: 'tbtn xs', 'aria-label': 'Close', onclick: stop }, icon('close', 14))),
        h('p', {}, 'Open the file in your engine: the chest stands on the ground with its pivot at the bottom center and the right scale. Keep going: duplicate parts, try other shapes, and watch the polygon counter.'),
        h('div', { class: 'coach-actions' }, h('button', { class: 'btn primary', onclick: stop }, 'Keep building')),
      );
      return;
    }
    const s = STEPS[step];
    setHighlight(s.highlight);
    card.append(
      h('div', { class: 'coach-head' },
        h('span', { class: 'coach-count' }, `Step ${step + 1} of ${STEPS.length}`),
        h('button', { class: 'tbtn xs', 'aria-label': 'Close guide', title: 'Close guide', onclick: stop }, icon('close', 14)),
      ),
      h('div', { class: 'coach-bar' }, h('div', { style: `width:${(step / STEPS.length) * 100}%` })),
      h('strong', {}, s.title),
      h('p', {}, s.text),
      h('div', { class: 'coach-actions' },
        h('button', { class: 'btn sm', id: 'coach-auto', onclick: () => {
          s.auto(store);
          if (s.manual) advance();
          else evaluate();
        } }, s.manual ? 'Got it' : step === STEPS.length - 1 ? 'Open export' : 'Do it for me'),
        step < STEPS.length - 1 ? h('button', { class: 'link', onclick: advance }, 'Skip step') : null,
      ),
    );
  }

  function start(): void {
    step = 0;
    startedAt = Date.now();
    logEvent('onboarding_start');
    save();
    render();
    evaluate();
  }
  function stop(): void {
    step = -1;
    save();
    render();
  }

  store.subscribe((e) => {
    if (e === 'doc' || e === 'selection') evaluate();
  });
  bus.addEventListener('export', () => {
    if (step === STEPS.length - 1) advance();
  });
  bus.addEventListener('project-created', (e) => {
    if ((e as CustomEvent).detail?.guided) start();
    else stop();
  });

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { step: number; startedAt: number } | null;
    if (saved && saved.step >= 0 && saved.step <= STEPS.length) {
      step = saved.step;
      startedAt = saved.startedAt;
      render();
    }
  } catch {
    /* ignore */
  }
  return { start, stop };
}
