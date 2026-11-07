import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/400-italic.css";
import "@fontsource/karla/400.css";
import "@fontsource/karla/600.css";
import "./mila.css";
import { defineImmersive, type ImmersiveText, type StoryPage } from "@app/contract";
import { createPager } from "@shared/paging";
import { createAmbience } from "./audio";
import { createMilaScene, type MilaScene } from "./scene";
import { CRAB_HINT, CRAB_PAGE, PAGE_COUNT } from "./text";

/** The shell's page arrow (reading UI): down for the next page, turned up for the previous one. */
const ICON_ARROW = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M8 2v12M3 9l5 5 5-5"/></svg>`;
const ICON_SOUND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>`;
const ICON_PLAY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>`;
/** The shell's back arrow (reading UI), so the way back to the tree reads the same in every book. */
const ICON_BACK = `<svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M7 1 2 6l5 5M2 6h17"/></svg>`;

/** The prototype's page, with classes instead of global ids and the shell's way back added. */
const TEMPLATE = `
  <canvas class="mila-gl" aria-hidden="true" tabindex="-1"></canvas>
  <button type="button" class="mila-back" lang="gcf" aria-label="Pyébwa a Konesans">${ICON_BACK}<span>Pyébwa a Konesans</span></button>
  <h1 class="mila-title">Mila <span>et le lambi qui avait perdu son chant</span></h1>
  <article class="mila-story" aria-live="polite">
    <div class="mila-voile"></div>
    <div class="mila-story-scroll">
      <p class="mila-num" lang="fr"></p>
      <h2 class="mila-heading"></h2>
      <div class="mila-text"></div>
      <div class="mila-gloss" lang="fr" hidden></div>
      <p class="mila-hint" lang="fr" hidden></p>
      <div class="mila-end" lang="fr" hidden>
        <button class="mila-btn is-main mila-reread" type="button">Relire le conte</button>
      </div>
    </div>
  </article>
  <nav class="mila-ui" aria-label="Lecture du conte">
    <div class="mila-tools">
      <button class="mila-btn is-icon mila-sound" type="button" aria-pressed="true" aria-label="Couper l'ambiance sonore" title="Ambiance sonore">${ICON_SOUND}</button>
      <button class="mila-btn is-icon mila-pause" type="button" aria-pressed="false" aria-label="Mettre les mouvements en pause" title="Mouvements">${ICON_PAUSE}</button>
    </div>
    <div class="mila-nav">
      <button class="mila-btn is-icon mila-prev" type="button" aria-label="Page précédente">${ICON_ARROW}</button>
      <span class="mila-count"></span>
      <button class="mila-btn is-icon is-main mila-next" type="button" aria-label="Page suivante">${ICON_ARROW}</button>
    </div>
  </nav>
  <div class="mila-loader" role="status">Le monde se dessine…</div>`;

/** Fonts page 1 needs before it is revealed; never waits longer than `FONT_WAIT_MS`. */
const FONTS = [
  "600 italic 1em 'Cormorant Garamond'",
  "400 1em 'Spectral'",
  "400 1em 'Karla'",
  "600 1em 'Karla'",
];
const FONT_WAIT_MS = 1500;
/** The shell's page keys (Ti Kannot): the same keys turn the page in every book. */
const NEXT_KEYS = ["ArrowRight", "ArrowDown", " ", "PageDown"];
const PREV_KEYS = ["ArrowLeft", "ArrowUp", "PageUp"];
/** The shell's swipe gain: a finger's travel counts more than a wheel notch. */
const SWIPE_GAIN = 2.2;

const pad = (n: number): string => String(n).padStart(2, "0");

/** One paragraph per block; block HTML is already escaped by the shell's story parser. */
const paragraphs = (page: StoryPage): string => page.blocks.map((b) => `<p>${b.html}</p>`).join("");

/** Checks that each language has the scene's twelve pages. */
function checkPages(text: ImmersiveText): void {
  for (const story of [text.story, text.gloss]) {
    if (story && story.pages.length !== PAGE_COUNT) {
      throw new Error(
        `Mila: story/${story.lang}.md has ${story.pages.length} pages, not ${PAGE_COUNT}`,
      );
    }
  }
}

/** Resolves once the reading fonts are loaded (or failed); at once without the Font Loading API. */
function fontsLoaded(): Promise<unknown> {
  if (!("fonts" in document)) return Promise.resolve();
  return Promise.all(FONTS.map((f) => document.fonts.load(f))).catch(() => undefined);
}

/** Mila and the conch that lost its song: the prototype's night world, with its own reading UI. */
export default defineImmersive({
  async mount(container, ctx) {
    checkPages(ctx.text);
    const root = document.createElement("div");
    root.className = "mila";
    root.lang = "fr";
    root.innerHTML = TEMPLATE;
    container.append(root);
    const part = <T extends HTMLElement>(selector: string): T => {
      const found = root.querySelector<T>(selector);
      if (!found) throw new Error(`Mila: missing ${selector}`);
      return found;
    };
    const canvas = part<HTMLCanvasElement>(".mila-gl");
    const story = part(".mila-story");
    const scroll = part(".mila-story-scroll");
    const num = part(".mila-num");
    const heading = part(".mila-heading");
    const body = part(".mila-text");
    const gloss = part(".mila-gloss");
    const hint = part(".mila-hint");
    const end = part(".mila-end");
    const reread = part<HTMLButtonElement>(".mila-reread");
    const ui = part(".mila-ui");
    const prev = part<HTMLButtonElement>(".mila-prev");
    const next = part<HTMLButtonElement>(".mila-next");
    const count = part(".mila-count");
    const sound = part<HTMLButtonElement>(".mila-sound");
    const pause = part<HTMLButtonElement>(".mila-pause");
    const loader = part(".mila-loader");

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number): void => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const audio = createAmbience();
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small =
      Math.min(innerWidth, innerHeight) < 700 || /Mobi|Android/i.test(navigator.userAgent);
    let scene: MilaScene | null = null;
    /** Text-only reading (no WebGL): the page shown. */
    let textPage = 0;
    let freed = false;
    /** The page control used last; it gets the focus back once a transition ends. */
    let lastControl: HTMLButtonElement | null = null;

    const page = (): number => (scene ? scene.page : textPage);
    const moving = (): boolean => scene?.moving ?? false;

    let text = ctx.text;
    hint.textContent = CRAB_HINT;

    /** Fills the text block with page `i` in the current language. */
    function renderText(i: number): void {
      const p = text.story.pages[i - 1];
      const french = text.gloss?.pages[i - 1];
      story.lang = text.story.lang;
      num.textContent = `Page ${pad(i)}`;
      heading.textContent = p.title;
      body.innerHTML = paragraphs(p);
      gloss.hidden = !french;
      gloss.innerHTML = french ? paragraphs(french) : "";
      hint.hidden = !(i === CRAB_PAGE && !freed && scene);
      end.hidden = i !== PAGE_COUNT;
      scroll.scrollTop = 0;
      syncScrollable();
    }
    function showText(i: number): void {
      story.classList.add("is-on");
      renderText(i);
    }
    /** The text takes the pointer only when it overflows and must scroll. */
    function syncScrollable(): void {
      scroll.classList.toggle("is-scrollable", scroll.scrollHeight > scroll.clientHeight + 1);
    }
    const hideText = (): void => story.classList.remove("is-on");
    function updateCount(): void {
      count.textContent = `${Math.max(page(), 1)} / ${PAGE_COUNT}`;
      prev.disabled = page() <= 1 || moving();
      next.disabled = page() >= PAGE_COUNT || moving();
    }
    /** Gives the focus back to the page controls when a button disabled during the move dropped it. */
    function restoreFocus(): void {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      const target =
        lastControl && !lastControl.disabled ? lastControl : page() >= PAGE_COUNT ? reread : next;
      target.focus({ preventScroll: true });
    }
    function go(to: number): void {
      if (scene) {
        scene.go(to);
        updateCount();
        return;
      }
      if (to < 1 || to > PAGE_COUNT) return;
      textPage = to;
      showText(to);
      updateCount();
    }
    function resetCrab(): void {
      freed = false;
      scene?.resetCrab();
    }

    const hooks = {
      audio,
      reduceMotion,
      small,
      later,
      onLeave() {
        hideText();
        updateCount();
        if (reduceMotion) {
          canvas.classList.remove("is-cut");
          void canvas.offsetWidth;
          canvas.classList.add("is-cut");
        }
      },
      onArrive(to: number) {
        if (to >= 1) showText(to);
        updateCount();
        if (to >= 1) restoreFocus();
      },
      onFreed() {
        freed = true;
        hint.hidden = true;
      },
    };

    await Promise.race([
      fontsLoaded(),
      new Promise((resolve) => later(() => resolve(null), FONT_WAIT_MS)),
    ]);
    try {
      scene = createMilaScene(root, canvas, hooks);
    } catch (err) {
      console.warn("Mila: WebGL unavailable, the tale is read as text", err);
      root.classList.add("is-nogl");
    }
    loader.classList.add("is-gone");

    /** Lets a sound the browser held back play from the reader's first gesture in the tale. */
    const onGesture = (): void => {
      audio.resume();
      if (audio.waiting) return;
      root.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture, true);
    };
    const onPrev = (): void => {
      lastControl = prev;
      go(page() - 1);
    };
    const onNext = (): void => {
      lastControl = next;
      go(page() + 1);
    };
    const onReread = (): void => {
      lastControl = next;
      resetCrab();
      go(1);
    };
    const onSound = (): void => {
      const on = audio.toggle();
      sound.setAttribute("aria-pressed", String(on));
      sound.setAttribute(
        "aria-label",
        on ? "Couper l'ambiance sonore" : "Activer l'ambiance sonore",
      );
      sound.classList.toggle("is-off", !on);
    };
    let paused = false;
    const onPause = (): void => {
      paused = !paused;
      scene?.setMotion(!paused);
      pause.setAttribute("aria-pressed", String(paused));
      pause.setAttribute(
        "aria-label",
        paused ? "Reprendre les mouvements" : "Mettre les mouvements en pause",
      );
      pause.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
      root.classList.toggle("is-paused", paused);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (page() === 0) return;
      // Space activates a focused button (sound, pause, page buttons) instead of turning the page.
      if (e.key === " " && e.target instanceof HTMLButtonElement) return;
      if (NEXT_KEYS.includes(e.key)) {
        e.preventDefault();
        go(page() + 1);
      } else if (PREV_KEYS.includes(e.key)) {
        e.preventDefault();
        go(page() - 1);
      }
    };
    /** True when the gesture starts on the tale's text while it overflows: the text scrolls instead. */
    const onScrollingText = (target: EventTarget | null): boolean =>
      scroll.classList.contains("is-scrollable") &&
      target instanceof Node &&
      scroll.contains(target);
    const pager = createPager();
    let touchY: number | null = null;
    const step = (dy: number): void => {
      if (page() === 0) return;
      const direction = pager.step(dy, Date.now());
      if (direction !== 0) go(page() + direction);
    };
    const onWheel = (e: WheelEvent): void => {
      if (onScrollingText(e.target)) return;
      e.preventDefault();
      step(e.deltaY);
    };
    const onPointerDown = (e: PointerEvent): void => {
      touchY = e.pointerType === "mouse" || onScrollingText(e.target) ? null : e.clientY;
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (touchY === null) return;
      const dy = touchY - e.clientY;
      touchY = e.clientY;
      step(dy * SWIPE_GAIN);
    };
    const onPointerEnd = (): void => {
      touchY = null;
    };
    const onBack = (): void => ctx.exit();
    const back = part<HTMLButtonElement>(".mila-back");

    prev.addEventListener("click", onPrev);
    next.addEventListener("click", onNext);
    reread.addEventListener("click", onReread);
    sound.addEventListener("click", onSound);
    pause.addEventListener("click", onPause);
    back.addEventListener("click", onBack);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", syncScrollable);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerEnd);
    root.addEventListener("pointercancel", onPointerEnd);

    // The tale opens straight on page 1: the tree's dive is its only way in.
    audio.start();
    if (audio.waiting) {
      root.addEventListener("pointerdown", onGesture);
      window.addEventListener("keydown", onGesture, true);
    }
    ui.classList.add("is-on");
    lastControl = next;
    if (scene) scene.show(1);
    else go(1);
    updateCount();
    // The tree's button that opened the book is hidden now: page 1's controls take the focus.
    const opener = document.activeElement;
    if (opener instanceof HTMLElement && !root.contains(opener)) opener.blur();
    restoreFocus();

    return {
      setText(next) {
        checkPages(next);
        text = next;
        // Mid-flight the text is hidden: the next page arrives in the new language.
        if (story.classList.contains("is-on")) renderText(Math.max(page(), 1));
      },
      dispose() {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keydown", onGesture, true);
        window.removeEventListener("resize", syncScrollable);
        timers.forEach(clearTimeout);
        timers.clear();
        scene?.dispose();
        scene = null;
        audio.dispose();
        root.remove();
      },
    };
  },
});
