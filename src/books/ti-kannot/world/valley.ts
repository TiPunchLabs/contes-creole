import * as THREE from "three";
import { clamp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { meander, valleyHeight } from "./terrain";

export const VALLEY_WIDTH = 160;
export const VALLEY_LENGTH = 260;

/** Valley floor, bank trees with red flowers, riverbed rocks. */
export function createValley(rng: Rng): {
  group: THREE.Group;
  rockGeometry: THREE.BufferGeometry;
  rockMaterial: THREE.Material;
  update(time: number): void;
} {
  const group = new THREE.Group();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const floor = new THREE.PlaneGeometry(VALLEY_WIDTH, VALLEY_LENGTH, 110, 200);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, 0, -VALLEY_LENGTH / 2 + 40);
  {
    const p = floor.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cA = new THREE.Color("#0b1d1c"),
      cB = new THREE.Color("#183a30"),
      cC = new THREE.Color("#3b6a4a");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        h = valleyHeight(x, z);
      p.setY(i, h);
      const t = clamp((h + 2.7) / 6, 0, 1);
      const c = t < 0.5 ? cA.clone().lerp(cB, t * 2) : cB.clone().lerp(cC, (t - 0.5) * 2);
      col.set([c.r, c.g, c.b], i * 3);
    }
    floor.setAttribute("color", new THREE.BufferAttribute(col, 3));
    floor.computeVertexNormals();
  }
  group.add(
    new THREE.Mesh(
      floor,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
    ),
  );

  const treeGeo = new THREE.ConeGeometry(1, 3.2, 6);
  treeGeo.translate(0, 1.6, 0);
  const trees = new THREE.InstancedMesh(
    treeGeo,
    new THREE.MeshStandardMaterial({ color: "#0b1e1c", roughness: 1, flatShading: true }),
    260,
  );
  const flowers: [number, number, number][] = [];
  for (let i = 0; i < 260; i++) {
    const z = 30 - rng() * 240,
      side = i % 2 ? 1 : -1;
    const x = meander(z) + side * (8 + rng() * 22),
      s = 0.8 + rng() * 2.2,
      y = valleyHeight(x, z) - 0.1;
    m4.compose(
      new THREE.Vector3(x, y, z),
      q.setFromAxisAngle(up, rng() * 6.28),
      s3.set(s * (0.7 + rng() * 0.5), s, s * (0.7 + rng() * 0.5)),
    );
    trees.setMatrixAt(i, m4);
    if (rng() < 0.3) {
      for (let k = 0; k < 6; k++) {
        flowers.push([
          x + (rng() - 0.5) * s * 1.4,
          y + s * (1.5 + rng() * 1.6),
          z + (rng() - 0.5) * s * 1.4,
        ]);
      }
    }
  }
  const flowerPoints = glowPoints(rng, flowers.length, (i) => flowers[i], {
    size: 0.3,
    a: "#ff6a4a",
    b: "#ffb347",
    drift: 0.05,
  });
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: "#233a3e",
    roughness: 1,
    flatShading: true,
  });
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 220);
  for (let i = 0; i < 220; i++) {
    const z = 30 - rng() * 240,
      x = meander(z) + (rng() - 0.5) * 13,
      s = 0.25 + rng() * 0.7;
    m4.compose(
      new THREE.Vector3(x, valleyHeight(x, z) + s * 0.3, z),
      q.setFromAxisAngle(new THREE.Vector3(rng(), rng(), rng()).normalize(), rng() * 6.28),
      s3.set(s, s * 0.7, s),
    );
    rocks.setMatrixAt(i, m4);
  }
  group.add(trees, flowerPoints, rocks);
  return {
    group,
    rockGeometry,
    rockMaterial,
    update(time) {
      flowerPoints.material.uniforms.uTime.value = time;
    },
  };
}
