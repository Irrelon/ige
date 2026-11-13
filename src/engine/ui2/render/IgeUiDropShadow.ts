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

/** The union pass: a texture's alpha (moved, faded) as black of that alpha (what the next shadow in a chain is cast from). */
const UNION_VS = `#version 300 es
layout(location=0) in vec2 a_corner;
out vec2 v_uv;
void main() {
	v_uv = a_corner;
	gl_Position = vec4(a_corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const UNION_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
/** The part of the texture the region fills, how far the copy's moved (0 to 1 of the region), and its alpha. */
uniform vec2 u_part;
uniform vec2 u_off;
uniform float u_alpha;
out vec4 outColor;
void main() {
	vec2 uv = v_uv - u_off;
	float a = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 0.0 : texture(u_src, uv * u_part).a;
	outColor = vec4(0.0, 0.0, 0.0, a * u_alpha);
}`;

/**
 * The textures and framebuffer the drop shadows are made in (one set, used one group at a time): the silhouette, each
 * shadow's blurred copy, and for a chain (drop-shadow() drop-shadow()) what each next one's cast from: the element
 * over the shadows before it, as CSS applies a filter list.
 */
export class IgeUiDropShadowPass {
	silhouette: Tex | null = null;
	tmp: Tex | null = null;
	outs: (Tex | null)[] = [];
	unions: [Tex | null, Tex | null] = [null, null];
	fbo: WebGLFramebuffer | null = null;
	union: WebGLProgram | null = null;
	unionUniforms: Record<string, WebGLUniformLocation | null> = {};

	/** Forgotten (a lost context): made again as they're next needed. */
	reset (): void {
		this.silhouette = this.tmp = null;
		this.outs = [];
		this.unions = [null, null];
		this.fbo = null;
		this.union = null;
	}

	/** The textures grown for a group's region and its shadows' blurs; each shadow's blurred size (before the frame's instances go up: their uv depend on it). */
	size (host: IgeUiShadowHost, g: IgeUiShadowGroup, scale: number): [number, number][] {
		const r = g.region!;
		this.silhouette = host._tex(this.silhouette, r.w, r.h, true);
		if (g.shadows.length > 1) for (const k of [0, 1] as const) this.unions[k] = host._tex(this.unions[k], r.w, r.h, true);
		return g.shadows.map((sh, k) => {
			const step = shadowStep((sh.blur / 2) * scale);
			const hw = Math.max(1, Math.ceil(r.w / step)), hh = Math.max(1, Math.ceil(r.h / step));
			this.tmp = host._tex(this.tmp, hw, hh);
			this.outs[k] = host._tex(this.outs[k] ?? null, hw, hh);
			return [hw, hh];
		});
	}

	/**
	 * Renders a group's silhouette: its batches drawn alone into the silhouette texture, its region's corner at 0,0.
	 * `drawBatch` draws one of the frame's batches with the program as it's set up. Leaves `target` bound, the
	 * program's uniforms and viewport as the frame has them (`base`: the UI's corner on the screen's target, when the
	 * frame is a filter's layer and its own offset differs).
	 */
	renderSilhouette (host: IgeUiShadowHost, g: IgeUiShadowGroup, drawBatch: (i: number) => void, frame: { width: number; height: number; offset: [number, number]; target: WebGLFramebuffer | null; base?: [number, number] }): void {
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
		// (The region's on the UI's target: from the UI's corner there, `base`, when what's drawing is a filter's layer)
		const base = frame.base ?? frame.offset;
		gl.uniform2f(host._uniforms.u_offset, base[0] - r.x, base[1] - r.y);
		gl.enable(gl.BLEND);
		for (let i = g.from; i < g.to; i++) drawBatch(i);
		gl.uniform2f(host._uniforms.u_resolution, frame.width, frame.height);
		gl.uniform2f(host._uniforms.u_offset, frame.offset[0], frame.offset[1]);
		gl.bindFramebuffer(gl.FRAMEBUFFER, frame.target);
		gl.viewport(0, 0, frame.width, frame.height);
		g.drawn = true;
	}

	/**
	 * A group's shadows made, in the order the filter lists them: each blurred from what's there so far (the
	 * silhouette, then the silhouette over the shadows before it), into `outs`. Leaves the frame's program, target
	 * and viewport as they were.
	 */
	chain (host: IgeUiShadowHost, g: IgeUiShadowGroup, scale: number, frame: { target: WebGLFramebuffer | null; width: number; height: number }): void {
		const gl = host.gl, r = g.region!;
		let base = this.silhouette!;
		g.shadows.forEach((sh, k) => {
			this._blur(host, base, r, (sh.blur / 2) * scale, this.outs[k]!);
			if (k === g.shadows.length - 1) return;
			// What the next one's cast from: this shadow (moved, faded to its colour's alpha) under what was there
			const dst = this.unions[k % 2]!;
			const step = shadowStep((sh.blur / 2) * scale);
			const hw = Math.max(1, Math.ceil(r.w / step)), hh = Math.max(1, Math.ceil(r.h / step));
			this._unionInto(host, dst, r, [
				{ src: this.outs[k]!, part: [hw / this.outs[k]!.w, hh / this.outs[k]!.h], off: [(sh.x * scale) / r.w, -(sh.y * scale) / r.h], alpha: sh.color.a },
				{ src: base, part: [r.w / base.w, r.h / base.h], off: [0, 0], alpha: 1 }
			]);
			base = dst;
		});
		gl.bindFramebuffer(gl.FRAMEBUFFER, frame.target);
		gl.viewport(0, 0, frame.width, frame.height);
		gl.useProgram(host._program);
		gl.bindVertexArray(host._vao);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.activeTexture(gl.TEXTURE2);
	}

	/** One shadow's blur (σ device px) of `src`'s region into `out` (k times smaller for a wide blur). */
	_blur (host: IgeUiShadowHost, src: Tex, r: { w: number; h: number }, sigma: number, out: Tex): void {
		const gl = host.gl;
		const k = shadowStep(sigma);
		const hw = Math.max(1, Math.ceil(r.w / k)), hh = Math.max(1, Math.ceil(r.h / k));
		const tmp = this.tmp!;
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, src.tex);
		// (Its smaller levels made every time, even unread: a texture made for them and missing any reads as opaque black)
		gl.generateMipmap(gl.TEXTURE_2D);
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
		pass(src, tmp, [r.w, r.h], [1, 0], k, s, Math.log2(k));
		pass(tmp, out, [hw, hh], [0, 1], 1, s, 0);
	}

	/** Copies (each moved and faded, alpha only) drawn over each other into `dst`'s region, the first lowest. */
	_unionInto (host: IgeUiShadowHost, dst: Tex, r: { w: number; h: number }, layers: { src: Tex; part: [number, number]; off: [number, number]; alpha: number }[]): void {
		const gl = host.gl;
		if (!this.union) {
			const compile = (type: number, src: string) => {
				const sh = gl.createShader(type)!;
				gl.shaderSource(sh, src);
				gl.compileShader(sh);
				if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`IgeUiDropShadow shader: ${gl.getShaderInfoLog(sh)}`);
				return sh;
			};
			const p = gl.createProgram()!;
			gl.attachShader(p, compile(gl.VERTEX_SHADER, UNION_VS));
			gl.attachShader(p, compile(gl.FRAGMENT_SHADER, UNION_FS));
			gl.linkProgram(p);
			if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`IgeUiDropShadow program: ${gl.getProgramInfoLog(p)}`);
			this.union = p;
			for (const u of ["u_src", "u_part", "u_off", "u_alpha"]) this.unionUniforms[u] = gl.getUniformLocation(p, u);
		}
		this.fbo ??= gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dst.tex, 0);
		gl.viewport(0, 0, r.w, r.h);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(this.union);
		gl.bindVertexArray(host._vao);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.activeTexture(gl.TEXTURE3);
		gl.uniform1i(this.unionUniforms.u_src, 3);
		for (const l of layers) {
			gl.bindTexture(gl.TEXTURE_2D, l.src.tex);
			gl.uniform2f(this.unionUniforms.u_part, l.part[0], l.part[1]);
			gl.uniform2f(this.unionUniforms.u_off, l.off[0], l.off[1]);
			gl.uniform1f(this.unionUniforms.u_alpha, l.alpha);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
	}
}
