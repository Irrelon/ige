import { compareUi, type IgeUiRect, type IgeUiSortable } from "@/engine/webgl/IgeUiLayout";

/** A UI layer element ready to draw: where (the viewport's CSS pixels), its texture and its colour. */
export interface IgeUiQuad extends IgeUiSortable, IgeUiRect {
	texture: WebGLTexture | null;
	/** Texture coordinates of its top-left and bottom-right corners. */
	u0: number;
	v0: number;
	u1: number;
	v1: number;
	/** Turned about its middle on screen (radians, clockwise): the entity's own rotation about z. */
	rotation?: number;
	/** Tint, and alpha (its opacity). */
	r: number;
	g: number;
	b: number;
	a: number;
}

const VERTEX = `
attribute vec2 a_position;
attribute vec2 a_uv;
attribute vec4 a_color;
uniform vec2 u_resolution;
varying vec2 v_uv;
varying vec4 v_color;
void main() {
	v_uv = a_uv;
	v_color = a_color;
	gl_Position = vec4(a_position.x / u_resolution.x * 2.0 - 1.0, 1.0 - a_position.y / u_resolution.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
varying vec4 v_color;
void main() {
	vec4 c = texture2D(u_texture, v_uv) * v_color;
	if (c.a <= 0.002) discard;
	gl_FragColor = c;
}`;

/** Floats per vertex: position (2), texture coordinates (2), colour (4). */
const FLOATS = 8;

/**
 * Draws UI layer elements (IgeWebGlRenderer's last pass): textured quads in
 * a viewport's pixels, sorted by layer (compareUi), with no depth test so
 * nothing in the scene can cover them, and normal alpha blending. Every
 * quad goes into one vertex buffer; quads that share a texture one after
 * another are one draw call. WebGL 1 and 2.
 *
 * It sets GL state itself: the renderer resets its state cache after.
 */
export class IgeWebGlUiPass {
	_gl: WebGLRenderingContext | WebGL2RenderingContext;
	_program: WebGLProgram | null = null;
	_buffer: WebGLBuffer | null = null;
	_data: Float32Array = new Float32Array(FLOATS * 6 * 64);
	_loc: { position: number; uv: number; color: number; resolution: WebGLUniformLocation | null; texture: WebGLUniformLocation | null } | undefined;

	constructor (gl: WebGLRenderingContext | WebGL2RenderingContext) {
		this._gl = gl;
	}

	/**
	 * Draws `quads` (sorted here) into the viewport at `x, y` (GL's
	 * viewport and scissor, device pixels) `width` × `height` CSS pixels
	 * at `dpr` device pixels each. `blank` stands in for a texture that
	 * isn't ready. Returns the draw calls made.
	 */
	draw (quads: IgeUiQuad[], x: number, y: number, width: number, height: number, dpr: number, blank: WebGLTexture | null): number {
		if (quads.length === 0 || !this._ready()) return 0;
		const gl = this._gl;
		quads.sort(compareUi);

		// Every quad's two triangles, in device pixels from the viewport's top left
		const need = quads.length * 6 * FLOATS;
		if (this._data.length < need) this._data = new Float32Array(Math.max(need, this._data.length * 2));
		const d = this._data;
		let o = 0;
		for (let i = 0; i < quads.length; i++) {
			const q = quads[i];
			const x0 = q.x * dpr, y0 = q.y * dpr, x1 = (q.x + q.width) * dpr, y1 = (q.y + q.height) * dpr;
			if (q.rotation) {
				// Its corners turned about its middle
				const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
				const c = Math.cos(q.rotation), s = Math.sin(q.rotation);
				const tl = [cx - hw * c + hh * s, cy - hw * s - hh * c], tr = [cx + hw * c + hh * s, cy + hw * s - hh * c];
				const bl = [cx - hw * c - hh * s, cy - hw * s + hh * c], br = [cx + hw * c - hh * s, cy + hw * s + hh * c];
				o = vertex(d, o, tl[0], tl[1], q.u0, q.v0, q);
				o = vertex(d, o, tr[0], tr[1], q.u1, q.v0, q);
				o = vertex(d, o, bl[0], bl[1], q.u0, q.v1, q);
				o = vertex(d, o, bl[0], bl[1], q.u0, q.v1, q);
				o = vertex(d, o, tr[0], tr[1], q.u1, q.v0, q);
				o = vertex(d, o, br[0], br[1], q.u1, q.v1, q);
				continue;
			}
			o = vertex(d, o, x0, y0, q.u0, q.v0, q);
			o = vertex(d, o, x1, y0, q.u1, q.v0, q);
			o = vertex(d, o, x0, y1, q.u0, q.v1, q);
			o = vertex(d, o, x0, y1, q.u0, q.v1, q);
			o = vertex(d, o, x1, y0, q.u1, q.v0, q);
			o = vertex(d, o, x1, y1, q.u1, q.v1, q);
		}

		const vw = Math.max(1, Math.floor(width * dpr)), vh = Math.max(1, Math.floor(height * dpr));
		gl.viewport(x, y, vw, vh);
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(x, y, vw, vh);
		// On top of everything: no depth test, nothing written to depth
		gl.disable(gl.DEPTH_TEST);
		gl.depthMask(false);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		bindNoVertexArray(gl);

		const loc = this._loc!;
		gl.useProgram(this._program);
		gl.uniform2f(loc.resolution, vw, vh);
		gl.uniform1i(loc.texture, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
		gl.bufferData(gl.ARRAY_BUFFER, d.subarray(0, o), gl.DYNAMIC_DRAW);
		const stride = FLOATS * 4;
		gl.enableVertexAttribArray(loc.position);
		gl.vertexAttribPointer(loc.position, 2, gl.FLOAT, false, stride, 0);
		gl.enableVertexAttribArray(loc.uv);
		gl.vertexAttribPointer(loc.uv, 2, gl.FLOAT, false, stride, 8);
		gl.enableVertexAttribArray(loc.color);
		gl.vertexAttribPointer(loc.color, 4, gl.FLOAT, false, stride, 16);
		gl.activeTexture(gl.TEXTURE0);

		// One draw per run of quads sharing a texture
		let calls = 0;
		let start = 0;
		for (let i = 1; i <= quads.length; i++) {
			if (i < quads.length && quads[i].texture === quads[start].texture) continue;
			gl.bindTexture(gl.TEXTURE_2D, quads[start].texture ?? blank);
			gl.drawArrays(gl.TRIANGLES, start * 6, (i - start) * 6);
			calls++;
			start = i;
		}

		gl.disableVertexAttribArray(loc.position);
		gl.disableVertexAttribArray(loc.uv);
		gl.disableVertexAttribArray(loc.color);
		gl.depthMask(true);
		return calls;
	}

	/** Frees its program and buffer. */
	destroy (): void {
		const gl = this._gl;
		if (this._program) gl.deleteProgram(this._program);
		if (this._buffer) gl.deleteBuffer(this._buffer);
		this._program = null;
		this._buffer = null;
		this._loc = undefined;
	}

	_ready (): boolean {
		if (this._loc) return true;
		const gl = this._gl;
		const vs = compile(gl, gl.VERTEX_SHADER, VERTEX), fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
		if (!vs || !fs) return false;
		const program = gl.createProgram();
		if (!program) return false;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			gl.deleteProgram(program);
			return false;
		}
		this._program = program;
		this._buffer = gl.createBuffer();
		this._loc = {
			position: gl.getAttribLocation(program, "a_position"),
			uv: gl.getAttribLocation(program, "a_uv"),
			color: gl.getAttribLocation(program, "a_color"),
			resolution: gl.getUniformLocation(program, "u_resolution"),
			texture: gl.getUniformLocation(program, "u_texture")
		};
		return true;
	}
}

function vertex (d: Float32Array, o: number, x: number, y: number, u: number, v: number, q: IgeUiQuad): number {
	d[o] = x;
	d[o + 1] = y;
	d[o + 2] = u;
	d[o + 3] = v;
	d[o + 4] = q.r;
	d[o + 5] = q.g;
	d[o + 6] = q.b;
	d[o + 7] = q.a;
	return o + FLOATS;
}

function compile (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
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
function bindNoVertexArray (gl: WebGLRenderingContext | WebGL2RenderingContext): void {
	if ("bindVertexArray" in gl) (gl as WebGL2RenderingContext).bindVertexArray(null);
	else gl.getExtension("OES_vertex_array_object")?.bindVertexArrayOES(null);
}
