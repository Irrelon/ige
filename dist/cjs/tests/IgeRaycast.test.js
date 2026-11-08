"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IgeEntity_1 = require("../engine/core/IgeEntity.js");
const instance_1 = require("../engine/instance.js");
const IgeRaycast_1 = require("../engine/webgl/IgeRaycast.js");
// updateTransform() builds 3D world matrices when the renderer is the WebGL one
beforeAll(() => {
    Object.defineProperty(instance_1.ige, "engine", {
        value: { renderer: () => ({ classId: "IgeWebGlRenderer" }) },
        configurable: true,
        writable: true
    });
});
/** A 2 x 2 square on the z = 0 plane, facing +Z. */
function square(id = "square") {
    return {
        id,
        vertices: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
        indices: new Uint16Array([0, 1, 2, 0, 2, 3])
    };
}
function meshEntity(geometry) {
    const entity = new IgeEntity_1.IgeEntity();
    entity._geometryData = geometry;
    return entity;
}
const down = (x, y) => ({ origin: { x, y, z: 100 }, direction: { x: 0, y: 0, z: -1 } });
describe("IgeRaycast", () => {
    it("finds the nearest triangle and misses outside it", () => {
        var _a;
        const { vertices, indices } = square();
        expect((0, IgeRaycast_1.intersectTriangles)(vertices, indices, 0.5, 0.9, 10, 0, 0, -1)).toEqual({ t: 10, triangle: 1 });
        expect((_a = (0, IgeRaycast_1.intersectTriangles)(vertices, indices, 0.9, -0.5, 10, 0, 0, -1)) === null || _a === void 0 ? void 0 : _a.triangle).toBe(0);
        expect((0, IgeRaycast_1.intersectTriangles)(vertices, indices, 1.5, 0, 10, 0, 0, -1)).toBeNull();
        // Beyond maxT, or behind the origin
        expect((0, IgeRaycast_1.intersectTriangles)(vertices, indices, 0, 0, 10, 0, 0, -1, 5)).toBeNull();
        expect((0, IgeRaycast_1.intersectTriangles)(vertices, indices, 0, 0, 10, 0, 0, 1)).toBeNull();
    });
    it("inverts matrices", () => {
        const m = new Float32Array([2, 0, 0, 0, 0, 0, 3, 0, 0, -1, 0, 0, 5, 6, 7, 1]);
        const inv = (0, IgeRaycast_1.invertMat4)(m);
        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                let sum = 0;
                for (let k = 0; k < 4; k++)
                    sum += m[k * 4 + row] * inv[col * 4 + k];
                expect(sum).toBeCloseTo(col === row ? 1 : 0, 5);
            }
        }
        expect((0, IgeRaycast_1.invertMat4)(new Float32Array(16))).toBeNull();
    });
    it("tests entities through their world transform, nearest first", () => {
        const scene = new IgeEntity_1.IgeEntity();
        // Scaled up 50x and moved: covers x, y in [50, 150] at z = 20
        const near = meshEntity(square("near")).translateTo(100, 100, 20).scaleTo(50, 50, 50).mount(scene);
        const far = meshEntity(square("far")).translateTo(100, 100, -30).scaleTo(50, 50, 50).mount(scene);
        [scene, near, far].forEach((e) => e.updateTransform());
        const hits = (0, IgeRaycast_1.raycastEntities)({ origin: { x: 120, y: 80, z: 100 }, direction: { x: 0, y: 0, z: -1 } }, scene);
        expect(hits.map((h) => h.entity)).toEqual([near, far]);
        expect(hits[0].distance).toBeCloseTo(80, 4);
        expect(hits[0].point.x).toBeCloseTo(120, 4);
        expect(hits[0].point.z).toBeCloseTo(20, 4);
        expect(hits[0].normal.z).toBeCloseTo(1, 5);
        // From below, the normal still faces the ray
        const below = (0, IgeRaycast_1.raycastEntities)({ origin: { x: 120, y: 80, z: -100 }, direction: { x: 0, y: 0, z: 1 } }, scene);
        expect(below[0].entity).toBe(far);
        expect(below[0].normal.z).toBeCloseTo(-1, 5);
        // Outside the scaled square, children off, hidden and filtered entities
        expect((0, IgeRaycast_1.raycastEntities)(down(10, 10), scene)).toHaveLength(0);
        expect((0, IgeRaycast_1.raycastEntities)(down(120, 80), scene, { children: false })).toHaveLength(0);
        expect((0, IgeRaycast_1.raycastEntities)(down(120, 80), scene, { maxDistance: 50 })).toHaveLength(0);
        near.hide();
        expect((0, IgeRaycast_1.raycastEntities)(down(120, 80), scene).map((h) => h.entity)).toEqual([far]);
        near.show();
        expect((0, IgeRaycast_1.raycastEntities)(down(120, 80), scene, { filter: (e) => e !== far }).map((h) => h.entity)).toEqual([near]);
    });
    it("skins vertices on the CPU by their bone weights", () => {
        const geometry = {
            id: "skinned",
            vertices: new Float32Array([0, 0, 0, 1, 0, 0]),
            boneIndices: new Uint8Array([0, 0, 0, 0, 0, 1, 0, 0]),
            boneWeights: new Float32Array([1, 0, 0, 0, 0.5, 0.5, 0, 0])
        };
        const skin = new Float32Array(32);
        // Bone 0: identity; bone 1: move up 2
        skin.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 0);
        skin.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, 0, 1], 16);
        const posed = (0, IgeRaycast_1.skinnedPositions)(geometry, { skinMatrices: skin });
        expect(Array.from(posed)).toEqual([0, 0, 0, 1, 1, 0]);
    });
});
