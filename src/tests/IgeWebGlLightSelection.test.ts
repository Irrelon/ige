import { IgeWebGlLightManager } from "@/engine/webgl/IgeWebGlLightManager";
import { IgePointLight, IgeSpotLight } from "@/engine/webgl/IgeWebGlLight";

const point = (x: number, z: number, range = 300, intensity = 1) => {
	const light = new IgePointLight();
	light.translateTo(x, 200, z);
	light.range(range);
	light.intensity(intensity);
	return light;
};

describe("Light selection per view", () => {
	it("takes any number of lights and gives each view the nearest that reach it", () => {
		const manager = new IgeWebGlLightManager();
		// A corridor of 30 ceiling lights, 200 apart along x
		const lights = Array.from({ length: 30 }, (_, i) => point(i * 200, 0));
		for (const light of lights) manager.addLight(light);
		expect(manager.getLightCount().point).toBe(30);

		manager.focus(0, 0, 0, 400);
		expect(manager.activePointLights()).toEqual(lights.slice(0, 4)); // within 300 + 400, nearest first

		manager.focus(3000, 0, 0, 1000);
		const chosen = manager.activePointLights();
		expect(chosen).toHaveLength(8);
		expect(chosen.map((l) => l._translate.x).sort((a, b) => a - b)).toEqual([2200, 2400, 2600, 2800, 3000, 3200, 3400, 3600]);
	});

	it("skips lights that are off, and selects spot lights the same way", () => {
		const manager = new IgeWebGlLightManager();
		const off = point(0, 0, 300, 0);
		const on = point(100, 0);
		manager.addLight(off);
		manager.addLight(on);
		const spots = Array.from({ length: 6 }, (_, i) => {
			const spot = new IgeSpotLight();
			spot.translateTo(i * 50, 200, 0);
			spot.range(500);
			manager.addLight(spot);
			return spot;
		});
		manager.focus(0, 0, 0, 200);
		expect(manager.activePointLights()).toEqual([on]);
		expect(manager.activeSpotLights()).toEqual(spots.slice(0, 4));
	});
});
