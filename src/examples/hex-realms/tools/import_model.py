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
- Unused images, textures and buffer views are removed.
- assets/models/models.json records each model's bounds (so the game can fit
  it to a tile), triangle count and clip names.

Only the Python standard library and Pillow are needed.
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


def bounds_and_triangles(g):
    lo, hi = [math.inf] * 3, [-math.inf] * 3
    triangles = 0
    scene = g.get("scenes", [{}])[g.get("scene", 0)] if g.get("scenes") else {"nodes": list(range(len(g.get("nodes", []))))}

    def visit(index, parent):
        nonlocal triangles
        node = g["nodes"][index]
        world = mat_mul(parent, node_matrix(node))
        if "mesh" in node:
            # Skinned meshes are drawn in skeleton space: ignore the mesh node's own transform
            m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] if "skin" in node else world
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
    args = ap.parse_args()

    model = Model(args.model)
    process_textures(model, args.size, args.lossless_base)
    clips = [a.get("name", f"clip{i}") for i, a in enumerate(model.g.get("animations", []))]
    moves = []
    for spec in args.move:
        name, _, path = spec.partition("=")
        moves.append((name, path))
    clips += merge_moves(model, moves)
    remove_unused(model)
    lo, hi, triangles = bounds_and_triangles(model.g)

    os.makedirs(args.out, exist_ok=True)
    out = os.path.join(args.out, f"{args.id}.glb")
    model.write(out)
    # Read back: it must parse
    read_glb(out)

    index_path = os.path.join(args.out, "models.json")
    index = json.load(open(index_path)) if os.path.exists(index_path) else {}
    index[args.id] = {
        "file": f"{args.id}.glb",
        "min": [round(v, 4) for v in lo],
        "max": [round(v, 4) for v in hi],
        "triangles": triangles,
        "animations": clips,
        "skinned": bool(model.g.get("skins")),
        "bytes": os.path.getsize(out)
    }
    tmp = index_path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(dict(sorted(index.items())), f, indent="\t")
    os.replace(tmp, index_path)
    print(json.dumps({"id": args.id, **index[args.id]}))


if __name__ == "__main__":
    sys.exit(main())
