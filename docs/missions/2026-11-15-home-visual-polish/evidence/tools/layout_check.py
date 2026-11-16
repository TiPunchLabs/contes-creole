"""Reads a captures.json sweep and says, per size, whether the Konteur and the critters are whole
on screen, clear of the shelf and of the intro text at the opening. With a climb.json (written by
climb_check.py) it also reads every climb state, up and back, and fails when: a stop was not
reached (the value read on the climb bar is not the one asked for), the stops do not cover the
climb from foot to top both ways, or the Konteur is cut by the shelf, the intro text or the top or
bottom of the screen. The critters wander: the states where the shelf or the text cuts one are
listed and counted, not failed (no camera clears every point of the lawn, see AUDIT.md 14).

Usage: python3 layout_check.py <captures.json> [climb.json]
"""

from __future__ import annotations

import json
import sys

REACH = 0.01
CUT = ("under shelf", "under intro", "cut by edge")


def overlaps(a: dict[str, float], b: dict[str, float]) -> bool:
    """Whether two screen boxes (x, y, w, h) intersect."""
    return a["x"] < b["x"] + b["w"] and b["x"] < a["x"] + a["w"] and a["y"] < b["y"] + b["h"] and b["y"] < a["y"] + a["h"]


def main() -> None:
    """Prints one line per size and exits 1 if any figure is cut, hidden or under the text."""
    sweep = json.load(open(sys.argv[1]))["sweep"]
    bad = 0
    for name, row in sweep.items():
        view = row["viewport"]
        figures = dict(row["critters"])
        if row["dom"]["teller"]:
            figures["konteur"] = row["dom"]["teller"]
        faults = []
        if not row["dom"]["teller"]:
            faults.append("konteur not shown")
        for who, box in figures.items():
            # At the opening every figure must be there: one that has stepped out is a fault.
            if box.get("shown") is False:
                faults.append(f"{who} not shown")
            if box["x"] < 0 or box["x"] + box["w"] > view["width"] or box["y"] + box["h"] > view["height"]:
                faults.append(f"{who} cut by the edge")
            if overlaps(box, row["dom"]["shelf"]):
                faults.append(f"{who} under the shelf")
            if overlaps(box, row["dom"]["intro"]):
                faults.append(f"{who} under the intro")
        if row["dom"]["overflow"]:
            faults.append("horizontal overflow")
        bad += len(faults)
        print(f"{name:18} {view['width']}x{view['height']:<5} {'ok' if not faults else '; '.join(faults)}")
    if len(sys.argv) > 2:
        for name, run in json.load(open(sys.argv[2])).items():
            rows = run["rows"]
            places = [place for row in rows for place in row["places"].values()]
            faults = [f'{row["leg"]} asked t={row["target"]:.2f}, read {row["t"]:.3f}' for row in rows
                      if abs(row["t"] - row["target"]) > REACH]
            # The whole climb must be covered, up and back: its foot, its top, and no gap between.
            for leg in ("up", "back"):
                read = sorted(row["t"] for row in rows if row["leg"] == leg or (leg == "back" and row["target"] == 1.0))
                if not read or read[0] > REACH or read[-1] < 1 - REACH:
                    faults.append(f"{leg}: climb covered from {read[0] if read else None} to {read[-1] if read else None}")
                elif max(b - a for a, b in zip(read, read[1:])) > 0.08:
                    faults.append(f"{leg}: a gap wider than 0.08 between two stops")
            faults += [f'{row["leg"]} t={row["target"]:.2f} konteur: {row["places"]["konteur"]}' for row in rows
                       if row["places"].get("konteur") in CUT]
            left = [f'{row["leg"]} t={row["target"]:.2f} {who}: {place}' for row in rows
                    for who, place in row["places"].items() if who != "konteur" and place in CUT]
            bad += len(faults)
            view = run["viewport"]
            counts = ", ".join(f"{places.count(k)} {k}" for k in ("whole", "grazed", "leaving by the side", "absent"))
            print(f"climb {name:18} {view['width']}x{view['height']:<5} {run['states']} states: {counts}; "
                  f"critter states cut (reported, not failed): {len(left)}; {'ok' if not faults else '; '.join(faults)}")
            for line in left:
                print("      ", line)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
