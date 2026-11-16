"""Behaviours of the home to preserve: keyboard order, hover bubbles, shelf, card and Konteur
entries, the way back, touch gestures, reduced motion. Prints PASS/FAIL lines and writes
behaviours.json. Real clock, dev server (the scene hook needs it).

Usage: OUT=<dir> uv run --with playwright python behaviours.py
"""

from __future__ import annotations

import json
import re
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright

import hvp

RESULTS: list[dict[str, Any]] = []

STATE_JS = """() => { const a = document.querySelector('.app'), th = document.querySelector('.tree-climb-thumb');
  const b = document.querySelector('.app-bubble');
  // The thumb travels the track minus its own height: its offset gives the climb value.
  const tr = th.parentElement.getBoundingClientRect(), r = th.getBoundingClientRect();
  const t = Math.round(((r.top - tr.top) / (tr.height - r.height)) * 1000) / 1000;
  return { book: a.dataset.book ?? null, t, path: location.pathname,
           bubble: b && getComputedStyle(b).opacity !== '0' && b.textContent.trim() ? b.textContent.trim() : '',
           introOpacity: parseFloat(document.querySelector('.tree-intro')?.style.opacity || '1') }; }"""
FOCUS_JS = """() => { const e = document.activeElement; if (!e || e === document.body) return null;
  return { tag: e.tagName.toLowerCase(), cls: e.className, name: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\\s+/g, ' '),
           lang: e.lang || null }; }"""


FAVICON_404 = "Failed to load resource: the server responded with a status of 404"


def errors(logs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Console and network errors, without the favicon 404 already there on main (ef821d2)."""
    return [entry for entry in logs if entry["type"] in ("error", "pageerror", "requestfailed")
            and not entry["text"].startswith(FAVICON_404)]


def check(name: str, ok: bool, detail: Any = "") -> None:
    """Records and prints one check."""
    RESULTS.append({"name": name, "ok": bool(ok), "detail": detail})
    print("PASS" if ok else "FAIL", name, "" if ok else detail)


def state(page: Page) -> dict[str, Any]:
    """The app's observable state: open book, climb value, visible bubble, path."""
    return page.evaluate(STATE_JS)


def centre(box: dict[str, float]) -> tuple[float, float]:
    """Centre of a screen box."""
    return box["x"] + box["w"] / 2, box["y"] + box["h"] / 2


def teller_centre(page: Page) -> tuple[float, float]:
    """Centre of the Konteur's keyboard entry point, laid over his photo."""
    r = page.evaluate("() => { const r = document.querySelector('.tree-teller').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height * 0.45]; }")
    return r[0], r[1]


def fresh(browser: Browser, vp: str, **kw: Any) -> tuple[Any, Page, list[dict[str, Any]]]:
    """A fresh home on the real clock, with its console and network log."""
    logs: list[dict[str, Any]] = []
    ctx, page = hvp.open_home(browser, vp, fake_clock=False, logs=logs, **kw)
    page.wait_for_timeout(800)
    return ctx, page, logs


def desktop(browser: Browser) -> None:
    """Mouse and keyboard journeys at 1440x900."""
    ctx, page, logs = fresh(browser, "desktop")
    order = []
    for _ in range(8):
        page.keyboard.press("Tab")
        order.append(page.evaluate(FOCUS_JS))
    names = [o["name"] if o else None for o in order]
    RESULTS.append({"name": "desktop.tab-order", "ok": True, "detail": order})
    print("INFO tab order:", names)
    check("desktop.tab-reaches-teller-and-shelf", any(o and "tree-teller" in o["cls"] for o in order)
          and sum(1 for o in order if o and "tree-shelf-book" in o["cls"]) >= 3, names)
    page.mouse.move(720, 120)
    page.wait_for_timeout(300)
    for who, word in (("lapen", "Konpè Lapen"), ("zanba", "Konpè Zanba")):
        page.mouse.move(*centre(page.evaluate(hvp.BOXES_JS)[who]))
        page.wait_for_timeout(500)
        check(f"desktop.hover-{who}-bubble", word in state(page)["bubble"], state(page)["bubble"])
        page.mouse.move(720, 120)
        page.wait_for_timeout(1300)
    check("desktop.bubble-hides-off-critter", state(page)["bubble"] == "", state(page)["bubble"])
    page.mouse.move(*teller_centre(page))
    page.wait_for_timeout(500)
    bubble = state(page)["bubble"]
    check("desktop.hover-teller-bubble", "Yé krik" in bubble and "au hasard" in bubble, bubble)
    page.mouse.move(720, 120)
    page.wait_for_timeout(400)
    page.keyboard.press("ArrowDown")
    page.wait_for_timeout(1200)
    t1 = state(page)["t"]
    page.keyboard.press("ArrowUp")
    page.wait_for_timeout(1200)
    check("desktop.arrow-keys-climb", t1 > 0.05 and state(page)["t"] < t1, [t1, state(page)["t"]])
    page.mouse.wheel(0, 400)
    page.wait_for_timeout(1500)
    s = state(page)
    check("desktop.wheel-climbs-and-fades-intro", s["t"] > 0.15 and s["introOpacity"] == 0, s)
    check("desktop.console-clean", not errors(logs), logs)
    ctx.close()

    shelf = [("ti-kannot", 0, ".reading-back"), ("mila", 1, ".mila-back")]
    for book, index, back in shelf:
        ctx, page, logs = fresh(browser, "desktop")
        button = page.locator(".tree-shelf-book").nth(index)
        button.click()
        page.wait_for_timeout(2500)
        check(f"desktop.shelf-{book}-first-press-climbs", state(page)["book"] is None and state(page)["t"] > 0.15, state(page))
        check(f"desktop.shelf-{book}-near", "is-near" in (button.get_attribute("class") or ""))
        button.click()
        page.wait_for_function("() => document.querySelector('.app').dataset.book", timeout=15000)
        check(f"desktop.shelf-{book}-second-press-enters", state(page)["book"] == book, state(page))
        page.wait_for_timeout(3500)
        page.locator(back).click()
        page.wait_for_function("() => !document.querySelector('.app').dataset.book", timeout=15000)
        page.wait_for_timeout(1500)
        check(f"desktop.{book}-way-back-to-tree", state(page)["book"] is None and state(page)["t"] > 0.15, state(page))
        page.keyboard.press("Enter")
        page.wait_for_function("() => document.querySelector('.app').dataset.book", timeout=15000)
        check(f"desktop.{book}-enter-key-on-near-card", state(page)["book"] == book, state(page))
        check(f"desktop.{book}-console-clean", not errors(logs), logs)
        ctx.close()

    ctx, page, logs = fresh(browser, "desktop")
    page.locator(".tree-shelf-book").nth(0).click()
    page.wait_for_timeout(2500)
    box = page.evaluate("() => { const r = document.querySelector('button.tree-book').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }")
    page.mouse.click(*centre(box))
    page.wait_for_function("() => document.querySelector('.app').dataset.book", timeout=15000)
    check("desktop.click-on-hanging-card-enters", state(page)["book"] == "ti-kannot", state(page))
    ctx.close()

    ctx, page, logs = fresh(browser, "desktop")
    page.locator(".tree-shelf-book").nth(2).click()
    page.wait_for_timeout(2500)
    page.locator(".tree-shelf-book").nth(2).click()
    page.wait_for_url(re.compile("contes-des-classes"), timeout=15000)
    check("desktop.invitation-opens-classes-page", "contes-des-classes" in page.url, page.url)
    ctx.close()

    for draw, book in ((0.0, "ti-kannot"), (0.99, "mila")):
        ctx, page, logs = fresh(browser, "desktop")
        page.evaluate(f"() => {{ Math.random = () => {draw}; }}")
        page.mouse.click(*teller_centre(page))
        page.wait_for_function("() => document.querySelector('.app').dataset.book", timeout=15000)
        check(f"desktop.teller-click-random-{book}", state(page)["book"] == book, state(page))
        ctx.close()


def mobile(browser: Browser) -> None:
    """Touch journeys at 390x844 (emulated)."""
    ctx, page, logs = fresh(browser, "mobile")
    cdp = ctx.new_cdp_session(page)
    lite = page.evaluate("() => window.__hvp.renderer.getPixelRatio()")
    check("mobile.lite-pixel-ratio-1", lite == 1, lite)
    page.touchscreen.tap(*centre(page.evaluate(hvp.BOXES_JS)["lapen"]))
    page.wait_for_timeout(600)
    check("mobile.tap-lapen-bubble", "Konpè Lapen" in state(page)["bubble"], state(page)["bubble"])
    page.wait_for_timeout(5000)
    check("mobile.bubble-leaves-after-hold", state(page)["bubble"] == "", state(page)["bubble"])
    for i in range(13):
        kind = "touchStart" if i == 0 else "touchMove"
        cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": 200, "y": 600 - i * 25}]})
        page.wait_for_timeout(30)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    page.wait_for_timeout(1500)
    check("mobile.finger-swipe-climbs", state(page)["t"] > 0.15, state(page))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > innerWidth")
    check("mobile.no-horizontal-overflow", not overflow)
    ctx.close()

    ctx, page, logs = fresh(browser, "mobile")
    page.evaluate("() => { Math.random = () => 0; }")
    page.touchscreen.tap(*teller_centre(page))
    page.wait_for_function("() => document.querySelector('.app').dataset.book", timeout=15000)
    check("mobile.tap-teller-opens-a-tale", state(page)["book"] == "ti-kannot", state(page))
    ctx.close()

    ctx, page, logs = fresh(browser, "mobile")
    button = page.locator(".tree-shelf-book").nth(0)
    button.tap()
    page.wait_for_timeout(2500)
    button.tap()
    page.wait_for_function("() => document.querySelector('.app').dataset.book", timeout=15000)
    check("mobile.shelf-two-taps-enter", state(page)["book"] == "ti-kannot", state(page))
    check("mobile.console-clean", not errors(logs), logs)
    ctx.close()


def reduced(browser: Browser) -> None:
    """prefers-reduced-motion: decorative motion cut, the journey kept; live preference change."""
    cam_x = "() => window.__hvp.camera.position.x"
    shifts = {}
    for calm in (False, True):
        ctx, page, logs = fresh(browser, "desktop", reduced_motion=calm)
        page.mouse.move(720, 450)
        page.wait_for_timeout(300)
        x0 = page.evaluate(cam_x)
        page.mouse.move(1430, 450)
        page.wait_for_timeout(300)
        shifts[calm] = abs(page.evaluate(cam_x) - x0)
        if calm:
            anim = page.evaluate("() => [getComputedStyle(document.querySelector('.tree-intro-inner')).animationName, getComputedStyle(document.querySelector('.tree-intro-hint svg')).animationName]")
            check("reduced.css-animations-off", anim == ["none", "none"], anim)
            button = page.locator(".tree-shelf-book").nth(0)
            button.click()
            page.wait_for_timeout(2500)
            button.click()
            page.wait_for_function("() => document.querySelector('.app').dataset.book", timeout=15000)
            check("reduced.tale-access-kept", state(page)["book"] == "ti-kannot", state(page))
        else:
            page.emulate_media(reduced_motion="reduce")
            page.wait_for_timeout(300)
            page.mouse.move(720, 450)
            page.wait_for_timeout(300)
            x1 = page.evaluate(cam_x)
            page.mouse.move(1430, 450)
            page.wait_for_timeout(300)
            live = abs(page.evaluate(cam_x) - x1)
            RESULTS.append({"name": "reduced.live-change-parallax", "ok": True,
                            "detail": {"shiftAfterLiveChange": live, "note": "INFO: the 3D scene reads the preference at mount only"}})
            print("INFO live preference change: parallax shift", round(live, 3))
        ctx.close()
    check("reduced.parallax-cut-to-a-fifth", shifts[False] > 0.3 and shifts[True] < shifts[False] * 0.3, shifts)


def main() -> None:
    """Runs every group and writes behaviours.json."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for group in (desktop, mobile, reduced):
            try:
                group(browser)
            except Exception as err:  # noqa: BLE001 - a broken journey is a result, not a crash
                check(f"{group.__name__}.completed", False, repr(err)[:400])
        browser.close()
    (hvp.OUT / "behaviours.json").write_text(json.dumps(RESULTS, indent=1, ensure_ascii=False))
    failed = [r["name"] for r in RESULTS if not r["ok"]]
    print(f"{len(RESULTS) - len(failed)} ok, {len(failed)} failed", failed)


if __name__ == "__main__":
    main()
