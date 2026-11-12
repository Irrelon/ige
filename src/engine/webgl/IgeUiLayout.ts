/**
 * Where UI layer elements go on screen (IgeWebGlRenderer's last pass:
 * see IgeEntity.uiLayer() and guides/ui-layer.md). Pure maths, no GL: an
 * element's settings, its world matrix and size and a viewport's camera
 * in; a rectangle in the viewport's CSS pixels (top-left origin, y down)
 * out, or nothing when it's off screen or behind the camera.
 */

/** Where a UI element sits: over a point in the world, or at a place on the screen. */
export type IgeUiSpace = "world" | "screen";

/**
 * A screen-space element's place in its viewport, in CSS pixels, as the old
 * 2D UI placed things: `left` / `right` from those edges, `top` / `bottom`
 * likewise, `center` / `middle` from the middle (+ is right / down). Unset
 * on an axis: centred.
 */
export interface IgeUiPlacement {
	left?: number;
	right?: number;
	center?: number;
	top?: number;
	bottom?: number;
	middle?: number;
}

export interface IgeUiSettings extends IgeUiPlacement {
	/** Drawn in order of layer (lower first, so higher on top). */
	layer: number;
	space: IgeUiSpace;
	/** World: its height on screen in CSS pixels at any distance and zoom (unset: its world size, as the camera sees it). */
	screenSize?: number;
	/** World, at its world size: never shorter on screen than this many CSS pixels (a far target's bracket). */
	minScreenSize?: number;
	/** World: CSS pixels to move it on screen from its point (x right, y down). */
	offsetX: number;
	offsetY: number;
}

/** A viewport's camera, as the UI layer needs it. */
export interface IgeUiView {
	/** projection × view. */
	viewProj: Float32Array;
	/** The projection's y scale times the view's (its pixels per world unit at depth 1 are this × height / 2). */
	yScale: number;
	/** The viewport's size in CSS pixels. */
	width: number;
	height: number;
}

/** An element placed for drawing. */
export interface IgeUiRect {
	x: number;
	y: number;
	width: number;
	height: number;
	/** World elements: their distance along the view (to draw the far ones first); 0 on screen. */
	depth: number;
}

/**
 * Where an element goes in a view: `sizeX` / `sizeY` are its size (its
 * bounds, in world units for a world element and pixels for a screen
 * one), scaled by its world matrix (world) or `scaleX` / `scaleY` (screen).
 */
export function placeUi (settings: IgeUiSettings, world: Float32Array, sizeX: number, sizeY: number, scaleX: number, scaleY: number, view: IgeUiView): IgeUiRect | undefined {
	if (view.width <= 0 || view.height <= 0) return;
	let rect: IgeUiRect;
	if (settings.space === "screen") {
		const w = sizeX * Math.abs(scaleX), h = sizeY * Math.abs(scaleY);
		rect = { x: along(view.width, w, settings.left, settings.right, settings.center), y: along(view.height, h, settings.top, settings.bottom, settings.middle), width: w, height: h, depth: 0 };
	} else {
		const m = view.viewProj;
		const px = world[12], py = world[13], pz = world[14];
		const cw = m[3] * px + m[7] * py + m[11] * pz + m[15];
		// Behind the camera: not drawn
		if (cw <= 1e-6) return;
		const nx = (m[0] * px + m[4] * py + m[8] * pz + m[12]) / cw;
		const ny = (m[1] * px + m[5] * py + m[9] * pz + m[13]) / cw;
		const cx = (nx * 0.5 + 0.5) * view.width + settings.offsetX;
		const cy = (0.5 - ny * 0.5) * view.height + settings.offsetY;
		let w: number, h: number;
		const aspect = sizeY > 0 ? sizeX / sizeY : 1;
		if (settings.screenSize !== undefined) {
			h = settings.screenSize;
			w = h * aspect;
		} else {
			// Its world size as the camera sees it there
			const perUnit = (view.yScale * view.height * 0.5) / cw;
			w = sizeX * Math.hypot(world[0], world[1], world[2]) * perUnit;
			h = sizeY * Math.hypot(world[4], world[5], world[6]) * perUnit;
			if (settings.minScreenSize !== undefined && h < settings.minScreenSize && h > 0) {
				w *= settings.minScreenSize / h;
				h = settings.minScreenSize;
			}
		}
		rect = { x: cx - w / 2, y: cy - h / 2, width: w, height: h, depth: cw };
	}
	// Off screen: not drawn
	if (rect.width <= 0 || rect.height <= 0 || rect.x >= view.width || rect.y >= view.height || rect.x + rect.width <= 0 || rect.y + rect.height <= 0) return;
	return rect;
}

/** One axis of a screen placement: from the near edge, the far edge, or the middle. */
function along (span: number, size: number, near?: number, far?: number, mid?: number): number {
	if (near !== undefined) return near;
	if (far !== undefined) return span - far - size;
	return (span - size) / 2 + (mid ?? 0);
}

/** What the UI pass sorts by. */
export interface IgeUiSortable {
	layer: number;
	space: IgeUiSpace;
	depth: number;
	/** The order elements were met in the scene graph. */
	order: number;
}

/**
 * The UI pass's drawing order: by layer, lowest first; within a layer world
 * elements far to near, then screen elements in scene graph order (so a
 * panel sits over the labels in its layer).
 */
export function compareUi (a: IgeUiSortable, b: IgeUiSortable): number {
	if (a.layer !== b.layer) return a.layer - b.layer;
	if (a.space !== b.space) return a.space === "world" ? -1 : 1;
	if (a.space === "world" && a.depth !== b.depth) return b.depth - a.depth;
	return a.order - b.order;
}
