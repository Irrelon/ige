/**
 * What ui2 needs from the platform it runs on, in one object handed to
 * `new IgeUiRoot({ host })`. Everything else in ui2 is plain TypeScript (the
 * CSS, the DOM, layout, the display list, animations): only the host reaches
 * a browser, or a native platform.
 *
 * - `time`: the clock and frames.
 * - `display`: the surface the UI's shown on (size, pixel ratio, whether the
 *   window has the system's focus, the pointer's cursor).
 * - `text`: the fonts (measuring and metrics, for layout).
 * - `images`: pictures for `<img>` (loaded, decoded, their sizes).
 * - `surface`: 2D drawing surfaces (the backing of an engine `<canvas>`, the
 *   glyph atlas's rasteriser): the web's canvases, or the engine's own Canvas
 *   2D.
 * - `textEntry`: typing into the focused field (the web's hidden page input;
 *   a native host's text input, IME and on-screen keyboard).
 *
 * Input isn't in the host: a host calls `root.input(event)` with plain event
 * records (`IgeUiInputEvent`), and is told what the UI took. `attachInput`
 * is the web's adapter. Drawing isn't either: the renderer is the GPU's.
 *
 * `webUiHost()` (IgeUiWebHost.ts) is the browser's, and the default;
 * `igeUiHeadlessHost()` here needs nothing at all (tests, a server, the first
 * check that a native host has everything).
 */
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeCssMatrix } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiClip, IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { type IgeUiFontProvider, IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

export interface IgeUiHostTime {
	/** Now, in ms (monotonic). */
	now (): number;
	/** A callback before the next frame's drawn (the engine view's requestAnimationFrame). */
	frame (cb: (now: number) => void): number;
	cancelFrame (id: number): void;
}

export interface IgeUiHostDisplay {
	/** The surface's size in CSS px (the UI's screen before the game sets one). */
	size (): { w: number; h: number };
	/** Device pixels per CSS px. */
	dpr (): number;
	/** Whether the window has the system's focus (a browser shows no focus without it). */
	focused (): boolean;
	/** The pointer's cursor: a CSS cursor keyword, or "" for the platform's own (off the UI, or auto). */
	cursor (name: string): void;
}

export interface IgeUiHostText {
	/** Measuring and metrics, for layout. */
	readonly fonts: IgeUiFontProvider;
	/** Calls back when fonts arrive (web fonts loading late: measured and drawn again). Returns a function that stops. */
	onChange (cb: () => void): () => void;
}

/** A picture asked for by an `<img>`: its size once it's arrived, and what's uploaded to draw it. */
export interface IgeUiHostImage {
	readonly ready: boolean;
	readonly width: number;
	readonly height: number;
	/** What the renderer uploads (the web: the image element). */
	source (): unknown;
}

export interface IgeUiHostImages {
	/** Starts loading a picture (`done` once it's arrived, or failed); undefined where there are none (a test). */
	load (url: string, done: (ok: boolean) => void): IgeUiHostImage | undefined;
	/** A url as the platform has it (the web: made absolute against the page, as computed styles show it). */
	resolve (url: string): string;
}

/** A 2D drawing surface: the web's canvas (or OffscreenCanvas), or the engine's own Canvas 2D. */
export interface IgeUiSurface {
	width: number;
	height: number;
	getContext (kind: string, opts?: unknown): unknown;
	/**
	 * A surface the engine draws itself (IgeUiCanvas2d): what's drawn on it as the painter's own items, shown in a box
	 * (the canvas's, the UI's px) with the element's opacity, clip and transform, in place of a picture of its pixels
	 * (it has none to upload).
	 */
	paint? (items: IgeUiPaintItem[], x: number, y: number, w: number, h: number, opacity: number, clip: IgeUiClip, matrix?: IgeCssMatrix): void;
}

export interface IgeUiHostSurface {
	/**
	 * A surface w x h px; undefined where there are none (a test with no Canvas 2D). `el`: the engine <canvas> it's
	 * for (none for the glyph atlas's), so a host can give a canvas the engine's own (igeUiCanvas2dOn).
	 */
	create (w: number, h: number, el?: IgeUiElement): IgeUiSurface | undefined;
}

/** The field typing goes to, as the host's text input needs it. */
export interface IgeUiTextEntryField {
	readonly el: IgeUiElement;
	readonly value: string;
	readonly selectionStart: number | null;
	readonly selectionEnd: number | null;
	/** "password" (shown as dots, a password keyboard) or "text". */
	readonly type: "text" | "password";
	/** Where it is on the surface (CSS px): an IME's window beside it, an on-screen keyboard scrolled to it. */
	rect (): { x: number; y: number; w: number; h: number };
}

/** What a host's text input tells the UI. */
export interface IgeUiTextEntryEvents {
	/** Typed (a key, an IME's composition, a paste): the field's new value. */
	input (value: string): void;
	/** The value committed (a page input's change). */
	change (): void;
	/** A key while typing: true if the field (or what listens) cancelled it. */
	key (e: IgeUiKeyRecord): boolean;
	/** The selection moved in the typing (arrow keys, shift-select, select-all). */
	selection (start: number | null, end: number | null): void;
	/** The platform took the typing away (a click outside the UI). */
	blur (): void;
	/**
	 * An IME's composition: the part of the value being composed (start, end: indices into the value, drawn
	 * underlined), or null once it's committed or cancelled.
	 */
	composition (range: { start: number; end: number } | null): void;
}

export interface IgeUiHostTextEntry {
	/** Typing goes to this field now (or it changed: its value, type, place or selection); null, to none. */
	focus (field: IgeUiTextEntryField | null, events: IgeUiTextEntryEvents): void;
	/** The field's selection set by code (select(), setSelectionRange()): onto the typing. */
	select (start: number, end: number): void;
	/** A touch on the field that has the typing: an on-screen keyboard brought up again. */
	reopen (): void;
}

/** A key as the UI takes it. */
export interface IgeUiKeyRecord {
	key: string;
	code?: string;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
	repeat?: boolean;
}

export interface IgeUiHost {
	readonly time: IgeUiHostTime;
	readonly display: IgeUiHostDisplay;
	readonly text: IgeUiHostText;
	readonly images: IgeUiHostImages;
	readonly surface: IgeUiHostSurface;
	readonly textEntry: IgeUiHostTextEntry;
}

/**
 * An input event a host gives the UI (`root.input()`): a pointer, the mouse's own, the wheel or a key, with the
 * fields a browser's event of that type has.
 */
export interface IgeUiInputEvent {
	type: "pointermove" | "pointerdown" | "pointerup" | "pointercancel" | "pointerout" | "click" | "mousedown" | "mouseup" | "contextmenu" | "wheel" | "keydown" | "keyup";
	clientX?: number;
	clientY?: number;
	button?: number;
	buttons?: number;
	pointerId?: number;
	pointerType?: string;
	isPrimary?: boolean;
	detail?: number;
	timeStamp?: number;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
	key?: string;
	code?: string;
	repeat?: boolean;
	deltaX?: number;
	deltaY?: number;
	deltaMode?: number;
	/** pointerout: where the pointer went (null: out of the window). */
	relatedTarget?: unknown;
	/** A person's, not a script's (keys typed count for :focus-visible only then). */
	isTrusted?: boolean;
	/** Cancelled already (by something that saw it first). */
	defaultPrevented?: boolean;
}

/** What the UI did with an input event: took it (the game shouldn't see it), and cancelled its default. */
export interface IgeUiInputResult {
	stop: boolean;
	prevent: boolean;
}

/** Options for the headless host. */
export interface IgeUiHeadlessHostOptions {
	/** The surface's size (default 1280 x 720). */
	width?: number;
	height?: number;
	dpr?: number;
	/** The fonts (default: fixed widths, IgeUiFixedFonts). */
	fonts?: IgeUiFontProvider;
	/** The clock (default: one that only moves when it's told, `host.advance(ms)`). */
	now?: () => number;
}

/** The headless host: what moves it and what it was told (the cursor, the field typing goes to). */
export interface IgeUiHeadlessHost extends IgeUiHost {
	/** Moves the clock on (frames that fall due are called). */
	advance (ms: number): void;
	/** The cursor last asked for. */
	cursorName: string;
	/** The field typing goes to, and its events (to type into it). */
	typing: { field: IgeUiTextEntryField; events: IgeUiTextEntryEvents } | null;
}

/**
 * A host that needs nothing from a platform: a fixed-size surface, fixed-width fonts, a clock moved by hand, no
 * pictures or 2D surfaces, typing recorded. Tests, a server, and the check that ui2 runs with no browser at all.
 */
export function igeUiHeadlessHost (opts: IgeUiHeadlessHostOptions = {}): IgeUiHeadlessHost {
	let clock = 0;
	let nextFrame = 1;
	const frames = new Map<number, (now: number) => void>();
	const now = opts.now ?? (() => clock);
	const host: IgeUiHeadlessHost = {
		time: {
			now,
			frame: (cb) => {
				const id = nextFrame++;
				frames.set(id, cb);
				return id;
			},
			cancelFrame: (id) => void frames.delete(id)
		},
		display: {
			size: () => ({ w: opts.width ?? 1280, h: opts.height ?? 720 }),
			dpr: () => opts.dpr ?? 1,
			focused: () => true,
			cursor: (name) => {
				host.cursorName = name;
			}
		},
		text: {
			fonts: opts.fonts ?? new IgeUiFixedFonts(),
			onChange: () => () => undefined
		},
		images: {
			load: () => undefined,
			resolve: (url) => url
		},
		surface: {
			create: () => undefined
		},
		textEntry: {
			focus: (field, events) => {
				host.typing = field ? { field, events } : null;
			},
			select: () => undefined,
			reopen: () => undefined
		},
		advance: (ms) => {
			clock += ms;
			const due = [...frames];
			frames.clear();
			for (const [, cb] of due) cb(now());
		},
		cursorName: "",
		typing: null
	};
	return host;
}
