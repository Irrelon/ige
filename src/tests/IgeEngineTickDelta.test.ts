import { IgeEngine } from "@/engine/core/IgeEngine";
import { ige } from "@/engine/instance";
import { IgeBehaviourType, IgeEngineState } from "@/enums";

/*
 * The engine's frame delta (the tickDelta behaviours get) follows the
 * display's frame times exactly. It was the difference of whole
 * milliseconds, so a 120 Hz display's 8.33 ms frames came as 8, 8, 9 and
 * anything placed by elapsed time (physics interpolated between fixed
 * steps, cameras) juddered by up to a millisecond's movement a frame.
 */
describe("IgeEngine tick delta", () => {
	function deltas (frameMs: number, frames: number): number[] {
		const engine = new IgeEngine();
		clearInterval(engine._secondTimer);
		Object.defineProperty(ige, "engine", { value: engine, configurable: true, writable: true });
		engine._state = IgeEngineState.started;
		engine._enableRenders = false;
		engine.requestAnimFrame = () => {};
		const seen: number[] = [];
		engine.addBehaviour(IgeBehaviourType.postUpdate, "record", (_e: unknown, tickDelta: number) => seen.push(tickDelta));
		for (let frame = 0; frame < frames + 2; frame++) engine.engineStep(1000 + frame * frameMs);
		// The first two frames start the clock (no delta yet)
		return seen.slice(2);
	}

	for (const hz of [60, 120, 144]) {
		it(`is each frame's exact length at ${hz} Hz`, () => {
			const frameMs = 1000 / hz;
			const seen = deltas(frameMs, 120);
			expect(seen.length).toBe(120);
			for (const delta of seen) expect(delta).toBeCloseTo(frameMs, 6);
		});
	}
});
