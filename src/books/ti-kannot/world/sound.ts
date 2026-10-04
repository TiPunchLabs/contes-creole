import { clamp } from "@shared/math";
import type { MixedEnv } from "./env";

export interface SoundLevels {
  river: number;
  birds: number;
  frogs: number;
  cicadas: number;
  rain: number;
}

export interface Ambience {
  update(levels: SoundLevels): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

const STORAGE_KEY = "ti-kannot:muted";
const MASTER = 0.8;
const NOTE = `<path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/>`;
const ICON_ON = `<svg viewBox="0 0 24 24" aria-hidden="true">${NOTE}</svg>`;
const ICON_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true">${NOTE}<path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

/** Per-layer gains for a mixed env: the river follows the water, the drought brings cicadas. */
export function soundLevels(env: Pick<MixedEnv, "water" | "night" | "rain" | "wilt">): SoundLevels {
  const day = 1 - env.night;
  return {
    river: clamp(0.1 + (0.5 * (env.water + 1.35)) / 1.6, 0.1, 0.6),
    birds: 0.5 * day * (1 - env.wilt) * (1 - env.rain),
    frogs: 0.45 * env.night,
    cicadas: 0.35 * day * env.wilt,
    rain: 0.6 * env.rain,
  };
}

const SILENT: Ambience = { update: () => {}, setMuted: () => {}, dispose: () => {} };

/** Procedural island ambience (no audio files); silent when WebAudio is unavailable. */
export function createAmbience(target: EventTarget = window): Ambience {
  const Context = globalThis.AudioContext;
  if (!Context) return SILENT;
  let ctx: AudioContext;
  try {
    ctx = new Context();
  } catch {
    return SILENT;
  }
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  /** Gain node fed by `input` through `chain`, into the master. */
  const layer = (input: AudioNode, ...chain: AudioNode[]): GainNode => {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    [input, ...chain, gain].reduce((a, b) => a.connect(b));
    gain.connect(master);
    return gain;
  };
  /** Biquad filter of a given type and frequency. */
  const filter = (type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = q;
    return f;
  };
  const river = layer(noise, filter("bandpass", 500, 0.6), filter("lowpass", 1400));
  const rain = layer(noise, filter("highpass", 1800));
  const buzz = ctx.createOscillator();
  buzz.type = "sawtooth";
  buzz.frequency.value = 4300;
  const pulse = ctx.createGain();
  pulse.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 28;
  const depth = ctx.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth).connect(pulse.gain);
  const cicadas = layer(buzz, filter("bandpass", 4300, 6), pulse);
  noise.start();
  buzz.start();
  lfo.start();

  let levels: SoundLevels = { river: 0, birds: 0, frogs: 0, cicadas: 0, rain: 0 };
  let birdTimer: ReturnType<typeof setTimeout> | undefined;
  let frogTimer: ReturnType<typeof setTimeout> | undefined;

  /** One short sine note sliding from f0 to f1. */
  const note = (f0: number, f1: number, at: number, length: number, gain: number): void => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(f1, at + length);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(env).connect(master);
    osc.start(at);
    osc.stop(at + length + 0.02);
  };
  /** Bananaquit-like chirps, rescheduled at random intervals. */
  const birds = (): void => {
    if (levels.birds > 0.02) {
      const t = ctx.currentTime;
      const count = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < count; k++) {
        const f0 = 2600 + Math.random() * 1400;
        note(f0, f0 + 1200 + Math.random() * 1500, t + k * 0.13, 0.1, levels.birds * 0.25);
      }
    }
    birdTimer = setTimeout(birds, 700 + Math.random() * 2200);
  };
  /** Two-note "ko-kwi" of the ti-sonnèt tree frog. */
  const frogs = (): void => {
    if (levels.frogs > 0.02) {
      const t = ctx.currentTime;
      note(1700, 1800, t, 0.05, levels.frogs * 0.3);
      note(2900, 3100, t + 0.09, 0.08, levels.frogs * 0.3);
    }
    frogTimer = setTimeout(frogs, 600 + Math.random() * 900);
  };
  birds();
  frogs();

  const resume = (): void => void ctx.resume().catch(() => {});
  target.addEventListener("pointerdown", resume);
  resume();

  return {
    update(next) {
      const keys = Object.keys(next) as (keyof SoundLevels)[];
      if (!keys.some((k) => Math.abs(next[k] - levels[k]) > 0.01)) return;
      levels = next;
      const now = ctx.currentTime;
      river.gain.setTargetAtTime(next.river, now, 0.6);
      rain.gain.setTargetAtTime(next.rain, now, 0.6);
      cicadas.gain.setTargetAtTime(next.cicadas * 0.15, now, 0.6);
    },
    setMuted(muted) {
      master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.3);
      if (!muted) resume();
    },
    dispose() {
      clearTimeout(birdTimer);
      clearTimeout(frogTimer);
      target.removeEventListener("pointerdown", resume);
      void ctx.close().catch(() => {});
    },
  };
}

/** The visitor's saved mute choice; unmuted when storage is unavailable. */
export function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Saves the mute choice; keeps it for this visit only when storage is blocked. */
function storeMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Storage blocked (private mode): the choice lasts until the page closes.
  }
}

/** Sound toggle in the world's corner; reports the initial state, then every change. */
export function createMuteButton(
  container: HTMLElement,
  onChange: (muted: boolean) => void,
): { dispose(): void } {
  let muted = readMuted();
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tk-sound";
  /** Syncs the icon and accessible state with `muted`. */
  const render = (): void => {
    button.setAttribute("aria-pressed", String(muted));
    button.setAttribute("aria-label", muted ? "Remettre le son" : "Couper le son");
    button.innerHTML = muted ? ICON_OFF : ICON_ON;
  };
  const stop = (e: Event): void => e.stopPropagation();
  button.addEventListener("pointerdown", stop);
  button.addEventListener("pointerup", stop);
  button.addEventListener("click", () => {
    muted = !muted;
    storeMuted(muted);
    render();
    onChange(muted);
  });
  render();
  container.append(button);
  onChange(muted);
  return { dispose: () => button.remove() };
}
