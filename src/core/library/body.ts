import type { AssetPart } from '../assets';
import { pivotX, sweep, toPart, ribbon, blob, type Ring } from './organic';
import type { Vec3 } from '../types';

/** Colours for a boot. */
export interface BootColors {
  boot: string;
  sole: string;
  cuff: string;
  laces: string;
  /** Add small studs under the sole (football boots). */
  studs?: string;
}

/**
 * A boot that flows from the shaft into the foot, with a sole under it. Built around the ankle so a tilted kicking
 * foot stays in one piece. `tilt` turns the whole boot about X (toe down is positive).
 */
export function bootParts(step: number, s: 1 | -1, ankle: Vec3, tilt: number, c: BootColors, o: { shaft?: boolean } = {}): AssetPart[] {
  const side = s === 1 ? 'Left' : 'Right';
  const P = pivotX(ankle, tilt);
  const R = (dx: number, dy: number, dz: number, r: number | [number, number]): Ring => ({ p: P([s * dx, dy, dz]), r });
  const parts: AssetPart[] = [];
  const foot = sweep([R(0, -0.12, -0.105, [0.085, 0.075]), R(0, -0.12, -0.01, [0.093, 0.082]), R(0, -0.135, 0.11, [0.092, 0.064]), R(0, -0.145, 0.2, [0.076, 0.05])], { sides: 8, end: 'dome' });
  parts.push(toPart(step, `Boot ${side}`, foot, c.boot));
  const sole = sweep([R(0, -0.185, -0.115, [0.099, 0.02]), R(0, -0.185, 0.0, [0.101, 0.02]), R(0, -0.19, 0.12, [0.098, 0.02]), R(0, -0.195, 0.215, [0.082, 0.018])], { sides: 8, start: 'flat', end: 'dome' });
  parts.push(toPart(step, `Boot Sole ${side}`, sole, c.sole));
  if (o.shaft !== false) {
    const shaft = sweep([R(0, 0.17, -0.005, 0.1), R(0, 0.0, 0.0, 0.098), R(0, -0.11, 0.0, 0.098)], { sides: 8 });
    parts.push(toPart(step, `Boot Shaft ${side}`, shaft, c.boot));
    parts.push(toPart(step, `Boot Cuff ${side}`, sweep([R(0, 0.13, -0.005, 0.108), R(0, 0.185, -0.005, 0.108)], { sides: 8 }), c.cuff));
    const fwd = P([0, 0, 1]).map((v, i) => v - P([0, 0, 0])[i]) as Vec3;
    const lace = ribbon(shaft, [0.12, 0.04, -0.04].map((dy) => ({ from: P([s * 0, dy, 0]), dir: fwd })), [0.03, 0.009], 0.006, { sides: 4 });
    parts.push(toPart(step, `Boot Laces ${side}`, lace, c.laces));
  }
  if (c.studs) {
    for (const [i, dz] of [-0.07, 0.03, 0.14].entries()) {
      parts.push(toPart(step, `Stud ${side} ${i + 1}`, blob(P([s * 0.0, -0.215, dz]), [0.03, 0.02, 0.03], 5), c.studs));
    }
  }
  return parts;
}

/** A short ring around a limb, e.g. a cuff or a sock band. */
export function band2(step: number, name: string, a: Vec3, b: Vec3, r: number, color: string, sides = 8): AssetPart {
  return toPart(step, name, sweep([{ p: a, r }, { p: b, r }], { sides }), color);
}
