"""The Konteur's random-tale entry point along the climb: at each stop, whether it is offered, and
at three of them whether a click (or a tap) and the keyboard really open a tale.

With BASE=<teller.json of another run> it also compares: a stop where that run offered the entry
point and this one does not is a fault. Usage:
OUT=<dir> [SITE=...] [VPS=...] [BASE=<json>] uv run --with playwright python teller_check.py
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright

import hvp
from climb_check import REACH, STOPS, go

OFFERED = """() => { const b = document.querySelector('.tree-teller'); if (!b || b.hidden) return null;
  const r = b.getBoundingClientRect(), s = document.querySelector('.tree-shelf').getBoundingClientRect();
  const x = r.x + r.width / 2, y = r.y + r.height * 0.45;
  return { x, y, underShelf: y >= s.top && x >= s.left && x <= s.right,
           onScreen: x > 0 && x < innerWidth && y > 0 && y < innerHeight,
           disabled: b.getAttribute('aria-disabled') === 'true' }; }"""
BOOK = "() => document.querySelector('.app').dataset.book ?? null"


def opens(browser: Browser, vp: str, stop: float, how: str) -> dict[str, Any]:
    """On a fresh page at `stop`, activates the entry point by `how` and says what opened."""
    ctx, page = hvp.open_home(browser, vp)
    page.clock.run_for(2000)
    page.mouse.move(page.viewport_size["width"] / 2, page.viewport_size["height"] * 0.35)
    reached = go(page, stop)
    at = page.evaluate(OFFERED)
    if not at:
        ctx.close()
        return {"stop": stop, "how": how, "t": round(reached, 4), "book": None, "note": "not offered"}
    if how == "keyboard":
        page.focus(".tree-teller")
        page.keyboard.press("Enter")
    elif hvp.VIEWPORTS[vp].get("has_touch"):
        page.touchscreen.tap(at["x"], at["y"])
    else:
        page.mouse.click(at["x"], at["y"])
    # The dive runs on the fake clock, the tale's own files load in real time: give both their turn.
    book = None
    for _ in range(30):
        page.clock.run_for(400)
        page.wait_for_timeout(100)
        book = page.evaluate(BOOK)
        if book:
            break
    ctx.close()
    return {"stop": stop, "how": how, "t": round(reached, 4), "book": book,
            "note": "pointer point under the shelf" if how != "keyboard" and at["underShelf"] else ""}


def main() -> None:
    """Runs every viewport, writes teller.json, exits 1 on a lost or dead entry point."""
    hvp.OUT.mkdir(parents=True, exist_ok=True)
    base = json.load(open(os.environ["BASE"])) if os.environ.get("BASE") else {}
    record: dict[str, Any] = {}
    bad = 0
    with sync_playwright() as pw:
        browser = hvp.launch(pw)
        for vp in os.environ.get("VPS", "desktop,phone-landscape,mobile").split(","):
            ctx, page = hvp.open_home(browser, vp)
            page.clock.run_for(2000)
            page.mouse.move(page.viewport_size["width"] / 2, page.viewport_size["height"] * 0.35)
            rows = []
            for leg, stops in (("up", STOPS), ("back", STOPS[::-1][1:])):
                for target in stops:
                    reached = go(page, target)
                    at = page.evaluate(OFFERED)
                    rows.append({"leg": leg, "target": target, "t": round(reached, 4), "reached": abs(reached - target) <= REACH,
                                 "offered": bool(at), "pointerClear": bool(at and at["onScreen"] and not at["underShelf"])})
            ctx.close()
            offered = [r["target"] for r in rows if r["leg"] == "up" and r["offered"]]
            tried = []
            if os.environ.get("ACTIVATE", "1") == "1" and offered:
                for stop in sorted({offered[0], offered[len(offered) // 2], offered[-1]}):
                    tried += [opens(browser, vp, stop, "pointer"), opens(browser, vp, stop, "keyboard")]
            was = {(r["leg"], r["target"]): r for r in base.get(vp, {}).get("rows", [])}
            lost = [f'{r["leg"]} t={r["target"]:.2f}' for r in rows
                    if was.get((r["leg"], r["target"]), {}).get("offered") and not r["offered"]]
            lost_pointer = [f'{r["leg"]} t={r["target"]:.2f}' for r in rows
                            if was.get((r["leg"], r["target"]), {}).get("pointerClear") and not r["pointerClear"]]
            missed = [f'{r["leg"]} {r["target"]:.2f}' for r in rows if not r["reached"]]
            dead = [f'{a["how"]} at t={a["stop"]:.2f}' for a in tried
                    if not a["book"] and not (a["how"] == "pointer" and a["note"])]
            record[vp] = {"viewport": hvp.VIEWPORTS[vp]["viewport"], "rows": rows, "activations": tried,
                          "lostAgainstBase": lost, "pointerLostAgainstBase": lost_pointer, "dead": dead, "missed": missed}
            bad += len(lost) + len(lost_pointer) + len(dead) + len(missed)
            n = sum(1 for r in rows if r["offered"])
            p = sum(1 for r in rows if r["pointerClear"])
            print(f"{vp:18} offered at {n}/{len(rows)} stops, pointer point clear at {p}; activations "
                  f"{sum(1 for a in tried if a['book'])}/{len(tried)}; lost against base: {lost or 0}; "
                  f"pointer lost: {lost_pointer or 0}; dead: {dead or 0}; missed stops: {missed or 0}")
        browser.close()
    (hvp.OUT / "teller.json").write_text(json.dumps(record, indent=1))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
