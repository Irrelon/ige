/**
 * Paint for the engine's UI: the laid-out boxes into a display list, in CSS
 * painting order (each stacking context: its background, then in-flow
 * content in tree order, then positioned descendants by z-index), with
 * clipping (overflow), scrolling, opacity, transforms and visibility.
 *
 * The list is plain data (no GL): boxes (fills, gradients, borders, radii,
 * chamfered corners, glows and inset shadows), text runs, images (canvases)
 * and polylines, each with the clip rectangle it's drawn in. Tests read it as
 * a render-list snapshot; IgeUiGlRenderer draws it.
 */
import { splitTop } from "@/engine/ui2/css/IgeCssParser";
import { type IgeCssColor, type IgeCssGradient, type IgeCssMatrix, type IgeCssShadow, IDENTITY, multiply, parseColor, parseGradient, parseShadows, resolveLength, resolveNumber } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { type IgeUiBox, type IgeUiTextRun, stickyShift } from "@/engine/ui2/layout/IgeUiBox";
import { type IgeUiComputedStyle, styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";
import type { IgeUiFontSpec } from "@/engine/ui2/text/IgeUiFonts";
import { hasDashedSide, paintDashedBorder } from "@/engine/ui2/render/IgeUiBorderDash";
import { backgroundUrl, paintBackgroundImage } from "@/engine/ui2/render/IgeUiBackgroundImage";
import { type IgeUiDropShadow, parseDropShadows } from "@/engine/ui2/render/IgeUiDropShadow";
import { type IgeUiFilterOp, onlyDropShadows, parseFilterList } from "@/engine/ui2/render/IgeUiFilters";
import { enter3d, invert3, needs3d, perspectiveOf, planeDepth, project } from "@/engine/ui2/render/IgeUiPerspective";
import { fillTriangles, paintSvg, SVG_CONTENT } from "@/engine/ui2/render/IgeUiSvg";
import { RANGE_THUMB } from "@/engine/ui2/input/IgeUiTap";
import { paintTextDecorations, textDecorations } from "@/engine/ui2/render/IgeUiTextDecoration";
import { clipsToText, paintTextInBackground } from "@/engine/ui2/render/IgeUiTextClip";
import { type IgeUiClipRect, intersectClips, roundThrough, withRound } from "@/engine/ui2/render/IgeUiRoundClip";

/** A clip rectangle (x0, y0, x1, y1), with its rounded corners when it has them (IgeUiRoundClip), or none. */
export type IgeUiClip = IgeUiClipRect | null;

export interface IgeUiPaintBase {
	/** The clip rectangle it's drawn in (x0, y0, x1, y1, UI px), or none. */
	clip: IgeUiClip;
	/** A transform its points go through (UI px), if any. */
	matrix?: IgeCssMatrix;
	/** Additive (mix-blend-mode: screen / plus-lighter). */
	additive?: boolean;
	/** Its element (for picking and debugging). */
	el?: IgeUiElement | null;
}

export interface IgeUiPaintBox extends IgeUiPaintBase {
	op: "box";
	x: number;
	y: number;
	w: number;
	h: number;
	/** Corner radii: top-left, top-right, bottom-right, bottom-left. */
	radii: [number, number, number, number];
	/** The corners' vertical radii when one's elliptical (border-radius: 50% on an oblong box), the same order; else as radii. */
	radiiY?: [number, number, number, number];
	/** Cut corners (clip-path chamfers), the same order. */
	chamfer?: [number, number, number, number];
	/** A fill: a colour, or a gradient layer. */
	color?: IgeCssColor;
	gradient?: IgeCssGradient;
	/**
	 * Dashed or dotted (IgeUiBorderDash, IgeUiTextDecoration), the pattern drawn in the shader: a dash's length and the
	 * period (dash and gap), down rather than across, round dots, where along the pattern it starts; with `border`, a
	 * ring round the box cut into dashes evenly round its middle line.
	 */
	dash?: { len: number; period: number; vertical?: boolean; round?: boolean; phase?: number };
	/** A border ring of this width all round (a uniform border). */
	border?: number;
	/** A glow (outer box-shadow) or an inset shadow, with its blur. */
	shadow?: "outer" | "inset";
	/** A backdrop's mask-image (a linear gradient): its alpha fades the blurred backdrop. */
	mask?: IgeCssGradient;
	/** Drawn exactly where it is (an SVG shape), not snapped to device pixels as a box is. */
	exact?: boolean;
	/** backdrop-filter: blur(): what's already drawn behind it, blurred this much (its shape cut out), under its fills. */
	backdrop?: boolean;
	/** backdrop-filter's colour functions (grayscale(), contrast()...), after its blur: their matrices (IgeUiFilters). */
	colorOps?: number[][];
	blur?: number;
	spread?: number;
	opacity: number;
}

export interface IgeUiPaintText extends IgeUiPaintBase {
	op: "text";
	text: string;
	x: number;
	/** Baseline. */
	y: number;
	w: number;
	font: IgeUiFontSpec;
	letterSpacing: number;
	color: IgeCssColor;
	/** A glow behind it (text-shadow): offset, blur, colour. */
	shadow?: { x: number; y: number; blur: number; color: IgeCssColor };
	opacity: number;
}

export interface IgeUiPaintImage extends IgeUiPaintBase {
	op: "image";
	x: number;
	y: number;
	w: number;
	h: number;
	/** What's drawn: a canvas node's surface, or an image by src. */
	source: IgeUiElement;
	opacity: number;
	/** Pixelated (image-rendering) or smooth. */
	pixelated?: boolean;
	/** A url() background layer's picture (its url): drawn from the UI's images, not `source` (IgeUiBackgroundImage). */
	src?: string;
	/** Its texture coordinates over the quad (past 0 to 1 where it repeats), and the ways it repeats. */
	uv?: [number, number, number, number];
	repeat?: [boolean, boolean];
	/** The box it's cut to (its element's border box), with that box's corners. */
	area?: [number, number, number, number];
	radii?: [number, number, number, number];
	radiiY?: [number, number, number, number];
	chamfer?: [number, number, number, number];
}

export interface IgeUiPaintLine extends IgeUiPaintBase {
	op: "line";
	points: number[];
	width: number;
	color: IgeCssColor;
	opacity: number;
	closed?: boolean;
	/** Its ends and corners (SVG's stroke-linecap and stroke-linejoin); round when not given. */
	cap?: "butt" | "round" | "square";
	/** Its two ends' caps when they differ (a piece of a longer line: a gradient stroke's). */
	caps?: ["butt" | "round" | "square", "butt" | "round" | "square"];
	join?: "miter" | "round" | "bevel";
	miterLimit?: number;
}

/** Filled triangles (an SVG shape's fill): x, y three times each, and which of each one's edges are the outline (IgeUiSvg). */
export interface IgeUiPaintFill extends IgeUiPaintBase {
	op: "fill";
	tris: number[];
	edges: number[];
	color: IgeCssColor;
	opacity: number;
}

/**
 * Where an element with a filter starts (open, with its shadows or filters) and ends in the list: what's between is
 * what its drop shadows are of (only drop-shadows: IgeUiDropShadow), or what its filters are run on (IgeUiFilters).
 */
export interface IgeUiPaintGroup extends IgeUiPaintBase {
	op: "group";
	open: boolean;
	/**
	 * A clip of any shape (a 2D canvas's clip() to a circle): its triangles (x, y three times each, through its
	 * matrix), on the opening and the closing both; what's between is kept inside it (IgeUiStencilClip).
	 */
	mask?: number[];
	shadows?: IgeUiDropShadow[];
	filters?: IgeUiFilterOp[];
	opacity: number;
}

export type IgeUiPaintItem = IgeUiPaintBox | IgeUiPaintText | IgeUiPaintImage | IgeUiPaintLine | IgeUiPaintFill | IgeUiPaintGroup;

interface Ctx {
	clip: IgeUiClip;
	dx: number;
	dy: number;
	opacity: number;
	matrix?: IgeCssMatrix;
	/** In a preserve-3d parent: its 3D transform, its 3D context's plane on the screen, and the clip in that plane (IgeUiPerspective). */
	m4?: number[];
	root?: IgeCssMatrix;
	rootClip?: IgeUiClip;
	/** The parent's perspective, for children turned in 3D. */
	persp?: number[];
}

/** A clip (in the plane round a box) in the box's own pixels: the box round its corners brought back through `rel`; none if that can't be done. */
function clipInto (clip: IgeUiClip, rel: IgeCssMatrix): IgeUiClip {
	if (!clip) return null;
	const inv = invert3(rel);
	if (!inv) return null;
	const pts = [[clip[0], clip[1]], [clip[2], clip[1]], [clip[0], clip[3]], [clip[2], clip[3]]].map(([x, y]) => project(inv, x, y));
	if (pts.some((p) => !p)) return null;
	const xs = pts.map((p) => p![0]), ys = pts.map((p) => p![1]);
	return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

const lenCtx = (style: IgeUiComputedStyle, percent?: number) => ({ em: numOr(styleValue(style, "font-size"), 16), rem: 16, percent, vw: 0, vh: 0, cqw: 0, cqh: 0 });

/** object-position: where a picture sits in its box (px from its corner), given the room left over each way. */
function objectPosition (v: string, roomX: number, roomY: number, ctx: ReturnType<typeof lenCtx>): [number, number] {
	const KW: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
	let parts = (v || "50% 50%").trim().split(/\s+/);
	if (parts.length === 1) parts = [parts[0], "center"];
	// (Keywords the other way round: "top left")
	if (parts[0] === "top" || parts[0] === "bottom" || parts[1] === "left" || parts[1] === "right") parts = [parts[1], parts[0]];
	const one = (t: string, room: number) => (t in KW ? KW[t] * room : t.endsWith("%") ? (parseFloat(t) / 100) * room : resolveLength(t, ctx) ?? room / 2);
	return [one(parts[0], roomX), one(parts[1], roomY)];
}

/** What's inside both clips (their rounded corners combined: IgeUiRoundClip). */
function intersect (a: IgeUiClip, b: IgeUiClip): IgeUiClip {
	return intersectClips(a, b);
}

/** Turns a box tree into a display list. */
/**
 * An anonymous box (round inline content beside blocks, in an SVG drawing's box): laid out with its parent's style for
 * its text, but none of its parent's own effects are its: no opacity, filter, clip or stacking context of its own (they
 * were its parent's, already applied round it). A box that took them again faded twice, cast a second drop shadow.
 */
function anonymous (b: IgeUiBox): boolean {
	return !b.el && !b.pseudo;
}

export class IgeUiPainter {
	items: IgeUiPaintItem[] = [];
	/** The UI's own size (fixed boxes and the root clip). */
	viewport = { w: 1280, h: 720 };
	/** Each scrolling box's offset (by element). */
	_scroll = (el: IgeUiElement | null): [number, number] => (el ? [el._scrollLeft, el._scrollTop] : [0, 0]);
	/** Drawn after a box's text: the focused field's caret or selection (dom/IgeUiTextField). */
	fieldPaint?: (b: IgeUiBox, ctx: Ctx, items: IgeUiPaintItem[]) => void;

	/** Opacity applied to an element whole, through a layer, when it paints more than one item (else item by item, as before). */
	groupOpacity = true;

	/** Asks for a picture (a url() background's), as it's first painted (IgeUiRoot's images). */
	requestImage?: (src: string) => void;

	/** A font's ascent and the device's pixels per UI px, for text decorations (IgeUiRoot's layout's). */
	decorationMetrics?: (font: IgeUiFontSpec) => { ascent: number; grid: number };
	/** Where a text item's glyphs have ink between two heights (for underlines skipping it: IgeUiTextDecoration). */
	inkSpans?: (text: IgeUiPaintText, top: number, bottom: number) => [number, number][];

	/** `<img>` pictures' own sizes by src (IgeUiRoot's images), for object-fit. */
	imageSizes?: Map<string, { w: number; h: number }>;

	paint (root: IgeUiBox): IgeUiPaintItem[] {
		this.items = [];
		this.groups = new Map();
		this._treeOrder(root.el);
		this._context(root, { clip: null, dx: 0, dy: 0, opacity: 1 });
		return this.items;
	}

	/** Each element's place in the document, before and after what's in it (positioned boxes are painted in this order). */
	_order = new Map<IgeUiElement, [number, number]>();

	_treeOrder (root: IgeUiElement | null): void {
		this._order = new Map();
		if (!root) return;
		let i = 0;
		const walk = (el: IgeUiElement) => {
			const at = i++;
			for (const c of el.children) walk(c);
			this._order.set(el, [at, i++]);
		};
		walk(root);
	}

	/**
	 * Where a box comes in the document's order (its ::before after its element's start, its ::after before its end):
	 * positioned boxes are painted in this order, whatever order a flex or grid container laid them out in.
	 */
	treeKey (b: IgeUiBox): number | undefined {
		const o = b.el ? this._order.get(b.el) : undefined;
		if (!o) return undefined;
		return b.pseudo === "before" ? o[0] + 0.5 : b.pseudo === "after" ? o[1] - 0.5 : o[0];
	}

	/** Positioned boxes' paint order: z-index, then the document's order. */
	positionedOrder (p: { box: IgeUiBox; z: number; order: number }, q: { box: IgeUiBox; z: number; order: number }): number {
		if (p.z !== q.z) return p.z - q.z;
		const a = this.treeKey(p.box), b = this.treeKey(q.box);
		return (a !== undefined && b !== undefined ? a - b : 0) || p.order - q.order;
	}

	/**
	 * Each box painted whole in one run of items (the root, positioned boxes, stacking contexts): where its items are,
	 * what it was painted in, and whether it was a stacking context. An animation that only changes how one looks
	 * repaints just its run (repaintGroup).
	 */
	groups = new Map<IgeUiBox, { start: number; end: number; ctx: Ctx; stacking: boolean }>();

	/**
	 * Paints one box's run again in place (its look changed, or it's a positioned box laid out again: `was`, the box
	 * it replaced, whose run it takes); false when it has no run to replace.
	 */
	repaintGroup (b: IgeUiBox, was: IgeUiBox = b): boolean {
		const g = this.groups.get(was);
		if (!g) return false;
		// (Which runs are in it and round it, by the boxes, not the item counts: a run can be empty)
		const under = (k: IgeUiBox, a: IgeUiBox) => {
			for (let q = k.parent; q; q = q.parent) if (q === a) return true;
			return false;
		};
		// (Runs inside it are recorded again as it's painted)
		for (const k of [...this.groups.keys()]) if (k !== b && (under(k, b) || under(k, was))) this.groups.delete(k);
		this.groups.delete(was);
		if (was !== b) this.groups.delete(b);
		const all = this.items;
		this.items = [];
		const before = new Set(this.groups.keys());
		this._context(b, g.ctx);
		const fresh = this.items;
		this.items = all;
		const delta = fresh.length - (g.end - g.start);
		all.splice(g.start, g.end - g.start, ...fresh);
		for (const [k, o] of this.groups) {
			if (before.has(k) && k !== b) {
				if (under(b, k)) o.end += delta;
				else if (o.start >= g.end) {
					o.start += delta;
					o.end += delta;
				}
			} else {
				// (Recorded just now, from 0 in the fresh run)
				o.start += g.start;
				o.end += g.start;
			}
		}
		const now = this.groups.get(b);
		if (!now) {
			// (Not drawn at all now: an empty run)
			this.groups.set(b, { ...g, end: g.start });
		}
		return true;
	}

	_isStacking (b: IgeUiBox): boolean {
		if (anonymous(b)) return false;
		if (b.position !== "static" && b.zIndex !== undefined) return true;
		if (b.position === "fixed" || b.position === "sticky") return true;
		if (b.transform) return true;
		if (parseFloat(styleValue(b.style, "opacity")) < 1) return true;
		// (A filter makes one too: a drop shadow's of all of it, painted in one run)
		if (styleValue(b.style, "filter") !== "none") return true;
		return false;
	}

	/** Paints a stacking context: its own background, in-flow content, then positioned descendants in z order. */
	/** Whether a box and all in it is out of sight (scrolled or clipped away): not drawn at all. */
	_unseen (b: IgeUiBox, ctx: Ctx): boolean {
		const c = ctx.clip, k = b.ink;
		if (!c || !k) return false;
		return k[2] + ctx.dx < c[0] || k[0] + ctx.dx > c[2] || k[3] + ctx.dy < c[1] || k[1] + ctx.dy > c[3];
	}

	_context (b: IgeUiBox, ctx: Ctx): void {
		const start = this.items.length, entry = ctx;
		// A filter: its run marked, for the renderer to shade (drop-shadows alone: IgeUiDropShadow) or to run its filters on
		// (IgeUiFilters)
		const filter = b.pseudo || anonymous(b) ? "none" : styleValue(b.style, "filter");
		const current = parseColor(styleValue(b.style, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
		const ops = filter && filter !== "none" ? parseFilterList(filter, lenCtx(b.style), current) : [];
		const shadows = ops.length && onlyDropShadows(ops) ? parseDropShadows(filter, lenCtx(b.style), current) : [];
		const filters = ops.length && !onlyDropShadows(ops) ? ops : undefined;
		// Opacity is the element's whole: what it paints faded together (a layer, as a browser fades it: a panel's text over
		// its own background), or as it is when that's one item with nothing under or over it; a filtered element's
		// applied to its layer after its filters
		const own = anonymous(b) ? 1 : (resolveNumber(styleValue(b.style, "opacity")) ?? 1);
		const fades = this.groupOpacity && !filters && !shadows.length && own < 1 && own > 0.001;
		if (shadows.length) this.items.push({ op: "group", open: true, shadows, clip: ctx.clip, matrix: ctx.matrix, el: b.el, opacity: 1 });
		else if (filters) this.items.push({ op: "group", open: true, filters, clip: ctx.clip, matrix: ctx.matrix, el: b.el, opacity: own });
		const runStart = this.items.length, before = fades ? new Set(this.groups.keys()) : undefined;
		this._contextInner(b, (filters || fades) && own < 1 && own > 0.001 ? { ...ctx, opacity: ctx.opacity / own } : ctx);
		if (shadows.length || filters) this.items.push({ op: "group", open: false, clip: null, el: b.el, opacity: 1 });
		if (fades) {
			const run = this.items.slice(runStart);
			// (A shape's clip in it (the stencil's, on the screen's target): faded item by item instead)
			if ((run.length > 1 || run.some((i) => i.op === "group")) && !run.some((i) => i.op === "group" && i.mask)) {
				this.items.splice(runStart, 0, { op: "group", open: true, filters: [], clip: ctx.clip, matrix: ctx.matrix, el: b.el, opacity: own });
				this.items.push({ op: "group", open: false, clip: null, el: b.el, opacity: 1 });
				// (The runs recorded in it moved on by its opening)
				for (const [k, o] of this.groups) if (!before!.has(k) && o.start >= runStart) {
					o.start++;
					o.end++;
				}
			} else for (const i of run) i.opacity *= own;
		}
		this.groups.set(b, { start, end: this.items.length, ctx: entry, stacking: this._isStacking(b) });
	}

	_contextInner (b: IgeUiBox, ctx: Ctx): void {
		if (this._unseen(b, ctx)) return;
		if (b.sticky) {
			// Held in its scroller's view
			const [sx, sy] = stickyShift(b, (el) => this._scroll(el));
			if (sx || sy) ctx = { ...ctx, dx: ctx.dx + sx, dy: ctx.dy + sy };
		}
		const own = this._enter(b, ctx);
		if (!own) return;
		this._background(b, own.ctx);
		if (b.layerBlock && b.display === "inline") {
			// A positioned inline element: its pieces of the block's lines, here in its own layer (moved by its offsets)
			let c = own.ctx;
			if (b.position === "relative") {
				const lc = lenCtx(b.style);
				const left = resolveLength(styleValue(b.style, "left"), lc), right = resolveLength(styleValue(b.style, "right"), lc);
				const top = resolveLength(styleValue(b.style, "top"), lc), bottom = resolveLength(styleValue(b.style, "bottom"), lc);
				c = { ...c, dx: c.dx + (left ?? (right !== undefined ? -right : 0)), dy: c.dy + (top ?? (bottom !== undefined ? -bottom : 0)) };
			}
			this._inlineContent(b.layerBlock, c, b);
		}
		const inner = this._innerCtx(b, own.ctx);
		// (Where its own background ends: what's under its content goes here)
		const afterOwn = this.items.length;
		const positioned: { box: IgeUiBox; ctx: Ctx; z: number; order: number }[] = [];
		let order = 0;
		const collect = (box: IgeUiBox, c: Ctx) => {
			for (const child of box.children) {
				if (child.position !== "static" || this._isStacking(child)) {
					// Fixed: the UI's own (no ancestor clips or scrolling)
					const cc = child.position === "fixed" ? { clip: null, dx: 0, dy: 0, opacity: c.opacity, matrix: undefined } : c;
					positioned.push({ box: child, ctx: cc, z: child.zIndex ?? 0, order: order++ });
					continue;
				}
				if (this._unseen(child, c)) continue;
				const e = this._enter(child, c);
				if (!e) continue;
				this._background(child, e.ctx);
				const ic = this._innerCtx(child, e.ctx);
				this._inlineContent(child, ic);
				collect(child, ic);
				this._scrollbars(child, e.ctx);
			}
		};
		// Negative z first, then content, then the rest
		this._inlineContent(b, inner);
		collect(b, inner);
		this._scrollbars(b, own.ctx);
		positioned.sort((p, q) => this.positionedOrder(p, q));
		// In a preserve-3d context: its planes farthest first (IgeUiPerspective), as a browser sorts them
		if (inner.m4 && positioned.length > 1) {
			const depth = new Map(positioned.map((p) => [p, planeDepth(p.box, p.box.ax + p.ctx.dx, p.box.ay + p.ctx.dy, this._origin(p.box), p.ctx, lenCtx(p.box.style))]));
			positioned.sort((p, q) => depth.get(p)! - depth.get(q)!);
		}
		const neg = positioned.filter((p) => p.z < 0);
		const rest = positioned.filter((p) => p.z >= 0);
		if (neg.length) {
			// (Drawn under the content, over its own background: put them before the content)
			const content = this.items.splice(afterOwn);
			for (const p of neg) this._context(p.box, p.ctx);
			const under = this.items.splice(afterOwn);
			this.items.push(...under, ...content);
			// (The runs inside have moved: forgotten, so they're never repainted on their own)
			for (const [k, o] of this.groups) if (o.start >= afterOwn) this.groups.delete(k);
		}
		for (const p of rest) this._context(p.box, p.ctx);
		void own;
	}

	/** A box's own state as it's entered: visibility, opacity, transform. Undefined if it's not drawn at all. */
	_enter (b: IgeUiBox, ctx: Ctx): { ctx: Ctx } | undefined {
		const op = anonymous(b) ? 1 : (resolveNumber(styleValue(b.style, "opacity")) ?? 1);
		if (op <= 0.001) return undefined;
		// Turned in 3D, in a preserve-3d parent, or keeping 3D for its children: its plane in perspective (IgeUiPerspective)
		const lc = lenCtx(b.style);
		const st = { matrix: ctx.matrix, m4: ctx.m4, root: ctx.root, persp: ctx.persp };
		if (needs3d(b, st, lc)) {
			const r = enter3d(b, b.ax + ctx.dx, b.ay + ctx.dy, this._origin(b), st, lc);
			// (Its back turned and hidden: nothing of it drawn)
			if (r.hidden) return undefined;
			const outer = ctx.m4 ? ctx.rootClip ?? null : ctx.clip;
			const k = r.children;
			return { ctx: { clip: clipInto(outer, r.rel), dx: ctx.dx, dy: ctx.dy, opacity: ctx.opacity * op, matrix: r.matrix, m4: k.m4, root: k.root, rootClip: k.m4 ? outer : undefined, persp: k.persp } };
		}
		// (Its perspective, for children turned in 3D)
		const persp = styleValue(b.style, "perspective") && styleValue(b.style, "perspective") !== "none" ? perspectiveOf(b, b.ax + ctx.dx, b.ay + ctx.dy, lc) : undefined;
		let matrix = ctx.matrix;
		if (b.transform) {
			const ox = b.ax + ctx.dx, oy = b.ay + ctx.dy;
			const [tx, ty] = this._origin(b);
			const t = b.transform;
			// About its origin: translate(o) * T * translate(-o)
			const local = multiply(multiply([1, 0, 0, 1, ox + tx, oy + ty], t), [1, 0, 0, 1, -(ox + tx), -(oy + ty)]);
			matrix = matrix ? multiply(matrix, local) : local;
			// Clips are in the drawing's own (untransformed) pixels: the clip from round it brought into the new ones
			// (exact for moves and scales, which is what UI transforms are)
			if (ctx.clip) {
				const det = local[0] * local[3] - local[1] * local[2];
				if (Math.abs(det) > 1e-9) {
					const inv = (x: number, y: number) => {
						const px = x - local[4], py = y - local[5];
						return [(local[3] * px - local[2] * py) / det, (-local[1] * px + local[0] * py) / det];
					};
					const [x0, y0] = inv(ctx.clip[0], ctx.clip[1]), [x1, y1] = inv(ctx.clip[2], ctx.clip[3]);
					// (Its rounded corners too, through a move or a scale; a turn keeps the rectangle round them only)
					const round = roundThrough(ctx.clip.round, [1 / local[0], 0, 0, 1 / local[3], -local[4] / local[0], -local[5] / local[3]]);
					const clip = withRound([Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], Math.abs(local[1]) < 1e-9 && Math.abs(local[2]) < 1e-9 ? round : undefined);
					return { ctx: { clip, dx: ctx.dx, dy: ctx.dy, opacity: ctx.opacity * op, matrix, persp } };
				}
			}
		}
		return { ctx: { clip: ctx.clip, dx: ctx.dx, dy: ctx.dy, opacity: ctx.opacity * op, matrix, persp } };
	}

	_origin (b: IgeUiBox): [number, number] {
		const v = styleValue(b.style, "transform-origin").split(/\s+/);
		const read = (t: string | undefined, size: number) => {
			if (!t || t === "center") return size / 2;
			if (t === "left" || t === "top") return 0;
			if (t === "right" || t === "bottom") return size;
			return resolveLength(t, lenCtx(b.style, size)) ?? size / 2;
		};
		return [read(v[0], b.borderW), read(v[1] ?? "center", b.borderH)];
	}

	/**
	 * A scroll container's scrollbars, in the room layout kept for them: the track and a thumb as long as the
	 * view is of the content (scrollbar-color, else a desktop browser's light classic look).
	 */
	/** The UI's scale (IgeUiRoot.scale): a browser's scrollbar's thumb is drawn in screen pixels. */
	uiScale = 1;
	/** The game's own scrollbars' colours (IgeUiRoot.gameScrollbars); undefined: the CSS's, else the browser's. */
	scrollbarLook?: { thumb: IgeCssColor; thumbHover?: IgeCssColor; track?: IgeCssColor };
	/** The game's scrollbar drawn brighter (thumbHover): the one under the pointer, or whose thumb is being dragged (IgeUiRoot). */
	scrollbarActive?: { el: IgeUiElement | null; vertical: boolean };

	_scrollbars (b: IgeUiBox, ctx: Ctx): void {
		const sy = b.scrollbarY ?? 0, sx = b.scrollbarX ?? 0;
		if (!sy && !sx) return;
		const el = b.el;
		const [sl, st] = this._scroll(el);
		const sc = styleValue(b.style, "scrollbar-color");
		let thumb: IgeCssColor = { r: 193, g: 193, b: 193, a: 1 }, track: IgeCssColor | undefined = { r: 250, g: 250, b: 250, a: 1 };
		const own = this.scrollbarLook;
		if (own) {
			// (The game's own, IgeUiRoot.gameScrollbars: its colours whatever the CSS says)
			thumb = own.thumb;
			track = own.track;
		} else if (sc !== "auto") {
			const current = parseColor(styleValue(b.style, "color"));
			const [t, k] = splitTop(sc, " ").filter((x) => x);
			thumb = parseColor(t, current) ?? thumb;
			track = k ? parseColor(k, current) : undefined;
		}
		const base = { opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el };
		const x0 = b.ax + ctx.dx + b.borderLeft, y0 = b.ay + ctx.dy + b.borderTop;
		const w = b.borderW - b.borderLeft - b.borderRight, h = b.borderH - b.borderTop - b.borderBottom;
		const bar = (vertical: boolean) => {
			const size = vertical ? sy : sx;
			const len = vertical ? h - sx : w - sy;
			const view = vertical ? h - sx : w - sy;
			const content = Math.max(view, vertical ? b.scrollH ?? view : b.scrollW ?? view);
			const pos = vertical ? st : sl;
			const tx = vertical ? x0 + w - size : x0, ty = vertical ? y0 : y0 + h - size;
			if (track && track.a > 0) this.items.push({ op: "box", x: tx, y: ty, w: vertical ? size : len, h: vertical ? len : size, radii: [0, 0, 0, 0], color: track, ...base });
			if (content <= view + 0.5) return;
			// (Chrome's thin bar: a 6 px thumb in its 11 px track, a pixel nearer the right; a browser's bar in screen
			// pixels at any scale, so these over the UI's scale in its own: the game's own bars in the UI's pixels)
			const thin = !own && styleValue(b.style, "scrollbar-width") === "thin";
			const k = own ? 1 : 1 / (this.uiScale > 0 ? this.uiScale : 1);
			const pad = own ? 1 : 2 * k, thick = own ? Math.max(2, size - 2) : Math.max(2 * k, size - (thin ? 5 : 8) * k);
			const nudge = thin ? 0.5 * k : 0;
			const room = len - pad * 2;
			// (The game's thumb where the pointer finds it too: gameThumb, IgeUiRoot._barAt)
			const g = own ? gameThumb(len, view, content, pos) : undefined;
			const tl = g ? g.length : Math.max(18 * k, (room * view) / content);
			const at = g ? g.at : pad + ((room - tl) * pos) / Math.max(1, content - view);
			const r = thick / 2;
			// (Brighter under the pointer, or being dragged)
			const hot = own && this.scrollbarActive?.el === el && this.scrollbarActive.vertical === vertical;
			const color = hot ? own.thumbHover ?? thumb : thumb;
			if (vertical) this.items.push({ op: "box", x: tx + (size - thick) / 2 + nudge, y: ty + at, w: thick, h: tl, radii: [r, r, r, r], color, ...base });
			else this.items.push({ op: "box", x: tx + at, y: ty + (size - thick) / 2 + nudge, w: tl, h: thick, radii: [r, r, r, r], color, ...base });
		};
		if (sy) bar(true);
		if (sx) bar(false);
	}

	/** The context its children are drawn in: its overflow clip, its scroll offset. */
	_innerCtx (b: IgeUiBox, ctx: Ctx): Ctx {
		const ox = anonymous(b) ? "visible" : styleValue(b.style, "overflow-x"), oy = anonymous(b) ? "visible" : styleValue(b.style, "overflow-y");
		let clip = ctx.clip;
		let dx = ctx.dx, dy = ctx.dy;
		if (ox !== "visible" || oy !== "visible") {
			const x = b.ax + ctx.dx + b.borderLeft, y = b.ay + ctx.dy + b.borderTop;
			const w = b.borderW - b.borderLeft - b.borderRight, h = b.borderH - b.borderTop - b.borderBottom;
			// (Its scrollbars aren't under what's in it: the content's cut at them, as a browser's is)
			const sw = b.scrollbarY ?? 0, sh = b.scrollbarX ?? 0;
			const c: IgeUiClip = [ox !== "visible" ? x : -1e6, oy !== "visible" ? y : -1e6, ox !== "visible" ? x + w - sw : 1e6, oy !== "visible" ? y + h - sh : 1e6];
			// Rounded (border-radius): the padding box's corners, its radii less the borders, what's in it cut to that shape
			// as well as to the rectangle short of the scrollbars (Chrome draws them inside the curve)
			if (ox !== "visible" && oy !== "visible") {
				const [rx, ry] = this._corners(b);
				const bx = [b.borderLeft, b.borderRight, b.borderRight, b.borderLeft], by = [b.borderTop, b.borderTop, b.borderBottom, b.borderBottom];
				const irx = rx.map((v, i) => Math.max(0, v - bx[i])) as [number, number, number, number], iry = ry.map((v, i) => Math.max(0, v - by[i])) as [number, number, number, number];
				withRound(c, { box: [x, y, x + w, y + h], rx: irx, ry: iry });
			}
			clip = intersect(clip, c);
			if (b.el && !b.pseudo) {
				const [sl, st] = this._scroll(b.el);
				dx -= sl;
				dy -= st;
			}
		}
		// clip-path cuts its contents too, as it does in a browser: to its border box here (the cut corners themselves aside)
		if (!anonymous(b) && styleValue(b.style, "clip-path") !== "none") {
			const x = b.ax + ctx.dx, y = b.ay + ctx.dy;
			clip = intersect(clip, [x, y, x + b.borderW, y + b.borderH]);
		}
		return { ...ctx, clip, dx, dy };
	}

	// ---------------------------------------------------------------- backgrounds, borders, shadows

	_background (b: IgeUiBox, ctx: Ctx): void {
		const s = b.style;
		if (styleValue(s, "visibility") === "hidden") return;
		const el = b.el;
		// (An anonymous box, round inline content or a flex item's text, has its parent's style but nothing to draw)
		if (!el) return;
		// (An SVG drawing's own elements are drawn as its shapes (IgeUiSvg), never with CSS boxes: a circle of class
		// "track" doesn't take a progress bar's .track background)
		if (SVG_CONTENT.has(el.localName)) return;
		// (The page's own backgrounds are the game's, behind the UI)
		if (el && !b.pseudo && (el.localName === "html" || el.localName === "body")) return;
		const x = b.ax + ctx.dx, y = b.ay + ctx.dy, w = b.borderW, h = b.borderH;
		if (w <= 0 && h <= 0) return;
		const current = parseColor(styleValue(s, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
		const radii = this._radii(b);
		const radiiY = this._radiiY(b);
		const chamfer = this._chamfer(b);
		const additive = /screen|plus-lighter|lighten/.test(styleValue(s, "mix-blend-mode"));
		const base: Omit<IgeUiPaintBox, "op" | "x" | "y" | "w" | "h"> = { radii, radiiY, chamfer, opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, additive: additive || undefined, el };
		const grow = (r: [number, number, number, number] | undefined, by: number) => r?.map((v) => (v > 0 ? v + by : v)) as [number, number, number, number] | undefined;
		// Outer shadows (glows), behind it (none with a clip-path: it cuts them off, as it does in a browser)
		const shadows = parseShadows(styleValue(s, "box-shadow"), lenCtx(s), current);
		const clipped = styleValue(s, "clip-path") !== "none";
		for (const sh of [...shadows].reverse()) {
			if (sh.inset || sh.color.a <= 0 || clipped) continue;
			this.items.push({ op: "box", ...base, x: x + sh.x - sh.spread, y: y + sh.y - sh.spread, w: w + sh.spread * 2, h: h + sh.spread * 2, color: sh.color, shadow: "outer", blur: sh.blur, spread: sh.spread, radii: radii.map((r) => (r > 0 ? r + sh.spread : r)) as [number, number, number, number], radiiY: grow(radiiY, sh.spread) });
		}
		// What's behind it, blurred (backdrop-filter: blur(), the panels' frosted glass), and its colour functions after
		// (grayscale(), contrast(): IgeUiFilters)
		const bdv = styleValue(s, "backdrop-filter");
		const bdOps = bdv && bdv !== "none" ? parseFilterList(bdv, lenCtx(s), current) : [];
		const colorOps = bdOps.flatMap((o) => (o.type === "matrix" ? [o.m] : []));
		if (bdOps.length) {
			const blur = bdOps.reduce((a, o) => (o.type === "blur" ? Math.max(a, o.radius) : a), 0);
			// (mask-image: a linear gradient fades it, tilt-shift's soft bands)
			const maskV = styleValue(s, "mask-image") !== "none" ? styleValue(s, "mask-image") : styleValue(s, "-webkit-mask-image");
			const mask = maskV && maskV !== "none" ? parseGradient(maskV, current) : undefined;
			if (blur > 0 || colorOps.length) this.items.push({ op: "box", ...base, x, y, w, h, backdrop: true, blur, color: { r: 0, g: 0, b: 0, a: 1 }, ...(colorOps.length ? { colorOps } : {}), ...(mask?.type === "linear" ? { mask } : {}) });
		}
		// clip-path: a polygon that isn't cut corners: the fills drawn in its shape (a gradient as its middle colour; no
		// border, as the shape cuts it away), the contents cut to the box
		const poly = this._clipPolygon(b);
		if (poly) {
			const fills: IgeCssColor[] = [];
			const c0 = parseColor(styleValue(s, "background-color"), current);
			if (c0 && c0.a > 0) fills.push(c0);
			const img = styleValue(s, "background-image");
			if (img !== "none") for (const l of splitTop(img, ",").map((v) => v.trim()).reverse()) {
				const g = parseGradient(l, current);
				const mid = g?.stops[Math.floor((g.stops.length - 1) / 2)]?.color;
				if (mid && mid.a > 0) fills.push(mid);
			}
			const at: number[] = [];
			for (let i = 0; i + 1 < poly.length; i += 2) at.push(x + poly[i], y + poly[i + 1]);
			const { tris, edges } = fillTriangles([{ points: at, closed: true }], [1, 0, 0, 1, 0, 0]);
			for (const color of fills) if (tris.length) this.items.push({ op: "fill", clip: base.clip, matrix: base.matrix, additive: base.additive, el: base.el, opacity: base.opacity, tris, edges, color });
			return;
		}
		// Fills: the colour, then image layers (the first listed on top)
		const bg = parseColor(styleValue(s, "background-color"), current);
		// (A range slider is drawn as its track and thumb (below), not its field's colour, as a browser's is)
		const slider = el.localName === "input" && el.getAttribute("type") === "range" && !b.pseudo;
		// (background-clip: text: its background is drawn in its text instead, IgeUiTextClip)
		const textClip = clipsToText(s);
		if (bg && bg.a > 0 && !slider && !textClip) this.items.push({ op: "box", ...base, x, y, w, h, color: bg });
		const img = styleValue(s, "background-image");
		if (img !== "none" && !textClip) {
			const layers = splitTop(img, ",").map((l) => l.trim()).reverse();
			layers.forEach((l, k) => {
				const g = parseGradient(l, current);
				if (g) {
					this.items.push({ op: "box", ...base, x, y, w, h, gradient: g });
					return;
				}
				// A picture (url(): IgeUiBackgroundImage), drawn once it's arrived
				const src = backgroundUrl(l);
				if (!src) return;
				this.requestImage?.(src);
				paintBackgroundImage(this.items, b, x, y, src, layers.length - 1 - k, this.imageSizes?.get(src), base, lenCtx(s));
			});
		}
		// Inset shadows, over the fill: inside the padding box (within the border), its corners' curves, as CSS draws them
		const ry = radiiY ?? radii;
		const [bt, br, bb, bl] = [b.borderTop, b.borderRight, b.borderBottom, b.borderLeft];
		const padX = [radii[0] - bl, radii[1] - br, radii[2] - br, radii[3] - bl].map((v) => Math.max(0, v)) as [number, number, number, number];
		const padY = [ry[0] - bt, ry[1] - bt, ry[2] - bb, ry[3] - bb].map((v) => Math.max(0, v)) as [number, number, number, number];
		const padRadiiY = padY.some((v, i) => Math.abs(v - padX[i]) > 1e-6) ? padY : undefined;
		for (const sh of [...shadows].reverse()) {
			if (!sh.inset || sh.color.a <= 0) continue;
			this.items.push({ op: "box", ...base, x: x + bl, y: y + bt, w: w - bl - br, h: h - bt - bb, color: sh.color, shadow: "inset", blur: sh.blur, spread: sh.spread, radii: padX, radiiY: padRadiiY, ...{ insetX: sh.x, insetY: sh.y } as object });
		}
		this._borders(b, ctx, x, y, w, h, current, base);
		// Outline (focus rings, the safe-area frame): a ring outside the border
		if (styleValue(s, "outline-style") !== "none") {
			const ow = Math.max(0, resolveLength(styleValue(s, "outline-width"), lenCtx(s)) ?? 3);
			const off = resolveLength(styleValue(s, "outline-offset"), lenCtx(s)) ?? 0;
			const oc = parseColor(styleValue(s, "outline-color"), current);
			if (ow > 0 && oc && oc.a > 0) {
				const ox = x - off - ow, oy = y - off - ow, owd = w + 2 * (off + ow), oh = h + 2 * (off + ow);
				const oradii = radii.map((r) => (r > 0 ? r + off + ow : 0)) as [number, number, number, number];
				const oradiiY = radiiY?.map((r) => (r > 0 ? r + off + ow : 0)) as [number, number, number, number] | undefined;
				const os = styleValue(s, "outline-style");
				// (Dashed and dotted: their dashes, as a border's are: IgeUiBorderDash)
				if (os === "dashed" || os === "dotted") {
					const side = { w: ow, c: oc, style: os };
					paintDashedBorder(this.items, ox, oy, owd, oh, [side, side, side, side], { ...base, radii: oradii, radiiY: oradiiY });
				} else this.items.push({ op: "box", ...base, x: ox, y: oy, w: owd, h: oh, color: oc, border: ow, radii: oradii, radiiY: oradiiY });
			}
		}
		// Replaced content: a canvas's surface, an image; an SVG's lines
		if (el && !b.pseudo) {
			const cx = x + b.borderLeft + b.paddingLeft, cy = y + b.borderTop + b.paddingTop;
			const cw = w - b.borderLeft - b.borderRight - b.paddingLeft - b.paddingRight, ch = h - b.borderTop - b.borderBottom - b.paddingTop - b.paddingBottom;
			if (el.localName === "canvas" || el.localName === "img") {
				// object-fit: contain and scale-down keep the picture to its shape inside its box, cover fills the box with it
				// (cut to the box), none leaves it its own size; object-position says where it sits
				const fit = styleValue(s, "object-fit");
				let [ix, iy, iw, ih] = [cx, cy, cw, ch];
				let clip = ctx.clip;
				// (Rounded, border-radius: the picture cut to its content box's curve, the radii less the borders and padding,
				// as a browser cuts it: a round portrait, the discovery's disc)
				const [rx, ry] = this._corners(b);
				if (rx.some((v, i) => v > 0 && ry[i] > 0)) {
					const l = cx - x, t = cy - y, r = x + w - (cx + cw), bt = y + h - (cy + ch);
					const ox = [l, r, r, l], oy = [t, t, bt, bt];
					const round = { box: [cx, cy, cx + cw, cy + ch] as [number, number, number, number], rx: rx.map((v, i) => Math.max(0, v - ox[i])) as [number, number, number, number], ry: ry.map((v, i) => Math.max(0, v - oy[i])) as [number, number, number, number] };
					clip = intersect(clip, withRound([cx, cy, cx + cw, cy + ch], round));
				}
				// (A picture's own size: an <img>'s once it's arrived, a canvas's surface)
				const nat = el.localName === "img" ? this.imageSizes?.get(el.getAttribute("src") ?? "") : undefined;
				const nw = nat ? nat.w : el.width, nh = nat ? nat.h : el.height;
				if (fit !== "fill" && nw > 0 && nh > 0 && cw > 0 && ch > 0) {
					const k = fit === "cover" ? Math.max(cw / nw, ch / nh) : fit === "none" ? 1 : Math.min(cw / nw, ch / nh, fit === "scale-down" ? 1 : Infinity);
					iw = nw * k;
					ih = nh * k;
					const [px, py] = objectPosition(styleValue(s, "object-position"), cw - iw, ch - ih, lenCtx(s));
					ix = cx + px;
					iy = cy + py;
					if (iw > cw + 0.01 || ih > ch + 0.01) clip = intersect(clip, [cx, cy, cx + cw, cy + ch]);
				}
				// (A surface the engine draws itself gives its own items: IgeUiHost's IgeUiSurface.paint)
				const surface = el.localName === "canvas" ? el._canvas : undefined;
				if (surface?.paint) surface.paint(this.items, ix, iy, iw, ih, ctx.opacity, clip, ctx.matrix);
				else this.items.push({ op: "image", x: ix, y: iy, w: iw, h: ih, source: el, opacity: ctx.opacity, clip, matrix: ctx.matrix, el, pixelated: styleValue(s, "image-rendering") === "pixelated" });
			// (An <svg> with no width or height draws nothing, as a browser's doesn't)
			} else if (el.localName === "svg") {
				if (cw > 0 && ch > 0) this._svg(el, cx, cy, cw, ch, ctx, current);
			}
			else if (el.localName === "input" && (el.getAttribute("type") === "range")) this._range(el, cx, cy, cw, ch, ctx);
		}
	}

	_radii (b: IgeUiBox): [number, number, number, number] {
		return this._corners(b)[0];
	}

	/** The corners' vertical radii when any corner's elliptical (else undefined: as _radii). */
	_radiiY (b: IgeUiBox): [number, number, number, number] | undefined {
		const [x, y] = this._corners(b);
		return x.some((v, i) => Math.abs(v - y[i]) > 1e-6) ? y : undefined;
	}

	/**
	 * Each corner's horizontal and vertical radius (tl, tr, br, bl): a percentage of the box's width across and its
	 * height down (50% on an oblong box: an ellipse), a second value its vertical one; all scaled down together so
	 * neighbouring corners fit, as CSS has them.
	 */
	_corners (b: IgeUiBox): [[number, number, number, number], [number, number, number, number]] {
		const s = b.style, W = b.borderW, H = b.borderH;
		const len = (v: string, size: number) => Math.max(0, v.endsWith("%") ? (parseFloat(v) / 100) * size : resolveLength(v, lenCtx(s, size)) ?? 0);
		const xs: [number, number, number, number] = [0, 0, 0, 0], ys: [number, number, number, number] = [0, 0, 0, 0];
		["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"].forEach((p, i) => {
			const v = splitTop(styleValue(s, p).trim(), " ").filter(Boolean);
			const rx = len(v[0] ?? "0", W), ry = len(v[1] ?? v[0] ?? "0", H);
			// (Either one 0: a square corner)
			if (rx > 0 && ry > 0) {
				xs[i] = rx;
				ys[i] = ry;
			}
		});
		// Scaled down so neighbouring corners fit
		const f = Math.min(1, W / Math.max(1e-6, xs[0] + xs[1]), W / Math.max(1e-6, xs[3] + xs[2]), H / Math.max(1e-6, ys[0] + ys[3]), H / Math.max(1e-6, ys[1] + ys[2]));
		if (f < 1) for (let i = 0; i < 4; i++) {
			xs[i] *= f;
			ys[i] *= f;
		}
		return [xs, ys];
	}

	/** clip-path: polygon() as cut corners, when it's the chamfer shape (the panels' look). */
	_chamfer (b: IgeUiBox): [number, number, number, number] | undefined {
		const v = styleValue(b.style, "clip-path");
		if (!v.startsWith("polygon(")) return undefined;
		const pts = splitTop(v.slice(8, -1), ",").map((p) => splitTop(p.trim(), " ").map((t) => t.trim()).filter(Boolean));
		const w = b.borderW, h = b.borderH;
		const at = (t: string, size: number) => resolveLength(t, { ...lenCtx(b.style, size) }) ?? 0;
		const P = pts.map(([px, py]) => [at(px ?? "0", w), at(py ?? "0", h)]);
		// (Only a shape whose points are all on the box's edges is cut corners: any other is a polygon, _clipPolygon)
		const on = (v: number, edge: number) => Math.abs(v - edge) < 0.01;
		if (!P.every(([x, y]) => on(x, 0) || on(y, 0) || on(x, w) || on(y, h))) return undefined;
		// The corner each point is near, and how far it's cut
		const cut: [number, number, number, number] = [0, 0, 0, 0];
		const corners: [number, number][] = [[0, 0], [w, 0], [w, h], [0, h]];
		corners.forEach(([cx, cy], k) => {
			const exact = P.some(([x, y]) => Math.abs(x - cx) < 0.5 && Math.abs(y - cy) < 0.5);
			if (exact) return;
			// The two points either side of it, on its edges
			let size = 0;
			for (const [x, y] of P) {
				if (Math.abs(y - cy) < 0.5 && Math.abs(x - cx) < Math.min(w, h)) size = Math.max(size, Math.abs(x - cx));
				if (Math.abs(x - cx) < 0.5 && Math.abs(y - cy) < Math.min(w, h)) size = Math.max(size, Math.abs(y - cy));
			}
			cut[k] = size;
		});
		return cut.some((c) => c > 0) ? cut : undefined;
	}

	/** clip-path: polygon() that isn't cut corners (a hexagon, a diamond): its points in the box's px, else undefined. */
	_clipPolygon (b: IgeUiBox): number[] | undefined {
		const v = styleValue(b.style, "clip-path");
		if (!v.startsWith("polygon(") || this._chamfer(b)) return undefined;
		const pts = splitTop(v.slice(8, -1), ",").map((p) => splitTop(p.trim(), " ").map((t) => t.trim()).filter(Boolean));
		// (A fill rule first, nonzero or evenodd: the same for a simple shape)
		if (pts[0]?.length === 1 && /^(nonzero|evenodd)$/.test(pts[0][0])) pts.shift();
		const w = b.borderW, h = b.borderH;
		const at = (t: string, size: number) => resolveLength(t, { ...lenCtx(b.style, size) }) ?? 0;
		const out: number[] = [];
		for (const [px, py] of pts) out.push(at(px ?? "0", w), at(py ?? "0", h));
		return out.length >= 6 ? out : undefined;
	}

	_borders (b: IgeUiBox, ctx: Ctx, x: number, y: number, w: number, h: number, current: IgeCssColor, base: Omit<IgeUiPaintBox, "op" | "x" | "y" | "w" | "h">): void {
		const s = b.style;
		const side = (n: string) => ({ w: [b.borderTop, b.borderRight, b.borderBottom, b.borderLeft][["top", "right", "bottom", "left"].indexOf(n)], c: parseColor(styleValue(s, `border-${n}-color`), current) ?? current, style: styleValue(s, `border-${n}-style`) });
		const t = side("top"), r = side("right"), bt = side("bottom"), l = side("left");
		const all = [t, r, bt, l];
		if (b.collapsed) {
			// A collapsed table's lines straddle the cells' edges: a cell draws the sides it has a border on, the
			// whole line's width (half of it outside its box); a line that's its neighbour's is drawn by the neighbour
			const line = b.collapsed;
			const sides = ["top", "right", "bottom", "left"] as const;
			all.forEach((e, i) => (e.w = styleValue(s, `border-${sides[i]}-style`) !== "none" && styleValue(s, `border-${sides[i]}-style`) !== "hidden" ? line[i] : 0));
			x -= line[3] / 2;
			y -= line[0] / 2;
			w += (line[1] + line[3]) / 2;
			h += (line[0] + line[2]) / 2;
		}
		if (all.every((e) => e.w <= 0 || e.c.a <= 0)) return;
		// Dashed and dotted sides: their dashes (IgeUiBorderDash)
		if (hasDashedSide(all)) {
			paintDashedBorder(this.items, x, y, w, h, [t, r, bt, l], base);
			return;
		}
		const same = all.every((e) => e.w === t.w && e.c.r === t.c.r && e.c.g === t.c.g && e.c.b === t.c.b && e.c.a === t.c.a);
		if (same && t.w > 0) {
			this.items.push({ op: "box", ...base, x, y, w, h, color: t.c, border: t.w });
			return;
		}
		// Sides of different colours meeting at a corner (a CSS triangle: transparent sides round a coloured one): each
		// side a trapezoid, the corners cut on the diagonal as a browser draws them
		const sameColour = (p: IgeCssColor, q: IgeCssColor) => p.r === q.r && p.g === q.g && p.b === q.b && p.a === q.a;
		const meet = (p: { w: number; c: IgeCssColor }, q: { w: number; c: IgeCssColor }) => p.w > 0 && q.w > 0 && !sameColour(p.c, q.c);
		if (!base.radii.some((v) => v > 0) && !base.chamfer && (meet(t, r) || meet(r, bt) || meet(bt, l) || meet(l, t))) {
			const ix0 = x + l.w, iy0 = y + t.w, ix1 = x + w - r.w, iy1 = y + h - bt.w;
			// Each side: its outer corners then its inner ones (clockwise), and the sides before and after it
			const sides: [{ w: number; c: IgeCssColor }, number[], { w: number; c: IgeCssColor }, { w: number; c: IgeCssColor }][] = [
				[t, [x, y, x + w, y, ix1, iy0, ix0, iy0], l, r],
				[r, [x + w, y, x + w, y + h, ix1, iy1, ix1, iy0], t, bt],
				[bt, [x + w, y + h, x, y + h, ix0, iy1, ix1, iy1], r, l],
				[l, [x, y + h, x, y, ix0, iy0, ix0, iy1], bt, t]
			];
			const area = (q: number[], i: number, j: number, k: number) => Math.abs((q[j] - q[i]) * (q[k + 1] - q[i + 1]) - (q[j + 1] - q[i + 1]) * (q[k] - q[i])) / 2;
			for (const [e, q, before, after] of sides) {
				if (e.w <= 0 || e.c.a <= 0) continue;
				// (A diagonal shared with a side of the same colour is cut sharp, so the two meet without a seam)
				const startEdge = sameColour(before.c, e.c) && before.w > 0 ? 0 : 1, endEdge = sameColour(after.c, e.c) && after.w > 0 ? 0 : 1;
				const tris: number[] = [], edges: number[] = [];
				// (Outer A, B, inner C, D: A B C, its edges A-B outline, B-C the end diagonal; A C D, C-D the inner edge, D-A the start diagonal)
				if (area(q, 0, 2, 4) > 1e-6) {
					tris.push(q[0], q[1], q[2], q[3], q[4], q[5]);
					edges.push(1 | (endEdge ? 2 : 0));
				}
				if (area(q, 0, 4, 6) > 1e-6) {
					tris.push(q[0], q[1], q[4], q[5], q[6], q[7]);
					edges.push(2 | (startEdge ? 4 : 0));
				}
				if (tris.length) this.items.push({ op: "fill", clip: base.clip, matrix: base.matrix, additive: base.additive, el: base.el, opacity: base.opacity, tris, edges, color: e.c });
			}
			void ctx;
			return;
		}
		// Per side: strips (square ends), clipped by the box's own shape
		const strip = (sx: number, sy: number, sw: number, sh: number, c: IgeCssColor) => {
			if (sw > 0 && sh > 0 && c.a > 0) this.items.push({ op: "box", ...base, x: sx, y: sy, w: sw, h: sh, color: c, radii: [0, 0, 0, 0], radiiY: undefined, chamfer: undefined });
		};
		strip(x, y, w, t.w, t.c);
		strip(x, y + h - bt.w, w, bt.w, bt.c);
		strip(x, y + t.w, l.w, h - t.w - bt.w, l.c);
		strip(x + w - r.w, y + t.w, r.w, h - t.w - bt.w, r.c);
		void ctx;
	}

	// ---------------------------------------------------------------- text

	/**
	 * A block's inline content: its inline elements' backgrounds and borders, then the text over them. `layer`: only
	 * what's in that positioned inline element (drawn in its own place in the stacking order); else what isn't in one.
	 */
	_inlineContent (b: IgeUiBox, ctx: Ctx, layer?: IgeUiBox): void {
		if (!b.runs && !b.fragments) {
			// (An empty field still shows its caret)
			if (!layer) this.fieldPaint?.(b, ctx, this.items);
			return;
		}
		const hidden = styleValue(b.style, "visibility") === "hidden";
		for (const f of b.fragments ?? []) {
			if (f.layer !== layer) continue;
			const fs = f.box.style;
			const current = parseColor(styleValue(fs, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
			const bg = parseColor(styleValue(fs, "background-color"), current);
			const x = b.ax + ctx.dx + f.x, y = b.ay + ctx.dy + f.y;
			const radii = this._radii({ ...f.box, borderW: f.w, borderH: f.h });
			if (bg && bg.a > 0) this.items.push({ op: "box", x, y, w: f.w, h: f.h, radii, color: bg, opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el: f.box.el });
			const img = styleValue(fs, "background-image");
			if (img !== "none") for (const l of splitTop(img, ",").reverse()) {
				const g = parseGradient(l.trim(), current);
				if (g) this.items.push({ op: "box", x, y, w: f.w, h: f.h, radii, gradient: g, opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el: f.box.el });
			}
			const bw = f.box.borderTop;
			const bc = parseColor(styleValue(fs, "border-top-color"), current);
			if (bw > 0 && bc && bc.a > 0) this.items.push({ op: "box", x, y, w: f.w, h: f.h, radii, color: bc, border: bw, opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el: f.box.el });
		}
		if (hidden) return;
		for (const r of b.runs ?? []) if (r.layer === layer) this._text(b, r, ctx);
		if (!layer) this.fieldPaint?.(b, ctx, this.items);
	}

	_text (b: IgeUiBox, r: IgeUiTextRun, ctx: Ctx): void {
		// (Its colour, visibility and glow as its element has them now: an animated colour, or one inherited from an animation)
		const live = r.el?._computed ?? r.style;
		if (styleValue(live, "visibility") === "hidden") return;
		const color = parseColor(styleValue(live, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
		const textClip = clipsToText(r.style);
		if (color.a <= 0 && !textClip) return;
		const shadows = parseShadows(styleValue(live, "text-shadow"), lenCtx(r.style), color);
		const x = b.ax + ctx.dx + r.x, y = b.ay + ctx.dy + r.y;
		// (Its element: the block's, or for an anonymous one (text straight in a flex item) the nearest element round it)
		let el = b.el;
		for (let q = b.parent; !el && q; q = q.parent) el = q.el;
		const item: IgeUiPaintText = { op: "text", text: r.text, x, y, w: r.w, font: r.font, letterSpacing: r.letterSpacing, color, opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el };
		// Glows first (each its own pass), then underlines and overlines, the text, and line-throughs over it (IgeUiTextDecoration)
		for (const sh of [...shadows].reverse()) {
			if (sh.color.a <= 0) continue;
			this.items.push({ ...item, shadow: { x: sh.x, y: sh.y, blur: sh.blur, color: sh.color } });
		}
		const decorations = textDecorations(r.el ?? el);
		const dm = decorations.length ? this.decorationMetrics?.(r.font) : undefined;
		const ascent = dm?.ascent ?? r.font.size * 0.9, grid = dm?.grid ?? 1;
		// (Skipping the glyphs' ink unless text-decoration-skip-ink says not to)
		const ink = decorations.length && this.inkSpans && styleValue(live, "text-decoration-skip-ink") !== "none" ? (top: number, bottom: number) => this.inkSpans!(item, top, bottom) : undefined;
		if (decorations.length) paintTextDecorations(this.items, item, decorations, ascent, grid, "under", ink);
		if (textClip) paintTextInBackground(this.items, item, r.style, b.ax + ctx.dx, b.ay + ctx.dy, b.borderW, b.borderH);
		else this.items.push(item);
		if (decorations.length) paintTextDecorations(this.items, item, decorations, ascent, grid, "over");
	}

	// ---------------------------------------------------------------- SVG (IgeUiSvg) and range sliders

	_svg (el: IgeUiElement, x: number, y: number, w: number, h: number, ctx: Ctx, current: IgeCssColor): void {
		paintSvg(this.items, el, x, y, w, h, ctx, current);
	}

	_range (el: IgeUiElement, x: number, y: number, w: number, h: number, ctx: Ctx): void {
		const min = Number(el.getAttribute("min") ?? 0), max = Number(el.getAttribute("max") ?? 100);
		const v = Number(el.value || (min + max) / 2);
		const t = max > min ? (v - min) / (max - min) : 0;
		// (Disabled: greyed, as a browser draws it)
		const accent = el.isDisabled ? { r: 197, g: 197, b: 197, a: 1 } : parseColor(styleValue(el._computed ?? {}, "accent-color")) ?? { r: 95, g: 227, b: 255, a: 1 };
		const track = { r: 120, g: 140, b: 155, a: 0.5 };
		const mid = y + h / 2;
		// (Through the transforms it's in, as the rest of it is)
		const at = { opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el };
		// The thumb's middle runs from half a thumb in from one end to half a thumb in from the other, as a browser's
		// does (and as a press maps to the value: IgeUiTap's rangeValueAt); the fill up to it
		const half = RANGE_THUMB / 2, cx = x + half + Math.max(0, w - RANGE_THUMB) * Math.min(1, Math.max(0, t));
		this.items.push({ op: "box", ...at, x, y: mid - 2, w, h: 4, radii: [2, 2, 2, 2], color: track });
		if (!el.isDisabled) this.items.push({ op: "box", ...at, x, y: mid - 2, w: cx - x, h: 4, radii: [2, 2, 2, 2], color: accent });
		this.items.push({ op: "box", ...at, x: cx - half, y: mid - half, w: RANGE_THUMB, h: RANGE_THUMB, radii: [half, half, half, half], color: accent });
	}
}

/**
 * A game scrollbar's thumb (IgeUiRoot.gameScrollbars), along a track `len` long showing `view` of `content`, scrolled
 * `pos` (its box's pixels): where it starts along the track and how long it is, a pixel in from each end, never
 * shorter than 18. As it's drawn, and as the pointer finds it.
 */
export function gameThumb (len: number, view: number, content: number, pos: number): { at: number; length: number } {
	const room = len - 2;
	const length = Math.max(18, (room * view) / Math.max(1e-6, content));
	return { at: 1 + ((room - length) * pos) / Math.max(1, content - view), length };
}

/** The display list as text (render-list snapshots in tests). */
export function describePaint (items: IgeUiPaintItem[]): string[] {
	const n = (v: number) => Math.round(v * 10) / 10;
	const c = (k: IgeCssColor) => `rgba(${Math.round(k.r)},${Math.round(k.g)},${Math.round(k.b)},${n(k.a)})`;
	return items.map((i) => {
		if (i.op === "box" && i.backdrop) return `backdrop ${n(i.x)},${n(i.y)} ${n(i.w)}x${n(i.h)} blur(${n(i.blur ?? 0)})${i.colorOps ? ` colour(${i.colorOps.length})` : ""}`;
		if (i.op === "box") return `box ${n(i.x)},${n(i.y)} ${n(i.w)}x${n(i.h)}${i.shadow ? ` ${i.shadow}(${n(i.blur ?? 0)})` : ""}${i.border ? ` border ${n(i.border)}` : ""} ${i.color ? c(i.color) : `${i.gradient?.type}-gradient`}${i.radii.some((r) => r) ? ` r${i.radii.map(n).join("/")}` : ""}${i.chamfer ? ` cut${i.chamfer.map(n).join("/")}` : ""}${i.opacity < 1 ? ` a${n(i.opacity)}` : ""}${i.clip ? ` clip[${i.clip.map(n).join(",")}]` : ""}`;
		if (i.op === "text") return `text "${i.text}" ${n(i.x)},${n(i.y)} ${i.font.size}px/${i.font.weight} ${c(i.color)}${i.shadow ? ` glow(${n(i.shadow.blur)})` : ""}${i.clip ? ` clip[${i.clip.map(n).join(",")}]` : ""}`;
		if (i.op === "image") return `image ${i.src ? "url" : i.source.localName} ${n(i.x)},${n(i.y)} ${n(i.w)}x${n(i.h)}`;
		if (i.op === "group" && i.open && i.filters && !i.filters.length) return `opacity(${n(i.opacity)}) {`;
		if (i.op === "group" && i.open && i.filters) return `filter ${i.filters.map((f) => (f.type === "blur" ? `blur(${n(f.radius)})` : f.type === "shadow" ? `drop-shadow(${n(f.x)},${n(f.y)} blur(${n(f.blur)}))` : "colour")).join(" ")} {`;
		if (i.op === "group") return i.open ? `drop-shadow ${(i.shadows ?? []).map((s) => `${n(s.x)},${n(s.y)} blur(${n(s.blur)}) ${c(s.color)}`).join(" ")} {` : "}";
		if (i.op === "fill") return `fill ${i.tris.length / 6}tris ${c(i.color)}${i.opacity < 1 ? ` a${n(i.opacity)}` : ""}`;
		return `line ${i.points.length / 2}pts ${c(i.color)}`;
	});
}

export { IDENTITY };
export type { IgeCssShadow };

/** A number read from CSS, or `d` when there's none (zero is zero). */
function numOr (v: string | null | undefined, d: number): number {
	const n = parseFloat(v ?? "");
	return Number.isFinite(n) ? n : d;
}
