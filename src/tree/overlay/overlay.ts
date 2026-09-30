import type { BookManifest } from "@app/contract";

export interface CardLabel {
  x: number;
  y: number;
  opacity: number;
  book: BookManifest;
}

const MOUSE = `<svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="#7af0dc" stroke-width="1.5" aria-hidden="true"><rect x="1" y="1" width="16" height="24" rx="8"/><circle cx="9" cy="8" r="1.6" fill="#7af0dc"/></svg>`;

/** Tree HUD: title, intro (fades as you climb), label of the nearest card, climb bar. */
export function createTreeOverlay(
  container: HTMLElement,
  onEnter: (bookId: string) => void,
): { update(t: number, label: CardLabel | null): void; dispose(): void } {
  const el = document.createElement("div");
  el.className = "tree-overlay";
  el.innerHTML = `
    <div class="tree-brand">
      <div class="tree-brand-title">Pyébwa a Sav</div>
      <div class="tree-brand-sub">Kont Gwadloup</div>
    </div>
    <div class="tree-intro"><div class="tree-intro-inner">
      <p class="tree-intro-title">Chak fèy sé on kont.</p>
      <p class="tree-intro-text">Chaque feuille est un conte. Grimpez dans l'arbre pour trouver le vôtre.</p>
      <div class="tree-intro-hint"><span>Défilez · Glisez</span>${MOUSE}</div>
    </div></div>
    <div class="tree-label">
      <div class="tree-label-title"></div>
      <button type="button" class="tree-enter" hidden>Antré adan kont-la</button>
      <div class="tree-locked" hidden>Talè · bientôt</div>
    </div>
    <div class="tree-climb"><div class="tree-climb-thumb"></div></div>`;
  container.append(el);
  const part = (selector: string): HTMLElement => {
    const found = el.querySelector<HTMLElement>(selector);
    if (!found) throw new Error(`tree overlay: missing ${selector}`);
    return found;
  };
  const intro = part(".tree-intro");
  const label = part(".tree-label");
  const title = part(".tree-label-title");
  const enter = part(".tree-enter");
  const locked = part(".tree-locked");
  const thumb = part(".tree-climb-thumb");
  let current: BookManifest | null = null;
  enter.addEventListener("click", () => {
    if (current) onEnter(current.id);
  });

  return {
    update(t, next) {
      intro.style.opacity = String(Math.max(0, 1 - t * 9));
      thumb.style.top = `${t * (180 - 22)}px`;
      current = next ? next.book : null;
      if (!next) {
        label.style.opacity = "0";
        enter.hidden = true;
        locked.hidden = true;
        return;
      }
      label.style.left = `${next.x}px`;
      label.style.top = `${next.y}px`;
      label.style.opacity = String(next.opacity);
      title.textContent = next.book.card.title;
      enter.hidden = !next.book.ready;
      locked.hidden = next.book.ready;
    },
    dispose() {
      el.remove();
    },
  };
}
