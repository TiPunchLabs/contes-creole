"""Paints every 2D layer and material texture of « Mila et le calebassier magique ».

Usage: python3 art/mila-calebassier/scripts/paint_layers.py [--only name,name] [--no-runtime]

Masters (PNG) go to art/mila-calebassier/textures/master/, runtime exports (WebP) to
src/books/mila-calebassier/assets/tex/. Local colours are painted for daylight: the engine tints
them with each page's light key (dusk, night, darkness, dawn), so one set serves the twelve pages.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import wc  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
MASTER = ROOT / "art/mila-calebassier/textures/master"
RUNTIME = ROOT / "src/books/mila-calebassier/assets/tex"

# Palette of the brief (spec 02) plus the pigments the washes are mixed from.
SAGE, JADE, LAVENDER = "#87966D", "#4B7063", "#9A91B2"
CORAL, APRICOT = "#CA7776", "#E8BC95"
SAP, OLIVE, DEEP = "#a9bd62", "#6f8f4a", "#2f5a4c"
INDIGO, UMBER, SIENNA, OCHRE = "#3a4a72", "#6a5546", "#b9805a", "#d9b46a"

PAINTERS: dict[str, tuple] = {}


def painter(name: str, size: tuple[int, int], runtime: tuple[int, int] | None = None, alpha: bool = True, quality: int = 86):
    """Registers a painter: master size, runtime size, RGBA cut-out or opaque sheet."""

    def register(fn):
        PAINTERS[name] = (fn, size, runtime or size, alpha, quality)
        return fn

    return register


def foliage(
    sheet: wc.Sheet,
    base: tuple[float, float],
    centre: tuple[float, float],
    radii: tuple[float, float],
    count: int,
    leaf_len: tuple[float, float],
    slim: float,
    pigments: tuple[str, str, str],
    tip: float = 0.6,
    spread: float = 0.9,
    under: str | None = None,
) -> None:
    """A mass of leaves growing away from `base`, filling an ellipse: three glazes, light to dark."""
    rng = sheet.rng
    if under:
        m = wc.empty(sheet)
        wc.ellipse(m, sheet, centre[0], centre[1], radii[0] * 0.86, radii[1] * 0.86, soft=radii[0] * 0.35)
        sheet.wash(wc.rough(sheet, m, 0.4, radii[0] * 0.2), under, 0.5, edge=0.2, bloom=0.7, soft=3)
    layers = [wc.empty(sheet) for _ in range(3)]
    for i in range(count):
        a = rng.uniform(0, math.tau)
        r = math.sqrt(rng.uniform(0, 1))
        x = centre[0] + math.cos(a) * r * radii[0]
        y = centre[1] + math.sin(a) * r * radii[1]
        out = math.atan2(y - base[1], x - base[0]) + rng.normal(0, spread)
        length = rng.uniform(*leaf_len)
        # Leaves near the rim catch the light; the heart of the mass is glazed darker.
        k = int(np.clip(rng.normal(1.15 - r * 1.1, 0.75), 0, 2.99))
        wc.leaf(layers[k], sheet, x, y, length, length * slim * rng.uniform(0.8, 1.2), out, tip)
    strengths = (0.55, 0.75, 0.95)
    for mask, pigment, strength in zip(layers, pigments, strengths):
        sheet.wash(mask, pigment, strength, edge=0.7, gran=0.55, bloom=0.5, soft=0.9)


def stem(sheet: wc.Sheet, pts: list[tuple[float, float]], r0: float, r1: float, pigment: str = UMBER, strength: float = 0.9) -> None:
    """A twig or branch through `pts`, thinning from `r0` to `r1`."""
    m = wc.empty(sheet)
    n = len(pts) - 1
    for i in range(n):
        a, b = pts[i], pts[i + 1]
        wc.segment(m, sheet, a[0], a[1], b[0], b[1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n)
    sheet.wash(m, pigment, strength, edge=0.5, gran=0.7, bloom=0.3, soft=0.8)


def tiles(sheets: list[Image.Image], cols: int) -> Image.Image:
    """Packs equally sized images into an atlas, row by row."""
    w, h = sheets[0].size
    rows = math.ceil(len(sheets) / cols)
    atlas = Image.new(sheets[0].mode, (w * cols, h * rows))
    for i, img in enumerate(sheets):
        atlas.paste(img, ((i % cols) * w, (i // cols) * h))
    return atlas


# ------------------------------------------------------------------------------------------ canopy


@painter("leaves", (2048, 2048), (1024, 1024))
def paint_leaves(size):
    """Calabash foliage cards, 2x2: small simple leaves in tufts along a twig (Crescentia cujete)."""
    out = []
    for v in range(4):
        s = wc.Sheet(size[0] // 2, size[1] // 2, 100 + v)
        w, h = s.w, s.h
        rng = s.rng
        # A twig from the bottom centre, forking once or twice; tufts of leaves at its nodes.
        twig = [(w * 0.5, h * 0.98)]
        ang = -math.pi / 2 + rng.normal(0, 0.15)
        for _ in range(6):
            x, y = twig[-1]
            ang += rng.normal(0, 0.22)
            twig.append((x + math.cos(ang) * h * 0.13, y + math.sin(ang) * h * 0.13))
        forks = []
        for j in (2, 4):
            a2 = -math.pi / 2 + rng.choice([-1, 1]) * rng.uniform(0.6, 1.0)
            fx, fy = twig[j]
            fork = [(fx, fy)]
            for _ in range(3):
                a2 += rng.normal(0, 0.2)
                fx, fy = fx + math.cos(a2) * h * 0.11, fy + math.sin(a2) * h * 0.11
                fork.append((fx, fy))
            forks.append(fork)
        layers = [wc.empty(s) for _ in range(3)]
        for line in [twig, *forks]:
            for px, py in line[1:]:
                for _ in range(rng.integers(5, 9)):
                    a = rng.uniform(0, math.tau)
                    length = rng.uniform(0.11, 0.17) * h
                    k = int(np.clip(rng.normal(0.9, 0.8), 0, 2.99))
                    wc.leaf(layers[k], s, px + rng.normal(0, 6), py + rng.normal(0, 6), length, length * 0.3, a, 0.68)
        for mask, pigment, strength in zip(layers, (SAP, OLIVE, JADE), (0.6, 0.8, 0.95)):
            s.wash(mask, pigment, strength, edge=0.8, gran=0.5, bloom=0.5, soft=1.0)
        stem(s, twig, 7, 2.5, UMBER, 0.8)
        for fork in forks:
            stem(s, fork, 4, 2, UMBER, 0.7)
        out.append(s.image(alpha=True, alpha_gain=1.25))
    return tiles(out, 2)


# ------------------------------------------------------------------------------------- mid garden


@painter("garden", (3072, 2048), (1536, 1024))
def paint_garden(size):
    """Mid-garden masses, 3x2: croton bush, banana clump, hibiscus bush, heliconia, shrub, low ferns."""
    cw, ch = size[0] // 3, size[1] // 2
    out = []
    # 0 round bush
    s = wc.Sheet(cw, ch, 210)
    foliage(s, (cw * 0.5, ch * 1.0), (cw * 0.5, ch * 0.58), (cw * 0.4, ch * 0.34), 520, (40, 80), 0.36, (SAP, SAGE, JADE), under=SAP)
    out.append(s)
    # 1 banana clump: long arching leaves from a base
    s = wc.Sheet(cw, ch, 211)
    big(s, (cw * 0.5, ch * 0.97), 9, (ch * 0.5, ch * 0.82), 0.2, (SAP, OLIVE, JADE), fan=1.25)
    out.append(s)
    # 2 hibiscus bush with coral flowers
    s = wc.Sheet(cw, ch, 212)
    foliage(s, (cw * 0.5, ch * 1.0), (cw * 0.5, ch * 0.6), (cw * 0.38, ch * 0.32), 460, (36, 70), 0.5, (SAGE, OLIVE, DEEP), tip=0.45, under=SAGE)
    flowers(s, 11, (cw * 0.5, ch * 0.58), (cw * 0.33, ch * 0.27), 34)
    out.append(s)
    # 3 heliconia / ginger: upright blades with red bracts
    s = wc.Sheet(cw, ch, 213)
    big(s, (cw * 0.5, ch * 0.98), 8, (ch * 0.42, ch * 0.7), 0.17, (SAP, OLIVE, JADE), fan=0.75)
    bracts(s, 4, (cw * 0.5, ch * 0.95), ch * 0.55)
    out.append(s)
    # 4 tall shrub / small tree
    s = wc.Sheet(cw, ch, 214)
    stem(s, [(cw * 0.5, ch * 0.99), (cw * 0.48, ch * 0.7), (cw * 0.53, ch * 0.45)], 16, 7, UMBER, 0.8)
    foliage(s, (cw * 0.5, ch * 0.8), (cw * 0.5, ch * 0.38), (cw * 0.4, ch * 0.3), 620, (30, 62), 0.34, (SAP, OLIVE, DEEP), under=SAP)
    out.append(s)
    # 5 low ground cover
    s = wc.Sheet(cw, ch, 215)
    foliage(s, (cw * 0.5, ch * 1.1), (cw * 0.5, ch * 0.78), (cw * 0.44, ch * 0.16), 420, (34, 70), 0.3, (SAP, SAGE, JADE), spread=0.5, under=SAP)
    flowers(s, 5, (cw * 0.5, ch * 0.78), (cw * 0.36, ch * 0.1), 22, CORAL)
    out.append(s)
    return tiles([sh.image(alpha=True, alpha_gain=1.3) for sh in out], 3)


def big(sheet: wc.Sheet, base, count: int, lengths, slim: float, pigments, fan: float = 1.0) -> None:
    """Long blades (banana, heliconia, balisier) fanning from `base`, each with a lifted midrib."""
    rng = sheet.rng
    order = sorted(range(count), key=lambda _: rng.random())
    for n, i in enumerate(order):
        a = -math.pi / 2 + ((i + 0.5) / count - 0.5) * 2 * fan + rng.normal(0, 0.06)
        length = rng.uniform(*lengths)
        # The stalk rises, then the blade leans out: stamp the blade from a point up the stalk.
        sx = base[0] + math.cos(a) * length * 0.12
        sy = base[1] + math.sin(a) * length * 0.12
        m = wc.empty(sheet)
        wc.leaf(m, sheet, sx, sy, length, length * slim * rng.uniform(0.85, 1.2), a, 0.5)
        pigment = pigments[min(2, n * 3 // count)]
        sheet.wash(wc.rough(sheet, m, 0.18, 30), pigment, 0.85, edge=0.8, gran=0.5, bloom=0.6, soft=1.2)
        rib = wc.empty(sheet)
        wc.segment(rib, sheet, sx, sy, sx + math.cos(a) * length * 0.93, sy + math.sin(a) * length * 0.93, 2.6, 0.8)
        sheet.lift(rib, 0.45, 1.0)
        st = wc.empty(sheet)
        wc.segment(st, sheet, base[0], base[1], sx, sy, 5, 4)
        sheet.wash(st, pigments[1], 0.7, soft=0.8)


def flowers(sheet: wc.Sheet, count: int, centre, radii, size: float, pigment: str = CORAL) -> None:
    """Hibiscus-like flowers: five petals glazed coral, a darker throat."""
    rng = sheet.rng
    for _ in range(count):
        a = rng.uniform(0, math.tau)
        r = math.sqrt(rng.uniform(0, 1))
        x, y = centre[0] + math.cos(a) * r * radii[0], centre[1] + math.sin(a) * r * radii[1]
        clear = wc.empty(sheet)
        wc.ellipse(clear, sheet, x, y, size * 1.05, size * 1.05, soft=size * 0.3)
        sheet.lift(clear, 0.92, 1.0)
        petals = wc.empty(sheet)
        rot = rng.uniform(0, math.tau)
        for p in range(5):
            pa = rot + p * math.tau / 5
            wc.ellipse(petals, sheet, x + math.cos(pa) * size * 0.5, y + math.sin(pa) * size * 0.5, size * 0.58, size * 0.42, pa, soft=2)
        sheet.wash(petals, pigment, 0.85, edge=0.9, gran=0.4, bloom=0.6, soft=0.8)
        throat = wc.empty(sheet)
        wc.ellipse(throat, sheet, x, y, size * 0.22, size * 0.22, soft=size * 0.15)
        sheet.wash(throat, "#a8474f", 0.8, edge=0.2, soft=1.0, cover=0)


def bracts(sheet: wc.Sheet, count: int, base, height: float) -> None:
    """Heliconia / alpinia spikes: stacked red bracts on a stalk."""
    rng = sheet.rng
    for i in range(count):
        x = base[0] + (i - (count - 1) / 2) * sheet.w * 0.16 + rng.normal(0, 12)
        top = base[1] - height * rng.uniform(0.75, 1.05)
        st = wc.empty(sheet)
        wc.segment(st, sheet, x, base[1], x, top + 60, 3.5, 2.5)
        sheet.wash(st, OLIVE, 0.7, soft=0.8)
        m = wc.empty(sheet)
        for k in range(7):
            side = -1 if k % 2 else 1
            y = top + k * 22
            wc.leaf(m, sheet, x, y + 26, 46 - k * 2, 17, -math.pi / 2 + side * 0.55, 0.45)
        sheet.lift(m, 0.85, 0.8)
        sheet.wash(m, "#c9504a", 0.9, edge=0.8, gran=0.4, bloom=0.5, soft=0.7)


# ------------------------------------------------------------------------------------- foreground


@painter("foreground", (2048, 2048), (1536, 1536))
def paint_foreground(size):
    """Foreground cut-outs, 2x2, darker values to frame a shot: banana fan, balisier with a bract,
    fern and hibiscus corner, hanging calabash-leaf spray."""
    cw, ch = size[0] // 2, size[1] // 2
    out = []
    dark = (JADE, DEEP, "#27465a")
    s = wc.Sheet(cw, ch, 310)
    big(s, (cw * 0.12, ch * 1.02), 6, (ch * 0.7, ch * 1.0), 0.22, dark, fan=0.75)
    out.append(s)
    s = wc.Sheet(cw, ch, 311)
    big(s, (cw * 0.62, ch * 1.02), 7, (ch * 0.5, ch * 0.9), 0.17, dark, fan=0.9)
    bracts(s, 2, (cw * 0.62, ch * 0.98), ch * 0.62)
    out.append(s)
    s = wc.Sheet(cw, ch, 312)
    foliage(s, (cw * 0.5, ch * 1.1), (cw * 0.5, ch * 0.72), (cw * 0.46, ch * 0.24), 380, (60, 130), 0.3, dark, spread=0.6, under=JADE)
    flowers(s, 3, (cw * 0.42, ch * 0.62), (cw * 0.3, ch * 0.12), 62)
    out.append(s)
    s = wc.Sheet(cw, ch, 313)
    rng = s.rng
    spray = [(cw * 0.05, ch * 0.02), (cw * 0.3, ch * 0.16), (cw * 0.56, ch * 0.24), (cw * 0.84, ch * 0.42)]
    layers = [wc.empty(s) for _ in range(3)]
    for t in np.linspace(0.05, 1, 16):
        i = min(len(spray) - 2, int(t * (len(spray) - 1)))
        f = t * (len(spray) - 1) - i
        px = spray[i][0] + (spray[i + 1][0] - spray[i][0]) * f
        py = spray[i][1] + (spray[i + 1][1] - spray[i][1]) * f
        for _ in range(7):
            length = rng.uniform(0.13, 0.2) * ch
            k = int(np.clip(rng.normal(1.0, 0.8), 0, 2.99))
            wc.leaf(layers[k], s, px + rng.normal(0, 10), py + rng.normal(0, 10), length, length * 0.3, rng.uniform(0.1, math.pi - 0.1), 0.68)
    for mask, pigment, strength in zip(layers, (OLIVE, JADE, DEEP), (0.7, 0.85, 0.95)):
        s.wash(mask, pigment, strength, edge=0.8, gran=0.5, bloom=0.5, soft=1.0)
    stem(s, spray, 9, 3, UMBER, 0.85)
    out.append(s)
    return tiles([sh.image(alpha=True, alpha_gain=1.35) for sh in out], 2)


# ------------------------------------------------------------------------------- distant landscape


@painter("hills", (4096, 1024), (2048, 512))
def paint_hills(size):
    """Far relief of Basse-Terre with a few contemporary houses, as a cut-out strip (sky separate)."""
    s = wc.Sheet(size[0], size[1], 400, tile=True)
    w, h = s.w, s.h
    rng = s.rng
    x = np.arange(w, dtype=np.float32)

    def ridge(base: float, amp: float, cell: float) -> np.ndarray:
        line = wc.fbm(2, w, cell, rng, 4, tile=True)[0]
        return (base + (line - 0.5) * 2 * amp) * h

    for base, amp, cell, pigment, strength in (
        (0.3, 0.2, w * 0.3, LAVENDER, 0.5),
        (0.5, 0.14, w * 0.18, "#7f93a6", 0.6),
        (0.68, 0.1, w * 0.11, SAGE, 0.5),
    ):
        y = ridge(base, amp, cell)
        m = np.clip((s.yy - y[None, :]) / 3, 0, 1)
        s.wash(m, pigment, strength, edge=0.9, gran=0.6, bloom=0.6, soft=1.5)
    # Tree masses along the near ridge and small masonry houses with pitched metal roofs.
    y = ridge(0.74, 0.05, w * 0.07)
    near = wc.empty(s)
    for i in range(170):
        cx = rng.uniform(0, w)
        cy = y[int(cx) % w] + rng.uniform(-8, 26)
        wc.ellipse(near, s, cx, cy, rng.uniform(26, 70), rng.uniform(18, 40), soft=8)
    s.wash(wc.rough(s, near, 0.3, 22), JADE, 0.38, edge=0.6, bloom=0.6, soft=1.5)
    s.wash(np.clip((s.yy - y[None, :] - 20) / 6, 0, 1), SAGE, 0.32, edge=0.2, bloom=0.5, soft=2)
    for i in range(9):
        cx = (i + rng.uniform(0.2, 0.8)) * w / 9
        cy = y[int(cx) % w] - rng.uniform(0, 26)
        hw, hh = rng.uniform(26, 40), rng.uniform(13, 18)
        box = ((np.abs(s.xx - cx) < hw) & (np.abs(s.yy - cy) < hh)).astype(np.float32)
        s.lift(box, 0.93, 0.8)
        s.wash(box, "#efe1cf", 0.5, edge=0.6, soft=0.7)
        roof = ((np.abs(s.xx - cx) < hw + 6) & (s.yy < cy - hh) & (s.yy > cy - hh - 11 + np.abs(s.xx - cx) * 0.16)).astype(np.float32)
        s.lift(roof, 0.9, 0.6)
        s.wash(roof, rng.choice(["#b96a5b", "#8f9aa8", "#a8584c"]), 0.8, edge=0.5, soft=0.7)
    del x
    return s.image(alpha=True, alpha_gain=1.5)


@painter("hills_lights", (2048, 512), (1024, 256), alpha=False)
def paint_hills_lights(size):
    """Night windows of the distant houses, matching `hills`: warm dots on black (added by the engine)."""
    w, h = size
    rng = np.random.default_rng(401)
    img = np.zeros((h, w), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    for i in range(34):
        cx, cy = rng.uniform(0, w), rng.uniform(0.6, 0.8) * h
        img += np.exp(-(((xx - cx) / 2.6) ** 2 + ((yy - cy) / 2.0) ** 2)) * rng.uniform(0.5, 1)
    img = np.clip(img, 0, 1)
    rgb = np.dstack([img, img * 0.78, img * 0.42])
    return Image.fromarray((rgb * 255).astype(np.uint8), "RGB")


@painter("sky", (2048, 1024), (1024, 512), alpha=False, quality=90)
def paint_sky(size):
    """Sky wash map (tileable in x): R cloud wash, G backruns, B paper grain. The engine colours it
    with each page's key (apricot/lavender dusk, indigo night, peach dawn); stars are separate."""
    s = wc.Sheet(size[0], size[1], 500, tile=True)
    clouds = s.noise(size[0] * 0.22, 5)
    band = wc.smoothstep(0.42, 0.72, clouds * (0.6 + 0.8 * (s.yy / s.h)))
    clouds = wc.blur(band, 6, True) * (1 + 0.6 * (s.grain - 0.5))
    back = s.noise(size[0] * 0.08, 4)
    rgb = np.dstack([np.clip(clouds, 0, 1), back, s.grain])
    return Image.fromarray((rgb * 255).astype(np.uint8), "RGB")


# ------------------------------------------------------------------------------ material textures


def tile_sheet(seed: int, n: int = 1024) -> wc.Sheet:
    """A tileable sheet for a repeating material."""
    return wc.Sheet(n, n, seed, tile=True)


@painter("bark", (1024, 1024), (512, 512), alpha=False)
def paint_bark(size):
    """Calabash bark: pale grey-brown, fissured lengthwise, with lichen blooms."""
    s = tile_sheet(600, size[0])
    s.wash(np.ones((s.h, s.w), np.float32), "#b9a48c", 0.9, edge=0, bloom=0.8, gran=0.7, soft=0)
    streak = wc.fbm(s.h, s.w, 60, s.rng, 4, True)
    fine = np.asarray(Image.fromarray(wc.fbm(s.h // 8, s.w, 14, s.rng, 3, True), "F").resize((s.w, s.h), Image.BICUBIC))
    s.wash(wc.smoothstep(0.52, 0.7, fine * 0.7 + streak * 0.3), UMBER, 0.8, edge=0.6, gran=0.8, soft=1.0)
    s.wash(wc.smoothstep(0.6, 0.75, s.noise(140, 3)), "#8a9a86", 0.4, edge=0.8, bloom=0.5, soft=3)
    s.wash(wc.smoothstep(0.66, 0.8, s.noise(90, 3)), SIENNA, 0.35, edge=0.6, soft=3)
    return s.image()


@painter("wall", (1024, 1024), (512, 512), alpha=False)
def paint_wall(size):
    """Rendered masonry: a pale wash with soft weather blooms (neutral: the engine tints each wall)."""
    s = tile_sheet(601, size[0])
    s.wash(np.ones((s.h, s.w), np.float32), "#f6efe2", 1.0, edge=0, bloom=0.25, gran=0.35, soft=0)
    s.wash(wc.smoothstep(0.45, 0.9, s.noise(420, 3)), "#e6d8c6", 0.3, edge=0.3, bloom=0.2, soft=12)
    s.wash(wc.smoothstep(0.66, 0.9, s.noise(200, 3)), LAVENDER, 0.08, edge=0.3, soft=10)
    return s.image()


@painter("roof", (1024, 1024), (512, 512), alpha=False)
def paint_roof(size):
    """Ribbed metal roofing in a worn coral red, ribs running down the slope (v)."""
    s = tile_sheet(602, size[0])
    s.wash(np.ones((s.h, s.w), np.float32), "#c0766a", 1.0, edge=0, bloom=0.7, gran=0.6, soft=0)
    ribs = (np.cos(s.xx / s.w * math.tau * 16) > 0.86).astype(np.float32)
    s.wash(ribs, "#8a4f4a", 0.6, edge=0.3, gran=0.5, soft=1.2)
    s.wash(wc.smoothstep(0.55, 0.8, s.noise(200, 4)), UMBER, 0.3, edge=0.7, soft=4)
    return s.image()


@painter("ground", (2048, 2048), (1024, 1024), alpha=False)
def paint_ground(size):
    """Garden floor: grass washes with warm earth showing through."""
    s = tile_sheet(603, size[0])
    s.wash(np.ones((s.h, s.w), np.float32), "#c9cf8e", 1.0, edge=0, bloom=0.6, gran=0.5, soft=0)
    s.wash(wc.smoothstep(0.3, 0.75, s.noise(620, 3)), SAGE, 0.55, edge=0.35, gran=0.6, bloom=0.4, soft=10)
    s.wash(wc.smoothstep(0.5, 0.8, s.noise(380, 3)), OLIVE, 0.36, edge=0.5, gran=0.6, soft=8)
    s.wash(wc.smoothstep(0.66, 0.86, s.noise(420, 3)), SIENNA, 0.22, edge=0.4, soft=10)
    blades = wc.empty(s)
    for _ in range(1500):
        x, y = s.rng.uniform(0, s.w), s.rng.uniform(0, s.h)
        a = -math.pi / 2 + s.rng.normal(0, 0.5)
        length = s.rng.uniform(10, 26)
        wc.segment(blades, s, x, y, x + math.cos(a) * length, y + math.sin(a) * length, 1.6, 0.4)
    s.wash(blades, JADE, 0.5, edge=0.3, gran=0.4, soft=0.6)
    return s.image()


@painter("earth", (1024, 1024), (512, 512), alpha=False)
def paint_earth(size):
    """Beaten earth of the path and the lane, and the pale stones of the stepping path."""
    s = tile_sheet(604, size[0])
    s.wash(np.ones((s.h, s.w), np.float32), "#dcc3a0", 1.0, edge=0, bloom=0.7, gran=0.8, soft=0)
    s.wash(wc.smoothstep(0.5, 0.75, s.noise(180, 4)), SIENNA, 0.4, edge=0.7, gran=0.7, soft=3)
    s.wash(wc.smoothstep(0.6, 0.8, s.noise(90, 3)), LAVENDER, 0.25, edge=0.6, soft=3)
    return s.image()


@painter("gourd", (1024, 512), (512, 256), alpha=False)
def paint_gourd(size):
    """Smooth calabash shell (u around, v stem to base): green wash, paler belly, no pits, no warts.
    The glow is not painted: the engine lights the shell from inside with a separate uniform."""
    s = wc.Sheet(size[0], size[1], 605, tile=True)
    s.wash(np.ones((s.h, s.w), np.float32), "#b9c873", 1.0, edge=0, bloom=0.35, gran=0.25, soft=0)
    s.wash(wc.smoothstep(0.45, 0.75, s.noise(240, 3)), "#7fa457", 0.55, edge=0.5, gran=0.25, bloom=0.3, soft=6)
    s.wash(wc.smoothstep(0.0, 0.35, 1 - s.yy / s.h) * 0.8, OLIVE, 0.45, edge=0, gran=0.2, soft=8)
    s.wash(wc.smoothstep(0.6, 0.85, s.noise(120, 3)), OCHRE, 0.25, edge=0.5, soft=6)
    return s.image()


@painter("cloth", (512, 512), (256, 256), alpha=False)
def paint_cloth(size):
    """Everyday cotton for Man Ninon's dress and the table: a neutral wash with a faint weave."""
    s = tile_sheet(606, size[0])
    s.wash(np.ones((s.h, s.w), np.float32), "#efe6da", 1.0, edge=0, bloom=0.5, gran=0.6, soft=0)
    weave = ((np.sin(s.xx * 0.9) * np.sin(s.yy * 0.9)) > 0.3).astype(np.float32)
    s.wash(weave, "#cdbfae", 0.25, edge=0, gran=0.3, soft=0.8)
    s.wash(wc.smoothstep(0.55, 0.8, s.noise(120, 3)), "#c9b7a6", 0.4, edge=0.7, soft=3)
    return s.image()


@painter("grain", (512, 512), (512, 512), alpha=False, quality=92)
def paint_grain(size):
    """Paper tooth and pigment granulation, tileable and static (R fine grain, G coarse blooms)."""
    s = tile_sheet(607, size[0])
    g = np.dstack([s.grain, s.noise(70, 4), s.noise(18, 3)])
    return Image.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8), "RGB")


@painter("hedge", (2048, 512), (1024, 256))
def paint_hedge(size):
    """Clipped hibiscus hedge along the fences, tileable in x."""
    s = wc.Sheet(size[0], size[1], 608, tile=True)
    w, h = s.w, s.h
    top = (0.2 + 0.1 * wc.fbm(1, w, w * 0.12, s.rng, 3, True)[0]) * h
    body = np.clip((s.yy - top[None, :]) / 6, 0, 1)
    s.wash(wc.rough(s, body, 0.25, 26), SAGE, 0.75, edge=0.5, gran=0.6, bloom=0.6, soft=1.5)
    layers = [wc.empty(s) for _ in range(2)]
    for _ in range(900):
        x, y = s.rng.uniform(0, w), s.rng.uniform(0.12, 1.0) * h
        if y < top[int(x)] - 12:
            continue
        length = s.rng.uniform(26, 48)
        wc.leaf(layers[int(s.rng.random() < 0.45)], s, x, y, length, length * 0.42, s.rng.uniform(0, math.tau), 0.5)
    s.wash(layers[0], OLIVE, 0.6, edge=0.7, gran=0.5, soft=0.9)
    s.wash(layers[1], DEEP, 0.75, edge=0.7, gran=0.5, soft=0.9)
    flowers(s, 16, (w * 0.5, h * 0.55), (w * 0.5, h * 0.3), 20)
    return s.image(alpha=True, alpha_gain=1.4)


def main() -> None:
    """Paints the requested layers and writes masters and runtime exports."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="")
    parser.add_argument("--no-runtime", action="store_true")
    args = parser.parse_args()
    only = set(filter(None, args.only.split(",")))
    MASTER.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    for name, (fn, size, runtime, alpha, quality) in PAINTERS.items():
        if only and name not in only:
            continue
        img = fn(size)
        img.save(MASTER / f"src_{name}.png", optimize=True)
        if not args.no_runtime:
            img.resize(runtime, Image.LANCZOS).save(RUNTIME / f"rt_{name}.webp", quality=quality, method=6, exact=True)
        print(f"{name}: master {img.size} {img.mode}, runtime {runtime}")


if __name__ == "__main__":
    main()
