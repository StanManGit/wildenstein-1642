// Darstellung und Bedienung für Kapitel 3
import { HGame, HAction, ACTIONS, H_CHRONICLE, TURNS, seasonText } from './game';
import type { Entry, Slide } from '../history';

export interface HApi {
  modal(html: string, buttons: string[], cls?: string): Promise<number>;
  entryHtml(e: Entry, h?: string): string;
  log(m: string, k?: 'info' | 'good' | 'bad'): void;
  song(n: 'tanz' | 'marsch'): void;
  exit(): void;
}

const $ = (id: string) => document.getElementById(id)!;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const H_SLIDES: Slide[] = [
  { file: 'Hohentwiel Ansicht 1643 Merian.JPG', credit: 'Matthäus Merian d. Ä., 1643', license: 'gemeinfrei', tag: 'belegt',
    title: 'Der Hohentwiel', text: 'Ein Vulkanfels, 260 Meter über Singen im Hegau. Darauf eine württembergische Festung, mitten im Land der Gegner.' },
  { file: 'Konrad Widerholt Stich.jpg', credit: 'Kupferstich, 17. Jahrhundert', license: 'gemeinfrei', tag: 'belegt',
    title: 'Konrad Widerholt', text: 'Im September 1634 übernimmt der frühere Drillmeister das Kommando. Er wird die Festung sechzehn Jahre lang halten.' },
  { file: 'Hohentwiel Belagerung 1641 Merian.JPG', credit: 'Matthäus Merian d. Ä., nach 1641', license: 'gemeinfrei', tag: 'belegt',
    title: 'Fünf Belagerungen', text: 'Kaiserliche und Bayern versuchen immer wieder, den Fels zu nehmen. Keinem gelingt es. Wie hältst du durch?' },
];

export class HohentwielUI {
  g: HGame;
  api: HApi;
  active = true;
  time = 0;
  wake: ((a: HAction | null) => void) | null = null;
  raiders: { t: number; dir: number }[] = [];
  shots: { x: number; y: number; t: number }[] = [];

  constructor(api: HApi) {
    this.api = api;
    this.g = new HGame((Math.random() * 2 ** 31) | 0);
    $('htMenu').onclick = async () => {
      const i = await this.api.modal('<h2>Menü</h2>', ['Hauptmenü', 'Chronik', 'Weiterspielen']);
      if (i === 0) { this.active = false; this.wake?.(null); this.api.exit(); }
      if (i === 1) this.chronik();
    };
    $('htChron').onclick = () => this.chronik();
  }

  async chronik() {
    const n = Math.min(15, Math.floor(this.g.turn / 4));
    const items = H_CHRONICLE.slice(0, n + 1).map((e, i) => `<div class="kicker">${1634 + i}</div>` + this.api.entryHtml(e));
    await this.api.modal(`<h2>Chronik des Hohentwiel</h2><div class="scroll">${items.join('')}</div>`, ['Schließen'], 'wide');
  }

  async run() {
    document.body.classList.add('ht');
    await this.api.modal(`<h2>So wird gespielt</h2><ul>
      <li>Du bist Konrad Widerholt. Jede Runde ist eine Jahreszeit, von Herbst 1634 bis Sommer 1650.</li>
      <li>Wähle pro Runde einen Befehl. Kontributionen, Streifzüge und Geiseln bringen Geld und Getreide, machen aber die Umgebung zornig. Zorn lockt Strafzüge an.</li>
      <li>Jede Runde kosten deine Söldner Sold (3 Gulden pro Mann) und Getreide. Fehlt Sold, laufen sie davon. Fehlt Brot, hungern sie.</li>
      <li>Belagerungen kommen zu den echten Jahren. Dann kannst du ausfallen, Rationen kürzen, Boten um Entsatz schicken oder standhalten.</li>
      <li>An wichtigen Punkten musst du entscheiden, wie Widerholt: Gehorsam oder Treue, Bündnis mit Frankreich, Verhandeln mit Bayern.</li>
      <li>Ziel: Halte die Festung bis 1650.</li></ul>`, ['Los geht’s']);
    this.api.song('marsch');
    const g = this.g;
    let lastYear = -1;
    while (!g.over && this.active) {
      this.update();
      const year = Math.floor(g.turn / 4);
      if (year !== lastYear) {
        lastYear = year;
        const e = H_CHRONICLE[Math.min(15, year)];
        await this.api.modal(`<div class="kicker">${seasonText(g.turn)}</div>` + this.api.entryHtml(e, 'h2'), ['Weiter']);
      }
      for (const r of g.report.splice(0)) this.api.log(r, /fallen|verloren|Hunger|desertieren|scheitert|beginnt|Sold/.test(r) ? 'bad' : 'info');
      if (g.pendingEvent) {
        const e = g.pendingEvent;
        const i = await this.api.modal(`<div class="kicker">${seasonText(g.turn)}</div><div class="entry"><span class="tag ${e.tag}">${e.tag === 'belegt' ? 'Belegt' : 'Hintergrundwissen'}</span><h2>${e.title}</h2><p>${e.text}</p></div>
          <ul>${e.options.map(o => `<li><b>${o.label}:</b> ${o.effect}</li>`).join('')}</ul>`, e.options.map(o => o.label));
        g.dispatch({ t: 'choose', i });
        for (const r of g.report.splice(0)) this.api.log(r, 'info');
        continue;
      }
      this.update();
      const a = await new Promise<HAction | null>(r => { this.wake = r; this.update(); });
      this.wake = null;
      if (!a || !this.active) break;
      if (a === 'raub' || a === 'geisel' || a === 'kontrib') this.raiders.push({ t: this.time, dir: 1 });
      if (a === 'ausfall') this.raiders.push({ t: this.time, dir: -1 });
      g.dispatch({ t: 'act', a });
      g.report.forEach(r => this.api.log(r, /fallen|verloren|Hunger|desertieren|scheitert|Sold|Hinterhalt/.test(r) ? 'bad' : 'good'));
      g.report = [];
      await sleep(400);
    }
    if (!this.active) return;
    this.update();
    this.api.song('tanz');
    const i = await this.api.modal(`<h2>${g.won ? 'Die Festung hat gehalten!' : 'Der Hohentwiel ist verloren'}</h2><p>${g.endText}</p>
      <p class="small">${seasonText(Math.min(g.turn, TURNS - 1))} · ${g.men} Mann · ${g.money.toLocaleString('de-DE')} Gulden · Moral ${g.morale} · ${g.stats.sieges} Belagerungen überstanden · Beute ${g.stats.loot.toLocaleString('de-DE')} Gulden${g.won ? ` · <b>Punkte: ${g.score()}</b>` : ''}</p>` +
      this.api.entryHtml(H_CHRONICLE[14]), ['Chronik ansehen', 'Hauptmenü']);
    if (i === 0) await this.chronik();
    this.api.exit();
  }

  update() {
    const g = this.g;
    $('htDate').textContent = `${seasonText(Math.min(g.turn, TURNS - 1))} · Runde ${Math.min(g.turn + 1, TURNS)}/${TURNS}`;
    $('htState').textContent = g.siege ? `⚔ ${g.siege.name} (noch ~${g.siege.turnsLeft} Jahreszeiten, ${g.siege.strength.toLocaleString('de-DE')} Mann)` : g.allies.peace ? '🕊 Frieden' : g.allies.rezess ? 'Rezess mit Bayern' : '';
    const bar = (v: number, max: number, c: string) => `<span class="bar"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${c}"></i></span>`;
    $('htRes').innerHTML = `
      <span>👥 ${g.men} Mann</span>
      <span>🌾 ${g.grain.toFixed(1)} <small>(reicht ~${Math.max(0, Math.floor(g.grain / Math.max(0.1, g.men / 50 - (g.allies.mill ? 0.6 : 0))))} Jahresz.)</small></span>
      <span>💰 ${g.money.toLocaleString('de-DE')} fl <small>(Sold ${g.men * 3})</small></span>
      <span>🧨 ${g.powder} Ztr.</span>
      <span>Moral ${bar(g.morale, 100, g.morale > 50 ? '#7fc06a' : g.morale > 25 ? '#e8c25a' : '#d0573a')}</span>
      <span>Zorn der Umgebung ${bar(g.wrath, 100, '#d0573a')}</span>
      <span>🏰 Werke ${g.defense}${g.allies.mill ? ' · Mühle' : ''}${g.allies.weimar ? ' · Weimar' : ''}${g.allies.pension ? ' · Pension' : ''}</span>`;
    const box = $('htActs');
    box.innerHTML = '';
    for (const a of g.available()) {
      const b = document.createElement('button');
      b.className = 'act';
      b.innerHTML = `<b>${ACTIONS[a].name}</b><small>${ACTIONS[a].info}</small>`;
      b.disabled = !!g.pendingEvent || g.over || !this.wake;
      b.onclick = () => this.wake?.(a);
      box.appendChild(b);
    }
  }

  draw(ctx: CanvasRenderingContext2D, cw: number, ch: number, dt: number) {
    this.time += dt;
    const top = $('htHud').offsetHeight, bottom = $('htPanel').offsetHeight;
    const h = ch - top - bottom, w = cw;
    const g = this.g;
    const season = g.turn % 4;
    // Himmel
    const sky = ctx.createLinearGradient(0, top, 0, top + h);
    const skies = [['#9fb4c8', '#e6d7b8'], ['#b8c3cc', '#e8ecef'], ['#8fb6d8', '#e6eed6'], ['#78a6d0', '#f0e3c0']];
    sky.addColorStop(0, skies[season][0]); sky.addColorStop(1, skies[season][1]);
    ctx.fillStyle = sky; ctx.fillRect(0, top, w, h);
    const base = top + h * 0.82;
    // Ferne Hegauberge
    ctx.fillStyle = season === 1 ? '#c9cfd4' : '#9aa7a6';
    ctx.beginPath(); ctx.moveTo(0, base);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, base - h * 0.12 - Math.sin(x / 90) * h * 0.04 - (Math.abs(x - w * 0.15) < w * 0.05 ? h * 0.12 * (1 - Math.abs(x - w * 0.15) / (w * 0.05)) : 0) - (Math.abs(x - w * 0.85) < w * 0.06 ? h * 0.1 * (1 - Math.abs(x - w * 0.85) / (w * 0.06)) : 0));
    ctx.lineTo(w, base); ctx.fill();
    // Ebene
    const field = ['#a7a25a', '#e9edf0', '#8fb06a', '#c2b25e'][season];
    ctx.fillStyle = field; ctx.fillRect(0, base, w, top + h - base);
    // Singen (Dorf)
    ctx.fillStyle = '#8a6d4e';
    for (let k = 0; k < 9; k++) { const x = w * 0.68 + k * 14; ctx.fillRect(x, base - 8, 10, 8); ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(x - 2, base - 8); ctx.lineTo(x + 5, base - 14); ctx.lineTo(x + 12, base - 8); ctx.fill(); ctx.fillStyle = '#8a6d4e'; }
    ctx.fillStyle = '#3a2814'; ctx.font = '12px Georgia'; ctx.fillText('Singen', w * 0.68, base + 14);
    // Der Fels
    const cx = w * 0.42, rw = Math.min(w * 0.28, h * 0.75), rh = h * 0.5;
    ctx.fillStyle = season === 1 ? '#6e6a66' : '#5e5a52';
    ctx.beginPath(); ctx.moveTo(cx - rw, base);
    ctx.bezierCurveTo(cx - rw * 0.6, base - rh * 0.25, cx - rw * 0.35, base - rh * 0.8, cx - rw * 0.12, base - rh);
    ctx.lineTo(cx + rw * 0.15, base - rh * 0.98);
    ctx.bezierCurveTo(cx + rw * 0.35, base - rh * 0.75, cx + rw * 0.55, base - rh * 0.3, cx + rw * 1.1, base);
    ctx.fill();
    ctx.fillStyle = season === 1 ? '#f4f6f8' : season === 0 ? '#8a7a3a' : '#5f7a44';
    ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(cx - rw, base); ctx.bezierCurveTo(cx - rw * 0.6, base - rh * 0.22, cx - rw * 0.4, base - rh * 0.45, cx - rw * 0.25, base - rh * 0.5); ctx.lineTo(cx + rw * 0.4, base - rh * 0.5); ctx.bezierCurveTo(cx + rw * 0.55, base - rh * 0.3, cx + rw * 0.8, base - rh * 0.1, cx + rw * 1.1, base); ctx.fill();
    ctx.globalAlpha = 1;
    // Festung: Unterfestung, Oberfestung, Rondell
    const wall = '#d8d0bf', roof = '#7a4a2c';
    const fy = base - rh;
    ctx.fillStyle = wall;
    ctx.fillRect(cx - rw * 0.32, base - rh * 0.55, rw * 0.6, rh * 0.07);
    ctx.fillRect(cx - rw * 0.18, fy - rh * 0.06, rw * 0.38, rh * 0.08);
    ctx.beginPath(); ctx.arc(cx + rw * 0.2, fy - rh * 0.03, rh * 0.06, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx + rw * 0.2 - rh * 0.06, fy - rh * 0.03, rh * 0.12, rh * 0.05);
    ctx.fillRect(cx - rw * 0.06, fy - rh * 0.16, rw * 0.07, rh * 0.11);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(cx - rw * 0.075, fy - rh * 0.16); ctx.lineTo(cx - rw * 0.025, fy - rh * 0.24); ctx.lineTo(cx + rw * 0.025, fy - rh * 0.16); ctx.fill();
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cx - rw * 0.16 + k * rw * 0.09, fy - rh * 0.06); ctx.lineTo(cx - rw * 0.12 + k * rw * 0.09, fy - rh * 0.11); ctx.lineTo(cx - rw * 0.08 + k * rw * 0.09, fy - rh * 0.06); ctx.fill(); }
    if (g.allies.mill) { // Windmühle
      const mx = cx - rw * 0.25, my = base - rh * 0.55;
      ctx.fillStyle = wall; ctx.fillRect(mx - 5, my - 22, 10, 22);
      ctx.strokeStyle = '#4b3a28'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const a = this.time * 0.8 + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(mx, my - 20); ctx.lineTo(mx + Math.cos(a) * 16, my - 20 + Math.sin(a) * 16); ctx.stroke(); }
    }
    // Fahne
    const fx = cx - rw * 0.025, fyy = fy - rh * 0.24;
    ctx.strokeStyle = '#3b2b1d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx, fyy); ctx.lineTo(fx, fyy - 26); ctx.stroke();
    ctx.fillStyle = '#e2b437'; ctx.fillRect(fx, fyy - 26, 18, 11);
    ctx.fillStyle = '#1d1a16'; for (let k = 0; k < 3; k++) ctx.fillRect(fx + 2, fyy - 24 + k * 3.3, 14, 1.4);
    // Winter: Schnee
    if (season === 1) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 80; k++) { const x = (k * 97 + this.time * 20) % w, y = top + ((k * 53 + this.time * 40) % h); ctx.fillRect(x, y, 2, 2); } }
    // Belagerung: Lager, Batterien, Rauch
    if (g.siege) {
      const n = Math.min(14, Math.round(g.siege.strength / 300));
      for (let k = 0; k < n; k++) {
        const x = (k % 2 ? cx + rw * (1.2 + k * 0.06) : cx - rw * (1.15 + k * 0.06)), y = base + 6 + (k % 3) * 6;
        ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x, y - 12); ctx.lineTo(x + 8, y); ctx.fill();
      }
      if (!g.siege.blockade) {
        if (Math.random() < dt * 2) this.shots.push({ x: Math.random() < 0.5 ? cx - rw * 0.9 : cx + rw * 0.95, y: base - 4, t: this.time });
        this.shots = this.shots.filter(s => this.time - s.t < 2.5);
        for (const s of this.shots) {
          const a = (this.time - s.t);
          ctx.fillStyle = `rgba(230,230,225,${Math.max(0, 0.7 - a * 0.3)})`;
          ctx.beginPath(); ctx.arc(s.x + a * 8, s.y - a * 12, 6 + a * 8, 0, 7); ctx.fill();
          if (a < 0.12) { ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, 7); ctx.fill(); }
        }
      }
      ctx.fillStyle = '#a8342a'; ctx.font = 'bold 14px Georgia'; ctx.fillText('Belagerer', cx + rw * 1.2, base + 32);
    }
    // Reiter (Streifzug / Ausfall)
    this.raiders = this.raiders.filter(r => this.time - r.t < 3);
    for (const r of this.raiders) {
      const a = (this.time - r.t) / 3;
      for (let k = 0; k < 6; k++) {
        const x = cx + rw * 0.6 + (r.dir > 0 ? a : 0.3 - a * 0.3) * w * 0.5 + k * 9, y = base + 14 + (k % 2) * 5;
        ctx.fillStyle = '#3b2b1d'; ctx.fillRect(x, y - 6, 9, 4); ctx.fillRect(x + 6, y - 9, 3, 4);
        ctx.fillRect(x + 1, y - 2, 1.5, 4 + Math.sin(this.time * 20 + k) * 1.5); ctx.fillRect(x + 7, y - 2, 1.5, 4 - Math.sin(this.time * 20 + k) * 1.5);
        ctx.fillStyle = '#6b5a45'; ctx.fillRect(x + 3, y - 11, 3, 5);
      }
    }
    ctx.fillStyle = '#2a1d10'; ctx.font = 'italic 13px Georgia';
    ctx.fillText('Hohentwiel im Hegau (Darstellung frei nach Merian, vereinfacht)', 10, top + h - 8);
  }
}
