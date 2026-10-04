// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAmbience, createMuteButton, readMuted, soundLevels } from "./sound";

const day = { water: 0, night: 0, rain: 0, wilt: 0 };

describe("soundLevels", () => {
  it("quiets the river and wakes the cicadas in the drought", () => {
    const full = soundLevels(day);
    const dry = soundLevels({ ...day, water: -1.35, wilt: 0.8 });
    expect(dry.river).toBeLessThan(full.river);
    expect(dry.cicadas).toBeGreaterThan(full.cicadas);
  });

  it("swaps birds for tree frogs at night", () => {
    const night = soundLevels({ ...day, night: 1 });
    expect(night.birds).toBe(0);
    expect(night.frogs).toBeGreaterThan(0);
  });

  it("lets the rain drown the birds", () => {
    const wet = soundLevels({ ...day, rain: 1 });
    expect(wet.rain).toBeGreaterThan(0);
    expect(wet.birds).toBe(0);
  });
});

describe("createAmbience", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stays silent without WebAudio", () => {
    vi.stubGlobal("AudioContext", undefined);
    const ambience = createAmbience();
    expect(() => {
      ambience.update(soundLevels(day));
      ambience.setMuted(true);
      ambience.dispose();
    }).not.toThrow();
  });
});

describe("mute button", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("toggles, remembers the choice and leaves on dispose", () => {
    const container = document.createElement("div");
    const onChange = vi.fn();
    const button = createMuteButton(container, onChange);
    const el = container.querySelector<HTMLButtonElement>(".tk-sound");
    expect(onChange).toHaveBeenLastCalledWith(false);
    el?.click();
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(el?.getAttribute("aria-pressed")).toBe("true");
    expect(readMuted()).toBe(true);
    button.dispose();
    expect(container.querySelector(".tk-sound")).toBeNull();
  });

  it("works when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const container = document.createElement("div");
    const onChange = vi.fn();
    createMuteButton(container, onChange);
    container.querySelector<HTMLButtonElement>(".tk-sound")?.click();
    expect(onChange).toHaveBeenLastCalledWith(true);
  });
});
