// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  SWIPE_MIN,
  TAP_MS,
  TAP_SLOP,
  bindSwipe,
  createSwipeTracker,
  detectPhone,
  type Gesture,
} from "./gesture";

/** Runs one finger through `points` (the first is the press) and returns what its release means. */
function trace(points: [number, number][], ms = 200): Gesture {
  const tracker = createSwipeTracker();
  const [[x0, y0], ...rest] = points;
  tracker.down(1, x0, y0, 0, true);
  for (const [x, y] of rest) tracker.move(1, x, y);
  return tracker.up(1, ms);
}

describe("detectPhone", () => {
  const phone = { coarsePointer: true, hover: false, shortSide: 390 };

  it("takes a touch screen with a short side under 600 px", () => {
    expect(detectPhone(phone)).toBe(true);
    expect(detectPhone({ ...phone, shortSide: 599 })).toBe(true);
  });

  it("leaves tablets out by their screen, whatever the window", () => {
    expect(detectPhone({ ...phone, shortSide: 600 })).toBe(false);
    expect(detectPhone({ ...phone, shortSide: 744 })).toBe(false);
  });

  it("leaves a mouse or trackpad computer out, even on a small screen or window", () => {
    expect(detectPhone({ coarsePointer: false, hover: true, shortSide: 390 })).toBe(false);
    expect(detectPhone({ coarsePointer: true, hover: true, shortSide: 390 })).toBe(false);
  });
});

describe("createSwipeTracker", () => {
  it("reads right-to-left as next and left-to-right as previous", () => {
    expect(
      trace([
        [300, 400],
        [240, 402],
        [180, 405],
      ]),
    ).toBe("next");
    expect(
      trace([
        [100, 400],
        [160, 398],
        [220, 395],
      ]),
    ).toBe("previous");
  });

  it("gives one gesture however long or fast the swipe is", () => {
    const tracker = createSwipeTracker();
    tracker.down(1, 380, 300, 0, true);
    for (let x = 360; x >= 0; x -= 20) tracker.move(1, x, 300);
    expect(tracker.up(1, 40)).toBe("next");
    expect(tracker.up(1, 41)).toBeNull();
  });

  it("keeps a trembling press a tap", () => {
    expect(
      trace([
        [200, 300],
        [205, 296],
        [197, 304],
        [203, 301],
      ]),
    ).toBe("tap");
    expect(
      trace([
        [200, 300],
        [200 + TAP_SLOP, 300],
      ]),
    ).toBe("tap");
  });

  it("drops a press held too long", () => {
    expect(trace([[200, 300]], TAP_MS + 1)).toBeNull();
  });

  it("ignores a swipe shorter than the minimum travel", () => {
    expect(
      trace([
        [200, 300],
        [200 - (SWIPE_MIN - 1), 300],
      ]),
    ).toBeNull();
  });

  it("never turns on a mostly vertical or diagonal move, and reports its travel", () => {
    const tracker = createSwipeTracker();
    tracker.down(1, 200, 500, 0, true);
    expect(tracker.move(1, 204, 470)).toBe(30);
    expect(tracker.move(1, 150, 400)).toBe(70);
    expect(tracker.up(1, 300)).toBeNull();
    expect(
      trace([
        [200, 500],
        [150, 450],
        [100, 400],
      ]),
    ).toBeNull();
  });

  it("keeps the axis taken first: a vertical start does not become a swipe", () => {
    expect(
      trace([
        [200, 500],
        [202, 460],
        [80, 455],
      ]),
    ).toBeNull();
  });

  it("cancels a swipe that comes back, or that ends more vertical than horizontal", () => {
    expect(
      trace([
        [300, 400],
        [200, 400],
        [290, 400],
      ]),
    ).toBeNull();
    expect(
      trace([
        [300, 400],
        [250, 405],
        [240, 520],
      ]),
    ).toBeNull();
  });

  it("voids the gesture when a second finger lands, until a new first finger", () => {
    const tracker = createSwipeTracker();
    tracker.down(1, 300, 400, 0, true);
    tracker.down(2, 100, 400, 10, false);
    tracker.move(1, 150, 400);
    expect(tracker.up(2, 90)).toBeNull();
    expect(tracker.up(1, 100)).toBeNull();
    tracker.down(3, 300, 400, 200, true);
    tracker.move(3, 200, 400);
    expect(tracker.up(3, 300)).toBe("next");
  });

  it("forgets a touch the browser cancelled", () => {
    const tracker = createSwipeTracker();
    tracker.down(1, 300, 400, 0, true);
    tracker.move(1, 150, 400);
    tracker.cancel(1);
    expect(tracker.up(1, 100)).toBeNull();
  });
});

describe("bindSwipe", () => {
  /** Dispatches a pointer event of a finger (or of `pointerType`) on `el`. */
  function fire(el: HTMLElement, type: string, x: number, y: number, pointerType = "touch"): void {
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        isPrimary: true,
        pointerType,
        clientX: x,
        clientY: y,
      }),
    );
  }
  function setup(ignore?: (target: EventTarget | null) => boolean) {
    const el = document.createElement("div");
    const button = document.createElement("button");
    el.append(button);
    const handlers = { ignore, onSwipe: vi.fn(), onTap: vi.fn(), onVertical: vi.fn() };
    const unbind = bindSwipe(el, handlers);
    return { el, button, handlers, unbind };
  }

  it("reports a swipe once, at release", () => {
    const { el, handlers } = setup();
    fire(el, "pointerdown", 300, 400);
    fire(el, "pointermove", 150, 400);
    expect(handlers.onSwipe).not.toHaveBeenCalled();
    fire(el, "pointerup", 150, 400);
    expect(handlers.onSwipe).toHaveBeenCalledExactlyOnceWith(1);
    expect(handlers.onTap).not.toHaveBeenCalled();
  });

  it("reports taps and vertical travel, not swipes", () => {
    const { el, handlers } = setup();
    fire(el, "pointerdown", 300, 400);
    fire(el, "pointerup", 303, 398);
    expect(handlers.onTap).toHaveBeenCalledOnce();
    fire(el, "pointerdown", 300, 400);
    fire(el, "pointermove", 300, 340);
    fire(el, "pointerup", 300, 340);
    expect(handlers.onVertical).toHaveBeenCalledWith(60, expect.anything());
    expect(handlers.onSwipe).not.toHaveBeenCalled();
  });

  it("leaves mouse drags, ignored targets and cancelled touches alone", () => {
    const { el, button, handlers } = setup((target) => target instanceof HTMLButtonElement);
    fire(el, "pointerdown", 300, 400, "mouse");
    fire(el, "pointermove", 150, 400, "mouse");
    fire(el, "pointerup", 150, 400, "mouse");
    fire(button, "pointerdown", 300, 400);
    fire(button, "pointermove", 150, 400);
    fire(button, "pointerup", 150, 400);
    fire(el, "pointerdown", 300, 400);
    fire(el, "pointermove", 150, 400);
    fire(el, "pointercancel", 150, 400);
    fire(el, "pointerup", 150, 400);
    expect(handlers.onSwipe).not.toHaveBeenCalled();
    expect(handlers.onTap).not.toHaveBeenCalled();
  });

  it("stops listening once unbound", () => {
    const { el, handlers, unbind } = setup();
    unbind();
    fire(el, "pointerdown", 300, 400);
    fire(el, "pointermove", 150, 400);
    fire(el, "pointerup", 150, 400);
    expect(handlers.onSwipe).not.toHaveBeenCalled();
  });
});
