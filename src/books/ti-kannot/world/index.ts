import "@fontsource/caveat/600.css";
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/500.css";
import "@fontsource/quicksand/600.css";
import "../theme.css";
import * as THREE from "three";
import { defineWorld, type Story } from "@app/contract";
import { clamp } from "@shared/math";
import { createRng } from "@shared/random";
import { createStage } from "@shared/three/stage";
import { STAGING, type PageEnv } from "../staging";
import { createCharacters } from "./characters";
import {
  frameOffset,
  mixEnv,
  moveSeconds,
  pageSpan,
  shotCamera,
  shotVector,
  vectorShot,
  type MixedEnv,
  type MixedShot,
} from "./env";
import { createFauna } from "./fauna";
import { createGlide } from "./glide";
import { createGround } from "./island/ground";
import { restingPoints } from "./island/perches";
import { createReservoir } from "./island/reservoir";
import { createScenery } from "./island/scenery";
import { createSource } from "./island/source";
import { createPaint, paintQuality } from "./paint";
import { createSky } from "./sky";
import { createAmbience, createMuteButton, soundLevels, type Ambience } from "./sound";
import { dialogueLines, lineFor, type CharacterName } from "./speech";
import { createStock } from "./stock";
import { createWater } from "./water";

/**
 * Draws the retired vegetation and village cases took from the island RNG, after the ground. They
 * are skipped so the source's branches, the stock and the sky keep their layout.
 */
export const RETIRED_DRAWS = 14186;

const SPEAK_MS = 4200;
const TAP_DISTANCE = 8;
const TAP_MS = 600;
const PAGE_EASE = 1.6;
const CARD_SECONDS = 1.4;
const PARALLAX_EASE = 3;
/** Seconds the paper stays wet around a page turn, and how wet it gets (0..1). */
const WASH_SECONDS = 1.7;
const WASH_STRENGTH = 0.85;
/** Shadow map sizes; the light pass drops its shadows if it cannot hold `SLOW_FRAME`. */
const SHADOW_MAP = { high: 2048, low: 1024 } as const;
const SLOW_FRAME = 1 / 26;
const PROBE_SECONDS = [1.5, 5] as const;

/** Lets every solid thing of the island cast and receive the sun's shadows. */
function shade(...roots: THREE.Object3D[]): void {
  for (const root of roots) {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.userData.noShadow !== true;
      object.receiveShadow = true;
    });
  }
}

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
      for (let i = 0; i < RETIRED_DRAWS; i++) rng();
      const reservoir = createReservoir();
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scenery = createScenery({ calm });
      // Under reduced motion nothing flutters: no butterflies, no frigates, no drifting motes.
      const fauna = calm ? null : createFauna(scenery.flowers);
      const source = createSource(rng);
      const stock = createStock(rng);
      const quality = paintQuality(matchMedia("(pointer: coarse)").matches, devicePixelRatio);
      const sea = createWater({ reflect: quality === "high" });
      water = sea;
      const sky = createSky(rng, { shadows: SHADOW_MAP[quality], motes: !calm });
      const cast = createCharacters(
        restingPoints([...scenery.perches, reservoir.group, source.group]),
      );
      ground.mesh.receiveShadow = true;
      shade(reservoir.group, scenery.group, source.group, stock.group, cast.group);
      scene.fog = sky.fog;
      scene.add(
        sky.group,
        ground.mesh,
        sea.group,
        reservoir.group,
        scenery.group,
        source.group,
        stock.group,
        cast.group,
      );
      if (fauna) scene.add(fauna.group);
      const painter = createPaint(renderer, scene, camera, quality);
      paint = painter;
      const sound = createAmbience();
      ambience = sound;
      mute = createMuteButton(container, (muted) => sound.setMuted(muted));

      let story = ctx.story;
      let page = ctx.page;
      let pageF = ctx.page;
      /** The camera's shot, gliding to the current page's; never reads `pageF`. */
      const aim: number[] = [];
      const lens = createGlide(shotVector(envs[page].shot, 0, aim));
      const shot: MixedShot = { focus: new THREE.Vector3(), azimuth: 0, elevation: 0, distance: 1 };
      /** 1 while the reading card is shown, 0 in "scène seule"; scales the card offset. */
      const cardShift = createGlide([1]);
      /** Time since the last page turn; the paper is wet for `WASH_SECONDS` after it. */
      let sinceTurn = Infinity;
      const probe = { time: 0, frames: 0, done: false };
      let down: { x: number; y: number; t: number; moved: number } | null = null;
      const pointer = { x: 0, y: 0 };
      /** Mouse parallax, eased so the camera never follows the cursor in steps. */
      const sway = new THREE.Vector2();
      const swayTarget = new THREE.Vector2();
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

      /** Points the camera at a page's shot, in a time that suits the move (a cut when calm). */
      const frameShot = (index: number): void => {
        shotVector(envs[index].shot, lens.value[3], aim);
        if (calm) lens.set(aim);
        else lens.to(aim, moveSeconds(lens.value, aim));
      };

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
        lens.update(dt);
        // The sun and the rain follow the camera's focus.
        env.shot = vectorShot(lens.value, shot);
        shotCamera(shot, camera.aspect, camera.position, look);
        sway.lerp(swayTarget, 1 - Math.exp(-dt * PARALLAX_EASE));
        camera.position.x += sway.x * 0.8;
        camera.position.y += sway.y * 0.4;
        camera.lookAt(look);
        renderer.getSize(view);
        cardShift.update(dt);
        const shift = cardShift.value[0];
        const [dx, dy] = frameOffset(view.x, view.y);
        camera.setViewOffset(view.x, view.y, dx * shift, dy * shift, view.x, view.y);
        sky.update(env, time, camera.position);
        sea.update(env, time, camera.position);
        ground.update(env);
        reservoir.update(env);
        scenery.update(env, time);
        source.update(env, time);
        stock.update(env);
        fauna?.update(env, time);
        cast.update(env, time, dt, camera.position);
        sound.update(soundLevels(env));
        sinceTurn += dt;
        const turn = clamp(sinceTurn / WASH_SECONDS, 0, 1);
        // Quick to wet, slow to dry: the scene re-forms out of the wash as the camera settles.
        const wash = turn < 1 ? WASH_STRENGTH * Math.sin(Math.PI * Math.pow(turn, 0.6)) ** 2 : 0;
        painter.update(time, wash);
        if (!probe.done && time > PROBE_SECONDS[0]) {
          probe.time += dt;
          probe.frames++;
          if (probe.time > PROBE_SECONDS[1] - PROBE_SECONDS[0]) {
            probe.done = true;
            if (probe.time / probe.frames > SLOW_FRAME) painter.setShadows(false);
          }
        }
      };

      const onPointerDown = (e: PointerEvent): void => {
        down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      };
      const onPointerMove = (e: PointerEvent): void => {
        Object.assign(pointer, stage.pointer(e));
        if (e.pointerType === "mouse" && !calm) swayTarget.set(pointer.x, pointer.y);
        if (down && e.pointerType !== "mouse") {
          // Distance from the press, sideways too: a page-turning swipe over a character is not a tap.
          down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
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
          if (!calm && index !== page) sinceTurn = 0;
          page = index;
          clearTimeout(speakTimer);
          frameShot(index);
          if (calm) {
            pageF = index;
            cast.snap(place());
          }
        },
        setStory(next) {
          story = next;
        },
        setCardHidden(hidden) {
          const target = [hidden ? 0 : 1];
          if (calm) cardShift.set(target);
          else cardShift.to(target, CARD_SECONDS);
        },
        dispose: release,
      };
    } catch (err) {
      release();
      throw err;
    }
  },
});
