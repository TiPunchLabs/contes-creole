"""Layout check along the climb: at each stop on the way up and on the way back, where the
Konteur and the critters stand on screen against the shelf, the intro and the edges.

One open page per viewport, fake clock; the climb is driven by the wheel until the value read
back from the climb bar is the one asked for (a wheel notch does not weigh the same on every
emulated device), and a stop that is not reached within `REACH` is recorded as a fault. A figure is
`whole` (all of it on screen, clear of the shelf), `absent` (out of frame), `under shelf` (part of
it shows above or beside the shelf, part is behind it), `cut by edge` (by the top or the bottom of
the screen) or `leaving by the side` (the camera turning past it).
Usage: OUT=<dir> [VPS=...] uv run --with playwright python climb_check.py
"""

from __future__ import annotations

import json
import os
import subprocess
from typing import Any

from playwright.sync_api import Page, sync_playwright

import hvp

GRAZE = 0.06
# How close to the value asked for the climb bar must read, once settled.
REACH = 0.01
STOPS = [0.0, 0.07, 0.14, 0.2, 0.27, 0.34, 0.41, 0.47, 0.54, 0.61, 0.68, 0.75, 0.81, 0.88, 0.94, 1.0]
SHOTS = {0.0, 0.14, 0.2, 0.54, 0.88, 1.0}

STATE = """() => { const { T, scene, camera, renderer } = window.__hvp;
  const size = renderer.getSize(new T.Vector2());
  const r = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const th = document.querySelector('.tree-climb-thumb'), tr = th.parentElement.getBoundingClientRect(), tb = th.getBoundingClientRect();
  const figures = {};
  // The box is taken in the figure's own frame (it turns with it), from its meshes as they are
  // this frame, then projected: the world-axis box of a figure seen at an angle would be far larger
  // than the figure.
  const boxOf = (o) => { const local = new T.Box3(), v = new T.Vector3(), m = new T.Matrix4(); let seen = 1;
    o.updateWorldMatrix(true, true);
    const inverse = new T.Matrix4().copy(o.matrixWorld).invert();
    o.traverse((n) => { if (n.isMesh && n.visible !== false && !(n.material.transparent && !n.material.map && n.geometry.type === 'PlaneGeometry')) {
      n.geometry.computeBoundingBox(); m.multiplyMatrices(inverse, n.matrixWorld);
      local.union(n.geometry.boundingBox.clone().applyMatrix4(m)); seen = Math.min(seen, n.material.opacity ?? 1); } });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = 0;
    for (const x of [local.min.x, local.max.x]) for (const y of [local.min.y, local.max.y]) for (const z of [local.min.z, local.max.z]) {
      v.set(x, y, z).applyMatrix4(o.matrixWorld).project(camera); if (v.z > 1) behind++;
      const sx = (v.x + 1) / 2 * size.x, sy = (1 - v.y) / 2 * size.y;
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy); }
    let shown = true; for (let p = o; p; p = p.parent) if (!p.visible) shown = false;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, behind: behind > 0, opacity: seen, shown }; };
  scene.traverse((n) => { if (n.userData && n.userData.who) figures[n.userData.who] = boxOf(n);
    if (n.isMesh && n.material && n.material.emissiveMap && n.geometry.type === 'PlaneGeometry') figures.konteur = boxOf(n); });
  return { t: (tb.top - tr.top) / (tr.height - tb.height), figures, shelf: r('.tree-shelf'),
           intro: parseFloat(document.querySelector('.tree-intro').style.opacity || '1') > 0.05 ? r('.tree-intro-inner') : null,
           width: innerWidth, height: innerHeight }; }"""


def classify(box: dict[str, Any], state: dict[str, Any]) -> str:
    """Where a figure stands on screen: whole, absent, under shelf, under intro or cut by edge."""
    w, h, shelf = state["width"], state["height"], state["shelf"]
    if not box["shown"] or box["opacity"] < 0.05 or box["behind"]:
        return "absent"
    if box["x"] + box["w"] <= 0 or box["x"] >= w or box["y"] >= h or box["y"] + box["h"] <= 0:
        return "absent"
    hit = lambda a, b: a["x"] < b["x"] + b["w"] and b["x"] < a["x"] + a["w"] and a["y"] < b["y"] + b["h"] and b["y"] < a["y"] + a["h"]  # noqa: E731

    def overlap(a: dict[str, Any], b: dict[str, Any]) -> float:
        """Area two boxes share."""
        return (max(0.0, min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"]))
                * max(0.0, min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])))

    area = box["w"] * box["h"] or 1.0
    screen = {"x": 0, "y": 0, "w": w, "h": h}
    seen = {"x": max(0.0, box["x"]), "y": max(0.0, box["y"]),
            "w": max(0.0, min(w, box["x"] + box["w"]) - max(0.0, box["x"])),
            "h": max(0.0, min(h, box["y"] + box["h"]) - max(0.0, box["y"]))}
    behind = overlap(seen, shelf) / area
    beyond = 1 - overlap(box, screen) / area
    # What the left and right edges alone cut: the figure leaving the frame as the camera turns.
    tall = {"x": 0, "y": box["y"], "w": w, "h": box["h"]}
    sideways = 1 - overlap(box, tall) / area
    if state["intro"] and hit(box, state["intro"]):
        return "under intro"
    # The app lets a figure stand until 6 % of it is hidden (a toe behind the shelf): a graze.
    if behind > GRAZE:
        return "under shelf"
    if beyond - sideways > GRAZE:
        return "cut by edge"
    if sideways > GRAZE:
        return "leaving by the side"
    return "grazed" if behind + beyond > 0.001 else "whole"


def progress(page: Page) -> float:
    """Climb value the page shows, read from the climb bar."""
    return page.evaluate("""() => { const th = document.querySelector('.tree-climb-thumb'),
      tr = th.parentElement.getBoundingClientRect(), tb = th.getBoundingClientRect();
      return (tb.top - tr.top) / (tr.height - tb.height); }""")


def go(page: Page, target: float) -> float:
    """Wheels the climb to `target`, correcting on what the page shows; returns the value reached."""
    gain = 1.0
    reached = progress(page)
    for _ in range(8):
        if abs(target - reached) <= REACH / 4:
            break
        left = (target - reached) / 0.00055 * gain
        while abs(left) > 0.5:
            step = max(-120.0, min(120.0, left))
            page.mouse.wheel(0, step)
            left -= step
        page.clock.run_for(2496)
        now = progress(page)
        # What the wheel really moved, against what was asked: the device's own scale.
        if abs(now - reached) > 0.002 and not (now in (0.0, 1.0)):
            gain *= (target - reached) / (now - reached)
        reached = now
    return reached


def main() -> None:
    """Runs every viewport up and back, writes climb.json and one contact sheet per viewport."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    record: dict[str, Any] = {}
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for vp in os.environ.get("VPS", "phone-landscape,phone-landscape-l,desktop,mobile,laptop").split(","):
            ctx, page = hvp.open_home(browser, vp)
            page.clock.run_for(2000)
            page.mouse.move(page.viewport_size["width"] / 2, page.viewport_size["height"] * 0.35)
            rows = []
            shots = []
            for leg, stops in (("up", STOPS), ("back", STOPS[::-1][1:])):
                for target in stops:
                    go(page, target)
                    state = page.evaluate(STATE)
                    places = {who: classify(box, state) for who, box in state["figures"].items()}
                    rows.append({"leg": leg, "target": target, "t": round(state["t"], 4), "places": places,
                                 "reached": abs(state["t"] - target) <= REACH})
                    if target in SHOTS:
                        shot = hvp.OUT / f"climbcheck-{vp}-{leg}-t{target:.2f}.png"
                        page.screenshot(path=str(shot))
                        shots.append(str(shot))
            ctx.close()
            faults = [f'{r["leg"]} t={r["target"]:.2f} {who}: {place}' for r in rows for who, place in r["places"].items()
                      if place in ("under shelf", "under intro")]
            edges = sum(1 for r in rows for place in r["places"].values() if place == "cut by edge")
            sides = sum(1 for r in rows for place in r["places"].values() if place == "leaving by the side")
            missed = [f'{r["leg"]} asked {r["target"]:.2f} read {r["t"]:.3f}' for r in rows if not r["reached"]]
            whole = sum(1 for r in rows for place in r["places"].values() if place == "whole")
            grazed = sum(1 for r in rows for place in r["places"].values() if place == "grazed")
            record[vp] = {"viewport": hvp.VIEWPORTS[vp]["viewport"], "states": len(rows), "faults": faults,
                          "cutByEdge": edges, "leavingBySide": sides, "missed": missed, "whole": whole, "grazed": grazed, "rows": rows}
            subprocess.run(["magick", "montage", "-font", "DejaVu-Sans", "-pointsize", "20", "-label", "%f", *shots,
                            "-tile", "6x", "-geometry", "560x420+4+4", "-quality", "88",
                            str(hvp.OUT / f"board-climbcheck-{vp}.jpg")], check=True)
            print(f"{vp:18} states {len(rows)}  missed stops: {len(missed)}  under shelf or intro: {len(faults)}  "
                  f"cut by edge: {edges}  leaving by the side: {sides}  grazed: {grazed}  whole: {whole}")
            for m in missed:
                print("    MISSED", m)
            for f in faults[:40]:
                print("   ", f)
        browser.close()
    (hvp.OUT / "climb.json").write_text(json.dumps(record, indent=1))


if __name__ == "__main__":
    main()
