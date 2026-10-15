/**
 * Local-only event log (nothing leaves the browser). It backs the PRD success metrics:
 * time to first export, onboarding completion, export count.
 */
const KEY = 'polystudio.events.v1';

export interface LogEvent {
  t: number;
  name: string;
  data?: Record<string, unknown>;
}

export function readEvents(): LogEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as LogEvent[];
  } catch {
    return [];
  }
}

export function logEvent(name: string, data?: Record<string, unknown>): void {
  try {
    const all = readEvents();
    all.push({ t: Date.now(), name, data });
    localStorage.setItem(KEY, JSON.stringify(all.slice(-500)));
  } catch {
    /* ignore */
  }
}

export function hasEvent(name: string): boolean {
  return readEvents().some((e) => e.name === name);
}
