/**
 * SVG gradients (`fill="url(#id)"` naming a `<linearGradient>` or
 * `<radialGradient>`, in the same SVG or another on the page) for the
 * engine's UI: read as the CSS gradients the painter already draws.
 *
 * - On a circle or a rectangle (a painter's box): the gradient itself, over
 *   the shape's bounding box (objectBoundingBox, the default units). A
 *   radial one's radius (half the box by default) is matched by scaling its
 *   stops against the box's farthest side from its centre.
 * - On a path or polygon (triangles): a linear gradient in thin bands
 *   across the way it runs (the shape drawn once per band, clipped to it),
 *   a radial one in its middle colour.
 * - On a stroke: its middle colour.
 *
 * Not read: gradientUnits="userSpaceOnUse" (taken as the bounding box),
 * gradientTransform, spreadMethod, href'd stops, a focal point.
 */
import { type IgeCssColor, type IgeCssColorStop, type IgeCssGradient, parseColor } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { gradientBands, gradientColorAt } from "@/engine/ui2/render/IgeUiTextClip";
import type { IgeUiPaintFill, IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";

/** A length in a gradient's attributes as a fraction of the box ("50%", "0.5"), or `fallback`. */
function fraction (el: IgeUiElement, name: string, fallback: number): number {
	const v = el.getAttribute(name)?.trim();
	if (!v) return fallback;
	const n = v.endsWith("%") ? parseFloat(v) / 100 : Number(v);
	return Number.isFinite(n) ? n : fallback;
}

/** A `<linearGradient>` or `<radialGradient>` as a CSS gradient over its shape's box, or undefined (no stops, or not one). */
export function svgGradient (ref: IgeUiElement, current: IgeCssColor): IgeCssGradient | undefined {
	// (Names as the parser keeps them: lower case in an HTML document)
	const name = ref.localName.toLowerCase();
	if (name !== "lineargradient" && name !== "radialgradient") return undefined;
	const stops: IgeCssColorStop[] = [];
	let last = 0;
	for (const s of ref.children) {
		if (s.localName !== "stop") continue;
		const cs = s._computed ?? {};
		const color = parseColor(cs["stop-color"] ?? s.getAttribute("stop-color") ?? "black", current) ?? { r: 0, g: 0, b: 0, a: 1 };
		const op = Number(cs["stop-opacity"] ?? s.getAttribute("stop-opacity") ?? 1);
		// (Offsets only go forward)
		last = Math.max(last, Math.min(1, Math.max(0, fraction(s, "offset", 0))));
		stops.push({ color: { ...color, a: color.a * (Number.isFinite(op) ? Math.min(1, Math.max(0, op)) : 1) }, at: last });
	}
	if (!stops.length) return undefined;
	if (stops.length === 1) stops.push({ ...stops[0] });
	if (name === "lineargradient") {
		const x1 = fraction(ref, "x1", 0), y1 = fraction(ref, "y1", 0), x2 = fraction(ref, "x2", 1), y2 = fraction(ref, "y2", 0);
		const dx = x2 - x1, dy = y2 - y1;
		// CSS's angle (0 up, clockwise); the stops along the part of the gradient line the two points cover
		const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
		const rad = (angle * Math.PI) / 180, ux = Math.sin(rad), uy = -Math.cos(rad);
		const half = (Math.abs(ux) + Math.abs(uy)) / 2;
		const t = (x: number, y: number) => ((x - 0.5) * ux + (y - 0.5) * uy) / Math.max(1e-6, 2 * half) + 0.5;
		const t1 = t(x1, y1), t2 = t(x2, y2);
		// (Its stops' colours mixed as they are, as Chrome mixes an SVG gradient's)
		return { type: "linear", angle, stops: stops.map((s) => ({ ...s, at: t1 + (s.at ?? 0) * (t2 - t1) })), unpremultiplied: true };
	}
	const cx = fraction(ref, "cx", 0.5), cy = fraction(ref, "cy", 0.5), r = fraction(ref, "r", 0.5);
	// (Over the box, r is a fraction of its width and of its height: an ellipse that wide and that tall, whatever its centre)
	return { type: "radial", shape: "ellipse", cx, cy, size: "farthest-side", radii: [r, r], stops, unpremultiplied: true };
}

/** A gradient's middle colour (a stroke's, or a radial fill on triangles). */
export function svgGradientMiddle (g: IgeCssGradient): IgeCssColor {
	return gradientColorAt(g, 0.5, 100);
}

/** A path's triangles (`fill`, its colour unset) filled with `g`: bands of a linear gradient, else its middle colour. */
export function paintGradientTriangles (items: IgeUiPaintItem[], fill: Omit<IgeUiPaintFill, "color">, g: IgeCssGradient): void {
	const t = fill.tris;
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (let i = 0; i + 1 < t.length; i += 2) {
		x0 = Math.min(x0, t[i]);
		x1 = Math.max(x1, t[i]);
		y0 = Math.min(y0, t[i + 1]);
		y1 = Math.max(y1, t[i + 1]);
	}
	if (!(x1 > x0) || !(y1 > y0)) return;
	if (g.type !== "linear") {
		items.push({ ...fill, color: svgGradientMiddle(g) } as IgeUiPaintFill);
		return;
	}
	for (const band of gradientBands(g, x0, y0, x1 - x0, y1 - y0, fill.clip)) items.push({ ...fill, color: band.color, clip: band.clip } as IgeUiPaintFill);
}
