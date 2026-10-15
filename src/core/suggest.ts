import type { Store } from './store';
import { polyStats } from './store';
import { MIN_SEGMENTS } from './types';
import { triangleCount } from './shapes';

/** Halve the sides of the heaviest part that can still be simplified. Returns a human-readable result. */
export function reduceDetail(store: Store): string | null {
  const stats = polyStats(store.doc);
  for (const item of stats.perObject) {
    const o = store.get(item.id);
    if (!o || !o.shape) continue;
    const floor = Math.max(6, MIN_SEGMENTS[o.shape]);
    if (['box', 'plane', 'pyramid'].includes(o.shape) || o.params.segments <= floor) continue;
    const from = o.params.segments;
    const to = Math.max(floor, Math.floor(from / 2));
    store.updateParams(o.id, { segments: to });
    const saved = item.tris - triangleCount(o.shape, store.get(o.id)!.params);
    return `Reduced "${o.name}" from ${from} to ${to} sides, saving ${saved.toLocaleString()} triangles.`;
  }
  return null;
}

export function describeSuggestion(store: Store): string | null {
  const stats = polyStats(store.doc);
  for (const item of stats.perObject) {
    const o = store.get(item.id);
    if (!o || !o.shape) continue;
    const floor = Math.max(6, MIN_SEGMENTS[o.shape]);
    if (['box', 'plane', 'pyramid'].includes(o.shape) || o.params.segments <= floor) continue;
    const to = Math.max(floor, Math.floor(o.params.segments / 2));
    const label = o.shape === 'sphere' ? 'smoothness' : 'sides';
    return `Reduce ${label} on "${o.name}" from ${o.params.segments} to ${to}.`;
  }
  return null;
}

export function removeTinyParts(store: Store): number {
  const tiny = store.doc.objects.filter((o) => o.kind === 'shape' && (o.size[0] < 0.01 || o.size[2] < 0.01 || (o.shape !== 'plane' && o.size[1] < 0.01)));
  if (!tiny.length) return 0;
  const ids = new Set(tiny.map((o) => o.id));
  store.mutate((d) => (d.objects = d.objects.filter((o) => !ids.has(o.id))));
  return tiny.length;
}
