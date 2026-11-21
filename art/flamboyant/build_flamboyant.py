"""Builds the two flamboyant silhouette proposals (A parasol, B asymmetric) and exports them.

Run in the foreground, one variant per call:

    blender -b --factory-startup -P art/flamboyant/build_flamboyant.py -- a [--renders DIR]

Writes art/flamboyant/flamboyant-<v>.blend (editable: a vertex skeleton under live Skin and
Subdivision modifiers, radii in the skin vertex data) and src/tree/assets/flamboyant-<v>.glb.

Everything below is authored in the tree scene's own frame (three.js: x right, y up, z towards the
back of the opening view; the opening camera stands on -z and the trunk's foot is the origin) and
converted to Blender's z-up frame only when the meshes are built, so the numbers read like the
ones in src/tree/scene/camera.ts and cards.ts.
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
UP = Vector((0.0, 1.0, 0.0))

# Climb values of the card slots served by a named attach point (cards.ts `cardT`: 3 slots hang at
# 0.2, 0.54 and 0.88; 0.37 and 0.71 are the two more of a 5-slot tree).
SLOT_T = (0.2, 0.37, 0.54, 0.71, 0.88)
CARD_RADIUS = 12.2
CARD_RISE = 0.3
CARD_TOP = 1.05 * 1.18


def to_blender(p: Vector) -> Vector:
    """Scene frame (y up) to Blender frame (z up); the glTF exporter converts back."""
    return Vector((p.x, -p.z, p.y))


def polar(azimuth_deg: float, radius: float, y: float) -> Vector:
    """A point at `radius` from the trunk axis, `azimuth_deg` about +y from +x, height `y`."""
    a = math.radians(azimuth_deg)
    return Vector((math.cos(a) * radius, y, math.sin(a) * radius))


def card_top(index: int) -> tuple[float, Vector]:
    """Azimuth (degrees) and top-edge point of the card of slot `index` (1 to 5)."""
    t = SLOT_T[index - 1]
    a = -90.0 + t * 1.55 * 180.0
    # cards.ts hangs the cards 0.06 rad off the camera's line, alternately, in the 3-slot tree.
    a += {1: -3.44, 3: 3.44, 5: -3.44}.get(index, 0.0)
    y = 1.3 + t * 6.4 + CARD_RISE + CARD_TOP
    return a, polar(a, CARD_RADIUS, y)


class Skeleton:
    """Vertices with a radius each, joined by edges: what the Skin modifier wraps."""

    def __init__(self) -> None:
        self.points: list[Vector] = []
        self.radii: list[float] = []
        self.edges: list[tuple[int, int]] = []

    def add(self, p: Vector, r: float, parent: int | None) -> int:
        """Adds a vertex joined to `parent` and returns its index."""
        self.points.append(p.copy())
        self.radii.append(r)
        index = len(self.points) - 1
        if parent is not None:
            self.edges.append((parent, index))
        return index


def spline(points: list[Vector], step: float) -> list[Vector]:
    """Catmull-Rom through `points`, resampled about every `step` metres (ends included)."""
    pts = [points[0], *points, points[-1]]
    dense: list[Vector] = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(24):
            u = k / 24
            dense.append(
                0.5
                * (
                    2 * p1
                    + (p2 - p0) * u
                    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                    + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u
                )
            )
    dense.append(points[-1].copy())
    length = sum((dense[i + 1] - dense[i]).length for i in range(len(dense) - 1))
    count = max(2, round(length / step))
    out = [dense[0]]
    walked = 0.0
    target = length / count
    for i in range(len(dense) - 1):
        walked += (dense[i + 1] - dense[i]).length
        if walked >= target * len(out) and len(out) < count:
            out.append(dense[i + 1])
    out.append(dense[-1])
    return out


def limb(
    sk: Skeleton,
    start: int,
    points: list[Vector],
    r0: float,
    r1: float,
    step: float,
) -> list[int]:
    """Grows a curved, tapering limb from vertex `start` through `points`; returns its vertices."""
    path = spline([sk.points[start], *points], step)
    indices = [start]
    n = len(path) - 1
    for k in range(1, n + 1):
        s = k / n
        r = r1 + (r0 - r1) * (1 - s) ** 0.85
        indices.append(sk.add(path[k], r, indices[-1]))
    return indices


def tangent(sk: Skeleton, chain: list[int], k: int) -> Vector:
    """Direction of a limb at its k-th vertex."""
    a = sk.points[chain[max(0, k - 1)]]
    b = sk.points[chain[min(len(chain) - 1, k + 1)]]
    return (b - a).normalized()


def shoots(
    sk: Skeleton,
    out: Skeleton,
    chain: list[int],
    rng: random.Random,
    *,
    first: float,
    last: float,
    every: float,
    length: tuple[float, float],
    lift: tuple[float, float],
    droop: float,
    ratio: float,
    step: float,
    centre: Vector,
) -> list[list[int]]:
    """Side shoots along a limb, alternately left and right, shorter towards its end.

    They leave forwards and outwards, rise by `lift`, then sag by `droop` the farther they end
    from `centre` (the rim of a flamboyant hangs). `out` receives them: the same skeleton for
    boughs, another one for twigs (which then start inside their bough's bark).
    """
    grown: list[list[int]] = []
    walked = 0.0
    total = sum(
        (sk.points[chain[i + 1]] - sk.points[chain[i]]).length for i in range(len(chain) - 1)
    )
    side = 1.0 if rng.random() < 0.5 else -1.0
    due = first * total
    for k in range(1, len(chain) - 1):
        walked += (sk.points[chain[k]] - sk.points[chain[k - 1]]).length
        if walked < due or walked > last * total:
            continue
        due = walked + every * rng.uniform(0.8, 1.25)
        s = walked / total
        t = tangent(sk, chain, k)
        flat = Vector((t.x, 0.0, t.z))
        if flat.length < 1e-3:
            a = rng.uniform(0, math.tau)
            flat = Vector((math.cos(a), 0.0, math.sin(a)))
        flat.normalize()
        across = UP.cross(flat) * side
        side = -side
        heading = (flat * rng.uniform(0.45, 0.7) + across * rng.uniform(0.6, 0.9)).normalized()
        reach = rng.uniform(*length) * (1.0 - 0.45 * s)
        rise = rng.uniform(*lift) * reach
        p0 = sk.points[chain[k]]
        end = p0 + heading * reach + UP * rise
        spread = (Vector((end.x, 0, end.z)) - Vector((centre.x, 0, centre.z))).length
        far = min(3.2, max(0.0, spread - 4.5))
        end.y -= droop * far * far * 0.1
        bend = across.cross(UP) * rng.uniform(-0.25, 0.25) * reach
        mid1 = p0 + heading * reach * 0.35 + UP * rise * 0.55 + bend
        mid2 = p0 + heading * reach * 0.72 + UP * rise * 0.95 - bend * 0.6
        r0 = max(0.03, min(sk.radii[chain[k]] * ratio, 0.16))
        if out is sk:
            start = chain[k]
        else:
            start = out.add(p0, r0, None)
        grown.append(limb(out, start, [mid1, mid2, end], r0, 0.028, step))
    return grown


def build_variant(variant: str) -> dict:
    """The skeletons, foliage masses and attach points of a variant, in the scene frame."""
    rng = random.Random({"a": 7, "b": 19}[variant])
    wood = Skeleton()
    boughs_sk = Skeleton()
    twigs = Skeleton()
    roots = Skeleton()
    tips: list[Vector] = []
    bare: list[Vector] = []

    if variant == "a":
        axis = [
            ((0.0, -1.5, 0.0), 1.2),
            ((0.0, -0.45, 0.0), 1.08),
            ((0.03, 0.4, 0.0), 0.9),
            ((0.08, 1.2, 0.02), 0.79),
            ((0.12, 2.1, 0.0), 0.73),
            ((0.1, 2.9, -0.03), 0.69),
            ((0.02, 3.7, 0.0), 0.61),
            ((-0.05, 4.5, 0.05), 0.5),
            ((-0.1, 5.4, 0.1), 0.38),
        ]
        leader = [(0.1, 6.5, 0.0), (-0.15, 7.5, 0.2), (0.1, 8.4, 0.0), (0.0, 9.2, 0.1)]
        centre = Vector((0.0, 0.0, 0.0))
        # (azimuth, trunk vertex, [(radius, height)], start radius): the scaffold limbs leave the
        # trunk at different heights, climb, then run out almost level under the crown.
        scaffolds = [
            (-25.0, 5, [(1.3, 4.3), (3.2, 5.5), (5.3, 6.1), (7.0, 6.2)], 0.42),
            (25.0, 6, [(1.3, 5.1), (3.2, 6.3), (5.2, 6.9), (6.9, 7.0)], 0.36),
            (172.0, 6, [(1.3, 5.1), (3.3, 6.4), (5.4, 7.0), (7.1, 7.0)], 0.4),
            (70.0, 7, [(1.2, 5.9), (3.0, 7.1), (5.2, 7.7), (7.0, 7.8)], 0.34),
            (-118.0, 7, [(1.2, 5.9), (2.8, 7.0), (4.6, 7.6), (6.0, 7.7)], 0.32),
            (128.0, 8, [(1.1, 6.8), (2.8, 7.9), (4.8, 8.5), (6.6, 8.6)], 0.28),
            (-72.0, 8, [(1.1, 6.8), (2.5, 7.9), (4.1, 8.5), (5.4, 8.6)], 0.26),
        ]
        hang_reach = {1: (8.5, 1.9), 2: (8.5, 1.8), 3: (8.4, 1.6), 4: (8.3, 1.2), 5: (8.4, 0.75)}
        long_limb = None
    else:
        axis = [
            ((0.0, -1.5, 0.0), 1.2),
            ((0.0, -0.45, 0.0), 1.08),
            ((-0.05, 0.4, 0.02), 0.92),
            ((-0.15, 1.2, 0.08), 0.82),
            ((-0.3, 2.1, 0.15), 0.76),
            ((-0.45, 3.0, 0.25), 0.7),
            ((-0.7, 3.9, 0.4), 0.6),
            ((-1.0, 4.8, 0.6), 0.5),
            ((-1.3, 5.9, 0.8), 0.4),
        ]
        leader = [(-1.5, 7.3, 1.0), (-1.4, 8.7, 1.1), (-1.6, 10.0, 1.2), (-1.5, 11.2, 1.2)]
        centre = Vector((-1.3, 0.0, 0.9))
        scaffolds = [
            (160.0, 6, [(1.5, 5.4), (3.3, 7.3), (5.0, 8.8), (6.3, 9.4)], 0.4),
            (75.0, 7, [(1.4, 6.2), (3.2, 7.9), (5.0, 9.2), (6.5, 9.8)], 0.36),
            (-125.0, 7, [(1.2, 6.2), (2.6, 7.8), (4.0, 9.1), (5.1, 9.6)], 0.32),
            (115.0, 8, [(1.2, 7.1), (2.8, 8.6), (4.6, 9.8), (6.1, 10.3)], 0.28),
            (-160.0, 8, [(1.2, 7.2), (2.6, 8.7), (4.2, 9.9), (5.3, 10.3)], 0.26),
            (10.0, 8, [(1.1, 7.4), (2.3, 9.0), (3.4, 10.2), (4.3, 10.7)], 0.26),
        ]
        hang_reach = {2: (7.2, 3.4), 3: (8.2, 2.4), 4: (8.0, 2.0), 5: (8.3, 1.5)}
        long_limb = 5

    trunk: list[int] = []
    for (p, r) in axis:
        trunk.append(wood.add(Vector(p), r, trunk[-1] if trunk else None))
    top = limb(wood, trunk[-1], [Vector(p) for p in leader], axis[-1][1], 0.07, 0.9)

    # Buttress roots: they leave the flared foot at two heights and sink below the lawn (y = -0.6).
    for i in range(6):
        a = i * 60.0 + rng.uniform(-14, 14) + 20
        reach = rng.uniform(2.6, 3.5)
        limb(
            roots,
            roots.add(Vector((0.0, 0.9 if i % 2 else 0.6, 0.0)), 0.3, None),
            [
                polar(a, 0.75, 0.25),
                polar(a, 1.25, -0.35),
                polar(a + rng.uniform(-8, 8), reach * 0.7, -0.75),
                polar(a + rng.uniform(-12, 12), reach, -1.35),
            ],
            0.42,
            0.1,
            0.6,
        )

    boughs: list[list[int]] = [top]
    for n, (azimuth, at, profile, r0) in enumerate(scaffolds):
        foot = wood.points[trunk[at]]
        sway = 7.0 if n % 2 else -7.0
        pts = [
            foot + polar(azimuth + sway * (1 if k % 2 else -1) * 0.8, r, 0.0) + UP * (y - foot.y)
            for k, (r, y) in enumerate(profile)
        ]
        boughs.append(limb(wood, trunk[at], pts, r0, 0.07, 0.75))

    long_chain: list[int] | None = None
    if long_limb is not None:
        # The long lateral limb of B: low, sinuous, almost level, out to the first book's thread.
        azimuth, hook = card_top(1)
        foot = wood.points[trunk[long_limb]]
        u = polar(azimuth, 1.0, 0.0)
        across = UP.cross(u)
        tip = polar(azimuth, 10.9, hook.y + 0.95)
        pts = [
            foot + u * 1.6 + UP * 1.4,
            foot + u * 3.6 + UP * 2.6 + across * 0.4,
            foot + u * 5.8 + UP * 3.0 - across * 0.35,
            foot + u * 8.0 + UP * 3.1 + across * 0.3,
            foot + u * 9.8 + UP * 2.7,
            tip,
        ]
        long_chain = limb(wood, trunk[long_limb], pts, 0.5, 0.035, 0.8)
        bare.append(tip)

    # Boughs on the scaffolds, then twigs on the boughs; every end carries a foliage mass.
    seconds: list[list[int]] = []
    for chain in boughs:
        is_top = chain is top
        seconds += shoots(
            wood,
            boughs_sk,
            chain,
            rng,
            first=0.3 if is_top else 0.34,
            last=0.97,
            every=0.95,
            length=(2.0, 3.0) if is_top else (2.4, 3.6),
            lift=(0.3, 0.55) if is_top else (0.2, 0.42),
            droop=0.9,
            ratio=0.62,
            step=0.75,
            centre=centre,
        )
        tips.append(wood.points[chain[-1]])
    level = len(seconds)
    if long_chain is not None:
        # Sprays above the long limb only, and none on its last stretch: the limb stays readable.
        seconds += shoots(
            wood,
            boughs_sk,
            long_chain,
            rng,
            first=0.34,
            last=0.8,
            every=1.3,
            length=(2.2, 3.0),
            lift=(0.5, 0.75),
            droop=0.0,
            ratio=0.6,
            step=0.75,
            centre=centre,
        )
    for n, chain in enumerate(seconds):
        tips.append(boughs_sk.points[chain[-1]])
        tips.append(boughs_sk.points[chain[len(chain) * 3 // 5]])
        for twig in shoots(
            boughs_sk,
            twigs,
            chain,
            rng,
            first=0.2,
            last=0.92,
            every=0.5,
            length=(0.9, 1.5),
            lift=(0.15, 0.4),
            droop=0.6 if n < level else 0.0,
            ratio=0.6,
            step=0.6,
            centre=centre,
        ):
            tips.append(twigs.points[twig[-1]])

    # Attach points: a bare, slightly hooked twig reaching towards each card, from the nearest
    # outer bough.
    attach: dict[int, Vector] = {}
    if long_chain is not None:
        attach[1] = wood.points[long_chain[-1]].copy()
    outer = [i for chain in seconds for i in chain[1:] if boughs_sk.radii[i] >= 0.04]
    for index, (reach, above) in hang_reach.items():
        azimuth, hook = card_top(index)
        tip = polar(azimuth, reach, hook.y + above)
        start = min(outer, key=lambda i: (boughs_sk.points[i] - tip).length)
        p0 = boughs_sk.points[start]
        mid = p0.lerp(tip, 0.5) + UP * 0.35
        near = p0.lerp(tip, 0.85) + UP * 0.22
        limb(boughs_sk, start, [mid, near, tip], max(0.05, boughs_sk.radii[start] * 0.8), 0.03, 0.7)
        attach[index] = tip
        bare.append(tip)

    # Foliage only where no attach twig ends: the last stretch of a hanger stays bare.
    tips = [t for t in tips if all((t - b).length > 1.0 for b in bare)]
    crown_top = max(t.y for t in tips)
    masses = []
    for t in tips:
        a = rng.uniform(0.8, 1.3)
        masses.append(
            {
                "at": t + UP * 0.22 * a,
                "size": (a, a * rng.uniform(0.42, 0.55), a * rng.uniform(0.85, 1.1)),
                "turn": rng.uniform(0, math.tau),
                "bloom": t.y > crown_top - 2.6 and rng.random() < 0.5,
                # Whole sprays in flower, mostly on the rim: the visitor looks up at the crown,
                # so flowers that only cap it would stay out of sight.
                "red": rng.random() < 0.3,
            }
        )
    return {
        "wood": wood,
        "boughs": boughs_sk,
        "twigs": twigs,
        "roots": roots,
        "masses": masses,
        "attach": attach,
    }


def skinned(name: str, sk: Skeleton, levels: int, material: bpy.types.Material) -> bpy.types.Object:
    """A skeleton as an editable object: vertices and edges under Skin and Subdivision modifiers."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([to_blender(p) for p in sk.points], sk.edges, [])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    skin = obj.modifiers.new("Skin", "SKIN")
    skin.use_smooth_shade = True
    skin.use_x_symmetry = skin.use_y_symmetry = skin.use_z_symmetry = False
    has_parent = {b for (_, b) in sk.edges}
    for i, vertex in enumerate(mesh.skin_vertices[0].data):
        vertex.radius = (sk.radii[i], sk.radii[i])
        vertex.use_root = i not in has_parent
    if levels:
        sub = obj.modifiers.new("Subdivision", "SUBSURF")
        sub.levels = sub.render_levels = levels
    mesh.materials.append(material)
    return obj


def lumps(name: str, masses: list[dict], material: bpy.types.Material, seed: int) -> bpy.types.Object:
    """Provisional foliage: one low, lumpy ellipsoid per mass, in a single mesh."""
    rng = random.Random(seed)
    bm = bmesh.new()
    for m in masses:
        made = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        sx, sy, sz = m["size"]
        shape = (
            Matrix.Translation(to_blender(m["at"]))
            @ Matrix.Rotation(m["turn"], 4, "Z")
            @ Matrix.Diagonal((sx, sz, sy, 1.0))
        )
        for v in made["verts"]:
            v.co *= 1.0 + rng.uniform(-0.16, 0.16)
            # Flatter underneath, like a spray seen from below.
            if v.co.z < 0:
                v.co.z *= 0.55
            v.co = shape @ v.co
    for face in bm.faces:
        face.smooth = True
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def matte(name: str, colour: tuple[float, float, float]) -> bpy.types.Material:
    """A plain matte material (sRGB colour given as 0-1 floats, converted to linear)."""
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in colour]
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*linear, 1.0)
    shader.inputs["Roughness"].default_value = 1.0
    shader.inputs["Metallic"].default_value = 0.0
    material.diffuse_color = (*linear, 1.0)
    return material


def render_views(folder: Path, variant: str) -> None:
    """Workbench stills: the opening side, the profile and the plan, same scale for A and B."""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 900
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("sky")
    scene.world.color = (0.9, 0.72, 0.7)
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_cavity = True
    camera = bpy.data.objects.new("view", bpy.data.cameras.new("view"))
    scene.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 26.0
    scene.camera = camera
    views = {
        # Blender frame: the opening camera stands on +y (scene -z).
        "front": ((0, 40, 5.4), (math.radians(90), 0, math.radians(180))),
        "profile": ((40, 0, 5.4), (math.radians(90), 0, math.radians(90))),
        "back": ((0, -40, 5.4), (math.radians(90), 0, 0)),
        "plan": ((0, 0, 50), (0, 0, math.radians(180))),
    }
    for name, (location, rotation) in views.items():
        camera.location = location
        camera.rotation_euler = rotation
        scene.render.filepath = str(folder / f"blender-{variant}-{name}.png")
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera)


def main() -> None:
    """Builds one variant, saves the .blend, exports the GLB and optionally renders stills."""
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    variant = args[0] if args else "a"
    renders = Path(args[args.index("--renders") + 1]) if "--renders" in args else None

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    built = build_variant(variant)
    root = bpy.data.objects.new(f"flamboyant-{variant}", None)
    root.empty_display_size = 0.5
    bpy.context.scene.collection.objects.link(root)

    wood = matte("wood", (0.60, 0.42, 0.28))
    parts = [
        skinned("wood", built["wood"], 2, wood),
        skinned("roots", built["roots"], 2, wood),
        skinned("boughs", built["boughs"], 1, wood),
        skinned("twigs", built["twigs"], 0, wood),
        lumps(
            "foliage",
            [m for m in built["masses"] if not m["red"]],
            matte("foliage", (0.27, 0.53, 0.21)),
            1,
        ),
        lumps(
            "bloom",
            [
                {
                    **m,
                    "at": m["at"] + UP * m["size"][1] * 0.55,
                    "size": tuple(s * 0.72 for s in m["size"]),
                }
                for m in built["masses"]
                if m["bloom"] and not m["red"]
            ]
            + [m for m in built["masses"] if m["red"]],
            matte("bloom", (0.9, 0.3, 0.13)),
            2,
        ),
    ]
    for index, at in sorted(built["attach"].items()):
        empty = bpy.data.objects.new(f"attach-{index}", None)
        empty.empty_display_type = "SPHERE"
        empty.empty_display_size = 0.15
        empty.location = to_blender(at)
        bpy.context.scene.collection.objects.link(empty)
        parts.append(empty)
    for part in parts:
        part.parent = root

    out = ROOT / "art" / "flamboyant"
    bpy.ops.wm.save_as_mainfile(filepath=str(out / f"flamboyant-{variant}.blend"), compress=True)
    glb = ROOT / "src" / "tree" / "assets" / f"flamboyant-{variant}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )

    depsgraph = bpy.context.evaluated_depsgraph_get()
    report = {}
    for part in parts:
        if part.type != "MESH":
            continue
        mesh = part.evaluated_get(depsgraph).to_mesh()
        mesh.calc_loop_triangles()
        report[part.name] = len(mesh.loop_triangles)
    print("FLAMBOYANT", variant, "triangles", report, "glb bytes", glb.stat().st_size)
    print("FLAMBOYANT", variant, "attach", {k: tuple(round(c, 2) for c in v) for k, v in built["attach"].items()})
    if renders:
        renders.mkdir(parents=True, exist_ok=True)
        render_views(renders, variant)


main()
