"""Other pages and shared components after a change of the tree: the classes page, both tales
(first pages, language switch, page turn, way back), with console and network errors.

Usage: OUT=<dir> uv run --with playwright python pages.py
"""

from __future__ import annotations

import json
from typing import Any

from playwright.sync_api import sync_playwright

import hvp
from behaviours import errors

RESULTS: list[dict[str, Any]] = []


def check(name: str, ok: bool, detail: Any = "") -> None:
    """Records and prints one check."""
    RESULTS.append({"name": name, "ok": bool(ok), "detail": detail})
    print("PASS" if ok else "FAIL", name, "" if ok else detail)


def main() -> None:
    """Runs the checks on desktop and on the emulated phone."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for vp in ("desktop", "mobile"):
            logs: list[dict[str, Any]] = []
            ctx = browser.new_context(**hvp.VIEWPORTS[vp])
            hvp.quiet(ctx)
            page = ctx.new_page()
            page.on("console", lambda m: logs.append({"type": m.type, "text": m.text}) if m.type == "error" else None)
            page.on("pageerror", lambda e: logs.append({"type": "pageerror", "text": str(e)}))
            page.goto(hvp.SITE + "contes-des-classes/")
            page.wait_for_timeout(1200)
            check(f"{vp}.classes-page-renders", page.locator("h1").count() == 1 and len(page.locator("h1").inner_text()) > 3)
            page.screenshot(path=str(hvp.OUT / f"page-classes-{vp}.png"))
            back = page.locator("a[href*='#invitation']").first
            check(f"{vp}.classes-page-has-way-back", back.count() == 1)
            back.click()
            page.wait_for_selector(".tree-shelf", timeout=15000)
            page.wait_for_timeout(2500)
            check(f"{vp}.back-opens-tree-on-invitation", "is-near" in (page.locator(".tree-shelf-book").nth(2).get_attribute("class") or ""))
            check(f"{vp}.classes-console-clean", not errors(logs), logs)
            ctx.close()

            for book, index, nxt, back_sel in (("ti-kannot", 0, ".reading-next", ".reading-back"), ("mila", 1, ".mila-next, [class*=next]", ".mila-back")):
                logs = []
                ctx, page = hvp.open_home(browser, vp, fake_clock=False, logs=logs)
                page.wait_for_timeout(800)
                button = page.locator(".tree-shelf-book").nth(index)
                button.click()
                page.wait_for_timeout(2500)
                button.click()
                page.wait_for_function("() => document.querySelector('.app').dataset.book", timeout=15000)
                page.wait_for_timeout(5000)
                page.screenshot(path=str(hvp.OUT / f"page-{book}-p1-{vp}.png"))
                text = page.evaluate("() => document.body.innerText.length")
                check(f"{vp}.{book}-first-page-has-text", text > 80, text)
                langs = page.locator(".reading-langs button")
                if langs.count() >= 2:
                    langs.nth(langs.count() - 1).click()
                    page.wait_for_timeout(800)
                    check(f"{vp}.{book}-language-switch", langs.nth(langs.count() - 1).get_attribute("aria-pressed") == "true")
                page.keyboard.press("ArrowRight")
                page.wait_for_timeout(4500)
                page.screenshot(path=str(hvp.OUT / f"page-{book}-p2-{vp}.png"))
                page.locator(back_sel).first.click()
                page.wait_for_function("() => !document.querySelector('.app').dataset.book", timeout=15000)
                page.wait_for_timeout(1500)
                check(f"{vp}.{book}-back-to-tree", page.locator(".tree-shelf").count() == 1)
                check(f"{vp}.{book}-console-clean", not errors(logs), logs)
                ctx.close()
        browser.close()
    (hvp.OUT / "pages.json").write_text(json.dumps(RESULTS, indent=1, ensure_ascii=False))
    failed = [r["name"] for r in RESULTS if not r["ok"]]
    print(f"{len(RESULTS) - len(failed)} ok, {len(failed)} failed", failed)


if __name__ == "__main__":
    main()
