import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string = ""): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
	r.addStyleSheet(`body { margin: 0; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

/** A page pointer event as the window has it. */
function pe (x: number, y: number, o: { id?: number; type?: string; buttons?: number; w?: number } = {}) {
	return {
		clientX: x, clientY: y, button: 0, buttons: o.buttons ?? 1, pointerType: o.type ?? "touch", pointerId: o.id ?? 1, isPrimary: true, timeStamp: 0,
		width: o.w ?? 0, height: o.w ?? 0, stopImmediatePropagation () {}, preventDefault () {}
	} as never;
}

function tap (r: IgeUiRoot, x: number, y: number, o: { type?: string; w?: number } = {}) {
	r._pointer("pointerdown", pe(x, y, o));
	r._pointer("pointerup", pe(x, y, { ...o, buttons: 0 }));
}

describe("ui2: range inputs take the pointer", () => {
	it("a press sets the value where it's pressed, a drag follows it (input as it moves), change when it's let go", () => {
		const r = ui(`input { display: block; width: 100px; height: 16px; margin: 0; }`);
		r.root.innerHTML = `<input type="range" min="0" max="100" step="5" value="50">`;
		r.update(0);
		const input = r.root.querySelector("input")!;
		const seen: string[] = [];
		input.addEventListener("input", () => seen.push(`input ${input.value}`));
		input.addEventListener("change", () => seen.push(`change ${input.value}`));
		r._pointer("pointerdown", pe(20, 8, { type: "mouse" }));
		r._pointer("pointermove", pe(62, 8, { type: "mouse" }));
		// (Off the end: the end)
		r._pointer("pointermove", pe(180, 40, { type: "mouse" }));
		r._pointer("pointerup", pe(180, 40, { type: "mouse", buttons: 0 }));
		expect(seen).toEqual(["input 15", "input 65", "input 100", "change 100"]);
	});

	it("the arrow keys step a focused range input, Home and End go to its ends", () => {
		const r = ui(`input { display: block; width: 100px; height: 16px; }`);
		r.root.innerHTML = `<input type="range" min="0" max="10" step="2" value="4">`;
		r.update(0);
		const input = r.root.querySelector("input")!;
		r.focus(input);
		const key = (k: string) => r._key("keydown", { key: k, code: k, isTrusted: true, preventDefault () {}, stopImmediatePropagation () {} } as never);
		key("ArrowRight");
		expect(input.value).toBe("6");
		key("ArrowDown");
		key("ArrowDown");
		expect(input.value).toBe("2");
		key("End");
		expect(input.value).toBe("10");
		key("Home");
		expect(input.value).toBe("0");
	});
});

describe("ui2: a finger's tap is adjusted to what takes one nearby, as Chrome adjusts it", () => {
	it("a range input ending 4px left of a tap of radius 10 takes it (its value from the tap's adjusted point: its end); exact, the mouse's doesn't move", () => {
		const r = ui(`.row { display: flex; } input { width: 100px; height: 16px; margin: 0; } .gap { width: 60px; height: 16px; }`);
		r.root.innerHTML = `<div class="row"><input type="range" min="0" max="100" value="0"><div class="gap"></div></div>`;
		r.update(0);
		const input = r.root.querySelector("input")!;
		const clicks: string[] = [];
		input.addEventListener("click", (e) => clicks.push(`click ${Math.round(e.clientX)}`));
		// The mouse 4px off the end: nothing
		tap(r, 104, 8, { type: "mouse" });
		expect(input.value).toBe("0");
		expect(clicks).toEqual([]);
		// A finger there (radius 10): the slider, at its end
		tap(r, 104, 8, { w: 20 });
		expect(clicks).toEqual(["click 99"]);
		expect(input.value).toBe("100");
	});

	it("a tap off anything to the nearest button within reach; none within reach, it stays where it was", () => {
		const r = ui(`.p { position: relative; width: 300px; height: 100px; } button { position: absolute; left: 50px; top: 40px; width: 60px; height: 20px; border: 0; padding: 0; }`);
		r.root.innerHTML = `<div class="p"><button>GO</button></div>`;
		r.update(0);
		const b = r.root.querySelector("button")!;
		let n = 0;
		b.addEventListener("click", () => n++);
		tap(r, 117, 50);
		expect(n).toBe(1);
		expect(r.document.activeElement).toBe(b);
		r.focus(null);
		tap(r, 140, 50);
		expect(n).toBe(1);
		// A drag isn't a tap: no click, however near
		r._pointer("pointerdown", pe(117, 50));
		r._pointer("pointermove", pe(160, 80));
		r._pointer("pointerup", pe(160, 80, { buttons: 0 }));
		expect(n).toBe(1);
	});

	it("a tap on something that takes it (or inside something that does) isn't moved; nor are the pointer events", () => {
		const r = ui(`.p { position: relative; width: 300px; height: 100px; } .zone { position: absolute; left: 0; top: 0; width: 120px; height: 100px; } button { position: absolute; left: 124px; top: 40px; width: 60px; height: 20px; border: 0; padding: 0; }`);
		r.root.innerHTML = `<div class="p"><div class="zone"></div><button>GO</button></div>`;
		r.update(0);
		const zone = r.root.querySelector(".zone")!, b = r.root.querySelector("button")!;
		const got: string[] = [];
		zone.addEventListener("pointerdown", () => got.push("zone down"));
		b.addEventListener("click", () => got.push("button click"));
		// The zone takes presses itself (a game's touch zone): the tap is its own, 6px from the button or not
		tap(r, 118, 50, { w: 20 });
		expect(got).toEqual(["zone down"]);
		// (In the gap between them, nearer the button: the button's)
		tap(r, 123, 50, { w: 20 });
		expect(got).toEqual(["zone down", "button click"]);
	});
});
