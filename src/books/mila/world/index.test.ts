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
});

describe("Mila's world", () => {
  it("has the prototype's twelve pages", () => {
    expect(PAGE_COUNT).toBe(12);
    expect(PAGES[0].title).toBe("Là où la vague s'endort");
    expect(PAGES[11].title).toBe("Ce que Mila rapporta");
    expect(PAGES[4].hint).toBe("Touchez les déchets pour libérer le passage du crabe");
  });

  it("opens on its cover in French, ready to enter, with the way back to the tree", async () => {
    await mount();
    expect($(".mila").lang).toBe("fr");
    expect($(".mila-title").textContent).toBe("Mila et le lambi qui avait perdu son chant");
    expect($<HTMLButtonElement>(".mila-enter").disabled).toBe(false);
    expect($(".mila-loader").classList.contains("is-gone")).toBe(true);
    click(".mila-back");
    expect(exit).toHaveBeenCalledOnce();
  });

  it("reads all twelve pages as text without WebGL, then rereads", async () => {
    await mount();
    expect($(".mila").classList.contains("is-nogl")).toBe(true);
    click(".mila-enter");
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
  });

  it("never shows the crab hint when there is no scene to touch", async () => {
    await mount();
    click(".mila-enter");
    for (let i = 2; i <= 5; i++) click(".mila-next");
    expect($(".mila-num").textContent).toBe("Page 05");
    expect($(".mila-hint").hidden).toBe(true);
  });

  it("toggles sound and motion with their pressed states", async () => {
    await mount();
    click(".mila-enter");
    click(".mila-sound");
    expect($(".mila-sound").getAttribute("aria-pressed")).toBe("false");
    expect($(".mila-sound").getAttribute("aria-label")).toBe("Activer l'ambiance sonore");
    click(".mila-pause");
    expect($(".mila-pause").getAttribute("aria-pressed")).toBe("true");
    expect($(".mila-pause").getAttribute("aria-label")).toBe("Reprendre les mouvements");
  });

  it("goes back to its cover from the last page", async () => {
    await mount();
    click(".mila-enter");
    for (let i = 2; i <= PAGE_COUNT; i++) click(".mila-next");
    click(".mila-tocover");
    await vi.advanceTimersByTimeAsync(10);
    expect($(".mila-cover").classList.contains("is-gone")).toBe(false);
    expect($(".mila-ui").classList.contains("is-on")).toBe(false);
    expect(document.activeElement).toBe($(".mila-enter"));
  });

  it("removes its page and key listener on dispose", async () => {
    await mount();
    click(".mila-enter");
    const removed = vi.spyOn(window, "removeEventListener");
    handle?.dispose();
    handle = null;
    expect(container.querySelector(".mila")).toBeNull();
    expect(removed).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});
