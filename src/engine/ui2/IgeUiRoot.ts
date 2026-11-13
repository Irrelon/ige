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
import type { IgeCssStylesheet } from "@/engine/ui2/css/IgeCssParser";
import { parseColor } from "@/engine/ui2/css/IgeCssValues";
import { IgeUiCaretBlink, isTextField, textFieldPaint } from "@/engine/ui2/dom/IgeUiTextField";
import type { IgeUiHost, IgeUiInputEvent, IgeUiInputResult, IgeUiTextEntryEvents, IgeUiTextEntryField } from "@/engine/ui2/IgeUiHost";
import { igeUiAttachWebInput, webUiHost } from "@/engine/ui2/IgeUiWebHost";
import { type IgeUiAdoption, igeUiEventClock, igeUiSameStart, IgeUiDocument, type IgeUiDocumentHost, IgeUiElement, IgeUiEvent, type IgeUiChange, type IgeUiNode, type IgeUiTreeChange, type IgeUiView } from "@/engine/ui2/dom/IgeUiDom";
import { type IgeUiBox, stickyShift } from "@/engine/ui2/layout/IgeUiBox";
import { IgeUiDragDrop } from "@/engine/ui2/input/IgeUiDragDrop";
import { IgeUiImages } from "@/engine/ui2/dom/IgeUiImages";
import { svgAnimating, svgClock } from "@/engine/ui2/render/IgeUiSvgSmil";
import { IgeUiLayoutEngine } from "@/engine/ui2/layout/IgeUiLayout";
import { IgeUiGlRenderer } from "@/engine/ui2/render/IgeUiGlRenderer";
import { type IgeUiPaintItem, IgeUiPainter } from "@/engine/ui2/render/IgeUiPaint";
import { projectedBox } from "@/engine/ui2/render/IgeUiPerspective";
import { type IgeUiPress, pressChain, pressClicks, pressMoved, touchScroller } from "@/engine/ui2/input/IgeUiPointers";
import { IgeUiAnimator, LAYOUT_PROPS } from "@/engine/ui2/style/IgeUiAnimator";
import { cssNumber, serializeComputed } from "@/engine/ui2/style/IgeUiComputed";
import { INHERITED } from "@/engine/ui2/style/IgeUiProperties";
import { type IgeUiComputedStyle, IgeUiStyleEngine, styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";
import type { IgeUiFontProvider } from "@/engine/ui2/text/IgeUiFonts";
import { IgeUiSdfAtlas } from "@/engine/ui2/text/IgeUiSdfAtlas";
import { svgTransform } from "@/engine/ui2/render/IgeUiSvg";

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
	/** The platform: time, the display, fonts, pictures, 2D surfaces and typing (default: the browser's, webUiHost()). */
	host?: IgeUiHost;
	/** Measure text with these fonts (default: the host's: the page's in a browser, a fixed-width stand-in without one). */
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
	/** `<img>` pictures (dom/IgeUiImages). */
	readonly images = new IgeUiImages();
	readonly animator = new IgeUiAnimator();
	atlas?: IgeUiSdfAtlas;
	gl?: IgeUiGlRenderer;
	/** The screen (CSS px), the UI's scale and its safe area (CSS px each side). */
	screen = { w: 1280, h: 720 };
	scale = 1;
	safe = { x: 0, y: 0 };
	/** Device pixels per CSS pixel (as drawn last; border widths in computed styles snap to them). */
	dpr = 1;
	/** The platform it runs on (IgeUiHost). */
	readonly host: IgeUiHost;
	/** Where the UI's canvas sits on the page (CSS px), for client coordinates. */
	pageOffset = { x: 0, y: 0 };
	rootBox?: IgeUiBox;
	items: IgeUiPaintItem[] = [];
	hitList: HitEntry[] = [];
	/** What's out of date. */
	_styleRoots = new Set<IgeUiElement>();
	/** Elements whose own style is looked at again (only): restyled with all under them if it turns out different. */
	_styleSelf = new Set<IgeUiElement>();
	_styleAll = true;
	_layoutDirty = true;
	/** Everything must be laid out again (the first time, a resize, new stylesheets, fonts); else only round `_relayout`. */
	_layoutAll = true;
	/** Elements changed or restyled since the last layout: what's laid out again is the positioned boxes round them. */
	_relayout = new Set<IgeUiElement>();
	/** Elements marked for layout (their boxes aren't kept). */
	_layoutMarked = new Set<IgeUiElement>();
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
	/** Presses under way, a pointer each (fingers at once: input/IgeUiPointers.ts). */
	_presses = new Map<number, IgeUiPress>();
	/** Touches that landed on the game, not the UI: the game's to the end. */
	_outside = new Set<number>();
	_momentum?: { el: IgeUiElement; vx: number; vy: number };
	_tooltip?: { el: IgeUiElement; at: number; x: number; y: number; shown?: IgeUiElement };
	_now = 0;
	/** The focused field's caret blink (dom/IgeUiTextField: `caretBlink.period = 0` holds it shown). */
	readonly caretBlink = new IgeUiCaretBlink();
	/**
	 * The last thing the user did: a key (true), a press of the pointer (false), or nothing yet (undefined). Focus moved
	 * by a script shows its ring after a key or before anything's been done, as Chrome's does.
	 */
	_keyboardModality: boolean | undefined = undefined;
	/** HTML drag and drop from the pointer (draggable="true"). */
	readonly drag: IgeUiDragDrop = new IgeUiDragDrop(this);
	/** Time spent in each stage last frame (ms), and counts, for the stats overlay and tests. */
	stats = { style: 0, layout: 0, paint: 0, draw: 0, elements: 0, items: 0, drawCalls: 0, partial: 0, adopted: 0, kept: 0, partialPaint: 0 };
	/** Events the game shouldn't see (the UI took them): set as each is handled. */
	consumed = false;
	_detach?: () => void;

	constructor (opts: IgeUiRootOptions = {}) {
		this.host = opts.host ?? webUiHost();
		this.dpr = this.host.display.dpr();
		this.images.host = this.host;
		// (Events made by the UI are stamped with the host's clock)
		igeUiEventClock.now = () => this.host.time.now();
		this.document = new IgeUiDocument();
		(this.document as IgeUiDocument & { _uiRoot?: IgeUiRoot })._uiRoot = this;
		this.document.host = this;
		this.document.defaultView = this._view();
		const fonts = opts.fonts ?? this.host.text.fonts;
		this.layoutEngine = new IgeUiLayoutEngine(fonts);
		// <img> pictures: loaded as layout meets them, laid out at their size, the UI drawn again as each arrives
		this.layoutEngine.imageSizes = this.images.sizes;
		this.layoutEngine.requestImage = (src) => this.images.request(src);
		this.painter.imageSizes = this.images.sizes;
		this.painter.requestImage = (src) => this.images.request(src);
		this.painter.decorationMetrics = (f) => ({ ascent: this.layoutEngine.metrics(f).ascent, grid: this.layoutEngine.pixelGrid > 0 ? this.layoutEngine.pixelGrid : 1 });
		this.images.onLoad = (src, ok) => {
			this._layoutDirty = true;
			this._layoutAll = true;
			this._paintDirty = true;
			for (const img of this.document.querySelectorAll("img")) if (img.getAttribute("src") === src) img.dispatchEvent(new IgeUiEvent(ok ? "load" : "error"));
		};
		// The focused field's caret (blinking) or selection, over its text (dom/IgeUiTextField)
		this.painter.fieldPaint = textFieldPaint(this.layoutEngine, () => this.document.activeElement, this.caretBlink, () => this._now);
		if (opts.width !== undefined && opts.height !== undefined) this.screen = { w: opts.width, h: opts.height };
		else this.screen = this.host.display.size();
		this.animator.keyframes = this.styles.keyframes;
		this._updateViewport();
		// The engine's own bits: the tooltip and the default look of focus
		this.styles.addStylesheet(ENGINE_STYLES);
		// Fonts loading late: measured and drawn again
		this._fontsOff = this.host.text.onChange(() => this.fontsChanged());
	}

	get root (): IgeUiElement {
		return this.document.body;
	}

	/** The document's window stand-in: its observers, computed styles and frames. */
	_view (): IgeUiView {
		const root = this;
		return {
			MutationObserver: IgeUiMutationObserver as unknown as IgeUiView["MutationObserver"],
			ResizeObserver: IgeUiResizeObserver as unknown as IgeUiView["ResizeObserver"],
			getComputedStyle: (el: IgeUiElement) => root.computedStyle(el),
			requestAnimationFrame: (fn: (t: number) => void) => root.host.time.frame(fn),
			cancelAnimationFrame: (id: number) => root.host.time.cancelFrame(id),
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
			if (name === "display") {
				if (!el.isConnected) return "";
				// (Blockified, as a browser reports it: a flex or grid item, or something absolutely positioned)
				const d = styleValue(cs, "display");
				const pd = styleValue(el.parentNode?._computed, "display");
				const pos = styleValue(cs, "position");
				if (/^inline/.test(d) && (/(^|-)(flex|grid)$/.test(pd) || pos === "absolute" || pos === "fixed")) return BLOCKIFIED[d] ?? "block";
			}
			// (Moved where it's drawn, placeAt: as the transform that would have moved it)
			if (name === "transform" && el._place && b && b.el === el) {
				const m = this.layoutEngine.layoutBoxTransform(b)!;
				return `matrix(${m.map(cssNumber).join(", ")})`;
			}
			// (An SVG element's transform attribute is its transform when CSS gives it none)
			if (name === "transform" && styleValue(cs, "transform") === "none" && el.closest("svg")) {
				const m = svgTransform(el.getAttribute("transform"));
				if (m) return `matrix(${m.map(cssNumber).join(", ")})`;
			}
			return serializeComputed(name, cs, ctx, b, this.dpr, (u) => this.host.images.resolve(u));
		};
		return new Proxy({} as Record<string, string> & { getPropertyValue (name: string): string }, {
			get (_t, key) {
				if (key === "getPropertyValue") return (name: string) => read(name);
				if (typeof key !== "string") return undefined;
				return read(kebab(key));
			}
		});
	}

	/** Adds a stylesheet's text (later sheets win at equal specificity). Returns it, to replace later. */
	addStyleSheet (css: string): IgeCssStylesheet {
		const sheet = this.styles.addStylesheet(css);
		this._styleAll = true;
		return sheet;
	}

	/** New text for a stylesheet added before, in its place ("" takes it away; an edited <style> under a dev server). Returns the sheet now there. */
	replaceStyleSheet (old: IgeCssStylesheet, css: string): IgeCssStylesheet {
		const sheet = this.styles.replaceStylesheet(old, css);
		this._styleAll = true;
		this._layoutDirty = true;
		this._layoutAll = true;
		this._paintDirty = true;
		return sheet;
	}

	/** The fonts changed (loaded): measured again. */
	fontsChanged (): void {
		const f = this.layoutEngine.fonts as { reset? (): void };
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
		if (change === "tree" && tree?.morph) {
			// innerHTML reconciled: what it made is styled, where it changed is laid out again
			const m = tree.morph;
			for (const r of m.roots) this._markStyle(r);
			for (const p of m.parents) {
				this._relayout.add(p);
				this._markLayout(p);
				// (Children came or went: :empty and its kind may see it)
				if (this.styles.subjectOf(p, this.styles.siblingSubjects)) this._markStyle(p, true);
			}
			// (What :has() looks for, come or gone)
			if (this.styles.usesHas && [...m.added, ...m.removed].some((n) => n.nodeType === 1 && this._holdsHasArgument(n as IgeUiElement))) this._markHas(el);
			// (Children moving place: those :first-child, :nth-child and the like could be about, looked at again)
			for (const p of m.siblingParents) {
				for (const c of p.childNodes) if (c.nodeType === 1 && this.styles.subjectOf(c as IgeUiElement, this.styles.siblingSubjects)) this._markStyle(c as IgeUiElement, true);
			}
			// (An element made different, where a + or ~ looks: the siblings after it those could be about)
			if (this.styles.usesSiblings) {
				for (const [nn, o] of m.restarted) {
					if (!this.styles.subjectOf(nn, this.styles.combinatorAnchors, o._attrs.get("class"))) continue;
					for (let sib = nn.nextElementSibling; sib; sib = sib.nextElementSibling) if (this.styles.subjectOf(sib, this.styles.combinatorSubjects)) this._markStyle(sib, true);
				}
			}
			this._layoutDirty = true;
			this._paintDirty = true;
			return;
		}
		// (A class or inline style changed: laid out again only if its style turns out different where that matters (the
		// restyle marks it); a colour alone is only painted again)
		if (change !== "scroll" && change !== "paint" && change !== "state" && change !== "class" && change !== "style") {
			this._relayout.add(el);
			this._markLayout(el);
		}
		switch (change) {
			case "tree":
				this._markStyle(el);
				this._markHas(el);
				this._layoutDirty = true;
				break;
			case "class":
			case "attr":
				this._markStyle(el);
				// (A sibling's selectors can depend on it: the siblings after it that + and ~ could be about, each looked
				// at by itself; all under its parent when one of those reaches into a sibling's contents)
				// (Only when it is, or was, what a + or ~ looks at before them)
				if (this.styles.usesSiblings && el.parentNode && this.styles.subjectOf(el, this.styles.combinatorAnchors, el._styledClass)) {
					if (this.styles.siblingDeep) this._markStyle(el.parentNode);
					else for (let sib = el.nextElementSibling; sib; sib = sib.nextElementSibling) if (this.styles.subjectOf(sib, this.styles.combinatorSubjects)) this._markStyle(sib, true);
				}
				// (Only when it is, or was, what a :has() looks for)
				if (this.styles.subjectOf(el, this.styles.hasArguments, el._styledClass)) this._markHas(el);
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
				// (Text gone or come: :empty may see it)
				if (this.styles.subjectOf(el, this.styles.siblingSubjects)) this._markStyle(el, true);
				this._layoutDirty = true;
				break;
			case "scroll":
				this._paintDirty = true;
				break;
			case "paint":
				// (A canvas drawn on: its texture is uploaded again as it's drawn; its items are as they were)
				break;
		}
	}

	/** An element whose layout must be worked out again (and, so, each round it): the rest keep their boxes. */
	_markLayout (el: IgeUiElement): void {
		el._layoutDirty = true;
		this._layoutMarked.add(el);
		for (let p = el.parentNode; p && !p._childDirty; p = p.parentNode) p._childDirty = true;
	}

	/** The marks cleared once laid out. */
	_clearLayoutMarks (): void {
		// (Marks run unbroken from a marked element up to the root: _markLayout stops only at one already marked)
		for (const el of this._layoutMarked) {
			el._layoutDirty = false;
			el._childDirty = false;
			for (let p = el.parentNode; p && p._childDirty; p = p.parentNode) p._childDirty = false;
		}
		this._layoutMarked.clear();
	}

	_markStyle (el: IgeUiElement, selfOnly: boolean = false): void {
		if (selfOnly) this._styleSelf.add(el);
		else {
			el._styleDirty = true;
			this._styleRoots.add(el);
		}
		this._paintDirty = true;
	}

	/**
	 * A change in or under an element, when some selector uses :has(): what such a selector could be about (its
	 * subjects, anywhere: the changed element's ancestors among them) is looked at again, each by itself; one whose
	 * style turns out different is then restyled with all under it.
	 */
	_markHas (el: IgeUiElement): void {
		const st = this.styles;
		if (!st.usesHas) return;
		if (st.hasSubjects.has("*")) {
			for (let p = el.parentNode; p; p = p.parentNode) this._markStyle(p, true);
			return;
		}
		this._hasPending = true;
	}

	/** Whether an element, or something in it, is what some :has() looks for. */
	_holdsHasArgument (el: IgeUiElement): boolean {
		const st = this.styles;
		if (st.hasArguments.has("*") || st.subjectOf(el, st.hasArguments)) return true;
		const sel = [...st.hasArguments].join(", ");
		return !!sel && !!el.querySelector(sel);
	}

	/** The :has() subjects to look at again (see _markHas), found once a restyle. */
	_hasPending = false;

	removed (node: IgeUiNode): void {
		if (node.nodeType !== 1) return;
		const el = node as IgeUiElement;
		const was = this._hover.length;
		this._hover = this._hover.filter((h) => !el.contains(h));
		if (this._hover.length !== was) this._hoverStale = true;
		for (const [id, c] of this.document._captures) if (el.contains(c)) this.document._captures.delete(id);
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
			void Promise.resolve().then(() => {
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
			// (Ring or not: as asked; else a browser's way: after a key or before anything's been done, or for a field you type in)
			const typing = (el.localName === "input" && !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image"].includes(el.getAttribute("type") ?? "text")) || el.localName === "textarea";
			this._focusRing = opts?.focusVisible ?? ((this._keyboardModality ?? true) || typing);
			// (Shown while the page has the system's focus: a browser's window without it shows no focus at all)
			this._pageFocused = this.host.display.focused();
			if (this._pageFocused) {
				el._states.add("focus");
				if (this._focusRing) el._states.add("focus-visible");
			}
			this.changed(el, "state");
			el.dispatchEvent(new IgeUiEvent("focus"));
			el.dispatchEvent(new IgeUiEvent("focusin", { bubbles: true }));
			if (!opts?.preventScroll) this.scrollIntoView(el, "nearest");
		}
		this._syncTextInput();
	}

	/** Whether the focused element's ring shows (while the page has the system's focus), and whether the page had it. */
	_focusRing = false;
	_pageFocused = true;

	/** The page gained or lost the system's focus: the focused element's :focus (and ring) shown or taken away, as a browser's are. */
	_pageFocus (): void {
		const now = this.host.display.focused();
		if (now === this._pageFocused) return;
		this._pageFocused = now;
		const a = this.document.activeElement;
		if (!a) return;
		if (now) {
			a._states.add("focus");
			if (this._focusRing) a._states.add("focus-visible");
		} else {
			a._states.delete("focus");
			a._states.delete("focus-visible");
		}
		this.changed(a, "state");
	}

	/**
	 * Moves an element where it's drawn (and hit, and measured) by x, y CSS px, before its own transform, without
	 * restyling or laying anything out: only its run of items is painted again. For what moves every frame (labels
	 * kept over world points: IgeUiWorldAnchors) in place of an inline transform. null: back where it was.
	 */
	placeAt (el: IgeUiElement, x: number | null, y: number = 0): void {
		const had = el._place;
		if (x === null) {
			if (!had) return;
			el._place = undefined;
		} else {
			if (had && had[0] === x && had[1] === y) return;
			el._place = [x, y];
		}
		const b = el._box;
		if (!b || b.el !== el || !had !== !el._place) {
			// (Moved for the first time, or no longer: laid out again, so it's known to move: what's out of sight)
			this._relayout.add(el);
			this._markLayout(el);
			this._layoutDirty = true;
			this._paintDirty = true;
			return;
		}
		b.transform = this.layoutEngine.layoutBoxTransform(b);
		this._repaintEls.add(el);
	}

	/** A text field's selection set by code (select(), setSelectionRange()): drawn, and given to the hidden input if it's focused. */
	selectionChanged (el: IgeUiElement): void {
		if (el !== this.document.activeElement) return;
		const sel = el as unknown as { selectionStart?: number | null; selectionEnd?: number | null };
		this.host.textEntry.select(sel.selectionStart ?? 0, sel.selectionEnd ?? 0);
		this._paintDirty = true;
	}

	/**
	 * The focused element hidden (display: none, here or round it) or gone: nothing's focused, as a browser's focus
	 * fixup has it (quietly, as it is when the element's removed).
	 */
	_focusFixup (): void {
		const a = this.document.activeElement;
		if (!a) return;
		// (Disabled, as a browser's focus fixup has it too)
		let shown = a.isConnected && !a.isDisabled;
		for (let n: IgeUiElement | null = a; n && shown; n = n.parentNode) if (styleValue(n._computed, "display") === "none") shown = false;
		if (shown) return;
		a._states.delete("focus");
		a._states.delete("focus-visible");
		if (a.isConnected) this.changed(a, "state");
		this.document.activeElement = null;
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
		// Transforms on it and its ancestors (the box's corners through them; in 3D, as they're seen: IgeUiPerspective)
		const seen = projectedBox(b, x, y, w, h, (p) => this.painter._origin(p), (p) => ({ em: parseFloat(styleValue(p.style, "font-size")) || 16, rem: 16, vw: 0, vh: 0, cqw: 0, cqh: 0 }));
		const m = seen ? undefined : this._matrixOf(b);
		if (seen) [x, y, w, h] = seen;
		else if (m) {
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
		this._containerQueries();
	}

	/**
	 * Size containers laid out at a new size: their sizes given to the @container queries, and what's in them styled
	 * and laid out again, now (once: a query that changes its container's size settles next frame).
	 */
	_containerQueries (): void {
		const seen = this.layoutEngine.containersSeen;
		if (!seen.size) return;
		let moved = false;
		for (const [el, size] of seen) {
			const was = this.styles.containerSize.get(el);
			if (was && Math.abs(was.w - size.w) < 0.01 && Math.abs(was.h - size.h) < 0.01) continue;
			this.styles.containerSize.set(el, size);
			if (!this.styles.containerQueries) continue;
			for (const c of el.children) this._markStyle(c);
			moved = true;
		}
		seen.clear();
		if (!moved) return;
		this._restyle();
		if (this._layoutDirty) this._layout();
		seen.clear();
	}

	/** The frame's work: animations, styles, layout, the display list. */
	update (now: number = this.host.time.now()): void {
		this._now = now;
		// (SVG's own animations read this frame's time: render/IgeUiSvgSmil)
		svgClock.now = now;
		this._pageFocus();
		this._animate(now);
		this._restyle();
		const laidOut = this._layoutDirty;
		if (this._layoutDirty) this._layout();
		else if (this._resizeCheck) this._resized();
		this._containerQueries();
		this._momentumStep();
		this._tooltipStep(now);
		// (The focused field's caret showing or hiding as it blinks: its run of items painted again)
		const blinked = this.caretBlink.due(this.document.activeElement, now);
		if (blinked) this._repaintEls.add(blinked);
		if (!this._paintDirty && this._repaintEls.size) {
			// Only animations moved on: their runs of items painted again (all of it, if that can't be done)
			const t0 = this.host.time.now();
			if (this._repaintPart()) {
				this._hitsDirty = true;
				this.stats.paint = this.host.time.now() - t0;
				this.stats.items = this.items.length;
				this.stats.partialPaint++;
			} else this._paintDirty = true;
			this._repaintEls.clear();
		}
		this._repaintEls.clear();
		if (this._paintDirty) {
			const t0 = this.host.time.now();
			this.painter._scroll = (el) => (el ? [el._scrollLeft, el._scrollTop] : [0, 0]);
			this.items = this.rootBox ? this.painter.paint(this.rootBox) : [];
			// (What's under the pointer is worked out when it's asked: hitTest; the old list let go of meanwhile, so it
			// doesn't hold elements a redraw dropped)
			this._hitsDirty = true;
			this.hitList = [];
			this._paintDirty = false;
			// What's under a pointer that hasn't moved, when what's there changed (a list redrawn under it), as a browser does after layout
			if (this._pointerAt && (laidOut || this._hoverStale)) this._setHover(this.hitTest(this._pointerAt.clientX, this._pointerAt.clientY), this._pointerAt);
			this._hoverStale = false;
			this.stats.paint = this.host.time.now() - t0;
			this.stats.items = this.items.length;
			// (An SVG animating: drawn again next frame)
			if (svgAnimating()) this._paintDirty = true;
		}
	}

	/** Every animation settled (transitions done, one-shots at their end, endless ones held at their start), then drawn so. */
	settleAnimations (now: number = this._now || this.host.time.now()): void {
		this.flush();
		if (this._pointerAt && this._hoverStale) {
			// (What's under a pointer that hasn't moved, after a redraw: hovered now, and its :hover styles settled too)
			this.update(now);
			this.flush();
		}
		this.animator.settle(now);
		this._animate(now);
		// (A focused field's caret shown, its blink started again)
		this.caretBlink.restart();
		this._paintDirty = true;
	}

	/** Animated elements whose look changed (only): see _repaintPart. */
	_repaintEls = new Set<IgeUiElement>();
	/** The hit list is out of date (rebuilt when a hit test asks). */
	_hitsDirty = true;

	/**
	 * Paints again just the runs of items (IgeUiPainter.groups) that animated elements are in; false when that can't
	 * be done (an element not in a run, or one that's a run itself and has become a stacking context or stopped being one).
	 */
	_repaintPart (): boolean {
		const p = this.painter;
		const runs = new Set<IgeUiBox>();
		for (const el of this._repaintEls) {
			const b = el._box;
			if (!b || !el.isConnected) continue;
			let g: IgeUiBox | null = b;
			while (g && !p.groups.has(g)) g = g.parent;
			if (!g) return false;
			if (g === b && p.groups.get(b)!.stacking !== p._isStacking(b)) return false;
			runs.add(g);
		}
		const inside = (g: IgeUiBox) => {
			for (let q = g.parent; q; q = q.parent) if (runs.has(q)) return true;
			return false;
		};
		for (const g of [...runs].filter((r) => !inside(r))) if (!p.repaintGroup(g)) return false;
		return true;
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
						this._markLayout(el);
						break;
					}
				}
			}
			// (An inherited property moving (color, visibility): what's in it is restyled to inherit it, as a browser's is)
			if (prev) for (const k of INHERITED) {
				if (prev[k] === cur[k]) continue;
				for (const c of el.children) this._markStyle(c);
				break;
			}
			el._computed = cur;
			if (el._box) el._box.style = cur;
		}
		// Transforms worked out again (those that just stopped too): a box the layout keeps as it was keeps the one set here
		if (this.rootBox) {
			for (const el of moving) {
				const b = el._box;
				if (!b || b.el !== el || b.pseudo) continue;
				const tf = styleValue(b.style, "transform");
				b.transform = tf === "none" ? undefined : this.layoutEngine.layoutBoxTransform(b);
				// (Paint-only changes: only the runs of items they're painted in are painted again)
				if (!layout) this._repaintEls.add(el);
			}
		}
		if (layout || !this.rootBox) {
			if (layout) this._layoutDirty = true;
			this._paintDirty = true;
		}
	}

	_restyle (): void {
		if (this._hasPending && !this._styleAll) {
			// Every element a :has() selector could be about, each looked at by itself
			this._hasPending = false;
			const keys = [...this.styles.hasSubjects].filter((k) => k !== "*");
			if (keys.length) for (const e of this.document.querySelectorAll(keys.join(", "))) this._styleSelf.add(e);
		}
		this._hasPending = false;
		if (this._styleSelf.size && !this._styleAll) {
			for (const e of this._styleSelf) {
				if (!e.isConnected || e._styleDirty || !e._computed) continue;
				const parent = e.parentNode?._computed;
				const was = this.animator._base.get(e) ?? e._computed;
				const pseudo = e._pseudo;
				const next = this.styles.compute(e, parent);
				if (!sameStyle(was, next) || !samePseudo(pseudo, e._pseudo)) {
					e._styleDirty = true;
					this._styleRoots.add(e);
				} else e._pseudo = pseudo;
			}
		}
		this._styleSelf.clear();
		if (!this._styleAll && !this._styleRoots.size) return;
		const t0 = this.host.time.now();
		let count = 0, adopted = 0;
		const now = this._now;
		const visit = (el: IgeUiElement, parent: IgeUiComputedStyle | undefined, force: boolean) => {
			if (force || el._styleDirty || !el._computed) {
				const prev = el._computed;
				let keepBox = false;
				const a = el._adopt;
				el._adopt = undefined;
				let next: IgeUiComputedStyle;
				if (a && !this._styleAll && this._canAdopt(a, parent, el)) {
					// Made by innerHTML just like the element it replaced: that one's style, as it was worked out (and
					// its box, if all in it is taken over too: IgeUiLayoutEngine._reusable)
					next = this.animator._base.get(a.from) ?? a.from._computed!;
					el._pseudo = a.from._pseudo;
					// (Its box too, if all in it is just as it was, text and all)
					if (a.subtreeSame) el._reuseFrom = a.from;
					adopted++;
				} else {
					const pseudo = el._pseudo;
					next = this.styles.compute(el, parent);
					// (The same as before, or as the element it replaced: the same object kept, so what's under it can be
					// seen not to need working out)
					const was = this.animator._base.get(el) ?? prev ?? (a?.from._computed ? this.animator._base.get(a.from) ?? a.from._computed : undefined);
					if (was && sameStyle(was, next)) next = was;
					else if (was && was === prev && paintOnly(was, next) && samePseudo(pseudo, el._pseudo) && el._box?.el === el && !el._box.pseudo) {
						// Only how it looks (a colour, inherited from an animation say): its box kept, given the new style
						keepBox = true;
					} else {
						this._markLayout(el);
						this._relayout.add(el);
					}
				}
				el._styledParent = parent;
				el._styledVersion = this.styles.version;
				el._styledClass = el._attrs.get("class");
				el._computed = this.animator.restyled(el, prev, next, now);
				if (keepBox && el._box) el._box.style = el._computed;
				el._styleDirty = false;
				count++;
				force = true;
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
			const set = this._styleRoots;
			const within = (r: IgeUiElement) => {
				for (let p = r.parentNode; p; p = p.parentNode) if (set.has(p)) return true;
				return false;
			};
			const roots = [...set].filter((r) => r.isConnected && !within(r));
			for (const r of roots) visit(r, r.parentNode?._computed, true);
		}
		this._styleAll = false;
		this._styleRoots.clear();
		this._layoutDirty = true;
		this._paintDirty = true;
		this.stats.style = this.host.time.now() - t0;
		this.stats.elements = count;
		this.stats.adopted = adopted;
	}

	/**
	 * Whether an element innerHTML made in place of one just like it can take that one's style: worked out under
	 * the same parent style and stylesheets, not hanging on a state (hover, focus), and its siblings alike enough
	 * for what the stylesheets' sibling and :has() selectors could see.
	 */
	_canAdopt (a: IgeUiAdoption, parent: IgeUiComputedStyle | undefined, el: IgeUiElement): boolean {
		const o = a.from;
		if (!o._computed || a.stateful || o._styledParent !== parent || o._styledVersion !== this.styles.version) return false;
		// (Still just like it: a script may have changed it since innerHTML made it)
		if (!igeUiSameStart(o, el)) return false;
		// (Selectors that look at siblings, or into the tree with :has(), and could be about this element)
		if (this.styles.subjectOf(el, this.styles.siblingSubjects) && !(a.prefixSame && a.countSame)) return false;
		if (this.styles.subjectOf(el, this.styles.hasSubjects)) return false;
		return true;
	}

	_layout (): void {
		const t0 = this.host.time.now();
		const v = this.viewport;
		this.layoutEngine.viewport = v;
		this.layoutEngine.pixelGrid = this.scale * this.dpr;
		this.document._pixelGrid = this.scale * this.dpr;
		// (Boxes that still stand are kept, unless everything must be laid out afresh)
		this.layoutEngine.reuse = !this._layoutAll && !!this.rootBox;
		this.layoutEngine.kept = 0;
		const partial = !this._layoutAll && this.rootBox ? this._layoutPart() : undefined;
		if (!partial) this.rootBox = this.layoutEngine.layout(this.document.documentElement, v.w, v.h);
		this._layoutAll = false;
		this._relayout.clear();
		this._clearLayoutMarks();
		this.stats.partial = partial ? partial.length : 0;
		this.stats.kept = this.layoutEngine.kept;
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
		this.stats.layout = this.host.time.now() - t0;
		// (What's under a pointer that hasn't moved is looked at again after the paint, whoever asked for this layout)
		this._hoverStale = true;
		this._focusFixup();
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
		if (due.length) void Promise.resolve().then(() => {
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
		// Every box (painted or not: transparent boxes still take the pointer), in the order they're painted: a box,
		// its positioned boxes with negative z, what's in its flow, then its positioned boxes by z and the document's
		// order (as IgeUiPainter._contextInner paints them), so what's drawn on top is hit
		const scrollOf = (el: IgeUiElement | null): [number, number] => (el ? [el._scrollLeft, el._scrollTop] : [0, 0]);
		type M = [number, number, number, number, number, number];
		type At = { clip: HitEntry["clip"]; dx: number; dy: number; m?: M };
		const painter = this.painter;
		/** Where a box is: fixed to the UI, held by sticky, its transform. */
		const enter = (b: IgeUiBox, at: At): At => {
			let { clip, dx, dy, m } = at;
			if (b.position === "fixed") {
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
				const [ox, oy] = painter._origin(b);
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
			return { clip, dx, dy, m };
		};
		/** A box's own entry. */
		const entry = (b: IgeUiBox, at: At) => {
			const el = b.el;
			if (!el || b.pseudo || styleValue(b.style, "visibility") === "hidden") return;
			const inv = at.m ? invert(at.m) : undefined;
			if (b.inlineRects) for (const r of b.inlineRects) list.push({ el, x: r.x + at.dx, y: r.y + at.dy, w: r.w, h: r.h, clip: at.clip, inv });
			else list.push({ el, x: b.ax + at.dx, y: b.ay + at.dy, w: b.borderW, h: b.borderH, clip: at.clip, inv });
		};
		/** Where what's in a box is: its clip and scrolling. */
		const inside = (b: IgeUiBox, at: At): At => {
			const el = b.el;
			const ox = styleValue(b.style, "overflow-x"), oy = styleValue(b.style, "overflow-y");
			if ((ox === "visible" && oy === "visible") || !el || b.pseudo) return at;
			const x0 = b.ax + at.dx + b.borderLeft, y0 = b.ay + at.dy + b.borderTop;
			const nc: [number, number, number, number] = [x0, y0, x0 + b.borderW - b.borderLeft - b.borderRight, y0 + b.borderH - b.borderTop - b.borderBottom];
			const c = at.clip;
			return { clip: c ? [Math.max(c[0], nc[0]), Math.max(c[1], nc[1]), Math.min(c[2], nc[2]), Math.min(c[3], nc[3])] : nc, dx: at.dx - el._scrollLeft, dy: at.dy - el._scrollTop, m: at.m };
		};
		const context = (b: IgeUiBox, from: At) => {
			const at = enter(b, from);
			entry(b, at);
			const positioned: { box: IgeUiBox; at: At; z: number; order: number }[] = [];
			const collect = (box: IgeUiBox, here: At) => {
				for (const child of box.children) {
					if (child.position !== "static" || painter._isStacking(child)) {
						positioned.push({ box: child, at: here, z: child.zIndex ?? 0, order: positioned.length });
						continue;
					}
					const ca = enter(child, here);
					entry(child, ca);
					collect(child, inside(child, ca));
				}
			};
			const start = list.length;
			collect(b, inside(b, at));
			positioned.sort((p, q) => painter.positionedOrder(p, q));
			const neg = positioned.filter((p) => p.z < 0);
			if (neg.length) {
				// (Under what's in its flow)
				const flow = list.splice(start);
				for (const p of neg) context(p.box, p.at);
				list.push(...flow);
			}
			for (const p of positioned) if (p.z >= 0) context(p.box, p.at);
		};
		if (this.rootBox) context(this.rootBox, { clip: null, dx: 0, dy: 0 });
		this.hitList = list;
	}

	/** The element under a point (client CSS px), honouring pointer-events and clipping; null over nothing. */
	hitTest (clientX: number, clientY: number): IgeUiElement | null {
		this.update(this._now || undefined);
		if (this._hitsDirty) {
			this._hits();
			this._hitsDirty = false;
		}
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
			this.atlas ??= new IgeUiSdfAtlas(this.host.surface);
			this.gl = new IgeUiGlRenderer(gl, this.atlas);
		} else if (this.gl.gl !== gl) this.gl.restore(gl);
		// (The look's tunings, off by default)
		this.gl.textWeight = this.look.textWeight;
		this.gl.textGamma = this.look.textGamma;
		this.gl.textMinSize = this.look.textMinSize;
		this.gl.backdrop = this.look.backdrop;
		const t0 = this.host.time.now();
		const calls = this.gl.draw(this.drag.withGhost(this.items), width, height, this.scale * dpr, [(this.safe.x + this.pageOffset.x) * dpr, (this.safe.y + this.pageOffset.y) * dpr]);
		this.stats.draw = this.host.time.now() - t0;
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
		// (A stencil for clips of any shape: IgeUiStencilClip)
		const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, stencil: true, preserveDrawingBuffer: !!opts.preserve });
		if (!gl) throw new Error("IgeUiRoot: no WebGL 2 for the canvas");
		let frame = 0;
		const draw = () => {
			const dpr = this.host.display.dpr();
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
			frame = this.host.time.frame(tick);
		};
		if (opts.loop !== false) frame = this.host.time.frame(tick);
		return { draw, stop: () => this.host.time.cancelFrame(frame) };
	}

	/**
	 * Tunings of how it's drawn, all off by default (the decisions' comparisons): text's weight (device px its edge is
	 * moved out) and gamma (its edge's ramp bent), on text `textMinSize` CSS px and up; and backdrop-filter blur:
	 * "panel" (each panel's from what's under it, the UI too, as a browser's), "shared" (panels asking for the same blur
	 * share one of the game) or "off".
	 */
	readonly look: { textWeight: number; textGamma: number; textMinSize: number; backdrop: "panel" | "shared" | "off" } = { textWeight: 0, textGamma: 1, textMinSize: 0, backdrop: "panel" };

	/**
	 * The game's own scrollbars, whatever the CSS says (off by default): every scrollbar `width` CSS px, its thumb and
	 * track in these colours (CSS colours); null, back to the CSS's (and the browser's look).
	 */
	gameScrollbars (opts: { width: number; thumb: string; track?: string } | null): void {
		this.layoutEngine.scrollbarOverride = opts?.width;
		const thumb = opts ? parseColor(opts.thumb) : undefined;
		this.painter.scrollbarLook = opts && thumb ? { thumb, track: opts.track ? parseColor(opts.track) : undefined } : undefined;
		this._layoutAll = true;
		this._layoutDirty = true;
		this._paintDirty = true;
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
	attachInput (target?: EventTarget): () => void {
		this._detach = igeUiAttachWebInput(this, target);
		return this._detach;
	}

	/**
	 * An input event from the host (a pointer, the mouse's own, the wheel, a key): hit-tested and dispatched in the
	 * UI. Returns whether the UI took it (the game shouldn't see it: `stop`) and cancelled its default (`prevent`).
	 * The web's events come through attachInput; a native host calls this with its own.
	 */
	input (e: IgeUiInputEvent): IgeUiInputResult {
		const result: IgeUiInputResult = { stop: false, prevent: !!e.defaultPrevented };
		// (What the handlers read of an event: its fields, and the calls that stop and cancel it)
		const ev = {
			button: 0, buttons: 0, pointerId: 1, pointerType: "mouse", isPrimary: true, detail: 0, clientX: 0, clientY: 0, deltaX: 0, deltaY: 0, deltaMode: 0, key: "", code: "",
			shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, ...e,
			stopImmediatePropagation: () => void (result.stop = true),
			stopPropagation: () => void (result.stop = true),
			preventDefault: () => void (result.prevent = true),
			get defaultPrevented () {
				return result.prevent;
			}
		};
		switch (e.type) {
			case "pointermove":
			case "pointerdown":
			case "pointerup":
			case "pointercancel":
				this._pointer(e.type, ev as unknown as PointerEvent);
				break;
			case "pointerout":
				// (Out of the window: nothing's under the pointer any more)
				if (e.relatedTarget) break;
				this._pointerAt = undefined;
				this._setHover(null, ev as unknown as PointerEvent);
				break;
			case "click":
			case "mousedown":
			case "mouseup":
				this._swallow(ev as unknown as MouseEvent);
				break;
			case "contextmenu":
				this._mouse("contextmenu", ev as unknown as MouseEvent);
				break;
			case "wheel":
				this._wheel(ev as unknown as WheelEvent);
				break;
			case "keydown":
			case "keyup":
				this._key(e.type, ev as unknown as KeyboardEvent);
				break;
		}
		return result;
	}

	_event (type: string, e: MouseEvent | PointerEvent | WheelEvent, extra: Record<string, unknown> = {}): IgeUiEvent {
		// (Mouse events (click, mousedown, wheel...) are on whole pixels, as a browser's are; pointer events keep the fractions)
		const whole = !type.startsWith("pointer");
		return new IgeUiEvent(type, {
			bubbles: !["mouseenter", "mouseleave", "pointerenter", "pointerleave"].includes(type), cancelable: true,
			clientX: whole ? Math.floor(e.clientX) : e.clientX, clientY: whole ? Math.floor(e.clientY) : e.clientY, button: e.button, buttons: e.buttons, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey,
			pointerId: (e as PointerEvent).pointerId ?? 1, pointerType: (e as PointerEvent).pointerType ?? "mouse", isPrimary: (e as PointerEvent).isPrimary ?? true, detail: e.detail,
			...(e.timeStamp !== undefined ? { timeStamp: e.timeStamp } : {}), ...extra
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
		// (A drag under way has the pointer: IgeUiDragDrop)
		if ((type === "pointermove" && this.drag.move(e)) || ((type === "pointerup" || type === "pointercancel") && this.drag.up(e, type === "pointercancel"))) {
			e.stopImmediatePropagation();
			return;
		}
		// Pointers at once, each its own (input/IgeUiPointers.ts)
		const id = e.pointerId ?? 1;
		const touch = e.pointerType === "touch", primary = e.isPrimary !== false;
		const ends = type === "pointerup" || type === "pointercancel";
		// (A touch that landed on the game stays the game's wherever it goes, as a browser keeps a touch where it landed)
		if (this._outside.has(id)) {
			if (ends) this._outside.delete(id);
			return;
		}
		// A captured pointer (setPointerCapture; a touch, where it landed) goes to its element wherever it is, until it's let go
		const captures = this.document._captures;
		const captured = type !== "pointerdown" ? captures.get(id) : undefined;
		const hit = this.hitTest(e.clientX, e.clientY);
		const t = captured?.isConnected ? captured : hit;
		if (ends) captures.delete(id);
		if (type === "pointermove") {
			const d = this._presses.get(id);
			// Hover follows the mouse (or a pen); a finger's is where it pressed
			if (!touch) {
				this._pointerAt = e;
				this._setHover(t, e);
			}
			if (d) pressMoved(d, e.clientX, e.clientY);
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
				// (And the mouse's own move, as a browser sends it after the pointer's: not for a touch, nor a cancelled press)
				if (!touch && d?.compat !== false) to.dispatchEvent(this._event("mousemove", e));
				e.stopImmediatePropagation();
			}
			return;
		}
		if (type === "pointerdown") {
			this._momentum = undefined;
			this._keyboardModality = false;
			if (!t) {
				if (touch) this._outside.add(id);
				// (Pressed outside the UI (the game behind it): the UI's focus goes, as a page's does)
				if (primary && this.document.activeElement) this.focus(null);
				return;
			}
			// (A finger's hover: where it pressed, from its press on, as a browser's)
			if (touch && primary) this._setHover(t, e);
			const d: IgeUiPress = { el: t, x: e.clientX, y: e.clientY, time: e.timeStamp, pointerType: e.pointerType, moved: 0, scroller: touch ? touchScroller(t) : undefined };
			this._presses.set(id, d);
			if (touch) captures.set(id, t);
			for (const n of pressChain(d)) n._states.add("active");
			if (this.styles.stateDependent.has("active")) this.changed(t, "state");
			const ev = this._event(type, e);
			t.dispatchEvent(ev);
			// The mouse's own events follow the primary pointer, unless its press was cancelled (as a browser has it: a
			// pointerdown's preventDefault keeps them back, and with them the focus a press gives); a finger's come when
			// it lifts from a tap (below)
			d.compat = primary && !ev.defaultPrevented;
			const md = d.compat && !touch ? this._event("mousedown", e) : undefined;
			if (md) t.dispatchEvent(md);
			if (!ev.defaultPrevented) this.drag.down(t, e);
			if (md && !md.defaultPrevented) this._pressFocus(t);
			e.stopImmediatePropagation();
			if (ev.defaultPrevented) e.preventDefault();
			this._hideTooltip();
			return;
		}
		if (ends) {
			const d = this._presses.get(id);
			this._presses.delete(id);
			this._unpress(d);
			if (d?.dragging && d.scroller) {
				// Momentum
				this._momentum = { el: d.scroller, vx: 0, vy: (d.vy ?? 0) * 16 };
				e.stopImmediatePropagation();
				return;
			}
			const target = t ?? d?.el;
			if (!target) return;
			target.dispatchEvent(this._event(type, e));
			const tap = type === "pointerup" && !!d && !!t && primary && pressClicks(d);
			if (touch) {
				// A finger's tap: the mouse's own press and lift now, and the focus a press gives
				if (tap && d!.compat) {
					const md = this._event("mousedown", e);
					t!.dispatchEvent(md);
					if (!md.defaultPrevented) this._pressFocus(t!);
					t!.dispatchEvent(this._event("mouseup", e));
				}
			} else if (primary && (d ? d.compat : true)) target.dispatchEvent(this._event("mouseup", e));
			if (tap && d && t) {
				// A click on what was pressed and released (their nearest common ancestor)
				let common: IgeUiElement | null = t;
				while (common && !common.contains(d.el)) common = common.parentNode;
				if (common && !(e.button === 2)) {
					const disabled = common.closest("button:disabled, input:disabled");
					if (!disabled) common.dispatchEvent(this._event("click", e, { detail: 1 }));
				}
				// (A field tapped: its hidden input focused again as the finger lifts, where a phone shows its keyboard for
				// a focus that comes with the tap (iOS doesn't for one made as it's pressed))
				if (touch && this.document.activeElement === t.closest("input, textarea")) this.host.textEntry.reopen();
			}
			e.stopImmediatePropagation();
		}
	}

	/** A press's focus: to what was pressed (a field, a button), or away. */
	_pressFocus (t: IgeUiElement): void {
		const focusable = t.closest("input, textarea, select, button, [tabindex]");
		if (focusable && focusable.tabIndex >= 0 && !focusable.isDisabled) this.focus(focusable, { preventScroll: true, focusVisible: false });
		else if (this.document.activeElement && !this.document.activeElement.contains(t)) this.focus(null);
	}

	/** A press over: :active off what it held, unless another pointer still holds it. */
	_unpress (d: IgeUiPress | undefined): void {
		if (!d) return;
		const held = new Set<IgeUiElement>();
		for (const o of this._presses.values()) for (const n of pressChain(o)) held.add(n);
		for (const n of pressChain(d)) if (!held.has(n)) n._states.delete("active");
		if (this.styles.stateDependent.has("active")) this.changed(d.el, "state");
	}

	/** A press that's become a drag (IgeUiDragDrop): over with no click, its :active states dropped, pointercancel sent (no id: the mouse's and pens'). */
	endPress (pointerId?: number): void {
		for (const [id, d] of [...this._presses]) {
			if (pointerId !== undefined ? id !== pointerId : d.pointerType === "touch") continue;
			this._presses.delete(id);
			this.document._captures.delete(id);
			this._unpress(d);
			d.el.dispatchEvent(new IgeUiEvent("pointercancel", { bubbles: true, pointerType: d.pointerType, pointerId: id }));
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
		if (type === "keydown" && e.key === "Escape" && this.drag.cancel()) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		// (A person's key, not one a script sent: as a browser counts them)
		if (type === "keydown" && e.isTrusted !== false && !e.metaKey && !e.ctrlKey && !e.altKey) this._keyboardModality = true;
		const a = this.document.activeElement;
		if (!a) return;
		const ev = new IgeUiEvent(type, { bubbles: true, cancelable: true, key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, repeat: e.repeat });
		a.dispatchEvent(ev);
		// (What the focused element took (its handler cancelled it) is cancelled)
		if (ev.defaultPrevented) e.preventDefault();
		// A text field's keys aren't kept from the page: they reach the window's listeners as a browser's do, aimed at
		// the field (the host's text input stands in for it: IgeUiWebHost), and a game's own handlers leave keys aimed
		// at a field alone. Another form control's (a slider, a checkbox) are: nothing on the page stands in for it, so
		// the page's listeners couldn't tell they were aimed at a field
		if ((a.localName === "input" || a.localName === "textarea") && !typesThroughHost(a)) e.stopImmediatePropagation();
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
		const a = this.document.activeElement;
		if (!a || !typesThroughHost(a)) {
			this.host.textEntry.focus(null, this._typing);
			return;
		}
		const sel = a as unknown as { selectionStart?: number | null; selectionEnd?: number | null };
		const field: IgeUiTextEntryField = {
			el: a,
			value: a.value ?? "",
			selectionStart: sel.selectionStart ?? null,
			selectionEnd: sel.selectionEnd ?? null,
			type: a.getAttribute("type") === "password" ? "password" : "text",
			rect: () => {
				const r = a.getBoundingClientRect();
				return { x: r.left, y: r.top, w: r.width, h: r.height };
			}
		};
		// (Typing goes to it: the host's text input over the field, with the field's value and selection)
		this.host.textEntry.focus(field, this._typing);
	}

	/** What the host's text input tells the focused field (IgeUiHost.textEntry). */
	readonly _typing: IgeUiTextEntryEvents = {
		input: (value) => {
			const el = this.document.activeElement;
			if (!el) return;
			el.value = value;
			el.dispatchEvent(new IgeUiEvent("input", { bubbles: true }));
		},
		change: () => this.document.activeElement?.dispatchEvent(new IgeUiEvent("change", { bubbles: true })),
		key: (e) => {
			const el = this.document.activeElement;
			if (!el) return false;
			const ev = new IgeUiEvent("keydown", { bubbles: true, cancelable: true, key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey });
			el.dispatchEvent(ev);
			return ev.defaultPrevented;
		},
		selection: (start, end) => {
			const el = this.document.activeElement;
			if (!isTextField(el)) return;
			const sel = el as unknown as { selectionStart?: number | null; selectionEnd?: number | null };
			sel.selectionStart = start;
			sel.selectionEnd = end;
			this._paintDirty = true;
		},
		composition: (range) => {
			const el = this.document.activeElement;
			if (!isTextField(el)) return;
			el._composition = range ?? undefined;
			this._paintDirty = true;
		},
		blur: () => {
			// (The platform took the typing (a click outside the UI): the field loses the focus. Focus the UI moved on
			// itself (a button pressed, which takes the typing away as it goes) stays where it went)
			const a = this.document.activeElement;
			if (a && (a.localName === "input" || a.localName === "textarea")) this.focus(null);
		}
	};

	destroy (): void {
		this._detach?.();
		this._fontsOff?.();
		this.host.textEntry.focus(null, this._typing);
		this.gl?.destroy();
	}

	/** Stops following the host's fonts (destroy). */
	_fontsOff?: () => void;
}

/** Whether a focused element types through the host's text input (IgeUiHost.textEntry: the web's hidden input). */
function typesThroughHost (a: IgeUiElement): boolean {
	return (a.localName === "input" || a.localName === "textarea") && !["range", "checkbox", "radio", "button"].includes(a.getAttribute("type") ?? "text");
}

function mul (m: [number, number, number, number, number, number], n: [number, number, number, number, number, number]): [number, number, number, number, number, number] {
	return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}

/** Properties that change only how a box looks, not where anything is. */
const PAINT_ONLY = new Set([
	"color", "background-color", "background-image", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
	"outline-color", "box-shadow", "text-shadow", "opacity", "visibility", "fill", "stroke", "fill-opacity", "stroke-opacity", "caret-color",
	"cursor", "pointer-events", "text-decoration-color"
]);

/** Whether two styles differ only in how a box looks (and custom properties, whose uses would differ themselves). */
function paintOnly (a: IgeUiComputedStyle, b: IgeUiComputedStyle): boolean {
	for (const k in a) if (a[k] !== b[k] && !PAINT_ONLY.has(k) && !k.startsWith("--")) return false;
	for (const k in b) if (!(k in a) && !PAINT_ONLY.has(k) && !k.startsWith("--")) return false;
	return true;
}

/** Whether an element's ::before, ::after and ::placeholder styles say the same. */
function samePseudo (a: IgeUiElement["_pseudo"], b: IgeUiElement["_pseudo"]): boolean {
	if (a === b) return true;
	return sameStyle(a?.before, b?.before) && sameStyle(a?.after, b?.after) && sameStyle(a?.placeholder, b?.placeholder);
}

/** Whether two computed styles say the same (every property and custom property). */
function sameStyle (a: IgeUiComputedStyle | undefined, b: IgeUiComputedStyle | undefined): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	let n = 0;
	for (const k in a) {
		if (a[k] !== b[k]) return false;
		n++;
	}
	for (const _k in b) n--;
	return n === 0;
}

/** Inline-level displays and what they become for a flex or grid item, or a box out of the flow. */
const BLOCKIFIED: Record<string, string> = { inline: "block", "inline-block": "block", "inline-flex": "flex", "inline-grid": "grid", "inline-table": "table" };

function invert (m: [number, number, number, number, number, number]): [number, number, number, number, number, number] | undefined {
	const det = m[0] * m[3] - m[1] * m[2];
	if (Math.abs(det) < 1e-12) return undefined;
	const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
	return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

function apply (m: [number, number, number, number, number, number], x: number, y: number): [number, number] {
	return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

const ENGINE_STYLES = `
.igeTooltip { position: fixed; z-index: 100000; max-width: 260px; padding: 5px 9px; background: rgba(4, 12, 20, 0.95); border: 1px solid rgba(95, 227, 255, 0.4); color: #d7ecf5; font-size: 12px; pointer-events: none; white-space: normal; }
`;
