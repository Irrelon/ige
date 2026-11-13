/**
 * text-decoration on the engine's UI, placed as Chrome places it:
 *
 * - underline, overline and line-through, from the text's element and the
 *   elements round it it's in the flow of (a decoration carries on into
 *   inline and in-flow children, not past one positioned out of the flow, a
 *   float or an inline-block), each in its decorating element's
 *   text-decoration-color (its colour unless it says otherwise);
 * - thickness: text-decoration-thickness, or for auto a tenth of the font
 *   size, drawn in whole device pixels (at least one);
 * - an underline sits below the baseline by half its thickness (at least a
 *   pixel), a line-through a third of the ascent above it, an overline on the
 *   top of the text; underlines and overlines under the text, line-throughs
 *   over it.
 *
 * Not done: wavy, dotted and dashed lines (drawn solid), skipping the ink of
 * descenders, text-underline-offset and -position.
 */
import { type IgeCssColor, parseColor, resolveLength } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeUiPaintItem, IgeUiPaintText } from "@/engine/ui2/render/IgeUiPaint";
import { styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";

export interface IgeUiTextDecoration {
	line: "underline" | "overline" | "line-through";
	color: IgeCssColor;
	/** Its thickness (UI px), or undefined for auto. */
	thickness?: number;
}

/** What decorates text in `el` (its own and what it's in the flow of), deduplicated. */
export function textDecorations (el: IgeUiElement | null | undefined): IgeUiTextDecoration[] {
	const out: IgeUiTextDecoration[] = [];
	for (let e = el; e; e = e.parentNode) {
		const cs = e._computed;
		if (!cs) break;
		const lines = styleValue(cs, "text-decoration-line");
		if (lines && lines !== "none") {
			const current = parseColor(styleValue(cs, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
			const cv = styleValue(cs, "text-decoration-color");
			const color = (cv && cv !== "currentcolor" ? parseColor(cv, current) : undefined) ?? current;
			const tv = styleValue(cs, "text-decoration-thickness");
			const fontSize = parseFloat(styleValue(cs, "font-size")) || 16;
			const thickness = tv && tv !== "auto" && tv !== "from-font" ? resolveLength(tv, { em: fontSize, rem: 16, vw: 0, vh: 0, cqw: 0, cqh: 0, percent: fontSize }) : undefined;
			for (const line of lines.split(/\s+/)) {
				if (line !== "underline" && line !== "overline" && line !== "line-through") continue;
				if (out.some((d) => d.line === line && d.color.r === color.r && d.color.g === color.g && d.color.b === color.b && d.color.a === color.a)) continue;
				out.push({ line, color, thickness });
			}
		}
		// (Not carried on past something out of the flow, a float, or an inline-block round it)
		const pos = styleValue(cs, "position"), display = styleValue(cs, "display");
		if (pos === "absolute" || pos === "fixed" || styleValue(cs, "float") !== "none" || /^inline-(block|flex|grid|table)$/.test(display)) break;
	}
	return out;
}

/**
 * A text item's decorations as boxes, pushed onto `items`: `phase` "under" the underlines and overlines (before the
 * text), "over" the line-throughs (after it). `ascent`: the font's (UI px); `grid`: device px per UI px.
 */
export function paintTextDecorations (items: IgeUiPaintItem[], text: IgeUiPaintText, decorations: IgeUiTextDecoration[], ascent: number, grid: number, phase: "under" | "over"): void {
	const g = grid > 0 ? grid : 1;
	for (const d of decorations) {
		if ((d.line === "line-through") !== (phase === "over")) continue;
		// Its thickness, in whole device pixels
		const t = d.thickness ?? text.font.size / 10;
		const drawn = Math.max(1, Math.floor(t * g + 1e-6)) / g;
		let top: number;
		if (d.line === "underline") top = text.y + Math.max(1, Math.ceil((t * g) / 2 - 1e-6)) / g;
		else if (d.line === "overline") top = text.y - ascent - drawn;
		else top = text.y - ascent / 3 - drawn / 2;
		items.push({ op: "box", x: text.x, y: top, w: text.w, h: drawn, radii: [0, 0, 0, 0], color: d.color, opacity: text.opacity, clip: text.clip, matrix: text.matrix, el: text.el });
	}
}
