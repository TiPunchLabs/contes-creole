import type { Bubble, ScreenAnchor } from "./contract";

const EDGE = 12;

/** Speech bubble following a universe-provided screen anchor each frame, kept inside the screen. */
export function createBubble(root: HTMLElement): Bubble & { dispose(): void } {
  const el = document.createElement("div");
  el.className = "app-bubble";
  root.append(el);
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
    raf = requestAnimationFrame(follow);
  };

  const hide = (): void => {
    anchor = null;
    cancelAnimationFrame(raf);
    el.style.opacity = "0";
  };

  return {
    show(text, next) {
      el.textContent = text;
      anchor = next;
      cancelAnimationFrame(raf);
      follow();
    },
    hide,
    dispose() {
      hide();
      el.remove();
    },
  };
}
