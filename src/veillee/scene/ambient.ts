import * as THREE from "three";
import { createRng } from "@shared/random";
import type { Page } from "../pages";
import type { Book } from "./book";
import { wind } from "./branches";
import { canvasTexture } from "./paint";
import { artPlacement, type Side } from "./page-art";

/** Seconds per swell of Mila's sea: the foam on the page and the reflection on the tiles share it. */
export const SWELL_SECONDS = 5.3;

/** Ambient effect of a tale, by book id; a tale without one simply has none. */
const MODES: Record<string, number> = { mila: 1, "ti-kannot": 2 };

export interface Ambient {
  group: THREE.Group;
  /** Effects follow the selected page; they fade out while a leaf turns. */
  update(time: number, dt: number, page: Page | undefined, settled: boolean, calm: boolean): void;
}

/**
 * A layer over the lying pages (same geometry, drawn on top): Mila's foam lines on the painted sea,
 * Ti Kannot's shimmer down the poster's waterfall. Separate from the page textures.
 */
function pageLayer(
  geometry: THREE.BufferGeometry,
  side: Side,
): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      strength: { value: 0 },
      mode: { value: 0 },
      rect: { value: new THREE.Vector4(0, 0, 1, 1) },
      offset: { value: side === "left" ? 1 : 0 },
      swell: { value: SWELL_SECONDS },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float time, strength, mode, offset, swell;
      uniform vec4 rect;
      varying vec2 vUv;
      void main() {
        float sx = vUv.x - offset;
        vec2 a = vec2((sx - rect.x) / (rect.z - rect.x), 1.0 - (vUv.y - rect.y) / (rect.w - rect.y));
        if (a.x < 0.0 || a.x > 1.0 || a.y < 0.0 || a.y > 1.0) discard;
        float alpha = 0.0;
        if (mode < 1.5) {
          // Mila: the sea lies below the horizon (y ~ 0.58) and left of the shore line.
          float shore = 1.02 - max(0.0, a.x - 0.22) * 0.42;
          float sea = smoothstep(0.6, 0.66, a.y) * (1.0 - smoothstep(shore - 0.03, shore, a.y));
          float pulse = 0.55 + 0.45 * sin(time * 6.2831853 / swell);
          float lines = sin(a.y * 70.0 - time * 0.9 + sin(a.x * 9.0 + time * 0.4) * 2.2);
          alpha = smoothstep(0.86, 1.0, lines) * sea * pulse * 0.55;
        } else {
          // Ti Kannot: the waterfall and the river below it.
          float fall = step(0.42, a.x) * step(a.x, 0.53) * step(0.42, a.y) * step(a.y, 0.74);
          float river = step(0.37, a.x) * step(a.x, 0.52) * step(0.72, a.y) * step(a.y, 0.95);
          float streak = sin(a.y * 120.0 - time * 7.0 + sin(a.x * 60.0) * 3.0);
          alpha = smoothstep(0.8, 1.0, streak) * max(fall, river * 0.6) * 0.5;
        }
        gl_FragColor = vec4(1.0, 0.98, 0.92, alpha * strength);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  return mesh;
}

/** Light of Mila's sea on the tiles: rippling teal caustics breathing with the swell. */
function waterReflection(): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, strength: { value: 0 }, swell: { value: SWELL_SECONDS } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float time, strength, swell;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * vec2(9.0, 6.0);
        float c = sin(p.x + sin(p.y * 1.3 + time * 0.8)) * sin(p.y * 1.1 + sin(p.x * 0.9 - time * 0.6));
        float ripple = smoothstep(0.55, 0.95, c);
        float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.6, vUv.x)
          * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float pulse = 0.55 + 0.45 * sin(time * 6.2831853 / swell);
        vec3 color = mix(vec3(0.2, 0.75, 0.8), vec3(0.85, 1.0, 0.95), ripple);
        gl_FragColor = vec4(color, (0.25 + ripple * 0.75) * edge * pulse * strength);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(1.5, 0.004, 0.2);
  return mesh;
}

/** Flamboyant petals falling from the near branch for Ti Kannot (the trees of its poster). */
function petals(count: number): {
  mesh: THREE.InstancedMesh;
  update(time: number, source: THREE.Vector3, strength: number): void;
} {
  const rng = createRng(29);
  const petal = canvasTexture(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w * 0.5, h * 0.7, 2, w * 0.5, h * 0.5, w * 0.5);
    g.addColorStop(0, "#ffb347");
    g.addColorStop(0.5, "#f0552f");
    g.addColorStop(1, "#c42a1f");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w / 2, h * 0.95);
    c.bezierCurveTo(-w * 0.1, h * 0.5, w * 0.2, 0, w / 2, h * 0.08);
    c.bezierCurveTo(w * 0.8, 0, w * 1.1, h * 0.5, w / 2, h * 0.95);
    c.fill();
  });
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.03, 0.03),
    new THREE.MeshStandardMaterial({
      map: petal,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      transparent: true,
      roughness: 0.6,
    }),
    count,
  );
  const seeds = Array.from({ length: count }, () => ({
    t0: rng() * 9,
    dx: (rng() - 0.5) * 1.2,
    dz: (rng() - 0.5) * 0.8,
    spin: 1 + rng() * 2,
  }));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  return {
    mesh,
    update(time, source, strength) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = strength;
      mesh.visible = strength > 0.01;
      if (!mesh.visible) return;
      seeds.forEach((s, i) => {
        const life = (time + s.t0) % 9;
        const fall = Math.min(life * 0.28, source.y);
        p.set(
          source.x + s.dx * (life / 9) - 0.4 * (life / 9) + Math.sin(life * 1.7 + i) * 0.06,
          source.y - fall,
          source.z + s.dz * (life / 9) + wind(time) * 0.05,
        );
        const landed = fall >= source.y;
        e.set(landed ? -Math.PI / 2 : life * s.spin, landed ? 0 : life * s.spin * 0.7, i);
        q.setFromEuler(e);
        m.compose(p, q, one);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * Each tale's ambient, in layers apart from the pages: Mila's foam on the page synchronised with a
 * water reflection on the tiles; Ti Kannot's waterfall shimmer and flamboyant petals. They follow
 * the selected tale and fade during page turns; the ambient never changes the selected tale.
 */
export function createAmbient(book: Book, petalSource: THREE.Vector3, lite: boolean): Ambient {
  const group = new THREE.Group();
  group.name = "ambient";
  const layers = [pageLayer(book.surfaces.left, "left"), pageLayer(book.surfaces.right, "right")];
  book.group.add(...layers);
  const water = waterReflection();
  const fall = petals(lite ? 8 : 16);
  group.add(water, fall.mesh);
  const weight: Record<number, number> = { 1: 0, 2: 0 };
  let current = 0;
  return {
    group,
    update(time, dt, page, settled, calm) {
      const mode = page?.kind === "tale" ? (MODES[page.id] ?? 0) : 0;
      if (mode && settled) current = mode;
      if (!settled) current = 0;
      for (const key of [1, 2]) {
        const goal = key === current ? 1 : 0;
        const w = (weight[key] ?? 0) + (goal - (weight[key] ?? 0)) * (1 - Math.exp(-dt * 2.5));
        weight[key] = w;
      }
      const clock = calm ? time * 0.08 : time;
      const tale = current && page?.kind === "tale" ? page : null;
      for (const layer of layers) {
        const u = layer.material.uniforms;
        if (u.time) u.time.value = clock;
        const active = (weight[1] ?? 0) > (weight[2] ?? 0) ? 1 : 2;
        if (u.mode) u.mode.value = active;
        if (u.strength) u.strength.value = weight[active] ?? 0;
        if (tale && u.rect) {
          const r = artPlacement(tale.art.width, tale.art.height);
          u.rect.value.set(r.x0, r.y0, r.x1, r.y1);
        }
      }
      const wu = water.material.uniforms;
      if (wu.time) wu.time.value = clock;
      if (wu.strength) wu.strength.value = weight[1] ?? 0;
      water.visible = (weight[1] ?? 0) > 0.01;
      fall.update(calm ? 0 : time, petalSource, weight[2] ?? 0);
    },
  };
}
