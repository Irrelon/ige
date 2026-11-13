import { parseStylesheet } from "@/engine/ui2/css/IgeCssParser";
import { matchesSelector, parseSelector } from "@/engine/ui2/css/IgeCssSelector";
import { parseColor, parseGradient, resolveLength, substituteVars } from "@/engine/ui2/css/IgeCssValues";
import { IgeUiEvent } from "@/engine/ui2/dom/IgeUiDom";
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { describePaint } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

const ctx = { em: 16, rem: 16, vw: 1000, vh: 500, cqw: 1000, cqh: 500 };

/** A headless UI of w x h, its body unpadded, with the given stylesheet. */
function ui (css: string = "", w = 800, h = 600): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	r.addStyleSheet(`body { margin: 0; font-family: sans-serif; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

const box = (el: { getBoundingClientRect (): { left: number; top: number; width: number; height: number } }) => {
	const r = el.getBoundingClientRect();
	return [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
};

describe("ui2: CSS values", () => {
	it("lengths with calc(), min(), max(), clamp() and var()", () => {
		expect(resolveLength("calc(100% - 20px)", { ...ctx, percent: 300 })).toBe(280);
		expect(resolveLength("min(760px, 90vw)", ctx)).toBe(760);
		expect(resolveLength("clamp(10px, 50%, 40px)", { ...ctx, percent: 200 })).toBe(40);
		expect(resolveLength("calc(2 * 1.5em + 4px)", ctx)).toBe(52);
		expect(resolveLength("calc(100 * 1cqh)", ctx)).toBe(500);
		expect(substituteVars("calc(var(--a) * var(--b, 3))", (n) => (n === "--a" ? "2px" : undefined))).toBe("calc(2px * 3)");
		expect(substituteVars("var(--missing)", () => undefined)).toBeUndefined();
	});

	it("colours: hex, rgb(), names, color-mix()", () => {
		expect(parseColor("#5fe3ff")).toEqual({ r: 95, g: 227, b: 255, a: 1 });
		expect(parseColor("rgba(95, 227, 255, 0.35)")).toEqual({ r: 95, g: 227, b: 255, a: 0.35 });
		expect(parseColor("rgb(10 20 30 / 50%)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
		expect(parseColor("transparent")?.a).toBe(0);
		const mix = parseColor("color-mix(in srgb, #ff0000 50%, transparent)")!;
		expect([Math.round(mix.r), mix.a]).toEqual([255, 0.5]);
	});

	it("gradients", () => {
		const g = parseGradient("linear-gradient(160deg, rgba(10, 22, 34, 0.86), rgba(4, 10, 18, 0.78))")!;
		expect(g.type).toBe("linear");
		expect(g.angle).toBe(160);
		expect(g.stops.length).toBe(2);
		const r = parseGradient("radial-gradient(circle at 30% 20%, #fff 0, transparent 60%)")!;
		expect([r.shape, r.cx, r.cy, r.stops[1].at]).toEqual(["circle", 0.3, 0.2, 0.6]);
	});
});

describe("ui2: stylesheets and selectors", () => {
	it("parses rules, @container and @keyframes, comments and !important", () => {
		const s = parseStylesheet(`/* hi */ .a { color: red !important; } @container ui (max-width: 760px) or (max-height: 560px) { .b { color: blue } } @keyframes pulse { 0% { opacity: 0 } to { opacity: 1 } }`);
		expect(s.rules.map((r) => r.selector)).toEqual([".a", ".b"]);
		expect(s.rules[0].declarations[0]).toEqual({ name: "color", value: "red", important: true });
		expect(s.rules[1].container![0].any).toEqual([{ op: "max", feature: "width", px: 760 }, { op: "max", feature: "height", px: 560 }]);
		expect(s.keyframes.get("pulse")!.frames.map((f) => f.offset)).toEqual([0, 1]);
	});

	it("matches classes, tags, attributes, combinators and pseudo-classes, with specificity", () => {
		const r = ui();
		r.root.innerHTML = `<div class="menu"><div class="tabRow"></div><table class="market"><tr class="row"><td data-item="iron">a</td><td>b</td></tr></table><button disabled>x</button></div>`;
		const td = r.root.querySelector("td")!;
		expect(matchesSelector(td, parseSelector(".menu table.market tr > td[data-item]"))).toBe(true);
		expect(matchesSelector(td, parseSelector("td:first-child"))).toBe(true);
		expect(matchesSelector(td, parseSelector("td:nth-child(2)"))).toBe(false);
		expect(matchesSelector(td, parseSelector("td:not([data-item])"))).toBe(false);
		expect(r.root.querySelector("button:disabled")).toBeTruthy();
		expect(matchesSelector(r.root.querySelector(".menu")!, parseSelector(".menu:has(> .tabRow)"))).toBe(true);
		expect(parseSelector(".menu .a.b:hover").specificity).toEqual([0, 4, 0]);
		expect(parseSelector("#ui .x > b").specificity).toEqual([1, 1, 1]);
	});

	it("the cascade: specificity, order, !important, inline styles, inheritance and custom properties", () => {
		const r = ui(`:root { --accent: #ff0000; } .p { color: var(--accent); letter-spacing: 2px; } .p .c { color: blue; } .c { color: green !important; } .q { padding: calc(var(--n, 2) * 3px); }`);
		r.root.innerHTML = `<div class="p" style="--accent: #00ff00"><span class="c">x</span><span class="d">y</span></div><div class="q" style="--n: 4"></div>`;
		r.flush();
		const p = r.root.querySelector(".p")!, c = r.root.querySelector(".c")!, d = r.root.querySelector(".d")!;
		expect(p._computed!.color).toBe("#00ff00");
		expect(c._computed!.color).toBe("green");
		expect(d._computed!.color).toBe("#00ff00");
		expect(d._computed!["letter-spacing"]).toBe("2px");
		expect(r.root.querySelector(".q")!._computed!["padding-left"]).toBe("calc(4 * 3px)");
	});
});

describe("ui2: layout", () => {
	it("block flow: widths, padding, borders, margins collapsing between siblings", () => {
		const r = ui(`.a { margin: 10px; padding: 5px; border: 2px solid red; height: 20px; } .b { margin-top: 20px; height: 10px; } .c { width: 100px; margin: 0 auto; height: 5px; }`, 400, 300);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div><div class="c"></div>`;
		const [a, b, c] = r.root.children;
		expect(box(a)).toEqual([10, 10, 380, 34]);
		// (10px and 20px margins collapse to 20)
		expect(box(b)).toEqual([0, 64, 400, 10]);
		expect(box(c)).toEqual([150, 74, 100, 5]);
	});

	it("block flow: a first child's top margin and a last child's bottom margin collapse through a parent with no border or padding, not through a scroller", () => {
		const r = ui(`.p { margin-top: 4px; } .k { margin: 6px 0 14px; height: 10px; } .q { height: 3px; } .s { overflow: auto; height: 60px; } .f { display: flex; flex-direction: column; }`, 400, 300);
		r.root.innerHTML = `<div class="p"><div class="k"></div></div><div class="q"></div><div class="s"><div class="k"></div></div><div class="f"><div class="p"><div class="k"></div></div></div>`;
		const [p, q, s, f] = r.root.children;
		// (4px and 6px meet at the top: 6; 14px below, outside .p, before .q)
		expect(box(p)).toEqual([0, 6, 400, 10]);
		expect(box(p.children[0])).toEqual([0, 6, 400, 10]);
		expect(box(q)).toEqual([0, 30, 400, 3]);
		// A scroller keeps its child's margins inside; a flex item does too
		expect(box(s.children[0])).toEqual([0, 39, 400, 10]);
		expect(box(f.children[0])).toEqual([0, 97, 400, 30]);
		expect(box(f.children[0].children[0])).toEqual([0, 103, 400, 10]);
	});

	it("flex: a row's width as an item of another (shrink to fit) counts gaps between its items only, not the white space between them", () => {
		const r = ui(`.o { display: flex; justify-content: space-between; } .r { display: flex; gap: 10px; } b { display: block; width: 40px; height: 10px; }`, 400, 300);
		r.root.innerHTML = `<div class="o"><div class="r">
			<b></b>
			<b></b>
			<b></b>
		</div></div>`;
		expect(box(r.root.querySelector(".r")!)[2]).toBe(140);
	});

	it("flex: a column with no height but a max-height: its scrolling item shrinks into it (the panel's cap), its fixed one doesn't", () => {
		const r = ui(`.f { display: flex; flex-direction: column; max-height: 100px; border: 1px solid; } .h { height: 20px; flex: none; } .b { overflow-y: auto; } .k { height: 300px; }`, 400, 300);
		r.root.innerHTML = `<div class="f"><div class="h"></div><div class="b"><div class="k"></div></div></div>`;
		const f = r.root.children[0];
		// (100 inside the border)
		expect(box(f)[3]).toBe(102);
		expect(box(f.children[0])[3]).toBe(20);
		expect(box(f.children[1])[3]).toBe(80);
		expect((f.children[1] as unknown as { scrollHeight: number }).scrollHeight).toBe(300);
	});

	it("block flow: a button is as wide as its contents, unless it has a width; auto margins move it", () => {
		const r = ui(`button { display: block; padding: 0 5px; border: 0; font: inherit; } .r { margin-left: auto; } .w { width: 200px; }`, 400, 300);
		r.root.innerHTML = `<button>abcd</button><button class="r">abcd</button><button class="w">abcd</button>`;
		const [a, b, c] = r.root.children.map((e) => box(e));
		expect(a[2]).toBeLessThan(100);
		expect(b[0] + b[2]).toBe(400);
		expect(b[2]).toBe(a[2]);
		expect(c[2]).toBe(200);
	});

	it("flex: items shrink in proportion to their inner sizes (padding and borders don't count)", () => {
		const r = ui(`.f { display: flex; width: 300px; } .f > div { min-width: 0; } .a { width: 300px; } .b { width: 100px; padding: 0 50px; box-sizing: border-box; }`, 400, 300);
		r.root.innerHTML = `<div class="f"><div class="a"></div><div class="b"></div></div>`;
		const [a, b] = r.root.querySelector(".f")!.children.map((e) => box(e)[2]);
		// (400 to fit into 300: the inner sizes are 300 and 0, so the padded one doesn't shrink)
		expect([a, b]).toEqual([200, 100]);
	});

	it("flex: a canvas with height: 100% and width: auto in a row is as wide as that height and its aspect ratio make it", () => {
		const r = ui(`.m { display: flex; justify-content: center; width: 600px; height: 400px; } canvas { width: auto; height: 100%; max-width: 100%; }`, 800, 600);
		r.root.innerHTML = `<div class="m"><canvas width="520" height="640"></canvas></div>`;
		// (400 high: 520 × 400 / 640 = 325 wide, centred)
		expect(box(r.root.querySelector("canvas")!)).toEqual([137.5, 0, 325, 400]);
		// Centred in a column of a known height: the same
		const c = ui(`.m { display: flex; flex-direction: column; align-items: center; width: 600px; height: 400px; } canvas { width: auto; height: 100%; max-width: 100%; }`, 800, 600);
		c.root.innerHTML = `<div class="m"><canvas width="520" height="640"></canvas></div>`;
		expect(box(c.root.querySelector("canvas")!)).toEqual([137.5, 0, 325, 400]);
		// On a line in a block of a known height: the same
		const b = ui(`.m { width: 600px; height: 400px; text-align: center; } canvas { width: auto; height: 100%; max-width: 100%; vertical-align: top; }`, 800, 600);
		b.root.innerHTML = `<div class="m"><canvas width="520" height="640"></canvas></div>`;
		expect(box(b.root.querySelector("canvas")!)).toEqual([137.5, 0, 325, 400]);
	});

	it("absolute positioning: with no offsets on an axis, a flex container's child goes where it would as its only item", () => {
		const r = ui(`.m { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 400px; height: 300px; } .t { position: absolute; bottom: 10px; width: 100px; height: 20px; }`, 800, 600);
		r.root.innerHTML = `<div class="m"><div class="t"></div></div>`;
		// (Centred across; its bottom offset places it down the column)
		expect(box(r.root.querySelector(".t")!)).toEqual([150, 270, 100, 20]);
	});

	it("offsetLeft and offsetTop are from the offset parent's padding edge, however far down the tree it is", () => {
		const r = ui(`.row { display: flex; padding-left: 8px; } .strip { position: relative; display: flex; margin-left: 12px; border: 2px solid red; padding: 3px; } .strip b { width: 20px; height: 10px; display: block; }`, 400, 300);
		r.root.innerHTML = `<div class="row"><i>‹</i><div class="strip"><b></b><b></b></div></div>`;
		const strip = r.root.querySelector(".strip")!;
		const [, second] = strip.querySelectorAll("b");
		// (Inside the strip: its 3px padding, then the first 20px tab)
		expect([second.offsetLeft, second.offsetTop]).toEqual([23, 3]);
		expect(second.offsetParent).toBe(strip);
	});

	it("inline text: a nowrap element that doesn't fit goes to the next line at the space before it", () => {
		const r = ui(`.w { width: 100px; } small { white-space: nowrap; }`, 400, 300);
		r.root.innerHTML = `<div class="w"><s>3,600</s> <small>HIGH SECURITY PRICE</small></div>`;
		const s = box(r.root.querySelector("s")!), sm = box(r.root.querySelector("small")!);
		// (Two lines: the price on the second, at its start)
		expect(box(r.root.querySelector(".w")!)[3]).toBe(20);
		expect(sm[0]).toBe(0);
		expect(sm[1]).toBeGreaterThan(s[1]);
	});

	it("flex: a row with gap, grow and the automatic minimum; columns; centring", () => {
		const r = ui(`.row { display: flex; gap: 10px; width: 300px; align-items: center; } .row > * { height: 20px; } .g { flex: 1; } .f { width: 50px; flex: none; } .t { height: 40px !important; }
			.col { display: flex; flex-direction: column; height: 100px; justify-content: space-between; width: 50px; } .col > div { height: 10px; }`, 400, 300);
		r.root.innerHTML = `<div class="row"><div class="f"></div><div class="g"></div><div class="f t"></div></div><div class="col"><div></div><div></div><div></div></div>`;
		const row = r.root.querySelector(".row")!;
		const [f1, g, f2] = row.children;
		expect(box(f1)).toEqual([0, 10, 50, 20]);
		expect(box(g)).toEqual([60, 10, 180, 20]);
		expect(box(f2)).toEqual([250, 0, 50, 40]);
		expect(box(row)[3]).toBe(40);
		const col = r.root.querySelector(".col")!;
		expect(col.children.map((c) => box(c)[1])).toEqual([40, 85, 130]);
	});

	it("flex wrap and margin-left: auto", () => {
		const r = ui(`.w { display: flex; flex-wrap: wrap; width: 100px; gap: 4px; } .w > div { width: 40px; height: 10px; } .s { display: flex; width: 200px; } .s > div { width: 20px; height: 5px; } .push { margin-left: auto; }`, 400, 300);
		r.root.innerHTML = `<div class="w"><div></div><div></div><div></div></div><div class="s"><div></div><div class="push"></div></div>`;
		const w = r.root.querySelector(".w")!.children;
		expect(w.map((c) => box(c).slice(0, 2))).toEqual([[0, 0], [44, 0], [0, 14]]);
		expect(box(r.root.querySelector(".push")!)[0]).toBe(180);
	});

	it("absolute and fixed positioning, translate(-50%) centring", () => {
		const r = ui(`.rel { position: relative; width: 200px; height: 100px; margin-left: 50px; } .abs { position: absolute; right: 10px; bottom: 5px; width: 30px; height: 20px; } .mid { position: absolute; left: 50%; top: 0; width: 40px; height: 10px; transform: translateX(-50%); } .fix { position: fixed; left: 0; bottom: 0; width: 10px; height: 10px; }`, 400, 300);
		r.root.innerHTML = `<div class="rel"><div class="abs"></div><div class="mid"></div><div class="fix"></div></div>`;
		expect(box(r.root.querySelector(".abs")!)).toEqual([210, 75, 30, 20]);
		expect(box(r.root.querySelector(".mid")!)).toEqual([130, 0, 40, 10]);
		expect(box(r.root.querySelector(".fix")!)).toEqual([0, 290, 10, 10]);
	});

	it("inline text: wrapping, nowrap with an ellipsis, inline-block chips on the line", () => {
		// Fixed fonts: 10px sans is 5px a character
		const r = ui(`.p { width: 40px; } .n { width: 50px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .chip { display: inline-block; width: 12px; height: 12px; }`, 400, 300);
		r.root.innerHTML = `<div class="p">aaaa bbbb cccc</div><div class="n">aaaaaaaaaaaaaaaaaa</div><div class="p">ab<span class="chip"></span>cd</div>`;
		r.update(0);
		const p = r.root.children[0]._box!;
		expect(p.runs!.map((x) => x.text)).toEqual(["aaaa", "bbbb", "cccc"]);
		expect(p.borderH).toBe(30);
		const n = r.root.children[1]._box!;
		expect(n.runs!.length).toBe(1);
		expect(n.runs![0].text.endsWith("…")).toBe(true);
		expect(n.runs![0].w).toBeLessThanOrEqual(50);
		const chip = r.root.querySelector(".chip")!;
		expect(box(chip)[0]).toBe(10);
		expect(r.root.children[2]._box!.runs!.map((x) => [x.text, x.x])).toEqual([["ab", 0], ["cd", 22]]);
	});

	it("tables: column widths from content, colspan rows, spacing", () => {
		const r = ui(`table { border-collapse: collapse; width: 300px; } td, th { padding: 0 5px; } .w { width: 100px; }`, 400, 300);
		r.root.innerHTML = `<table><thead><tr><th>A</th><th>B</th><th class="w">C</th></tr></thead><tbody><tr><td colspan="3">heading</td></tr><tr><td>aaaaaa</td><td>b</td><td>c</td></tr></tbody></table>`;
		const cells = r.root.querySelectorAll("tr:last-child td");
		const xs = cells.map((c) => box(c));
		expect(xs[0][0]).toBe(0);
		// Widths add up to the table, the fixed column at least its width
		expect(Math.round(xs.reduce((a, c) => a + c[2], 0))).toBe(300);
		expect(xs[2][2]).toBeGreaterThanOrEqual(110);
		const head = r.root.querySelector("td[colspan]")!;
		expect(box(head)[2]).toBe(300);
	});

	it("grid: 1fr 1fr columns, a span, gaps", () => {
		const r = ui(`.g { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 210px; } .g > div { height: 20px; } .span { grid-column: 1 / -1; }`, 400, 300);
		r.root.innerHTML = `<div class="g"><div></div><div></div><div class="span"></div><div></div></div>`;
		expect(r.root.querySelector(".g")!.children.map((c) => box(c))).toEqual([[0, 0, 100, 20], [110, 0, 100, 20], [0, 30, 210, 20], [0, 60, 100, 20]]);
	});

	it("overflow scrolling: scrollHeight, scrollTop kept in range, clipped paint, a scrollbar once it overflows", () => {
		const r = ui(`.s { height: 50px; overflow-y: auto; } .s > div { height: 30px; background: red; } .thin { scrollbar-width: thin; scrollbar-color: #0f0 transparent; } .none { scrollbar-width: none; }`, 400, 300);
		r.root.innerHTML = `<div class="s"><div></div><div></div><div></div></div><div class="s"><div></div></div><div class="s thin"><div></div><div></div></div><div class="s none"><div></div><div></div></div>`;
		const [s, short, thin, none] = r.root.querySelectorAll(".s");
		expect([s.scrollHeight, s.clientHeight, s.clientWidth]).toEqual([90, 50, 385]);
		expect([short.clientWidth, thin.clientWidth, none.clientWidth]).toEqual([400, 389, 400]);
		s.scrollTop = 1000;
		expect(s.scrollTop).toBe(40);
		r.update(0);
		const boxes = describePaint(r.items).filter((l) => l.startsWith("box"));
		expect(boxes.slice(0, 5)).toEqual([
			"box 0,-40 385x30 rgba(255,0,0,1) clip[0,0,400,50]",
			"box 0,-10 385x30 rgba(255,0,0,1) clip[0,0,400,50]",
			"box 0,20 385x30 rgba(255,0,0,1) clip[0,0,400,50]",
			// The track, then the thumb: as long as the view is of the content, at the end it's scrolled to
			"box 385,0 15x50 rgba(250,250,250,1)",
			"box 389,22.4 7x25.6 rgba(193,193,193,1) r3.5/3.5/3.5/3.5"
		]);
		// thin: its colours, no track
		expect(boxes.filter((l) => l.includes("rgba(0,255,0,1)"))).toHaveLength(1);
	});
});

describe("ui2: shorthands, all, and the window's computed styles", () => {
	it("a shorthand of var() expands once the variable's known; later longhands still win; all: unset forgets", () => {
		const r = ui(`:root { --bg: linear-gradient(160deg, #ff0000, transparent); --b: 2px solid #00ff00; }
			.a { background: var(--bg); border: var(--b); }
			.b { background: var(--bg); background-color: #0000ff; }
			.c { color: #ff0000; padding: 4px; } .c.u { all: unset; display: block; }`, 400, 300);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div><b class="c u">x</b>`;
		const view = r.document.defaultView!;
		const a = view.getComputedStyle(r.root.querySelector(".a")!), b = view.getComputedStyle(r.root.querySelector(".b")!), c = view.getComputedStyle(r.root.querySelector(".c")!);
		expect([a.backgroundImage, a.borderTopWidth, a.borderTopColor]).toEqual(["linear-gradient(160deg, rgb(255, 0, 0), rgba(0, 0, 0, 0))", "2px", "rgb(0, 255, 0)"]);
		expect([b.backgroundImage, b.backgroundColor]).toEqual(["linear-gradient(160deg, rgb(255, 0, 0), rgba(0, 0, 0, 0))", "rgb(0, 0, 255)"]);
		expect([c.paddingTop, c.fontWeight, c.color]).toEqual(["0px", "400", "rgb(0, 0, 0)"]);
		const shadow = ui(`.s { box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5), inset 0 0 0 1px #fff; text-shadow: 0 0 8px #5fe3ff; transform: translateY(14px) scale(0.5); width: 10px; }`);
		shadow.root.innerHTML = `<div class="s"></div>`;
		const s = shadow.document.defaultView!.getComputedStyle(shadow.root.querySelector(".s")!);
		expect([s.boxShadow, s.textShadow, s.transform]).toEqual(["rgba(0, 0, 0, 0.5) 0px 4px 14px 0px, rgb(255, 255, 255) 0px 0px 0px 1px inset", "rgb(95, 227, 255) 0px 0px 8px", "matrix(0.5, 0, 0, 0.5, 0, 14)"]);
	});
	it("a shorthand given inherit, initial or unset sets each of its longhands to it (font: inherit takes the parent's font)", () => {
		const r = ui(`.m { font: 12px monospace; letter-spacing: 2px; } button { font: 600 11px serif; } .m button.i { font: inherit; } .z { margin: 8px; } .z.u { margin: initial; }`, 400, 300);
		r.root.innerHTML = `<div class="m"><button class="i">x</button><button>y</button></div><div class="z u"></div>`;
		const view = r.document.defaultView!;
		const [i, y] = [...r.root.querySelectorAll("button")].map((b) => view.getComputedStyle(b));
		expect([i.fontFamily, i.fontSize, i.fontWeight]).toEqual(["monospace", "12px", "400"]);
		expect([y.fontFamily, y.fontSize, y.fontWeight]).toEqual(["serif", "11px", "600"]);
		expect(view.getComputedStyle(r.root.querySelector(".z")!).marginTop).toBe("0px");
	});
});

describe("ui2: laying out only what changed", () => {
	it("a change inside a positioned box lays out just that box (the same as laying out everything)", () => {
		const r = ui(`.p { position: absolute; top: 10px; right: 10px; padding: 4px; } .q { position: absolute; left: 0; bottom: 0; } .flow { height: 20px; }`, 400, 300);
		r.root.innerHTML = `<div class="flow"></div><div class="p"><span class="n">12</span></div><div class="q"><b>hi</b></div>`;
		r.update(0);
		const n = r.root.querySelector(".n")!, p = r.root.querySelector(".p")!;
		n.textContent = "123456";
		r.update(16);
		expect(r.stats.partial).toBe(1);
		const part = box(p);
		r._layoutAll = true;
		r._layoutDirty = true;
		r.update(32);
		expect(r.stats.partial).toBe(0);
		expect(box(p)).toEqual(part);
		// Outside every positioned box: all of it
		r.root.querySelector(".flow")!.classList.add("x");
		r.update(48);
		expect(r.stats.partial).toBe(0);
	});
});

describe("ui2: transforms", () => {
	it("clip-path cuts what's inside the element too (to its box): a footer that overflows a cut panel isn't drawn past it", () => {
		const r = ui(`.p { width: 100px; height: 50px; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); } .f { height: 80px; background: red; }`, 400, 300);
		r.root.innerHTML = `<div class="p"><div class="f"></div></div>`;
		r.update(0);
		expect(describePaint(r.items).find((l) => l.includes("rgba(255,0,0,1)"))).toBe("box 0,0 100x80 rgba(255,0,0,1) clip[0,0,100,50]");
	});

	it("hit tests and client rects go through transforms; clips inside one are in its own pixels", () => {
		const r = ui(`.bar { position: absolute; left: 200px; top: 0; transform: translateX(-50%); width: 100px; height: 50px; }
			.btn { width: 40px; height: 40px; overflow: hidden; } .in { width: 10px; height: 10px; background: red; }`, 400, 300);
		r.root.innerHTML = `<div class="bar"><div class="btn"><div class="in"></div></div></div>`;
		const inner = r.root.querySelector(".in")!;
		expect(box(inner)).toEqual([150, 0, 10, 10]);
		expect(r.hitTest(155, 5)).toBe(inner);
		expect(r.hitTest(205, 5)?.className).toBe("bar");
		r.update(0);
		// (The painter's clip is the button's own box before the move; the renderer takes it through the transform)
		expect(describePaint(r.items).find((l) => l.includes("rgba(255,0,0,1)"))).toBe("box 200,0 10x10 rgba(255,0,0,1) clip[200,0,240,40]");
	});
});

describe("ui2: sticky", () => {
	it("a sticky header stays at the top of its scroller's view, inside its containing block", () => {
		const r = ui(`.s { height: 50px; overflow-y: auto; scrollbar-width: none; } .h { position: sticky; top: 0; height: 10px; } .c { height: 100px; } .after { height: 200px; }`, 400, 300);
		r.root.innerHTML = `<div class="s"><div class="blk"><div class="h"></div><div class="c"></div></div><div class="after"></div></div>`;
		const s = r.root.querySelector(".s")!, h = r.root.querySelector(".h")!;
		expect(box(h)[1]).toBe(0);
		s.scrollTop = 30;
		expect(box(h)[1]).toBe(0);
		// Its block (110 high) scrolled almost past: it goes with it
		s.scrollTop = 105;
		expect(box(h)[1]).toBe(-5);
	});
});

describe("ui2: transitions", () => {
	it("interpolates colours, lengths and transforms, to and from none", async () => {
		const { interpolate } = await import("@/engine/ui2/style/IgeUiAnimator");
		expect(interpolate("transform", "none", "scale(0.96) translateY(8px)", 0.5)).toBe("scale(0.98) translateY(4px)");
		expect(interpolate("transform", "rotate(90deg)", "none", 0.5)).toBe("rotate(45deg)");
		expect(interpolate("opacity", "0", "1", 0.25)).toBe("0.25");
		expect(parseColor(interpolate("color", "#000000", "#ffffff", 0.5))).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 });
	});

	it("an animation runs once: restyled after it's done, it doesn't start again; settled, everything's at its end", () => {
		const r = ui(`@keyframes pop { from { transform: scale(0.5); } } .p { width: 100px; height: 10px; animation: pop 1s linear; } .x { color: red; }`, 400, 300);
		r.root.innerHTML = `<div class="p"></div>`;
		const p = r.root.querySelector(".p")!;
		r.update(0);
		r.update(500);
		expect(box(p)[2]).toBe(75);
		r.update(1200);
		expect(box(p)[2]).toBe(100);
		p.classList.add("x");
		r.update(1300);
		expect(box(p)[2]).toBe(100);
		// A new one, settled at once
		p.classList.remove("x");
		p.style.animation = "pop 2s linear";
		r.update(1400);
		r.settleAnimations(1400);
		r.update(1400);
		expect(box(p)[2]).toBe(100);
	});

	it("a transition runs between the old and new value", () => {
		const r = ui(`.p { width: 100px; height: 10px; transition: width 1s linear; } .p.wide { width: 200px; }`, 400, 300);
		r.root.innerHTML = `<div class="p"></div>`;
		const p = r.root.querySelector(".p")!;
		r.update(0);
		p.classList.add("wide");
		r.update(1000);
		r.update(1500);
		expect(box(p)[2]).toBe(150);
		r.update(2100);
		expect(box(p)[2]).toBe(200);
	});
});

describe("ui2: the UI's scale and safe area, events, observers", () => {
	it("lays out at the screen less the safe area over the scale; client rects in page px", () => {
		const r = ui(`.a { position: absolute; right: 0; top: 0; width: 100px; height: 10px; }`, 1920, 1080);
		r.resize(1920, 1080, 2, 67, 38);
		expect(r.viewport).toEqual({ w: (1920 - 134) / 2, h: (1080 - 76) / 2 });
		r.root.innerHTML = `<div class="a"></div>`;
		expect(box(r.root.querySelector(".a")!)).toEqual([1920 - 67 - 200, 38, 200, 20]);
	});

	it("events bubble with capture; clicks come from pointer down and up; delegation by closest()", () => {
		const r = ui(`button { width: 50px; height: 20px; }`, 400, 300);
		r.root.innerHTML = `<div class="menu"><button data-cmd="buy" data-item="iron"><b>BUY</b></button></div>`;
		const order: string[] = [];
		const menu = r.root.querySelector(".menu")!;
		menu.addEventListener("click", (e) => {
			const b = (e.target as never as { closest (s: string): { dataset: Record<string, string> } | null }).closest("[data-cmd]");
			order.push(`bubble ${b?.dataset.cmd}:${b?.dataset.item}`);
		});
		menu.addEventListener("click", () => order.push("capture"), true);
		const pt = { clientX: 10, clientY: 10, button: 0, buttons: 1, pointerType: "mouse", pointerId: 1, timeStamp: 0, stopImmediatePropagation () {}, preventDefault () {} };
		r._pointer("pointerdown", pt as never);
		r._pointer("pointerup", pt as never);
		expect(order).toEqual(["capture", "bubble buy:iron"]);
		// :hover follows the pointer
		r.addStyleSheet("button:hover { color: red; }");
		r._pointer("pointermove", pt as never);
		r.flush();
		expect(r.root.querySelector("button")!._computed!.color).toBe("red");
		const ev = new IgeUiEvent("x", { bubbles: true, detail: 3 });
		expect(ev.detail).toBe(3);
	});

	it("a list redrawn under a pointer that hasn't moved: what's under it now is hovered (as a browser does after layout)", () => {
		const r = ui(`button { display: block; width: 80px; height: 20px; } button:hover { color: red; }`, 400, 300);
		r.root.innerHTML = `<div class="list"><button class="a">A</button></div>`;
		r.update(0);
		const pt = { clientX: 10, clientY: 10, button: 0, buttons: 0, pointerType: "mouse", pointerId: 1, timeStamp: 0, stopImmediatePropagation () {}, preventDefault () {} };
		r._pointer("pointermove", pt as never);
		r.update(16);
		expect(r.root.querySelector("button.a")!._computed!.color).toBe("red");
		// Redrawn: a new button in its place, the pointer still
		r.root.querySelector(".list")!.innerHTML = `<button class="b">B</button>`;
		r.update(32);
		r.update(48);
		expect(r.root.querySelector("button.b")!._states.has("hover")).toBe(true);
		expect(r.root.querySelector("button.b")!._computed!.color).toBe("red");
	});

	it("a captured pointer keeps going to the element that captured it, off it, until it's let go", () => {
		const r = ui(`.a, .b { width: 100px; height: 50px; }`, 400, 300);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div>`;
		const a = r.root.querySelector(".a")!;
		const got: string[] = [];
		a.addEventListener("pointermove", () => got.push("move"));
		a.addEventListener("pointerup", () => got.push("up"));
		a.addEventListener("pointerdown", (e) => a.setPointerCapture((e as unknown as { pointerId: number }).pointerId));
		const at = (y: number, buttons = 1) => ({ clientX: 10, clientY: y, button: 0, buttons, pointerType: "mouse", pointerId: 7, timeStamp: 0, stopImmediatePropagation () {}, preventDefault () {} }) as never;
		r._pointer("pointerdown", at(10));
		expect(a.hasPointerCapture(7)).toBe(true);
		// Over .b now: still .a's
		a.addEventListener("mousemove", () => got.push("mousemove"));
		r._pointer("pointermove", at(70));
		r._pointer("pointerup", at(70, 0));
		// (The mouse's own move after the pointer's, as a browser sends them)
		expect(got).toEqual(["move", "mousemove", "up"]);
		expect(a.hasPointerCapture(7)).toBe(false);
		r._pointer("pointermove", at(70, 0));
		expect(got).toEqual(["move", "mousemove", "up"]);
	});

	it("a canvas with data-resolution=auto has a surface at the size it's shown (its box, kept to shape by object-fit: contain, and the UI's scale)", async () => {
		const { igeUiCanvasSurfaceScale } = await import("@/engine/ui2/dom/IgeUiCanvasSurface");
		const r = ui(`canvas { display: block; width: 200px; height: 100px; } .c { object-fit: contain; width: 300px; }`, 400, 300);
		r.root.innerHTML = `<canvas width="100" height="50" data-resolution="auto"></canvas><canvas class="c" width="100" height="50" data-resolution="auto"></canvas><canvas width="100" height="50"></canvas>`;
		const [a, c, plain] = r.root.children as unknown as Parameters<typeof igeUiCanvasSurfaceScale>[0][];
		expect(igeUiCanvasSurfaceScale(a)).toBe(2);
		// (300 x 100 holds it at 200 x 100 kept to its shape)
		expect(igeUiCanvasSurfaceScale(c)).toBe(2);
		expect(igeUiCanvasSurfaceScale(plain)).toBe(1);
	});

	it("form fields reflect their name", () => {
		const r = ui();
		r.root.innerHTML = `<input name="fName" value="x">`;
		const input = r.root.querySelector("input")! as unknown as { name: string };
		expect(input.name).toBe("fName");
		input.name = "other";
		expect(r.root.querySelector("input[name=other]")).toBeTruthy();
	});

	it("innerHTML parses and serialises; textContent; dataset; classList; inline style", () => {
		const r = ui();
		r.root.innerHTML = `<div id="a" class="x y" data-pad-id="b:1" style="width: 10px; --c: red">A &amp; B<br>&middot;</div>`;
		const a = r.document.getElementById("a")!;
		expect(a.dataset.padId).toBe("b:1");
		expect(a.textContent).toBe("A & B·");
		a.classList.toggle("y");
		expect(a.className).toBe("x");
		a.style.width = "20px";
		expect(a.style.getPropertyValue("--c")).toBe("red");
		expect(a.getAttribute("style")).toContain("width: 20px");
		expect(r.root.innerHTML).toContain(`<br>`);
	});

	it("a MutationObserver gets the changes, after them", async () => {
		const { IgeUiMutationObserver } = await import("@/engine/ui2/IgeUiRoot");
		const r = ui();
		const seen: string[] = [];
		new IgeUiMutationObserver((recs) => seen.push(...recs.map((x) => x.type))).observe(r.root, { childList: true, subtree: true, attributes: true });
		r.root.innerHTML = `<div></div>`;
		r.root.firstElementChild!.classList.add("on");
		expect(seen).toEqual([]);
		await Promise.resolve();
		expect(seen).toEqual(["childList", "attributes"]);
	});

	it("the document's window stand-in: MutationObserver records name the nodes; ResizeObserver; getComputedStyle", async () => {
		const r = ui(`.w { width: 50%; padding: 5px; margin-top: 3px; color: #ff0000; }`, 400, 300);
		const view = r.document.defaultView!;
		const added: string[] = [], removed: number[] = [];
		new view.MutationObserver(((recs: { addedNodes: { localName?: string }[]; removedNodes: unknown[] }[]) => {
			for (const x of recs) {
				added.push(...x.addedNodes.map((n) => n.localName ?? "#text"));
				removed.push(x.removedNodes.length);
			}
		}) as never).observe(r.root, { childList: true, subtree: true });
		r.root.innerHTML = `<div class="w"><b>hi</b></div>`;
		const w = r.root.querySelector(".w")!;
		w.textContent = "bye";
		await Promise.resolve();
		expect(added).toEqual(["div", "#text"]);
		expect(removed).toEqual([0, 1]);
		// Sizes: told once, then again when it changes
		const sizes: number[] = [];
		new view.ResizeObserver(((entries: { contentRect: { width: number } }[]) => sizes.push(...entries.map((e) => e.contentRect.width))) as never).observe(w);
		r.update(0);
		await Promise.resolve();
		r.resize(600, 300);
		r.update(1);
		await Promise.resolve();
		expect(sizes).toEqual([200, 300]);
		const cs = view.getComputedStyle(w);
		expect([cs.width, cs.marginTop, cs.getPropertyValue("color"), cs.display]).toEqual(["300px", "3px", "rgb(255, 0, 0)", "block"]);
	});
});
