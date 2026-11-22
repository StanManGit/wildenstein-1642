// Weltmodell: seitliches Geländeprofil von der Hochfläche (NO, links) bis zum Donautal (rechts).
// Raster mit 0,5 m Zellen. x in Metern (0..W), y als Höhe über NN.

export const W = 620;
export const Y0 = 590;
export const Y1 = 870;
export const CS = 0.5;
export const NX = Math.round(W / CS);
export const NY = Math.round((Y1 - Y0) / CS);

export const AIR = 0, EARTH = 1, ROCK = 2, MASON = 3, TIMBER = 4, RUBBLE = 5, GABION = 6, WATER = 7, FILL = 8, VAULT = 9;

// Energie (kJ), die nötig ist, um eine 0,5-m-Zelle zu zerstören
export const RESIST: number[] = [];
RESIST[AIR] = 0; RESIST[EARTH] = 110; RESIST[ROCK] = 900; RESIST[MASON] = 1200; RESIST[TIMBER] = 70;
RESIST[RUBBLE] = 45; RESIST[GABION] = 90; RESIST[WATER] = 5; RESIST[FILL] = 95; RESIST[VAULT] = 1200;
// Wie weit (Zellen) darf das Material frei auskragen
const SPAN: number[] = [];
SPAN[EARTH] = 1; SPAN[MASON] = 2; SPAN[TIMBER] = 45; SPAN[GABION] = 2; SPAN[VAULT] = 50;
// Anteil zerstörter Zellen, die als Schutt liegen bleiben
const DEBRIS: number[] = [];
DEBRIS[EARTH] = 0.75; DEBRIS[ROCK] = 0.55; DEBRIS[MASON] = 0.7; DEBRIS[TIMBER] = 0.3; DEBRIS[RUBBLE] = 0.8;
DEBRIS[GABION] = 0.7; DEBRIS[FILL] = 0.8; DEBRIS[VAULT] = 0.7;

export class World {
  mat = new Uint8Array(NX * NY);
  hp = new Uint8Array(NX * NY);
  tex = new Uint8Array(NX * NY);
  img: ImageData | null = null;
  canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  dirty = { x0: 0, y0: 0, x1: NX - 1, y1: NY - 1, any: true };
  settle = { x0: 0, x1: 0, y1: 0, active: 0 };
  rnd: () => number;

  constructor(rnd: () => number) {
    this.rnd = rnd;
    this.build();
  }

  static ci(x: number) { return Math.floor(x / CS); }
  static cj(y: number) { return Math.floor((Y1 - y) / CS); }
  static cx(i: number) { return (i + 0.5) * CS; }
  static cy(j: number) { return Y1 - (j + 0.5) * CS; }

  get(i: number, j: number) {
    if (i < 0 || i >= NX || j < 0 || j >= NY) return j >= NY ? ROCK : AIR;
    return this.mat[j * NX + i];
  }
  at(x: number, y: number) { return this.get(World.ci(x), World.cj(y)); }
  solid(i: number, j: number) { const m = this.get(i, j); return m !== AIR && m !== WATER; }

  set(i: number, j: number, m: number) {
    if (i < 0 || i >= NX || j < 0 || j >= NY) return;
    const k = j * NX + i;
    this.mat[k] = m;
    this.hp[k] = m === AIR ? 0 : 255;
    this.markDirty(i, j);
  }

  markDirty(i: number, j: number) {
    const d = this.dirty;
    if (!d.any) { d.x0 = d.x1 = i; d.y0 = d.y1 = j; d.any = true; return; }
    if (i < d.x0) d.x0 = i; if (i > d.x1) d.x1 = i;
    if (j < d.y0) d.y0 = j; if (j > d.y1) d.y1 = j;
  }

  rect(xa: number, xb: number, ya: number, yb: number, m: number) {
    const i0 = World.ci(xa), i1 = World.ci(xb - 0.001), j0 = World.cj(yb - 0.001), j1 = World.cj(ya);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.set(i, j, m);
  }

  // Dreieck (Dach) von xa..xb, Basis ya, Spitze yb
  roof(xa: number, xb: number, ya: number, yb: number, m: number) {
    const mid = (xa + xb) / 2, half = (xb - xa) / 2;
    for (let x = xa; x < xb; x += CS) {
      const h = (1 - Math.abs(x + CS / 2 - mid) / half) * (yb - ya);
      this.rect(x, x + CS, ya, ya + Math.max(CS, h), m);
    }
  }

  static ground(x: number): number {
    if (x < 422) return 800 + Math.max(0, 330 - x) * 0.006 + 0.2 * Math.sin(x / 9.7);
    if (x < 426) return 800 - 22 * (x - 422) / 4;           // Gegenböschung äußerer Halsgraben
    if (x < 443) return 778;                                   // Grabensohle
    if (x < 445) return 778 + 22 * (x - 443) / 2;             // Felsböschung unter der Schildmauer
    if (x < 478) return 800;                                   // Vorburg
    if (x < 480) return 800 - 14 * (x - 478) / 2;             // innerer Graben
    if (x < 498) return 786;
    if (x < 560) return 800;                                   // Kernburg auf dem Fels
    if (x < 576) return 800 - 100 * Math.pow((x - 560) / 16, 1.3) + 3 * Math.sin(x * 1.7);
    if (x < 592) return 700 - 95 * (x - 576) / 16 + 4 * Math.sin(x * 0.9);
    return 603;
  }

  build() {
    for (let i = 0; i < NX; i++) {
      const x = World.cx(i);
      const g = World.ground(x);
      for (let j = 0; j < NY; j++) {
        const y = World.cy(j);
        const k = j * NX + i;
        this.tex[k] = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1 + 1) % 1 * 255;
        if (y > g) {
          if (x > 592 && y < 605) { this.mat[k] = y < 604 ? WATER : AIR; }
          continue;
        }
        let m = ROCK;
        if (x < 424 && y > g - 3) m = EARTH;
        if (x > 592 && y > 598) m = EARTH;
        this.mat[k] = m;
        this.hp[k] = 255;
      }
    }
    // Wasser der Donau
    this.rect(592, W, 598, 604, WATER);

    // --- Vorburg: Schildmauer 3 m stark, mit gedecktem Wehrgang ---
    this.rect(445, 448, 800, 812, MASON);
    this.rect(445, 445.5, 812, 813, MASON);             // Brustwehr
    this.rect(446.5, 447, 812, 813, MASON);
    this.rect(447.5, 451, 813.5, 814, TIMBER);          // Wehrgangdach
    this.rect(450.5, 451, 812, 813.5, TIMBER);
    // Stallgebäude der Vorburg
    this.rect(458, 470, 800, 806, MASON);
    this.rect(459, 469, 800, 805, AIR);
    this.roof(457.5, 470.5, 806, 810, TIMBER);

    // --- Hauptbastion: Kasemattenmauer 5,5 m, darüber 3,7 m ---
    this.rect(498, 503.5, 786, 808, MASON);
    this.rect(498, 501.7, 808, 822, MASON);
    this.rect(503.5, 523, 800, 822, MASON);
    this.rect(503.5, 521, 801, 806.5, AIR);            // untere Kasematte
    this.rect(503.5, 521, 806.5, 808, VAULT);
    this.rect(501.7, 521, 808, 819.5, AIR);            // obere Geschützstube
    this.rect(501.7, 521, 819.5, 821, VAULT);
    this.rect(501.7, 505, 808, 816, MASON);            // Geschützbank vor der oberen Scharte
    this.rect(501.7, 523, 821, 822, EARTH);            // Erdabdeckung
    this.rect(498, 498.5, 822, 823.5, MASON);          // Brustwehr

    // --- Kommandantenturm ---
    this.rect(523, 533, 800, 838, MASON);
    this.rect(524.5, 531.5, 801, 836.5, AIR);
    for (let y = 807; y < 836; y += 6.5) this.rect(524.5, 531.5, y, y + 0.5, TIMBER);
    this.roof(522.5, 533.5, 838, 845, TIMBER);

    // --- Palas 22 x 15 m ---
    this.rect(533, 556, 800, 818, MASON);
    this.rect(534.5, 554.5, 800.5, 817, AIR);
    this.rect(534.5, 554.5, 806, 806.5, TIMBER);
    this.rect(534.5, 554.5, 811.5, 812, TIMBER);
    this.roof(532.5, 556.5, 818, 827, TIMBER);
    this.dirty = { x0: 0, y0: 0, x1: NX - 1, y1: NY - 1, any: true };
  }

  // Höchste feste Zelle bei x (Höhe NN)
  top(x: number): number {
    const i = World.ci(x);
    for (let j = 0; j < NY; j++) if (this.solid(i, j)) return World.cy(j) + CS / 2;
    return Y0;
  }
  // Obere Kante des Bodens unter einem Punkt (für Geschützstand)
  surfaceBelow(x: number, y: number): number {
    const i = World.ci(x);
    for (let j = Math.max(0, World.cj(y)); j < NY; j++) if (this.solid(i, j)) return World.cy(j) + CS / 2;
    return Y0;
  }

  // Beschädigt eine Zelle mit E kJ. Gibt verbleibende Energie zurück.
  hit(i: number, j: number, E: number): number {
    if (i < 0 || i >= NX || j < 0 || j >= NY) return 0;
    const k = j * NX + i, m = this.mat[k];
    if (m === AIR || m === WATER) return E * 0.98;
    const need = RESIST[m] * this.hp[k] / 255;
    this.markSettle(i, j);
    if (E >= need) {
      this.set(i, j, this.rnd() < (DEBRIS[m] ?? 0.5) ? RUBBLE : AIR);
      if (this.mat[k] === RUBBLE) this.hp[k] = 120;
      return E - need;
    }
    this.hp[k] = Math.max(1, Math.round(this.hp[k] * (1 - E / need)));
    this.markDirty(i, j);
    return 0;
  }

  markSettle(i: number, j: number) {
    const s = this.settle;
    const a = Math.max(0, i - 24), b = Math.min(NX - 1, i + 24), c = Math.min(NY - 1, j + 20);
    if (!s.active) { s.x0 = a; s.x1 = b; s.y1 = c; }
    else { s.x0 = Math.min(s.x0, a); s.x1 = Math.max(s.x1, b); s.y1 = Math.max(s.y1, c); }
    s.active = 90;
  }

  supported(i: number, j: number): boolean {
    if (this.solid(i, j + 1)) return true;
    const m = this.get(i, j);
    const span = SPAN[m] ?? 1;
    for (let d = 1; d <= span; d++) {
      if (!this.solid(i - d, j)) break;
      if (this.solid(i - d, j + 1)) return true;
    }
    for (let d = 1; d <= span; d++) {
      if (!this.solid(i + d, j)) break;
      if (this.solid(i + d, j + 1)) return true;
    }
    return false;
  }

  // Ein Schritt Einsturz und Schuttrutschen. Liefert true, solange sich etwas bewegt.
  step(): boolean {
    const s = this.settle;
    if (!s.active) return false;
    let moved = false;
    for (let j = s.y1; j >= 0; j--) {
      const dir = (j & 1) ? 1 : -1;
      for (let n = 0; n <= s.x1 - s.x0; n++) {
        const i = dir > 0 ? s.x0 + n : s.x1 - n;
        const k = j * NX + i, m = this.mat[k];
        if (m === AIR || m === ROCK || m === WATER) continue;
        if (m === RUBBLE || m === FILL) {
          if (j + 1 >= NY) continue;
          const below = this.mat[k + NX];
          if (below === AIR || below === WATER) { this.swap(i, j, i, j + 1); moved = true; continue; }
          const sd = this.rnd() < 0.5 ? -1 : 1;
          for (const d of [sd, -sd]) {
            const ni = i + d;
            if (ni < 0 || ni >= NX) continue;
            const b2 = this.mat[k + NX + d];
            if ((b2 === AIR || b2 === WATER) && this.mat[k + d] === AIR && this.rnd() < 0.6) { this.swap(i, j, ni, j + 1); moved = true; break; }
          }
        } else if (!this.supported(i, j)) {
          this.mat[k] = this.rnd() < 0.8 ? RUBBLE : AIR; this.hp[k] = 120; this.markDirty(i, j); moved = true;
        }
      }
    }
    if (moved) s.active = 90; else s.active = Math.max(0, s.active - 30);
    return s.active > 0;
  }

  swap(i: number, j: number, i2: number, j2: number) {
    const a = j * NX + i, b = j2 * NX + i2;
    const m = this.mat[a], h = this.hp[a];
    this.mat[a] = this.mat[b] === WATER ? WATER : AIR; this.hp[a] = 0;
    this.mat[b] = m; this.hp[b] = h;
    this.markDirty(i, j); this.markDirty(i2, j2);
    if (j2 > this.settle.y1) this.settle.y1 = Math.min(NY - 1, j2 + 2);
  }

  // Lockere Füllung (Faschinen, Erde, Wollsäcke) in Spalten einbringen: füllt von unten auf
  fill(xa: number, xb: number, cells: number, maxY: number) {
    const i0 = World.ci(xa), i1 = World.ci(xb);
    let placed = 0, guard = 0;
    while (placed < cells && guard++ < 10000) {
      // niedrigste Spalte suchen
      let best = -1, bestJ = -1;
      for (let i = i0; i <= i1; i++) {
        let j = 0;
        while (j < NY && !this.solid(i, j)) j++;
        const jj = j - 1;
        if (jj < 0 || World.cy(jj) > maxY) continue;
        if (jj > bestJ) { bestJ = jj; best = i; }
      }
      if (best < 0) break;
      this.set(best, bestJ, FILL);
      placed++;
    }
    return placed;
  }

  // ---- Darstellung ----
  colorOf(m: number, k: number, j: number, i: number): [number, number, number] {
    const t = this.tex[k] / 255, h = this.hp[k] / 255;
    let r = 0, g = 0, b = 0;
    switch (m) {
      case EARTH: {
        const grass = !this.solid(i, j - 1);
        if (grass) { r = 86 + t * 20; g = 112 + t * 25; b = 52; }
        else { r = 112 + t * 22; g = 86 + t * 16; b = 58 + t * 10; }
        break;
      }
      case ROCK: {
        const y = Y1 - j * CS;
        const depth = Math.max(0.62, Math.min(1, 0.62 + (y - 720) / 220));
        const bed = (j + ((i >> 4) % 3)) % 11 === 0 ? -22 : 0;
        const v = (150 + t * 14 + bed) * depth; r = v; g = v - 5; b = v - 16; break;
      }
      case MASON: case VAULT: {
        const course = j % 2 === 0;
        const joint = course && ((i + (j >> 1) * 3) % 4 === 0);
        const v = joint ? 120 : 176 + t * 26;
        r = v + 4; g = v - 2; b = v - 16;
        break;
      }
      case TIMBER: { r = 104 + t * 20; g = 70 + t * 12; b = 40; break; }
      case RUBBLE: { const v = 140 + t * 50; r = v; g = v - 10; b = v - 26; break; }
      case GABION: { r = 140 + t * 30; g = 112 + t * 20; b = 60; break; }
      case FILL: { r = 120 + t * 25; g = 96 + t * 18; b = 62; break; }
      case WATER: { r = 60; g = 96 + t * 10; b = 120 + t * 12; break; }
    }
    const d = 0.55 + 0.45 * h;
    return [r * d, g * d, b * d];
  }

  render() {
    if (!this.canvas) {
      const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(NX, NY) : Object.assign(document.createElement('canvas'), { width: NX, height: NY });
      this.canvas = c;
      this.img = new ImageData(NX, NY);
    }
    const d = this.dirty;
    if (!d.any) return;
    const data = this.img!.data;
    for (let j = d.y0; j <= d.y1; j++) for (let i = d.x0; i <= d.x1; i++) {
      const k = j * NX + i, m = this.mat[k], p = k * 4;
      if (m === AIR) { data[p + 3] = 0; continue; }
      const [r, g, b] = this.colorOf(m, k, j, i);
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = m === WATER ? 200 : 255;
    }
    const ctx = (this.canvas as any).getContext('2d') as CanvasRenderingContext2D;
    ctx.putImageData(this.img!, 0, 0, d.x0, d.y0, d.x1 - d.x0 + 1, d.y1 - d.y0 + 1);
    d.any = false;
  }
}
