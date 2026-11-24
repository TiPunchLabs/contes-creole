"""Renders one shot of the tale in Blender (EEVEE), to compare with the web engine's frame.

Usage (from the repository root):
    blender -b --factory-startup --python-exit-code 1 \
        -P art/mila-calebassier/scripts/render_compare.py -- \
        --pos -0.75,1.08,0.85 --look -1.75,1.25,-1.9 --fov 38 --out /tmp/blender-p03.png \
        [--bend-a 1] [--key night|dusk|dawn] [--size 1440x900]

It rebuilds the same scene as `build_assets.py` (same layout, same painted masters) and looks at
it through a lens given in the web engine's axes. The figures are not here: Mila and Man Ninon are
procedural in the web engine. Blender shows the assets in its own shading (Principled, no brush).
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
import build_assets as build  # noqa: E402
from meshkit import to_blender  # noqa: E402

KEYS = {
    "night": {"sky": (0.03, 0.05, 0.14), "sun": (0.55, 0.65, 1.0), "sun_k": 0.5, "world": 0.9},
    "dusk": {"sky": (0.62, 0.5, 0.56), "sun": (1.0, 0.75, 0.55), "sun_k": 2.0, "world": 1.0},
    "dawn": {"sky": (0.75, 0.66, 0.7), "sun": (1.0, 0.85, 0.7), "sun_k": 2.2, "world": 1.0},
}


def vec(text: str) -> Vector:
    """Parses 'x,y,z'."""
    return Vector([float(v) for v in text.split(",")])


def main() -> None:
    """Builds the scene, poses branch A, sets the lens and the key, renders one still."""
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--pos", required=True)
    parser.add_argument("--look", required=True)
    parser.add_argument("--fov", type=float, default=38)
    parser.add_argument("--out", required=True)
    parser.add_argument("--bend-a", type=float, default=0)
    parser.add_argument("--key", default="night")
    parser.add_argument("--size", default="1440x900")
    args = parser.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = build.FPS
    mats = build.make_materials()
    build.build_tree(mats)
    build.build_set(mats)
    build.build_props(mats)

    # Branch A at the asked share of its offering clip; the hero calabash hangs from its socket.
    rig = bpy.data.objects["rig_A"]
    track = rig.animation_data.nla_tracks["A_offer"]
    action = track.strips[0].action
    rig.animation_data.action = action
    scene.frame_set(int(round(1 + args.bend_a * (action.frame_range[1] - 1))))
    hero = bpy.data.objects["gourd_hero"]
    bpy.context.view_layer.update()
    hero.location = bpy.data.objects["socket_A"].matrix_world.translation
    for name in ("lamp", "rig_rooster", "rooster"):
        obj = bpy.data.objects.get(name)
        if obj and name == "lamp":
            obj.hide_render = True

    key = KEYS[args.key]
    world = bpy.data.worlds.new("key")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (*key["sky"], 1.0)
    background.inputs[1].default_value = key["world"]
    scene.world = world
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.color = key["sun"]
    sun.data.energy = key["sun_k"]
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    scene.collection.objects.link(sun)
    if args.key == "night":
        glow = bpy.data.objects.new("glow", bpy.data.lights.new("glow", "POINT"))
        glow.data.color = (1.0, 0.8, 0.5)
        glow.data.energy = 60
        glow.data.shadow_soft_size = 0.1
        glow.location = hero.location - Vector((0, 0, 0.13))
        scene.collection.objects.link(glow)

    camera = bpy.data.objects.new("lens", bpy.data.cameras.new("lens"))
    scene.collection.objects.link(camera)
    pos, look = Vector(to_blender(vec(args.pos))), Vector(to_blender(vec(args.look)))
    camera.location = pos
    camera.rotation_euler = (look - pos).to_track_quat("-Z", "Y").to_euler()
    camera.data.sensor_fit = "VERTICAL"
    camera.data.angle_y = math.radians(args.fov)
    camera.data.clip_start, camera.data.clip_end = 0.1, 400
    scene.camera = camera
    width, height = (int(v) for v in args.size.split("x"))
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.render.filepath = args.out
    bpy.ops.render.render(write_still=True)
    print("RENDER_OK", args.out)


if __name__ == "__main__":
    main()
