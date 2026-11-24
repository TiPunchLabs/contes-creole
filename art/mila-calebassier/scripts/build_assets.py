"""Builds the 3D assets of « Mila et le calebassier magique » and exports them as GLB.

Usage (from the repository root):
    blender -b --factory-startup --python-exit-code 1 \
        -P art/mila-calebassier/scripts/build_assets.py -- [--blend] [--only tree,set,props]

Reads the master layout `src/books/mila-calebassier/world/layout.json`, writes
`src/books/mila-calebassier/assets/glb/{tree,set,props}.glb` and, with `--blend`,
`art/mila-calebassier/blend/mila_calebassier.blend`. Everything is seeded: same input, same files.

The GLB files carry geometry, UVs, vertex colours, material names, armatures, clips and sockets.
Their materials are placeholders: the web engine paints every surface by material name.
"""

from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

sys.path.insert(0, str(Path(__file__).parent))
from meshkit import Mesh, to_blender, yaw_point  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
BOOK = ROOT / "src/books/mila-calebassier"
LAYOUT = json.loads((BOOK / "world/layout.json").read_text())
OUT = BOOK / "assets/glb"
MASTER = ROOT / "art/mila-calebassier/textures/master"
FPS = 24

WHITE = (1.0, 1.0, 1.0, 1.0)

# Material name -> (preview colour, master texture or None). The engine keeps its own table.
MATERIALS = {
    "bark": ("#b9a48c", "bark"),
    "leaves": ("#8fae58", "leaves"),
    "gourd": ("#a9bf62", "gourd"),
    "wall_mila": ("#f3e2b8", "wall"),
    "wall_ninon": ("#f0cdbd", "wall"),
    "wall_in": ("#efe3cf", "wall"),
    "trim": ("#f7f1e6", "wall"),
    "roof": ("#c0766a", "roof"),
    "slab": ("#d9cdbb", "wall"),
    "floor": ("#cdb69c", "earth"),
    "louver": ("#e9efe9", None),
    "door": ("#5f8f86", None),
    "wood": ("#9a6f4d", "bark"),
    "metal": ("#3f6b5c", None),
    "ground": ("#b9c184", "ground"),
    "stone": ("#d8cdbd", "earth"),
    "hedge": ("#7f9a5c", "hedge"),
    "cloth": ("#efe6da", "cloth"),
    "bedding": ("#e9b9a6", "cloth"),
    "pillow": ("#f4eee4", "cloth"),
    "ceramic": ("#f1ede4", None),
    "bread": ("#d9a868", None),
    "lamp_metal": ("#6c7a80", None),
    "lamp_glass": ("#ffd99a", None),
    "rooster": ("#8a4b2c", None),
    "rooster_tail": ("#2f4a4a", None),
    "rooster_red": ("#c8483e", None),
    "rooster_beak": ("#e0b45c", None),
}


def hex_rgba(value: str) -> tuple[float, float, float, float]:
    """'#rrggbb' to linear-ish RGBA floats for Blender's preview materials."""
    value = value.lstrip("#")
    return tuple(((int(value[i : i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)) + (1.0,)


def make_materials() -> dict[str, bpy.types.Material]:
    """One named Principled material per surface, textured with the painted master when there is one."""
    out = {}
    for name, (colour, tex) in MATERIALS.items():
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = hex_rgba(colour)
        bsdf.inputs["Roughness"].default_value = 1.0
        path = MASTER / f"src_{tex}.png" if tex else None
        if path and path.exists():
            node = mat.node_tree.nodes.new("ShaderNodeTexImage")
            node.image = bpy.data.images.load(str(path), check_existing=True)
            mix = mat.node_tree.nodes.new("ShaderNodeMixRGB")
            mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = 1.0
            mix.inputs[2].default_value = hex_rgba(colour)
            mat.node_tree.links.new(node.outputs["Color"], mix.inputs[1])
            mat.node_tree.links.new(mix.outputs[0], bsdf.inputs["Base Color"])
            if tex in ("leaves", "hedge"):
                mat.node_tree.links.new(node.outputs["Alpha"], bsdf.inputs["Alpha"])
        out[name] = mat
    return out


def collection(name: str) -> bpy.types.Collection:
    """Creates a scene collection."""
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def empty(name: str, at, parent=None, col=None) -> bpy.types.Object:
    """Adds a named empty (a socket) at a web-engine point."""
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_size = 0.1
    obj.location = to_blender(at)
    (col or bpy.context.scene.collection).objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


# ============================================================================================ tree


def limb_path(rng, start: Vector, heading: float, rise: float, length: float, steps: int, droop: float) -> list[Vector]:
    """An irregular branch: it leaves at `rise` radians above the horizon, levels out and droops."""
    pts = [start.copy()]
    seg = length / steps
    for i in range(steps):
        t = (i + 1) / steps
        elev = rise * (1 - t) ** 1.3 - droop * t * t + rng.gauss(0, 0.07)
        heading += rng.gauss(0, 0.16)
        d = Vector((math.cos(elev) * math.sin(heading), math.sin(elev), math.cos(elev) * math.cos(heading)))
        pts.append(pts[-1] + d * seg)
    return pts


def taper(n: int, r0: float, r1: float) -> list[float]:
    """Radii thinning from `r0` to `r1` over `n` points."""
    return [r0 + (r1 - r0) * (i / (n - 1)) ** 0.8 for i in range(n)]


def leaf_card(mesh: Mesh, rng, at: Vector, along: Vector, size: float, bones: dict[str, float] | None = None) -> None:
    """A painted foliage card growing from `at`, roughly along `along`; colour R = sway, G = phase."""
    up = (along + Vector((rng.gauss(0, 0.5), rng.uniform(0.1, 0.9), rng.gauss(0, 0.5)))).normalized()
    side = up.cross(Vector((rng.gauss(0, 1), rng.gauss(0, 0.3), rng.gauss(0, 1)))).normalized()
    half = side * size * 0.5
    top = up * size
    tile = rng.randrange(4)
    u0, v0 = (tile % 2) * 0.5, 0.5 - (tile // 2) * 0.5
    phase = rng.random()
    base, tip = (0.0, phase, 0.0, 1.0), (1.0, phase, 0.0, 1.0)
    ids = mesh.quad(
        (at - half, at + half, at + half + top, at - half + top),
        "leaves",
        ((u0, v0), (u0 + 0.5, v0), (u0 + 0.5, v0 + 0.5), (u0, v0 + 0.5)),
        (base, base, tip, tip),
    )
    if bones:
        mesh.skin(ids, bones)


def gourd_profile(radius: float, stem: float) -> list[tuple[float, float]]:
    """Profile of a smooth round calabash hanging from the origin by a short stalk."""
    pts = [(0.0, 0.0), (0.006, 0.0), (0.005, -stem * 0.7), (0.016, -stem * 0.98)]
    for i in range(1, 15):
        a = i / 14 * math.pi
        pts.append((math.sin(a) * radius, -stem - radius * 0.94 * (1 - math.cos(a))))
    pts[-1] = (0.0, pts[-1][1])
    return pts


def add_gourd(mesh: Mesh, at: Vector, radius: float, col=WHITE, sides: int = 18) -> None:
    """One calabash hanging from `at` (its stalk's top)."""
    mesh.lathe(at, gourd_profile(radius, 0.035), "gourd", sides, col, tile=(1.0, 1.0))


def branch_weights(t: float, bones: int) -> dict[str, float]:
    """Skin weights at parameter `t` (0 root, 1 tip) of a branch with `bones` equal bones."""
    f = min(t * bones, bones - 1e-4)
    i = int(f)
    u = f - i
    # Each vertex follows its bone, blended with the previous one near the joint.
    k = max(0.0, 0.5 - u) / 0.5 * 0.5 if i > 0 else 0.0
    out = {f"b{i}": 1 - k}
    if k > 0:
        out[f"b{i - 1}"] = k
    return out


def bend_tip(pts: list[Vector], bones: int, axis: Vector, angles: list[float]) -> list[Vector]:
    """Joint positions of a branch after each bone turned by its angle about `axis` (world)."""
    joints = [pts[0].copy()]
    total = Matrix.Identity(3)
    for i in range(bones):
        total = Matrix.Rotation(angles[i], 3, axis) @ total
        a = pts[i * (len(pts) - 1) // bones]
        b = pts[(i + 1) * (len(pts) - 1) // bones]
        joints.append(joints[-1] + total @ (b - a))
    return joints


def active_branch(name: str, spec: dict, rng, col, mats, hang: float):
    """A low branch that bends down to offer a calabash: skinned mesh, armature, clip, socket."""
    root, tip, give = Vector(spec["root"]), Vector(spec["tip"]), Vector(spec["give"])
    bones, steps = 5, 20
    span = tip - root
    side = span.cross(Vector((0, 1, 0))).normalized()
    pts = []
    for i in range(steps + 1):
        t = i / steps
        arch = math.sin(t * math.pi) * 0.28
        wob = math.sin(t * 7.0 + rng.random()) * 0.06 * t
        pts.append(root + span * t + Vector((0, arch, 0)) + side * wob)
    mesh = Mesh(f"branch_{name}")
    rings = mesh.tube(pts, taper(steps + 1, 0.105, 0.026), "bark", 9, tile=0.9)
    for i, ring in enumerate(rings):
        mesh.skin(ring, branch_weights(min(i, steps) / steps, bones))
    # Twigs and foliage ride the branch; the far half carries most of the leaves.
    for i in range(5, steps - 3, 2):
        t = i / steps
        w = branch_weights(t, bones)
        along = (pts[min(i + 1, steps)] - pts[i - 1]).normalized()
        for _ in range(2 if t > 0.5 else 1):
            leaf_card(mesh, rng, pts[i] + Vector((0, 0.02, 0)), along, rng.uniform(0.75, 1.1), w)
    obj = mesh.build(col, mats)

    arm_data = bpy.data.armatures.new(f"rig_{name}")
    arm = bpy.data.objects.new(f"rig_{name}", arm_data)
    col.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    parent = None
    for i in range(bones):
        bone = arm_data.edit_bones.new(f"b{i}")
        bone.head = to_blender(pts[i * steps // bones])
        bone.tail = to_blender(pts[(i + 1) * steps // bones])
        bone.parent = parent
        bone.use_connect = parent is not None
        parent = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.parent = arm
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm

    # The bend: every bone turns about the same horizontal axis; the angle that brings the
    # hanging fruit's centre to the `give` height is found by bisection.
    axis = side if (Matrix.Rotation(0.3, 3, side) @ span).y < span.y else -side
    share = [0.12, 0.22, 0.26, 0.24, 0.16]
    lo, hi = 0.0, 2.2
    for _ in range(40):
        mid = (lo + hi) / 2
        y = bend_tip(pts, bones, axis, [mid * s for s in share])[-1].y - hang
        lo, hi = (mid, hi) if y > give.y else (lo, mid)
    full = (lo + hi) / 2
    rest_tip = pts[-1]
    bent_tip = bend_tip(pts, bones, axis, [full * s for s in share])[-1]

    socket = bpy.data.objects.new(f"socket_{name}", None)
    socket.empty_display_size = 0.08
    col.objects.link(socket)
    socket.parent = arm
    socket.parent_type = "BONE"
    socket.parent_bone = f"b{bones - 1}"
    bpy.context.view_layer.update()
    socket.matrix_world = Matrix.Translation(to_blender(rest_tip))

    arm.animation_data_create()
    action = bpy.data.actions.new(f"{name}_offer")
    arm.animation_data.action = action
    axis_b = Vector(to_blender(axis))
    frames = 2 * FPS
    for frame in range(0, frames + 1, 3):
        t = frame / frames
        ease = t * t * (3 - 2 * t)
        for i in range(bones):
            pb = arm.pose.bones[f"b{i}"]
            pb.rotation_mode = "QUATERNION"
            local_axis = pb.bone.matrix_local.to_3x3().inverted() @ axis_b
            # The far bones lag a little: the branch unrolls instead of turning like a lever.
            lag = max(0.0, min(1.0, ease * 1.25 - i * 0.06))
            pb.rotation_quaternion = Quaternion(local_axis, full * share[i] * lag)
            pb.keyframe_insert("rotation_quaternion", frame=frame + 1)
    track = arm.animation_data.nla_tracks.new()
    track.name = f"{name}_offer"
    track.strips.new(f"{name}_offer", 1, action)
    arm.animation_data.action = None
    return {"rest": list(rest_tip), "bent": list(bent_tip), "angle": full}


def build_tree(mats) -> dict:
    """The old calabash tree: trunk, irregular limbs, foliage cards, fruits in the branches only."""
    rng = random.Random(7)
    col = collection("tree")
    spec = LAYOUT["tree"]
    at = Vector(spec["at"])
    mesh = Mesh("tree_static")
    h = spec["trunkHeight"]
    trunk = [at + Vector((math.sin(t * 2.2) * 0.12 * t, t * h, math.cos(t * 1.7) * 0.1 * t)) for t in [i / 8 for i in range(9)]]
    radii = [0.66, 0.5, 0.43, 0.4, 0.38, 0.37, 0.37, 0.39, 0.42]
    mesh.tube([trunk[0] - Vector((0, 0.25, 0)), *trunk], [0.72, *radii], "bark", 14, tile=1.1, cap=True)
    fork = trunk[-1]
    info: dict = {"gourds": [], "limbs": 0}
    hang_points: list[Vector] = []
    headings = [0.5, 1.5, 2.45, 3.3, 4.2, 5.2, 5.9, 0.1]
    for n, heading in enumerate(headings):
        length = rng.uniform(3.6, 5.0) if n < 7 else 3.2
        rise = rng.uniform(0.55, 0.95) if n < 7 else 1.35
        start = fork + Vector((math.sin(heading) * 0.2, rng.uniform(-0.45, 0.1), math.cos(heading) * 0.2))
        pts = limb_path(rng, start, heading, rise, length, 9, rng.uniform(0.1, 0.35))
        mesh.tube(pts, taper(10, 0.17, 0.04), "bark", 9, tile=0.9)
        info["limbs"] += 1
        for i in range(3, 10):
            along = (pts[i] - pts[i - 1]).normalized()
            for _ in range(2):
                leaf_card(mesh, rng, pts[i], along, rng.uniform(0.9, 1.4))
            if i in (4, 6, 8):
                sub_heading = heading + rng.choice([-1, 1]) * rng.uniform(0.6, 1.1)
                sub = limb_path(rng, pts[i], sub_heading, rng.uniform(0.2, 0.7), rng.uniform(1.3, 2.3), 5, 0.3)
                mesh.tube(sub, taper(6, 0.07, 0.02), "bark", 6, tile=0.9)
                for j in range(1, 6):
                    leaf_card(mesh, rng, sub[j], (sub[j] - sub[j - 1]).normalized(), rng.uniform(0.8, 1.25))
                hang_points.append(sub[rng.choice([3, 4])])
            if i in (5, 7):
                hang_points.append(pts[i])
    # Crown fill: cards above the limbs so the canopy closes against the sky.
    for _ in range(46):
        a = rng.uniform(0, math.tau)
        r = math.sqrt(rng.random()) * spec["crownRadius"] * 0.8
        p = at + Vector((math.sin(a) * r, spec["top"] - 1.9 + rng.uniform(-0.6, 0.5) - r * 0.28, math.cos(a) * r))
        leaf_card(mesh, rng, p, Vector((math.sin(a), 0.4, math.cos(a))), rng.uniform(1.1, 1.6))
    # Surface roots; one long root crosses the path where Mila stumbles (page 9).
    cross = Vector(LAYOUT["roots"])
    for n in range(7):
        a = n / 7 * math.tau + 0.4
        end = at + Vector((math.sin(a), 0, math.cos(a))) * rng.uniform(1.6, 2.8)
        pts = [at + Vector((math.sin(a) * 0.45, 0.22, math.cos(a) * 0.45))]
        for i in range(1, 7):
            t = i / 6
            p = pts[0].lerp(end, t)
            p.y = 0.2 * (1 - t) ** 2 + 0.035
            p += Vector((math.cos(a), 0, -math.sin(a))) * math.sin(t * 5 + n) * 0.14
            pts.append(p)
        mesh.tube(pts, taper(7, 0.17, 0.035), "bark", 7, tile=0.9, squash=0.75)
    start = at + Vector((0.3, 0.2, 0.5))
    pts = []
    for i in range(13):
        t = i / 12
        p = start.lerp(cross + (cross - start).normalized() * 1.1, t)
        p.y = 0.16 * (1 - t) ** 2 + 0.05 + (0.05 * math.sin(t * 9) if 0.55 < t < 0.95 else 0)
        p += Vector((1, 0, -0.3)).normalized() * math.sin(t * 6.5) * 0.2
        pts.append(p)
    mesh.tube(pts, taper(13, 0.16, 0.05), "bark", 7, tile=0.9, squash=0.8)
    info["root_cross"] = [list(p) for p in pts[7:12]]
    mesh.build(col, mats)

    # Fruits hang in the branches and the canopy, never on the trunk; colour R = light group.
    gourds = Mesh("gourds")
    hero_r = 0.105
    rng.shuffle(hang_points)
    chosen: list[Vector] = []
    for p in hang_points:
        flat = Vector((p.x - at.x, 0, p.z - at.z)).length
        if flat < 1.3 or p.y < 2.5 or any((p - q).length < 1.1 for q in chosen):
            continue
        for b in ("branchA", "branchB"):
            if (p - Vector(spec[b]["tip"])).length < 1.0:
                break
        else:
            chosen.append(p)
        if len(chosen) == 13:
            break
    for n, p in enumerate(chosen):
        group = n % 4
        add_gourd(gourds, p - Vector((0, 0.05, 0)), hero_r * rng.uniform(0.82, 1.08), (group / 3, rng.random(), 0.0, 1.0), 14)
        info["gourds"].append([round(c, 3) for c in p])
    gourds.build(col, mats)

    hang = 0.035 + hero_r * 0.94
    info["A"] = active_branch("A", spec["branchA"], rng, col, mats, hang)
    info["B"] = active_branch("B", spec["branchB"], rng, col, mats, hang)
    return info


# ================================================================================== architecture


def wall(mesh: Mesh, a, b, y0: float, y1: float, thick: float, mat_out: str, mat_in: str, openings=(), scale: float = 2.0) -> None:
    """A thick wall from `a` to `b` (x, z in the local frame); its outside is on the right of a→b.

    `openings` are (start, width, sill, height) along the wall: both faces and the reveals are cut."""
    ax, az = a
    bx, bz = b
    length = math.hypot(bx - ax, bz - az)
    dx, dz = (bx - ax) / length, (bz - az) / length
    nx, nz = -dz, dx  # left of a→b is inside: outside normal is the opposite
    xs = sorted({0.0, length, *[o[0] for o in openings], *[o[0] + o[1] for o in openings]})
    ys = sorted({y0, y1, *[y0 + o[2] for o in openings], *[y0 + o[2] + o[3] for o in openings]})

    def hole(u0, u1, v0, v1) -> bool:
        return any(o[0] - 1e-6 <= u0 and u1 <= o[0] + o[1] + 1e-6 and y0 + o[2] - 1e-6 <= v0 and v1 <= y0 + o[2] + o[3] + 1e-6 for o in openings)

    def pt(u, v, inside):
        off = thick if inside else 0.0
        return (ax + dx * u + nx * off, v, az + dz * u + nz * off)

    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            u0, u1, v0, v1 = xs[i], xs[i + 1], ys[j], ys[j + 1]
            if hole(u0, u1, v0, v1):
                continue
            uv = ((u0 / scale, v0 / scale), (u1 / scale, v0 / scale), (u1 / scale, v1 / scale), (u0 / scale, v1 / scale))
            mesh.quad((pt(u1, v0, False), pt(u0, v0, False), pt(u0, v1, False), pt(u1, v1, False)), mat_out, uv[::-1][2:] + uv[::-1][:2])
            mesh.quad((pt(u0, v0, True), pt(u1, v0, True), pt(u1, v1, True), pt(u0, v1, True)), mat_in, uv)
    for o in openings:
        u0, u1, v0, v1 = o[0], o[0] + o[1], y0 + o[2], y0 + o[2] + o[3]
        mesh.quad((pt(u0, v0, False), pt(u0, v0, True), pt(u0, v1, True), pt(u0, v1, False)), "trim")
        mesh.quad((pt(u1, v0, True), pt(u1, v0, False), pt(u1, v1, False), pt(u1, v1, True)), "trim")
        mesh.quad((pt(u0, v1, False), pt(u0, v1, True), pt(u1, v1, True), pt(u1, v1, False)), "trim")
        if o[2] > 0:
            mesh.quad((pt(u0, v0, True), pt(u0, v0, False), pt(u1, v0, False), pt(u1, v0, True)), "trim")
    # Wall top and ends, so nothing is see-through from above.
    mesh.quad((pt(0, y1, False), pt(0, y1, True), pt(length, y1, True), pt(length, y1, False)), "trim")


def louvers(mesh: Mesh, centre, width: float, height: float, facing: str = "z") -> None:
    """A jalousie panel centred at `centre`: frame and tilted slats (ventilated opening)."""
    cx, cy, cz = centre
    n = max(4, int(height / 0.11))
    span = (width, 0.03) if facing == "z" else (0.03, width)
    mesh.box((cx, cy + height / 2 - 0.02, cz), (span[0], 0.04, span[1] + 0.02), "trim")
    mesh.box((cx, cy - height / 2 + 0.02, cz), (span[0], 0.04, span[1] + 0.02), "trim")
    for s in (-1, 1):
        if facing == "z":
            mesh.box((cx + s * (width / 2 - 0.02), cy, cz), (0.04, height, 0.05), "trim")
        else:
            mesh.box((cx, cy, cz + s * (width / 2 - 0.02)), (0.05, height, 0.04), "trim")
    for i in range(n):
        y = cy - height / 2 + (i + 0.5) * height / n
        lo, hi = y - 0.035, y + 0.035
        if facing == "z":
            x0, x1 = cx - width / 2 + 0.04, cx + width / 2 - 0.04
            mesh.quad(((x0, lo, cz + 0.02), (x1, lo, cz + 0.02), (x1, hi, cz - 0.02), (x0, hi, cz - 0.02)), "louver", double=True)
        else:
            z0, z1 = cz - width / 2 + 0.04, cz + width / 2 - 0.04
            mesh.quad(((cx + 0.02, lo, z1), (cx + 0.02, lo, z0), (cx - 0.02, hi, z0), (cx - 0.02, hi, z1)), "louver", double=True)


def house(name: str, spec: dict, wall_mat: str, col, mats, bedroom: bool) -> dict:
    """A contemporary rendered-masonry house: raised slab, covered terrace on posts, metal roof with
    wide eaves, jalousie openings. Local frame: x along the façade, +z out of the façade."""
    w, h, d = spec["size"]
    td, fl = spec["terraceDepth"], spec["floor"]
    origin, yaw = spec["at"], spec["yaw"]
    mesh = Mesh(name).place(origin, yaw)
    t = 0.18
    hw, hd = w / 2, d / 2
    top = fl + h
    # Slab under the house and the terrace, with two steps down to the garden.
    mesh.box((0, fl / 2, td / 2), (w + 0.3, fl, d + td + 0.3), "slab", scale=2)
    mesh.box((1.2, fl / 4, hd + td + 0.45), (1.8, fl / 2, 0.5), "slab", scale=2)
    # Openings of the façade: bedroom window (left), door, living-room window (right).
    win_x, win_w, win_sill, win_h = -hw + 1.25, 1.3, 0.95, 1.15
    door_x, door_w = 0.7, 1.0
    facade = [(win_x - win_w / 2 + hw, win_w, win_sill, win_h), (door_x - door_w / 2 + hw, door_w, 0.0, 2.1), (hw + 2.35 - 0.6, 1.2, 0.95, 1.15)]
    wall(mesh, (hw, hd), (-hw, hd), fl, top, t, wall_mat, "wall_in", [(w - o[0] - o[1], o[1], o[2], o[3]) for o in facade])
    wall(mesh, (-hw, hd), (-hw, -hd), fl, top, t, wall_mat, "wall_in", [(d * 0.5 - 0.5, 1.0, 1.0, 1.0)])
    wall(mesh, (-hw, -hd), (hw, -hd), fl, top, t, wall_mat, "wall_in")
    wall(mesh, (hw, -hd), (hw, hd), fl, top, t, wall_mat, "wall_in", [(d * 0.5 - 0.5, 1.0, 1.0, 1.0)])
    louvers(mesh, (hw - 0.09, fl + 1.5, 0), 1.0, 1.0, "x")
    louvers(mesh, (-hw + 0.09, fl + 1.5, 0), 1.0, 1.0, "x")
    louvers(mesh, (2.35, fl + 0.95 + 0.575, hd - 0.09), 1.2, 1.15, "z")
    mesh.box((door_x, fl + 1.05, hd - 0.1), (door_w, 2.1, 0.05), "door")
    # Roof: two slopes with eaves; the front slope runs on over the terrace, carried by posts.
    eave, ridge = 0.55, top + 1.15
    front, back = hd + td + 0.35, -hd - eave
    x0, x1 = -hw - eave, hw + eave
    y_front = top - 0.12
    y_back = top - 0.05
    for sign, z_edge, y_edge in ((1, front, y_front), (-1, back, y_back)):
        a, b = (x0, y_edge, z_edge), (x1, y_edge, z_edge)
        c, e = (x1, ridge, 0.0), (x0, ridge, 0.0)
        pts = (a, b, c, e) if sign > 0 else (b, a, e, c)
        slope = math.hypot(z_edge, ridge - y_edge)
        mesh.quad(pts, "roof", ((0, 0), ((x1 - x0) / 2.4, 0), ((x1 - x0) / 2.4, slope / 2.4), (0, slope / 2.4)))
        under = tuple((p[0], p[1] - 0.07, p[2]) for p in pts[::-1])
        mesh.quad(under, "trim")
        mesh.quad((under[0], under[3], pts[0], pts[1])[::-1] if sign > 0 else (pts[1], pts[0], under[3], under[0]), "trim")
    for sx in (-1, 1):
        x = sx * hw
        tri = [(x, top, hd), (x, top, -hd), (x, ridge - 0.07, 0.0)]
        ids = [mesh.vert(p) for p in (tri if sx > 0 else tri[::-1])]
        mesh.face(ids, wall_mat, ((0, 0), (d / 2, 0), (d / 4, 0.6)))
    for i in range(4):
        x = -hw + 0.15 + i * (w - 0.3) / 3
        mesh.box((x, fl + (y_front - 0.1 - fl) / 2, hd + td - 0.05), (0.2, y_front - 0.1 - fl, 0.2), "trim", scale=2)
    mesh.box((0, y_front - 0.16, hd + td - 0.05), (w + 0.2, 0.14, 0.22), "trim", scale=2)
    info = {"window": [win_x, fl + win_sill + win_h / 2, hd], "floor": fl}
    if not bedroom:
        louvers(mesh, (win_x, fl + win_sill + win_h / 2, hd - 0.09), win_w, win_h, "z")
        mesh.build(col, mats)
        return info

    # Mila's bedroom behind the left window: partition, ceiling, floor finish, bed, bedside table.
    part_x = -hw + 3.5
    wall(mesh, (part_x, hd - t), (part_x, -hd + t), fl, top, 0.1, "wall_in", "wall_in")
    mesh.quad(((-hw + t, top - 0.02, hd - t), (part_x, top - 0.02, hd - t), (part_x, top - 0.02, -hd + t), (-hw + t, top - 0.02, -hd + t))[::-1], "wall_in", scale=2)
    mesh.quad(((-hw + t, fl + 0.005, hd - t), (part_x, fl + 0.005, hd - t), (part_x, fl + 0.005, -hd + t), (-hw + t, fl + 0.005, -hd + t)), "floor", scale=1.5)
    bed = (-hw + t + 1.0, 0.0, hd - 2.55)
    mesh.box((bed[0], fl + 0.2, bed[2]), (1.9, 0.24, 0.95), "wood")
    mesh.box((bed[0], fl + 0.4, bed[2]), (1.92, 0.2, 0.98), "bedding", scale=0.8)
    mesh.box((bed[0] - 0.68, fl + 0.55, bed[2]), (0.45, 0.12, 0.7), "pillow", scale=0.8)
    mesh.box((-hw + t + 0.03, fl + 0.55, bed[2]), (0.05, 0.9, 1.0), "wood")
    table = (-hw + t + 0.38, fl + 0.56, hd - 1.55)
    mesh.box((table[0], table[1] - 0.02, table[2]), (0.5, 0.04, 0.5), "wood")
    mesh.box((table[0], fl + (table[1] - fl) / 2 - 0.02, table[2]), (0.4, table[1] - fl - 0.04, 0.4), "wood")
    mesh.build(col, mats)
    # The two shutters of her window are separate objects hinged on the reveals, opening outwards.
    for side in (-1, 1):
        hinge_local = (win_x + side * win_w / 2, fl + win_sill + win_h / 2, hd - 0.03)
        sh = Mesh(f"shutter_{'L' if side < 0 else 'R'}")
        half = win_w / 2
        louvers(sh, (-side * half / 2, 0, 0), half - 0.01, win_h - 0.02, "z")
        obj = sh.build(col, mats)
        obj.location = to_blender(yaw_point(hinge_local, yaw, origin))
        obj.rotation_euler = (0, 0, math.radians(yaw))
    info.update(
        {
            "table": list(yaw_point((table[0], table[1], table[2]), yaw, origin)),
            "bed": list(yaw_point((bed[0], fl + 0.5, bed[2]), yaw, origin)),
            "room": [-hw + t, part_x, -hd + t, hd - t],
            "terrace": list(yaw_point((1.2, fl, hd + td / 2), yaw, origin)),
        }
    )
    return info


def build_set(mats) -> dict:
    """Ground, path, houses, gate, fences and hedges, terrace table, perch."""
    rng = random.Random(11)
    col = collection("set")
    info: dict = {}
    path = [Vector((p[0], 0, p[1])) for p in LAYOUT["path"]]

    def path_dist(x: float, z: float) -> float:
        best = 1e9
        for a, b in zip(path, path[1:]):
            ab = b - a
            t = max(0.0, min(1.0, ((x - a.x) * ab.x + (z - a.z) * ab.z) / ab.length_squared))
            best = min(best, math.hypot(x - a.x - ab.x * t, z - a.z - ab.z * t))
        return best

    tree = Vector(LAYOUT["tree"]["at"])
    lane_x = LAYOUT["gate"]["at"][0] + 1.6
    ground = Mesh("ground")
    x0, x1, z0, z1, step = -34, 38, -30, 22, 1.0
    nx, nz = int((x1 - x0) / step), int((z1 - z0) / step)

    def ground_y(x: float, z: float) -> float:
        far = max(0.0, math.hypot(x - 1, z + 1) - 14)
        return 0.012 * far * far * (0.5 + 0.5 * math.sin(x * 0.21 + z * 0.13)) - 0.004 * far

    grid = {}
    for i in range(nx + 1):
        for j in range(nz + 1):
            x, z = x0 + i * step, z0 + j * step
            earth = max(0.0, min(1.0, 1.6 - path_dist(x, z) / 0.75))
            earth = max(earth, max(0.0, min(1.0, 1.4 - abs(x - lane_x) / 1.5)) if x > LAYOUT["gate"]["at"][0] else 0.0)
            shade = max(0.0, 1 - math.hypot(x - tree.x, z - tree.z) / 5.5) * 0.55
            grid[i, j] = (ground.vert((x, ground_y(x, z), z)), (earth, shade, 0.0, 1.0), (x / 7.0, z / 7.0))
    for i in range(nx):
        for j in range(nz):
            corners = [grid[i, j + 1], grid[i + 1, j + 1], grid[i + 1, j], grid[i, j]]
            ground.face([c[0] for c in corners], "ground", [c[2] for c in corners], True, [c[1] for c in corners])
    ground.build(col, mats)

    props = Mesh("garden")
    # Stepping stones of the path: the ones the night hides (page 1) and the calabash reveals (page 4).
    stones = []
    travelled = 0.0
    for a, b in zip(path, path[1:]):
        seg = (b - a).length
        while travelled < seg:
            p = a.lerp(b, travelled / seg)
            side = Vector((-(b - a).z, 0, (b - a).x)).normalized()
            p += side * rng.uniform(-0.16, 0.16)
            r = rng.uniform(0.2, 0.3)
            ids = []
            spin = rng.random() * 6
            for k in range(7):
                ang = spin + k / 7 * math.tau
                rr = r * rng.uniform(0.8, 1.1)
                ids.append(props.vert((p.x + math.sin(ang) * rr, ground_y(p.x, p.z) + 0.025, p.z + math.cos(ang) * rr)))
            props.face(ids, "stone", [(0.5 + 0.4 * math.sin(k), 0.5 + 0.4 * math.cos(k)) for k in range(7)])
            stones.append([round(p.x, 2), round(p.z, 2)])
            travelled += rng.uniform(0.62, 0.78)
        travelled -= seg
    info["stones"] = len(stones)

    # Gate: two rendered posts and an open leaf of plain vertical bars.
    g = LAYOUT["gate"]
    gx, _, gz = g["at"]
    half = g["width"] / 2
    for s in (-1, 1):
        props.box((gx, 0.7, gz + s * (half + 0.16)), (0.32, 1.4, 0.32), "trim", scale=2)
        props.box((gx, 1.43, gz + s * (half + 0.16)), (0.4, 0.07, 0.4), "slab", scale=2)
    leaf = Mesh("gate_leaf")
    wd, ht = g["width"] - 0.06, g["height"]
    for y in (0.12, ht - 0.03):
        leaf.box((0, y, -wd / 2), (0.04, 0.05, wd), "metal")
    for i in range(9):
        z = -wd * i / 8
        leaf.box((0, ht / 2 + 0.04, z), (0.028, ht - 0.1, 0.028), "metal")
    leaf_obj = leaf.build(col, mats)
    leaf_obj.location = to_blender((gx, 0, gz + half))
    leaf_obj.rotation_euler = (0, 0, math.radians(72))

    # East fence: low rendered wall with a hibiscus hedge behind it; north side: hedge only.
    fe = LAYOUT["fenceEast"]
    for za, zb in ((fe["from"][2], gz - half - 0.32), (gz + half + 0.32, fe["to"][2])):
        props.box((gx, 0.24, (za + zb) / 2), (0.2, 0.48, abs(zb - za)), "trim", scale=2)
        for off, height in ((-0.32, 1.25), (-0.5, 1.05)):
            x = gx + off
            length = abs(zb - za)
            props.quad(((x, 0, zb), (x, 0, za), (x, height, za), (x, height, zb)), "hedge", ((0, 0), (length / 4.5, 0), (length / 4.5, 1), (0, 1)), double=True)
    fn = LAYOUT["fenceNorth"]
    for off, height in ((0.0, 1.5), (0.25, 1.25)):
        z = fn["from"][2] + off
        length = fn["to"][0] - fn["from"][0]
        props.quad(((fn["from"][0], 0, z), (fn["to"][0], 0, z), (fn["to"][0], height, z), (fn["from"][0], height, z)), "hedge", ((0, 0), (length / 4.5, 0), (length / 4.5, 1), (0, 1)), double=True)
    # The rooster's perch behind the north hedge.
    px, py, pz = LAYOUT["perch"]
    props.box((px, py / 2, pz), (0.08, py, 0.08), "wood")
    props.box((px, py - 0.03, pz), (0.7, 0.05, 0.05), "wood")
    props.build(col, mats)

    info["milaHouse"] = house("house_mila", LAYOUT["milaHouse"], "wall_mila", col, mats, True)
    info["ninonHouse"] = house("house_ninon", LAYOUT["ninonHouse"], "wall_ninon", col, mats, False)

    # Terrace table: always there; the breakfast things are a separate object (dawn only).
    spec = LAYOUT["milaHouse"]
    fl = spec["floor"]
    local = (-1.6, fl, spec["size"][2] / 2 + spec["terraceDepth"] / 2)
    table = Mesh("terrace_table").place(spec["at"], spec["yaw"])
    tx, ty, tz = local
    table.box((tx, ty + 0.72, tz), (1.25, 0.04, 0.8), "wood")
    table.box((tx, ty + 0.62, tz), (1.31, 0.2, 0.86), "cloth", skip="yY")
    table.box((tx, ty + 0.745, tz), (1.31, 0.012, 0.86), "cloth")
    for sx in (-1, 1):
        for sz in (-1, 1):
            table.box((tx + sx * 0.55, ty + 0.35, tz + sz * 0.33), (0.05, 0.7, 0.05), "wood")
    seats = [(tx - 0.3, tz + 0.72, 0), (tx + 0.35, tz + 0.72, 0), (tx - 0.95, tz, 1)]
    for cx, cz, turned in seats:
        table.box((cx, ty + 0.44, cz), (0.42, 0.04, 0.42), "wood")
        for sx in (-1, 1):
            for sz in (-1, 1):
                table.box((cx + sx * 0.18, ty + 0.22, cz + sz * 0.18), (0.04, 0.44, 0.04), "wood")
        back = (cx - 0.2, ty + 0.72, cz) if turned else (cx, ty + 0.72, cz + 0.2)
        table.box(back, (0.04, 0.52, 0.42) if turned else (0.42, 0.52, 0.04), "wood")
    table.build(col, mats)
    food = Mesh("breakfast").place(spec["at"], spec["yaw"])
    top = ty + 0.752
    for cx, cz in ((tx - 0.3, tz + 0.2), (tx + 0.3, tz + 0.2), (tx - 0.42, tz - 0.12)):
        food.lathe((cx, top, cz), [(0.0, 0.0), (0.035, 0.0), (0.045, 0.07), (0.04, 0.07), (0.03, 0.012), (0.0, 0.012)], "ceramic", 12)
    food.lathe((tx + 0.12, top, tz - 0.12), [(0.0, 0.0), (0.13, 0.0), (0.15, 0.02), (0.0, 0.02)], "ceramic", 16)
    food.lathe((tx + 0.12, top + 0.02, tz - 0.12), [(0.0, 0.0), (0.09, 0.0), (0.1, 0.035), (0.06, 0.075), (0.0, 0.08)], "bread", 12)
    food.lathe((tx + 0.42, top, tz - 0.16), [(0.0, 0.0), (0.06, 0.0), (0.075, 0.1), (0.06, 0.2), (0.045, 0.24), (0.05, 0.26), (0.04, 0.26), (0.0, 0.03)], "ceramic", 14)
    food.build(col, mats)
    info["table"] = list(yaw_point((tx, top, tz), spec["yaw"], spec["at"]))
    info["seats"] = [list(yaw_point((cx, ty, cz), spec["yaw"], spec["at"])) for cx, cz, _ in seats]
    return info


# =========================================================================================== props


def build_props(mats) -> dict:
    """Hero calabash, Man Ninon's lantern and the rooster (rigged, two clips)."""
    col = collection("props")
    gourd = Mesh("gourd_hero")
    add_gourd(gourd, Vector((0, 0, 0)), 0.105, WHITE, 24)
    gourd.build(col, mats)

    lamp = Mesh("lamp")
    lamp.lathe((0, -0.3, 0), [(0.0, 0.0), (0.06, 0.0), (0.065, 0.03), (0.04, 0.06), (0.045, 0.075)], "lamp_metal", 12)
    lamp.lathe((0, -0.3, 0), [(0.04, 0.075), (0.055, 0.12), (0.05, 0.19), (0.032, 0.22)], "lamp_glass", 12)
    lamp.lathe((0, -0.3, 0), [(0.036, 0.22), (0.045, 0.23), (0.02, 0.26), (0.0, 0.265)], "lamp_metal", 12)
    arc = [(math.sin(a) * 0.075, -0.07 - math.cos(a) * -0.07 - 0.0, 0.0) for a in [i / 10 * math.pi - math.pi / 2 for i in range(11)]]
    arc = [(math.cos(t) * 0.075, -0.3 + 0.12 + math.sin(t) * 0.18, 0.0) for t in [i / 10 * math.pi for i in range(11)]]
    lamp.tube(arc, [0.004] * 11, "lamp_metal", 5, cap=False)
    lamp.build(col, mats)

    # Rooster, feet at the origin, facing +x.
    r = Mesh("rooster")
    body = [(0.0, -0.14), (0.05, -0.13), (0.085, -0.07), (0.095, 0.0), (0.08, 0.07), (0.045, 0.12), (0.0, 0.13)]
    rings = r.lathe((0, 0.25, 0), body, "rooster", 12, axis="z")
    for ring in rings:
        r.skin(ring, {"body": 1.0})
    # Lathe about +z: turn the body so its long axis runs along x.
    for ring in rings:
        for i in ring:
            v = r.verts[i]
            r.verts[i] = Vector((v.z, v.y, -v.x))
    neck = [(0.09, 0.3, 0), (0.13, 0.36, 0), (0.15, 0.42, 0)]
    rings = r.tube(neck, [0.05, 0.04, 0.034], "rooster", 8, cap=False)
    r.skin(rings[0], {"body": 1.0})
    r.skin(rings[1], {"neck": 1.0})
    r.skin(rings[2], {"head": 1.0})
    first = len(r.verts)
    r.lathe((0.155, 0.4, 0), [(0.0, 0.0), (0.03, 0.01), (0.04, 0.04), (0.03, 0.07), (0.0, 0.08)], "rooster", 10)
    r.tube([(0.185, 0.445, 0), (0.24, 0.43, 0)], [0.014, 0.002], "rooster_beak", 5, cap=False)
    for k in range(4):
        x = 0.125 + k * 0.022
        r.quad(((x, 0.475, 0), (x + 0.03, 0.475, 0), (x + 0.022, 0.515 - abs(k - 1.2) * 0.008, 0), (x + 0.004, 0.51, 0)), "rooster_red", double=True)
    r.quad(((0.175, 0.385, 0), (0.2, 0.42, 0), (0.185, 0.43, 0), (0.165, 0.41, 0)), "rooster_red", double=True)
    r.skin(range(first, len(r.verts)), {"head": 1.0})
    first = len(r.verts)
    for k in range(7):
        a = (k - 3) * 0.2
        base = Vector((-0.11, 0.3, a * 0.05))
        mid = base + Vector((-0.12, 0.16 + 0.03 * abs(k - 3), a * 0.25))
        end = mid + Vector((-0.11, -0.04 - 0.02 * abs(k - 3), a * 0.3))
        r.tube([base, mid, end], [0.022, 0.02, 0.004], "rooster_tail", 5, cap=False, squash=1.0)
    r.skin(range(first, len(r.verts)), {"tail": 1.0})
    first = len(r.verts)
    for s in (-1, 1):
        r.tube([(0.0, 0.15, s * 0.04), (0.01, 0.0, s * 0.045)], [0.008, 0.007], "rooster_beak", 5, cap=False)
        r.quad(((-0.08, 0.2, s * 0.09), (0.06, 0.2, s * 0.095), (0.05, 0.31, s * 0.085), (-0.09, 0.29, s * 0.08))[:: -s], "rooster_tail", double=True)
    r.skin(range(first, len(r.verts)), {"body": 1.0})
    obj = r.build(col, mats)
    arm_data = bpy.data.armatures.new("rig_rooster")
    arm = bpy.data.objects.new("rig_rooster", arm_data)
    col.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    spec = {"body": ((0, 0.16, 0), (0, 0.3, 0), None), "neck": ((0.09, 0.3, 0), (0.14, 0.39, 0), "body"), "head": ((0.14, 0.39, 0), (0.16, 0.47, 0), "neck"), "tail": ((-0.1, 0.3, 0), (-0.22, 0.42, 0), "body")}
    for name, (head, tail, parent) in spec.items():
        bone = arm_data.edit_bones.new(name)
        bone.head, bone.tail = to_blender(head), to_blender(tail)
        if parent:
            bone.parent = arm_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.parent = arm
    obj.modifiers.new("Armature", "ARMATURE").object = arm
    arm.animation_data_create()
    z_axis = Vector((0, 0, 1))  # web-engine z: the rooster nods and stretches in its x-y plane

    def clip(name: str, seconds: float, pose) -> None:
        action = bpy.data.actions.new(name)
        arm.animation_data.action = action
        frames = int(seconds * FPS)
        for frame in range(0, frames + 1, 2):
            t = frame / frames
            for bone, angle in pose(t).items():
                pb = arm.pose.bones[bone]
                pb.rotation_mode = "QUATERNION"
                local = pb.bone.matrix_local.to_3x3().inverted() @ Vector(to_blender(z_axis))
                pb.rotation_quaternion = Quaternion(local, angle)
                pb.keyframe_insert("rotation_quaternion", frame=frame + 1)
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        arm.animation_data.action = None

    def stir(t: float) -> dict[str, float]:
        k = math.sin(t * math.pi) ** 2
        return {"body": 0.08 * k * math.sin(t * 18), "neck": -0.25 * k, "head": 0.3 * k * math.sin(t * 9), "tail": 0.25 * k * math.sin(t * 14)}

    def crow(t: float) -> dict[str, float]:
        up = math.sin(min(1.0, t / 0.35) * math.pi / 2) * (1 - max(0.0, (t - 0.8) / 0.2) ** 2)
        return {"body": 0.28 * up, "neck": 0.5 * up, "head": 0.55 * up + 0.05 * up * math.sin(t * 40), "tail": -0.3 * up}

    clip("rooster_stir", 1.5, stir)
    clip("rooster_crow", 2.5, crow)
    return {"gourdRadius": 0.105, "gourdStem": 0.035}


def export(name: str, cols: list[str]) -> None:
    """Exports the named collections as one GLB (no cameras, no lights, NLA tracks as clips)."""
    bpy.ops.object.select_all(action="DESELECT")
    for cname in cols:
        for obj in bpy.data.collections[cname].all_objects:
            obj.select_set(True)
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / f"{name}.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=False,
        export_materials="EXPORT",
        export_image_format="NONE",
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_frame_range=False,
        export_force_sampling=True,
        export_skins=True,
        export_cameras=False,
        export_lights=False,
    )


def main() -> None:
    """Builds every asset, exports the GLB files and writes the build report."""
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.unit_settings.system = "METRIC"
    mats = make_materials()
    report = {"tree": build_tree(mats), "set": build_set(mats), "props": build_props(mats)}
    export("tree", ["tree"])
    export("set", ["set"])
    export("props", ["props"])
    (BOOK / "world/assets.json").write_text(json.dumps(report, indent=2) + "\n")
    if "--blend" in argv:
        blend = ROOT / "art/mila-calebassier/blend/mila_calebassier.blend"
        blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
    stats = {o.name: len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH"}
    print("BUILD_OK", json.dumps(stats))


if __name__ == "__main__":
    main()
