import * as THREE from "three";
import { disposeObject } from "./dispose";

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface Stage {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  project(point: THREE.Vector3): ScreenPoint;
  pointer(event: PointerEvent): { x: number; y: number };
  start(frame: (time: number, dt: number) => void): void;
  stop(): void;
  dispose(): void;
}

/** Full-size canvas with the v13 renderer settings and a pausable render loop. Throws without WebGL. */
export function createStage(container: HTMLElement): Stage {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  container.append(canvas);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
  } catch (err) {
    canvas.remove();
    throw err;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
  const scene = new THREE.Scene();
  const projected = new THREE.Vector3();
  const t0 = performance.now();
  let width = 1;
  let height = 1;
  let raf = 0;
  let last = 0;

  const resize = (): void => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    if (w === width && h === height) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const stop = (): void => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  return {
    canvas,
    renderer,
    scene,
    camera,
    project: (point) => {
      projected.copy(point).project(camera);
      return {
        x: ((projected.x + 1) / 2) * width,
        y: ((1 - projected.y) / 2) * height,
        visible: projected.z < 1,
      };
    },
    pointer: (event) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - r.left) / r.width) * 2 - 1,
        y: -(((event.clientY - r.top) / r.height) * 2 - 1),
      };
    },
    start: (frame) => {
      stop();
      last = 0;
      const loop = (now: number): void => {
        raf = requestAnimationFrame(loop);
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        resize();
        frame((now - t0) / 1000, dt);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
    },
    stop,
    dispose: () => {
      stop();
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
