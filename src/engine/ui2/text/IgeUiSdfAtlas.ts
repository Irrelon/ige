/**
 * Signed-distance glyph atlases for the engine's UI text, made at run time
 * from the page's own fonts (whatever the stylesheet names, once loaded):
 * each glyph drawn large on a 2D canvas, its distance field found with a
 * Euclidean distance transform (Felzenszwalb and Huttenlocher, as Mapbox's
 * TinySDF does), packed onto 1024 x 1024 single-channel pages. One field
 * serves every size and UI scale, and glows (text-shadow) come from the same
 * distances.
 *
 * Advances and kerning come from the canvas's own measurements (the browser
 * applies the font's GPOS kerning), so glyphs land where layout measured
 * them.
 */
import type { IgeUiHostSurface, IgeUiSurface } from "@/engine/ui2/IgeUiHost";
import { cssFont, type IgeUiFontSpec } from "@/engine/ui2/text/IgeUiFonts";

/** The size glyphs are drawn at, the field's padding and how far it reaches (px at that size). */
export const SDF_SIZE = 48;
export const SDF_BUFFER = 12;
export const SDF_RADIUS = 12;
/** The field's value at a glyph's edge (0 to 1). */
export const SDF_EDGE = 0.75;
export const PAGE = 1024;

export interface IgeUiGlyph {
	page: number;
	/** In the page, px. */
	x: number;
	y: number;
	w: number;
	h: number;
	/** The bitmap's top-left from the pen at the baseline, at SDF_SIZE. */
	left: number;
	top: number;
	advance: number;
}

const INF = 1e20;

/** 1D squared distance transform (Felzenszwalb and Huttenlocher). */
function edt1d (grid: Float64Array, offset: number, stride: number, length: number, f: Float64Array, v: Uint16Array, z: Float64Array): void {
	v[0] = 0;
	z[0] = -INF;
	z[1] = INF;
	for (let q = 0; q < length; q++) f[q] = grid[offset + q * stride];
	for (let q = 1, k = 0, s = 0; q < length; q++) {
		do {
			const r = v[k];
			s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2;
		} while (s <= z[k] && --k > -1);
		k++;
		v[k] = q;
		z[k] = s;
		z[k + 1] = INF;
	}
	for (let q = 0, k = 0; q < length; q++) {
		while (z[k + 1] < q) k++;
		const r = v[k];
		grid[offset + q * stride] = f[r] + (q - r) * (q - r);
	}
}

function edt (data: Float64Array, w: number, h: number, f: Float64Array, v: Uint16Array, z: Float64Array): void {
	for (let x = 0; x < w; x++) edt1d(data, x, w, h, f, v, z);
	for (let y = 0; y < h; y++) edt1d(data, y * w, 1, w, f, v, z);
}

export class IgeUiSdfAtlas {
	pages: Uint8Array[] = [];
	/** Bumped as glyphs are added (pages to upload again), by page. */
	pageVersion: number[] = [];
	_glyphs = new Map<string, IgeUiGlyph | null>();
	_kern = new Map<string, number>();
	_shelfX = 0;
	_shelfY = 0;
	_shelfH = 0;
	_canvas: IgeUiSurface | null = null;
	_ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
	_measure: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

	/** `surface`: where glyphs are drawn to be measured and turned into distance fields (the host's 2D surfaces). */
	constructor (surface?: IgeUiHostSurface) {
		const make = (w: number, h: number) => surface?.create(w, h) ?? null;
		this._canvas = make(SDF_SIZE * 3 + SDF_BUFFER * 2, SDF_SIZE * 2 + SDF_BUFFER * 2);
		this._ctx = (this._canvas?.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null) ?? null;
		this._measure = (make(8, 8)?.getContext("2d") as CanvasRenderingContext2D | null) ?? null;
		this._newPage();
	}

	/** Forgets every glyph (the fonts finished loading: they're drawn again). */
	reset (): void {
		this._glyphs.clear();
		this._kern.clear();
		this.pages = [];
		this.pageVersion = [];
		this._shelfX = this._shelfY = this._shelfH = 0;
		this._newPage();
	}

	_newPage (): void {
		this.pages.push(new Uint8Array(PAGE * PAGE));
		this.pageVersion.push(1);
		this._shelfX = 0;
		this._shelfY = 0;
		this._shelfH = 0;
	}

	_faceKey (f: IgeUiFontSpec): string {
		return `${f.style}|${f.weight}|${f.family}`;
	}

	/** A character's glyph in a face (made the first time it's asked for). Null for one with no shape (a space). */
	glyph (ch: string, font: IgeUiFontSpec): IgeUiGlyph | null {
		const key = `${this._faceKey(font)}|${ch}`;
		const have = this._glyphs.get(key);
		if (have !== undefined) return have;
		const g = this._make(ch, font);
		this._glyphs.set(key, g);
		return g;
	}

	/** A character's advance at SDF_SIZE. */
	advance (ch: string, font: IgeUiFontSpec): number {
		const c = this._measure;
		if (!c) return SDF_SIZE * 0.5;
		c.font = cssFont({ ...font, size: SDF_SIZE });
		return c.measureText(ch).width;
	}

	/** Kerning between two characters at SDF_SIZE (the pair's width less theirs). */
	kerning (a: string, b: string, font: IgeUiFontSpec): number {
		if (a === " " || b === " ") return 0;
		const key = `${this._faceKey(font)}|${a}${b}`;
		let k = this._kern.get(key);
		if (k === undefined) {
			const c = this._measure;
			if (!c) return 0;
			c.font = cssFont({ ...font, size: SDF_SIZE });
			(c as CanvasRenderingContext2D).fontKerning = "normal";
			k = c.measureText(a + b).width - c.measureText(a).width - c.measureText(b).width;
			if (Math.abs(k) < 0.01) k = 0;
			if (this._kern.size > 20000) this._kern.clear();
			this._kern.set(key, k);
		}
		return k;
	}

	_make (ch: string, font: IgeUiFontSpec): IgeUiGlyph | null {
		const c = this._ctx;
		const canvas = this._canvas;
		if (!c || !canvas) return null;
		c.font = cssFont({ ...font, size: SDF_SIZE });
		c.textBaseline = "alphabetic";
		c.textAlign = "left";
		const m = c.measureText(ch);
		const advance = m.width;
		const left = Math.ceil(m.actualBoundingBoxLeft ?? 0), right = Math.ceil(m.actualBoundingBoxRight ?? advance);
		const ascent = Math.ceil(m.actualBoundingBoxAscent ?? SDF_SIZE * 0.8), descent = Math.ceil(m.actualBoundingBoxDescent ?? SDF_SIZE * 0.2);
		const gw = left + right, gh = ascent + descent;
		if (gw <= 0 || gh <= 0 || /^\s$/.test(ch)) return null;
		const w = gw + SDF_BUFFER * 2, h = gh + SDF_BUFFER * 2;
		if (canvas.width < w || canvas.height < h) {
			canvas.width = Math.max(canvas.width, w);
			canvas.height = Math.max(canvas.height, h);
			c.font = cssFont({ ...font, size: SDF_SIZE });
			c.textBaseline = "alphabetic";
		}
		c.clearRect(0, 0, w, h);
		c.fillStyle = "#000";
		c.fillText(ch, SDF_BUFFER + left, SDF_BUFFER + ascent);
		const img = c.getImageData(0, 0, w, h).data;
		// Distances outside and inside the shape (anti-aliased edges kept, as TinySDF does)
		const size = w * h;
		const outer = new Float64Array(size), inner = new Float64Array(size);
		for (let i = 0; i < size; i++) {
			const a = img[i * 4 + 3] / 255;
			if (a === 1) {
				outer[i] = 0;
				inner[i] = INF;
			} else if (a === 0) {
				outer[i] = INF;
				inner[i] = 0;
			} else {
				const d = 0.5 - a;
				outer[i] = d > 0 ? d * d : 0;
				inner[i] = d < 0 ? d * d : 0;
			}
		}
		const n = Math.max(w, h);
		const f = new Float64Array(n), v = new Uint16Array(n), z = new Float64Array(n + 1);
		edt(outer, w, h, f, v, z);
		edt(inner, w, h, f, v, z);
		// Pack it
		if (this._shelfX + w > PAGE) {
			this._shelfY += this._shelfH + 1;
			this._shelfX = 0;
			this._shelfH = 0;
		}
		if (this._shelfY + h > PAGE) this._newPage();
		const page = this.pages.length - 1;
		const px = this._shelfX, py = this._shelfY;
		this._shelfX += w + 1;
		this._shelfH = Math.max(this._shelfH, h);
		const out = this.pages[page];
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const i = y * w + x;
				const d = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
				// (TinySDF's mapping: the edge at SDF_EDGE)
				out[(py + y) * PAGE + px + x] = Math.max(0, Math.min(255, Math.round(255 - 255 * (d / SDF_RADIUS + (1 - SDF_EDGE)))));
			}
		}
		this.pageVersion[page]++;
		return { page, x: px, y: py, w, h, left: -left - SDF_BUFFER, top: -ascent - SDF_BUFFER, advance };
	}
}
