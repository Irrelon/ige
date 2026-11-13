/**
 * CSS filters on the engine's UI, as Chrome applies them: an element with a
 * filter list (other than drop-shadows alone: IgeUiDropShadow draws those
 * in place) is drawn on its own into a layer, the filter functions applied
 * to that in the order they're listed, and the result drawn where it was:
 *
 * - the colour functions (grayscale, sepia, saturate, hue-rotate, invert,
 *   opacity, brightness, contrast): their colour matrices from the Filter
 *   Effects spec, on unpremultiplied colour in sRGB, each clamped before the
 *   next, as Chrome runs them;
 * - blur(r): a Gaussian of deviation r (it reaches past the element);
 * - drop-shadow(): what's there so far, its alpha blurred (half the radius),
 *   tinted and moved, under it.
 *
 * backdrop-filter shares the colour matrices: what's behind is copied,
 * blurred if it says so, then its colour functions applied (the Hollow's
 * toll greys the view: grayscale() contrast()).
 *
 * The painter marks an element's run with a group carrying its functions
 * (IgeUiPaintGroup.filters); IgeUiGlRenderer draws the run into a layer of
 * this pass's and composites the result. Filters inside filters nest (each
 * depth has its own layer textures).
 */
import { type IgeCssColor, type IgeCssLengthContext, parseShadows, resolveAngle, resolveLength } from "@/engine/ui2/css/IgeCssValues";

/** One step of a filter list: a colour matrix (4x5, row by row: r g b a and an offset for each of r, g, b and a), a blur, a drop shadow. */
export type IgeUiFilterOp =
	| { type: "matrix"; m: number[] }
	| { type: "blur"; radius: number }
	| { type: "shadow"; x: number; y: number; blur: number; color: IgeCssColor };

/** The identity colour matrix. */
const IDENTITY_M = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

/** A 3x3 colour matrix on r, g, b (alpha kept), as a 4x5. */
function rgb3 (k: number[]): number[] {
	return [k[0], k[1], k[2], 0, 0, k[3], k[4], k[5], 0, 0, k[6], k[7], k[8], 0, 0, 0, 0, 0, 1, 0];
}

/** An amount: a number or a percentage; `fallback` when there's none. */
function amount (arg: string | undefined, fallback: number): number {
	const a = (arg ?? "").trim();
	if (!a) return fallback;
	if (a.endsWith("%")) return parseFloat(a) / 100;
	const n = Number(a);
	return Number.isFinite(n) ? n : fallback;
}

/** A colour function's matrix (the Filter Effects spec's), or undefined if `name` isn't one. */
export function colorMatrix (name: string, arg: string | undefined): number[] | undefined {
	switch (name) {
		case "grayscale": {
			const s = 1 - Math.min(1, Math.max(0, amount(arg, 1)));
			return rgb3([
				0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s,
				0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s,
				0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s
			]);
		}
		case "sepia": {
			const s = 1 - Math.min(1, Math.max(0, amount(arg, 1)));
			return rgb3([
				0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s,
				0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s,
				0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s
			]);
		}
		case "saturate": {
			const s = Math.max(0, amount(arg, 1));
			return rgb3([
				0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
				0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
				0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s
			]);
		}
		case "hue-rotate": {
			const a = ((resolveAngle((arg ?? "").trim() || "0deg") ?? 0) * Math.PI) / 180;
			const c = Math.cos(a), s = Math.sin(a);
			return rgb3([
				0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
				0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
				0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072
			]);
		}
		case "invert": {
			const v = Math.min(1, Math.max(0, amount(arg, 1)));
			const k = 1 - 2 * v;
			return [k, 0, 0, 0, v, 0, k, 0, 0, v, 0, 0, k, 0, v, 0, 0, 0, 1, 0];
		}
		case "opacity": {
			const v = Math.min(1, Math.max(0, amount(arg, 1)));
			return [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, v, 0];
		}
		case "brightness": {
			const v = Math.max(0, amount(arg, 1));
			return [v, 0, 0, 0, 0, 0, v, 0, 0, 0, 0, 0, v, 0, 0, 0, 0, 0, 1, 0];
		}
		case "contrast": {
			const v = Math.max(0, amount(arg, 1));
			const o = 0.5 - 0.5 * v;
			return [v, 0, 0, 0, o, 0, v, 0, 0, o, 0, 0, v, 0, o, 0, 0, 0, 1, 0];
		}
		default: return undefined;
	}
}

/** The top-level functions in a filter list: name (lower case) and what's in its brackets. */
function functions (value: string): { name: string; args: string }[] {
	const out: { name: string; args: string }[] = [];
	const v = value.trim();
	if (!v || v === "none") return out;
	let i = 0;
	while (i < v.length) {
		const m = /^\s*([a-zA-Z-]+)\(/.exec(v.slice(i));
		if (!m) break;
		const start = i + m[0].length;
		let depth = 1, j = start;
		for (; j < v.length && depth; j++) {
			if (v[j] === "(") depth++;
			else if (v[j] === ")") depth--;
		}
		out.push({ name: m[1].toLowerCase(), args: v.slice(start, j - 1) });
		i = j;
	}
	return out;
}

/** A filter list's steps (none: an empty list; url() references and anything unknown left out). */
export function parseFilterList (value: string, ctx: IgeCssLengthContext, current: IgeCssColor): IgeUiFilterOp[] {
	const out: IgeUiFilterOp[] = [];
	for (const f of functions(value)) {
		if (f.name === "blur") {
			const r = resolveLength(f.args.trim() || "0px", ctx) ?? 0;
			if (r > 0) out.push({ type: "blur", radius: r });
			continue;
		}
		if (f.name === "drop-shadow") {
			const sh = parseShadows(f.args, ctx, current)[0];
			if (sh) out.push({ type: "shadow", x: sh.x, y: sh.y, blur: Math.max(0, sh.blur), color: sh.color });
			continue;
		}
		const m = colorMatrix(f.name, f.args);
		if (m && m.some((v, k) => Math.abs(v - IDENTITY_M[k]) > 1e-9)) out.push({ type: "matrix", m });
	}
	return out;
}

/**
 * A filter list's functions at their identity, for interpolating from or to none (its colours written as rgba(), as
 * the animator has them): brightness, contrast, saturate and opacity 1 (100%); grayscale, sepia, invert, hue-rotate
 * and blur 0; a drop shadow with no offset or blur, its colour transparent. The text keeps its shape (units and all),
 * so the two interpolate number by number.
 */
export function identityFilter (value: string): string {
	return functions(value).map((f) => {
		const one = /^(brightness|contrast|saturate|opacity)$/.test(f.name);
		const args = f.args.replace(/rgba\(([^)]*)\)|-?(?:\d+\.?\d*|\.\d+)(%?)/g, (t: string, rgba: string | undefined, pct: string | undefined) => {
			if (rgba !== undefined) return `rgba(${rgba.split(",").slice(0, 3).join(",")}, 0)`;
			return one ? (pct ? "100%" : "1") : pct ? "0%" : "0";
		});
		return `${f.name}(${args})`;
	}).join(" ");
}

/** Whether a filter list is only drop-shadows (drawn in place: IgeUiDropShadow). */
export function onlyDropShadows (ops: IgeUiFilterOp[]): boolean {
	return ops.every((o) => o.type === "shadow");
}

/** How far a filter list's result reaches past what it's of (UI px): blurs' three deviations, shadows' offsets too. */
export function filterReach (ops: IgeUiFilterOp[]): number {
	let reach = 0;
	for (const o of ops) {
		if (o.type === "blur") reach += o.radius * 3;
		else if (o.type === "shadow") reach += Math.max(Math.abs(o.x), Math.abs(o.y)) + (o.blur / 2) * 3;
	}
	return reach;
}

type Tex = { tex: WebGLTexture; w: number; h: number };

/** What the filter pass needs of the renderer: its blur program and texture maker. */
export interface IgeUiFilterHost {
	gl: WebGL2RenderingContext;
	_vao: WebGLVertexArrayObject | null;
	_blurProgram: WebGLProgram | null;
	_blurUniforms: Record<string, WebGLUniformLocation | null>;
	_tex (have: Tex | null, w: number, h: number, mips?: boolean): Tex;
}

const PASS_VS = `#version 300 es
layout(location=0) in vec2 a_corner;
out vec2 v_uv;
void main() {
	v_uv = a_corner;
	gl_Position = vec4(a_corner * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Colour matrices on a texture's region: unpremultiplied, each applied and clamped in turn, premultiplied again. */
const COLOR_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform vec2 u_part;
uniform int u_count;
uniform mat4 u_m[8];
uniform vec4 u_o[8];
out vec4 outColor;
void main() {
	vec4 c = texture(u_src, v_uv * u_part);
	vec4 u = c.a > 0.0 ? vec4(c.rgb / c.a, c.a) : vec4(0.0);
	for (int i = 0; i < 8; i++) {
		if (i >= u_count) break;
		u = clamp(u_m[i] * u + u_o[i], 0.0, 1.0);
	}
	outColor = vec4(u.rgb * u.a, u.a);
}`;

/** A drop shadow under a texture: the blurred copy's alpha (moved, tinted) under what's there. */
const UNDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform sampler2D u_shadow;
uniform vec2 u_part;
uniform vec2 u_off;
uniform vec4 u_color;
out vec4 outColor;
void main() {
	vec4 c = texture(u_src, v_uv * u_part);
	vec2 su = v_uv - u_off;
	float a = (su.x < 0.0 || su.y < 0.0 || su.x > 1.0 || su.y > 1.0) ? 0.0 : texture(u_shadow, su * u_part).a;
	vec4 s = vec4(u_color.rgb * u_color.a, u_color.a) * a;
	outColor = c + s * (1.0 - c.a);
}`;

/** A layer: its texture and the framebuffer drawing into it. */
export interface IgeUiLayerTex extends Tex {
	fbo: WebGLFramebuffer;
}

/**
 * A pass's target bound and cleared whole first: a layer texture's smaller levels are read (wide blurs), and they'd mix
 * in what an earlier, bigger layer left past this one's region.
 */
/** A texture read with its smaller levels (a wide blur's coarse reads: made first) or without (drawn 1:1, needing none). */
function mipReads (gl: WebGL2RenderingContext, tex: WebGLTexture, on: boolean): void {
	gl.bindTexture(gl.TEXTURE_2D, tex);
	if (on) gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, on ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
}

function target (gl: WebGL2RenderingContext, fbo: WebGLFramebuffer | null, w: number, h: number): void {
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.viewport(0, 0, w, h);
}

/**
 * The filter pass: each nesting depth's four layer textures (what's drawn, and room for a filter list's steps), and
 * the programs that run the colour functions and put drop shadows under.
 */
export class IgeUiFilterPass {
	layers: IgeUiLayerTex[][] = [];
	color: WebGLProgram | null = null;
	colorU: Record<string, WebGLUniformLocation | null> = {};
	under: WebGLProgram | null = null;
	underU: Record<string, WebGLUniformLocation | null> = {};

	/** Forgotten (a lost context): made again as they're next needed. */
	reset (): void {
		this.layers = [];
		this.color = this.under = null;
	}

	/** Depth `d`'s textures, all grown to at least w x h; their size (each composite's uv is worked out from it). */
	size (host: IgeUiFilterHost, d: number, w: number, h: number): [number, number] {
		const gl = host.gl;
		// (The target bound as it was, after the layers' framebuffers are set up)
		const was = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
		const set = (this.layers[d] ??= []);
		for (let k = 0; k < 4; k++) {
			const have = set[k];
			const t = host._tex(have ?? null, w, h, true);
			if (!have) set[k] = { ...t, fbo: gl.createFramebuffer()! };
			else {
				have.w = t.w;
				have.h = t.h;
			}
			const fb = set[k];
			// (Read 1:1 unless a blur asks for its smaller levels: none to make)
			mipReads(gl, fb.tex, false);
			gl.bindFramebuffer(gl.FRAMEBUFFER, fb.fbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fb.tex, 0);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, was);
		return [set[0].w, set[0].h];
	}

	_program (host: IgeUiFilterHost, fs: string, names: string[]): [WebGLProgram, Record<string, WebGLUniformLocation | null>] {
		const gl = host.gl;
		const compile = (type: number, src: string) => {
			const s = gl.createShader(type)!;
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`IgeUiFilters shader: ${gl.getShaderInfoLog(s)}`);
			return s;
		};
		const p = gl.createProgram()!;
		gl.attachShader(p, compile(gl.VERTEX_SHADER, PASS_VS));
		gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`IgeUiFilters program: ${gl.getProgramInfoLog(p)}`);
		const u: Record<string, WebGLUniformLocation | null> = {};
		for (const n of names) u[n] = gl.getUniformLocation(p, n);
		return [p, u];
	}

	/** Up to eight colour matrices (4x5 each, row by row) on `src`'s first w x h into `dst`'s, in one pass. The caller restores its own state. */
	colorPass (host: IgeUiFilterHost, src: Tex, dst: IgeUiLayerTex | { fbo: WebGLFramebuffer | null; tex: WebGLTexture; w: number; h: number }, w: number, h: number, mats: number[][]): void {
		const gl = host.gl;
		if (!this.color) [this.color, this.colorU] = this._program(host, COLOR_FS, ["u_src", "u_part", "u_count", "u_m", "u_o"]);
		target(gl, dst.fbo, w, h);
		gl.useProgram(this.color);
		gl.bindVertexArray(host._vao);
		gl.disable(gl.BLEND);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, src.tex);
		gl.uniform1i(this.colorU.u_src, 3);
		gl.uniform2f(this.colorU.u_part, w / src.w, h / src.h);
		const n = Math.min(8, mats.length);
		const m = new Float32Array(16 * 8), o = new Float32Array(4 * 8);
		for (let i = 0; i < n; i++) {
			const k = mats[i];
			// (Column by column for GLSL: column c holds each output's weight of input c)
			for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) m[i * 16 + c * 4 + r] = k[r * 5 + c];
			for (let r = 0; r < 4; r++) o[i * 4 + r] = k[r * 5 + 4];
		}
		gl.uniform1i(this.colorU.u_count, n);
		gl.uniformMatrix4fv(this.colorU.u_m, false, m);
		gl.uniform4fv(this.colorU.u_o, o);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	/** A Gaussian of deviation `sigma` (device px) of `src`'s first w x h into `dst`'s, through `tmp`, at full size (coarser reads for wide blurs). */
	blurPass (host: IgeUiFilterHost, src: Tex, tmp: IgeUiLayerTex, dst: IgeUiLayerTex, w: number, h: number, sigma: number): void {
		const gl = host.gl;
		const k = sigma >= 16 ? 8 : sigma >= 8 ? 4 : sigma >= 3 ? 2 : 1;
		gl.useProgram(host._blurProgram);
		gl.bindVertexArray(host._vao);
		gl.disable(gl.BLEND);
		gl.activeTexture(gl.TEXTURE3);
		gl.uniform1i(host._blurUniforms.u_src, 3);
		const pass = (from: Tex, to: IgeUiLayerTex, dir: [number, number]) => {
			// (Its smaller levels, for the coarse reads, made now; read 1:1 again after)
			mipReads(gl, from.tex, k > 1);
			target(gl, to.fbo, w, h);
			gl.uniform4f(host._blurUniforms.u_area, 0, 0, w / from.w, h / from.h);
			gl.uniform2f(host._blurUniforms.u_step, (dir[0] * k) / from.w, (dir[1] * k) / from.h);
			gl.uniform1f(host._blurUniforms.u_sigma, Math.max(sigma, 0.001) / k);
			gl.uniform1f(host._blurUniforms.u_lod, Math.log2(k));
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			if (k > 1) mipReads(gl, from.tex, false);
		};
		pass(src, tmp, [1, 0]);
		pass(tmp, dst, [0, 1]);
	}

	/** `shadow` (its alpha, moved by off: 0 to 1 of the region, tinted) under `src`, into `dst`. */
	underPass (host: IgeUiFilterHost, src: Tex, shadow: Tex, dst: IgeUiLayerTex, w: number, h: number, off: [number, number], color: IgeCssColor): void {
		const gl = host.gl;
		if (!this.under) [this.under, this.underU] = this._program(host, UNDER_FS, ["u_src", "u_shadow", "u_part", "u_off", "u_color"]);
		target(gl, dst.fbo, w, h);
		gl.useProgram(this.under);
		gl.bindVertexArray(host._vao);
		gl.disable(gl.BLEND);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, src.tex);
		gl.activeTexture(gl.TEXTURE4);
		gl.bindTexture(gl.TEXTURE_2D, shadow.tex);
		gl.uniform1i(this.underU.u_src, 3);
		gl.uniform1i(this.underU.u_shadow, 4);
		gl.uniform2f(this.underU.u_part, w / src.w, h / src.h);
		gl.uniform2f(this.underU.u_off, off[0], off[1]);
		gl.uniform4f(this.underU.u_color, color.r / 255, color.g / 255, color.b / 255, color.a);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.activeTexture(gl.TEXTURE3);
	}

	/**
	 * A layer's filter list run on it (depth `d`, its first w x h; what was drawn in texture 0): each step from the last
	 * one's result into a free texture. Returns the texture holding the result. `scale`: device px per UI px.
	 */
	apply (host: IgeUiFilterHost, d: number, w: number, h: number, ops: IgeUiFilterOp[], scale: number): IgeUiLayerTex {
		const set = this.layers[d];
		let cur = 0;
		const free = (...busy: number[]) => [0, 1, 2, 3].filter((k) => !busy.includes(k));
		for (let i = 0; i < ops.length; i++) {
			const o = ops[i];
			if (o.type === "matrix") {
				// (Consecutive colour functions in one pass)
				const mats = [o.m];
				while (i + 1 < ops.length && ops[i + 1].type === "matrix") mats.push((ops[++i] as { m: number[] }).m);
				for (let k = 0; k < mats.length; k += 8) {
					const [dst] = free(cur);
					this.colorPass(host, set[cur], set[dst], w, h, mats.slice(k, k + 8));
					cur = dst;
				}
			} else if (o.type === "blur") {
				const [tmp, dst] = free(cur);
				this.blurPass(host, set[cur], set[tmp], set[dst], w, h, o.radius * scale);
				cur = dst;
			} else {
				const [tmp, blurred, dst] = free(cur);
				this.blurPass(host, set[cur], set[tmp], set[blurred], w, h, (o.blur / 2) * scale);
				// (Moved down the page: up the texture, whose rows are bottom up)
				this.underPass(host, set[cur], set[blurred], set[dst], w, h, [(o.x * scale) / w, -(o.y * scale) / h], o.color);
				cur = dst;
			}
		}
		return set[cur];
	}
}

/** A filter's layer in one frame (IgeUiGlRenderer.draw). */
export interface IgeUiFilterLayer {
	ops: IgeUiFilterOp[];
	/** The frame's batches and instances in it: [from, to), [start, end). */
	from: number;
	to: number;
	start: number;
	end: number;
	/** How many filters it's inside (its textures: IgeUiFilterPass.layers[depth]). */
	depth: number;
	/** The clip its result is drawn in (screen px). */
	clip: number[];
	/** Its rectangle on the target (device px, top-down), with room for what the filters reach; none: nothing in it. */
	region?: { x: number; y: number; w: number; h: number };
	/** Its composite instance (its offset in the frame's instance data). */
	o: number;
	/** Its element's own opacity, applied to the result whole. */
	opacity: number;
	/** Only an opacity, drawn ahead of the screen's own pass: where it is in the fades' atlas (texels). */
	atlas?: [number, number];
}

/**
 * A layer's rectangle (device px): round what its instances cover (`data`, `stride` floats each: rect at 0, the
 * transform at 32 (a, b, c, d, e, f), its opacity at 38, the projective row at 44), grown by the filters' reach, kept
 * to the target and as far past it as that reach.
 */
export function layerRegion (data: Float32Array, stride: number, L: IgeUiFilterLayer, width: number, height: number, scale: number, offset: [number, number]): IgeUiFilterLayer["region"] {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (let o = L.start * stride; o < L.end * stride; o += stride) {
		const rx = data[o], ry = data[o + 1], rw = data[o + 2], rh = data[o + 3];
		if (rw <= 0 || rh <= 0 || data[o + 38] <= 0) continue;
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
	if (!Number.isFinite(x0)) return undefined;
	const reach = Math.ceil(filterReach(L.ops) * scale) + 2;
	const rx0 = Math.max(-reach, Math.floor(x0) - reach), ry0 = Math.max(-reach, Math.floor(y0) - reach);
	const rx1 = Math.min(width + reach, Math.ceil(x1) + reach), ry1 = Math.min(height + reach, Math.ceil(y1) + reach);
	return rx1 > rx0 && ry1 > ry0 ? { x: rx0, y: ry0, w: rx1 - rx0, h: ry1 - ry0 } : undefined;
}
