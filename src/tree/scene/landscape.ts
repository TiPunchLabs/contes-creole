import * as THREE from "three";
import { clamp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";

/** Height of the morne around the tree (v13 `gH`): a gentle plateau falling towards the hills. */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  return (
    -0.6 +
    Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.35 * Math.min(1, d / 12) +
    Math.sin(x * 0.05 + 1) * Math.sin(z * 0.06) * 1.2 * Math.min(1, Math.max(0, (d - 20) / 30))
  );
}

const MORNES: [number, number, string, number][] = [
  [62, 14, "#0e2028", 9],
  [88, 24, "#0b1820", 7],
];
const CLEARING_PALMS: [number, number, number][] = [
  [-9.5, -10, 6.5],
  [11, -8, 5.5],
  [-12, 4, 7],
  [8, 12.5, 6],
  [-4, 13.5, 5],
];

/** Tropical morne around the tree: lights, relief, hills, sparse vegetation, fireflies, sky. */
export function createLandscape(rng: Rng): { group: THREE.Group; update(time: number): void } {
  const group = new THREE.Group();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();

  group.add(new THREE.HemisphereLight("#2d6f7a", "#0a1410", 1.1));
  const canopyLight = new THREE.PointLight("#5be0d0", 40, 40, 1.6);
  canopyLight.position.set(0, 11, 0);
  const baseLight = new THREE.PointLight("#f0b860", 18, 22, 1.6);
  baseLight.position.set(1, 2, 2);
  const rim = new THREE.DirectionalLight("#5be0d0", 1.2);
  rim.position.set(-8, 14, -10);
  group.add(canopyLight, baseLight, rim);

  {
    const geo = new THREE.PlaneGeometry(200, 200, 90, 90);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cA = new THREE.Color("#0d1c1a");
    const cB = new THREE.Color("#1b3328");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        y = groundHeight(x, z);
      p.setY(i, y);
      const t = clamp((y + 1) / 2, 0, 1) * (0.5 + 0.5 * rng());
      const c = cA.clone().lerp(cB, t);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    group.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
      ),
    );
  }

  for (const [r, hh, color, n] of MORNES) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.5;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
      );
      m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r);
      m.scale.set(18 + rng() * 20, hh * (0.6 + rng() * 0.7), 14 + rng() * 14);
      group.add(m);
    }
  }

  const trunkMat = new THREE.MeshStandardMaterial({
    color: "#2b2530",
    roughness: 1,
    flatShading: true,
  });
  const frondMat = new THREE.MeshStandardMaterial({
    color: "#173a30",
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const bushMat = new THREE.MeshStandardMaterial({
    color: "#12291f",
    roughness: 1,
    flatShading: true,
  });
  const frondGeo = new THREE.PlaneGeometry(0.5, 3.2, 1, 4);
  frondGeo.translate(0, 1.6, 0);
  {
    const p = frondGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 3.2;
      p.setZ(i, -y * y * 1.4);
      p.setX(i, p.getX(i) * (1 - y * 0.7));
    }
    frondGeo.computeVertexNormals();
  }

  const crowns: THREE.Group[] = [];
  const palm = (x: number, z: number, h: number): void => {
    const g = new THREE.Group();
    g.position.set(x, groundHeight(x, z), z);
    const lean = (rng() - 0.5) * 0.3;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h, 6), trunkMat);
    trunk.position.y = h / 2;
    trunk.rotation.z = lean;
    g.add(trunk);
    const crown = new THREE.Group();
    crown.position.set(Math.sin(-lean) * h * 0.5, Math.cos(lean) * h, 0);
    for (let i = 0; i < 8; i++) {
      const f = new THREE.Mesh(frondGeo, frondMat);
      f.rotation.y = (i / 8) * Math.PI * 2 + rng() * 0.3;
      f.rotation.x = -0.35 - rng() * 0.35;
      f.scale.setScalar(0.8 + rng() * 0.4);
      crown.add(f);
    }
    g.add(crown);
    crowns.push(crown);
    g.rotation.y = rng() * 6.28;
    group.add(g);
  };
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2,
      r = 24 + rng() * 20;
    palm(Math.cos(a) * r, Math.sin(a) * r, 5 + rng() * 4);
  }
  for (const [x, z, h] of CLEARING_PALMS) palm(x, z, h);
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2,
      r = 26 + rng() * 24;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const g = new THREE.Group();
    g.position.set(x, groundHeight(x, z), z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.6, 6), trunkMat);
    trunk.position.y = 1.3;
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + rng() * 0.8, 1), bushMat);
    crown.position.y = 3.4;
    crown.scale.y = 0.8;
    g.add(trunk, crown);
    group.add(g);
  }
  const bladeGeo = frondGeo.clone();
  bladeGeo.scale(0.45, 0.3, 0.45);
  const fern = new THREE.InstancedMesh(bladeGeo, frondMat, 64 * 7);
  {
    let k = 0;
    const e = new THREE.Euler();
    for (let i = 0; i < 64; i++) {
      const a = rng() * Math.PI * 2;
      const r = i < 22 ? 4 + rng() * 8 : 22 + rng() * 28;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        y = groundHeight(x, z),
        sc = 0.7 + rng() * 0.8;
      for (let j = 0; j < 7; j++) {
        e.set(-0.5 - rng() * 0.6, (j / 7) * Math.PI * 2 + rng() * 0.5, 0, "YXZ");
        m4.compose(
          new THREE.Vector3(x, y, z),
          q.setFromEuler(e),
          s3.set(sc, sc * (0.8 + rng() * 0.5), sc),
        );
        fern.setMatrixAt(k++, m4);
      }
    }
  }
  group.add(fern);

  const grass = glowPoints(
    rng,
    600,
    () => {
      const a = rng() * Math.PI * 2,
        r = 3 + rng() * 14,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      return [x, groundHeight(x, z) + 0.1 + rng() * 0.3, z];
    },
    { size: 0.14, drift: 0.06, a: "#2c6a4a", b: "#4a8a5a" },
  );
  grass.material.blending = THREE.NormalBlending;
  grass.material.uniforms.uOpacity.value = 0.7;
  const pool = softSprite("#2fa89a", 16, 0.35);
  pool.position.set(0, -0.4, 0);
  group.add(grass, pool);

  return {
    group,
    update(time) {
      grass.material.uniforms.uTime.value = time;
      canopyLight.intensity = 36 + Math.sin(time * 0.9) * 6;
      pool.material.opacity = 0.28 + Math.sin(time * 1.3) * 0.06;
      crowns.forEach((crown, i) => {
        crown.rotation.z = Math.sin(time * 0.7 + i) * 0.04;
        crown.rotation.x = Math.cos(time * 0.5 + i * 1.3) * 0.03;
      });
    },
  };
}

/**
 * Fireflies, stars, moon and mist. Must be called after `createLightTree` to keep the v13 random
 * order (the tree is drawn before the sky).
 */
export function createSky(rng: Rng): { group: THREE.Group; update(time: number): void } {
  const group = new THREE.Group();
  const fireflies = glowPoints(
    rng,
    900,
    () => [(rng() - 0.5) * 36, rng() * 16 - 0.5, (rng() - 0.5) * 36],
    {
      size: 0.22,
      drift: 1.4,
      a: "#9af5e6",
      b: "#ffd98a",
    },
  );
  const stars = glowPoints(
    rng,
    700,
    () => {
      const th = rng() * Math.PI * 2,
        ph = rng() * 1.2;
      return [
        Math.cos(th) * Math.cos(ph) * 220,
        Math.sin(ph) * 220 + 10,
        Math.sin(th) * Math.cos(ph) * 220,
      ];
    },
    { size: 1.1, a: "#dfe9ff", b: "#fff1c8" },
  );
  const moon = softSprite("#f6e3b0", 26, 0.9);
  moon.position.set(-60, 55, -90);
  const mists = Array.from({ length: 14 }, () => {
    const sprite = softSprite("#1c4a52", 14 + rng() * 14, 0.16, false);
    sprite.position.set((rng() - 0.5) * 40, -0.2 + rng() * 1.5, (rng() - 0.5) * 40);
    return { sprite, phase: rng() * 6.28 };
  });
  group.add(fireflies, stars, moon, ...mists.map((m) => m.sprite));

  return {
    group,
    update(time) {
      fireflies.material.uniforms.uTime.value = time;
      stars.material.uniforms.uTime.value = time;
      for (const { sprite, phase } of mists) {
        sprite.position.x += Math.sin(time * 0.1 + phase) * 0.004;
        sprite.material.opacity = 0.12 + Math.sin(time * 0.3 + phase) * 0.05;
      }
    },
  };
}
