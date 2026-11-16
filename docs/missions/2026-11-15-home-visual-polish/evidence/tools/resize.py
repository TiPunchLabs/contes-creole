"""Live resize of one open page, in both directions: width across the layout limit (aspect 1.2),
then height down to a phone on its side and back. At each step: the camera's move, whether the
Konteur and the critters are whole on screen, clear of the shelf and of the intro text.

Usage: OUT=<dir> uv run --with playwright python resize.py
"""

from __future__ import annotations

import json
import subprocess
from typing import Any

from playwright.sync_api import sync_playwright

import hvp
from layout_check import overlaps

STATE = """() => { const { camera } = window.__hvp;
  const r = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const dir = camera.getWorldDirection(new window.__hvp.T.Vector3());
  return { cam: camera.position.toArray(), dir: dir.toArray(), intro: r('.tree-intro-inner'), shelf: r('.tree-shelf'),
           teller: r('.tree-teller'), band: getComputedStyle(document.querySelector('.tree-intro')).left === '0px',
           overflow: document.documentElement.scrollWidth > innerWidth }; }"""


def main() -> None:
    """Runs the two sweeps and writes resize.json and two contact sheets."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    widths = list(range(1000, 1401, 10))
    heights = list(range(820, 379, -20))
    sweeps = {
        "width at 1000 px high": [(w, 1000) for w in widths + widths[::-1][1:]],
        "height at 1280 px wide": [(1280, h) for h in heights + heights[::-1][1:]],
    }
    record: dict[str, Any] = {}
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for name, sizes in sweeps.items():
            ctx, page = hvp.open_home(browser, "desktop")
            page.set_viewport_size({"width": sizes[0][0], "height": sizes[0][1]})
            page.clock.run_for(500)
            steps = []
            last = None
            shots = []
            for i, (w, h) in enumerate(sizes):
                page.set_viewport_size({"width": w, "height": h})
                page.clock.run_for(96)
                s = page.evaluate(STATE)
                boxes = page.evaluate(hvp.BOXES_JS)
                figures = {k: {"x": v["x"], "y": v["y"], "w": v["w"], "h": v["h"]} for k, v in boxes.items()}
                if s["teller"]:
                    figures["konteur"] = s["teller"]
                faults = []
                for who, box in figures.items():
                    if box["x"] < 0 or box["x"] + box["w"] > w or box["y"] + box["h"] > h:
                        faults.append(f"{who} cut")
                    if overlaps(box, s["shelf"]):
                        faults.append(f"{who} under shelf")
                    if overlaps(box, s["intro"]):
                        faults.append(f"{who} under intro")
                if not s["teller"]:
                    faults.append("konteur out of view")
                if s["overflow"]:
                    faults.append("overflow")
                move = 0.0 if last is None else sum((a - b) ** 2 for a, b in zip(s["cam"], last["cam"])) ** 0.5
                turn = 0.0 if last is None else sum((a - b) ** 2 for a, b in zip(s["dir"], last["dir"])) ** 0.5
                steps.append({"size": [w, h], "band": s["band"], "move": round(move, 3), "turn": round(turn, 4), "faults": faults})
                last = s
                if i % 5 == 0 or (last and steps[-1]["band"] != (steps[-2]["band"] if len(steps) > 1 else steps[-1]["band"])):
                    shot = hvp.OUT / f"resize-{name.split()[0]}-{i:03d}-{w}x{h}.png"
                    page.screenshot(path=str(shot))
                    shots.append(str(shot))
            ctx.close()
            switches = [steps[i]["size"] for i in range(1, len(steps)) if steps[i]["band"] != steps[i - 1]["band"]]
            record[name] = {
                "steps": len(steps),
                "pixelsPerStep": 10 if "width" in name else 20,
                "maxCameraMove": max(s["move"] for s in steps),
                "maxViewTurn": max(s["turn"] for s in steps),
                "layoutSwitchesAt": switches,
                "moveAtSwitch": [s["move"] for i, s in enumerate(steps) if i and s["band"] != steps[i - 1]["band"]],
                "faults": [{"size": s["size"], "faults": s["faults"]} for s in steps if s["faults"]],
                "detail": steps,
            }
            subprocess.run(["magick", "montage", "-font", "DejaVu-Sans", "-pointsize", "20", "-label", "%f", *shots,
                            "-tile", "6x", "-geometry", "420x420+4+4", "-quality", "88",
                            str(hvp.OUT / f"board-resize-{name.split()[0]}.jpg")], check=True)
        browser.close()
    (hvp.OUT / "resize.json").write_text(json.dumps(record, indent=1))
    for name, r in record.items():
        print(name, {k: r[k] for k in ("steps", "maxCameraMove", "maxViewTurn", "layoutSwitchesAt", "moveAtSwitch")}, "faults:", r["faults"][:4], len(r["faults"]))


if __name__ == "__main__":
    main()
