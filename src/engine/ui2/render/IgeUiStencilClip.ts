/**
 * Clips of any shape for the UI renderer, by the stencil: a clip's shape (its
 * triangles) marked in the stencil buffer as it opens, what's drawn after it
 * kept to where the stencil says, and the mark taken back as it closes, so
 * clips nest (a clip inside a clip keeps to both). The painter's own clips
 * are rectangles; this is for the rest: a 2D canvas's clip() to a circle (the
 * radar, the minimap), a polygon.
 *
 * Its own small pipelines draw the triangles into the stencil only (no
 * colour), so a shape's edge is its triangles' edge: sharp, not smoothed.
 * Only the screen's target has a stencil: in an offscreen layer nothing's
 * clipped (the renderer draws there without the stencil test).
 */
import type { IgeCssMatrix } from "@/engine/ui2/css/IgeCssValues";
import type { IgeGpuBuffer, IgeGpuDevice, IgeGpuRenderPass, IgeGpuRenderPipeline, IgeGpuShaderModule } from "@/engine/gpu/IgeGpuDevice";

const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
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
	_device: IgeGpuDevice | null = null;
	_module: IgeGpuShaderModule | null = null;
	/** Marking a clip's shape (the stencil one more inside it) and taking it back (one less). */
	_open: IgeGpuRenderPipeline | null = null;
	_close: IgeGpuRenderPipeline | null = null;
	_buffer: IgeGpuBuffer | null = null;
	/** How many clips are open (the stencil value inside them all). */
	depth = 0;

	_init (device: IgeGpuDevice): void {
		if (this._device === device && this._module) return;
		this._device = device;
		this._module = device.createShaderModule({ vertex: VERT, fragment: FRAG, label: "ui2 stencil clip" });
		// (Its triangles into the stencil only, no colour: where it's inside every clip open now (a clip in a clip keeping
		// to both), once each where its triangles overlap: a marked pixel no longer passes)
		const pipeline = (passOp: "increment-clamp" | "decrement-clamp") => device.createRenderPipeline({
			module: this._module!,
			vertex: { buffers: [{ arrayStride: 8, attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }] }] },
			primitive: { topology: "triangle-list" },
			writeColor: false,
			stencil: { compare: "equal", passOp, readMask: 0xff, writeMask: 0xff },
			label: `ui2 stencil ${passOp}`
		});
		this._open = pipeline("increment-clamp");
		this._close = pipeline("decrement-clamp");
		this._buffer = device.createBuffer({ size: 0, usage: "vertex", stream: true, label: "ui2 stencil triangles" });
	}

	/** A frame's start: no clip open. */
	begin (): void {
		this.depth = 0;
	}

	/**
	 * A clip opens (its shape marked: the stencil one more inside it, where it was inside all the open ones) or closes
	 * (taken back), in `pass` (the screen's target, which has the stencil). What's drawn next keeps to the clips open
	 * then: the renderer's own pipelines test the stencil against `depth` while it's above 0. `scale` and `offset` take
	 * the UI's px to the target's device px, as the renderer's own shader does.
	 */
	apply (device: IgeGpuDevice, pass: IgeGpuRenderPass, step: IgeUiStencilStep, width: number, height: number, scale: number, offset: [number, number]): void {
		this._init(device);
		// (The first clip open: the stencil cleared, whatever was drawn before the UI left there)
		if (step.open && this.depth === 0) pass.clearStencil(0);
		const t = step.tris;
		const data = new Float32Array(t.length);
		for (let i = 0; i + 1 < t.length; i += 2) {
			data[i] = ((t[i] * scale + offset[0]) / width) * 2 - 1;
			data[i + 1] = 1 - ((t[i + 1] * scale + offset[1]) / height) * 2;
		}
		device.writeBuffer(this._buffer!, 0, data);
		pass.setPipeline(step.open ? this._open! : this._close!);
		pass.setVertexBuffer(0, this._buffer!);
		pass.setStencilReference(this.depth);
		pass.draw(t.length / 2);
		this.depth = Math.max(0, this.depth + (step.open ? 1 : -1));
	}

	/** A frame's end: none open (the device turns the stencil test off as it's handed back). */
	end (): void {
		this.depth = 0;
	}

	destroy (): void {
		const d = this._device;
		if (!d) return;
		if (this._module) d.destroyShaderModule(this._module);
		if (this._buffer) d.destroyBuffer(this._buffer);
		this._module = this._open = this._close = null;
		this._buffer = null;
		this._device = null;
	}
}
