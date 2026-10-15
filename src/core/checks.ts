import type { Doc } from './types';
import { byId, effectivelyVisible } from './docmath';
import { polyStats } from './store';
import { SHAPE_LABELS } from './types';

export interface Check {
  level: 'error' | 'warn' | 'info';
  message: string;
  /** Object to select when the user clicks "Show me". */
  objectId?: string;
  fix?: { label: string; id: 'reduce-detail' | 'rename-defaults' | 'remove-tiny' };
}

/** Human-language checks that run before export. */
export function runChecks(doc: Doc): Check[] {
  const out: Check[] = [];
  const map = byId(doc);
  const visibleShapes = doc.objects.filter((o) => o.kind === 'shape' && effectivelyVisible(map, o));

  if (!visibleShapes.length) {
    out.push({ level: 'error', message: 'There is nothing to export yet. Add at least one visible shape.' });
    return out;
  }

  for (const o of visibleShapes) {
    const [w, h, d] = o.size;
    const flatOk = o.shape === 'plane';
    if (w < 0.01 || d < 0.01 || (!flatOk && h < 0.01)) {
      out.push({
        level: 'warn',
        message: `"${o.name}" is almost flat (under 1 cm), so it may look broken or flicker in the engine.`,
        objectId: o.id,
        fix: { label: 'Remove tiny parts', id: 'remove-tiny' },
      });
    }
  }

  const defaultNamed = visibleShapes.filter((o) => new RegExp(`^${SHAPE_LABELS[o.shape!]}( \\d+)?$`).test(o.name));
  if (defaultNamed.length >= 3) {
    out.push({
      level: 'info',
      message: `${defaultNamed.length} objects still have their default names (like "${defaultNamed[0].name}"). Group them and give the prop a clear name so it is easy to find in your engine.`,
    });
  }

  const skewed = doc.objects.find((o) => {
    if (o.kind !== 'group') return false;
    const nonUniform = Math.abs(o.size[0] - o.size[1]) > 1e-3 || Math.abs(o.size[1] - o.size[2]) > 1e-3;
    const rotatedChild = doc.objects.some((c) => c.parent === o.id && c.rotation.some((r) => Math.abs(r) > 0.01));
    return nonUniform && rotatedChild;
  });
  if (skewed) {
    out.push({
      level: 'warn',
      message: `Group "${skewed.name}" is stretched unevenly and contains rotated parts. They may shear (look slanted) in the engine.`,
      objectId: skewed.id,
    });
  }

  const stats = polyStats(doc);
  if (stats.status === 'red') {
    const heavy = stats.perObject[0];
    out.push({
      level: 'warn',
      message: `The model has ${stats.total.toLocaleString()} triangles, over the ${stats.budget.toLocaleString()} budget. "${heavy.name}" is the heaviest part (${heavy.tris.toLocaleString()}).`,
      objectId: heavy.id,
      fix: { label: 'Reduce detail', id: 'reduce-detail' },
    });
  } else if (stats.status === 'yellow') {
    out.push({
      level: 'info',
      message: `The model uses ${Math.round(stats.ratio * 100)}% of the polygon budget. Still fine, but there is little room left.`,
    });
  }

  const hidden = doc.objects.filter((o) => o.kind === 'shape' && !effectivelyVisible(map, o));
  if (hidden.length) {
    out.push({
      level: 'info',
      message: `${hidden.length} hidden object${hidden.length > 1 ? 's are' : ' is'} left out of the file.`,
    });
  }
  return out;
}
