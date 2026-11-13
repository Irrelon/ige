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
 *   over it;
 * - styles: double (a second line a thickness and a pixel on), dotted (round
 *   dots as wide as it's thick, a dot's width apart), dashed (dashes three
 *   times as long as it's thick, twice from 3px, fitted to the run so it
 *   starts and ends on one, as Chrome fits them), wavy (a wave five times as
 *   long as it's thick and as high, just under where the line would be);
 * - text-decoration-skip-ink (auto): underlines and overlines break round
 *   the glyphs they'd cross (a descender), a thickness clear of them.
 *
 * Not done: text-underline-offset and -position.
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
	style: "solid" | "double" | "dotted" | "dashed" | "wavy";
}

/** Where a run's glyphs have ink between two heights (UI px): [from, to] across, in order (IgeUiRoot's, from the glyph atlas). */
export type IgeUiInkSpans = (top: number, bottom: number) => [number, number][];

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
			const sv = styleValue(cs, "text-decoration-style");
			const style = sv === "double" || sv === "dotted" || sv === "dashed" || sv === "wavy" ? sv : "solid";
			for (const line of lines.split(/\s+/)) {
				if (line !== "underline" && line !== "overline" && line !== "line-through") continue;
				if (out.some((d) => d.line === line && d.color.r === color.r && d.color.g === color.g && d.color.b === color.b && d.color.a === color.a)) continue;
				out.push({ line, color, thickness, style });
			}
		}
		// (Not carried on past something out of the flow, a float, or an inline-block round it)
		const pos = styleValue(cs, "position"), display = styleValue(cs, "display");
		if (pos === "absolute" || pos === "fixed" || styleValue(cs, "float") !== "none" || /^inline-(block|flex|grid|table)$/.test(display)) break;
	}
	return out;
}

/**
 * Chrome's fit of dashes to a line `length` long: the number of dashes whose gaps come nearest `gap`, those gaps
 * evened out so the line starts and ends on a dash. Each dash's start.
 */
export function fitDashes (length: number, dash: number, gap: number): number[] {
	if (length <= dash) return [0];
	const lo = Math.max(1, Math.floor((length + gap) / (dash + gap))), hi = lo + 1;
	const gapLo = lo > 1 ? (length - lo * dash) / (lo - 1) : 0, gapHi = (length - hi * dash) / (hi - 1);
	const [n, g] = gapHi <= 0 || Math.abs(gapLo - gap) < Math.abs(gapHi - gap) ? [lo, gapLo] : [hi, gapHi];
	const out: number[] = [];
	for (let i = 0; i < n; i++) out.push(i * (dash + g));
	return out;
}

/** The parts of [x0, x1] clear of `ink` (each grown by `clear` either side). */
function clearOf (x0: number, x1: number, ink: [number, number][], clear: number): [number, number][] {
	const out: [number, number][] = [];
	let at = x0;
	for (const [a, b] of ink) {
		const s = a - clear, e = b + clear;
		if (e <= at || s >= x1) continue;
		if (s > at) out.push([at, s]);
		at = Math.max(at, e);
	}
	if (at < x1) out.push([at, x1]);
	return out;
}

/**
 * A text item's decorations, pushed onto `items`: `phase` "under" the underlines and overlines (before the text),
 * "over" the line-throughs (after it). `ascent`: the font's (UI px); `grid`: device px per UI px; `ink`: where the
 * run's glyphs have ink (for skipping it), when text-decoration-skip-ink lets them.
 */
export function paintTextDecorations (items: IgeUiPaintItem[], text: IgeUiPaintText, decorations: IgeUiTextDecoration[], ascent: number, grid: number, phase: "under" | "over", ink?: IgeUiInkSpans): void {
	const g = grid > 0 ? grid : 1;
	const at = { opacity: text.opacity, clip: text.clip, matrix: text.matrix, el: text.el };
	const box = (x: number, y: number, w: number, h: number, color: IgeCssColor, round = false) => {
		if (w <= 0 || h <= 0) return;
		const r = round ? Math.min(w, h) / 2 : 0;
		items.push({ op: "box", x, y, w, h, radii: [r, r, r, r], color, ...at });
	};
	const x0 = text.x, x1 = text.x + text.w;
	for (const d of decorations) {
		if ((d.line === "line-through") !== (phase === "over")) continue;
		// Its thickness, in whole device pixels; dashes', dots' and waves' rounded
		const t = d.thickness ?? text.font.size / 10;
		const drawn = Math.max(1, Math.floor(t * g + 1e-6)) / g;
		const styled = Math.max(1, Math.round(t * g)) / g;
		let top: number;
		if (d.line === "underline") top = text.y + Math.max(1, Math.ceil((t * g) / 2 - 1e-6)) / g;
		else if (d.line === "overline") top = text.y - ascent - drawn;
		else top = text.y - ascent / 3 - drawn / 2;
		const mid = top + drawn / 2;
		const second = Math.round((t + 1) * g) / g;
		const amp = t, wave = 5 * t;
		// Its band (top and bottom), and the parts of the run clear of the glyphs' ink there
		// (A wave's middle: a little under an underline, over an overline, through a line-through)
		const waveAt = d.line === "underline" ? top + 1.9 * t : d.line === "overline" ? top + drawn - 1.9 * t : mid;
		const band: [number, number] = d.style === "double" ? [top, top + second + drawn] : d.style === "wavy" ? [waveAt - amp - t / 2, waveAt + amp + t / 2] : d.style === "solid" ? [top, top + drawn] : [mid - styled / 2, mid + styled / 2];
		const parts = d.line !== "line-through" && ink ? clearOf(x0, x1, ink(band[0], band[1]), t) : [[x0, x1] as [number, number]];
		if (d.style === "solid" || d.style === "double") {
			for (const [a, b] of parts) {
				box(a, top, b - a, drawn, d.color);
				if (d.style === "double") box(a, top + second, b - a, drawn, d.color);
			}
		} else if (d.style === "dotted" || d.style === "dashed") {
			// Dots a dot apart from its start; dashes fitted to the run
			const dash = d.style === "dotted" ? styled : styled * (styled * g >= 3 ? 2 : 3);
			const starts = d.style === "dotted" ? [0, 2 * styled] : fitDashes(x1 - x0, dash, styled * (styled * g >= 3 ? 1 : 2));
			const period = starts.length > 1 ? starts[1] - starts[0] : x1 - x0 + dash;
			// (Each part one item, the pattern in the shader, carried on from the run's start)
			for (const [a, b] of parts) {
				if (b - a <= 0) continue;
				items.push({ op: "box", x: a, y: mid - styled / 2, w: b - a, h: styled, radii: [0, 0, 0, 0], color: d.color, ...at, dash: { len: dash, period, round: d.style === "dotted", phase: x0 - a } });
			}
		} else {
			// A wave from its start, its crest a thickness under where the line would be
			const y = waveAt;
			for (const [a, b] of parts) {
				const points: number[] = [];
				const step = wave / 12;
				for (let x = a; x < b + step * 0.5; x += step) {
					const px = Math.min(x, b);
					points.push(px, y + amp * Math.sin((2 * Math.PI * (px - x0)) / wave));
				}
				if (points.length >= 4) items.push({ op: "line", points, width: t, color: d.color, cap: "butt", join: "round", ...at });
			}
		}
	}
}

/**
 * Where a run's glyphs have ink between two heights: each glyph's ink in the atlas's signed distance field (its edge
 * and in) across those rows. `glyph`, `advance` and `kerning` as the atlas has them; `k`: UI px per atlas px.
 */
export function inkSpans (text: string, x: number, baseline: number, letterSpacing: number, k: number, top: number, bottom: number, atlas: {
	glyph (ch: string): { page: number; x: number; y: number; w: number; h: number; left: number; top: number } | null;
	advance (ch: string): number;
	kerning (a: string, b: string): number;
	pages: Uint8Array[];
	page: number;
	edge: number;
}): [number, number][] {
	const out: [number, number][] = [];
	const chars = [...text];
	let gx = x;
	const edge = Math.round(atlas.edge * 255);
	for (let i = 0; i < chars.length; i++) {
		const g = atlas.glyph(chars[i]);
		if (g) {
			const ox = gx + g.left * k, oy = baseline + g.top * k;
			const r0 = Math.max(0, Math.floor((top - oy) / k)), r1 = Math.min(g.h, Math.ceil((bottom - oy) / k));
			const px = atlas.pages[g.page];
			let lo = Infinity, hi = -Infinity;
			if (px) for (let r = r0; r < r1; r++) {
				const row = (g.y + r) * atlas.page + g.x;
				for (let c = 0; c < g.w; c++) {
					if (px[row + c] < edge) continue;
					lo = Math.min(lo, c);
					hi = Math.max(hi, c);
				}
			}
			if (hi >= lo) out.push([ox + lo * k, ox + (hi + 1) * k]);
		}
		gx += atlas.advance(chars[i]) * k + letterSpacing + (i + 1 < chars.length ? atlas.kerning(chars[i], chars[i + 1]) * k : 0);
	}
	out.sort((p, q) => p[0] - q[0]);
	return out;
}
