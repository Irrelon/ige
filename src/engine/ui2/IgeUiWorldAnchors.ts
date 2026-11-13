/**
 * Nodes anchored to the world: name tags, waypoint labels, readouts and
 * prompts kept over a world point (an entity, a fixed spot, or one read each
 * frame), positioned once per frame through each view's camera and clipped
 * to that view, so in split screen a label never spills into the next view.
 *
 * It works on the engine's document UI (ui2: an IgeUiRoot's elements) and,
 * for a page that still draws its UI in HTML, on page elements the same way:
 * only the DOM's style, createElement and appendChild are used.
 *
 * Each view gets a clipping layer (made in the anchors' parent on demand)
 * over its rectangle of the screen. Inside a layer, distances are screen CSS
 * pixels from the view's top-left corner, whatever the UI's scale: on the
 * engine's UI, which draws at a scale and inside a safe area (`space`), the
 * layer undoes both, so a label 30 px below its ship is 30 px below it on
 * any screen. Text that should grow with the UI's scale sizes itself by it
 * (`layerChanged` is told the scale, to set a CSS variable say).
 *
 * The frame's work (`update`) runs just before the UI is drawn: by the
 * overlay `igeUiWorldOverlay()` makes for IgeWebGlRenderer.addOverlay (it
 * places the anchors, then draws the UI), or by whoever draws the UI. An
 * anchor out of its view (behind the camera, or past the view's edge by
 * more than its margin) is hidden with `visibility`, leaving `display` to
 * the game.
 *
 * Geometry drawn between points (a line to a target, an arrow held at the
 * view's edge) asks `project()` for points in a layer's own pixels, or
 * places a node at a screen point with `anchor.place()`.
 *
 * @example #A name tag below every ship, in every split-screen view
 *     const anchors = new IgeUiWorldAnchors(igeUiRendererProjector(renderer), ui.root, { space: igeUiSpace(ui) });
 *     renderer.addOverlay(igeUiWorldOverlay(ui, anchors));
 *     const tag = ui.document.createElement("div");
 *     tag.className = "tag";
 *     tag.textContent = "Bea";
 *     anchors.anchor(tag, { entity: ship, screenOffset: { x: 0, y: 30 }, align: "translateX(-50%)" });
 */
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import type { IgeWebGlOverlay, IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import type { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { ige } from "@/engine/instance";

export interface IgeUiVec3 {
	x: number;
	y: number;
	z: number;
}

/** A view's rectangle, or a projected point: screen CSS px from the canvas's top-left. */
export interface IgeUiWorldRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface IgeUiWorldPoint {
	x: number;
	y: number;
	/** In front of the camera and inside the view. */
	visible: boolean;
}

/** How world points reach the screen: the views there are, where each is, and a point through each one's camera. */
export interface IgeUiWorldProjector<V = unknown> {
	views (): V[];
	rect (view: V): IgeUiWorldRect;
	/** A world point on the screen (CSS px from the canvas's top-left); null when it can't be (no camera, behind it). */
	project (view: V, x: number, y: number, z: number): IgeUiWorldPoint | null;
}

/** Where the UI is drawn: its scale and its safe area (CSS px in from the left and top). The page's UI: 1, 0, 0. */
export interface IgeUiWorldSpace {
	scale: number;
	safeX: number;
	safeY: number;
}

/** The elements anchors move: an engine element or a page one (the same few DOM calls). */
export interface IgeUiAnchorElement {
	style: { cssText: string; setProperty (name: string, value: string | null): void };
	ownerDocument: unknown;
	parentNode: unknown;
	appendChild (child: never): unknown;
	remove (): void;
}

export interface IgeUiWorldAnchorOptions<V = unknown> {
	/** The view it's shown in (default: the projector's first). */
	view?: V;
	/** Follow an entity (hidden while the entity's hidden or gone)... */
	entity?: IgeEntity;
	/** ...or stay at a world point (also set later with `at()`)... */
	position?: IgeUiVec3;
	/** ...or a point read every frame (null: hidden). */
	follow?: () => IgeUiVec3 | null | undefined;
	/** World offset from that point (e.g. above a head). */
	offset?: IgeUiVec3;
	/** Screen offset after projecting (CSS px: below a ship's middle, say). */
	screenOffset?: { x: number; y: number };
	/** The transform after the move, about the node's own box (default "translate(-50%, -50%)": centred on the point). */
	align?: string;
	/** How far past the view's edge (CSS px) it may be and still show (default 0: hidden once its point leaves the view). */
	margin?: number;
	/** Put on whole pixels (crisp text), not tenths. */
	snap?: boolean;
	/** Each frame it's placed (shown): the screen point (in the layer's px). */
	update? (el: IgeUiAnchorElement, at: { x: number; y: number }): void;
}

/** One anchored node. */
export class IgeUiWorldAnchor<V = unknown> {
	readonly el: IgeUiAnchorElement;
	readonly options: IgeUiWorldAnchorOptions<V>;
	/** Where it was put last frame (layer px), and whether it showed. */
	screen = { x: 0, y: 0 };
	shown = false;
	_owner: IgeUiWorldAnchors<V>;
	_point?: IgeUiVec3;
	/** A screen point set directly (`place()`): no projecting. */
	_placed?: { x: number; y: number };
	_hidden = false;
	_lastTransform = "";
	_lastVisibility = "";

	constructor (owner: IgeUiWorldAnchors<V>, el: IgeUiAnchorElement, options: IgeUiWorldAnchorOptions<V>) {
		this._owner = owner;
		this.el = el;
		this.options = options;
		if (options.position) this._point = { ...options.position };
	}

	/** Moves its world point (the next frame places it there). */
	at (x: number, y: number, z: number): this {
		this._point = { x, y, z };
		this._placed = undefined;
		this._hidden = false;
		return this;
	}

	/** Puts it at a point of its layer (screen CSS px from the view's corner) instead of a world point: an arrow at the view's edge. */
	place (x: number, y: number): this {
		this._placed = { x, y };
		this._hidden = false;
		return this;
	}

	/** Hidden until it's given a point again. */
	hide (): this {
		this._hidden = true;
		return this;
	}

	/** No longer anchored (the node stays where it is in the tree; `removeNode` takes it out too). */
	remove (removeNode: boolean = false): void {
		this._owner._anchors.delete(this);
		if (removeNode) this.el.remove();
	}

	/** Its world point now (with the offset), or null. */
	_world (): IgeUiVec3 | null {
		const o = this.options;
		let p: IgeUiVec3 | null | undefined;
		if (o.entity) {
			const e = o.entity;
			const w = e._alive && !e._hidden && e._parent ? e._worldMatrix4?.matrix : undefined;
			p = w ? { x: w[12], y: w[13], z: w[14] } : null;
		} else if (o.follow) {
			p = o.follow();
		} else {
			p = this._point;
		}
		if (!p) return null;
		return o.offset ? { x: p.x + o.offset.x, y: p.y + o.offset.y, z: p.z + o.offset.z } : p;
	}
}

export interface IgeUiWorldAnchorsOptions<V = unknown> {
	/** Where the UI's drawn (the engine's: its scale and safe area). Default: the page's, 1 and none. */
	space?: () => IgeUiWorldSpace;
	/** A class for every layer made. */
	layerClass?: string;
	/** A layer was made, or moved or rescaled: set what goes with it (a CSS variable for the scale, say). */
	layerChanged? (layer: IgeUiAnchorElement, view: V, space: IgeUiWorldSpace): void;
}

const PAGE_SPACE: IgeUiWorldSpace = { scale: 1, safeX: 0, safeY: 0 };

export class IgeUiWorldAnchors<V = unknown> {
	readonly projector: IgeUiWorldProjector<V>;
	readonly parent: IgeUiAnchorElement;
	readonly options: IgeUiWorldAnchorsOptions<V>;
	_anchors = new Set<IgeUiWorldAnchor<V>>();
	_layers = new Map<V, { el: IgeUiAnchorElement; key: string }>();

	constructor (projector: IgeUiWorldProjector<V>, parent: IgeUiAnchorElement, options: IgeUiWorldAnchorsOptions<V> = {}) {
		this.projector = projector;
		this.parent = parent;
		this.options = options;
	}

	get space (): IgeUiWorldSpace {
		return this.options.space?.() ?? PAGE_SPACE;
	}

	/** The view an anchor or call means: the one given, else the projector's first. */
	_view (view?: V): V | undefined {
		return view ?? this.projector.views()[0];
	}

	/** A view's clipping layer (made the first time): put anchored nodes in it. */
	layer (view?: V): IgeUiAnchorElement | undefined {
		const v = this._view(view);
		if (v === undefined) return undefined;
		let entry = this._layers.get(v);
		if (!entry) {
			const doc = this.parent.ownerDocument as { createElement (tag: string): IgeUiAnchorElement & { className: string } };
			const el = doc.createElement("div");
			if (this.options.layerClass) el.className = this.options.layerClass;
			el.style.cssText = "position:absolute;overflow:hidden;pointer-events:none;transform-origin:0 0;";
			this.parent.appendChild(el as never);
			entry = { el, key: "" };
			this._layers.set(v, entry);
		}
		this._fitLayer(v, entry);
		return entry.el;
	}

	/** Keeps a layer over its view: placed in the UI's own pixels, and (on a scaled UI) scaled back to the screen's. */
	_fitLayer (view: V, entry: { el: IgeUiAnchorElement; key: string }): void {
		const r = this.projector.rect(view);
		const s = this.space;
		const key = `${r.x},${r.y},${r.w},${r.h},${s.scale},${s.safeX},${s.safeY}`;
		if (entry.key === key) return;
		entry.key = key;
		const st = entry.el.style;
		st.setProperty("left", `${(r.x - s.safeX) / s.scale}px`);
		st.setProperty("top", `${(r.y - s.safeY) / s.scale}px`);
		st.setProperty("width", `${r.w}px`);
		st.setProperty("height", `${r.h}px`);
		st.setProperty("transform", s.scale !== 1 ? `scale(${1 / s.scale})` : null);
		this.options.layerChanged?.(entry.el, view, s);
	}

	/** Anchors a node (put in its view's layer if it isn't in the tree yet). */
	anchor (el: IgeUiAnchorElement, options: IgeUiWorldAnchorOptions<V> = {}): IgeUiWorldAnchor<V> {
		const a = new IgeUiWorldAnchor<V>(this, el, options);
		if (!el.parentNode) this.layer(options.view)?.appendChild(el as never);
		el.style.setProperty("position", "absolute");
		el.style.setProperty("left", "0");
		el.style.setProperty("top", "0");
		this._anchors.add(a);
		this._placeOne(a);
		return a;
	}

	/** A world point in a view's layer (screen CSS px from the view's corner), or null (behind the camera, no camera). */
	project (x: number, y: number, z: number, view?: V): IgeUiWorldPoint | null {
		const v = this._view(view);
		if (v === undefined) return null;
		const p = this.projector.project(v, x, y, z);
		if (!p) return null;
		const r = this.projector.rect(v);
		return { x: p.x - r.x, y: p.y - r.y, visible: p.visible };
	}

	/** A view's size on the screen (CSS px): a layer's size. */
	viewSize (view?: V): { w: number; h: number } {
		const v = this._view(view);
		if (v === undefined) return { w: 0, h: 0 };
		const r = this.projector.rect(v);
		return { w: r.w, h: r.h };
	}

	/** The frame's work: every layer kept over its view, every anchor placed (or hidden). */
	update (): void {
		const views = this.projector.views();
		for (const [v, entry] of this._layers) {
			if (views.includes(v)) this._fitLayer(v, entry);
		}
		for (const a of this._anchors) this._placeOne(a);
	}

	_placeOne (a: IgeUiWorldAnchor<V>): void {
		const o = a.options;
		const v = this._view(o.view);
		let at: { x: number; y: number } | null = null;
		if (!a._hidden && v !== undefined) {
			if (a._placed) {
				at = a._placed;
			} else {
				const w = a._world();
				const p = w ? this.projector.project(v, w.x, w.y, w.z) : null;
				if (p) {
					const r = this.projector.rect(v);
					const m = o.margin ?? 0;
					const x = p.x - r.x, y = p.y - r.y;
					const inside = m > 0 ? p.visible || (x >= -m && y >= -m && x <= r.w + m && y <= r.h + m) : p.visible;
					if (inside) at = { x: x + (o.screenOffset?.x ?? 0), y: y + (o.screenOffset?.y ?? 0) };
				}
			}
		}
		a.shown = !!at;
		const visibility = at ? "" : "hidden";
		if (a._lastVisibility !== visibility) {
			a._lastVisibility = visibility;
			a.el.style.setProperty("visibility", visibility || null);
		}
		if (!at) return;
		a.screen = at;
		const align = o.align ?? "translate(-50%, -50%)";
		// An engine element: moved where it's drawn (no restyle or layout), its alignment its own transform
		const host = (a.el.ownerDocument as { host?: { placeAt? (el: unknown, x: number, y: number): void } } | null)?.host;
		if (host?.placeAt) {
			if (a._lastTransform !== align) {
				a._lastTransform = align;
				a.el.style.setProperty("transform", align || null);
			}
			host.placeAt(a.el, Number(round(at.x, o.snap)), Number(round(at.y, o.snap)));
		} else {
			const transform = `translate(${round(at.x, o.snap)}px, ${round(at.y, o.snap)}px)${align ? ` ${align}` : ""}`;
			if (a._lastTransform !== transform) {
				a._lastTransform = transform;
				a.el.style.setProperty("transform", transform);
			}
		}
		o.update?.(a.el, at);
	}

	/** Every anchor and layer gone (the layers' nodes too). */
	destroy (): void {
		this._anchors.clear();
		for (const { el } of this._layers.values()) el.remove();
		this._layers.clear();
	}
}

/** Positions to a tenth of a pixel (fewer restyles), or a whole one. */
function round (v: number, whole?: boolean): string {
	return (whole ? Math.round(v) : Math.round(v * 10) / 10).toString();
}

/** A renderer's viewports as anchors' views (its viewports with cameras, or the ones `viewports()` lists). */
export function igeUiRendererProjector (renderer: IgeWebGlRenderer, viewports?: () => IgeViewport[]): IgeUiWorldProjector<IgeViewport> {
	const canvasHeight = () => ((renderer as unknown as { _bounds2d?: { y: number } })._bounds2d?.y ?? 0);
	return {
		views: viewports ?? (() => (ige.engine._children as unknown[]).filter((c) => (c as IgeViewport).camera) as IgeViewport[]),
		rect: (vp) => {
			// (A viewport's y is measured from the canvas's bottom, as WebGL's is)
			const w = vp._bounds2d.x, h = vp._bounds2d.y;
			return { x: vp._translate?.x || 0, y: canvasHeight() - ((vp._translate?.y || 0) + h), w, h };
		},
		project: (vp, x, y, z) => {
			const p = renderer.worldToScreen(vp, x, y, z);
			return p && (p.visible || p.depth !== 0 || p.x !== 0 || p.y !== 0) ? { x: p.x, y: p.y, visible: p.visible } : null;
		}
	};
}

/** An engine UI's scale and safe area, for anchors on it. */
export function igeUiSpace (root: IgeUiRoot): () => IgeUiWorldSpace {
	return () => ({ scale: root.scale, safeX: root.safe.x + root.pageOffset.x, safeY: root.safe.y + root.pageOffset.y });
}

/**
 * An overlay for IgeWebGlRenderer.addOverlay that places the anchors and then draws the UI (add it instead of the
 * UI itself). Anchors made later go in its `anchors`.
 */
export function igeUiWorldOverlay (root: IgeUiRoot, ...anchors: { update (): void }[]): IgeWebGlOverlay & { anchors: { update (): void }[] } {
	return {
		anchors,
		draw: (gl, width, height, dpr) => {
			for (const a of anchors) a.update();
			return root.draw(gl, width, height, dpr);
		},
		contextRestored: (gl) => root.contextRestored(gl)
	};
}
