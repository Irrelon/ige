/**
 * The engine's document UI (ui2): one document drawn over the game, with its
 * stylesheets, the UI's scale and safe area, and the frame's work done only
 * as far as something changed (styles, then layout, then the display list).
 * Measurements read from code (offsetWidth, getBoundingClientRect) lay out
 * on demand first, as the DOM does.
 *
 * Input: pointer events are hit-tested against what's drawn (pointer-events,
 * clipping, stacking) and dispatched with capture and bubbling; what the UI
 * takes the game doesn't see. Hover, active and focus states drive :hover,
 * :active, :focus and :focus-visible. The wheel scrolls the box under the
 * pointer; a touch drag scrolls with momentum; text fields type through a
 * hidden page <input> (IME, on-screen keyboards). `title` shows a tooltip.
 *
 * Draws through IgeWebGlRenderer.addOverlay() (after the UI layer pass), or
 * on its own with draw().
 */
import { placeTextField, takeSelection, textFieldPaint, wireTextField } from "@/engine/ui2/dom/IgeUiTextField";
import { IgeUiDocument, type IgeUiDocumentHost, IgeUiElement, IgeUiEvent, type IgeUiChange, type IgeUiNode, type IgeUiTreeChange, type IgeUiView } from "@/engine/ui2/dom/IgeUiDom";
import { type IgeUiBox, stickyShift } from "@/engine/ui2/layout/IgeUiBox";
import { IgeUiLayoutEngine } from "@/engine/ui2/layout/IgeUiLayout";
import { IgeUiGlRenderer } from "@/engine/ui2/render/IgeUiGlRenderer";
import { type IgeUiPaintItem, IgeUiPainter } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiAnimator, LAYOUT_PROPS } from "@/engine/ui2/style/IgeUiAnimator";
import { cssNumber, serializeComputed } from "@/engine/ui2/style/IgeUiComputed";
import { type IgeUiComputedStyle, IgeUiStyleEngine, styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";
import { IgeUiCanvasFonts, IgeUiFixedFonts, type IgeUiFontProvider } from "@/engine/ui2/text/IgeUiFonts";
import { IgeUiSdfAtlas } from "@/engine/ui2/text/IgeUiSdfAtlas";

export interface IgeUiMutationRecord {
	type: "childList" | "attributes" | "characterData";
	target: IgeUiNode;
	attributeName?: string | null;
	addedNodes: IgeUiNode[];
	removedNodes: IgeUiNode[];
}

/** The DOM's MutationObserver, for an engine document: records delivered in a microtask after the changes. */
export class IgeUiMutationObserver {
	_root?: IgeUiRoot;
	_target?: IgeUiNode;
	_opts: { childList?: boolean; subtree?: boolean; attributes?: boolean; attributeFilter?: string[]; characterData?: boolean } = {};
	_queue: IgeUiMutationRecord[] = [];

	constructor (readonly callback: (records: IgeUiMutationRecord[], observer: IgeUiMutationObserver) => void) {}

	observe (target: IgeUiNode, opts: IgeUiMutationObserver["_opts"]): void {
		this._target = target;
		this._opts = opts;
		const root = (target.ownerDocument as IgeUiDocument & { _uiRoot?: IgeUiRoot })._uiRoot;
		this._root = root;
		root?._observers.add(this);
	}

	disconnect (): void {
		this._root?._observers.delete(this);
		this._queue = [];
	}

	takeRecords (): IgeUiMutationRecord[] {
		const q = this._queue;
		this._queue = [];
		return q;
	}
}

export interface IgeUiResizeObserverEntry {
	target: IgeUiElement;
	contentRect: { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number };
	borderBoxSize: { inlineSize: number; blockSize: number }[];
	contentBoxSize: { inlineSize: number; blockSize: number }[];
}

/** The DOM's ResizeObserver, for an engine document: entries after a layout that changed an observed element's size. */
export class IgeUiResizeObserver {
	_root?: IgeUiRoot;
	/** Each observed element's size when last told (-1: not yet told). */
	_targets = new Map<IgeUiElement, { w: number; h: number }>();

	constructor (readonly callback: (entries: IgeUiResizeObserverEntry[], observer: IgeUiResizeObserver) => void) {}

	observe (target: IgeUiElement): void {
		const root = (target.ownerDocument as IgeUiDocument & { _uiRoot?: IgeUiRoot })._uiRoot;
		if (!root) return;
		this._root = root;
		root._resizeObservers.add(this);
		this._targets.set(target, { w: -1, h: -1 });
		root._resizeCheck = true;
	}

	unobserve (target: IgeUiElement): void {
		this._targets.delete(target);
	}

	disconnect (): void {
		this._root?._resizeObservers.delete(this);
		this._targets.clear();
	}
}

interface HitEntry {
	el: IgeUiElement;
	x: number;
	y: number;
	w: number;
	h: number;
	clip: [number, number, number, number] | null;
	/** Under a transform: from the UI's pixels to the box's own (its rectangle and clip are in those). */
	inv?: [number, number, number, number, number, number];
}

export interface IgeUiRootOptions {
	/** Measure text with the page's fonts (default in the browser) or a fixed-width stand-in (headless). */
	fonts?: IgeUiFontProvider;
	/** The screen's size in CSS px (default: the window's). */
	width?: number;
	height?: number;
}

export class IgeUiRoot implements IgeUiDocumentHost {
	readonly document: IgeUiDocument;
	readonly styles = new IgeUiStyleEngine();
	readonly layoutEngine: IgeUiLayoutEngine;
	readonly painter = new IgeUiPainter();
	readonly animator = new IgeUiAnimator();
	atlas?: IgeUiSdfAtlas;
	gl?: IgeUiGlRenderer;
	/** The screen (CSS px), the UI's scale and its safe area (CSS px each side). */
	screen = { w: 1280, h: 720 };
	scale = 1;
	safe = { x: 0, y: 0 };
	/** Device pixels per CSS pixel (as drawn last; border widths in computed styles snap to them). */
	dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
	/** Where the UI's canvas sits on the page (CSS px), for client coordinates. */
	pageOffset = { x: 0, y: 0 };
	rootBox?: IgeUiBox;
	items: IgeUiPaintItem[] = [];
	hitList: HitEntry[] = [];
	/** What's out of date. */
	_styleRoots = new Set<IgeUiElement>();
	_styleAll = true;
	_layoutDirty = true;
	/** Everything must be laid out again (the first time, a resize, new stylesheets, fonts); else only round `_relayout`. */
	_layoutAll = true;
	/** Elements changed or restyled since the last layout: what's laid out again is the positioned boxes round them. */
	_relayout = new Set<IgeUiElement>();
	_paintDirty = true;
	_observers = new Set<IgeUiMutationObserver>();
	_mutationQueued = false;
	_resizeObservers = new Set<IgeUiResizeObserver>();
	/** Observed sizes to compare after the next layout. */
	_resizeCheck = false;
	_hover: IgeUiElement[] = [];
	/** The pointer's last move over the UI (hover is worked out again there after layout), and whether the hovered chain lost an element. */
	_pointerAt?: PointerEvent;
	_hoverStale = false;
	_active: IgeUiElement | null = null;
	_down?: { el: IgeUiElement; x: number; y: number; time: number; pointerType: string; scroller?: IgeUiElement; dragging?: boolean; vy?: number; lastY?: number; lastT?: number };
	_momentum?: { el: IgeUiElement; vx: number; vy: number };
	_tooltip?: { el: IgeUiElement; at: number; x: number; y: number; shown?: IgeUiElement };
	_now = 0;
	_textInput?: HTMLInputElement;
	/** Time spent in each stage last frame (ms), and counts, for the stats overlay and tests. */
	stats = { style: 0, layout: 0, paint: 0, draw: 0, elements: 0, items: 0, drawCalls: 0, partial: 0 };
	/** Events the game shouldn't see (the UI took them): set as each is handled. */
	consumed = false;
	_detach?: () => void;

	constructor (opts: IgeUiRootOptions = {}) {
		this.document = new IgeUiDocument();
		(this.document as IgeUiDocument & { _uiRoot?: IgeUiRoot })._uiRoot = this;
		this.document.host = this;
		this.document.defaultView = this._view();
		const fonts = opts.fonts ?? (typeof document !== "undefined" ? new IgeUiCanvasFonts() : new IgeUiFixedFonts());
		this.layoutEngine = new IgeUiLayoutEngine(fonts);
		// The focused field's caret or selection, over its text (dom/IgeUiTextField)
		this.painter.fieldPaint = textFieldPaint(this.layoutEngine, () => this.document.activeElement);
		if (opts.width !== undefined && opts.height !== undefined) this.screen = { w: opts.width, h: opts.height };
		else if (typeof window !== "undefined") this.screen = { w: window.innerWidth, h: window.innerHeight };
		this.animator.keyframes = this.styles.keyframes;
		this._updateViewport();
		// The engine's own bits: the tooltip and the default look of focus
		this.styles.addStylesheet(ENGINE_STYLES);
		// Fonts loading late: measured and drawn again
		if (typeof document !== "undefined" && document.fonts) {
			document.fonts.addEventListener?.("loadingdone", () => this.fontsChanged());
			void document.fonts.ready?.then(() => this.fontsChanged());
		}
	}

	get root (): IgeUiElement {
		return this.document.body;
	}

	/** The document's window stand-in: its observers, computed styles and frames. */
	_view (): IgeUiView {
		const root = this;
		const raf = (fn: (t: number) => void): number => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : (setTimeout(() => fn(perf()), 16) as unknown as number));
		return {
			MutationObserver: IgeUiMutationObserver as unknown as IgeUiView["MutationObserver"],
			ResizeObserver: IgeUiResizeObserver as unknown as IgeUiView["ResizeObserver"],
			getComputedStyle: (el: IgeUiElement) => root.computedStyle(el),
			requestAnimationFrame: raf,
			cancelAnimationFrame: (id: number) => (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id)),
			get innerWidth () {
				return root.viewport.w;
			},
			get innerHeight () {
				return root.viewport.h;
			}
		};
	}

	/**
	 * An element's computed style as getComputedStyle gives it: by name (getPropertyValue("margin-top")) or camelCase
	 * (marginTop); width and height the laid out size in px, as the page's are.
	 */
	computedStyle (el: IgeUiElement): Record<string, string> & { getPropertyValue (name: string): string } {
		this.flush();
		const cs = el._computed;
		const kebab = (k: string) => (k.startsWith("--") ? k : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
		const ctx = cs ? this.layoutEngine._ctx(cs) : undefined;
		const read = (name: string): string => {
			const b = el._box;
			if (b && (name === "width" || name === "height")) {
				const border = styleValue(cs, "box-sizing") === "border-box";
				const v = name === "width" ? (border ? b.borderW : b.borderW - b.borderLeft - b.borderRight - b.paddingLeft - b.paddingRight) : border ? b.borderH : b.borderH - b.borderTop - b.borderBottom - b.paddingTop - b.paddingBottom;
				return `${cssNumber(Math.max(0, v))}px`;
			}
			if (!cs || !ctx) return "";
			if (name === "display" && !el.isConnected) return "";
			return serializeComputed(name, cs, ctx, b, this.dpr);
		};
		return new Proxy({} as Record<string, string> & { getPropertyValue (name: string): string }, {
			get (_t, key) {
				if (key === "getPropertyValue") return (name: string) => read(name);
				if (typeof key !== "string") return undefined;
				return read(kebab(key));
			}
		});
	}

	/** Adds a stylesheet's text (later sheets win at equal specificity). */
	addStyleSheet (css: string): void {
		this.styles.addStylesheet(css);
		this._styleAll = true;
	}

	/** The fonts changed (loaded): measured again. */
	fontsChanged (): void {
		const f = this.layoutEngine.fonts as IgeUiCanvasFonts;
		f.reset?.();
		this.atlas?.reset();
		this._layoutDirty = true;
		this._layoutAll = true;
		this._paintDirty = true;
	}

	/** The screen's size (CSS px), the UI's scale and its safe area (CSS px from each edge). */
	resize (width: number, height: number, scale: number = this.scale, safeX: number = this.safe.x, safeY: number = this.safe.y): void {
		if (width === this.screen.w && height === this.screen.h && scale === this.scale && safeX === this.safe.x && safeY === this.safe.y) return;
		this.screen = { w: width, h: height };
		this.scale = scale;
		this.safe = { x: safeX, y: safeY };
		this.document._zoom = scale;
		this._updateViewport();
		this._styleAll = true;
		this._layoutDirty = true;
		this._layoutAll = true;
	}

	/** The UI's own size: the screen less the safe area, over the scale. */
	get viewport (): { w: number; h: number } {
		return { w: Math.max(1, (this.screen.w - this.safe.x * 2) / this.scale), h: Math.max(1, (this.screen.h - this.safe.y * 2) / this.scale) };
	}

	_updateViewport (): void {
		const v = this.viewport;
		this.styles.viewport = v;
		this.painter.viewport = v;
	}

	// ---------------------------------------------------------------- the document's host

	changed (el: IgeUiElement | null, change: IgeUiChange, attr?: string, tree?: IgeUiTreeChange): void {
		if (!el) return;
		this._queueMutation(el, change, attr, tree);
		if (change !== "scroll" && change !== "paint" && change !== "state") this._relayout.add(el);
		switch (change) {
			case "tree":
				this._markStyle(el);
				this._layoutDirty = true;
				break;
			case "class":
			case "attr":
				// (A sibling's selectors can depend on it: the parent's subtree is looked at again)
				this._markStyle(this.styles.usesSiblings && el.parentNode ? el.parentNode : el);
				if (this.styles.usesHas) for (let p = el.parentNode; p; p = p.parentNode) this._markStyle(p, true);
				this._layoutDirty = true;
				break;
			case "style":
				this._markStyle(el);
				this._layoutDirty = true;
				break;
			case "state":
				this._markStyle(el);
				break;
			case "text":
				this._layoutDirty = true;
				break;
			case "scroll":
			case "paint":
				this._paintDirty = true;
				break;
		}
	}

	_markStyle (el: IgeUiElement, selfOnly: boolean = false): void {
		el._styleDirty = true;
		if (!selfOnly) this._styleRoots.add(el);
		else this._styleRoots.add(el);
		this._paintDirty = true;
	}

	removed (node: IgeUiNode): void {
		if (node.nodeType !== 1) return;
		const el = node as IgeUiElement;
		const was = this._hover.length;
		this._hover = this._hover.filter((h) => !el.contains(h));
		if (this._hover.length !== was) this._hoverStale = true;
		if (this._active && el.contains(this._active)) this._active = null;
		if (this._tooltip?.shown && el.contains(this._tooltip.el)) this._hideTooltip();
	}

	listened (): void {
		// (Every element can take events: nothing to set up)
	}

	_queueMutation (el: IgeUiElement, change: IgeUiChange, attr?: string, tree?: IgeUiTreeChange): void {
		if (!this._observers.size) return;
		if (change === "scroll" || change === "paint" || change === "state") return;
		for (const o of this._observers) {
			const t = o._target;
			if (!t) continue;
			const inside = t === el || (o._opts.subtree && t.nodeType === 1 && (t as IgeUiElement).contains(el));
			if (!inside) continue;
			if (change === "tree" && o._opts.childList) o._queue.push({ type: "childList", target: el, addedNodes: tree?.added ?? [], removedNodes: tree?.removed ?? [] });
			else if ((change === "class" || change === "attr" || change === "style") && o._opts.attributes) {
				const name = change === "class" ? "class" : change === "style" ? "style" : attr ?? null;
				if (!o._opts.attributeFilter || (name && o._opts.attributeFilter.includes(name))) o._queue.push({ type: "attributes", target: el, attributeName: name, addedNodes: [], removedNodes: [] });
			} else if (change === "text" && (o._opts.characterData || o._opts.childList)) o._queue.push({ type: o._opts.characterData ? "characterData" : "childList", target: el, addedNodes: [], removedNodes: [] });
		}
		if (!this._mutationQueued) {
			this._mutationQueued = true;
			queueMicrotask(() => {
				this._mutationQueued = false;
				for (const o of [...this._observers]) {
					const recs = o.takeRecords();
					if (recs.length) o.callback(recs, o);
				}
			});
		}
	}

	focus (el: IgeUiElement | null, opts?: { preventScroll?: boolean; focusVisible?: boolean }): void {
		const prev = this.document.activeElement;
		if (prev === el) return;
		if (prev) {
			prev._states.delete("focus");
			prev._states.delete("focus-visible");
			this.changed(prev, "state");
			prev.dispatchEvent(new IgeUiEvent("blur"));
			prev.dispatchEvent(new IgeUiEvent("focusout", { bubbles: true }));
		}
		this.document.activeElement = el;
		if (el) {
			el._states.add("focus");
			if (opts?.focusVisible !== false) el._states.add("focus-visible");
			this.changed(el, "state");
			el.dispatchEvent(new IgeUiEvent("focus"));
			el.dispatchEvent(new IgeUiEvent("focusin", { bubbles: true }));
			if (!opts?.preventScroll) this.scrollIntoView(el, "nearest");
		}
		this._syncTextInput();
	}

	clientRect (el: IgeUiElement): ReturnType<IgeUiElement["getBoundingClientRect"]> {
		this.flush();
		const b = el._box;
		if (!b) return { x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
		const [dx, dy] = this._scrolled(b);
		let x = b.ax + dx, y = b.ay + dy, w = b.borderW, h = b.borderH;
		if (b.inlineRects) {
			// An inline element: round its pieces on its lines
			const rs = b.inlineRects;
			const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
			w = Math.max(...rs.map((r) => r.x + r.w)) - x0;
			h = Math.max(...rs.map((r) => r.y + r.h)) - y0;
			x = x0 + dx;
			y = y0 + dy;
		}
		// Transforms on it and its ancestors (the box's corners through them)
		const m = this._matrixOf(b);
		if (m) {
			const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]]);
			const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
			x = Math.min(...xs);
			y = Math.min(...ys);
			w = Math.max(...xs) - x;
			h = Math.max(...ys) - y;
		}
		const s = this.scale;
		const left = x * s + this.safe.x + this.pageOffset.x, top = y * s + this.safe.y + this.pageOffset.y;
		return { x: left, y: top, left, top, right: left + w * s, bottom: top + h * s, width: w * s, height: h * s };
	}

	/** A box's offset from the scrolling of the boxes it's in. */
	_scrolled (b: IgeUiBox): [number, number] {
		let dx = 0, dy = 0;
		const fixed = b.position === "fixed";
		const scrollOf = (el: IgeUiElement | null): [number, number] => (el ? [el._scrollLeft, el._scrollTop] : [0, 0]);
		// (Sticky boxes, it or round it, held in their scroller's view)
		for (let p: IgeUiBox | null = b; p; p = p.parent) {
			if (!p.sticky) continue;
			const [sx, sy] = stickyShift(p, scrollOf);
			dx += sx;
			dy += sy;
		}
		for (let p = b.parent; p && !fixed; p = p.parent) {
			if (p.el && !p.pseudo && (styleValue(p.style, "overflow-x") !== "visible" || styleValue(p.style, "overflow-y") !== "visible")) {
				dx -= p.el._scrollLeft;
				dy -= p.el._scrollTop;
			}
			if (p.position === "fixed") break;
		}
		return [dx, dy];
	}

	_matrixOf (b: IgeUiBox): [number, number, number, number, number, number] | undefined {
		let m: [number, number, number, number, number, number] | undefined;
		for (let p: IgeUiBox | null = b; p; p = p.parent) {
			if (!p.transform) continue;
			const [ox, oy] = this.painter._origin(p);
			const ax = p.ax + ox, ay = p.ay + oy;
			const t = p.transform;
			const local: [number, number, number, number, number, number] = [t[0], t[1], t[2], t[3], ax + t[4] - t[0] * ax - t[2] * ay, ay + t[5] - t[1] * ax - t[3] * ay];
			m = m ? mul(local, m) : local;
		}
		return m;
	}

	scrollIntoView (el: IgeUiElement, block: "start" | "center" | "end" | "nearest"): void {
		this.flush();
		const b = el._box;
		if (!b) return;
		for (let p = el.parentNode; p; p = p.parentNode) {
			const pb = p._box;
			if (!pb) continue;
			const oy = styleValue(p._computed, "overflow-y");
			if (oy !== "auto" && oy !== "scroll") continue;
			const top = b.ay - (pb.ay + pb.borderTop), bottom = top + b.borderH;
			const view = p.clientHeight;
			let next = p._scrollTop;
			if (block === "start") next = top;
			else if (block === "end") next = bottom - view;
			else if (block === "center") next = top - (view - b.borderH) / 2;
			else if (top < p._scrollTop) next = top;
			else if (bottom > p._scrollTop + view) next = bottom - view;
			p.scrollTop = next;
		}
	}

	// ---------------------------------------------------------------- the frame

	/** Styles and layout, now (a measurement was asked for). */
	flush (): void {
		this._restyle();
		if (this._layoutDirty) this._layout();
		else if (this._resizeCheck) this._resized();
	}

	/** The frame's work: animations, styles, layout, the display list. */
	update (now: number = typeof performance !== "undefined" ? performance.now() : Date.now()): void {
		this._now = now;
		this._animate(now);
		this._restyle();
		const laidOut = this._layoutDirty;
		if (this._layoutDirty) this._layout();
		else if (this._resizeCheck) this._resized();
		this._momentumStep();
		this._tooltipStep(now);
		if (this._paintDirty) {
			const t0 = perf();
			this.painter._scroll = (el) => (el ? [el._scrollLeft, el._scrollTop] : [0, 0]);
			this.items = this.rootBox ? this.painter.paint(this.rootBox) : [];
			this._hits();
			this._paintDirty = false;
			// What's under a pointer that hasn't moved, when what's there changed (a list redrawn under it), as a browser does after layout
			if (this._pointerAt && (laidOut || this._hoverStale)) this._setHover(this.hitTest(this._pointerAt.clientX, this._pointerAt.clientY), this._pointerAt);
			this._hoverStale = false;
			this.stats.paint = perf() - t0;
			this.stats.items = this.items.length;
		}
	}

	/** Every animation settled (transitions done, one-shots at their end, endless ones held at their start), then drawn so. */
	settleAnimations (now: number = this._now || perf()): void {
		this.flush();
		this.animator.settle(now);
		this._animate(now);
		this._paintDirty = true;
	}

	_animate (now: number): void {
		if (!this.animator.active.size) return;
		let layout = false;
		const moving = [...this.animator.active];
		for (const el of moving) {
			const prev = el._computed;
			const cur = this.animator.current(el, now);
			if (!cur) continue;
			if (prev) {
				for (const k of LAYOUT_PROPS) {
					if (prev[k] !== cur[k]) {
						layout = true;
						this._relayout.add(el);
						break;
					}
				}
			}
			el._computed = cur;
			if (el._box) el._box.style = cur;
		}
		this._paintDirty = true;
		if (layout) this._layoutDirty = true;
		else if (this.rootBox) {
			// Paint-only changes: the boxes keep their places, transforms are worked out again (those that just stopped too)
			for (const el of moving) {
				const b = el._box;
				if (!b) continue;
				const tf = styleValue(b.style, "transform");
				b.transform = tf === "none" ? undefined : this.layoutEngine.layoutBoxTransform(b);
			}
		}
	}

	_restyle (): void {
		if (!this._styleAll && !this._styleRoots.size) return;
		const t0 = perf();
		let count = 0;
		const now = this._now;
		const visit = (el: IgeUiElement, parent: IgeUiComputedStyle | undefined, force: boolean) => {
			if (force || el._styleDirty || !el._computed) {
				const prev = el._computed;
				const next = this.styles.compute(el, parent);
				el._computed = this.animator.restyled(el, prev, next, now);
				el._styleDirty = false;
				count++;
				force = true;
				this._relayout.add(el);
			}
			const cs = this.animator._base.get(el) ?? el._computed;
			for (const c of el.childNodes) if (c.nodeType === 1) visit(c as IgeUiElement, el._computed ?? cs, force);
		};
		if (this._styleAll) {
			this._layoutAll = true;
			visit(this.document.documentElement, undefined, true);
		}
		else {
			// Each dirty root under its (up to date) parent; ones inside another dirty root come with it
			const roots = [...this._styleRoots].filter((r) => r.isConnected && ![...this._styleRoots].some((o) => o !== r && o.contains(r)));
			for (const r of roots) visit(r, r.parentNode?._computed, true);
		}
		this._styleAll = false;
		this._styleRoots.clear();
		this._layoutDirty = true;
		this._paintDirty = true;
		this.stats.style = perf() - t0;
		this.stats.elements = count;
	}

	_layout (): void {
		const t0 = perf();
		const v = this.viewport;
		this.layoutEngine.viewport = v;
		this.layoutEngine.pixelGrid = this.scale * this.dpr;
		this.document._pixelGrid = this.scale * this.dpr;
		const partial = !this._layoutAll && this.rootBox ? this._layoutPart() : undefined;
		if (!partial) this.rootBox = this.layoutEngine.layout(this.document.documentElement, v.w, v.h);
		this._layoutAll = false;
		this._relayout.clear();
		this.stats.partial = partial ? partial.length : 0;
		// Containers' sizes for @container (the next restyle)
		this._layoutDirty = false;
		this._paintDirty = true;
		// Scroll offsets kept in range
		const clamp = (b: IgeUiBox) => {
			const el = b.el;
			if (el && !b.pseudo && (el._scrollTop || el._scrollLeft)) {
				el._scrollTop = Math.max(0, Math.min(el._scrollTop, Math.max(0, el.scrollHeight - el.clientHeight)));
				el._scrollLeft = Math.max(0, Math.min(el._scrollLeft, Math.max(0, el.scrollWidth - el.clientWidth)));
			}
			for (const c of b.children) clamp(c);
		};
		for (const b of partial ?? (this.rootBox ? [this.rootBox] : [])) clamp(b);
		this.stats.layout = perf() - t0;
		if (this._resizeObservers.size) this._resized();
	}

	/**
	 * Lays out again only the positioned boxes round what changed (a positioned box's size moves nothing outside
	 * it). Returns the boxes laid out, or undefined when something changed outside every positioned box (lay out all).
	 */
	_layoutPart (): IgeUiBox[] | undefined {
		const roots = new Set<IgeUiBox>();
		for (const el of this._relayout) {
			if (!el.isConnected) continue;
			// The nearest positioned box round it (it, or an ancestor; a new element's parent's)
			let found: IgeUiBox | undefined;
			for (let n: IgeUiElement | null = el; n; n = n.parentNode) {
				const b = n._box;
				if (!b) continue;
				if ((b.position === "absolute" || b.position === "fixed") && b.parent && n !== this.document.body && n !== this.document.documentElement) {
					found = b;
					break;
				}
			}
			if (!found) return undefined;
			roots.add(found);
		}
		// (Those inside another that's laid out again come with it)
		const list = [...roots].filter((r) => ![...roots].some((o) => o !== r && o.el!.contains(r.el!)));
		const done: IgeUiBox[] = [];
		for (const b of list) {
			const nb = this.layoutEngine.relayoutPositioned(b);
			if (!nb) return undefined;
			done.push(nb);
		}
		return done;
	}

	/** Tells the resize observers whose elements' sizes the layout changed (after it, in a microtask). */
	_resized (): void {
		this._resizeCheck = false;
		const due: [IgeUiResizeObserver, IgeUiResizeObserverEntry[]][] = [];
		for (const o of this._resizeObservers) {
			const entries: IgeUiResizeObserverEntry[] = [];
			for (const [el, was] of o._targets) {
				const b = el._box;
				const w = b ? b.borderW - b.borderLeft - b.borderRight - b.paddingLeft - b.paddingRight - (b.scrollbarY ?? 0) : 0;
				const h = b ? b.borderH - b.borderTop - b.borderBottom - b.paddingTop - b.paddingBottom - (b.scrollbarX ?? 0) : 0;
				if (Math.abs(w - was.w) < 0.01 && Math.abs(h - was.h) < 0.01) continue;
				o._targets.set(el, { w, h });
				entries.push({
					target: el,
					contentRect: { x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h },
					borderBoxSize: [{ inlineSize: b?.borderW ?? 0, blockSize: b?.borderH ?? 0 }],
					contentBoxSize: [{ inlineSize: w, blockSize: h }]
				});
			}
			if (entries.length) due.push([o, entries]);
		}
		if (due.length) queueMicrotask(() => {
			for (const [o, entries] of due) if (this._resizeObservers.has(o)) o.callback(entries, o);
		});
	}

	_hits (): void {
		// What's drawn where, in paint order (the last drawn is on top)
		const list: HitEntry[] = [];
		const seen = new Set<IgeUiElement>();
		for (const it of this.items) {
			const el = it.el;
			if (!el || seen.has(el) || it.op === "text" || it.op === "line") continue;
			if (it.op === "box" && it.shadow === "outer") continue;
			seen.add(el);
		}
		// Every box (painted or not: transparent boxes still take the pointer), in tree and z order like paint
		const scrollOf = (el: IgeUiElement | null): [number, number] => (el ? [el._scrollLeft, el._scrollTop] : [0, 0]);
		type M = [number, number, number, number, number, number];
		const walk = (b: IgeUiBox, clip: HitEntry["clip"], dx: number, dy: number, m?: M) => {
			const fixed = b.position === "fixed";
			if (fixed) {
				clip = null;
				dx = 0;
				dy = 0;
				m = undefined;
			}
			if (b.sticky) {
				const [sx, sy] = stickyShift(b, scrollOf);
				dx += sx;
				dy += sy;
			}
			if (b.transform) {
				// Its transform about its origin: what's in it is tested in its own pixels (the clip from round it brought in)
				const [ox, oy] = this.painter._origin(b);
				const ax = b.ax + dx + ox, ay = b.ay + dy + oy;
				const t = b.transform;
				const local: M = [t[0], t[1], t[2], t[3], ax + t[4] - t[0] * ax - t[2] * ay, ay + t[5] - t[1] * ax - t[3] * ay];
				m = m ? mul(m, local) : local;
				const li = invert(local);
				if (clip && li) {
					const a = apply(li, clip[0], clip[1]), c2 = apply(li, clip[2], clip[3]);
					clip = [Math.min(a[0], c2[0]), Math.min(a[1], c2[1]), Math.max(a[0], c2[0]), Math.max(a[1], c2[1])];
				}
			}
			const inv = m ? invert(m) : undefined;
			const el = b.el;
			if (el && !b.pseudo && styleValue(b.style, "visibility") !== "hidden") {
				if (b.inlineRects) for (const r of b.inlineRects) list.push({ el, x: r.x + dx, y: r.y + dy, w: r.w, h: r.h, clip, inv });
				else list.push({ el, x: b.ax + dx, y: b.ay + dy, w: b.borderW, h: b.borderH, clip, inv });
			}
			const ox = styleValue(b.style, "overflow-x"), oy = styleValue(b.style, "overflow-y");
			let c = clip, ddx = dx, ddy = dy;
			if ((ox !== "visible" || oy !== "visible") && el && !b.pseudo) {
				const x0 = b.ax + dx + b.borderLeft, y0 = b.ay + dy + b.borderTop;
				const nc: [number, number, number, number] = [x0, y0, x0 + b.borderW - b.borderLeft - b.borderRight, y0 + b.borderH - b.borderTop - b.borderBottom];
				c = c ? [Math.max(c[0], nc[0]), Math.max(c[1], nc[1]), Math.min(c[2], nc[2]), Math.min(c[3], nc[3])] : nc;
				ddx -= el._scrollLeft;
				ddy -= el._scrollTop;
			}
			const kids = [...b.children].map((k, i) => ({ k, i })).sort((p, q) => zOf(p.k) - zOf(q.k) || p.i - q.i);
			for (const { k } of kids) walk(k, c, ddx, ddy, m);
		};
		if (this.rootBox) walk(this.rootBox, null, 0, 0);
		this.hitList = list;
	}

	/** The element under a point (client CSS px), honouring pointer-events and clipping; null over nothing. */
	hitTest (clientX: number, clientY: number): IgeUiElement | null {
		this.update(this._now || undefined);
		const ux = (clientX - this.pageOffset.x - this.safe.x) / this.scale, uy = (clientY - this.pageOffset.y - this.safe.y) / this.scale;
		for (let i = this.hitList.length - 1; i >= 0; i--) {
			const h = this.hitList[i];
			const [x, y] = h.inv ? apply(h.inv, ux, uy) : [ux, uy];
			if (x < h.x || y < h.y || x >= h.x + h.w || y >= h.y + h.h) continue;
			if (h.clip && (x < h.clip[0] || y < h.clip[1] || x >= h.clip[2] || y >= h.clip[3])) continue;
			if (styleValue(h.el._computed, "pointer-events") === "none") continue;
			if (h.el === this.document.body || h.el === this.document.documentElement) continue;
			return h.el;
		}
		return null;
	}

	// ---------------------------------------------------------------- drawing

	/** Draws onto a WebGL 2 context (the canvas `width` x `height` device px, `dpr` device px per CSS px). */
	draw (gl: WebGL2RenderingContext, width: number, height: number, dpr: number): number {
		if (dpr !== this.dpr) {
			this.dpr = dpr;
			this._layoutDirty = true;
			this._layoutAll = true;
		}
		this.update();
		if (!this.gl) {
			this.atlas ??= new IgeUiSdfAtlas();
			this.gl = new IgeUiGlRenderer(gl, this.atlas);
		} else if (this.gl.gl !== gl) this.gl.restore(gl);
		const t0 = perf();
		const calls = this.gl.draw(this.items, width, height, this.scale * dpr, [(this.safe.x + this.pageOffset.x) * dpr, (this.safe.y + this.pageOffset.y) * dpr]);
		this.stats.draw = perf() - t0;
		this.stats.drawCalls = calls;
		return calls;
	}

	/**
	 * Draws on a canvas of its own (its own WebGL 2 context, transparent, over the page), every animation frame,
	 * at the window's size: a UI with no game under it, or one shown beside the page's for comparison.
	 */
	/**
	 * Draws on a canvas of its own (WebGL 2), every animation frame (`loop`, the default) or when `draw()` is
	 * called (a test page whose frames are held: draw after each step). `preserve` keeps the picture for
	 * screenshots read back from the canvas.
	 */
	drawOnCanvas (canvas: HTMLCanvasElement, opts: { loop?: boolean; preserve?: boolean } = {}): { draw (): void; stop (): void } {
		const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: !!opts.preserve });
		if (!gl) throw new Error("IgeUiRoot: no WebGL 2 for the canvas");
		let frame = 0;
		const draw = () => {
			const dpr = window.devicePixelRatio || 1;
			const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			gl.viewport(0, 0, w, h);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			this.draw(gl, w, h, dpr);
		};
		const tick = () => {
			draw();
			frame = requestAnimationFrame(tick);
		};
		if (opts.loop !== false) frame = requestAnimationFrame(tick);
		return { draw, stop: () => cancelAnimationFrame(frame) };
	}

	/** The renderer was made again (a lost context restored). */
	contextRestored (gl: WebGL2RenderingContext): void {
		this.gl?.restore(gl);
	}

	// ---------------------------------------------------------------- input

	/**
	 * Takes the page's pointer and wheel events (capture, on the window): what lands on the UI is dispatched to it
	 * and kept from the game. Returns a function that stops it.
	 */
	attachInput (target: Window = window): () => void {
		const opts = { capture: true, passive: false } as AddEventListenerOptions;
		const on = (type: string, fn: (e: Event) => void) => {
			target.addEventListener(type, fn, opts);
			return () => target.removeEventListener(type, fn, opts);
		};
		const offs = [
			on("pointermove", (e) => this._pointer("pointermove", e as PointerEvent)),
			on("pointerdown", (e) => this._pointer("pointerdown", e as PointerEvent)),
			on("pointerup", (e) => this._pointer("pointerup", e as PointerEvent)),
			on("pointercancel", (e) => this._pointer("pointercancel", e as PointerEvent)),
			// (Out of the window: nothing's under the pointer any more)
			on("pointerout", (e) => {
				if ((e as PointerEvent).relatedTarget) return;
				this._pointerAt = undefined;
				this._setHover(null, e as PointerEvent);
			}),
			on("click", (e) => this._swallow(e as MouseEvent)),
			on("mousedown", (e) => this._swallow(e as MouseEvent)),
			on("mouseup", (e) => this._swallow(e as MouseEvent)),
			on("contextmenu", (e) => this._mouse("contextmenu", e as MouseEvent)),
			on("wheel", (e) => this._wheel(e as WheelEvent)),
			on("keydown", (e) => this._key("keydown", e as KeyboardEvent)),
			on("keyup", (e) => this._key("keyup", e as KeyboardEvent))
		];
		this._detach = () => offs.forEach((f) => f());
		return this._detach;
	}

	_event (type: string, e: MouseEvent | PointerEvent | WheelEvent, extra: Record<string, unknown> = {}): IgeUiEvent {
		return new IgeUiEvent(type, {
			bubbles: !["mouseenter", "mouseleave", "pointerenter", "pointerleave"].includes(type), cancelable: true,
			clientX: e.clientX, clientY: e.clientY, button: e.button, buttons: e.buttons, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey,
			pointerId: (e as PointerEvent).pointerId ?? 1, pointerType: (e as PointerEvent).pointerType ?? "mouse", detail: e.detail, ...extra
		});
	}

	_swallow (e: MouseEvent): void {
		// (The UI makes its own clicks from pointer events; the page's aren't for the game where the UI is)
		if (this.hitTest(e.clientX, e.clientY)) {
			e.stopImmediatePropagation();
			if (e.type !== "click") e.preventDefault();
		}
	}

	_mouse (type: string, e: MouseEvent): void {
		const t = this.hitTest(e.clientX, e.clientY);
		if (!t) return;
		const ev = this._event(type, e);
		t.dispatchEvent(ev);
		e.stopImmediatePropagation();
		if (ev.defaultPrevented || type === "contextmenu") e.preventDefault();
	}

	_setHover (t: IgeUiElement | null, e: MouseEvent | PointerEvent): void {
		const chain: IgeUiElement[] = [];
		for (let n = t; n; n = n.parentNode) chain.push(n);
		const old = this._hover;
		if (old[0] === chain[0]) return;
		const leaving = old.filter((o) => !chain.includes(o));
		const entering = chain.filter((c) => !old.includes(c));
		if (old[0]) {
			old[0].dispatchEvent(this._event("pointerout", e, { relatedTarget: t }));
			old[0].dispatchEvent(this._event("mouseout", e, { relatedTarget: t }));
		}
		for (const l of leaving) {
			l._states.delete("hover");
			l.dispatchEvent(this._event("pointerleave", e));
			l.dispatchEvent(this._event("mouseleave", e));
			if (this.styles.stateDependent.has("hover")) this.changed(l, "state");
		}
		for (const c of entering.reverse()) {
			c._states.add("hover");
			c.dispatchEvent(this._event("pointerenter", e));
			c.dispatchEvent(this._event("mouseenter", e));
			if (this.styles.stateDependent.has("hover")) this.changed(c, "state");
		}
		if (t) {
			t.dispatchEvent(this._event("pointerover", e, { relatedTarget: old[0] ?? null }));
			t.dispatchEvent(this._event("mouseover", e, { relatedTarget: old[0] ?? null }));
		}
		this._hover = chain;
		// A tooltip from the nearest title
		const titled = t?.closest("[title]") ?? null;
		if (titled !== this._tooltip?.el) {
			this._hideTooltip();
			if (titled && titled.title) this._tooltip = { el: titled, at: this._now, x: e.clientX, y: e.clientY };
		} else if (this._tooltip) {
			this._tooltip.x = e.clientX;
			this._tooltip.y = e.clientY;
		}
	}

	_pointer (type: string, e: PointerEvent): void {
		// A captured pointer (setPointerCapture) goes to its element wherever it is, until it's let go
		const captured = this.document._capture;
		const hit = this.hitTest(e.clientX, e.clientY);
		const t = captured && captured.id === e.pointerId && type !== "pointerdown" && captured.el.isConnected ? captured.el : hit;
		if (captured && (type === "pointerup" || type === "pointercancel")) this.document._capture = undefined;
		if (type === "pointermove") {
			this._pointerAt = e;
			this._setHover(t, e);
			const d = this._down;
			if (d?.pointerType === "touch" && d.scroller) {
				// A touch drag scrolls the box it started in
				const dy = e.clientY - (d.lastY ?? d.y);
				if (!d.dragging && Math.abs(e.clientY - d.y) > 8) d.dragging = true;
				if (d.dragging) {
					d.scroller.scrollTop -= dy / this.scale;
					const dt = Math.max(1, e.timeStamp - (d.lastT ?? e.timeStamp - 16));
					d.vy = (-dy / this.scale) / dt;
				}
				d.lastY = e.clientY;
				d.lastT = e.timeStamp;
			}
			if (t || d) {
				const to = t ?? d!.el;
				to.dispatchEvent(this._event(type, e));
				// (And the mouse's own move, as a browser sends it after the pointer's: not for a touch)
				if (e.pointerType !== "touch") to.dispatchEvent(this._event("mousemove", e));
				e.stopImmediatePropagation();
			}
			return;
		}
		if (type === "pointerdown") {
			this._momentum = undefined;
			if (!t) {
				// (Pressed outside the UI (the game behind it): the UI's focus goes, as a page's does)
				if (this.document.activeElement) this.focus(null);
				return;
			}
			this._down = { el: t, x: e.clientX, y: e.clientY, time: e.timeStamp, pointerType: e.pointerType, scroller: this._scroller(t) };
			this._active = t;
			for (let n: IgeUiElement | null = t; n; n = n.parentNode) n._states.add("active");
			if (this.styles.stateDependent.has("active")) this.changed(t, "state");
			const ev = this._event(type, e);
			t.dispatchEvent(ev);
			t.dispatchEvent(this._event("mousedown", e));
			// Focus goes to what was pressed (a field, a button), or leaves
			const focusable = t.closest("input, textarea, select, button, [tabindex]");
			if (focusable && focusable.tabIndex >= 0 && !focusable.isDisabled) this.focus(focusable, { preventScroll: true, focusVisible: false });
			else if (this.document.activeElement && !this.document.activeElement.contains(t)) this.focus(null);
			e.stopImmediatePropagation();
			if (ev.defaultPrevented) e.preventDefault();
			this._hideTooltip();
			return;
		}
		if (type === "pointerup" || type === "pointercancel") {
			const d = this._down;
			this._down = undefined;
			for (let n = this._active; n; n = n.parentNode) n._states.delete("active");
			if (this._active && this.styles.stateDependent.has("active")) this.changed(this._active, "state");
			this._active = null;
			if (d?.dragging && d.scroller) {
				// Momentum
				this._momentum = { el: d.scroller, vx: 0, vy: (d.vy ?? 0) * 16 };
				e.stopImmediatePropagation();
				return;
			}
			const target = t ?? d?.el;
			if (!target) return;
			target.dispatchEvent(this._event(type, e));
			target.dispatchEvent(this._event("mouseup", e));
			if (type === "pointerup" && d && t) {
				// A click on what was pressed and released (their nearest common ancestor)
				let common: IgeUiElement | null = t;
				while (common && !common.contains(d.el)) common = common.parentNode;
				if (common && !(e.button === 2)) {
					const disabled = common.closest("button:disabled, input:disabled");
					if (!disabled) common.dispatchEvent(this._event("click", e, { detail: 1 }));
				}
				// (A field tapped: its hidden input focused again as the finger lifts, where a phone shows its keyboard for
				// a focus that comes with the tap (iOS doesn't for one made as it's pressed))
				if (e.pointerType === "touch" && this._textInput && this.document.activeElement === t.closest("input, textarea")) this._textInput.focus({ preventScroll: true });
			}
			e.stopImmediatePropagation();
		}
	}

	_scroller (el: IgeUiElement): IgeUiElement | undefined {
		for (let n: IgeUiElement | null = el; n; n = n.parentNode) {
			const oy = styleValue(n._computed, "overflow-y");
			if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) return n;
		}
		return undefined;
	}

	_wheel (e: WheelEvent): void {
		const t = this.hitTest(e.clientX, e.clientY);
		if (!t) return;
		const ev = this._event("wheel", e, { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode });
		t.dispatchEvent(ev);
		e.stopImmediatePropagation();
		if (!ev.defaultPrevented) {
			const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
			for (let n: IgeUiElement | null = t; n; n = n.parentNode) {
				const oy = styleValue(n._computed, "overflow-y"), ox = styleValue(n._computed, "overflow-x");
				if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1 && e.deltaY) {
					const before = n.scrollTop;
					n.scrollTop += (e.deltaY * mult) / this.scale;
					if (n.scrollTop !== before) break;
				}
				if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 1 && e.deltaX) {
					n.scrollLeft += (e.deltaX * mult) / this.scale;
					break;
				}
			}
		}
		e.preventDefault();
	}

	_key (type: string, e: KeyboardEvent): void {
		const a = this.document.activeElement;
		if (!a) return;
		const ev = new IgeUiEvent(type, { bubbles: true, cancelable: true, key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, repeat: e.repeat });
		a.dispatchEvent(ev);
		if (ev.defaultPrevented) e.preventDefault();
		// A field that's typing keeps its keys from the game
		if (a.localName === "input" || a.localName === "textarea") e.stopImmediatePropagation();
	}

	_momentumStep (): void {
		const m = this._momentum;
		if (!m) return;
		m.vy *= 0.94;
		const before = m.el.scrollTop;
		m.el.scrollTop += m.vy;
		if (Math.abs(m.vy) < 0.3 || m.el.scrollTop === before) this._momentum = undefined;
	}

	// ---------------------------------------------------------------- tooltips

	_tooltipStep (now: number): void {
		const t = this._tooltip;
		if (!t || t.shown || now - t.at < 600 || !t.el.isConnected) return;
		const tip = this.document.createElement("div");
		tip.className = "igeTooltip";
		tip.textContent = t.el.title;
		const v = this.viewport;
		const x = (t.x - this.pageOffset.x - this.safe.x) / this.scale, y = (t.y - this.pageOffset.y - this.safe.y) / this.scale;
		tip.style.left = `${Math.min(v.w - 260, x + 12)}px`;
		tip.style.top = `${Math.min(v.h - 40, y + 18)}px`;
		this.document.body.appendChild(tip);
		t.shown = tip;
	}

	_hideTooltip (): void {
		this._tooltip?.shown?.remove();
		this._tooltip = undefined;
	}

	// ---------------------------------------------------------------- text fields

	/** A focused field types through a hidden page input (IME, on-screen keyboards, paste); its value mirrors back. */
	_syncTextInput (): void {
		if (typeof document === "undefined") return;
		const a = this.document.activeElement;
		const typing = a && (a.localName === "input" || a.localName === "textarea") && !["range", "checkbox", "radio", "button"].includes(a.getAttribute("type") ?? "text");
		if (!typing) {
			this._textInput?.blur();
			return;
		}
		if (!this._textInput) {
			const input = document.createElement("input");
			input.setAttribute("aria-hidden", "true");
			input.style.cssText = "position:fixed;left:-1000px;top:0;width:200px;height:20px;opacity:0;pointer-events:none;";
			document.body.appendChild(input);
			input.addEventListener("input", () => {
				const el = this.document.activeElement;
				if (!el) return;
				el.value = input.value;
				el.dispatchEvent(new IgeUiEvent("input", { bubbles: true }));
			});
			input.addEventListener("change", () => this.document.activeElement?.dispatchEvent(new IgeUiEvent("change", { bubbles: true })));
			input.addEventListener("keydown", (e) => {
				const el = this.document.activeElement;
				if (!el) return;
				const ev = new IgeUiEvent("keydown", { bubbles: true, cancelable: true, key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey });
				el.dispatchEvent(ev);
				if (ev.defaultPrevented) e.preventDefault();
				e.stopPropagation();
			});
			input.addEventListener("blur", () => {
				// (The page took focus from the field (a click outside the UI): the field loses it. Focus the UI moved on
				// itself (a button pressed, which blurs this input as it goes) stays where it went)
				const a = this.document.activeElement;
				if (a && this._textInput === input && (a.localName === "input" || a.localName === "textarea")) this.focus(null);
			});
			wireTextField(input, () => this.document.activeElement, () => {
				this._paintDirty = true;
			});
			this._textInput = input;
		}
		if (this._textInput.value !== a!.value) this._textInput.value = a!.value;
		this._textInput.type = a!.getAttribute("type") === "password" ? "password" : "text";
		// (Over the field, with the field's selection: an IME's window beside it, a phone's keyboard scrolled to it)
		placeTextField(this._textInput, a!);
		if (document.activeElement !== this._textInput) takeSelection(this._textInput, a!);
		this._textInput.focus({ preventScroll: true });
	}

	destroy (): void {
		this._detach?.();
		this._textInput?.remove();
		this.gl?.destroy();
	}
}

function zOf (b: IgeUiBox): number {
	return b.position !== "static" ? b.zIndex ?? 0 : 0;
}

function mul (m: [number, number, number, number, number, number], n: [number, number, number, number, number, number]): [number, number, number, number, number, number] {
	return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}

function invert (m: [number, number, number, number, number, number]): [number, number, number, number, number, number] | undefined {
	const det = m[0] * m[3] - m[1] * m[2];
	if (Math.abs(det) < 1e-12) return undefined;
	const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
	return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

function apply (m: [number, number, number, number, number, number], x: number, y: number): [number, number] {
	return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function perf (): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

const ENGINE_STYLES = `
.igeTooltip { position: fixed; z-index: 100000; max-width: 260px; padding: 5px 9px; background: rgba(4, 12, 20, 0.95); border: 1px solid rgba(95, 227, 255, 0.4); color: #d7ecf5; font-size: 12px; pointer-events: none; white-space: normal; }
`;
