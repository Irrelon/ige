/**
 * A canvas drawn at a fixed size in its own units (`width` x `height`: a star
 * chart's 900 x 700) but shown at whatever size its box and the UI's scale
 * give it. With `data-resolution="auto"` the engine makes its surface at the
 * device pixels it's shown at instead, and scales drawing in its own units
 * onto it (each getContext("2d")), so its lines and text are sharp at any
 * size and UI scale, neither blown up from a small picture nor shrunk from a
 * big one. Drawing code keeps its units: `width`, `height` and coordinates
 * are as written.
 */
import type { IgeUiElement } from "./IgeUiDom";

/** The surface's pixels per canvas unit for a canvas shown now (1 without `data-resolution="auto"`), in eighths, 0.5 to 4. */
export function igeUiCanvasSurfaceScale (el: IgeUiElement): number {
	if (el.getAttribute("data-resolution") !== "auto") return 1;
	const w = el.width, h = el.height;
	const cw = el.clientWidth, ch = el.clientHeight;
	if (!(w > 0 && h > 0 && cw > 0 && ch > 0)) return 1;
	// Shown at the box's size, or kept to its shape inside it (object-fit: contain)
	const fit = (el as unknown as { _computed?: Record<string, string> })._computed?.["object-fit"];
	const shown = fit === "contain" || fit === "scale-down" ? Math.min(cw / w, ch / h) : cw / w;
	const device = shown * (el.ownerDocument._zoom || 1) * (el.ownerDocument.host?.host?.display.dpr() || 1);
	return Math.max(0.5, Math.min(4, Math.ceil(device * 8) / 8));
}
