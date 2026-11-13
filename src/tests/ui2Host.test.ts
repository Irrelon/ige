/**
 * ui2 with no browser: an IgeUiRoot on the headless host (IgeUiHost), with every browser global watched. Building
 * the UI from CSS text and markup, laying it out, painting it, pointing at it, focusing a field and typing into it
 * must reach no browser global from ui2's own code (the web host, IgeUiWebHost.ts, is the one place that may).
 */
import type { IgeUiHeadlessHost } from "@/engine/ui2/IgeUiHost";
import type { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";

/** What a browser has and a native host (or Node) doesn't, or what ui2 must get from its host instead. */
const BROWSER_GLOBALS = [
	"window", "document", "navigator", "location", "localStorage", "sessionStorage", "devicePixelRatio", "getComputedStyle", "matchMedia",
	"performance", "requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "queueMicrotask",
	"Image", "OffscreenCanvas", "HTMLElement", "HTMLCanvasElement", "HTMLImageElement", "CanvasRenderingContext2D", "FontFace", "fetch",
	"MutationObserver", "ResizeObserver", "PointerEvent", "KeyboardEvent", "MouseEvent", "Event"
];

/** Runs `fn` with the browser globals watched: each one ui2's code reaches (outside the web host) is recorded. */
function watching<T> (fn: () => T): { result: T; reached: string[] } {
	const reached: string[] = [];
	const saved = new Map<string, PropertyDescriptor | undefined>();
	for (const name of BROWSER_GLOBALS) {
		const own = Object.getOwnPropertyDescriptor(globalThis, name);
		saved.set(name, own);
		const value = own ? ("value" in own ? own.value : own.get?.call(globalThis)) : undefined;
		Object.defineProperty(globalThis, name, {
			configurable: true,
			get () {
				// (The frame that asked: ui2's own code, not the web host's, not jest's)
				const stack = (new Error().stack ?? "").split("\n").slice(2);
				const caller = stack.find((l) => !/node_modules|node:internal/.test(l)) ?? "";
				if (/src\/engine\/ui2\//.test(caller) && !/IgeUiWebHost\.ts/.test(caller)) reached.push(`${name} from ${caller.trim()}`);
				return value;
			}
		});
	}
	try {
		return { result: fn(), reached };
	} finally {
		for (const [name, own] of saved) {
			if (own) Object.defineProperty(globalThis, name, own);
			else delete (globalThis as Record<string, unknown>)[name];
		}
	}
}

describe("ui2 with no browser (IgeUiHost)", () => {
	it("builds, styles, lays out, paints and takes input on the headless host without reaching a browser global", async () => {
		let host!: IgeUiHeadlessHost, root!: IgeUiRoot, items: string[] = [];
		const { reached } = watching(() => {
			// (Its modules loaded afresh here, watched too: nothing at their top level reaches the browser)
			jest.isolateModules(() => {
				const { IgeUiRoot: Root } = require("@/engine/ui2/IgeUiRoot") as typeof import("@/engine/ui2/IgeUiRoot");
				const { igeUiHeadlessHost } = require("@/engine/ui2/IgeUiHost") as typeof import("@/engine/ui2/IgeUiHost");
				const { describePaint } = require("@/engine/ui2/render/IgeUiPaint") as typeof import("@/engine/ui2/render/IgeUiPaint");
				host = igeUiHeadlessHost({ width: 400, height: 300 });
				root = new Root({ host });
				root.addStyleSheet(`body { margin: 0; font: 10px sans-serif; line-height: 1; }
					.panel { display: flex; gap: 10px; padding: 10px; background: #102030; }
					.panel button { width: 80px; height: 20px; color: #fff; background: #333; border: 1px solid #5fe3ff; }
					.panel button:hover { background: #555; }
					input { width: 100px; height: 16px; }
					.grid { display: grid; grid-template-columns: 1fr 1fr; }`);
				root.root.innerHTML = `<div class="panel"><button class="a">One</button><button class="b">Two</button></div><input class="f" value="hi"><div class="grid"><span>a</span><span>b</span></div><canvas width="10" height="10"></canvas><img src="x.png">`;
				root.update(host.time.now());
				// Pointed at: hover, a press and a click
				root.input({ type: "pointermove", clientX: 20, clientY: 15, pointerId: 1, pointerType: "mouse", buttons: 0 });
				root.update(host.time.now());
				// A field focused and typed into, through the host's text entry
				root.focus(root.root.querySelector(".f"));
				host.typing?.events.composition({ start: 0, end: 2 });
				host.typing?.events.input("hello");
				root.update(host.time.now());
				// A canvas with no 2D surface on this host, and a picture it can't load: neither throws
				(root.root.querySelector("canvas") as unknown as { getContext (k: string): unknown }).getContext("2d");
				root.document.defaultView!.getComputedStyle(root.root.querySelector(".a")!).backgroundColor;
				host.advance(16);
				items = describePaint(root.items);
			});
		});
		expect(reached).toEqual([]);
		const box = (s: string) => {
			const r = root.root.querySelector(s)!.getBoundingClientRect();
			return [r.left, r.top, r.width, r.height];
		};
		expect(box(".a")).toEqual([10, 10, 80, 20]);
		expect(box(".b")).toEqual([100, 10, 80, 20]);
		expect(box(".grid span:last-child")[0]).toBe(200);
		expect(root.root.querySelector(".a")!.matches(":hover")).toBe(true);
		expect(root.root.querySelector(".a")!._computed!["background-color"]).toBe("#555");
		expect((root.root.querySelector(".f") as unknown as { value: string }).value).toBe("hello");
		expect(host.typing?.field.el).toBe(root.root.querySelector(".f"));
		expect(root.root.querySelector(".f")!._composition).toEqual({ start: 0, end: 2 });
		// The display list: the panel, the buttons with their text, the field
		expect(items.slice(0, 7)).toEqual([
			"box 0,0 400x40 rgba(16,32,48,1)",
			// (The hovered button's :hover background)
			"box 10,10 80x20 rgba(85,85,85,1)",
			"box 10,10 80x20 border 1 rgba(95,227,255,1)",
			"text \"One\" 40,24.5 13.333px/400 rgba(255,255,255,1)",
			"box 100,10 80x20 rgba(51,51,51,1)",
			"box 100,10 80x20 border 1 rgba(95,227,255,1)",
			"text \"Two\" 130,24.5 13.333px/400 rgba(255,255,255,1)"
		]);
		expect(items.filter((i) => i.startsWith("text \"One\"") || i.startsWith("text \"Two\"")).length).toBe(2);
		// Observers' records come in a microtask (no host call), after the change
		const seen: number[] = [];
		new (root.document.defaultView!.MutationObserver)(((recs: unknown[]) => seen.push(recs.length)) as never).observe(root.root, { childList: true });
		root.root.appendChild(root.document.createElement("p"));
		await Promise.resolve();
		expect(seen).toEqual([1]);
	});
});
