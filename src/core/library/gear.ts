import type { Vec3 } from '../types';
import type { BodyContext } from './humanoid';
import type { CharPartSpec } from '../charspec';

/**
 * Ready-made gear, sized and placed from the body it is for (so a cape starts at the shoulders and a staff sits in the
 * fist). Everything comes back as ordinary spec parts: change or replace any of them by name afterwards.
 */
export type GearType = 'cape' | 'backpack' | 'belt' | 'sword' | 'shield' | 'staff' | 'witch-hat' | 'cap' | 'helmet' | 'scarf';

export interface GearSpec {
  type: GearType;
  color?: string;
  /** A second colour for trim (a buckle, an orb, a hat band, a crest). */
  color2?: string;
  /** Which side a held or worn item is on (default: sword left hip, shield left arm, staff right hand). */
  side?: 'left' | 'right';
}

export const GEAR_TYPES: GearType[] = ['cape', 'backpack', 'belt', 'sword', 'shield', 'staff', 'witch-hat', 'cap', 'helmet', 'scarf'];

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const r4 = (v: Vec3): Vec3 => v.map((x) => Math.round(x * 1e4) / 1e4) as Vec3;
const sx = (s: 'left' | 'right') => (s === 'left' ? 1 : -1);

export function gearParts(g: GearSpec, c: BodyContext): CharPartSpec[] {
  const { H, J, headCenter: hc, headRadii: hr } = c;
  const col = g.color;
  const trim = g.color2;
  switch (g.type) {
    case 'cape': {
      const z = c.torsoDepth + 0.01;
      const w = c.shoulder * 0.95;
      return [{
        name: 'Cape', kind: 'sweep', color: col ?? '#a93226', sides: 6,
        rings: [
          { p: r4([0, J.shoulder[1] + 0.02 * H, -z * 0.9]), r: [w * 0.75, 0.018 * H] },
          { p: r4([0, J.chest[1], -z - 0.03 * H]), r: [w * 1.05, 0.018 * H] },
          { p: r4([0, J.hips[1], -z - 0.06 * H]), r: [w * 1.15, 0.018 * H] },
          { p: r4([0, J.knee[1], -z - 0.08 * H]), r: [w * 1.3, 0.018 * H] },
        ],
      }];
    }
    case 'backpack': {
      const y = J.chest[1] - 0.02 * H;
      const d = 0.075 * H;
      return [
        { name: 'Backpack', kind: 'box', color: col ?? '#7a5230', pos: r4([0, y, -c.torsoDepth - d / 2 + 0.01]), size: r4([c.shoulder * 1.15, 0.17 * H, d]), smooth: true },
        { name: 'Backpack Flap', kind: 'box', color: trim ?? '#5a3a22', pos: r4([0, y + 0.07 * H, -c.torsoDepth - d / 2 + 0.005]), size: r4([c.shoulder * 1.2, 0.05 * H, d + 0.01]) },
        { name: 'Backpack Strap Left', kind: 'box', color: trim ?? '#5a3a22', pos: r4([c.shoulder * 0.45, y + 0.04 * H, 0.002]), size: r4([0.03 * H, 0.2 * H, c.torsoDepth * 2 + 0.01]), mirror: true },
      ];
    }
    case 'belt': {
      const y = J.hips[1] + 0.045 * H;
      const rx = c.hipRx * 1.0;
      const rz = c.torsoDepth * 1.16;
      return [
        { name: 'Belt', kind: 'sweep', color: col ?? '#5a3a22', sides: 8, rings: [{ p: r4([0, y - 0.018 * H, 0]), r: [rx, rz] }, { p: r4([0, y + 0.018 * H, 0]), r: [rx, rz] }] },
        { name: 'Buckle', kind: 'box', color: trim ?? '#f2c14e', pos: r4([0, y, rz]), size: r4([0.04 * H, 0.04 * H, 0.012 * H]) },
      ];
    }
    case 'sword': {
      const s = sx(g.side ?? 'left');
      const top = J.hips[1] + 0.05 * H;
      const len = Math.min(0.4 * H, top - 0.06 * H); // never reaches the floor, even on short legs
      const x = s * (c.hipRx * 1.02 + 0.02);
      return [
        { name: `Scabbard ${s === 1 ? 'Left' : 'Right'}`, kind: 'box', color: col ?? '#5a3a22', pos: r4([x, top - len / 2, -0.01]), size: r4([0.03 * H, len, 0.03 * H]) },
        { name: `Sword Guard ${s === 1 ? 'Left' : 'Right'}`, kind: 'box', color: trim ?? '#f2c14e', pos: r4([x, top + 0.012 * H, -0.01]), size: r4([0.085 * H, 0.016 * H, 0.03 * H]) },
        { name: `Sword Grip ${s === 1 ? 'Left' : 'Right'}`, kind: 'cylinder', color: '#3b2a1c', pos: r4([x, top + 0.052 * H, -0.01]), size: r4([0.02 * H, 0.07 * H, 0.02 * H]), segments: 6 },
        { name: `Sword Pommel ${s === 1 ? 'Left' : 'Right'}`, kind: 'sphere', color: trim ?? '#f2c14e', pos: r4([x, top + 0.092 * H, -0.01]), size: r4([0.03 * H, 0.03 * H, 0.03 * H]), segments: 6 },
      ];
    }
    case 'shield': {
      const s = sx(g.side ?? 'left');
      const el = s === 1 ? J.elbow : ([-J.elbow[0], J.elbow[1], J.elbow[2]] as Vec3);
      const wr = s === 1 ? J.wrist : ([-J.wrist[0], J.wrist[1], J.wrist[2]] as Vec3);
      const mid = lerp(el, wr, 0.35);
      const d = 0.24 * H;
      const side = s === 1 ? 'Left' : 'Right';
      return [
        { name: `Shield ${side}`, kind: 'cylinder', color: col ?? '#a93226', pos: r4([mid[0] + s * 0.05 * H, mid[1], mid[2] + 0.03 * H]), size: r4([d, 0.022 * H, d]), rot: [0, 0, 90], segments: 10 },
        { name: `Shield Boss ${side}`, kind: 'sphere', color: trim ?? '#f2c14e', pos: r4([mid[0] + s * 0.065 * H, mid[1], mid[2] + 0.03 * H]), size: r4([0.07 * H, 0.07 * H, 0.07 * H]), segments: 6 },
      ];
    }
    case 'staff': {
      const s = sx(g.side ?? 'right');
      const f = s === 1 ? c.hand.left : c.hand.right;
      const top = H * 1.04;
      const side = s === 1 ? 'Left' : 'Right';
      return [
        { name: `Staff ${side}`, kind: 'cylinder', color: col ?? '#7a5230', pos: r4([f[0], top / 2, f[2]]), size: r4([0.024 * H, top, 0.024 * H]), segments: 6 },
        { name: `Staff Orb ${side}`, kind: 'sphere', color: trim ?? '#7fd6ff', pos: r4([f[0], top + 0.01 * H, f[2]]), size: r4([0.08 * H, 0.08 * H, 0.08 * H]), segments: 7, mat: { glow: 0.6, rough: 0.3 } },
      ];
    }
    case 'witch-hat': {
      const brimY = hc[1] + hr[1] * 0.62;
      const bw = hr[0] * 2 * 2.5;
      return [
        { name: 'Hat Brim', kind: 'cylinder', color: col ?? '#2a1a4a', pos: r4([0, brimY, hc[2] - 0.01]), size: r4([bw, 0.014 * H, bw]), segments: 10 },
        { name: 'Hat Cone', kind: 'cone', color: col ?? '#2a1a4a', pos: r4([0, brimY + hr[1] * 1.0, hc[2] - 0.02]), size: r4([hr[0] * 2 * 1.35, hr[1] * 2 * 1.0, hr[2] * 2 * 1.3]), segments: 9 },
        { name: 'Hat Band', kind: 'cylinder', color: trim ?? '#f2c14e', pos: r4([0, brimY + hr[1] * 0.12, hc[2] - 0.012]), size: r4([hr[0] * 2 * 1.32, 0.03 * H, hr[2] * 2 * 1.28]), segments: 10 },
      ];
    }
    case 'cap': {
      const y = hc[1] + hr[1] * 0.25;
      return [
        { name: 'Cap', kind: 'blob', color: col ?? '#c0392b', center: r4([0, y, hc[2] - 0.01]), radii: r4([hr[0] * 1.07, hr[1] * 0.85, hr[2] * 1.08]), segments: 9, smooth: true },
        { name: 'Cap Brim', kind: 'box', color: trim ?? col ?? '#c0392b', pos: r4([0, hc[1] + hr[1] * 0.5, hc[2] + hr[2] * 1.05]), size: r4([hr[0] * 1.6, 0.012 * H, hr[2] * 0.9]), rot: [8, 0, 0] },
      ];
    }
    case 'helmet': {
      return [
        { name: 'Helmet', kind: 'blob', color: col ?? '#9aa4b0', center: r4([0, hc[1] + hr[1] * 0.38, hc[2] - 0.005]), radii: r4([hr[0] * 1.08, hr[1] * 0.7, hr[2] * 1.1]), segments: 9, smooth: true },
        { name: 'Helmet Rim', kind: 'sweep', color: '#7d8793', sides: 10, rings: [{ p: r4([0, hc[1] + hr[1] * 0.45, hc[2] - 0.005]), r: [hr[0] * 1.09, hr[2] * 1.12] }, { p: r4([0, hc[1] + hr[1] * 0.58, hc[2] - 0.005]), r: [hr[0] * 1.09, hr[2] * 1.12] }] },
        { name: 'Nose Guard', kind: 'box', color: '#7d8793', pos: r4([0, hc[1] + hr[1] * 0.2, hc[2] + hr[2] * 1.0]), size: r4([0.012 * H, 0.026 * H, 0.01 * H]) },
        { name: 'Crest', kind: 'box', color: trim ?? '#c0392b', pos: r4([0, hc[1] + hr[1] * 1.12, hc[2] - 0.01]), size: r4([0.025 * H, 0.05 * H, hr[2] * 2.1]) },
      ];
    }
    case 'scarf': {
      const y = J.neck[1] + 0.005 * H;
      const r = 0.05 * H;
      return [
        { name: 'Scarf', kind: 'sweep', color: col ?? '#e67e22', sides: 8, rings: [{ p: r4([0, y - 0.02 * H, 0.01]), r: [r * 1.35, r * 1.2] }, { p: r4([0, y + 0.02 * H, 0.01]), r: [r * 1.25, r * 1.1] }] },
        { name: 'Scarf Tail', kind: 'box', color: col ?? '#e67e22', pos: r4([-r * 0.9, y - 0.08 * H, c.torsoDepth + 0.012]), size: r4([0.04 * H, 0.14 * H, 0.012 * H]), rot: [0, 0, 6] },
      ];
    }
  }
}
