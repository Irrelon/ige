/**
 * Pointers at once (ui2): each finger, the mouse and a pen has its own press,
 * as a browser keeps them. IgeUiRoot routes the page's pointer events through
 * these:
 *
 * - a press per pointer (where it went down, :active on its element and those
 *   round it while any pointer holds them, a touch's scroll);
 * - a touch is captured where it lands (its moves and lift go there wherever
 *   the finger goes, unless released), and one that lands on the game, not
 *   the UI, is the game's to the end;
 * - a touch scrolls the box it starts in only where `touch-action` lets it
 *   pan that way (none, pan-x and pinch-zoom don't);
 * - a touch that moved past the slop isn't a tap: no click when it lifts;
 * - the mouse's own events (mousedown, mouseup) follow the primary pointer
 *   only, none after a pointerdown's preventDefault (nor the focus a press
 *   gives); a finger's come as it lifts from a tap, with its focus, as a
 *   browser sends them.
 */
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";

/** A pointer that's down on the UI. */
export interface IgeUiPress {
	el: IgeUiElement;
	x: number;
	y: number;
	time: number;
	pointerType: string;
	/** The furthest it's gone from where it went down (CSS pixels). */
	moved: number;
	/** The mouse's own events follow it (the primary pointer, its pointerdown not cancelled). */
	compat?: boolean;
	/** A touch: the box its drag scrolls (none where touch-action says no). */
	scroller?: IgeUiElement;
	dragging?: boolean;
	vy?: number;
	lastY?: number;
	lastT?: number;
}

/** A touch that went further than this (CSS pixels) is a drag, not a tap (a browser's touch slop). */
export const IGE_UI_TAP_SLOP = 15;

/** Whether a touch-action value lets a finger pan up and down (auto, manipulation, pan-y). */
export function touchPansY (value: string): boolean {
	const v = value.trim();
	return v === "" || v === "auto" || v === "manipulation" || /\bpan-(y|up|down)\b/.test(v);
}

/**
 * The box a touch on `el` scrolls with a drag: the nearest that scrolls up and down, unless an element on the way
 * (it included) has a touch-action that won't pan that way (touch-action isn't inherited: each one counts).
 */
export function touchScroller (el: IgeUiElement): IgeUiElement | undefined {
	for (let n: IgeUiElement | null = el; n; n = n.parentNode) {
		if (!touchPansY(styleValue(n._computed, "touch-action"))) return undefined;
		const oy = styleValue(n._computed, "overflow-y");
		if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) return n;
	}
	return undefined;
}

/** The press moved to a point: how far it's been from where it went down. */
export function pressMoved (p: IgeUiPress, x: number, y: number): void {
	p.moved = Math.max(p.moved, Math.hypot(x - p.x, y - p.y));
}

/** Whether a lift ends a tap that clicks: not a finger that went past the slop (a drag isn't a tap). */
export function pressClicks (p: IgeUiPress): boolean {
	return p.pointerType !== "touch" || p.moved <= IGE_UI_TAP_SLOP;
}

/** Every element a press holds :active (its own and those round it). */
export function pressChain (p: IgeUiPress): IgeUiElement[] {
	const out: IgeUiElement[] = [];
	for (let n: IgeUiElement | null = p.el; n; n = n.parentNode) out.push(n);
	return out;
}
