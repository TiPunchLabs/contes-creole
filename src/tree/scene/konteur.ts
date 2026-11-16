import * as THREE from "three";
import { lerp } from "@shared/math";
import { softSprite } from "@shared/three/soft-sprite";
// Lossy WebP derivative (quality 88, alpha kept exact) of assets/konteur.png, the kept original.
import konteurUrl from "../assets/konteur.webp";
import { konteurSpot } from "./camera";
import { blobShadow } from "./critters/parts";
import type { Obstacle } from "./critters/wander";
import { groundHeight } from "./ground";

const KONTEUR_Z = -12.5;
const KONTEUR_X_WIDE = 4.4;
const KONTEUR_X_NARROW = 1.9;

/** Ground footprint of the Konteur at both of its positions (wide and narrow screens). */
export const KONTEUR_OBSTACLES: Obstacle[] = [
  [KONTEUR_X_WIDE, KONTEUR_Z, 1.9],
  [KONTEUR_X_NARROW, KONTEUR_Z, 1.9],
];

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
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  plane.position.y = height / 2 - 0.02;
  // Flat on the ground like the critters' shadows, so it shows under the feet from any side; the
  // camera sees it at a grazing angle, hence a wide soft blob plus a tighter one under the feet.
  const shadow = blobShadow(0.75);
  shadow.scale.set(1.3, 1.4, 1);
  const contact = blobShadow(0.45);
  contact.scale.set(1.5, 0.9, 1);
  // A storm lantern at his feet: amber glass between a bronze base and cap, with its handle. The
  // glass is dark amber lit from within, so the lights around it warm it and do not bleach it.
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#b8691c",
    emissive: "#f0a040",
    emissiveIntensity: 1.3,
    roughness: 0.35,
  });
  const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.2, 12), glassMat);
  lampGlass.position.set(0.7, 0.15, 0.15);
  const capMat = new THREE.MeshStandardMaterial({
    color: "#7a5632",
    metalness: 0.35,
    roughness: 0.55,
  });
  // Base, cap and handle in one lathe-and-ring piece each, all of the same bronze.
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.05, 12), capMat);
  lampBase.position.set(0.7, 0.025, 0.15);
  const lampCap = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0.105, 0],
        [0.1, 0.02],
        [0.045, 0.07],
        [0.03, 0.1],
        [0, 0.105],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
    capMat,
  );
  lampCap.position.set(0.7, 0.25, 0.15);
  const lampHandle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 6, 16, Math.PI), capMat);
  lampHandle.position.set(0.7, 0.33, 0.15);
  const lampLight = new THREE.PointLight("#f0b860", 4, 8, 1.6);
  lampLight.position.set(0.7, 0.5, 0.45);
  // Short reach: it lights the photo, not the critters that pass a few metres away.
  const fill = new THREE.PointLight("#f6d8a8", 11.5, 4.6, 1.4);
  fill.position.set(-0.4, 1.4, 2.2);
  const glow = softSprite("#f0b860", 2, 0.2);
  glow.position.set(0.7, 0.2, 0.15);
  group.add(
    plane,
    shadow,
    contact,
    fill,
    lampGlass,
    lampBase,
    lampCap,
    lampHandle,
    lampLight,
    glow,
  );

  let lit = 0;
  const toCamera = new THREE.Vector3();
  return {
    group,
    plane,
    anchor: (out) => out.set(0.35, 1.85, 0).add(group.position),
    place(aspect) {
      const [x] = konteurSpot(aspect);
      if (x !== group.position.x) setX(x);
    },
    update(time, cameraPosition, hovered) {
      toCamera.copy(cameraPosition).sub(group.position);
      plane.rotation.y = Math.atan2(toCamera.x, toCamera.z);
      plane.scale.y = 1 + Math.sin(time * 1.3) * 0.006;
      lit = lerp(lit, hovered ? 1 : 0, 0.1);
      const flicker = Math.sin(time * 7) * 0.08 + Math.sin(time * 3.3) * 0.06;
      lampLight.intensity = lerp(3, 22, lit) * (1 + flicker);
      glow.material.opacity = lerp(0.28, 0.75, lit) * (1 + flicker);
      glow.scale.setScalar(lerp(1.6, 3.4, lit));
      glassMat.emissiveIntensity = lerp(1.3, 2.6, lit);
    },
  };
}
