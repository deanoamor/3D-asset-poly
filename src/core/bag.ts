import type { Doc } from './types';
import { unzipFiles } from './zip';
import { validDoc } from './persist-valid';

/**
 * The "bag": one `.3pi` file that holds every save in the library, so all work can be backed up or moved to
 * another computer in one go. It is JSON, compressed with gzip when the browser can.
 */
export interface SaveEntry {
  id: string;
  name: string;
  savedAt: number;
  doc: Doc;
  /** A small picture (data URL) shown in the list. */
  thumb?: string;
}

export interface Bag {
  format: '3pi';
  version: 1;
  app: 'Poly Studio';
  createdAt: number;
  saves: SaveEntry[];
}

export const BAG_EXT = '.3pi';

export function validEntry(e: unknown): e is SaveEntry {
  const x = e as SaveEntry;
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.savedAt === 'number' && validDoc(x.doc);
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const w = stream.writable.getWriter();
  void w.write(bytes as BufferSource).then(() => w.close());
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encodeBag(saves: SaveEntry[], now = Date.now()): Promise<Uint8Array> {
  const bag: Bag = { format: '3pi', version: 1, app: 'Poly Studio', createdAt: now, saves };
  const raw = new TextEncoder().encode(JSON.stringify(bag));
  if (typeof CompressionStream === 'undefined') return raw;
  return pipe(raw, new CompressionStream('gzip'));
}

/** Accepts a .3pi, or a .zip that a download host wrapped around one. Throws if it is not a bag. */
export async function decodeBag(input: Uint8Array): Promise<SaveEntry[]> {
  let bytes = input;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const inner = unzipFiles(bytes).find((e) => e.name.toLowerCase().endsWith(BAG_EXT));
    if (!inner || typeof inner.data === 'string') throw new Error('No .3pi file inside that zip.');
    bytes = inner.data;
  }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open compressed bags.');
    bytes = await pipe(bytes, new DecompressionStream('gzip'));
  }
  let bag: Bag;
  try {
    bag = JSON.parse(new TextDecoder().decode(bytes)) as Bag;
  } catch {
    throw new Error('That is not a .3pi file.');
  }
  if (bag?.format !== '3pi' || !Array.isArray(bag.saves)) throw new Error('That is not a .3pi file.');
  const good = bag.saves.filter(validEntry);
  if (!good.length) throw new Error('That bag has no saves in it.');
  return good;
}

export interface MergeResult {
  saves: SaveEntry[];
  added: number;
  updated: number;
  kept: number;
  copied: number;
}

/**
 * Put incoming saves into the library. Same id and same content: nothing to do. Same id, newer incoming: replaces it.
 * Same id but the library copy is newer: the incoming one is kept as a separate copy so nothing is ever lost.
 */
export function mergeSaves(existing: SaveEntry[], incoming: SaveEntry[], newId: () => string): MergeResult {
  const saves = existing.map((s) => s);
  const res: MergeResult = { saves, added: 0, updated: 0, kept: 0, copied: 0 };
  for (const inc of incoming) {
    const i = saves.findIndex((s) => s.id === inc.id);
    if (i < 0) {
      saves.push(inc);
      res.added++;
    } else if (JSON.stringify(saves[i].doc) === JSON.stringify(inc.doc)) {
      res.kept++;
    } else if (inc.savedAt > saves[i].savedAt) {
      saves[i] = inc;
      res.updated++;
    } else {
      saves.push({ ...inc, id: newId(), name: `${inc.name} (imported)` });
      res.copied++;
    }
  }
  saves.sort((a, b) => b.savedAt - a.savedAt);
  return res;
}
