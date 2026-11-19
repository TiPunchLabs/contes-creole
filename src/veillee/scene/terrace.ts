import * as THREE from "three";
import { createRng, type Rng } from "@shared/random";
import { canvasTexture, crown, dabs } from "./paint";

/** Where things stand on the terrace, in metres (y up, the camera looks towards -z). */
export const LAYOUT = {
  tableTop: 0.75,
  table: { x: 0.3, z: 0.8, w: 1.3, d: 0.95 },
  /** On a phone held upright the table comes closer and to the centre (the portrait framing). */
  tableTall: { x: 0.45, z: 1.45 },
  chair: { x: 1.95, z: -1.55, yaw: -0.55 },
  wallZ: -4.6,
  wallHeight: 1.0,
  houseX: -1.7,
} as const;

export interface Terrace {
  group: THREE.Group;
  /** Meshes that receive the leaf shadows. */
  receivers: THREE.Mesh[];
  /** The chair's seat centre in world space (where the child lies). */
  seat: THREE.Vector3;
  /** Warm living-room light through the bay; flickers very slightly. */
  update(time: number): void;
  /** Moves the table between its wide and tall-screen places (0 → 1); returns its top centre. */
  placeTable(tall: number, out: THREE.Vector3): THREE.Vector3;
}

/** Glossy blue-grey tiles, grout lines, uneven sheen (the floor of the references). */
function tileTexture(rng: Rng): THREE.CanvasTexture {
  const t = canvasTexture(1024, 1024, (c, w, h) => {
    const n = 8;
    const s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = rng();
        c.fillStyle = `hsl(${226 + v * 14}, ${18 + v * 10}%, ${44 + v * 10}%)`;
        c.fillRect(i * s, j * s, s, s);
        dabs(c, rng, i * s, j * s, s, s, ["#8d93c4", "#5d5f98", "#b59bc3"], 10, s * 0.25, 0.12);
      }
    c.strokeStyle = "rgba(40,36,70,0.55)";
    c.lineWidth = 5;
    for (let i = 0; i <= n; i++) {
      c.beginPath();
      c.moveTo(i * s, 0);
      c.lineTo(i * s, h);
      c.moveTo(0, i * s);
      c.lineTo(w, i * s);
      c.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Warm painted stucco (walls, low wall) with brush grain. */
function stuccoTexture(rng: Rng, base: string, shades: readonly string[]): THREE.CanvasTexture {
  const t = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    dabs(c, rng, 0, 0, w, h, shades, 500, 16, 0.12);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Wood with long grain strokes. */
function woodTexture(rng: Rng, base: string, grain: string): THREE.CanvasTexture {
  const t = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = grain;
    for (let i = 0; i < 90; i++) {
      c.globalAlpha = 0.1 + rng() * 0.2;
      c.lineWidth = 1 + rng() * 3;
      const y = rng() * h;
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(w * 0.3, y + (rng() - 0.5) * 20, w * 0.6, y + (rng() - 0.5) * 20, w, y);
      c.stroke();
    }
    c.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * The living room seen through the sliding bay: warm lamp light (an ordinary floor lamp), a sofa,
 * cushions, a picture; painted, emissive, so the bay glows in the dusk.
 */
function interiorTexture(rng: Rng): THREE.CanvasTexture {
  return canvasTexture(1024, 512, (c, w, h) => {
    const g = c.createRadialGradient(w * 0.3, h * 0.35, 10, w * 0.3, h * 0.4, w * 0.7);
    g.addColorStop(0, "#ffd9a0");
    g.addColorStop(0.5, "#d98f5a");
    g.addColorStop(1, "#6a3f3a");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#7c5a6c";
    c.fillRect(w * 0.45, h * 0.58, w * 0.42, h * 0.22);
    c.fillStyle = "#9a7088";
    c.fillRect(w * 0.45, h * 0.5, w * 0.42, h * 0.1);
    for (const [x, col] of [
      [0.5, "#e5b44f"],
      [0.62, "#6f9fc0"],
      [0.76, "#e5b44f"],
    ] as const) {
      c.fillStyle = col;
      c.fillRect(w * x, h * 0.46, w * 0.08, h * 0.1);
    }
    c.fillStyle = "#4d3a3a";
    c.fillRect(w * 0.6, h * 0.16, w * 0.14, h * 0.16);
    c.fillStyle = "#c98f5f";
    c.fillRect(w * 0.61, h * 0.17, w * 0.12, h * 0.14);
    c.fillStyle = "#3c2c2c";
    c.fillRect(w * 0.25, h * 0.32, 6, h * 0.5);
    c.fillStyle = "#ffe7b8";
    c.beginPath();
    c.moveTo(w * 0.22, h * 0.34);
    c.lineTo(w * 0.29, h * 0.34);
    c.lineTo(w * 0.27, h * 0.24);
    c.lineTo(w * 0.24, h * 0.24);
    c.fill();
    dabs(c, rng, 0, 0, w, h, ["#ffcf90", "#b56b4a", "#ffe4b8"], 200, 18, 0.1);
  });
}

/** A box mesh with `material`, its base centred at (x, y, z). */
function box(
  material: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

/** An ordinary wooden garden armchair: slatted seat and back, flat armrests, four legs. */
function createChair(wood: THREE.Material): THREE.Group {
  const chair = new THREE.Group();
  for (const x of [-0.27, 0.27])
    for (const z of [-0.24, 0.24]) chair.add(box(wood, 0.05, 0.42, 0.05, x, 0, z));
  for (let i = 0; i < 5; i++) chair.add(box(wood, 0.6, 0.03, 0.09, 0, 0.42, -0.22 + i * 0.11));
  const back = new THREE.Group();
  for (let i = 0; i < 4; i++) back.add(box(wood, 0.6, 0.1, 0.03, 0, 0.05 + i * 0.14, 0));
  back.position.set(0, 0.45, -0.27);
  back.rotation.x = -0.28;
  chair.add(back);
  for (const x of [-0.31, 0.31]) {
    chair.add(box(wood, 0.07, 0.03, 0.62, x, 0.64, 0));
    chair.add(box(wood, 0.04, 0.22, 0.04, x, 0.42, 0.26));
  }
  return chair;
}

/** A terracotta pot with a broad-leaved plant (painted leaves on crossed cards). */
function createPlant(rng: Rng): THREE.Group {
  const plant = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.17, 0.42, 20),
    new THREE.MeshStandardMaterial({ color: "#b5643c", roughness: 0.8 }),
  );
  pot.position.y = 0.21;
  const leaves = canvasTexture(256, 256, (c, w, h) =>
    crown(c, rng, w / 2, h * 0.55, w * 0.3, "#2f5a36", "#4c8045", "#7fb05a"),
  );
  const material = new THREE.MeshStandardMaterial({
    map: leaves,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.7,
  });
  for (const a of [0, Math.PI / 2]) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), material);
    card.position.y = 0.8;
    card.rotation.y = a;
    plant.add(card);
  }
  plant.add(pot);
  return plant;
}

/**
 * The terrace of a lived-in house today: tiled floor, low rendered wall over the neighbourhood,
 * the house wall with its sliding bay glowing from the living room, the roof's overhang, a table
 * for the book, an ordinary armchair and a potted plant.
 */
export function createTerrace(seed: number): Terrace {
  const rng = createRng(seed);
  const group = new THREE.Group();
  group.name = "terrace";
  const receivers: THREE.Mesh[] = [];

  const tiles = tileTexture(rng);
  tiles.repeat.set(2.4, 2.4);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10.5),
    new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.32, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(2.2, 0, -1.2);
  floor.receiveShadow = true;
  receivers.push(floor);

  const stucco = stuccoTexture(rng, "#e9c6a6", ["#f6dcc0", "#d6a58c", "#c99aa4"]);
  stucco.repeat.set(4, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: stucco, roughness: 0.9 });
  const lowWall = box(wallMat, 9, LAYOUT.wallHeight, 0.22, 2.6, 0, LAYOUT.wallZ);
  const cap = box(
    new THREE.MeshStandardMaterial({ color: "#d8b39b", roughness: 0.85 }),
    9.1,
    0.06,
    0.3,
    2.6,
    LAYOUT.wallHeight,
    LAYOUT.wallZ,
  );
  lowWall.receiveShadow = cap.receiveShadow = true;
  receivers.push(lowWall);

  const houseStucco = stuccoTexture(rng, "#e8c9b5", ["#f8e1cc", "#cfa18e", "#b993a8"]);
  houseStucco.repeat.set(2, 1);
  const houseMat = new THREE.MeshStandardMaterial({ map: houseStucco, roughness: 0.9 });
  const house = new THREE.Group();
  // The wall faces +x: pieces around the bay opening (z from -0.5 to -3.3, up to 2.3 m).
  house.add(
    box(houseMat, 0.25, 3.2, 2.5, LAYOUT.houseX, 0, 0.75),
    box(houseMat, 0.25, 3.2, 1.3, LAYOUT.houseX, 0, -3.95),
    box(houseMat, 0.25, 0.9, 2.8, LAYOUT.houseX, 2.3, -1.9),
  );
  const interior = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.3),
    new THREE.MeshBasicMaterial({ map: interiorTexture(rng), toneMapped: false }),
  );
  interior.rotation.y = Math.PI / 2;
  interior.position.set(LAYOUT.houseX - 0.3, 1.15, -1.9);
  const frame = new THREE.MeshStandardMaterial({
    color: "#c9c4c0",
    roughness: 0.5,
    metalness: 0.4,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: "#9fb4d9",
    transparent: true,
    opacity: 0.18,
    roughness: 0.1,
  });
  for (const z of [-0.5, -1.9, -3.3])
    house.add(box(frame, 0.08, 2.3, 0.06, LAYOUT.houseX + 0.1, 0, z));
  house.add(box(frame, 0.08, 0.06, 2.8, LAYOUT.houseX + 0.1, 2.25, -1.9));
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.2), glass);
  pane.rotation.y = Math.PI / 2;
  pane.position.set(LAYOUT.houseX + 0.12, 1.12, -1.2);
  house.add(pane, interior);
  const overhang = box(
    new THREE.MeshStandardMaterial({ color: "#d9c2b2", roughness: 0.8 }),
    1.6,
    0.14,
    6.8,
    LAYOUT.houseX + 0.65,
    3.15,
    -1.2,
  );
  house.add(overhang);
  house.traverse((o) => {
    if (o instanceof THREE.Mesh && o !== interior && o !== pane) {
      o.receiveShadow = true;
      receivers.push(o);
    }
  });
  // The living room's light spilling on the tiles.
  const roomLight = new THREE.PointLight("#ffb46e", 2.2, 5.5, 1.6);
  roomLight.position.set(LAYOUT.houseX + 0.4, 1.3, -1.9);

  const wood = new THREE.MeshStandardMaterial({
    map: woodTexture(rng, "#5a3524", "#2e1810"),
    roughness: 0.55,
  });
  const { table } = LAYOUT;
  const tableGroup = new THREE.Group();
  // Built around the wide place; placeTable() shifts the whole group.
  const top = box(wood, table.w, 0.05, table.d, table.x, LAYOUT.tableTop - 0.05, table.z);
  top.receiveShadow = true;
  receivers.push(top);
  tableGroup.add(top);
  for (const dx of [-1, 1])
    for (const dz of [-1, 1])
      tableGroup.add(
        box(
          wood,
          0.06,
          LAYOUT.tableTop - 0.05,
          0.06,
          table.x + dx * (table.w / 2 - 0.08),
          0,
          table.z + dz * (table.d / 2 - 0.08),
        ),
      );

  const chairWood = new THREE.MeshStandardMaterial({
    map: woodTexture(rng, "#c9a27a", "#8a6446"),
    roughness: 0.7,
  });
  const chair = createChair(chairWood);
  chair.position.set(LAYOUT.chair.x, 0, LAYOUT.chair.z);
  chair.rotation.y = LAYOUT.chair.yaw;
  chair.traverse((o) => {
    if (o instanceof THREE.Mesh) o.receiveShadow = true;
  });

  const plant = createPlant(rng);
  plant.position.set(-0.9, 0, -3.9);

  group.add(floor, lowWall, cap, house, roomLight, tableGroup, chair, plant);
  const seat = new THREE.Vector3(0, 0.45, 0).applyMatrix4(
    new THREE.Matrix4().compose(
      chair.position,
      new THREE.Quaternion().setFromEuler(chair.rotation),
      new THREE.Vector3(1, 1, 1),
    ),
  );
  return {
    group,
    receivers,
    seat,
    placeTable(tall, out) {
      const dx = (LAYOUT.tableTall.x - table.x) * tall;
      const dz = (LAYOUT.tableTall.z - table.z) * tall;
      tableGroup.position.set(dx, 0, dz);
      return out.set(table.x + dx, LAYOUT.tableTop, table.z + dz);
    },
    update(time) {
      roomLight.intensity = 2.2 + Math.sin(time * 0.7) * 0.05 + Math.sin(time * 2.3) * 0.03;
    },
  };
}
