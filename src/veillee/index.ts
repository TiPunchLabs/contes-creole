import * as THREE from "three";
import type { MountTree, TreeContext, TreeHandle } from "@app/contract";
import { createStage, type Stage } from "@shared/three/stage";
import { createFlip, type Flip } from "./flip";
import { CATALOGUE_HASH, createHud, type Hud, type ScreenRect } from "./hud/hud";
import { buildPages, buildSections, type Page } from "./pages";
import { PORTRAITS } from "./portraits/index";
import { createAmbient } from "./scene/ambient";
import { createBackdrop } from "./scene/backdrop";
import { createBook } from "./scene/book";
import { createBranches } from "./scene/branches";
import { DIVE_SECONDS, divePose, emptyPose, restPose, tallness } from "./scene/camera";
import { createChild } from "./scene/child";
import { tickLayers } from "./scene/layer-material";
import { LAYOUT, createTerrace } from "./scene/terrace";

/** Pace of the decor's clock under reduced motion (the tree's precedent: barely drifting). */
const CALM_PACE = 0.08;
/** The classes page's way back (`/#invitation`) lands here: the hash has no meaning on the terrace. */
const RETURN_HASH = "#invitation";
const EXPOSURE = 1.05;
const BOOK_SCALE = 1.3;

/** Lite mode: few cores or a coarse pointer, unless `?lite=1|0` forces it (the tree's rule). */
function isLite(): boolean {
  const forced = new URLSearchParams(location.search).get("lite");
  if (forced === "1") return true;
  if (forced === "0") return false;
  return (
    (navigator.hardwareConcurrency || 8) <= 4 ||
    (window.matchMedia?.("(pointer: coarse)").matches ?? false)
  );
}

/** Loads each tale's official visual once; `onLoad` runs as each arrives. */
function loadImages(pages: readonly Page[], onLoad: () => void): Map<string, HTMLImageElement> {
  const images = new Map<string, HTMLImageElement>();
  for (const page of pages) {
    if (page.kind !== "tale" || images.has(page.art.url)) continue;
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", onLoad, { once: true });
    image.src = page.art.url;
    images.set(page.art.url, image);
  }
  return images;
}

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

  const lite = isLite();
  let stage: Stage;
  try {
    stage = createStage(container, { exposure: EXPOSURE, maxPixelRatio: lite ? 1 : 1.5 });
  } catch (err) {
    console.warn("WebGL unavailable: the home shows its book as HTML", err);
    return flatHome(container, hud, pages, flip);
  }
  try {
    return buildVeillee(ctx, stage, hud, pages, flip, lite, {
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
    });
  } catch (err) {
    stage.dispose();
    hud.dispose();
    throw err;
  }
};

interface Motion {
  readonly calm: boolean;
  setCalm(value: boolean): void;
  motion: MediaQueryList | undefined;
  setEnter(fn: (id: string) => void): void;
}

/** The home without WebGL: HTML pictures of the pages, same controls; entering a tale still works. */
function flatHome(
  container: HTMLElement,
  hud: Hud,
  pages: readonly Page[],
  flip: Flip,
): TreeHandle {
  const urls = new Map<string, string>();
  for (const p of pages) if (p.kind === "tale") urls.set(p.art.url, p.art.url);
  hud.showFlat(urls);
  return {
    dive: () => Promise.resolve(),
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

/** Builds the terrace, the book and the loop on a live stage; the caller disposes it on failure. */
function buildVeillee(
  ctx: TreeContext,
  stage: Stage,
  hud: Hud,
  pages: readonly Page[],
  flip: Flip,
  lite: boolean,
  motion: Motion,
): TreeHandle {
  const { scene, camera, renderer } = stage;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.background = new THREE.Color("#2b2f7a");

  const sections = buildSections(pages);
  const backdrop = createBackdrop(7);
  const terrace = createTerrace(13);
  const branches = createBranches(19, lite);
  const child = createChild();
  child.group.position.set(LAYOUT.chair.x, 0, LAYOUT.chair.z);
  child.group.rotation.y = LAYOUT.chair.yaw;
  const images = loadImages(pages, () => book.refresh());
  const book = createBook(pages, sections, flip, images);
  book.group.rotation.y = -0.08;
  // One big book: the page is 0.52 × 0.70 m on the table.
  book.group.scale.setScalar(BOOK_SCALE);
  const ambient = createAmbient(book, branches.petalSource, lite);
  const hemi = new THREE.HemisphereLight("#9a8ee0", "#c98a6a", 1.1);
  const fill = new THREE.AmbientLight("#5a4a8a", 0.35);
  // The living room's warm light on the reader's side of the book.
  const reading = new THREE.PointLight("#ffc890", 1.2, 3, 1.5);
  reading.position.set(-0.9, 1.4, 0.9);
  scene.add(
    backdrop.group,
    terrace.group,
    branches.group,
    child.group,
    book.group,
    ambient.group,
    hemi,
    fill,
    reading,
  );

  let decor = 0;
  let active = true;
  let hidden = document.hidden;
  let diving: { progress: number; resolve: (() => void) | null } | null = null;
  let turning = false;
  const rest = emptyPose();
  const pose = emptyPose();
  const target = new THREE.Vector3();

  motion.setEnter((id) => {
    if (!active || diving) return;
    ctx.onEnter(id);
  });

  /** Screen rectangle bounding projected world points. */
  const rectOf = (points: THREE.Vector3[]): ScreenRect => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of points) {
      const s = stage.project(p);
      x0 = Math.min(x0, s.x);
      y0 = Math.min(y0, s.y);
      x1 = Math.max(x1, s.x);
      y1 = Math.max(y1, s.y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  const frame = (_time: number, dt: number): void => {
    decor += dt * (motion.calm ? CALM_PACE : 1);
    restPose(camera.aspect, rest);
    terrace.placeTable(tallness(camera.aspect), book.group.position);
    if (diving) {
      diving.progress = Math.min(1, diving.progress + dt / DIVE_SECONDS);
      book.artCentre(target);
      divePose(rest, target, book.pageHeight, diving.progress, pose);
    } else {
      pose.position.copy(rest.position);
      pose.look.copy(rest.look);
      pose.fov = rest.fov;
    }
    if (camera.fov !== pose.fov) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(pose.position);
    camera.lookAt(pose.look);
    camera.updateMatrixWorld();

    tickLayers(backdrop.materials, decor);
    terrace.update(decor);
    branches.update(decor);
    child.update(decor, motion.calm);
    book.update(decor, diving ? 0 : dt, motion.calm);
    book.group.updateMatrixWorld();
    ambient.update(decor, dt, pages[flip.target], book.settled, motion.calm);

    if (turning !== !book.settled) {
      turning = !book.settled;
      hud.setTurning(turning);
    }
    if (!diving) {
      const a = book.anchors();
      const t = stage.project(a.title);
      hud.place({
        art: a.art ? rectOf(a.art) : null,
        title: { x: t.x, y: t.y },
        text: rectOf(a.text),
        ribbons: a.ribbons.map((r) => {
          const s = stage.project(r);
          return { x: s.x, y: s.y };
        }),
      });
    }
    if (diving && diving.progress >= 1 && diving.resolve) {
      diving.resolve();
      diving.resolve = null;
    }
  };

  /** Stops drawing while the tab is hidden, restarts when it shows again (unless a tale is open). */
  const onVisibility = (): void => {
    hidden = document.hidden;
    if (hidden) stage.stop();
    else if (active) stage.start(frame);
  };
  const onMotion = (e: MediaQueryListEvent): void => motion.setCalm(e.matches);
  document.addEventListener("visibilitychange", onVisibility);
  motion.motion?.addEventListener("change", onMotion);
  if (!hidden) stage.start(frame);
  // QA hook (`?qa=1`): GPU memory and draw counts for the round-trip measurements of qa/veillee.mjs.
  if (new URLSearchParams(location.search).has("qa"))
    Object.assign(window, {
      __veillee: () => ({
        ...renderer.info.memory,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        running: active && !document.hidden,
      }),
    });
  if (location.hash === CATALOGUE_HASH) hud.select(flip.target);

  return {
    dive(bookId) {
      const index = pages.findIndex((p) => p.id === bookId);
      // The entry flies to the tale's own page, even from the catalogue or mid-turn.
      if (index >= 0 && (flip.target !== index || flip.turn)) {
        flip.jump(index);
        hud.select(index);
      }
      hud.setActive(false);
      return new Promise<void>((resolve) => {
        diving = { progress: 0, resolve };
      });
    },
    pause() {
      active = false;
      stage.stop();
    },
    resume(fromBookId) {
      const index = fromBookId ? pages.findIndex((p) => p.id === fromBookId) : -1;
      if (index >= 0) flip.jump(index);
      hud.select(flip.target);
      diving = null;
      active = true;
      hud.setActive(true);
      if (!document.hidden) stage.start(frame);
      // The shell refocuses what opened the tale; if that was a closed panel's button, the tale's
      // entry on its page takes the focus instead.
      queueMicrotask(() => {
        const focused = document.activeElement;
        const lost =
          !focused ||
          focused === document.body ||
          (focused instanceof HTMLElement && !focused.offsetParent);
        if (lost && fromBookId) hud.entryOf(fromBookId)?.focus({ preventScroll: true });
      });
    },
    dispose() {
      document.removeEventListener("visibilitychange", onVisibility);
      motion.motion?.removeEventListener("change", onMotion);
      hud.dispose();
      stage.dispose();
    },
  };
}
