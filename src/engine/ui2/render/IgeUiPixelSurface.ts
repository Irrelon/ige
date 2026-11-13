/**
 * A surface of pixels in memory: RGBA, a byte a channel, not premultiplied
 * (as ImageData has them), with the part of a 2D context that works on
 * pixels (createImageData, getImageData, putImageData, clearRect, and a
 * fillRect in a colour). The renderer uploads it as a texture (`pixels()`,
 * again only when it's changed). It's what a host without a browser canvas
 * gives for what a screen draws a pixel at a time (the combat HUD's static,
 * the mirror's figure buffer), and what the engine's own 2D canvas
 * (IgeUiCanvas2d) puts putImageData's pixels in.
 */
import { parseColor } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiSurface } from "@/engine/ui2/IgeUiHost";

/** ImageData's shape (a plain object where there's no ImageData). */
export interface IgeUiImageData {
	width: number;
	height: number;
	data: Uint8ClampedArray;
	colorSpace?: string;
}

/** A pixel surface's 2D context: what works on pixels. */
export class IgeUiPixelContext {
	fillStyle = "#000";
	globalAlpha = 1;

	constructor (readonly canvas: IgeUiPixelSurface) {}

	createImageData (w: number | IgeUiImageData, h?: number): IgeUiImageData {
		const width = typeof w === "number" ? Math.max(1, Math.round(Math.abs(w))) : w.width;
		const height = typeof w === "number" ? Math.max(1, Math.round(Math.abs(h ?? 1))) : w.height;
		return { width, height, data: new Uint8ClampedArray(width * height * 4), colorSpace: "srgb" };
	}

	getImageData (x: number, y: number, w: number, h: number): IgeUiImageData {
		const out = this.createImageData(w, h);
		const s = this.canvas;
		for (let j = 0; j < out.height; j++) {
			const sy = Math.round(y) + j;
			if (sy < 0 || sy >= s.height) continue;
			for (let i = 0; i < out.width; i++) {
				const sx = Math.round(x) + i;
				if (sx < 0 || sx >= s.width) continue;
				const a = (sy * s.width + sx) * 4, b = (j * out.width + i) * 4;
				out.data[b] = s.data[a];
				out.data[b + 1] = s.data[a + 1];
				out.data[b + 2] = s.data[a + 2];
				out.data[b + 3] = s.data[a + 3];
			}
		}
		return out;
	}

	/** The pixels written as they are (no blending), the dirty rectangle only when it's given. */
	putImageData (img: IgeUiImageData, dx: number, dy: number, dirtyX = 0, dirtyY = 0, dirtyW = img.width, dirtyH = img.height): void {
		const s = this.canvas;
		const x0 = Math.max(0, Math.round(dirtyX)), y0 = Math.max(0, Math.round(dirtyY));
		const x1 = Math.min(img.width, Math.round(dirtyX + dirtyW)), y1 = Math.min(img.height, Math.round(dirtyY + dirtyH));
		for (let j = y0; j < y1; j++) {
			const ty = Math.round(dy) + j;
			if (ty < 0 || ty >= s.height) continue;
			for (let i = x0; i < x1; i++) {
				const tx = Math.round(dx) + i;
				if (tx < 0 || tx >= s.width) continue;
				const a = (j * img.width + i) * 4, b = (ty * s.width + tx) * 4;
				s.data[b] = img.data[a];
				s.data[b + 1] = img.data[a + 1];
				s.data[b + 2] = img.data[a + 2];
				s.data[b + 3] = img.data[a + 3];
			}
		}
		s.version++;
	}

	clearRect (x: number, y: number, w: number, h: number): void {
		this._each(x, y, w, h, (b) => {
			const d = this.canvas.data;
			d[b] = d[b + 1] = d[b + 2] = d[b + 3] = 0;
		});
	}

	/** A rectangle in the fill colour, over what's there (source-over, unpremultiplied as the pixels are kept). */
	fillRect (x: number, y: number, w: number, h: number): void {
		const c = parseColor(this.fillStyle);
		if (!c) return;
		const a = c.a * this.globalAlpha;
		this._each(x, y, w, h, (b) => {
			const d = this.canvas.data;
			const da = d[b + 3] / 255, oa = a + da * (1 - a);
			if (oa <= 0) return;
			d[b] = (c.r * a + d[b] * da * (1 - a)) / oa;
			d[b + 1] = (c.g * a + d[b + 1] * da * (1 - a)) / oa;
			d[b + 2] = (c.b * a + d[b + 2] * da * (1 - a)) / oa;
			d[b + 3] = oa * 255;
		});
	}

	_each (x: number, y: number, w: number, h: number, fn: (b: number) => void): void {
		const s = this.canvas;
		const x0 = Math.max(0, Math.round(Math.min(x, x + w))), x1 = Math.min(s.width, Math.round(Math.max(x, x + w)));
		const y0 = Math.max(0, Math.round(Math.min(y, y + h))), y1 = Math.min(s.height, Math.round(Math.max(y, y + h)));
		for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) fn((j * s.width + i) * 4);
		if (x1 > x0 && y1 > y0) s.version++;
	}
}

/** Pixels in memory as a surface (IgeUiHost's IgeUiSurface), uploaded by the renderer from `pixels()`. */
export class IgeUiPixelSurface implements IgeUiSurface {
	_w: number;
	_h: number;
	data: Uint8ClampedArray;
	/** Changed since it was last uploaded when this moves on. */
	version = 0;
	_ctx = new IgeUiPixelContext(this);

	constructor (w: number, h: number) {
		this._w = Math.max(0, Math.round(w));
		this._h = Math.max(0, Math.round(h));
		this.data = new Uint8ClampedArray(this._w * this._h * 4);
	}

	get width (): number { return this._w; }
	set width (v: number) { this._resize(v, this._h); }
	get height (): number { return this._h; }
	set height (v: number) { this._resize(this._w, v); }

	/** A new size clears it, as a canvas's does. */
	_resize (w: number, h: number): void {
		this._w = Math.max(0, Math.round(w));
		this._h = Math.max(0, Math.round(h));
		this.data = new Uint8ClampedArray(this._w * this._h * 4);
		this.version++;
	}

	getContext (kind: string): IgeUiPixelContext | null {
		return kind === "2d" ? this._ctx : null;
	}

	/** What the renderer uploads: the pixels (not premultiplied), and their version. */
	pixels (): { width: number; height: number; data: Uint8Array; version: number } {
		return { width: this._w, height: this._h, data: new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength), version: this.version };
	}
}
