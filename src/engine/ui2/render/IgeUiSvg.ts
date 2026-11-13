/**
 * SVG for the engine's UI: the viewBox through preserveAspectRatio, the
 * shapes' geometry (path data with its curves and arcs flattened, and the
 * basic shapes), the SVG properties (from CSS, else presentation attributes,
 * else the parent shape's: fill, stroke and the rest inherit), transforms,
 * and the shapes as the painter's items:
 *
 * - strokes: lines with their caps and joins;
 * - fills: triangles (each simple subpath ear-clipped; a path that crosses
 *   itself, or subpaths over each other, by its fill rule: IgeUiPathFill). An
 *   edge two triangles share inside one path is drawn sharp rather than
 *   smoothed, so a mesh of triangles fills without seams, as a browser fills
 *   a path as one shape;
 * - circles and rectangles: the painter's boxes (smooth rings and corners);
 * - `fill="url(#id)"` with a `<pattern>`: its tile repeated over the shape;
 *   with a gradient: as a CSS gradient (IgeUiSvgGradient).
 *
 * Layout uses the same geometry for the shapes' client rects (their bounds,
 * stroke not included, as a browser gives them).
 */
import { type IgeCssColor, type IgeCssGradient, type IgeCssMatrix, IDENTITY, multiply, parseColor, resolveNumber } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeUiClip, IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { type IgeUiFillRule, isSimplePolygon, windingFill } from "@/engine/ui2/render/IgeUiPathFill";
import { paintGradientTriangles, svgGradient, svgGradientMiddle } from "@/engine/ui2/render/IgeUiSvgGradient";
import { animated, unanimated } from "@/engine/ui2/render/IgeUiSvgSmil";
import { type IgeUiComputedStyle, styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";
import { fontWeight, type IgeUiFontSpec } from "@/engine/ui2/text/IgeUiFonts";

/** A subpath's points (x, y, x, y…, in user units) and whether it's closed. */
export interface IgeUiSvgSubpath {
	points: number[];
	closed: boolean;
}

// ---------------------------------------------------------------- viewport

/**
 * The map from an `<svg>`'s user units to the UI's pixels, for its content box at (x, y), w by h: the viewBox
 * fitted by preserveAspectRatio (xMidYMid meet unless it says otherwise; none stretches it).
 */
export function svgViewport (el: IgeUiElement, x: number, y: number, w: number, h: number): IgeCssMatrix {
	const vb = (el.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
	if (vb.length !== 4 || vb.some((v) => !Number.isFinite(v)) || vb[2] <= 0 || vb[3] <= 0) return [1, 0, 0, 1, x, y];
	let sx = w / vb[2], sy = h / vb[3];
	let tx = x - vb[0] * sx, ty = y - vb[1] * sy;
	const par = (el.getAttribute("preserveAspectRatio") ?? "xMidYMid meet").trim().split(/\s+/);
	if (par[0] !== "none") {
		const s = par[1] === "slice" ? Math.max(sx, sy) : Math.min(sx, sy);
		const align = par[0] ?? "xMidYMid";
		const ax = align.includes("xMin") ? 0 : align.includes("xMax") ? 1 : 0.5;
		const ay = align.includes("YMin") ? 0 : align.includes("YMax") ? 1 : 0.5;
		sx = sy = s;
		tx = x - vb[0] * s + (w - vb[2] * s) * ax;
		ty = y - vb[1] * s + (h - vb[3] * s) * ay;
	}
	return [sx, 0, 0, sy, tx, ty];
}

/** An SVG `transform` attribute as a matrix (translate, scale, rotate, skewX, skewY, matrix), or undefined. */
export function svgTransform (value: string | null): IgeCssMatrix | undefined {
	if (!value) return undefined;
	let m: IgeCssMatrix = IDENTITY;
	const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
	let found = false;
	for (let t = re.exec(value); t; t = re.exec(value)) {
		found = true;
		const a = t[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
		let n: IgeCssMatrix = IDENTITY;
		switch (t[1]) {
			case "matrix": if (a.length === 6) n = a as IgeCssMatrix; break;
			case "translate": n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0]; break;
			case "scale": n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]; break;
			case "rotate": {
				const r = ((a[0] ?? 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
				const cx = a[1] ?? 0, cy = a[2] ?? 0;
				n = [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
				break;
			}
			case "skewX": n = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0]; break;
			case "skewY": n = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0]; break;
		}
		m = multiply(m, n);
	}
	return found ? m : undefined;
}

function apply (m: IgeCssMatrix, x: number, y: number): [number, number] {
	return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** How much a matrix scales lengths (the geometric mean of its axes). */
function scaleOf (m: IgeCssMatrix): number {
	return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
}

// ---------------------------------------------------------------- path data

/**
 * Path data (`d`) as subpaths of points: lines as they are; quadratic and cubic curves and elliptical arcs
 * flattened into short lines (`tolerance`: how far, in user units, a line may stray from the curve).
 */
export function parsePathData (d: string, tolerance = 0.05): IgeUiSvgSubpath[] {
	const out: IgeUiSvgSubpath[] = [];
	let i = 0;
	const n = d.length;
	const skip = () => {
		while (i < n && /[\s,]/.test(d[i])) i++;
	};
	const num = (): number | undefined => {
		skip();
		const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(d.slice(i, i + 40));
		if (!m) return undefined;
		i += m[0].length;
		return Number(m[0]);
	};
	const flag = (): number | undefined => {
		skip();
		if (d[i] === "0" || d[i] === "1") return Number(d[i++]);
		return undefined;
	};
	let cur: IgeUiSvgSubpath | undefined;
	let x = 0, y = 0, sx = 0, sy = 0;
	// The last control point (for S and T) and which kind of curve set it
	let cx = 0, cy = 0, last = "";
	const lineTo = (px: number, py: number) => {
		if (!cur) {
			cur = { points: [x, y], closed: false };
			out.push(cur);
		}
		cur.points.push(px, py);
		x = px;
		y = py;
	};
	const steps = (len: number) => Math.max(2, Math.min(64, Math.ceil(Math.sqrt(len / Math.max(1e-6, tolerance)))));
	const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
		const x0 = x, y0 = y;
		const k = steps(Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2));
		for (let s = 1; s <= k; s++) {
			const t = s / k, u = 1 - t;
			lineTo(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
		}
	};
	const quad = (x1: number, y1: number, x2: number, y2: number) => {
		const x0 = x, y0 = y;
		const k = steps(Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1));
		for (let s = 1; s <= k; s++) {
			const t = s / k, u = 1 - t;
			lineTo(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2);
		}
	};
	const arc = (rx: number, ry: number, rot: number, large: number, sweep: number, x2: number, y2: number) => {
		const x1 = x, y1 = y;
		rx = Math.abs(rx);
		ry = Math.abs(ry);
		if (!rx || !ry || (x1 === x2 && y1 === y2)) return lineTo(x2, y2);
		// Endpoint to centre (SVG 1.1, appendix F.6)
		const phi = (rot * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
		const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
		const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
		const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
		if (lam > 1) {
			rx *= Math.sqrt(lam);
			ry *= Math.sqrt(lam);
		}
		const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
		const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
		let co = Math.sqrt(Math.max(0, num2 / den));
		if (large === sweep) co = -co;
		const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
		const ccx = cp * cxp - sp * cyp + (x1 + x2) / 2, ccy = sp * cxp + cp * cyp + (y1 + y2) / 2;
		const ang = (ux: number, uy: number, vx: number, vy: number) => {
			const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
			return a;
		};
		const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
		let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
		if (!sweep && dt > 0) dt -= Math.PI * 2;
		else if (sweep && dt < 0) dt += Math.PI * 2;
		const k = Math.max(2, Math.min(96, Math.ceil(Math.abs(dt) / Math.max(0.02, 2 * Math.acos(Math.max(-1, Math.min(1, 1 - tolerance / Math.max(rx, ry))))))));
		for (let s = 1; s <= k; s++) {
			const t = t1 + (dt * s) / k;
			const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
			if (s === k) lineTo(x2, y2);
			else lineTo(cp * ex - sp * ey + ccx, sp * ex + cp * ey + ccy);
		}
	};
	let cmd = "";
	while (i < n) {
		skip();
		if (i >= n) break;
		const ch = d[i];
		if (/[MmLlHhVvCcSsQqTtAaZz]/.test(ch)) {
			cmd = ch;
			i++;
		} else if (!cmd) break;
		const rel = cmd === cmd.toLowerCase();
		const ox = rel ? x : 0, oy = rel ? y : 0;
		const C = cmd.toUpperCase();
		const before = i;
		if (C === "Z") {
			if (cur) {
				cur.closed = true;
				cur = undefined;
			}
			x = sx;
			y = sy;
			last = "";
			// (A command letter must follow)
			cmd = "";
			continue;
		}
		if (C === "M") {
			const px = num(), py = num();
			if (px === undefined || py === undefined) break;
			x = ox + px;
			y = oy + py;
			sx = x;
			sy = y;
			cur = { points: [x, y], closed: false };
			out.push(cur);
			// (Pairs after a move are lines)
			cmd = rel ? "l" : "L";
			last = "";
		} else if (C === "L") {
			const px = num(), py = num();
			if (px === undefined || py === undefined) break;
			lineTo(ox + px, oy + py);
			last = "";
		} else if (C === "H") {
			const px = num();
			if (px === undefined) break;
			lineTo(rel ? x + px : px, y);
			last = "";
		} else if (C === "V") {
			const py = num();
			if (py === undefined) break;
			lineTo(x, rel ? y + py : py);
			last = "";
		} else if (C === "C" || C === "S") {
			let x1: number, y1: number;
			if (C === "C") {
				const a = num(), b = num();
				if (a === undefined || b === undefined) break;
				x1 = ox + a;
				y1 = oy + b;
			} else {
				x1 = last === "C" ? 2 * x - cx : x;
				y1 = last === "C" ? 2 * y - cy : y;
			}
			const a2 = num(), b2 = num(), a3 = num(), b3 = num();
			if (a2 === undefined || b2 === undefined || a3 === undefined || b3 === undefined) break;
			cx = ox + a2;
			cy = oy + b2;
			cubic(x1, y1, cx, cy, ox + a3, oy + b3);
			last = "C";
		} else if (C === "Q" || C === "T") {
			if (C === "Q") {
				const a = num(), b = num();
				if (a === undefined || b === undefined) break;
				cx = ox + a;
				cy = oy + b;
			} else {
				cx = last === "Q" ? 2 * x - cx : x;
				cy = last === "Q" ? 2 * y - cy : y;
			}
			const a2 = num(), b2 = num();
			if (a2 === undefined || b2 === undefined) break;
			quad(cx, cy, ox + a2, oy + b2);
			last = "Q";
		} else if (C === "A") {
			const rx = num(), ry = num(), rot = num(), large = flag(), sweep = flag(), px = num(), py = num();
			if (rx === undefined || ry === undefined || rot === undefined || large === undefined || sweep === undefined || px === undefined || py === undefined) break;
			arc(rx, ry, rot, large, sweep, ox + px, oy + py);
			last = "";
		}
		if (i === before) break;
	}
	return out.filter((s) => s.points.length >= 4 || s.closed);
}

/** A shape's geometry as subpaths (user units): path, line, polyline, polygon, rect (rounded too), circle, ellipse. */
export function svgShapeGeometry (el: IgeUiElement): IgeUiSvgSubpath[] | undefined {
	const num = (a: string) => Number(el.getAttribute(a) ?? 0) || 0;
	switch (el.localName) {
		case "path": return parsePathData(el.getAttribute("d") ?? "");
		case "line": return [{ points: [num("x1"), num("y1"), num("x2"), num("y2")], closed: false }];
		case "polyline":
		case "polygon": {
			const v = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).filter(Boolean).map(Number);
			const pts = v.slice(0, v.length - (v.length % 2));
			return pts.length >= 2 ? [{ points: pts, closed: el.localName === "polygon" }] : [];
		}
		case "rect": {
			const x = num("x"), y = num("y"), w = num("width"), h = num("height");
			if (w <= 0 || h <= 0) return [];
			let rx = el.hasAttribute("rx") ? num("rx") : num("ry"), ry = el.hasAttribute("ry") ? num("ry") : rx;
			rx = Math.min(rx, w / 2);
			ry = Math.min(ry, h / 2);
			if (rx <= 0 || ry <= 0) return [{ points: [x, y, x + w, y, x + w, y + h, x, y + h], closed: true }];
			const pts: number[] = [];
			const corner = (ccx: number, ccy: number, a0: number) => {
				for (let s = 0; s <= 8; s++) {
					const a = a0 + (s / 8) * (Math.PI / 2);
					pts.push(ccx + Math.cos(a) * rx, ccy + Math.sin(a) * ry);
				}
			};
			corner(x + w - rx, y + ry, -Math.PI / 2);
			corner(x + w - rx, y + h - ry, 0);
			corner(x + rx, y + h - ry, Math.PI / 2);
			corner(x + rx, y + ry, Math.PI);
			return [{ points: pts, closed: true }];
		}
		case "circle":
		case "ellipse": {
			const cx = num("cx"), cy = num("cy");
			const rx = el.localName === "circle" ? num("r") : num("rx"), ry = el.localName === "circle" ? num("r") : num("ry");
			if (rx <= 0 || ry <= 0) return [];
			const k = Math.max(24, Math.min(96, Math.ceil(Math.sqrt(Math.max(rx, ry)) * 12)));
			const pts: number[] = [];
			for (let s = 0; s < k; s++) pts.push(cx + Math.cos((s / k) * Math.PI * 2) * rx, cy + Math.sin((s / k) * Math.PI * 2) * ry);
			return [{ points: pts, closed: true }];
		}
		default: return undefined;
	}
}

// ---------------------------------------------------------------- text

/** An SVG `<text>`'s run as layout measured it (user units): where it starts (after text-anchor), its baseline, its width. */
export interface IgeUiSvgText {
	text: string;
	x: number;
	y: number;
	w: number;
	ascent: number;
	descent: number;
	/** Its font, its size in user units (scaled with the drawing when it's painted). */
	font: IgeUiFontSpec;
	letterSpacing: number;
	/** Text on a path (`<textPath>`): each glyph's start on the baseline, its turn (radians) and its advance. */
	glyphs?: { ch: string; x: number; y: number; angle: number; w: number }[];
}

/** Each `<text>`'s run, measured at layout (the painter has no fonts). */
export const SVG_TEXT = new WeakMap<IgeUiElement, IgeUiSvgText>();

/**
 * Every `<text>` in an SVG measured: its text (white space collapsed, as SVG's is), its font from its presentation
 * attributes or its style (font-family, font-size and letter-spacing in user units), placed by x, y and text-anchor.
 */
export function measureSvgText (svg: IgeUiElement, measure: (text: string, font: IgeUiFontSpec) => number, metrics: (font: IgeUiFontSpec) => { ascent: number; descent: number }): void {
	for (const t of svg.querySelectorAll("text")) {
		// (On a path: its <textPath>'s attributes first)
		const onPath = [...t.children].find((c) => c.localName.toLowerCase() === "textpath");
		// (A presentation attribute on it or on a group round it, else its style)
		const attr = (name: string): string | undefined => {
			const own = onPath?.getAttribute(name);
			if (own !== null && own !== undefined) return own;
			for (let n: IgeUiElement | null = t; n && n !== svg.parentNode; n = n.parentNode) {
				const v = n.getAttribute(name);
				if (v !== null) return v;
			}
			return undefined;
		};
		const cs = (onPath ?? t)._computed ?? t._computed ?? {};
		const text = (t.textContent ?? "").replace(/\s+/g, " ").trim();
		const sizeV = parseFloat(attr("font-size") ?? styleValue(cs, "font-size"));
		const size = Number.isFinite(sizeV) ? sizeV : 16;
		const style = (attr("font-style") ?? styleValue(cs, "font-style")) === "italic" ? "italic" : "normal";
		const font: IgeUiFontSpec = { family: attr("font-family") ?? styleValue(cs, "font-family"), size, weight: fontWeight(attr("font-weight") ?? styleValue(cs, "font-weight")), style };
		const lsV = attr("letter-spacing") ?? styleValue(cs, "letter-spacing");
		const letterSpacing = lsV === "normal" ? 0 : parseFloat(lsV) || 0;
		const w = text ? measure(text, font) + letterSpacing * [...text].length : 0;
		const first = (name: string) => Number((t.getAttribute(name) ?? "0").trim().split(/[\s,]+/)[0]) || 0;
		const anchor = attr("text-anchor") ?? styleValue(cs, "text-anchor");
		const x = first("x") - (anchor === "middle" ? w / 2 : anchor === "end" ? w : 0);
		const m = metrics(font);
		const run: IgeUiSvgText = { text, x, y: first("y"), w, ascent: m.ascent, descent: m.descent, font, letterSpacing };
		if (onPath) run.glyphs = alongPath(svg, onPath, text, font, letterSpacing, anchor, measure);
		SVG_TEXT.set(t, run);
	}
}

/**
 * Text on a path: each glyph's middle on the path at its distance along it (from startOffset, moved back for
 * text-anchor), turned with the path there, as a browser sets it; glyphs off either end aren't drawn.
 */
function alongPath (svg: IgeUiElement, tp: IgeUiElement, text: string, font: IgeUiFontSpec, letterSpacing: number, anchor: string | undefined, measure: (text: string, font: IgeUiFontSpec) => number): IgeUiSvgText["glyphs"] {
	const ref = (tp.getAttribute("href") ?? tp.getAttribute("xlink:href") ?? "").replace(/^#/, "");
	const path = ref ? findById(svg, ref) : null;
	const sub = path ? svgShapeGeometry(path) : undefined;
	const pts = sub?.[0]?.points;
	if (!pts || pts.length < 4) return [];
	// Distances along the path's points
	const at: number[] = [0];
	for (let i = 2; i + 1 < pts.length; i += 2) at.push(at[at.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]));
	const length = at[at.length - 1];
	const pointAt = (d: number): [number, number, number] | undefined => {
		if (d < 0 || d > length) return undefined;
		let k = 1;
		while (k < at.length - 1 && at[k] < d) k++;
		const f = (d - at[k - 1]) / Math.max(1e-9, at[k] - at[k - 1]);
		const x0 = pts[(k - 1) * 2], y0 = pts[(k - 1) * 2 + 1], x1 = pts[k * 2], y1 = pts[k * 2 + 1];
		return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, Math.atan2(y1 - y0, x1 - x0)];
	};
	const so = (tp.getAttribute("startOffset") ?? "0").trim();
	const start = so.endsWith("%") ? (parseFloat(so) / 100) * length : parseFloat(so) || 0;
	const chars = [...text];
	// (Each glyph's advance as the run sets it: the text up to and past it measured, so kerning between pairs counts)
	let before = 0;
	const adv = chars.map((_, i) => {
		const upTo = measure(chars.slice(0, i + 1).join(""), font);
		const a = upTo - before;
		before = upTo;
		return a + letterSpacing;
	});
	const total = adv.reduce((a, w) => a + w, 0);
	let d = start - (anchor === "middle" ? total / 2 : anchor === "end" ? total : 0);
	const out: NonNullable<IgeUiSvgText["glyphs"]> = [];
	chars.forEach((ch, i) => {
		const w = adv[i] - letterSpacing;
		const mid = pointAt(d + w / 2);
		if (mid && ch.trim()) {
			const [mx, my, angle] = mid;
			// (Its cell as wide as its advance, the spacing after it too, as a browser measures the run)
			out.push({ ch, x: mx - Math.cos(angle) * (w / 2), y: my - Math.sin(angle) * (w / 2), angle, w: adv[i] });
		}
		d += adv[i];
	});
	return out;
}

/** A shape's bounds (x0, y0, x1, y1, user units; stroke not included), or undefined for one with no geometry. */
export function svgShapeBounds (el: IgeUiElement): [number, number, number, number] | undefined {
	// (A run inside a <text>, on a path or not: the text's box, as a browser gives it)
	const lower = el.localName.toLowerCase();
	if ((lower === "textpath" || lower === "tspan") && el.parentNode) return svgShapeBounds(el.parentNode);
	if (el.localName === "text") {
		const t = SVG_TEXT.get(el);
		if (t?.glyphs) {
			// (On a path: round its glyphs' boxes)
			if (!t.glyphs.length) return undefined;
			const xs: number[] = [], ys: number[] = [];
			for (const g of t.glyphs) {
				const c = Math.cos(g.angle), s = Math.sin(g.angle);
				for (const [u, v] of [[0, -t.ascent], [g.w, -t.ascent], [0, t.descent], [g.w, t.descent]]) {
					xs.push(g.x + u * c - v * s);
					ys.push(g.y + u * s + v * c);
				}
			}
			return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
		}
		return t && t.text ? [t.x, t.y - t.ascent, t.x + t.w, t.y + t.descent] : undefined;
	}
	// (Circles and ellipses exactly, not through their polygons)
	if (el.localName === "circle" || el.localName === "ellipse") {
		const num = (a: string) => Number(el.getAttribute(a) ?? 0) || 0;
		const rx = el.localName === "circle" ? num("r") : num("rx"), ry = el.localName === "circle" ? num("r") : num("ry");
		return [num("cx") - rx, num("cy") - ry, num("cx") + rx, num("cy") + ry];
	}
	const g = svgShapeGeometry(el);
	if (!g?.length) return undefined;
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const s of g) {
		for (let i = 0; i + 1 < s.points.length; i += 2) {
			x0 = Math.min(x0, s.points[i]);
			x1 = Math.max(x1, s.points[i]);
			y0 = Math.min(y0, s.points[i + 1]);
			y1 = Math.max(y1, s.points[i + 1]);
		}
	}
	return Number.isFinite(x0) ? [x0, y0, x1, y1] : undefined;
}

/**
 * The bounds of each shape in an `<svg>` (UI px, in its box's frame as `boundsAt` gives it), as a browser's client
 * rects of them: through the viewport and any transforms on the way down.
 */
export function svgLayoutBounds (svg: IgeUiElement, viewport: IgeCssMatrix, shape: IgeUiElement): [number, number, number, number] | undefined {
	let m = viewport;
	const chain: IgeUiElement[] = [];
	for (let n: IgeUiElement | null = shape; n && n !== svg; n = n.parentNode) chain.unshift(n);
	for (const n of chain) {
		const t = svgTransform(n.getAttribute("transform"));
		if (t) m = multiply(m, t);
	}
	const b = svgShapeBounds(animated(shape, svg));
	if (!b) return undefined;
	const pts = [apply(m, b[0], b[1]), apply(m, b[2], b[1]), apply(m, b[2], b[3]), apply(m, b[0], b[3])];
	return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

// ---------------------------------------------------------------- triangles

/** A simple polygon (x, y pairs) cut into triangles by ear clipping: corner indices, three per triangle. */
export function triangulate (pts: number[]): number[] {
	const n = pts.length / 2;
	if (n < 3) return [];
	if (n === 3) return [0, 1, 2];
	// Winding (positive area: the order the ears are tested in)
	let area = 0;
	for (let i = 0, j = n - 1; i < n; j = i++) area += pts[j * 2] * pts[i * 2 + 1] - pts[i * 2] * pts[j * 2 + 1];
	const sign = area >= 0 ? 1 : -1;
	const idx: number[] = [];
	for (let i = 0; i < n; i++) idx.push(i);
	const out: number[] = [];
	const X = (i: number) => pts[i * 2], Y = (i: number) => pts[i * 2 + 1];
	const cross = (a: number, b: number, c: number) => (X(b) - X(a)) * (Y(c) - Y(a)) - (Y(b) - Y(a)) * (X(c) - X(a));
	const inside = (p: number, a: number, b: number, c: number) => {
		const d1 = cross(a, b, p) * sign, d2 = cross(b, c, p) * sign, d3 = cross(c, a, p) * sign;
		return d1 >= 0 && d2 >= 0 && d3 >= 0;
	};
	let guard = n * n + 10;
	while (idx.length > 3 && guard-- > 0) {
		let clipped = false;
		for (let k = 0; k < idx.length; k++) {
			const a = idx[(k + idx.length - 1) % idx.length], b = idx[k], c = idx[(k + 1) % idx.length];
			if (cross(a, b, c) * sign <= 1e-12) continue;
			let ear = true;
			for (const p of idx) {
				if (p === a || p === b || p === c) continue;
				if (inside(p, a, b, c)) {
					ear = false;
					break;
				}
			}
			if (!ear) continue;
			out.push(a, b, c);
			idx.splice(k, 1);
			clipped = true;
			break;
		}
		// (Degenerate or self-crossing: a fan of what's left)
		if (!clipped) {
			for (let k = 1; k + 1 < idx.length; k++) out.push(idx[0], idx[k], idx[k + 1]);
			return out;
		}
	}
	if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
	return out;
}

/**
 * Subpaths filled as triangles (UI px, through `m`), six numbers each, and for each a mask of its edges that are
 * the shape's outline (bit 0: corner 0 to 1, bit 1: 1 to 2, bit 2: 2 to 0). An edge two of its triangles share is
 * inside the shape: drawn sharp, so neighbours meet without a seam.
 */
export function fillTriangles (subpaths: IgeUiSvgSubpath[], m: IgeCssMatrix, rule: IgeUiFillRule = "nonzero"): { tris: number[]; edges: number[] } {
	const tris: number[] = [];
	const polys: number[][] = [];
	for (const s of subpaths) {
		let p = s.points;
		// (The closing point repeated: dropped)
		if (p.length >= 4 && p[0] === p[p.length - 2] && p[1] === p[p.length - 1]) p = p.slice(0, -2);
		if (p.length < 6) continue;
		const ui: number[] = [];
		for (let i = 0; i + 1 < p.length; i += 2) ui.push(...apply(m, p[i], p[i + 1]));
		polys.push(ui);
	}
	// A subpath that crosses itself, or subpaths over each other (a hole, a crescent of two arcs): filled by the rule
	// as one shape (IgeUiPathFill); else each its own simple polygon, ear-clipped
	const box = (p: number[]) => {
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (let i = 0; i + 1 < p.length; i += 2) {
			x0 = Math.min(x0, p[i]);
			x1 = Math.max(x1, p[i]);
			y0 = Math.min(y0, p[i + 1]);
			y1 = Math.max(y1, p[i + 1]);
		}
		return [x0, y0, x1, y1];
	};
	const boxes = polys.map(box);
	const overlap = boxes.some((a, i) => boxes.some((b, j) => j > i && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]));
	if (overlap || !polys.every(isSimplePolygon)) return windingFill(polys, rule);
	for (const ui of polys) {
		const t = triangulate(ui);
		for (const k of t) tris.push(ui[k * 2], ui[k * 2 + 1]);
	}
	// Edges by their ends (rounded): those used twice are shared
	const key = (x0: number, y0: number, x1: number, y1: number) => {
		const a = `${Math.round(x0 * 64)},${Math.round(y0 * 64)}`, b = `${Math.round(x1 * 64)},${Math.round(y1 * 64)}`;
		return a < b ? `${a}|${b}` : `${b}|${a}`;
	};
	const count = new Map<string, number>();
	const keys: string[] = [];
	for (let t = 0; t < tris.length; t += 6) {
		for (let e = 0; e < 3; e++) {
			const a = e * 2, b = ((e + 1) % 3) * 2;
			const k = key(tris[t + a], tris[t + a + 1], tris[t + b], tris[t + b + 1]);
			keys.push(k);
			count.set(k, (count.get(k) ?? 0) + 1);
		}
	}
	const edges: number[] = [];
	for (let t = 0; t < tris.length / 6; t++) {
		let mask = 0;
		for (let e = 0; e < 3; e++) if ((count.get(keys[t * 3 + e]) ?? 0) < 2) mask |= 1 << e;
		edges.push(mask);
	}
	return { tris, edges };
}

// ---------------------------------------------------------------- properties

/** The SVG properties that inherit, and their initial values. */
const SVG_INHERITED: Record<string, string> = {
	fill: "black", "fill-opacity": "1", "fill-rule": "nonzero", stroke: "none", "stroke-width": "1", "stroke-opacity": "1",
	"stroke-linecap": "butt", "stroke-linejoin": "miter", "stroke-miterlimit": "4"
};

type SvgProps = Record<string, string>;

/** An element's SVG properties: its style's (the cascade, inline), else its presentation attribute, else its parent's. */
function svgProps (el: IgeUiElement, parent: SvgProps): SvgProps {
	const cs = el._computed ?? {};
	const out: SvgProps = {};
	for (const k in SVG_INHERITED) {
		const v = cs[k] ?? el.getAttribute(k) ?? undefined;
		out[k] = v === undefined || v === "inherit" ? parent[k] : v;
	}
	return out;
}

const SHAPES = new Set(["path", "line", "polyline", "polygon", "rect", "circle", "ellipse"]);

/** Elements that are only referred to (a pattern's tile, a gradient), not drawn where they are. */
export const SVG_UNRENDERED = new Set(["defs", "pattern", "clipPath", "mask", "linearGradient", "radialGradient", "symbol", "marker", "title", "desc", "style", "script"]);

/** Where an SVG is drawn: the painter's clip, transform and opacity there. */
export interface IgeUiSvgContext {
	clip: IgeUiClip;
	matrix?: IgeCssMatrix;
	opacity: number;
}

/**
 * An `<svg>`'s shapes as paint items (pushed onto `items`), its content box at (x, y), w by h (UI px). `current` is
 * its `color` (currentColor).
 */
export function paintSvg (items: IgeUiPaintItem[], svg: IgeUiElement, x: number, y: number, w: number, h: number, ctx: IgeUiSvgContext, current: IgeCssColor): void {
	const style = svg._computed ?? {};
	let clip = ctx.clip;
	// (overflow: hidden, as the user agent has it, clips to the viewport)
	if (styleValue(style, "overflow") !== "visible" || styleValue(style, "overflow-x") === "hidden") clip = intersect(clip, [x, y, x + w, y + h]);
	const root = svgViewport(svg, x, y, w, h);
	const base = svgProps(svg, SVG_INHERITED);
	const colorOf = (cs: IgeUiComputedStyle) => parseColor(styleValue(cs, "color")) ?? current;
	const walk = (parent: IgeUiElement, props: SvgProps, m: IgeCssMatrix, opacity: number, clipHere: IgeUiClip) => {
		for (const real of parent.children) {
			// (As it is now, its <animate>s at their values)
			const c = animated(real, svg);
			const cs = c._computed ?? {};
			if (styleValue(cs, "display") === "none" || c.getAttribute("display") === "none") continue;
			const name = c.localName;
			if (SVG_UNRENDERED.has(name)) continue;
			const p = svgProps(c, props);
			const t = svgTransform(c.getAttribute("transform"));
			const mm = t ? multiply(m, t) : m;
			const op = opacity * (resolveNumber(styleValue(cs, "opacity")) ?? 1) * (cs.opacity === undefined && c.hasAttribute("opacity") ? Number(c.getAttribute("opacity")) || 0 : 1);
			if (op <= 0) continue;
			if (name === "g" || name === "a" || name === "svg") {
				walk(c, p, mm, op, clipHere);
				continue;
			}
			if (name === "text") {
				if (styleValue(cs, "visibility") !== "hidden") svgTextRun(items, c, p, mm, op, clipHere, ctx.matrix, colorOf(cs));
				continue;
			}
			if (!SHAPES.has(name)) continue;
			if (styleValue(cs, "visibility") === "hidden") continue;
			shape(items, svg, c, p, cs, mm, op, clipHere, ctx.matrix, colorOf(cs), (pattern, bounds) => {
				// A pattern's tile, repeated over the shape's bounds (user units), each copy clipped to its tile
				const units = pattern.getAttribute("patternUnits") ?? "objectBoundingBox";
				const num = (a: string) => {
					const v = pattern.getAttribute(a);
					if (!v) return 0;
					return units === "objectBoundingBox" ? (v.endsWith("%") ? parseFloat(v) / 100 : Number(v) || 0) : Number(v) || 0;
				};
				let px = num("x"), py = num("y"), pw = num("width"), ph = num("height");
				if (units === "objectBoundingBox") {
					const bw = bounds[2] - bounds[0], bh = bounds[3] - bounds[1];
					px = bounds[0] + px * bw;
					py = bounds[1] + py * bh;
					pw *= bw;
					ph *= bh;
				}
				if (pw <= 0 || ph <= 0) return;
				const i0 = Math.floor((bounds[0] - px) / pw), i1 = Math.ceil((bounds[2] - px) / pw);
				const j0 = Math.floor((bounds[1] - py) / ph), j1 = Math.ceil((bounds[3] - py) / ph);
				// (A sanity limit on tiles)
				if ((i1 - i0) * (j1 - j0) > 20000) return;
				const pt = svgTransform(pattern.getAttribute("patternTransform"));
				const pm = pt ? multiply(mm, pt) : mm;
				const tileProps = svgProps(pattern, SVG_INHERITED);
				for (let i = i0; i < i1; i++) {
					for (let j = j0; j < j1; j++) {
						const tx = px + i * pw, ty = py + j * ph;
						const tm = multiply(pm, [1, 0, 0, 1, tx, ty]);
						// The tile's rectangle (and the shape's bounds) in UI px
						const a = apply(pm, Math.max(tx, bounds[0]), Math.max(ty, bounds[1])), b = apply(pm, Math.min(tx + pw, bounds[2]), Math.min(ty + ph, bounds[3]));
						const tileClip = intersect(clipHere, [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]);
						if (tileClip && (tileClip[2] <= tileClip[0] || tileClip[3] <= tileClip[1])) continue;
						walk(pattern, tileProps, tm, op, tileClip);
					}
				}
			});
		}
	};
	walk(svg, base, root, ctx.opacity, clip);
}

function intersect (a: IgeUiClip, b: IgeUiClip): IgeUiClip {
	if (!a) return b;
	if (!b) return a;
	return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
}

/** A paint (fill or stroke) value: a colour, a pattern or gradient (url(#id)), or nothing. */
function paintOf (value: string, el: IgeUiElement, current: IgeCssColor): { color?: IgeCssColor; pattern?: IgeUiElement; gradient?: IgeCssGradient } {
	const v = value.trim();
	if (!v || v === "none") return {};
	const url = /^url\(\s*["']?#([^"')]+)["']?\s*\)\s*(.*)$/.exec(v);
	if (url) {
		const ref = findById(el, url[1]);
		if (ref?.localName === "pattern") return { pattern: ref };
		const gradient = ref ? svgGradient(ref, current) : undefined;
		if (gradient) return { gradient };
		// (A gradient or something missing: its fallback colour, if it gave one)
		return url[2] ? { color: parseColor(url[2], current) } : {};
	}
	return { color: parseColor(v === "currentColor" ? "currentcolor" : v, current) };
}

function findById (el: IgeUiElement, id: string): IgeUiElement | null {
	let top: IgeUiElement = el;
	while (top.parentNode) top = top.parentNode;
	const doc = el.ownerDocument as unknown as { getElementById?: (id: string) => IgeUiElement | null };
	return doc.getElementById?.(id) ?? (top.querySelector(`#${id.replace(/([^\w-])/g, "\\$1")}`) as IgeUiElement | null);
}

/** A `<text>`'s run (measured at layout: SVG_TEXT) in its fill, scaled with the drawing (not turned with it). */
function svgTextRun (items: IgeUiPaintItem[], el: IgeUiElement, p: SvgProps, m: IgeCssMatrix, opacity: number, clip: IgeUiClip, matrix: IgeCssMatrix | undefined, current: IgeCssColor): void {
	const t = SVG_TEXT.get(el);
	if (!t || !t.text) return;
	const fill = paintOf(p.fill, el, current);
	const color = fill.color ?? (fill.gradient ? svgGradientMiddle(fill.gradient) : undefined);
	if (!color || color.a <= 0) return;
	const s = scaleOf(m);
	const [x, y] = apply(m, t.x, t.y);
	const fillOpacity = clamp01(resolveNumber(p["fill-opacity"]) ?? 1);
	const font = { ...t.font, size: t.font.size * s };
	if (t.glyphs) {
		// On a path: each glyph on its own, turned where it sits (through the drawing: its turn worked out on the page)
		for (const g of t.glyphs) {
			const [gx, gy] = apply(m, g.x, g.y);
			const [tx, ty] = apply(m, g.x + Math.cos(g.angle), g.y + Math.sin(g.angle));
			const a = Math.atan2(ty - gy, tx - gx), c = Math.cos(a), sn = Math.sin(a);
			// (Turned about where it sits, so it keeps the page's pixels and the clip round it stays put)
			const turn: IgeCssMatrix = [c, sn, -sn, c, gx - c * gx + sn * gy, gy - sn * gx - c * gy];
			items.push({ op: "text", text: g.ch, x: gx, y: gy, w: g.w * s, font, letterSpacing: 0, color, opacity: opacity * fillOpacity, clip, matrix: matrix ? multiply(matrix, turn) : turn, el: unanimated(el) });
		}
		return;
	}
	items.push({ op: "text", text: t.text, x, y, w: t.w * s, font, letterSpacing: t.letterSpacing * s, color, opacity: opacity * fillOpacity, clip, matrix, el: unanimated(el) });
}

function shape (
	items: IgeUiPaintItem[], svg: IgeUiElement, el: IgeUiElement, p: SvgProps, cs: IgeUiComputedStyle, m: IgeCssMatrix, opacity: number, clip: IgeUiClip, matrix: IgeCssMatrix | undefined,
	current: IgeCssColor, pattern: (pattern: IgeUiElement, bounds: [number, number, number, number]) => void
): void {
	const fill = paintOf(p.fill, el, current), stroke = paintOf(p.stroke, el, current);
	// (A stroke in a gradient: its middle colour)
	if (stroke.gradient) stroke.color = svgGradientMiddle(stroke.gradient);
	const fillOpacity = clamp01(resolveNumber(p["fill-opacity"]) ?? 1), strokeOpacity = clamp01(resolveNumber(p["stroke-opacity"]) ?? 1);
	const nonScaling = (cs["vector-effect"] ?? el.getAttribute("vector-effect")) === "non-scaling-stroke";
	const swUser = Math.max(0, parseFloat(p["stroke-width"]) || 0);
	const sw = nonScaling ? swUser : swUser * scaleOf(m);
	const axisAligned = Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9;
	const uniform = axisAligned && Math.abs(Math.abs(m[0]) - Math.abs(m[3])) < 1e-9;
	const num = (a: string) => Number(el.getAttribute(a) ?? 0) || 0;
	const name = el.localName;
	// (Where the drawing puts them, not snapped to device pixels as boxes are)
	const at = { clip, matrix, el: unanimated(el), exact: true };
	// Circles and plain rectangles as boxes (exact, smooth); everything else as triangles and lines
	// (A stroke in a gradient goes the long way: drawn in pieces, below)
	if (!stroke.gradient && ((name === "circle" && uniform) || (name === "rect" && axisAligned && !el.hasAttribute("rx") && !el.hasAttribute("ry")))) {
		let bx: number, by: number, bw: number, bh: number, r: number;
		if (name === "circle") {
			const [cx, cy] = apply(m, num("cx"), num("cy"));
			r = num("r") * Math.abs(m[0]);
			if (r <= 0) return;
			[bx, by, bw, bh] = [cx - r, cy - r, r * 2, r * 2];
		} else {
			const a = apply(m, num("x"), num("y")), b = apply(m, num("x") + num("width"), num("y") + num("height"));
			[bx, by, bw, bh] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])];
			r = 0;
			if (bw <= 0 || bh <= 0) return;
		}
		if (fill.color && fill.color.a > 0) items.push({ op: "box", x: bx, y: by, w: bw, h: bh, radii: [r, r, r, r], color: fill.color, opacity: opacity * fillOpacity, ...at });
		else if (fill.gradient) items.push({ op: "box", x: bx, y: by, w: bw, h: bh, radii: [r, r, r, r], gradient: fill.gradient, opacity: opacity * fillOpacity, ...at });
		else if (fill.pattern) {
			const b = svgShapeBounds(el);
			if (b) pattern(fill.pattern, b);
		}
		if (stroke.color && stroke.color.a > 0 && sw > 0) {
			const o = sw / 2, rr = r > 0 ? r + o : 0;
			items.push({ op: "box", x: bx - o, y: by - o, w: bw + sw, h: bh + sw, radii: [rr, rr, rr, rr], color: stroke.color, border: sw, opacity: opacity * strokeOpacity, ...at });
		}
		return;
	}
	const geometry = svgShapeGeometry(el);
	if (!geometry?.length) return;
	// (A line never fills; a polyline and an open path fill as if closed)
	if (name !== "line") {
		const rule = p["fill-rule"] === "evenodd" ? "evenodd" : "nonzero";
		if (fill.color && fill.color.a > 0) {
			const { tris, edges } = fillTriangles(geometry, m, rule);
			if (tris.length) items.push({ op: "fill", tris, edges, color: fill.color, opacity: opacity * fillOpacity, ...at });
		} else if (fill.gradient) {
			const { tris, edges } = fillTriangles(geometry, m, rule);
			if (tris.length) paintGradientTriangles(items, { op: "fill", tris, edges, opacity: opacity * fillOpacity, ...at }, fill.gradient);
		} else if (fill.pattern) {
			const b = svgShapeBounds(el);
			if (b) pattern(fill.pattern, b);
		}
	}
	if (stroke.color && stroke.color.a > 0 && sw > 0) {
		const cap = p["stroke-linecap"] === "round" ? "round" : p["stroke-linecap"] === "square" ? "square" : "butt";
		const join = p["stroke-linejoin"] === "round" ? "round" : p["stroke-linejoin"] === "bevel" ? "bevel" : "miter";
		const miterLimit = Number(p["stroke-miterlimit"]) || 4;
		for (const s of geometry) {
			const pts: number[] = [];
			for (let i = 0; i + 1 < s.points.length; i += 2) pts.push(...apply(m, s.points[i], s.points[i + 1]));
			// (A closed subpath's repeated last point dropped: it closes round)
			if (s.closed && pts.length >= 6 && Math.abs(pts[0] - pts[pts.length - 2]) < 1e-9 && Math.abs(pts[1] - pts[pts.length - 1]) < 1e-9) pts.length -= 2;
			if (pts.length < 4) continue;
			if (stroke.gradient) {
				gradientStroke(items, pts, !!s.closed, stroke.gradient, shapeBox(el, m), { width: sw, cap, join, opacity: opacity * strokeOpacity, ...at });
				continue;
			}
			items.push({ op: "line", points: pts, width: sw, color: stroke.color, opacity: opacity * strokeOpacity, closed: s.closed || undefined, cap, join, miterLimit, ...at });
		}
	}
	void svg;
}

/** A shape's bounding box through `m` (UI px: x, y, w, h), as a gradient on it is laid over. */
function shapeBox (el: IgeUiElement, m: IgeCssMatrix): [number, number, number, number] {
	const b = svgShapeBounds(el);
	if (!b) return [0, 0, 1, 1];
	const pts = [apply(m, b[0], b[1]), apply(m, b[2], b[1]), apply(m, b[0], b[3]), apply(m, b[2], b[3])];
	const x0 = Math.min(...pts.map((q) => q[0])), y0 = Math.min(...pts.map((q) => q[1]));
	return [x0, y0, Math.max(...pts.map((q) => q[0])) - x0, Math.max(...pts.map((q) => q[1])) - y0];
}

/** A gradient's colour at a point (UI px) over a box: where the point falls along its line (linear) or out from its middle (radial). */
export function gradientColorAtPoint (g: IgeCssGradient, box: [number, number, number, number], x: number, y: number): IgeCssColor {
	const [bx, by, bw, bh] = box;
	let t: number;
	if (g.type === "radial") {
		const cx = bx + (g.cx ?? 0.5) * bw, cy = by + (g.cy ?? 0.5) * bh;
		const rx = (g.radii ? g.radii[0] : 0.5) * bw, ry = (g.radii ? g.radii[1] : 0.5) * bh;
		t = Math.hypot((x - cx) / Math.max(1e-6, rx), (y - cy) / Math.max(1e-6, ry));
	} else {
		const a = ((g.angle ?? 180) * Math.PI) / 180, ux = Math.sin(a), uy = -Math.cos(a);
		const len = Math.abs(bw * ux) + Math.abs(bh * uy);
		t = ((x - bx - bw / 2) * ux + (y - by - bh / 2) * uy) / Math.max(1e-6, len) + 0.5;
	}
	const stops = g.stops;
	let k = 0;
	while (k < stops.length - 1 && (stops[k + 1].at ?? 1) < t) k++;
	const s0 = stops[k], s1 = stops[Math.min(k + 1, stops.length - 1)];
	const p0 = s0.at ?? 0, p1 = s1.at ?? 1;
	const f = t <= p0 ? 0 : t >= p1 ? 1 : (t - p0) / Math.max(1e-6, p1 - p0);
	const c0 = s0.color, c1 = s1.color;
	const a = c0.a + (c1.a - c0.a) * f;
	// (An SVG gradient's colours mixed as they are; a CSS one's premultiplied)
	if (g.unpremultiplied || a <= 0) return { r: c0.r + (c1.r - c0.r) * f, g: c0.g + (c1.g - c0.g) * f, b: c0.b + (c1.b - c0.b) * f, a };
	const mix = (p: number, q: number) => (p * c0.a + (q * c1.a - p * c0.a) * f) / a;
	return { r: mix(c0.r, c1.r), g: mix(c0.g, c1.g), b: mix(c0.b, c1.b), a };
}

/**
 * A stroke in a gradient: the line in short pieces, each in the gradient's colour at its middle, over the shape's box.
 * The pieces meet end to end along a segment; at a corner, rounded or square ends stand in for the join; the
 * line's own ends keep its cap.
 */
function gradientStroke (items: IgeUiPaintItem[], pts: number[], closed: boolean, g: IgeCssGradient, box: [number, number, number, number], line: { width: number; cap: "butt" | "round" | "square"; join: "miter" | "round" | "bevel"; opacity: number; clip: IgeUiClip; matrix?: IgeCssMatrix; el: IgeUiElement; exact: boolean }): void {
	// (Over a box with no width or no height a gradient isn't drawn at all, as SVG has it)
	if (box[2] <= 1e-6 || box[3] <= 1e-6) return;
	const n = pts.length / 2;
	const segs = closed ? n : n - 1;
	const corner = line.join === "round" ? "round" : "square";
	const { width, cap, join, ...rest } = line;
	void join;
	for (let i = 0; i < segs; i++) {
		const j = (i + 1) % n;
		const x0 = pts[i * 2], y0 = pts[i * 2 + 1], x1 = pts[j * 2], y1 = pts[j * 2 + 1];
		const len = Math.hypot(x1 - x0, y1 - y0);
		const k = Math.max(1, Math.ceil(len / 3));
		for (let q = 0; q < k; q++) {
			const a = q / k, b = (q + 1) / k;
			const ax = x0 + (x1 - x0) * a, ay = y0 + (y1 - y0) * a, bx = x0 + (x1 - x0) * b, by = y0 + (y1 - y0) * b;
			const startEnd = q === 0 ? (!closed && i === 0 ? cap : corner) : "butt";
			const endEnd = q === k - 1 ? (!closed && i === segs - 1 ? cap : corner) : "butt";
			const color = gradientColorAtPoint(g, box, (ax + bx) / 2, (ay + by) / 2);
			if (color.a > 0) items.push({ op: "line", points: [ax, ay, bx, by], width, color, caps: [startEnd, endEnd], ...rest });
		}
	}
}

function clamp01 (v: number): number {
	return Math.max(0, Math.min(1, v));
}
