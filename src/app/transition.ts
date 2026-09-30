export interface Flash {
  /** Animates the dive flash linearly; resolves once the animation has ended. */
  to(opacity: number, durationMs: number, delayMs?: number): Promise<void>;
}

/** Full-screen flash covering universe swaps (v13 "éclair de plongée"). */
export function createFlash(root: HTMLElement): Flash {
  const el = document.createElement("div");
  el.className = "app-flash";
  root.append(el);
  return {
    to(opacity, durationMs, delayMs = 0) {
      el.style.transition = `opacity ${durationMs}ms linear ${delayMs}ms`;
      el.style.opacity = String(opacity);
      return new Promise((resolve) => setTimeout(resolve, delayMs + durationMs));
    },
  };
}
