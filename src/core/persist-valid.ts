import type { Doc } from './types';

export function validDoc(d: unknown): d is Doc {
  const x = d as Doc;
  return !!x && x.version === 1 && Array.isArray(x.objects) && typeof x.name === 'string';
}
