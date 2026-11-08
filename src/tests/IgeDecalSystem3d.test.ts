import { DECAL_INSTANCE_FLOATS, IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";

describe("IgeDecalSystem3d", () => {
	it("replaces the oldest decal when full and keeps render data oldest first", () => {
		const decals = new IgeDecalSystem3d({ maxDecals: 3, lift: 0 });
		for (let i = 0; i < 5; i++) decals.add(i * 10, 0, { size: 10, rotation: 0, cell: 0 });
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
		expect(new IgeDecalSystem3d({ texture: {} as never }).atlasGrid()).toBe(1);
		expect(new IgeDecalSystem3d({ texture: {} as never, atlasGrid: 4 }).atlasGrid()).toBe(4);
	});
});
