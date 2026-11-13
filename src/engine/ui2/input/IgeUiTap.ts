/**
 * Two of a browser's pointer behaviours for form controls and fingers (ui2):
 *
 * - Range inputs take the pointer: a press sets the value where it's pressed
 *   and a drag follows it (the element captures the pointer), with "input" as
 *   it moves and "change" when it's let go having moved it; the arrow keys,
 *   Page Up and Down, Home and End step it. (Drawn by IgeUiPaint: the thumb's
 *   middle at its share of the content box, which is where a press puts it.)
 *
 * - Touch adjustment ("fat-finger"): a tap whose exact point isn't on
 *   anything that responds to a tap goes to the nearest thing that does
 *   within the finger's radius (the touch's width and height, else about
 *   10 CSS px), at the point of it nearest the finger, as Chrome adjusts a
 *   tap. Only the tap is adjusted (its mouse events, focus and click): the
 *   pointer events stay where the finger is, so drags, sticks and a game's
 *   own touch zones keep exact points. Something responds to a tap if it, or
 *   an element round it short of the body, is a control (button, link,
 *   field, label, summary, a [tabindex]), has a data-pad attribute or a
 *   click, mouse or pointer press handler, or shows `cursor: pointer`.
 */
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { IgeUiEvent } from "@/engine/ui2/dom/IgeUiDom";
import { styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";

// ---------------------------------------------------------------- range inputs

export function isRange (el: IgeUiElement | null | undefined): el is IgeUiElement {
	return !!el && el.localName === "input" && el.getAttribute("type") === "range";
}

function num (v: string | null, dflt: number): number {
	const n = v === null || v === "" ? NaN : Number(v);
	return Number.isFinite(n) ? n : dflt;
}

/** A range input's min, max and step (step "any": none). */
export function rangeBounds (el: IgeUiElement): { min: number; max: number; step: number } {
	const min = num(el.getAttribute("min"), 0);
	const max = Math.max(min, num(el.getAttribute("max"), 100));
	const s = el.getAttribute("step");
	const step = s === "any" ? 0 : Math.max(0, num(s, 1));
	return { min, max, step };
}

/** A value kept to the range and on its steps (counted from min), written as a browser writes it. */
export function rangeSnap (el: IgeUiElement, v: number): string {
	const { min, max, step } = rangeBounds(el);
	let out = Math.min(max, Math.max(min, v));
	if (step > 0) {
		out = min + Math.round((out - min) / step) * step;
		// (The last step that fits, when max isn't on one)
		if (out > max) out -= step;
		out = Number(out.toFixed(10));
	}
	return String(out);
}

/** Sets a range input's value; "input" when it changed. Returns whether it did. */
function setRange (el: IgeUiElement, v: string): boolean {
	if (el.value === v) return false;
	el.value = v;
	el.dispatchEvent(new IgeUiEvent("input", { bubbles: true }));
	return true;
}

/** The value at a client x on a range input (its content box: the thumb's middle runs from end to end). */
export function rangeValueAt (el: IgeUiElement, clientX: number): string {
	const r = el.getBoundingClientRect();
	const { min, max } = rangeBounds(el);
	const t = r.width > 0 ? Math.min(1, Math.max(0, (clientX - r.left) / r.width)) : 0;
	return rangeSnap(el, min + t * (max - min));
}

/** Range inputs being dragged, by pointer: what each started at (for "change" when it's let go). */
export class IgeUiRangeInput {
	_drags = new Map<number, { el: IgeUiElement; from: string }>();

	/** A press (not cancelled) on what's at the pointer: a range input there takes the pointer. True if one did. */
	down (t: IgeUiElement, e: { pointerId?: number; clientX: number; button?: number }): boolean {
		if (!isRange(t) || t.isDisabled || (e.button ?? 0) !== 0) return false;
		const id = e.pointerId ?? 1;
		this._drags.set(id, { el: t, from: t.value });
		t.setPointerCapture(id);
		setRange(t, rangeValueAt(t, e.clientX));
		return true;
	}

	/** The pointer moved: a range input it's dragging follows it. */
	move (id: number, clientX: number): void {
		const d = this._drags.get(id);
		if (d?.el.isConnected) setRange(d.el, rangeValueAt(d.el, clientX));
	}

	/** Let go: "change" if the drag moved the value. */
	up (id: number): void {
		const d = this._drags.get(id);
		if (!d) return;
		this._drags.delete(id);
		if (d.el.isConnected && d.el.value !== d.from) d.el.dispatchEvent(new IgeUiEvent("change", { bubbles: true }));
	}

	/** A tap given to a range input (an adjusted one, or the mouse's): the value where it was, "input" and "change". */
	tap (el: IgeUiElement, clientX: number): void {
		if (!isRange(el) || el.isDisabled) return;
		if (setRange(el, rangeValueAt(el, clientX))) el.dispatchEvent(new IgeUiEvent("change", { bubbles: true }));
	}

	/** A key (not cancelled) on a focused range input: arrows a step, Page Up and Down a tenth, Home and End the ends. True if it took it. */
	key (el: IgeUiElement, key: string): boolean {
		if (!isRange(el) || el.isDisabled) return false;
		const { min, max, step } = rangeBounds(el);
		const unit = step || (max - min) / 100;
		const v = num(el.value, (min + max) / 2);
		const to: Record<string, number> = {
			ArrowRight: v + unit, ArrowUp: v + unit, ArrowLeft: v - unit, ArrowDown: v - unit,
			PageUp: v + Math.max(unit, (max - min) / 10), PageDown: v - Math.max(unit, (max - min) / 10), Home: min, End: max
		};
		if (!(key in to)) return false;
		if (setRange(el, rangeSnap(el, to[key]))) el.dispatchEvent(new IgeUiEvent("change", { bubbles: true }));
		return true;
	}
}

// ---------------------------------------------------------------- touch adjustment

const CONTROLS = new Set(["button", "select", "textarea", "summary", "label"]);
const PRESS_EVENTS = ["click", "mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "touchend"];

/** Whether an element itself responds to a tap (see the header). */
export function respondsToTap (el: IgeUiElement): boolean {
	if (el.isDisabled) return false;
	const tag = el.localName;
	if (CONTROLS.has(tag)) return true;
	if (tag === "a" && el.hasAttribute("href")) return true;
	if (tag === "input" && el.getAttribute("type") !== "hidden") return true;
	if (el.hasAttribute("tabindex") || el.hasAttribute("contenteditable")) return true;
	for (const name of el.getAttributeNames()) if (name === "data-pad" || name.startsWith("data-pad-")) return true;
	const listeners = el._listeners;
	if (listeners) for (const type of PRESS_EVENTS) if (listeners.get(type)?.length) return true;
	return styleValue(el._computed, "cursor") === "pointer";
}

/** The element round `el` (it included) that responds to a tap, short of the body and the document's root. */
export function tapResponder (el: IgeUiElement | null): IgeUiElement | null {
	for (let n = el; n && n.parentNode; n = n.parentNode) {
		if (n.localName === "body" || n.localName === "html") return null;
		if (respondsToTap(n)) return n;
	}
	return null;
}

/** What the adjustment needs of its UI: the elements to look through and its hit test. */
export interface IgeUiTapHost {
	document: { body: IgeUiElement | null };
	hitTest (x: number, y: number): IgeUiElement | null;
}

/**
 * Where a tap goes: `exact` (what's under the finger) when it, or something round it, responds to a tap; else the
 * nearest element that responds whose box lies within `radius` of (x, y) and that's what's hit at its point nearest
 * the finger, with that point; else undefined (the tap stays where it is).
 */
export function adjustTap (host: IgeUiTapHost, exact: IgeUiElement | null, x: number, y: number, radius: number): { el: IgeUiElement; x: number; y: number } | undefined {
	if (radius <= 0 || tapResponder(exact)) return undefined;
	let best: { el: IgeUiElement; x: number; y: number; d: number } | undefined;
	const visit = (n: IgeUiElement) => {
		for (const c of n.children) {
			if (!c._box) continue;
			visit(c);
			if (!respondsToTap(c)) continue;
			const r = c.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) continue;
			// The box's point nearest the finger (a pixel inside, where the box has room)
			const px = Math.min(Math.max(x, r.left + Math.min(1, r.width / 2)), r.right - Math.min(1, r.width / 2));
			const py = Math.min(Math.max(y, r.top + Math.min(1, r.height / 2)), r.bottom - Math.min(1, r.height / 2));
			const d = Math.hypot(px - x, py - y);
			if (d > radius || (best && d >= best.d)) continue;
			// (Seen there: nothing drawn over it at that point)
			const hit = host.hitTest(px, py);
			if (!hit || !c.contains(hit)) continue;
			best = { el: c, x: px, y: py, d };
		}
	};
	if (host.document.body) visit(host.document.body);
	return best && { el: best.el, x: best.x, y: best.y };
}

/** A touch's radius for the adjustment: half its contact size where the browser gives one, else 10 CSS px (at most 32). */
export function touchRadius (e: { width?: number; height?: number }): number {
	const size = Math.max(e.width ?? 0, e.height ?? 0);
	return size > 1 ? Math.min(32, size / 2) : 10;
}
