import * as THREE from "three";
import type { BookManifest } from "@app/contract";
import { clamp, lerp } from "@shared/math";
import type { ScreenPoint } from "@shared/three/stage";
import { cardT, hubCam } from "./camera";
import { isInvitation } from "../invitation";
import { paintInvitationCover } from "./invitation-cover";
import { CARD } from "./palette";

const COVER_W = 512;
const COVER_H = 720;

export interface CardView {
  index: number;
  /** Screen point just below the card. */
  x: number;
  y: number;
  /** Screen y of the card's centre. */
  cy: number;
  visible: boolean;
  near: number;
}

export interface Cards {
  group: THREE.Group;
  planes: THREE.Mesh[];
  position(index: number): THREE.Vector3;
  update(
    time: number,
    t: number,
    hover: number | null,
    cameraPosition: THREE.Vector3,
    project: (p: THREE.Vector3) => ScreenPoint,
  ): CardView[];
}

const MARGIN = 28;
const HEADER = 76;

/**
 * Paints the tree-owned part of every card: a rounded paper card around the cover window, the theme
 * label above it, sub-title and title below. Books get a lamp frame; the invitation an unlit dashed
 * frame and a dashed window, so "to write" never rests on colour alone (with the blank page).
 */
function paintFrame(c: CanvasRenderingContext2D, book: BookManifest, W: number, H: number): void {
  const { card } = book;
  const ready = !isInvitation(book);
  const bottom = Math.round(H * 0.66);
  const win = [MARGIN, HEADER, W - MARGIN * 2, bottom - HEADER] as const;
  // Round the card's corners with an opaque mask: the cover may leave a translucent fill style.
  c.globalAlpha = 1;
  c.fillStyle = "#000";
  c.globalCompositeOperation = "destination-in";
  c.beginPath();
  c.roundRect(0, 0, W, H, 30);
  c.fill();
  c.globalCompositeOperation = "source-over";
  c.fillStyle = CARD.paper;
  c.beginPath();
  c.roundRect(0, 0, W, H, 30);
  c.roundRect(...win, 18);
  c.fill("evenodd");
  c.strokeStyle = ready ? CARD.ready : CARD.locked;
  c.lineWidth = 10;
  if (!ready) c.setLineDash([26, 14]);
  c.beginPath();
  c.roundRect(5, 5, W - 10, H - 10, 26);
  c.stroke();
  c.setLineDash([]);
  if (!ready) {
    c.strokeStyle = CARD.inkSoft;
    c.lineWidth = 3;
    c.setLineDash([12, 9]);
    c.beginPath();
    c.roundRect(...win, 18);
    c.stroke();
    c.setLineDash([]);
  }
  c.textAlign = "left";
  c.fillStyle = ready ? CARD.ink : CARD.inkSoft;
  c.font = `700 22px 'Andika', sans-serif`;
  c.letterSpacing = "3px";
  c.fillText(card.theme.toUpperCase(), MARGIN, 50);
  c.letterSpacing = "0px";
  c.font = `italic 500 28px 'Newsreader', serif`;
  c.fillText(card.sub, MARGIN, bottom + 50);
  c.font = `800 50px 'Newsreader', 'Andika', sans-serif`;
  const lines: string[] = [];
  let current = "";
  for (const word of card.title.split(" ")) {
    if (c.measureText(`${current} ${word}`).width > W - 120 && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  lines.push(current);
  lines.forEach((line, i) => c.fillText(line, MARGIN, bottom + 112 + i * 54));
}

/** Card texture: the book paints its cover, the tree paints frame and title; redrawn once fonts load. */
function coverTexture(book: BookManifest): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) return texture;
  const draw = (): void => {
    if (isInvitation(book)) paintInvitationCover(ctx, COVER_W, COVER_H);
    else book.cover?.(ctx, COVER_W, COVER_H);
    paintFrame(ctx, book, COVER_W, COVER_H);
    texture.needsUpdate = true;
  };
  draw();
  void document.fonts?.ready.then(draw);
  return texture;
}

/** Soft round halo texture behind each card. */
function haloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

const CARD_SCALE = 1.18;

/** Book cards hanging from the branches on the camera spiral, with a thread to the nearest tip. */
export function createCards(books: BookManifest[], tips: THREE.Vector3[]): Cards {
  const group = new THREE.Group();
  const threadMat = new THREE.LineBasicMaterial({
    color: "#7a5236",
    transparent: true,
    opacity: 0.85,
  });
  const haloMap = haloTexture();
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const cards = books.map((book, i) => {
    const t = cardT(i, books.length);
    const a = hubCam(t, camPos, look) + (i % 2 ? 0.06 : -0.06);
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * 12.2, camPos.y + 0.3, Math.sin(a) * 12.2);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.1),
      new THREE.MeshBasicMaterial({ map: coverTexture(book), transparent: true }),
    );
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.1),
      new THREE.MeshBasicMaterial({ color: CARD.paperWarm, side: THREE.BackSide }),
    );
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 3.4),
      new THREE.MeshBasicMaterial({
        map: haloMap,
        color: isInvitation(book) ? "#fff0d8" : "#ffe08a",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    halo.position.z = -0.02;
    g.add(halo, back, plane);
    let tip = tips[0];
    let best = Infinity;
    for (const candidate of tips) {
      const d = candidate.distanceTo(g.position);
      if (d < best) {
        best = d;
        tip = candidate;
      }
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        tip,
        g.position.clone().add(new THREE.Vector3(0, 1.05, 0)),
      ]),
      threadMat,
    );
    group.add(g, line);
    return { g, plane, halo, line, t, hover: 0 };
  });
  const below = new THREE.Vector3();

  return {
    group,
    planes: cards.map((c) => c.plane),
    position: (index) => cards[index].g.position,
    update(time, t, hover, cameraPosition, project) {
      return cards.map((c, i) => {
        c.g.lookAt(cameraPosition);
        c.g.rotation.z += Math.sin(time * 0.8 + i) * 0.03;
        c.g.position.y += Math.sin(time * 0.6 + i * 2) * 0.0015;
        const near = 1 - clamp(Math.abs(t - c.t) / 0.22, 0, 1);
        c.hover = lerp(c.hover, hover === i ? 1 : 0, 0.12);
        const scale = CARD_SCALE * (1 + near * 0.1 + c.hover * 0.08);
        c.g.scale.setScalar(scale);
        c.halo.material.opacity = 0.2 + near * 0.35 + c.hover * 0.35;
        c.g.rotation.z += Math.sin(time * 5) * 0.03 * c.hover;
        const thread = c.line.geometry.attributes.position;
        thread.setXYZ(1, c.g.position.x, c.g.position.y + 1.05 * scale, c.g.position.z);
        thread.needsUpdate = true;
        below.copy(c.g.position);
        below.y -= 1.25 * scale;
        const s = project(below);
        const cy = project(c.g.position).y;
        return { index: i, x: s.x, y: s.y, cy, visible: s.visible, near };
      });
    },
  };
}
