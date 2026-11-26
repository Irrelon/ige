/**
 * sRGB and linear light. Colours as people pick them (hex, CSS, 0 to 1 by eye, a photo's pixels) are sRGB-encoded:
 * their numbers follow how bright they look, not how much light they are. Lighting adds and multiplies light, so with
 * linear lighting on (IgeWebGlRenderer.linearLighting()) colours are decoded to linear light where they go in, lit,
 * and encoded back to sRGB once, for the screen. These are the exact piecewise sRGB curves (IEC 61966-2-1), the same
 * the GPU uses for sRGB textures, so a colour taken there and back comes back the same.
 */

/** An sRGB-encoded channel (0 to 1) as linear light. */
export function igeSrgbToLinear (c: number): number {
	if (c <= 0.04045) return c <= 0 ? 0 : c / 12.92;
	if (c === 1) return 1;
	return Math.pow((c + 0.055) / 1.055, 2.4);
}

/** A linear light channel (0 to 1) sRGB-encoded. */
export function igeLinearToSrgb (c: number): number {
	if (c <= 0.0031308) return c <= 0 ? 0 : c * 12.92;
	if (c === 1) return 1;
	return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** An sRGB colour's red, green and blue as linear light, into `out` (alpha, if there, untouched). */
export function igeColorToLinear<T extends { r: number; g: number; b: number }> (color: { r: number; g: number; b: number }, out: T): T {
	out.r = igeSrgbToLinear(color.r);
	out.g = igeSrgbToLinear(color.g);
	out.b = igeSrgbToLinear(color.b);
	return out;
}
