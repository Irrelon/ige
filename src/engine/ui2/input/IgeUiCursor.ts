/**
 * The pointer's cursor over an engine UI: the computed `cursor` of what the
 * pointer's over (inherited as CSS has it: a button's `pointer`, a text
 * field's `text`, a canvas's own `crosshair` set as it's pointed at), given
 * to the platform. On the web that's a page element's style (the canvas the
 * UI's drawn on); a native host sets the system cursor.
 *
 * It follows the UI's own hover (the pointerover/out the root dispatches as
 * the pointer moves) and reads the cursor again as the pointer moves over the
 * same element, since a screen can change it under a still hover (the star
 * chart's system pane: a pointer over a place, a crosshair elsewhere).
 */
import type { IgeUiRoot } from "../IgeUiRoot";
import type { IgeUiElement } from "../dom/IgeUiDom";

/** The part of the platform the cursor needs (the host seam's `display.cursor`). */
export interface IgeUiCursorHost {
	/** A CSS cursor keyword (`pointer`, `text`, `grab`…), or "" for the platform's own (off the UI, or `auto`). */
	cursor (name: string): void;
}

/** The web's: an element's style (the canvas the UI's drawn on, whose cursor the page shows over it). */
export function igeUiWebCursorHost (el: { style: { cursor: string } }): IgeUiCursorHost {
	return { cursor: (name) => {
		if (el.style.cursor !== name) el.style.cursor = name;
	} };
}

/**
 * Keeps the host's cursor as the UI under the pointer wants it. Returns a function that stops (the platform's own
 * cursor back).
 */
export function igeUiCursor (root: IgeUiRoot, host: IgeUiCursorHost): () => void {
	// (The root element: every element's events pass it)
	const doc = root.document.documentElement;
	let over: IgeUiElement | null = null;
	let shown = "";
	const show = () => {
		// (auto is the platform's own: an arrow, or the I-beam over text, as it chooses)
		const value = over && over.isConnected ? root.computedStyle(over).cursor ?? "" : "";
		const name = value === "auto" ? "" : value;
		if (name === shown) return;
		shown = name;
		host.cursor(name);
	};
	const onOver = (e: unknown) => {
		over = (e as { target: IgeUiElement | null }).target;
		show();
	};
	const onOut = (e: unknown) => {
		// (Off the UI altogether: nothing's under the pointer)
		if (!(e as { relatedTarget?: unknown }).relatedTarget) {
			over = null;
			show();
		}
	};
	const onMove = () => show();
	const opts = { capture: true };
	doc.addEventListener("pointerover", onOver, opts);
	doc.addEventListener("pointerout", onOut, opts);
	doc.addEventListener("pointermove", onMove, opts);
	return () => {
		doc.removeEventListener("pointerover", onOver, opts);
		doc.removeEventListener("pointerout", onOut, opts);
		doc.removeEventListener("pointermove", onMove, opts);
		over = null;
		show();
	};
}
