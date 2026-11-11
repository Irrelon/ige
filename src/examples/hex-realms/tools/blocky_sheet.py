"""
Contact sheet of the blocky art pack: every model drawn from about the
game's camera angle (orthographic, painter's algorithm, so the odd small
face can sort wrongly), labelled, in a grid.

  BLOCKY_DUMP=/tmp/boxes.json npx jest src/examples/hex-realms/view/blocky/dump
  python3 tools/blocky_sheet.py /tmp/boxes.json sheet.jpg [id-prefix,...]

COLS sets the number of columns (default 8).
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, dst = sys.argv[1], sys.argv[2]
only = sys.argv[3].split(",") if len(sys.argv) > 3 else None
data = json.load(open(src))
ids = [k for k in data if not only or any(k.startswith(o) for o in only)]

az, el = math.radians(28), math.radians(42)
d = np.array([-math.sin(az) * math.cos(el), -math.sin(el), -math.cos(az) * math.cos(el)])
right = np.cross(d, [0, 1, 0]); right /= np.linalg.norm(right)
up = np.cross(right, d)
L = np.array([0.45, 1.0, 0.7]); L /= np.linalg.norm(L)

def rot(rx, ry, rz):
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx

def bone_mats(bones, pose):
    mats = []
    for b in bones:
        p = pose.get(b["name"], {})
        R = rot(*(p.get("rot") or [0, 0, 0]))
        pv = np.array(b["pivot"], float)
        t = pv + np.array(p.get("pos") or [0, 0, 0], float)
        M = np.eye(4); M[:3, :3] = R; M[:3, 3] = t - R @ pv
        if b["parent"] >= 0: M = mats[b["parent"]] @ M
        mats.append(M)
    return mats

FACES = [((1,0,1),(1,0,0),(1,1,0),(1,1,1),(1,0,0)), ((0,0,0),(0,0,1),(0,1,1),(0,1,0),(-1,0,0)),
         ((0,1,1),(1,1,1),(1,1,0),(0,1,0),(0,1,0)), ((0,0,0),(1,0,0),(1,0,1),(0,0,1),(0,-1,0)),
         ((0,0,1),(1,0,1),(1,1,1),(0,1,1),(0,0,1)), ((1,0,0),(0,0,0),(0,1,0),(1,1,0),(0,0,-1))]

def quads(entry):
    mats = bone_mats(entry["bones"], entry.get("pose", {})) if entry.get("bones") else None
    out = []
    for lo, hi, c, bone in entry["boxes"]:
        M = mats[bone] if mats else np.eye(4)
        for *corners, n in FACES:
            pts = np.array([[hi[k] if cc[k] else lo[k] for k in range(3)] for cc in corners], float)
            pts = (M[:3, :3] @ pts.T).T + M[:3, 3]
            nn = M[:3, :3] @ np.array(n, float)
            if nn @ d >= -1e-6: continue
            out.append((pts, nn, c))
    return out

CELL, S = 240, 2
cols = int(os.environ.get("COLS", "8"))
rows = math.ceil(len(ids) / cols)
img = Image.new("RGB", (cols * CELL * S, rows * (CELL + 24) * S), (232, 238, 228))
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 15 * S)
except Exception:
    font = ImageFont.load_default()
for i, mid in enumerate(ids):
    qs = quads(data[mid])
    if not qs: continue
    allp = np.concatenate([q[0] for q in qs])
    px, py = allp @ right, allp @ up
    span = max(px.max() - px.min(), py.max() - py.min()) or 1
    k = (CELL - 30) * S / span
    ox = (i % cols) * CELL * S + CELL * S / 2 - (px.max() + px.min()) / 2 * k
    oy = (i // cols) * (CELL + 24) * S + CELL * S / 2 + (py.max() + py.min()) / 2 * k
    qs.sort(key=lambda q: -(q[0].mean(0) @ d))
    for pts, nn, c in qs:
        lam = 0.58 + 0.42 * max(0.0, float(nn @ L))
        col = tuple(min(255, int(((c >> s) & 255) * lam)) for s in (16, 8, 0))
        poly = [(ox + p @ right * k, oy - p @ up * k) for p in pts]
        draw.polygon(poly, fill=col, outline=tuple(int(v * 0.8) for v in col))
    draw.text(((i % cols) * CELL * S + 8 * S, (i // cols) * (CELL + 24) * S + (CELL - 2) * S), mid, fill=(40, 40, 40), font=font)
img = img.resize((img.width // S, img.height // S), Image.LANCZOS)
img.save(dst, quality=88)
print(len(ids), "models", img.size)
