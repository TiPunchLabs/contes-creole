"""How the view settles when the climb goes from one stop to another: one input burst per leg
(wheel, or a finger drag on touch sizes), then the camera read on every frame until it rests.

Per leg and per quantity (climb value, angle about the trunk, camera height, pitch): `overshoot`,
how far it went past where it ends, and `back`, how much it moved against its own direction of
travel. A view that follows the input and settles has both at zero. Writes settle.json and one
table of frames per leg (settle-<viewport>.tsv). With FILM=<viewport> every frame of that viewport
is also captured and assembled at 60 frames a second into settle-<viewport>.webm (true speed).
Usage: OUT=<dir> [SITE=...] [VPS=...] [FILM=<viewport>] uv run --with playwright python settle.py
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from typing import Any

from playwright.sync_api import Page, sync_playwright

import hvp
from climb_check import progress

# The owner's journey: up card by card to the top, then back down; and two long legs.
LEGS = [0.2, 0.54, 0.88, 1.0, 0.88, 0.54, 0.2, 0.0, 0.54, 0.0, 1.0, 0.0]
FRAMES = 170
# Degrees, metres or climb share under which a move against the travel is the float of the scene
# (cards sway, nothing else moves the camera) and not a rebound.
EPS = {"t": 0.0005, "azimuth": 0.02, "height": 0.004, "pitch": 0.03}

POSE = """() => { const { T, camera } = window.__hvp;
  const f = camera.getWorldDirection(new T.Vector3()), p = camera.position;
  let a = Math.atan2(p.z, p.x) * 180 / Math.PI; if (a < -135) a += 360;
  return { azimuth: a, height: p.y, pitch: Math.asin(f.y) * 180 / Math.PI }; }"""
DRAG = """([y0, y1, steps]) => { const el = document.querySelector('canvas').parentElement;
  const ev = (type, y) => el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: 7,
    clientX: innerWidth / 2, clientY: y, bubbles: true }));
  ev('pointerdown', y0); for (let i = 1; i <= steps; i++) ev('pointermove', y0 + (y1 - y0) * i / steps);
  // No pointerup within the tap delay: a drag, never a tap.
  window.__hvpUp = () => ev('pointerup', y1); }"""


def burst(page: Page, target: float, gain: float, touch: bool) -> None:
    """One input burst that asks for `target`: wheel notches, or one finger drag."""
    want = target - progress_target(page)
    if touch:
        # index.ts: a drag of dy pixels climbs dy * 2.2 * 0.00055.
        dy = want / (2.2 * 0.00055)
        h = page.viewport_size["height"]
        left = dy
        # Under a dozen pixels the app would read the gesture as a tap: the remainder is dropped.
        while abs(left) > 12:
            step = max(-h * 0.5, min(h * 0.5, left))
            y0 = h * 0.5 + step / 2
            page.evaluate(DRAG, [y0, y0 - step, 8])
            page.evaluate("() => window.__hvpUp()")
            left -= step
        return
    left = want / 0.00055 * gain
    while abs(left) > 0.5:
        step = max(-120.0, min(120.0, left))
        page.mouse.wheel(0, step)
        left -= step


def progress_target(page: Page) -> float:
    """Where the climb rests now (read once settled, so the value shown is the target)."""
    return progress(page)


def analyse(series: list[float], eps: float) -> dict[str, float]:
    """Overshoot past the end value and total move against the direction of travel."""
    start, end = series[0], series[-1]
    sign = 1 if end >= start else -1
    over = max(0.0, max(sign * (x - end) for x in series))
    back = sum(max(0.0, -sign * (b - a)) for a, b in zip(series, series[1:]))
    return {"from": round(start, 4), "to": round(end, 4), "overshoot": round(over, 4) if over > eps else 0.0,
            "back": round(back, 4) if back > eps else 0.0}


def main() -> None:
    """Runs the legs on every viewport, writes the frames and the summary."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    record: dict[str, Any] = {}
    worst = {k: 0.0 for k in EPS}
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for vp in os.environ.get("VPS", "w1920x839,desktop,phone-landscape,mobile").split(","):
            touch = bool(hvp.VIEWPORTS[vp].get("has_touch"))
            ctx, page = hvp.open_home(browser, vp)
            page.clock.run_for(2000)
            page.mouse.move(page.viewport_size["width"] / 2, page.viewport_size["height"] / 2)
            gain = 1.0
            if not touch:
                # What a wheel notch weighs on this device, measured once and undone.
                page.mouse.wheel(0, 100)
                page.clock.run_for(2500)
                gain = 0.055 / max(1e-6, progress(page))
                page.mouse.wheel(0, -100 * gain * 1.2)
                page.clock.run_for(2500)
            legs = []
            lines = ["leg\tframe\tt\tazimuth\theight\tpitch"]
            film = hvp.OUT / f"film-{vp}" if os.environ.get("FILM") == vp else None
            shot = 0
            if film:
                film.mkdir(parents=True, exist_ok=True)
            for n, target in enumerate(LEGS):
                frames = [{"t": progress(page), **page.evaluate(POSE)}]
                burst(page, target, gain, touch)
                for _ in range(FRAMES):
                    page.clock.run_for(16)
                    frames.append({"t": progress(page), **page.evaluate(POSE)})
                    if film:
                        page.screenshot(path=str(film / f"f{shot:05d}.jpg"), type="jpeg", quality=82)
                        shot += 1
                page.clock.run_for(1500)
                result = {k: analyse([f[k] for f in frames], EPS[k]) for k in EPS}
                legs.append({"asked": target, "input": "drag" if touch else "wheel", **result})
                for k in EPS:
                    worst[k] = max(worst[k], result[k]["overshoot"], result[k]["back"])
                lines += [f'{n}\t{i}\t{f["t"]:.4f}\t{f["azimuth"]:.3f}\t{f["height"]:.3f}\t{f["pitch"]:.3f}' for i, f in enumerate(frames)]
            ctx.close()
            if film:
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "60", "-i", str(film / "f%05d.jpg"),
                                "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "34", str(hvp.OUT / f"settle-{vp}.webm")], check=True)
                subprocess.run(["trash", str(film)], check=True)
            (hvp.OUT / f"settle-{vp}.tsv").write_text("\n".join(lines) + "\n")
            record[vp] = {"viewport": hvp.VIEWPORTS[vp]["viewport"], "legs": legs}
            bad = [(leg["asked"], k, leg[k]) for leg in legs for k in EPS if leg[k]["overshoot"] or leg[k]["back"]]
            flagged = sum(1 for leg in legs if any(leg[k]["overshoot"] or leg[k]["back"] for k in EPS))
            print(f"{vp:18} {len(legs)} legs by {'drag' if touch else 'wheel'}; legs with a rebound: {flagged}")
            for asked, k, r in bad:
                print(f"    to {asked:.2f} {k}: {r['from']} -> {r['to']}, overshoot {r['overshoot']}, back {r['back']}")
        browser.close()
    record["worst"] = worst
    (hvp.OUT / "settle.json").write_text(json.dumps(record, indent=1))
    print("worst", worst)
    sys.exit(1 if any(worst.values()) else 0)


if __name__ == "__main__":
    main()
