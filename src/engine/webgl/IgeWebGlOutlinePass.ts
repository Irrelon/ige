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
 * Nothing outlined, nothing done: the target is made on first use. On the
 * GPU device (an RGBA8 colour texture; the line drawn by a pipeline of the
 * device's, its shader GLSL ES 1.00). After a lost context the renderer
 * forgets this pass (contextLost) and a new one is made.
 */
import type { IgeGpuBuffer, IgeGpuRenderPipeline, IgeGpuTexture } from "@/engine/gpu/IgeGpuDevice";
import { type IgeWebGl2GpuDevice, webGl2Framebuffer, webGl2Surface } from "@/engine/gpu/IgeWebGl2GpuDevice";


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

/** The outline pass's uniform block: the mask's size, the rectangle drawn in, the line's colour and width. */
const OUTLINE_UNIFORMS = [
	{ name: "u_size", type: "vec2" as const },
	{ name: "u_rect", type: "vec4" as const },
	{ name: "u_color", type: "vec4" as const },
	{ name: "u_radius", type: "f32" as const }
];

export class IgeWebGlOutlinePass {
	_device: IgeWebGl2GpuDevice;
	_texture: IgeGpuTexture | null = null;
	_buffer: IgeGpuBuffer | null = null;
	_width = 0;
	_height = 0;
	_pipelines = new Map<number, IgeGpuRenderPipeline>();
	_block = new Float32Array(11);

	constructor (device: IgeWebGl2GpuDevice) {
		this._device = device;
	}

	/**
	 * Binds the mask target (made, or remade at `width` × `height`, the
	 * drawing buffer's size) with the scissor on `rect`, cleared there.
	 * The caller then draws the outlined items flat (alpha 1) in the same
	 * viewport it draws the frame in, with GL of its own. False if no target
	 * could be made. `clear` is the clear colour to leave set after (the
	 * renderer's: never read back from GL, a query that waits for the GPU).
	 */
	beginMask (width: number, height: number, rect: IgeOutlineRect, clear: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 }): boolean {
		if (!this._target(width, height)) return false;
		const d = this._device, gl = d.gl;
		d.invalidate();
		const pass = d.beginRenderPass({ color: { target: this._texture! } });
		pass.clear([0, 0, 0, 0], [rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0]);
		pass.end();
		d.release();
		// (GL as the caller draws: the mask bound, scissored to the rectangle, its clear colour put back)
		gl.bindFramebuffer(gl.FRAMEBUFFER, webGl2Framebuffer(d, this._texture!));
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
		gl.clearColor(clear.r, clear.g, clear.b, clear.a);
		return true;
	}

	/**
	 * Draws the outline round the mask into `target` (the frame's
	 * framebuffer: null for the canvas), inside `rect` only, in `color`
	 * (0 to 1, alpha blended), `radius` device pixels wide. Leaves GL as the
	 * caller's GL code expects it after: the target bound, scissored to
	 * `rect`, blended, no depth test.
	 */
	composite (target: WebGLFramebuffer | null, rect: IgeOutlineRect, color: { r: number; g: number; b: number; a: number }, radius: number): void {
		const d = this._device, gl = d.gl;
		const r = Math.max(1, Math.min(OUTLINE_MAX_RADIUS, Math.round(radius)));
		d.invalidate();
		const surface = target === null ? d.surface() : webGl2Surface(d, target, this._width, this._height);
		const pass = d.beginRenderPass({ color: { target: surface } });
		const pipeline = this._pipeline(r);
		const b = this._block, at = pipeline.uniformOffsets;
		b[at.u_size] = this._width;
		b[at.u_size + 1] = this._height;
		b[at.u_rect] = rect.x0;
		b[at.u_rect + 1] = rect.y0;
		b[at.u_rect + 2] = rect.x1;
		b[at.u_rect + 3] = rect.y1;
		b[at.u_color] = color.r;
		b[at.u_color + 1] = color.g;
		b[at.u_color + 2] = color.b;
		b[at.u_color + 3] = color.a;
		b[at.u_radius] = r;
		pass.setViewport(0, 0, this._width, this._height);
		pass.setScissorRect([rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0]);
		pass.setPipeline(pipeline);
		pass.setVertexBuffer(0, this._buffer!);
		pass.setTexture(0, this._texture);
		pass.setUniforms(b);
		pass.draw(3);
		pass.end();
		d.release();
		// (The scissor on as the old pass left it: its rectangle's still set)
		gl.enable(gl.SCISSOR_TEST);
	}

	/** The context was lost: its resources are forgotten (made again on the device as it's next used). */
	contextLost (): void {
		this._texture = null;
		this._buffer = null;
		this._width = this._height = 0;
		this._pipelines.clear();
	}

	/** Frees what it made. */
	destroy (): void {
		if (this._texture) this._device.destroyTexture(this._texture);
		if (this._buffer) this._device.destroyBuffer(this._buffer);
		this.contextLost();
	}

	_target (width: number, height: number): boolean {
		const d = this._device;
		if (this._texture && this._width === width && this._height === height) return true;
		if (width <= 0 || height <= 0) return false;
		d.invalidate();
		const sampler = { minFilter: "nearest", magFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" } as const;
		if (!this._texture) this._texture = d.createTexture({ width, height, format: "rgba8unorm", sampler, label: "outline mask" });
		else d.resizeTexture(this._texture, width, height);
		this._width = width;
		this._height = height;
		if (!this._buffer) {
			// One triangle over the whole target (the scissor keeps it to the outline's rectangle)
			const tri = new Float32Array([-1, -1, 3, -1, -1, 3]);
			this._buffer = d.createBuffer({ size: tri.byteLength, usage: "vertex", label: "outline triangle" });
			d.writeBuffer(this._buffer, 0, tri);
		}
		return true;
	}

	/** The line's pipeline for a width (its shader searches exactly that far): blended over, no depth test. */
	_pipeline (radius: number): IgeGpuRenderPipeline {
		let p = this._pipelines.get(radius);
		if (p) return p;
		const d = this._device;
		const module = d.createShaderModule({ vertex: VERTEX, fragment: outlineFragment(radius), attributes: { a_position: 0 }, label: `outline ${radius}` });
		p = d.createRenderPipeline({
			module,
			vertex: { buffers: [{ arrayStride: 8, attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }] }] },
			primitive: { topology: "triangle-list", cullMode: "none" },
			blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" } },
			uniforms: OUTLINE_UNIFORMS,
			textures: [{ name: "u_mask" }],
			label: `outline ${radius}`
		});
		this._pipelines.set(radius, p);
		return p;
	}
}
