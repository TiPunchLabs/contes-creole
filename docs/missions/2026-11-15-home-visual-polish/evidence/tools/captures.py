"""Deterministic captures of the home (fake clock, 16 ms frames): full views, climb states,
character close-ups and turntables, frame-stepped videos, renderer.info.

Usage: OUT=<dir> [ONLY=views,climb,closeups,turntable,videos,info,sizes] uv run --with playwright \
       python captures.py
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright

import hvp

ONLY = os.environ.get("ONLY", "views,climb,closeups,turntable,videos,info,sizes").split(",")
OUT = hvp.OUT
CLIMB_STOPS = [0.0, 0.1, 0.2, 0.54, 0.88, 1.0]
HIDE_UI = ".tree-overlay, .app-bubble { visibility: hidden !important; }"

INFO_JS = """() => { const r = window.__hvp.renderer, i = r.info;
  return { calls: i.render.calls, triangles: i.render.triangles, points: i.render.points,
           lines: i.render.lines, geometries: i.memory.geometries, textures: i.memory.textures,
           programs: i.programs ? i.programs.length : null, pixelRatio: r.getPixelRatio(),
           buffer: r.getDrawingBufferSize(new window.__hvp.T.Vector2()).toArray() }; }"""

# Renders the frozen scene from a camera placed around a critter (bearing from its own heading).
ORBIT_JS = """([who, bearing, dist, height, lookUp, flat]) => {
  const { T, scene, camera, renderer } = window.__hvp;
  let o = null; scene.traverse((n) => { if (n.userData && n.userData.who === who) o = n; });
  const p = o.getWorldPosition(new T.Vector3());
  const a = o.rotation.y + bearing;
  const cam = camera.clone();
  cam.fov = 30; cam.updateProjectionMatrix();
  cam.position.set(p.x + Math.sin(a) * dist, p.y + height, p.z + Math.cos(a) * dist);
  cam.lookAt(p.x, p.y + lookUp, p.z);
  cam.updateMatrixWorld();
  let restore = null;
  if (flat) {
    // Flat-colour silhouette: the critter black on white, everything else hidden.
    const shown = []; scene.children.forEach((c) => { shown.push([c, c.visible]); c.visible = c === o; });
    const bg = scene.background, fog = scene.fog, over = scene.overrideMaterial;
    scene.background = new T.Color('#ffffff'); scene.fog = null;
    scene.overrideMaterial = new T.MeshBasicMaterial({ color: '#000000' });
    // The contact shadow is a transparent plane: not part of the silhouette.
    o.traverse((n) => { if (n.isMesh && n.material.transparent) { shown.push([n, n.visible]); n.visible = false; } });
    restore = () => { shown.forEach(([c, v]) => (c.visible = v)); scene.background = bg; scene.fog = fog; scene.overrideMaterial = over; };
  }
  renderer.render(scene, cam);
  if (restore) restore();
  return true;
}"""


def climb_to(page: Page, t: float) -> None:
    """Scrolls the climb to `t` with wheel events (0.00055 per pixel) and lets the camera settle."""
    page.mouse.move(720 if page.viewport_size["width"] > 900 else 195, 300)
    left = t / 0.00055
    while left > 0.5:
        step = min(120.0, left)
        page.mouse.wheel(0, step)
        left -= step
    page.clock.run_for(3008)


def gray_and_thumb(path: Path) -> None:
    """Writes the greyscale and the 320 px thumbnail twins of a capture."""
    stem = path.with_suffix("")
    subprocess.run(["magick", str(path), "-colorspace", "Gray", f"{stem}.gray.png"], check=True)
    subprocess.run(["magick", str(path), "-resize", "320x", f"{stem}.thumb.png"], check=True)


def views(browser: Browser, record: dict[str, Any]) -> None:
    """Full views at rest at three instants, every viewport for the first one."""
    for vp in hvp.VIEWPORTS:
        if vp == "desktop2x":
            continue
        logs: list[dict[str, Any]] = []
        ctx, page = hvp.open_home(browser, vp, logs=logs)
        for seconds in (2, 12, 30) if vp in ("desktop", "mobile") else (2,):
            page.clock.run_for({2: 2000, 12: 10000, 30: 18000}[seconds])
            path = OUT / f"view-{vp}-rest-{seconds:02d}s.png"
            page.screenshot(path=str(path))
            if vp in ("desktop", "mobile"):
                gray_and_thumb(path)
            record.setdefault("boxes", {})[f"{vp}-rest-{seconds:02d}s"] = page.evaluate(hvp.BOXES_JS)
        record.setdefault("logs", {})[f"views-{vp}"] = logs
        ctx.close()
    for vp in ("desktop", "mobile"):
        ctx, page = hvp.open_home(browser, vp, reduced_motion=True)
        page.clock.run_for(2000)
        page.screenshot(path=str(OUT / f"view-{vp}-reduced-motion-02s.png"))
        ctx.close()


def climb(browser: Browser, record: dict[str, Any]) -> None:
    """The climb at fixed values of t, from a fresh load each (same clock for every stop)."""
    stops = [float(x) for x in os.environ["STOPS"].split(",")] if "STOPS" in os.environ else None
    for vp in os.environ.get("VPS", "desktop,mobile,tablet,laptop,small,tall").split(","):
        for t in stops or (CLIMB_STOPS[1:] if vp in ("desktop", "mobile") else (0.2, 0.54)):
            ctx, page = hvp.open_home(browser, vp)
            page.clock.run_for(2000)
            climb_to(page, t)
            page.screenshot(path=str(OUT / f"climb-{vp}-t{t:.2f}.png"))
            record.setdefault("info", {})[f"{vp}-t{t:.2f}"] = page.evaluate(INFO_JS)
            ctx.close()


def info(browser: Browser, record: dict[str, Any]) -> None:
    """renderer.info at rest (t = 0), full and lite."""
    for vp in ("desktop", "desktop2x", "mobile"):
        ctx, page = hvp.open_home(browser, vp)
        page.clock.run_for(2000)
        record.setdefault("info", {})[f"{vp}-t0.00"] = page.evaluate(INFO_JS)
        record.setdefault("gl", {})[vp] = hvp.gl_renderer(page)
        ctx.close()


def closeups(browser: Browser, record: dict[str, Any]) -> None:
    """Both critters and the Konteur at displayed size: device pixels at DPR 1, then at DPR 2/3."""
    for vp, label in (("desktop", "x1"), ("desktop2x", "x2"), ("mobile", "x3-emulated")):
        ctx, page = hvp.open_home(browser, vp)
        size = page.viewport_size
        for seconds in (2, 12):
            page.clock.run_for(seconds * 1000 if seconds == 2 else 10000)
            boxes = page.evaluate(hvp.BOXES_JS)
            for who, box in boxes.items():
                if box["x"] + box["w"] < 0 or box["x"] > size["width"]:
                    record.setdefault("offscreen", []).append(f"{vp} {who} {seconds}s")
                    continue
                clip = hvp.clip_around(box, size, pad=0.5, min_size=150)
                page.screenshot(path=str(OUT / f"closeup-{who}-{vp}-{label}-{seconds:02d}s.png"), clip=clip)
        ctx.close()
    # x2 magnification of the DPR 1 pixels (what a DPR 1 screen shows, enlarged without smoothing).
    for f in OUT.glob("closeup-*-desktop-x1-*.png"):
        subprocess.run(["magick", str(f), "-filter", "point", "-resize", "200%",
                        str(f.with_name(f.name.replace("-x1-", "-x1-magnified2-")))], check=True)


def turntable(browser: Browser, record: dict[str, Any]) -> None:
    """Each critter from 4 bearings at inspection distance, lit and as a flat silhouette (DPR 2)."""
    ctx, page = hvp.open_home(browser, "desktop2x")
    page.add_style_tag(content=HIDE_UI)
    for seconds, state in ((2, "idle"), (int(os.environ.get("WALK_AT", "9")), "walk")):
        page.clock.run_for(2000 if seconds == 2 else (seconds - 2) * 1000)
        for who, dist, height, look in (("lapen", 4.2, 1.0, 0.75), ("zanba", 6.4, 1.6, 1.05)):
            for name, bearing in (("front", 0.0), ("three-quarter", 0.7), ("side", 1.5708), ("back", 3.1416)):
                for flat in (False, True):
                    page.evaluate(ORBIT_JS, [who, bearing, dist, height, look, flat])
                    kind = "silhouette" if flat else "lit"
                    page.screenshot(path=str(OUT / f"turntable-{who}-{state}-{name}-{kind}.png"),
                                    clip={"x": 420, "y": 150, "width": 600, "height": 600})
    ctx.close()


def sweep(browser: Browser, record: dict[str, Any]) -> None:
    """The opening at every size of the layout sweep (fake clock 2 s), with overflow and box checks."""
    names = ["laptop", "tablet", "small", "tall", *hvp.SWEEP]
    for vp in names:
        ctx, page = hvp.open_home(browser, vp)
        page.clock.run_for(2000)
        page.screenshot(path=str(OUT / f"sweep-{vp}.png"))
        size = page.viewport_size
        boxes = page.evaluate(hvp.BOXES_JS)
        dom = page.evaluate("""() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null;
            const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
          return { intro: r('.tree-intro-inner'), shelf: r('.tree-shelf'), teller: r('.tree-teller'),
                   overflow: document.documentElement.scrollWidth > innerWidth }; }""")
        record.setdefault("sweep", {})[vp] = {"viewport": size, "dom": dom, "critters": {
            k: {"x": round(v["x"]), "y": round(v["y"]), "w": round(v["w"]), "h": round(v["h"])} for k, v in boxes.items()}}
        ctx.close()


def encode(frames: Path, target: Path, fps: int = 30) -> None:
    """Assembles numbered JPEG frames into an H.264 MP4 and drops the frames."""
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i",
                    str(frames / "%05d.jpg"), "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", "-crf", "18", str(target)], check=True)
    for f in frames.glob("*.jpg"):
        f.unlink()
    frames.rmdir()


def videos(browser: Browser, record: dict[str, Any]) -> None:
    """Frame-stepped videos (every other 16 ms frame, played at 30 fps = near real time)."""
    step_ms, per_second = 32, 31.25
    kinds = os.environ.get("VIDEO_KINDS", "tree,rest,follow").split(",")
    for vp in ("desktop", "mobile"):
        if "tree" not in kinds:
            break
        # Tree: 6 s at rest, the climb up in 12 s, 3 s at the top, down in 9 s.
        ctx, page = hvp.open_home(browser, vp)
        page.clock.run_for(2000)
        frames = OUT / f"frames-tree-{vp}"
        frames.mkdir(exist_ok=True)
        page.mouse.move(page.viewport_size["width"] / 2, 300)
        total = int(30 * per_second)
        for i in range(total):
            s = i / per_second
            if 6 <= s < 18:
                page.mouse.wheel(0, (1 / 0.00055) / (12 * per_second))
            elif 21 <= s < 30:
                page.mouse.wheel(0, -(1 / 0.00055) / (9 * per_second))
            page.clock.run_for(step_ms)
            page.screenshot(path=str(frames / f"{i:05d}.jpg"), type="jpeg", quality=88)
        ctx.close()
        encode(frames, OUT / f"video-tree-climb-{vp}.mp4")
    for vp in ("desktop", "mobile"):
        if "rest" not in kinds:
            break
        # Characters in the app's own framing: 45 s at rest, each critter hovered once.
        ctx, page = hvp.open_home(browser, vp)
        page.clock.run_for(2000)
        frames = OUT / f"frames-rest-{vp}"
        frames.mkdir(exist_ok=True)
        total = int(45 * per_second)
        for i in range(total):
            s = i / per_second
            for who, at in (("lapen", 15.0), ("zanba", 28.0)):
                if abs(s - at) < 0.5 / per_second and vp == "desktop":
                    box = page.evaluate(hvp.BOXES_JS)[who]
                    page.mouse.move(box["x"] + box["w"] / 2, box["y"] + box["h"] / 2)
                    record.setdefault("pokes", {})[f"{vp}-{who}"] = {"second": at, "box": box}
            if abs(s - 20.0) < 0.5 / per_second or abs(s - 34.0) < 0.5 / per_second:
                page.mouse.move(page.viewport_size["width"] / 2, 120)
            page.clock.run_for(step_ms)
            page.screenshot(path=str(frames / f"{i:05d}.jpg"), type="jpeg", quality=88)
        ctx.close()
        encode(frames, OUT / f"video-characters-rest-{vp}.mp4")
    # Character close-ups: a camera riding 3/4 in front of each critter at a fixed world bearing.
    for who, dist, height, look in (("lapen", 4.2, 1.0, 0.5), ("zanba", 7.5, 1.9, 1.0)):
        if "follow" not in kinds:
            break
        ctx, page = hvp.open_home(browser, "desktop")
        page.add_style_tag(content=HIDE_UI)
        page.clock.run_for(2000)
        frames = OUT / f"frames-follow-{who}"
        frames.mkdir(exist_ok=True)
        total = int(40 * per_second)
        follow = ORBIT_JS.replace("const a = o.rotation.y + bearing;", "const a = bearing;")
        for i in range(total):
            s = i / per_second
            if abs(s - 18.0) < 0.5 / per_second:
                box = page.evaluate(hvp.BOXES_JS)[who]
                page.mouse.move(box["x"] + box["w"] / 2, box["y"] + box["h"] / 2)
            if abs(s - 24.0) < 0.5 / per_second:
                page.mouse.move(720, 120)
            page.clock.run_for(step_ms)
            page.evaluate(follow, [who, 3.6, dist, height, look, False])
            page.screenshot(path=str(frames / f"{i:05d}.jpg"), type="jpeg", quality=88,
                            clip={"x": 320, "y": 50, "width": 800, "height": 800})
        ctx.close()
        encode(frames, OUT / f"video-follow-{who}.mp4")


def sizes(browser: Browser, record: dict[str, Any]) -> None:
    """Screen share of the main masses at the opening view, from the projected boxes."""
    for vp in ("desktop", "mobile"):
        ctx, page = hvp.open_home(browser, vp)
        page.clock.run_for(2000)
        size = page.viewport_size
        boxes = page.evaluate(hvp.BOXES_JS)
        dom = page.evaluate("""() => Object.fromEntries(['.tree-intro', '.tree-intro-title', '.tree-shelf',
          '.tree-climb', '.tree-teller'].map((s) => { const r = document.querySelector(s)?.getBoundingClientRect();
          return [s, r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null]; }))""")
        record.setdefault("layout", {})[vp] = {
            "viewport": size, "dom": dom,
            "critters": {k: {"x": round(v["x"]), "y": round(v["y"]), "w": round(v["w"]), "h": round(v["h"]),
                             "heightShare": round(v["h"] / size["height"], 4), "dist": round(v["dist"], 2)}
                         for k, v in boxes.items()},
        }
        ctx.close()


def main() -> None:
    """Runs the selected capture groups and merges their record into captures.json."""
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / "captures.json"
    record: dict[str, Any] = json.loads(target.read_text()) if target.exists() else {}
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        record["browser"] = browser.version
        for name in ONLY:
            globals()[name](browser, record)
            target.write_text(json.dumps(record, indent=1))
        browser.close()


if __name__ == "__main__":
    main()
