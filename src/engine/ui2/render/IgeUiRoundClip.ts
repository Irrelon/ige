/**
 * Clips with rounded corners, drawn analytically: an element with a
 * border-radius whose overflow is clipped (the codex's disc, portraits,
 * avatars) cuts what's in it to its padding box's rounded shape, and a 2D
 * canvas's clip() to a circle or an ellipse (the radar, the minimap) to that.
 * A clip (IgeUiClip, a rectangle) carries its rounded corners as `round`, in
 * the same space, so every item drawn under it has them; the renderer tests
 * each fragment against the rounded box's signed distance and fades it over
 * a pixel at the edge, as Chrome smooths a rounded clip.
 *
 * One rounded clip is kept per item. Two met (a rounded box in a rounded
 * box) combine exactly when one sits inside the other's straight part, or
 * they share corners (the larger radius each); otherwise the combination is
 * approximated (the rectangle they share, each corner rounded where one of
 * them rounds it) and counted in `roundClipStats`.
 */
import type { IgeCssMatrix } from "@/engine/ui2/css/IgeCssValues";

type Four = [number, number, number, number];

/** A clip's rounded corners: the box they round (x0, y0, x1, y1) and each corner's radii (tl, tr, br, bl) across and down. */
export interface IgeUiRound {
	box: Four;
	rx: Four;
	ry: Four;
}

/**
 * A clip rectangle (x0, y0, x1, y1) and, when it has them, its rounded corners. It's in the item's own pixels (before
 * its matrix), or, given `space`, in the pixels that matrix takes to the screen: an item turned inside an engine
 * canvas (its own matrix the canvas's and its turn) is clipped in the canvas element's pixels, not its own turned ones.
 */
export type IgeUiClipRect = [number, number, number, number] & { round?: IgeUiRound; space?: IgeCssMatrix };

/** How many rounded clips were combined, and how many of those only approximately (nested rounded boxes that overlap at a curve). */
export const roundClipStats = { combined: 0, inexact: 0 };

/** A clip rectangle with rounded corners (none when every radius is 0). */
export function withRound (rect: [number, number, number, number], round: IgeUiRound | undefined): IgeUiClipRect {
	const c = rect as IgeUiClipRect;
	if (round && (round.rx.some((v, i) => v > 0 && round.ry[i] > 0))) c.round = round;
	return c;
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

/** A box's corners (tl, tr, br, bl). */
const corners = (b: Four): [number, number][] => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];

/** The part of a box a corner's curve can reach (x0, y0, x1, y1). */
function zone (r: IgeUiRound, k: number): Four {
	const [x0, y0, x1, y1] = r.box, rx = r.rx[k], ry = r.ry[k];
	return k === 0 ? [x0, y0, x0 + rx, y0 + ry] : k === 1 ? [x1 - rx, y0, x1, y0 + ry] : k === 2 ? [x1 - rx, y1 - ry, x1, y1] : [x0, y1 - ry, x0 + rx, y1];
}

const overlaps = (a: Four, b: Four) => a[0] < b[2] - 0.01 && b[0] < a[2] - 0.01 && a[1] < b[3] - 0.01 && b[1] < a[3] - 0.01;

/** Whether `inner`'s box is inside `outer`'s and none of it in the reach of `outer`'s curves. */
function insideStraight (inner: IgeUiRound, outer: IgeUiRound): boolean {
	const a = inner.box, b = outer.box;
	if (a[0] < b[0] - 0.01 || a[1] < b[1] - 0.01 || a[2] > b[2] + 0.01 || a[3] > b[3] + 0.01) return false;
	for (let k = 0; k < 4; k++) if (outer.rx[k] > 0 && outer.ry[k] > 0 && overlaps(a, zone(outer, k))) return false;
	return true;
}

/**
 * Two rounded clips as one (what's inside both): exact when one is inside the other's straight part, or where their
 * corners meet; else approximated (`exact` false).
 */
export function combineRounds (a: IgeUiRound | undefined, b: IgeUiRound | undefined): { round: IgeUiRound | undefined; exact: boolean } {
	if (!a) return { round: b, exact: true };
	if (!b || a === b) return { round: a, exact: true };
	roundClipStats.combined++;
	if (insideStraight(b, a)) return { round: b, exact: true };
	if (insideStraight(a, b)) return { round: a, exact: true };
	const box: Four = [Math.max(a.box[0], b.box[0]), Math.max(a.box[1], b.box[1]), Math.min(a.box[2], b.box[2]), Math.min(a.box[3], b.box[3])];
	const rx: Four = [0, 0, 0, 0], ry: Four = [0, 0, 0, 0];
	let exact = true;
	const ca = corners(a.box), cb = corners(b.box), cc = corners(box);
	for (let k = 0; k < 4; k++) {
		const onA = near(ca[k][0], cc[k][0]) && near(ca[k][1], cc[k][1]), onB = near(cb[k][0], cc[k][0]) && near(cb[k][1], cc[k][1]);
		const ra = a.rx[k] > 0 && a.ry[k] > 0, rb = b.rx[k] > 0 && b.ry[k] > 0;
		// A corner of the shared box that's one of theirs keeps its curve (the larger, where it's both's: one inside the
		// other; crossing ellipses aren't one)
		if (onA && onB) {
			rx[k] = Math.max(a.rx[k], b.rx[k]);
			ry[k] = Math.max(a.ry[k], b.ry[k]);
			if (ra && rb && !((a.rx[k] >= b.rx[k] && a.ry[k] >= b.ry[k]) || (b.rx[k] >= a.rx[k] && b.ry[k] >= a.ry[k]))) exact = false;
		} else if (onA) [rx[k], ry[k]] = [a.rx[k], a.ry[k]];
		else if (onB) [rx[k], ry[k]] = [b.rx[k], b.ry[k]];
		// (A curve whose corner isn't the shared box's, reaching into it: lost)
		if (!onA && ra && overlaps(box, zone(a, k))) exact = false;
		if (!onB && rb && overlaps(box, zone(b, k))) exact = false;
	}
	if (!exact) roundClipStats.inexact++;
	return { round: rx.some((v, i) => v > 0 && ry[i] > 0) ? { box, rx, ry } : undefined, exact };
}

/** Two clips as one: the rectangle inside both, with their rounded corners combined (null is no clip). */
export function intersectClips (a: IgeUiClipRect | null, b: IgeUiClipRect | null): IgeUiClipRect | null {
	if (!a) return b;
	if (!b) return a;
	return withRound([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])], combineRounds(a.round, b.round).round);
}

/**
 * A rounded clip through a transform that only moves and scales (its corners swapped where it flips), as a clip is
 * brought into a transformed box's own pixels or out to the screen; undefined through a turn, a skew or a perspective
 * (the clip's rectangle round it is all that's kept, as before).
 */
export function roundThrough (r: IgeUiRound | undefined, m: IgeCssMatrix | undefined): IgeUiRound | undefined {
	if (!r || !m) return r;
	const p = m as number[];
	if (Math.abs(p[1]) > 1e-9 || Math.abs(p[2]) > 1e-9 || (p.length > 6 && (Math.abs(p[6]) > 1e-9 || Math.abs(p[7]) > 1e-9 || Math.abs(p[8] - 1) > 1e-9))) return undefined;
	const sx = p[0], sy = p[3];
	if (!sx || !sy) return undefined;
	const X = (x: number) => sx * x + p[4], Y = (y: number) => sy * y + p[5];
	let x0 = X(r.box[0]), x1 = X(r.box[2]), y0 = Y(r.box[1]), y1 = Y(r.box[3]);
	let rx = r.rx.map((v) => v * Math.abs(sx)) as Four, ry = r.ry.map((v) => v * Math.abs(sy)) as Four;
	// (Flipped across: left and right corners swap; down: top and bottom)
	if (sx < 0) {
		[x0, x1] = [x1, x0];
		rx = [rx[1], rx[0], rx[3], rx[2]];
		ry = [ry[1], ry[0], ry[3], ry[2]];
	}
	if (sy < 0) {
		[y0, y1] = [y1, y0];
		rx = [rx[3], rx[2], rx[1], rx[0]];
		ry = [ry[3], ry[2], ry[1], ry[0]];
	}
	return { box: [x0, y0, x1, y1], rx, ry };
}

/** No rounded clip, as the renderer's instance data has it. */
export const NO_ROUND = [0, 0, -1, -1, 0, 0, 0, 0];

/**
 * A rounded clip as the renderer's instance data (8 floats): its box, then each corner's radii packed in one float, 12
 * bits across and 12 down, each a part of the box's width or height (exact in a float; under a tenth of a pixel off).
 */
export function packRound (r: IgeUiRound | undefined): number[] {
	if (!r) return NO_ROUND;
	const w = r.box[2] - r.box[0], h = r.box[3] - r.box[1];
	if (!(w > 0 && h > 0)) return NO_ROUND;
	const q = (v: number, size: number) => Math.max(0, Math.min(4095, Math.round((v / size) * 4095)));
	return [...r.box, ...r.rx.map((v, i) => q(v, w) + q(r.ry[i], h) * 4096)];
}
