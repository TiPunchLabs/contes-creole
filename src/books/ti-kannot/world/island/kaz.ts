// Guadeloupean cases: wooden body on a stone base, tin roof with real overhangs, gallery or door
// canopy, louvred shutters. Local frame: front (gallery, door, steps) towards +z, ground at y = 0.
import * as THREE from "three";
import { Kit } from "./kit";

export type KazStyle = "galerie" | "katpan" | "pignon";

export interface KazColors {
  wall: string;
  shutter: string;
  roof: string;
}

/** Footprint of a case, roof, annex and steps included: x in [left, right], z in [back, front]. */
export interface Footprint {
  left: number;
  right: number;
  back: number;
  front: number;
}

export interface Kaz {
  geometry: THREE.BufferGeometry;
  footprint: Footprint;
}

const FLOOR = 0.45;
const WALL = 1.45;
const TRIM = "#f3ecdc";
const STONE = "#a39a8a";
const CRAWL = "#5f574d";
const PIER = 2;
const GALLERY_POSTS = [-1.25, -0.42, 0.42, 1.25];
const DECK = "#9a7552";
const DARK_WOOD = "#6b4a33";
const RIDGE = "#6e5a4c";

/** Prism along x (length `len`) whose cross-section is the triangle (z, y) points. */
function prism(points: [number, number][], len: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  return new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false })
    .translate(0, 0, -len / 2)
    .rotateY(Math.PI / 2);
}

/** Closed hip roof: eaves rectangle ±a × ±b, ridge along the longer side at height h. */
function hipRoof(a: number, b: number, h: number): THREE.BufferGeometry {
  if (b > a) return hipRoof(b, a, h).rotateY(Math.PI / 2);
  const r = Math.max(a - b, 0.01);
  const v = [
    [-a, 0, b],
    [a, 0, b],
    [r, h, 0],
    [-r, h, 0],
    [a, 0, -b],
    [-a, 0, -b],
  ];
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [4, 5, 3],
    [4, 3, 2],
    [1, 4, 2],
    [5, 0, 3],
    [0, 5, 4],
    [0, 4, 1],
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      faces.flat().flatMap((i) => v[i]),
      3,
    ),
  );
  g.computeVertexNormals();
  return g;
}

/** Window with two closed louvred shutters on a wall facing +z at (x, y, z). */
function shuttered(kit: Kit, color: string, x: number, y: number, z: number, ry = 0): void {
  const at = (dx: number, dy: number, dz: number): number[] => [
    x + dx * Math.cos(ry) + dz * Math.sin(ry),
    y + dy,
    z - dx * Math.sin(ry) + dz * Math.cos(ry),
  ];
  kit.box(0.6, 0.72, 0.04, TRIM, at(0, 0, 0), [0, ry, 0]);
  for (const side of [-1, 1]) {
    kit.box(0.25, 0.62, 0.05, color, at(side * 0.135, 0, 0.02), [0, ry, 0]);
    for (let k = 0; k < 4; k++) {
      kit.box(0.23, 0.025, 0.03, "#1f2a2a", at(side * 0.135, -0.22 + k * 0.15, 0.05), [0, ry, 0]);
    }
  }
}

/** `color` darkened to `k` of its brightness, as a hex string. */
const shade = (color: string, k: number): string =>
  `#${new THREE.Color(color).multiplyScalar(k).getHexString()}`;

/** Painted clapboard: faint plank lines on the four walls and a weathered band at their foot. */
function clapboard(kit: Kit, wall: string, w: number, d: number): void {
  const line = shade(wall, 0.88);
  for (let k = 1; k <= 4; k++) {
    const y = FLOOR + (k * WALL) / 5;
    for (const side of [-1, 1]) {
      kit.box(w - 0.12, 0.025, 0.012, line, [0, y, side * (d / 2 + 0.006)]);
      kit.box(0.012, 0.025, d - 0.12, line, [side * (w / 2 + 0.006), y, 0]);
    }
  }
  kit.box(w + 0.012, 0.2, d + 0.012, shade(wall, 0.86), [0, FLOOR + 0.14, 0]);
}

/** A masonry pier from just under the floor down into the slope, at (x, z). */
function pier(kit: Kit, x: number, z: number, size = 0.26): void {
  kit.box(size, PIER, size, STONE, [x, FLOOR - 0.04 - PIER / 2, z]);
}

/**
 * Stone plinth under the sill, masonry piers reaching down into the slope and the shadowed crawl
 * space between them: on a slope the case stands on its piers instead of a tall solid block.
 */
function base(kit: Kit, w: number, d: number): void {
  kit.box(w - 0.24, PIER, d - 0.24, CRAWL, [0, FLOOR - 0.26 - PIER / 2, 0]);
  kit.box(w + 0.12, 0.26, d + 0.12, STONE, [0, FLOOR - 0.13, 0]);
  for (const x of [-w / 2, 0, w / 2]) {
    for (const z of [-d / 2, 0, d / 2]) if (x !== 0 || z !== 0) pier(kit, x, z);
  }
}

/** Stone base, sill, wooden walls and white corner boards of a w × d body. */
function body(kit: Kit, c: KazColors, w: number, d: number): void {
  base(kit, w, d);
  kit.box(w + 0.16, 0.08, d + 0.16, DARK_WOOD, [0, FLOOR, 0]);
  kit.box(w, WALL, d, c.wall, [0, FLOOR + WALL / 2, 0]);
  clapboard(kit, c.wall, w, d);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      kit.box(0.09, WALL, 0.09, TRIM, [(x * w) / 2, FLOOR + WALL / 2, (z * d) / 2]);
    }
  }
  kit.box(w + 0.04, 0.07, d + 0.04, TRIM, [0, FLOOR + WALL - 0.03, 0]);
}

/** Front door: white frame and two dark leaves, on the wall at z. */
function door(kit: Kit, c: KazColors, z: number, x = 0): void {
  kit.box(0.72, 1.12, 0.04, TRIM, [x, FLOOR + 0.56, z]);
  kit.box(0.3, 1.02, 0.05, c.shutter, [x - 0.155, FLOOR + 0.52, z + 0.02]);
  kit.box(0.3, 1.02, 0.05, c.shutter, [x + 0.155, FLOOR + 0.52, z + 0.02]);
}

/** Two steps from the floor down to the ground (the lower one sunk into it), in front of z. */
function steps(kit: Kit, z: number, x = 0): void {
  kit.box(0.8, 0.2, 0.32, DECK, [x, FLOOR - 0.1, z + 0.16]);
  kit.box(0.84, FLOOR + 0.3, 0.32, STONE, [x, (FLOOR - 0.2 - 0.5) / 2, z + 0.47]);
}

/** Gable roof over w × d (ridge along x) with an overhang `over`; the front eave can stop short. */
function gableRoof(
  kit: Kit,
  c: KazColors,
  w: number,
  d: number,
  pitch: number,
  over: number,
  frontOver = over,
): void {
  const run = d / 2;
  const rise = run * Math.tan(pitch);
  const top = FLOOR + WALL + rise;
  kit.add(
    prism(
      [
        [-run, 0],
        [run, 0],
        [0, rise],
      ],
      w,
    ),
    c.wall,
    [0, FLOOR + WALL, 0],
  );
  for (const [side, extra] of [
    [1, frontOver],
    [-1, over],
  ] as const) {
    const reach = run + extra;
    kit.box(
      w + over * 2,
      0.06,
      reach / Math.cos(pitch) + 0.04,
      c.roof,
      [0, top - (reach / 2) * Math.tan(pitch) + 0.04, (side * reach) / 2],
      [side * pitch, 0, 0],
    );
  }
  kit.box(w + over * 2 + 0.04, 0.08, 0.16, RIDGE, [0, top + 0.07, 0]);
}

/** Case with a front gallery under a lean-to roof that breaks the main slope. */
function galerie(c: KazColors): Kaz {
  const kit = new Kit();
  const w = 2.6;
  const d = 2;
  const g = 1.05;
  body(kit, c, w, d);
  gableRoof(kit, c, w, d, 0.62, 0.32, 0.02);
  const front = d / 2;
  kit.box(w + 0.2, 0.08, g, DECK, [0, FLOOR, front + g / 2]);
  const eave = FLOOR + WALL;
  const low = eave - 0.42;
  const postZ = front + g - 0.08;
  for (const x of GALLERY_POSTS) {
    kit.box(0.08, low - FLOOR, 0.08, TRIM, [x, (low + FLOOR) / 2, postZ]);
    pier(kit, x, postZ, 0.2);
  }
  for (const [a, b] of [
    [-1.25, -0.42],
    [0.42, 1.25],
  ]) {
    kit.box(b - a, 0.05, 0.05, TRIM, [(a + b) / 2, FLOOR + 0.5, postZ]);
    for (let x = a + 0.14; x < b - 0.05; x += 0.14)
      kit.box(0.03, 0.42, 0.03, TRIM, [x, FLOOR + 0.27, postZ]);
  }
  const slope = Math.atan2(eave - low, g + 0.25);
  const len = Math.hypot(g + 0.25, eave - low);
  kit.box(
    w + 0.5,
    0.05,
    len,
    c.roof,
    [0, (eave + low) / 2 + 0.06, front + (g + 0.25) / 2],
    [slope, 0, 0],
  );
  door(kit, c, front + 0.02);
  shuttered(kit, c.shutter, -0.85, FLOOR + 0.82, front + 0.02);
  shuttered(kit, c.shutter, 0.85, FLOOR + 0.82, front + 0.02);
  shuttered(kit, c.shutter, w / 2 + 0.02, FLOOR + 0.82, 0, Math.PI / 2);
  shuttered(kit, c.shutter, -w / 2 - 0.02, FLOOR + 0.82, 0, -Math.PI / 2);
  steps(kit, front + g);
  return {
    geometry: kit.build(),
    footprint: {
      left: -w / 2 - 0.34,
      right: w / 2 + 0.34,
      back: -d / 2 - 0.34,
      front: front + g + 0.6,
    },
  };
}

/** Square-ish case under a four-sided hip roof, door gallery under the roof's own overhang. */
function katpan(c: KazColors): Kaz {
  const kit = new Kit();
  const w = 2.5;
  const d = 2.2;
  body(kit, c, w, d);
  const a = w / 2 + 0.4;
  const b = d / 2 + 0.85;
  kit.add(hipRoof(a, b, 1.15), c.roof, [0, FLOOR + WALL - 0.02, 0.45]);
  kit.box(0.16, 0.08, (b - a) * 2 + 0.1, RIDGE, [0, FLOOR + WALL + 1.17, 0.45]);
  const front = d / 2;
  kit.box(w + 0.1, 0.08, 0.95, DECK, [0, FLOOR, front + 0.47]);
  for (const x of [-1.2, 1.2]) {
    kit.box(0.08, WALL, 0.08, TRIM, [x, FLOOR + WALL / 2, front + 0.88]);
    pier(kit, x, front + 0.88, 0.2);
  }
  kit.box(w + 0.1, 0.07, 0.07, TRIM, [0, FLOOR + WALL - 0.04, front + 0.88]);
  door(kit, c, front + 0.02, -0.45);
  shuttered(kit, c.shutter, 0.6, FLOOR + 0.82, front + 0.02);
  shuttered(kit, c.shutter, w / 2 + 0.02, FLOOR + 0.82, 0, Math.PI / 2);
  shuttered(kit, c.shutter, -w / 2 - 0.02, FLOOR + 0.82, 0, -Math.PI / 2);
  steps(kit, front + 0.95, -0.45);
  return {
    geometry: kit.build(),
    footprint: { left: -a - 0.02, right: a + 0.02, back: 0.45 - b, front: front + 1.6 },
  };
}

/** Narrow case with its gable to the yard, a canopy over the door and a lean-to kitchen. */
function pignon(c: KazColors): Kaz {
  const kit = new Kit();
  const w = 2.4;
  const d = 2.1;
  body(kit, c, d, w);
  // Gable to the front: build the roof with the ridge along z.
  const roof = new Kit();
  gableRoof(roof, c, w, d, 0.7, 0.3);
  for (const part of roof.parts) kit.parts.push(part.rotateY(Math.PI / 2));
  const front = w / 2;
  const eave = FLOOR + 1.25;
  kit.box(1.1, 0.05, 0.6, c.roof, [0, eave + 0.1, front + 0.28], [0.35, 0, 0]);
  for (const x of [-0.45, 0.45])
    kit.box(0.05, 0.05, 0.5, TRIM, [x, eave - 0.05, front + 0.22], [-0.6, 0, 0]);
  door(kit, c, front + 0.02);
  shuttered(kit, c.shutter, d / 2 + 0.02, FLOOR + 0.82, 0.45, Math.PI / 2);
  shuttered(kit, c.shutter, -d / 2 - 0.02, FLOOR + 0.82, 0.45, -Math.PI / 2);
  shuttered(kit, c.shutter, -d / 2 - 0.02, FLOOR + 0.82, -0.6, -Math.PI / 2);
  steps(kit, front);
  // Kitchen: a small plank shed against the left side, under a one-slope roof.
  const kx = -d / 2 - 0.55;
  kit.box(1, 1.6, 1.1, "#9c7e5e", [kx, 0.1, -0.35]);
  kit.box(1.3, 0.05, 1.4, c.roof, [kx - 0.05, 1.02, -0.35], [0, 0, 0.3]);
  kit.box(0.4, 0.7, 0.04, DARK_WOOD, [kx - 0.1, 0.35, 0.21]);
  return {
    geometry: kit.build(),
    footprint: { left: kx - 0.7, right: d / 2 + 0.34, back: -w / 2 - 0.34, front: front + 1.05 },
  };
}

export const KAZ: Record<KazStyle, (colors: KazColors) => Kaz> = { galerie, katpan, pignon };
