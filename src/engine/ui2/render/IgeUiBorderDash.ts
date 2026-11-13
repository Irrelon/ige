/**
 * Dashed and dotted borders for the engine's UI, drawn as a browser draws
 * them: each side's dashes fitted to its length so it starts and ends on a
 * dash (dashes three times the border's width, twice from 3px; dots as long
 * as it's wide, round from 2px), the horizontal sides the box's full width
 * and the vertical sides between them. Solid sides are strips, as before.
 */
import type { IgeCssColor } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiPaintBox, IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";

export interface IgeUiBorderSide {
	w: number;
	c: IgeCssColor;
	style: string;
}

/** Whether any side's dashed or dotted (and drawn). */
export function hasDashedSide (sides: IgeUiBorderSide[]): boolean {
	return sides.some((s) => s.w > 0 && s.c.a > 0 && (s.style === "dashed" || s.style === "dotted"));
}

/** Where each dash along a run of `length` goes: [start, length] pairs. */
export function dashRuns (length: number, width: number, style: string): [number, number][] {
	if (length <= 0) return [];
	const dotted = style === "dotted";
	const dash = dotted ? width : width * (width >= 3 ? 2 : 3);
	const gap = dotted ? width : width >= 3 ? (2 * width) / 3 : 2 * width;
	if (length <= dash) return [[0, length]];
	// As many as fit with about the gap between them, then the gaps evened out so it ends on a dash
	const n = Math.max(1, Math.round((length + gap) / (dash + gap)));
	const g = n > 1 ? (length - n * dash) / (n - 1) : 0;
	const out: [number, number][] = [];
	for (let i = 0; i < n; i++) out.push([i * (dash + g), Math.min(dash, length - i * (dash + g))]);
	return out;
}

/**
 * The four sides (top, right, bottom, left) of a box at (x, y), w by h, as paint items: solid ones as strips,
 * dashed and dotted ones as their dashes. `base` is what every item shares (its clip, transform, opacity…).
 */
export function paintDashedBorder (items: IgeUiPaintItem[], x: number, y: number, w: number, h: number, sides: [IgeUiBorderSide, IgeUiBorderSide, IgeUiBorderSide, IgeUiBorderSide], base: Omit<IgeUiPaintBox, "op" | "x" | "y" | "w" | "h">): void {
	const [t, r, b, l] = sides;
	const push = (bx: number, by: number, bw: number, bh: number, c: IgeCssColor, round: boolean) => {
		if (bw <= 0 || bh <= 0 || c.a <= 0) return;
		const rr = round ? Math.min(bw, bh) / 2 : 0;
		items.push({ op: "box", ...base, x: bx, y: by, w: bw, h: bh, color: c, radii: [rr, rr, rr, rr], chamfer: undefined });
	};
	const side = (s: IgeUiBorderSide, horizontal: boolean, sx: number, sy: number, length: number) => {
		if (s.w <= 0 || s.c.a <= 0 || s.style === "none" || s.style === "hidden") return;
		if (s.style !== "dashed" && s.style !== "dotted") {
			if (horizontal) push(sx, sy, length, s.w, s.c, false);
			else push(sx, sy, s.w, length, s.c, false);
			return;
		}
		const round = s.style === "dotted" && s.w >= 2;
		for (const [at, len] of dashRuns(length, s.w, s.style)) {
			if (horizontal) push(sx + at, sy, len, s.w, s.c, round);
			else push(sx, sy + at, s.w, len, s.c, round);
		}
	};
	side(t, true, x, y, w);
	side(b, true, x, y + h - b.w, w);
	side(l, false, x, y + t.w, h - t.w - b.w);
	side(r, false, x + w - r.w, y + t.w, h - t.w - b.w);
}
