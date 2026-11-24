"""Draws the garden's ground plan with the reading lens of each page (landscape framing).

Usage: python3 art/mila-calebassier/scripts/draw_plan.py [out.png]
Reads world/layout.json and staging.ts of the book; north is up, one metre is 26 pixels.
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BOOK = ROOT / "src/books/mila-calebassier"
LAYOUT = json.loads((BOOK / "world/layout.json").read_text())
SCALE, X0, Z0, W, H = 26, -17.0, -13.5, 37.0, 22.5
FONT_PATH = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT = ImageFont.truetype(str(FONT_PATH), 13) if FONT_PATH.exists() else ImageFont.load_default()


def px(x: float, z: float) -> tuple[float, float]:
    """World x, z to image pixels."""
    return ((x - X0) * SCALE, (z - Z0) * SCALE)


def house(draw: ImageDraw.ImageDraw, spec: dict, name: str, colour: str) -> None:
    """A house footprint with its covered terrace, turned by its yaw."""
    a = math.radians(spec["yaw"])
    w, _, d = spec["size"]
    td = spec["terraceDepth"]
    ox, _, oz = spec["at"]

    def corner(x: float, z: float) -> tuple[float, float]:
        return px(ox + x * math.cos(a) + z * math.sin(a), oz - x * math.sin(a) + z * math.cos(a))

    draw.polygon([corner(-w / 2, -d / 2), corner(w / 2, -d / 2), corner(w / 2, d / 2), corner(-w / 2, d / 2)], fill=colour, outline="#6a5546")
    draw.polygon([corner(-w / 2, d / 2), corner(w / 2, d / 2), corner(w / 2, d / 2 + td), corner(-w / 2, d / 2 + td)], fill="#efe6d6", outline="#6a5546")
    cx, cy = corner(0, 0)
    draw.text((cx - 40, cy - 6), name, fill="#2b2440", font=FONT)


def main() -> None:
    """Draws the plan and saves it."""
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs/missions/2026-11-23-mila-calebassier/plan-jardin.png"
    img = Image.new("RGB", (int(W * SCALE), int(H * SCALE)), "#e7ecd2")
    draw = ImageDraw.Draw(img)
    gate = LAYOUT["gate"]["at"]
    draw.rectangle([px(gate[0], Z0), px(gate[0] + 4.4, Z0 + H)], fill="#eadcc4")
    draw.line([px(*p) for p in LAYOUT["path"]], fill="#c9a77c", width=14, joint="curve")
    for name in ("fenceEast", "fenceNorth"):
        f = LAYOUT[name]
        draw.line([px(f["from"][0], f["from"][2]), px(f["to"][0], f["to"][2])], fill="#5f8a4f", width=6)
    house(draw, LAYOUT["milaHouse"], "Maison de Mila", "#f3dfb0")
    house(draw, LAYOUT["ninonHouse"], "Maison de Man Ninon", "#f0cdbd")
    tree = LAYOUT["tree"]
    tx, tz = px(tree["at"][0], tree["at"][2])
    r = tree["crownRadius"] * SCALE
    draw.ellipse([tx - r, tz - r, tx + r, tz + r], outline="#4b7063", width=3)
    draw.ellipse([tx - 11, tz - 11, tx + 11, tz + 11], fill="#8a6a50")
    draw.text((tx - 34, tz - r - 16), "Calebassier", fill="#2b2440", font=FONT)
    for key, label in (("branchA", "A"), ("branchB", "B")):
        b = tree[key]
        draw.line([px(b["root"][0], b["root"][2]), px(b["tip"][0], b["tip"][2])], fill="#8a6a50", width=5)
        gx, gz = px(b["give"][0], b["give"][2])
        draw.ellipse([gx - 6, gz - 6, gx + 6, gz + 6], fill="#d9b46a", outline="#6a5546")
        draw.text((gx + 8, gz - 16), f"branche {label}", fill="#2b2440", font=FONT)
    gx, gz = px(gate[0], gate[2])
    draw.rectangle([gx - 5, gz - 22, gx + 5, gz + 22], fill="#3f6b5c")
    draw.text((gx + 10, gz + 22), "Portail", fill="#2b2440", font=FONT)
    rx, rz = px(LAYOUT["roots"][0], LAYOUT["roots"][2])
    draw.text((rx - 20, rz + 10), "racine (p. 9)", fill="#6a5546", font=FONT)
    perch = LAYOUT["perch"]
    qx, qz = px(perch[0], perch[2])
    draw.ellipse([qx - 5, qz - 5, qx + 5, qz + 5], fill="#c8483e")
    draw.text((qx + 8, qz - 6), "coq", fill="#2b2440", font=FONT)
    # Reading lens of each page (landscape): a dot and its axis; bedroom pages are in the house.
    staging = (BOOK / "staging.ts").read_text()
    a = math.radians(LAYOUT["milaHouse"]["yaw"])
    ox, _, oz = LAYOUT["milaHouse"]["at"]
    for match in re.finditer(r"(p\d\d): \{.*?space: \"(\w+)\".*?wide: \{.*?to: \{ pos: \[([^\]]+)\], look: \[([^\]]+)\]", staging, re.S):
        page, space = match.group(1), match.group(2)
        pos = [float(v) for v in match.group(3).split(",")]
        look = [float(v) for v in match.group(4).split(",")]
        if space == "house":
            pos = [ox + pos[0] * math.cos(a) + pos[2] * math.sin(a), pos[1], oz - pos[0] * math.sin(a) + pos[2] * math.cos(a)]
            look = [ox + look[0] * math.cos(a) + look[2] * math.sin(a), look[1], oz - look[0] * math.sin(a) + look[2] * math.cos(a)]
        cx, cz = px(pos[0], pos[2])
        lx, lz = px(look[0], look[2])
        draw.line([cx, cz, lx, lz], fill="#3a4a72", width=1)
        draw.ellipse([cx - 5, cz - 5, cx + 5, cz + 5], fill="#3a4a72")
        draw.text((cx + 6, cz + 3), page[1:].lstrip("0"), fill="#3a4a72", font=FONT)
    draw.text((12, 10), "Plan au sol — nord en haut, 1 m = 26 px. Points bleus : caméra de lecture de chaque page (cadrage paysage).", fill="#2b2440", font=FONT)
    draw.line([px(X0 + 1, Z0 + H - 1), px(X0 + 6, Z0 + H - 1)], fill="#2b2440", width=3)
    draw.text(px(X0 + 1, Z0 + H - 1.9), "5 m", fill="#2b2440", font=FONT)
    img.save(out, optimize=True)
    print(out)


if __name__ == "__main__":
    main()
