/**
 * The engine UI's element tree (ui2): a retained tree with the DOM's shape,
 * so UI written for the browser ports by passing it an engine document
 * instead of the page's. Elements, text, a document; classList, dataset,
 * style, attributes, innerHTML / textContent, querySelector(All), closest,
 * matches; events with capture and bubbling; focus; and the layout's
 * geometry read back (offsetWidth, scrollTop, getBoundingClientRect).
 *
 * Changes tell the document what's out of date (styles, layout, paint), so
 * a frame only redoes what changed (IgeUiRoot).
 */
import { matchesSelector, parseSelectorList, type IgeCssMatchable, type IgeCssSelector } from "@/engine/ui2/css/IgeCssSelector";
import { escapeAttr, escapeText, parseHtml, VOID_TAGS, type IgeHtmlNode } from "@/engine/ui2/dom/IgeUiHtml";
import type { IgeUiBox } from "@/engine/ui2/layout/IgeUiBox";

// ---------------------------------------------------------------- events

export interface IgeUiEventInit {
	bubbles?: boolean;
	cancelable?: boolean;
	[key: string]: unknown;
}

export class IgeUiEvent {
	readonly type: string;
	readonly bubbles: boolean;
	readonly cancelable: boolean;
	target: IgeUiNode | null = null;
	currentTarget: IgeUiNode | null = null;
	eventPhase = 0;
	defaultPrevented = false;
	timeStamp = typeof performance !== "undefined" ? performance.now() : Date.now();
	_stop = false;
	_stopNow = false;
	// Pointer, wheel and key fields (set as they apply)
	clientX = 0;
	clientY = 0;
	button = 0;
	buttons = 0;
	pointerId = 1;
	pointerType = "mouse";
	deltaX = 0;
	deltaY = 0;
	deltaMode = 0;
	key = "";
	code = "";
	shiftKey = false;
	ctrlKey = false;
	altKey = false;
	metaKey = false;
	repeat = false;
	detail = 0;
	relatedTarget: IgeUiNode | null = null;
	[key: string]: unknown;

	constructor (type: string, init: IgeUiEventInit = {}) {
		this.type = type;
		this.bubbles = !!init.bubbles;
		this.cancelable = !!init.cancelable;
		for (const [k, v] of Object.entries(init)) if (k !== "bubbles" && k !== "cancelable") (this as Record<string, unknown>)[k] = v;
	}

	/** One of ours from a page event: its type, flags and the fields that apply (detail, key, pointer, data…). */
	static from (e: Event): IgeUiEvent {
		const src = e as Event & Record<string, unknown>;
		const init: IgeUiEventInit = { bubbles: e.bubbles, cancelable: e.cancelable };
		for (const k of ["detail", "key", "code", "shiftKey", "ctrlKey", "altKey", "metaKey", "repeat", "clientX", "clientY", "button", "buttons", "pointerId", "pointerType", "deltaX", "deltaY", "deltaMode", "data", "inputType"]) {
			const v = src[k];
			if (v !== undefined && v !== null) init[k] = v;
		}
		return new IgeUiEvent(e.type, init);
	}

	stopPropagation (): void {
		this._stop = true;
	}

	stopImmediatePropagation (): void {
		this._stop = true;
		this._stopNow = true;
	}

	preventDefault (): void {
		if (this.cancelable) this.defaultPrevented = true;
	}

	composedPath (): IgeUiNode[] {
		const out: IgeUiNode[] = [];
		for (let n: IgeUiNode | null = this.target; n; n = n.parentNode) out.push(n);
		return out;
	}
}

type Listener = { fn: (e: IgeUiEvent) => unknown; capture: boolean; once: boolean };

// ---------------------------------------------------------------- nodes

export class IgeUiNode {
	static readonly ELEMENT_NODE = 1;
	static readonly TEXT_NODE = 3;
	readonly nodeType: number = 0;
	parentNode: IgeUiElement | null = null;
	ownerDocument: IgeUiDocument;
	_listeners?: Map<string, Listener[]>;

	constructor (doc: IgeUiDocument) {
		this.ownerDocument = doc;
	}

	get parentElement (): IgeUiElement | null {
		return this.parentNode;
	}

	get nextSibling (): IgeUiNode | null {
		const kids = this.parentNode?.childNodes;
		if (!kids) return null;
		return kids[kids.indexOf(this) + 1] ?? null;
	}

	get previousSibling (): IgeUiNode | null {
		const kids = this.parentNode?.childNodes;
		if (!kids) return null;
		return kids[kids.indexOf(this) - 1] ?? null;
	}

	get isConnected (): boolean {
		let n: IgeUiNode | null = this;
		while (n.parentNode) n = n.parentNode;
		return n === this.ownerDocument.documentElement;
	}

	get textContent (): string {
		return "";
	}

	set textContent (_: string) {
		// (Each kind sets its own)
	}

	remove (): void {
		this.parentNode?.removeChild(this);
	}

	/** Where another node is from this one (Node.DOCUMENT_POSITION_*: 2 preceding, 4 following, 8 contains, 16 contained by). */
	compareDocumentPosition (other: IgeUiNode): number {
		if (other === this) return 0;
		const chain = (n: IgeUiNode) => {
			const out: IgeUiNode[] = [];
			for (let p: IgeUiNode | null = n; p; p = p.parentNode) out.unshift(p);
			return out;
		};
		const a = chain(this), b = chain(other);
		if (a[0] !== b[0]) return 1 | 32;
		let i = 0;
		while (i < a.length && i < b.length && a[i] === b[i]) i++;
		if (i === a.length) return 16 | 4;
		if (i === b.length) return 8 | 2;
		const parent = a[i - 1] as IgeUiElement;
		return parent.childNodes.indexOf(a[i]) < parent.childNodes.indexOf(b[i]) ? 4 : 2;
	}

	getRootNode (): IgeUiNode {
		let n: IgeUiNode = this;
		while (n.parentNode) n = n.parentNode;
		return n;
	}

	addEventListener (type: string, fn: ((e: IgeUiEvent) => unknown) | { handleEvent: (e: IgeUiEvent) => unknown } | null, opts?: boolean | { capture?: boolean; once?: boolean; passive?: boolean }): void {
		if (!fn) return;
		const f = typeof fn === "function" ? fn : (e: IgeUiEvent) => fn.handleEvent(e);
		const capture = typeof opts === "boolean" ? opts : !!opts?.capture;
		const once = typeof opts === "object" && !!opts?.once;
		this._listeners ??= new Map();
		const list = this._listeners.get(type) ?? [];
		if (list.some((l) => l.fn === f && l.capture === capture)) return;
		list.push({ fn: f, capture, once });
		this._listeners.set(type, list);
		this.ownerDocument._listened(type);
	}

	removeEventListener (type: string, fn: ((e: IgeUiEvent) => unknown) | null, opts?: boolean | { capture?: boolean }): void {
		const list = this._listeners?.get(type);
		if (!list || !fn) return;
		const capture = typeof opts === "boolean" ? opts : !!opts?.capture;
		const i = list.findIndex((l) => l.fn === fn && l.capture === capture);
		if (i >= 0) list.splice(i, 1);
	}

	/** Dispatches with a capture phase down from the root and a bubble phase back up. Returns whether it wasn't cancelled. */
	dispatchEvent (event: IgeUiEvent | Event): boolean {
		// A page event (new CustomEvent(…), new KeyboardEvent(…)) sent to an engine element: dispatched as one of ours
		if (!(event instanceof IgeUiEvent)) {
			const own = IgeUiEvent.from(event);
			const ok = this.dispatchEvent(own);
			if (!ok && event.cancelable) event.preventDefault();
			return ok;
		}
		event.target = this;
		const path: IgeUiNode[] = [];
		for (let n: IgeUiNode | null = this.parentNode; n; n = n.parentNode) path.push(n);
		// Capture
		event.eventPhase = 1;
		for (let i = path.length - 1; i >= 0 && !event._stop; i--) path[i]._fire(event, true);
		// At the target
		event.eventPhase = 2;
		if (!event._stop) {
			this._fire(event, true);
			if (!event._stopNow) this._fire(event, false);
		}
		// Bubble
		event.eventPhase = 3;
		if (event.bubbles) for (let i = 0; i < path.length && !event._stop; i++) path[i]._fire(event, false);
		event.currentTarget = null;
		event.eventPhase = 0;
		return !event.defaultPrevented;
	}

	_fire (event: IgeUiEvent, capture: boolean): void {
		const list = this._listeners?.get(event.type);
		if (!list?.length) return;
		event.currentTarget = this;
		for (const l of [...list]) {
			if (l.capture !== capture && event.eventPhase !== 2) continue;
			if (event.eventPhase === 2 && l.capture !== capture) continue;
			if (l.once) this.removeEventListener(event.type, l.fn, l.capture);
			try {
				l.fn.call(this, event);
			} catch (err) {
				console.error(err);
			}
			if (event._stopNow) break;
		}
	}

	cloneNode (_deep: boolean = false): IgeUiNode {
		return new IgeUiNode(this.ownerDocument);
	}
}

export class IgeUiText extends IgeUiNode {
	readonly nodeType = 3;
	_data: string;

	constructor (doc: IgeUiDocument, data: string) {
		super(doc);
		this._data = data;
	}

	get data (): string {
		return this._data;
	}

	set data (v: string) {
		v = String(v);
		if (v === this._data) return;
		this._data = v;
		this.ownerDocument._changed(this.parentNode, "text");
	}

	get nodeValue (): string {
		return this._data;
	}

	set nodeValue (v: string) {
		this.data = v;
	}

	get textContent (): string {
		return this._data;
	}

	set textContent (v: string) {
		this.data = v;
	}

	get wholeText (): string {
		return this._data;
	}

	cloneNode (): IgeUiText {
		return new IgeUiText(this.ownerDocument, this._data);
	}
}

// ---------------------------------------------------------------- class lists, datasets, inline styles

export class IgeUiClassList {
	constructor (readonly el: IgeUiElement) {}

	get length (): number {
		return this.el._classes.size;
	}

	get value (): string {
		return [...this.el._classes].join(" ");
	}

	contains (name: string): boolean {
		return this.el._classes.has(name);
	}

	add (...names: string[]): void {
		let changed = false;
		for (const n of names) {
			if (!n || this.el._classes.has(n)) continue;
			this.el._classes.add(n);
			changed = true;
		}
		if (changed) this.el._classesChanged();
	}

	remove (...names: string[]): void {
		let changed = false;
		for (const n of names) if (this.el._classes.delete(n)) changed = true;
		if (changed) this.el._classesChanged();
	}

	toggle (name: string, force?: boolean): boolean {
		const on = force ?? !this.el._classes.has(name);
		if (on) this.add(name);
		else this.remove(name);
		return on;
	}

	replace (from: string, to: string): boolean {
		if (!this.el._classes.has(from)) return false;
		this.el._classes.delete(from);
		this.el._classes.add(to);
		this.el._classesChanged();
		return true;
	}

	item (i: number): string | null {
		return [...this.el._classes][i] ?? null;
	}

	forEach (fn: (name: string, i: number) => void): void {
		[...this.el._classes].forEach(fn);
	}

	[Symbol.iterator] (): Iterator<string> {
		return this.el._classes[Symbol.iterator]();
	}

	toString (): string {
		return this.value;
	}
}

const camelToKebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const kebabToCamel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

function makeDataset (el: IgeUiElement): Record<string, string | undefined> {
	return new Proxy({} as Record<string, string | undefined>, {
		get: (_, key) => (typeof key === "string" ? el.getAttribute(`data-${camelToKebab(key)}`) ?? undefined : undefined),
		set: (_, key, value) => {
			if (typeof key === "string") el.setAttribute(`data-${camelToKebab(key)}`, String(value));
			return true;
		},
		deleteProperty: (_, key) => {
			if (typeof key === "string") el.removeAttribute(`data-${camelToKebab(key)}`);
			return true;
		},
		has: (_, key) => typeof key === "string" && el.hasAttribute(`data-${camelToKebab(key)}`),
		ownKeys: () => [...el._attrs.keys()].filter((k) => k.startsWith("data-")).map((k) => kebabToCamel(k.slice(5))),
		getOwnPropertyDescriptor: (_, key) => (typeof key === "string" && el.hasAttribute(`data-${camelToKebab(key)}`) ? { enumerable: true, configurable: true, value: el.getAttribute(`data-${camelToKebab(key)}`) } : undefined)
	});
}

/** An element's inline style: the style="" attribute, as properties (camelCase or kebab-case), cssText, setProperty(). */
export class IgeUiInlineStyle {
	_props = new Map<string, { value: string; important: boolean }>();

	constructor (readonly el: IgeUiElement) {}

	get cssText (): string {
		return [...this._props].map(([k, v]) => `${k}: ${v.value}${v.important ? " !important" : ""};`).join(" ");
	}

	set cssText (text: string) {
		this._props.clear();
		for (const part of text.split(";")) {
			const c = part.indexOf(":");
			if (c < 0) continue;
			const name = part.slice(0, c).trim();
			let value = part.slice(c + 1).trim();
			const important = /!important$/i.test(value);
			if (important) value = value.replace(/\s*!important$/i, "");
			if (name) this._props.set(name.startsWith("--") ? name : name.toLowerCase(), { value, important });
		}
		this._changed(false);
	}

	get length (): number {
		return this._props.size;
	}

	getPropertyValue (name: string): string {
		return this._props.get(name.startsWith("--") ? name : name.toLowerCase())?.value ?? "";
	}

	getPropertyPriority (name: string): string {
		return this._props.get(name)?.important ? "important" : "";
	}

	setProperty (name: string, value: string | null | undefined, priority?: string): void {
		const key = name.startsWith("--") ? name : name.toLowerCase();
		if (value === null || value === undefined || value === "") {
			if (this._props.delete(key)) this._changed(true);
			return;
		}
		const v = String(value);
		const prev = this._props.get(key);
		if (prev && prev.value === v && prev.important === (priority === "important")) return;
		this._props.set(key, { value: v, important: priority === "important" });
		this._changed(true);
	}

	removeProperty (name: string): string {
		const v = this.getPropertyValue(name);
		this.setProperty(name, null);
		return v;
	}

	_changed (sync: boolean): void {
		this.el.ownerDocument._changed(this.el, "style");
		if (sync) this.el._attrs.set("style", this.cssText);
	}
}

/** The inline style as a CSSStyleDeclaration-like proxy (el.style.left = "4px"). */
function makeStyle (decl: IgeUiInlineStyle): IgeUiInlineStyle & Record<string, string> {
	return new Proxy(decl, {
		get: (target, key, recv) => {
			if (typeof key !== "string" || key in target) return Reflect.get(target, key, recv);
			return target.getPropertyValue(camelToKebab(key));
		},
		set: (target, key, value) => {
			if (typeof key !== "string" || key in target) return Reflect.set(target, key, value);
			target.setProperty(camelToKebab(key), value === null || value === undefined ? "" : String(value));
			return true;
		}
	}) as IgeUiInlineStyle & Record<string, string>;
}

// ---------------------------------------------------------------- elements

export class IgeUiElement extends IgeUiNode implements IgeCssMatchable {
	readonly nodeType = 1;
	readonly localName: string;
	childNodes: IgeUiNode[] = [];
	_attrs = new Map<string, string>();
	_classes = new Set<string>();
	_states = new Set<string>();
	readonly classList: IgeUiClassList;
	readonly dataset: Record<string, string | undefined>;
	readonly _inline: IgeUiInlineStyle;
	readonly style: IgeUiInlineStyle & Record<string, string>;
	/** The layout's box for it (after a frame's layout), and its ::before / ::after boxes. */
	_box?: IgeUiBox;
	/** Style caches (IgeUiStyleEngine). */
	_computed?: Record<string, string>;
	_pseudo?: { before?: Record<string, string>; after?: Record<string, string>; placeholder?: Record<string, string> };
	_styleDirty = true;
	/** Scrolled by. */
	_scrollTop = 0;
	_scrollLeft = 0;
	/** A form control's live value and checked state (inputs). */
	_value?: string;
	_checked?: boolean;
	/** A canvas element's drawing surface (the page's, when there is one). */
	_canvas?: HTMLCanvasElement | OffscreenCanvas;
	_canvasVersion = 0;
	[key: string]: unknown;

	constructor (doc: IgeUiDocument, tag: string) {
		super(doc);
		this.localName = tag.toLowerCase();
		this.classList = new IgeUiClassList(this);
		this.dataset = makeDataset(this);
		this._inline = new IgeUiInlineStyle(this);
		this.style = makeStyle(this._inline);
	}

	get tagName (): string {
		return this.localName.toUpperCase();
	}

	get nodeName (): string {
		return this.tagName;
	}

	// ---- attributes

	get id (): string {
		return this._attrs.get("id") ?? "";
	}

	set id (v: string) {
		this.setAttribute("id", v);
	}

	get className (): string {
		return this._attrs.get("class") ?? "";
	}

	set className (v: string) {
		this.setAttribute("class", v);
	}

	get title (): string {
		return this._attrs.get("title") ?? "";
	}

	set title (v: string) {
		this.setAttribute("title", v);
	}

	get hidden (): boolean {
		return this._attrs.has("hidden");
	}

	set hidden (v: boolean) {
		this.toggleAttribute("hidden", !!v);
	}

	get disabled (): boolean {
		return this._attrs.has("disabled");
	}

	set disabled (v: boolean) {
		this.toggleAttribute("disabled", !!v);
	}

	get type (): string {
		return this._attrs.get("type") ?? (this.localName === "input" ? "text" : this.localName === "button" ? "submit" : "");
	}

	set type (v: string) {
		this.setAttribute("type", v);
	}

	get placeholder (): string {
		return this._attrs.get("placeholder") ?? "";
	}

	set placeholder (v: string) {
		this.setAttribute("placeholder", v);
	}

	get value (): string {
		return this._value ?? this._attrs.get("value") ?? "";
	}

	set value (v: string) {
		v = String(v);
		if (v === this._value) return;
		this._value = v;
		this.ownerDocument._changed(this, "text");
	}

	get checked (): boolean {
		return this._checked ?? this._attrs.has("checked");
	}

	set checked (v: boolean) {
		this._checked = !!v;
		this.ownerDocument._changed(this, "state");
	}

	get src (): string {
		return this._attrs.get("src") ?? "";
	}

	set src (v: string) {
		this.setAttribute("src", v);
	}

	get width (): number {
		return Number(this._attrs.get("width") ?? (this.localName === "canvas" ? 300 : 0));
	}

	set width (v: number) {
		this.setAttribute("width", String(v));
		if (this._canvas) this._canvas.width = v;
	}

	get height (): number {
		return Number(this._attrs.get("height") ?? (this.localName === "canvas" ? 150 : 0));
	}

	set height (v: number) {
		this.setAttribute("height", String(v));
		if (this._canvas) this._canvas.height = v;
	}

	get tabIndex (): number {
		const t = this._attrs.get("tabindex");
		return t !== undefined ? Number(t) : isNativelyFocusable(this) ? 0 : -1;
	}

	set tabIndex (v: number) {
		this.setAttribute("tabindex", String(v));
	}

	getAttribute (name: string): string | null {
		return this._attrs.get(name.toLowerCase()) ?? null;
	}

	hasAttribute (name: string): boolean {
		return this._attrs.has(name.toLowerCase());
	}

	getAttributeNames (): string[] {
		return [...this._attrs.keys()];
	}

	setAttribute (name: string, value: string): void {
		const key = name.toLowerCase();
		const v = String(value);
		if (this._attrs.get(key) === v) return;
		this._attrs.set(key, v);
		if (key === "class") {
			this._classes = new Set(v.split(/\s+/).filter(Boolean));
		} else if (key === "style") {
			const keep = this._attrs.get("style");
			this._inline.cssText = v;
			this._attrs.set("style", keep ?? v);
			return;
		} else if (key === "width" && this._canvas) this._canvas.width = Number(v);
		else if (key === "height" && this._canvas) this._canvas.height = Number(v);
		this.ownerDocument._changed(this, key === "class" ? "class" : "attr", key);
	}

	removeAttribute (name: string): void {
		const key = name.toLowerCase();
		if (!this._attrs.has(key)) return;
		this._attrs.delete(key);
		if (key === "class") this._classes.clear();
		if (key === "style") this._inline._props.clear();
		this.ownerDocument._changed(this, key === "class" ? "class" : key === "style" ? "style" : "attr", key);
	}

	toggleAttribute (name: string, force?: boolean): boolean {
		const on = force ?? !this.hasAttribute(name);
		if (on) {
			if (!this.hasAttribute(name)) this.setAttribute(name, "");
		} else this.removeAttribute(name);
		return on;
	}

	_classesChanged (): void {
		this._attrs.set("class", [...this._classes].join(" "));
		this.ownerDocument._changed(this, "class");
	}

	// ---- IgeCssMatchable

	hasClass (name: string): boolean {
		return this._classes.has(name);
	}

	get elementChildren (): IgeUiElement[] {
		return this.children;
	}

	get children (): IgeUiElement[] {
		return this.childNodes.filter((n): n is IgeUiElement => n.nodeType === 1);
	}

	get childElementCount (): number {
		return this.children.length;
	}

	get firstChild (): IgeUiNode | null {
		return this.childNodes[0] ?? null;
	}

	get lastChild (): IgeUiNode | null {
		return this.childNodes[this.childNodes.length - 1] ?? null;
	}

	get firstElementChild (): IgeUiElement | null {
		return (this.childNodes.find((n) => n.nodeType === 1) as IgeUiElement) ?? null;
	}

	get lastElementChild (): IgeUiElement | null {
		for (let i = this.childNodes.length - 1; i >= 0; i--) if (this.childNodes[i].nodeType === 1) return this.childNodes[i] as IgeUiElement;
		return null;
	}

	get previousElementSibling (): IgeUiElement | null {
		const kids = this.parentNode?.childNodes;
		if (!kids) return null;
		for (let i = kids.indexOf(this) - 1; i >= 0; i--) if (kids[i].nodeType === 1) return kids[i] as IgeUiElement;
		return null;
	}

	get nextElementSibling (): IgeUiElement | null {
		const kids = this.parentNode?.childNodes;
		if (!kids) return null;
		for (let i = kids.indexOf(this) + 1; i < kids.length; i++) if (kids[i].nodeType === 1) return kids[i] as IgeUiElement;
		return null;
	}

	hasState (state: string): boolean {
		return this._states.has(state);
	}

	get isDisabled (): boolean {
		if (!this._attrs.has("disabled")) return false;
		return ["button", "input", "select", "textarea", "option", "fieldset"].includes(this.localName);
	}

	get isChecked (): boolean {
		return this.checked;
	}

	get isEmpty (): boolean {
		return this.childNodes.every((n) => n.nodeType === 3 && (n as IgeUiText).data === "");
	}

	get isRoot (): boolean {
		return this === this.ownerDocument.documentElement;
	}

	// ---- tree

	appendChild<T extends IgeUiNode> (node: T): T {
		return this.insertBefore(node, null);
	}

	append (...nodes: (IgeUiNode | string)[]): void {
		for (const n of nodes) this.appendChild(typeof n === "string" ? this.ownerDocument.createTextNode(n) : n);
	}

	prepend (...nodes: (IgeUiNode | string)[]): void {
		const first = this.firstChild;
		for (const n of nodes) this.insertBefore(typeof n === "string" ? this.ownerDocument.createTextNode(n) : n, first);
	}

	insertBefore<T extends IgeUiNode> (node: T, ref: IgeUiNode | null): T {
		if (!(node instanceof IgeUiNode)) {
			// (A page element can't go in an engine tree: made with the page's document instead of this one's)
			console.warn("IgeUiElement: a node from another document can't be added; make it with this element's ownerDocument", node);
			return node;
		}
		if ((node as unknown as IgeUiFragment)._isFragment) {
			const frag = node as unknown as IgeUiFragment;
			for (const n of [...frag.childNodes]) this.insertBefore(n, ref);
			return node;
		}
		if (node.parentNode) node.parentNode._detach(node);
		const i = ref ? this.childNodes.indexOf(ref) : -1;
		if (i < 0) this.childNodes.push(node);
		else this.childNodes.splice(i, 0, node);
		node.parentNode = this;
		if (node.ownerDocument !== this.ownerDocument) adopt(node, this.ownerDocument);
		this.ownerDocument._changed(this, "tree", undefined, { added: [node], removed: [] });
		return node;
	}

	replaceChild<T extends IgeUiNode> (node: IgeUiNode, old: T): T {
		this.insertBefore(node, old);
		this.removeChild(old);
		return old;
	}

	replaceChildren (...nodes: (IgeUiNode | string)[]): void {
		const removed = [...this.childNodes];
		for (const n of removed) this._detach(n);
		this.ownerDocument._changed(this, "tree", undefined, { added: [], removed });
		this.append(...nodes);
	}

	removeChild<T extends IgeUiNode> (node: T): T {
		this._detach(node);
		this.ownerDocument._changed(this, "tree", undefined, { added: [], removed: [node] });
		return node;
	}

	_detach (node: IgeUiNode): void {
		const i = this.childNodes.indexOf(node);
		if (i >= 0) this.childNodes.splice(i, 1);
		node.parentNode = null;
		this.ownerDocument._removed(node);
	}

	contains (other: IgeUiNode | null): boolean {
		for (let n = other; n; n = n.parentNode) if (n === this) return true;
		return false;
	}

	// ---- content

	get textContent (): string {
		let out = "";
		for (const n of this.childNodes) out += n.textContent;
		return out;
	}

	set textContent (v: string) {
		const removed = [...this.childNodes];
		for (const n of removed) this._detach(n);
		const s = v === null || v === undefined ? "" : String(v);
		if (s) {
			const t = new IgeUiText(this.ownerDocument, s);
			t.parentNode = this;
			this.childNodes.push(t);
		}
		this.ownerDocument._changed(this, "tree", undefined, { added: [...this.childNodes], removed });
	}

	get innerText (): string {
		return this.textContent;
	}

	set innerText (v: string) {
		this.textContent = v;
	}

	get innerHTML (): string {
		return this.childNodes.map(serialize).join("");
	}

	set innerHTML (html: string) {
		const removed = [...this.childNodes];
		for (const n of removed) this._detach(n);
		for (const n of parseHtml(String(html ?? ""))) {
			const node = build(this.ownerDocument, n);
			node.parentNode = this;
			this.childNodes.push(node);
		}
		this.ownerDocument._changed(this, "tree", undefined, { added: [...this.childNodes], removed });
	}

	get outerHTML (): string {
		return serialize(this);
	}

	insertAdjacentHTML (where: "beforebegin" | "afterbegin" | "beforeend" | "afterend", html: string): void {
		const nodes = parseHtml(html).map((n) => build(this.ownerDocument, n));
		if (where === "afterbegin") {
			const first = this.firstChild;
			for (const n of nodes) this.insertBefore(n, first);
		} else if (where === "beforeend") for (const n of nodes) this.appendChild(n);
		else if (where === "beforebegin" && this.parentNode) for (const n of nodes) this.parentNode.insertBefore(n, this);
		else if (where === "afterend" && this.parentNode) {
			const next = this.nextSibling;
			for (const n of nodes) this.parentNode.insertBefore(n, next);
		}
	}

	cloneNode (deep: boolean = false): IgeUiElement {
		const el = this.ownerDocument.createElement(this.localName);
		for (const [k, v] of this._attrs) el.setAttribute(k, v);
		if (deep) for (const n of this.childNodes) el.appendChild(n.cloneNode(true));
		return el;
	}

	// ---- selectors

	matches (selectors: string): boolean {
		return this.ownerDocument._selectors(selectors).some((s) => matchesSelector(this, s));
	}

	closest (selectors: string): IgeUiElement | null {
		const list = this.ownerDocument._selectors(selectors);
		for (let n: IgeUiElement | null = this; n; n = n.parentNode) if (list.some((s) => matchesSelector(n!, s))) return n;
		return null;
	}

	querySelector<T extends IgeUiElement = IgeUiElement> (selectors: string): T | null {
		const list = this.ownerDocument._selectors(selectors);
		const walk = (el: IgeUiElement): IgeUiElement | null => {
			for (const c of el.childNodes) {
				if (c.nodeType !== 1) continue;
				const e = c as IgeUiElement;
				if (list.some((s) => matchesSelector(e, s))) return e;
				const deeper = walk(e);
				if (deeper) return deeper;
			}
			return null;
		};
		return walk(this) as T | null;
	}

	querySelectorAll<T extends IgeUiElement = IgeUiElement> (selectors: string): T[] {
		const list = this.ownerDocument._selectors(selectors);
		const out: IgeUiElement[] = [];
		const walk = (el: IgeUiElement) => {
			for (const c of el.childNodes) {
				if (c.nodeType !== 1) continue;
				const e = c as IgeUiElement;
				if (list.some((s) => matchesSelector(e, s))) out.push(e);
				walk(e);
			}
		};
		walk(this);
		return out as T[];
	}

	getElementsByClassName (name: string): IgeUiElement[] {
		return this.querySelectorAll(name.split(/\s+/).filter(Boolean).map((c) => `.${c}`).join(""));
	}

	getElementsByTagName (tag: string): IgeUiElement[] {
		return this.querySelectorAll(tag);
	}

	// ---- focus

	focus (opts?: { preventScroll?: boolean; focusVisible?: boolean }): void {
		this.ownerDocument._focus(this, opts);
	}

	blur (): void {
		if (this.ownerDocument.activeElement === this) this.ownerDocument._focus(null);
	}

	click (): void {
		if (this.isDisabled) return;
		this.dispatchEvent(new IgeUiEvent("click", { bubbles: true, cancelable: true }));
	}

	select (): void {
		// (A text field's whole value: the page's own input takes the keys, IgeUiTextInput)
	}

	// ---- geometry (from the last layout)

	get offsetWidth (): number {
		this.ownerDocument._flush();
		return this._box ? Math.round(this._box.borderW) : 0;
	}

	get offsetHeight (): number {
		this.ownerDocument._flush();
		return this._box ? Math.round(this._box.borderH) : 0;
	}

	get offsetLeft (): number {
		this.ownerDocument._flush();
		const b = this._box, p = this.offsetParent?._box;
		return b ? Math.round(b.x - (p ? p.x + p.borderLeft : 0)) : 0;
	}

	get offsetTop (): number {
		this.ownerDocument._flush();
		const b = this._box, p = this.offsetParent?._box;
		return b ? Math.round(b.y - (p ? p.y + p.borderTop : 0)) : 0;
	}

	get offsetParent (): IgeUiElement | null {
		// The nearest positioned ancestor; for one that isn't positioned itself, a table cell or table on the way counts
		const self = this._computed?.position;
		const positioned = !!self && self !== "static";
		for (let n = this.parentNode; n; n = n.parentNode) {
			const pos = n._computed?.position;
			if (pos && pos !== "static") return n;
			if (!positioned && (n.localName === "td" || n.localName === "th" || n.localName === "table")) return n;
		}
		return this.ownerDocument.body;
	}

	get clientWidth (): number {
		this.ownerDocument._flush();
		const b = this._box;
		return b ? Math.round(b.borderW - b.borderLeft - b.borderRight - (b.scrollbarY ?? 0)) : 0;
	}

	get clientHeight (): number {
		this.ownerDocument._flush();
		const b = this._box;
		return b ? Math.round(b.borderH - b.borderTop - b.borderBottom - (b.scrollbarX ?? 0)) : 0;
	}

	get clientLeft (): number {
		this.ownerDocument._flush();
		return this._box ? this._box.borderLeft : 0;
	}

	get clientTop (): number {
		this.ownerDocument._flush();
		return this._box ? this._box.borderTop : 0;
	}

	get scrollWidth (): number {
		this.ownerDocument._flush();
		const b = this._box;
		return b ? Math.max(this.clientWidth, Math.round(b.scrollW ?? 0)) : 0;
	}

	get scrollHeight (): number {
		this.ownerDocument._flush();
		const b = this._box;
		return b ? Math.max(this.clientHeight, Math.round(b.scrollH ?? 0)) : 0;
	}

	get scrollTop (): number {
		return this._scrollTop;
	}

	set scrollTop (v: number) {
		const max = Math.max(0, this.scrollHeight - this.clientHeight);
		// (On the device's pixels, as a browser keeps it)
		const g = this.ownerDocument._pixelGrid || 1;
		const next = Math.max(0, Math.min(max, Math.round((Number(v) || 0) * g) / g));
		if (next === this._scrollTop) return;
		this._scrollTop = next;
		this.ownerDocument._changed(this, "scroll");
		this.dispatchEvent(new IgeUiEvent("scroll"));
	}

	get scrollLeft (): number {
		return this._scrollLeft;
	}

	set scrollLeft (v: number) {
		const max = Math.max(0, this.scrollWidth - this.clientWidth);
		// (On the device's pixels, as a browser keeps it)
		const g = this.ownerDocument._pixelGrid || 1;
		const next = Math.max(0, Math.min(max, Math.round((Number(v) || 0) * g) / g));
		if (next === this._scrollLeft) return;
		this._scrollLeft = next;
		this.ownerDocument._changed(this, "scroll");
		this.dispatchEvent(new IgeUiEvent("scroll"));
	}

	scrollTo (x: number | { left?: number; top?: number }, y?: number): void {
		if (typeof x === "object") {
			if (x.left !== undefined) this.scrollLeft = x.left;
			if (x.top !== undefined) this.scrollTop = x.top;
		} else {
			this.scrollLeft = x;
			if (y !== undefined) this.scrollTop = y;
		}
	}

	scrollBy (x: number | { left?: number; top?: number }, y?: number): void {
		if (typeof x === "object") this.scrollTo({ left: this.scrollLeft + (x.left ?? 0), top: this.scrollTop + (x.top ?? 0) });
		else this.scrollTo(this.scrollLeft + x, this.scrollTop + (y ?? 0));
	}

	scrollIntoView (opts?: boolean | { block?: "start" | "center" | "end" | "nearest" }): void {
		this.ownerDocument._scrollIntoView(this, typeof opts === "object" ? opts.block ?? "start" : opts === false ? "end" : "start");
	}

	/** On screen, in the page's CSS pixels (the UI's scale and safe area applied, as the page's own would be). */
	getBoundingClientRect (): { x: number; y: number; left: number; top: number; right: number; bottom: number; width: number; height: number } {
		return this.ownerDocument._clientRect(this);
	}

	getClientRects (): ReturnType<IgeUiElement["getBoundingClientRect"]>[] {
		return this._box ? [this.getBoundingClientRect()] : [];
	}

	/** How much bigger it's drawn than its own pixels (the UI's scale). */
	get currentCSSZoom (): number {
		return this.ownerDocument._zoom;
	}

	/** Whether it's drawn: displayed (and its ancestors), and with the options, visible and not see-through. */
	checkVisibility (opts: { opacityProperty?: boolean; visibilityProperty?: boolean; checkOpacity?: boolean; checkVisibilityCSS?: boolean } = {}): boolean {
		this.ownerDocument._flush();
		for (let n: IgeUiElement | null = this; n; n = n.parentNode) {
			const c = n._computed;
			if (!c || c.display === "none") return false;
			if ((opts.opacityProperty || opts.checkOpacity) && c.opacity !== undefined && parseFloat(c.opacity) === 0) return false;
		}
		if ((opts.visibilityProperty || opts.checkVisibilityCSS) && this._computed?.visibility === "hidden") return false;
		return !!this._box;
	}

	// ---- canvas

	getContext (kind: string, opts?: unknown): RenderingContext | OffscreenCanvasRenderingContext2D | null {
		if (this.localName !== "canvas") return null;
		if (!this._canvas) {
			if (typeof document !== "undefined") this._canvas = document.createElement("canvas");
			else if (typeof OffscreenCanvas !== "undefined") this._canvas = new OffscreenCanvas(this.width, this.height);
			else return null;
			this._canvas.width = this.width;
			this._canvas.height = this.height;
		}
		// (Drawn on: its texture's uploaded again each frame it's shown)
		this._canvasVersion++;
		this.ownerDocument._changed(this, "paint");
		return (this._canvas as HTMLCanvasElement).getContext(kind, opts as CanvasRenderingContext2DSettings) as RenderingContext | null;
	}

	toString (): string {
		return `[IgeUiElement ${this.localName}]`;
	}
}

/** A document fragment (createDocumentFragment): its children move into whatever it's appended to. */
export class IgeUiFragment extends IgeUiElement {
	_isFragment = true;
}

function isNativelyFocusable (el: IgeUiElement): boolean {
	if (el.isDisabled) return false;
	return el.localName === "button" || el.localName === "input" || el.localName === "select" || el.localName === "textarea" || (el.localName === "a" && el.hasAttribute("href"));
}

function adopt (node: IgeUiNode, doc: IgeUiDocument): void {
	node.ownerDocument = doc;
	if (node.nodeType === 1) for (const c of (node as IgeUiElement).childNodes) adopt(c, doc);
}

function build (doc: IgeUiDocument, n: IgeHtmlNode): IgeUiNode {
	if (n.type === "text") return new IgeUiText(doc, n.text);
	const el = doc.createElement(n.tag);
	for (const [k, v] of n.attrs) el.setAttribute(k, v);
	for (const c of n.children) {
		const child = build(doc, c);
		child.parentNode = el;
		el.childNodes.push(child);
	}
	return el;
}

function serialize (n: IgeUiNode): string {
	if (n.nodeType === 3) return escapeText((n as IgeUiText).data);
	if (n.nodeType !== 1) return "";
	const el = n as IgeUiElement;
	const attrs = [...el._attrs].map(([k, v]) => (v === "" && k !== "value" ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`)).join("");
	if (VOID_TAGS.has(el.localName)) return `<${el.localName}${attrs}>`;
	return `<${el.localName}${attrs}>${el.childNodes.map(serialize).join("")}</${el.localName}>`;
}

// ---------------------------------------------------------------- the document

export type IgeUiChange = "tree" | "class" | "attr" | "style" | "text" | "state" | "scroll" | "paint";

/** The nodes a change to an element's children added and took away (for MutationObservers). */
export interface IgeUiTreeChange {
	added: IgeUiNode[];
	removed: IgeUiNode[];
}

/** The hooks a document's owner (IgeUiRoot) gives it. */
export interface IgeUiDocumentHost {
	changed (el: IgeUiElement | null, change: IgeUiChange, attr?: string, tree?: IgeUiTreeChange): void;
	removed (node: IgeUiNode): void;
	focus (el: IgeUiElement | null, opts?: { preventScroll?: boolean; focusVisible?: boolean }): void;
	clientRect (el: IgeUiElement): ReturnType<IgeUiElement["getBoundingClientRect"]>;
	scrollIntoView (el: IgeUiElement, block: "start" | "center" | "end" | "nearest"): void;
	flush (): void;
	listened? (type: string): void;
}

/**
 * What an engine document has in place of a window (`el.ownerDocument.defaultView`): code written for the page
 * reaches the observers and computed styles through it, so it works on either document.
 */
export interface IgeUiView {
	MutationObserver: new (callback: (records: never[], observer: never) => void) => { observe (target: IgeUiNode, opts: object): void; disconnect (): void; takeRecords (): unknown[] };
	ResizeObserver: new (callback: (entries: never[], observer: never) => void) => { observe (target: IgeUiElement): void; unobserve (target: IgeUiElement): void; disconnect (): void };
	getComputedStyle (el: IgeUiElement, pseudo?: string | null): Record<string, string> & { getPropertyValue (name: string): string };
	requestAnimationFrame (fn: (time: number) => void): number;
	cancelAnimationFrame (id: number): void;
	/** The UI's own size (CSS px of the UI: the screen less the safe area, over its scale). */
	readonly innerWidth: number;
	readonly innerHeight: number;
}

export class IgeUiDocument extends IgeUiNode {
	readonly documentElement: IgeUiElement;
	readonly body: IgeUiElement;
	activeElement: IgeUiElement | null = null;
	host?: IgeUiDocumentHost;
	/** Its window's stand-in (set by its IgeUiRoot). */
	defaultView: IgeUiView | null = null;
	/** The UI's scale (currentCSSZoom). */
	_zoom = 1;
	/** Device pixels per UI pixel (scroll offsets are kept on them). */
	_pixelGrid = 1;
	_selectorCache = new Map<string, IgeCssSelector[]>();

	constructor () {
		// (A document is its own owner)
		super(undefined as unknown as IgeUiDocument);
		this.ownerDocument = this;
		this.documentElement = new IgeUiElement(this, "html");
		this.body = new IgeUiElement(this, "body");
		this.body.parentNode = this.documentElement;
		this.documentElement.childNodes.push(this.body);
	}

	createElement (tag: string): IgeUiElement {
		return new IgeUiElement(this, tag);
	}

	createElementNS (_ns: string, tag: string): IgeUiElement {
		return new IgeUiElement(this, tag);
	}

	createTextNode (text: string): IgeUiText {
		return new IgeUiText(this, String(text));
	}

	createDocumentFragment (): IgeUiFragment {
		return new IgeUiFragment(this, "#fragment");
	}

	getElementById (id: string): IgeUiElement | null {
		return this.documentElement.querySelector(`#${id.replace(/([^\w-])/g, "\\$1")}`);
	}

	querySelector<T extends IgeUiElement = IgeUiElement> (s: string): T | null {
		return this.documentElement.querySelector<T>(s);
	}

	querySelectorAll<T extends IgeUiElement = IgeUiElement> (s: string): T[] {
		return this.documentElement.querySelectorAll<T>(s);
	}

	_selectors (text: string): IgeCssSelector[] {
		let list = this._selectorCache.get(text);
		if (!list) {
			list = parseSelectorList(text);
			if (this._selectorCache.size > 2000) this._selectorCache.clear();
			this._selectorCache.set(text, list);
		}
		return list;
	}

	_changed (el: IgeUiElement | null, change: IgeUiChange, attr?: string, tree?: IgeUiTreeChange): void {
		this.host?.changed(el, change, attr, tree);
	}

	_removed (node: IgeUiNode): void {
		if (this.activeElement && node.nodeType === 1 && (node as IgeUiElement).contains(this.activeElement)) this.activeElement = null;
		this.host?.removed(node);
	}

	_listened (type: string): void {
		this.host?.listened?.(type);
	}

	_focus (el: IgeUiElement | null, opts?: { preventScroll?: boolean; focusVisible?: boolean }): void {
		if (this.host) this.host.focus(el, opts);
		else this.activeElement = el;
	}

	_clientRect (el: IgeUiElement): ReturnType<IgeUiElement["getBoundingClientRect"]> {
		if (this.host) return this.host.clientRect(el);
		return { x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
	}

	_scrollIntoView (el: IgeUiElement, block: "start" | "center" | "end" | "nearest"): void {
		this.host?.scrollIntoView(el, block);
	}

	/** Styles and layout brought up to date (a measurement's being read). */
	_flush (): void {
		this.host?.flush();
	}
}
