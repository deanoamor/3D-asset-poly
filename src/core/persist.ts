import type { Doc } from './types';
import type { Store } from './store';

const DOC_KEY = 'polystudio.doc.v1';
const DB_NAME = 'polystudio';
const HIST_STORE = 'history';

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* quota or blocked: ignore, nothing else we can do */
  }
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(HIST_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(key: string, val: unknown): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(HIST_STORE, 'readwrite');
    tx.objectStore(HIST_STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  db.close();
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  const v = await new Promise<T | undefined>((resolve) => {
    const req = db.transaction(HIST_STORE).objectStore(HIST_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => resolve(undefined);
  });
  db.close();
  return v;
}

export function validDoc(d: unknown): d is Doc {
  const x = d as Doc;
  return !!x && x.version === 1 && Array.isArray(x.objects) && typeof x.name === 'string';
}

export interface Saved {
  doc: Doc;
  savedAt: number;
}

export function readSavedDoc(): Saved | null {
  const raw = lsGet(DOC_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Saved;
    return validDoc(parsed.doc) ? parsed : null;
  } catch {
    return null;
  }
}

/** Continuous auto-save: doc goes to localStorage synchronously (survives tab close), history to IndexedDB. */
export function startAutosave(store: Store, onStatus: (s: 'saved' | 'saving') => void): () => void {
  let docTimer: number | undefined;
  let histTimer: number | undefined;
  const saveDoc = () => {
    docTimer = undefined;
    lsSet(DOC_KEY, JSON.stringify({ doc: store.doc, savedAt: Date.now() } satisfies Saved));
    onStatus('saved');
  };
  const saveHist = () => {
    histTimer = undefined;
    void idbPut('stacks', { undo: store.undoStack, redo: store.redoStack, savedAt: Date.now() });
  };
  store.onChange = () => {
    onStatus('saving');
    if (docTimer === undefined) docTimer = window.setTimeout(saveDoc, 250);
    if (histTimer === undefined) histTimer = window.setTimeout(saveHist, 1200);
  };
  const flush = () => {
    if (docTimer !== undefined) {
      clearTimeout(docTimer);
      saveDoc();
    }
    if (histTimer !== undefined) {
      clearTimeout(histTimer);
      saveHist();
    }
  };
  const onHide = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flush);
  return () => {
    store.onChange = null;
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', flush);
  };
}

export async function readSavedHistory(savedAt: number): Promise<{ undo: string[]; redo: string[] } | undefined> {
  const h = await idbGet<{ undo: string[]; redo: string[]; savedAt: number }>('stacks');
  // history is only valid if it was written for this document state (within a couple of seconds of it)
  if (!h || Math.abs(h.savedAt - savedAt) > 5000) return undefined;
  return { undo: h.undo, redo: h.redo };
}

export function clearSaved(): void {
  try {
    localStorage.removeItem(DOC_KEY);
  } catch {
    /* ignore */
  }
  void idbPut('stacks', { undo: [], redo: [], savedAt: 0 });
}
