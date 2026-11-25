import { igeConfig } from "@/engine/core/config";
import { IgeEngine } from "@/engine/core/IgeEngine";
import { ige } from "@/engine/instance";
import { IgeEngineState } from "@/enums";

/*
 * Debug timing times every entity's update and draw each frame. It was on by default and cost games milliseconds a
 * frame they never looked at, so it's off unless a page that shows the timings turns it on.
 */
describe("debug timing", () => {
	function engine (): IgeEngine {
		const e = new IgeEngine();
		clearInterval(e._secondTimer);
		Object.defineProperty(ige, "engine", { value: e, configurable: true, writable: true });
		e._state = IgeEngineState.started;
		e._enableRenders = false;
		e.requestAnimFrame = () => {};
		return e;
	}

	afterEach(() => {
		igeConfig.debug._timing = false;
	});

	it("is off by default", () => {
		expect(igeConfig.debug._timing).toBe(false);
		expect(engine().debugTiming()).toBe(false);
	});

	it("records no timings while off, and the engine's step once turned on", () => {
		const e = engine();
		for (let frame = 0; frame < 3; frame++) e.engineStep(1000 + frame * 16);
		expect(Object.keys(ige.stats.toObject())).toEqual([]);

		expect(e.debugTiming(true)).toBe(e);
		expect(e.debugTiming()).toBe(true);
		for (let frame = 3; frame < 6; frame++) e.engineStep(1000 + frame * 16);
		expect(Object.keys(ige.stats.toObject())).toContain("IgeEngine");
	});
});
