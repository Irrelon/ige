/**
 * A path filled by its fill rule, as a browser fills it: where its outline
 * crosses itself, or one subpath lies over another (a hole, a crescent drawn
 * as two arcs), what's inside is decided by the winding number (nonzero) or
 * the count of crossings (evenodd), not by each subpath on its own.
 *
 * The outline is cut into horizontal slabs at every corner and every place
 * two of its edges cross, so no two edges cross inside a slab; each slab's
 * edges are then walked left to right, counting, and the spans inside become
 * trapezoids (two triangles each). Their sloping sides are the shape's
 * outline (smoothed); their tops and bottoms are shared with the slab above
 * or below where that's filled too (drawn sharp, so they meet without seams).
 */

/** The fill rule: SVG's fill-rule (and clip-rule), CSS's polygon(evenodd, …). */
export type IgeUiFillRule = "nonzero" | "evenodd";

interface Edge {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	/** Which way it runs: +1 down the page, -1 up. */
	dir: number;
}

/** Where two segments cross (strictly inside both), as its y; undefined if they don't. */
function crossingY (a: Edge, b: Edge): number | undefined {
	const rx = a.x1 - a.x0, ry = a.y1 - a.y0, sx = b.x1 - b.x0, sy = b.y1 - b.y0;
	const den = rx * sy - ry * sx;
	if (Math.abs(den) < 1e-12) return undefined;
	const qx = b.x0 - a.x0, qy = b.y0 - a.y0;
	const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
	if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return undefined;
	return a.y0 + t * ry;
}

/** Whether a closed polygon (x, y pairs) has no edges that cross (a simple polygon: ear clipping fills it exactly). */
export function isSimplePolygon (pts: number[]): boolean {
	const n = pts.length / 2;
	if (n < 4) return true;
	const seg = (i: number): Edge => {
		const j = (i + 1) % n;
		return { x0: pts[i * 2], y0: pts[i * 2 + 1], x1: pts[j * 2], y1: pts[j * 2 + 1], dir: 0 };
	};
	const segs: Edge[] = [];
	for (let i = 0; i < n; i++) segs.push(seg(i));
	for (let i = 0; i < n; i++) {
		const a = segs[i];
		const ax0 = Math.min(a.x0, a.x1), ax1 = Math.max(a.x0, a.x1), ay0 = Math.min(a.y0, a.y1), ay1 = Math.max(a.y0, a.y1);
		for (let j = i + 2; j < n; j++) {
			// (Neighbours share a corner: not a crossing)
			if (i === 0 && j === n - 1) continue;
			const b = segs[j];
			if (Math.max(b.x0, b.x1) < ax0 || Math.min(b.x0, b.x1) > ax1 || Math.max(b.y0, b.y1) < ay0 || Math.min(b.y0, b.y1) > ay1) continue;
			if (crossingY(a, b) !== undefined) return false;
			// (An edge running back along another, or touching it: not simple either)
			const cross = (px: number, py: number, e: Edge) => (e.x1 - e.x0) * (py - e.y0) - (e.y1 - e.y0) * (px - e.x0);
			const onSeg = (px: number, py: number, e: Edge) => Math.abs(cross(px, py, e)) < 1e-9 && px >= Math.min(e.x0, e.x1) - 1e-9 && px <= Math.max(e.x0, e.x1) + 1e-9 && py >= Math.min(e.y0, e.y1) - 1e-9 && py <= Math.max(e.y0, e.y1) + 1e-9;
			if (onSeg(b.x0, b.y0, a) || onSeg(b.x1, b.y1, a) || onSeg(a.x0, a.y0, b) || onSeg(a.x1, a.y1, b)) return false;
		}
	}
	return true;
}

/** A span inside one slab: its left and right x at the slab's top and bottom. */
interface Span {
	la: number;
	lb: number;
	ra: number;
	rb: number;
}

/**
 * Closed polygons (x, y pairs, already in UI px) filled by `rule`: triangles (x, y three times each) and for each a
 * mask of its edges that are the shape's outline (bit 0: corner 0 to 1, bit 1: 1 to 2, bit 2: 2 to 0).
 */
export function windingFill (polys: number[][], rule: IgeUiFillRule): { tris: number[]; edges: number[] } {
	const edges: Edge[] = [];
	const ys: number[] = [];
	for (const p of polys) {
		const n = p.length / 2;
		if (n < 3) continue;
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			const ax = p[i * 2], ay = p[i * 2 + 1], bx = p[j * 2], by = p[j * 2 + 1];
			ys.push(ay);
			if (ay === by) continue;
			edges.push(ay < by ? { x0: ax, y0: ay, x1: bx, y1: by, dir: 1 } : { x0: bx, y0: by, x1: ax, y1: ay, dir: -1 });
		}
	}
	if (!edges.length) return { tris: [], edges: [] };
	edges.sort((a, b) => a.y0 - b.y0);
	// Where edges cross: slab boundaries too (a sanity limit on the pairs tested)
	if (edges.length <= 4000) {
		for (let i = 0; i < edges.length; i++) {
			const a = edges[i];
			const ax0 = Math.min(a.x0, a.x1), ax1 = Math.max(a.x0, a.x1);
			for (let j = i + 1; j < edges.length && edges[j].y0 < a.y1; j++) {
				const b = edges[j];
				if (Math.max(b.x0, b.x1) < ax0 || Math.min(b.x0, b.x1) > ax1) continue;
				const y = crossingY(a, b);
				if (y !== undefined) ys.push(y);
			}
		}
	}
	ys.sort((a, b) => a - b);
	const cuts: number[] = [];
	for (const y of ys) if (!cuts.length || y - cuts[cuts.length - 1] > 1e-7) cuts.push(y);
	const inside = (w: number) => (rule === "evenodd" ? (w & 1) !== 0 : w !== 0);
	const xAt = (e: Edge, y: number) => (e.y1 === e.y0 ? e.x0 : e.x0 + ((e.x1 - e.x0) * (y - e.y0)) / (e.y1 - e.y0));
	// Each slab's spans
	const slabs: { ya: number; yb: number; spans: Span[] }[] = [];
	let first = 0;
	for (let s = 0; s + 1 < cuts.length; s++) {
		const ya = cuts[s], yb = cuts[s + 1], ym = (ya + yb) / 2;
		while (first < edges.length && edges[first].y1 <= ya) first++;
		const here: { e: Edge; xa: number; xb: number; xm: number }[] = [];
		for (let i = first; i < edges.length && edges[i].y0 < yb; i++) {
			const e = edges[i];
			if (e.y0 > ym || e.y1 < ym) continue;
			here.push({ e, xa: xAt(e, ya), xb: xAt(e, yb), xm: xAt(e, ym) });
		}
		here.sort((p, q) => p.xm - q.xm);
		const spans: Span[] = [];
		let w = 0;
		let open: { xa: number; xb: number } | undefined;
		for (const h of here) {
			const was = inside(w);
			w += h.e.dir;
			const now = inside(w);
			if (!was && now) {
				// (Starting where the last span ended: the same span goes on, no seam between them)
				const last = spans[spans.length - 1];
				if (last && Math.abs(last.ra - h.xa) < 1e-7 && Math.abs(last.rb - h.xb) < 1e-7) {
					spans.pop();
					open = { xa: last.la, xb: last.lb };
				} else open = { xa: h.xa, xb: h.xb };
			} else if (was && !now && open) {
				if (h.xa - open.xa > 1e-9 || h.xb - open.xb > 1e-9) spans.push({ la: open.xa, lb: open.xb, ra: h.xa, rb: h.xb });
				open = undefined;
			}
		}
		slabs.push({ ya, yb, spans });
	}
	/** How much of [x0, x1] the spans cover at one of their edges (top: a, bottom: b), 0 to 1. */
	const covered = (spans: Span[] | undefined, x0: number, x1: number, end: "a" | "b") => {
		if (!spans || x1 - x0 <= 1e-9) return 0;
		let c = 0;
		for (const sp of spans) {
			const l = end === "a" ? sp.la : sp.lb, r = end === "a" ? sp.ra : sp.rb;
			c += Math.max(0, Math.min(r, x1) - Math.max(l, x0));
		}
		return c / (x1 - x0);
	};
	const tris: number[] = [], masks: number[] = [];
	slabs.forEach((slab, k) => {
		const above = k > 0 && Math.abs(slabs[k - 1].yb - slab.ya) < 1e-9 ? slabs[k - 1].spans : undefined;
		const below = k + 1 < slabs.length && Math.abs(slabs[k + 1].ya - slab.yb) < 1e-9 ? slabs[k + 1].spans : undefined;
		for (const sp of slab.spans) {
			// Its top and bottom are the outline unless the slab beside it there is mostly filled too
			const top = covered(above, sp.la, sp.ra, "b") < 0.5, bottom = covered(below, sp.lb, sp.rb, "a") < 0.5;
			const hasTop = sp.ra - sp.la > 1e-9, hasBottom = sp.rb - sp.lb > 1e-9;
			// (Top left, top right, bottom right; top left, bottom right, bottom left: the diagonal shared, unless one is
			// all there is (a point at the top or bottom), when it's a side)
			if (hasTop) {
				tris.push(sp.la, slab.ya, sp.ra, slab.ya, sp.rb, slab.yb);
				masks.push((top ? 1 : 0) | 2 | (hasBottom ? 0 : 4));
			}
			if (hasBottom) {
				tris.push(sp.la, slab.ya, sp.rb, slab.yb, sp.lb, slab.yb);
				masks.push((hasTop ? 0 : 1) | (bottom ? 2 : 0) | 4);
			}
		}
	});
	return { tris, edges: masks };
}
