// Darstellung und Bedienung für Kapitel 4
import { PGame, PSide, PCmd, Task, DAction, TASKS, DACTIONS, P_CHRONICLE, DAYS, pDate } from './game';
import type { Entry, Slide } from '../history';

export interface PApi {
  modal(html: string, buttons: string[], cls?: string): Promise<number>;
  entryHtml(e: Entry, h?: string): string;
  log(m: string, k?: 'info' | 'good' | 'bad'): void;
  song(n: 'tanz' | 'marsch'): void;
  boom(size: number, x: number): void;
  exit(): void;
}

const $ = (id: string) => document.getElementById(id)!;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const P_SLIDES: Slide[] = [
  { file: 'Palatinatus Rheni (Merian) 154.jpg', credit: 'Matthäus Merian, Topographia Palatinatus Rheni, 1645', license: 'gemeinfrei', tag: 'belegt',
    title: 'Philippsburg am Rhein', text: 'Eine Festung im Sumpf, eine Meile von Speyer. Nach der Schlacht bei Freiburg ziehen die Franzosen den Rhein hinunter.' },
  { file: 'Siège de Philippsburg (1644) - JB Le Paon - Musée Condé (cropped).jpg', credit: 'Jean-Baptiste Le Paon, 1769', license: 'gemeinfrei', tag: 'hintergrund',
    title: 'Enghien vor Philippsburg', text: 'Mehr als hundert Jahre später gemalt: der junge Herzog von Enghien bei der Belagerung. Mercy steht mit dem Entsatz bei Neckarsulm. Die Zeit läuft.' },
  { file: 'FestungPhilippsburg1.jpg', credit: 'Merian/Zeiller, Topographia', license: 'gemeinfrei', tag: 'belegt',
    title: 'Wälle, Gräben, Bastionen', text: 'Ein Stich der Festung mit Wällen und Wassergräben. Im trockenen Sommer 1644 führten die Gräben kaum Wasser. Das half den Belagerern.' },
];

const TASK_ORDER: Task[] = ['ring', 'graben', 'batterie', 'mine', 'fuellen'];

export class PhilippsburgUI {
  g: PGame;
  api: PApi;
  ctrl: Record<PSide, 'human' | 'ai'>;
  alloc: Record<Task, number>;
  active = true;
  time = 0;
  wake: (() => void) | null = null;
  booms: { x: number; y: number; t: number }[] = [];

  constructor(api: PApi, ctrl: Record<PSide, 'human' | 'ai'>) {
    this.api = api; this.ctrl = ctrl;
    this.g = new PGame((Math.random() * 2 ** 31) | 0);
    this.alloc = { ...this.g.lastAlloc };
    $('phMenu').onclick = async () => {
      const i = await this.api.modal('<h2>Menü</h2>', ['Hauptmenü', 'Chronik', 'Weiterspielen']);
      if (i === 0) { this.active = false; this.wake?.(); this.api.exit(); }
      if (i === 1) this.chronik();
    };
    $('phChron').onclick = () => this.chronik();
  }

  async chronik() {
    const items = P_CHRONICLE.slice(0, Math.min(this.g.day, P_CHRONICLE.length)).map((e, i) => `<div class="kicker">${pDate(i + 1)}</div>` + this.api.entryHtml(e));
    await this.api.modal(`<h2>Chronik der Belagerung</h2><div class="scroll">${items.join('')}</div>`, ['Schließen'], 'wide');
  }

  human() { return !this.g.over && this.ctrl[this.g.phase] === 'human'; }

  async run() {
    document.body.classList.add('ph');
    await this.api.modal(`<h2>So wird gespielt</h2><ul>
      <li>Jede Runde ist ein Tag, ab dem 25. August 1644. Erst handeln die Franzosen, dann die Besatzung.</li>
      <li><b>Franzosen:</b> Verteile 10 Arbeitstrupps auf Schanzring, Laufgräben, Batterien, Minen und Graben füllen. Stürme die Zollschanze am Rhein, später den Hauptwall, oder biete eine Übergabe an.</li>
      <li>Irgendwann kommt Mercys Entsatz. Ist der Schanzring dann nicht mindestens zu 70 % fertig, ist die Belagerung gescheitert. Wann er kommt, weißt du nicht genau.</li>
      <li><b>Besatzung:</b> Wähle jeden Tag eine Maßnahme: Ausfall, Geschütze aus dem Zeughaus ersetzen, Wall ausbessern, Gegenminen oder Ruhe.</li>
      <li>Die Karte zeigt, wie sich die Laufgräben heranschieben, wo die Batterien stehen und wie weit der Ring ist.</li></ul>`, ['Los geht’s']);
    this.api.song('marsch');
    const g = this.g;
    let lastDay = 0, lastPhase: PSide | null = null;
    const hot = this.ctrl.fr === 'human' && this.ctrl.imp === 'human';
    while (!g.over && this.active) {
      if (g.day !== lastDay && g.phase === 'fr') {
        lastDay = g.day;
        const e = P_CHRONICLE[Math.min(g.day - 1, P_CHRONICLE.length - 1)];
        await this.api.modal(`<div class="kicker">Tag ${g.day} von ${DAYS} · ${pDate(g.day)}</div><p class="weather">${g.rainToday ? 'Regen: Die Gräben laufen voll.' : 'Trocken.'}</p>` + this.api.entryHtml(e, 'h2'), ['Weiter']);
      }
      if (hot && g.phase !== lastPhase) await this.api.modal(`<h2>${g.phase === 'fr' ? 'Die Franzosen' : 'Die Besatzung'} sind am Zug</h2><p>Gerät weitergeben.</p>`, ['Bereit'], g.phase === 'fr' ? 'att' : 'def');
      lastPhase = g.phase;
      if (g.phase === 'imp' && g.pendingTerms) {
        let acc: boolean;
        if (this.ctrl.imp === 'human') acc = (await this.api.modal(`<h2>Angebot der Franzosen</h2><p>Freier Abzug mit Waffen, Fahnen und zwei Geschützen, wenn ihr die Festung übergebt.</p><p class="small">Moral ${Math.round(g.imp.morale)} · ${g.imp.men} Mann · Bresche ${g.breach()} %</p>`, ['Annehmen', 'Ablehnen'])) === 0;
        else { acc = g.aiAcceptTerms(); }
        g.dispatch({ t: 'terms', accept: acc });
        this.flush();
        if (g.over) break;
      }
      this.update();
      if (this.ctrl[g.phase] === 'ai') {
        await sleep(600);
        if (g.phase === 'fr') { const c = g.aiAtt() as Extract<PCmd, { t: 'att' }>; this.alloc = { ...c.alloc }; this.update(); await sleep(500); g.dispatch(c); }
        else g.dispatch({ t: 'def', a: g.aiDef() });
        this.fx(); this.flush(); await sleep(500);
      } else {
        await new Promise<void>(r => { this.wake = r; this.update(); });
        this.wake = null;
      }
    }
    if (!this.active) return;
    this.update();
    this.api.song('tanz');
    const win = g.winner === 'fr' ? 'Philippsburg fällt' : 'Philippsburg hält';
    const i = await this.api.modal(`<h2>${win}</h2><p>${g.endText}</p><p class="small">Tag ${Math.min(g.day, DAYS)} · Franzosen ${g.fr.men} Mann · Besatzung ${g.imp.men} Mann · Bresche ${g.breach()} %</p>` + this.api.entryHtml(P_CHRONICLE[16]) + this.api.entryHtml(P_CHRONICLE[17]), ['Chronik ansehen', 'Hauptmenü']);
    if (i === 0) await this.chronik();
    this.api.exit();
  }

  fx() {
    if (this.g.batteries) { for (let k = 0; k < this.g.batteries; k++) this.booms.push({ x: 0.55 + Math.random() * 0.12, y: 0.4 + Math.random() * 0.25, t: this.time + k * 0.25 }); this.api.boom(0.6, 300); }
  }

  flush() { for (const r of this.g.report.splice(0)) this.api.log(r, /Verluste|verloren|scheitert|abgeschlagen|zerstört|fallen/.test(r) ? 'bad' : 'info'); }

  async attEnd(storm: 'zoll' | 'haupt' | null, offer = false) {
    if (!this.human() || this.g.phase !== 'fr') return;
    if (storm === 'haupt') {
      const i = await this.api.modal(`<h2>Hauptsturm befehlen?</h2><p>Bresche ${this.g.breach()} %, Aussicht etwa <b>${Math.round(this.g.stormChance() * 100)} %</b>. Ein gescheiterter Sturm kostet Hunderte Männer.</p>`, ['Abbrechen', 'Stürmen!']);
      if (i !== 1) return;
    }
    this.g.dispatch({ t: 'att', alloc: { ...this.alloc }, storm, offer });
    this.fx(); this.flush(); this.wake?.();
  }

  defAct(a: DAction) {
    if (!this.human() || this.g.phase !== 'imp') return;
    this.g.dispatch({ t: 'def', a });
    this.flush(); this.wake?.();
  }

  update() {
    const g = this.g;
    $('phDate').textContent = `Tag ${Math.min(g.day, DAYS)}/${DAYS} · ${pDate(Math.min(g.day, DAYS))}`;
    $('phWx').textContent = g.rainToday ? '🌧 Regen' : '☀ trocken';
    const t = $('phTurn'); t.textContent = g.over ? 'Ende' : g.phase === 'fr' ? 'Zug: Franzosen' : 'Zug: Besatzung'; t.className = 'turn ' + (g.phase === 'fr' ? 'fr' : 'def');
    $('phStats').innerHTML = `<b class="fr">Franzosen</b> ${g.fr.men.toLocaleString('de-DE')} Mann · Moral ${Math.round(g.fr.morale)} · Schanzring ${Math.round(g.ring)} % · Laufgräben ${Math.round(g.dist)} m vor dem Graben · Batterien ${g.batteries} &nbsp; <b class="imp">Besatzung</b> ${g.imp.men} Mann · Moral ${Math.round(g.imp.morale)} · Geschütze ${g.guns}/6 (Zeughaus ${g.arsenal}) · Wall ${Math.round(g.wall)} % · Bresche ${g.breach()} %${g.relief.known ? ' · <b>Mercy naht!</b>' : ''}`;
    const p = $('phCtl');
    const human = this.human();
    p.classList.toggle('ai', !human);
    $('phAi').textContent = !g.over && !human ? (g.phase === 'fr' ? 'Enghien verteilt die Arbeit …' : 'Baumberger überlegt …') : '';
    if (g.ring >= 100 && this.alloc.ring > 0) { this.alloc.graben += this.alloc.ring; this.alloc.ring = 0; }
    const box = $('phBody');
    box.innerHTML = '';
    if (g.phase === 'fr' || !human) {
      const used = TASK_ORDER.reduce((a, k) => a + this.alloc[k], 0);
      for (const k of TASK_ORDER) {
        const row = document.createElement('div'); row.className = 'task';
        row.innerHTML = `<span class="tn" title="${TASKS[k].info}">${TASKS[k].name}</span><button data-d="-1">−</button><span class="pips">${'■'.repeat(this.alloc[k])}</span><b>${this.alloc[k]}</b><button data-d="1">+</button>`;
        row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          if (!this.human()) return;
          const d = Number((b as HTMLElement).dataset.d);
          const sum = TASK_ORDER.reduce((a, x) => a + this.alloc[x], 0);
          if (d > 0 && sum >= 10) return;
          this.alloc[k] = Math.max(0, this.alloc[k] + d); this.update();
        }));
        box.appendChild(row);
      }
      const acts = document.createElement('div'); acts.className = 'actions';
      const free = 10 - used;
      acts.innerHTML = `<span class="free">${free > 0 ? `${free} Trupps frei` : 'Alle Trupps eingeteilt'}</span>
        ${g.zoll ? '<button id="phZoll">Zollschanze stürmen</button>' : ''}
        <button id="phStorm" ${g.breach() < 25 ? 'disabled' : ''}>Hauptsturm <small>${Math.round(g.stormChance() * 100)} %</small></button>
        <button id="phOffer" ${g.canOfferTerms() ? '' : 'disabled'}>Übergabe anbieten</button>
        <button id="phDay" class="primary">Tag beenden ⏭</button>`;
      box.appendChild(acts);
      if (human && g.phase === 'fr') {
        ($('phDay') as HTMLButtonElement).onclick = () => this.attEnd(null);
        if (g.zoll) ($('phZoll') as HTMLButtonElement).onclick = () => this.attEnd('zoll');
        ($('phStorm') as HTMLButtonElement).onclick = () => this.attEnd('haupt');
        ($('phOffer') as HTMLButtonElement).onclick = () => this.attEnd(null, true);
      }
    } else {
      const acts = document.createElement('div'); acts.className = 'cards';
      for (const a of Object.keys(DACTIONS) as DAction[]) {
        const b = document.createElement('button'); b.className = 'act';
        b.innerHTML = `<b>${DACTIONS[a].name}</b><small>${DACTIONS[a].info}</small>`;
        b.onclick = () => this.defAct(a);
        acts.appendChild(b);
      }
      box.appendChild(acts);
    }
  }

  draw(ctx: CanvasRenderingContext2D, cw: number, ch: number, dt: number) {
    this.time += dt;
    const top = $('phHud').offsetHeight, bottom = $('phCtl').offsetHeight;
    const vh = ch - top - bottom - 8;
    const aspect = 1.6;
    let w = cw - 16, h = w / aspect;
    if (h > vh) { h = vh; w = h * aspect; }
    const R = { x: (cw - w) / 2, y: top + 4 + (vh - h) / 2, w, h };
    const X = (x: number) => R.x + x * R.w, Y = (y: number) => R.y + y * R.h;
    const g = this.g;
    // Grund: Rheinaue
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.fillStyle = '#d9cf9e'; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = 'rgba(120,140,90,0.35)';
    for (let k = 0; k < 60; k++) { const h = (n: number) => { const v = Math.sin(n) * 43758.5453; return v - Math.floor(v); }; const x = h(k * 12.9898), y = h(k * 78.233 + 1); ctx.beginPath(); ctx.ellipse(X(x), Y(y), R.w * 0.03, R.h * 0.015, 0, 0, 7); ctx.fill(); }
    // Rhein
    ctx.fillStyle = '#7d9db4';
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.bezierCurveTo(X(0.18), Y(0.3), X(0.06), Y(0.7), X(0.16), Y(1)); ctx.lineTo(X(0), Y(1)); ctx.fill();
    ctx.fillStyle = '#4e6f8a'; ctx.font = `italic ${Math.max(11, R.w * 0.016)}px Georgia`; ctx.fillText('Rhein', X(0.03), Y(0.5));
    // Festung (vereinfachter Fünfeck-Grundriss mit Bastionen)
    const cx = X(0.36), cy = Y(0.5), rad = R.h * 0.2;
    ctx.fillStyle = '#9bb3b8';
    ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; ctx.lineTo(cx + Math.cos(a) * rad * 1.45, cy + Math.sin(a) * rad * 1.45); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b39b6e'; ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; const rr = k % 2 ? rad * 0.82 : rad * 1.2; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9a97a';
    for (let k = 0; k < 8; k++) ctx.fillRect(cx - rad * 0.5 + (k % 4) * rad * 0.26, cy - rad * 0.35 + Math.floor(k / 4) * rad * 0.38, rad * 0.2, rad * 0.25);
    // Breschen am Ostwall
    const bx = cx + rad * 1.05, by = cy;
    const br = g.breach();
    if (br > 0) { ctx.fillStyle = '#6a5a44'; ctx.beginPath(); ctx.arc(bx, by, rad * 0.05 + rad * 0.25 * br / 100, 0, 7); ctx.fill(); }
    // Zollschanze und NW-Schanze
    ctx.fillStyle = g.zoll ? '#b39b6e' : '#6b7fa8'; ctx.fillRect(X(0.15), Y(0.36), R.w * 0.03, R.h * 0.05);
    ctx.fillStyle = '#2a1d10'; ctx.font = `${Math.max(10, R.w * 0.011)}px Georgia`; ctx.fillText('Zollschanze', X(0.12), Y(0.34));
    ctx.fillStyle = g.day >= 2 ? '#6b7fa8' : '#b39b6e'; ctx.fillRect(X(0.27), Y(0.15), R.w * 0.025, R.h * 0.04); ctx.fillStyle = '#2a1d10'; ctx.fillText(g.day >= 2 ? 'NW-Schanze (aufgegeben)' : 'NW-Schanze', X(0.22), Y(0.13));
    ctx.font = `bold ${Math.max(12, R.w * 0.016)}px Georgia`; ctx.fillText('Philippsburg', cx - rad * 0.6, cy + rad * 1.65);
    // Schanzring (Zirkumvallation) als Bogen im Osten
    ctx.strokeStyle = '#2e4f9e'; ctx.lineWidth = Math.max(3, R.w * 0.005);
    ctx.beginPath(); ctx.ellipse(cx, cy, R.w * 0.5, R.h * 0.45, 0, -Math.PI * 0.42, -Math.PI * 0.42 + Math.PI * 0.84 * g.ring / 100); ctx.stroke();
    ctx.fillStyle = '#2e4f9e'; ctx.font = `${Math.max(10, R.w * 0.011)}px Georgia`; ctx.fillText(`Schanzring ${Math.round(g.ring)} %`, X(0.82), Y(0.08));
    // Französisches Lager
    for (let k = 0; k < 10; k++) { const x = X(0.9) + (k % 3) * 12, y = Y(0.2) + Math.floor(k / 3) * 14; ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x, y - 9); ctx.lineTo(x + 6, y); ctx.fill(); }
    // Laufgräben: Zickzack vom Lager zur Festung
    const startX = X(0.86), startY = Y(0.55), endX = bx + rad * 0.15, endY = by;
    const frac = 1 - g.dist / 600;
    const segs = 9;
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = Math.max(2.5, R.w * 0.004);
    ctx.beginPath(); ctx.moveTo(startX, startY);
    for (let k = 1; k <= segs; k++) {
      const f = k / segs; if (f > frac + 1e-6) { const pf = frac; ctx.lineTo(startX + (endX - startX) * pf, startY + (endY - startY) * pf + ((k % 2) ? 1 : -1) * R.h * 0.03 * (pf * segs - (k - 1))); break; }
      ctx.lineTo(startX + (endX - startX) * f, startY + (endY - startY) * f + ((k % 2) ? 1 : -1) * R.h * 0.04);
    }
    ctx.stroke();
    // Batterien entlang der Laufgräben
    for (let k = 0; k < g.batteries; k++) {
      const f = Math.min(frac, 0.35 + k * 0.08);
      const x = startX + (endX - startX) * f, y = startY + (endY - startY) * f + (k % 2 ? 1 : -1) * R.h * 0.07;
      ctx.fillStyle = '#7a5a30'; ctx.fillRect(x - 9, y - 6, 18, 12); ctx.fillStyle = '#222'; ctx.fillRect(x - 8, y - 2, 6, 3); ctx.fillRect(x + 2, y - 2, 6, 3);
    }
    // Minen
    g.mines.forEach((m, k) => { if (m <= 0) return; ctx.strokeStyle = m >= 100 ? '#c0392b' : '#3a2814'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(endX + 8, endY - 20 + k * 20); ctx.lineTo(endX + 8 - (rad * 0.4) * Math.min(1, m / 100), endY - 20 + k * 20); ctx.stroke(); ctx.setLineDash([]); });
    // Grabenfüllung
    g.fill.forEach((f, k) => { if (f <= 0) return; ctx.fillStyle = `rgba(140,110,60,${0.3 + f / 150})`; ctx.fillRect(bx + rad * 0.12, by - rad * 0.5 + k * rad * 0.8, rad * 0.25 * f / 100 + 4, rad * 0.18); });
    // Geschütze der Festung
    for (let k = 0; k < g.guns; k++) { const a = -0.6 + k * 0.24; ctx.fillStyle = '#222'; ctx.fillRect(cx + Math.cos(a) * rad * 1.08 - 3, cy + Math.sin(a) * rad * 1.08 - 3, 7, 4); }
    // Einschläge
    this.booms = this.booms.filter(b => this.time - b.t < 1.5);
    for (const b of this.booms) {
      const a = this.time - b.t; if (a < 0) continue;
      ctx.fillStyle = `rgba(255,190,90,${Math.max(0, 0.8 - a)})`; ctx.beginPath(); ctx.arc(cx + rad * 1.0, cy + (b.y - 0.5) * rad * 2, 6 + a * 14, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(220,220,220,${Math.max(0, 0.6 - a * 0.4)})`; ctx.beginPath(); ctx.arc(X(b.x), Y(b.y) - a * 10, 8 + a * 10, 0, 7); ctx.fill();
    }
    // Entsatz-Hinweis
    if (g.relief.known) { ctx.fillStyle = '#a8342a'; ctx.font = `bold ${Math.max(11, R.w * 0.013)}px Georgia`; ctx.fillText('→ Mercy (Entsatz) aus Osten', X(0.74), Y(0.95)); }
    ctx.restore();
    ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 3; ctx.strokeRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = '#3a2814'; ctx.font = `italic ${Math.max(10, R.w * 0.01)}px Georgia`;
    ctx.fillText('Grundriss vereinfacht (Bastionszahl und Maße nicht überliefert)', R.x + 8, R.y + R.h - 8);
  }
}
