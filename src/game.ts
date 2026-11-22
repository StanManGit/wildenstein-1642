// Spielregeln, Befehle, KI. Alle Zustandsänderungen laufen über dispatch(Befehl),
// alle Zufallswerte über einen gesäten Zufallsgenerator. Damit lässt sich später
// ein Online-Duell bauen, bei dem nur die Befehle übertragen werden.
import { World, W, GABION, FILL, CS } from './world';
import { TYPES, Gun, Proj, Side, mulberry32, gauss, muzzleVelocity, makeProj, stepProj, firstSolid, heightAt, inBounds } from './sim';

export type Cmd =
  | { t: 'fire'; gun: number; angle: number; charge: number }
  | { t: 'sap'; gun: number }
  | { t: 'fill' }
  | { t: 'repair' }
  | { t: 'storm' }
  | { t: 'offer' }
  | { t: 'answer'; accept: boolean }
  | { t: 'end' };

export type Controller = 'human' | 'ai';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: 'smoke' | 'dust' | 'chunk' | 'flash' | 'fire'; r: number; c: string }

export interface Zone { key: string; x0: number; x1: number; y0: number; y1: number; p: number }

const DEF_ZONES: Zone[] = [
  { key: 'wall', x0: 445, x1: 451, y0: 812, y1: 814.5, p: 0.2 },
  { key: 'vorburg', x0: 448, x1: 478, y0: 800, y1: 806, p: 0.1 },
  { key: 'bastion', x0: 501.7, x1: 521, y0: 801, y1: 819.5, p: 0.15 },
  { key: 'platform', x0: 498, x1: 523, y0: 822, y1: 824.5, p: 0.2 },
  { key: 'turm', x0: 524.5, x1: 531.5, y0: 801, y1: 836, p: 0.15 },
  { key: 'palas', x0: 534.5, x1: 554.5, y0: 800.5, y1: 817, p: 0.2 },
];

export interface Report { lines: string[] }

export interface GameEvents {
  log(msg: string, kind?: 'info' | 'good' | 'bad'): void;
  boom(size: number, x: number): void;
  changed(): void;
}

export class Game {
  rnd: () => number;
  seed: number;
  w: World;
  day = 1;
  phase: 'att' | 'def' | 'over' = 'att';
  stage = 0;
  wind = 0;
  rain = false;
  att = { men: 700, morale: 70, powder: 1400, balls: 360, shells: 70 };
  def = { men: 45, morale: 75, powder: 160, falc: 220 };
  guns: Gun[] = [];
  today = { defCas: 0, attCas: 0, inside: 0, repaired: false, filled: false, stormed: false, offered: false };
  pendingOffer = false;
  ctrl: Record<Side, Controller>;
  winner: Side | null = null;
  endText = '';
  projs: Proj[] = [];
  parts: Particle[] = [];
  impacts: { gun: number; x: number; y: number; day: number }[] = [];
  history: Cmd[] = [];
  busy = false;
  ev: GameEvents;
  private waiters: (() => void)[] = [];
  private queue: { at: number; fn: () => void }[] = [];
  time = 0;

  constructor(seed: number, ctrl: Record<Side, Controller>, ev: GameEvents) {
    this.seed = seed;
    this.rnd = mulberry32(seed);
    this.ctrl = ctrl;
    this.ev = ev;
    this.w = new World(this.rnd);
    const mk = (side: Side, key: string, label: string, x: number, y: number, portX?: number): Gun => {
      const t = TYPES[key];
      const g: Gun = { id: this.guns.length, side, type: t, label, x, y, dir: side === 'att' ? 1 : -1, angle: t.angDefault, charge: t.chargeDefault, crew: t.crew, alive: true, usedToday: false, saps: 0 };
      (g as any).portX = portX;
      this.guns.push(g);
      return g;
    };
    const a1 = mk('att', 'halbe', 'Halbe Kartaune „Löwe“', 170, 0);
    const a2 = mk('att', 'halbe', 'Halbe Kartaune „Greif“', 188, 0);
    const a3 = mk('att', 'moerser', 'Mörser „Bär“', 150, 0);
    for (const g of [a1, a2, a3]) { g.y = this.w.surfaceBelow(g.x, 830); this.buildGabion(g); }
    mk('def', 'falkonett', 'Falkonett auf der Schildmauer', 445.9, 812, 444.9);
    mk('def', 'falkonett', 'Falkonett in der Bastion', 502.6, 816, 497.9);
    mk('def', 'haken', 'Doppelhaken auf der Bastion', 500.2, 822, 497.9);
    this.newWeather();
  }

  buildGabion(g: Gun) {
    const h = g.type.shell ? 2.0 : 1.0;
    const x0 = g.x + 3.5;
    this.w.rect(x0, x0 + 2, g.y, g.y + h, GABION);
  }

  newWeather() {
    this.wind = Math.max(-9, Math.min(9, this.wind * 0.5 + gauss(this.rnd) * 3.2));
    this.wind = Math.round(this.wind * 2) / 2;
    this.rain = this.rnd() < 0.18;
  }

  side(): Side { return this.phase === 'def' ? 'def' : 'att'; }
  gunsOf(s: Side) { return this.guns.filter(g => g.side === s); }

  wait(): Promise<void> { return new Promise(r => this.waiters.push(r)); }
  after(sec: number, fn: () => void) { this.queue.push({ at: this.time + sec, fn }); }

  // ---------- Befehle ----------
  async dispatch(c: Cmd): Promise<void> {
    if (this.phase === 'over' || this.busy) return;
    this.history.push(c);
    this.busy = true;
    this.ev.changed();
    try {
      switch (c.t) {
        case 'fire': await this.fire(c.gun, c.angle, c.charge); break;
        case 'sap': this.sap(c.gun); break;
        case 'fill': this.fillDitch(); break;
        case 'repair': this.repair(); break;
        case 'storm': this.storm(); break;
        case 'offer': this.offer(); break;
        case 'answer': this.answer(c.accept); break;
        case 'end': this.endPhase(); break;
      }
      this.checkEnd();
    } finally {
      this.busy = false;
      this.ev.changed();
    }
  }

  canFire(g: Gun) {
    if (!g.alive || g.usedToday || g.crew < 2 || g.side !== this.side() || this.phase === 'over') return false;
    const t = g.type;
    if (g.side === 'att') {
      if (this.att.powder < g.charge) return false;
      if (t.ammo === 'kh' && this.att.balls <= 0) return false;
      if (t.ammo === 'mortar' && this.att.shells <= 0) return false;
    } else {
      if (this.def.powder < g.charge) return false;
      if (t.ammo === 'falc' && this.def.falc <= 0) return false;
    }
    return true;
  }

  async fire(id: number, angle: number, charge: number) {
    const g = this.guns[id];
    const t = g.type;
    g.angle = Math.max(t.angMin, Math.min(t.angMax, angle));
    g.charge = Math.max(t.chargeMin, Math.min(t.chargeMax, charge));
    if (!this.canFire(g)) return;
    g.usedToday = true;
    const shots = Math.max(1, Math.round(t.salvo * Math.min(1, g.crew / t.crew)));
    let fired = 0;
    for (let s = 0; s < shots; s++) {
      if (g.side === 'att') {
        if (this.att.powder < g.charge) break;
        if (t.ammo === 'kh') { if (this.att.balls <= 0) break; this.att.balls--; }
        if (t.ammo === 'mortar') { if (this.att.shells <= 0) break; this.att.shells--; }
        this.att.powder -= g.charge;
      } else {
        if (this.def.powder < g.charge) break;
        if (t.ammo === 'falc') { if (this.def.falc <= 0) break; this.def.falc--; }
        this.def.powder -= g.charge;
      }
      fired++;
      const delay = s * (t.ammo === 'haken' ? 0.25 : 0.7);
      this.after(delay, () => {
        if (!g.alive) return;
        if (this.rain && this.rnd() < 0.15) { this.ev.log(`${g.label}: Versager, das Pulver ist feucht.`, 'bad'); return; }
        const ratio = g.charge / t.ballKg;
        if (ratio > t.burstRatio && this.rnd() < (ratio - t.burstRatio) * 2.5) {
          this.burst(g); return;
        }
        const a = g.angle + gauss(this.rnd) * t.sigmaAng;
        const v = muzzleVelocity(t, g.charge) * (1 + gauss(this.rnd) * t.sigmaV * (this.rain ? 1.8 : 1));
        const p = makeProj(g, a, v);
        (p as any).portX = (g as any).portX;
        this.projs.push(p);
        this.muzzleFx(g);
        this.ev.boom(t.ballKg > 5 ? 1 : t.ballKg > 0.5 ? 0.5 : 0.25, g.x);
      });
    }
    if (fired === 0) return;
    await this.wait();
  }

  burst(g: Gun) {
    g.alive = false;
    const k = 2 + Math.floor(this.rnd() * 4);
    this.kill(g.side, Math.min(k, g.crew), g);
    this.ev.log(`${g.label} ist durch zu starke Ladung zersprungen! ${k} Mann tot oder verwundet.`, 'bad');
    for (let n = 0; n < 40; n++) this.parts.push({ x: g.x, y: g.y + 1.2, vx: (this.rnd() - 0.5) * 30, vy: this.rnd() * 25, life: 0, max: 1.5, kind: 'chunk', r: 0.25, c: '#3a3530' });
    this.ev.boom(1.4, g.x);
  }

  kill(side: Side, n: number, gun?: Gun) {
    if (n <= 0) return;
    if (side === 'att') {
      this.att.men = Math.max(0, this.att.men - n); this.today.attCas += n;
    } else {
      this.def.men = Math.max(0, this.def.men - n); this.today.defCas += n;
    }
    if (gun) gun.crew = Math.max(0, gun.crew - n);
  }

  muzzleFx(g: Gun) {
    const a = g.angle * Math.PI / 180;
    const mx = g.x + g.dir * Math.cos(a) * g.type.barrel * 0.6, my = g.y + 1.25 + Math.sin(a) * g.type.barrel * 0.6;
    const big = g.type.ballKg > 5 ? 1 : 0.4;
    this.parts.push({ x: mx, y: my, vx: 0, vy: 0, life: 0, max: 0.12, kind: 'flash', r: 2.5 * big, c: '#ffd27a' });
    for (let n = 0; n < 14 * big + 4; n++) {
      this.parts.push({ x: mx, y: my, vx: g.dir * (this.rnd() * 14 + 2) * Math.cos(a) + (this.rnd() - 0.5) * 3 + this.wind * 0.3, vy: (this.rnd() * 6) * Math.sin(a) + this.rnd() * 2, life: 0, max: 3 + this.rnd() * 3, kind: 'smoke', r: (1 + this.rnd() * 1.5) * (0.6 + big), c: '#e8e4dc' });
    }
  }

  // ---------- Physik pro Frame ----------
  update(dt: number) {
    this.time += dt;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].at <= this.time) { const q = this.queue[i]; this.queue.splice(i, 1); q.fn(); }
    }
    const sim = dt * 0.55; // leichte Zeitlupe
    for (const p of this.projs) {
      if (p.done) continue;
      const sub = 6;
      for (let s = 0; s < sub && !p.done; s++) {
        const ox = p.x, oy = p.y;
        stepProj(p, sim / sub, this.wind);
        this.zoneCheck(p);
        const portX = (p as any).portX as number | undefined;
        if (portX !== undefined && p.x > portX) continue;
        const hit = firstSolid(this.w, ox, oy, p.x, p.y, p.side === 'att' ? GABION : -1);
        if (hit) { this.impact(p, hit.x, hit.y); p.done = true; }
        else if (!inBounds(p)) p.done = true;
      }
      if (p.trail.length > 60) p.trail.shift();
      p.trail.push({ x: p.x, y: p.y });
    }
    this.projs = this.projs.filter(p => !p.done || false);
    for (let n = 0; n < 2; n++) this.w.step();
    for (const q of this.parts) {
      q.life += dt;
      if (q.kind === 'smoke' || q.kind === 'dust') { q.vx += (this.wind * 0.4 - q.vx) * dt * 0.8; q.vy += (1.2 - q.vy) * dt * 0.6; q.r += dt * 1.2; }
      else if (q.kind === 'chunk') q.vy -= 9.81 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
    this.parts = this.parts.filter(q => q.life < q.max);
    if (this.waiters.length && this.projs.length === 0 && this.queue.length === 0 && !this.w.settle.active) {
      this.afterSettle();
      const ws = this.waiters; this.waiters = [];
      ws.forEach(f => f());
    }
  }

  afterSettle() {
    // Geschütze ohne Untergrund stürzen ab oder werden verschüttet
    for (const g of this.guns) {
      if (!g.alive) continue;
      const i = World.ci(g.x), j = World.cj(g.y - 0.1);
      if (!this.w.solid(i, j)) { g.alive = false; this.kill(g.side, Math.min(g.crew, 2), g); this.ev.log(`${g.label}: Der Boden ist weggebrochen, das Geschütz ist verloren.`, 'bad'); continue; }
      const j2 = World.cj(g.y + 0.9);
      if (g.side === 'def' && this.w.solid(i, j2)) { g.alive = false; this.ev.log(`${g.label} ist unter Trümmern verschüttet.`, 'bad'); }
    }
  }

  zoneCheck(p: Proj) {
    if (p.side === 'att') {
      for (const z of DEF_ZONES) {
        if (p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1 && !p.passedZones.has(z.key)) {
          p.passedZones.add(z.key);
          if (this.rnd() < z.p * (this.def.men / 45)) { this.kill('def', 1); this.ev.log('Eine Kugel fegt durch die Burg. Ein Verteidiger fällt.', 'info'); }
        }
      }
    }
    for (const g of this.guns) {
      if (!g.alive || g.side === p.side) continue;
      const bx0 = g.dir > 0 ? g.x - 3 : g.x - 1.5, bx1 = g.dir > 0 ? g.x + 1.5 : g.x + 3;
      if (p.x >= bx0 && p.x <= bx1 && p.y >= g.y && p.y <= g.y + 1.9) {
        const key = 'g' + g.id;
        if (p.passedZones.has(key)) continue;
        p.passedZones.add(key);
        const n = p.m > 5 ? 1 + Math.floor(this.rnd() * 3) : (this.rnd() < 0.6 ? 1 : 0);
        if (n > 0 && g.crew > 0) {
          this.kill(g.side, Math.min(n, g.crew), g);
          this.ev.log(`Treffer bei ${g.label}: ${n} Mann der Bedienung ausgefallen.`, g.side === 'att' ? 'bad' : 'bad');
        }
        if (Math.abs(p.x - g.x) < 1.2 && p.y < g.y + 1.5 && p.m > 0.3 && this.rnd() < (p.m > 5 ? 0.4 : 0.03)) {
          g.alive = false;
          this.ev.log(`${g.label} ist zerschossen!`, 'bad');
        }
      }
    }
  }

  impact(p: Proj, x: number, y: number) {
    const v = Math.hypot(p.vx, p.vy);
    let E = 0.5 * p.m * v * v / 1000; // kJ
    const ux = p.vx / v, uy = p.vy / v;
    const m0 = this.w.at(x, y);
    const big = p.m > 5;
    // Abplatzungen rund um den Einschlag
    const splash = E * (p.shell ? 0.1 : 0.22);
    const R = big ? 1.1 : 0.5;
    const ci = World.ci(x), cj = World.cj(y);
    const rc = Math.ceil(R / CS);
    let cells: [number, number, number][] = [];
    for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
      const d = Math.hypot(di, dj) * CS;
      if (d <= R) cells.push([ci + di, cj + dj, 1 - d / (R + CS)]);
    }
    const tot = cells.reduce((s, c) => s + c[2], 0);
    for (const c of cells) this.w.hit(c[0], c[1], splash * c[2] / tot * 1.8);
    E -= splash;
    // Eindringen entlang der Flugbahn
    let lastI = -1, lastJ = -1;
    for (let s = 0; s < 40 && E > 1; s++) {
      const px = x + ux * s * CS * 0.5, py = y + uy * s * CS * 0.5;
      const i = World.ci(px), j = World.cj(py);
      if (i === lastI && j === lastJ) continue;
      lastI = i; lastJ = j;
      E = this.w.hit(i, j, E);
    }
    if (p.shell) this.explode(x - ux * 0.6, y - uy * 0.6, p);
    // Effekte
    const col = m0 === 3 || m0 === 9 ? '#cfc6b4' : m0 === 2 ? '#d8d2c2' : m0 === 6 ? '#9a7f4d' : '#8a6d4e';
    const n = big ? 26 : 8;
    for (let k = 0; k < n; k++) {
      this.parts.push({ x, y, vx: -ux * this.rnd() * 12 + (this.rnd() - 0.5) * 10, vy: this.rnd() * 12, life: 0, max: 1.2 + this.rnd(), kind: 'chunk', r: 0.15 + this.rnd() * 0.25 * (big ? 1 : 0.5), c: col });
    }
    for (let k = 0; k < (big ? 10 : 3); k++) {
      this.parts.push({ x, y, vx: (this.rnd() - 0.5) * 4, vy: this.rnd() * 3, life: 0, max: 2.5 + this.rnd() * 2, kind: 'dust', r: big ? 1.5 : 0.6, c: col });
    }
    this.ev.boom(big ? 0.7 : 0.2, x);
    if (p.side === 'att' || p.gun >= 0) this.impacts.push({ gun: p.gun, x, y, day: this.day });
    if (this.impacts.length > 80) this.impacts.shift();
    // Wer im Einschlag stand
    for (const g of this.guns) {
      if (!g.alive || g.side === p.side) continue;
      if (Math.hypot(g.x - x, g.y + 0.8 - y) < (big ? 1.8 : 0.9)) {
        const k = Math.min(g.crew, 1 + Math.floor(this.rnd() * 2));
        this.kill(g.side, k, g);
        if (this.rnd() < (big ? 0.35 : 0.02)) { g.alive = false; this.ev.log(`${g.label} ist getroffen und unbrauchbar!`, 'bad'); }
      }
    }
  }

  explode(x: number, y: number, p: Proj) {
    const R = 1.6;
    const rc = Math.ceil(R / CS);
    const ci = World.ci(x), cj = World.cj(y);
    for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
      const d = Math.hypot(di, dj) * CS;
      if (d <= R) this.w.hit(ci + di, cj + dj, 160 * (1 - d / (R + 0.5)));
    }
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.25, kind: 'flash', r: 5, c: '#ffb347' });
    for (let k = 0; k < 16; k++) this.parts.push({ x, y, vx: (this.rnd() - 0.5) * 6, vy: this.rnd() * 4, life: 0, max: 3 + this.rnd() * 2, kind: 'smoke', r: 1.5, c: '#6d665c' });
    this.ev.boom(1.1, x);
    let inside = false;
    for (const z of DEF_ZONES) {
      const dx = Math.max(z.x0 - x, 0, x - z.x1), dy = Math.max(z.y0 - y, 0, y - z.y1);
      if (Math.hypot(dx, dy) < 4) {
        inside = true;
        const n = Math.floor(this.rnd() * 2.6 * Math.min(1, this.def.men / 40));
        if (n > 0) { this.kill('def', n); this.ev.log(`Eine Bombe explodiert in der Burg: ${n} Verteidiger getroffen.`, p.side === 'att' ? 'good' : 'bad'); }
      }
    }
    if (inside) this.today.inside++;
    for (const g of this.guns) {
      if (!g.alive) continue;
      if (Math.hypot(g.x - x, g.y + 0.8 - y) < 4.5) {
        const n = Math.min(g.crew, 1 + Math.floor(this.rnd() * 3));
        this.kill(g.side, n, g);
        this.ev.log(`Bombe bei ${g.label}: ${n} Mann getroffen.`, 'bad');
      }
    }
  }

  // ---------- Schanzarbeit, Sturm, Akkord ----------
  maxSapX() { return this.stage === 0 ? 380 : 412; }

  canSap(g: Gun) { return g.side === 'att' && this.phase === 'att' && g.alive && !g.usedToday && g.x + 40 <= this.maxSapX() + 0.1 && g.saps < 4; }

  sap(id: number) {
    const g = this.guns[id];
    if (!this.canSap(g)) return;
    g.usedToday = true;
    g.x += 40; g.saps++;
    g.y = this.w.surfaceBelow(g.x, 830);
    this.buildGabion(g);
    const cas = this.defFirepower() > 0 ? Math.floor(this.rnd() * 3) : 0;
    this.kill('att', cas);
    this.ev.log(`Laufgraben vorgetrieben: ${g.label} steht jetzt ${Math.round(this.targetX() - g.x)} m vor der Mauer.${cas ? ` ${cas} Schanzer gefallen.` : ''}`, 'info');
  }

  defFirepower() { return this.gunsOf('def').filter(g => g.alive && g.crew >= 2).length; }

  ditch() { return this.stage === 0 ? { x0: 426.2, x1: 442.8, rim: 800 } : { x0: 480.2, x1: 495.8, rim: 800 }; }
  wallSpan() { return this.stage === 0 ? { x0: 445.2, x1: 447.8, top: 812 } : { x0: 498.2, x1: 503.3, top: 822 }; }
  targetX() { return this.stage === 0 ? 445 : 498; }

  canFill() { return this.phase === 'att' && !this.today.filled; }

  fillDitch() {
    if (!this.canFill()) return;
    this.today.filled = true;
    const d = this.ditch();
    const n = this.w.fill(d.x0, d.x1, this.stage === 0 ? 150 : 110, d.rim - 0.5);
    const fire = this.defFirepower();
    const cas = Math.floor(this.rnd() * 4 + fire * (1 + this.rnd() * 2.5));
    this.kill('att', cas);
    this.ev.log(`Faschinen in den Graben geworfen (${(n * CS * CS).toFixed(0)} m² aufgefüllt). ${cas} Mann Verluste unter dem Feuer der Burg.`, 'info');
  }

  breach() {
    const sp = this.wallSpan(), d = this.ditch();
    let topMin = 1e9;
    for (let x = sp.x0; x <= sp.x1; x += CS) topMin = Math.min(topMin, this.w.top(x));
    let sum = 0, n = 0;
    for (let x = d.x0; x <= d.x1; x += CS) { sum += this.w.top(x); n++; }
    const fill = sum / n;
    const climb = Math.max(0, topMin - fill);
    const descent = Math.max(0, d.rim - fill);
    const D = Math.max(0, climb - 4) + 0.25 * Math.max(0, descent - 3);
    const q = Math.max(0, Math.min(1, 1 - D / 10));
    return { q, climb, descent, topMin, fill };
  }

  stormOdds() {
    const b = this.breach();
    const defStr = Math.min(1, this.def.men / 45) * (0.4 + 0.6 * this.def.morale / 100);
    return Math.max(0, Math.min(0.95, b.q * 0.9 * (1 - 0.65 * defStr) * (0.6 + 0.4 * this.att.morale / 100)));
  }

  canStorm() { return this.phase === 'att' && !this.today.stormed && this.att.men > 300; }

  storm() {
    if (!this.canStorm()) return;
    this.today.stormed = true;
    const p = this.stormOdds();
    const ok = this.rnd() < p;
    for (const g of this.gunsOf('att')) g.usedToday = true;
    if (ok) {
      const la = 30 + Math.floor(this.rnd() * 60), ld = 3 + Math.floor(this.rnd() * 6);
      this.kill('att', la); this.kill('def', ld);
      if (this.stage === 0) {
        this.stage = 1;
        this.def.morale -= 15; this.att.morale += 10;
        const f1 = this.guns.find(g => g.side === 'def' && g.x < 450);
        if (f1 && f1.alive) { f1.alive = false; }
        this.ev.log(`STURM GELUNGEN! Die Bayern nehmen die Vorburg (${la} Mann Verlust). Die Besatzung zieht sich hinter den inneren Graben in die Hauptbastion zurück.`, 'good');
      } else {
        this.winner = 'att';
        this.endText = 'Die Hauptbastion ist erstürmt. Wildenstein ist gefallen, ohne Akkord. Nach Kriegsbrauch hat die Besatzung keine Gnade zu erwarten. Historisch endete die Belagerung anders: mit einer ehrenvollen Kapitulation.';
        this.phase = 'over';
      }
    } else {
      const la = 60 + Math.floor(this.rnd() * 90), ld = 1 + Math.floor(this.rnd() * 5);
      this.kill('att', la); this.kill('def', ld);
      this.att.morale -= 15; this.def.morale += 10;
      this.ev.log(`Der Sturm wird abgeschlagen! ${la} Bayern bleiben in Graben und Bresche liegen, die Besatzung verliert ${ld} Mann. (So scheiterten auch die echten Stürme 1642.)`, 'bad');
    }
    if (this.phase !== 'over') this.endPhase();
  }

  canOffer() { return this.phase === 'att' && !this.today.offered && this.day >= 3; }

  acceptChance() {
    let p = (62 - this.def.morale) / 50;
    if (this.stage === 1) p += 0.2;
    if (this.breach().q > 0.5) p += 0.15;
    if (this.day >= 20) p += 0.1;
    return Math.max(0.02, Math.min(0.95, p));
  }

  offer() {
    if (!this.canOffer()) return;
    this.today.offered = true;
    this.ev.log('Ein Trommler mit weißer Fahne bringt ein Angebot: freier Abzug mit Waffen und Gepäck, wenn die Burg übergeben wird.', 'info');
    if (this.ctrl.def === 'ai') {
      const acc = this.rnd() < this.acceptChance();
      this.resolveOffer(acc);
    } else this.pendingOffer = true;
  }

  answer(accept: boolean) {
    if (!this.pendingOffer) return;
    this.pendingOffer = false;
    this.resolveOffer(accept);
  }

  resolveOffer(acc: boolean) {
    if (acc) {
      this.winner = 'att';
      this.phase = 'over';
      this.endText = 'Die Besatzung nimmt den Akkord an und zieht mit Waffen und Gepäck ab. Genau so endete die echte Belagerung am 4. September 1642: mit einer ehrenvollen Kapitulation vor Oberstleutnant von Marmont.';
    } else {
      this.def.morale += 3;
      this.ev.log('Die Besatzung lehnt ab. Sie will weiterkämpfen.', 'info');
    }
  }

  canRepair() { return this.phase === 'def' && !this.today.repaired; }

  repair() {
    if (!this.canRepair()) return;
    this.today.repaired = true;
    const h = this.guns.find(g => g.side === 'def' && g.type.key === 'haken');
    if (h) h.usedToday = true;
    const sp = this.wallSpan();
    const n = this.w.fill(sp.x0 - 0.2, sp.x1 + 0.2, 20 + this.def.men, sp.top);
    const cas = this.rnd() < 0.3 ? 1 : 0;
    this.kill('def', cas);
    this.ev.log(n > 0 ? `Nachts wird die Bresche mit Erde, Balken und Wollsäcken verbaut (${(n * CS * CS).toFixed(0)} m²).` : 'Die Mauer ist noch heil, es gibt nichts auszubessern.', 'info');
    if (n > 0) this.def.morale += 2;
  }

  // ---------- Phasen und Tage ----------
  endPhase() {
    if (this.phase === 'att') { this.phase = 'def'; }
    else if (this.phase === 'def') { this.night(); }
  }

  report: Report | null = null;

  night() {
    const t = this.today;
    const lines: string[] = [];
    const b = this.breach();
    let dm = -1 - t.defCas * 1.2 - t.inside * 0.5;
    if (b.q > 0.35) dm -= 5;
    if (t.repaired) dm += 1;
    this.def.morale = Math.max(0, Math.min(100, this.def.morale + dm));
    let am = -t.attCas * 0.12 + (b.q > 0.3 ? 1 : 0) - (this.day > 15 ? 1.5 : 0) - (this.rain ? 1 : 0);
    this.att.morale = Math.max(0, Math.min(100, this.att.morale + am));
    lines.push(`Verluste heute: Bayern ${t.attCas}, Besatzung ${t.defCas}.`);
    lines.push(`Bresche: Mauerkrone bei ${(b.topMin - 800).toFixed(1)} m über dem Hof, Grabenfüllung ${(b.descent).toFixed(1)} m unter dem Rand. Sturmreife ${(b.q * 100).toFixed(0)} %.`);
    // Mannschaften auffüllen
    let poolDef = this.def.men - this.gunsOf('def').filter(g => g.alive).reduce((s, g) => s + g.crew, 0);
    for (const g of this.guns) {
      if (!g.alive) continue;
      if (g.side === 'att') g.crew = this.att.men > 300 ? g.type.crew : Math.max(2, Math.floor(g.type.crew * this.att.men / 400));
      else { const need = g.type.crew - g.crew; const take = Math.max(0, Math.min(need, poolDef - 10)); g.crew += take; poolDef -= take; }
      g.usedToday = false;
    }
    if (this.def.men < this.gunsOf('def').filter(g => g.alive).reduce((s, g) => s + g.crew, 0)) {
      for (const g of this.gunsOf('def')) g.crew = Math.min(g.crew, Math.floor(this.def.men / 3));
    }
    this.report = { lines };
    this.today = { defCas: 0, attCas: 0, inside: 0, repaired: false, filled: false, stormed: false, offered: false };
    this.day++;
    if (this.day > 25) {
      this.winner = 'def'; this.phase = 'over';
      this.endText = 'Der 4. September ist vorüber und die Burg hält noch. Die Bayern brechen die Belagerung ab. Historisch kam es anders: Genau an diesem Tag kapitulierte die Besatzung.';
      return;
    }
    this.newWeather();
    this.phase = 'att';
  }

  checkEnd() {
    if (this.phase === 'over') return;
    if (this.def.men <= 6 || this.def.morale <= 0) {
      this.winner = 'att'; this.phase = 'over';
      this.endText = this.def.men <= 6 ? 'Die Besatzung ist zu klein geworden, um die Mauern zu halten. Die Überlebenden ergeben sich.' : 'Die Moral der Besatzung ist gebrochen. Sie bittet um einen Akkord und übergibt die Burg.';
    } else if (this.att.men < 250 || this.att.morale <= 0) {
      this.winner = 'def'; this.phase = 'over';
      this.endText = 'Die bayerischen Truppen sind zu geschwächt. Die Belagerung wird aufgehoben, Wildenstein bleibt in der Hand der Besatzung.';
    } else if (this.gunsOf('att').every(g => !g.alive) || (this.att.powder < 2 && this.att.shells <= 0)) {
      this.winner = 'def'; this.phase = 'over';
      this.endText = 'Die Bayern haben keine einsatzfähigen Geschütze oder kein Pulver mehr. Sie ziehen ab.';
    }
  }

  // ---------- KI ----------
  aimGun(g: Gun, tx: number, ty: number) {
    const t = g.type;
    if (t.shell) {
      const ang = 68;
      let lo = t.chargeMin, hi = t.chargeMax;
      for (let n = 0; n < 30; n++) {
        const mid = (lo + hi) / 2;
        const h = heightAt(g, ang, mid, this.wind, tx, true);
        if (h === null || h < ty) lo = mid; else hi = mid;
      }
      return { angle: ang, charge: (lo + hi) / 2 };
    }
    const charge = t.chargeDefault;
    let lo = t.angMin, hi = Math.min(t.angMax, 12);
    for (let n = 0; n < 30; n++) {
      const mid = (lo + hi) / 2;
      const h = heightAt(g, mid, charge, this.wind, tx, false);
      if (h === null || h < ty) lo = mid; else hi = mid;
    }
    return { angle: (lo + hi) / 2, charge };
  }

  aiTarget(g: Gun): { x: number; y: number } {
    if (g.side === 'att') {
      if (g.type.shell) return { x: this.stage === 0 ? 515 + this.rnd() * 30 : 512 + this.rnd() * 35, y: 802 };
      const sp = this.wallSpan();
      const base = this.stage === 0 ? 800.6 : 800.6;
      const face = this.stage === 0 ? 444.6 : 497.6;
      const ground = this.w.surfaceBelow(face - 1.5, 830);
      return { x: face, y: Math.max(base, ground + 0.4) + (sp.x1 > 0 ? 0 : 0) };
    }
    const targets = this.gunsOf('att').filter(a => a.alive && a.crew > 0).sort((a, b) => b.crew - a.crew);
    const tg = targets[0] || this.gunsOf('att')[0];
    return { x: tg.x - 0.6, y: tg.y + 1.1 };
  }

  aiNext(): Cmd | null {
    const s = this.side();
    if (s === 'att') {
      if (this.canOffer() && this.day >= 6 && (this.acceptChance() > 0.35 || this.rnd() < 0.15)) return { t: 'offer' };
      if (this.canStorm() && this.stormOdds() > 0.42) return { t: 'storm' };
      const b = this.breach();
      if (this.canFill() && b.topMin < this.wallSpan().top - 6 && b.descent > 4) return { t: 'fill' };
      for (const g of this.gunsOf('att')) {
        if (this.canSap(g) && !g.type.shell && this.day <= 4 && g.saps < 2 && this.day % 2 === 0) return { t: 'sap', gun: g.id };
      }
      for (const g of this.gunsOf('att')) {
        if (!this.canFire(g)) continue;
        const tg = this.aiTarget(g);
        const a = this.aimGun(g, tg.x, tg.y);
        return { t: 'fire', gun: g.id, angle: a.angle + gauss(this.rnd) * 0.12, charge: a.charge * (1 + gauss(this.rnd) * 0.02) };
      }
      return { t: 'end' };
    } else {
      const b = this.breach();
      if (this.canRepair() && (b.topMin < this.wallSpan().top - 1.5)) return { t: 'repair' };
      for (const g of this.gunsOf('def')) {
        if (!this.canFire(g)) continue;
        const tg = this.aiTarget(g);
        const a = this.aimGun(g, tg.x, tg.y);
        return { t: 'fire', gun: g.id, angle: a.angle + gauss(this.rnd) * 0.15, charge: a.charge };
      }
      return { t: 'end' };
    }
  }
}

export { W };
