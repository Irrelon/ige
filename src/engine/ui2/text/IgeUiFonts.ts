/**
 * Fonts for the engine's UI: measuring text for layout, and the font's
 * vertical metrics (ascent, descent) for line boxes. In the browser it's
 * measured with a 2D canvas (the page's own web fonts, once loaded: kerning
 * comes with the run's measured width); headless (tests, the server) a
 * fixed-width stand-in keeps layout deterministic.
 */

export interface IgeUiFontSpec {
	family: string;
	/** px. */
	size: number;
	weight: number;
	style: "normal" | "italic";
}

export interface IgeUiFontMetrics {
	/** px above the baseline and below it, for the font at its size (the line box's content area). */
	ascent: number;
	descent: number;
	/** The x-height, for vertical-align: middle. */
	xHeight: number;
	/** The cap height. */
	capHeight: number;
}

export interface IgeUiFontProvider {
	/** A run's advance width in px (no letter-spacing). */
	measure (text: string, font: IgeUiFontSpec): number;
	/** The font's vertical metrics at its size; `grid` (device px per px): ascent and descent rounded to it, as a browser does. */
	metrics (font: IgeUiFontSpec, grid?: number): IgeUiFontMetrics;
}

/** The CSS font shorthand for canvas ("italic 600 13px 'Exo 2', sans-serif"). */
export function cssFont (f: IgeUiFontSpec): string {
	return `${f.style === "italic" ? "italic " : ""}${f.weight} ${f.size}px ${f.family}`;
}

/** Parses a computed font-weight ("bold", "600"). */
export function fontWeight (v: string | undefined): number {
	if (!v) return 400;
	if (v === "bold" || v === "bolder") return 700;
	if (v === "normal") return 400;
	if (v === "lighter") return 300;
	const n = parseInt(v, 10);
	return Number.isFinite(n) ? n : 400;
}

/** A provider measuring with a canvas: the page's fonts, cached by font and text. */
export class IgeUiCanvasFonts implements IgeUiFontProvider {
	_ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
	_cache = new Map<string, Map<string, number>>();
	_metrics = new Map<string, IgeUiFontMetrics>();

	constructor () {
		const canvas = typeof document !== "undefined" ? document.createElement("canvas") : typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(8, 8) : null;
		this._ctx = (canvas?.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null) ?? null;
	}

	/** Forgets measurements (fonts finished loading). */
	reset (): void {
		this._cache.clear();
		this._metrics.clear();
		this._gaps.clear();
	}

	measure (text: string, font: IgeUiFontSpec): number {
		const key = cssFont(font);
		let map = this._cache.get(key);
		if (!map) {
			map = new Map();
			this._cache.set(key, map);
		}
		let w = map.get(text);
		if (w === undefined) {
			const c = this._ctx;
			if (!c) return text.length * font.size * 0.55;
			c.font = key;
			(c as CanvasRenderingContext2D).fontKerning = "normal";
			w = c.measureText(text).width;
			if (map.size > 4000) map.clear();
			map.set(text, w);
		}
		return w;
	}

	metrics (font: IgeUiFontSpec, grid?: number): IgeUiFontMetrics {
		const m = this._ratios(font);
		const gap = this._gap(font);
		let ascent = m.ascent * font.size, descent = m.descent * font.size, below = gap * font.size;
		// On the device's pixels, as a browser rounds them (the ratios are measured large enough to round the same);
		// the font's line gap goes under the descent
		if (grid) {
			ascent = Math.round(ascent * grid) / grid;
			descent = Math.round(descent * grid) / grid;
			below = Math.round(below * grid) / grid;
		}
		return { ascent, descent: descent + below, xHeight: m.xHeight * font.size, capHeight: m.capHeight * font.size };
	}

	_gaps = new Map<string, number>();

	/**
	 * The font's line gap per px (a line's normal height less its ascent and descent: Arial has one, the UI's
	 * fonts none), from the page's own layout of it, once per face (at a large size, so it's exact enough).
	 */
	_gap (font: IgeUiFontSpec): number {
		const key = cssFont({ ...font, size: 1 });
		let g = this._gaps.get(key);
		if (g !== undefined) return g;
		g = 0;
		if (typeof document !== "undefined" && document.body) {
			const at = 1000;
			const el = document.createElement("div");
			el.style.cssText = "position:absolute;left:-100000px;top:0;visibility:hidden;white-space:nowrap;line-height:normal;margin:0;padding:0;border:0";
			el.style.font = cssFont({ ...font, size: at });
			el.textContent = "x";
			document.body.appendChild(el);
			const h = el.getBoundingClientRect().height;
			el.remove();
			const r = this._ratios(font);
			if (h > 0) g = Math.max(0, Math.round(h - (r.ascent + r.descent) * at) / at);
		}
		this._gaps.set(key, g);
		return g;
	}

	/** The font's metrics per px of size, from the canvas. */
	_ratios (font: IgeUiFontSpec): IgeUiFontMetrics {
		// (Measured very large: the canvas rounds its font box to whole pixels, and a browser rounds the line's ascent and
		// descent at the size used, so the ratio must be good to a few parts in a hundred thousand)
		const at = 10000;
		const key = cssFont({ ...font, size: at });
		let m = this._metrics.get(key);
		if (!m) {
			const c = this._ctx;
			if (c) {
				c.font = key;
				const t = c.measureText("Hxg");
				const x = c.measureText("x");
				const H = c.measureText("H");
				m = {
					ascent: (t.fontBoundingBoxAscent ?? t.actualBoundingBoxAscent) / at,
					descent: (t.fontBoundingBoxDescent ?? t.actualBoundingBoxDescent) / at,
					xHeight: x.actualBoundingBoxAscent / at,
					capHeight: H.actualBoundingBoxAscent / at
				};
			} else m = { ascent: 0.9, descent: 0.25, xHeight: 0.5, capHeight: 0.7 };
			this._metrics.set(key, m);
		}
		return m;
	}
}

/** A headless provider: every character the same width (0.5em, 0.6em for monospace), fixed metrics. */
export class IgeUiFixedFonts implements IgeUiFontProvider {
	measure (text: string, font: IgeUiFontSpec): number {
		const k = /mono/i.test(font.family) ? 0.6 : 0.5;
		return [...text].length * font.size * k * (font.weight >= 600 ? 1.05 : 1);
	}

	metrics (font: IgeUiFontSpec): IgeUiFontMetrics {
		return { ascent: font.size * 0.9, descent: font.size * 0.25, xHeight: font.size * 0.5, capHeight: font.size * 0.7 };
	}
}
