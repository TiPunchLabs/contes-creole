import type { Bubble, Lang, ScreenAnchor } from "./contract";

const EDGE = 12;

/**
 * Speech bubble following a universe-provided screen anchor each frame, kept inside the screen. Its
 * lang is set by the shell (tree lines open in Kréyòl; a book speaks the language of the story shown)
 * and applies from the next line, so a line already on screen keeps its own. The bubble is inert
 * while hidden or off screen, so an action button in it can be neither focused nor pressed then.
 */
export function createBubble(
  root: HTMLElement,
): Bubble & { setLang(lang: Lang): void; dispose(): void } {
  const el = document.createElement("div");
  el.className = "app-bubble";
  el.inert = true;
  root.append(el);
  let lang: Lang = "gcf";
  let anchor: (() => ScreenAnchor) | null = null;
  let raf = 0;

  const follow = (): void => {
    if (!anchor) return;
    const a = anchor();
    if (a.visible) {
      const half = el.offsetWidth / 2;
      const max = root.clientWidth - half - EDGE;
      el.style.left = `${Math.max(half + EDGE, Math.min(max, a.x))}px`;
      el.style.top = `${a.y - 12}px`;
      el.style.opacity = "1";
    } else {
      el.style.opacity = "0";
    }
    el.inert = !a.visible;
    raf = requestAnimationFrame(follow);
  };

  const hide = (): void => {
    anchor = null;
    cancelAnimationFrame(raf);
    el.style.opacity = "0";
    el.inert = true;
  };

  return {
    show(text, next, action) {
      el.lang = lang;
      if (typeof text === "string") el.textContent = text;
      else {
        el.replaceChildren(
          ...text.map((segment) => {
            const span = document.createElement("span");
            span.lang = segment.lang;
            span.textContent = segment.text;
            return span;
          }),
        );
      }
      if (action) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "app-bubble-action";
        button.lang = action.lang;
        button.textContent = action.text;
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          action.run();
        });
        el.append(button);
      }
      anchor = next;
      cancelAnimationFrame(raf);
      follow();
    },
    hide,
    setLang(next) {
      lang = next;
    },
    dispose() {
      hide();
      el.remove();
    },
  };
}
