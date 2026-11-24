// Layout and cinematography of « Mila et le calebassier magique », keyed by story page id.
// Owner of layout and camera: the mission's executor (see docs/missions/2026-11-23-mila-calebassier).
//
// World axes: x east, y up, z south, metres (master layout: world/layout.json). The garden is always
// filmed from its south-east half: the tree and Mila's house are screen left or centre, the gate and
// Man Ninon's house screen right, so "towards Man Ninon" reads left to right on every exterior page
// and the 180° line (Mila's house – tree – gate) is never crossed. The two bedroom pages are filmed
// from inside the room, looking at its window wall; no shot passes through a wall.

/** A point or a direction: x, y, z. */
export type Vec3 = readonly [number, number, number];

/** A camera position: perspective lens, vertical field of view in degrees. */
export interface Lens {
  pos: Vec3;
  look: Vec3;
  fov: number;
}

/**
 * A painted foreground cut-out placed for one shot, relative to its reading lens: `forward` metres
 * ahead of the lens, `right` metres to the right of its axis, foot at height `foot`. It then stays
 * where it is in the garden, so the entry move slides it across the frame (parallax).
 */
export interface Foreground {
  /** Atlas cell: column, row. */
  cell: readonly [number, number];
  forward: number;
  right: number;
  foot: number;
  height: number;
  flip?: boolean;
}

/** Where a foreground cut-out of a shot stands in the garden: x and z of its foot. */
export function foregroundFoot(shot: Shot, f: Foreground): [number, number] {
  const [px, , pz] = shot.to.pos;
  const dx = shot.to.look[0] - px;
  const dz = shot.to.look[2] - pz;
  const d = Math.hypot(dx, dz);
  const ax = dx / d;
  const az = dz / d;
  return [px + ax * f.forward - az * f.right, pz + az * f.forward + ax * f.right];
}

/** One framing of a page: the camera eases from `from` to `to`, then holds for the reading. */
export interface Shot {
  from: Lens;
  to: Lens;
  /** Duration of the entry move (cosine ease in and out); 0 is a fixed camera. */
  seconds: number;
  /** Seconds the lens holds `from` before it moves (default 0): a move that follows a late action. */
  after?: number;
  foreground: Foreground[];
}

export interface PageStaging {
  /** Narrative purpose of the shot. */
  intent: string;
  /** Shot size and angle. */
  size: string;
  /** Camera move in words (entry → reading); the exit is always the paper dip to the next page. */
  move: string;
  /** Where the coordinates live: the garden (world) or Mila's house (local: x along the façade, +z out). */
  space: "garden" | "house";
  /** Landscape screens: the text sits in the left column, the subject is slid right of it. */
  wide: Shot;
  /** Portrait screens: the text sits at the top, the subject is slid below it. */
  tall: Shot;
  /** What must stay readable on a portrait phone (brief, shotlist `portrait_priority`). */
  portrait: string;
  /** Screen direction and eyeline continuity with the neighbouring pages. */
  continuity: string;
}

const NEAR = 0.1;
const FAR = 400;
/** Clipping planes shared by every lens. */
export const CLIP = { near: NEAR, far: FAR } as const;

/**
 * Room the reading text takes on the screen, as `theme.css` lays it out (pixels): in portrait the
 * text starts under the top buttons and runs to about 294 px (46 % of a short phone, where a longer
 * passage scrolls) and the reader's buttons take the bottom; in landscape the text is a left column.
 */
const TEXT = {
  top: 70,
  block: 294,
  shortBlock: 0.46,
  shortHeight: 700,
  controls: 92,
  column: { width: 496, share: 0.4, shortWidth: 448, shortShare: 0.5, shortHeight: 500 },
} as const;

/**
 * Share of the screen the framed subject is slid by, away from the reading text (camera view
 * offset; the lens itself is unchanged): downwards on a portrait screen, to the middle of the band
 * left between the text and the reader's buttons; to the right on a landscape one, to the middle of
 * what the text column leaves. The text is laid out in pixels, so the share follows the screen.
 */
export function textShift(width: number, height: number): { x: number; y: number } {
  if (width < height) {
    const block = height <= TEXT.shortHeight ? TEXT.shortBlock * height : TEXT.block;
    const middle = (TEXT.top + Math.min(TEXT.block, block) + height - TEXT.controls) / 2;
    return { x: 0, y: Math.min(0.24, Math.max(0.1, middle / height - 0.5)) };
  }
  const c = TEXT.column;
  const short = height <= c.shortHeight;
  const column = Math.min(short ? c.shortWidth : c.width, (short ? c.shortShare : c.share) * width);
  const edge = (Math.max(24, 0.06 * width) + column) / width;
  return { x: Math.min(0.3, Math.max(0.15, edge / 2)), y: 0 };
}

/**
 * Screen shapes the lenses were composed for: 16:10 landscape, 9:16 portrait. A narrower screen of
 * the same kind keeps the horizontal view of its design frame and sees more above and below.
 */
export const DESIGN_ASPECT = { wide: 1.6, tall: 9 / 16 } as const;

/**
 * Vertical field of view (degrees) that shows on a screen of `aspect` (width / height) the width a
 * lens of `fov` shows on its design frame; wider screens keep `fov` and see more to the sides.
 */
export function fitLens(fov: number, aspect: number, tall: boolean): number {
  const design = tall ? DESIGN_ASPECT.tall : DESIGN_ASPECT.wide;
  if (aspect >= design) return fov;
  return (Math.atan((Math.tan((fov * Math.PI) / 360) * design) / aspect) * 360) / Math.PI;
}

/** Staging of every page; the keys are the story page ids (checked by `books.test.ts`). */
export const STAGING: Record<string, PageStaging> = {
  p01: {
    intent:
      "Set the garden: Man Ninon stopped at the gate, Mila's offer, the path lost in the dusk.",
    size: "General shot at a child's eye height, from the lane.",
    move: "Light dolly in towards the gate, then still.",
    space: "garden",
    wide: {
      from: { pos: [11.6, 1.15, 6.1], look: [5.4, 1.0, -0.02], fov: 36 },
      to: { pos: [10.9, 1.1, 5.5], look: [5.4, 1.0, -0.02], fov: 36 },
      seconds: 5,
      foreground: [
        { cell: [0, 1], forward: 2.6, right: 0.72, foot: 0, height: 0.9 },
        { cell: [0, 0], forward: 3.4, right: -1.75, foot: 0, height: 2.1 },
      ],
    },
    tall: {
      from: { pos: [12.1, 1.3, 7.4], look: [6.7, 0.95, 1.7], fov: 58 },
      to: { pos: [11.6, 1.25, 6.8], look: [6.7, 0.95, 1.7], fov: 58 },
      seconds: 5,
      foreground: [{ cell: [0, 1], forward: 3.2, right: 0.5, foot: 0, height: 0.85 }],
    },
    portrait: "Gate and Mila together, Man Ninon in front of them.",
    continuity: "Establishes the axis: house and tree to the left, gate and lane to the right.",
  },
  p02: {
    intent: "Mila discovers the calabashes lighting up in the old tree.",
    size: "Wide shot from behind Mila, then a gentle low angle.",
    move: "Slow push in with a limited tilt up into the canopy (about 14°).",
    space: "garden",
    wide: {
      from: { pos: [2.4, 1.35, 4.4], look: [-0.9, 1.9, -2.4], fov: 40 },
      to: { pos: [1.7, 1.0, 3.3], look: [-1.0, 2.3, -2.6], fov: 42 },
      seconds: 6,
      foreground: [{ cell: [1, 0], forward: 1.0, right: 0.64, foot: 0, height: 0.9, flip: true }],
    },
    tall: {
      from: { pos: [0.6, 1.3, 4.6], look: [-1.2, 2.2, -2.2], fov: 60 },
      to: { pos: [0.5, 1.05, 4.3], look: [-1.25, 2.0, -1.6], fov: 62 },
      seconds: 6,
      foreground: [],
    },
    portrait: "Mila and a group of calabashes above her.",
    continuity: "Mila walked left, towards the tree; she is seen from behind, looking up.",
  },
  p03: {
    intent: "The promise: the branch bends and Mila receives the calabash in both hands.",
    size: "Close three-quarter shot on hands, fruit and face.",
    move: "Discreet push in while the branch comes down.",
    space: "garden",
    wide: {
      from: { pos: [-0.5, 1.12, 1.25], look: [-1.75, 1.25, -1.9], fov: 38 },
      to: { pos: [-0.75, 1.08, 0.85], look: [-1.75, 1.25, -1.9], fov: 38 },
      seconds: 5,
      foreground: [{ cell: [0, 1], forward: 2.0, right: 0.78, foot: 0, height: 0.72, flip: true }],
    },
    tall: {
      from: { pos: [-1.1, 1.15, 1.3], look: [-2.2, 1.05, -1.75], fov: 50 },
      to: { pos: [-1.25, 1.1, 0.9], look: [-2.2, 1.05, -1.75], fov: 50 },
      seconds: 5,
      foreground: [{ cell: [0, 1], forward: 2.1, right: 0.42, foot: 0, height: 0.6, flip: true }],
    },
    portrait: "Hands and the fruit's attachment readable; Mila's face above them.",
    continuity: "Mila faces right (towards the fruit and the trunk); her house stays behind her.",
  },
  p04: {
    intent: "A light for two: Mila walks Man Ninon home, the stones appear under the calabash.",
    size: "Medium two-shot, full figures, from the garden side of the lane.",
    move: "Short lateral tracking with the walk, left to right.",
    space: "garden",
    wide: {
      from: { pos: [9.3, 1.05, 6.6], look: [8.7, 0.85, 1.4], fov: 36 },
      to: { pos: [10.6, 1.05, 6.2], look: [11.2, 0.85, 0.3], fov: 36 },
      seconds: 8,
      foreground: [{ cell: [0, 1], forward: 2.6, right: -1.35, foot: 0, height: 0.85 }],
    },
    tall: {
      from: { pos: [8.95, 1.2, 6.9], look: [8.35, 0.8, 1.5], fov: 54 },
      to: { pos: [10.4, 1.2, 6.6], look: [10.7, 0.8, 0.4], fov: 54 },
      // The lens waits for the walk: panning earlier, it would overtake the two figures.
      after: 2.4,
      seconds: 7,
      foreground: [],
    },
    portrait: "Both bodies and the ground they light.",
    continuity: "They walk left to right, towards Man Ninon's house, as page 1 promised.",
  },
  p05: {
    intent: "Temptation: on the way back Mila looks at the calabash and turns towards her house.",
    size: "Close shot on face and fruit, the lit tree behind her.",
    move: "Almost fixed: a few centimetres of drift in.",
    space: "garden",
    wide: {
      from: { pos: [1.75, 1.02, 3.55], look: [0.75, 0.98, 1.45], fov: 34 },
      to: { pos: [1.65, 1.02, 3.35], look: [0.75, 0.98, 1.45], fov: 34 },
      seconds: 6,
      foreground: [{ cell: [1, 0], forward: 0.9, right: -0.36, foot: 0, height: 0.75 }],
    },
    tall: {
      from: { pos: [0.95, 1.05, 3.7], look: [0.45, 1.0, 1.4], fov: 50 },
      to: { pos: [0.9, 1.05, 3.5], look: [0.45, 1.0, 1.4], fov: 50 },
      seconds: 6,
      foreground: [{ cell: [0, 1], forward: 1.0, right: 0.26, foot: 0, height: 0.55, flip: true }],
    },
    portrait: "Face and calabash.",
    continuity: "She now faces left: the way back to the tree, and to her house beyond it.",
  },
  p06: {
    intent: "Mila keeps the light: the calabash by her bed, the shutters closed on it.",
    size: "Medium interior shot: bed, bedside table, window.",
    move: "Short pan framed ahead of her, from the table to the window.",
    space: "house",
    wide: {
      from: { pos: [-1.0, 1.45, -1.3], look: [-3.0, 1.1, 1.1], fov: 44 },
      to: { pos: [-1.0, 1.45, -1.3], look: [-2.65, 1.15, 1.7], fov: 44 },
      seconds: 6,
      foreground: [],
    },
    tall: {
      from: { pos: [-1.2, 1.6, -1.9], look: [-2.9, 1.2, 1.3], fov: 62 },
      to: { pos: [-1.2, 1.6, -1.9], look: [-2.65, 1.25, 1.8], fov: 62 },
      seconds: 6,
      foreground: [],
    },
    portrait: "Bedside table and the gesture of the hands.",
    continuity: "Inside the house of page 5; the window gives on the tree, screen right outside.",
  },
  p07: {
    intent: "The lights go out group by group: stars, calabashes, flowers, gate, the lane.",
    size: "General shot, echo of page 1.",
    move: "Fixed.",
    space: "garden",
    wide: {
      from: { pos: [10.9, 1.1, 5.5], look: [5.4, 1.3, -0.02], fov: 38 },
      to: { pos: [10.9, 1.1, 5.5], look: [5.4, 1.3, -0.02], fov: 38 },
      seconds: 0,
      foreground: [
        { cell: [0, 1], forward: 2.6, right: 0.72, foot: 0, height: 0.9 },
        { cell: [0, 0], forward: 3.4, right: -1.75, foot: 0, height: 2.1 },
      ],
    },
    tall: {
      from: { pos: [10.7, 1.2, 5.8], look: [6.6, 1.5, 1.2], fov: 58 },
      to: { pos: [10.7, 1.2, 5.8], look: [6.6, 1.5, 1.2], fov: 58 },
      seconds: 0,
      foreground: [{ cell: [0, 1], forward: 3.2, right: 0.5, foot: 0, height: 0.85 }],
    },
    portrait: "Landmarks still perceptible: gate, tree, the glow at Mila's window.",
    continuity: "Same camera as page 1: the reader measures what has gone.",
  },
  p08: {
    intent: "Mila opens the shutters, finds the night emptied, and takes the calabash back.",
    size: "Medium three-quarter shot at the window.",
    move: "Slight pull back as she turns to the table.",
    space: "house",
    wide: {
      from: { pos: [-1.05, 1.5, -0.55], look: [-2.6, 1.3, 2.0], fov: 44 },
      to: { pos: [-0.8, 1.55, -1.35], look: [-2.8, 1.2, 1.5], fov: 44 },
      seconds: 7,
      foreground: [],
    },
    tall: {
      from: { pos: [-1.4, 1.55, -0.8], look: [-2.6, 1.3, 2.0], fov: 60 },
      to: { pos: [-1.25, 1.6, -1.6], look: [-2.8, 1.2, 1.5], fov: 60 },
      seconds: 7,
      foreground: [],
    },
    portrait: "Face, window and the calabash.",
    continuity: "Same room and same side as page 6; she looks out to screen right, then back.",
  },
  p09: {
    intent: "One step after another: lost in the dark, she trips on a root and goes on slowly.",
    size: "Low three-quarter shot at root level.",
    move: "Short follow, left to right.",
    space: "garden",
    wide: {
      from: { pos: [3.1, 0.5, 3.7], look: [0.89, 0.81, 0.83], fov: 36 },
      to: { pos: [3.6, 0.5, 3.6], look: [1.89, 0.81, 1.03], fov: 36 },
      seconds: 8,
      foreground: [
        { cell: [0, 1], forward: 1.9, right: 0.8, foot: 0, height: 0.6, flip: true },
        { cell: [0, 1], forward: 2.2, right: -1.45, foot: 0, height: 0.7 },
      ],
    },
    tall: {
      from: { pos: [2.4, 0.6, 4.3], look: [0.6, 0.85, 1.2], fov: 54 },
      to: { pos: [3.3, 0.6, 4.3], look: [2.1, 0.85, 1.5], fov: 54 },
      seconds: 8,
      foreground: [{ cell: [0, 1], forward: 2.2, right: 0.45, foot: 0, height: 0.5, flip: true }],
    },
    portrait: "Feet and calabash.",
    continuity: "She has passed the tree without seeing it and drifts right, towards the gate.",
  },
  p10: {
    intent: "The light given back: Man Ninon comes from the gate with her lamp and leads Mila.",
    size: "Medium two-shot.",
    move: "Reveal: the lens waits on Mila, the lamp enters from the gate side; then a short pan follows them to the left.",
    space: "garden",
    wide: {
      // The lens holds the meeting, then follows the two of them as they leave to the left.
      from: { pos: [2.9, 1.05, 5.2], look: [4.2, 0.9, 1.6], fov: 36 },
      to: { pos: [2.9, 1.05, 5.2], look: [2.92, 0.9, 1.2], fov: 36 },
      after: 8.6,
      seconds: 2.9,
      // On the text side and low: nothing stands between the lens and the two figures, during
      // the held meeting or the pan.
      foreground: [{ cell: [0, 1], forward: 2.4, right: -1.5, foot: 0, height: 0.8 }],
    },
    tall: {
      from: { pos: [2.9, 1.2, 5.9], look: [3.95, 1.02, 1.7], fov: 54 },
      to: { pos: [2.9, 1.2, 5.9], look: [3.0, 1.02, 1.7], fov: 54 },
      after: 8.6,
      seconds: 2.9,
      foreground: [],
    },
    portrait: "Hands, faces and the lamp.",
    continuity: "Man Ninon enters from the right, where page 4 left her; they leave to the left.",
  },
  p11: {
    intent:
      "The promise kept: the calabash goes back to its branch and the light runs to the stars.",
    size: "Medium shot on the gesture, widening to the whole tree and the sky.",
    move: "Pull back, then a controlled tilt up (about 17°).",
    space: "garden",
    wide: {
      from: { pos: [-0.5, 1.15, 0.9], look: [-2.1, 1.3, -1.75], fov: 38 },
      to: { pos: [1.1, 1.05, 4.6], look: [-1.3, 2.15, -2.4], fov: 46 },
      seconds: 10,
      foreground: [{ cell: [0, 1], forward: 2.4, right: 1.0, foot: 0, height: 0.75, flip: true }],
    },
    tall: {
      from: { pos: [-1.1, 1.2, 1.5], look: [-2.1, 1.3, -1.75], fov: 54 },
      to: { pos: [-1.2, 1.15, 5.4], look: [-2.2, 1.8, -1.6], fov: 64 },
      seconds: 10,
      foreground: [],
    },
    portrait: "The attachment first, then the whole tree.",
    continuity: "Same spot and same side as page 3: the fruit goes back where it was taken.",
  },
  p12: {
    intent: "Dawn: the tree gives a green calabash to Man Ninon; a place is set at Mila's table.",
    size: "Calm wide shot: tree, terrace and table.",
    move: "Very slow pull back.",
    space: "garden",
    wide: {
      from: { pos: [5.0, 1.5, 2.9], look: [-0.9, 1.45, -2.9], fov: 40 },
      to: { pos: [5.5, 1.55, 3.4], look: [-0.9, 1.45, -2.9], fov: 40 },
      seconds: 10,
      foreground: [
        { cell: [0, 0], forward: 3.3, right: 1.3, foot: 0, height: 2.0, flip: true },
        { cell: [0, 1], forward: 3.2, right: -2.2, foot: 0, height: 0.85 },
      ],
    },
    tall: {
      from: { pos: [4.2, 1.5, 4.3], look: [0.6, 1.3, -2.0], fov: 60 },
      to: { pos: [4.5, 1.55, 4.8], look: [0.6, 1.3, -2.0], fov: 60 },
      seconds: 10,
      foreground: [{ cell: [0, 1], forward: 3.6, right: 0.62, foot: 0, height: 0.9, flip: true }],
    },
    portrait: "The two of them, the terrace and the tree.",
    continuity:
      "Back to the wide garden of page 1 in daylight; they leave to the left, to the table.",
  },
};
