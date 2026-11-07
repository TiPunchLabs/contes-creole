// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImmersiveHandle } from "@app/contract";
import world from "./index";
import { PAGE_COUNT, PAGES } from "./text";

let container: HTMLElement;
let handle: ImmersiveHandle | null;
const exit = vi.fn();

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
  container.querySelector<T>(sel) as T;
const click = (sel: string): void => $(sel).click();
const key = (k: string): void => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: k, cancelable: true }));
};

/** Mounts the world; happy-dom has no WebGL, so this is the text-only reading. */
async function mount(): Promise<void> {
  const pending = world.mount(container, { exit });
  await vi.advanceTimersByTimeAsync(2000);
  handle = await pending;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "<div></div>";
  container = document.body.firstElementChild as HTMLElement;
  handle = null;
  exit.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  handle?.dispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Mila's world", () => {
  it("has the prototype's twelve pages", () => {
    expect(PAGE_COUNT).toBe(12);
    expect(PAGES[0].title).toBe("Là où la vague s'endort");
    expect(PAGES[11].title).toBe("Ce que Mila rapporta");
    expect(PAGES[4].hint).toBe("Touchez les déchets pour libérer le passage du crabe");
  });

  it("opens straight on page 1 in French, with no cover screen and the way back to the tree", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    await mount();
    expect($(".mila").lang).toBe("fr");
    expect($(".mila-title").textContent).toBe("Mila et le lambi qui avait perdu son chant");
    expect(container.querySelector(".mila-cover, .mila-enter, .mila-tocover")).toBeNull();
    expect($(".mila-loader").classList.contains("is-gone")).toBe(true);
    expect($(".mila-ui").classList.contains("is-on")).toBe(true);
    expect($(".mila-heading").textContent).toBe(PAGES[0].title);
    expect($(".mila-num").textContent).toBe("Page 01");
    expect(document.activeElement).toBe($(".mila-next"));
    click(".mila-back");
    expect(exit).toHaveBeenCalledOnce();
  });

  it("opens on page 1 again after leaving and coming back", async () => {
    await mount();
    for (let i = 2; i <= 7; i++) click(".mila-next");
    handle?.dispose();
    await mount();
    expect($(".mila-heading").textContent).toBe(PAGES[0].title);
    expect(container.querySelectorAll(".mila")).toHaveLength(1);
  });

  it("reads all twelve pages as text without WebGL, then rereads", async () => {
    await mount();
    expect($(".mila").classList.contains("is-nogl")).toBe(true);
    expect($(".mila-heading").textContent).toBe(PAGES[0].title);
    expect($<HTMLButtonElement>(".mila-prev").disabled).toBe(true);
    for (let i = 2; i <= PAGE_COUNT; i++) click(".mila-next");
    expect($(".mila-num").textContent).toBe("Page 12");
    expect($(".mila-count").textContent).toBe("12 / 12");
    expect($<HTMLButtonElement>(".mila-next").disabled).toBe(true);
    expect($(".mila-end").hidden).toBe(false);
    expect($(".mila-text").textContent).toContain("à ceux qui savent lui laisser une place.");
    click(".mila-prev");
    expect($(".mila-heading").textContent).toBe(PAGES[10].title);
    key("ArrowRight");
    expect($(".mila-heading").textContent).toBe(PAGES[11].title);
    click(".mila-reread");
    expect($(".mila-heading").textContent).toBe(PAGES[0].title);
    expect($(".mila-end").hidden).toBe(true);
    expect(document.activeElement).toBe($(".mila-next"));
  });

  it("never shows the crab hint when there is no scene to touch", async () => {
    await mount();
    for (let i = 2; i <= 5; i++) click(".mila-next");
    expect($(".mila-num").textContent).toBe("Page 05");
    expect($(".mila-hint").hidden).toBe(true);
  });

  it("toggles sound and motion with their pressed states", async () => {
    await mount();
    click(".mila-sound");
    expect($(".mila-sound").getAttribute("aria-pressed")).toBe("false");
    expect($(".mila-sound").getAttribute("aria-label")).toBe("Activer l'ambiance sonore");
    click(".mila-pause");
    expect($(".mila-pause").getAttribute("aria-pressed")).toBe("true");
    expect($(".mila-pause").getAttribute("aria-label")).toBe("Reprendre les mouvements");
  });

  it("starts the sound on opening and resumes it at the first gesture if the browser held it", async () => {
    const node = (): Record<string, unknown> => ({
      connect: vi.fn(),
      start: vi.fn(),
      gain: { value: 0, linearRampToValueAtTime: vi.fn() },
      frequency: { value: 0 },
    });
    const resume = vi.fn(function (this: { state: string }) {
      this.state = "running";
      return Promise.resolve();
    });
    class HeldContext {
      state = "suspended";
      sampleRate = 8000;
      currentTime = 0;
      destination = {};
      resume = resume;
      close = (): Promise<void> => Promise.resolve();
      createGain = node;
      createConvolver = node;
      createBiquadFilter = node;
      createBufferSource = node;
      createOscillator = node;
      createBuffer = (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) });
    }
    vi.stubGlobal("AudioContext", HeldContext);
    await mount();
    expect(resume).not.toHaveBeenCalled();
    key("ArrowRight");
    expect(resume).toHaveBeenCalledOnce();
    key("ArrowRight");
    expect(resume).toHaveBeenCalledOnce();
  });

  it("removes its page and key listener on dispose", async () => {
    await mount();
    const removed = vi.spyOn(window, "removeEventListener");
    handle?.dispose();
    handle = null;
    expect(container.querySelector(".mila")).toBeNull();
    expect(removed).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});
