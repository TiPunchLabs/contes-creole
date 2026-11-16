"""Contrast of the home's texts against what is really behind them (WCAG ratio, worst pixel).

Each text is measured at the opening (fake clock 2 s): its colour from the computed style, its
background from a capture of its box with the text made transparent; the ratio uses the darkest
background pixel. Usage: OUT=<dir> uv run --with playwright python contrast.py
"""

from __future__ import annotations

import json
import re
import subprocess

from playwright.sync_api import sync_playwright

import hvp

TEXTS = {
    ".tree-intro-title": 3.0,
    ".tree-intro-kicker": 4.5,
    ".tree-intro-motto": 3.0,
    ".tree-intro-gloss": 3.0,
    ".tree-intro-text": 4.5,
    ".tree-intro-hint span": 4.5,
    ".tree-shelf-label": 4.5,
    ".tree-shelf-title": 4.5,
    ".tree-shelf-sub": 4.5,
}
HIDE = """.tree-intro *, .tree-shelf * { color: transparent !important; }
.tree-intro svg, .tree-shelf-dot { visibility: hidden !important; }
.tree-intro-hint { border-color: transparent !important; }"""


def linear(channel: float) -> float:
    """sRGB channel (0..255) to linear light."""
    c = channel / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(css: str) -> float:
    """Relative luminance of a CSS rgb() or oklch-resolved colour string."""
    r, g, b = (float(x) for x in re.findall(r"[0-9.]+", css)[:3])
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)


def main() -> None:
    """Measures every text on four viewports and writes contrast.json."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    out: dict[str, dict[str, dict[str, float | bool]]] = {}
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for vp in ("desktop", "laptop", "mobile", "tablet", "w800"):
            ctx, page = hvp.open_home(browser, vp)
            page.clock.run_for(2000)
            # Computed colours come back as the browser serialises them; a canvas turns them to rgb.
            found = page.evaluate("""(selectors) => { const c = document.createElement('canvas').getContext('2d');
              return selectors.map((s) => { const e = document.querySelector(s); if (!e) return null;
                const r = e.getBoundingClientRect(); c.fillStyle = getComputedStyle(e).color; c.fillRect(0, 0, 1, 1);
                const d = c.getImageData(0, 0, 1, 1).data;
                return { s, rgb: `rgb(${d[0]}, ${d[1]}, ${d[2]})`, x: r.x, y: r.y, w: r.width, h: r.height }; }); }""",
                                  list(TEXTS))
            page.add_style_tag(content=HIDE)
            out[vp] = {}
            for item in found:
                if not item or item["w"] < 2 or item["x"] + item["w"] > page.viewport_size["width"]:
                    continue
                shot = hvp.OUT / "contrast-box.png"
                page.screenshot(path=str(shot), clip={"x": item["x"], "y": item["y"], "width": item["w"], "height": item["h"]})
                low = float(subprocess.run(["magick", str(shot), "-colorspace", "LinearGray", "-format", "%[fx:minima]", "info:"],
                                           capture_output=True, text=True).stdout)
                text = luminance(item["rgb"])
                ratio = (low + 0.05) / (text + 0.05)
                out[vp][item["s"]] = {"ratio": round(ratio, 2), "needs": TEXTS[item["s"]], "ok": ratio >= TEXTS[item["s"]]}
            ctx.close()
        browser.close()
    (hvp.OUT / "contrast.json").write_text(json.dumps(out, indent=1))
    for vp, rows in out.items():
        worst = min(rows.items(), key=lambda kv: kv[1]["ratio"] / kv[1]["needs"])
        print(vp, "all ok" if all(r["ok"] for r in rows.values()) else "FAIL", "worst:", worst[0], worst[1]["ratio"], "needs", worst[1]["needs"])


if __name__ == "__main__":
    main()
