"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelParts = getModelParts;
exports.getModelLod = getModelLod;
exports.createSkeletonInstance = createSkeletonInstance;
exports.multiplyMat4 = multiplyMat4;
const IgeMeshSimplifier_1 = require("./IgeMeshSimplifier.js");
const partsCache = new WeakMap();
/**
 * Get the render parts for a loaded GLTF model (cached per model).
 * Walks the default scene's node hierarchy so every mesh instance is placed
 * with its node's global transform, and converts the loader's materials
 * into plain material data (including the base colour texture image).
 */
function getModelParts(model) {
    var _a, _b, _c;
    let parts = partsCache.get(model);
    if (parts)
        return parts;
    parts = [];
    const materials = model.materials.map((mat, index) => toMaterialData(model, mat, index));
    const addMesh = (meshIndex, matrix, skinned) => {
        var _a;
        const mesh = model.meshes[meshIndex];
        if (!mesh)
            return;
        for (const primitive of mesh.primitives) {
            const isSkinned = skinned && !!(primitive.geometry.boneWeights && primitive.geometry.boneIndices);
            parts.push({
                geometryData: primitive.geometry,
                materialData: materials[(_a = primitive.materialIndex) !== null && _a !== void 0 ? _a : 0] || { color: { r: 1, g: 1, b: 1, a: 1 } },
                matrix: isSkinned ? undefined : matrix,
                skinned: isSkinned
            });
        }
    };
    const nodes = model.nodes;
    const scene = ((_a = model.scenes) === null || _a === void 0 ? void 0 : _a[model.defaultSceneIndex]) || ((_b = model.scenes) === null || _b === void 0 ? void 0 : _b[0]);
    if (nodes && nodes.length && scene) {
        const visit = (nodeIndex, parentMatrix) => {
            const node = nodes[nodeIndex];
            if (!node)
                return;
            const local = nodeLocalMatrix(node);
            const world = parentMatrix ? (local ? multiplyMat4(parentMatrix, local) : parentMatrix) : local;
            if (node.mesh !== undefined) {
                addMesh(node.mesh, world && !isIdentity(world) ? world : undefined, node.skin !== undefined);
            }
            if (node.children) {
                for (const child of node.children)
                    visit(child, world);
            }
        };
        for (const root of scene.nodeIndices)
            visit(root, undefined);
    }
    else {
        // No scene graph: place every mesh at the model origin
        for (let i = 0; i < model.meshes.length; i++)
            addMesh(i, undefined, !!((_c = model.skins) === null || _c === void 0 ? void 0 : _c.length));
    }
    partsCache.set(model, parts);
    return parts;
}
const lodGeometryCache = new WeakMap();
/**
 * Build the level-of-detail geometry for a model. Generated levels are
 * cached per mesh, so every entity using the same model and settings
 * shares the same simplified meshes (and GPU buffers).
 */
function getModelLod(model, levels) {
    const parts = getModelParts(model);
    if (!parts.length || !levels.length)
        return undefined;
    const sorted = [...levels].sort((a, b) => b.screenSize - a.screenSize);
    const lod = { screenSizes: [], partGeometries: parts.map(() => []) };
    for (const level of sorted) {
        let geometries;
        if (level.model) {
            const lodParts = getModelParts(level.model);
            if (lodParts.length !== parts.length) {
                console.warn(`IgeModelLod: LOD model "${level.model.id}" has ${lodParts.length} parts, ` +
                    `expected ${parts.length}; level ignored`);
                continue;
            }
            geometries = lodParts.map((part) => part.geometryData);
        }
        else if (level.ratio !== undefined && level.ratio < 1) {
            const ratio = Math.max(0, level.ratio);
            geometries = parts.map((part) => getSimplifiedGeometry(part.geometryData, ratio, level.maxError));
        }
        if (!geometries)
            continue;
        lod.screenSizes.push(level.screenSize);
        for (let i = 0; i < parts.length; i++)
            lod.partGeometries[i].push(geometries[i]);
    }
    return lod.screenSizes.length ? lod : undefined;
}
function getSimplifiedGeometry(geometry, ratio, maxError) {
    let byKey = lodGeometryCache.get(geometry);
    if (!byKey) {
        byKey = new Map();
        lodGeometryCache.set(geometry, byKey);
    }
    const key = `${ratio}|${maxError !== null && maxError !== void 0 ? maxError : ""}`;
    let simplified = byKey.get(key);
    if (!simplified) {
        simplified = (0, IgeMeshSimplifier_1.simplifyGeometry)(geometry, {
            ratio,
            maxError,
            id: `${geometry.id}_lod${ratio}${maxError !== undefined ? `_e${maxError}` : ""}`
        });
        byKey.set(key, simplified);
    }
    return simplified;
}
/**
 * Create a runtime skeleton (pose buffers) for skeleton data. Entities each
 * need their own instance; the static data is shared.
 */
function createSkeletonInstance(data) {
    const boneCount = data.boneCount;
    const skeleton = {
        data,
        localMatrices: new Float32Array(boneCount * 16),
        worldMatrices: new Float32Array(boneCount * 16),
        skinMatrices: new Float32Array(boneCount * 16),
        dirty: true
    };
    for (let i = 0; i < boneCount; i++) {
        skeleton.localMatrices.set(data.bones[i].localBindTransform, i * 16);
    }
    return skeleton;
}
/**
 * Convert a loader material into plain material data the renderer reads.
 */
function toMaterialData(model, mat, index) {
    var _a, _b, _c, _d, _e, _f;
    const m = mat;
    const color = (_a = m.color) === null || _a === void 0 ? void 0 : _a.call(m);
    const emissive = (_b = m.emissiveColor) === null || _b === void 0 ? void 0 : _b.call(m);
    const blob = (_c = m.baseColorTextureData) === null || _c === void 0 ? void 0 : _c.call(m);
    const data = {
        color: color ? { r: color.r, g: color.g, b: color.b, a: color.a } : { r: 1, g: 1, b: 1, a: 1 },
        metallic: typeof m.metallic === "function" ? m.metallic() : 0,
        roughness: typeof m.roughness === "function" ? m.roughness() : 0.5,
        transparent: ((_d = m.blendMode) === null || _d === void 0 ? void 0 : _d.call(m)) === "transparent"
    };
    if (emissive && (emissive.r > 0 || emissive.g > 0 || emissive.b > 0)) {
        data.emissiveColor = { r: emissive.r, g: emissive.g, b: emissive.b };
        data.emissiveIntensity = (_f = (_e = m.emissiveIntensity) === null || _e === void 0 ? void 0 : _e.call(m)) !== null && _f !== void 0 ? _f : 1;
    }
    if (blob) {
        data.textureId = `${model.id}_material${index}_baseColor`;
        data.textureBlob = blob;
    }
    return data;
}
function nodeLocalMatrix(node) {
    if (node.matrix) {
        return new Float32Array(node.matrix);
    }
    if (!node.translation && !node.rotation && !node.scale) {
        return undefined;
    }
    const [tx, ty, tz] = node.translation || [0, 0, 0];
    const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
    const [sx, sy, sz] = node.scale || [1, 1, 1];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return new Float32Array([
        (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
        (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
        (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
        tx, ty, tz, 1
    ]);
}
/**
 * Multiply two column-major 4x4 matrices: returns a * b.
 */
function multiplyMat4(a, b) {
    const out = new Float32Array(16);
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
function isIdentity(m) {
    for (let i = 0; i < 16; i++) {
        const expected = i % 5 === 0 ? 1 : 0;
        if (Math.abs(m[i] - expected) > 1e-7)
            return false;
    }
    return true;
}
