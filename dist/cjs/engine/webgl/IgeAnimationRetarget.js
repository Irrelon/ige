"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retargetClips = retargetClips;
exports.normaliseBoneName = normaliseBoneName;
exports.findBoneIndex = findBoneIndex;
const cache = new WeakMap();
/**
 * Make the animation clips of one file play on another model's skeleton.
 *
 * Use it when animations come in separate files from the character (one
 * file per clip, or an animation library shared by several characters).
 * Channels are matched to target bones by name. When both rigs have the
 * same rest pose (the usual case for files exported from one character)
 * the clips are simply re-indexed and share their keyframe data.
 * Otherwise each rotation is converted so the target bone makes the same
 * motion relative to its own rest pose, which handles rigs with different
 * bone orientations and units as long as both rest in the same posture
 * (e.g. both T-pose). Root motion is scaled to the target's proportions.
 *
 * Results are cached per source file, skeleton and options, so every
 * entity gets the same clip objects (and shares cached poses).
 * @example #Use a separate attack animation file
 *     const attack = await igeGltfLoader.load("zombie_attack.glb");
 *     const clips = retargetClips(attack, zombieModel.skins[0].skeleton);
 *     zombie.skeletalAnimation().define("Attack", clips[0]);
 */
function retargetClips(source, target, options = {}) {
    var _a, _b;
    const key = `${target.id}|${(_a = options.translation) !== null && _a !== void 0 ? _a : "auto"}|${(_b = options.rootScale) !== null && _b !== void 0 ? _b : ""}|${options.boneMap ? JSON.stringify(options.boneMap) : ""}`;
    let byKey = cache.get(source);
    if (!byKey) {
        byKey = new Map();
        cache.set(source, byKey);
    }
    let clips = byKey.get(key);
    if (!clips) {
        clips = new IgeRetargeter(source, target, options).retarget(source.animations || []);
        byKey.set(key, clips);
    }
    return clips;
}
/**
 * Normalise a bone name for matching: drop namespace prefixes such as
 * "mixamorig:" or "Armature|" and ignore case.
 */
function normaliseBoneName(name) {
    return name.replace(/^.*[:|]/, "").replace(/^mixamorig\d*_?/i, "").toLowerCase();
}
/**
 * Find a bone by name: an exact match first, then ignoring case and
 * prefixes such as "mixamorig:" (so "RightHand" finds "mixamorig:RightHand").
 * Returns -1 when the skeleton has no such bone.
 */
function findBoneIndex(skeleton, name) {
    for (const bone of skeleton.bones) {
        if (bone.name === name)
            return bone.index;
    }
    const wanted = normaliseBoneName(name);
    for (const bone of skeleton.bones) {
        if (normaliseBoneName(bone.name) === wanted)
            return bone.index;
    }
    return -1;
}
class IgeRetargeter {
    constructor(source, target, options) {
        this._targetByName = new Map();
        this._sourceParent = [];
        this._sourceGlobal = new Map();
        this._targetGlobal = [];
        this._targetDepth = [];
        this._boneMap = new Map();
        this._source = source;
        this._target = target;
        this._options = options;
        for (const bone of target.bones) {
            this._targetByName.set(normaliseBoneName(bone.name), bone.index);
        }
        for (const [from, to] of Object.entries(options.boneMap || {})) {
            this._boneMap.set(normaliseBoneName(from), normaliseBoneName(to));
        }
        // Source hierarchy (every node, joint or not)
        const nodes = source.nodes || [];
        this._sourceParent = new Array(nodes.length).fill(-1);
        nodes.forEach((node, index) => {
            for (const child of node.children || [])
                this._sourceParent[child] = index;
        });
        // Target rest pose in model space
        for (const bone of target.bones) {
            this._targetGlobalOf(bone.index);
        }
    }
    retarget(clips) {
        return clips.map((clip) => this._retargetClip(clip)).filter((clip) => clip.channels.length > 0);
    }
    _retargetClip(clip) {
        var _a, _b, _c, _d, _e;
        // Pair each channel with a target bone
        const pairs = [];
        for (const channel of clip.channels) {
            const node = this._sourceNodeOf(channel);
            if (node < 0)
                continue;
            const name = (_a = channel.targetName) !== null && _a !== void 0 ? _a : (_c = (_b = this._source.nodes) === null || _b === void 0 ? void 0 : _b[node]) === null || _c === void 0 ? void 0 : _c.name;
            if (!name)
                continue;
            let normalised = normaliseBoneName(name);
            normalised = (_d = this._boneMap.get(normalised)) !== null && _d !== void 0 ? _d : normalised;
            const bone = this._targetByName.get(normalised);
            if (bone === undefined)
                continue;
            pairs.push({ channel, node, bone });
        }
        const identical = this._identicalRest(pairs);
        let translation = (_e = this._options.translation) !== null && _e !== void 0 ? _e : "auto";
        if (translation === "auto")
            translation = identical ? "all" : "root";
        // The root-most bone with translation keys carries root motion
        let rootDepth = Infinity;
        for (const { channel, bone } of pairs) {
            if (channel.targetPath === "translation")
                rootDepth = Math.min(rootDepth, this._targetDepth[bone]);
        }
        const samplers = identical ? clip.samplers : [];
        const channels = [];
        for (const { channel, node, bone } of pairs) {
            const path = channel.targetPath;
            if (path === "weights")
                continue;
            if (path === "translation") {
                if (translation === "none")
                    continue;
                if (translation === "root" && this._targetDepth[bone] !== rootDepth)
                    continue;
            }
            if (path === "scale" && !identical && translation !== "all")
                continue;
            if (identical) {
                channels.push(Object.assign(Object.assign({}, channel), { targetBoneIndex: bone }));
                continue;
            }
            const sampler = clip.samplers[channel.samplerIndex];
            let converted;
            if (path === "rotation") {
                converted = this._convertRotation(sampler, node, bone);
            }
            else if (path === "translation" && translation === "root") {
                converted = this._convertRootTranslation(sampler, node, bone);
            }
            else {
                converted = sampler;
            }
            samplers.push(converted);
            channels.push(Object.assign(Object.assign({}, channel), { targetBoneIndex: bone, samplerIndex: samplers.length - 1 }));
        }
        return {
            id: `${clip.id}>${this._target.id}`,
            name: clip.name,
            duration: clip.duration,
            samplers,
            channels
        };
    }
    /**
     * The source node a channel animates (older clips only carry a bone
     * index into the source file's first skin).
     */
    _sourceNodeOf(channel) {
        var _a, _b, _c;
        if (channel.targetNode !== undefined)
            return channel.targetNode;
        const joints = (_b = (_a = this._source.skins) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.jointNodeIndices;
        return joints && channel.targetBoneIndex >= 0 ? (_c = joints[channel.targetBoneIndex]) !== null && _c !== void 0 ? _c : -1 : -1;
    }
    /**
     * Whether every matched bone has the same rest transform in both rigs
     * (and the same placement above the root), so keyframes apply as-is.
     */
    _identicalRest(pairs) {
        const nodes = this._source.nodes || [];
        const seen = new Set();
        for (const { node, bone } of pairs) {
            if (seen.has(bone))
                continue;
            seen.add(bone);
            const sourceLocal = nodeMatrix(nodes[node]);
            if (!nearlyEqual(sourceLocal, this._target.bones[bone].localBindTransform))
                return false;
            // Root bones: the transform above them must match too
            const targetBone = this._target.bones[bone];
            if (targetBone.parentIndex < 0) {
                const sourceParent = this._sourceParent[node];
                const sourceAbove = sourceParent >= 0 ? this._sourceGlobalOf(sourceParent) : identity();
                const targetAbove = targetBone.parentTransform ? toMat(targetBone.parentTransform) : identity();
                if (!nearlyEqual(sourceAbove, targetAbove))
                    return false;
            }
        }
        return true;
    }
    /**
     * Rotation keys: the target bone makes the same world-space rotation
     * relative to its rest pose as the source bone. With constant per-bone
     * corrections A and B this is q' = A * q * B, where
     * A = targetParentRest^-1 * sourceParentRest and
     * B = sourceRest^-1 * targetRest (rotations, model space).
     * Linear maps commute with slerp and cubic splines, so keys convert
     * one by one (including spline tangents).
     */
    _convertRotation(sampler, node, bone) {
        const sourceParent = this._sourceParent[node];
        const sourceParentRest = rotationOf(sourceParent >= 0 ? this._sourceGlobalOf(sourceParent) : identity());
        const sourceRest = rotationOf(this._sourceGlobalOf(node));
        const targetRest = rotationOf(this._targetGlobal[bone]);
        const targetParentRest = rotationOf(this._targetParentGlobal(bone));
        const a = mulQ(conjQ(targetParentRest), sourceParentRest);
        const b = mulQ(conjQ(sourceRest), targetRest);
        const input = sampler.output;
        const output = new Float32Array(input.length);
        for (let i = 0; i + 3 < input.length; i += 4) {
            const q = mulQ(mulQ(a, [input[i], input[i + 1], input[i + 2], input[i + 3]]), b);
            output[i] = q[0];
            output[i + 1] = q[1];
            output[i + 2] = q[2];
            output[i + 3] = q[3];
        }
        return Object.assign(Object.assign({}, sampler), { output });
    }
    /**
     * Root translation keys: move the target root by the source root's
     * model-space displacement from rest, scaled by the ratio of the two
     * rigs' hip heights, then express it in the target root's parent space.
     */
    _convertRootTranslation(sampler, node, bone) {
        const sourceParent = this._sourceParent[node];
        const sourceAbove = sourceParent >= 0 ? this._sourceGlobalOf(sourceParent) : identity();
        const sourceRest = this._sourceGlobalOf(node);
        const targetRest = this._targetGlobal[bone];
        const targetAboveInverse = invert(this._targetParentGlobal(bone));
        let scale = this._options.rootScale;
        if (scale === undefined) {
            const sourceHeight = sourceRest[13];
            const targetHeight = targetRest[13];
            scale = sourceHeight > 1e-6 && targetHeight > 1e-6 ? targetHeight / sourceHeight : 1;
        }
        const input = sampler.output;
        const output = new Float32Array(input.length);
        const cubic = sampler.interpolation === "CUBICSPLINE";
        for (let i = 0; i + 2 < input.length; i += 3) {
            // Cubic spline keys are [in-tangent, value, out-tangent]: tangents
            // are directions and only take the linear part of the mapping
            const isValue = !cubic || (i / 3) % 3 === 1;
            const v = transformPoint(sourceAbove, input[i], input[i + 1], input[i + 2], isValue);
            let x = v[0], y = v[1], z = v[2];
            if (isValue) {
                x = targetRest[12] + scale * (x - sourceRest[12]);
                y = targetRest[13] + scale * (y - sourceRest[13]);
                z = targetRest[14] + scale * (z - sourceRest[14]);
            }
            else {
                x *= scale;
                y *= scale;
                z *= scale;
            }
            const local = transformPoint(targetAboveInverse, x, y, z, isValue);
            output[i] = local[0];
            output[i + 1] = local[1];
            output[i + 2] = local[2];
        }
        return Object.assign(Object.assign({}, sampler), { output });
    }
    _sourceGlobalOf(node) {
        var _a;
        let global = this._sourceGlobal.get(node);
        if (!global) {
            const local = nodeMatrix((_a = this._source.nodes) === null || _a === void 0 ? void 0 : _a[node]);
            const parent = this._sourceParent[node];
            global = parent >= 0 ? mul(this._sourceGlobalOf(parent), local) : local;
            this._sourceGlobal.set(node, global);
        }
        return global;
    }
    _targetGlobalOf(index) {
        var _a;
        if (this._targetGlobal[index])
            return this._targetGlobal[index];
        const bone = this._target.bones[index];
        const local = toMat(bone.localBindTransform);
        const parent = bone.parentIndex;
        this._targetDepth[index] = parent >= 0 ? ((_a = this._targetDepth[parent]) !== null && _a !== void 0 ? _a : this._depthOf(parent)) + 1 : 0;
        this._targetGlobal[index] = mul(this._targetParentGlobal(index), local);
        return this._targetGlobal[index];
    }
    _depthOf(index) {
        this._targetGlobalOf(index);
        return this._targetDepth[index];
    }
    _targetParentGlobal(index) {
        const bone = this._target.bones[index];
        if (bone.parentIndex >= 0)
            return this._targetGlobalOf(bone.parentIndex);
        return bone.parentTransform ? toMat(bone.parentTransform) : identity();
    }
}
// ---------------------------------------------------------------------
// Small column-major matrix and quaternion helpers (double precision)
// ---------------------------------------------------------------------
function identity() {
    const m = new Float64Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
}
function toMat(values) {
    return Float64Array.from(values);
}
function nodeMatrix(node) {
    if (!node)
        return identity();
    if (node.matrix)
        return toMat(node.matrix);
    const [tx, ty, tz] = node.translation || [0, 0, 0];
    const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
    const [sx, sy, sz] = node.scale || [1, 1, 1];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return Float64Array.from([
        (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
        (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
        (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
        tx, ty, tz, 1
    ]);
}
function mul(a, b) {
    const out = new Float64Array(16);
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            out[col * 4 + row] =
                a[row] * b[col * 4] +
                    a[4 + row] * b[col * 4 + 1] +
                    a[8 + row] * b[col * 4 + 2] +
                    a[12 + row] * b[col * 4 + 3];
        }
    }
    return out;
}
function invert(m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (Math.abs(det) < 1e-30)
        return identity();
    const d = 1 / det;
    return Float64Array.from([
        (a11 * b11 - a12 * b10 + a13 * b09) * d,
        (a02 * b10 - a01 * b11 - a03 * b09) * d,
        (a31 * b05 - a32 * b04 + a33 * b03) * d,
        (a22 * b04 - a21 * b05 - a23 * b03) * d,
        (a12 * b08 - a10 * b11 - a13 * b07) * d,
        (a00 * b11 - a02 * b08 + a03 * b07) * d,
        (a32 * b02 - a30 * b05 - a33 * b01) * d,
        (a20 * b05 - a22 * b02 + a23 * b01) * d,
        (a10 * b10 - a11 * b08 + a13 * b06) * d,
        (a01 * b08 - a00 * b10 - a03 * b06) * d,
        (a30 * b04 - a31 * b02 + a33 * b00) * d,
        (a21 * b02 - a20 * b04 - a23 * b00) * d,
        (a11 * b07 - a10 * b09 - a12 * b06) * d,
        (a00 * b09 - a01 * b07 + a02 * b06) * d,
        (a31 * b01 - a30 * b03 - a32 * b00) * d,
        (a20 * b03 - a21 * b01 + a22 * b00) * d
    ]);
}
function transformPoint(m, x, y, z, isPoint) {
    const w = isPoint ? 1 : 0;
    return [
        m[0] * x + m[4] * y + m[8] * z + m[12] * w,
        m[1] * x + m[5] * y + m[9] * z + m[13] * w,
        m[2] * x + m[6] * y + m[10] * z + m[14] * w
    ];
}
/** Rotation of a transform (scale removed from each basis vector). */
function rotationOf(m) {
    const sx = Math.hypot(m[0], m[1], m[2]) || 1;
    const sy = Math.hypot(m[4], m[5], m[6]) || 1;
    const sz = Math.hypot(m[8], m[9], m[10]) || 1;
    const r00 = m[0] / sx, r10 = m[1] / sx, r20 = m[2] / sx;
    const r01 = m[4] / sy, r11 = m[5] / sy, r21 = m[6] / sy;
    const r02 = m[8] / sz, r12 = m[9] / sz, r22 = m[10] / sz;
    const trace = r00 + r11 + r22;
    let x, y, z, w;
    if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1);
        w = 0.25 / s;
        x = (r21 - r12) * s;
        y = (r02 - r20) * s;
        z = (r10 - r01) * s;
    }
    else if (r00 > r11 && r00 > r22) {
        const s = 2 * Math.sqrt(1 + r00 - r11 - r22);
        w = (r21 - r12) / s;
        x = 0.25 * s;
        y = (r01 + r10) / s;
        z = (r02 + r20) / s;
    }
    else if (r11 > r22) {
        const s = 2 * Math.sqrt(1 + r11 - r00 - r22);
        w = (r02 - r20) / s;
        x = (r01 + r10) / s;
        y = 0.25 * s;
        z = (r12 + r21) / s;
    }
    else {
        const s = 2 * Math.sqrt(1 + r22 - r00 - r11);
        w = (r10 - r01) / s;
        x = (r02 + r20) / s;
        y = (r12 + r21) / s;
        z = 0.25 * s;
    }
    const len = Math.hypot(x, y, z, w) || 1;
    return [x / len, y / len, z / len, w / len];
}
function mulQ(a, b) {
    const [ax, ay, az, aw] = a;
    const [bx, by, bz, bw] = b;
    return [
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz
    ];
}
function conjQ(q) {
    return [-q[0], -q[1], -q[2], q[3]];
}
function nearlyEqual(a, b) {
    for (let i = 0; i < 16; i++) {
        if (Math.abs(a[i] - b[i]) > 1e-4 * (1 + Math.abs(a[i])))
            return false;
    }
    return true;
}
