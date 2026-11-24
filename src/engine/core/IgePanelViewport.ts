import { IgeCamera } from "@/engine/core/IgeCamera";
import type { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { markSceneChanged } from "@/engine/utils/sceneChange";
import type { IgeGpuDevice } from "@/engine/gpu/IgeGpuDevice";
import type { IgeWebGlFogSettings } from "@/engine/core/IgeWebGlRenderer";
import { IGE_PANEL_DEFAULT_SAMPLES, type IgePanelSource } from "@/engine/webgl/IgePanelTarget";
import type { IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { IgeWebGlLightManager } from "@/engine/webgl/IgeWebGlLightManager";

/** A length in CSS pixels (a number) or a fraction of the canvas ("25%": its width for left, right and width, its height for top, bottom and height). */
export type IgePanelLength = number | `${number}%`;

/**
 * Where a panel sits over the canvas. Give left or right, top or bottom, and a width and height (or a width and an
 * aspect, width over height). Anything left out: a missing left and right puts the panel at left 0, a missing top
 * and bottom at top 0.
 */
export interface IgePanelLayout {
	left?: IgePanelLength;
	top?: IgePanelLength;
	right?: IgePanelLength;
	bottom?: IgePanelLength;
	width?: IgePanelLength;
	height?: IgePanelLength;
	/** Width over height, used for whichever of width and height is missing. */
	aspect?: number;
}

/** What capture() hands over: the panel's picture in device pixels, RGBA bytes, the top row first. */
export interface IgePanelPicture {
	width: number;
	height: number;
	pixels: Uint8ClampedArray;
}

/** A panel's rectangle in CSS pixels, measured from the canvas's top-left. */
export interface IgePanelRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** What an effect is told when it's called: the panel's rectangle in device pixels, measured from the canvas's bottom-left (GL's origin). */
export interface IgePanelFrame {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * An effect over a panel: the hook for a "recorder look" (blur, colour shift, warp, grain, scanlines). The panel is
 * drawn into a target of its own; each frame it was drawn, after its pass and before the UI overlays, the renderer
 * calls apply() with the device, the panel's rectangle on the canvas and the panel's pixels (`source.color`, and
 * `source.depth` when `depth` is true). The effect draws the composite itself: begin a pass on device.surface(),
 * set its viewport and scissor to `frame`, and draw the panel's pixels (a full-screen triangle, with
 * IGE_PANEL_FULLSCREEN_VERT as its vertex shader: `v_uv` runs 0 to 1 over the panel) with whatever it does to them.
 * Nothing outside the rectangle may be touched. With no effect set the renderer copies the panel as it is.
 */
export interface IgePanelEffect {
	/** The panel's depth is wanted in `source.depth` (resolved after the pass; it costs a resolve, so off by default). */
	depth?: boolean;
	/** The effect wants a history frame kept (`source.history`): the panel makes one more texture of its size for it, and only then. */
	history?(): boolean;
	/**
	 * Asked before the panel is drawn each frame: if the history must hold the picture of another moment (a freeze at
	 * the moment the picture was last good), the renderer calls `renderAt(draw)`, which sets the scene to that moment,
	 * runs `draw()` (which draws the panel and copies it into the history) and sets the scene back, then stores `key`
	 * as `source.historyKey`. Null when the history is right.
	 */
	historyRequest?(source: IgePanelSource): { time: number; key: number; renderAt: (draw: () => void) => void } | null;
	apply(device: IgeGpuDevice, frame: IgePanelFrame, source: IgePanelSource): void;
}

const resolve = (value: IgePanelLength | undefined, whole: number): number | undefined => {
	if (value === undefined) return undefined;
	if (typeof value === "number") return value;
	return (parseFloat(value) / 100) * whole;
};

/**
 * The rectangle a layout makes on a canvas of the given CSS size. Never negative or bigger than the canvas.
 */
export function igePanelRect (layout: IgePanelLayout, canvasWidth: number, canvasHeight: number): IgePanelRect {
	let width = resolve(layout.width, canvasWidth);
	let height = resolve(layout.height, canvasHeight);
	const left = resolve(layout.left, canvasWidth);
	const right = resolve(layout.right, canvasWidth);
	const top = resolve(layout.top, canvasHeight);
	const bottom = resolve(layout.bottom, canvasHeight);

	if (width === undefined && left !== undefined && right !== undefined) width = canvasWidth - left - right;
	if (height === undefined && top !== undefined && bottom !== undefined) height = canvasHeight - top - bottom;
	if (width === undefined && height !== undefined && layout.aspect) width = height * layout.aspect;
	if (height === undefined && width !== undefined && layout.aspect) height = width / layout.aspect;
	width = Math.min(Math.max(width ?? canvasWidth, 0), canvasWidth);
	height = Math.min(Math.max(height ?? canvasHeight, 0), canvasHeight);

	const x = left !== undefined ? left : right !== undefined ? canvasWidth - right - width : 0;
	const y = top !== undefined ? top : bottom !== undefined ? canvasHeight - bottom - height : 0;
	return { x: Math.min(Math.max(x, 0), canvasWidth - width), y: Math.min(Math.max(y, 0), canvasHeight - height), width, height };
}

let panelCount = 0;

/**
 * A picture-in-picture view: a rectangle over the canvas that draws a scene of its own, from a camera of its own,
 * with lights and shadows of its own. Nothing in it is lit, shadowed or culled by the main view, and the main view
 * is drawn exactly as it would be without it, post-processing included. See guides/panel-viewport.md.
 *
 *     const panel = new IgePanelViewport({ right: 16, bottom: 16, width: "30%", aspect: 16 / 9 });
 *     panel.scene(playbackScene);
 *     panel.camera.translateTo(0, 80, 300);
 *     panel.camera.lookAtPoint(new IgePoint3d(0, 0, 0));
 *     renderer.addPanel(panel);
 *     panel.show();
 */
export class IgePanelViewport {
	classId = "IgePanelViewport";
	/** Lights of this panel's scene (the main view's lights don't reach it): panel.lights.addLight(light). */
	readonly lights = new IgeWebGlLightManager();
	/** Set to composite the panel through an effect that reads its pixels (see IgePanelEffect); none: a plain copy. */
	effect: IgePanelEffect | null = null;
	/** The id of this panel's shadow map. */
	readonly shadowId = `panel${++panelCount}`;
	/** The viewport the renderer draws with; not mounted to the engine, so nothing else sees it. */
	readonly viewport: IgeViewport;
	/** @internal The renderer the panel was added to. */
	_renderer?: { shadowManager?: { createShadowMap(id: string, config: any): boolean; deleteShadowMap(id: string): void } };
	/** @internal */
	_shadowLight?: IgeDirectionalLight;
	/** @internal Pictures asked for with capture(), handed over by the renderer after the next frame the panel is drawn. */
	_captures: ((picture: IgePanelPicture) => void)[] = [];
	/** @internal The panel isn't composited onto the canvas (it's drawn for capture() alone). */
	_silent = false;
	protected _visible = false;
	protected _samples = IGE_PANEL_DEFAULT_SAMPLES;
	protected _fog: IgeWebGlFogSettings | null = null;
	protected _layout: IgePanelLayout;
	protected _cameras = new Map<string, IgeCamera>();
	protected _rect: IgePanelRect = { x: 0, y: 0, width: 0, height: 0 };

	constructor (layout: IgePanelLayout = { right: 16, bottom: 16, width: "30%", aspect: 16 / 9 }) {
		this._layout = layout;
		this.viewport = new IgeViewport();
		this.viewport.autoSize(false);
		this._cameras.set("main", this.viewport.camera);
	}

	/** The scene the panel draws (its own scene graph; mount things to it, not to the main view's scene). */
	scene (scene: IgeScene2d): this;
	scene (): IgeScene2d | undefined;
	scene (scene?: IgeScene2d): this | IgeScene2d | undefined {
		if (scene === undefined) return this.viewport._scene;
		this.viewport._scene = scene;
		scene._parent = this.viewport;
		markSceneChanged();
		return this;
	}

	/** The camera the panel draws with now (a fixed one: nothing moves it unless the game does). */
	get camera (): IgeCamera {
		return this.viewport.camera;
	}

	/** Make another camera for the panel (named, for cut()). Set it up like any camera: translateTo(), lookAt(), fov(), projectionType(). */
	newCamera (name: string): IgeCamera {
		const camera = new IgeCamera(this.viewport);
		this._cameras.set(name, camera);
		return camera;
	}

	/** A camera made with newCamera() ("main" is the panel's first one). */
	getCamera (name: string): IgeCamera | undefined {
		return this._cameras.get(name);
	}

	/** Cut to another camera, by name or the camera itself: the next frame draws from it. Nothing else happens, so it's free. */
	cut (camera: string | IgeCamera): this {
		const next = typeof camera === "string" ? this._cameras.get(camera) : camera;
		if (!next) throw new Error(`Panel has no camera called "${String(camera)}"`);
		if (next !== this.viewport.camera) {
			this.viewport.camera = next;
			markSceneChanged();
		}
		return this;
	}

	/**
	 * Gets / sets the multisampling of the panel's own target: samples per pixel, 4 by default, capped to what the
	 * GPU allows; 0 or 1 means none. Changing it makes the target again on the next frame the panel is drawn.
	 */
	get samples (): number {
		return this._samples;
	}

	set samples (val: number) {
		const n = Math.max(0, Math.floor(val) || 0);
		if (n === this._samples) return;
		this._samples = n;
		markSceneChanged();
	}

	/**
	 * Hands over the panel's finished picture the next time it's drawn: its colour as RGBA bytes, top row first, one pixel
	 * to a device pixel (the panel's rectangle at the canvas's pixel ratio). Once; the panel is read back from its own
	 * offscreen target, so nothing else on the canvas is in it. `silent`: the panel isn't drawn onto the canvas that frame
	 * (a still made out of sight: show() it, capture(), hide() it from the callback). Show the panel for this: a hidden
	 * panel isn't drawn, so nothing is handed over.
	 */
	capture (callback: (picture: IgePanelPicture) => void, silent = false): this {
		this._captures.push(callback);
		if (silent) this._silent = true;
		markSceneChanged();
		return this;
	}

	/** Draw the panel from the next frame. */
	show (): this {
		return this.visible(true);
	}

	/** Stop drawing it. A hidden panel costs nothing: its scene isn't updated, collected or drawn. */
	hide (): this {
		return this.visible(false);
	}

	visible (): boolean;
	visible (val: boolean): this;
	visible (val?: boolean): boolean | this {
		if (val === undefined) return this._visible;
		if (val !== this._visible) {
			this._visible = val;
			markSceneChanged();
		}
		return this;
	}

	/**
	 * Gets / sets the panel's own distance fog (the same settings as the renderer's fog()), used for its pass in
	 * place of the renderer's. A panel with none draws with no fog (the main view's doesn't reach it); `fog(null)`
	 * clears it.
	 */
	fog (): IgeWebGlFogSettings | null;
	fog (settings: Partial<IgeWebGlFogSettings> | null): this;
	fog (settings?: Partial<IgeWebGlFogSettings> | null): IgeWebGlFogSettings | null | this {
		if (settings === undefined) return this._fog && { ...this._fog, color: { ...this._fog.color } };
		if (settings === null) {
			this._fog = null;
		} else {
			const base = this._fog ?? { mode: "none", color: { r: 0, g: 0, b: 0 }, near: 500, far: 2000, density: 0.001 };
			this._fog = { ...base, ...settings, color: { ...base.color, ...(settings.color || {}) } };
		}
		markSceneChanged();
		return this;
	}

	/** Where the panel sits (CSS pixels, or "25%" of the canvas); it follows canvas resizes by itself. */
	layout (): IgePanelLayout;
	layout (layout: IgePanelLayout): this;
	layout (layout?: IgePanelLayout): IgePanelLayout | this {
		if (layout === undefined) return this._layout;
		this._layout = layout;
		markSceneChanged();
		return this;
	}

	/** The panel's rectangle on a canvas of this CSS size (also what the renderer draws into, as of the last frame). */
	rect (canvasWidth?: number, canvasHeight?: number): IgePanelRect {
		if (canvasWidth !== undefined && canvasHeight !== undefined) {
			this._rect = igePanelRect(this._layout, canvasWidth, canvasHeight);
		}
		return this._rect;
	}

	/**
	 * Give the panel's directional light a shadow map of its own (the renderer must have it added). The panel's
	 * shadows are separate from the main view's: it has no point light shadows.
	 */
	enableShadows (light: IgeDirectionalLight, shadowMapSize: number = 1024): boolean {
		const manager = this._renderer?.shadowManager;
		if (!manager) return false;
		const ok = manager.createShadowMap(this.shadowId, { size: shadowMapSize, bias: light.shadowBias() as number, normalBias: 0 });
		if (ok) {
			this._shadowLight = light;
			light.castShadow(true);
		}
		return ok;
	}

	disableShadows (): void {
		this._renderer?.shadowManager?.deleteShadowMap(this.shadowId);
		this._shadowLight?.castShadow(false);
		this._shadowLight = undefined;
	}

	/**
	 * @internal Called by the renderer each frame the panel's drawn, before its scene is collected: places the
	 * viewport on the canvas and advances the camera and the scene.
	 */
	_prepare (canvasWidth: number, canvasHeight: number, tickDelta: number): boolean {
		const r = this.rect(canvasWidth, canvasHeight);
		const vp = this.viewport;
		const scene = vp._scene;
		if (r.width < 1 || r.height < 1 || !scene) return false;
		vp._translate.x = r.x;
		// Viewports measure y from the canvas bottom
		vp._translate.y = canvasHeight - r.y - r.height;
		vp._bounds2d.x = r.width;
		vp._bounds2d.y = r.height;
		vp.camera.update();
		scene._parent = vp;
		scene.update(tickDelta);
		return true;
	}
}
