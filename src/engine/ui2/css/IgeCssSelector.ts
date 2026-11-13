/**
 * CSS selectors for the engine's UI: parsed once, matched against elements,
 * with their specificity. Type, universal, #id, .class, attribute tests,
 * pseudo-classes (:hover :focus :focus-visible :focus-within :active
 * :disabled :enabled :checked :empty :root :first-child :last-child
 * :only-child :nth-child() :nth-last-child() :first-of-type :last-of-type
 * :not() :is() :where() :has()), ::before and ::after, and the descendant,
 * child (>), next (+) and later (~) combinators.
 */

/** What a selector needs of an element. */
export interface IgeCssMatchable {
	readonly localName: string;
	readonly id: string;
	hasClass (name: string): boolean;
	getAttribute (name: string): string | null;
	readonly parentElement: IgeCssMatchable | null;
	readonly previousElementSibling: IgeCssMatchable | null;
	readonly nextElementSibling: IgeCssMatchable | null;
	readonly elementChildren: readonly IgeCssMatchable[];
	/** Interaction states: "hover", "focus", "focus-visible", "active". */
	hasState (state: string): boolean;
	readonly isDisabled: boolean;
	readonly isChecked: boolean;
	readonly isEmpty: boolean;
	readonly isRoot: boolean;
}

type AttrOp = "" | "=" | "~=" | "|=" | "^=" | "$=" | "*=";

interface SimpleTest {
	kind: "tag" | "id" | "class" | "attr" | "pseudo";
	name: string;
	op?: AttrOp;
	value?: string;
	caseInsensitive?: boolean;
	/** :not() :is() :where() arguments, :has() relative selectors, :nth-child(a b). */
	args?: IgeCssSelector[];
	relative?: { combinator: Combinator; selector: IgeCssSelector }[];
	nth?: [number, number];
}

type Combinator = " " | ">" | "+" | "~";

interface Compound {
	tests: SimpleTest[];
	/** How it's joined to the compound before it. */
	combinator: Combinator;
}

export interface IgeCssSelector {
	text: string;
	/** Left to right. */
	compounds: Compound[];
	/** [ids, classes, types]. */
	specificity: [number, number, number];
	/** ::before / ::after, if it selects one. */
	pseudoElement?: "before" | "after" | "placeholder";
	/** Something it can't do (a pseudo-element it doesn't draw, an unknown pseudo-class): it never matches. */
	unsupported?: boolean;
	/** The states it depends on anywhere (an element's style is looked at again when one changes). */
	states: Set<string>;
}

const STATES = new Set(["hover", "focus", "focus-visible", "focus-within", "active"]);

function parseNth (arg: string): [number, number] | undefined {
	const t = arg.replace(/\s+/g, "").toLowerCase();
	if (t === "odd") return [2, 1];
	if (t === "even") return [2, 0];
	const m = /^([+-]?\d*)n([+-]\d+)?$/.exec(t);
	if (m) {
		const a = m[1] === "" || m[1] === "+" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
		return [a, m[2] ? Number(m[2]) : 0];
	}
	if (/^[+-]?\d+$/.test(t)) return [0, Number(t)];
	return undefined;
}

/** The text of a bracketed argument starting at `i` (the "("); returns it and the index after ")". */
function readParens (text: string, i: number): [string, number] {
	let depth = 0;
	for (let j = i; j < text.length; j++) {
		if (text[j] === "(") depth++;
		else if (text[j] === ")") {
			depth--;
			if (depth === 0) return [text.slice(i + 1, j), j + 1];
		}
	}
	return [text.slice(i + 1), text.length];
}

const IDENT = /^-?[_a-zA-Z -￿][\w -￿-]*/;

/** Parses a comma-separated selector list. */
export function parseSelectorList (text: string): IgeCssSelector[] {
	const out: IgeCssSelector[] = [];
	let depth = 0, start = 0;
	for (let i = 0; i <= text.length; i++) {
		const ch = text[i];
		if (ch === "(" || ch === "[") depth++;
		else if (ch === ")" || ch === "]") depth--;
		else if ((ch === "," && depth === 0) || i === text.length) {
			const part = text.slice(start, i).trim();
			if (part) out.push(parseSelector(part));
			start = i + 1;
		}
	}
	return out;
}

/** Parses one complex selector ("ul > li.on:hover a"). */
export function parseSelector (text: string): IgeCssSelector {
	const sel: IgeCssSelector = { text, compounds: [], specificity: [0, 0, 0], states: new Set() };
	let i = 0;
	let combinator: Combinator = " ";
	let current: Compound | undefined;
	const add = (test: SimpleTest) => {
		if (!current) {
			current = { tests: [], combinator };
			sel.compounds.push(current);
		}
		current.tests.push(test);
	};
	while (i < text.length) {
		const ch = text[i];
		if (/\s/.test(ch) || ch === ">" || ch === "+" || ch === "~") {
			// A combinator (whitespace alone is a descendant)
			let comb: Combinator = " ";
			while (i < text.length && /[\s>+~]/.test(text[i])) {
				if (text[i] !== " " && text[i] !== "\t" && text[i] !== "\n") comb = text[i] as Combinator;
				i++;
			}
			if (current) {
				combinator = comb;
				current = undefined;
			} else combinator = comb;
			continue;
		}
		if (ch === "*") {
			add({ kind: "tag", name: "*" });
			i++;
			continue;
		}
		if (ch === "#" || ch === ".") {
			const m = IDENT.exec(text.slice(i + 1));
			if (!m) {
				sel.unsupported = true;
				break;
			}
			add({ kind: ch === "#" ? "id" : "class", name: m[0].replace(/\\/g, "") });
			sel.specificity[ch === "#" ? 0 : 1]++;
			i += 1 + m[0].length;
			continue;
		}
		if (ch === "[") {
			const end = text.indexOf("]", i);
			const body = text.slice(i + 1, end < 0 ? text.length : end).trim();
			i = end < 0 ? text.length : end + 1;
			const m = /^([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?\s*(i)?$/.exec(body);
			if (!m) {
				sel.unsupported = true;
				break;
			}
			add({ kind: "attr", name: m[1].toLowerCase(), op: (m[2] ?? "") as AttrOp, value: m[3] ?? m[4] ?? m[5], caseInsensitive: !!m[6] });
			sel.specificity[1]++;
			continue;
		}
		if (ch === ":") {
			const element = text[i + 1] === ":";
			const m = IDENT.exec(text.slice(i + (element ? 2 : 1)));
			if (!m) {
				sel.unsupported = true;
				break;
			}
			const name = m[0].toLowerCase();
			i += (element ? 2 : 1) + m[0].length;
			let arg: string | undefined;
			if (text[i] === "(") [arg, i] = readParens(text, i);
			if (element || name === "before" || name === "after") {
				if (name === "before" || name === "after" || name === "placeholder") {
					sel.pseudoElement = name;
					sel.specificity[2]++;
				} else sel.unsupported = true;
				continue;
			}
			const test: SimpleTest = { kind: "pseudo", name };
			if (name === "not" || name === "is" || name === "where" || name === "matches") {
				test.args = parseSelectorList(arg ?? "");
				if (name !== "where") {
					const best = test.args.reduce<[number, number, number]>((a, s) => (compareSpecificity(s.specificity, a) > 0 ? s.specificity : a), [0, 0, 0]);
					sel.specificity = [sel.specificity[0] + best[0], sel.specificity[1] + best[1], sel.specificity[2] + best[2]];
				}
				for (const a of test.args) for (const s of a.states) sel.states.add(s);
			} else if (name === "has") {
				test.relative = [];
				for (const part of splitRelative(arg ?? "")) {
					const t = part.trim();
					const comb: Combinator = t[0] === ">" || t[0] === "+" || t[0] === "~" ? (t[0] as Combinator) : " ";
					const selector = parseSelector(comb === " " ? t : t.slice(1).trim());
					test.relative.push({ combinator: comb, selector });
					for (const s of selector.states) sel.states.add(s);
					const sp = selector.specificity;
					sel.specificity = [sel.specificity[0] + sp[0], sel.specificity[1] + sp[1], sel.specificity[2] + sp[2]];
				}
			} else if (name === "nth-child" || name === "nth-last-child" || name === "nth-of-type" || name === "nth-last-of-type") {
				test.nth = parseNth(arg ?? "");
				if (!test.nth) sel.unsupported = true;
				sel.specificity[1]++;
			} else {
				if (!KNOWN_PSEUDO.has(name)) sel.unsupported = true;
				if (STATES.has(name)) sel.states.add(name);
				sel.specificity[1]++;
			}
			add(test);
			continue;
		}
		const m = IDENT.exec(text.slice(i));
		if (!m) {
			sel.unsupported = true;
			break;
		}
		add({ kind: "tag", name: m[0].toLowerCase() });
		sel.specificity[2]++;
		i += m[0].length;
	}
	return sel;
}

const KNOWN_PSEUDO = new Set(["hover", "focus", "focus-visible", "focus-within", "active", "disabled", "enabled", "checked", "empty", "root", "first-child", "last-child", "only-child", "first-of-type", "last-of-type", "only-of-type", "placeholder-shown", "link", "visited", "any-link"]);

function splitRelative (text: string): string[] {
	const out: string[] = [];
	let depth = 0, start = 0;
	for (let i = 0; i <= text.length; i++) {
		const ch = text[i];
		if (ch === "(") depth++;
		else if (ch === ")") depth--;
		else if ((ch === "," && depth === 0) || i === text.length) {
			out.push(text.slice(start, i));
			start = i + 1;
		}
	}
	return out;
}

export function compareSpecificity (a: [number, number, number], b: [number, number, number]): number {
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function attrTest (el: IgeCssMatchable, t: SimpleTest): boolean {
	let v = el.getAttribute(t.name);
	if (v === null) return false;
	if (!t.op) return true;
	let want = t.value ?? "";
	if (t.caseInsensitive) {
		v = v.toLowerCase();
		want = want.toLowerCase();
	}
	switch (t.op) {
		case "=": return v === want;
		case "~=": return v.split(/\s+/).includes(want);
		case "|=": return v === want || v.startsWith(`${want}-`);
		case "^=": return want !== "" && v.startsWith(want);
		case "$=": return want !== "" && v.endsWith(want);
		case "*=": return want !== "" && v.includes(want);
	}
	return false;
}

function nthMatch ([a, b]: [number, number], index: number): boolean {
	// index is 1-based: is there n >= 0 with a*n + b = index?
	if (a === 0) return index === b;
	const n = (index - b) / a;
	return Number.isInteger(n) && n >= 0;
}

function siblingIndex (el: IgeCssMatchable, fromEnd: boolean, ofType: boolean): number {
	let i = 1;
	for (let s = fromEnd ? el.nextElementSibling : el.previousElementSibling; s; s = fromEnd ? s.nextElementSibling : s.previousElementSibling) {
		if (!ofType || s.localName === el.localName) i++;
	}
	return i;
}

function containsState (el: IgeCssMatchable, state: string): boolean {
	if (el.hasState(state)) return true;
	for (const c of el.elementChildren) if (containsState(c, state)) return true;
	return false;
}

function pseudoTest (el: IgeCssMatchable, t: SimpleTest): boolean {
	switch (t.name) {
		case "hover": case "focus": case "focus-visible": case "active": return el.hasState(t.name);
		case "focus-within": return containsState(el, "focus");
		case "disabled": return el.isDisabled;
		case "enabled": return !el.isDisabled;
		case "checked": return el.isChecked;
		case "empty": return el.isEmpty;
		case "root": return el.isRoot;
		case "first-child": return !el.previousElementSibling;
		case "last-child": return !el.nextElementSibling;
		case "only-child": return !el.previousElementSibling && !el.nextElementSibling;
		case "first-of-type": return siblingIndex(el, false, true) === 1;
		case "last-of-type": return siblingIndex(el, true, true) === 1;
		case "only-of-type": return siblingIndex(el, false, true) === 1 && siblingIndex(el, true, true) === 1;
		case "nth-child": return nthMatch(t.nth!, siblingIndex(el, false, false));
		case "nth-last-child": return nthMatch(t.nth!, siblingIndex(el, true, false));
		case "nth-of-type": return nthMatch(t.nth!, siblingIndex(el, false, true));
		case "nth-last-of-type": return nthMatch(t.nth!, siblingIndex(el, true, true));
		case "not": return !t.args!.some((s) => matchesSelector(el, s));
		case "is": case "matches": case "where": return t.args!.some((s) => matchesSelector(el, s));
		case "has": return t.relative!.some((r) => hasRelative(el, r.combinator, r.selector));
		case "placeholder-shown": return el.getAttribute("placeholder") !== null && !el.getAttribute("value");
		default: return false;
	}
}

function hasRelative (el: IgeCssMatchable, comb: Combinator, sel: IgeCssSelector): boolean {
	if (comb === ">") return el.elementChildren.some((c) => matchesSelector(c, sel));
	if (comb === "+") return !!el.nextElementSibling && matchesSelector(el.nextElementSibling, sel);
	if (comb === "~") {
		for (let s = el.nextElementSibling; s; s = s.nextElementSibling) if (matchesSelector(s, sel)) return true;
		return false;
	}
	const walk = (e: IgeCssMatchable): boolean => e.elementChildren.some((c) => matchesSelector(c, sel) || walk(c));
	return walk(el);
}

function compoundMatches (el: IgeCssMatchable, c: Compound): boolean {
	for (const t of c.tests) {
		switch (t.kind) {
			case "tag": if (t.name !== "*" && el.localName !== t.name) return false; break;
			case "id": if (el.id !== t.name) return false; break;
			case "class": if (!el.hasClass(t.name)) return false; break;
			case "attr": if (!attrTest(el, t)) return false; break;
			case "pseudo": if (!pseudoTest(el, t)) return false; break;
		}
	}
	return true;
}

/** Whether the element matches the selector (its pseudo-element aside). */
export function matchesSelector (el: IgeCssMatchable, sel: IgeCssSelector): boolean {
	if (sel.unsupported || !sel.compounds.length) return false;
	return matchFrom(el, sel.compounds, sel.compounds.length - 1);
}

function matchFrom (el: IgeCssMatchable, compounds: Compound[], index: number): boolean {
	if (!compoundMatches(el, compounds[index])) return false;
	if (index === 0) return true;
	const comb = compounds[index].combinator;
	if (comb === ">") return !!el.parentElement && matchFrom(el.parentElement, compounds, index - 1);
	if (comb === "+") return !!el.previousElementSibling && matchFrom(el.previousElementSibling, compounds, index - 1);
	if (comb === "~") {
		for (let s = el.previousElementSibling; s; s = s.previousElementSibling) if (matchFrom(s, compounds, index - 1)) return true;
		return false;
	}
	for (let p = el.parentElement; p; p = p.parentElement) if (matchFrom(p, compounds, index - 1)) return true;
	return false;
}

/**
 * The selector's rightmost compound's cheapest key (an id, a class or a tag)
 * for indexing rules: only rules whose key an element has are tried.
 */
export function selectorKey (sel: IgeCssSelector): string {
	const last = sel.compounds[sel.compounds.length - 1];
	if (!last) return "*";
	const id = last.tests.find((t) => t.kind === "id");
	if (id) return `#${id.name}`;
	const cls = last.tests.find((t) => t.kind === "class");
	if (cls) return `.${cls.name}`;
	const tag = last.tests.find((t) => t.kind === "tag" && t.name !== "*");
	if (tag) return tag.name;
	return "*";
}
