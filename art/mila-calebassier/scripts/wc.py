"""Scripted watercolour: transparent washes on a grained sheet (numpy + Pillow).

A `Sheet` accumulates pigment as optical density (Beer-Lambert), so glazes darken and mix the way
transparent washes do. Each wash pools at its edges, granulates in the paper's grain and blooms
with a low-frequency backrun. Everything is seeded: the same script paints the same sheet.
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image


def hex_rgb(value: str) -> np.ndarray:
    """Converts '#rrggbb' to a float RGB triple in [0, 1]."""
    value = value.lstrip("#")
    return np.array([int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


def _box(a: np.ndarray, r: int, axis: int, wrap: bool) -> np.ndarray:
    """Box blur of radius `r` along one axis (cumulative sums)."""
    if r < 1:
        return a
    mode = "wrap" if wrap else "edge"
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode=mode), axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur(a: np.ndarray, radius: float, wrap: bool = False) -> np.ndarray:
    """Near-Gaussian blur: three box passes per axis."""
    r = int(round(radius * 0.6))
    if r < 1:
        return a
    for _ in range(3):
        a = _box(a, r, 0, wrap)
        a = _box(a, r, 1, wrap)
    return a


def value_noise(h: int, w: int, cell: float, rng: np.random.Generator, tile: bool = False) -> np.ndarray:
    """Smooth noise in [0, 1] with features about `cell` pixels wide."""
    gh = max(2, int(math.ceil(h / cell)))
    gw = max(2, int(math.ceil(w / cell)))
    grid = rng.random((gh, gw), dtype=np.float32)
    if tile:
        grid = np.pad(grid, ((0, 1), (0, 1)), mode="wrap")
        size = (w + int(round(w / gw)), h + int(round(h / gh)))
    else:
        size = (w, h)
    img = Image.fromarray(grid, mode="F").resize(size, Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[:h, :w], 0, 1)


def fbm(h: int, w: int, cell: float, rng: np.random.Generator, octaves: int = 4, tile: bool = False) -> np.ndarray:
    """Fractal noise in [0, 1]."""
    total = np.zeros((h, w), dtype=np.float32)
    amp, norm = 1.0, 0.0
    for _ in range(octaves):
        total += amp * value_noise(h, w, max(cell, 1.5), rng, tile)
        norm += amp
        amp *= 0.5
        cell /= 2.0
    return total / norm


def smoothstep(a: float, b: float, x: np.ndarray) -> np.ndarray:
    """Hermite step from `a` to `b`."""
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Sheet:
    """A sheet of watercolour paper being painted."""

    def __init__(self, width: int, height: int, seed: int, tile: bool = False):
        self.w, self.h, self.tile = width, height, tile
        self.rng = np.random.default_rng(seed)
        self.density = np.zeros((height, width, 3), dtype=np.float32)
        self.cover = np.zeros((height, width), dtype=np.float32)
        # Paper tooth: a fine grain inside a coarser one; pigment settles in its hollows.
        fine = value_noise(height, width, 2.2, self.rng, tile)
        coarse = fbm(height, width, 9, self.rng, 3, tile)
        self.grain = np.clip(0.62 * fine + 0.38 * coarse, 0, 1)
        self.yy, self.xx = np.mgrid[0:height, 0:width].astype(np.float32)

    def noise(self, cell: float, octaves: int = 4) -> np.ndarray:
        """Fractal noise the size of the sheet."""
        return fbm(self.h, self.w, cell, self.rng, octaves, self.tile)

    def warp(self, mask_fn, amount: float, cell: float):
        """Evaluates `mask_fn(x, y)` on coordinates displaced by noise (wobbly brush edges)."""
        dx = (self.noise(cell, 3) - 0.5) * 2 * amount
        dy = (self.noise(cell, 3) - 0.5) * 2 * amount
        return mask_fn(self.xx + dx, self.yy + dy)

    def wash(
        self,
        mask: np.ndarray,
        pigment: str,
        strength: float = 1.0,
        edge: float = 0.6,
        gran: float = 0.5,
        bloom: float = 0.45,
        soft: float = 1.5,
        cover: float = 1.0,
    ) -> None:
        """Lays one transparent wash of `pigment` inside `mask` (0..1)."""
        m = blur(np.clip(mask, 0, 1), soft, self.tile) if soft > 0 else np.clip(mask, 0, 1)
        d = m.copy()
        if edge > 0:
            # The wash dries from its middle: pigment is carried to the rim of the wet shape.
            inner = blur(m, max(4.0, min(self.w, self.h) * 0.012), self.tile)
            d *= 1 + edge * 1.6 * np.clip(m - inner, 0, 1) * 2.2
        if bloom > 0:
            d *= 1 + bloom * (self.noise(min(self.w, self.h) * 0.16, 3) - 0.5) * 2
        if gran > 0:
            d *= 1 + gran * (self.grain - 0.5) * 2
        d = np.clip(d, 0, None) * strength
        absorb = -np.log(np.clip(hex_rgb(pigment), 0.02, 0.999))
        self.density += d[..., None] * absorb[None, None, :]
        if cover > 0:
            self.cover = 1 - (1 - self.cover) * (1 - np.clip(m * 1.6, 0, 1) * cover)

    def lift(self, mask: np.ndarray, amount: float = 0.6, soft: float = 1.2) -> None:
        """Lifts pigment out of `mask` (highlights, veins, light lines)."""
        m = blur(np.clip(mask, 0, 1), soft, self.tile) if soft > 0 else np.clip(mask, 0, 1)
        self.density *= (1 - amount * m)[..., None]

    def rgb(self, paper: str = "#f6f0e3") -> np.ndarray:
        """The painted sheet as float RGB: paper seen through the pigment."""
        tooth = 1 - 0.035 * (self.grain - 0.5) * 2
        return np.clip(hex_rgb(paper)[None, None, :] * np.exp(-self.density) * tooth[..., None], 0, 1)

    def image(self, paper: str = "#f6f0e3", alpha: bool = False, alpha_gain: float = 1.0) -> Image.Image:
        """Opaque RGB sheet, or an RGBA cut-out whose alpha is the painted coverage.

        A cut-out keeps its full pigment colour where the coverage fades, and that colour is bled
        into the transparent margin, so no pale paper fringe shows against a dark scene."""
        if not alpha:
            return Image.fromarray((self.rgb(paper) * 255 + 0.5).astype(np.uint8), "RGB")
        a = np.clip(self.cover * alpha_gain, 0, 1)
        full = self.density / np.clip(self.cover, 0.35, 1)[..., None]
        tooth = 1 - 0.035 * (self.grain - 0.5) * 2
        rgb = np.clip(hex_rgb(paper)[None, None, :] * np.exp(-full) * tooth[..., None], 0, 1)
        weight = blur(a, 6)
        bleed = np.dstack([blur(rgb[..., c] * a, 6) for c in range(3)]) / np.clip(weight, 1e-4, None)[..., None]
        far = np.dstack([blur(rgb[..., c] * a, 40) for c in range(3)]) / np.clip(blur(a, 40), 1e-4, None)[..., None]
        bleed = np.where(weight[..., None] > 0.01, bleed, far)
        rgb = np.where(a[..., None] > 0.6, rgb, rgb * a[..., None] + bleed * (1 - a[..., None]))
        out = np.dstack([np.clip(rgb, 0, 1), a])
        return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


# ---------------------------------------------------------------------------------------------
# Brush shapes: each returns a mask the size of the sheet, evaluated only inside its bounding box.
# ---------------------------------------------------------------------------------------------


def _local(sheet: Sheet, cx: float, cy: float, reach: float):
    """Window of the sheet around a point: slices and pixel coordinates."""
    x0, x1 = max(0, int(cx - reach)), min(sheet.w, int(cx + reach) + 1)
    y0, y1 = max(0, int(cy - reach)), min(sheet.h, int(cy + reach) + 1)
    if x0 >= x1 or y0 >= y1:
        return None
    return (slice(y0, y1), slice(x0, x1)), sheet.xx[y0:y1, x0:x1], sheet.yy[y0:y1, x0:x1]


def leaf(mask: np.ndarray, sheet: Sheet, x: float, y: float, length: float, width: float, angle: float, tip: float = 0.62) -> None:
    """Stamps one simple leaf from its base (x, y); `tip` moves the widest point along it."""
    win = _local(sheet, x + math.cos(angle) * length / 2, y + math.sin(angle) * length / 2, length * 0.62)
    if win is None:
        return
    sl, xx, yy = win
    ca, sa = math.cos(angle), math.sin(angle)
    u = ((xx - x) * ca + (yy - y) * sa) / length
    v = (-(xx - x) * sa + (yy - y) * ca) / width
    uc = np.clip(u, 0, 1)
    a = tip / (1 - tip)
    profile = (uc**a) * (1 - uc)
    profile = profile / ((tip**a) * (1 - tip))
    inside = np.clip((profile - np.abs(v) * 2) * 6, 0, 1) * (u > 0) * (u < 1)
    mask[sl] = np.maximum(mask[sl], inside.astype(np.float32))


def segment(mask: np.ndarray, sheet: Sheet, x0: float, y0: float, x1: float, y1: float, r0: float, r1: float | None = None) -> None:
    """Stamps a tapered stroke from (x0, y0) to (x1, y1)."""
    r1 = r0 if r1 is None else r1
    reach = math.hypot(x1 - x0, y1 - y0) / 2 + max(r0, r1) + 2
    win = _local(sheet, (x0 + x1) / 2, (y0 + y1) / 2, reach)
    if win is None:
        return
    sl, xx, yy = win
    dx, dy = x1 - x0, y1 - y0
    t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / max(dx * dx + dy * dy, 1e-6), 0, 1)
    dist = np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy))
    r = r0 + (r1 - r0) * t
    mask[sl] = np.maximum(mask[sl], np.clip(r - dist + 0.5, 0, 1).astype(np.float32))


def ellipse(mask: np.ndarray, sheet: Sheet, x: float, y: float, rx: float, ry: float, angle: float = 0.0, soft: float = 1.5) -> None:
    """Stamps a soft-edged ellipse."""
    win = _local(sheet, x, y, max(rx, ry) + 3)
    if win is None:
        return
    sl, xx, yy = win
    ca, sa = math.cos(angle), math.sin(angle)
    u = ((xx - x) * ca + (yy - y) * sa) / rx
    v = (-(xx - x) * sa + (yy - y) * ca) / ry
    d = np.sqrt(u * u + v * v)
    mask[sl] = np.maximum(mask[sl], np.clip((1 - d) * min(rx, ry) / soft, 0, 1).astype(np.float32))


def empty(sheet: Sheet) -> np.ndarray:
    """A blank mask the size of the sheet."""
    return np.zeros((sheet.h, sheet.w), dtype=np.float32)


def rough(sheet: Sheet, mask: np.ndarray, amount: float = 0.35, cell: float = 14) -> np.ndarray:
    """Breaks a mask's edge with noise: dry-brush and lost edges."""
    n = sheet.noise(cell, 3)
    return np.clip((blur(mask, 1.2, sheet.tile) - amount * n) / (1 - amount), 0, 1)
