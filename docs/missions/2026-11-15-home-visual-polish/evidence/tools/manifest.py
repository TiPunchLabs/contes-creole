"""Writes the media manifest (path, bytes, sha256, capture conditions) of the mission's QA folder.

Usage: python3 manifest.py <media-root> <manifest.tsv>
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

RULES: list[tuple[str, str]] = [
    ("view-desktop2x", "1440x900 DPR 2 (renderer pixel ratio 1.5), fake clock"),
    ("view-desktop-reduced", "1440x900 DPR 1, prefers-reduced-motion: reduce, fake clock 2 s"),
    ("view-mobile-reduced", "390x844 DPR 3 emulated (touch, lite), reduced motion, fake clock 2 s"),
    ("view-desktop", "1440x900 DPR 1, t = 0, fake clock at the second in the name"),
    ("view-mobile", "390x844 DPR 3 emulated (touch, lite mode, renderer pixel ratio 1), t = 0, fake clock"),
    ("view-tablet", "768x1024 DPR 2 emulated (touch, lite), t = 0, fake clock 2 s"),
    ("view-laptop", "1024x768 DPR 1, t = 0, fake clock 2 s"),
    ("view-small", "360x640 DPR 3 emulated (touch, lite), t = 0, fake clock 2 s"),
    ("view-tall", "430x932 DPR 3 emulated (touch, lite), t = 0, fake clock 2 s"),
    ("climb-", "climb value t in the name, reached by wheel from a fresh load at fake 2 s, +3 s settle; viewport in the name"),
    ("closeup-", "crop around the projected box at displayed size; x1 = DPR 1 pixels, magnified2 = those pixels x2 (point filter), x2 = DPR 2 device, x3-emulated = 390x844 DPR 3; fake clock second in the name"),
    ("turntable-", "inspection render of the frozen scene (fake clock 2 s idle / 9 s walk), own camera fov 30 around the critter, DPR 2, UI hidden; silhouette = black override material on white"),
    ("video-tree-climb", "frame-stepped: every other 16 ms frame at 30 fps (1 s of video = 1.04 s of scene); 6 s rest, climb up 12 s, 3 s top, down 9 s; viewport in the name"),
    ("video-characters-rest", "frame-stepped as above, 45 s at t = 0; desktop: pointer on Lapen at 15 s and on Zanba at 28 s"),
    ("video-follow", "frame-stepped, 40 s, own camera fov 30 riding beside the critter at a fixed world bearing, 800x800 crop, UI hidden; pointer on the critter at 18 s"),
    ("board-", "comparison sheet assembled with ImageMagick from the captures of the same folder tree"),
    ("frames-", "frame deltas (ms) of one FPS sequence, see perf.json"),
    ("captures.json", "record of captures.py: renderer.info, projected boxes, layout, console"),
    ("perf.json", "record of perf.py: load, weight, fps, run conditions"),
    ("behaviours.json", "record of behaviours.py"),
]
COMMON = "Chrome headless (system channel), ANGLE GL-EGL on NVIDIA RTX 4060 Laptop, dev server unless stated"


def conditions(name: str) -> str:
    """Capture conditions of a file from its name."""
    for prefix, text in RULES:
        if name.startswith(prefix):
            return text
    return ""


def main() -> None:
    """Hashes every file under the media root and writes one TSV line per file."""
    root = Path(sys.argv[1]).expanduser()
    lines = [f"# root: {root}", f"# common: {COMMON}", "path\tbytes\tsha256\tconditions"]
    for f in sorted(p for p in root.rglob("*") if p.is_file()):
        digest = hashlib.sha256(f.read_bytes()).hexdigest()
        lines.append(f"{f.relative_to(root)}\t{f.stat().st_size}\t{digest}\t{conditions(f.name)}")
    Path(sys.argv[2]).write_text("\n".join(lines) + "\n")
    print(len(lines) - 3, "files")


if __name__ == "__main__":
    main()
