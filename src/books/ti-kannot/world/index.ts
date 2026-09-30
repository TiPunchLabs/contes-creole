import "../theme.css";
import * as THREE from "three";
import { defineWorld, type Story } from "@app/contract";
import { createRng } from "@shared/random";
import { createStage } from "@shared/three/stage";
import { STAGING, type PageEnv } from "../staging";
import { createCharacters } from "./characters";
import { mixEnv, worldCam } from "./env";
import { createProps } from "./props";
import { createRain, createSky } from "./sky";
import { dialogueLines, lineFor, type CharacterName } from "./speech";
import { createValley } from "./valley";
import { createMists, createPlankton, createRiver } from "./water";

const SPEAK_MS = 4200;
const TAP_DISTANCE = 8;
const TAP_MS = 600;

/** Staging of each story page, in reading order. */
function envsFor(story: Story): PageEnv[] {
  return story.pages.map((page) => {
    const env = STAGING[page.id];
    if (!env) throw new Error(`ti-kannot: no staging for page "${page.id}"`);
    return env;
  });
}

/** Larivyè Klè: a night river whose level, sky and inhabitants change page after page. */
export default defineWorld({
  mount(container, ctx) {
    const envs = envsFor(ctx.story);
    const stage = createStage(container);
    let speakTimer: ReturnType<typeof setTimeout> | undefined;
    let removeListeners = (): void => {};
    const release = (): void => {
      clearTimeout(speakTimer);
      removeListeners();
      stage.dispose();
    };
    try {
      const { scene, camera } = stage;
      const fog = new THREE.FogExp2("#2f8a8c", 0.016);
      scene.fog = fog;
      const hemi = new THREE.HemisphereLight("#3aa2a0", "#0b1a1c", 0.9);
      const sun = new THREE.DirectionalLight("#fff1c8", 1.6);
      // Same order of random draws as scene13.js: valley, plankton, rain, mist, props, calabashes.
      const rng = createRng(11);
      const valley = createValley(rng);
      const plankton = createPlankton(rng);
      const sky = createSky(createRain(rng));
      const river = createRiver(plankton, createMists(rng));
      const props = createProps(rng, valley.rockGeometry, valley.rockMaterial, envs);
      const cast = createCharacters(rng);
      scene.add(
        hemi,
        sun,
        sun.target,
        sky.group,
        valley.group,
        river.group,
        props.group,
        cast.group,
      );

      let story = ctx.story;
      let page = ctx.page;
      let pageF = ctx.page;
      let down: { y: number; t: number; moved: number } | null = null;
      const pointer = { x: 0, y: 0 };
      const cam = new THREE.Vector3();
      const look = new THREE.Vector3();
      const anchorPoint = new THREE.Vector3();
      const black = new THREE.Color("#000000");
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      const place = (): ReturnType<typeof mixEnv> => {
        const { i0, i1, f } = worldCam(envs, pageF, cam, look);
        return mixEnv(envs, i0, i1, f);
      };
      cast.snap(place());

      const speak = (name: CharacterName): void => {
        ctx.bubble.show(lineFor(name, dialogueLines(story, page)), () => {
          const a = cast.anchor(name, anchorPoint);
          const s = stage.project(a.point);
          return { x: s.x, y: s.y, visible: s.visible && a.visible };
        });
        clearTimeout(speakTimer);
        speakTimer = setTimeout(() => ctx.bubble.hide(), SPEAK_MS);
      };

      const frame = (time: number, dt: number): void => {
        pageF += (page - pageF) * (1 - Math.exp(-dt * 3.2));
        const env = place();
        camera.position.copy(cam);
        camera.position.x += pointer.x * 0.6;
        camera.position.y += pointer.y * 0.35;
        camera.lookAt(look);
        sky.update(env, time, camera.position);
        river.update(env, time, camera.position, sky.moon.position);
        fog.color.copy(env.bot).lerp(black, 0.15);
        sun.position.copy(sky.moon.position);
        sun.target.position.set(camera.position.x, 0, camera.position.z - 12);
        sun.color.copy(env.moonColor);
        sun.intensity = 1.0 + env.warm * 1.6;
        hemi.color.copy(env.bot);
        hemi.intensity = 0.7 + env.glow * 0.3;
        valley.update(time);
        props.update(env, time);
        cast.update(env, time);
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
      stage.start(frame);

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
