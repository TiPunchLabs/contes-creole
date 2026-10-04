import "./overlay/overlay.css";
import * as THREE from "three";
import type { MountTree, TreeContext, TreeHandle } from "@app/contract";
import { clamp, lerp, smoothstep } from "@shared/math";
import { createRng } from "@shared/random";
import { createStage, fitFov, type Stage } from "@shared/three/stage";
import { createTreeOverlay } from "./overlay/overlay";
import { cardT, hubCam } from "./scene/camera";
import { createCards, type CardView } from "./scene/cards";
import { createKonteur } from "./scene/konteur";
import { createLandscape, createSky } from "./scene/landscape";
import { createLightTree } from "./scene/tree";

const TELLER_TEXT =
  "« Yé krik ! …… Yé mistikrik ! »\nChwazi on liv adan pyébwa a kont-la.\nChoisis un livre dans l'arbre des contes.";
const DIVE_SECONDS = 1.7;
const TAP_DISTANCE = 8;
const TAP_MS = 600;
const TELLER_TAP_MS = 4200;

type Pick = { type: "teller" } | { type: "card"; index: number } | null;

/** Mounts the Pyébwa a Sav universe: climb, hover, pick a card, dive into it. */
export const mountTree: MountTree = (container, ctx) => {
  const stage = createStage(container);
  try {
    return buildTree(container, ctx, stage);
  } catch (err) {
    stage.dispose();
    throw err;
  }
};

/** Builds scene, overlay and input on an existing stage; the caller disposes the stage on failure. */
function buildTree(container: HTMLElement, ctx: TreeContext, stage: Stage): TreeHandle {
  const { scene, camera } = stage;
  const fog = new THREE.FogExp2("#07131a", 0.013);
  scene.fog = fog;
  scene.background = fog.color;
  const rng = createRng(11);
  const landscape = createLandscape(rng);
  const tree = createLightTree(rng);
  const sky = createSky(rng);
  const konteur = createKonteur();
  const cards = createCards(ctx.books, tree.tips);
  scene.add(landscape.group, tree.group, sky.group, konteur.group, cards.group);
  const overlay = createTreeOverlay(container, ctx.onEnter);

  let t = 0;
  let target = 0;
  let hover: number | null = null;
  let near = -1;
  let tellerHover = false;
  let tellerTimer: ReturnType<typeof setTimeout> | undefined;
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

  const climb = (dy: number): void => {
    target = clamp(target + dy * 0.00055, 0, 1);
  };
  const pick = (): Pick => {
    ndc.set(pointer.x, pointer.y);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...cards.planes, konteur.plane], false)[0]?.object;
    if (!hit) return null;
    if (hit === konteur.plane) return { type: "teller" };
    return { type: "card", index: cards.planes.indexOf(hit as THREE.Mesh) };
  };
  const setTellerHover = (on: boolean): void => {
    clearTimeout(tellerTimer);
    if (on === tellerHover) return;
    tellerHover = on;
    if (on) ctx.bubble.show(TELLER_TEXT, () => stage.project(konteur.anchor(anchor)));
    else ctx.bubble.hide();
  };
  const enter = (index: number): void => {
    const book = ctx.books[index];
    if (book) ctx.onEnter(book.id);
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (active && !diving) climb(e.deltaY);
  };
  const onPointerDown = (e: PointerEvent): void => {
    down = { y: e.clientY, t: performance.now(), moved: 0 };
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
    const p = pick();
    hover = p?.type === "card" ? p.index : null;
    container.style.cursor = p ? "pointer" : "default";
    setTellerHover(p?.type === "teller");
  };
  const onPointerUp = (e: PointerEvent): void => {
    const d = down;
    down = null;
    if (!d || !active || diving) return;
    if (d.moved > TAP_DISTANCE || performance.now() - d.t > TAP_MS) return;
    if (e.target instanceof Element && e.target.closest("button")) return;
    Object.assign(pointer, stage.pointer(e));
    const p = pick();
    if (p?.type === "card") enter(p.index);
    else if (p?.type === "teller" && e.pointerType !== "mouse") {
      setTellerHover(true);
      tellerTimer = setTimeout(() => setTellerHover(false), TELLER_TAP_MS);
    } else if (e.pointerType !== "mouse") setTellerHover(false);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!active || diving) return;
    if (e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      climb(140);
    } else if (e.key === "ArrowUp") {
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
    camera.position.x += pointer.x * 0.5;
    camera.position.y += pointer.y * 0.3;
    camera.lookAt(look);
    landscape.update(time);
    sky.update(time);
    tree.update(time);
    konteur.update(time, camera.position, tellerHover && !diving);
    const views = cards.update(time, t, hover, camera.position, stage.project);
    let best: CardView | null = null;
    for (const v of views)
      if (v.visible && onScreen(v.x) && v.near > 0.35 && (!best || v.near > best.near)) best = v;
    near = best ? best.index : -1;
    const book = best ? ctx.books[best.index] : undefined;
    overlay.update(
      t,
      best && book && !diving
        ? {
            x: best.x,
            y: best.y,
            opacity: Math.min(1, (best.near - 0.35) * 3),
            book,
          }
        : null,
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
      setTellerHover(false);
      return new Promise<void>((resolve) => {
        diving = { index, progress: 0, resolve };
      });
    },
    pause() {
      active = false;
      setTellerHover(false);
      stage.stop();
    },
    resume(fromBookId) {
      const index = fromBookId ? ctx.books.findIndex((b) => b.id === fromBookId) : -1;
      if (index >= 0) t = target = cardT(index);
      diving = null;
      hover = null;
      near = -1;
      active = true;
      stage.start(frame);
    },
    dispose() {
      setTellerHover(false);
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
