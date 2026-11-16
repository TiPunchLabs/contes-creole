"""The Konteur's feet and his lantern, close, at several climb values: what stands on the ground
beside him as the camera goes round (owner finding O5).

One crop per climb value around the lower half of his figure and the lantern, and a contact sheet
per viewport. Usage: OUT=<dir> [SITE=...] [VPS=...] uv run --with playwright python konteur_foot.py
"""

from __future__ import annotations

import os
import subprocess

from playwright.sync_api import sync_playwright

import hvp
from climb_check import go

STOPS = [0.0, 0.07, 0.14, 0.2, 0.3, 0.54, 0.88, 1.0]
# Screen box of his photo and of the lantern beside it (the lit glass is the emissive cylinder).
BOX = """() => { const { T, scene, camera, renderer } = window.__hvp;
  const size = renderer.getSize(new T.Vector2()); let photo = null;
  scene.traverse((n) => { if (n.isMesh && n.material && n.material.emissiveMap && n.geometry.type === 'PlaneGeometry') photo = n; });
  const group = photo.parent, v = new T.Vector3(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = false;
  for (const [x, y, z] of [[-0.7, 0, 0], [1.1, 0, 0.5], [-0.7, 1.0, 0], [1.1, 1.0, 0], [0, -0.1, 0.6]]) {
    v.set(x, y, z).applyMatrix4(group.matrixWorld).project(camera); if (v.z > 1) behind = true;
    const sx = (v.x + 1) / 2 * size.x, sy = (1 - v.y) / 2 * size.y;
    x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, behind }; }"""


def main() -> None:
    """Runs every viewport and writes the crops and the sheets."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for vp in os.environ.get("VPS", "desktop2x,mobile,phone-landscape").split(","):
            ctx, page = hvp.open_home(browser, vp)
            page.clock.run_for(2000)
            size = page.viewport_size
            page.mouse.move(size["width"] / 2, size["height"] * 0.3)
            shots = []
            for target in STOPS:
                go(page, target)
                box = page.evaluate(BOX)
                if box["behind"] or box["x"] + box["w"] < 0 or box["x"] > size["width"] or box["y"] > size["height"]:
                    continue
                shot = hvp.OUT / f"konteur-foot-{vp}-t{target:.2f}.png"
                page.screenshot(path=str(shot), clip=hvp.clip_around(box, size, pad=0.15, min_size=90))
                shots.append(str(shot))
            ctx.close()
            subprocess.run(["magick", "montage", "-font", "DejaVu-Sans", "-pointsize", "16", "-label", "%f", *shots,
                            "-tile", "8x", "-geometry", "360x300+3+3", "-quality", "90",
                            str(hvp.OUT / f"board-konteur-foot-{vp}.jpg")], check=True)
            print(vp, len(shots), "crops")
        browser.close()


if __name__ == "__main__":
    main()
