import { DECAL_INSTANCE_FLOATS, DECAL_MESH_VERTEX_FLOATS, IgeDecalSystem3d } from "../engine/webgl/IgeDecalSystem3d.js"
import { IgeEntity } from "../engine/core/IgeEntity.js"
import { ige } from "../engine/instance.js"
// updateTransform() builds the 3D world matrices projected decals use
// when the engine's renderer is the WebGL one
beforeAll(() => {
    Object.defineProperty(ige, "engine", {
        value: { renderer: () => ({ classId: "IgeWebGlRenderer" }) },
        configurable: true,
        writable: true
    });
});
/** A 200 x 200 floor entity at y = 0 with a child wall at z = -50 facing +Z. */
function room() {
    const floor = new IgeEntity();
    floor._geometryData = {
        id: "floor",
        vertices: new Float32Array([-100, 0, 100, 100, 0, 100, 100, 0, -100, -100, 0, -100]),
        indices: new Uint16Array([0, 1, 2, 0, 2, 3])
    };
    const wall = new IgeEntity().mount(floor);
    wall._geometryData = {
        id: "wall",
        vertices: new Float32Array([-100, 0, -50, 100, 0, -50, 100, 100, -50, -100, 100, -50]),
        indices: new Uint16Array([0, 1, 2, 0, 2, 3])
    };
    return floor;
}
describe("IgeDecalSystem3d", () => {
    it("replaces the oldest decal when full and keeps render data oldest first", () => {
        const decals = new IgeDecalSystem3d({ maxDecals: 3, lift: 0 });
        for (let i = 0; i < 5; i++)
            decals.add(i * 10, 0, { size: 10, rotation: 0, cell: 0 });
        decals._age(0);
        const { data, count } = decals.renderData();
        expect(count).toBe(3);
        expect([0, 1, 2].map((i) => data[i * DECAL_INSTANCE_FLOATS])).toEqual([20, 30, 40]);
    });
    it("fades decals out after their lifetime and then removes them", () => {
        const decals = new IgeDecalSystem3d({ maxDecals: 8, lifetime: 1, fadeTime: 1 });
        decals.add(0, 0, { opacity: 0.8 });
        decals._age(0.5);
        decals.add(5, 5, { opacity: 0.8 });
        decals._age(0);
        expect(decals.renderData().data[7]).toBeCloseTo(0.8, 5);
        // First decal is halfway through its fade, the second still solid
        decals._age(1);
        const { data } = decals.renderData();
        expect(data[7]).toBeCloseTo(0.4, 5);
        expect(data[DECAL_INSTANCE_FLOATS + 7]).toBeCloseTo(0.8, 5);
        decals._age(0.6);
        expect(decals.decalCount()).toBe(1);
        expect(decals.renderData().data[0]).toBe(5);
    });
    it("only rebuilds its render data when something visible changed", () => {
        const decals = new IgeDecalSystem3d({ lifetime: 10 });
        decals.add(0, 0);
        decals._age(0.1);
        const version = decals._renderVersion;
        decals._age(0.1);
        expect(decals._renderVersion).toBe(version);
        decals.add(1, 1);
        decals._age(0.1);
        expect(decals._renderVersion).toBe(version + 1);
    });
    it("bounds every decal for culling", () => {
        const decals = new IgeDecalSystem3d({ lift: 0 });
        decals.add(-100, 0, { size: 20 });
        decals.add(100, 0, { size: 20 });
        decals._age(0);
        expect(decals._boundsCenter.x).toBeCloseTo(0, 5);
        expect(decals._boundsRadius).toBeGreaterThanOrEqual(100 + 10);
    });
    it("uses a 2x2 atlas by default and a single image for custom textures", () => {
        expect(new IgeDecalSystem3d().atlasGrid()).toBe(2);
        expect(new IgeDecalSystem3d({ texture: {} }).atlasGrid()).toBe(1);
        expect(new IgeDecalSystem3d({ texture: {}, atlasGrid: 4 }).atlasGrid()).toBe(4);
    });
    it("projects decals onto target entities and their children, fading and expiring them", () => {
        const target = room();
        const decals = new IgeDecalSystem3d({ lifetime: 1, fadeTime: 1, maxProjected: 2 });
        // Onto the child wall, and onto the floor
        decals.project({ x: 0, y: 50, z: -50 }, { x: 0, y: 0, z: 1 }, target, { size: 30, opacity: 0.8, cell: 3 });
        decals.project({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, target, { size: 30, opacity: 0.8 });
        // Pointing away from every surface: nothing is added
        decals.project({ x: 0, y: 50, z: -50 }, { x: 0, y: 0, z: -1 }, target);
        expect(decals.projectedCount()).toBe(2);
        decals._age(0);
        const { data, vertexCount } = decals.meshRenderData();
        expect(vertexCount).toBeGreaterThan(0);
        // Wall decal first: on the wall plane, in atlas cell 3 (bottom right of 2 x 2)
        expect(data[2]).toBeCloseTo(-49.5, 4);
        expect(data[3]).toBeGreaterThanOrEqual(0.5 - 1e-5);
        expect(data[4]).toBeGreaterThanOrEqual(0.5 - 1e-5);
        expect(data[8]).toBeCloseTo(0.8, 5);
        decals._age(1.5); // half faded
        expect(decals.meshRenderData().data[8]).toBeCloseTo(0.4, 4);
        decals._age(1);
        expect(decals.projectedCount()).toBe(0);
        expect(decals.meshRenderData().vertexCount).toBe(0);
        // The oldest projected decal is replaced when full
        for (let i = 0; i < 3; i++)
            decals.project({ x: i * 10, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, target, { size: 5, rotation: 0 });
        expect(decals.projectedCount()).toBe(2);
        decals._age(0);
        const first = decals.meshRenderData().data;
        expect(Math.abs(first[0] - 10)).toBeLessThanOrEqual(2.5 + 1e-4);
        expect(DECAL_MESH_VERTEX_FLOATS).toBe(9);
    });
});
