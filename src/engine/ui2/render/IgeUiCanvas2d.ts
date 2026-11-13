/**
 * A 2D canvas drawn by the engine: the part of CanvasRenderingContext2D a
 * game's screens use (Starflight's charts, maps, radar), recorded as the UI
 * painter's own items (boxes, lines, filled triangles, text, images) instead
 * of pixels in a page canvas. It needs no browser canvas, so it's what the
 * host seam's `surface` gives where there's none (a native build), and on the
 * web it draws in the UI's own pass, sharp at any scale.
 *
 * What's there:
 * - paths: moveTo, lineTo, arc, ellipse, quadratic and cubic curves, rect,
 *   roundRect, closePath; fill (nonzero or evenodd, as the SVG shapes are) and
 *   stroke (width, caps, joins, miter limit, dashes and their offset);
 * - a path that's only whole circles is drawn as the painter's round boxes
 *   (smooth edges, a ring for a stroke), as the SVG shapes are;
 * - fillRect, strokeRect, clearRect (the whole canvas, or what's drawn
 *   wholly inside the rectangle);
 * - colours, and linear, radial and conic gradients (a box takes them as
 *   they are; a path's fill a linear one in bands, a radial one its middle
 *   colour; a stroke a linear one along it, piece by piece);
 * - text: fillText and strokeText (as a halo), font, textAlign,
 *   textBaseline, measureText;
 * - transforms (translate, rotate, scale, transform, setTransform,
 *   resetTransform, getTransform), save and restore;
 * - globalAlpha, globalCompositeOperation "lighter" (added light),
 *   shadows (a drop shadow round what's drawn; a text shadow on text);
 * - clip: to the path (a rectangle as the painter's own clip; a circle, an
 *   ellipse or a roundRect on the axes as a rounded one, smooth, IgeUiRoundClip; any
 *   other shape as a mask the renderer keeps in its stencil, with a sharp
 *   edge), clips in clips keeping to both;
 * - drawImage of an engine canvas or image, or a page canvas or image, the
 *   whole picture or part of it (another canvas the engine draws: what's
 *   put on it with putImageData);
 *
 * - putImageData, getImageData and createImageData: the pixels kept in a
 *   pixel layer (IgeUiPixelSurface) drawn where it was first put since the
 *   canvas was cleared (getImageData reads that layer, not what's drawn as
 *   shapes).
 *
 * Not there: patterns, filters, isPointInPath, Path2D.
 */
import { type IgeCssColor, type IgeCssGradient, type IgeCssMatrix, IDENTITY, multiply, parseColor } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeUiClip, IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { fillTriangles } from "@/engine/ui2/render/IgeUiSvg";
import { paintGradientTriangles, svgGradientMiddle } from "@/engine/ui2/render/IgeUiSvgGradient";
import { gradientColorAt } from "@/engine/ui2/render/IgeUiTextClip";
import { fontWeight, type IgeUiFontSpec } from "@/engine/ui2/text/IgeUiFonts";
import type { IgeUiHost, IgeUiHostSurface, IgeUiSurface } from "@/engine/ui2/IgeUiHost";
import { type IgeUiImageData, IgeUiPixelSurface } from "@/engine/ui2/render/IgeUiPixelSurface";
import { combineRounds, type IgeUiRound, intersectClips, roundThrough, withRound } from "@/engine/ui2/render/IgeUiRoundClip";

type M = [number, number, number, number, number, number];
type Cap = "butt" | "round" | "square";
type Join = "miter" | "round" | "bevel";

/** What text needs measuring with (the UI's fonts). */
export interface IgeUiCanvas2dFonts {
	measure (text: string, font: IgeUiFontSpec): number;
	metrics (font: IgeUiFontSpec): { ascent: number; descent: number };
}

/** A gradient made by the context (createLinearGradient, createRadialGradient, createConicGradient). */
export class IgeUiCanvas2dGradient {
	stops: { at: number; color: IgeCssColor }[] = [];

	constructor (readonly kind: "linear" | "radial" | "conic", readonly args: number[]) {}

	addColorStop (offset: number, color: string): void {
		const c = parseColor(color);
		if (!c || !(offset >= 0 && offset <= 1)) return;
		this.stops.push({ at: offset, color: c });
		this.stops.sort((a, b) => a.at - b.at);
	}
}

interface State {
	m: M;
	fill: string | IgeUiCanvas2dGradient;
	stroke: string | IgeUiCanvas2dGradient;
	lineWidth: number;
	lineCap: Cap;
	lineJoin: Join;
	miterLimit: number;
	dash: number[];
	dashOffset: number;
	alpha: number;
	composite: string;
	font: string;
	textAlign: string;
	textBaseline: string;
	shadowBlur: number;
	shadowColor: string;
	shadowX: number;
	shadowY: number;
	clip: IgeUiClip;
	/** Clips of any shape open (their triangles, in pixels), the innermost last: closed as the state they're in is restored. */
	masks: number[][];
	smoothing: boolean;
}

interface Sub {
	/** Points in the canvas's pixels (the transform applied as they were given). */
	pts: number[];
	closed: boolean;
	/** The whole subpath is one full circle (centre and radius in pixels). */
	circle?: [number, number, number];
	/** The whole subpath is one full ellipse on the axes, a circle too (centre and radii in pixels): a clip to it is a rounded one. */
	oval?: [number, number, number, number];
	/** The whole subpath is a rounded rectangle on the axes (roundRect, in pixels): a clip to it is a rounded one. */
	rrect?: IgeUiRound;
}

/** A drawn item, in the canvas's pixels; `own` items keep their coordinates in the space their matrix maps from. */
interface Drawn {
	item: IgeUiPaintItem;
	own?: boolean;
}

const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const scaleOf = (m: M) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
const axisAligned = (m: M) => Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 && m[0] > 0 && m[3] > 0;
const similar = (m: M) => Math.abs(m[0] - m[3]) < 1e-6 && Math.abs(m[1] + m[2]) < 1e-6;

/**
 * A canvas `font` ("600 12px 'Share Tech Mono', monospace") as the UI's font spec: its family the list as written
 * (quotes and fallbacks kept, as the UI's text has its font-family), so it's a font a canvas takes back when it's
 * measured and drawn ("600 13px Exo 2" isn't one: a canvas keeps the font it had, and the text came out in that).
 */
export function parseCanvasFont (font: string): IgeUiFontSpec {
	const m = /^\s*((?:(?:italic|oblique|normal|small-caps|bold|bolder|lighter|[1-9]00)\s+)*)([\d.]+)px(?:\s*\/\s*[^\s]+)?\s+(.+)$/i.exec(font);
	if (!m) return { family: "sans-serif", size: 10, weight: 400, style: "normal" };
	const words = m[1].trim().split(/\s+/).filter(Boolean);
	const weight = words.find((w) => /^(bold|bolder|lighter|[1-9]00)$/.test(w));
	return {
		family: m[3].trim(),
		size: Number(m[2]),
		weight: weight === "lighter" ? 300 : fontWeight(weight),
		style: words.includes("italic") || words.includes("oblique") ? "italic" : "normal"
	};
}

/** The dashes of a polyline (pixels): each dash its own run of points. */
function dashRuns (pts: number[], closed: boolean, dash: number[], offset: number): number[][] {
	const p = closed && pts.length >= 4 ? [...pts, pts[0], pts[1]] : pts;
	const total = dash.reduce((a, b) => a + b, 0);
	if (!(total > 0)) return [p];
	const runs: number[][] = [];
	let i = 0, left = 0, on = true;
	// (The offset: how far into the pattern the line starts)
	let off = ((offset % total) + total) % total;
	while (off > 0) {
		if (off >= dash[i]) {
			off -= dash[i];
			i = (i + 1) % dash.length;
			on = !on;
		} else {
			left = dash[i] - off;
			off = 0;
		}
	}
	if (!left) left = dash[i];
	let run: number[] | null = on ? [p[0], p[1]] : null;
	for (let k = 0; k + 3 < p.length; k += 2) {
		let x = p[k], y = p[k + 1];
		const ex = p[k + 2], ey = p[k + 3];
		let seg = Math.hypot(ex - x, ey - y);
		while (seg > 1e-9) {
			const step = Math.min(seg, left);
			const t = step / seg;
			x += (ex - x) * t;
			y += (ey - y) * t;
			seg -= step;
			left -= step;
			if (run) run.push(x, y);
			if (left <= 1e-9) {
				if (run && run.length >= 4) runs.push(run);
				on = !on;
				i = (i + 1) % dash.length;
				left = dash[i];
				run = on ? [x, y] : null;
			}
		}
	}
	if (run && run.length >= 4) runs.push(run);
	return runs;
}

/**
 * The context. `size` gives the canvas's bitmap size (its width and height attributes): when it changes, what's
 * drawn and the state are reset, as a canvas's are. `changed` is told when something's drawn (the element repaints).
 */
export class IgeUiCanvas2d {
	_drawn: Drawn[] = [];
	_state: State = IgeUiCanvas2d._fresh();
	_stack: State[] = [];
	_subs: Sub[] = [];
	_size: [number, number];
	_warned = new Set<string>();
	/** putImageData's pixels, and whether the layer's drawn (an image item) since the canvas was last cleared. */
	_pixels?: IgeUiPixelSurface;
	_pixelsDrawn = false;

	constructor (readonly canvas: unknown, readonly fonts: IgeUiCanvas2dFonts, readonly size: () => [number, number], readonly changed: () => void = () => undefined) {
		const [w, h] = size();
		this._size = [w, h];
	}

	static _fresh (): State {
		return {
			m: [1, 0, 0, 1, 0, 0], fill: "#000", stroke: "#000", lineWidth: 1, lineCap: "butt", lineJoin: "miter", miterLimit: 10, dash: [], dashOffset: 0,
			alpha: 1, composite: "source-over", font: "10px sans-serif", textAlign: "start", textBaseline: "alphabetic", shadowBlur: 0, shadowColor: "rgba(0, 0, 0, 0)",
			shadowX: 0, shadowY: 0, clip: null, masks: [], smoothing: true
		};
	}

	/** A new bitmap size clears it all, as a canvas's width or height set does. */
	_sized (): void {
		const [w, h] = this.size();
		if (w === this._size[0] && h === this._size[1]) return;
		this._size = [w, h];
		this._drawn = [];
		this._state = IgeUiCanvas2d._fresh();
		this._stack = [];
		this._subs = [];
		this._pixels = undefined;
		this._pixelsDrawn = false;
	}

	_push (item: IgeUiPaintItem, own = false): void {
		this._drawn.push({ item, own });
	}

	_unsupported (what: string): void {
		if (this._warned.has(what)) return;
		this._warned.add(what);
		if (typeof console !== "undefined") console.warn(`IgeUiCanvas2d: ${what} isn't drawn by the engine's canvas`);
	}

	// ------------------------------------------------------------ state

	get fillStyle (): string | IgeUiCanvas2dGradient { return this._state.fill; }
	set fillStyle (v: string | IgeUiCanvas2dGradient) { if (typeof v === "string" || v instanceof IgeUiCanvas2dGradient) this._state.fill = v; else this._unsupported("a pattern"); }
	get strokeStyle (): string | IgeUiCanvas2dGradient { return this._state.stroke; }
	set strokeStyle (v: string | IgeUiCanvas2dGradient) { if (typeof v === "string" || v instanceof IgeUiCanvas2dGradient) this._state.stroke = v; else this._unsupported("a pattern"); }
	get lineWidth (): number { return this._state.lineWidth; }
	set lineWidth (v: number) { if (v > 0 && Number.isFinite(v)) this._state.lineWidth = v; }
	get lineCap (): Cap { return this._state.lineCap; }
	set lineCap (v: Cap) { if (v === "butt" || v === "round" || v === "square") this._state.lineCap = v; }
	get lineJoin (): Join { return this._state.lineJoin; }
	set lineJoin (v: Join) { if (v === "miter" || v === "round" || v === "bevel") this._state.lineJoin = v; }
	get miterLimit (): number { return this._state.miterLimit; }
	set miterLimit (v: number) { if (v > 0) this._state.miterLimit = v; }
	get lineDashOffset (): number { return this._state.dashOffset; }
	set lineDashOffset (v: number) { if (Number.isFinite(v)) this._state.dashOffset = v; }
	get globalAlpha (): number { return this._state.alpha; }
	set globalAlpha (v: number) { if (v >= 0 && v <= 1) this._state.alpha = v; }
	get globalCompositeOperation (): string { return this._state.composite; }
	set globalCompositeOperation (v: string) {
		if (v !== "source-over" && v !== "lighter") this._unsupported(`globalCompositeOperation ${v}`);
		this._state.composite = v;
	}
	get font (): string { return this._state.font; }
	set font (v: string) { this._state.font = v; }
	get textAlign (): string { return this._state.textAlign; }
	set textAlign (v: string) { this._state.textAlign = v; }
	get textBaseline (): string { return this._state.textBaseline; }
	set textBaseline (v: string) { this._state.textBaseline = v; }
	get shadowBlur (): number { return this._state.shadowBlur; }
	set shadowBlur (v: number) { if (v >= 0) this._state.shadowBlur = v; }
	get shadowColor (): string { return this._state.shadowColor; }
	set shadowColor (v: string) { this._state.shadowColor = v; }
	get shadowOffsetX (): number { return this._state.shadowX; }
	set shadowOffsetX (v: number) { this._state.shadowX = v; }
	get shadowOffsetY (): number { return this._state.shadowY; }
	set shadowOffsetY (v: number) { this._state.shadowY = v; }
	get imageSmoothingEnabled (): boolean { return this._state.smoothing; }
	set imageSmoothingEnabled (v: boolean) { this._state.smoothing = !!v; }
	/** (Taken, not used: the engine's own sampling) */
	imageSmoothingQuality = "low";
	/** (Taken, not used) */
	filter = "none";

	save (): void {
		this._stack.push({ ...this._state, m: [...this._state.m] as M, dash: [...this._state.dash], masks: [...this._state.masks] });
	}

	restore (): void {
		const s = this._stack.pop();
		if (!s) return;
		// (The clips of any shape made since it was saved: closed, the innermost first)
		const masks = this._state.masks;
		for (let i = masks.length - 1; i >= s.masks.length; i--) this._push({ op: "group", open: false, mask: masks[i], opacity: 1, clip: null });
		this._state = s;
	}

	setLineDash (dash: number[]): void {
		if (dash.some((d) => !(d >= 0) || !Number.isFinite(d))) return;
		this._state.dash = dash.length % 2 ? [...dash, ...dash] : [...dash];
	}

	getLineDash (): number[] {
		return [...this._state.dash];
	}

	// ------------------------------------------------------------ transforms

	_mul (n: M): void {
		this._state.m = multiply(this._state.m, n) as M;
	}

	translate (x: number, y: number): void { this._mul([1, 0, 0, 1, x, y]); }
	scale (x: number, y: number): void { this._mul([x, 0, 0, y, 0, 0]); }
	rotate (a: number): void {
		const c = Math.cos(a), s = Math.sin(a);
		this._mul([c, s, -s, c, 0, 0]);
	}

	transform (a: number, b: number, c: number, d: number, e: number, f: number): void { this._mul([a, b, c, d, e, f]); }

	setTransform (a?: number | { a: number; b: number; c: number; d: number; e: number; f: number }, b = 0, c = 0, d = 1, e = 0, f = 0): void {
		if (a === undefined) this._state.m = [1, 0, 0, 1, 0, 0];
		else if (typeof a === "object") this._state.m = [a.a, a.b, a.c, a.d, a.e, a.f];
		else this._state.m = [a, b, c, d, e, f];
	}

	resetTransform (): void { this._state.m = [1, 0, 0, 1, 0, 0]; }

	getTransform (): { a: number; b: number; c: number; d: number; e: number; f: number } {
		const [a, b, c, d, e, f] = this._state.m;
		return { a, b, c, d, e, f };
	}

	// ------------------------------------------------------------ paths

	beginPath (): void {
		this._subs = [];
	}

	_cur (): Sub | undefined {
		return this._subs[this._subs.length - 1];
	}

	moveTo (x: number, y: number): void {
		this._subs.push({ pts: apply(this._state.m, x, y), closed: false });
	}

	lineTo (x: number, y: number): void {
		const s = this._cur();
		if (!s || s.closed) return this.moveTo(x, y);
		s.pts.push(...apply(this._state.m, x, y));
		s.circle = undefined;
		s.oval = undefined;
	}

	closePath (): void {
		const s = this._cur();
		if (!s || s.pts.length < 2) return;
		s.closed = true;
		// (The next segment starts a new subpath where this one began)
		this._subs.push({ pts: [s.pts[0], s.pts[1]], closed: false });
	}

	rect (x: number, y: number, w: number, h: number): void {
		const m = this._state.m;
		this._subs.push({ pts: [...apply(m, x, y), ...apply(m, x + w, y), ...apply(m, x + w, y + h), ...apply(m, x, y + h)], closed: true });
		this._subs.push({ pts: apply(m, x, y), closed: false });
	}

	/**
	 * A rectangle with rounded corners, as the standard has it: `radii` one to four (a number, or { x, y } for an
	 * elliptical corner), shared out tl, tr, br, bl as border-radius shares them, scaled down together where they'd
	 * overlap; a negative width or height flips it (and its corners). On the axes, a clip to it is a rounded one.
	 */
	roundRect (x: number, y: number, w: number, h: number, radii: number | { x?: number; y?: number } | (number | { x?: number; y?: number })[] = 0): void {
		const list = (Array.isArray(radii) ? radii : [radii]).map((r): [number, number] => (typeof r === "number" ? [r, r] : [r?.x ?? 0, r?.y ?? 0]));
		// (A browser throws for these; nothing's added)
		if (list.length < 1 || list.length > 4 || list.some(([a, b]) => !(a >= 0 && b >= 0)) || ![x, y, w, h].every(Number.isFinite)) return;
		const [a, b = a, c = a, d = b] = list;
		let k: [number, number][] = [a, b, list.length === 2 ? a : c, list.length === 3 ? b : d];
		if (w < 0) {
			x += w;
			w = -w;
			k = [k[1], k[0], k[3], k[2]];
		}
		if (h < 0) {
			y += h;
			h = -h;
			k = [k[3], k[2], k[1], k[0]];
		}
		const fit = (len: number, r0: number, r1: number) => (r0 + r1 > len ? len / (r0 + r1) : 1);
		const f = Math.min(fit(w, k[0][0], k[1][0]), fit(h, k[1][1], k[2][1]), fit(w, k[2][0], k[3][0]), fit(h, k[0][1], k[3][1]));
		k = k.map(([rx, ry]) => [rx * f, ry * f]);
		const m = this._state.m;
		const pts: number[] = [];
		// Each corner a quarter of an ellipse round its centre, clockwise from the top-left's (segments within a fifth of a pixel)
		const corner = (cx: number, cy: number, [rx, ry]: [number, number], from: number, square: [number, number]) => {
			// (Either radius 0: a square corner)
			if (!(rx > 0 && ry > 0)) return void pts.push(...apply(m, square[0], square[1]));
			const r = Math.max(rx, ry) * scaleOf(m);
			const n = Math.max(2, Math.ceil(Math.PI / 2 / (2 * Math.acos(Math.max(-1, Math.min(1, 1 - 0.2 / Math.max(0.2, r)))))));
			for (let i = 0; i <= n; i++) {
				const t = from + (Math.PI / 2) * (i / n);
				pts.push(...apply(m, cx + rx * Math.cos(t), cy + ry * Math.sin(t)));
			}
		};
		corner(x + k[0][0], y + k[0][1], k[0], Math.PI, [x, y]);
		corner(x + w - k[1][0], y + k[1][1], k[1], Math.PI * 1.5, [x + w, y]);
		corner(x + w - k[2][0], y + h - k[2][1], k[2], 0, [x + w, y + h]);
		corner(x + k[3][0], y + h - k[3][1], k[3], Math.PI / 2, [x, y + h]);
		// (On the axes: its rounded shape in pixels, for a clip)
		const rrect = Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 ? roundThrough({ box: [x, y, x + w, y + h], rx: k.map((v) => v[0]) as [number, number, number, number], ry: k.map((v) => v[1]) as [number, number, number, number] }, m) : undefined;
		this._subs.push({ pts, closed: true, rrect });
		this._subs.push({ pts: apply(m, x, y), closed: false });
	}

	arc (x: number, y: number, r: number, start: number, end: number, ccw = false): void {
		this.ellipse(x, y, r, r, 0, start, end, ccw);
	}

	ellipse (x: number, y: number, rx: number, ry: number, rot: number, start: number, end: number, ccw = false): void {
		if (!(rx >= 0 && ry >= 0)) return;
		const TAU = Math.PI * 2;
		// The sweep as the standard has it: a whole turn or more is the whole ellipse, else the way round it says
		let sweep = end - start;
		if (!ccw && sweep >= TAU) sweep = TAU;
		else if (ccw && -sweep >= TAU) sweep = -TAU;
		else {
			sweep = ((sweep % TAU) + TAU) % TAU;
			if (ccw && sweep > 0) sweep -= TAU;
			if (!ccw && sweep === 0 && end !== start) sweep = 0;
		}
		const m = this._state.m;
		const full = Math.abs(Math.abs(sweep) - TAU) < 1e-9;
		const r = Math.max(rx, ry) * scaleOf(m);
		// (Segments short enough to stay within a fifth of a pixel of the curve)
		const step = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - 0.2 / Math.max(0.2, r))));
		const n = Math.max(full ? 16 : 2, Math.ceil(Math.abs(sweep) / Math.max(0.01, step)));
		const cr = Math.cos(rot), sr = Math.sin(rot);
		const at = (a: number) => {
			const ex = rx * Math.cos(a), ey = ry * Math.sin(a);
			return apply(m, x + ex * cr - ey * sr, y + ex * sr + ey * cr);
		};
		const [sx, sy] = at(start);
		let s = this._cur();
		const fresh = !s || s.closed || (s.pts.length === 2 && Math.hypot(s.pts[0] - sx, s.pts[1] - sy) < 1e-6);
		if (!s || s.closed) {
			s = { pts: [sx, sy], closed: false };
			this._subs.push(s);
		} else if (fresh) s.pts = [sx, sy];
		else s.pts.push(sx, sy);
		for (let i = 1; i <= n; i++) s.pts.push(...at(start + (sweep * i) / n));
		// A whole circle on its own (a uniform scale): drawn as a round box
		s.circle = fresh && full && rx === ry && similar(m) ? [...apply(m, x, y), rx * scaleOf(m)] as [number, number, number] : undefined;
		// (An ellipse on the axes: a circle, or one turned a quarter at a time under a transform that only moves and scales)
		const quarter = Math.abs(Math.round(rot / (Math.PI / 2)) * (Math.PI / 2) - rot) < 1e-9, across = Math.round(rot / (Math.PI / 2)) % 2 !== 0;
		const [ex, ey] = across ? [ry, rx] : [rx, ry];
		s.oval = !(fresh && full) ? undefined : s.circle ? [s.circle[0], s.circle[1], s.circle[2], s.circle[2]] : quarter && Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 ? [...apply(m, x, y), ex * Math.abs(m[0]), ey * Math.abs(m[3])] as [number, number, number, number] : undefined;
	}

	quadraticCurveTo (cx: number, cy: number, x: number, y: number): void {
		const s = this._cur();
		if (!s) return this.moveTo(x, y);
		const inv = this._inverse();
		const [x0, y0] = apply(inv, s.pts[s.pts.length - 2], s.pts[s.pts.length - 1]);
		const n = 16;
		for (let i = 1; i <= n; i++) {
			const t = i / n, u = 1 - t;
			this.lineTo(u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y);
		}
	}

	bezierCurveTo (c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
		const s = this._cur();
		if (!s) return this.moveTo(x, y);
		const inv = this._inverse();
		const [x0, y0] = apply(inv, s.pts[s.pts.length - 2], s.pts[s.pts.length - 1]);
		const n = 20;
		for (let i = 1; i <= n; i++) {
			const t = i / n, u = 1 - t;
			this.lineTo(u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x, u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y);
		}
	}

	_inverse (): M {
		const [a, b, c, d, e, f] = this._state.m;
		const det = a * d - b * c || 1;
		return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
	}

	// ------------------------------------------------------------ drawing

	_color (style: string | IgeUiCanvas2dGradient): IgeCssColor | undefined {
		return typeof style === "string" ? parseColor(style) : undefined;
	}

	/** The state's shadow, if it casts one. */
	_shadow (): { x: number; y: number; blur: number; color: IgeCssColor } | undefined {
		const s = this._state;
		const color = parseColor(s.shadowColor);
		if (!color || color.a <= 0 || (!s.shadowBlur && !s.shadowX && !s.shadowY)) return undefined;
		return { x: s.shadowX, y: s.shadowY, blur: s.shadowBlur, color };
	}

	/** Items drawn by `draw`, with the state's shadow round them (a drop shadow group) when it has one. */
	_shadowed (draw: () => void): void {
		this._sized();
		const shadow = this._shadow();
		if (shadow) this._push({ op: "group", open: true, shadows: [shadow], opacity: 1, clip: this._state.clip });
		draw();
		if (shadow) this._push({ op: "group", open: false, opacity: 1, clip: this._state.clip });
		this.changed();
	}

	/**
	 * A gradient made in the state's space as a CSS gradient over a box (pixels): its stops' colours mixed as they are,
	 * not premultiplied by their alpha, as a canvas's are (a colour fading to transparent black darkens on the way).
	 */
	_cssGradient (g: IgeUiCanvas2dGradient, box: [number, number, number, number]): IgeCssGradient | undefined {
		if (!g.stops.length) return undefined;
		const stops = g.stops.length === 1 ? [g.stops[0], { ...g.stops[0], at: 1 }] : g.stops;
		const m = this._state.m;
		const [bx, by, bw, bh] = box;
		if (g.kind === "linear") {
			const [x0, y0] = apply(m, g.args[0], g.args[1]), [x1, y1] = apply(m, g.args[2], g.args[3]);
			const dx = x1 - x0, dy = y1 - y0;
			if (!dx && !dy) return { type: "linear", angle: 180, stops: [{ color: stops[stops.length - 1].color, at: 0 }, { color: stops[stops.length - 1].color, at: 1 }] };
			const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
			const rad = (angle * Math.PI) / 180, ux = Math.sin(rad), uy = -Math.cos(rad);
			const len = Math.abs(bw * ux) + Math.abs(bh * uy) || 1;
			const cx = bx + bw / 2, cy = by + bh / 2;
			const along = (t: number) => ((x0 + dx * t - cx) * ux + (y0 + dy * t - cy) * uy) / len + 0.5;
			return { type: "linear", angle, stops: stops.map((s) => ({ color: s.color, at: along(s.at) })), unpremultiplied: true };
		}
		if (g.kind === "radial") {
			const [, , r0] = g.args;
			const [x1, y1] = apply(m, g.args[3], g.args[4]);
			const r1 = g.args[5];
			const k = scaleOf(m);
			if (!(r1 > 0)) return undefined;
			// (Concentric, as the screens make them: the inner circle's radius moves the stops out)
			return {
				type: "radial", shape: "ellipse", cx: (x1 - bx) / (bw || 1), cy: (y1 - by) / (bh || 1), radii: [(r1 * k) / (bw || 1), (r1 * k) / (bh || 1)],
				stops: stops.map((s) => ({ color: s.color, at: (r0 + s.at * (r1 - r0)) / r1 })), unpremultiplied: true
			};
		}
		const [start, x, y] = g.args;
		const [cx, cy] = apply(m, x, y);
		const turn = Math.atan2(m[1], m[0]);
		return { type: "conic", from: ((start + turn) * 180) / Math.PI + 90, cx: (cx - bx) / (bw || 1), cy: (cy - by) / (bh || 1), stops: stops.map((s) => ({ color: s.color, at: s.at })), unpremultiplied: true };
	}

	/** A filled box (pixels) in a style: its colour, or its gradient over it. */
	_box (x: number, y: number, w: number, h: number, radius: number, style: string | IgeUiCanvas2dGradient, border?: number): void {
		const s = this._state;
		const base = { op: "box" as const, x, y, w, h, radii: [radius, radius, radius, radius] as [number, number, number, number], opacity: s.alpha, clip: s.clip, exact: true, additive: s.composite === "lighter" || undefined, border };
		if (typeof style === "string") {
			const color = this._color(style);
			if (color) this._push({ ...base, color });
			return;
		}
		const gradient = this._cssGradient(style, [x, y, w, h]);
		if (!gradient) return;
		// (A ring takes its gradient's middle colour: a border has one colour)
		if (border !== undefined) this._push({ ...base, color: svgGradientMiddle(gradient) });
		else this._push({ ...base, gradient });
	}

	/** Filled by the rule: nonzero (the default) or evenodd, subpaths over each other or crossing themselves filled as one shape. */
	fill (rule: "nonzero" | "evenodd" | unknown = "nonzero"): void {
		const subs = this._subs.filter((s) => s.pts.length >= 4);
		if (!subs.length) return;
		const style = this._state.fill;
		this._shadowed(() => {
			// (Whole circles as round boxes; not by the evenodd rule, where one inside another is a hole)
			if (subs.every((s) => s.circle) && (rule !== "evenodd" || subs.length === 1)) {
				for (const s of subs) {
					const [cx, cy, r] = s.circle!;
					this._box(cx - r, cy - r, 2 * r, 2 * r, r, style);
				}
				return;
			}
			const { tris, edges } = fillTriangles(subs.map((s) => ({ points: s.pts, closed: true })), IDENTITY, rule === "evenodd" ? "evenodd" : "nonzero");
			if (!tris.length) return;
			const s = this._state;
			const base = { op: "fill" as const, tris, edges, opacity: s.alpha, clip: s.clip, additive: s.composite === "lighter" || undefined };
			if (typeof style === "string") {
				const color = this._color(style);
				if (color) this._push({ ...base, color });
				return;
			}
			let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
			for (let i = 0; i + 1 < tris.length; i += 2) {
				x0 = Math.min(x0, tris[i]);
				x1 = Math.max(x1, tris[i]);
				y0 = Math.min(y0, tris[i + 1]);
				y1 = Math.max(y1, tris[i + 1]);
			}
			const g = this._cssGradient(style, [x0, y0, x1 - x0, y1 - y0]);
			if (!g) return;
			const items: IgeUiPaintItem[] = [];
			paintGradientTriangles(items, base, g);
			for (const it of items) this._push(it);
		});
	}

	stroke (): void {
		const subs = this._subs.filter((s) => s.pts.length >= 4);
		if (!subs.length) return;
		const s = this._state;
		const width = s.lineWidth * scaleOf(s.m);
		const style = s.stroke;
		const dashed = s.dash.length > 0;
		this._shadowed(() => {
			for (const sub of subs) {
				if (sub.circle && !dashed) {
					const [cx, cy, r] = sub.circle;
					const o = r + width / 2;
					this._box(cx - o, cy - o, 2 * o, 2 * o, o, style, width);
					continue;
				}
				const runs = dashed ? dashRuns(sub.pts, sub.closed, s.dash.map((d) => d * scaleOf(s.m)), s.dashOffset * scaleOf(s.m)) : [sub.pts];
				for (const run of runs) this._line(run, !dashed && sub.closed, width, style);
			}
		});
	}

	/** A run of points stroked: in one colour, or a linear gradient along it a piece at a time. */
	_line (pts: number[], closed: boolean, width: number, style: string | IgeUiCanvas2dGradient): void {
		const s = this._state;
		const base = { op: "line" as const, width, opacity: s.alpha, clip: s.clip, cap: s.lineCap, join: s.lineJoin, miterLimit: s.miterLimit, additive: s.composite === "lighter" || undefined };
		if (typeof style === "string") {
			const color = this._color(style);
			if (color) this._push({ ...base, points: pts, closed, color });
			return;
		}
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (let i = 0; i + 1 < pts.length; i += 2) {
			x0 = Math.min(x0, pts[i]);
			x1 = Math.max(x1, pts[i]);
			y0 = Math.min(y0, pts[i + 1]);
			y1 = Math.max(y1, pts[i + 1]);
		}
		const box: [number, number, number, number] = [x0, y0, Math.max(1e-6, x1 - x0), Math.max(1e-6, y1 - y0)];
		const g = this._cssGradient(style, box);
		if (!g) return;
		if (g.type !== "linear") {
			this._push({ ...base, points: pts, closed, color: svgGradientMiddle(g) });
			return;
		}
		// (Along the gradient's line: each short piece in the colour where it is)
		const rad = ((g.angle ?? 180) * Math.PI) / 180, ux = Math.sin(rad), uy = -Math.cos(rad);
		const len = Math.abs(box[2] * ux) + Math.abs(box[3] * uy) || 1;
		const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
		const p = closed ? [...pts, pts[0], pts[1]] : pts;
		for (let k = 0; k + 3 < p.length; k += 2) {
			const n = Math.max(1, Math.ceil(Math.hypot(p[k + 2] - p[k], p[k + 3] - p[k + 1]) / 4));
			for (let i = 0; i < n; i++) {
				const ax = p[k] + ((p[k + 2] - p[k]) * i) / n, ay = p[k + 1] + ((p[k + 3] - p[k + 1]) * i) / n;
				const bx = p[k] + ((p[k + 2] - p[k]) * (i + 1)) / n, by = p[k + 1] + ((p[k + 3] - p[k + 1]) * (i + 1)) / n;
				const t = (((ax + bx) / 2 - cx) * ux + ((ay + by) / 2 - cy) * uy) / len + 0.5;
				const first = k === 0 && i === 0, last = k + 4 >= p.length && i === n - 1;
				this._push({ ...base, points: [ax, ay, bx, by], color: gradientColorAt(g, t, len), cap: undefined, caps: [first ? s.lineCap : "butt", last ? s.lineCap : "butt"] });
			}
		}
	}

	fillRect (x: number, y: number, w: number, h: number): void {
		const m = this._state.m;
		if (axisAligned(m)) {
			const [ax, ay] = apply(m, Math.min(x, x + w), Math.min(y, y + h));
			this._shadowed(() => this._box(ax, ay, Math.abs(w) * m[0], Math.abs(h) * m[3], 0, this._state.fill));
			return;
		}
		const saved = this._subs;
		this._subs = [];
		this.rect(x, y, w, h);
		this.fill();
		this._subs = saved;
	}

	strokeRect (x: number, y: number, w: number, h: number): void {
		const s = this._state, m = s.m;
		if (axisAligned(m) && !s.dash.length && s.lineJoin === "miter") {
			const lw = s.lineWidth * scaleOf(m);
			const [ax, ay] = apply(m, Math.min(x, x + w), Math.min(y, y + h));
			this._shadowed(() => this._box(ax - lw / 2, ay - lw / 2, Math.abs(w) * m[0] + lw, Math.abs(h) * m[3] + lw, 0, s.stroke, lw));
			return;
		}
		const saved = this._subs;
		this._subs = [];
		this.rect(x, y, w, h);
		this.stroke();
		this._subs = saved;
	}

	clearRect (x: number, y: number, w: number, h: number): void {
		this._sized();
		const [cw, ch] = this._size;
		const m = this._state.m;
		const [ax, ay] = apply(m, x, y), [bx, by] = apply(m, x + w, y + h);
		const x0 = Math.min(ax, bx), y0 = Math.min(ay, by), x1 = Math.max(ax, bx), y1 = Math.max(ay, by);
		this._pixels?.getContext("2d")!.clearRect(x0, y0, x1 - x0, y1 - y0);
		if (x0 <= 0 && y0 <= 0 && x1 >= cw && y1 >= ch) {
			// (The clips of any shape open now stay open for what's drawn next)
			this._drawn = this._state.masks.map((mask) => ({ item: { op: "group", open: true, mask, opacity: 1, clip: null } }));
			this._pixelsDrawn = false;
		} else {
			// (What's drawn wholly inside it goes; what's partly in it stays: the engine's canvas keeps shapes, not pixels)
			this._drawn = this._drawn.filter((d) => {
				const b = bounds(d.item);
				return !b || d.own || (d.item.op === "image" && this._pixels && d.item.source === imageSource(this._pixels)?.el) || !(b[0] >= x0 && b[1] >= y0 && b[2] <= x1 && b[3] <= y1);
			});
		}
		this.changed();
	}

	// ------------------------------------------------------------ clip

	/**
	 * What's drawn after it (until the state's restored) kept inside the path: to its bounding box as the painter's
	 * own rectangular clip; a circle or an ellipse on the axes as a rounded clip too (smooth: IgeUiRoundClip); any other
	 * shape (a turned square, a star) filled by the rule as a mask the renderer keeps in the stencil (IgeUiStencilClip).
	 * A clip in a clip keeps to both.
	 */
	clip (rule: "nonzero" | "evenodd" | unknown = "nonzero"): void {
		const subs = this._subs.filter((s) => s.pts.length >= 4);
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (const s of subs) {
			for (let i = 0; i + 1 < s.pts.length; i += 2) {
				x0 = Math.min(x0, s.pts[i]);
				x1 = Math.max(x1, s.pts[i]);
				y0 = Math.min(y0, s.pts[i + 1]);
				y1 = Math.max(y1, s.pts[i + 1]);
			}
		}
		if (!subs.length) x0 = y0 = x1 = y1 = 0;
		const c = this._state.clip;
		const rect: [number, number, number, number] = c ? [Math.max(c[0], x0), Math.max(c[1], y0), Math.min(c[2], x1), Math.min(c[3], y1)] : [x0, y0, x1, y1];
		// A circle or an ellipse on the axes: a rounded clip, drawn analytically (smooth, as Chrome's: IgeUiRoundClip),
		// unless it can't be one with a rounded clip already open
		const one = subs.length === 1 ? subs[0] : undefined;
		const oval = one?.oval;
		const shape: IgeUiRound | undefined = oval ? { box: [oval[0] - oval[2], oval[1] - oval[3], oval[0] + oval[2], oval[1] + oval[3]], rx: [oval[2], oval[2], oval[2], oval[2]], ry: [oval[3], oval[3], oval[3], oval[3]] } : one?.rrect;
		if (shape) {
			const both = combineRounds(c?.round, shape);
			if (both.exact) {
				this._state.clip = withRound(rect, both.round);
				return;
			}
		}
		this._state.clip = withRound(rect, c?.round);
		if (!subs.length || (subs.length === 1 && axisRect(subs[0].pts))) return;
		const { tris } = fillTriangles(subs.map((s) => ({ points: s.pts, closed: true })), IDENTITY, rule === "evenodd" ? "evenodd" : "nonzero");
		// (Nothing inside it: nothing drawn, the bounding box's corner)
		if (!tris.length) {
			this._state.clip = [x0, y0, x0, y0];
			return;
		}
		this._push({ op: "group", open: true, mask: tris, opacity: 1, clip: null });
		this._state.masks = [...this._state.masks, tris];
	}

	// ------------------------------------------------------------ text

	measureText (text: string): { width: number; actualBoundingBoxAscent: number; actualBoundingBoxDescent: number; fontBoundingBoxAscent: number; fontBoundingBoxDescent: number } {
		const font = parseCanvasFont(this._state.font);
		const metrics = this.fonts.metrics(font);
		return { width: this.fonts.measure(text, font), actualBoundingBoxAscent: metrics.ascent, actualBoundingBoxDescent: metrics.descent, fontBoundingBoxAscent: metrics.ascent, fontBoundingBoxDescent: metrics.descent };
	}

	_text (text: string, x: number, y: number, style: string | IgeUiCanvas2dGradient, halo?: number): void {
		this._sized();
		const s = this._state;
		const font = parseCanvasFont(s.font);
		const w = this.fonts.measure(text, font);
		const metrics = this.fonts.metrics(font);
		const align = s.textAlign, base = s.textBaseline;
		const lx = x - (align === "center" ? w / 2 : align === "right" || align === "end" ? w : 0);
		const by = y + (base === "top" ? metrics.ascent : base === "middle" ? (metrics.ascent - metrics.descent) / 2 : base === "bottom" || base === "ideographic" ? -metrics.descent : base === "hanging" ? metrics.ascent * 0.8 : 0);
		const g = typeof style === "string" ? undefined : this._cssGradient(style, [lx, by - metrics.ascent, w, metrics.ascent + metrics.descent]);
		const color = typeof style === "string" ? this._color(style) : g && svgGradientMiddle(g);
		if (!color) return;
		// (Turned, skewed or stretched: drawn through its own matrix; else placed and sized in the canvas's pixels)
		const own = !(axisAligned(s.m) && Math.abs(s.m[0] - s.m[3]) < 1e-6);
		const k = own ? 1 : scaleOf(s.m);
		const shadow = this._shadow();
		const at = own ? [lx, by] : apply(s.m, lx, by);
		const item: IgeUiPaintItem = {
			op: "text", text, x: at[0], y: at[1], w: w * k, font: { ...font, size: font.size * k }, letterSpacing: 0, color, opacity: s.alpha, clip: s.clip,
			matrix: own ? [...s.m] : undefined, additive: s.composite === "lighter" || undefined
		};
		// Its shadow (or a stroke's halo) an item of its own under it, as the painter's text-shadows are (an item with a
		// shadow is only the shadow), then the glyphs
		const glow = halo !== undefined ? { x: 0, y: 0, blur: halo * k, color } : shadow && { x: shadow.x, y: shadow.y, blur: shadow.blur, color: shadow.color };
		if (glow) this._push({ ...item, shadow: glow }, own);
		this._push(item, own);
		this.changed();
	}

	fillText (text: string, x: number, y: number): void {
		this._text(String(text), x, y, this._state.fill);
	}

	/** (A halo: the text in the stroke's colour with a glow the line's width, as the screens use it under fillText) */
	strokeText (text: string, x: number, y: number): void {
		this._text(String(text), x, y, this._state.stroke, this._state.lineWidth);
	}

	// ------------------------------------------------------------ images

	drawImage (source: unknown, ...a: number[]): void {
		const src = imageSource(engineCanvasPixels(source, (what) => this._unsupported(what)) ?? source);
		if (!src) return this._unsupported("drawImage of that source");
		const [nw, nh] = [src.width, src.height];
		let dx: number, dy: number, dw: number, dh: number;
		let uv: [number, number, number, number] | undefined;
		if (a.length === 2) [dx, dy, dw, dh] = [a[0], a[1], nw, nh];
		else if (a.length === 4) [dx, dy, dw, dh] = a;
		else if (a.length === 8) {
			// (Part of the picture: its texture coordinates)
			const [sx, sy, sw, sh] = a;
			if ((sx !== 0 || sy !== 0 || Math.abs(sw - nw) > 0.5 || Math.abs(sh - nh) > 0.5) && nw > 0 && nh > 0) uv = [sx / nw, sy / nh, (sx + sw) / nw, (sy + sh) / nh];
			[dx, dy, dw, dh] = a.slice(4);
		} else return;
		const s = this._state;
		const own = !axisAligned(s.m);
		const [ax, ay] = own ? [dx, dy] : apply(s.m, dx, dy);
		const k = own ? [1, 1] : [s.m[0], s.m[3]];
		this._shadowed(() => this._push({
			op: "image", x: ax, y: ay, w: dw * k[0], h: dh * k[1], source: src.el, opacity: s.alpha, clip: s.clip, pixelated: !s.smoothing,
			matrix: own ? [...s.m] : undefined, additive: s.composite === "lighter" || undefined, uv
		}, own));
	}

	// ------------------------------------------------------------ pixels

	/** The pixel layer, the canvas's size (made as it's first put to). */
	_layer (): IgeUiPixelSurface {
		this._sized();
		const [w, h] = this._size;
		if (!this._pixels || this._pixels.width !== w || this._pixels.height !== h) this._pixels = new IgeUiPixelSurface(w, h);
		return this._pixels;
	}

	createImageData (w: number | IgeUiImageData, h?: number): IgeUiImageData {
		return new IgeUiPixelSurface(0, 0).getContext("2d")!.createImageData(w, h);
	}

	getImageData (x: number, y: number, w: number, h: number): IgeUiImageData {
		return this._layer().getContext("2d")!.getImageData(x, y, w, h);
	}

	/** The pixels put as they are (the transform, alpha and clip don't apply, as a canvas has it), on the pixel layer. */
	putImageData (img: IgeUiImageData, dx: number, dy: number, dirtyX?: number, dirtyY?: number, dirtyW?: number, dirtyH?: number): void {
		const layer = this._layer();
		layer.getContext("2d")!.putImageData(img, dx, dy, dirtyX, dirtyY, dirtyW, dirtyH);
		if (!this._pixelsDrawn) {
			const src = imageSource(layer)!;
			this._push({ op: "image", x: 0, y: 0, w: layer.width, h: layer.height, source: src.el, opacity: 1, clip: null });
			this._pixelsDrawn = true;
		}
		this.changed();
	}

	// ------------------------------------------------------------ not drawn

	createPattern (): null {
		this._unsupported("createPattern");
		return null;
	}

	createLinearGradient (x0: number, y0: number, x1: number, y1: number): IgeUiCanvas2dGradient {
		return new IgeUiCanvas2dGradient("linear", [x0, y0, x1, y1]);
	}

	createRadialGradient (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): IgeUiCanvas2dGradient {
		return new IgeUiCanvas2dGradient("radial", [x0, y0, r0, x1, y1, r1]);
	}

	createConicGradient (start: number, x: number, y: number): IgeUiCanvas2dGradient {
		return new IgeUiCanvas2dGradient("conic", [start, x, y]);
	}

	// ------------------------------------------------------------ painting

	/**
	 * What's drawn, as the painter's items, the canvas shown in a box (x, y, w by h, the UI's pixels) with the
	 * element's opacity, clip and transform.
	 */
	paint (items: IgeUiPaintItem[], x: number, y: number, w: number, h: number, opacity: number, clip: IgeUiClip, matrix?: IgeCssMatrix): void {
		this._sized();
		const [cw, ch] = this._size;
		if (!(cw > 0 && ch > 0)) return;
		const sx = w / cw, sy = h / ch, k = (sx + sy) / 2;
		const map: M = [sx, 0, 0, sy, x, y];
		const bounds: IgeUiClip = [x, y, x + w, y + h];
		const within = (c: IgeUiClip): IgeUiClip => {
			const own: IgeUiClip = c ? withRound([c[0] * sx + x, c[1] * sy + y, c[2] * sx + x, c[3] * sy + y], roundThrough(c.round, map)) : bounds;
			return meet(meet(own, bounds), clip);
		};
		const X = (v: number) => v * sx + x, Y = (v: number) => v * sy + y;
		const xy = (p: number[]) => p.map((v, i) => (i % 2 ? Y(v) : X(v)));
		/** Clips of any shape open (their triangles where they're shown): any left open at the end closed there. */
		const masks: number[][] = [];
		for (const { item, own } of this._drawn) {
			if (own) {
				// (Its clip, the canvas's and the element's, in the element's pixels: taken to the screen by the element's matrix,
				// not its own turned one)
				const c = within(item.clip);
				if (c) c.space = matrix ?? IDENTITY;
				items.push({ ...item, opacity: item.opacity * opacity, matrix: multiply(matrix ?? IDENTITY, multiply(map, item.matrix ?? IDENTITY)), clip: c } as IgeUiPaintItem);
				continue;
			}
			const base = { opacity: item.opacity * opacity, matrix, clip: within(item.clip) };
			switch (item.op) {
				case "box":
					items.push({ ...item, ...base, x: X(item.x), y: Y(item.y), w: item.w * sx, h: item.h * sy, radii: item.radii.map((r) => r * k) as [number, number, number, number], border: item.border !== undefined ? item.border * k : undefined });
					break;
				case "line":
					// (Not under a pixel: the painter snaps a line's box to whole pixels, and a thinner one can vanish)
					items.push({ ...item, ...base, points: xy(item.points), width: Math.max(1, item.width * k) });
					break;
				case "fill":
					items.push({ ...item, ...base, tris: xy(item.tris) });
					break;
				case "text":
					items.push({ ...item, ...base, x: X(item.x), y: Y(item.y), w: item.w * sx, font: { ...item.font, size: item.font.size * k }, letterSpacing: item.letterSpacing * k, shadow: item.shadow && { ...item.shadow, x: item.shadow.x * k, y: item.shadow.y * k, blur: item.shadow.blur * k } });
					break;
				case "image":
					items.push({ ...item, ...base, x: X(item.x), y: Y(item.y), w: item.w * sx, h: item.h * sy });
					break;
				case "group": {
					const mask = item.mask && (item.open ? xy(item.mask) : masks.pop() ?? xy(item.mask));
					if (mask && item.open) masks.push(mask);
					items.push({ ...item, ...base, shadows: item.shadows?.map((s) => ({ ...s, x: s.x * k, y: s.y * k, blur: s.blur * k })), mask });
					break;
				}
			}
		}
		for (let i = masks.length - 1; i >= 0; i--) items.push({ op: "group", open: false, mask: masks[i], opacity: 1, clip: null, matrix });
	}
}

/** A path of four corners that's a rectangle on the axes (pixels). */
function axisRect (p: number[]): boolean {
	if (p.length !== 8) return false;
	const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
	const xs: number[] = [], ys: number[] = [];
	for (let i = 0; i < 8; i += 2) {
		if (!xs.some((x) => near(x, p[i]))) xs.push(p[i]);
		if (!ys.some((y) => near(y, p[i + 1]))) ys.push(p[i + 1]);
	}
	// (Each side along an axis: neighbouring corners share an x or a y)
	for (let i = 0; i < 8; i += 2) {
		const j = (i + 2) % 8;
		if (!near(p[i], p[j]) && !near(p[i + 1], p[j + 1])) return false;
	}
	return xs.length <= 2 && ys.length <= 2;
}

/** The intersection of two clips (null is no clip). */
function meet (a: IgeUiClip, b: IgeUiClip): IgeUiClip {
	return intersectClips(a, b);
}

/** An item's bounds (pixels), for clearRect; undefined when it hasn't simple ones. */
function bounds (it: IgeUiPaintItem): [number, number, number, number] | undefined {
	if (it.op === "box" || it.op === "image") return [it.x, it.y, it.x + it.w, it.y + it.h];
	const p = it.op === "line" ? it.points : it.op === "fill" ? it.tris : undefined;
	if (!p) return undefined;
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (let i = 0; i + 1 < p.length; i += 2) {
		x0 = Math.min(x0, p[i]);
		x1 = Math.max(x1, p[i]);
		y0 = Math.min(y0, p[i + 1]);
		y1 = Math.max(y1, p[i + 1]);
	}
	return [x0, y0, x1, y1];
}

/**
 * A canvas element the engine draws (its surface an IgeUiCanvas2d's) as a picture: its pixel layer (what's put with
 * putImageData: a buffer made a pixel at a time, as the mirror's figure is); the shapes drawn on it aren't (`warn`).
 * Undefined for any other source.
 */
function engineCanvasPixels (source: unknown, warn: (what: string) => void): IgeUiPixelSurface | undefined {
	const surface = (source as { _canvas?: { context?: unknown } } | null)?._canvas;
	const ctx = surface?.context;
	if (!(ctx instanceof IgeUiCanvas2d)) return undefined;
	ctx._sized();
	if (ctx._drawn.some((d) => !(d.item.op === "image" && ctx._pixels && d.item.source === imageSource(ctx._pixels)?.el))) warn("drawImage of an engine-drawn canvas's shapes (its putImageData pixels are drawn)");
	return ctx._layer();
}

/** Page pictures as the painter's image sources (a canvas's surface, an image by src): one stand-in each. */
const standIns = new WeakMap<object, IgeUiElement>();

/** What drawImage can draw: an engine canvas or image, or a page canvas or image; with its own size. */
function imageSource (source: unknown): { el: IgeUiElement; width: number; height: number } | undefined {
	if (!source || typeof source !== "object") return undefined;
	const s = source as { localName?: string; ownerDocument?: { host?: unknown }; width?: number; height?: number; naturalWidth?: number; naturalHeight?: number; src?: string; _canvas?: unknown };
	const w = s.naturalWidth || s.width || 0, h = s.naturalHeight || s.height || 0;
	// (An engine element already: drawn as the painter draws it)
	if (s.ownerDocument && "host" in s.ownerDocument) return { el: source as IgeUiElement, width: w, height: h };
	const name = s.localName ?? (typeof s.src === "string" ? "img" : "canvas");
	let el = standIns.get(source);
	if (!el) {
		// (The painter reads a canvas's surface from _canvas, an image's src from its attribute)
		el = (name === "img" ? { localName: "img", getAttribute: (a: string) => (a === "src" ? s.src ?? null : null) } : { localName: "canvas", _canvas: source, getAttribute: () => null }) as unknown as IgeUiElement;
		standIns.set(source, el);
	}
	return { el, width: w, height: h };
}

// ---------------------------------------------------------------- as a surface

/** An engine-drawn surface (the host seam's IgeUiSurface, with its paint): its 2D context records, its paint draws it. */
export function igeUiCanvas2dSurface (w: number, h: number, fonts: IgeUiCanvas2dFonts, changed?: () => void, el?: IgeUiElement): IgeUiSurface & { context: IgeUiCanvas2d } {
	let width = w, height = h;
	const surface = {
		// (Set, it clears what's drawn and the state at once, as a canvas's width and height do)
		get width () { return width; },
		set width (v: number) { width = v; surface.context._sized(); },
		get height () { return height; },
		set height (v: number) { height = v; surface.context._sized(); },
		context: undefined as unknown as IgeUiCanvas2d,
		getContext: (kind: string) => (kind === "2d" ? surface.context : null),
		paint: (items: IgeUiPaintItem[], x: number, y: number, pw: number, ph: number, opacity: number, clip: IgeUiClip, matrix?: IgeCssMatrix) => surface.context.paint(items, x, y, pw, ph, opacity, clip, matrix)
	};
	// (Its size, the surface's: set by its canvas element as its width and height change, which clears it; its canvas
	// the element, as a browser context's is, when it's told it)
	surface.context = new IgeUiCanvas2d(el ?? surface, fonts, () => [width, height], changed);
	return surface;
}

/**
 * Gives a host's engine canvases the engine's own 2D (IgeUiCanvas2d) in place of its surfaces: those `which` says
 * (by default the ones marked data-canvas="engine"; `() => true` for every one, to compare them). The glyph atlas's
 * surfaces (asked for with no element) stay the host's.
 */
export function igeUiCanvas2dOn (host: IgeUiHost, which: (el: IgeUiElement) => boolean = (el) => el.getAttribute("data-canvas") === "engine"): void {
	const own = host.surface;
	(host as { surface: IgeUiHostSurface }).surface = {
		create: (w, h, el) => {
			if (!el || !which(el)) return own.create(w, h, el);
			const doc = el.ownerDocument as unknown as { host?: { host?: IgeUiHost; layoutEngine?: { fonts?: IgeUiCanvas2dFonts } }; _changed?: (el: IgeUiElement, what: string) => void };
			const fonts = doc.host?.layoutEngine?.fonts ?? host.text.fonts;
			return igeUiCanvas2dSurface(w, h, fonts, () => doc._changed?.(el, "paint"), el);
		}
	};
}
