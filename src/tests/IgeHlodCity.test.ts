/**
 * The hlodCity example's camera: from high up its near plane rises with it, so far-off roofs (0.6 m above their
 * buildings' tops) keep their depths apart in a 24-bit depth buffer. With the near plane left at 1 m, from 4 km up
 * they were a metre or more of depth apart and shimmered as the camera moved.
 */
import { cameraNear, depthStep, MAX_HEIGHT } from "@/examples/hlodCity/city";

const FAR = 12000;
const ROOF_GAP = 0.6;

describe("hlodCity: depth precision from high up", () => {
	it("a 1 m near plane can't tell roofs from the tops under them far off (the shimmering rooftops)", () => {
		expect(depthStep(1, FAR, 4000)).toBeGreaterThan(ROOF_GAP);
	});

	it("from 400 m up to 5 km, roofs out to the far plane are told apart (a quarter of the gap or finer)", () => {
		for (const height of [400, 800, 1500, 2500, 4000, 5000]) {
			expect(depthStep(cameraNear(height), FAR, FAR)).toBeLessThan(ROOF_GAP / 4);
		}
	});

	it("the near plane clips nothing: under the nearest roof's distance along the view, whatever the camera looks at", () => {
		// (The lens's widest angle off its axis, corner to corner at 16:9 and 60 degrees tall, is under 50 degrees)
		for (const height of [2, 60, MAX_HEIGHT + 10, 400, 4000]) {
			expect(cameraNear(height)).toBeLessThanOrEqual(Math.max(1, (height - MAX_HEIGHT) * Math.cos((50 * Math.PI) / 180)));
		}
	});
});
