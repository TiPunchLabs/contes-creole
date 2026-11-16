"""Load, transferred weight and frame pacing of the home, on the production build (vite preview).

Usage: SITE=http://localhost:5182/ OUT=<dir> [ONLY=load,fps] [SEQ_SECONDS=20] uv run --with \
       playwright python perf.py
FPS protocol: real clock, 5 s warm-up, then three sequences of SEQ_SECONDS each (rest, climb,
interactions), once with the display cap (vsync) and once uncapped; median fps = 1000 / median
frame delta; hitches = frames over 33.4 ms.
"""

from __future__ import annotations

import gzip
import json
import math
import os
import statistics
import subprocess
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright

import hvp

ONLY = os.environ.get("ONLY", "load,fps").split(",")
SEQ_SECONDS = float(os.environ.get("SEQ_SECONDS", "20"))
OUT = hvp.OUT

LOADER_PROBE = """() => {
  window.__loaderDone = null;
  let seen = false;
  const check = () => {
    const l = document.querySelector('.loader');
    if (l) seen = true;
    // Done once the loader that was there is marked done or removed.
    if (seen && (!l || l.classList.contains('is-done'))) window.__loaderDone = performance.now();
    else requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}"""

RECORD_START = """() => { const r = (window.__rec = { d: [], last: 0, on: true });
  const step = (now) => { if (!r.on) return; if (r.last) r.d.push(now - r.last); r.last = now;
    requestAnimationFrame(step); };
  requestAnimationFrame(step); }"""
RECORD_STOP = "() => { window.__rec.on = false; return window.__rec.d; }"


def summarize(deltas: list[float]) -> dict[str, float]:
    """Median fps, frame-time percentiles and hitch count of a list of frame deltas (ms)."""
    d = sorted(deltas)
    pick = lambda q: d[min(len(d) - 1, math.ceil(q * len(d)) - 1)]  # noqa: E731
    return {
        "frames": len(d),
        "medianFps": round(1000 / statistics.median(d), 2),
        "meanFps": round(1000 * len(d) / sum(d), 2),
        "p95Ms": round(pick(0.95), 2),
        "p99Ms": round(pick(0.99), 2),
        "maxMs": round(d[-1], 2),
        "over33ms": sum(1 for x in d if x > 33.4),
        "over50ms": sum(1 for x in d if x > 50),
    }


def load_once(browser: Browser, vp: str, warm: bool) -> dict[str, Any]:
    """One navigation in a fresh context (cold cache), or its reload (warm cache)."""
    ctx = browser.new_context(**hvp.VIEWPORTS[vp])
    page = ctx.new_page()
    page.add_init_script(f"({LOADER_PROBE})()")
    cdp = ctx.new_cdp_session(page)
    cdp.send("Network.enable")
    # The site's analytics stay out of QA runs; blocked here, not routed, so the HTTP cache works.
    cdp.send("Network.setBlockedURLs", {"urls": ["*cloud.umami.is*"]})
    requests: dict[str, dict[str, Any]] = {}
    failures: list[str] = []
    cdp.on("Network.responseReceived", lambda e: requests.setdefault(e["requestId"], {}).update(
        url=e["response"]["url"], status=e["response"]["status"], type=e["type"],
        cached=e["response"].get("fromDiskCache", False)))
    cdp.on("Network.loadingFinished", lambda e: requests.setdefault(e["requestId"], {}).update(
        bytes=e["encodedDataLength"]))
    cdp.on("Network.loadingFailed", lambda e: failures.append(e.get("errorText", "")))
    console: list[str] = []
    page.on("console", lambda m: console.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: console.append(f"pageerror: {e}"))
    page.goto(hvp.SITE, wait_until="load")
    page.wait_for_function("() => window.__loaderDone !== null", timeout=20000)
    if warm:
        requests.clear()
        console.clear()
        page.reload(wait_until="load")
        page.wait_for_function("() => window.__loaderDone !== null", timeout=20000)
    page.wait_for_timeout(1500)
    nav = page.evaluate("""() => { const n = performance.getEntriesByType('navigation')[0];
      return { domContentLoaded: n.domContentLoadedEventEnd, load: n.loadEventEnd,
               loaderDone: window.__loaderDone }; }""")
    done = [r for r in requests.values() if "url" in r]
    by_type: dict[str, int] = {}
    for r in done:
        by_type[r["type"]] = by_type.get(r["type"], 0) + int(r.get("bytes", 0))
    result = {
        "timing": {k: round(v, 1) for k, v in nav.items()},
        "requests": len(done),
        "transferredBytes": sum(int(r.get("bytes", 0)) for r in done),
        "byType": by_type,
        "status4xx5xx": [f'{r["status"]} {r["url"]}' for r in done if r["status"] >= 400],
        "failures": failures,
        "console": console,
        "urls": sorted((r["url"].replace(hvp.SITE, "/"), int(r.get("bytes", 0))) for r in done),
    }
    ctx.close()
    return result


def load(browser: Browser, record: dict[str, Any]) -> None:
    """Five cold and five warm loads per viewport; medians, plus the gzip weight of the dist files."""
    out: dict[str, Any] = {}
    for vp in ("desktop", "mobile"):
        for warm in (False, True):
            runs = [load_once(browser, vp, warm) for _ in range(5)]
            key = f'{vp}-{"warm" if warm else "cold"}'
            out[key] = {
                "median": {k: statistics.median(r["timing"][k] for r in runs) for k in runs[0]["timing"]},
                "runs": [r["timing"] for r in runs],
                "requests": runs[0]["requests"],
                "transferredBytes": runs[0]["transferredBytes"],
                "byType": runs[0]["byType"],
                "status4xx5xx": runs[0]["status4xx5xx"],
                "failures": runs[0]["failures"],
                "console": runs[0]["console"],
                "urls": runs[0]["urls"],
            }
    dist = Path(os.environ.get("DIST", "dist"))
    if dist.is_dir():
        files = {u for u, _ in out["desktop-cold"]["urls"]}
        weights = {}
        for u in sorted(files):
            f = dist / ("index.html" if u == "/" else u.lstrip("/"))
            if f.is_file():
                raw = f.read_bytes()
                weights[u] = {"raw": len(raw), "gzip9": len(gzip.compress(raw, 9))}
        out["distWeights"] = weights
        out["distTotals"] = {"raw": sum(w["raw"] for w in weights.values()),
                             "gzip9": sum(w["gzip9"] for w in weights.values())}
    record["load"] = out


def sequence(page: Page, name: str, seconds: float) -> list[float]:
    """Plays one scripted sequence in real time and returns its frame deltas."""
    size = page.viewport_size
    w, h = size["width"], size["height"]
    page.mouse.move(w / 2, h * 0.14)
    page.evaluate(RECORD_START)
    steps = int(seconds * 20)
    for i in range(steps):
        u = i / steps
        if name == "climb":
            # Up in the first half, down in the second: 1 / 0.00055 px of wheel each way.
            way = 1 if u < 0.5 else -1
            page.mouse.wheel(0, way * (1 / 0.00055) / (steps / 2))
        elif name == "interactions":
            # A slow figure over the clearing (critters, Konteur, cards), with a short climb nudge.
            page.mouse.move(w * (0.5 + 0.46 * math.sin(u * 2 * math.pi * 3)),
                            h * (0.62 + 0.22 * math.sin(u * 2 * math.pi * 5)))
            if i % 100 == 50:
                page.mouse.wheel(0, 200)
            if i % 100 == 90:
                page.mouse.wheel(0, -200)
        page.wait_for_timeout(50)
    return page.evaluate(RECORD_STOP)


def fps(pw: Any, record: dict[str, Any]) -> None:
    """The three sequences per viewport, display-capped then uncapped."""
    out: dict[str, Any] = {}
    modes = os.environ.get("FPS_MODES", "capped,uncapped").split(",")
    for uncapped in (False, True):
        if ("uncapped" if uncapped else "capped") not in modes:
            continue
        browser = hvp.launch(pw, uncapped=uncapped)
        for vp in os.environ.get("FPS_VPS", "desktop,mobile").split(","):
            ctx = browser.new_context(**hvp.VIEWPORTS[vp])
            hvp.quiet(ctx)
            page = ctx.new_page()
            page.goto(hvp.SITE, wait_until="load")
            page.wait_for_function(
                "() => { const l = document.querySelector('.loader'); return !l || l.classList.contains('is-done'); }")
            renderer = hvp.gl_renderer(page)
            if "NVIDIA" not in renderer:
                raise RuntimeError(f"not on the NVIDIA GPU: {renderer}")
            page.wait_for_timeout(5000)
            for name in os.environ.get("FPS_SEQS", "rest,climb,interactions").split(","):
                deltas = sequence(page, name, SEQ_SECONDS)
                key = f'{vp}-{"uncapped" if uncapped else "capped"}-{name}'
                out[key] = summarize(deltas)
                (OUT / f"frames-{key}.json").write_text(json.dumps([round(x, 3) for x in deltas]))
                page.wait_for_timeout(1500)
            ctx.close()
        browser.close()
    record["fps"] = out


def main() -> None:
    """Runs the selected measurements and merges them into perf.json with the run conditions."""
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / "perf.json"
    record: dict[str, Any] = json.loads(target.read_text()) if target.exists() else {}
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        record["conditions"] = {
            "site": hvp.SITE,
            "browser": browser.version,
            "args": hvp.GPU_ARGS,
            "uncappedArgs": hvp.UNCAPPED_ARGS,
            "headless": True,
            "loadavg": os.getloadavg(),
            "gpu": subprocess.run(["nvidia-smi", "--query-gpu=name,driver_version,utilization.gpu",
                                   "--format=csv,noheader"], capture_output=True, text=True).stdout.strip(),
            "seqSeconds": SEQ_SECONDS,
        }
        if "load" in ONLY:
            load(browser, record)
        browser.close()
        if "fps" in ONLY:
            fps(pw, record)
    target.write_text(json.dumps(record, indent=1))
    for key, value in record.get("fps", {}).items():
        print(key, value)


if __name__ == "__main__":
    main()
