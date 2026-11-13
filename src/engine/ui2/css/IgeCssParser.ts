/**
 * A CSS parser for the engine's UI (ui2): stylesheets into rules, @container
 * and @keyframes blocks, and declarations (with !important). It reads real
 * stylesheets written for browsers: comments, strings, nested functions
 * (calc(), var(), linear-gradient()) and at-rules it doesn't use (@media
 * other than prefers-reduced-motion, @font-face, @import) are passed over.
 */

export interface IgeCssDeclaration {
	/** Lowercased property name (custom properties keep their case: --ui-scale). */
	name: string;
	value: string;
	important: boolean;
}

export interface IgeCssStyleRule {
	type: "style";
	/** The selector list as written ("a, b > c"). */
	selector: string;
	declarations: IgeCssDeclaration[];
	/** The @container conditions it sits under (all must hold), if any. */
	container?: IgeCssContainerCondition[];
	/** Its place among all the rules (for the cascade's order). */
	order: number;
}

/** A container query's test: a size feature against a value, or tests joined by and, or, not. */
export type IgeCssContainerQuery =
	| { t: "f"; feature: "width" | "height" | "aspect-ratio"; op: "<" | "<=" | ">" | ">=" | "="; v: number }
	| { t: "orientation"; v: "portrait" | "landscape" }
	| { t: "and" | "or"; of: IgeCssContainerQuery[] }
	| { t: "not"; q: IgeCssContainerQuery };

/** An @container's condition: a container (by name, or the nearest) and the query its size must meet. */
export interface IgeCssContainerCondition {
	/** The container's name (undefined: the nearest container). */
	name?: string;
	query: IgeCssContainerQuery;
}

/** Whether a container of this size meets a query. */
export function containerQueryHolds (q: IgeCssContainerQuery, w: number, h: number): boolean {
	switch (q.t) {
		case "and": return q.of.every((x) => containerQueryHolds(x, w, h));
		case "or": return q.of.some((x) => containerQueryHolds(x, w, h));
		case "not": return !containerQueryHolds(q.q, w, h);
		case "orientation": return q.v === (h >= w ? "portrait" : "landscape");
		case "f": {
			const x = q.feature === "width" ? w : q.feature === "height" ? h : h > 0 ? w / h : 0;
			// (A hair either way: sizes are laid out in fractions)
			const e = 1e-6;
			return q.op === "<" ? x < q.v - e : q.op === "<=" ? x <= q.v + e : q.op === ">" ? x > q.v + e : q.op === ">=" ? x >= q.v - e : Math.abs(x - q.v) <= e;
		}
	}
}

export interface IgeCssKeyframes {
	name: string;
	/** Offsets 0 to 1, each with its declarations. */
	frames: { offset: number; declarations: IgeCssDeclaration[] }[];
}

export interface IgeCssStylesheet {
	rules: IgeCssStyleRule[];
	keyframes: Map<string, IgeCssKeyframes>;
}

let ruleOrder = 0;

/** Strips comments, keeping strings intact. */
export function stripComments (css: string): string {
	let out = "";
	for (let i = 0; i < css.length; i++) {
		const ch = css[i];
		if (ch === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			i = end < 0 ? css.length : end + 1;
			continue;
		}
		if (ch === "\"" || ch === "'") {
			const start = i;
			for (i++; i < css.length && css[i] !== ch; i++) if (css[i] === "\\") i++;
			out += css.slice(start, i + 1);
			continue;
		}
		out += ch;
	}
	return out;
}

/** Index of the brace closing the block opened at `open` (strings and nesting allowed for). */
function blockEnd (css: string, open: number): number {
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		const ch = css[i];
		if (ch === "\"" || ch === "'") {
			for (i++; i < css.length && css[i] !== ch; i++) if (css[i] === "\\") i++;
			continue;
		}
		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return css.length;
}

/** Splits at a separator character outside brackets and strings. */
export function splitTop (text: string, sep: string): string[] {
	const out: string[] = [];
	let depth = 0, start = 0;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === "\"" || ch === "'") {
			for (i++; i < text.length && text[i] !== ch; i++) if (text[i] === "\\") i++;
			continue;
		}
		if (ch === "(" || ch === "[") depth++;
		else if (ch === ")" || ch === "]") depth--;
		else if (ch === sep && depth === 0) {
			out.push(text.slice(start, i));
			start = i + 1;
		}
	}
	out.push(text.slice(start));
	return out;
}

/** A declaration block's text ("color: red; padding: 2px !important") into declarations. */
export function parseDeclarations (text: string): IgeCssDeclaration[] {
	const out: IgeCssDeclaration[] = [];
	for (const part of splitTop(text, ";")) {
		const colon = part.indexOf(":");
		if (colon < 0) continue;
		const rawName = part.slice(0, colon).trim();
		if (!rawName) continue;
		const name = rawName.startsWith("--") ? rawName : rawName.toLowerCase();
		let value = part.slice(colon + 1).trim();
		let important = false;
		const bang = /!\s*important\s*$/i.exec(value);
		if (bang) {
			important = true;
			value = value.slice(0, bang.index).trim();
		}
		out.push({ name, value, important });
	}
	return out;
}

/**
 * "ui (max-width: 900px) and (min-height: 561px)" into a condition (undefined if it isn't one we read): a name, then a
 * query of size features ((max-width: 760px), (width > 500px), (400px <= width <= 800px), (orientation: portrait),
 * (aspect-ratio: 16/9)) joined by and, or (or a comma), not, and parentheses, as CSS has them.
 */
export function parseContainerCondition (prelude: string): IgeCssContainerCondition | undefined {
	let text = prelude.trim();
	let name: string | undefined;
	const named = /^([a-zA-Z_-][\w-]*)\s*(?=\(|$)/.exec(text);
	if (named && !/^(not|and|or)$/i.test(named[1])) {
		name = named[1];
		text = text.slice(named[0].length).trim();
	}
	// (A comma between queries: any of them)
	const parts = splitTop(text, ",").map((x) => x.trim()).filter(Boolean);
	const qs = parts.map(parseContainerQuery);
	if (!qs.length || qs.some((q) => !q)) return undefined;
	return { name, query: qs.length === 1 ? qs[0]! : { t: "or", of: qs as IgeCssContainerQuery[] } };
}

/** A container query (not, and, or, parentheses, size features); undefined if it isn't one we read. */
function parseContainerQuery (text: string): IgeCssContainerQuery | undefined {
	text = text.trim();
	const not = /^not\s+/i.exec(text);
	if (not) {
		const q = parseContainerQuery(text.slice(not[0].length));
		return q && { t: "not", q };
	}
	// Each (…) at the top level, and the words between them
	const items: (IgeCssContainerQuery | "and" | "or")[] = [];
	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		if (ch === "(") {
			let depth = 0, j = i;
			for (; j < text.length; j++) {
				if (text[j] === "(") depth++;
				else if (text[j] === ")" && --depth === 0) break;
			}
			if (j >= text.length) return undefined;
			const inner = text.slice(i + 1, j).trim();
			const q = /^(\(|not\s)/i.test(inner) ? parseContainerQuery(inner) : parseSizeFeature(inner);
			if (!q) return undefined;
			items.push(q);
			i = j + 1;
			continue;
		}
		const word = /^(and|or)\b/i.exec(text.slice(i));
		if (!word) return undefined;
		items.push(word[1].toLowerCase() as "and" | "or");
		i += word[0].length;
	}
	// (Tests and words in turn, a test first and last; and and or not mixed without parentheses)
	if (items.length % 2 === 0 || !items.every((x, k) => (k % 2 === 0) === (typeof x !== "string"))) return undefined;
	const joins = new Set(items.filter((x) => typeof x === "string"));
	if (joins.size > 1) return undefined;
	const qs = items.filter((x): x is IgeCssContainerQuery => typeof x !== "string");
	return qs.length === 1 ? qs[0] : { t: joins.has("or") ? "or" : "and", of: qs };
}

/** A length or ratio in a container query: px, em and rem (16px), or a/b. */
function queryValue (v: string): number | undefined {
	const t = v.trim();
	const ratio = /^([\d.]+)\s*\/\s*([\d.]+)$/.exec(t);
	if (ratio) return Number(ratio[1]) / Number(ratio[2]);
	const m = /^(-?[\d.]+)(px|em|rem)?$/i.exec(t);
	if (!m) return undefined;
	const n = Number(m[1]);
	if (!Number.isFinite(n)) return undefined;
	return m[2] && /r?em/i.test(m[2]) ? n * 16 : n;
}

const QUERY_FEATURES: Record<string, "width" | "height" | "aspect-ratio"> = { width: "width", "inline-size": "width", height: "height", "block-size": "height", "aspect-ratio": "aspect-ratio" };

/** One size feature: (max-width: 900px), (orientation: portrait), or a range: (width > 500px), (400px <= width <= 800px). */
function parseSizeFeature (inner: string): IgeCssContainerQuery | undefined {
	const colon = /^([a-z-]+)\s*:\s*(.+)$/i.exec(inner);
	if (colon) {
		const name = colon[1].toLowerCase(), value = colon[2].trim();
		if (name === "orientation") return /^(portrait|landscape)$/i.test(value) ? { t: "orientation", v: value.toLowerCase() as "portrait" | "landscape" } : undefined;
		const prefix = /^(min|max)-(.+)$/.exec(name);
		const feature = QUERY_FEATURES[prefix ? prefix[2] : name];
		const v = queryValue(value);
		if (!feature || v === undefined) return undefined;
		return { t: "f", feature, op: prefix ? (prefix[1] === "min" ? ">=" : "<=") : "=", v };
	}
	// Range syntax: value op feature op value, or feature op value, or value op feature
	const parts = inner.split(/\s*(<=|>=|<|>|=)\s*/).map((x) => x.trim());
	if (parts.length !== 3 && parts.length !== 5) return undefined;
	const flip: Record<string, "<" | "<=" | ">" | ">=" | "="> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "=": "=" };
	const tests: IgeCssContainerQuery[] = [];
	if (parts.length === 3) {
		const [a, op, b] = parts;
		const fa = QUERY_FEATURES[a.toLowerCase()], fb = QUERY_FEATURES[b.toLowerCase()];
		if (fa && queryValue(b) !== undefined) tests.push({ t: "f", feature: fa, op: op as "<", v: queryValue(b)! });
		else if (fb && queryValue(a) !== undefined) tests.push({ t: "f", feature: fb, op: flip[op], v: queryValue(a)! });
		else return undefined;
	} else {
		const [a, op1, f, op2, b] = parts;
		const feature = QUERY_FEATURES[f.toLowerCase()];
		const va = queryValue(a), vb = queryValue(b);
		if (!feature || va === undefined || vb === undefined) return undefined;
		tests.push({ t: "f", feature, op: flip[op1], v: va }, { t: "f", feature, op: op2 as "<", v: vb });
	}
	return tests.length === 1 ? tests[0] : { t: "and", of: tests };
}

function parseKeyframes (name: string, body: string): IgeCssKeyframes {
	const frames: IgeCssKeyframes["frames"] = [];
	let i = 0;
	while (i < body.length) {
		const open = body.indexOf("{", i);
		if (open < 0) break;
		const close = blockEnd(body, open);
		const selectors = body.slice(i, open).trim();
		const declarations = parseDeclarations(body.slice(open + 1, close));
		for (const s of selectors.split(",")) {
			const t = s.trim().toLowerCase();
			const offset = t === "from" ? 0 : t === "to" ? 1 : Number(t.replace("%", "")) / 100;
			if (Number.isFinite(offset)) frames.push({ offset, declarations });
		}
		i = close + 1;
	}
	frames.sort((a, b) => a.offset - b.offset);
	return { name, frames };
}

/** Parses a stylesheet. */
export function parseStylesheet (css: string): IgeCssStylesheet {
	const sheet: IgeCssStylesheet = { rules: [], keyframes: new Map() };
	parseInto(stripComments(css), sheet, undefined);
	return sheet;
}

function parseInto (css: string, sheet: IgeCssStylesheet, container: IgeCssContainerCondition[] | undefined): void {
	let i = 0;
	while (i < css.length) {
		const open = css.indexOf("{", i);
		if (open < 0) break;
		// (A statement at-rule before it, "@import url(x);", ends at its semicolon)
		const prelude = (css.slice(i, open).split(";").pop() ?? "").replace(/^\s*}+/, "").trim();
		const close = blockEnd(css, open);
		const body = css.slice(open + 1, close);
		i = close + 1;
		if (!prelude) continue;
		if (prelude.startsWith("@")) {
			const at = /^@([\w-]+)\s*([\s\S]*)$/.exec(prelude);
			if (!at) continue;
			const kind = at[1].toLowerCase(), rest = at[2].trim();
			if (kind === "container") {
				const cond = parseContainerCondition(rest);
				if (cond) parseInto(body, sheet, [...(container ?? []), cond]);
			} else if (kind === "keyframes" || kind === "-webkit-keyframes") {
				sheet.keyframes.set(rest, parseKeyframes(rest, body));
			} else if (kind === "supports") {
				parseInto(body, sheet, container);
			}
			// (@media, @font-face and the rest: the screen's the engine's own, the fonts are loaded by the page)
			continue;
		}
		sheet.rules.push({ type: "style", selector: prelude, declarations: parseDeclarations(body), container, order: ruleOrder++ });
	}
}
