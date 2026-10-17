import * as THREE from 'three';
import type { Picture } from '../core/types';
import { layoutAtlas, planarUV, type Placed } from '../core/uvmap';
import { imageOf } from './textures';

const CELL = 8;
const PAD = 2;

export interface AtlasItems {
  /** Solid colours (hex), each gets a small cell. */
  colors: Set<string>;
  /** Pictures, each gets its own rectangle. */
  pictures: Map<string, Picture>;
}

export interface Atlas {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  width: number;
  height: number;
  /** Where each solid colour's cell is, and each picture's rectangle (pixels, y down). */
  cells: Map<string, Placed>;
  rects: Map<string, Placed>;
}

/** Draw every colour and picture into ONE image, so a whole model can share a single material. */
export function buildAtlas(items: AtlasItems): Atlas {
  const slots = [
    ...[...items.colors].map((c) => ({ key: `c:${c}`, w: CELL, h: CELL })),
    ...[...items.pictures.values()].filter((p) => imageOf(p)).map((p) => ({ key: `p:${p.id}`, w: p.w, h: p.h })),
  ];
  if (!slots.length) slots.push({ key: 'c:#ffffff', w: CELL, h: CELL });
  const { width, height, placed } = layoutAtlas(slots, PAD);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const cells = new Map<string, Placed>();
  const rects = new Map<string, Placed>();
  for (const [key, r] of placed) {
    if (key.startsWith('c:')) {
      const hex = key.slice(2);
      g.fillStyle = hex;
      g.fillRect(r.x - PAD, r.y - PAD, r.w + 2 * PAD, r.h + 2 * PAD);
      cells.set(hex, r);
    } else {
      const id = key.slice(2);
      const p = items.pictures.get(id)!;
      const img = imageOf(p)!;
      g.drawImage(img, r.x, r.y, r.w, r.h);
      // extend the edge pixels outwards so smooth filtering never reaches the neighbour
      g.drawImage(img, 0, 0, 1, p.h, r.x - PAD, r.y, PAD, r.h);
      g.drawImage(img, p.w - 1, 0, 1, p.h, r.x + r.w, r.y, PAD, r.h);
      g.drawImage(img, 0, 0, p.w, 1, r.x, r.y - PAD, r.w, PAD);
      g.drawImage(img, 0, p.h - 1, p.w, 1, r.x, r.y + r.h, r.w, PAD);
      g.drawImage(img, 0, 0, 1, 1, r.x - PAD, r.y - PAD, PAD, PAD);
      g.drawImage(img, p.w - 1, 0, 1, 1, r.x + r.w, r.y - PAD, PAD, PAD);
      g.drawImage(img, 0, p.h - 1, 1, 1, r.x - PAD, r.y + r.h, PAD, PAD);
      g.drawImage(img, p.w - 1, p.h - 1, 1, 1, r.x + r.w, r.y + r.h, PAD, PAD);
      rects.set(id, r);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture, width, height, cells, rects };
}

/**
 * A copy of `base` (a shape's geometry) whose UVs point into the atlas: sides that wear the picture show it, all other
 * points sample the middle of the colour's cell. With no picture the whole shape is one colour cell.
 */
export function remapGeometry(base: THREE.BufferGeometry, atlas: Atlas, color: string, pic?: Picture, mode: 'all' | 'front' = 'all'): THREE.BufferGeometry {
  const g = base.clone();
  g.deleteAttribute('color'); // the picture or the colour cell carries the colour
  const n = g.getAttribute('position').count;
  const cell = atlas.cells.get(color);
  const cu = cell ? (cell.x + cell.w / 2) / atlas.width : 0.5;
  const cv = cell ? 1 - (cell.y + cell.h / 2) / atlas.height : 0.5;
  const out = new Float32Array(n * 2);
  const rect = pic ? atlas.rects.get(pic.id) : undefined;
  const proj = rect ? planarUV(g, mode) : null;
  for (let i = 0; i < n; i++) {
    if (rect && proj && proj.onImage[i]) {
      out[i * 2] = (rect.x + proj.uv[i * 2] * rect.w) / atlas.width;
      out[i * 2 + 1] = 1 - (rect.y + (1 - proj.uv[i * 2 + 1]) * rect.h) / atlas.height;
    } else {
      out[i * 2] = cu;
      out[i * 2 + 1] = cv;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(out, 2));
  return g;
}
