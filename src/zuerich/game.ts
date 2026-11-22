// Kapitel 5: Zweite Schlacht um Zürich, 25./26. September 1799
import type { Entry } from '../history';

export type ZSide = 'fr' | 'ru';
export type Site = 'vogelsang' | 'dietikon' | 'wipkingen';
export type Sector = Site | 'wollishofen';
export type Div = 'stark' | 'schwach' | 'keine';
export interface Plan { site: Site; start: 'frueh' | 'hist' | 'spaet'; mortier: Div; menard: Div; soult: 'nacht' | 'tag' | 'binden' }
export type FOrder = 'angriff' | 'feuer' | 'bruecke' | 'reserve' | 'sammeln';
export type ROrder = { t: 'send'; to: Sector } | { t: 'scout'; to: Sector } | { t: 'counter'; to: Sector } | { t: 'hold' };
export type ZCmd =
  | { t: 'plan'; plan: Plan; rapperswil: boolean }
  | { t: 'tick'; fr: FOrder; ru: ROrder }
  | { t: 'evening'; fr: 'sperren' | 'ruhen'; ru: 'ausbruch' | 'halten' };

export const SECTORS: Sector[] = ['vogelsang', 'dietikon', 'wipkingen', 'wollishofen'];
export const SITES: Record<Site, { name: string; zones: string[]; pickets: number; bank: number; delay: number; info: string }> = {
  vogelsang: { name: 'Vogelsang', zones: ['Ufer bei Vogelsang', 'Würenlingen', 'Regensdorf', 'Höngger Berg', 'Zürichberg'], pickets: 900, bank: 0.75, delay: 2,
    info: 'Weit weg von Zürich, kaum bewacht, aber steile Ufer und ein langer Weg zur Stadt.' },
  dietikon: { name: 'Dietikon', zones: ['Ufer bei Dietikon', 'Hochfläche bei Kloster Fahr', 'Höngger Berg', 'Zürichberg'], pickets: 2600, bank: 1, delay: 1,
    info: 'Offenes Ufer, die Limmat nur 90 m breit. Hier setzte Masséna 1799 wirklich über.' },
  wipkingen: { name: 'Wipkingen', zones: ['Ufer bei Wipkingen', 'Käferberg', 'Zürichberg'], pickets: 4500, bank: 0.9, delay: 0.5,
    info: 'Kurzer Weg zur Stadt, aber stark besetzt. Verstärkungen sind schnell da.' },
};
export const SECTOR_NAME: Record<Sector, string> = { vogelsang: 'Vogelsang', dietikon: 'Dietikon', wipkingen: 'Wipkingen', wollishofen: 'Wollishofen' };
const DELAY: Record<Sector, number> = { vogelsang: 2, dietikon: 1, wipkingen: 0.5, wollishofen: 0.5 };
const DIV_MEN = { mortier: { stark: 5000, schwach: 2000, keine: 0 }, menard: { stark: 3000, schwach: 1000, keine: 0 } };
const START_H = { frueh: 3.5, hist: 4.75, spaet: 6 };

export const FORDERS: Record<FOrder, { name: string; info: string }> = {
  angriff: { name: 'Angreifen', info: 'Die Truppen am Ostufer stürmen die nächste Stellung.' },
  feuer: { name: 'Geschützfeuer', info: 'Die Batterien feuern über den Fluss auf die Russen.' },
  bruecke: { name: 'Brücke schlagen', info: 'Dedons Pontoniere bauen die Schiffbrücke. Solange fahren weniger Boote.' },
  reserve: { name: 'Reserve holen', info: 'Kleins Division marschiert zur Übergangsstelle (1,5 Stunden).' },
  sammeln: { name: 'Sammeln', info: 'Ordnen, Munition verteilen, Atem holen.' },
};

export const Z_SOURCES: Record<string, { name: string; url: string }> = {
  zwen: { name: 'Wikipedia (engl.): Second Battle of Zurich', url: 'https://en.wikipedia.org/wiki/Second_Battle_of_Zurich' },
  zwde: { name: 'Wikipedia: Zweite Schlacht um Zürich', url: 'https://de.wikipedia.org/wiki/Zweite_Schlacht_um_Z%C3%BCrich' },
  limde: { name: 'Wikipedia: Limmatübergang bei Dietikon', url: 'https://de.wikipedia.org/wiki/Limmat%C3%BCbergang_bei_Dietikon' },
};

export const Z_PROLOG: Entry[] = [
  { tag: 'belegt', src: ['zwde', 'zwen'], title: 'Die Lage im September 1799', text: 'Erzherzog Karl ist mit der österreichischen Hauptarmee aus der Schweiz abgezogen. Zurück bleiben die Russen unter Korsakow an der Limmat bei Zürich und die Österreicher unter Hotze an der Linth. Masséna steht mit rund 35.000 Franzosen gegenüber.' },
  { tag: 'belegt', src: ['zwen'], title: 'Suworow kommt', text: 'Aus Italien marschiert Suworow über den Gotthard. Er soll Masséna in die Zange nehmen. Als Masséna am 24. September hört, dass Suworow am Gotthard steht, zieht er seinen Angriff um einen Tag vor.' },
  { tag: 'belegt', src: ['limde'], title: 'Pontons über den Mutschellen', text: 'In der Nacht zum 24. September bringen die Pontoniere ihre Boote heimlich von der Reuss über den Mutschellen. Bei Dietikon versammelt General Lorge 8.000 Mann und 26 Geschütze. Gegenüber stehen nur etwa 2.600 Russen unter Markow.' },
];

// Einträge, die erscheinen, sobald die Uhr die Stunde erreicht
export const Z_CHRONICLE: { h: number; e: Entry }[] = [
  { h: 4.75, e: { tag: 'belegt', src: ['limde'], title: '04:45 – Die erste Welle', text: 'Etwa 600 Mann unter General Gazan setzen in 37 Booten über die Limmat. Kein Boot sinkt. Die Russen am Ufer werden völlig überrascht.' } },
  { h: 5.5, e: { tag: 'hintergrund', title: 'Pontoniere', text: 'Pontoniere waren Soldaten, die Brücken aus Booten bauten. Die Boote wurden nebeneinander verankert und mit Balken und Brettern belegt. Über so eine Brücke konnten auch Kanonen und Pferde fahren.' } },
  { h: 6, e: { tag: 'belegt', src: ['limde'], title: '06:00 – Kloster Fahr', text: 'Die Hochfläche beim Kloster Fahr ist genommen. General Markow wird verwundet gefangen.' } },
  { h: 7.5, e: { tag: 'belegt', src: ['limde'], title: '07:30 – Die Brücke steht', text: 'Unter Oberst Dedon ist die Schiffbrücke fertig. Um 9 Uhr ist Lorges ganze Division auf dem anderen Ufer, mit Geschützen.' } },
  { h: 9, e: { tag: 'belegt', src: ['zwde'], title: 'Die Linth', text: 'Schon um 2:30 Uhr in der Nacht ziehen Soults Schwimmer bei Schänis Flöße über die Linth. General Hotze reitet im Nebel auf Erkundung und wird erschossen. Ohne ihn weichen die Österreicher zurück.' } },
  { h: 10, e: { tag: 'belegt', src: ['zwen'], title: 'Korsakow glaubt an eine Finte', text: 'Korsakow hält den Angriff bei Dietikon lange für ein Ablenkungsmanöver. Er hat seine Reserve von 5.000 Mann nach Rapperswil geschickt und den Tross in der Stadt gelassen.' } },
  { h: 12, e: { tag: 'belegt', src: ['zwen'], title: 'Ablenkungen', text: 'Mortier greift bei Wollishofen am See an, Ménard täuscht Übergänge bei Vogelsang und Stilli vor. Der russische General Durasow lässt sich festhalten und erreicht Zürich erst in der Nacht.' } },
  { h: 14, e: { tag: 'hintergrund', title: 'Revolutionsarmee', text: 'Die Franzosen kämpften in Divisionen, die selbstständig marschieren und angreifen konnten. Schnelle, bewegliche Kolonnen waren ihre Stärke. Die Russen setzten auf feste Linien und das Bajonett.' } },
  { h: 16, e: { tag: 'belegt', src: ['zwde'], title: 'Oudinot am Zürichberg', text: 'Am Nachmittag greift Oudinot den Zürichberg an. Am Abend schließt sich Korsakow in der Stadt ein.' } },
  { h: 18, e: { tag: 'belegt', src: ['zwen'], title: 'Masséna zögert', text: 'Am Abend setzt Masséna seine Reserve nicht mehr ein. Das lässt Korsakow am nächsten Morgen den Ausbruch.' } },
];
export const Z_EPILOG: Entry[] = [
  { tag: 'belegt', src: ['zwen', 'zwde'], title: '26. September: Ausbruch', text: 'Korsakow bricht Richtung Winterthur aus. Er verliert dabei Tross, Kriegskasse und viele Geschütze. Von seiner Armee erreichen nur etwa 10.000 Mann den Rhein.' },
  { tag: 'belegt', src: ['zwen'], title: 'Suworow kommt zu spät', text: 'Am 25. September kämpft Suworow noch an der Schöllenen. Als er ins Muotatal kommt, ist Korsakow schon geschlagen. Er muss sich über den Pragelpass und den Panixpass durch die Alpen retten. Bald darauf verlässt Russland die Koalition gegen Frankreich.' },
  { tag: 'erfunden', title: 'Zahlen im Spiel', text: 'Belegt sind Truppenstärken, Orte, Uhrzeiten und der Ablauf. Wie schnell Boote fahren, wann die Russen etwas bemerken und wie Gefechte ausgehen, ist fürs Spiel geschätzt. Die Stärken der Ablenkungen und der Reserve sind vereinfacht.' },
];

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const hhmm = (h: number) => { const m = Math.round(h * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

export class ZGame {
  seed: number; rnd: () => number;
  phase: 'plan' | 'tick' | 'evening' | 'over' = 'plan';
  plan: Plan = { site: 'dietikon', start: 'hist', mortier: 'schwach', menard: 'stark', soult: 'nacht' };
  rapperswil = true;
  h = 4; // Uhrzeit am 25. September
  fr = { west: 8000, east: 0, guns: 26, gunsEast: 0, morale: 80, lost: 0, mortier: 0, menard: 0, reserve: 0, reserveEta: -1 as number, reserveUsed: false };
  bridge = -1; // -1 = nicht begonnen
  zone = 0;
  detected = false;
  mortierProg = 0;
  ru = { garrison: { vogelsang: 900, dietikon: 2600, wipkingen: 4500, wollishofen: 5000 } as Record<Sector, number>, pool: 12000, morale: 70, lost: 0, captured: 0 };
  travel: { to: Sector; n: number; eta: number }[] = [];
  scouted = new Set<Sector>();
  intensity: Record<Sector, number> = { vogelsang: 0, dietikon: 0, wipkingen: 0, wollishofen: 0 };
  linth = { ok: false, hotze: false, reported: false, helpH: 99, help: 0 };
  report: string[] = [];
  shown = new Set<number>();
  over = false; winner: ZSide | null = null; endText = ''; grade = '';

  constructor(seed: number) {
    this.seed = seed;
    let a = seed >>> 0;
    this.rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  r(a: number, b: number) { return a + this.rnd() * (b - a); }
  ri(a: number, b: number) { return Math.floor(this.r(a, b + 1)); }

  get zones() { return SITES[this.plan.site].zones; }
  get front() { return this.ru.garrison[this.plan.site]; }
  set front(v: number) { this.ru.garrison[this.plan.site] = Math.max(0, v); }
  get last() { return this.zones.length - 1; }
  menardSites(): Site[] { return (['vogelsang', 'dietikon', 'wipkingen'] as Site[]).filter(s => s !== this.plan.site); }
  dt() { return this.h < 7 ? 0.25 : this.h < 12 ? 0.5 : 1; }
  light(): 'dunkel' | 'Dämmerung' | 'Tag' { return this.h < 5.5 ? 'dunkel' : this.h < 6.75 ? 'Dämmerung' : 'Tag'; }
  suworow() { return this.h < 12 ? 'Suworow kämpft an der Schöllenen' : 'Suworow ist noch drei Tagesmärsche entfernt'; }

  dispatch(c: ZCmd) {
    if (c.t === 'plan' && this.phase === 'plan') return this.doPlan(c.plan, c.rapperswil);
    if (c.t === 'tick' && this.phase === 'tick') return this.tick(c.fr, c.ru);
    if (c.t === 'evening' && this.phase === 'evening') return this.evening(c.fr, c.ru);
  }

  doPlan(p: Plan, rapperswil: boolean) {
    this.plan = p; this.rapperswil = rapperswil;
    this.report = [];
    this.ru.garrison = { vogelsang: 900, dietikon: 2600, wipkingen: 4500, wollishofen: 5000 };
    if (!rapperswil) this.ru.pool += 5000;
    this.fr.mortier = DIV_MEN.mortier[p.mortier];
    this.fr.menard = DIV_MEN.menard[p.menard];
    this.fr.reserve = 12000 - this.fr.mortier - this.fr.menard;
    this.h = START_H[p.start];
    // Linth: Soult gegen Hotze, Ausgang wird später gemeldet
    const base = p.soult === 'nacht' ? 0.75 : p.soult === 'tag' ? 0.45 : 0;
    const chance = base + (rapperswil ? 0 : -0.2);
    this.linth.ok = this.rnd() < chance;
    this.linth.hotze = this.linth.ok && p.soult === 'nacht' && this.rnd() < 0.7;
    if (!this.linth.ok) { this.linth.help = p.soult === 'binden' ? 2000 : 4000; this.linth.helpH = p.soult === 'binden' ? 14 : 12.5; }
    this.phase = 'tick';
    this.report.push(`Der Übergang bei ${SITES[p.site].name} beginnt um ${hhmm(this.h)} Uhr.`);
    this.perceive();
  }

  perceive() {
    const n = () => this.r(0.7, 1.3);
    const main = this.plan.site;
    for (const s of SECTORS) this.intensity[s] = 0;
    if (this.detected) this.intensity[main] = (this.fr.east + this.fr.west * 0.3 + this.fr.guns * 60) * n();
    else this.intensity[main] = this.rnd() < 0.3 ? this.r(100, 400) : 0;
    this.intensity.wollishofen += this.fr.mortier * n();
    for (const s of this.menardSites()) this.intensity[s] += this.fr.menard / 2 * 1.6 * n();
  }
  trueStrength(s: Sector) {
    if (s === this.plan.site) return this.fr.east + this.fr.west;
    if (s === 'wollishofen') return this.fr.mortier;
    return this.fr.menard / 2;
  }

  tick(o: FOrder, ro: ROrder) {
    this.report = [];
    const dt = this.dt(), q = dt * 4, f = this.fr;
    const light = this.light();
    const hidden = !this.detected;
    // 1. Boote und Brücke
    const building = this.bridge >= 0 && this.bridge < 100;
    let cap = 600 * q * SITES[this.plan.site].bank * (building ? 0.4 : 1);
    if (this.bridge >= 100) cap += 2000 * q;
    const moved = Math.min(f.west, Math.round(cap));
    let lostBoats = 0;
    if (moved > 0) {
      if (this.detected) { const fire = this.front / (this.front + f.east + 1500) * (o === 'feuer' ? 0.5 : 1) * (this.zone > 0 ? 0.3 : 1); lostBoats = Math.round(moved * 0.14 * fire * (light === 'Tag' ? 2.2 : 1)); }
      if (light === 'dunkel' && this.plan.start === 'frueh' && this.rnd() < 0.5) { f.morale -= 3; this.report.push('In der Finsternis treiben Boote ab und landen an der falschen Stelle.'); }
      f.west -= moved; f.east += moved - lostBoats; f.lost += lostBoats;
      if (moved >= 300) this.report.push(`${moved - lostBoats} Mann setzen über${lostBoats ? `, ${lostBoats} gehen im Feuer verloren` : ''}.`);
    }
    if (this.bridge >= 100 && f.guns > 0) { const g = Math.min(f.guns, Math.round(8 * q)); f.guns -= g; f.gunsEast += g; }
    if (building) {
      const rate = (this.zone >= 1 ? 12 : this.detected ? 10 * f.east / (f.east + this.front * 1.5 + 1) : 9) * q;
      this.bridge = Math.min(100, this.bridge + rate);
      if (this.bridge >= 100) this.report.push('Die Schiffbrücke steht! Jetzt rollen Geschütze und Kolonnen hinüber.');
    }
    // 2. Entdeckung
    if (!this.detected && f.east > 0) {
      const p = (light === 'dunkel' ? 0.12 : light === 'Dämmerung' ? 0.28 : 0.55) * (0.5 + moved / 1200);
      if (this.rnd() < 1 - Math.pow(1 - p, q) || o === 'angriff' || o === 'feuer') { this.detected = true; this.report.push('Die russischen Posten schlagen Alarm!'); }
    }
    // 3. Befehl der Franzosen
    switch (o) {
      case 'angriff': this.attack(hidden); break;
      case 'feuer': {
        const guns = this.zone <= 1 ? f.guns + f.gunsEast : f.gunsEast;
        const k = Math.round(this.front * clamp(0.025 * q * guns / 26, 0, 0.15));
        this.front -= k; this.ru.lost += k; this.ru.morale -= 1;
        this.report.push(guns ? `${guns} Geschütze feuern. Die Russen verlieren ${k} Mann.` : 'Keine Geschütze in Reichweite.');
        break;
      }
      case 'bruecke':
        if (this.bridge < 0) { this.bridge = 0; this.report.push('Dedons Pontoniere beginnen mit der Schiffbrücke.'); }
        else this.report.push('Die Pontoniere arbeiten schon.');
        break;
      case 'reserve':
        if (!f.reserveUsed && f.reserve > 0) { f.reserveUsed = true; f.reserveEta = this.h + 1.5; this.report.push(`Kleins Reserve (${f.reserve} Mann) marschiert zur Übergangsstelle.`); }
        break;
      case 'sammeln': f.morale = Math.min(95, f.morale + 6); break;
    }
    if (f.reserveEta > 0 && this.h + dt >= f.reserveEta) { f.west += f.reserve; f.reserveEta = -1; this.report.push('Die Reserve ist an der Übergangsstelle angekommen.'); }
    // 4. Russischer Befehl
    this.ruOrder(ro);
    // 5. Verstärkungen kommen an
    for (const t of this.travel) if (this.h + dt >= t.eta) { this.ru.garrison[t.to] += t.n; t.n = 0; }
    this.travel = this.travel.filter(t => t.n > 0);
    // 5b. Ruhige Abschnitte schicken Truppen zum echten Übergang
    if (this.detected) for (const s of SECTORS) {
      if (s === this.plan.site) continue;
      const threat = s === 'wollishofen' ? this.fr.mortier : this.fr.menard / 2;
      if (threat < this.ru.garrison[s] * 0.35 && this.ru.garrison[s] > 600) {
        const n = Math.round(this.ru.garrison[s] * 0.5); this.ru.garrison[s] -= n;
        this.travel.push({ to: this.plan.site, n, eta: this.h + dt + 0.5 });
        this.report.push(`Bei ${SECTOR_NAME[s]} bleibt es ruhig. ${n} Russen marschieren zum Übergang.`);
      }
    }
    // 6. Ablenkung bei Wollishofen
    if (f.mortier > 0 && this.mortierProg < 100) {
      const g = this.ru.garrison.wollishofen;
      const ratio = f.mortier / Math.max(300, g);
      const lf = Math.round(f.mortier * 0.012 * q), lr = Math.round(g * 0.01 * q * Math.min(2, ratio));
      f.mortier -= lf; f.lost += lf; this.ru.garrison.wollishofen -= lr; this.ru.lost += lr;
      this.mortierProg = clamp(this.mortierProg + (ratio - 1.1) * 18 * q, 0, 100);
      if (this.mortierProg >= 100) { this.ru.morale -= 15; this.report.push('Mortier bricht bei Wollishofen durch und steht vor der Stadt!'); }
    }
    // 7. Linth
    if (!this.linth.reported && this.h + dt >= 9) {
      this.linth.reported = true;
      if (this.linth.ok) { this.ru.morale -= 10; this.report.push(this.linth.hotze ? 'Nachricht von der Linth: Hotze ist gefallen, die Österreicher weichen zurück!' : 'Nachricht von der Linth: Soult ist über den Fluss, die Österreicher weichen.'); }
      else this.report.push('Nachricht von der Linth: Die Österreicher halten. Hotze kann Truppen nach Zürich schicken.');
    }
    if (this.linth.help && this.h + dt >= this.linth.helpH) { this.ru.pool += this.linth.help; this.report.push(`${this.linth.help} Österreicher von der Linth erreichen Zürich.`); this.linth.help = 0; }
    // 8. Moral und Zeit
    f.morale = clamp(f.morale - (f.east > 0 && f.east < this.front * 0.5 ? 2 : 0), 10, 95);
    this.ru.morale = clamp(this.ru.morale, 5, 95);
    this.h += dt;
    this.perceive();
    if (this.detected && f.east < 150 && f.west < 150 && this.bridge < 100) return this.finish('ru', 'Der Übergang ist gescheitert. Die Russen halten das Ufer der Limmat. Zürich bleibt in der Hand der Verbündeten, bis Suworow kommt.', 'Sieg der Verbündeten');
    if (this.h >= 19) { this.phase = 'evening'; this.report.push('Die Nacht bricht herein.'); }
  }

  attack(hidden = false) {
    const f = this.fr;
    if (f.east < 50) { this.report.push('Am Ostufer ist niemand, der angreifen könnte.'); return; }
    if (this.zone >= this.last) { this.report.push('Der Zürichberg ist schon genommen.'); return; }
    const height = this.zone + 1 === this.last ? 1.6 : 1;
    const eff = f.east * (1 + f.gunsEast * 0.015) * (0.6 + 0.4 * f.morale / 100) * (hidden ? 2 : 1);
    const def = Math.max(250, this.front) * height * (0.7 + 0.3 * this.ru.morale / 100);
    const ratio = eff / def;
    const win = this.rnd() < clamp((ratio - 0.45) / 1.2, 0.05, 0.95);
    if (win) {
      const cap = Math.round(this.front * this.r(0.1, 0.2)), dead = Math.round(this.front * this.r(0.15, 0.25));
      this.front -= cap + dead; this.ru.lost += dead; this.ru.captured += cap;
      const l = Math.round(f.east * this.r(0.03, 0.07)); f.east -= l; f.lost += l;
      this.zone++; f.morale += 5; this.ru.morale -= 6;
      this.report.push(`Angriff! ${this.zones[this.zone]} ist genommen. ${cap} Gefangene, ${l} eigene Verluste.`);
      if (this.plan.site === 'dietikon' && this.zone === 1) this.report.push('General Markow ist verwundet und gefangen.');
      if (this.zone === this.last) { this.ru.morale -= 15; this.report.push('Die Trikolore weht auf dem Zürichberg! Korsakow ist in der Stadt eingeschlossen.'); }
    } else {
      const l = Math.round(f.east * this.r(0.08, 0.14)); f.east -= l; f.lost += l; f.morale -= 8;
      const k = Math.round(this.front * this.r(0.05, 0.1)); this.front -= k; this.ru.lost += k;
      this.report.push(`Der Angriff auf ${this.zones[this.zone + 1]} wird abgeschlagen. ${l} Mann verloren.`);
    }
  }

  ruOrder(o: ROrder) {
    const g = this.ru.garrison;
    if (o.t === 'send') {
      const n = Math.min(2000, this.ru.pool);
      if (!n) { this.report.push('Korsakow hat keine Reserven mehr in der Stadt.'); return; }
      this.ru.pool -= n;
      const d = DELAY[o.to] * (o.to === this.plan.site ? 1 - this.zone / (this.last + 1) : 1);
      this.travel.push({ to: o.to, n, eta: this.h + d });
      this.report.push(`Korsakow schickt ${n} Mann nach ${SECTOR_NAME[o.to]}.`);
    } else if (o.t === 'scout') {
      this.scouted.add(o.to);
      this.report.push(`Kosaken erkunden bei ${SECTOR_NAME[o.to]}: etwa ${Math.round(this.trueStrength(o.to) / 100) * 100} Franzosen.`);
    } else if (o.t === 'counter') {
      if (o.to === this.plan.site && this.fr.east > 0) {
        const r = g[o.to] * (0.6 + 0.4 * this.ru.morale / 100) / (this.fr.east * (1 + this.fr.gunsEast * 0.015) * (0.6 + 0.4 * this.fr.morale / 100));
        if (this.rnd() < clamp((r - 0.5) / 1.3, 0.05, 0.9)) {
          const into = this.zone === 0 && this.bridge < 100 && r > 1.5;
          const l = Math.round(this.fr.east * (into ? this.r(0.35, 0.5) : this.r(0.12, 0.2)));
          this.fr.east -= l; this.fr.lost += l; this.fr.morale -= 10; this.ru.morale += 6;
          if (this.zone > 0) this.zone--;
          this.report.push(into ? `Russischer Bajonettangriff! Die Franzosen werden in die Limmat getrieben, ${l} Mann verloren.` : `Russischer Gegenangriff! Die Franzosen weichen auf ${this.zones[this.zone]} zurück, ${l} Mann verloren.`);
        } else { const k = Math.round(g[o.to] * this.r(0.12, 0.2)); g[o.to] -= k; this.ru.lost += k; this.ru.morale -= 5; this.report.push(`Der russische Gegenangriff bei ${SECTOR_NAME[o.to]} bricht im Feuer zusammen (${k} Mann).`); }
      } else if (o.to === 'wollishofen' && this.fr.mortier > 0) {
        const l = Math.round(this.fr.mortier * this.r(0.08, 0.15)); this.fr.mortier -= l; this.fr.lost += l; this.mortierProg = Math.max(0, this.mortierProg - 30);
        const k = Math.round(g.wollishofen * 0.05); g.wollishofen -= k; this.ru.lost += k;
        this.report.push(`Bei Wollishofen werfen die Russen Mortier zurück (${l} Franzosen verloren).`);
      } else this.report.push(`Bei ${SECTOR_NAME[o.to]} stoßen die Russen ins Leere. Nur ein paar Plänkler, die sich zurückziehen.`);
    }
  }

  evening(fo: 'sperren' | 'ruhen', ro: 'ausbruch' | 'halten') {
    this.report = [];
    const f = this.fr;
    const ruTotal = this.ru.pool + SECTORS.reduce((a, s) => a + this.ru.garrison[s], 0);
    if (this.zone >= this.last) {
      if (ro === 'halten') {
        const relief = !this.linth.ok && this.rnd() < 0.25;
        if (relief) return this.finish('ru', 'Korsakow hält sich in Zürich. Die Österreicher von der Linth stoßen nach, Masséna muss sich teilen, und Suworow rückt näher. Die Stadt bleibt in der Hand der Verbündeten.', 'Knapper Sieg der Verbündeten');
        return this.finish('fr', `Korsakow bleibt in der Stadt und wird eingeschlossen. Nach drei Tagen kapituliert er mit ${Math.round(ruTotal / 100) * 100} Mann. Suworow kommt zu spät.`, 'Großer Sieg der Franzosen');
      }
      const block = fo === 'sperren' ? (f.reserveUsed ? f.west + f.east * 0.3 : f.reserve) : 0;
      const loss = Math.round(ruTotal * (fo === 'sperren' ? clamp(0.3 + block / 15000, 0.3, 0.7) : this.r(0.15, 0.25)));
      this.ru.lost += loss;
      if (fo === 'sperren' && block > 3000) return this.finish('fr', `Korsakow bricht nach Winterthur aus, doch die Straße ist gesperrt. Er verliert ${loss} Mann, den Tross, die Kasse und fast alle Geschütze. Seine Armee existiert kaum noch. Besser als Masséna 1799!`, 'Großer Sieg der Franzosen');
      return this.finish('fr', `Korsakow bricht nach Winterthur aus und verliert dabei ${loss} Mann, Tross und Kasse. So endete es auch 1799: Zürich ist französisch, Suworow kommt zu spät.`, 'Sieg der Franzosen, wie 1799');
    }
    if (this.zone >= 1 && ((this.zone >= this.last - 1 && f.east > this.front) || this.mortierProg >= 100)) return this.finish('fr', 'Die Franzosen stehen auf den Höhen vor Zürich. Korsakow räumt in der Nacht die Stadt und zieht sich zum Rhein zurück. Ein Sieg, aber Korsakows Armee entkommt fast unversehrt.', 'Knapper Sieg der Franzosen');
    if (this.zone >= 1 || f.east > 2000) return this.finish('ru', 'Die Franzosen halten einen Brückenkopf, aber Zürich nicht. Die Russen verschanzen sich, und Suworow rückt aus den Bergen heran. Masséna muss zurück.', 'Sieg der Verbündeten');
    return this.finish('ru', 'Der Übergang hat nichts gebracht. Die Russen halten die Limmat. Zürich bleibt in der Hand der Verbündeten.', 'Klarer Sieg der Verbündeten');
  }

  finish(w: ZSide, text: string, grade: string) { this.phase = 'over'; this.over = true; this.winner = w; this.endText = text; this.grade = grade; }

  // ---------- KI ----------
  static aiPlan(rnd: () => number): Plan {
    const x = rnd();
    return { site: x < 0.6 ? 'dietikon' : x < 0.8 ? 'vogelsang' : 'wipkingen', start: rnd() < 0.7 ? 'hist' : 'frueh', mortier: rnd() < 0.5 ? 'stark' : 'schwach', menard: rnd() < 0.6 ? 'stark' : 'schwach', soult: 'nacht' };
  }
  aiFr(): FOrder {
    const f = this.fr;
    if (this.bridge < 0 && (f.east >= 1500 || this.zone >= 1)) return 'bruecke';
    if (!f.reserveUsed && (this.zone >= 1 || this.h >= 8) && f.reserve > 0) return 'reserve';
    if (!this.detected && f.east >= 1000 && f.east * 2 > Math.max(250, this.front) * 1.1) return 'angriff';
    if (f.east < 400) return this.detected ? 'feuer' : 'sammeln';
    const def = Math.max(250, this.front) * (this.zone + 1 === this.last ? 1.6 : 1);
    if (f.east * (this.detected ? 1 : 2) > def * 1.4) return 'angriff';
    if (this.zone <= 1 && this.detected) return 'feuer';
    return f.morale < 50 ? 'sammeln' : f.east > def ? 'angriff' : 'sammeln';
  }
  aiRu(): ROrder {
    // Korsakow traut Meldungen aus Dietikon nicht ganz (historisch: hielt es für eine Finte)
    const score = (s: Sector) => {
      const seen = this.scouted.has(s) ? this.trueStrength(s) : this.intensity[s] * (s === this.plan.site && this.fr.menard > 0 && this.fr.east < 4000 ? 0.6 : 1);
      return seen - this.ru.garrison[s] * 0.9 - this.travel.filter(t => t.to === s).reduce((a, t) => a + t.n, 0);
    };
    const best = SECTORS.slice().sort((a, b) => score(b) - score(a))[0];
    const main = this.plan.site;
    if (this.detected && this.fr.east > 0 && this.front > this.fr.east * 1.4 && this.rnd() < 0.6) return { t: 'counter', to: main };
    const unknown = SECTORS.filter(s => !this.scouted.has(s) && this.intensity[s] > 800);
    if (unknown.length && this.rnd() < 0.25) return { t: 'scout', to: unknown[Math.floor(this.rnd() * unknown.length)] };
    if (this.ru.pool > 0 && score(best) > 0) return { t: 'send', to: best };
    return { t: 'hold' };
  }
  aiEveningFr(): 'sperren' | 'ruhen' { return !this.fr.reserveUsed || this.fr.west > 3000 ? 'sperren' : 'ruhen'; }
  aiEveningRu(): 'ausbruch' | 'halten' { return !this.linth.ok && this.rnd() < 0.4 ? 'halten' : 'ausbruch'; }
}
