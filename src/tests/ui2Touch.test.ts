import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

/** A headless UI of w x h, its body unpadded, with the given stylesheet. */
function ui (css: string = "", w = 400, h = 300): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	r.addStyleSheet(`body { margin: 0; font-family: sans-serif; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

/** A page pointer event as the window has it (and whether the UI kept it from the page). */
function pe (x: number, y: number, o: { id?: number; type?: string; primary?: boolean; buttons?: number; t?: number } = {}) {
	const e = {
		clientX: x, clientY: y, button: 0, buttons: o.buttons ?? 1, pointerType: o.type ?? "touch", pointerId: o.id ?? 1, isPrimary: o.primary ?? true, timeStamp: o.t ?? 0,
		stopped: false, prevented: false,
		stopImmediatePropagation () {
			e.stopped = true;
		},
		preventDefault () {
			e.prevented = true;
		}
	};
	return e;
}

/** Each event an element gets, as "type:pointerId". */
function record (els: Record<string, { addEventListener (t: string, fn: (e: { pointerId: number; type: string }) => void): void }>, types: string[]): string[] {
	const got: string[] = [];
	for (const [name, el] of Object.entries(els)) for (const t of types) el.addEventListener(t, (e) => got.push(`${name} ${t}:${e.pointerId}`));
	return got;
}

describe("ui2: fingers at once (touch)", () => {
	it("two fingers, each on its own element: a finger's moves and lift go where it landed (a touch is captured there), whichever element it's over", () => {
		const r = ui(`.a, .b { position: absolute; top: 0; width: 100px; height: 100px; } .a { left: 0; } .b { left: 200px; }`);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div>`;
		const a = r.root.querySelector(".a")!, b = r.root.querySelector(".b")!;
		const got = record({ a, b }, ["pointerdown", "pointermove", "pointerup"]);
		r._pointer("pointerdown", pe(50, 50, { id: 1 }) as never);
		r._pointer("pointerdown", pe(250, 50, { id: 2, primary: false }) as never);
		// Finger 1 slides over b, finger 2 over a: still their own
		r._pointer("pointermove", pe(250, 60, { id: 1 }) as never);
		r._pointer("pointermove", pe(50, 60, { id: 2, primary: false }) as never);
		r._pointer("pointerup", pe(250, 60, { id: 1, buttons: 0 }) as never);
		r._pointer("pointerup", pe(50, 60, { id: 2, primary: false, buttons: 0 }) as never);
		expect(got).toEqual(["a pointerdown:1", "b pointerdown:2", "a pointermove:1", "b pointermove:2", "a pointerup:1", "b pointerup:2"]);
	});

	it("a finger released from its capture goes to what it's over again; the mouse isn't captured unless asked", () => {
		const r = ui(`.a, .b { position: absolute; top: 0; width: 100px; height: 100px; } .a { left: 0; } .b { left: 200px; }`);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div>`;
		const a = r.root.querySelector(".a")!, b = r.root.querySelector(".b")!;
		const got = record({ a, b }, ["pointermove"]);
		a.addEventListener("pointerdown", (e) => a.releasePointerCapture(e.pointerId as number));
		r._pointer("pointerdown", pe(50, 50, { id: 3 }) as never);
		expect(a.hasPointerCapture(3)).toBe(false);
		r._pointer("pointermove", pe(250, 50, { id: 3 }) as never);
		r._pointer("pointerdown", pe(50, 50, { id: 9, type: "mouse" }) as never);
		r._pointer("pointermove", pe(250, 50, { id: 9, type: "mouse" }) as never);
		expect(got).toEqual(["b pointermove:3", "b pointermove:9"]);
	});

	it("two captures at once, one a pointer each", () => {
		const r = ui(`.a, .b { width: 100px; height: 50px; }`);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div>`;
		const a = r.root.querySelector(".a")!, b = r.root.querySelector(".b")!;
		a.setPointerCapture(1);
		b.setPointerCapture(2);
		expect([a.hasPointerCapture(1), b.hasPointerCapture(2), a.hasPointerCapture(2)]).toEqual([true, true, false]);
		a.releasePointerCapture(2);
		expect(b.hasPointerCapture(2)).toBe(true);
	});

	it("a finger that lands on the game stays the game's: crossing the UI it isn't taken (nor its lift)", () => {
		const r = ui(`.a { position: absolute; left: 0; top: 0; width: 100px; height: 100px; }`);
		r.root.innerHTML = `<div class="a"></div>`;
		const a = r.root.querySelector(".a")!;
		const got = record({ a }, ["pointermove", "pointerup"]);
		const down = pe(300, 200, { id: 4 });
		r._pointer("pointerdown", down as never);
		const move = pe(50, 50, { id: 4 }), up = pe(50, 50, { id: 4, buttons: 0 });
		r._pointer("pointermove", move as never);
		r._pointer("pointerup", up as never);
		expect(got).toEqual([]);
		expect([down.stopped, move.stopped, up.stopped]).toEqual([false, false, false]);
		// (Its next press is the UI's as usual)
		r._pointer("pointerdown", pe(50, 50, { id: 4 }) as never);
		r._pointer("pointerup", pe(50, 50, { id: 4, buttons: 0 }) as never);
		expect(got).toEqual(["a pointerup:4"]);
	});

	it(":active stays on what another finger still holds", () => {
		const r = ui(`.p { width: 200px; } .a, .b { width: 100px; height: 50px; }`);
		r.root.innerHTML = `<div class="p"><div class="a"></div><div class="b"></div></div>`;
		const p = r.root.querySelector(".p")!, a = r.root.querySelector(".a")!, b = r.root.querySelector(".b")!;
		r._pointer("pointerdown", pe(10, 10, { id: 1 }) as never);
		r._pointer("pointerdown", pe(10, 60, { id: 2, primary: false }) as never);
		expect([a.matches(":active"), b.matches(":active"), p.matches(":active")]).toEqual([true, true, true]);
		r._pointer("pointerup", pe(10, 10, { id: 1, buttons: 0 }) as never);
		expect([a.matches(":active"), b.matches(":active"), p.matches(":active")]).toEqual([false, true, true]);
		r._pointer("pointerup", pe(10, 60, { id: 2, primary: false, buttons: 0 }) as never);
		expect([b.matches(":active"), p.matches(":active")]).toEqual([false, false]);
	});

	it("a tap clicks; a finger that slid past the slop, or a second finger, doesn't (nor do the mouse's events follow a second finger)", () => {
		const r = ui(`button { display: block; width: 100px; height: 40px; }`);
		r.root.innerHTML = `<button class="a">A</button><button class="b">B</button>`;
		const a = r.root.querySelector(".a")!, b = r.root.querySelector(".b")!;
		const got = record({ a, b }, ["click", "mousedown", "mouseup"]);
		r._pointer("pointerdown", pe(20, 20, { id: 1 }) as never);
		r._pointer("pointerup", pe(24, 22, { id: 1, buttons: 0 }) as never);
		r._pointer("pointerdown", pe(20, 20, { id: 2 }) as never);
		r._pointer("pointermove", pe(60, 25, { id: 2 }) as never);
		r._pointer("pointerup", pe(60, 25, { id: 2, buttons: 0 }) as never);
		r._pointer("pointerdown", pe(20, 20, { id: 3 }) as never);
		r._pointer("pointerdown", pe(20, 60, { id: 4, primary: false }) as never);
		r._pointer("pointerup", pe(20, 60, { id: 4, primary: false, buttons: 0 }) as never);
		r._pointer("pointerup", pe(20, 20, { id: 3, buttons: 0 }) as never);
		// (A finger's mouse events come as it lifts from a tap: none for the slide)
		expect(got).toEqual(["a mousedown:1", "a mouseup:1", "a click:1", "a mousedown:3", "a mouseup:3", "a click:3"]);
	});

	it("a touch drag scrolls its box, unless touch-action on the way says no (none, pan-x)", () => {
		const r = ui(`.s { height: 100px; overflow-y: auto; } .s div { height: 50px; } .no { touch-action: none; } .x { touch-action: pan-x; }`);
		r.root.innerHTML = `<div class="s"><div class="free"></div><div class="no"></div><div class="x"></div><div></div><div></div><div></div></div>`;
		const s = r.root.querySelector(".s")!;
		r.update(0);
		const drag = (y: number, id: number) => {
			r._pointer("pointerdown", pe(20, y, { id }) as never);
			r._pointer("pointermove", pe(20, y - 30, { id, t: 16 }) as never);
			r._pointer("pointerup", pe(20, y - 30, { id, buttons: 0, t: 32 }) as never);
			r._momentum = undefined;
		};
		drag(20, 1);
		expect(s.scrollTop).toBe(30);
		s.scrollTop = 0;
		r.update(16);
		drag(70, 2);
		expect(s.scrollTop).toBe(0);
		r.update(32);
		drag(120 - 0, 3);
		expect(s.scrollTop).toBe(0);
	});

	it("events carry the pointer's isPrimary and the page event's time", () => {
		const r = ui(`.a { width: 100px; height: 100px; }`);
		r.root.innerHTML = `<div class="a"></div>`;
		const a = r.root.querySelector(".a")!;
		const seen: unknown[] = [];
		a.addEventListener("pointerdown", (e) => seen.push([e.isPrimary, e.timeStamp]));
		r._pointer("pointerdown", pe(10, 10, { id: 1, t: 1234 }) as never);
		r._pointer("pointerdown", pe(20, 10, { id: 2, primary: false, t: 1250 }) as never);
		expect(seen).toEqual([[true, 1234], [false, 1250]]);
	});
});

describe("ui2: a cancelled press", () => {
	it("pointerdown's preventDefault keeps the mouse's events back, and the focus a press gives (a field keeps it); the click still comes", () => {
		const r = ui(`button, input { display: block; width: 100px; height: 30px; }`);
		r.root.innerHTML = `<input class="f"><button class="b">B</button>`;
		const f = r.root.querySelector(".f")!, b = r.root.querySelector(".b")!;
		const got = record({ b }, ["mousedown", "mouseup", "click"]);
		b.addEventListener("pointerdown", (e) => e.preventDefault());
		r.focus(f);
		r._pointer("pointerdown", pe(20, 40, { id: 1 }) as never);
		r._pointer("pointerup", pe(20, 40, { id: 1, buttons: 0 }) as never);
		expect(got).toEqual(["b click:1"]);
		expect(r.document.activeElement).toBe(f);
	});

	it("mousedown's preventDefault keeps the focus where it was", () => {
		const r = ui(`button, input { display: block; width: 100px; height: 30px; }`);
		r.root.innerHTML = `<input class="f"><button class="b">B</button>`;
		const f = r.root.querySelector(".f")!, b = r.root.querySelector(".b")!;
		b.addEventListener("mousedown", (e) => e.preventDefault());
		r.focus(f);
		r._pointer("pointerdown", pe(20, 40, { id: 1, type: "mouse" }) as never);
		r._pointer("pointerup", pe(20, 40, { id: 1, type: "mouse", buttons: 0 }) as never);
		expect(r.document.activeElement).toBe(f);
	});
});

describe("ui2: computed opacity", () => {
	it("calc() with var() is worked out and kept to 0 to 1, as a browser writes it", () => {
		const r = ui(`.a { --o: 0.7; opacity: calc(var(--o) * 0.55); } .b { opacity: calc(2 * 1); }`);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div>`;
		const v = r.document.defaultView!;
		expect(v.getComputedStyle(r.root.querySelector(".a")!).opacity).toBe("0.385");
		expect(v.getComputedStyle(r.root.querySelector(".b")!).opacity).toBe("1");
	});
});

describe("ui2: outlines and range sliders", () => {
	it("a dashed outline is drawn as dashes round the box (a solid one as a ring)", () => {
		const r = ui(`.a, .b { position: absolute; top: 10px; width: 100px; height: 60px; } .a { left: 10px; outline: 1px dashed red; outline-offset: 3px; } .b { left: 200px; outline: 2px solid blue; }`);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div>`;
		r.update(0);
		const a = r.root.querySelector(".a")!, b = r.root.querySelector(".b")!;
		const dashes = r.items.filter((i) => i.el === a && i.op === "box");
		expect(dashes.length).toBeGreaterThan(8);
		const ring = r.items.filter((i) => i.el === b && i.op === "box" && (i as { border?: number }).border === 2);
		expect(ring.length).toBe(1);
	});

	it("a range slider in a transformed box is drawn through the transform; disabled, it's grey with no fill", () => {
		const r = ui(`.t { position: absolute; left: 200px; top: 0; transform: translateX(-50%); width: 200px; }`);
		r.root.innerHTML = `<div class="t"><input type="range" class="on" value="50"><input type="range" class="off" value="50" disabled></div>`;
		r.update(0);
		const on = r.root.querySelector(".on")!, off = r.root.querySelector(".off")!;
		const parts = r.items.filter((i) => i.el === on);
		expect(parts.length).toBe(3);
		expect(parts.every((i) => i.matrix && i.matrix[4] === -100)).toBe(true);
		const grey = r.items.filter((i) => i.el === off);
		expect(grey.length).toBe(2);
		expect((grey[1] as { color: { r: number } }).color.r).toBe(197);
		expect(r.document.defaultView!.getComputedStyle(off).backgroundColor).toBe("rgba(0, 0, 0, 0)");
	});
});

describe("ui2: a finger's tap", () => {
	it("focuses as it lifts, not as it presses (the mouse's events come then, as a browser sends them after a tap)", () => {
		const r = ui(`button { display: block; width: 100px; height: 30px; }`);
		r.root.innerHTML = `<button class="b">B</button>`;
		const b = r.root.querySelector(".b")!;
		r._pointer("pointerdown", pe(20, 10, { id: 1 }) as never);
		expect(r.document.activeElement).toBe(null);
		r._pointer("pointerup", pe(20, 10, { id: 1, buttons: 0 }) as never);
		expect(r.document.activeElement).toBe(b);
		// (The mouse presses at once)
		r.focus(null);
		r._pointer("pointerdown", pe(20, 10, { id: 9, type: "mouse" }) as never);
		expect(r.document.activeElement).toBe(b);
	});
});
