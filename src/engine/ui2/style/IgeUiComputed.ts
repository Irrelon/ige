/**
 * Computed values written as a browser's getComputedStyle writes them, so
 * code that reads styles (and tools that compare the engine's UI with a
 * page's) see the same text either way: colours as rgb() / rgba(), lengths
 * in px, border widths 0 where there's no border, line-height and
 * letter-spacing resolved, transforms as matrix(), shadows colour first with
 * every length, gradients with their colours written out. Values the engine
 * keeps as written (display, position, text-align…) pass through.
 */
import { splitTop } from "@/engine/ui2/css/IgeCssParser";
import { type IgeCssColor, type IgeCssLengthContext, parseColor, parseShadows, parseTransform, resolveLength } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiBox } from "@/engine/ui2/layout/IgeUiBox";
import { type IgeUiComputedStyle, styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";

/** A number as CSS writes it: up to six significant digits, no trailing zeros. */
export function cssNumber (n: number): string {
	if (!Number.isFinite(n)) return "0";
	if (Math.abs(n) < 1e-6) return "0";
	const s = Number(n.toPrecision(6)).toString();
	return s.includes("e") ? n.toFixed(6).replace(/\.?0+$/, "") : s;
}

/** A colour as rgb(r, g, b), or rgba(r, g, b, a) when it's see-through. */
export function cssColor (c: IgeCssColor): string {
	const ch = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
	const a = Math.round(Math.max(0, Math.min(1, c.a)) * 1000) / 1000;
	return a >= 1 ? `rgb(${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)})` : `rgba(${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)}, ${cssNumber(a)})`;
}

const COLOR_PROPS = new Set(["color", "background-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "outline-color", "caret-color", "text-decoration-color", "column-rule-color", "-webkit-text-stroke-color", "accent-color"]);
const BOX_LENGTHS: Record<string, keyof IgeUiBox> = {
	"margin-top": "marginTop", "margin-right": "marginRight", "margin-bottom": "marginBottom", "margin-left": "marginLeft",
	"padding-top": "paddingTop", "padding-right": "paddingRight", "padding-bottom": "paddingBottom", "padding-left": "paddingLeft"
};
const BORDER_WIDTHS: Record<string, number> = { thin: 1, medium: 3, thick: 5 };

/** Colours anywhere in a value (a gradient's stops, a filter's drop-shadow) written as rgb() / rgba(). */
export function cssColorsIn (value: string, current: IgeCssColor): string {
	const fn = /^([a-z-]+)\(([\s\S]*)\)$/i.exec(value.trim());
	if (fn && !/^(rgba?|hsla?|color-mix|color|hwb|lab|lch|oklab|oklch)$/i.test(fn[1])) {
		const name = fn[1].toLowerCase();
		// (A gradient's bare 0 written with its unit: 0deg round a cone, else 0px)
		const zero = /conic-gradient$/.test(name) ? "0deg" : /gradient$/.test(name) ? "0px" : "0";
		let args = splitTop(fn[2], ",").map((arg) => splitTop(arg.trim(), " ").filter((t) => t).map((t) => (t === "0" ? zero : cssColorsIn(t, current))).join(" "));
		// A gradient's defaults left out, as a browser writes it (to bottom; ellipse, farthest-corner, at center)
		if (/linear-gradient$/.test(name) && (args[0] === "to bottom" || args[0] === "180deg")) args = args.slice(1);
		if (/radial-gradient$/.test(name) && args.length && !parseColor(splitTop(args[0], " ")[0] ?? "", current)) {
			const prelude = args[0].replace(/\bat (center|center center|50% 50%)$/, "").split(/\s+/).filter((t) => t && t !== "ellipse" && t !== "farthest-corner").join(" ");
			args = prelude ? [prelude, ...args.slice(1)] : args.slice(1);
		}
		return `${fn[1]}(${args.join(", ")})`;
	}
	if (/^-?[\d.]/.test(value)) return value;
	const c = parseColor(value, current);
	return c ? cssColor(c) : value;
}

/**
 * One property's computed value as a browser writes it (`box`: the element's laid out box, for margins and
 * paddings in px and for transforms' percentages; `dpr`: device pixels per CSS pixel, which border widths snap to).
 */
export function serializeComputed (name: string, cs: IgeUiComputedStyle, ctx: IgeCssLengthContext, box?: IgeUiBox, dpr: number = 1): string {
	const value = styleValue(cs, name);
	const current = parseColor(styleValue(cs, "color")) ?? { r: 0, g: 0, b: 0, a: 1 };
	if (COLOR_PROPS.has(name)) {
		const c = value === "auto" && name === "caret-color" ? current : parseColor(value, current);
		return c ? cssColor(c) : value;
	}
	const bw = /^(border-(top|right|bottom|left)|outline)-width$/.exec(name);
	if (bw) {
		const style = styleValue(cs, name.replace("-width", "-style"));
		if (style === "none" || style === "hidden") return "0px";
		const w = BORDER_WIDTHS[value] ?? resolveLength(value, ctx) ?? 0;
		// (Snapped to device pixels, as a browser draws them: never thinner than one)
		const snapped = w > 0 && w * dpr < 1 ? 1 / dpr : Math.floor(w * dpr + 1e-6) / dpr;
		return `${cssNumber(snapped)}px`;
	}
	const boxKey = BOX_LENGTHS[name];
	if (boxKey && box) return `${cssNumber(box[boxKey] as number)}px`;
	switch (name) {
		case "font-size":
			return `${cssNumber(parseFloat(value) || 16)}px`;
		case "font-weight":
			return value === "normal" ? "400" : value === "bold" ? "700" : value;
		case "letter-spacing":
		case "word-spacing": {
			if (value === "normal") return name === "letter-spacing" ? "normal" : "0px";
			const px = resolveLength(value, ctx);
			return px === undefined ? value : `${cssNumber(px)}px`;
		}
		case "line-height": {
			if (value === "normal") return value;
			if (/^-?[\d.]+$/.test(value)) return `${cssNumber(parseFloat(value) * ctx.em)}px`;
			const px = resolveLength(value, { ...ctx, percent: ctx.em });
			return px === undefined ? value : `${cssNumber(px)}px`;
		}
		case "opacity":
			return cssNumber(parseFloat(value));
		case "transform": {
			if (value === "none") return value;
			const m = parseTransform(value, box?.borderW ?? 0, box?.borderH ?? 0, ctx);
			return m ? `matrix(${m.map(cssNumber).join(", ")})` : "none";
		}
		case "box-shadow":
		case "text-shadow": {
			if (value === "none") return value;
			const list = parseShadows(value, ctx, current);
			if (!list.length) return "none";
			return list.map((s) => `${cssColor(s.color)} ${cssNumber(s.x)}px ${cssNumber(s.y)}px ${cssNumber(s.blur)}px${name === "box-shadow" ? ` ${cssNumber(s.spread)}px${s.inset ? " inset" : ""}` : ""}`).join(", ");
		}
		case "background-image":
		case "mask-image":
		case "filter":
			// (Split at the commas between its functions: the commas inside one are kept)
			return value === "none" ? value : splitTop(value, ",").map((f) => cssColorsIn(f.trim(), current)).join(", ");
		case "border-top-left-radius":
		case "border-top-right-radius":
		case "border-bottom-right-radius":
		case "border-bottom-left-radius":
			return splitTop(value, " ").filter((t) => t).map((t) => (t.endsWith("%") ? t : `${cssNumber(resolveLength(t, ctx) ?? 0)}px`)).join(" ");
		case "z-index":
			return value;
		default:
			return value;
	}
}
