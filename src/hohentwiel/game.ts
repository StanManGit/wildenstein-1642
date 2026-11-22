// Kapitel 3: Hohentwiel unter Konrad Widerholt, 1634–1650
// Runde = eine Jahreszeit. Alle Züge laufen als Befehle über dispatch(), Zufall gesät.
import { mulberry32 } from '../sim';
import type { Entry } from '../history';

export const SEASONS = ['Herbst', 'Winter', 'Frühling', 'Sommer'];
export const TURNS = 64; // Herbst 1634 bis Sommer 1650
export function seasonText(t: number) {
  const s = t % 4, base = 1634 + Math.floor(t / 4);
  if (s === 0) return `Herbst ${base}`;
  if (s === 1) return `Winter ${base}/${String((base + 1) % 100).padStart(2, '0')}`;
  return `${SEASONS[s]} ${base + 1}`;
}

export interface Siege { name: string; turnsLeft: number; strength: number; blockade: boolean; relief: number; hist?: string }

export type HAction = 'kontrib' | 'raub' | 'geisel' | 'werben' | 'schweiz' | 'bauen' | 'exerzieren' | 'ausfall' | 'rationen' | 'bote' | 'halten';
export type HCmd = { t: 'act'; a: HAction } | { t: 'choose'; i: number };

export interface HEvent { id: string; turn: number; tag: Entry['tag']; title: string; text: string; options: { label: string; effect: string }[]; hist?: number }

export const H_SOURCES: Record<string, { name: string; url: string }> = {
  twiel: { name: 'Wikipedia: Festung Hohentwiel', url: 'https://de.wikipedia.org/wiki/Festung_Hohentwiel' },
  wider: { name: 'Deutsche Biographie: Konrad Widerholt', url: 'https://www.deutsche-biographie.de/sfz85408.html' },
  brosig: { name: 'Brosig: Die Belagerung des Hohentwiels 1641 (Hegau-Geschichtsverein)', url: 'https://www.hegau-geschichtsverein.de/wp-content/uploads/hegau_4950_199293_brosig_belagerung_hohentwiels_1641.pdf' },
  rezess: { name: 'Schadelbauer: Der hohentwielische Rezess 1644 (Hegau-Geschichtsverein)', url: 'https://www.hegau-geschichtsverein.de/wp-content/uploads/hegau_26_1969_schadelbauer_hohentwielische_recess_1644.pdf' },
};

// Feste historische Belagerungen (Jahreszeit-Index)
export const SIEGES: { turn: number; s: Siege }[] = [
  { turn: 5, s: { name: 'Erste Belagerung 1635/36', turnsLeft: 3, strength: 2500, blockade: false, relief: 0 } },
  { turn: 19, s: { name: 'Belagerung 1639', turnsLeft: 2, strength: 3000, blockade: false, relief: 0 } },
  { turn: 22, s: { name: 'Belagerung 1640', turnsLeft: 2, strength: 3000, blockade: false, relief: 0 } },
  { turn: 28, s: { name: 'Belagerung 1641/42 unter Sparr und de Haes', turnsLeft: 3, strength: 4500, blockade: false, relief: 0, hist: 'Ab Oktober 1641 beschossen die Kaiserlichen unter Sparr und de Haes die Festung, warfen Feuer und gruben Minen. Als das Entsatzheer unter Erlach anrückte, zogen sie ab.' } },
  { turn: 39, s: { name: 'Blockade 1644 unter Mercy', turnsLeft: 3, strength: 3000, blockade: true, relief: 0 } },
];

export const EVENTS: HEvent[] = [
  { id: 'pest', turn: 4, tag: 'belegt', title: 'Die Pest', text: 'In der überfüllten Festung bricht die Pest aus. Bei der Seuche 1635/36 starben auf dem Hohentwiel etwa 150 Menschen. Widerholt schickte Frauen und Kinder fort.',
    options: [{ label: 'Frauen und Kinder fortschicken (wie Widerholt)', effect: 'Weniger Esser, aber die Moral sinkt.' }, { label: 'Alle bleiben in der Festung', effect: 'Mehr Tote durch die Seuche, die Moral hält.' }], hist: 0 },
  { id: 'befehl', turn: 9, tag: 'belegt', title: 'Der Befehl des Herzogs', text: 'Herzog Eberhard III. von Württemberg will die Festung dem Kaiser übergeben, um sich mit ihm zu versöhnen. Er befiehlt Widerholt die Übergabe. (Die Quellen datieren das auf 1636 oder 1637.)',
    options: [{ label: 'Gehorchen und übergeben', effect: 'Die Festung fällt an den Kaiser. Das Spiel endet.' }, { label: 'Den Befehl verweigern (wie Widerholt)', effect: 'Du hältst die Festung auf eigene Faust für die evangelische Sache.' }], hist: 1 },
  { id: 'weimar', turn: 12, tag: 'belegt', title: 'Bernhard von Weimar', text: 'November 1637: Herzog Bernhard von Sachsen-Weimar, der im Bund mit Frankreich kämpft, bietet einen Vertrag an: Unterstützung gegen Treue.',
    options: [{ label: 'Vertrag schließen (wie Widerholt)', effect: 'Geld und Hilfe bei Belagerungen.' }, { label: 'Allein bleiben', effect: 'Keine Verpflichtungen, aber auch kein Entsatz.' }], hist: 0 },
  { id: 'pension', turn: 20, tag: 'belegt', title: 'Ein Angebot aus Paris', text: 'Bernhard von Weimar ist 1639 gestorben. Der König von Frankreich bietet Widerholt eine Pension an.',
    options: [{ label: 'Annehmen (wie Widerholt)', effect: 'Regelmäßiges Geld aus Frankreich.' }, { label: 'Ablehnen', effect: 'Unabhängigkeit, aber kein Geld.' }], hist: 0 },
  { id: 'wildenstein', turn: 31, tag: 'belegt', title: 'Ein Fest in Meßkirch', text: 'August 1642: Kundschafter melden, dass der Kommandant der Burg Wildenstein mit fast allen Musketieren auf einem Fest in Meßkirch ist. (Der Überfall steht in den Quellen zu Wildenstein, nicht in denen zu Widerholt. Kapitel 1 erzählt die Folgen.)',
    options: [{ label: 'Einen Trupp hinschicken', effect: 'Beute und Ruhm, aber Männer sind gebunden und die Bayern werden wütend.' }, { label: 'Nicht einmischen', effect: 'Nichts geschieht.' }], hist: 0 },
  { id: 'ueberlingen', turn: 33, tag: 'belegt', title: 'Überlingen', text: 'Januar 1643: Die Reichsstadt Überlingen am Bodensee ist schwach bewacht. Ein Handstreich ist möglich.',
    options: [{ label: 'Überfall wagen (wie Widerholt)', effect: 'Große Beute, die Stadt geht an die Franzosen. Großer Zorn der Gegner.' }, { label: 'Zu gefährlich', effect: 'Nichts geschieht.' }], hist: 0 },
  { id: 'rezess', turn: 38, tag: 'belegt', title: 'Der Rezess', text: 'Mai 1644: Bayern bietet einen Vertrag an: Amnestie und Versorgung der Besatzung, dafür dürfte die Festung nur noch sich selbst verteidigen. Historisch wurde der Rezess ausgehandelt, aber nie bestätigt. Danach folgte eine Blockade.',
    options: [{ label: 'Verhandeln, aber nicht unterschreiben (wie 1644)', effect: 'Etwas Zeit gewonnen, danach droht Blockade.' }, { label: 'Annehmen', effect: 'Versorgung gesichert, aber keine Raubzüge mehr bis Kriegsende.' }, { label: 'Ablehnen', effect: 'Freie Hand, aber sicher eine Blockade.' }], hist: 0 },
  { id: 'frieden', turn: 56, tag: 'belegt', title: 'Der Westfälische Friede', text: 'Oktober 1648: In Münster und Osnabrück wird der Friede geschlossen. Der Krieg ist vorbei. Widerholt hält die Festung noch bis 1650 und übergibt sie dann seinem Herzog.',
    options: [{ label: 'Die Festung bis zur Übergabe halten', effect: 'Die Raubzüge enden, jetzt zählt nur noch Ordnung.' }], hist: 0 },
];

export const H_CHRONICLE: Entry[] = [
  { tag: 'belegt', src: ['wider'], title: 'Konrad Widerholt', text: 'Geboren wahrscheinlich 1598 in Ziegenhain in Hessen, diente er als Drillmeister in Württemberg. Im September 1634, nach der schweren Niederlage der Protestanten bei Nördlingen, wird er Kommandant des Hohentwiel.' },
  { tag: 'belegt', src: ['twiel'], title: 'Der Fels', text: 'Der Hohentwiel ist ein alter Vulkanschlot, der rund 260 Meter über Singen aufragt. Die Festung hat eine Ober- und eine Unterfestung, das Rondell Augusta mit 25 Metern Durchmesser, ein Zeughaus und Zisternen.' },
  { tag: 'belegt', src: ['twiel'], title: 'Geschütze', text: 'Für 1616 sind 47 schwere Geschütze auf der Festung belegt. Wie viele es unter Widerholt waren, ist nicht überliefert.' },
  { tag: 'belegt', src: ['wider'], title: 'Kontributionen', text: 'Widerholt zwang etwa 90 Herrschaften der Umgebung zu Abgaben. Wer nicht zahlte, musste mit Überfällen rechnen.' },
  { tag: 'belegt', src: ['wider'], title: 'Lösegeld', text: '1635 erpresste Widerholt bei Jestetten 3.700 Gulden Lösegeld und erbeutete in Aach 20 Pferde. Ein Anschlag auf den Bischof von Konstanz scheiterte.' },
  { tag: 'belegt', src: ['twiel'], title: 'Die Windmühle', text: '1635 ließ Widerholt auf dem Hohentwiel eine Windmühle bauen. So konnte die Festung auch bei einer Belagerung Getreide mahlen.' },
  { tag: 'hintergrund', title: 'Der Gulden', text: 'Ein Gulden war viel Geld: Ein Söldner bekam im Monat etwa vier bis sechs Gulden, wenn der Sold überhaupt gezahlt wurde.' },
  { tag: 'belegt', src: ['twiel'], title: 'Die Kirche', text: 'Von 1639 bis 1645 ließ Widerholt auf der Festung eine Kirche bauen. Ihre Ruine steht noch heute.' },
  { tag: 'belegt', src: ['wider'], title: 'Geld über die Schweiz', text: 'Die nahe Schweiz war neutral. Über sie kamen Geld, Nachrichten und Waren auf den Hohentwiel.' },
  { tag: 'belegt', src: ['brosig'], title: 'Minen', text: 'Bei der Belagerung 1641 gruben die Kaiserlichen Minen: Stollen unter die Mauern, die mit Pulver gesprengt werden sollten. Auf dem harten Vulkangestein war das mühsam.' },
  { tag: 'belegt', src: ['wider'], title: 'Die Besatzung', text: 'Zeitweise zählte die Besatzung 124 Mann. Widerholt erwog sogar, sie auf 45 Mann zu verkleinern, um Vorräte zu sparen.' },
  { tag: 'belegt', src: ['twiel'], title: 'Nie erobert', text: 'Fünf Belagerungen scheiterten: 1635/36, 1639, 1640, 1641/42 und 1644 (eine Quelle zählt sechs). Der Hohentwiel wurde im Dreißigjährigen Krieg nie eingenommen.' },
  { tag: 'belegt', src: ['rezess'], title: 'Der Rezess von 1644', text: 'Im Mai 1644 handelte Widerholt mit Bayern einen Vertrag aus. Er wurde nie bestätigt, danach blockierten die Bayern unter Mercy die Festung.' },
  { tag: 'hintergrund', title: 'Das Ende des Krieges', text: '1648 beendete der Westfälische Friede den Krieg. Württemberg bekam seine Gebiete zurück.' },
  { tag: 'belegt', src: ['wider'], title: 'Übergabe 1650', text: 'Bis 1650 hielt Widerholt die Festung und übergab sie dann seinem Herzog. Er starb 1667 in Kirchheim unter Teck.' },
  { tag: 'erfunden', title: 'Zahlen im Spiel', text: 'Einnahmen, Vorräte, Verluste und die Stärke der Belagerer sind im Spiel geschätzt. Belegt sind die Ereignisse, die Jahreszahlen und einzelne Beträge wie die 3.700 Gulden von Jestetten.' },
];

export const ACTIONS: Record<HAction, { name: string; info: string; siege: boolean }> = {
  kontrib: { name: 'Kontributionen eintreiben', info: 'Abgaben bei den Herrschaften der Umgebung. Sicheres Geld und Getreide, ein wenig Zorn.', siege: false },
  raub: { name: 'Streifzug', info: 'Reiter überfallen Höfe, Wagenzüge und Klöster. Viel Beute, aber Verluste und großer Zorn.', siege: false },
  geisel: { name: 'Geisel nehmen', info: 'Einen reichen Herrn entführen und Lösegeld fordern, wie 1635 bei Jestetten. Riskant, sehr einträglich, viel Zorn.', siege: false },
  werben: { name: 'Söldner werben', info: 'Neue Männer anwerben. Kostet Handgeld.', siege: false },
  schweiz: { name: 'Handel über die Schweiz', info: 'Getreide und Pulver über die neutrale Schweiz kaufen.', siege: false },
  bauen: { name: 'Festung ausbauen', info: 'Mauern, Zisternen, Mühle verbessern. Hilft bei Belagerungen.', siege: false },
  exerzieren: { name: 'Exerzieren und ruhen', info: 'Drill und Ruhe heben die Moral. Widerholt war selbst Drillmeister.', siege: false },
  ausfall: { name: 'Ausfall', info: 'Bei Nacht die Belagerer überfallen, Laufgräben und Geschütze zerstören.', siege: true },
  rationen: { name: 'Rationen kürzen', info: 'Weniger Getreide verbrauchen, aber die Moral leidet.', siege: true },
  bote: { name: 'Boten um Entsatz schicken', info: 'Ein Bote schleicht sich durch die Linien und bittet um Hilfe.', siege: true },
  halten: { name: 'Standhalten', info: 'Auf den Mauern bleiben und den Beschuss ertragen.', siege: true },
};

export class HGame {
  rnd: () => number;
  turn = 0;
  men = 110; grain = 8; powder = 60; money = 1500; morale = 70; wrath = 10; defense = 2;
  allies = { weimar: false, pension: false, rezess: false, peace: false, mill: false };
  siege: Siege | null = null;
  pendingEvent: HEvent | null = null;
  over = false; won = false; endText = '';
  report: string[] = [];
  history: HCmd[] = [];
  sentWildenstein = false;
  stats = { sieges: 0, raids: 0, loot: 0 };

  constructor(seed: number) { this.rnd = mulberry32(seed); this.beginTurn(); }

  r(a: number, b: number) { return a + (b - a) * this.rnd(); }
  ri(a: number, b: number) { return Math.round(this.r(a, b)); }

  beginTurn() {
    this.report = [];
    const ev = EVENTS.find(e => e.turn === this.turn);
    if (ev) this.pendingEvent = ev;
    const hs = SIEGES.find(s => s.turn === this.turn);
    if (hs && !(this.allies.rezess && hs.s.blockade)) this.startSiege({ ...hs.s });
    else if (!this.siege && !this.allies.peace && !this.allies.rezess && this.turn > 2 && this.rnd() < Math.max(0, (this.wrath - 45) / 250)) {
      this.startSiege({ name: 'Strafzug der Kaiserlichen', turnsLeft: 2, strength: Math.round(1500 + this.wrath * 15), blockade: false, relief: 0, hist: undefined });
      this.report.push('Die geplagte Umgebung ruft die Kaiserlichen zu Hilfe (erfunden).');
    }
  }

  startSiege(s: Siege) {
    this.siege = s; this.stats.sieges++;
    this.report.push(`${s.name} beginnt: etwa ${s.strength.toLocaleString('de-DE')} Mann ziehen vor die Festung.`);
  }

  available(): HAction[] {
    if (this.siege) return ['halten', 'ausfall', 'rationen', 'bote'];
    const a: HAction[] = ['kontrib', 'schweiz', 'werben', 'bauen', 'exerzieren'];
    if (!this.allies.rezess && !this.allies.peace) a.splice(1, 0, 'raub', 'geisel');
    return a;
  }

  dispatch(c: HCmd) {
    if (this.over) return;
    this.history.push(c);
    if (c.t === 'choose') { this.choose(c.i); return; }
    if (this.pendingEvent) return;
    if (!this.available().includes(c.a)) return;
    this.act(c.a);
    this.endTurn();
  }

  choose(i: number) {
    const e = this.pendingEvent; if (!e) return;
    this.pendingEvent = null;
    switch (e.id) {
      case 'pest':
        if (i === 0) { this.men -= 25; this.morale -= 8; this.grain += 3; this.report.push('Frauen und Kinder verlassen die Festung. Die Pest fordert dennoch Opfer.'); }
        else { this.men -= 45; this.morale -= 2; this.report.push('Die Seuche wütet in der überfüllten Festung.'); }
        break;
      case 'befehl':
        if (i === 0) { this.over = true; this.won = false; this.endText = 'Du übergibst den Hohentwiel dem Kaiser. Historisch verweigerte Widerholt den Befehl und hielt die Festung bis 1650.'; }
        else { this.morale += 5; this.wrath += 10; this.report.push('Widerholt verweigert den Befehl. Von nun an hält er die Festung auf eigene Verantwortung.'); }
        break;
      case 'weimar':
        if (i === 0) { this.allies.weimar = true; this.money += 1500; this.powder += 20; this.report.push('Der Vertrag mit Bernhard von Weimar bringt Geld und Pulver.'); }
        break;
      case 'pension':
        if (i === 0) { this.allies.pension = true; this.report.push('Frankreich zahlt von nun an eine Pension.'); }
        break;
      case 'wildenstein':
        if (i === 0) { this.sentWildenstein = true; this.men -= 6; this.money += 400; this.powder += 5; this.wrath += 12; this.report.push('Ein Trupp nimmt Burg Wildenstein durch eine Schießscharte. Die Bayern werden sie belagern (spiele Kapitel 1).'); }
        break;
      case 'ueberlingen':
        if (i === 0) {
          if (this.rnd() < 0.75) { const g = this.ri(3000, 5000); this.money += g; this.stats.loot += g; this.wrath += 25; this.morale += 8; this.men -= this.ri(3, 10); this.report.push(`Überlingen fällt durch Handstreich! Beute: ${g} Gulden. Die Stadt wird den Franzosen übergeben.`); }
          else { this.men -= this.ri(10, 25); this.morale -= 10; this.wrath += 10; this.report.push('Der Überfall auf Überlingen scheitert.'); }
        }
        break;
      case 'rezess':
        if (i === 1) { this.allies.rezess = true; this.grain += 6; this.wrath = Math.max(0, this.wrath - 30); this.report.push('Der Rezess ist unterschrieben: Versorgung gesichert, Raubzüge verboten.'); }
        else if (i === 0) { this.grain += 2; this.report.push('Die Verhandlungen bringen etwas Getreide, aber keine Unterschrift. Die Bayern rüsten zur Blockade.'); }
        else { this.wrath += 10; this.report.push('Widerholt lehnt ab. Die Bayern ziehen heran.'); }
        break;
      case 'frieden':
        this.allies.peace = true; this.wrath = 0; this.morale += 10; this.report.push('Der Krieg ist vorbei. Bis zur Übergabe zählt Ordnung, nicht Beute.');
        break;
    }
    this.clamp();
    this.checkLoss();
  }

  act(a: HAction) {
    const s = this.siege;
    switch (a) {
      case 'kontrib': {
        const g = this.ri(250, 550) * (this.wrath > 70 ? 0.6 : 1); this.money += Math.round(g); this.grain += 2; this.wrath += 3;
        this.report.push(`Kontributionen: ${Math.round(g)} Gulden und Getreide.`); break;
      }
      case 'raub': {
        this.stats.raids++;
        const ok = this.rnd() < 0.55 + this.men / 600 + this.morale / 400;
        if (ok) { const g = this.ri(500, 1400); this.money += g; this.stats.loot += g; this.grain += this.ri(1, 3); this.wrath += 10; const l = this.ri(0, 4); this.men -= l; this.morale += 4; this.report.push(`Der Streifzug bringt ${g} Gulden, Vieh und Getreide${l ? `, ${l} Reiter fallen` : ''}.`); }
        else { const l = this.ri(5, 15); this.men -= l; this.morale -= 8; this.wrath += 6; this.report.push(`Der Streifzug gerät in einen Hinterhalt. ${l} Mann verloren.`); }
        break;
      }
      case 'geisel': {
        const ok = this.rnd() < 0.5 + this.men / 800;
        if (ok) { const g = this.ri(1500, 3700); this.money += g; this.stats.loot += g; this.wrath += 18; this.report.push(`Ein reicher Herr wird entführt. Lösegeld: ${g} Gulden.`); }
        else { const l = this.ri(3, 10); this.men -= l; this.wrath += 8; this.morale -= 5; this.report.push(`Der Anschlag scheitert, wie einst beim Bischof von Konstanz. ${l} Mann verloren.`); }
        break;
      }
      case 'werben': {
        const n = Math.min(30, Math.floor(this.money / 25));
        if (n <= 0) { this.report.push('Kein Geld für Handgeld.'); break; }
        this.money -= n * 25; this.men += n; this.report.push(`${n} Söldner geworben (${n * 25} Gulden Handgeld).`); break;
      }
      case 'schweiz': {
        const cost = Math.min(this.money, 900);
        if (cost < 200) { this.report.push('Zu wenig Geld für den Handel.'); break; }
        this.money -= cost; this.grain += Math.round(cost / 150); this.powder += Math.round(cost / 30); this.report.push(`Über die Schweiz gekauft: Getreide und Pulver für ${cost} Gulden.`); break;
      }
      case 'bauen': {
        if (this.money < 600) { this.report.push('Zu wenig Geld für Bauarbeiten.'); break; }
        this.money -= 600;
        if (!this.allies.mill) { this.allies.mill = true; this.report.push('Eine Windmühle wird gebaut: Die Festung kann selbst Getreide mahlen.'); }
        else { this.defense = Math.min(6, this.defense + 1); this.report.push(`Die Festungswerke werden verstärkt (Stufe ${this.defense}).`); }
        break;
      }
      case 'exerzieren': this.morale += 10; this.report.push('Drill und Ruhe: Die Moral steigt.'); break;
      case 'ausfall': {
        if (!s) break;
        const ok = this.rnd() < 0.35 + this.morale / 250 + this.men / 500 - (s.strength / 20000);
        if (ok) { const k = this.ri(200, 600); s.strength -= k; const l = this.ri(2, 8); this.men -= l; this.morale += 8; this.report.push(`Nächtlicher Ausfall! Laufgräben zerstört, ${k} Belagerer außer Gefecht, ${l} eigene Verluste.`); }
        else { const l = this.ri(8, 20); this.men -= l; this.morale -= 8; this.report.push(`Der Ausfall wird zurückgeschlagen. ${l} Mann verloren.`); }
        break;
      }
      case 'rationen': this.grain += 1.5; this.morale -= 6; this.report.push('Die Rationen werden gekürzt.'); break;
      case 'bote': if (s) { s.relief += this.allies.weimar || this.allies.pension ? 0.35 : 0.15; this.report.push('Ein Bote schleicht sich durch die feindlichen Linien.'); } break;
      case 'halten': this.morale += 2; this.report.push('Die Besatzung hält die Mauern.'); break;
    }
    this.clamp();
  }

  endTurn() {
    // Unterhalt
    const eat = this.men / 50;
    this.grain -= eat - (this.allies.mill ? 0.6 : 0);
    const pay = Math.round(this.men * 3);
    if (!this.allies.peace) this.money += this.allies.pension ? 500 : 0;
    if (this.allies.rezess) { this.grain += 1.5; this.money += 200; }
    if (this.money >= pay) this.money -= pay;
    else { this.money = 0; const d = this.ri(3, 10); this.men -= d; this.morale -= 10; this.report.push(`Der Sold bleibt aus! ${d} Söldner desertieren.`); }
    if (this.grain < 0) { this.morale -= 15; const d = this.ri(5, 12); this.men -= d; this.report.push(`Hunger! ${d} Mann sterben oder laufen davon.`); this.grain = 0; }
    // Belagerung
    const s = this.siege;
    if (s) {
      if (!s.blockade) {
        const l = Math.max(0, Math.round(this.r(4, 12) * s.strength / 3000 * (1 - this.defense * 0.08)));
        this.men -= l; this.powder -= this.ri(4, 10); this.morale -= 3;
        this.report.push(`Beschuss, Brandkugeln und Minen: ${l} Verteidiger fallen.`);
        if (this.powder < 0) { this.powder = 0; this.morale -= 10; this.report.push('Das Pulver ist verbraucht!'); }
      } else this.morale -= 2;
      this.wrath = Math.max(0, this.wrath - 8);
      s.turnsLeft--;
      s.strength = Math.round(s.strength * this.r(0.85, 0.95));
      if (this.rnd() < s.relief) { this.report.push(this.allies.weimar ? 'Ein Entsatzheer naht! Die Belagerer ziehen ab.' : 'Verbündete Truppen nahen. Die Belagerer ziehen ab.'); this.endSiege(); }
      else if (s.turnsLeft <= 0 || s.strength < 800) { this.report.push(s.hist ? s.hist : `Die Belagerer geben auf und ziehen ab. Die Festung hat gehalten.`); this.endSiege(); }
    } else {
      this.wrath = Math.max(0, this.wrath - 2);
    }
    this.clamp();
    this.checkLoss();
    if (this.over) return;
    this.turn++;
    if (this.turn >= TURNS) {
      this.over = true; this.won = true;
      this.endText = 'Sommer 1650: Du übergibst den Hohentwiel unversehrt deinem Herzog, so wie Widerholt es tat. Die Festung wurde im ganzen Krieg nie eingenommen.';
      return;
    }
    this.beginTurn();
  }

  endSiege() { this.siege = null; this.morale += 12; }

  clamp() {
    this.morale = Math.max(0, Math.min(100, this.morale));
    this.men = Math.max(0, Math.round(this.men));
    this.grain = Math.round(this.grain * 10) / 10;
    this.money = Math.max(0, Math.round(this.money));
    this.wrath = Math.max(0, Math.min(100, this.wrath));
  }

  checkLoss() {
    if (this.over) return;
    if (this.men < 25) { this.over = true; this.endText = 'Die Besatzung ist zu klein geworden, um den Fels zu halten. Die Festung fällt. Historisch wurde der Hohentwiel nie erobert.'; }
    else if (this.morale <= 0) { this.over = true; this.endText = 'Die Söldner meutern und öffnen die Tore. Historisch hielt Widerholts Besatzung bis 1650 zusammen.'; }
  }

  score() {
    return Math.round(this.men * 10 + this.money / 10 + this.morale * 5 + this.defense * 50 + this.stats.sieges * 100);
  }
}
