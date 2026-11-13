/**
 * The cascade for the engine's UI: which rules match each element (rules
 * indexed by their rightmost id, class or tag), in order of importance,
 * specificity and source order, with inline styles, inheritance, custom
 * properties and var(), shorthands, @container conditions and the ::before
 * and ::after pseudo-elements. Each element's computed style is a plain
 * record of the properties it sets or inherits (styleValue() falls back to
 * the initial value); font-size is resolved to px here, everything else at
 * layout (it needs the containing block).
 */
import { type IgeCssContainerCondition, type IgeCssKeyframes, type IgeCssStylesheet, type IgeCssStyleRule, parseStylesheet } from "@/engine/ui2/css/IgeCssParser";
import { compareSpecificity, matchesSelector, parseSelectorList, selectorKey, type IgeCssSelector } from "@/engine/ui2/css/IgeCssSelector";
import { resolveLength, substituteVars } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { expandShorthand, INHERITED, INITIAL, shorthandKeys } from "@/engine/ui2/style/IgeUiProperties";
import { UA_STYLESHEET } from "@/engine/ui2/style/igeUiUserAgent";

export type IgeUiComputedStyle = Record<string, string>;

interface IndexedRule {
	rule: IgeCssStyleRule;
	selector: IgeCssSelector;
	specificity: [number, number, number];
	/** The user agent's (the engine's defaults): under every author rule, whatever its specificity. */
	ua?: boolean;
}

/** A compound selector's tag, classes and id as keys (".a", "#b", "td"), or "*" when it has none of those. */
function addKeys (to: Set<string>, compound: string): void {
	const found = compound.match(/[.#][\w-]+|^[a-zA-Z][\w-]*/g);
	if (!found?.length) to.add("*");
	else for (const k of found) to.add(k);
}

/** A property's computed value, or its initial one. */
export function styleValue (cs: IgeUiComputedStyle | undefined, name: string): string {
	return cs?.[name] ?? INITIAL[name] ?? "";
}

const FONT_SIZES: Record<string, number> = { "xx-small": 9, "x-small": 10, small: 13, medium: 16, large: 18, "x-large": 24, "xx-large": 32, "xxx-large": 48 };

export class IgeUiStyleEngine {
	sheets: IgeCssStylesheet[] = [];
	keyframes = new Map<string, IgeCssKeyframes>();
	_index = new Map<string, IndexedRule[]>();
	_any: IndexedRule[] = [];
	/** Some rule looks at descendants or later siblings (:has(), + or ~): structural changes restyle more. */
	usesHas = false;
	usesSiblings = false;
	/**
	 * The rightmost keys (tag, .class, #id, *) of selectors that look elsewhere in the tree: :has() anywhere in them,
	 * or siblings and places among siblings (+, ~, :nth-*, :first/last/only-*, :empty). An element innerHTML made just
	 * like the one it replaced can't take that one's style over when it's the subject of one of those (IgeUiRoot).
	 */
	hasSubjects = new Set<string>();
	siblingSubjects = new Set<string>();
	/** Subjects of + and ~ selectors; whether one reaches past the sibling into what's in it (A + B .c). */
	combinatorSubjects = new Set<string>();
	siblingDeep = false;
	/** The keys of the elements before a + or ~ (a change to one of those matters to its later siblings). */
	combinatorAnchors = new Set<string>();
	/** The keys of what :has() looks for. */
	hasArguments = new Set<string>();
	/** States some selector depends on (an element's style is looked at again when one of these changes on it or an ancestor). */
	stateDependent = new Set<string>();
	/** The size the UI's laid out at (vw, vh, and the @container ui queries). */
	viewport = { w: 1280, h: 720 };
	/** Containers' sizes from the last layout (by element), for @container. */
	containerSize = new WeakMap<IgeUiElement, { w: number; h: number }>();
	/** Bumped as the rules change (every element's style is then looked at again). */
	version = 0;

	constructor () {
		this.addStylesheet(UA_STYLESHEET, true);
	}

	/** Adds a stylesheet's text (after those already added: later wins at equal specificity). `ua`: the defaults'. */
	addStylesheet (css: string, ua = false): IgeCssStylesheet {
		const sheet = parseStylesheet(css);
		this.sheets.push(sheet);
		if (ua) this._uaSheets.add(sheet);
		this._indexSheet(sheet, ua);
		this.version++;
		return sheet;
	}

	/**
	 * Puts new text in place of a stylesheet added before (an edited `<style>`: a dev server's hot reload), in its place
	 * among the others; "" takes it away. Returns the sheet that's there now (to replace it again).
	 */
	replaceStylesheet (old: IgeCssStylesheet, css: string): IgeCssStylesheet {
		const i = this.sheets.indexOf(old);
		if (i < 0) return this.addStylesheet(css);
		const sheet = parseStylesheet(css);
		if (this._uaSheets.has(old)) this._uaSheets.add(sheet);
		this.sheets[i] = sheet;
		// Everything indexed again, the rules numbered again in the sheets' order (the cascade's order)
		this.keyframes.clear();
		this._index.clear();
		this._any = [];
		this.usesHas = this.usesSiblings = this.siblingDeep = false;
		for (const set of [this.hasSubjects, this.siblingSubjects, this.combinatorSubjects, this.combinatorAnchors, this.hasArguments, this.stateDependent]) set.clear();
		this._subjectClasses.clear();
		let order = 0;
		for (const sh of this.sheets) {
			for (const rule of sh.rules) rule.order = order++;
			this._indexSheet(sh, this._uaSheets.has(sh));
		}
		this.version++;
		return sheet;
	}

	/** The engine's defaults' sheets. */
	_uaSheets = new WeakSet<IgeCssStylesheet>();

	_indexSheet (sheet: IgeCssStylesheet, ua: boolean): void {
		for (const [k, v] of sheet.keyframes) this.keyframes.set(k, v);
		for (const rule of sheet.rules) {
			for (const selector of parseSelectorList(rule.selector)) {
				if (selector.unsupported) continue;
				if (/:has\(/.test(selector.text)) this.usesHas = true;
				if (/[+~]/.test(selector.text.replace(/\([^)]*\)/g, ""))) this.usesSiblings = true;
				const subject = selectorKey(selector);
				this._subjectClasses.clear();
				if (/:has\(/.test(selector.text)) this.hasSubjects.add(subject);
				if (/[+~]|:(nth-|first-|last-|only-|empty)/.test(selector.text)) this.siblingSubjects.add(subject);
				// + and ~: their subjects (the siblings after), and whether any reaches on into a sibling's descendants
				const flat = selector.text.replace(/\([^)]*\)/g, "");
				const at = flat.search(/[+~]/);
				if (at >= 0) {
					this.combinatorSubjects.add(subject);
					if (/[\s>]/.test(flat.slice(at + 1).trim().replace(/^[^\s>]*/, ""))) this.siblingDeep = true;
					// What a sibling before must be for it to matter (the compound before each + or ~)
					for (const m of flat.matchAll(/([^\s>+~]*)\s*[+~]/g)) addKeys(this.combinatorAnchors, m[1]);
				}
				// What a :has() looks for (the element a change must be, or be in, to flip one)
				for (const m of selector.text.matchAll(/:has\(([^)]*)\)/g)) addKeys(this.hasArguments, m[1].split(/[\s>+~]+/).filter(Boolean).pop() ?? "*");
				for (const s of selector.states) this.stateDependent.add(s);
				const entry: IndexedRule = { rule, selector, specificity: selector.specificity, ...(ua ? { ua } : {}) };
				const key = selectorKey(selector);
				if (key === "*") this._any.push(entry);
				else {
					const list = this._index.get(key) ?? [];
					list.push(entry);
					this._index.set(key, list);
				}
			}
		}
	}

	/** Whether an element could be the subject of one of `keys`' selectors. */
	subjectOf (el: IgeUiElement, keys: Set<string>, also?: string): boolean {
		if (!keys.size) return false;
		if (also) for (const c of also.split(/\s+/)) if (c && keys.has(`.${c}`)) return true;
		if (keys.has("*") || keys.has(el.localName) || (el.id && keys.has(`#${el.id}`))) return true;
		// (Classes by themselves, without building ".name" strings for every element)
		let classes = this._subjectClasses.get(keys);
		if (!classes) {
			classes = new Set([...keys].filter((k) => k.startsWith(".")).map((k) => k.slice(1)));
			this._subjectClasses.set(keys, classes);
		}
		if (!classes.size) return false;
		for (const c of el._classes) if (classes.has(c)) return true;
		return false;
	}

	_subjectClasses = new Map<Set<string>, Set<string>>();

	_containerHolds (el: IgeUiElement, conds: IgeCssContainerCondition[] | undefined): boolean {
		if (!conds) return true;
		for (const c of conds) {
			// The named container (or the nearest), from the last layout; the UI's own size if there's none
			let size = this.viewport;
			for (let p = el.parentNode; p; p = p.parentNode) {
				const name = p._computed?.["container-name"];
				const type = p._computed?.["container-type"];
				if (type && type !== "normal" && (!c.name || name === c.name)) {
					size = this.containerSize.get(p) ?? this.viewport;
					break;
				}
			}
			if (!c.any.some((t) => (t.op === "max" ? (t.feature === "width" ? size.w : size.h) <= t.px : (t.feature === "width" ? size.w : size.h) >= t.px))) return false;
		}
		return true;
	}

	/** The rules matching an element (and its ::before / ::after), least important first. */
	_matching (el: IgeUiElement): { own: IndexedRule[]; before: IndexedRule[]; after: IndexedRule[]; placeholder: IndexedRule[] } {
		const candidates: IndexedRule[] = [...this._any];
		const add = (key: string) => {
			const list = this._index.get(key);
			if (list) for (const r of list) candidates.push(r);
		};
		add(el.localName);
		if (el.id) add(`#${el.id}`);
		for (const c of el._classes) add(`.${c}`);
		const own: IndexedRule[] = [], before: IndexedRule[] = [], after: IndexedRule[] = [], placeholder: IndexedRule[] = [];
		const seen = new Set<IndexedRule>();
		for (const r of candidates) {
			if (seen.has(r)) continue;
			seen.add(r);
			if (!matchesSelector(el, r.selector) || !this._containerHolds(el, r.rule.container)) continue;
			(r.selector.pseudoElement === "before" ? before : r.selector.pseudoElement === "after" ? after : r.selector.pseudoElement === "placeholder" ? placeholder : own).push(r);
		}
		// (The defaults first: a page's rule beats the user agent's however specific that is, button:disabled's colours)
		const byOrder = (a: IndexedRule, b: IndexedRule) => (a.ua ? 0 : 1) - (b.ua ? 0 : 1) || compareSpecificity(a.specificity, b.specificity) || a.rule.order - b.rule.order;
		own.sort(byOrder);
		before.sort(byOrder);
		after.sort(byOrder);
		placeholder.sort(byOrder);
		return { own, before, after, placeholder };
	}

	/** Computes an element's style (and its pseudo-elements') from its parent's. */
	compute (el: IgeUiElement, parent: IgeUiComputedStyle | undefined): IgeUiComputedStyle {
		const m = this._matching(el);
		const inline = [...el._inline._props].map(([name, d]) => ({ name, value: d.value, important: d.important }));
		const cs = this._cascade(m.own, inline, parent);
		el._pseudo = undefined;
		if (m.before.length || m.after.length) {
			el._pseudo = {};
			if (m.before.length) {
				const b = this._cascade(m.before, [], cs);
				if (b.content && b.content !== "none" && b.content !== "normal") el._pseudo.before = b;
			}
			if (m.after.length) {
				const a = this._cascade(m.after, [], cs);
				if (a.content && a.content !== "none" && a.content !== "normal") el._pseudo.after = a;
			}
		}
		if (m.placeholder.length && (el.localName === "input" || el.localName === "textarea")) {
			el._pseudo ??= {};
			el._pseudo.placeholder = this._cascade(m.placeholder, [], cs);
		}
		return cs;
	}

	_cascade (rules: IndexedRule[], inline: { name: string; value: string; important: boolean }[], parent: IgeUiComputedStyle | undefined): IgeUiComputedStyle {
		// (In declaration order: a key set again moves to the end, so what's declared later is applied later)
		const specified = new Map<string, string>();
		const put = (k: string, v: string) => {
			specified.delete(k);
			specified.set(k, v);
		};
		const set = (name: string, value: string) => {
			// all: every property (not custom ones, not direction) to the keyword: unset and revert forget what came before
			if (name === "all") {
				const kw = value.trim().toLowerCase();
				for (const k of [...specified.keys()]) if (!k.startsWith("--")) specified.delete(k);
				if (kw === "initial" || kw === "inherit") for (const k of new Set([...Object.keys(INITIAL), ...INHERITED])) if (k !== "direction") specified.set(k, kw);
				return;
			}
			// A shorthand made of var(): kept whole (its longhands it replaces forgotten) until the variables are known
			if (value.includes("var(")) {
				const keys = shorthandKeys(name);
				if (keys) {
					for (const k of keys) specified.delete(k);
					put(name, value);
					return;
				}
			}
			const longs = expandShorthand(name, value);
			if (longs) for (const [k, v] of longs) put(k, v);
			else put(name, value);
		};
		for (const r of rules) for (const d of r.rule.declarations) if (!d.important) set(d.name, d.value);
		for (const d of inline) if (!d.important) set(d.name, d.value);
		for (const r of rules) for (const d of r.rule.declarations) if (d.important) set(d.name, d.value);
		for (const d of inline) if (d.important) set(d.name, d.value);

		const cs: IgeUiComputedStyle = {};
		// Inherited properties and every custom property, from the parent
		if (parent) {
			for (const k in parent) if (k.startsWith("--") || INHERITED.has(k)) cs[k] = parent[k];
		}
		// Custom properties first (values may refer to each other)
		const customs = new Map<string, string>();
		for (const [k, v] of specified) if (k.startsWith("--")) customs.set(k, v);
		const resolving = new Set<string>();
		const lookup = (name: string): string | undefined => {
			if (customs.has(name)) {
				if (resolving.has(name)) return undefined;
				resolving.add(name);
				const v = substituteVars(customs.get(name)!, lookup);
				resolving.delete(name);
				return v;
			}
			return parent?.[name];
		};
		for (const k of customs.keys()) {
			const v = lookup(k);
			if (v === undefined) delete cs[k];
			else cs[k] = v.trim();
		}
		const varLookup = (name: string) => cs[name];
		for (const [k, raw] of specified) {
			if (k.startsWith("--")) continue;
			let v = raw.includes("var(") ? substituteVars(raw, varLookup) : raw;
			if (v === undefined) {
				// An invalid var(): unset
				v = "unset";
			}
			v = v.trim();
			// A shorthand built from var() (e.g. border: var(--b)): expanded now it's known
			if (raw.includes("var(")) {
				const longs = expandShorthand(k, v);
				if (longs) {
					for (const [lk, lv] of longs) this._assign(cs, lk, lv, parent);
					continue;
				}
			}
			this._assign(cs, k, v, parent);
		}
		// Overflow: one side not visible makes the other's visible auto (CSS's rule)
		const ox = cs["overflow-x"], oy = cs["overflow-y"];
		if (ox && ox !== "visible" && (oy === undefined || oy === "visible")) cs["overflow-y"] = ox === "clip" ? "clip" : "auto";
		else if (oy && oy !== "visible" && (ox === undefined || ox === "visible")) cs["overflow-x"] = oy === "clip" ? "clip" : "auto";
		// font-weight: bolder and lighter from its parent's
		const fw = cs["font-weight"];
		if (fw === "bolder" || fw === "lighter") {
			const p = parseInt(parent?.["font-weight"] ?? "400", 10) || 400;
			cs["font-weight"] = String(fw === "bolder" ? (p < 350 ? 400 : p < 550 ? 700 : 900) : p < 550 ? 100 : p < 750 ? 400 : 700);
		} else if (fw === "bold") cs["font-weight"] = "700";
		else if (fw === "normal") cs["font-weight"] = "400";
		// font-size in px (em and % are its parent's)
		const parentSize = parent ? parseFloat(parent["font-size"] ?? "16") : 16;
		const fs = cs["font-size"];
		if (fs !== undefined && !fs.endsWith("px")) cs["font-size"] = `${this._fontSize(fs, parentSize, cs)}px`;
		else if (fs !== undefined && !/^-?[\d.]+px$/.test(fs)) cs["font-size"] = `${this._fontSize(fs, parentSize, cs)}px`;
		return cs;
	}

	_assign (cs: IgeUiComputedStyle, name: string, value: string, parent: IgeUiComputedStyle | undefined): void {
		const v = value.toLowerCase();
		if (v === "inherit") {
			if (parent?.[name] !== undefined) cs[name] = parent[name];
			else delete cs[name];
			return;
		}
		if (v === "initial") {
			if (INHERITED.has(name)) cs[name] = INITIAL[name] ?? "";
			else delete cs[name];
			return;
		}
		if (v === "unset" || v === "revert" || v === "revert-layer") {
			if (INHERITED.has(name)) {
				if (parent?.[name] !== undefined) cs[name] = parent[name];
				else delete cs[name];
			} else delete cs[name];
			return;
		}
		cs[name] = value;
	}

	_fontSize (value: string, parentSize: number, cs: IgeUiComputedStyle): number {
		const v = value.trim().toLowerCase();
		if (FONT_SIZES[v] !== undefined) return FONT_SIZES[v];
		if (v === "smaller") return parentSize / 1.2;
		if (v === "larger") return parentSize * 1.2;
		const px = resolveLength(v, { em: parentSize, rem: this.rootFontSize, percent: parentSize, vw: this.viewport.w, vh: this.viewport.h, cqw: this.viewport.w, cqh: this.viewport.h });
		void cs;
		return px ?? parentSize;
	}

	rootFontSize = 16;
}

/** A stylesheet parsed without an engine (tests, tools). */
export function igeUiParseStylesheet (css: string): IgeCssStylesheet {
	return parseStylesheet(css);
}
