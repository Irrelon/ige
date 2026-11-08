import type { IgeBaseRenderer } from "@/engine/core/IgeBaseRenderer";
import { IgeCanvas2dRenderer } from "@/engine/core/IgeCanvas2dRenderer";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";

/**
 * What a game draws:
 * - "2d": sprites, smart textures and text laid out like Canvas 2D (y down,
 *   pixels); on WebGL, viewports default to the "screen2d" camera so the
 *   scene looks the same as on Canvas 2D.
 * - "iso": isometric Canvas 2D scenes (ground on x/y, z up). These don't carry
 *   over to WebGL, so they always get IgeCanvas2dRenderer.
 * - "3d": models and 3D scenes; needs WebGL.
 */
export type IgeRendererMode = "2d" | "iso" | "3d";

export interface IgeCreateRendererOptions {
	/** Default "2d". */
	mode?: IgeRendererMode;
	/** Force a renderer instead of choosing by browser support. */
	prefer?: "webgl" | "canvas2d";
}

let webGlSupport: boolean | undefined;

/** Whether the browser can create a WebGL context (checked once). */
export function igeWebGlAvailable (): boolean {
	if (webGlSupport !== undefined) return webGlSupport;
	try {
		const canvas = typeof document !== "undefined" ? document.createElement("canvas") : undefined;
		webGlSupport = !!canvas && !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
	} catch {
		webGlSupport = false;
	}
	return webGlSupport;
}

/**
 * Create the renderer a game should use: IgeWebGlRenderer when the browser
 * supports WebGL, else IgeCanvas2dRenderer. Assign it with
 * ige.engine.renderer(renderer); ige.engine.start() does all of this itself
 * when no renderer has been assigned.
 * @example #A 2D game that runs on WebGL where it can
 *     ige.engine.renderer(igeCreateRenderer({ mode: "2d" }));
 *     await ige.engine.start();
 */
export function igeCreateRenderer (options: IgeCreateRendererOptions = {}): IgeBaseRenderer {
	const mode = options.mode ?? "2d";
	const useWebGl = mode !== "iso" && options.prefer !== "canvas2d" && (options.prefer === "webgl" || igeWebGlAvailable());

	if (!useWebGl) {
		if (mode === "3d") console.warn("igeCreateRenderer: WebGL isn't available, so 3D content won't draw (falling back to Canvas 2D)");
		return new IgeCanvas2dRenderer();
	}

	const renderer = new IgeWebGlRenderer();
	if (mode === "2d") renderer.defaultCameraPreset("screen2d");
	return renderer;
}
