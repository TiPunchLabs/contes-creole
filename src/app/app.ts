import { createBackdrop } from "./backdrop";
import { createBubble } from "./bubble";
import type { BookHandle, BookManifest, MountTree, Stories, TreeHandle } from "./contract";
import { showFallback } from "./fallback";
import { readingLangs, storyFor, type ReadingLang } from "./languages";
import { showNotice } from "./notice";
import { clampPage, createPager } from "./paging";
import { createReadingUI } from "./reading-ui/reading-ui";
import { createFlash } from "./transition";

export const TIMING = {
  dive: 1700,
  rise: 1100,
  fade: 1200,
  retryDelay: 1200,
  mountAttempts: 5,
} as const;
export const LOAD_ERROR = "Kont-la pa ka chajé";
const NEXT_KEYS = ["ArrowRight", "ArrowDown", " ", "PageDown"];
const PREV_KEYS = ["ArrowLeft", "ArrowUp", "PageUp"];

export interface AppDeps {
  mountTree: MountTree;
  books: BookManifest[];
  loadStories(bookId: string): Promise<Stories>;
}

type Mode = "tree" | "dive" | "book" | "rise";

interface OpenBook {
  id: string;
  stories: Stories;
  handle: BookHandle;
}

/** Shell: mounts the tree, runs tree ⇄ book transitions, owns reading UI and book-mode input. */
export function startApp(root: HTMLElement, deps: AppDeps): { dispose(): void } {
  root.classList.add("app");
  const treeLayer = addLayer("app-tree");
  const bookLayer = addLayer("app-book");
  bookLayer.hidden = true;
  createBackdrop(root);
  const reading = createReadingUI(root, {
    onPage: (index) => goPage(index),
    onLang: (lang) => setLang(lang),
    onBack: () => void leave(),
  });
  const bubble = createBubble(root);
  const flash = createFlash(root);
  const pager = createPager();

  let mode: Mode = "tree";
  let tree: TreeHandle | null = null;
  let book: OpenBook | null = null;
  let page = 0;
  let lang: ReadingLang = "gcf";
  let scrolled = false;
  let touchY: number | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  /** Adds a full-screen universe container. */
  function addLayer(className: string): HTMLDivElement {
    const el = document.createElement("div");
    el.className = `app-layer ${className}`;
    root.append(el);
    return el;
  }

  /** Mounts the tree, retrying while WebGL is unavailable (v13: 5 attempts, 1.2 s apart). */
  function mountTree(attempt: number): void {
    try {
      tree = deps.mountTree(treeLayer, {
        books: deps.books,
        bubble,
        onEnter: (id) => void enter(id),
      });
    } catch (err) {
      console.warn(`WebGL unavailable, attempt ${attempt}`, err);
      treeLayer.replaceChildren();
      if (attempt < TIMING.mountAttempts) {
        retryTimer = setTimeout(() => mountTree(attempt + 1), TIMING.retryDelay);
      } else {
        showFallback(root);
      }
    }
  }

  function render(): void {
    reading.render({ page, lang, showHint: page === 0 && !scrolled });
  }

  /** Removes the open book (if any) and gives the screen back to the tree layer. */
  function closeBook(): void {
    book?.handle.dispose();
    book = null;
    bubble.hide();
    reading.close();
    bookLayer.replaceChildren();
    bookLayer.hidden = true;
    delete root.dataset.book;
    treeLayer.hidden = false;
  }

  async function enter(bookId: string): Promise<void> {
    const manifest = deps.books.find((b) => b.id === bookId);
    if (mode !== "tree" || !tree || !manifest?.ready || !manifest.world) return;
    const activeTree = tree;
    mode = "dive";
    bubble.hide();
    const loading = Promise.all([manifest.world(), deps.loadStories(bookId)]);
    loading.catch(() => undefined);
    await Promise.all([
      activeTree.dive(bookId),
      flash.to(1, TIMING.dive * 0.45, TIMING.dive * 0.55),
    ]);
    activeTree.pause();
    treeLayer.hidden = true;
    try {
      const [world, stories] = await loading;
      if (!readingLangs(stories).includes(lang)) lang = "gcf";
      page = 0;
      scrolled = false;
      pager.reset();
      root.dataset.book = bookId;
      bookLayer.hidden = false;
      const handle = await world.default.mount(bookLayer, {
        story: storyFor(stories, lang),
        page,
        bubble,
      });
      book = { id: bookId, stories, handle };
      reading.open(stories);
      render();
      mode = "book";
    } catch (err) {
      console.error(`Book "${bookId}" failed to open`, err);
      closeBook();
      activeTree.resume(bookId);
      mode = "tree";
      showNotice(root, LOAD_ERROR);
    }
    await flash.to(0, TIMING.fade);
  }

  async function leave(): Promise<void> {
    if (mode !== "book" || !book) return;
    const bookId = book.id;
    mode = "rise";
    bubble.hide();
    await flash.to(1, TIMING.rise);
    closeBook();
    tree?.resume(bookId);
    mode = "tree";
    await flash.to(0, TIMING.fade);
  }

  function goPage(index: number): void {
    if (mode !== "book" || !book) return;
    const next = clampPage(index, book.stories.gcf.pages.length);
    if (next === page) return;
    page = next;
    scrolled = true;
    bubble.hide();
    book.handle.setPage(page);
    render();
  }

  function setLang(next: ReadingLang): void {
    if (mode !== "book" || !book || next === lang) return;
    lang = next;
    book.handle.setStory(storyFor(book.stories, lang));
    render();
  }

  const step = (dy: number): void => {
    const direction = pager.step(dy, Date.now());
    if (direction !== 0) goPage(page + direction);
  };
  const onWheel = (e: WheelEvent): void => {
    if (mode !== "book") return;
    e.preventDefault();
    step(e.deltaY);
  };
  const onPointerDown = (e: PointerEvent): void => {
    touchY = e.pointerType === "mouse" ? null : e.clientY;
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (mode !== "book" || touchY === null) return;
    const dy = touchY - e.clientY;
    touchY = e.clientY;
    step(dy * 2.2);
  };
  const onPointerUp = (): void => {
    touchY = null;
  };
  const onKey = (e: KeyboardEvent): void => {
    if (mode !== "book") return;
    if (NEXT_KEYS.includes(e.key)) {
      e.preventDefault();
      goPage(page + 1);
    } else if (PREV_KEYS.includes(e.key)) {
      e.preventDefault();
      goPage(page - 1);
    } else if (e.key === "Escape") {
      void leave();
    }
  };

  root.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKey);
  mountTree(1);

  return {
    dispose() {
      clearTimeout(retryTimer);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKey);
      book?.handle.dispose();
      tree?.dispose();
      bubble.dispose();
      root.replaceChildren();
    },
  };
}
