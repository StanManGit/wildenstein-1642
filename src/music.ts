// Musik im Stil um 1600, im Browser erzeugt (eigene Kompositionen, keine Originalstücke).
// Instrumente: Schalmei, Querpfeife, Laute/Bass, Bordun, Trommel.

type Note = [string, number]; // Tonname (z. B. "D4") oder "r" für Pause, Dauer in Schlägen

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(n: string) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n)!;
  let s = NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + s;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parse(s: string): Note[] {
  return s.trim().split(/\s+/).filter(x => x !== '|').map(t => { const [n, d] = t.split(':'); return [n, Number(d)]; });
}

interface Track { name: string; bpm: number; lead: 'shawm' | 'fife'; melody: Note[]; bass: Note[]; drum: string; drone?: string[] }

// „Donautaler Tanz“ – Dorisch, im Stil einer Ronde aus Tanzsammlungen um 1600
const TANZ: Track = {
  name: 'Donautaler Tanz', bpm: 96, lead: 'shawm',
  melody: parse(`
    D4:2 A4:2 A4:1 G4:1 F4:1 E4:1 | D4:2 F4:1 G4:1 A4:3 r:1 | C5:2 A4:1 G4:1 F4:2 E4:2 | D4:1 E4:1 F4:1 E4:1 D4:4
    D4:2 A4:2 A4:1 G4:1 F4:1 E4:1 | D4:2 F4:1 G4:1 A4:3 r:1 | C5:2 A4:1 G4:1 F4:2 E4:2 | D4:1 E4:1 F4:1 E4:1 D4:4
    A4:2 C5:2 D5:2 C5:1 A4:1 | G4:2 A4:1 G4:1 F4:2 D4:2 | F4:1 G4:1 A4:1 C5:1 D5:2 A4:2 | G4:1 F4:1 E4:2 D4:4
    A4:2 C5:2 D5:2 C5:1 A4:1 | G4:2 A4:1 G4:1 F4:2 D4:2 | F4:1 G4:1 A4:1 C5:1 D5:2 A4:2 | G4:1 F4:1 E4:2 D4:4`),
  bass: parse(`
    D3:4 D3:4 | D3:4 F3:4 | C3:4 D3:2 A2:2 | D3:4 D3:4
    D3:4 D3:4 | D3:4 F3:4 | C3:4 D3:2 A2:2 | D3:4 D3:4
    F3:4 D3:4 | C3:4 D3:4 | F3:4 D3:4 | C3:2 A2:2 D3:4
    F3:4 D3:4 | C3:4 D3:4 | F3:4 D3:4 | C3:2 A2:2 D3:4`),
  drum: 'X..x', drone: ['D3', 'A3'],
};

// „Marsch der Batterie“ – Querpfeife und Trommel, Feldmusik-Stil
const MARSCH: Track = {
  name: 'Marsch der Batterie', bpm: 112, lead: 'fife',
  melody: parse(`
    G5:1 G5:1 B5:1 D6:1 | C6:1 B5:1 A5:2 | G5:1 A5:1 B5:1 G5:1 | A5:2 D5:2
    G5:1 G5:1 B5:1 D6:1 | C6:1 B5:1 A5:1 B5:1 | C6:1 A5:1 F#5:1 A5:1 | G5:4
    D6:1 D6:1 C6:1 B5:1 | C6:1 C6:1 B5:1 A5:1 | B5:1 G5:1 A5:1 F#5:1 | G5:2 D5:2
    D6:1 D6:1 C6:1 B5:1 | C6:1 B5:1 A5:1 B5:1 | C6:1 A5:1 F#5:1 A5:1 | G5:4`),
  bass: parse(`G3:4 D3:4 G3:4 D3:4 G3:4 G3:4 D3:4 G3:4 G3:4 C3:4 G3:2 D3:2 G3:4 G3:4 C3:4 D3:4 G3:4`),
  drum: 'XxxXx.xx',
};

export const TRACKS = { tanz: TANZ, marsch: MARSCH };

export class Music {
  ac: AudioContext;
  out: GainNode;
  noise: AudioBuffer;
  track: Track | null = null;
  timer: number | null = null;
  next = 0; mi = 0; bi = 0; mt = 0; bt = 0; beat = 0;
  vol = 0.22;

  constructor(ac: AudioContext) {
    this.ac = ac;
    this.out = ac.createGain();
    this.out.gain.value = 0;
    const rev = this.reverb(), wet = ac.createGain();
    wet.gain.value = 0.25;
    this.out.connect(ac.destination);
    this.out.connect(rev); rev.connect(wet); wet.connect(ac.destination);
    this.noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  reverb(): ConvolverNode {
    const a = this.ac, len = a.sampleRate * 1.8;
    const buf = a.createBuffer(2, len, a.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) * 0.5; }
    const cv = a.createConvolver(); cv.buffer = buf;
    return cv;
  }

  play(name: keyof typeof TRACKS) {
    const t = TRACKS[name];
    if (this.track === t) return;
    this.stop(0.8);
    setTimeout(() => {
      this.track = t; this.mi = this.bi = 0; this.beat = 0;
      this.next = this.ac.currentTime + 0.1; this.mt = this.bt = this.next;
      this.out.gain.cancelScheduledValues(this.ac.currentTime);
      this.out.gain.setTargetAtTime(this.vol, this.ac.currentTime, 0.6);
      if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 80);
    }, this.track ? 900 : 0);
  }

  stop(fade = 0.5) {
    this.out.gain.setTargetAtTime(0, this.ac.currentTime, fade / 3);
    const tr = this.track;
    setTimeout(() => { if (this.track === tr) { this.track = null; if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } } }, fade * 1000 + 50);
  }

  schedule() {
    const t = this.track; if (!t) return;
    const spb = 60 / t.bpm, ahead = this.ac.currentTime + 0.3;
    while (this.mt < ahead) {
      const [n, d] = t.melody[this.mi];
      if (n !== 'r') this.lead(t.lead, freq(n), this.mt, d * spb);
      this.mt += d * spb; this.mi = (this.mi + 1) % t.melody.length;
    }
    while (this.bt < ahead) {
      const [n, d] = t.bass[this.bi];
      if (n !== 'r') this.pluck(freq(n), this.bt, d * spb);
      if (t.drone && this.bi % 4 === 0) for (const dn of t.drone) this.drone(freq(dn), this.bt, d * spb * 4);
      this.bt += d * spb; this.bi = (this.bi + 1) % t.bass.length;
    }
    while (this.next < ahead) {
      const p = t.drum[this.beat % t.drum.length];
      if (p === 'X') this.drum(this.next, 1); else if (p === 'x') this.drum(this.next, 0.45);
      this.next += spb / (t.drum.length > 4 ? 2 : 1); this.beat++;
    }
  }

  env(g: GainNode, t: number, dur: number, peak: number, att = 0.03, rel = 0.08) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.setValueAtTime(peak * 0.85, Math.max(t + att, t + dur - rel));
    g.gain.linearRampToValueAtTime(0, t + dur);
  }

  lead(kind: 'shawm' | 'fife', f: number, t: number, dur: number) {
    const a = this.ac, g = a.createGain();
    const o1 = a.createOscillator(), o2 = a.createOscillator();
    const vib = a.createOscillator(), vg = a.createGain();
    vib.frequency.value = 5.2; vg.gain.value = f * 0.006; vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
    const filt = a.createBiquadFilter();
    if (kind === 'shawm') {
      o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 6;
      filt.type = 'bandpass'; filt.frequency.value = 1400; filt.Q.value = 0.9;
    } else {
      o1.type = 'triangle'; o2.type = 'sine'; o2.frequency.value = f * 2;
      filt.type = 'lowpass'; filt.frequency.value = 5000;
    }
    o1.frequency.value = f; if (kind === 'shawm') o2.frequency.value = f;
    o1.connect(filt); o2.connect(filt); filt.connect(g); g.connect(this.out);
    this.env(g, t, dur * 0.95, kind === 'shawm' ? 0.18 : 0.22, kind === 'fife' ? 0.02 : 0.04);
    for (const o of [o1, o2, vib]) { o.start(t); o.stop(t + dur + 0.05); }
  }

  pluck(f: number, t: number, dur: number) {
    const a = this.ac, o = a.createOscillator(), g = a.createGain(), filt = a.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f;
    filt.type = 'lowpass'; filt.frequency.setValueAtTime(2200, t); filt.frequency.exponentialRampToValueAtTime(300, t + 0.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(1.4, dur));
    o.connect(filt); filt.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  drone(f: number, t: number, dur: number) {
    const a = this.ac, o = a.createOscillator(), g = a.createGain(), filt = a.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f;
    filt.type = 'lowpass'; filt.frequency.value = 600;
    this.env(g, t, dur, 0.05, 0.3, 0.3);
    o.connect(filt); filt.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  drum(t: number, v: number) {
    const a = this.ac;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.3);
    const n = a.createBufferSource(); n.buffer = this.noise;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.7;
    const ng = a.createGain(); ng.gain.setValueAtTime(0.25 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(f); f.connect(ng); ng.connect(this.out); n.start(t); n.stop(t + 0.15);
  }
}
