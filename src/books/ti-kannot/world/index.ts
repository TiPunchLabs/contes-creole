import "@fontsource/caveat/600.css";
import "../theme.css";
import * as THREE from "three";
import { defineWorld, type Story } from "@app/contract";
import { createRng } from "@shared/random";
import { createStage } from "@shared/three/stage";
import { STAGING, type PageEnv } from "../staging";
import { createCharacters } from "./characters";
import { frameOffset, mixEnv, pageSpan, shotCamera, type MixedEnv } from "./env";
import { createGround } from "./island/ground";
import { restingPoints } from "./island/perches";
import { createSource } from "./island/source";
import { createVegetation } from "./island/vegetation";
import { createVillage } from "./island/village";
import { createPaint, paintQuality } from "./paint";
import { createSky } from "./sky";
import { createAmbience, createMuteButton, soundLevels, type Ambience } from "./sound";
import { dialogueLines, lineFor, type CharacterName } from "./speech";
import { createStock } from "./stock";
import { createWater } from "./water";

const SPEAK_MS = 4200;
const TAP_DISTANCE = 8;
const TAP_MS = 600;
const PAGE_EASE = 1.6;

/** Staging of each story page, in reading order. */
function envsFor(story: Story): PageEnv[] {
  return story.pages.map((page) => {
    const env = STAGING[page.id];
    if (!env) throw new Error(`ti-kannot: no staging for page "${page.id}"`);
    return env;
  });
}

/** Larivyè Klè: a watercolour island whose river, light and inhabitants follow the tale. */
export default defineWorld({
  mount(container, ctx) {
    const envs = envsFor(ctx.story);
    const stage = createStage(container);
    let speakTimer: ReturnType<typeof setTimeout> | undefined;
    let removeListeners = (): void => {};
    let paint: ReturnType<typeof createPaint> | null = null;
    let ambience: Ambience | null = null;
    let mute: { dispose(): void } | null = null;
    let water: ReturnType<typeof createWater> | null = null;
    const release = (): void => {
      clearTimeout(speakTimer);
      removeListeners();
      mute?.dispose();
      ambience?.dispose();
      water?.dispose();
      paint?.dispose();
      stage.dispose();
    };
    try {
      const { scene, camera, renderer } = stage;
      const rng = createRng(17);
      const ground = createGround(rng);
      const vegetation = createVegetation(rng);
      const village = createVillage(rng);
      const source = createSource(rng);
      const stock = createStock(rng);
      const quality = paintQuality(matchMedia("(pointer: coarse)").matches, devicePixelRatio);
      const sea = createWater({ reflect: quality === "high" });
      water = sea;
      const sky = createSky(rng);
      const cast = createCharacters(
        restingPoints([...vegetation.canopies, village.group, source.group]),
      );
      scene.fog = sky.fog;
      scene.add(
        sky.group,
        ground.mesh,
        sea.group,
        vegetation.group,
        village.group,
        source.group,
        stock.group,
        cast.group,
      );
      const painter = createPaint(renderer, scene, camera, quality);
      paint = painter;
      const sound = createAmbience();
      ambience = sound;
      mute = createMuteButton(container, (muted) => sound.setMuted(muted));

      let story = ctx.story;
      let page = ctx.page;
      let pageF = ctx.page;
      let down: { y: number; t: number; moved: number } | null = null;
      const pointer = { x: 0, y: 0 };
      const look = new THREE.Vector3();
      const anchorPoint = new THREE.Vector3();
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const view = new THREE.Vector2();

      /** Mixed staging at the current fractional page. */
      const place = (): MixedEnv => {
        const { i0, i1, f } = pageSpan(envs.length, pageF);
        return mixEnv(envs, i0, i1, f);
      };
      cast.snap(place());

      /** Shows a character's line in the bubble for a few seconds. */
      const speak = (name: CharacterName): void => {
        ctx.bubble.show(lineFor(name, dialogueLines(story, page)), () => {
          const a = cast.anchor(name, anchorPoint);
          const s = stage.project(a.point);
          return { x: s.x, y: s.y, visible: s.visible && a.visible };
        });
        clearTimeout(speakTimer);
        speakTimer = setTimeout(() => ctx.bubble.hide(), SPEAK_MS);
      };

      /** Advances the page blend and updates every part of the island. */
      const frame = (time: number, dt: number): void => {
        pageF += (page - pageF) * (1 - Math.exp(-dt * PAGE_EASE));
        const env = place();
        shotCamera(env.shot, camera.aspect, camera.position, look);
        camera.position.x += pointer.x * 0.8;
        camera.position.y += pointer.y * 0.4;
        camera.lookAt(look);
        renderer.getSize(view);
        const [dx, dy] = frameOffset(view.x, view.y);
        camera.setViewOffset(view.x, view.y, dx, dy, view.x, view.y);
        sky.update(env, time, camera.position);
        sea.update(env, time, camera.position);
        ground.update(env);
        vegetation.update(env);
        village.update(env);
        source.update(env, time);
        stock.update(env);
        cast.update(env, time, dt, camera.position);
        sound.update(soundLevels(env));
        painter.update(time);
      };

      const onPointerDown = (e: PointerEvent): void => {
        down = { y: e.clientY, t: performance.now(), moved: 0 };
      };
      const onPointerMove = (e: PointerEvent): void => {
        Object.assign(pointer, stage.pointer(e));
        if (down && e.pointerType !== "mouse") {
          down.moved += Math.abs(e.clientY - down.y);
          down.y = e.clientY;
        }
      };
      const onPointerUp = (e: PointerEvent): void => {
        const d = down;
        down = null;
        if (!d || d.moved > TAP_DISTANCE || performance.now() - d.t > TAP_MS) return;
        Object.assign(pointer, stage.pointer(e));
        ndc.set(pointer.x, pointer.y);
        ray.setFromCamera(ndc, camera);
        const name = cast.pick(ray);
        if (name) speak(name);
      };
      removeListeners = (): void => {
        container.removeEventListener("pointerdown", onPointerDown);
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerup", onPointerUp);
      };
      container.addEventListener("pointerdown", onPointerDown);
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerup", onPointerUp);
      stage.start(frame, () => painter.render());

      return {
        setPage(index) {
          page = index;
          clearTimeout(speakTimer);
        },
        setStory(next) {
          story = next;
        },
        dispose: release,
      };
    } catch (err) {
      release();
      throw err;
    }
  },
});
