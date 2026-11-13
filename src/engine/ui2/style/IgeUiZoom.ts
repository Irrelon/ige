/**
 * CSS `zoom` for the engine's UI, as Chrome has it since zoom was standardised: an element's effective zoom is its
 * own times its parent's, and every length its style gives (px and the other absolute units, rem and the viewport
 * units: not em, %, or the container query units, which already go by zoomed sizes) is multiplied by it. Layout and
 * painting then work in zoomed pixels; getComputedStyle, offsetWidth and the like give them back unzoomed (divided by
 * the element's effective zoom), getBoundingClientRect as drawn.
 */
import type { IgeUiComputedStyle } from "@/engine/ui2/style/IgeUiStyleEngine";

/** The computed style's key for an element's effective zoom (absent: 1). Not a CSS property: getComputedStyle leaves it out. */
export const ZOOM_KEY = "-ige-zoom";

/** An element's effective zoom, from its computed style. */
export function effectiveZoom (cs: IgeUiComputedStyle | undefined): number {
	const z = cs?.[ZOOM_KEY];
	return z ? Number(z) || 1 : 1;
}

/** A `zoom` value as a factor: a number, a percentage, or 1 (normal, reset, anything else). */
export function zoomOf (value: string | undefined): number {
	if (!value) return 1;
	const v = value.trim().toLowerCase();
	const m = /^(\d*\.?\d+)(%?)$/.exec(v);
	if (!m) return 1;
	const n = parseFloat(m[1]) / (m[2] ? 100 : 1);
	return n > 0 && Number.isFinite(n) ? n : 1;
}

/** Absolute lengths (and rem and the viewport units) in a value: not inside url() or quotes. */
const LENGTH = /(^|[^\w.#-])(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(px|pt|pc|in|cm|mm|rem|vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|vi|vb)(?![\w-])/gi;
const QUOTED = /url\([^)]*\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/gi;

/** Whether a value has a length zoom changes. */
export function hasZoomedLength (value: string): boolean {
	LENGTH.lastIndex = 0;
	return LENGTH.test(value.replace(QUOTED, ""));
}

/** A value with every length zoom changes multiplied by `f`. */
export function zoomLengths (value: string, f: number): string {
	if (f === 1) return value;
	const scale = (s: string) => s.replace(LENGTH, (_m, pre: string, n: string, unit: string) => `${pre}${+(parseFloat(n) * f).toFixed(6)}${unit}`);
	// (Outside url() and quoted strings: a file name or some content's text keeps its digits)
	let out = "", at = 0;
	QUOTED.lastIndex = 0;
	for (let m = QUOTED.exec(value); m; m = QUOTED.exec(value)) {
		out += scale(value.slice(at, m.index)) + m[0];
		at = m.index + m[0].length;
	}
	return out + scale(value.slice(at));
}

/** Whether a property's lengths are zoomed (not custom properties, nor zoom itself). */
export function zoomsProperty (name: string): boolean {
	return !name.startsWith("--") && name !== "zoom" && name !== ZOOM_KEY;
}

/** A computed style with its lengths divided by its effective zoom (what getComputedStyle reports). */
export function unzoomedStyle (cs: IgeUiComputedStyle): IgeUiComputedStyle {
	const z = effectiveZoom(cs);
	if (z === 1) return cs;
	const out: IgeUiComputedStyle = {};
	for (const k in cs) out[k] = zoomsProperty(k) && cs[k] ? zoomLengths(cs[k], 1 / z) : cs[k];
	delete out[ZOOM_KEY];
	return out;
}
