"""Builds three Vietnamese slipper models and renders preview shots.

Run headless:
  blender -b -P build_slippers.py -- <output_dir>
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(os.path.dirname(__file__), 'out')
os.makedirs(OUT, exist_ok=True)

# Right foot, top view, toes toward +Y. Big toe on the -X side.
FOOTPRINT = [
    (0.00, -0.80), (0.16, -0.77), (0.24, -0.68), (0.27, -0.52), (0.27, -0.30), (0.29, -0.08),
    (0.33, 0.15), (0.35, 0.33), (0.33, 0.48), (0.28, 0.60), (0.20, 0.69), (0.10, 0.76),
    (-0.02, 0.80), (-0.14, 0.79), (-0.24, 0.72), (-0.30, 0.58), (-0.33, 0.38), (-0.30, 0.15),
    (-0.23, -0.08), (-0.23, -0.30), (-0.26, -0.52), (-0.24, -0.68), (-0.15, -0.77),
]


def catmull_rom(points, steps=8):
    out = []
    n = len(points)
    for i in range(n):
        p0, p1, p2, p3 = (Vector(points[(i + k) % n]) for k in (-1, 0, 1, 2))
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return [(v.x, v.y) for v in out]


OUTLINE = catmull_rom(FOOTPRINT)


def toe_spring(y):
    return 0.045 * max(0.0, (y - 0.45) / 0.35) ** 2


def sole_height(y, heel=0.13, toe=0.09):
    t = (y + 0.8) / 1.6
    return heel + (toe - heel) * t


def rim_x(y):
    """Inner (min) and outer (max) x of the outline at height y."""
    xs = []
    pts = OUTLINE
    for i in range(len(pts)):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
        if (y1 - y) * (y2 - y) <= 0 and y1 != y2:
            xs.append(x1 + (x2 - x1) * (y - y1) / (y2 - y1))
    return (min(xs), max(xs)) if len(xs) >= 2 else (0.0, 0.0)


def srgb(hex_color):
    hex_color = hex_color.lstrip('#')
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb)


def material(name, color, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*srgb(color), 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def smooth(obj, angle=40):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
    except Exception:
        pass


# ---------- sole ----------

def sole_layer(name, z_bottom, z_top, mat, dish=0.0, shrink=1.0):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    pts = [(x * shrink, y * shrink) for x, y in OUTLINE]
    bottom = [bm.verts.new((x, y, z_bottom(y))) for x, y in pts]
    top = [bm.verts.new((x, y, z_top(y))) for x, y in pts]
    bm.faces.new(list(reversed(bottom)))
    top_face = bm.faces.new(top)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
    if dish:
        # footbed: a shallow foot-shaped dip in the top surface
        bmesh.ops.inset_region(bm, faces=[top_face], thickness=0.05, depth=-dish)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('bevel', 'BEVEL')
    bevel.width = 0.014
    bevel.segments = 4
    bevel.limit_method = 'ANGLE'
    bevel.angle_limit = math.radians(35)
    smooth(obj)
    return obj


def sole(prefix, top_color, bottom_color, split=0.55):
    def zb(y):
        return toe_spring(y)

    def zm(y):
        return toe_spring(y) + sole_height(y) * split

    def zt(y):
        return toe_spring(y) + sole_height(y)

    lower = sole_layer(f'{prefix}_sole_bottom', zb, zm, material(f'{prefix}_bottom', bottom_color, 0.75))
    upper = sole_layer(f'{prefix}_sole_top', zm, zt, material(f'{prefix}_top', top_color, 0.55), dish=0.012, shrink=0.995)
    return [lower, upper], zt


# ---------- straps & uppers ----------

def ellipse_profile(name, width, thickness, points=14):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '2D'
    spline = curve.splines.new('POLY')
    spline.points.add(points - 1)
    for i, p in enumerate(spline.points):
        a = 2 * math.pi * i / points
        p.co = (math.cos(a) * width / 2, math.sin(a) * thickness / 2, 0, 1)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.hide_render = obj.hide_viewport = True
    return obj


def strap(name, points, mat, width, thickness, tilts):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_mode = 'OBJECT'
    curve.bevel_object = ellipse_profile(f'{name}_profile', width, thickness)
    curve.use_fill_caps = True
    curve.resolution_u = 20
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, co, tilt in zip(spline.bezier_points, points, tilts):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
        bp.tilt = tilt
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def arch_upper(name, zt, y0, y1, apex, mat, rows=40, cols=36, thickness=0.03, inset=0.0, sink=0.012):
    """A shell arching from rim to rim over the sole between y0 and y1."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    grid = []
    for r in range(rows + 1):
        y = y0 + (y1 - y0) * r / rows
        lo, hi = rim_x(y)
        lo += inset
        hi -= inset
        row = []
        for c in range(cols + 1):
            u = c / cols * 2 - 1
            x = (lo + hi) / 2 + u * (hi - lo) / 2
            h = apex(y) * (max(0.0, 1 - u * u)) ** 0.55
            row.append(bm.verts.new((x, y, zt(y) - sink + h)))
        grid.append(row)
    for r in range(rows):
        for c in range(cols):
            bm.faces.new((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(mat)
    solid = obj.modifiers.new('solid', 'SOLIDIFY')
    solid.thickness = thickness
    solid.offset = 1
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=solid.name)
    bevel = obj.modifiers.new('bevel', 'BEVEL')
    bevel.width = 0.008
    bevel.segments = 3
    bevel.limit_method = 'ANGLE'
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    smooth(obj)
    return obj


def to_mesh(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    return joined


# ---------- the three slippers ----------

def dep_lao():
    parts, zt = sole('lao', '#f3efe6', '#2f6fdb')
    blue = material('lao_strap', '#2f6fdb', 0.4)
    post_xy = Vector((-0.10, 0.54))
    post_top = Vector((post_xy.x, post_xy.y, zt(post_xy.y) + 0.075))
    for side in (1, -1):
        y = 0.04
        lo, hi = rim_x(y)
        rim = Vector((hi if side > 0 else lo, y, zt(y)))
        # smooth arc: from the toe post up over the foot, then over the rim and into the sole side
        def along(k, lift, out):
            p = post_top.lerp(Vector((rim.x, rim.y, zt(y))), k)
            return Vector((p.x + side * out, p.y, p.z + lift))
        parts.append(strap(f'lao_strap_{side}', [
            post_top,
            along(0.35, 0.07, 0.03),
            along(0.72, 0.08, 0.02),
            Vector((rim.x + side * 0.02, y, zt(y) - 0.005)),
            Vector((rim.x + side * 0.03, y, zt(y) - 0.04)),
        ], blue, width=0.085, thickness=0.036, tilts=[0, side * 0.35, side * 0.8, side * 1.5, side * 1.57]))
        # plug where the strap enters the sole rim
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.03, location=(rim.x + side * 0.03, y, zt(y) - 0.045),
                                            rotation=(0, math.radians(90), 0))
        plug = bpy.context.active_object
        plug.data.materials.append(blue)
        parts.append(plug)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.09, location=(post_xy.x, post_xy.y, zt(post_xy.y) + 0.035))
    post = bpy.context.active_object
    post.data.materials.append(blue)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04, location=post_top, segments=20, ring_count=10)
    knot = bpy.context.active_object
    knot.scale = (1.15, 1.0, 0.75)
    knot.data.materials.append(blue)
    smooth(knot)
    parts += [post, knot]
    return to_mesh(parts, 'dep_lao')


def dep_le():
    parts, zt = sole('le', '#f7ece0', '#d63c3c')
    band_mat = material('le_band', '#2a1418', 0.45)
    band = arch_upper('le_band', zt, 0.02, 0.36, lambda y: 0.17, band_mat, rows=16, cols=40, thickness=0.035, inset=0.012)
    parts.append(band)
    return to_mesh(parts, 'dep_le')


def dep_to_ong():
    parts, zt = sole('toong', '#62b9df', '#3fa7d6')
    shell_mat = material('toong_shell', '#3fa7d6', 0.4)

    y_tip = max(y for _, y in OUTLINE) - 1e-3

    def apex(y):
        # tall over the instep, closing smoothly to nothing at the very tip of the toe
        t = min(1.0, max(0.0, (y + 0.12) / (y_tip + 0.12)))
        return 0.27 * (1 - t ** 2.4) * min(1.0, (1 - t) / 0.08) ** 0.5

    shell = arch_upper('toong_shell', zt, -0.12, y_tip, apex, shell_mat, rows=70, cols=40, thickness=0.03, inset=0.01, sink=0.035)
    # honeycomb: hex prisms in staggered rows, kept off the rims
    holes = []
    for row in range(14):
        y = -0.02 + row * 0.052
        if y > 0.62:
            break
        lo, hi = rim_x(y)
        half = (hi - lo) / 2
        mid = (lo + hi) / 2
        for col in range(-8, 9):
            x = mid + col * 0.062 + (0.031 if row % 2 else 0)
            if abs(x - mid) > half * 0.62:
                continue
            bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.022, depth=0.6, location=(x, y, zt(y) + 0.3))
            holes.append(bpy.context.active_object)
    bpy.ops.object.select_all(action='DESELECT')
    for p in holes:
        p.select_set(True)
    bpy.context.view_layer.objects.active = holes[0]
    bpy.ops.object.join()
    cutter = bpy.context.active_object
    boolean = shell.modifiers.new('holes', 'BOOLEAN')
    boolean.operation = 'DIFFERENCE'
    boolean.object = cutter
    bpy.context.view_layer.objects.active = shell
    bpy.ops.object.modifier_apply(modifier=boolean.name)
    bpy.data.objects.remove(cutter)
    shell.data.materials.clear()
    shell.data.materials.append(shell_mat)
    for poly in shell.data.polygons:
        poly.material_index = 0
    parts.append(shell)
    return to_mesh(parts, 'dep_to_ong')


# ---------- staging & render ----------

def stage(scene):
    world = bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (*srgb('#e9e4dc'), 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.45

    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.data.materials.append(material('floor', '#b9a98f', 0.9))

    key = bpy.data.lights.new('key', 'AREA')
    key.energy = 420
    key.size = 3
    key_obj = bpy.data.objects.new('key', key)
    key_obj.location = (2.5, -2.5, 4)
    key_obj.rotation_euler = Vector((-2.5, 2.5, -4)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.collection.objects.link(key_obj)

    rim = bpy.data.lights.new('rim', 'AREA')
    rim.energy = 180
    rim.size = 2
    rim_obj = bpy.data.objects.new('rim', rim)
    rim_obj.location = (-2.5, 3, 2.5)
    rim_obj.rotation_euler = Vector((2.5, -3, -2.5)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.collection.objects.link(rim_obj)

    for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'CYCLES'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    if scene.render.engine == 'CYCLES':
        scene.cycles.samples = 64
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.image_settings.file_format = 'PNG'
    try:
        scene.view_settings.view_transform = 'AgX'
    except TypeError:
        scene.view_settings.view_transform = 'Filmic'


def camera(scene, location, target, lens=50):
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = lens
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = location
    cam.rotation_euler = (Vector(target) - Vector(location)).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    return cam


def render(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    stage(scene)
    models = {'dep_lao': dep_lao(), 'dep_to_ong': dep_to_ong(), 'dep_le': dep_le()}
    spacing = 1.0
    for i, obj in enumerate(models.values()):
        obj.location.x = (i - 1) * spacing

    cam = camera(scene, (0.9, -3.4, 2.6), (0, 0.05, 0.05), lens=42)
    render(scene, os.path.join(OUT, 'lineup.png'))
    bpy.data.objects.remove(cam)

    views = {
        '34': lambda x: ((x + 1.35, 1.55, 1.05), (x, 0.1, 0.1)),
        'side': lambda x: ((x + 2.6, 0.0, 0.35), (x, 0.0, 0.12)),
        'top': lambda x: ((x, -0.001, 3.2), (x, 0, 0)),
    }
    for i, (name, obj) in enumerate(models.items()):
        x = (i - 1) * spacing
        for other in models.values():
            other.hide_render = other is not obj
        for view, place in views.items():
            loc, target = place(x)
            cam = camera(scene, loc, target, lens=50)
            render(scene, os.path.join(OUT, f'{name}_{view}.png'))
            bpy.data.objects.remove(cam)
        tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        print(f'{name}: {tris} triangles')
    for obj in models.values():
        obj.hide_render = False
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'slippers.blend'))


main()
