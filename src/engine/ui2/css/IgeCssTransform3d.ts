/**
 * 3D and skew transform functions on the engine's UI, which draws every
 * element flat. A 3D transform becomes the 2D transform it shows seen
 * straight on (an orthographic view: no perspective, no depth): a card
 * turned with rotateY(a) narrows to its edge and widens again mirrored
 * (scaleX(cos a)), a face moved with translateZ() stays where it is, and
 * matrix3d() keeps its x and y parts. Turns about the same axis compose as
 * they do in 3D, so a card's back (rotateY(180deg)) on a turned card
 * (rotateY(180deg)) faces the front again.
 *
 * This flat view is what layout and hit testing use. What's drawn, and
 * getBoundingClientRect, are the real thing (render/IgeUiPerspective):
 * perspective, preserve-3d and backface-visibility; and getComputedStyle
 * gives a 3D transform's 4x4 (matrix3d), as Chrome does.
 *
 * skew(), skewX() and skewY() are exact.
 */
import type { IgeCssMatrix } from "@/engine/ui2/css/IgeCssValues";

/** An angle in degrees (deg, rad, turn, grad; a bare 0). */
function degrees (value: string | undefined): number {
	const v = (value ?? "0").trim();
	const m = /^(-?[\d.]+(?:e-?\d+)?)(deg|rad|turn|grad)?$/i.exec(v);
	if (!m) return 0;
	const n = Number(m[1]);
	switch ((m[2] ?? "deg").toLowerCase()) {
		case "rad": return (n * 180) / Math.PI;
		case "turn": return n * 360;
		case "grad": return n * 0.9;
		default: return n;
	}
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** A rotation about (x, y, z) by `deg`, as its 3x3 matrix (row-major). */
function rotation3d (x: number, y: number, z: number, deg: number): number[] {
	const len = Math.hypot(x, y, z) || 1;
	const [ux, uy, uz] = [x / len, y / len, z / len];
	const a = rad(deg), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
	return [
		t * ux * ux + c, t * ux * uy - s * uz, t * ux * uz + s * uy,
		t * ux * uy + s * uz, t * uy * uy + c, t * uy * uz - s * ux,
		t * ux * uz - s * uy, t * uy * uz + s * ux, t * uz * uz + c
	];
}

/** A 3x3 rotation's view straight on: its x and y rows and columns. */
function flat (r: number[]): IgeCssMatrix {
	return [r[0], r[3], r[1], r[4], 0, 0];
}

/** The 2D transform a 3D (or skew) transform function shows, seen straight on; undefined if `name` (lower case) isn't one. `args`: its arguments as written. */
export function flatTransformFunction (name: string, args: string[]): IgeCssMatrix | undefined {
	const num = (a: string | undefined, fallback: number) => {
		const n = Number((a ?? "").trim());
		return Number.isFinite(n) && (a ?? "").trim() !== "" ? n : fallback;
	};
	switch (name) {
		case "rotatex": return flat(rotation3d(1, 0, 0, degrees(args[0])));
		case "rotatey": return flat(rotation3d(0, 1, 0, degrees(args[0])));
		case "rotate3d": return flat(rotation3d(num(args[0], 0), num(args[1], 0), num(args[2], 1), degrees(args[3])));
		// (Depth and the eye's distance: nothing, seen straight on)
		case "translatez": case "perspective": case "scalez": return [1, 0, 0, 1, 0, 0];
		case "scale3d": {
			const parts = args.flatMap((a) => a.trim().split(/\s+/));
			return [num(parts[0], 1), 0, 0, num(parts[1], 1), 0, 0];
		}
		case "matrix3d": {
			const k = args.flatMap((a) => a.trim().split(/\s+/)).map(Number);
			if (k.length !== 16 || !k.every(Number.isFinite)) return undefined;
			// (Column by column: x and y of the x and y axes, and of the move)
			return [k[0], k[1], k[4], k[5], k[12], k[13]];
		}
		case "skew": return [1, Math.tan(rad(degrees(args[1]))), Math.tan(rad(degrees(args[0]))), 1, 0, 0];
		case "skewx": return [1, 0, Math.tan(rad(degrees(args[0]))), 1, 0, 0];
		case "skewy": return [1, Math.tan(rad(degrees(args[0]))), 0, 1, 0, 0];
		default: return undefined;
	}
}
