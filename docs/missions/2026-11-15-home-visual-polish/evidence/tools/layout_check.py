"""Reads a captures.json sweep and says, per size, whether the Konteur and the critters are whole
on screen, clear of the shelf and of the intro text. Usage: python3 layout_check.py <captures.json>
"""

from __future__ import annotations

import json
import sys


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
        for who, box in figures.items():
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
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
