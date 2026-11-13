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

/** One `(max-width: 760px)` test, or several joined by `or`. */
export interface IgeCssContainerCondition {
	/** The container's name (undefined: the nearest container). */
	name?: string;
	/** Any of these holds. */
	any: { feature: "width" | "height"; op: "max" | "min"; px: number }[];
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

/** "ui (max-width: 760px) or (max-height: 560px)" into a condition (undefined if it isn't one we read). */
export function parseContainerCondition (prelude: string): IgeCssContainerCondition | undefined {
	let text = prelude.trim();
	let name: string | undefined;
	const named = /^([a-zA-Z_-][\w-]*)\s+(?=\()/.exec(text);
	if (named && named[1] !== "not") {
		name = named[1];
		text = text.slice(named[0].length);
	}
	const any: IgeCssContainerCondition["any"] = [];
	for (const part of text.split(/\)\s*(?:or|,)\s*\(/)) {
		const m = /\(?\s*(max|min)-(width|height)\s*:\s*([\d.]+)px\s*\)?/.exec(part);
		if (!m) return undefined;
		any.push({ op: m[1] as "max" | "min", feature: m[2] as "width" | "height", px: Number(m[3]) });
	}
	return any.length ? { name, any } : undefined;
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
