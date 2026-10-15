import type { Store } from '../core/store';
import { WOOD_HEXES } from '../core/palette';
import { logEvent } from '../core/analytics';
import { clear, h, icon } from './dom';
import { faceNormal, type PolyMesh } from '../core/mesh';
import { bus, openExportDialog } from './dialogs';

interface Step {
  /** Label for the helper button when it is not "Do it for me". */
  autoLabel?: string;
  /** Name of a bus event that completes this step. */
  onEvent?: string;
  title: string;
  text: string;
  highlight?: string;
  manual?: boolean;
  done: (s: Store) => boolean;
  auto: (s: Store) => void;
}

const shapes = (s: Store) => s.doc.objects.filter((o) => o.kind === 'shape');

function STEPS_CHEST(): Step[] {
  return [
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
    onEvent: 'export',
  },
  ];
}

export interface TourConfig {
  key: string;
  label: string;
  steps: Step[];
  finishTitle: string;
  finishText: string;
  finishButton: string;
  events?: string[];
}

export interface Tour {
  start: () => void;
  stop: () => void;
  active: () => boolean;
}

/** Step-by-step coach card. Each step finishes on its own when the user does the thing, or on "Do it for me". */
export function createTour(root: HTMLElement, store: Store, cfg: TourConfig, others: () => Tour[] = () => []): Tour {
  const STEPS = cfg.steps;
  const KEY = cfg.key;
  const card = h('div', { class: 'coach overlay hidden', role: 'region', 'aria-label': cfg.label, id: `coach-${KEY.split('.')[1]}` });
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
    logEvent('onboarding_step', { tour: KEY, step });
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
      logEvent('onboarding_complete', { tour: KEY, ms: Date.now() - startedAt });
      card.append(
        h('div', { class: 'coach-head' }, h('strong', {}, cfg.finishTitle), h('button', { class: 'tbtn xs', 'aria-label': 'Close', onclick: stop }, icon('close', 14))),
        h('p', {}, cfg.finishText),
        h('div', { class: 'coach-actions' }, h('button', { class: 'btn primary', onclick: stop }, cfg.finishButton)),
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
        h('button', { class: 'btn sm', id: `${card.id}-auto`, 'data-coach-auto': '', onclick: () => {
          s.auto(store);
          if (s.manual) advance();
          else evaluate();
        } }, s.manual ? 'Got it' : s.autoLabel ?? (step === STEPS.length - 1 ? 'Open export' : 'Do it for me')),
        step < STEPS.length - 1 ? h('button', { class: 'link', onclick: advance }, 'Skip step') : null,
      ),
    );
  }

  function start(): void {
    others().forEach((t) => t.stop());
    step = 0;
    startedAt = Date.now();
    logEvent('onboarding_start', { tour: KEY });
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
    if (e === 'doc' || e === 'selection' || e === 'edit') evaluate();
  });
  for (const name of cfg.events ?? []) bus.addEventListener(name, () => step >= 0 && STEPS[step]?.onEvent === name && advance());

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
  return { start, stop, active: () => step >= 0 };
}

const CHEST: TourConfig = {
  key: 'polystudio.onboarding.v1',
  label: 'Guided first project',
  steps: STEPS_CHEST(),
  finishTitle: 'You made your first prop!',
  finishText: 'Open the file in your engine: the chest stands on the ground with its pivot at the bottom center and the right scale. Keep going: duplicate parts, try other shapes, and watch the polygon counter.',
  finishButton: 'Keep building',
  events: ['export'],
};

export function mountOnboarding(root: HTMLElement, store: Store, others: () => Tour[] = () => []): Tour {
  const tour = createTour(root, store, CHEST, others);
  bus.addEventListener('project-created', (e) => {
    if ((e as CustomEvent).detail?.guided) tour.start();
    else tour.stop();
  });
  return tour;
}

// ---------- Edit Shape tour ----------

const topFace = (m: PolyMesh) => m.f.findIndex((_, i) => faceNormal(m, i)[1] > 0.9);

/** Makes sure a box is being edited, so "Do it for me" works from any state. */
function ensureEditing(s: Store): void {
  if (s.edit) return;
  const id = s.selection.length === 1 && s.get(s.selection[0])?.kind === 'shape' ? s.selection[0] : s.doc.objects.find((o) => o.kind === 'shape')?.id ?? s.addShape('box', { name: 'Head', position: [0, 0.5, 0] }).id;
  s.select([id]);
  s.enterEdit(id);
}

const EDIT_STEPS: Step[] = [
  {
    title: 'Open Edit shape',
    text: 'Click your box (or add one), then press Edit shape in the toolbar. You can also press Tab or double-click the box.',
    highlight: '[data-tool="edit"]',
    done: (s) => !!s.edit,
    auto: (s) => ensureEditing(s),
  },
  {
    title: 'Select the top face',
    text: 'Make sure Faces is chosen in the bar at the bottom, then click the top of the box. It turns orange.',
    highlight: '[data-mode="face"]',
    done: (s) => !!s.edit && s.edit.mode === 'face' && s.edit.sel.length > 0,
    auto: (s) => {
      ensureEditing(s);
      s.setEditMode('face');
      const m = s.get(s.edit!.id)!.mesh!;
      s.editSelect([topFace(m)]);
    },
  },
  {
    title: 'Pull it out',
    text: 'Press Pull out. A new part grows from the face right away, like a neck or a hat. Drag the green arrow to make it longer or shorter.',
    highlight: '#edit-pullout',
    done: (s) => !!s.edit && (s.get(s.edit.id)?.mesh?.f.length ?? 0) > 6,
    auto: (s) => {
      ensureEditing(s);
      if (s.edit!.mode !== 'face' || !s.edit!.sel.length) {
        s.setEditMode('face');
        s.editSelect([topFace(s.get(s.edit!.id)!.mesh!)]);
      }
      s.pullOut();
    },
  },
  {
    title: 'Round it off',
    text: 'Press Round off to smooth the whole shape. Corners become soft, and the triangle counter at the top-left goes up.',
    highlight: '#edit-roundoff',
    done: (s) => !!s.edit && (s.get(s.edit.id)?.mesh?.f.length ?? 0) >= 40,
    auto: (s) => {
      ensureEditing(s);
      s.roundOff();
    },
  },
  {
    title: 'Press Done',
    text: 'When you are happy, press Done at the top. You can Undo any step, or choose Reset to the original shape in Properties.',
    highlight: '#edit-done',
    done: (s) => !s.edit,
    auto: (s) => s.exitEdit(),
    autoLabel: 'Finish for me',
  },
];

export function mountEditTour(root: HTMLElement, store: Store, others: () => Tour[] = () => []): Tour {
  return createTour(root, store, {
    key: 'polystudio.edittour.v1',
    label: 'Edit shape walkthrough',
    steps: EDIT_STEPS,
    finishTitle: 'Nice, you reshaped a box',
    finishText: 'Try Mirror and Add cut next: cut a ring around the box, then move points to build a nose, a chin or a pair of ears. Merge points turns the top of a box into a pyramid.',
    finishButton: 'Keep editing',
  }, others);
}
