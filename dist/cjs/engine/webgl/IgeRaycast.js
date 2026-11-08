"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intersectTriangles = intersectTriangles;
exports.invertMat4 = invertMat4;
exports.skinnedPositions = skinnedPositions;
exports.raycastEntities = raycastEntities;
const boxCache = new WeakMap();
function verticesBox(vertices) {
    const box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
    for (let i = 0; i + 2 < vertices.length; i += 3) {
        const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
        if (x < box.minX)
            box.minX = x;
        if (y < box.minY)
            box.minY = y;
        if (z < box.minZ)
            box.minZ = z;
        if (x > box.maxX)
            box.maxX = x;
        if (y > box.maxY)
            box.maxY = y;
        if (z > box.maxZ)
            box.maxZ = z;
    }
    return box;
}
function geometryBox(geometry) {
    let box = boxCache.get(geometry);
    if (!box) {
        box = verticesBox(geometry.vertices);
        boxCache.set(geometry, box);
    }
    return box;
}
/** Whether a ray (origin o, direction d) reaches a box within maxT. */
function rayHitsBox(box, ox, oy, oz, dx, dy, dz, maxT) {
    let tMin = 0, tMax = maxT;
    const slabs = [[ox, dx, box.minX, box.maxX], [oy, dy, box.minY, box.maxY], [oz, dz, box.minZ, box.maxZ]];
    for (const [origin, direction, min, max] of slabs) {
        if (Math.abs(direction) < 1e-12) {
            if (origin < min || origin > max)
                return false;
            continue;
        }
        let t1 = (min - origin) / direction, t2 = (max - origin) / direction;
        if (t1 > t2)
            [t1, t2] = [t2, t1];
        if (t1 > tMin)
            tMin = t1;
        if (t2 < tMax)
            tMax = t2;
        if (tMin > tMax)
            return false;
    }
    return true;
}
/**
 * Nearest triangle a ray passes through (either side), in the vertices'
 * own space. Möller-Trumbore.
 * @returns The ray parameter t and the triangle index, or null.
 */
function intersectTriangles(vertices, indices, ox, oy, oz, dx, dy, dz, maxT = Infinity) {
    const count = indices ? Math.floor(indices.length / 3) : Math.floor(vertices.length / 9);
    let best = maxT;
    let bestTriangle = -1;
    for (let tri = 0; tri < count; tri++) {
        const a = (indices ? indices[tri * 3] : tri * 3) * 3;
        const b = (indices ? indices[tri * 3 + 1] : tri * 3 + 1) * 3;
        const c = (indices ? indices[tri * 3 + 2] : tri * 3 + 2) * 3;
        const ax = vertices[a], ay = vertices[a + 1], az = vertices[a + 2];
        const e1x = vertices[b] - ax, e1y = vertices[b + 1] - ay, e1z = vertices[b + 2] - az;
        const e2x = vertices[c] - ax, e2y = vertices[c + 1] - ay, e2z = vertices[c + 2] - az;
        // p = d x e2
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12)
            continue;
        const inv = 1 / det;
        const sx = ox - ax, sy = oy - ay, sz = oz - az;
        const u = (sx * px + sy * py + sz * pz) * inv;
        if (u < 0 || u > 1)
            continue;
        // q = s x e1
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1)
            continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 1e-6 && t < best) {
            best = t;
            bestTriangle = tri;
        }
    }
    return bestTriangle >= 0 ? { t: best, triangle: bestTriangle } : null;
}
/** Inverse of a column-major 4x4 matrix, or null if it has none. */
function invertMat4(m, out = new Float32Array(16)) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det)
        return null;
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
}
/** a * b for column-major 4x4 matrices. */
function multiplyMat4(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            out[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] +
                a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
        }
    }
    return out;
}
/**
 * A skinned mesh's vertices in its current pose (model space), skinned on
 * the CPU the way the skinned shader does it.
 */
function skinnedPositions(geometry, skeleton) {
    const source = geometry.vertices;
    const weights = geometry.boneWeights;
    const joints = geometry.boneIndices;
    const out = new Float32Array(source.length);
    if (!weights || !joints) {
        out.set(source);
        return out;
    }
    const skin = skeleton.skinMatrices;
    for (let v = 0, n = Math.floor(source.length / 3); v < n; v++) {
        const x = source[v * 3], y = source[v * 3 + 1], z = source[v * 3 + 2];
        let rx = 0, ry = 0, rz = 0;
        for (let k = 0; k < 4; k++) {
            const w = weights[v * 4 + k];
            if (w === 0)
                continue;
            const m = joints[v * 4 + k] * 16;
            rx += w * (skin[m] * x + skin[m + 4] * y + skin[m + 8] * z + skin[m + 12]);
            ry += w * (skin[m + 1] * x + skin[m + 5] * y + skin[m + 9] * z + skin[m + 13]);
            rz += w * (skin[m + 2] * x + skin[m + 6] * y + skin[m + 10] * z + skin[m + 14]);
        }
        out[v * 3] = rx;
        out[v * 3 + 1] = ry;
        out[v * 3 + 2] = rz;
    }
    return out;
}
/** Box around a skeleton's joints, padded to cover the body around them (model space). */
function jointBox(skeleton) {
    const count = skeleton.data.boneCount;
    if (!count)
        return null;
    const w = skeleton.worldMatrices;
    const box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
    for (let b = 0; b < count; b++) {
        const x = w[b * 16 + 12], y = w[b * 16 + 13], z = w[b * 16 + 14];
        if (x < box.minX)
            box.minX = x;
        if (y < box.minY)
            box.minY = y;
        if (z < box.minZ)
            box.minZ = z;
        if (x > box.maxX)
            box.maxX = x;
        if (y > box.maxY)
            box.maxY = y;
        if (z > box.maxZ)
            box.maxZ = z;
    }
    const pad = Math.max(box.maxX - box.minX, box.maxY - box.minY, box.maxZ - box.minZ) * 0.35;
    box.minX -= pad;
    box.minY -= pad;
    box.minZ -= pad;
    box.maxX += pad;
    box.maxY += pad;
    box.maxZ += pad;
    return box;
}
/**
 * Cast a world-space ray against the triangles of entities' meshes (their
 * own geometry and every model part) and, by default, their children's.
 * Skinned characters are tested in their current animated pose. Sprites
 * (textured quads without geometry) are not tested.
 * @returns Every hit, nearest first (at most one per mesh).
 */
function raycastEntities(ray, targets, options = {}) {
    var _a;
    const maxDistance = (_a = options.maxDistance) !== null && _a !== void 0 ? _a : Infinity;
    const visitChildren = options.children !== false;
    const hits = [];
    const inverse = new Float32Array(16);
    const o = ray.origin, d = ray.direction;
    const testMesh = (entity, geometry, matrix, vertices, box) => {
        if (!invertMat4(matrix, inverse))
            return;
        const n = inverse;
        const ox = n[0] * o.x + n[4] * o.y + n[8] * o.z + n[12];
        const oy = n[1] * o.x + n[5] * o.y + n[9] * o.z + n[13];
        const oz = n[2] * o.x + n[6] * o.y + n[10] * o.z + n[14];
        const dx = n[0] * d.x + n[4] * d.y + n[8] * d.z;
        const dy = n[1] * d.x + n[5] * d.y + n[9] * d.z;
        const dz = n[2] * d.x + n[6] * d.y + n[10] * d.z;
        // An affine transform keeps the ray parameter, so t is the world distance
        if (!rayHitsBox(box, ox, oy, oz, dx, dy, dz, maxDistance))
            return;
        const hit = intersectTriangles(vertices, geometry.indices, ox, oy, oz, dx, dy, dz, maxDistance);
        if (!hit)
            return;
        // World normal from the hit triangle's world corners
        const idx = geometry.indices;
        const corner = (k) => {
            const i = (idx ? idx[hit.triangle * 3 + k] : hit.triangle * 3 + k) * 3;
            const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
            return [
                matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
                matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
                matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
            ];
        };
        const [a, b, c] = [corner(0), corner(1), corner(2)];
        const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;
        if (nx * d.x + ny * d.y + nz * d.z > 0) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
        }
        hits.push({
            entity,
            distance: hit.t,
            point: { x: o.x + d.x * hit.t, y: o.y + d.y * hit.t, z: o.z + d.z * hit.t },
            normal: { x: nx, y: ny, z: nz },
            triangle: hit.triangle,
            geometry
        });
    };
    const visit = (entity) => {
        var _a, _b;
        if (entity._hidden)
            return;
        const world = (_a = entity._worldMatrix4) === null || _a === void 0 ? void 0 : _a.matrix;
        if (world && (!options.filter || options.filter(entity))) {
            const parts = entity._modelParts;
            if (parts && parts.length > 0) {
                for (const part of parts) {
                    const geometry = part.geometryData;
                    if (!(geometry === null || geometry === void 0 ? void 0 : geometry.vertices))
                        continue;
                    if (part.skinned) {
                        const skeleton = entity._skeleton;
                        if (!skeleton)
                            continue;
                        entity._updateSkeletonMatrices();
                        const box = jointBox(skeleton);
                        if (!box)
                            continue;
                        // Cheap test against the joints' box before skinning every vertex
                        if (!invertMat4(world, inverse))
                            continue;
                        const n = inverse;
                        const ox = n[0] * o.x + n[4] * o.y + n[8] * o.z + n[12];
                        const oy = n[1] * o.x + n[5] * o.y + n[9] * o.z + n[13];
                        const oz = n[2] * o.x + n[6] * o.y + n[10] * o.z + n[14];
                        const dx = n[0] * d.x + n[4] * d.y + n[8] * d.z;
                        const dy = n[1] * d.x + n[5] * d.y + n[9] * d.z;
                        const dz = n[2] * d.x + n[6] * d.y + n[10] * d.z;
                        if (!rayHitsBox(box, ox, oy, oz, dx, dy, dz, maxDistance))
                            continue;
                        const posed = skinnedPositions(geometry, skeleton);
                        testMesh(entity, geometry, world, posed, verticesBox(posed));
                    }
                    else {
                        const matrix = part.matrix ? multiplyMat4(world, part.matrix) : world;
                        testMesh(entity, geometry, matrix, geometry.vertices, geometryBox(geometry));
                    }
                }
            }
            else if ((_b = entity._geometryData) === null || _b === void 0 ? void 0 : _b.vertices) {
                const geometry = entity._geometryData;
                testMesh(entity, geometry, world, geometry.vertices, geometryBox(geometry));
            }
        }
        if (visitChildren && entity._children) {
            for (const child of entity._children)
                visit(child);
        }
    };
    for (const target of Array.isArray(targets) ? targets : [targets])
        visit(target);
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
}
