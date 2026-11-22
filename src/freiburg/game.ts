// Regeln für Kapitel 2. Wie in Kapitel 1 laufen alle Züge als Befehle über dispatch()
// und aller Zufall über einen gesäten Zufallsgenerator (für spätere Online-Duelle).
import { mulberry32 } from '../sim';
import { NODES, EDGES, UNITS, FSide, Kind, MapNode, FIXED_RAIN, fbDate } from './data';

export interface FUnit { id: string; side: FSide; name: string; kind: Kind; men: number; max: number; morale: number; node: string; mp: number; acted: boolean; alive: boolean; leader?: string }

export type FCmd =
  | { t: 'move'; unit: string; to: string; with?: string[] }
  | { t: 'entrench'; unit: string }
  | { t: 'bombard'; unit: string; to: string }
  | { t: 'end' };

export interface BattleResult { text: string; won: boolean; attLoss: number; defLoss: number; node: string }

export const TURNS = 16;

export class FGame {
  rnd: () => number;
  units: FUnit[];
  turn = 0;
  side: FSide = 'fr';
  rain = true;
  schanze: Record<string, Record<FSide, number>> = {};
  owner: Record<string, FSide | null> = {};
  losses: Record<FSide, number> = { fr: 0, bav: 0 };
  trainLost = false;
  over = false;
  log: (m: string, k?: 'info' | 'good' | 'bad') => void;
  lastBattle: BattleResult | null = null;
  adj: Record<string, string[]> = {};
  nodes: Record<string, MapNode> = {};
  history: FCmd[] = [];

  constructor(seed: number, log: FGame['log']) {
    this.rnd = mulberry32(seed);
    this.log = log;
    for (const n of NODES) { this.nodes[n.id] = n; this.adj[n.id] = []; this.schanze[n.id] = { fr: 0, bav: 0 }; this.owner[n.id] = null; }
    for (const [a, b] of EDGES) { this.adj[a].push(b); this.adj[b].push(a); }
    this.units = UNITS.map(u => ({ ...u, max: u.men, morale: 80, mp: 0, acted: false, alive: true }));
    this.schanze.bohl.bav = 2; this.schanze.schlierberg.bav = 1; this.schanze.freiburg.bav = 1;
    for (const u of this.units) this.owner[u.node] = u.side;
    this.owner.breisach = 'fr';
    this.startSide();
  }

  isRain(turn = this.turn) { return FIXED_RAIN.includes(turn) || (turn > 3 && this.weatherRoll[turn]); }
  weatherRoll: boolean[] = Array.from({ length: TURNS }, (_, i) => i > 3 && ((i * 7919) % 10) < 2);

  unitsAt(node: string, side?: FSide) { return this.units.filter(u => u.alive && u.node === node && (!side || u.side === side)); }
  enemy(s: FSide): FSide { return s === 'fr' ? 'bav' : 'fr'; }

  baseMp(u: FUnit) {
    const rain = this.isRain();
    switch (u.kind) {
      case 'cav': case 'drag': return rain ? 1 : 2;
      case 'art': case 'train': return rain ? 0 : 1;
      default: return 1;
    }
  }

  startSide() {
    this.rain = this.isRain();
    for (const u of this.units) if (u.side === this.side && u.alive) { u.mp = this.baseMp(u); u.acted = false; }
  }

  // ---------- Kampfkraft ----------
  power(u: FUnit, attacking: boolean, node: string) {
    const t = this.nodes[node].terrain;
    let mul = 1;
    switch (u.kind) {
      case 'inf': mul = 1; break;
      case 'drag': mul = 0.8; break;
      case 'cav': mul = attacking ? (t === 'plain' || t === 'valley' ? 1.5 : t === 'hill' ? 0.7 : 0.45) : (t === 'plain' || t === 'valley' ? 1.2 : 0.85); break;
      case 'art': mul = attacking ? 0.3 : 1.1; break;
      case 'train': mul = 0.05; break;
    }
    if (this.rain && (u.kind === 'inf' || u.kind === 'drag' || u.kind === 'art')) mul *= 0.6;
    return u.men / 1000 * mul * (0.3 + 0.7 * u.morale / 100);
  }

  defFactor(node: string, side: FSide) {
    const t = this.nodes[node].terrain;
    const base = t === 'hill' ? 1.35 : t === 'forest' ? 1.25 : t === 'city' ? 1.8 : 1;
    return base + 0.3 * this.schanze[node][side];
  }

  artSupport(node: string, side: FSide) {
    let n = 0;
    for (const nb of [node, ...this.adj[node]]) n += this.unitsAt(nb, side).filter(u => u.kind === 'art' && u.men > 100).length;
    return 1 + 0.15 * n * (this.rain ? 0.5 : 1);
  }

  odds(attackers: FUnit[], node: string) {
    const side = attackers[0].side, def = this.enemy(side);
    const D = this.unitsAt(node, def);
    const A = attackers.reduce((s, u) => s + this.power(u, true, node), 0) * this.artSupport(node, side);
    const Dp = D.reduce((s, u) => s + this.power(u, false, node), 0) * this.defFactor(node, def) * this.artSupport(node, def);
    return Dp <= 0 ? 99 : A / Dp;
  }

  // Grobe Siegwahrscheinlichkeit für die Anzeige
  winChance(r: number) { return Math.max(0, Math.min(1, (1.3 - 1.1 / Math.max(0.01, r)) / 0.55)); }

  reachable(u: FUnit): string[] {
    if (!u.alive || u.mp <= 0 || u.side !== this.side) return [];
    return this.adj[u.node].filter(n => !(u.kind === 'train' && this.unitsAt(n, this.enemy(u.side)).length));
  }

  canEntrench(u: FUnit) { return u.alive && !u.acted && u.side === this.side && (u.kind === 'inf' || u.kind === 'drag') && u.mp === this.baseMp(u) && this.schanze[u.node][u.side] < 2 && this.nodes[u.node].terrain !== 'city'; }
  canBombard(u: FUnit, to: string) { return u.alive && !u.acted && u.side === this.side && u.kind === 'art' && !this.isRain() && this.adj[u.node].includes(to) && this.unitsAt(to, this.enemy(u.side)).length > 0; }

  // ---------- Befehle ----------
  dispatch(c: FCmd) {
    if (this.over) return;
    this.history.push(c);
    this.lastBattle = null;
    if (c.t === 'move') this.move(c.unit, c.to, c.with);
    else if (c.t === 'entrench') this.entrench(c.unit);
    else if (c.t === 'bombard') this.bombard(c.unit, c.to);
    else if (c.t === 'end') this.endSide();
    this.checkEnd();
  }

  unit(id: string) { return this.units.find(u => u.id === id)!; }

  // Verbände, die gemeinsam mit u einen Ort angreifen können
  helpers(u: FUnit, to: string) {
    return this.units.filter(o => o !== u && o.alive && o.side === u.side && o.side === this.side && !o.acted && o.mp > 0 && o.kind !== 'art' && o.kind !== 'train' && o.morale >= 20 && this.adj[o.node].includes(to));
  }

  move(id: string, to: string, withIds?: string[]) {
    const u = this.unit(id);
    if (!this.reachable(u).includes(to)) return;
    const foes = this.unitsAt(to, this.enemy(u.side));
    if (foes.length) {
      if (u.kind === 'train' || u.kind === 'art') return;
      const ok = this.helpers(u, to);
      const atts = [u, ...(withIds || []).map(i => ok.find(o => o.id === i)).filter((x): x is FUnit => !!x)];
      this.battle(atts, to);
      for (const a of atts) { a.mp = 0; a.acted = true; }
    } else {
      u.node = to; u.mp--; u.acted = true;
      this.owner[to] = u.side;
    }
  }

  entrench(id: string) {
    const u = this.unit(id);
    if (!this.canEntrench(u)) return;
    this.schanze[u.node][u.side]++;
    u.mp = 0; u.acted = true;
    this.log(`${u.name} wirft Schanzen auf (${this.nodes[u.node].name}).`);
  }

  bombard(id: string, to: string) {
    const u = this.unit(id);
    if (!this.canBombard(u, to)) return;
    const foes = this.unitsAt(to, this.enemy(u.side));
    const cover = this.schanze[to][this.enemy(u.side)];
    let total = 0;
    for (const f of foes) {
      const k = Math.round(f.men * (0.025 + this.rnd() * 0.03) * (u.men / u.max) / (1 + cover * 0.5));
      f.men -= k; total += k; f.morale = Math.max(0, f.morale - 6);
    }
    this.losses[this.enemy(u.side)] += total;
    if (cover > 0 && this.rnd() < 0.4) this.schanze[to][this.enemy(u.side)]--;
    u.mp = 0; u.acted = true;
    this.log(`${u.name} beschießt ${this.nodes[to].name}: ${total} Mann Verluste beim Gegner${cover && this.schanze[to][this.enemy(u.side)] < cover ? ', Schanzen beschädigt' : ''}.`, 'info');
    this.cleanup();
  }

  battle(atts: FUnit[], node: string) {
    const side = atts[0].side, def = this.enemy(side);
    const defs = this.unitsAt(node, def);
    const r = this.odds(atts, node);
    const roll = r * (0.75 + this.rnd() * 0.55);
    const won = roll > 1.1;
    const rain = this.rain ? 0.7 : 1;
    let attLoss = 0, defLoss = 0;
    for (const a of atts) {
      const k = Math.round(a.men * Math.max(0.04, Math.min(0.3, 0.1 + 0.08 / Math.max(0.2, r))) * (0.8 + this.rnd() * 0.4) * rain);
      a.men -= k; attLoss += k;
    }
    for (const d of defs) {
      const k = Math.round(d.men * Math.max(0.02, Math.min(0.3, 0.06 + 0.08 * r)) * (0.8 + this.rnd() * 0.4) * rain);
      d.men -= k; defLoss += k;
    }
    this.losses[side] += attLoss; this.losses[def] += defLoss;
    const nm = this.nodes[node].name;
    const who = atts.length > 1 ? `${atts[0].name} und ${atts.length - 1} weitere` : atts[0].name;
    let text: string;
    if (won) {
      const from = atts[0].node;
      for (const a of atts) a.morale = Math.min(100, a.morale + 5);
      for (const d of defs) {
        d.morale = Math.max(0, d.morale - 20);
        const opts = this.adj[node].filter(n => !atts.some(a => a.node === n) && this.unitsAt(n, side).length === 0);
        opts.sort((a, b) => (this.unitsAt(b, def).length - this.unitsAt(a, def).length) || (this.distTo(b, from) - this.distTo(a, from)));
        if (opts.length) { d.node = opts[0]; d.mp = 0; }
        else { const k = Math.round(d.men * 0.5); d.men -= k; this.losses[def] += k; defLoss += k; d.alive = false; this.log(`${d.name} ist eingeschlossen und ergibt sich.`, 'bad'); }
        if (d.kind === 'train' && !d.alive) this.trainLost = true;
      }
      this.schanze[node][def] = 0;
      for (const a of atts) a.node = node;
      this.owner[node] = side;
      text = `${who} erobern ${nm}! Verluste: ${attLoss} eigene, ${defLoss} beim Gegner.`;
    } else {
      for (const a of atts) a.morale = Math.max(0, a.morale - 15);
      for (const d of defs) d.morale = Math.min(100, d.morale + 5);
      text = `Der Angriff von ${who} auf ${nm} wird abgeschlagen. Verluste: ${attLoss} eigene, ${defLoss} beim Gegner.`;
    }
    this.lastBattle = { text, won, attLoss, defLoss, node };
    this.log(text, won === (side === 'fr') ? 'good' : 'bad');
    this.cleanup();
  }

  distTo(a: string, b: string) {
    const seen = new Set([a]); let frontier = [a]; let d = 0;
    while (frontier.length) {
      if (frontier.includes(b)) return d;
      const nx: string[] = [];
      for (const n of frontier) for (const m of this.adj[n]) if (!seen.has(m)) { seen.add(m); nx.push(m); }
      frontier = nx; d++;
    }
    return 99;
  }

  cleanup() {
    for (const u of this.units) {
      if (!u.alive) continue;
      if (u.men < u.max * 0.15 || (u.morale < 12 && u.kind !== 'train')) {
        u.alive = false;
        this.log(`${u.name} ist zerschlagen und löst sich auf.`, 'bad');
      }
    }
  }

  endSide() {
    if (this.side === 'fr') { this.side = 'bav'; }
    else {
      // Halbtag vorbei: Erholung
      for (const u of this.units) {
        if (!u.alive) continue;
        const rest = this.turn % 2 === 1 ? 10 : 4;
        if (!u.acted) u.morale = Math.min(95, u.morale + rest);
        // Tross bei St. Peter in Sicherheit
      }
      this.turn++;
      this.side = 'fr';
    }
    if (this.turn < TURNS) this.startSide();
  }

  strength(s: FSide) { return this.units.filter(u => u.alive && u.side === s && u.kind !== 'train').reduce((a, u) => a + u.men, 0); }
  startStrength(s: FSide) { return this.units.filter(u => u.side === s && u.kind !== 'train').reduce((a, u) => a + u.max, 0); }

  checkEnd() {
    if (this.turn >= TURNS) this.over = true;
    if (this.strength('fr') < this.startStrength('fr') * 0.3 || this.strength('bav') < this.startStrength('bav') * 0.3) this.over = true;
    const train = this.units.find(u => u.kind === 'train')!;
    if (!train.alive) this.trainLost = true;
  }

  score() {
    const fr = { pts: 0, why: [] as string[] }, bav = { pts: 0, why: [] as string[] };
    const add = (o: typeof fr, p: number, w: string) => { if (p) { o.pts += p; o.why.push(`${w}: ${p > 0 ? '+' : ''}${p}`); } };
    add(fr, Math.round(this.losses.bav / 1000), 'Verluste der Bayern');
    add(bav, Math.round(this.losses.fr / 1000), 'Verluste der Franzosen');
    for (const n of NODES) {
      if (!n.vp) continue;
      const own = this.unitsAt(n.id, 'fr').length ? 'fr' : this.unitsAt(n.id, 'bav').length ? 'bav' : this.owner[n.id];
      if (own === 'fr' && n.vp.fr) add(fr, n.vp.fr, n.name);
      if (own === 'bav' && n.vp.bav) add(bav, n.vp.bav, n.name + ' gehalten');
    }
    const train = this.units.find(u => u.kind === 'train')!;
    if (this.trainLost || !train.alive) add(fr, 3, 'Tross erbeutet');
    else add(bav, train.node === 'stpeter' ? 3 : 2, train.node === 'stpeter' ? 'Tross nach St. Peter gerettet' : 'Tross gehalten');
    const art = this.units.find(u => u.side === 'bav' && u.kind === 'art')!;
    if (art.alive) add(bav, 1, 'Geschütze gerettet');
    const sF = this.strength('fr') / this.startStrength('fr'), sB = this.strength('bav') / this.startStrength('bav');
    if (sB < 0.3) add(fr, 6, 'Bayerisches Heer zerschlagen');
    if (sF < 0.3) add(bav, 6, 'Französisches Heer zerschlagen');
    const diff = fr.pts - bav.pts;
    const verdict = diff >= 3 ? 'Sieg der Franzosen' : diff <= -3 ? 'Sieg der Bayern' : 'Unentschieden, wie 1644';
    return { fr, bav, verdict, winner: diff >= 3 ? 'fr' as FSide : diff <= -3 ? 'bav' as FSide : null };
  }

  dateText() { return fbDate(Math.min(this.turn, TURNS - 1)); }

  // ---------- KI ----------
  aiNext(): FCmd {
    const s = this.side, e = this.enemy(s);
    const mine = this.units.filter(u => u.alive && u.side === s && u.mp > 0 && !u.acted);
    const goal = s === 'fr' ? 'freiburg' : 'stpeter';
    // Artillerie beschießt
    for (const u of mine) {
      if (u.kind !== 'art') continue;
      const tg = this.adj[u.node].filter(n => this.canBombard(u, n)).sort((a, b) => this.unitsAt(b, e).reduce((x, y) => x + y.men, 0) - this.unitsAt(a, e).reduce((x, y) => x + y.men, 0))[0];
      if (tg) return { t: 'bombard', unit: u.id, to: tg };
    }
    // Tross in Sicherheit bringen
    const train = mine.find(u => u.kind === 'train');
    if (train && s === 'bav') {
      const threat = this.turn >= 12 || this.unitsAt('denzlingen', 'fr').length > 0 || this.adj[train.node].some(n => this.unitsAt(n, 'fr').length);
      if (threat && train.node !== 'stpeter') {
        const nx = this.reachable(train).filter(n => !this.unitsAt(n, 'fr').length).sort((a, b) => this.distTo(a, 'stpeter') - this.distTo(b, 'stpeter'))[0];
        if (nx && this.distTo(nx, 'stpeter') < this.distTo(train.node, 'stpeter')) return { t: 'move', unit: train.id, to: nx };
      }
    }
    // Angriffe
    const thr = s === 'fr' ? (this.turn < 10 ? 0.85 : 1.0) : 1.35;
    let best: { u: FUnit; n: string; r: number } | null = null;
    for (const u of mine) {
      if (u.kind === 'art' || u.kind === 'train' || u.morale < 35) continue;
      for (const n of this.reachable(u)) {
        if (!this.unitsAt(n, e).length) continue;
        const team = [u, ...this.helpers(u, n)];
        const r = this.odds(team, n);
        if (r > thr && (!best || r > best.r)) best = { u, n, r };
      }
    }
    if (best) return { t: 'move', unit: best.u.id, to: best.n, with: this.helpers(best.u, best.n).map(o => o.id) };
    // Bayern: bedrohte Stellungen räumen (wie Mercy in der Nacht zum 4. August)
    if (s === 'bav') {
      for (const u of mine) {
        if (u.kind === 'train') continue;
        const here = this.unitsAt(u.node, 'bav');
        const threat = this.adj[u.node].reduce((a, n) => a + this.unitsAt(n, 'fr').reduce((x, f) => x + this.power(f, true, u.node), 0), 0);
        const hold = here.reduce((a, d) => a + this.power(d, false, u.node), 0) * this.defFactor(u.node, 'bav');
        if (threat > hold * 1.6 && this.turn % 2 === 1) {
          const nx = this.reachable(u).filter(n => !this.unitsAt(n, 'fr').length && this.nodes[n].terrain !== 'plain').sort((a, b) => this.defFactor(b, 'bav') - this.defFactor(a, 'bav'))[0];
          if (nx && nx !== u.node) return { t: 'move', unit: u.id, to: nx };
        }
        if (this.canEntrench(u) && this.nodes[u.node].terrain !== 'plain') return { t: 'entrench', unit: u.id };
      }
      // Turenne bei Denzlingen: Rückzug Richtung St. Peter
      if (this.unitsAt('denzlingen', 'fr').length || this.turn >= 14) {
        for (const u of mine) {
          if (u.kind === 'train' || u.node === 'stpeter' || u.id === 'b6') continue;
          const nx = this.reachable(u).filter(n => !this.unitsAt(n, 'fr').length).sort((a, b) => this.distTo(a, goal) - this.distTo(b, goal))[0];
          if (nx && this.distTo(nx, goal) < this.distTo(u.node, goal)) return { t: 'move', unit: u.id, to: nx };
        }
      }
      return { t: 'end' };
    }
    // Franzosen: vorrücken, Reiterei sucht offene Wege (ab Tag 6 Richtung Denzlingen)
    for (const u of mine) {
      if (u.kind === 'train') continue;
      const target = (u.kind === 'cav' || u.kind === 'drag') && this.turn >= 10 ? 'denzlingen' : goal;
      const nx = this.reachable(u).filter(n => !this.unitsAt(n, e).length).sort((a, b) => this.distTo(a, target) - this.distTo(b, target))[0];
      if (nx && this.distTo(nx, target) < this.distTo(u.node, target)) return { t: 'move', unit: u.id, to: nx };
      if (this.canEntrench(u) && this.rain) return { t: 'entrench', unit: u.id };
    }
    return { t: 'end' };
  }
}
