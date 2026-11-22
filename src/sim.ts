// Ballistik und Geschütze
import { World, CS, W, Y0, Y1, AIR, WATER } from './world';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r: () => number) {
  let u = 0; while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

export type Side = 'att' | 'def';

export interface GunType {
  key: string;
  name: string;
  info: string;
  ballKg: number;      // Geschossmasse
  diam: number;        // m
  shell: boolean;      // Sprenggeschoss (Mörser)
  k: number;           // v = k * sqrt(Ladung/Kugel)
  chargeMin: number; chargeMax: number; chargeStep: number; chargeDefault: number; // kg Pulver
  burstRatio: number;  // ab diesem Ladungsverhältnis droht Rohrzerspringen
  angMin: number; angMax: number; angDefault: number;
  sigmaAng: number;    // Streuung Grad
  sigmaV: number;      // Streuung Mündungsgeschwindigkeit (Anteil)
  salvo: number;       // Schuss pro Tagessalve
  crew: number;
  barrel: number;      // Rohrlänge m (Darstellung, Mündungsposition)
  ammo: 'kh' | 'mortar' | 'falc' | 'haken';
  invented: boolean;
}

export const TYPES: Record<string, GunType> = {
  halbe: {
    key: 'halbe', name: 'Halbe Kartaune', ammo: 'kh', invented: true,
    info: 'Belagerungsgeschütz, 24-pfündige Eisenkugel (ca. 11 kg, 14 cm), Rohr aus Bronze, über 2 t schwer. Normale Ladung etwa die Hälfte des Kugelgewichts. Eine ganze Kartaune (48 Pfund, über 3 t) schaffte nur 8 bis 10 Schuss am Tag.',
    ballKg: 11.2, diam: 0.14, shell: false, k: 610, chargeMin: 2, chargeMax: 8, chargeStep: 0.25, chargeDefault: 5,
    burstRatio: 0.62, angMin: -3, angMax: 20, angDefault: 1.0, sigmaAng: 0.12, sigmaV: 0.02, salvo: 4, crew: 9, barrel: 3.4,
  },
  moerser: {
    key: 'moerser', name: 'Mörser', ammo: 'mortar', invented: true,
    info: 'Kurzes Steilfeuergeschütz. Wirft hohle Eisenbomben (ca. 30 kg) mit Brandzünder über die Mauern in den Burghof. Gegen dicke Mauern wenig wirksam, aber gefährlich für die Besatzung.',
    ballKg: 30, diam: 0.26, shell: true, k: 520, chargeMin: 0.2, chargeMax: 3, chargeStep: 0.05, chargeDefault: 0.55,
    burstRatio: 0.2, angMin: 45, angMax: 80, angDefault: 70, sigmaAng: 0.8, sigmaV: 0.03, salvo: 2, crew: 6, barrel: 1.0,
  },
  falkonett: {
    key: 'falkonett', name: 'Falkonett', ammo: 'falc', invented: false,
    info: 'Leichtes Geschütz, Kugel etwa 1,5 Pfund (0,7 kg, 5–6 cm). Die Scharten auf Wildenstein waren für Falkonette und Hakenbüchsen ausgelegt (belegt). Zu schwach gegen Erdwerke, gut gegen Bedienungsmannschaften.',
    ballKg: 0.7, diam: 0.056, shell: false, k: 600, chargeMin: 0.15, chargeMax: 0.45, chargeStep: 0.01, chargeDefault: 0.32,
    burstRatio: 0.62, angMin: -8, angMax: 15, angDefault: -2.5, sigmaAng: 0.22, sigmaV: 0.025, salvo: 4, crew: 4, barrel: 2.0,
  },
  haken: {
    key: 'haken', name: 'Doppelhaken', ammo: 'haken', invented: false,
    info: 'Hakenbüchse: schwere Wallbüchse mit Haken zum Auflegen auf die Brüstung, Bleikugel ca. 60 g. Auf große Entfernung ungenau, aber eine ständige Gefahr für Schanzarbeiter.',
    ballKg: 0.06, diam: 0.021, shell: false, k: 0, chargeMin: 0.03, chargeMax: 0.03, chargeStep: 0.01, chargeDefault: 0.03,
    burstRatio: 9, angMin: -8, angMax: 12, angDefault: -2.8, sigmaAng: 0.45, sigmaV: 0.04, salvo: 6, crew: 6, barrel: 1.6,
  },
};

export interface Gun {
  id: number;
  side: Side;
  type: GunType;
  label: string;
  x: number;            // Lafettenposition
  y: number;            // Bodenhöhe
  dir: 1 | -1;          // Schussrichtung
  angle: number;
  charge: number;
  crew: number;
  alive: boolean;
  usedToday: boolean;
  saps: number;
}

export interface Proj {
  x: number; y: number; vx: number; vy: number;
  m: number; d: number; shell: boolean; side: Side; gun: number;
  trail: { x: number; y: number }[];
  t: number; done: boolean;
  passedZones: Set<string>;
}

export const RHO = 1.11; // Luftdichte auf ca. 800 m Höhe
export const G = 9.81;

function cd(v: number) {
  const M = v / 340;
  if (M < 0.6) return 0.47;
  if (M < 1.0) return 0.47 + (M - 0.6) * 1.2;
  if (M < 1.3) return 0.95;
  return 0.95 - (M - 1.3) * 0.1;
}

export function muzzleVelocity(t: GunType, charge: number) {
  if (t.key === 'haken') return 330;
  return t.k * Math.sqrt(charge / t.ballKg);
}

export function muzzle(g: Gun) {
  const a = g.angle * Math.PI / 180;
  const h = g.type.key === 'moerser' ? 0.8 : g.type.key === 'haken' ? 1.3 : 1.25;
  return { x: g.x + g.dir * Math.cos(a) * g.type.barrel * 0.6, y: g.y + h + Math.sin(a) * g.type.barrel * 0.6 };
}

export function makeProj(g: Gun, angle: number, v: number): Proj {
  const a = angle * Math.PI / 180;
  const p = muzzle(g);
  return {
    x: p.x, y: p.y, vx: g.dir * Math.cos(a) * v, vy: Math.sin(a) * v,
    m: g.type.ballKg, d: g.type.diam, shell: g.type.shell, side: g.side, gun: g.id,
    trail: [{ x: p.x, y: p.y }], t: 0, done: false, passedZones: new Set(),
  };
}

// Ein Integrationsschritt (semi-implizit), Wind in m/s (+ = Richtung Burg)
export function stepProj(p: Proj, dt: number, wind: number) {
  const rvx = p.vx - wind, rvy = p.vy;
  const vr = Math.hypot(rvx, rvy);
  const A = Math.PI * p.d * p.d / 4;
  const k = 0.5 * RHO * cd(vr) * A * vr / p.m;
  p.vx -= k * rvx * dt;
  p.vy -= (k * rvy + G) * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.t += dt;
}

// Trajektorie ohne Kollision berechnen (für Zielhilfe und KI): Höhe bei Ziel-x
export function heightAt(g: Gun, angle: number, charge: number, wind: number, tx: number, descending: boolean): number | null {
  const v = muzzleVelocity(g.type, charge);
  const p = makeProj(g, angle, v);
  const dt = 0.01;
  for (let n = 0; n < 6000; n++) {
    const px = p.x, py = p.y;
    stepProj(p, dt, wind);
    if ((px - tx) * (p.x - tx) <= 0) {
      if (descending && p.vy > 0) continue;
      const f = (tx - px) / (p.x - px);
      return py + (p.y - py) * f;
    }
    if (p.y < Y0 || p.x < 0 || p.x > W) return null;
  }
  return null;
}

// Pfad bis zum ersten Aufschlag (für die Zielhilfe-Vorschau, nur kurzes Stück)
export function previewPath(g: Gun, wind: number, len: number) {
  const v = muzzleVelocity(g.type, g.charge);
  const p = makeProj(g, g.angle, v);
  const pts: { x: number; y: number }[] = [];
  const dt = 0.005;
  let dist = 0;
  while (dist < len && pts.length < 4000) {
    const px = p.x, py = p.y;
    stepProj(p, dt, wind);
    dist += Math.hypot(p.x - px, p.y - py);
    pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

export function inBounds(p: Proj) { return p.x > 0 && p.x < W && p.y > Y0 && p.y < Y1 + 200; }

// Raymarch: gibt erste feste Zelle zwischen zwei Punkten zurück
export function firstSolid(w: World, x0: number, y0: number, x1: number, y1: number, skip = -1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(len / (CS * 0.5)));
  for (let s = 1; s <= n; s++) {
    const f = s / n;
    const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
    if (y >= Y1) continue;
    const m = w.at(x, y);
    if (m !== AIR && m !== WATER && m !== skip) return { x, y };
  }
  return null;
}
