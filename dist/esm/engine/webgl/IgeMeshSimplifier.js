/** Per-vertex attribute arrays copied into the simplified geometry. */
const VERTEX_ATTRIBUTES = ["vertices", "normals", "uvs", "tangents", "colors", "boneWeights", "boneIndices"];
const KIND_MANIFOLD = 0;
const KIND_BORDER = 1;
const KIND_LOCKED = 2;
/** Quadric layout: 10 symmetric matrix coefficients + accumulated weight. */
const Q = 11;
/** Weight of the planes that keep open borders in place. */
const BORDER_WEIGHT = 10;
/** Smallest cosine between a triangle's normal before and after a collapse. */
const MIN_NORMAL_COS = 0.2;
/**
 * Reduce a mesh's triangle count with quadric-error edge collapses, for
 * level-of-detail models.
 *
 * Collapses are half-edge collapses: a vertex is merged into a neighbour
 * and no vertex is ever moved or created, so every attribute (normals,
 * UVs, colours, skin joints and weights) of the remaining vertices is kept
 * exactly and the result can be skinned by the same skeleton. Vertices that
 * share a position but differ in other attributes (UV seams, hard edges)
 * are collapsed together so seams stay closed, open borders only collapse
 * along themselves, and collapses that would fold a triangle over are
 * rejected.
 */
export function simplifyGeometry(geometry, options) {
    const positions = geometry.vertices;
    if (!positions || positions.length < 9) {
        return { ...geometry, id: options.id ?? `${geometry.id}_lod${options.ratio}` };
    }
    const vertexCount = positions.length / 3;
    const indices = geometry.indices ? Uint32Array.from(geometry.indices) : buildIndexBuffer(geometry, vertexCount);
    const ratio = Math.min(1, Math.max(0, options.ratio));
    const targetTriangles = Math.max(1, Math.floor((indices.length / 3) * ratio));
    const diagonal = boundsDiagonal(positions, vertexCount);
    const maxError = (options.maxError ?? 0.05) * diagonal;
    const resultIndices = collapseEdges(positions, vertexCount, indices, targetTriangles, maxError * maxError);
    return compactGeometry(geometry, resultIndices, vertexCount, options.id ?? `${geometry.id}_lod${options.ratio}`);
}
/**
 * Number of triangles in a geometry.
 */
export function triangleCount(geometry) {
    if (geometry.indices)
        return Math.floor(geometry.indices.length / 3);
    return geometry.vertices ? Math.floor(geometry.vertices.length / 9) : 0;
}
/**
 * Run collapse passes until the triangle target or the error limit is
 * reached. Returns the surviving triangles (indices into the original
 * vertex arrays).
 */
function collapseEdges(positions, vertexCount, indexBuffer, targetTriangles, errorLimitSq) {
    let indices = indexBuffer;
    let triangles = indices.length / 3;
    // Every vertex maps to the first vertex at its position, so vertices
    // split by seams act as one point of the surface.
    const rep = weldPositions(positions, vertexCount);
    const quadrics = new Float64Array(vertexCount * Q);
    let adjacency = buildAdjacency(indices, rep, vertexCount);
    const kind = classifyVertices(indices, rep, vertexCount, adjacency);
    accumulateQuadrics(positions, indices, rep, adjacency, quadrics);
    const locked = new Uint8Array(vertexCount);
    const wedgeMap = new Int32Array(vertexCount).fill(-1);
    const touched = new Uint32Array(vertexCount);
    const stamp = new Uint32Array(vertexCount);
    let stampId = 0;
    const dead = new Uint8Array(triangles);
    /**
     * Merge position v into its neighbour u if that keeps the mesh valid:
     * every wedge of v has a counterpart at u, the edge is a proper
     * (manifold or border) edge, the surface doesn't pinch and no triangle
     * folds over. Uses the adjacency built at the start of the pass, which
     * is still exact for any vertex that isn't locked.
     */
    const tryCollapse = (v, u) => {
        const { offsets, tris } = adjacency;
        let shared = 0;
        let touchedCount = 0;
        let valid = true;
        const pvx = positions[v * 3], pvy = positions[v * 3 + 1], pvz = positions[v * 3 + 2];
        const pux = positions[u * 3], puy = positions[u * 3 + 1], puz = positions[u * 3 + 2];
        for (let a = offsets[v]; a < offsets[v + 1] && valid; a++) {
            const t = tris[a] * 3;
            const r0 = rep[indices[t]], r1 = rep[indices[t + 1]], r2 = rep[indices[t + 2]];
            const cv = r0 === v ? 0 : r1 === v ? 1 : 2;
            const cu = r0 === u ? 0 : r1 === u ? 1 : r2 === u ? 2 : -1;
            if (cu >= 0) {
                shared++;
                const wv = indices[t + cv];
                const wu = indices[t + cu];
                if (wedgeMap[wv] === -1) {
                    wedgeMap[wv] = wu;
                    touched[touchedCount++] = wv;
                }
                else if (wedgeMap[wv] !== wu) {
                    valid = false;
                }
                continue;
            }
            // Triangle survives with v moved to u: compare the normals of
            // (a, b, p) for the old and new position of p. Also rejects
            // collapses that leave a zero-area triangle, whose orientation
            // later collapses could no longer check.
            const i0 = indices[t + ((cv + 1) % 3)] * 3;
            const i1 = indices[t + ((cv + 2) % 3)] * 3;
            const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
            const bx = positions[i1] - ax, by = positions[i1 + 1] - ay, bz = positions[i1 + 2] - az;
            const ox = pvx - ax, oy = pvy - ay, oz = pvz - az;
            const nx = pux - ax, ny = puy - ay, nz = puz - az;
            const n0x = by * oz - bz * oy, n0y = bz * ox - bx * oz, n0z = bx * oy - by * ox;
            const n1x = by * nz - bz * ny, n1y = bz * nx - bx * nz, n1z = bx * ny - by * nx;
            const dot = n0x * n1x + n0y * n1y + n0z * n1z;
            const len0 = n0x * n0x + n0y * n0y + n0z * n0z;
            const len1 = n1x * n1x + n1y * n1y + n1z * n1z;
            if (dot <= MIN_NORMAL_COS * Math.sqrt(len0 * len1)) {
                valid = false;
            }
        }
        // A border vertex may only slide along its border edge; an interior
        // vertex needs a two-triangle (manifold) edge
        if (valid) {
            if (kind[v] === KIND_BORDER)
                valid = shared === 1 && kind[u] === KIND_BORDER;
            else
                valid = shared === 2;
        }
        // Every wedge of v must have a counterpart at u (a seam vertex can
        // only collapse along its seam)
        if (valid) {
            for (let a = offsets[v]; a < offsets[v + 1]; a++) {
                const t = tris[a] * 3;
                const cv = rep[indices[t]] === v ? 0 : rep[indices[t + 1]] === v ? 1 : 2;
                if (wedgeMap[indices[t + cv]] === -1) {
                    valid = false;
                    break;
                }
            }
        }
        // Link condition: v and u may only share the neighbours opposite the
        // collapsing edge, otherwise the surface pinches
        if (valid) {
            const marked = ++stampId;
            for (let a = offsets[u]; a < offsets[u + 1]; a++) {
                const t = tris[a] * 3;
                stamp[rep[indices[t]]] = marked;
                stamp[rep[indices[t + 1]]] = marked;
                stamp[rep[indices[t + 2]]] = marked;
            }
            const counted = ++stampId;
            let common = 0;
            for (let a = offsets[v]; a < offsets[v + 1]; a++) {
                const t = tris[a] * 3;
                for (let k = 0; k < 3; k++) {
                    const r = rep[indices[t + k]];
                    if (r !== v && r !== u && stamp[r] === marked) {
                        common++;
                        stamp[r] = counted;
                    }
                }
            }
            valid = common === shared;
        }
        if (valid) {
            // Drop the triangles on the edge, move v's wedges to u's
            for (let a = offsets[v]; a < offsets[v + 1]; a++) {
                const triangle = tris[a];
                const t = triangle * 3;
                const r0 = rep[indices[t]], r1 = rep[indices[t + 1]], r2 = rep[indices[t + 2]];
                if (r0 === u || r1 === u || r2 === u) {
                    dead[triangle] = 1;
                    triangles--;
                }
                else {
                    const cv = r0 === v ? 0 : r1 === v ? 1 : 2;
                    indices[t + cv] = wedgeMap[indices[t + cv]];
                }
                locked[r0] = 1;
                locked[r1] = 1;
                locked[r2] = 1;
            }
            const qv = v * Q, qu = u * Q;
            for (let k = 0; k < Q; k++)
                quadrics[qu + k] += quadrics[qv + k];
        }
        for (let k = 0; k < touchedCount; k++)
            wedgeMap[touched[k]] = -1;
        return valid;
    };
    let rebuild = false;
    while (triangles > targetTriangles) {
        if (rebuild) {
            adjacency = buildAdjacency(indices, rep, vertexCount);
        }
        rebuild = true;
        const candidates = gatherCandidates(positions, indices, rep, kind, quadrics);
        const count = candidates.from.length;
        if (count === 0)
            break;
        const order = sortByCost(candidates.cost);
        const goal = Math.max(1, Math.floor((triangles - targetTriangles) / 2));
        // Don't take far costlier collapses in this pass while cheaper ones
        // are only blocked by this pass's locks; they come back next pass.
        // If nothing under that cap is valid, allow anything within the
        // error limit instead of giving up.
        const goalCost = candidates.cost[order[Math.min(goal, count - 1)]];
        let passLimit = Math.min(errorLimitSq, Math.max(goalCost * 1.5, 1e-30));
        locked.fill(0);
        dead.fill(0, 0, indices.length / 3);
        let collapses = 0;
        for (let c = 0; c < count && triangles > targetTriangles; c++) {
            const candidate = order[c];
            if (candidates.cost[candidate] > passLimit) {
                if (collapses > 0 || passLimit >= errorLimitSq)
                    break;
                passLimit = errorLimitSq;
                if (candidates.cost[candidate] > passLimit)
                    break;
            }
            const v = candidates.from[candidate];
            const u = candidates.to[candidate];
            if (locked[v] || locked[u])
                continue;
            // Try the cheaper direction, then the other one (e.g. an interior
            // vertex can join a seam even though the seam can't leave it)
            if (tryCollapse(v, u) || (candidates.reverseCost[candidate] <= passLimit && tryCollapse(u, v))) {
                collapses++;
            }
        }
        if (collapses === 0)
            break;
        indices = removeDeadTriangles(indices, dead);
    }
    return indices;
}
/**
 * Candidate collapses for one pass: every edge with an allowed direction,
 * oriented so the cheaper direction comes first.
 */
function gatherCandidates(positions, indices, rep, kind, quadrics) {
    const max = indices.length;
    const from = new Uint32Array(max);
    const to = new Uint32Array(max);
    const cost = new Float64Array(max);
    const reverseCost = new Float64Array(max);
    let count = 0;
    for (let t = 0; t < indices.length; t += 3) {
        for (let e = 0; e < 3; e++) {
            const a = rep[indices[t + e]];
            const b = rep[indices[t + ((e + 1) % 3)]];
            if (a === b)
                continue;
            // Each interior edge appears twice (once per direction); keep one
            if (a > b && kind[a] === KIND_MANIFOLD && kind[b] === KIND_MANIFOLD)
                continue;
            const ab = canCollapse(kind, a, b) ? collapseCost(quadrics, positions, a, b) : Infinity;
            const ba = canCollapse(kind, b, a) ? collapseCost(quadrics, positions, b, a) : Infinity;
            if (ab === Infinity && ba === Infinity)
                continue;
            if (ab <= ba) {
                from[count] = a;
                to[count] = b;
                cost[count] = ab;
                reverseCost[count] = ba;
            }
            else {
                from[count] = b;
                to[count] = a;
                cost[count] = ba;
                reverseCost[count] = ab;
            }
            count++;
        }
    }
    return {
        from: from.subarray(0, count),
        to: to.subarray(0, count),
        cost: cost.subarray(0, count),
        reverseCost: reverseCost.subarray(0, count)
    };
}
function canCollapse(kind, v, u) {
    const k = kind[v];
    if (k === KIND_LOCKED)
        return false;
    if (k === KIND_BORDER)
        return kind[u] === KIND_BORDER;
    return true;
}
/**
 * Mean squared distance from the merged vertex's planes when v moves to u.
 */
function collapseCost(quadrics, positions, v, u) {
    const x = positions[u * 3], y = positions[u * 3 + 1], z = positions[u * 3 + 2];
    const error = evaluateQuadric(quadrics, v * Q, x, y, z) + evaluateQuadric(quadrics, u * Q, x, y, z);
    const weight = quadrics[v * Q + 10] + quadrics[u * Q + 10];
    return Math.max(0, error) / Math.max(weight, 1e-30);
}
function evaluateQuadric(quadrics, q, x, y, z) {
    return (quadrics[q] * x * x + 2 * quadrics[q + 1] * x * y + 2 * quadrics[q + 2] * x * z + 2 * quadrics[q + 3] * x +
        quadrics[q + 4] * y * y + 2 * quadrics[q + 5] * y * z + 2 * quadrics[q + 6] * y +
        quadrics[q + 7] * z * z + 2 * quadrics[q + 8] * z +
        quadrics[q + 9]);
}
/**
 * Sort candidate indices by cost with a counting sort on the top 16 bits
 * of the float32 cost (monotonic for non-negative values, ~1% buckets).
 */
function sortByCost(cost) {
    const count = cost.length;
    const keys = new Uint16Array(count);
    const f32 = new Float32Array(1);
    const u32 = new Uint32Array(f32.buffer);
    for (let i = 0; i < count; i++) {
        f32[0] = cost[i];
        keys[i] = u32[0] >>> 16;
    }
    const buckets = new Uint32Array(65537);
    for (let i = 0; i < count; i++)
        buckets[keys[i] + 1]++;
    for (let i = 1; i < buckets.length; i++)
        buckets[i] += buckets[i - 1];
    const order = new Uint32Array(count);
    for (let i = 0; i < count; i++)
        order[buckets[keys[i]]++] = i;
    return order;
}
/**
 * Map each vertex to the first vertex with exactly the same position.
 */
function weldPositions(positions, vertexCount) {
    const bits = new Uint32Array(positions.buffer, positions.byteOffset, vertexCount * 3);
    let size = 1;
    while (size < vertexCount * 2)
        size <<= 1;
    const mask = size - 1;
    const table = new Int32Array(size).fill(-1);
    const rep = new Uint32Array(vertexCount);
    for (let v = 0; v < vertexCount; v++) {
        const x = bits[v * 3], y = bits[v * 3 + 1], z = bits[v * 3 + 2];
        let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & mask;
        for (;;) {
            const e = table[h];
            if (e < 0) {
                table[h] = v;
                rep[v] = v;
                break;
            }
            if (bits[e * 3] === x && bits[e * 3 + 1] === y && bits[e * 3 + 2] === z) {
                rep[v] = e;
                break;
            }
            h = (h + 1) & mask;
        }
    }
    return rep;
}
function buildAdjacency(indices, rep, vertexCount) {
    const offsets = new Uint32Array(vertexCount + 1);
    for (let i = 0; i < indices.length; i++)
        offsets[rep[indices[i]] + 1]++;
    for (let i = 1; i <= vertexCount; i++)
        offsets[i] += offsets[i - 1];
    const fill = offsets.slice(0, vertexCount);
    const tris = new Uint32Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
        tris[fill[rep[indices[i]]]++] = (i / 3) | 0;
    }
    return { offsets, tris };
}
/**
 * Classify each position as manifold (every edge has two triangles),
 * border (has an open edge) or locked (non-manifold, left untouched).
 */
function classifyVertices(indices, rep, vertexCount, adjacency) {
    const { offsets, tris } = adjacency;
    const kind = new Uint8Array(vertexCount);
    const counts = new Uint32Array(vertexCount);
    for (let v = 0; v < vertexCount; v++) {
        if (rep[v] !== v)
            continue;
        for (let a = offsets[v]; a < offsets[v + 1]; a++) {
            const t = tris[a] * 3;
            for (let k = 0; k < 3; k++) {
                const r = rep[indices[t + k]];
                if (r !== v)
                    counts[r]++;
            }
        }
        let k = KIND_MANIFOLD;
        for (let a = offsets[v]; a < offsets[v + 1]; a++) {
            const t = tris[a] * 3;
            for (let c = 0; c < 3; c++) {
                const r = rep[indices[t + c]];
                if (r === v)
                    continue;
                if (counts[r] > 2)
                    k = KIND_LOCKED;
                else if (counts[r] === 1 && k !== KIND_LOCKED)
                    k = KIND_BORDER;
            }
        }
        // A position used twice by one triangle is degenerate: leave it alone
        for (let a = offsets[v]; a < offsets[v + 1]; a++) {
            const t = tris[a] * 3;
            let uses = 0;
            for (let c = 0; c < 3; c++)
                if (rep[indices[t + c]] === v)
                    uses++;
            if (uses > 1)
                k = KIND_LOCKED;
        }
        kind[v] = k;
        for (let a = offsets[v]; a < offsets[v + 1]; a++) {
            const t = tris[a] * 3;
            counts[rep[indices[t]]] = 0;
            counts[rep[indices[t + 1]]] = 0;
            counts[rep[indices[t + 2]]] = 0;
        }
    }
    return kind;
}
/**
 * Sum each triangle's plane (weighted by area) into its corners' quadrics,
 * plus planes perpendicular to open border edges so borders keep their
 * outline.
 */
function accumulateQuadrics(positions, indices, rep, adjacency, quadrics) {
    const { offsets, tris } = adjacency;
    for (let t = 0; t < indices.length; t += 3) {
        const r0 = rep[indices[t]], r1 = rep[indices[t + 1]], r2 = rep[indices[t + 2]];
        const ax = positions[r0 * 3], ay = positions[r0 * 3 + 1], az = positions[r0 * 3 + 2];
        const e1x = positions[r1 * 3] - ax, e1y = positions[r1 * 3 + 1] - ay, e1z = positions[r1 * 3 + 2] - az;
        const e2x = positions[r2 * 3] - ax, e2y = positions[r2 * 3 + 1] - ay, e2z = positions[r2 * 3 + 2] - az;
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len < 1e-20)
            continue;
        const area = len / 2;
        nx /= len;
        ny /= len;
        nz /= len;
        const d = -(nx * ax + ny * ay + nz * az);
        addPlane(quadrics, r0, nx, ny, nz, d, area);
        addPlane(quadrics, r1, nx, ny, nz, d, area);
        addPlane(quadrics, r2, nx, ny, nz, d, area);
        // Open edges: add a plane through the edge, perpendicular to the face
        const corners = [r0, r1, r2];
        for (let e = 0; e < 3; e++) {
            const a = corners[e], b = corners[(e + 1) % 3];
            let sharedCount = 0;
            for (let k = offsets[a]; k < offsets[a + 1]; k++) {
                const s = tris[k] * 3;
                if (rep[indices[s]] === b || rep[indices[s + 1]] === b || rep[indices[s + 2]] === b)
                    sharedCount++;
            }
            if (sharedCount !== 1)
                continue;
            const ex = positions[b * 3] - positions[a * 3];
            const ey = positions[b * 3 + 1] - positions[a * 3 + 1];
            const ez = positions[b * 3 + 2] - positions[a * 3 + 2];
            let px = ey * nz - ez * ny;
            let py = ez * nx - ex * nz;
            let pz = ex * ny - ey * nx;
            const plen = Math.sqrt(px * px + py * py + pz * pz);
            if (plen < 1e-20)
                continue;
            px /= plen;
            py /= plen;
            pz /= plen;
            const pd = -(px * positions[a * 3] + py * positions[a * 3 + 1] + pz * positions[a * 3 + 2]);
            const weight = (ex * ex + ey * ey + ez * ez) * BORDER_WEIGHT;
            addPlane(quadrics, a, px, py, pz, pd, weight);
            addPlane(quadrics, b, px, py, pz, pd, weight);
        }
    }
}
function addPlane(quadrics, vertex, a, b, c, d, w) {
    const q = vertex * Q;
    quadrics[q] += w * a * a;
    quadrics[q + 1] += w * a * b;
    quadrics[q + 2] += w * a * c;
    quadrics[q + 3] += w * a * d;
    quadrics[q + 4] += w * b * b;
    quadrics[q + 5] += w * b * c;
    quadrics[q + 6] += w * b * d;
    quadrics[q + 7] += w * c * c;
    quadrics[q + 8] += w * c * d;
    quadrics[q + 9] += w * d * d;
    quadrics[q + 10] += w;
}
function removeDeadTriangles(indices, dead) {
    const triangles = indices.length / 3;
    let alive = 0;
    for (let t = 0; t < triangles; t++)
        if (!dead[t])
            alive++;
    const out = new Uint32Array(alive * 3);
    let o = 0;
    for (let t = 0; t < triangles; t++) {
        if (dead[t])
            continue;
        out[o++] = indices[t * 3];
        out[o++] = indices[t * 3 + 1];
        out[o++] = indices[t * 3 + 2];
    }
    return out;
}
function boundsDiagonal(positions, vertexCount) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let v = 0; v < vertexCount; v++) {
        const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
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
    const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
/**
 * Index a non-indexed mesh by merging vertices whose attributes are all
 * identical (otherwise no two triangles would share a vertex).
 */
function buildIndexBuffer(geometry, vertexCount) {
    const arrays = [];
    for (const name of VERTEX_ATTRIBUTES) {
        const data = geometry[name];
        if (data && data.length % vertexCount === 0) {
            arrays.push({ data, size: data.length / vertexCount });
        }
    }
    const seen = new Map();
    const indices = new Uint32Array(vertexCount);
    for (let v = 0; v < vertexCount; v++) {
        let key = "";
        for (const { data, size } of arrays) {
            for (let k = 0; k < size; k++)
                key += data[v * size + k] + ",";
        }
        const existing = seen.get(key);
        if (existing === undefined) {
            seen.set(key, v);
            indices[v] = v;
        }
        else {
            indices[v] = existing;
        }
    }
    return indices;
}
/**
 * Build the output geometry: only the vertices the remaining triangles
 * use, in first-use order, with every attribute copied.
 */
function compactGeometry(source, indices, vertexCount, id) {
    const remap = new Int32Array(vertexCount).fill(-1);
    const order = [];
    const outIndices = new Uint32Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
        const v = indices[i];
        let n = remap[v];
        if (n < 0) {
            n = remap[v] = order.length;
            order.push(v);
        }
        outIndices[i] = n;
    }
    const result = {
        ...source,
        id,
        indices: order.length <= 65535 ? Uint16Array.from(outIndices) : outIndices
    };
    for (const name of VERTEX_ATTRIBUTES) {
        const data = source[name];
        if (!data || data.length % vertexCount !== 0)
            continue;
        const size = data.length / vertexCount;
        const Ctor = data.constructor;
        const out = new Ctor(order.length * size);
        for (let i = 0; i < order.length; i++) {
            const from = order[i] * size;
            for (let k = 0; k < size; k++)
                out[i * size + k] = data[from + k];
        }
        result[name] = out;
    }
    // Keep the source bounds: vertices never move, so they still enclose
    // the mesh, and every LOD level culls identically.
    return result;
}
