import * as THREE from "three";
import { clamp, lerp } from "@shared/math";
import { softSprite } from "@shared/three/soft-sprite";
import konteurUrl from "../assets/konteur.png";
import { groundHeight } from "./landscape";

const KONTEUR_Z = -12.5;
const KONTEUR_X_WIDE = 5.2;
const KONTEUR_X_NARROW = 2.3;

/** The storyteller: a photo cut-out billboard at the foot of the tree, with a lantern. */
export function createKonteur(): {
  group: THREE.Group;
  plane: THREE.Mesh;
  anchor(out: THREE.Vector3): THREE.Vector3;
  place(aspect: number): void;
  update(time: number, cameraPosition: THREE.Vector3, hovered: boolean): void;
} {
  const group = new THREE.Group();
  const setX = (x: number): void => {
    group.position.set(x, groundHeight(x, KONTEUR_Z) + 0.02, KONTEUR_Z);
  };
  setX(KONTEUR_X_WIDE);
  const texture = new THREE.TextureLoader().load(konteurUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const height = 1.75;
  const width = height * 0.588;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.9,
      color: "#ffffff",
      emissive: "#6a5040",
      emissiveMap: texture,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  plane.position.y = height / 2 - 0.02;
  const shadow = softSprite("#000000", 1.6, 0.55, false);
  shadow.material.rotation = 0;
  shadow.position.set(0, 0.02, 0.2);
  shadow.scale.set(1.7, 0.5, 1);
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#f6d38a",
    emissive: "#f0a850",
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });
  const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.24, 8), glassMat);
  lampGlass.position.set(0.7, 0.13, 0.15);
  const lampCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.09, 8),
    new THREE.MeshStandardMaterial({ color: "#2a2a30", metalness: 0.5, roughness: 0.6 }),
  );
  lampCap.position.set(0.7, 0.3, 0.15);
  const lampLight = new THREE.PointLight("#f0b860", 4, 8, 1.6);
  lampLight.position.set(0.7, 0.5, 0.45);
  const fill = new THREE.PointLight("#f6d8a8", 10, 7, 1.4);
  fill.position.set(-0.4, 1.4, 2.2);
  const glow = softSprite("#f0b860", 2, 0.2);
  glow.position.set(0.7, 0.2, 0.15);
  const seat = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: "#2a2430", roughness: 1, flatShading: true }),
  );
  seat.position.set(0, -0.12, -0.25);
  seat.scale.set(1.3, 0.42, 1);
  seat.rotation.set(0.2, 0.6, 0.1);
  group.add(plane, shadow, fill, seat, lampGlass, lampCap, lampLight, glow);

  let lit = 0;
  const toCamera = new THREE.Vector3();
  return {
    group,
    plane,
    anchor: (out) => out.set(0.35, 1.85, 0).add(group.position),
    place(aspect) {
      const x = lerp(KONTEUR_X_NARROW, KONTEUR_X_WIDE, clamp((aspect - 0.5) / 0.75, 0, 1));
      if (x !== group.position.x) setX(x);
    },
    update(time, cameraPosition, hovered) {
      toCamera.copy(cameraPosition).sub(group.position);
      plane.rotation.y = Math.atan2(toCamera.x, toCamera.z);
      plane.scale.y = 1 + Math.sin(time * 1.3) * 0.006;
      lit = lerp(lit, hovered ? 1 : 0, 0.1);
      const flicker = Math.sin(time * 7) * 0.08 + Math.sin(time * 3.3) * 0.06;
      lampLight.intensity = lerp(3, 22, lit) * (1 + flicker);
      glow.material.opacity = lerp(0.18, 0.75, lit) * (1 + flicker);
      glow.scale.setScalar(lerp(1.6, 3.4, lit));
      glassMat.emissiveIntensity = lerp(0.5, 2.4, lit);
    },
  };
}
