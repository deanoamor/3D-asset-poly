import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ASSETS, instantiateAsset } from '../src/core/assets';
import { Store, emptyDoc } from '../src/core/store';

/**
 * "Nothing floats": every part of an asset must touch (overlap the bounding box of) another part, and every part
 * must be joined to the rest through a chain of such touches. Parts that are meant to stand apart are listed.
 */
const SEPARATE: Record<string, RegExp> = {
  house: /^(Smoke \d|Mailbox( Post| Flag)?|Tree .*|Fence .*|Path Stone .*|Bush Small|Flower \d)$/,
  car: /^$/,
  police: /^$/,
  footballer: /^$/,
  soldier: /^$/,
  island: /^$/,
  anime: /^$/,
  ribbon: /^$/,
  nurse: /^$/,
};

function boxesOf(id: string) {
  const def = ASSETS.find((a) => a.id === id)!;
  const { group, groups, parts } = instantiateAsset(def);
  const st = new Store(emptyDoc());
  st.mutate((d) => d.objects.push(group, ...groups, ...parts), false);
  return parts.map((p) => ({ name: p.name, box: st.worldBounds([p.id]) }));
}

function components(items: { name: string; box: THREE.Box3 }[], eps: number): number[][] {
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
  return comps;
}

describe('nothing floats', () => {
  for (const def of ASSETS) {
    it(`${def.name}: every part is joined to the main body`, () => {
      const items = boxesOf(def.id);
      const comps = components(items, 0.004);
      comps.sort((a, b) => b.length - a.length);
      const stray = comps.slice(1).flat().map((i) => items[i].name).filter((n) => !SEPARATE[def.id].test(n));
      expect(stray).toEqual([]);
    });
  }

  it('the character bodies are one connected piece, not several', () => {
    for (const id of ['police', 'footballer', 'soldier']) {
      const comps = components(boxesOf(id), 0.004);
      expect(comps.length).toBe(1);
    }
  });
});
