import * as THREE from "three";
import { createRng } from "@shared/random";
import { foregroundFoot, STAGING, type Foreground } from "../staging";
import type { Assets } from "./assets";
import report from "./assets.json";
import LAYOUT from "./layout.json";
import { MASSES } from "./masses";
import { cardMaterial, skyMaterial, starMaterial, washed, type Cell, type Wash } from "./paint";

/** Radius of the hero calabash and the drop from its stalk's top to its centre (build report). */
export const GOURD_R = report.props.gourdRadius;
export const GOURD_DROP = report.props.gourdStem + GOURD_R * 0.94;

export interface Garden {
  group: THREE.Group;
  sky: THREE.ShaderMaterial;
  stars: THREE.ShaderMaterial;
  hills: THREE.ShaderMaterial;
  hillLights: THREE.MeshBasicMaterial;
  mixer: THREE.AnimationMixer;
  /** Scrubbed clips of the two low branches, and the sockets their fruits hang from. */
  branchA: { action: THREE.AnimationAction; socket: THREE.Object3D };
  branchB: { action: THREE.AnimationAction; socket: THREE.Object3D };
  rooster: { stir: THREE.AnimationAction; crow: THREE.AnimationAction };
  /** Hero calabash and the fruit given at dawn (origins at the top of their stalks). */
  hero: THREE.Object3D;
  heroGlow: { value: number };
  gift: THREE.Object3D;
  lamp: THREE.Object3D;
  shutters: { left: THREE.Object3D; right: THREE.Object3D; yaw: number };
  breakfast: THREE.Object3D;
  /** Calabash halos in the branches. */
  halos: THREE.ShaderMaterial;
  /** Turns the painted cut-outs to the camera and shows the page's foreground. */
  frame(camera: THREE.Camera, pageId: string, tall: boolean): void;
  dispose(): void;
}

const HALO_VERTEX = `
attribute float aGroup; uniform float uLit; uniform float uGold; uniform float uPixel; varying float vOn;
void main(){ vOn=smoothstep(aGroup*.72,aGroup*.72+.28,uLit)*step(.001,uLit)*uGold;
  vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
  gl_PointSize=min(uPixel*260./-mv.z,uPixel*110.); }
`;
const HALO_FRAGMENT = `
varying float vOn;
void main(){ float d=length(gl_PointCoord-.5)*2.; float a=pow(max(0.,1.-d),2.6)*vOn*.42; if(a<.004) discard;
  gl_FragColor=vec4(vec3(1.,.8,.42)*a,a);
  #include <colorspace_fragment>
}
`;

/** Finds a named node or fails with the asset's name. */
function need(root: THREE.Object3D, name: string): THREE.Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`mila-calebassier: "${name}" is missing from the exported assets`);
  return found;
}

/** Finds a named clip or fails. */
function clip(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip {
  const found = THREE.AnimationClip.findByName(clips, name);
  if (!found)
    throw new Error(`mila-calebassier: clip "${name}" is missing from the exported assets`);
  return found;
}

/**
 * Assembles the garden: Blender's models painted by material name, the sky dome and its stars, the
 * far relief, the mid-garden masses and each page's foreground cut-outs.
 */
export function createGarden(
  assets: Assets,
  wash: Wash,
  ramp: THREE.Texture,
  pixelRatio: number,
): Garden {
  const { tex } = assets;
  const group = new THREE.Group();
  const heroGlow = { value: 1 };
  const paint = (
    color: string,
    map: THREE.Texture | null = null,
    extra: Parameters<typeof washed>[2] = {},
  ): THREE.Material => washed(wash, ramp, { color, map, ...extra });
  const lampGlass = new THREE.MeshBasicMaterial({ color: "#ffd58a" });
  const materials: Record<string, THREE.Material> = {
    bark: paint("#ffffff", tex.bark, { gran: 0.45, pool: 0.32 }),
    leaves: paint("#ffffff", tex.leaves, {
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      kind: "leaves",
      gran: 0.15,
      pool: 0,
    }),
    gourd: paint("#ffffff", tex.gourd, { kind: "gourds", gran: 0.12, pool: 0.3, scale: 9 }),
    wall_mila: paint("#f7e4b6", tex.wall, { kind: "wall", vary: 1.3 }),
    wall_ninon: paint("#f3cdbf", tex.wall, { kind: "wall", vary: 1.3 }),
    wall_in: paint("#f1e3cd", tex.wall, { kind: "wall", vary: 1.1 }),
    trim: paint("#faf4ea", tex.wall, { kind: "wall", gran: 0.2, vary: 0.6 }),
    roof: paint("#ffffff", tex.roof, { side: THREE.DoubleSide }),
    slab: paint("#ddd1bf", tex.wall, { vary: 0.8 }),
    floor: paint("#d2ba9c", tex.earth),
    louver: paint("#e3ece5", null, { side: THREE.DoubleSide, gran: 0.2 }),
    door: paint("#5f8f86"),
    wood: paint("#a67c58", null, { gran: 0.5 }),
    metal: paint("#3f6b5c", null, { gran: 0.15 }),
    ground: paint("#ffffff", tex.ground, {
      kind: "ground",
      earth: tex.earth,
      pool: 0,
      gran: 0.25,
      vary: 1,
    }),
    stone: paint("#f6eee2", tex.wall, { pool: 0, gran: 0.2 }),
    hedge: paint("#ffffff", tex.hedge, { alphaTest: 0.5, side: THREE.DoubleSide, pool: 0 }),
    cloth: paint("#f3e9dc", tex.cloth),
    bedding: paint("#eab8a6", tex.cloth),
    pillow: paint("#f6f0e6", tex.cloth),
    ceramic: paint("#f4f0e7", null, { gran: 0.15 }),
    bread: paint("#d9a868"),
    lamp_metal: paint("#59666c", null, { gran: 0.15 }),
    lamp_glass: lampGlass,
    rooster: paint("#8a4b2c", null, { scale: 12 }),
    rooster_tail: paint("#2f4a4a", null, { side: THREE.DoubleSide, scale: 12 }),
    rooster_red: paint("#c8483e", null, { side: THREE.DoubleSide, scale: 12 }),
    rooster_beak: paint("#e0b45c", null, { scale: 12 }),
  };
  const heroMaterial = paint("#ffffff", tex.gourd, {
    kind: "gourd",
    glow: heroGlow,
    gran: 0.12,
    pool: 0.3,
    scale: 9,
  });
  const placeholders = new Set<THREE.Material>();
  const repaint = (root: THREE.Object3D): void => {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const old = object.material as THREE.Material;
      const mat = materials[old.name];
      if (!mat) throw new Error(`mila-calebassier: no paint for material "${old.name}"`);
      placeholders.add(old);
      object.material = mat;
      object.frustumCulled = !(object instanceof THREE.SkinnedMesh);
    });
  };
  for (const gltf of [assets.tree, assets.set, assets.props]) repaint(gltf.scene);
  group.add(assets.tree.scene, assets.set.scene);

  // Props leave their file: hero calabash, the dawn gift (a second fruit), lantern, rooster.
  const props = assets.props.scene;
  const hero = need(props, "gourd_hero");
  (hero as THREE.Mesh).material = heroMaterial;
  const gift = hero.clone();
  (gift as THREE.Mesh).material = paint("#ffffff", tex.gourd, { gran: 0.12, pool: 0.3, scale: 9 });
  const lamp = need(props, "lamp");
  const roosterRig = need(props, "rig_rooster");
  const [px, py, pz] = LAYOUT.perch;
  roosterRig.position.set(px, py, pz);
  roosterRig.rotation.y = -0.7;
  group.add(hero, gift, lamp, roosterRig);

  const mixer = new THREE.AnimationMixer(group);
  const scrub = (c: THREE.AnimationClip, root: THREE.Object3D): THREE.AnimationAction => {
    const action = mixer.clipAction(c, root);
    action.play();
    action.paused = true;
    return action;
  };
  const treeScene = assets.tree.scene;
  const branchA = {
    action: scrub(clip(assets.tree.animations, "A_offer"), treeScene),
    socket: need(treeScene, "socket_A"),
  };
  const branchB = {
    action: scrub(clip(assets.tree.animations, "B_offer"), treeScene),
    socket: need(treeScene, "socket_B"),
  };
  const rooster = {
    stir: scrub(clip(assets.props.animations, "rooster_stir"), roosterRig),
    crow: scrub(clip(assets.props.animations, "rooster_crow"), roosterRig),
  };
  rooster.stir.setEffectiveWeight(0);
  rooster.crow.setEffectiveWeight(0);

  // Sky dome, stars in ordered groups, far relief with its night windows.
  const sky = skyMaterial(tex.sky);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 20), sky);
  dome.renderOrder = -4;
  dome.frustumCulled = false;
  group.add(dome);
  const rng = createRng(23);
  const starCount = 300;
  const starPos = new Float32Array(starCount * 3);
  const starGroup = new Float32Array(starCount);
  const starSize = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const a = rng() * Math.PI * 2;
    const y = 0.1 + rng() * 0.88;
    const r = Math.sqrt(1 - y * y);
    starPos.set([Math.cos(a) * r * 300, y * 300, Math.sin(a) * r * 300], i * 3);
    starGroup[i] = rng() * 0.86;
    starSize[i] = 1.6 + rng() * rng() * 3.2;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeometry.setAttribute("aGroup", new THREE.BufferAttribute(starGroup, 1));
  starGeometry.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
  const stars = starMaterial();
  stars.uniforms.uPixel.value = pixelRatio;
  const starPoints = new THREE.Points(starGeometry, stars);
  starPoints.renderOrder = -3;
  starPoints.frustumCulled = false;
  group.add(starPoints);
  const hills = cardMaterial(wash, tex.hills, [0, 0, 1 / 7, 1]);
  hills.uniforms.uAmbient = { value: new THREE.Color() };
  // The relief is painted far already: it takes its key's tint, not the garden's air.
  hills.uniforms.uAirGain.value = 0;
  const ring = new THREE.CylinderGeometry(150, 150, 34, 48, 1, true);
  const hillMesh = new THREE.Mesh(ring, hills);
  hillMesh.position.y = 9;
  hillMesh.renderOrder = -2;
  const hillLights = new THREE.MeshBasicMaterial({
    map: tex.hillsLights,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  tex.hillsLights.repeat.set(7, -1);
  tex.hillsLights.offset.set(0, 1);
  const lightsMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(149, 149, 34, 48, 1, true),
    hillLights,
  );
  lightsMesh.position.y = 9;
  lightsMesh.renderOrder = -1;
  group.add(hillMesh, lightsMesh);

  // Halos of the calabashes in the branches, lit group by group with them.
  const spots = report.tree.gourds;
  const haloPos = new Float32Array(spots.length * 3);
  const haloGroup = new Float32Array(spots.length);
  spots.forEach((p, i) => {
    haloPos.set([p[0], p[1] - 0.05 - GOURD_DROP, p[2]], i * 3);
    haloGroup[i] = (i % 4) / 3;
  });
  const haloGeometry = new THREE.BufferGeometry();
  haloGeometry.setAttribute("position", new THREE.BufferAttribute(haloPos, 3));
  haloGeometry.setAttribute("aGroup", new THREE.BufferAttribute(haloGroup, 1));
  const halos = new THREE.ShaderMaterial({
    uniforms: { uLit: wash.uLit, uGold: wash.uGold, uPixel: { value: pixelRatio } },
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  const haloPoints = new THREE.Points(haloGeometry, halos);
  haloPoints.frustumCulled = false;
  haloPoints.renderOrder = 2;
  group.add(haloPoints);

  // Painted cut-outs: one unit card standing on its foot, turned to the camera about the vertical.
  const card = new THREE.PlaneGeometry(1, 1);
  card.translate(0, 0.5, 0);
  const billboards: THREE.Mesh[] = [];
  const massMaterials = new Map<string, THREE.ShaderMaterial>();
  const material = (
    atlas: "garden" | "foreground",
    cx: number,
    cy: number,
  ): THREE.ShaderMaterial => {
    const key = `${atlas}:${cx}:${cy}`;
    let mat = massMaterials.get(key);
    if (!mat) {
      const cell: Cell = atlas === "garden" ? [cx, cy, 3, 2] : [cx, cy, 2, 2];
      mat = cardMaterial(wash, tex[atlas], cell, "#ffffff", atlas === "garden" ? 0.03 : 0.02);
      massMaterials.set(key, mat);
    }
    return mat;
  };
  const stand = (
    atlas: "garden" | "foreground",
    cx: number,
    cy: number,
    x: number,
    y: number,
    z: number,
    height: number,
    flip: boolean,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(card, material(atlas, cx, cy));
    mesh.position.set(x, y, z);
    mesh.scale.set(flip ? -height : height, height, 1);
    billboards.push(mesh);
    group.add(mesh);
    return mesh;
  };
  MASSES.forEach(([cx, cy, x, z, h], i) => stand("garden", cx, cy, x, 0, z, h, i % 3 === 1));
  // A ring of taller masses beyond the fences closes the garden before the hills.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng() * 0.15;
    const r = 19 + rng() * 9;
    const x = 1 + Math.sin(a) * r * 1.15;
    const z = -2 - Math.cos(a) * r * 0.8;
    // Nothing in front of the cameras, which all stand in the south-east of the garden.
    if (z > 7 && x > -8 && x < 16) continue;
    const tall = rng() < 0.6;
    stand(
      "garden",
      tall ? 1 : Math.floor(rng() * 3),
      tall ? 1 : 0,
      x,
      0,
      z,
      tall ? 5 + rng() * 2.5 : 3 + rng() * 1.5,
      rng() < 0.5,
    );
  }
  const foregrounds = new Map<string, THREE.Mesh[]>();
  for (const [id, page] of Object.entries(STAGING)) {
    for (const mode of ["wide", "tall"] as const) {
      const shot = page[mode];
      const meshes = shot.foreground.map((f: Foreground) => {
        const [x, z] = foregroundFoot(shot, f);
        const mesh = stand(
          "foreground",
          f.cell[0],
          f.cell[1],
          x,
          f.foot,
          z,
          f.height,
          f.flip === true,
        );
        mesh.renderOrder = 3;
        mesh.visible = false;
        return mesh;
      });
      foregrounds.set(`${id}:${mode}`, meshes);
    }
  }
  let shown: THREE.Mesh[] = [];

  const house = LAYOUT.milaHouse;
  return {
    group,
    sky,
    stars,
    hills,
    hillLights,
    mixer,
    branchA,
    branchB,
    rooster,
    hero,
    heroGlow,
    gift,
    lamp,
    shutters: {
      left: need(assets.set.scene, "shutter_L"),
      right: need(assets.set.scene, "shutter_R"),
      yaw: THREE.MathUtils.degToRad(house.yaw),
    },
    breakfast: need(assets.set.scene, "breakfast"),
    halos,
    frame(camera, pageId, tall) {
      const next = foregrounds.get(`${pageId}:${tall ? "tall" : "wide"}`) ?? [];
      if (next !== shown) {
        for (const mesh of shown) mesh.visible = false;
        for (const mesh of next) mesh.visible = true;
        shown = next;
      }
      const { x, z } = camera.position;
      for (const mesh of billboards) {
        mesh.rotation.y = Math.atan2(x - mesh.position.x, z - mesh.position.z);
      }
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(group);
      group.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
      });
      placeholders.forEach((m) => m.dispose());
    },
  };
}
