import { lerp } from "@shared/math";

/** Synthesized night ambience: sea swell, night frogs and the found song (no recording). */
export interface Ambience {
  /** Creates the audio graph; call it from a user gesture (browser autoplay rules). */
  start(): void;
  readonly on: boolean;
  /** Mutes or unmutes; returns the new state. */
  toggle(): boolean;
  chime(index: number): void;
  onPage(to: number): void;
  update(dt: number, under: number, song: number, calm: number): void;
  dispose(): void;
}

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19];
const VOLUME = 0.9;

type AudioContextClass = typeof AudioContext;

/** The page's AudioContext constructor, with the old WebKit prefix as a fallback. */
function audioContextClass(): AudioContextClass | undefined {
  const legacy = window as unknown as { webkitAudioContext?: AudioContextClass };
  return window.AudioContext ?? legacy.webkitAudioContext;
}

/** Random number in [a, b) (ambience timing only: not part of the seeded layout). */
const rand = (a: number, b: number): number => a + (b - a) * Math.random();

/** Prototype `audio`: everything is synthesized with WebAudio. */
export function createAmbience(): Ambience {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let seaF: BiquadFilterNode;
  let seaG: GainNode;
  let hissG: GainNode;
  let droneG: GainNode;
  let rev: ConvolverNode;
  let on = true;
  let frogT = 0;
  let songT = 0;

  /** Brownish noise buffer of `sec` seconds. */
  function noiseBuf(c: AudioContext, sec: number): AudioBuffer {
    const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
    const d = b.getChannelData(0);
    let l = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      l = (l + 0.02 * w) / 1.02;
      d[i] = l * 3.5;
    }
    return b;
  }

  /** Short pitch glide (a frog whistle). */
  function blip(
    c: AudioContext,
    f0: number,
    f1: number,
    t: number,
    dur: number,
    vol: number,
  ): void {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A bell-like note `semi` semitones above G4, with reverb. */
  function note(c: AudioContext, semi: number, t: number, vol = 0.12, dur = 2.4): void {
    const f = 392 * Math.pow(2, semi / 12);
    const partials: [number, number, OscillatorType][] = [
      [1, 1, "sine"],
      [2, 0.25, "triangle"],
      [3.01, 0.08, "sine"],
    ];
    for (const [mult, v, type] of partials) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mult);
      o.connect(g);
      g.connect(master);
      g.connect(rev);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  return {
    start() {
      if (ctx) return;
      const Ctor = audioContextClass();
      if (!Ctor) return;
      let c: AudioContext;
      try {
        c = new Ctor();
      } catch {
        return;
      }
      ctx = c;
      master = c.createGain();
      master.gain.value = 0;
      master.connect(c.destination);
      rev = c.createConvolver();
      const ir = c.createBuffer(2, c.sampleRate * 3, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < d.length; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
        }
      }
      rev.buffer = ir;
      const rg = c.createGain();
      rg.gain.value = 0.35;
      rev.connect(rg);
      rg.connect(master);
      const src = c.createBufferSource();
      src.buffer = noiseBuf(c, 6);
      src.loop = true;
      seaF = c.createBiquadFilter();
      seaF.type = "lowpass";
      seaF.frequency.value = 700;
      seaG = c.createGain();
      seaG.gain.value = 0.25;
      src.connect(seaF);
      seaF.connect(seaG);
      seaG.connect(master);
      src.start();
      const src2 = c.createBufferSource();
      src2.buffer = noiseBuf(c, 4);
      src2.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = "highpass";
      bp.frequency.value = 2500;
      hissG = c.createGain();
      hissG.gain.value = 0;
      src2.connect(bp);
      bp.connect(hissG);
      hissG.connect(master);
      src2.start();
      droneG = c.createGain();
      droneG.gain.value = 0;
      droneG.connect(master);
      for (const f of [55, 82.4, 110.2]) {
        const o = c.createOscillator();
        o.frequency.value = f;
        o.type = "sine";
        const g = c.createGain();
        g.gain.value = 0.12;
        o.connect(g);
        g.connect(droneG);
        o.start();
      }
      master.gain.linearRampToValueAtTime(on ? VOLUME : 0, c.currentTime + 3);
    },
    get on() {
      return on;
    },
    toggle() {
      on = !on;
      if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(on ? VOLUME : 0, ctx.currentTime + 0.6);
      }
      return on;
    },
    chime(i) {
      if (!ctx) return;
      const t = ctx.currentTime;
      const base = [0, 4, 7][i % 3];
      note(ctx, base + 12, t, 0.1);
      note(ctx, base + 19, t + 0.18, 0.07);
    },
    onPage(to) {
      if (!ctx || to !== 2) return;
      const t = ctx.currentTime;
      [12, 16, 19].forEach((s, i) => note(ctx as AudioContext, s, t + 1.4 + i * 0.5, 0.07));
    },
    update(dt, under, song, calm) {
      if (!ctx) return;
      const t = ctx.currentTime;
      const swell =
        (0.18 + 0.12 * Math.sin(t * 0.55) + 0.05 * Math.sin(t * 1.3)) * (1 - 0.6 * calm);
      seaG.gain.setTargetAtTime(lerp(swell, 0.12, under), t, 0.3);
      seaF.frequency.setTargetAtTime(lerp(650 + swell * 1200, 260, under), t, 0.4);
      hissG.gain.setTargetAtTime(lerp(0.035 + swell * 0.05, 0, under), t, 0.4);
      droneG.gain.setTargetAtTime(under * 0.35, t, 0.8);
      frogT -= dt;
      if (frogT < 0 && under < 0.5 && calm < 0.5) {
        frogT = rand(0.6, 2.6);
        const tt = t + 0.02;
        const v = rand(0.012, 0.03);
        const f = rand(2300, 2900);
        blip(ctx, f * 0.85, f, tt, 0.07, v);
        blip(ctx, f * 1.05, f * 1.22, tt + 0.16, 0.11, v * 0.9);
      }
      if (song > 0.5) {
        songT -= dt;
        if (songT < 0) {
          songT = rand(1.6, 2.8);
          note(ctx, PENTA[(Math.random() * PENTA.length) | 0], t, 0.05 * song, 3);
        }
      }
    },
    dispose() {
      const c = ctx;
      ctx = null;
      if (c) void c.close().catch(() => undefined);
    },
  };
}
