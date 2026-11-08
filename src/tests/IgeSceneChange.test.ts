import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeParticleSystem3d } from "@/engine/webgl/IgeParticleSystem3d";
import { IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";
import { igeSceneChange } from "@/engine/utils/sceneChange";
import { ige } from "@/engine/instance";

// updateTransform() asks the engine which renderer is active; these tests
// only need "none" (the 2D path)
beforeAll(() => {
	Object.defineProperty(ige, "engine", { value: { renderer: () => undefined }, configurable: true, writable: true });
});

/** Run fn and return how many scene changes it reported. */
function changes (fn: () => void): number {
	const before = igeSceneChange.count;
	fn();
	return igeSceneChange.count - before;
}

describe("scene change reporting (render on demand)", () => {
	it("reports transform changes, but not unchanged updates", () => {
		const entity = new IgeEntity();
		entity.updateTransform();
		expect(changes(() => entity.updateTransform())).toBe(0);
		expect(changes(() => entity.translateTo(10, 0, 0).updateTransform())).toBeGreaterThan(0);
		expect(changes(() => entity.updateTransform())).toBe(0);
	});

	it("reports showing and hiding only when visibility changes", () => {
		const entity = new IgeEntity();
		expect(changes(() => entity.hide())).toBe(1);
		expect(changes(() => entity.hide())).toBe(0);
		expect(changes(() => entity.show())).toBe(1);
		expect(changes(() => entity.show())).toBe(0);
	});

	it("doesn't report moves of hidden entities", () => {
		const entity = new IgeEntity();
		entity.updateTransform();
		entity.hide();
		expect(changes(() => entity.translateTo(5, 5, 0).updateTransform())).toBe(0);
	});

	it("reports material and appearance changes, but not repeated values", () => {
		const entity = new IgeEntity();
		const tint = { color: { r: 1, g: 0, b: 0, a: 1 } };
		expect(changes(() => entity.material(tint))).toBe(1);
		expect(entity.material()).toBe(tint);
		expect(changes(() => entity.material(null))).toBe(1);
		expect(entity.material()).toBeNull();

		expect(changes(() => entity.opacity(0.5))).toBe(1);
		expect(changes(() => entity.opacity(0.5))).toBe(0);
		expect(changes(() => entity.cell(2))).toBe(1);
		expect(changes(() => entity.cell(2))).toBe(0);
		expect(changes(() => entity.width(64))).toBe(1);
		expect(changes(() => entity.width(64))).toBe(0);
		expect(changes(() => entity.cacheDirty(true))).toBe(1);
	});

	it("doesn't report appearance changes of hidden entities", () => {
		const entity = new IgeEntity().hide();
		expect(changes(() => entity.material({ color: "#ff0000" }))).toBe(0);
		expect(changes(() => entity.opacity(0.25))).toBe(0);
	});

	it("reports particles only while some are alive", () => {
		const system = new IgeParticleSystem3d({ rate: 0, lifetime: [0.1, 0.1] });
		expect(changes(() => system._simulate(0.016))).toBe(0);
		system.burst(5, { x: 0, y: 0, z: 0 });
		expect(changes(() => system._simulate(0.016))).toBe(1);
		// The frame where the last particle dies still needs drawing
		expect(changes(() => system._simulate(1))).toBe(1);
		expect(changes(() => system._simulate(0.016))).toBe(0);
	});

	it("reports decals when added or fading, not while unchanged", () => {
		const decals = new IgeDecalSystem3d({ lifetime: 1, fadeTime: 1 });
		decals.add(0, 0);
		expect(changes(() => decals._age(0.1))).toBe(1);
		expect(changes(() => decals._age(0.1))).toBe(0);
		expect(changes(() => decals._age(1))).toBe(1); // fading
	});
});
