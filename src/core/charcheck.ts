import * as THREE from 'three';
import type { Doc } from './types';
import { Store, polyStats } from './store';

export interface CheckOptions {
  /** The height the character is meant to have (metres). */
  height?: number;
  /** Triangle budget. */
  maxTris?: number;
  /** Parts that are meant to stand apart from the body (a regex on the name). */
  separate?: RegExp;
}

export interface CheckIssue {
  level: 'error' | 'warn' | 'info';
  code: string;
  msg: string;
}

export interface CheckReport {
  ok: boolean;
  stats: { triangles: number; parts: number; joints: number; colors: number; size: [number, number, number]; minY: number; morphs: number; animations: number };
  issues: CheckIssue[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The checks a careful person does by eye before calling a character done: standing on the floor, the right height,
 * nothing floating, left and right matching, no hole at a joint, a sane triangle count.
 */
export function checkCharacter(doc: Doc, opts: CheckOptions = {}): CheckReport {
  const issues: CheckIssue[] = [];
  const st = new Store(JSON.parse(JSON.stringify(doc)) as Doc);
  const shapes = doc.objects.filter((o) => o.kind === 'shape' && o.visible !== false);
  const items = shapes.map((o) => ({ name: o.name, box: st.worldBounds([o.id]) }));
  const all = st.worldBounds();
  const size = all.isEmpty() ? new THREE.Vector3() : all.getSize(new THREE.Vector3());
  const tris = polyStats(doc).total;
  const colors = new Set(shapes.map((o) => o.color.toLowerCase())).size;
  const add = (level: CheckIssue['level'], code: string, msg: string) => issues.push({ level, code, msg });

  if (!shapes.length) add('error', 'empty', 'There are no shapes.');

  // the floor
  if (!all.isEmpty()) {
    if (all.min.y < -0.02) add('error', 'below-floor', `The lowest point is ${r2(all.min.y)} m: the character sinks into the floor. Its feet should be at y = 0.`);
    else if (all.min.y > 0.03) add('warn', 'above-floor', `The lowest point is ${r2(all.min.y)} m above the floor. Feet should be at y = 0.`);
  }
  // the height
  if (opts.height && size.y) {
    // hats, crests and held props do not count: measure the body up to the top of the head when there is a skeleton
    const top = (doc.rig ?? []).find((j) => j.name === 'Head Top');
    const body = top ? top.pos[1] - Math.min(0, all.min.y) : size.y;
    const k = body / opts.height;
    if (Math.abs(k - 1) > 0.06) add('warn', 'height', `The character is ${r2(body)} m tall${top ? ' (feet to the top of the head)' : ''}, but ${r2(opts.height)} m was intended (${Math.round(k * 100)}%).`);
    if (top && size.y > body * 1.35) add('info', 'tall-gear', `With gear the whole figure is ${r2(size.y)} m (body ${r2(body)} m): hats and props make it taller than the body.`);
  }
  // the budget
  if (opts.maxTris && tris > opts.maxTris) add('error', 'budget', `${tris} triangles is over the budget of ${opts.maxTris}.`);

  // floating parts
  const eps = 0.004;
  const n = items.length;
  const seen = new Array(n).fill(false);
  const comps: number[][] = [];
  const touch = (a: number, b: number) => items[a].box.clone().expandByScalar(eps).intersectsBox(items[b].box);
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    const comp = [i];
    seen[i] = true;
    for (let k = 0; k < comp.length; k++) for (let j = 0; j < n; j++) if (!seen[j] && touch(comp[k], j)) (seen[j] = true), comp.push(j);
    comps.push(comp);
  }
  comps.sort((a, b) => b.length - a.length);
  const stray = comps.slice(1).flat().map((i) => items[i].name).filter((nm) => !(opts.separate && opts.separate.test(nm)));
  if (stray.length) add('error', 'floating', `These parts do not touch the body (they float): ${stray.join(', ')}.`);

  // left / right
  const byName = new Map(items.map((it) => [it.name, it.box]));
  const lone: string[] = [];
  const off: string[] = [];
  const oneHanded = /^(Scabbard|Sword|Shield|Staff|Satchel|Quiver|Holster)/;
  for (const [name, box] of byName) {
    if (!/\bLeft\b/.test(name) || oneHanded.test(name)) continue;
    const twin = byName.get(name.replace(/\bLeft\b/, 'Right'));
    if (!twin) {
      lone.push(name);
      continue;
    }
    const a = box.getCenter(new THREE.Vector3());
    const b = twin.getCenter(new THREE.Vector3());
    const sa = box.getSize(new THREE.Vector3());
    const sb = twin.getSize(new THREE.Vector3());
    const mid = 0; // the character is centred on x = 0
    if (Math.abs(a.x + b.x - 2 * mid) > 0.03 || Math.abs(a.y - b.y) > 0.03 || Math.abs(a.z - b.z) > 0.03 || Math.abs(sa.y - sb.y) > 0.04 * Math.max(sa.y, 0.1)) off.push(name.replace(/\bLeft\b/, '').trim());
  }
  for (const [name] of byName) if (/\bRight\b/.test(name) && !oneHanded.test(name) && !byName.has(name.replace(/\bRight\b/, 'Left'))) lone.push(name);
  if (lone.length) add('warn', 'one-sided', `No matching twin for: ${lone.join(', ')}.`);
  if (off.length) add('info', 'asymmetric', `Left and Right differ (fine for a pose, a mistake otherwise): ${off.join(', ')}.`);

  // joints: inside the body, and not in a hole
  const rig = doc.rig ?? [];
  const holes: string[] = [];
  for (const j of rig) {
    const p = new THREE.Vector3(...j.pos);
    if (!all.isEmpty() && !all.clone().expandByScalar(0.05).containsPoint(p)) {
      add('warn', 'joint-outside', `Joint “${j.name}” is outside the character.`);
      continue;
    }
    if (!items.some((it) => it.box.clone().expandByScalar(0.03).containsPoint(p))) holes.push(j.name);
  }
  if (holes.length) add('warn', 'joint-hole', `No part covers these joints, so the body would tear or leave a gap there: ${holes.join(', ')}.`);
  if (rig.length) {
    const hasHead = items.some((it) => /^Head$/i.test(it.name));
    const head = byName.get('Head');
    if (hasHead && head && size.y) {
      const ratio = head.getSize(new THREE.Vector3()).y / size.y;
      if (ratio < 0.11 || ratio > 0.45) add('warn', 'head-size', `The head is ${Math.round(ratio * 100)}% of the height (usual: 12–35%).`);
    }
  }

  // tiny parts
  const tiny = items.filter((it) => Math.max(...it.box.getSize(new THREE.Vector3()).toArray()) < 0.012).map((it) => it.name);
  if (tiny.length) add('info', 'tiny', `Very small parts (under 1.2 cm), they barely show: ${tiny.join(', ')}.`);
  if (colors > 24) add('info', 'colors', `${colors} different colours: fewer reads better and packs into a smaller atlas.`);

  return {
    ok: !issues.some((i) => i.level === 'error'),
    stats: { triangles: tris, parts: shapes.length, joints: rig.length, colors, size: [r2(size.x), r2(size.y), r2(size.z)], minY: all.isEmpty() ? 0 : r2(all.min.y), morphs: doc.morphs?.length ?? 0, animations: doc.anims?.length ?? 0 },
    issues,
  };
}
