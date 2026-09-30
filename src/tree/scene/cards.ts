import * as THREE from "three";
import type { BookManifest } from "@app/contract";
import { clamp, lerp } from "@shared/math";
import type { ScreenPoint } from "@shared/three/stage";
import { cardT, hubCam } from "./camera";
import { paintLockedCover } from "./locked-cover";

const COVER_W = 512;
const COVER_H = 720;

export interface CardView {
  index: number;
  x: number;
  y: number;
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

/** Paints the tree-owned part of every card: double frame, sub-title, title, theme. */
function paintFrame(c: CanvasRenderingContext2D, book: BookManifest, W: number, H: number): void {
  const { ready, card } = book;
  c.strokeStyle = ready ? "rgba(242,196,109,.7)" : "rgba(160,180,190,.3)";
  c.lineWidth = 3;
  c.strokeRect(22, 22, W - 44, H - 44);
  c.lineWidth = 1;
  c.strokeRect(32, 32, W - 64, H - 64);
  c.textAlign = "center";
  c.fillStyle = ready ? "#f6ead0" : "rgba(200,210,220,.55)";
  c.font = `500 26px 'Quicksand', sans-serif`;
  c.fillText(card.sub.toUpperCase(), W / 2, H * 0.745);
  c.font = `italic 600 54px 'Cormorant Garamond', serif`;
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
  lines.forEach((line, i) => c.fillText(line, W / 2, H * 0.83 + i * 54));
  c.font = `400 20px 'Quicksand', sans-serif`;
  c.fillStyle = ready ? "rgba(90,230,210,.9)" : "rgba(200,210,220,.4)";
  c.fillText(card.theme, W / 2, H * 0.1);
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
    if (book.ready && book.cover) book.cover(ctx, COVER_W, COVER_H);
    else paintLockedCover(ctx, COVER_W, COVER_H);
    paintFrame(ctx, book, COVER_W, COVER_H);
    texture.needsUpdate = true;
  };
  draw();
  void document.fonts?.ready.then(draw);
  return texture;
}

/** Book cards hanging from the branches on the camera spiral, with a thread to the nearest tip. */
export function createCards(books: BookManifest[], tips: THREE.Vector3[]): Cards {
  const group = new THREE.Group();
  const threadMat = new THREE.LineBasicMaterial({
    color: "#8fd9cf",
    transparent: true,
    opacity: 0.35,
  });
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const cards = books.map((book, i) => {
    const t = cardT(i);
    const a = hubCam(t, camPos, look);
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * 12.2, camPos.y + 0.3, Math.sin(a) * 12.2);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.1),
      new THREE.MeshBasicMaterial({ map: coverTexture(book), transparent: true }),
    );
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.1),
      new THREE.MeshBasicMaterial({ color: "#0a1a22", side: THREE.BackSide }),
    );
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 2.7),
      new THREE.MeshBasicMaterial({
        color: book.ready ? "#2fa89a" : "#2a3a44",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
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
        const scale = 1 + near * 0.08 + c.hover * 0.08;
        c.g.scale.setScalar(scale);
        c.halo.material.opacity = 0.12 + near * 0.2 + c.hover * 0.35;
        const thread = c.line.geometry.attributes.position;
        thread.setXYZ(1, c.g.position.x, c.g.position.y + 1.05 * scale, c.g.position.z);
        thread.needsUpdate = true;
        below.copy(c.g.position);
        below.y -= 1.25 * scale;
        const s = project(below);
        return { index: i, x: s.x, y: s.y, visible: s.visible, near };
      });
    },
  };
}
