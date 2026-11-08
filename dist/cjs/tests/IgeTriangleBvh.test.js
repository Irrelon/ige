"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IgeTriangleBvh_1 = require("../engine/webgl/IgeTriangleBvh.js");
const IgeRaycast_1 = require("../engine/webgl/IgeRaycast.js");
const IgeDecalProjector_1 = require("../engine/webgl/IgeDecalProjector.js");
/** Deterministic random numbers. */
function random(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}
/** A bumpy terrain grid of cells x cells quads (2 triangles each), 10 units per cell. */
function terrain(cells, bumpy = true) {
    const vertices = [];
    const indices = [];
    for (let z = 0; z <= cells; z++) {
        for (let x = 0; x <= cells; x++) {
            vertices.push(x * 10, bumpy ? Math.sin(x * 0.7) * 6 + Math.cos(z * 0.5) * 4 : 0, z * 10);
        }
    }
    const row = cells + 1;
    for (let z = 0; z < cells; z++) {
        for (let x = 0; x < cells; x++) {
            const a = z * row + x;
            indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
        }
    }
    return { id: `terrain_${cells}_${bumpy}`, vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}
describe("IgeTriangleBvh", () => {
    it("finds the same nearest triangle as testing every triangle", () => {
        const mesh = terrain(40);
        const bvh = (0, IgeTriangleBvh_1.buildTriangleBvh)(mesh.vertices, mesh.indices);
        const rand = random(7);
        let hits = 0;
        for (let i = 0; i < 400; i++) {
            const ox = rand() * 400, oz = rand() * 400, oy = 30 + rand() * 50;
            let dx = rand() - 0.5, dy = -rand(), dz = rand() - 0.5;
            const len = Math.hypot(dx, dy, dz);
            dx /= len;
            dy /= len;
            dz /= len;
            const brute = (0, IgeRaycast_1.intersectTriangles)(mesh.vertices, mesh.indices, ox, oy, oz, dx, dy, dz);
            const fast = (0, IgeTriangleBvh_1.bvhRaycast)(bvh, mesh.vertices, mesh.indices, ox, oy, oz, dx, dy, dz);
            expect(fast === null || fast === void 0 ? void 0 : fast.triangle).toBe(brute === null || brute === void 0 ? void 0 : brute.triangle);
            if (brute) {
                hits++;
                expect(fast.t).toBeCloseTo(brute.t, 4);
            }
        }
        expect(hits).toBeGreaterThan(100);
    });
    it("handles axis-aligned rays starting on a box face", () => {
        var _a, _b;
        const flat = terrain(20, false);
        const bvh = (0, IgeTriangleBvh_1.buildTriangleBvh)(flat.vertices, flat.indices);
        // Straight down onto a vertex row, and along the flat surface's plane edge
        expect((_a = (0, IgeTriangleBvh_1.bvhRaycast)(bvh, flat.vertices, flat.indices, 50, 10, 55, 0, -1, 0)) === null || _a === void 0 ? void 0 : _a.t).toBeCloseTo(10, 5);
        expect((_b = (0, IgeTriangleBvh_1.bvhRaycast)(bvh, flat.vertices, flat.indices, 0, 10, 0, 0, -1, 0)) === null || _b === void 0 ? void 0 : _b.t).toBeCloseTo(10, 5);
        expect((0, IgeTriangleBvh_1.bvhRaycast)(bvh, flat.vertices, flat.indices, 50, 10, 55, 0, 1, 0)).toBeNull();
    });
    it("box queries return every triangle overlapping the box", () => {
        const mesh = terrain(30);
        const bvh = (0, IgeTriangleBvh_1.buildTriangleBvh)(mesh.vertices, mesh.indices);
        const found = new Set();
        (0, IgeTriangleBvh_1.bvhQueryBox)(bvh, 95, -20, 95, 125, 20, 135, (tri) => found.add(tri));
        const v = mesh.vertices, idx = mesh.indices;
        for (let tri = 0; tri < idx.length / 3; tri++) {
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            for (let k = 0; k < 3; k++) {
                const i = idx[tri * 3 + k] * 3;
                minX = Math.min(minX, v[i]);
                maxX = Math.max(maxX, v[i]);
                minZ = Math.min(minZ, v[i + 2]);
                maxZ = Math.max(maxZ, v[i + 2]);
            }
            const overlaps = minX <= 125 && maxX >= 95 && minZ <= 135 && maxZ >= 95;
            if (overlaps)
                expect(found.has(tri)).toBe(true);
        }
        // Far fewer than the whole mesh
        expect(found.size).toBeLessThan(idx.length / 3 / 10);
    });
    it("caches one BVH per geometry until its vertices are replaced", () => {
        const mesh = terrain(10);
        const first = (0, IgeTriangleBvh_1.getTriangleBvh)(mesh);
        expect((0, IgeTriangleBvh_1.getTriangleBvh)(mesh)).toBe(first);
        mesh.vertices = new Float32Array(mesh.vertices);
        expect((0, IgeTriangleBvh_1.getTriangleBvh)(mesh)).not.toBe(first);
    });
    it("projects decals onto large meshes through the BVH", () => {
        // 60 x 60 cells = 7200 triangles, flat: the decal covers exactly its square
        const mesh = terrain(60, false);
        const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        const out = (0, IgeDecalProjector_1.projectDecal)([{ geometry: mesh, matrix: identity }], {
            position: { x: 300, y: 0, z: 300 }, normal: { x: 0, y: 1, z: 0 },
            size: 50, depth: 20, rotation: 0.4, maxAngle: Math.PI / 2.4, lift: 0.5
        });
        let area = 0;
        const f = IgeDecalProjector_1.PROJECTED_DECAL_VERTEX_FLOATS;
        for (let i = 0; i < out.length; i += f * 3) {
            const ax = out[i + f] - out[i], az = out[i + f + 2] - out[i + 2];
            const bx = out[i + 2 * f] - out[i], bz = out[i + 2 * f + 2] - out[i + 2];
            area += Math.abs(ax * bz - az * bx) / 2;
        }
        expect(area).toBeCloseTo(50 * 50, 2);
    });
});
