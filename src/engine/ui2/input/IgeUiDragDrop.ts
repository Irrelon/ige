/**
 * HTML drag and drop for the engine's UI, made from the pointer as a
 * browser makes it: press on a `draggable="true"` element (or in one) and
 * move a few pixels, and it gets `dragstart` with a `dataTransfer` (cancel
 * it and the press goes on as a press). While dragging, the element under
 * the pointer gets `dragenter` and `dragover` (cancel dragover to say it
 * takes a drop), the one it left `dragleave`, and the dragged one `drag`;
 * on release the target gets `drop` if its last dragover was cancelled,
 * else `dragleave`, and the dragged one `dragend` (Escape cancels). The
 * press ends without a click, and :active and hover hold still meanwhile.
 *
 * What's dragged is drawn under the pointer as a see-through copy (its
 * paint items as they were when the drag began, or setDragImage's).
 */
import { type IgeCssMatrix, multiply } from "@/engine/ui2/css/IgeCssValues";
import { type IgeUiElement, IgeUiEvent } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";

/** How far (CSS px) the pointer moves, pressed, before it's a drag. */
export const DRAG_THRESHOLD = 4;

/** The drag's data (DataTransfer's shape: setData, getData, types, the effects). */
export class IgeUiDataTransfer {
	_data = new Map<string, string>();
	effectAllowed = "uninitialized";
	dropEffect = "none";
	readonly files: never[] = [];
	_image?: { el: IgeUiElement; x: number; y: number };

	get types (): string[] {
		return [...this._data.keys()];
	}

	setData (type: string, value: string): void {
		this._data.set(normalType(type), String(value));
	}

	getData (type: string): string {
		return this._data.get(normalType(type)) ?? "";
	}

	clearData (type?: string): void {
		if (type === undefined) this._data.clear();
		else this._data.delete(normalType(type));
	}

	setDragImage (el: IgeUiElement, x: number, y: number): void {
		this._image = { el, x, y };
	}
}

function normalType (t: string): string {
	const l = t.toLowerCase();
	return l === "text" ? "text/plain" : l === "url" ? "text/uri-list" : l;
}

/** What the drag needs of the UI it's in (IgeUiRoot). */
export interface IgeUiDragHost {
	hitTest (clientX: number, clientY: number): IgeUiElement | null;
	/** The UI's scale (CSS px per UI px), where it sits on the page and its safe area (CSS px). */
	scale: number;
	pageOffset?: { x: number; y: number };
	safe?: { x: number; y: number };
	items: IgeUiPaintItem[];
	update (): void;
	/** The press is over (its :active states dropped, no click to come). */
	endPress (): void;
}

interface Pending {
	source: IgeUiElement;
	x: number;
	y: number;
	pointerId: number;
}

interface Active extends Pending {
	data: IgeUiDataTransfer;
	target: IgeUiElement | null;
	/** The last dragover was cancelled: a drop would be taken. */
	accepted: boolean;
	ghost: IgeUiPaintItem[];
	/** The point of the copy that's held under the pointer (UI px). */
	grabX: number;
	grabY: number;
	/** The pointer (client px). */
	atX: number;
	atY: number;
	/** What the last dragover said a drop would do. */
	effect: string;
}

export class IgeUiDragDrop {
	host: IgeUiDragHost;
	_pending?: Pending;
	_active?: Active;

	constructor (host: IgeUiDragHost) {
		this.host = host;
	}

	/** A drag under way. */
	get active (): boolean {
		return !!this._active;
	}

	/** A press on the UI (not cancelled): the start of a drag, if it's on something draggable. */
	down (t: IgeUiElement, e: PointerEvent): void {
		this._pending = undefined;
		if (e.button !== 0 || e.pointerType === "touch") return;
		const source = t.closest("[draggable=true]");
		if (!source) return;
		this._pending = { source, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
	}

	/** The pointer moved: true while it's dragging (the UI's own pointer handling stands aside). */
	move (e: PointerEvent): boolean {
		const a = this._active;
		if (a) {
			this._over(e);
			return true;
		}
		const p = this._pending;
		if (!p || e.pointerId !== p.pointerId) return false;
		if (!(e.buttons & 1)) {
			this._pending = undefined;
			return false;
		}
		if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return false;
		this._pending = undefined;
		return this._start(p, e);
	}

	/** The pointer let go: true when that ended a drag (no click follows). */
	up (e: PointerEvent, cancelled = false): boolean {
		this._pending = undefined;
		const a = this._active;
		if (!a) return false;
		if (!cancelled) this._over(e);
		this._active = undefined;
		const at = { clientX: e.clientX, clientY: e.clientY };
		if (a.target && a.accepted && !cancelled) {
			a.data.dropEffect = a.effect;
			const drop = this._fire(a.target, "drop", a, at);
			a.data.dropEffect = drop.defaultPrevented ? a.effect : "none";
		} else {
			if (a.target) this._fire(a.target, "dragleave", a, at);
			a.data.dropEffect = "none";
		}
		this._fire(a.source, "dragend", a, at);
		this.host.update();
		return true;
	}

	/** Escape: the drag given up (true if there was one). */
	cancel (): boolean {
		const a = this._active;
		if (!a) return false;
		return this.up({ clientX: a.atX, clientY: a.atY, pointerId: a.pointerId } as PointerEvent, true);
	}

	/** The display list with the dragged copy over it (the list itself when nothing's dragged). */
	withGhost (items: IgeUiPaintItem[]): IgeUiPaintItem[] {
		const a = this._active;
		if (!a || !a.ghost.length) return items;
		const [ux, uy] = this._toUi(a.atX, a.atY);
		const move: IgeCssMatrix = [1, 0, 0, 1, ux - a.grabX, uy - a.grabY];
		return [...items, ...a.ghost.map((it) => ({ ...it, matrix: it.matrix ? multiply(move, it.matrix) : move }) as IgeUiPaintItem)];
	}

	_start (p: Pending, e: PointerEvent): boolean {
		const data = new IgeUiDataTransfer();
		const a: Active = { ...p, data, target: null, accepted: false, ghost: [], grabX: 0, grabY: 0, atX: e.clientX, atY: e.clientY, effect: "none" };
		const start = this._fire(p.source, "dragstart", a, { clientX: p.x, clientY: p.y });
		// (Cancelled: no drag; the press goes on)
		if (start.defaultPrevented || !p.source.isConnected) return false;
		if (data.effectAllowed === "uninitialized") data.effectAllowed = "all";
		this._active = a;
		this.host.endPress();
		// The copy: what's dragged as it's drawn now (after dragstart's changes), held where it was grabbed
		this.host.update();
		const img = data._image;
		const shown = img?.el ?? p.source;
		a.ghost = this.host.items.filter((it) => it.el && shown.contains(it.el)).map((it) => ({ ...it, clip: null, opacity: it.opacity * 0.6 }) as IgeUiPaintItem);
		if (img) {
			const r = img.el.getBoundingClientRect();
			const [rx, ry] = this._toUi(r.left, r.top);
			a.grabX = rx + img.x;
			a.grabY = ry + img.y;
		} else [a.grabX, a.grabY] = this._toUi(p.x, p.y);
		this._over(e);
		return true;
	}

	/** A client point in the UI's own pixels (less where it sits on the page and its safe area, over its scale). */
	_toUi (x: number, y: number): [number, number] {
		const h = this.host;
		const s = h.scale || 1;
		return [(x - (h.pageOffset?.x ?? 0) - (h.safe?.x ?? 0)) / s, (y - (h.pageOffset?.y ?? 0) - (h.safe?.y ?? 0)) / s];
	}

	/** The pointer over somewhere while dragging: drag, then dragenter and dragleave as it crosses, then dragover. */
	_over (e: { clientX: number; clientY: number }): void {
		const a = this._active!;
		a.atX = e.clientX;
		a.atY = e.clientY;
		const at = { clientX: e.clientX, clientY: e.clientY };
		this._fire(a.source, "drag", a, at);
		const under = this.host.hitTest(e.clientX, e.clientY);
		if (under !== a.target) {
			const was = a.target;
			if (under) this._fire(under, "dragenter", a, at);
			if (was) this._fire(was, "dragleave", a, at, under);
			a.target = under;
			a.accepted = false;
		}
		if (a.target) {
			a.data.dropEffect = effectOf(a.data.effectAllowed);
			const over = this._fire(a.target, "dragover", a, at);
			a.accepted = over.defaultPrevented && a.data.dropEffect !== "none";
			a.effect = a.accepted ? a.data.dropEffect : "none";
		}
	}

	_fire (el: IgeUiElement, type: string, a: Active, at: { clientX: number; clientY: number }, related: IgeUiElement | null = null): IgeUiEvent {
		const cancelable = type !== "dragleave" && type !== "dragend";
		const ev = new IgeUiEvent(type, { bubbles: true, cancelable, clientX: at.clientX, clientY: at.clientY, button: 0, buttons: type === "dragend" || type === "drop" ? 0 : 1, dataTransfer: a.data, relatedTarget: related, pointerType: "mouse" });
		el.dispatchEvent(ev);
		return ev;
	}
}

/** What a drop does unless dragover says otherwise, from what dragstart allowed (as the HTML standard has it). */
function effectOf (allowed: string): string {
	if (allowed === "none") return "none";
	if (allowed === "move") return "move";
	if (allowed === "link" || allowed === "linkMove") return "link";
	return "copy";
}
