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

	it("aspect-ratio on an absolutely placed ::before gives it its height", () => {
		const r = ui(`.p { position: relative; width: 400px; height: 300px; } .p::before { content: ""; position: absolute; width: 50%; aspect-ratio: 2; }`, `<div class="p"></div>`);
		const pb = r.root.querySelector(".p")!._box!.children.find((c) => c.pseudo === "before")!;
		expect([pb.borderW, pb.borderH]).toEqual([200, 100]);
	});
});
