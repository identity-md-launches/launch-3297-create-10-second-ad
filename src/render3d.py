"""Render the 3D-platformer cut of Super Donkey Kart of Time in Blender 4.

Run from the repository root with: blender -b --python src/render3d.py
All models, animation and lettering are generated here; no game assets are used.
"""
import bpy
import math
import os
from mathutils import Vector

ROOT = os.getcwd()
OUT = os.path.join(ROOT, "build", "platformer-frames")
os.makedirs(OUT, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def mat(name, rgb, metallic=0, roughness=0.7, emit=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*rgb, 1)
    bs.inputs["Metallic"].default_value = metallic
    bs.inputs["Roughness"].default_value = roughness
    if emit:
        bs.inputs["Emission Color"].default_value = (*rgb, 1)
        bs.inputs["Emission Strength"].default_value = emit
    return m

def flat(name, rgb):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    m.node_tree.nodes.clear()
    out=m.node_tree.nodes.new('ShaderNodeOutputMaterial')
    e=m.node_tree.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value=(*rgb,1)
    e.inputs['Strength'].default_value=1
    m.node_tree.links.new(e.outputs[0],out.inputs['Surface'])
    return m

sky = mat("sky blue", (0.35, .73, .96))
grass = mat("bright grass", (.18, .63, .23))
grass_dark = mat("grass edge", (.08, .38, .15))
soil = mat("earth", (.44, .25, .14))
soil_dark = mat("earth shadow", (.29, .16, .1))
wood = mat("wood", (.46, .25, .1))
wood_light = mat("wood lit", (.72, .43, .19))
leaves = mat("foliage", (.08, .45, .19))
leaves_light = mat("sunlit foliage", (.25, .7, .24))
brown = mat("ape fur", (.38, .18, .075))
brown_light = mat("ape face", (.7, .41, .21))
eye = mat("eyes", (.98, .97, .83))
black = mat("black", (.025, .026, .045))
green = mat("cap", (.08, .5, .16))
red = mat("scarf and kart", (.79, .055, .09))
red_light = mat("kart shine", (1, .19, .13))
gold = mat("coin gold", (1, .67, .075), .65, .24)
gold_light = mat("coin glint", (1, .9, .3), .35, .27)
cyan = mat("crystal", (.02, .85, 1), .28, .23, .25)
purple = mat("portal", (.44, .16, .8), .35, .28, .3)
cream = mat("clock face", (.98, .87, .56))
navy = flat("title backdrop", (.035, .025, .14))
white = mat("letter white", (1, .98, .86), emit=.5)
letter_white=flat("bright white type",(1,.98,.86))
letter_gold=flat("bright gold type",(1,.77,.12))
letter_cyan=flat("bright cyan type",(.27,.95,1))

def assign(o, m):
    o.data.materials.append(m)
    return o

def cube(name, loc, scale, m, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(o, m)
    if bevel:
        mod = o.modifiers.new("chunky edges", 'BEVEL')
        mod.width = bevel
        mod.segments = 1
    return o

def ico(name, loc, radius, m, subs=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subs, radius=radius, location=loc)
    o = bpy.context.object
    o.name = name
    return assign(o, m)

def cylinder(name, loc, radius, depth, m, verts=12, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    if rotation:
        o.rotation_euler = rotation
    return assign(o, m)

def cone(name, loc, radius1, radius2, depth, m, verts=10):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius1, radius2=radius2, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    return assign(o, m)

def torus(name, loc, major, minor, m, rotation=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                    major_segments=32, minor_segments=8, location=loc)
    o = bpy.context.object
    o.name = name
    if rotation:
        o.rotation_euler = rotation
    return assign(o, m)

def parent(o, p):
    o.parent = p
    return o

def group(name, loc=(0,0,0)):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.location = loc
    return o

# Floating islands have visible sides and bevelled green tops: the level reads
# as a platforming space even in a still frame.
def island(x, z, w, depth=4.2):
    cube("island earth", (x, 0, z-.65), (w, depth, 1.25), soil, .18)
    cube("island underside", (x, 0, z-1.22), (w*.83, depth*.78, .25), soil_dark, .1)
    cube("grass cap", (x, 0, z+.06), (w, depth, .25), grass, .12)
    for i in range(4):
        px = x-w*.42+i*w*.28
        cube("ground accent", (px, -depth*.38, z-.15), (.42,.07,.12), grass_dark)

island(2.6, 0, 10.2, 5)
for x,z,w in [(9.4,0,4.2),(14.2,1.05,3.5),(19,1.75,3.4),
              (23.9,1.05,3.8),(28.9,.5,4.4),(34,.5,5.5)]:
    island(x,z,w)

# Checkered starting track and its arch.
cube("kart lane", (2.7,0,.21), (9.6,2.7,.16), wood, .08)
for i in range(12):
    for j in range(2):
        if (i+j)%2 == 0:
            cube("start grid", (-1.75+i*.8, -.67+j*1.34, .31), (.8,1.34,.015), cream)
for y in [-2.2,2.2]:
    cube("start gate leg", (5.7,y,1.5), (.24,.24,3), wood_light)
cube("start gate top", (5.7,0,3.05), (.35,4.65,.33), wood_light)

def tree(x,y,z,scale=1):
    cylinder("jungle trunk", (x,y,z+.68*scale), .16*scale, 1.35*scale, wood, 8)
    ico("jungle canopy", (x,y,z+1.65*scale), .78*scale, leaves, 1)
    ico("jungle sunlit canopy", (x-.25*scale,y+.08*scale,z+1.85*scale), .5*scale, leaves_light, 1)

for x,z in [(1,0),(4.2,0),(8.2,0),(10.7,0),(14.6,1.05),
            (18.3,1.75),(20.0,1.75),(23.2,1.05),(29.7,.5),(35.5,.5)]:
    tree(x,1.65,z,.8 if x>7 else 1)
for x,z in [(8.1,0),(15.1,1.05),(18.4,1.75),(24.8,1.05),(28.1,.5)]:
    tree(x,-1.8,z,.5)

def coin(x,y,z):
    root = group("spinning coin",(x,y,z))
    parent(cylinder("coin face", (0,0,0),.32,.08,gold,24,(math.pi/2,0,0)),root)
    parent(torus("coin rim",(0,0,0),.27,.05,gold_light,(math.pi/2,0,0)),root)
    for f,a in [(1,0),(241,math.pi*16)]:
        root.rotation_euler[2]=a
        root.keyframe_insert(data_path="rotation_euler",frame=f)
    return root

for x,y,z in [(3.0,-.4,1.5),(4,-.4,1.5),(8.5,-.2,1.55),
              (12.2,-.3,2.35),(16.3,-.25,3.3),(21.3,-.3,3.6),
              (26,-.25,2.7),(30.1,-.25,2.3)]:
    coin(x,y,z)

def crystal(x,z):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=0, radius=.45, location=(x,0,z))
    o=bpy.context.object; o.name="time crystal"; assign(o,cyan)
    o.scale=(.68,.68,1.5)
    for f,a in [(1,0),(241,math.pi*10)]:
        o.rotation_euler[2]=a; o.keyframe_insert(data_path="rotation_euler",frame=f)
    return o

for x,z in [(10.3,2.1),(17,3.7),(25.3,2.65)]: crystal(x,z)

# Portal and clock sit at the end of the route.
ring=torus("time portal",(34.1,0,3.5),1.8,.25,purple,(math.pi/2,0,0))
torus("portal gold trim",(34.1,-.05,3.5),1.52,.09,gold,(math.pi/2,0,0))
cylinder("clock dial",(34.1,.14,3.5),1.36,.16,cream,32,(math.pi/2,0,0))
for h in range(12):
    a=h*math.tau/12
    ico("clock marker",(34.1+math.sin(a)*1.13,-.02,3.5+math.cos(a)*1.13),.07,brown,1)
def clock_hand(name, length, width, angle):
    o=cube(name,(34.1,-.03,3.5+length*.5),(width,.08,length),brown_light,.03)
    o.rotation_euler[1]=angle
    return o
clock_hand("hour hand",.64,.13,-.7)
clock_hand("minute hand",1.0,.08,.45)
ico("clock spindle",(34.1,-.12,3.5),.13,red,2)

# Low-poly ape adventurer, built as a rig of simple solids.
def ape(name):
    root=group(name)
    def part(o): return parent(o,root)
    torso=part(ico("ape torso",(0,0,1.02),.52,brown,2)); torso.scale=(.8,.68,1.1)
    head=part(ico("ape head",(.05,-.02,1.83),.48,brown,2))
    muzzle=part(ico("ape muzzle",(.21,-.38,1.69),.28,brown_light,2)); muzzle.scale=(1.1,.7,.73)
    for sx in [-1,1]:
        part(ico("ape ear",(.05+sx*.46,-.01,1.85),.17,brown_light,1))
        part(ico("eye white",(.05+sx*.2,-.4,1.98),.105,eye,2))
        part(ico("eye pupil",(.05+sx*.2,-.49,1.98),.048,black,2))
    part(ico("nose",(.21,-.58,1.74),.09,black,1))
    part(cone("green pointed cap",(.02,-.02,2.35),.42,.025,.52,green,10))
    part(cylinder("cap brim",(.02,-.13,2.12),.45,.09,green,12))
    part(torus("red scarf",(0,0,1.35),.38,.09,red))
    tail=part(cone("scarf tail",(-.42,.22,1.24),.18,.01,.65,red,5)); tail.rotation_euler[1]=.9
    legs=[]; arms=[]
    for sx in [-1,1]:
        pivot=group("leg pivot",(sx*.23,0,.75)); parent(pivot,root)
        parent(ico("ape leg",(0,0,-.28),.24,brown,1),pivot)
        foot=parent(ico("shoe",(.05,-.12,-.58),.22,brown_light,1),pivot); foot.scale=(1.1,1.3,.65)
        legs.append(pivot)
        ap=group("arm pivot",(sx*.46,0,1.35)); parent(ap,root)
        parent(ico("ape arm",(sx*.12,0,-.3),.25,brown,1),ap)
        parent(ico("ape hand",(sx*.13,-.04,-.52),.2,brown_light,1),ap)
        arms.append(ap)
    return root,legs,arms

runner,legs,arms=ape("jumping hero")
racer,_,_=ape("kart driver")
kart=group("racing kart")
body=parent(cube("red kart body",(0,0,.52),(1.8,1.16,.36),red,.18),kart)
parent(cube("kart nose",(0,-.62,.44),(1.32,.58,.25),red_light,.09),kart)
parent(cube("kart seat",(0,.24,.82),(1.0,.33,.55),black,.05),kart)
for x in [-.7,.7]:
    for y in [-.56,.56]:
        parent(cylinder("kart wheel",(x,y,.28),.24,.22,black,12,(math.pi/2,0,0)),kart)
parent(racer,kart)
racer.location=(0,.18,.52)
racer.scale=(.62,)*3

def path(t):
    # frame positions are the landing points of the six jumps.
    keys=[(61,7.0,0),(82,10.4,0),(103,14.3,1.05),
          (124,19,1.75),(143,23.8,1.05),(162,28.8,.5),(180,33.5,.5)]
    if t<=keys[0][0]: return keys[0][1],keys[0][2],0
    for (fa,xa,za),(fb,xb,zb) in zip(keys,keys[1:]):
        if t<=fb:
            p=(t-fa)/(fb-fa)
            return xa+(xb-xa)*p,za+(zb-za)*p+1.65*math.sin(math.pi*p),p
    return keys[-1][1],keys[-1][2],0

for f in range(1,242):
    kart.location=(min(7.0,(f-1)*.1167),-.35,.3)
    kart.rotation_euler[2]=.03*math.sin(f*.2)
    kart.keyframe_insert(data_path="location",frame=f)
    kart.keyframe_insert(data_path="rotation_euler",frame=f)
    x,z,p=path(f)
    runner.location=(x,-.2,z+.28)
    runner.rotation_euler[2]=.05*math.sin(f*.1)
    runner.keyframe_insert(data_path="location",frame=f)
    runner.keyframe_insert(data_path="rotation_euler",frame=f)
    for i,o in enumerate(legs):
        o.rotation_euler[0]=.52*math.sin(f*.45+i*math.pi)
        o.keyframe_insert(data_path="rotation_euler",frame=f)
    for i,o in enumerate(arms):
        o.rotation_euler[0]=-.45*math.sin(f*.45+i*math.pi)
        o.keyframe_insert(data_path="rotation_euler",frame=f)
for o,show in [(kart,False),(runner,True)]:
    for f,s in [(1,not show),(60,not show),(61,show),(241,show)]:
        o.scale=(1,1,1) if s else (0,0,0)
        o.keyframe_insert(data_path="scale",frame=f)

# An angled tracking camera keeps the route and next landing visible.
bpy.ops.object.camera_add(location=(-6,-12,8))
cam=bpy.context.object; cam.name="platform game camera"
bpy.context.scene.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=17.4
for f in range(1,242):
    if f<=61: x=min(7.0,(f-1)*.1167)
    else: x=path(f)[0]
    target=Vector((x+1.2,0,1.1))
    cam.location=(x-6.1,-12.2,8.4)
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.keyframe_insert(data_path="location",frame=f)
    cam.keyframe_insert(data_path="rotation_euler",frame=f)

# Camera-parented typography remains stable while the level scrolls behind it.
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font=bpy.data.fonts.load(fontpath)
def text_overlay(name, string, y, size, material, start, end, z=-1.4):
    bpy.ops.object.text_add()
    o=bpy.context.object; o.name=name
    o.data.body=string; o.data.font=font
    o.data.align_x='CENTER'; o.data.align_y='CENTER'; o.data.size=size
    assign(o,material)
    parent(o,cam); o.location=(0,y,z); o.rotation_euler=(0,0,0)
    keys=[(1,0),(start-1,0),(start,1),(end,1)]
    if end < 241: keys += [(end+1,0),(241,0)]
    for f,s in keys:
        o.scale=(s,s,s); o.keyframe_insert(data_path="scale",frame=f)
    return o

text_overlay("race caption","RACE THROUGH THE AGES",3.9,.63,letter_white,5,60)
text_overlay("jump caption","LEAP. SWING. COLLECT.",3.9,.68,letter_gold,65,143)
text_overlay("time caption","PLAY THE SONG. BEND TIME.",3.9,.63,letter_white,148,180)

card=parent(cube("title card background",(0,0,0),(25,15,.02),navy),cam)
card.location=(0,0,-2)
for f,s in [(1,0),(180,0),(181,1),(241,1)]:
    card.scale=(s,s,s); card.keyframe_insert(data_path="scale",frame=f)
text_overlay("game title top","SUPER DONKEY",1.5,1.35,letter_gold,181,241,-1.5)
text_overlay("game title lower","KART OF TIME",-.1,1.35,letter_white,181,241,-1.5)
text_overlay("game slogan","RACE  •  CLIMB  •  EXPLORE  •  REWIND",-1.55,.46,letter_cyan,181,241,-1.5)
text_overlay("coming soon","COMING SOON",-3.4,.7,letter_gold,199,241,-1.5)
for x in [-5.75,5.75]:
    coin_o=coin(0,0,0)
    parent(coin_o,cam); coin_o.location=(x,0,-1.4)
    for f,s in [(1,0),(180,0),(181,1),(241,1)]:
        coin_o.scale=(s,s,s); coin_o.keyframe_insert(data_path="scale",frame=f)

world=bpy.context.scene.world
world.color=(.38,.7,.95)
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.7,.95,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
bpy.ops.object.light_add(type='AREA',location=(15,-8,17))
sun=bpy.context.object; sun.name="sun key"; sun.data.energy=1700; sun.data.shape='DISK'; sun.data.size=12
sun.rotation_euler=(Vector((16,0,0))-sun.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(20,8,11))
fill=bpy.context.object; fill.name="soft fill"; fill.data.energy=1000; fill.data.size=15
fill.rotation_euler=(Vector((20,0,0))-fill.location).to_track_quat('-Z','Y').to_euler()

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960; scene.render.resolution_y=540; scene.render.resolution_percentage=100
scene.render.film_transparent=False
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGB'
scene.render.filepath=os.path.join(OUT,'frame_')
scene.render.fps=24
scene.frame_start=1; scene.frame_end=240
scene.eevee.taa_render_samples=16
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast'
scene.view_settings.exposure=0
scene.camera.data.lens=45
scene.render.image_settings.color_depth='8'

# Render only when invoked with --render; --preview writes a single representative frame.
import sys
if '--preview' in sys.argv:
    frame=next((int(a.split('=')[1]) for a in sys.argv if a.startswith('--frame=')),135)
    scene.frame_set(frame)
    scene.render.filepath=os.path.join(ROOT,'build','preview-3d.png')
    bpy.ops.render.render(write_still=True)
elif '--render' in sys.argv:
    bpy.ops.render.render(animation=True)
