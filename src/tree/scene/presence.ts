/** A box on screen, in CSS pixels. */
export interface ScreenBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Share of a figure that may be hidden before it steps out, and under which it steps back in. */
export const HIDE_ABOVE = 0.025;
export const SHOW_BELOW = 0.01;
/** A figure comes and goes in a fifth of a second. */
const FADE_PER_SECOND = 5;

const area = (b: ScreenBox): number =>
  Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);

const meet = (a: ScreenBox, b: ScreenBox): ScreenBox => ({
  left: Math.max(a.left, b.left),
  top: Math.max(a.top, b.top),
  right: Math.min(a.right, b.right),
  bottom: Math.min(a.bottom, b.bottom),
});

/**
 * Share of a figure's box (0 to 1) that the screen does not show: what lies beyond the edges of a
 * `width` × `height` screen, plus what lies behind the `covers` laid over the scene (the shelf,
 * the intro text while it shows). Covers are taken not to overlap each other.
 */
export function hiddenShare(
  box: ScreenBox,
  width: number,
  height: number,
  covers: readonly (ScreenBox | null)[],
): number {
  const whole = area(box);
  if (whole <= 0) return 1;
  const inside = meet(box, { left: 0, top: 0, right: width, bottom: height });
  let behind = 0;
  for (const cover of covers) if (cover) behind += area(meet(inside, cover));
  return Math.min(1, 1 - (area(inside) - behind) / whole);
}

/** How present a figure is: its opacity, and whether it is meant to be seen. */
export interface Presence {
  opacity: number;
  shown: boolean;
}

/**
 * A figure is seen whole or not at all: it steps out once more than `HIDE_ABOVE` of it would be
 * cut by the shelf, the intro text or the frame, and back in once nearly all of it shows again, so
 * the shelf never leaves a pair of ears or half a body on screen. `instant` skips the fade.
 */
export function stepPresence(p: Presence, hidden: number, dt: number, instant = false): Presence {
  if (p.shown && hidden > HIDE_ABOVE) p.shown = false;
  else if (!p.shown && hidden < SHOW_BELOW) p.shown = true;
  const target = p.shown ? 1 : 0;
  const step = instant ? 1 : dt * FADE_PER_SECOND;
  p.opacity += Math.max(-step, Math.min(step, target - p.opacity));
  return p;
}
