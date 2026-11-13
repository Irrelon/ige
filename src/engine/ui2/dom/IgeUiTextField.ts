/**
 * Text fields in the engine's UI: what a browser draws in a focused field and
 * how its typing reaches the page.
 *
 * - The caret, or the selection's highlight, drawn over the field's text
 *   (`textFieldPaint`, the painter's hook): where they fall measured with
 *   the field's own font, letter-spacing included.
 * - The typing itself is the host's (IgeUiHost.textEntry: on the web a
 *   hidden page input kept over the field, IgeUiWebHost.ts), its selection
 *   mirrored onto the field (`selectionStart`, `selectionEnd`).
 */
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { contentLeft, contentTop, type IgeUiBox } from "@/engine/ui2/layout/IgeUiBox";
import type { IgeUiLayoutEngine } from "@/engine/ui2/layout/IgeUiLayout";
import type { IgeUiClip, IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { parseColor } from "@/engine/ui2/css/IgeCssValues";
import { styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";

/** A field's selection (the hidden input's, mirrored): from, to (equal: the caret). */
interface Selectable {
	selectionStart?: number | null;
	selectionEnd?: number | null;
}

/** The selection's highlight (Chrome's own for a focused field). */
const HIGHLIGHT = { r: 51, g: 144, b: 255, a: 0.4 };

/** A field the keyboard types into (not a slider, checkbox or button). */
export function isTextField (el: IgeUiElement | null | undefined): el is IgeUiElement {
	if (!el) return false;
	if (el.localName === "textarea") return true;
	return el.localName === "input" && !["range", "checkbox", "radio", "button", "submit", "reset", "hidden", "file", "color"].includes(el.getAttribute("type") ?? "text");
}

/** The painter's hook: the caret or the selection over the focused field's text. */
export function textFieldPaint (layout: IgeUiLayoutEngine, active: () => IgeUiElement | null) {
	return (b: IgeUiBox, ctx: { clip: IgeUiClip; dx: number; dy: number; opacity: number; matrix?: unknown }, items: IgeUiPaintItem[]): void => {
		const el = b.el;
		if (!el || b.pseudo || el !== active() || !isTextField(el)) return;
		const s = b.style;
		const value = el.value ?? "";
		const shown = el.getAttribute("type") === "password" ? "•".repeat([...value].length) : value;
		const sel = el as unknown as Selectable;
		const len = shown.length;
		const end = Math.max(0, Math.min(len, sel.selectionEnd ?? len));
		const start = Math.max(0, Math.min(end, sel.selectionStart ?? end));
		const font = layout.font(s);
		const m = layout.metrics(font);
		const ls = layout.letterSpacing(s);
		// Where the value's text starts and its baseline: its run, else (empty: the placeholder's, or none) the content box
		const run = value ? b.runs?.[0] : undefined;
		const x0 = run ? run.x : contentLeft(b);
		const inner = b.borderH - b.borderTop - b.borderBottom - b.paddingTop - b.paddingBottom;
		const baseline = run ? run.y : contentTop(b) + Math.max(0, (inner - m.ascent - m.descent) / 2) + m.ascent;
		const at = (i: number) => x0 + layout.fonts.measure(shown.slice(0, i), font) + ls * i;
		const x = b.ax + ctx.dx, y = b.ay + ctx.dy + baseline - m.ascent, h = m.ascent + m.descent;
		const base = { radii: [0, 0, 0, 0] as [number, number, number, number], opacity: ctx.opacity, clip: ctx.clip, matrix: ctx.matrix, el } as const;
		if (start !== end) {
			items.push({ op: "box", ...base, x: x + at(start), y, w: Math.max(1, at(end) - at(start)), h, color: HIGHLIGHT } as IgeUiPaintItem);
			return;
		}
		// (caret-color: auto, or not given: the text's colour)
		const caretV = styleValue(s, "caret-color");
		const caret = parseColor(!caretV || caretV === "auto" ? styleValue(s, "color") : caretV) ?? { r: 0, g: 0, b: 0, a: 1 };
		if (caret.a <= 0) return;
		items.push({ op: "box", ...base, x: x + at(end), y, w: 1, h, color: caret } as IgeUiPaintItem);
	};
}
