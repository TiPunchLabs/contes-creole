import * as THREE from "three";
import type { TreeContext, TreeHandle } from "@app/contract";
import { createStage, type Stage } from "@shared/three/stage";
import type { Flip } from "../flip";
import { CATALOGUE_HASH, type Hud, type ScreenRect } from "../hud/hud";
import { buildSections, type Page } from "../pages";
import { createAmbient } from "./ambient";
import { createBackdrop } from "./backdrop";
import { createBook } from "./book";
import { createBranches } from "./branches";
import { DIVE_SECONDS, divePose, emptyPose, restPose, tallness } from "./camera";
import { createChild } from "./child";
import { tickLayers } from "./layer-material";
import { canvasTexture } from "./paint";
import { LAYOUT, createTerrace } from "./terrace";

/** Pace of the decor's clock under reduced motion (the tree's precedent: barely drifting). */
const CALM_PACE = 0.08;
const EXPOSURE = 1.05;
const BOOK_SCALE = 1.3;

/** What the scene reads from, and tells, the home around it. */
export interface Motion {
  readonly calm: boolean;
  setCalm(value: boolean): void;
  motion: MediaQueryList | undefined;
  setEnter(fn: (id: string) => void): void;
}

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
 * Starts the terrace scene under the HUD (this module and Three.js load after the HTML home is
 * usable). Throws without WebGL; anything it built is disposed if it fails.
 */
export function startScene(
  container: HTMLElement,
  ctx: TreeContext,
  hud: Hud,
  pages: readonly Page[],
  flip: Flip,
  motion: Motion,
): TreeHandle {
  const lite = isLite();
  const stage = createStage(container, { exposure: EXPOSURE, maxPixelRatio: lite ? 1 : 1.5 });
  try {
    return buildVeillee(ctx, stage, hud, pages, flip, lite, motion);
  } catch (err) {
    stage.dispose();
    throw err;
  }
}

/** Builds the terrace, the book and the loop on a live stage; the caller disposes it on failure. */
export function buildVeillee(
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
  // The evening sky as a soft environment: the tiles and the book's boards catch its colours.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyEnv = canvasTexture(256, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#2b2f7a");
    g.addColorStop(0.35, "#7a5bb5");
    g.addColorStop(0.5, "#f3a98a");
    g.addColorStop(0.55, "#6a4a6a");
    g.addColorStop(1, "#2a2030");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // The bay's warm glow on the left of the horizon.
    c.fillStyle = "rgba(255,190,120,0.8)";
    c.fillRect(w * 0.7, h * 0.38, w * 0.12, h * 0.16);
  });
  skyEnv.mapping = THREE.EquirectangularReflectionMapping;
  const envTarget = pmrem.fromEquirectangular(skyEnv);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.55;
  skyEnv.dispose();
  pmrem.dispose();

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
      envTarget.dispose();
      stage.dispose();
    },
  };
}
