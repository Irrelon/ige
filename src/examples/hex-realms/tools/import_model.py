#!/usr/bin/env python3
"""
Import a GLB from AssetFurnace into Hex Realms.

    python3 -I tools/import_model.py --id warrior --out assets/models \
        --model warrior_rigged.glb --move idle=warrior_idle.glb --move walk=warrior_walk.glb

What it does to the model:
- Textures: the base colour and normal maps are shrunk (512 px by default) and
  re-encoded as JPEG (PNG when the material uses alpha). The metallic/roughness
  map is dropped in favour of flat matte values: it is tiny on screen, and
  AssetFurnace writes it as WebP behind EXT_texture_webp, which the engine's
  glTF loader doesn't read.
- Animations: each --move file's clips are merged into the model, matched to
  its bones by node name, and named after the move (idle, walk, attack, ...).
  The walk is made in place: the game moves units, so the hips' forward drift
  is taken out (only their bob is kept).
- Props with --level are turned so their base is flat (AssetFurnace's come
  out pitched by the angle of the picture they were made from).
- Units with --team-mask get a team-colour mask (<id>_team.png beside the
  model) and their team areas turned grey; see team_texture().
- Unused images, textures and buffer views are removed.
- assets/models/models.json records each model's bounds (so the game can fit
  it to a tile), triangle count and clip names, and with --yaw the turn that
  makes its front face +Z (the game's forward).

Pillow is needed, and numpy for --team-mask.
"""

import argparse
import io
import json
import math
import os
import struct
import sys

from PIL import Image

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def read_glb(path):
    data = open(path, "rb").read()
    magic, version, _ = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2:
        raise SystemExit(f"{path}: not a glTF 2.0 binary")
    off, gltf, binary = 12, None, b""
    while off < len(data):
        length, kind = struct.unpack_from("<II", data, off)
        off += 8
        chunk = data[off:off + length]
        off += length
        if kind == JSON_CHUNK:
            gltf = json.loads(chunk)
        elif kind == BIN_CHUNK:
            binary = chunk
    return gltf, binary


class Model:
    """A glTF document plus one blob per buffer view, so views can be replaced, added and dropped."""

    def __init__(self, path):
        self.g, binary = read_glb(path)
        self.blobs = []
        for view in self.g.get("bufferViews", []):
            start = view.get("byteOffset", 0)
            self.blobs.append(binary[start:start + view["byteLength"]])

    def add_view(self, blob, **props):
        self.g.setdefault("bufferViews", []).append({"buffer": 0, "byteLength": len(blob), **props})
        self.blobs.append(blob)
        return len(self.blobs) - 1

    def write(self, path):
        g = self.g
        out = bytearray()
        for view, blob in zip(g["bufferViews"], self.blobs):
            while len(out) % 4:
                out.append(0)
            view["byteOffset"] = len(out)
            view["byteLength"] = len(blob)
            view["buffer"] = 0
            out += blob
        while len(out) % 4:
            out.append(0)
        g["buffers"] = [{"byteLength": len(out)}]
        text = json.dumps(g, separators=(",", ":")).encode()
        while len(text) % 4:
            text += b" "
        total = 12 + 8 + len(text) + 8 + len(out)
        with open(path, "wb") as f:
            f.write(struct.pack("<4sII", b"glTF", 2, total))
            f.write(struct.pack("<II", len(text), JSON_CHUNK))
            f.write(text)
            f.write(struct.pack("<II", len(out), BIN_CHUNK))
            f.write(out)


# ------------------------------------------------------------------
# Textures
# ------------------------------------------------------------------

def texture_roles(g):
    """Texture index -> set of roles it plays in materials."""
    roles = {}
    for m in g.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        for role, ref in (("base", pbr.get("baseColorTexture")), ("mr", pbr.get("metallicRoughnessTexture")),
                          ("normal", m.get("normalTexture")), ("occlusion", m.get("occlusionTexture")),
                          ("emissive", m.get("emissiveTexture"))):
            if ref is not None:
                roles.setdefault(ref["index"], set()).add(role)
    return roles


def process_textures(model, size, lossless_base=False):
    g = model.g
    # Textures only reachable through EXT_texture_webp get a plain source (browsers decode WebP)
    for t in g.get("textures", []):
        ext = t.get("extensions", {})
        if "source" not in t and "EXT_texture_webp" in ext:
            t["source"] = ext["EXT_texture_webp"]["source"]
        ext.pop("EXT_texture_webp", None)
        if "extensions" in t and not t["extensions"]:
            del t["extensions"]
    for key in ("extensionsUsed", "extensionsRequired"):
        if key in g:
            g[key] = [e for e in g[key] if e != "EXT_texture_webp"]
            if not g[key]:
                del g[key]

    # Matte instead of a metallic/roughness map; no occlusion map
    for m in g.get("materials", []):
        pbr = m.setdefault("pbrMetallicRoughness", {})
        if pbr.pop("metallicRoughnessTexture", None) is not None or "metallicFactor" not in pbr:
            pbr["metallicFactor"] = 0.0
            pbr["roughnessFactor"] = 0.85
        m.pop("occlusionTexture", None)
        # The engine lights glTF models by their vertex normals and doesn't read normal maps
        m.pop("normalTexture", None)

    alpha = any(m.get("alphaMode", "OPAQUE") != "OPAQUE" for m in g.get("materials", []))
    roles = texture_roles(g)
    done = {}
    for index, t in enumerate(g.get("textures", [])):
        if index not in roles or "source" not in t:
            continue
        source = t["source"]
        if source in done:
            continue
        image = g["images"][source]
        blob = model.blobs[image["bufferView"]]
        picture = Image.open(io.BytesIO(blob))
        picture.load()
        if max(picture.size) > size:
            picture.thumbnail((size, size), Image.LANCZOS)
        keep_alpha = alpha and "base" in roles[index] and picture.mode in ("RGBA", "LA", "P")
        # Units keep their colour map lossless: the game repaints its magenta team areas
        if lossless_base and "base" in roles[index] and not keep_alpha:
            buf = io.BytesIO()
            picture.convert("RGB").save(buf, "PNG", optimize=True)
            image["bufferView"] = model.add_view(buf.getvalue())
            image["mimeType"] = "image/png"
            image.pop("uri", None)
            done[source] = True
            continue
        buf = io.BytesIO()
        if keep_alpha:
            picture.convert("RGBA").save(buf, "PNG", optimize=True)
            mime = "image/png"
        else:
            picture.convert("RGB").save(buf, "JPEG", quality=88 if "normal" in roles[index] else 82, optimize=True)
            mime = "image/jpeg"
        image["bufferView"] = model.add_view(buf.getvalue())
        image["mimeType"] = mime
        image.pop("uri", None)
        done[source] = True


# ------------------------------------------------------------------
# Team colours
# ------------------------------------------------------------------

def read_accessor(model, index):
    """An accessor's values as a numpy array (rows of components)."""
    import numpy as np
    g = model.g
    acc = g["accessors"][index]
    view = g["bufferViews"][acc["bufferView"]]
    comps = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    dtype = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[acc["componentType"]]
    item = np.dtype(dtype).itemsize
    stride = view.get("byteStride", item * comps)
    blob = model.blobs[acc["bufferView"]]
    off = acc.get("byteOffset", 0)
    rows = np.ndarray((acc["count"], comps), dtype=dtype, buffer=blob, offset=off, strides=(stride, item))
    return rows.copy()


def _shift(m, dy, dx):
    import numpy as np
    out = np.zeros_like(m)
    h, w = m.shape[:2]
    out[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = m[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
    return out


def _dilate(m, r):
    import numpy as np
    out = m.copy()
    for d in range(1, r + 1):
        out = out | _shift(m, 0, d) | _shift(m, 0, -d)
    rows = out.copy()
    for d in range(1, r + 1):
        out = out | _shift(rows, d, 0) | _shift(rows, -d, 0)
    return out


def team_texture(model, mask_path):
    """
    Build a unit's team-colour mask once, at import, and turn its team
    areas neutral grey. AssetFurnace's textures have no exact magenta: the
    bake shades it (folds go dark crimson, highlights pale violet), drifts
    and smears it, so the mask is found carefully here instead of guessed
    at every load:

    - seeds: clearly magenta texels (hue 305-335, saturation over 0.6);
    - growth: up to 8 texels into neighbours that could be their folds and
      highlights (hue 270-8, saturation over 0.18), and any clearly violet
      texel anywhere (hue 280-345, saturation over 0.3);
    - a closing (holes up to about 6 texels filled) and speck filling;
    - per triangle, through the UV map: a triangle whose texels are at
      least 30% team colour becomes team colour throughout, so team areas
      follow the mesh (a tabard, a cloak) instead of the bake's smears.

    Team texels become grey with a trace of their shading (the game
    multiplies the grey by the team colour, as strategy games do with a
    team-colour mask). Outside them, the lilac cast the magenta leaves on
    steel is turned grey, and texels no triangle uses are filled from their
    neighbours (edge padding), so smaller mip levels don't average dark
    gaps into the seams. The mask is saved as a greyscale PNG (white =
    team colour) beside the model, where it can be checked or touched up.
    Returns True when the model has team areas.
    """
    import numpy as np
    g = model.g
    roles = texture_roles(g)
    base_tex = next((i for i, r in roles.items() if "base" in r), None)
    if base_tex is None:
        return False
    image = g["images"][g["textures"][base_tex]["source"]]
    a = np.asarray(Image.open(io.BytesIO(model.blobs[image["bufferView"]])).convert("RGB")).astype(np.float32)
    h, w = a.shape[:2]
    r, gr, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    delta = mx - mn
    safe = np.maximum(delta, 1e-6)
    sat = np.where(mx > 0, delta / np.maximum(mx, 1e-6), 0)
    hue = np.where(mx == r, (gr - b) / safe * 60, np.where(mx == gr, (2 + (b - r) / safe) * 60, (4 + (r - gr) / safe) * 60))
    hue = np.where(delta > 0, (hue + 360) % 360, 0)

    strong = (mx >= 40) & (delta >= 30) & \
        (np.clip(1 - (np.abs(hue - 320) - 15) / 8, 0, 1) * np.clip((sat - 0.5) / 0.12, 0, 1) > 0.5)
    if strong.sum() < 0.002 * w * h:
        return False
    near = (mx >= 10) & (sat >= 0.18) & ((hue >= 270) | (hue <= 8))
    team = strong.copy()
    for _ in range(8):
        team |= _dilate(team, 1) & near
    team |= (mx >= 25) & (sat >= 0.3) & (hue >= 280) & (hue <= 345)
    team |= ~_dilate(~_dilate(team, 3), 3)
    for _ in range(2):
        around = sum(_shift(team, dy, dx).astype(np.int8) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
        team |= around >= 5

    # Per triangle, through the UV map
    paint = np.zeros((h, w), bool)
    used = np.zeros((h, w), bool)
    for mesh in g.get("meshes", []):
        for prim in mesh.get("primitives", []):
            mat = g.get("materials", [])[prim["material"]] if "material" in prim else None
            ref = (mat or {}).get("pbrMetallicRoughness", {}).get("baseColorTexture")
            if not ref or ref["index"] != base_tex:
                continue
            uv = read_accessor(model, prim["attributes"][f"TEXCOORD_{ref.get('texCoord', 0)}"]).astype(np.float64)
            uv[:, 0] *= w
            uv[:, 1] *= h
            idx = read_accessor(model, prim["indices"]).ravel() if "indices" in prim else np.arange(len(uv))
            for t in range(0, len(idx) - 2, 3):
                (ax, ay), (bx, by), (cx, cy) = uv[idx[t]], uv[idx[t + 1]], uv[idx[t + 2]]
                area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
                if abs(area) < 1e-9:
                    continue
                x0, x1 = max(0, int(min(ax, bx, cx))), min(w - 1, int(max(ax, bx, cx)) + 1)
                y0, y1 = max(0, int(min(ay, by, cy))), min(h - 1, int(max(ay, by, cy)) + 1)
                ys, xs = np.mgrid[y0:y1 + 1, x0:x1 + 1]
                px, py = xs + 0.5, ys + 0.5
                e0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / area
                e1 = ((cx - bx) * (py - by) - (cy - by) * (px - bx)) / area
                e2 = ((ax - cx) * (py - cy) - (ay - cy) * (px - cx)) / area
                inside = (e0 >= -0.02) & (e1 >= -0.02) & (e2 >= -0.02)
                if not inside.any():
                    continue
                cy_, cx_ = ys[inside], xs[inside]
                used[cy_, cx_] = True
                if team[cy_, cx_].mean() >= 0.3:
                    paint[cy_, cx_] = True
    if used.any():
        team |= _dilate(paint, 1)
        used = _dilate(used, 1)

    # Team texels to grey, keeping a trace of their shading (headroom: the game multiplies by TEAM_LIFT)
    shade = np.clip(0.8 + 0.2 * (mx / 255 / 0.55), 0.72, 1.08)
    grey = np.clip(255 * shade / 1.08, 0, 255)
    a[team] = grey[team][:, None]
    # Spill: weak violet outside the team areas turns grey
    k = np.clip((0.4 - sat) / 0.15, 0, 1) * np.clip((hue - 250) / 12, 0, 1)
    k = np.where(~team & (mx >= 20) & (delta > 0) & (sat < 0.4) & (hue >= 250) & (hue <= 350), k, 0)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    a += (lum[..., None] - a) * k[..., None]
    # Edge padding
    if used.any():
        done = used.copy()
        for _ in range(8):
            total = np.zeros_like(a)
            count = np.zeros((h, w), np.float32)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dy or dx:
                        sd = _shift(done, dy, dx)
                        total += _shift(a, dy, dx) * sd[..., None]
                        count += sd
            fill = ~done & (count > 0)
            if not fill.any():
                break
            a[fill] = total[fill] / count[fill][:, None]
            done |= fill

    buf = io.BytesIO()
    Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), "RGB").save(buf, "PNG", optimize=True)
    image["bufferView"] = model.add_view(buf.getvalue())
    image["mimeType"] = "image/png"
    Image.fromarray((team * 255).astype(np.uint8), "L").save(mask_path, optimize=True)
    return True


# ------------------------------------------------------------------
# Animations from move files
# ------------------------------------------------------------------

def merge_moves(model, moves):
    g = model.g
    by_name = {n.get("name"): i for i, n in enumerate(g.get("nodes", [])) if n.get("name")}
    added = []
    for move, path in moves:
        src = Model(path)
        sg = src.g
        view_map, accessor_map = {}, {}

        def copy_accessor(a):
            if a in accessor_map:
                return accessor_map[a]
            acc = dict(sg["accessors"][a])
            if "bufferView" in acc:
                v = acc["bufferView"]
                if v not in view_map:
                    props = {k: sg["bufferViews"][v][k] for k in ("byteStride", "target") if k in sg["bufferViews"][v]}
                    view_map[v] = model.add_view(src.blobs[v], **props)
                acc["bufferView"] = view_map[v]
            acc.pop("sparse", None)
            g.setdefault("accessors", []).append(acc)
            accessor_map[a] = len(g["accessors"]) - 1
            return accessor_map[a]

        for k, anim in enumerate(sg.get("animations", [])):
            samplers, channels = [], []
            for ch in anim["channels"]:
                node = ch["target"].get("node")
                name = sg["nodes"][node].get("name") if node is not None else None
                if name not in by_name:
                    continue
                s = anim["samplers"][ch["sampler"]]
                samplers.append({"input": copy_accessor(s["input"]), "output": copy_accessor(s["output"]),
                                 "interpolation": s.get("interpolation", "LINEAR")})
                channels.append({"sampler": len(samplers) - 1, "target": {"node": by_name[name], "path": ch["target"]["path"]}})
            if channels:
                clip = move if k == 0 else f"{move}_{k}"
                g.setdefault("animations", []).append({"name": clip, "samplers": samplers, "channels": channels})
                added.append(clip)
    return added


def smooth_normals(model, passes, max_angle=60.0):
    """
    Rebuild the vertex normals from the surface. The engine lights models by
    their vertex normals (it doesn't read glTF normal maps), and AssetFurnace's
    are noisy: across a triangle they differ by about 28 degrees on average and
    4% point away from their own triangle, which showed as dark strokes and
    blotches on the side facing away from the sun. Each vertex's normal becomes
    the area-weighted average of the triangles around its position that face
    within `max_angle` of its own triangles (like a modelling tool's auto
    smooth), so a cloak's front and back, which share positions, don't mix.
    Then `passes` rounds of averaging with neighbours that agree within the
    same angle soften what's left of the bumps.
    """
    import numpy as np
    g = model.g
    limit = math.cos(math.radians(max_angle))
    done = set()
    for mesh in g.get("meshes", []):
        for prim in mesh.get("primitives", []):
            if "NORMAL" not in prim["attributes"] or "indices" not in prim:
                continue
            key = (prim["attributes"]["POSITION"], prim["indices"])
            if key in done:
                continue
            done.add(key)
            pos = read_accessor(model, prim["attributes"]["POSITION"]).astype(np.float64)
            tri = read_accessor(model, prim["indices"]).ravel().astype(np.int64).reshape(-1, 3)
            fn = np.cross(pos[tri[:, 1]] - pos[tri[:, 0]], pos[tri[:, 2]] - pos[tri[:, 0]])  # length = 2 x area
            fu = fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-20)
            # Each vertex's own direction: the triangles that use it
            own = np.zeros_like(pos)
            for k in range(3):
                np.add.at(own, tri[:, k], fn)
            own /= np.maximum(np.linalg.norm(own, axis=1, keepdims=True), 1e-20)
            # Triangles around each position (vertices welded by position)
            _, group = np.unique(np.round(pos, 5), axis=0, return_inverse=True)
            group = group.ravel()
            faces_at = [[] for _ in range(group.max() + 1)]
            for f, (a, b, c) in enumerate(tri):
                for v in (a, b, c):
                    faces_at[group[v]].append(f)
            faces_at = [np.unique(np.array(fs, dtype=np.int64)) for fs in faces_at]
            normals = np.zeros_like(pos)
            for v in range(len(pos)):
                fs = faces_at[group[v]]
                agree = fs[fu[fs] @ own[v] > limit]
                n = fn[agree].sum(0) if len(agree) else own[v]
                normals[v] = n / max(np.linalg.norm(n), 1e-20)
            # Soften: average with neighbours (sharing a triangle, by position) that agree
            if passes:
                neighbours = [set() for _ in range(group.max() + 1)]
                for a, b, c in tri:
                    ga, gb, gc = group[a], group[b], group[c]
                    neighbours[ga].update((gb, gc)); neighbours[gb].update((ga, gc)); neighbours[gc].update((ga, gb))
                members = [[] for _ in range(group.max() + 1)]
                for v in range(len(pos)):
                    members[group[v]].append(v)
                for _ in range(passes):
                    nxt = normals.copy()
                    for v in range(len(pos)):
                        acc = normals[v].copy()
                        for gq in neighbours[group[v]]:
                            for u in members[gq]:
                                if normals[u] @ normals[v] > limit:
                                    acc += normals[u]
                        nxt[v] = acc / max(np.linalg.norm(acc), 1e-20)
                    normals = nxt
            flat = normals.astype(np.float32).ravel().tolist()
            view = model.add_view(struct.pack(f"<{len(flat)}f", *flat))
            g["accessors"].append({"bufferView": view, "componentType": 5126, "count": len(pos), "type": "VEC3"})
            new = len(g["accessors"]) - 1
            old = prim["attributes"]["NORMAL"]
            for other in mesh.get("primitives", []):
                if other["attributes"].get("NORMAL") == old:
                    other["attributes"]["NORMAL"] = new


def in_place(model, clip="walk"):
    """
    Take the forward drift out of a clip. AssetFurnace's walk carries the
    hips forward about 2.4 model units a cycle (more than a tile at game
    size) and snaps back when it loops; the game moves units itself, so the
    hips keep their rest x and z and only their bob (y) is kept.
    """
    g = model.g
    joints = set(g["skins"][0]["joints"]) if g.get("skins") else set()
    parent = {c: i for i, n in enumerate(g["nodes"]) for c in n.get("children", [])}
    roots = [j for j in joints if parent.get(j) not in joints]
    if not roots:
        return False
    root = roots[0]
    rest = g["nodes"][root].get("translation", [0, 0, 0])
    changed = False
    for anim in g.get("animations", []):
        if anim.get("name") != clip:
            continue
        for ch in anim["channels"]:
            if ch["target"].get("node") != root or ch["target"]["path"] != "translation":
                continue
            sampler = anim["samplers"][ch["sampler"]]
            acc = g["accessors"][sampler["output"]]
            blob = model.blobs[acc["bufferView"]]
            off = acc.get("byteOffset", 0)
            values = [struct.unpack_from("<3f", blob, off + k * 12) for k in range(acc["count"])]
            flat = [c for v in values for c in (rest[0], v[1], rest[2])]
            view = model.add_view(struct.pack(f"<{len(flat)}f", *flat))
            new = {"bufferView": view, "componentType": 5126, "count": acc["count"], "type": "VEC3"}
            g["accessors"].append(new)
            sampler["output"] = len(g["accessors"]) - 1
            changed = True
    return changed


# ------------------------------------------------------------------
# Clean-up and bounds
# ------------------------------------------------------------------

def remove_unused(model):
    g = model.g
    used_textures = sorted(texture_roles(g))
    tex_map = {old: new for new, old in enumerate(used_textures)}
    textures = [g["textures"][i] for i in used_textures] if "textures" in g else []

    def remap_tex(ref):
        if ref is not None:
            ref["index"] = tex_map[ref["index"]]

    for m in g.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        remap_tex(pbr.get("baseColorTexture"))
        remap_tex(m.get("normalTexture"))
        remap_tex(m.get("emissiveTexture"))

    used_images = sorted({t["source"] for t in textures if "source" in t})
    img_map = {old: new for new, old in enumerate(used_images)}
    images = [g["images"][i] for i in used_images] if "images" in g else []
    for t in textures:
        if "source" in t:
            t["source"] = img_map[t["source"]]

    used_samplers = sorted({t["sampler"] for t in textures if "sampler" in t})
    smp_map = {old: new for new, old in enumerate(used_samplers)}
    samplers = [g["samplers"][i] for i in used_samplers] if "samplers" in g else []
    for t in textures:
        if "sampler" in t:
            t["sampler"] = smp_map[t["sampler"]]

    for key, value in (("textures", textures), ("images", images), ("samplers", samplers)):
        if value:
            g[key] = value
        else:
            g.pop(key, None)

    views = set()
    for a in g.get("accessors", []):
        if "bufferView" in a:
            views.add(a["bufferView"])
        for part in ("indices", "values"):
            if "sparse" in a:
                views.add(a["sparse"][part]["bufferView"])
    for img in g.get("images", []):
        if "bufferView" in img:
            views.add(img["bufferView"])
    order = sorted(views)
    view_map = {old: new for new, old in enumerate(order)}
    g["bufferViews"] = [g["bufferViews"][i] for i in order]
    model.blobs = [model.blobs[i] for i in order]
    for a in g.get("accessors", []):
        if "bufferView" in a:
            a["bufferView"] = view_map[a["bufferView"]]
        if "sparse" in a:
            for part in ("indices", "values"):
                a["sparse"][part]["bufferView"] = view_map[a["sparse"][part]["bufferView"]]
    for img in g.get("images", []):
        if "bufferView" in img:
            img["bufferView"] = view_map[img["bufferView"]]


def mat_mul(a, b):
    return [sum(a[r + 4 * k] * b[k + 4 * c] for k in range(4)) for c in range(4) for r in range(4)]


def node_matrix(n):
    if "matrix" in n:
        return list(n["matrix"])
    tx, ty, tz = n.get("translation", [0, 0, 0])
    qx, qy, qz, qw = n.get("rotation", [0, 0, 0, 1])
    sx, sy, sz = n.get("scale", [1, 1, 1])
    r = [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy + qz * qw), 2 * (qx * qz - qy * qw), 0,
         2 * (qx * qy - qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz + qx * qw), 0,
         2 * (qx * qz + qy * qw), 2 * (qy * qz - qx * qw), 1 - 2 * (qx * qx + qy * qy), 0,
         0, 0, 0, 1]
    for i in range(3):
        r[i] *= sx
        r[4 + i] *= sy
        r[8 + i] *= sz
    r[12], r[13], r[14] = tx, ty, tz
    return r


def vertices(model, node_index, matrix):
    """A mesh node's vertex positions, transformed by matrix."""
    g = model.g
    out = []
    for prim in g["meshes"][g["nodes"][node_index]["mesh"]]["primitives"]:
        acc = g["accessors"][prim["attributes"]["POSITION"]]
        view = g["bufferViews"][acc["bufferView"]]
        blob = model.blobs[acc["bufferView"]]
        stride = view.get("byteStride", 12)
        off = acc.get("byteOffset", 0)
        m = matrix
        for k in range(acc["count"]):
            x, y, z = struct.unpack_from("<3f", blob, off + k * stride)
            out.append((m[0] * x + m[4] * y + m[8] * z + m[12],
                        m[1] * x + m[5] * y + m[9] * z + m[13],
                        m[2] * x + m[6] * y + m[10] * z + m[14]))
    return out


def scene_roots(g):
    return g["scenes"][g.get("scene", 0)]["nodes"] if g.get("scenes") else list(range(len(g.get("nodes", []))))


def prop_points(model):
    """Every vertex of a model's unskinned meshes, with node transforms applied."""
    g = model.g
    points = []

    def visit(index, parent):
        node = g["nodes"][index]
        world = mat_mul(parent, node_matrix(node))
        if "mesh" in node and "skin" not in node:
            points.extend(vertices(model, index, world))
        for child in node.get("children", []):
            visit(child, world)

    for root in scene_roots(g):
        visit(root, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    return points


def support(points):
    """
    How much of the footprint a model stands on: the area of the convex hull
    of its lowest points (within 2% of its height) over the area of its
    footprint. A pitched building touches the ground along one edge (under
    0.08); one already standing level rests on a broad base or on several
    feet or hooves (0.15 and up).
    """
    ys = [p[1] for p in points]
    y0, y1 = min(ys), max(ys)
    low = sorted({(round(p[0], 3), round(p[2], 3)) for p in points if p[1] < y0 + 0.02 * (y1 - y0)})
    xs, zs = [p[0] for p in points], [p[2] for p in points]
    foot = (max(xs) - min(xs)) * (max(zs) - min(zs))
    if len(low) < 3 or foot <= 0:
        return 0.0

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in low:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(low):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = lower[:-1] + upper[:-1]
    area = abs(sum(hull[i][0] * hull[(i + 1) % len(hull)][1] - hull[(i + 1) % len(hull)][0] * hull[i][1] for i in range(len(hull)))) / 2
    return area / foot


def level(model, max_tilt=40.0):
    """
    Stand a prop level. AssetFurnace builds each model from a picture taken
    from above at three-quarters, and the mesh comes out pitched by roughly
    that camera's angle (8-32 degrees forward for this game's buildings), so
    one side of its base floats while the other sinks. Fit a plane through
    the lowest points of the base (the lowest point of each cell of a 6 x 6
    grid over the footprint, within the bottom quarter of the model) and put
    the scene under a node whose rotation turns that plane flat. Returns the
    tilt removed, in degrees.
    """
    points = prop_points(model)
    if not points:
        return 0.0
    if support(points) >= 0.12:
        return 0.0  # already standing on a broad base (or its feet): fitting the lowest quarter would tip it
    ys = [p[1] for p in points]
    y0, y1 = min(ys), max(ys)
    xs, zs = [p[0] for p in points], [p[2] for p in points]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    n = 6
    cells = {}
    for x, y, z in points:
        if y > y0 + 0.25 * (y1 - y0):
            continue
        key = (min(n - 1, int((x - x0) / (x1 - x0 + 1e-9) * n)), min(n - 1, int((z - z0) / (z1 - z0 + 1e-9) * n)))
        if key not in cells or y < cells[key][1]:
            cells[key] = (x, y, z)
    lows = list(cells.values())
    if len(lows) < 4:
        return 0.0
    # Least squares: y = a x + c z + d
    sxx = sum(p[0] * p[0] for p in lows); sxz = sum(p[0] * p[2] for p in lows); szz = sum(p[2] * p[2] for p in lows)
    sx = sum(p[0] for p in lows); sz = sum(p[2] for p in lows); m = len(lows)
    sxy = sum(p[0] * p[1] for p in lows); szy = sum(p[2] * p[1] for p in lows); sy = sum(p[1] for p in lows)
    A = [[sxx, sxz, sx], [sxz, szz, sz], [sx, sz, m]]
    B = [sxy, szy, sy]

    def det(M):
        return (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
                + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]))

    D = det(A)
    if abs(D) < 1e-12:
        return 0.0
    solution = []
    for i in range(3):
        M = [row[:] for row in A]
        for r in range(3):
            M[r][i] = B[r]
        solution.append(det(M) / D)
    a, c = solution[0], solution[1]
    # The base's up direction, and the rotation taking it to +Y
    nx, ny, nz = -a, 1.0, -c
    length = math.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / length, ny / length, nz / length
    tilt = math.degrees(math.acos(max(-1.0, min(1.0, ny))))
    if tilt < 2 or tilt > max_tilt:
        if tilt > max_tilt:
            print(f"  base tilt {tilt:.1f} degrees looks wrong; left as it is", file=sys.stderr)
        return 0.0
    ax, az = -nz, nx  # n x up: turning about it takes n onto +Y
    axis_len = math.hypot(ax, az)
    half = math.radians(tilt) / 2
    q = [ax / axis_len * math.sin(half), 0.0, az / axis_len * math.sin(half), math.cos(half)]
    g = model.g
    g["nodes"].append({"name": "level", "rotation": [round(v, 6) for v in q], "children": list(scene_roots(g))})
    if g.get("scenes"):
        g["scenes"][g.get("scene", 0)]["nodes"] = [len(g["nodes"]) - 1]
    else:
        g["scenes"], g["scene"] = [{"nodes": [len(g["nodes"]) - 1]}], 0
    return tilt


def bounds_and_triangles(model):
    """Bounds (exact for props, from the accessors' boxes for skinned meshes) and triangle count."""
    g = model.g
    lo, hi = [math.inf] * 3, [-math.inf] * 3
    triangles = 0
    scene = g.get("scenes", [{}])[g.get("scene", 0)] if g.get("scenes") else {"nodes": list(range(len(g.get("nodes", []))))}

    def visit(index, parent):
        nonlocal triangles
        node = g["nodes"][index]
        world = mat_mul(parent, node_matrix(node))
        if "mesh" in node and "skin" not in node:
            for prim in g["meshes"][node["mesh"]]["primitives"]:
                count = g["accessors"][prim["indices"]]["count"] if "indices" in prim else g["accessors"][prim["attributes"]["POSITION"]]["count"]
                triangles += count // 3
            for p in vertices(model, index, world):
                for i in range(3):
                    lo[i] = min(lo[i], p[i])
                    hi[i] = max(hi[i], p[i])
        elif "mesh" in node:
            # Skinned meshes are drawn in skeleton space: ignore the mesh node's own transform
            m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
            for prim in g["meshes"][node["mesh"]]["primitives"]:
                pos = g["accessors"][prim["attributes"]["POSITION"]]
                count = g["accessors"][prim["indices"]]["count"] if "indices" in prim else pos["count"]
                triangles += count // 3
                mn, mx = pos.get("min"), pos.get("max")
                if not mn or not mx:
                    continue
                for cx in (mn[0], mx[0]):
                    for cy in (mn[1], mx[1]):
                        for cz in (mn[2], mx[2]):
                            p = [m[0] * cx + m[4] * cy + m[8] * cz + m[12],
                                 m[1] * cx + m[5] * cy + m[9] * cz + m[13],
                                 m[2] * cx + m[6] * cy + m[10] * cz + m[14]]
                            for i in range(3):
                                lo[i] = min(lo[i], p[i])
                                hi[i] = max(hi[i], p[i])
        for child in node.get("children", []):
            visit(child, world)

    identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    for root in scene.get("nodes", []):
        visit(root, identity)
    return lo, hi, triangles


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True)
    ap.add_argument("--model", required=True, help="the finished (or rigged) GLB")
    ap.add_argument("--move", action="append", default=[], help="name=path of an animation GLB to merge")
    ap.add_argument("--out", required=True, help="assets/models folder")
    ap.add_argument("--size", type=int, default=512, help="largest texture side in pixels")
    ap.add_argument("--lossless-base", action="store_true", help="keep the base colour map as PNG (units: team-colour areas)")
    ap.add_argument("--team-mask", action="store_true", help="units: build the team-colour mask (<id>_team.png) and turn the team areas grey (see team_texture())")
    ap.add_argument("--smooth-normals", type=int, default=0, metavar="PASSES", help="smooth the vertex normals this many passes (see smooth_normals())")
    ap.add_argument("--level", action="store_true", help="props: turn the model so its base is flat (see level())")
    ap.add_argument("--yaw", type=float, help="degrees to turn the model so its front faces +Z (kept from the last import if not given)")
    args = ap.parse_args()

    model = Model(args.model)
    process_textures(model, args.size, args.lossless_base)
    clips = [a.get("name", f"clip{i}") for i, a in enumerate(model.g.get("animations", []))]
    moves = []
    for spec in args.move:
        name, _, path = spec.partition("=")
        moves.append((name, path))
    clips += merge_moves(model, moves)
    if args.smooth_normals:
        smooth_normals(model, args.smooth_normals)
    mask_file = f"{args.id}_team.png"
    os.makedirs(args.out, exist_ok=True)
    team = args.team_mask and team_texture(model, os.path.join(args.out, mask_file))
    if args.team_mask and not team:
        print("  no team-colour areas found", file=sys.stderr)
    if in_place(model, "walk"):
        print("  walk made in place (hips keep their rest x and z)", file=sys.stderr)
    remove_unused(model)
    tilt = level(model) if args.level and not model.g.get("skins") else 0.0
    if tilt:
        print(f"  levelled: base was tilted {tilt:.1f} degrees", file=sys.stderr)
    lo, hi, triangles = bounds_and_triangles(model)

    os.makedirs(args.out, exist_ok=True)
    out = os.path.join(args.out, f"{args.id}.glb")
    model.write(out)
    # Read back: it must parse
    read_glb(out)

    index_path = os.path.join(args.out, "models.json")
    index = json.load(open(index_path)) if os.path.exists(index_path) else {}
    yaw = math.radians(args.yaw) if args.yaw is not None else index.get(args.id, {}).get("yaw")
    index[args.id] = {
        "file": f"{args.id}.glb",
        "min": [round(v, 4) for v in lo],
        "max": [round(v, 4) for v in hi],
        "triangles": triangles,
        "animations": clips,
        "skinned": bool(model.g.get("skins")),
        "bytes": os.path.getsize(out),
        **({"yaw": round(yaw, 4)} if yaw else {}),
        **({"team": mask_file} if team else {})
    }
    tmp = index_path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(dict(sorted(index.items())), f, indent="\t")
    os.replace(tmp, index_path)
    print(json.dumps({"id": args.id, **index[args.id]}))


if __name__ == "__main__":
    sys.exit(main())
