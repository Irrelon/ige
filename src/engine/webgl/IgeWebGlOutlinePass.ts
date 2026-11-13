/**
 * Outlines (IgeEntity.outline()): a crisp line of constant screen width
 * round an entity's silhouette, its children's included, in any colour.
 *
 * How: the renderer draws the outlined items flat into a mask (an
 * offscreen colour target the size of the drawing buffer, only inside the
 * items' rectangle on screen), then this pass draws over the frame round
 * the mask. A pixel that isn't masked but has a masked pixel within the
 * outline's width takes the colour, its outer edge smoothed by distance.
 * Because it works on the silhouette in screen space it's the same width
 * at any zoom, wraps boxy shapes cleanly (no gaps at corners as an
 * inverted hull has), never z-fights (no depth test: the whole silhouette
 * is outlined, through whatever stands in front of it) and works for
 * whatever the renderer can draw: instanced, skinned, levels of detail.
 *
 * Nothing outlined, nothing done: the target is made on first use. WebGL
 * 1 and 2 (GLSL ES 1.00, an RGBA8 colour target). After a lost context
 * the renderer forgets this pass (contextLost) and a new one is made.
 */

/** The widest outline drawn (device pixels): wider ones are drawn this wide. */
export const OUTLINE_MAX_RADIUS = 12;

export interface IgeOutline {
	r: number;
	g: number;
	b: number;
	a: number;
	/** Its width in CSS pixels (the renderer scales it by the device pixel ratio). */
	width: number;
}

/** A rectangle in device pixels, GL's way up (origin bottom left): x0, y0 inclusive, x1, y1 exclusive. */
export interface IgeOutlineRect {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

const VERTEX = `
attribute vec2 a_position;
void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
}`;

/** The composite's fragment shader, its search reach fixed at `radius` pixels (one program per width). */
export function outlineFragment (radius: number): string {
	const r = Math.max(1, Math.min(OUTLINE_MAX_RADIUS, Math.round(radius)));
	return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_mask;
uniform vec2 u_size;
uniform vec4 u_rect;
uniform vec4 u_color;
uniform float u_radius;
#define R ${r}
float masked (vec2 p) {
	vec2 q = clamp(p, u_rect.xy + 0.5, u_rect.zw - 0.5);
	return texture2D(u_mask, q / u_size).a;
}
void main() {
	vec2 p = gl_FragCoord.xy;
	if (masked(p) > 0.5) discard;
	float best = 1000.0;
	for (int y = -R; y <= R; y++) {
		for (int x = -R; x <= R; x++) {
			vec2 o = vec2(float(x), float(y));
			float d = length(o);
			if (d > u_radius + 0.5 || d >= best) continue;
			if (masked(p + o) > 0.5) best = d;
		}
	}
	float a = clamp(u_radius + 0.5 - best, 0.0, 1.0);
	if (a <= 0.0) discard;
	gl_FragColor = vec4(u_color.rgb, u_color.a * a);
}`;
}

/**
 * Where outlined things are on screen: the rectangle (device pixels, GL's
 * way up) round the bounding spheres (`spheres`: x, y, z, radius, four
 * numbers each) as `viewProj` (column-major) puts them in the viewport
 * `view`, grown by `pad` pixels and kept inside the view. Undefined if
 * none of it is in view. A sphere behind the camera gives the whole view.
 */
export function outlineRect (spheres: ArrayLike<number>, viewProj: ArrayLike<number>, view: IgeOutlineRect, pad: number): IgeOutlineRect | undefined {
	const m = viewProj;
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	const w = view.x1 - view.x0, h = view.y1 - view.y0;
	for (let i = 0; i + 3 < spheres.length; i += 4) {
		const cx = spheres[i], cy = spheres[i + 1], cz = spheres[i + 2], r = Math.max(0, spheres[i + 3]);
		// The corners of the box round the sphere
		for (let k = 0; k < 8; k++) {
			const x = cx + (k & 1 ? r : -r), y = cy + (k & 2 ? r : -r), z = cz + (k & 4 ? r : -r);
			const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
			if (cw <= 1e-6) return clampRect({ x0: view.x0, y0: view.y0, x1: view.x1, y1: view.y1 }, view);
			const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw;
			const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw;
			const px = view.x0 + (nx * 0.5 + 0.5) * w, py = view.y0 + (ny * 0.5 + 0.5) * h;
			if (px < x0) x0 = px;
			if (px > x1) x1 = px;
			if (py < y0) y0 = py;
			if (py > y1) y1 = py;
		}
	}
	if (x0 > x1) return undefined;
	return clampRect({ x0: Math.floor(x0 - pad), y0: Math.floor(y0 - pad), x1: Math.ceil(x1 + pad), y1: Math.ceil(y1 + pad) }, view);
}

function clampRect (r: IgeOutlineRect, view: IgeOutlineRect): IgeOutlineRect | undefined {
	const out = { x0: Math.max(r.x0, view.x0), y0: Math.max(r.y0, view.y0), x1: Math.min(r.x1, view.x1), y1: Math.min(r.y1, view.y1) };
	return out.x1 > out.x0 && out.y1 > out.y0 ? out : undefined;
}

/** The outline an object is drawn with: its own, or the nearest it's mounted under (theirs goes round them all). */
export function outlineOf (obj: { _outline?: IgeOutline | null; _parent?: unknown } | null | undefined): IgeOutline | null {
	let at = obj as { _outline?: IgeOutline | null; _parent?: unknown } | null | undefined;
	while (at && !at._outline) at = at._parent as typeof at;
	return at?._outline ?? null;
}

/** Outlined items grouped by their outline (one mask and one composite each: usually just the one). */
export function outlineGroups<T extends { outline?: IgeOutline | null }> (items: T[]): { outline: IgeOutline; items: T[] }[] {
	const out: { outline: IgeOutline; items: T[] }[] = [];
	for (const item of items) {
		const o = item.outline;
		if (!o) continue;
		let group = out.find((g) => g.outline === o || (g.outline.r === o.r && g.outline.g === o.g && g.outline.b === o.b && g.outline.a === o.a && g.outline.width === o.width));
		if (!group) out.push(group = { outline: o, items: [] });
		group.items.push(item);
	}
	return out;
}

type Gl = WebGLRenderingContext | WebGL2RenderingContext;

interface OutlineProgram {
	program: WebGLProgram;
	position: number;
	mask: WebGLUniformLocation | null;
	size: WebGLUniformLocation | null;
	rect: WebGLUniformLocation | null;
	color: WebGLUniformLocation | null;
	radius: WebGLUniformLocation | null;
}

export class IgeWebGlOutlinePass {
	_gl: Gl;
	_texture: WebGLTexture | null = null;
	_framebuffer: WebGLFramebuffer | null = null;
	_buffer: WebGLBuffer | null = null;
	_width = 0;
	_height = 0;
	_programs = new Map<number, OutlineProgram | null>();

	constructor (gl: Gl) {
		this._gl = gl;
	}

	/**
	 * Binds the mask target (made, or remade at `width` × `height`, the
	 * drawing buffer's size) with the scissor on `rect`, cleared there.
	 * The caller then draws the outlined items flat (alpha 1) in the same
	 * viewport it draws the frame in. False if no target could be made.
	 * `clear` is the clear colour to leave set after (the renderer's: never
	 * read back from GL, a query that waits for the GPU).
	 */
	beginMask (width: number, height: number, rect: IgeOutlineRect, clear: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 }): boolean {
		const gl = this._gl;
		if (!this._target(width, height)) return false;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.clearColor(clear.r, clear.g, clear.b, clear.a);
		return true;
	}

	/**
	 * Draws the outline round the mask into `target` (the frame's
	 * framebuffer: null for the canvas), inside `rect` only, in `color`
	 * (0 to 1, alpha blended), `radius` device pixels wide.
	 */
	composite (target: WebGLFramebuffer | null, rect: IgeOutlineRect, color: { r: number; g: number; b: number; a: number }, radius: number): void {
		const gl = this._gl;
		const r = Math.max(1, Math.min(OUTLINE_MAX_RADIUS, Math.round(radius)));
		const prog = this._program(r);
		gl.bindFramebuffer(gl.FRAMEBUFFER, target);
		if (!prog) return;
		gl.viewport(0, 0, this._width, this._height);
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
		gl.disable(gl.DEPTH_TEST);
		gl.depthMask(false);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		bindNoVertexArray(gl);
		gl.useProgram(prog.program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._texture);
		gl.uniform1i(prog.mask, 0);
		gl.uniform2f(prog.size, this._width, this._height);
		gl.uniform4f(prog.rect, rect.x0, rect.y0, rect.x1, rect.y1);
		gl.uniform4f(prog.color, color.r, color.g, color.b, color.a);
		gl.uniform1f(prog.radius, r);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
		gl.enableVertexAttribArray(prog.position);
		gl.vertexAttribPointer(prog.position, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.disableVertexAttribArray(prog.position);
		gl.depthMask(true);
	}

	/** The context was lost: its handles are dead (forgotten, not deleted). */
	contextLost (): void {
		this._texture = null;
		this._framebuffer = null;
		this._buffer = null;
		this._width = this._height = 0;
		this._programs.clear();
	}

	/** Frees what it made. */
	destroy (): void {
		const gl = this._gl;
		if (this._framebuffer) gl.deleteFramebuffer(this._framebuffer);
		if (this._texture) gl.deleteTexture(this._texture);
		if (this._buffer) gl.deleteBuffer(this._buffer);
		for (const p of this._programs.values()) if (p) gl.deleteProgram(p.program);
		this.contextLost();
	}

	_target (width: number, height: number): boolean {
		const gl = this._gl;
		if (this._framebuffer && this._width === width && this._height === height) return true;
		if (width <= 0 || height <= 0) return false;
		if (!this._texture) this._texture = gl.createTexture();
		if (!this._framebuffer) this._framebuffer = gl.createFramebuffer();
		if (!this._texture || !this._framebuffer) return false;
		gl.bindTexture(gl.TEXTURE_2D, this._texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		const previous = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);
		const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
		gl.bindFramebuffer(gl.FRAMEBUFFER, previous);
		if (!ok) return false;
		this._width = width;
		this._height = height;
		if (!this._buffer) {
			// One triangle over the whole target (the scissor keeps it to the outline's rectangle)
			this._buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		}
		return true;
	}

	_program (radius: number): OutlineProgram | null {
		if (this._programs.has(radius)) return this._programs.get(radius)!;
		const gl = this._gl;
		const vs = compile(gl, gl.VERTEX_SHADER, VERTEX), fs = compile(gl, gl.FRAGMENT_SHADER, outlineFragment(radius));
		let made: OutlineProgram | null = null;
		const program = vs && fs ? gl.createProgram() : null;
		if (program && vs && fs) {
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
			gl.linkProgram(program);
			if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
				made = {
					program, position: gl.getAttribLocation(program, "a_position"),
					mask: gl.getUniformLocation(program, "u_mask"), size: gl.getUniformLocation(program, "u_size"), rect: gl.getUniformLocation(program, "u_rect"),
					color: gl.getUniformLocation(program, "u_color"), radius: gl.getUniformLocation(program, "u_radius")
				};
			} else gl.deleteProgram(program);
		}
		if (vs) gl.deleteShader(vs);
		if (fs) gl.deleteShader(fs);
		this._programs.set(radius, made);
		return made;
	}
}

function compile (gl: Gl, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

/** The attributes set here mustn't land in another draw's vertex array object. */
function bindNoVertexArray (gl: Gl): void {
	if ("bindVertexArray" in gl) (gl as WebGL2RenderingContext).bindVertexArray(null);
	else gl.getExtension("OES_vertex_array_object")?.bindVertexArrayOES(null);
}
