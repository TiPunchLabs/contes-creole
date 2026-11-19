import type { MountTree, TreeHandle } from "@app/contract";
import { createFlip, type Flip } from "./flip";
import { createHud, type Hud } from "./hud/hud";
import { buildPages, buildSections, type Page } from "./pages";
import { PORTRAITS } from "./portraits/index";
import type { Motion } from "./scene/run";

/** The classes page's way back (`/#invitation`) lands here: the hash has no meaning on the terrace. */
const RETURN_HASH = "#invitation";

/**
 * Mounts « La Veillée », the home: a terrace of a Guadeloupe house at dusk, a child asleep in the
 * armchair, one big book of tales on the table. It honours the shell's home contract (`dive`,
 * `pause`, `resume`, `dispose`), so the shell's entry and way back are unchanged. Without WebGL it
 * does not throw: the same book is shown as HTML pictures.
 */
export const mountVeillee: MountTree = (container, ctx) => {
  if (location.hash === RETURN_HASH)
    history.replaceState(null, "", location.pathname + location.search);
  const pages = buildPages(ctx.books, PORTRAITS);
  const sections = buildSections(pages);
  const flip = createFlip(pages.length);
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let calm = motion?.matches ?? false;
  let onGo: (index: number) => void = () => undefined;
  let onEnter: (bookId: string) => void = (id) => ctx.onEnter(id);
  const hud = createHud(container, pages, sections, {
    enter: (id) => onEnter(id),
    go: (index) => onGo(index),
  });
  /** Selects a page: the leaf turns (or the spread changes at once when calm). */
  const go = (index: number): void => {
    if (calm) flip.jump(index);
    else flip.request(index);
    hud.select(flip.target);
  };
  onGo = go;
  hud.select(flip.target);

  const motionLink: Motion = {
    get calm() {
      return calm;
    },
    setCalm(value: boolean) {
      calm = value;
    },
    motion,
    setEnter(fn: (id: string) => void) {
      onEnter = fn;
    },
  };
  // The HTML home is usable now; the scene (and Three.js) arrive with their own chunk.
  let live: TreeHandle | null = null;
  let disposed = false;
  const html = htmlHome(container, hud, pages, flip);
  const fallBack = (err: unknown): void => {
    console.warn("WebGL unavailable: the home shows its book as HTML", err);
    hud.showFlat();
  };
  import("./scene/run")
    .then(({ startScene }) => {
      if (disposed) return;
      try {
        live = startScene(container, ctx, hud, pages, flip, motionLink);
      } catch (err) {
        fallBack(err);
      }
    })
    .catch(fallBack);
  return {
    dive: (bookId) => (live ?? html).dive(bookId),
    pause: () => (live ?? html).pause(),
    resume: (bookId) => (live ?? html).resume(bookId),
    dispose() {
      disposed = true;
      (live ?? html).dispose();
    },
  };
};

/**
 * The home as HTML only (before the scene has loaded, or without WebGL): entering a tale skips the
 * dive, the way back reselects its page.
 */
function htmlHome(
  container: HTMLElement,
  hud: Hud,
  pages: readonly Page[],
  flip: Flip,
): TreeHandle {
  return {
    dive: () => {
      hud.setActive(false);
      return Promise.resolve();
    },
    pause: () => hud.setActive(false),
    resume(fromBookId) {
      const index = pages.findIndex((p) => p.id === fromBookId);
      if (index >= 0) flip.jump(index);
      hud.select(flip.target);
      hud.setActive(true);
    },
    dispose() {
      hud.dispose();
      container.replaceChildren();
    },
  };
}
