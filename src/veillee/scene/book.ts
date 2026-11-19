import * as THREE from "three";
import type { Flip } from "../flip";
import type { Page, Section } from "../pages";
import { canvasTexture } from "./paint";
import {
  PAGE_H,
  PAGE_W,
  artPlacement,
  paintPage,
  type PageCanvas,
  type Side,
  type UvRect,
} from "./page-art";

/** Height of each page block above the board, and the gutter's dip, in metres. */
const BLOCK = 0.03;
const GUTTER_DIP = 0.016;
/** Height of a lying leaf above the page under it. */
const LEAF_GAP = 0.0015;
const SEG_U = 32;
const SEG_V = 8;
/** How much the free edge of a turning leaf lags behind its spine side (radians). */
const CURL = 1.15;
/** Seconds per tremble of the paper corner and of the bookmark fringes. */
const CORNER_SECONDS = 7.7;
const FRINGE_SECONDS = 2.1;
/** Bookmarks lie from 0.1 m inside the far edge to 0.1 m beyond it; RIBBON_EDGE is the edge, locally. */
const RIBBON_OFFSET = 0.05;
const RIBBON_EDGE = RIBBON_OFFSET;

/** Height of a lying page at distance `u` (0 spine → 1 edge): a dip into the gutter, then flat. */
export function pageHeight(u: number): number {
  const t = Math.min(1, u * 4);
  return BLOCK - GUTTER_DIP * (1 - Math.sin((t * Math.PI) / 2));
}

/**
 * Angle of a turning leaf at `u` (0 spine → 1 edge) and `v` (0 near edge → 1 far edge) for turn
 * progress `p` (0 flat right → 1 flat left): the spine side leads, the free edge lags (curl), the
 * near corner lifts first. Always within [0, π], and flat (0 or π) at both ends of the turn.
 */
export function leafAngle(p: number, u: number, v: number): number {
  const lift = Math.sin(Math.PI * p);
  const a = p * Math.PI - CURL * lift * u ** 1.6 + 0.35 * lift * u * u * (1 - v);
  return Math.max(0, Math.min(Math.PI, a));
}

export interface BookAnchors {
  /** The selected tale's art on the flat spread (its four world corners). */
  art: THREE.Vector3[] | null;
  /** Top-left corner of the left page's text area (title of a tale without its title in the art). */
  title: THREE.Vector3;
  /** The right page's text area (portraits), four world corners. */
  text: THREE.Vector3[];
  /** Each bookmark's tip, in section order. */
  ribbons: THREE.Vector3[];
}

export interface Book {
  group: THREE.Group;
  /** World centre of the selected tale's art: where the entry dive flies to. */
  artCentre(out: THREE.Vector3): THREE.Vector3;
  /** Page height in metres (the dive's distance is scaled on it). */
  readonly pageHeight: number;
  /** The lying pages' geometries: ambient layers ride on the very same surface. */
  readonly surfaces: Record<Side, THREE.BufferGeometry>;
  anchors(): BookAnchors;
  /** Ambient effect strength for the shown spread (0 while a leaf is moving). */
  readonly settled: boolean;
  /** Repaints every page whose art just loaded. */
  refresh(): void;
  update(time: number, dt: number, calm: boolean): void;
}

/** A painted page; `stillPainted` once a portrait shows its reduced-motion pose. */
type Tex = PageCanvas & { stillPainted?: boolean };
const PORTRAIT_HZ = 24;

/**
 * A grid geometry for a page, `SEG_U`×`SEG_V`, its position written by the caller. `mirror` puts
 * uv.x = 1 - u (the back of a leaf, read once it lies on the left).
 */
function pageGeometry(mirror: boolean): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1, SEG_U, SEG_V);
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) if (mirror) uv.setX(i, 1 - uv.getX(i));
  return geometry;
}

/** Writes a lying page's surface into `geometry` (`side` decides which way u runs from the spine). */
function layPage(geometry: THREE.BufferGeometry, side: Side, corner: number): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const ux = uv.getX(i);
    const v = uv.getY(i);
    const u = side === "right" ? ux : 1 - ux;
    const lift = corner * Math.max(0, u - 0.7) ** 2 * Math.max(0, 0.35 - v) ** 2 * 40;
    pos.setXYZ(
      i,
      (side === "right" ? 1 : -1) * u * PAGE_W,
      pageHeight(u) + lift,
      (0.5 - v) * PAGE_H,
    );
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/** Writes the turning leaf's surface for progress `p` into the front and back geometries. */
function bendLeaf(front: THREE.BufferGeometry, back: THREE.BufferGeometry, p: number): void {
  const pos = front.attributes.position as THREE.BufferAttribute;
  const cols = SEG_U + 1;
  const du = 1 / SEG_U;
  // Lying flat (start and end of the turn) the leaf follows the gutter curve, just above the page.
  const flat = 1 - Math.sin(Math.PI * p);
  for (let row = 0; row <= SEG_V; row++) {
    const v = 1 - row / SEG_V;
    let x = 0;
    let y = pageHeight(0) + LEAF_GAP;
    for (let col = 0; col <= SEG_U; col++) {
      const u = col / SEG_U;
      const lie = (pageHeight(u) - pageHeight(0)) * flat;
      pos.setXYZ(row * cols + col, x, y + lie, (0.5 - v) * PAGE_H);
      const a = leafAngle(p, u + du / 2, v);
      x += Math.cos(a) * du * PAGE_W;
      y += Math.sin(a) * du * PAGE_W;
    }
  }
  pos.needsUpdate = true;
  front.computeVertexNormals();
  back.computeVertexNormals();
}

/** Red cloth for the boards, with its weave. */
function clothTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = "#a2332a";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(255,200,170,0.08)";
    for (let i = 0; i < w; i += 3) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, h);
      c.stroke();
    }
  });
}

/** The page edges seen on the side of each block: fine cream lines. */
function edgeTexture(): THREE.CanvasTexture {
  return canvasTexture(64, 256, (c, w, h) => {
    c.fillStyle = "#eadbb9";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(120,90,60,0.35)";
    for (let y = 0; y < h; y += 3) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
  });
}

/** A bookmark ribbon: a woven band with the universe's motif and a fringed end. */
function ribbonTexture(index: number): THREE.CanvasTexture {
  const palettes: [string, string][] = [
    ["#f3e2c4", "#c4462f"],
    ["#2e5a8c", "#f4efe2"],
    ["#e9dcc0", "#3f7a45"],
  ];
  const [ground, motif] = palettes[index % palettes.length] ?? ["#eee", "#c33"];
  return canvasTexture(64, 256, (c, w, h) => {
    c.fillStyle = ground;
    c.fillRect(0, 0, w, h * 0.8);
    c.strokeStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < h * 0.8; y += 4) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.fillStyle = motif;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      c.ellipse(w / 2 + Math.cos(a) * 9, h * 0.25 + Math.sin(a) * 9, 9, 5, a, 0, Math.PI * 2);
    }
    c.fill();
    c.fillStyle = ground;
    for (let x = 2; x < w; x += 5) c.fillRect(x, h * 0.8, 2.4, h * 0.2);
  });
}

/**
 * The single big book of the home: red cloth boards, two page blocks, a gutter, bookmarks with
 * fringes, the open spread and one turning leaf. Pages come from the sequence `pages`; which spread
 * is shown and which leaf turns comes from `flip`.
 */
export function createBook(
  pages: readonly Page[],
  sections: readonly Section[],
  flip: Flip,
  images: ReadonlyMap<string, HTMLImageElement>,
): Book {
  const group = new THREE.Group();
  group.name = "book";
  const cloth = new THREE.MeshStandardMaterial({ map: clothTexture(), roughness: 0.8 });
  const edges = new THREE.MeshStandardMaterial({ map: edgeTexture(), roughness: 0.9 });
  for (const side of [-1, 1]) {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE_W + 0.02, 0.006, PAGE_H + 0.024),
      cloth,
    );
    board.position.set((side * (PAGE_W + 0.02)) / 2, 0.003, 0);
    // The flat three quarters of the block reach the page; under the gutter's dip it stays lower.
    const flatW = PAGE_W * 0.72;
    const block = new THREE.Mesh(new THREE.BoxGeometry(flatW, BLOCK - 0.008, PAGE_H), edges);
    block.position.set(side * (PAGE_W - flatW / 2), 0.006 + (BLOCK - 0.008) / 2, 0);
    const low = BLOCK - GUTTER_DIP - 0.004;
    const inner = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W - flatW, low, PAGE_H), edges);
    inner.position.set(side * ((PAGE_W - flatW) / 2), 0.006 + low / 2 - 0.004, 0);
    for (const m of [board, block, inner]) m.castShadow = m.receiveShadow = true;
    group.add(board, block, inner);
  }
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, PAGE_H + 0.024, 16, 1, false, Math.PI / 2, Math.PI),
    cloth,
  );
  spine.rotation.x = Math.PI / 2;
  spine.position.y = 0.012;
  group.add(spine);

  const material = (): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.FrontSide });
  const leftGeo = pageGeometry(false);
  const rightGeo = pageGeometry(false);
  layPage(leftGeo, "left", 0);
  layPage(rightGeo, "right", 0);
  const left = new THREE.Mesh(leftGeo, material());
  const right = new THREE.Mesh(rightGeo, material());
  left.receiveShadow = right.receiveShadow = true;
  const leafFront = pageGeometry(false);
  const leafBack = pageGeometry(true);
  leafBack.setAttribute("position", leafFront.attributes.position as THREE.BufferAttribute);
  const leafFrontMat = material();
  const leafBackMat = material();
  leafBackMat.side = THREE.BackSide;
  const leaf = new THREE.Group();
  leaf.add(new THREE.Mesh(leafFront, leafFrontMat), new THREE.Mesh(leafBack, leafBackMat));
  leaf.visible = false;
  leaf.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });
  group.add(left, right, leaf);

  // Bookmarks: one per section, out of the far edge of the right page, fringes trembling.
  const ribbons: { mesh: THREE.Mesh; tip: THREE.Vector3; rest: Float32Array }[] = [];
  sections.forEach((_, i) => {
    // Motif towards the reader, fringed end beyond the far edge of the book.
    const geometry = new THREE.PlaneGeometry(0.06, 0.2, 1, 10);
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        map: ribbonTexture(i),
        alphaTest: 0.4,
        side: THREE.DoubleSide,
        roughness: 0.85,
      }),
    );
    mesh.position.set(0.07 + i * 0.1, BLOCK + 0.004, -PAGE_H / 2 - RIBBON_OFFSET);
    mesh.castShadow = true;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    ribbons.push({
      mesh,
      tip: new THREE.Vector3(mesh.position.x, mesh.position.y + 0.03, -PAGE_H / 2 - 0.15),
      rest: Float32Array.from(pos.array as ArrayLike<number>),
    });
    group.add(mesh);
  });

  const cache = new Map<string, Tex>();
  const texture = (index: number, side: Side): Tex | null => {
    const page = pages[index];
    if (!page) return null;
    const key = `${index}:${side}`;
    let tex = cache.get(key);
    if (!tex) {
      tex = paintPage(page, side, images);
      cache.set(key, tex);
    }
    return tex;
  };
  /** Textures in use this frame; any other cached one beyond the budget is disposed. */
  const prune = (keep: Set<string>): void => {
    if (cache.size <= 8) return;
    for (const [key, tex] of cache)
      if (!keep.has(key)) {
        tex.texture.dispose();
        cache.delete(key);
      }
  };
  const assign = (mat: THREE.MeshStandardMaterial, tex: Tex | null): void => {
    const map = tex?.texture ?? null;
    if (mat.map !== map) {
      mat.map = map;
      mat.needsUpdate = true;
    }
  };

  let settled = true;
  let paintedAt = -Infinity;
  const centre = new THREE.Vector3();
  return {
    group,
    surfaces: { left: leftGeo, right: rightGeo },
    get pageHeight() {
      return PAGE_H * group.scale.x;
    },
    get settled() {
      return settled;
    },
    artCentre(out) {
      const page = pages[flip.target];
      if (page?.kind !== "tale") return out.set(0, BLOCK, 0).applyMatrix4(group.matrixWorld);
      const r = artPlacement(page.art.width, page.art.height);
      centre.set(((r.x0 + r.x1) / 2) * PAGE_W, BLOCK, (0.5 - (r.y0 + r.y1) / 2) * PAGE_H);
      return out.copy(centre).applyMatrix4(group.matrixWorld);
    },
    anchors() {
      const world = (x: number, z: number): THREE.Vector3 =>
        new THREE.Vector3(x, BLOCK, z).applyMatrix4(group.matrixWorld);
      const page = pages[flip.target];
      const quad = (x0: number, z0: number, x1: number, z1: number): THREE.Vector3[] => [
        world(x0, z0),
        world(x1, z0),
        world(x0, z1),
        world(x1, z1),
      ];
      let art: THREE.Vector3[] | null = null;
      if (page?.kind === "tale") {
        const r: UvRect = artPlacement(page.art.width, page.art.height);
        art = quad(r.x0 * PAGE_W, (0.5 - r.y0) * PAGE_H, r.x1 * PAGE_W, (0.5 - r.y1) * PAGE_H);
      }
      return {
        art,
        title: world(-PAGE_W * 0.9, -PAGE_H * 0.43),
        text: quad(PAGE_W * 0.12, PAGE_H * 0.42, PAGE_W * 0.88, -PAGE_H * 0.42),
        ribbons: ribbons.map((r) => r.tip.clone().applyMatrix4(group.matrixWorld)),
      };
    },
    refresh() {
      for (const tex of cache.values()) tex.texture.dispose();
      cache.clear();
    },
    update(time, dt, calm) {
      flip.step(dt);
      const turn = flip.turn;
      settled = turn === null;
      const keep = new Set<string>();
      const use = (index: number, side: Side): Tex | null => {
        keep.add(`${index}:${side}`);
        return texture(index, side);
      };
      let shownLeft: Tex | null;
      let shownRight: Tex | null;
      if (!turn) {
        shownLeft = use(flip.shown, "left");
        shownRight = use(flip.shown, "right");
        leaf.visible = false;
      } else if (turn.dir === 1) {
        shownLeft = use(turn.from, "left");
        shownRight = use(turn.to, "right");
        assign(leafFrontMat, use(turn.from, "right"));
        assign(leafBackMat, use(turn.to, "left"));
        bendLeaf(leafFront, leafBack, turn.progress);
        leaf.visible = true;
      } else {
        shownLeft = use(turn.to, "left");
        shownRight = use(turn.from, "right");
        assign(leafFrontMat, use(turn.to, "right"));
        assign(leafBackMat, use(turn.from, "left"));
        bendLeaf(leafFront, leafBack, 1 - turn.progress);
        leaf.visible = true;
      }
      assign(left.material as THREE.MeshStandardMaterial, shownLeft);
      assign(right.material as THREE.MeshStandardMaterial, shownRight);
      // Portrait drawings repaint at 24 Hz (a page canvas upload each time), and once when calm.
      if (time - paintedAt >= 1 / PORTRAIT_HZ || time < paintedAt) {
        paintedAt = time;
        for (const key of keep) {
          const tex = cache.get(key);
          if (tex?.animate && (!calm || !tex.stillPainted)) {
            tex.animate(time, calm);
            tex.stillPainted = calm;
          }
        }
      }
      prune(keep);

      const corner = calm ? 0 : (Math.sin((time / CORNER_SECONDS) * Math.PI * 2) + 1) * 0.5;
      layPage(rightGeo, "right", turn ? 0 : corner * 0.012);
      for (const ribbon of ribbons) {
        const pos = ribbon.mesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const z = ribbon.rest[i * 3 + 2] ?? 0;
          // Beyond the page edge (local z < EDGE) the ribbon droops, and its fringed end trembles.
          const out = Math.max(0, RIBBON_EDGE - z);
          const tremble = calm
            ? 0
            : Math.sin((time / FRINGE_SECONDS) * Math.PI * 2 + ribbon.mesh.position.x * 40) *
              out *
              out *
              0.6;
          pos.setY(i, (ribbon.rest[i * 3 + 1] ?? 0) - out * 0.12 + tremble);
          pos.setX(i, (ribbon.rest[i * 3] ?? 0) + tremble * 0.4);
        }
        pos.needsUpdate = true;
      }
    },
  };
}
