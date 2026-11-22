import { Game, Cmd, Controller } from './game';
import { drawScene, fitView, toWorld, View } from './render';
import { Gun, TYPES, Side } from './sim';
import { PROLOG, CHRONICLE, EPILOG, SPOTS, SOURCES, Entry, tagLabel, dateOf, GUNINFO_NOTE, SLIDES, commonsUrl, commonsPage, MUSIC_NOTE } from './history';
import { Music } from './music';
import { FreiburgUI } from './freiburg/ui';
import { FB_SLIDES, FB_SOURCES } from './freiburg/data';
import type { Slide } from './history';
Object.assign(SOURCES, FB_SOURCES);
let fb: FreiburgUI | null = null;
import { HohentwielUI, H_SLIDES } from './hohentwiel/ui';
import { H_SOURCES } from './hohentwiel/game';
Object.assign(SOURCES, H_SOURCES);
let ht: HohentwielUI | null = null;
import { PhilippsburgUI, P_SLIDES } from './philippsburg/ui';
import { P_SOURCES } from './philippsburg/game';
Object.assign(SOURCES, P_SOURCES);
let ph: PhilippsburgUI | null = null;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const cv = $<HTMLCanvasElement>('cv');
const ctx = cv.getContext('2d')!;

let game: Game | null = null;
let sel: Gun | null = null;
let mainView: View | null = null;
let insetView: View | null = null;
let muted = localStorage.getItem('wild-muted') === '1';
let musicOn = localStorage.getItem('wild-music') !== '0';
let music: Music | null = null;
function song(name: 'tanz' | 'marsch') { if (!ac) return; if (!music) music = new Music(ac); if (musicOn) music.play(name); }
const seen = new Set<number>();

// ---------- Ton ----------
let ac: AudioContext | null = null;
let noise: AudioBuffer | null = null;
function audio() {
  if (!ac) {
    ac = new AudioContext();
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  }
  return ac;
}
function boom(size: number, x: number) {
  if (muted || !ac || !noise) return;
  const a = ac, src = a.createBufferSource(); src.buffer = noise;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200 + 900 / (1 + size * 2);
  const gn = a.createGain();
  const vol = Math.min(1, 0.25 + size * 0.5);
  gn.gain.setValueAtTime(vol, a.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.4 + size * 1.2);
  const pan = a.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, (x - 340) / 250));
  src.connect(f); f.connect(gn); gn.connect(pan); pan.connect(a.destination);
  src.start(); src.stop(a.currentTime + 2);
}

// ---------- Meldungen ----------
function log(msg: string, kind: 'info' | 'good' | 'bad' = 'info') {
  const box = $('log');
  const el = document.createElement('div');
  el.className = 'msg ' + kind; el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 5) box.removeChild(box.firstChild!);
  setTimeout(() => el.classList.add('old'), 9000);
}

// ---------- Dialoge ----------
function srcLinks(e: Entry) {
  if (!e.src || !e.src.length) return '';
  return '<div class="src">Quellen: ' + e.src.map(k => `<a href="${SOURCES[k].url}" target="_blank" rel="noopener">${SOURCES[k].name}</a>`).join(' · ') + '</div>';
}
function entryHtml(e: Entry, heading = 'h3') {
  return `<div class="entry"><span class="tag ${e.tag}">${tagLabel(e.tag)}</span><${heading}>${e.title}</${heading}><p>${e.text}</p>${srcLinks(e)}</div>`;
}
function modal(html: string, buttons: string[], cls = ''): Promise<number> {
  return new Promise(res => {
    const m = $('modal'), c = $('card');
    c.className = 'card ' + cls;
    c.innerHTML = html + '<div class="btns">' + buttons.map((b, i) => `<button data-i="${i}" class="${i === buttons.length - 1 ? 'primary' : ''}">${b}</button>`).join('') + '</div>';
    m.classList.remove('hidden');
    c.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => {
      m.classList.add('hidden');
      res(Number((b as HTMLElement).dataset.i));
    }));
    (c.querySelector('button.primary') as HTMLElement)?.focus();
  });
}
const modalOpen = () => !$('modal').classList.contains('hidden');

// ---------- Start ----------
async function start(): Promise<void> {
  document.body.classList.remove('fb', 'ht', 'ph');
  fb = null; game = null; ht = null; ph = null;
  const c = await modal(`<h1>Kriegsjahre im Südwesten</h1>
    <p class="sub">Geschichtsspiele nach echten Ereignissen des Dreißigjährigen Krieges</p>
    <p class="small">Belegte Fakten sind <span class="tag belegt">Belegt</span> markiert, allgemeines Wissen <span class="tag hintergrund">Hintergrundwissen</span>, Ergänztes <span class="tag erfunden">Erfunden fürs Spiel</span>.</p>`,
    ['Kapitel 4: Belagerung von Philippsburg 1644', 'Kapitel 3: Hohentwiel 1634–1650', 'Kapitel 2: Schlacht bei Freiburg 1644', 'Kapitel 1: Belagerung von Wildenstein 1642'], 'start');
  audio(); song('tanz');
  if (c === 0) return startPhilippsburg();
  if (c === 1) return startHohentwiel();
  if (c === 2) return startFreiburg();
  return startWildenstein();
}

async function startPhilippsburg(): Promise<void> {
  const i = await modal(`<h1>Philippsburg 1644</h1><p class="sub">Die Belagerung der Rheinfestung, 25. August bis 9. September 1644</p>
    <p>Nach der Schlacht bei Freiburg zieht Enghien den Rhein hinab. In Philippsburg hält Oberst Caspar Baumberger mit rund 500 Mann eine Festung, die für viel mehr gebaut ist. Mercy will zum Entsatz kommen. Wer ist schneller?</p>`,
    ['Zurück', 'Vorspann ansehen', 'Zwei Spieler an einem Gerät', 'Als Besatzung (gegen KI)', 'Als Franzosen (gegen KI)'], 'start');
  if (i === 0) return start();
  if (i === 1) { await intro(P_SLIDES); return startPhilippsburg(); }
  const ctrl: Record<'fr' | 'imp', 'human' | 'ai'> = i === 2 ? { fr: 'human', imp: 'human' } : i === 3 ? { fr: 'ai', imp: 'human' } : { fr: 'human', imp: 'ai' };
  ph = new PhilippsburgUI({ modal, entryHtml, log, song, boom, exit: () => { ph = null; start(); } }, ctrl);
  ph.run();
}

async function startHohentwiel(): Promise<void> {
  const i = await modal(`<h1>Hohentwiel</h1><p class="sub">Die Festung, die niemand nehmen konnte, 1634 bis 1650</p>
    <p>Mitten im Land der Kaiserlichen hält Konrad Widerholt einen Vulkanfels für Württemberg. Er treibt Abgaben ein, überfällt Städte, entführt Geiseln und übersteht fünf Belagerungen. Kannst du es ihm gleichtun?</p>`,
    ['Zurück', 'Vorspann ansehen', 'Als Widerholt spielen'], 'start');
  if (i === 0) return start();
  if (i === 1) { await intro(H_SLIDES); return startHohentwiel(); }
  ht = new HohentwielUI({ modal, entryHtml, log, song, exit: () => { ht = null; start(); } });
  ht.run();
}

async function startFreiburg(): Promise<void> {
  const html = `<h1>Freiburg 1644</h1>
    <p class="sub">Die Schlacht um die Höhen vor Freiburg, 3. bis 10. August 1644</p>
    <p>Der bayerische Feldmarschall Mercy hat Freiburg genommen und sich auf den Bergen südlich der Stadt verschanzt. Enghien und Turenne greifen mit dem französischen Heer an. Acht Tage, Regen, fünf Stürme auf den Schlierberg.</p>`;
  const i = await modal(html, ['Zurück', 'Vorspann ansehen', 'Zwei Spieler an einem Gerät', 'Als Bayern (gegen KI)', 'Als Franzosen (gegen KI)'], 'start');
  if (i === 0) return start();
  if (i === 1) { await intro(FB_SLIDES); return startFreiburg(); }
  const ctrl: Record<'fr' | 'bav', 'human' | 'ai'> = i === 2 ? { fr: 'human', bav: 'human' } : i === 3 ? { fr: 'ai', bav: 'human' } : { fr: 'human', bav: 'ai' };
  fb = new FreiburgUI({ modal, entryHtml, log, song, intro, exit: () => { fb = null; start(); } }, ctrl);
  fb.run();
}

async function startWildenstein(): Promise<void> {
  const html = `
    <h1>Wildenstein 1642</h1>
    <p class="sub">Die Belagerung einer Felsenburg im Oberen Donautal</p>
    <p>August 1642. Truppen vom Hohentwiel haben die Burg Wildenstein durch einen Handstreich genommen. Nun rücken die Bayern an. Wer gewinnt die 25 Tage bis zum 4. September?</p>
    <p class="small">Ein Geschichtsspiel nach echten Ereignissen. Belegte Fakten sind <span class="tag belegt">Belegt</span> markiert, Ergänztes ist <span class="tag erfunden">Erfunden fürs Spiel</span>.</p>`;
  const i = await modal(html, ['Zurück', 'Vorspann ansehen', 'Geschichte & Burg', 'Zwei Spieler an einem Gerät', 'Als Besatzung (gegen KI)', 'Als Bayern (gegen KI)'], 'start');
  if (i === 0) return start();
  if (i === 1) { await intro(SLIDES); return startWildenstein(); }
  if (i === 2) { await showLexikon(); return startWildenstein(); }
  const ctrl: Record<Side, Controller> = i === 3 ? { att: 'human', def: 'human' } : i === 4 ? { att: 'ai', def: 'human' } : { att: 'human', def: 'ai' };
  game = new Game((Math.random() * 2 ** 31) | 0, ctrl, { log, boom, changed: updateUI });
  sel = null;
  seen.clear();
  for (let k = 0; k < PROLOG.length; k++) {
    await modal(`<div class="kicker">Vorgeschichte ${k + 1}/${PROLOG.length}</div>` + entryHtml(PROLOG[k], 'h2'), [k < PROLOG.length - 1 ? 'Weiter' : 'Zur Belagerung']);
  }
  await showHelp(ctrl);
  song('marsch');
  flow();
}

function intro(SL: Slide[]): Promise<void> {
  return new Promise(res => {
    const el = $('intro');
    let k = 0;
    const show = () => {
      if (k >= SL.length) { el.classList.add('hidden'); localStorage.setItem('wild-intro', '1'); res(); return; }
      const sl = SL[k];
      el.innerHTML = `<div class="frame"><img alt="${sl.title}" src="${commonsUrl(sl.file)}" class="kb${k % 2}"></div>
        <div class="cap"><span class="tag ${sl.tag}">${tagLabel(sl.tag)}</span><h2>${sl.title}</h2><p>${sl.text}</p>
        <div class="credit"><a href="${commonsPage(sl.file)}" target="_blank" rel="noopener">${sl.credit}</a> · ${sl.license}</div>
        <div class="btns"><button id="skip">Überspringen</button><button id="nxt" class="primary">${k < SL.length - 1 ? 'Weiter' : 'Zum Spiel'}</button></div></div>`;
      const img = el.querySelector('img')!;
      img.onerror = () => { img.style.display = 'none'; };
      $('nxt').onclick = () => { k++; show(); };
      $('skip').onclick = () => { k = SL.length; show(); };
    };
    el.classList.remove('hidden');
    show();
  });
}

async function showHelp(ctrl: Record<Side, Controller>) {
  const who = ctrl.att === 'human' && ctrl.def === 'human' ? 'Ihr spielt abwechselnd an einem Gerät.' : ctrl.att === 'human' ? 'Du führst die bayerischen Belagerer.' : 'Du verteidigst die Burg.';
  await modal(`<h2>So wird gespielt</h2><p>${who}</p>
  <ul>
    <li><b>Jeder Tag</b> hat zwei Züge: erst die Bayern, dann die Besatzung. Jedes Geschütz feuert einmal am Tag eine Salve.</li>
    <li><b>Richten:</b> Erhöhung (Grad) und Pulverladung (kg) einstellen, dann <b>Feuer</b>. Die gestrichelte Linie zeigt nur den Abgang, wie beim Richtquadranten. Rote Kreuze zeigen, wo deine letzten Schüsse lagen.</li>
    <li><b>Physik:</b> Schwerkraft, Luftwiderstand, Wind und Streuung wirken echt. Zu viel Pulver lässt das Rohr zerspringen. Regen macht das Pulver feucht.</li>
    <li><b>Bayern:</b> Schieße die Mauer am Fuß aus, damit sie einstürzt. Fülle den Graben mit Faschinen. Stürme, wenn die Bresche sturmreif ist, oder biete einen Akkord an.</li>
    <li><b>Besatzung:</b> Triff die Geschützmannschaften, bessere nachts Breschen aus und halte bis zum 4. September durch.</li>
    <li><b>Tippe auf Burgteile</b> für Infotafeln. Im Fernrohr oben rechts siehst du den Schaden aus der Nähe.</li>
    <li>Tasten: ←/→ Erhöhung, ↑/↓ Pulver, Leertaste Feuer, Tab nächstes Geschütz.</li>
  </ul>`, ['Los geht’s']);
}

async function showLexikon() {
  const spots = SPOTS.map(s => entryHtml(s)).join('');
  const guns = Object.values(TYPES).map(t => `<div class="entry"><span class="tag ${t.invented ? 'erfunden' : 'belegt'}">${t.invented ? 'Bei den Bayern erfunden' : 'Auf der Burg belegt'}</span><h3>${t.name}</h3><p>${t.info}</p></div>`).join('');
  const src = Object.values(SOURCES).map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></li>`).join('');
  await modal(`<h2>Burg, Geschütze und Quellen</h2>
    <div class="scroll">${PROLOG.map(e => entryHtml(e)).join('')}<h3 class="sect">Die Burg</h3>${spots}<h3 class="sect">Die Geschütze</h3><p class="small">${GUNINFO_NOTE}</p>${guns}${entryHtml(EPILOG)}<h3 class="sect">Musik</h3>${entryHtml(MUSIC_NOTE)}<h3 class="sect">Quellen</h3><ul>${src}</ul><h3 class="sect">Bildnachweis (Vorspann)</h3><ul>${SLIDES.map(sl => `<li><a href="${commonsPage(sl.file)}" target="_blank" rel="noopener">${sl.credit}</a>, ${sl.license}</li>`).join('')}</ul></div>`, ['Schließen'], 'wide');
}

async function showChronik() {
  if (!game) return;
  const items = [...seen].sort((a, b) => a - b).map(d => `<div class="kicker">Tag ${d}: ${dateOf(d)}</div>` + entryHtml(CHRONICLE[d - 1]));
  await modal(`<h2>Chronik der Belagerung</h2><div class="scroll">${PROLOG.map(e => entryHtml(e)).join('')}${items.join('')}</div>`, ['Schließen'], 'wide');
}

// ---------- Spielablauf ----------
let wake: (() => void) | null = null;
function kick() { const w = wake; wake = null; w?.(); }
const humanWait = () => new Promise<void>(r => { wake = r; });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function flow() {
  const g = game!;
  let lastDay = 0;
  let lastSide: Side | null = null;
  const hot = g.ctrl.att === 'human' && g.ctrl.def === 'human';
  while (g.phase !== 'over' && game === g) {
    const side = g.side();
    if (g.day !== lastDay && side === 'att') {
      if (g.report) {
        await modal(`<div class="kicker">Nacht vor Tag ${g.day}</div><h2>Bericht</h2><p>${g.report.lines.join('<br>')}</p>`, ['Weiter']);
        g.report = null;
      }
      lastDay = g.day;
      seen.add(g.day);
      const e = CHRONICLE[g.day - 1];
      await modal(`<div class="kicker">Tag ${g.day} von 25 · ${dateOf(g.day)}</div>
        <p class="weather">${g.rain ? 'Regen, das Pulver wird feucht.' : 'Trocken.'} Wind ${windText(g.wind)}.</p>` + entryHtml(e, 'h2'), ['Weiter']);
    }
    if (hot && side !== lastSide) {
      await modal(`<h2>${side === 'att' ? 'Die Bayern' : 'Die Besatzung'} sind am Zug</h2><p>Gib das Gerät an ${side === 'att' ? 'den Belagerer' : 'den Verteidiger'} weiter.</p>`, ['Bereit'], side);
    }
    lastSide = side;
    if (side === 'def' && g.pendingOffer && g.ctrl.def === 'human') {
      const i = await modal(`<h2>Ein Akkord wird angeboten</h2><p>Die Bayern bieten freien Abzug mit Waffen und Gepäck, wenn ihr die Burg übergebt.</p><p class="small">Moral der Besatzung: ${Math.round(g.def.morale)} · ${g.def.men} Mann</p>`, ['Annehmen', 'Ablehnen und weiterkämpfen']);
      await g.dispatch({ t: 'answer', accept: i === 0 });
      if ((g.phase as string) === 'over') break;
    }
    pickGun();
    updateUI();
    if (g.ctrl[side] === 'ai') {
      await sleep(700);
      const day = g.day;
      while (g.side() === side && g.day === day && (g.phase as string) !== 'over' && game === g) {
        const c = g.aiNext();
        if (!c) break;
        if (c.t === 'fire') { sel = g.guns[c.gun]; sel.angle = c.angle; sel.charge = c.charge; updateUI(); await sleep(600); }
        await g.dispatch(c);
        await sleep(c.t === 'end' ? 200 : 500);
      }
    } else {
      await humanWait();
    }
  }
  if (game !== g) return;
  updateUI();
  await sleep(800);
  const win = g.winner === 'att' ? 'Die Bayern gewinnen' : 'Die Besatzung hält stand';
  const i = await modal(`<h2>${win}</h2><p>${g.endText}</p><p class="small">Tag ${Math.min(g.day, 25)} · Bayern ${g.att.men} Mann · Besatzung ${g.def.men} Mann</p>` + entryHtml(EPILOG), ['Chronik ansehen', 'Neues Spiel']);
  song('tanz');
  if (i === 0) await showChronik();
  start();
}

function windText(w: number) {
  if (Math.abs(w) < 0.5) return 'still';
  return `${Math.abs(w).toFixed(1)} m/s ${w > 0 ? 'von Nordosten (zur Burg hin)' : 'aus Südwesten (zur Hochfläche hin)'}`;
}

function humanTurn() { return !!game && game.phase !== 'over' && game.ctrl[game.side()] === 'human' && !game.busy; }

function pickGun() {
  const g = game!;
  const s = g.side();
  if (sel && sel.side === s && sel.alive && !sel.usedToday) return;
  sel = g.gunsOf(s).find(x => g.canFire(x)) || g.gunsOf(s).find(x => x.alive) || null;
}

async function act(c: Cmd) {
  if (!humanTurn()) return;
  await game!.dispatch(c);
  if (c.t === 'fire' || c.t === 'sap') { const keep = sel; pickGun(); if (keep && game!.canFire(keep)) sel = keep; }
  updateUI();
  kick();
}

// ---------- Bedienfeld ----------
function updateUI() {
  const g = game;
  if (!g) return;
  const s = g.side();
  $('day').textContent = `Tag ${Math.min(g.day, 25)}/25 · ${dateOf(Math.min(g.day, 25))}`;
  $('wx').textContent = `${g.rain ? '🌧 Regen' : '☀ trocken'} · Wind ${Math.abs(g.wind) < 0.5 ? 'still' : (g.wind > 0 ? '→ ' : '← ') + Math.abs(g.wind).toFixed(1) + ' m/s'}`;
  $('turn').textContent = g.phase === 'over' ? 'Spielende' : s === 'att' ? 'Zug: Bayern' : 'Zug: Besatzung';
  $('turn').className = 'turn ' + s;
  $('statA').innerHTML = `<b>Bayern</b> ${g.att.men} Mann · Moral ${Math.round(g.att.morale)} · Pulver ${Math.round(g.att.powder)} kg · Kugeln ${g.att.balls} · Bomben ${g.att.shells}`;
  $('statD').innerHTML = `<b>Besatzung</b> ${g.def.men} Mann · Moral ${Math.round(g.def.morale)} · Pulver ${Math.round(g.def.powder)} kg · Kugeln ${g.def.falc}`;
  const human = humanTurn();
  $('ctl').classList.toggle('ai', !human);
  $('aiNote').textContent = g.phase === 'over' ? '' : (!human && g.ctrl[s] === 'ai') ? (s === 'att' ? 'Die Bayern richten ihre Geschütze …' : 'Die Besatzung antwortet …') : '';
  // Geschützauswahl
  const gl = $('guns');
  gl.innerHTML = '';
  for (const gun of g.gunsOf(s)) {
    const b = document.createElement('button');
    b.className = 'gun' + (gun === sel ? ' sel' : '') + (!gun.alive ? ' dead' : gun.usedToday ? ' used' : '');
    b.innerHTML = `${gun.label}<small>${!gun.alive ? 'zerstört' : gun.usedToday ? 'heute schon eingesetzt' : `${gun.crew} Mann · bereit`}</small>`;
    b.onclick = () => { sel = gun; updateUI(); };
    gl.appendChild(b);
  }
  const t = sel?.type;
  const ang = $<HTMLInputElement>('ang'), chg = $<HTMLInputElement>('chg');
  if (sel && t) {
    ang.min = String(t.angMin); ang.max = String(t.angMax); ang.step = '0.05'; ang.value = String(sel.angle);
    chg.min = String(t.chargeMin); chg.max = String(t.chargeMax); chg.step = String(t.chargeStep); chg.value = String(sel.charge);
    $('angV').textContent = `${sel.angle.toFixed(2)}°`;
    const ratio = sel.charge / t.ballKg;
    $('chgV').textContent = t.key === 'haken' ? 'fest' : `${sel.charge.toFixed(2)} kg${ratio > t.burstRatio ? ' ⚠' : ''}`;
    $('chgV').className = ratio > t.burstRatio ? 'warn' : '';
    chg.disabled = t.key === 'haken';
  }
  const can = (b: boolean) => human && b;
  $<HTMLButtonElement>('fire').disabled = !can(!!sel && g.canFire(sel));
  $<HTMLButtonElement>('sap').disabled = !can(!!sel && g.canSap(sel));
  $<HTMLButtonElement>('fill').disabled = !can(g.canFill());
  $<HTMLButtonElement>('storm').disabled = !can(g.canStorm());
  $<HTMLButtonElement>('offer').disabled = !can(g.canOffer());
  $<HTMLButtonElement>('repair').disabled = !can(g.canRepair());
  $<HTMLButtonElement>('end').disabled = !human;
  document.querySelectorAll('.att-only').forEach(e => (e as HTMLElement).style.display = s === 'att' ? '' : 'none');
  document.querySelectorAll('.def-only').forEach(e => (e as HTMLElement).style.display = s === 'def' ? '' : 'none');
  if (s === 'att') {
    const odds = g.stormOdds();
    $('storm').innerHTML = `Sturm <small>${Math.round(odds * 100)} %</small>`;
  }
  $('mute').textContent = muted ? '🔇' : '🔊';
  $('mus').style.opacity = musicOn ? '1' : '0.45';
  $('info').textContent = sel ? `${t!.name}: ${t!.info}` : '';
}

function bind() {
  const ang = $<HTMLInputElement>('ang'), chg = $<HTMLInputElement>('chg');
  ang.oninput = () => { if (sel && humanTurn()) { sel.angle = Number(ang.value); updateUI(); } };
  chg.oninput = () => { if (sel && humanTurn()) { sel.charge = Number(chg.value); updateUI(); } };
  const nudge = (which: 'a' | 'c', d: number) => {
    if (!sel || !humanTurn()) return;
    const t = sel.type;
    if (which === 'a') sel.angle = Math.round(Math.max(t.angMin, Math.min(t.angMax, sel.angle + d)) * 100) / 100;
    else sel.charge = Math.round(Math.max(t.chargeMin, Math.min(t.chargeMax, sel.charge + d * t.chargeStep)) * 100) / 100;
    updateUI();
  };
  $('angM').onclick = () => nudge('a', -0.05); $('angP').onclick = () => nudge('a', 0.05);
  $('angMM').onclick = () => nudge('a', -1); $('angPP').onclick = () => nudge('a', 1);
  $('chgM').onclick = () => nudge('c', -1); $('chgP').onclick = () => nudge('c', 1);
  $('fire').onclick = () => sel && act({ t: 'fire', gun: sel.id, angle: sel.angle, charge: sel.charge });
  $('sap').onclick = () => sel && act({ t: 'sap', gun: sel.id });
  $('fill').onclick = () => act({ t: 'fill' });
  $('repair').onclick = () => act({ t: 'repair' });
  $('offer').onclick = () => act({ t: 'offer' });
  $('storm').onclick = async () => {
    const g = game!; const b = g.breach();
    const i = await modal(`<h2>Sturm befehlen?</h2><p>Bresche: Mauerkrone ${(b.topMin - 800).toFixed(1)} m über dem Hof, Graben noch ${b.descent.toFixed(1)} m tief. Sturmreife ${(b.q * 100).toFixed(0)} %.</p><p>Geschätzte Erfolgsaussicht: <b>${Math.round(g.stormOdds() * 100)} %</b>. Ein gescheiterter Sturm kostet viele Männer und Moral. Danach ist der Tag für die Bayern vorbei.</p>`, ['Abbrechen', 'Stürmen!']);
    if (i === 1) act({ t: 'storm' });
  };
  $('end').onclick = () => act({ t: 'end' });
  $('chronik').onclick = () => showChronik();
  $('lex').onclick = () => showLexikon();
  $('mute').onclick = () => { muted = !muted; localStorage.setItem('wild-muted', muted ? '1' : '0'); updateUI(); };
  $('mus').onclick = () => { musicOn = !musicOn; localStorage.setItem('wild-music', musicOn ? '1' : '0'); audio(); if (!music && ac) music = new Music(ac); if (musicOn) music!.play(game ? 'marsch' : 'tanz'); else music?.stop(); $('mus').style.opacity = musicOn ? '1' : '0.45'; };
  $('menu').onclick = async () => {
    const i = await modal('<h2>Menü</h2>', ['Spielanleitung', 'Neues Spiel', 'Weiterspielen']);
    if (i === 0 && game) showHelp(game.ctrl);
    if (i === 1) { game = null; kick(); start(); }
  };
  window.addEventListener('keydown', e => {
    if (modalOpen() || !game) return;
    const k = e.key;
    if (k === 'ArrowLeft') { nudge('a', e.shiftKey ? -1 : -0.05); e.preventDefault(); }
    else if (k === 'ArrowRight') { nudge('a', e.shiftKey ? 1 : 0.05); e.preventDefault(); }
    else if (k === 'ArrowDown') { nudge('c', -1); e.preventDefault(); }
    else if (k === 'ArrowUp') { nudge('c', 1); e.preventDefault(); }
    else if (k === ' ') { $('fire').click(); e.preventDefault(); }
    else if (k === 'Tab') {
      const list = game.gunsOf(game.side()).filter(x => x.alive);
      if (list.length) { sel = list[(list.indexOf(sel!) + 1) % list.length]; updateUI(); }
      e.preventDefault();
    }
  });
  cv.addEventListener('click', e => {
    if (fb) { const r = cv.getBoundingClientRect(); fb.click(e.clientX - r.left, e.clientY - r.top); return; }
    if (ht) return;
    if (!game || !mainView) return;
    const r = cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const v = insetView && px >= insetView.sx && px <= insetView.sx + insetView.w && py >= insetView.sy && py <= insetView.sy + insetView.h ? insetView : mainView;
    const p = toWorld(v, px, py);
    if (humanTurn()) {
      const gun = game.gunsOf(game.side()).find(x => Math.abs(x.x - p.x) < 4 && p.y > x.y - 1 && p.y < x.y + 4);
      if (gun) { sel = gun; updateUI(); return; }
    }
    const spot = SPOTS.find(s => p.x >= s.x0 && p.x <= s.x1 && p.y >= s.y0 && p.y <= s.y1);
    if (spot) { modal(entryHtml(spot, 'h2'), ['Schließen']); return; }
    const anyGun = game.guns.find(x => Math.abs(x.x - p.x) < 4 && p.y > x.y - 1 && p.y < x.y + 4);
    if (anyGun) modal(`<div class="entry"><span class="tag ${anyGun.type.invented ? 'erfunden' : 'belegt'}">${anyGun.type.invented ? 'Erfunden fürs Spiel' : 'Belegt (Geschütztyp)'}</span><h2>${anyGun.label}</h2><p>${anyGun.type.info}</p><p class="small">${GUNINFO_NOTE}</p></div>`, ['Schließen']);
  });
}

// ---------- Zeichnen ----------
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = cv.clientWidth, ch = cv.clientHeight;
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1d1b18'; ctx.fillRect(0, 0, cw, ch);
  if (ph) { ph.draw(ctx, cw, ch, dt); document.documentElement.style.setProperty('--ctlh', ($('phCtl').offsetHeight + 6) + 'px'); }
  else if (ht) { ht.draw(ctx, cw, ch, dt); document.documentElement.style.setProperty('--ctlh', ($('htPanel').offsetHeight + 6) + 'px'); }
  else if (fb) { fb.draw(ctx, cw, ch, dt); document.documentElement.style.setProperty('--ctlh', ($('fbPanel').offsetHeight + 6) + 'px'); }
  else if (game) {
    game.update(dt);
    const top = $('hud').offsetHeight, bottom = $('ctl').offsetHeight + 6;
    document.documentElement.style.setProperty('--ctlh', bottom + 'px');
    const vh = Math.max(100, ch - top - bottom);
    mainView = fitView(cw, vh, 140, 600, 776, 846, 0, top, 0.25);
    drawScene(ctx, mainView, game, sel, humanTurn());
    // Fernrohr
    const iw = Math.min(cw * 0.36, 460), ih = Math.min(vh * 0.5, iw * 0.62);
    const s = game.side();
    const ix = 10, iy = top + 10;
    let fx0 = 418, fx1 = 530, fy0 = 776, fy1 = 828;
    if (s === 'def' && game.phase !== 'over') {
      const ag = game.gunsOf('att');
      const cx = ag.reduce((m, a) => m + a.x, 0) / ag.length;
      fx0 = cx - 30; fx1 = cx + 30; fy0 = 796; fy1 = 812;
    }
    insetView = fitView(iw, ih, fx0, fx1, fy0, fy1, ix, iy);
    drawScene(ctx, insetView, game, sel, false);
    ctx.strokeStyle = '#d9c79a'; ctx.lineWidth = 2; ctx.strokeRect(ix, iy, iw, ih);
    ctx.fillStyle = 'rgba(20,16,12,0.7)'; ctx.fillRect(ix, iy, 92, 18);
    ctx.fillStyle = '#efe3c2'; ctx.font = '12px Georgia, serif'; ctx.fillText('🔭 Fernrohr', ix + 6, iy + 13);
  }
  requestAnimationFrame(frame);
}

bind();
requestAnimationFrame(frame);
start();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
