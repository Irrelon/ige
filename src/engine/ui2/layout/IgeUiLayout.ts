/**
 * Layout for the engine's UI: the box tree from the styled element tree, then
 * the CSS box model with block flow (sibling margins collapse), inline
 * formatting (line boxes, wrapping, baselines, vertical-align, inline
 * element backgrounds, text-align, text-overflow: ellipsis), flexbox (wrap,
 * grow and shrink, the automatic minimum size, justify and align, gaps, auto
 * margins), a grid subset (column tracks in px, %, fr, auto, minmax() and
 * repeat(), items placed in order, spans), tables (auto column widths,
 * colspan, border-spacing or collapse), absolute and fixed positioning
 * (static positions, shrink-to-fit), relative offsets, overflow and
 * scrolling extents. Intrinsic (min- and max-content) widths for
 * shrink-to-fit, flex bases and table columns.
 *
 * Sizes are the UI's own pixels (CSS px before the UI's scale).
 */
import { splitTop } from "@/engine/ui2/css/IgeCssParser";
import { type IgeCssLengthContext, parseTransform, resolveLength, resolveNumber } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement, IgeUiText } from "@/engine/ui2/dom/IgeUiDom";
import { contentHeight, contentLeft, contentTop, contentWidth, type IgeUiBox, type IgeUiInlineFragment, type IgeUiTextRun, newBox } from "@/engine/ui2/layout/IgeUiBox";
import { type IgeUiComputedStyle, styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";
import { fontWeight, type IgeUiFontProvider, type IgeUiFontSpec } from "@/engine/ui2/text/IgeUiFonts";

const INLINE_LEVEL = new Set(["inline", "inline-block", "inline-flex", "inline-grid", "inline-table", "text"]);
const ATOMIC_INLINE = new Set(["inline-block", "inline-flex", "inline-grid", "inline-table"]);
const REPLACED = new Set(["img", "canvas", "input", "svg", "video", "select", "textarea"]);

type Size = { min: number; max: number };

interface InlineItem {
	kind: "text" | "atom" | "open" | "close" | "break";
	/** Text: the words (white space already collapsed as its style says). */
	text?: string;
	style: IgeUiComputedStyle;
	box?: IgeUiBox;
	/** Open/close: the inline element's left (or right) margin + border + padding. */
	edge?: number;
	/** The positioned inline element it's in (drawn in that element's layer). */
	layer?: IgeUiBox;
}

interface PlacedItem {
	item: InlineItem;
	x: number;
	w: number;
	text?: string;
	/** Above and below the baseline (its own box for an atom; the content area plus half-leading for text). */
	above: number;
	below: number;
	valign: string;
	shift: number;
}

export class IgeUiLayoutEngine {
	fonts: IgeUiFontProvider;
	viewport = { w: 1280, h: 720 };
	rootFontSize = 16;
	_positioned: { box: IgeUiBox; cb: IgeUiBox | null }[] = [];
	_intrinsic = new Map<IgeUiBox, Size>();
	/** Natural sizes of images by src (filled in as they load). */
	imageSizes = new Map<string, { w: number; h: number }>();
	/**
	 * How much room a scrollbar takes (scrollbar-width: auto; thin is at most 11): a desktop browser's classic
	 * scrollbar is 15, overlay scrollbars (phones, a Mac's trackpad) take none: set 0 for those.
	 */
	scrollbarSize = 15;
	/**
	 * Device pixels per UI pixel (the UI's scale times the device's pixel ratio): a font's ascent and descent
	 * are rounded to them, as a browser does, so line boxes come out the same height.
	 */
	pixelGrid = 1;

	constructor (fonts: IgeUiFontProvider) {
		this.fonts = fonts;
	}

	/** A font's vertical metrics, its ascent and descent on the device's pixels. */
	metrics (f: IgeUiFontSpec): ReturnType<IgeUiFontProvider["metrics"]> {
		const g = this.pixelGrid > 0 ? this.pixelGrid : 1;
		const key = `${f.style} ${f.weight} ${f.size} ${f.family}@${g}`;
		let out = this._metricsCache.get(key);
		if (!out) {
			const m = this.fonts.metrics(f, g);
			out = { ...m, ascent: Math.round(m.ascent * g) / g, descent: Math.round(m.descent * g) / g };
			if (this._metricsCache.size > 500) this._metricsCache.clear();
			this._metricsCache.set(key, out);
		}
		return out;
	}

	// ---------------------------------------------------------------- the box tree

	/** Lays out the tree under `root` in a viewport of w x h; returns the root box. */
	/** Forgets what was worked out for the last layout (the viewport, fonts or device pixels may have changed). */
	_resetCaches (): void {
		this._lens = new WeakMap();
		this._fonts = new WeakMap();
		this._lineHeights = new WeakMap();
		this._metricsCache.clear();
	}

	layout (root: IgeUiElement, w: number, h: number): IgeUiBox {
		this.viewport = { w, h };
		this._positioned = [];
		this._intrinsic.clear();
		this._resetCaches();
		this.rootFontSize = parseFloat(styleValue(root._computed, "font-size")) || 16;
		const box = this.build(root, null)!;
		box.display = "block";
		this.layoutBox(box, w, h, { width: w, height: h });
		box.x = 0;
		box.y = 0;
		this._placePositioned(box);
		this._absolute(box, 0, 0);
		return box;
	}

	/**
	 * Lays out one absolutely (or fixed) positioned box again, and what's in it, in place: nothing outside depends
	 * on its size, so a change inside it (a HUD panel's numbers, a menu redrawn) needn't lay out the rest. Its
	 * static position is kept from the last full layout. Returns its new box (undefined: it can't be done this way,
	 * lay out everything).
	 */
	relayoutPositioned (old: IgeUiBox): IgeUiBox | undefined {
		const el = old.el, parent = old.parent;
		if (!el || !parent || old.pseudo) return undefined;
		const i = parent.children.indexOf(old);
		if (i < 0) return undefined;
		const cs = el._computed;
		const position = styleValue(cs, "position");
		if (styleValue(cs, "display") === "none" || (position !== "absolute" && position !== "fixed")) return undefined;
		this._positioned = [];
		this._intrinsic.clear();
		this._resetCaches();
		const nb = this.build(el, parent);
		if (!nb) return undefined;
		parent.children[i] = nb;
		nb.staticX = old.staticX;
		nb.staticY = old.staticY;
		this._positioned.push({ box: nb, cb: null });
		this._placePositioned(nb);
		this._absolute(nb, parent.ax, parent.ay);
		// (What's round it reaches as far as it now does)
		for (let p: IgeUiBox | null = parent; p; p = p.parent) this._ink(p);
		return nb;
	}

	build (el: IgeUiElement, parent: IgeUiBox | null): IgeUiBox | null {
		const cs = el._computed ?? {};
		const display = styleValue(cs, "display");
		if (display === "none") {
			this._clear(el);
			return null;
		}
		const box = newBox(el, cs, display === "list-item" ? "block" : display, parent);
		el._box = box;
		box.position = styleValue(cs, "position");
		const z = styleValue(cs, "z-index");
		if (z !== "auto" && box.position !== "static") box.zIndex = parseInt(z, 10) || 0;
		if (REPLACED.has(el.localName) && box.display === "inline") box.display = "inline-block";
		if (el._pseudo?.before) this._pseudoBox(el, "before", box);
		for (const n of el.childNodes) {
			if (n.nodeType === 3) {
				const t = (n as IgeUiText).data;
				if (t) box.children.push({ ...newBox(null, cs, "text", box), text: t });
			} else if (n.nodeType === 1) {
				const c = n as IgeUiElement;
				if (styleValue(c._computed, "display") === "contents") {
					for (const g of c.childNodes) {
						if (g.nodeType === 1) {
							const gb = this.build(g as IgeUiElement, box);
							if (gb) box.children.push(gb);
						} else if (g.nodeType === 3 && (g as IgeUiText).data) box.children.push({ ...newBox(null, c._computed ?? cs, "text", box), text: (g as IgeUiText).data });
					}
					c._box = undefined;
					continue;
				}
				const cb = this.build(c, box);
				if (cb) box.children.push(cb);
			}
		}
		if (el._pseudo?.after) this._pseudoBox(el, "after", box);
		// An input or textarea's value (or placeholder) as its text
		if (el.localName === "input" || el.localName === "textarea") {
			const type = el.getAttribute("type") ?? "text";
			if (type !== "range" && type !== "checkbox" && type !== "radio" && type !== "hidden") {
				// (The placeholder in its own style: ::placeholder, a browser's grey by default)
				const placeholder = !el.value;
				const v = el.value || el.getAttribute("placeholder") || "";
				const ts = placeholder && el._pseudo?.placeholder ? el._pseudo.placeholder : cs;
				if (v) box.children.push({ ...newBox(null, ts, "text", box), text: type === "password" && !placeholder ? "•".repeat(v.length) : v });
			}
		}
		return box;
	}

	_clear (el: IgeUiElement): void {
		el._box = undefined;
		for (const c of el.childNodes) if (c.nodeType === 1) this._clear(c as IgeUiElement);
	}

	_pseudoBox (el: IgeUiElement, which: "before" | "after", parent: IgeUiBox): void {
		const cs = el._pseudo![which]!;
		const display = styleValue(cs, "display");
		if (display === "none") return;
		const box = newBox(el, cs, display === "list-item" ? "block" : display, parent);
		box.pseudo = which;
		box.position = styleValue(cs, "position");
		const z = styleValue(cs, "z-index");
		if (z !== "auto" && box.position !== "static") box.zIndex = parseInt(z, 10) || 0;
		const text = contentText(cs.content ?? "", el);
		if (text) box.children.push({ ...newBox(null, cs, "text", box), text });
		parent.children.push(box);
	}

	// ---------------------------------------------------------------- lengths

	_ctx (style: IgeUiComputedStyle, percent?: number): IgeCssLengthContext {
		return { em: parseFloat(styleValue(style, "font-size")) || 16, rem: this.rootFontSize, percent, vw: this.viewport.w, vh: this.viewport.h, cqw: this.viewport.w, cqh: this.viewport.h };
	}

	/** A length property in px, or undefined (auto, none, or a percentage of something unknown). */
	len (style: IgeUiComputedStyle, prop: string, percent?: number): number | undefined {
		// (Cached by style and property for this layout: the same lengths are asked for many times over)
		let cache = this._lens.get(style);
		if (!cache) {
			cache = new Map();
			this._lens.set(style, cache);
		}
		const key = percent === undefined ? prop : `${prop}|${percent}`;
		if (cache.has(key)) return cache.get(key);
		const v = styleValue(style, prop);
		let out: number | undefined;
		if (v === "auto" || v === "none" || v === "normal" || v === "") out = undefined;
		else if (v === "thin") out = 1;
		else if (v === "medium") out = 3;
		else if (v === "thick") out = 5;
		else out = resolveLength(v, this._ctx(style, percent));
		cache.set(key, out);
		return out;
	}

	/** Lengths worked out this layout, by style. */
	_lens = new WeakMap<IgeUiComputedStyle, Map<string, number | undefined>>();
	_fonts = new WeakMap<IgeUiComputedStyle, IgeUiFontSpec>();
	_metricsCache = new Map<string, ReturnType<IgeUiFontProvider["metrics"]>>();
	_lineHeights = new WeakMap<IgeUiComputedStyle, number>();

	_edges (b: IgeUiBox, cbW: number): void {
		const s = b.style;
		// An anonymous box (round a flex or grid item's text, round inline content beside blocks) has its parent's
		// style for its text, but no edges of its own
		if (!b.el) {
			b.borderTop = b.borderRight = b.borderBottom = b.borderLeft = 0;
			b.paddingTop = b.paddingRight = b.paddingBottom = b.paddingLeft = 0;
			b.marginTop = b.marginRight = b.marginBottom = b.marginLeft = 0;
			return;
		}
		// Border widths on the device's pixels, as a browser draws them (never thinner than one); a collapsed table's
		// cells take half of each (the other half is their neighbour's, or outside the table)
		const bw = (side: "top" | "right" | "bottom" | "left") => (b.collapsed ? b.collapsed[["top", "right", "bottom", "left"].indexOf(side)] / 2 : this._borderWidth(s, side));
		b.borderTop = bw("top");
		b.borderRight = bw("right");
		b.borderBottom = bw("bottom");
		b.borderLeft = bw("left");
		// A collapsed table's own border: half of its outer lines (the other half is outside it)
		if ((b.display === "table" || b.display === "inline-table") && styleValue(s, "border-collapse") === "collapse") {
			const outer = this._collapseBorders(this._tableRows(b), b);
			b.borderTop = outer[0] / 2;
			b.borderRight = outer[1] / 2;
			b.borderBottom = outer[2] / 2;
			b.borderLeft = outer[3] / 2;
		}
		b.paddingTop = Math.max(0, this.len(s, "padding-top", cbW) ?? 0);
		b.paddingRight = Math.max(0, this.len(s, "padding-right", cbW) ?? 0);
		b.paddingBottom = Math.max(0, this.len(s, "padding-bottom", cbW) ?? 0);
		b.paddingLeft = Math.max(0, this.len(s, "padding-left", cbW) ?? 0);
		b.marginTop = this.len(s, "margin-top", cbW) ?? 0;
		b.marginRight = this.len(s, "margin-right", cbW) ?? 0;
		b.marginBottom = this.len(s, "margin-bottom", cbW) ?? 0;
		b.marginLeft = this.len(s, "margin-left", cbW) ?? 0;
	}

	/** A border's width in px, on the device's pixels (as a browser draws it: never thinner than one). */
	_borderWidth (s: IgeUiComputedStyle, side: "top" | "right" | "bottom" | "left"): number {
		const st = styleValue(s, `border-${side}-style`);
		if (st === "none" || st === "hidden") return 0;
		const v = styleValue(s, `border-${side}-width`);
		const w = Math.max(0, v === "thin" ? 1 : v === "medium" ? 3 : v === "thick" ? 5 : this.len(s, `border-${side}-width`) ?? 3);
		const g = this.pixelGrid > 0 ? this.pixelGrid : 1;
		return w > 0 && w * g < 1 ? 1 / g : Math.floor(w * g + 1e-6) / g;
	}

	/**
	 * A collapsed table's cell edges: each line the wider of the two borders that meet on it (the table's own on its
	 * outside). Returns the table's outer lines (the widest on each side).
	 */
	_collapseBorders (rows: IgeUiBox[], table?: IgeUiBox): [number, number, number, number] {
		const grid: IgeUiBox[][] = [];
		rows.forEach((row, r) => {
			let col = 0;
			grid[r] = [];
			for (const cell of this._cells(row)) {
				const span = Math.max(1, parseInt(cell.el?.getAttribute("colspan") ?? "1", 10) || 1);
				for (let k = 0; k < span; k++) grid[r][col + k] = cell;
				col += span;
			}
		});
		const own = new Map<IgeUiBox, [number, number, number, number]>();
		const w = (c: IgeUiBox) => {
			let o = own.get(c);
			if (!o) {
				o = [this._borderWidth(c.style, "top"), this._borderWidth(c.style, "right"), this._borderWidth(c.style, "bottom"), this._borderWidth(c.style, "left")];
				own.set(c, o);
			}
			return o;
		};
		const t: [number, number, number, number] = table ? [this._borderWidth(table.style, "top"), this._borderWidth(table.style, "right"), this._borderWidth(table.style, "bottom"), this._borderWidth(table.style, "left")] : [0, 0, 0, 0];
		const outer: [number, number, number, number] = [...t];
		grid.forEach((cells, r) => {
			cells.forEach((cell, col) => {
				if (!cell || cells[col - 1] === cell) return;
				const o = w(cell);
				const above = grid[r - 1]?.[col], below = grid[r + 1]?.[col];
				let last = col;
				while (cells[last + 1] === cell) last++;
				const left = cells[col - 1], right = cells[last + 1];
				cell.collapsed = [
					Math.max(o[0], above && above !== cell ? w(above)[2] : r === 0 ? t[0] : 0),
					Math.max(o[1], right ? w(right)[3] : t[1]),
					Math.max(o[2], below && below !== cell ? w(below)[0] : r === grid.length - 1 ? t[2] : 0),
					Math.max(o[3], left ? w(left)[1] : t[3])
				];
				if (r === 0) outer[0] = Math.max(outer[0], cell.collapsed[0]);
				if (r === grid.length - 1) outer[2] = Math.max(outer[2], cell.collapsed[2]);
				if (!left) outer[3] = Math.max(outer[3], cell.collapsed[3]);
				if (!right) outer[1] = Math.max(outer[1], cell.collapsed[1]);
			});
		});
		return outer;
	}

	_hEdges (b: IgeUiBox): number {
		return b.borderLeft + b.borderRight + b.paddingLeft + b.paddingRight;
	}

	_vEdges (b: IgeUiBox): number {
		return b.borderTop + b.borderBottom + b.paddingTop + b.paddingBottom;
	}

	_borderBox (b: IgeUiBox): boolean {
		return styleValue(b.style, "box-sizing") === "border-box";
	}

	/** A specified width as a border-box width (undefined: auto). */
	_specW (b: IgeUiBox, cbW: number | undefined, prop: string = "width"): number | undefined {
		// (An anonymous box's sizes are its parent's, not its own)
		if (!b.el) return undefined;
		const v = styleValue(b.style, prop);
		if (v === "auto" || v === "none" || v === "") return undefined;
		if (v === "fit-content" || v === "max-content" || v === "min-content") {
			const s = this.intrinsic(b);
			if (v === "min-content") return s.min;
			if (v === "max-content") return s.max;
			return cbW === undefined ? s.max : Math.min(s.max, Math.max(s.min, cbW - b.marginLeft - b.marginRight));
		}
		if (v.includes("%") && cbW === undefined) return undefined;
		const w = resolveLength(v, this._ctx(b.style, cbW));
		if (w === undefined) return undefined;
		return this._borderBox(b) ? w : w + this._hEdges(b);
	}

	_specH (b: IgeUiBox, cbH: number | undefined, prop: string = "height"): number | undefined {
		if (!b.el) return undefined;
		const v = styleValue(b.style, prop);
		if (v === "auto" || v === "none" || v === "" || v === "fit-content" || v === "max-content" || v === "min-content") return undefined;
		if (v.includes("%") && cbH === undefined) return undefined;
		const h = resolveLength(v, this._ctx(b.style, cbH));
		if (h === undefined) return undefined;
		return this._borderBox(b) ? h : h + this._vEdges(b);
	}

	_clampW (b: IgeUiBox, w: number, cbW: number | undefined): number {
		const max = this._specW(b, cbW, "max-width");
		const min = this._specW(b, cbW, "min-width");
		if (max !== undefined) w = Math.min(w, max);
		if (min !== undefined) w = Math.max(w, min);
		return Math.max(w, this._hEdges(b));
	}

	_clampH (b: IgeUiBox, h: number, cbH: number | undefined): number {
		const max = this._specH(b, cbH, "max-height");
		const min = this._specH(b, cbH, "min-height");
		if (max !== undefined) h = Math.min(h, max);
		if (min !== undefined) h = Math.max(h, min);
		return Math.max(h, this._vEdges(b));
	}

	// ---------------------------------------------------------------- fonts and text

	font (style: IgeUiComputedStyle): IgeUiFontSpec {
		let f = this._fonts.get(style);
		if (!f) {
			const fam = styleValue(style, "font-family");
			f = { family: fam, size: parseFloat(styleValue(style, "font-size")) || 16, weight: fontWeight(styleValue(style, "font-weight")), style: styleValue(style, "font-style") === "italic" || styleValue(style, "font-style") === "oblique" ? "italic" : "normal" };
			this._fonts.set(style, f);
		}
		return f;
	}

	letterSpacing (style: IgeUiComputedStyle): number {
		const v = styleValue(style, "letter-spacing");
		if (v === "normal") return 0;
		return resolveLength(v, this._ctx(style)) ?? 0;
	}

	textWidth (text: string, style: IgeUiComputedStyle): number {
		if (!text) return 0;
		return this.fonts.measure(text, this.font(style)) + this.letterSpacing(style) * [...text].length;
	}

	/** The used line-height in px. */
	lineHeight (style: IgeUiComputedStyle): number {
		const have = this._lineHeights.get(style);
		if (have !== undefined) return have;
		const lh = this._lineHeight(style);
		this._lineHeights.set(style, lh);
		return lh;
	}

	_lineHeight (style: IgeUiComputedStyle): number {
		const v = styleValue(style, "line-height");
		const f = this.font(style);
		if (v === "normal") {
			const m = this.metrics(f);
			return m.ascent + m.descent;
		}
		const n = resolveNumber(v);
		if (n !== undefined && /^[\d.]+$/.test(v.trim())) return n * f.size;
		return resolveLength(v, this._ctx(style, f.size)) ?? f.size * 1.2;
	}

	/** White space as the style keeps it, and the text transformed. */
	_prepText (text: string, style: IgeUiComputedStyle): string {
		const ws = styleValue(style, "white-space");
		let t = text;
		if (ws === "pre" || ws === "pre-wrap" || ws === "break-spaces") t = t.replace(/\t/g, "    ");
		else if (ws === "pre-line") t = t.replace(/[ \t]+/g, " ");
		else t = t.replace(/[ \t\n\r\f]+/g, " ");
		const tt = styleValue(style, "text-transform");
		if (tt === "uppercase") t = t.toUpperCase();
		else if (tt === "lowercase") t = t.toLowerCase();
		else if (tt === "capitalize") t = t.replace(/(^|\s)(\S)/g, (_, a: string, b: string) => a + b.toUpperCase());
		return t;
	}

	// ---------------------------------------------------------------- intrinsic widths

	/** Min- and max-content border-box widths. */
	intrinsic (b: IgeUiBox): Size {
		const cached = this._intrinsic.get(b);
		if (cached) return cached;
		this._edges(b, 0);
		const edges = this._hEdges(b);
		let s: Size;
		const specW = (() => {
			const v = styleValue(b.style, "width");
			if (v === "auto" || v.includes("%") || /content/.test(v)) return undefined;
			const w = resolveLength(v, this._ctx(b.style));
			return w === undefined ? undefined : this._borderBox(b) ? w : w + edges;
		})();
		if (specW !== undefined) s = { min: specW, max: specW };
		else if (b.el && REPLACED.has(b.el.localName) && !b.pseudo) {
			const w = this._replacedSize(b).w + edges;
			s = { min: w, max: w };
		} else if (b.display === "text") {
			s = this._inlineIntrinsic([b], b.parent?.style ?? b.style);
		} else {
			const inner = this._innerIntrinsic(b);
			s = { min: inner.min + edges, max: inner.max + edges };
		}
		const maxW = (() => {
			const v = styleValue(b.style, "max-width");
			if (v === "none" || v.includes("%")) return undefined;
			const w = resolveLength(v, this._ctx(b.style));
			return w === undefined ? undefined : this._borderBox(b) ? w : w + edges;
		})();
		const minW = (() => {
			const v = styleValue(b.style, "min-width");
			if (v === "auto" || v.includes("%")) return undefined;
			const w = resolveLength(v, this._ctx(b.style));
			return w === undefined ? undefined : this._borderBox(b) ? w : w + edges;
		})();
		if (maxW !== undefined) s = { min: Math.min(s.min, maxW), max: Math.min(s.max, maxW) };
		if (minW !== undefined) s = { min: Math.max(s.min, minW), max: Math.max(s.max, minW) };
		s.max = Math.max(s.max, s.min);
		this._intrinsic.set(b, s);
		return s;
	}

	_innerIntrinsic (b: IgeUiBox): Size {
		const kids = b.children.filter((c) => !this._outOfFlow(c));
		const d = b.display;
		if (d === "flex" || d === "inline-flex") {
			const dir = styleValue(b.style, "flex-direction");
			const row = dir === "row" || dir === "row-reverse";
			const gap = this.len(b.style, "column-gap") ?? 0;
			const wrap = styleValue(b.style, "flex-wrap") !== "nowrap";
			let min = 0, max = 0;
			for (const c of kids) {
				const s = c.display === "text" ? this._inlineIntrinsic([c], b.style) : this._marginBox(c);
				if (row) {
					min = wrap ? Math.max(min, s.min) : min + s.min;
					max += s.max;
				} else {
					min = Math.max(min, s.min);
					max = Math.max(max, s.max);
				}
			}
			if (row && kids.length > 1) {
				max += gap * (kids.length - 1);
				if (!wrap) min += gap * (kids.length - 1);
			}
			return { min, max };
		}
		if (d === "grid" || d === "inline-grid") {
			const cols = this._gridColumnCount(b, undefined);
			const gap = this.len(b.style, "column-gap") ?? 0;
			let min = 0, max = 0;
			for (const c of kids) {
				const s = this._marginBox(c);
				min = Math.max(min, s.min);
				max = Math.max(max, s.max);
			}
			return { min: min * cols + gap * (cols - 1), max: max * cols + gap * (cols - 1) };
		}
		if (d === "table" || d === "inline-table") {
			const t = this._tableColumns(b);
			const spacing = this._tableSpacing(b);
			const n = t.min.length;
			const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
			return { min: sum(t.min) + spacing * (n + 1), max: sum(t.max) + spacing * (n + 1) };
		}
		if (this._isInlineContext(b)) return this._inlineIntrinsic(kids, b.style);
		// Blocks, and runs of inline content between them (each run its own lines)
		let min = 0, max = 0;
		let run: IgeUiBox[] = [];
		const endRun = () => {
			if (!run.length) return;
			const s = this._inlineIntrinsic(run, b.style);
			min = Math.max(min, s.min);
			max = Math.max(max, s.max);
			run = [];
		};
		for (const c of kids) {
			if (this._outOfFlow(c)) continue;
			if (INLINE_LEVEL.has(c.display)) {
				run.push(c);
				continue;
			}
			endRun();
			const s = this._marginBox(c);
			min = Math.max(min, s.min);
			max = Math.max(max, s.max);
		}
		endRun();
		return { min, max };
	}

	_marginBox (c: IgeUiBox): Size {
		const s = this.intrinsic(c);
		// (Negative margins take room back, as they do in a browser's content sizes)
		const m = c.marginLeft + c.marginRight;
		return { min: Math.max(0, s.min + m), max: Math.max(0, s.max + m) };
	}

	_inlineIntrinsic (kids: IgeUiBox[], style: IgeUiComputedStyle): Size {
		const items: InlineItem[] = [];
		for (const k of kids) this._inlineItems(k, style, items);
		this._collapseSpaces(items);
		let min = 0, line = 0, max = 0;
		for (const it of items) {
			if (it.kind === "break") {
				max = Math.max(max, line);
				line = 0;
				continue;
			}
			if (it.kind === "atom") {
				const s = this._marginBox(it.box!);
				min = Math.max(min, s.min);
				line += s.max;
				continue;
			}
			if (it.kind === "open" || it.kind === "close") {
				line += it.edge ?? 0;
				continue;
			}
			const text = it.text ?? "";
			const ws = styleValue(it.style, "white-space");
			const noWrap = ws === "nowrap" || ws === "pre";
			line += this.textWidth(text, it.style);
			if (noWrap) min = Math.max(min, this.textWidth(text.trim(), it.style));
			else for (const word of text.split(/\s+/)) if (word) min = Math.max(min, this.textWidth(word, it.style));
			if (ws === "pre" || ws === "pre-wrap" || ws === "pre-line") {
				for (const part of text.split("\n")) max = Math.max(max, this.textWidth(part, it.style));
			}
		}
		max = Math.max(max, line);
		return { min: Math.ceil(min * 1000) / 1000, max: Math.ceil(max * 1000) / 1000 };
	}

	// ---------------------------------------------------------------- the box model

	_outOfFlow (b: IgeUiBox): boolean {
		return b.position === "absolute" || b.position === "fixed";
	}

	_isInlineContext (b: IgeUiBox): boolean {
		const kids = b.children.filter((c) => !this._outOfFlow(c));
		return kids.length > 0 && kids.every((c) => INLINE_LEVEL.has(c.display));
	}

	_replacedSize (b: IgeUiBox): { w: number; h: number } {
		const el = b.el!;
		const attrW = Number(el.getAttribute("width")), attrH = Number(el.getAttribute("height"));
		switch (el.localName) {
			case "canvas": return { w: attrW || 300, h: attrH || 150 };
			case "img": {
				const nat = this.imageSizes.get(el.getAttribute("src") ?? "");
				const w = attrW || nat?.w || 0, h = attrH || (nat && w ? (nat.h * w) / nat.w : nat?.h) || 0;
				return { w, h };
			}
			case "input": {
				const type = el.getAttribute("type") ?? "text";
				if (type === "checkbox" || type === "radio") return { w: 13, h: 13 };
				if (type === "range") return { w: 129, h: 21 };
				const f = this.font(b.style);
				const size = Number(el.getAttribute("size")) || 20;
				return { w: Math.round(size * f.size * 0.55), h: Math.round(this.lineHeight(b.style)) };
			}
			case "svg": return { w: attrW || 300, h: attrH || 150 };
			default: return { w: attrW || 300, h: attrH || 150 };
		}
	}

	/**
	 * Lays out a box's contents for a width: `opts.width` (border box) fixes it, else its own
	 * width or (block-level) all there is, or (`shrink`) shrink-to-fit. Its x, y are its parent's to set.
	 */
	layoutBox (b: IgeUiBox, cbW: number, cbH: number | undefined, opts: { width?: number; height?: number; shrink?: boolean; stretchH?: number } = {}): void {
		this._edges(b, cbW);
		const s = b.style;
		// The width
		let w = opts.width;
		if (w === undefined) {
			const spec = this._specW(b, cbW);
			if (spec !== undefined) w = spec;
			else if (b.el && REPLACED.has(b.el.localName) && !b.pseudo) {
				const r = this._replacedSize(b);
				const specH = this._specH(b, cbH);
				w = (specH !== undefined && r.h ? ((specH - this._vEdges(b)) * r.w) / r.h : r.w) + this._hEdges(b);
			} else if (opts.shrink) {
				const i = this.intrinsic(b);
				w = Math.min(i.max, Math.max(i.min, cbW - b.marginLeft - b.marginRight));
			} else w = cbW - b.marginLeft - b.marginRight;
			w = this._clampW(b, w, cbW);
		}
		b.borderW = Math.max(0, w);
		// Scrollbars: overflow: scroll (or scrollbar-gutter: stable) keeps room for one; auto, once its content overflows
		const ox = styleValue(s, "overflow-x"), oy = styleValue(s, "overflow-y");
		const bar = ox !== "visible" || oy !== "visible" ? this._scrollbarSize(s) : 0;
		const stable = styleValue(s, "scrollbar-gutter").startsWith("stable");
		b.scrollbarX = ox === "scroll" ? bar : 0;
		b.scrollbarY = oy === "scroll" || (stable && (oy === "auto" || oy === "hidden")) ? bar : 0;
		let cw = contentWidth(b);
		// Height known up front (used by flex columns, percentages inside)
		let fixedH = opts.height;
		if (fixedH === undefined) {
			const spec = this._specH(b, cbH);
			if (spec !== undefined) fixedH = this._clampH(b, spec, cbH);
		}
		const innerH = fixedH !== undefined ? Math.max(0, fixedH - this._vEdges(b)) : opts.stretchH !== undefined ? Math.max(0, opts.stretchH - this._vEdges(b)) : undefined;
		// The contents
		const d = b.display;
		const contents = (): number => {
			if (b.el && REPLACED.has(b.el.localName) && !b.pseudo && b.el.localName !== "input" && b.el.localName !== "textarea" && b.el.localName !== "select") {
				const r = this._replacedSize(b);
				b.children.forEach((c) => this._layoutHidden(c));
				const h = styleValue(s, "width") === "auto" && styleValue(s, "height") === "auto" ? r.h : r.w ? (cw * r.h) / r.w : r.h;
				if (b.el.localName === "svg") this._layoutSvg(b, cw, fixedH !== undefined ? fixedH - this._vEdges(b) : h);
				return h;
			}
			if (d === "flex" || d === "inline-flex") return this._layoutFlex(b, cw, innerH);
			if (d === "grid" || d === "inline-grid") return this._layoutGrid(b, cw, innerH);
			if (d === "table" || d === "inline-table") return this._layoutTable(b, cw, innerH);
			return this._layoutFlow(b, cw, innerH);
		};
		let contentH = contents();
		// The height
		const height = (): number => {
			let h = fixedH;
			if (h === undefined) {
				h = contentH + this._vEdges(b);
				if (opts.stretchH !== undefined) h = Math.max(h, opts.stretchH);
				h = this._clampH(b, h, cbH);
			}
			return Math.max(0, h);
		};
		b.borderH = height();
		// A button's contents are centred in it, top to bottom (as a browser's are)
		if (b.el?.localName === "button" && !b.pseudo && (d === "block" || d === "inline-block" || d === "flow-root")) {
			const dy = (b.borderH - this._vEdges(b) - contentH) / 2;
			if (dy > 0.01) this._shiftContent(b, dy);
		}
		// Overflow's reach; a scrollbar if it's needed (and the contents again, in what room's left)
		if (ox !== "visible" || oy !== "visible") {
			this._scrollExtent(b);
			if (bar && oy === "auto" && !b.scrollbarY && b.scrollH! > b.borderH - b.borderTop - b.borderBottom - b.scrollbarX! + 0.5) {
				b.scrollbarY = bar;
				cw = contentWidth(b);
				contentH = contents();
				b.borderH = height();
				this._scrollExtent(b);
			}
			if (bar && ox === "auto" && !b.scrollbarX && b.scrollW! > b.borderW - b.borderLeft - b.borderRight - b.scrollbarY! + 0.5) {
				b.scrollbarX = bar;
				b.borderH = height();
				this._scrollExtent(b);
			}
		}
		// Relative offsets are applied by the parent (after it places it); transforms recorded
		const tf = styleValue(s, "transform");
		b.transform = tf !== "none" ? parseTransform(tf, b.borderW, b.borderH, this._ctx(s)) : undefined;
		if (b.baseline === undefined) b.baseline = this._firstBaseline(b);
	}

	/**
	 * An SVG's shapes given boxes: their geometry's bounds (no stroke) through the viewBox, as a browser's client
	 * rects of them are (the drawing itself is the painter's).
	 */
	_layoutSvg (b: IgeUiBox, w: number, h: number): void {
		const el = b.el!;
		const vb = (el.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
		const sx = vb.length === 4 && vb[2] ? w / vb[2] : 1, sy = vb.length === 4 && vb[3] ? h / vb[3] : 1;
		const ox = contentLeft(b) + (vb.length === 4 ? -vb[0] * sx : 0), oy = contentTop(b) + (vb.length === 4 ? -vb[1] * sy : 0);
		const num = (e: IgeUiElement, a: string) => Number(e.getAttribute(a) ?? 0) || 0;
		/** A shape's bounds in the svg's box (undefined: nothing to measure). */
		const bounds = (c: IgeUiBox): [number, number, number, number] | undefined => {
			const e = c.el;
			if (!e) return undefined;
			let xs: number[] = [], ys: number[] = [];
			switch (e.localName) {
				case "line": xs = [num(e, "x1"), num(e, "x2")]; ys = [num(e, "y1"), num(e, "y2")]; break;
				case "polyline": case "polygon": {
					const n = (e.getAttribute("points") ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
					for (let i = 0; i + 1 < n.length; i += 2) {
						xs.push(n[i]);
						ys.push(n[i + 1]);
					}
					break;
				}
				case "circle": { const r = num(e, "r"); xs = [num(e, "cx") - r, num(e, "cx") + r]; ys = [num(e, "cy") - r, num(e, "cy") + r]; break; }
				case "ellipse": xs = [num(e, "cx") - num(e, "rx"), num(e, "cx") + num(e, "rx")]; ys = [num(e, "cy") - num(e, "ry"), num(e, "cy") + num(e, "ry")]; break;
				case "rect": xs = [num(e, "x"), num(e, "x") + num(e, "width")]; ys = [num(e, "y"), num(e, "y") + num(e, "height")]; break;
				case "g": {
					const kids = c.children.map(bounds).filter((k): k is [number, number, number, number] => !!k);
					if (!kids.length) return undefined;
					return [Math.min(...kids.map((k) => k[0])), Math.min(...kids.map((k) => k[1])), Math.max(...kids.map((k) => k[2])), Math.max(...kids.map((k) => k[3]))];
				}
				default: return undefined;
			}
			if (!xs.length) return undefined;
			return [ox + Math.min(...xs) * sx, oy + Math.min(...ys) * sy, ox + Math.max(...xs) * sx, oy + Math.max(...ys) * sy];
		};
		const place = (c: IgeUiBox, px: number, py: number) => {
			const r = bounds(c);
			if (r) {
				c.x = r[0] - px;
				c.y = r[1] - py;
				c.borderW = r[2] - r[0];
				c.borderH = r[3] - r[1];
			}
			for (const k of c.children) place(k, r ? r[0] : px, r ? r[1] : py);
		};
		for (const c of b.children) place(c, 0, 0);
	}

	/**
	 * Whether a box's contents are laid out the same whatever its height: block flow (not flex, grid, a table, a
	 * button that centres its contents, nor a scroller), and nothing in it sized from its height (percentages).
	 */
	_heightFree (b: IgeUiBox, cell: boolean = false): boolean {
		if (!b.el || b.pseudo) return false;
		const d = b.display;
		if (cell ? d !== "table-cell" : d !== "block" && d !== "inline-block" && d !== "flow-root" && d !== "list-item") return false;
		if (b.el.localName === "button" || REPLACED.has(b.el.localName)) return false;
		if (styleValue(b.style, "overflow-x") !== "visible" || styleValue(b.style, "overflow-y") !== "visible") return false;
		if (styleValue(b.style, "transform").includes("%")) return false;
		for (const c of b.children) {
			if (c.display === "text") continue;
			const h = styleValue(c.style, "height"), mh = styleValue(c.style, "min-height"), xh = styleValue(c.style, "max-height");
			if (h.includes("%") || mh.includes("%") || xh.includes("%")) return false;
		}
		return true;
	}

	/** A laid out box made taller or shorter without laying its contents out again (see _heightFree). */
	_resize (b: IgeUiBox, h: number): void {
		b.borderH = Math.max(0, h);
	}

	/** Moves a box's in-flow contents down (vertical alignment in a cell or a button). */
	_shiftContent (b: IgeUiBox, dy: number): void {
		for (const c of b.children) if (!this._outOfFlow(c) && c.display !== "text") c.y += dy;
		for (const r of b.runs ?? []) r.y += dy;
		for (const f of b.fragments ?? []) f.y += dy;
		for (const l of b.lines ?? []) l.y += dy;
	}

	/** A box's transform from its style at its size (an animation moved it). */
	layoutBoxTransform (b: IgeUiBox): IgeUiBox["transform"] {
		const tf = styleValue(b.style, "transform");
		return tf === "none" ? undefined : parseTransform(tf, b.borderW, b.borderH, this._ctx(b.style));
	}

	_layoutHidden (b: IgeUiBox): void {
		b.borderW = 0;
		b.borderH = 0;
	}

	_firstBaseline (b: IgeUiBox): number | undefined {
		if (b.lines?.length) return b.lines[0].y + b.lines[0].baseline;
		for (const c of b.children) {
			if (this._outOfFlow(c) || c.display === "text") continue;
			const cb = c.baseline ?? this._firstBaseline(c);
			if (cb !== undefined) return c.y + cb;
		}
		return undefined;
	}

	/** The room a scroll container's scrollbar takes (scrollbar-width). */
	_scrollbarSize (s: IgeUiComputedStyle): number {
		const v = styleValue(s, "scrollbar-width");
		if (v === "none" || !this.scrollbarSize) return 0;
		return v === "thin" ? Math.min(this.scrollbarSize, 11) : this.scrollbarSize;
	}

	_scrollExtent (b: IgeUiBox): void {
		let w = 0, h = 0;
		const left = b.borderLeft, top = b.borderTop;
		for (const c of b.children) {
			// (Text boxes hold no place of their own: their lines and runs are the block's)
			if (c.position === "fixed" || c.display === "text") continue;
			w = Math.max(w, c.x + c.borderW + Math.max(0, c.marginRight) - left);
			h = Math.max(h, c.y + c.borderH + Math.max(0, c.marginBottom) - top);
		}
		for (const r of b.runs ?? []) w = Math.max(w, r.x + r.w - left);
		for (const l of b.lines ?? []) h = Math.max(h, l.y + l.h - top);
		b.scrollW = w + b.paddingRight;
		b.scrollH = h + b.paddingBottom;
	}

	_applyRelative (c: IgeUiBox, cbW: number, cbH: number | undefined): void {
		if (c.position !== "relative" && c.position !== "sticky") return;
		const left = this.len(c.style, "left", cbW), right = this.len(c.style, "right", cbW);
		const top = this.len(c.style, "top", cbH), bottom = this.len(c.style, "bottom", cbH);
		if (c.position === "sticky") return;
		c.x += left !== undefined ? left : right !== undefined ? -right : 0;
		c.y += top !== undefined ? top : bottom !== undefined ? -bottom : 0;
	}

	// ---------------------------------------------------------------- block flow

	_layoutFlow (b: IgeUiBox, cw: number, innerH: number | undefined): number {
		b.runs = undefined;
		b.fragments = undefined;
		b.lines = undefined;
		const kids = b.children;
		if (!kids.length) return 0;
		if (this._isInlineContext(b)) {
			for (const c of kids) if (this._outOfFlow(c)) this._noteStatic(c, b, contentLeft(b), contentTop(b));
			return this._layoutInline(b, kids, cw);
		}
		// Block children; runs of inline-level ones in anonymous blocks
		const groups: IgeUiBox[] = [];
		let run: IgeUiBox[] = [];
		const flush = () => {
			if (!run.length) return;
			// (White space alone between blocks is nothing)
			if (run.every((r) => r.display === "text" && !/\S/.test(r.text ?? "") && styleValue(b.style, "white-space").startsWith("pre") === false)) {
				run = [];
				return;
			}
			const anon = newBox(null, b.style, "block", b);
			anon.children = run;
			for (const r of run) r.parent = anon;
			groups.push(anon);
			run = [];
		};
		for (const c of kids) {
			if (this._outOfFlow(c)) {
				flush();
				groups.push(c);
			} else if (INLINE_LEVEL.has(c.display)) run.push(c);
			else {
				flush();
				groups.push(c);
			}
		}
		flush();
		b.children = groups;
		let y = contentTop(b);
		let prevMB: number | undefined;
		const left = contentLeft(b);
		// Margins that meet through this box (no border or padding between, no formatting context of its own): its first
		// child's top margin and its last child's bottom margin collapse with its own, as a browser's do
		const through = this._collapsesThrough(b);
		const topOpen = through && b.borderTop === 0 && b.paddingTop === 0;
		const bottomOpen = through && b.borderBottom === 0 && b.paddingBottom === 0 && innerH === undefined && !(this.len(b.style, "min-height") ?? 0);
		let first = true;
		let lastBlock = false;
		for (const c of groups) {
			if (this._outOfFlow(c)) {
				this._noteStatic(c, b, left, y + (prevMB !== undefined ? Math.max(0, prevMB) : 0));
				continue;
			}
			const isFirst = first;
			first = false;
			lastBlock = false;
			if (c.el === null && !c.pseudo) {
				// An anonymous block of inline content
				c.style = b.style;
				c.borderW = cw;
				c.x = left;
				const h = this._layoutInline(c, c.children, cw);
				c.borderH = h;
				const gap = prevMB !== undefined ? Math.max(0, prevMB) : 0;
				c.y = y + gap;
				y = c.y + h;
				prevMB = 0;
				continue;
			}
			// (A button in the flow is as wide as what's in it, as a browser's is, unless it's given a width)
			this.layoutBox(c, cw, innerH, c.el?.localName === "button" && !c.pseudo ? { shrink: true } : {});
			// Auto margins centre a block with a width
			let x = left + c.marginLeft;
			const ml = styleValue(c.style, "margin-left"), mr = styleValue(c.style, "margin-right");
			const free = cw - c.borderW - c.marginLeft - c.marginRight;
			if (ml === "auto" && mr === "auto") x = left + Math.max(0, (cw - c.borderW) / 2);
			else if (ml === "auto") x = left + Math.max(0, cw - c.borderW - c.marginRight);
			else if (mr !== "auto" && free < 0 && false) x = left;
			c.x = x;
			let gap = prevMB === undefined ? c.marginTop : collapse(prevMB, c.marginTop);
			// (The first child's top margin is this box's now: it starts at the top of its content)
			if (isFirst && topOpen) {
				b.marginTop = collapse(b.marginTop, c.marginTop);
				gap = 0;
			}
			c.y = y + gap;
			y = c.y + c.borderH;
			prevMB = c.marginBottom;
			lastBlock = true;
			this._applyRelative(c, cw, innerH);
		}
		// (The last child's bottom margin likewise: this box ends at its border)
		if (bottomOpen && lastBlock && prevMB !== undefined) {
			b.marginBottom = collapse(b.marginBottom, prevMB);
			return y - contentTop(b);
		}
		return y + (prevMB ?? 0) - contentTop(b);
	}

	/**
	 * Whether a block's margins can collapse with its children's: an element's block in a block flow, not a
	 * formatting context of its own (a flex or grid item, a scroller, a button, something out of the flow).
	 */
	_collapsesThrough (b: IgeUiBox): boolean {
		if (!b.el || b.pseudo || (b.display !== "block" && b.display !== "list-item")) return false;
		const p = b.parent;
		if (!p || /^(inline-)?(flex|grid)$/.test(p.display)) return false;
		if (b.el.localName === "button" || REPLACED.has(b.el.localName)) return false;
		const s = b.style;
		if (styleValue(s, "overflow-x") !== "visible" || styleValue(s, "overflow-y") !== "visible") return false;
		const pos = styleValue(s, "position");
		return pos !== "absolute" && pos !== "fixed";
	}

	_noteStatic (c: IgeUiBox, parent: IgeUiBox, x: number, y: number): void {
		c.staticX = x;
		c.staticY = y;
		this._positioned.push({ box: c, cb: null });
		void parent;
	}

	// ---------------------------------------------------------------- inline formatting

	_inlineItems (b: IgeUiBox, parentStyle: IgeUiComputedStyle, out: InlineItem[], layer?: IgeUiBox): void {
		if (b.display === "text") {
			out.push({ kind: "text", text: this._prepText(b.text ?? "", b.style), style: b.style, layer });
			return;
		}
		if (this._outOfFlow(b)) return;
		if (b.el?.localName === "br" && !b.pseudo) {
			out.push({ kind: "break", style: b.style });
			return;
		}
		if (ATOMIC_INLINE.has(b.display) || b.display !== "inline") {
			out.push({ kind: "atom", box: b, style: b.style });
			return;
		}
		// An inline element: its edges and its contents (a positioned one is a layer of its own: what's in it is drawn with it)
		this._edges(b, 0);
		const own = b.position !== "static" ? b : layer;
		out.push({ kind: "open", box: b, style: b.style, edge: b.marginLeft + b.borderLeft + b.paddingLeft, layer: own });
		for (const c of b.children) this._inlineItems(c, b.style, out, own);
		out.push({ kind: "close", box: b, style: b.style, edge: b.marginRight + b.borderRight + b.paddingRight, layer: own });
		void parentStyle;
	}

	/**
	 * White space collapsed across the inline content, as a browser does: a space after a space (an inline
	 * element's edge between them or not) goes, and so do spaces at the start and end of the content and round
	 * a line break.
	 */
	_collapseSpaces (items: InlineItem[]): InlineItem[] {
		const collapsible = (it: InlineItem) => {
			const ws = styleValue(it.style, "white-space");
			return ws !== "pre" && ws !== "pre-wrap" && ws !== "break-spaces";
		};
		let prevSpace = true;
		let lastText: InlineItem | undefined;
		const trimEnd = () => {
			if (lastText && collapsible(lastText)) lastText.text = (lastText.text ?? "").replace(/ +$/, "");
			lastText = undefined;
		};
		for (const it of items) {
			if (it.kind === "text") {
				if (!collapsible(it)) {
					prevSpace = false;
					lastText = undefined;
					continue;
				}
				let t = it.text ?? "";
				if (prevSpace) t = t.replace(/^ +/, "");
				it.text = t;
				if (t) {
					prevSpace = t.endsWith(" ");
					lastText = it;
				}
			} else if (it.kind === "atom") {
				prevSpace = false;
				lastText = undefined;
			} else if (it.kind === "break") {
				trimEnd();
				prevSpace = true;
			}
		}
		trimEnd();
		return items;
	}

	/** Lays out inline content into line boxes; returns the lines' height. Runs and fragments go on `b`. */
	_layoutInline (b: IgeUiBox, kids: IgeUiBox[], cw: number): number {
		const items: InlineItem[] = [];
		for (const k of kids) this._inlineItems(k, b.style, items);
		this._collapseSpaces(items);
		const style = b.style;
		const ws = styleValue(style, "white-space");
		const runs: IgeUiTextRun[] = [];
		const fragments: IgeUiInlineFragment[] = [];
		const lines: NonNullable<IgeUiBox["lines"]> = [];
		const left = contentLeft(b), top = contentTop(b);
		const strut = this._strut(style);
		const indent = this.len(style, "text-indent", cw) ?? 0;
		let line: PlacedItem[] = [];
		let x = indent;
		let y = 0;
		// Inline elements open across lines
		const open: IgeUiBox[] = [];
		const openAt = new Map<IgeUiBox, number>();
		const firstSeen = new Set<IgeUiBox>();
		/** Inline elements open on this line: where their content starts, whether it's their first line, and how much of the line came before them. */
		const lineOpen: { box: IgeUiBox; from: number; first: boolean; at: number; to?: number }[] = [];
		const finishLine = (last: boolean) => {
			// Trailing white space hangs
			for (let i = line.length - 1; i >= 0; i--) {
				const p = line[i];
				if (p.item.kind !== "text") break;
				const trimmed = (p.text ?? "").replace(/ +$/, "");
				if (trimmed !== p.text && !(ws === "pre" || ws === "pre-wrap")) {
					p.text = trimmed;
					p.w = this.textWidth(trimmed, p.item.style);
				}
				if (trimmed) break;
			}
			let lineW = 0;
			for (const p of line) lineW = Math.max(lineW, p.x + p.w);
			// Heights round the baseline
			let above = strut.above, below = strut.below;
			for (const p of line) {
				if (p.valign === "top" || p.valign === "bottom") continue;
				above = Math.max(above, p.above + p.shift);
				below = Math.max(below, p.below - p.shift);
			}
			let h = above + below;
			for (const p of line) if (p.valign === "top" || p.valign === "bottom") h = Math.max(h, p.above + p.below);
			if (!line.length && !lines.length && last) h = 0;
			// Alignment
			const align = styleValue(style, "text-align");
			const free = cw - lineW;
			let dx = 0;
			if (align === "center" || align === "-internal-center" || align === "-webkit-center") dx = free / 2;
			else if (align === "right" || align === "end") dx = free;
			if (free < 0) dx = Math.min(0, dx) * 0;
			const baseline = above;
			for (const p of line) {
				const px = left + p.x + dx;
				let by: number;
				if (p.valign === "top") by = top + y + p.above;
				else if (p.valign === "bottom") by = top + y + h - p.below;
				else by = top + y + baseline - p.shift;
				if (p.item.kind === "text" && p.text) {
					runs.push({ text: p.text, x: px, y: by, w: p.w, font: this.font(p.item.style), letterSpacing: this.letterSpacing(p.item.style), style: p.item.style, layer: p.item.layer });
					if (p.item.layer) p.item.layer.layerBlock = b;
				} else if (p.item.kind === "atom") {
					const a = p.item.box!;
					a.x = px + a.marginLeft;
					a.y = by - (p.above - a.marginTop);
					this._applyRelative(a, cw, undefined);
				}
			}
			// Inline element decorations on this line
			const fragFor = (box: IgeUiBox, from: number, to: number, first: boolean, lastOne: boolean) => {
				const f = this.font(box.style);
				const m = this.metrics(f);
				// (Raised or lowered with its text: vertical-align as a length, sub, super)
				const shift = vfor(box.style).shift;
				let layer: IgeUiBox | undefined;
				for (let p: IgeUiBox | null = box; p && p !== b && p.display === "inline"; p = p.parent) {
					if (p.position !== "static") {
						layer = p;
						break;
					}
				}
				if (layer) layer.layerBlock = b;
				fragments.push({
					box, first, last: lastOne, layer,
					x: left + from + dx - (first ? box.paddingLeft + box.borderLeft : 0),
					y: top + y + baseline - shift - m.ascent - box.paddingTop - box.borderTop,
					w: to - from + (first ? box.paddingLeft + box.borderLeft : 0) + (lastOne ? box.paddingRight + box.borderRight : 0),
					h: m.ascent + m.descent + box.paddingTop + box.paddingBottom + box.borderTop + box.borderBottom
				});
			};
			// (An element opened at the very end of the line, nothing of it on it yet, starts on the next line instead)
			const carried = new Set<IgeUiBox>();
			for (const o of lineOpen) {
				if (!last && o.to === undefined && o.first && o.at === line.length) {
					carried.add(o.box);
					continue;
				}
				fragFor(o.box, o.from, o.to ?? lineW, o.first, o.to !== undefined);
			}
			lineOpen.length = 0;
			let carryX = 0;
			for (const box of open) {
				if (carried.has(box)) {
					carryX += box.marginLeft + box.borderLeft + box.paddingLeft;
					lineOpen.push({ box, from: carryX, first: true, at: 0 });
				} else lineOpen.push({ box, from: 0, first: false, at: 0 });
			}
			lines.push({ y: top + y, h, baseline, w: lineW });
			y += h;
			line = [];
			x = carryX;
		};
		const vfor = (st: IgeUiComputedStyle): { valign: string; shift: number } => {
			const va = styleValue(st, "vertical-align");
			if (va === "baseline" || va === "top" || va === "bottom") return { valign: va, shift: 0 };
			if (va === "middle") return { valign: va, shift: 0 };
			if (va === "sub") return { valign: va, shift: -(parseFloat(styleValue(st, "font-size")) || 16) * 0.2 };
			if (va === "super") return { valign: va, shift: (parseFloat(styleValue(st, "font-size")) || 16) * 0.35 };
			if (va === "text-top" || va === "text-bottom") return { valign: va, shift: 0 };
			const n = resolveLength(va, this._ctx(st, this.lineHeight(st)));
			return { valign: "baseline", shift: n ?? 0 };
		};
		const wrapOK = ws !== "nowrap" && ws !== "pre";
		for (const it of items) {
			if (it.kind === "break") {
				finishLine(false);
				continue;
			}
			if (it.kind === "open") {
				const box = it.box!;
				x += it.edge ?? 0;
				open.push(box);
				openAt.set(box, x);
				lineOpen.push({ box, from: x, first: !firstSeen.has(box), at: line.length });
				firstSeen.add(box);
				continue;
			}
			if (it.kind === "close") {
				const box = it.box!;
				const o = lineOpen.find((l) => l.box === box);
				if (o) o.to = x;
				x += it.edge ?? 0;
				const i = open.indexOf(box);
				if (i >= 0) open.splice(i, 1);
				continue;
			}
			if (it.kind === "atom") {
				const a = it.box!;
				this.layoutBox(a, cw, undefined, { shrink: true });
				a.atomic = true;
				const mw = a.borderW + a.marginLeft + a.marginRight;
				if (line.length && wrapOK && x + mw > cw + 0.01) finishLine(false);
				const v = vfor(a.style);
				const baseline = a.baseline !== undefined && styleValue(a.style, "overflow-x") === "visible" ? a.baseline : a.borderH;
				let above = baseline + a.marginTop, below = a.borderH - baseline + a.marginBottom;
				if (v.valign === "middle") {
					const xh = this.metrics(this.font(style)).xHeight;
					const mid = (a.borderH + a.marginTop + a.marginBottom) / 2;
					above = mid + xh / 2;
					below = mid - xh / 2;
				}
				line.push({ item: it, x, w: mw, above, below, valign: v.valign, shift: v.shift });
				x += mw;
				continue;
			}
			// Text: words, wrapped as they fit
			const text = it.text ?? "";
			if (!text) continue;
			const f = this.font(it.style);
			const m = this.metrics(f);
			const lh = this.lineHeight(it.style);
			const lead = this._leading(lh, m);
			// (Text straight in the block is on the baseline: the block's own vertical-align, a table cell's, isn't its)
			const v = it.style === style ? { valign: "baseline", shift: 0 } : vfor(it.style);
			let above = m.ascent + lead.above, below = m.descent + lead.below;
			if (v.valign === "middle") {
				const pm = this.metrics(this.font(style));
				const mid = (m.ascent - m.descent) / 2;
				above = mid + pm.xHeight / 2 + (lh / 2);
				below = lh - above;
			}
			const itemWs = styleValue(it.style, "white-space");
			const canWrap = itemWs !== "nowrap" && itemWs !== "pre";
			// Text that can't wrap (nowrap) and doesn't fit: on the next line, if the line can break before it (after a
			// space it may wrap at, or an inline block), as a browser's does
			if (!canWrap && wrapOK && line.length) {
				const prev = line[line.length - 1];
				const breakable = prev.item.kind === "atom" || (prev.item.kind === "text" && / $/.test(prev.text ?? "") && !/^(nowrap|pre)$/.test(styleValue(prev.item.style, "white-space")));
				if (breakable && x + this.textWidth(text.replace(/ +$/, ""), it.style) > cw + 0.05) finishLine(false);
			}
			const pieces = itemWs === "pre" || itemWs === "pre-wrap" || itemWs === "pre-line" ? text.split(/(\n)/) : [text];
			for (const piece of pieces) {
				if (piece === "\n") {
					finishLine(false);
					continue;
				}
				// Segments: each word with its following space
				const segs = canWrap ? piece.match(/[^ ]+ *| +/g) ?? [] : [piece];
				let buf = "";
				let bufX = x;
				const push = () => {
					if (!buf) return;
					// (A space at a line's start is dropped)
					if (!line.length && !canWrap === false && /^ +/.test(buf) && itemWs !== "pre-wrap") buf = buf.replace(/^ +/, "");
					if (!buf) return;
					const w = this.textWidth(buf, it.style);
					line.push({ item: it, x: bufX, w, text: buf, above, below, valign: v.valign, shift: v.shift });
					x = bufX + w;
					buf = "";
				};
				for (const seg of segs) {
					const segW = this.textWidth(seg.replace(/ +$/, ""), it.style);
					const atStart = !line.length && !buf;
					// (The run so far and the word measured together, as the content's widest measure was: kerning
					// across the space kept, so text exactly as wide as its box doesn't wrap)
					const trial = buf ? this.textWidth(buf + seg.replace(/ +$/, ""), it.style) : segW;
					if (!atStart && canWrap && bufX + trial > cw + 0.05) {
						push();
						finishLine(false);
						bufX = x;
						if (/^ +$/.test(seg)) continue;
					}
					if (!buf) bufX = x;
					// A word too long for the line on its own: broken if it may be
					if (canWrap && segW > cw && (styleValue(it.style, "overflow-wrap") === "break-word" || styleValue(it.style, "overflow-wrap") === "anywhere" || styleValue(it.style, "word-break") === "break-all")) {
						let part = "";
						for (const ch of seg) {
							if (this.textWidth(part + ch, it.style) > cw - (x - 0) && part) {
								buf = part;
								push();
								finishLine(false);
								bufX = x;
								part = "";
							}
							part += ch;
						}
						buf = part;
						continue;
					}
					buf += seg;
				}
				push();
			}
		}
		finishLine(true);
		// An ellipsis where the text overflows and is cut off
		if (styleValue(style, "text-overflow") === "ellipsis" && styleValue(style, "overflow-x") !== "visible") this._ellipsis(runs, left + cw);
		b.runs = runs;
		b.fragments = fragments;
		b.lines = lines;
		const h = y;
		return h;
	}

	_strut (style: IgeUiComputedStyle): { above: number; below: number } {
		const m = this.metrics(this.font(style));
		const lh = this.lineHeight(style);
		const lead = this._leading(lh, m);
		return { above: m.ascent + lead.above, below: m.descent + lead.below };
	}

	/**
	 * A line-height's leading split above and below the text: half each, the half above rounded down to the
	 * device's pixels (as a browser does: the rest goes below).
	 */
	_leading (lh: number, m: { ascent: number; descent: number }): { above: number; below: number } {
		const g = this.pixelGrid > 0 ? this.pixelGrid : 1;
		const leading = lh - (m.ascent + m.descent);
		const above = Math.floor((leading / 2) * g + 1e-6) / g;
		return { above, below: leading - above };
	}

	_ellipsis (runs: IgeUiTextRun[], right: number): void {
		const dots = "…";
		for (let i = 0; i < runs.length; i++) {
			const r = runs[i];
			if (r.x + r.w <= right + 0.5) continue;
			const dotsW = this.fonts.measure(dots, r.font) + r.letterSpacing;
			let text = r.text;
			while (text && r.x + this.fonts.measure(text, r.font) + r.letterSpacing * [...text].length + dotsW > right) text = text.slice(0, -1);
			r.text = text.replace(/\s+$/, "") + dots;
			r.w = this.fonts.measure(r.text, r.font) + r.letterSpacing * [...r.text].length;
			r.ellipsis = true;
			runs.length = i + 1;
			break;
		}
	}

	// ---------------------------------------------------------------- flexbox

	_layoutFlex (b: IgeUiBox, cw: number, innerH: number | undefined): number {
		const s = b.style;
		const dir = styleValue(s, "flex-direction");
		const row = dir === "row" || dir === "row-reverse";
		const reverse = dir.endsWith("-reverse");
		const wrap = styleValue(s, "flex-wrap") !== "nowrap";
		const rowGap = this._gap(s, "row-gap", innerH);
		const colGap = this._gap(s, "column-gap", cw);
		const mainGap = row ? colGap : rowGap, crossGap = row ? rowGap : colGap;
		const mainSize = row ? cw : innerH;
		const left = contentLeft(b), top = contentTop(b);
		// Items: in-flow children (text in anonymous items)
		const items: IgeUiBox[] = [];
		for (const c of b.children) {
			if (this._outOfFlow(c)) {
				this._noteStatic(c, b, left, top);
				continue;
			}
			if (c.display === "text") {
				if (!/\S/.test(c.text ?? "")) continue;
				const anon = newBox(null, b.style, "block", b);
				anon.children = [c];
				c.parent = anon;
				items.push(anon);
				continue;
			}
			items.push(c);
		}
		b.children = [...items, ...b.children.filter((c) => this._outOfFlow(c))];
		items.sort((p, q) => (parseInt(styleValue(p.style, "order"), 10) || 0) - (parseInt(styleValue(q.style, "order"), 10) || 0));
		// Each item's base size and its limits
		type F = { box: IgeUiBox; base: number; hypo: number; min: number; max: number; grow: number; shrink: number; size: number; frozen: boolean; marginMain: number; autoStart: boolean; autoEnd: boolean };
		const flex: F[] = items.map((it) => {
			this._edges(it, cw);
			const grow = parseFloat(styleValue(it.style, "flex-grow")) || 0;
			const shrink = parseFloat(styleValue(it.style, "flex-shrink"));
			const basisV = styleValue(it.style, "flex-basis");
			let base: number | undefined;
			if (basisV !== "auto" && basisV !== "content") {
				const bv = resolveLength(basisV, this._ctx(it.style, mainSize));
				if (bv !== undefined) base = this._borderBox(it) || basisV.endsWith("%") === false && false ? bv : bv + (row ? this._hEdges(it) : this._vEdges(it));
				if (bv !== undefined && this._borderBox(it)) base = bv;
			}
			if (base === undefined) {
				const spec = row ? this._specW(it, cw) : this._specH(it, innerH);
				if (spec !== undefined) base = spec;
			}
			let contentH: number | undefined;
			if (base === undefined) {
				if (row) base = this.intrinsic(it).max;
				else {
					this.layoutBox(it, cw, undefined, { shrink: false, width: this._crossWidth(it, cw, s) });
					base = contentH = it.borderH;
				}
			}
			const ov = styleValue(it.style, row ? "overflow-x" : "overflow-y");
			// The automatic minimum: its min-content (unless it scrolls or clips): in a column, its content's height
			let min = row ? this._specW(it, cw, "min-width") : this._specH(it, innerH, "min-height");
			if (min === undefined) {
				const minV = styleValue(it.style, row ? "min-width" : "min-height");
				if (minV === "auto" && ov === "visible") {
					if (row) {
						const spec = this._specW(it, cw);
						min = Math.min(this.intrinsic(it).min, spec ?? Infinity);
					} else {
						if (contentH === undefined) {
							this.layoutBox(it, cw, undefined, { shrink: false, width: this._crossWidth(it, cw, s) });
							contentH = it.borderH;
						}
						const spec = this._specH(it, innerH);
						min = Math.min(contentH, spec ?? Infinity);
					}
				} else min = row ? this._hEdges(it) : this._vEdges(it);
			}
			const max = (row ? this._specW(it, cw, "max-width") : this._specH(it, innerH, "max-height")) ?? Infinity;
			const ms = styleValue(it.style, row ? "margin-left" : "margin-top"), me = styleValue(it.style, row ? "margin-right" : "margin-bottom");
			const marginMain = row ? it.marginLeft + it.marginRight : it.marginTop + it.marginBottom;
			const hypo = Math.max(min ?? 0, Math.min(max, base));
			return { box: it, base, hypo, min: min ?? 0, max, grow, shrink: Number.isFinite(shrink) ? shrink : 1, size: hypo, frozen: false, marginMain, autoStart: ms === "auto", autoEnd: me === "auto" };
		});
		// Lines
		const lines: F[][] = [];
		if (!wrap || mainSize === undefined) lines.push(flex);
		else {
			let cur: F[] = [], used = 0;
			for (const f of flex) {
				const need = f.hypo + f.marginMain + (cur.length ? mainGap : 0);
				if (cur.length && used + need > mainSize + 0.01) {
					lines.push(cur);
					cur = [];
					used = 0;
				}
				used += f.hypo + f.marginMain + (cur.length ? mainGap : 0);
				cur.push(f);
			}
			if (cur.length) lines.push(cur);
		}
		// Resolve flexible lengths on each line
		for (const line of lines) {
			const gaps = mainGap * Math.max(0, line.length - 1);
			const avail = mainSize !== undefined ? mainSize - gaps : undefined;
			const sumHypo = line.reduce((a, f) => a + f.hypo + f.marginMain, 0);
			if (avail === undefined) {
				for (const f of line) f.size = f.hypo;
				continue;
			}
			const growing = sumHypo < avail;
			for (const f of line) {
				f.frozen = (growing ? f.grow === 0 : f.shrink === 0) || (growing && f.base > f.hypo) || (!growing && f.base < f.hypo);
				f.size = f.frozen ? f.hypo : f.base;
			}
			for (let iter = 0; iter < 12; iter++) {
				const unfrozen = line.filter((f) => !f.frozen);
				if (!unfrozen.length) break;
				const used = line.reduce((a, f) => a + (f.frozen ? f.size : f.base) + f.marginMain, 0);
				let free = avail - used;
				const sumGrow = unfrozen.reduce((a, f) => a + f.grow, 0);
				if (growing && sumGrow < 1) free *= sumGrow;
				let violation = 0;
				for (const f of unfrozen) {
					let target: number;
					if (growing) target = f.base + (sumGrow > 0 ? (free * f.grow) / sumGrow : 0);
					else {
						const scaled = unfrozen.reduce((a, g) => a + g.shrink * g.base, 0);
						target = f.base + (scaled > 0 ? (free * f.shrink * f.base) / scaled : 0);
					}
					const clamped = Math.max(f.min, Math.min(f.max, target));
					violation += clamped - target;
					f.size = clamped;
				}
				if (Math.abs(violation) < 0.01) break;
				for (const f of unfrozen) {
					const target = f.size;
					if ((violation > 0 && target <= f.min + 0.001) || (violation < 0 && target >= f.max - 0.001)) f.frozen = true;
				}
			}
		}
		// Cross sizes: lay each item out at its main size
		const alignItems = styleValue(s, "align-items");
		const crossOf = (f: F) => (row ? f.box.borderH + f.box.marginTop + f.box.marginBottom : f.box.borderW + f.box.marginLeft + f.box.marginRight);
		const lineCross: number[] = [];
		const lineBase: number[] = [];
		for (const line of lines) {
			let max = 0, maxBase = 0, maxBelow = 0;
			for (const f of line) {
				const it = f.box;
				if (row) this.layoutBox(it, cw, innerH, { width: f.size });
				else this.layoutBox(it, cw, innerH, { height: f.size, width: this._crossWidth(it, cw, s) });
				max = Math.max(max, crossOf(f));
				const self = styleValue(it.style, "align-self");
				if ((self === "auto" ? alignItems : self) === "baseline" && row) {
					const above = (it.baseline ?? it.borderH) + it.marginTop;
					maxBase = Math.max(maxBase, above);
					maxBelow = Math.max(maxBelow, crossOf(f) - above);
				}
			}
			// (Items lined up on their baselines need the most any reaches above it plus the most below)
			lineCross.push(Math.max(max, maxBase + maxBelow));
			lineBase.push(maxBase);
		}
		// A single-line container's line is its whole cross size
		const crossSize = row ? innerH : cw;
		if (lines.length === 1 && crossSize !== undefined) lineCross[0] = crossSize;
		// Stretch
		for (let li = 0; li < lines.length; li++) {
			for (const f of lines[li]) {
				const it = f.box;
				const self = styleValue(it.style, "align-self");
				const align = self === "auto" ? alignItems : self;
				const autoCross = row ? styleValue(it.style, "height") === "auto" : styleValue(it.style, "width") === "auto";
				if ((align === "stretch" || align === "normal") && autoCross) {
					if (row) {
						const h = Math.max(0, lineCross[li] - it.marginTop - it.marginBottom);
						if (Math.abs(h - it.borderH) > 0.01) {
							const ch = this._clampH(it, h, innerH);
							// (Block content that doesn't look at its height: just taller, not laid out again)
							if (this._heightFree(it)) this._resize(it, ch);
							else this.layoutBox(it, cw, innerH, { width: f.size, height: ch });
						}
					} else {
						const w = Math.max(0, lineCross[li] - it.marginLeft - it.marginRight);
						if (Math.abs(w - it.borderW) > 0.01) this.layoutBox(it, cw, innerH, { height: f.size, width: this._clampW(it, w, cw) });
					}
				}
			}
		}
		// Positions
		const justify = styleValue(s, "justify-content");
		const alignContent = styleValue(s, "align-content");
		const totalCross = lineCross.reduce((a, c) => a + c, 0) + crossGap * Math.max(0, lines.length - 1);
		let crossPos = 0, crossSpace = 0;
		if (crossSize !== undefined && lines.length > 1) {
			const free = crossSize - totalCross;
			if (alignContent === "center") crossPos = free / 2;
			else if (alignContent === "flex-end" || alignContent === "end") crossPos = free;
			else if (alignContent === "space-between" && lines.length > 1) crossSpace = free / (lines.length - 1);
			else if (alignContent === "space-around") {
				crossSpace = free / lines.length;
				crossPos = crossSpace / 2;
			} else if (alignContent === "stretch" || alignContent === "normal") {
				const add = free > 0 ? free / lines.length : 0;
				for (let i = 0; i < lineCross.length; i++) lineCross[i] += add;
			}
		}
		for (let li = 0; li < lines.length; li++) {
			const line = lines[li];
			const order = reverse ? [...line].reverse() : line;
			const used = line.reduce((a, f) => a + f.size + f.marginMain, 0) + mainGap * Math.max(0, line.length - 1);
			let free = (mainSize ?? used) - used;
			const autos = line.reduce((a, f) => a + (f.autoStart ? 1 : 0) + (f.autoEnd ? 1 : 0), 0);
			let pos = 0, space = 0;
			const autoShare = free > 0 && autos ? free / autos : 0;
			if (autos) free = 0;
			if (justify === "center") pos = free / 2;
			else if (justify === "flex-end" || justify === "end" || (justify === "right" && row)) pos = free;
			else if (justify === "space-between") space = line.length > 1 ? Math.max(0, free) / (line.length - 1) : 0;
			else if (justify === "space-around") {
				space = Math.max(0, free) / line.length;
				pos = space / 2;
			} else if (justify === "space-evenly") {
				space = Math.max(0, free) / (line.length + 1);
				pos = space;
			}
			if (reverse && justify !== "center" && !justify.startsWith("space")) pos = (mainSize ?? used) - used - pos;
			for (const f of order) {
				const it = f.box;
				if (f.autoStart) pos += autoShare;
				const mainStart = row ? it.marginLeft : it.marginTop;
				const mainEnd = row ? it.marginRight : it.marginBottom;
				const self = styleValue(it.style, "align-self");
				const align = self === "auto" ? alignItems : self;
				const cs = crossOf(f);
				let cross = 0;
				const mcStartAuto = styleValue(it.style, row ? "margin-top" : "margin-left") === "auto", mcEndAuto = styleValue(it.style, row ? "margin-bottom" : "margin-right") === "auto";
				if (mcStartAuto && mcEndAuto) cross = (lineCross[li] - cs) / 2;
				else if (mcStartAuto) cross = lineCross[li] - cs;
				else if (align === "center") cross = (lineCross[li] - cs) / 2;
				else if (align === "flex-end" || align === "end" || align === "self-end") cross = lineCross[li] - cs;
				else if (align === "baseline" && row) cross = lineBase[li] - ((it.baseline ?? it.borderH) + it.marginTop);
				if (row) {
					it.x = left + pos + mainStart;
					it.y = top + crossPos + cross + it.marginTop;
				} else {
					it.y = top + pos + mainStart;
					it.x = left + crossPos + cross + it.marginLeft;
				}
				this._applyRelative(it, cw, innerH);
				pos += mainStart + f.size + mainEnd + mainGap + space;
				if (f.autoEnd) pos += autoShare;
			}
			crossPos += lineCross[li] + crossGap + crossSpace;
		}
		// The container's baseline: its first item's
		if (row && lines.length && lines[0].length) {
			const first = lines[0][0].box;
			b.baseline = first.y + (first.baseline ?? first.borderH);
		}
		if (row) return totalCross + (crossSize === undefined ? 0 : 0);
		const mainUsed = lines.length ? lines[0].reduce((a, f) => a + f.size + f.marginMain, 0) + mainGap * Math.max(0, lines[0].length - 1) : 0;
		return innerH ?? mainUsed;
	}

	/** A column flex item's width: its own, or the container's (stretched) unless it aligns otherwise. */
	_crossWidth (it: IgeUiBox, cw: number, container: IgeUiComputedStyle): number | undefined {
		const spec = this._specW(it, cw);
		if (spec !== undefined) return this._clampW(it, spec, cw);
		const self = styleValue(it.style, "align-self");
		const align = self === "auto" ? styleValue(container, "align-items") : self;
		const avail = cw - it.marginLeft - it.marginRight;
		if (align === "stretch" || align === "normal") return this._clampW(it, avail, cw);
		const i = this.intrinsic(it);
		return this._clampW(it, Math.min(i.max, Math.max(i.min, avail)), cw);
	}

	_gap (s: IgeUiComputedStyle, prop: string, percent: number | undefined): number {
		const v = styleValue(s, prop);
		if (v === "normal") return 0;
		return resolveLength(v, this._ctx(s, percent)) ?? 0;
	}

	// ---------------------------------------------------------------- grid (a subset)

	_tracks (b: IgeUiBox, cw: number | undefined): { kind: "px" | "fr" | "auto" | "minmax"; v: number; min?: number; maxFr?: number }[] {
		const v = styleValue(b.style, "grid-template-columns");
		if (v === "none") return [{ kind: "fr", v: 1 }];
		const out: { kind: "px" | "fr" | "auto" | "minmax"; v: number; min?: number; maxFr?: number }[] = [];
		const ctx = this._ctx(b.style, cw);
		const gap = this._gap(b.style, "column-gap", cw);
		const one = (t: string): typeof out[number] | undefined => {
			t = t.trim();
			if (t === "auto" || t === "min-content" || t === "max-content") return { kind: "auto", v: 0 };
			if (t.endsWith("fr")) return { kind: "fr", v: parseFloat(t) };
			const mm = /^minmax\((.*)\)$/.exec(t);
			if (mm) {
				const [a, c] = splitTop(mm[1], ",").map((x) => x.trim());
				const min = a === "auto" || a.endsWith("content") ? 0 : resolveLength(a, ctx) ?? 0;
				if (c.endsWith("fr")) return { kind: "minmax", v: min, min, maxFr: parseFloat(c) };
				const max = resolveLength(c, ctx);
				return { kind: "minmax", v: max ?? min, min };
			}
			const px = resolveLength(t, ctx);
			return px !== undefined ? { kind: "px", v: px } : undefined;
		};
		for (const part of splitTop(v, " ").map((x) => x.trim()).filter(Boolean)) {
			const rep = /^repeat\((.*)\)$/.exec(part);
			if (rep) {
				const [count, ...rest] = splitTop(rep[1], ",");
				const tracks = splitTop(rest.join(",").trim(), " ").map((x) => x.trim()).filter(Boolean).map(one).filter((x): x is NonNullable<typeof x> => !!x);
				let n = parseInt(count, 10);
				if (!Number.isFinite(n)) {
					// auto-fill / auto-fit: as many as fit at their minimums
					const minW = tracks.reduce((a, t) => a + (t.min ?? t.v), 0) || 100;
					n = cw === undefined ? 1 : Math.max(1, Math.floor((cw + gap) / (minW + gap)));
				}
				for (let i = 0; i < n; i++) out.push(...tracks);
				continue;
			}
			const t = one(part);
			if (t) out.push(t);
		}
		return out.length ? out : [{ kind: "fr", v: 1 }];
	}

	_gridColumnCount (b: IgeUiBox, cw: number | undefined): number {
		return this._tracks(b, cw).length;
	}

	_span (it: IgeUiBox, prop: "grid-column" | "grid-row" = "grid-column"): { start?: number; span: number } {
		const v = styleValue(it.style, prop);
		const both = /^\s*(\d+)\s*\/\s*span\s+(\d+)\s*$/.exec(v);
		if (both) return { start: parseInt(both[1], 10) - 1, span: parseInt(both[2], 10) };
		if (v === "auto") return { span: 1 };
		const m = /span\s+(\d+)/.exec(v);
		if (m) return { span: parseInt(m[1], 10) };
		const [a, c] = v.split("/").map((x) => x.trim());
		const start = parseInt(a, 10);
		if (c !== undefined) {
			const end = parseInt(c, 10);
			if (end === -1 && Number.isFinite(start)) return { start: start - 1, span: -1 };
			if (Number.isFinite(start) && Number.isFinite(end)) return { start: start - 1, span: Math.max(1, end - start) };
		}
		return Number.isFinite(start) ? { start: start - 1, span: 1 } : { span: 1 };
	}

	_layoutGrid (b: IgeUiBox, cw: number, innerH: number | undefined): number {
		const s = b.style;
		const tracks = this._tracks(b, cw);
		const colGap = this._gap(s, "column-gap", cw), rowGap = this._gap(s, "row-gap", innerH);
		const left = contentLeft(b), top = contentTop(b);
		const items: IgeUiBox[] = [];
		for (const c of b.children) {
			if (this._outOfFlow(c)) {
				this._noteStatic(c, b, left, top);
				continue;
			}
			if (c.display === "text") {
				if (!/\S/.test(c.text ?? "")) continue;
				const anon = newBox(null, b.style, "block", b);
				anon.children = [c];
				c.parent = anon;
				items.push(anon);
				continue;
			}
			items.push(c);
		}
		b.children = [...items, ...b.children.filter((c) => this._outOfFlow(c))];
		// Place items: those given a row and a column first, then the rest row by row round them
		const n = tracks.length;
		const cells: { box: IgeUiBox; row: number; col: number; span: number; rowSpan: number }[] = [];
		const taken = new Set<string>();
		const fixedPlace = new Set<IgeUiBox>();
		for (const it of items) {
			const sp = this._span(it), rp = this._span(it, "grid-row");
			if (sp.start === undefined || rp.start === undefined) continue;
			const col = Math.min(sp.start, n - 1), span = sp.span === -1 ? n - col : Math.min(sp.span, n - col);
			const rowSpan = Math.max(1, rp.span);
			for (let rr = 0; rr < rowSpan; rr++) for (let k = 0; k < span; k++) taken.add(`${rp.start + rr},${col + k}`);
			cells.push({ box: it, row: rp.start, col, span, rowSpan });
			fixedPlace.add(it);
		}
		let r = 0, c = 0;
		for (const it of items) {
			if (fixedPlace.has(it)) continue;
			const sp = this._span(it);
			const rowSpan = Math.max(1, this._span(it, "grid-row").span);
			let span = sp.span === -1 ? n - (sp.start ?? 0) : Math.min(n, sp.span);
			if (sp.start !== undefined) {
				if (sp.start < c) r++;
				c = Math.min(sp.start, n - 1);
				span = sp.span === -1 ? n - c : Math.min(span, n - c);
			}
			for (;;) {
				if (c + span > n) {
					r++;
					c = 0;
					continue;
				}
				let free = true;
				for (let rr = 0; rr < rowSpan; rr++) for (let k = 0; k < span; k++) if (taken.has(`${r + rr},${c + k}`)) free = false;
				if (free) break;
				if (sp.start !== undefined) {
					// (Its column's given: the next row)
					r++;
					continue;
				}
				c++;
			}
			for (let rr = 0; rr < rowSpan; rr++) for (let k = 0; k < span; k++) taken.add(`${r + rr},${c + k}`);
			cells.push({ box: it, row: r, col: c, span, rowSpan });
			c += span;
			if (c >= n) {
				c = 0;
				r++;
			}
		}
		// Column widths: fixed, then auto at their content's max, then fr shares
		const widths = tracks.map((t) => (t.kind === "px" ? t.v : t.kind === "minmax" && t.maxFr === undefined ? t.v : 0));
		for (let k = 0; k < n; k++) {
			if (tracks[k].kind !== "auto") continue;
			let w = 0;
			for (const cell of cells) if (cell.col === k && cell.span === 1) w = Math.max(w, this._marginBox(cell.box).max);
			widths[k] = w;
		}
		const fixed = widths.reduce((a, w) => a + w, 0) + colGap * (n - 1);
		const frTracks = tracks.map((t, k) => ({ t, k })).filter(({ t }) => t.kind === "fr" || t.maxFr !== undefined);
		const frSum = frTracks.reduce((a, { t }) => a + (t.kind === "fr" ? t.v : t.maxFr!), 0);
		let free = Math.max(0, cw - fixed);
		// minmax(min, fr) tracks keep their minimum
		for (let pass = 0; pass < 3; pass++) {
			const unit = frSum > 0 ? free / frSum : 0;
			let changed = false;
			for (const { t, k } of frTracks) {
				const share = unit * (t.kind === "fr" ? t.v : t.maxFr!);
				let w = share;
				if (t.kind === "fr") {
					// An fr track's minimum is its content's min (auto)
					let minC = 0;
					for (const cell of cells) if (cell.col === k && cell.span === 1) minC = Math.max(minC, styleValue(cell.box.style, "min-width") === "0" || styleValue(cell.box.style, "min-width") === "0px" ? 0 : this._marginBox(cell.box).min);
					w = Math.max(w, minC);
				} else w = Math.max(w, t.min ?? 0);
				if (Math.abs(w - widths[k]) > 0.01) changed = true;
				widths[k] = w;
			}
			const used = widths.reduce((a, w) => a + w, 0) + colGap * (n - 1);
			if (!changed || used <= cw + 0.5) break;
			free = Math.max(0, free - (used - cw));
		}
		const colX: number[] = [];
		let xx = 0;
		for (let k = 0; k < n; k++) {
			colX.push(xx);
			xx += widths[k] + colGap;
		}
		// Rows: tallest item in each (an item over several rows: the last of them grows if it needs more room)
		const rows = cells.reduce((a, cell) => Math.max(a, cell.row + cell.rowSpan), 0);
		const rowH = new Array(rows).fill(0);
		const spanH = (cell: { row: number; rowSpan: number }) => rowH.slice(cell.row, cell.row + cell.rowSpan).reduce((a, h) => a + h, 0) + rowGap * (cell.rowSpan - 1);
		const cellW = (cell: { col: number; span: number }) => widths.slice(cell.col, cell.col + cell.span).reduce((a, w) => a + w, 0) + colGap * (cell.span - 1);
		for (const cell of cells) {
			const it = cell.box;
			const w = cellW(cell);
			const justify = styleValue(it.style, "justify-self") !== "auto" ? styleValue(it.style, "justify-self") : styleValue(s, "justify-items");
			if (justify === "start" || justify === "center" || justify === "end") this.layoutBox(it, w, innerH, { shrink: true });
			else {
				this._edges(it, w);
				const spec = this._specW(it, w);
				this.layoutBox(it, w, innerH, { width: spec ?? Math.max(0, w - it.marginLeft - it.marginRight) });
			}
			if (cell.rowSpan === 1) rowH[cell.row] = Math.max(rowH[cell.row], it.borderH + it.marginTop + it.marginBottom);
		}
		for (const cell of cells) {
			if (cell.rowSpan === 1) continue;
			const need = cell.box.borderH + cell.box.marginTop + cell.box.marginBottom - spanH(cell);
			if (need > 0) rowH[cell.row + cell.rowSpan - 1] += need;
		}
		const rowY: number[] = [];
		let yy = 0;
		for (let k = 0; k < rows; k++) {
			rowY.push(yy);
			yy += rowH[k] + (k < rows - 1 ? rowGap : 0);
		}
		const alignItems = styleValue(s, "align-items");
		for (const cell of cells) {
			const it = cell.box;
			const w = cellW(cell);
			const self = styleValue(it.style, "align-self");
			const align = self === "auto" ? alignItems : self;
			const h = spanH(cell);
			if ((align === "stretch" || align === "normal") && styleValue(it.style, "height") === "auto" && Math.abs(it.borderH + it.marginTop + it.marginBottom - h) > 0.01) {
				this.layoutBox(it, w, innerH, { width: it.borderW, height: Math.max(0, h - it.marginTop - it.marginBottom) });
			}
			let dy = 0;
			if (align === "center") dy = (h - it.borderH - it.marginTop - it.marginBottom) / 2;
			else if (align === "end" || align === "flex-end") dy = h - it.borderH - it.marginTop - it.marginBottom;
			const justify = styleValue(it.style, "justify-self") !== "auto" ? styleValue(it.style, "justify-self") : styleValue(s, "justify-items");
			let dx = 0;
			if (justify === "center") dx = (w - it.borderW - it.marginLeft - it.marginRight) / 2;
			else if (justify === "end") dx = w - it.borderW - it.marginLeft - it.marginRight;
			it.x = left + colX[cell.col] + it.marginLeft + dx;
			it.y = top + rowY[cell.row] + it.marginTop + dy;
			this._applyRelative(it, cw, innerH);
		}
		return yy;
	}

	// ---------------------------------------------------------------- tables

	_tableRows (b: IgeUiBox): IgeUiBox[] {
		const rows: IgeUiBox[] = [];
		const groups: IgeUiBox[] = [];
		const head: IgeUiBox[] = [], foot: IgeUiBox[] = [], body: IgeUiBox[] = [];
		for (const c of b.children) {
			if (c.display === "table-header-group") head.push(c);
			else if (c.display === "table-footer-group") foot.push(c);
			else if (c.display === "table-row-group" || c.display === "table-row") body.push(c);
		}
		for (const g of [...head, ...body, ...foot]) {
			if (g.display === "table-row") rows.push(g);
			else {
				groups.push(g);
				for (const r of g.children) if (r.display === "table-row") rows.push(r);
			}
		}
		return rows;
	}

	_cells (row: IgeUiBox): IgeUiBox[] {
		return row.children.filter((c) => c.display === "table-cell");
	}

	_tableSpacing (b: IgeUiBox): number {
		if (styleValue(b.style, "border-collapse") === "collapse") return 0;
		return this.len(b.style, "border-spacing") ?? 0;
	}

	_tableColumns (b: IgeUiBox): { min: number[]; max: number[]; fixed: (number | undefined)[]; percent: (number | undefined)[] } {
		const rows = this._tableRows(b);
		const min: number[] = [], max: number[] = [], fixed: (number | undefined)[] = [], percent: (number | undefined)[] = [];
		const spanned: { col: number; span: number; s: { min: number; max: number } }[] = [];
		if (styleValue(b.style, "border-collapse") === "collapse") this._collapseBorders(rows);
		else for (const row of rows) for (const cell of this._cells(row)) cell.collapsed = undefined;
		for (const row of rows) {
			let col = 0;
			for (const cell of this._cells(row)) {
				const span = Math.max(1, parseInt(cell.el?.getAttribute("colspan") ?? "1", 10) || 1);
				const s = this.intrinsic(cell);
				if (span === 1) {
					min[col] = Math.max(min[col] ?? 0, s.min);
					max[col] = Math.max(max[col] ?? 0, s.max);
					const w = this._specW(cell, undefined);
					if (w !== undefined) fixed[col] = Math.max(fixed[col] ?? 0, w);
					const pw = styleValue(cell.style, "width").trim();
					if (/^[\d.]+%$/.test(pw)) percent[col] = Math.max(percent[col] ?? 0, parseFloat(pw));
				} else spanned.push({ col, span, s });
				col += span;
			}
		}
		for (const sp of spanned) {
			for (let k = sp.col; k < sp.col + sp.span; k++) {
				min[k] ??= 0;
				max[k] ??= 0;
			}
		}
		const n = Math.max(min.length, ...spanned.map((x) => x.col + x.span));
		for (let k = 0; k < n; k++) {
			min[k] ??= 0;
			max[k] ??= 0;
			if (fixed[k] !== undefined) {
				min[k] = Math.max(min[k], fixed[k]!);
				max[k] = Math.max(min[k], fixed[k]!);
			}
		}
		// Spanning cells widen their columns if they need more
		for (const sp of spanned) {
			const cur = max.slice(sp.col, sp.col + sp.span).reduce((a, x) => a + x, 0);
			if (sp.s.max > cur) {
				const add = (sp.s.max - cur) / sp.span;
				for (let k = sp.col; k < sp.col + sp.span; k++) max[k] += add;
			}
		}
		return { min, max, fixed, percent };
	}

	_layoutTable (b: IgeUiBox, cw: number, innerH: number | undefined): number {
		const rows = this._tableRows(b);
		const spacing = this._tableSpacing(b);
		const cols = this._tableColumns(b);
		const n = cols.min.length;
		const left = contentLeft(b), top = contentTop(b);
		// Widths: the content's max where it fits, shared out from there
		const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
		const avail = Math.max(0, cw - spacing * (n + 1));
		const specified = styleValue(b.style, "width") !== "auto";
		// Columns with a percentage (a table of a set width): that share of it, at least their content's minimum;
		// the rest shared between the others
		const widths: number[] = new Array(n).fill(0);
		const pctCols = specified ? cols.percent.map((p, k) => (p !== undefined ? k : -1)).filter((k) => k >= 0) : [];
		let rest = avail;
		for (const k of pctCols) {
			widths[k] = Math.max(cols.min[k], (cols.percent[k]! / 100) * avail);
			rest -= widths[k];
		}
		const others = [...Array(n).keys()].filter((k) => !pctCols.includes(k));
		const pick = (a: number[]) => others.map((k) => a[k]);
		const oMin = pick(cols.min), oMax = pick(cols.max), oFixed = others.map((k) => cols.fixed[k]);
		const sMax = sum(oMax), sMin = sum(oMin);
		let ow: number[];
		rest = Math.max(0, rest);
		if (sMax <= rest) {
			ow = [...oMax];
			if (specified && sMax < rest) {
				// The extra goes to the columns without a fixed width, in proportion to their content
				const flexible = oMax.map((m, i) => (oFixed[i] === undefined ? m : 0));
				const fs = sum(flexible);
				const extra = rest - sMax;
				ow = ow.map((w, i) => w + (fs > 0 ? (extra * flexible[i]) / fs : extra / Math.max(1, others.length)));
			}
		} else if (sMin >= rest) ow = [...oMin];
		else {
			const room = rest - sMin;
			const range = sMax - sMin;
			ow = oMin.map((m, i) => m + (range > 0 ? (room * (oMax[i] - m)) / range : 0));
		}
		others.forEach((k, i) => (widths[k] = ow[i]));
		const colX: number[] = [];
		let xx = spacing;
		for (let k = 0; k < n; k++) {
			colX.push(xx);
			xx += widths[k] + spacing;
		}
		const tableW = xx;
		// Rows
		let y = spacing;
		const groupOf = new Map<IgeUiBox, IgeUiBox>();
		for (const g of b.children) for (const r of g.children) if (r.display === "table-row") groupOf.set(r, g);
		const groupStart = new Map<IgeUiBox, number>();
		for (const row of rows) {
			this._edges(row, cw);
			const group = groupOf.get(row);
			if (group && !groupStart.has(group)) groupStart.set(group, y);
			let col = 0;
			let rowH = this._specH(row, innerH) ?? 0;
			const placed: { cell: IgeUiBox; col: number; span: number }[] = [];
			for (const cell of this._cells(row)) {
				const span = Math.max(1, parseInt(cell.el?.getAttribute("colspan") ?? "1", 10) || 1);
				const w = widths.slice(col, col + span).reduce((a, x) => a + x, 0) + spacing * (span - 1);
				this.layoutBox(cell, w, innerH, { width: w });
				rowH = Math.max(rowH, cell.borderH);
				placed.push({ cell, col, span });
				col += span;
			}
			for (const p of placed) {
				const cell = p.cell;
				// Cells fill the row; their content aligned within
				const va = styleValue(cell.style, "vertical-align");
				const contentH = cell.borderH;
				if (Math.abs(rowH - cell.borderH) > 0.01) {
					const w = cell.borderW;
					// (Content that doesn't look at the cell's height: the cell just made as tall as the row)
					if (this._heightFree(cell, true)) this._resize(cell, rowH);
					else this.layoutBox(cell, w, innerH, { width: w, height: rowH });
					const dy = va === "middle" ? (rowH - contentH) / 2 : va === "bottom" ? rowH - contentH : 0;
					if (dy) this._shiftContent(cell, dy);
				}
				cell.x = colX[p.col] - (group ? 0 : 0);
				cell.y = 0;
			}
			row.x = 0;
			row.y = y - (group ? groupStart.get(group)! : 0);
			row.borderW = tableW;
			row.borderH = rowH;
			for (const p of placed) p.cell.x = colX[p.col];
			y += rowH + spacing;
		}
		for (const g of b.children) {
			if (g.display === "table-row") {
				g.x += left;
				g.y += top;
				continue;
			}
			if (!g.display.startsWith("table-")) continue;
			const start = groupStart.get(g) ?? y;
			const rs = g.children.filter((r) => r.display === "table-row");
			const end = rs.length ? rs[rs.length - 1].y + rs[rs.length - 1].borderH + start : start;
			g.x = left;
			g.y = top + start;
			g.borderW = tableW;
			g.borderH = end - start;
		}
		// (A table is at least as wide as its columns)
		if (tableW > cw + 0.5 && styleValue(b.style, "width") === "auto") b.borderW = tableW + this._hEdges(b);
		return y;
	}

	// ---------------------------------------------------------------- positioned boxes

	_containingBlock (box: IgeUiBox): IgeUiBox | null {
		if (box.position === "fixed") return null;
		for (let p = box.parent; p; p = p.parent) {
			if (p.position !== "static" || p.transform) return p;
		}
		return null;
	}

	/** Absolute position of a box (summing parents); the root's 0,0. */
	_abs (b: IgeUiBox): { x: number; y: number } {
		let x = 0, y = 0;
		for (let p: IgeUiBox | null = b; p; p = p.parent) {
			x += p.x;
			y += p.y;
		}
		return { x, y };
	}

	_placePositioned (root: IgeUiBox): void {
		// In tree order, so a containing block that's positioned itself is placed first
		for (let i = 0; i < this._positioned.length; i++) {
			const { box } = this._positioned[i];
			const cb = this._containingBlock(box);
			const cbAbs = cb ? this._abs(cb) : { x: 0, y: 0 };
			const cbX = cb ? cbAbs.x + cb.borderLeft : 0, cbY = cb ? cbAbs.y + cb.borderTop : 0;
			const cbW = cb ? cb.borderW - cb.borderLeft - cb.borderRight : this.viewport.w;
			const cbH = cb ? cb.borderH - cb.borderTop - cb.borderBottom : this.viewport.h;
			this._edges(box, cbW);
			const s = box.style;
			const left = this.len(s, "left", cbW), right = this.len(s, "right", cbW);
			const top = this.len(s, "top", cbH), bottom = this.len(s, "bottom", cbH);
			let width: number | undefined = this._specW(box, cbW);
			if (width === undefined && left !== undefined && right !== undefined) width = cbW - left - right - box.marginLeft - box.marginRight;
			let height: number | undefined = this._specH(box, cbH);
			if (height === undefined && top !== undefined && bottom !== undefined) height = cbH - top - bottom - box.marginTop - box.marginBottom;
			if (width !== undefined) width = this._clampW(box, width, cbW);
			if (height !== undefined) height = this._clampH(box, height, cbH);
			// Shrink-to-fit in the room it has
			const room = cbW - (left ?? 0) - (right ?? 0);
			this.layoutBox(box, cbW, cbH, { width, height, shrink: width === undefined ? true : undefined });
			if (width === undefined) {
				const i = this.intrinsic(box);
				const w = this._clampW(box, Math.min(i.max, Math.max(i.min, room - box.marginLeft - box.marginRight)), cbW);
				if (Math.abs(w - box.borderW) > 0.01) this.layoutBox(box, cbW, cbH, { width: w, height });
			}
			// Where: from its offsets, else its static position
			const parentAbs = box.parent ? this._abs(box.parent) : { x: 0, y: 0 };
			let ax: number, ay: number;
			const ml = styleValue(s, "margin-left") === "auto", mr = styleValue(s, "margin-right") === "auto";
			if (left !== undefined && right !== undefined && ml && mr) ax = cbX + left + (cbW - left - right - box.borderW) / 2;
			else if (left !== undefined) ax = cbX + left + box.marginLeft;
			else if (right !== undefined) ax = cbX + cbW - right - box.marginRight - box.borderW;
			else ax = parentAbs.x + (box.staticX ?? 0) + box.marginLeft;
			const mt = styleValue(s, "margin-top") === "auto", mb = styleValue(s, "margin-bottom") === "auto";
			if (top !== undefined && bottom !== undefined && mt && mb) ay = cbY + top + (cbH - top - bottom - box.borderH) / 2;
			else if (top !== undefined) ay = cbY + top + box.marginTop;
			else if (bottom !== undefined) ay = cbY + cbH - bottom - box.marginBottom - box.borderH;
			else ay = parentAbs.y + (box.staticY ?? 0) + box.marginTop;
			box.x = ax - parentAbs.x;
			box.y = ay - parentAbs.y;
			void root;
		}
	}

	_absolute (b: IgeUiBox, px: number, py: number): void {
		b.ax = px + b.x;
		b.ay = py + b.y;
		b.sticky = b.position === "sticky" ? this._stickyOf(b) : undefined;
		if (b.fragments) {
			for (const f of b.fragments) f.box.inlineRects = undefined;
			for (const f of b.fragments) (f.box.inlineRects ??= []).push({ x: b.ax + f.x, y: b.ay + f.y, w: f.w, h: f.h });
		}
		for (const c of b.children) this._absolute(c, b.ax, b.ay);
		this._ink(b);
	}

	/** A box's ink: its own box, its text and its children's ink (see IgeUiBox.ink). */
	_ink (b: IgeUiBox): void {
		if (b.transform || b.sticky || b.position === "fixed") {
			b.ink = undefined;
			return;
		}
		// (Room for glows and outlines round it)
		const m = 48;
		let x0 = b.ax - m, y0 = b.ay - m, x1 = b.ax + b.borderW + m, y1 = b.ay + b.borderH + m;
		for (const r of b.runs ?? []) {
			x0 = Math.min(x0, b.ax + r.x - m);
			x1 = Math.max(x1, b.ax + r.x + r.w + m);
		}
		for (const l of b.lines ?? []) y1 = Math.max(y1, b.ay + l.y + l.h + m);
		for (const r of b.inlineRects ?? []) {
			x0 = Math.min(x0, r.x - m);
			y0 = Math.min(y0, r.y - m);
			x1 = Math.max(x1, r.x + r.w + m);
			y1 = Math.max(y1, r.y + r.h + m);
		}
		for (const c of b.children) {
			if (c.display === "text") continue;
			if (!c.ink) {
				b.ink = undefined;
				return;
			}
			x0 = Math.min(x0, c.ink[0]);
			y0 = Math.min(y0, c.ink[1]);
			x1 = Math.max(x1, c.ink[2]);
			y1 = Math.max(y1, c.ink[3]);
		}
		b.ink = [x0, y0, x1, y1];
	}

	/** A sticky box's scroller, insets and the rectangle it stays in (its containing block: a table cell's is its table). */
	_stickyOf (b: IgeUiBox): IgeUiBox["sticky"] {
		let scroller: IgeUiBox | null = b.parent;
		while (scroller && !(scroller.el && !scroller.pseudo && (styleValue(scroller.style, "overflow-x") !== "visible" || styleValue(scroller.style, "overflow-y") !== "visible"))) scroller = scroller.parent;
		if (!scroller) return undefined;
		let cb: IgeUiBox | null = b.parent;
		if (b.display.startsWith("table-")) while (cb && cb.display !== "table" && cb.display !== "inline-table") cb = cb.parent;
		cb ??= b.parent;
		if (!cb) return undefined;
		const w = scroller.borderW, h = scroller.borderH;
		const inset = (side: string, size: number) => (styleValue(b.style, side) === "auto" ? undefined : this.len(b.style, side, size));
		const x0 = cb.ax + cb.borderLeft + cb.paddingLeft, y0 = cb.ay + cb.borderTop + cb.paddingTop;
		return {
			scroller, top: inset("top", h), right: inset("right", w), bottom: inset("bottom", h), left: inset("left", w),
			within: [x0, y0, x0 + contentWidth(cb), y0 + cb.borderH - cb.borderTop - cb.borderBottom - cb.paddingTop - cb.paddingBottom]
		};
	}
}

function collapse (a: number, b: number): number {
	if (a >= 0 && b >= 0) return Math.max(a, b);
	if (a < 0 && b < 0) return Math.min(a, b);
	return a + b;
}

/** A content property's text: strings (with escapes) and attr(). */
export function contentText (content: string, el: IgeUiElement): string {
	let out = "";
	const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|attr\(\s*([\w-]+)\s*\)/g;
	for (let m = re.exec(content); m; m = re.exec(content)) {
		if (m[3]) out += el.getAttribute(m[3]) ?? "";
		else out += (m[1] ?? m[2]).replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, "$1");
	}
	return out;
}
