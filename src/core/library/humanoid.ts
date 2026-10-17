import type { AssetPart } from '../assets';
import type { Vec3 } from '../types';
import { blob, faceOn, headBlob, sweep, toPart, type Ring } from './organic';
import { HUMAN, type BodyJoints } from './rigs';

/**
 * A person template: proportions, body, clothes, face and a skeleton that fits. Faces +Z, "Left" is +X, feet on y = 0.
 * Everything is built from the same helpers the ready-made characters use, so a character starts from a good base and
 * only needs the details that make it unique (clothes, hair, gear).
 */
export interface HumanParams {
  kind?: 'human';
  /** Total height in metres (default 1.8). */
  height?: number;
  /** How the body is drawn. stylized = big head, friendly (default); realistic = 7.5 heads tall; heroic = tall with wide shoulders; chibi = huge head; kid = child. */
  build?: 'stylized' | 'realistic' | 'heroic' | 'chibi' | 'kid';
  weight?: 'slim' | 'normal' | 'heavy';
  skin?: string;
  hair?: string;
  hairStyle?: 'none' | 'short' | 'long' | 'bun';
  eyes?: string;
  top?: string;
  bottom?: string;
  shoes?: string;
  sleeves?: 'none' | 'short' | 'long';
  legs?: 'long' | 'shorts';
  /** Eyes, brows, nose, mouth, ears, cheeks (default true). */
  face?: boolean;
  /** Add the Blink, Smile and Surprised expressions (default true when there is a face). */
  expressions?: boolean;
}

const BUILD: Record<NonNullable<HumanParams['build']>, { heads: number; legs: number; shoulder: number; width: number; arm: number }> = {
  realistic: { heads: 7.5, legs: 0.49, shoulder: 0.118, width: 1, arm: 1 },
  stylized: { heads: 5.2, legs: 0.42, shoulder: 0.14, width: 1.1, arm: 0.95 },
  heroic: { heads: 8, legs: 0.5, shoulder: 0.15, width: 1.15, arm: 1.05 },
  chibi: { heads: 3.2, legs: 0.3, shoulder: 0.17, width: 1.15, arm: 0.8 },
  kid: { heads: 4.5, legs: 0.4, shoulder: 0.14, width: 0.95, arm: 0.85 },
};

const r3 = (v: Vec3): Vec3 => v.map((x) => Math.round(x * 1e4) / 1e4) as Vec3;

/** The skeleton positions for these proportions (also used to size the body). */
export function humanJoints(p: HumanParams = {}): BodyJoints {
  const H = p.height ?? 1.8;
  const b = BUILD[p.build ?? 'stylized'];
  const headH = H / b.heads;
  const chin = H - headH;
  const hipY = b.legs * H;
  const hipsY = hipY + 0.03 * H;
  const shoulderY = chin - 0.45 * headH - (p.build === 'chibi' ? 0.05 * headH : 0);
  const chestY = hipsY + (shoulderY - hipsY) * 0.72;
  const sx = b.shoulder * H;
  const ankleY = 0.05 * H;
  const kneeY = ankleY + (hipY - ankleY) * 0.5;
  const arm = b.arm * H;
  const upper = 0.175 * arm;
  const fore = 0.15 * arm;
  const hand = 0.085 * arm;
  const elbowY = shoulderY - upper;
  const wristY = elbowY - fore;
  const hx = 0.058 * H * b.width;
  return {
    hips: r3([0, hipsY, 0]),
    spine: r3([0, hipsY + (chestY - hipsY) * 0.5, 0.004]),
    chest: r3([0, chestY, 0.01]),
    neck: r3([0, chin + 0.08 * headH, 0.012]),
    head: r3([0, chin + 0.16 * headH, 0.014]),
    headTop: r3([0, H, 0.014]),
    shoulder: r3([sx, shoulderY, 0.01]),
    elbow: r3([sx + 0.025 * H, elbowY, 0.02]),
    wrist: r3([sx + 0.04 * H, wristY, 0.05]),
    fingers: r3([sx + 0.042 * H, wristY - hand, 0.065]),
    hip: r3([hx, hipY, 0]),
    knee: r3([hx + 0.004 * H, kneeY, 0.012 * H]),
    ankle: r3([hx + 0.002 * H, ankleY, 0]),
    toe: r3([hx + 0.002 * H, 0.025 * H, 0.1 * H]),
  };
}

export interface HumanBuild {
  parts: AssetPart[];
  joints: BodyJoints;
  /** Expressions by part name: the new pos / size of the parts they change (absolute, as built). */
  expressions: { name: string; parts: Record<string, { pos?: Vec3; size?: Vec3 }> }[];
}

const mirror = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const darken = (hex: string, k: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};

export function humanoid(p: HumanParams = {}): HumanBuild {
  const H = p.height ?? 1.8;
  const bk = BUILD[p.build ?? 'stylized'];
  const J = humanJoints(p);
  const wt = p.weight === 'slim' ? 0.85 : p.weight === 'heavy' ? 1.3 : 1;
  const W = bk.width * wt;
  const skin = p.skin ?? '#e8b894';
  const skinD = darken(skin, 0.86);
  const hairC = p.hair ?? '#3a2a20';
  const top = p.top ?? '#4a78c2';
  const bottom = p.bottom ?? '#3b4252';
  const shoes = p.shoes ?? '#2b2b30';
  const sleeves = p.sleeves ?? 'short';
  const legs = p.legs ?? 'long';
  const headH = H / bk.heads;
  const parts: AssetPart[] = [];
  const add = (...a: AssetPart[]) => parts.push(...a);
  const R = (pt: Vec3, r: number | [number, number]): Ring => ({ p: pt, r });

  // ----- torso (top), hips (bottom) -----
  const sh = J.shoulder[0];
  const waistY = J.hips[1] + (J.chest[1] - J.hips[1]) * 0.32;
  const rz = 0.058 * H * W;
  const hipRx = J.hip[0] * 1.9;
  const torso = sweep([
    R([0, waistY - 0.02 * H, 0], [hipRx * 0.92, rz * 1.02]),
    R([0, waistY, 0.004], [sh * 0.78 * W, rz * 1.0]),
    R([0, J.chest[1], 0.01], [sh * 0.98 * W, rz * 1.1]),
    R([0, J.shoulder[1] + 0.005 * H, 0.008], [sh * 1.02, rz * 1.02]),
    R([0, J.neck[1] - 0.005 * H, 0.012], [sh * 0.42, rz * 0.7]),
  ], { sides: 8, start: 'flat', end: 'flat' });
  add(toPart(1, 'Torso', torso, top));
  const pelvis = sweep([R([0, J.hip[1] - 0.045 * H, 0], [hipRx * 0.96, rz * 1.05]), R([0, J.hips[1] + 0.02 * H, 0], [hipRx, rz * 1.08]), R([0, waistY, 0.004], [sh * 0.8 * W, rz * 1.02])], { sides: 8 });
  add(toPart(1, 'Hips', pelvis, bottom));

  // ----- neck and head -----
  const hc: Vec3 = [0, J.head[1] + 0.34 * headH, 0.014 + 0.012 * H];
  const hr: Vec3 = [headH * 0.44, headH * 0.5, headH * 0.46];
  add(toPart(2, 'Neck', sweep([R([0, J.neck[1] - 0.04 * headH, 0.01], 0.4 * sh * 0.5 * W + 0.01), R([0, J.neck[1] + 0.3 * headH, 0.014], 0.36 * sh * 0.5 * W + 0.01)], { sides: 7 }), skin));
  const head = headBlob(hc, hr, 12);
  add(toPart(2, 'Head', head, skin, { smooth: true }));

  // ----- arms -----
  const armR = (k: number) => 0.033 * H * W * k;
  for (const s of [1, -1] as const) {
    const side = s === 1 ? 'Left' : 'Right';
    const m = (v: Vec3): Vec3 => (s === 1 ? v : mirror(v));
    const sp = m(J.shoulder), el = m(J.elbow), wr = m(J.wrist), fi = m(J.fingers);
    const sleeveEnd = sleeves === 'long' ? 1 : 0.38;
    const armPath: Ring[] = [R(lerp(sp, el, -0.05), armR(1.15)), R(lerp(sp, el, 0.5), armR(1.0)), R(el, armR(0.88)), R(lerp(el, wr, 0.5), armR(0.8)), R(wr, armR(0.66))];
    add(toPart(3, `Arm ${side}`, sweep(armPath, { sides: 7, start: 'dome', end: 'flat' }), skin));
    if (sleeves !== 'none') {
      const pts: Ring[] = [R(lerp(sp, el, -0.08), armR(1.34)), R(lerp(sp, el, 0.5), armR(1.17))];
      if (sleeves === 'long') pts.push(R(el, armR(1.04)), R(lerp(el, wr, 0.55), armR(0.95)), R(lerp(el, wr, 0.92), armR(0.84)));
      else pts.push(R(lerp(sp, el, Math.min(1, sleeveEnd + 0.2)), armR(1.12)));
      add(toPart(3, `Sleeve ${side}`, sweep(pts, { sides: 7, start: 'dome', end: 'flat' }), top));
    }
    const hand = blob(lerp(wr, fi, 0.55), [0.026 * H * W, 0.045 * H * bk.arm, 0.024 * H * W], 7);
    add(toPart(3, `Hand ${side}`, hand, skin, { smooth: true }));
  }

  // ----- legs and shoes -----
  const legR = (k: number) => 0.044 * H * W * k;
  for (const s of [1, -1] as const) {
    const side = s === 1 ? 'Left' : 'Right';
    const m = (v: Vec3): Vec3 => (s === 1 ? v : mirror(v));
    const hp = m(J.hip), kn = m(J.knee), an = m(J.ankle), to = m(J.toe);
    const legPath: Ring[] = [R(lerp(hp, kn, -0.1), legR(1.05)), R(lerp(hp, kn, 0.5), legR(0.95)), R(kn, legR(0.78)), R(lerp(kn, an, 0.4), legR(0.7)), R(lerp(kn, an, 0.9), legR(0.5))];
    const full = legs === 'long';
    add(toPart(4, `Leg ${side}`, sweep(legPath, { sides: 7, start: 'flat', end: 'flat' }), full ? bottom : skin));
    if (!full) {
      const pts: Ring[] = [R(lerp(hp, kn, -0.1), legR(1.18)), R(lerp(hp, kn, 0.5), legR(1.1)), R(lerp(hp, kn, 0.78), legR(1.02))];
      add(toPart(4, `Shorts ${side}`, sweep(pts, { sides: 7 }), bottom));
    }
    const shoeW = 0.036 * H * W;
    const shoe = sweep([
      R([an[0], an[1] - 0.012 * H, an[2] - 0.045 * H], [shoeW * 0.95, 0.036 * H]),
      R([an[0], an[1] - 0.02 * H, an[2] + 0.012 * H], [shoeW * 1.05, 0.038 * H]),
      R([an[0], to[1] + 0.004 * H, to[2] - 0.03 * H], [shoeW * 1.05, 0.028 * H]),
      R([an[0], to[1], to[2]], [shoeW * 0.8, 0.02 * H]),
    ], { sides: 7, start: 'flat', end: 'dome' });
    add(toPart(4, `Shoe ${side}`, shoe, shoes, { smooth: true }));
  }

  // ----- hair -----
  const style = p.hairStyle ?? 'short';
  if (style !== 'none') {
    add(toPart(5, 'Hair', blob([hc[0], hc[1] + 0.3 * hr[1], hc[2] - 0.2 * hr[2]], [hr[0] * 1.07, hr[1] * 0.78, hr[2] * 1.1], 9), hairC, { smooth: true }));
    if (style === 'long') {
      add(toPart(5, 'Hair Back', sweep([R([0, hc[1] + 0.1 * hr[1], hc[2] - 0.75 * hr[2]], [hr[0] * 0.95, hr[2] * 0.3]), R([0, hc[1] - 0.8 * hr[1], hc[2] - 0.78 * hr[2]], [hr[0] * 0.95, hr[2] * 0.28]), R([0, J.shoulder[1] - 0.02 * H, hc[2] - 0.7 * hr[2]], [hr[0] * 0.85, hr[2] * 0.22])], { sides: 7, end: 'dome' }), hairC));
    }
    if (style === 'bun') add(toPart(5, 'Hair Bun', blob([hc[0], hc[1] + 0.98 * hr[1], hc[2] - 0.45 * hr[2]], [hr[0] * 0.38, hr[0] * 0.38, hr[0] * 0.38], 7), hairC, { smooth: true }));
  }

  // ----- face -----
  const expressions: HumanBuild['expressions'] = [];
  if (p.face !== false) {
    const sc = headH / 0.49;
    const face = faceOn(6, head, hc, { skin, skinDark: skinD, brow: darken(hairC, 0.9), iris: p.eyes ?? '#5a3d28', eye: Math.max(0.6, sc * 1.05), sep: 0.43 });
    add(...face);
    if (p.expressions !== false) {
      const by = (n: string) => parts.find((q) => q.name === n);
      const blink: Record<string, { pos?: Vec3; size?: Vec3 }> = {};
      for (const n of ['Eye White', 'Iris', 'Pupil', 'Eye Highlight']) for (const side of ['Left', 'Right']) {
        const q = by(`${n} ${side}`);
        if (q) blink[q.name] = { size: r3([q.size[0], q.size[1] * 0.12, q.size[2]]) };
      }
      expressions.push({ name: 'Blink', parts: blink });
      const mouth = by('Mouth');
      if (mouth) {
        expressions.push({ name: 'Smile', parts: { Mouth: { pos: r3([mouth.pos[0], mouth.pos[1] + 0.004 * H, mouth.pos[2]]), size: r3([mouth.size[0] * 1.35, mouth.size[1] * 1.6, mouth.size[2]]) } } });
        const sur: Record<string, { pos?: Vec3; size?: Vec3 }> = { Mouth: { size: r3([mouth.size[0] * 0.6, mouth.size[1] * 4.5, mouth.size[2]]) } };
        for (const side of ['Left', 'Right']) {
          const b = by(`Eyebrow ${side}`);
          if (b) sur[b.name] = { pos: r3([b.pos[0], b.pos[1] + 0.012 * H, b.pos[2]]) };
        }
        expressions.push({ name: 'Surprised', parts: sur });
      }
    }
  }
  void HUMAN;
  return { parts, joints: J, expressions };
}
