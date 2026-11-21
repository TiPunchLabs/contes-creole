/** Finger travel (px) under which a touch is still a tap; beyond it the gesture takes an axis. */
export const TAP_SLOP = 12;
/** Longest press (ms) that still counts as a tap. */
export const TAP_MS = 600;
/** Horizontal travel (px) a swipe needs at release to move one scene. */
export const SWIPE_MIN = 40;
/** A touch screen whose short side reaches this many CSS px is a tablet, not a phone. */
export const PHONE_SHORT_SIDE = 600;

export interface PhoneEnv {
  /** The device has a finger pointer (`any-pointer: coarse`), primary or not. */
  touch: boolean;
  /** Short side of the screen (not of the window), in CSS px. */
  shortSide: number;
}

/**
 * A smartphone: a touch screen whose short side is small. The window's width plays no part, so a
 * narrow desktop window is never one; tablets and touch laptops fail the screen bound. The primary
 * pointer is not asked: some phones name their stylus first.
 */
export function detectPhone(env: PhoneEnv): boolean {
  return env.touch && env.shortSide < PHONE_SHORT_SIDE;
}

/** Reads the browser facts `detectPhone` needs. */
export function readPhoneEnv(): PhoneEnv {
  return {
    touch: window.matchMedia?.("(any-pointer: coarse)").matches ?? false,
    shortSide: Math.min(screen.width, screen.height),
  };
}

/** Whether the page runs on a smartphone (see `detectPhone`). */
export const isPhone = (): boolean => detectPhone(readPhoneEnv());

export type Gesture = "tap" | "next" | "previous" | null;

export interface SwipeTracker {
  /** A finger lands. A second finger voids the gesture until a new first finger lands. */
  down(id: number, x: number, y: number, now: number, primary: boolean): void;
  /** A finger moves; returns the vertical travel (finger up > 0) of a mostly vertical gesture, else 0. */
  move(id: number, x: number, y: number): number;
  /** A finger lifts; names the gesture it ends: one scene at most, whatever its length or speed. */
  up(id: number, now: number): Gesture;
  /** The browser took the touch over (native scroll, system gesture). */
  cancel(id: number): void;
}

/**
 * Reads one-finger touches: a tap (the finger may tremble), a horizontal swipe (right to left is
 * "next"), or a mostly vertical move, which never changes scene. The axis is taken once, when the
 * finger leaves the tap zone; the swipe is judged at release, so coming back cancels it.
 */
export function createSwipeTracker(): SwipeTracker {
  let touch: {
    id: number;
    x0: number;
    y0: number;
    x: number;
    y: number;
    t0: number;
    axis: "x" | "y" | null;
  } | null = null;
  let voided = false;
  return {
    down(id, x, y, now, primary) {
      if (!primary) {
        voided = true;
        return;
      }
      voided = false;
      touch = { id, x0: x, y0: y, x, y, t0: now, axis: null };
    },
    move(id, x, y) {
      if (!touch || touch.id !== id || voided) return 0;
      const lastY = touch.axis ? touch.y : touch.y0;
      touch.x = x;
      touch.y = y;
      if (!touch.axis) {
        const dx = x - touch.x0;
        const dy = y - touch.y0;
        if (Math.hypot(dx, dy) <= TAP_SLOP) return 0;
        touch.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      return touch.axis === "y" ? lastY - y : 0;
    },
    up(id, now) {
      if (!touch || touch.id !== id) return null;
      const { x0, y0, x, y, t0, axis } = touch;
      touch = null;
      if (voided) return null;
      if (!axis) return now - t0 <= TAP_MS ? "tap" : null;
      const dx = x - x0;
      if (axis !== "x" || Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(y - y0)) return null;
      return dx < 0 ? "next" : "previous";
    },
    cancel(id) {
      if (touch?.id === id) touch = null;
    },
  };
}

export interface SwipeHandlers {
  /** Whether a touch starting on `target` is left alone (a control, a busy screen). */
  ignore?(target: EventTarget | null): boolean;
  /** One scene forward (1, finger from right to left) or back (-1). */
  onSwipe(direction: 1 | -1): void;
  onTap?(e: PointerEvent): void;
  /** Vertical travel of a mostly vertical touch (finger up > 0): scrolls a text, never the scenes. */
  onVertical?(dy: number, e: PointerEvent): void;
}

/** Listens to the touches on `el` and reports them as taps, swipes and vertical moves; returns the unbinder. */
export function bindSwipe(el: HTMLElement, handlers: SwipeHandlers): () => void {
  const tracker = createSwipeTracker();
  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === "mouse") return;
    if (e.isPrimary && handlers.ignore?.(e.target)) tracker.cancel(e.pointerId);
    else tracker.down(e.pointerId, e.clientX, e.clientY, e.timeStamp, e.isPrimary);
  };
  const onMove = (e: PointerEvent): void => {
    const dy = tracker.move(e.pointerId, e.clientX, e.clientY);
    if (dy !== 0) handlers.onVertical?.(dy, e);
  };
  const onUp = (e: PointerEvent): void => {
    const gesture = tracker.up(e.pointerId, e.timeStamp);
    if (gesture === "tap") handlers.onTap?.(e);
    else if (gesture) handlers.onSwipe(gesture === "next" ? 1 : -1);
  };
  const onCancel = (e: PointerEvent): void => tracker.cancel(e.pointerId);
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onCancel);
  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onCancel);
  };
}
