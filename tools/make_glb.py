"""يولّد زجاجة عطر بصيغة GLB (بدون أي مكتبات). شغّله: python tools/make_glb.py
لاستخدام موديلك الخاص: ضعه في public/models/bottle.glb
وسمِّ شبكة السائل داخله Liquid ليتغيّر لونه حسب العطر."""
import json, struct, math, os
SEG = 72

def arc(cx, cy, r, a0, a1, n=8):
    return [(cx + r*math.cos(math.radians(a0+(a1-a0)*i/n)), cy + r*math.sin(math.radians(a0+(a1-a0)*i/n))) for i in range(n+1)]

def build(strips):
    pos, nor, idx = [], [], []
    for strip in strips:
        n = len(strip); sn = []
        for i in range(n-1):
            dr = strip[i+1][0]-strip[i][0]; dy = strip[i+1][1]-strip[i][1]; l = math.hypot(dr, dy) or 1
            sn.append((dy/l, -dr/l))
        vn = []
        for i in range(n):
            a = sn[max(i-1, 0)]; b = sn[min(i, n-2)]
            x, y = a[0]+b[0], a[1]+b[1]; l = math.hypot(x, y) or 1
            vn.append((x/l, y/l))
        base = len(pos)//3
        for s in range(SEG+1):
            th = 2*math.pi*s/SEG; c, sI = math.cos(th), math.sin(th)
            for i, (r, y) in enumerate(strip):
                pos += [r*c, y, r*sI]; nor += [vn[i][0]*c, vn[i][1], vn[i][0]*sI]
        for s in range(SEG):
            for i in range(n-1):
                a = base+s*n+i; b = a+1; c2 = a+n; d = c2+1
                for t in ((a, c2, b), (b, c2, d)):
                    p = [pos[k*3:k*3+3] for k in t]
                    u = [p[1][j]-p[0][j] for j in range(3)]; v = [p[2][j]-p[0][j] for j in range(3)]
                    cr = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
                    if math.sqrt(sum(q*q for q in cr)) < 1e-9: continue
                    nn = [sum(nor[k*3+j] for k in t) for j in range(3)]
                    if sum(cr[j]*nn[j] for j in range(3)) < 0: t = (t[0], t[2], t[1])
                    idx += list(t)
    return pos, nor, idx

R = 0.95
glass = [[(0, -1.5), (R, -1.5)],
         arc(R, -1.25, .25, -90, 0) + [(1.2, .95)] + arc(R, .95, .25, 0, 90)[1:],
         [(R, 1.2), (.45, 1.2)], [(.45, 1.2), (.4, 1.5)], [(.4, 1.5), (0, 1.5)]]
liquid = [[(0, -1.38), (.85, -1.38)], arc(.85, -1.18, .23, -90, 0), [(1.08, -1.18), (1.08, .5)], [(1.08, .5), (0, .5)]]
cyl = lambda r, y0, y1: [[(0, y0), (r, y0)], [(r, y0), (r, y1)], [(r, y1), (0, y1)]]
meshes = [("Glass", glass, 0), ("Liquid", liquid, 1), ("Cap", cyl(.6, 1.5, 2.4), 2), ("Collar", cyl(.52, 1.2, 1.5), 2)]
mats = [
 {"name": "GlassMat", "pbrMetallicRoughness": {"baseColorFactor": [.96, .97, 1, .28], "metallicFactor": 0, "roughnessFactor": .04}, "alphaMode": "BLEND", "doubleSided": True},
 {"name": "LiquidMat", "pbrMetallicRoughness": {"baseColorFactor": [.85, .34, .49, 1], "metallicFactor": 0, "roughnessFactor": .2}},
 {"name": "GoldMat", "pbrMetallicRoughness": {"baseColorFactor": [.8, .64, .41, 1], "metallicFactor": 1, "roughnessFactor": .25}}]
binb = bytearray(); views, accs, gmeshes, nodes = [], [], [], []
def add(data, fmt, target, ctype, count, typ, mm=None):
    off = len(binb); binb.extend(struct.pack('<%d%s' % (len(data), fmt), *data))
    views.append({"buffer": 0, "byteOffset": off, "byteLength": len(binb)-off, "target": target})
    a = {"bufferView": len(views)-1, "componentType": ctype, "count": count, "type": typ}
    if mm: a["min"], a["max"] = mm
    accs.append(a); return len(accs)-1
for name, strips, m in meshes:
    p, n, i = build(strips)
    xs, ys, zs = p[0::3], p[1::3], p[2::3]
    ap = add(p, 'f', 34962, 5126, len(p)//3, "VEC3", ([min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)]))
    an = add(n, 'f', 34962, 5126, len(n)//3, "VEC3")
    ai = add(i, 'I', 34963, 5125, len(i), "SCALAR")
    gmeshes.append({"name": name, "primitives": [{"attributes": {"POSITION": ap, "NORMAL": an}, "indices": ai, "material": m}]})
    nodes.append({"name": name, "mesh": len(gmeshes)-1})
gltf = {"asset": {"version": "2.0", "generator": "aurelle make_glb.py"}, "scene": 0, "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes, "meshes": gmeshes, "materials": mats, "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": len(binb)}]}
js = json.dumps(gltf, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4); binb += b'\0' * (-len(binb) % 4)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'models', 'bottle.glb')
with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12+8+len(js)+8+len(binb)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(binb), 0x004E4942)); f.write(binb)
print('OK', os.path.getsize(out), 'bytes ->', os.path.abspath(out))
