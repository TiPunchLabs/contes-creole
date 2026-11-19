import * as THREE from "three";
import { createRng, type Rng } from "@shared/random";
import { layerMaterial } from "./layer-material";
import { canvasTexture, crown, dabs, palm } from "./paint";

export interface Backdrop {
  group: THREE.Group;
  /** Every animated layer material, stepped by the scene clock. */
  materials: THREE.ShaderMaterial[];
}

/** A painted plane `w`×`h` m, its bottom edge at `y`, centred on `x`, at depth `z`. */
function plane(
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  order: number,
  segments = 1,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, segments, segments * 2), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.renderOrder = order;
  return mesh;
}

/** The evening sky: deep indigo overhead, violet, rose, then apricot at the horizon, brushed. */
function skyTexture(rng: Rng): THREE.CanvasTexture {
  return canvasTexture(512, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1f2569");
    g.addColorStop(0.32, "#3c3f9c");
    g.addColorStop(0.55, "#7a5bb5");
    g.addColorStop(0.72, "#d68ab8");
    g.addColorStop(0.86, "#f3a98a");
    g.addColorStop(1, "#f8c48e");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    dabs(c, rng, 0, 0, w, h * 0.55, ["#4b4fb0", "#2a2f7d", "#5d56b8"], 260, 26, 0.16);
    dabs(c, rng, 0, h * 0.55, w, h * 0.45, ["#f6b3a0", "#e892b6", "#fbd0a0"], 220, 22, 0.16);
    // A few early stars, high up.
    for (let i = 0; i < 26; i++) {
      c.globalAlpha = 0.3 + rng() * 0.5;
      c.fillStyle = "#fff6dc";
      c.beginPath();
      c.arc(rng() * w, rng() * h * 0.3, 0.8 + rng() * 1.3, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  });
}

/**
 * A strip of clouds tiling horizontally: long rose and violet streaks lit from below by the sunset,
 * on a transparent ground, so the sky shows between them.
 */
function cloudTexture(rng: Rng, warm: boolean): THREE.CanvasTexture {
  const texture = canvasTexture(2048, 512, (c, w, h) => {
    const shades = warm
      ? ["#f4a6b8", "#ffc9a8", "#c77fb8", "#e892a8"]
      : ["#8f78c8", "#b18ad0", "#6f63b5", "#d79bc6"];
    for (let i = 0; i < 46; i++) {
      const cx = rng() * w;
      const cy = h * (0.2 + rng() * 0.65);
      const len = w * (0.06 + rng() * 0.16);
      const thick = h * (0.03 + rng() * 0.07);
      for (const dx of [-w, 0, w]) {
        const g = c.createLinearGradient(0, cy - thick, 0, cy + thick);
        const color = shades[Math.floor(rng() * shades.length)] ?? "#fff";
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.45, color);
        g.addColorStop(1, warm ? "#ffd7b0" : "#a37fc8");
        c.globalAlpha = 0.35 + rng() * 0.4;
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(cx + dx, cy, len, thick, (rng() - 0.5) * 0.08, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** A ridge silhouette: a skyline of soft peaks, painted with a lit top edge and darker foot. */
function ridgeTexture(
  rng: Rng,
  peaks: readonly [number, number][],
  top: string,
  bottom: string,
  rim: string,
): THREE.CanvasTexture {
  return canvasTexture(2048, 512, (c, w, h) => {
    const line = (x: number): number => {
      let y = 0;
      for (const [px, ph] of peaks) y = Math.max(y, ph * Math.exp(-(((x - px) / 0.13) ** 2)));
      return h * (1 - 0.15 - y * 0.82);
    };
    c.beginPath();
    c.moveTo(0, h);
    const rough = (x: number): number =>
      Math.sin(x * 0.011) * 9 + Math.sin(x * 0.037 + 1) * 5 + Math.sin(x * 0.09 + 2) * 2.5;
    for (let x = 0; x <= w; x += 6) c.lineTo(x, line(x / w) + rough(x));
    c.lineTo(w, h);
    c.closePath();
    const g = c.createLinearGradient(0, h * 0.2, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    c.fillStyle = g;
    c.fill();
    c.save();
    c.clip();
    dabs(c, rng, 0, 0, w, h, [rim, bottom, top], 900, 14, 0.12);
    // Ravines: darker diagonal strokes down the slopes.
    c.strokeStyle = bottom;
    c.lineWidth = 5;
    for (let i = 0; i < 40; i++) {
      const x = rng() * w;
      const y = line(x / w) + 10;
      c.globalAlpha = 0.25;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rng() - 0.5) * 80, y + 90 + rng() * 120);
      c.stroke();
    }
    c.restore();
    c.globalAlpha = 0.7;
    c.strokeStyle = rim;
    c.lineWidth = 4;
    c.beginPath();
    for (let x = 0; x <= w; x += 6) c.lineTo(x, line(x / w) + rough(x) + 2);
    c.stroke();
    c.globalAlpha = 1;
  });
}

/** Today's neighbourhood: pastel concrete houses, tin and tile roofs, lit windows, low walls. */
function housesTexture(rng: Rng): THREE.CanvasTexture {
  return canvasTexture(2048, 512, (c, w, h) => {
    const walls = ["#efe6dc", "#f2d9c4", "#dfe4ea", "#f4e9c8", "#e8d3dc"];
    const roofs = ["#a5503f", "#8a8f99", "#b4654a", "#6f7c8c"];
    for (let i = 0; i < 26; i++) {
      const hw = 60 + rng() * 90;
      const hh = 45 + rng() * 50;
      const x = rng() * w;
      const base = h * (0.62 + rng() * 0.33);
      c.fillStyle = walls[Math.floor(rng() * walls.length)] ?? "#eee";
      c.fillRect(x, base - hh, hw, hh);
      c.fillStyle = "rgba(60,50,90,0.25)";
      c.fillRect(x + hw * 0.7, base - hh, hw * 0.3, hh);
      c.fillStyle = roofs[Math.floor(rng() * roofs.length)] ?? "#999";
      c.beginPath();
      if (rng() < 0.5) {
        c.moveTo(x - 8, base - hh);
        c.lineTo(x + hw / 2, base - hh - 26);
        c.lineTo(x + hw + 8, base - hh);
      } else c.rect(x - 6, base - hh - 8, hw + 12, 10);
      c.fill();
      for (let k = 0; k < 3; k++) {
        if (rng() < 0.35) continue;
        const lit = rng() < 0.6;
        c.fillStyle = lit ? "#ffcf7a" : "#5d6a8a";
        c.fillRect(x + 10 + k * (hw / 3), base - hh * 0.65, hw / 6, hh * 0.3);
      }
    }
    c.globalAlpha = 1;
  });
}

/** One group of neighbourhood tree tops (and a palm or two), swaying together. */
function canopyTexture(rng: Rng): THREE.CanvasTexture {
  return canvasTexture(512, 512, (c, w, h) => {
    if (rng() < 0.45) palm(c, rng, w * (0.2 + rng() * 0.6), h, h * 0.62, "#5b4a4a", "#2f5a3e");
    for (let i = 0; i < 4; i++)
      crown(
        c,
        rng,
        w * (0.2 + rng() * 0.6),
        h * (0.55 + rng() * 0.25),
        w * (0.12 + rng() * 0.08),
        "#1f3d33",
        "#2f5d43",
        "#4f8452",
      );
  });
}

/**
 * The far planes, each its own painted card in depth: sky, two cloud sheets drifting at their own
 * pace, the Basse-Terre ridges (fixed, a light band crossing the near slope), the houses (fixed) and
 * groups of tree tops swaying one after the other.
 */
export function createBackdrop(seed: number): Backdrop {
  const rng = createRng(seed);
  const group = new THREE.Group();
  group.name = "backdrop";
  const materials: THREE.ShaderMaterial[] = [];
  const add = (m: THREE.ShaderMaterial): THREE.ShaderMaterial => {
    materials.push(m);
    return m;
  };

  group.add(plane(add(layerMaterial({ map: skyTexture(rng) })), 0, -40, -150, 520, 220, -10));
  group.add(
    plane(
      add(layerMaterial({ map: cloudTexture(rng, false), scroll: 1 / 520, opacity: 0.85 })),
      0,
      10,
      -125,
      420,
      70,
      -9,
    ),
    plane(
      add(layerMaterial({ map: cloudTexture(rng, true), scroll: -1 / 380, opacity: 0.9 })),
      0,
      -2,
      -100,
      330,
      42,
      -8,
    ),
  );
  // La Soufrière's massif far away, the greener Monts Caraïbes-like hills nearer.
  group.add(
    plane(
      add(
        layerMaterial({
          map: ridgeTexture(
            rng,
            [
              [0.35, 0.55],
              [0.5, 0.78],
              [0.62, 0.6],
              [0.85, 0.35],
            ],
            "#5c5aa0",
            "#3e4f86",
            "#c79cc7",
          ),
        }),
      ),
      4,
      -8,
      -85,
      250,
      30,
      -7,
    ),
    plane(
      add(
        layerMaterial({
          map: ridgeTexture(
            rng,
            [
              [0.2, 0.42],
              [0.45, 0.6],
              [0.58, 0.5],
              [0.78, 0.38],
            ],
            "#3f7a5c",
            "#244a40",
            "#e0a06e",
          ),
          band: 0.45,
          bandPeriod: 23,
        }),
      ),
      6,
      -6,
      -58,
      170,
      16,
      -6,
    ),
  );
  group.add(plane(add(layerMaterial({ map: housesTexture(rng) })), 4, -2.2, -32, 92, 5.2, -5));
  // Tree-top groups along the neighbourhood, each with its own phase: the breeze reaches them in turn.
  for (let i = 0; i < 9; i++) {
    const x = -34 + i * 8.5 + rng() * 3;
    const z = -26 - rng() * 6;
    const size = 6 + rng() * 3;
    group.add(
      plane(
        add(
          layerMaterial({
            map: canopyTexture(rng),
            sway: 0.035,
            phase: i * 0.35,
            period: 4.1 + rng() * 2.2,
          }),
        ),
        x,
        -2.6,
        z,
        size,
        size,
        -4,
        4,
      ),
    );
  }
  return { group, materials };
}
