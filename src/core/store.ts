import * as THREE from 'three';
import {
  DEFAULT_SEGMENTS,
  SHAPE_LABELS,
  TARGET_BUDGETS,
  type Doc,
  type EnginePreset,
  type SceneObject,
  type ShapeType,
  type TargetId,
  type Vec3,
} from './types';
import { byId, childrenOf, decomposeTo, descendantIds, effectivelyVisible, isLockedChain, localMatrix, worldMatrix } from './docmath';
import { clampSegments, objectTriangles } from './shapes';
import {
  bakeScale, cloneMesh, convertSelection, deleteEdges, deleteFaces, deleteVerts, edgeMap, extrudeEdges, extrudeFaces, insetFaces, loopCut, meshTriangles,
  averageNormal, boundsOf, mergeVerts, moveVerts, normalizeMesh, parseEdge, polyMeshFor, pullDistance, subdivide, vertCount, verticesOfSelection,
  type EditMode, type PolyMesh, type Sel, type V3,
} from './mesh';

export const DEFAULT_COLOR = '#c9ced6';
const HISTORY_CAP = 500;

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `o${Date.now().toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function emptyDoc(name = 'Untitled prop', target: TargetId = 'mobile'): Doc {
  return { version: 1, name, target, customBudget: 10000, enginePreset: 'unity', objects: [] };
}

export function budgetOf(doc: Doc): number {
  return doc.target === 'custom' ? Math.max(1, doc.customBudget) : TARGET_BUDGETS[doc.target];
}

export interface PolyStats {
  total: number;
  budget: number;
  ratio: number;
  status: 'green' | 'yellow' | 'red';
  perObject: { id: string; name: string; tris: number }[];
}

export function polyStats(doc: Doc): PolyStats {
  const map = byId(doc);
  const perObject: PolyStats['perObject'] = [];
  let total = 0;
  for (const o of doc.objects) {
    if (o.kind !== 'shape' || !o.shape) continue;
    if (!effectivelyVisible(map, o)) continue;
    const tris = objectTriangles(o);
    total += tris;
    perObject.push({ id: o.id, name: o.name, tris });
  }
  perObject.sort((a, b) => b.tris - a.tris);
  const budget = budgetOf(doc);
  const ratio = total / budget;
  const status = ratio > 1 ? 'red' : ratio >= 0.7 ? 'yellow' : 'green';
  return { total, budget, ratio, status, perObject };
}

export type Tool = 'select' | 'shape' | 'move' | 'rotate' | 'scale' | 'color';

export interface UiState {
  tool: Tool;
  shape: ShapeType;
  paintColor: string;
  snapGrid: boolean;
  snapObjects: boolean;
  preview: boolean;
  gridStep: number;
}

export type StoreEvent = 'doc' | 'selection' | 'tool' | 'history' | 'reset' | 'edit' | 'learn';

export interface EditState {
  id: string;
  mode: EditMode;
  sel: Sel;
  /** Moving a point also moves its mirror image across the object's X = 0 plane. */
  symmetry: boolean;
  /** Draw the model see-through so points on the far side can be picked. */
  xray: boolean;
  /** Snap moves, turns and resizes to round steps (off = fully smooth). */
  snap: boolean;
}

const MAX_EDIT_TRIANGLES = 60000;

export class Store {
  doc: Doc;
  selection: string[] = [];
  ui: UiState = {
    tool: 'select',
    shape: 'box',
    paintColor: '#8b5a2b',
    snapGrid: true,
    snapObjects: true,
    preview: false,
    gridStep: 0.25,
  };
  edit: EditState | null = null;
  /** Parts the Learn view has not revealed yet. Only hides them on screen; the project itself is never changed. */
  learnHidden: Set<string> | null = null;
  private committed: string;
  undoStack: string[] = [];
  redoStack: string[] = [];
  private listeners = new Set<(e: StoreEvent) => void>();
  /** Set by the persistence layer. */
  onChange: (() => void) | null = null;

  constructor(doc: Doc = emptyDoc()) {
    this.doc = doc;
    this.committed = JSON.stringify(doc);
  }

  subscribe(fn: (e: StoreEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(e: StoreEvent): void {
    for (const l of [...this.listeners]) l(e);
    if (e === 'doc' || e === 'history' || e === 'reset') this.onChange?.();
  }

  get map(): Map<string, SceneObject> {
    return byId(this.doc);
  }

  get(id: string): SceneObject | undefined {
    return this.doc.objects.find((o) => o.id === id);
  }

  /** Replace the whole document (new project / open file). Clears history. */
  load(doc: Doc, history?: { undo: string[]; redo: string[] }): void {
    this.doc = doc;
    this.committed = JSON.stringify(doc);
    this.undoStack = history?.undo.slice(-HISTORY_CAP) ?? [];
    this.redoStack = history?.redo.slice(-HISTORY_CAP) ?? [];
    this.edit = null;
    this.selection = [];
    this.emit('reset');
    this.emit('selection');
  }

  /** Apply a change. Pass commit=false for live edits (drag, scrub) then call commit(). */
  mutate(fn: (doc: Doc) => void, commit = true): void {
    fn(this.doc);
    this.pruneSelection();
    this.emit('doc');
    if (commit) this.commit();
  }

  commit(): void {
    const cur = JSON.stringify(this.doc);
    if (cur === this.committed) return;
    this.undoStack.push(this.committed);
    if (this.undoStack.length > HISTORY_CAP) this.undoStack.shift();
    this.redoStack = [];
    this.committed = cur;
    this.emit('history');
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0 || JSON.stringify(this.doc) !== this.committed;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    const cur = JSON.stringify(this.doc);
    if (cur !== this.committed) {
      this.doc = JSON.parse(this.committed);
    } else {
      const prev = this.undoStack.pop();
      if (prev === undefined) return;
      this.redoStack.push(cur);
      this.doc = JSON.parse(prev);
      this.committed = prev;
    }
    this.pruneSelection();
    this.afterTimeTravel();
    this.emit('doc');
    this.emit('history');
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (next === undefined) return;
    this.undoStack.push(this.committed);
    this.doc = JSON.parse(next);
    this.committed = next;
    this.pruneSelection();
    this.afterTimeTravel();
    this.emit('doc');
    this.emit('history');
  }

  /** Point and face numbers may mean something else after undo/redo, so the edit selection starts over. */
  private afterTimeTravel(): void {
    if (!this.edit) return;
    const o = this.get(this.edit.id);
    if (!o || !o.mesh) {
      this.edit = null;
      this.emit('edit');
    } else this.edit.sel = [];
  }

  private pruneSelection(): void {
    const ids = new Set(this.doc.objects.map((o) => o.id));
    const next = this.selection.filter((id) => ids.has(id));
    if (next.length !== this.selection.length) {
      this.selection = next;
      this.emit('selection');
    }
    if (this.edit && !ids.has(this.edit.id)) {
      this.edit = null;
      this.emit('edit');
    }
  }

  setUi(patch: Partial<UiState>): void {
    Object.assign(this.ui, patch);
    this.emit('tool');
  }

  select(ids: string[]): void {
    if (this.edit && !(ids.length === 1 && ids[0] === this.edit.id)) this.exitEdit();
    const same = ids.length === this.selection.length && ids.every((v, i) => v === this.selection[i]);
    if (same) return;
    this.selection = ids;
    this.emit('selection');
  }

  // ----- document operations -----

  uniqueName(base: string): string {
    const names = new Set(this.doc.objects.map((o) => o.name));
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(`${base} ${i}`)) i += 1;
    return `${base} ${i}`;
  }

  addShape(shape: ShapeType, opts: Partial<Pick<SceneObject, 'position' | 'size' | 'color' | 'name' | 'rotation'>> & { parent?: string | null; commit?: boolean } = {}): SceneObject {
    const o: SceneObject = {
      id: newId(),
      name: opts.name ?? this.uniqueName(SHAPE_LABELS[shape]),
      kind: 'shape',
      shape,
      params: { segments: DEFAULT_SEGMENTS[shape], taper: 1 },
      position: opts.position ?? [0, shape === 'plane' ? 0 : 0.5, 0],
      rotation: opts.rotation ?? [0, 0, 0],
      size: opts.size ?? [1, 1, 1],
      color: opts.color ?? DEFAULT_COLOR,
      visible: true,
      locked: false,
      parent: opts.parent ?? null,
    };
    this.mutate((d) => d.objects.push(o), opts.commit ?? true);
    return o;
  }

  update(id: string, patch: Partial<SceneObject>, commit = true): void {
    this.mutate((d) => {
      const o = d.objects.find((x) => x.id === id);
      if (!o) return;
      Object.assign(o, patch);
      if (o.shape) o.params.segments = clampSegments(o.shape, o.params.segments);
    }, commit);
  }

  updateParams(id: string, patch: Partial<SceneObject['params']>, commit = true): void {
    this.mutate((d) => {
      const o = d.objects.find((x) => x.id === id);
      if (!o || !o.shape) return;
      Object.assign(o.params, patch);
      o.params.segments = clampSegments(o.shape, o.params.segments);
      o.params.taper = Math.max(0, Math.min(1, o.params.taper));
    }, commit);
  }

  setTarget(target: TargetId): void {
    this.mutate((d) => (d.target = target));
  }
  setCustomBudget(n: number): void {
    this.mutate((d) => (d.customBudget = Math.max(1, Math.round(n))));
  }
  setPreset(p: EnginePreset): void {
    this.mutate((d) => (d.enginePreset = p), false);
  }
  rename(name: string): void {
    this.mutate((d) => (d.name = name.trim() || 'Untitled prop'));
  }

  deleteSelected(): void {
    const kill = new Set<string>();
    for (const id of this.selection) {
      kill.add(id);
      for (const c of descendantIds(this.doc, id)) kill.add(c);
    }
    if (!kill.size) return;
    this.mutate((d) => (d.objects = d.objects.filter((o) => !kill.has(o.id))));
  }

  /** Duplicate the selection (with children), offset a little so the copy is visible. */
  duplicateSelected(offset: Vec3 = [0.5, 0, 0.5]): string[] {
    const roots = this.topLevelSelection();
    const created: string[] = [];
    this.mutate((d) => {
      for (const root of roots) {
        const idMap = new Map<string, string>();
        const ids = [root, ...descendantIds(d, root)];
        const clones: SceneObject[] = [];
        for (const id of ids) {
          const src = d.objects.find((o) => o.id === id)!;
          const c: SceneObject = JSON.parse(JSON.stringify(src));
          c.id = newId();
          idMap.set(id, c.id);
          clones.push(c);
        }
        for (const c of clones) if (c.parent && idMap.has(c.parent)) c.parent = idMap.get(c.parent)!;
        const top = clones[0];
        top.position = [top.position[0] + offset[0], top.position[1] + offset[1], top.position[2] + offset[2]];
        const names = new Set(d.objects.map((o) => o.name));
        for (const c of clones) {
          let n = c.name;
          let i = 2;
          while (names.has(n)) n = `${c.name.replace(/ \d+$/, '')} ${i++}`;
          c.name = n;
          names.add(n);
        }
        // insert right after the source tree
        const lastIdx = Math.max(...ids.map((id) => d.objects.findIndex((o) => o.id === id)));
        d.objects.splice(lastIdx + 1, 0, ...clones);
        created.push(top.id);
      }
    });
    this.select(created);
    return created;
  }

  /** Selected objects whose ancestors are not also selected. */
  topLevelSelection(): string[] {
    const sel = new Set(this.selection);
    const map = this.map;
    return this.selection.filter((id) => {
      let p = map.get(id)?.parent;
      while (p) {
        if (sel.has(p)) return false;
        p = map.get(p)?.parent ?? null;
      }
      return true;
    });
  }

  canGroup(): string | null {
    const roots = this.topLevelSelection();
    if (roots.length < 2) return 'Select two or more objects to group them.';
    const map = this.map;
    const parents = new Set(roots.map((id) => map.get(id)!.parent));
    if (parents.size > 1) return 'Pick objects that sit at the same level of the Layers list.';
    return null;
  }

  groupSelected(name?: string): string | null {
    if (this.canGroup()) return null;
    const roots = this.topLevelSelection();
    const map = this.map;
    const parent = map.get(roots[0])!.parent;
    const members = roots.map((id) => map.get(id)!);
    const cx = members.reduce((a, o) => a + o.position[0], 0) / members.length;
    const cz = members.reduce((a, o) => a + o.position[2], 0) / members.length;
    const minY = Math.min(...members.map((o) => o.position[1] - (o.kind === 'shape' ? o.size[1] / 2 : 0)));
    const g: SceneObject = {
      id: newId(),
      name: name ?? this.uniqueName('Group'),
      kind: 'group',
      params: { segments: 1, taper: 1 },
      position: [cx, minY, cz],
      rotation: [0, 0, 0],
      size: [1, 1, 1],
      color: DEFAULT_COLOR,
      visible: true,
      locked: false,
      parent,
    };
    this.mutate((d) => {
      const first = Math.min(...roots.map((id) => d.objects.findIndex((o) => o.id === id)));
      for (const id of roots) {
        const o = d.objects.find((x) => x.id === id)!;
        o.parent = g.id;
        o.position = [o.position[0] - g.position[0], o.position[1] - g.position[1], o.position[2] - g.position[2]];
      }
      d.objects.splice(first, 0, g);
    });
    this.select([g.id]);
    return g.id;
  }

  ungroupSelected(): void {
    const groups = this.topLevelSelection().filter((id) => this.get(id)?.kind === 'group');
    if (!groups.length) return;
    const freed: string[] = [];
    this.mutate((d) => {
      for (const gid of groups) {
        const g = d.objects.find((o) => o.id === gid)!;
        const gm = localMatrix(g);
        for (const c of d.objects.filter((o) => o.parent === gid)) {
          const m = gm.clone().multiply(localMatrix(c));
          Object.assign(c, decomposeTo(m));
          c.parent = g.parent;
          freed.push(c.id);
        }
        d.objects = d.objects.filter((o) => o.id !== gid);
      }
    });
    this.select(freed);
  }

  /**
   * Move `id` so it becomes a child of `newParent` at `index` among that parent's children,
   * keeping its world transform.
   */
  reparent(id: string, newParent: string | null, index: number): boolean {
    const o = this.get(id);
    if (!o) return false;
    if (newParent === id || (newParent && descendantIds(this.doc, id).includes(newParent))) return false;
    if (newParent && this.get(newParent)?.kind !== 'group') return false;
    this.mutate((d) => {
      const obj = d.objects.find((x) => x.id === id)!;
      if (obj.parent !== newParent) {
        const world = worldMatrix(d, id);
        const parentInv = newParent ? worldMatrix(d, newParent).invert() : new THREE.Matrix4();
        Object.assign(obj, decomposeTo(parentInv.multiply(world)));
        obj.parent = newParent;
      }
      // reorder: remove subtree block, then insert before the index-th sibling
      const block = [id, ...descendantIds(d, id)];
      const blockObjs = d.objects.filter((x) => block.includes(x.id));
      d.objects = d.objects.filter((x) => !block.includes(x.id));
      const sibs = d.objects.filter((x) => x.parent === newParent);
      let at: number;
      if (index >= sibs.length) {
        if (!sibs.length) {
          at = newParent ? d.objects.findIndex((x) => x.id === newParent) + 1 : d.objects.length;
        } else {
          const last = sibs[sibs.length - 1];
          const tail = [last.id, ...descendantIds(d, last.id)];
          at = Math.max(...tail.map((t) => d.objects.findIndex((x) => x.id === t))) + 1;
        }
      } else {
        at = d.objects.findIndex((x) => x.id === sibs[Math.max(0, index)].id);
      }
      d.objects.splice(at, 0, ...blockObjs);
    });
    return true;
  }

  /** Move the object up/down among its siblings. */
  nudgeOrder(id: string, dir: -1 | 1): void {
    const o = this.get(id);
    if (!o) return;
    const sibs = childrenOf(this.doc, o.parent);
    const i = sibs.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    this.reparent(id, o.parent, dir < 0 ? j : j + 1);
  }

  setLearnHidden(ids: Set<string> | null): void {
    this.learnHidden = ids && ids.size ? ids : null;
    this.emit('learn');
  }

  // ----- shape editing -----

  /** Why this object can't be edited, or null when it can. */
  whyNotEditable(id: string | undefined): string | null {
    const o = id ? this.get(id) : undefined;
    if (!o || o.kind !== 'shape') return 'Select a single shape to edit its points.';
    if (isLockedChain(this.map, o)) return 'Unlock this shape first.';
    if (!effectivelyVisible(this.map, o)) return 'Show this shape first.';
    return null;
  }

  enterEdit(id: string): string | null {
    const why = this.whyNotEditable(id);
    if (why) return why;
    if (this.edit?.id === id) return null;
    if (this.edit) this.exitEdit();
    this.mutate((d) => {
      const o = d.objects.find((x) => x.id === id)!;
      if (!o.mesh) o.mesh = polyMeshFor(o.shape!, o.params);
      bakeScale(o.mesh, o.size); // while editing, points are in real metres
      o.size = [1, 1, 1];
    });
    this.selection = [id];
    this.edit = { id, mode: 'face', sel: [], symmetry: false, xray: false, snap: false };
    this.ui.tool = 'move';
    this.emit('selection');
    this.emit('tool');
    this.emit('edit');
    return null;
  }

  exitEdit(): void {
    const e = this.edit;
    if (!e) return;
    this.edit = null;
    this.ui.tool = 'select';
    if (this.get(e.id)?.mesh) {
      this.mutate((d) => {
        const o = d.objects.find((x) => x.id === e.id);
        if (o?.mesh) o.size = normalizeMesh(o.mesh); // Properties show the real size again
      });
    }
    this.emit('edit');
    this.emit('tool');
  }

  setEditMode(mode: EditMode): void {
    const e = this.edit;
    const m = e && this.get(e.id)?.mesh;
    if (!e || !m) return;
    e.sel = convertSelection(m, e.mode, mode, e.sel);
    e.mode = mode;
    this.emit('edit');
  }

  setEditOption(patch: Partial<Pick<EditState, 'symmetry' | 'xray' | 'snap'>>): void {
    if (!this.edit) return;
    Object.assign(this.edit, patch);
    this.emit('edit');
  }

  editSelect(sel: Sel): void {
    if (!this.edit) return;
    this.edit.sel = sel;
    this.emit('edit');
  }

  editSelectAll(): void {
    const e = this.edit;
    const m = e && this.get(e.id)?.mesh;
    if (!e || !m) return;
    e.sel = e.mode === 'vertex' ? Array.from({ length: vertCount(m) }, (_, i) => i) : e.mode === 'face' ? m.f.map((_, i) => i) : [...edgeMap(m).keys()];
    this.emit('edit');
  }

  /** Live move of points (drag). Call commit() when the drag ends. */
  setMeshVerts(updates: Map<number, V3>, commit = false): void {
    const e = this.edit;
    if (!e) return;
    this.mutate((d) => {
      const m = d.objects.find((x) => x.id === e.id)?.mesh;
      if (!m) return;
      for (const [i, p] of updates) {
        m.v[i * 3] = p[0];
        m.v[i * 3 + 1] = p[1];
        m.v[i * 3 + 2] = p[2];
      }
    }, commit);
  }

  private editOp(fn: (m: PolyMesh, e: EditState) => Sel | void): void {
    const e = this.edit;
    if (!e) return;
    let result: Sel | undefined;
    this.mutate((d) => {
      const m = d.objects.find((x) => x.id === e.id)?.mesh;
      if (m) result = fn(m, e) || undefined;
    });
    if (result) e.sel = result;
    this.emit('edit');
  }

  /** Extrude. Returns a message when it can't be done. */
  pullOut(): string | null {
    const e = this.edit;
    if (!e) return null;
    if (e.mode === 'vertex') return 'Pull out works on faces or edges. Switch to Faces or Edges first.';
    if (!e.sel.length) return e.mode === 'face' ? 'Click a face first.' : 'Click an edge first.';
    this.editOp((m, ed) => {
      if (ed.mode === 'face') {
        const faces = ed.sel as number[];
        const dir = averageNormal(m, faces);
        const dist = pullDistance(m, faces);
        extrudeFaces(m, faces);
        // grow right away so the result is visible; the arrow then fine-tunes it
        moveVerts(m, verticesOfSelection(m, 'face', faces), [dir[0] * dist, dir[1] * dist, dir[2] * dist]);
        return faces;
      }
      const keys = ed.sel as string[];
      const edges = edgeMap(m);
      const adj = new Set<number>();
      keys.forEach((k) => edges.get(k)?.faces.forEach((f) => adj.add(f)));
      const dir = adj.size ? averageNormal(m, [...adj]) : ([0, 1, 0] as [number, number, number]);
      const fresh = extrudeEdges(m, keys);
      const len = Math.max(0.15, Math.min(1, keys.length ? 0.6 * (keys.reduce((a, k) => { const [x, y] = parseEdge(k); return a + Math.hypot(m.v[x * 3] - m.v[y * 3], m.v[x * 3 + 1] - m.v[y * 3 + 1], m.v[x * 3 + 2] - m.v[y * 3 + 2]); }, 0) / keys.length) : 0.5));
      moveVerts(m, verticesOfSelection(m, 'edge', fresh), [dir[0] * len, dir[1] * len, dir[2] * len]);
      return fresh;
    });
    this.ui.tool = 'move';
    this.emit('tool');
    return null;
  }

  shrinkFace(): string | null {
    const e = this.edit;
    if (!e) return null;
    if (e.mode !== 'face') return 'Shrink works on faces. Switch to Faces first.';
    if (!e.sel.length) return 'Click a face first.';
    this.editOp((m, ed) => {
      insetFaces(m, ed.sel as number[], 0.3);
      return ed.sel;
    });
    return null;
  }

  addCut(): string | null {
    const e = this.edit;
    if (!e) return null;
    if (e.mode !== 'edge') return 'Add cut needs an edge. Switch to Edges and click one.';
    if (!e.sel.length) return 'Click an edge first.';
    let cuts: string[] = [];
    this.editOp((m, ed) => {
      cuts = loopCut(m, ed.sel[0] as string);
      return cuts;
    });
    return cuts.length ? null : 'This edge can not be cut. Try an edge between two four-sided faces.';
  }

  mergePoints(): string | null {
    const e = this.edit;
    const m = e && this.get(e.id)?.mesh;
    if (!e || !m) return null;
    const verts = verticesOfSelection(m, e.mode, e.sel);
    if (verts.size < 2) return 'Select at least two points to merge.';
    this.editOp((mm, ed) => {
      const at = mergeVerts(mm, verticesOfSelection(mm, ed.mode, ed.sel));
      ed.mode = 'vertex';
      return at >= 0 ? [at] : [];
    });
    return null;
  }

  deleteSelection(): string | null {
    const e = this.edit;
    const m = e && this.get(e.id)?.mesh;
    if (!e || !m) return null;
    if (!e.sel.length) return 'Nothing selected.';
    const test = cloneMesh(m);
    if (e.mode === 'face') deleteFaces(test, e.sel as number[]);
    else if (e.mode === 'edge') deleteEdges(test, e.sel as string[]);
    else deleteVerts(test, new Set(e.sel as number[]));
    if (!test.f.length) return 'A shape needs at least one face. Delete the whole object instead.';
    this.editOp((mm, ed) => {
      if (ed.mode === 'face') deleteFaces(mm, ed.sel as number[]);
      else if (ed.mode === 'edge') deleteEdges(mm, ed.sel as string[]);
      else deleteVerts(mm, new Set(ed.sel as number[]));
      return [];
    });
    return null;
  }

  /** Subdivide the whole shape once so it rounds off. */
  roundOff(): string | null {
    const e = this.edit;
    const m = e && this.get(e.id)?.mesh;
    if (!e || !m) return null;
    const test = cloneMesh(m);
    subdivide(test);
    const tris = meshTriangles(test);
    if (tris > MAX_EDIT_TRIANGLES) return `That would make ${tris.toLocaleString()} triangles, which is too many for a game prop.`;
    this.editOp((mm) => {
      subdivide(mm);
      return [];
    });
    return null;
  }

  /** Drop the custom points and go back to the original parametric shape (keeps the current size). */
  resetShape(id: string): void {
    if (this.edit?.id === id) this.exitEdit();
    this.mutate((d) => {
      const o = d.objects.find((x) => x.id === id);
      if (o) delete o.mesh;
    });
  }

  worldMatrixOf(id: string): THREE.Matrix4 {
    return worldMatrix(this.doc, id);
  }

  /** Axis-aligned bounds of the given objects (world space) from the model alone, no renderer needed. */
  worldBounds(ids?: string[]): THREE.Box3 {
    const box = new THREE.Box3();
    const list = ids ? ids.flatMap((i) => [i, ...descendantIds(this.doc, i)]) : this.doc.objects.map((o) => o.id);
    const map = this.map;
    const v = new THREE.Vector3();
    for (const id of list) {
      const o = map.get(id);
      if (!o || o.kind !== 'shape' || !effectivelyVisible(map, o)) continue;
      const m = worldMatrix(this.doc, id);
      const mb = o.mesh && vertCount(o.mesh) ? boundsOf(o.mesh) : null;
      for (let i = 0; i < 8; i++) {
        if (mb) v.set(i & 1 ? mb.max[0] : mb.min[0], i & 2 ? mb.max[1] : mb.min[1], i & 4 ? mb.max[2] : mb.min[2]);
        else v.set(i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5);
        v.applyMatrix4(m);
        box.expandByPoint(v);
      }
    }
    return box;
  }
}
