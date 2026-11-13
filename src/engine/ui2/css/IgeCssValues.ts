/**
 * CSS values for the engine's UI: var() substitution, lengths (px em rem %
 * vw vh vmin vmax cqw cqh, calc() min() max() clamp()), colours (hex, rgb(),
 * hsl(), names, color-mix()), gradients, shadows and transforms.
 */
import { splitTop } from "@/engine/ui2/css/IgeCssParser";
import { flatTransformFunction } from "@/engine/ui2/css/IgeCssTransform3d";

/** What a length resolves against. */
export interface IgeCssLengthContext {
	/** The element's font size (em). */
	em: number;
	/** The root's font size (rem). */
	rem: number;
	/** What 100% is (undefined: a percentage can't resolve here). */
	percent?: number;
	/** The UI's own size (vw, vh: the UI is the viewport). */
	vw: number;
	vh: number;
	/** The nearest container's size (cqw, cqh). */
	cqw: number;
	cqh: number;
}

/** Replaces var(--name, fallback) from `lookup`, as deep as they nest. Undefined if one can't be (an invalid value). */
export function substituteVars (value: string, lookup: (name: string) => string | undefined, depth: number = 0): string | undefined {
	if (!value.includes("var(")) return value;
	if (depth > 20) return undefined;
	let out = "";
	let i = 0;
	while (i < value.length) {
		const at = value.indexOf("var(", i);
		if (at < 0) {
			out += value.slice(i);
			break;
		}
		out += value.slice(i, at);
		// The argument, to the matching bracket
		let d = 0, end = at + 3;
		for (; end < value.length; end++) {
			if (value[end] === "(") d++;
			else if (value[end] === ")") {
				d--;
				if (d === 0) break;
			}
		}
		const inner = value.slice(at + 4, end);
		const comma = splitTop(inner, ",");
		const name = comma[0].trim();
		const fallback = comma.length > 1 ? comma.slice(1).join(",").trim() : undefined;
		let v = lookup(name);
		if (v === undefined || v === "") v = fallback;
		if (v === undefined) return undefined;
		const sub = substituteVars(v, lookup, depth + 1);
		if (sub === undefined) return undefined;
		out += sub;
		i = end + 1;
	}
	return out;
}

// ---------------------------------------------------------------- lengths and calc()

type Tok = { t: "num"; v: number; unit: string } | { t: "op"; v: string } | { t: "fn"; v: string } | { t: "("; v: "(" } | { t: ")"; v: ")" } | { t: ","; v: "," };

function tokenize (text: string): Tok[] | undefined {
	const out: Tok[] = [];
	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		const num = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?([a-z%]*)/i.exec(text.slice(i));
		// (A sign is an operator after a number or ")")
		const prev = out[out.length - 1];
		const signAllowed = !prev || prev.t === "op" || prev.t === "(" || prev.t === "," || prev.t === "fn";
		if (num && (signAllowed || (ch !== "+" && ch !== "-"))) {
			out.push({ t: "num", v: parseFloat(num[0]), unit: num[1].toLowerCase() });
			i += num[0].length;
			continue;
		}
		if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
			out.push({ t: "op", v: ch });
			i++;
			continue;
		}
		if (ch === "(") {
			out.push({ t: "(", v: "(" });
			i++;
			continue;
		}
		if (ch === ")") {
			out.push({ t: ")", v: ")" });
			i++;
			continue;
		}
		if (ch === ",") {
			out.push({ t: ",", v: "," });
			i++;
			continue;
		}
		const fn = /^([a-z-]+)\(/i.exec(text.slice(i));
		if (fn) {
			out.push({ t: "fn", v: fn[1].toLowerCase() });
			i += fn[0].length;
			continue;
		}
		return undefined;
	}
	return out;
}

/** A value with its kind: a length in px (resolved), a plain number, or an angle in degrees. */
interface Quantity {
	v: number;
	kind: "len" | "num" | "deg";
}

function unitValue (v: number, unit: string, ctx: IgeCssLengthContext): Quantity | undefined {
	switch (unit) {
		case "": return { v, kind: "num" };
		case "px": return { v, kind: "len" };
		case "em": return { v: v * ctx.em, kind: "len" };
		case "rem": return { v: v * ctx.rem, kind: "len" };
		case "%": return ctx.percent === undefined ? undefined : { v: (v / 100) * ctx.percent, kind: "len" };
		case "vw": return { v: (v / 100) * ctx.vw, kind: "len" };
		case "vh": return { v: (v / 100) * ctx.vh, kind: "len" };
		case "vmin": return { v: (v / 100) * Math.min(ctx.vw, ctx.vh), kind: "len" };
		case "vmax": return { v: (v / 100) * Math.max(ctx.vw, ctx.vh), kind: "len" };
		case "cqw": case "cqi": return { v: (v / 100) * ctx.cqw, kind: "len" };
		case "cqh": case "cqb": return { v: (v / 100) * ctx.cqh, kind: "len" };
		case "cqmin": return { v: (v / 100) * Math.min(ctx.cqw, ctx.cqh), kind: "len" };
		case "cqmax": return { v: (v / 100) * Math.max(ctx.cqw, ctx.cqh), kind: "len" };
		case "pt": return { v: v * (4 / 3), kind: "len" };
		case "deg": return { v, kind: "deg" };
		case "rad": return { v: (v * 180) / Math.PI, kind: "deg" };
		case "turn": return { v: v * 360, kind: "deg" };
		case "s": return { v: v * 1000, kind: "num" };
		case "ms": return { v, kind: "num" };
		default: return undefined;
	}
}

class CalcParser {
	i = 0;
	constructor (readonly toks: Tok[], readonly ctx: IgeCssLengthContext) {}

	expr (): Quantity | undefined {
		let left = this.term();
		while (left && this.peek()?.t === "op" && (this.peek()!.v === "+" || this.peek()!.v === "-")) {
			const op = this.toks[this.i++].v;
			const right = this.term();
			if (!right) return undefined;
			left = { v: op === "+" ? left.v + right.v : left.v - right.v, kind: left.kind === "num" ? right.kind : left.kind };
		}
		return left;
	}

	term (): Quantity | undefined {
		let left = this.factor();
		while (left && this.peek()?.t === "op" && (this.peek()!.v === "*" || this.peek()!.v === "/")) {
			const op = this.toks[this.i++].v;
			const right = this.factor();
			if (!right) return undefined;
			if (op === "*") left = { v: left.v * right.v, kind: left.kind === "num" ? right.kind : left.kind };
			else left = { v: right.v === 0 ? 0 : left.v / right.v, kind: right.kind === "num" ? left.kind : "num" };
		}
		return left;
	}

	factor (): Quantity | undefined {
		const tok = this.toks[this.i++];
		if (!tok) return undefined;
		if (tok.t === "num") return unitValue(tok.v, tok.unit, this.ctx);
		if (tok.t === "(") {
			const v = this.expr();
			if (this.toks[this.i++]?.t !== ")") return undefined;
			return v;
		}
		if (tok.t === "op" && tok.v === "-") {
			const v = this.factor();
			return v && { v: -v.v, kind: v.kind };
		}
		if (tok.t === "fn") {
			const args: Quantity[] = [];
			if (this.peek()?.t !== ")") {
				for (;;) {
					const a = this.expr();
					if (!a) return undefined;
					args.push(a);
					if (this.peek()?.t === ",") {
						this.i++;
						continue;
					}
					break;
				}
			}
			if (this.toks[this.i++]?.t !== ")") return undefined;
			const kind = args.find((a) => a.kind !== "num")?.kind ?? "num";
			switch (tok.v) {
				case "calc": return args[0];
				case "min": return args.length ? { v: Math.min(...args.map((a) => a.v)), kind } : undefined;
				case "max": return args.length ? { v: Math.max(...args.map((a) => a.v)), kind } : undefined;
				case "clamp": return args.length === 3 ? { v: Math.max(args[0].v, Math.min(args[1].v, args[2].v)), kind } : undefined;
				case "abs": return args[0] && { v: Math.abs(args[0].v), kind };
				case "round": return args[0] && { v: Math.round(args[0].v), kind };
				default: return undefined;
			}
		}
		return undefined;
	}

	peek (): Tok | undefined {
		return this.toks[this.i];
	}
}

/** A numeric expression (a length, calc(), min() and the rest) in px; undefined if it isn't one (auto, a keyword) or can't resolve here. */
export function resolveLength (value: string, ctx: IgeCssLengthContext): number | undefined {
	const v = value.trim();
	if (!v || /^[a-z-]+$/i.test(v)) return undefined;
	const plain = /^(-?(?:\d+\.?\d*|\.\d+))(px)?$/.exec(v);
	if (plain) return parseFloat(plain[1]);
	const toks = tokenize(v);
	if (!toks) return undefined;
	const p = new CalcParser(toks, ctx);
	const q = p.expr();
	if (!q || p.i !== toks.length) return undefined;
	return q.v;
}

/** A plain number (opacity, flex-grow, line-height's factor), calc() allowed. */
export function resolveNumber (value: string, ctx?: IgeCssLengthContext): number | undefined {
	const v = value.trim();
	if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(v)) return parseFloat(v);
	const toks = tokenize(v);
	if (!toks) return undefined;
	const p = new CalcParser(toks, ctx ?? { em: 16, rem: 16, vw: 0, vh: 0, cqw: 0, cqh: 0 });
	const q = p.expr();
	return q && p.i === toks.length ? q.v : undefined;
}

/** A time in milliseconds ("0.2s", "150ms"). */
export function resolveTime (value: string): number | undefined {
	const m = /^(-?(?:\d+\.?\d*|\.\d+))(s|ms)$/.exec(value.trim());
	if (!m) return undefined;
	return m[2] === "s" ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
}

/** An angle in degrees. */
export function resolveAngle (value: string): number | undefined {
	const m = /^(-?(?:\d+\.?\d*|\.\d+))(deg|rad|turn|grad)?$/.exec(value.trim());
	if (!m) return undefined;
	const n = parseFloat(m[1]);
	switch (m[2]) {
		case "rad": return (n * 180) / Math.PI;
		case "turn": return n * 360;
		case "grad": return n * 0.9;
		default: return n;
	}
}

// ---------------------------------------------------------------- colours

/** A colour: r, g, b 0 to 255, a 0 to 1. */
export interface IgeCssColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

export const TRANSPARENT: IgeCssColor = { r: 0, g: 0, b: 0, a: 0 };

const NAMED: Record<string, string> = {
	black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", lime: "#00ff00", blue: "#0000ff", yellow: "#ffff00", cyan: "#00ffff", aqua: "#00ffff", magenta: "#ff00ff", fuchsia: "#ff00ff",
	gray: "#808080", grey: "#808080", silver: "#c0c0c0", orange: "#ffa500", purple: "#800080", pink: "#ffc0cb", gold: "#ffd700", navy: "#000080", teal: "#008080", maroon: "#800000", olive: "#808000",
	brown: "#a52a2a", coral: "#ff7f50", crimson: "#dc143c", darkgray: "#a9a9a9", lightgray: "#d3d3d3", whitesmoke: "#f5f5f5", orangered: "#ff4500", tomato: "#ff6347", skyblue: "#87ceeb", violet: "#ee82ee"
};

function hsl (h: number, s: number, l: number): [number, number, number] {
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** A colour, or undefined. `current` is currentColor. */
export function parseColor (value: string, current?: IgeCssColor): IgeCssColor | undefined {
	const v = value.trim().toLowerCase();
	if (v === "transparent") return { ...TRANSPARENT };
	if (v === "currentcolor") return current ? { ...current } : undefined;
	if (NAMED[v]) return parseColor(NAMED[v]);
	if (v[0] === "#") {
		const h = v.slice(1);
		if (!/^[0-9a-f]+$/.test(h)) return undefined;
		if (h.length === 3 || h.length === 4) {
			const c = [...h].map((x) => parseInt(x + x, 16));
			return { r: c[0], g: c[1], b: c[2], a: h.length === 4 ? c[3] / 255 : 1 };
		}
		if (h.length === 6 || h.length === 8) {
			return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
		}
		return undefined;
	}
	const fn = /^(rgba?|hsla?|color-mix)\(([\s\S]*)\)$/.exec(v);
	if (!fn) return undefined;
	if (fn[1] === "color-mix") {
		// color-mix(in srgb, A p%, B [q%])
		const parts = splitTop(fn[2], ",").map((p) => p.trim());
		if (parts.length !== 3) return undefined;
		const read = (p: string): [IgeCssColor | undefined, number | undefined] => {
			const m = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(p);
			return m ? [parseColor(m[1], current), Number(m[2]) / 100] : [parseColor(p, current), undefined];
		};
		const [c1, p1] = read(parts[1]), [c2, p2] = read(parts[2]);
		if (!c1 || !c2) return undefined;
		const w1 = p1 ?? (p2 !== undefined ? 1 - p2 : 0.5), w2 = p2 ?? 1 - w1;
		// Premultiplied, as the browser mixes
		const a = c1.a * w1 + c2.a * w2;
		const mix = (x1: number, x2: number) => (a > 0 ? (x1 * c1.a * w1 + x2 * c2.a * w2) / a : 0);
		return { r: mix(c1.r, c2.r), g: mix(c1.g, c2.g), b: mix(c1.b, c2.b), a };
	}
	const args = fn[2].replace(/\s*\/\s*/, " / ").split(/[\s,]+/).filter((x) => x && x !== "/");
	const num = (x: string, scale: number) => (x.endsWith("%") ? (parseFloat(x) / 100) * scale : parseFloat(x));
	if (fn[1].startsWith("rgb")) {
		if (args.length < 3) return undefined;
		return { r: num(args[0], 255), g: num(args[1], 255), b: num(args[2], 255), a: args[3] !== undefined ? num(args[3], 1) : 1 };
	}
	if (args.length < 3) return undefined;
	const [r, g, b] = hsl(parseFloat(args[0]), num(args[1], 1), num(args[2], 1));
	return { r, g, b, a: args[3] !== undefined ? num(args[3], 1) : 1 };
}

// ---------------------------------------------------------------- gradients

export interface IgeCssColorStop {
	color: IgeCssColor;
	/** 0 to 1 along the gradient (a conic one's angles as turns), if given (a length is kept as px to resolve against its line). */
	at?: number;
	atPx?: number;
}

export interface IgeCssGradient {
	type: "linear" | "radial" | "conic";
	/** Linear: the angle in degrees (0 up, 90 right, CSS's), or a corner ("to top right"). */
	angle?: number;
	toCorner?: [number, number];
	/** Radial: circle or ellipse, its centre (0 to 1 of the box) and size keyword. */
	shape?: "circle" | "ellipse";
	cx?: number;
	cy?: number;
	size?: "farthest-corner" | "closest-side" | "farthest-side" | "closest-corner";
	/** Radial: its radii given outright, as fractions of the box's width and height (an SVG radialGradient's r). */
	radii?: [number, number];
	/** Its stops' colours mixed as they are, not premultiplied by their alpha (an SVG gradient's, as Chrome mixes them). */
	unpremultiplied?: boolean;
	/** Conic: where it starts (degrees, clockwise from up). */
	from?: number;
	stops: IgeCssColorStop[];
	repeating?: boolean;
}

const POS: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };

/** linear-gradient() / radial-gradient() / conic-gradient(), or undefined. */
export function parseGradient (value: string, current?: IgeCssColor): IgeCssGradient | undefined {
	const m = /^(repeating-)?(linear|radial|conic)-gradient\(([\s\S]*)\)$/.exec(value.trim());
	if (!m) return undefined;
	const parts = splitTop(m[3], ",").map((p) => p.trim());
	const g: IgeCssGradient = { type: m[2] as "linear" | "radial" | "conic", stops: [], repeating: !!m[1] };
	let first = parts[0] ?? "";
	if (g.type === "conic") {
		g.from = 0;
		g.cx = 0.5;
		g.cy = 0.5;
		if (first && !parseColor(first.split(/\s+/)[0], current)) {
			const f = /\bfrom\s+(\S+)/.exec(first);
			if (f) g.from = resolveAngle(f[1]) ?? 0;
			const at = /\bat\s+(.+)$/.exec(first);
			if (at) {
				const words = at[1].trim().split(/\s+/);
				const read = (w: string) => (w in POS ? POS[w] : w.endsWith("%") ? parseFloat(w) / 100 : 0.5);
				g.cx = read(words[0]);
				g.cy = read(words[1] ?? "center");
			}
			parts.shift();
		}
	} else if (g.type === "linear") {
		const ang = resolveAngle(first);
		if (ang !== undefined) {
			g.angle = ang;
			parts.shift();
		} else if (first.startsWith("to ")) {
			const words = first.slice(3).split(/\s+/);
			let x = 0, y = 0;
			for (const w of words) {
				if (w === "left") x = -1;
				if (w === "right") x = 1;
				if (w === "top") y = -1;
				if (w === "bottom") y = 1;
			}
			if (x && y) g.toCorner = [x, y];
			else g.angle = x === 1 ? 90 : x === -1 ? 270 : y === -1 ? 0 : 180;
			parts.shift();
		} else g.angle = 180;
	} else {
		g.shape = "ellipse";
		g.cx = 0.5;
		g.cy = 0.5;
		g.size = "farthest-corner";
		if (first && !parseColor(first.split(/\s+/)[0], current)) {
			first = first.toLowerCase();
			if (/\bcircle\b/.test(first)) g.shape = "circle";
			for (const k of ["closest-side", "farthest-side", "closest-corner", "farthest-corner"] as const) if (first.includes(k)) g.size = k;
			const at = /\bat\s+(.+)$/.exec(first);
			if (at) {
				const words = at[1].trim().split(/\s+/);
				const read = (w: string, axis: "x" | "y") => (w in POS ? POS[w] : w.endsWith("%") ? parseFloat(w) / 100 : axis === "x" ? 0.5 : 0.5);
				if (words.length === 1) {
					if (words[0] === "top" || words[0] === "bottom") g.cy = POS[words[0]];
					else g.cx = read(words[0], "x");
				} else {
					g.cx = read(words[0], "x");
					g.cy = read(words[1], "y");
				}
			}
			parts.shift();
		}
	}
	for (const p of parts) {
		// "color [pos] [pos]"
		const toks = splitTop(p, " ").map((t) => t.trim()).filter(Boolean);
		const color = parseColor(toks[0], current);
		if (!color) return undefined;
		const posOf = (t: string): Partial<IgeCssColorStop> => {
			if (t.endsWith("%")) return { at: parseFloat(t) / 100 };
			if (g.type === "conic") {
				const a = resolveAngle(t) ?? (t === "0" ? 0 : undefined);
				return a !== undefined ? { at: a / 360 } : {};
			}
			return t.endsWith("px") ? { atPx: parseFloat(t) } : t === "0" ? { at: 0 } : {};
		};
		if (toks.length >= 3) {
			g.stops.push({ color, ...posOf(toks[1]) }, { color, ...posOf(toks[2]) });
		} else g.stops.push({ color, ...(toks[1] ? posOf(toks[1]) : {}) });
	}
	if (g.repeating && g.type === "conic") unrollConic(g);
	return g.stops.length ? g : undefined;
}

/**
 * A repeating conic gradient (a chip's stripes) written out round the whole turn: its stops copied once per period,
 * so it draws as a plain conic gradient. Left as it is when its period is a whole turn (nothing repeats), nothing, or
 * so short it would take more than 512 stops.
 */
function unrollConic (g: IgeCssGradient): void {
	const pos = g.stops.map((s) => s.at);
	if (pos[0] === undefined) pos[0] = 0;
	if (pos[pos.length - 1] === undefined) pos[pos.length - 1] = 1;
	for (let i = 1; i < pos.length; i++) if (pos[i] !== undefined && pos[i]! < pos[i - 1]!) pos[i] = pos[i - 1];
	for (let i = 0; i < pos.length; i++) {
		if (pos[i] !== undefined) continue;
		let j = i;
		while (pos[j] === undefined) j++;
		const a = pos[i - 1]!, b = pos[j]!;
		for (let k = i; k < j; k++) pos[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
	}
	const first = pos[0]!, period = pos[pos.length - 1]! - first;
	if (period >= 1 - 1e-6) {
		g.repeating = false;
		return;
	}
	if (period <= 1e-6 || (g.stops.length * (1 / period + 2)) > 512) return;
	const stops: IgeCssColorStop[] = [];
	// (From the copy that reaches the turn's start to the one that passes its end)
	for (let k = Math.floor(-first / period) - 1; first + k * period < 1; k++) {
		if (first + (k + 1) * period <= 0) continue;
		g.stops.forEach((s, i) => stops.push({ color: s.color, at: pos[i]! + k * period }));
	}
	g.stops = stops;
	g.repeating = false;
}

// ---------------------------------------------------------------- shadows

export interface IgeCssShadow {
	x: number;
	y: number;
	blur: number;
	spread: number;
	color: IgeCssColor;
	inset: boolean;
}

/** box-shadow / text-shadow lists. */
export function parseShadows (value: string, ctx: IgeCssLengthContext, current?: IgeCssColor): IgeCssShadow[] {
	const v = value.trim();
	if (!v || v === "none") return [];
	const out: IgeCssShadow[] = [];
	for (const part of splitTop(v, ",")) {
		const toks = splitTop(part.trim(), " ").map((t) => t.trim()).filter(Boolean);
		let inset = false, color: IgeCssColor | undefined;
		const lens: number[] = [];
		for (const t of toks) {
			if (t === "inset") inset = true;
			else {
				const len = resolveLength(t, ctx);
				if (len !== undefined && (/\d/.test(t[0]) || t[0] === "-" || t[0] === "." || t.startsWith("calc"))) lens.push(len);
				else color = parseColor(t, current);
			}
		}
		if (lens.length < 2) continue;
		out.push({ x: lens[0], y: lens[1], blur: lens[2] ?? 0, spread: lens[3] ?? 0, color: color ?? current ?? { r: 0, g: 0, b: 0, a: 1 }, inset });
	}
	return out;
}

// ---------------------------------------------------------------- transforms

/** A 2D transform: [a, b, c, d, e, f] (x' = a x + c y + e, y' = b x + d y + f). */
export type IgeCssMatrix = [number, number, number, number, number, number];

export const IDENTITY: IgeCssMatrix = [1, 0, 0, 1, 0, 0];

export function multiply (m: IgeCssMatrix, n: IgeCssMatrix): IgeCssMatrix {
	return [
		m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
		m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
		m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
	];
}

/** A transform list on a box (percentages of its own size); undefined if there's none. */
export function parseTransform (value: string, width: number, height: number, ctx: IgeCssLengthContext): IgeCssMatrix | undefined {
	const v = value.trim();
	if (!v || v === "none") return undefined;
	let m: IgeCssMatrix = [...IDENTITY];
	const re = /([a-zA-Z0-9]+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
	let found = false;
	for (let f = re.exec(v); f; f = re.exec(v)) {
		found = true;
		const name = f[1].toLowerCase();
		const args = splitTop(f[2], ",").flatMap((a) => (name.startsWith("translate") || name.startsWith("scale") ? splitTop(a.trim(), " ") : [a])).map((a) => a.trim()).filter(Boolean);
		const lenX = (a: string) => resolveLength(a, { ...ctx, percent: width }) ?? 0;
		const lenY = (a: string) => resolveLength(a, { ...ctx, percent: height }) ?? 0;
		let n: IgeCssMatrix = [...IDENTITY];
		switch (name) {
			case "translate": n = [1, 0, 0, 1, lenX(args[0] ?? "0"), lenY(args[1] ?? "0")]; break;
			case "translatex": n = [1, 0, 0, 1, lenX(args[0] ?? "0"), 0]; break;
			case "translatey": n = [1, 0, 0, 1, 0, lenY(args[0] ?? "0")]; break;
			case "translate3d": n = [1, 0, 0, 1, lenX(args[0] ?? "0"), lenY(args[1] ?? "0")]; break;
			case "scale": {
				const sx = resolveNumber(args[0] ?? "1") ?? 1, sy = args[1] !== undefined ? resolveNumber(args[1]) ?? sx : sx;
				n = [sx, 0, 0, sy, 0, 0];
				break;
			}
			case "scalex": n = [resolveNumber(args[0] ?? "1") ?? 1, 0, 0, 1, 0, 0]; break;
			case "scaley": n = [1, 0, 0, resolveNumber(args[0] ?? "1") ?? 1, 0, 0]; break;
			case "rotate": case "rotatez": {
				const r = ((resolveAngle(args[0] ?? "0") ?? 0) * Math.PI) / 180;
				n = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
				break;
			}
			case "matrix": {
				const k = args.flatMap((a) => a.split(/\s+/)).map(Number);
				if (k.length === 6) n = k as IgeCssMatrix;
				break;
			}
			// 3D and skew functions, seen straight on (IgeCssTransform3d)
			default: n = flatTransformFunction(name, args) ?? n; break;
		}
		m = multiply(m, n);
	}
	return found ? m : undefined;
}
