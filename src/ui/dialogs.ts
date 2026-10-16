import * as THREE from 'three';
import type { Store } from '../core/store';
import { emptyDoc, polyStats } from '../core/store';
import { runChecks, type Check } from '../core/checks';
import { GROUPS, PRESETS, defaultFormat, importGuide, packsObj, type ExportFormat } from '../core/presets';
import { removeTinyParts } from '../core/suggest';
import type { EnginePreset } from '../core/types';
import { download, exportFiles, slug } from '../engine/exporter';
import { verifyExport } from '../engine/verify';
import { hasEvent, logEvent, readEvents } from '../core/analytics';
import { validDoc, clearSaved } from '../core/persist';
import { add, clear, fmt, h, icon, modal, toast } from './dom';

export const bus = new EventTarget();
export const emit = (name: string, detail?: unknown) => bus.dispatchEvent(new CustomEvent(name, { detail }));

// ---------- new project ----------

/** Replace the current project with a fresh empty one. */
/** Size of a blob after gzip, to show roughly what a web server sends (null when the browser cannot compress). */
async function gzipSize(blob: Blob): Promise<number | null> {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const out = await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    return out.byteLength;
  } catch {
    return null;
  }
}

export function startProject(store: Store, name: string, guided: boolean, openAssets: boolean): void {
  clearSaved();
  store.load(emptyDoc(name.trim() || 'Untitled prop'));
  store.setUi({ tool: 'select' });
  logEvent('project_created', { guided });
  emit('project-created', { guided });
  if (openAssets) emit('open-assets');
}

export function openProjectDialog(store: Store, opts: { first: boolean }): void {
  let close: () => void = () => {};
  const name = h('input', { type: 'text', value: 'My prop', maxlength: '60', 'aria-label': 'Project name', id: 'proj-name' }) as HTMLInputElement;
  const guide = h('input', { type: 'checkbox', checked: !hasEvent('first_export'), id: 'proj-guide' }) as HTMLInputElement;
  const backup =
    !opts.first && store.doc.objects.length
      ? h('p', { class: 'fnote' }, 'Your current project is replaced. ', h('button', { class: 'link', onclick: () => saveProjectFile(store) }, 'Download a backup first'))
      : null;
  const create = (guided: boolean, openAssets: boolean) => {
    startProject(store, name.value, guided, openAssets);
    close();
  };
  const body = h('div', { class: 'dlg' },
    h('h2', {}, opts.first ? 'Welcome. Let’s make a game prop.' : 'New project'),
    h('p', { class: 'lead' }, 'Draw shapes, reshape them point by point, and export to your game engine. Start empty, or use a ready-made character or prop.'),
    h('label', { class: 'field' }, h('span', {}, 'Project name'), name),
    h('label', { class: 'check' }, guide, h('span', {}, 'Guide me through my first prop (a wooden chest, about 10 minutes)')),
    backup,
    h('div', { class: 'dlg-actions' },
      opts.first ? null : h('button', { class: 'btn', onclick: () => close() }, 'Cancel'),
      opts.first
        ? h('button', { class: 'btn', id: 'btn-create-assets', title: 'Start a project and open the library of ready-made characters and props', onclick: () => create(false, true) }, 'Browse ready-made assets')
        : null,
      h('button', { class: 'btn primary', id: 'btn-create', onclick: () => create(guide.checked, false) }, 'Create project'),
    ),
  );
  close = modal(body, { dismissable: !opts.first });
}

// ---------- save / open file ----------

export function saveProjectFile(store: Store): void {
  const blob = new Blob([JSON.stringify(store.doc, null, 1)], { type: 'application/json' });
  void download(blob, `${slug(store.doc.name)}.polyproj.json`).catch((e: Error) => toast(e.message));
}

export function openProjectFile(store: Store): void {
  const input = h('input', { type: 'file', accept: '.json,application/json' }) as HTMLInputElement;
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!validDoc(data)) throw new Error('not a project');
      store.load(data);
      toast(`Opened "${data.name}".`);
    } catch {
      toast('That file is not a project from this app.');
    }
  });
  input.click();
}

// ---------- export ----------

let exportFormat: ExportFormat = 'glb';
let exportCollision = false;
let exportSkeleton = true;
let exportAnimations = true;

export function openExportDialog(store: Store): void {
  let close: () => void = () => {};
  let token = 0;
  const root = h('div', { class: 'dlg export' });

  const render = () => {
    const doc = store.doc;
    const preset = PRESETS[doc.enginePreset];
    if (!preset.formats.some((f) => f.id === exportFormat)) exportFormat = defaultFormat(doc.enginePreset);
    const fmtInfo = preset.formats.find((f) => f.id === exportFormat)!;
    const checks = runChecks(doc);
    const blocked = checks.some((c) => c.level === 'error');
    const stats = polyStats(doc);
    const box = store.worldBounds();
    const size = box.isEmpty() ? null : box.getSize(new THREE.Vector3());
    const fileStats = h('div', { class: 'fstats', id: 'file-stats', role: 'status' }, 'Measuring the file…');
    const verify = h('div', { class: 'verify pending', id: 'verify', role: 'status' }, 'Checking the file…');
    const guide = h('pre', { class: 'guide', id: 'import-guide' }, importGuide(doc.enginePreset, {
      modelName: slug(doc.name),
      hasObj: packsObj(doc.enginePreset),
      collision: exportCollision && !!preset.collision,
      sizeText: size ? `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} m` : 'n/a',
      tris: stats.total,
    }));

    clear(root);
    add(
      root,
      h('div', { class: 'dlg-head' }, h('h2', {}, 'Export to a game engine or 3D software'), h('button', { class: 'tbtn', 'aria-label': 'Close', onclick: () => close() }, icon('close', 16))),
      h('div', { class: 'field' }, h('span', {}, 'Export to'),
        h('div', { class: 'segrow', role: 'tablist' }, ...GROUPS.map((g) =>
          h('button', {
            class: `segbtn${preset.group === g.id ? ' on' : ''}`,
            role: 'tab',
            'aria-selected': String(preset.group === g.id),
            'data-tab': g.id,
            onclick: () => {
              if (preset.group !== g.id) store.setPreset(Object.values(PRESETS).find((p) => p.group === g.id)!.id as EnginePreset);
              render();
            },
          }, g.label),
        )),
        h('div', { class: `cards${preset.group === 'engine' ? ' five' : ''}` }, ...Object.values(PRESETS).filter((p) => p.group === preset.group).map((p) =>
          h('button', {
            class: `card${doc.enginePreset === p.id ? ' on' : ''}`,
            'data-preset': p.id,
            onclick: () => {
              store.setPreset(p.id as EnginePreset);
              render();
            },
          }, h('strong', {}, p.label)),
        )),
        h('p', { class: 'fnote' }, preset.note),
      ),
      h('div', { class: 'field' }, h('span', {}, 'What to export'),
        (() => {
          const sel = h('select', {
            id: 'export-format',
            'aria-label': 'File format',
            onchange: () => {
              exportFormat = sel.value as ExportFormat;
              render();
            },
          }, ...preset.formats.map((f) => h('option', { value: f.id }, f.label))) as HTMLSelectElement;
          sel.value = exportFormat;
          return sel;
        })(),
        h('p', { class: 'fnote' }, fmtInfo.hint),
        preset.collision
          ? h('label', { class: 'check' },
              (() => {
                const cb = h('input', { type: 'checkbox', id: 'export-collision', checked: exportCollision, onchange: () => {
                  exportCollision = cb.checked;
                  render();
                } }) as HTMLInputElement;
                return cb;
              })(),
              h('span', {}, h('strong', {}, preset.collision.label), h('br'), h('small', {}, preset.collision.hint)),
            )
          : null,
        doc.rig?.length && exportFormat !== 'obj'
          ? h('label', { class: 'check' },
              (() => {
                const cb = h('input', { type: 'checkbox', id: 'export-skeleton', checked: exportSkeleton, onchange: () => {
                  exportSkeleton = cb.checked;
                  render();
                } }) as HTMLInputElement;
                return cb;
              })(),
              h('span', {}, h('strong', {}, 'Include the skeleton'), h('br'), h('small', {}, 'On: each character becomes one skinned mesh with joints, ready to pose. Off: parts stay separate and named, with no joints.', doc.pose ? (store.ui.pose ? ' Your pose is included.' : ' Pose is off, so the character is exported at rest.') : '')),
            )
          : null,
        doc.anims?.length && doc.rig?.length && exportSkeleton && exportFormat !== 'obj'
          ? h('label', { class: 'check' },
              (() => {
                const cb = h('input', { type: 'checkbox', id: 'export-animations', checked: exportAnimations, onchange: () => {
                  exportAnimations = cb.checked;
                  render();
                } }) as HTMLInputElement;
                return cb;
              })(),
              h('span', {}, h('strong', {}, `Include the animations (${doc.anims.length})`), h('br'), h('small', {}, exportAnimations ? `${doc.anims.map((c) => c.name).join(', ')}. The character is exported at rest and each clip turns its bones.` : 'Off: no clips in the file.')),
            )
          : null,
      ),
      h('div', { class: 'field' }, h('span', {}, 'Checks'),
        h('ul', { class: 'checks' }, ...(checks.length ? checks : [{ level: 'ok', message: 'Everything looks good. This model is ready for your engine.' } as OkRow]).map((c) => checkRow(c, store, render, close))),
        verify,
      ),
      h('details', { class: 'steps' }, h('summary', {}, `How to import into ${preset.label}`), guide),
      h('div', { class: 'summary' },
        h('span', {}, `${fmt(stats.total)} triangles`),
        size ? h('span', {}, `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`) : null,
        h('span', {}, 'Pivot: bottom center'),
        h('span', {}, 'Scale: 1 unit = 1 m'),
      ),
      fileStats,
      h('div', { class: 'dlg-actions' },
        h('button', {
          class: 'btn primary',
          id: 'btn-download',
          disabled: blocked,
          onclick: async () => {
            try {
              const res = await exportFiles(store.doc, { format: exportFormat, collision: exportCollision, skeleton: exportSkeleton, pose: store.ui.pose, animations: exportAnimations });
              const saved = await download(res.blob, res.filename);
              if (!saved) return; // viewer declined the save
              const first = !hasEvent('first_export');
              const created = readEvents().filter((e) => e.name === 'project_created').pop();
              logEvent(first ? 'first_export' : 'export', { engine: doc.enginePreset, format: exportFormat, tris: stats.total, ms: created ? Date.now() - created.t : undefined });
              emit('export');
              close();
              toast(`Saved ${saved}. Origin is at the bottom center; 1 unit = 1 m.`, 5000);
            } catch (err) {
              toast(`Export failed: ${(err as Error).message}`);
            }
          },
        }, icon('export', 15), 'Download'),
      ),
    );

    // self-test: build the file and open it again, so problems show before the download
    const mine = ++token;
    if (blocked) {
      verify.textContent = 'Add something visible to check the file.';
      return;
    }
    void (async () => {
      try {
        const res = await exportFiles(store.doc, { format: exportFormat, collision: exportCollision, skeleton: exportSkeleton, pose: store.ui.pose, animations: exportAnimations });
        const gz = await gzipSize(res.blob);
        if (mine === token) {
          const kb = (n: number) => (n < 1024 * 1024 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(2)} MB`);
          const warn = [res.blob.size > 5 * 1048576 && 'Large for a web game: consider fewer shapes.', res.drawCalls > 100 && 'Many draw calls: merge parts or use fewer materials.'].filter(Boolean).join(' ');
          fileStats.className = `fstats${warn ? ' warn' : ''}`;
          fileStats.textContent = `File ${kb(res.blob.size)}${gz ? ` (≈ ${kb(gz)} gzipped on a web server)` : ''} · ${res.drawCalls} draw ${res.drawCalls === 1 ? 'call' : 'calls'} · ${res.materials} ${res.materials === 1 ? 'material' : 'materials'}. ${warn}`;
        }
        const v = await verifyExport(res, exportCollision ? preset.collision?.nodeSuffix : undefined);
        if (mine !== token) return;
        verify.className = `verify ${v.ok ? 'good' : 'bad'}`;
        verify.dataset.ok = String(v.ok);
        verify.textContent = v.ok
          ? `File re-opened successfully: ${fmt(Math.round(v.triangles))} triangles, ${v.size.map((n) => n.toFixed(2)).join(' × ')} m, standing on y = 0.`
          : v.messages.join(' ');
      } catch (e) {
        if (mine !== token) return;
        verify.className = 'verify bad';
        verify.textContent = `Could not build the file: ${(e as Error).message}`;
      }
    })();
  };
  close = modal(root, { onClose: () => token++ });
  render();
}

type OkRow = Omit<Check, 'level'> & { level: 'ok' | Check['level'] };

function checkRow(c: OkRow, store: Store, rerender: () => void, closeDlg: () => void): HTMLElement {
  const ico = c.level === 'ok' ? 'check' : c.level === 'error' ? 'error' : c.level === 'warn' ? 'warn' : 'info';
  return h('li', { class: `check-row ${c.level}` }, icon(ico, 16), h('span', { class: 'cmsg' }, c.message),
    c.objectId ? h('button', { class: 'link', onclick: () => {
      store.select([c.objectId!]);
      closeDlg();
    } }, 'Show me') : null,
    c.fix ? h('button', { class: 'btn sm', onclick: () => {
      if (c.fix!.id === 'remove-tiny') {
        toast(`Removed ${removeTinyParts(store)} tiny part(s).`);
      }
      rerender();
    } }, c.fix.label) : null,
  );
}

// ---------- shortcuts ----------

export function openShortcuts(): void {
  const rows: [string, string][] = [
    ['V / S / W / E / R / C', 'Select, Shape, Move, Rotate, Size, Color'],
    ['Ctrl+Z · Ctrl+Shift+Z', 'Undo · Redo'],
    ['Ctrl+D', 'Duplicate'],
    ['Ctrl+G · Ctrl+Shift+G', 'Group · Ungroup'],
    ['Delete', 'Delete selection'],
    ['1 · 2 · 3 · 4', 'Front · Side · Top · 3D view'],
    ['F', 'Focus on selection'],
    ['Space + drag', 'Orbit while a tool is active'],
    ['Right-drag · Scroll', 'Pan · Zoom'],
    ['Shift-click', 'Add to selection'],
    ['Tab', 'Edit shape on / off'],
    ['P · I · K · M · Delete', 'In Edit shape: Pull out, Shrink face, Add cut, Merge points, Delete'],
    ['Shift-click · Shift-drag', 'In Edit shape: add to selection · select an area'],
    ['Esc', 'Deselect, cancel, leave preview'],
  ];
  const body = h('div', { class: 'dlg' }, h('h2', {}, 'Keyboard shortcuts'), h('p', { class: 'lead' }, 'Everything here also has a button. Shortcuts are optional.'),
    h('table', { class: 'keys' }, ...rows.map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, v)))),
  );
  modal(body);
}
