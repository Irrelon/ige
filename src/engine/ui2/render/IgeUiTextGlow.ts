/**
 * text-shadow with a blur, drawn as a browser draws it: the text's own
 * silhouette blurred by a Gaussian of half the blur radius, tinted with the
 * shadow's colour and drawn under the text, moved by its offset. Several
 * shadows stack as they do in Chrome (a 6px, an 18px and a 34px glow round a
 * slot machine's sign), each over the one listed after it, and a wide glow
 * round a word is the soft cloud it is there (it blurs every letter near it
 * together, which a glow worked out from each glyph's own edge can't).
 *
 * The blurred silhouettes are cached by what they depend on (the text, its
 * font and spacing, the blur, the device scale, the text's turn and scale,
 * and where it falls within a device pixel, to a quarter), not where they
 * are: a glowing label is blurred once and moved after. Entries not drawn
 * for a while are let go.
 *
 * IgeUiGlRenderer writes each glow as the text's glyphs in a batch kept off
 * the screen (the silhouette) and a composite instance (kind 8: tinted
 * alpha) whose texture is made here as it's first drawn.
 */
import type { IgeUiPaintText } from "@/engine/ui2/render/IgeUiPaint";
import type { IgeUiFilterHost, IgeUiFilterPass, IgeUiLayerTex } from "@/engine/ui2/render/IgeUiFilters";

/** A glow in one frame. */
export interface IgeUiTextGlow {
	/** What its blurred silhouette depends on. */
	key: string;
	/** The deviation (device px). */
	sigma: number;
	/** The silhouette's rectangle on the target (device px, top-down), with room for the blur; none: nothing to draw. */
	region?: { x: number; y: number; w: number; h: number };
	/** The batch holding its glyphs (drawn only into its silhouette). */
	silhouette: number;
}

interface Entry {
	tex: IgeUiLayerTex;
	used: number;
}

/** The silhouette rectangle of instances [start, end) (rect at 0, transform at 32, projective row at 44), padded for a blur of `sigma`. */
export function glowRegion (data: Float32Array, stride: number, start: number, end: number, sigma: number, scale: number, offset: [number, number]): { region?: IgeUiTextGlow["region"]; frac: [number, number] } {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (let o = start * stride; o < end * stride; o += stride) {
		const rx = data[o], ry = data[o + 1], rw = data[o + 2], rh = data[o + 3];
		for (const [px, py] of [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]]) {
			const w = data[o + 44] * px + data[o + 45] * py + data[o + 46];
			if (w <= 1e-6) continue;
			const sx = ((data[o + 32] * px + data[o + 34] * py + data[o + 36]) / w) * scale + offset[0];
			const sy = ((data[o + 33] * px + data[o + 35] * py + data[o + 37]) / w) * scale + offset[1];
			x0 = Math.min(x0, sx);
			y0 = Math.min(y0, sy);
			x1 = Math.max(x1, sx);
			y1 = Math.max(y1, sy);
		}
	}
	if (!Number.isFinite(x0)) return { frac: [0, 0] };
	const pad = Math.ceil(sigma * 3) + 2;
	const rx0 = Math.floor(x0) - pad, ry0 = Math.floor(y0) - pad;
	const rx1 = Math.ceil(x1) + pad, ry1 = Math.ceil(y1) + pad;
	return { region: { x: rx0, y: ry0, w: rx1 - rx0, h: ry1 - ry0 }, frac: [Math.round((x0 - Math.floor(x0)) * 4) / 4, Math.round((y0 - Math.floor(y0)) * 4) / 4] };
}

/** What a glow's blurred silhouette depends on (not where it is). */
export function glowKey (it: IgeUiPaintText, sigma: number, scale: number, frac: [number, number], size: [number, number]): string {
	const f = it.font;
	const m = it.matrix ?? [1, 0, 0, 1, 0, 0];
	const r = (v: number) => Math.round(v * 1000) / 1000;
	return `${it.text}|${f.style} ${f.weight} ${f.size} ${f.family}|${r(it.letterSpacing)}|${r(sigma)}|${r(scale)}|${[m[0], m[1], m[2], m[3]].map(r).join(",")}|${(m as number[]).length > 6 ? "p" : ""}|${frac.join(",")}|${size.join("x")}`;
}

/** The glows' blurred silhouettes, kept between frames. */
export class IgeUiTextGlowCache {
	entries = new Map<string, Entry>();
	/** The silhouette being drawn and the blur's middle step (grown as needed). */
	sil: IgeUiLayerTex | null = null;
	tmp: IgeUiLayerTex | null = null;
	frame = 0;
	/** Glows let go after this many frames not drawn, and at most this many kept. */
	keepFrames = 240;
	keepMost = 160;

	/** Forgotten (a lost context): made again as they're next needed. */
	reset (): void {
		this.entries.clear();
		this.sil = this.tmp = null;
	}

	/** One frame done: glows not drawn for a while let go (and the oldest, past the most kept). */
	endFrame (gl: WebGL2RenderingContext): void {
		this.frame++;
		const drop = (k: string, e: Entry) => {
			gl.deleteTexture(e.tex.tex);
			gl.deleteFramebuffer(e.tex.fbo);
			this.entries.delete(k);
		};
		for (const [k, e] of this.entries) if (this.frame - e.used > this.keepFrames) drop(k, e);
		if (this.entries.size > this.keepMost) {
			const old = [...this.entries].sort((a, b) => a[1].used - b[1].used).slice(0, this.entries.size - this.keepMost);
			for (const [k, e] of old) drop(k, e);
		}
	}

	_layerTex (host: IgeUiFilterHost, have: IgeUiLayerTex | null, w: number, h: number): IgeUiLayerTex {
		const gl = host.gl;
		const t = host._tex(have, w, h, true);
		const out = have ?? { ...t, fbo: gl.createFramebuffer()! };
		out.w = t.w;
		out.h = t.h;
		gl.bindFramebuffer(gl.FRAMEBUFFER, out.fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, out.tex, 0);
		return out;
	}

	/**
	 * A glow's blurred silhouette: from the cache, or made now (`drawSilhouette` draws its glyphs, with the program set
	 * up for the silhouette texture, whose corner is the region's), blurred into a texture of its own the region's size.
	 * `restore` puts back what was being drawn. Returns its texture.
	 */
	texture (host: IgeUiFilterHost, filters: IgeUiFilterPass, g: IgeUiTextGlow, begin: (target: WebGLFramebuffer, w: number, h: number, corner: [number, number]) => void, drawSilhouette: () => void, restore: () => void): WebGLTexture | null {
		const have = this.entries.get(g.key);
		if (have) {
			have.used = this.frame;
			return have.tex.tex;
		}
		const r = g.region;
		if (!r) return null;
		const gl = host.gl;
		this.sil = this._layerTex(host, this.sil, r.w, r.h);
		this.tmp = this._layerTex(host, this.tmp, r.w, r.h);
		// (Exactly its region's size: drawn over it whole, uv 0 to 1)
		const t = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, r.w, r.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		const entry: IgeUiLayerTex = { tex: t, w: r.w, h: r.h, fbo: gl.createFramebuffer()! };
		gl.bindFramebuffer(gl.FRAMEBUFFER, entry.fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
		// The silhouette, then its blur
		begin(this.sil.fbo, r.w, r.h, [r.x, r.y]);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		drawSilhouette();
		filters.blurPass(host, this.sil, this.tmp, entry, r.w, r.h, g.sigma);
		restore();
		this.entries.set(g.key, { tex: entry, used: this.frame });
		return t;
	}
}
