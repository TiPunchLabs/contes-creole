// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImmersiveHandle, ImmersiveText, Lang, Story } from "@app/contract";
import world from "./index";
import { CRAB_HINT, PAGE_COUNT } from "./text";

/** A twelve-page story whose titles and texts name their language and page. */
const storyOf = (lang: Lang, word: string, pages = PAGE_COUNT): Story => ({
  lang,
  title: "Mila",
  pages: Array.from({ length: pages }, (_, i) => ({
    id: `p${i + 1}`,
    label: "",
    title: `${word} ${i + 1}`,
    blocks: [{ kind: "text" as const, text: `${word} ${i + 1}.`, html: `${word} &amp; ${i + 1}.` }],
  })),
});
const FR = storyOf("fr", "Page");
const GCF = storyOf("gcf", "Paj");

let container: HTMLElement;
let handle: ImmersiveHandle | null;
const exit = vi.fn();

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
  container.querySelector<T>(sel) as T;
const click = (sel: string): void => $(sel).click();
const key = (k: string, target: EventTarget = window): void => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: k, cancelable: true, bubbles: true }));
};
const heading = (): string | null => $(".mila-heading").textContent;
const title = (n: number): string => `Page ${n}`;

/** Mounts the world; happy-dom has no WebGL, so this is the text-only reading. */
async function mount(text: ImmersiveText = { story: FR }): Promise<void> {
  const pending = world.mount(container, { exit, text });
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
  it("keeps the scene's twelve pages and the crab's French hint", () => {
    expect(PAGE_COUNT).toBe(12);
    expect(CRAB_HINT).toBe("Touchez les déchets pour libérer le passage du crabe");
  });

  it("refuses a story without the scene's twelve pages, before building anything", async () => {
    await expect(
      world.mount(container, { exit, text: { story: storyOf("gcf", "Paj", 11) } }),
    ).rejects.toThrow("story/gcf.md has 11 pages");
    expect(container.children).toHaveLength(0);
  });

  it("switches language on the same page, keeping the interface strings French", async () => {
    await mount({ story: GCF });
    for (let i = 2; i <= 5; i++) click(".mila-next");
    expect(heading()).toBe("Paj 5");
    expect($(".mila-story").lang).toBe("gcf");
    expect($(".mila-text").innerHTML).toBe("<p>Paj &amp; 5.</p>");
    expect($(".mila-num").lang).toBe("fr");
    expect($(".mila-end").lang).toBe("fr");
    handle?.setText({ story: GCF, gloss: FR });
    expect(heading()).toBe("Paj 5");
    expect($(".mila-gloss").hidden).toBe(false);
    expect($(".mila-gloss").lang).toBe("fr");
    expect($(".mila-gloss").textContent).toBe("Page & 5.");
    handle?.setText({ story: FR });
    expect(heading()).toBe("Page 5");
    expect($(".mila-story").lang).toBe("fr");
    expect($(".mila-gloss").hidden).toBe(true);
    expect($(".mila-count").textContent).toBe("5 / 12");
    click(".mila-next");
    expect(heading()).toBe("Page 6");
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
    expect($(".mila-heading").textContent).toBe(title(1));
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
    expect($(".mila-heading").textContent).toBe(title(1));
    expect(container.querySelectorAll(".mila")).toHaveLength(1);
  });

  it("reads all twelve pages as text without WebGL, then rereads", async () => {
    await mount();
    expect($(".mila").classList.contains("is-nogl")).toBe(true);
    expect($(".mila-heading").textContent).toBe(title(1));
    expect($<HTMLButtonElement>(".mila-prev").disabled).toBe(true);
    for (let i = 2; i <= PAGE_COUNT; i++) click(".mila-next");
    expect($(".mila-num").textContent).toBe("Page 12");
    expect($(".mila-count").textContent).toBe("12 / 12");
    expect($<HTMLButtonElement>(".mila-next").disabled).toBe(true);
    expect($(".mila-end").hidden).toBe(false);
    expect($(".mila-text").textContent).toBe("Page & 12.");
    click(".mila-prev");
    expect($(".mila-heading").textContent).toBe(title(11));
    key("ArrowRight");
    expect($(".mila-heading").textContent).toBe(title(12));
    click(".mila-reread");
    expect($(".mila-heading").textContent).toBe(title(1));
    expect($(".mila-end").hidden).toBe(true);
    expect(document.activeElement).toBe($(".mila-next"));
  });

  it("has the shell's page buttons and counter (Ti Kannot)", async () => {
    await mount();
    const names = [...container.querySelectorAll(".mila-ui button")].map((b) =>
      b.getAttribute("aria-label"),
    );
    expect(names).toEqual([
      "Couper l'ambiance sonore",
      "Mettre les mouvements en pause",
      "Page précédente",
      "Page suivante",
    ]);
    expect($(".mila-next").textContent?.trim()).toBe("");
    expect($(".mila-count").textContent).toBe("1 / 12");
    click(".mila-next");
    expect($(".mila-count").textContent).toBe("2 / 12");
  });

  it("turns pages with the shell's keys, and lets Space press a focused button", async () => {
    await mount();
    for (const k of ["ArrowDown", "PageDown", " ", "ArrowRight"]) key(k);
    expect(heading()).toBe(title(5));
    for (const k of ["ArrowUp", "PageUp", "ArrowLeft"]) key(k);
    expect(heading()).toBe(title(2));
    key(" ", $(".mila-pause"));
    expect(heading()).toBe(title(2));
  });

  it("turns one page per wheel or swipe gesture", async () => {
    await mount();
    const root = $(".mila");
    const wheel = (deltaY: number): boolean =>
      root.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true, bubbles: true }));
    expect(wheel(120)).toBe(false);
    wheel(120);
    wheel(120);
    expect(heading()).toBe(title(2));
    vi.advanceTimersByTime(800);
    wheel(-120);
    expect(heading()).toBe(title(1));
    vi.advanceTimersByTime(800);
    const pointer = (type: string, clientY: number, pointerType = "touch"): void => {
      root.dispatchEvent(new PointerEvent(type, { clientY, pointerType, bubbles: true }));
    };
    pointer("pointerdown", 600);
    pointer("pointermove", 500);
    pointer("pointermove", 300);
    pointer("pointerup", 300);
    expect(heading()).toBe(title(2));
    vi.advanceTimersByTime(800);
    pointer("pointerdown", 600, "mouse");
    pointer("pointermove", 300, "mouse");
    expect(heading()).toBe(title(2));
  });

  it("leaves the wheel to the text while it has to scroll", async () => {
    await mount();
    $(".mila-story-scroll").classList.add("is-scrollable");
    const event = new WheelEvent("wheel", { deltaY: 120, cancelable: true, bubbles: true });
    $(".mila-text").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(heading()).toBe(title(1));
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
