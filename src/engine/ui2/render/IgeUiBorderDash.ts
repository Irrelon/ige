/**
 * Dashed and dotted borders for the engine's UI, drawn as a browser draws
 * them: each side's dashes fitted to its length so it starts and ends on a
 * dash (dashes three times the border's width, twice from 3px; dots as long
 * as it's wide, round from 2px), the horizontal sides the box's full width
 * and the vertical sides between them. Solid sides are strips, as before.
 *
 * A box with rounded corners (or elliptical ones) whose sides are all dashed
 * (or dotted) alike (a ring of dashes round a chip, a spinning rim) has its
 * dashes spaced evenly round the whole rounded outline, following its curve.
 *
 * Each side, or the whole ring, is one paint item with its pattern (dash,
 * period) drawn in the shader: a card collection's hundred dashed cards are
 * four hundred items, not seven thousand.
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
	const [dash, gap] = dashGap(width, style);
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
	if (paintRoundDashes(items, x, y, w, h, sides, base)) return;
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
		const runs = dashRuns(length, s.w, s.style);
		// (One dash: the side as it is; more: one item, its pattern (the dash, the period they're fitted to) in the shader)
		if (runs.length < 2) {
			for (const [at, len] of runs) {
				if (horizontal) push(sx + at, sy, len, s.w, s.c, round);
				else push(sx, sy + at, s.w, len, s.c, round);
			}
			return;
		}
		const dash = { len: runs[0][1], period: runs[1][0], vertical: !horizontal, round };
		if (s.c.a > 0) items.push({ op: "box", ...base, x: sx, y: sy, w: horizontal ? length : s.w, h: horizontal ? s.w : length, color: s.c, radii: [0, 0, 0, 0], radiiY: undefined, chamfer: undefined, dash });
	};
	side(t, true, x, y, w);
	side(b, true, x, y + h - b.w, w);
	side(l, false, x, y + t.w, h - t.w - b.w);
	side(r, false, x + w - r.w, y + t.w, h - t.w - b.w);
}

/** The dash and gap lengths for a border `width` wide. */
function dashGap (width: number, style: string): [number, number] {
	if (style === "dotted") return [width, width];
	return [width * (width >= 3 ? 2 : 3), width >= 3 ? (2 * width) / 3 : 2 * width];
}

/**
 * A rounded box's border, all its sides dashed (or dotted) alike, as dashes spaced evenly round its rounded outline
 * (on the middle of the border's line); false (nothing drawn) when it isn't one.
 */
function paintRoundDashes (items: IgeUiPaintItem[], x: number, y: number, w: number, h: number, sides: IgeUiBorderSide[], base: Omit<IgeUiPaintBox, "op" | "x" | "y" | "w" | "h">): boolean {
	const radii = base.radii ?? [0, 0, 0, 0], radiiY = base.radiiY ?? radii;
	if (!radii.some((r) => r > 0)) return false;
	const s = sides[0];
	const alike = sides.every((o) => o.w === s.w && o.style === s.style && o.c.r === s.c.r && o.c.g === s.c.g && o.c.b === s.c.b && o.c.a === s.c.a);
	if (!alike || s.w <= 0 || s.c.a <= 0 || (s.style !== "dashed" && s.style !== "dotted")) return false;
	const bw = s.w;
	// The outline the dashes run along: the middle of the border's line, its corners' radii fitted to it (as the shader
	// measures it: IgeUiGlRenderer's ringAlong)
	const mw = Math.max(0, w - bw), mh = Math.max(0, h - bw);
	let ax = radii.map((r) => Math.max(0, r - bw / 2)), ay = radiiY.map((r) => Math.max(0, r - bw / 2));
	const fit = Math.min(1, mw / Math.max(1e-6, ax[0] + ax[1]), mw / Math.max(1e-6, ax[3] + ax[2]), mh / Math.max(1e-6, ay[0] + ay[3]), mh / Math.max(1e-6, ay[1] + ay[2]));
	ax = ax.map((r) => r * fit);
	ay = ay.map((r) => r * fit);
	// (A quarter of an ellipse: Ramanujan's)
	const quarter = (a: number, b: number) => (Math.PI / 4) * (3 * (a + b) - Math.sqrt(Math.max(0, (3 * a + b) * (a + 3 * b))));
	const total = (mw - ax[0] - ax[1]) + (mh - ay[1] - ay[2]) + (mw - ax[2] - ax[3]) + (mh - ay[3] - ay[0]) + [0, 1, 2, 3].reduce((n, k) => n + quarter(ax[k], ay[k]), 0);
	if (total <= 0) return true;
	// As many dashes as fit with about the gap between them, evened out round the closed outline
	const [dash, gap] = dashGap(bw, s.style);
	const n = Math.max(1, Math.round(total / (dash + gap)));
	const step = total / n;
	const round = s.style === "dotted" && bw >= 2;
	items.push({ op: "box", ...base, x, y, w, h, color: s.c, border: bw, chamfer: undefined, dash: { len: Math.min(dash, step), period: step, round } });
	return true;
}
