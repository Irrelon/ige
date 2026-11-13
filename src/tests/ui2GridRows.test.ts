import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string = "", w = 800, h = 600): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	r.addStyleSheet(`body { margin: 0; font-family: sans-serif; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

const rect = (r: IgeUiRoot, sel: string) => {
	const b = r.document.querySelector(sel)!.getBoundingClientRect();
	return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10);
};

describe("ui2: grid rows", () => {
	it("grid-template-rows: auto minmax(0, 1fr) auto in a grid of known height: the middle row takes what's left, and a scroller in it shrinks to fit", () => {
		const r = ui(".f { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 300px; } .h { height: 40px; } .m { display: grid; min-height: 0; } .s { overflow-y: auto; min-height: 0; } .t { height: 900px; } .ft { height: 20px; }");
		r.document.body.innerHTML = `<div class="f"><div class="h"></div><div class="m"><div class="s"><div class="t"></div></div></div><div class="ft"></div></div>`;
		r.update();
		expect(rect(r, ".m")).toEqual([0, 40, 800, 240]);
		expect(rect(r, ".s")).toEqual([0, 40, 800, 240]);
		expect(rect(r, ".ft")).toEqual([0, 280, 800, 20]);
	});

	it("implicit auto rows stretch to fill a grid of known height (align-content: normal); not with align-content: start", () => {
		const r = ui(".g { display: grid; grid-template-columns: 100px 1fr; position: absolute; inset: 0 0 auto 0; height: 200px; } .g.top { top: 300px; align-content: start; } .a { height: 30px; }");
		r.document.body.innerHTML = `<div class="g"><div class="a"></div><div class="b"></div></div><div class="g top"><div class="a"></div><div class="b2"></div></div>`;
		r.update();
		expect(rect(r, ".b")).toEqual([100, 0, 700, 200]);
		expect(rect(r, ".b2")).toEqual([100, 300, 700, 30]);
	});

	it("minmax() with a maximum under its minimum is its minimum; fixed and percentage rows", () => {
		const r = ui(".g { display: grid; grid-template-columns: minmax(260px, 20%) 1fr; grid-template-rows: 50px 25%; height: 400px; }");
		r.document.body.innerHTML = `<div class="g"><div class="a"></div><div></div><div class="c"></div></div>`;
		r.update();
		expect(rect(r, ".a")).toEqual([0, 0, 260, 50]);
		expect(rect(r, ".c")).toEqual([0, 50, 260, 100]);
	});
});

describe("ui2: flex row-reverse", () => {
	it("an auto margin takes the free room in a reversed row (nothing left over at either end)", () => {
		const r = ui(".f { display: flex; flex-direction: row-reverse; width: 200px; } .a, .b, .c { width: 20px; height: 10px; } .c { margin-right: auto; }");
		r.document.body.innerHTML = `<div class="f"><div class="a"></div><div class="b"></div><div class="c"></div></div>`;
		r.update();
		expect(rect(r, ".a")[0]).toBe(180);
		expect(rect(r, ".b")[0]).toBe(160);
		expect(rect(r, ".c")[0]).toBe(0);
	});
});

describe("ui2: flex line height", () => {
	it("a single-line row with a min-height and no height: its items stretch to the min-height", () => {
		const r = ui(".f { display: flex; min-height: 18px; } .a { height: auto; }");
		r.document.body.innerHTML = `<div class="f"><span class="a">x</span></div>`;
		r.update();
		expect(rect(r, ".a")[3]).toBe(18);
		expect(rect(r, ".f")[3]).toBe(18);
	});
});

describe("ui2: anonymous flex items", () => {
	it("text in a fixed-size flex box is centred (its anonymous item is as wide as the text, not the box)", () => {
		const r = ui(".size { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; border: 1px solid red; }");
		r.document.body.innerHTML = `<div><b class="size">S</b></div>`;
		r.update();
		const text = r.items.find((i) => i.op === "text") as { x: number; w: number };
		expect(text.x + text.w / 2).toBeCloseTo(1 + 17 / 2, 1);
	});
});

describe("ui2: scrollable overflow", () => {
	it("a scroller's scroll width counts what overflows the boxes in it (a price too wide for its row), not just their own boxes", () => {
		const r = ui(".s { width: 200px; height: 100px; overflow-y: auto; } .row { display: flex; } .p { flex: none; width: 260px; height: 10px; }");
		r.document.body.innerHTML = `<div class="s"><div class="item"><div class="row"><span class="p"></span></div></div></div>`;
		r.update();
		const s = r.document.querySelector(".s")!;
		expect(s.scrollWidth).toBe(260);
		expect(s.clientWidth).toBe(200);
	});
});

describe("ui2: grid fr columns", () => {
	it("an fr column whose share is under its content's minimum keeps that, and the rest share what's left (CSS Grid's size of an fr)", () => {
		const r = ui(".g { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; width: 231px; } .g b { display: block; white-space: nowrap; } .w56 { width: 56px; } .w71 { width: 71px; } .w20 { width: 20px; }");
		r.document.body.innerHTML = `<div class="g"><div class="a"><b class="w56"></b></div><div class="b"><b class="w71"></b></div><div class="c"><b class="w20"></b></div><div class="d"><b class="w56"></b></div></div>`;
		r.update();
		// 71 and the two 56s keep their minimum; the last fr takes the rest: 231 - 9 - 71 - 56 - 56
		expect([".a", ".b", ".c", ".d"].map((s) => rect(r, s)[2])).toEqual([56, 71, 39, 56]);
	});
});
