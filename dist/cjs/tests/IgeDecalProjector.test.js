"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IgeDecalProjector_1 = require("../engine/webgl/IgeDecalProjector.js");
const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
/** A quad from four corners (counter-clockwise seen from its front). */
function quad(id, corners) {
    return {
        id,
        vertices: new Float32Array(corners.flat()),
        indices: new Uint16Array([0, 1, 2, 0, 2, 3])
    };
}
// Floor at y = 0 facing up, 200 x 200 around the origin
const floor = quad("floor", [[-100, 0, 100], [100, 0, 100], [100, 0, -100], [-100, 0, -100]]);
// Wall in the plane z = -50 facing +Z
const wall = quad("wall", [[-100, 0, -50], [100, 0, -50], [100, 100, -50], [-100, 100, -50]]);
function projection(overrides) {
    return Object.assign({ position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, size: 40, depth: 20, rotation: 0.3, maxAngle: (75 * Math.PI) / 180, lift: 0.5 }, overrides);
}
/** Total world-space area of the output triangles. */
function area(out) {
    let total = 0;
    const f = IgeDecalProjector_1.PROJECTED_DECAL_VERTEX_FLOATS;
    for (let i = 0; i < out.length; i += f * 3) {
        const ax = out[i + f] - out[i], ay = out[i + f + 1] - out[i + 1], az = out[i + f + 2] - out[i + 2];
        const bx = out[i + 2 * f] - out[i], by = out[i + 2 * f + 1] - out[i + 1], bz = out[i + 2 * f + 2] - out[i + 2];
        total += Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2;
    }
    return total;
}
describe("projectDecal", () => {
    it("covers exactly the decal's square on a flat floor, lifted off it", () => {
        const out = (0, IgeDecalProjector_1.projectDecal)([{ geometry: floor, matrix: IDENTITY }], projection({}));
        expect(out.length % (IgeDecalProjector_1.PROJECTED_DECAL_VERTEX_FLOATS * 3)).toBe(0);
        expect(area(out)).toBeCloseTo(40 * 40, 3);
        for (let i = 0; i < out.length; i += IgeDecalProjector_1.PROJECTED_DECAL_VERTEX_FLOATS) {
            expect(out[i + 1]).toBeCloseTo(0.5, 5);
            expect(out[i + 3]).toBeGreaterThanOrEqual(-1e-5);
            expect(out[i + 3]).toBeLessThanOrEqual(1 + 1e-5);
            expect(out[i + 4]).toBeGreaterThanOrEqual(-1e-5);
            expect(out[i + 4]).toBeLessThanOrEqual(1 + 1e-5);
        }
    });
    it("lands on a wall facing it, not on one facing away", () => {
        const onWall = (0, IgeDecalProjector_1.projectDecal)([{ geometry: wall, matrix: IDENTITY }], projection({
            position: { x: 0, y: 50, z: -50 },
            normal: { x: 0, y: 0, z: 1 }
        }));
        expect(area(onWall)).toBeCloseTo(40 * 40, 3);
        const behind = (0, IgeDecalProjector_1.projectDecal)([{ geometry: wall, matrix: IDENTITY }], projection({
            position: { x: 0, y: 50, z: -50 },
            normal: { x: 0, y: 0, z: -1 }
        }));
        expect(behind.length).toBe(0);
    });
    it("follows a step: both levels inside the depth, not the riser", () => {
        const low = quad("low", [[-100, 0, 100], [0, 0, 100], [0, 0, -100], [-100, 0, -100]]);
        const high = quad("high", [[0, 8, 100], [100, 8, 100], [100, 8, -100], [0, 8, -100]]);
        // Riser at x = 0 facing -X
        const riser = quad("riser", [[0, 0, -100], [0, 0, 100], [0, 8, 100], [0, 8, -100]]);
        const meshes = [low, high, riser].map((geometry) => ({ geometry, matrix: IDENTITY }));
        const out = (0, IgeDecalProjector_1.projectDecal)(meshes, projection({ position: { x: 0, y: 4, z: 0 }, rotation: 0 }));
        expect(area(out)).toBeCloseTo(40 * 40, 3);
        let lowY = 0, highY = 0;
        for (let i = 0; i < out.length; i += IgeDecalProjector_1.PROJECTED_DECAL_VERTEX_FLOATS) {
            if (Math.abs(out[i + 1] - 0.5) < 1e-4)
                lowY++;
            else if (Math.abs(out[i + 1] - 8.5) < 1e-4)
                highY++;
            else
                throw new Error(`vertex off both levels at y ${out[i + 1]}`);
        }
        expect(lowY).toBeGreaterThan(0);
        expect(highY).toBeGreaterThan(0);
    });
    it("leaves out surfaces beyond the depth and meshes out of reach", () => {
        const raised = quad("raised", [[-100, 30, 100], [100, 30, 100], [100, 30, -100], [-100, 30, -100]]);
        expect((0, IgeDecalProjector_1.projectDecal)([{ geometry: raised, matrix: IDENTITY }], projection({})).length).toBe(0);
        const far = new Float32Array(IDENTITY);
        far[12] = 1000;
        expect((0, IgeDecalProjector_1.projectDecal)([{ geometry: floor, matrix: far }], projection({})).length).toBe(0);
    });
    it("applies the mesh's world matrix", () => {
        // The floor scaled down to 20 x 20: the decal is clipped to the floor
        const small = new Float32Array(IDENTITY);
        small[0] = 0.1;
        small[5] = 0.1;
        small[10] = 0.1;
        const out = (0, IgeDecalProjector_1.projectDecal)([{ geometry: floor, matrix: small }], projection({ rotation: 0 }));
        expect(area(out)).toBeCloseTo(20 * 20, 3);
    });
});
