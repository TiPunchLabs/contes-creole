import { createBackdrop } from "./backdrop";
import { createBubble } from "./bubble";
import type {
  BookHandle,
  Bubble,
  BookManifest,
  ImmersiveHandle,
  ImmersiveText,
  LanguageNotes,
  MountTree,
  Stories,
  TreeHandle,
} from "./contract";
import { showFallback } from "./fallback";
import { createLanguagePanel } from "./language-panel/language-panel";
import { readingLangs, storyFor, type ReadingLang } from "./languages";
import { showNotice } from "./notice";
import { bindSwipe, isPhone } from "@shared/gesture";
import { clampPage, createPager } from "@shared/paging";
import { createReadingUI } from "./reading-ui/reading-ui";
import { createFlash } from "./transition";

export const TIMING = {
  dive: 1700,
  rise: 1100,
  fade: 1200,
  cancel: 300,
  retryDelay: 1200,
  mountAttempts: 5,
} as const;
export const LOAD_ERROR = "Kont-la pa ka chajé";
const NEXT_KEYS = ["ArrowRight", "ArrowDown", " ", "PageDown"];
const PREV_KEYS = ["ArrowLeft", "ArrowUp", "PageUp"];
/** Rest after the wheel scrolled a long passage before the wheel may turn the page. */
const WHEEL_REST_MS = 400;

export interface AppDeps {
  mountTree: MountTree;
  books: BookManifest[];
  loadStories(bookId: string): Promise<Stories>;
  /** The book's language notes; null when it has none. */
  loadNotes(bookId: string): Promise<LanguageNotes | null>;
}

type Mode = "tree" | "dive" | "book" | "rise";

/**
 * Settles as `promise`, unless the opening is cancelled first: it then rejects at once and whatever
 * `promise` gives later is ignored. The listener is removed as soon as either happens.
 */
function unlessCancelled<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new Error("opening cancelled"));
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/** Disposes a world whose mount ends after its opening was cancelled; its failure is its own. */
function discardLate(mounting: Promise<{ dispose(): void }> | null): void {
  mounting?.then(
    (late) => {
      try {
        late.dispose();
      } catch (err) {
        console.error("Book dispose failed", err);
      }
    },
    () => undefined,
  );
}

interface OpenBook {
  id: string;
  stories: Stories;
  handle: BookHandle;
}

/** A book with its own reading interface: the shell keeps the way back and the language switch. */
interface OpenImmersive {
  id: string;
  stories: Stories;
  handle: ImmersiveHandle;
}

/** Shell: mounts the tree, runs tree ⇄ book transitions, owns reading UI, language panel and book-mode input. */
export function startApp(root: HTMLElement, deps: AppDeps): { dispose(): void } {
  root.classList.add("app");
  const treeLayer = addLayer("app-tree");
  const bookLayer = addLayer("app-book");
  bookLayer.hidden = true;
  createBackdrop(root);
  /** On a smartphone the pages turn with horizontal swipes; a vertical move only scrolls a text. */
  const phone = isPhone();
  root.toggleAttribute("data-phone", phone);
  const reading = createReadingUI(
    root,
    {
      onPage: (index) => goPage(index),
      onLang: (lang) => setLang(lang),
      onBack: () => void leave(),
      onToggleText: () => toggleText(),
    },
    { swipe: phone },
  );
  const panel = createLanguagePanel(root);
  const bubble = createBubble(root);
  const flash = createFlash(root);
  const pager = createPager();

  let mode: Mode = "tree";
  let tree: TreeHandle | null = null;
  let book: OpenBook | null = null;
  let immersive: OpenImmersive | null = null;
  /** Element focused when a book was entered (shelf or fiche button), focused again on return. */
  let returnFocus: HTMLElement | null = null;
  /** The opening in progress (dive, loading, mount): the first Escape aborts it. */
  let opening: AbortController | null = null;
  let page = 0;
  let lang: ReadingLang = "gcf";
  let textHidden = false;
  let scrolled = false;
  let touchY: number | null = null;
  /** The current swipe has scrolled a long passage: it never turns the page as well. */
  let swipeScrolled = false;
  /** Time the wheel last scrolled a long passage; the page turns only once it has rested. */
  let wheelScrolledAt = -Infinity;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  /** The book's bubble stays silent in "scène seule": its lines come from the hidden text. */
  const bookBubble: Bubble = {
    show: (text, anchor) => {
      if (!textHidden) bubble.show(text, anchor);
    },
    hide: () => bubble.hide(),
  };

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

  /** Loads a book's language notes; a broken file only costs the burger, never the tale. */
  async function loadNotes(bookId: string): Promise<LanguageNotes | null> {
    try {
      return await deps.loadNotes(bookId);
    } catch (err) {
      console.error(`Language notes of "${bookId}" failed to load`, err);
      return null;
    }
  }

  function render(): void {
    const showHint = !immersive && page === 0 && !scrolled;
    reading.render({ page, lang, showHint, textHidden });
  }

  /** What an immersive world shows in the current language: Bileng adds the French underneath. */
  function textFor(stories: Stories): ImmersiveText {
    const gloss = lang === "bi" ? stories.fr : undefined;
    return { story: storyFor(stories, lang), ...(gloss ? { gloss } : {}) };
  }

  /** Removes the open book (if any) and gives the screen back to the tree layer. */
  function closeBook(): void {
    try {
      book?.handle.dispose();
      immersive?.handle.dispose();
    } catch (err) {
      console.error("Book dispose failed", err);
    }
    book = null;
    immersive = null;
    delete root.dataset.immersive;
    textHidden = false;
    delete root.dataset.sceneOnly;
    bubble.hide();
    bubble.setLang("gcf");
    panel.detach();
    reading.close();
    bookLayer.replaceChildren();
    bookLayer.hidden = true;
    delete root.dataset.book;
    treeLayer.hidden = false;
  }

  /** Gives the focus back to the control that opened the book. */
  function restoreFocus(): void {
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  /**
   * Ends an opening that was cancelled or failed: back on the tree at the book's card. A cancelled
   * one covers the screen first and shows no notice; a world still mounting is disposed when it ends.
   */
  async function abandon(
    bookId: string,
    activeTree: TreeHandle,
    cancel: AbortController,
    mounting: Promise<{ dispose(): void }> | null,
    err: unknown,
  ): Promise<void> {
    opening = null;
    const cancelled = cancel.signal.aborted;
    if (cancelled) {
      discardLate(mounting);
      mode = "rise";
      await flash.to(1, TIMING.cancel);
    } else console.error(`Book "${bookId}" failed to open`, err);
    closeBook();
    activeTree.resume(bookId);
    mode = "tree";
    if (cancelled) restoreFocus();
    else showNotice(root, LOAD_ERROR).lang = "gcf";
  }

  /** Dives into a book that brings its own reading interface; the tree comes back on failure. */
  async function enterImmersive(manifest: BookManifest, activeTree: TreeHandle): Promise<void> {
    const load = manifest.immersive;
    if (!load) return;
    mode = "dive";
    bubble.hide();
    const loading = Promise.resolve().then(() =>
      Promise.all([load(), deps.loadStories(manifest.id)]),
    );
    loading.catch(() => undefined);
    const cancel = new AbortController();
    opening = cancel;
    let mounting: Promise<ImmersiveHandle> | null = null;
    try {
      await unlessCancelled(
        Promise.all([
          activeTree.dive(manifest.id),
          flash.to(1, TIMING.dive * 0.45, TIMING.dive * 0.55),
        ]),
        cancel.signal,
      );
      activeTree.pause();
      treeLayer.hidden = true;
      const [world, stories] = await unlessCancelled(loading, cancel.signal);
      if (!readingLangs(stories).includes(lang)) lang = "gcf";
      page = 0;
      root.dataset.book = manifest.id;
      root.dataset.immersive = "";
      bookLayer.hidden = false;
      mounting = Promise.resolve(
        world.default.mount(bookLayer, {
          exit: () => void leave(),
          text: textFor(stories),
        }),
      );
      const handle = await unlessCancelled(mounting, cancel.signal);
      opening = null;
      immersive = { id: manifest.id, stories, handle };
      reading.open(stories, { langsOnly: true });
      render();
      mode = "book";
    } catch (err) {
      await abandon(manifest.id, activeTree, cancel, mounting, err);
    }
    await flash.to(0, TIMING.fade);
  }

  async function enter(bookId: string): Promise<void> {
    const manifest = deps.books.find((b) => b.id === bookId);
    if (mode !== "tree" || !tree || !manifest?.ready) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (manifest.immersive) return enterImmersive(manifest, tree);
    if (!manifest.world) return;
    const activeTree = tree;
    mode = "dive";
    bubble.hide();
    const loading = Promise.resolve().then(() =>
      Promise.all([manifest.world?.(), deps.loadStories(bookId), loadNotes(bookId)]),
    );
    loading.catch(() => undefined);
    const cancel = new AbortController();
    opening = cancel;
    let mounting: Promise<BookHandle> | null = null;
    try {
      await unlessCancelled(
        Promise.all([activeTree.dive(bookId), flash.to(1, TIMING.dive * 0.45, TIMING.dive * 0.55)]),
        cancel.signal,
      );
      activeTree.pause();
      treeLayer.hidden = true;
      const [world, stories, notes] = await unlessCancelled(loading, cancel.signal);
      if (!world) throw new Error(`Book "${bookId}" has no world`);
      if (!readingLangs(stories).includes(lang)) lang = "gcf";
      page = 0;
      scrolled = false;
      pager.reset();
      root.dataset.book = bookId;
      bookLayer.hidden = false;
      const story = storyFor(stories, lang);
      bubble.setLang(story.lang);
      mounting = Promise.resolve(
        world.default.mount(bookLayer, { story, page, bubble: bookBubble }),
      );
      const handle = await unlessCancelled(mounting, cancel.signal);
      opening = null;
      book = { id: bookId, stories, handle };
      reading.open(stories);
      render();
      if (notes) panel.attach(notes, stories.gcf);
      mode = "book";
    } catch (err) {
      await abandon(bookId, activeTree, cancel, mounting, err);
    }
    await flash.to(0, TIMING.fade);
  }

  async function leave(): Promise<void> {
    const bookId = book?.id ?? immersive?.id;
    if (mode !== "book" || !bookId) return;
    mode = "rise";
    bubble.hide();
    await flash.to(1, TIMING.rise);
    closeBook();
    tree?.resume(bookId);
    mode = "tree";
    restoreFocus();
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
    if (mode !== "book" || next === lang) return;
    if (immersive) {
      lang = next;
      immersive.handle.setText(textFor(immersive.stories));
      render();
      return;
    }
    if (!book) return;
    lang = next;
    const story = storyFor(book.stories, lang);
    bubble.setLang(story.lang);
    book.handle.setStory(story);
    render();
  }

  /** "Scène seule" on or off: same book, page and language; the next book opens with its text. */
  function toggleText(): void {
    if (mode !== "book" || !book) return;
    textHidden = !textHidden;
    root.toggleAttribute("data-scene-only", textHidden);
    if (textHidden) bubble.hide();
    book.handle.setCardHidden?.(textHidden);
    render();
  }

  const step = (dy: number): void => {
    const direction = pager.step(dy, Date.now());
    if (direction !== 0) goPage(page + direction);
  };
  /**
   * The reading card under `target` when a vertical move of `dy` can still scroll it (a long passage):
   * the move then scrolls the text, and only turns the page once the text has reached that edge.
   */
  const scrollableCard = (target: EventTarget | null, dy: number): HTMLElement | null => {
    const card = target instanceof Element ? target.closest<HTMLElement>(".reading-card") : null;
    if (!card || card.scrollHeight <= card.clientHeight + 1) return null;
    const room =
      dy > 0 ? card.scrollHeight - card.clientHeight - card.scrollTop > 1 : card.scrollTop > 1;
    return room ? card : null;
  };
  const onWheel = (e: WheelEvent): void => {
    if (mode !== "book" || !book || panel.isOpen) return;
    if (scrollableCard(e.target, e.deltaY)) {
      wheelScrolledAt = e.timeStamp;
      return;
    }
    e.preventDefault();
    // The wheel that just brought a passage to its end rests before it may turn the page.
    if (e.timeStamp - wheelScrolledAt < WHEEL_REST_MS) return;
    step(e.deltaY);
  };
  const onPointerDown = (e: PointerEvent): void => {
    touchY = e.pointerType === "mouse" || phone ? null : e.clientY;
    swipeScrolled = false;
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (mode !== "book" || !book || touchY === null || panel.isOpen) return;
    const dy = touchY - e.clientY;
    touchY = e.clientY;
    // The app takes every touch (touch-action: none), so a long passage is scrolled by hand.
    const card = scrollableCard(e.target, dy);
    if (card) {
      card.scrollTop += dy;
      swipeScrolled = true;
    } else if (!swipeScrolled) step(dy * 2.2);
  };
  const onPointerUp = (): void => {
    touchY = null;
  };
  const onKey = (e: KeyboardEvent): void => {
    // A book still opening (dive, loading, mount) is cancelled by the first Escape.
    if (mode === "dive" && e.key === "Escape") opening?.abort();
    if (mode !== "book") return;
    if (immersive) {
      if (e.key === "Escape") void leave();
      return;
    }
    if (panel.isOpen) {
      if (e.key === "Escape") panel.close();
      return;
    }
    // Space activates a focused button (text toggle, page buttons) instead of turning the page.
    if (e.key === " " && e.target instanceof HTMLButtonElement) return;
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
  const unbindSwipe = phone
    ? bindSwipe(root, {
        ignore: (target) =>
          mode !== "book" ||
          !book ||
          panel.isOpen ||
          (target instanceof Element && target.closest("button, a") !== null),
        onSwipe: (direction) => goPage(page + direction),
        // Where the card does not scroll by itself (no native pan), the finger scrolls it.
        onVertical: (dy, e) => {
          const card = scrollableCard(e.target, dy);
          if (card) card.scrollTop += dy;
        },
      })
    : null;
  mountTree(1);

  return {
    dispose() {
      clearTimeout(retryTimer);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKey);
      unbindSwipe?.();
      book?.handle.dispose();
      immersive?.handle.dispose();
      tree?.dispose();
      bubble.dispose();
      panel.dispose();
      root.replaceChildren();
    },
  };
}
