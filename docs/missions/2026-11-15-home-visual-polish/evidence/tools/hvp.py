"""Shared helpers of the home-visual-polish QA scripts (Playwright, system Chrome, NVIDIA EGL).

Run with: uv run --with playwright python <script>. The dev server must serve SITE.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, BrowserContext, Page, Playwright

SITE = os.environ.get("SITE", "http://localhost:5181/")
OUT = Path(
    os.environ.get("OUT", Path.home() / ".local/share/contes-creole-qa/home-visual-polish/baseline")
)
GPU_ARGS = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"]
UNCAPPED_ARGS = ["--disable-gpu-vsync", "--disable-frame-rate-limit"]
EGL_VENDOR = os.environ.get("QA_EGL_VENDOR", "/usr/share/glvnd/egl_vendor.d/10_nvidia.json")
FAKE_EPOCH = "2026-11-15T12:00:00Z"
FAKE_PAUSE = "2026-11-15T12:00:01Z"

VIEWPORTS: dict[str, dict[str, Any]] = {
    "desktop": {"viewport": {"width": 1440, "height": 900}, "device_scale_factor": 1},
    "desktop2x": {"viewport": {"width": 1440, "height": 900}, "device_scale_factor": 2},
    # Emulated phone: touch + coarse pointer, so the app picks its lite mode (pixel ratio 1).
    "mobile": {
        "viewport": {"width": 390, "height": 844},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
    },
    "tablet": {"viewport": {"width": 768, "height": 1024}, "device_scale_factor": 2,
               "is_mobile": True, "has_touch": True},
    "laptop": {"viewport": {"width": 1024, "height": 768}, "device_scale_factor": 1},
    "small": {"viewport": {"width": 360, "height": 640}, "device_scale_factor": 3,
              "is_mobile": True, "has_touch": True},
    "tall": {"viewport": {"width": 430, "height": 932}, "device_scale_factor": 3,
             "is_mobile": True, "has_touch": True},
}
# Extra sizes of the layout sweep (desktop pointer unless stated).
SWEEP: dict[str, dict[str, Any]] = {
    "w1920": {"viewport": {"width": 1920, "height": 1080}, "device_scale_factor": 1},
    "w1280": {"viewport": {"width": 1280, "height": 720}, "device_scale_factor": 1},
    # The window of the owner's capture of 2026-11-16 (finding O2).
    "w1920x839": {"viewport": {"width": 1920, "height": 839}, "device_scale_factor": 1},
    "w1100x1000": {"viewport": {"width": 1100, "height": 1000}, "device_scale_factor": 1},
    "w900sq": {"viewport": {"width": 900, "height": 900}, "device_scale_factor": 1},
    "w800": {"viewport": {"width": 800, "height": 600}, "device_scale_factor": 1},
    "phone-landscape": {"viewport": {"width": 844, "height": 390}, "device_scale_factor": 3,
                        "is_mobile": True, "has_touch": True},
    "phone-landscape-l": {"viewport": {"width": 932, "height": 430}, "device_scale_factor": 3,
                          "is_mobile": True, "has_touch": True},
    "phone-landscape-s": {"viewport": {"width": 667, "height": 375}, "device_scale_factor": 2,
                          "is_mobile": True, "has_touch": True},
    "w1200x1000": {"viewport": {"width": 1200, "height": 1000}, "device_scale_factor": 1},
    "w1201x1000": {"viewport": {"width": 1201, "height": 1000}, "device_scale_factor": 1},
    "w1250x1000": {"viewport": {"width": 1250, "height": 1000}, "device_scale_factor": 1},
    "w1280x1024": {"viewport": {"width": 1280, "height": 1024}, "device_scale_factor": 1},
    "w1024x540": {"viewport": {"width": 1024, "height": 540}, "device_scale_factor": 1},
}
VIEWPORTS.update(SWEEP)

# Grabs the live scene, camera and renderer without touching the app: three's module instance is
# the one Vite serves to the app, so patching its prototypes reaches the app's own objects.
HOOK_JS = """
async () => {
  if (window.__hvp) return true;
  // The fake clock empties the resource timeline, so the URL is read from a served module.
  const src = await (await fetch('/src/shared/three/stage.ts')).text();
  const url = (src.match(/from\\s+"([^"]*\\/deps\\/three\\.js[^"]*)"/) || [])[1];
  if (!url) return false;
  const T = await import(url);
  const q = (window.__hvp = { T, scene: null, camera: null, renderer: null });
  const lookAt = T.Object3D.prototype.lookAt;
  T.Object3D.prototype.lookAt = function (...a) {
    if (this.isCamera) q.camera = this;
    return lookAt.apply(this, a);
  };
  const umw = T.Object3D.prototype.updateMatrixWorld;
  T.Object3D.prototype.updateMatrixWorld = function (...a) {
    if (this.isScene && q.scene !== this) {
      q.scene = this;
      this.onBeforeRender = (r) => { q.renderer = r; };
    }
    return umw.apply(this, a);
  };
  return true;
}
"""

# Screen boxes (CSS px) of the two critters and the Konteur from the live scene.
BOXES_JS = """
() => {
  const { T, scene, camera, renderer } = window.__hvp;
  const size = renderer.getSize(new T.Vector2());
  const out = {};
  const boxOf = (o) => {
    // The body only: the contact shadow (a transparent plane) is left out of the box.
    const b = new T.Box3(), v = new T.Vector3();
    o.updateWorldMatrix(true, true);
    o.traverse((n) => { if (n.isMesh && !n.material.transparent) b.union(new T.Box3().setFromObject(n)); });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = false;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      v.set(x, y, z).project(camera);
      if (v.z > 1) behind = true;
      const sx = (v.x + 1) / 2 * size.x, sy = (1 - v.y) / 2 * size.y;
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
    }
    let shown = true; for (let p = o; p; p = p.parent) if (!p.visible) shown = false;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, behind, shown,
             world: o.getWorldPosition(new T.Vector3()).toArray(),
             dist: camera.position.distanceTo(o.getWorldPosition(new T.Vector3())) };
  };
  scene.traverse((o) => { if (o.userData && o.userData.who) out[o.userData.who] = boxOf(o); });
  return out;
}
"""


def launch(pw: Playwright, uncapped: bool = False) -> Browser:
    """Launches the system Chrome headless on the NVIDIA GPU through ANGLE/EGL."""
    env = {**os.environ, "__EGL_VENDOR_LIBRARY_FILENAMES": EGL_VENDOR}
    args = GPU_ARGS + (UNCAPPED_ARGS if uncapped else [])
    return pw.chromium.launch(channel="chrome", headless=True, args=args, env=env)


def gl_renderer(page: Page) -> str:
    """Returns the unmasked WebGL renderer string of a fresh canvas."""
    return page.evaluate(
        """() => { const gl = document.createElement('canvas').getContext('webgl2');
        const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
        return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'none'; }"""
    )


def open_home(
    browser: Browser,
    vp: str,
    *,
    fake_clock: bool = True,
    reduced_motion: bool = False,
    video_dir: Path | None = None,
    query: str = "",
    logs: list[dict[str, Any]] | None = None,
) -> tuple[BrowserContext, Page]:
    """Opens the home in a fresh context, waits for the loader to go, installs the scene hook."""
    opts: dict[str, Any] = dict(VIEWPORTS[vp])
    if reduced_motion:
        opts["reduced_motion"] = "reduce"
    if video_dir:
        opts["record_video_dir"] = str(video_dir)
        opts["record_video_size"] = opts["viewport"]
    ctx = browser.new_context(**opts)
    quiet(ctx)
    page = ctx.new_page()
    if logs is not None:
        page.on("console", lambda m: logs.append({"type": m.type, "text": m.text})
                if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: logs.append({"type": "pageerror", "text": str(e)}))
        page.on("requestfailed", lambda r: logs.append({"type": "requestfailed", "text": r.url}))
        page.on("response", lambda r: logs.append({"type": "http", "text": f"{r.status} {r.url}"})
                if r.status >= 400 else None)
    if fake_clock:
        # Paused before the navigation: time only moves through run_for, 16 ms per frame, so the
        # same script reaches the same scene state on every run.
        page.clock.install(time=FAKE_EPOCH)
        page.clock.pause_at(FAKE_PAUSE)
    page.goto(SITE + query)
    wait(page, 600, fake_clock)
    for _ in range(40):
        if page.evaluate("() => !document.querySelector('.loader:not(.is-done)')"):
            break
        wait(page, 250, fake_clock)
    if not page.evaluate(HOOK_JS):
        raise RuntimeError("three module not found (dev server expected)")
    wait(page, 100, fake_clock)
    renderer = gl_renderer(page)
    if "NVIDIA" not in renderer:
        raise RuntimeError(f"not on the NVIDIA GPU: {renderer}")
    return ctx, page


def quiet(ctx: BrowserContext) -> None:
    """Keeps QA runs out of the site's analytics: its script is answered locally with nothing."""
    ctx.route("**/cloud.umami.is/**", lambda route: route.fulfill(status=204, body=""))


def wait(page: Page, ms: int, fake_clock: bool) -> None:
    """Advances the fake clock (16 ms frames, deterministic) or waits in real time."""
    if fake_clock:
        page.clock.run_for(ms)
    else:
        page.wait_for_timeout(ms)


def clip_around(box: dict[str, float], vp: dict[str, int], pad: float = 0.6, min_size: int = 120) -> dict[str, float]:
    """A screenshot clip around a screen box, padded and kept inside the viewport."""
    w = max(min_size, box["w"] * (1 + 2 * pad))
    h = max(min_size, box["h"] * (1 + 2 * pad))
    cx, cy = box["x"] + box["w"] / 2, box["y"] + box["h"] / 2
    x = min(max(0, cx - w / 2), vp["width"] - w)
    y = min(max(0, cy - h / 2), vp["height"] - h)
    return {"x": max(0, x), "y": max(0, y), "width": min(w, vp["width"]), "height": min(h, vp["height"])}
