import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import propsUrl from "../assets/glb/props.glb?url";
import setUrl from "../assets/glb/set.glb?url";
import treeUrl from "../assets/glb/tree.glb?url";
import barkUrl from "../assets/tex/rt_bark.webp";
import clothUrl from "../assets/tex/rt_cloth.webp";
import earthUrl from "../assets/tex/rt_earth.webp";
import foregroundUrl from "../assets/tex/rt_foreground.webp";
import gardenUrl from "../assets/tex/rt_garden.webp";
import gourdUrl from "../assets/tex/rt_gourd.webp";
import grainUrl from "../assets/tex/rt_grain.webp";
import groundUrl from "../assets/tex/rt_ground.webp";
import hedgeUrl from "../assets/tex/rt_hedge.webp";
import hillsUrl from "../assets/tex/rt_hills.webp";
import hillsLightsUrl from "../assets/tex/rt_hills_lights.webp";
import leavesUrl from "../assets/tex/rt_leaves.webp";
import roofUrl from "../assets/tex/rt_roof.webp";
import skyUrl from "../assets/tex/rt_sky.webp";
import wallUrl from "../assets/tex/rt_wall.webp";

/** Painted textures, by the name the painter gave them (`art/.../paint_layers.py`). */
const TEXTURES = {
  bark: { url: barkUrl, repeat: true, data: false },
  cloth: { url: clothUrl, repeat: true, data: false },
  earth: { url: earthUrl, repeat: true, data: false },
  foreground: { url: foregroundUrl, repeat: false, data: false },
  garden: { url: gardenUrl, repeat: false, data: false },
  gourd: { url: gourdUrl, repeat: true, data: false },
  grain: { url: grainUrl, repeat: true, data: true },
  ground: { url: groundUrl, repeat: true, data: false },
  hedge: { url: hedgeUrl, repeat: true, data: false },
  hills: { url: hillsUrl, repeat: true, data: false },
  hillsLights: { url: hillsLightsUrl, repeat: true, data: false },
  leaves: { url: leavesUrl, repeat: false, data: false },
  roof: { url: roofUrl, repeat: true, data: false },
  sky: { url: skyUrl, repeat: true, data: true },
  wall: { url: wallUrl, repeat: true, data: false },
} as const;

export type TextureName = keyof typeof TEXTURES;

export interface Assets {
  tree: GLTF;
  set: GLTF;
  props: GLTF;
  tex: Record<TextureName, THREE.Texture>;
  /** Frees the textures; the models' geometries belong to the scene they were added to. */
  dispose(): void;
}

/**
 * Loads the three GLB files and the painted textures. Rejects with the name of the first file that
 * fails, and frees what had loaded. Colour textures are sRGB, wash maps and grain are data.
 */
export async function loadAssets(maxAnisotropy: number): Promise<Assets> {
  const gltf = new GLTFLoader();
  const loader = new THREE.TextureLoader();
  const loaded: THREE.Texture[] = [];
  const names = Object.keys(TEXTURES) as TextureName[];
  const model = (name: string, url: string): Promise<GLTF> =>
    gltf.loadAsync(url).catch((err: unknown) => {
      throw new Error(`mila-calebassier: ${name}.glb failed to load`, { cause: err });
    });
  const texture = async (name: TextureName): Promise<THREE.Texture> => {
    const spec = TEXTURES[name];
    let tex: THREE.Texture;
    try {
      tex = await loader.loadAsync(spec.url);
    } catch (err) {
      throw new Error(`mila-calebassier: texture "${name}" failed to load`, { cause: err });
    }
    loaded.push(tex);
    tex.colorSpace = spec.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = spec.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.min(4, maxAnisotropy);
    // glTF UVs have their origin at the top of the image.
    tex.flipY = false;
    return tex;
  };
  try {
    const [tree, set, props, ...textures] = await Promise.all([
      model("tree", treeUrl),
      model("set", setUrl),
      model("props", propsUrl),
      ...names.map(texture),
    ]);
    const tex = Object.fromEntries(names.map((n, i) => [n, textures[i]])) as Record<
      TextureName,
      THREE.Texture
    >;
    return { tree, set, props, tex, dispose: () => loaded.forEach((t) => t.dispose()) };
  } catch (err) {
    loaded.forEach((t) => t.dispose());
    throw err;
  }
}
