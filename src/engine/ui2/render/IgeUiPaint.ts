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
import { paintSvg } from "@/engine/ui2/render/IgeUiSvg";

export type IgeUiClip = [number, number, number, number] | null;

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
	/** Cut corners (clip-path chamfers), the same order. */
	chamfer?: [number, number, number, number];
	/** A fill: a colour, or a gradient layer. */
	color?: IgeCssColor;
	gradient?: IgeCssGradient;
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

export type IgeUiPaintItem = IgeUiPaintBox | IgeUiPaintText | IgeUiPaintImage | IgeUiPaintLine | IgeUiPaintFill;

interface Ctx {
	clip: IgeUiClip;
	dx: number;
	dy: number;
	opacity: number;
	matrix?: IgeCssMatrix;
}

const lenCtx = (style: IgeUiComputedStyle, percent?: number) => ({ em: parseFloat(styleValue(style, "font-size")) || 16, rem: 16, percent, vw: 0, vh: 0, cqw: 0, cqh: 0 });

function intersect (a: IgeUiClip, b: IgeUiClip): IgeUiClip {
	if (!a) return b;
	if (!b) return a;
	return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
}

/** Turns a box tree into a display list. */
export class IgeUiPainter {
	items: IgeUiPaintItem[] = [];
	/** The UI's own size (fixed boxes and the root clip). */
	viewport = { w: 1280, h: 720 };
	/** Each scrolling box's offset (by element). */
	_scroll = (el: IgeUiElement | null): [number, number] => (el ? [el._scrollLeft, el._scrollTop] : [0, 0]);
	/** Drawn after a box's text: the focused field's caret or selection (dom/IgeUiTextField). */
	fieldPaint?: (b: IgeUiBox, ctx: Ctx, items: IgeUiPaintItem[]) => void;

	paint (root: IgeUiBox): IgeUiPaintItem[] {
		this.items = [];
		this.groups = new Map();
		this._context(root, { clip: null, dx: 0, dy: 0, opacity: 1 });
		return this.items;
	}

	/**
	 * Each box painted whole in one run of items (the root, positioned boxes, stacking contexts): where its items are,
	 * what it was painted in, and whether it was a stacking context. An animation that only changes how one looks
	 * repaints just its run (repaintGroup).
	 */
	groups = new Map<IgeUiBox, { start: number; end: number; ctx: Ctx; stacking: boolean }>();

	/** Paints one box's run again in place (its look changed, nothing moved); false when it has no run to replace. */
	repaintGroup (b: IgeUiBox): boolean {
		const g = this.groups.get(b);
		if (!g) return false;
		// (Which runs are in it and round it, by the boxes, not the item counts: a run can be empty)
		const under = (k: IgeUiBox, a: IgeUiBox) => {
			for (let q = k.parent; q; q = q.parent) if (q === a) return true;
			return false;
		};
		// (Runs inside it are recorded again as it's painted)
		for (const k of [...this.groups.keys()]) if (k !== b && under(k, b)) this.groups.delete(k);
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
		if (b.position !== "static" && b.zIndex !== undefined) return true;
		if (b.position === "fixed" || b.position === "sticky") return true;
		if (b.transform) return true;
		if (parseFloat(styleValue(b.style, "opacity")) < 1) return true;
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
		this._contextInner(b, ctx);
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
		positioned.sort((p, q) => p.z - q.z || p.order - q.order);
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
		const op = resolveNumber(styleValue(b.style, "opacity")) ?? 1;
		if (op <= 0.001) return undefined;
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
					return { ctx: { clip: [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], dx: ctx.dx, dy: ctx.dy, opacity: ctx.opacity * op, matrix } };
				}
			}
		}
		return { ctx: { clip: ctx.clip, dx: ctx.dx, dy: ctx.dy, opacity: ctx.opacity * op, matrix } };
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
	_scrollbars (b: IgeUiBox, ctx: Ctx): void {
		const sy = b.scrollbarY ?? 0, sx = b.scrollbarX ?? 0;
		if (!sy && !sx) return;
		const el = b.el;
		const [sl, st] = this._scroll(el);
		const sc = styleValue(b.style, "scrollbar-color");
		let thumb: IgeCssColor = { r: 193, g: 193, b: 193, a: 1 }, track: IgeCssColor | undefined = { r: 250, g: 250, b: 250, a: 1 };
		if (sc !== "auto") {
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
			const pad = 2, thick = Math.max(2, size - 8);
			const room = len - pad * 2;
			const tl = Math.max(18, (room * view) / content);
			const at = pad + ((room - tl) * pos) / Math.max(1, content - view);
			const r = thick / 2;
			if (vertical) this.items.push({ op: "box", x: tx + (size - thick) / 2, y: ty + at, w: thick, h: tl, radii: [r, r, r, r], color: thumb, ...base });
			else this.items.push({ op: "box", x: tx + at, y: ty + (size - thick) / 2, w: tl, h: thick, radii: [r, r, r, r], color: thumb, ...base });
		};
		if (sy) bar(true);
		if (sx) bar(false);
	}

	/** The context its children are drawn in: its overflow clip, its scroll offset. */
	_innerCtx (b: IgeUiBox, ctx: Ctx): Ctx {
		const ox = styleValue(b.style, "overflow-x"), oy = styleValue(b.style, "overflow-y");
		let clip = ctx.clip;
		let dx = ctx.dx, dy = ctx.dy;
		if (ox !== "visible" || oy !== "visible") {
			const x = b.ax + ctx.dx + b.borderLeft, y = b.ay + ctx.dy + b.borderTop;
			const w = b.borderW - b.borderLeft - b.borderRight, h = b.borderH - b.borderTop - b.borderBottom;
			const c: IgeUiClip = [ox !== "visible" ? x : -1e6, oy !== "visible" ? y : -1e6, ox !== "visible" ? x + w : 1e6, oy !== "visible" ? y + h : 1e6];
			clip = intersect(clip, c);
			if (b.el && !b.pseudo) {
				const [sl, st] = this._scroll(b.el);
				dx -= sl;
				dy -= st;
			}
		}
		// clip-path cuts its contents too, as it does in a browser: to its border box here (the cut corners themselves aside)
		if (styleValue(b.style, "clip-path") !== "none") {
			const x = b.ax + ctx.dx, y = b.ay + ctx.dy;
			clip = intersect(clip, [x, y, x + b.borderW, y + b.borderH]);
		}
		return { clip, dx, dy, opacity: ctx.opacity, matrix: ctx.matrix };
	}

	// ---------------------------------------------------------------- backgrounds, borders, shadows

	_background (b: IgeUiBox, ctx: Ctx): void {
		const s = b.style;
		if (styleValue(s, "visibility") === "hidden") return;
		const el = b.el;
		// (An anonymous box, round inline content or a flex item's text, has its parent's style but nothing to draw)
		if (!el) return;
		// (The page's own backgrounds are the game's, behind the UI)
		if (el && !b.pseudo && (el.localName === "html" || el.localName === "body")) return;
		const x = b.ax + ctx.dx, y = b.ay + ctx.dy, w = b.borderW, h = b.borderH;
		if (w <= 0 && h <= 0) return;
		const current = parseColor(styleValue(s, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
		const radii = this._radii(b);
		const chamfer = this._chamfer(b);
		const additive = /screen|plus-lighter|lighten/.test(styleValue(s, "mix-blend-mode"));
		const base: Omit<IgeUiPaintBox, "op" | "x" | "y" | "w" | "h"> = { radii, chamfer, opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, additive: additive || undefined, el };
		// Outer shadows (glows), behind it (none with a clip-path: it cuts them off, as it does in a browser)
		const shadows = parseShadows(styleValue(s, "box-shadow"), lenCtx(s), current);
		const clipped = styleValue(s, "clip-path") !== "none";
		for (const sh of [...shadows].reverse()) {
			if (sh.inset || sh.color.a <= 0 || clipped) continue;
			this.items.push({ op: "box", ...base, x: x + sh.x - sh.spread, y: y + sh.y - sh.spread, w: w + sh.spread * 2, h: h + sh.spread * 2, color: sh.color, shadow: "outer", blur: sh.blur, spread: sh.spread, radii: radii.map((r) => (r > 0 ? r + sh.spread : r)) as [number, number, number, number] });
		}
		// What's behind it, blurred (backdrop-filter: blur(), the panels' frosted glass)
		const bd = /blur\(\s*([^)]+)\)/.exec(styleValue(s, "backdrop-filter"));
		if (bd) {
			const blur = resolveLength(bd[1].trim(), lenCtx(s)) ?? 0;
			// (mask-image: a linear gradient fades it, tilt-shift's soft bands)
			const maskV = styleValue(s, "mask-image") !== "none" ? styleValue(s, "mask-image") : styleValue(s, "-webkit-mask-image");
			const mask = maskV && maskV !== "none" ? parseGradient(maskV, current) : undefined;
			if (blur > 0) this.items.push({ op: "box", ...base, x, y, w, h, backdrop: true, blur, color: { r: 0, g: 0, b: 0, a: 1 }, ...(mask?.type === "linear" ? { mask } : {}) });
		}
		// Fills: the colour, then image layers (the first listed on top)
		const bg = parseColor(styleValue(s, "background-color"), current);
		// (A range slider is drawn as its track and thumb (below), not its field's colour, as a browser's is)
		const slider = el.localName === "input" && el.getAttribute("type") === "range" && !b.pseudo;
		if (bg && bg.a > 0 && !slider) this.items.push({ op: "box", ...base, x, y, w, h, color: bg });
		const img = styleValue(s, "background-image");
		if (img !== "none") {
			const layers = splitTop(img, ",").map((l) => l.trim()).reverse();
			for (const l of layers) {
				const g = parseGradient(l, current);
				if (g) this.items.push({ op: "box", ...base, x, y, w, h, gradient: g });
			}
		}
		// Inset shadows, over the fill
		for (const sh of [...shadows].reverse()) {
			if (!sh.inset || sh.color.a <= 0) continue;
			this.items.push({ op: "box", ...base, x, y, w, h, color: sh.color, shadow: "inset", blur: sh.blur, spread: sh.spread, radii, ...{ insetX: sh.x, insetY: sh.y } as object });
		}
		this._borders(b, ctx, x, y, w, h, current, base);
		// Outline (focus rings, the safe-area frame): a ring outside the border
		if (styleValue(s, "outline-style") !== "none") {
			const ow = Math.max(0, resolveLength(styleValue(s, "outline-width"), lenCtx(s)) ?? 3);
			const off = resolveLength(styleValue(s, "outline-offset"), lenCtx(s)) ?? 0;
			const oc = parseColor(styleValue(s, "outline-color"), current);
			if (ow > 0 && oc && oc.a > 0) this.items.push({ op: "box", ...base, x: x - off - ow, y: y - off - ow, w: w + 2 * (off + ow), h: h + 2 * (off + ow), color: oc, border: ow, radii: radii.map((r) => (r > 0 ? r + off + ow : 0)) as [number, number, number, number] });
		}
		// Replaced content: a canvas's surface, an image; an SVG's lines
		if (el && !b.pseudo) {
			const cx = x + b.borderLeft + b.paddingLeft, cy = y + b.borderTop + b.paddingTop;
			const cw = w - b.borderLeft - b.borderRight - b.paddingLeft - b.paddingRight, ch = h - b.borderTop - b.borderBottom - b.paddingTop - b.paddingBottom;
			if (el.localName === "canvas" || el.localName === "img") {
				// object-fit: contain (and scale-down): the picture kept to its shape, in the middle of its box
				const fit = styleValue(s, "object-fit");
				let [ix, iy, iw, ih] = [cx, cy, cw, ch];
				const nw = el.width, nh = el.height;
				if ((fit === "contain" || fit === "scale-down") && nw > 0 && nh > 0 && cw > 0 && ch > 0) {
					const k = Math.min(cw / nw, ch / nh, fit === "scale-down" ? 1 : Infinity);
					iw = nw * k;
					ih = nh * k;
					ix = cx + (cw - iw) / 2;
					iy = cy + (ch - ih) / 2;
				}
				this.items.push({ op: "image", x: ix, y: iy, w: iw, h: ih, source: el, opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el, pixelated: styleValue(s, "image-rendering") === "pixelated" });
			} else if (el.localName === "svg") this._svg(el, cx, cy, cw, ch, ctx, current);
			else if (el.localName === "input" && (el.getAttribute("type") === "range")) this._range(el, cx, cy, cw, ch, ctx);
		}
	}

	_radii (b: IgeUiBox): [number, number, number, number] {
		const s = b.style;
		const r = (p: string) => {
			const v = styleValue(s, p).split(/\s+/)[0];
			const pct = v.endsWith("%");
			const n = resolveLength(v, lenCtx(s, Math.min(b.borderW, b.borderH)));
			return Math.max(0, pct ? (parseFloat(v) / 100) * Math.min(b.borderW, b.borderH) : n ?? 0);
		};
		const out: [number, number, number, number] = [r("border-top-left-radius"), r("border-top-right-radius"), r("border-bottom-right-radius"), r("border-bottom-left-radius")];
		// Scaled down so neighbouring corners fit
		const f = Math.min(1, b.borderW / Math.max(1e-6, out[0] + out[1]), b.borderW / Math.max(1e-6, out[3] + out[2]), b.borderH / Math.max(1e-6, out[0] + out[3]), b.borderH / Math.max(1e-6, out[1] + out[2]));
		return f < 1 ? (out.map((v) => v * f) as [number, number, number, number]) : out;
	}

	/** clip-path: polygon() as cut corners, when it's the chamfer shape (the panels' look). */
	_chamfer (b: IgeUiBox): [number, number, number, number] | undefined {
		const v = styleValue(b.style, "clip-path");
		if (!v.startsWith("polygon(")) return undefined;
		const pts = splitTop(v.slice(8, -1), ",").map((p) => splitTop(p.trim(), " ").map((t) => t.trim()).filter(Boolean));
		const w = b.borderW, h = b.borderH;
		const at = (t: string, size: number) => resolveLength(t, { ...lenCtx(b.style, size) }) ?? 0;
		const P = pts.map(([px, py]) => [at(px ?? "0", w), at(py ?? "0", h)]);
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
			if (sw > 0 && sh > 0 && c.a > 0) this.items.push({ op: "box", ...base, x: sx, y: sy, w: sw, h: sh, color: c, radii: [0, 0, 0, 0], chamfer: undefined });
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
		if (styleValue(r.style, "visibility") === "hidden") return;
		const color = parseColor(styleValue(r.style, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
		if (color.a <= 0) return;
		const shadows = parseShadows(styleValue(r.style, "text-shadow"), lenCtx(r.style), color);
		const x = b.ax + ctx.dx + r.x, y = b.ay + ctx.dy + r.y;
		const item: IgeUiPaintText = { op: "text", text: r.text, x, y, w: r.w, font: r.font, letterSpacing: r.letterSpacing, color, opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el: b.el };
		// Glows first (each its own pass), then the text
		for (const sh of [...shadows].reverse()) {
			if (sh.color.a <= 0) continue;
			this.items.push({ ...item, shadow: { x: sh.x, y: sh.y, blur: sh.blur, color: sh.color } });
		}
		this.items.push(item);
	}

	// ---------------------------------------------------------------- SVG (IgeUiSvg) and range sliders

	_svg (el: IgeUiElement, x: number, y: number, w: number, h: number, ctx: Ctx, current: IgeCssColor): void {
		paintSvg(this.items, el, x, y, w, h, ctx, current);
	}

	_range (el: IgeUiElement, x: number, y: number, w: number, h: number, ctx: Ctx): void {
		const min = Number(el.getAttribute("min") ?? 0), max = Number(el.getAttribute("max") ?? 100);
		const v = Number(el.value || (min + max) / 2);
		const t = max > min ? (v - min) / (max - min) : 0;
		const accent = parseColor(styleValue(el._computed ?? {}, "accent-color")) ?? { r: 95, g: 227, b: 255, a: 1 };
		const track = { r: 120, g: 140, b: 155, a: 0.5 };
		const mid = y + h / 2;
		this.items.push({ op: "box", x, y: mid - 2, w, h: 4, radii: [2, 2, 2, 2], color: track, opacity: ctx.opacity, clip: ctx.clip, el });
		this.items.push({ op: "box", x, y: mid - 2, w: w * t, h: 4, radii: [2, 2, 2, 2], color: accent, opacity: ctx.opacity, clip: ctx.clip, el });
		this.items.push({ op: "box", x: x + w * t - 8, y: mid - 8, w: 16, h: 16, radii: [8, 8, 8, 8], color: accent, opacity: ctx.opacity, clip: ctx.clip, el });
	}
}

/** The display list as text (render-list snapshots in tests). */
export function describePaint (items: IgeUiPaintItem[]): string[] {
	const n = (v: number) => Math.round(v * 10) / 10;
	const c = (k: IgeCssColor) => `rgba(${Math.round(k.r)},${Math.round(k.g)},${Math.round(k.b)},${n(k.a)})`;
	return items.map((i) => {
		if (i.op === "box" && i.backdrop) return `backdrop ${n(i.x)},${n(i.y)} ${n(i.w)}x${n(i.h)} blur(${n(i.blur ?? 0)})`;
		if (i.op === "box") return `box ${n(i.x)},${n(i.y)} ${n(i.w)}x${n(i.h)}${i.shadow ? ` ${i.shadow}(${n(i.blur ?? 0)})` : ""}${i.border ? ` border ${n(i.border)}` : ""} ${i.color ? c(i.color) : `${i.gradient?.type}-gradient`}${i.radii.some((r) => r) ? ` r${i.radii.map(n).join("/")}` : ""}${i.chamfer ? ` cut${i.chamfer.map(n).join("/")}` : ""}${i.opacity < 1 ? ` a${n(i.opacity)}` : ""}${i.clip ? ` clip[${i.clip.map(n).join(",")}]` : ""}`;
		if (i.op === "text") return `text "${i.text}" ${n(i.x)},${n(i.y)} ${i.font.size}px/${i.font.weight} ${c(i.color)}${i.shadow ? ` glow(${n(i.shadow.blur)})` : ""}${i.clip ? ` clip[${i.clip.map(n).join(",")}]` : ""}`;
		if (i.op === "image") return `image ${i.source.localName} ${n(i.x)},${n(i.y)} ${n(i.w)}x${n(i.h)}`;
		if (i.op === "fill") return `fill ${i.tris.length / 6}tris ${c(i.color)}${i.opacity < 1 ? ` a${n(i.opacity)}` : ""}`;
		return `line ${i.points.length / 2}pts ${c(i.color)}`;
	});
}

export { IDENTITY };
export type { IgeCssShadow };
