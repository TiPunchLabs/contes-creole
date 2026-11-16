"""Zanba's ears against his body and head, on every frame of a minute of his life: idle, walks,
turns, the fanning and flaps of the ears, and being touched (the pointer rests on him twice).

Each frame, every vertex of both ears is taken into the head's own ball and into the body's (the
barrel, a stretched sphere). A vertex inside the head is hidden: that is the root, sunk in the
temple on purpose, and it only counts as a fault further than 0.3 of the model's units out from
the hinge: the ear folded into the head. The blade is the ear from 0.16 out. A blade vertex outside
the head and inside the barrel is the ear entering the body: the fault looked for. Root vertices
that show outside the head and lie inside the barrel are counted apart (`rootInBody`): when the
head turns, its own side meets the shoulder and the root of the ear is at that junction. Writes ears.json, and a close capture at each new
extreme of the run: least clearance, widest lift of an ear off the shoulder, furthest turn of the
head either way.
Usage: OUT=<dir> [SITE=...] [VPS=...] [SECONDS=60] uv run --with playwright python ears.py
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from playwright.sync_api import sync_playwright

import hvp

# How much an extreme must be beaten by for a new capture (metres, radians).
STEP = {"gap": 0.004, "lift": 0.12, "yawL": 0.1, "yawR": 0.1}

# The meshes are found by their place in the figure, so the check also runs on builds before it.
MEASURE = """() => { const { T, scene } = window.__hvp; let z = null;
  scene.traverse((n) => { if (n.userData && n.userData.who === 'zanba') z = n; });
  const found = []; z.traverse((m) => { if (m.isMesh && Math.abs(m.scale.x) === 1 && m.scale.y === 1
    && m.parent.children.length === 1 && m.parent.parent && m.parent.parent.parent
    && m.parent.parent.parent.parent === z) found.push(m); });
  // The two ears are the pair that shares one geometry, mirrored.
  const ears = found.filter((m) => found.some((o) => o !== m && o.geometry === m.geometry && o.scale.x === -m.scale.x));
  if (ears.length !== 2) return { error: 'ears found: ' + ears.length };
  const head = ears[0].parent.parent, body = head.parent;
  const barrel = body.children.find((m) => m.isMesh);
  z.updateWorldMatrix(true, true);
  const toBarrel = new T.Matrix4().copy(barrel.matrixWorld).invert();
  const toHead = new T.Matrix4().copy(head.matrixWorld).invert();
  const v = new T.Vector3(), w = new T.Vector3();
  // World metres per unit of the barrel's ball, along its thinnest axis.
  const unit = Math.min(barrel.scale.x, barrel.scale.y, barrel.scale.z) * z.scale.x;
  let inBody = 0, inHead = 0, rootInBody = 0, least = Infinity, deepest = 0;
  for (const ear of ears) { const p = ear.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const local = v.x, blade = local >= 0.16;
      v.applyMatrix4(ear.matrixWorld); w.copy(v).applyMatrix4(toHead);
      const hidden = (w.x / 0.58) ** 2 + (w.y / 0.55) ** 2 + (w.z / 0.52) ** 2 < 1;
      // Hidden in the head: the root's place. Further out than 0.3 it would be the ear folded in.
      if (hidden) { if (local > 0.3) inHead++; continue; }
      // What shows of the ear, outside the head: none of its blade may be inside the body.
      w.copy(v).applyMatrix4(toBarrel);
      const gap = (w.length() - 1) * unit;
      if (!blade) { if (gap < 0) rootInBody++; continue; }
      least = Math.min(least, gap);
      if (gap < 0) { inBody++; deepest = Math.max(deepest, -gap); } } }
  return { inBody, inHead, rootInBody, least, deepest, lift: ears.map((e) => Math.abs(e.parent.rotation.z)), fan: ears.map((e) => Math.abs(e.parent.rotation.y)),
           headYaw: head.rotation.y, vertices: ears[0].geometry.attributes.position.count * 2 }; }"""


def main() -> None:
    """Runs every viewport, writes ears.json, exits 1 if an ear enters the body or the head."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    seconds = int(os.environ.get("SECONDS", "60"))
    record: dict[str, Any] = {}
    bad = 0
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for vp in os.environ.get("VPS", "desktop,mobile,phone-landscape").split(","):
            ctx, page = hvp.open_home(browser, vp)
            size = page.viewport_size
            frames = seconds * 1000 // 16
            extreme: dict[str, float] = {}
            rows: list[dict[str, Any]] = []
            shots: list[str] = []
            for n in range(frames):
                page.clock.run_for(16)
                # The pointer comes to rest on him twice, for two seconds: he is touched, ears wide.
                if n in (frames // 4, frames * 3 // 5):
                    box = page.evaluate(hvp.BOXES_JS)["zanba"]
                    page.mouse.move(box["x"] + box["w"] / 2, box["y"] + box["h"] / 2)
                if n in (frames // 4 + 125, frames * 3 // 5 + 125):
                    page.mouse.move(size["width"] / 2, 5)
                m = page.evaluate(MEASURE)
                if "error" in m:
                    raise RuntimeError(m["error"])
                rows.append(m)
                # A close capture at each new extreme: least clearance, widest lift off the shoulder,
                # furthest turn of the head either way. The last ones are the run's worst frames.
                marks = {"gap": -m["least"], "lift": max(m["lift"]), "yawL": -m["headYaw"], "yawR": m["headYaw"]}
                beaten = [k for k, v in marks.items() if n > 90 and v > extreme.get(k, -9.0) + STEP[k]]
                if beaten:
                    for k in beaten:
                        extreme[k] = marks[k]
                    box = page.evaluate(hvp.BOXES_JS)["zanba"]
                    if box["x"] + box["w"] > 0 and box["x"] < size["width"] and not box["behind"]:
                        shot = hvp.OUT / (f"ears-{vp}-frame{n:04d}-{'-'.join(beaten)}-gap{m['least'] * 100:+.1f}cm"
                                          f"-lift{max(m['lift']):.2f}-yaw{m['headYaw']:+.2f}.png")
                        page.screenshot(path=str(shot), clip=hvp.clip_around(box, size, pad=0.3, min_size=200))
                        shots.append(shot.name)
            ctx.close()
            entered = [i for i, r in enumerate(rows) if r["inBody"]]
            folded = [i for i, r in enumerate(rows) if r["inHead"]]
            record[vp] = {"frames": len(rows), "seconds": seconds, "verticesPerFrame": rows[0]["vertices"],
                          "framesWithEarInBody": len(entered), "framesWithBladeInHead": len(folded),
                          "mostVerticesInBody": max(r["inBody"] for r in rows),
                          "mostRootVerticesAtTheShoulder": max(r["rootInBody"] for r in rows),
                          "liftRangeRadians": [round(min(min(r["lift"]) for r in rows), 3), round(max(max(r["lift"]) for r in rows), 3)],
                          "deepestInBodyMetres": round(max(r["deepest"] for r in rows), 4),
                          "leastClearanceMetres": round(min(r["least"] for r in rows), 4),
                          "fanRangeRadians": [round(min(min(r["fan"]) for r in rows), 3), round(max(max(r["fan"]) for r in rows), 3)],
                          "headYawRangeRadians": [round(min(r["headYaw"] for r in rows), 3), round(max(r["headYaw"] for r in rows), 3)],
                          "extremeFrames": shots[-8:]}
            bad += len(entered) + len(folded)
            print(vp, {k: v for k, v in record[vp].items() if k != "extremeFrames"})
        browser.close()
    (hvp.OUT / "ears.json").write_text(json.dumps(record, indent=1))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
