/**
 * `filter: drop-shadow()` for the engine's UI, drawn as a browser draws it:
 * the element and everything in it rendered alone into a texture (its
 * silhouette: boxes, text, images and SVG shapes alike), that blurred by a
 * Gaussian of half the blur radius, tinted with the shadow's colour, and
 * drawn under it, moved by the shadow's offset. Several drop-shadows are
 * each drawn from the element's silhouette (the last listed lowest).
 *
 * The painter marks an element's run of items with a group (open, then
 * closed: IgeUiPaintGroup); IgeUiGlRenderer gives each shadow a composite
 * instance before the run and asks this to make its texture as it's drawn.
 */
import { type IgeCssColor, type IgeCssLengthContext, parseShadows } from "@/engine/ui2/css/IgeCssValues";

export interface IgeUiDropShadow {
	x: number;
	y: number;
	blur: number;
	color: IgeCssColor;
}

/** A filter's drop-shadow()s (none: an empty list; other filter functions are left out). */
export function parseDropShadows (filter: string, ctx: IgeCssLengthContext, current: IgeCssColor): IgeUiDropShadow[] {
	const out: IgeUiDropShadow[] = [];
	if (!filter || filter === "none" || !filter.includes("drop-shadow(")) return out;
	for (let at = filter.indexOf("drop-shadow("); at >= 0; at = filter.indexOf("drop-shadow(", at + 1)) {
		let depth = 0, end = -1;
		for (let i = at + 11; i < filter.length; i++) {
			if (filter[i] === "(") depth++;
			else if (filter[i] === ")" && --depth === 0) {
				end = i;
				break;
			}
		}
		if (end < 0) break;
		const inner = filter.slice(at + 12, end).trim();
		// (Its colour, or the text's when it gives none)
		const sh = parseShadows(inner, ctx, current)[0];
		if (sh && sh.color.a > 0) out.push({ x: sh.x, y: sh.y, blur: Math.max(0, sh.blur), color: sh.color });
	}
	return out;
}

/** A drop-shadow filter's part of one frame (IgeUiGlRenderer.draw). */
export interface IgeUiShadowGroup {
	shadows: IgeUiDropShadow[];
	/** The frame's batches and instances it's of: [from, to), [start, end). */
	from: number;
	to: number;
	start: number;
	end: number;
	/** The clip it's drawn in (screen px). */
	clip: number[];
	/** Its silhouette's rectangle on the target (device px, top-down), with room for the widest blur; none: nothing in it. */
	region?: { x: number; y: number; w: number; h: number };
	/** Its silhouette's been rendered this frame. */
	drawn?: boolean;
	/** Each shadow's composite instance (its offset in the frame's instance data) and which shadow it is. */
	composites: { o: number; index: number }[];
}

/** How much smaller a shadow's blurred at (the wider the blur, the coarser it can be: 1, 2, 4 or 8). */
export function shadowStep (sigma: number): number {
	return sigma >= 16 ? 8 : sigma >= 8 ? 4 : sigma >= 3 ? 2 : 1;
}

type Tex = { tex: WebGLTexture; w: number; h: number };

/** What the drop shadows need of the renderer: its programs, buffers and texture maker. */
export interface IgeUiShadowHost {
	gl: WebGL2RenderingContext;
	_program: WebGLProgram | null;
	_vao: WebGLVertexArrayObject | null;
	_uniforms: Record<string, WebGLUniformLocation | null>;
	_blurProgram: WebGLProgram | null;
	_blurUniforms: Record<string, WebGLUniformLocation | null>;
	_blurFbo: WebGLFramebuffer | null;
	_tex (have: Tex | null, w: number, h: number, mips?: boolean): Tex;
}

/** The textures and framebuffer the drop shadows are made in (one set, used one shadow at a time). */
export class IgeUiDropShadowPass {
	silhouette: Tex | null = null;
	a: Tex | null = null;
	b: Tex | null = null;
	fbo: WebGLFramebuffer | null = null;

	/** Forgotten (a lost context): made again as they're next needed. */
	reset (): void {
		this.silhouette = this.a = this.b = null;
		this.fbo = null;
	}

	/** The textures grown for a region and its blur (before the frame's instances are uploaded: their uv depend on it). */
	size (host: IgeUiShadowHost, region: { w: number; h: number }, sigma: number): [number, number] {
		const k = shadowStep(sigma);
		const hw = Math.max(1, Math.ceil(region.w / k)), hh = Math.max(1, Math.ceil(region.h / k));
		this.silhouette = host._tex(this.silhouette, region.w, region.h, true);
		this.a = host._tex(this.a, hw, hh);
		this.b = host._tex(this.b, hw, hh);
		return [hw, hh];
	}

	/**
	 * Renders a group's silhouette: its batches drawn alone into the silhouette texture, its region's corner at 0,0.
	 * `drawBatch` draws one of the frame's batches with the program as it's set up. Leaves `target` bound, the
	 * program's uniforms and viewport as the frame has them.
	 */
	renderSilhouette (host: IgeUiShadowHost, g: IgeUiShadowGroup, drawBatch: (i: number) => void, frame: { width: number; height: number; offset: [number, number]; target: WebGLFramebuffer | null }): void {
		const gl = host.gl, r = g.region!;
		this.fbo ??= gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.silhouette!.tex, 0);
		gl.viewport(0, 0, r.w, r.h);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(host._program);
		gl.bindVertexArray(host._vao);
		gl.uniform2f(host._uniforms.u_resolution, r.w, r.h);
		gl.uniform2f(host._uniforms.u_offset, frame.offset[0] - r.x, frame.offset[1] - r.y);
		gl.enable(gl.BLEND);
		for (let i = g.from; i < g.to; i++) drawBatch(i);
		gl.uniform2f(host._uniforms.u_resolution, frame.width, frame.height);
		gl.uniform2f(host._uniforms.u_offset, frame.offset[0], frame.offset[1]);
		gl.bindFramebuffer(gl.FRAMEBUFFER, frame.target);
		gl.viewport(0, 0, frame.width, frame.height);
		g.drawn = true;
	}

	/** One shadow's blur of the silhouette (σ device px): the texture to draw it from, its region at 0,0. */
	blur (host: IgeUiShadowHost, g: IgeUiShadowGroup, sigma: number, frame: { target: WebGLFramebuffer | null; width: number; height: number }): WebGLTexture {
		const gl = host.gl, r = g.region!;
		const k = shadowStep(sigma);
		const hw = Math.max(1, Math.ceil(r.w / k)), hh = Math.max(1, Math.ceil(r.h / k));
		const src = this.silhouette!, a = this.a!, b = this.b!;
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, src.tex);
		if (k > 1) gl.generateMipmap(gl.TEXTURE_2D);
		gl.useProgram(host._blurProgram);
		gl.bindVertexArray(host._vao);
		gl.disable(gl.BLEND);
		gl.uniform1i(host._blurUniforms.u_src, 3);
		const pass = (from: Tex, to: Tex, area: [number, number], dir: [number, number], step: number, s: number, lod: number) => {
			gl.bindFramebuffer(gl.FRAMEBUFFER, host._blurFbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, to.tex, 0);
			gl.viewport(0, 0, hw, hh);
			gl.bindTexture(gl.TEXTURE_2D, from.tex);
			gl.uniform4f(host._blurUniforms.u_area, 0, 0, area[0] / from.w, area[1] / from.h);
			gl.uniform2f(host._blurUniforms.u_step, (dir[0] * step) / from.w, (dir[1] * step) / from.h);
			gl.uniform1f(host._blurUniforms.u_sigma, s);
			gl.uniform1f(host._blurUniforms.u_lod, lod);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		};
		// (No blur: a copy, the passes' kernel a single tap)
		const s = Math.max(sigma, 0.001) / k;
		pass(src, a, [r.w, r.h], [1, 0], k, s, Math.log2(k));
		pass(a, b, [hw, hh], [0, 1], 1, s, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, frame.target);
		gl.viewport(0, 0, frame.width, frame.height);
		gl.useProgram(host._program);
		gl.bindVertexArray(host._vao);
		gl.enable(gl.BLEND);
		gl.activeTexture(gl.TEXTURE2);
		return b.tex;
	}
}
