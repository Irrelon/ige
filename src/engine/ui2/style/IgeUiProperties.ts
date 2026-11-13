/**
 * The CSS properties the engine's UI knows: which inherit, their initial
 * values, and shorthands into longhands.
 */
import { splitTop } from "@/engine/ui2/css/IgeCssParser";
import { parseColor } from "@/engine/ui2/css/IgeCssValues";

export const INHERITED = new Set([
	"color", "font-family", "font-size", "font-style", "font-weight", "font-variant-numeric", "font-feature-settings", "letter-spacing", "word-spacing", "line-height", "text-align",
	"text-transform", "text-indent", "white-space", "word-break", "overflow-wrap", "word-wrap", "visibility", "cursor", "text-shadow", "pointer-events", "direction", "list-style-type",
	"-webkit-text-stroke", "tab-size", "user-select", "text-rendering", "-webkit-font-smoothing", "hyphens", "caret-color", "font-kerning", "text-wrap", "scrollbar-color",
	// (SVG's)
	"fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray",
	"stroke-dashoffset", "text-anchor", "dominant-baseline", "paint-order", "clip-rule", "shape-rendering"
]);

export const INITIAL: Record<string, string> = {
	display: "inline", position: "static", color: "#000000", "font-family": "sans-serif", "font-size": "16px", "font-style": "normal", "font-weight": "400", "letter-spacing": "normal",
	"word-spacing": "0px", "line-height": "normal", "text-align": "start", "text-transform": "none", "white-space": "normal", visibility: "visible", opacity: "1", "pointer-events": "auto",
	"box-sizing": "content-box", "background-color": "transparent", "background-image": "none", "background-size": "auto", "background-position": "0% 0%", "background-repeat": "repeat",
	"border-top-width": "medium", "border-right-width": "medium", "border-bottom-width": "medium", "border-left-width": "medium", "border-top-style": "none", "border-right-style": "none",
	"border-bottom-style": "none", "border-left-style": "none", "border-top-color": "currentcolor", "border-right-color": "currentcolor", "border-bottom-color": "currentcolor",
	"border-left-color": "currentcolor", "border-top-left-radius": "0px", "border-top-right-radius": "0px", "border-bottom-right-radius": "0px", "border-bottom-left-radius": "0px",
	"margin-top": "0px", "margin-right": "0px", "margin-bottom": "0px", "margin-left": "0px", "padding-top": "0px", "padding-right": "0px", "padding-bottom": "0px", "padding-left": "0px",
	width: "auto", height: "auto", "min-width": "auto", "min-height": "auto", "max-width": "none", "max-height": "none", top: "auto", right: "auto", bottom: "auto", left: "auto",
	"z-index": "auto", overflow: "visible", "overflow-x": "visible", "overflow-y": "visible", "flex-direction": "row", "flex-wrap": "nowrap", "justify-content": "normal", "align-items": "normal",
	"align-self": "auto", "justify-self": "auto", "align-content": "normal", "flex-grow": "0", "flex-shrink": "1", "flex-basis": "auto", order: "0", "row-gap": "normal", "column-gap": "normal",
	transform: "none", "transform-origin": "50% 50%", "box-shadow": "none", "text-shadow": "none", "clip-path": "none", "text-overflow": "clip", "vertical-align": "baseline",
	"table-layout": "auto", "border-collapse": "separate", "border-spacing": "0px", "grid-template-columns": "none", "grid-template-rows": "none", "grid-column": "auto", "grid-row": "auto",
	"grid-auto-flow": "row", "justify-items": "normal", "object-fit": "fill", "outline-width": "medium", "outline-style": "none", "outline-color": "currentcolor", "outline-offset": "0px",
	content: "normal", transition: "none", animation: "none", cursor: "auto", "word-break": "normal", "overflow-wrap": "normal", "text-indent": "0px", "aspect-ratio": "auto",
	filter: "none", "backdrop-filter": "none", "mix-blend-mode": "normal", "text-decoration-line": "none", "text-decoration-color": "currentcolor", "text-decoration-style": "solid", "text-decoration-thickness": "auto", "font-variant-numeric": "normal", "user-select": "auto", "container-type": "normal",
	"container-name": "none", "scrollbar-width": "auto", "scrollbar-gutter": "auto", "scrollbar-color": "auto", "overscroll-behavior": "auto", "list-style-type": "disc", float: "none", clear: "none", "image-rendering": "auto", "text-wrap": "wrap"
};

const SIDES = ["top", "right", "bottom", "left"] as const;

/** 1 to 4 values to the four sides. */
function fourSides (value: string): [string, string, string, string] {
	const v = splitTop(value.trim(), " ").map((x) => x.trim()).filter(Boolean);
	const [t, r = t, b = t, l = r] = v;
	return [t, r, b, l];
}

const BORDER_STYLES = new Set(["none", "hidden", "dotted", "dashed", "solid", "double", "groove", "ridge", "inset", "outset"]);

/** A border shorthand's width, style and colour. */
function borderParts (value: string): { width?: string; style?: string; color?: string } {
	const out: { width?: string; style?: string; color?: string } = {};
	for (const t of splitTop(value.trim(), " ").map((x) => x.trim()).filter(Boolean)) {
		if (BORDER_STYLES.has(t)) out.style = t;
		else if (/^(thin|medium|thick)$/.test(t) || /^[\d.]/.test(t) || t.startsWith("calc(") || t.startsWith("var(")) {
			// (A var() could be a colour: taken as one if it isn't a length's shape)
			if (t.startsWith("var(") && out.width !== undefined) out.color = t;
			else out.width = t;
		} else out.color = t;
	}
	return out;
}

/** The keywords every property takes (a shorthand given one sets each of its longhands to it). */
const CSS_WIDE = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

/** A shorthand into its longhands (undefined: it isn't one). */
export function expandShorthand (name: string, value: string): [string, string][] | undefined {
	const v = value.trim();
	// font: inherit, margin: unset…: every longhand to the keyword (flex: initial has its own values, below)
	if (CSS_WIDE.has(v.toLowerCase()) && name !== "flex") {
		const keys = shorthandKeys(name);
		return keys ? keys.map((k) => [k, v.toLowerCase()]) : undefined;
	}
	switch (name) {
		case "margin": case "padding": {
			const s = fourSides(v);
			return SIDES.map((side, i) => [`${name}-${side}`, s[i]]);
		}
		case "inset": {
			const s = fourSides(v);
			return SIDES.map((side, i) => [side, s[i]]);
		}
		case "border-width": case "border-style": case "border-color": {
			const s = fourSides(v);
			const kind = name.slice(7);
			return SIDES.map((side, i) => [`border-${side}-${kind}`, s[i]]);
		}
		case "border": case "border-top": case "border-right": case "border-bottom": case "border-left": {
			const p = borderParts(v);
			const sides = name === "border" ? SIDES : [name.slice(7) as typeof SIDES[number]];
			const out: [string, string][] = [];
			for (const side of sides) {
				out.push([`border-${side}-width`, p.width ?? (p.style && p.style !== "none" ? "medium" : "medium")]);
				out.push([`border-${side}-style`, p.style ?? (v === "none" || v === "0" ? "none" : "solid")]);
				out.push([`border-${side}-color`, p.color ?? "currentcolor"]);
			}
			if (v === "none" || v === "0") for (const side of sides) out.push([`border-${side}-style`, "none"]);
			return out;
		}
		case "border-radius": {
			// (After a "/": the vertical radii, each corner's then "horizontal vertical")
			const [h, vr] = v.split("/");
			const s = fourSides(h);
			const t = vr !== undefined ? fourSides(vr) : undefined;
			const corner = (i: number) => (t && t[i] !== s[i] ? `${s[i]} ${t[i]}` : s[i]);
			return [["border-top-left-radius", corner(0)], ["border-top-right-radius", corner(1)], ["border-bottom-right-radius", corner(2)], ["border-bottom-left-radius", corner(3)]];
		}
		case "outline": {
			const p = borderParts(v);
			return [["outline-width", p.width ?? "medium"], ["outline-style", p.style ?? (v === "none" || v === "0" ? "none" : "solid")], ["outline-color", p.color ?? "currentcolor"]];
		}
		case "overflow": {
			const [x, y = x] = v.split(/\s+/);
			return [["overflow-x", x], ["overflow-y", y], ["overflow", v]];
		}
		case "gap": case "grid-gap": {
			const [r, c = r] = splitTop(v, " ").map((x) => x.trim()).filter(Boolean);
			return [["row-gap", r], ["column-gap", c]];
		}
		case "flex": {
			if (v === "none") return [["flex-grow", "0"], ["flex-shrink", "0"], ["flex-basis", "auto"]];
			if (v === "auto") return [["flex-grow", "1"], ["flex-shrink", "1"], ["flex-basis", "auto"]];
			if (v === "initial") return [["flex-grow", "0"], ["flex-shrink", "1"], ["flex-basis", "auto"]];
			const parts = splitTop(v, " ").map((x) => x.trim()).filter(Boolean);
			const nums = parts.filter((p) => /^-?[\d.]+$/.test(p));
			const basis = parts.find((p) => !/^-?[\d.]+$/.test(p));
			return [["flex-grow", nums[0] ?? "1"], ["flex-shrink", nums[1] ?? "1"], ["flex-basis", basis ?? (nums.length ? "0%" : "auto")]];
		}
		case "flex-flow": {
			const out: [string, string][] = [];
			for (const p of v.split(/\s+/)) out.push([/wrap/.test(p) ? "flex-wrap" : "flex-direction", p]);
			return out;
		}
		case "place-items": {
			const [a, j = a] = v.split(/\s+/);
			return [["align-items", a], ["justify-items", j]];
		}
		case "place-content": {
			const [a, j = a] = v.split(/\s+/);
			return [["align-content", a], ["justify-content", j]];
		}
		case "place-self": {
			const [a, j = a] = v.split(/\s+/);
			return [["align-self", a], ["justify-self", j]];
		}
		case "background": {
			// Colour (the last layer's), images (gradients, url()), size after "/" (kept simple)
			const layers = splitTop(v, ",").map((x) => x.trim());
			const images: string[] = [];
			let color = "transparent";
			for (let i = 0; i < layers.length; i++) {
				const toks = splitTop(layers[i], " ").map((x) => x.trim()).filter(Boolean);
				let image = "none";
				for (const t of toks) {
					if (/^(repeating-)?(linear|radial|conic)-gradient\(|^url\(/.test(t)) image = t;
					else if (i === layers.length - 1 && (parseColor(t) || t.startsWith("var(") || t.startsWith("color-mix("))) color = t;
				}
				images.push(image);
			}
			return [["background-color", color], ["background-image", images.every((x) => x === "none") ? "none" : images.join(", ")]];
		}
		case "font": return expandFont(v);
		case "text-decoration": {
			// Its lines, style, thickness and colour, in any order
			const lines: string[] = [];
			let style = "solid", thickness = "auto", color = "currentcolor";
			for (const t of splitTop(v.trim(), " ").map((x) => x.trim()).filter(Boolean)) {
				if (/^(underline|overline|line-through|blink|none)$/.test(t)) lines.push(t);
				else if (/^(solid|double|dotted|dashed|wavy)$/.test(t)) style = t;
				else if (t === "auto" || t === "from-font" || /^-?[\d.]+(px|em|rem|%)$/.test(t) || t.startsWith("calc(")) thickness = t;
				else color = t;
			}
			return [["text-decoration-line", lines.filter((l) => l !== "none").join(" ") || "none"], ["text-decoration-style", style], ["text-decoration-thickness", thickness], ["text-decoration-color", color]];
		}
		case "grid-area": return undefined;
		case "grid-column": case "grid-row": return [[name, v]];
		case "container": {
			const [n, t] = v.split("/").map((x) => x.trim());
			return [["container-name", n ?? "none"], ["container-type", t ?? "normal"]];
		}
		case "word-wrap": return [["overflow-wrap", v]];
		case "list-style": return [["list-style-type", v.split(/\s+/)[0]]];
		default: return undefined;
	}
}

/** The longhands a shorthand sets (undefined: not a shorthand). */
export function shorthandKeys (name: string): string[] | undefined {
	for (const sample of ["0", "none", "normal 16px serif", "1px solid red"]) {
		const longs = expandShorthand(name, sample);
		if (longs) return longs.map(([k]) => k);
	}
	return undefined;
}

/**
 * The font shorthand: [style] [variant] [weight] size[/line-height] family. Words are read at the top level, so a size
 * written with nested functions (calc(clamp(30px, 3vw, 50px) * 0.36)) stays one word.
 */
function expandFont (v: string): [string, string][] | undefined {
	const words: string[] = [];
	let depth = 0, cur = "";
	for (const ch of v.trim()) {
		if (ch === "(") depth++;
		else if (ch === ")") depth--;
		if (/\s/.test(ch) && depth === 0) {
			if (cur) words.push(cur);
			cur = "";
		} else cur += ch;
	}
	if (cur) words.push(cur);
	let style = "normal", weight = "400", i = 0;
	for (; i < words.length; i++) {
		const w = words[i].toLowerCase();
		if (w === "italic" || w === "oblique") style = w;
		else if (w === "bold" || w === "bolder" || w === "lighter" || /^\d{3}$/.test(w)) weight = w;
		else if (w !== "normal" && w !== "small-caps") break;
	}
	// The size (with its line height after a slash, written together or apart), then the family
	let size = words[i] ?? "", lh = "normal", j = i + 1;
	if (!size) return undefined;
	const slash = size.indexOf("/");
	if (slash > 0 && !size.includes("(")) {
		lh = size.slice(slash + 1) || words[j++] || "normal";
		size = size.slice(0, slash);
	} else if (words[j] === "/") {
		lh = words[j + 1] ?? "normal";
		j += 2;
	} else if (words[j]?.startsWith("/")) {
		lh = words[j].slice(1) || words[j + 1] || "normal";
		j += words[j].length > 1 ? 1 : 2;
	}
	const family = words.slice(j).join(" ");
	if (!family || !/^([\d.]+[a-z%]*|var\(|calc\(|min\(|max\(|clamp\()/i.test(size)) return undefined;
	return [["font-style", style], ["font-weight", weight], ["font-size", size], ["font-family", family], ["line-height", lh]];
}
