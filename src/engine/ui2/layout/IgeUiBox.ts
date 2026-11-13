/**
 * The layout's boxes for the engine's UI: one per element shown (and ones it
 * makes itself: runs of text, anonymous blocks, ::before and ::after). Each
 * box's position is relative to its parent box's border-box corner (so a box
 * moved after its content's laid out moves everything in it); `ax`, `ay` are
 * its place in the whole UI once the frame's layout is done (before any
 * scrolling).
 */
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeUiComputedStyle } from "@/engine/ui2/style/IgeUiStyleEngine";
import type { IgeUiFontSpec } from "@/engine/ui2/text/IgeUiFonts";

/** A run of text on a line: its words as drawn (after text-transform), where (relative to the box holding the lines), in its font. */
export interface IgeUiTextRun {
	text: string;
	x: number;
	/** The baseline. */
	y: number;
	w: number;
	font: IgeUiFontSpec;
	letterSpacing: number;
	/** The style of the element it's in (colour, shadow). */
	style: IgeUiComputedStyle;
	/** The element it's in (its colour, visibility and glow are read from its style as it is when it's painted: animated). */
	el?: IgeUiElement;
	/** Cut off with an ellipsis (text-overflow). */
	ellipsis?: boolean;
	/** In a positioned inline element (`position` set: its own layer, z-index and all): drawn with it, not the block. */
	layer?: IgeUiBox;
}

/** An inline element's box on one line (for its background and border): relative to the box holding the lines. */
export interface IgeUiInlineFragment {
	box: IgeUiBox;
	x: number;
	y: number;
	w: number;
	h: number;
	/** First and last on the element (its left and right borders and padding are drawn there). */
	first: boolean;
	last: boolean;
	/** The positioned inline element it's drawn with (itself, or one it's in), if any. */
	layer?: IgeUiBox;
}

export interface IgeUiLine {
	y: number;
	h: number;
	baseline: number;
	/** The line's width used. */
	w: number;
}

export interface IgeUiBox {
	el: IgeUiElement | null;
	pseudo?: "before" | "after";
	style: IgeUiComputedStyle;
	/** The display value it's laid out as. */
	display: string;
	parent: IgeUiBox | null;
	children: IgeUiBox[];
	/** Border box, relative to the parent box's border box. */
	x: number;
	y: number;
	borderW: number;
	borderH: number;
	/** In the whole UI (set after layout). */
	ax: number;
	ay: number;
	marginTop: number;
	marginRight: number;
	marginBottom: number;
	marginLeft: number;
	borderTop: number;
	borderRight: number;
	borderBottom: number;
	borderLeft: number;
	paddingTop: number;
	paddingRight: number;
	paddingBottom: number;
	paddingLeft: number;
	/** How far its content reaches (scroll containers), and the scrollbars' room. */
	scrollW?: number;
	scrollH?: number;
	scrollbarX?: number;
	scrollbarY?: number;
	/** Text and inline decorations of its inline content (an inline formatting context). */
	runs?: IgeUiTextRun[];
	fragments?: IgeUiInlineFragment[];
	/**
	 * position: sticky: the box that scrolls it, its insets (px, those set) and the rectangle it must stay in
	 * (its containing block's content box, absolute): see stickyShift().
	 */
	sticky?: { scroller: IgeUiBox; top?: number; right?: number; bottom?: number; left?: number; within: [number, number, number, number] };
	/**
	 * A cell of a table with border-collapse: collapse: each of its edges' line (top, right, bottom, left), the wider
	 * of its own border and its neighbour's; half of it is the cell's, half the neighbour's.
	 */
	collapsed?: [number, number, number, number];
	/**
	 * Its last layout, kept for the next: the inputs it was laid out for (containing block, sizes asked for), whether
	 * that layout stands (nothing in it has changed since), its height as laid out (before a parent stretched it) and
	 * how far a parent moved its contents since (a cell's vertical-align). A box laid out again for the same inputs
	 * is left as it is.
	 */
	cacheKey?: string;
	layoutOk?: boolean;
	layoutH?: number;
	extShift?: number;
	/** Absolutely positioned boxes in it whose containing block is outside it (it can't be kept: they'd not be placed). */
	escapingKids?: boolean;
	/** A table row's layout kept: the columns it was laid out for, its height then. */
	rowKey?: string;
	rowH?: number;
	/** A cell's own border widths (on these device pixels), kept while it stands. */
	ownBorders?: [number, number, number, number];
	ownBordersGrid?: number;
	/** Kept, not laid out again, in the layout with this stamp (its contents' places stand too). */
	keptStamp?: number;
	/** It or something in it is sticky (held in a scroller's view: worked out again every time). */
	hasSticky?: boolean;
	/** Its height as laid out for each set of inputs it was laid out for (measuring without laying out again). */
	measures?: Map<string, number>;
	/** Its min- and max-content widths, kept while it stands. */
	intr?: { min: number; max: number };
	/**
	 * Where it and everything in it is drawn (absolute, unscrolled: x0, y0, x1, y1; with a margin for glows), for
	 * skipping what's scrolled or clipped out of sight. Undefined: can't be told (a transform, sticky, fixed).
	 */
	ink?: [number, number, number, number];
	/** A positioned inline element: the box whose lines hold its text (its runs and fragments are drawn with it). */
	layerBlock?: IgeUiBox;
	/** An inline element's pieces on its lines (absolute, set with ax and ay): its client rects, where it's hit. */
	inlineRects?: { x: number; y: number; w: number; h: number }[];
	lines?: IgeUiLine[];
	/** Positioned (relative, absolute, fixed, sticky) and its z-index (undefined: auto). */
	position: string;
	zIndex?: number;
	/** Where an absolutely positioned box would be in flow, relative to its parent box. */
	staticX?: number;
	staticY?: number;
	/** Its first baseline, relative to its own border box (for baseline alignment). */
	baseline?: number;
	/** A replaced element's own size (img, canvas, input). */
	intrinsicW?: number;
	intrinsicH?: number;
	/** Laid out for an inline atom (inline-block and its kin) on a line. */
	atomic?: boolean;
	/** Text for an anonymous text box (inline content's text, flex items made of text). */
	text?: string;
	/** Its 2D transform about its origin (relative to its own border box), if any. */
	transform?: [number, number, number, number, number, number];
}

export function newBox (el: IgeUiElement | null, style: IgeUiComputedStyle, display: string, parent: IgeUiBox | null): IgeUiBox {
	return {
		el, style, display, parent, children: [], x: 0, y: 0, borderW: 0, borderH: 0, ax: 0, ay: 0,
		marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
		paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, position: "static"
	};
}

/** The content box's left and top, relative to the border box. */
export function contentLeft (b: IgeUiBox): number {
	return b.borderLeft + b.paddingLeft;
}

export function contentTop (b: IgeUiBox): number {
	return b.borderTop + b.paddingTop;
}

export function contentWidth (b: IgeUiBox): number {
	return Math.max(0, b.borderW - b.borderLeft - b.borderRight - b.paddingLeft - b.paddingRight - (b.scrollbarY ?? 0));
}

export function contentHeight (b: IgeUiBox): number {
	return Math.max(0, b.borderH - b.borderTop - b.borderBottom - b.paddingTop - b.paddingBottom - (b.scrollbarX ?? 0));
}

/**
 * How far a sticky box is moved from where it was laid out, for its scroller's scroll offset (`scrollOf`):
 * held `top` px (and the rest) inside the scroller's view, but never out of its containing block.
 */
export function stickyShift (b: IgeUiBox, scrollOf: (el: IgeUiBox["el"]) => [number, number]): [number, number] {
	const st = b.sticky;
	if (!st) return [0, 0];
	const sc = st.scroller;
	const [sl, stp] = scrollOf(sc.el);
	// (The scroller's view less its padding, as a browser's sticky view rectangle is)
	const vx0 = sc.ax + sc.borderLeft + sc.paddingLeft + sl, vy0 = sc.ay + sc.borderTop + sc.paddingTop + stp;
	const vx1 = vx0 + contentWidth(sc), vy1 = vy0 + contentHeight(sc);
	const [cx0, cy0, cx1, cy1] = st.within;
	let dx = 0, dy = 0;
	if (st.top !== undefined && b.ay < vy0 + st.top) dy = Math.max(0, Math.min(vy0 + st.top - b.ay, cy1 - (b.ay + b.borderH)));
	else if (st.bottom !== undefined && b.ay + b.borderH > vy1 - st.bottom) dy = Math.min(0, Math.max(vy1 - st.bottom - (b.ay + b.borderH), cy0 - b.ay));
	if (st.left !== undefined && b.ax < vx0 + st.left) dx = Math.max(0, Math.min(vx0 + st.left - b.ax, cx1 - (b.ax + b.borderW)));
	else if (st.right !== undefined && b.ax + b.borderW > vx1 - st.right) dx = Math.min(0, Math.max(vx1 - st.right - (b.ax + b.borderW), cx0 - b.ax));
	return [dx, dy];
}
