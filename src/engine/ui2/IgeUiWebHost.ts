/**
 * The browser's IgeUiHost: what ui2 did with the page directly before the
 * host seam, moved here unchanged. It's the default (`new IgeUiRoot()`), and
 * it works with no page too (a test in Node): fixed-width fonts, the root's
 * own screen size, no pictures or canvases, no typing.
 *
 * - time: `performance.now()`, `requestAnimationFrame` (a 16 ms timer without one).
 * - display: the window's size and devicePixelRatio, `document.hasFocus()`, and the cursor on an element's style
 *   (`opts.cursor`: the canvas the UI's drawn on, whose cursor the page shows over it).
 * - text: the page's fonts measured with a canvas and the DOM (IgeUiCanvasFonts), measured again as web fonts load.
 * - images: `new Image()`; urls made absolute against the page.
 * - surface: a page `<canvas>` (or an OffscreenCanvas in a worker).
 * - textEntry: a hidden page `<input>` kept over the focused field, so typing, an IME's composition, paste and a
 *   phone's keyboard work as they do in a page; its selection mirrored onto the field.
 *
 * `igeUiAttachWebInput()` is the web's input: the window's pointer, wheel and key events given to `root.input()`,
 * and stopped where the UI took them.
 */
import type { IgeUiHost, IgeUiHostImage, IgeUiInputEvent, IgeUiSurface, IgeUiTextEntryEvents, IgeUiTextEntryField } from "@/engine/ui2/IgeUiHost";
import { IgeUiCanvasFonts, IgeUiFixedFonts, type IgeUiFontProvider } from "@/engine/ui2/text/IgeUiFonts";

export interface IgeUiWebHostOptions {
	/** The element whose style shows the UI's cursor (the canvas it's drawn on). */
	cursor?: { style: { cursor: string } };
}

/** The browser's host (also fine with no page: Node). */
export function webUiHost (opts: IgeUiWebHostOptions = {}): IgeUiHost & { cursorTarget?: { style: { cursor: string } } } {
	// (A page or not, asked as it's needed: a test can give it one later)
	const page = () => typeof document !== "undefined";
	let fonts: IgeUiFontProvider | undefined;
	const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
	const host = {
		cursorTarget: opts.cursor,
		time: {
			now,
			frame: (cb: (t: number) => void): number => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(cb) : (setTimeout(() => cb(now()), 16) as unknown as number)),
			cancelFrame: (id: number) => (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id))
		},
		display: {
			size: () => (typeof window !== "undefined" ? { w: window.innerWidth, h: window.innerHeight } : { w: 1280, h: 720 }),
			dpr: () => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
			focused: () => typeof document === "undefined" || typeof document.hasFocus !== "function" || document.hasFocus(),
			cursor: (name: string) => {
				const el = host.cursorTarget;
				if (el && el.style.cursor !== name) el.style.cursor = name;
			}
		},
		text: {
			// (Made when it's first asked for: a root given its own fonts makes none)
			get fonts (): IgeUiFontProvider {
				return (fonts ??= page() ? new IgeUiCanvasFonts() : new IgeUiFixedFonts());
			},
			onChange: (cb: () => void) => {
				if (!page() || !document.fonts) return () => undefined;
				document.fonts.addEventListener?.("loadingdone", cb);
				void document.fonts.ready?.then(cb);
				return () => document.fonts.removeEventListener?.("loadingdone", cb);
			}
		},
		images: {
			load: (url: string, done: (ok: boolean) => void): IgeUiHostImage | undefined => {
				if (typeof Image === "undefined") return undefined;
				const img = new Image();
				img.decoding = "async";
				img.onload = () => done(true);
				img.onerror = () => done(false);
				img.src = url;
				return {
					get ready () {
						return img.complete && img.naturalWidth > 0;
					},
					get width () {
						return img.naturalWidth;
					},
					get height () {
						return img.naturalHeight;
					},
					source: () => img
				};
			},
			resolve: (url: string): string => {
				// (Computed styles give whole URLs, as the page has them)
				try {
					if (page() && !/^(data|blob):/i.test(url)) return new URL(url, document.baseURI).href;
				} catch {
					// (Not a URL a page could load: as written)
				}
				return url;
			}
		},
		surface: {
			create: (w: number, h: number): IgeUiSurface | undefined => {
				const c = page() ? document.createElement("canvas") : typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : undefined;
				if (!c) return undefined;
				c.width = w;
				c.height = h;
				return c as unknown as IgeUiSurface;
			}
		},
		textEntry: webTextEntry()
	};
	return host;
}

// ---------------------------------------------------------------- typing: a hidden page input

/** A field's selection (as the field keeps it). */
interface Selectable {
	selectionStart?: number | null;
	selectionEnd?: number | null;
}

function webTextEntry (): IgeUiHost["textEntry"] {
	let input: HTMLInputElement | undefined;
	let field: IgeUiTextEntryField | null = null;
	let events: IgeUiTextEntryEvents | undefined;
	/** Mirrors the hidden input's selection onto the field as it changes (keys, the selection moved, a paste). */
	const mirror = () => {
		if (!input || !field || !events) return;
		const sel = field.el as unknown as Selectable;
		if (sel.selectionStart === input.selectionStart && sel.selectionEnd === input.selectionEnd) return;
		events.selection(input.selectionStart, input.selectionEnd);
	};
	const make = (): HTMLInputElement => {
		const el = document.createElement("input");
		el.setAttribute("aria-hidden", "true");
		// (The engine's own on the page, marked so a game watching the page can tell: data-ige)
		el.setAttribute("data-ige", "text-input");
		el.style.cssText = "position:fixed;left:-1000px;top:0;width:200px;height:20px;opacity:0;pointer-events:none;";
		document.body.appendChild(el);
		el.addEventListener("input", () => events?.input(el.value));
		el.addEventListener("change", () => events?.change());
		// (Its keys to the field, unless the window's input (igeUiAttachWebInput) gave it them already; on to the page's
		// listeners, as a browser's field's are)
		el.addEventListener("keydown", (e) => {
			if (!events || keysTaken.has(e)) return;
			if (events.key({ key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey })) e.preventDefault();
		});
		// (The page took focus from the field (a click outside the UI): the field loses it. Focus the UI moved on
		// itself (a button pressed, which blurs this input as it goes) stays where it went. The window losing the
		// system's focus blurs this input too, but a page keeps its focused element through that and gives it the
		// focus back as the window has it again: so does the UI)
		el.addEventListener("blur", () => {
			setTimeout(() => {
				if (events && document.hasFocus() && document.activeElement !== el) events.blur();
			}, 0);
		});
		// An IME's composition: where it starts as it begins (over what was selected), as long as what's composed
		let composeFrom = 0;
		el.addEventListener("compositionstart", () => {
			composeFrom = Math.min(el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length);
			events?.composition({ start: composeFrom, end: composeFrom });
		});
		el.addEventListener("compositionupdate", (e) => events?.composition({ start: composeFrom, end: composeFrom + ((e as CompositionEvent).data ?? "").length }));
		el.addEventListener("compositionend", () => events?.composition(null));
		for (const type of ["input", "keydown", "keyup", "select", "focus", "mouseup"]) el.addEventListener(type, () => queueMicrotask(mirror));
		document.addEventListener("selectionchange", () => {
			if (document.activeElement === el) mirror();
		});
		return el;
	};
	/** The field's selection onto the hidden input (as it takes over the typing, or the field's changed), else the caret at the end. */
	const takeSelection = (f: IgeUiTextEntryField, start0: number | null = f.selectionStart, end0: number | null = f.selectionEnd) => {
		if (!input) return;
		const len = input.value.length;
		const end = Math.max(0, Math.min(len, end0 ?? len));
		const start = Math.max(0, Math.min(end, start0 ?? end));
		try {
			input.setSelectionRange(start, end);
		} catch {
			// (A type without a selection)
		}
		// (The field told where it is, as the typing has it)
		const sel = f.el as unknown as Selectable;
		if (sel.selectionStart !== start || sel.selectionEnd !== end) events?.selection(start, end);
	};
	return {
		focus (f, ev) {
			if (typeof document === "undefined") return;
			const prev = field;
			field = f;
			events = ev;
			if (!f) {
				input?.blur();
				return;
			}
			input ??= make();
			// (Another field, or this one's value changed by code: its value and selection given to the input)
			const fresh = input.value !== f.value || prev?.el !== f.el;
			if (input.value !== f.value) input.value = f.value;
			input.type = f.type;
			if (f.maxLength >= 0) input.maxLength = f.maxLength;
			else input.removeAttribute("maxlength");
			// (Over the field, at a size a phone won't zoom in on: an IME's window beside it, a phone's keyboard scrolled to it)
			const r = f.rect();
			const st = input.style;
			st.left = `${Math.round(r.x)}px`;
			st.top = `${Math.round(r.y)}px`;
			st.width = `${Math.max(1, Math.round(r.w))}px`;
			st.height = `${Math.max(1, Math.round(r.h))}px`;
			st.fontSize = "16px";
			if (fresh || document.activeElement !== input) takeSelection(f);
			input.focus({ preventScroll: true });
		},
		select (start, end) {
			if (!input || !field || input.value !== field.value) return;
			takeSelection(field, start, end);
		},
		reopen () {
			input?.focus({ preventScroll: true });
		}
	};
}

// ---------------------------------------------------------------- input: the window's events

/** The fields an input record takes from a page event. */
function record (type: IgeUiInputEvent["type"], e: Event): IgeUiInputEvent {
	const m = e as PointerEvent & WheelEvent & KeyboardEvent;
	return {
		type, clientX: m.clientX, clientY: m.clientY, button: m.button, buttons: m.buttons, pointerId: m.pointerId, pointerType: m.pointerType, isPrimary: m.isPrimary,
		detail: m.detail, timeStamp: m.timeStamp, shiftKey: m.shiftKey, ctrlKey: m.ctrlKey, altKey: m.altKey, metaKey: m.metaKey, key: m.key, code: m.code, repeat: m.repeat,
		deltaX: m.deltaX, deltaY: m.deltaY, deltaMode: m.deltaMode, relatedTarget: m.relatedTarget, isTrusted: m.isTrusted, defaultPrevented: m.defaultPrevented
	};
}

/** Key events the window's input gave the UI (so the text input doesn't give the focused field them again). */
const keysTaken = new WeakSet<Event>();

/**
 * The web's input: the window's (or another target's) pointer, mouse, wheel and key events, in capture, given to
 * the UI; what it took stopped there (and its default cancelled where it said). Returns a function that stops.
 */
export function igeUiAttachWebInput (root: { input (e: IgeUiInputEvent): { stop: boolean; prevent: boolean } }, target: EventTarget = window): () => void {
	const opts = { capture: true, passive: false } as AddEventListenerOptions;
	const types: IgeUiInputEvent["type"][] = ["pointermove", "pointerdown", "pointerup", "pointercancel", "pointerout", "click", "mousedown", "mouseup", "contextmenu", "wheel", "keydown", "keyup"];
	const offs = types.map((type) => {
		const fn = (e: Event) => {
			if (type === "keydown" || type === "keyup") keysTaken.add(e);
			const r = root.input(record(type, e));
			if (r.prevent) e.preventDefault();
			if (r.stop) e.stopImmediatePropagation();
		};
		target.addEventListener(type, fn, opts);
		return () => target.removeEventListener(type, fn, opts);
	});
	return () => offs.forEach((f) => f());
}
