/**
 * Each shown panel (IgePanelViewport) is drawn into an offscreen target of its own, sized to its rectangle in device
 * pixels, and then composited onto the canvas: by a plain copy, or by the panel's effect, which reads the panel's
 * colour (and depth) and draws the composite itself. This makes, resizes, frees and forgets those targets, and holds
 * the copy pass. It runs on the GPU device (IgeGpuDevice).
 */

import type { IgeGpuDevice, IgeGpuRenderPipeline, IgeGpuShaderModule, IgeGpuTexture } from "@/engine/gpu/IgeGpuDevice";

/** A vertex shader that covers the viewport with one triangle and passes `v_uv` (0 to 1 over the panel): for effects' own passes. */
export const IGE_PANEL_FULLSCREEN_VERT = `#version 300 es
out vec2 v_uv;
void main() {
	// One triangle covering the viewport
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	v_uv = p;
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COPY_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
void main() {
	o = texture(u_src, v_uv);
}`;

/** What a panel's effect reads: the panel as it was drawn, one texel to a device pixel. */
export interface IgePanelSource {
	/** The panel's colour (single-sampled, v = 0 at the bottom, sampled linearly). */
	color: IgeGpuTexture;
	/** Its depth (depth24plus-stencil8, sampled nearest), only when the effect asks for it (`depth: true`); null otherwise. */
	depth: IgeGpuTexture | null;
	width: number;
	height: number;
	/** A frame held over from earlier (an effect that asked for history, `history()` true), the panel's size; null for effects that didn't. */
	history: IgeGpuTexture | null;
	/** What the history holds, as the effect labels it (null: nothing yet). The effect and renderer set it; a new target starts at null. */
	historyKey: number | null;
	/** Copy the panel's resolved colour into the history (a texture copy). */
	captureHistory(): void;
}

/** A panel's offscreen target. */
export interface IgePanelTarget extends IgePanelSource {
	/** What the panel's pass draws into: the colour and depth-stencil (multisampled where the GPU allows; else the same textures as `color` and `depth`). */
	renderColor: IgeGpuTexture;
	renderDepth: IgeGpuTexture;
	/** Multisampled: `color` is resolved from `renderColor` after the pass. */
	multisampled: boolean;
	/** The samples per pixel it was made with (0 when single-sampled). */
	samples: number;
}

/** The default samples per pixel of a panel's target (see IgePanelViewport.samples). */
export const IGE_PANEL_DEFAULT_SAMPLES = 4;

/** The samples a panel's target is made with: what was asked for, capped to the GPU's maximum; under 2 is none (0). */
export function igePanelSamples (requested: number, max: number): number {
	const n = Math.min(Math.floor(requested) || 0, Math.floor(max) || 0);
	return n >= 2 ? n : 0;
}

export class IgePanelTargets {
	protected _targets = new Map<object, IgePanelTarget>();
	protected _module: IgeGpuShaderModule | null = null;
	protected _copy: IgeGpuRenderPipeline | null = null;
	protected _device: IgeGpuDevice;

	constructor (device: IgeGpuDevice) {
		this._device = device;
	}

	/** How many panels have a target now. */
	get count (): number {
		return this._targets.size;
	}

	/** The panel's target, if it has one. */
	get (panel: object): IgePanelTarget | undefined {
		return this._targets.get(panel);
	}

	/**
	 * The panel's target at this size in device pixels: made the first time, made again when the size changes, kept
	 * otherwise. `wantDepth`: its depth readable too (resolved after the pass). `samples`: the multisampling asked
	 * for, capped to what the GPU allows (under 2 means none); it's made again when this changes. `wantHistory`: a
	 * history texture of the panel's size too (see IgePanelSource.history), freed again when it's no longer wanted.
	 */
	ensure (panel: object, width: number, height: number, wantDepth: boolean, samples: number = IGE_PANEL_DEFAULT_SAMPLES, wantHistory: boolean = false): IgePanelTarget {
		const d = this._device;
		const effective = igePanelSamples(samples, d.limits.maxSamples);
		let t = this._targets.get(panel);
		if (t && (t.width !== width || t.height !== height || t.samples !== effective)) {
			this._destroy(t);
			t = undefined;
		}
		if (!t) {
			const multisampled = effective >= 2;
			const samples = effective;
			const linear = { minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" } as const;
			const nearest = { minFilter: "nearest", magFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" } as const;
			const color = d.createTexture({ width, height, format: "rgba8unorm", sampler: linear, memory: "renderTargets", label: "panel" });
			const renderColor = multisampled ? d.createTexture({ width, height, format: "rgba8unorm", sampleCount: samples, sampler: linear, label: "panel frame" }) : color;
			const renderDepth = d.createTexture({ width, height, format: "depth24plus-stencil8", sampleCount: multisampled ? samples : undefined, sampler: nearest, label: "panel depth" });
			const made: IgePanelTarget = {
				color, depth: null, width, height, renderColor, renderDepth, multisampled, samples: multisampled ? samples : 0,
				history: null, historyKey: null,
				captureHistory: () => {
					if (made.history) d.copyTextureToTexture(made.color, made.history);
				}
			};
			t = made;
			this._targets.set(panel, t);
		}
		// The history frame: made when an effect wants it, freed when none does
		if (wantHistory && !t.history) {
			t.history = d.createTexture({ width, height, format: "rgba8unorm", sampler: { minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" }, memory: "renderTargets", label: "panel history" });
			t.historyKey = null;
		} else if (!wantHistory && t.history) {
			d.destroyTexture(t.history);
			t.history = null;
			t.historyKey = null;
		}
		if (wantDepth && !t.depth) {
			// Single-sampled: the depth drawn is already readable
			t.depth = t.multisampled ? d.createTexture({ width, height, format: "depth24plus-stencil8", sampler: { minFilter: "nearest", magFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" }, label: "panel depth resolved" }) : t.renderDepth;
		} else if (!wantDepth && t.depth) {
			if (t.depth !== t.renderDepth) d.destroyTexture(t.depth);
			t.depth = null;
		}
		return t;
	}

	/** After the panel's pass: resolve the multisampled colour (and depth, if it's wanted) into the textures effects read. */
	resolve (t: IgePanelTarget): void {
		if (!t.multisampled) return;
		this._device.resolveTexture(t.renderColor, t.color);
		if (t.depth) this._device.resolveTexture(t.renderDepth, t.depth);
	}

	/** The plain composite: the panel's pixels copied onto the surface at the rectangle (device px from the bottom-left), replacing what's there. */
	copy (t: IgePanelSource, rect: { x: number; y: number; width: number; height: number }): void {
		const d = this._device;
		if (!this._copy) {
			this._module = d.createShaderModule({ vertex: IGE_PANEL_FULLSCREEN_VERT, fragment: COPY_FRAG, label: "panel copy" });
			this._copy = d.createRenderPipeline({ module: this._module, vertex: { buffers: [] }, primitive: { topology: "triangle-list" }, textures: [{ name: "u_src" }], label: "panel copy" });
		}
		const pass = d.beginRenderPass({ color: { target: d.surface() } });
		pass.setViewport(rect.x, rect.y, rect.width, rect.height);
		pass.setScissorRect([rect.x, rect.y, rect.width, rect.height]);
		pass.setPipeline(this._copy);
		pass.setTexture(0, t.color);
		pass.draw(3);
		pass.end();
	}

	/** Free the panel's target (it was removed). */
	free (panel: object): void {
		const t = this._targets.get(panel);
		if (!t) return;
		this._destroy(t);
		this._targets.delete(panel);
	}

	/** Free everything (the renderer's gone). */
	dispose (): void {
		for (const t of this._targets.values()) this._destroy(t);
		this._targets.clear();
		if (this._module) this._device.destroyShaderModule(this._module);
		this._module = this._copy = null;
	}

	/** Forget everything without deleting it (the context was lost): the next frame makes what it needs. */
	contextLost (): void {
		this._targets.clear();
		this._module = this._copy = null;
	}

	protected _destroy (t: IgePanelTarget): void {
		const d = this._device;
		const all = new Set<IgeGpuTexture>([t.color, t.renderColor, t.renderDepth]);
		if (t.depth) all.add(t.depth);
		if (t.history) all.add(t.history);
		for (const tex of all) d.destroyTexture(tex);
	}
}
