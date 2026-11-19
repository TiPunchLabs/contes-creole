import * as THREE from "three";
import { createRng } from "@shared/random";
import type { Page } from "../pages";
import { dabs } from "./paint";

/** Page size in metres (width from the spine, height along the table) and canvas resolution. */
export const PAGE_W = 0.4;
export const PAGE_H = 0.54;
export const CANVAS_W = 1024;
export const CANVAS_H = Math.round((CANVAS_W * PAGE_H) / PAGE_W);
/** Paper margin around the art, as a share of the page height. */
const MARGIN = 0.055;

export type Side = "left" | "right";

/** A rectangle in page UV space (0..1, y up from the near edge). */
export interface UvRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Where a tale's art sits, in spread units (x from -1 at the left page's outer edge to 1 at the
 * right page's, y 0 near edge → 1 far edge): landscape art spans both pages across the gutter;
 * portrait art sits on the right page. Proportions are always the art's own.
 */
export function artPlacement(width: number, height: number): UvRect {
  const aspect = width / height;
  const m = MARGIN;
  if (aspect > 1) {
    const boxW = 2 * PAGE_W * (1 - (m * PAGE_H * 2) / (2 * PAGE_W));
    const boxH = PAGE_H * (1 - 2 * m);
    const scale = Math.min(boxW / width, boxH / height);
    const w = (width * scale) / PAGE_W;
    const h = (height * scale) / PAGE_H;
    return { x0: -w / 2, y0: (1 - h) / 2, x1: w / 2, y1: (1 + h) / 2 };
  }
  const boxW = PAGE_W - 2 * m * PAGE_H;
  const boxH = PAGE_H * (1 - 2 * m);
  const scale = Math.min(boxW / width, boxH / height);
  const w = (width * scale) / PAGE_W;
  const h = (height * scale) / PAGE_H;
  return { x0: 0.5 - w / 2, y0: (1 - h) / 2, x1: 0.5 + w / 2, y1: (1 + h) / 2 };
}

/** The part of a spread rectangle lying on one page, in that page's UV space; null if none. */
export function onSide(rect: UvRect, side: Side): UvRect | null {
  const offset = side === "left" ? 1 : 0;
  const x0 = Math.max(rect.x0 + offset, 0);
  const x1 = Math.min(rect.x1 + offset, 1);
  return x1 > x0 ? { x0, y0: rect.y0, x1, y1: rect.y1 } : null;
}

let paperCache: Partial<Record<Side, HTMLCanvasElement>> = {};

/** Cream paper with grain, a shade towards the gutter and a faint deckle at the outer edge. */
function paper(side: Side): HTMLCanvasElement {
  const cached = paperCache[side];
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const c = canvas.getContext("2d");
  if (c) {
    const w = CANVAS_W;
    const h = CANVAS_H;
    c.fillStyle = "#f1e4c8";
    c.fillRect(0, 0, w, h);
    dabs(
      c,
      createRng(side === "left" ? 31 : 37),
      0,
      0,
      w,
      h,
      ["#e6d3b0", "#faf0dc", "#e9cfb6"],
      900,
      14,
      0.12,
    );
    const gutterX = side === "left" ? w : 0;
    const g = c.createLinearGradient(gutterX, 0, side === "left" ? w * 0.8 : w * 0.2, 0);
    g.addColorStop(0, "rgba(90,60,30,0.35)");
    g.addColorStop(1, "rgba(90,60,30,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const edgeX = side === "left" ? 0 : w;
    const e = c.createLinearGradient(edgeX, 0, side === "left" ? 24 : w - 24, 0);
    e.addColorStop(0, "rgba(140,100,60,0.25)");
    e.addColorStop(1, "rgba(140,100,60,0)");
    c.fillStyle = e;
    c.fillRect(0, 0, w, h);
  }
  paperCache[side] = canvas;
  return canvas;
}

/** Forgets the cached paper (tests, or after a context loss). */
export function resetPaper(): void {
  paperCache = {};
}

/** Draws the part of `image` placed at spread rect `rect` that falls on `side`. */
function drawArt(
  c: CanvasRenderingContext2D,
  image: CanvasImageSource,
  iw: number,
  ih: number,
  rect: UvRect,
  side: Side,
): void {
  const part = onSide(rect, side);
  if (!part) return;
  const offset = side === "left" ? 1 : 0;
  const fullX0 = rect.x0 + offset;
  const fullW = rect.x1 - rect.x0;
  const sx = ((part.x0 - fullX0) / fullW) * iw;
  const sw = ((part.x1 - part.x0) / fullW) * iw;
  const dx = part.x0 * CANVAS_W;
  const dw = (part.x1 - part.x0) * CANVAS_W;
  const dy = (1 - part.y1) * CANVAS_H;
  const dh = (part.y1 - part.y0) * CANVAS_H;
  c.drawImage(image, sx, 0, sw, ih, dx, dy, dw, dh);
  // The paper's grain shows through the paint a little, and the gutter shade covers it.
  c.globalAlpha = 0.1;
  c.drawImage(paper(side), dx, dy, dw, dh, dx, dy, dw, dh);
  c.globalAlpha = 1;
}

/** Decorative line and the tale's theme painted on the free left page of a portrait-format tale. */
function talePrelude(c: CanvasRenderingContext2D, page: Extract<Page, { kind: "tale" }>): void {
  const w = CANVAS_W;
  const h = CANVAS_H;
  c.fillStyle = "#7a4a2a";
  c.textAlign = "center";
  c.font = `600 ${Math.round(w * 0.045)}px Andika, sans-serif`;
  c.fillText(page.book.card.theme.toUpperCase(), w / 2, h * 0.62);
  c.font = `italic 500 ${Math.round(w * 0.06)}px Newsreader, serif`;
  c.fillText(page.book.card.sub, w / 2, h * 0.7);
  c.strokeStyle = "#c0623d";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(w * 0.32, h * 0.75);
  c.quadraticCurveTo(w / 2, h * 0.77, w * 0.68, h * 0.75);
  c.stroke();
}

/** A soft ornamental frame for the portrait's text page (the text itself is HTML). */
function portraitFrame(c: CanvasRenderingContext2D): void {
  const w = CANVAS_W;
  const h = CANVAS_H;
  c.strokeStyle = "rgba(160,90,50,0.45)";
  c.lineWidth = 5;
  c.strokeRect(w * 0.1, h * 0.08, w * 0.8, h * 0.84);
  c.lineWidth = 2;
  c.strokeRect(w * 0.12, h * 0.095, w * 0.76, h * 0.81);
}

export interface PageCanvas {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  /** Repaints an animated page (a portrait's drawing); false for still pages. */
  animate: ((t: number, calm: boolean) => void) | null;
}

/**
 * Paints one side of a page of the sequence: paper, then the tale's official art (loaded image,
 * proportions kept) or a portrait's drawing. Painting again once the image has loaded is up to the
 * caller (`ready` resolves then).
 */
export function paintPage(
  page: Page,
  side: Side,
  images: ReadonlyMap<string, HTMLImageElement>,
): PageCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const c = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const base = (): void => {
    c?.drawImage(paper(side), 0, 0);
  };
  base();
  if (!c) return { canvas, texture, animate: null };
  if (page.kind === "tale") {
    const image = images.get(page.art.url);
    const rect = artPlacement(page.art.width, page.art.height);
    if (image?.complete && image.naturalWidth)
      drawArt(c, image, image.naturalWidth, image.naturalHeight, rect, side);
    if (side === "left" && rect.x0 >= 0) talePrelude(c, page);
    return { canvas, texture, animate: null };
  }
  if (side === "right") {
    portraitFrame(c);
    return { canvas, texture, animate: null };
  }
  const { paint } = page.portrait;
  const animate = (t: number, calm: boolean): void => {
    base();
    c.save();
    paint(c, CANVAS_W, CANVAS_H, t, calm);
    c.restore();
    texture.needsUpdate = true;
  };
  animate(0, false);
  return { canvas, texture, animate };
}
