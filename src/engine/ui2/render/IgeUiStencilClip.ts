/**
 * Clips of any shape for the UI renderer, by the stencil: a clip's shape (its
 * triangles) marked in the stencil buffer as it opens, what's drawn after it
 * kept to where the stencil says, and the mark taken back as it closes, so
 * clips nest (a clip inside a clip keeps to both). The painter's own clips
 * are rectangles; this is for the rest: a 2D canvas's clip() to a circle (the
 * radar, the minimap), a polygon.
 *
 * Its own small program draws the triangles into the stencil only (no
 * colour), so a shape's edge is its triangles' edge: sharp, not smoothed.
 * Where the target has no stencil buffer (an offscreen layer), everything
 * passes: nothing's clipped there.
 */
import type { IgeCssMatrix } from "@/engine/ui2/css/IgeCssValues";

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision mediump float;
out vec4 o;
void main() { o = vec4(0.0); }`;

/** A clip opening or closing, as the renderer's batch for it carries it: its triangles in the UI's px. */
export interface IgeUiStencilStep {
	open: boolean;
	tris: number[];
}

/** A clip's triangles in the UI's px: through the item's own transform (as the renderer draws its fills). */
export function stencilTriangles (tris: number[], matrix?: IgeCssMatrix): number[] {
	if (!matrix) return tris;
	const m = matrix as number[];
	const out: number[] = [];
	for (let i = 0; i + 1 < tris.length; i += 2) {
		const x = tris[i], y = tris[i + 1];
		const w = m.length > 6 ? m[6] * x + m[7] * y + m[8] : 1;
		out.push((m[0] * x + m[2] * y + m[4]) / (w || 1), (m[1] * x + m[3] * y + m[5]) / (w || 1));
	}
	return out;
}

export class IgeUiStencilClip {
	_program: WebGLProgram | null = null;
	_vao: WebGLVertexArrayObject | null = null;
	_buffer: WebGLBuffer | null = null;
	_gl: WebGL2RenderingContext | null = null;
	/** How many clips are open (the stencil value inside them all). */
	depth = 0;

	_init (gl: WebGL2RenderingContext): void {
		if (this._gl === gl && this._program) return;
		this._gl = gl;
		const shader = (type: number, src: string) => {
			const s = gl.createShader(type)!;
			gl.shaderSource(s, src);
			gl.compileShader(s);
			return s;
		};
		const p = gl.createProgram()!;
		gl.attachShader(p, shader(gl.VERTEX_SHADER, VERT));
		gl.attachShader(p, shader(gl.FRAGMENT_SHADER, FRAG));
		gl.bindAttribLocation(p, 0, "a_pos");
		gl.linkProgram(p);
		this._program = p;
		this._vao = gl.createVertexArray();
		this._buffer = gl.createBuffer();
		gl.bindVertexArray(this._vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);
	}

	/** A frame's start: no clip open. */
	begin (): void {
		this.depth = 0;
	}

	/**
	 * A clip opens (its shape marked: the stencil one more inside it, where it was inside all the open ones) or closes
	 * (taken back); what's drawn next keeps to the clips open then. `scale` and `offset` take the UI's px to the
	 * target's device px, as the renderer's own shader does. Leaves its own program bound: the caller binds its own again.
	 */
	apply (gl: WebGL2RenderingContext, step: IgeUiStencilStep, width: number, height: number, scale: number, offset: [number, number]): void {
		this._init(gl);
		gl.stencilMask(0xff);
		if (step.open && this.depth === 0) {
			// (The first clip open: the stencil cleared, whatever was drawn before the UI left there)
			gl.clearStencil(0);
			gl.clear(gl.STENCIL_BUFFER_BIT);
		}
		const t = step.tris;
		const data = new Float32Array(t.length);
		for (let i = 0; i + 1 < t.length; i += 2) {
			data[i] = ((t[i] * scale + offset[0]) / width) * 2 - 1;
			data[i + 1] = 1 - ((t[i + 1] * scale + offset[1]) / height) * 2;
		}
		gl.useProgram(this._program);
		gl.bindVertexArray(this._vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
		gl.enable(gl.STENCIL_TEST);
		gl.colorMask(false, false, false, false);
		// (Marked only where it's inside every clip open now, a clip in a clip keeping to both; once each, where its
		// triangles overlap: a marked pixel no longer passes)
		gl.stencilFunc(gl.EQUAL, this.depth, 0xff);
		gl.stencilOp(gl.KEEP, gl.KEEP, step.open ? gl.INCR : gl.DECR);
		gl.drawArrays(gl.TRIANGLES, 0, t.length / 2);
		gl.colorMask(true, true, true, true);
		this.depth = Math.max(0, this.depth + (step.open ? 1 : -1));
		// What's drawn next: inside the clips open now (or anywhere, with none)
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
		if (this.depth) gl.stencilFunc(gl.EQUAL, this.depth, 0xff);
		else gl.disable(gl.STENCIL_TEST);
	}

	/** A frame's end: the stencil test off. */
	end (gl: WebGL2RenderingContext): void {
		if (this.depth) gl.disable(gl.STENCIL_TEST);
		this.depth = 0;
	}

	destroy (): void {
		const gl = this._gl;
		if (!gl) return;
		if (this._program) gl.deleteProgram(this._program);
		if (this._buffer) gl.deleteBuffer(this._buffer);
		if (this._vao) gl.deleteVertexArray(this._vao);
		this._program = null;
	}
}
