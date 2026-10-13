"""Low-poly slippers textured from one gradient palette atlas (palette.png, 16 x 4 cells).

Each part samples one palette cell; the cell's top-to-bottom gradient runs along the part's
height, so every slipper is a single material and a single small texture in the game.

Run headless:
  blender -b -P build_slippers_lowpoly.py -- <output_dir>
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(HERE, 'out_lowpoly')
os.makedirs(OUT, exist_ok=True)
PALETTE = os.path.join(HERE, 'palette.png')
GRID_COLS, GRID_ROWS = 16, 4

# (row, col, low, high): palette cell, and which slice of its gradient to use
# (0 = the cell's bottom colour, 1 = its top colour). Rows/cols count from the image's top-left.
SWATCH = {
    'blue': (1, 14, 0.6, 1.0),
    'cream': (3, 8, 0.78, 1.0),
    'sky': (3, 12, 0.12, 0.62),
    'red': (2, 12, 0.68, 1.0),
    'brown': (0, 15, 0.02, 0.45),
}

FOOTPRINT = [
    (0.00, -0.80), (0.16, -0.77), (0.24, -0.68), (0.27, -0.52), (0.27, -0.30), (0.29, -0.08),
    (0.33, 0.15), (0.35, 0.33), (0.33, 0.48), (0.28, 0.60), (0.20, 0.69), (0.10, 0.76),
    (-0.02, 0.80), (-0.14, 0.79), (-0.24, 0.72), (-0.30, 0.58), (-0.33, 0.38), (-0.30, 0.15),
    (-0.23, -0.08), (-0.23, -0.30), (-0.26, -0.52), (-0.24, -0.68), (-0.15, -0.77),
]


def catmull_rom(points, steps):
    out = []
    n = len(points)
    for i in range(n):
        p0, p1, p2, p3 = (Vector(points[(i + k) % n]) for k in (-1, 0, 1, 2))
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return [(v.x, v.y) for v in out]


OUTLINE = catmull_rom(FOOTPRINT, 2)
FINE_OUTLINE = catmull_rom(FOOTPRINT, 8)


def toe_spring(y):
    return 0.045 * max(0.0, (y - 0.45) / 0.35) ** 2


def sole_height(y, heel=0.13, toe=0.09):
    return heel + (toe - heel) * (y + 0.8) / 1.6


def rim_x(y):
    xs = []
    pts = FINE_OUTLINE
    for i in range(len(pts)):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
        if (y1 - y) * (y2 - y) <= 0 and y1 != y2:
            xs.append(x1 + (x2 - x1) * (y - y1) / (y2 - y1))
    return (min(xs), max(xs)) if len(xs) >= 2 else (0.0, 0.0)


# ---------- palette texturing ----------

_palette_material = None


def palette_material():
    global _palette_material
    if _palette_material:
        return _palette_material
    mat = bpy.data.materials.new('palette')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.7
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(PALETTE)
    tex.interpolation = 'Linear'
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    _palette_material = mat
    return mat


def bake_mesh(obj):
    """Applies modifiers / converts curves so the part is a plain mesh."""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return bpy.context.view_layer.objects.active


def paint(obj, swatch):
    """UV-maps every vertex onto one palette cell, gradient following height."""
    obj = bake_mesh(obj)
    row, col, low, high = SWATCH[swatch]
    mesh = obj.data
    # game engines cull back faces: make every face point outward
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    zs = [v.co.z for v in mesh.vertices]
    z0, z1 = min(zs), max(zs)
    span = max(z1 - z0, 1e-6)
    u = (col + 0.5) / GRID_COLS
    v_bottom = (GRID_ROWS - 1 - row) / GRID_ROWS
    inset = 0.04
    uv = mesh.uv_layers.new(name='UVMap') if not mesh.uv_layers else mesh.uv_layers[0]
    for loop in mesh.loops:
        z = mesh.vertices[loop.vertex_index].co.z
        f = low + (high - low) * (z - z0) / span
        f = inset + f * (1 - 2 * inset)
        uv.data[loop.index].uv = (u, v_bottom + f / GRID_ROWS)
    mesh.materials.clear()
    mesh.materials.append(palette_material())
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


# ---------- geometry ----------

def sole_layer(name, z_bottom, z_top, shrink=1.0):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    pts = [(x * shrink, y * shrink) for x, y in OUTLINE]
    bottom = [bm.verts.new((x, y, z_bottom(y))) for x, y in pts]
    top = [bm.verts.new((x, y, z_top(y))) for x, y in pts]
    bm.faces.new(list(reversed(bottom)))
    bm.faces.new(top)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.to_mesh(mesh)
    bm.free()
    bevel = obj.modifiers.new('chamfer', 'BEVEL')
    bevel.width = 0.012
    bevel.segments = 1
    bevel.limit_method = 'ANGLE'
    bevel.angle_limit = math.radians(40)
    return obj


def sole(prefix, top_swatch, bottom_swatch, split=0.55):
    def zb(y):
        return toe_spring(y)

    def zm(y):
        return toe_spring(y) + sole_height(y) * split

    def zt(y):
        return toe_spring(y) + sole_height(y)

    lower = paint(sole_layer(f'{prefix}_bottom', zb, zm), bottom_swatch)
    upper = paint(sole_layer(f'{prefix}_top', zm, zt, shrink=0.995), top_swatch)
    return [lower, upper], zt


def ellipse_profile(name, width, thickness, points=6):
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


def strap(name, points, width, thickness, tilts):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_mode = 'OBJECT'
    curve.bevel_object = ellipse_profile(f'{name}_profile', width, thickness)
    curve.use_fill_caps = True
    curve.resolution_u = 3
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, co, tilt in zip(spline.bezier_points, points, tilts):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
        bp.tilt = tilt
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return obj


def arch_upper(name, zt, y0, y1, apex, rows, cols, thickness=0.03, inset=0.0, sink=0.012):
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
    solid = obj.modifiers.new('solid', 'SOLIDIFY')
    solid.thickness = thickness
    solid.offset = 1
    return obj


def cylinder(radius, depth, location, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=radius, depth=depth, location=location, rotation=rotation)
    return bpy.context.active_object


def join(objs, name):
    # join into the first part (the sole, origin at the world origin, unscaled) so the
    # slipper keeps its origin under the heel-to-toe centre, sole resting on z = 0
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    return joined


# ---------- the three slippers ----------

def dep_lao():
    parts, zt = sole('lao', 'cream', 'blue')
    post_xy = Vector((-0.10, 0.54))
    post_top = Vector((post_xy.x, post_xy.y, zt(post_xy.y) + 0.075))
    for side in (1, -1):
        y = 0.04
        lo, hi = rim_x(y)
        rim = Vector((hi if side > 0 else lo, y, zt(y)))

        def along(k, lift, out):
            p = post_top.lerp(Vector((rim.x, rim.y, zt(y))), k)
            return Vector((p.x + side * out, p.y, p.z + lift))

        parts.append(paint(strap(f'lao_strap_{side}', [
            post_top,
            along(0.35, 0.07, 0.03),
            along(0.72, 0.08, 0.02),
            Vector((rim.x + side * 0.02, y, zt(y) - 0.005)),
            Vector((rim.x + side * 0.03, y, zt(y) - 0.04)),
        ], width=0.085, thickness=0.04, tilts=[0, side * 0.35, side * 0.8, side * 1.5, side * 1.57]), 'blue'))
        parts.append(paint(cylinder(0.03, 0.03, (rim.x + side * 0.03, y, zt(y) - 0.045), (0, math.radians(90), 0)), 'blue'))
    parts.append(paint(cylinder(0.02, 0.09, (post_xy.x, post_xy.y, zt(post_xy.y) + 0.035)), 'blue'))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.042, location=post_top)
    knot = bpy.context.active_object
    knot.scale = (1.15, 1.0, 0.75)
    parts.append(paint(knot, 'blue'))
    return join(parts, 'dep_lao')


def dep_le():
    parts, zt = sole('le', 'cream', 'red')
    band = arch_upper('le_band', zt, 0.02, 0.36, lambda y: 0.17, rows=3, cols=10, thickness=0.04, inset=0.012)
    parts.append(paint(band, 'brown'))
    return join(parts, 'dep_le')


def dep_to_ong():
    parts, zt = sole('toong', 'sky', 'sky')
    # the shell closes to zero height a little before the tip, where it is buried in the sole
    y_tip = max(y for _, y in FINE_OUTLINE) - 0.03

    def apex(y):
        t = min(1.0, max(0.0, (y + 0.12) / (y_tip + 0.12)))
        return 0.27 * (1 - t ** 2.4) * min(1.0, (1 - t) / 0.08) ** 0.5

    shell = arch_upper('toong_shell', zt, -0.12, y_tip, apex, rows=14, cols=10, thickness=0.03, inset=0.01, sink=0.035)
    shell = bake_mesh(shell)
    holes = []
    for row in range(8):
        y = 0.0 + row * 0.08
        if y > 0.6:
            break
        lo, hi = rim_x(y)
        half, mid = (hi - lo) / 2, (lo + hi) / 2
        for col in range(-5, 6):
            x = mid + col * 0.09 + (0.045 if row % 2 else 0)
            if abs(x - mid) > half * 0.6:
                continue
            holes.append(cylinder(0.03, 0.6, (x, y, zt(y) + 0.3)))
    cutter = join(holes, 'holes')
    boolean = shell.modifiers.new('holes', 'BOOLEAN')
    boolean.operation = 'DIFFERENCE'
    boolean.object = cutter
    shell = bake_mesh(shell)
    bpy.data.objects.remove(cutter)
    parts.append(paint(shell, 'sky'))
    return join(parts, 'dep_to_ong')


# ---------- staging & render ----------

def plain_material(name, hex_color, roughness=0.9):
    hex_color = hex_color.lstrip('#')
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def stage(scene):
    world = bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.78, 0.78, 0.78, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.45
    bpy.ops.mesh.primitive_plane_add(size=30)
    bpy.context.active_object.data.materials.append(plain_material('floor', '#a8a39b'))
    for name, energy, size, loc in (('key', 420, 3, (2.5, -2.5, 4)), ('rim', 180, 2, (-2.5, 3, 2.5))):
        light = bpy.data.lights.new(name, 'AREA')
        light.energy = energy
        light.size = size
        obj = bpy.data.objects.new(name, light)
        obj.location = loc
        obj.rotation_euler = (-Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.collection.objects.link(obj)
    for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'CYCLES'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.image_settings.file_format = 'PNG'
    try:
        scene.view_settings.view_transform = 'Standard'
    except TypeError:
        pass


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
    for i, obj in enumerate(models.values()):
        obj.location.x = (i - 1) * 1.0

    cam = camera(scene, (0.9, -3.4, 2.6), (0, 0.05, 0.05), lens=42)
    render(scene, os.path.join(OUT, 'lineup.png'))
    bpy.data.objects.remove(cam)
    views = {
        '34': lambda x: ((x + 1.35, 1.55, 1.05), (x, 0.1, 0.1)),
        'side': lambda x: ((x + 2.6, 0.0, 0.35), (x, 0.0, 0.12)),
    }
    for i, (name, obj) in enumerate(models.items()):
        x = (i - 1) * 1.0
        for other in models.values():
            other.hide_render = other is not obj
        for view, place in views.items():
            loc, target = place(x)
            cam = camera(scene, loc, target)
            render(scene, os.path.join(OUT, f'{name}_{view}.png'))
            bpy.data.objects.remove(cam)
        tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        print(f'{name}: {tris} triangles, uv layers {len(obj.data.uv_layers)}, materials {len(obj.data.materials)}')
    for obj in models.values():
        obj.hide_render = False
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'slippers_lowpoly.blend'))
    export_glb(models)


def export_glb(models):
    """One .glb per slipper, centred at the origin, sole on the ground, palette embedded."""
    glb_dir = os.path.join(OUT, 'glb')
    os.makedirs(glb_dir, exist_ok=True)
    for name, obj in models.items():
        obj.location = (0, 0, 0)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        try:
            bpy.ops.object.shade_auto_smooth(angle=math.radians(55))
        except Exception:
            pass
        bpy.ops.export_scene.gltf(
            filepath=os.path.join(glb_dir, f'{name}.glb'),
            export_format='GLB',
            use_selection=True,
            export_apply=True,
            export_yup=True,
        )
        print('exported', name)


main()
