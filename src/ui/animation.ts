import type { Store } from '../core/store';
import { PRESETS, type Preset } from '../core/anim';
import { clear, h, icon, toast } from './dom';

/** Animation clips for a skeleton: ready-made Walk / Run / Idle / Wave, or your own from poses stored as keys on a timeline. */
export function mountAnimation(root: HTMLElement, store: Store): void {
  const box = h('section', { class: 'anim timeline', id: 'animation', 'aria-label': 'Animation timeline' });
  root.append(box);
  let open = true;
  let built = '';

  const fmtT = (t: number) => t.toFixed(2);

  // ----- parts that stay in place while a clip plays (so dragging the slider is never interrupted) -----
  const play = h('button', { class: 'btn sm', id: 'anim-play', title: 'Play or pause (the character shows the clip)' }, icon('play', 14), 'Play') as HTMLButtonElement;
  const slider = h('input', { type: 'range', min: '0', max: '1', step: '0.01', id: 'anim-time', 'aria-label': 'Time in the clip' }) as HTMLInputElement;
  const readout = h('span', { class: 'anim-readout', id: 'anim-readout' }, '0.00 / 1.00 s');
  const keysBar = h('div', { class: 'anim-keys', id: 'anim-keys', 'aria-label': 'Keys' });
  slider.addEventListener('input', () => store.setAnimTime(parseFloat(slider.value)));
  play.addEventListener('click', () => store.setAnimPlaying(!store.animPlaying));

  const select = h('select', { id: 'anim-clip', 'aria-label': 'Animation clip' }) as HTMLSelectElement;
  select.addEventListener('change', () => store.selectClip(select.value || null));
  const presetSel = h('select', { id: 'anim-preset', 'aria-label': 'Add a ready-made animation' },
    h('option', { value: '' }, 'Ready-made…'),
    ...PRESETS.map((p) => h('option', { value: p.id, title: p.hint }, `${p.label} · ${p.hint}`)),
  ) as HTMLSelectElement;
  presetSel.addEventListener('change', () => {
    const k = presetSel.value as Preset;
    presetSel.value = '';
    if (k) {
      if (!store.addPresetClip(k)) toast('Add a skeleton first.');
      else store.setAnimPlaying(true);
    }
  });

  const nameIn = h('input', { type: 'text', id: 'anim-name', maxlength: '40', 'aria-label': 'Clip name' }) as HTMLInputElement;
  nameIn.addEventListener('change', () => store.animId && store.setClip(store.animId, { name: nameIn.value }));
  nameIn.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') nameIn.blur();
  });
  const durIn = h('input', { type: 'number', id: 'anim-duration', min: '0.1', max: '60', step: '0.1', 'aria-label': 'Length in seconds' }) as HTMLInputElement;
  durIn.addEventListener('change', () => {
    const v = parseFloat(durIn.value);
    if (store.animId && Number.isFinite(v)) store.setClip(store.animId, { duration: v });
  });
  durIn.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') durIn.blur();
  });
  const loopIn = h('input', { type: 'checkbox', id: 'anim-loop' }) as HTMLInputElement;
  loopIn.addEventListener('change', () => store.animId && store.setClip(store.animId, { loop: loopIn.checked }));

  const nearKey = () => {
    const c = store.clip(store.animId);
    return c ? c.keys.findIndex((k) => Math.abs(k.t - store.animTime) < 1 / 30) : -1;
  };
  const addKey = h('button', { class: 'btn sm primary', id: 'anim-key-add', title: 'Store the pose you see in the viewport as a key at this time' }, 'Key here');
  addKey.addEventListener('click', () => {
    const c = store.clip(store.animId);
    if (!c) return;
    if (store.animView) {
      toast('You are looking at the clip. Press “Edit pose here”, turn the joints, then Key here.', 5000);
      return;
    }
    store.setKey(c.id, store.animTime);
    toast(`Key stored at ${fmtT(store.animTime)} s.`);
  });
  const loadBtn = h('button', { class: 'btn sm', id: 'anim-load', title: 'Bring the pose at this time into Pose mode, so you can change it with the rings and store it again' }, 'Edit pose here');
  loadBtn.addEventListener('click', () => {
    const c = store.clip(store.animId);
    if (!c) return;
    store.loadPoseFromClip(c.id, store.animTime);
    store.setUi({ pose: true });
  });
  const delKey = h('button', { class: 'btn sm', id: 'anim-key-del', title: 'Remove the key at this time' }, 'Delete key');
  delKey.addEventListener('click', () => {
    const i = nearKey();
    if (i >= 0 && store.animId) store.removeKey(store.animId, i);
  });
  const delClip = h('button', { class: 'btn sm danger', id: 'anim-delete', title: 'Delete this animation' }, icon('trash', 13), 'Delete');
  delClip.addEventListener('click', () => store.animId && store.removeClip(store.animId));
  const newBtn = h('button', { class: 'btn sm', id: 'anim-new', title: 'A new, empty animation that starts with the current pose' }, icon('plus', 13), 'New');
  newBtn.addEventListener('click', () => {
    if (!store.addClip()) toast('Add a skeleton first.');
  });

  const KEY = 'polystudio.timeline';
  try {
    open = localStorage.getItem(KEY) !== 'closed';
  } catch {
    /* ignore */
  }
  const toggle = () => {
    open = !open;
    try {
      localStorage.setItem(KEY, open ? 'open' : 'closed');
    } catch {
      /* ignore */
    }
    built = '';
    render();
    tick();
  };
  const head = h('div', { class: 'tl-head' });
  const body = h('div', { class: 'tl-body' });
  box.append(head, body);

  const renderHead = () => {
    clear(head);
    const n = store.doc.anims?.length ?? 0;
    head.append(
      h('button', { class: 'tl-toggle', id: 'anim-toggle', 'aria-expanded': String(open), title: open ? 'Hide the timeline' : 'Show the timeline', onclick: toggle },
        icon(open ? 'chevD' : 'chevU', 12), h('span', { class: 'skel-title' }, 'Animation'), ...(n ? [h('span', { class: 'skel-count', title: `${n} clips` }, String(n))] : [])),
    );
    if (!open) return;
    head.append(select, newBtn, presetSel);
    const c = store.clip(store.animId);
    if (c) head.append(h('label', { class: 'anim-name' }, nameIn), h('label', { class: 'anim-dur' }, durIn, h('span', {}, 's')), h('label', { class: 'check inline' }, loopIn, h('span', {}, 'Loop')), h('span', { class: 'tl-gap' }), delClip);
  };

  /** Everything that only changes when clips or keys do. */
  function render(): void {
    const rig = store.doc.rig;
    box.classList.toggle('hidden', !rig?.length);
    box.classList.toggle('collapsed', !open);
    if (!rig?.length) return;
    const c = store.clip(store.animId);
    const sig = JSON.stringify([open, (store.doc.anims ?? []).map((x) => [x.id, x.name]), store.animId, c && [c.duration, c.loop, c.keys.map((k) => k.t)]]);
    if (sig === built) return;
    built = sig;
    select.replaceChildren(h('option', { value: '' }, (store.doc.anims?.length ? 'Choose an animation…' : 'No animations yet')), ...(store.doc.anims ?? []).map((x) => h('option', { value: x.id }, x.name)));
    select.value = store.animId ?? '';
    renderHead();
    clear(body);
    if (!open) return;
    if (!c) {
      body.append(h('p', { class: 'fnote' }, 'Pick a ready-made Walk, Run, Idle or Wave, or press New and pose the character yourself: store poses as keys on the timeline and the character moves between them.'));
      return;
    }
    nameIn.value = c.name;
    durIn.value = String(c.duration);
    loopIn.checked = c.loop;
    slider.max = String(c.duration);
    const step = c.duration <= 2 ? 0.25 : c.duration <= 6 ? 0.5 : 1;
    const ticks: HTMLElement[] = [];
    for (let t = 0; t <= c.duration + 1e-6; t += step) ticks.push(h('span', { class: 'tick', style: `left:${(t / c.duration) * 100}%` }, Number.isInteger(t) ? String(t) : t.toFixed(2)));
    keysBar.replaceChildren(...c.keys.map((k, i) =>
      h('button', {
        class: 'akey',
        'data-key': String(i),
        title: `Key at ${fmtT(k.t)} s`,
        style: `left:${(k.t / Math.max(0.001, c.duration)) * 100}%`,
        onclick: () => {
          store.setAnimTime(k.t);
        },
      }),
    ));
    body.append(
      h('div', { class: 'tl-side' }, h('div', { class: 'anim-row transport' }, play), readout, h('div', { class: 'anim-row wrap' }, addKey, loadBtn, delKey)),
      h('div', { class: 'tl-main' },
        h('div', { class: 'tl-ruler' }, ...ticks),
        h('div', { class: 'anim-track' }, slider, keysBar),
        h('p', { class: 'fnote' }, 'Play shows the character moving. To make your own motion: press Pose, turn the joints, then Key here. Move the time slider, pose again, Key here again. GLB export includes every clip.')),
    );
  }

  /** What changes every moment: the slider, the time and the play button. */
  function tick(): void {
    const c = store.clip(store.animId);
    if (!c) return;
    if (document.activeElement !== slider) slider.value = String(store.animTime);
    readout.textContent = `${fmtT(store.animTime)} / ${fmtT(c.duration)} s`;
    play.replaceChildren(icon(store.animPlaying ? 'pause' : 'play', 14), store.animPlaying ? 'Pause' : 'Play');
    play.classList.toggle('primary', store.animPlaying);
    const near = nearKey();
    keysBar.querySelectorAll('.akey').forEach((el, i) => el.classList.toggle('on', i === near));
    (delKey as HTMLButtonElement).disabled = near < 0 || c.keys.length < 2;
  }

  store.subscribe((e) => {
    if (e === 'anim' || e === 'rig' || e === 'doc' || e === 'history' || e === 'reset') {
      render();
      tick();
    }
  });
  render();
  tick();
}
