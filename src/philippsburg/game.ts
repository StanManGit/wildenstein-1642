// Kapitel 4: Belagerung von Philippsburg, 25. August bis 12. September 1644
// Runde = ein Tag. Belagerer verteilt Arbeitstrupps, Verteidiger wählt eine Maßnahme.
import { mulberry32 } from '../sim';
import type { Entry } from '../history';

export type PSide = 'fr' | 'imp';
export type Task = 'ring' | 'graben' | 'batterie' | 'mine' | 'fuellen';
export type DAction = 'ausfall' | 'kanonen' | 'ausbessern' | 'gegenmine' | 'ruhe';
export type PCmd = { t: 'att'; alloc: Record<Task, number>; storm?: 'zoll' | 'haupt' | null; offer?: boolean } | { t: 'def'; a: DAction } | { t: 'terms'; accept: boolean };

export const DAYS = 22; // 25. August bis 15. September
export function pDate(d: number) { const n = 24 + d; return n <= 31 ? `${n}. August 1644` : `${n - 31}. September 1644`; }

export const TASKS: Record<Task, { name: string; info: string }> = {
  ring: { name: 'Schanzring gegen Entsatz', info: 'Ein Ring aus Schanzen nach außen (Zirkumvallation), damit Mercys Entsatzheer nicht durchkommt.' },
  graben: { name: 'Laufgräben vortreiben', info: 'Im Zickzack an die Festung heran. Ohne Laufgräben keine Batterien und Minen.' },
  batterie: { name: 'Batterien bauen', info: 'Geschützstellungen. Sie zerschießen Wälle und feindliche Geschütze. Erst ab 400 m Nähe.' },
  mine: { name: 'Minen graben', info: 'Stollen unter den Wall, mit Pulver gesprengt. Erst wenn die Laufgräben am Graben sind.' },
  fuellen: { name: 'Graben füllen', info: 'Reisigbündel und Sandsäcke in den Festungsgraben, bis man auf den Wall kommt.' },
};
export const DACTIONS: Record<DAction, { name: string; info: string }> = {
  ausfall: { name: 'Ausfall', info: 'Mit Fußvolk und Reitern die Laufgräben überfallen und Arbeit zerstören. Kostet Männer.' },
  kanonen: { name: 'Geschütze ersetzen', info: 'Zerstörte Geschütze aus dem Zeughaus nachführen. Es fehlt an Kanonieren, nicht an Kanonen.' },
  ausbessern: { name: 'Wall ausbessern', info: 'Nachts Breschen mit Erde, Faschinen und Palisaden schließen.' },
  gegenmine: { name: 'Gegenminen', info: 'Eigene Stollen graben, um feindliche Minen aufzuspüren und zu zerstören.' },
  ruhe: { name: 'Ruhen', info: 'Die Männer schlafen. Die Moral erholt sich.' },
};

export const P_SOURCES: Record<string, { name: string; url: string }> = {
  merianP: { name: 'Merian, Topographia Palatinatus Rheni 1645: Philipsburg (Wikisource)', url: 'https://de.wikisource.org/wiki/Topographia_Palatinatus_Rheni:_Philipsburg' },
  phwen: { name: 'Wikipedia (engl.): Siege of Philippsburg (1644)', url: 'https://en.wikipedia.org/wiki/Siege_of_Philippsburg_(1644)' },
  phde: { name: 'Wikipedia: Philippsburg', url: 'https://de.wikipedia.org/wiki/Philippsburg' },
};

export const P_CHRONICLE: Entry[] = [
  { tag: 'belegt', src: ['phwen', 'merianP'], title: 'Die Festung wird eingeschlossen', text: 'Nach Freiburg ziehen die Franzosen unter Enghien und Turenne zu Wasser und zu Land von Breisach den Rhein hinunter. Am 25. August schließen rund 5.000 Mann Philippsburg ein. Zuerst bauen sie einen Ring aus Schanzen gegen Mercys Entsatz.' },
  { tag: 'belegt', src: ['phwen'], title: 'Die Schanze im Nordwesten', text: 'Am 26. August gibt Oberst Caspar Baumberger die Schanze im Nordwesten auf. Er wagt einen Ausfall mit 300 Mann zu Fuß und 100 Reitern.' },
  { tag: 'belegt', src: ['phde'], title: 'Philippsburg', text: 'Bischof Philipp Christoph von Sötern ließ den Ort Udenheim bis 1623 zur Festung ausbauen. Sie wurde nach ihm Philippsburg genannt.' },
  { tag: 'belegt', src: ['merianP'], title: 'Ein trockener Sumpf', text: 'Merian beschreibt die Festung „an einem sumpfigen morastigen Ort“ dicht am Rhein. Der Sumpf war ihr bester Schutz, aber der heiße Sommer 1644 hatte ihn ausgetrocknet.' },
  { tag: 'belegt', src: ['merianP'], title: 'Die Zollschanze', text: 'Am Rhein lag eine Zollschanze, die den Fluss sperrte. Die Franzosen erstürmten sie.' },
  { tag: 'belegt', src: ['phwen'], title: '30. August: Die Batterien eröffnen das Feuer', text: 'Ab heute beschießen französische Batterien die Wälle. Die Geschütze der Verteidiger werden immer wieder zerstört und aus dem Zeughaus ersetzt.' },
  { tag: 'belegt', src: ['phwen'], title: 'Hundert Kanonen, drei Kanoniere', text: 'Im Zeughaus lagen etwa 100 Geschütze. Doch pro Flanke konnten nur drei gleichzeitig feuern, weil Leute und Platz fehlten. Die Besatzung zählte nur rund 500 Mann.' },
  { tag: 'hintergrund', title: 'Laufgräben im Zickzack', text: 'Belagerer gruben sich im Zickzack an eine Festung heran. So konnten die Verteidiger die Gräben nicht der Länge nach beschießen.' },
  { tag: 'belegt', src: ['phwen'], title: 'Mercy wartet', text: 'Der bayerische Feldmarschall Mercy stand mit seinem Heer bei Neckarsulm und wartete auf Verstärkung durch Hatzfeld. Johann von Werth sollte mit über 1.000 Reitern die Belagerer stören.' },
  { tag: 'belegt', src: ['merianP'], title: 'Drei Minen', text: 'Die Franzosen gruben drei Minen unter die Wälle. Sie wurden mit Pulver gefüllt und gesprengt.' },
  { tag: 'belegt', src: ['merianP'], title: 'Reisig und Sandsäcke', text: 'An zwei Stellen füllten die Franzosen den Festungsgraben mit Reisigbündeln und Sandsäcken auf, bis sie auf die Wälle gelangen konnten.' },
  { tag: 'belegt', src: ['phde'], title: 'Baumbergers Husarenstück', text: 'Derselbe Baumberger hatte die Festung im Januar 1635 zurückgeholt: In einer eiskalten Nacht erstieg er mit seinen Männern die Mauern, weil die Franzosen schlecht Wache hielten.' },
  { tag: 'hintergrund', title: 'Mineure', text: 'Mineure waren oft Bergleute. Sie lauschten unter der Erde auf das Klopfen der Gegner. Trafen zwei Stollen aufeinander, wurde im Dunkeln gekämpft.' },
  { tag: 'hintergrund', title: 'Zirkumvallation', text: 'Ein Belagerungsheer baute zwei Ringe: einen nach innen gegen Ausfälle und einen nach außen gegen ein Entsatzheer. Dazwischen lag das Lager.' },
  { tag: 'belegt', src: ['phwen'], title: '9. September: Baumberger bietet die Übergabe an', text: 'Nach Beschuss, Minen und aufgefüllten Gräben bietet der Kommandant die Übergabe an.' },
  { tag: 'hintergrund', title: 'Ehrenvoller Abzug', text: 'Wer rechtzeitig verhandelte, bekam freien Abzug mit Waffen, Fahnen und oft ein paar Geschützen. Wer sich erstürmen ließ, riskierte alles.' },
  { tag: 'belegt', src: ['phwen'], title: '12. September: Abzug', text: 'Baumberger zieht mit dem Rest der Besatzung und zwei Geschützen ab. Philippsburg bleibt bis 1676 französisch.' },
  { tag: 'belegt', src: ['phwen'], title: 'Der Rhein fällt', text: 'Nach Philippsburg fallen Worms, Oppenheim, Mainz und Landau an die Franzosen.' },
  { tag: 'erfunden', title: 'Zahlen im Spiel', text: 'Arbeitsfortschritt, Verluste pro Tag und der Tag, an dem Mercy kommen könnte, sind im Spiel geschätzt. Belegt sind die Stärken, die Daten und die Abfolge der Ereignisse.' },
  { tag: 'hintergrund', title: 'Pulvermangel', text: 'Eine Belagerung verschlang Tonnen von Pulver. Jede Batterie brauchte ständigen Nachschub, hier auf dem Rhein von Breisach.' },
  { tag: 'hintergrund', title: 'Herbst', text: 'Mit dem Herbstregen kehrte das Wasser in die Sümpfe zurück. Jeder Tag Verzögerung machte die Belagerung schwerer.' },
  { tag: 'hintergrund', title: 'Ende der Saison', text: 'Im Winter ruhten die Feldzüge meist. Wer bis dahin keine Festung genommen hatte, musste abziehen.' },
];

export class PGame {
  rnd: () => number;
  day = 1;
  phase: PSide = 'fr';
  // Belagerer
  fr = { men: 5000, morale: 75, powder: 100 };
  ring = 0; dist = 600; batteries = 0; batProg = 0; mines = [0, 0, 0]; minesBlown = 0; fill = [0, 0];
  zoll = true; nw = true;
  // Verteidiger
  imp = { men: 500, morale: 70, gunners: 30 };
  guns = 6; arsenal = 94; wall = 100;
  relief = { day: 0, known: false };
  rainToday = false;
  over = false; winner: PSide | null = null; endText = '';
  report: string[] = [];
  pendingTerms = false;
  history: PCmd[] = [];
  lastAlloc: Record<Task, number> = { ring: 4, graben: 4, batterie: 1, mine: 0, fuellen: 1 };

  constructor(seed: number) {
    this.rnd = mulberry32(seed);
    this.relief.day = 16 + Math.floor(this.rnd() * 8);
  }
  r(a: number, b: number) { return a + (b - a) * this.rnd(); }
  ri(a: number, b: number) { return Math.round(this.r(a, b)); }

  breach() {
    const fillAvg = (this.fill[0] + this.fill[1]) / 2;
    const b = (100 - this.wall) * 0.6 + this.minesBlown * 18 + fillAvg * 0.3;
    return Math.max(0, Math.min(100, Math.round(b)));
  }
  stormChance() {
    const b = this.breach() / 100;
    const def = Math.min(1, this.imp.men / 500) * (0.4 + 0.6 * this.imp.morale / 100);
    return Math.max(0, Math.min(0.95, b * 1.1 * (1 - 0.6 * def) * (0.6 + 0.4 * this.fr.morale / 100)));
  }

  dispatch(c: PCmd) {
    if (this.over) return;
    this.history.push(c);
    if (c.t === 'terms') { this.pendingTerms = false; if (c.accept) this.finish('fr', 'Baumberger übergibt die Festung gegen ehrenvollen Abzug, so wie am 9. September 1644. Er zieht mit dem Rest der Besatzung und zwei Geschützen ab.'); else { this.imp.morale += 4; this.report.push('Die Besatzung lehnt die Übergabe ab.'); } return; }
    if (c.t === 'att' && this.phase === 'fr') { this.attTurn(c.alloc, c.storm || null); if (!this.over && c.offer && this.canOfferTerms()) { this.pendingTerms = true; this.report.push('Ein Trompeter bringt das Angebot: freier Abzug mit Waffen, wenn die Festung übergeben wird.'); } if (!this.over) this.phase = 'imp'; return; }
    if (c.t === 'def' && this.phase === 'imp') { this.defTurn(c.a); if (!this.over) this.endDay(); }
  }

  attTurn(alloc: Record<Task, number>, storm: 'zoll' | 'haupt' | null) {
    this.report = [];
    this.lastAlloc = { ...alloc };
    const tot = Object.values(alloc).reduce((a, b) => a + b, 0) || 1;
    const work = Math.min(1, this.fr.men / 5000) * (0.5 + 0.5 * this.fr.morale / 100) * (this.rainToday ? 0.6 : 1);
    const share = (t: Task) => alloc[t] / tot * work * 10;
    this.ring = Math.min(100, this.ring + share('ring') * 4.5);
    const adv = share('graben') * (this.dist > 200 ? 28 : 14);
    this.dist = Math.max(0, this.dist - adv);
    if (this.dist <= 400) { this.batProg += share('batterie') * 18; while (this.batProg >= 100 && this.batteries < 6) { this.batProg -= 100; this.batteries++; this.report.push(`Eine neue Batterie ist fertig (${this.batteries}).`); } }
    else if (alloc.batterie) this.report.push('Batterien gehen erst ab 400 m Nähe.');
    if (this.dist <= 40) {
      const m = this.mines.findIndex(x => x < 100);
      if (m >= 0) { this.mines[m] = Math.min(100, this.mines[m] + share('mine') * 16); if (this.mines[m] >= 100) { this.minesBlown++; this.wall -= 15; this.report.push(`Mine ${m + 1} wird gezündet! Ein Stück Wall fliegt in die Luft.`); } }
      const f = this.fill[0] <= this.fill[1] ? 0 : 1;
      this.fill[f] = Math.min(100, this.fill[f] + share('fuellen') * 14);
    } else if (alloc.mine || alloc.fuellen) this.report.push('Minen und Grabenfüllung gehen erst, wenn die Laufgräben am Graben sind.');
    // Batterien schießen
    if (this.batteries > 0 && this.fr.powder > 0) {
      const dmg = this.batteries * this.r(1.2, 2.4) * (this.rainToday ? 0.6 : 1);
      this.wall = Math.max(0, this.wall - dmg);
      const lost = Math.min(this.guns, Math.floor(this.batteries * this.r(0.15, 0.45)));
      this.guns -= lost;
      this.fr.powder -= this.batteries * 0.8;
      this.report.push(`Die Batterien beschießen die Wälle${lost ? `, ${lost} Geschütze der Verteidiger zerstört` : ''}.`);
    }
    // Feuer der Verteidiger auf die Arbeiter
    const exposure = 1 + (600 - this.dist) / 300;
    const k = Math.round(this.guns * this.r(1.5, 4) * exposure * (this.imp.gunners / 30));
    this.fr.men -= k;
    if (k) this.report.push(`Das Feuer der Festung trifft die Schanzarbeiter: ${k} Mann Verluste.`);
    // Sturm
    if (storm === 'zoll' && this.zoll) {
      if (this.rnd() < 0.7) { this.zoll = false; const l = this.ri(40, 90); this.fr.men -= l; this.imp.men -= this.ri(10, 25); this.imp.morale -= 8; this.report.push(`Die Zollschanze am Rhein wird erstürmt (${l} Mann Verlust). Der Fluss ist jetzt frei für den Nachschub.`); this.fr.powder += 30; }
      else { const l = this.ri(60, 120); this.fr.men -= l; this.fr.morale -= 6; this.report.push(`Der Sturm auf die Zollschanze scheitert (${l} Mann Verlust).`); }
    }
    if (storm === 'haupt') {
      const p = this.stormChance();
      if (this.rnd() < p) { this.finish('fr', 'Die Franzosen stürmen über die aufgefüllten Gräben und Breschen in die Festung. Philippsburg ist erstürmt. Historisch bot Baumberger rechtzeitig die Übergabe an und bekam freien Abzug.'); this.fr.men -= this.ri(200, 500); return; }
      const l = this.ri(250, 600); this.fr.men -= l; this.fr.morale -= 15; this.imp.men -= this.ri(15, 50); this.imp.morale += 8;
      this.report.push(`Der Sturm auf den Hauptwall wird abgeschlagen! ${l} Franzosen fallen.`);
    }
    this.clamp();
    this.check();
  }

  canOfferTerms() { return this.breach() >= 30 || this.day >= 12; }

  defTurn(a: DAction) {
    switch (a) {
      case 'ausfall': {
        const ok = this.rnd() < 0.4 + this.imp.morale / 300 + (this.dist < 200 ? 0.1 : 0);
        if (ok) { const back = this.r(30, 70); this.dist = Math.min(600, this.dist + back); const k = this.ri(60, 180); this.fr.men -= k; const l = this.ri(8, 25); this.imp.men -= l; this.imp.morale += 6; if (this.mines.some(m => m > 0 && m < 100) && this.rnd() < 0.4) { const i = this.mines.findIndex(m => m > 0 && m < 100); this.mines[i] = 0; this.report.push('Beim Ausfall wird ein Minenstollen zerstört!'); }
          this.report.push(`Ausfall! Die Laufgräben werden um ${Math.round(back)} m zurückgeworfen, ${k} Franzosen fallen, ${l} eigene Verluste.`); }
        else { const l = this.ri(25, 60); this.imp.men -= l; this.imp.morale -= 8; this.report.push(`Der Ausfall bleibt im Feuer der Laufgräben stecken. ${l} Mann verloren.`); }
        break;
      }
      case 'kanonen': {
        const can = Math.min(this.arsenal, 6 - this.guns, Math.floor(this.imp.gunners / 5));
        this.guns += can; this.arsenal -= can; this.imp.gunners = Math.max(5, this.imp.gunners - (can ? 1 : 0));
        this.report.push(can ? `${can} Geschütze aus dem Zeughaus auf die Wälle gebracht.` : 'Alle Geschützstände sind besetzt, oder es fehlen Kanoniere.');
        break;
      }
      case 'ausbessern': { const p = this.r(4, 9) * Math.min(1, this.imp.men / 400); this.wall = Math.min(100, this.wall + p); this.fill = this.fill.map(f => Math.max(0, f - this.r(3, 8))); this.report.push(`Nachts werden Breschen verbaut und Faschinen aus dem Graben gezogen (+${Math.round(p)} Wall).`); break; }
      case 'gegenmine': {
        const i = this.mines.findIndex(m => m > 0 && m < 100);
        if (i >= 0 && this.rnd() < 0.55) { this.mines[i] = 0; this.report.push('Die Gegenmineure stoßen auf einen feindlichen Stollen und sprengen ihn!'); }
        else this.report.push('Die Gegenmineure lauschen in der Tiefe, finden aber nichts.');
        this.imp.men -= this.ri(0, 4);
        break;
      }
      case 'ruhe': this.imp.morale += 6; this.report.push('Die Besatzung ruht.'); break;
    }
    this.clamp();
    this.check();
  }

  endDay() {
    // Moral
    this.imp.morale -= 1 + (100 - this.wall) / 40 + this.minesBlown;
    if (!this.zoll) this.imp.morale -= 1;
    this.fr.morale += this.batteries > 0 ? 0.5 : 0;
    this.fr.morale -= this.day > 14 ? 2 : 0;
    // Entsatz
    if (this.day === this.relief.day - 4 && !this.relief.known) { this.relief.known = true; this.report.push('Kundschafter melden: Mercy sammelt bei Neckarsulm ein Entsatzheer. Johann von Werths Reiter streifen schon heran.'); }
    if (this.day >= this.relief.day - 3 && this.day < this.relief.day) { const k = this.ri(20, 60); this.fr.men -= k; this.report.push(`Werths Reiter überfallen Fouragiere und Wagenzüge: ${k} Mann Verluste.`); }
    if (this.day === this.relief.day) {
      if (this.ring >= 70) { const k = this.ri(150, 400); this.fr.men -= k; this.imp.morale -= 20; this.report.push(`Mercys Entsatz rennt gegen den Schanzring an und wird abgewiesen (${k} Mann Verluste). Die Besatzung verliert die letzte Hoffnung.`); }
      else { this.finish('imp', `Mercys Entsatzheer bricht durch den unfertigen Schanzring (${Math.round(this.ring)} %). Die Franzosen müssen die Belagerung aufheben. Historisch kam der Entsatz nicht rechtzeitig, und Philippsburg fiel.`); return; }
    }
    this.rainToday = this.day > 10 ? this.rnd() < 0.25 : this.rnd() < 0.08;
    this.clamp();
    this.check();
    if (this.over) return;
    this.day++;
    if (this.day > DAYS) { this.finish('imp', 'Mitte September: Herbstregen füllen die Sümpfe, die Franzosen müssen abbrechen. Philippsburg hält. Historisch fiel die Festung am 12. September.'); return; }
    this.phase = 'fr';
  }

  clamp() {
    this.fr.men = Math.max(0, Math.round(this.fr.men)); this.imp.men = Math.max(0, Math.round(this.imp.men));
    this.fr.morale = Math.max(0, Math.min(100, this.fr.morale)); this.imp.morale = Math.max(0, Math.min(100, this.imp.morale));
    this.wall = Math.max(0, Math.min(100, this.wall)); this.fr.powder = Math.max(0, this.fr.powder);
  }

  check() {
    if (this.over) return;
    if (this.imp.men < 120 || this.imp.morale <= 0) this.finish('fr', 'Die Besatzung ist am Ende und ergibt sich. Historisch handelte Baumberger am 9. September einen ehrenvollen Abzug aus.');
    else if (this.fr.men < 2000 || this.fr.morale <= 0) this.finish('imp', 'Die Franzosen haben zu viele Männer verloren und heben die Belagerung auf. Historisch fiel Philippsburg am 12. September.');
  }

  finish(w: PSide, text: string) { this.over = true; this.winner = w; this.endText = text; }

  // ---------- KI ----------
  aiAtt(): PCmd {
    const a: Record<Task, number> = { ring: 0, graben: 0, batterie: 0, mine: 0, fuellen: 0 };
    let squads = 10;
    const put = (t: Task, n: number) => { const k = Math.min(squads, n); a[t] += k; squads -= k; };
    if (this.ring < 75) put('ring', this.day < 4 ? 5 : 2);
    if (this.dist > 40) put('graben', 5);
    if (this.dist <= 400 && this.batteries < 5) put('batterie', 3);
    if (this.dist <= 40) { put('mine', 3); put('fuellen', 3); }
    put('graben', squads);
    let storm: 'zoll' | 'haupt' | null = null;
    if (this.zoll && this.day >= 4) storm = 'zoll';
    else if (this.stormChance() > 0.5) storm = 'haupt';
    return { t: 'att', alloc: a, storm, offer: !storm && this.canOfferTerms() && this.imp.morale < 45 };
  }
  aiDef(): DAction {
    if (this.guns < 4 && this.arsenal > 0) return 'kanonen';
    if (this.mines.some(m => m > 30 && m < 100)) return 'gegenmine';
    if (this.dist < 300 && this.imp.morale > 45 && this.rnd() < 0.45) return 'ausfall';
    if (this.wall < 80) return 'ausbessern';
    return this.imp.morale < 50 ? 'ruhe' : 'ausfall';
  }
  aiAcceptTerms() { return this.rnd() < Math.max(0.05, (65 - this.imp.morale) / 50 + this.breach() / 200); }
}
