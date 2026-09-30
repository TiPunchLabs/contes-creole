import "./style.css";
import * as THREE from "three";
import { registry } from "@app/registry";

/** Temporary bootstrap: a lit scene proving the Three.js pipeline until the v13 scene is ported. */
function bootstrap(canvas: HTMLCanvasElement): void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07131a");
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 1.5, 6);

  scene.add(new THREE.HemisphereLight("#2d6f7a", "#0a1410", 1.1));
  const canopy = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.2, 1),
    new THREE.MeshStandardMaterial({ color: "#7af0dc", emissive: "#1f6f66", flatShading: true }),
  );
  canopy.position.y = 1.5;
  scene.add(canopy);

  renderer.setAnimationLoop((time) => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    canopy.rotation.y = time / 4000;
    renderer.render(scene, camera);
  });
}

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (canvas) bootstrap(canvas);

const count = document.querySelector("#tale-count");
if (count)
  count.textContent = `${registry.books.filter((b) => b.ready).length} / ${registry.books.length} kont`;
