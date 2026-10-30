import "./fonts";
import "./overlay/overlay.css";
import * as THREE from "three";
import type { MountTree, TreeContext, TreeHandle } from "@app/contract";
import { clamp, lerp, smoothstep } from "@shared/math";
import { createRng } from "@shared/random";
import { createStage, fitFov, type Stage } from "@shared/three/stage";
import { detectLite, readLiteEnv, scaleCount } from "./lite";
import { createTreeOverlay } from "./overlay/overlay";
import { isShelfEvent, type ShelfAction } from "./overlay/shelf";
import { cardT, hubCam } from "./scene/camera";
import { createCards, type CardView } from "./scene/cards";
import { createLapen } from "./scene/critters/lapen";
import type { CritterView } from "./scene/critters/parts";
import {
  TREE_OBSTACLE,
  createCritterStates,
  poke,
  stepCritters,
  type CritterName,
} from "./scene/critters/wander";
import { createZanba } from "./scene/critters/zanba";
import { FLORA_OBSTACLES } from "./scene/flora";
import { KONTEUR_OBSTACLES, createKonteur } from "./scene/konteur";
import { createLandscape } from "./scene/landscape";
import { EXPOSURE, FOG } from "./scene/palette";
import { createSky } from "./scene/sky";
import { createLightTree } from "./scene/tree";

type Speaker = "teller" | CritterName;

const SAY: Record<Speaker, string> = {
  teller:
    "« Yé krik ! …… Yé mistikrik ! »\nChwazi on liv adan pyébwa a kont-la.\nChoisis un livre dans l'arbre des contes.",
  lapen: "Mwen sé Konpè Lapen ! Ti, mé malen…\nJe suis Compère Lapin : petit, mais malin !",
  zanba:
    "Mwen sé Konpè Zanba ! Gwo, fò… é toujou fen !\nJe suis Compère Zamba : gros, fort… et toujours affamé !",
};
const DIVE_SECONDS = 1.7;
const TAP_DISTANCE = 8;
const TAP_MS = 600;
const BUBBLE_HOLD_MS = 4500;
const CLIMB_KEYS_UP = ["ArrowUp", "ArrowLeft"];
const CLIMB_KEYS_DOWN = ["ArrowDown", "ArrowRight", " "];

type Pick =
  | { type: "teller" }
  | { type: "card"; index: number }
  | { type: "critter"; name: CritterName }
  | null;

/** Mounts the Pyébwa a Sav universe (v14): climb, hover, pick a card or the shelf, dive into a book. */
export const mountTree: MountTree = (container, ctx) => {
  const lite = detectLite(readLiteEnv());
  const stage = createStage(container, { exposure: EXPOSURE, maxPixelRatio: lite ? 1 : 1.5 });
  try {
    return buildTree(container, ctx, stage, lite);
  } catch (err) {
    stage.dispose();
    throw err;
  }
};

/** Builds scene, overlay and input on an existing stage; the caller disposes the stage on failure. */
function buildTree(
  container: HTMLElement,
  ctx: TreeContext,
  stage: Stage,
  lite: boolean,
): TreeHandle {
  const { scene, camera } = stage;
  const count = (n: number): number => scaleCount(n, lite);
  scene.fog = new THREE.FogExp2(FOG.color, FOG.density);
  scene.background = null;
  const rng = createRng(11);
  const landscape = createLandscape(rng, count);
  const tree = createLightTree(rng, { lite, count });
  const sky = createSky(rng, count);
  const konteur = createKonteur();
  const cards = createCards(ctx.books, tree.tips);
  const critterRng = createRng(17);
  const critters = createCritterStates();
  const views: Record<CritterName, CritterView> = { lapen: createLapen(), zanba: createZanba() };
  const obstacles = [TREE_OBSTACLE, ...KONTEUR_OBSTACLES, ...FLORA_OBSTACLES];
  scene.add(
    landscape.group,
    tree.group,
    sky.group,
    konteur.group,
    cards.group,
    views.lapen.group,
    views.zanba.group,
  );
  const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const parallax = calm ? 0.2 : 1;

  let t = 0;
  let target = 0;
  let hover: number | null = null;
  let near = -1;
  let speaker: Speaker | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let held = false;
  let active = true;
  let diving: { index: number; progress: number; resolve: (() => void) | null } | null = null;
  let down: { y: number; t: number; moved: number } | null = null;
  const pointer = { x: 0, y: 0 };
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  const dest = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickable = [...cards.planes, konteur.plane, views.lapen.group, views.zanba.group];

  const climb = (dy: number): void => {
    target = clamp(target + dy * 0.00055, 0, 1);
  };
  const enter = (index: number): void => {
    const book = ctx.books[index];
    if (book) ctx.onEnter(book.id);
  };
  const onShelf = (index: number, action: ShelfAction): void => {
    if (!active || diving) return;
    if (action === "enter") enter(index);
    else target = cardT(index, ctx.books.length);
  };
  const overlay = createTreeOverlay(container, ctx.books, { onEnter: ctx.onEnter, onShelf });

  /** Screen anchor of a speaker's bubble. */
  const anchorOf = (who: Speaker) => () => {
    if (who === "teller") return stage.project(konteur.anchor(anchor));
    const view = views[who];
    anchor.copy(view.group.position);
    anchor.y += view.top;
    return stage.project(anchor);
  };
  /** Shows the bubble of `who` (and pokes a critter), or hides it; `hold` keeps it for 4.5 s. */
  const setSpeaker = (who: Speaker | null, hold = false): void => {
    clearTimeout(holdTimer);
    held = hold;
    if (hold) {
      holdTimer = setTimeout(() => {
        held = false;
        setSpeaker(null);
      }, BUBBLE_HOLD_MS);
    }
    if (who === speaker) return;
    speaker = who;
    if (!who) {
      ctx.bubble.hide();
      return;
    }
    if (who !== "teller") {
      const state = critters.find((c) => c.name === who);
      if (state) poke(state);
    }
    ctx.bubble.show(SAY[who], anchorOf(who));
  };
  const pick = (): Pick => {
    ndc.set(pointer.x, pointer.y);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickable, true)[0]?.object;
    if (!hit) return null;
    if (hit === konteur.plane) return { type: "teller" };
    for (let o: THREE.Object3D | null = hit; o; o = o.parent) {
      const who = o.userData.who as CritterName | undefined;
      if (who) return { type: "critter", name: who };
    }
    const index = cards.planes.indexOf(hit as THREE.Mesh);
    return index >= 0 ? { type: "card", index } : null;
  };
  const speakerOf = (p: Pick): Speaker | null =>
    p?.type === "teller" ? "teller" : p?.type === "critter" ? p.name : null;

  /** Whether an input event comes from the HUD's own controls (buttons, links, shelf). */
  const fromControl = (e: Event): boolean =>
    e.target instanceof Element && e.target.closest("button, a, .tree-shelf") !== null;

  const onWheel = (e: WheelEvent): void => {
    if (isShelfEvent(e.target)) return;
    e.preventDefault();
    if (active && !diving) climb(e.deltaY);
  };
  const onPointerDown = (e: PointerEvent): void => {
    down = fromControl(e) ? null : { y: e.clientY, t: performance.now(), moved: 0 };
  };
  const onPointerMove = (e: PointerEvent): void => {
    Object.assign(pointer, stage.pointer(e));
    if (!active || diving) return;
    if (down && e.pointerType !== "mouse") {
      const dy = down.y - e.clientY;
      down.y = e.clientY;
      down.moved += Math.abs(dy);
      climb(dy * 2.2);
      return;
    }
    if (e.pointerType !== "mouse") return;
    const p = pick();
    hover = p?.type === "card" ? p.index : null;
    container.style.cursor = p ? "pointer" : "default";
    const who = speakerOf(p);
    if (who) setSpeaker(who);
    else if (!held) setSpeaker(null);
  };
  const onPointerUp = (e: PointerEvent): void => {
    const d = down;
    down = null;
    if (!d || !active || diving) return;
    if (d.moved > TAP_DISTANCE || performance.now() - d.t > TAP_MS) return;
    Object.assign(pointer, stage.pointer(e));
    const p = pick();
    if (p?.type === "card") enter(p.index);
    else if (p && e.pointerType !== "mouse") setSpeaker(speakerOf(p), true);
    else if (!p && e.pointerType !== "mouse") setSpeaker(null);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!active || diving) return;
    if ((e.key === "Enter" || e.key === " ") && e.target instanceof HTMLButtonElement) return;
    if (CLIMB_KEYS_DOWN.includes(e.key)) {
      e.preventDefault();
      climb(140);
    } else if (CLIMB_KEYS_UP.includes(e.key)) {
      e.preventDefault();
      climb(-140);
    } else if (e.key === "Enter" && near >= 0) {
      enter(near);
    }
  };

  /** Whether a projected x keeps the card and its label clear of the screen edges. */
  const onScreen = (x: number): boolean =>
    x > container.clientWidth * 0.12 && x < container.clientWidth * 0.88;

  const frame = (time: number, dt: number): void => {
    t += (target - t) * (1 - Math.exp(-dt * 4.5));
    hubCam(t, cam, look);
    konteur.place(camera.aspect);
    const fov = fitFov(50, camera.aspect);
    if (diving) {
      diving.progress = Math.min(1, diving.progress + dt / DIVE_SECONDS);
      const d = smoothstep(diving.progress);
      const card = cards.position(diving.index);
      dest.copy(cam).sub(card).normalize().multiplyScalar(-0.6).add(card);
      cam.lerp(dest, d);
      look.lerp(card, d);
      camera.fov = lerp(fov, 95, d);
      camera.updateProjectionMatrix();
    } else if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(cam);
    camera.position.x += pointer.x * 0.5 * parallax;
    camera.position.y += pointer.y * 0.3 * parallax;
    camera.lookAt(look);
    landscape.update(time);
    sky.update(time, camera.position);
    tree.update(time, hover !== null || near >= 0);
    konteur.update(time, camera.position, speaker === "teller" && !diving);
    stepCritters(critters, dt, camera.position, obstacles, critterRng);
    for (const c of critters) views[c.name].pose(c, time);
    const cardViews = cards.update(time, t, hover, camera.position, stage.project);
    let best: CardView | null = null;
    for (const v of cardViews)
      if (v.visible && onScreen(v.x) && v.near > 0.35 && (!best || v.near > best.near)) best = v;
    near = best ? best.index : -1;
    const book = best ? ctx.books[best.index] : undefined;
    overlay.update(
      t,
      best && book && !diving
        ? { x: best.x, y: best.y, opacity: Math.min(1, (best.near - 0.35) * 3), book }
        : null,
      diving ? -1 : near,
    );
    if (diving && diving.progress >= 1 && diving.resolve) {
      diving.resolve();
      diving.resolve = null;
    }
  };

  container.addEventListener("wheel", onWheel, { passive: false });
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKey);
  stage.start(frame);

  return {
    dive(bookId) {
      const index = Math.max(
        0,
        ctx.books.findIndex((b) => b.id === bookId),
      );
      hover = null;
      setSpeaker(null);
      return new Promise<void>((resolve) => {
        diving = { index, progress: 0, resolve };
      });
    },
    pause() {
      active = false;
      setSpeaker(null);
      clearTimeout(holdTimer);
      stage.stop();
    },
    resume(fromBookId) {
      const index = fromBookId ? ctx.books.findIndex((b) => b.id === fromBookId) : -1;
      if (index >= 0) t = target = cardT(index, ctx.books.length);
      diving = null;
      hover = null;
      near = -1;
      active = true;
      stage.start(frame);
    },
    dispose() {
      setSpeaker(null);
      clearTimeout(holdTimer);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKey);
      overlay.dispose();
      stage.dispose();
    },
  };
}
