import { describe, expect, it } from 'vitest';
import {
  bakeScale, boundsOf, consistentWinding, cloneMesh, compact, convertSelection, deleteFaces, edgeMap, extrudeEdges, extrudeFaces, insetFaces, isClosed,
  loopCut, meshTriangles, mergeVerts, mirrorPairs, normalizeMesh, polyMeshFor, signedVolume, subdivide, triangulate, vertCount, vert, faceNormal,
} from '../src/core/mesh';
import { triangleCount } from '../src/core/shapes';
import type { ShapeType } from '../src/core/types';

const shapes: ShapeType[] = ['box', 'cylinder', 'sphere', 'cone', 'pyramid'];
const euler = (m: ReturnType<typeof polyMeshFor>) => vertCount(m) - edgeMap(m).size + m.f.length;

describe('primitives as polygons', () => {
  for (const s of shapes) {
    it(`${s}: closed, outward-facing, Euler characteristic 2`, () => {
      const m = polyMeshFor(s, { segments: s === 'sphere' ? 12 : 16, taper: s === 'cylinder' ? 0.6 : 1 });
      expect(isClosed(m)).toBe(true);
      expect(signedVolume(m)).toBeGreaterThan(0.05);
      expect(euler(m)).toBe(2);
    });
  }
  it('box has 8 points, 12 edges and 6 faces and 12 triangles', () => {
    const m = polyMeshFor('box', { segments: 1, taper: 1 });
    expect([vertCount(m), edgeMap(m).size, m.f.length, meshTriangles(m)]).toEqual([8, 12, 6, 12]);
  });
  it('sphere keeps the same triangle count as the parametric sphere', () => {
    const p = { segments: 12, taper: 1 };
    expect(meshTriangles(polyMeshFor('sphere', p))).toBe(triangleCount('sphere', p));
  });
  it('triangulate produces one triangle per polygon corner fan', () => {
    const m = polyMeshFor('cylinder', { segments: 8, taper: 1 });
    const t = triangulate(m);
    expect(t.positions.length / 9).toBe(meshTriangles(m));
    expect(t.faceOfTri.length).toBe(meshTriangles(m));
  });
});

describe('operations', () => {
  const box = () => polyMeshFor('box', { segments: 1, taper: 1 });
  const topFace = (m: ReturnType<typeof box>) => m.f.findIndex((_, i) => faceNormal(m, i)[1] > 0.9);

  it('extrude a face adds 4 side walls and keeps the mesh closed', () => {
    const m = box();
    extrudeFaces(m, [topFace(m)]);
    expect(vertCount(m)).toBe(12);
    expect(m.f.length).toBe(10);
    expect(isClosed(m)).toBe(true);
    expect(consistentWinding(m)).toBe(true);
    expect(euler(m)).toBe(2);
    expect(signedVolume(m)).toBeCloseTo(1, 5); // zero-height walls add nothing yet
    // push the new top up and the volume must grow (walls face outward)
    const top = new Set(m.f[topFace(m)]);
    top.forEach((i) => (m.v[i * 3 + 1] += 0.5));
    expect(signedVolume(m)).toBeCloseTo(1.5, 5);
  });

  it('extrude several faces together only walls the outer border', () => {
    const m = box();
    const sides = m.f.map((_, i) => i).filter((i) => Math.abs(faceNormal(m, i)[1]) < 0.1);
    extrudeFaces(m, sides.slice(0, 2));
    expect(isClosed(m)).toBe(true);
  });

  it('inset a face keeps it closed and outward', () => {
    const m = box();
    insetFaces(m, [topFace(m)], 0.3);
    expect(consistentWinding(m)).toBe(true);
    expect(m.f.length).toBe(10);
    expect(isClosed(m)).toBe(true);
    expect(signedVolume(m)).toBeGreaterThan(0.9);
    expect(euler(m)).toBe(2);
  });

  it('loop cut through a box edge splits a ring of 4 faces', () => {
    const m = box();
    const edge = [...edgeMap(m).values()].find((e) => Math.abs(m.v[e.a * 3 + 1] - m.v[e.b * 3 + 1]) > 0.9)!; // a vertical edge
    const cuts = loopCut(m, edge.key);
    expect(cuts).toHaveLength(4);
    expect(consistentWinding(m)).toBe(true);
    expect(m.f.length).toBe(10);
    expect(vertCount(m)).toBe(12);
    expect(isClosed(m)).toBe(true);
    expect(euler(m)).toBe(2);
    expect(signedVolume(m)).toBeCloseTo(1, 5);
  });

  it('loop cut on a cylinder wall goes all the way round', () => {
    const m = polyMeshFor('cylinder', { segments: 8, taper: 1 });
    const edge = [...edgeMap(m).values()].find((e) => Math.abs(m.v[e.a * 3 + 1] - m.v[e.b * 3 + 1]) > 0.9)!;
    const cuts = loopCut(m, edge.key);
    expect(cuts).toHaveLength(8);
    expect(signedVolume(m)).toBeGreaterThan(0);
  });

  it('merging the four top points makes a pyramid', () => {
    const m = box();
    const top = new Set(m.f[topFace(m)]);
    mergeVerts(m, top);
    expect(vertCount(m)).toBe(5);
    expect(m.f.length).toBe(5);
    expect(isClosed(m)).toBe(true);
    expect(signedVolume(m)).toBeCloseTo(1 / 3, 5);
  });

  it('delete a face opens the mesh and drops unused points', () => {
    const m = box();
    deleteFaces(m, [topFace(m)]);
    expect(m.f.length).toBe(5);
    expect(isClosed(m)).toBe(false);
    expect(vertCount(m)).toBe(8);
    deleteFaces(m, m.f.map((_, i) => i));
    expect(vertCount(m)).toBe(0);
  });

  it('subdivide quadruples the triangles of a box and stays closed and rounder', () => {
    const m = box();
    subdivide(m);
    expect(meshTriangles(m)).toBe(48);
    expect(isClosed(m)).toBe(true);
    expect(consistentWinding(m)).toBe(true);
    expect(euler(m)).toBe(2);
    expect(Math.abs(vert(m, 0)[0])).toBeLessThan(0.5); // corners are pulled in
    expect(signedVolume(m)).toBeGreaterThan(0.3);
    subdivide(m);
    expect(meshTriangles(m)).toBe(192);
  });

  it('subdivide works on a sphere with poles and on an open mesh', () => {
    const s = polyMeshFor('sphere', { segments: 8, taper: 1 });
    const before = meshTriangles(s);
    subdivide(s);
    expect(isClosed(s)).toBe(true);
    expect(meshTriangles(s)).toBeGreaterThan(before);
    const o = box();
    deleteFaces(o, [topFace(o)]);
    subdivide(o);
    expect(o.f.length).toBe(20);
  });

  it('extrude edges creates a flap', () => {
    const m = polyMeshFor('plane', { segments: 1, taper: 1 });
    const first = [...edgeMap(m).keys()][0];
    const out = extrudeEdges(m, [first]);
    expect(out).toHaveLength(1);
    expect(m.f.length).toBe(2);
    expect(vertCount(m)).toBe(6);
    expect(consistentWinding(m)).toBe(true); // the flap continues the surface instead of folding back on it
  });

  it('bake and normalize round-trip', () => {
    const m = box();
    bakeScale(m, [2, 3, 4]);
    expect(boundsOf(m).max).toEqual([1, 1.5, 2]);
    const size = normalizeMesh(m);
    expect(size).toEqual([2, 3, 4]);
    expect(boundsOf(m).max).toEqual([0.5, 0.5, 0.5]);
  });

  it('mirror pairs match left and right points', () => {
    const m = box();
    const pairs = mirrorPairs(m);
    expect(pairs.size).toBe(8);
    for (const [a, b] of pairs) expect(vert(m, a)[0]).toBeCloseTo(-vert(m, b)[0]);
  });

  it('converts a face selection to points and back', () => {
    const m = box();
    const f = topFace(m);
    const verts = convertSelection(m, 'face', 'vertex', [f]);
    expect(verts).toHaveLength(4);
    expect(convertSelection(m, 'vertex', 'face', verts)).toEqual([f]);
    expect(convertSelection(m, 'vertex', 'edge', verts)).toHaveLength(4);
  });

  it('compact removes points nobody uses', () => {
    const m = cloneMesh(box());
    m.v.push(9, 9, 9);
    const map = compact(m);
    expect(vertCount(m)).toBe(8);
    expect(map[8]).toBe(-1);
  });
});

import { Store, emptyDoc, polyStats } from '../src/core/store';

describe('store editing', () => {
  const setup = () => {
    const st = new Store(emptyDoc('t'));
    const o = st.addShape('box', { size: [2, 1, 1], position: [1, 0.5, 0] });
    return { st, id: o.id };
  };

  it('enter bakes the size into the points and exit restores it', () => {
    const { st, id } = setup();
    expect(st.enterEdit(id)).toBeNull();
    expect(st.get(id)!.size).toEqual([1, 1, 1]);
    expect(boundsOf(st.get(id)!.mesh!).max).toEqual([1, 0.5, 0.5]);
    st.exitEdit();
    expect(st.get(id)!.size).toEqual([2, 1, 1]);
    expect(st.edit).toBeNull();
  });

  it('pull out raises the top face and the budget follows', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    const m = () => st.get(id)!.mesh!;
    const top = m().f.findIndex((_, i) => faceNormal(m(), i)[1] > 0.9);
    st.editSelect([top]);
    expect(st.pullOut()).toBeNull();
    expect(m().f.length).toBe(10);
    expect(polyStats(st.doc).total).toBe(meshTriangles(m()));
    const verts = new Set(m().f[top]);
    const up = new Map<number, [number, number, number]>();
    verts.forEach((i) => up.set(i, [m().v[i * 3], m().v[i * 3 + 1] + 1, m().v[i * 3 + 2]]));
    st.setMeshVerts(up, true);
    st.exitEdit();
    expect(st.get(id)!.size[1]).toBeCloseTo(1 + 0.85 + 1, 4); // 1 m box + Pull out's own 0.85 + the extra metre dragged
  });

  it('pull out grows right away, in the direction the face points, and stays a valid solid', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    const m = () => st.get(id)!.mesh!;
    const right = m().f.findIndex((_, i) => faceNormal(m(), i)[0] > 0.9);
    st.editSelect([right]);
    const w0 = boundsOf(m()).max[0] - boundsOf(m()).min[0];
    st.pullOut();
    const w1 = boundsOf(m()).max[0] - boundsOf(m()).min[0];
    expect(w1).toBeGreaterThan(w0 + 0.2);
    expect(isClosed(m())).toBe(true);
    expect(consistentWinding(m())).toBe(true);
    expect(signedVolume(m())).toBeGreaterThan(2);
  });

  it('pull out on an edge makes a visible flap', () => {
    const st = new Store(emptyDoc('t'));
    const o = st.addShape('plane');
    st.enterEdit(o.id);
    st.setEditMode('edge');
    st.editSelect([[...edgeMap(st.get(o.id)!.mesh!).keys()][0]]);
    st.pullOut();
    const b = boundsOf(st.get(o.id)!.mesh!);
    expect(b.max[1] - b.min[1]).toBeGreaterThan(0.2);
  });

  it('each action is one undo step and undo drops the edit selection', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    st.commit();
    const top = st.get(id)!.mesh!.f.findIndex((_, i) => faceNormal(st.get(id)!.mesh!, i)[1] > 0.9);
    st.editSelect([top]);
    st.shrinkFace();
    expect(st.get(id)!.mesh!.f.length).toBe(10);
    st.undo();
    expect(st.get(id)!.mesh!.f.length).toBe(6);
    expect(st.edit!.sel).toEqual([]);
  });

  it('the last Shrink face can be made bigger or smaller by hand until something else is done', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    st.commit();
    const top = st.get(id)!.mesh!.f.findIndex((_, i) => faceNormal(st.get(id)!.mesh!, i)[1] > 0.9);
    st.editSelect([top]);
    st.shrinkFace();
    expect(st.shrinkSession).not.toBeNull();
    const width = () => {
      const m = st.get(id)!.mesh!;
      const xs = m.f[top].map((vi) => m.v[vi * 3]);
      return Math.max(...xs) - Math.min(...xs);
    };
    const w30 = width();
    st.setShrinkAmount(0.6);
    expect(width()).toBeLessThan(w30 * 0.7); // shrunk more
    expect(st.get(id)!.mesh!.f.length).toBe(10); // still one inset, not two
    st.setShrinkAmount(0.1);
    expect(width()).toBeGreaterThan(w30 * 1.2); // shrunk less
    st.setShrinkAmount(5);
    expect(st.shrinkSession!.amount).toBe(0.95); // kept in range
    st.setShrinkAmount(0.4, true);
    st.pullOut(); // doing anything else ends the adjusting
    expect(st.shrinkSession).toBeNull();
    st.setShrinkAmount(0.9); // and then it does nothing
    expect(st.get(id)!.mesh!.f.length).toBe(14);
  });

  it('adjusting the shrink is undone in one step', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    st.commit();
    const top = st.get(id)!.mesh!.f.findIndex((_, i) => faceNormal(st.get(id)!.mesh!, i)[1] > 0.9);
    st.editSelect([top]);
    st.shrinkFace();
    st.setShrinkAmount(0.7, true);
    st.undo();
    expect(st.get(id)!.mesh!.f.length).toBe(10); // back to the first shrink
    st.undo();
    expect(st.get(id)!.mesh!.f.length).toBe(6);
  });

  it('undoing past the start of editing leaves edit mode', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    st.undo();
    expect(st.get(id)!.mesh).toBeUndefined();
    expect(st.edit).toBeNull();
  });

  it('explains why an action cannot run', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    st.setEditMode('vertex');
    expect(st.pullOut()).toMatch(/Faces or Edges/);
    st.setEditMode('face');
    expect(st.shrinkFace()).toMatch(/Click a face/);
    expect(st.mergePoints()).toMatch(/at least two/);
    st.editSelectAll();
    expect(st.deleteSelection()).toMatch(/at least one face/);
  });

  it('round off refuses to blow the triangle budget', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    let msg: string | null = null;
    let rounds = 0;
    while (!msg && rounds < 10) {
      msg = st.roundOff();
      rounds++;
    }
    expect(msg).toMatch(/too many/);
    expect(meshTriangles(st.get(id)!.mesh!)).toBeLessThanOrEqual(60000);
    expect(rounds).toBe(7); // 12 -> 48 -> ... -> 49,152, the next one would be 196,608
  });

  it('selecting another object leaves edit mode', () => {
    const { st, id } = setup();
    const other = st.addShape('sphere');
    st.enterEdit(id);
    st.select([other.id]);
    expect(st.edit).toBeNull();
  });

  it('reset goes back to the parametric shape and keeps the size', () => {
    const { st, id } = setup();
    st.enterEdit(id);
    st.exitEdit();
    st.resetShape(id);
    expect(st.get(id)!.mesh).toBeUndefined();
    expect(st.get(id)!.size).toEqual([2, 1, 1]);
  });

  it('refuses locked or hidden shapes', () => {
    const { st, id } = setup();
    st.update(id, { locked: true });
    expect(st.enterEdit(id)).toMatch(/Unlock/);
  });
});
