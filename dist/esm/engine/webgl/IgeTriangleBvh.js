const LEAF_SIZE = 8;
const cache = new WeakMap();
/** Triangle count of a geometry (indexed or not). */
export function triangleCountOf(geometry) {
    const indices = geometry.indices;
    return indices ? Math.floor(indices.length / 3) : Math.floor((geometry.vertices?.length || 0) / 9);
}
/**
 * The BVH for a geometry's own vertices, built on first use and cached.
 * Geometry whose vertices are replaced gets a new one.
 */
export function getTriangleBvh(geometry) {
    const vertices = geometry.vertices;
    const cached = cache.get(geometry);
    if (cached && cached.vertices === vertices)
        return cached.bvh;
    const bvh = buildTriangleBvh(vertices, geometry.indices);
    cache.set(geometry, { bvh, vertices });
    return bvh;
}
/** Build a BVH (median split on the longest axis of the triangle centres). */
export function buildTriangleBvh(vertices, indices) {
    const triangleCount = indices ? Math.floor(indices.length / 3) : Math.floor(vertices.length / 9);
    const order = new Uint32Array(triangleCount);
    const centres = new Float32Array(triangleCount * 3);
    const triBounds = new Float32Array(triangleCount * 6);
    for (let t = 0; t < triangleCount; t++) {
        order[t] = t;
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let k = 0; k < 3; k++) {
            const v = (indices ? indices[t * 3 + k] : t * 3 + k) * 3;
            const x = vertices[v], y = vertices[v + 1], z = vertices[v + 2];
            if (x < minX)
                minX = x;
            if (y < minY)
                minY = y;
            if (z < minZ)
                minZ = z;
            if (x > maxX)
                maxX = x;
            if (y > maxY)
                maxY = y;
            if (z > maxZ)
                maxZ = z;
        }
        triBounds.set([minX, minY, minZ, maxX, maxY, maxZ], t * 6);
        centres[t * 3] = (minX + maxX) / 2;
        centres[t * 3 + 1] = (minY + maxY) / 2;
        centres[t * 3 + 2] = (minZ + maxZ) / 2;
    }
    const maxNodes = Math.max(1, 2 * Math.ceil(triangleCount / LEAF_SIZE) * 2);
    let bounds = new Float32Array(maxNodes * 6);
    let nodes = new Uint32Array(maxNodes * 2);
    let nodeCount = 1;
    // Work list of [node, first, count]
    const stack = [0, 0, triangleCount];
    while (stack.length) {
        const count = stack.pop(), first = stack.pop(), node = stack.pop();
        // Node bounds and the spread of the triangle centres
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let cMinX = Infinity, cMinY = Infinity, cMinZ = Infinity, cMaxX = -Infinity, cMaxY = -Infinity, cMaxZ = -Infinity;
        for (let i = first; i < first + count; i++) {
            const t = order[i], b = t * 6, c = t * 3;
            if (triBounds[b] < minX)
                minX = triBounds[b];
            if (triBounds[b + 1] < minY)
                minY = triBounds[b + 1];
            if (triBounds[b + 2] < minZ)
                minZ = triBounds[b + 2];
            if (triBounds[b + 3] > maxX)
                maxX = triBounds[b + 3];
            if (triBounds[b + 4] > maxY)
                maxY = triBounds[b + 4];
            if (triBounds[b + 5] > maxZ)
                maxZ = triBounds[b + 5];
            if (centres[c] < cMinX)
                cMinX = centres[c];
            if (centres[c + 1] < cMinY)
                cMinY = centres[c + 1];
            if (centres[c + 2] < cMinZ)
                cMinZ = centres[c + 2];
            if (centres[c] > cMaxX)
                cMaxX = centres[c];
            if (centres[c + 1] > cMaxY)
                cMaxY = centres[c + 1];
            if (centres[c + 2] > cMaxZ)
                cMaxZ = centres[c + 2];
        }
        bounds.set([minX, minY, minZ, maxX, maxY, maxZ], node * 6);
        const sx = cMaxX - cMinX, sy = cMaxY - cMinY, sz = cMaxZ - cMinZ;
        if (count <= LEAF_SIZE || Math.max(sx, sy, sz) <= 0) {
            nodes[node * 2] = first;
            nodes[node * 2 + 1] = count;
            continue;
        }
        // Partition around the middle of the longest axis (in place)
        const axis = sx >= sy && sx >= sz ? 0 : sy >= sz ? 1 : 2;
        const split = axis === 0 ? (cMinX + cMaxX) / 2 : axis === 1 ? (cMinY + cMaxY) / 2 : (cMinZ + cMaxZ) / 2;
        let i = first, j = first + count - 1;
        while (i <= j) {
            if (centres[order[i] * 3 + axis] < split) {
                i++;
            }
            else {
                const swap = order[i];
                order[i] = order[j];
                order[j] = swap;
                j--;
            }
        }
        let leftCount = i - first;
        if (leftCount === 0 || leftCount === count)
            leftCount = count >> 1;
        if (nodeCount + 2 > bounds.length / 6) {
            const grownBounds = new Float32Array(bounds.length * 2);
            grownBounds.set(bounds);
            bounds = grownBounds;
            const grownNodes = new Uint32Array(nodes.length * 2);
            grownNodes.set(nodes);
            nodes = grownNodes;
        }
        const left = nodeCount;
        nodeCount += 2;
        nodes[node * 2] = left;
        nodes[node * 2 + 1] = 0;
        stack.push(left, first, leftCount);
        stack.push(left + 1, first + leftCount, count - leftCount);
    }
    return { bounds, nodes, order, nodeCount };
}
/** Distance along a ray to a box, or Infinity if it misses within maxT. */
function rayBox(bounds, n, o, d, inv, maxT) {
    const b = n * 6;
    let tMin = 0, tMax = maxT;
    for (let axis = 0; axis < 3; axis++) {
        const min = bounds[b + axis], max = bounds[b + 3 + axis];
        if (d[axis] === 0) {
            // Parallel to this slab: inside it or a miss
            if (o[axis] < min || o[axis] > max)
                return Infinity;
            continue;
        }
        let t1 = (min - o[axis]) * inv[axis], t2 = (max - o[axis]) * inv[axis];
        if (t1 > t2) {
            const swap = t1;
            t1 = t2;
            t2 = swap;
        }
        if (t1 > tMin)
            tMin = t1;
        if (t2 < tMax)
            tMax = t2;
        if (tMin > tMax)
            return Infinity;
    }
    return tMin;
}
/**
 * Nearest triangle a ray passes through (either side), using the BVH.
 * Same result as testing every triangle.
 */
export function bvhRaycast(bvh, vertices, indices, ox, oy, oz, dx, dy, dz, maxT = Infinity) {
    const { bounds, nodes, order } = bvh;
    const o = [ox, oy, oz], d = [dx, dy, dz], inv = [1 / dx, 1 / dy, 1 / dz];
    let best = maxT, bestTriangle = -1;
    const stack = [0];
    while (stack.length) {
        const n = stack.pop();
        if (rayBox(bounds, n, o, d, inv, best) === Infinity)
            continue;
        const count = nodes[n * 2 + 1];
        if (count === 0) {
            // Visit the nearer child first
            const left = nodes[n * 2];
            const tl = rayBox(bounds, left, o, d, inv, best);
            const tr = rayBox(bounds, left + 1, o, d, inv, best);
            if (tl <= tr) {
                if (tr !== Infinity)
                    stack.push(left + 1);
                if (tl !== Infinity)
                    stack.push(left);
            }
            else {
                if (tl !== Infinity)
                    stack.push(left);
                stack.push(left + 1);
            }
            continue;
        }
        const first = nodes[n * 2];
        for (let i = first; i < first + count; i++) {
            const tri = order[i];
            const a = (indices ? indices[tri * 3] : tri * 3) * 3;
            const b = (indices ? indices[tri * 3 + 1] : tri * 3 + 1) * 3;
            const c = (indices ? indices[tri * 3 + 2] : tri * 3 + 2) * 3;
            const ax = vertices[a], ay = vertices[a + 1], az = vertices[a + 2];
            const e1x = vertices[b] - ax, e1y = vertices[b + 1] - ay, e1z = vertices[b + 2] - az;
            const e2x = vertices[c] - ax, e2y = vertices[c + 1] - ay, e2z = vertices[c + 2] - az;
            const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
            const det = e1x * px + e1y * py + e1z * pz;
            if (Math.abs(det) < 1e-12)
                continue;
            const inv = 1 / det;
            const sx = ox - ax, sy = oy - ay, sz = oz - az;
            const u = (sx * px + sy * py + sz * pz) * inv;
            if (u < 0 || u > 1)
                continue;
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
    }
    return bestTriangle >= 0 ? { t: best, triangle: bestTriangle } : null;
}
/** Call fn for every triangle whose bounds may overlap an axis-aligned box. */
export function bvhQueryBox(bvh, minX, minY, minZ, maxX, maxY, maxZ, fn) {
    const { bounds, nodes, order } = bvh;
    const stack = [0];
    while (stack.length) {
        const n = stack.pop();
        const b = n * 6;
        if (bounds[b] > maxX || bounds[b + 3] < minX || bounds[b + 1] > maxY || bounds[b + 4] < minY ||
            bounds[b + 2] > maxZ || bounds[b + 5] < minZ)
            continue;
        const count = nodes[n * 2 + 1];
        if (count === 0) {
            stack.push(nodes[n * 2], nodes[n * 2] + 1);
            continue;
        }
        const first = nodes[n * 2];
        for (let i = first; i < first + count; i++)
            fn(order[i]);
    }
}
