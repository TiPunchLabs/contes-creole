// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOAD_ERROR, TIMING, startApp, type AppDeps } from "./app";
import type {
  BookHandle,
  BookManifest,
  BookWorld,
  Stories,
  TreeContext,
  TreeHandle,
} from "./contract";
import { parseNotes } from "./language/parse";
import { parseStory } from "./story/parse";

const story = (lang: "gcf" | "fr", titles: string[]): string =>
  `---\nlang: ${lang}\ntitle: Liv\n---\n\n` +
  titles.map((t, i) => `## ${t} {#p${i}}\n\n<!-- label: L${i} -->\n\n${t} tèks.\n`).join("\n");

const STORIES: Stories = {
  gcf: parseStory(story("gcf", ["Paj en", "Paj dé", "Paj twa"]), "gcf.md"),
  fr: parseStory(story("fr", ["Page un", "Page deux", "Page trois"]), "fr.md"),
};
const NOTES = parseNotes(
  "---\nlang: fr\ntitle: Lang kréyòl\n---\n\n## Not {#not}\n\nRézimé.\n\n> Paj dé tèks. {p1}\n> Page deux.\n",
  "langue/fr.md",
);
const OPEN_MS = TIMING.dive + TIMING.fade + 100;
const CLOSE_MS = TIMING.rise + TIMING.fade + 100;

let root: HTMLElement;
let apps: { dispose(): void }[] = [];
let tree: { [K in keyof TreeHandle]: ReturnType<typeof vi.fn> };
let treeCtx: TreeContext;
let handle: { [K in keyof BookHandle]: ReturnType<typeof vi.fn> };
let world: BookWorld & { mount: ReturnType<typeof vi.fn> };

const manifest = (id: string, order: number, ready: boolean): BookManifest => ({
  id,
  order,
  ready,
  card: { title: id, sub: "", theme: "" },
  ...(ready ? { cover: () => undefined, world: async () => ({ default: world }) } : {}),
});

/** Starts the app with fakes; `overrides` replaces any dependency. */
function start(overrides: Partial<AppDeps> = {}): void {
  apps.push(
    startApp(root, {
      mountTree: (_container, ctx) => {
        treeCtx = ctx;
        return tree as unknown as TreeHandle;
      },
      books: [manifest("liv", 1, true), manifest("lock", 2, false)],
      loadStories: vi.fn(async () => STORIES),
      loadNotes: vi.fn(async () => null),
      ...overrides,
    }),
  );
}

const $ = (sel: string): HTMLElement | null => root.querySelector<HTMLElement>(sel);
const key = (k: string): void => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.querySelector<HTMLElement>("#app") as HTMLElement;
  tree = { dive: vi.fn(async () => undefined), pause: vi.fn(), resume: vi.fn(), dispose: vi.fn() };
  handle = { setPage: vi.fn(), setStory: vi.fn(), dispose: vi.fn() };
  world = { mount: vi.fn(() => handle as unknown as BookHandle) };
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  apps.forEach((app) => app.dispose());
  apps = [];
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("app", () => {
  it("enters a ready book: dives, pauses the tree, mounts the world, shows page 1", async () => {
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.dive).toHaveBeenCalledWith("liv");
    expect(tree.pause).toHaveBeenCalledOnce();
    expect(world.mount).toHaveBeenCalledOnce();
    expect(world.mount.mock.calls[0][1]).toMatchObject({ page: 0, story: { lang: "gcf" } });
    expect(root.dataset.book).toBe("liv");
    expect($(".app-tree")?.hidden).toBe(true);
    expect($(".reading")?.hidden).toBe(false);
    expect($(".reading-title")?.textContent).toBe("Paj en");
  });

  it("ignores locked books, repeated entries and Escape during the dive", async () => {
    start();
    treeCtx.onEnter("lock");
    treeCtx.onEnter("liv");
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(500);
    key("Escape");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.dive).toHaveBeenCalledOnce();
    expect(tree.dive).toHaveBeenCalledWith("liv");
    expect(handle.dispose).not.toHaveBeenCalled();
  });

  it("pages with keys and wheel, clamped, one turn per gesture", async () => {
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    key("ArrowLeft");
    expect(handle.setPage).not.toHaveBeenCalled();
    key("ArrowRight");
    expect(handle.setPage).toHaveBeenLastCalledWith(1);
    expect($(".reading-title")?.textContent).toBe("Paj dé");
    root.dispatchEvent(new WheelEvent("wheel", { deltaY: 30, cancelable: true }));
    root.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, cancelable: true }));
    expect(handle.setPage).toHaveBeenLastCalledWith(2);
    root.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, cancelable: true }));
    expect(handle.setPage).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(800);
    key("ArrowDown");
    expect(handle.setPage).toHaveBeenCalledTimes(2);
  });

  it("switches language: Bileng keeps Kréyòl in the world and adds French underneath", async () => {
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    $('.reading-langs [data-lang="bi"]')?.click();
    expect(handle.setStory).toHaveBeenLastCalledWith(STORIES.gcf);
    expect($(".reading-gloss")?.textContent).toContain("Page un tèks.");
    $('.reading-langs [data-lang="fr"]')?.click();
    expect(handle.setStory).toHaveBeenLastCalledWith(STORIES.fr);
    expect($(".reading-title")?.textContent).toBe("Page un");
  });

  it("rises back to the tree at the book's card on Escape", async () => {
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect(handle.dispose).toHaveBeenCalledOnce();
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect(root.dataset.book).toBeUndefined();
    expect($(".app-tree")?.hidden).toBe(false);
    expect($(".reading")?.hidden).toBe(true);
  });

  it("returns to the tree with a notice when a book fails to load, and can retry", async () => {
    const loadStories = vi.fn().mockRejectedValueOnce(new Error("404")).mockResolvedValue(STORIES);
    start({ loadStories });
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect(world.mount).not.toHaveBeenCalled();
    expect(root.dataset.book).toBeUndefined();
    expect($(".app-notice")?.textContent).toBe(LOAD_ERROR);
    await vi.advanceTimersByTimeAsync(4000);
    expect($(".app-notice")).toBeNull();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(root.dataset.book).toBe("liv");
  });

  it("cleans up when the world throws while mounting", async () => {
    world.mount.mockImplementationOnce(() => {
      throw new Error("mount failed");
    });
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect($(".app-book")?.childElementCount).toBe(0);
    expect($(".app-notice")?.textContent).toBe(LOAD_ERROR);
  });

  it("falls back to Kréyòl when the next book has no translation", async () => {
    const solo: Stories = { gcf: STORIES.gcf };
    const loadStories = vi.fn(async (id: string) => (id === "solo" ? solo : STORIES));
    start({ loadStories, books: [manifest("liv", 1, true), manifest("solo", 2, true)] });
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    $('.reading-langs [data-lang="fr"]')?.click();
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    treeCtx.onEnter("solo");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(world.mount.mock.calls[1][1]).toMatchObject({ story: { lang: "gcf" } });
    expect(root.querySelectorAll(".reading-langs button")).toHaveLength(1);
  });

  it("retries the tree mount 5 times, 1.2 s apart, then shows the fallback", async () => {
    const mountTree = vi.fn(() => {
      throw new Error("no WebGL");
    });
    start({ mountTree });
    await vi.advanceTimersByTimeAsync(TIMING.retryDelay * 5);
    expect(mountTree).toHaveBeenCalledTimes(5);
    expect($(".app-fallback")?.textContent).toContain("Pyébwa-la pa ka limé…");
  });

  it("recovers when loadStories throws synchronously", async () => {
    start({
      loadStories: () => {
        throw new Error("sync");
      },
    });
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect($(".app-notice")?.textContent).toBe(LOAD_ERROR);
    expect($(".app-flash")?.style.opacity).toBe("0");
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.dive).toHaveBeenCalledTimes(2);
  });

  it("recovers when the tree dive rejects", async () => {
    tree.dive.mockRejectedValueOnce(new Error("dive"));
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect($(".app-notice")?.textContent).toBe(LOAD_ERROR);
    expect($(".app-flash")?.style.opacity).toBe("0");
    expect($(".app-tree")?.hidden).toBe(false);
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(root.dataset.book).toBe("liv");
  });

  it("finishes leaving when the book dispose throws", async () => {
    handle.dispose.mockImplementationOnce(() => {
      throw new Error("dispose");
    });
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect(root.dataset.book).toBeUndefined();
    expect($(".app-tree")?.hidden).toBe(false);
    expect($(".app-flash")?.style.opacity).toBe("0");
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(root.dataset.book).toBe("liv");
  });
});

describe("app language panel", () => {
  const openBook = async (overrides: Partial<AppDeps> = {}): Promise<void> => {
    start({ loadNotes: vi.fn(async () => NOTES), ...overrides });
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
  };

  it("shows the burger only inside a book that has notes", async () => {
    start({ loadNotes: vi.fn(async () => NOTES) });
    expect($(".lang-burger")?.hidden).toBe(true);
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect($(".lang-burger")?.hidden).toBe(false);
  });

  it("shows no burger for a book without notes", async () => {
    await openBook({ loadNotes: vi.fn(async () => null) });
    expect(root.dataset.book).toBe("liv");
    expect($(".lang-burger")?.hidden).toBe(true);
  });

  it("opens the book without a burger when its notes fail to load", async () => {
    await openBook({ loadNotes: vi.fn().mockRejectedValue(new Error("bad notes")) });
    expect(root.dataset.book).toBe("liv");
    expect($(".app-notice")).toBeNull();
    expect($(".lang-burger")?.hidden).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it("leaves the tale untouched while open: no paging from keys, wheel or swipe", async () => {
    await openBook();
    $(".lang-burger")?.click();
    key("ArrowRight");
    key(" ");
    key("PageDown");
    const wheel = new WheelEvent("wheel", { deltaY: 120, cancelable: true });
    root.dispatchEvent(wheel);
    root.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", clientY: 400 }));
    root.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientY: 100 }));
    root.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch" }));
    expect(wheel.defaultPrevented).toBe(false);
    expect(handle.setPage).not.toHaveBeenCalled();
    expect($(".reading-title")?.textContent).toBe("Paj en");
  });

  it("closes only the panel on Escape; a second Escape leaves the book", async () => {
    await openBook();
    $(".lang-burger")?.click();
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect($(".lang-panel")?.hidden).toBe(true);
    expect(handle.dispose).not.toHaveBeenCalled();
    expect(root.dataset.book).toBe("liv");
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect(handle.dispose).toHaveBeenCalledOnce();
  });

  it("pages again once the panel is closed, from the same page", async () => {
    await openBook();
    $(".lang-burger")?.click();
    $(".lang-close")?.click();
    key("ArrowRight");
    expect(handle.setPage).toHaveBeenLastCalledWith(1);
    expect($(".reading-title")?.textContent).toBe("Paj dé");
  });

  it("closes the panel and hides the burger when the book closes", async () => {
    await openBook();
    $(".lang-burger")?.click();
    $(".reading-back")?.click();
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect(root.dataset.book).toBeUndefined();
    expect($(".lang-panel")?.hidden).toBe(true);
    expect($(".lang-burger")?.hidden).toBe(true);
  });
});
