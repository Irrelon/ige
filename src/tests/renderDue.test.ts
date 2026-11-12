import { renderDue } from "@/engine/utils/renderDue";

describe("a capped render rate (IgeEngine.maxRenderRate)", () => {
	it("draws every tick uncapped, and at 20 fps every third 60 Hz tick when capped", () => {
		expect(renderDue(0, 1000, 1001)).toBe(true);
		let last = -Infinity, drawn = 0;
		for (let tick = 0; tick < 60; tick++) {
			const now = tick * (1000 / 60);
			if (renderDue(20, last, now)) {
				last = now;
				drawn++;
			}
		}
		expect(drawn).toBe(20);
		// Uncapped again: the very next tick draws
		expect(renderDue(0, last, last + 1)).toBe(true);
	});
});
