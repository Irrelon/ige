/**
 * sRGB and linear light on the CPU: the exact curves, and every 8-bit sRGB value surviving the trip there and back.
 */
import { igeColorToLinear, igeLinearToSrgb, igeSrgbToLinear } from "@/engine/utils/igeColorSpace";

describe("sRGB and linear light", () => {
	it("decodes sRGB to linear light on the standard curve", () => {
		expect(igeSrgbToLinear(0)).toBe(0);
		expect(igeSrgbToLinear(1)).toBe(1);
		// Mid grey as picked (0.5, #808080 is 0.502) is about a fifth of the light of white
		expect(igeSrgbToLinear(0.5)).toBeCloseTo(0.214041, 6);
		expect(igeSrgbToLinear(128 / 255)).toBeCloseTo(0.215861, 6);
		// The straight part near black, and where it meets the curve
		expect(igeSrgbToLinear(0.02)).toBeCloseTo(0.02 / 12.92, 9);
		expect(igeSrgbToLinear(0.04045)).toBeCloseTo(0.0031308, 6);
		// Out of range: clamped below, the curve above (colours over 1 are allowed in light)
		expect(igeSrgbToLinear(-0.5)).toBe(0);
		expect(igeSrgbToLinear(2)).toBeGreaterThan(1);
	});

	it("encodes linear light to sRGB, the inverse", () => {
		expect(igeLinearToSrgb(0)).toBe(0);
		expect(igeLinearToSrgb(1)).toBe(1);
		expect(igeLinearToSrgb(0.214041)).toBeCloseTo(0.5, 5);
		expect(igeLinearToSrgb(0.001)).toBeCloseTo(0.01292, 6);
		for (let i = 0; i <= 100; i++) {
			const c = i / 100;
			expect(igeLinearToSrgb(igeSrgbToLinear(c))).toBeCloseTo(c, 9);
		}
	});

	it("brings every 8-bit sRGB value back to itself after a trip through linear light", () => {
		for (let v = 0; v < 256; v++) {
			expect(Math.round(igeLinearToSrgb(igeSrgbToLinear(v / 255)) * 255)).toBe(v);
		}
	});

	it("converts a colour's red, green and blue, leaving its alpha", () => {
		const out = igeColorToLinear({ r: 1, g: 0.5, b: 0 }, { r: 0, g: 0, b: 0, a: 0.25 });
		expect(out.r).toBe(1);
		expect(out.g).toBeCloseTo(0.214041, 6);
		expect(out.b).toBe(0);
		expect(out.a).toBe(0.25);
	});
});
