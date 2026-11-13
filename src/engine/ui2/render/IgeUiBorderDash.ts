/**
 * Dashed and dotted borders for the engine's UI, drawn as a browser draws
 * them: each side's dashes fitted to its length so it starts and ends on a
 * dash (dashes three times the border's width, twice from 3px; dots as long
 * as it's wide, round from 2px), the horizontal sides the box's full width
 * and the vertical sides between them. Solid sides are strips, as before.
 *
 * A box with rounded corners whose sides are all dashed (or dotted) alike
 * (a ring of dashes round a chip) has its dashes spaced evenly round the
 * whole rounded outline, each a short straight dash turned along it.
 */
import { type IgeCssColor, type IgeCssMatrix, IDENTITY, multiply } from "@/engine/ui2/css/IgeCssValues";
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
	const radii = base.radii ?? [0, 0, 0, 0];
	if (!radii.some((r) => r > 0)) return false;
	const s = sides[0];
	const alike = sides.every((o) => o.w === s.w && o.style === s.style && o.c.r === s.c.r && o.c.g === s.c.g && o.c.b === s.c.b && o.c.a === s.c.a);
	if (!alike || s.w <= 0 || s.c.a <= 0 || (s.style !== "dashed" && s.style !== "dotted")) return false;
	const bw = s.w;
	// The outline the dashes run along: the middle of the border's line, its corners' radii fitted to it
	const mx = x + bw / 2, my = y + bw / 2, mw = Math.max(0, w - bw), mh = Math.max(0, h - bw);
	let rr = radii.map((r) => Math.max(0, r - bw / 2));
	const fit = Math.min(1, mw / Math.max(1e-6, rr[0] + rr[1]), mw / Math.max(1e-6, rr[3] + rr[2]), mh / Math.max(1e-6, rr[0] + rr[3]), mh / Math.max(1e-6, rr[1] + rr[2]));
	rr = rr.map((r) => r * fit);
	const [tl, tr, br, bl] = rr;
	// Its pieces in turn, clockwise from the top's left end: straight runs and quarter turns
	type Piece = { len: number; at: (d: number) => [number, number, number] };
	const line = (x0: number, y0: number, x1: number, y1: number): Piece => {
		const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
		return { len, at: (d) => [x0 + ((x1 - x0) * d) / Math.max(1e-6, len), y0 + ((y1 - y0) * d) / Math.max(1e-6, len), a] };
	};
	const arc = (cx: number, cy: number, r: number, from: number): Piece => ({
		len: (Math.PI / 2) * r,
		at: (d) => {
			const a = from + d / Math.max(1e-6, r);
			return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI / 2];
		}
	});
	const pieces: Piece[] = [
		line(mx + tl, my, mx + mw - tr, my), arc(mx + mw - tr, my + tr, tr, -Math.PI / 2),
		line(mx + mw, my + tr, mx + mw, my + mh - br), arc(mx + mw - br, my + mh - br, br, 0),
		line(mx + mw - br, my + mh, mx + bl, my + mh), arc(mx + bl, my + mh - bl, bl, Math.PI / 2),
		line(mx, my + mh - bl, mx, my + tl), arc(mx + tl, my + tl, tl, Math.PI)
	].filter((p) => p.len > 1e-6);
	const total = pieces.reduce((n, p) => n + p.len, 0);
	if (total <= 0) return true;
	const pointAt = (d: number): [number, number, number] => {
		let left = ((d % total) + total) % total;
		for (const p of pieces) {
			if (left <= p.len) return p.at(left);
			left -= p.len;
		}
		return pieces[pieces.length - 1].at(pieces[pieces.length - 1].len);
	};
	// As many dashes as fit with about the gap between them, evened out round the closed outline
	const [dash, gap] = dashGap(bw, s.style);
	const n = Math.max(1, Math.round(total / (dash + gap)));
	const step = total / n, len = Math.min(dash, step);
	const round = s.style === "dotted" && bw >= 2;
	const outer: IgeCssMatrix = base.matrix ?? IDENTITY;
	for (let i = 0; i < n; i++) {
		const [px, py, a] = pointAt(i * step + len / 2);
		const c = Math.cos(a), sn = Math.sin(a);
		const rad = round ? Math.min(len, bw) / 2 : 0;
		items.push({ op: "box", ...base, matrix: multiply(outer, [c, sn, -sn, c, px, py]), x: -len / 2, y: -bw / 2, w: len, h: bw, color: s.c, radii: [rad, rad, rad, rad], chamfer: undefined, exact: true });
	}
	return true;
}
