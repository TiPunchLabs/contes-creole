"""The turn about the tree, frame by frame: where the camera stands and looks at each climb value,
how far its line of sight passes from the trunk axis, and where the trunk shows on screen.

One capture per value into OUT (pivot-<viewport>-t<value>.png), a contact sheet per viewport and
pivot.json. Run it on the base and on the new build and compare. Usage:
OUT=<dir> [SITE=...] [VPS=...] uv run --with playwright python pivot.py
"""

from __future__ import annotations

import json
import os
import subprocess
from typing import Any

from playwright.sync_api import sync_playwright

import hvp
from climb_check import REACH, go

STOPS = [round(i * 0.02, 2) for i in range(16)] + [0.4, 0.54, 0.7, 0.88, 1.0]

POSE = """() => { const { T, camera } = window.__hvp;
  const f = camera.getWorldDirection(new T.Vector3()), p = camera.position;
  // Horizontal distance between the line of sight and the trunk axis (the y axis of the scene).
  const miss = Math.abs(p.x * f.z - p.z * f.x) / Math.hypot(f.x, f.z);
  const trunk = new T.Vector3(0, 3, 0).project(camera);
  return { position: p.toArray().map((v) => +v.toFixed(3)), radius: +Math.hypot(p.x, p.z).toFixed(3),
           azimuth: +(Math.atan2(p.z, p.x) * 180 / Math.PI).toFixed(2), pitch: +(Math.asin(f.y) * 180 / Math.PI).toFixed(2),
           sightMissesAxisBy: +miss.toFixed(3), trunkScreenX: +((trunk.x + 1) / 2).toFixed(4) }; }"""


def main() -> None:
    """Runs every viewport, writes the frames, the sheets and pivot.json."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    record: dict[str, Any] = {}
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for vp in os.environ.get("VPS", "desktop,w1920,laptop,phone-landscape,mobile").split(","):
            ctx, page = hvp.open_home(browser, vp)
            page.clock.run_for(2000)
            # Dead centre: no pointer parallax in the measure.
            page.mouse.move(page.viewport_size["width"] / 2, page.viewport_size["height"] / 2)
            rows, shots = [], []
            for target in STOPS:
                reached = go(page, target)
                pose = page.evaluate(POSE)
                rows.append({"target": target, "t": round(reached, 4), "reached": abs(reached - target) <= REACH, **pose})
                shot = hvp.OUT / f"pivot-{vp}-t{target:.2f}.png"
                page.screenshot(path=str(shot))
                shots.append(str(shot))
            ctx.close()
            record[vp] = {"viewport": hvp.VIEWPORTS[vp]["viewport"], "rows": rows,
                          "largestMiss": max(r["sightMissesAxisBy"] for r in rows),
                          "trunkScreenX": [min(r["trunkScreenX"] for r in rows), max(r["trunkScreenX"] for r in rows)]}
            subprocess.run(["magick", "montage", "-font", "DejaVu-Sans", "-pointsize", "18", "-label", "%f", *shots,
                            "-tile", "7x", "-geometry", "480x360+3+3", "-quality", "86",
                            str(hvp.OUT / f"board-pivot-{vp}.jpg")], check=True)
            print(f"{vp:18} sight misses the trunk axis by {record[vp]['largestMiss']} m at most; "
                  f"trunk on screen from {record[vp]['trunkScreenX'][0]} to {record[vp]['trunkScreenX'][1]} of the width; "
                  f"missed stops: {sum(1 for r in rows if not r['reached'])}")
        browser.close()
    (hvp.OUT / "pivot.json").write_text(json.dumps(record, indent=1))


if __name__ == "__main__":
    main()
