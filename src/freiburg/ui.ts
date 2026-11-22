// Darstellung und Bedienung für Kapitel 2 (Karte des Breisgaus)
import { FGame, FUnit, TURNS } from './game';
import { NODES, EDGES, FSide, KIND_NAME, FB_CHRONICLE, FB_EPILOG, FB_SLIDES, fbDate } from './data';
import type { Entry, Slide } from '../history';

export interface Api {
  modal(html: string, buttons: string[], cls?: string): Promise<number>;
  entryHtml(e: Entry, h?: string): string;
  log(m: string, k?: 'info' | 'good' | 'bad'): void;
  song(n: 'tanz' | 'marsch'): void;
  intro(slides: Slide[]): Promise<void>;
  exit(): void;
}

const $ = (id: string) => document.getElementById(id)!;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const COL: Record<FSide, { fill: string; edge: string; text: string; name: string }> = {
  fr: { fill: '#2e4f9e', edge: '#e9d48a', text: '#fff', name: 'Franzosen' },
  bav: { fill: '#a8342a', edge: '#f2efe6', text: '#fff', name: 'Bayern' },
};

export class FreiburgUI {
  g: FGame;
  api: Api;
  ctrl: Record<FSide, 'human' | 'ai'>;
  sel: FUnit | null = null;
  rect = { x: 0, y: 0, w: 1, h: 1 };
  hover: string | null = null;
  busy = false;
  seenTurn = -1;
  time = 0;
  wake: (() => void) | null = null;
  flashes: { node: string; t: number; good: boolean }[] = [];
  active = true;

  constructor(api: Api, ctrl: Record<FSide, 'human' | 'ai'>) {
    this.api = api; this.ctrl = ctrl;
    this.g = new FGame((Math.random() * 2 ** 31) | 0, (m, k) => api.log(m, k));
    this.bind();
  }

  pos(id: string) { const n = NODES.find(n => n.id === id)!; return { x: this.rect.x + n.x * this.rect.w, y: this.rect.y + n.y * this.rect.h }; }

  human() { return !this.g.over && this.ctrl[this.g.side] === 'human' && !this.busy; }

  bind() {
    $('fbEnd').onclick = () => { if (this.human()) { this.sel = null; this.exec({ t: 'end' }); } };
    $('fbDig').onclick = () => { if (this.human() && this.sel) this.exec({ t: 'entrench', unit: this.sel.id }); };
    $('fbMenu').onclick = async () => {
      const i = await this.api.modal('<h2>Menü</h2>', ['Hauptmenü', 'Spielanleitung', 'Weiterspielen']);
      if (i === 0) { this.active = false; this.wake?.(); this.api.exit(); }
      if (i === 1) this.help();
    };
    $('fbChron').onclick = () => this.chronik();
  }

  async exec(c: Parameters<FGame['dispatch']>[0]) {
    this.g.dispatch(c);
    const b = this.g.lastBattle;
    if (b) this.flashes.push({ node: b.node, t: this.time, good: b.won });
    if (this.sel && (!this.sel.alive || this.sel.mp <= 0)) this.sel = null;
    this.update();
    this.wake?.();
  }

  async help() {
    await this.api.modal(`<h2>So wird gespielt</h2><ul>
      <li>Jede Runde ist ein halber Tag (Morgen, Abend), vom 3. bis 10. August 1644. Erst ziehen die Franzosen, dann die Bayern.</li>
      <li>Tippe einen eigenen Verband an, dann einen benachbarten Ort: <b>leer</b> = hinmarschieren, <b>Feind</b> = angreifen. Reiterei und Dragoner kommen bei trockenem Wetter zwei Orte weit.</li>
      <li>Vor jedem Angriff siehst du die Aussicht. Berge, Wälder, die Stadt und Schanzen helfen dem Verteidiger. Reiterei ist in der Ebene stark, am Berg schwach.</li>
      <li><b>Artillerie</b> greift nicht an, sondern beschießt einen benachbarten Ort und beschädigt Schanzen. <b>Schanzen</b> kann Fußvolk, das in dieser Runde noch nicht gezogen ist.</li>
      <li><b>Regen</b> macht Pulver nass: Musketen und Geschütze verlieren an Wirkung, Märsche werden langsamer, Geschütze bleiben stecken.</li>
      <li>Wer nicht zieht, erholt sich. Verbände mit zu hohen Verlusten oder gebrochener Moral lösen sich auf.</li>
      <li><b>Siegpunkte</b> gibt es für feindliche Verluste, Bohl, Schlierberg, Wonnhalde und Freiburg, den bayerischen Tross und die Geschütze. Die Bayern können auch gewinnen, indem sie ihr Heer und den Tross über St. Peter retten.</li>
    </ul>`, ['Verstanden']);
  }

  async chronik() {
    const items: string[] = [];
    for (let t = 0; t <= Math.min(this.g.turn, TURNS - 1); t++) items.push(`<div class="kicker">${fbDate(t)}</div>` + this.api.entryHtml(FB_CHRONICLE[t]));
    await this.api.modal(`<h2>Chronik der Schlacht</h2><div class="scroll">${items.join('')}</div>`, ['Schließen'], 'wide');
  }

  async run() {
    document.body.classList.add('fb');
    await this.help();
    this.api.song('marsch');
    const g = this.g;
    let lastSide: FSide | null = null;
    while (!g.over && this.active) {
      if (g.turn !== this.seenTurn && g.side === 'fr') {
        this.seenTurn = g.turn;
        const e = FB_CHRONICLE[g.turn];
        await this.api.modal(`<div class="kicker">Runde ${g.turn + 1} von ${TURNS} · ${fbDate(g.turn)}</div><p class="weather">${g.isRain() ? 'Regen: nasses Pulver, schlammige Wege.' : 'Trocken.'}</p>` + this.api.entryHtml(e, 'h2'), ['Weiter']);
      }
      const hot = this.ctrl.fr === 'human' && this.ctrl.bav === 'human';
      if (hot && g.side !== lastSide) await this.api.modal(`<h2>Die ${COL[g.side].name} sind am Zug</h2><p>Gerät weitergeben.</p>`, ['Bereit'], g.side === 'fr' ? 'att' : 'def');
      lastSide = g.side;
      this.update();
      if (this.ctrl[g.side] === 'ai') {
        this.busy = true; this.update();
        const side = g.side, turn = g.turn;
        let guard = 0;
        while (g.side === side && g.turn === turn && !g.over && guard++ < 60 && this.active) {
          const c = g.aiNext();
          if (c.t !== 'end') { this.sel = g.units.find(u => u.id === (c as any).unit) || null; this.update(); await sleep(450); }
          await this.exec(c);
          await sleep(c.t === 'end' ? 100 : 350);
        }
        if (g.side === side && g.turn === turn && !g.over) g.dispatch({ t: 'end' });
        this.sel = null; this.busy = false; this.update();
      } else {
        await new Promise<void>(r => { this.wake = r; });
        this.wake = null;
      }
    }
    if (!this.active) return;
    this.update();
    const s = g.score();
    await sleep(500);
    this.api.song('tanz');
    const list = (o: { pts: number; why: string[] }) => `<b>${o.pts} Punkte</b><br><span class="small">${o.why.join('<br>')}</span>`;
    const i = await this.api.modal(`<h2>${s.verdict}</h2>
      <div class="cols"><div><h3>Franzosen</h3>${list(s.fr)}<p class="small">Verluste: ${g.losses.fr.toLocaleString('de-DE')} Mann</p></div>
      <div><h3>Bayern</h3>${list(s.bav)}<p class="small">Verluste: ${g.losses.bav.toLocaleString('de-DE')} Mann</p></div></div>` + this.api.entryHtml(FB_EPILOG), ['Chronik ansehen', 'Hauptmenü']);
    if (i === 0) await this.chronik();
    this.api.exit();
  }

  update() {
    const g = this.g;
    $('fbDate').textContent = `Runde ${Math.min(g.turn + 1, TURNS)}/${TURNS} · ${g.dateText()}`;
    $('fbWx').textContent = g.isRain() ? '🌧 Regen, nasses Pulver' : '☀ trocken';
    const t = $('fbTurn'); t.textContent = g.over ? 'Ende' : `Zug: ${COL[g.side].name}`; t.className = 'turn ' + (g.side === 'fr' ? 'att' : 'def') + ' ' + g.side;
    const st = (s: FSide) => `<b class="${s}">${COL[s].name}</b> ${g.strength(s).toLocaleString('de-DE')} Mann · Verluste ${g.losses[s].toLocaleString('de-DE')}`;
    $('fbStats').innerHTML = st('fr') + ' &nbsp; ' + st('bav');
    const u = this.sel;
    const human = this.human();
    $('fbPanel').classList.toggle('ai', !human);
    $('fbAi').textContent = !g.over && this.ctrl[g.side] === 'ai' ? (g.side === 'fr' ? 'Enghien und Turenne geben Befehle …' : 'Mercy gibt Befehle …') : '';
    if (u) {
      $('fbSel').innerHTML = `<b>${u.name}</b> · ${KIND_NAME[u.kind]} · ${u.men.toLocaleString('de-DE')} Mann · Moral ${Math.round(u.morale)} · ${u.mp > 0 ? `noch ${u.mp} Marsch` : 'hat gezogen'}${u.leader ? ` · Führung: ${u.leader}` : ''}`;
    } else $('fbSel').textContent = human ? 'Tippe einen eigenen Verband an, dann einen Nachbarort zum Marschieren oder Angreifen.' : '';
    ($('fbDig') as HTMLButtonElement).disabled = !(human && u && g.canEntrench(u));
    ($('fbEnd') as HTMLButtonElement).disabled = !human;
  }

  async click(px: number, py: number) {
    if (!this.human()) return;
    const g = this.g;
    // Verband angetippt?
    for (const [u, x, y] of this.tokens) {
      if (Math.abs(px - x) < this.tok / 2 + 2 && Math.abs(py - y) < this.tok * 0.38 + 2) {
        if (u.side === g.side) { this.sel = u; this.update(); return; }
        if (this.sel && g.reachable(this.sel).includes(u.node)) return this.target(u.node);
        return this.info(u.node);
      }
    }
    for (const n of NODES) {
      const p = this.pos(n.id);
      if (Math.hypot(px - p.x, py - p.y) < Math.max(18, this.tok * 0.6)) {
        if (this.sel && (g.reachable(this.sel).includes(n.id) || g.canBombard(this.sel, n.id))) return this.target(n.id);
        return this.info(n.id);
      }
    }
    this.sel = null; this.update();
  }

  async target(node: string) {
    const g = this.g, u = this.sel!;
    const foes = g.unitsAt(node, g.enemy(u.side));
    if (u.kind === 'art') {
      if (g.canBombard(u, node)) return this.exec({ t: 'bombard', unit: u.id, to: node });
      if (foes.length) { this.api.log('Artillerie kann nicht stürmen. Sie beschießt benachbarte Orte (nicht bei Regen).', 'info'); return; }
    }
    if (foes.length) {
      if (u.kind === 'train') return;
      const helpers = g.helpers(u, node);
      const r1 = g.odds([u], node), rAll = g.odds([u, ...helpers], node);
      const n = NODES.find(x => x.id === node)!;
      const fmt = (r: number) => `${r.toFixed(2)} : 1, Aussicht <b>${Math.round(g.winChance(r) * 100)} %</b>`;
      const btns = helpers.length ? ['Abbrechen', 'Nur dieser Verband', `Gemeinsam mit ${helpers.length} weiteren!`] : ['Abbrechen', 'Angreifen!'];
      const i = await this.api.modal(`<h2>Angriff auf ${n.name}?</h2><p>Verteidiger: ${foes.map(f => `${f.name} (${f.men.toLocaleString('de-DE')})`).join(', ')}${g.schanze[node][g.enemy(u.side)] ? ', verschanzt' : ''}.${g.isRain() ? ' Es regnet.' : ''}</p>
        <p>${u.name} allein: ${fmt(r1)}</p>${helpers.length ? `<p>Gemeinsam mit ${helpers.map(h => h.name).join(', ')}: ${fmt(rAll)}</p>` : ''}`, btns);
      if (i === 0) return;
      if (helpers.length && i === 2) return this.exec({ t: 'move', unit: u.id, to: node, with: helpers.map(h => h.id) });
    }
    this.exec({ t: 'move', unit: u.id, to: node });
  }

  info(node: string) {
    const n = NODES.find(x => x.id === node)!;
    const g = this.g;
    const here = g.unitsAt(node).map(u => `${u.name} (${COL[u.side].name}, ${u.men.toLocaleString('de-DE')} Mann)`).join('<br>');
    const sch = (['fr', 'bav'] as FSide[]).filter(s => g.schanze[node][s]).map(s => `Schanzen der ${COL[s].name}: Stufe ${g.schanze[node][s]}`).join(', ');
    this.api.modal(this.api.entryHtml(n.info, 'h2') + `<p class="small">${here || 'Keine Truppen.'}${sch ? '<br>' + sch : ''}</p>`, ['Schließen']);
  }

  tokens: [FUnit, number, number][] = [];
  tok = 40;

  draw(ctx: CanvasRenderingContext2D, cw: number, ch: number, dt: number) {
    this.time += dt;
    const top = $('fbHud').offsetHeight, bottom = $('fbPanel').offsetHeight;
    const vh = ch - top - bottom - 8;
    const aspect = 1.55;
    let w = cw - 16, h = w / aspect;
    if (h > vh) { h = vh; w = h * aspect; }
    this.rect = { x: (cw - w) / 2, y: top + 4 + (vh - h) / 2, w, h };
    const R = this.rect;
    const X = (x: number) => R.x + x * R.w, Y = (y: number) => R.y + y * R.h;
    // Papier
    const grd = ctx.createRadialGradient(X(0.5), Y(0.5), 20, X(0.5), Y(0.5), R.w * 0.7);
    grd.addColorStop(0, '#efe2bf'); grd.addColorStop(1, '#d6c193');
    ctx.fillStyle = grd; ctx.fillRect(R.x, R.y, R.w, R.h);
    // Schwarzwald
    ctx.fillStyle = 'rgba(70,98,58,0.33)';
    ctx.beginPath(); ctx.moveTo(X(0.74), Y(0)); ctx.bezierCurveTo(X(0.68), Y(0.25), X(0.78), Y(0.4), X(0.66), Y(0.62)); ctx.bezierCurveTo(X(0.62), Y(0.8), X(0.7), Y(0.95), X(0.66), Y(1)); ctx.lineTo(X(1), Y(1)); ctx.lineTo(X(1), Y(0)); ctx.fill();
    ctx.fillStyle = 'rgba(60,85,50,0.45)';
    for (let k = 0; k < 140; k++) {
      const x = 0.72 + ((k * 0.6180339) % 1) * 0.28, y = ((k * 0.381966) % 1);
      if (x < 0.66 + 0.1 * Math.sin(y * 6)) continue;
      ctx.beginPath(); ctx.moveTo(X(x), Y(y) - 6); ctx.lineTo(X(x) + 4, Y(y) + 3); ctx.lineTo(X(x) - 4, Y(y) + 3); ctx.fill();
    }
    // Hügel: Schönberg, Batzenberg, Schlierberg
    const hill = (x: number, y: number, rx: number, ry: number) => {
      for (let k = 4; k >= 1; k--) {
        ctx.fillStyle = `rgba(150,118,70,${0.1 + 0.05 * (4 - k)})`;
        ctx.beginPath(); ctx.ellipse(X(x), Y(y), R.w * rx * k / 4, R.h * ry * k / 4, -0.4, 0, 7); ctx.fill();
      }
    };
    hill(0.47, 0.66, 0.08, 0.13); hill(0.3, 0.7, 0.05, 0.08); hill(0.58, 0.46, 0.04, 0.07);
    // Rhein und Dreisam
    ctx.strokeStyle = '#6f93b0'; ctx.lineWidth = Math.max(3, R.w * 0.008);
    ctx.beginPath(); ctx.moveTo(X(0.03), Y(0)); ctx.bezierCurveTo(X(0.06), Y(0.3), X(0.0), Y(0.6), X(0.04), Y(1)); ctx.stroke();
    ctx.lineWidth = Math.max(1.5, R.w * 0.003);
    ctx.beginPath(); ctx.moveTo(X(1), Y(0.26)); ctx.bezierCurveTo(X(0.8), Y(0.3), X(0.7), Y(0.27), X(0.62), Y(0.27)); ctx.bezierCurveTo(X(0.5), Y(0.24), X(0.4), Y(0.18), X(0.25), Y(0.1)); ctx.stroke();
    ctx.fillStyle = '#4e6f8a'; ctx.font = `italic ${Math.max(10, R.w * 0.013)}px Georgia`;
    ctx.save(); ctx.translate(X(0.025), Y(0.75)); ctx.rotate(-1.5); ctx.fillText('Rhein', 0, 0); ctx.restore();
    ctx.fillText('Dreisam', X(0.8), Y(0.25));
    ctx.fillStyle = '#3d5a34'; ctx.fillText('Schwarzwald', X(0.82), Y(0.62));
    ctx.fillStyle = '#7a5a30'; ctx.fillText('Schönberg', X(0.42), Y(0.53));
    // Wege
    const g = this.g;
    const reach = this.sel ? new Set([...g.reachable(this.sel), ...NODES.filter(n => this.sel && g.canBombard(this.sel, n.id)).map(n => n.id)]) : new Set<string>();
    for (const [a, b] of EDGES) {
      const pa = this.pos(a), pb = this.pos(b);
      const hot = this.sel && ((this.sel.node === a && reach.has(b)) || (this.sel.node === b && reach.has(a)));
      ctx.strokeStyle = hot ? '#c0392b' : 'rgba(110,80,45,0.6)'; ctx.lineWidth = hot ? 3 : 2; ctx.setLineDash(hot ? [] : [6, 5]);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    // Orte
    this.tok = Math.max(30, Math.min(54, R.w * 0.045));
    for (const n of NODES) {
      const p = this.pos(n.id);
      const r = Math.max(9, R.w * 0.011);
      ctx.fillStyle = n.terrain === 'city' ? '#8a5a3c' : '#f4ead0'; ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 2;
      if (n.terrain === 'city') {
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = k % 2 ? r * 1.1 : r * 1.5; ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); ctx.stroke(); }
      if (reach.has(n.id)) { ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r + 5 + Math.sin(this.time * 5) * 2, 0, 7); ctx.stroke(); }
      for (const s of ['fr', 'bav'] as FSide[]) {
        const lv = g.schanze[n.id][s];
        for (let k = 0; k < lv; k++) { ctx.strokeStyle = COL[s].fill; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, r + 2 + k * 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      }
      ctx.fillStyle = '#2a1d10'; ctx.font = `bold ${Math.max(11, R.w * 0.012)}px Georgia`; ctx.textAlign = 'center';
      ctx.fillText(n.name, p.x, p.y - r - 7);
      if (n.vp) { ctx.fillStyle = '#8a1c1c'; ctx.font = `${Math.max(9, R.w * 0.009)}px Georgia`; ctx.fillText('★'.repeat(Math.max(n.vp.fr || 0, n.vp.bav || 0)), p.x, p.y - r - 7 - Math.max(11, R.w * 0.012)); }
    }
    // Kampf-Blitze
    this.flashes = this.flashes.filter(f => this.time - f.t < 1.6);
    for (const f of this.flashes) {
      const p = this.pos(f.node), a = 1 - (this.time - f.t) / 1.6;
      ctx.fillStyle = `rgba(255,200,80,${a * 0.6})`; ctx.beginPath(); ctx.arc(p.x, p.y, 20 + (1 - a) * 40, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(200,200,200,${a * 0.5})`;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(p.x + Math.cos(k + f.t) * 25 * (1.5 - a), p.y + Math.sin(k * 2 + f.t) * 15 * (1.5 - a) - (1 - a) * 20, 10, 0, 7); ctx.fill(); }
    }
    // Verbände
    this.tokens = [];
    const T = this.tok;
    for (const n of NODES) {
      const us = g.unitsAt(n.id);
      const p = this.pos(n.id);
      us.forEach((u, k) => {
        const cols = Math.min(us.length, 3);
        const row = Math.floor(k / 3), col = k % 3;
        const x = p.x + (col - (cols - 1) / 2) * (T + 3), y = p.y + 20 + T * 0.38 + row * (T * 0.8 + 3);
        this.tokens.push([u, x, y]);
        this.drawToken(ctx, u, x, y, T);
      });
    }
    // Rahmen und Titel
    ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 3; ctx.strokeRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = '#3a2814'; ctx.font = `italic ${Math.max(12, R.w * 0.016)}px Georgia`; ctx.textAlign = 'left';
    ctx.fillText('Breisgau, August 1644', R.x + 10, R.y + R.h - 10);
    ctx.textAlign = 'right'; ctx.font = `${Math.max(9, R.w * 0.009)}px Georgia`;
    ctx.fillText('Karte vereinfacht, Lage der Orte ungefähr', R.x + R.w - 10, R.y + R.h - 10);
    ctx.textAlign = 'left';
  }

  drawToken(ctx: CanvasRenderingContext2D, u: FUnit, x: number, y: number, T: number) {
    const w = T, h = T * 0.76;
    const c = COL[u.side];
    const used = u.side === this.g.side && (u.mp <= 0 || u.acted);
    ctx.globalAlpha = used ? 0.6 : 1;
    ctx.fillStyle = c.fill; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = this.sel === u ? '#ffd700' : c.edge; ctx.lineWidth = this.sel === u ? 3 : 1.5; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    // Symbol
    const sx = x - w * 0.32, sy = y - h * 0.32, sw = w * 0.64, sh = h * 0.4;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.strokeRect(sx, sy, sw, sh);
    ctx.beginPath();
    if (u.kind === 'inf' || u.kind === 'drag') { ctx.moveTo(sx, sy); ctx.lineTo(sx + sw, sy + sh); ctx.moveTo(sx + sw, sy); ctx.lineTo(sx, sy + sh); }
    if (u.kind === 'cav' || u.kind === 'drag') { ctx.moveTo(sx, sy + sh); ctx.lineTo(sx + sw, sy); }
    ctx.stroke();
    if (u.kind === 'art') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, sy + sh / 2, sh * 0.25, 0, 7); ctx.fill(); }
    if (u.kind === 'train') { ctx.fillStyle = '#fff'; ctx.fillRect(sx + sw * 0.2, sy + sh * 0.3, sw * 0.6, sh * 0.35); ctx.beginPath(); ctx.arc(sx + sw * 0.3, sy + sh * 0.8, sh * 0.13, 0, 7); ctx.arc(sx + sw * 0.7, sy + sh * 0.8, sh * 0.13, 0, 7); ctx.fill(); }
    ctx.fillStyle = c.text; ctx.font = `bold ${Math.max(9, T * 0.24)}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(u.men >= 1000 ? (u.men / 1000).toFixed(1) + 'k' : String(u.men), x, y + h * 0.36);
    // Moralbalken
    ctx.fillStyle = '#0006'; ctx.fillRect(x - w / 2, y + h / 2, w, 3);
    ctx.fillStyle = u.morale > 60 ? '#7fc06a' : u.morale > 30 ? '#e8c25a' : '#d0573a'; ctx.fillRect(x - w / 2, y + h / 2, w * u.morale / 100, 3);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}

export { FB_SLIDES };
