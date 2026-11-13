/**
 * ui2's layout where a phone's narrow screen found it out against Chrome: grid columns short of room, a scroller in an
 * implicit grid column, a zero-width flex item's place in its scroller's extent, a grid's rows under its min-height, a
 * table narrower than its content, a hyphen as a place to break, an image's width from its max-height, aspect-ratio on
 * a ::before. Each expectation is what Chrome gives.
 */
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string, html: string, w = 844, h = 390): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	r.addStyleSheet(`body { margin: 0; font: 10px sans-serif; } ${css}`);
	r.root.innerHTML = html;
	r.update(0);
	return r;
}
const widths = (r: IgeUiRoot, sel: string) => r.root.querySelectorAll(sel).map((e) => Math.round(e.getBoundingClientRect().width * 10) / 10);
const heights = (r: IgeUiRoot, sel: string) => r.root.querySelectorAll(sel).map((e) => Math.round(e.getBoundingClientRect().height * 10) / 10);

describe("ui2: layout at a phone's sizes, as Chrome's", () => {
	it("minmax() columns with fixed maximums short of room share it from their minimums (an fr column after them gets none)", () => {
		const r = ui(`.g { display: grid; width: 286px; grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) minmax(120px, 160px); } .g > div { height: 10px; }`, `<div class="g"><div></div><div></div><div></div></div>`);
		expect(widths(r, ".g > div")).toEqual([143, 0, 143]);
		// (With room, as before: each at its maximum, the fr column the rest)
		const wide = ui(`.g { display: grid; width: 600px; grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) minmax(120px, 160px); } .g > div { height: 10px; }`, `<div class="g"><div></div><div></div><div></div></div>`);
		expect(widths(wide, ".g > div")).toEqual([160, 280, 160]);
	});

	it("a scroller in a grid's implicit column is no wider than the column: its content scrolls in it", () => {
		const r = ui(`.b { display: grid; width: 640px; height: 177px; padding: 10px 28px; box-sizing: border-box; overflow-y: auto; } .f { display: flex; overflow-x: auto; } .f > div { width: 200px; flex: none; height: 20px; } .tall { height: 3900px; }`,
			`<div class="b"><div class="f"><div></div><div></div><div></div><div></div></div><div class="tall"></div></div>`);
		const b = r.root.querySelector(".b")!;
		expect(widths(r, ".f, .tall")).toEqual([569, 569]);
		expect(b.scrollWidth).toBe(b.clientWidth);
	});

	it("an empty flex item after a gap counts in its scroller's scroll width", () => {
		const r = ui(`.s { display: flex; gap: 4px; width: 100px; overflow-x: auto; } .s > div { width: 80px; flex: none; height: 10px; }`, `<div class="s"><div></div><div></div><i></i></div>`);
		expect(r.root.querySelector(".s")!.scrollWidth).toBe(168);
	});

	it("a grid under a min-height stretches its auto rows to it; a stretched item keeps to its max-height", () => {
		const r = ui(`.n { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; min-height: 380px; } .list { max-height: 226px; overflow: auto; } .list > div { height: 273px; }`,
			`<div class="n"><div class="list"><div></div></div><div class="art">x</div></div>`, 844, 600);
		expect(heights(r, ".n, .list, .art")).toEqual([380, 226, 380]);
	});

	it("a table narrower than its columns' least widens to them; a cell's width is its column's most, not its least", () => {
		const css = `table { width: 100%; border-collapse: collapse; } td { padding: 0 5px; white-space: nowrap; } td.t { width: 92px; } .w { width: 300px; }`;
		const row = `<tr><td>${"x".repeat(30)}</td><td class="t"><span style="display: inline-block; width: 84px; height: 4px"></span></td><td>${"y".repeat(20)}</td></tr>`;
		const r = ui(css, `<div class="w"><table>${row}</table></div>`);
		// (Its columns at their least: the cell with a width at its content's, 84 and its padding)
		expect(widths(r, "td")[1]).toBe(94);
		expect(widths(r, "table")[0]).toBeCloseTo(widths(r, "td").reduce((a, w) => a + w, 0), 0);
		// (With room: the width given)
		const wide = ui(css.replace(".w { width: 300px; }", ".w { width: 2000px; }"), `<div class="w"><table>${row}</table></div>`);
		expect(widths(wide, "td")[1]).toBe(102);
	});

	it("a word breaks after a hyphen between letters (not in 2-3): a table column's least is its longest piece", () => {
		const r = ui(`.c { width: 1px; }`, `<div class="c"><span class="a">Directorate-pattern</span></div><div class="c"><span class="b">2-3</span></div>`);
		const one = ui("", `<span class="a">Directorate-</span><span class="b">2-3</span>`);
		expect(widths(r, ".a")[0]).toBe(widths(one, ".a")[0]);
		expect(widths(r, ".b")[0]).toBe(widths(one, ".b")[0]);
	});

	it("an image with no size set keeps its proportion within its max-height and max-width", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 844, height: 390 });
		r.layoutEngine.imageSizes.set("logo.png", { w: 1600, h: 294 });
		r.addStyleSheet(`body { margin: 0; } img { width: auto; max-width: min(760px, 88vw); max-height: 15vh; }`);
		r.root.innerHTML = `<img src="logo.png">`;
		r.update(0);
		const b = r.root.querySelector("img")!.getBoundingClientRect();
		expect(b.height).toBeCloseTo(58.5, 1);
		expect(b.width).toBeCloseTo((58.5 * 1600) / 294, 1);
	});

	it("a scroller's scrollbar is decided with its absolutely placed children (they reach past it), and they're placed inside it", () => {
		const r = ui(`.s { position: relative; width: 120px; height: 200px; overflow-y: auto; overflow-x: hidden; } .s > div { position: absolute; left: 0; right: 0; height: 30px; }`,
			`<div class="s">${Array.from({ length: 10 }, (_, i) => `<div style="top: ${i * 32}px"></div>`).join("")}</div>`);
		const s = r.root.querySelector(".s")!;
		expect([s.clientWidth, s.scrollHeight, widths(r, ".s > div")[0]]).toEqual([105, 318, 105]);
		// (And the same the next time it's laid out: no bar coming and going)
		r.root.querySelector(".s > div")!.style.height = "31px";
		r.update(16);
		expect([s.clientWidth, widths(r, ".s > div")[0]]).toEqual([105, 105]);
	});

	it("a positioned box laid out again on its own that now overflows its scroller gives the scroller its bar", () => {
		const r = ui(`.s { position: relative; width: 120px; height: 200px; overflow-y: auto; overflow-x: hidden; } .s > div { position: absolute; left: 0; right: 0; height: 30px; }`,
			`<div class="s">${Array.from({ length: 5 }, (_, i) => `<div style="top: ${i * 32}px"></div>`).join("")}</div>`);
		const s = r.root.querySelector(".s")!;
		expect(s.clientWidth).toBe(120);
		const last = r.root.querySelectorAll(".s > div")[4];
		last.style.height = "120px";
		r.update(16);
		expect([s.clientWidth, s.scrollHeight, widths(r, ".s > div")[0], widths(r, ".s > div")[4]]).toEqual([105, 248, 105, 105]);
	});

	it("a positioned box laid out again on its own that no longer overflows its scroller takes the bar away (and it stays away)", () => {
		const r = ui(`.s { position: relative; width: 120px; height: 200px; overflow-y: auto; overflow-x: hidden; } .s > div { position: absolute; left: 0; right: 0; height: 30px; }`,
			`<div class="s">${Array.from({ length: 5 }, (_, i) => `<div style="top: ${i * 32}px"></div>`).join("")}</div>`);
		const s = r.root.querySelector(".s")!;
		const last = r.root.querySelectorAll(".s > div")[4];
		last.style.height = "120px";
		r.update(16);
		expect(s.clientWidth).toBe(105);
		// (Back as it was: laid out on its own again, the scroller with it, without the bar, in the same layout)
		last.style.height = "30px";
		r.update(16);
		expect(r.stats.partial).toBe(1);
		const seen = [[s.clientWidth, s.scrollHeight, ...widths(r, ".s > div")]];
		// (Frames after, and a layout of everything: as it is)
		r.update(16);
		seen.push([s.clientWidth, s.scrollHeight, ...widths(r, ".s > div")]);
		r.root.querySelector(".s")!.classList.add("x");
		r.update(16);
		seen.push([s.clientWidth, s.scrollHeight, ...widths(r, ".s > div")]);
		expect(seen).toEqual(Array(3).fill([120, 200, 120, 120, 120, 120, 120]));
	});

	it("a scroller's bar its positioned boxes needed goes when one laid out on its own reaches less far, though others kept still overflow it less", () => {
		// (Two tall ones: one shrinks, the bar stays for the other; it shrinks too, the bar goes. Its scroll height with them)
		const r = ui(`.s { position: relative; width: 120px; height: 200px; overflow-y: auto; overflow-x: hidden; } .s > div { position: absolute; left: 0; right: 0; height: 30px; }`,
			`<div class="s"><div style="top: 0"></div><div style="top: 40px; height: 250px"></div><div style="top: 80px; height: 300px"></div></div>`);
		const s = r.root.querySelector(".s")!;
		const [, a, b] = r.root.querySelectorAll(".s > div");
		expect([s.clientWidth, s.scrollHeight]).toEqual([105, 380]);
		b.style.height = "30px";
		r.update(16);
		expect([s.clientWidth, s.scrollHeight]).toEqual([105, 290]);
		a.style.height = "30px";
		r.update(16);
		expect([s.clientWidth, s.scrollHeight, ...widths(r, ".s > div")]).toEqual([120, 200, 120, 120, 120]);
	});

	it("a positioned box that fits its scroller only with the bar (its height from its width) keeps the bar, frame after frame", () => {
		const r = ui(`.s { position: relative; width: 120px; height: 112px; overflow-y: auto; overflow-x: hidden; } .c { position: absolute; left: 0; width: 100%; aspect-ratio: 1; }`,
			`<div class="s"><div class="c">0</div></div>`);
		const s = r.root.querySelector(".s")!, c = r.root.querySelector(".c")!;
		const seen: number[][] = [];
		for (let i = 1; i <= 3; i++) {
			c.textContent = String(i);
			r.update(16);
			seen.push([r.stats.partial, s.clientWidth, ...widths(r, ".c")]);
		}
		expect(seen).toEqual(Array(3).fill([1, 105, 105]));
	});

	it("a flex column too short for its items' own heights shrinks them to their content's height, as Chrome does", () => {
		const col = `.c { display: flex; flex-direction: column; height: 100px; } i { display: block; }`;
		// (Each to its content's height at the least; one that clips, to nothing)
		const r = ui(`${col} .c > div { height: 80px; } .b { overflow: hidden; }`, `<div class="c"><div><i style="height: 20px"></i></div><div><i style="height: 40px"></i></div><div class="b"><i style="height: 60px"></i></div></div>`);
		expect(heights(r, ".c > div")).toEqual([30, 40, 30]);
		// (Empty; with padding and borders; a flex column itself; capped by a max-height below its height)
		expect(heights(ui(`${col} .c > div { height: 80px; }`, `<div class="c"><div></div><div></div></div>`), ".c > div")).toEqual([50, 50]);
		expect(heights(ui(`${col} .c > div { height: 80px; padding: 5px; border: 2px solid; box-sizing: border-box; }`, `<div class="c"><div><i style="height: 30px"></i></div><div><i style="height: 10px"></i></div></div>`), ".c > div")).toEqual([50, 50]);
		expect(heights(ui(`${col} .c > div { height: 80px; display: flex; flex-direction: column; } .c > div > i { flex: 1; min-height: 15px; }`, `<div class="c"><div><i></i><i></i></div><div><i></i></div></div>`), ".c > div")).toEqual([50, 50]);
		expect(heights(ui(`${col} .c > div { height: 80px; max-height: 70px; }`, `<div class="c"><div><i style="height: 30px"></i></div><div><i style="height: 30px"></i></div></div>`), ".c > div")).toEqual([50, 50]);
	});

	it("what's in a positioned box laid out afresh and then found as it was in the same layout is placed where it now is", () => {
		// (Slots in a list that gains a scrollbar: each laid out again narrower, then met again unchanged; the "1" pushed to the
		// row's end by an auto margin goes with the row)
		const r = ui(`.s { position: relative; width: 143px; height: 292px; overflow-y: auto; overflow-x: hidden; } .slot { position: absolute; left: 0; right: 0; height: 40px; padding: 0 8px; } .t { display: flex; align-items: center; } .t i { margin-left: auto; }`,
			`<div class="s">${Array.from({ length: 7 }, (_, i) => `<button class="slot" style="top: ${i * 41}px"><span class="t"><b>S</b>WEAPON<i>${i}</i></span></button>`).join("")}</div>`);
		const row = r.root.querySelectorAll(".t")[1], i1 = r.root.querySelectorAll(".t i")[1];
		r.root.querySelectorAll(".slot")[6].style.top = "270px";
		r.update(16);
		const rb = row.getBoundingClientRect(), ib = i1.getBoundingClientRect();
		expect(r.root.querySelector(".s")!.clientWidth).toBe(128);
		expect(ib.right).toBeCloseTo(rb.right, 3);
	});

	it("an <svg> with no width has its user units as they are (its content's client rects, as Chrome's), and draws nothing", () => {
		const r = ui(`.d { position: relative; width: 0; height: 292px; } svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }`,
			`<div class="d"><svg viewBox="-25.1 -42 50.2 74"><rect x="-75.3" y="-116" width="150.6" height="222"></rect></svg></div>`);
		const b = r.root.querySelector("rect")!.getBoundingClientRect();
		expect([b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10)).toEqual([-75.3, -116, 150.6, 222]);
		expect(r.items.some((it) => it.op === "fill")).toBe(false);
	});

	it("a transformed element in a scrolled box: its client rect moves with the scroll only (turned about its own origin)", () => {
		const r = ui(`.s { overflow: auto; height: 100px; } .pad { height: 150px; }`, `<div class="s"><div class="pad"></div><i style="display: block; width: 8px; height: 8px; transform: rotate(45deg)"></i><div class="pad"></div></div>`);
		const i = r.root.querySelector("i")!;
		const a = i.getBoundingClientRect();
		r.root.querySelector(".s")!.scrollTop = 100;
		r.update(16);
		const b = i.getBoundingClientRect();
		expect([b.x - a.x, b.y - a.y, b.width - a.width].map((v) => Math.round(v * 100) / 100)).toEqual([0, -100, 0]);
	});

	it("grid rows of scrollers share the room from their padding and borders (their least), as Chrome's maximize step does", () => {
		const r = ui(`.g { display: grid; grid-template-columns: 1fr; gap: 16px; height: 196.5px; padding: 14px 24px; box-sizing: border-box; overflow-y: auto; } .a { overflow-y: auto; padding: 2px; } .a > div { height: 700px; } .b { overflow-y: auto; padding: 12px 14px; border: 1px solid; } .b > div { height: 300px; }`,
			`<div class="g"><div class="a"><div></div></div><div class="b"><div></div></div></div>`);
		expect(heights(r, ".a, .b")).toEqual([65.3, 87.3]); // (65.25 and 87.25)
	});

	it("a grid item stretched across a 0-wide column is still as wide as its borders", () => {
		const r = ui(`.g { display: grid; grid-template-columns: 300px minmax(0, 1fr) 300px; width: 600px; } .m { border: 1px solid; overflow: hidden; }`, `<div class="g"><div></div><div class="m"></div><div></div></div>`);
		expect(widths(r, ".m")).toEqual([2]);
	});

	it("content sizes are whole 64ths of a pixel, as a browser's layout units hold them", () => {
		const r = ui(`.b { display: inline-block; font: 13px sans-serif; }`, `<span class="b">Hold to fire</span>`);
		const w = widths(r, ".b")[0];
		expect(Math.abs(w * 64 - Math.round(w * 64))).toBeLessThan(0.7);
	});

	it("text a hair wider than its box wraps, as Chrome's does in 64ths of a pixel; text in the box it sized doesn't", () => {
		// ("aaaa aaaa" 45.018px wide: 218.02px of "Blueprint: Plated Hull Armour" in 600 16px Exo 2 wraps in 218px in Chrome)
		const lines = (css: string) => heights(ui(`.b { font: 10px sans-serif; line-height: 10px; letter-spacing: 0.002px; } ${css}`, `<div class="b">aaaa aaaa</div>`), ".b")[0] / 10;
		expect([lines(".b { width: 45px; }"), lines(".b { width: 45.03125px; }"), lines(".b { display: inline-block; }"), lines(".b { width: 46px; }")]).toEqual([2, 1, 1, 1]);
	});

	it("grid items aligned on their baselines line up, the row as tall as that makes them (an empty one at its bottom edge)", () => {
		// (A 20px label's baseline 16px down its 20px line, a 10px value's 13px down its, their half-leadings on whole pixels:
		// the value 3px lower, the row 23px, as Chrome has the ship design's stat rows, a label beside a value in another font)
		const r = ui(`.g { display: grid; grid-template-columns: 1fr auto 40px; align-items: baseline; line-height: 20px; } .l { font-size: 20px; } .v { font-size: 10px; }`,
			`<div class="g"><span class="l">Turning</span><span class="v">147</span><span class="d"></span></div>`);
		const top = (sel: string) => Math.round(r.root.querySelector(sel)!.getBoundingClientRect().y * 100) / 100;
		expect([top(".l"), top(".v"), top(".d"), heights(r, ".g")[0]]).toEqual([0, 3, 16, 23]);
	});

	it("an inline-block of two lines sits on its last line's baseline, as Chrome has it (an inline flex column on its first)", () => {
		// (Its last baseline 21px down, past the line's strut (13): its top is the line's top. On its first (9px down) it
		// sat 4px lower: the casino's table limits, wrapped under the h1, 5.5px lower at a UI scale of 2. A button the same;
		// an inline flex column on its first item's, 4px down, as in Chrome)
		const r = ui(`.p { font: 10px sans-serif; line-height: 20px; } .ib { display: inline-block; width: 30px; line-height: 12px; } .fx { display: inline-flex; flex-direction: column; line-height: 12px; }`,
			`<div class="p"><div class="ib">aaaa aaaa</div></div><div class="p"><button class="ib">aaaa aaaa</button></div><div class="p"><div class="fx"><i>aaaa</i><i>aaaa</i></div></div>`);
		const tops = r.root.querySelectorAll(".ib, .fx").map((e) => e.getBoundingClientRect().y - e.parentElement!.getBoundingClientRect().y);
		expect(tops).toEqual([0, 0, 4]);
	});

	it("an inline element that starts a word counts its opening edge in the narrowest it can be: a flex item keeps it", () => {
		// (The market's filter step at 200%: a key hint, <b>,</b> ‹, with padding, borders and margins round the comma, in a
		// button 21px across: as wide as the <b>'s margin box (23.78), overflowing both sides, centred, as in Chrome; it was
		// its comma and its closing edge, 14.78, so it shrank to the button)
		const css = `b { margin: 0 3px; padding: 0 5px; border: 1px solid; font-size: 11px; }`;
		const r = ui(`${css} .f { display: inline-flex; justify-content: center; width: 21px; }`, `<div class="f"><span><b>,</b> ‹</span></div>`);
		const s = r.root.querySelector("span")!.getBoundingClientRect();
		const shrunk = ui(`${css} .d { display: inline-block; }`, `<div style="width: 0"><span class="d"><b>,</b> ‹</span></div>`);
		expect([s.x, s.width, widths(shrunk, ".d")[0]]).toEqual([-1.390625, 23.78125, 23.8]);
	});

	it("aspect-ratio on an absolutely placed ::before gives it its height", () => {
		const r = ui(`.p { position: relative; width: 400px; height: 300px; } .p::before { content: ""; position: absolute; width: 50%; aspect-ratio: 2; }`, `<div class="p"></div>`);
		const pb = r.root.querySelector(".p")!._box!.children.find((c) => c.pseudo === "before")!;
		expect([pb.borderW, pb.borderH]).toEqual([200, 100]);
	});
});
