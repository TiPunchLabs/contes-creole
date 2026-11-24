import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/400-italic.css";
import "@fontsource/karla/600.css";
import "../theme.css";
import * as THREE from "three";
import { defineWorld, type Story } from "@app/contract";
import { clamp, lerp } from "@shared/math";
import { createRng } from "@shared/random";
import { softSprite } from "@shared/three/soft-sprite";
import { createStage } from "@shared/three/stage";
import { STAGING, TEXT_SHIFT, type Lens, type PageStaging, type Vec3 } from "../staging";
import { loadAssets, type Assets } from "./assets";
import report from "./assets.json";
import { createFinish, finishQuality } from "./finish";
import { createGarden, GOURD_DROP, GOURD_R, type Garden } from "./garden";
import { createMixedKey, mixKeys } from "./keys";
import LAYOUT from "./layout.json";
import { createMila, MILA_DIMS } from "./mila";
import { createNinon, NINON_DIMS } from "./ninon";
import { createWash, softRamp } from "./paint";
import { createFrame, PAGES, resetFrame, type Anchor, type Carry, type Places } from "./pages";
import { applyPose, type Dims, type Figure, type Grip, type Pose } from "./puppet";

/** Seconds the paper covers the scene around a page change: down, then up. */
const DIP = { cover: 0.22, clear: 0.5 } as const;
/** Seconds the camera takes to slide when the reading text is hidden or shown. */
const CARD_SECONDS = 1.2;
/** How Man Ninon carries the fruit she is given, and her lantern (body space). */
const NINON_CARRY: Carry = { side: 0, height: 1.02, forward: 0.3 };
const LAMP_HAND: Carry = { side: -0.26, height: 0.98, forward: 0.3 };
/** Reach of the warm lights on the painted layers (metres). */
const GLOW_RANGE = [4.6, 5, 9] as const;
/** Distance from a shutter's hinge to the edge where the two leaves meet. */
const SHUTTER_EDGE = 0.6;

const easeInOut = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/** Mila's house local point (x along the façade, z out of it) to world x and z. */
function housePoint(x: number, z: number): [number, number] {
  const a = THREE.MathUtils.degToRad(LAYOUT.milaHouse.yaw);
  const [ox, , oz] = LAYOUT.milaHouse.at;
  return [ox + x * Math.cos(a) + z * Math.sin(a), oz - x * Math.sin(a) + z * Math.cos(a)];
}

/** A staging point in world space (house-local points are turned and moved with the house). */
function worldPoint(p: Vec3, space: PageStaging["space"], out: THREE.Vector3): THREE.Vector3 {
  if (space === "garden") return out.set(p[0], p[1], p[2]);
  const [x, z] = housePoint(p[0], p[2]);
  return out.set(x, p[1], z);
}

/** Staging of each story page, in reading order. */
function stagingFor(story: Story): { id: string; staging: PageStaging }[] {
  return story.pages.map((page) => {
    const staging = STAGING[page.id];
    if (!staging || !PAGES[page.id]) {
      throw new Error(`mila-calebassier: no staging for page "${page.id}"`);
    }
    return { id: page.id, staging };
  });
}

/** What a QA script may ask of the mounted world (never used by the app). */
export interface Probe {
  /** Jumps to a page (index) at an instant of its action, without the paper dip; freezes the clock. */
  seek(page: number, seconds: number): void;
  /** Resumes the page's own clock. */
  resume(): void;
  /** The scene graph, for inspection. */
  readonly scene: THREE.Scene;
  /** Uses grey proxies instead of the painted materials (layout captures). */
  setGraybox(on: boolean): void;
  info(): {
    page: number;
    clock: number;
    seconds: number;
    veil: number;
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
    heroOwner: Anchor;
    heroCount: number;
    hero: number[];
    lit: number;
    stars: number;
    shutters: number;
  };
}

/** The garden of the old calabash tree: twelve pages staged in one master layout. */
export default defineWorld({
  async mount(container, ctx) {
    const pages = stagingFor(ctx.story);
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = matchMedia("(pointer: coarse)").matches;
    const stage = createStage(container, { maxPixelRatio: coarse ? 1.5 : 2 });
    const { scene, camera, renderer } = stage;
    // Painted colours are shown as painted: no filmic curve between the washes and the screen.
    renderer.toneMapping = THREE.NoToneMapping;
    // The tale is read in the text card; the picture is not announced.
    stage.canvas.setAttribute("aria-hidden", "true");
    camera.near = 0.1;
    camera.far = 400;
    const veil = document.createElement("div");
    veil.className = "calebassier-veil";
    const status = document.createElement("p");
    status.className = "calebassier-status";
    status.setAttribute("role", "status");
    status.lang = "fr";
    status.textContent = "Le jardin se dessine…";
    container.append(veil, status);
    let assets: Assets | null = null;
    let garden: Garden | null = null;
    let finish: ReturnType<typeof createFinish> | null = null;
    let disposed = false;
    const release = (): void => {
      if (disposed) return;
      disposed = true;
      garden?.dispose();
      finish?.dispose();
      stage.dispose();
      assets?.dispose();
      veil.remove();
      status.remove();
    };
    try {
      assets = await loadAssets(renderer.capabilities.getMaxAnisotropy());
      const wash = createWash(assets.tex.grain);
      wash.uWind.value = calm ? 0 : 1;
      const ramp = softRamp();
      const built = createGarden(assets, wash, ramp, renderer.getPixelRatio());
      garden = built;
      const rnd = createRng(31);
      const mila = createMila(wash, ramp, rnd);
      const ninon = createNinon(wash, ramp, assets.tex.cloth);
      // The figures are always in the shot; their parts are never culled one by one.
      for (const figure of [mila.g, ninon.g]) {
        figure.traverse((object) => {
          object.frustumCulled = false;
        });
      }
      scene.add(built.group, mila.g, ninon.g);
      const quality = finishQuality(coarse, devicePixelRatio);
      const sheet = createFinish(renderer, scene, camera, assets.tex.grain, quality);
      finish = sheet;

      // Lights: one sky, one sun or moon, and three warm sources shared with the painted layers.
      const hemi = new THREE.HemisphereLight();
      const sun = new THREE.DirectionalLight();
      const warm = [0, 1, 2].map(() => {
        // A slow falloff: hands on the fruit are not burnt out, the ground a few steps away is still lit.
        const light = new THREE.PointLight("#ffd08a", 0, 5, 0.6);
        scene.add(light);
        return light;
      });
      scene.add(hemi, sun, sun.target);
      const heroHalo = softSprite("#ffd58a", 1, 0.5);
      const lampHalo = softSprite("#ffc070", 1, 0.45);
      const treeHalo = softSprite("#ffe2a0", 9, 0);
      treeHalo.position.set(LAYOUT.tree.at[0], 3.6, LAYOUT.tree.at[2]);
      scene.add(heroHalo, lampHalo, treeHalo);
      const sparks = createSparks();
      scene.add(sparks.points);
      // Contact shadows: a soft dark disc under each figure, laid on the ground.
      const blob = (): THREE.Mesh => {
        const tex = (softSprite("#000000", 1, 1, false).material as THREE.SpriteMaterial).map;
        const mesh = new THREE.Mesh(
          new THREE.CircleGeometry(0.34, 24),
          new THREE.MeshBasicMaterial({
            map: tex,
            color: "#141c2c",
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 1;
        scene.add(mesh);
        return mesh;
      };
      const milaShadow = blob();
      const ninonShadow = blob();
      ninonShadow.scale.setScalar(1.35);

      // Fixed places: where each branch holds its fruit when bent, measured on the exported rig.
      const bentSocket = (branch: Garden["branchA"]): THREE.Vector3 => {
        branch.action.time = branch.action.getClip().duration;
        built.mixer.update(0);
        built.group.updateMatrixWorld(true);
        const p = branch.socket.getWorldPosition(new THREE.Vector3());
        branch.action.time = 0;
        built.mixer.update(0);
        p.y -= GOURD_DROP;
        return p;
      };
      const places: Places = {
        giveA: bentSocket(built.branchA),
        giveB: bentSocket(built.branchB),
        floor: LAYOUT.milaHouse.floor + 0.005,
        house: housePoint,
        houseYaw: THREE.MathUtils.degToRad(LAYOUT.milaHouse.yaw),
        root: [1.6, 2.22],
      };
      const tableTop = new THREE.Vector3(
        ...(report.set.milaHouse.table as [number, number, number]),
      );
      tableTop.y += GOURD_R * 0.96;

      const frameState = createFrame();
      const key = createMixedKey();
      let story = ctx.story;
      let target = ctx.page;
      let shown = ctx.page;
      let clock = calm ? PAGES[pages[shown].id].seconds : 0;
      let frozen = false;
      let veilLevel = 1;
      let veilWay = -1;
      let cardShift = 1;
      let cardGoal = 1;
      let graybox = false;
      let heroOwner: Anchor = "branch";
      const view = new THREE.Vector2();
      const from = new THREE.Vector3();
      const to = new THREE.Vector3();
      const look = new THREE.Vector3();
      const heroAt = new THREE.Vector3();
      const giftAt = new THREE.Vector3();
      const lampAt = new THREE.Vector3();
      const scratch = new THREE.Vector3();
      const grey = new THREE.MeshLambertMaterial({ color: "#b9b6b0" });
      const painted = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

      /** A carried point in world space: `carry` in the body space of a figure standing in `p`. */
      const carried = (p: Pose, c: Carry, out: THREE.Vector3): THREE.Vector3 => {
        const s = Math.sin(p.yaw);
        const co = Math.cos(p.yaw);
        return out.set(
          p.x + c.side * co + c.forward * s,
          p.y + c.height,
          p.z - c.side * s + c.forward * co,
        );
      };
      /** Where an anchor holds the hero calabash's centre this frame. */
      const anchorPoint = (anchor: Anchor, out: THREE.Vector3): THREE.Vector3 => {
        if (anchor === "table") return out.copy(tableTop);
        if (anchor === "carry") return carried(frameState.mila, frameState.carry, out);
        built.branchA.socket.getWorldPosition(out);
        out.y -= GOURD_DROP;
        return out;
      };
      /** Both hands of a figure on a fruit at `centre`, blended in from her resting hands. */
      const holdFruit = (p: Pose, dims: Dims, centre: THREE.Vector3, amount: number): void => {
        if (amount <= 0.001) return;
        const s = Math.sin(p.yaw);
        const co = Math.cos(p.yaw);
        const grip = (sd: number): Grip => {
          const [rx, ry, rz] = dims.restHand;
          const rest = new THREE.Vector3(
            p.x + sd * rx * co + rz * s,
            p.y + ry,
            p.z - sd * rx * s + rz * co,
          );
          // Cupped under the fruit's sides, a little towards her: the shell stays in view.
          const reach = GOURD_R + 0.008;
          const on = new THREE.Vector3(
            centre.x + sd * reach * co * 0.86 - 0.035 * s,
            centre.y - 0.058,
            centre.z - sd * reach * s * 0.86 - 0.035 * co,
          );
          return {
            at: rest.lerp(on, amount),
            face: centre.clone(),
            up: [0, 0.55, 1],
            pole: [0.2, -0.24, -0.1],
          };
        };
        p.left = grip(-1);
        p.right = grip(1);
      };

      /** Builds the whole scene for the shown page at its clock. */
      const compose = (time: number): void => {
        const { id, staging } = pages[shown];
        const script = PAGES[id];
        const f = resetFrame(frameState);
        script.run(clock, f, places);

        mixKeys(f.keyFrom, f.keyTo, f.keyMix, key);
        built.sky.uniforms.uTop.value.copy(key.top);
        built.sky.uniforms.uLow.value.copy(key.low);
        built.sky.uniforms.uCloud.value.copy(key.cloud);
        built.sky.uniforms.uCloudK.value = key.cloudK;
        built.hills.uniforms.uAmbient.value.copy(key.hills);
        built.hillLights.opacity = key.hillLights;
        built.stars.uniforms.uLit.value = f.stars;
        wash.uAmbient.value.copy(key.ambient);
        wash.uAir.value.copy(key.air);
        wash.uAirK.value = key.airK;
        wash.uTime.value = calm ? 0 : time;
        wash.uShimmer.value = f.shimmer * f.gourd.glow;
        wash.uLit.value = f.lit;
        wash.uGold.value = f.gold;
        hemi.color.copy(key.hemiSky);
        hemi.groundColor.copy(key.hemiGround);
        hemi.intensity = key.hemi * Math.PI;
        sun.color.copy(key.sun);
        sun.intensity = key.sunK * Math.PI;
        sun.position.copy(key.sunFrom).multiplyScalar(30);

        // Branches first: the sockets say where their fruits hang.
        const clipA = built.branchA.action;
        const clipB = built.branchB.action;
        clipA.time = f.branchA * clipA.getClip().duration;
        clipB.time = f.branchB * clipB.getClip().duration;
        const { stir, crow } = built.rooster;
        stir.setEffectiveWeight(f.stir >= 0 ? 1 : 0);
        crow.setEffectiveWeight(f.crow >= 0 ? 1 : 0);
        stir.time = Math.max(0, f.stir) * stir.getClip().duration * 0.999;
        crow.time = Math.max(0, f.crow) * crow.getClip().duration * 0.999;
        built.mixer.update(0);
        built.group.updateMatrixWorld(true);

        // Hero calabash: one instance, moved between its anchors; hands follow it, not the reverse.
        anchorPoint(f.gourd.from, from);
        anchorPoint(f.gourd.to, to);
        heroAt.lerpVectors(from, to, f.gourd.k);
        heroOwner = f.gourd.k >= 0.5 ? f.gourd.to : f.gourd.from;
        built.hero.position.set(heroAt.x, heroAt.y + GOURD_DROP, heroAt.z);
        built.heroGlow.value = f.gourd.glow * f.gold;
        holdFruit(f.mila, MILA_DIMS, heroAt, f.hold);
        // The dawn gift: on branch B until the tree lets it down into Man Ninon's hands.
        built.branchB.socket.getWorldPosition(from);
        from.y -= GOURD_DROP;
        carried(f.ninon, NINON_CARRY, to);
        giftAt.lerpVectors(from, to, f.gift.k);
        built.gift.position.set(giftAt.x, giftAt.y + GOURD_DROP, giftAt.z);
        holdFruit(f.ninon, NINON_DIMS, giftAt, f.gift.hold);
        if (f.lamp > 0 && f.ninon.visible) {
          carried(f.ninon, LAMP_HAND, lampAt);
          f.ninon.right = {
            at: lampAt.clone(),
            face: lampAt.clone().add(scratch.set(0, -1, 0)),
            up: [0, 0, 1],
            pole: [0.25, -0.2, -0.2],
          };
          built.lamp.position.copy(lampAt);
        }
        built.lamp.visible = f.lamp > 0 && f.ninon.visible;
        // Shutters, and her hands on their meeting edges while she closes or opens them.
        const open = f.shutters * 1.95;
        built.shutters.left.rotation.y = built.shutters.yaw - open;
        built.shutters.right.rotation.y = built.shutters.yaw + open;
        if (f.shut > 0.001) {
          const s = Math.sin(f.mila.yaw);
          const co = Math.cos(f.mila.yaw);
          const [rx, ry, rz] = MILA_DIMS.restHand;
          const hold = (leaf: THREE.Object3D, sd: number): Grip => {
            leaf.updateMatrixWorld(true);
            const edge = leaf.localToWorld(new THREE.Vector3(-sd * SHUTTER_EDGE, -0.12, 0));
            const rest = new THREE.Vector3(
              f.mila.x + sd * rx * co + rz * s,
              f.mila.y + ry,
              f.mila.z - sd * rx * s + rz * co,
            );
            return {
              at: rest.lerp(edge, f.shut),
              face: edge.clone().add(scratch.set(s, 0, co)),
              up: [0, 1, 0.2],
              pole: [0.2, -0.22, -0.08],
            };
          };
          // Seen from inside, the leaf hinged on her right is the house's left one.
          f.mila.left = hold(built.shutters.right, -1);
          f.mila.right = hold(built.shutters.left, 1);
        }
        applyPose(mila as Figure, MILA_DIMS, f.mila, calm ? 0 : time);
        applyPose(ninon, NINON_DIMS, f.ninon, calm ? 0 : time + 2);
        milaShadow.visible = f.mila.visible;
        milaShadow.position.set(f.mila.x, f.mila.y + 0.03, f.mila.z);
        ninonShadow.visible = f.ninon.visible;
        ninonShadow.position.set(f.ninon.x, f.ninon.y + 0.03, f.ninon.z);

        built.breakfast.visible = f.breakfast;

        // Warm sources: the hero calabash, the lantern, the tree's own glow.
        const glow = f.gourd.glow * f.gold;
        const sources: [THREE.Vector3, number][] = [
          [heroAt, 0.2 * glow],
          [lampAt.clone().setY(lampAt.y - 0.14), built.lamp.visible ? 0.28 * f.lamp : 0],
          [
            scratch.set(LAYOUT.tree.at[0], 3.4, LAYOUT.tree.at[2]).clone(),
            0.13 * f.lit * f.gold + 0.34 * f.treeGlow,
          ],
        ];
        sources.forEach(([at, k], i) => {
          warm[i].position.copy(at);
          warm[i].intensity = k * Math.PI;
          warm[i].distance = GLOW_RANGE[i];
          wash.uGlowPos.value[i].copy(at);
          wash.uGlowCol.value[i].set("#ffcf88").multiplyScalar(k * 2.2);
          wash.uGlowRange.value[i] = GLOW_RANGE[i];
        });
        heroHalo.position.copy(heroAt);
        heroHalo.scale.setScalar(0.25 + 0.75 * glow);
        heroHalo.material.opacity = 0.5 * glow;
        lampHalo.visible = built.lamp.visible;
        lampHalo.position.copy(lampAt).setY(lampAt.y - 0.15);
        lampHalo.scale.setScalar(0.5 * f.lamp);
        treeHalo.material.opacity = 0.1 * f.lit * f.gold + 0.3 * f.treeGlow;
        sparks.update(heroAt, f.sparks, calm ? 0 : time);

        // Camera: the page's lens for this screen shape, eased from its entry to its reading frame.
        renderer.getSize(view);
        const tall = view.x < view.y;
        const shot = tall ? staging.tall : staging.wide;
        const u = calm || shot.seconds === 0 ? 1 : easeInOut(clamp(clock / shot.seconds, 0, 1));
        const lens = (pick: (l: Lens) => Vec3, out: THREE.Vector3): THREE.Vector3 => {
          worldPoint(pick(shot.from), staging.space, from);
          worldPoint(pick(shot.to), staging.space, to);
          return out.lerpVectors(from, to, u);
        };
        lens((l) => l.pos, camera.position);
        lens((l) => l.look, look);
        camera.lookAt(look);
        // Screens between the two designs keep the horizontal view of a 16:10 landscape frame.
        const fov = lerp(shot.from.fov, shot.to.fov, u);
        const aspect = view.x / view.y;
        camera.fov =
          !tall && aspect < 1.6
            ? (Math.atan((Math.tan((fov * Math.PI) / 360) * 1.6) / aspect) * 360) / Math.PI
            : fov;
        const dx = tall ? 0 : -view.x * TEXT_SHIFT.wide * cardShift;
        const dy = tall ? -view.y * TEXT_SHIFT.tall * cardShift : 0;
        camera.setViewOffset(view.x, view.y, dx, dy, view.x, view.y);
        camera.updateMatrixWorld();
        built.frame(camera, id, tall);
      };

      /**
       * Says on the canvas which page is shown, who holds the hero calabash and whether the page's
       * action is over: a few attributes, written only when they change, for QA scripts to wait on.
       */
      let published = "";
      const publish = (): void => {
        const id = pages[shown].id;
        const settled = veilLevel === 0 && clock >= PAGES[id].seconds;
        const state = `${id} ${heroOwner} ${settled ? "settled" : "moving"}`;
        if (state === published) return;
        published = state;
        stage.canvas.dataset.page = id;
        stage.canvas.dataset.hero = heroOwner;
        stage.canvas.dataset.settled = String(settled);
      };

      /** Advances the page clock, the paper dip and the text shift, then composes the frame. */
      const frame = (time: number, dt: number): void => {
        if (!frozen) {
          if (shown !== target && veilWay <= 0) veilWay = 1;
          veilLevel = clamp(
            veilLevel + (veilWay * dt) / (veilWay > 0 ? DIP.cover : DIP.clear),
            0,
            1,
          );
          if (veilLevel >= 1 && veilWay > 0) {
            shown = target;
            clock = calm ? PAGES[pages[shown].id].seconds : 0;
            veilWay = -1;
          } else if (veilLevel <= 0) veilWay = 0;
          else if (veilWay === 0) veilWay = -1;
          if (veilWay <= 0) clock = Math.min(clock + dt, PAGES[pages[shown].id].seconds);
          const step = dt / CARD_SECONDS;
          cardShift = calm
            ? cardGoal
            : clamp(cardShift + Math.sign(cardGoal - cardShift) * step, 0, 1);
          if (Math.abs(cardGoal - cardShift) < step) cardShift = cardGoal;
        }
        veil.style.opacity = String(veilLevel);
        compose(time);
        publish();
      };

      // Every shader is compiled before the paper lifts, so the first page change does not stall.
      compose(0);
      renderer.compile(scene, camera);
      status.remove();
      // The finish renders in several passes: the counters are read over a whole frame.
      renderer.info.autoReset = false;
      stage.start(frame, () => {
        renderer.info.reset();
        sheet.render();
      });

      const probe: Probe = {
        scene,
        seek(page, seconds) {
          target = shown = clamp(Math.round(page), 0, pages.length - 1);
          clock = clamp(seconds, 0, PAGES[pages[shown].id].seconds);
          frozen = true;
          cardShift = cardGoal;
          veilLevel = 0;
          veilWay = 0;
        },
        resume() {
          frozen = false;
        },
        setGraybox(on) {
          if (on === graybox) return;
          graybox = on;
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh) || object.material instanceof THREE.ShaderMaterial)
              return;
            if (object.material instanceof THREE.MeshBasicMaterial) return;
            if (on) {
              painted.set(object, object.material);
              object.material = grey;
            } else {
              const mat = painted.get(object);
              if (mat) object.material = mat;
            }
          });
        },
        info() {
          let heroCount = 0;
          scene.traverse((object) => {
            if (object === built.hero && object.visible) heroCount++;
          });
          return {
            page: shown,
            clock,
            seconds: PAGES[pages[shown].id].seconds,
            veil: veilLevel,
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            heroOwner,
            heroCount,
            hero: heroAt.toArray(),
            lit: frameState.lit,
            stars: frameState.stars,
            shutters: frameState.shutters,
          };
        },
      };

      return {
        setPage(index) {
          target = clamp(index, 0, pages.length - 1);
        },
        setStory(next) {
          story = next;
          void story;
        },
        setCardHidden(hidden) {
          cardGoal = hidden ? 0 : 1;
        },
        dispose() {
          grey.dispose();
          sparks.dispose();
          release();
        },
        probe,
      };
    } catch (err) {
      release();
      throw err;
    }
  },
});

/** Tiny warm sparks turning slowly on the calabash's shell (page 5). */
function createSparks(): {
  points: THREE.Points;
  update(centre: THREE.Vector3, amount: number, time: number): void;
  dispose(): void;
} {
  const count = 16;
  const base: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    base.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const material = new THREE.PointsMaterial({
    color: "#fff1c2",
    size: 0.022,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const axis = new THREE.Vector3(0.3, 1, 0.2).normalize();
  const p = new THREE.Vector3();
  return {
    points,
    update(centre, amount, time) {
      points.visible = amount > 0.01;
      if (!points.visible) return;
      material.opacity = amount;
      const position = geometry.attributes.position;
      base.forEach((b, i) => {
        p.copy(b).applyAxisAngle(axis, time * 0.5 + Math.sin(time * 0.7 + i) * 0.25);
        position.setXYZ(
          i,
          centre.x + p.x * (GOURD_R + 0.012),
          centre.y + p.y * (GOURD_R + 0.012),
          centre.z + p.z * (GOURD_R + 0.012),
        );
      });
      position.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
