"""Per-frame analysis of the critters' motion, by an agent, on the fake clock (16 ms frames).

Every frame of 75 s is read from the live scene (not from a video): feet that slide, poses that
jump, the two critters' spacing, their time in view. One touch each on the way (hover). It is
finer than a x0.25 playback but it is not a human watching the motion at speed.

Usage: OUT=<dir> [VP=desktop] uv run --with playwright python motion.py
"""

from __future__ import annotations

import json
import math
import os
import statistics
from typing import Any

from playwright.sync_api import sync_playwright

import hvp

FRAME_MS = 16
SECONDS = 75
SAMPLE = """() => { const { T, scene, camera, renderer } = window.__hvp; const out = {};
  const size = renderer.getSize(new T.Vector2());
  const shelf = document.querySelector('.tree-shelf').getBoundingClientRect();
  scene.traverse((n) => { if (!(n.userData && n.userData.who)) return;
    const body = n.children[0];
    const legs = n.children.filter((c) => c.isGroup && c !== body);
    const feet = legs.map((leg) => { const p = leg.localToWorld(new T.Vector3(0, -0.66, 0)); return [p.x, p.z, p.y - n.position.y]; });
    const b = new T.Box3(); n.traverse((m) => { if (m.isMesh && !m.material.transparent) b.union(new T.Box3().setFromObject(m)); });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const v = new T.Vector3();
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      v.set(x, y, z).project(camera); const sx = (v.x + 1) / 2 * size.x, sy = (1 - v.y) / 2 * size.y;
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy); }
    const inView = x0 >= 0 && x1 <= size.x && y1 <= size.y && !(y1 > shelf.top && x1 > shelf.left && x0 < shelf.right);
    out[n.userData.who] = { x: n.position.x, z: n.position.z, yaw: n.rotation.y, lift: body.position.y,
      pitch: body.rotation.x, squash: body.scale.y, head: body.children.find((c) => c.isGroup && c.children.length > 2)?.rotation.y ?? 0,
      feet, inView, sx: (x0 + x1) / 2, sy: (y0 + y1) / 2 }; });
  return out; }"""


def angle(a: float, b: float) -> float:
    """Shortest signed difference between two angles."""
    return math.atan2(math.sin(a - b), math.cos(a - b))


def analyse(frames: list[dict[str, Any]]) -> dict[str, Any]:
    """Turns the per-frame samples into the figures of the notes."""
    out: dict[str, Any] = {"frames": len(frames), "seconds": round(len(frames) * FRAME_MS / 1000, 1)}
    lap = [f["lapen"] for f in frames]
    zan = [f["zanba"] for f in frames]
    # Lapen: no travel while on the ground; hops.
    ground_slide = 0.0
    hops = 0
    heights = []
    peak = 0.0
    for a, b in zip(lap, lap[1:]):
        step = math.hypot(b["x"] - a["x"], b["z"] - a["z"])
        if a["lift"] < 1e-4 and b["lift"] < 1e-4:
            ground_slide = max(ground_slide, step)
        if a["lift"] < 1e-4 <= b["lift"]:
            hops += 1
        peak = max(peak, b["lift"])
        if b["lift"] < 1e-4 <= a["lift"]:
            heights.append(peak)
            peak = 0.0
    out["lapen"] = {
        "hops": hops,
        "hopHeightMinMax": [round(min(heights), 3), round(max(heights), 3)] if heights else None,
        "maxTravelPerFrameOnGround": round(ground_slide, 5),
        "maxLiftChangePerFrame": round(max(abs(b["lift"] - a["lift"]) for a, b in zip(lap, lap[1:])), 4),
        "maxYawStepPerFrameDeg": round(math.degrees(max(abs(angle(b["yaw"], a["yaw"])) for a, b in zip(lap, lap[1:]))), 2),
        "maxHeadTurnPerFrameDeg": round(math.degrees(max(abs(b["head"] - a["head"]) for a, b in zip(lap, lap[1:]))), 2),
        "travelled": round(sum(math.hypot(b["x"] - a["x"], b["z"] - a["z"]) for a, b in zip(lap, lap[1:])), 2),
        "inViewShare": round(sum(1 for f in lap if f["inView"]) / len(lap), 4),
    }
    # Zanba: a foot on the ground stays where it is.
    slides = []
    worst = {"drift": 0.0}
    for leg in range(4):
        anchor = None
        drift = 0.0
        start = 0
        for index, f in enumerate(zan):
            x, z, up = f["feet"][leg]
            # The sole is on the ground (within 3 mm of the critter's own ground level).
            planted = up < 0.003
            if planted and anchor is None:
                anchor = (x, z)
                drift = 0.0
                start = index
            elif planted and anchor is not None:
                drift = max(drift, math.hypot(x - anchor[0], z - anchor[1]))
            elif not planted and anchor is not None:
                slides.append(drift)
                if drift > worst["drift"]:
                    worst = {"drift": round(drift, 3), "leg": leg, "fromSecond": round(start * FRAME_MS / 1000, 2),
                             "toSecond": round(index * FRAME_MS / 1000, 2),
                             "turnedDeg": round(math.degrees(angle(f["yaw"], zan[start]["yaw"])), 1)}
                anchor = None
        if anchor is not None:
            slides.append(drift)
    speeds = [math.hypot(b["x"] - a["x"], b["z"] - a["z"]) / (FRAME_MS / 1000) for a, b in zip(zan, zan[1:])]
    out["zanba"] = {
        "stances": len(slides),
        "footDriftPerStanceMedian": round(statistics.median(slides), 3) if slides else None,
        "footDriftPerStanceMax": round(max(slides), 3) if slides else None,
        "footDriftOver5cmShare": round(sum(1 for s in slides if s > 0.05) / len(slides), 3) if slides else None,
        "worstStance": worst,
        "topSpeed": round(max(speeds), 3),
        "maxSpeedChangePerFrame": round(max(abs(b - a) for a, b in zip(speeds, speeds[1:])), 4),
        "maxYawStepPerFrameDeg": round(math.degrees(max(abs(angle(b["yaw"], a["yaw"])) for a, b in zip(zan, zan[1:]))), 2),
        "maxPitchChangePerFrameDeg": round(math.degrees(max(abs(b["pitch"] - a["pitch"]) for a, b in zip(zan, zan[1:]))), 3),
        "travelled": round(sum(s * FRAME_MS / 1000 for s in speeds), 2),
        "inViewShare": round(sum(1 for f in zan if f["inView"]) / len(zan), 4),
    }
    gaps = [math.hypot(a["x"] - b["x"], a["z"] - b["z"]) for a, b in zip(lap, zan)]
    out["together"] = {
        "minDistance": round(min(gaps), 2),
        "touchingBelow": 2.05,
        "minDistanceToTrunk": round(min(min(math.hypot(a["x"], a["z"]) for a in lap), min(math.hypot(a["x"], a["z"]) for a in zan)), 2),
        "screenOverlapShare": round(sum(1 for a, b in zip(lap, zan) if abs(a["sx"] - b["sx"]) < 30 and abs(a["sy"] - b["sy"]) < 40) / len(lap), 4),
    }
    # Rests between Lapen's bouts of hopping: irregular or not.
    rests = []
    still = 0
    for a, b in zip(lap, lap[1:]):
        if math.hypot(b["x"] - a["x"], b["z"] - a["z"]) < 1e-6 and b["lift"] < 1e-4:
            still += 1
        else:
            if still * FRAME_MS > 1200:
                rests.append(round(still * FRAME_MS / 1000, 1))
            still = 0
    out["lapen"]["restsSeconds"] = rests
    return out


def main() -> None:
    """Samples every frame, hovers each critter once, writes motion-<vp>.json."""
    vp = os.environ.get("VP", "desktop")
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    frames: list[dict[str, Any]] = []
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        ctx, page = hvp.open_home(browser, vp, query=os.environ.get("QUERY", ""))
        total = SECONDS * 1000 // FRAME_MS
        for i in range(total):
            page.clock.run_for(FRAME_MS)
            sample = page.evaluate(SAMPLE)
            frames.append(sample)
            second = i * FRAME_MS / 1000
            if vp == "desktop":
                for who, at in (("lapen", 30.0), ("zanba", 50.0)):
                    if abs(second - at) < FRAME_MS / 2000:
                        page.mouse.move(sample[who]["sx"], sample[who]["sy"])
                    if abs(second - at - 3) < FRAME_MS / 2000:
                        page.mouse.move(page.viewport_size["width"] / 2, 100)
        browser.close()
    result = analyse(frames)
    result["viewport"] = vp
    (hvp.OUT / f"motion-{vp}.json").write_text(json.dumps(result, indent=1))
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
