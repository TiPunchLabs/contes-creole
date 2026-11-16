"""Sway of the crown over time: pixel change between captures 0.5 s apart, for 45 s (fake clock).

A steady sway gives an even series; gusts give lulls and peaks. Prints mean, min, max and the
coefficient of variation. Usage: OUT=<dir> uv run --with playwright python wind.py
"""

from __future__ import annotations

import json
import re
import statistics
import subprocess

from playwright.sync_api import sync_playwright

import hvp

CLIP = {"x": 280, "y": 10, "width": 640, "height": 330}


def main() -> None:
    """Captures the series and writes wind.json."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        ctx, page = hvp.open_home(browser, "desktop")
        page.add_style_tag(content=".tree-overlay, .app-bubble, .app-grain { visibility: hidden !important; }")
        page.clock.run_for(2000)
        files = []
        for i in range(91):
            page.clock.run_for(496)
            files.append(hvp.OUT / f"wind-{i:03d}.png")
            page.screenshot(path=str(files[-1]), clip=CLIP)
        browser.close()
    series = []
    for a, b in zip(files, files[1:]):
        out = subprocess.run(["magick", "compare", "-metric", "MAE", str(a), str(b), "null:"],
                             capture_output=True, text=True).stderr
        series.append(float(re.search(r"\(([0-9.e-]+)\)", out).group(1)))
    for f in files[1:-1]:
        f.unlink()
    result = {"mean": statistics.mean(series), "min": min(series), "max": max(series),
              "cv": statistics.pstdev(series) / statistics.mean(series), "series": series}
    (hvp.OUT / "wind.json").write_text(json.dumps(result, indent=1))
    print({k: round(v, 5) for k, v in result.items() if k != "series"})


if __name__ == "__main__":
    main()
