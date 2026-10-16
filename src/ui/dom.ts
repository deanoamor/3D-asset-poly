type Child = Node | string | false | null | undefined;
type Attrs = Record<string, unknown> & { class?: string; style?: string };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'dataset') Object.assign(el.dataset, v as object);
    else if (k in el && k !== 'style' && k !== 'list') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) {
    if (c === false || c === null || c === undefined) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function add(el: HTMLElement, ...children: Child[]): void {
  for (const c of children) {
    if (c === false || c === null || c === undefined) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

const P = (d: string) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;

export const ICONS: Record<string, string> = {
  select: P('M4 3l8 4.2-3.4 1.1L7.4 12z'),
  shape: P('M8 1.8l5 2.7v5L8 12.2 3 9.5v-5z M3 4.5l5 2.7 5-2.7 M8 7.2v5'),
  move: P('M8 2v12M2 8h12M8 2l-1.8 1.8M8 2l1.8 1.8M8 14l-1.8-1.8M8 14l1.8-1.8M2 8l1.8-1.8M2 8l1.8 1.8M14 8l-1.8-1.8M14 8l-1.8 1.8'),
  rotate: P('M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3'),
  scale: P('M3 9v4h4M13 7V3H9M3 13l10-10'),
  color: P('M8 2s4.5 4.4 4.5 7.4A4.5 4.5 0 0 1 3.5 9.4C3.5 6.4 8 2 8 2z'),
  box: P('M8 1.8l5 2.7v7L8 14.2 3 11.5v-7z M3 4.5l5 2.8 5-2.8 M8 7.3v6.9'),
  cylinder: P('M3.5 4.2c0-1.1 2-2 4.5-2s4.5.9 4.5 2-2 2-4.5 2-4.5-.9-4.5-2zM3.5 4.2v7.6c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V4.2'),
  sphere: P('M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM2.3 8c1.4 1.2 3.4 1.8 5.7 1.8s4.3-.6 5.7-1.8'),
  cone: P('M8 2L3.5 11.6c0 1.2 2 2.2 4.5 2.2s4.5-1 4.5-2.2z'),
  pyramid: P('M8 2L2.5 11.5 8 14l5.5-2.5zM8 2v12M2.5 11.5L8 9.5l5.5 2'),
  plane: P('M2.5 10.5L6 5h7.5L10 10.5z'),
  group: P('M2.5 5.5h4v-2h-4zM9.5 12.5h4v-2h-4zM4.5 5.5v4h5M2.5 9.5h2'),
  ungroup: P('M2.5 3.5h4v4h-4zM9.5 8.5h4v4h-4z'),
  duplicate: P('M5.5 5.5h7v7h-7zM3.5 10.5v-7h7'),
  trash: P('M3 4.5h10M6.5 4.5v-2h3v2M4.5 4.5l.6 8.5h5.8l.6-8.5M7 7v4M9 7v4'),
  up: P('M4 9.5L8 5.5l4 4'),
  down: P('M4 6.5L8 10.5l4-4'),
  chevR: P('M6 4l4 4-4 4'),
  chevD: P('M4 6l4 4 4-4'),
  eye: P('M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z'),
  eyeOff: P('M2 2l12 12M6.3 4A6.5 6.5 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5a11 11 0 0 1-2 2.5M4 5.5A11 11 0 0 0 1.5 8S4 12.5 8 12.5c1 0 1.9-.3 2.7-.7'),
  lock: P('M4.5 7.5h7v5.5h-7zM6 7.5V5.5a2 2 0 0 1 4 0v2'),
  unlock: P('M4.5 7.5h7v5.5h-7zM6 7.5V5.5a2 2 0 0 1 3.8-.8'),
  undo: P('M5.5 4L2.5 7l3 3M2.5 7h7a3.5 3.5 0 0 1 0 7H7'),
  redo: P('M10.5 4l3 3-3 3M13.5 7h-7a3.5 3.5 0 0 0 0 7H9'),
  preview: P('M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z'),
  export: P('M8 2v8M5 7l3 3 3-3M3 12.5h10'),
  menu: P('M3 4.5h10M3 8h10M3 11.5h10'),
  focus: P('M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10M8 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z'),
  grid: P('M2.5 2.5h11v11h-11zM2.5 6.2h11M2.5 9.8h11M6.2 2.5v11M9.8 2.5v11'),
  magnet: P('M3 12V7a5 5 0 0 1 10 0v5h-3V7a2 2 0 0 0-4 0v5zM3 10h3M10 10h3'),
  check: P('M3.5 8.5l3 3 6-6.5'),
  close: P('M4 4l8 8M12 4l-8 8'),
  warn: P('M8 2.5L14 13H2zM8 6.5v3M8 11.3v.2'),
  info: P('M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 7.2v3.6M8 5.2v.2'),
  error: P('M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4'),
  folder: P('M2 4.5h4l1.5 1.5H14v6.5H2z'),
  plus: P('M8 3v10M3 8h10'),
  library: P('M2.5 9.5l5.5 3 5.5-3M2.5 6.5L8 9.5l5.5-3L8 3.5z'),
  edit: P('M3 13l1-3.5L11 2.5 13.5 5 6.5 12zM9.5 4L12 6.5'),
  pointsMode: P('M3.5 3.5h9v9h-9z') + '<circle cx="3.5" cy="3.5" r="1.8" fill="currentColor"/><circle cx="12.5" cy="3.5" r="1.8" fill="currentColor"/><circle cx="3.5" cy="12.5" r="1.8" fill="currentColor"/><circle cx="12.5" cy="12.5" r="1.8" fill="currentColor"/>',
  edgesMode: P('M3.5 3.5h9v9h-9z') + '<path d="M3.5 12.5h9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  facesMode: '<path d="M3 3h10v10H3z" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  pullout: P('M3 13.5h10M5 13.5V10h6v3.5M8 9V2.5M5.5 5L8 2.5 10.5 5'),
  shrink: P('M2.5 2.5h11v11h-11zM5.5 5.5h5v5h-5z'),
  cut: P('M3 3h10v10H3zM3 8h10') + '<path d="M8 5.2v5.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1 2"/>',
  merge: P('M2.5 3l5 5-5 5M13.5 3l-5 5 5 5'),
  roundoff: P('M5 3h6l2 2v6l-2 2H5l-2-2V5z'),
  mirror: P('M8 2v12M5.5 4.5L2 8l3.5 3.5zM10.5 4.5L14 8l-3.5 3.5z'),
  xray: P('M3 3h10v10H3zM6 6h7v7H6z'),
  play: '<path d="M5 3.2l7.5 4.8L5 12.8z" fill="currentColor"/>',
  pause: '<rect x="4" y="3" width="3" height="10" rx="0.6" fill="currentColor"/><rect x="9" y="3" width="3" height="10" rx="0.6" fill="currentColor"/>',
};

export function icon(name: string, size = 16): HTMLElement {
  const s = document.createElement('span');
  s.className = 'ico';
  s.style.width = s.style.height = `${size}px`;
  s.innerHTML = `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;
  return s;
}

let toastEl: HTMLElement | null = null;
let toastTimer: number | undefined;
export function toast(msg: string, ms = 3200): void {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status' });
    document.body.append(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('show'), ms);
}

export function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function modal(content: HTMLElement, opts: { onClose?: () => void; dismissable?: boolean; wide?: boolean } = {}): () => void {
  const dismissable = opts.dismissable ?? true;
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: `modal${opts.wide ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true' }, content);
  back.append(box);
  const close = () => {
    document.removeEventListener('keydown', key, true);
    back.remove();
    opts.onClose?.();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dismissable) {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', key, true);
  if (dismissable) back.addEventListener('pointerdown', (e) => e.target === back && close());
  document.body.append(back);
  const first = box.querySelector<HTMLElement>('input,button,select');
  first?.focus();
  return close;
}
