"""Small mesh builder for the bpy scripts of « Mila et le calebassier magique ».

Geometry is authored in the web engine's axes (x east, y up, z south, metres) and converted to
Blender's (x, -z, y) when the object is created; the glTF exporter converts back, so a point written
here keeps its coordinates in Three.js. Faces are wound counter-clockwise seen from outside.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Vector


def to_blender(p) -> tuple[float, float, float]:
    """Web-engine point (y up) to Blender point (z up)."""
    return (p[0], -p[2], p[1])


def yaw_point(p, yaw_deg: float, origin=(0.0, 0.0, 0.0)) -> Vector:
    """Rotates `p` about the vertical axis (positive yaw turns +z towards +x) and moves it to `origin`."""
    a = math.radians(yaw_deg)
    c, s = math.cos(a), math.sin(a)
    return Vector((origin[0] + p[0] * c + p[2] * s, origin[1] + p[1], origin[2] - p[0] * s + p[2] * c))


class Mesh:
    """Collects vertices, faces, UVs, vertex colours, materials and bone weights of one object."""

    def __init__(self, name: str):
        self.name = name
        self.verts: list[Vector] = []
        self.faces: list[tuple] = []
        self.weights: dict[int, dict[str, float]] = {}
        self.xf = lambda p: Vector(p)

    def place(self, origin, yaw_deg: float = 0.0) -> "Mesh":
        """Every later vertex is given in a local frame at `origin`, turned by `yaw_deg`."""
        self.xf = lambda p: yaw_point(p, yaw_deg, origin)
        return self

    def vert(self, p) -> int:
        """Adds a vertex (local frame) and returns its index."""
        self.verts.append(self.xf(p))
        return len(self.verts) - 1

    def face(self, ids, mat: str, uvs, smooth: bool = False, col=(1.0, 1.0, 1.0, 1.0)) -> None:
        """Adds a polygon; `col` is one RGBA for the face or one per corner."""
        cols = col if isinstance(col[0], (tuple, list)) else [col] * len(ids)
        self.faces.append((tuple(ids), mat, tuple(uvs), smooth, tuple(cols)))

    def quad(self, pts, mat: str, uv=None, col=(1.0, 1.0, 1.0, 1.0), scale: float = 1.0, double: bool = False) -> list[int]:
        """Adds a quad from four points (counter-clockwise from outside); UVs in metres / `scale`."""
        if uv is None:
            w = (Vector(pts[1]) - Vector(pts[0])).length / scale
            h = (Vector(pts[3]) - Vector(pts[0])).length / scale
            uv = ((0, 0), (w, 0), (w, h), (0, h))
        ids = [self.vert(p) for p in pts]
        self.face(ids, mat, uv, False, col)
        if double:
            self.face(ids[::-1], mat, uv[::-1], False, col)
        return ids

    def box(self, centre, size, mat: str, col=(1.0, 1.0, 1.0, 1.0), scale: float = 1.0, skip: str = "") -> None:
        """Adds an axis-aligned box (local frame); `skip` lists faces to leave out among 'xXyYzZ'."""
        cx, cy, cz = centre
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        x0, x1, y0, y1, z0, z1 = cx - hx, cx + hx, cy - hy, cy + hy, cz - hz, cz + hz
        sides = {
            "X": ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)),
            "x": ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)),
            "Y": ((x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)),
            "y": ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)),
            "Z": ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)),
            "z": ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)),
        }
        for key, pts in sides.items():
            if key not in skip:
                self.quad(pts, mat, col=col, scale=scale)

    def tube(self, pts, radii, mat: str, sides: int = 8, col=(1.0, 1.0, 1.0, 1.0), tile: float = 1.0, cap: bool = True, squash: float = 1.0):
        """Sweeps a round section along `pts`; returns the vertex rings (for skinning).

        `squash` flattens the section vertically (half-buried roots)."""
        pts = [Vector(p) for p in pts]
        n = len(pts)
        tangents = []
        for i in range(n):
            a = pts[max(0, i - 1)]
            b = pts[min(n - 1, i + 1)]
            tangents.append((b - a).normalized())
        ref = Vector((0, 1, 0)) if abs(tangents[0].y) < 0.9 else Vector((1, 0, 0))
        normal = (ref - tangents[0] * ref.dot(tangents[0])).normalized()
        rings, dist = [], 0.0
        mean_r = sum(radii) / len(radii)
        wraps = max(1, round(2 * math.pi * mean_r / tile))
        v_at = []
        for i in range(n):
            t = tangents[i]
            normal = (normal - t * normal.dot(t)).normalized()
            binormal = t.cross(normal)
            if i:
                dist += (pts[i] - pts[i - 1]).length
            v_at.append(dist / tile)
            ring = []
            for j in range(sides):
                a = j / sides * math.tau
                off = normal * math.cos(a) * radii[i] + binormal * math.sin(a) * radii[i]
                off.y *= squash
                ring.append(self.vert(pts[i] + off))
            rings.append(ring)
        cols = col if isinstance(col[0], (tuple, list)) else [col] * n
        for i in range(n - 1):
            for j in range(sides):
                k = (j + 1) % sides
                u0, u1 = j / sides * wraps, (j + 1) / sides * wraps
                self.face(
                    (rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]),
                    mat,
                    ((u0, v_at[i]), (u1, v_at[i]), (u1, v_at[i + 1]), (u0, v_at[i + 1])),
                    True,
                    (cols[i], cols[i], cols[i + 1], cols[i + 1]),
                )
        if cap:
            tip = self.vert(pts[-1] + tangents[-1] * radii[-1] * 0.6)
            for j in range(sides):
                k = (j + 1) % sides
                self.face((rings[-1][j], rings[-1][k], tip), mat, ((0, v_at[-1]), (0.1, v_at[-1]), (0.05, v_at[-1] + 0.05)), True, cols[-1])
            rings.append([tip])
        return rings

    def lathe(self, origin, profile, mat: str, sides: int = 16, col=(1.0, 1.0, 1.0, 1.0), tile=(1.0, 1.0), axis: str = "y") -> list[list[int]]:
        """Turns a (radius, height) profile about the local vertical (or +z for axis 'z') axis."""
        rings, length = [], 0.0
        v_at = []
        for i, (r, h) in enumerate(profile):
            if i:
                length += math.hypot(r - profile[i - 1][0], h - profile[i - 1][1])
            v_at.append(length)
            ring = []
            for j in range(sides):
                a = j / sides * math.tau
                if axis == "y":
                    p = (origin[0] + r * math.cos(a), origin[1] + h, origin[2] + r * math.sin(a))
                else:
                    p = (origin[0] + r * math.sin(a), origin[1] + r * math.cos(a), origin[2] + h)
                ring.append(self.vert(p))
            rings.append(ring)
        total = max(length, 1e-6)
        for i in range(len(profile) - 1):
            for j in range(sides):
                k = (j + 1) % sides
                u0, u1 = j / sides * tile[0], (j + 1) / sides * tile[0]
                v0, v1 = v_at[i] / total * tile[1], v_at[i + 1] / total * tile[1]
                self.face(
                    (rings[i][j], rings[i + 1][j], rings[i + 1][k], rings[i][k]),
                    mat,
                    ((u0, v0), (u0, v1), (u1, v1), (u1, v0)),
                    True,
                    col,
                )
        return rings

    def skin(self, ids, weights: dict[str, float]) -> None:
        """Binds vertices to bones (weights are normalised by the exporter)."""
        for i in ids:
            self.weights[i] = dict(weights)

    def build(self, collection, materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
        """Creates the Blender object with UVs, vertex colours, materials and vertex groups."""
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata([to_blender(v) for v in self.verts], [], [f[0] for f in self.faces])
        names = sorted({f[1] for f in self.faces})
        for name in names:
            mesh.materials.append(materials[name])
        uv = mesh.uv_layers.new(name="UVMap")
        colour = mesh.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
        loop = 0
        for poly, face in zip(mesh.polygons, self.faces):
            poly.material_index = names.index(face[1])
            poly.use_smooth = face[3]
            for corner in range(len(face[0])):
                uv.data[loop].uv = face[2][corner]
                colour.data[loop].color = face[4][corner]
                loop += 1
        mesh.validate()
        mesh.update()
        obj = bpy.data.objects.new(self.name, mesh)
        collection.objects.link(obj)
        groups: dict[str, bpy.types.VertexGroup] = {}
        for index, bones in self.weights.items():
            for bone, weight in bones.items():
                if bone not in groups:
                    groups[bone] = obj.vertex_groups.new(name=bone)
                groups[bone].add([index], weight, "REPLACE")
        return obj
