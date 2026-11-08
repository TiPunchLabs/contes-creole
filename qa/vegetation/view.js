// QA-only viewer for the tree scene's vegetation (served by `vite` dev, never built): the tree
// universe's builders in the v13 order with createRng(11), the app's renderer settings, and a
// scriptable camera so before/after captures share exact viewpoints. `?lite=1` builds lite mode.
// window.__veg.shot([x, y, z], [lx, ly, lz], time) renders one frame and returns renderer.info;
// window.__veg.fps(ms, path) renders continuously (animated) and returns frame timings.
import * as THREE from "three";
import { createRng } from "/src/shared/random.ts";
import { fitFov } from "/src/shared/three/stage.ts";
import { scaleCount } from "/src/tree/lite.ts";
import { createKonteur } from "/src/tree/scene/konteur.ts";
import { createLandscape } from "/src/tree/scene/landscape.ts";
import { EXPOSURE, FOG } from "/src/tree/scene/palette.ts";
import { createSky } from "/src/tree/scene/sky.ts";
import { createLightTree } from "/src/tree/scene/tree.ts";

const lite = new URLSearchParams(location.search).get("lite") === "1";
const canvas = document.createElement("canvas");
canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
document.body.append(canvas);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1 : 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = EXPOSURE;
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG.color, FOG.density);

const count = (n) => scaleCount(n, lite);
const rng = createRng(11);
const landscape = createLandscape(rng, count);
const tree = createLightTree(rng, { lite, count });
const sky = createSky(rng, count);
const konteur = createKonteur();
scene.add(landscape.group, tree.group, sky.group, konteur.group);

/** Matches the canvas size and the app's FOV rule. */
function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = fitFov(50, camera.aspect);
  camera.updateProjectionMatrix();
  konteur.place(camera.aspect);
}

/** Advances every animated part to `time` and renders once. */
function frame(time) {
  landscape.update(time);
  tree.update(time, false);
  sky.update(time, camera.position);
  konteur.update(time, camera.position, false);
  renderer.render(scene, camera);
}

/** Counts the triangles the vegetation and the whole scene submit (geometry × instances). */
function triangles() {
  let total = 0;
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const g = o.geometry;
    const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
    total += tris * (o.isInstancedMesh ? o.count : 1);
  });
  return total;
}

window.__veg = {
  lite,
  shot(pos, look, time = 4) {
    resize();
    camera.position.set(...pos);
    camera.lookAt(...look);
    renderer.info.reset();
    renderer.info.autoReset = false;
    frame(time);
    renderer.info.autoReset = true;
    const { calls, triangles: tris } = renderer.info.render;
    return { calls, triangles: tris, sceneTriangles: triangles() };
  },
  fps(ms, pos, look) {
    resize();
    camera.position.set(...pos);
    camera.lookAt(...look);
    return new Promise((done) => {
      const times = [];
      const t0 = performance.now();
      let last = t0;
      const loop = (now) => {
        times.push(now - last);
        last = now;
        frame((now - t0) / 1000);
        if (now - t0 < ms) requestAnimationFrame(loop);
        else {
          const sorted = times.slice(5).sort((a, b) => a - b);
          const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
          done({
            frames: sorted.length,
            meanMs: mean,
            p95Ms: sorted[Math.floor(sorted.length * 0.95)],
          });
        }
      };
      requestAnimationFrame(loop);
    });
  },
};
window.__vegReady = true;
