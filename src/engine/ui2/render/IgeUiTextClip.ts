/**
 * background-clip: text on the engine's UI: an element's background shown
 * only through its text (gold lettering, a gradient down a title). Its box
 * isn't filled; its text is drawn in the background's colours instead. A
 * linear gradient is followed in thin bands across the way it runs (each
 * band the text again, clipped to the band, in the gradient's colour there),
 * which reads as smooth at title sizes; a radial or conic one, or a plain
 * colour, colours the text with its middle.
 */
import { type IgeCssColor, type IgeCssGradient, parseColor, parseGradient } from "@/engine/ui2/css/IgeCssValues";
import { splitTop } from "@/engine/ui2/css/IgeCssParser";
import { type IgeUiComputedStyle, styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";
import type { IgeUiPaintItem, IgeUiPaintText } from "@/engine/ui2/render/IgeUiPaint";

/** Whether a style shows its background through its text (background-clip: text, prefixed or not). */
export function clipsToText (s: IgeUiComputedStyle): boolean {
	return styleValue(s, "background-clip") === "text" || styleValue(s, "-webkit-background-clip") === "text";
}

/** A gradient's colour `t` (0 to 1) along its line, `length` px long (premultiplied between stops, as browsers mix). */
export function gradientColorAt (g: IgeCssGradient, t: number, length: number): IgeCssColor {
	const pos: (number | undefined)[] = g.stops.map((s) => (s.at !== undefined ? s.at : s.atPx !== undefined ? s.atPx / Math.max(1, length) : undefined));
	if (pos[0] === undefined) pos[0] = 0;
	if (pos[pos.length - 1] === undefined) pos[pos.length - 1] = 1;
	for (let i = 1; i < pos.length; i++) if (pos[i] !== undefined && pos[i]! < pos[i - 1]!) pos[i] = pos[i - 1];
	for (let i = 0; i < pos.length; i++) {
		if (pos[i] !== undefined) continue;
		let j = i;
		while (pos[j] === undefined) j++;
		const a = pos[i - 1]!, b = pos[j]!;
		for (let k = i; k < j; k++) pos[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
	}
	let k = 0;
	while (k < pos.length - 1 && pos[k + 1]! < t) k++;
	const c0 = g.stops[k].color, c1 = g.stops[Math.min(k + 1, g.stops.length - 1)].color;
	const p0 = pos[k]!, p1 = pos[Math.min(k + 1, pos.length - 1)]!;
	const f = t <= p0 ? 0 : t >= p1 ? 1 : (t - p0) / Math.max(1e-6, p1 - p0);
	const a = c0.a + (c1.a - c0.a) * f;
	if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
	const mix = (x: number, y: number) => (x * c0.a + (y * c1.a - x * c0.a) * f) / a;
	return { r: mix(c0.r, c1.r), g: mix(c0.g, c1.g), b: mix(c0.b, c1.b), a };
}

/**
 * `item` (a run of an element's text) drawn in that element's background: `style` is the element's, (x, y, w, h)
 * its box (where the background's laid out). Pushes the items in place of `item`.
 */
export function paintTextInBackground (items: IgeUiPaintItem[], item: IgeUiPaintText, style: IgeUiComputedStyle, x: number, y: number, w: number, h: number): void {
	const current = parseColor(styleValue(style, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
	const img = styleValue(style, "background-image");
	// (The top layer that's a gradient; else the background colour)
	const g = img !== "none" ? splitTop(img, ",").map((l) => parseGradient(l.trim(), current)).find((l) => !!l) : undefined;
	if (!g || g.type !== "linear" || w <= 0 || h <= 0) {
		const c = g ? gradientColorAt(g, 0.5, Math.max(w, h)) : parseColor(styleValue(style, "background-color"), current);
		if (c && c.a > 0) items.push({ ...item, color: c });
		return;
	}
	for (const band of gradientBands(g, x, y, w, h, item.clip)) items.push({ ...item, color: band.color, clip: band.clip });
}

/**
 * A linear gradient over the box (x, y, w, h) as bands across the way it mostly runs (about 3px each, at most 24),
 * each a clip rectangle (within `clip`, the outer ones open past the box's edges) and the gradient's colour at its
 * middle: what's drawn once per band, clipped, follows the gradient.
 */
export function gradientBands (g: IgeCssGradient, x: number, y: number, w: number, h: number, clip: [number, number, number, number] | null | undefined): { clip: [number, number, number, number]; color: IgeCssColor }[] {
	// Its direction (CSS's angle: 0 up, 90 right; or towards a corner) and its line's length
	let ang = ((g.angle ?? 180) * Math.PI) / 180;
	if (g.toCorner) ang = Math.atan2(g.toCorner[0] * h, -g.toCorner[1] * w);
	const dx = Math.sin(ang), dy = -Math.cos(ang);
	const length = Math.abs(w * dx) + Math.abs(h * dy);
	const cx = x + w / 2, cy = y + h / 2;
	const tAt = (px: number, py: number) => ((px - cx) * dx + (py - cy) * dy) / Math.max(1e-6, length) + 0.5;
	const down = Math.abs(dy) >= Math.abs(dx);
	const extent = down ? h : w;
	const n = Math.max(2, Math.min(24, Math.round(extent / 3)));
	const c = clip ?? [-1e6, -1e6, 1e6, 1e6];
	const out: { clip: [number, number, number, number]; color: IgeCssColor }[] = [];
	for (let i = 0; i < n; i++) {
		const a = (down ? y : x) + (extent * i) / n, b = (down ? y : x) + (extent * (i + 1)) / n;
		const lo = i === 0 ? -1e6 : a, hi = i === n - 1 ? 1e6 : b;
		const band: [number, number, number, number] = down ? [c[0], Math.max(c[1], lo), c[2], Math.min(c[3], hi)] : [Math.max(c[0], lo), c[1], Math.min(c[2], hi), c[3]];
		if (band[2] <= band[0] || band[3] <= band[1]) continue;
		const mid = (a + b) / 2;
		const color = gradientColorAt(g, Math.min(1, Math.max(0, down ? tAt(cx, mid) : tAt(mid, cy))), length);
		if (color.a > 0) out.push({ clip: band, color });
	}
	return out;
}
