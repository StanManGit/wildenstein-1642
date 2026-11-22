// Darstellung und Bedienung für Kapitel 5
import { ZGame, ZSide, Plan, Site, Sector, FOrder, ROrder, Div, SITES, SECTORS, SECTOR_NAME, FORDERS, Z_PROLOG, Z_CHRONICLE, Z_EPILOG, hhmm } from './game';
import type { Entry, Slide } from '../history';

export interface ZApi {
  modal(html: string, buttons: string[], cls?: string): Promise<number>;
  entryHtml(e: Entry, h?: string): string;
  log(m: string, k?: 'info' | 'good' | 'bad'): void;
  song(n: 'tanz' | 'marsch'): void;
  boom(size: number, x: number): void;
  exit(): void;
}

const $ = (id: string) => document.getElementById(id)!;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const Z_SLIDES: Slide[] = [
  { file: 'François-Louis Dedon-Duclos Limmatübergang Massénas bei Dietikon 25. September 1799.jpg', credit: 'Nach François-Louis Dedon-Duclos, 1801', license: 'gemeinfrei', tag: 'belegt',
    title: 'Über die Limmat', text: 'Gezeichnet nach dem Bericht des Mannes, der die Pontoniere führte: Im Morgengrauen des 25. September 1799 setzen die Franzosen bei Dietikon über den Fluss.' },
  { file: 'André Masséna (Fontaine et Gros).jpg', credit: 'Fontaine und Gros', license: 'gemeinfrei', tag: 'belegt',
    title: 'André Masséna', text: 'Der französische General verteidigt die Schweiz gegen Österreicher und Russen. Er muss zuschlagen, bevor Suworow aus Italien eintrifft.' },
  { file: 'Schlacht bei Zuerich 2 1799.jpg', credit: 'Dmitri Miliutin, 1857', license: 'gemeinfrei', tag: 'belegt',
    title: 'Das Schlachtfeld', text: 'Die Limmat fließt vom Zürichsee nach Nordwesten zur Aare. Am rechten Ufer stehen die Russen unter Korsakow, am linken die Franzosen.' },
  { file: 'Vasily Surikov - Suvorov Crossing the Alps in 1799 - Google Art Project.jpg', credit: 'Wassili Surikow, 1899', license: 'gemeinfrei', tag: 'hintergrund',
    title: 'Suworow in den Alpen', text: 'Hundert Jahre später gemalt: Suworows Russen auf dem Weg über die Berge. Kommen sie rechtzeitig nach Zürich?' },
];

// Kartenpunkte (0..1)
const P = {
  city: [0.8, 0.74], zberg: [0.88, 0.6], hoengg: [0.64, 0.5], kaefer: [0.75, 0.58], fahr: [0.5, 0.4], regens: [0.47, 0.27], wuren: [0.22, 0.07], wollis: [0.75, 0.88],
};
const WEST: Record<Site, number[]> = { vogelsang: [0.08, 0.2], dietikon: [0.41, 0.52], wipkingen: [0.66, 0.72] };
const ZPTS: Record<Site, number[][]> = {
  vogelsang: [[0.15, 0.12], P.wuren, P.regens, P.hoengg, P.zberg],
  dietikon: [[0.47, 0.45], P.fahr, P.hoengg, P.zberg],
  wipkingen: [[0.72, 0.64], P.kaefer, P.zberg],
};
const SECT_PT: Record<Sector, number[]> = { vogelsang: [0.15, 0.13], dietikon: [0.47, 0.45], wipkingen: [0.72, 0.64], wollishofen: P.wollis };
const RIVER = [[0.8, 0.78], [0.74, 0.7], [0.69, 0.67], [0.6, 0.58], [0.52, 0.52], [0.44, 0.48], [0.36, 0.4], [0.28, 0.3], [0.2, 0.22], [0.12, 0.16]];

export class ZuerichUI {
  g: ZGame;
  api: ZApi;
  me: ZSide;
  active = true;
  time = 0;
  wake: (() => void) | null = null;
  order: FOrder | null = null;
  rorder: ROrder | null = null;
  flashes: { x: number; y: number; t: number }[] = [];

  constructor(api: ZApi, me: ZSide) {
    this.api = api; this.me = me;
    this.g = new ZGame((Math.random() * 2 ** 31) | 0);
    $('zMenu').onclick = async () => {
      const i = await this.api.modal('<h2>Menü</h2>', ['Hauptmenü', 'Chronik', 'Weiterspielen']);
      if (i === 0) { this.active = false; this.wake?.(); this.api.exit(); }
      if (i === 1) this.chronik();
    };
    $('zChron').onclick = () => this.chronik();
  }

  async chronik() {
    const items = [...Z_PROLOG, ...Z_CHRONICLE.filter(c => this.g.shown.has(c.h)).map(c => c.e)].map(e => this.api.entryHtml(e));
    await this.api.modal(`<h2>Chronik</h2><div class="scroll">${items.join('')}</div>`, ['Schließen'], 'wide');
  }

  async planFr(): Promise<Plan> {
    const radio = (name: string, opts: [string, string, string][], def: string) => opts.map(([v, l, info]) => `<label class="opt"><input type="radio" name="${name}" value="${v}" ${v === def ? 'checked' : ''}><b>${l}</b><small>${info}</small></label>`).join('');
    const html = `<h2>Der Plan für die Nacht</h2><p class="small">Nacht zum 25. September 1799. Was Korsakow davon erfährt, hängt von deinen Täuschungen ab.</p><div class="plan">
      <div class="grp"><h3>Wo setzt Lorge mit 8.000 Mann über?</h3>${radio('site', (Object.keys(SITES) as Site[]).map(s => [s, SITES[s].name, SITES[s].info]), 'dietikon')}</div>
      <div class="grp"><h3>Wann beginnt der Übergang?</h3>${radio('start', [['frueh', '03:30', 'Stockdunkel: kaum Gefahr entdeckt zu werden, aber Boote verirren sich.'], ['hist', '04:45', 'Erstes Grau, Nebel über dem Fluss. So war es 1799.'], ['spaet', '06:00', 'Es wird hell. Ordentlich, aber die Russen sehen alles.']], 'hist')}</div>
      <div class="grp"><h3>Mortier greift bei Wollishofen an</h3>${radio('mortier', [['stark', 'stark (5.000)', 'Bindet viele Russen, kostet Männer.'], ['schwach', 'schwach (2.000)', 'Ein Scheinangriff.'], ['keine', 'gar nicht', 'Alles bleibt in der Reserve.']], 'schwach')}</div>
      <div class="grp"><h3>Ménard täuscht an den anderen Übergangsstellen</h3>${radio('menard', [['stark', 'stark (3.000)', 'Viel Lärm, die Russen bleiben stehen.'], ['schwach', 'schwach (1.000)', 'Ein paar Trommler und Feuer.'], ['keine', 'gar nicht', '']], 'stark')}</div>
      <div class="grp"><h3>Soult an der Linth gegen Hotze</h3>${radio('soult', [['nacht', 'Nachts mit Schwimmern', 'Kühn: Flöße um 2:30 Uhr über den Fluss.'], ['tag', 'Bei Tag', 'Sicherer für die Männer, aber Hotze ist gewarnt.'], ['binden', 'Nur binden', 'Kein Angriff. Hotze schickt dann Hilfe nach Zürich.']], 'nacht')}</div>
      <p class="small">Was nicht für Ablenkungen gebraucht wird, bildet Kleins Reserve (zusammen 12.000 Mann).</p></div>`;
    await this.api.modal(html, ['Befehle ausgeben'], 'wide');
    const v = (n: string) => (document.querySelector(`#card input[name="${n}"]:checked`) as HTMLInputElement).value;
    return { site: v('site') as Site, start: v('start') as Plan['start'], mortier: v('mortier') as Div, menard: v('menard') as Div, soult: v('soult') as Plan['soult'] };
  }

  async run() {
    document.body.classList.add('zh');
    const g = this.g;
    const fr = this.me === 'fr';
    await this.api.modal(`<h2>So wird gespielt</h2><ul>
      ${fr ? `<li>Du bist <b>Masséna</b>. Zuerst planst du die Nacht: Übergangsstelle, Uhrzeit, Ablenkungen und den Angriff an der Linth.</li>
      <li>Dann läuft der 25. September in Viertelstunden, später in halben und ganzen Stunden. In jedem Schritt gibst du einen Befehl: angreifen, feuern, Brücke schlagen, Reserve holen oder sammeln.</li>
      <li>Die Boote fahren von selbst. Sobald die Brücke steht, kommen viel mehr Männer und die Geschütze hinüber.</li>
      <li>Ziel: bis zum Abend den Zürichberg nehmen und Korsakow einschließen, bevor Suworow kommt.</li>`
      : `<li>Du bist <b>Korsakow</b>. Die Franzosen greifen irgendwo an der Limmat an, aber wo ist der echte Angriff?</li>
      <li>Du siehst nur Meldungen: Lärm, Schüsse, Gefechte. Manches davon ist Täuschung.</li>
      <li>In jedem Schritt schickst du 2.000 Mann aus der Stadt, lässt Kosaken erkunden oder greifst an.</li>
      <li>Ziel: Zürich halten, bis Suworow aus den Bergen kommt.</li>`}
      <li>Die Chronik erzählt nebenher, was am 25. September 1799 wirklich geschah.</li></ul>`, ['Los geht’s']);
    await this.api.modal(`<h2>Vorgeschichte</h2><div class="scroll">${Z_PROLOG.map(e => this.api.entryHtml(e)).join('')}</div>`, ['Weiter'], 'wide');
    if (fr) {
      const plan = await this.planFr();
      g.dispatch({ t: 'plan', plan, rapperswil: true });
    } else {
      const i = await this.api.modal(`<h2>Deine Reserve</h2><p>Hotze bittet um Hilfe an der Linth. Schickst du deine Reserve von 5.000 Mann nach Rapperswil, wie Korsakow es tat?</p>`, ['Nach Rapperswil schicken', 'In Zürich behalten']);
      g.dispatch({ t: 'plan', plan: ZGame.aiPlan(g.rnd), rapperswil: i === 0 });
    }
    this.flush();
    this.api.song('marsch');
    while (g.phase === 'tick' && this.active) {
      for (const c of Z_CHRONICLE) if (g.h >= c.h && !g.shown.has(c.h)) {
        g.shown.add(c.h);
        await this.api.modal(`<div class="kicker">25. September 1799 · ${hhmm(g.h)} Uhr</div>` + this.api.entryHtml(c.e, 'h2'), ['Weiter']);
      }
      this.update();
      if (fr) { this.order = null; await new Promise<void>(r => { this.wake = r; this.update(); }); this.wake = null; if (!this.active) return; g.dispatch({ t: 'tick', fr: this.order!, ru: g.aiRu() }); }
      else { this.rorder = null; await new Promise<void>(r => { this.wake = r; this.update(); }); this.wake = null; if (!this.active) return; g.dispatch({ t: 'tick', fr: g.aiFr(), ru: this.rorder! }); }
      this.fx(); this.flush();
      await sleep(250);
    }
    if (!this.active) return;
    if (g.phase === 'evening') {
      this.update();
      let fo = g.aiEveningFr(), ro = g.aiEveningRu();
      if (g.zone >= g.last) {
        if (fr) fo = (await this.api.modal(`<h2>Abend des 25. September</h2><p>Der Zürichberg ist dein. Korsakow sitzt mit dem Rest seiner Armee in der Stadt. Morgen wird er ausbrechen, wohl Richtung Winterthur.</p><p>${g.fr.reserveUsed ? `Du hast noch ${g.fr.west} Mann am Westufer.` : `Kleins Reserve (${g.fr.reserve} Mann) steht noch bereit.`}</p>`, ['Truppen ruhen lassen (wie Masséna)', 'Straße nach Winterthur sperren'])) === 1 ? 'sperren' : 'ruhen';
        else ro = (await this.api.modal(`<h2>Abend des 25. September</h2><p>Die Franzosen stehen auf dem Zürichberg. Du bist in der Stadt eingeschlossen.</p><p class="small">Österreicher von der Linth: ${g.linth.ok ? 'geschlagen, keine Hilfe' : 'noch im Feld'}</p>`, ['In der Stadt halten', 'Ausbruch nach Winterthur'])) === 1 ? 'ausbruch' : 'halten';
      }
      g.dispatch({ t: 'evening', fr: fo, ru: ro });
    }
    this.update();
    this.api.song('tanz');
    const mine = g.winner === this.me;
    const i = await this.api.modal(`<h2>${g.grade}</h2><p>${g.endText}</p><p class="small">${mine ? 'Gewonnen!' : 'Verloren.'} Verluste der Franzosen ${g.fr.lost.toLocaleString('de-DE')} · Verluste der Russen ${(g.ru.lost + g.ru.captured).toLocaleString('de-DE')} (davon ${g.ru.captured.toLocaleString('de-DE')} gefangen)</p>` + Z_EPILOG.map(e => this.api.entryHtml(e)).join(''), ['Chronik ansehen', 'Hauptmenü'], 'wide');
    if (i === 0) await this.chronik();
    this.api.exit();
  }

  fx() {
    const g = this.g;
    if (this.me === 'fr' || (g.detected && (g.zone >= 1 || g.scouted.has(g.plan.site)))) {
      const z = ZPTS[g.plan.site][Math.min(g.zone + 1, g.last)];
      for (let k = 0; k < 4; k++) this.flashes.push({ x: z[0] + (Math.random() - 0.5) * 0.05, y: z[1] + (Math.random() - 0.5) * 0.05, t: this.time + k * 0.2 });
      this.api.boom(0.3, 340);
    }
  }

  flush() { for (const r of this.g.report.splice(0)) this.api.log(r, /verloren|abgeschlagen|scheitert|Bajonett|zurück/.test(r) ? 'bad' : /genommen|steht|durch|gefallen/.test(r) ? 'good' : 'info'); }

  word(n: number) { return n < 200 ? 'ruhig' : n < 1200 ? 'Plänkelei' : n < 3500 ? 'Gefecht' : 'schwerer Angriff'; }

  update() {
    const g = this.g;
    $('zTime').textContent = `25. Sept. 1799 · ${hhmm(g.h)} Uhr`;
    $('zLight').textContent = g.light() === 'dunkel' ? '🌑 dunkel' : g.light() === 'Dämmerung' ? '🌫 Dämmerung, Nebel' : '☀ Tag';
    $('zSuw').textContent = '⏳ ' + g.suworow();
    const fr = this.me === 'fr';
    if (fr) {
      $('zStats').innerHTML = `<b class="fr">Franzosen</b> Westufer ${g.fr.west.toLocaleString('de-DE')} · Ostufer ${g.fr.east.toLocaleString('de-DE')} · Moral ${Math.round(g.fr.morale)} · Brücke ${g.bridge < 0 ? 'nicht begonnen' : Math.round(g.bridge) + ' %'} · Geschütze drüben ${g.fr.gunsEast}/26 · Stellung: ${g.zones[g.zone]}${g.fr.mortier ? ` · Mortier ${Math.round(g.mortierProg)} %` : ''} &nbsp; <b class="ru">Russen vor dir</b> ≈ ${(Math.round(g.front / 100) * 100).toLocaleString('de-DE')}${g.detected ? '' : ' (noch ahnungslos)'}`;
    } else {
      $('zStats').innerHTML = `<b class="ru">Russen</b> in der Stadt ${g.ru.pool.toLocaleString('de-DE')} · unterwegs ${g.travel.reduce((a, t) => a + t.n, 0).toLocaleString('de-DE')} · Moral ${Math.round(g.ru.morale)} · Verluste ${(g.ru.lost + g.ru.captured).toLocaleString('de-DE')}`;
    }
    const box = $('zBody'); box.innerHTML = '';
    const waiting = !!this.wake;
    $('zCtl').classList.toggle('ai', !waiting);
    if (fr) {
      for (const o of Object.keys(FORDERS) as FOrder[]) {
        const b = document.createElement('button'); b.className = 'act';
        const off = (o === 'bruecke' && g.bridge >= 0) || (o === 'reserve' && (g.fr.reserveUsed || g.fr.reserve <= 0)) || (o === 'angriff' && (g.fr.east < 50 || g.zone >= g.last));
        b.disabled = off;
        const extra = o === 'angriff' && g.zone < g.last ? ` Ziel: ${g.zones[g.zone + 1]}` : o === 'reserve' ? ` (${g.fr.reserve} Mann)` : '';
        b.innerHTML = `<b>${FORDERS[o].name}</b><small>${FORDERS[o].info}${extra}</small>`;
        b.onclick = () => { if (!this.wake) return; this.order = o; this.wake(); };
        box.appendChild(b);
      }
    } else {
      for (const s of SECTORS) {
        const row = document.createElement('div'); row.className = 'sect';
        const own = g.ru.garrison[s], coming = g.travel.filter(t => t.to === s).reduce((a, t) => a + t.n, 0);
        const seen = g.scouted.has(s) ? ` <small>(erkundet: ≈ ${Math.round(g.trueStrength(s) / 100) * 100})</small>` : '';
        row.innerHTML = `<span class="sn"><b>${SECTOR_NAME[s]}</b> <span class="rep r${Math.min(3, Math.floor(g.intensity[s] / 1200))}">${this.word(g.intensity[s])}</span>${seen}<br><small>eigene ${own.toLocaleString('de-DE')}${coming ? ` + ${coming} unterwegs` : ''}</small></span>`;
        const mk = (label: string, ro: ROrder, dis = false) => { const b = document.createElement('button'); b.textContent = label; b.disabled = dis; b.onclick = () => { if (!this.wake) return; this.rorder = ro; this.wake(); }; row.appendChild(b); };
        mk('+2.000', { t: 'send', to: s }, g.ru.pool <= 0);
        mk('Erkunden', { t: 'scout', to: s }, g.scouted.has(s));
        mk('Angreifen', { t: 'counter', to: s }, own < 500);
        box.appendChild(row);
      }
      const b = document.createElement('button'); b.className = 'primary'; b.textContent = 'Abwarten ⏭';
      b.onclick = () => { if (!this.wake) return; this.rorder = { t: 'hold' }; this.wake(); };
      box.appendChild(b);
    }
  }

  draw(ctx: CanvasRenderingContext2D, cw: number, ch: number, dt: number) {
    this.time += dt;
    const g = this.g;
    const top = $('zHud').offsetHeight, bottom = $('zCtl').offsetHeight;
    const vh = ch - top - bottom - 8;
    let w = cw - 16, h = w / 1.6;
    if (h > vh) { h = vh; w = h * 1.6; }
    const R = { x: (cw - w) / 2, y: top + 4 + (vh - h) / 2, w, h };
    const X = (x: number) => R.x + x * R.w, Y = (y: number) => R.y + y * R.h;
    const fs = (k: number, min = 10) => `${Math.max(min, R.w * k)}px Georgia`;
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.fillStyle = '#dcd3a8'; ctx.fillRect(R.x, R.y, R.w, R.h);
    // Wälder
    const hsh = (n: number) => { const v = Math.sin(n) * 43758.5453; return v - Math.floor(v); };
    ctx.fillStyle = 'rgba(95,120,70,0.35)';
    for (let k = 0; k < 70; k++) { ctx.beginPath(); ctx.ellipse(X(hsh(k * 12.9898)), Y(hsh(k * 78.233 + 3)), R.w * 0.025, R.h * 0.018, 0, 0, 7); ctx.fill(); }
    // Höhen
    for (const [p, r] of [[P.zberg, 0.09], [P.hoengg, 0.08], [P.kaefer, 0.05]] as [number[], number][]) {
      const gr = ctx.createRadialGradient(X(p[0]), Y(p[1]), 2, X(p[0]), Y(p[1]), R.w * r);
      gr.addColorStop(0, 'rgba(120,95,60,0.45)'); gr.addColorStop(1, 'rgba(120,95,60,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), R.w * r, 0, 7); ctx.fill();
    }
    // See, Aare, Limmat
    ctx.fillStyle = '#7d9db4';
    ctx.beginPath(); ctx.ellipse(X(0.95), Y(1.02), R.w * 0.2, R.h * 0.2, -0.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7d9db4'; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(5, R.w * 0.011); ctx.beginPath(); ctx.moveTo(X(0), Y(0.24)); ctx.quadraticCurveTo(X(0.1), Y(0.17), X(0.27), Y(0)); ctx.stroke();
    ctx.lineWidth = Math.max(4, R.w * 0.008); ctx.beginPath(); RIVER.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke();
    ctx.fillStyle = '#4e6f8a'; ctx.font = `italic ${fs(0.013)}`;
    ctx.fillText('Limmat', X(0.3), Y(0.37)); ctx.fillText('Aare', X(0.02), Y(0.15)); ctx.fillText('Zürichsee', X(0.86), Y(0.93));
    // Stadt
    ctx.fillStyle = '#a8876a'; ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(P.city[0]), Y(P.city[1]), R.w * 0.03, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1d10'; ctx.font = `bold ${fs(0.016)}`; ctx.fillText('Zürich', X(P.city[0]) + R.w * 0.035, Y(P.city[1]) + 5);
    ctx.font = fs(0.011);
    const lbl = (p: number[], t: string) => ctx.fillText(t, X(p[0]) + 6, Y(p[1]) - 6);
    lbl(P.zberg, 'Zürichberg'); lbl(P.hoengg, 'Höngger Berg'); lbl(P.kaefer, 'Käferberg'); lbl(P.fahr, 'Kloster Fahr'); lbl(P.regens, 'Regensdorf'); lbl(P.wuren, 'Würenlingen'); lbl(P.wollis, 'Wollishofen');
    for (const s of Object.keys(WEST) as Site[]) { ctx.fillStyle = '#2a1d10'; ctx.fillText(SITES[s].name, X(WEST[s][0]) - 10, Y(WEST[s][1]) + 18); }
    const fr = this.me === 'fr';
    const site = g.plan.site, zp = ZPTS[site];
    const seeFr = fr || g.over || (g.detected && (g.zone >= 1 || g.scouted.has(site)));
    const token = (p: number[], n: number, col: string, txt?: string) => {
      const x = X(p[0]), y = Y(p[1]); const s = Math.max(14, Math.min(34, 8 + Math.sqrt(n) * 0.25));
      ctx.fillStyle = col; ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 1.5; ctx.fillRect(x - s / 2, y - s / 3, s, s * 0.66); ctx.strokeRect(x - s / 2, y - s / 3, s, s * 0.66);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${fs(0.009)}`; ctx.textAlign = 'center'; ctx.fillText(txt ?? (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)), x, y + 4); ctx.textAlign = 'left';
    };
    // Weg der Franzosen
    if (g.phase !== 'plan' && seeFr) {
      ctx.strokeStyle = 'rgba(40,70,160,0.5)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); zp.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke(); ctx.setLineDash([]);
      // Brücke
      if (g.bridge >= 0) {
        const a = WEST[site], b = zp[0]; ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(a[0] + (b[0] - a[0]) * g.bridge / 100), Y(a[1] + (b[1] - a[1]) * g.bridge / 100)); ctx.stroke();
      }
      // Boote
      if (g.fr.west > 0 && g.phase === 'tick') for (let k = 0; k < 4; k++) {
        const t = ((this.time * 0.3 + k / 4) % 1), a = WEST[site], b = zp[0];
        ctx.fillStyle = '#3b2a18'; ctx.beginPath(); ctx.ellipse(X(a[0] + (b[0] - a[0]) * t), Y(a[1] + (b[1] - a[1]) * t), 5, 2.5, -0.6, 0, 7); ctx.fill();
      }
    }
    // Russische Truppen
    for (const s of SECTORS) {
      const n = g.ru.garrison[s]; if (n < 50) continue;
      const p = s === site && g.zone > 0 ? zp[Math.min(g.zone + 1, g.last)] : s === site ? [zp[0][0] + 0.03, zp[0][1] - 0.04] : [SECT_PT[s][0] + 0.03, SECT_PT[s][1] - 0.035];
      token(p, n, '#2f5a2f', fr ? '~' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : Math.round(n / 100) * 100) : undefined);
    }
    if (g.ru.pool > 0) token([P.city[0] + 0.02, P.city[1] - 0.06], g.ru.pool, '#2f5a2f', fr ? '?' : undefined);
    for (const t of g.travel) { const a = P.city, b = SECT_PT[t.to]; ctx.strokeStyle = 'rgba(47,90,47,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke(); ctx.setLineDash([]); }
    // Französische Truppen
    if (seeFr) {
      if (g.fr.west > 0) token(WEST[site], g.fr.west, '#2e4f9e');
      if (g.fr.east > 0) token(zp[g.zone], g.fr.east, '#2e4f9e');
    }
    if (fr) {
      if (g.fr.mortier > 0) token([0.68, 0.94], g.fr.mortier, '#2e4f9e');
      if (g.fr.menard > 0) for (const s of g.menardSites()) token([WEST[s][0] - 0.03, WEST[s][1] + 0.03], g.fr.menard / 2, '#5a74b8');
    } else {
      // Meldungen als Glühen
      for (const s of SECTORS) {
        const it = g.intensity[s]; if (it < 200) continue;
        const p = SECT_PT[s], r = R.w * (0.03 + Math.min(0.06, it / 100000));
        const gr = ctx.createRadialGradient(X(p[0]), Y(p[1]), 1, X(p[0]), Y(p[1]), r);
        gr.addColorStop(0, `rgba(230,90,40,${0.35 + 0.15 * Math.sin(this.time * 4)})`); gr.addColorStop(1, 'rgba(230,90,40,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), r, 0, 7); ctx.fill();
      }
    }
    // Mündungsfeuer
    this.flashes = this.flashes.filter(f => this.time - f.t < 1.2);
    for (const f of this.flashes) { const a = this.time - f.t; if (a < 0) continue; ctx.fillStyle = `rgba(255,200,110,${Math.max(0, 0.9 - a)})`; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), 3 + a * 10, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(230,230,230,${Math.max(0, 0.5 - a * 0.4)})`; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y) - a * 12, 6 + a * 12, 0, 7); ctx.fill(); }
    // Linth-Kasten
    ctx.fillStyle = 'rgba(245,238,215,0.9)'; ctx.fillRect(X(0.8), Y(0.03), R.w * 0.18, R.h * 0.13); ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 1; ctx.strokeRect(X(0.8), Y(0.03), R.w * 0.18, R.h * 0.13);
    ctx.fillStyle = '#2a1d10'; ctx.font = `bold ${fs(0.011, 7)}`; ctx.fillText('Linth: Soult gegen Hotze', X(0.81), Y(0.065));
    ctx.font = fs(0.0085, 6);
    ctx.fillText(!g.linth.reported ? 'noch keine Nachricht' : g.linth.ok ? (g.linth.hotze ? 'Hotze gefallen, Österreicher weichen' : 'Österreicher weichen') : 'Österreicher halten', X(0.81), Y(0.1));
    ctx.fillText('→ ' + g.suworow(), X(0.81), Y(0.14));
    // Tageszeit
    const dark = g.phase === 'plan' ? 0.5 : g.light() === 'dunkel' ? 0.45 : g.light() === 'Dämmerung' ? 0.22 : g.h >= 18 ? 0.25 : 0;
    if (dark) { ctx.fillStyle = `rgba(10,15,40,${dark})`; ctx.fillRect(R.x, R.y, R.w, R.h); }
    ctx.restore();
    ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 3; ctx.strokeRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = dark > 0.3 ? '#ddd' : '#3a2814'; ctx.font = `italic ${fs(0.0095)}`;
    ctx.fillText('Karte vereinfacht, nicht maßstäblich', R.x + 8, R.y + R.h - 8);
  }
}
