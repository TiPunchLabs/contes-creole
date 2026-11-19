import * as THREE from "three";
import { createRng, type Rng } from "@shared/random";
import { canvasTexture } from "./paint";

/** Delay of the flowers behind their twig, in seconds. */
export const FLOWER_LAG = 0.25;

/** The breeze at time `t`: a slow sway with a gust every ~11 s, roughly in [-1, 1]. */
export function wind(t: number): number {
  return (
    Math.sin((t / 3.3) * Math.PI * 2) * 0.55 +
    Math.sin((t / 11) * Math.PI * 2 + 1) * 0.35 +
    Math.sin((t / 1.7) * Math.PI * 2 + 0.4) * 0.1
  );
}

interface Twig {
  pivot: THREE.Group;
  /** Rest heading and droop of the twig, around which the breeze moves it. */
  yaw: number;
  droop: number;
  delay: number;
  amplitude: number;
  flowers: THREE.Group[];
}

export interface Branches {
  group: THREE.Group;
  /** The low evening light whose shadows the leaves cast on the floor, wall and table. */
  light: THREE.DirectionalLight;
  /** World position of a flower of the near right branch (petals fall from there). */
  petalSource: THREE.Vector3;
  update(time: number): void;
}

/** A glossy tropical leaf, painted with its midrib, on a transparent card. */
function leafTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#7fae4f");
    g.addColorStop(1, "#2f5a2f");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(4, h / 2);
    c.bezierCurveTo(w * 0.3, -h * 0.05, w * 0.75, h * 0.05, w - 4, h / 2);
    c.bezierCurveTo(w * 0.75, h * 0.95, w * 0.3, h * 1.05, 4, h / 2);
    c.fill();
    c.strokeStyle = "rgba(230,240,170,0.6)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(8, h / 2);
    c.lineTo(w - 10, h / 2);
    c.stroke();
    c.lineWidth = 1.5;
    for (let i = 1; i < 8; i++) {
      const x = (w * i) / 8.5;
      c.beginPath();
      c.moveTo(x, h / 2);
      c.lineTo(x + 18, h * 0.2);
      c.moveTo(x, h / 2);
      c.lineTo(x + 18, h * 0.8);
      c.stroke();
    }
  });
}

/** A red hibiscus flower with its yellow pistil. */
function flowerTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (c, w, h) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.45);
      g.addColorStop(0, "#8e1023");
      g.addColorStop(0.4, "#e5303a");
      g.addColorStop(1, "#ff6d5a");
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(
        w / 2 + Math.cos(a) * w * 0.2,
        h / 2 + Math.sin(a) * h * 0.2,
        w * 0.24,
        h * 0.17,
        a,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.strokeStyle = "#ffd34d";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(w / 2, h / 2);
    c.lineTo(w * 0.78, h * 0.3);
    c.stroke();
  });
}

/**
 * One twig: a short stem from `base` with leaves along it (and flowers at its tip), all on a pivot
 * at the base so the breeze bends the twig as a whole.
 */
function createTwig(
  rng: Rng,
  leaf: THREE.Material,
  flower: THREE.Material | null,
  stem: THREE.Material,
  length: number,
  leaves: number,
): { pivot: THREE.Group; flowers: THREE.Group[] } {
  const pivot = new THREE.Group();
  const bark = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, length, 5), stem);
  bark.rotation.z = Math.PI / 2;
  bark.position.x = length / 2;
  bark.castShadow = true;
  pivot.add(bark);
  for (let i = 0; i < leaves; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), leaf);
    const along = (0.25 + (i / leaves) * 0.75) * length;
    card.geometry.translate(0.13, 0, 0);
    card.position.set(along, 0, 0);
    card.rotation.set(rng() * Math.PI, (rng() - 0.5) * 0.8, (i % 2 ? 1 : -1) * (0.5 + rng() * 0.6));
    card.castShadow = true;
    pivot.add(card);
  }
  const flowers: THREE.Group[] = [];
  if (flower)
    for (let i = 0; i < 2; i++) {
      const hold = new THREE.Group();
      hold.position.set(length * (0.85 + i * 0.12), -0.02, 0.02 * i);
      const bloom = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), flower);
      bloom.position.y = -0.06;
      bloom.rotation.set(-0.5 + rng() * 0.4, rng() * 0.6, rng());
      bloom.castShadow = true;
      hold.add(bloom);
      pivot.add(hold);
      flowers.push(hold);
    }
  return { pivot, flowers };
}

/**
 * The branches nearest the camera, in the top corners (and an unseen canopy over the terrace), each
 * twig reached by the breeze in turn, flowers following with a slight lag. They cast the moving leaf
 * shadows on wall, floor and table through one warm low light.
 */
export function createBranches(seed: number, lite: boolean): Branches {
  const rng = createRng(seed);
  const group = new THREE.Group();
  group.name = "branches";
  const leaf = new THREE.MeshStandardMaterial({
    map: leafTexture(),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.55,
  });
  const flower = new THREE.MeshStandardMaterial({
    map: flowerTexture(),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const stem = new THREE.MeshStandardMaterial({ color: "#4a3426", roughness: 0.9 });
  const twigs: Twig[] = [];
  let petalTwig: THREE.Group | null = null;

  /** A cluster of twigs fanning out from `origin`, pointing roughly along `heading` (radians, xz). */
  const cluster = (
    origin: THREE.Vector3,
    heading: number,
    count: number,
    withFlowers: boolean,
    delay: number,
  ): void => {
    for (let i = 0; i < count; i++) {
      const twig = createTwig(
        rng,
        leaf,
        withFlowers && i % 2 === 0 ? flower : null,
        stem,
        0.5 + rng() * 0.4,
        6 + Math.floor(rng() * 4),
      );
      twig.pivot.position
        .copy(origin)
        .add(new THREE.Vector3(rng() * 0.3, rng() * 0.2, rng() * 0.3));
      twig.pivot.rotation.set(0, heading + (rng() - 0.5) * 1.2, -0.35 - rng() * 0.5);
      group.add(twig.pivot);
      twigs.push({
        pivot: twig.pivot,
        yaw: twig.pivot.rotation.y,
        droop: twig.pivot.rotation.z,
        delay: delay + i * 0.12,
        amplitude: 0.06 + rng() * 0.05,
        flowers: twig.flowers,
      });
      if (withFlowers && !petalTwig && twig.flowers[0]) petalTwig = twig.flowers[0];
    }
  };
  cluster(new THREE.Vector3(-1.35, 2.05, 0.5), 0.1, lite ? 3 : 5, false, 0);
  cluster(new THREE.Vector3(1.55, 2.0, 0.05), Math.PI - 0.2, lite ? 3 : 5, true, 0.6);
  // Over the terrace, out of frame: its shadows dapple the low wall and the far tiles.
  cluster(new THREE.Vector3(0.6, 3.7, -2.2), 0.4, lite ? 4 : 7, false, 1.1);
  cluster(new THREE.Vector3(2.6, 3.8, -2.8), Math.PI, lite ? 3 : 6, false, 1.4);

  const light = new THREE.DirectionalLight("#ffb27a", 1.9);
  light.position.set(3.5, 6, 3);
  light.target.position.set(0.5, 0, -2);
  light.castShadow = true;
  light.shadow.mapSize.set(lite ? 512 : 1024, lite ? 512 : 1024);
  const cam = light.shadow.camera;
  cam.left = -5;
  cam.right = 5;
  cam.top = 5;
  cam.bottom = -5;
  cam.near = 1;
  cam.far = 16;
  light.shadow.bias = -0.0008;
  light.shadow.radius = 3;
  group.add(light, light.target);

  const petalSource = new THREE.Vector3();
  return {
    group,
    light,
    petalSource,
    update(time) {
      for (const twig of twigs) {
        const w = wind(time - twig.delay);
        twig.pivot.rotation.y = twig.yaw + w * twig.amplitude * 1.4;
        twig.pivot.rotation.z = twig.droop + w * twig.amplitude * 0.8;
        twig.pivot.rotation.x = w * twig.amplitude * 0.6;
        for (const f of twig.flowers) f.rotation.z = wind(time - twig.delay - FLOWER_LAG) * 0.35;
      }
      const source = petalTwig as THREE.Group | null;
      if (source) source.getWorldPosition(petalSource);
    },
  };
}
