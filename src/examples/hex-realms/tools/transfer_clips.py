#!/usr/bin/env python3
"""
Copy an animation clip from one rigged character onto another, for when a
model's own clips come out wrong (AssetFurnace's retargeter sometimes leaves
a rig's arms stuck out sideways).

    python3 -I tools/transfer_clips.py --target settler_rigged.glb \
        --source archer_idle.glb --out settler_idle.glb

The output is the target model with the source's first clip on its bones, so
it can be passed to import_model.py as a --move file.

Bones are paired by the skeleton's shape, not by name (auto-rigged skeletons
number their bones differently): from the hips down, each target bone's
children are matched to the source bone's children whose rest direction is
closest, so spine, neck, arms, legs, hands and feet find their partners and
any extra bones (fingers) keep their rest pose. Each frame, every source
bone's world rotation relative to its rest is applied to its partner's rest,
so poses carry over when both rigs share a rest pose (arms down, as
AssetFurnace's rigs are). The hips' movement is scaled by the ratio of hip
heights.
"""

import argparse
import math
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_model import Model  # noqa: E402

COMPONENTS = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}


def qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw,
            aw * bw - ax * bx - ay * by - az * bz)


def qinv(q):
    return (-q[0], -q[1], -q[2], q[3])


def qrot(q, v):
    x, y, z, w = q
    vx, vy, vz = v
    tx, ty, tz = 2 * (y * vz - z * vy), 2 * (z * vx - x * vz), 2 * (x * vy - y * vx)
    return (vx + w * tx + y * tz - z * ty, vy + w * ty + z * tx - x * tz, vz + w * tz + x * ty - y * tx)


def qnorm(q):
    n = math.sqrt(sum(c * c for c in q)) or 1
    return tuple(c / n for c in q)


def slerp(a, b, t):
    dot = sum(x * y for x, y in zip(a, b))
    if dot < 0:
        b, dot = tuple(-c for c in b), -dot
    if dot > 0.9995:
        return qnorm(tuple(x + (y - x) * t for x, y in zip(a, b)))
    th = math.acos(dot)
    s = math.sin(th)
    wa, wb = math.sin((1 - t) * th) / s, math.sin(t * th) / s
    return tuple(x * wa + y * wb for x, y in zip(a, b))


class Rig:
    """A skinned model's nodes, rest pose and (optionally) its first clip."""

    def __init__(self, path):
        self.model = Model(path)
        g = self.model.g
        self.nodes = g["nodes"]
        self.joints = list(g["skins"][0]["joints"])
        self.joint_set = set(self.joints)
        self.parent = {c: i for i, n in enumerate(self.nodes) for c in n.get("children", [])}
        self.root = next(j for j in self.joints if self.parent.get(j) not in self.joint_set)
        self.rest_world = {}
        for i in range(len(self.nodes)):
            self.world(i)

    def rest_local(self, i):
        n = self.nodes[i]
        return tuple(n.get("translation", (0, 0, 0))), tuple(n.get("rotation", (0, 0, 0, 1)))

    def world(self, i):
        if i not in self.rest_world:
            t, r = self.rest_local(i)
            if i in self.parent:
                pt, pr = self.world(self.parent[i])
                t, r = tuple(a + b for a, b in zip(pt, qrot(pr, t))), qmul(pr, r)
            self.rest_world[i] = (t, r)
        return self.rest_world[i]

    def children(self, i):
        return [c for c in self.nodes[i].get("children", []) if c in self.joint_set]

    def direction(self, parent, child):
        a, b = self.world(parent)[0], self.world(child)[0]
        d = tuple(y - x for x, y in zip(a, b))
        n = math.sqrt(sum(c * c for c in d)) or 1
        return tuple(c / n for c in d)

    def hip_height(self):
        return self.world(self.root)[0][1] - min(self.world(j)[0][1] for j in self.joints)

    def read(self, accessor):
        g = self.model.g
        a = g["accessors"][accessor]
        blob = self.model.blobs[a["bufferView"]]
        k = COMPONENTS[a["type"]]
        off = a.get("byteOffset", 0)
        return [struct.unpack_from(f"<{k}f", blob, off + i * 4 * k) for i in range(a["count"])]


def pair_bones(src, tgt):
    """Target joint -> source joint, matched down the tree by rest direction."""
    mapping = {tgt.root: src.root}
    stack = [tgt.root]
    while stack:
        t = stack.pop()
        s = mapping[t]
        options = sorted(
            ((sum(x * y for x, y in zip(tgt.direction(t, tc), src.direction(s, sc))), tc, sc)
             for tc in tgt.children(t) for sc in src.children(s)),
            reverse=True)
        taken_t, taken_s = set(), set()
        for score, tc, sc in options:
            if score < 0.3 or tc in taken_t or sc in taken_s:
                continue
            mapping[tc] = sc
            taken_t.add(tc)
            taken_s.add(sc)
            stack.append(tc)
    return mapping


def sample(times, values, t, rotation):
    if t <= times[0]:
        return values[0]
    if t >= times[-1]:
        return values[-1]
    lo, hi = 0, len(times) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if times[mid] <= t:
            lo = mid
        else:
            hi = mid
    f = (t - times[lo]) / ((times[hi] - times[lo]) or 1)
    if rotation:
        return slerp(values[lo], values[hi], f)
    return tuple(a + (b - a) * f for a, b in zip(values[lo], values[hi]))


def transfer(src, tgt):
    anim = src.model.g["animations"][0]
    tracks = {}
    times = set()
    for ch in anim["channels"]:
        path = ch["target"]["path"]
        if path not in ("rotation", "translation"):
            continue
        s = anim["samplers"][ch["sampler"]]
        ts = [v[0] for v in src.read(s["input"])]
        times.update(ts)
        tracks[(ch["target"]["node"], path)] = (ts, src.read(s["output"]))
    times = sorted(times)
    mapping = pair_bones(src, tgt)
    order = []  # target joints, parents first
    stack = [tgt.root]
    while stack:
        j = stack.pop()
        order.append(j)
        stack.extend(tgt.children(j))
    scale = tgt.hip_height() / (src.hip_height() or 1)

    rotations = {j: [] for j in tgt.joints}
    root_moves = []
    for t in times:
        src_world = {}

        def src_rot(i):
            if i not in src_world:
                track = tracks.get((i, "rotation"))
                local = sample(*track, t, True) if track else src.rest_local(i)[1]
                parent = src.parent.get(i)
                src_world[i] = qmul(src_rot(parent), local) if parent is not None else local
            return src_world[i]

        tgt_world = {}
        for j in order:
            parent = tgt.parent.get(j)
            parent_world = tgt_world.get(parent) if parent in tgt_world else tgt.world(parent)[1] if parent is not None else (0, 0, 0, 1)
            if j in mapping:
                s = mapping[j]
                delta = qmul(src_rot(s), qinv(src.world(s)[1]))
                world = qnorm(qmul(delta, tgt.world(j)[1]))
            else:
                world = qmul(parent_world, tgt.rest_local(j)[1])
            tgt_world[j] = world
            rotations[j].append(qnorm(qmul(qinv(parent_world), world)))
        track = tracks.get((src.root, "translation"))
        moved = sample(*track, t, False) if track else src.rest_local(src.root)[0]
        rest_s, rest_t = src.rest_local(src.root)[0], tgt.rest_local(tgt.root)[0]
        root_moves.append(tuple(rt + (m - rs) * scale for rt, m, rs in zip(rest_t, moved, rest_s)))
    return times, rotations, root_moves, mapping


def write(tgt, out, name, times, rotations, root_moves):
    model = tgt.model
    g = model.g
    g["animations"] = []

    def accessor(values, kind, bounds=False):
        flat = [c for v in values for c in (v if isinstance(v, tuple) else (v,))]
        view = model.add_view(struct.pack(f"<{len(flat)}f", *flat))
        acc = {"bufferView": view, "componentType": 5126, "count": len(values), "type": kind}
        if bounds:
            acc["min"], acc["max"] = [min(values)], [max(values)]
        g.setdefault("accessors", []).append(acc)
        return len(g["accessors"]) - 1

    time_acc = accessor(times, "SCALAR", True)
    samplers, channels = [], []
    for j, rots in rotations.items():
        samplers.append({"input": time_acc, "output": accessor(rots, "VEC4"), "interpolation": "LINEAR"})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": j, "path": "rotation"}})
    samplers.append({"input": time_acc, "output": accessor(root_moves, "VEC3"), "interpolation": "LINEAR"})
    channels.append({"sampler": len(samplers) - 1, "target": {"node": tgt.root, "path": "translation"}})
    g["animations"].append({"name": name, "samplers": samplers, "channels": channels})
    model.write(out)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--target", required=True, help="the rigged model to animate")
    p.add_argument("--source", required=True, help="a model file whose first clip to copy")
    p.add_argument("--out", required=True)
    p.add_argument("--name", default="clip")
    args = p.parse_args()
    src, tgt = Rig(args.source), Rig(args.target)
    times, rotations, root_moves, mapping = transfer(src, tgt)
    write(tgt, args.out, args.name, times, rotations, root_moves)
    names = lambda r, i: r.nodes[i].get("name", str(i))  # noqa: E731
    print(f"{args.out}: {len(times)} frames, {len(mapping)} of {len(tgt.joints)} bones paired "
          f"({', '.join(f'{names(tgt, t)}<-{names(src, s)}' for t, s in sorted(mapping.items()))})")


if __name__ == "__main__":
    main()
