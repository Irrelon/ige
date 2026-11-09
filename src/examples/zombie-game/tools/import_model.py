#!/usr/bin/env python3
"""
Import a generated model (AssetFurnace GLBs) into the zombie game.

Characters: the rigged model plus one GLB per move, merged into one file
with each move's clip named after the game action it plays:

    python3 -I tools/import_model.py --id zombie_walker --role zombie --height 170 \\
        --model in/zombie_walker_rigged.glb \\
        --move walk=in/zombie_walker_walk.glb --move run=in/zombie_walker_run.glb \\
        --move attack=in/zombie_walker_punch.glb --move hit=in/zombie_walker_hit_react.glb \\
        --move death=in/zombie_walker_death.glb --move idle=in/zombie_walker_idle.glb

Props and weapons:

    python3 -I tools/import_model.py --id prop_crate --role prop --height 60 --model in/prop_crate.glb

Run from src/examples/zombie-game. What it does:
- Merges each --move file's first clip into the model under the move's
  name, matched to the model's bones by node name.
- Keeps only base colour textures (the engine's materials use nothing
  else), shrunk to --size pixels and stored as JPEG (PNG when the material
  uses alpha). WebP images (EXT_texture_webp) become plain images.
- Drops whatever is no longer used (images, accessors, buffer views).
- Writes assets/models/<id>.glb and records it in assets/characters.json
  (zombies, players: height, and the walk and run clips' ground speeds,
  measured from their root motion, so feet match movement) or
  assets/props.json (props, weapons: bounds and triangles).

Clips keep their root motion; the game plays walk, run and idle on the spot
(IgeEntity.model() inPlace). Needs Pillow and numpy.
"""

import argparse
import io
import json
import math
import os
import struct
import sys

import numpy as np
from PIL import Image

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942
COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
TYPES = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}


class Glb:
    """A GLB as its JSON and one bytes object per buffer view."""

    def __init__(self, path):
        data = open(path, "rb").read()
        magic, version, _ = struct.unpack_from("<4sII", data, 0)
        if magic != b"glTF" or version != 2:
            raise SystemExit(f"{path}: not a glTF 2.0 binary")
        off, self.g, binary = 12, None, b""
        while off < len(data):
            length, kind = struct.unpack_from("<II", data, off)
            chunk = data[off + 8:off + 8 + length]
            off += 8 + length
            if kind == JSON_CHUNK:
                self.g = json.loads(chunk)
            elif kind == BIN_CHUNK:
                binary = chunk
        self.views = [binary[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]]
                      for v in self.g.get("bufferViews", [])]

    def add_view(self, blob, **props):
        self.g.setdefault("bufferViews", []).append({"buffer": 0, "byteLength": len(blob), **props})
        self.views.append(blob)
        return len(self.views) - 1

    def read(self, accessor_index):
        """An accessor's values as a numpy array (count x components)."""
        acc = self.g["accessors"][accessor_index]
        n = COMPONENTS[acc["type"]]
        fmt = TYPES[acc["componentType"]]
        blob = self.views[acc["bufferView"]]
        view = self.g["bufferViews"][acc["bufferView"]]
        size = struct.calcsize(fmt) * n
        stride = view.get("byteStride") or size
        off = acc.get("byteOffset", 0)
        rows = [struct.unpack_from(f"<{n}{fmt}", blob, off + i * stride) for i in range(acc["count"])]
        return np.array(rows, dtype=np.float64)

    def write(self, path):
        """Pack every buffer view (4-byte aligned) into one buffer and write the GLB."""
        g = self.g
        binary = bytearray()
        for view, blob in zip(g.get("bufferViews", []), self.views):
            binary += b"\0" * (-len(binary) % 4)
            view["buffer"] = 0
            view["byteOffset"] = len(binary)
            view["byteLength"] = len(blob)
            binary += blob
        binary += b"\0" * (-len(binary) % 4)
        g["buffers"] = [{"byteLength": len(binary)}]
        text = json.dumps(g, separators=(",", ":")).encode()
        text += b" " * (-len(text) % 4)
        out = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(text) + 8 + len(binary))
        out += struct.pack("<II", len(text), JSON_CHUNK) + text
        out += struct.pack("<II", len(binary), BIN_CHUNK) + bytes(binary)
        with open(path, "wb") as f:
            f.write(out)


# ------------------------------------------------------------------
# Animations
# ------------------------------------------------------------------

def merge_move(model, name, path):
    """Copy the first clip of a move file into the model as `name`, matched to its nodes by name."""
    src = Glb(path)
    g = model.g
    by_name = {n.get("name"): i for i, n in enumerate(g.get("nodes", [])) if n.get("name")}
    anims = src.g.get("animations", [])
    if not anims:
        print(f"  {path}: no animation", file=sys.stderr)
        return False
    views, accessors = {}, {}

    def copy(a):
        if a not in accessors:
            acc = dict(src.g["accessors"][a])
            v = acc["bufferView"]
            if v not in views:
                views[v] = model.add_view(src.views[v])
            acc["bufferView"] = views[v]
            acc.pop("sparse", None)
            g.setdefault("accessors", []).append(acc)
            accessors[a] = len(g["accessors"]) - 1
        return accessors[a]

    anim = anims[0]
    samplers, channels = [], []
    for ch in anim["channels"]:
        node = ch["target"].get("node")
        target = by_name.get(src.g["nodes"][node].get("name")) if node is not None else None
        if target is None:
            continue
        s = anim["samplers"][ch["sampler"]]
        samplers.append({"input": copy(s["input"]), "output": copy(s["output"]), "interpolation": s.get("interpolation", "LINEAR")})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": target, "path": ch["target"]["path"]}})
    if not channels:
        print(f"  {path}: no channel matches the model's bones", file=sys.stderr)
        return False
    g["animations"] = [a for a in g.get("animations", []) if a.get("name") != name]
    g["animations"].append({"name": name, "samplers": samplers, "channels": channels})
    return True


def node_matrices(g):
    """World matrix of every node (numpy 4x4)."""
    nodes = g.get("nodes", [])
    parent = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    cache = {}

    def local(n):
        if "matrix" in n:
            return np.array(n["matrix"], dtype=np.float64).reshape(4, 4).T
        x, y, z, w = n.get("rotation", [0, 0, 0, 1])
        r = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                      [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        m = np.eye(4)
        m[:3, :3] = r * np.array(n.get("scale", [1, 1, 1]))
        m[:3, 3] = n.get("translation", [0, 0, 0])
        return m

    def world(i):
        if i not in cache:
            cache[i] = (world(parent[i]) if i in parent else np.eye(4)) @ local(nodes[i])
        return cache[i]

    return [world(i) for i in range(len(nodes))], parent


def ground_speed(model, clip_name):
    """How fast a clip's root motion travels over the ground (model units per second), or None."""
    g = model.g
    clip = next((a for a in g.get("animations", []) if a.get("name") == clip_name), None)
    if not clip or not g.get("skins"):
        return None
    joints = g["skins"][0]["joints"]
    worlds, parent = node_matrices(g)
    depth = {j: 0 for j in joints}
    for j in joints:
        p = j
        while p in parent:
            p = parent[p]
            depth[j] += 1
    best = None
    for ch in clip["channels"]:
        node = ch["target"]["node"]
        if ch["target"]["path"] == "translation" and node in depth and (best is None or depth[node] < depth[best[0]]):
            best = (node, clip["samplers"][ch["sampler"]])
    if not best:
        return None
    node, sampler = best
    times = model.read(sampler["input"])[:, 0]
    values = model.read(sampler["output"])
    if sampler.get("interpolation") == "CUBICSPLINE":
        values = values[1::3]
    duration = times[-1] - times[0]
    if duration <= 0:
        return None
    to_world = worlds[parent[node]][:3, :3] if node in parent else np.eye(3)
    drift = to_world @ (values[-1] - values[0])
    return math.hypot(drift[0], drift[2]) / duration


# ------------------------------------------------------------------
# Textures and clean-up
# ------------------------------------------------------------------

def base_colour_only(model, size):
    """Keep base colour textures only, shrunk and re-encoded; WebP becomes a plain image."""
    g = model.g
    for mat in g.get("materials", []):
        for key in ("normalTexture", "occlusionTexture", "emissiveTexture"):
            mat.pop(key, None)
        pbr = mat.setdefault("pbrMetallicRoughness", {})
        pbr.pop("metallicRoughnessTexture", None)
        pbr.setdefault("metallicFactor", 0.0)
        pbr.setdefault("roughnessFactor", 0.9)
    done = set()
    for mat in g.get("materials", []):
        tex_ref = mat.get("pbrMetallicRoughness", {}).get("baseColorTexture")
        if not tex_ref:
            continue
        tex = g["textures"][tex_ref["index"]]
        webp = tex.get("extensions", {}).pop("EXT_texture_webp", None)
        if webp is not None:
            tex["source"] = webp["source"]
        if not tex.get("extensions"):
            tex.pop("extensions", None)
        src = tex["source"]
        if src in done:
            continue
        done.add(src)
        img_def = g["images"][src]
        image = Image.open(io.BytesIO(model.views[img_def["bufferView"]]))
        image.load()
        if max(image.size) > size:
            image.thumbnail((size, size), Image.LANCZOS)
        alpha = mat.get("alphaMode", "OPAQUE") != "OPAQUE"
        buf = io.BytesIO()
        if alpha:
            image.convert("RGBA").save(buf, "PNG", optimize=True)
            mime = "image/png"
        else:
            image.convert("RGB").save(buf, "JPEG", quality=86, optimize=True)
            mime = "image/jpeg"
        img_def["bufferView"] = model.add_view(buf.getvalue())
        img_def["mimeType"] = mime
    for key in ("extensionsUsed", "extensionsRequired"):
        if key in g:
            g[key] = [e for e in g[key] if e != "EXT_texture_webp"]
            if not g[key]:
                del g[key]


def remove_unused(model):
    """Drop textures, images, samplers, accessors and buffer views nothing refers to."""
    g = model.g

    def remap(items, used):
        order = sorted(used)
        return [items[i] for i in order], {old: new for new, old in enumerate(order)}

    # Textures and images
    used_tex = set()
    for mat in g.get("materials", []):
        for holder in (mat, mat.get("pbrMetallicRoughness", {})):
            for v in holder.values():
                if isinstance(v, dict) and "index" in v:
                    used_tex.add(v["index"])
    if "textures" in g:
        g["textures"], tex_map = remap(g["textures"], used_tex)
        for mat in g.get("materials", []):
            for holder in (mat, mat.get("pbrMetallicRoughness", {})):
                for v in holder.values():
                    if isinstance(v, dict) and "index" in v:
                        v["index"] = tex_map[v["index"]]
        if not g["textures"]:
            del g["textures"]
    used_img = {t["source"] for t in g.get("textures", []) if "source" in t}
    if "images" in g:
        g["images"], img_map = remap(g["images"], used_img)
        for t in g.get("textures", []):
            t["source"] = img_map[t["source"]]
        if not g["images"]:
            del g["images"]
    used_samplers = {t["sampler"] for t in g.get("textures", []) if "sampler" in t}
    if "samplers" in g:
        g["samplers"], s_map = remap(g["samplers"], used_samplers)
        for t in g.get("textures", []):
            if "sampler" in t:
                t["sampler"] = s_map[t["sampler"]]
        if not g["samplers"]:
            del g["samplers"]

    # Accessors
    refs = []
    for mesh in g.get("meshes", []):
        for prim in mesh["primitives"]:
            refs.append((prim["attributes"], None))
            if "indices" in prim:
                refs.append((prim, "indices"))
            for target in prim.get("targets", []):
                refs.append((target, None))
    for skin in g.get("skins", []):
        if "inverseBindMatrices" in skin:
            refs.append((skin, "inverseBindMatrices"))
    for anim in g.get("animations", []):
        for s in anim["samplers"]:
            refs.append((s, "input"))
            refs.append((s, "output"))
    used_acc = set()
    for holder, key in refs:
        for k in ([key] if key else list(holder.keys())):
            used_acc.add(holder[k])
    g["accessors"], acc_map = remap(g.get("accessors", []), used_acc)
    for holder, key in refs:
        for k in ([key] if key else list(holder.keys())):
            holder[k] = acc_map[holder[k]]

    # Buffer views
    used_views = {a["bufferView"] for a in g["accessors"] if "bufferView" in a}
    used_views |= {i["bufferView"] for i in g.get("images", []) if "bufferView" in i}
    order = sorted(used_views)
    view_map = {old: new for new, old in enumerate(order)}
    g["bufferViews"] = [g["bufferViews"][i] for i in order]
    model.views = [model.views[i] for i in order]
    for a in g["accessors"]:
        if "bufferView" in a:
            a["bufferView"] = view_map[a["bufferView"]]
    for i in g.get("images", []):
        if "bufferView" in i:
            i["bufferView"] = view_map[i["bufferView"]]


def bounds_and_triangles(model):
    """Model-space bounds of every mesh in its rest placement, and the triangle count."""
    g = model.g
    worlds, _ = node_matrices(g)
    lo, hi, triangles = np.full(3, np.inf), np.full(3, -np.inf), 0
    for i, node in enumerate(g.get("nodes", [])):
        if "mesh" not in node:
            continue
        for prim in g["meshes"][node["mesh"]]["primitives"]:
            pos = model.read(prim["attributes"]["POSITION"])
            if "skin" not in node:
                pos = (worlds[i] @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]
            else:
                # Skinned vertices sit where a root joint's world matrix times its inverse bind matrix puts them
                skin = g["skins"][node["skin"]]
                joint = skin["joints"][0]
                ibm = model.read(skin["inverseBindMatrices"])[0].reshape(4, 4).T if "inverseBindMatrices" in skin else np.eye(4)
                m = worlds[joint] @ ibm
                pos = (m @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]
            lo, hi = np.minimum(lo, pos.min(axis=0)), np.maximum(hi, pos.max(axis=0))
            count = g["accessors"][prim["indices"]]["count"] if "indices" in prim else len(pos)
            triangles += count // 3
    return lo, hi, triangles


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True)
    ap.add_argument("--role", required=True, choices=["zombie", "player", "prop", "weapon"])
    ap.add_argument("--model", required=True, help="the finished (props) or rigged (characters) GLB")
    ap.add_argument("--move", action="append", default=[], help="action=path: a move GLB whose clip plays that action")
    ap.add_argument("--height", type=float, required=True, help="height in the game, in world units")
    ap.add_argument("--yaw", type=float, help="degrees to turn the model so it faces +Z")
    ap.add_argument("--size", type=int, default=1024, help="largest texture side in pixels")
    ap.add_argument("--assets", default="assets", help="the game's assets folder")
    args = ap.parse_args()

    model = Glb(args.model)
    if args.move:
        model.g.pop("animations", None)  # the rigged model's own clip (a rest pose) isn't wanted
    clips = []
    for spec in args.move:
        name, _, path = spec.partition("=")
        if merge_move(model, name, path):
            clips.append(name)
    base_colour_only(model, args.size)
    remove_unused(model)

    lo, hi, triangles = bounds_and_triangles(model)
    model_height = float(hi[1] - lo[1]) or 1.0
    scale = args.height / model_height

    os.makedirs(os.path.join(args.assets, "models"), exist_ok=True)
    out = os.path.join(args.assets, "models", f"{args.id}.glb")
    model.write(out)
    Glb(out)  # it must read back

    character = args.role in ("zombie", "player")
    index_path = os.path.join(args.assets, "characters.json" if character else "props.json")
    entries = json.load(open(index_path)) if os.path.exists(index_path) else []
    entries = [e for e in entries if e["id"] != args.id]
    entry = {"id": args.id, "file": f"{args.id}.glb", "role": args.role, "height": args.height}
    if character:
        for clip, key in (("walk", "walkSpeed"), ("run", "runSpeed")):
            speed = ground_speed(model, clip) if clip in clips else None
            if speed and speed * scale >= 10:
                entry[key] = round(speed * scale, 1)
            elif clip in clips:
                print(f"  {clip}: no root motion to measure its speed from", file=sys.stderr)
        entry.setdefault("walkSpeed", 80)
        entry["clips"] = clips
    else:
        entry["min"] = [round(float(v), 4) for v in lo]
        entry["max"] = [round(float(v), 4) for v in hi]
    if args.yaw is not None:
        entry["yaw"] = args.yaw
    entry["triangles"] = triangles
    entry["bytes"] = os.path.getsize(out)
    entries.append(entry)
    entries.sort(key=lambda e: (e["role"], e["id"]))
    with open(index_path + ".tmp", "w") as f:
        json.dump(entries, f, indent="\t")
    os.replace(index_path + ".tmp", index_path)
    print(json.dumps(entry))


if __name__ == "__main__":
    sys.exit(main())
