import type { Store } from './store';

export function removeTinyParts(store: Store): number {
  const tiny = store.doc.objects.filter((o) => o.kind === 'shape' && (o.size[0] < 0.01 || o.size[2] < 0.01 || (o.shape !== 'plane' && o.size[1] < 0.01)));
  if (!tiny.length) return 0;
  const ids = new Set(tiny.map((o) => o.id));
  store.mutate((d) => (d.objects = d.objects.filter((o) => !ids.has(o.id))));
  return tiny.length;
}
