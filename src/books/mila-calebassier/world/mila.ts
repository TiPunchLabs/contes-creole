import * as THREE from "three";
import { buildMilaFigure, dressRadius, MILA_SKIN, type MilaFigure } from "@shared/mila/figure";
import { paintDress, paintHair, paintMadras, type Rand } from "@shared/mila/textures";
import { washed, type Wash } from "./paint";
import { CHILD_STEP, type Dims } from "./puppet";

/** Mila's measures, as built by the shared figure (body space). */
export const MILA_DIMS: Dims = {
  thigh: 0.245,
  shin: 0.222,
  pivot: 0.62,
  // A child's short quick step on planted feet: with shoes on, a sliding or sinking foot shows.
  stride: 0.3,
  restHand: [0.21, 0.66, 0.03],
  swing: 0.11,
  step: CHILD_STEP,
  radius: dressRadius,
};

/** Height of Mila's eyes above her feet. */
export const MILA_EYES = 1.12;

/** A canvas painted once and used as a repeating colour texture. */
function canvasTexture(
  size: number,
  repeat: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("mila-calebassier: 2D canvas unavailable");
  draw(g, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

/**
 * The Mila of the underwater tale, unchanged in build, colours and textures (same shared code and
 * painters), in this tale's watercolour materials: no rim light, the pigment grain and pooled edge
 * of every other surface of the garden.
 */
export function createMila(wash: Wash, ramp: THREE.Texture, rnd: Rand): MilaFigure {
  const dress = canvasTexture(512, 1, (g, w, h) => paintDress(g, w, h, rnd));
  const madras = canvasTexture(64, 3, paintMadras);
  const hair = canvasTexture(512, 6, (g, w, h) => paintHair(g, w, h, rnd));
  const flat = (color: string, gran = 0.25, brush = 0.7): THREE.Material =>
    washed(wash, ramp, {
      color,
      gran,
      pool: 0.25,
      scale: 9,
      brush,
      vary: 0.15,
      ragged: brush < 0.5 ? 0.12 : 0.5,
    });
  /** Features of her face: drawn fine, almost untouched by the sheet's brush. */
  const fine = (color: string): THREE.Material => flat(color, 0, 0.12);
  const figure = buildMilaFigure({
    skin: flat(MILA_SKIN),
    skinLight: flat("#7b4630", 0.25, 0.45),
    dark: fine("#1c0e09"),
    lipUpper: fine("#6e3129"),
    lipLower: fine("#83402f"),
    white: fine("#f2ebe0"),
    hair: washed(wash, ramp, { map: hair, side: THREE.DoubleSide, gran: 0.2, pool: 0.1, scale: 9 }),
    dress: washed(wash, ramp, {
      map: dress,
      side: THREE.DoubleSide,
      gran: 0.3,
      pool: 0.2,
      scale: 7,
      kind: "dress",
    }),
    strap: flat("#d98d1f"),
    head: washed(wash, ramp, {
      vertexColors: true,
      gran: 0.18,
      pool: 0.22,
      scale: 9,
      brush: 0.2,
      ragged: 0.12,
    }),
    nostril: fine("#3b1c12"),
    lidLine: fine("#4a2617"),
    iris: fine("#3b1d10"),
    pupil: fine("#050302"),
    shine: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    brow: fine("#1d100b"),
    hoop: fine("#e9b949"),
    madras: washed(wash, ramp, { map: madras, side: THREE.DoubleSide, gran: 0.2, pool: 0.1 }),
    rand: (a, b) => a + (b - a) * rnd(),
    // In the garden she wears closed canvas shoes, pale so they read at dusk and at night.
    shoes: { upper: flat("#efe4cf", 0.25, 0.55), sole: flat("#b06a4c", 0.1) },
  });
  // In this tale Mila keeps her eyes open: she looks at the tree, the calabash, Man Ninon.
  figure.open.visible = true;
  figure.closed.visible = false;
  return figure;
}
