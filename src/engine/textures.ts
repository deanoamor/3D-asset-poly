import type { Doc, Picture } from '../core/types';

/** Decoded images of the project's pictures (loaded on demand; the editor draws with them once they are ready). */
const cache = new Map<string, { src: string; img: HTMLImageElement }>();

export const imageOf = (p: Picture | undefined): HTMLImageElement | undefined => {
  if (!p) return undefined;
  const c = cache.get(p.id);
  return c && c.src === p.src ? c.img : undefined;
};

export const pictureOf = (doc: Doc, id: string | undefined): Picture | undefined => (id ? doc.pictures?.find((p) => p.id === id) : undefined);

/** Decode every picture the project uses. Resolves true when something new became available. */
export async function ensureImages(doc: Doc): Promise<boolean> {
  let changed = false;
  await Promise.all(
    (doc.pictures ?? []).map(
      (p) =>
        new Promise<void>((resolve) => {
          if (imageOf(p)) return resolve();
          const img = new Image();
          img.onload = () => {
            cache.set(p.id, { src: p.src, img });
            changed = true;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = p.src;
        }),
    ),
  );
  return changed;
}

const MAX = 128;

/** Shrink a drawn or loaded picture to at most 128 px and store it as a PNG. */
export function makePicture(name: string, source: CanvasImageSource, w: number, h: number): Picture {
  const k = Math.min(1, MAX / Math.max(w, h));
  const W = Math.max(1, Math.round(w * k));
  const H = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(source, 0, 0, W, H);
  const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;
  const pic: Picture = { id, name, src: c.toDataURL('image/png'), w: W, h: H };
  const img = new Image();
  img.src = pic.src;
  img.decode?.().then(() => cache.set(id, { src: pic.src, img })).catch(() => {});
  return pic;
}

export async function pictureFromFile(file: File): Promise<Picture> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return makePicture(file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Picture', img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Ready-made pictures, drawn on demand. */
export const BUILTIN_PICTURES: { id: string; label: string; draw: (g: CanvasRenderingContext2D, s: number, skin?: string) => void }[] = [
  {
    id: 'face',
    label: 'Face',
    draw: (g, s, skin) => {
      g.fillStyle = skin ?? '#f2c9a0';
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#ffffff';
      for (const x of [0.3, 0.7]) {
        g.beginPath();
        g.ellipse(s * x, s * 0.42, s * 0.11, s * 0.13, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#222';
      for (const x of [0.3, 0.7]) {
        g.beginPath();
        g.arc(s * x, s * 0.44, s * 0.055, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#7a3b2e';
      g.lineWidth = s * 0.04;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(s * 0.5, s * 0.62, s * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    },
  },
  {
    id: 'stripes',
    label: 'Stripes',
    draw: (g, s) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#ffffff' : '#2b4c7e';
        g.fillRect(0, (s / 8) * i, s, s / 8);
      }
    },
  },
  {
    id: 'checker',
    label: 'Checker',
    draw: (g, s) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#f4f4f0' : '#222222';
        g.fillRect((s / 8) * x, (s / 8) * y, s / 8, s / 8);
      }
    },
  },
  {
    id: 'star',
    label: 'Star badge',
    draw: (g, s) => {
      g.fillStyle = '#1d3557';
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#ffd166';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.18 : s * 0.4;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
    },
  },
];

export function builtinPicture(id: string, skin?: string): Picture | null {
  const b = BUILTIN_PICTURES.find((x) => x.id === id);
  if (!b) return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  b.draw(c.getContext('2d')!, 128, skin);
  return makePicture(b.label, c, 128, 128);
}
